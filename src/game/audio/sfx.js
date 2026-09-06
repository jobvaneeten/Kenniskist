// Geluidseffecten. Allemaal opgewekt door de synth — geen enkel audiobestand.

import { synth, frequentie } from './synth.js'
import { sequencer } from './sequencer.js'
import { LIEDJES, JINGLES } from './liedjes.js'

// Rennen geeft anders bij elke stap een tik; hier wordt het afgeknepen.
let laatsteStap = 0
let laatsteMunt = 0

export const sfx = {
  spring() {
    synth.toon({ freq: 300, duur: 0.1, type: 'pulse', duty: 0.35, volume: 0.16, glijNaar: 620, attack: 0.002, decay: 0.02, sustain: 0.5, release: 0.05 })
  },

  land(kracht = 1) {
    synth.ruis({ duur: 0.08, volume: 0.13 * kracht, filterVan: 1600, filterNaar: 220 })
    synth.toon({ freq: 160, duur: 0.05, type: 'triangle', volume: 0.1 * kracht, glijNaar: 70 })
  },

  stap() {
    const nu = synth.nu
    if (nu - laatsteStap < 0.13) return
    laatsteStap = nu
    synth.ruis({ duur: 0.035, volume: 0.035, filterVan: 2200, filterNaar: 700, q: 1.4 })
  },

  munt(reeks = 0) {
    // Oplopende toonhoogte bij snel achter elkaar pakken: dat leest als een
    // beloning in plaats van als herhaling.
    const nu = synth.nu
    const snel = nu - laatsteMunt < 0.45
    laatsteMunt = nu
    const trap = snel ? Math.min(7, reeks) : 0
    const basis = frequentie('E6') * Math.pow(2, trap / 12)
    synth.toon({ freq: basis, duur: 0.05, type: 'pulse', duty: 0.25, volume: 0.11, attack: 0.001, decay: 0.01, sustain: 0.8, release: 0.04 })
    synth.toon({ freq: basis * 1.5, tijd: synth.nu + 0.045, duur: 0.09, type: 'pulse', duty: 0.25, volume: 0.09, attack: 0.001, release: 0.06 })
  },

  // Geest-munt maakt bewust géén geluid; hij telt niet mee.
  geestMunt() {},

  stamp() {
    synth.ruis({ duur: 0.09, volume: 0.16, filterVan: 3000, filterNaar: 400 })
    synth.toon({ freq: 420, duur: 0.07, type: 'pulse', duty: 0.15, volume: 0.12, glijNaar: 140 })
  },

  vijandDood() {
    synth.toon({ freq: 500, duur: 0.14, type: 'pulse', duty: 0.35, volume: 0.11, glijNaar: 120 })
    synth.ruis({ duur: 0.16, volume: 0.09, filterVan: 4000, filterNaar: 300 })
  },

  schade() {
    synth.toon({ freq: 320, duur: 0.22, type: 'sawtooth', volume: 0.14, glijNaar: 90, attack: 0.002, sustain: 0.7 })
    synth.ruis({ duur: 0.14, volume: 0.1, filterVan: 1400, filterNaar: 200 })
  },

  dood() {
    synth.toon({ freq: 440, duur: 0.16, type: 'pulse', duty: 0.5, volume: 0.15, glijNaar: 660 })
    synth.toon({ freq: 660, tijd: synth.nu + 0.18, duur: 0.5, type: 'pulse', duty: 0.5, volume: 0.14, glijNaar: 110 })
  },

  checkpoint() {
    for (let i = 0; i < 3; i++) {
      synth.toon({ freq: frequentie(['C5', 'E5', 'G5'][i]), tijd: synth.nu + i * 0.07, duur: 0.14, type: 'pulse', duty: 0.25, volume: 0.11, release: 0.12 })
    }
  },

  powerup() {
    for (let i = 0; i < 5; i++) {
      synth.toon({ freq: frequentie(['C5', 'E5', 'G5', 'C6', 'E6'][i]), tijd: synth.nu + i * 0.045, duur: 0.1, type: 'pulse', duty: 0.35, volume: 0.1, release: 0.1 })
    }
  },

  capsule() {
    synth.toon({ freq: 220, duur: 0.06, type: 'pulse', duty: 0.5, volume: 0.13, glijNaar: 340 })
    synth.ruis({ duur: 0.05, volume: 0.08, filterVan: 3000, filterNaar: 900 })
  },

  blokKapot() {
    synth.ruis({ duur: 0.18, volume: 0.15, filterVan: 5000, filterNaar: 350, q: 0.7 })
    synth.toon({ freq: 180, duur: 0.09, type: 'triangle', volume: 0.09, glijNaar: 60 })
  },

  veer() {
    synth.toon({ freq: 200, duur: 0.18, type: 'pulse', duty: 0.15, volume: 0.15, glijNaar: 900, attack: 0.002, sustain: 0.6, release: 0.08, vibrato: 20 })
  },

  laser() {
    synth.toon({ freq: 1200, duur: 0.12, type: 'sawtooth', volume: 0.1, glijNaar: 300 })
  },

  portaal() {
    synth.toon({ freq: 180, duur: 0.3, type: 'sawtooth', volume: 0.09, glijNaar: 900, vibrato: 30 })
  },

  baasHit() {
    synth.toon({ freq: 140, duur: 0.24, type: 'sawtooth', volume: 0.17, glijNaar: 50 })
    synth.ruis({ duur: 0.24, volume: 0.14, filterVan: 2400, filterNaar: 120 })
  },

  uiNavigatie() {
    synth.toon({ freq: 660, duur: 0.035, type: 'pulse', duty: 0.25, volume: 0.07, release: 0.03 })
  },

  uiKiezen() {
    synth.toon({ freq: 520, duur: 0.06, type: 'pulse', duty: 0.35, volume: 0.1, glijNaar: 880, release: 0.06 })
  },

  uiTerug() {
    synth.toon({ freq: 480, duur: 0.07, type: 'pulse', duty: 0.35, volume: 0.09, glijNaar: 280, release: 0.06 })
  },

  uiGeblokkeerd() {
    synth.toon({ freq: 180, duur: 0.1, type: 'sawtooth', volume: 0.09, glijNaar: 140 })
  },

  telTik() {
    synth.toon({ freq: 900, duur: 0.02, type: 'pulse', duty: 0.15, volume: 0.05, release: 0.02 })
  },
}

// --- Muziekbeheer -----------------------------------------------------------
// Eén plek die weet welk nummer er hoort te spelen. Een jingle onderbreekt de
// muziek en zet hem daarna terug.

let huidigLied = null
let naJingle = null
let jingleTimer = 0

export const muziek = {
  speel(naam) {
    const lied = LIEDJES[naam]
    if (!lied) { this.stop(); return }
    if (huidigLied === naam && sequencer.draait) return
    huidigLied = naam
    naJingle = null
    clearTimeout(jingleTimer)
    sequencer.speel(lied)
  },

  stop() {
    huidigLied = null
    naJingle = null
    clearTimeout(jingleTimer)
    sequencer.stopMuziek()
  },

  pauzeer() { sequencer.pauzeer() },

  hervat() { sequencer.hervat() },

  // Speelt een jingle en pakt daarna de muziek weer op (of niets, als er geen
  // muziek liep).
  jingle(naam, vervolg = huidigLied) {
    const lied = JINGLES[naam]
    if (!lied) return
    naJingle = vervolg
    clearTimeout(jingleTimer)
    sequencer.stopMuziek()
    huidigLied = null
    sequencer.speel(lied)
    const duur = (lied.lengte * 60) / lied.tempo / lied.stappenPerTel
    jingleTimer = setTimeout(() => {
      if (naJingle) muziek.speel(naJingle)
      naJingle = null
    }, duur * 1000 + 120)
  },

  get huidig() { return huidigLied },
}
