// Cutscenes: de intro, het onderdeel dat na elke baas terugkomt, en de
// eindanimatie waarin Pip naar huis vliegt.
//
// Alles in beeld, weinig tekst: één regel per scène, en je kunt altijd
// doorklikken.

import { UI, paletVoorWereld, lichter, donkerder } from '../art/palet.js'
import { achtergrond, tekenAchtergrond, tekenSfeer, updateDeeltjes, BREEDTE, HOOGTE } from '../art/achtergrond.js'
import { tekstMidden, tekstMiddenSchaduw } from '../ui/font.js'
import { T as TXT } from '../data/texts.nl.js'
import { WERELDEN } from '../data/werelden.js'
import { opslag } from '../core/save-adapter.js'
import { bakCharacter } from '../art/personage.js'
import { characterOf } from '../data/characters.js'
import { Speler } from '../entities/speler.js'
import { muziek, sfx } from '../audio/sfx.js'

// Het schip: vijf onderdelen die per verslagen baas terugkomen. Het staat er
// dus letterlijk zoals je ervoor staat.
function tekenSchip(ctx, cx, cy, onderdelen, tijd) {
  const romp = '#a9b4c4'
  const donker = '#5a6478'
  const lijn = '#16233d'

  // Romp (altijd zichtbaar, want dat is het wrak)
  ctx.fillStyle = lijn
  ctx.fillRect(cx - 26, cy - 10, 52, 22)
  ctx.fillStyle = romp
  ctx.fillRect(cx - 25, cy - 9, 50, 20)
  ctx.fillStyle = donker
  ctx.fillRect(cx - 25, cy + 4, 50, 6)
  ctx.fillStyle = lichter(romp, 0.3)
  ctx.fillRect(cx - 25, cy - 9, 50, 3)

  // Cockpit
  ctx.fillStyle = lijn
  ctx.fillRect(cx - 10, cy - 20, 22, 12)
  ctx.fillStyle = '#3ef0ff'
  ctx.fillRect(cx - 8, cy - 18, 18, 8)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(cx - 8, cy - 18, 6, 3)

  const stukken = [
    // vleugel links, vleugel rechts, motor, antenne, staart
    () => { ctx.fillStyle = lijn; ctx.fillRect(cx - 40, cy - 4, 16, 12); ctx.fillStyle = romp; ctx.fillRect(cx - 39, cy - 3, 14, 10) },
    () => { ctx.fillStyle = lijn; ctx.fillRect(cx + 24, cy - 4, 16, 12); ctx.fillStyle = romp; ctx.fillRect(cx + 25, cy - 3, 14, 10) },
    () => {
      ctx.fillStyle = lijn; ctx.fillRect(cx - 8, cy + 11, 18, 8)
      ctx.fillStyle = '#ff8c1a'; ctx.fillRect(cx - 6, cy + 13, 14, 4)
      ctx.fillStyle = '#ffd76b'; ctx.fillRect(cx - 4, cy + 14, 10, 2)
    },
    () => {
      ctx.fillStyle = lijn; ctx.fillRect(cx + 2, cy - 32, 2, 12)
      ctx.fillStyle = UI.accent
      ctx.fillRect(cx, cy - 34, 6, 3)
    },
    () => { ctx.fillStyle = lijn; ctx.fillRect(cx - 34, cy - 22, 10, 14); ctx.fillStyle = donker; ctx.fillRect(cx - 33, cy - 21, 8, 12) },
  ]

  for (let i = 0; i < stukken.length; i++) {
    if (i < onderdelen) {
      stukken[i]()
    } else {
      // Ontbrekend stuk: een stippellijn op de plek waar het hoort.
      ctx.fillStyle = donkerder(romp, 0.55)
      const plek = [[cx - 40, cy - 4, 16, 12], [cx + 24, cy - 4, 16, 12],
        [cx - 8, cy + 11, 18, 8], [cx + 1, cy - 32, 4, 12], [cx - 34, cy - 22, 10, 14]][i]
      for (let x = 0; x < plek[2]; x += 3) ctx.fillRect(plek[0] + x, plek[1], 2, 1)
      for (let x = 0; x < plek[2]; x += 3) ctx.fillRect(plek[0] + x, plek[1] + plek[3] - 1, 2, 1)
      for (let y = 0; y < plek[3]; y += 3) ctx.fillRect(plek[0], plek[1] + y, 1, 2)
      for (let y = 0; y < plek[3]; y += 3) ctx.fillRect(plek[0] + plek[2] - 1, plek[1] + y, 1, 2)
    }
  }

  // Het net teruggezette stuk knippert nog even na.
  if (onderdelen > 0 && tijd < 1.6 && Math.floor(tijd * 8) % 2 === 0) {
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(cx - 42, cy - 36, 84, 60)
    ctx.globalAlpha = 1
  }
}

export class CutsceneScene {
  constructor(spel, { soort, wereld = 1, daarna }) {
    this.spel = spel
    this.soort = soort // 'intro' | 'naBaas' | 'eind'
    this.wereld = wereld
    this.daarna = daarna
    this.palet = paletVoorWereld(soort === 'eind' ? 5 : wereld)
    this.ag = achtergrond(this.palet)
    this.tijd = 0
    this.kunst = bakCharacter(characterOf(opslag.uitgerust))
    this.duur = soort === 'intro' ? 8 : soort === 'eind' ? 12 : 6
  }

  binnen() {
    muziek.speel(this.soort === 'eind' ? 'titel' : 'kaart')
  }

  update(dt) {
    this.tijd += dt
    updateDeeltjes(this.ag, dt)
    this.spel.particles.update(dt)
    // Altijd door te klikken; een cutscene mag nooit in de weg zitten.
    if (this.spel.invoer.netIngedrukt('bevestig') || this.spel.invoer.netIngedrukt('terug')) {
      sfx.uiKiezen()
      this.tijd = this.duur
    }
    if (this.tijd >= this.duur) this.daarna()
  }

  teken(ctx) {
    tekenAchtergrond(ctx, this.ag, this.tijd * 24, 0, this.tijd)
    tekenSfeer(ctx, this.palet)

    if (this.soort === 'intro') this._tekenIntro(ctx)
    else if (this.soort === 'eind') this._tekenEind(ctx)
    else this._tekenNaBaas(ctx)

    this.spel.particles.teken(ctx, 0, 0)

    const puls = 0.5 + Math.sin(this.tijd * 4) * 0.5
    ctx.globalAlpha = 0.4 + puls * 0.4
    tekstMidden(ctx, 'Enter — verder', 240, 254, UI.tekstZacht)
    ctx.globalAlpha = 1
  }

  _tekenIntro(ctx) {
    // Het schip valt uit beeld terwijl de onderdelen loskomen.
    const t = Math.min(1, this.tijd / 5)
    const schipX = 380 - t * 300
    const schipY = 70 + t * t * 120
    ctx.save()
    ctx.translate(0, Math.sin(this.tijd * 6) * 2)
    tekenSchip(ctx, schipX, schipY, this.tijd < 2 ? 5 : Math.max(0, 5 - Math.floor((this.tijd - 2) * 2)), 99)
    ctx.restore()

    // Losgeslagen onderdelen die wegdrijven.
    if (this.tijd > 2) {
      for (let i = 0; i < 5; i++) {
        const los = this.tijd - 2 - i * 0.5
        if (los <= 0) continue
        ctx.fillStyle = '#5a6478'
        const x = schipX + Math.cos(i * 1.7) * los * 60
        const y = schipY + Math.sin(i * 1.7) * los * 34 - los * 8
        ctx.fillRect(Math.round(x), Math.round(y), 8, 6)
        ctx.fillStyle = '#a9b4c4'
        ctx.fillRect(Math.round(x), Math.round(y), 8, 2)
      }
    }

    const regel = Math.min(2, Math.floor(this.tijd / 2.6))
    tekstMiddenSchaduw(ctx, TXT.cutscene.intro[regel], 240, 210, UI.tekst)
    Speler.tekenStil(ctx, this.kunst, this.tijd > 5 ? 'geraakt' : 'vallen', this.tijd, 220, 150)
  }

  _tekenNaBaas(ctx) {
    tekenSchip(ctx, 240, 120, this.wereld, this.tijd)
    Speler.tekenStil(ctx, this.kunst, 'winnen', this.tijd, 300, 130)
    tekstMiddenSchaduw(ctx, TXT.cutscene.naBaas(this.wereld), 240, 200, UI.accent)
    tekstMiddenSchaduw(ctx, WERELDEN[this.wereld - 1].baas, 240, 214, UI.tekstZacht)

    if (this.tijd < 0.6) {
      this.spel.particles.sparkle(240, 120, UI.accent)
    }
  }

  _tekenEind(ctx) {
    // Het schip stijgt op en vliegt weg naar rechtsboven.
    const t = Math.min(1, this.tijd / 9)
    const x = 200 + t * t * 320
    const y = 170 - t * 130
    tekenSchip(ctx, x, y, 5, 99)

    // Uitlaatspoor
    for (let i = 0; i < 12; i++) {
      const s = t - i * 0.02
      if (s <= 0) continue
      const sx = 200 + s * s * 320
      const sy = 170 - s * 130 + 16
      ctx.globalAlpha = 0.5 - i * 0.04
      ctx.fillStyle = i < 4 ? '#ffd76b' : '#ff8c1a'
      ctx.fillRect(Math.round(sx - 4), Math.round(sy), 4, 3)
      ctx.globalAlpha = 1
    }

    if (this.tijd < 3) {
      Speler.tekenStil(ctx, this.kunst, 'winnen', this.tijd, 160, 190)
    }
    tekstMiddenSchaduw(ctx, TXT.cutscene.eind, 240, 224, UI.accent)
    if (this.tijd > 4) {
      tekstMiddenSchaduw(ctx, `★ ${opslag.totaalSterren()} / ${opslag.sterrenMax}`, 240, 238, UI.ster)
    }
  }
}

export { tekenSchip, BREEDTE, HOOGTE }
