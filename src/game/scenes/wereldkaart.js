// De wereldkaart: het planeetoppervlak met de levelknooppunten. Het character
// loopt zichtbaar van knoop naar knoop, zodat de kaart aanvoelt als een plek en
// niet als een lijstje.

import { UI, paletVoorWereld, donkerder, lichter } from '../art/palet.js'
import { achtergrond, tekenAchtergrond, tekenSfeer, updateDeeltjes, BREEDTE, HOOGTE } from '../art/achtergrond.js'
import { tekst, tekstMidden, tekstRechts } from '../ui/font.js'
import { paneel, ster } from '../ui/panelen.js'
import { T as TXT } from '../data/texts.nl.js'
import { WERELDEN, LEVELS_PER_WERELD, levelId, isBaasLevel, TOTAAL_STERREN } from '../data/werelden.js'
import { opslag } from '../core/save-adapter.js'
import { bakCharacter, FRAME_W, FRAME_H } from '../art/personage.js'
import { characterOf } from '../data/characters.js'
import { Speler } from '../entities/speler.js'
import { muziek, sfx } from '../audio/sfx.js'
import { levelVan, muntenInLevel } from '../data/levels/index.js'

// Serpentine over drie rijen; de baas staat rechtsonder, los van de rest.
function knoopPositie(index) {
  const i = index - 1
  if (i < 6) return { x: 48 + i * 72, y: 96 }
  if (i < 12) return { x: 408 - (i - 6) * 72, y: 162 }
  return { x: 48 + (i - 12) * 120, y: 224 }
}

export class WereldkaartScene {
  constructor(spel, wereldNr = 1, startIndex = 1) {
    this.spel = spel
    this.wereldNr = wereldNr
    this.wereld = WERELDEN[wereldNr - 1]
    this.palet = paletVoorWereld(wereldNr)
    this.ag = achtergrond(this.palet)
    this.tijd = 0
    this.index = startIndex
    this.kunst = bakCharacter(characterOf(opslag.uitgerust))

    const p = knoopPositie(this.index)
    this.loper = { x: p.x, y: p.y, doelX: p.x, doelY: p.y, loopt: false, kijktRechts: true }
  }

  binnen() {
    this.kunst = bakCharacter(characterOf(opslag.uitgerust))
    muziek.speel('kaart')
  }

  get huidigId() { return levelId(this.wereldNr, this.index) }

  update(dt) {
    this.tijd += dt
    updateDeeltjes(this.ag, dt)
    const invoer = this.spel.invoer

    if (!this.loper.loopt) {
      if (invoer.netIngedrukt('rechts')) this._stap(1)
      if (invoer.netIngedrukt('links')) this._stap(-1)
      if (invoer.netIngedrukt('omhoog')) this._wisselWereld(1)
      if (invoer.netIngedrukt('omlaag')) this._wisselWereld(-1)

      if (invoer.netIngedrukt('bevestig')) {
        if (opslag.isOntgrendeld(this.wereldNr, this.index)) {
          sfx.uiKiezen()
          this.spel.startLevel(this.wereldNr, this.index)
        } else {
          sfx.uiGeblokkeerd()
        }
      }
      if (invoer.netIngedrukt('ren')) { sfx.uiKiezen(); this.spel.naarWinkel(this.wereldNr, this.index) }
      if (invoer.netIngedrukt('terug')) { sfx.uiTerug(); this.spel.naarTitel() }

      // Muis: klik op een knoop.
      for (let i = 1; i <= LEVELS_PER_WERELD; i++) {
        const p = knoopPositie(i)
        if (Math.abs(invoer.muis.x - p.x) < 12 && Math.abs(invoer.muis.y - p.y) < 12) {
          if (i !== this.index && invoer.muis.inBeeld) { this._ga(i); sfx.uiNavigatie() }
          if (invoer.muisNetNeer && opslag.isOntgrendeld(this.wereldNr, i)) {
            this.spel.startLevel(this.wereldNr, i)
          }
        }
      }
    }

    this._updateLoper(dt)
  }

  _stap(richting) {
    const nieuw = this.index + richting
    if (nieuw < 1 || nieuw > LEVELS_PER_WERELD) { sfx.uiGeblokkeerd(); return }
    this._ga(nieuw)
    sfx.uiNavigatie()
  }

  _ga(index) {
    this.index = index
    const p = knoopPositie(index)
    this.loper.doelX = p.x
    this.loper.doelY = p.y
    this.loper.loopt = true
    this.loper.kijktRechts = p.x >= this.loper.x
  }

  _wisselWereld(richting) {
    const nieuw = this.wereldNr + richting
    if (nieuw < 1 || nieuw > WERELDEN.length) { sfx.uiGeblokkeerd(); return }
    if (!opslag.wereldOntgrendeld(nieuw)) { sfx.uiGeblokkeerd(); return }
    sfx.uiKiezen()
    this.spel.naarKaart(nieuw, 1)
  }

  _updateLoper(dt) {
    if (!this.loper.loopt) return
    const snelheid = 150
    const dx = this.loper.doelX - this.loper.x
    const dy = this.loper.doelY - this.loper.y
    const afstand = Math.hypot(dx, dy)
    if (afstand < snelheid * dt) {
      this.loper.x = this.loper.doelX
      this.loper.y = this.loper.doelY
      this.loper.loopt = false
      return
    }
    this.loper.x += (dx / afstand) * snelheid * dt
    this.loper.y += (dy / afstand) * snelheid * dt
  }

  // --- Tekenen -------------------------------------------------------------

  teken(ctx) {
    tekenAchtergrond(ctx, this.ag, this.tijd * 6, 0, this.tijd)
    this._tekenOppervlak(ctx)
    this._tekenPad(ctx)

    for (let i = 1; i <= LEVELS_PER_WERELD; i++) this._tekenKnoop(ctx, i)

    // Het character loopt over de kaart; kleine loopanimatie of stil.
    Speler.tekenStil(
      ctx, this.kunst, this.loper.loopt ? 'kaart' : 'idle', this.tijd,
      this.loper.x - FRAME_W / 2, this.loper.y - FRAME_H + 6, !this.loper.kijktRechts,
    )

    tekenSfeer(ctx, this.palet)
    this._tekenBalk(ctx)
    this._tekenInfo(ctx)
  }

  // Een planeetbol onderin waar de knopen op staan.
  _tekenOppervlak(ctx) {
    ctx.fillStyle = donkerder(this.palet.grond.s, 0.35)
    for (let x = 0; x < BREEDTE; x++) {
      const h = 26 + Math.round(Math.sin(x * 0.012) * 8 + Math.sin(x * 0.05) * 3)
      ctx.fillRect(x, HOOGTE - h, 1, h)
    }
    ctx.fillStyle = donkerder(this.palet.grond.m, 0.2)
    for (let x = 0; x < BREEDTE; x++) {
      const h = 24 + Math.round(Math.sin(x * 0.012) * 8 + Math.sin(x * 0.05) * 3)
      ctx.fillRect(x, HOOGTE - h, 1, 3)
    }
  }

  _tekenPad(ctx) {
    for (let i = 1; i < LEVELS_PER_WERELD; i++) {
      const a = knoopPositie(i)
      const b = knoopPositie(i + 1)
      const open = opslag.isOntgrendeld(this.wereldNr, i + 1)
      // Stippellijn: open paden licht, gesloten donker.
      const stappen = Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 6)
      for (let s = 1; s < stappen; s++) {
        const t = s / stappen
        ctx.fillStyle = open ? lichter(this.palet.deco[0], 0.2) : donkerder(this.palet.rots.m, 0.2)
        ctx.fillRect(Math.round(a.x + (b.x - a.x) * t), Math.round(a.y + (b.y - a.y) * t) + 4, 2, 2)
      }
    }
  }

  _tekenKnoop(ctx, i) {
    const p = knoopPositie(i)
    const id = levelId(this.wereldNr, i)
    const open = opslag.isOntgrendeld(this.wereldNr, i)
    const voltooid = opslag.isVoltooid(id)
    const baas = isBaasLevel(i)
    const gekozen = i === this.index
    const r = baas ? 11 : 8

    // Ring rond de gekozen knoop, pulserend.
    if (gekozen) {
      const puls = 2 + Math.round(Math.sin(this.tijd * 5) * 1.5)
      ctx.fillStyle = UI.accent
      this._ring(ctx, p.x, p.y, r + puls)
    }

    const vulling = !open ? donkerder(this.palet.rots.m, 0.3)
      : baas ? (voltooid ? UI.goed : UI.fout)
        : voltooid ? this.palet.deco[1] : lichter(this.palet.deco[0], 0.15)

    this._schijf(ctx, p.x, p.y, r, vulling)
    this._ring(ctx, p.x, p.y, r, UI.inkt)
    if (open) {
      ctx.fillStyle = lichter(vulling, 0.4)
      ctx.fillRect(p.x - r + 2, p.y - r + 2, 3, 2)
    }

    // Nummer of baasmarkering.
    if (baas) {
      ctx.fillStyle = open ? '#ffffff' : UI.tekstZacht
      // Kroontje
      ctx.fillRect(p.x - 4, p.y - 1, 9, 4)
      ctx.fillRect(p.x - 4, p.y - 4, 2, 3)
      ctx.fillRect(p.x - 1, p.y - 5, 2, 4)
      ctx.fillRect(p.x + 3, p.y - 4, 2, 3)
    } else {
      tekstMidden(ctx, String(i), p.x + 1, p.y - 3, open ? UI.inkt : UI.tekstZacht)
    }

    // Sterren onder de knoop.
    if (voltooid) {
      const s = opslag.sterrenVan(id)
      for (let k = 0; k < 3; k++) {
        ster(ctx, p.x - 7 + k * 7, p.y + r + 5, !!s[k], 0.7)
      }
    }
  }

  _schijf(ctx, cx, cy, r, kleur) {
    ctx.fillStyle = kleur
    for (let y = -r; y <= r; y++) {
      const b = Math.floor(Math.sqrt(r * r - y * y))
      ctx.fillRect(cx - b, cy + y, b * 2 + 1, 1)
    }
  }

  _ring(ctx, cx, cy, r, kleur = UI.accent) {
    ctx.fillStyle = kleur
    for (let a = 0; a < 64; a++) {
      const hoek = (a / 64) * Math.PI * 2
      ctx.fillRect(Math.round(cx + Math.cos(hoek) * r), Math.round(cy + Math.sin(hoek) * r), 1, 1)
    }
  }

  _tekenBalk(ctx) {
    ctx.fillStyle = 'rgba(10,7,19,0.72)'
    ctx.fillRect(0, 0, BREEDTE, 22)
    ctx.fillStyle = UI.paneelRand
    ctx.fillRect(0, 22, BREEDTE, 1)
    tekst(ctx, `${TXT.kaart.wereld} ${this.wereldNr} — ${this.wereld.naam}`, 8, 5, UI.tekst)
    tekst(ctx, this.wereld.ondertitel, 8, 14, UI.tekstZacht)
    tekstRechts(ctx, `★ ${opslag.totaalSterren()}/${TOTAAL_STERREN}`, 472, 5, UI.ster)
    tekstRechts(ctx, `${opslag.munten} munten`, 472, 14, UI.munt)
  }

  _tekenInfo(ctx) {
    const id = this.huidigId
    const open = opslag.isOntgrendeld(this.wereldNr, this.index)
    const level = levelVan(id)
    const x = 8
    const y = 30
    paneel(ctx, x, y, 200, 42)

    if (!open) {
      tekstMidden(ctx, TXT.kaart.vergrendeld, x + 100, y + 16, UI.tekstZacht)
      return
    }

    const naam = level ? level.naam : TXT.kaart.kiesLevel
    tekst(ctx, `${isBaasLevel(this.index) ? `${TXT.kaart.baas}: ` : ''}${naam}`, x + 6, y + 6, UI.tekst)

    const l = opslag.level(id)
    const totaal = level ? muntenInLevel(level) : 0
    let gepakt = 0
    for (const teken of l.m || '') {
      const v = parseInt(teken, 16) || 0
      gepakt += (v & 1) + ((v >> 1) & 1) + ((v >> 2) & 1) + ((v >> 3) & 1)
    }
    tekst(ctx, `munten ${gepakt}/${totaal}`, x + 6, y + 18, UI.munt)

    const s = opslag.sterrenVan(id)
    for (let k = 0; k < 3; k++) ster(ctx, x + 120 + k * 16, y + 22, !!s[k], 1.2)

    tekst(ctx, 'Enter spelen  X winkel  ↑↓ wereld  Esc terug', x + 6, y + 31, UI.tekstZacht)
  }
}

export { knoopPositie }
