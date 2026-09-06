// Panelen, knoppen en meters. Alles op hele pixels, met een 9-slice-rand die
// uit code komt — geen afbeeldingen.

import { UI } from '../art/palet.js'
import { tekst, tekstMidden, tekstBreedte } from './font.js'
import { sfx } from '../audio/sfx.js'

export function paneel(ctx, x, y, w, h, { vulling = UI.paneel, rand = UI.paneelRand, licht = UI.paneelLicht, alpha = 1 } = {}) {
  ctx.globalAlpha = alpha
  // Schaduw eerst, zodat het paneel van de achtergrond loskomt.
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(x + 2, y + 3, w, h)

  ctx.fillStyle = vulling
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = licht
  ctx.fillRect(x + 1, y + 1, w - 2, 2)

  ctx.fillStyle = rand
  ctx.fillRect(x, y, w, 1)
  ctx.fillRect(x, y + h - 1, w, 1)
  ctx.fillRect(x, y, 1, h)
  ctx.fillRect(x + w - 1, y, 1, h)
  // Hoeken uitgesneden: geeft het paneel een afgeronde indruk op 1 px.
  ctx.fillStyle = 'rgba(0,0,0,0)'
  ctx.clearRect(x, y, 1, 1)
  ctx.clearRect(x + w - 1, y, 1, 1)
  ctx.clearRect(x, y + h - 1, 1, 1)
  ctx.clearRect(x + w - 1, y + h - 1, 1, 1)
  ctx.fillStyle = rand
  ctx.fillRect(x + 1, y + 1, 1, 1)
  ctx.fillRect(x + w - 2, y + 1, 1, 1)
  ctx.fillRect(x + 1, y + h - 2, 1, 1)
  ctx.fillRect(x + w - 2, y + h - 2, 1, 1)
  ctx.globalAlpha = 1
}

export const KNOP_STAAT = { NORMAAL: 0, HOVER: 1, INGEDRUKT: 2, UIT: 3 }

export function knop(ctx, x, y, w, h, label, staat, { kleur = UI.accent, schaal = 1 } = {}) {
  const uit = staat === KNOP_STAAT.UIT
  const ingedrukt = staat === KNOP_STAAT.INGEDRUKT
  const hover = staat === KNOP_STAAT.HOVER
  const dy = ingedrukt ? 1 : 0

  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(x + 1, y + 2, w, h)

  ctx.fillStyle = uit ? UI.paneelLicht : hover ? kleur : UI.paneel
  ctx.fillRect(x, y + dy, w, h)
  ctx.fillStyle = uit ? UI.paneel : hover ? '#ffffff' : UI.paneelLicht
  ctx.fillRect(x + 1, y + 1 + dy, w - 2, 1)
  ctx.fillStyle = uit ? UI.paneelRand : hover ? kleur : UI.paneelRand
  ctx.fillRect(x, y + dy, w, 1)
  ctx.fillRect(x, y + h - 1 + dy, w, 1)
  ctx.fillRect(x, y + dy, 1, h)
  ctx.fillRect(x + w - 1, y + dy, 1, h)

  const tekstKleur = uit ? UI.tekstZacht : hover ? UI.inkt : UI.tekst
  tekstMidden(ctx, label, x + w / 2, y + Math.round((h - 7 * schaal) / 2) + dy, tekstKleur, schaal)
}

// Een lijst knoppen die met toetsen én muis te bedienen is. De scènes houden
// alleen een index bij; deze klasse doet de rest.
export class Menu {
  constructor(items) {
    this.items = items
    this.index = 0
    this.vakken = []
  }

  zetItems(items) {
    this.items = items
    if (this.index >= items.length) this.index = Math.max(0, items.length - 1)
  }

  // Geeft de gekozen index terug, of -1.
  update(invoer) {
    const bruikbaar = this.items.filter((i) => !i.uit).length
    if (bruikbaar === 0) return -1

    if (invoer.netIngedrukt('omlaag')) { this._stap(1); sfx.uiNavigatie() }
    if (invoer.netIngedrukt('omhoog')) { this._stap(-1); sfx.uiNavigatie() }

    // Muis: hover zet de selectie, klik kiest.
    let overIndex = -1
    for (let i = 0; i < this.vakken.length; i++) {
      const v = this.vakken[i]
      if (!v || this.items[i]?.uit) continue
      if (invoer.muis.x >= v.x && invoer.muis.x < v.x + v.w && invoer.muis.y >= v.y && invoer.muis.y < v.y + v.h) {
        overIndex = i
      }
    }
    if (overIndex >= 0 && overIndex !== this.index) { this.index = overIndex; sfx.uiNavigatie() }
    if (overIndex >= 0 && invoer.muisNetNeer) { sfx.uiKiezen(); return overIndex }

    if (invoer.netIngedrukt('bevestig')) {
      if (this.items[this.index]?.uit) { sfx.uiGeblokkeerd(); return -1 }
      sfx.uiKiezen()
      return this.index
    }
    return -1
  }

  _stap(richting) {
    for (let n = 0; n < this.items.length; n++) {
      this.index = (this.index + richting + this.items.length) % this.items.length
      if (!this.items[this.index].uit) return
    }
  }

  teken(ctx, x, y, w, h, spatie = 4, opties = {}) {
    this.vakken = []
    this.items.forEach((item, i) => {
      const iy = y + i * (h + spatie)
      this.vakken.push({ x, y: iy, w, h })
      const staat = item.uit ? KNOP_STAAT.UIT : i === this.index ? KNOP_STAAT.HOVER : KNOP_STAAT.NORMAAL
      knop(ctx, x, iy, w, h, item.label, staat, opties)
    })
  }
}

// Ster: gevuld of leeg, met een korte indraai-animatie.
export function ster(ctx, x, y, gevuld, schaal = 1, draai = 1) {
  const punten = 5
  const kleur = gevuld ? UI.ster : UI.sterLeeg
  const r = 5 * schaal
  const ri = 2.2 * schaal
  // Op 480×270 leest een echte stervorm slecht; deze variant houdt de punten
  // dik genoeg om op één pixel te blijven staan.
  ctx.fillStyle = kleur
  const breedte = Math.max(1, Math.round(draai * r * 2))
  const cx = Math.round(x)
  const cy = Math.round(y)
  for (let i = 0; i < punten; i++) {
    const hoek = (i / punten) * Math.PI * 2 - Math.PI / 2
    const hoek2 = ((i + 0.5) / punten) * Math.PI * 2 - Math.PI / 2
    const px = Math.round(Math.cos(hoek) * (breedte / 2))
    const py = Math.round(Math.sin(hoek) * r)
    const qx = Math.round(Math.cos(hoek2) * (breedte / 2) * (ri / r))
    const qy = Math.round(Math.sin(hoek2) * ri)
    lijn(ctx, cx, cy, cx + px, cy + py, kleur)
    lijn(ctx, cx, cy, cx + qx, cy + qy, kleur)
  }
  if (gevuld) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(cx - 1, cy - 1, 1, 1)
  }
}

function lijn(ctx, x0, y0, x1, y1, kleur) {
  ctx.fillStyle = kleur
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  let x = x0
  let y = y0
  for (let n = 0; n < 40; n++) {
    ctx.fillRect(x, y, 1, 1)
    if (x === x1 && y === y1) break
    const e2 = err * 2
    if (e2 > -dy) { err -= dy; x += sx }
    if (e2 < dx) { err += dx; y += sy }
  }
}

export function balk(ctx, x, y, w, h, deel, kleur, achter = UI.paneelLicht) {
  ctx.fillStyle = achter
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = kleur
  ctx.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, deel))), h)
  ctx.fillStyle = UI.paneelRand
  ctx.fillRect(x, y, w, 1)
  ctx.fillRect(x, y + h - 1, w, 1)
}

// Label met waarde rechts uitgelijnd binnen een breedte; gebruikt in menu's.
export function regel(ctx, x, y, w, links, rechts, kleur = UI.tekst, kleurRechts = UI.accent) {
  tekst(ctx, links, x, y, kleur)
  tekst(ctx, rechts, x + w - tekstBreedte(rechts), y, kleurRechts)
}
