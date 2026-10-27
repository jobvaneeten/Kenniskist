// Tower Defense — scherm, besturing, effecten en geluid. Regels en golven staan in kern.js.
(function () {
'use strict'
var cv = document.getElementById('c'), ctx = cv.getContext('2d')
var $ = function (id) { return document.getElementById(id) }
var TAU = Math.PI * 2

// ── inbedding ── met ?terug=1 is het een vrij spel, zonder is het een beloning (5 golven)
var params = new URLSearchParams(location.search)
var BELONING = !params.has('terug')
if (!BELONING) {
  $('terug').classList.remove('verborgen')
  // in het spel: eerst pauzeren (dan kies je zelf verder of stoppen), in het menu: terug naar Kenniskist
  $('terug').onclick = function () {
    if (S && actief && !gepauzeerd) { gepauzeerd = true; toonScherm('pauzescherm'); return }
    parent.postMessage({ type: 'towerdefense-terug' }, '*')
  }
}

// ── opslag (td_-prefix ⇒ synct mee naar het account) ──
var OPSLAG = 'td_neon'
var D = (function () {
  var d = {}
  try { d = JSON.parse(localStorage.getItem(OPSLAG) || '{}') || {} } catch (e) {}
  var open = d.open || 0
  if (d.open === undefined) {
    // voortgang uit de oude versie overnemen
    try {
      var oud = JSON.parse(localStorage.getItem('td_progress') || '{}') || {}
      for (var i = 2; i <= 5; i++) if (oud['map' + i + '_unlocked']) open = Math.max(open, i - 1)
    } catch (e) {}
  }
  return { open: open, sterren: d.sterren || {}, geluid: d.geluid !== false, snel: d.snel || 1, auto: !!d.auto }
})()
function bewaar() { try { localStorage.setItem(OPSLAG, JSON.stringify(D)) } catch (e) {} }

// ── beloning: 1 minuut spelen, daarna weer oefenen ── het potje wordt steeds
// bewaard (ook midden in een golf), zodat je de volgende keer precies verder gaat
var BEWAAR = 'td_beloning', SPEELTIJD = 60
var speeltijd = SPEELTIJD, tijdOp = false, bewaarOm = 0
function leesBeloning() {
  try { var b = JSON.parse(localStorage.getItem(BEWAAR) || 'null'); return b && b.torens && b.golf < TD.GOLVEN ? b : null } catch (e) { return null }
}
function bewaarBeloning() {
  if (!BELONING || !S) return
  if (S.verloren || S.gewonnen) { wisBeloning(); return }
  var b = { L: S.L, golf: S.golf, goud: S.goud, levens: S.levens, id: S.id, geknald: S.geknald, gezien: S.gezien,
    t: S.t, actief: S.actief, vijanden: S.vijanden, wachtrij: S.wachtrij,
    stapels: S.stapels.map(function (p) { var q = Object.assign({}, p); q.toren = p.toren.id; return q }),
    torens: S.torens.map(function (t) { return { id: t.id, type: t.type, c: t.c, r: t.r, niveau: t.niveau, besteed: t.besteed, hoek: t.hoek, knallen: t.knallen, wacht: t.wacht } }) }
  try { localStorage.setItem(BEWAAR, JSON.stringify(b)) } catch (e) {}
}
function wisBeloning() { try { localStorage.removeItem(BEWAAR) } catch (e) {} }
function tekenTijd() {
  var el = $('tijdpil'); if (!el) return
  var s = Math.max(0, Math.ceil(speeltijd))
  $('tijd').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
  el.classList.toggle('bijna', s <= 10)
}

// ── kleur ──
function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] }
function rgba(h, a) { var c = hex(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')' }
function tint(h, f) { var c = hex(h).map(function (v) { return Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)) }); return 'rgb(' + c.join(',') + ')' }

// ── geluid ──
var AC = null, ruisBuf = null
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)() } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC }
function toon(f, dur, type, vol, delay, f2) {
  if (!D.geluid) return
  var a = audio(); if (!a) return
  var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain()
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur)
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02)
}
function ruis(dur, vol, freq) {
  if (!D.geluid) return
  var a = audio(); if (!a) return
  if (!ruisBuf) { ruisBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate); var d = ruisBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1 }
  var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime
  s.buffer = ruisBuf; f.type = 'lowpass'; f.frequency.setValueAtTime(freq || 1200, t); f.frequency.exponentialRampToValueAtTime(80, t + dur)
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); s.stop(t + dur)
}
var laatst = {}
function mag(soort, ms) { var n = performance.now(); if (n - (laatst[soort] || 0) < ms) return false; laatst[soort] = n; return true }
var Geluid = {
  knal: function () { if (mag('knal', 45)) toon(700 + Math.random() * 500, 0.05, 'square', 0.025, 0, 180) },
  pijl: function () { if (mag('pijl', 70)) toon(1500, 0.04, 'sine', 0.018, 0, 900) },
  boem: function () { if (mag('boem', 90)) { ruis(0.32, 0.12, 900); toon(110, 0.25, 'sine', 0.08, 0, 40) } },
  laser: function () { if (mag('laser', 110)) toon(1800, 0.06, 'sawtooth', 0.012, 0, 1300) },
  zap: function () { if (mag('zap', 90)) { ruis(0.12, 0.05, 5000); toon(380, 0.1, 'square', 0.03, 0, 1200) } },
  rail: function () { if (mag('rail', 120)) { toon(240, 0.28, 'sawtooth', 0.05, 0, 1800); ruis(0.15, 0.05, 6000) } },
  vries: function () { if (mag('vries', 120)) [2093, 2637, 3136].forEach(function (f, i) { toon(f, 0.12, 'sine', 0.02, i * 0.03) }) },
  ting: function () { if (mag('ting', 160)) toon(2600, 0.07, 'triangle', 0.02) },
  lek: function () { toon(180, 0.35, 'sawtooth', 0.08, 0, 60) },
  bouw: function () { toon(330, 0.08, 'triangle', 0.08); toon(660, 0.12, 'sine', 0.06, 0.06) },
  upgrade: function () { [523, 659, 784, 1047].forEach(function (f, i) { toon(f, 0.14, 'sine', 0.06, i * 0.05) }) },
  verkoop: function () { toon(880, 0.08, 'sine', 0.06); toon(660, 0.12, 'sine', 0.05, 0.07) },
  fout: function () { toon(160, 0.16, 'square', 0.05) },
  zaag: function () { if (mag('zaag', 140)) toon(1900, 0.07, 'sawtooth', 0.012, 0, 1500) },
  vlam: function () { if (mag('vlam', 160)) ruis(0.2, 0.05, 2400) },
  magneet: function () { if (mag('magneet', 200)) toon(90, 0.35, 'sine', 0.09, 0, 260) },
  donder: function () { if (mag('donder', 150)) { ruis(0.35, 0.09, 3000); toon(70, 0.3, 'sine', 0.06, 0, 40) } },
  munt: function () { [1568, 2093].forEach(function (f, i) { toon(f, 0.12, 'sine', 0.06, i * 0.07) }) },
  golf: function () { [392, 523].forEach(function (f, i) { toon(f, 0.18, 'triangle', 0.07, i * 0.1) }) },
  klaar: function () { [659, 784, 988].forEach(function (f, i) { toon(f, 0.18, 'sine', 0.07, i * 0.08) }) },
  baas: function () { [196, 185, 175].forEach(function (f, i) { toon(f, 0.3, 'sawtooth', 0.06, i * 0.2) }) },
  win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { toon(f, 0.32, 'sine', 0.09, i * 0.09) }) },
  verlies: function () { [392, 330, 262, 196].forEach(function (f, i) { toon(f, 0.3, 'triangle', 0.09, i * 0.15) }) },
}
function tekenGeluidKnop() { $('golfje').style.display = D.geluid ? '' : 'none'; $('geluid').style.opacity = D.geluid ? 1 : 0.6 }
$('geluid').onclick = function () { D.geluid = !D.geluid; bewaar(); tekenGeluidKnop(); if (D.geluid) Geluid.bouw() }
tekenGeluidKnop()

// ── layout ──
var dpr = 1, W = 0, H = 0, T = 32, ox = 0, oy = 0, FW = 0, FH = 0
var laag = document.createElement('canvas'), lctx = laag.getContext('2d')
function meet() {
  dpr = Math.min(2, window.devicePixelRatio || 1)
  W = innerWidth; H = innerHeight
  cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr)
  var p = $('paneel'), staand = W < H * 1.05
  var fx = 8, fy = 58, fw, fh
  if (!staand) {
    var pw = Math.round(Math.max(206, Math.min(250, W * 0.21)))
    p.style.cssText = 'top:58px;right:8px;bottom:8px;width:' + pw + 'px;'
    $('winkel').style.gridTemplateColumns = 'repeat(3,1fr)'
    fw = W - pw - 24; fh = H - fy - 8
  } else {
    p.style.cssText = 'left:8px;right:8px;bottom:8px;'
    $('winkel').style.gridTemplateColumns = 'repeat(auto-fill,minmax(58px,1fr))'
    var ph = p.getBoundingClientRect().height
    fw = W - 16; fh = H - fy - ph - 16
  }
  var oudT = T
  T = Math.max(12, Math.floor(Math.min(fw / TD.COLS, fh / TD.ROWS)))
  FW = T * TD.COLS; FH = T * TD.ROWS
  ox = Math.round(fx + (fw - FW) / 2); oy = Math.round(fy + (fh - FH) / 2)
  if (oudT !== T) sprites = {}
  document.documentElement.style.setProperty('--mx', Math.round(ox + FW / 2) + 'px')
  tekenVeld()
}
window.addEventListener('resize', function () { meet() })

// ── sterren in de achtergrond (vast patroon) ──
var STERREN = (function () { var r = TD.rng(42), a = []; for (var i = 0; i < 140; i++) a.push({ x: r(), y: r(), s: 0.4 + r() * 1.3, a: 0.15 + r() * 0.5 }); return a })()

// ── statisch veld: achtergrond, raster, pad, kristallen ──
function px(x) { return ox + x * T }
function py(y) { return oy + y * T }
// ── thema's per kaart ──
var THEMA = {
  stad:  { veld: '#080a20' },
  lava:  { veld: '#120708' },
  ijs:   { veld: '#06122b' },
  nevel: { veld: '#0b0620' },
  gat:   { veld: '#05040d' },
}
function hash(c, r, i) { var x = Math.sin(c * 127.1 + r * 311.7 + (i || 0) * 74.7) * 43758.5453; return x - Math.floor(x) }
function blokken(k) { return Object.keys(k.blok).map(function (s) { var cr = s.split(',').map(Number); return { c: cr[0], r: cr[1], h: hash(cr[0], cr[1]) } }) }

function tekenGrond(g, k) {
  var rnd = TD.rng(k.nr * 31 + 7), i
  g.save(); g.beginPath(); g.rect(ox, oy, FW, FH); g.clip()
  if (k.thema === 'stad') {
    // printplaat-lijntjes: hoekige sporen met knooppuntjes, heel zacht
    g.lineWidth = Math.max(1, T * 0.04); g.lineJoin = 'round'
    for (i = 0; i < 34; i++) {
      var c = Math.floor(rnd() * TD.COLS), rr = Math.floor(rnd() * TD.ROWS), lx = px(c + 0.5), ly = py(rr + 0.5)
      g.strokeStyle = rgba(i % 3 ? k.tweede : k.kleur, 0.1)
      g.beginPath(); g.moveTo(lx, ly)
      for (var st = 0; st < 3; st++) {
        if ((st + i) % 2) lx += (rnd() < 0.5 ? -1 : 1) * T * (1 + Math.floor(rnd() * 2)); else ly += (rnd() < 0.5 ? -1 : 1) * T * (1 + Math.floor(rnd() * 2))
        g.lineTo(lx, ly)
      }
      g.stroke()
      g.fillStyle = rgba(k.kleur, 0.18); g.beginPath(); g.arc(lx, ly, Math.max(1.5, T * 0.06), 0, TAU); g.fill()
    }
    g.fillStyle = rgba(k.kleur, 0.1)
    for (i = 0; i < 60; i++) g.fillRect(ox + rnd() * FW, oy + rnd() * FH, 2, 2)
  } else if (k.thema === 'lava') {
    // gloeiende scheuren in de grond
    g.save(); g.shadowColor = '#ff5a1f'; g.shadowBlur = 8; g.lineCap = 'round'; g.lineJoin = 'round'
    for (i = 0; i < 30; i++) {
      var x = ox + rnd() * FW, y = oy + rnd() * FH, a = rnd() * TAU
      g.strokeStyle = 'rgba(255,' + Math.round(70 + rnd() * 60) + ',20,' + (0.18 + rnd() * 0.18) + ')'
      g.lineWidth = Math.max(1, T * (0.03 + rnd() * 0.04))
      g.beginPath(); g.moveTo(x, y)
      for (var j = 0; j < 4; j++) { a += (rnd() - 0.5) * 1.6; x += Math.cos(a) * T * (0.3 + rnd() * 0.4); y += Math.sin(a) * T * (0.3 + rnd() * 0.4); g.lineTo(x, y) }
      g.stroke()
    }
    g.restore()
    g.fillStyle = 'rgba(255,120,60,0.08)'
    for (i = 0; i < 80; i++) g.fillRect(ox + rnd() * FW, oy + rnd() * FH, 2, 2)
  } else if (k.thema === 'ijs') {
    // sneeuwkorrels en rijp
    for (i = 0; i < 320; i++) { g.fillStyle = 'rgba(230,245,255,' + (0.04 + rnd() * 0.14) + ')'; var z = 1 + rnd() * 1.6; g.fillRect(ox + rnd() * FW, oy + rnd() * FH, z, z) }
    g.strokeStyle = 'rgba(190,235,255,0.12)'; g.lineWidth = 1
    for (i = 0; i < 18; i++) {
      var sx = ox + rnd() * FW, sy = oy + rnd() * FH
      for (var t2 = 0; t2 < 3; t2++) { var b = rnd() * TAU, l = T * (0.3 + rnd() * 0.6); g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(b) * l, sy + Math.sin(b) * l); g.stroke() }
    }
  } else if (k.thema === 'nevel') {
    // nevelwolken en extra sterren
    var kleuren = [k.kleur, k.tweede, '#9b6bff', '#4f8cff']
    for (i = 0; i < 9; i++) {
      var nx = ox + rnd() * FW, ny = oy + rnd() * FH, nr = T * (2.5 + rnd() * 4), gr = g.createRadialGradient(nx, ny, 0, nx, ny, nr)
      var kl = kleuren[i % kleuren.length]
      gr.addColorStop(0, rgba(kl, 0.13 + rnd() * 0.08)); gr.addColorStop(1, rgba(kl, 0))
      g.fillStyle = gr; g.fillRect(nx - nr, ny - nr, nr * 2, nr * 2)
    }
    for (i = 0; i < 120; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.15 + rnd() * 0.45) + ')'; var zz = rnd() < 0.1 ? 2 : 1; g.fillRect(ox + rnd() * FW, oy + rnd() * FH, zz, zz) }
  } else if (k.thema === 'gat') {
    // ruimte die naar het zwarte gat toe kromt, met een gloeiende schijf eromheen
    var kx = px(k.kern.c + 0.5), ky = py(k.kern.r + 0.5)
    var schijf = g.createRadialGradient(kx, ky, T * 0.5, kx, ky, T * 5)
    schijf.addColorStop(0, 'rgba(0,0,0,0)'); schijf.addColorStop(0.12, rgba(k.tweede, 0.35)); schijf.addColorStop(0.35, rgba(k.kleur, 0.18)); schijf.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = schijf; g.fillRect(ox, oy, FW, FH)
    g.strokeStyle = rgba(k.kleur, 0.09); g.lineWidth = 1
    function krom(x, y) { var dx = x - kx, dy = y - ky, d2 = dx * dx + dy * dy, f = 1 / (1 + d2 / (T * T * 6)); return [x - dx * f * 0.55, y - dy * f * 0.55] }
    for (var cc = 0; cc <= TD.COLS; cc++) { g.beginPath(); for (var yy = 0; yy <= TD.ROWS * 4; yy++) { var q = krom(px(cc), oy + yy * T / 4); if (yy) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]) } g.stroke() }
    for (var r3 = 0; r3 <= TD.ROWS; r3++) { g.beginPath(); for (var xx = 0; xx <= TD.COLS * 4; xx++) { var q2 = krom(ox + xx * T / 4, py(r3)); if (xx) g.lineTo(q2[0], q2[1]); else g.moveTo(q2[0], q2[1]) } g.stroke() }
    for (i = 0; i < 90; i++) { g.fillStyle = 'rgba(255,240,220,' + (0.1 + rnd() * 0.4) + ')'; g.fillRect(ox + rnd() * FW, oy + rnd() * FH, 1.5, 1.5) }
  }
  g.restore()
}

// aankleding op de niet-bebouwbare vakjes
function tekenDecor(g, k, b) {
  var x = px(b.c + 0.5), y = py(b.r + 0.5), s = T, h = b.h, i
  g.save(); g.translate(x, y)
  if (k.thema === 'stad') {
    // flatgebouw in 3D: gevel met ramen, dak erboven
    var kl = [k.kleur, k.tweede, '#ff4fd8'][Math.floor(h * 3)], w = s * 0.74, hoog = s * (0.45 + h * 0.5), dak = w * 0.5
    var onder = s * 0.4, boven = onder - hoog
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(s * 0.06, onder, w * 0.62, s * 0.1, 0, 0, TAU); g.fill()
    var gv = g.createLinearGradient(0, boven, 0, onder); gv.addColorStop(0, '#1a1e48'); gv.addColorStop(1, '#090b1e')
    g.fillStyle = gv; g.fillRect(-w / 2, boven, w, hoog)
    var rijen = Math.max(2, Math.floor(hoog / (s * 0.17)))
    for (i = 0; i < rijen * 3; i++) {
      var aan = hash(b.c, b.r, i) > 0.38
      g.fillStyle = aan ? (hash(b.c, b.r, i + 9) > 0.55 ? 'rgba(255,233,168,0.9)' : rgba(kl, 0.8)) : 'rgba(255,255,255,0.05)'
      g.fillRect(-w * 0.36 + (i % 3) * w * 0.28, boven + s * 0.06 + Math.floor(i / 3) * s * 0.17, w * 0.16, s * 0.09)
    }
    // dak
    g.shadowColor = kl; g.shadowBlur = s * 0.3
    g.beginPath(); g.moveTo(-w / 2, boven); g.lineTo(w / 2, boven); g.lineTo(w / 2 - s * 0.08, boven - dak); g.lineTo(-w / 2 - s * 0.08, boven - dak); g.closePath()
    g.fillStyle = '#262c66'; g.fill(); g.shadowBlur = 0
    g.strokeStyle = rgba(kl, 0.95); g.lineWidth = Math.max(1, s * 0.035); g.stroke()
    g.strokeStyle = rgba(kl, 0.5); g.beginPath(); g.moveTo(-w / 2, boven); g.lineTo(-w / 2, onder); g.moveTo(w / 2, boven); g.lineTo(w / 2, onder); g.stroke()
  } else if (k.thema === 'lava') {
    if (h < 0.62) {
      // lavapoel
      g.shadowColor = '#ff5a1f'; g.shadowBlur = s * 0.6
      g.beginPath()
      for (i = 0; i < 12; i++) { var a = i / 12 * TAU, rr = s * 0.42 * (0.78 + 0.22 * hash(b.c, b.r, i)); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.86) }
      g.closePath()
      var lg = g.createRadialGradient(0, 0, 0, 0, 0, s * 0.42)
      lg.addColorStop(0, '#fff3a0'); lg.addColorStop(0.35, '#ffb020'); lg.addColorStop(0.75, '#ff4a1f'); lg.addColorStop(1, '#5a1206')
      g.fillStyle = lg; g.fill(); g.shadowBlur = 0
      g.lineWidth = Math.max(2, s * 0.07); g.strokeStyle = '#2a0c06'; g.stroke()
    } else {
      // gloeiende rots
      g.beginPath()
      for (i = 0; i < 8; i++) { var a2 = i / 8 * TAU + h, r2 = s * 0.36 * (0.75 + 0.25 * hash(b.c, b.r, i)); g.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2) }
      g.closePath(); g.fillStyle = '#24121a'; g.fill()
      g.shadowColor = '#ff5a1f'; g.shadowBlur = s * 0.3; g.strokeStyle = 'rgba(255,110,40,0.85)'; g.lineWidth = Math.max(1, s * 0.035); g.stroke()
      g.beginPath(); g.moveTo(-s * 0.15, -s * 0.12); g.lineTo(0, 0); g.lineTo(s * 0.12, -s * 0.05); g.moveTo(0, 0); g.lineTo(-s * 0.04, s * 0.18); g.stroke()
    }
  } else if (k.thema === 'ijs') {
    if (h < 0.55) tekenKristal(g, 0, s * 0.08, s * 1.25, '#cfefff', Math.floor(h * 10) % 4)
    else {
      g.shadowColor = '#9ee7ff'; g.shadowBlur = s * 0.35
      g.beginPath(); g.ellipse(0, 0, s * 0.4, s * 0.32, 0, 0, TAU)
      var ig = g.createRadialGradient(-s * 0.1, -s * 0.1, 0, 0, 0, s * 0.4)
      ig.addColorStop(0, '#e9fbff'); ig.addColorStop(0.5, '#8fd8ff'); ig.addColorStop(1, '#2d5fb8')
      g.fillStyle = ig; g.fill(); g.shadowBlur = 0
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = Math.max(1.5, s * 0.05); g.stroke()
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1
      g.beginPath(); g.moveTo(-s * 0.2, -s * 0.05); g.lineTo(0, s * 0.03); g.lineTo(s * 0.18, -s * 0.1); g.moveTo(0, s * 0.03); g.lineTo(s * 0.05, s * 0.2); g.stroke()
    }
  } else if (k.thema === 'nevel') {
    if (h < 0.5) {
      var pk = [k.kleur, k.tweede, '#4f8cff', '#8cff5a'][Math.floor(h * 8) % 4], pr = s * (0.22 + h * 0.16)
      g.shadowColor = pk; g.shadowBlur = s * 0.4
      var pg = g.createRadialGradient(-pr * 0.4, -pr * 0.4, 0, 0, 0, pr)
      pg.addColorStop(0, tint(pk, 0.6)); pg.addColorStop(0.6, pk); pg.addColorStop(1, tint(pk, -0.6))
      g.beginPath(); g.arc(0, 0, pr, 0, TAU); g.fillStyle = pg; g.fill(); g.shadowBlur = 0
      g.save(); g.rotate(-0.45)
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(1.5, s * 0.05)
      g.beginPath(); g.ellipse(0, 0, pr * 1.75, pr * 0.45, 0, 0, TAU); g.stroke()
      g.restore()
    } else tekenRotsen(g, s, b, '#3a3552', k.kleur)
  } else if (k.thema === 'gat') {
    tekenRotsen(g, s, b, '#2a2440', k.kleur)
  }
  g.restore()
}
function tekenRotsen(g, s, b, kleur, rand) {
  for (var j = 0; j < 3; j++) {
    var ax = (hash(b.c, b.r, j) - 0.5) * s * 0.45, ay = (hash(b.c, b.r, j + 5) - 0.5) * s * 0.45, ar = s * (0.12 + hash(b.c, b.r, j + 2) * 0.13)
    g.beginPath()
    for (var i = 0; i < 7; i++) { var a = i / 7 * TAU, rr = ar * (0.7 + 0.3 * hash(b.c + j, b.r, i)); g.lineTo(ax + Math.cos(a) * rr, ay + Math.sin(a) * rr) }
    g.closePath()
    g.fillStyle = kleur; g.fill()
    g.strokeStyle = rgba(rand, 0.6); g.lineWidth = 1; g.stroke()
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(ax - ar * 0.3, ay - ar * 0.3, ar * 0.3, 0, TAU); g.fill()
  }
}

function tekenVeld() {
  laag.width = cv.width; laag.height = cv.height
  var g = lctx, k = S ? S.kaart : TD.kaart(L)
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.fillStyle = '#06061a'; g.fillRect(0, 0, W, H)
  var gr = g.createRadialGradient(W * 0.2, H * 0.1, 0, W * 0.2, H * 0.1, Math.max(W, H) * 0.7)
  gr.addColorStop(0, rgba(k.kleur, 0.14)); gr.addColorStop(1, rgba(k.kleur, 0))
  g.fillStyle = gr; g.fillRect(0, 0, W, H)
  gr = g.createRadialGradient(W * 0.85, H, 0, W * 0.85, H, Math.max(W, H) * 0.7)
  gr.addColorStop(0, rgba(k.tweede, 0.12)); gr.addColorStop(1, rgba(k.tweede, 0))
  g.fillStyle = gr; g.fillRect(0, 0, W, H)
  STERREN.forEach(function (s) { g.fillStyle = 'rgba(255,255,255,' + s.a + ')'; g.fillRect(s.x * W, s.y * H, s.s, s.s) })

  // veldplaat
  var m = Math.max(5, T * 0.14)
  g.save()
  g.shadowColor = rgba(k.kleur, 0.45); g.shadowBlur = 26
  rondRect(g, ox - m, oy - m, FW + 2 * m, FH + 2 * m, 16)
  g.fillStyle = THEMA[k.thema].veld; g.fill()
  g.restore()
  rondRect(g, ox - m, oy - m, FW + 2 * m, FH + 2 * m, 16)
  g.lineWidth = 1.5; g.strokeStyle = rgba(k.kleur, 0.45); g.stroke()
  // binnenste gloed
  gr = g.createRadialGradient(ox + FW / 2, oy + FH / 2, 0, ox + FW / 2, oy + FH / 2, Math.max(FW, FH) * 0.65)
  gr.addColorStop(0, rgba(k.tweede, 0.07)); gr.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = gr; g.fillRect(ox, oy, FW, FH)

  tekenGrond(g, k)

  // raster: lijntjes en puntjes op de hoeken
  g.strokeStyle = 'rgba(140,160,255,0.045)'; g.lineWidth = 1
  g.beginPath()
  for (var c = 1; c < TD.COLS; c++) { g.moveTo(px(c) + 0.5, oy); g.lineTo(px(c) + 0.5, oy + FH) }
  for (var r = 1; r < TD.ROWS; r++) { g.moveTo(ox, py(r) + 0.5); g.lineTo(ox + FW, py(r) + 0.5) }
  g.stroke()
  g.fillStyle = 'rgba(170,190,255,0.16)'
  for (c = 1; c < TD.COLS; c++) for (r = 1; r < TD.ROWS; r++) g.fillRect(px(c) - 1, py(r) - 1, 2, 2)

  // pad: alle routes laag voor laag, zodat kruisingen en samenkomsten één geheel worden
  g.save()
  rondRect(g, ox - m, oy - m, FW + 2 * m, FH + 2 * m, 16); g.clip()
  g.lineJoin = 'round'; g.lineCap = 'butt'
  function padLijn(breedte, kleur, blur) {
    g.save()
    if (blur) { g.shadowColor = kleur; g.shadowBlur = blur }
    g.strokeStyle = kleur; g.lineWidth = breedte
    k.routes.forEach(function (route) {
      g.beginPath()
      route.pts.forEach(function (p, i) { var x = px(p.x), y = py(p.y); if (i) g.lineTo(x, y); else g.moveTo(x, y) })
      g.stroke()
    })
    g.restore()
  }
  padLijn(T * 0.92, rgba(k.kleur, 0.55), T * 0.5)
  padLijn(T * 0.9, rgba(k.kleur, 0.95))
  padLijn(T * 0.8, '#0a0c26')
  padLijn(T * 0.56, '#0f1233')
  g.setLineDash([T * 0.16, T * 0.3]); padLijn(Math.max(1, T * 0.04), rgba(k.kleur, 0.22)); g.setLineDash([])
  g.restore()

  // ingangen: een poortje waar het pad het veld binnenkomt
  k.routes.forEach(function (route) {
    var a = route.pts[0], b = route.pts[1]
    var dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y)
    var ex = dx ? (dx > 0 ? 0 : TD.COLS) : a.x, ey = dy ? (dy > 0 ? 0 : TD.ROWS) : a.y
    var x = px(ex), y = py(ey)
    g.save(); g.translate(x, y); g.rotate(Math.atan2(dy, dx))
    g.shadowColor = k.tweede; g.shadowBlur = 14
    g.strokeStyle = k.tweede; g.lineWidth = Math.max(2, T * 0.08); g.lineCap = 'round'
    g.beginPath(); g.moveTo(0, -T * 0.55); g.lineTo(0, -T * 0.32); g.moveTo(0, T * 0.32); g.lineTo(0, T * 0.55); g.stroke()
    g.restore()
  })

  // aankleding (niet bebouwbaar)
  blokken(k).forEach(function (b) { tekenDecor(g, k, b) })
}
function rondRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
}
function tekenKristal(g, x, y, s, kleur, v) {
  g.save(); g.translate(x, y)
  g.shadowColor = kleur; g.shadowBlur = s * 0.4
  var scherven = [[-0.16, 0.12, 0.12, 0.36, -0.15], [0.12, 0.16, 0.1, 0.28, 0.25], [0, 0.04, 0.14, 0.46, 0.05]]
  scherven.forEach(function (q, i) {
    if (v === i) return
    g.save(); g.translate(q[0] * s, q[1] * s); g.rotate(q[4])
    var w = q[2] * s, h = q[3] * s
    g.beginPath(); g.moveTo(0, -h); g.lineTo(w, -h * 0.3); g.lineTo(w * 0.6, h * 0.25); g.lineTo(-w * 0.6, h * 0.25); g.lineTo(-w, -h * 0.3); g.closePath()
    var gr = g.createLinearGradient(0, -h, 0, h * 0.3)
    gr.addColorStop(0, tint(kleur, 0.6)); gr.addColorStop(1, rgba(kleur, 0.35))
    g.fillStyle = gr; g.fill()
    g.shadowBlur = 0; g.strokeStyle = rgba('#ffffff', 0.5); g.lineWidth = 1
    g.beginPath(); g.moveTo(0, -h); g.lineTo(0, h * 0.25); g.stroke()
    g.restore()
  })
  g.restore()
}

// ── sprites ──
var sprites = {}
function gloedSprite(kleur) {
  var k = 'gloed' + kleur
  if (sprites[k]) return sprites[k]
  var n = 64, c = document.createElement('canvas'); c.width = c.height = n
  var g = c.getContext('2d'), gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2)
  gr.addColorStop(0, rgba(kleur, 0.9)); gr.addColorStop(0.35, rgba(kleur, 0.35)); gr.addColorStop(1, rgba(kleur, 0))
  g.fillStyle = gr; g.fillRect(0, 0, n, n)
  return (sprites[k] = c)
}
function ballonStraal(laag) { return T * (laag === 'pantser' ? 0.35 : laag === 'lood' ? 0.32 : 0.3) }
function ballonSprite(laag, bevroren) {
  var key = 'b' + laag + (bevroren ? 'v' : '')
  if (sprites[key]) return sprites[key]
  var d = TD.LAGEN[laag], r = ballonStraal(laag) * dpr, m = r * 1.3
  var c = document.createElement('canvas'); c.width = c.height = Math.ceil(2 * (r + m))
  var g = c.getContext('2d'), cx = c.width / 2, cy = c.height / 2
  var gloed = d.rand || d.kleur
  // gloed
  g.shadowColor = gloed; g.shadowBlur = r * 1.1
  g.beginPath(); g.ellipse(cx, cy, r * 0.92, r, 0, 0, TAU); g.fillStyle = d.kleur; g.fill()
  g.shadowBlur = 0
  // lijf
  var gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.42, r * 0.05, cx, cy, r * 1.05)
  gr.addColorStop(0, tint(d.kleur, laag === 'zwart' ? 0.35 : 0.55)); gr.addColorStop(0.55, d.kleur); gr.addColorStop(1, tint(d.kleur, -0.45))
  g.beginPath(); g.ellipse(cx, cy, r * 0.92, r, 0, 0, TAU); g.fillStyle = gr; g.fill()
  // knoopje
  g.beginPath(); g.moveTo(cx - r * 0.14, cy + r * 1.08); g.lineTo(cx + r * 0.14, cy + r * 1.08); g.lineTo(cx, cy + r * 0.92); g.closePath()
  g.fillStyle = tint(d.kleur, -0.3); g.fill()
  if (laag === 'lood') {
    g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = r * 0.08
    g.beginPath(); g.ellipse(cx, cy, r * 0.92, r * 0.42, 0, 0, TAU); g.stroke()
    g.fillStyle = 'rgba(30,34,48,0.55)'
    for (var i = 0; i < 6; i++) { var a = i / 6 * TAU; g.beginPath(); g.arc(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.36, r * 0.06, 0, TAU); g.fill() }
  }
  if (laag === 'pantser') {
    g.strokeStyle = 'rgba(80,30,0,0.55)'; g.lineWidth = r * 0.07
    for (var j = -1; j <= 1; j++) { g.beginPath(); g.moveTo(cx - r * 0.85, cy + j * r * 0.5); g.lineTo(cx + r * 0.85, cy + j * r * 0.5); g.stroke() }
    g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx, cy + r); g.stroke()
  }
  if (d.rand) { g.strokeStyle = d.rand; g.lineWidth = r * 0.12; g.beginPath(); g.ellipse(cx, cy, r * 0.86, r * 0.94, 0, 0, TAU); g.stroke() }
  // glimlicht
  g.fillStyle = 'rgba(255,255,255,' + (laag === 'wit' ? 0.9 : 0.55) + ')'
  g.beginPath(); g.ellipse(cx - r * 0.34, cy - r * 0.44, r * 0.2, r * 0.3, -0.5, 0, TAU); g.fill()
  if (bevroren) {
    g.fillStyle = 'rgba(190,240,255,0.45)'
    g.beginPath()
    for (var h = 0; h < 6; h++) { var b = h / 6 * TAU + 0.3; g.lineTo(cx + Math.cos(b) * r * 1.12, cy + Math.sin(b) * r * 1.12) }
    g.closePath(); g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(1, r * 0.07); g.stroke()
  }
  sprites[key] = c
  return c
}

// ── torens tekenen (ook gebruikt voor de knoppen) ──
function tekenToren(g, type, niveau, x, y, s, hoek, tijd, terug, klaar) {
  var d = TD.TORENS[type], k = d.kleur
  g.save(); g.translate(x, y)
  // gloed onder de toren
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + niveau * 0.12
  var gs = s * (1.15 + niveau * 0.12); g.drawImage(gloedSprite(k), -gs / 2, -gs / 2, gs, gs)
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'
  // voetstuk
  var b = s * 0.84
  rondRect(g, -b / 2, -b / 2, b, b, s * 0.18)
  var gr = g.createLinearGradient(0, -b / 2, 0, b / 2); gr.addColorStop(0, '#171a44'); gr.addColorStop(1, '#0b0d26')
  g.fillStyle = gr; g.fill()
  g.lineWidth = Math.max(1.2, s * 0.045); g.strokeStyle = rgba(k, 0.85); g.stroke()
  if (niveau >= 1) {
    g.strokeStyle = rgba(k, 0.35); g.lineWidth = Math.max(1, s * 0.03)
    g.beginPath(); g.arc(0, 0, s * 0.33, 0, TAU); g.stroke()
  }
  if (niveau >= 2) {
    g.fillStyle = k
    ;[[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q) { g.beginPath(); g.arc(q[0] * b * 0.33, q[1] * b * 0.33, s * 0.045, 0, TAU); g.fill() })
  }
  g.lineCap = 'round'; g.lineJoin = 'round'
  if (type === 'zaag') {
    g.rotate(tijd * (terug ? 14 : 3))
    var tanden = 12, rz = s * (0.27 + niveau * 0.02)
    g.shadowColor = k; g.shadowBlur = s * 0.25
    g.beginPath()
    for (var z = 0; z < tanden * 2; z++) { var az = z / (tanden * 2) * TAU, rr = z % 2 ? rz * 0.82 : rz; g.lineTo(Math.cos(az) * rr, Math.sin(az) * rr) }
    g.closePath()
    var zg = g.createRadialGradient(0, 0, 0, 0, 0, rz)
    zg.addColorStop(0, '#f4efff'); zg.addColorStop(0.6, niveau >= 2 ? '#9ef7ff' : '#cbbcff'); zg.addColorStop(1, k)
    g.fillStyle = zg; g.fill(); g.shadowBlur = 0
    g.strokeStyle = 'rgba(40,20,80,0.5)'; g.lineWidth = 1
    for (var sp = 0; sp < 3; sp++) { g.beginPath(); g.arc(0, 0, rz * 0.55, sp * TAU / 3, sp * TAU / 3 + 1); g.stroke() }
    g.fillStyle = '#1a1438'; g.beginPath(); g.arc(0, 0, s * 0.07, 0, TAU); g.fill()
  } else if (type === 'mijn') {
    var gl = 0.6 + 0.4 * Math.sin(tijd * 2.4)
    g.fillStyle = '#20160a'; g.strokeStyle = k; g.lineWidth = Math.max(1.2, s * 0.04)
    g.beginPath(); g.moveTo(-s * 0.24, s * 0.18); g.lineTo(-s * 0.24, -s * 0.04); g.arc(0, -s * 0.04, s * 0.24, Math.PI, 0); g.lineTo(s * 0.24, s * 0.18); g.closePath(); g.fill(); g.stroke()
    var mg = g.createRadialGradient(0, s * 0.05, 0, 0, s * 0.05, s * 0.2)
    mg.addColorStop(0, rgba('#fff3b0', gl)); mg.addColorStop(1, rgba(k, 0))
    g.fillStyle = mg; g.fillRect(-s * 0.2, -s * 0.2, s * 0.4, s * 0.38)
    g.fillStyle = '#ffc83d'; g.strokeStyle = '#8a5a00'; g.lineWidth = 1
    for (var m = 0; m < 2 + niveau; m++) { g.beginPath(); g.ellipse(s * 0.02 + (m - 1) * s * 0.07, s * 0.14 - m * s * 0.02, s * 0.07, s * 0.035, 0, 0, TAU); g.fill(); g.stroke() }
  } else if (type === 'spijker') {
    g.save(); g.rotate(tijd * 0.8)
    g.strokeStyle = rgba(k, 0.55); g.lineWidth = Math.max(2, s * 0.07)
    g.beginPath(); g.arc(0, 0, s * 0.24, 0, TAU); g.stroke()
    for (var tt = 0; tt < 8; tt++) { var at = tt / 8 * TAU; g.beginPath(); g.moveTo(Math.cos(at) * s * 0.24, Math.sin(at) * s * 0.24); g.lineTo(Math.cos(at) * s * 0.3, Math.sin(at) * s * 0.3); g.stroke() }
    g.restore()
    tekenSpijkerster(g, 0, 0, s * 0.34, niveau >= 2 ? '#ffb36b' : k)
  } else if (type === 'storm') {
    g.fillStyle = '#3a3f66'
    ;[[-0.12, 0.02, 0.15], [0.1, 0.03, 0.14], [0, -0.07, 0.17]].forEach(function (w) { g.beginPath(); g.arc(w[0] * s, w[1] * s, w[2] * s, 0, TAU); g.fill() })
    g.fillStyle = '#dfe4ff'
    ;[[-0.12, 0.0, 0.12], [0.1, 0.01, 0.11], [0, -0.09, 0.14]].forEach(function (w) { g.beginPath(); g.arc(w[0] * s, w[1] * s, w[2] * s, 0, TAU); g.fill() })
    var flits = klaar && Math.sin(tijd * 17) > 0.2
    g.shadowColor = '#fff35a'; g.shadowBlur = flits ? s * 0.4 : 0
    g.fillStyle = flits ? '#fff35a' : '#a99a3a'
    g.beginPath(); g.moveTo(s * 0.03, s * 0.02); g.lineTo(-s * 0.07, s * 0.2); g.lineTo(0, s * 0.18); g.lineTo(-s * 0.04, s * 0.32); g.lineTo(s * 0.1, s * 0.12); g.lineTo(s * 0.03, s * 0.13); g.closePath(); g.fill()
  } else if (type === 'vriezer') {
    g.rotate(tijd * 0.6)
    g.strokeStyle = k; g.lineWidth = Math.max(1.5, s * 0.06)
    g.shadowColor = k; g.shadowBlur = s * 0.25
    for (var i = 0; i < 6; i++) {
      g.save(); g.rotate(i / 6 * TAU)
      g.beginPath(); g.moveTo(0, 0); g.lineTo(s * 0.3, 0)
      g.moveTo(s * 0.17, 0); g.lineTo(s * 0.24, -s * 0.07); g.moveTo(s * 0.17, 0); g.lineTo(s * 0.24, s * 0.07)
      g.stroke(); g.restore()
    }
    g.fillStyle = '#e8fbff'; g.beginPath(); g.arc(0, 0, s * 0.08 + niveau * s * 0.015, 0, TAU); g.fill()
  } else if (type === 'tesla') {
    g.strokeStyle = rgba(k, 0.9); g.lineWidth = Math.max(1.2, s * 0.045)
    for (var j = 0; j < 3; j++) { g.beginPath(); g.arc(0, 0, s * (0.27 - j * 0.07), 0, TAU); g.stroke() }
    var flik = 0.75 + 0.25 * Math.sin(tijd * 23) * Math.sin(tijd * 7)
    g.shadowColor = k; g.shadowBlur = s * 0.4 * (klaar ? 1 : 0.4)
    g.fillStyle = klaar ? '#fffbe0' : tint(k, -0.2)
    g.beginPath(); g.arc(0, 0, s * (0.09 + niveau * 0.015) * flik, 0, TAU); g.fill()
    if (klaar) {
      g.strokeStyle = 'rgba(255,245,180,0.8)'; g.lineWidth = 1.2
      var a0 = tijd * 9
      for (var v = 0; v < 2; v++) {
        var a1 = a0 + v * Math.PI
        g.beginPath(); g.moveTo(Math.cos(a1) * s * 0.1, Math.sin(a1) * s * 0.1)
        g.lineTo(Math.cos(a1 + 0.4) * s * 0.2, Math.sin(a1 + 0.4) * s * 0.2); g.lineTo(Math.cos(a1 + 0.1) * s * 0.29, Math.sin(a1 + 0.1) * s * 0.29); g.stroke()
      }
    }
  } else {
    g.rotate(hoek)
    var t = (terug || 0) * s * 0.08
    if (type === 'pijler') {
      var lopen = niveau >= 2 ? [-0.3, 0, 0.3] : [0]
      lopen.forEach(function (da) {
        g.save(); g.rotate(da)
        g.fillStyle = tint(k, -0.15); rondRect(g, s * 0.02 - t, -s * 0.045, s * 0.34, s * 0.09, s * 0.03); g.fill()
        g.restore()
      })
      g.strokeStyle = k; g.lineWidth = Math.max(1.5, s * 0.06)
      g.beginPath(); g.moveTo(s * 0.06 - t, -s * 0.24); g.quadraticCurveTo(s * 0.2 - t, 0, s * 0.06 - t, s * 0.24); g.stroke()
      g.fillStyle = '#122040'; g.strokeStyle = k; g.lineWidth = Math.max(1, s * 0.035)
      g.beginPath(); g.arc(0, 0, s * 0.15, 0, TAU); g.fill(); g.stroke()
      g.fillStyle = k; g.beginPath(); g.moveTo(s * 0.42 - t, 0); g.lineTo(s * 0.32 - t, -s * 0.06); g.lineTo(s * 0.32 - t, s * 0.06); g.closePath(); g.fill()
    } else if (type === 'kanon') {
      g.fillStyle = '#3a2214'; g.strokeStyle = k; g.lineWidth = Math.max(1.2, s * 0.04)
      rondRect(g, -t, -s * 0.09 - niveau * s * 0.01, s * 0.4, s * 0.18 + niveau * s * 0.02, s * 0.05); g.fill(); g.stroke()
      g.fillStyle = k; g.fillRect(s * 0.33 - t, -s * 0.11, s * 0.07, s * 0.22)
      g.fillStyle = '#26160d'; g.beginPath(); g.arc(0, 0, s * 0.2, 0, TAU); g.fill(); g.stroke()
      g.fillStyle = rgba(k, 0.8); g.beginPath(); g.arc(0, 0, s * 0.07, 0, TAU); g.fill()
    } else if (type === 'railgun') {
      var lad = klaar ? 1 : 0.25
      g.fillStyle = '#123018'; g.strokeStyle = k; g.lineWidth = Math.max(1, s * 0.035)
      ;[-1, 1].forEach(function (z) { rondRect(g, -s * 0.1 - t, z * s * 0.075 - s * 0.035, s * 0.52, s * 0.07, s * 0.02); g.fill(); g.stroke() })
      g.shadowColor = k; g.shadowBlur = s * 0.35 * lad
      g.fillStyle = rgba(k, 0.25 + 0.6 * lad); g.fillRect(-s * 0.02 - t, -s * 0.035, s * 0.38, s * 0.07)
      g.shadowBlur = 0
      g.fillStyle = '#0f2414'; rondRect(g, -s * 0.2, -s * 0.14, s * 0.22, s * 0.28, s * 0.05); g.fill(); g.stroke()
    } else if (type === 'vlam') {
      g.fillStyle = '#3a120a'; g.strokeStyle = k; g.lineWidth = Math.max(1.2, s * 0.04)
      g.beginPath(); g.moveTo(s * 0.06 - t, -s * 0.07); g.lineTo(s * 0.36 - t, -s * 0.11); g.lineTo(s * 0.36 - t, s * 0.11); g.lineTo(s * 0.06 - t, s * 0.07); g.closePath(); g.fill(); g.stroke()
      g.fillStyle = '#2a0e08'; g.beginPath(); g.arc(0, 0, s * 0.18, 0, TAU); g.fill(); g.stroke()
      g.fillStyle = rgba(k, 0.7); g.beginPath(); g.arc(-s * 0.05, 0, s * 0.07, 0, TAU); g.fill()
      var vl = 0.7 + 0.3 * Math.sin(tijd * 31)
      g.shadowColor = niveau >= 2 ? '#4fc8ff' : '#ffb020'; g.shadowBlur = s * 0.2
      g.fillStyle = niveau >= 2 ? '#9fe2ff' : '#ffd36b'
      g.beginPath(); g.ellipse(s * 0.4 - t, 0, s * 0.06 * vl, s * 0.04, 0, 0, TAU); g.fill()
    } else if (type === 'magneet') {
      g.lineCap = 'butt'
      g.strokeStyle = k; g.lineWidth = s * 0.13
      g.beginPath(); g.arc(-s * 0.02 - t, 0, s * 0.17, Math.PI / 2, Math.PI * 1.5); g.stroke()
      g.beginPath(); g.moveTo(-s * 0.02 - t, -s * 0.17); g.lineTo(s * 0.2 - t, -s * 0.17); g.moveTo(-s * 0.02 - t, s * 0.17); g.lineTo(s * 0.2 - t, s * 0.17); g.stroke()
      g.strokeStyle = '#e6ecff'; g.beginPath(); g.moveTo(s * 0.2 - t, -s * 0.17); g.lineTo(s * 0.32 - t, -s * 0.17); g.stroke()
      g.strokeStyle = '#ff4f6a'; g.beginPath(); g.moveTo(s * 0.2 - t, s * 0.17); g.lineTo(s * 0.32 - t, s * 0.17); g.stroke()
      if (niveau >= 2) { g.strokeStyle = rgba(k, 0.5); g.lineWidth = 1.5; g.beginPath(); g.arc(s * 0.3, 0, s * 0.1, -1, 1); g.stroke() }
    } else if (type === 'mortier') {
      g.fillStyle = '#2b2214'; g.strokeStyle = k; g.lineWidth = Math.max(1.2, s * 0.045)
      g.beginPath(); g.arc(s * 0.05 - t * 0.5, 0, s * (0.2 + niveau * 0.015), 0, TAU); g.fill(); g.stroke()
      g.fillStyle = '#0b0805'; g.beginPath(); g.arc(s * 0.08 - t * 0.5, 0, s * 0.12, 0, TAU); g.fill()
      g.strokeStyle = rgba(k, 0.6); g.lineWidth = 1
      g.beginPath(); g.arc(s * 0.08 - t * 0.5, 0, s * 0.15, 0, TAU); g.stroke()
      g.fillStyle = k; g.fillRect(-s * 0.26, -s * 0.05, s * 0.1, s * 0.1)
    } else if (type === 'raket') {
      g.fillStyle = '#2a1420'; g.strokeStyle = k; g.lineWidth = Math.max(1, s * 0.035)
      rondRect(g, -s * 0.2, -s * 0.2, s * 0.32, s * 0.4, s * 0.06); g.fill(); g.stroke()
      ;[-1, 1].forEach(function (zz) {
        if (!klaar) { g.strokeStyle = rgba(k, 0.4); g.strokeRect(-s * 0.12, zz * s * 0.1 - s * 0.05, s * 0.36, s * 0.1); return }
        g.fillStyle = '#f2f5ff'; rondRect(g, -s * 0.12, zz * s * 0.1 - s * 0.045, s * 0.34, s * 0.09, s * 0.04); g.fill()
        g.fillStyle = k; g.beginPath(); g.moveTo(s * 0.22, zz * s * 0.1 - s * 0.045); g.lineTo(s * 0.32, zz * s * 0.1); g.lineTo(s * 0.22, zz * s * 0.1 + s * 0.045); g.closePath(); g.fill()
      })
    } else if (type === 'boemerang') {
      g.fillStyle = '#1d2408'; g.strokeStyle = rgba(k, 0.7); g.lineWidth = Math.max(1, s * 0.035)
      g.beginPath(); g.arc(0, 0, s * 0.15, 0, TAU); g.fill(); g.stroke()
      if (klaar) { g.save(); g.translate(s * 0.08, 0); tekenBoemerang(g, s * 0.5, k); g.restore() }
    } else if (type === 'laser') {
      g.fillStyle = '#2a0f2c'; g.strokeStyle = k; g.lineWidth = Math.max(1.2, s * 0.04)
      g.beginPath(); g.moveTo(s * 0.3 - t, 0); g.lineTo(0, -s * 0.18); g.lineTo(-s * 0.2, 0); g.lineTo(0, s * 0.18); g.closePath(); g.fill(); g.stroke()
      g.strokeStyle = rgba(k, 0.6); g.beginPath(); g.moveTo(-s * 0.2, 0); g.lineTo(s * 0.3 - t, 0); g.stroke()
      g.shadowColor = k; g.shadowBlur = s * 0.3
      g.fillStyle = '#ffd6f6'; g.beginPath(); g.arc(s * 0.3 - t, 0, s * (0.06 + niveau * 0.012), 0, TAU); g.fill()
    }
  }
  g.restore()
  // niveau-puntjes onder de toren
  if (niveau > 0) {
    g.fillStyle = k
    for (var n = 0; n < niveau; n++) { g.beginPath(); g.arc(x + (n - (niveau - 1) / 2) * s * 0.16, y + s * 0.34, s * 0.04, 0, TAU); g.fill() }
  }
}

function tekenSpijkerster(g, x, y, r, kleur) {
  g.save(); g.translate(x, y)
  g.fillStyle = kleur; g.shadowColor = kleur; g.shadowBlur = r * 0.6
  g.beginPath()
  for (var i = 0; i < 8; i++) { var a = i / 8 * TAU, rr = i % 2 ? r * 0.3 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) }
  g.closePath(); g.fill()
  g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(0, 0, r * 0.18, 0, TAU); g.fill()
  g.restore()
}
function tekenBoemerang(g, s, kleur) {
  g.save()
  g.fillStyle = kleur; g.shadowColor = kleur; g.shadowBlur = s * 0.4
  g.beginPath()
  g.moveTo(-s * 0.3, -s * 0.28); g.quadraticCurveTo(s * 0.05, -s * 0.05, s * 0.18, 0)
  g.quadraticCurveTo(s * 0.05, s * 0.05, -s * 0.3, s * 0.28)
  g.quadraticCurveTo(-s * 0.05, 0, -s * 0.3, -s * 0.28)
  g.fill()
  g.restore()
}
function icoon(canvas, type, niveau) {
  var n = canvas.clientWidth || 44, r = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = canvas.height = Math.round(n * r)
  var g = canvas.getContext('2d'); g.setTransform(r, 0, 0, r, 0, 0)
  tekenToren(g, type, niveau || 0, n / 2, n / 2, n * 0.92, -Math.PI / 4, 0.4, 0, true)
}
function ballonIcoon(canvas, laag) {
  var n = canvas.clientWidth || 34, r = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = canvas.height = Math.round(n * r)
  var g = canvas.getContext('2d'), oudT = T, oudD = dpr, oudS = sprites
  T = n * 1.25; dpr = r; sprites = {}
  var sp = ballonSprite(laag, false)
  T = oudT; dpr = oudD; sprites = oudS
  var s = canvas.width * 1.25
  g.drawImage(sp, (canvas.width - s) / 2, (canvas.height - s) / 2 - canvas.height * 0.04, s, s)
}

// ── spelstaat ──
var L = 0, S = null, actief = false, gepauzeerd = false, tijd = 0, acc = 0
var kies = null, gekozen = null, muis = null, druk = false
var deeltjes = [], ringen = [], lijnen = [], teksten = []
var schud = 0, kernFlits = 0, eindeOm = 0, autoOm = 0
var torenFx = {}   // per toren-id: terugslag

function startLevel(nr, verder) {
  L = nr
  S = TD.nieuwSpel(L)
  if (BELONING && !verder) wisBeloning()
  if (verder) {
    S.golf = verder.golf; S.goud = verder.goud; S.levens = verder.levens; S.id = verder.id
    S.geknald = verder.geknald || 0; S.gezien = verder.gezien || {}
    S.t = verder.t || 0; S.actief = !!verder.actief
    S.vijanden = verder.vijanden || []; S.wachtrij = verder.wachtrij || []
    S.torens = verder.torens.map(function (t) {
      return { id: t.id, type: t.type, c: t.c, r: t.r, x: t.c + 0.5, y: t.r + 0.5, niveau: t.niveau, wacht: t.wacht || 0.15, besteed: t.besteed,
        hoek: t.hoek, knallen: t.knallen || 0, s: TD.torenStats(t.type, t.niveau) }
    })
    var perId = {}; S.torens.forEach(function (t) { perId[t.id] = t })
    S.stapels = (verder.stapels || []).filter(function (p) { return perId[p.toren] }).map(function (p) { p.toren = perId[p.toren]; return p })
  }
  speeltijd = SPEELTIJD; tijdOp = false; bewaarOm = 1
  tekenTijd()
  actief = true; gepauzeerd = false; acc = 0
  kies = null; gekozen = null; deeltjes = []; ringen = []; lijnen = []; teksten = []; torenFx = {}
  eindeOm = 0; autoOm = 0; schud = 0; kernFlits = 0
  $('levelnaam').textContent = S.kaart.naam
  $('golftot').textContent = S.maxGolf
  toonScherm(null)
  meet()
  vorigeHud = {}
  tekenHud(); tekenPaneel()
  melding(verder
    ? '<b>Welkom terug!</b> Je gaat precies verder waar je was' + (S.actief ? ', midden in golf ' + S.golf : ', voor golf ' + (S.golf + 1)) + '.'
    : '<b>' + S.kaart.naam + '</b> — kies een toren hiernaast en zet hem naast het pad. Klaar? Druk op <b>Start golf</b>.', null, 5200)
}

// ── HUD ──
var vorigeHud = {}
function tekenHud() {
  if (!S) return
  if (vorigeHud.goud !== S.goud) {
    if (vorigeHud.goud !== undefined && S.goud > vorigeHud.goud + 20) { var gp = $('goudpil'); gp.classList.remove('op'); void gp.offsetWidth; gp.classList.add('op') }
    $('goud').textContent = S.goud; vorigeHud.goud = S.goud
    werkWinkelBij()
  }
  if (vorigeHud.levens !== S.levens) {
    if (vorigeHud.levens !== undefined && S.levens < vorigeHud.levens) { var lp = $('levenspil'); lp.classList.remove('au'); void lp.offsetWidth; lp.classList.add('au') }
    $('levens').textContent = S.levens; vorigeHud.levens = S.levens
  }
  if (vorigeHud.golf !== S.golf || vorigeHud.actief !== S.actief) {
    $('golfnr').textContent = S.golf
    vorigeHud.golf = S.golf; vorigeHud.actief = S.actief
    var sg = $('startgolf')
    if (S.actief) { sg.disabled = true; sg.textContent = 'Golf ' + S.golf + ' bezig…'; sg.classList.remove('puls') }
    else if (S.golf >= S.maxGolf) { sg.disabled = true; sg.textContent = 'Klaar!' }
    else { sg.disabled = false; sg.textContent = 'Start golf ' + (S.golf + 1); sg.classList.toggle('puls', S.golf === 0 && S.torens.length > 0) }
  }
}
function tekenSnel() { var b = $('snel'); b.textContent = D.snel + '×'; b.classList.toggle('aan', D.snel > 1) }
$('snel').onclick = function () { D.snel = D.snel >= 3 ? 1 : D.snel + 1; bewaar(); tekenSnel() }
tekenSnel()
$('auto').checked = D.auto
$('auto').onchange = function () { D.auto = this.checked; bewaar(); if (D.auto && S && !S.actief) autoOm = 1.2 }

// ── winkel ──
var knoppen = {}
TD.VOLGORDE.forEach(function (type, i) {
  var d = TD.TORENS[type], b = document.createElement('button')
  b.className = 'toren'; b.style.setProperty('--k', d.kleur)
  b.innerHTML = '<canvas></canvas><span class="nm">' + d.naam + '</span><span class="pr">' + d.prijs + '</span>'
  b.title = d.naam + ' (' + (i + 1) + ')'
  b.onclick = function () { kiesToren(type) }
  b.onmouseenter = function () { toonUitleg(type) }
  b.onmouseleave = function () { toonUitleg(kies) }
  $('winkel').appendChild(b)
  knoppen[type] = b
})
function iconenTekenen() { TD.VOLGORDE.forEach(function (t) { icoon(knoppen[t].querySelector('canvas'), t, 0) }) }
function werkWinkelBij() {
  TD.VOLGORDE.forEach(function (t) {
    knoppen[t].classList.toggle('duur', !S || S.goud < TD.TORENS[t].prijs)
    knoppen[t].classList.toggle('gekozen', kies === t)
  })
  if (gekozen) werkInfoBij()
}
function werkInfoBij() {
  var up = $('upknop'), kn = $('infoknallen')
  if (up && TD.upgradePrijs(gekozen)) up.disabled = S.goud < TD.upgradePrijs(gekozen)
  if (kn) kn.textContent = gekozen.knallen
}
function kiesToren(type) {
  if (!S || !actief) return
  audio()
  if (kies === type) { kies = null; werkWinkelBij(); toonUitleg(null); return }
  var d = TD.TORENS[type]
  if (S.goud < d.prijs) {
    var b = knoppen[type]; b.classList.remove('schud'); void b.offsetWidth; b.classList.add('schud')
    Geluid.fout()
    melding('Je hebt nog <b>' + (d.prijs - S.goud) + ' goud</b> nodig voor de ' + d.naam + '. Knal ballonnen om goud te verdienen!', null, 2600)
    return
  }
  gekozen = null; kies = type
  tekenPaneel(); toonUitleg(type)
}
function toonUitleg(type) {
  var u = $('uitleg')
  if (!type) { u.innerHTML = kies ? '' : 'Kies een toren en tik op een vrije plek naast het pad.'; if (kies) toonUitleg(kies); return }
  var d = TD.TORENS[type]
  u.innerHTML = '<b>' + d.naam + '</b> · ' + d.tekst + (d.zwak ? ' <span class="zwak">' + d.zwak + '</span>' : '')
}
toonUitleg(null)

// ── gekozen toren: info, upgrade, verkopen ──
function tekenPaneel() {
  $('shop').classList.toggle('verborgen', !!gekozen)
  $('info').classList.toggle('verborgen', !gekozen)
  $('uitleg').classList.toggle('verborgen', !!gekozen)
  if (gekozen) tekenInfo()
  werkWinkelBij()
}
function snelheidTekst(tik) { var n = 1 / tik; return (n >= 2 ? Math.round(n) : n.toFixed(1).replace('.', ',')) + ' per sec' }
function tekenInfo() {
  var t = gekozen, d = TD.TORENS[t.type], s = t.s, up = d.up[t.niveau], prijs = TD.upgradePrijs(t)
  var feiten = t.type === 'mijn' ? [['Goud per golf', s.goud]]
    : [['Bereik', s.bereik >= 50 ? 'hele kaart' : String(s.bereik).replace('.', ',') + ' vakjes'], [t.type === 'spijker' ? 'Nieuwe stapel' : 'Schoten', snelheidTekst(s.tik)], ['Schade', s.schade]]
  if (s.spijkers) feiten.push(['Spijkers per stapel', s.spijkers])
  if (s.doorboor) feiten.push(['Raakt per worp', s.doorboor])
  if (s.trek) feiten.push(['Trekt terug', String(s.trek).replace('.', ',') + ' vakjes'])
  if (s.inslagen) feiten.push(['Inslagen', s.inslagen])
  if (s.doelen > 1) feiten.push([t.type === 'vlam' ? 'Ballonnen' : t.type === 'pijler' ? 'Pijlen' : 'Tegelijk', s.doelen])
  if (s.keten) feiten.push(['Sprongen', s.keten])
  if (s.straal) feiten.push(['Ontploffing', String(s.straal).replace('.', ',') + ' vakjes'])
  if (s.vries) feiten.push(['Bevriest', String(s.vries).replace('.', ',') + ' sec'])
  feiten.push([t.type === 'mijn' ? 'Verdiend' : 'Geknald', t.knallen])
  var h = '<div class="rij1" style="--k:' + d.kleur + '"><canvas></canvas><div><div class="titel">' + d.naam + '</div><div class="pips">'
  for (var i = 0; i < 3; i++) h += '<i class="' + (i <= t.niveau ? 'aan' : '') + '"></i>'
  h += '</div></div><button class="sluit" id="sluitinfo" aria-label="Sluiten">✕</button></div>'
  feiten.forEach(function (f) { h += '<div class="feit"><span>' + f[0] + '</span><b' + (f[0] === 'Geknald' || f[0] === 'Verdiend' ? ' id="infoknallen"' : '') + '>' + f[1] + '</b></div>' })
  if (d.zwak) h += '<div class="feit"><span style="color:#ff9aa9">' + d.zwak + '</span></div>'
  h += up ? '<button id="upknop"' + (S.goud < prijs ? ' disabled' : '') + '>Upgrade · ' + prijs + ' goud<small>' + up.tekst + '</small></button>'
          : '<button id="upknop" disabled>Maximaal niveau</button>'
  h += '<button id="verkoopknop">Verkopen · +' + TD.verkoopWaarde(t) + ' goud</button>'
  var info = $('info')
  info.innerHTML = h
  info.style.setProperty('--k', d.kleur)
  icoon(info.querySelector('canvas'), t.type, t.niveau)
  $('sluitinfo').onclick = function () { gekozen = null; tekenPaneel() }
  $('upknop').onclick = function () {
    if (TD.upgrade(S, gekozen)) {
      Geluid.upgrade()
      ringen.push({ x: gekozen.x, y: gekozen.y, r0: 0.3, r1: 1.1, leef: 0.5, max: 0.5, kleur: d.kleur, lw: 3 })
      spat(gekozen.x, gekozen.y, d.kleur, 16, 3)
      tekenHud(); tekenInfo(); bewaarBeloning()
    }
  }
  $('verkoopknop').onclick = function () {
    var w = TD.verkoop(S, gekozen)
    Geluid.verkoop()
    tekst(gekozen.x, gekozen.y - 0.3, '+' + w, '#ffc83d')
    spat(gekozen.x, gekozen.y, d.kleur, 12, 2)
    gekozen = null; tekenHud(); tekenPaneel(); bewaarBeloning()
  }
}

// ── melding ──
var meldTimer = 0, meldRij = []
function melding(html, laag, ms) {
  meldRij.push({ html: html, laag: laag, ms: ms || 3000 })
  if (meldRij.length === 1) volgendeMelding()
}
function volgendeMelding() {
  var m = meldRij[0], el = $('melding')
  if (!m) { el.classList.remove('aan'); return }
  el.innerHTML = (m.laag ? '<canvas></canvas>' : '') + '<div>' + m.html + '</div>'
  if (m.laag) ballonIcoon(el.querySelector('canvas'), m.laag)
  el.classList.add('aan')
  clearTimeout(meldTimer)
  meldTimer = setTimeout(function () { meldRij.shift(); el.classList.remove('aan'); setTimeout(volgendeMelding, 260) }, m.ms)
}
function wisMeldingen() { meldRij = []; clearTimeout(meldTimer); $('melding').classList.remove('aan') }

// ── golven ──
function startGolf() {
  if (!S || !actief || S.actief) return
  audio()
  var r = TD.startGolf(S)
  if (!r) return
  Geluid.golf()
  autoOm = 0
  r.nieuw.forEach(function (laag) {
    if (laag === 'blimp') Geluid.baas()
    melding('<b>Nieuw: ' + TD.LAGEN[laag].naam + '</b> — ' + TD.NIEUW[laag], laag, 5500)
  })
  tekenHud()
}
$('startgolf').onclick = startGolf

// ── invoer op het veld ──
function tegel(e) {
  var x = (e.clientX - ox) / T, y = (e.clientY - oy) / T
  return { x: x, y: y, c: Math.floor(x), r: Math.floor(y), binnen: x >= 0 && y >= 0 && x < TD.COLS && y < TD.ROWS }
}
cv.addEventListener('pointermove', function (e) { muis = tegel(e) })
cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') muis = null })
cv.addEventListener('pointerdown', function (e) { muis = tegel(e); druk = true; audio() })
cv.addEventListener('pointerup', function (e) {
  if (!druk) return
  druk = false
  var p = tegel(e)
  if (e.pointerType !== 'mouse') muis = null
  if (!S || !actief || gepauzeerd || !p.binnen) { if (!p.binnen && !kies) { gekozen = null; tekenPaneel() } return }
  var bestaand = TD.torenOp(S, p.c, p.r)
  if (kies) {
    if (TD.kanBouwen(S, p.c, p.r)) {
      var d = TD.TORENS[kies]
      if (S.goud < d.prijs) { Geluid.fout(); kies = null; tekenPaneel(); return }
      var t = TD.bouw(S, kies, p.c, p.r)
      if (t) {
        Geluid.bouw()
        ringen.push({ x: t.x, y: t.y, r0: 0.2, r1: 0.9, leef: 0.4, max: 0.4, kleur: d.kleur, lw: 3 })
        spat(t.x, t.y, d.kleur, 10, 2)
        tekst(t.x, t.y - 0.4, '-' + d.prijs, '#ffc83d')
        kies = null; vorigeHud.actief = null; bewaarBeloning()
        toonUitleg(null); tekenHud(); tekenPaneel()
      }
    } else if (bestaand) { kies = null; gekozen = bestaand; tekenPaneel() }
    else {
      Geluid.fout()
      ringen.push({ x: p.c + 0.5, y: p.r + 0.5, r0: 0.2, r1: 0.5, leef: 0.3, max: 0.3, kleur: '#ff4f6a', lw: 2 })
    }
    return
  }
  gekozen = bestaand || null
  tekenPaneel()
})
cv.addEventListener('contextmenu', function (e) { e.preventDefault(); kies = null; gekozen = null; tekenPaneel(); toonUitleg(null) })
window.addEventListener('keydown', function (e) {
  if (!S || !actief) return
  if (e.key === 'Escape') { kies = null; gekozen = null; tekenPaneel(); toonUitleg(null) }
  else if (e.key === ' ') { e.preventDefault(); startGolf() }
  else if (/^[1-9]$/.test(e.key)) kiesToren(TD.VOLGORDE[+e.key - 1])
})

// ── effecten ──
function spat(x, y, kleur, n, kracht) {
  for (var i = 0; i < n && deeltjes.length < 500; i++) {
    var a = Math.random() * TAU, v = (0.6 + Math.random()) * (kracht || 2)
    deeltjes.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, leef: 0.35 + Math.random() * 0.3, max: 0.65, kleur: kleur, r: 0.04 + Math.random() * 0.04 })
  }
}
function tekst(x, y, t, kleur) { if (teksten.length < 40) teksten.push({ x: x, y: y, t: t, kleur: kleur, leef: 0.9, max: 0.9 }) }
function bliksem(x1, y1, x2, y2) {
  var pts = [{ x: x1, y: y1 }], n = Math.max(3, Math.round(Math.hypot(x2 - x1, y2 - y1) * 4))
  for (var i = 1; i < n; i++) {
    var f = i / n, nx = -(y2 - y1), ny = x2 - x1, l = Math.hypot(nx, ny) || 1, z = (Math.random() - 0.5) * 0.28
    pts.push({ x: x1 + (x2 - x1) * f + nx / l * z, y: y1 + (y2 - y1) * f + ny / l * z })
  }
  pts.push({ x: x2, y: y2 })
  return pts
}
var immuunMeld = {}
function verwerk(ev) {
  ev.forEach(function (e) {
    var t
    switch (e.type) {
      case 'knal':
        var kl = TD.LAGEN[e.laag].kleur
        spat(e.x, e.y, TD.LAGEN[e.laag].rand || kl, e.groot ? 30 : 7, e.groot ? 4 : 2.4)
        ringen.push({ x: e.x, y: e.y, r0: 0.12, r1: e.groot ? 1.6 : 0.5, leef: 0.25, max: 0.25, kleur: tint(kl, 0.3), lw: 2 })
        if (e.groot) { schud = Math.max(schud, 0.5); Geluid.boem() } else Geluid.knal()
        break
      case 'tik':
        spat(e.x, e.y, '#ffd08a', 3, 1.6); Geluid.ting()
        break
      case 'immuun':
        if (mag('immuunfx', 120)) { ringen.push({ x: e.x, y: e.y, r0: 0.25, r1: 0.42, leef: 0.25, max: 0.25, kleur: '#c9d3ff', lw: 1.5 }); Geluid.ting() }
        break
      case 'schot':
        torenFx[e.toren] = 1
        if (e.soort === 'pijler' || e.soort === 'boemerang') Geluid.pijl()
        if (e.soort === 'mortier' || e.soort === 'raket') Geluid.zap()
        break
      case 'boem':
        ringen.push({ x: e.x, y: e.y, r0: 0.1, r1: e.r, leef: 0.35, max: 0.35, kleur: '#ff9a4f', lw: 4, vul: true })
        spat(e.x, e.y, '#ffb36b', 14, 3)
        schud = Math.max(schud, 0.18)
        Geluid.boem()
        break
      case 'vries':
        ringen.push({ x: e.x, y: e.y, r0: 0.3, r1: e.r, leef: 0.45, max: 0.45, kleur: '#bff3ff', lw: 3, vul: true })
        torenFx[e.toren] = 1
        Geluid.vries()
        break
      case 'straal':
        lijnen.push({ x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, leef: 0.12, max: 0.12, kleur: '#ff4fd8', b: 0.09 })
        Geluid.laser()
        break
      case 'rail':
        lijnen.push({ x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, leef: 0.35, max: 0.35, kleur: '#8cff5a', b: 0.16 })
        spat(e.x2, e.y2, '#d6ff7a', 10, 3)
        torenFx[e.toren] = 1
        Geluid.rail()
        break
      case 'keten':
        for (var i = 1; i < e.pts.length; i++) lijnen.push({ pts: bliksem(e.pts[i - 1].x, e.pts[i - 1].y, e.pts[i].x, e.pts[i].y), leef: 0.2, max: 0.2, kleur: '#fff35a', b: 0.06 })
        Geluid.zap()
        break
      case 'zaag':
        torenFx[e.toren] = 1
        Geluid.zaag()
        break
      case 'vlam':
        for (var f = 0; f < 9 && deeltjes.length < 500; f++) {
          var va = e.hoek + (Math.random() - 0.5) * e.kegel * 1.8, vv = e.r * (2.2 + Math.random() * 1.6)
          deeltjes.push({ x: e.x + Math.cos(e.hoek) * 0.35, y: e.y + Math.sin(e.hoek) * 0.35, vx: Math.cos(va) * vv, vy: Math.sin(va) * vv, leef: 0.28, max: 0.3,
            kleur: Math.random() < 0.5 ? '#ffb020' : '#ff5533', r: 0.06 + Math.random() * 0.05 })
        }
        torenFx[e.toren] = 1
        Geluid.vlam()
        break
      case 'magneet':
        ringen.push({ x: e.x, y: e.y, r0: e.r, r1: 0.3, leef: 0.4, max: 0.4, kleur: '#4f8cff', lw: 3 })
        e.pts.forEach(function (q) { lijnen.push({ x1: e.x, y1: e.y, x2: q.x, y2: q.y, leef: 0.25, max: 0.25, kleur: '#4f8cff', b: 0.05 }) })
        torenFx[e.toren] = 1
        Geluid.magneet()
        break
      case 'inslag':
        lijnen.push({ pts: bliksem(e.x + (Math.random() - 0.5) * 0.6, e.y - 2.5, e.x, e.y), leef: 0.22, max: 0.22, kleur: '#f2f5ff', b: 0.08 })
        ringen.push({ x: e.x, y: e.y, r0: 0.1, r1: 0.5, leef: 0.25, max: 0.25, kleur: '#fff35a', lw: 2 })
        Geluid.donder()
        break
      case 'stapel':
        spat(e.x, e.y, '#2fe6b4', 5, 1.2)
        Geluid.ting()
        break
      case 'mijn':
        tekst(e.x, e.y - 0.45, '+' + e.n, '#ffc83d')
        spat(e.x, e.y, '#ffc83d', 14, 2.2)
        Geluid.munt()
        break
      case 'lek':
        kernFlits = 1; schud = Math.max(schud, 0.45)
        var kern = S.kaart.kern
        tekst(kern.c + 0.5, kern.r - 0.1, '-' + e.n + ' ♥', '#ff4f6a')
        Geluid.lek()
        break
      case 'golfklaar':
        Geluid.klaar()
        bewaarBeloning()
        if (!S.gewonnen) {
          melding('<b>Golf ' + e.golf + ' gehaald!</b> Bonus: +' + e.bonus + ' goud', null, 2400)
          if (D.auto) autoOm = 1.5
        }
        break
      case 'gewonnen':
        eindeOm = 1.4
        break
      case 'verloren':
        eindeOm = 1.2
        break
    }
  })
  // uitleg als een toren een ballon niet kan raken (één keer per soort per potje)
  ev.forEach(function (e) {
    if (e.type !== 'immuun') return
    S.vijanden.some(function (v) {
      if (Math.abs(v.x - e.x) > 0.01 || Math.abs(v.y - e.y) > 0.01) return false
      var laag = v.laag
      if (!immuunMeld[laag]) {
        immuunMeld[laag] = true
        var tip = { zwart: 'Je kanon doet niks tegen zwarte ballonnen — zet er een pijler, tesla of laser bij.',
                    wit: 'De vriezer kan witte ballonnen niet bevriezen — zet er een andere toren bij.',
                    lood: 'Pijlen ketsen af op lood! Bouw een kanon, tesla, laser of railgun.' }[laag]
        if (tip) melding(tip, laag, 4500)
      }
      return true
    })
  })
}

// ── tekenen ──
function tekenKern(k, t) {
  var x = px(k.kern.c + 0.5), y = py(k.kern.r + 0.5), s = T
  var puls = 0.5 + 0.5 * Math.sin(t * 2.6)
  ctx.save(); ctx.translate(x, y)
  ctx.globalCompositeOperation = 'lighter'
  var gs = s * (2 + puls * 0.4 + kernFlits)
  ctx.drawImage(gloedSprite(kernFlits > 0.05 ? '#ff4f6a' : k.kleur), -gs / 2, -gs / 2, gs, gs)
  ctx.globalCompositeOperation = 'source-over'
  ctx.rotate(t * 0.4)
  ctx.strokeStyle = k.kleur; ctx.lineWidth = Math.max(1.5, s * 0.05)
  ctx.beginPath()
  for (var i = 0; i < 6; i++) { var a = i / 6 * TAU; ctx.lineTo(Math.cos(a) * s * 0.46, Math.sin(a) * s * 0.46) }
  ctx.closePath(); ctx.stroke()
  ctx.rotate(-t * 0.9)
  var gr = ctx.createRadialGradient(0, -s * 0.08, 0, 0, 0, s * 0.32)
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, tint(k.kleur, 0.4)); gr.addColorStop(1, k.tweede)
  ctx.fillStyle = gr
  ctx.beginPath(); ctx.moveTo(0, -s * 0.34); ctx.lineTo(s * 0.24, 0); ctx.lineTo(0, s * 0.34); ctx.lineTo(-s * 0.24, 0); ctx.closePath(); ctx.fill()
  ctx.restore()
}
var VLOKKEN = (function () { var r = TD.rng(9), a = []; for (var i = 0; i < 80; i++) a.push({ x: r(), y: r(), v: 0.2 + r() * 0.5, z: 0.8 + r() * 1.8, w: r() * TAU }); return a })()
function tekenSfeerOnder(k, t) {
  var bl = blokken(k)
  if (k.thema === 'stad') {
    // knipperende antennelampjes op de daken
    bl.forEach(function (b) {
      if (b.h > 0.6) return
      var aan = Math.sin(t * 3 + b.h * 20) > 0.3
      ctx.fillStyle = aan ? '#ff4f6a' : 'rgba(255,79,106,0.25)'
      var ax = px(b.c + 0.5), ay = py(b.r + 0.5) + T * 0.4 - T * (0.45 + b.h * 0.5) - T * 0.3
      ctx.beginPath(); ctx.arc(ax, ay, Math.max(1.5, T * 0.05), 0, TAU); ctx.fill()
      if (aan) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(gloedSprite('#ff4f6a'), ax - T * 0.2, ay - T * 0.2, T * 0.4, T * 0.4); ctx.globalCompositeOperation = 'source-over' }
    })
  } else if (k.thema === 'lava') {
    // bubbels in de lavapoelen
    bl.forEach(function (b) {
      if (b.h >= 0.62) return
      for (var i = 0; i < 3; i++) {
        var f = (t * 0.55 + b.h * 7 + i * 0.37) % 1, bx = px(b.c + 0.5 + (hash(b.c, b.r, i + 20) - 0.5) * 0.4), by = py(b.r + 0.5 + (hash(b.c, b.r, i + 30) - 0.5) * 0.3)
        ctx.strokeStyle = 'rgba(255,240,160,' + (1 - f) * 0.9 + ')'; ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.arc(bx, by, T * 0.03 + f * T * 0.09, 0, TAU); ctx.stroke()
      }
    })
  } else if (k.thema === 'nevel') {
    for (var i = 0; i < 28; i++) {
      var a = 0.5 + 0.5 * Math.sin(t * (1.2 + hash(i, 1) * 2) + i)
      ctx.fillStyle = 'rgba(255,255,255,' + a * 0.8 + ')'
      var sx = ox + hash(i, 2) * FW, sy = oy + hash(i, 3) * FH, z = 1 + a * 1.5
      ctx.fillRect(sx - z / 2, sy - z / 2, z, z)
    }
  } else if (k.thema === 'gat') {
    // draaiende armen rond de kern
    var kx = px(k.kern.c + 0.5), ky = py(k.kern.r + 0.5)
    ctx.save(); ctx.lineCap = 'round'
    for (var arm = 0; arm < 3; arm++) {
      for (var j = 0; j < 14; j++) {
        var rr = T * (0.9 + j * 0.28), hoek = -t * (1.4 - j * 0.06) + arm * TAU / 3 + j * 0.32
        ctx.strokeStyle = rgba(j % 2 ? k.tweede : k.kleur, 0.28 * (1 - j / 14))
        ctx.lineWidth = Math.max(1.5, T * 0.06)
        ctx.beginPath(); ctx.arc(kx, ky, rr, hoek, hoek + 0.45); ctx.stroke()
      }
    }
    ctx.restore()
  }
  // looplichtjes langs de randen van het pad
  ctx.fillStyle = k.kleur
  k.routes.forEach(function (route) {
    for (var d = 0.5; d < route.len - 0.4; d += 1) {
      var a = TD.opRoute(route, d), b = TD.opRoute(route, d + 0.05)
      if (a.x < 0.2 || a.y < 0.2 || a.x > TD.COLS - 0.2 || a.y > TD.ROWS - 0.2) continue
      var dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l * 0.5, ny = dx / l * 0.5
      var hel = Math.max(0, Math.sin(t * 4 - d * 0.7))
      ctx.globalAlpha = 0.25 + hel * 0.75
      var z = Math.max(1.5, T * 0.06)
      ctx.fillRect(px(a.x + nx) - z / 2, py(a.y + ny) - z / 2, z, z)
      ctx.fillRect(px(a.x - nx) - z / 2, py(a.y - ny) - z / 2, z, z)
    }
  })
  ctx.globalAlpha = 1
}
function tekenSfeerBoven(k, t) {
  if (k.thema !== 'ijs') return
  ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, FW, FH); ctx.clip()
  ctx.fillStyle = 'rgba(235,248,255,0.55)'
  VLOKKEN.forEach(function (v) {
    var y = ((v.y + t * v.v * 0.06) % 1) * FH, x = ((v.x + Math.sin(t * 0.8 + v.w) * 0.01) % 1) * FW
    ctx.beginPath(); ctx.arc(ox + x, oy + y, v.z, 0, TAU); ctx.fill()
  })
  ctx.restore()
}
function tekenPijltjes(k, t) {
  ctx.save()
  ctx.strokeStyle = rgba(k.kleur, 0.35); ctx.lineWidth = Math.max(1.5, T * 0.06); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  k.routes.forEach(function (route) {
    for (var d = (t * 0.9) % 1.5; d < route.len - 0.6; d += 1.5) {
      var a = TD.opRoute(route, d), b = TD.opRoute(route, d + 0.05)
      if (a.x < 0 || a.y < 0 || a.x > TD.COLS || a.y > TD.ROWS) continue
      var h = Math.atan2(b.y - a.y, b.x - a.x)
      ctx.save(); ctx.translate(px(a.x), py(a.y)); ctx.rotate(h)
      ctx.beginPath(); ctx.moveTo(-T * 0.08, -T * 0.12); ctx.lineTo(T * 0.06, 0); ctx.lineTo(-T * 0.08, T * 0.12); ctx.stroke()
      ctx.restore()
    }
  })
  ctx.restore()
}
function tekenBallon(e, t) {
  var d = TD.LAGEN[e.laag], x = px(e.x), y = py(e.y) + Math.sin(t * 3 + e.id) * T * 0.03
  if (d.groot) return tekenBlimp(e, t)
  var r = ballonStraal(e.laag)
  // touwtje
  ctx.strokeStyle = 'rgba(220,225,255,0.35)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(x, y + r * 1.05)
  ctx.quadraticCurveTo(x + Math.sin(t * 4 + e.id) * r * 0.4, y + r * 1.4, x, y + r * 1.75); ctx.stroke()
  var sp = ballonSprite(e.laag, e.vries > 0), w = sp.width / dpr
  ctx.drawImage(sp, x - w / 2, y - w / 2, w, w)
  if (e.laag === 'pantser') {
    var schade = 1 - e.hp / TD.hpVan('pantser', L)
    if (schade > 0.15) {
      ctx.strokeStyle = 'rgba(40,10,0,0.8)'; ctx.lineWidth = Math.max(1, T * 0.03)
      ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.6); ctx.lineTo(x - r * 0.1, y - r * 0.1); ctx.lineTo(x - r * 0.35, y + r * 0.3)
      if (schade > 0.5) { ctx.moveTo(x + r * 0.55, y - r * 0.3); ctx.lineTo(x + r * 0.15, y + r * 0.05); ctx.lineTo(x + r * 0.4, y + r * 0.55) }
      ctx.stroke()
    }
  }
  if (e.traag > 0 && e.vries <= 0) { ctx.fillStyle = 'rgba(160,230,255,0.25)'; ctx.beginPath(); ctx.arc(x, y, r * 1.1, 0, TAU); ctx.fill() }
}
function tekenBlimp(e, t) {
  var route = S.kaart.routes[e.route], a = TD.opRoute(route, e.d), b = TD.opRoute(route, e.d + 0.1)
  var h = Math.atan2(b.y - a.y, b.x - a.x), x = px(e.x), y = py(e.y), l = T * 0.85, w = T * 0.36, kl = TD.LAGEN.blimp.kleur
  ctx.save(); ctx.translate(x, y)
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6
  ctx.drawImage(gloedSprite(kl), -T * 1.3, -T * 1.3, T * 2.6, T * 2.6)
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
  ctx.rotate(h)
  // vinnen
  ctx.fillStyle = '#2b3590'
  ;[-1, 1].forEach(function (z) { ctx.beginPath(); ctx.moveTo(-l * 0.6, 0); ctx.lineTo(-l * 1.05, z * w * 1.25); ctx.lineTo(-l * 0.85, 0); ctx.closePath(); ctx.fill() })
  var gr = ctx.createLinearGradient(0, -w, 0, w)
  gr.addColorStop(0, '#a9b6ff'); gr.addColorStop(0.45, kl); gr.addColorStop(1, '#1f2a7a')
  ctx.fillStyle = gr
  ctx.beginPath(); ctx.ellipse(0, 0, l, w, 0, 0, TAU); ctx.fill()
  ctx.strokeStyle = '#d9e0ff'; ctx.lineWidth = Math.max(1, T * 0.03); ctx.stroke()
  ctx.strokeStyle = 'rgba(20,24,80,0.5)'
  ctx.beginPath(); ctx.moveTo(-l * 0.3, -w * 0.95); ctx.lineTo(-l * 0.3, w * 0.95); ctx.moveTo(l * 0.3, -w * 0.95); ctx.lineTo(l * 0.3, w * 0.95); ctx.stroke()
  ctx.fillStyle = '#fff35a'
  for (var i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * l * 0.3 + l * 0.15, 0, T * 0.045, 0, TAU); ctx.fill() }
  if (e.vries > 0) { ctx.fillStyle = 'rgba(190,240,255,0.4)'; ctx.beginPath(); ctx.ellipse(0, 0, l * 1.05, w * 1.15, 0, 0, TAU); ctx.fill() }
  ctx.restore()
  // levensbalk
  var max = TD.hpVan('blimp', L), f = Math.max(0, e.hp / max), bw = T * 1.3
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - bw / 2, y - T * 0.75, bw, T * 0.1)
  ctx.fillStyle = f > 0.5 ? '#8cff5a' : f > 0.25 ? '#ffc83d' : '#ff4f6a'; ctx.fillRect(x - bw / 2, y - T * 0.75, bw * f, T * 0.1)
}
function tekenBereik(x, y, r, kleur, ok) {
  ctx.save()
  ctx.fillStyle = rgba(ok ? kleur : '#ff4f6a', 0.1); ctx.strokeStyle = rgba(ok ? kleur : '#ff4f6a', 0.7)
  ctx.lineWidth = 1.5; ctx.setLineDash([6, 5])
  ctx.beginPath(); ctx.arc(px(x), py(y), r * T, 0, TAU); ctx.fill(); ctx.stroke()
  ctx.restore()
}

function teken(dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(laag, 0, 0)
  if (!S) return
  var k = S.kaart
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  var sx = 0, sy = 0
  if (schud > 0) { sx = (Math.random() - 0.5) * schud * T * 0.3; sy = (Math.random() - 0.5) * schud * T * 0.3 }
  ctx.translate(sx, sy)

  tekenSfeerOnder(k, tijd)
  tekenPijltjes(k, tijd)

  // vakje onder de muis / plaatsing
  var toonGhost = kies && muis && muis.binnen
  if (muis && muis.binnen && !kies) {
    var over = TD.torenOp(S, muis.c, muis.r)
    if (over && over !== gekozen) tekenBereik(over.x, over.y, Math.min(over.s.bereik, 30), TD.TORENS[over.type].kleur, true)
  }
  if (gekozen) {
    var gb = gekozen.s.bereik
    if (gb < 50) tekenBereik(gekozen.x, gekozen.y, gb, TD.TORENS[gekozen.type].kleur, true)
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2
    rondRect(ctx, px(gekozen.c) + 2, py(gekozen.r) + 2, T - 4, T - 4, T * 0.2); ctx.stroke()
  }

  tekenKern(k, tijd)

  // torens
  S.torens.forEach(function (t) {
    var fx = torenFx[t.id] || 0
    if (t.toonHoek === undefined) t.toonHoek = t.hoek
    var dh = ((t.hoek - t.toonHoek + Math.PI * 3) % TAU) - Math.PI
    t.toonHoek += dh * Math.min(1, dt * 14)
    tekenToren(ctx, t.type, t.niveau, px(t.x), py(t.y), T, t.toonHoek, tijd + t.id, fx, t.wacht <= 0.1)
    if (fx) torenFx[t.id] = Math.max(0, fx - dt * 6)
  })

  // ballonnen (blimps eerst, de kleintjes erboven)
  S.vijanden.forEach(function (e) { if (TD.LAGEN[e.laag].groot) tekenBallon(e, tijd) })
  S.vijanden.forEach(function (e) { if (!TD.LAGEN[e.laag].groot) tekenBallon(e, tijd) })

  // spijkerstapels op het pad
  S.stapels.forEach(function (st) {
    var n = Math.min(5, Math.ceil(st.n / st.max * 5)), kl = st.soort === 'vuur' ? '#ffb36b' : '#2fe6b4'
    for (var i = 0; i < n; i++) {
      var a = i / 5 * TAU + st.id, rr = i ? T * 0.13 : 0
      tekenSpijkerster(ctx, px(st.x) + Math.cos(a) * rr, py(st.y) + Math.sin(a) * rr, T * 0.1, kl)
    }
  })

  // kogels
  S.kogels.forEach(function (q) {
    var x = px(q.x), y = py(q.y)
    if (q.type === 'mortier') {
      // granaat met een boog: schaduw op de grond, bol in de lucht
      var tot = Math.hypot(q.tx - q.sx, q.ty - q.sy) || 1, f = Math.min(1, Math.hypot(q.x - q.sx, q.y - q.sy) / tot), hoogte = Math.sin(f * Math.PI) * T * 0.9
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y, T * 0.1, T * 0.06, 0, 0, TAU); ctx.fill()
      ctx.globalCompositeOperation = 'lighter'
      ctx.drawImage(gloedSprite('#ffd38a'), x - T * 0.3, y - hoogte - T * 0.3, T * 0.6, T * 0.6)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#fff1cf'; ctx.beginPath(); ctx.arc(x, y - hoogte, T * 0.09, 0, TAU); ctx.fill()
    } else if (q.type === 'raket') {
      var hr = Math.atan2(q.ty - q.y, q.tx - q.x)
      if (Math.random() < 0.6 && deeltjes.length < 500) deeltjes.push({ x: q.x, y: q.y, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, leef: 0.4, max: 0.5, kleur: '#8a8fb0', r: 0.05 })
      ctx.save(); ctx.translate(x, y); ctx.rotate(hr)
      ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(gloedSprite('#ff8fab'), -T * 0.45, -T * 0.2, T * 0.4, T * 0.4); ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#f2f5ff'; rondRect(ctx, -T * 0.16, -T * 0.05, T * 0.26, T * 0.1, T * 0.04); ctx.fill()
      ctx.fillStyle = '#ff8fab'; ctx.beginPath(); ctx.moveTo(T * 0.1, -T * 0.05); ctx.lineTo(T * 0.2, 0); ctx.lineTo(T * 0.1, T * 0.05); ctx.closePath(); ctx.fill()
      ctx.restore()
    } else if (q.type === 'kanon') {
      ctx.fillStyle = '#ffb36b'; ctx.globalCompositeOperation = 'lighter'
      ctx.drawImage(gloedSprite('#ff7a2f'), x - T * 0.35, y - T * 0.35, T * 0.7, T * 0.7)
      ctx.globalCompositeOperation = 'source-over'
      ctx.beginPath(); ctx.arc(x, y, T * 0.1, 0, TAU); ctx.fillStyle = '#ffd9b0'; ctx.fill()
    } else {
      var h = Math.atan2(q.ty - q.y, q.tx - q.x)
      ctx.save(); ctx.translate(x, y); ctx.rotate(h)
      ctx.strokeStyle = '#3ef0ff'; ctx.lineWidth = Math.max(1.5, T * 0.06); ctx.lineCap = 'round'
      ctx.shadowColor = '#3ef0ff'; ctx.shadowBlur = T * 0.25
      ctx.beginPath(); ctx.moveTo(-T * 0.22, 0); ctx.lineTo(T * 0.06, 0); ctx.stroke()
      ctx.restore()
    }
  })

  // boemerangs
  S.boemerangs.forEach(function (b) {
    ctx.save(); ctx.translate(px(b.x), py(b.y)); ctx.rotate(tijd * 18 + b.id)
    tekenBoemerang(ctx, T * 0.55, '#d4ff3a')
    ctx.restore()
  })

  // lijnen: laser, railgun, bliksem
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  lijnen.forEach(function (l) {
    var f = l.leef / l.max
    ctx.strokeStyle = rgba(l.kleur, 0.9 * f); ctx.lineWidth = Math.max(1.5, T * l.b * (0.5 + f))
    ctx.shadowColor = l.kleur; ctx.shadowBlur = T * 0.3
    ctx.beginPath()
    if (l.pts) l.pts.forEach(function (p, i) { if (i) ctx.lineTo(px(p.x), py(p.y)); else ctx.moveTo(px(p.x), py(p.y)) })
    else { ctx.moveTo(px(l.x1), py(l.y1)); ctx.lineTo(px(l.x2), py(l.y2)) }
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,' + 0.8 * f + ')'; ctx.lineWidth = Math.max(1, T * l.b * 0.3); ctx.shadowBlur = 0
    ctx.stroke()
  })
  ctx.restore()

  // ringen
  ringen.forEach(function (q) {
    var f = 1 - q.leef / q.max, r = (q.r0 + (q.r1 - q.r0) * (1 - Math.pow(1 - f, 2))) * T
    ctx.globalAlpha = 1 - f
    if (q.vul) { ctx.fillStyle = rgba(q.kleur, 0.18); ctx.beginPath(); ctx.arc(px(q.x), py(q.y), r, 0, TAU); ctx.fill() }
    ctx.strokeStyle = q.kleur; ctx.lineWidth = q.lw
    ctx.beginPath(); ctx.arc(px(q.x), py(q.y), r, 0, TAU); ctx.stroke()
  })
  ctx.globalAlpha = 1

  // deeltjes
  ctx.globalCompositeOperation = 'lighter'
  deeltjes.forEach(function (p) {
    ctx.globalAlpha = Math.min(1, p.leef / p.max * 1.4)
    ctx.fillStyle = p.kleur
    var r = p.r * T
    ctx.fillRect(px(p.x) - r, py(p.y) - r, r * 2, r * 2)
  })
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'

  // plaatsen: spookbeeld
  if (toonGhost) {
    var ok = TD.kanBouwen(S, muis.c, muis.r) && S.goud >= TD.TORENS[kies].prijs
    var gx = muis.c + 0.5, gy = muis.r + 0.5
    tekenBereik(gx, gy, Math.min(TD.TORENS[kies].bereik, 30), TD.TORENS[kies].kleur, ok)
    ctx.globalAlpha = ok ? 0.8 : 0.4
    tekenToren(ctx, kies, 0, px(gx), py(gy), T, -Math.PI / 2, tijd, 0, true)
    ctx.globalAlpha = 1
    if (!ok) {
      ctx.strokeStyle = '#ff4f6a'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(px(gx) - T * 0.25, py(gy) - T * 0.25); ctx.lineTo(px(gx) + T * 0.25, py(gy) + T * 0.25)
      ctx.moveTo(px(gx) + T * 0.25, py(gy) - T * 0.25); ctx.lineTo(px(gx) - T * 0.25, py(gy) + T * 0.25); ctx.stroke()
    }
  }

  tekenSfeerBoven(k, tijd)

  // zwevende teksten
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = Math.round(Math.max(12, T * 0.38)) + "px 'Russo One',system-ui,sans-serif"
  teksten.forEach(function (q) {
    var f = q.leef / q.max
    ctx.globalAlpha = Math.min(1, f * 2)
    ctx.fillStyle = q.kleur
    ctx.fillText(q.t, px(q.x), py(q.y) - (1 - f) * T * 0.8)
  })
  ctx.globalAlpha = 1

  // rode flits bij een lek
  if (kernFlits > 0) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = 'rgba(255,40,80,' + kernFlits * 0.12 + ')'; ctx.fillRect(0, 0, W, H)
  }
}

function werkEffectenBij(dt) {
  deeltjes = deeltjes.filter(function (p) { p.leef -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; return p.leef > 0 })
  ringen = ringen.filter(function (q) { q.leef -= dt; return q.leef > 0 })
  lijnen = lijnen.filter(function (q) { q.leef -= dt; return q.leef > 0 })
  teksten = teksten.filter(function (q) { q.leef -= dt; return q.leef > 0 })
  schud = Math.max(0, schud - dt * 2.5)
  kernFlits = Math.max(0, kernFlits - dt * 2.2)
}

// ── lus ──
var vorige = performance.now()
function frame(nu) {
  var dt = Math.min(0.1, (nu - vorige) / 1000); vorige = nu
  tijd += dt
  if (S && actief && !gepauzeerd) {
    acc += dt * D.snel
    var stap = 1 / 60, n = 0
    while (acc >= stap && n < 12) { verwerk(TD.stap(S, stap)); acc -= stap; n++ }
    if (n >= 12) acc = 0
    werkEffectenBij(dt * Math.min(D.snel, 2))
    if (autoOm > 0) { autoOm -= dt; if (autoOm <= 0 && !S.actief && !S.gewonnen && !S.verloren) startGolf() }
    if (eindeOm > 0) { eindeOm -= dt; if (eindeOm <= 0) einde() }
    if (BELONING && actief && !eindeOm && !S.gewonnen && !S.verloren) {
      speeltijd -= dt; tekenTijd()
      bewaarOm -= dt; if (bewaarOm <= 0) { bewaarOm = 1; bewaarBeloning() }
      if (speeltijd <= 0) tijdIsOp()
    }
    if (S) tekenHud()
  }
  teken(dt)
  requestAnimationFrame(frame)
}

// ── schermen ──
function toonScherm(id) {
  ['menu', 'pauzescherm', 'einde'].forEach(function (s) { $(s).classList.toggle('aan', s === id) })
  var inSpel = !id
  $('paneel').classList.toggle('verborgen', !inSpel)
  ;['golfpil', 'levenspil', 'goudpil', 'snel', 'pauze'].forEach(function (s) { $(s).classList.toggle('verborgen', !inSpel) })
  $('tijdpil').classList.toggle('verborgen', !inSpel || !BELONING)
  $('terug').classList.toggle('verborgen', BELONING)
  $('terug').textContent = inSpel ? '‹ Terug' : '‹ Menu'
  if (id) wisMeldingen()
}
$('pauze').onclick = function () { if (!S || !actief) return; gepauzeerd = true; toonScherm('pauzescherm') }
$('hervat').onclick = function () { gepauzeerd = false; toonScherm(null) }
$('opnieuw2').onclick = function () { startLevel(L) }
$('stop').onclick = function () { actief = false; S = null; toonMenu() }
document.addEventListener('visibilitychange', function () {
  if (document.hidden && S && actief && !gepauzeerd) { gepauzeerd = true; toonScherm('pauzescherm') }
})

function sterSvg(aan, n) { var h = ''; for (var i = 0; i < 3; i++) h += '<svg class="' + (i < aan ? '' : 'leeg') + '"><use href="#ster"/></svg>'; return h }
function tijdIsOp() {
  tijdOp = true; bewaarBeloning(); einde()
  setTimeout(function () { parent.postMessage({ type: 'towerdefense-gameover' }, '*') }, 1200)
}
function einde() {
  actief = false
  var gewonnen = S.gewonnen, st = TD.sterren(S), ontgrendeld = ''
  if (BELONING && !tijdOp) wisBeloning()
  if (gewonnen) {
    D.sterren[L] = Math.max(D.sterren[L] || 0, st)
    if (L === D.open && D.open < TD.KAARTEN.length - 1) { D.open++; ontgrendeld = 'Nieuw level: ' + TD.KAARTEN[D.open].naam }
    bewaar()
  }
  if (gewonnen || tijdOp) Geluid.win(); else Geluid.verlies()
  $('eindtitel').textContent = tijdOp ? 'Tijd is op! Volgende keer ga je precies verder.'
    : gewonnen ? (L === TD.KAARTEN.length - 1 ? 'Alles gehaald!' : 'Level gehaald!')
    : 'Je kern is kapot!'
  $('eindsterren').innerHTML = sterSvg(st)
  $('eindsterren').classList.toggle('verborgen', !gewonnen)
  $('ontgrendeld').textContent = ontgrendeld
  $('ontgrendeld').classList.toggle('verborgen', !ontgrendeld)
  $('st-golf').textContent = (gewonnen || (tijdOp && !S.actief) ? S.golf : S.golf - 1) + '/' + S.maxGolf
  $('st-knal').textContent = S.geknald
  $('st-levens').textContent = S.levens
  $('volgende').classList.toggle('verborgen', BELONING || !gewonnen || L >= TD.KAARTEN.length - 1)
  $('opnieuw').classList.toggle('verborgen', BELONING)
  $('naarmenu').classList.toggle('verborgen', BELONING)
  $('klaar').classList.toggle('verborgen', !BELONING)
  toonScherm('einde')
}
$('volgende').onclick = function () { startLevel(L + 1) }
$('opnieuw').onclick = function () { startLevel(L) }
$('naarmenu').onclick = function () { S = null; toonMenu() }
$('klaar').onclick = function () { parent.postMessage({ type: 'towerdefense-gameover' }, '*') }

// ── menu ──
function miniKaart(canvas, nr) {
  var k = TD.kaart(nr), w = canvas.clientWidth || 180, h = w * TD.ROWS / TD.COLS, r = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.round(w * r); canvas.height = Math.round(h * r)
  var g = canvas.getContext('2d'), t = w / TD.COLS
  g.setTransform(r, 0, 0, r, 0, 0)
  g.fillStyle = '#090b22'; g.fillRect(0, 0, w, h)
  var gr = g.createRadialGradient(w * 0.3, 0, 0, w * 0.3, 0, w)
  gr.addColorStop(0, rgba(k.kleur, 0.18)); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h)
  g.lineJoin = 'round'
  ;[[t * 0.95, rgba(k.kleur, 0.9), 8], [t * 0.7, '#0a0c26', 0]].forEach(function (laag) {
    g.save(); g.strokeStyle = laag[1]; g.lineWidth = laag[0]
    if (laag[2]) { g.shadowColor = k.kleur; g.shadowBlur = laag[2] }
    k.routes.forEach(function (route) { g.beginPath(); route.pts.forEach(function (p, i) { if (i) g.lineTo(p.x * t, p.y * t); else g.moveTo(p.x * t, p.y * t) }); g.stroke() })
    g.restore()
  })
  Object.keys(k.blok).forEach(function (s) { var cr = s.split(',').map(Number); tekenKristal(g, (cr[0] + 0.5) * t, (cr[1] + 0.5) * t, t * 1.1, k.tweede, 0) })
  g.save(); g.translate((k.kern.c + 0.5) * t, (k.kern.r + 0.5) * t); g.shadowColor = k.kleur; g.shadowBlur = 10
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -t * 0.4); g.lineTo(t * 0.28, 0); g.lineTo(0, t * 0.4); g.lineTo(-t * 0.28, 0); g.closePath(); g.fill(); g.restore()
}
function toonMenu() {
  actief = false; S = null
  kies = null; gekozen = null
  $('menutekst').textContent = BELONING
    ? 'Je mag 1 minuut spelen, daarna ga je weer oefenen. De volgende keer ga je precies verder waar je was.'
    : 'Bouw torens langs het pad en knal alle ballonnen kapot voordat ze je kern bereiken. Elk level heeft ' + TD.GOLVEN + ' golven.'
  var box = $('levels'); box.innerHTML = ''
  var verder = BELONING ? leesBeloning() : null
  if (verder) $('menutekst').textContent = 'Je mag 1 minuut spelen. Ga verder waar je was, of begin opnieuw met een level.'
  TD.KAARTEN.forEach(function (def, i) {
    var open = i <= D.open, b = document.createElement('button'), hier = verder && verder.L === i
    b.className = 'lvkaart'; b.disabled = !open; b.style.setProperty('--k', def.kleur)
    b.innerHTML = '<canvas></canvas><span class="nr">Level ' + (i + 1) + '</span><span class="nm">' + def.naam + '</span>' +
      '<span class="zin">' + def.zin + '</span><span class="st">' + sterSvg(D.sterren[i] || 0) + '</span>' +
      (open ? '' : '<span class="slot"><svg><use href="#slot"/></svg>Haal eerst level ' + i + '</span>') +
      (hier ? '<span class="verder">Verder bij golf ' + (verder.golf + 1) + '</span>' : '')
    if (hier) b.classList.add('bewaard')
    b.onclick = function () { audio(); startLevel(i, hier ? verder : null) }
    box.appendChild(b)
    requestAnimationFrame(function () { miniKaart(b.querySelector('canvas'), i) })
  })
  var hoe = $('hoe'); hoe.innerHTML = ''
  ;[['pijler', '<b>Elke knal = 1 goud.</b> Na elke golf krijg je bonusgoud. Tik op een toren om hem te upgraden.'],
    ['zwart', '<b>Zwart</b> kan tegen ontploffingen: het kanon doet niks.'],
    ['wit', '<b>Wit</b> bevriest niet: de vriezer doet niks.'],
    ['lood', '<b>Lood</b>: pijlen ketsen af. Gebruik kanon, laser, tesla of railgun.']].forEach(function (r) {
    var d = document.createElement('div'); d.className = 'hoe'
    d.innerHTML = '<canvas></canvas><div>' + r[1] + '</div>'
    hoe.appendChild(d)
    requestAnimationFrame(function () { if (TD.TORENS[r[0]]) icoon(d.querySelector('canvas'), r[0], 0); else ballonIcoon(d.querySelector('canvas'), r[0]) })
  })
  toonScherm('menu')
  L = Math.min(D.open, TD.KAARTEN.length - 1)
  meet()
}

// test-hook (alleen lezen): spelstaat en waar het veld op het scherm staat
window.__td = { staat: function () { return S }, veld: function () { return { ox: ox, oy: oy, T: T } } }

meet()
iconenTekenen()
toonMenu()
requestAnimationFrame(frame)
})()
