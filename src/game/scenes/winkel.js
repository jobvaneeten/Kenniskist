// De winkel: een hangar met het character op een langzaam draaiend platform.
// Links de lijst, rechts het podium met de live animatie en de knop.

import { UI, paletVoorWereld, donkerder, lichter } from '../art/palet.js'
import { achtergrond, tekenAchtergrond, tekenSfeer, updateDeeltjes, BREEDTE, HOOGTE } from '../art/achtergrond.js'
import { tekst, tekstMidden, tekstRechts, breek } from '../ui/font.js'
import { paneel, knop, KNOP_STAAT } from '../ui/panelen.js'
import { T as TXT } from '../data/texts.nl.js'
import { CHARACTERS, characterOf } from '../data/characters.js'
import { TOTAAL_STERREN } from '../data/werelden.js'
import { opslag } from '../core/save-adapter.js'
import { bakCharacter, bakSilhouet, FRAME_W, FRAME_H } from '../art/personage.js'
import { Speler } from '../entities/speler.js'
import { muziek, sfx } from '../audio/sfx.js'

const RIJ_H = 15
const ZICHTBAAR = 9

export class WinkelScene {
  constructor(spel, terugNaar) {
    this.spel = spel
    this.terugNaar = terugNaar // () => void
    this.palet = paletVoorWereld(1)
    this.ag = achtergrond(this.palet)
    this.tijd = 0
    this.index = Math.max(0, CHARACTERS.findIndex((c) => c.id === opslag.uitgerust))
    this.scroll = 0
    this.bevestigen = false
    this.bevestigKeuze = 0
    this.saldoGetoond = opslag.munten
    this.animNaam = 'idle'
    this.animTimer = 0
    this.kunstCache = new Map()
    this.rijVakken = []
  }

  binnen() { muziek.speel('kaart') }

  get gekozen() { return CHARACTERS[this.index] }

  kunst(id) {
    if (!this.kunstCache.has(id)) this.kunstCache.set(id, bakCharacter(characterOf(id)))
    return this.kunstCache.get(id)
  }

  update(dt) {
    this.tijd += dt
    updateDeeltjes(this.ag, dt)
    this.spel.particles.update(dt)
    const invoer = this.spel.invoer

    // Saldo telt geanimeerd af na een aankoop.
    if (this.saldoGetoond !== opslag.munten) {
      const stap = Math.max(1, Math.ceil(Math.abs(this.saldoGetoond - opslag.munten) * dt * 4))
      this.saldoGetoond += Math.sign(opslag.munten - this.saldoGetoond) * stap
      if (Math.abs(this.saldoGetoond - opslag.munten) < stap) this.saldoGetoond = opslag.munten
      sfx.telTik()
    }

    // Het character loopt/springt bij het wisselen van selectie.
    this.animTimer -= dt
    if (this.animTimer <= 0 && this.animNaam !== 'idle') { this.animNaam = 'idle'; this.animTimer = 0 }

    if (this.bevestigen) return this._updateBevestigen(invoer)

    if (invoer.netIngedrukt('omlaag')) this._kies(this.index + 1)
    if (invoer.netIngedrukt('omhoog')) this._kies(this.index - 1)
    if (invoer.netIngedrukt('bevestig')) this._activeer()
    if (invoer.netIngedrukt('terug')) { sfx.uiTerug(); this.terugNaar() }

    // Muis
    for (let i = 0; i < this.rijVakken.length; i++) {
      const v = this.rijVakken[i]
      if (!v) continue
      if (invoer.muis.x >= v.x && invoer.muis.x < v.x + v.w && invoer.muis.y >= v.y && invoer.muis.y < v.y + v.h) {
        if (v.index !== this.index) this._kies(v.index)
        if (invoer.muisNetNeer) this._activeer()
      }
    }
    if (this.knopVak && invoer.muisNetNeer
      && invoer.muis.x >= this.knopVak.x && invoer.muis.x < this.knopVak.x + this.knopVak.w
      && invoer.muis.y >= this.knopVak.y && invoer.muis.y < this.knopVak.y + this.knopVak.h) {
      this._activeer()
    }
  }

  _kies(nieuw) {
    const n = Math.max(0, Math.min(CHARACTERS.length - 1, nieuw))
    if (n === this.index) return
    this.index = n
    sfx.uiNavigatie()
    this.animNaam = 'lopen'
    this.animTimer = 0.9
    if (this.index < this.scroll) this.scroll = this.index
    if (this.index >= this.scroll + ZICHTBAAR) this.scroll = this.index - ZICHTBAAR + 1
  }

  _activeer() {
    const c = this.gekozen
    if (opslag.bezit(c.id)) {
      if (opslag.uitgerust === c.id) { sfx.uiGeblokkeerd(); return }
      opslag.rustUit(c.id)
      sfx.uiKiezen()
      this.animNaam = 'winnen'
      this.animTimer = 0.8
      return
    }
    if (!opslag.isOntgrendeldCharacter(c.id)) { sfx.uiGeblokkeerd(); return }
    if (c.sterren) {
      // Sterrencharacter: geen prijs, direct vrijspelen zodra je genoeg hebt.
      opslag.koop(c.id)
      opslag.rustUit(c.id)
      muziek.jingle('aankoop', 'kaart')
      this.spel.particles.sparkle(360, 130, UI.ster)
      return
    }
    if (opslag.munten < c.prijs) { sfx.uiGeblokkeerd(); return }
    this.bevestigen = true
    this.bevestigKeuze = 0
    sfx.uiKiezen()
  }

  _updateBevestigen(invoer) {
    if (invoer.netIngedrukt('links')) { this.bevestigKeuze = 0; sfx.uiNavigatie() }
    if (invoer.netIngedrukt('rechts')) { this.bevestigKeuze = 1; sfx.uiNavigatie() }
    if (invoer.netIngedrukt('terug')) { this.bevestigen = false; sfx.uiTerug() }
    if (invoer.netIngedrukt('bevestig')) {
      this.bevestigen = false
      if (this.bevestigKeuze === 0) {
        const c = this.gekozen
        if (opslag.koop(c.id)) {
          opslag.rustUit(c.id)
          muziek.jingle('aankoop', 'kaart')
          this.spel.particles.pop(360, 130, UI.accent, 22)
          this.animNaam = 'winnen'
          this.animTimer = 1
        } else {
          sfx.uiGeblokkeerd()
        }
      } else {
        sfx.uiTerug()
      }
    }
  }

  // --- Tekenen -------------------------------------------------------------

  teken(ctx) {
    tekenAchtergrond(ctx, this.ag, this.tijd * 4, 0, this.tijd)
    ctx.fillStyle = 'rgba(10,7,19,0.62)'
    ctx.fillRect(0, 0, BREEDTE, HOOGTE)
    this._tekenHangar(ctx)

    // Kopbalk
    ctx.fillStyle = 'rgba(10,7,19,0.8)'
    ctx.fillRect(0, 0, BREEDTE, 20)
    tekst(ctx, TXT.winkel.titel, 8, 6, UI.accent)
    tekstRechts(ctx, `${TXT.winkel.saldo}: ${this.saldoGetoond}`, 472, 6, UI.munt)

    this._tekenLijst(ctx)
    this._tekenPodium(ctx)
    this.spel.particles.teken(ctx, 0, 0)
    tekenSfeer(ctx, this.palet)
    if (this.bevestigen) this._tekenBevestiging(ctx)
  }

  _tekenHangar(ctx) {
    // Vloer met perspectieflijnen en twee lampen: geeft de ruimte diepte.
    ctx.fillStyle = donkerder(this.palet.rots.s, 0.4)
    ctx.fillRect(0, 190, BREEDTE, HOOGTE - 190)
    ctx.fillStyle = donkerder(this.palet.rots.m, 0.3)
    ctx.fillRect(0, 190, BREEDTE, 2)
    for (let i = -6; i <= 6; i++) {
      ctx.fillStyle = donkerder(this.palet.rots.m, 0.45)
      const x0 = 360 + i * 12
      const x1 = 360 + i * 60
      for (let y = 0; y < HOOGTE - 190; y++) {
        const t = y / (HOOGTE - 190)
        ctx.fillRect(Math.round(x0 + (x1 - x0) * t), 190 + y, 1, 1)
      }
    }
    ctx.globalAlpha = 0.12
    ctx.fillStyle = this.palet.gloed
    for (let y = 0; y < 70; y++) {
      const b = Math.round(10 + y * 0.9)
      ctx.fillRect(360 - b, 190 - y, b * 2, 1)
    }
    ctx.globalAlpha = 1
  }

  _tekenLijst(ctx) {
    paneel(ctx, 6, 26, 176, RIJ_H * ZICHTBAAR + 10)
    this.rijVakken = []
    for (let r = 0; r < ZICHTBAAR; r++) {
      const i = this.scroll + r
      if (i >= CHARACTERS.length) break
      const c = CHARACTERS[i]
      const y = 31 + r * RIJ_H
      this.rijVakken.push({ x: 10, y, w: 168, h: RIJ_H, index: i })

      const bezit = opslag.bezit(c.id)
      const open = opslag.isOntgrendeldCharacter(c.id)
      const gekozen = i === this.index

      if (gekozen) {
        ctx.fillStyle = UI.paneelLicht
        ctx.fillRect(10, y, 168, RIJ_H - 1)
        ctx.fillStyle = UI.accent
        ctx.fillRect(10, y, 2, RIJ_H - 1)
      }

      const kleur = !open ? UI.tekstZacht : bezit ? UI.tekst : UI.tekst
      tekst(ctx, c.naam, 18, y + 4, kleur)

      if (opslag.uitgerust === c.id) {
        tekstRechts(ctx, TXT.winkel.uitgerust, 174, y + 4, UI.goed)
      } else if (bezit) {
        tekstRechts(ctx, '✓', 174, y + 4, UI.goed)
      } else if (c.sterren) {
        tekstRechts(ctx, `★${c.sterren}`, 174, y + 4, open ? UI.ster : UI.tekstZacht)
      } else {
        tekstRechts(ctx, `${c.prijs}`, 174, y + 4, opslag.munten >= c.prijs ? UI.munt : UI.tekstZacht)
      }
    }
    // Schuifbalkje als de lijst langer is dan het venster.
    if (CHARACTERS.length > ZICHTBAAR) {
      const h = Math.round((ZICHTBAAR / CHARACTERS.length) * (RIJ_H * ZICHTBAAR))
      const y = 31 + Math.round((this.scroll / CHARACTERS.length) * (RIJ_H * ZICHTBAAR))
      ctx.fillStyle = UI.paneelRand
      ctx.fillRect(178, y, 2, h)
    }
  }

  _tekenPodium(ctx) {
    const c = this.gekozen
    const bezit = opslag.bezit(c.id)
    const open = opslag.isOntgrendeldCharacter(c.id)

    // Draaiend platform: een ellips die smaller en breder wordt.
    const draai = Math.sin(this.tijd * 0.9)
    const rx = 26 + Math.round(draai * 4)
    ctx.fillStyle = donkerder(this.palet.deco[2], 0.2)
    for (let y = -6; y <= 6; y++) {
      const b = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / 36)))
      ctx.fillRect(360 - b, 168 + y, b * 2, 1)
    }
    ctx.fillStyle = lichter(this.palet.deco[1], 0.15)
    for (let y = -6; y <= -3; y++) {
      const b = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / 36)))
      ctx.fillRect(360 - b, 168 + y, b * 2, 1)
    }

    const x = 360 - FRAME_W / 2
    const y = 168 - FRAME_H + 4
    if (!open) {
      ctx.drawImage(bakSilhouet(c), Math.round(x), Math.round(y))
    } else {
      Speler.tekenStil(ctx, this.kunst(c.id), this.animNaam, this.tijd, x, y, draai < 0)
    }

    // Naam en eigenschap
    paneel(ctx, 196, 186, 278, 58)
    tekst(ctx, c.naam, 204, 192, open ? UI.accent : UI.tekstZacht)
    if (c.sterren) {
      tekstRechts(ctx, `★ ${opslag.totaalSterren()}/${c.sterren}`, 466, 192, open ? UI.ster : UI.tekstZacht)
    }
    const regels = breek(open ? c.eigenschap : TXT.winkel.opSlot, 262)
    regels.slice(0, 2).forEach((r, i) => tekst(ctx, r, 204, 204 + i * 9, UI.tekst))

    // Knop met alle staten
    let label
    let staat
    if (!open) { label = TXT.winkel.sterrenNodig(c.sterren); staat = KNOP_STAAT.UIT }
    else if (opslag.uitgerust === c.id) { label = TXT.winkel.uitgerust; staat = KNOP_STAAT.UIT }
    else if (bezit || c.sterren) { label = TXT.winkel.uitrusten; staat = KNOP_STAAT.HOVER }
    else if (opslag.munten < c.prijs) { label = TXT.winkel.teDuur; staat = KNOP_STAAT.UIT }
    else { label = `${TXT.winkel.koop} (${c.prijs})`; staat = KNOP_STAAT.HOVER }

    this.knopVak = { x: 204, y: 224, w: 262, h: 16 }
    knop(ctx, 204, 224, 262, 16, label, staat)

    // Sterrentotaal als voortgangsbalk voor de sterrencharacters.
    if (c.sterren && !open) {
      const deel = opslag.totaalSterren() / c.sterren
      ctx.fillStyle = UI.paneelLicht
      ctx.fillRect(204, 220, 262, 2)
      ctx.fillStyle = UI.ster
      ctx.fillRect(204, 220, Math.round(262 * Math.min(1, deel)), 2)
    }

    tekst(ctx, `★ ${opslag.totaalSterren()} / ${TOTAAL_STERREN}`, 196, 26, UI.ster)
    tekst(ctx, 'Esc — terug', 196, 36, UI.tekstZacht)
  }

  _tekenBevestiging(ctx) {
    ctx.fillStyle = 'rgba(10,7,19,0.75)'
    ctx.fillRect(0, 0, BREEDTE, HOOGTE)
    paneel(ctx, 140, 96, 200, 78)
    tekstMidden(ctx, TXT.winkel.bevestigTitel, 240, 106, UI.accent)
    tekstMidden(ctx, `${this.gekozen.naam} — ${this.gekozen.prijs} munten`, 240, 122, UI.tekst)
    tekstMidden(ctx, `${TXT.winkel.saldo}: ${opslag.munten}`, 240, 134, UI.tekstZacht)
    knop(ctx, 152, 148, 84, 16, TXT.winkel.bevestigJa, this.bevestigKeuze === 0 ? KNOP_STAAT.HOVER : KNOP_STAAT.NORMAAL)
    knop(ctx, 244, 148, 84, 16, TXT.winkel.bevestigNee, this.bevestigKeuze === 1 ? KNOP_STAAT.HOVER : KNOP_STAAT.NORMAAL)
  }
}
