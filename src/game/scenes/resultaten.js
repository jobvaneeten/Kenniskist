// Resultatenscherm na een gehaald level. De sterren draaien één voor één in,
// het saldo telt op — dat maakt het halen van een level een moment in plaats
// van een regel tekst.

import { UI, paletVoorWereld } from '../art/palet.js'
import { achtergrond, tekenAchtergrond, tekenSfeer, updateDeeltjes, BREEDTE, HOOGTE } from '../art/achtergrond.js'
import { tekst, tekstMidden, tekstRechts } from '../ui/font.js'
import { paneel, Menu, ster } from '../ui/panelen.js'
import { T as TXT, secondenFijn } from '../data/texts.nl.js'
import { ontleedLevelId, LEVELS_PER_WERELD } from '../data/werelden.js'
import { muziek, sfx } from '../audio/sfx.js'
import { opslag } from '../core/save-adapter.js'
import { Speler } from '../entities/speler.js'
import { bakCharacter } from '../art/personage.js'
import { characterOf } from '../data/characters.js'

const STER_LABELS = [TXT.resultaten.sterAlles, TXT.resultaten.sterGeenSchade, TXT.resultaten.sterTijd]

export class ResultatenScene {
  constructor(spel, level, resultaat) {
    this.spel = spel
    this.level = level
    this.r = resultaat
    const ontleed = ontleedLevelId(level.id)
    this.wereldNr = ontleed?.wereld ?? 1
    this.index = ontleed?.index ?? 1
    this.palet = paletVoorWereld(this.wereldNr)
    this.ag = achtergrond(this.palet)

    this.tijd = 0
    this.sterFase = 0        // welke ster nu indraait
    this.sterProgressie = 0
    this.saldoGetoond = Math.max(0, opslag.munten - resultaat.muntenNu - resultaat.bonusNu)
    this.saldoDoel = opslag.munten
    this.kunst = bakCharacter(characterOf(opslag.uitgerust))

    const laatste = this.index >= LEVELS_PER_WERELD
    this.menu = new Menu([
      { label: TXT.menu.volgende, uit: laatste },
      { label: TXT.menu.opnieuw },
      { label: TXT.menu.kaart },
    ])
  }

  binnen() {
    // De jingle van het level loopt nog; daarna komt het kaartthema terug.
    muziek.speel('kaart')
  }

  update(dt) {
    this.tijd += dt
    updateDeeltjes(this.ag, dt)
    this.spel.particles.update(dt)

    // Sterren komen na elkaar binnen, met een korte pauze ertussen.
    if (this.tijd > 0.6 && this.sterFase < 3) {
      this.sterProgressie += dt * 3.4
      if (this.sterProgressie >= 1) {
        if (this.r.sterren[this.sterFase]) {
          sfx.uiKiezen()
          if (this.r.nieuweSterren.includes(this.sterFase)) {
            muziek.jingle('ster', 'kaart')
            this.spel.particles.sparkle(198 + this.sterFase * 28, 130, UI.ster)
          }
        }
        this.sterFase++
        this.sterProgressie = 0
      }
    }

    // Saldo telt op zodra de sterren klaar zijn.
    if (this.sterFase >= 3 && this.saldoGetoond < this.saldoDoel) {
      const stap = Math.max(1, Math.ceil((this.saldoDoel - this.saldoGetoond) * dt * 3))
      this.saldoGetoond = Math.min(this.saldoDoel, this.saldoGetoond + stap)
      if (this.saldoGetoond % 3 === 0) sfx.telTik()
    }

    const keuze = this.menu.update(this.spel.invoer)
    if (keuze === 0) this.spel.naarVolgendLevel(this.wereldNr, this.index)
    else if (keuze === 1) this.spel.herstartLevel()
    else if (keuze === 2) this.spel.naarKaart()

    // Alles overslaan met Esc/Backspace.
    if (this.spel.invoer.netIngedrukt('terug')) {
      this.sterFase = 3
      this.saldoGetoond = this.saldoDoel
    }
  }

  teken(ctx) {
    tekenAchtergrond(ctx, this.ag, this.tijd * 12, 0, this.tijd)
    tekenSfeer(ctx, this.palet)
    ctx.fillStyle = 'rgba(10,7,19,0.55)'
    ctx.fillRect(0, 0, BREEDTE, HOOGTE)

    paneel(ctx, 96, 24, 288, 224)

    tekstMidden(ctx, TXT.resultaten.gehaald, 240, 34, UI.accent, 2)
    tekstMidden(ctx, `${this.level.id.toUpperCase()} — ${this.level.naam}`, 240, 54, UI.tekstZacht)

    // Sterren
    const sterY = 84
    for (let i = 0; i < 3; i++) {
      const x = 198 + i * 42
      const zichtbaar = i < this.sterFase
      const draai = i === this.sterFase ? Math.abs(Math.sin(this.sterProgressie * Math.PI)) : 1
      ster(ctx, x, sterY, zichtbaar && !!this.r.sterren[i], 1.9, zichtbaar ? 1 : draai)
      if (zichtbaar) {
        tekstMidden(ctx, STER_LABELS[i], x, sterY + 14, this.r.sterren[i] ? UI.tekst : UI.tekstZacht)
      }
    }

    // Regels
    const x0 = 128
    const w = 224
    let y = 132
    this._regel(ctx, x0, y, w, TXT.resultaten.muntenDitLevel, `+${this.r.muntenNu}`)
    y += 13
    if (this.r.bonusNu > 0) {
      this._regel(ctx, x0, y, w, TXT.resultaten.bonus, `+${this.r.bonusNu}`)
      y += 13
    }
    const binnenTijd = this.r.tijd <= this.r.doeltijd
    this._regel(ctx, x0, y, w, TXT.resultaten.tijd,
      `${secondenFijn(this.r.tijd)} / ${secondenFijn(this.r.doeltijd)}`,
      binnenTijd ? UI.goed : UI.fout)
    y += 13
    if (this.r.persoonlijkRecord) {
      tekstMidden(ctx, TXT.resultaten.record, 240, y, UI.accent)
      y += 13
    }
    this._regel(ctx, x0, y, w, TXT.resultaten.nieuwSaldo, `${this.saldoGetoond}`)

    // Het uitgeruste character viert het mee.
    Speler.tekenStil(ctx, this.kunst, this.sterFase >= 3 ? 'winnen' : 'idle', this.tijd, 108, 176)

    this.menu.teken(ctx, 176, 186, 128, 18, 3)
    this.spel.particles.teken(ctx, 0, 0)
  }

  _regel(ctx, x, y, w, links, rechts, kleur = UI.accent) {
    tekst(ctx, links, x, y, UI.tekstZacht)
    tekstRechts(ctx, rechts, x + w, y, kleur)
  }
}
