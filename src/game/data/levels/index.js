// Register van alle levels. Statisch geïmporteerd zodat de bundler ze mee kan
// nemen en tools/validate-levels.js dezelfde lijst ziet als het spel.

import l01 from './w1/l01.js'
import l02 from './w1/l02.js'
import l03 from './w1/l03.js'
import l04 from './w1/l04.js'
import l05 from './w1/l05.js'
import l06 from './w1/l06.js'
import l07 from './w1/l07.js'
import l08 from './w1/l08.js'
import l09 from './w1/l09.js'
import l10 from './w1/l10.js'
import l11 from './w1/l11.js'
import l12 from './w1/l12.js'
import l13 from './w1/l13.js'
import l14 from './w1/l14.js'
import l15 from './w1/l15.js'
import l16 from './w1/l16.js'

import m01 from './w2/l01.js'
import m02 from './w2/l02.js'
import m03 from './w2/l03.js'
import m04 from './w2/l04.js'
import m05 from './w2/l05.js'
import m06 from './w2/l06.js'
import m07 from './w2/l07.js'
import m08 from './w2/l08.js'
import m09 from './w2/l09.js'
import m10 from './w2/l10.js'
import m11 from './w2/l11.js'
import m12 from './w2/l12.js'
import m13 from './w2/l13.js'
import m14 from './w2/l14.js'
import m15 from './w2/l15.js'
import m16 from './w2/l16.js'

export const ALLE_LEVELS = [
  l01, l02, l03, l04, l05, l06, l07, l08,
  l09, l10, l11, l12, l13, l14, l15, l16,
  m01, m02, m03, m04, m05, m06, m07, m08,
  m09, m10, m11, m12, m13, m14, m15, m16,
]

export const LEVELS = Object.fromEntries(ALLE_LEVELS.map((l) => [l.id, l]))

export const levelVan = (id) => LEVELS[id] ?? null

export const levelsVanWereld = (wereld) =>
  ALLE_LEVELS.filter((l) => l.wereld === wereld).sort((a, b) => a.index - b.index)

// Aantal munten in een level. Dit is ook de bron voor de bit-index van elke
// munt: rij voor rij, links naar rechts (zie engine/tilemap.js).
export function muntenInLevel(level) {
  let n = 0
  for (const rij of level.kaart) {
    for (const teken of rij) if (teken === 'o') n++
  }
  return n
}

export function muntenPerWereld(wereld) {
  return levelsVanWereld(wereld).reduce((som, l) => som + muntenInLevel(l), 0)
}

// Stabiele vingerafdruk van de kaart. Verandert de kaart, dan verandert deze
// hash — tools/validate-levels.js gebruikt dat om te waarschuwen dat opgeslagen
// muntmaskers niet meer kloppen.
export function kaartHash(level) {
  let h = 2166136261
  for (const rij of level.kaart) {
    for (let i = 0; i < rij.length; i++) {
      h ^= rij.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    h ^= 10
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
