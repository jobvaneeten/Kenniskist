// Kleine synth op de Web Audio API. Geen samples, geen audiobestanden: elke
// noot en elk effect wordt hier opgewekt.
//
// Bussen: master -> { muziek, sfx }. De volumes staan in de instellingen en
// worden via de opslaglaag bewaard.

const NOOT = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 }

export function frequentie(naam) {
  const m = /^([A-G]#?)(-?\d)$/.exec(naam)
  if (!m) return 440
  const halve = NOOT[m[1]] + (Number(m[2]) + 1) * 12
  return 440 * Math.pow(2, (halve - 69) / 12)
}

// Pulsgolf met instelbare duty cycle. Web Audio kent alleen square (duty 0.5),
// dus we bouwen de golf uit de Fourier-coëfficiënten van een pulse.
const golfCache = new Map()
function pulsGolf(ctx, duty) {
  const sleutel = duty.toFixed(2)
  if (golfCache.has(sleutel)) return golfCache.get(sleutel)
  const n = 32
  const re = new Float32Array(n)
  const im = new Float32Array(n)
  for (let k = 1; k < n; k++) {
    // Amplitude van de k-de harmonische van een pulse met deze duty.
    im[k] = (2 / (k * Math.PI)) * Math.sin(Math.PI * k * duty)
  }
  const golf = ctx.createPeriodicWave(re, im, { disableNormalization: false })
  golfCache.set(sleutel, golf)
  return golf
}

let ruisBuffer = null
function noise(ctx) {
  if (ruisBuffer) return ruisBuffer
  const lengte = ctx.sampleRate * 2
  ruisBuffer = ctx.createBuffer(1, lengte, ctx.sampleRate)
  const data = ruisBuffer.getChannelData(0)
  let vorig = 0
  for (let i = 0; i < lengte; i++) {
    // Iets gefilterde ruis: puur wit klinkt scherp en vermoeiend.
    const wit = Math.random() * 2 - 1
    vorig = (vorig + 0.32 * wit) / 1.32
    data[i] = vorig * 2.6
  }
  return ruisBuffer
}

export class Synth {
  constructor() {
    this.ctx = null
    this.master = null
    this.muziekBus = null
    this.sfxBus = null
    this.klaar = false
    this.volumes = { master: 1, muziek: 0.7, sfx: 0.9 }
  }

  // Mag pas na een gebruikersinteractie; de titelscène roept dit aan zodra er
  // een toets of muisklik is geweest (autoplay-beleid).
  start() {
    if (this.klaar) return true
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return false
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.volumes.master
    this.master.connect(this.ctx.destination)

    this.muziekBus = this.ctx.createGain()
    this.muziekBus.gain.value = this.volumes.muziek

    // Eenvoudige galm op de muziekbus: een korte delay met feedback. Geeft de
    // chiptune ruimte zonder een convolver en een impulsrespons-bestand.
    const delay = this.ctx.createDelay(0.5)
    delay.delayTime.value = 0.18
    const fb = this.ctx.createGain()
    fb.gain.value = 0.24
    const nat = this.ctx.createGain()
    nat.gain.value = 0.22
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 2600
    this.muziekBus.connect(delay)
    delay.connect(fb)
    fb.connect(delay)
    delay.connect(filter)
    filter.connect(nat)
    nat.connect(this.master)
    this.muziekBus.connect(this.master)

    this.sfxBus = this.ctx.createGain()
    this.sfxBus.gain.value = this.volumes.sfx
    this.sfxBus.connect(this.master)

    this.klaar = true
    return true
  }

  hervat() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume()
  }

  pauzeer() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend()
  }

  zetVolume(soort, waarde) {
    this.volumes[soort] = waarde
    if (!this.klaar) return
    const bus = soort === 'muziek' ? this.muziekBus : soort === 'sfx' ? this.sfxBus : this.master
    bus.gain.setTargetAtTime(waarde, this.ctx.currentTime, 0.02)
  }

  get nu() { return this.ctx ? this.ctx.currentTime : 0 }

  // Eén toon met ADSR. `opties.bus` is 'muziek' of 'sfx'.
  toon({ freq, tijd, duur, type = 'pulse', duty = 0.5, volume = 0.2, bus = 'sfx', attack = 0.005, decay = 0.04, sustain = 0.6, release = 0.06, glijNaar = 0, vibrato = 0 }) {
    if (!this.klaar) return
    const t = tijd ?? this.nu
    const osc = this.ctx.createOscillator()
    if (type === 'pulse') osc.setPeriodicWave(pulsGolf(this.ctx, duty))
    else osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (glijNaar) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glijNaar), t + duur)

    if (vibrato) {
      const lfo = this.ctx.createOscillator()
      const lfoGain = this.ctx.createGain()
      lfo.frequency.value = 5.5
      lfoGain.gain.value = vibrato
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      lfo.start(t)
      lfo.stop(t + duur + release)
    }

    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(volume, t + attack)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * sustain), t + attack + decay)
    g.gain.setValueAtTime(Math.max(0.0001, volume * sustain), t + duur)
    g.gain.exponentialRampToValueAtTime(0.0001, t + duur + release)

    osc.connect(g)
    g.connect(bus === 'muziek' ? this.muziekBus : this.sfxBus)
    osc.start(t)
    osc.stop(t + duur + release + 0.02)
  }

  // Ruiskanaal: drums en effecten (landen, kapot slaan, explosies).
  ruis({ tijd, duur = 0.12, volume = 0.25, bus = 'sfx', filterVan = 6000, filterNaar = 300, q = 1 }) {
    if (!this.klaar) return
    const t = tijd ?? this.nu
    const src = this.ctx.createBufferSource()
    src.buffer = noise(this.ctx)
    src.loop = true
    const f = this.ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = q
    f.frequency.setValueAtTime(filterVan, t)
    f.frequency.exponentialRampToValueAtTime(Math.max(60, filterNaar), t + duur)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(volume, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + duur)
    src.connect(f)
    f.connect(g)
    g.connect(bus === 'muziek' ? this.muziekBus : this.sfxBus)
    src.start(t)
    src.stop(t + duur + 0.02)
  }
}

export const synth = new Synth()
