// Vijanden van wereld 1. Elk type heeft leesbaar gedrag: je kunt aan de sprite
// en de beweging zien wat het doet voordat het je raakt.
//
// Gedeeld contract: .lichaam, .leeft, .stampbaar, update(), teken(),
// opStamp() -> true als de vijand daardoor verslagen is.

import { Lichaam, beweeg, BASIS } from '../engine/physics.js'
import { TEGEL, isVast } from '../engine/tilemap.js'
import { slijmBlad, spoorBlad, kwalBlad, keverBlad, SLIJM, SPOOR, KWAL, KEVER } from '../art/objecten.js'
import { pinguinBlad, ijskegelBlad, kanonBlad, sneeuwbalBlad, vrieskwalBlad } from '../art/objecten2.js'
import { spetterBlad, vleermuisBlad, krabBlad, asvliegBlad } from '../art/objecten3.js'
import { droneBlad, torretBlad, kortsluiterBlad, patrouilleBlad } from '../art/objecten4.js'
import { kloonBlad, zwermBlad, zwaartewezenBlad, echoslijmBlad, tekenEchoRing } from '../art/objecten5.js'
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

// --- Wereld 3 ---------------------------------------------------------------

// Lavaspetter: springt op een vaste cadans uit de diepte omhoog en valt terug.
// Hij komt altijd uit dezelfde plek, dus het is een timing-probleem.
export class Spetter extends Vijand {
  constructor(x, y, palet, opties = {}) {
    super(x + 2, y, 8, 12)
    this.blad = spetterBlad()
    this.stampbaar = false
    this.hoogte = (opties.hoogte ?? 5) * TEGEL
    this.periode = opties.periode ?? 2.4
    this.timer = (opties.fase ?? 0) * this.periode
    this.bodemY = y + TEGEL
    this.actief = false
  }

  update(dt) {
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt
    this.timer += dt
    if (this.timer >= this.periode) {
      this.timer -= this.periode
      this.actief = true
      // v = sqrt(2 g h): precies hoog genoeg voor de ingestelde hoogte.
      this.lichaam.vy = -Math.sqrt(2 * 900 * this.hoogte)
      this.lichaam.y = this.bodemY
      sfx.veer()
    }
    if (!this.actief) return
    this.lichaam.vy += 900 * dt
    this.lichaam.y += this.lichaam.vy * dt
    if (this.lichaam.y >= this.bodemY) { this.actief = false; this.lichaam.y = this.bodemY + 40 }
  }

  get gevaarlijk() { return this.leeft && this.actief }

  opStamp() { return false }

  herstel() {
    super.herstel()
    this.actief = false
    this.timer = 0
    this.lichaam.y = this.bodemY + 40
  }

  teken(ctx, camX, camY) {
    if (!this.leeft || !this.actief) return
    const f = this.lichaam.vy < 0 ? (Math.floor(this.tijd * 12) % 2) : 2 + (Math.floor(this.tijd * 12) % 2)
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 2 - camX), Math.round(this.lichaam.y - camY))
  }
}

// Vuurvleermuis: hangt aan het plafond tot je eronder komt, duikt dan schuin
// naar beneden en klimt daarna weer.
export class Vleermuis extends Vijand {
  constructor(x, y) {
    super(x + 2, y + 2, 12, 10)
    this.blad = vleermuisBlad()
    this.staat = 'hangt'
    this.timer = 0
  }

  update(dt, map, speler) {
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt

    if (this.staat === 'hangt') {
      const dichtbij = speler
        && Math.abs(speler.midX - this.midX) < 62
        && speler.midY > this.midY - 20
      if (dichtbij) {
        this.staat = 'duikt'
        this.lichaam.vx = Math.sign(speler.midX - this.midX) * 78
        this.lichaam.vy = 130
        this.timer = 1.1
      }
    } else {
      this.timer -= dt
      // Eerst omlaag, dan weer omhoog: een boog waar je onderdoor kunt.
      this.lichaam.vy += (this.timer > 0.55 ? 210 : -260) * dt
      this.lichaam.vy = Math.max(-150, Math.min(210, this.lichaam.vy))
      const r = beweeg(this.lichaam, map, dt)
      if (r.muurGeraakt) this.lichaam.vx *= -1
      if (this.timer <= 0) {
        this.staat = 'hangt'
        this.lichaam.y = this.startY
        this.lichaam.vx = 0
        this.lichaam.vy = 0
      }
    }
    if (this.lichaam.vx !== 0) this.kijktRechts = this.lichaam.vx > 0
  }

  opStamp(particles) {
    this.verslagen(particles, '#e5561f')
    return true
  }

  herstel() {
    super.herstel()
    this.staat = 'hangt'
    this.timer = 0
  }

  teken(ctx, camX, camY) {
    if (!this.leeft) return
    const f = this.staat === 'hangt' ? 0 : 1 + (Math.floor(this.tijd * 14) % 4)
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 3 - camX), Math.round(this.lichaam.y - 2 - camY), this.kijktRechts)
  }
}

// Magmakrab: pantser aan de bovenkant, dus stampen werkt niet. Loopt snel en
// keert om bij randen.
export class Krab extends Vijand {
  constructor(x, y) {
    super(x - 3, y + 2, 20, 12)
    this.blad = krabBlad()
    this.stampbaar = false
    this.lichaam.vx = -54
  }

  update(dt, map) {
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt
    this.lichaam.vy = Math.min(this.lichaam.vy + BASIS.zwaartekrachtNeer * dt, BASIS.maxVal)
    beweeg(this.lichaam, map, dt)
    if (this.lichaam.opGrond && this._keerOmBijRand(map)) this.lichaam.vx *= -1
    this.kijktRechts = this.lichaam.vx > 0
  }

  opStamp() { return false }

  teken(ctx, camX, camY) {
    if (!this.leeft) return
    const f = Math.floor(this.tijd * 8) % 4
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 1 - camX), Math.round(this.lichaam.y - 2 - camY), this.kijktRechts)
  }
}

// Asvlieg: zweeft traag naar de speler toe. Losse exemplaren zijn te ontwijken;
// met een paar tegelijk moet je je route kiezen.
export class Asvlieg extends Vijand {
  constructor(x, y) {
    super(x + 2, y + 2, 8, 8)
    this.blad = asvliegBlad()
    this.stampbaar = false
    this.fase = Math.random() * Math.PI * 2
  }

  update(dt, map, speler) {
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt
    if (!speler) return
    const dx = speler.midX - this.midX
    const dy = speler.midY - this.midY
    const afstand = Math.hypot(dx, dy) || 1
    // Traag genoeg om weg te lopen, maar hij geeft nooit op.
    const snelheid = 26
    this.lichaam.x += (dx / afstand) * snelheid * dt
    this.lichaam.y += (dy / afstand) * snelheid * dt + Math.sin(this.tijd * 3 + this.fase) * 14 * dt
  }

  opStamp(particles) {
    this.verslagen(particles, '#6b4038')
    return true
  }

  teken(ctx, camX, camY) {
    if (!this.leeft) return
    const f = Math.floor(this.tijd * 16) % 4
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 2 - camX), Math.round(this.lichaam.y - 2 - camY))
  }
}

// --- Wereld 4 ---------------------------------------------------------------

// Bewakingsdrone: zweeft heen en weer over een vast pad. Ziet hij je, dan
// verkleurt zijn oog en duikt hij op je af — en dat kun je een halve seconde
// van tevoren zien.
export class Drone extends Vijand {
  constructor(x, y, palet, opties = {}) {
    super(x + 1, y + 2, 16, 10)
    this.blad = droneBlad()
    this.baan = (opties.baan ?? 4) * TEGEL
    this.snelheid = 44
    this.staat = 'patrouille'
    this.timer = 0
  }

  update(dt, map, speler) {
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt

    if (this.staat === 'patrouille') {
      this.lichaam.x = this.startX + Math.sin(this.tijd * (this.snelheid / this.baan)) * this.baan
      this.kijktRechts = Math.cos(this.tijd * (this.snelheid / this.baan)) > 0
      const ziet = speler
        && Math.abs(speler.midX - this.midX) < 34
        && speler.midY > this.midY
        && speler.midY - this.midY < 120
      if (ziet) { this.staat = 'gezien'; this.timer = 0.5 }
    } else if (this.staat === 'gezien') {
      this.timer -= dt
      if (this.timer <= 0) { this.staat = 'duikt'; this.lichaam.vy = 240; this.timer = 1.4 }
    } else {
      this.timer -= dt
      const r = beweeg(this.lichaam, map, dt)
      if (r.grondGeraakt || this.timer <= 0) {
        this.staat = 'terug'
        this.lichaam.vy = -110
        this.timer = 1.2
      }
      if (this.staat === 'terug') {
        this.lichaam.vy = -110
        if (this.lichaam.y <= this.startY || this.timer <= 0) {
          this.lichaam.y = this.startY
          this.lichaam.vy = 0
          this.staat = 'patrouille'
        }
      }
    }
  }

  opStamp(particles) {
    this.verslagen(particles, '#3ef0ff')
    return true
  }

  herstel() {
    super.herstel()
    this.staat = 'patrouille'
    this.timer = 0
  }

  teken(ctx, camX, camY) {
    if (!this.leeft) return
    const boos = this.staat !== 'patrouille'
    const f = boos ? 4 + (Math.floor(this.tijd * 16) % 2) : Math.floor(this.tijd * 12) % 4
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 1 - camX), Math.round(this.lichaam.y - 2 - camY), this.kijktRechts)
  }
}

// Torretje: staat vast, laadt zichtbaar op en schiet dan horizontaal.
export class Torret extends Vijand {
  constructor(x, y, palet, opties = {}) {
    super(x, y, 14, 14)
    this.blad = torretBlad(palet)
    this.balBlad = sneeuwbalBlad()
    this.stampbaar = false
    this.periode = opties.periode ?? 2.2
    this.timer = this.periode * ((opties.fase ?? 0))
    this.richting = opties.naarLinks ? -1 : 1
    this.projectielen = []
  }

  update(dt, map, speler) {
    for (const b of this.projectielen) b.update(dt, map)
    this.projectielen = this.projectielen.filter((b) => b.leeft)
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt
    // Draait naar de speler zodra die aan de andere kant staat.
    if (speler) this.richting = speler.midX < this.midX ? -1 : 1
    this.timer += dt
    if (this.timer >= this.periode) {
      this.timer -= this.periode
      this.projectielen.push(new Projectiel(
        this.midX, this.midY - 2, this.richting * 190, 0, this.balBlad,
        { zwaarte: 0, duur: 3 },
      ))
      sfx.laser()
    }
  }

  opStamp() { return false }

  herstel() {
    super.herstel()
    this.projectielen.length = 0
    this.timer = 0
  }

  teken(ctx, camX, camY) {
    for (const b of this.projectielen) b.teken(ctx, camX, camY)
    if (!this.leeft) return
    const deel = this.timer / this.periode
    const f = deel > 0.92 ? 3 : deel > 0.7 ? 2 : deel > 0.4 ? 1 : 0
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 1 - camX), Math.round(this.lichaam.y - camY), this.richting > 0)
  }
}

// Kortsluitrobot: loopt naar je toe, laadt zichtbaar op en ontploft. Stamp hem
// voordat de vonken beginnen, of blijf op afstand.
export class Kortsluiter extends Vijand {
  constructor(x, y) {
    super(x + 1, y + 2, 14, 14)
    this.blad = kortsluiterBlad()
    this.staat = 'loopt'
    this.timer = 0
    this.lichaam.vx = -40
    this.knal = 0
  }

  update(dt, map, speler) {
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt

    if (this.staat === 'loopt') {
      if (speler && Math.abs(speler.midX - this.midX) < 130) {
        this.lichaam.vx = Math.sign(speler.midX - this.midX) * 58
      }
      if (speler && Math.abs(speler.midX - this.midX) < 34 && Math.abs(speler.midY - this.midY) < 30) {
        this.staat = 'laadt'
        this.timer = 0.9
      }
    } else if (this.staat === 'laadt') {
      this.lichaam.vx = 0
      this.timer -= dt
      if (this.timer <= 0) { this.staat = 'knal'; this.knal = 0.35 }
    } else {
      this.knal -= dt
      if (this.knal <= 0) this.leeft = false
    }

    this.lichaam.vy = Math.min(this.lichaam.vy + BASIS.zwaartekrachtNeer * dt, BASIS.maxVal)
    beweeg(this.lichaam, map, dt)
    if (this.staat === 'loopt' && this.lichaam.opGrond && this._keerOmBijRand(map)) this.lichaam.vx *= -1
    if (this.lichaam.vx !== 0) this.kijktRechts = this.lichaam.vx > 0
  }

  // Tijdens de knal is hij twee tegels breed gevaarlijk; daarvoor alleen zijn
  // eigen lijf.
  get knalVlak() {
    if (this.staat !== 'knal') return null
    return { x: this.midX - 26, y: this.midY - 22, w: 52, h: 44 }
  }

  opStamp(particles) {
    if (this.staat === 'knal') return false
    this.verslagen(particles, '#ffe14d')
    return true
  }

  herstel() {
    super.herstel()
    this.staat = 'loopt'
    this.timer = 0
    this.knal = 0
    this.lichaam.vx = -40
  }

  teken(ctx, camX, camY) {
    if (!this.leeft) return
    if (this.staat === 'knal') {
      const r = (1 - this.knal / 0.35) * 26
      ctx.globalAlpha = Math.max(0, this.knal / 0.35)
      ctx.fillStyle = '#ffe14d'
      ctx.fillRect(Math.round(this.midX - r - camX), Math.round(this.midY - r - camY), r * 2, r * 2)
      ctx.globalAlpha = 1
      return
    }
    const f = this.staat === 'laadt'
      ? 4 + (Math.floor(this.tijd * (this.timer < 0.35 ? 24 : 10)) % 2)
      : Math.floor(this.tijd * 8) % 4
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 1 - camX), Math.round(this.lichaam.y - 2 - camY), this.kijktRechts)
  }
}

// Patrouillebot: rijdt snel heen en weer op zijn rupsbanden. Gewoon te stampen,
// maar hij is er sneller dan je denkt.
export class Patrouillebot extends Vijand {
  constructor(x, y) {
    super(x - 1, y + 2, 16, 14)
    this.blad = patrouilleBlad()
    this.lichaam.vx = -76
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
    this.verslagen(particles, '#7d8798')
    return true
  }

  teken(ctx, camX, camY) {
    if (!this.leeft) return
    const f = Math.floor(this.tijd * 14) % 4
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 1 - camX), Math.round(this.lichaam.y - 2 - camY), this.kijktRechts)
  }
}

// --- Wereld 5 ---------------------------------------------------------------

// Schaduwkloon: herhaalt jouw bewegingen met een seconde vertraging. Wie
// rustig loopt heeft er geen last van; wie heen en weer springt loopt in
// zichzelf.
export class Kloon extends Vijand {
  constructor(x, y) {
    super(x + 3, y + 4, 12, 16)
    this.blad = kloonBlad()
    this.stampbaar = false
    this.geschiedenis = []
    this.vertraging = 1
  }

  update(dt, map, speler) {
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt
    if (!speler) return

    this.geschiedenis.push({ t: this.tijd, x: speler.lichaam.x, y: speler.lichaam.y })
    // Alles ouder dan de vertraging mag weg; zo blijft de lijst kort.
    while (this.geschiedenis.length > 2 && this.geschiedenis[1].t < this.tijd - this.vertraging) {
      this.geschiedenis.shift()
    }
    const doel = this.geschiedenis[0]
    if (this.tijd > this.vertraging && doel) {
      this.lichaam.x = doel.x + 2
      this.lichaam.y = doel.y + 2
    }
  }

  opStamp() { return false }

  herstel() {
    super.herstel()
    this.geschiedenis.length = 0
  }

  teken(ctx, camX, camY) {
    if (!this.leeft || this.tijd <= this.vertraging) return
    const f = Math.floor(this.tijd * 6) % 4
    ctx.globalAlpha = 0.85
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 6 - camX), Math.round(this.lichaam.y - 6 - camY))
    ctx.globalAlpha = 1
  }
}

// Nanozwerm: drijft traag naar je toe en trekt de route langzaam dicht. Groter
// en trager dan de asvlieg, dus je kunt eromheen — maar niet blijven staan.
export class Zwerm extends Vijand {
  constructor(x, y) {
    super(x + 4, y + 4, 16, 16)
    this.blad = zwermBlad()
    this.stampbaar = false
    this.fase = Math.random() * Math.PI * 2
  }

  update(dt, map, speler) {
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt
    if (!speler) return
    const dx = speler.midX - this.midX
    const dy = speler.midY - this.midY
    const afstand = Math.hypot(dx, dy) || 1
    const snelheid = 34
    this.lichaam.x += (dx / afstand) * snelheid * dt + Math.sin(this.tijd * 2 + this.fase) * 12 * dt
    this.lichaam.y += (dy / afstand) * snelheid * dt + Math.cos(this.tijd * 1.7 + this.fase) * 12 * dt
  }

  opStamp() { return false }

  teken(ctx, camX, camY) {
    if (!this.leeft) return
    const f = Math.floor(this.tijd * 10) % 4
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 4 - camX), Math.round(this.lichaam.y - 4 - camY))
  }
}

// Zwaartekrachtwezen: trekt je naar zich toe zodra je in de buurt komt. Het
// raakt je niet aan; het maakt alleen elke sprong in de omgeving lastiger.
export class Zwaartewezen extends Vijand {
  constructor(x, y, palet, opties = {}) {
    super(x + 2, y + 2, 16, 16)
    this.blad = zwaartewezenBlad()
    this.stampbaar = false
    this.bereik = (opties.bereik ?? 6) * TEGEL
    this.kracht = opties.kracht ?? 210
  }

  update(dt, map, speler) {
    if (!this.leeft) { this.sterfTijd += dt; return }
    this.tijd += dt
    if (!speler || speler.staat !== 'normaal') return
    const dx = this.midX - speler.midX
    const dy = this.midY - speler.midY
    const afstand = Math.hypot(dx, dy)
    if (afstand > this.bereik || afstand < 1) return
    // Lineair afnemend: vlak bij het wezen is de trek het sterkst.
    const sterkte = (1 - afstand / this.bereik) * this.kracht * dt
    speler.lichaam.vx += (dx / afstand) * sterkte
    speler.lichaam.vy += (dy / afstand) * sterkte * 0.6
  }

  opStamp() { return false }

  teken(ctx, camX, camY) {
    if (!this.leeft) return
    const f = Math.floor(this.tijd * 8) % 4
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 2 - camX), Math.round(this.lichaam.y - 2 - camY))
  }
}

// Echoslijm: loopt als het slijm van wereld 1, maar komt na een paar seconden
// terug op de plek waar je het verslagen hebt.
export class Echoslijm extends Vijand {
  constructor(x, y) {
    super(x, y + 4, 14, 12)
    this.blad = echoslijmBlad()
    this.lichaam.vx = -30
    this.terug = 0
    this.terugX = 0
    this.terugY = 0
  }

  update(dt, map) {
    if (!this.leeft) {
      this.sterfTijd += dt
      this.terug -= dt
      if (this.terug <= 0) {
        this.leeft = true
        this.sterfTijd = 0
        this.lichaam.x = this.terugX
        this.lichaam.y = this.terugY
        this.lichaam.vx = -30
        this.lichaam.vy = 0
      }
      return
    }
    this.tijd += dt
    this.lichaam.vy = Math.min(this.lichaam.vy + BASIS.zwaartekrachtNeer * dt, BASIS.maxVal)
    beweeg(this.lichaam, map, dt)
    if (this.lichaam.opGrond && this._keerOmBijRand(map)) this.lichaam.vx *= -1
    this.kijktRechts = this.lichaam.vx > 0
  }

  opStamp(particles) {
    this.terugX = this.lichaam.x
    this.terugY = this.lichaam.y
    this.terug = 4
    this.verslagen(particles, '#a45cff')
    return true
  }

  herstel() {
    super.herstel()
    this.terug = 0
    this.lichaam.vx = -30
  }

  teken(ctx, camX, camY) {
    if (!this.leeft) {
      // Aftelring op de plek waar hij terugkomt.
      if (this.terug > 0) {
        tekenEchoRing(ctx, this.terugX + 7 - camX, this.terugY + 6 - camY, 1 - this.terug / 4)
      }
      return
    }
    const f = Math.floor(this.tijd * 7) % 4
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 1 - camX), Math.round(this.lichaam.y - 4 - camY), this.kijktRechts)
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
  spetter: Spetter,
  vleermuis: Vleermuis,
  krab: Krab,
  asvlieg: Asvlieg,
  drone: Drone,
  torret: Torret,
  kortsluiter: Kortsluiter,
  patrouille: Patrouillebot,
  kloon: Kloon,
  zwerm: Zwerm,
  zwaartewezen: Zwaartewezen,
  echoslijm: Echoslijm,
}

export function maakVijand(soort, x, y, palet, opties) {
  const Klasse = VIJAND_KLASSEN[soort]
  if (!Klasse) throw new Error(`Onbekende vijand: ${soort}`)
  return new Klasse(x, y, palet, opties)
}

export const AFMETINGEN = { SLIJM, SPOOR, KWAL, KEVER }
