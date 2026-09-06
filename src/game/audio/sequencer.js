// Patroon-sequencer. Plant noten vooruit in de Web Audio-tijdlijn (lookahead
// scheduling) in plaats van ze op requestAnimationFrame af te vuren; anders
// hoor je elke framehapering terug in het ritme.

import { synth, frequentie } from './synth.js'

const LOOKAHEAD = 0.2 // seconden vooruit plannen
const TIK = 40 // ms tussen twee planrondes

export class Sequencer {
  constructor() {
    this.lied = null
    this.stap = 0
    this.volgendeTijd = 0
    this.timer = 0
    this.draait = false
    this.uitfade = null
  }

  speel(lied, { herstart = true } = {}) {
    if (!synth.klaar) return
    if (this.lied === lied && this.draait) return
    this.lied = lied
    if (herstart || this.stap >= this.lengte) this.stap = 0
    this.volgendeTijd = synth.nu + 0.06
    if (!this.draait) {
      this.draait = true
      this.timer = setInterval(() => this._plan(), TIK)
    }
  }

  get lengte() { return this.lied?.lengte ?? 1 }

  stopMuziek() {
    this.draait = false
    clearInterval(this.timer)
    this.timer = 0
    this.lied = null
  }

  pauzeer() {
    this.draait = false
    clearInterval(this.timer)
    this.timer = 0
  }

  hervat() {
    if (!this.lied || this.draait) return
    this.volgendeTijd = synth.nu + 0.06
    this.draait = true
    this.timer = setInterval(() => this._plan(), TIK)
  }

  _plan() {
    if (!this.draait || !this.lied || !synth.klaar) return
    const l = this.lied
    const stapDuur = 60 / l.tempo / l.stappenPerTel

    while (this.volgendeTijd < synth.nu + LOOKAHEAD) {
      this._speelStap(this.stap, this.volgendeTijd, stapDuur)
      this.volgendeTijd += stapDuur
      this.stap++
      if (this.stap >= l.lengte) {
        if (l.herhaal === false) { this.stopMuziek(); return }
        this.stap = 0
      }
    }
  }

  _speelStap(stap, tijd, stapDuur) {
    const l = this.lied
    for (const kanaal of l.kanalen) {
      const gebeurtenissen = kanaal.index[stap]
      if (!gebeurtenissen) continue
      for (const ev of gebeurtenissen) {
        if (kanaal.type === 'drum') {
          drum(ev.noot, tijd, kanaal.volume ?? 0.2)
        } else {
          synth.toon({
            freq: frequentie(ev.noot),
            tijd,
            duur: Math.max(0.03, ev.lengte * stapDuur * (kanaal.legato ?? 0.9)),
            type: kanaal.type ?? 'pulse',
            duty: kanaal.duty ?? 0.5,
            volume: kanaal.volume ?? 0.15,
            bus: 'muziek',
            attack: kanaal.attack ?? 0.004,
            decay: kanaal.decay ?? 0.05,
            sustain: kanaal.sustain ?? 0.7,
            release: kanaal.release ?? 0.08,
            vibrato: kanaal.vibrato ?? 0,
          })
        }
      }
    }
  }
}

function drum(soort, tijd, volume) {
  if (soort === 'K') {
    synth.toon({ freq: 150, tijd, duur: 0.09, type: 'triangle', volume: volume * 1.5, bus: 'muziek', glijNaar: 42, attack: 0.002, decay: 0.02, sustain: 0.3, release: 0.04 })
    synth.ruis({ tijd, duur: 0.05, volume: volume * 0.5, bus: 'muziek', filterVan: 900, filterNaar: 120 })
  } else if (soort === 'S') {
    synth.ruis({ tijd, duur: 0.14, volume: volume * 0.9, bus: 'muziek', filterVan: 3200, filterNaar: 900, q: 0.8 })
    synth.toon({ freq: 220, tijd, duur: 0.05, type: 'triangle', volume: volume * 0.5, bus: 'muziek', glijNaar: 140 })
  } else if (soort === 'H') {
    synth.ruis({ tijd, duur: 0.05, volume: volume * 0.34, bus: 'muziek', filterVan: 9000, filterNaar: 6000, q: 2 })
  } else if (soort === 'O') { // open hihat
    synth.ruis({ tijd, duur: 0.18, volume: volume * 0.3, bus: 'muziek', filterVan: 8000, filterNaar: 5200, q: 2 })
  }
}

// --- Hulpmiddelen om liedjes compact op te schrijven -------------------------

// Zet een lijst [stap, noot, lengte] om in een index per stap, zodat de
// sequencer per stap niet hoeft te zoeken.
export function maakKanaal(kanaal) {
  const index = []
  for (const [stap, noot, lengte = 1] of kanaal.noten) {
    if (!index[stap]) index[stap] = []
    index[stap].push({ noot, lengte })
  }
  return { ...kanaal, index }
}

export function maakLied(def) {
  return {
    tempo: 120,
    stappenPerTel: 4,
    herhaal: true,
    ...def,
    kanalen: def.kanalen.map(maakKanaal),
  }
}

// Herhaalt een reeks noten met een vaste afstand. Scheelt honderden regels bij
// bassen en drums zonder dat het patroon minder muzikaal wordt.
export function herhaal(noten, aantal, afstand, transponeer = 0) {
  const uit = []
  for (let i = 0; i < aantal; i++) {
    for (const [stap, noot, lengte = 1] of noten) {
      uit.push([stap + i * afstand, transponeer ? transponeerNoot(noot, transponeer) : noot, lengte])
    }
  }
  return uit
}

const NAMEN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function transponeerNoot(noot, halve) {
  if (noot.length === 1 || 'KSHO'.includes(noot)) return noot
  const m = /^([A-G]#?)(-?\d)$/.exec(noot)
  if (!m) return noot
  const i = NAMEN.indexOf(m[1]) + Number(m[2]) * 12 + halve
  return `${NAMEN[((i % 12) + 12) % 12]}${Math.floor(i / 12)}`
}

// Verschuift een hele reeks in de tijd; handig om een B-deel achter een A-deel
// te plakken.
export function verschuif(noten, delta) {
  return noten.map(([stap, noot, lengte = 1]) => [stap + delta, noot, lengte])
}

export const sequencer = new Sequencer()
