// Gevaren die geen vijand zijn: geisers en de stijgende lava.

import { TEGEL } from '../engine/tilemap.js'
import { geiserBlad, tekenGeiserStraal, GEISERMOND } from '../art/objecten3.js'
import { sfx } from '../audio/sfx.js'

// Geiser: schiet op een vaste cadans een straal omhoog. Wie erin staat wordt
// gelanceerd, niet geraakt — het is een lift, geen val.
export class Geiser {
  constructor(x, y, palet, { periode = 3.2, duur = 1.1, hoogte = 7, fase = 0 } = {}) {
    this.x = x
    this.y = y
    this.blad = geiserBlad(palet)
    this.periode = periode
    this.duur = duur
    this.maxHoogte = hoogte * TEGEL
    this.timer = fase * periode
    this.tijd = 0
    this.actief = false
    this.hoogte = 0
    this._klonk = false
  }

  get midX() { return this.x + GEISERMOND.w / 2 }

  update(dt) {
    this.tijd += dt
    this.timer += dt
    if (this.timer >= this.periode) this.timer -= this.periode
    this.actief = this.timer < this.duur
    if (this.actief) {
      // Snel omhoog, langzaam uitdoven: de straal is er meteen als hij komt.
      const t = this.timer / this.duur
      const vorm = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8
      this.hoogte = this.maxHoogte * Math.max(0, vorm)
      if (!this._klonk) { this._klonk = true; sfx.veer() }
    } else {
      this.hoogte = 0
      this._klonk = false
    }
  }

  // Staat de speler in de straal?
  raakt(lichaam) {
    if (!this.actief || this.hoogte < 8) return false
    const links = this.x + 2
    const rechts = this.x + GEISERMOND.w - 2
    return lichaam.rechts > links && lichaam.links < rechts
      && lichaam.onder > this.y - this.hoogte && lichaam.boven < this.y + GEISERMOND.h
  }

  herstel() { this.timer = 0; this.hoogte = 0; this.actief = false }

  teken(ctx, camX, camY) {
    tekenGeiserStraal(ctx, this.midX - camX, this.y - camY, this.hoogte, this.tijd)
    const f = this.actief ? 2 : this.timer > this.periode - 0.6 ? 1 : 0
    this.blad.teken(ctx, f, Math.round(this.x - camX), Math.round(this.y - camY))
  }
}

// Stijgende lava: één horizontaal vlak dat langzaam omhoog komt. Raak je het,
// dan ga je dood — er is geen schild tegen.
export class StijgendeLava {
  constructor({ start, snelheid = 7, wacht = 3, stop = 0 }) {
    this.startY = start * TEGEL
    this.snelheid = snelheid
    this.wacht = wacht
    this.stopY = stop * TEGEL
    this.y = this.startY
    this.tijd = 0
  }

  update(dt) {
    this.tijd += dt
    if (this.tijd < this.wacht) return
    this.y = Math.max(this.stopY, this.y - this.snelheid * dt)
  }

  raakt(lichaam) { return lichaam.onder > this.y + 3 }

  herstel() {
    this.y = this.startY
    this.tijd = 0
  }
}
