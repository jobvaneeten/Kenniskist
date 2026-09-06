// Tilesets. Per wereld één keer gebakken: 16 autotile-varianten per soort
// (buurmasker 1=boven 2=rechts 4=onder 8=links) plus twee textuurvarianten per
// variant, zodat een vlakke vloer niet uit identieke blokjes bestaat.

import { Blad, nieuwCanvas, ruis } from '../core/atlas.js'
import { donkerder, lichter } from './palet.js'
import { T } from '../engine/tilemap.js'

export const TEGEL = 16
const VARIANTEN = 2

const cache = new Map()

function px(ctx, kleur, x, y, w = 1, h = 1) {
  ctx.fillStyle = kleur
  ctx.fillRect(x, y, w, h)
}

// --- Grond -----------------------------------------------------------------

function tekenGrond(ctx, p, masker, variant) {
  const boven = masker & 1
  const rechts = masker & 2
  const onder = masker & 4
  const links = masker & 8

  // Basis: rots, met stevige korrel. Zonder die korrel wordt een vloer van
  // twintig tegels één egale donkere balk.
  px(ctx, p.rots.m, 0, 0, TEGEL, TEGEL)
  for (let y = 0; y < TEGEL; y++) {
    for (let x = 0; x < TEGEL; x++) {
      const r = ruis(x, y, variant * 7 + 1)
      if (r > 0.78) px(ctx, p.rots.s, x, y)
      else if (r < 0.18) px(ctx, p.rots.h, x, y)
    }
  }
  // Grotere brokken: geeft de rots schaal in plaats van alleen ruis.
  for (let i = 0; i < 3; i++) {
    const bx = Math.floor(ruis(i, variant, 55) * 12)
    const by = Math.floor(ruis(i, variant, 77) * 11) + 4
    px(ctx, p.rots.h, bx, by, 3, 1)
    px(ctx, p.rots.s, bx, by + 1, 3, 1)
  }

  // Bovenkant open: een dikke laag "grond" met een lichte rand en begroeiing.
  if (!boven) {
    px(ctx, p.grond.s, 0, 0, TEGEL, 8)
    px(ctx, p.grond.m, 0, 0, TEGEL, 6)
    px(ctx, p.grond.h, 0, 0, TEGEL, 3)
    px(ctx, lichter(p.grond.h, 0.45), 0, 0, TEGEL, 1)
    // Onregelmatige overgang naar de rots eronder.
    for (let x = 0; x < TEGEL; x++) {
      if (ruis(x, 3, variant * 13) > 0.5) px(ctx, p.grond.s, x, 8)
      if (ruis(x, 9, variant * 17) > 0.72) px(ctx, p.grond.s, x, 9)
    }
    // Sprietjes / kristalletjes op de rand.
    for (let x = 1; x < TEGEL; x += 3) {
      if (ruis(x, variant, 31) > 0.4) {
        px(ctx, lichter(p.deco[0], 0.3), x, 0, 1, 1)
        px(ctx, p.deco[0], x, 1, 1, 2)
      }
    }
  }

  // Randen: 1px outline waar geen buur zit, plus een lichte binnenrand.
  if (!links) { px(ctx, p.rots.o, 0, 0, 1, TEGEL); if (!boven) px(ctx, p.grond.o, 0, 0, 1, 9) }
  if (!rechts) { px(ctx, p.rots.o, TEGEL - 1, 0, 1, TEGEL); if (!boven) px(ctx, p.grond.o, TEGEL - 1, 0, 1, 9) }
  if (!onder) px(ctx, p.rots.o, 0, TEGEL - 1, TEGEL, 1)
  if (!boven) px(ctx, p.grond.o, 0, 0, TEGEL, 1)

  // Binnenhoeken afronden zodat een L-vorm er niet uitgeknipt uitziet.
  if (!boven && !links) { px(ctx, p.rots.o, 1, 0, 1, 1); px(ctx, p.grond.h, 1, 1, 1, 1) }
  if (!boven && !rechts) { px(ctx, p.rots.o, TEGEL - 2, 0, 1, 1); px(ctx, p.grond.h, TEGEL - 2, 1, 1, 1) }
  if (!onder && !links) px(ctx, p.rots.o, 1, TEGEL - 1, 1, 1)
  if (!onder && !rechts) px(ctx, p.rots.o, TEGEL - 2, TEGEL - 1, 1, 1)
}

// --- Platform (van onderaf doorheen) ---------------------------------------

function tekenPlatform(ctx, p, masker, variant) {
  const links = masker & 8
  const rechts = masker & 2
  px(ctx, p.grond.m, 0, 0, TEGEL, 6)
  px(ctx, p.grond.h, 0, 0, TEGEL, 2)
  px(ctx, p.grond.o, 0, 0, TEGEL, 1)
  px(ctx, p.grond.s, 0, 5, TEGEL, 1)
  px(ctx, p.grond.o, 0, 6, TEGEL, 1)
  if (!links) px(ctx, p.grond.o, 0, 0, 1, 7)
  if (!rechts) px(ctx, p.grond.o, TEGEL - 1, 0, 1, 7)
  // Draagbalkjes eronder: maakt duidelijk dat het een platform is en geen vloer.
  for (let x = 2; x < TEGEL - 2; x += 5) {
    if (ruis(x, variant, 3) > 0.3) px(ctx, p.rots.m, x, 7, 2, 3)
  }
}

// --- Stekels ---------------------------------------------------------------

function tekenStekels(ctx, p) {
  const punt = lichter(p.deco[2], 0.35)
  for (let i = 0; i < 4; i++) {
    const x0 = i * 4
    for (let y = 0; y < 10; y++) {
      const breedte = Math.max(1, Math.round((y / 9) * 3))
      const x = x0 + 2 - Math.floor(breedte / 2)
      px(ctx, y < 4 ? punt : p.deco[2], x, TEGEL - 10 + y, breedte, 1)
    }
    px(ctx, p.rots.o, x0, TEGEL - 1, 4, 1)
  }
  px(ctx, p.rots.m, 0, TEGEL - 3, TEGEL, 3)
  px(ctx, p.rots.o, 0, TEGEL - 1, TEGEL, 1)
  // Punten opnieuw over de basis zodat ze er bovenuit steken.
  for (let i = 0; i < 4; i++) {
    const x0 = i * 4
    for (let y = 0; y < 12; y++) {
      const breedte = Math.max(1, Math.round((y / 11) * 4))
      const x = x0 + 2 - Math.floor(breedte / 2)
      px(ctx, y < 5 ? punt : p.deco[2], x, TEGEL - 13 + y, breedte, 1)
    }
  }
}

// --- Breekbaar / verborgen -------------------------------------------------

function tekenBreekbaar(ctx, p, variant) {
  px(ctx, p.rots.m, 0, 0, TEGEL, TEGEL)
  px(ctx, p.rots.h, 1, 1, TEGEL - 2, 1)
  px(ctx, p.rots.s, 1, TEGEL - 2, TEGEL - 2, 1)
  px(ctx, p.rots.o, 0, 0, TEGEL, 1)
  px(ctx, p.rots.o, 0, TEGEL - 1, TEGEL, 1)
  px(ctx, p.rots.o, 0, 0, 1, TEGEL)
  px(ctx, p.rots.o, TEGEL - 1, 0, 1, TEGEL)
  // Barsten: het blok moet er kapot uitzien vóórdat je het slaat.
  const naden = variant === 0
    ? [[4, 2, 1, 5], [11, 3, 1, 4], [3, 9, 1, 5], [10, 8, 1, 6], [5, 7, 6, 1]]
    : [[6, 2, 1, 6], [3, 4, 1, 3], [12, 5, 1, 6], [7, 9, 1, 5], [3, 11, 8, 1]]
  for (const [x, y, w, h] of naden) px(ctx, p.rots.o, x, y, w, h)
}

function tekenVerborgen(ctx, p) {
  px(ctx, p.deco[1], 0, 0, TEGEL, TEGEL)
  px(ctx, lichter(p.deco[1], 0.4), 1, 1, TEGEL - 2, 2)
  px(ctx, donkerder(p.deco[1], 0.4), 1, TEGEL - 3, TEGEL - 2, 2)
  px(ctx, p.rots.o, 0, 0, TEGEL, 1)
  px(ctx, p.rots.o, 0, TEGEL - 1, TEGEL, 1)
  px(ctx, p.rots.o, 0, 0, 1, TEGEL)
  px(ctx, p.rots.o, TEGEL - 1, 0, 1, TEGEL)
  // Vraagteken van losse pixels; leest ook op 480×270.
  const q = [[6, 4, 4, 1], [9, 5, 1, 2], [7, 7, 3, 1], [7, 8, 1, 2], [7, 11, 2, 2]]
  for (const [x, y, w, h] of q) px(ctx, p.rots.o, x, y, w, h)
}

// --- Vloeistof (lava) ------------------------------------------------------

function tekenLava(ctx, p, masker, variant) {
  const v = p.vloeistof ?? { h: '#ffd76b', m: '#ff8c1a', s: '#d43c08' }
  px(ctx, v.m, 0, 0, TEGEL, TEGEL)
  for (let y = 0; y < TEGEL; y++) {
    for (let x = 0; x < TEGEL; x++) {
      const r = ruis(x, y, variant * 5 + 9)
      if (r > 0.82) px(ctx, v.h, x, y)
      else if (r < 0.14) px(ctx, v.s, x, y)
    }
  }
  if (!(masker & 1)) {
    px(ctx, v.h, 0, 0, TEGEL, 2)
    for (let x = 0; x < TEGEL; x += 2) {
      if (ruis(x, variant, 17) > 0.5) px(ctx, lichter(v.h, 0.5), x, 0, 2, 1)
    }
  }
}

// --- IJs en lopende banden -------------------------------------------------

function tekenIjs(ctx, p, masker, variant) {
  tekenGrond(ctx, p, masker, variant)
  ctx.globalAlpha = 0.55
  px(ctx, '#cfefff', 0, 0, TEGEL, TEGEL)
  ctx.globalAlpha = 1
  if (!(masker & 1)) {
    px(ctx, '#ffffff', 0, 0, TEGEL, 2)
    px(ctx, '#e4f6ff', 0, 2, TEGEL, 1)
  }
  // Glans: twee diagonale streepjes.
  for (let i = 0; i < 4; i++) px(ctx, '#ffffff', 3 + i, 7 + i)
  for (let i = 0; i < 3; i++) px(ctx, '#ffffff', 10 + i, 5 + i)
}

// Dun ijs: doorschijnend, met een paar haarscheurtjes die al zichtbaar zijn
// vóór je erop stapt. Je moet kunnen zien dat het niet houdt.
function tekenBroos(ctx, p, masker, variant) {
  const boven = masker & 1
  px(ctx, '#bfe6ff', 0, 0, TEGEL, TEGEL)
  ctx.globalAlpha = 0.55
  px(ctx, '#7fb6e8', 0, 0, TEGEL, TEGEL)
  ctx.globalAlpha = 1
  if (!boven) {
    px(ctx, '#ffffff', 0, 0, TEGEL, 2)
    px(ctx, '#e4f6ff', 0, 2, TEGEL, 1)
  }
  px(ctx, '#5f86b5', 0, 0, TEGEL, 1)
  px(ctx, '#5f86b5', 0, TEGEL - 1, TEGEL, 1)
  px(ctx, '#5f86b5', 0, 0, 1, TEGEL)
  px(ctx, '#5f86b5', TEGEL - 1, 0, 1, TEGEL)
  const naden = variant === 0
    ? [[5, 3, 1, 6], [4, 9, 6, 1], [11, 5, 1, 7]]
    : [[3, 4, 1, 8], [9, 2, 1, 6], [8, 8, 5, 1]]
  for (const [x, y, w, h] of naden) px(ctx, '#8fb4d8', x, y, w, h)
}

// Scheurpatroon dat over de tegel heen komt zodra je erop staat. Wordt door de
// levelscène getekend, niet in de chunk gebakken: het duurt maar een halve
// seconde en zou anders de hele chunk opnieuw laten bakken.
export function tekenBarst(ctx, x, y, deel) {
  const stappen = Math.min(4, 1 + Math.floor((1 - deel) * 4))
  const lijnen = [
    [8, 2, 1, 6], [4, 5, 4, 1], [8, 8, 5, 1], [3, 9, 1, 5],
    [12, 9, 1, 4], [6, 11, 4, 1], [2, 3, 3, 1], [10, 12, 1, 3],
  ]
  ctx.fillStyle = '#3f6390'
  for (let i = 0; i < stappen * 2 && i < lijnen.length; i++) {
    const [dx, dy, w, h] = lijnen[i]
    ctx.fillRect(x + dx, y + dy, w, h)
  }
}

function tekenBand(ctx, p, richting, variant) {
  px(ctx, p.rots.s, 0, 0, TEGEL, TEGEL)
  px(ctx, p.rots.m, 0, 2, TEGEL, 10)
  px(ctx, p.rots.o, 0, 0, TEGEL, 2)
  px(ctx, p.rots.o, 0, 12, TEGEL, 2)
  // Pijlen die de richting aangeven; de variant schuift ze op zodat de band
  // lijkt te lopen als je de varianten na elkaar toont.
  const off = variant * 4
  for (let i = -1; i < 3; i++) {
    const x = ((i * 8 + off) % TEGEL + TEGEL) % TEGEL
    for (let k = 0; k < 4; k++) {
      const dx = richting > 0 ? k : 3 - k
      px(ctx, p.deco[0], (x + dx) % TEGEL, 6 - Math.abs(k - 1), 1, 1 + Math.abs(k - 1) * 2)
    }
  }
}

// --- Bakken ----------------------------------------------------------------

function bakSoort(p, soort) {
  const blad = new Blad(TEGEL, TEGEL, 16 * VARIANTEN)
  for (let masker = 0; masker < 16; masker++) {
    for (let v = 0; v < VARIANTEN; v++) {
      const { canvas, ctx } = nieuwCanvas(TEGEL, TEGEL)
      switch (soort) {
        case T.VAST: tekenGrond(ctx, p, masker, v); break
        case T.PLATFORM: tekenPlatform(ctx, p, masker, v); break
        case T.STEKEL: tekenStekels(ctx, p); break
        case T.BREEKBAAR: tekenBreekbaar(ctx, p, v); break
        case T.VERBORGEN: tekenVerborgen(ctx, p); break
        case T.LAVA: tekenLava(ctx, p, masker, v); break
        case T.IJS: tekenIjs(ctx, p, masker, v); break
        case T.BROOS: tekenBroos(ctx, p, masker, v); break
        case T.BAND_LINKS: tekenBand(ctx, p, -1, v + masker % 4); break
        case T.BAND_RECHTS: tekenBand(ctx, p, 1, v + masker % 4); break
        default: break
      }
      blad.ctx.drawImage(canvas, (masker * VARIANTEN + v) * TEGEL, 0)
    }
  }
  return blad
}

export function tileset(palet) {
  if (cache.has(palet.id)) return cache.get(palet.id)
  const soorten = {}
  for (const soort of [T.VAST, T.PLATFORM, T.STEKEL, T.BREEKBAAR, T.VERBORGEN, T.LAVA, T.IJS, T.BROOS, T.BAND_LINKS, T.BAND_RECHTS]) {
    soorten[soort] = bakSoort(palet, soort)
  }
  const uit = { soorten, varianten: VARIANTEN }
  cache.set(palet.id, uit)
  return uit
}

// Framenummer binnen het blad voor een tegel op (tx, ty).
export function tegelFrame(masker, tx, ty) {
  const v = ruis(tx, ty, 101) > 0.5 ? 1 : 0
  return masker * VARIANTEN + v
}
