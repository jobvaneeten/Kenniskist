// Bazen. Groot genoeg (64-128 px) om ze met vormen op te bouwen in plaats van
// met losse pixelstrings; het silhouet moet op 480×270 in één oogopslag te
// lezen zijn.

import { Blad, nieuwCanvas } from '../core/atlas.js'
import { UI, lichter, donkerder } from './palet.js'

export const KONINGIN = { w: 64, h: 48 }
export const SLIJMBAL = { w: 10, h: 10 }

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
}

const cache = new Map()

// fase 1-3 verandert de kleur en de kroon, zodat je aan haar kunt zien hoe ver
// het gevecht is zonder naar de balk te kijken.
export function koninginBlad(palet, fase) {
  const sleutel = `kon-${palet.id}-${fase}`
  if (cache.has(sleutel)) return cache.get(sleutel)

  const basis = fase === 1 ? palet.deco[1] : fase === 2 ? palet.deco[2] : lichter(palet.deco[2], 0.15)
  const licht = lichter(basis, 0.3)
  const lijn = palet.rots.o

  // 0-3 idle, 4 hurken, 5 sprong, 6 landing, 7 spugen, 8 geraakt, 9-11 dood
  const poses = [
    { rx: 26, ry: 17, dy: 0, mond: 0, ogen: 'open' },
    { rx: 25, ry: 18, dy: -1, mond: 0, ogen: 'open' },
    { rx: 26, ry: 17, dy: 0, mond: 0, ogen: 'open' },
    { rx: 27, ry: 16, dy: 1, mond: 0, ogen: 'open' },
    { rx: 30, ry: 12, dy: 5, mond: 0, ogen: 'boos' },
    { rx: 22, ry: 21, dy: -4, mond: 0, ogen: 'boos' },
    { rx: 31, ry: 11, dy: 6, mond: 0, ogen: 'dicht' },
    { rx: 26, ry: 17, dy: 0, mond: 1, ogen: 'boos' },
    { rx: 28, ry: 14, dy: 3, mond: 1, ogen: 'kruis' },
    { rx: 29, ry: 12, dy: 5, mond: 1, ogen: 'kruis' },
    { rx: 31, ry: 8, dy: 9, mond: 1, ogen: 'kruis' },
    { rx: 33, ry: 4, dy: 13, mond: 0, ogen: 'kruis' },
  ]

  const blad = new Blad(KONINGIN.w, KONINGIN.h, poses.length)
  poses.forEach((pose, i) => {
    const { canvas, ctx } = nieuwCanvas(KONINGIN.w, KONINGIN.h)
    const cx = 32
    const cy = 30 + pose.dy

    // Lijf
    ellips(ctx, cx, cy, pose.rx, pose.ry, basis)
    ellips(ctx, cx, cy - 2, pose.rx - 6, pose.ry - 5, licht)
    omtrek(ctx, cx, cy, pose.rx, pose.ry, lijn)

    // Druppels die van haar afglijden
    ctx.fillStyle = basis
    for (const dx of [-18, -6, 8, 18]) {
      const h = 3 + ((i + dx) % 3)
      ctx.fillRect(cx + dx, cy + pose.ry - 1, 2, h)
    }

    // Kroon: één punt per fase erbij
    const punten = 4 - fase // 3, 2, 1 — ze verliest haar kroon
    ctx.fillStyle = UI.accent
    const kroonY = cy - pose.ry - 6
    ctx.fillRect(cx - 11, kroonY + 4, 22, 3)
    for (let k = 0; k < 5; k++) {
      if (k >= punten + 1) continue
      const x = cx - 10 + k * 5
      ctx.fillRect(x, kroonY, 3, 5)
      ctx.fillStyle = lichter(UI.accent, 0.5)
      ctx.fillRect(x, kroonY, 1, 2)
      ctx.fillStyle = UI.accent
    }
    ctx.fillStyle = donkerder(UI.accent, 0.4)
    ctx.fillRect(cx - 11, kroonY + 6, 22, 1)

    // Ogen
    const oogY = cy - 4
    if (pose.ogen === 'kruis') {
      ctx.fillStyle = lijn
      for (const ox of [-11, 6]) {
        for (let k = 0; k < 5; k++) {
          ctx.fillRect(cx + ox + k, oogY + k, 1, 1)
          ctx.fillRect(cx + ox + 4 - k, oogY + k, 1, 1)
        }
      }
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(cx - 12, oogY, 7, 6)
      ctx.fillRect(cx + 5, oogY, 7, 6)
      ctx.fillStyle = lijn
      const kijk = pose.ogen === 'boos' ? 1 : 0
      ctx.fillRect(cx - 10 + kijk, oogY + 2, 3, 3)
      ctx.fillRect(cx + 7 + kijk, oogY + 2, 3, 3)
      if (pose.ogen === 'boos') {
        ctx.fillRect(cx - 12, oogY - 1, 7, 2)
        ctx.fillRect(cx + 5, oogY - 1, 7, 2)
      }
      if (pose.ogen === 'dicht') {
        ctx.fillStyle = basis
        ctx.fillRect(cx - 12, oogY, 7, 4)
        ctx.fillRect(cx + 5, oogY, 7, 4)
        ctx.fillStyle = lijn
        ctx.fillRect(cx - 12, oogY + 3, 7, 1)
        ctx.fillRect(cx + 5, oogY + 3, 7, 1)
      }
    }

    // Mond
    ctx.fillStyle = lijn
    if (pose.mond) {
      ellips(ctx, cx, cy + 6, 6, 4, lijn)
      ellips(ctx, cx, cy + 7, 4, 2, donkerder(basis, 0.5))
    } else {
      ctx.fillRect(cx - 4, cy + 6, 9, 1)
      ctx.fillRect(cx - 5, cy + 5, 1, 1)
      ctx.fillRect(cx + 5, cy + 5, 1, 1)
    }

    blad.ctx.drawImage(canvas, i * KONINGIN.w, 0)
  })

  cache.set(sleutel, blad)
  return blad
}

export const KON_FRAME = {
  IDLE: 0, HURK: 4, SPRONG: 5, LANDING: 6, SPUGEN: 7, GERAAKT: 8, DOOD: 9,
}

export function slijmbalBlad(palet) {
  const sleutel = `bal-${palet.id}`
  if (cache.has(sleutel)) return cache.get(sleutel)
  const blad = new Blad(SLIJMBAL.w, SLIJMBAL.h, 4)
  for (let i = 0; i < 4; i++) {
    const { canvas, ctx } = nieuwCanvas(SLIJMBAL.w, SLIJMBAL.h)
    const r = 4 - (i % 2 === 0 ? 0 : 1)
    ellips(ctx, 5, 5, r, 4, palet.deco[2])
    ellips(ctx, 5, 4, r - 2, 2, lichter(palet.deco[2], 0.4))
    omtrek(ctx, 5, 5, r, 4, palet.rots.o)
    blad.ctx.drawImage(canvas, i * SLIJMBAL.w, 0)
  }
  cache.set(sleutel, blad)
  return blad
}

// Levensbalk van de baas: apart getekend zodat elke baas dezelfde balk krijgt.
export function tekenLevensbalk(ctx, x, y, w, deel, naam, fase) {
  ctx.fillStyle = 'rgba(10,7,19,0.8)'
  ctx.fillRect(x - 2, y - 2, w + 4, 12)
  ctx.fillStyle = UI.paneelLicht
  ctx.fillRect(x, y, w, 6)
  ctx.fillStyle = fase === 3 ? UI.fout : fase === 2 ? UI.accent : UI.goed
  ctx.fillRect(x, y, Math.round(w * Math.max(0, deel)), 6)
  ctx.fillStyle = UI.paneelRand
  ctx.fillRect(x, y, w, 1)
  ctx.fillRect(x, y + 5, w, 1)
  // Scheidingsstreepjes tussen de drie fases
  ctx.fillStyle = UI.inkt
  ctx.fillRect(x + Math.round(w / 3), y, 1, 6)
  ctx.fillRect(x + Math.round((w * 2) / 3), y, 1, 6)
  return naam
}
