// Bazen. Drie fases, elk met een eigen aanvalspatroon en een duidelijk moment
// waarop je kunt raken — bij de Slijmkoningin is dat de landing, waarna ze even
// plat blijft liggen.

import { Lichaam, beweeg } from '../engine/physics.js'
import { TEGEL } from '../engine/tilemap.js'
import {
  koninginBlad, slijmbalBlad, KONINGIN, SLIJMBAL, KON_FRAME,
  ijswormBlad, tekenWormSegment, tekenWormSpoor, tekenWormBarst, WORMKOP,
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

export const BAAS_KLASSEN = { slijmkoningin: Slijmkoningin, ijsworm: IJsworm }
