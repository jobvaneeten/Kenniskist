// Vijanden van wereld 1. Elk type heeft leesbaar gedrag: je kunt aan de sprite
// en de beweging zien wat het doet voordat het je raakt.
//
// Gedeeld contract: .lichaam, .leeft, .stampbaar, update(), teken(),
// opStamp() -> true als de vijand daardoor verslagen is.

import { Lichaam, beweeg, BASIS } from '../engine/physics.js'
import { TEGEL, isVast } from '../engine/tilemap.js'
import { slijmBlad, spoorBlad, kwalBlad, keverBlad, SLIJM, SPOOR, KWAL, KEVER } from '../art/objecten.js'
import { sfx } from '../audio/sfx.js'

class Vijand {
  constructor(x, y, w, h) {
    this.lichaam = new Lichaam(x, y, w, h)
    this.leeft = true
    this.stampbaar = true
    this.tijd = 0
    this.kijktRechts = false
    this.sterfTijd = 0
    this.startX = x
    this.startY = y
  }

  get midX() { return this.lichaam.midX }
  get midY() { return this.lichaam.midY }

  herstel() {
    this.leeft = true
    this.sterfTijd = 0
    this.lichaam.x = this.startX
    this.lichaam.y = this.startY
    this.lichaam.vx = 0
    this.lichaam.vy = 0
    this.tijd = 0
  }

  verslagen(particles, kleur) {
    this.leeft = false
    this.sterfTijd = 0
    particles.pop(this.midX, this.midY, kleur, 14)
    sfx.vijandDood()
  }

  // Loopt de vijand tegen een muur of een rand? Voorkomt dat lopers van hun
  // platform af wandelen.
  _keerOmBijRand(map) {
    const l = this.lichaam
    if (l.tegenMuur) return true
    const voorX = l.vx > 0 ? l.rechts + 2 : l.links - 2
    const tx = Math.floor(voorX / TEGEL)
    const ty = Math.floor((l.onder + 2) / TEGEL)
    return !isVast(map.tegel(tx, ty)) && !map.platformOp(tx, ty)
  }
}

// --- Slijmwezen: loopt heen en weer, keert om bij randen ---------------------

export class Slijm extends Vijand {
  constructor(x, y, palet) {
    super(x + 0, y + 4, 14, 12)
    this.blad = slijmBlad(palet)
    this.palet = palet
    this.lichaam.vx = -26
  }

  update(dt, map) {
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt
    this.lichaam.vy = Math.min(this.lichaam.vy + BASIS.zwaartekrachtNeer * dt, BASIS.maxVal)
    beweeg(this.lichaam, map, dt)
    if (this.lichaam.opGrond && this._keerOmBijRand(map)) this.lichaam.vx *= -1
    this.kijktRechts = this.lichaam.vx > 0
  }

  opStamp(particles) {
    this.verslagen(particles, this.palet.deco[1])
    return true
  }

  teken(ctx, camX, camY) {
    if (!this.leeft) return
    const f = Math.floor(this.tijd * 7) % 4
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 1 - camX), Math.round(this.lichaam.y - 4 - camY), this.kijktRechts)
  }
}

// --- Springspoor: staat stil en springt op een vaste cadans ------------------

export class Spoor extends Vijand {
  constructor(x, y, palet) {
    super(x + 2, y + 2, 12, 14)
    this.blad = spoorBlad(palet)
    this.palet = palet
    this.wachten = 0.8
  }

  update(dt, map) {
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt
    this.lichaam.vy = Math.min(this.lichaam.vy + BASIS.zwaartekrachtNeer * dt, BASIS.maxVal)
    beweeg(this.lichaam, map, dt)
    if (this.lichaam.opGrond) {
      this.wachten -= dt
      if (this.wachten <= 0) {
        this.lichaam.vy = -270
        this.wachten = 1.15
        this.tijd = 0
      }
    }
  }

  opStamp(particles) {
    this.verslagen(particles, this.palet.deco[2])
    return true
  }

  teken(ctx, camX, camY) {
    if (!this.leeft) return
    // De sprite laat zien wat er gaat gebeuren: ingezakt = zo meteen springen.
    const f = this.lichaam.opGrond
      ? (this.wachten < 0.25 ? 1 : 0)
      : (this.lichaam.vy < 0 ? 2 : 3)
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 2 - camX), Math.round(this.lichaam.y - 2 - camY))
  }
}

// --- Ruimtekwal: zweeft op een sinusbaan, niet te stampen --------------------

export class Kwal extends Vijand {
  constructor(x, y, palet, opties = {}) {
    super(x + 1, y + 2, 14, 12)
    this.blad = kwalBlad(palet)
    this.palet = palet
    this.stampbaar = false
    this.amplitude = opties.amplitude ?? 26
    this.snelheid = opties.snelheid ?? 1.4
    this.zweefX = opties.zweefX ?? 0
  }

  update(dt) {
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt
    this.lichaam.y = this.startY + Math.sin(this.tijd * this.snelheid) * this.amplitude
    if (this.zweefX) {
      this.lichaam.x = this.startX + Math.cos(this.tijd * this.snelheid * 0.6) * this.zweefX
    }
  }

  opStamp() { return false }

  teken(ctx, camX, camY) {
    if (!this.leeft) return
    const f = Math.floor(this.tijd * 6) % 4
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 1 - camX), Math.round(this.lichaam.y - 3 - camY))
  }
}

// --- Kristalkever: schild, dus twee keer stampen -----------------------------

export class Kever extends Vijand {
  constructor(x, y, palet) {
    super(x - 2, y + 2, 18, 12)
    this.blad = keverBlad(palet)
    this.palet = palet
    this.schild = true
    this.lichaam.vx = -20
    this.boos = 0
  }

  update(dt, map, speler) {
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt
    if (this.boos > 0) this.boos -= dt

    // Zonder schild rent hij weg; dat maakt de tweede stamp een aparte
    // uitdaging in plaats van een herhaling van de eerste.
    const doel = this.schild ? 20 : 62
    const richting = Math.sign(this.lichaam.vx) || -1
    this.lichaam.vx = richting * doel

    if (!this.schild && speler && Math.abs(speler.midX - this.midX) < 90) {
      this.lichaam.vx = Math.sign(this.midX - speler.midX) * doel
    }

    this.lichaam.vy = Math.min(this.lichaam.vy + BASIS.zwaartekrachtNeer * dt, BASIS.maxVal)
    beweeg(this.lichaam, map, dt)
    if (this.lichaam.opGrond && this._keerOmBijRand(map)) this.lichaam.vx *= -1
    this.kijktRechts = this.lichaam.vx > 0
  }

  opStamp(particles) {
    if (this.schild) {
      this.schild = false
      this.boos = 0.4
      particles.pop(this.midX, this.midY - 4, this.palet.deco[0], 10)
      sfx.stamp()
      return false
    }
    this.verslagen(particles, this.palet.deco[2])
    return true
  }

  teken(ctx, camX, camY) {
    if (!this.leeft) return
    const f = (this.schild ? 0 : 4) + (Math.floor(this.tijd * 8) % 4)
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 1 - camX), Math.round(this.lichaam.y - 3 - camY), this.kijktRechts)
  }
}

export const VIJAND_KLASSEN = {
  slijm: Slijm,
  spoor: Spoor,
  kwal: Kwal,
  kever: Kever,
}

export function maakVijand(soort, x, y, palet, opties) {
  const Klasse = VIJAND_KLASSEN[soort]
  if (!Klasse) throw new Error(`Onbekende vijand: ${soort}`)
  return new Klasse(x, y, palet, opties)
}

export const AFMETINGEN = { SLIJM, SPOOR, KWAL, KEVER }
