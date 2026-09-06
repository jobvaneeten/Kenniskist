// Sprites voor de vijanden en gevaren van wereld 2 (IJsmaan). Losgehouden van
// objecten.js zodat dat bestand niet één lange lijst wordt.

import { Blad, nieuwCanvas } from '../core/atlas.js'
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

// --- Pinguïnrobot -----------------------------------------------------------
// Waggelt heen en weer en blijft af en toe staan om een sneeuwbal te schieten.
// Frames 0-3 lopen, 4-5 schieten (luik open).

export const PINGUIN = { w: 16, h: 20 }

export function pinguinBlad(p) {
  return eenmalig(`pinguin-${p.id}`, () => {
    const blad = new Blad(PINGUIN.w, PINGUIN.h, 6)
    const lijn = '#16233d'
    for (let i = 0; i < 6; i++) {
      const { canvas, ctx } = nieuwCanvas(PINGUIN.w, PINGUIN.h)
      const schiet = i >= 4
      const waggel = schiet ? 0 : [0, -1, 0, 1][i]
      const cy = 10 + waggel

      // Voetjes
      ctx.fillStyle = UI.accent
      const vt = schiet ? 0 : i % 2
      ctx.fillRect(3 + vt, 18, 4, 2)
      ctx.fillRect(9 - vt, 18, 4, 2)

      // Lijf: donker metaal met een lichte buik
      ellips(ctx, 8, cy, 6, 8, '#3f5a80')
      ellips(ctx, 8, cy + 1, 4, 6, '#dceaff')
      omtrek(ctx, 8, cy, 6, 8, lijn)

      // Vleugels
      ctx.fillStyle = '#2c4160'
      ctx.fillRect(1, cy - 2, 2, 6)
      ctx.fillRect(13, cy - 2, 2, 6)

      // Kop met vizier
      ellips(ctx, 8, cy - 7, 5, 4, '#3f5a80')
      omtrek(ctx, 8, cy - 7, 5, 4, lijn)
      ctx.fillStyle = schiet ? '#ff6b6b' : '#3ef0ff'
      ctx.fillRect(5, cy - 8, 7, 2)
      ctx.fillStyle = lichter('#3ef0ff', 0.5)
      ctx.fillRect(5, cy - 8, 2, 1)
      // Snavel
      ctx.fillStyle = UI.accent
      ctx.fillRect(12, cy - 6, 3, 2)

      // Schietluik in de buik
      if (schiet) {
        ctx.fillStyle = lijn
        ctx.fillRect(10, cy, 5, 4)
        ctx.fillStyle = i === 5 ? '#ffffff' : '#8fb4d8'
        ctx.fillRect(11, cy + 1, 3, 2)
      }

      blad.ctx.drawImage(canvas, i * PINGUIN.w, 0)
    }
    return blad
  })
}

// --- IJsstekel (vallende ijskegel) ------------------------------------------
// 0 = hangend, 1-2 = trillend, 3 = vallend, 4-5 = kapot.

export const IJSKEGEL = { w: 10, h: 18 }

export function ijskegelBlad() {
  return eenmalig('ijskegel', () => {
    const blad = new Blad(IJSKEGEL.w, IJSKEGEL.h, 6)
    for (let i = 0; i < 6; i++) {
      const { canvas, ctx } = nieuwCanvas(IJSKEGEL.w, IJSKEGEL.h)
      if (i >= 4) {
        // Scherven
        ctx.fillStyle = '#dceaff'
        const scherven = i === 4
          ? [[1, 12, 2, 3], [4, 14, 3, 2], [7, 11, 2, 4]]
          : [[0, 15, 2, 2], [4, 16, 2, 1], [8, 14, 2, 2]]
        for (const [x, y, w, h] of scherven) ctx.fillRect(x, y, w, h)
      } else {
        const kantel = i === 1 ? -1 : i === 2 ? 1 : 0
        // Kegel: breed bovenaan, punt onderaan
        for (let y = 0; y < 17; y++) {
          const b = Math.max(1, Math.round(4.5 * (1 - y / 17)))
          const x = 5 - b + Math.round((kantel * y) / 12)
          ctx.fillStyle = '#5f86b5'
          ctx.fillRect(x - 1, y, b * 2 + 2, 1)
          ctx.fillStyle = y < 4 ? '#ffffff' : '#bfe6ff'
          ctx.fillRect(x, y, b * 2, 1)
        }
        // Glans
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(4, 3, 1, 6)
      }
      blad.ctx.drawImage(canvas, i * IJSKEGEL.w, 0)
    }
    return blad
  })
}

// --- Sneeuwbalkanon ---------------------------------------------------------
// Staat stil, laadt zichtbaar op en vuurt dan een boog.

export const KANON = { w: 20, h: 16 }

export function kanonBlad(p) {
  return eenmalig(`kanon-${p.id}`, () => {
    const blad = new Blad(KANON.w, KANON.h, 4)
    const lijn = '#16233d'
    for (let i = 0; i < 4; i++) {
      const { canvas, ctx } = nieuwCanvas(KANON.w, KANON.h)
      const laad = i // 0 rust, 1-2 laden, 3 vuren
      // Voetstuk
      ctx.fillStyle = '#2c4160'
      ctx.fillRect(2, 9, 16, 7)
      ctx.fillStyle = '#3f5a80'
      ctx.fillRect(3, 10, 14, 3)
      ctx.fillStyle = lijn
      ctx.fillRect(2, 9, 16, 1)
      ctx.fillRect(2, 15, 16, 1)
      ctx.fillRect(2, 9, 1, 7)
      ctx.fillRect(17, 9, 1, 7)
      // Loop, schuin omhoog
      ctx.fillStyle = lijn
      for (let k = 0; k < 9; k++) ctx.fillRect(8 + k, 8 - Math.floor(k / 2), 2, 4)
      ctx.fillStyle = '#5f86b5'
      for (let k = 0; k < 8; k++) ctx.fillRect(8 + k, 9 - Math.floor(k / 2), 2, 2)
      // Laadindicator: hoe voller, hoe feller
      ctx.fillStyle = laad === 3 ? '#ffffff' : laad === 0 ? '#3f5a80' : lichter('#3ef0ff', laad * 0.2)
      ctx.fillRect(4, 11, 3, 3)
      if (laad === 3) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(16, 4, 4, 4)
      }
      blad.ctx.drawImage(canvas, i * KANON.w, 0)
    }
    return blad
  })
}

// --- Sneeuwbal (projectiel) -------------------------------------------------

export const SNEEUWBAL = { w: 8, h: 8 }

export function sneeuwbalBlad() {
  return eenmalig('sneeuwbal', () => {
    const blad = new Blad(SNEEUWBAL.w, SNEEUWBAL.h, 4)
    for (let i = 0; i < 4; i++) {
      const { canvas, ctx } = nieuwCanvas(SNEEUWBAL.w, SNEEUWBAL.h)
      ellips(ctx, 3, 3, 3, 3, '#ffffff')
      omtrek(ctx, 3, 3, 3, 3, '#8fb4d8')
      // Draaiende vlek zodat je ziet dat hij rolt
      ctx.fillStyle = '#cfe4ff'
      const hoek = (i / 4) * Math.PI * 2
      ctx.fillRect(3 + Math.round(Math.cos(hoek) * 2), 3 + Math.round(Math.sin(hoek) * 2), 2, 2)
      blad.ctx.drawImage(canvas, i * SNEEUWBAL.w, 0)
    }
    return blad
  })
}

// --- Vrieskwal --------------------------------------------------------------
// Zelfde rol als de ruimtekwal, maar met ijsstekels: ook van boven niet te
// stampen, en dat moet je kunnen zien.

export const VRIESKWAL = { w: 18, h: 20 }

export function vrieskwalBlad(p) {
  return eenmalig(`vrieskwal-${p.id}`, () => {
    const blad = new Blad(VRIESKWAL.w, VRIESKWAL.h, 4)
    for (let i = 0; i < 4; i++) {
      const { canvas, ctx } = nieuwCanvas(VRIESKWAL.w, VRIESKWAL.h)
      const ry = [5, 6, 5, 4][i]
      const cy = 8
      // Tentakels
      for (let k = 0; k < 4; k++) {
        const x = 4 + k * 3
        ctx.fillStyle = '#7fb6e8'
        const lengte = 5 + ((k + i) % 3)
        for (let y = 0; y < lengte; y++) {
          ctx.fillRect(x + Math.round(Math.sin((y + i) * 0.9 + k) * 1), cy + ry + y, 1, 1)
        }
      }
      // Klok
      ellips(ctx, 9, cy, 7, ry, '#8fc4f0')
      ellips(ctx, 9, cy - 1, 5, Math.max(1, ry - 2), '#dceaff')
      omtrek(ctx, 9, cy, 7, ry, '#2c4160')
      // IJspunten bovenop: het signaal "niet stampen"
      ctx.fillStyle = '#ffffff'
      for (const x of [4, 9, 14]) {
        ctx.fillRect(x - 1, cy - ry - 3, 3, 1)
        ctx.fillRect(x, cy - ry - 4, 1, 2)
      }
      ctx.fillStyle = '#2c4160'
      ctx.fillRect(6, cy, 2, 1)
      ctx.fillRect(11, cy, 2, 1)
      blad.ctx.drawImage(canvas, i * VRIESKWAL.w, 0)
    }
    return blad
  })
}

// --- Windvlaag: strepen die de richting laten zien --------------------------

export function tekenWind(ctx, breedte, hoogte, kracht, tijd) {
  if (Math.abs(kracht) < 4) return
  const richting = Math.sign(kracht)
  const sterkte = Math.min(1, Math.abs(kracht) / 70)
  ctx.globalAlpha = 0.1 + sterkte * 0.16
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 16; i++) {
    const y = (i * 61) % hoogte
    const lengte = 12 + ((i * 7) % 22)
    const snelheid = 90 + ((i * 13) % 60)
    let x = (tijd * snelheid * richting + i * 97) % (breedte + 60)
    if (x < 0) x += breedte + 60
    if (richting < 0) x = breedte - x
    ctx.fillRect(Math.round(x) - 30, y, lengte, 1)
  }
  ctx.globalAlpha = 1
}

export { donkerder }
