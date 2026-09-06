// Munten, veren, checkpoints, capsules, hintbordjes en de finish.

import { TEGEL } from '../engine/tilemap.js'
import {
  muntBlad, veerBlad, checkpointBlad, finishBlad, capsuleBlad, bordBlad, powerupBlad,
  MUNT, VEER, CHECKPOINT, FINISH, CAPSULE, POWERUP, POWERUP_INDEX,
} from '../art/objecten.js'
import { UI } from '../art/palet.js'
import { sfx } from '../audio/sfx.js'

// --- Munt -------------------------------------------------------------------

export class Munt {
  constructor(x, y, index, geest) {
    this.x = x + (TEGEL - MUNT.w) / 2
    this.y = y + (TEGEL - MUNT.h) / 2
    this.startX = this.x
    this.startY = this.y
    this.index = index
    this.geest = geest      // al eerder definitief gepakt
    this.gepakt = false     // deze poging
    this.tijd = index * 0.13 // fase-offset: een rij munten golft
    this.vliegt = null      // { t, x0, y0 } tijdens de vlucht naar de HUD
  }

  update(dt, speler, magneet) {
    this.tijd += dt
    if (this.gepakt || this.geest || !magneet) return
    const dx = speler.midX - (this.x + MUNT.w / 2)
    const dy = speler.midY - (this.y + MUNT.h / 2)
    const afstand = Math.hypot(dx, dy)
    if (afstand < magneet && afstand > 1) {
      const kracht = (1 - afstand / magneet) * 340
      this.x += (dx / afstand) * kracht * dt
      this.y += (dy / afstand) * kracht * dt
    }
  }

  raakt(lichaam) {
    return !this.gepakt
      && lichaam.x < this.x + MUNT.w && lichaam.x + lichaam.w > this.x
      && lichaam.y < this.y + MUNT.h && lichaam.y + lichaam.h > this.y
  }

  teken(ctx, camX, camY, blad, geestBlad) {
    if (this.gepakt) return
    const f = Math.floor(this.tijd * 9) % 8
    const zweef = this.geest ? 0 : Math.round(Math.sin(this.tijd * 2.4) * 1.5)
    const b = this.geest ? geestBlad : blad
    if (this.geest) ctx.globalAlpha = 0.42
    b.teken(ctx, f, Math.round(this.x - camX), Math.round(this.y + zweef - camY))
    ctx.globalAlpha = 1
  }
}

// --- Veer -------------------------------------------------------------------

export class Veer {
  constructor(x, y, palet) {
    this.x = x
    this.y = y
    this.blad = veerBlad(palet)
    this.staat = 0 // 0 rust, 1 ingedrukt, 2 uitgeklapt
    this.timer = 0
  }

  get vlak() { return { x: this.x + 2, y: this.y + 6, w: 12, h: 10 } }

  update(dt) {
    if (this.timer > 0) {
      this.timer -= dt
      this.staat = this.timer > 0.09 ? 1 : 2
      if (this.timer <= 0) this.staat = 0
    }
  }

  trap() { this.timer = 0.2 }

  teken(ctx, camX, camY) {
    this.blad.teken(ctx, this.staat, Math.round(this.x - camX), Math.round(this.y - camY))
  }
}

// --- Checkpoint -------------------------------------------------------------

export class Checkpoint {
  constructor(x, y, palet) {
    this.x = x
    this.y = y - TEGEL // de paal staat op de tegel eronder
    this.aan = false
    this.tijd = 0
    this.blad = checkpointBlad(palet)
  }

  get vlak() { return { x: this.x + 2, y: this.y, w: 12, h: 32 } }

  activeer(particles) {
    if (this.aan) return false
    this.aan = true
    sfx.checkpoint()
    particles.sparkle(this.x + 8, this.y + 6, UI.goed)
    return true
  }

  update(dt) { this.tijd += dt }

  teken(ctx, camX, camY) {
    const f = (this.aan ? 4 : 0) + (Math.floor(this.tijd * 7) % 4)
    this.blad.teken(ctx, f, Math.round(this.x - camX), Math.round(this.y - camY))
  }
}

// --- Finish -----------------------------------------------------------------

export class Finish {
  constructor(x, y, palet) {
    // De sprite is breder dan één tegel; hem uitlijnen op het midden.
    this.x = x - (FINISH.w - TEGEL) / 2
    this.y = y - FINISH.h + TEGEL
    this.tijd = 0
    this.blad = finishBlad(palet)
  }

  get vlak() { return { x: this.x + 14, y: this.y + 18, w: 20, h: 22 } }

  update(dt) { this.tijd += dt }

  teken(ctx, camX, camY) {
    const f = Math.floor(this.tijd * 6) % 4
    this.blad.teken(ctx, f, Math.round(this.x - camX), Math.round(this.y - camY))
  }
}

// --- Capsule ----------------------------------------------------------------

const POWERUP_VOLGORDE = ['schild', 'magneet', 'speedboots', 'jetpack', 'leven']

export class Capsule {
  constructor(x, y, palet, soort) {
    this.x = x
    this.y = y
    this.soort = soort ?? 'schild'
    this.leeg = false
    this.tijd = 0
    this.stoot = 0
    this.blad = capsuleBlad(palet)
    this.iconen = powerupBlad(palet)
    this.uitgeworpen = null // { x, y, vy, tijd }
  }

  get vlak() { return { x: this.x, y: this.y, w: TEGEL, h: TEGEL } }

  // Van onderaf geraakt.
  sla(particles) {
    if (this.leeg) return false
    this.leeg = true
    this.stoot = 0.22
    sfx.capsule()
    this.uitgeworpen = { x: this.x + 2, y: this.y - 2, vy: -110, tijd: 0 }
    particles.sparkle(this.x + 8, this.y + 2, UI.accent)
    return true
  }

  update(dt) {
    this.tijd += dt
    if (this.stoot > 0) this.stoot -= dt
    if (this.uitgeworpen) {
      this.uitgeworpen.tijd += dt
      this.uitgeworpen.vy += 320 * dt
      this.uitgeworpen.y += this.uitgeworpen.vy * dt
      if (this.uitgeworpen.tijd > 0.5) this.uitgeworpen.vy = Math.min(this.uitgeworpen.vy, 0)
    }
  }

  // De uitgeworpen power-up mag opgepakt worden zodra hij uit het blok is.
  get itemVlak() {
    if (!this.uitgeworpen || this.uitgeworpen.tijd < 0.12) return null
    return { x: this.uitgeworpen.x, y: this.uitgeworpen.y, w: POWERUP.w, h: POWERUP.h }
  }

  pak() {
    this.uitgeworpen = null
    return this.soort
  }

  teken(ctx, camX, camY) {
    const f = this.leeg ? 4 : Math.floor(this.tijd * 6) % 4
    const dy = this.stoot > 0 ? -Math.round(this.stoot * 18) : 0
    this.blad.teken(ctx, f, Math.round(this.x - camX), Math.round(this.y + dy - camY))
    if (this.uitgeworpen) {
      const zweef = Math.round(Math.sin(this.uitgeworpen.tijd * 6) * 1.5)
      this.iconen.teken(ctx, POWERUP_INDEX[this.soort] ?? 0,
        Math.round(this.uitgeworpen.x - camX), Math.round(this.uitgeworpen.y + zweef - camY))
    }
  }

  static soortVoor(index) { return POWERUP_VOLGORDE[index % POWERUP_VOLGORDE.length] }
}

// --- Hintbordje -------------------------------------------------------------

export class Hintbord {
  constructor(x, y, tekst, palet) {
    this.x = x
    this.y = y
    this.tekst = tekst
    this.blad = bordBlad(palet)
    this.zichtbaar = 0
  }

  update(dt, speler) {
    const dichtbij = Math.abs(speler.midX - (this.x + 8)) < 46 && Math.abs(speler.midY - (this.y + 8)) < 40
    this.zichtbaar = Math.max(0, Math.min(1, this.zichtbaar + (dichtbij ? dt * 5 : -dt * 5)))
  }

  teken(ctx, camX, camY) {
    this.blad.teken(ctx, 0, Math.round(this.x - camX), Math.round(this.y - camY))
  }
}

export { MUNT, VEER, CHECKPOINT, FINISH, CAPSULE, POWERUP, POWERUP_INDEX, muntBlad, powerupBlad }
