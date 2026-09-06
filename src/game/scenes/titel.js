// Titelscherm: logo, parallax, het uitgeruste character en de audio-gate.
// Audio mag pas starten na een gebruikersinteractie, dus zolang die er niet is
// staat er een nette melding in plaats van stilte zonder uitleg.

import { UI, paletVoorWereld } from '../art/palet.js'
import { achtergrond, tekenAchtergrond, tekenVoorgrond, tekenSfeer, updateDeeltjes } from '../art/achtergrond.js'
import { tekenLogo } from '../art/logo.js'
import { tekstMidden, tekstMiddenSchaduw } from '../ui/font.js'
import { Menu } from '../ui/panelen.js'
import { T as TXT } from '../data/texts.nl.js'
import { TOTAAL_STERREN } from '../data/werelden.js'
import { opslag } from '../core/save-adapter.js'
import { bakCharacter } from '../art/personage.js'
import { characterOf } from '../data/characters.js'
import { Speler } from '../entities/speler.js'
import { muziek } from '../audio/sfx.js'
import { synth } from '../audio/synth.js'

export class TitelScene {
  constructor(spel) {
    this.spel = spel
    this.palet = paletVoorWereld(1)
    this.ag = achtergrond(this.palet)
    this.tijd = 0
    this.camX = 0
    this.menu = new Menu([
      { label: TXT.menu.spelen },
      { label: TXT.menu.winkel },
      { label: TXT.menu.instellingen },
    ])
    this.kunst = bakCharacter(characterOf(opslag.uitgerust))
  }

  binnen() {
    this.kunst = bakCharacter(characterOf(opslag.uitgerust))
    if (synth.klaar) muziek.speel('titel')
  }

  update(dt) {
    this.tijd += dt
    this.camX += dt * 10
    updateDeeltjes(this.ag, dt)

    // Audio-gate: bij de eerste toets of klik starten we de AudioContext.
    if (!synth.klaar && this.spel.invoer.eersteInteractie) {
      if (synth.start()) {
        synth.zetVolume('muziek', opslag.instellingen.muziek)
        synth.zetVolume('sfx', opslag.instellingen.sfx)
        muziek.speel('titel')
      }
    }

    const keuze = this.menu.update(this.spel.invoer)
    if (keuze === 0) this.spel.naarSpelen()
    else if (keuze === 1) this.spel.naarWinkel()
    else if (keuze === 2) this.spel.openInstellingen(() => {})
  }

  teken(ctx) {
    tekenAchtergrond(ctx, this.ag, this.camX, 0, this.tijd)
    tekenVoorgrond(ctx, this.ag, this.camX, 0)
    tekenSfeer(ctx, this.palet)

    tekenLogo(ctx, 240, 34, this.tijd, UI.accent)
    tekstMiddenSchaduw(ctx, TXT.ondertitel, 240, 84, UI.tekstZacht)

    // Het uitgeruste character staat links van het menu te wachten.
    Speler.tekenStil(ctx, this.kunst, 'idle', this.tijd, 132, 156)

    this.menu.teken(ctx, 200, 118, 148, 22, 6)

    const sterren = opslag.totaalSterren()
    tekstMiddenSchaduw(ctx, `★ ${sterren} / ${TOTAAL_STERREN}`, 240, 202, UI.ster)
    tekstMiddenSchaduw(ctx, `${opslag.munten} munten`, 240, 214, UI.munt)

    if (!synth.klaar) {
      const puls = 0.6 + Math.sin(this.tijd * 3) * 0.4
      ctx.globalAlpha = puls
      tekstMidden(ctx, TXT.startMelding, 240, 244, UI.tekst)
      ctx.globalAlpha = 1
    }
  }
}
