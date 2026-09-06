// Instellingen: volumes, schermschudden en het toetsenoverzicht. Wordt over de
// vorige scène heen getekend, zodat je hem ook vanuit de pauze kunt openen
// zonder het level te verliezen.

import { UI } from '../art/palet.js'
import { BREEDTE, HOOGTE } from '../art/achtergrond.js'
import { tekst, tekstMidden, tekstRechts } from '../ui/font.js'
import { paneel, balk } from '../ui/panelen.js'
import { T as TXT } from '../data/texts.nl.js'
import { opslag } from '../core/save-adapter.js'
import { synth } from '../audio/synth.js'
import { sfx } from '../audio/sfx.js'

const REGELS = ['muziek', 'sfx', 'shake', 'terug']

export class InstellingenScene {
  constructor(spel, onder, sluit) {
    this.spel = spel
    this.onder = onder // scène die eronder zichtbaar blijft
    this.sluit = sluit
    this.index = 0
    this.tijd = 0
  }

  update(dt) {
    this.tijd += dt
    const invoer = this.spel.invoer

    if (invoer.netIngedrukt('omlaag')) { this.index = (this.index + 1) % REGELS.length; sfx.uiNavigatie() }
    if (invoer.netIngedrukt('omhoog')) { this.index = (this.index - 1 + REGELS.length) % REGELS.length; sfx.uiNavigatie() }

    const regel = REGELS[this.index]
    const richting = (invoer.netIngedrukt('rechts') ? 1 : 0) - (invoer.netIngedrukt('links') ? 1 : 0)

    if (richting !== 0) {
      if (regel === 'muziek' || regel === 'sfx') {
        const nieuw = Math.max(0, Math.min(1, Math.round((opslag.instellingen[regel] + richting * 0.1) * 10) / 10))
        opslag.instellingen[regel] = nieuw
        synth.zetVolume(regel, nieuw)
        opslag.bewaarInstellingen()
        sfx.uiNavigatie()
      } else if (regel === 'shake') {
        opslag.instellingen.shake = !opslag.instellingen.shake
        this.spel.fx.instellingen = opslag.instellingen
        opslag.bewaarInstellingen()
        sfx.uiNavigatie()
      }
    }

    if (invoer.netIngedrukt('bevestig')) {
      if (regel === 'terug') { sfx.uiTerug(); this.sluit() }
      else if (regel === 'shake') {
        opslag.instellingen.shake = !opslag.instellingen.shake
        opslag.bewaarInstellingen()
        sfx.uiKiezen()
      }
    }
    if (invoer.netIngedrukt('terug')) { sfx.uiTerug(); this.sluit() }
  }

  teken(ctx) {
    this.onder?.teken(ctx)
    ctx.fillStyle = 'rgba(10,7,19,0.78)'
    ctx.fillRect(0, 0, BREEDTE, HOOGTE)

    paneel(ctx, 110, 26, 260, 218)
    tekstMidden(ctx, TXT.instellingen.titel, 240, 36, UI.accent, 2)

    const x = 126
    let y = 62
    this._schuif(ctx, x, y, TXT.instellingen.muziek, opslag.instellingen.muziek, this.index === 0)
    y += 26
    this._schuif(ctx, x, y, TXT.instellingen.sfx, opslag.instellingen.sfx, this.index === 1)
    y += 26

    // Schermschudden
    const aan = opslag.instellingen.shake
    tekst(ctx, TXT.instellingen.shake, x, y, this.index === 2 ? UI.accent : UI.tekst)
    tekstRechts(ctx, aan ? TXT.instellingen.aan : TXT.instellingen.uit, x + 228, y, aan ? UI.goed : UI.tekstZacht)
    if (this.index === 2) this._wijzer(ctx, x - 10, y)
    y += 28

    tekst(ctx, TXT.instellingen.toetsen, x, y, UI.tekstZacht)
    y += 12
    for (const regel of TXT.instellingen.toetsenUitleg) {
      tekst(ctx, regel, x, y, UI.tekst)
      y += 10
    }

    y += 8
    tekst(ctx, TXT.menu.terug, x, y, this.index === 3 ? UI.accent : UI.tekst)
    if (this.index === 3) this._wijzer(ctx, x - 10, y)
  }

  _schuif(ctx, x, y, label, waarde, gekozen) {
    tekst(ctx, label, x, y, gekozen ? UI.accent : UI.tekst)
    tekstRechts(ctx, `${Math.round(waarde * 100)}%`, x + 228, y, UI.tekstZacht)
    balk(ctx, x, y + 11, 228, 4, waarde, gekozen ? UI.accent : UI.goed)
    if (gekozen) this._wijzer(ctx, x - 10, y)
  }

  _wijzer(ctx, x, y) {
    ctx.fillStyle = UI.accent
    const dx = Math.round(Math.sin(this.tijd * 6) * 1)
    ctx.fillRect(x + dx, y + 1, 2, 5)
    ctx.fillRect(x + 2 + dx, y + 2, 2, 3)
    ctx.fillRect(x + 4 + dx, y + 3, 1, 1)
  }
}
