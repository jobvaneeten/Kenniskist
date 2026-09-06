// Bazen. Drie fases, elk met een eigen aanvalspatroon en een duidelijk moment
// waarop je kunt raken — bij de Slijmkoningin is dat de landing, waarna ze even
// plat blijft liggen.

import { Lichaam, beweeg } from '../engine/physics.js'
import { TEGEL } from '../engine/tilemap.js'
import {
  koninginBlad, slijmbalBlad, KONINGIN, SLIJMBAL, KON_FRAME,
  ijswormBlad, tekenWormSegment, tekenWormSpoor, tekenWormBarst, WORMKOP,
  titaanBlad, tekenSchokgolf, TITAAN,
  kernBlad, KERN,
  verslinderBlad, VERSLINDER,
} from '../art/bazen.js'
import { Slijm } from './vijanden.js'
import { sfx } from '../audio/sfx.js'

const LEVENS_PER_FASE = 3

export class Slijmbal {
  constructor(x, y, vx, vy, palet) {
    this.lichaam = new Lichaam(x, y, SLIJMBAL.w - 2, SLIJMBAL.h - 2)
    this.lichaam.vx = vx
    this.lichaam.vy = vy
    this.blad = slijmbalBlad(palet)
    this.leeft = true
    this.tijd = 0
  }

  update(dt, map) {
    if (!this.leeft) return
    this.tijd += dt
    this.lichaam.vy = Math.min(this.lichaam.vy + 700 * dt, 400)
    const r = beweeg(this.lichaam, map, dt)
    // Ketst één keer, verdwijnt daarna: anders blijven ze eindeloos rondstuiten.
    if (r.grondGeraakt) {
      if (this.tijd > 1.2) this.leeft = false
      else this.lichaam.vy = -190
    }
    if (r.muurGeraakt) this.lichaam.vx *= -1
    if (this.tijd > 5) this.leeft = false
  }

  teken(ctx, camX, camY) {
    if (!this.leeft) return
    const f = Math.floor(this.tijd * 12) % 4
    this.blad.teken(ctx, f, Math.round(this.lichaam.x - 1 - camX), Math.round(this.lichaam.y - 1 - camY))
  }
}

export class Slijmkoningin {
  constructor(x, y, palet, arena) {
    this.palet = palet
    this.arena = arena // { links, rechts } in pixels
    // y is de tegel waarin het merkteken staat; ze staat op de vloer eronder.
    this.lichaam = new Lichaam(x, y + TEGEL - 30, 46, 30)
    this.startX = x
    this.startY = this.lichaam.y

    this.fase = 1
    this.levens = LEVENS_PER_FASE
    this.maxTotaal = LEVENS_PER_FASE * 3
    this.geraaktTotaal = 0

    this.staat = 'intro' // intro | wachten | hurken | springen | landing | spugen | gewond | dood
    this.timer = 1.8
    this.tijd = 0
    this.onkwetsbaar = 0
    this.kwetsbaar = 0
    this.kijktRechts = false
    this.ballen = []
    this.kinderen = []
    this.leeft = true
    this.klaar = false
    this.stampbaar = true
  }

  get midX() { return this.lichaam.midX }
  get midY() { return this.lichaam.midY }
  get deel() { return (this.maxTotaal - this.geraaktTotaal) / this.maxTotaal }

  get blad() { return koninginBlad(this.palet, this.fase) }

  update(dt, map, speler, particles, fx) {
    this.tijd += dt
    if (this.onkwetsbaar > 0) this.onkwetsbaar -= dt
    if (this.kwetsbaar > 0) this.kwetsbaar -= dt

    for (const b of this.ballen) b.update(dt, map)
    this.ballen = this.ballen.filter((b) => b.leeft)
    for (const k of this.kinderen) k.update(dt, map, speler)
    this.kinderen = this.kinderen.filter((k) => k.leeft || k.sterfTijd < 0.4)

    if (this.staat === 'dood') { this._updateDood(dt); return }

    this.timer -= dt

    switch (this.staat) {
      case 'intro':
        if (this.timer <= 0) this._wacht(0.7)
        break

      case 'wachten':
        this.kijktRechts = speler.midX > this.midX
        if (this.timer <= 0) {
          // Fase 1 springt alleen; vanaf fase 2 wisselt ze af met spugen.
          if (this.fase >= 2 && Math.random() < 0.45) this._begin('spugen', 0.5)
          else this._begin('hurken', 0.4)
        }
        break

      case 'hurken':
        if (this.timer <= 0) this._spring(speler)
        break

      case 'springen':
        this._physics(dt, map, particles, fx)
        break

      case 'landing':
        // Dit is het venster waarin je haar kunt raken.
        this._physics(dt, map, particles, fx)
        if (this.timer <= 0) this._wacht(this.fase === 3 ? 0.35 : 0.6)
        break

      case 'spugen':
        if (this.timer <= 0) { this._spuug(speler); this._wacht(0.7) }
        break

      case 'gewond':
        if (this.timer <= 0) {
          if (this.levens <= 0) this._volgendeFase(particles, fx)
          else this._wacht(0.5)
        }
        break

      default:
        break
    }
  }

  _wacht(t) { this.staat = 'wachten'; this.timer = t }

  _begin(staat, t) { this.staat = staat; this.timer = t }

  _spring(speler) {
    this.staat = 'springen'
    this.timer = 3
    const richting = Math.sign(speler.midX - this.midX) || 1
    const kracht = this.fase === 1 ? 300 : this.fase === 2 ? 350 : 400
    this.lichaam.vy = -kracht
    this.lichaam.vx = richting * (this.fase === 3 ? 105 : 78)
    this.kijktRechts = richting > 0
    sfx.spring()
  }

  _physics(dt, map, particles, fx) {
    const l = this.lichaam
    l.vy = Math.min(l.vy + 1100 * dt, 520)
    // Binnen de arena blijven: ze mag niet door de zijmuren heen glijden.
    if (l.x < this.arena.links) { l.x = this.arena.links; l.vx = Math.abs(l.vx) }
    if (l.rechts > this.arena.rechts) { l.x = this.arena.rechts - l.w; l.vx = -Math.abs(l.vx) }

    const r = beweeg(l, map, dt)
    if (r.grondGeraakt && this.staat === 'springen') {
      this.staat = 'landing'
      this.timer = this.fase === 3 ? 0.75 : 1
      this.kwetsbaar = this.timer
      l.vx = 0
      fx.schud(5, 0.3)
      sfx.baasHit()
      particles.landing(this.midX, l.onder)
      for (let i = 0; i < 14; i++) {
        particles.spuit(this.midX + (Math.random() - 0.5) * 44, l.onder - 2, {
          vx: (Math.random() - 0.5) * 220, vy: -60 - Math.random() * 90,
          duur: 0.5, kleur: this.palet.deco[1], zwaarte: 420, grootte: 2,
        })
      }
    }
  }

  _spuug(speler) {
    const richting = Math.sign(speler.midX - this.midX) || 1
    const hoeken = this.fase === 3 ? [-1, 0, 1] : [0]
    for (const h of hoeken) {
      this.ballen.push(new Slijmbal(
        this.midX - SLIJMBAL.w / 2,
        this.lichaam.y + 6,
        richting * 110 + h * 70,
        -230 - Math.abs(h) * 40,
        this.palet,
      ))
    }
    sfx.laser()
  }

  // Stamp op de kop; telt alleen tijdens het landingsvenster.
  opStamp(particles, fx) {
    if (this.onkwetsbaar > 0 || this.staat === 'dood') return false
    if (this.kwetsbaar <= 0) return false
    this.levens--
    this.geraaktTotaal++
    this.onkwetsbaar = 0.8
    this.staat = 'gewond'
    this.timer = 0.5
    this.kwetsbaar = 0
    sfx.baasHit()
    fx.schud(6, 0.3)
    fx.hitStop(0.1)
    fx.flitsScherm('#ffffff', 0.08)
    particles.pop(this.midX, this.midY, this.palet.deco[0], 20)
    return true
  }

  _volgendeFase(particles, fx) {
    if (this.fase >= 3) { this._sterf(particles, fx); return }
    this.fase++
    this.levens = LEVENS_PER_FASE
    this.timer = 1
    this.staat = 'wachten'
    fx.schud(7, 0.5)
    fx.flitsScherm(this.palet.deco[0], 0.2)
    particles.pop(this.midX, this.midY, this.palet.deco[1], 26)
    // Vanaf fase 2 laat ze bij elke faseovergang twee kleine slijmen los.
    const y = this.lichaam.onder - TEGEL
    this.kinderen.push(new Slijm(this.midX - 40, y, this.palet))
    this.kinderen.push(new Slijm(this.midX + 24, y, this.palet))
  }

  _sterf(particles, fx) {
    this.staat = 'dood'
    this.timer = 2.2
    this.leeft = false
    this.lichaam.vx = 0
    fx.schud(8, 0.8)
    sfx.vijandDood()
    particles.pop(this.midX, this.midY, this.palet.deco[1], 40)
  }

  _updateDood(dt) {
    this.timer -= dt
    if (this.timer <= 0) this.klaar = true
  }

  // Raakt de speler haar lijf (niet van bovenaf)?
  raaktSpeler(lichaam) {
    if (this.staat === 'dood') return false
    const l = this.lichaam
    return lichaam.x < l.x + l.w && lichaam.x + lichaam.w > l.x
      && lichaam.y < l.y + l.h && lichaam.y + lichaam.h > l.y
  }

  _frame() {
    switch (this.staat) {
      case 'hurken': return KON_FRAME.HURK
      case 'springen': return this.lichaam.vy < 0 ? KON_FRAME.SPRONG : KON_FRAME.HURK
      case 'landing': return KON_FRAME.LANDING
      case 'spugen': return KON_FRAME.SPUGEN
      case 'gewond': return KON_FRAME.GERAAKT
      case 'dood': return Math.min(11, KON_FRAME.DOOD + Math.floor((2.2 - this.timer) * 2))
      default: return Math.floor(this.tijd * 5) % 4
    }
  }

  teken(ctx, camX, camY) {
    for (const k of this.kinderen) k.teken(ctx, camX, camY)
    for (const b of this.ballen) b.teken(ctx, camX, camY)
    if (this.onkwetsbaar > 0 && Math.floor(this.onkwetsbaar * 14) % 2 === 0) return
    const x = Math.round(this.lichaam.x - (KONINGIN.w - this.lichaam.w) / 2 - camX)
    const y = Math.round(this.lichaam.onder - KONINGIN.h - camY)
    this.blad.teken(ctx, this._frame(), x, y, this.kijktRechts)

    // Tijdens het kwetsbare venster licht ze op: zonder dat signaal is het
    // gokken wanneer je mag stampen.
    if (this.kwetsbaar > 0) {
      ctx.globalAlpha = 0.25 + Math.sin(this.tijd * 22) * 0.12
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x + 10, y + 6, KONINGIN.w - 20, 8)
      ctx.globalAlpha = 1
    }
  }
}

// --- IJsworm (wereld 2) -----------------------------------------------------
// Graaft onder het ijs door, kondigt met een barst aan waar hij omhoog komt, en
// is alleen te raken zolang zijn kop boven staat.

const WORM_LEVENS_PER_FASE = 3

export class IJsworm {
  constructor(x, y, palet, arena) {
    this.palet = palet
    this.arena = arena
    // y is de tegel waarin het merkteken staat; het ijsoppervlak is de bovenkant
    // van de tegel eronder.
    this.grondY = y + TEGEL
    this.lichaam = new Lichaam(x, this.grondY, 30, 34)

    this.fase = 1
    this.levens = WORM_LEVENS_PER_FASE
    this.maxTotaal = WORM_LEVENS_PER_FASE * 3
    this.geraaktTotaal = 0

    this.staat = 'intro'
    this.timer = 1.6
    this.tijd = 0
    this.onkwetsbaar = 0
    this.kwetsbaar = 0
    this.leeft = true
    this.klaar = false
    this.stampbaar = true

    this.graafX = x + 15
    this.doelX = x + 15
    this.hoogte = 0 // 0 = helemaal onder, 1 = kop volledig boven
    this.staart = [] // laatste posities van de kop, voor de segmenten
    this.ballen = []
    this.kinderen = []
  }

  get midX() { return this.lichaam.midX }
  get midY() { return this.lichaam.midY }
  get deel() { return (this.maxTotaal - this.geraaktTotaal) / this.maxTotaal }
  get boven() { return this.hoogte > 0.45 }

  update(dt, map, speler, particles, fx) {
    this.tijd += dt
    if (this.onkwetsbaar > 0) this.onkwetsbaar -= dt
    if (this.kwetsbaar > 0) this.kwetsbaar -= dt

    for (const b of this.ballen) b.update(dt, map)
    this.ballen = this.ballen.filter((b) => b.leeft)

    if (this.staat === 'dood') {
      this.timer -= dt
      this.hoogte = Math.max(0, this.hoogte - dt * 0.6)
      if (this.timer <= 0) this.klaar = true
      this._plaatsLichaam()
      return
    }

    this.timer -= dt

    switch (this.staat) {
      case 'intro':
        if (this.timer <= 0) this._duik(speler)
        break

      case 'graven': {
        // Onder het ijs naar het doel toe; de bult verraadt waar hij zit.
        const richting = Math.sign(this.doelX - this.graafX)
        const snelheid = this.fase === 3 ? 190 : this.fase === 2 ? 150 : 120
        this.graafX += richting * snelheid * dt
        if (Math.abs(this.doelX - this.graafX) < 6 || this.timer <= 0) {
          this.graafX = this.doelX
          this.staat = 'barsten'
          this.timer = this.fase === 3 ? 0.5 : 0.75
        }
        break
      }

      case 'barsten':
        if (this.timer <= 0) {
          this.staat = 'omhoog'
          this.timer = 0.35
          sfx.baasHit()
          fx.schud(4, 0.2)
          for (let i = 0; i < 16; i++) {
            particles.spuit(this.graafX + (Math.random() - 0.5) * 30, this.grondY, {
              vx: (Math.random() - 0.5) * 190, vy: -110 - Math.random() * 130,
              duur: 0.6, kleur: Math.random() > 0.5 ? '#ffffff' : '#bfe6ff', zwaarte: 460, grootte: 2,
            })
          }
        }
        break

      case 'omhoog':
        this.hoogte = Math.min(1, this.hoogte + dt / 0.35)
        if (this.timer <= 0) {
          this.staat = 'uit'
          this.timer = this.fase === 3 ? 0.85 : 1.15
          this.kwetsbaar = this.timer
          if (this.fase >= 2) this._spuug(speler)
        }
        break

      case 'uit':
        if (this.timer <= 0) { this.staat = 'omlaag'; this.timer = 0.3 }
        break

      case 'omlaag':
        this.hoogte = Math.max(0, this.hoogte - dt / 0.3)
        if (this.timer <= 0) this._duik(speler)
        break

      case 'gewond':
        this.hoogte = Math.max(0, this.hoogte - dt / 0.4)
        if (this.timer <= 0) {
          if (this.levens <= 0) this._volgendeFase(particles, fx)
          else this._duik(speler)
        }
        break

      default:
        break
    }

    this._plaatsLichaam()
    this._bewaarStaart()
  }

  _duik(speler) {
    this.staat = 'graven'
    this.hoogte = 0

    // Naast de speler uitkomen, nooit eronder: anders is er geen manier om de
    // aanval te ontwijken. Klemmen op de arenarand mag die afstand niet
    // opeten, dus we kiezen de kant waar genoeg ruimte is.
    const spelerX = speler?.midX ?? this.graafX
    const afstand = this.fase === 3 ? 34 : 48
    const min = this.arena.links + 26
    const max = this.arena.rechts - 26
    const links = spelerX - afstand
    const rechts = spelerX + afstand
    const kanLinks = links >= min
    const kanRechts = rechts <= max

    let doel
    if (kanLinks && kanRechts) doel = Math.random() < 0.5 ? links : rechts
    else if (kanLinks) doel = links
    else if (kanRechts) doel = rechts
    // Allebei te krap (speler in een hoek van een smalle arena): dan zo ver
    // mogelijk weg, maar nog steeds niet bovenop hem.
    else doel = spelerX - min > max - spelerX ? min : max

    this.doelX = Math.max(min, Math.min(max, doel))
    this.timer = 3
  }

  _plaatsLichaam() {
    const h = this.lichaam.h
    this.lichaam.x = this.graafX - this.lichaam.w / 2
    // hoogte 0 = kop precies onder het oppervlak, 1 = volledig erboven.
    this.lichaam.y = this.grondY - h * this.hoogte
  }

  _bewaarStaart() {
    this.staart.unshift({ x: this.graafX, y: this.lichaam.y + this.lichaam.h / 2, h: this.hoogte })
    if (this.staart.length > 44) this.staart.length = 44
  }

  _spuug(speler) {
    const richting = Math.sign((speler?.midX ?? 0) - this.midX) || 1
    const hoeken = this.fase === 3 ? [-1, 0, 1] : [0]
    for (const h of hoeken) {
      this.ballen.push(new Slijmbal(
        this.midX, this.lichaam.y + 4,
        richting * 90 + h * 80, -200 - Math.abs(h) * 30,
        this.palet,
      ))
    }
    sfx.laser()
  }

  opStamp(particles, fx) {
    if (this.onkwetsbaar > 0 || this.staat === 'dood') return false
    if (this.kwetsbaar <= 0 || !this.boven) return false
    this.levens--
    this.geraaktTotaal++
    this.onkwetsbaar = 0.8
    this.staat = 'gewond'
    this.timer = 0.55
    this.kwetsbaar = 0
    sfx.baasHit()
    fx.schud(6, 0.3)
    fx.hitStop(0.1)
    fx.flitsScherm('#ffffff', 0.08)
    particles.pop(this.midX, this.midY, '#bfe6ff', 22)
    return true
  }

  _volgendeFase(particles, fx) {
    if (this.fase >= 3) { this._sterf(particles, fx); return }
    this.fase++
    this.levens = WORM_LEVENS_PER_FASE
    fx.schud(7, 0.5)
    fx.flitsScherm('#dceaff', 0.2)
    particles.pop(this.midX, this.midY, '#ffffff', 26)
    this.staat = 'graven'
    this.timer = 3
    this.hoogte = 0
  }

  _sterf(particles, fx) {
    this.staat = 'dood'
    this.timer = 2.2
    this.leeft = false
    fx.schud(8, 0.8)
    sfx.vijandDood()
    particles.pop(this.midX, this.midY, '#ffffff', 40)
  }

  raaktSpeler(lichaam) {
    if (this.staat === 'dood' || this.hoogte < 0.2) return false
    const l = this.lichaam
    return lichaam.x < l.x + l.w && lichaam.x + lichaam.w > l.x
      && lichaam.y < l.y + l.h && lichaam.y + lichaam.h > l.y
  }

  _frame() {
    if (this.staat === 'dood') return 5 + Math.min(2, Math.floor((2.2 - this.timer) * 1.5))
    if (this.staat === 'gewond') return 4
    if (this.staat === 'uit') return 2 + (Math.floor(this.tijd * 6) % 2)
    return Math.floor(this.tijd * 4) % 2
  }

  teken(ctx, camX, camY) {
    for (const b of this.ballen) b.teken(ctx, camX, camY)

    // Onder het ijs: alleen de bult, plus de barst vlak voor hij eruit komt.
    if (this.hoogte <= 0.02) {
      tekenWormSpoor(ctx, this.graafX - camX, this.grondY - camY, this.fase,
        this.staat === 'barsten' ? 1.4 : 1)
      if (this.staat === 'barsten') {
        tekenWormBarst(ctx, this.graafX - camX, this.grondY - camY - 2, 1 - this.timer / 0.75)
      }
      return
    }

    // Lijfsegmenten langs de afgelegde baan, van dun naar dik richting de kop.
    for (let i = 5; i >= 1; i--) {
      const punt = this.staart[i * 6]
      if (!punt) continue
      const r = 12 - i * 1.6
      tekenWormSegment(ctx, punt.x - camX, Math.max(punt.y, this.grondY - 4) - camY, r, this.fase)
    }

    if (this.onkwetsbaar > 0 && Math.floor(this.onkwetsbaar * 14) % 2 === 0) return
    const blad = ijswormBlad(this.palet, this.fase)
    blad.teken(ctx, this._frame(),
      Math.round(this.midX - WORMKOP.w / 2 - camX),
      Math.round(this.lichaam.y - 4 - camY))

    if (this.kwetsbaar > 0) {
      ctx.globalAlpha = 0.25 + Math.sin(this.tijd * 22) * 0.12
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(Math.round(this.midX - 12 - camX), Math.round(this.lichaam.y - camY), 24, 7)
      ctx.globalAlpha = 1
    }
  }
}

// --- Magmatitaan (wereld 3) -------------------------------------------------
// Loopt langzaam heen en weer, slaat met zijn vuist op de vloer en blijft
// daarna even voorovergebogen staan. Precies dán staat zijn kop op springhoogte.

const TITAAN_LEVENS_PER_FASE = 3

// De schokgolf die na een klap over de vloer rolt.
class Schokgolf {
  constructor(x, y, richting, snelheid) {
    this.x = x
    this.y = y
    this.richting = richting
    this.snelheid = snelheid
    this.tijd = 0
    this.leeft = true
  }

  get lichaam() { return { x: this.x - 6, y: this.y - 8, w: 12, h: 10 } }

  update(dt, arena) {
    this.tijd += dt
    this.x += this.richting * this.snelheid * dt
    if (this.x < arena.links - 20 || this.x > arena.rechts + 20 || this.tijd > 6) this.leeft = false
  }

  teken(ctx, camX, camY) {
    tekenSchokgolf(ctx, this.x - camX, this.y - camY, Math.max(0.3, 1 - this.tijd / 4), this.tijd)
  }
}

export class Magmatitaan {
  constructor(x, y, palet, arena) {
    this.palet = palet
    this.arena = arena
    this.grondY = y + TEGEL
    // De collisionbox is smaller dan de sprite: alleen de romp en de kop.
    this.lichaam = new Lichaam(x - 14, this.grondY - 52, 40, 52)

    this.fase = 1
    this.levens = TITAAN_LEVENS_PER_FASE
    this.maxTotaal = TITAAN_LEVENS_PER_FASE * 3
    this.geraaktTotaal = 0

    this.staat = 'intro'
    this.timer = 1.8
    this.tijd = 0
    this.onkwetsbaar = 0
    this.kwetsbaar = 0
    this.kijktRechts = false
    this.leeft = true
    this.klaar = false
    this.stampbaar = true

    this.golven = []
    this.ballen = []
    this.kinderen = []
  }

  get midX() { return this.lichaam.midX }
  get midY() { return this.lichaam.midY }
  get deel() { return (this.maxTotaal - this.geraaktTotaal) / this.maxTotaal }

  // Waar zijn kop zit; alleen daar telt een stamp.
  get kopVlak() {
    const buk = this.staat === 'gebogen' ? 16 : this.staat === 'slaan' ? 6 : 0
    return { x: this.midX - 13, y: this.grondY - 60 + buk, w: 26, h: 18 }
  }

  update(dt, map, speler, particles, fx) {
    this.tijd += dt
    if (this.onkwetsbaar > 0) this.onkwetsbaar -= dt
    if (this.kwetsbaar > 0) this.kwetsbaar -= dt

    for (const g of this.golven) g.update(dt, this.arena)
    this.golven = this.golven.filter((g) => g.leeft)
    for (const b of this.ballen) b.update(dt, map)
    this.ballen = this.ballen.filter((b) => b.leeft)

    if (this.staat === 'dood') {
      this.timer -= dt
      if (this.timer <= 0) this.klaar = true
      return
    }

    this.timer -= dt
    if (speler) this.kijktRechts = speler.midX > this.midX

    switch (this.staat) {
      case 'intro':
        if (this.timer <= 0) this._begin('lopen', 1.4)
        break

      case 'lopen': {
        // Traag genoeg om langs te komen, maar hij drijft je wel in het nauw.
        const snelheid = this.fase === 3 ? 42 : this.fase === 2 ? 34 : 26
        const richting = this.kijktRechts ? 1 : -1
        this.lichaam.x += richting * snelheid * dt
        this.lichaam.x = Math.max(this.arena.links, Math.min(this.arena.rechts - this.lichaam.w, this.lichaam.x))
        if (this.timer <= 0) this._begin('optillen', 0.5)
        break
      }

      case 'optillen':
        if (this.timer <= 0) this._sla(particles, fx, speler)
        break

      case 'slaan':
        if (this.timer <= 0) {
          this.staat = 'gebogen'
          this.timer = this.fase === 3 ? 1 : 1.4
          this.kwetsbaar = this.timer
        }
        break

      case 'gebogen':
        if (this.timer <= 0) this._begin('lopen', this.fase === 3 ? 1 : 1.5)
        break

      case 'gewond':
        if (this.timer <= 0) {
          if (this.levens <= 0) this._volgendeFase(particles, fx)
          else this._begin('lopen', 1.2)
        }
        break

      default:
        break
    }
  }

  _begin(staat, t) { this.staat = staat; this.timer = t }

  _sla(particles, fx, speler) {
    this.staat = 'slaan'
    this.timer = 0.35
    const snelheid = this.fase === 3 ? 150 : 118
    this.golven.push(new Schokgolf(this.midX - 20, this.grondY, -1, snelheid))
    this.golven.push(new Schokgolf(this.midX + 20, this.grondY, 1, snelheid))
    // Vanaf fase 2 gooit hij er ook brokken achteraan.
    if (this.fase >= 2) {
      const richting = Math.sign((speler?.midX ?? 0) - this.midX) || 1
      const hoeken = this.fase === 3 ? [-1, 0, 1] : [0]
      for (const h of hoeken) {
        this.ballen.push(new Slijmbal(
          this.midX, this.lichaam.y + 8,
          richting * 105 + h * 75, -215 - Math.abs(h) * 35,
          this.palet,
        ))
      }
    }
    fx.schud(6, 0.35)
    sfx.baasHit()
    for (let i = 0; i < 16; i++) {
      particles.spuit(this.midX + (Math.random() - 0.5) * 60, this.grondY - 2, {
        vx: (Math.random() - 0.5) * 240, vy: -70 - Math.random() * 120,
        duur: 0.55, kleur: Math.random() > 0.5 ? '#ff8c1a' : '#6b4038', zwaarte: 460, grootte: 2,
      })
    }
  }

  // Alleen een stamp op de kop telt, en alleen terwijl hij gebogen staat.
  opStamp(particles, fx, lichaam) {
    if (this.onkwetsbaar > 0 || this.staat === 'dood') return false
    if (this.kwetsbaar <= 0) return false
    if (lichaam) {
      // Alleen de bovengrens telt. De ondergrens zat er eerst ook in, en dat
      // liet de helft van de rake stampen wegvallen: op het eerste frame dat je
      // hem raakt staan je voeten nog net boven de kop, en dan ketste je af
      // zonder schade te doen. De aanroeper controleert al dat je van bovenaf
      // komt, dus verder omlaag kijken hoeft niet.
      const k = this.kopVlak
      const raaktKop = lichaam.rechts > k.x - 3 && lichaam.links < k.x + k.w + 3
        && lichaam.onder < k.y + k.h
      if (!raaktKop) return false
    }
    this.levens--
    this.geraaktTotaal++
    this.onkwetsbaar = 0.9
    this.staat = 'gewond'
    this.timer = 0.6
    this.kwetsbaar = 0
    sfx.baasHit()
    fx.schud(7, 0.35)
    fx.hitStop(0.1)
    fx.flitsScherm('#ffffff', 0.08)
    particles.pop(this.midX, this.lichaam.y, '#ff8c1a', 24)
    return true
  }

  _volgendeFase(particles, fx) {
    if (this.fase >= 3) { this._sterf(particles, fx); return }
    this.fase++
    this.levens = TITAAN_LEVENS_PER_FASE
    fx.schud(8, 0.6)
    fx.flitsScherm('#ff7a2a', 0.25)
    particles.pop(this.midX, this.midY, '#ff8c1a', 30)
    this._begin('lopen', 1.2)
  }

  _sterf(particles, fx) {
    this.staat = 'dood'
    this.timer = 2.4
    this.leeft = false
    this.golven.length = 0
    fx.schud(9, 1)
    sfx.vijandDood()
    particles.pop(this.midX, this.midY, '#ff8c1a', 46)
  }

  raaktSpeler(lichaam) {
    if (this.staat === 'dood') return false
    const l = this.lichaam
    return lichaam.x < l.x + l.w && lichaam.x + lichaam.w > l.x
      && lichaam.y < l.y + l.h && lichaam.y + lichaam.h > l.y
  }

  _frame() {
    switch (this.staat) {
      case 'optillen': return 2
      case 'slaan': return 3
      case 'gebogen': return 4 + (Math.floor(this.tijd * 5) % 2)
      case 'gewond': return 6
      case 'dood': return Math.min(9, 7 + Math.floor((2.4 - this.timer) * 1.4))
      default: return Math.floor(this.tijd * 2) % 2
    }
  }

  teken(ctx, camX, camY) {
    for (const g of this.golven) g.teken(ctx, camX, camY)
    for (const b of this.ballen) b.teken(ctx, camX, camY)
    if (this.onkwetsbaar > 0 && Math.floor(this.onkwetsbaar * 14) % 2 === 0) return

    const blad = titaanBlad(this.palet, this.fase)
    blad.teken(ctx, this._frame(),
      Math.round(this.midX - TITAAN.w / 2 - camX),
      Math.round(this.grondY - TITAAN.h - camY),
      this.kijktRechts)

    if (this.kwetsbaar > 0) {
      const k = this.kopVlak
      ctx.globalAlpha = 0.28 + Math.sin(this.tijd * 22) * 0.12
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(Math.round(k.x - camX), Math.round(k.y - camY), k.w, 6)
      ctx.globalAlpha = 1
    }
  }
}

// --- Kern-AI (wereld 4) -----------------------------------------------------
// Zweeft door de arena met een gesloten schild. Na elke aanvalsronde opent het
// schild een paar seconden; dat is het enige moment waarop je hem kunt raken.
// Vanaf fase 2 draait hij de zwaartekracht om terwijl het schild dicht is.

const KERN_LEVENS_PER_FASE = 3

export class KernAI {
  constructor(x, y, palet, arena) {
    this.palet = palet
    this.arena = arena
    this.grondY = y + TEGEL
    this.lichaam = new Lichaam(x - 10, this.grondY - 96, 36, 36)
    this.thuisY = this.lichaam.y

    this.fase = 1
    this.levens = KERN_LEVENS_PER_FASE
    this.maxTotaal = KERN_LEVENS_PER_FASE * 3
    this.geraaktTotaal = 0

    this.staat = 'intro'
    this.timer = 1.8
    this.tijd = 0
    this.onkwetsbaar = 0
    this.kwetsbaar = 0
    this.leeft = true
    this.klaar = false
    this.stampbaar = true
    this.zwaartekrachtOm = false

    this.ballen = []
    this.kinderen = []
    this.golven = []
  }

  get midX() { return this.lichaam.midX }
  get midY() { return this.lichaam.midY }
  get deel() { return (this.maxTotaal - this.geraaktTotaal) / this.maxTotaal }
  get open() { return this.staat === 'open' }

  update(dt, map, speler, particles, fx) {
    this.tijd += dt
    if (this.onkwetsbaar > 0) this.onkwetsbaar -= dt
    if (this.kwetsbaar > 0) this.kwetsbaar -= dt

    for (const b of this.ballen) b.update(dt, map)
    this.ballen = this.ballen.filter((b) => b.leeft)

    if (this.staat === 'dood') {
      this.timer -= dt
      this.lichaam.y += 30 * dt
      if (this.timer <= 0) this.klaar = true
      return
    }

    this.timer -= dt

    // Zweeft altijd; bij het openen zakt hij tot vlak boven de vloer.
    //
    // Springhoogte is 56 px (zie BASIS in engine/physics.js), dus alles wat
    // hoger hangt dan dat is niet te stampen — hij zakte eerst naar 58 en was
    // daarmee net onraakbaar. 46 laat ruim tien pixels marge, en de slinger
    // staat tijdens het openen stil zodat het een vast doel is en geen gokwerk.
    const doelY = this.open ? this.grondY - 46 : this.thuisY
    this.lichaam.y += (doelY - this.lichaam.y) * Math.min(1, dt * 3)
    const zweef = this.open ? 0 : Math.sin(this.tijd * 1.6) * 24
    const midden = (this.arena.links + this.arena.rechts) / 2
    this.lichaam.x += (midden - this.lichaam.w / 2 + zweef - this.lichaam.x) * Math.min(1, dt * 4)

    switch (this.staat) {
      case 'intro':
        if (this.timer <= 0) this._begin('schieten', 0.6)
        break

      case 'schieten':
        if (this.timer <= 0) {
          this._vuur(speler)
          this.ronde = (this.ronde ?? 0) + 1
          if (this.ronde >= (this.fase === 3 ? 4 : 3)) {
            this.ronde = 0
            this._begin('open', this.fase === 3 ? 1.5 : 2.1)
            this.kwetsbaar = this.timer
            this.zwaartekrachtOm = false
            sfx.portaal()
          } else {
            this._begin('schieten', this.fase === 3 ? 0.7 : 1)
            // Vanaf fase 2 draait hij tussen de schoten door de zwaartekracht om.
            if (this.fase >= 2) this.zwaartekrachtOm = !this.zwaartekrachtOm
          }
        }
        break

      case 'open':
        if (this.timer <= 0) this._begin('schieten', 0.8)
        break

      case 'gewond':
        if (this.timer <= 0) {
          if (this.levens <= 0) this._volgendeFase(particles, fx)
          else this._begin('schieten', 0.9)
        }
        break

      default:
        break
    }
  }

  _begin(staat, t) { this.staat = staat; this.timer = t }

  _vuur(speler) {
    const doelX = speler?.midX ?? this.midX
    const hoeken = this.fase === 3 ? [-1, 0, 1] : this.fase === 2 ? [-1, 1] : [0]
    for (const h of hoeken) {
      const dx = doelX - this.midX + h * 60
      this.ballen.push(new Slijmbal(
        this.midX, this.lichaam.onder,
        Math.max(-190, Math.min(190, dx * 1.6)), 40,
        this.palet,
      ))
    }
    sfx.laser()
  }

  opStamp(particles, fx) {
    if (this.onkwetsbaar > 0 || this.staat === 'dood') return false
    if (this.kwetsbaar <= 0 || !this.open) return false
    this.levens--
    this.geraaktTotaal++
    this.onkwetsbaar = 0.9
    this.staat = 'gewond'
    this.timer = 0.6
    this.kwetsbaar = 0
    this.zwaartekrachtOm = false
    sfx.baasHit()
    fx.schud(6, 0.3)
    fx.hitStop(0.1)
    fx.flitsScherm('#ffffff', 0.08)
    particles.pop(this.midX, this.midY, '#3ef0ff', 22)
    return true
  }

  _volgendeFase(particles, fx) {
    if (this.fase >= 3) { this._sterf(particles, fx); return }
    this.fase++
    this.levens = KERN_LEVENS_PER_FASE
    this.ronde = 0
    fx.schud(7, 0.5)
    fx.flitsScherm('#ff3ec8', 0.2)
    particles.pop(this.midX, this.midY, '#ff3ec8', 28)
    this._begin('schieten', 1)
  }

  _sterf(particles, fx) {
    this.staat = 'dood'
    this.timer = 2.4
    this.leeft = false
    this.zwaartekrachtOm = false
    this.ballen.length = 0
    fx.schud(9, 1)
    sfx.vijandDood()
    particles.pop(this.midX, this.midY, '#3ef0ff', 44)
  }

  raaktSpeler(lichaam) {
    if (this.staat === 'dood') return false
    const l = this.lichaam
    return lichaam.x < l.x + l.w && lichaam.x + lichaam.w > l.x
      && lichaam.y < l.y + l.h && lichaam.y + lichaam.h > l.y
  }

  _frame() {
    if (this.staat === 'dood') return Math.min(9, 7 + Math.floor((2.4 - this.timer) * 1.4))
    if (this.staat === 'gewond') return 6
    if (this.open) return 4 + (Math.floor(this.tijd * 6) % 2)
    return Math.floor(this.tijd * 5) % 4
  }

  teken(ctx, camX, camY) {
    for (const b of this.ballen) b.teken(ctx, camX, camY)
    if (this.onkwetsbaar > 0 && Math.floor(this.onkwetsbaar * 14) % 2 === 0) return

    const blad = kernBlad(this.palet, this.fase)
    blad.teken(ctx, this._frame(),
      Math.round(this.midX - KERN.w / 2 - camX),
      Math.round(this.midY - KERN.h / 2 - camY))

    if (this.kwetsbaar > 0) {
      ctx.globalAlpha = 0.28 + Math.sin(this.tijd * 22) * 0.12
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(Math.round(this.midX - 10 - camX), Math.round(this.lichaam.y - camY), 20, 6)
      ctx.globalAlpha = 1
    }
  }
}

// --- De Verslinder (wereld 5) -----------------------------------------------
// De eindbaas. Elke fase leent een mechanic uit een eerdere wereld:
//   fase 1 — springen en landen met een schokgolf, als de Slijmkoningin
//   fase 2 — de zwaartekracht omdraaien, als de Kern-AI
//   fase 3 — allebei, sneller, plus een spervuur
// Na elke aanvalsronde gaat de muil open; dat is het enige moment om te raken.

const VERSLINDER_LEVENS_PER_FASE = 3

export class Verslinder {
  constructor(x, y, palet, arena) {
    this.palet = palet
    this.arena = arena
    this.grondY = y + TEGEL
    // De sprite is 96×96, de raakbox een stuk kleiner: alleen de muil telt.
    // 44 hoog, zodat hij bij het openen precies op de vloer komt te staan en de
    // stamphoogte klopt (zie update).
    this.lichaam = new Lichaam(x - 18, this.grondY - 110, 52, 44)
    this.thuisY = this.lichaam.y

    this.fase = 1
    this.levens = VERSLINDER_LEVENS_PER_FASE
    this.maxTotaal = VERSLINDER_LEVENS_PER_FASE * 3
    this.geraaktTotaal = 0

    this.staat = 'intro'
    this.timer = 2.2
    this.tijd = 0
    this.onkwetsbaar = 0
    this.kwetsbaar = 0
    this.leeft = true
    this.klaar = false
    this.stampbaar = true
    this.zwaartekrachtOm = false
    this.ronde = 0

    this.ballen = []
    this.golven = []
    this.kinderen = []
  }

  get midX() { return this.lichaam.midX }
  get midY() { return this.lichaam.midY }
  get deel() { return (this.maxTotaal - this.geraaktTotaal) / this.maxTotaal }
  get open() { return this.staat === 'open' }

  update(dt, map, speler, particles, fx) {
    this.tijd += dt
    if (this.onkwetsbaar > 0) this.onkwetsbaar -= dt
    if (this.kwetsbaar > 0) this.kwetsbaar -= dt

    for (const b of this.ballen) b.update(dt, map)
    this.ballen = this.ballen.filter((b) => b.leeft)
    for (const g of this.golven) g.update(dt, this.arena)
    this.golven = this.golven.filter((g) => g.leeft)

    if (this.staat === 'dood') {
      this.timer -= dt
      this.zwaartekrachtOm = false
      if (this.timer <= 0) this.klaar = true
      return
    }

    this.timer -= dt

    // Zweeft altijd in het midden, met een brede slinger; als de muil opengaat
    // zakt hij tot springhoogte.
    // Zie de Kern-AI hierboven: hij hing met 70 pixels boven de vloer buiten
    // springbereik en was dus niet te verslaan. Nu zakt hij tot 44 en staat de
    // zwaai tijdens het openen stil, zodat de eindbaas een eerlijk doel is.
    const midden = (this.arena.links + this.arena.rechts) / 2
    const zwaai = this.open ? 0 : Math.sin(this.tijd * 1.1) * 70
    const doelX = midden - this.lichaam.w / 2 + zwaai
    this.lichaam.x += (doelX - this.lichaam.x) * Math.min(1, dt * 3.4)
    const doelY = this.open ? this.grondY - 44 : this.thuisY
    this.lichaam.y += (doelY - this.lichaam.y) * Math.min(1, dt * 2.6)

    switch (this.staat) {
      case 'intro':
        if (this.timer <= 0) this._begin('aanval', 0.8)
        break

      case 'aanval':
        if (this.timer <= 0) {
          this._vuur(speler, particles, fx)
          this.ronde++
          const rondes = this.fase === 3 ? 4 : 3
          if (this.ronde >= rondes) {
            this.ronde = 0
            this.zwaartekrachtOm = false
            this._begin('open', this.fase === 3 ? 1.6 : 2.2)
            this.kwetsbaar = this.timer
            sfx.portaal()
          } else {
            this._begin('aanval', this.fase === 3 ? 0.75 : 1.1)
            // Vanaf fase 2 draait hij tussen de aanvallen door de zwaartekracht
            // om; in fase 3 gebeurt dat elke ronde.
            if (this.fase >= 2) this.zwaartekrachtOm = !this.zwaartekrachtOm
          }
        }
        break

      case 'open':
        if (this.timer <= 0) this._begin('aanval', 0.9)
        break

      case 'gewond':
        if (this.timer <= 0) {
          if (this.levens <= 0) this._volgendeFase(particles, fx)
          else this._begin('aanval', 1)
        }
        break

      default:
        break
    }
  }

  _begin(staat, t) { this.staat = staat; this.timer = t }

  _vuur(speler, particles, fx) {
    const doelX = speler?.midX ?? this.midX
    // Schokgolven over de vloer (wereld 3) plus projectielen (wereld 1 en 4).
    if (this.fase === 1 || this.fase === 3) {
      this.golven.push(new Schokgolf(this.midX - 24, this.grondY, -1, 140))
      this.golven.push(new Schokgolf(this.midX + 24, this.grondY, 1, 140))
      fx.schud(4, 0.25)
      particles.landing(this.midX, this.grondY)
    }
    const hoeken = this.fase === 3 ? [-1.2, -0.4, 0.4, 1.2] : this.fase === 2 ? [-0.8, 0.8] : [0]
    for (const h of hoeken) {
      const dx = doelX - this.midX
      this.ballen.push(new Slijmbal(
        this.midX, this.lichaam.onder - 8,
        Math.max(-200, Math.min(200, dx * 1.2)) + h * 70, 30,
        this.palet,
      ))
    }
    sfx.laser()
  }

  opStamp(particles, fx) {
    if (this.onkwetsbaar > 0 || this.staat === 'dood') return false
    if (this.kwetsbaar <= 0 || !this.open) return false
    this.levens--
    this.geraaktTotaal++
    this.onkwetsbaar = 1
    this.staat = 'gewond'
    this.timer = 0.7
    this.kwetsbaar = 0
    this.zwaartekrachtOm = false
    sfx.baasHit()
    fx.schud(7, 0.35)
    fx.hitStop(0.12)
    fx.flitsScherm('#ffffff', 0.1)
    particles.pop(this.midX, this.midY, '#e0a8ff', 28)
    return true
  }

  _volgendeFase(particles, fx) {
    if (this.fase >= 3) { this._sterf(particles, fx); return }
    this.fase++
    this.levens = VERSLINDER_LEVENS_PER_FASE
    this.ronde = 0
    fx.schud(8, 0.6)
    fx.flitsScherm('#a45cff', 0.25)
    particles.pop(this.midX, this.midY, '#a45cff', 34)
    this._begin('aanval', 1.2)
  }

  _sterf(particles, fx) {
    this.staat = 'dood'
    this.timer = 3
    this.leeft = false
    this.ballen.length = 0
    this.golven.length = 0
    fx.schud(10, 1.4)
    sfx.vijandDood()
    particles.pop(this.midX, this.midY, '#ffffff', 60)
  }

  raaktSpeler(lichaam) {
    if (this.staat === 'dood') return false
    const l = this.lichaam
    return lichaam.x < l.x + l.w && lichaam.x + lichaam.w > l.x
      && lichaam.y < l.y + l.h && lichaam.y + lichaam.h > l.y
  }

  _frame() {
    if (this.staat === 'dood') return Math.min(9, 7 + Math.floor((3 - this.timer) * 1.2))
    if (this.staat === 'gewond') return 6
    if (this.open) return 4 + (Math.floor(this.tijd * 6) % 2)
    return Math.floor(this.tijd * 5) % 4
  }

  teken(ctx, camX, camY) {
    for (const g of this.golven) g.teken(ctx, camX, camY)
    for (const b of this.ballen) b.teken(ctx, camX, camY)
    if (this.onkwetsbaar > 0 && Math.floor(this.onkwetsbaar * 14) % 2 === 0) return

    const blad = verslinderBlad(this.palet, this.fase)
    blad.teken(ctx, this._frame(),
      Math.round(this.midX - VERSLINDER.w / 2 - camX),
      Math.round(this.midY - VERSLINDER.h / 2 - camY))

    if (this.kwetsbaar > 0) {
      ctx.globalAlpha = 0.3 + Math.sin(this.tijd * 22) * 0.12
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(Math.round(this.midX - 14 - camX), Math.round(this.lichaam.y + 6 - camY), 28, 7)
      ctx.globalAlpha = 1
    }
  }
}

export const BAAS_KLASSEN = {
  slijmkoningin: Slijmkoningin,
  ijsworm: IJsworm,
  magmatitaan: Magmatitaan,
  kernai: KernAI,
  verslinder: Verslinder,
}
