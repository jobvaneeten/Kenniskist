// De muziek. Alles in code: noten per kanaal per stap, 16e noten.
//
// Één maat = 16 stappen. De helpers `maat` en `herhaal` houden de bestanden
// leesbaar; een uitgeschreven loop van 90 seconden zou anders duizend regels
// noten worden.

import { maakLied, herhaal, verschuif, transponeerNoot } from './sequencer.js'

const maat = (n, noten) => verschuif(noten, n * 16)
const maten = (lijst) => lijst.flatMap(([n, noten]) => maat(n, noten))

// --- Wereld 1: Kristalwoud --------------------------------------------------
// A-mineur, 132 BPM, vriendelijk maar met ruimte eronder. 8 maten per sectie,
// zes secties: A A' B A'' B' A. 768 stappen ≈ 87 seconden.

const W1_BAS_MAAT = (grond) => [
  [0, grond, 2], [4, grond, 2], [6, transponeerNoot(grond, 7), 2],
  [8, grond, 2], [12, transponeerNoot(grond, 12), 2], [14, transponeerNoot(grond, 7), 2],
]

const W1_AKKOORDEN = ['A2', 'F2', 'C3', 'G2', 'A2', 'F2', 'G2', 'G2']

const w1Bas = () => W1_AKKOORDEN.flatMap((g, i) => maat(i, W1_BAS_MAAT(g)))

const w1Pad = () => {
  const drieklank = { A2: ['A3', 'C4', 'E4'], F2: ['F3', 'A3', 'C4'], C3: ['C4', 'E4', 'G4'], G2: ['G3', 'B3', 'D4'] }
  return W1_AKKOORDEN.flatMap((g, i) => (drieklank[g] ?? drieklank.A2).map((n) => [i * 16, n, 15]))
}

const w1MelodieA = maten([
  [0, [[0, 'A4', 2], [2, 'C5', 2], [4, 'E5', 4], [8, 'D5', 2], [10, 'C5', 2], [12, 'B4', 4]]],
  [1, [[0, 'A4', 2], [2, 'F4', 2], [4, 'A4', 4], [8, 'C5', 2], [10, 'A4', 2], [12, 'F4', 4]]],
  [2, [[0, 'G4', 2], [2, 'C5', 2], [4, 'E5', 4], [8, 'G5', 2], [10, 'E5', 2], [12, 'C5', 4]]],
  [3, [[0, 'D5', 2], [2, 'B4', 2], [4, 'G4', 4], [8, 'B4', 2], [10, 'D5', 2], [12, 'G5', 2], [14, 'F#5', 2]]],
  [4, [[0, 'E5', 4], [4, 'C5', 2], [6, 'A4', 2], [8, 'B4', 4], [12, 'C5', 4]]],
  [5, [[0, 'F5', 4], [4, 'E5', 2], [6, 'C5', 2], [8, 'A4', 4], [12, 'C5', 2], [14, 'E5', 2]]],
  [6, [[0, 'D5', 2], [2, 'E5', 2], [4, 'G5', 4], [8, 'D5', 2], [10, 'B4', 2], [12, 'G4', 4]]],
  [7, [[0, 'B4', 2], [2, 'D5', 2], [4, 'B4', 2], [6, 'G4', 2], [8, 'A4', 8]]],
])

// B-deel: zelfde harmonie, hogere lijn en een tegenmelodie — het stuk dat je
// hoort als je halverwege het level bent.
const w1MelodieB = maten([
  [0, [[0, 'E5', 2], [2, 'A5', 2], [4, 'G5', 2], [6, 'E5', 2], [8, 'C5', 4], [12, 'E5', 4]]],
  [1, [[0, 'F5', 2], [2, 'A5', 2], [4, 'C6', 4], [8, 'A5', 2], [10, 'F5', 2], [12, 'C5', 4]]],
  [2, [[0, 'E5', 2], [2, 'G5', 2], [4, 'C6', 4], [8, 'B5', 2], [10, 'G5', 2], [12, 'E5', 4]]],
  [3, [[0, 'D5', 2], [2, 'F#5', 2], [4, 'A5', 4], [8, 'G5', 2], [10, 'D5', 2], [12, 'B4', 4]]],
  [4, [[0, 'C5', 2], [2, 'E5', 2], [4, 'A5', 4], [8, 'G5', 2], [10, 'E5', 2], [12, 'C5', 4]]],
  [5, [[0, 'A4', 2], [2, 'C5', 2], [4, 'F5', 4], [8, 'E5', 2], [10, 'C5', 2], [12, 'A4', 4]]],
  [6, [[0, 'B4', 2], [2, 'D5', 2], [4, 'G5', 4], [8, 'F#5', 2], [10, 'D5', 2], [12, 'B4', 4]]],
  [7, [[0, 'E5', 4], [4, 'D5', 4], [8, 'C5', 4], [12, 'B4', 4]]],
])

const w1Arp = maten(
  W1_AKKOORDEN.map((g, i) => {
    const t = { A2: ['A5', 'C6', 'E6'], F2: ['F5', 'A5', 'C6'], C3: ['C6', 'E6', 'G6'], G2: ['G5', 'B5', 'D6'] }[g] ?? ['A5', 'C6', 'E6']
    const noten = []
    for (let s = 0; s < 16; s += 2) noten.push([s, t[(s / 2) % 3], 1])
    return [i, noten]
  }),
)

const w1Drums = herhaal(
  [[0, 'K', 1], [2, 'H', 1], [4, 'S', 1], [6, 'H', 1], [8, 'K', 1], [10, 'K', 1], [12, 'S', 1], [14, 'O', 1]],
  8, 16,
)

const SECTIE = 128

export const LIED_W1 = maakLied({
  naam: 'w1',
  tempo: 132,
  lengte: SECTIE * 6,
  kanalen: [
    {
      type: 'pulse', duty: 0.5, volume: 0.115, release: 0.12,
      noten: [
        ...w1MelodieA,
        ...verschuif(w1MelodieA, SECTIE),
        ...verschuif(w1MelodieB, SECTIE * 2),
        ...verschuif(w1MelodieA, SECTIE * 3),
        ...verschuif(w1MelodieB, SECTIE * 4),
        ...verschuif(w1MelodieA, SECTIE * 5),
      ],
    },
    {
      type: 'pulse', duty: 0.25, volume: 0.055, release: 0.1,
      // Tegenstem: alleen in de B-delen, een octaaf lager.
      noten: [
        ...verschuif(w1MelodieA.map(([s, n, l]) => [s, transponeerNoot(n, -12), l]), SECTIE * 2),
        ...verschuif(w1MelodieA.map(([s, n, l]) => [s, transponeerNoot(n, -12), l]), SECTIE * 4),
      ],
    },
    {
      type: 'triangle', volume: 0.2, sustain: 0.85, release: 0.14,
      noten: Array.from({ length: 6 }, (_, i) => verschuif(w1Bas(), i * SECTIE)).flat(),
    },
    {
      type: 'sawtooth', volume: 0.028, attack: 0.25, sustain: 0.9, release: 0.5, legato: 1,
      noten: Array.from({ length: 6 }, (_, i) => verschuif(w1Pad(), i * SECTIE)).flat(),
    },
    {
      type: 'pulse', duty: 0.12, volume: 0.035, release: 0.05,
      // Arpeggio komt pas vanaf sectie 2 binnen, zodat de loop groeit.
      noten: [1, 2, 3, 4, 5].flatMap((i) => verschuif(w1Arp, i * SECTIE)),
    },
    {
      type: 'drum', volume: 0.16,
      noten: Array.from({ length: 6 }, (_, i) => verschuif(w1Drums, i * SECTIE)).flat(),
    },
  ],
})

// --- Titelscherm ------------------------------------------------------------
// Trager, weidser, geen drums op het eerste deel.

const titelAkkoorden = ['A2', 'F2', 'C3', 'G2']
export const LIED_TITEL = maakLied({
  naam: 'titel',
  tempo: 96,
  lengte: 256,
  kanalen: [
    {
      type: 'pulse', duty: 0.5, volume: 0.1, release: 0.3, sustain: 0.8,
      noten: maten([
        [0, [[0, 'E5', 6], [8, 'C5', 4], [12, 'D5', 4]]],
        [1, [[0, 'A4', 8], [8, 'C5', 4], [12, 'E5', 4]]],
        [2, [[0, 'G5', 6], [8, 'E5', 4], [12, 'C5', 4]]],
        [3, [[0, 'D5', 8], [8, 'B4', 8]]],
        [4, [[0, 'A5', 6], [8, 'G5', 4], [12, 'E5', 4]]],
        [5, [[0, 'F5', 8], [8, 'A5', 8]]],
        [6, [[0, 'G5', 6], [8, 'D5', 4], [12, 'B4', 4]]],
        [7, [[0, 'A4', 16]]],
        [8, [[0, 'E5', 6], [8, 'C5', 4], [12, 'D5', 4]]],
        [9, [[0, 'A4', 8], [8, 'C5', 4], [12, 'E5', 4]]],
        [10, [[0, 'G5', 6], [8, 'E5', 4], [12, 'C5', 4]]],
        [11, [[0, 'D5', 8], [8, 'B4', 8]]],
        [12, [[0, 'C6', 6], [8, 'A5', 4], [12, 'G5', 4]]],
        [13, [[0, 'F5', 8], [8, 'C5', 8]]],
        [14, [[0, 'E5', 6], [8, 'D5', 4], [12, 'B4', 4]]],
        [15, [[0, 'A4', 16]]],
      ]),
    },
    {
      type: 'triangle', volume: 0.17, sustain: 0.9, release: 0.3,
      noten: herhaal(titelAkkoorden.flatMap((g, i) => maat(i, [[0, g, 8], [8, transponeerNoot(g, 12), 8]])), 4, 64),
    },
    {
      type: 'sawtooth', volume: 0.03, attack: 0.5, sustain: 0.9, release: 0.8, legato: 1,
      noten: herhaal(
        titelAkkoorden.flatMap((g, i) => maat(i, [[0, transponeerNoot(g, 12), 15], [0, transponeerNoot(g, 19), 15]])),
        4, 64,
      ),
    },
    {
      type: 'pulse', duty: 0.12, volume: 0.026, release: 0.1,
      noten: herhaal([[0, 'A5', 1], [4, 'C6', 1], [8, 'E6', 1], [12, 'C6', 1]], 16, 16),
    },
  ],
})

// --- Wereldkaart ------------------------------------------------------------

export const LIED_KAART = maakLied({
  naam: 'kaart',
  tempo: 112,
  lengte: 256,
  kanalen: [
    {
      type: 'pulse', duty: 0.25, volume: 0.09, release: 0.14,
      noten: herhaal(maten([
        [0, [[0, 'C5', 2], [2, 'E5', 2], [4, 'G5', 4], [8, 'E5', 2], [10, 'C5', 2], [12, 'D5', 4]]],
        [1, [[0, 'F5', 4], [4, 'E5', 2], [6, 'C5', 2], [8, 'A4', 8]]],
        [2, [[0, 'D5', 2], [2, 'F5', 2], [4, 'A5', 4], [8, 'G5', 2], [10, 'E5', 2], [12, 'C5', 4]]],
        [3, [[0, 'G4', 4], [4, 'B4', 4], [8, 'C5', 8]]],
      ]), 4, 64),
    },
    {
      type: 'triangle', volume: 0.18, sustain: 0.85,
      noten: herhaal([[0, 'C3', 3], [4, 'G2', 3], [8, 'A2', 3], [12, 'F2', 3]], 16, 16),
    },
    {
      type: 'drum', volume: 0.12,
      noten: herhaal([[0, 'K', 1], [4, 'H', 1], [8, 'S', 1], [12, 'H', 1], [14, 'H', 1]], 16, 16),
    },
  ],
})

// --- Baasgevecht ------------------------------------------------------------

export const LIED_BAAS = maakLied({
  naam: 'baas',
  tempo: 152,
  lengte: 256,
  kanalen: [
    {
      type: 'pulse', duty: 0.5, volume: 0.11, release: 0.06,
      noten: herhaal(maten([
        [0, [[0, 'D5', 2], [2, 'D5', 1], [3, 'F5', 1], [4, 'D5', 2], [6, 'A#4', 2], [8, 'C5', 2], [10, 'D5', 2], [12, 'F5', 4]]],
        [1, [[0, 'E5', 2], [2, 'E5', 1], [3, 'G5', 1], [4, 'E5', 2], [6, 'C5', 2], [8, 'D5', 4], [12, 'A4', 4]]],
        [2, [[0, 'F5', 2], [2, 'A5', 2], [4, 'G5', 2], [6, 'F5', 2], [8, 'E5', 4], [12, 'D5', 4]]],
        [3, [[0, 'A#4', 2], [2, 'C5', 2], [4, 'D5', 4], [8, 'A4', 4], [12, 'D5', 4]]],
      ]), 4, 64),
    },
    {
      type: 'sawtooth', volume: 0.05, release: 0.05,
      noten: herhaal([[0, 'D2', 1], [2, 'D2', 1], [4, 'D2', 1], [6, 'F2', 1], [8, 'D2', 1], [10, 'D2', 1], [12, 'A#1', 1], [14, 'C2', 1]], 16, 16),
    },
    {
      type: 'triangle', volume: 0.2, sustain: 0.8,
      noten: herhaal([[0, 'D2', 2], [4, 'D2', 2], [8, 'A#1', 2], [12, 'C2', 2]], 16, 16),
    },
    {
      type: 'drum', volume: 0.2,
      noten: herhaal([[0, 'K', 1], [2, 'H', 1], [4, 'S', 1], [6, 'K', 1], [8, 'K', 1], [10, 'H', 1], [12, 'S', 1], [14, 'S', 1]], 16, 16),
    },
  ],
})

// --- Jingles (spelen één keer) ----------------------------------------------

export const JINGLE_GEHAALD = maakLied({
  naam: 'gehaald', tempo: 140, lengte: 40, herhaal: false,
  kanalen: [
    { type: 'pulse', duty: 0.5, volume: 0.16, noten: [[0, 'C5', 2], [2, 'E5', 2], [4, 'G5', 2], [6, 'C6', 6], [12, 'G5', 2], [14, 'C6', 12]] },
    { type: 'triangle', volume: 0.2, noten: [[0, 'C3', 4], [4, 'G3', 4], [8, 'C4', 4], [12, 'C3', 14]] },
    { type: 'drum', volume: 0.18, noten: [[0, 'K', 1], [4, 'K', 1], [8, 'K', 1], [12, 'S', 1], [14, 'S', 1]] },
  ],
})

export const JINGLE_STER = maakLied({
  naam: 'ster', tempo: 160, lengte: 16, herhaal: false,
  kanalen: [
    { type: 'pulse', duty: 0.25, volume: 0.14, noten: [[0, 'E5', 1], [1, 'G5', 1], [2, 'C6', 1], [3, 'E6', 5]] },
  ],
})

export const JINGLE_GAMEOVER = maakLied({
  naam: 'gameover', tempo: 100, lengte: 40, herhaal: false,
  kanalen: [
    { type: 'pulse', duty: 0.5, volume: 0.15, noten: [[0, 'A4', 4], [4, 'G4', 4], [8, 'F4', 4], [12, 'E4', 12]] },
    { type: 'triangle', volume: 0.2, noten: [[0, 'A2', 4], [4, 'G2', 4], [8, 'F2', 4], [12, 'E2', 14]] },
  ],
})

export const JINGLE_AANKOOP = maakLied({
  naam: 'aankoop', tempo: 168, lengte: 16, herhaal: false,
  kanalen: [
    { type: 'pulse', duty: 0.25, volume: 0.14, noten: [[0, 'G5', 1], [1, 'B5', 1], [2, 'D6', 1], [3, 'G6', 4]] },
    { type: 'triangle', volume: 0.16, noten: [[0, 'G3', 6]] },
  ],
})

export const LIEDJES = {
  titel: LIED_TITEL,
  kaart: LIED_KAART,
  w1: LIED_W1,
  baas: LIED_BAAS,
}

export const JINGLES = {
  gehaald: JINGLE_GEHAALD,
  ster: JINGLE_STER,
  gameover: JINGLE_GAMEOVER,
  aankoop: JINGLE_AANKOOP,
}
