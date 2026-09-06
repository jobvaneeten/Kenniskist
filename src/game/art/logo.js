// Het logo. Een eigen, zwaardere letterset dan de UI-font — alleen de letters
// die in "STERRENVEER" voorkomen. De V van VEER veert bij het openen door, als
// een ingedrukte veer die losschiet.

import { nieuwCanvas, ruis } from '../core/atlas.js'
import { UI, lichter, donkerder } from './palet.js'

const BREED = 9
const HOOG = 11

const LETTERS = {
  S: [
    '..#####..', '.#######.', '##.....##', '##.......', '.#####...',
    '..#####..', '.......##', '##.....##', '.#######.', '..#####..', '.........',
  ],
  T: [
    '#########', '#########', '...###...', '...###...', '...###...',
    '...###...', '...###...', '...###...', '...###...', '...###...', '.........',
  ],
  E: [
    '#########', '#########', '##.......', '##.......', '#######..',
    '#######..', '##.......', '##.......', '#########', '#########', '.........',
  ],
  R: [
    '#######..', '########.', '##....##.', '##....##.', '########.',
    '#######..', '##..##...', '##...##..', '##....##.', '##.....##', '.........',
  ],
  N: [
    '##.....##', '###....##', '####...##', '##.##..##', '##..##.##',
    '##...####', '##....###', '##.....##', '##.....##', '##.....##', '.........',
  ],
  V: [
    '##.....##', '##.....##', '##.....##', '##.....##', '.##...##.',
    '.##...##.', '..##.##..', '..##.##..', '...###...', '....#....', '.........',
  ],
}

const WOORD = 'STERRENVEER'
export const LOGO_SCHAAL = 3
export const LOGO_BREEDTE = WOORD.length * (BREED + 1) * LOGO_SCHAAL
export const LOGO_HOOGTE = (HOOG + 3) * LOGO_SCHAAL

const cache = new Map()

// Eén letter met verloop, outline en een glans, op de gevraagde schaal.
function bakLetter(teken, schaal, gloed) {
  const sleutel = `${teken}-${schaal}-${gloed}`
  if (cache.has(sleutel)) return cache.get(sleutel)
  const data = LETTERS[teken]
  const w = (BREED + 2) * schaal
  const h = (HOOG + 2) * schaal
  const { canvas, ctx } = nieuwCanvas(w, h)

  const teken1 = (kleurBoven, kleurOnder, dx, dy) => {
    for (let y = 0; y < HOOG; y++) {
      for (let x = 0; x < BREED; x++) {
        if (data[y][x] !== '#') continue
        const t = y / (HOOG - 1)
        ctx.fillStyle = t < 0.45 ? kleurBoven : kleurOnder
        ctx.fillRect((x + 1) * schaal + dx, (y + 1) * schaal + dy, schaal, schaal)
      }
    }
  }

  // Outline: dezelfde vorm acht keer rondom in het donker.
  ctx.fillStyle = UI.inkt
  for (let y = 0; y < HOOG; y++) {
    for (let x = 0; x < BREED; x++) {
      if (data[y][x] !== '#') continue
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        ctx.fillRect((x + 1 + dx) * schaal, (y + 1 + dy) * schaal, schaal, schaal)
      }
    }
  }
  teken1(lichter(gloed, 0.55), gloed, 0, 0)

  // Glans over de bovenste twee rijen.
  ctx.fillStyle = '#ffffff'
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < BREED; x++) {
      if (data[y][x] === '#') ctx.fillRect((x + 1) * schaal, (y + 1) * schaal, schaal, Math.max(1, schaal - 1))
    }
  }

  cache.set(sleutel, canvas)
  return canvas
}

// Ring van sterrenstof achter de letters; één keer gebakken, per frame gedraaid
// door hem met een offset te tekenen.
function bakRing(kleur) {
  const sleutel = `ring-${kleur}`
  if (cache.has(sleutel)) return cache.get(sleutel)
  const { canvas, ctx } = nieuwCanvas(360, 120)
  for (let i = 0; i < 140; i++) {
    const hoek = (i / 140) * Math.PI * 2
    const rx = 168 + ruis(i, 3, 7) * 8
    const ry = 44 + ruis(i, 4, 7) * 6
    const x = Math.round(180 + Math.cos(hoek) * rx)
    const y = Math.round(60 + Math.sin(hoek) * ry)
    const helder = ruis(i, 5, 7)
    ctx.fillStyle = helder > 0.8 ? '#ffffff' : helder > 0.5 ? kleur : donkerder(kleur, 0.4)
    ctx.fillRect(x, y, helder > 0.9 ? 2 : 1, helder > 0.9 ? 2 : 1)
  }
  cache.set(sleutel, canvas)
  return canvas
}

// tijd in seconden sinds het scherm opende. De letters vallen na elkaar binnen
// en veren één keer na; daarna blijft alleen de V doorveren.
export function tekenLogo(ctx, midX, y, tijd, gloed = UI.accent) {
  const ring = bakRing(gloed)
  ctx.globalAlpha = 0.55
  const draai = (tijd * 14) % 360
  ctx.drawImage(ring, Math.round(midX - 180 - draai * 0.2), Math.round(y - 8))
  ctx.globalAlpha = 1

  const stap = (BREED + 1) * LOGO_SCHAAL
  const startX = Math.round(midX - (WOORD.length * stap) / 2)

  for (let i = 0; i < WOORD.length; i++) {
    const teken = WOORD[i]
    const vertraging = i * 0.05
    const t = Math.max(0, tijd - vertraging)
    // Val + naveer: een gedempte sinus die op 0 uitkomt.
    let dy = 0
    if (t < 0.9) {
      const val = Math.min(1, t / 0.35)
      const hoogte = (1 - val) * -70
      const veer = t > 0.35 ? Math.sin((t - 0.35) * 22) * Math.exp(-(t - 0.35) * 6) * 9 : 0
      dy = hoogte + veer
    }
    // De V van VEER blijft zachtjes doorveren.
    if (teken === 'V' && t >= 0.9) dy = Math.sin(tijd * 2.6) * 2.5

    const letter = bakLetter(teken, LOGO_SCHAAL, gloed)
    ctx.drawImage(letter, startX + i * stap - LOGO_SCHAAL, Math.round(y + dy))
  }
}

// Klein logo voor de wereldkaart en het pauzescherm.
export function tekenLogoKlein(ctx, midX, y, gloed = UI.accent) {
  const schaal = 1
  const stap = (BREED + 1) * schaal
  const startX = Math.round(midX - (WOORD.length * stap) / 2)
  for (let i = 0; i < WOORD.length; i++) {
    ctx.drawImage(bakLetter(WOORD[i], schaal, gloed), startX + i * stap - schaal, y)
  }
}
