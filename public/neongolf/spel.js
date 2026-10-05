// Neongolf — scherm, besturing, effecten, menu en winkel. Holes + physics staan in kern.js.
(function () {
'use strict'
var $ = function (id) { return document.getElementById(id) }
var cv = $('c'), ctx = cv.getContext('2d')
var laag = document.createElement('canvas'), lctx = laag.getContext('2d')   // vaste baan (één keer getekend)

// ── inbedding ──
var params = new URLSearchParams(location.search)
var BELONING = !params.has('terug')
if (!BELONING) {
  $('terug').classList.add('aan')
  $('terug').onclick = function () { parent.postMessage({ type: 'neongolf-terug' }, '*') }
}

// ── opslag (kk_-prefix ⇒ synct mee naar het account) ──
var OPSLAG = 'kk_ng'
var D = (function () {
  var d = {}
  try { d = JSON.parse(localStorage.getItem(OPSLAG) || '{}') || {} } catch (e) {}
  return { munten: d.munten || 0, sterren: d.sterren || {}, slagen: d.slagen || {}, hio: d.hio || {},
    bezit: d.bezit || { bal: ['wit'], spoor: ['geen'] }, keuze: d.keuze || { bal: 'wit', spoor: 'geen' },
    geluid: d.geluid !== false, uitleg: !!d.uitleg }
})()
function bewaar() { try { localStorage.setItem(OPSLAG, JSON.stringify(D)) } catch (e) {} }
function gespeeld(i) { return D.sterren[i] != null }
function open(i) { return i === 0 || gespeeld(i - 1) }

// ── winkel-items ──
var BALLEN = [
  { id: 'wit', naam: 'Klassiek', prijs: 0 },
  { id: 'roze', naam: 'Neonroze', prijs: 60, kleur: '#ff4fa3' },
  { id: 'lime', naam: 'Limoen', prijs: 60, kleur: '#8cff5a' },
  { id: 'streep', naam: 'Gestreept', prijs: 150 },
  { id: 'planeet', naam: 'Planeet', prijs: 250 },
  { id: 'vuur', naam: 'Vuurbal', prijs: 400 },
  { id: 'disco', naam: 'Discobal', prijs: 550 },
  { id: 'regenboog', naam: 'Regenboog', prijs: 800 },
]
var SPOREN = [
  { id: 'geen', naam: 'Geen spoor', prijs: 0 },
  { id: 'komeet', naam: 'Komeet', prijs: 80 },
  { id: 'vonken', naam: 'Vonken', prijs: 200 },
  { id: 'pixels', naam: 'Pixels', prijs: 300 },
  { id: 'regenboog', naam: 'Regenboog', prijs: 450 },
  { id: 'sterren', naam: 'Sterren', prijs: 650 },
]

// ── geluid ──
var AC = null
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)() } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC }
function toon(f, dur, type, vol, delay, f2) {
  if (!D.geluid) return
  var a = audio(); if (!a) return
  var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain()
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur)
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02)
}
var laatsteTik = 0
var Geluid = {
  slag: function (k) { toon(900, 0.07, 'triangle', 0.08 + k * 0.1, 0, 260) },
  muur: function (k) { var nu = performance.now(); if (nu - laatsteTik < 45) return; laatsteTik = nu; toon(420 + Math.random() * 60, 0.05, 'square', Math.min(0.07, 0.01 + k / 9000)) },
  bumper: function () { toon(320, 0.18, 'sine', 0.12, 0, 720) },
  portaal: function () { toon(220, 0.3, 'sine', 0.08, 0, 1400) },
  gat: function () { toon(520, 0.16, 'sine', 0.14, 0, 160); [523, 659, 784, 1047].forEach(function (f, i) { toon(f, 0.22, 'triangle', 0.07, 0.18 + i * 0.08) }) },
  water: function () { toon(180, 0.4, 'sawtooth', 0.05, 0, 60); toon(90, 0.3, 'sine', 0.1, 0.02, 50) },
  op: function () { [392, 330, 262].forEach(function (f, i) { toon(f, 0.24, 'triangle', 0.08, i * 0.12) }) },
}
function tekenGeluidKnop() { $('golfje').style.display = D.geluid ? '' : 'none'; $('geluid').style.opacity = D.geluid ? 1 : 0.6 }
$('geluid').onclick = function () { D.geluid = !D.geluid; bewaar(); tekenGeluidKnop() }

// ── beeld: wereld → scherm (liggend, of 90° gedraaid op een staand scherm) ──
var dpr = 1, W = 0, H = 0, s = 1, rot = false, ox = 0, oy = 0, M = [1, 0, 0, 1, 0, 0], kader = { x: 0, y: 0, w: 1000, h: 600 }
function meet() {
  dpr = Math.min(2, window.devicePixelRatio || 1)
  W = innerWidth; H = innerHeight
  cv.width = laag.width = Math.floor(W * dpr); cv.height = laag.height = Math.floor(H * dpr)
  if (h) {
    var top = W <= 560 ? 108 : 62, marge = 12, aw = W - marge * 2, ah = H - top - 40
    var s1 = Math.min(aw / kader.w, ah / kader.h), s2 = Math.min(aw / kader.h, ah / kader.w)
    rot = s2 > s1 * 1.1
    s = rot ? s2 : s1
    if (!rot) { ox = (W - kader.w * s) / 2; oy = top + (ah - kader.h * s) / 2; M = [s, 0, 0, s, ox - kader.x * s, oy - kader.y * s] }
    else { ox = (W - kader.h * s) / 2; oy = top + (ah - kader.w * s) / 2; M = [0, s, -s, 0, ox + (kader.y + kader.h) * s, oy - kader.x * s] }
    tekenBaan()
  }
}
window.addEventListener('resize', meet)
function naarWereld(sx, sy) {
  if (!rot) return [(sx - ox) / s + kader.x, (sy - oy) / s + kader.y]
  return [(sy - oy) / s + kader.x, kader.y + kader.h - (sx - ox) / s]
}
function naarScherm(x, y) { return [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]] }
function wereld(g) { g.setTransform(dpr * M[0], dpr * M[1], dpr * M[2], dpr * M[3], dpr * M[4], dpr * M[5]) }
function scherm(g) { g.setTransform(dpr, 0, 0, dpr, 0, 0) }

// ── kleur-helpers ──
function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] }
function rgba(c, a) { var x = hex(c); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + a + ')' }
function pad(g, p) { g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (var i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.closePath() }
function baanVan(i) { var b = NG.BANEN[0]; NG.BANEN.forEach(function (x) { if (i >= x.van) b = x }); return b }

// ── spelstaat ──
var hi = 0, h = null, bal = null, slagen = 0, vorige = null, fase = 'menu', mik = null
var acc = 0, laatst = performance.now(), zinkT = 0, waterT = 0
var spoor = [], deeltjes = [], teksten = [], bumperT = {}, rolHoek = 0

function startHole(i) {
  hi = i; h = NG.voorbereid(NG.HOLES[i])
  var xs = h.rand.map(function (p) { return p[0] }), ys = h.rand.map(function (p) { return p[1] })
  var x0 = Math.min.apply(null, xs) - 30, y0 = Math.min.apply(null, ys) - 30
  kader = { x: x0, y: y0, w: Math.max.apply(null, xs) + 30 - x0, h: Math.max.apply(null, ys) + 30 - y0 }
  bal = NG.nieuweBal(h); slagen = 0; vorige = null; fase = 'mikken'; mik = null; acc = 0
  spoor = []; deeltjes = []; teksten = []; bumperT = {}
  meet()
  var b = baanVan(i)
  $('h-naam').textContent = (i + 1) + ' · ' + h.naam
  $('h-baan').textContent = b.naam
  $('h-par').textContent = h.par
  werkSlagBij()
  toonScherm(null)
  audio()
}
function werkSlagBij() {
  $('h-slag').textContent = slagen + ' / ' + NG.maxSlagen(h.par)
  $('slagvak').classList.toggle('krap', slagen >= NG.maxSlagen(h.par) - 2)
}

// ── mikken ──
function maxSleep() { return Math.min(W, H) * 0.36 }
function mikInfo() {
  if (!mik) return null
  var a = naarWereld(mik.sx, mik.sy), b = naarWereld(mik.cx, mik.cy)
  var dx = a[0] - b[0], dy = a[1] - b[1]
  var len = Math.hypot(mik.cx - mik.sx, mik.cy - mik.sy)
  return { hoek: Math.atan2(dy, dx), kracht: Math.min(1, len / maxSleep()) }
}
cv.addEventListener('pointerdown', function (e) {
  if (fase !== 'mikken' || mik) return
  audio()
  mik = { sx: e.clientX, sy: e.clientY, cx: e.clientX, cy: e.clientY, id: e.pointerId }
  try { cv.setPointerCapture(e.pointerId) } catch (er) {}
})
cv.addEventListener('pointermove', function (e) { if (mik && e.pointerId === mik.id) { mik.cx = e.clientX; mik.cy = e.clientY } })
cv.addEventListener('pointerup', function (e) {
  if (!mik || e.pointerId !== mik.id) return
  var m = mikInfo(); mik = null
  if (!m || m.kracht < 0.05 || fase !== 'mikken') return
  vorige = { x: bal.x, y: bal.y }
  slagen++; werkSlagBij()
  NG.schiet(bal, m.hoek, m.kracht)
  fase = 'rollen'; acc = 0
  if (!D.uitleg) { D.uitleg = true; bewaar() }
  Geluid.slag(m.kracht)
})
cv.addEventListener('pointercancel', function () { mik = null })

// ── simulatie ──
var hits = []
function werk(dt) {
  if (fase !== 'rollen') { if (bal) bal.t += dt; return }
  acc += dt
  var n = 0
  while (acc >= NG.DT && n++ < 60) {
    acc -= NG.DT
    var ox0 = bal.x, oy0 = bal.y
    hits.length = 0
    var e = NG.stap(bal, h, hits)
    rolHoek += Math.hypot(bal.x - ox0, bal.y - oy0) / NG.R
    for (var i = 0; i < hits.length; i++) {
      var ht = hits[i]
      if (ht.portaal) { Geluid.portaal(); for (var k = 0; k < 14; k++) vonk(ht.x, ht.y, '#ffb13d', 3) }
      else if (ht.bumper != null) { Geluid.bumper(); bumperT[ht.bumper] = performance.now(); for (k = 0; k < 10; k++) vonk(bal.x, bal.y, '#ff4fa3', 3) }
      else if (ht.kracht > 60) Geluid.muur(ht.kracht)
    }
    if (e === 'gat') { fase = 'zinken'; zinkT = performance.now(); Geluid.gat(); for (k = 0; k < 40; k++) vonk(h.gat[0], h.gat[1], ['#8cff5a', '#3ef0ff', '#ffc83d', '#ff4fa3'][k % 4], 4.5); setTimeout(function () { eindeHole(false) }, 900); return }
    if (e === 'water') {
      fase = 'water'; waterT = performance.now(); Geluid.water()
      for (k = 0; k < 26; k++) vonk(bal.x, bal.y, '#4fb6ff', 3.5)
      slagen++; werkSlagBij()
      tekst('Plons! +1 strafslag', '#4fb6ff')
      setTimeout(function () { terugNaVorige() }, 900)
      return
    }
    if (e === 'rust') {
      // ontsnapt (zou niet mogen)? terug zonder straf
      if (!NG.binnen(h.rand, bal.x, bal.y) || NG.inZone(h.blokken, bal.x, bal.y)) { terugNaVorige(); return }
      fase = 'mikken'
      if (slagen >= NG.maxSlagen(h.par)) { Geluid.op(); setTimeout(function () { eindeHole(true) }, 500); fase = 'klaar' }
      return
    }
  }
}
function terugNaVorige() {
  if (vorige) { bal.x = vorige.x; bal.y = vorige.y }
  bal.vx = bal.vy = 0; bal.rust = 0; bal.port = -1; bal.klaar = null
  fase = 'mikken'; spoor = []
  if (slagen >= NG.maxSlagen(h.par)) { fase = 'klaar'; Geluid.op(); setTimeout(function () { eindeHole(true) }, 400) }
}
function vonk(x, y, col, snel) {
  var a = Math.random() * Math.PI * 2, v = (0.3 + Math.random()) * snel * 60
  deeltjes.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, leven: 0, max: 0.5 + Math.random() * 0.5, col: col, maat: 2 + Math.random() * 3 })
}
function tekst(t, col) { teksten.push({ t: t, col: col, t0: performance.now() }) }

// ── einde van een hole ──
var NAMEN = { '-3': 'Albatros!', '-2': 'Eagle!', '-1': 'Birdie!', '0': 'Par', '1': 'Bogey', '2': 'Dubbel bogey' }
function eindeHole(opgepakt) {
  fase = 'klaar'
  var st = opgepakt ? 0 : NG.sterren(slagen, h.par)
  var oud = D.sterren[hi] || 0
  var munten = 5 + st * 5 + Math.max(0, st - oud) * 10
  var hio = !opgepakt && slagen === 1
  if (hio && !D.hio[hi]) { munten += 25; D.hio[hi] = true }
  D.sterren[hi] = Math.max(oud, st)
  if (!opgepakt) D.slagen[hi] = Math.min(D.slagen[hi] || 99, slagen)
  D.munten += munten
  bewaar()
  var titel = hio ? 'Hole-in-one!' : opgepakt ? 'Opgepakt' : (NAMEN[String(slagen - h.par)] || 'Gehaald')
  $('e-titel').textContent = titel
  $('e-titel').style.color = hio ? '#ffc83d' : st >= 3 ? '#8cff5a' : st === 2 ? '#3ef0ff' : '#eef3ff'
  $('e-sterren').innerHTML = '★★★'.slice(0, st) + '<i>' + '★★★'.slice(st) + '</i>'
  $('e-regel').textContent = opgepakt
    ? 'Na ' + NG.maxSlagen(h.par) + ' slagen pak je de bal op. Probeer het nog eens!'
    : slagen + (slagen === 1 ? ' slag' : ' slagen') + ' op een par ' + h.par + (st < 3 ? ' · ★★★ = ' + (h.par - 1) + (h.par - 1 === 1 ? ' slag' : ' slagen') : '')
  $('e-munten').innerHTML = '+<span class="munt">' + munten + '</span>' + (hio && munten >= 25 ? ' (met hole-in-one-bonus!)' : '')
  $('e-volgende').classList.toggle('verborgen', BELONING || hi >= NG.HOLES.length - 1)
  $('e-klaar').classList.toggle('verborgen', !BELONING)
  $('e-opnieuw').classList.toggle('verborgen', BELONING)
  $('e-menu').classList.toggle('verborgen', BELONING)
  toonScherm('einde')
}
$('e-volgende').onclick = function () { startHole(hi + 1) }
$('e-opnieuw').onclick = function () { startHole(hi) }
$('e-menu').onclick = toonMenu
$('e-klaar').onclick = function () { parent.postMessage({ type: 'neongolf-gameover' }, '*') }
$('menuknop').onclick = function () { mik = null; toonMenu() }
$('opnieuwknop').onclick = function () { if (fase === 'mikken' || fase === 'rollen') startHole(hi) }

// ── vaste baan tekenen (achtergrond, vloer, zones, muren, gat) ──
function tekenBaan() {
  var g = lctx, b = baanVan(hi), col = b.kleur
  scherm(g)
  var bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#070821'); bg.addColorStop(1, '#03040c')
  g.fillStyle = bg; g.fillRect(0, 0, W, H)
  var rnd = mulberry(hi + 3)
  for (var i = 0; i < 140; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.15 + rnd() * 0.5) + ')'; g.fillRect(rnd() * W, rnd() * H, rnd() < 0.9 ? 1 : 2, rnd() < 0.9 ? 1 : 2) }
  wereld(g)
  // vloer
  g.save()
  pad(g, h.rand); g.clip()
  var vl = g.createRadialGradient(500, 300, 50, 500, 300, 700)
  vl.addColorStop(0, '#13194a'); vl.addColorStop(1, '#0a0d2a')
  g.fillStyle = vl; g.fillRect(-100, -100, 1200, 800)
  g.strokeStyle = rgba(col, 0.07); g.lineWidth = 1.2
  for (var x = 0; x <= 1000; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 600); g.stroke() }
  for (var y = 0; y <= 600; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(1000, y); g.stroke() }
  // zones
  ;(h.zand || []).forEach(function (p) {
    pad(g, p); g.fillStyle = 'rgba(214,160,72,.32)'; g.fill()
    g.save(); pad(g, p); g.clip(); var r2 = mulberry(p[0][0] + p[0][1])
    g.fillStyle = 'rgba(255,214,140,.35)'; for (var k = 0; k < 160; k++) { g.beginPath(); g.arc(p[0][0] + r2() * 400 - 50, p[0][1] + r2() * 500 - 50, 1.3, 0, 7); g.fill() }
    g.restore()
    pad(g, p); g.strokeStyle = 'rgba(255,200,110,.5)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.stroke(); g.setLineDash([])
  })
  ;(h.ijs || []).forEach(function (p) {
    pad(g, p); var ij = g.createLinearGradient(p[0][0], p[0][1], p[2][0], p[2][1])
    ij.addColorStop(0, 'rgba(160,240,255,.22)'); ij.addColorStop(1, 'rgba(90,170,255,.12)'); g.fillStyle = ij; g.fill()
    g.save(); pad(g, p); g.clip(); g.strokeStyle = 'rgba(220,250,255,.18)'; g.lineWidth = 3
    for (var k2 = -600; k2 < 1200; k2 += 70) { g.beginPath(); g.moveTo(k2, 0); g.lineTo(k2 + 300, 600); g.stroke() }
    g.restore()
    pad(g, p); g.strokeStyle = 'rgba(180,240,255,.45)'; g.lineWidth = 2; g.stroke()
  })
  ;(h.helling || []).forEach(function (hl) { pad(g, hl.p); g.fillStyle = 'rgba(192,107,255,.08)'; g.fill() })
  ;(h.boost || []).forEach(function (bo) { pad(g, bo.p); g.fillStyle = 'rgba(140,255,90,.1)'; g.fill(); g.strokeStyle = 'rgba(140,255,90,.45)'; g.lineWidth = 2; g.stroke() })
  ;(h.water || []).forEach(function (p) { pad(g, p); g.fillStyle = '#0a2a6b'; g.fill() })
  g.restore()
  // muren: buitenrand + blokken, met neon-gloed
  ;(h.blokken || []).forEach(function (p) { pad(g, p); g.fillStyle = '#05061a'; g.fill() })
  g.save()
  g.shadowColor = col; g.shadowBlur = 14
  g.strokeStyle = col; g.lineWidth = 4; g.lineJoin = 'round'
  pad(g, h.rand); g.stroke()
  ;(h.blokken || []).forEach(function (p) { pad(g, p); g.stroke() })
  g.restore()
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.2; g.lineJoin = 'round'
  pad(g, h.rand); g.stroke(); (h.blokken || []).forEach(function (p) { pad(g, p); g.stroke() })
  // start-plek
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.setLineDash([4, 5])
  g.beginPath(); g.arc(h.start[0], h.start[1], 16, 0, 7); g.stroke(); g.setLineDash([])
  // gat
  var gx = h.gat[0], gy = h.gat[1]
  g.save(); g.shadowColor = '#8cff5a'; g.shadowBlur = 18
  g.beginPath(); g.arc(gx, gy, NG.GAT_R + 3, 0, 7); g.strokeStyle = '#8cff5a'; g.lineWidth = 3; g.stroke(); g.restore()
  var gg = g.createRadialGradient(gx, gy, 2, gx, gy, NG.GAT_R)
  gg.addColorStop(0, '#000'); gg.addColorStop(1, '#0b1a10')
  g.beginPath(); g.arc(gx, gy, NG.GAT_R, 0, 7); g.fillStyle = gg; g.fill()
}
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }

// ── bal tekenen ──
function tekenBal(g, x, y, r, id, t, hoek) {
  var it = BALLEN.find(function (b) { return b.id === id }) || BALLEN[0]
  g.save()
  var gloed = it.kleur || (id === 'vuur' ? '#ff7a1a' : id === 'regenboog' ? 'hsl(' + (t * 120 % 360) + ',100%,60%)' : '#ffffff')
  g.shadowColor = gloed; g.shadowBlur = id === 'vuur' ? 22 : 14
  g.beginPath(); g.arc(x, y, r, 0, 7)
  var gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r)
  if (id === 'vuur') { gr.addColorStop(0, '#fff6b0'); gr.addColorStop(0.45, '#ffb020'); gr.addColorStop(1, '#ff3d00') }
  else if (id === 'planeet') { gr.addColorStop(0, '#ffe0a8'); gr.addColorStop(1, '#c0622b') }
  else if (id === 'disco') { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#8a93a8') }
  else if (id === 'regenboog') { gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'hsl(' + (t * 120 % 360) + ',100%,55%)') }
  else if (it.kleur) { gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, it.kleur); gr.addColorStop(1, rgba(it.kleur, 0.8)) }
  else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#c9d3ea') }
  g.fillStyle = gr; g.fill()
  g.shadowBlur = 0
  g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.clip()
  if (id === 'streep') { g.translate(x, y); g.rotate(hoek); g.fillStyle = '#ff4fa3'; g.fillRect(-r, -r * 0.3, r * 2, r * 0.6) }
  if (id === 'disco') {
    var rnd = mulberry(7)
    for (var i = -r; i < r; i += r * 0.45) for (var j = -r; j < r; j += r * 0.45) {
      var fl = 0.4 + 0.6 * Math.abs(Math.sin(t * 4 + rnd() * 6))
      g.fillStyle = 'rgba(' + (180 + rnd() * 75 | 0) + ',' + (180 + rnd() * 75 | 0) + ',255,' + fl + ')'
      g.fillRect(x + i + 0.5, y + j + 0.5, r * 0.38, r * 0.38)
    }
  }
  g.restore()
  if (id === 'planeet') { g.strokeStyle = 'rgba(255,230,180,.9)'; g.lineWidth = r * 0.22; g.beginPath(); g.ellipse(x, y, r * 1.6, r * 0.45, -0.4, 0, 7); g.stroke() }
  g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, 7); g.fillStyle = 'rgba(255,255,255,.75)'; g.fill()
  g.restore()
}
function tekenSpoor(g, t) {
  var id = D.keuze.spoor
  if (id === 'geen' || spoor.length < 2) return
  g.save(); g.lineCap = 'round'
  for (var i = 1; i < spoor.length; i++) {
    var a = spoor[i - 1], b = spoor[i], f = i / spoor.length
    if (id === 'komeet') { g.strokeStyle = 'rgba(200,240,255,' + f * 0.6 + ')'; g.lineWidth = NG.R * 1.6 * f; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke() }
    else if (id === 'regenboog') { g.strokeStyle = 'hsla(' + ((i * 14 + t * 200) % 360) + ',100%,60%,' + f * 0.8 + ')'; g.lineWidth = NG.R * 1.3 * f; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke() }
    else if (id === 'pixels' && i % 2 === 0) { g.fillStyle = 'rgba(140,255,90,' + f + ')'; var q = NG.R * 0.9 * f + 1; g.fillRect(b[0] - q / 2, b[1] - q / 2, q, q) }
    else if (id === 'sterren' && i % 3 === 0) { g.fillStyle = 'rgba(255,214,90,' + f + ')'; ster(g, b[0], b[1], NG.R * 0.9 * f + 1.5, t * 3 + i) }
  }
  g.restore()
}
function ster(g, x, y, r, a) {
  g.beginPath()
  for (var i = 0; i < 10; i++) { var rr = i % 2 ? r * 0.45 : r, an = a + i * Math.PI / 5; g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr) }
  g.closePath(); g.fill()
}

var TIPS = {
  2: 'Roze bumpers kaatsen je bal extra hard terug',
  3: 'Zand remt je bal flink af',
  6: 'Oranje portaal = in, blauw portaal = uit (met dezelfde vaart)',
  7: 'Groene pijlen geven je bal een duw · op ijs glijdt hij ver door',
  8: 'Timing: sla als de gele schuifdeur open gaat',
  12: 'De molen draait voor de doorgang langs — wacht op een gat',
  13: 'Paarse pijlen = helling: je bal rolt die kant op',
  14: 'Water kost een strafslag en je gaat terug naar waar je stond',
  18: 'Blauwe magneten trekken je bal naar zich toe',
  19: 'Rode magneten duwen je bal weg',
  24: 'Een rode laser is een muur. Hij gaat aan en uit: kies je moment!',
}

// ── per frame ──
function frame(nu) {
  var dt = Math.min(0.05, (nu - laatst) / 1000); laatst = nu
  if (h && fase !== 'menu') {
    werk(dt)
    if (fase === 'rollen') { spoor.push([bal.x, bal.y]); if (spoor.length > 26) spoor.shift(); if (D.keuze.spoor === 'vonken' && Math.random() < 0.7) vonk(bal.x, bal.y, '#ffb13d', 0.8) }
    else if (spoor.length) spoor.shift()
    teken(nu, dt)
  }
  // uitleg onderin: eerst hoe je slaat, daarna bij een nieuw onderdeel wat het doet
  var tip = !D.uitleg ? 'Sleep naar achteren om te mikken · laat los om te slaan' : TIPS[hi]
  var toon = !!h && !!tip && fase === 'mikken' && slagen === 0 && !mik && !$('menu').classList.contains('aan')
  if (toon && $('melding').textContent !== tip) $('melding').textContent = tip
  $('melding').classList.toggle('aan', toon)
  requestAnimationFrame(frame)
}
function teken(nu, dt) {
  var t = bal.t, b = baanVan(hi)
  scherm(ctx); ctx.clearRect(0, 0, W, H)
  ctx.drawImage(laag, 0, 0, W, H)
  wereld(ctx)
  // water (golfjes)
  ;(h.water || []).forEach(function (p) {
    ctx.save(); pad(ctx, p); ctx.clip()
    ctx.strokeStyle = 'rgba(110,190,255,.35)'; ctx.lineWidth = 2
    for (var y = 0; y < 640; y += 18) { ctx.beginPath(); for (var x = 0; x <= 1000; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.04 + t * 2.5 + y) * 3); ctx.stroke() }
    ctx.restore()
  })
  // boost-pijlen die meelopen
  ;(h.boost || []).forEach(function (bo) {
    ctx.save(); pad(ctx, bo.p); ctx.clip()
    var cx = (bo.p[0][0] + bo.p[2][0]) / 2, cy = (bo.p[0][1] + bo.p[2][1]) / 2, ang = Math.atan2(bo.dir[1], bo.dir[0])
    ctx.translate(cx, cy); ctx.rotate(ang)
    ctx.strokeStyle = 'rgba(140,255,90,.75)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    for (var k = -4; k <= 4; k++) { var px = k * 30 + (t * 90) % 30; ctx.globalAlpha = 0.25 + 0.6 * (1 - Math.abs(k) / 4); ctx.beginPath(); ctx.moveTo(px - 8, -14); ctx.lineTo(px + 6, 0); ctx.lineTo(px - 8, 14); ctx.stroke() }
    ctx.restore()
  })
  // helling-pijlen
  ;(h.helling || []).forEach(function (hl) {
    ctx.save(); pad(ctx, hl.p); ctx.clip()
    ctx.fillStyle = 'rgba(192,107,255,.28)'
    var ang = Math.atan2(hl.dir[1], hl.dir[0])
    for (var x = hl.p[0][0] + 30; x < hl.p[2][0]; x += 80) for (var y = hl.p[0][1] + 30; y < hl.p[2][1] + 80; y += 80) {
      var off = (t * 40) % 80
      ctx.save(); ctx.translate(x + hl.dir[0] * off, y + hl.dir[1] * off); ctx.rotate(ang)
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -9); ctx.lineTo(-6, 9); ctx.closePath(); ctx.fill(); ctx.restore()
    }
    ctx.restore()
  })
  // portalen
  ;(h.portalen || []).forEach(function (po, i) {
    portaalRing(po[0], po[1], '#ffb13d', t, 1)
    portaalRing(po[2], po[3], '#3ea6ff', t, -1)
  })
  // magneten: ringen die naar binnen (trekken, blauw) of naar buiten (duwen, rood) lopen
  ;(h.magneten || []).forEach(function (mg) {
    var trek = mg.kracht > 0, col = trek ? '#3ea6ff' : '#ff5a5a'
    var vl = ctx.createRadialGradient(mg.x, mg.y, 4, mg.x, mg.y, mg.r)
    vl.addColorStop(0, rgba(col, 0.22)); vl.addColorStop(1, rgba(col, 0))
    ctx.beginPath(); ctx.arc(mg.x, mg.y, mg.r, 0, 7); ctx.fillStyle = vl; ctx.fill()
    ctx.lineWidth = 2
    for (var k = 0; k < 3; k++) {
      var f = ((t * 0.7 + k / 3) % 1), rr = trek ? mg.r * (1 - f) : mg.r * f
      ctx.strokeStyle = rgba(col, 0.5 * Math.sin(f * Math.PI))
      ctx.beginPath(); ctx.arc(mg.x, mg.y, Math.max(1, rr), 0, 7); ctx.stroke()
    }
    // hoefijzer-magneet in het midden
    ctx.save(); ctx.translate(mg.x, mg.y); ctx.shadowColor = col; ctx.shadowBlur = 12
    ctx.lineCap = 'butt'; ctx.lineWidth = 7; ctx.strokeStyle = col
    ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(-10, -1); ctx.arc(0, -1, 10, Math.PI, 0, false); ctx.lineTo(10, 10); ctx.stroke()
    ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.fillRect(-13.5, 8, 7, 5); ctx.fillRect(6.5, 8, 7, 5)
    ctx.restore()
  })
  // bumpers
  ;(h.bumpers || []).forEach(function (bp, i) {
    var f = bumperT[i] ? Math.max(0, 1 - (performance.now() - bumperT[i]) / 260) : 0
    var r = bp[2] * (1 + f * 0.15)
    ctx.save(); ctx.shadowColor = '#ff4fa3'; ctx.shadowBlur = 12 + f * 20
    ctx.beginPath(); ctx.arc(bp[0], bp[1], r, 0, 7); ctx.fillStyle = f ? 'rgba(255,79,163,' + (0.35 + f * 0.5) + ')' : 'rgba(255,79,163,.22)'; ctx.fill()
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#ff4fa3'; ctx.stroke(); ctx.restore()
    ctx.beginPath(); ctx.arc(bp[0], bp[1], r * 0.45, 0, 7); ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + f * 0.5) + ')'; ctx.fill()
  })
  // schuifdeuren
  ;(h.schuif || []).forEach(function (sc) {
    var p = NG.schuifPos(sc, t)
    ctx.save(); ctx.shadowColor = '#ffc83d'; ctx.shadowBlur = 14
    ctx.fillStyle = 'rgba(255,200,61,.25)'; ctx.fillRect(p.x, p.y, sc.w, sc.h)
    ctx.strokeStyle = '#ffc83d'; ctx.lineWidth = 3; ctx.strokeRect(p.x, p.y, sc.w, sc.h); ctx.restore()
    ctx.strokeStyle = 'rgba(255,200,61,.6)'; ctx.lineWidth = 2
    for (var k = 8; k < sc.h; k += 12) { ctx.beginPath(); ctx.moveTo(p.x + 4, p.y + k); ctx.lineTo(p.x + sc.w - 4, p.y + k - 6); ctx.stroke() }
  })
  // molens
  ;(h.molen || []).forEach(function (m) {
    var hk = NG.molenHoek(m, t)
    ctx.save(); ctx.shadowColor = '#c06bff'; ctx.shadowBlur = 14; ctx.lineCap = 'round'
    for (var k = 0; k < m.armen; k++) {
      var a = hk + k * 2 * Math.PI / m.armen
      ctx.strokeStyle = '#c06bff'; ctx.lineWidth = 11
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + Math.cos(a) * m.len, m.y + Math.sin(a) * m.len); ctx.stroke()
    }
    ctx.restore()
    ctx.lineCap = 'round'
    for (k = 0; k < m.armen; k++) { var a2 = hk + k * 2 * Math.PI / m.armen; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + Math.cos(a2) * (m.len - 4), m.y + Math.sin(a2) * (m.len - 4)); ctx.stroke() }
    ctx.beginPath(); ctx.arc(m.x, m.y, 13, 0, 7); ctx.fillStyle = '#1a0f33'; ctx.fill(); ctx.strokeStyle = '#c06bff'; ctx.lineWidth = 3; ctx.stroke()
  })

  // lasers: aan = rode muur, uit = dun stippellijntje; vlak voor 'aan' knipperen ze
  ;(h.lasers || []).forEach(function (ls) {
    var aan = NG.laserAan(ls, t), fs = NG.laserFase(ls, t), deel = ls.aan ?? 0.5
    var bijna = !aan && fs > 1 - 0.35 / ls.periode
    ctx.lineCap = 'round'
    if (aan) {
      ctx.save(); ctx.shadowColor = '#ff3b3b'; ctx.shadowBlur = 18
      ctx.strokeStyle = 'rgba(255,60,60,.85)'; ctx.lineWidth = 7 + Math.sin(t * 40) * 1.2
      ctx.beginPath(); ctx.moveTo(ls.a[0], ls.a[1]); ctx.lineTo(ls.b[0], ls.b[1]); ctx.stroke(); ctx.restore()
      ctx.strokeStyle = 'rgba(255,235,235,.95)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(ls.a[0], ls.a[1]); ctx.lineTo(ls.b[0], ls.b[1]); ctx.stroke()
    } else {
      ctx.strokeStyle = bijna && Math.sin(t * 50) > 0 ? 'rgba(255,90,90,.75)' : 'rgba(255,90,90,.22)'; ctx.lineWidth = 2
      ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.moveTo(ls.a[0], ls.a[1]); ctx.lineTo(ls.b[0], ls.b[1]); ctx.stroke(); ctx.setLineDash([])
    }
    // zenders aan beide kanten, met een balkje dat aangeeft hoe lang nog
    ;[ls.a, ls.b].forEach(function (p) { ctx.fillStyle = '#2a0b12'; ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, 7); ctx.fill(); ctx.stroke() })
    var rest = aan ? 1 - fs / deel : (fs - deel) / (1 - deel)
    ctx.strokeStyle = aan ? '#ff5a5a' : 'rgba(255,255,255,.5)'; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.arc(ls.a[0], ls.a[1], 11, -Math.PI / 2, -Math.PI / 2 + rest * Math.PI * 2); ctx.stroke()
  })

  // richtlijn
  var mi = mikInfo()
  if (mi && fase === 'mikken') {
    var pts = NG.voorspel(h, bal.x, bal.y, bal.t, mi.hoek, mi.kracht, 110 + 380 * mi.kracht)
    var kc = mi.kracht < 0.5 ? '#8cff5a' : mi.kracht < 0.8 ? '#ffc83d' : '#ff4f6a'
    ctx.fillStyle = 'rgba(255,255,255,.85)'
    for (var i = 1; i < pts.length; i++) { var fa = 1 - i / pts.length; ctx.globalAlpha = 0.25 + fa * 0.75; ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], 2.6, 0, 7); ctx.fill() }
    ctx.globalAlpha = 1
    // terugtrek-lijn + krachtring
    var tx = bal.x - Math.cos(mi.hoek) * (16 + mi.kracht * 70), ty = bal.y - Math.sin(mi.hoek) * (16 + mi.kracht * 70)
    ctx.strokeStyle = kc; ctx.lineWidth = 4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(bal.x - Math.cos(mi.hoek) * 12, bal.y - Math.sin(mi.hoek) * 12); ctx.lineTo(tx, ty); ctx.stroke()
    ctx.save(); ctx.shadowColor = kc; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.arc(bal.x, bal.y, 22, -Math.PI / 2, -Math.PI / 2 + mi.kracht * Math.PI * 2); ctx.strokeStyle = kc; ctx.lineWidth = 4; ctx.stroke(); ctx.restore()
  } else if (fase === 'mikken') {
    // rustige puls om de bal: hier kun je slaan
    ctx.strokeStyle = 'rgba(140,255,90,' + (0.25 + 0.2 * Math.sin(performance.now() / 260)) + ')'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(bal.x, bal.y, 18 + Math.sin(performance.now() / 260) * 2, 0, 7); ctx.stroke()
  }

  // spoor + bal
  tekenSpoor(ctx, t)
  var zf = fase === 'zinken' ? Math.max(0, 1 - (performance.now() - zinkT) / 380) : fase === 'water' ? Math.max(0, 1 - (performance.now() - waterT) / 250) : 1
  if (fase === 'zinken') { bal.x += (h.gat[0] - bal.x) * 0.25; bal.y += (h.gat[1] - bal.y) * 0.25 }
  if (zf > 0) tekenBal(ctx, bal.x, bal.y, NG.R * (0.4 + 0.6 * zf), D.keuze.bal, t, rolHoek)

  // deeltjes
  ctx.globalCompositeOperation = 'lighter'
  deeltjes = deeltjes.filter(function (d) {
    d.leven += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= 0.94; d.vy *= 0.94
    var a = 1 - d.leven / d.max; if (a <= 0) return false
    ctx.fillStyle = rgba(d.col, a); ctx.beginPath(); ctx.arc(d.x, d.y, d.maat * (0.4 + a * 0.6), 0, 7); ctx.fill()
    return true
  })
  ctx.globalCompositeOperation = 'source-over'

  // vlag (in schermruimte, altijd rechtop)
  scherm(ctx)
  var gs = naarScherm(h.gat[0], h.gat[1]), pl = Math.max(26, 44 * s)
  ctx.strokeStyle = '#dfe6ff'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(gs[0], gs[1]); ctx.lineTo(gs[0], gs[1] - pl); ctx.stroke()
  ctx.save(); ctx.shadowColor = '#8cff5a'; ctx.shadowBlur = 12; ctx.fillStyle = '#8cff5a'
  var w1 = Math.sin(performance.now() / 220) * 3
  ctx.beginPath(); ctx.moveTo(gs[0], gs[1] - pl); ctx.quadraticCurveTo(gs[0] + pl * 0.35, gs[1] - pl + 4 + w1, gs[0] + pl * 0.62, gs[1] - pl + 9); ctx.quadraticCurveTo(gs[0] + pl * 0.3, gs[1] - pl + 14 - w1, gs[0], gs[1] - pl + 18); ctx.closePath(); ctx.fill(); ctx.restore()
  // meldingen (plons, …)
  teksten = teksten.filter(function (tx) {
    var f = (performance.now() - tx.t0) / 1400; if (f >= 1) return false
    ctx.save(); ctx.globalAlpha = f > 0.7 ? (1 - f) / 0.3 : 1
    ctx.font = "26px 'Russo One', system-ui, sans-serif"; ctx.textAlign = 'center'
    ctx.shadowColor = tx.col; ctx.shadowBlur = 16; ctx.fillStyle = '#fff'
    ctx.fillText(tx.t, W / 2, H * 0.32 - f * 20); ctx.restore()
    return true
  })
}
function portaalRing(x, y, col, t, richting) {
  ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 16
  for (var i = 0; i < 3; i++) {
    ctx.strokeStyle = rgba(col, 0.9 - i * 0.25); ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(x, y, 18 - i * 5, t * 3 * richting + i, t * 3 * richting + i + Math.PI * 1.3); ctx.stroke()
  }
  ctx.restore()
  ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fillStyle = rgba(col, 0.6); ctx.fill()
}

// ── menu ──
function toonScherm(id) {
  ;['menu', 'einde', 'winkel'].forEach(function (x) { $(x).classList.toggle('aan', x === id) })
  var spelen = id === null
  $('hud').classList.toggle('aan', spelen)
  $('menuknop').classList.toggle('aan', spelen)
  $('opnieuwknop').classList.toggle('aan', spelen)
  $('terug').classList.toggle('aan', !BELONING && id === 'menu')
  if (id === 'menu') fase = 'menu'
}
function toonMenu() {
  var tot = 0
  Object.keys(D.sterren).forEach(function (k) { tot += D.sterren[k] })
  $('totster').textContent = '★ ' + tot + ' / ' + NG.HOLES.length * 3
  $('menumunten').textContent = D.munten
  var wrap = $('banen'); wrap.innerHTML = ''
  var eersteOpen = -1
  for (var i = 0; i < NG.HOLES.length; i++) if (open(i) && !gespeeld(i)) { eersteOpen = i; break }
  NG.BANEN.forEach(function (b, bi) {
    var tot2 = 0, n = 0
    for (var i = b.van; i < b.van + 6; i++) { tot2 += D.sterren[i] || 0; n++ }
    var div = document.createElement('div'); div.className = 'baan'; div.style.borderColor = rgba(b.kleur, 0.35)
    div.innerHTML = '<div class="baankop"><b style="color:' + b.kleur + '">' + b.naam + '</b><span>★ ' + tot2 + ' / ' + n * 3 + '</span></div>'
    var holes = document.createElement('div'); holes.className = 'holes'
    for (i = b.van; i < b.van + 6; i++) {
      (function (i) {
        var hl = NG.HOLES[i], knop = document.createElement('button')
        knop.className = 'hole' + (i === eersteOpen ? ' volgende' : '')
        knop.disabled = !open(i)
        var st = D.sterren[i] || 0
        knop.innerHTML = '<b>' + (open(i) ? i + 1 : '🔒') + '</b><small>' + (D.slagen[i] ? D.slagen[i] + ' / par ' + hl.par : 'par ' + hl.par) + '</small>'
          + '<span class="ster">' + '★★★'.slice(0, st) + '<i>' + '★★★'.slice(st) + '</i></span>'
        knop.title = hl.naam
        knop.onclick = function () { startHole(i) }
        holes.appendChild(knop)
      })(i)
    }
    div.appendChild(holes); wrap.appendChild(div)
  })
  toonScherm('menu')
}

// ── winkel ──
var tab = 'bal'
;[].forEach.call(document.querySelectorAll('.tab'), function (el) {
  el.onclick = function () { tab = el.dataset.tab; [].forEach.call(document.querySelectorAll('.tab'), function (x) { x.classList.toggle('aan', x === el) }); tekenWinkel() }
})
$('naarwinkel').onclick = function () { tekenWinkel(); toonScherm('winkel') }
$('uitwinkel').onclick = function () { toonMenu() }
var winkelAnim = []
function tekenWinkel() {
  $('winkelmunten').textContent = D.munten
  var lijst = $('lijst'); lijst.innerHTML = ''; winkelAnim = []
  ;(tab === 'bal' ? BALLEN : SPOREN).forEach(function (it) {
    var kaart = document.createElement('div'); kaart.className = 'kaart' + (D.keuze[tab] === it.id ? ' gekozen' : '')
    var c = document.createElement('canvas'); c.width = 220; c.height = 112
    winkelAnim.push({ c: c, it: it })
    var naam = document.createElement('div'); naam.className = 'naam'; naam.textContent = it.naam
    var knop = document.createElement('button'), heeft = D.bezit[tab].indexOf(it.id) >= 0
    if (heeft) {
      knop.className = 'kies' + (D.keuze[tab] === it.id ? ' aan' : ''); knop.textContent = D.keuze[tab] === it.id ? 'Gekozen' : 'Kiezen'
      knop.onclick = function () { D.keuze[tab] = it.id; bewaar(); tekenWinkel() }
    } else {
      knop.className = 'koop'; knop.textContent = it.prijs + ' munten'; knop.disabled = D.munten < it.prijs
      knop.onclick = function () { if (D.munten < it.prijs) return; D.munten -= it.prijs; D.bezit[tab].push(it.id); D.keuze[tab] = it.id; bewaar(); Geluid.gat(); tekenWinkel() }
    }
    kaart.appendChild(c); kaart.appendChild(naam); kaart.appendChild(knop); lijst.appendChild(kaart)
  })
}
// voorbeeldjes in de winkel bewegen (bal rolt over een spoor)
function winkelFrame(nu) {
  if ($('winkel').classList.contains('aan')) {
    var t = nu / 1000
    winkelAnim.forEach(function (w) {
      var g = w.c.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, 110, 56)
      var x = 55 + Math.sin(t * 1.6) * 34, y = 28 + Math.sin(t * 3.2) * 8
      if (tab === 'spoor') {
        var bewaarSpoor = spoor, bewaarKeuze = D.keuze.spoor
        spoor = []; for (var i = 24; i >= 0; i--) { var tt = t - i * 0.03; spoor.push([55 + Math.sin(tt * 1.6) * 34, 28 + Math.sin(tt * 3.2) * 8]) }
        D.keuze.spoor = w.it.id
        var R0 = NG.R; tekenSpoor(g, t)
        D.keuze.spoor = bewaarKeuze; spoor = bewaarSpoor; void R0
        tekenBal(g, x, y, 8, D.keuze.bal, t, t * 4)
      } else tekenBal(g, 55, 28, 14, w.it.id, t, t * 2)
    })
  }
  requestAnimationFrame(winkelFrame)
}

meet()
tekenGeluidKnop()
toonMenu()
requestAnimationFrame(frame)
requestAnimationFrame(winkelFrame)
})()
