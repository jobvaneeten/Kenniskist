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

import v01 from './w3/l01.js'
import v02 from './w3/l02.js'
import v03 from './w3/l03.js'
import v04 from './w3/l04.js'
import v05 from './w3/l05.js'
import v06 from './w3/l06.js'
import v07 from './w3/l07.js'
import v08 from './w3/l08.js'
import v09 from './w3/l09.js'
import v10 from './w3/l10.js'
import v11 from './w3/l11.js'
import v12 from './w3/l12.js'
import v13 from './w3/l13.js'
import v14 from './w3/l14.js'
import v15 from './w3/l15.js'
import v16 from './w3/l16.js'

import s01 from './w4/l01.js'
import s02 from './w4/l02.js'
import s03 from './w4/l03.js'
import s04 from './w4/l04.js'
import s05 from './w4/l05.js'
import s06 from './w4/l06.js'
import s07 from './w4/l07.js'
import s08 from './w4/l08.js'
import s09 from './w4/l09.js'
import s10 from './w4/l10.js'
import s11 from './w4/l11.js'
import s12 from './w4/l12.js'
import s13 from './w4/l13.js'
import s14 from './w4/l14.js'
import s15 from './w4/l15.js'
import s16 from './w4/l16.js'

import n01 from './w5/l01.js'
import n02 from './w5/l02.js'
import n03 from './w5/l03.js'
import n04 from './w5/l04.js'
import n05 from './w5/l05.js'
import n06 from './w5/l06.js'
import n07 from './w5/l07.js'
import n08 from './w5/l08.js'
import n09 from './w5/l09.js'
import n10 from './w5/l10.js'
import n11 from './w5/l11.js'
import n12 from './w5/l12.js'
import n13 from './w5/l13.js'
import n14 from './w5/l14.js'
import n15 from './w5/l15.js'
import n16 from './w5/l16.js'

export const ALLE_LEVELS = [
  l01, l02, l03, l04, l05, l06, l07, l08,
  l09, l10, l11, l12, l13, l14, l15, l16,
  m01, m02, m03, m04, m05, m06, m07, m08,
  m09, m10, m11, m12, m13, m14, m15, m16,
  v01, v02, v03, v04, v05, v06, v07, v08,
  v09, v10, v11, v12, v13, v14, v15, v16,
  s01, s02, s03, s04, s05, s06, s07, s08,
  s09, s10, s11, s12, s13, s14, s15, s16,
  n01, n02, n03, n04, n05, n06, n07, n08,
  n09, n10, n11, n12, n13, n14, n15, n16,
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
