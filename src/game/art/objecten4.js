// Sprites voor wereld 4 (Verlaten ruimtestation): lasers, sleutelkaarten,
// deuren en de vier robots.

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

// --- Laser ------------------------------------------------------------------
// De zender is een sprite; de straal wordt per frame getekend omdat hij van
// lengte verandert en moet flikkeren.

export const ZENDER = { w: 16, h: 8 }

export function zenderBlad(p) {
  return eenmalig(`zender-${p.id}`, () => {
    const blad = new Blad(ZENDER.w, ZENDER.h, 3) // uit, opladen, aan
    for (let i = 0; i < 3; i++) {
      const { canvas, ctx } = nieuwCanvas(ZENDER.w, ZENDER.h)
      ctx.fillStyle = p.rots.o
      ctx.fillRect(0, 0, 16, 8)
      ctx.fillStyle = p.rots.m
      ctx.fillRect(1, 1, 14, 6)
      ctx.fillStyle = p.rots.h
      ctx.fillRect(1, 1, 14, 1)
      ctx.fillStyle = p.rots.s
      ctx.fillRect(4, 5, 8, 3)
      const lamp = i === 0 ? donkerder('#ff3ec8', 0.6) : i === 1 ? '#ff3ec8' : '#ffffff'
      ctx.fillStyle = lamp
      ctx.fillRect(6, 5, 4, 3)
      ctx.fillStyle = p.rots.o
      ctx.fillRect(2, 2, 2, 2)
      ctx.fillRect(12, 2, 2, 2)
      blad.ctx.drawImage(canvas, i * ZENDER.w, 0)
    }
    return blad
  })
}

// Straal met een felle kern en een zachte gloed eromheen.
export function tekenLaserStraal(ctx, x, y, lengte, richting, tijd) {
  if (lengte <= 0) return
  const flikker = 1 + Math.sin(tijd * 40) * 0.25
  const dik = Math.max(2, Math.round(3 * flikker))
  if (richting === 'v') {
    ctx.globalAlpha = 0.2
    ctx.fillStyle = '#ff3ec8'
    ctx.fillRect(Math.round(x - dik - 2), Math.round(y), dik * 2 + 4, lengte)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#ff3ec8'
    ctx.fillRect(Math.round(x - dik), Math.round(y), dik * 2, lengte)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(Math.round(x - 1), Math.round(y), 2, lengte)
  } else {
    ctx.globalAlpha = 0.2
    ctx.fillStyle = '#ff3ec8'
    ctx.fillRect(Math.round(x), Math.round(y - dik - 2), lengte, dik * 2 + 4)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#ff3ec8'
    ctx.fillRect(Math.round(x), Math.round(y - dik), lengte, dik * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(Math.round(x), Math.round(y - 1), lengte, 2)
  }
}

// --- Sleutelkaart -----------------------------------------------------------

export const SLEUTEL = { w: 12, h: 10 }

export function sleutelBlad() {
  return eenmalig('sleutel', () => {
    const blad = new Blad(SLEUTEL.w, SLEUTEL.h, 4)
    for (let i = 0; i < 4; i++) {
      const { canvas, ctx } = nieuwCanvas(SLEUTEL.w, SLEUTEL.h)
      // Kaart die om zijn as draait: de breedte varieert per frame.
      const b = [5, 3, 1, 3][i]
      const cx = 6
      ctx.fillStyle = '#16233d'
      ctx.fillRect(cx - b, 1, b * 2, 8)
      ctx.fillStyle = '#3ef0ff'
      ctx.fillRect(cx - b + 1, 2, Math.max(1, b * 2 - 2), 6)
      if (b >= 3) {
        ctx.fillStyle = '#16233d'
        ctx.fillRect(cx - b + 2, 3, Math.max(1, b * 2 - 4), 1)
        ctx.fillStyle = UI.accent
        ctx.fillRect(cx - b + 2, 5, 2, 2)
      }
      blad.ctx.drawImage(canvas, i * SLEUTEL.w, 0)
    }
    return blad
  })
}

// --- Bewakingsdrone ---------------------------------------------------------

export const DRONE = { w: 18, h: 14 }

export function droneBlad() {
  return eenmalig('drone', () => {
    const blad = new Blad(DRONE.w, DRONE.h, 6) // 0-3 patrouille, 4-5 aanval
    for (let i = 0; i < 6; i++) {
      const { canvas, ctx } = nieuwCanvas(DRONE.w, DRONE.h)
      const boos = i >= 4
      const rotor = i % 2
      ctx.fillStyle = '#525c6e'
      ctx.fillRect(rotor ? 1 : 2, 3, 5, 1)
      ctx.fillRect(rotor ? 12 : 11, 3, 5, 1)
      ctx.fillStyle = '#333b4a'
      ctx.fillRect(4, 4, 2, 2)
      ctx.fillRect(12, 4, 2, 2)

      ellips(ctx, 9, 8, 6, 4, '#525c6e')
      ellips(ctx, 9, 7, 4, 2, '#7d8798')
      ctx.fillStyle = '#161b26'
      ctx.fillRect(3, 8, 12, 1)

      // Het oog verkleurt zodra hij je gezien heeft; dat is de waarschuwing.
      ctx.fillStyle = boos ? '#ff3ec8' : '#3ef0ff'
      ctx.fillRect(7, 8, 4, 3)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(8, 9, 1, 1)

      ctx.fillStyle = '#161b26'
      ctx.fillRect(8, 0, 1, 3)
      ctx.fillStyle = boos ? '#ff3ec8' : '#ffe14d'
      ctx.fillRect(7, 0, 3, 1)
      blad.ctx.drawImage(canvas, i * DRONE.w, 0)
    }
    return blad
  })
}

// --- Torretje ---------------------------------------------------------------

export const TORRET = { w: 16, h: 16 }

export function torretBlad(p) {
  return eenmalig(`torret-${p.id}`, () => {
    const blad = new Blad(TORRET.w, TORRET.h, 4)
    for (let i = 0; i < 4; i++) {
      const { canvas, ctx } = nieuwCanvas(TORRET.w, TORRET.h)
      ctx.fillStyle = '#161b26'
      ctx.fillRect(2, 10, 12, 6)
      ctx.fillStyle = p.rots.m
      ctx.fillRect(3, 11, 10, 4)
      ctx.fillStyle = p.rots.h
      ctx.fillRect(3, 11, 10, 1)

      ellips(ctx, 8, 8, 5, 4, '#525c6e')
      ellips(ctx, 8, 7, 3, 2, '#7d8798')
      ctx.fillStyle = '#161b26'
      ctx.fillRect(3, 8, 11, 1)

      ctx.fillStyle = '#161b26'
      ctx.fillRect(11, 6, 5, 4)
      ctx.fillStyle = '#333b4a'
      ctx.fillRect(11, 7, 4, 2)

      // Laadlamp: hoe voller, hoe feller. Je kunt het schot zien aankomen.
      const lamp = ['#333b4a', '#ff8c1a', '#ff3ec8', '#ffffff'][i]
      ctx.fillStyle = lamp
      ctx.fillRect(6, 5, 4, 2)
      if (i === 3) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(15, 6, 1, 4)
      }
      blad.ctx.drawImage(canvas, i * TORRET.w, 0)
    }
    return blad
  })
}

// --- Kortsluitrobot ---------------------------------------------------------
// Loopt, knippert steeds sneller en ontploft dan. Je kunt hem stampen voordat
// het zover is.

export const KORTSLUITER = { w: 16, h: 16 }

export function kortsluiterBlad() {
  return eenmalig('kortsluiter', () => {
    const blad = new Blad(KORTSLUITER.w, KORTSLUITER.h, 6) // 0-3 lopen, 4-5 opladen
    for (let i = 0; i < 6; i++) {
      const { canvas, ctx } = nieuwCanvas(KORTSLUITER.w, KORTSLUITER.h)
      const laadt = i >= 4
      const stap = i % 2
      ctx.fillStyle = '#161b26'
      ctx.fillRect(3 + stap, 13, 3, 3)
      ctx.fillRect(10 - stap, 13, 3, 3)

      ctx.fillStyle = laadt ? '#8a5a3a' : '#525c6e'
      ctx.fillRect(2, 4, 12, 9)
      ctx.fillStyle = laadt ? '#c07a4a' : '#7d8798'
      ctx.fillRect(3, 5, 10, 2)
      ctx.fillStyle = '#161b26'
      ctx.fillRect(2, 4, 12, 1)
      ctx.fillRect(2, 12, 12, 1)
      ctx.fillRect(2, 4, 1, 9)
      ctx.fillRect(13, 4, 1, 9)

      ctx.fillStyle = laadt ? (i === 5 ? '#ffffff' : '#ff3ec8') : '#ffe14d'
      ctx.fillRect(4, 8, 3, 3)
      ctx.fillRect(9, 8, 3, 3)

      if (laadt) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 2 + stap, 2, 1)
        ctx.fillRect(14, 6 - stap, 2, 1)
        ctx.fillRect(7, 1, 1, 2)
      }
      blad.ctx.drawImage(canvas, i * KORTSLUITER.w, 0)
    }
    return blad
  })
}

// --- Patrouillebot ----------------------------------------------------------

export const PATROUILLE = { w: 18, h: 16 }

export function patrouilleBlad() {
  return eenmalig('patrouille', () => {
    const blad = new Blad(PATROUILLE.w, PATROUILLE.h, 4)
    for (let i = 0; i < 4; i++) {
      const { canvas, ctx } = nieuwCanvas(PATROUILLE.w, PATROUILLE.h)
      ctx.fillStyle = '#161b26'
      ctx.fillRect(1, 11, 16, 5)
      ctx.fillStyle = '#333b4a'
      ctx.fillRect(2, 12, 14, 3)
      ctx.fillStyle = '#7d8798'
      for (let k = 0; k < 4; k++) ctx.fillRect(2 + ((k * 4 + i) % 14), 13, 2, 1)

      ctx.fillStyle = '#525c6e'
      ctx.fillRect(3, 4, 12, 7)
      ctx.fillStyle = '#7d8798'
      ctx.fillRect(4, 5, 10, 2)
      ctx.fillStyle = '#161b26'
      ctx.fillRect(3, 4, 12, 1)
      ctx.fillRect(3, 10, 12, 1)

      ctx.fillStyle = '#3ef0ff'
      ctx.fillRect(5, 7, 8, 2)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(5 + ((i * 2) % 7), 7, 2, 2)

      ctx.fillStyle = i % 2 ? '#ffe14d' : '#161b26'
      ctx.fillRect(8, 1, 2, 3)
      blad.ctx.drawImage(canvas, i * PATROUILLE.w, 0)
    }
    return blad
  })
}

// --- Zero-g-zone ------------------------------------------------------------
// Een raster van puntjes dat langzaam omhoog drijft: zo zie je meteen waar de
// zwaartekracht uit staat.

export function tekenZeroG(ctx, x, y, w, h, tijd) {
  ctx.globalAlpha = 0.1
  ctx.fillStyle = '#3ef0ff'
  ctx.fillRect(x, y, w, h)
  ctx.globalAlpha = 0.5
  for (let gy = 0; gy < h; gy += 12) {
    for (let gx = 0; gx < w; gx += 12) {
      const dy = (gy + tijd * 14) % h
      ctx.fillRect(x + gx + 4, y + Math.round(dy), 1, 1)
    }
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = 'rgba(62,240,255,0.5)'
  ctx.fillRect(x, y, w, 1)
  ctx.fillRect(x, y + h - 1, w, 1)
}

// --- Deur -------------------------------------------------------------------
// De deurtegel zelf zit in art/tegels.js; dit is het lampje ernaast dat laat
// zien of hij open of dicht is.

export function tekenDeurLamp(ctx, x, y, open, tijd) {
  ctx.fillStyle = '#161b26'
  ctx.fillRect(x, y, 4, 4)
  ctx.fillStyle = open ? '#3ef0ff' : (Math.sin(tijd * 6) > 0 ? '#ff3ec8' : '#7a1f3a')
  ctx.fillRect(x + 1, y + 1, 2, 2)
}

export { lichter }
