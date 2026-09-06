// De levelscène: alles wat er tijdens het spelen gebeurt.

import { Tilemap, TEGEL } from '../engine/tilemap.js'
import { BASIS } from '../engine/physics.js'
import { TileRenderer } from '../engine/tilerender.js'
import { Camera } from '../core/camera.js'
import { Speler, STAAT } from '../entities/speler.js'
import { maakVijand } from '../entities/vijanden.js'
import { Munt, Veer, Checkpoint, Finish, Capsule, Hintbord, muntBlad, MUNT } from '../entities/items.js'
import { BewegendPlatform, ValPlatform, ZinkPlatform } from '../entities/platforms.js'
import { Geiser, StijgendeLava, Laser, Sleutel, Portaal, Zwaartekrachtplaat } from '../entities/gevaren.js'
import { BAAS_KLASSEN } from '../entities/bazen.js'
import { tekenLevensbalk } from '../art/bazen.js'
import { achtergrond, tekenAchtergrond, tekenVoorgrond, tekenSfeer, updateDeeltjes } from '../art/achtergrond.js'
import { tekenBarst } from '../art/tegels.js'
import { tekenWind } from '../art/objecten2.js'
import { tekenLavaVlak, tekenHitte } from '../art/objecten3.js'
import { tekenZeroG } from '../art/objecten4.js'
import { paletVoorWereld, UI } from '../art/palet.js'
import { tekenHud, tekenVliegers, tekenHint } from '../ui/hud.js'
import { tekstMiddenSchaduw, tekstMidden } from '../ui/font.js'
import { paneel, Menu } from '../ui/panelen.js'
import { T as TXT } from '../data/texts.nl.js'
import { ontleedLevelId } from '../data/werelden.js'
import { muziek, sfx } from '../audio/sfx.js'
import { opslag } from '../core/save-adapter.js'
import { BREEDTE, HOOGTE } from '../art/achtergrond.js'

const RESPAWN_VERTRAGING = 0.85

export class LevelScene {
  constructor(spel, level) {
    this.spel = spel
    this.level = level
    const ontleed = ontleedLevelId(level.id)
    this.wereldNr = ontleed?.wereld ?? 1
    this.palet = paletVoorWereld(this.wereldNr)

    this.map = new Tilemap(level)
    this.renderer = new TileRenderer(this.map, this.palet)
    this.ag = achtergrond(this.palet)
    this.camera = new Camera(BREEDTE, HOOGTE)
    this.camera.grenzen(this.map.breedtePx, this.map.hoogtePx)

    this.muntBlad = muntBlad(false)
    this.geestBlad = muntBlad(true)

    this.tijd = 0
    this.levensVerloren = 0
    this.pauze = false
    this.pauzeMenu = new Menu([
      { label: TXT.pauze.verder },
      { label: TXT.pauze.opnieuw },
      { label: TXT.pauze.instellingen },
      { label: TXT.pauze.kaart },
    ])
    this.gameOver = false
    this.gameOverTimer = 0
    this.respawnTimer = 0
    this.klaar = false
    this.klaarTimer = 0
    this.vliegers = []
    this.muntReeks = 0
    this.introTimer = 0.6
    // Wind: wisselt van richting op een vaste cadans, zodat het ritme te leren
    // is. `kracht` is de topsnelheid van de duw in pixels per seconde.
    this.wind = level.wind ? { kracht: 0, ...level.wind } : null

    this._bouw()
  }

  // --- Opbouw --------------------------------------------------------------

  _bouw() {
    opslag.startPoging(this.level.id)

    this.speler = new Speler(opslag.uitgerust, this.map.start.x, this.map.start.y)
    this.spawn = { x: this.speler.x, y: this.speler.y }

    this.munten = this.map.munten.map((m) => new Munt(m.x, m.y, m.index, opslag.isGeest(this.level.id, m.index)))
    this.muntenTotaal = this.munten.length
    this.alVerzameld = this.munten.filter((m) => m.geest).length

    this.vijanden = this.map.entiteiten
      .filter((e) => e.type === 'vijand')
      .map((e) => maakVijand(e.soort, e.x, e.y, this.palet, e))

    this.veren = this.map.entiteiten.filter((e) => e.type === 'veer').map((e) => new Veer(e.x, e.y, this.palet))
    this.checkpoints = this.map.checkpoints.map((c) => new Checkpoint(c.x, c.y, this.palet))
    this.finish = new Finish(this.map.finish.x, this.map.finish.y, this.palet)

    this.capsules = this.map.entiteiten
      .filter((e) => e.type === 'capsule')
      .map((e, i) => new Capsule(e.x, e.y, this.palet, this.level.capsules?.[i] ?? Capsule.soortVoor(i)))

    this.platforms = this.map.entiteiten
      .filter((e) => e.type === 'platform')
      .map((e, i) => new BewegendPlatform(e.x, e.y, this.palet, {
        richting: e.richting,
        afstand: this.level.platformAfstand?.[i] ?? 3,
        breedte: this.level.platformBreedte?.[i] ?? 48,
        fase: i * 0.7,
      }))
    this.valplatforms = this.map.entiteiten
      .filter((e) => e.type === 'valplatform')
      .map((e) => new ValPlatform(e.x, e.y, this.palet, { breedte: 32 }))
    this.zinkplatforms = this.map.entiteiten
      .filter((e) => e.type === 'zinkplatform')
      .map((e, i) => new ZinkPlatform(e.x, e.y, this.palet, {
        breedte: this.level.zinkBreedte?.[i] ?? 48,
        maxDiepte: this.level.zinkDiepte?.[i] ?? 4,
      }))
    this.geisers = this.map.entiteiten
      .filter((e) => e.type === 'geiser')
      .map((e, i) => new Geiser(e.x, e.y, this.palet, {
        ...(this.level.geisers?.[i] ?? {}),
        fase: this.level.geisers?.[i]?.fase ?? (i % 3) / 3,
      }))
    this.lava = this.level.lava ? new StijgendeLava(this.level.lava) : null
    this.lasers = this.map.entiteiten
      .filter((e) => e.type === 'laser')
      .map((e, i) => new Laser(e.x, e.y, this.palet, {
        richting: e.richting,
        ...(this.level.lasers?.[i] ?? {}),
        fase: this.level.lasers?.[i]?.fase ?? (i % 2) / 2,
      }))
    this.sleutels = this.map.entiteiten
      .filter((e) => e.type === 'sleutel')
      .map((e) => new Sleutel(e.x, e.y))
    // Portalen: twee op volgorde vormen een paar.
    this.portalen = this.map.entiteiten
      .filter((e) => e.type === 'portaal')
      .map((e, i) => new Portaal(e.x, e.y, Math.floor(i / 2)))
    for (let i = 0; i + 1 < this.portalen.length; i += 2) {
      this.portalen[i].partner = this.portalen[i + 1]
      this.portalen[i + 1].partner = this.portalen[i]
    }
    this.zwaarteplaten = this.map.entiteiten
      .filter((e) => e.type === 'zwaartekracht')
      .map((e) => new Zwaartekrachtplaat(e.x, e.y, this.palet))

    // Zones zonder zwaartekracht, in tegels: [x0, y0, x1, y1].
    this.zeroG = (this.level.zerog ?? []).map(([x0, y0, x1, y1]) => ({
      x: x0 * TEGEL, y: y0 * TEGEL, w: (x1 - x0 + 1) * TEGEL, h: (y1 - y0 + 1) * TEGEL,
    }))

    this.hints = this.map.hints.map((h) => new Hintbord(h.x, h.y, h.tekst, this.palet))

    // Baas: de finish blijft dicht tot ze verslagen is.
    this.baas = null
    const baasPlek = this.map.entiteiten.find((e) => e.type === 'baas')
    if (this.level.baas && baasPlek) {
      const Klasse = BAAS_KLASSEN[this.level.baas]
      if (Klasse) {
        // De ruwe tegelpositie; elke baas lijnt zichzelf uit op het oppervlak,
        // want de een staat erop en de ander komt eruit.
        this.baas = new Klasse(baasPlek.x, baasPlek.y, this.palet, {
          links: 2 * TEGEL,
          rechts: this.map.breedtePx - 2 * TEGEL,
        })
      }
    }

    this.speler.zwaartekrachtOm = !!this.level.omgekeerdStart
    this.omkeerTimer = 0
    this.camera.spring(this.speler.midX, this.speler.midY)
  }

  binnen() {
    muziek.speel(this.level.muziek ?? `w${this.wereldNr}`)
  }

  buiten() {
    opslag.vergeetPoging()
  }

  // --- Update --------------------------------------------------------------

  update(dt) {
    const invoer = this.spel.invoer
    const fx = this.spel.fx

    if (this.pauze) return this._updatePauze(invoer)

    if (invoer.netIngedrukt('pauze') && !this.klaar && !this.gameOver) {
      this.pauze = true
      this.pauzeMenu.index = 0
      muziek.pauzeer()
      sfx.uiKiezen()
      return
    }

    // Hit-stop: alles staat even stil na een rake klap.
    if (fx.stop > 0) { fx.stop -= dt; fx.update(dt); return }

    if (this.introTimer > 0) this.introTimer -= dt

    fx.update(dt)
    updateDeeltjes(this.ag, dt)
    this.spel.particles.update(dt)
    this._updateVliegers(dt)

    if (this.gameOver) {
      this.gameOverTimer += dt
      if (this.gameOverTimer > 0.7 && invoer.netIngedrukt('bevestig')) this._herstartNaGameOver()
      return
    }

    if (this.klaar) {
      this.klaarTimer += dt
      this.speler.update(dt, invoer, this.map, this.spel.particles)
      this.camera.doelZoom = 1
      this.camera.volg({ x: this.speler.midX, y: this.speler.midY }, dt, 0)
      this.finish.update(dt)
      if (this.klaarTimer > 1.4) this._naarResultaten()
      return
    }

    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt
      this.speler.update(dt, invoer, this.map, this.spel.particles)
      if (this.respawnTimer <= 0) this._respawn()
      return
    }

    this.tijd += dt
    this.map.updateTegels(dt)
    this._updateWind(dt)
    this._updateOmkeer(dt)

    // Platforms eerst: de speler die erop staat moet mee vóórdat hij zelf
    // beweegt, anders zakt hij er elk frame een pixel in.
    for (const p of this.platforms) p.update(dt)
    for (const p of this.valplatforms) p.update(dt)
    for (const p of this.zinkplatforms) p.update(dt)
    for (const gz of this.geisers) gz.update(dt)
    for (const la of this.lasers) la.update(dt, this.map)
    for (const sl of this.sleutels) sl.update(dt)
    for (const po of this.portalen) po.update(dt)
    for (const zp of this.zwaarteplaten) zp.update(dt)
    this._updateZeroG()
    if (this.lava) this.lava.update(dt)
    this._draagSpeler()

    this.speler.update(dt, invoer, this.map, this.spel.particles)
    this._blokkenGeraakt()
    this._controleerBroos()
    // Kapotte en onthulde blokken: de betreffende chunk opnieuw laten bakken.
    while (this.map.veranderd.length) {
      const [tx, ty] = this.map.veranderd.pop()
      this.renderer.markeer(tx, ty)
    }

    for (const v of this.vijanden) v.update(dt, this.map, this.speler)
    if (this.baas) {
      this.baas.update(dt, this.map, this.speler, this.spel.particles, fx)
      // De Kern-AI keert de zwaartekracht om terwijl zijn schild dicht is.
      if (this.baas.zwaartekrachtOm !== undefined) {
        this.speler.zwaartekrachtOm = this.baas.zwaartekrachtOm
      }
    }
    for (const v of this.veren) v.update(dt)
    for (const c of this.checkpoints) c.update(dt)
    for (const c of this.capsules) c.update(dt)
    for (const h of this.hints) h.update(dt, this.speler)
    this.finish.update(dt)

    for (const m of this.munten) m.update(dt, this.speler, this.speler.magneetBereik)

    if (this.speler.staat === STAAT.NORMAAL || this.speler.staat === STAAT.GERAAKT) {
      this._botsingen()
      this.speler.controleerGevaar(this.map, fx)
      if (this.lava?.raakt(this.speler.lichaam)) this.speler.sterf(fx)
      if (this.speler.lichaam.boven > this.map.hoogtePx + 40) this.speler.sterf(fx)
    }

    if (this.speler.staat === STAAT.DOOD && this.respawnTimer <= 0) {
      this.respawnTimer = RESPAWN_VERTRAGING
      if (this.speler.levens <= 0) this._naarGameOver()
    }

    const richting = this.speler.lichaam.vx / 120
    this.camera.volg({ x: this.speler.midX, y: this.speler.midY }, dt, Math.max(-1, Math.min(1, richting)))
  }

  _updatePauze(invoer) {
    const keuze = this.pauzeMenu.update(invoer)
    if (invoer.netIngedrukt('pauze')) { this._hervat(); return }
    if (keuze === 0) this._hervat()
    else if (keuze === 1) this.spel.herstartLevel()
    else if (keuze === 2) this.spel.openInstellingen(() => {})
    else if (keuze === 3) this.spel.naarKaart()
  }

  _hervat() {
    this.pauze = false
    muziek.hervat()
    this.spel.lus.hervat()
  }

  // Wind duwt de speler opzij. Een sinus in plaats van een blokgolf: de vlaag
  // zwelt hoorbaar en zichtbaar aan, zodat je hem kunt zien aankomen.
  _updateWind(dt) {
    if (!this.wind) return
    const w = this.wind
    const fase = (this.tijd / w.periode) * Math.PI * 2
    // bias = de vaste component (-1 is altijd naar links), variatie = hoeveel
    // de vlaag daaromheen slingert. Zo is met dezelfde code zowel een constante
    // tegenwind als een op- en afzwellende vlaag te maken.
    w.kracht = ((w.bias ?? 0) + Math.sin(fase) * (w.variatie ?? 1)) * w.sterkte
    if (this.speler.staat === STAAT.NORMAAL) {
      this.speler.lichaam.vx += w.kracht * dt * 3.2
    }
  }

  // Zero-g: binnen een zone valt de zwaartekracht bijna weg, zodat je door de
  // ruimte zweeft in plaats van te vallen. De speler leest de schaal zelf uit.
  _updateZeroG() {
    if (this.zeroG.length === 0) return
    const l = this.speler.lichaam
    const binnen = this.zeroG.some((z) => l.midX > z.x && l.midX < z.x + z.w
      && l.midY > z.y && l.midY < z.y + z.h)
    this.speler.zwaartekrachtSchaal = binnen ? 0.12 : 1
    this.speler.zweeft = binnen
  }

  // Levels met omkeerPeriode draaien de zwaartekracht vanzelf om, op een vaste
  // cadans. Er is dus geen plaat nodig; het ritme is de mechanic.
  _updateOmkeer(dt) {
    if (!this.level.omkeerPeriode) return
    this.omkeerTimer = (this.omkeerTimer ?? 0) + dt
    if (this.omkeerTimer < this.level.omkeerPeriode) return
    this.omkeerTimer -= this.level.omkeerPeriode
    this.speler.zwaartekrachtOm = !this.speler.zwaartekrachtOm
    this.speler.lichaam.vy = 0
    sfx.portaal()
    this.spel.fx.flitsScherm(this.palet.gloed, 0.12)
  }

  // Dun ijs onder de voeten laten barsten.
  _controleerBroos() {
    const l = this.speler.lichaam
    if (!l.opGrond) return
    const ty = Math.floor((l.onder + 1) / TEGEL)
    const x0 = Math.floor(l.links / TEGEL)
    const x1 = Math.floor((l.rechts - 0.001) / TEGEL)
    for (let tx = x0; tx <= x1; tx++) {
      if (this.map.betreedBroos(tx, ty)) sfx.blokKapot()
    }
  }

  _updateVliegers(dt) {
    for (let i = this.vliegers.length - 1; i >= 0; i--) {
      const v = this.vliegers[i]
      v.tijd += dt
      if (v.tijd >= v.duur) this.vliegers.splice(i, 1)
    }
  }

  // --- Botsingen -----------------------------------------------------------

  _draagSpeler() {
    const l = this.speler.lichaam
    l.opPlatform = null
    for (const p of [...this.platforms, ...this.valplatforms, ...this.zinkplatforms]) {
      if (!p.draagt(l)) continue
      l.y = p.bovenkant - l.h
      l.x += p.dx
      if (p.dy > 0) l.y += p.dy
      l.vy = 0
      l.opGrond = true
      l.opPlatform = p
      if (p.betreden) p.betreden()
      break
    }
  }

  _blokkenGeraakt() {
    // Capsules van onderaf. De speler-physics meldt alleen tegels; capsules
    // zijn entiteiten, dus die checken we hier.
    const l = this.speler.lichaam
    if (l.vy >= 0 || !l.tegenPlafond) return
    for (const c of this.capsules) {
      const v = c.vlak
      if (l.links < v.x + v.w && l.rechts > v.x && l.boven <= v.y + v.h + 2 && l.boven > v.y) {
        if (c.sla(this.spel.particles)) this.spel.fx.schud(2, 0.12)
      }
    }
  }

  _botsingen() {
    const l = this.speler.lichaam
    const fx = this.spel.fx

    // Munten
    for (const m of this.munten) {
      if (!m.raakt(l)) continue
      if (m.geest) {
        // Geest-munt: zichtbaar, maar levert niets op en maakt geen geluid.
        continue
      }
      m.gepakt = true
      if (opslag.pakMunt(m.index)) {
        this.muntReeks++
        sfx.munt(this.muntReeks)
        this.spel.particles.sparkle(m.x + MUNT.w / 2, m.y + MUNT.h / 2, UI.munt)
        this.vliegers.push({ x0: m.x - this.camera.tekenX, y0: m.y - this.camera.tekenY, tijd: 0, duur: 0.45 })
      }
    }

    // Veren
    for (const v of this.veren) {
      const vl = v.vlak
      if (l.vy >= 0 && l.rechts > vl.x && l.links < vl.x + vl.w && l.onder >= vl.y && l.onder <= vl.y + 10) {
        l.y = vl.y - l.h
        v.trap()
        this.speler.veerStuiter()
        this.spel.particles.stof(this.speler.midX, l.onder)
      }
    }

    // Checkpoints
    for (const c of this.checkpoints) {
      const v = c.vlak
      if (l.rechts > v.x && l.links < v.x + v.w && l.onder > v.y && l.boven < v.y + v.h) {
        if (c.activeer(this.spel.particles)) {
          this.spawn = { x: c.x, y: c.y + 32 - l.h }
          fx.toonTekst('checkpoint', c.x + 8, c.y - 4, UI.goed)
        }
      }
    }

    // Capsule-inhoud oppakken
    for (const c of this.capsules) {
      const v = c.itemVlak
      if (!v) continue
      if (l.x < v.x + v.w && l.x + l.w > v.x && l.y < v.y + v.h && l.y + l.h > v.y) {
        this.speler.geefPowerup(c.pak())
        this.spel.particles.sparkle(v.x + 6, v.y + 6, UI.accent)
      }
    }

    // Projectielen van vijanden (sneeuwballen en dergelijke)
    for (const vij of this.vijanden) {
      if (!vij.projectielen) continue
      for (const b of vij.projectielen) {
        if (!b.leeft) continue
        const bl = b.lichaam
        if (l.x < bl.x + bl.w && l.x + l.w > bl.x && l.y < bl.y + bl.h && l.y + l.h > bl.y) {
          b.leeft = false
          this.spel.particles.pop(bl.midX, bl.midY, '#ffffff', 8)
          this.speler.raak(bl.midX, fx)
        }
      }
    }

    // Vijanden
    for (const vij of this.vijanden) {
      if (!vij.leeft || !vij.gevaarlijk) continue
      const vl = vij.lichaam
      if (!(l.x < vl.x + vl.w && l.x + l.w > vl.x && l.y < vl.y + vl.h && l.y + l.h > vl.y)) continue

      if (this._stampt(l, vl, 6) && vij.stampbaar) {
        const hoog = this.spel.invoer.ingedrukt('spring')
        const verslagen = vij.opStamp(this.spel.particles)
        this.speler.stamp(hoog)
        fx.hitStop(0.05)
        fx.schud(2, 0.14)
        if (verslagen) sfx.stamp()
      } else if (this.speler.staat === STAAT.NORMAAL) {
        this.speler.raak(vij.midX, fx)
        if (this.speler.levens <= 0) this.speler.sterf(fx)
      }
    }

    // Geisers lanceren je omhoog; ze doen geen schade.
    for (const gz of this.geisers) {
      if (gz.raakt(l)) {
        // Zelfde kracht als een veer: dan hoeft de bereikbaarheidscheck maar
        // één sprongboog te kennen in plaats van twee.
        l.vy = Math.min(l.vy, -BASIS.sprong * 1.42)
        this.speler.springtNog = true
        this.spel.particles.spuit(this.speler.midX, l.onder, {
          vx: (Math.random() - 0.5) * 40, vy: 90, duur: 0.3, kleur: '#ffd76b', zwaarte: 30,
        })
      }
    }

    // Lasers doen schade; ze zijn niet te ontwijken door te stampen.
    for (const la of this.lasers) {
      if (la.raakt(l)) this.speler.raak(la.midX, fx)
    }

    // Sleutelkaarten: alle kaarten binnen = alle deuren open.
    for (const sl of this.sleutels) {
      if (sl.gepakt) continue
      const v = sl.vlak
      if (l.x < v.x + v.w && l.x + l.w > v.x && l.y < v.y + v.h && l.y + l.h > v.y) {
        sl.gepakt = true
        sfx.powerup()
        this.spel.particles.sparkle(v.x + 6, v.y + 5, '#3ef0ff')
        if (this.sleutels.every((k) => k.gepakt)) {
          this.map.deurenOpen = true
          this.renderer.herbak()
          fx.toonTekst('deuren open', this.speler.midX, this.speler.midY - 20, UI.goed)
          fx.flitsScherm('#3ef0ff', 0.12)
        }
      }
    }

    // De knal van een kortsluitrobot raakt verder dan zijn lijf.
    for (const vij of this.vijanden) {
      const kv = vij.knalVlak
      if (!kv) continue
      if (l.x < kv.x + kv.w && l.x + l.w > kv.x && l.y < kv.y + kv.h && l.y + l.h > kv.y) {
        this.speler.raak(kv.x + kv.w / 2, fx)
      }
    }

    // Portalen: je komt er aan de andere kant uit met dezelfde snelheid.
    for (const po of this.portalen) {
      if (po.koeling > 0 || !po.partner) continue
      const v = po.vlak
      if (l.x < v.x + v.w && l.x + l.w > v.x && l.y < v.y + v.h && l.y + l.h > v.y) {
        po.partner.koeling = 0.6
        po.koeling = 0.6
        this.spel.particles.sparkle(po.midX, po.midY, UI.accent)
        l.x = po.partner.midX - l.w / 2
        l.y = po.partner.midY - l.h / 2
        this.camera.spring(this.speler.midX, this.speler.midY)
        this.spel.particles.sparkle(po.partner.midX, po.partner.midY, UI.accent)
        sfx.portaal()
        break
      }
    }

    // Zwaartekrachtplaten draaien om welke kant "beneden" is.
    for (const zp of this.zwaarteplaten) {
      if (zp.koeling > 0) continue
      const v = zp.vlak
      if (l.x < v.x + v.w && l.x + l.w > v.x && l.y < v.y + v.h && l.y + l.h > v.y) {
        zp.koeling = 0.8
        this.speler.zwaartekrachtOm = !this.speler.zwaartekrachtOm
        l.vy = 0
        sfx.portaal()
        fx.flitsScherm(this.palet.gloed, 0.14)
        this.spel.particles.sparkle(zp.x + 8, zp.y + 8, this.palet.gloed)
      }
    }

    if (this.baas) this._baasBotsingen(l, fx)

    // Finish. Bij een baaslevel gaat hij pas open als de baas verslagen is.
    if (!this.baas || this.baas.klaar) {
      const f = this.finish.vlak
      if (l.x < f.x + f.w && l.x + l.w > f.x && l.y < f.y + f.h && l.y + l.h > f.y) {
        this._haalFinish()
      }
    }
  }

  // Stampt de speler op dit ding, of loopt hij er tegenaan?
  //
  // "Van boven" is niet altijd bovenaan het scherm: met omgekeerde zwaartekracht
  // valt de speler naar het plafond, en dan is op de kop springen juist van
  // onderaf. Zonder dit onderscheid was in wereld 5 (en tijdens fase 2 en 3 van
  // de Kern-AI en de Verslinder) geen enkele vijand of baas te stampen — je
  // kreeg altijd de klap.
  //
  // De marge zorgt dat je niet per ongeluk in de zijkant "valt" terwijl je
  // duidelijk bovenop landt.
  _stampt(l, doel, marge) {
    if (this.speler.zwaartekrachtOm) {
      return l.vy < 0 && l.vorigeY >= doel.y + doel.h - marge
    }
    return l.vy > 0 && l.vorigeY + l.h <= doel.y + marge
  }

  _baasBotsingen(l, fx) {
    const baas = this.baas

    // Kleine slijmen en slijmballen van de baas.
    for (const k of baas.kinderen) {
      if (!k.leeft) continue
      const kl = k.lichaam
      if (!(l.x < kl.x + kl.w && l.x + l.w > kl.x && l.y < kl.y + kl.h && l.y + l.h > kl.y)) continue
      if (l.vy > 0 && l.vorigeY + l.h <= kl.y + 6) {
        k.opStamp(this.spel.particles)
        this.speler.stamp(this.spel.invoer.ingedrukt('spring'))
        fx.hitStop(0.05)
      } else {
        this.speler.raak(k.midX, fx)
      }
    }
    // Schokgolven rollen over de vloer; ze zijn niet te stampen, alleen te
    // ontwijken door te springen.
    for (const g of baas.golven ?? []) {
      const gl = g.lichaam
      if (l.x < gl.x + gl.w && l.x + l.w > gl.x && l.y < gl.y + gl.h && l.y + l.h > gl.y) {
        this.speler.raak(gl.x, fx)
      }
    }
    for (const b of baas.ballen) {
      if (!b.leeft) continue
      const bl = b.lichaam
      if (l.x < bl.x + bl.w && l.x + l.w > bl.x && l.y < bl.y + bl.h && l.y + l.h > bl.y) {
        b.leeft = false
        this.spel.particles.pop(bl.midX, bl.midY, this.palet.deco[2], 8)
        this.speler.raak(bl.midX, fx)
      }
    }

    if (!baas.raaktSpeler(l)) return
    if (this._stampt(l, baas.lichaam, 10)) {
      if (baas.opStamp(this.spel.particles, fx, l)) {
        this.speler.stamp(this.spel.invoer.ingedrukt('spring'))
      } else {
        // Buiten het kwetsbare venster stuiter je af zonder schade te doen.
        this.speler.stamp(false)
      }
    } else if (baas.staat !== 'dood') {
      this.speler.raak(baas.midX, fx)
    }
    if (this.speler.levens <= 0) this.speler.sterf(fx)
  }

  // --- Toestandswissels ----------------------------------------------------

  _haalFinish() {
    if (this.klaar) return
    this.klaar = true
    this.klaarTimer = 0
    this.speler.win()
    this.camera.doelZoom = 1
    this.spel.particles.sparkle(this.speler.midX, this.speler.midY, UI.accent)
    muziek.jingle('gehaald', null)
  }

  _respawn() {
    this.levensVerloren++
    this.map.herstel()
    this.renderer.herbak()
    for (const v of this.vijanden) v.herstel()
    for (const p of this.platforms) p.herstel()
    for (const p of this.valplatforms) p.herstel()
    for (const p of this.zinkplatforms) p.herstel()
    for (const gz of this.geisers) gz.herstel()
    for (const la of this.lasers) la.herstel()
    for (const sl of this.sleutels) sl.herstel()
    for (const po of this.portalen) po.herstel()
    for (const zp of this.zwaarteplaten) zp.herstel()
    this.speler.zwaartekrachtOm = !!this.level.omgekeerdStart
    this.map.deurenOpen = false
    this.lava?.herstel()
    // Munten die deze poging al gepakt zijn blijven weg: binnen één poging is
    // elke munt maar één keer te pakken, ook na een respawn.
    for (const m of this.munten) {
      if (!opslag.isPending(m.index) && !m.geest) { m.gepakt = false; m.x = m.startX; m.y = m.startY }
    }
    this.speler.staat = STAAT.NORMAAL
    this.speler.staatTimer = 0
    this.speler.onkwetsbaar = 1.2
    this.speler.powerup = null
    this.speler.schild = false
    this.speler.zetPositie(this.spawn.x, this.spawn.y)
    this.muntReeks = 0
    this.spel.particles.wis()
    this.camera.spring(this.speler.midX, this.speler.midY)
  }

  _naarGameOver() {
    this.gameOver = true
    this.gameOverTimer = 0
    // Voorlopige munten vervallen; bij een nieuwe poging staan ze er weer.
    opslag.vergeetPoging()
    muziek.jingle('gameover', null)
  }

  _herstartNaGameOver() {
    this.spel.herstartLevel()
  }

  _naarResultaten() {
    const resultaat = opslag.voltooiLevel(this.level.id, {
      tijd: this.tijd,
      levensVerloren: this.levensVerloren,
      muntenInLevel: this.muntenTotaal,
      doeltijd: this.level.doeltijd,
    })
    const uit = {
      ...resultaat,
      tijd: this.tijd,
      doeltijd: this.level.doeltijd,
      muntenTotaal: this.muntenTotaal,
    }
    // Na een baas eerst de cutscene: het schiponderdeel dat je net terug hebt,
    // of de eindanimatie na de vijfde.
    if (this.level.baas) {
      const soort = this.wereldNr === 5 ? 'eind' : 'naBaas'
      this.spel.naarCutscene(soort, this.wereldNr, () => this.spel.naarResultaten(this.level, uit))
      return
    }
    this.spel.naarResultaten(this.level, uit)
  }

  // --- Tekenen -------------------------------------------------------------

  teken(ctx) {
    const fxOffset = this.spel.fx.offset
    const camX = this.camera.tekenX + fxOffset.x
    const camY = this.camera.tekenY + fxOffset.y

    // De achtergrond rekent vanaf de bodem van het level; zie tekenAchtergrond.
    const camYbg = camY - Math.max(0, this.map.hoogtePx - HOOGTE)
    tekenAchtergrond(ctx, this.ag, camX, camYbg, this.tijd)
    this.renderer.teken(ctx, camX, camY, BREEDTE, HOOGTE)

    for (const h of this.hints) if (this.camera.zichtbaar(h.x, h.y, 16, 16)) h.teken(ctx, camX, camY)
    for (const c of this.checkpoints) if (this.camera.zichtbaar(c.x, c.y, 16, 32)) c.teken(ctx, camX, camY)
    // Bij een baaslevel staat het landingsplatform er wel, maar gedoofd.
    if (this.baas && !this.baas.klaar) ctx.globalAlpha = 0.35
    this.finish.teken(ctx, camX, camY)
    ctx.globalAlpha = 1

    for (const p of this.platforms) if (this.camera.zichtbaar(p.x, p.y, p.w, p.h)) p.teken(ctx, camX, camY)
    for (const p of this.valplatforms) if (this.camera.zichtbaar(p.x, p.y, p.w, p.h)) p.teken(ctx, camX, camY)
    for (const p of this.zinkplatforms) if (this.camera.zichtbaar(p.x, p.y, p.w, p.h)) p.teken(ctx, camX, camY)
    for (const gz of this.geisers) if (this.camera.zichtbaar(gz.x, gz.y - gz.hoogte, 16, gz.hoogte + 16)) gz.teken(ctx, camX, camY)
    for (const zone of this.zeroG) {
      if (this.camera.zichtbaar(zone.x, zone.y, zone.w, zone.h)) {
        tekenZeroG(ctx, zone.x - camX, zone.y - camY, zone.w, zone.h, this.tijd)
      }
    }
    for (const la of this.lasers) la.teken(ctx, camX, camY)
    for (const sl of this.sleutels) if (this.camera.zichtbaar(sl.x, sl.y, 12, 10)) sl.teken(ctx, camX, camY)
    for (const po of this.portalen) if (this.camera.zichtbaar(po.x, po.y, 16, 32)) po.teken(ctx, camX, camY)
    for (const zp of this.zwaarteplaten) if (this.camera.zichtbaar(zp.x, zp.y, 16, 16)) zp.teken(ctx, camX, camY)
    for (const c of this.capsules) if (this.camera.zichtbaar(c.x, c.y, 16, 16)) c.teken(ctx, camX, camY)
    for (const v of this.veren) if (this.camera.zichtbaar(v.x, v.y, 16, 16)) v.teken(ctx, camX, camY)

    // Barsten in het dunne ijs: over de gebakken chunk heen, want ze duren maar
    // een halve seconde.
    for (const [i, s] of this.map.broos) {
      if (s.staat !== 'barst') continue
      const tx = i % this.map.w
      const ty = Math.floor(i / this.map.w)
      if (!this.camera.zichtbaar(tx * TEGEL, ty * TEGEL, TEGEL, TEGEL)) continue
      tekenBarst(ctx, tx * TEGEL - camX, ty * TEGEL - camY, s.t / 0.55)
    }

    for (const m of this.munten) if (this.camera.zichtbaar(m.x, m.y, MUNT.w, MUNT.h)) m.teken(ctx, camX, camY, this.muntBlad, this.geestBlad)
    for (const v of this.vijanden) if (this.camera.zichtbaar(v.lichaam.x, v.lichaam.y, 24, 24)) v.teken(ctx, camX, camY)
    if (this.baas) this.baas.teken(ctx, camX, camY)

    this.speler.teken(ctx, camX, camY)
    this.spel.particles.teken(ctx, camX, camY)

    tekenVoorgrond(ctx, this.ag, camX, camYbg)
    if (this.lava) tekenLavaVlak(ctx, BREEDTE, this.lava.y - camY, HOOGTE, this.tijd)
    if (this.wind) tekenWind(ctx, BREEDTE, HOOGTE, this.wind.kracht, this.tijd)
    if (this.level.hitte) tekenHitte(ctx, BREEDTE, HOOGTE, this.tijd, this.level.hitte)
    if (this.level.donker) this._tekenDonker(ctx, camX, camY)
    tekenSfeer(ctx, this.palet)

    for (const h of this.hints) tekenHint(ctx, h, camX, camY)

    // Zwevende tekstjes (checkpoint, bonussen)
    for (const z of this.spel.fx.zwevend) {
      ctx.globalAlpha = Math.max(0, 1 - z.tijd / z.duur)
      tekstMiddenSchaduw(ctx, z.tekst, z.x - camX, z.y - camY, z.kleur)
      ctx.globalAlpha = 1
    }

    tekenHud(ctx, {
      levens: this.speler.levens,
      maxLevens: this.speler.maxLevens,
      muntenNu: opslag.pendingAantal(),
      muntenTotaal: this.muntenTotaal,
      alVerzameld: this.alVerzameld,
      tijd: this.tijd,
      doeltijd: this.level.doeltijd,
      powerup: this.speler.powerup,
      jetpack: this.speler.jetpackBrandstof / 2.2,
    }, this.palet)
    tekenVliegers(ctx, this.vliegers)

    if (this.baas && !this.baas.klaar) {
      tekenLevensbalk(ctx, 120, 246, 240, this.baas.deel, this.level.naam, this.baas.fase)
      tekstMidden(ctx, this.level.naam, 240, 236, UI.tekst)
    }

    this.spel.fx.tekenFlits(ctx, BREEDTE, HOOGTE)

    if (this.introTimer > 0) this._tekenIntro(ctx)
    if (this.gameOver) this._tekenGameOver(ctx)
    if (this.pauze) this._tekenPauze(ctx)
  }

  // Beperkt zicht: een zachte lichtcirkel rond de speler, de rest bijna zwart.
  // De cirkel ademt licht mee zodat het scherm niet stilstaat.
  _tekenDonker(ctx, camX, camY) {
    const x = Math.round(this.speler.midX - camX)
    const y = Math.round(this.speler.midY - camY)
    const r = this.level.donker * (1 + Math.sin(this.tijd * 1.6) * 0.04)
    const g = ctx.createRadialGradient(x, y, r * 0.45, x, y, r)
    g.addColorStop(0, 'rgba(4,8,20,0)')
    g.addColorStop(0.7, 'rgba(4,8,20,0.55)')
    g.addColorStop(1, 'rgba(4,8,20,0.94)')
    // Eén vlak volstaat: buiten r zet canvas de laatste kleurstop door, dus het
    // hele scherm wordt gedekt. Er extra rechthoeken overheen leggen zou de
    // alpha verdubbelen en er zou een vierkante rand omheen komen te staan.
    ctx.fillStyle = g
    ctx.fillRect(0, 0, BREEDTE, HOOGTE)
  }

  _tekenIntro(ctx) {
    ctx.globalAlpha = Math.min(1, this.introTimer / 0.6)
    paneel(ctx, 140, 108, 200, 40)
    tekstMidden(ctx, `${this.level.id.toUpperCase()}`, 240, 116, UI.tekstZacht)
    tekstMidden(ctx, this.level.naam, 240, 128, UI.tekst, 1)
    ctx.globalAlpha = 1
  }

  _tekenGameOver(ctx) {
    ctx.fillStyle = 'rgba(10,7,19,0.72)'
    ctx.fillRect(0, 0, BREEDTE, HOOGTE)
    paneel(ctx, 130, 96, 220, 78)
    tekstMidden(ctx, TXT.gameOver.titel, 240, 108, UI.fout, 2)
    tekstMidden(ctx, TXT.gameOver.uitleg, 240, 132, UI.tekstZacht)
    tekstMidden(ctx, `${TXT.menu.opnieuw} — Enter`, 240, 152, UI.tekst)
  }

  _tekenPauze(ctx) {
    ctx.fillStyle = 'rgba(10,7,19,0.7)'
    ctx.fillRect(0, 0, BREEDTE, HOOGTE)
    paneel(ctx, 160, 60, 160, 150)
    tekstMidden(ctx, TXT.pauze.titel, 240, 72, UI.accent, 2)
    this.pauzeMenu.teken(ctx, 176, 96, 128, 22, 6)
  }
}
