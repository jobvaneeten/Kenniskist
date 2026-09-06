// De speler. Alle getallen die het bewegingsgevoel bepalen staan in
// engine/physics.js (BASIS) en worden hier vermenigvuldigd met de modifiers van
// het gekozen character.

import { BASIS, Lichaam, beweeg, grondSoort, hoekCorrectie, klem, naar, raaktDodelijk } from '../engine/physics.js'
import { T, TEGEL } from '../engine/tilemap.js'
import { bakCharacter, frameVan, BOX, FRAME_W, FRAME_H } from '../art/personage.js'
import { characterOf, modVan } from '../data/characters.js'
import { sfx } from '../audio/sfx.js'

function vormVan(id) {
  const c = characterOf(id)
  return { kleuren: c.kleuren, vorm: c.vorm }
}

export const STAAT = {
  NORMAAL: 'normaal',
  GERAAKT: 'geraakt',
  DOOD: 'dood',
  WINNEN: 'winnen',
  INTRO: 'intro',
}

export class Speler {
  constructor(characterId, x, y) {
    this.characterId = characterId
    this.mod = modVan(characterId)
    this.kunst = bakCharacter({ id: characterId, ...vormVan(characterId) })
    this.lichaam = new Lichaam(x + (TEGEL - BOX.w) / 2, y - BOX.h + TEGEL, BOX.w, BOX.h)

    this.kijktRechts = true
    this.staat = STAAT.NORMAAL
    this.animTijd = 0
    this.animNaam = 'idle'

    this.coyote = 0
    this.buffer = 0
    this.springtNog = false
    this.luchtsprongOver = 0
    this.landTimer = 0
    this.onkwetsbaar = 0
    this.staatTimer = 0

    this.levens = 3 + this.mod.levens
    this.maxLevens = 5
    this.powerup = null // { soort, tijd, duur }
    this.schild = false
    this.jetpackBrandstof = 0
    this.spoorTimer = 0
  }

  get x() { return this.lichaam.x }
  get y() { return this.lichaam.y }
  get midX() { return this.lichaam.midX }
  get midY() { return this.lichaam.midY }

  zetPositie(x, y) {
    this.lichaam.x = x
    this.lichaam.y = y
    this.lichaam.vx = 0
    this.lichaam.vy = 0
    this.lichaam.opPlatform = null
  }

  // --- Update --------------------------------------------------------------

  update(dt, invoer, map, particles) {
    this.animTijd += dt
    this.staatTimer += dt
    if (this.onkwetsbaar > 0) this.onkwetsbaar -= dt
    if (this.landTimer > 0) this.landTimer -= dt
    this._updatePowerup(dt)

    if (this.staat === STAAT.DOOD) return this._updateDood(dt)
    if (this.staat === STAAT.WINNEN) return this._updateWinnen(dt, map)
    if (this.staat === STAAT.GERAAKT) {
      // Korte terugstoot; besturing ligt even stil zodat de klap voelbaar is.
      if (this.staatTimer > 0.3) this.staat = STAAT.NORMAAL
      this._physics(dt, map, 0, false, particles)
      return
    }

    const as = invoer.as
    const rent = invoer.ingedrukt('ren')
    if (as !== 0) this.kijktRechts = as > 0

    // Sprongbuffer en coyote time: allebei ~6 frames. Zonder deze twee voelt
    // elke gemiste sprong als een fout van het spel in plaats van van jou.
    if (invoer.netIngedrukt('spring')) this.buffer = BASIS.buffer
    if (this.buffer > 0) this.buffer -= dt
    if (this.lichaam.opGrond) {
      this.coyote = BASIS.coyote
      this.luchtsprongOver = this.mod.luchtsprong
    } else if (this.coyote > 0) {
      this.coyote -= dt
    }

    if (this.buffer > 0 && this.coyote > 0) {
      this._spring(particles)
    } else if (this.buffer > 0 && this.luchtsprongOver > 0) {
      this.luchtsprongOver--
      this.buffer = 0
      this.lichaam.vy = -BASIS.sprong * this.mod.sprong * 0.72
      particles.sparkle(this.midX, this.midY + 6, '#ffffff')
      sfx.spring()
    }

    // Variabele spronghoogte: loslaten kapt de opwaartse snelheid af.
    if (this.springtNog && !invoer.ingedrukt('spring')) {
      this.springtNog = false
      if (this.lichaam.vy < -BASIS.sprongAfkap) this.lichaam.vy = -BASIS.sprongAfkap
    }
    if (this.lichaam.vy >= 0) this.springtNog = false

    // Door een one-way platform zakken.
    if (invoer.ingedrukt('omlaag') && invoer.netIngedrukt('spring') && this.lichaam.opGrond) {
      this.lichaam.negeerPlatform = 0.2
      this.lichaam.y += 1
    }

    // Jetpack: zolang je springen ingedrukt houdt en er brandstof is.
    if (this.powerup?.soort === 'jetpack' && invoer.ingedrukt('spring') && this.jetpackBrandstof > 0 && !this.lichaam.opGrond) {
      this.jetpackBrandstof -= dt
      this.lichaam.vy = Math.max(this.lichaam.vy - 900 * dt, -180)
      particles.spuit(this.midX + (Math.random() - 0.5) * 6, this.lichaam.onder - 2, {
        vx: (Math.random() - 0.5) * 30, vy: 60 + Math.random() * 60,
        duur: 0.24, kleur: Math.random() > 0.5 ? '#ffd76b' : '#ff8c1a', zwaarte: 40,
      })
    }

    this._physics(dt, map, as, rent, particles)
    this._kiesAnimatie(as, rent)

    if (this.mod.spoor) {
      this.spoorTimer -= dt
      if (this.spoorTimer <= 0 && (Math.abs(this.lichaam.vx) > 20 || !this.lichaam.opGrond)) {
        this.spoorTimer = 0.045
        particles.spoorPunt(this.midX, this.midY, '#ffe9a8')
      }
    }
  }

  _spring(particles) {
    this.lichaam.vy = -BASIS.sprong * this.mod.sprong
    this.lichaam.opGrond = false
    this.lichaam.opPlatform = null
    this.coyote = 0
    this.buffer = 0
    this.springtNog = true
    particles.stof(this.midX, this.lichaam.onder - 1)
    sfx.spring()
  }

  _physics(dt, map, as, rent, particles) {
    const l = this.lichaam
    const soort = grondSoort(l, map)
    const opIjs = soort === T.IJS && !this.mod.ijsGrip

    const speedboost = this.powerup?.soort === 'speedboots' ? 1.3 : 1
    const top = (rent ? BASIS.ren * this.mod.ren : BASIS.loop * this.mod.loop) * speedboost
    const accel = (l.opGrond ? BASIS.accelGrond : BASIS.accelLucht) * this.mod.acceleratie * (opIjs ? 0.35 : 1)
    const wrijving = (l.opGrond ? (opIjs ? BASIS.ijsWrijving : BASIS.wrijvingGrond) : BASIS.wrijvingLucht) * this.mod.wrijving

    if (as !== 0) {
      // Tegen de looprichting in remmen gaat sneller dan optrekken: dat maakt
      // richting wisselen scherp zonder dat de topsnelheid raar wordt.
      const tegen = Math.sign(l.vx) !== 0 && Math.sign(l.vx) !== as
      l.vx = naar(l.vx, as * top, (accel + (tegen ? wrijving * 0.5 : 0)) * dt)
    } else {
      l.vx = naar(l.vx, 0, wrijving * dt)
    }

    // Lopende band duwt mee.
    if (soort === T.BAND_RECHTS) l.vx += BASIS.duwSnelheid * dt * 4
    if (soort === T.BAND_LINKS) l.vx -= BASIS.duwSnelheid * dt * 4

    const g = (l.vy < 0 ? BASIS.zwaartekrachtOp : BASIS.zwaartekrachtNeer * this.mod.valZwaartekracht)
    l.vy = Math.min(l.vy + g * dt, BASIS.maxVal * this.mod.maxVal)

    const wasInLucht = !l.opGrond
    const vorigeVy = l.vy
    const resultaat = beweeg(l, map, dt)
    hoekCorrectie(l, map)

    if (resultaat.grondGeraakt && wasInLucht && vorigeVy > 120) {
      const kracht = klem(vorigeVy / BASIS.maxVal, 0.3, 1)
      particles.landing(this.midX, l.onder)
      sfx.land(kracht)
      this.landTimer = 0.14
    }
    // Blokken van onderaf raken.
    for (const kop of resultaat.koppen) {
      if (map.onthul(kop.tx, kop.ty)) { sfx.capsule(); particles.sparkle(kop.tx * TEGEL + 8, kop.ty * TEGEL + 8, '#ffd23f') }
      else if (map.sloop(kop.tx, kop.ty)) {
        sfx.blokKapot()
        particles.pop(kop.tx * TEGEL + 8, kop.ty * TEGEL + 8, '#8a7a6a', 10)
      }
    }
    if (l.opGrond && Math.abs(l.vx) > 60) sfx.stap()
  }

  _kiesAnimatie(as, rent) {
    const l = this.lichaam
    let naam
    if (!l.opGrond) naam = l.vy < 0 ? 'springen' : 'vallen'
    else if (this.landTimer > 0) naam = 'landen'
    else if (Math.abs(l.vx) > 8) naam = rent && Math.abs(l.vx) > BASIS.loop * 0.9 ? 'rennen' : 'lopen'
    else naam = 'idle'
    if (naam !== this.animNaam) {
      this.animNaam = naam
      this.animTijd = 0
    }
  }

  _updateDood(dt) {
    // Korte doodanimatie: omhoog en dan uit beeld. Snel, want herstarten moet
    // binnen een seconde kunnen.
    this.lichaam.vy += BASIS.zwaartekrachtNeer * 0.7 * dt
    this.lichaam.y += this.lichaam.vy * dt
    this.animNaam = 'dood'
  }

  _updateWinnen(dt, map) {
    this.lichaam.vx = naar(this.lichaam.vx, 0, BASIS.wrijvingGrond * dt)
    this.lichaam.vy = Math.min(this.lichaam.vy + BASIS.zwaartekrachtNeer * dt, BASIS.maxVal)
    beweeg(this.lichaam, map, dt)
    this.animNaam = 'winnen'
  }

  _updatePowerup(dt) {
    if (!this.powerup) return
    this.powerup.tijd += dt
    if (this.powerup.duur && this.powerup.tijd >= this.powerup.duur) this.powerup = null
    if (this.powerup?.soort === 'jetpack' && this.jetpackBrandstof <= 0) this.powerup = null
  }

  // --- Interactie ----------------------------------------------------------

  geefPowerup(soort) {
    sfx.powerup()
    if (soort === 'leven') {
      this.levens = Math.min(this.maxLevens, this.levens + 1)
      return
    }
    if (soort === 'schild') { this.schild = true; this.powerup = { soort, tijd: 0, duur: 0 }; return }
    if (soort === 'jetpack') { this.jetpackBrandstof = 2.2; this.powerup = { soort, tijd: 0, duur: 0 }; return }
    this.powerup = { soort, tijd: 0, duur: soort === 'magneet' ? 9 : 7 }
  }

  get magneetBereik() {
    const basis = this.mod.magneet
    return this.powerup?.soort === 'magneet' ? Math.max(basis, 72) : basis
  }

  stamp(hoogGehouden) {
    this.lichaam.vy = -(hoogGehouden ? BASIS.stampBounceHoog : BASIS.stampBounce) * this.mod.stampBounce
    this.springtNog = hoogGehouden
    this.coyote = 0
  }

  veerStuiter() {
    this.lichaam.vy = -BASIS.sprong * 1.42
    this.springtNog = true
    sfx.veer()
  }

  // Geeft terug of de klap doorkwam (false = schild of onkwetsbaar).
  raak(vanX, fx) {
    if (this.onkwetsbaar > 0 || this.staat !== STAAT.NORMAAL) return false
    if (this.schild) {
      this.schild = false
      if (this.powerup?.soort === 'schild') this.powerup = null
      this.onkwetsbaar = 0.9
      sfx.schade()
      fx.flitsScherm('#3ef0ff', 0.1)
      return false
    }
    this.levens--
    this.staat = STAAT.GERAAKT
    this.staatTimer = 0
    this.onkwetsbaar = 1.5 * this.mod.onkwetsbaar
    this.lichaam.vx = (this.midX < vanX ? -1 : 1) * 130
    this.lichaam.vy = -170
    this.powerup = null
    sfx.schade()
    fx.schud(4, 0.25)
    fx.flitsScherm('#ff6b6b', 0.12)
    fx.hitStop(0.06)
    return true
  }

  sterf(fx) {
    if (this.staat === STAAT.DOOD) return
    this.staat = STAAT.DOOD
    this.staatTimer = 0
    this.animTijd = 0
    this.lichaam.vy = -240
    this.lichaam.vx = 0
    this.levens--
    sfx.dood()
    fx.schud(3, 0.2)
  }

  win() {
    if (this.staat === STAAT.WINNEN) return
    this.staat = STAAT.WINNEN
    this.staatTimer = 0
    this.animTijd = 0
  }

  controleerGevaar(map, fx) {
    if (this.staat !== STAAT.NORMAAL) return
    const t = raaktDodelijk(this.lichaam, map)
    if (!t) return
    if (t === T.LAVA) { this.sterf(fx); return }
    this.raak(this.midX, fx)
  }

  // --- Tekenen -------------------------------------------------------------

  teken(ctx, camX, camY) {
    // Knipperen tijdens onkwetsbaarheid: 6 keer per seconde aan/uit.
    if (this.onkwetsbaar > 0 && Math.floor(this.onkwetsbaar * 12) % 2 === 0) return
    const anim = this.kunst.animaties[this.animNaam] ?? this.kunst.animaties.idle
    const eenmalig = this.animNaam === 'landen' || this.animNaam === 'dood'
    const frame = frameVan(anim, this.animTijd, !eenmalig)
    const x = Math.round(this.lichaam.x - BOX.dx - camX)
    const y = Math.round(this.lichaam.y - BOX.dy - camY)
    anim.blad.teken(ctx, frame, x, y, !this.kijktRechts)
  }

  // Voor de winkel en de wereldkaart: los tekenen op een gegeven plek.
  static tekenStil(ctx, kunst, animNaam, tijd, x, y, gespiegeld = false) {
    const anim = kunst.animaties[animNaam] ?? kunst.animaties.idle
    anim.blad.teken(ctx, frameVan(anim, tijd), Math.round(x), Math.round(y), gespiegeld)
  }
}

export { FRAME_W, FRAME_H }
