// Neonglij: scherm, besturing, effecten, geluid, winkel en opslag.
// De spelregels staan in kern.js; dit bestand speelt de gebeurtenissen af die
// NG.zet teruggeeft en verandert zelf nooit iets aan de toestand.
(function () {
'use strict'
var cv = document.getElementById('c'), ctx = cv.getContext('2d')
var $ = function (id) { return document.getElementById(id) }
var W = NG_WERELDEN

// ── inbedding ──
// Met ?terug=1 een vrij spel met menu; zonder is het een beloning: één level
// spelen en dan op Klaar.
var params = new URLSearchParams(location.search)
var BELONING = !params.has('terug')
function naarOuder(type) { try { parent.postMessage({ type: type }, '*') } catch (e) { /* los geopend */ } }

// ── opslag (kk_-prefix: synct mee naar het account) ──
// v1: { v, sterren: { 'w-l': 1..3 }, munten, ballen, sporen, bal, spoor, geluid, rustig, dag: { d, ster } }
var OPSLAG = 'kk_ng'
var D = (function () {
  var d = {}
  try { d = JSON.parse(localStorage.getItem(OPSLAG) || '{}') || {} } catch (e) { d = {} }
  return {
    v: 1, sterren: d.sterren || {}, munten: d.munten || 0,
    ballen: d.ballen || ['neon'], sporen: d.sporen || ['gloed'], bal: d.bal || 'neon', spoor: d.spoor || 'gloed',
    geluid: d.geluid !== false, rustig: !!d.rustig, dag: d.dag || null, uitlegGezien: !!d.uitlegGezien, bezig: d.bezig || null,
  }
})()
function bewaar() { try { localStorage.setItem(OPSLAG, JSON.stringify(D)) } catch (e) { /* geen opslag */ } }

// ── winkel ──
var BALLEN = [
  { id: 'neon', naam: 'Neon', prijs: 0, kern: '#effdff', gloed: '#3ef0ff' },
  { id: 'roze', naam: 'Flamingo', prijs: 40, kern: '#fff0fb', gloed: '#ff4fd8' },
  { id: 'lime', naam: 'Limoen', prijs: 70, kern: '#f4ffe6', gloed: '#8dff4f' },
  { id: 'lava', naam: 'Lava', prijs: 110, kern: '#fff1d6', gloed: '#ff6a2a', vlek: '#ff2a00' },
  { id: 'plasma', naam: 'Plasma', prijs: 160, kern: '#f3ebff', gloed: '#9b6bff', ring: true },
  { id: 'ijs', naam: 'IJskristal', prijs: 220, kern: '#ffffff', gloed: '#9fe8ff', facet: true },
  { id: 'regenboog', naam: 'Regenboog', prijs: 300, kern: '#ffffff', gloed: null },
  { id: 'goud', naam: 'Goud', prijs: 400, kern: '#fff6cf', gloed: '#ffc83d', glans: true },
]
var SPOREN = [
  { id: 'gloed', naam: 'Gloed', prijs: 0 },
  { id: 'vonk', naam: 'Vonken', prijs: 90 },
  { id: 'ster', naam: 'Sterretjes', prijs: 170 },
  { id: 'regenboog', naam: 'Regenboog', prijs: 260 },
]
function balSkin() { return BALLEN.find(function (b) { return b.id === D.bal }) || BALLEN[0] }
function gloedVan(b, t) { return b.gloed || 'hsl(' + ((t * 90) % 360) + ',95%,62%)' }

// ── geluid: kleine synthesizer, één hoofdvolume met een compressor ──
var AC = null, hoofd = null
function audio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)()
      var comp = AC.createDynamicsCompressor(); comp.connect(AC.destination)
      hoofd = AC.createGain(); hoofd.gain.value = 0.55; hoofd.connect(comp)
    } catch (e) { AC = null }
  }
  if (AC && AC.state === 'suspended') AC.resume()
  return AC
}
function toon(f, dur, type, vol, delay, f2) {
  if (!D.geluid) return
  var a = audio(); if (!a) return
  var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain()
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur)
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(hoofd); o.start(t); o.stop(t + dur + 0.02)
}
var ruisBuf = null
function ruis(dur, vol, freq, q, delay, hoog) {
  if (!D.geluid) return
  var a = audio(); if (!a) return
  if (!ruisBuf) {
    ruisBuf = a.createBuffer(1, a.sampleRate, a.sampleRate)
    var d = ruisBuf.getChannelData(0)
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  var t = a.currentTime + (delay || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain()
  s.buffer = ruisBuf; f.type = hoog ? 'highpass' : 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = q || 1
  g.gain.setValueAtTime(vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  s.connect(f); f.connect(g); g.connect(hoofd); s.start(t); s.stop(t + dur + 0.02)
}
var STIL = { glij: function () {}, kristal: function () {}, kraak: function () {}, knop: function () {}, pijl: function () {}, portaal: function () {}, duw: function () {}, bots: function () {}, val: function () {}, win: function () {}, vul: function () {} }
function snd() { return spel && spel.demo ? STIL : Geluid }
var PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319]
var Geluid = {
  glij: function (n) { ruis(Math.min(0.5, 0.08 + n * 0.035), 0.05, 2400, 0.7) },
  bots: function () { toon(150, 0.14, 'sine', 0.32, 0, 60); ruis(0.05, 0.08, 500, 1) },
  kristal: function (k) { var f = PENTA[Math.min(k, PENTA.length - 1)]; toon(f, 0.22, 'triangle', 0.2); toon(f * 2, 0.16, 'sine', 0.08, 0.04) },
  duw: function () { toon(95, 0.2, 'square', 0.1, 0, 55); ruis(0.22, 0.1, 700, 0.8) },
  vul: function () { toon(220, 0.18, 'sine', 0.18, 0, 110); toon(330, 0.2, 'triangle', 0.12, 0.08) },
  portaal: function () { toon(300, 0.25, 'sine', 0.15, 0, 1300); toon(600, 0.2, 'triangle', 0.06, 0.05, 2000) },
  knop: function () { toon(880, 0.05, 'square', 0.08); toon(660, 0.08, 'square', 0.07, 0.06) },
  pijl: function () { toon(1200, 0.05, 'triangle', 0.08) },
  kraak: function () { ruis(0.16, 0.12, 3000, 0.5, 0, true) },
  val: function () { toon(500, 0.6, 'sine', 0.2, 0, 70) },
  win: function () { [523, 659, 784, 1047].forEach(function (f, i) { toon(f, 0.3, 'triangle', 0.17, i * 0.09) }); toon(1568, 0.5, 'sine', 0.08, 0.36) },
  niks: function () { toon(180, 0.08, 'sine', 0.12, 0, 150) },
  terug: function () { toon(520, 0.08, 'sine', 0.1, 0, 380) },
  klik: function () { toon(700, 0.04, 'triangle', 0.08) },
  koop: function () { [784, 1047, 1319].forEach(function (f, i) { toon(f, 0.18, 'triangle', 0.14, i * 0.07) }) },
}

// ── layout ──
var dpr = 1, BW = 0, BH = 0, S = 40, ox = 0, oy = 0
function meet() {
  dpr = Math.min(2, window.devicePixelRatio || 1)
  BW = innerWidth; BH = innerHeight
  cv.width = Math.floor(BW * dpr); cv.height = Math.floor(BH * dpr)
  if (spel) plaatsBord()
}
window.addEventListener('resize', meet)
function plaatsBord() {
  var boven = 104, onder = 92
  S = Math.floor(Math.min((BW - 20) / spel.s.w, (BH - boven - onder) / spel.s.h, 78))
  S = Math.max(16, S)
  ox = Math.round((BW - S * spel.s.w) / 2)
  oy = Math.round(boven + (BH - boven - onder - S * spel.s.h) / 2)
  tekenVast()
}
function cx(i) { return ox + (i % spel.s.w) * S + S / 2 }
function cy(i) { return oy + ((i / spel.s.w) | 0) * S + S / 2 }

// ── spel-toestand ──
var spel = null        // { bron, rijen, min, s, begin, hist, gevallen, gewonnen, hue }
var anim = null        // de zet die nu wordt afgespeeld
var vis = null         // wat er nu te zien is: { c, flip, kristallen }
var wacht = null       // gebufferde zet { r, t }
var blokAnim = null, balVal = 0, balWin = 0, rek = 0, deuk = null
var deeltjes = [], teksten = [], trauma = 0, schudT = 0, flitsPoort = 0, flitsPijl = {}
var spoorPunten = []
var tijd = 0

function maakSpel(bron, lv, demo) {
  var s = NG.laad(lv.r)
  spel = {
    bron: bron, rijen: lv.r, min: lv.min, s: s, begin: s, hist: [], gevallen: false, gewonnen: false, demo: !!demo,
    hue: bron.type === 'dag' ? 300 : W[bron.w].kleur,
  }
  anim = null; wacht = null; blokAnim = null; balVal = 0; balWin = 0; deuk = null
  deeltjes = []; teksten = []; spoorPunten = []
  zetVis(s)
  plaatsBord()
}
function startLevel(bron) {
  var lv = bron.type === 'dag' ? bron.lv : W[bron.w].levels[bron.l]
  maakSpel(bron, lv)
  toonScherm(null)
  $('titel').textContent = bron.type === 'dag' ? 'Uitdaging: ' + lv.naam : W[bron.w].naam + ' ' + (bron.l + 1)
  $('tip').classList.toggle('aan', bron.type === 'level' && bron.w === 0 && bron.l === 0)
  verbergMelding()
  hudBij()
  bewaarBezig()
}
function zetVis(s) { vis = { c: s.c.slice(), flip: s.flip, kristallen: s.kristallen, bal: s.bal } }

// ── verder waar je was: het level waar je mee bezig bent, na elke zet bewaard ──
function pak(s) { return { c: s.c.join(''), bal: s.bal, flip: s.flip, kristallen: s.kristallen, zetten: s.zetten } }
function uitpak(p, basis) {
  var s = NG.kopie(basis)
  if (p.c.length !== s.c.length) throw new Error('ander level')
  s.c = p.c.split(''); s.bal = p.bal; s.flip = !!p.flip; s.kristallen = p.kristallen; s.zetten = p.zetten
  return s
}
function bewaarBezig() {
  if (!spel || spel.demo) return
  var b = spel.bron
  D.bezig = spel.gewonnen ? null : {
    bron: b.type === 'dag' ? { type: 'dag', dag: b.dag } : { type: 'level', w: b.w, l: b.l },
    s: pak(spel.s), hist: spel.hist.slice(-25).map(pak), gevallen: spel.gevallen,
  }
  bewaar()
}
function bezigNaam() {
  var z = D.bezig
  if (!z) return ''
  if (z.bron.type === 'dag') return z.bron.dag === vandaag() ? 'uitdaging van vandaag' : ''
  return W[z.bron.w] && W[z.bron.w].levels[z.bron.l] ? W[z.bron.w].naam + ' ' + (z.bron.l + 1) : ''
}
function hervat() {
  var z = D.bezig
  if (!z || !bezigNaam()) { D.bezig = null; return false }
  if (z.bron.type === 'dag') startDag(); else startLevel(z.bron)
  try {
    spel.s = uitpak(z.s, spel.begin)
    spel.hist = (z.hist || []).map(function (p) { return uitpak(p, spel.begin) })
    spel.gevallen = !!z.gevallen
  } catch (e) { spel.s = spel.begin; spel.hist = []; spel.gevallen = false }
  zetVis(spel.s); hudBij(); $('tip').classList.remove('aan')
  if (spel.gevallen) melding('Oei, je viel in een gat! Zet terug of begin opnieuw.')
  else if (spel.s.zetten) melding('Je gaat verder waar je was.')
  bewaarBezig()
  return true
}

function hudBij() {
  if (!spel) return
  $('zetten').textContent = spel.s.zetten
  $('drie').innerHTML = '· ' + sterSvg(true, 14) + ' bij ' + spel.min
  $('kristalinfo').innerHTML = '· ' + kristalSvg() + ' ' + totaalPak() + '/' + spel.s.totaal
  $('terugzet').disabled = !spel.hist.length
}
function kristalSvg() { return '<svg width="14" height="14" viewBox="0 0 24 24"><path d="M12 2l8 8-8 12-8-12z" fill="#ffc83d"/></svg>' }
function sterSvg(aan, maat) {
  return '<svg class="ster' + (aan ? '' : ' uit') + '" style="width:' + (maat || 18) + 'px;height:' + (maat || 18) + 'px;display:inline-block;vertical-align:-2px" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>'
}
// hoeveel kristallen er (in beeld) al gepakt zijn
function totaalPak() { return spel.s.totaal - vis.kristallen }

// ── zetten ──
function doe(r) {
  if (!spel || spel.demo || spel.gewonnen || huidigScherm) return
  speel(r)
}
function speel(r) {
  if (anim) { wacht = { r: r, t: performance.now() }; return }
  if (spel.gevallen) { melding('Zet eerst terug of begin opnieuw.'); Geluid.niks(); wiebel(r); return }
  var u = NG.zet(spel.s, r)
  if (u.gevolg === 'niks') { Geluid.niks(); wiebel(r); return }
  if (u.gevolg === 'lus') { Geluid.niks(); wiebel(r); melding('Dan glij je voor altijd rond. Probeer een andere kant.'); return }
  $('tip').classList.remove('aan')
  verbergMelding()
  spel.hist.push(spel.s)
  var A = u.pad.length ? u.pad[u.pad.length - 1].a : 0
  anim = { u: u, A: A, a: 0, v: 7, ev: 0, stop: 0, r: r }
  zetVis(spel.s)
  if (A > 0) snd().glij(A)
}
function wiebel(r) { deuk = { r: r, t: 0, soort: 'wiebel' } }

function speelAf(dt) {
  if (!anim) return
  if (anim.stop > 0) { anim.stop -= dt; return }        // even stilstaan (hit-stop)
  if (anim.a < anim.A) {
    anim.v = Math.min(22, anim.v + 70 * dt)              // optrekken op het ijs
    anim.a = Math.min(anim.A, anim.a + anim.v * dt)
  }
  var lijst = anim.u.ev
  while (anim.ev < lijst.length && lijst[anim.ev].a <= anim.a + 1e-6) { gebeurtenis(lijst[anim.ev]); anim.ev++ }
  if (anim.a >= anim.A && anim.ev >= lijst.length && !blokAnim && balVal === 0 && balWin === 0) klaarMetZet()
}
function gebeurtenis(e) {
  var hue = spel.hue
  switch (e.t) {
    case 'kristal':
      vis.c[e.i] = '.'; vis.kristallen = e.over
      snd().kristal(spel.s.totaal - e.over - 1)
      spat(cx(e.i), cy(e.i), 12, '#ffc83d', 160)
      tekst(cx(e.i), cy(e.i) - S * 0.3, e.over ? (spel.s.totaal - e.over) + '/' + spel.s.totaal : 'Uitgang open!', e.over ? '#ffe08a' : '#7dfff0')
      schud(0.12)
      hudBij()
      break
    case 'kraak':
      vis.c[e.i] = 'O'; snd().kraak()
      spat(cx(e.i), cy(e.i), 8, '#bfe9ff', 90)
      break
    case 'knop':
      vis.flip = e.flip; snd().knop(); flitsPoort = 1
      spat(cx(e.i), cy(e.i), 6, 'hsl(' + hue + ',95%,65%)', 80)
      break
    case 'pijl':
      snd().pijl(); flitsPijl[e.i] = 1
      break
    case 'portaal':
      snd().portaal()
      spat(cx(e.van), cy(e.van), 10, '#ff4fd8', 120); spat(cx(e.naar), cy(e.naar), 10, '#ff4fd8', 120)
      spoorPunten = []
      break
    case 'duw':
      vis.c[e.van] = '.'
      blokAnim = { e: e, t: 0, dur: Math.max(0.12, afstand(e.van, e.naar) / 16) }
      anim.stop = 0.05; schud(0.3); snd().duw(); knijp(e.r)
      break
    case 'bots':
      snd().bots(); schud(e.blok ? 0.18 : 0.15); knijp(e.r)
      var bx = cx(e.i) + NG.DX[e.r] * S * 0.45, by = cy(e.i) + NG.DY[e.r] * S * 0.45
      spat(bx, by, 5, 'hsl(' + hue + ',95%,70%)', 120, e.r)
      break
    case 'val':
      balVal = 0.0001; snd().val(); schud(0.45)
      break
    case 'win':
      balWin = 0.0001; snd().win()
      spat(cx(e.i), cy(e.i), 34, '#7dfff0', 240); spat(cx(e.i), cy(e.i), 18, '#ffc83d', 200)
      break
  }
}
function afstand(a, b) { var w = spel.s.w; return Math.abs(a % w - b % w) + Math.abs((a / w | 0) - (b / w | 0)) }
function knijp(r) { deuk = { r: r, t: 0, soort: 'knijp' } }

function klaarMetZet() {
  var u = anim.u
  spel.s = u.s; anim = null
  zetVis(spel.s)
  hudBij()
  if (u.gevolg === 'val') { spel.gevallen = true; melding('Oei, je viel in een gat! Zet terug of begin opnieuw.') }
  if (u.gevolg === 'win') { spel.gewonnen = true; if (spel.demo) demoWacht = 1.4; else { bewaarBezig(); setTimeout(gewonnen, 350) } return }
  bewaarBezig()
  if (wacht && performance.now() - wacht.t < 450) { var r = wacht.r; wacht = null; doe(r) }
  wacht = null
}
// meteen naar het eind van de zet (voor terugzetten tijdens een zet)
function rondAf() {
  if (!anim) return
  while (anim.ev < anim.u.ev.length) anim.ev++
  blokAnim = null; balVal = 0; balWin = 0
  spel.s = anim.u.s; anim = null
  if (spel.s.klaar) spel.gewonnen = true
}

function zetTerug() {
  if (!spel || spel.gewonnen || huidigScherm) return
  rondAf()
  if (spel.gewonnen || !spel.hist.length) return
  spel.s = spel.hist.pop(); spel.gevallen = false
  zetVis(spel.s); spoorPunten = []; verbergMelding(); Geluid.terug(); hudBij(); bewaarBezig()
}
function opnieuw() {
  if (!spel || huidigScherm) return
  rondAf()
  if (spel.gewonnen) return
  if (spel.s === spel.begin) return
  spel.hist.push(spel.s)                        // ook opnieuw beginnen kun je terugzetten
  spel.s = spel.begin; spel.gevallen = false
  zetVis(spel.s); spoorPunten = []; verbergMelding(); Geluid.terug(); hudBij(); bewaarBezig()
}

// ── gewonnen ──
function gewonnen() {
  var st = NG.sterren(spel.s.zetten, spel.min), extra = 0
  if (spel.bron.type === 'level') {
    var k = spel.bron.w + '-' + spel.bron.l, oud = D.sterren[k] || 0
    if (st > oud) { extra = (st - oud) * 5; D.sterren[k] = st }
  } else {
    var dag = spel.bron.dag
    if (!D.dag || D.dag.d !== dag) { D.dag = { d: dag, ster: st }; extra = 15 }
    else if (st > D.dag.ster) D.dag.ster = st
  }
  D.munten += extra; bewaar()
  $('wintitel').textContent = st === 3 ? 'Perfect!' : 'Gelukt!'
  $('winsterren').innerHTML = [1, 2, 3].map(function (n) { return sterSvg(n <= st, 58).replace('style="width:58px;height:58px;display:inline-block;vertical-align:-2px"', '') }).join('')
  $('wintekst').textContent = st === 3 ? 'In het minste aantal zetten. Knap!' : 'Lukt het je in ' + spel.min + ' zetten? Dan krijg je 3 sterren.'
  $('w-zetten').textContent = spel.s.zetten
  $('w-min').textContent = spel.min
  $('w-munten').innerHTML = extra ? 'Verdiend: <span class="munt">' + extra + '</span>' : ''
  var heeftVolgende = spel.bron.type === 'level' && volgendeLevel(spel.bron) != null
  $('volgende').classList.toggle('verborgen', !BELONING && !heeftVolgende)
  $('klaar').classList.add('verborgen')
  $('nogeens').classList.toggle('verborgen', BELONING)
  $('winlevels').classList.toggle('verborgen', BELONING)
  $('winlevels').textContent = spel.bron.type === 'dag' ? 'Menu' : 'Levels'
  toonScherm('gewonnen')
  if (st === 3) setTimeout(function () { Geluid.koop() }, 600)
}
function volgendeLevel(b) {
  if (b.l < 11) return { type: 'level', w: b.w, l: b.l + 1 }
  if (b.w < W.length - 1 && wereldOpen(b.w + 1)) return { type: 'level', w: b.w + 1, l: 0 }
  return null
}

// ── voortgang ──
function sterVan(w, l) { return D.sterren[w + '-' + l] || 0 }
function klaarIn(w) { var n = 0; for (var l = 0; l < 12; l++) if (sterVan(w, l)) n++; return n }
function wereldOpen(w) { return w === 0 || klaarIn(w - 1) >= 8 }
function levelOpen(w, l) { return wereldOpen(w) && (l === 0 || sterVan(w, l - 1) > 0) }
function eersteOpen() {
  for (var w = 0; w < W.length; w++) {
    if (!wereldOpen(w)) break
    for (var l = 0; l < 12; l++) if (levelOpen(w, l) && !sterVan(w, l)) return { type: 'level', w: w, l: l }
  }
  return null
}
function vandaag() { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() }

// ── effecten ──
function schud(t) { if (!D.rustig && !(spel && spel.demo)) trauma = Math.min(1, trauma + t) }
function spat(x, y, n, col, kracht, r) {
  for (var i = 0; i < n; i++) {
    var hoek = r != null ? Math.atan2(-NG.DY[r], -NG.DX[r]) + (Math.random() - 0.5) * 2.2 : Math.random() * Math.PI * 2
    var v = kracht * (0.35 + Math.random() * 0.75)
    deeltjes.push({ x: x, y: y, vx: Math.cos(hoek) * v, vy: Math.sin(hoek) * v, t: 0, max: 0.4 + Math.random() * 0.35, r: 1.5 + Math.random() * 2.5, col: col })
  }
}
function tekst(x, y, s, col) { teksten.push({ x: x, y: y, s: s, col: col, t: 0 }) }
function melding(s) { var m = $('melding'); m.textContent = s; m.classList.remove('aan'); void m.offsetWidth; m.classList.add('aan') }
function verbergMelding() { $('melding').classList.remove('aan') }

// ── tekenen ──
var vast = document.createElement('canvas'), vctx = vast.getContext('2d')
function rondRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
}
// muren, vloer en pijlen veranderen niet: één keer tekenen
function tekenVast() {
  var s = spel.s, w = s.w, h = s.h, hue = spel.hue
  vast.width = Math.ceil(w * S * dpr) + 2; vast.height = Math.ceil(h * S * dpr) + 2
  var g = vctx
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w * S, h * S)
  var muur = function (x, y) { return x < 0 || y < 0 || x >= w || y >= h || spel.rijen[y][x] === '#' }
  var R = NG.rng(w * 131 + h * 17 + spel.rijen.join('').length)
  // ijsvloer: koel blauw, licht aan de bovenkant, met een glinstering
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    if (muur(x, y)) continue
    var px = x * S, py = y * S
    var gr = g.createLinearGradient(px, py, px + S, py + S)
    gr.addColorStop(0, 'rgba(170,230,255,0.20)'); gr.addColorStop(0.55, 'rgba(90,170,255,0.10)'); gr.addColorStop(1, 'hsla(' + hue + ',80%,55%,0.10)')
    g.fillStyle = gr; rondRect(g, px + 1.5, py + 1.5, S - 3, S - 3, S * 0.18); g.fill()
    g.strokeStyle = 'rgba(200,240,255,0.16)'; g.lineWidth = 1; g.stroke()
    g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = Math.max(1, S * 0.035); g.lineCap = 'round'
    g.beginPath(); g.moveTo(px + S * 0.2, py + S * 0.62); g.lineTo(px + S * 0.38, py + S * 0.26)
    g.moveTo(px + S * 0.32, py + S * 0.7); g.lineTo(px + S * 0.42, py + S * 0.5); g.stroke()
    if (R() < 0.35) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(px + S * (0.2 + R() * 0.6), py + S * (0.2 + R() * 0.6), Math.max(0.8, S * 0.02), 0, 7); g.fill() }
    var t = spel.rijen[y][x]
    if (NG.PIJL[t] != null) {
      g.save(); g.shadowColor = '#7dfff0'; g.shadowBlur = S * 0.25
      tekenPijl(g, px + S / 2, py + S / 2, NG.PIJL[t], '#7dfff0'); g.restore()
    }
  }
  // buitenmuur (vast aan de rand) blijft doorzichtig; losse muurblokken in het
  // veld worden donkere, verhoogde blokken
  var buiten = {}, stapel = []
  for (var bx = 0; bx < w; bx++) { stapel.push(bx, (h - 1) * w + bx) }
  for (var by = 0; by < h; by++) { stapel.push(by * w, by * w + w - 1) }
  while (stapel.length) {
    var q = stapel.pop(), qx0 = q % w, qy0 = q / w | 0
    if (buiten[q] || !muur(qx0, qy0)) continue
    buiten[q] = 1
    if (qx0 > 0) stapel.push(q - 1); if (qx0 < w - 1) stapel.push(q + 1)
    if (qy0 > 0) stapel.push(q - w); if (qy0 < h - 1) stapel.push(q + w)
  }
  var mg = g.createLinearGradient(0, 0, 0, h * S)
  mg.addColorStop(0, 'hsla(' + hue + ',50%,14%,0.95)'); mg.addColorStop(1, 'hsla(' + hue + ',60%,7%,0.95)')
  g.fillStyle = mg
  for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
    if (muur(xx, yy) && !buiten[yy * w + xx]) g.fillRect(xx * S, yy * S, S, S)
  }
  // neonranden waar muur aan ijs grenst: brede zachte gloed met een felle kern
  var randen = new Path2D()
  for (var y2 = 0; y2 < h; y2++) for (var x2 = 0; x2 < w; x2++) {
    if (!muur(x2, y2)) continue
    var ax = x2 * S, ay = y2 * S, m = S * 0.05
    if (!muur(x2, y2 - 1)) { randen.moveTo(ax, ay + m); randen.lineTo(ax + S, ay + m) }
    if (!muur(x2, y2 + 1)) { randen.moveTo(ax, ay + S - m); randen.lineTo(ax + S, ay + S - m) }
    if (!muur(x2 - 1, y2)) { randen.moveTo(ax + m, ay); randen.lineTo(ax + m, ay + S) }
    if (!muur(x2 + 1, y2)) { randen.moveTo(ax + S - m, ay); randen.lineTo(ax + S - m, ay + S) }
  }
  g.save(); g.lineCap = 'round'
  g.strokeStyle = 'hsla(' + hue + ',95%,60%,0.5)'; g.lineWidth = Math.max(4, S * 0.16); g.shadowColor = 'hsl(' + hue + ',95%,60%)'; g.shadowBlur = S * 0.5
  g.stroke(randen)
  g.shadowBlur = S * 0.15; g.strokeStyle = 'hsl(' + hue + ',100%,74%)'; g.lineWidth = Math.max(1.5, S * 0.05)
  g.stroke(randen)
  g.restore()
}
function tekenPijl(g, x, y, r, col) {
  g.save(); g.translate(x, y); g.rotate(r * Math.PI / 2)
  g.strokeStyle = col; g.lineWidth = Math.max(2, S * 0.09); g.lineCap = 'round'; g.lineJoin = 'round'
  for (var k = 0; k < 2; k++) {
    var dy = -S * 0.12 + k * S * 0.22
    g.globalAlpha = k ? 0.5 : 1
    g.beginPath(); g.moveTo(-S * 0.2, dy + S * 0.1); g.lineTo(0, dy - S * 0.1); g.lineTo(S * 0.2, dy + S * 0.1); g.stroke()
  }
  g.restore()
}

var PORTKLEUR = { p: '#ff4fd8', q: '#8dff4f', r: '#ff9a3d' }
function tekenDynamisch() {
  var s = spel.s, c = vis.c, hue = spel.hue
  for (var i = 0; i < c.length; i++) {
    var t = c[i]
    if (t === '#' || t === '.') continue
    var x = cx(i), y = cy(i)
    if (t === 'O') {
      var gr = ctx.createRadialGradient(x, y, 0, x, y, S * 0.46)
      gr.addColorStop(0, '#000'); gr.addColorStop(0.75, '#04030c'); gr.addColorStop(1, 'rgba(60,40,120,0.5)')
      ctx.fillStyle = gr; rondRect(ctx, x - S * 0.44, y - S * 0.44, S * 0.88, S * 0.88, S * 0.22); ctx.fill()
      ctx.strokeStyle = 'rgba(155,107,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke()
    } else if (t === 'x') {
      ctx.strokeStyle = 'rgba(200,235,255,0.75)'; ctx.lineWidth = Math.max(1.2, S * 0.035)
      ctx.beginPath()
      ctx.moveTo(x - S * 0.3, y - S * 0.12); ctx.lineTo(x - S * 0.05, y + S * 0.02); ctx.lineTo(x + S * 0.08, y - S * 0.28)
      ctx.moveTo(x - S * 0.05, y + S * 0.02); ctx.lineTo(x + S * 0.02, y + S * 0.3)
      ctx.moveTo(x + S * 0.08, y + S * 0.12); ctx.lineTo(x + S * 0.32, y + S * 0.05)
      ctx.stroke()
    } else if (t === '*') {
      var bob = Math.sin(tijd * 3 + i) * S * 0.05
      ctx.save(); ctx.translate(x, y + bob); ctx.rotate(Math.sin(tijd * 1.5 + i) * 0.15)
      ctx.shadowColor = '#ffc83d'; ctx.shadowBlur = S * 0.4
      ctx.fillStyle = '#ffc83d'
      ctx.beginPath(); ctx.moveTo(0, -S * 0.28); ctx.lineTo(S * 0.2, -S * 0.05); ctx.lineTo(0, S * 0.28); ctx.lineTo(-S * 0.2, -S * 0.05); ctx.closePath(); ctx.fill()
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff6cf'
      ctx.beginPath(); ctx.moveTo(0, -S * 0.28); ctx.lineTo(S * 0.07, -S * 0.05); ctx.lineTo(0, S * 0.1); ctx.lineTo(-S * 0.07, -S * 0.05); ctx.closePath(); ctx.fill()
      ctx.restore()
    } else if (t === 'B') {
      tekenBlok(x, y)
    } else if (t === 'E') {
      var open = vis.kristallen === 0
      ctx.save(); ctx.translate(x, y)
      ctx.strokeStyle = open ? '#7dfff0' : 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(2, S * 0.07)
      if (open) { ctx.shadowColor = '#3ef0ff'; ctx.shadowBlur = S * 0.5 }
      for (var k = 0; k < 3; k++) {
        ctx.globalAlpha = open ? 1 - k * 0.28 : 0.6 - k * 0.15
        ctx.beginPath(); ctx.arc(0, 0, S * (0.36 - k * 0.1), tijd * (open ? 3 : 0.6) * (k % 2 ? -1 : 1), tijd * (open ? 3 : 0.6) * (k % 2 ? -1 : 1) + Math.PI * 1.4); ctx.stroke()
      }
      ctx.globalAlpha = 1
      if (!open) {
        ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.5)'
        rondRect(ctx, -S * 0.09, -S * 0.02, S * 0.18, S * 0.14, 2); ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = Math.max(1.5, S * 0.04)
        ctx.beginPath(); ctx.arc(0, -S * 0.02, S * 0.06, Math.PI, 0); ctx.stroke()
      }
      ctx.restore()
    } else if (t === 'k') {
      ctx.save(); ctx.translate(x, y)
      var kc = vis.flip ? '#ff9a3d' : 'hsl(' + (hue + 160) + ',95%,62%)'
      ctx.shadowColor = kc; ctx.shadowBlur = S * 0.3
      ctx.strokeStyle = kc; ctx.lineWidth = Math.max(2, S * 0.07)
      ctx.beginPath(); ctx.arc(0, 0, S * 0.28, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = kc; ctx.beginPath(); ctx.arc(0, 0, S * (vis.flip ? 0.1 : 0.15), 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    } else if (t === 'G' || t === 'g') {
      var dicht = NG.dicht({ flip: vis.flip }, t)
      var pc = t === 'G' ? 'hsl(' + (hue + 160) + ',95%,62%)' : '#ff9a3d'
      ctx.save(); ctx.translate(x, y)
      if (dicht) {
        ctx.fillStyle = 'rgba(10,10,30,0.7)'; ctx.fillRect(-S * 0.46, -S * 0.46, S * 0.92, S * 0.92)
        ctx.strokeStyle = pc; ctx.lineWidth = Math.max(2, S * 0.07); ctx.shadowColor = pc; ctx.shadowBlur = S * (0.25 + flitsPoort * 0.6)
        ctx.strokeRect(-S * 0.4, -S * 0.4, S * 0.8, S * 0.8)
        ctx.beginPath()
        for (var b = -1; b <= 1; b++) { ctx.moveTo(b * S * 0.2, -S * 0.36); ctx.lineTo(b * S * 0.2, S * 0.36) }
        ctx.stroke()
      } else {
        ctx.strokeStyle = pc; ctx.globalAlpha = 0.45; ctx.setLineDash([S * 0.08, S * 0.08]); ctx.lineWidth = Math.max(1.5, S * 0.04)
        ctx.strokeRect(-S * 0.4, -S * 0.4, S * 0.8, S * 0.8)
      }
      ctx.restore()
    } else if (NG.PORTAAL.indexOf(t) >= 0) {
      var col = PORTKLEUR[t]
      ctx.save(); ctx.translate(x, y); ctx.rotate(tijd * 2.2)
      ctx.shadowColor = col; ctx.shadowBlur = S * 0.4; ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, S * 0.08)
      for (var q = 0; q < 4; q++) { ctx.beginPath(); ctx.arc(0, 0, S * 0.32, q * Math.PI / 2, q * Math.PI / 2 + 0.95); ctx.stroke() }
      ctx.rotate(-tijd * 4.4); ctx.globalAlpha = 0.55
      ctx.beginPath(); ctx.arc(0, 0, S * 0.16, 0, Math.PI * 1.3); ctx.stroke()
      ctx.restore()
    } else if (NG.PIJL[t] != null && flitsPijl[i] > 0) {
      ctx.save(); ctx.globalAlpha = flitsPijl[i]; ctx.shadowColor = '#fff'; ctx.shadowBlur = S * 0.4
      tekenPijl(ctx, x, y, NG.PIJL[t], '#ffffff'); ctx.restore()
    }
  }
  if (blokAnim) {
    var e = blokAnim.e, f = Math.min(1, blokAnim.t / blokAnim.dur), f2 = 1 - Math.pow(1 - f, 2)
    var bx = cx(e.van) + (cx(e.naar) - cx(e.van)) * f2, by = cy(e.van) + (cy(e.naar) - cy(e.van)) * f2
    tekenBlok(bx, by, e.gevuld ? 1 - Math.max(0, (f - 0.85) / 0.15) * 0.4 : 1)
  }
}
function tekenBlok(x, y, schaal) {
  var m = S * 0.4 * (schaal || 1)
  ctx.save(); ctx.translate(x, y)
  ctx.shadowColor = '#9b6bff'; ctx.shadowBlur = S * 0.3
  var gr = ctx.createLinearGradient(-m, -m, m, m); gr.addColorStop(0, '#5b3fb8'); gr.addColorStop(1, '#2a1a66')
  ctx.fillStyle = gr; rondRect(ctx, -m, -m, m * 2, m * 2, S * 0.12); ctx.fill()
  ctx.shadowBlur = 0; ctx.strokeStyle = '#c4a8ff'; ctx.lineWidth = Math.max(1.5, S * 0.05); ctx.stroke()
  ctx.strokeStyle = 'rgba(196,168,255,0.5)'; ctx.beginPath()
  ctx.moveTo(-m * 0.5, -m * 0.5); ctx.lineTo(m * 0.5, m * 0.5); ctx.moveTo(m * 0.5, -m * 0.5); ctx.lineTo(-m * 0.5, m * 0.5); ctx.stroke()
  ctx.restore()
}

// plek van het bolletje (in pixels) tijdens het afspelen
function balPlek() {
  if (!anim) return [cx(spel.s.bal), cy(spel.s.bal)]
  var pad = anim.u.pad, a = anim.a, k = 0
  for (var j = 0; j < pad.length; j++) if (pad[j].a <= a + 1e-9) k = j
  var p = pad[k], n = pad[k + 1]
  if (!n || n.sprong || n.a === p.a) return [cx(p.i), cy(p.i)]
  var f = (a - p.a) / (n.a - p.a)
  return [cx(p.i) + (cx(n.i) - cx(p.i)) * f, cy(p.i) + (cy(n.i) - cy(p.i)) * f]
}
function balRichting() {
  if (!anim) return -1
  var pad = anim.u.pad, k = 0
  for (var j = 0; j < pad.length; j++) if (pad[j].a <= anim.a + 1e-9) k = j
  var p = pad[k], n = pad[k + 1]
  if (!n || n.sprong) return -1
  var dx = (n.i % spel.s.w) - (p.i % spel.s.w), dy = ((n.i / spel.s.w) | 0) - ((p.i / spel.s.w) | 0)
  return dy < 0 ? 0 : dx > 0 ? 1 : dy > 0 ? 2 : 3
}

function tekenBal(dt) {
  var pos = balPlek(), x = pos[0], y = pos[1], b = balSkin()
  var r = S * 0.3, sx = 1, sy = 1, rot = 0
  // uitrekken tijdens het glijden, plat tegen een muur, wiebelen als het niet kan
  var rich = balRichting()
  if (anim && rich >= 0 && anim.a < anim.A) {
    var rk = Math.min(0.22, anim.v / 100)
    rot = rich % 2 ? 0 : Math.PI / 2; sx = 1 + rk; sy = 1 - rk * 0.7
  }
  if (deuk) {
    deuk.t += dt
    var d = deuk.t / 0.22
    if (d >= 1) deuk = null
    else if (deuk.soort === 'knijp') {
      var g = Math.sin(d * Math.PI) * (1 - d) * 0.9
      rot = deuk.r % 2 ? 0 : Math.PI / 2; sx = 1 - g * 0.45; sy = 1 + g * 0.35
      x += NG.DX[deuk.r] * g * S * 0.08; y += NG.DY[deuk.r] * g * S * 0.08
    } else {
      var wv = Math.sin(d * Math.PI * 4) * (1 - d) * S * 0.07
      x += NG.DX[deuk.r] * wv; y += NG.DY[deuk.r] * wv
    }
  }
  var schaal = 1
  if (balVal > 0) { balVal += dt; schaal = Math.max(0, 1 - balVal / 0.45); rot += balVal * 8; if (balVal > 0.5) balVal = 0 }
  if (balWin > 0) { balWin += dt; schaal = Math.max(0, 1 - balWin / 0.5); rot += balWin * 14; if (balWin > 0.55) balWin = 0 }
  if (spel.gevallen && !anim) schaal = 0
  if (spel.gewonnen && !anim) schaal = 0
  // spoor
  if (anim && anim.a < anim.A) spoorPunten.push({ x: x, y: y, t: 0 })
  for (var i = spoorPunten.length - 1; i >= 0; i--) { spoorPunten[i].t += dt; if (spoorPunten[i].t > 0.35) spoorPunten.splice(i, 1) }
  tekenSpoor(b)
  if (schaal <= 0) return
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx * schaal, sy * schaal)
  var gl = gloedVan(b, tijd)
  ctx.shadowColor = gl; ctx.shadowBlur = S * 0.55
  var gr = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r)
  gr.addColorStop(0, b.kern); gr.addColorStop(0.55, gl); gr.addColorStop(1, b.vlek || gl)
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0
  if (b.ring) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.35, r * 0.45, tijd * 2, 0, Math.PI * 2); ctx.stroke() }
  if (b.facet) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (var f = 0; f < 6; f++) { var h = f * Math.PI / 3 + tijd; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(h) * r * 0.85, Math.sin(h) * r * 0.85) } ctx.stroke() }
  if (b.glans) { ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + Math.sin(tijd * 4) * 0.3) + ')'; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.35, r * 0.22, 0, Math.PI * 2); ctx.fill() }
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.34, r * 0.16, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}
function tekenSpoor(b) {
  var soort = D.spoor
  for (var i = 0; i < spoorPunten.length; i++) {
    var p = spoorPunten[i], f = 1 - p.t / 0.35
    var col = soort === 'regenboog' ? 'hsl(' + ((i * 25 + tijd * 200) % 360) + ',95%,62%)' : gloedVan(b, tijd)
    ctx.globalAlpha = f * 0.5; ctx.fillStyle = col
    if (soort === 'ster' && i % 3 === 0) { ster(p.x, p.y, S * 0.13 * f, col) }
    else if (soort === 'vonk' && i % 2 === 0) { ctx.fillRect(p.x + (Math.random() - 0.5) * S * 0.3, p.y + (Math.random() - 0.5) * S * 0.3, 2.5, 2.5) }
    else if (soort !== 'vonk' && soort !== 'ster' || i % 4 === 1) { ctx.beginPath(); ctx.arc(p.x, p.y, S * 0.22 * f, 0, Math.PI * 2); ctx.fill() }
  }
  ctx.globalAlpha = 1
}
function ster(x, y, r, col) {
  ctx.fillStyle = col; ctx.beginPath()
  for (var k = 0; k < 10; k++) { var h = k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(h) * rr, y + Math.sin(h) * rr) }
  ctx.closePath(); ctx.fill()
}

function tekenEffecten(dt) {
  for (var i = deeltjes.length - 1; i >= 0; i--) {
    var d = deeltjes[i]; d.t += dt
    if (d.t > d.max) { deeltjes.splice(i, 1); continue }
    d.vx *= 0.93; d.vy *= 0.93; d.x += d.vx * dt; d.y += d.vy * dt
    ctx.globalAlpha = 1 - d.t / d.max; ctx.fillStyle = d.col
    if (d.ster) ster(d.x, d.y, d.r * 2.6 * Math.sin(d.t / d.max * Math.PI), d.col)
    else { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill() }
  }
  ctx.globalAlpha = 1
  for (var j = teksten.length - 1; j >= 0; j--) {
    var t = teksten[j]; t.t += dt
    if (t.t > 0.9) { teksten.splice(j, 1); continue }
    var f = t.t / 0.9, op = 1 + Math.sin(Math.min(1, t.t / 0.15) * Math.PI) * 0.25
    ctx.save(); ctx.globalAlpha = f > 0.6 ? (1 - f) / 0.4 : 1
    ctx.translate(t.x, t.y - f * S * 0.8); ctx.scale(op, op)
    ctx.font = Math.round(Math.max(15, S * 0.36)) + 'px "Russo One", system-ui, sans-serif'; ctx.textAlign = 'center'
    ctx.shadowColor = t.col; ctx.shadowBlur = 12; ctx.fillStyle = t.col
    ctx.fillText(t.s, 0, 0); ctx.restore()
  }
}

// achtergrond: sterren en langzaam bewegend noorderlicht in de kleur van de wereld
var sterrenVeld = []
for (var sv = 0; sv < 90; sv++) sterrenVeld.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3, f: Math.random() * 6 })
function vlek(x, y, r, kleur, a) {
  var gr = ctx.createRadialGradient(x, y, 0, x, y, r)
  gr.addColorStop(0, kleur.replace('A', a)); gr.addColorStop(1, kleur.replace('A', 0))
  ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2)
}
function tekenAchtergrond(hue) {
  ctx.fillStyle = '#05040f'; ctx.fillRect(0, 0, BW, BH)
  var t = D.rustig ? 0 : tijd, R = Math.max(BW, BH)
  vlek(BW * (0.2 + Math.sin(t * 0.07) * 0.1), BH * (0.15 + Math.cos(t * 0.05) * 0.08), R * 0.7, 'hsla(' + hue + ',90%,45%,A)', 0.22)
  vlek(BW * (0.85 + Math.cos(t * 0.06) * 0.08), BH * (0.45 + Math.sin(t * 0.04) * 0.12), R * 0.6, 'hsla(' + (hue + 70) + ',90%,50%,A)', 0.14)
  vlek(BW * (0.4 + Math.sin(t * 0.05) * 0.15), BH * (1.0 + Math.sin(t * 0.08) * 0.05), R * 0.6, 'hsla(320,90%,50%,A)', 0.16)
  for (var i = 0; i < sterrenVeld.length; i++) {
    var s = sterrenVeld[i]
    ctx.globalAlpha = 0.3 + Math.sin(tijd * 1.3 + s.f) * 0.22
    ctx.fillStyle = '#cfe8ff'; ctx.beginPath(); ctx.arc(s.x * BW, s.y * BH, s.r, 0, 7); ctx.fill()
  }
  ctx.globalAlpha = 1
}
// zachte gloed onder het bord en een lichtplas rond het bolletje
function tekenBordGloed() {
  var w = spel.s.w * S, h = spel.s.h * S
  vlek(ox + w / 2, oy + h / 2, Math.max(w, h) * 0.75, 'hsla(' + spel.hue + ',90%,55%,A)', 0.18)
}
function tekenLichtplas() {
  if ((spel.gevallen || spel.gewonnen) && !anim) return
  var p = balPlek(), b = balSkin(), col = b.gloed || 'hsl(' + ((tijd * 90) % 360) + ',95%,62%)'
  var gr = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], S * 1.6)
  gr.addColorStop(0, hexA(col, 0.32)); gr.addColorStop(1, hexA(col, 0))
  ctx.fillStyle = gr; ctx.fillRect(p[0] - S * 1.6, p[1] - S * 1.6, S * 3.2, S * 3.2)
  ctx.fillStyle = 'rgba(0,0,10,0.35)'; ctx.beginPath(); ctx.ellipse(p[0] + S * 0.05, p[1] + S * 0.26, S * 0.24, S * 0.08, 0, 0, 7); ctx.fill()
}
function hexA(col, a) {
  if (col[0] === '#') { var n = parseInt(col.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')' }
  return col.replace('hsl(', 'hsla(').replace(')', ',' + a + ')')
}
// kristallen fonkelen af en toe, een open uitgang zuigt lichtjes naar binnen
var fonkTijd = 0
function sfeer(dt) {
  if (D.rustig || !vis) return
  fonkTijd -= dt
  if (fonkTijd > 0) return
  fonkTijd = 0.18
  for (var i = 0; i < vis.c.length; i++) {
    if (vis.c[i] === '*' && Math.random() < 0.12) deeltjes.push({ x: cx(i) + (Math.random() - 0.5) * S * 0.4, y: cy(i) + (Math.random() - 0.5) * S * 0.4, vx: 0, vy: -12, t: 0, max: 0.5, r: 1.6, col: '#fff6cf', ster: true })
    if (vis.c[i] === 'E' && vis.kristallen === 0) {
      var h = Math.random() * 7, rr = S * 0.7
      deeltjes.push({ x: cx(i) + Math.cos(h) * rr, y: cy(i) + Math.sin(h) * rr, vx: -Math.cos(h) * rr * 1.6, vy: -Math.sin(h) * rr * 1.6, t: 0, max: 0.55, r: 1.8, col: '#7dfff0' })
    }
  }
}

// ── demo: achter het menu speelt het spel zichzelf ──
var demoZetten = [], demoK = 0, demoWacht = 0, DEMO_SCHERMEN = { menu: 1, werelden: 1, levelkeuze: 1, winkel: 1, uitleg: 1 }
function startDemo() {
  var w = Math.random() * W.length | 0, l = 3 + (Math.random() * 7 | 0), lv = W[w].levels[l]
  maakSpel({ type: 'level', w: w, l: l }, lv, true)
  demoZetten = NG.los(NG.laad(lv.r)).zetten || []; demoK = 0; demoWacht = 0.8
}
function demoStap(dt) {
  if (!spel) { if (DEMO_SCHERMEN[huidigScherm]) startDemo(); return }
  if (!spel.demo || anim || blokAnim || balWin > 0) return
  demoWacht -= dt
  if (demoWacht > 0) return
  if (spel.gewonnen || demoK >= demoZetten.length) { startDemo(); return }
  speel(demoZetten[demoK++]); demoWacht = 0.55
}
function stopDemo() { if (spel && spel.demo) spel = null }

// ── hoofdlus ──
var vorige = performance.now()
function frame(nu) {
  var dt = Math.min(0.05, (nu - vorige) / 1000); vorige = nu; tijd += dt
  pad()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  demoStap(dt)
  tekenAchtergrond(spel ? spel.hue : 200)
  if (spel) {
    speelAf(dt)
    if (blokAnim) {
      blokAnim.t += dt
      if (blokAnim.t >= blokAnim.dur) {
        var e = blokAnim.e
        vis.c[e.naar] = e.gevuld ? '.' : 'B'
        if (e.gevuld) { snd().vul(); spat(cx(e.naar), cy(e.naar), 14, '#c4a8ff', 130); tekst(cx(e.naar), cy(e.naar) - S * 0.3, 'Gat dicht!', '#c4a8ff') }
        else { schud(0.12); spat(cx(e.naar) + NG.DX[e.r] * S * 0.45, cy(e.naar) + NG.DY[e.r] * S * 0.45, 5, '#c4a8ff', 90, e.r) }
        blokAnim = null
      }
    }
    flitsPoort = Math.max(0, flitsPoort - dt * 2.5)
    for (var k in flitsPijl) { flitsPijl[k] -= dt * 3; if (flitsPijl[k] <= 0) delete flitsPijl[k] }
    // schermschok: trauma in het kwadraat, opgeteld uit sinussen (geen geruis)
    trauma = Math.max(0, trauma - dt * 1.6); schudT += dt * 30
    var sk = trauma * trauma, dx = sk * 10 * Math.sin(schudT * 1.7), dy = sk * 7 * Math.sin(schudT * 2.3)
    sfeer(dt)
    ctx.save(); ctx.translate(dx, dy)
    tekenBordGloed()
    ctx.drawImage(vast, ox, oy, vast.width / dpr, vast.height / dpr)
    tekenLichtplas()
    tekenDynamisch()
    tekenBal(dt)
    tekenEffecten(dt)
    ctx.restore()
  }
  requestAnimationFrame(frame)
}

// ── invoer: vegen, toetsen, controller ──
var veeg = null
cv.addEventListener('pointerdown', function (e) { audio(); veeg = { x: e.clientX, y: e.clientY, klaar: false } })
cv.addEventListener('pointermove', function (e) {
  if (!veeg || veeg.klaar) return
  var dx = e.clientX - veeg.x, dy = e.clientY - veeg.y
  if (Math.hypot(dx, dy) < 22) return
  veeg.klaar = true
  doe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0))
})
window.addEventListener('pointerup', function () { veeg = null })
window.addEventListener('pointercancel', function () { veeg = null })
var TOETS = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 }
window.addEventListener('keydown', function (e) {
  if (e.repeat && TOETS[e.code] != null) return
  if (TOETS[e.code] != null && !huidigScherm) { e.preventDefault(); audio(); doe(TOETS[e.code]); return }
  if (e.code === 'KeyZ' || e.code === 'Backspace') { e.preventDefault(); zetTerug() }
  if (e.code === 'KeyR') opnieuw()
  if (e.code === 'Escape' && !huidigScherm && !BELONING) naarLevels()
})
// controller: kruisje of stick (dode zone 0,55), X = terug, Y = opnieuw
var padVorig = {}
function pad() {
  var lijst = navigator.getGamepads ? navigator.getGamepads() : []
  for (var i = 0; i < lijst.length; i++) {
    var g = lijst[i]; if (!g) continue
    var ax = g.axes[0] || 0, ay = g.axes[1] || 0, knop = function (n) { return !!(g.buttons[n] && g.buttons[n].pressed) }
    var nu = {
      0: knop(12) || ay < -0.55, 1: knop(15) || ax > 0.55, 2: knop(13) || ay > 0.55, 3: knop(14) || ax < -0.55,
      x: knop(2), y: knop(3),
    }
    var oud = padVorig[i] || {}
    for (var r = 0; r < 4; r++) if (nu[r] && !oud[r] && !huidigScherm) doe(r)
    if (nu.x && !oud.x) zetTerug()
    if (nu.y && !oud.y) opnieuw()
    padVorig[i] = nu
  }
}

$('terugzet').onclick = zetTerug
$('opnieuw').onclick = opnieuw
$('naarlevels').onclick = function () {
  if (BELONING) { naarOuder('neonglij-gameover'); return }
  if (spel && spel.bron.type === 'dag') { spel = null; toonMenu() } else naarLevels()
}

// ── schermen ──
var huidigScherm = 'menu', terugNaar = null
function toonScherm(id) {
  huidigScherm = id
  ;['menu', 'werelden', 'levelkeuze', 'gewonnen', 'winkel', 'uitleg'].forEach(function (x) { $(x).classList.toggle('aan', x === id) })
  var inSpel = id === null
  $('hud').classList.toggle('aan', inSpel)
  $('onderbalk').classList.toggle('aan', inSpel)
  if (!inSpel) { $('tip').classList.remove('aan'); verbergMelding() }
  $('menutop').classList.toggle('aan', !inSpel && id !== 'gewonnen')
  $('terug').classList.toggle('aan', !inSpel && id !== 'gewonnen' && !(id === 'menu' && BELONING))
  $('topmunten').textContent = D.munten
}
$('terug').onclick = function () {
  Geluid.klik()
  if (huidigScherm === 'menu') naarOuder('neonglij-terug')
  else if (huidigScherm === 'levelkeuze') naarWerelden()
  else if (terugNaar) { var f = terugNaar; terugNaar = null; f() }
  else toonMenu()
}
function toonMenu() {
  if (spel && !spel.demo) spel = null
  var d = vandaag(), st = D.dag && D.dag.d === d ? D.dag.ster : 0
  $('dagsterren').innerHTML = st ? [1, 2, 3].map(function (n) { return sterSvg(n <= st, 16) }).join('') : '<span class="munt">15</span>'
  var bn = bezigNaam()
  $('verder').classList.toggle('verborgen', !bn)
  $('verder').textContent = 'Verder: ' + bn
  $('speel').className = bn ? 'knop2' : 'knop'
  $('s-geluid').classList.toggle('aan', D.geluid)
  $('s-rustig').classList.toggle('aan', D.rustig)
  toonScherm('menu')
}
function naarWerelden() {
  if (spel && !spel.demo) spel = null
  var totaal = 0
  for (var k in D.sterren) totaal += D.sterren[k]
  $('totaalsterren').innerHTML = sterSvg(true, 16) + ' ' + totaal + ' van ' + (W.length * 36) + ' sterren'
  var l = $('wereldlijst'); l.innerHTML = ''
  W.forEach(function (wd, w) {
    var b = document.createElement('button'), open = wereldOpen(w), st = 0
    for (var i = 0; i < 12; i++) st += sterVan(w, i)
    b.className = 'wereld'; b.style.setProperty('--h', wd.kleur); b.disabled = !open
    b.innerHTML = '<span class="nr">' + (w + 1) + '</span><span class="wtekst"><div class="wnaam">' + wd.naam + '</div><div class="wsub">' +
      (open ? sterSvg(true, 14) + ' ' + st + ' / 36 · ' + klaarIn(w) + ' van 12 levels' : 'Haal eerst 8 levels in ' + W[w - 1].naam) + '</div></span>'
    b.appendChild(miniBord(wd.levels[Math.min(11, 4 + w)].r, wd.kleur))
    b.onclick = function () { Geluid.klik(); naarLevelkeuze(w) }
    l.appendChild(b)
  })
  toonScherm('werelden')
}
var gekozenWereld = 0
function naarLevelkeuze(w) {
  if (spel && !spel.demo) spel = null
  gekozenWereld = w
  var wd = W[w]
  $('wereldnaam').textContent = wd.naam
  $('wereldsub').textContent = WERELD_UITLEG[w]
  var l = $('levellijst'); l.innerHTML = ''
  var eerste = eersteOpen()
  for (var i = 0; i < 12; i++) {
    (function (i) {
      var b = document.createElement('button'), open = levelOpen(w, i), st = sterVan(w, i)
      b.className = 'lvl' + (eerste && eerste.w === w && eerste.l === i ? ' volgende' : ''); b.style.setProperty('--h', wd.kleur); b.disabled = !open
      b.setAttribute('aria-label', 'Level ' + (i + 1) + (open ? ', ' + st + ' sterren' : ', op slot'))
      b.innerHTML = '<span>' + (i + 1) + '</span><span class="sterren">' + (open ? [1, 2, 3].map(function (n) { return sterSvg(n <= st, 13) }).join('') : slotSvg()) + '</span>'
      b.onclick = function () { Geluid.klik(); startLevel({ type: 'level', w: w, l: i }) }
      l.appendChild(b)
    })(i)
  }
  toonScherm('levelkeuze')
}
function naarLevels() { naarLevelkeuze(spel && !spel.demo && spel.bron.type === 'level' ? spel.bron.w : gekozenWereld) }
// klein plaatje van een level (voor de wereldkaarten)
function miniBord(rijen, hue) {
  var h = rijen.length, w = rijen[0].length, k = 8, c = document.createElement('canvas')
  c.width = w * k * 2; c.height = h * k * 2; c.className = 'mini'
  var g = c.getContext('2d'); g.scale(2, 2)
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var t = rijen[y][x], px = x * k, py = y * k
    if (t === '#') { g.fillStyle = 'hsla(' + hue + ',60%,14%,0.9)'; g.fillRect(px, py, k, k); continue }
    g.fillStyle = 'rgba(150,215,255,0.16)'; g.fillRect(px + 0.5, py + 0.5, k - 1, k - 1)
    var kl = { '*': '#ffc83d', E: '#7dfff0', S: '#effdff', B: '#9b6bff', O: '#000', k: '#ff5a7a', G: '#3ef0ff', g: '#ff9a3d', p: '#ff4fd8', q: '#8dff4f', r: '#ff9a3d', x: '#bfe9ff' }[t]
    if (kl) { g.fillStyle = kl; g.beginPath(); g.arc(px + k / 2, py + k / 2, t === 'O' || t === 'B' ? k * 0.42 : k * 0.3, 0, 7); g.fill() }
  }
  g.strokeStyle = 'hsl(' + hue + ',95%,65%)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w * k - 1, h * k - 1)
  return c
}
function slotSvg() { return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>' }
var WERELD_UITLEG = [
  'Glij, bots en pak alle kristallen.',
  'Duw paarse blokken. Ze glijden door tot ze botsen en vullen gaten.',
  'Pijlen sturen je een andere kant op. Breekijs wordt een gat als je eraf glijdt.',
  'Glij een portaal in en je komt bij het andere portaal uit.',
  'Glij over de knop en alle poorten gaan open of dicht.',
]

$('speel').onclick = function () { Geluid.klik(); if (!D.uitlegGezien) { D.uitlegGezien = true; bewaar(); terugNaar = naarWerelden; naarUitleg(naarWerelden) } else naarWerelden() }
$('verder').onclick = function () { Geluid.klik(); hervat() }
$('dag').onclick = function () { Geluid.klik(); startDag() }
$('naarwinkel').onclick = function () { Geluid.klik(); terugNaar = toonMenu; naarWinkel() }
$('naaruitleg').onclick = function () { Geluid.klik(); naarUitleg(toonMenu) }
$('s-geluid').onclick = function () { D.geluid = !D.geluid; bewaar(); this.classList.toggle('aan', D.geluid); tekenGeluidKnop(); Geluid.klik() }
$('s-rustig').onclick = function () { D.rustig = !D.rustig; bewaar(); this.classList.toggle('aan', D.rustig); Geluid.klik() }
$('geluid').onclick = function () { D.geluid = !D.geluid; bewaar(); tekenGeluidKnop(); Geluid.klik() }
function tekenGeluidKnop() { $('golf').style.display = D.geluid ? '' : 'none'; $('geluid').style.opacity = D.geluid ? 1 : 0.55 }

$('volgende').onclick = function () {
  var v = spel.bron.type === 'level' ? volgendeLevel(spel.bron) : null
  if (!v && BELONING) v = eersteOpen()
  if (v) startLevel(v); else if (BELONING) startDag(); else naarLevels()
}
$('nogeens').onclick = function () { startLevel(spel.bron) }
$('winlevels').onclick = function () { if (spel.bron.type === 'dag') toonMenu(); else naarLevels() }
$('klaar').onclick = function () { naarOuder('neonglij-gameover') }

var dagCache = {}
function startDag() {
  var d = vandaag()
  if (!dagCache[d]) {
    var lv = NG.dagLevel(d)
    if (!lv) { lv = { r: W[0].levels[11].r, min: W[0].levels[11].min, naam: 'Reserve' } }
    dagCache[d] = lv
  }
  startLevel({ type: 'dag', dag: d, lv: dagCache[d] })
}

// ── uitleg ──
function naarUitleg(daarna) {
  terugNaar = daarna
  var regels = [
    ['bal', 'Veeg, of gebruik de pijltjes. Je glijdt door tot je ergens tegenaan botst.'],
    ['*', 'Pak alle kristallen.'],
    ['E', 'Daarna gaat de uitgang open. Glij erover en je bent klaar.'],
    ['B', 'Een blok duw je weg. Het glijdt door, en in een gat maakt het een brug.'],
    ['O', 'Pas op voor gaten!'],
    ['x', 'Breekijs: als je eraf glijdt, wordt het een gat.'],
    ['>', 'Een pijl stuurt je die kant op.'],
    ['p', 'Een portaal brengt je naar het portaal met dezelfde kleur.'],
    ['k', 'Glij over de knop: dichte poorten gaan open en open poorten dicht.'],
    ['terug', 'Vast? Zet terug of begin opnieuw. Doe je het in het minste aantal zetten, dan krijg je 3 sterren.'],
  ]
  var l = $('uitleglijst'); l.innerHTML = ''
  regels.forEach(function (rg) {
    var d = document.createElement('div'); d.className = 'regel'
    var c = document.createElement('canvas'); c.width = 80; c.height = 80
    tekenIcoon(c, rg[0])
    var s = document.createElement('span'); s.textContent = rg[1]
    d.appendChild(c); d.appendChild(s); l.appendChild(d)
  })
  toonScherm('uitleg')
}
$('snapik').onclick = function () { Geluid.klik(); var f = terugNaar || toonMenu; terugNaar = null; f() }
// klein plaatje van een vakje (hergebruikt de tekencode met een tijdelijk bord)
function tekenIcoon(c, soort) {
  var oud = { ctx: ctx, S: S, ox: ox, oy: oy, spel: spel, vis: vis }
  var g = c.getContext('2d')
  ctx = g; S = 80; ox = 0; oy = 0
  var rij = soort === 'bal' || soort === 'terug' ? '.' : soort === 'p' ? 'p' : soort
  spel = { s: { w: 1, h: 1, c: [rij], bal: 0, totaal: 1, zetten: 0 }, rijen: [rij], hue: 200, gevallen: false, gewonnen: false }
  vis = { c: [rij], flip: false, kristallen: soort === 'E' ? 0 : 1, bal: 0 }
  g.fillStyle = 'rgba(62,240,255,0.08)'; rondRect(g, 3, 3, 74, 74, 14); g.fill()
  if (soort === '>') tekenPijl(g, 40, 40, 1, '#7dfff0')
  else if (soort === 'bal') { var a = anim, sp = spoorPunten; anim = null; spoorPunten = []; tekenBal(0); anim = a; spoorPunten = sp }
  else if (soort === 'terug') { g.strokeStyle = '#eef3ff'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(30, 48); g.lineTo(18, 36); g.lineTo(30, 24); g.moveTo(18, 36); g.lineTo(48, 36); g.arc(48, 48, 12, -Math.PI / 2, Math.PI / 2); g.stroke() }
  else tekenDynamisch()
  ctx = oud.ctx; S = oud.S; ox = oud.ox; oy = oud.oy; spel = oud.spel; vis = oud.vis
}

// ── winkel ──
var winkelTab = 'bal'
function naarWinkel() { tekenWinkel(); toonScherm('winkel') }
$('tab-bal').onclick = function () { winkelTab = 'bal'; tekenWinkel() }
$('tab-spoor').onclick = function () { winkelTab = 'spoor'; tekenWinkel() }
function tekenWinkel() {
  $('winkelmunten').textContent = D.munten; $('topmunten').textContent = D.munten
  $('tab-bal').classList.toggle('aan', winkelTab === 'bal'); $('tab-spoor').classList.toggle('aan', winkelTab === 'spoor')
  var lijst = winkelTab === 'bal' ? BALLEN : SPOREN, bezit = winkelTab === 'bal' ? D.ballen : D.sporen
  var gekozen = winkelTab === 'bal' ? D.bal : D.spoor
  var l = $('lijst'); l.innerHTML = ''
  lijst.forEach(function (it) {
    var k = document.createElement('div'); k.className = 'kaart' + (gekozen === it.id ? ' gekozen' : '')
    var c = document.createElement('canvas'); c.width = 192; c.height = 144
    voorbeeld(c, winkelTab === 'bal' ? it.id : D.bal, winkelTab === 'spoor' ? it.id : D.spoor)
    var n = document.createElement('div'); n.className = 'naam'; n.textContent = it.naam
    var b = document.createElement('button')
    if (bezit.indexOf(it.id) >= 0) {
      b.className = 'kies' + (gekozen === it.id ? ' aan' : ''); b.textContent = gekozen === it.id ? 'Gekozen' : 'Kiezen'
      b.onclick = function () { if (winkelTab === 'bal') D.bal = it.id; else D.spoor = it.id; bewaar(); Geluid.klik(); tekenWinkel() }
    } else {
      b.className = 'koop'; b.innerHTML = '<span class="munt" style="color:inherit">' + it.prijs + '</span>'; b.disabled = D.munten < it.prijs
      b.onclick = function () {
        if (D.munten < it.prijs) return
        D.munten -= it.prijs; bezit.push(it.id)
        if (winkelTab === 'bal') D.bal = it.id; else D.spoor = it.id
        bewaar(); Geluid.koop(); tekenWinkel()
      }
    }
    k.appendChild(c); k.appendChild(n); k.appendChild(b); l.appendChild(k)
  })
}
// bolletje met spoor als plaatje in de winkel
function voorbeeld(c, balId, spoorId) {
  var oud = { ctx: ctx, S: S, bal: D.bal, spoor: D.spoor, sp: spoorPunten, anim: anim, spel: spel, deuk: deuk }
  var g = c.getContext('2d'); g.scale(2, 2)
  ctx = g; S = 64; D.bal = balId; D.spoor = spoorId; anim = null; deuk = null
  spoorPunten = []
  for (var i = 0; i < 12; i++) spoorPunten.push({ x: 14 + i * 3.4, y: 40 + Math.sin(i * 0.5) * 2, t: 0.35 - i * 0.028 })
  tekenSpoor(balSkin())
  var b = balSkin(), r = 19, gl = gloedVan(b, 0.6)
  g.save(); g.translate(62, 38); g.shadowColor = gl; g.shadowBlur = 20
  var gr = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r)
  gr.addColorStop(0, b.kern); gr.addColorStop(0.55, gl); gr.addColorStop(1, b.vlek || gl)
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill()
  g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(-r * 0.32, -r * 0.34, r * 0.16, 0, Math.PI * 2); g.fill()
  if (b.ring) { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, r * 1.35, r * 0.45, 0.4, 0, Math.PI * 2); g.stroke() }
  g.restore()
  ctx = oud.ctx; S = oud.S; D.bal = oud.bal; D.spoor = oud.spoor; spoorPunten = oud.sp; anim = oud.anim; spel = oud.spel; deuk = oud.deuk
}

// ── start ──
meet()
tekenGeluidKnop()
if (BELONING) {
  $('naarlevels').style.visibility = 'hidden'      // de site heeft zelf een stopknop
  if (!hervat()) { var eerste = eersteOpen(); if (eerste) startLevel(eerste); else startDag() }
} else toonMenu()
requestAnimationFrame(frame)
})()
