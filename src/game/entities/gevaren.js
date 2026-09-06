// Gevaren die geen vijand zijn: geisers en de stijgende lava.

import { TEGEL, isVast } from '../engine/tilemap.js'
import { geiserBlad, tekenGeiserStraal, GEISERMOND } from '../art/objecten3.js'
import { zenderBlad, tekenLaserStraal, sleutelBlad, ZENDER, SLEUTEL } from '../art/objecten4.js'
import { portaalBlad, schakelaarBlad, PORTAAL, SCHAKELAAR } from '../art/objecten5.js'
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

// Laser: staat op een vast ritme aan en uit, met een korte oplaadfase zodat je
// hem kunt zien komen. De straal loopt door tot de eerste vaste tegel.
export class Laser {
  constructor(x, y, palet, { richting = 'v', periode = 2.6, duur = 1.1, fase = 0 } = {}) {
    this.x = x
    this.y = y
    this.richting = richting
    this.blad = zenderBlad(palet)
    this.periode = periode
    this.duur = duur
    this.timer = fase * periode
    this.tijd = 0
    this.aan = false
    this.lengte = 0
    this._klonk = false
  }

  get midX() { return this.x + ZENDER.w / 2 }

  // De straal stopt bij de eerste vaste tegel; zo hoeven levels geen lengte op
  // te geven en klopt hij ook als de kaart later verandert.
  _meet(map) {
    const stap = TEGEL
    let lengte = 0
    if (this.richting === 'v') {
      let ty = Math.floor((this.y + ZENDER.h) / TEGEL)
      const tx = Math.floor(this.midX / TEGEL)
      while (ty < map.h && !isVast(map.tegel(tx, ty))) { lengte += stap; ty++ }
    } else {
      let tx = Math.floor((this.x + ZENDER.w) / TEGEL)
      const ty = Math.floor((this.y + ZENDER.h / 2) / TEGEL)
      while (tx < map.w && !isVast(map.tegel(tx, ty))) { lengte += stap; tx++ }
    }
    return lengte
  }

  update(dt, map) {
    this.tijd += dt
    this.timer += dt
    if (this.timer >= this.periode) this.timer -= this.periode
    this.aan = this.timer < this.duur
    this.lengte = this.aan ? this._meet(map) : 0
    if (this.aan && !this._klonk) { this._klonk = true; sfx.laser() }
    if (!this.aan) this._klonk = false
  }

  raakt(lichaam) {
    if (!this.aan || this.lengte <= 0) return false
    if (this.richting === 'v') {
      const x0 = this.midX - 3
      return lichaam.rechts > x0 && lichaam.links < x0 + 6
        && lichaam.onder > this.y + ZENDER.h && lichaam.boven < this.y + ZENDER.h + this.lengte
    }
    const y0 = this.y + ZENDER.h / 2 - 3
    return lichaam.onder > y0 && lichaam.boven < y0 + 6
      && lichaam.rechts > this.x + ZENDER.w && lichaam.links < this.x + ZENDER.w + this.lengte
  }

  herstel() { this.timer = 0; this.aan = false; this.lengte = 0; this._klonk = false }

  teken(ctx, camX, camY) {
    if (this.aan) {
      if (this.richting === 'v') {
        tekenLaserStraal(ctx, this.midX - camX, this.y + ZENDER.h - camY, this.lengte, 'v', this.tijd)
      } else {
        tekenLaserStraal(ctx, this.x + ZENDER.w - camX, this.y + ZENDER.h / 2 - camY, this.lengte, 'h', this.tijd)
      }
    }
    const bijna = !this.aan && this.timer > this.periode - 0.5
    this.blad.teken(ctx, this.aan ? 2 : bijna ? 1 : 0, Math.round(this.x - camX), Math.round(this.y - camY))
  }
}

// Sleutelkaart: pak ze allemaal en de deuren in het level gaan open.
export class Sleutel {
  constructor(x, y) {
    this.x = x + 2
    this.y = y + 3
    this.gepakt = false
    this.tijd = 0
    this.blad = sleutelBlad()
  }

  get vlak() { return { x: this.x, y: this.y, w: SLEUTEL.w, h: SLEUTEL.h } }

  update(dt) { this.tijd += dt }

  herstel() { this.gepakt = false }

  teken(ctx, camX, camY) {
    if (this.gepakt) return
    const zweef = Math.round(Math.sin(this.tijd * 2.6) * 2)
    this.blad.teken(ctx, Math.floor(this.tijd * 7) % 4, Math.round(this.x - camX), Math.round(this.y + zweef - camY))
  }
}

// Portaal. Twee portalen op volgorde vormen een paar en krijgen dezelfde
// kleur, zodat je vóór het instappen ziet waar je uitkomt.
export class Portaal {
  constructor(x, y, paar) {
    this.x = x
    this.y = y - TEGEL // het portaal is twee tegels hoog
    this.paar = paar
    this.blad = portaalBlad(paar)
    this.tijd = 0
    this.partner = null
    this.koeling = 0
  }

  get midX() { return this.x + PORTAAL.w / 2 }
  get midY() { return this.y + PORTAAL.h / 2 }
  get vlak() { return { x: this.x + 3, y: this.y + 4, w: PORTAAL.w - 6, h: PORTAAL.h - 8 } }

  update(dt) {
    this.tijd += dt
    if (this.koeling > 0) this.koeling -= dt
  }

  herstel() { this.koeling = 0 }

  teken(ctx, camX, camY) {
    const f = Math.floor(this.tijd * 10) % 4
    this.blad.teken(ctx, f, Math.round(this.x - camX), Math.round(this.y - camY))
  }
}

// Schakelaar die de zwaartekracht omdraait. Raak hem aan en je valt de andere
// kant op; hij heeft een korte koeling zodat je er niet in blijft flikkeren.
export class Zwaartekrachtplaat {
  constructor(x, y, palet) {
    this.x = x
    this.y = y
    this.blad = schakelaarBlad(palet)
    this.tijd = 0
    this.koeling = 0
  }

  get vlak() { return { x: this.x, y: this.y, w: SCHAKELAAR.w, h: SCHAKELAAR.h } }

  update(dt) {
    this.tijd += dt
    if (this.koeling > 0) this.koeling -= dt
  }

  herstel() { this.koeling = 0 }

  teken(ctx, camX, camY) {
    const f = Math.floor(this.tijd * 4) % 4
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
