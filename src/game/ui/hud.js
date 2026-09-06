// HUD: levens, munten, tijd en de actieve power-up. Verder niets — het beeld
// is 480×270 en elke pixel die de HUD pakt gaat van het level af.

import { UI } from '../art/palet.js'
import { tekst, tekstSchaduw, tekstRechts } from './font.js'
import { seconden } from '../data/texts.nl.js'
import { powerupBlad, POWERUP_INDEX, POWERUP } from '../art/objecten.js'

function hartje(ctx, x, y, vol) {
  const kleur = vol ? UI.hart : UI.hartLeeg
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(x, y + 1, 8, 7)
  ctx.fillStyle = kleur
  ctx.fillRect(x + 1, y, 2, 2)
  ctx.fillRect(x + 5, y, 2, 2)
  ctx.fillRect(x, y + 1, 8, 3)
  ctx.fillRect(x + 1, y + 4, 6, 1)
  ctx.fillRect(x + 2, y + 5, 4, 1)
  ctx.fillRect(x + 3, y + 6, 2, 1)
  if (vol) {
    ctx.fillStyle = '#ffb3c4'
    ctx.fillRect(x + 1, y + 1, 2, 2)
  }
}

function muntje(ctx, x, y) {
  ctx.fillStyle = UI.muntRand
  ctx.fillRect(x + 1, y, 5, 7)
  ctx.fillRect(x, y + 1, 7, 5)
  ctx.fillStyle = UI.munt
  ctx.fillRect(x + 1, y + 1, 5, 5)
  ctx.fillStyle = '#fff3b0'
  ctx.fillRect(x + 2, y + 2, 2, 2)
}

export function tekenHud(ctx, { levens, maxLevens, muntenNu, muntenTotaal, alVerzameld, tijd, doeltijd, powerup, jetpack }, palet) {
  // Levens
  for (let i = 0; i < maxLevens; i++) {
    if (i >= 3 && i >= levens) break // lege plekken boven 3 alleen tonen als je ze ooit had
    hartje(ctx, 6 + i * 10, 6, i < levens)
  }

  // Munten van dit level, plus hoeveel je er eerder al pakte.
  muntje(ctx, 6, 18)
  tekstSchaduw(ctx, `${muntenNu}/${muntenTotaal}`, 16, 18, UI.tekst)
  if (alVerzameld > 0) {
    tekstSchaduw(ctx, `(${alVerzameld} al verzameld)`, 16, 27, UI.tekstZacht)
  }

  // Tijd, rood zodra de doeltijd voorbij is.
  const overTijd = tijd > doeltijd
  tekstRechts(ctx, seconden(tijd), 474, 6, overTijd ? UI.fout : UI.tekst)
  if (!overTijd) {
    tekstRechts(ctx, seconden(doeltijd), 474, 15, UI.tekstZacht)
  }

  // Actieve power-up rechtsonder met een aflopende ring.
  if (powerup) {
    const iconen = powerupBlad(palet)
    const x = 456
    const y = 240
    ctx.fillStyle = 'rgba(10,7,19,0.6)'
    ctx.fillRect(x - 3, y - 3, POWERUP.w + 6, POWERUP.h + 6)
    iconen.teken(ctx, POWERUP_INDEX[powerup.soort] ?? 0, x, y)
    const deel = powerup.duur
      ? 1 - powerup.tijd / powerup.duur
      : powerup.soort === 'jetpack' ? jetpack : 1
    ctx.fillStyle = UI.accent
    ctx.fillRect(x - 3, y + POWERUP.h + 2, Math.round((POWERUP.w + 6) * Math.max(0, deel)), 1)
  }
}

// Vliegende munten naar de teller: de scène houdt de lijst bij, dit tekent hem.
export function tekenVliegers(ctx, vliegers) {
  ctx.fillStyle = UI.munt
  for (const v of vliegers) {
    const t = v.tijd / v.duur
    // Kwadratische bézier van pakplek naar de teller.
    const x = (1 - t) * (1 - t) * v.x0 + 2 * (1 - t) * t * (v.x0 + 20) + t * t * 10
    const y = (1 - t) * (1 - t) * v.y0 + 2 * (1 - t) * t * (v.y0 - 40) + t * t * 21
    muntje(ctx, Math.round(x), Math.round(y))
  }
}

// Hintbordtekst: verschijnt in een klein paneel boven het bordje.
export function tekenHint(ctx, hint, camX, camY) {
  if (hint.zichtbaar <= 0.02) return
  const regels = hint.tekst.split('\n')
  const breedte = Math.max(...regels.map((r) => r.length)) * 4 + 12
  const x = Math.round(hint.x + 8 - breedte / 2 - camX)
  const y = Math.round(hint.y - 6 - regels.length * 9 - camY)
  ctx.globalAlpha = hint.zichtbaar
  ctx.fillStyle = 'rgba(10,7,19,0.82)'
  ctx.fillRect(x, y, breedte, regels.length * 9 + 5)
  ctx.fillStyle = UI.paneelRand
  ctx.fillRect(x, y, breedte, 1)
  ctx.fillRect(x, y + regels.length * 9 + 4, breedte, 1)
  regels.forEach((r, i) => {
    tekst(ctx, r, x + 6, y + 4 + i * 9, UI.tekst)
  })
  ctx.globalAlpha = 1
}
