// Vijanden van wereld 1. Elk type heeft leesbaar gedrag: je kunt aan de sprite
// en de beweging zien wat het doet voordat het je raakt.
//
// Gedeeld contract: .lichaam, .leeft, .stampbaar, update(), teken(),
// opStamp() -> true als de vijand daardoor verslagen is.

import { Lichaam, beweeg, BASIS } from '../engine/physics.js'
import { TEGEL, isVast } from '../engine/tilemap.js'
import { slijmBlad, spoorBlad, kwalBlad, keverBlad, SLIJM, SPOOR, KWAL, KEVER } from '../art/objecten.js'
import { pinguinBlad, ijskegelBlad, kanonBlad, sneeuwbalBlad, vrieskwalBlad } from '../art/objecten2.js'
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

  // Doet aanraken pijn? Bijna altijd ja; de ijsstekel is alleen gevaarlijk
  // terwijl hij valt.
  get gevaarlijk() { return this.leeft }

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

// --- Wereld 2 ---------------------------------------------------------------

// Projectiel dat door meerdere vijanden gebruikt wordt. Botst tegen muren en
// verdwijnt; raakt hij de speler, dan doet hij schade.
export class Projectiel {
  constructor(x, y, vx, vy, blad, { zwaarte = 620, stuitert = false, duur = 4 } = {}) {
    this.lichaam = new Lichaam(x, y, 6, 6)
    this.lichaam.vx = vx
    this.lichaam.vy = vy
    this.blad = blad
    this.zwaarte = zwaarte
    this.stuitert = stuitert
    this.duur = duur
    this.leeft = true
    this.tijd = 0
  }

  get midX() { return this.lichaam.midX }
  get midY() { return this.lichaam.midY }

  update(dt, map) {
    if (!this.leeft) return
    this.tijd += dt
    this.lichaam.vy = Math.min(this.lichaam.vy + this.zwaarte * dt, 420)
    const r = beweeg(this.lichaam, map, dt)
    if (r.grondGeraakt) {
      if (this.stuitert && this.tijd < 2) this.lichaam.vy = -150
      else this.leeft = false
    }
    if (r.muurGeraakt || r.plafondGeraakt) this.leeft = false
    if (this.tijd > this.duur) this.leeft = false
  }

  teken(ctx, camX, camY) {
    if (!this.leeft) return
    const f = Math.floor(this.tijd * 14) % this.blad.aantal
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 1 - camX), Math.round(this.lichaam.y - 1 - camY))
  }
}

// Pinguïnrobot: loopt heen en weer, blijft af en toe staan om te schieten.
export class Pinguin extends Vijand {
  constructor(x, y, palet) {
    super(x, y + 4, 14, 16)
    this.blad = pinguinBlad(palet)
    this.balBlad = sneeuwbalBlad()
    this.palet = palet
    this.lichaam.vx = -30
    this.schietTimer = 1.6 + Math.random()
    this.schiet = 0
    this.projectielen = []
  }

  update(dt, map, speler) {
    for (const b of this.projectielen) b.update(dt, map)
    this.projectielen = this.projectielen.filter((b) => b.leeft)
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt

    if (this.schiet > 0) {
      this.schiet -= dt
      this.lichaam.vx = 0
      if (this.schiet <= 0) this._vuur(speler)
    } else {
      this.schietTimer -= dt
      const richting = this.kijktRechts ? 1 : -1
      this.lichaam.vx = richting * 30
      // Alleen schieten als de speler ongeveer op dezelfde hoogte staat; anders
      // vuurt hij in het wilde weg en voelt het willekeurig.
      const opHoogte = speler && Math.abs(speler.midY - this.midY) < 40
      if (this.schietTimer <= 0 && opHoogte) { this.schiet = 0.45; this.schietTimer = 2.4 }
    }

    this.lichaam.vy = Math.min(this.lichaam.vy + BASIS.zwaartekrachtNeer * dt, BASIS.maxVal)
    beweeg(this.lichaam, map, dt)
    if (this.lichaam.opGrond && this.schiet <= 0 && this._keerOmBijRand(map)) {
      this.kijktRechts = !this.kijktRechts
      this.lichaam.vx *= -1
    }
    if (this.lichaam.vx !== 0) this.kijktRechts = this.lichaam.vx > 0
  }

  _vuur(speler) {
    const richting = speler && speler.midX < this.midX ? -1 : 1
    this.kijktRechts = richting > 0
    this.projectielen.push(new Projectiel(
      this.midX - 3, this.midY, richting * 150, -40, this.balBlad, { zwaarte: 380 },
    ))
    sfx.laser()
  }

  opStamp(particles) {
    this.verslagen(particles, '#8fb4d8')
    return true
  }

  herstel() {
    super.herstel()
    this.projectielen.length = 0
    this.schiet = 0
    this.schietTimer = 1.6
  }

  teken(ctx, camX, camY) {
    for (const b of this.projectielen) b.teken(ctx, camX, camY)
    if (!this.leeft) return
    const f = this.schiet > 0 ? (this.schiet > 0.2 ? 4 : 5) : Math.floor(this.tijd * 7) % 4
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 1 - camX), Math.round(this.lichaam.y - 4 - camY), this.kijktRechts)
  }
}

// IJsstekel: hangt aan het plafond en valt zodra je eronder komt. Trilt eerst,
// zodat het geen valstrik is maar een waarschuwing.
export class IJsstekel extends Vijand {
  constructor(x, y) {
    super(x + 3, y, 8, 16)
    this.blad = ijskegelBlad()
    this.stampbaar = false
    this.staat = 'hangt' // hangt | trilt | valt | kapot
    this.timer = 0
  }

  update(dt, map, speler) {
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt

    if (this.staat === 'hangt') {
      const onder = speler
        && Math.abs(speler.midX - this.midX) < 22
        && speler.midY > this.midY
        && speler.midY - this.midY < 180
      if (onder) { this.staat = 'trilt'; this.timer = 0.45 }
    } else if (this.staat === 'trilt') {
      this.timer -= dt
      if (this.timer <= 0) { this.staat = 'valt'; this.lichaam.vy = 0 }
    } else if (this.staat === 'valt') {
      this.lichaam.vy = Math.min(this.lichaam.vy + 900 * dt, 460)
      const r = beweeg(this.lichaam, map, dt)
      if (r.grondGeraakt) { this.staat = 'kapot'; this.timer = 0.35 }
    } else {
      this.timer -= dt
      if (this.timer <= 0) this.leeft = false
    }
  }

  // Alleen gevaarlijk terwijl hij valt.
  get gevaarlijk() { return this.staat === 'valt' }

  opStamp() { return false }

  herstel() {
    super.herstel()
    this.staat = 'hangt'
    this.timer = 0
  }

  teken(ctx, camX, camY) {
    if (!this.leeft) return
    const f = this.staat === 'hangt' ? 0
      : this.staat === 'trilt' ? (Math.floor(this.tijd * 24) % 2 ? 1 : 2)
        : this.staat === 'valt' ? 3
          : this.timer > 0.18 ? 4 : 5
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 1 - camX), Math.round(this.lichaam.y - camY))
  }
}

// Sneeuwbalkanon: staat vast, laadt zichtbaar op en schiet een boog.
export class Kanon extends Vijand {
  constructor(x, y, palet, opties = {}) {
    super(x - 2, y + 2, 18, 14)
    this.blad = kanonBlad(palet)
    this.balBlad = sneeuwbalBlad()
    this.stampbaar = false
    this.periode = opties.periode ?? 2.6
    this.timer = this.periode
    this.richting = opties.naarLinks ? -1 : 1
    this.projectielen = []
  }

  update(dt, map) {
    for (const b of this.projectielen) b.update(dt, map)
    this.projectielen = this.projectielen.filter((b) => b.leeft)
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt
    this.timer -= dt
    if (this.timer <= 0) {
      this.timer = this.periode
      this.projectielen.push(new Projectiel(
        this.midX, this.lichaam.y - 2, this.richting * 130, -210, this.balBlad,
        { zwaarte: 620, stuitert: true },
      ))
      sfx.laser()
    }
  }

  opStamp() { return false }

  herstel() {
    super.herstel()
    this.projectielen.length = 0
    this.timer = this.periode
  }

  teken(ctx, camX, camY) {
    for (const b of this.projectielen) b.teken(ctx, camX, camY)
    if (!this.leeft) return
    const deel = 1 - this.timer / this.periode
    const f = this.timer < 0.12 ? 3 : deel > 0.75 ? 2 : deel > 0.4 ? 1 : 0
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 1 - camX), Math.round(this.lichaam.y - 2 - camY), this.richting > 0)
  }
}

// Vrieskwal: zweeft als de ruimtekwal, maar met een bredere baan en ijspunten.
export class Vrieskwal extends Vijand {
  constructor(x, y, palet, opties = {}) {
    super(x, y + 2, 16, 12)
    this.blad = vrieskwalBlad(palet)
    this.stampbaar = false
    this.amplitude = opties.amplitude ?? 40
    this.snelheid = opties.snelheid ?? 1.1
    this.zweefX = opties.zweefX ?? 30
  }

  update(dt) {
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt
    this.lichaam.y = this.startY + Math.sin(this.tijd * this.snelheid) * this.amplitude
    this.lichaam.x = this.startX + Math.cos(this.tijd * this.snelheid * 0.55) * this.zweefX
  }

  opStamp() { return false }

  teken(ctx, camX, camY) {
    if (!this.leeft) return
    const f = Math.floor(this.tijd * 6) % 4
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 1 - camX), Math.round(this.lichaam.y - 4 - camY))
  }
}

export const VIJAND_KLASSEN = {
  slijm: Slijm,
  spoor: Spoor,
  kwal: Kwal,
  kever: Kever,
  pinguin: Pinguin,
  ijsstekel: IJsstekel,
  kanon: Kanon,
  vrieskwal: Vrieskwal,
}

export function maakVijand(soort, x, y, palet, opties) {
  const Klasse = VIJAND_KLASSEN[soort]
  if (!Klasse) throw new Error(`Onbekende vijand: ${soort}`)
  return new Klasse(x, y, palet, opties)
}

export const AFMETINGEN = { SLIJM, SPOOR, KWAL, KEVER }
