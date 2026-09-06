// Bewegende en vallende platforms. Ze zijn geen tegels maar entiteiten, dus de
// speler-collision loopt hier apart: eerst het platform verplaatsen, dan de
// speler die erop staat meenemen.

import { platformBlad, PLATFORM } from '../art/objecten.js'
import { sfx } from '../audio/sfx.js'

export class BewegendPlatform {
  constructor(x, y, palet, { richting = 'h', afstand = 3, snelheid = 34, breedte = 48, fase = 0 } = {}) {
    this.x = x
    this.y = y
    this.startX = x
    this.startY = y
    this.w = breedte
    this.h = 10
    this.richting = richting
    this.afstand = afstand * 16
    this.snelheid = snelheid
    this.fase = fase
    this.tijd = fase
    this.dx = 0
    this.dy = 0
    this.blad = platformBlad(palet)
  }

  update(dt) {
    this.tijd += dt
    const vorigeX = this.x
    const vorigeY = this.y
    // Sinus in plaats van heen-en-weer met harde omkeer: het platform remt af
    // aan de uiteinden, waardoor je er niet af geslingerd wordt.
    const s = Math.sin((this.tijd * this.snelheid) / this.afstand)
    if (this.richting === 'h') this.x = this.startX + s * this.afstand
    else this.y = this.startY + s * this.afstand
    this.dx = this.x - vorigeX
    this.dy = this.y - vorigeY
  }

  get bovenkant() { return this.y }

  // Staat het lichaam er bovenop? Iets ruimer dan exact, anders val je er bij
  // een dalend platform doorheen.
  draagt(lichaam) {
    return lichaam.vy >= 0
      && lichaam.rechts > this.x + 2 && lichaam.links < this.x + this.w - 2
      && lichaam.onder >= this.y - 2 && lichaam.onder <= this.y + 8
  }

  herstel() {
    this.tijd = this.fase
    this.x = this.startX
    this.y = this.startY
  }

  teken(ctx, camX, camY) {
    const x = Math.round(this.x - camX)
    const y = Math.round(this.y - camY)
    // Bredere platforms: het blad twee keer tekenen en overlappen.
    let getekend = 0
    while (getekend < this.w) {
      const stuk = Math.min(PLATFORM.w, this.w - getekend)
      ctx.drawImage(this.blad.canvas, 0, 0, stuk, PLATFORM.h, x + getekend, y, stuk, PLATFORM.h)
      getekend += stuk
    }
  }
}

// Valt zodra je erop staat, komt na een paar seconden terug.
export class ValPlatform extends BewegendPlatform {
  constructor(x, y, palet, opties = {}) {
    super(x, y, palet, { ...opties, afstand: 0, snelheid: 0 })
    this.staat = 'rust' // rust | trilt | valt | weg
    this.timer = 0
    this.vy = 0
  }

  update(dt) {
    this.dx = 0
    const vorigeY = this.y
    if (this.staat === 'trilt') {
      this.timer -= dt
      // Zichtbaar trillen is de waarschuwing; zonder dat is het een val.
      this.y = this.startY + Math.round(Math.sin(this.timer * 45) * 1.5)
      if (this.timer <= 0) { this.staat = 'valt'; this.vy = 0; sfx.blokKapot() }
    } else if (this.staat === 'valt') {
      this.vy += 900 * dt
      this.y += this.vy * dt
      if (this.y > this.startY + 260) { this.staat = 'weg'; this.timer = 1.6 }
    } else if (this.staat === 'weg') {
      this.timer -= dt
      if (this.timer <= 0) { this.staat = 'rust'; this.y = this.startY; this.vy = 0 }
    } else {
      this.y = this.startY
    }
    this.dy = this.y - vorigeY
  }

  draagt(lichaam) {
    if (this.staat === 'valt' || this.staat === 'weg') return false
    return super.draagt(lichaam)
  }

  betreden() {
    if (this.staat === 'rust') { this.staat = 'trilt'; this.timer = 0.55 }
  }

  herstel() {
    this.staat = 'rust'
    this.y = this.startY
    this.vy = 0
    this.timer = 0
  }

  teken(ctx, camX, camY) {
    if (this.staat === 'weg') return
    ctx.globalAlpha = this.staat === 'trilt' ? 0.85 : 1
    super.teken(ctx, camX, camY)
    ctx.globalAlpha = 1
  }
}
