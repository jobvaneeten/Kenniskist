// Munten, veren, checkpoints, capsules, de finish en de vijanden van wereld 1.
// Allemaal één keer gebakken naar een blad; daarna alleen nog blitten.

import { Blad, nieuwCanvas } from '../core/atlas.js'
import { UI, donkerder, lichter } from './palet.js'

const cache = new Map()
function eenmalig(sleutel, maak) {
  if (!cache.has(sleutel)) cache.set(sleutel, maak())
  return cache.get(sleutel)
}

// Gevulde ellips op hele pixels — de bouwsteen voor bijna alle ronde vormen.
function ellips(ctx, cx, cy, rx, ry, kleur) {
  ctx.fillStyle = kleur
  for (let y = -ry; y <= ry; y++) {
    const b = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))))
    if (b >= 0) ctx.fillRect(Math.round(cx - b), Math.round(cy + y), b * 2 + 1, 1)
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

// --- Munt ------------------------------------------------------------------
// 8 frames draaiing. De smalste frames krijgen een lichte kern zodat de munt
// ook op zijn kant nog leest.

export const MUNT = { w: 12, h: 12 }

export function muntBlad(geest = false) {
  return eenmalig(geest ? 'munt-geest' : 'munt', () => {
    const breedtes = [5, 4, 3, 1, 1, 3, 4, 5]
    const blad = new Blad(MUNT.w, MUNT.h, breedtes.length)
    breedtes.forEach((rx, i) => {
      const { canvas, ctx } = nieuwCanvas(MUNT.w, MUNT.h)
      const cx = 5
      const cy = 5
      if (geest) {
        ellips(ctx, cx, cy, rx, 5, UI.muntGeest)
        omtrek(ctx, cx, cy, rx, 5, donkerder(UI.muntGeest, 0.35))
      } else {
        ellips(ctx, cx, cy, rx, 5, UI.munt)
        omtrek(ctx, cx, cy, rx, 5, UI.muntRand)
        if (rx >= 3) {
          ellips(ctx, cx, cy, rx - 2, 3, lichter(UI.munt, 0.45))
          ctx.fillStyle = UI.muntRand
          ctx.fillRect(cx - 1, cy - 2, 2, 5)
        } else {
          ctx.fillStyle = lichter(UI.munt, 0.5)
          ctx.fillRect(cx, cy - 3, 1, 7)
        }
      }
      blad.ctx.drawImage(canvas, i * MUNT.w, 0)
    })
    return blad
  })
}

// --- Veer ------------------------------------------------------------------

export const VEER = { w: 16, h: 16 }

export function veerBlad(p) {
  return eenmalig(`veer-${p.id}`, () => {
    const hoogtes = [11, 6, 15] // rust, ingedrukt, uitgeklapt
    const blad = new Blad(VEER.w, VEER.h, hoogtes.length)
    hoogtes.forEach((h, i) => {
      const { canvas, ctx } = nieuwCanvas(VEER.w, VEER.h)
      const top = VEER.h - h

      // Voetplaat
      ctx.fillStyle = UI.inkt
      ctx.fillRect(0, VEER.h - 3, 16, 3)
      ctx.fillStyle = p.rots.h
      ctx.fillRect(1, VEER.h - 3, 14, 1)

      // Veer in de accentkleur, niet in rotsgrijs: hij moet er tussen de
      // tegels uitspringen, want hij is een route en geen decoratie.
      const winds = Math.max(2, Math.floor((h - 4) / 3))
      for (let k = 0; k < winds; k++) {
        const y = Math.round(VEER.h - 4 - k * ((h - 5) / winds))
        ctx.fillStyle = UI.inkt
        ctx.fillRect(2, y, 12, 3)
        ctx.fillStyle = k % 2 ? UI.accent : UI.accentDonker
        ctx.fillRect(3, y, 10, 2)
        ctx.fillStyle = lichter(UI.accent, 0.55)
        ctx.fillRect(3, y, 4, 1)
      }

      // Bovenplaat waar je op landt
      ctx.fillStyle = UI.inkt
      ctx.fillRect(0, top, 16, 5)
      ctx.fillStyle = p.deco[1]
      ctx.fillRect(1, top + 1, 14, 3)
      ctx.fillStyle = lichter(p.deco[0], 0.45)
      ctx.fillRect(1, top + 1, 14, 1)
      // Twee pijltjes omhoog: de bedoeling van het ding in één blik.
      ctx.fillStyle = UI.inkt
      for (const px0 of [4, 10]) {
        ctx.fillRect(px0, top + 2, 2, 1)
        ctx.fillRect(px0 - 1, top + 3, 1, 1)
        ctx.fillRect(px0 + 2, top + 3, 1, 1)
      }
      blad.ctx.drawImage(canvas, i * VEER.w, 0)
    })
    return blad
  })
}

// --- Checkpoint ------------------------------------------------------------

export const CHECKPOINT = { w: 16, h: 32 }

export function checkpointBlad(p) {
  return eenmalig(`cp-${p.id}`, () => {
    // 0-3 = uit (slap), 4-7 = aan (wapperend)
    const blad = new Blad(CHECKPOINT.w, CHECKPOINT.h, 8)
    for (let i = 0; i < 8; i++) {
      const aan = i >= 4
      const f = i % 4
      const { canvas, ctx } = nieuwCanvas(CHECKPOINT.w, CHECKPOINT.h)
      // Paal
      ctx.fillStyle = UI.inkt
      ctx.fillRect(3, 2, 3, 30)
      ctx.fillStyle = p.rots.h
      ctx.fillRect(3, 2, 1, 30)
      ctx.fillStyle = UI.inkt
      ctx.fillRect(1, 29, 8, 3)
      ctx.fillStyle = p.rots.h
      ctx.fillRect(2, 29, 6, 1)
      // Vlag. Uit is bewust nog goed zichtbaar: je moet hem van een afstand
      // kunnen zien staan, anders loop je hem voorbij.
      const kleur = aan ? UI.goed : UI.tekstZacht
      for (let y = 0; y < 9; y++) {
        const golf = aan ? Math.round(Math.sin((y / 9) * Math.PI * 2 + f * 1.6) * 1.6) : 0
        const lengte = aan ? 9 : 6
        ctx.fillStyle = y < 3 ? lichter(kleur, 0.25) : kleur
        ctx.fillRect(6, 4 + y + golf, lengte, 1)
      }
      if (aan) {
        ctx.fillStyle = lichter(UI.goed, 0.6)
        ctx.fillRect(3, 0, 3, 2)
      }
      blad.ctx.drawImage(canvas, i * CHECKPOINT.w, 0)
    }
    return blad
  })
}

// --- Finish: het landingsplatform van het schip -----------------------------

export const FINISH = { w: 48, h: 40 }

export function finishBlad(p) {
  return eenmalig(`finish-${p.id}`, () => {
    const blad = new Blad(FINISH.w, FINISH.h, 4)
    for (let i = 0; i < 4; i++) {
      const { canvas, ctx } = nieuwCanvas(FINISH.w, FINISH.h)
      // Platform
      ctx.fillStyle = p.rots.m
      ctx.fillRect(2, 32, 44, 8)
      ctx.fillStyle = p.rots.h
      ctx.fillRect(2, 32, 44, 2)
      ctx.fillStyle = p.rots.o
      ctx.fillRect(2, 31, 44, 1)
      ctx.fillRect(2, 39, 44, 1)
      // Lichtbaken: vier lampjes die om de beurt aangaan
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = k === i ? lichter(p.gloed, 0.5) : donkerder(p.gloed, 0.55)
        ctx.fillRect(5 + k * 12, 28, 4, 3)
      }
      // Lichtbundel omhoog
      ctx.globalAlpha = 0.16 + (i % 2) * 0.05
      ctx.fillStyle = p.gloed
      for (let y = 0; y < 28; y++) {
        const b = Math.round(6 + (y / 28) * 14)
        ctx.fillRect(24 - b, 28 - y, b * 2, 1)
      }
      ctx.globalAlpha = 1
      // Ring op de vloer
      ctx.fillStyle = lichter(p.gloed, 0.3)
      ctx.fillRect(8, 30, 32, 1)
      blad.ctx.drawImage(canvas, i * FINISH.w, 0)
    }
    return blad
  })
}

// --- Capsule (power-up-blok) ------------------------------------------------

export const CAPSULE = { w: 16, h: 16 }

export function capsuleBlad(p) {
  return eenmalig(`capsule-${p.id}`, () => {
    const blad = new Blad(CAPSULE.w, CAPSULE.h, 5) // 0-3 pulserend, 4 = leeg
    for (let i = 0; i < 5; i++) {
      const { canvas, ctx } = nieuwCanvas(CAPSULE.w, CAPSULE.h)
      const leeg = i === 4
      ctx.fillStyle = leeg ? p.rots.s : p.deco[1]
      ctx.fillRect(0, 0, 16, 16)
      ctx.fillStyle = leeg ? p.rots.m : lichter(p.deco[1], 0.3)
      ctx.fillRect(1, 1, 14, 2)
      ctx.fillStyle = p.rots.o
      ctx.fillRect(0, 0, 16, 1)
      ctx.fillRect(0, 15, 16, 1)
      ctx.fillRect(0, 0, 1, 16)
      ctx.fillRect(15, 0, 1, 16)
      // Klinknagels in de hoeken
      ctx.fillStyle = leeg ? p.rots.h : lichter(p.deco[0], 0.2)
      for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) ctx.fillRect(x, y, 1, 1)
      if (!leeg) {
        const puls = [0.35, 0.6, 1, 0.6][i]
        ctx.globalAlpha = puls
        ellips(ctx, 8, 8, 4, 4, lichter(p.gloed, 0.4))
        ctx.globalAlpha = 1
        ctx.fillStyle = p.rots.o
        ctx.fillRect(7, 5, 3, 1)
        ctx.fillRect(10, 6, 1, 2)
        ctx.fillRect(8, 8, 2, 1)
        ctx.fillRect(8, 9, 1, 1)
        ctx.fillRect(8, 11, 1, 1)
      }
      blad.ctx.drawImage(canvas, i * CAPSULE.w, 0)
    }
    return blad
  })
}

// --- Hintbordje -------------------------------------------------------------

export const BORD = { w: 16, h: 16 }

export function bordBlad(p) {
  return eenmalig(`bord-${p.id}`, () => {
    const blad = new Blad(BORD.w, BORD.h, 1)
    const ctx = blad.ctx
    ctx.fillStyle = p.rots.o
    ctx.fillRect(7, 8, 2, 8)
    ctx.fillStyle = p.grond.m
    ctx.fillRect(2, 2, 12, 8)
    ctx.fillStyle = p.grond.h
    ctx.fillRect(2, 2, 12, 2)
    ctx.fillStyle = p.rots.o
    ctx.fillRect(1, 1, 14, 1)
    ctx.fillRect(1, 10, 14, 1)
    ctx.fillRect(1, 1, 1, 10)
    ctx.fillRect(14, 1, 1, 10)
    ctx.fillStyle = p.rots.o
    ctx.fillRect(6, 4, 4, 1)
    ctx.fillRect(9, 5, 1, 1)
    ctx.fillRect(7, 6, 2, 1)
    ctx.fillRect(7, 8, 1, 1)
    return blad
  })
}

// --- Vijanden van wereld 1 --------------------------------------------------

export const SLIJM = { w: 16, h: 16 }

export function slijmBlad(p) {
  return eenmalig(`slijm-${p.id}`, () => {
    const vormen = [
      { rx: 7, ry: 5, dy: 0 },
      { rx: 6, ry: 6, dy: -1 },
      { rx: 7, ry: 5, dy: 0 },
      { rx: 8, ry: 4, dy: 1 },
    ]
    const blad = new Blad(SLIJM.w, SLIJM.h, 4)
    vormen.forEach((v, i) => {
      const { canvas, ctx } = nieuwCanvas(SLIJM.w, SLIJM.h)
      const cy = 10 + v.dy
      ellips(ctx, 8, cy, v.rx, v.ry, p.deco[1])
      ellips(ctx, 8, cy - 1, v.rx - 2, v.ry - 2, lichter(p.deco[0], 0.15))
      omtrek(ctx, 8, cy, v.rx, v.ry, p.rots.o)
      // Ogen
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(5, cy - 2, 2, 2)
      ctx.fillRect(9, cy - 2, 2, 2)
      ctx.fillStyle = p.rots.o
      ctx.fillRect(6, cy - 1, 1, 1)
      ctx.fillRect(10, cy - 1, 1, 1)
      // Druppel bovenop
      ctx.fillStyle = lichter(p.deco[0], 0.3)
      ctx.fillRect(7, cy - v.ry - 1, 2, 1)
      blad.ctx.drawImage(canvas, i * SLIJM.w, 0)
    })
    return blad
  })
}

export const SPOOR = { w: 16, h: 16 }

export function spoorBlad(p) {
  return eenmalig(`spoor-${p.id}`, () => {
    const blad = new Blad(SPOOR.w, SPOOR.h, 4)
    const stand = [
      { ry: 5, poot: 3 },
      { ry: 6, poot: 1 },
      { ry: 4, poot: 5 },
      { ry: 5, poot: 3 },
    ]
    stand.forEach((s, i) => {
      const { canvas, ctx } = nieuwCanvas(SPOOR.w, SPOOR.h)
      const cy = 8
      // Pootjes
      ctx.fillStyle = p.rots.o
      ctx.fillRect(4, cy + s.ry, 2, s.poot)
      ctx.fillRect(10, cy + s.ry, 2, s.poot)
      // Kap
      ellips(ctx, 8, cy, 6, s.ry, p.deco[2])
      ellips(ctx, 8, cy - 1, 4, s.ry - 2, lichter(p.deco[2], 0.3))
      omtrek(ctx, 8, cy, 6, s.ry, p.rots.o)
      // Stippen
      ctx.fillStyle = lichter(p.deco[0], 0.4)
      ctx.fillRect(5, cy - 2, 2, 2)
      ctx.fillRect(10, cy - 3, 2, 2)
      ctx.fillRect(8, cy + 1, 2, 2)
      // Ogen
      ctx.fillStyle = p.rots.o
      ctx.fillRect(6, cy + s.ry - 2, 1, 1)
      ctx.fillRect(9, cy + s.ry - 2, 1, 1)
      blad.ctx.drawImage(canvas, i * SPOOR.w, 0)
    })
    return blad
  })
}

export const KWAL = { w: 16, h: 20 }

export function kwalBlad(p) {
  return eenmalig(`kwal-${p.id}`, () => {
    const blad = new Blad(KWAL.w, KWAL.h, 4)
    const stand = [
      { ry: 5, sleep: 0 },
      { ry: 6, sleep: 1 },
      { ry: 5, sleep: 2 },
      { ry: 4, sleep: 1 },
    ]
    stand.forEach((s, i) => {
      const { canvas, ctx } = nieuwCanvas(KWAL.w, KWAL.h)
      const cy = 7
      // Tentakels
      for (let k = 0; k < 4; k++) {
        const x = 3 + k * 3
        const lengte = 6 + ((k + i) % 3)
        ctx.fillStyle = p.deco[0]
        for (let y = 0; y < lengte; y++) {
          const golf = Math.round(Math.sin((y + i * 2) * 0.8 + k) * s.sleep)
          ctx.fillRect(x + golf, cy + s.ry + y, 1, 1)
        }
      }
      // Klok
      ellips(ctx, 8, cy, 7, s.ry, p.deco[1])
      ctx.globalAlpha = 0.85
      ellips(ctx, 8, cy - 1, 5, s.ry - 2, lichter(p.gloed, 0.35))
      ctx.globalAlpha = 1
      omtrek(ctx, 8, cy, 7, s.ry, p.rots.o)
      ctx.fillStyle = p.rots.o
      ctx.fillRect(5, cy, 2, 1)
      ctx.fillRect(9, cy, 2, 1)
      blad.ctx.drawImage(canvas, i * KWAL.w, 0)
    })
    return blad
  })
}

export const KEVER = { w: 20, h: 16 }

export function keverBlad(p) {
  return eenmalig(`kever-${p.id}`, () => {
    // 0-3 met schild, 4-7 zonder (na één stamp)
    const blad = new Blad(KEVER.w, KEVER.h, 8)
    for (let i = 0; i < 8; i++) {
      const geschild = i < 4
      const f = i % 4
      const { canvas, ctx } = nieuwCanvas(KEVER.w, KEVER.h)
      const cy = 9
      // Pootjes
      ctx.fillStyle = p.rots.o
      for (let k = 0; k < 3; k++) {
        const x = 4 + k * 5
        const dy = (k + f) % 2
        ctx.fillRect(x, cy + 4, 2, 3 - dy)
      }
      // Lijf
      ellips(ctx, 10, cy, 8, 5, p.deco[2])
      omtrek(ctx, 10, cy, 8, 5, p.rots.o)
      if (geschild) {
        // Kristalschild bovenop
        ellips(ctx, 10, cy - 2, 7, 3, lichter(p.deco[0], 0.2))
        ctx.fillStyle = lichter(p.deco[0], 0.55)
        ctx.fillRect(6, cy - 3, 8, 1)
        ctx.fillStyle = p.rots.o
        for (const x of [7, 10, 13]) ctx.fillRect(x, cy - 4, 1, 3)
      } else {
        ctx.fillStyle = donkerder(p.deco[2], 0.3)
        ctx.fillRect(5, cy - 3, 10, 2)
      }
      // Kop
      ellips(ctx, 17, cy + 1, 3, 3, p.deco[1])
      omtrek(ctx, 17, cy + 1, 3, 3, p.rots.o)
      ctx.fillStyle = p.rots.o
      ctx.fillRect(17, cy, 1, 1)
      blad.ctx.drawImage(canvas, i * KEVER.w, 0)
    }
    return blad
  })
}

// --- Bewegend platform ------------------------------------------------------

export const PLATFORM = { w: 48, h: 12 }

export function platformBlad(p) {
  return eenmalig(`plat-${p.id}`, () => {
    const blad = new Blad(PLATFORM.w, PLATFORM.h, 1)
    const ctx = blad.ctx
    ctx.fillStyle = p.rots.m
    ctx.fillRect(0, 2, 48, 8)
    ctx.fillStyle = p.grond.m
    ctx.fillRect(0, 0, 48, 4)
    ctx.fillStyle = p.grond.h
    ctx.fillRect(0, 0, 48, 2)
    ctx.fillStyle = p.rots.o
    ctx.fillRect(0, 0, 48, 1)
    ctx.fillRect(0, 9, 48, 1)
    ctx.fillRect(0, 0, 1, 10)
    ctx.fillRect(47, 0, 1, 10)
    ctx.fillStyle = lichter(p.gloed, 0.2)
    for (let x = 4; x < 44; x += 10) ctx.fillRect(x, 10, 4, 2)
    return blad
  })
}

// --- Power-up-iconen --------------------------------------------------------

export const POWERUP = { w: 12, h: 12 }

export function powerupBlad(p) {
  return eenmalig(`pow-${p.id}`, () => {
    // schild, magneet, speedboots, jetpack, extra leven
    const blad = new Blad(POWERUP.w, POWERUP.h, 5)
    const teken = [
      (ctx) => { // schild
        ctx.fillStyle = '#3ef0ff'
        ctx.fillRect(2, 1, 8, 6)
        for (let y = 0; y < 4; y++) ctx.fillRect(3 + y, 7 + y, 6 - y * 2, 1)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(3, 2, 3, 2)
      },
      (ctx) => { // magneet
        ctx.fillStyle = '#ff5c5c'
        ctx.fillRect(2, 1, 3, 7)
        ctx.fillRect(7, 1, 3, 7)
        ctx.fillRect(2, 1, 8, 3)
        ctx.fillStyle = '#e8e8f0'
        ctx.fillRect(2, 8, 3, 3)
        ctx.fillRect(7, 8, 3, 3)
      },
      (ctx) => { // speedboots
        ctx.fillStyle = '#ffd23f'
        ctx.fillRect(3, 2, 4, 6)
        ctx.fillRect(2, 8, 8, 3)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(4, 3, 2, 3)
      },
      (ctx) => { // jetpack
        ctx.fillStyle = '#a9b4c4'
        ctx.fillRect(3, 1, 6, 7)
        ctx.fillStyle = '#ff8c1a'
        ctx.fillRect(4, 8, 2, 3)
        ctx.fillRect(7, 8, 2, 3)
        ctx.fillStyle = '#ffd76b'
        ctx.fillRect(4, 10, 2, 1)
        ctx.fillRect(7, 10, 2, 1)
      },
      (ctx) => { // extra leven
        ctx.fillStyle = UI.hart
        ctx.fillRect(2, 2, 3, 2)
        ctx.fillRect(7, 2, 3, 2)
        ctx.fillRect(1, 3, 10, 3)
        ctx.fillRect(2, 6, 8, 1)
        ctx.fillRect(3, 7, 6, 1)
        ctx.fillRect(4, 8, 4, 1)
        ctx.fillRect(5, 9, 2, 1)
        ctx.fillStyle = '#ffb3c4'
        ctx.fillRect(3, 3, 2, 2)
      },
    ]
    teken.forEach((fn, i) => {
      const { canvas, ctx } = nieuwCanvas(POWERUP.w, POWERUP.h)
      fn(ctx)
      blad.ctx.drawImage(canvas, i * POWERUP.w, 0)
    })
    return blad
  })
}

export const POWERUP_INDEX = { schild: 0, magneet: 1, speedboots: 2, jetpack: 3, leven: 4 }
