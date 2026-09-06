// Sprites voor wereld 5 (Nevelrijk): portalen, zwaartekrachtschakelaars en de
// vier wezens.

import { Blad, nieuwCanvas, ruis } from '../core/atlas.js'
import { UI, lichter, donkerder } from './palet.js'

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

// --- Portaal ----------------------------------------------------------------
// Twee portalen horen bij elkaar en krijgen dezelfde kleur, zodat je ziet waar
// je uitkomt voordat je erin springt.

export const PORTAAL = { w: 16, h: 32 }
export const PORTAAL_KLEUREN = ['#3ef0ff', '#ffd23f', '#5ef2b0', '#ff6bd6']

export function portaalBlad(kleurIndex) {
  return eenmalig(`portaal-${kleurIndex}`, () => {
    const kleur = PORTAAL_KLEUREN[kleurIndex % PORTAAL_KLEUREN.length]
    const blad = new Blad(PORTAAL.w, PORTAAL.h, 4)
    for (let i = 0; i < 4; i++) {
      const { canvas, ctx } = nieuwCanvas(PORTAAL.w, PORTAAL.h)
      // Rand
      ctx.fillStyle = donkerder(kleur, 0.6)
      ellips(ctx, 8, 16, 7, 15, donkerder(kleur, 0.6))
      ellips(ctx, 8, 16, 5, 13, donkerder(kleur, 0.25))
      // Draaikolk: ringen die per frame verschuiven
      for (let r = 12; r > 1; r -= 3) {
        const fel = (r + i * 3) % 6 < 3
        ellips(ctx, 8, 16, Math.max(1, Math.round(r * 0.38)), r, fel ? kleur : donkerder(kleur, 0.45))
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(7, 15, 2, 2)
      omtrek(ctx, 8, 16, 7, 15, UI.inkt)
      blad.ctx.drawImage(canvas, i * PORTAAL.w, 0)
    }
    return blad
  })
}

// --- Zwaartekrachtschakelaar ------------------------------------------------
// Een plaat met een pijl die de kant op wijst waar je heen valt als je hem
// aanraakt.

export const SCHAKELAAR = { w: 16, h: 16 }

export function schakelaarBlad(p) {
  return eenmalig(`schakelaar-${p.id}`, () => {
    const blad = new Blad(SCHAKELAAR.w, SCHAKELAAR.h, 4)
    for (let i = 0; i < 4; i++) {
      const { canvas, ctx } = nieuwCanvas(SCHAKELAAR.w, SCHAKELAAR.h)
      ctx.fillStyle = UI.inkt
      ctx.fillRect(0, 0, 16, 16)
      ctx.fillStyle = p.rots.m
      ctx.fillRect(1, 1, 14, 14)
      ctx.fillStyle = p.rots.h
      ctx.fillRect(1, 1, 14, 2)
      // Twee pijlen die om de beurt oplichten: omhoog en omlaag.
      const boven = i % 2 === 0
      ctx.fillStyle = boven ? lichter(p.gloed, 0.4) : donkerder(p.gloed, 0.6)
      ctx.fillRect(7, 3, 2, 4)
      ctx.fillRect(6, 4, 4, 1)
      ctx.fillRect(5, 5, 6, 1)
      ctx.fillStyle = boven ? donkerder(p.gloed, 0.6) : lichter(p.gloed, 0.4)
      ctx.fillRect(7, 9, 2, 4)
      ctx.fillRect(6, 11, 4, 1)
      ctx.fillRect(5, 10, 6, 1)
      blad.ctx.drawImage(canvas, i * SCHAKELAAR.w, 0)
    }
    return blad
  })
}

// --- Schaduwkloon -----------------------------------------------------------
// Een donkere kopie van jezelf. Bewust silhouetachtig: je moet in één blik zien
// dat hij jou is en niet jij.

export const KLOON = { w: 24, h: 28 }

export function kloonBlad() {
  return eenmalig('kloon', () => {
    const blad = new Blad(KLOON.w, KLOON.h, 4)
    for (let i = 0; i < 4; i++) {
      const { canvas, ctx } = nieuwCanvas(KLOON.w, KLOON.h)
      const bob = [0, -1, 0, 1][i]
      const cy = 14 + bob
      // Lijf als silhouet
      ellips(ctx, 12, cy - 4, 6, 6, '#1d1040')
      ellips(ctx, 12, cy + 5, 5, 6, '#1d1040')
      ctx.fillStyle = '#2c1852'
      ctx.fillRect(6, cy + 9, 4, 6)
      ctx.fillRect(14, cy + 9, 4, 6)
      // Rand van sterrenstof
      ctx.fillStyle = '#5f2bd6'
      for (let k = 0; k < 10; k++) {
        const hoek = (k / 10) * Math.PI * 2 + i * 0.4
        ctx.fillRect(
          Math.round(12 + Math.cos(hoek) * 8),
          Math.round(cy + Math.sin(hoek) * 10),
          1, 1,
        )
      }
      // Ogen
      ctx.fillStyle = '#e0a8ff'
      ctx.fillRect(9, cy - 5, 2, 2)
      ctx.fillRect(14, cy - 5, 2, 2)
      blad.ctx.drawImage(canvas, i * KLOON.w, 0)
    }
    return blad
  })
}

// --- Nanozwerm --------------------------------------------------------------

export const ZWERM = { w: 24, h: 24 }

export function zwermBlad() {
  return eenmalig('zwerm', () => {
    const blad = new Blad(ZWERM.w, ZWERM.h, 4)
    for (let i = 0; i < 4; i++) {
      const { canvas, ctx } = nieuwCanvas(ZWERM.w, ZWERM.h)
      for (let k = 0; k < 26; k++) {
        const hoek = ruis(k, 1, 9) * Math.PI * 2 + i * 0.5
        const r = 3 + ruis(k, 2, 9) * 8
        const x = Math.round(12 + Math.cos(hoek) * r)
        const y = Math.round(12 + Math.sin(hoek) * r)
        ctx.fillStyle = ruis(k, 3, 9) > 0.7 ? '#e0a8ff' : '#a45cff'
        ctx.fillRect(x, y, ruis(k, 4, 9) > 0.8 ? 2 : 1, 1)
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(11, 11, 2, 2)
      blad.ctx.drawImage(canvas, i * ZWERM.w, 0)
    }
    return blad
  })
}

// --- Zwaartekrachtwezen -----------------------------------------------------
// Trekt je naar zich toe. De ringen eromheen laten de trekrichting zien.

export const ZWAARTEWEZEN = { w: 20, h: 20 }

export function zwaartewezenBlad() {
  return eenmalig('zwaartewezen', () => {
    const blad = new Blad(ZWAARTEWEZEN.w, ZWAARTEWEZEN.h, 4)
    for (let i = 0; i < 4; i++) {
      const { canvas, ctx } = nieuwCanvas(ZWAARTEWEZEN.w, ZWAARTEWEZEN.h)
      // Ringen die naar binnen lopen
      for (let r = 9; r > 2; r -= 2) {
        const fel = (r + i * 2) % 4 < 2
        omtrek(ctx, 10, 10, r, r, fel ? '#a45cff' : donkerder('#a45cff', 0.5))
      }
      ellips(ctx, 10, 10, 3, 3, '#150d2c')
      ellips(ctx, 10, 10, 2, 2, '#e0a8ff')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(9, 9, 1, 1)
      blad.ctx.drawImage(canvas, i * ZWAARTEWEZEN.w, 0)
    }
    return blad
  })
}

// --- Echoslijm --------------------------------------------------------------
// Als het slijm van wereld 1, maar het komt terug op de plek waar je het
// verslagen hebt. De ring eromheen telt af tot het weer verschijnt.

export const ECHOSLIJM = { w: 16, h: 16 }

export function echoslijmBlad() {
  return eenmalig('echoslijm', () => {
    const blad = new Blad(ECHOSLIJM.w, ECHOSLIJM.h, 4)
    const vormen = [
      { rx: 7, ry: 5, dy: 0 }, { rx: 6, ry: 6, dy: -1 },
      { rx: 7, ry: 5, dy: 0 }, { rx: 8, ry: 4, dy: 1 },
    ]
    vormen.forEach((v, i) => {
      const { canvas, ctx } = nieuwCanvas(ECHOSLIJM.w, ECHOSLIJM.h)
      const cy = 10 + v.dy
      ellips(ctx, 8, cy, v.rx, v.ry, '#4e3690')
      ellips(ctx, 8, cy - 1, v.rx - 2, v.ry - 2, '#a45cff')
      omtrek(ctx, 8, cy, v.rx, v.ry, '#150d2c')
      ctx.fillStyle = '#e0a8ff'
      ctx.fillRect(5, cy - 2, 2, 2)
      ctx.fillRect(9, cy - 2, 2, 2)
      ctx.fillStyle = '#150d2c'
      ctx.fillRect(6, cy - 1, 1, 1)
      ctx.fillRect(10, cy - 1, 1, 1)
      blad.ctx.drawImage(canvas, i * ECHOSLIJM.w, 0)
    })
    return blad
  })
}

// Aftelring op de plek waar een echoslijm terugkomt.
export function tekenEchoRing(ctx, x, y, deel) {
  ctx.fillStyle = '#5f2bd6'
  const n = Math.round(16 * deel)
  for (let k = 0; k < n; k++) {
    const hoek = (k / 16) * Math.PI * 2 - Math.PI / 2
    ctx.fillRect(Math.round(x + Math.cos(hoek) * 9), Math.round(y + Math.sin(hoek) * 9), 1, 1)
  }
}
