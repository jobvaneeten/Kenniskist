// Lootbox-geluiden, helemaal gesynthetiseerd (geen bestanden): een klein
// mengpaneel met galm en een compressor, en daarop klop, gerommel, knal en
// een eigen deuntje per zeldzaamheid dat steeds groter wordt:
//   gewoon → plopje, zeldzaam → glinster-ding, episch → akkoord-arpeggio,
//   legendarisch → fanfare met klokken, ultra → fanfare + glissando + vuurwerk.
const MUTE_KEY = 'kk_lootbox_muted'

let ctx = null, uit = null, galm = null
function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14; comp.ratio.value = 4
    uit = ctx.createGain(); uit.gain.value = 0.9
    uit.connect(comp); comp.connect(ctx.destination)
    // galm: zelfgemaakte impulsrespons (ruis die uitsterft)
    const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let k = 0; k < 2; k++) {
      const d = ir.getChannelData(k)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
    }
    const conv = ctx.createConvolver(); conv.buffer = ir
    galm = ctx.createGain(); galm.gain.value = 0.35
    galm.connect(conv); conv.connect(uit)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function isMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1' } catch { return false }
}
export function setMuted(v) {
  try { localStorage.setItem(MUTE_KEY, v ? '1' : '0') } catch { /* privémodus */ }
}

// ── bouwstenen ──────────────────────────────────────────────────────────
// toon met omhullende; nat = hoeveel galm
function toon(ac, { freq, tot, start = 0, dur = 0.3, gain = 0.2, type = 'sine', aanslag = 0.01, nat = 0.3, detune = 0 }) {
  const t = ac.currentTime + start
  const o = ac.createOscillator(), g = ac.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune
  if (tot) o.frequency.exponentialRampToValueAtTime(tot, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + aanslag)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(uit)
  if (nat) { const s = ac.createGain(); s.gain.value = nat; g.connect(s); s.connect(galm) }
  o.start(t); o.stop(t + dur + 0.05)
}
// klok/bel: grondtoon + niet-harmonische boventonen
function klok(ac, freq, start, gain = 0.12, dur = 1.6) {
  ;[[1, 1], [2.76, 0.5], [5.4, 0.25], [8.9, 0.12]].forEach(([m, g]) =>
    toon(ac, { freq: freq * m, start, dur: dur / Math.sqrt(m), gain: gain * g, aanslag: 0.003, nat: 0.6 }))
}
// ruisvlaag door een filter (klop, whoosh, knal)
function ruis(ac, { start = 0, dur = 0.3, gain = 0.3, type = 'bandpass', freq = 1000, tot, q = 1, nat = 0.2 }) {
  const t = ac.currentTime + start
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate)
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource(); src.buffer = buf
  const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q
  f.frequency.setValueAtTime(freq, t); if (tot) f.frequency.exponentialRampToValueAtTime(tot, t + dur)
  const g = ac.createGain()
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f); f.connect(g); g.connect(uit)
  if (nat) { const s = ac.createGain(); s.gain.value = nat; g.connect(s); s.connect(galm) }
  src.start(t)
}
function boem(ac, start = 0, gain = 0.6, laag = 38) {
  toon(ac, { freq: 140, tot: laag, start, dur: 0.6, gain, aanslag: 0.004, nat: 0.15 })
  ruis(ac, { start, dur: 0.35, gain: gain * 0.5, type: 'lowpass', freq: 900, tot: 120, nat: 0.2 })
}
function glinster(ac, start, n = 10, basis = 1800, gain = 0.05) {
  for (let i = 0; i < n; i++) toon(ac, { freq: basis * (1 + Math.random() * 1.5), start: start + i * 0.045 + Math.random() * 0.02, dur: 0.25, gain, type: 'sine', aanslag: 0.002, nat: 0.7 })
}
// 'koperblazers': twee ontstemde zaagtanden door een lowpass
function fanfare(ac, freq, start, dur, gain = 0.1) {
  const t = ac.currentTime + start
  ;[-8, 8].forEach(det => {
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain()
    o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = det
    f.type = 'lowpass'; f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(3200, t + 0.08); f.frequency.exponentialRampToValueAtTime(1200, t + dur)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.04); g.gain.setValueAtTime(gain * 0.8, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(f); f.connect(g); g.connect(uit)
    const s = ac.createGain(); s.gain.value = 0.4; g.connect(s); s.connect(galm)
    o.start(t); o.stop(t + dur + 0.05)
  })
}
const N = (semi) => 523.25 * Math.pow(2, semi / 12)   // noot t.o.v. C5

// ── voor de kist ─────────────────────────────────────────────────────────
// Tik: houten klop + belletje dat per tik en zeldzaamheid hoger klinkt.
export function playTapSound(stap = 1, tier = 0) {
  if (isMuted()) return
  try {
    const ac = getCtx()
    ruis(ac, { dur: 0.09, gain: 0.5, type: 'bandpass', freq: 320 + stap * 60, q: 4, nat: 0.1 })
    toon(ac, { freq: 150 + stap * 25, tot: 90, dur: 0.14, gain: 0.3, type: 'triangle', aanslag: 0.003, nat: 0.05 })
    toon(ac, { freq: N(stap * 2 + tier * 3), dur: 0.35, gain: 0.07, type: 'sine', aanslag: 0.004, nat: 0.5 })
  } catch { /* geen audio */ }
}

// Gerommel tijdens de spanning: aanzwellende brom + ratelende ruis.
export function playRumble(dur = 2.6) {
  if (isMuted()) return
  try {
    const ac = getCtx(), t = ac.currentTime
    const o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), f = ac.createBiquadFilter(), g = ac.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(48, t); o.frequency.exponentialRampToValueAtTime(190, t + dur)
    lfo.frequency.setValueAtTime(7, t); lfo.frequency.linearRampToValueAtTime(28, t + dur); lg.gain.value = 14
    lfo.connect(lg); lg.connect(o.frequency)
    f.type = 'lowpass'; f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(1800, t + dur)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + dur * 0.95); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08)
    o.connect(f); f.connect(g); g.connect(uit)
    o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1)
    // rammelende houtjes: steeds dichter op elkaar
    let s = 0.1
    while (s < dur) { ruis(ac, { start: s, dur: 0.05, gain: 0.08 + 0.2 * (s / dur), type: 'bandpass', freq: 500 + Math.random() * 500, q: 5, nat: 0.05 }); s += 0.16 - 0.11 * (s / dur) }
    // opzwellende 'riser' erboven
    ruis(ac, { start: dur * 0.3, dur: dur * 0.7, gain: 0.12, type: 'bandpass', freq: 400, tot: 5000, q: 2, nat: 0.3 })
  } catch { /* geen audio */ }
}

// Deksel knalt open: boem + lucht-whoosh. Groter bij hogere zeldzaamheid.
export function playBurstSound(tier = 0) {
  if (isMuted()) return
  try {
    const ac = getCtx()
    boem(ac, 0, 0.45 + tier * 0.08, 40 - tier * 4)
    ruis(ac, { dur: 0.7, gain: 0.25, type: 'highpass', freq: 600, tot: 6000, nat: 0.4 })
    glinster(ac, 0.05, 6 + tier * 4, 1600, 0.04 + tier * 0.008)
  } catch { /* geen audio */ }
}

// Deuntje per zeldzaamheid (ook bij een kleur-upgrade tijdens het tikken).
export function playTierSound(rarity, kort = false) {
  if (isMuted()) return
  try {
    const ac = getCtx()
    if (rarity === 'common') {
      toon(ac, { freq: N(0), dur: 0.3, gain: 0.12, type: 'triangle' })
      toon(ac, { freq: N(7), start: 0.08, dur: 0.4, gain: 0.1, type: 'triangle' })
    } else if (rarity === 'rare') {
      klok(ac, N(7), 0, 0.14); klok(ac, N(12), 0.12, 0.12)
      if (!kort) glinster(ac, 0.15, 8, 2200)
    } else if (rarity === 'epic') {
      ;[0, 4, 7, 11, 14].forEach((s, i) => toon(ac, { freq: N(s - 5), start: i * 0.07, dur: 0.9, gain: 0.08, type: 'triangle', nat: 0.5 }))
      klok(ac, N(14), 0.35, 0.1)
      if (!kort) { ruis(ac, { dur: 0.8, gain: 0.12, type: 'bandpass', freq: 800, tot: 4000, q: 1.5, nat: 0.5 }); glinster(ac, 0.3, 12, 2400) }
    } else if (rarity === 'legendary') {
      if (kort) { fanfare(ac, N(-5), 0, 0.5, 0.08); klok(ac, N(12), 0.05, 0.12); return }
      fanfare(ac, N(-5), 0, 0.22, 0.09); fanfare(ac, N(-5), 0.24, 0.12, 0.08); fanfare(ac, N(0), 0.38, 1.3, 0.11)
      fanfare(ac, N(4), 0.38, 1.3, 0.07); fanfare(ac, N(7), 0.38, 1.3, 0.07)
      ;[0, 4, 7, 12].forEach((s, i) => klok(ac, N(s + 12), 0.4 + i * 0.12, 0.08))
      boem(ac, 0.38, 0.35); glinster(ac, 0.5, 18, 2600, 0.05)
    } else if (rarity === 'ultra_legendary') {
      if (kort) { fanfare(ac, N(-3), 0, 0.5, 0.09); klok(ac, N(15), 0.05, 0.12); glinster(ac, 0.1, 8, 3000); return }
      // glissando omhoog, dan een vol majeur-akkoord met klokken en vuurwerk
      toon(ac, { freq: N(-12), tot: N(12), dur: 0.6, gain: 0.08, type: 'sawtooth', nat: 0.4 })
      ;[0, 4, 7, 12, 16].forEach(s => fanfare(ac, N(s - 3), 0.6, 1.8, 0.07))
      ;[0, 4, 7, 12, 16, 19].forEach((s, i) => klok(ac, N(s + 9), 0.65 + i * 0.09, 0.08))
      boem(ac, 0.6, 0.55, 30)
      for (let k = 0; k < 5; k++) { boem(ac, 1.1 + k * 0.32, 0.18, 70); glinster(ac, 1.12 + k * 0.32, 8, 2000 + k * 300, 0.045) }
    }
  } catch { /* geen audio */ }
}

// ── de rest van de winkel-ervaring ───────────────────────────────────────
// Kaart/knop: zacht houten tikje.
export function playKlik() {
  if (isMuted()) return
  try { const ac = getCtx(); ruis(ac, { dur: 0.05, gain: 0.25, type: 'bandpass', freq: 1800, q: 3, nat: 0.05 }); toon(ac, { freq: 880, dur: 0.08, gain: 0.05, type: 'triangle', nat: 0.1 }) } catch { /* geen audio */ }
}
// Geld uitgeven: munten die rinkelen.
export function playMunten() {
  if (isMuted()) return
  try {
    const ac = getCtx()
    for (let i = 0; i < 5; i++) { const f = 2400 + Math.random() * 900; toon(ac, { freq: f, start: i * 0.06, dur: 0.18, gain: 0.06, type: 'square', aanslag: 0.002, nat: 0.3 }); toon(ac, { freq: f * 1.5, start: i * 0.06 + 0.01, dur: 0.14, gain: 0.03, nat: 0.3 }) }
  } catch { /* geen audio */ }
}
// Kist valt neer: zoef, dan een doffe houten plof.
export function playLanding() {
  if (isMuted()) return
  try {
    const ac = getCtx()
    ruis(ac, { dur: 0.35, gain: 0.12, type: 'bandpass', freq: 3000, tot: 500, q: 1, nat: 0.2 })
    boem(ac, 0.33, 0.4, 45)
    ruis(ac, { start: 0.33, dur: 0.15, gain: 0.35, type: 'bandpass', freq: 260, q: 3, nat: 0.1 })
  } catch { /* geen audio */ }
}
// Wachtende kist: zacht magisch zoemen met glinstering. Geeft een stopfunctie terug.
export function startSfeer() {
  if (isMuted()) return () => {}
  try {
    const ac = getCtx(), t = ac.currentTime
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.045, t + 1)
    const s = ac.createGain(); s.gain.value = 0.6; g.connect(uit); g.connect(s); s.connect(galm)
    const oscs = [N(-17), N(-10), N(-5)].map((f, i) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = i * 4
      const tril = ac.createOscillator(), tg = ac.createGain(); tril.frequency.value = 0.2 + i * 0.13; tg.gain.value = 3
      tril.connect(tg); tg.connect(o.detune); o.connect(g); o.start(); tril.start()
      return [o, tril]
    })
    const tik = setInterval(() => glinster(ac, 0, 2, 2600, 0.02), 900)
    return () => {
      clearInterval(tik)
      const n = ac.currentTime
      g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value, n); g.gain.exponentialRampToValueAtTime(0.0001, n + 0.4)
      oscs.forEach(([o, tr]) => { o.stop(n + 0.45); tr.stop(n + 0.45) })
    }
  } catch { return () => {} }
}
// Silhouet → kleur: omgekeerde bekken die aanzwelt en eindigt in een ta-da.
export function playOnthulling(tier = 0) {
  if (isMuted()) return
  try {
    const ac = getCtx()
    const t = ac.currentTime
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.55), ac.sampleRate)
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    const src = ac.createBufferSource(); src.buffer = buf
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.56)
    src.connect(f); f.connect(g); g.connect(uit); src.start(t)
    ;[0, 4, 7, 12].forEach((s, i) => toon(ac, { freq: N(s + tier * 2), start: 0.5 + i * 0.05, dur: 0.9, gain: 0.07, type: 'triangle', nat: 0.5 }))
    glinster(ac, 0.5, 8 + tier * 3, 2200)
  } catch { /* geen audio */ }
}
// Ster op het onthulscherm: plop met oplopende toon.
export function playSter(i = 0) {
  if (isMuted()) return
  try { const ac = getCtx(); toon(ac, { freq: N(i * 2 + 7), dur: 0.25, gain: 0.09, type: 'triangle', aanslag: 0.003, nat: 0.4 }); toon(ac, { freq: N(i * 2 + 19), dur: 0.2, gain: 0.03, nat: 0.4 }) } catch { /* geen audio */ }
}
// Sluiten: zachte zoef naar beneden.
export function playSluiten() {
  if (isMuted()) return
  try { const ac = getCtx(); ruis(ac, { dur: 0.3, gain: 0.12, type: 'bandpass', freq: 2500, tot: 400, q: 1.2, nat: 0.2 }) } catch { /* geen audio */ }
}
