// Sprites en effecten voor wereld 3 (Vulkaanplaneet): geisers, stijgende lava
// en de vier vijanden.

import { Blad, nieuwCanvas, ruis } from '../core/atlas.js'
import { lichter, donkerder } from './palet.js'

const cache = new Map()
function eenmalig(sleutel, maak) {
  if (!cache.has(sleutel)) cache.set(sleutel, maak())
  return cache.get(sleutel)
}

function ellips(ctx, cx, cy, rx, ry, kleur) {
  ctx.fillStyle = kleur
  for (let y = -ry; y <= ry; y++) {
    const b = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))))
    ctx.fillRect(Math.round(cx - b), Math.round(cy + y), b * 2 + 1, 1)
  }
}

function omtrek(ctx, cx, cy, rx, ry, kleur) {
  ctx.fillStyle = kleur
  for (let y = -ry; y <= ry; y++) {
    const b = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))))
    ctx.fillRect(Math.round(cx - b - 1), Math.round(cy + y), 1, 1)
    ctx.fillRect(Math.round(cx + b + 1), Math.round(cy + y), 1, 1)
  }
  ctx.fillRect(Math.round(cx - rx), Math.round(cy - ry - 1), rx * 2 + 1, 1)
  ctx.fillRect(Math.round(cx - rx), Math.round(cy + ry + 1), rx * 2 + 1, 1)
}

// --- Geiser -----------------------------------------------------------------
// De mond in de vloer; de straal zelf wordt per frame getekend omdat hij van
// hoogte verandert.

export const GEISERMOND = { w: 16, h: 8 }

export function geiserBlad(p) {
  return eenmalig(`geiser-${p.id}`, () => {
    const blad = new Blad(GEISERMOND.w, GEISERMOND.h, 3) // rust, laden, actief
    for (let i = 0; i < 3; i++) {
      const { canvas, ctx } = nieuwCanvas(GEISERMOND.w, GEISERMOND.h)
      ctx.fillStyle = p.rots.o
      ctx.fillRect(0, 0, 16, 8)
      ctx.fillStyle = p.rots.m
      ctx.fillRect(1, 1, 14, 6)
      ctx.fillStyle = p.rots.s
      ctx.fillRect(3, 2, 10, 5)
      const gloed = i === 0 ? donkerder('#ff8c1a', 0.55) : i === 1 ? '#ff8c1a' : '#ffd76b'
      ctx.fillStyle = gloed
      ctx.fillRect(4, 2, 8, 3)
      ctx.fillStyle = lichter(gloed, 0.4)
      ctx.fillRect(5, 2, 6, 1)
      blad.ctx.drawImage(canvas, i * GEISERMOND.w, 0)
    }
    return blad
  })
}

// Straal: een kolom die smaller wordt naar boven, met flikkerende randen.
export function tekenGeiserStraal(ctx, x, y, hoogte, tijd) {
  if (hoogte <= 0) return
  for (let dy = 0; dy < hoogte; dy++) {
    const t = dy / hoogte
    const b = Math.max(1, Math.round(6 * (1 - t * 0.55) + Math.sin(tijd * 22 + dy * 0.35) * 1.4))
    ctx.fillStyle = '#ff8c1a'
    ctx.fillRect(Math.round(x - b), Math.round(y - dy), b * 2, 1)
    ctx.fillStyle = t < 0.6 ? '#ffd76b' : '#ffe9a8'
    ctx.fillRect(Math.round(x - b + 2), Math.round(y - dy), Math.max(1, b * 2 - 4), 1)
  }
}

// --- Stijgende lava ---------------------------------------------------------
// Eén vlak met een golvende bovenrand en een gloed erboven. Wordt per frame
// getekend omdat het niveau verandert, maar het is maar een handvol fillRects
// per beeldbreedte.

export function tekenLavaVlak(ctx, breedte, top, hoogte, tijd) {
  if (top > hoogte) return
  const golf = (x) => Math.round(Math.sin(x * 0.06 + tijd * 2.2) * 2 + Math.sin(x * 0.13 - tijd * 1.4) * 1.5)

  // Gloed boven het oppervlak
  ctx.globalAlpha = 0.22
  ctx.fillStyle = '#ff7a2a'
  ctx.fillRect(0, Math.max(0, top - 14), breedte, 14)
  ctx.globalAlpha = 1

  for (let x = 0; x < breedte; x++) {
    const y = Math.round(top + golf(x))
    ctx.fillStyle = '#ff8c1a'
    ctx.fillRect(x, y, 1, hoogte - y)
    ctx.fillStyle = '#ffd76b'
    ctx.fillRect(x, y, 1, 2)
    ctx.fillStyle = '#d43c08'
    ctx.fillRect(x, y + 6, 1, 2)
  }

  // Lichte vlekken die meedrijven
  ctx.fillStyle = '#ffe9a8'
  for (let i = 0; i < 18; i++) {
    const x = Math.round((ruis(i, 3, 21) * breedte + tijd * 9) % breedte)
    const y = Math.round(top + golf(x) + 4 + ruis(i, 4, 21) * 10)
    if (y < hoogte) ctx.fillRect(x, y, 2, 1)
  }
}

// --- Lavaspetter ------------------------------------------------------------

export const SPETTER = { w: 12, h: 14 }

export function spetterBlad() {
  return eenmalig('spetter', () => {
    const blad = new Blad(SPETTER.w, SPETTER.h, 4)
    for (let i = 0; i < 4; i++) {
      const { canvas, ctx } = nieuwCanvas(SPETTER.w, SPETTER.h)
      const rek = [0, 1, 0, -1][i]
      ellips(ctx, 6, 7, 4 - rek, 5 + rek, '#ff8c1a')
      ellips(ctx, 6, 6, 2, 3 + rek, '#ffd76b')
      omtrek(ctx, 6, 7, 4 - rek, 5 + rek, '#a3260a')
      // Druppel die achterblijft
      ctx.fillStyle = '#ff8c1a'
      ctx.fillRect(5, 12 + Math.min(1, rek), 2, 2)
      blad.ctx.drawImage(canvas, i * SPETTER.w, 0)
    }
    return blad
  })
}

// --- Vuurvleermuis ----------------------------------------------------------
// Hangt stil tot je in de buurt komt en duikt dan.

export const VLEERMUIS = { w: 18, h: 14 }

export function vleermuisBlad() {
  return eenmalig('vleermuis', () => {
    const blad = new Blad(VLEERMUIS.w, VLEERMUIS.h, 5) // 0 hangt, 1-4 vliegen
    for (let i = 0; i < 5; i++) {
      const { canvas, ctx } = nieuwCanvas(VLEERMUIS.w, VLEERMUIS.h)
      const hangt = i === 0
      const slag = hangt ? 0 : [0, -3, 0, 3][(i - 1) % 4]
      const cy = hangt ? 8 : 7

      // Vleugels
      ctx.fillStyle = '#a3260a'
      for (const kant of [-1, 1]) {
        for (let k = 0; k < 6; k++) {
          const x = 9 + kant * (3 + k)
          const y = cy - 2 + Math.round((slag * k) / 6)
          ctx.fillRect(x, y, 1, 4 - Math.floor(k / 3))
        }
      }
      ctx.fillStyle = '#e5561f'
      for (const kant of [-1, 1]) {
        for (let k = 0; k < 5; k++) {
          const x = 9 + kant * (3 + k)
          const y = cy - 1 + Math.round((slag * k) / 6)
          ctx.fillRect(x, y, 1, 2)
        }
      }

      // Lijf
      ellips(ctx, 9, cy, 3, 4, '#e5561f')
      ellips(ctx, 9, cy - 1, 2, 2, '#ff9b3d')
      omtrek(ctx, 9, cy, 3, 4, '#5a1204')
      // Ogen
      ctx.fillStyle = '#ffe14d'
      ctx.fillRect(7, cy - 1, 2, 2)
      ctx.fillRect(10, cy - 1, 2, 2)
      // Oortjes
      ctx.fillStyle = '#a3260a'
      ctx.fillRect(7, cy - 6, 2, 3)
      ctx.fillRect(10, cy - 6, 2, 3)

      blad.ctx.drawImage(canvas, i * VLEERMUIS.w, 0)
    }
    return blad
  })
}

// --- Magmakrab --------------------------------------------------------------
// Pantser aan de bovenkant, dus niet te stampen. De gloeiende naden aan de
// zijkant laten zien waar hij wél kwetsbaar zou zijn.

export const KRAB = { w: 22, h: 14 }

export function krabBlad() {
  return eenmalig('krab', () => {
    const blad = new Blad(KRAB.w, KRAB.h, 4)
    for (let i = 0; i < 4; i++) {
      const { canvas, ctx } = nieuwCanvas(KRAB.w, KRAB.h)
      const stap = i % 2
      // Poten
      ctx.fillStyle = '#5a1204'
      for (let k = 0; k < 3; k++) {
        const x = 3 + k * 6
        ctx.fillRect(x, 10, 2, 3 - (k + stap) % 2)
        ctx.fillRect(x + 2, 12, 2, 1)
      }
      // Schild
      ellips(ctx, 11, 7, 9, 5, '#472720')
      ellips(ctx, 11, 6, 7, 3, '#6b4038')
      omtrek(ctx, 11, 7, 9, 5, '#140809')
      // Gloeiende naden
      ctx.fillStyle = '#ff8c1a'
      ctx.fillRect(4, 8, 3, 1)
      ctx.fillRect(15, 8, 3, 1)
      ctx.fillStyle = '#ffd76b'
      ctx.fillRect(9, 4, 4, 1)
      // Scharen
      ctx.fillStyle = '#472720'
      ctx.fillRect(0, 5 - stap, 4, 4)
      ctx.fillRect(18, 5 + stap, 4, 4)
      ctx.fillStyle = '#e5561f'
      ctx.fillRect(1, 6 - stap, 2, 2)
      ctx.fillRect(19, 6 + stap, 2, 2)
      // Ogen
      ctx.fillStyle = '#ffe14d'
      ctx.fillRect(8, 3, 2, 2)
      ctx.fillRect(12, 3, 2, 2)
      blad.ctx.drawImage(canvas, i * KRAB.w, 0)
    }
    return blad
  })
}

// --- Asvlieg ----------------------------------------------------------------
// Zweeft traag naar de speler toe. Eén los exemplaar is niet gevaarlijk; met
// vier tegelijk moet je je route kiezen.

export const ASVLIEG = { w: 12, h: 12 }

export function asvliegBlad() {
  return eenmalig('asvlieg', () => {
    const blad = new Blad(ASVLIEG.w, ASVLIEG.h, 4)
    for (let i = 0; i < 4; i++) {
      const { canvas, ctx } = nieuwCanvas(ASVLIEG.w, ASVLIEG.h)
      const slag = [0, 2, 0, -2][i]
      ctx.fillStyle = '#3a2a2e'
      ctx.fillRect(1, 5 + slag, 4, 1)
      ctx.fillRect(7, 5 - slag, 4, 1)
      ellips(ctx, 6, 6, 3, 3, '#26191d')
      ellips(ctx, 6, 5, 2, 2, '#6b4038')
      omtrek(ctx, 6, 6, 3, 3, '#0a0507')
      ctx.fillStyle = '#ff8c1a'
      ctx.fillRect(5, 5, 1, 1)
      ctx.fillRect(7, 5, 1, 1)
      blad.ctx.drawImage(canvas, i * ASVLIEG.w, 0)
    }
    return blad
  })
}

// --- Hitteflikkering --------------------------------------------------------
// Een paar horizontale banden die licht op en neer schuiven. Geen echte
// vervorming (dat zou het beeld per frame opnieuw moeten samplen), maar wel
// het gevoel van hete lucht.

export function tekenHitte(ctx, breedte, hoogte, tijd, sterkte = 1) {
  ctx.globalAlpha = 0.05 * sterkte
  ctx.fillStyle = '#ff9b3d'
  for (let i = 0; i < 7; i++) {
    const y = ((i * 41 + tijd * 16) % (hoogte + 40)) - 20
    const h = 6 + Math.sin(tijd * 2 + i) * 3
    ctx.fillRect(0, Math.round(y), breedte, Math.round(h))
  }
  ctx.globalAlpha = 1
}
