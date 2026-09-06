// Bootstrap van Sterrenveer. Zet het canvas op, houdt de scènes vast en draait
// de lus. De React-wrapper (src/games/SterrenveerGame.jsx) roept alleen
// startSterrenveer() aan en krijgt een opruimfunctie terug.

import { Lus } from './core/loop.js'
import { Invoer } from './core/input.js'
import { Particles } from './engine/particles.js'
import { Fx } from './engine/fx.js'
import { Overgang, OVERGANG } from './ui/overgangen.js'
import { BREEDTE, HOOGTE } from './art/achtergrond.js'
import { opslag } from './core/save-adapter.js'
import { synth } from './audio/synth.js'
import { muziek } from './audio/sfx.js'
import { TitelScene } from './scenes/titel.js'
import { WereldkaartScene } from './scenes/wereldkaart.js'
import { LevelScene } from './scenes/level.js'
import { ResultatenScene } from './scenes/resultaten.js'
import { WinkelScene } from './scenes/winkel.js'
import { InstellingenScene } from './scenes/instellingen.js'
import { levelVan } from './data/levels/index.js'
import { levelId, LEVELS_PER_WERELD } from './data/werelden.js'

export class Spel {
  constructor(canvas, { onBack } = {}) {
    this.canvas = canvas
    this.onBack = onBack
    this.ctx = canvas.getContext('2d', { alpha: false })
    this.ctx.imageSmoothingEnabled = false

    // Interne render-buffer op vaste resolutie; het zichtbare canvas wordt met
    // een geheel getal opgeschaald zodat de pixels scherp blijven.
    this.buffer = document.createElement('canvas')
    this.buffer.width = BREEDTE
    this.buffer.height = HOOGTE
    this.bctx = this.buffer.getContext('2d', { alpha: false })
    this.bctx.imageSmoothingEnabled = false

    opslag.laad()
    // Eén expliciete schrijfactie bij het openen: gastvoortgang die nog niet in
    // de cloud staat wordt door hydrateer() niet als "vuil" gepland, en zou
    // anders pas bij de eerstvolgende wijziging omhoog gaan.
    opslag.bewaarAlles()

    this.invoer = new Invoer(window)
    this.invoer.koppelBeeld((cx, cy) => this._naarBeeld(cx, cy))
    this.particles = new Particles()
    this.fx = new Fx(opslag.instellingen)
    this.overgang = new Overgang(BREEDTE, HOOGTE)

    this.scene = new TitelScene(this)
    this.overlay = null // instellingen over de huidige scène
    this.huidigLevel = null

    this.lus = new Lus({
      update: (dt) => this._update(dt),
      teken: () => this._teken(),
    })

    this._resize = () => this._pasAan()
    window.addEventListener('resize', this._resize)
    this._zichtbaarheid = () => {
      if (document.hidden) { this.lus.stop(); synth.pauzeer() }
      else { this.lus.hervat(); this.lus.start(); synth.hervat() }
    }
    document.addEventListener('visibilitychange', this._zichtbaarheid)

    this._pasAan()
    this.scene.binnen?.()
    this.lus.start()
  }

  // --- Schaal en letterbox -------------------------------------------------

  _pasAan() {
    const ouder = this.canvas.parentElement
    const bw = ouder?.clientWidth || window.innerWidth
    const bh = ouder?.clientHeight || window.innerHeight
    const schaal = Math.max(1, Math.floor(Math.min(bw / BREEDTE, bh / HOOGTE)))
    this.schaal = schaal
    this.canvas.width = BREEDTE * schaal
    this.canvas.height = HOOGTE * schaal
    this.canvas.style.width = `${BREEDTE * schaal}px`
    this.canvas.style.height = `${HOOGTE * schaal}px`
    this.ctx = this.canvas.getContext('2d', { alpha: false })
    this.ctx.imageSmoothingEnabled = false
  }

  _naarBeeld(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect()
    const x = (clientX - r.left) / (r.width / BREEDTE)
    const y = (clientY - r.top) / (r.height / HOOGTE)
    return { x, y, in: x >= 0 && y >= 0 && x < BREEDTE && y < HOOGTE }
  }

  // --- Lus -----------------------------------------------------------------

  _update(dt) {
    this.overgang.update(dt)
    if (this.overgang.bezig) {
      // Tijdens een overgang loopt de scène niet door: dat voorkomt dat je een
      // level begint met een halve seconde onzichtbare gameplay.
      this.invoer.eindFrame()
      return
    }
    if (this.overlay) this.overlay.update(dt)
    else this.scene.update(dt)
    this.invoer.eindFrame()
  }

  _teken() {
    const ctx = this.bctx
    ctx.fillStyle = '#0a0713'
    ctx.fillRect(0, 0, BREEDTE, HOOGTE)
    if (this.overlay) this.overlay.teken(ctx)
    else this.scene.teken(ctx)
    this.overgang.teken(ctx)

    this.ctx.imageSmoothingEnabled = false
    this.ctx.drawImage(this.buffer, 0, 0, this.canvas.width, this.canvas.height)
  }

  // --- Scènewissels --------------------------------------------------------

  _wissel(maak, opties) {
    this.overgang.start(() => {
      this.scene.buiten?.()
      this.particles.wis()
      this.fx.wis()
      this.scene = maak()
      this.scene.binnen?.()
    }, opties)
  }

  naarTitel() {
    this._wissel(() => new TitelScene(this), { soort: OVERGANG.FADE })
  }

  naarKaart(wereld = null, index = null) {
    const w = wereld ?? this.laatsteWereld ?? 1
    const i = index ?? this.laatsteIndex ?? 1
    this.laatsteWereld = w
    this.laatsteIndex = i
    this._wissel(() => new WereldkaartScene(this, w, i))
  }

  naarWinkel(wereld = null, index = null) {
    const terug = wereld != null
      ? () => this.naarKaart(wereld, index)
      : () => this.naarTitel()
    this._wissel(() => new WinkelScene(this, terug), { soort: OVERGANG.FADE })
  }

  startLevel(wereld, index) {
    const id = levelId(wereld, index)
    const level = levelVan(id)
    if (!level) return
    this.laatsteWereld = wereld
    this.laatsteIndex = index
    this.huidigLevel = level
    this._wissel(() => new LevelScene(this, level))
  }

  herstartLevel() {
    if (!this.huidigLevel) return this.naarKaart()
    const level = this.huidigLevel
    this._wissel(() => new LevelScene(this, level))
  }

  naarVolgendLevel(wereld, index) {
    if (index >= LEVELS_PER_WERELD) return this.naarKaart(wereld, index)
    const volgende = index + 1
    if (!levelVan(levelId(wereld, volgende))) return this.naarKaart(wereld, index)
    this.startLevel(wereld, volgende)
  }

  naarResultaten(level, resultaat) {
    this._wissel(() => new ResultatenScene(this, level, resultaat), { soort: OVERGANG.FADE })
  }

  openInstellingen() {
    const onder = this.scene
    this.overlay = new InstellingenScene(this, onder, () => {
      this.overlay = null
      this.fx.instellingen = opslag.instellingen
    })
  }

  // --- Opruimen ------------------------------------------------------------

  stop() {
    this.lus.stop()
    muziek.stop()
    synth.pauzeer()
    this.invoer.stop()
    window.removeEventListener('resize', this._resize)
    document.removeEventListener('visibilitychange', this._zichtbaarheid)
    opslag.bewaarAlles()
  }
}

export function startSterrenveer(canvas, opties) {
  const spel = new Spel(canvas, opties)
  return () => spel.stop()
}
