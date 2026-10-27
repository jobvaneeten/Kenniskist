// Planetenbouwer — scherm, besturing, winkel, effecten en geluid. Regels en
// getallen staan in kern.js.
(function () {
'use strict'
var cv = document.getElementById('c'), ctx = cv.getContext('2d')
var $ = function (id) { return document.getElementById(id) }
var TAU = Math.PI * 2

// ── inbedding ── met ?terug=1 is het vrij spelen, zonder is het een beloning
// (dan zet SpelBeloning er een klok van 1 minuut omheen)
var params = new URLSearchParams(location.search)
var BELONING = !params.has('terug')
if (!BELONING) {
  $('terug').classList.add('aan')
  $('terug').onclick = function () { bewaar(); parent.postMessage({ type: 'planeet-terug' }, '*') }
}

// ── opslag (kk_-prefix ⇒ synct mee naar het account) ──
var OPSLAG = 'kk_planeet'
var ruw = null
try { ruw = JSON.parse(localStorage.getItem(OPSLAG) || 'null') } catch (e) {}
var S = PL.herstel(ruw)
var I = { geluid: !(ruw && ruw.geluid === false), modus: (ruw && ruw.modus) || '1', hulp: !!(ruw && ruw.hulp) }
var wegVerdiend = 0
if (ruw && ruw.laatst) {
  var weg = (Date.now() - ruw.laatst) / 1000
  if (weg > 30 && PL.inkomen(S) > 0) wegVerdiend = PL.weg(S, weg)
}
function bewaar() {
  try {
    localStorage.setItem(OPSLAG, JSON.stringify({
      stof: S.stof, totaal: S.totaal, tijdperk: S.tijdperk, aantal: S.aantal, tikken: S.tikken, kometen: S.kometen,
      geluid: I.geluid, modus: I.modus, hulp: I.hulp, laatst: Date.now(),
    }))
  } catch (e) {}
}
setInterval(bewaar, 2000)
window.addEventListener('pagehide', bewaar)
document.addEventListener('visibilitychange', function () { if (document.hidden) bewaar() })

// ── geluid ──
var AC = null
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)() } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC }
function toon(f, dur, type, vol, delay, f2) {
  if (!I.geluid) return
  var a = audio(); if (!a) return
  var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain()
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur)
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02)
}
var Geluid = {
  tik: function () { toon(520 + Math.random() * 180, 0.08, 'triangle', 0.05) },
  koop: function () { toon(660, 0.08, 'square', 0.04); toon(990, 0.12, 'triangle', 0.05, 0.06) },
  sprong: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { toon(f, 0.3, 'triangle', 0.07, i * 0.09) }) },
  komeet: function () { toon(1200, 0.25, 'sine', 0.06, 0, 2400); toon(1800, 0.2, 'triangle', 0.04, 0.08) },
}
function tekenGeluid() { $('golfje').style.display = I.geluid ? '' : 'none' }
$('geluid').onclick = function () { I.geluid = !I.geluid; tekenGeluid(); bewaar() }
tekenGeluid()

// ── wereld: vaste kaart met oceanen en landpunten (zelfde voor iedereen) ──
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
function hoekAfstand(lo1, la1, lo2, la2) {
  return Math.acos(Math.max(-1, Math.min(1, Math.sin(la1) * Math.sin(la2) + Math.cos(la1) * Math.cos(la2) * Math.cos(lo1 - lo2))))
}
var WERELD = (function () {
  var r = rng(11), oceanen = [], land = [], zee = []
  for (var i = 0; i < 26; i++) oceanen.push({ lon: r() * TAU, lat: Math.asin(r() * 1.7 - 0.85), r: 0.22 + r() * 0.24 })
  for (var j = 0; j < 900 && land.length < 420; j++) {
    var p = { lon: r() * TAU, lat: Math.asin(r() * 1.84 - 0.92) }
    if (oceanen.every(function (o) { return hoekAfstand(p.lon, p.lat, o.lon, o.lat) > o.r + 0.05 })) land.push(p)
  }
  oceanen.forEach(function (o, n) {
    for (var k = 0; k < 6; k++) { var a = r() * TAU, d = r() * o.r * 0.6; zee.push({ lon: o.lon + Math.cos(a) * d / Math.max(0.3, Math.cos(o.lat)), lat: o.lat + Math.sin(a) * d, o: n }) }
  })
  return { oceanen: oceanen, land: land, zee: zee, r: r }
})()
var SOORTEN = PL.ITEMS.map(function (it) { return it.id })
// per soort een eigen reeks landpunten, verspreid over de planeet
function landPunt(soort, i) {
  var n = WERELD.land.length, start = (SOORTEN.indexOf(soort) * 53) % n
  return WERELD.land[(start + i * 29) % n]
}
// per ding een vaste "persoonlijkheid": fase, snelheid, baan
var EIGEN = {}
function eigen(soort, i) {
  var k = soort + i
  if (!EIGEN[k]) { var r = rng(SOORTEN.indexOf(soort) * 1000 + i + 5); EIGEN[k] = { a: r(), b: r(), c: r(), d: r() } }
  return EIGEN[k]
}
var MAX_GETEKEND = { vulkaan: 10, kristal: 18, wolk: 14, gras: 70, bloem: 60, boom: 90, vis: 40, vogel: 26, dier: 40,
  hut: 40, molen: 22, kasteel: 10, flat: 50, toren: 30, zon: 24, satelliet: 12, raket: 8, station: 3, maan: 4, ring: 4, poort: 3 }
function getekend(soort) { return Math.min(S.aantal[soort] || 0, MAX_GETEKEND[soort] || 30) }

// ── layout ──
var dpr = 1, W = 0, H = 0, PX = 0, PY = 0, R = 100, Rdoel = 100
var TILT = 0.38, cT = Math.cos(TILT), sT = Math.sin(TILT)
function bereik() {
  // hoe ver steekt alles buiten de planeet uit (in planeetstralen), horizontaal en verticaal
  var x = 1.3, y = 1.3
  if (S.aantal.satelliet) { x = Math.max(x, 1.6); y = Math.max(y, 1.6) }
  if (S.aantal.station) { x = Math.max(x, 1.95); y = Math.max(y, 1.75) }
  if (S.aantal.ring) { x = Math.max(x, 1.75 + 0.08 * Math.min(4, S.aantal.ring)) }
  if (S.aantal.maan) { var m = 2.3 + 0.35 * (Math.min(4, S.aantal.maan) - 1) + 0.2; x = Math.max(x, m); y = Math.max(y, m * sT + 0.3) }
  if (S.aantal.poort) { x = Math.max(x, 2.15) }
  return { x: x, y: y }
}
function meet() {
  dpr = Math.min(2, window.devicePixelRatio || 1)
  W = innerWidth; H = innerHeight
  cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr)
  var w = $('winkel').getBoundingClientRect(), opzij = w.top < H * 0.3
  var boven = $('hud').getBoundingClientRect().bottom + 8
  var vakB = opzij ? w.left - 10 : W, vakH = (opzij ? H : w.top) - boven
  PX = vakB / 2; PY = boven + vakH / 2
  var b = bereik()
  Rdoel = Math.max(40, Math.min(vakB * 0.5 / b.x, vakH * 0.5 / b.y) * 0.92)
  if (!R || R === 100) R = Rdoel
}
window.addEventListener('resize', meet)
function hudPlaats() {
  var w = $('winkel').getBoundingClientRect(), opzij = w.top < H * 0.3
  $('hud').style.width = (opzij ? w.left : W) + 'px'
}

// ── projectie: lengte/breedte op de draaiende, gekantelde bol → scherm ──
var rot = 0, rotV = 0
function proj(lon, lat, h) {
  h = h || 1
  var l = lon + rot, cl = Math.cos(lat), x = cl * Math.sin(l), y = Math.sin(lat), z = cl * Math.cos(l)
  var y2 = y * cT - z * sT, z2 = y * sT + z * cT
  return { x: PX + x * R * h, y: PY - y2 * R * h, z: z2 }
}
// punt in een baan: straal a (in planeetstralen), helling inc, knoop om, hoek f
function baan(a, inc, om, f) {
  var x = a * Math.cos(f), z = a * Math.sin(f)
  var y1 = -z * Math.sin(inc), z1 = z * Math.cos(inc)
  var x2 = x * Math.cos(om) + z1 * Math.sin(om), z2 = -x * Math.sin(om) + z1 * Math.cos(om)
  return { x: PX + x2 * R, y: PY - (y1 * cT - z2 * sT) * R, z: y1 * sT + z2 * cT }
}
function schaal(z) { return 0.35 + 0.65 * Math.max(0, z) }

// ── kleuren per tijdperk ──
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] }
function rgb(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')' }
function landKleur() {
  var rots = [98, 62, 92], groen = [44, 132, 82], stad = [52, 70, 96]
  var g = Math.min(1, (S.aantal.gras + S.aantal.boom * 0.5) / 18)
  var c = mix(rots, groen, g)
  var st = Math.min(1, (S.aantal.flat + S.aantal.toren) / 40)
  return mix(c, stad, st * 0.6)
}

// ── tekenfuncties per soort (g, x, y, s = grootte, t = tijd, e = eigen) ──
function gloed(g, kleur, blur) { g.shadowColor = kleur; g.shadowBlur = blur }
var TEKEN = {
  vulkaan: function (g, x, y, s, t, e) {
    g.fillStyle = '#5b3326'; g.beginPath(); g.moveTo(x - s * 1.1, y + s * 0.6); g.lineTo(x - s * 0.25, y - s * 0.8); g.lineTo(x + s * 0.25, y - s * 0.8); g.lineTo(x + s * 1.1, y + s * 0.6); g.closePath(); g.fill()
    var p = 0.6 + 0.4 * Math.sin(t * 3 + e.a * 9)
    gloed(g, '#ff7a2a', 10 * p); g.fillStyle = 'rgba(255,' + Math.round(120 + 80 * p) + ',40,1)'
    g.beginPath(); g.ellipse(x, y - s * 0.8, s * 0.32, s * 0.16, 0, 0, TAU); g.fill(); g.shadowBlur = 0
  },
  kristal: function (g, x, y, s, t, e) {
    var k = e.a < 0.5 ? '#3ef0ff' : '#ff4fd8'
    gloed(g, k, 8); g.fillStyle = k
    g.beginPath(); g.moveTo(x, y - s * 1.1); g.lineTo(x + s * 0.45, y); g.lineTo(x, y + s * 0.5); g.lineTo(x - s * 0.45, y); g.closePath(); g.fill()
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x - s * 0.08, y - s * 0.7, s * 0.12, s * 0.4)
  },
  wolk: function (g, x, y, s) {
    g.fillStyle = 'rgba(235,240,255,.55)'
    g.beginPath(); g.ellipse(x, y, s * 1.4, s * 0.55, 0, 0, TAU); g.ellipse(x - s * 0.6, y - s * 0.25, s * 0.6, s * 0.45, 0, 0, TAU); g.ellipse(x + s * 0.5, y - s * 0.3, s * 0.7, s * 0.5, 0, 0, TAU); g.fill()
  },
  gras: function (g, x, y, s, t, e) {
    g.fillStyle = e.a < 0.5 ? 'rgba(70,200,110,.55)' : 'rgba(110,220,90,.5)'
    g.beginPath(); g.arc(x, y, s * 1.5, 0, TAU); g.fill()
  },
  bloem: function (g, x, y, s, t, e) {
    var kl = ['#ff7ad9', '#ffd84d', '#ff8a5c', '#c58bff'][Math.floor(e.a * 4)]
    g.fillStyle = kl
    for (var i = 0; i < 3; i++) { g.beginPath(); g.arc(x + Math.cos(i * 2.1 + e.b * 6) * s * 0.5, y + Math.sin(i * 2.1 + e.b * 6) * s * 0.35, s * 0.28, 0, TAU); g.fill() }
  },
  boom: function (g, x, y, s, t, e) {
    g.fillStyle = '#6b4a2a'; g.fillRect(x - s * 0.1, y - s * 0.1, s * 0.2, s * 0.6)
    g.fillStyle = e.a < 0.5 ? '#1f9d55' : '#178a6a'
    g.beginPath(); g.arc(x, y - s * 0.35, s * 0.55, 0, TAU); g.fill()
    g.fillStyle = 'rgba(160,255,190,.35)'; g.beginPath(); g.arc(x - s * 0.15, y - s * 0.5, s * 0.2, 0, TAU); g.fill()
  },
  vis: function (g, x, y, s, t, e) {
    var a = t * (1 + e.b) + e.a * 9, dx = Math.cos(a) * s * 0.8, dy = Math.sin(a) * s * 0.4
    g.fillStyle = e.c < 0.5 ? '#ff9a3c' : '#ffd23f'
    g.beginPath(); g.ellipse(x + dx, y + dy, s * 0.45, s * 0.22, a + Math.PI / 2, 0, TAU); g.fill()
  },
  vogel: function (g, x, y, s, t, e) {
    var f = Math.sin(t * 10 + e.a * 9) * 0.35
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = Math.max(1, s * 0.18); g.lineCap = 'round'
    g.beginPath(); g.moveTo(x - s * 0.6, y - s * (0.2 + f)); g.lineTo(x, y); g.lineTo(x + s * 0.6, y - s * (0.2 + f)); g.stroke()
  },
  dier: function (g, x, y, s, t, e) {
    g.fillStyle = e.a < 0.5 ? '#c99a6a' : '#eae2d4'
    g.beginPath(); g.ellipse(x, y, s * 0.5, s * 0.3, 0, 0, TAU); g.fill()
    g.beginPath(); g.arc(x + s * 0.45, y - s * 0.2, s * 0.18, 0, TAU); g.fill()
  },
  hut: function (g, x, y, s) {
    g.fillStyle = '#a0683c'; g.fillRect(x - s * 0.45, y - s * 0.3, s * 0.9, s * 0.6)
    g.fillStyle = '#6d3f22'; g.beginPath(); g.moveTo(x - s * 0.6, y - s * 0.25); g.lineTo(x, y - s * 0.8); g.lineTo(x + s * 0.6, y - s * 0.25); g.fill()
    gloed(g, '#ffb347', 6); g.fillStyle = '#ffcf6b'; g.fillRect(x - s * 0.12, y - s * 0.1, s * 0.24, s * 0.22); g.shadowBlur = 0
  },
  molen: function (g, x, y, s, t, e) {
    g.fillStyle = '#d8d2c4'; g.beginPath(); g.moveTo(x - s * 0.3, y + s * 0.4); g.lineTo(x - s * 0.15, y - s * 0.5); g.lineTo(x + s * 0.15, y - s * 0.5); g.lineTo(x + s * 0.3, y + s * 0.4); g.fill()
    g.strokeStyle = '#f2ecdf'; g.lineWidth = Math.max(1, s * 0.12)
    var a = t * 2 + e.a * 6
    for (var i = 0; i < 4; i++) { var b = a + i * Math.PI / 2; g.beginPath(); g.moveTo(x, y - s * 0.5); g.lineTo(x + Math.cos(b) * s * 0.75, y - s * 0.5 + Math.sin(b) * s * 0.75); g.stroke() }
  },
  kasteel: function (g, x, y, s) {
    g.fillStyle = '#9aa0b8'; g.fillRect(x - s * 0.6, y - s * 0.5, s * 1.2, s * 0.9)
    for (var i = 0; i < 3; i++) g.fillRect(x - s * 0.6 + i * s * 0.5, y - s * 0.75, s * 0.2, s * 0.3)
    g.fillStyle = '#ff4fd8'; g.fillRect(x - s * 0.02, y - s * 1.2, s * 0.06, s * 0.45); g.beginPath(); g.moveTo(x + s * 0.04, y - s * 1.2); g.lineTo(x + s * 0.4, y - s * 1.08); g.lineTo(x + s * 0.04, y - s * 0.96); g.fill()
  },
  flat: function (g, x, y, s, t, e) {
    g.fillStyle = '#1d2448'; g.fillRect(x - s * 0.4, y - s * 0.9, s * 0.8, s * 1.2)
    gloed(g, '#ffe27a', 5)
    for (var r = 0; r < 3; r++) for (var k = 0; k < 2; k++) {
      if (((r * 2 + k) * 7 + Math.floor(e.a * 10)) % 3 === 0) continue
      g.fillStyle = (r + k) % 2 ? '#ffe27a' : '#7df9ff'; g.fillRect(x - s * 0.28 + k * s * 0.34, y - s * 0.75 + r * s * 0.34, s * 0.2, s * 0.18)
    }
    g.shadowBlur = 0
  },
  toren: function (g, x, y, s, t, e) {
    var h = s * (1.8 + e.a * 0.8)
    gloed(g, e.b < 0.5 ? '#3ef0ff' : '#ff4fd8', 10); g.fillStyle = '#141a3a'; g.fillRect(x - s * 0.22, y - h, s * 0.44, h + s * 0.3)
    g.fillStyle = e.b < 0.5 ? '#3ef0ff' : '#ff4fd8'; g.fillRect(x - s * 0.22, y - h, s * 0.06, h + s * 0.3); g.fillRect(x + s * 0.16, y - h, s * 0.06, h + s * 0.3)
    g.shadowBlur = 0
    if (Math.sin(t * 4 + e.c * 9) > 0) { gloed(g, '#ff3b5c', 8); g.fillStyle = '#ff3b5c'; g.beginPath(); g.arc(x, y - h - s * 0.12, s * 0.12, 0, TAU); g.fill(); g.shadowBlur = 0 }
  },
  zon: function (g, x, y, s, t, e) {
    var glim = 0.5 + 0.5 * Math.sin(t * 2 + e.a * 9)
    for (var i = 0; i < 2; i++) for (var k = 0; k < 2; k++) {
      g.fillStyle = 'rgba(' + Math.round(40 + 120 * glim) + ',' + Math.round(90 + 120 * glim) + ',255,.95)'
      g.fillRect(x - s * 0.5 + k * s * 0.52, y - s * 0.3 + i * s * 0.34, s * 0.46, s * 0.28)
    }
  },
}
// dingen in een baan of met beweging buiten het oppervlak
function satelliet(g, x, y, s) {
  g.fillStyle = '#d6dcf0'; g.fillRect(x - s * 0.25, y - s * 0.25, s * 0.5, s * 0.5)
  g.fillStyle = '#3d7bff'; g.fillRect(x - s * 1.1, y - s * 0.15, s * 0.75, s * 0.3); g.fillRect(x + s * 0.35, y - s * 0.15, s * 0.75, s * 0.3)
  gloed(g, '#3ef0ff', 6); g.fillStyle = '#3ef0ff'; g.beginPath(); g.arc(x, y, s * 0.1, 0, TAU); g.fill(); g.shadowBlur = 0
}
function station(g, x, y, s, t) {
  g.strokeStyle = '#c9d2f0'; g.lineWidth = Math.max(1.5, s * 0.18)
  g.beginPath(); g.ellipse(x, y, s * 1.2, s * 0.45, 0, 0, TAU); g.stroke()
  g.fillStyle = '#e8ecff'; g.fillRect(x - s * 0.25, y - s * 0.6, s * 0.5, s * 1.2)
  gloed(g, '#ff4fd8', 8); g.fillStyle = '#ff4fd8'; g.beginPath(); g.arc(x, y, s * 0.18 + Math.sin(t * 3) * s * 0.04, 0, TAU); g.fill(); g.shadowBlur = 0
}
function maan(g, x, y, s, e) {
  var gr = g.createRadialGradient(x - s * 0.35, y - s * 0.35, s * 0.1, x, y, s)
  gr.addColorStop(0, ['#e6e8f2', '#f2dcc0', '#d0e8ff', '#e8d0ff'][Math.floor(e.a * 4)]); gr.addColorStop(1, '#4a4c66')
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill()
  g.fillStyle = 'rgba(40,40,70,.35)'
  for (var i = 0; i < 3; i++) { g.beginPath(); g.arc(x + Math.cos(e.b * 9 + i * 2) * s * 0.45, y + Math.sin(e.c * 9 + i * 2) * s * 0.4, s * (0.14 + i * 0.05), 0, TAU); g.fill() }
}
function raket(g, x, y, s, hoek, vlam) {
  g.save(); g.translate(x, y); g.rotate(hoek)
  if (vlam) { gloed(g, '#ff9a3c', 12); g.fillStyle = '#ffb347'; g.beginPath(); g.moveTo(-s * 0.25, s * 0.55); g.lineTo(0, s * (0.9 + Math.random() * 0.6)); g.lineTo(s * 0.25, s * 0.55); g.fill(); g.shadowBlur = 0 }
  g.fillStyle = '#f2f4ff'; g.beginPath(); g.moveTo(0, -s * 0.9); g.quadraticCurveTo(s * 0.35, -s * 0.3, s * 0.28, s * 0.55); g.lineTo(-s * 0.28, s * 0.55); g.quadraticCurveTo(-s * 0.35, -s * 0.3, 0, -s * 0.9); g.fill()
  g.fillStyle = '#ff4fd8'; g.beginPath(); g.moveTo(-s * 0.28, s * 0.2); g.lineTo(-s * 0.55, s * 0.65); g.lineTo(-s * 0.2, s * 0.55); g.fill(); g.beginPath(); g.moveTo(s * 0.28, s * 0.2); g.lineTo(s * 0.55, s * 0.65); g.lineTo(s * 0.2, s * 0.55); g.fill()
  g.fillStyle = '#3ef0ff'; g.beginPath(); g.arc(0, -s * 0.25, s * 0.14, 0, TAU); g.fill()
  g.restore()
}
function poort(g, x, y, s, t, n) {
  for (var i = 0; i < 2 + n; i++) {
    var a = t * (1.2 + i * 0.3)
    g.strokeStyle = i % 2 ? 'rgba(255,79,216,.8)' : 'rgba(62,240,255,.85)'; g.lineWidth = Math.max(1.5, s * 0.12)
    gloed(g, g.strokeStyle, 14)
    g.beginPath(); g.ellipse(x, y, s * (1 - i * 0.12), s * (0.55 - i * 0.05), a * 0.2, 0, TAU); g.stroke()
  }
  g.shadowBlur = 0
  var gr = g.createRadialGradient(x, y, 0, x, y, s * 0.8); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.3, 'rgba(155,107,255,.5)'); gr.addColorStop(1, 'rgba(155,107,255,0)')
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, s * 0.8, s * 0.42, 0, 0, TAU); g.fill()
}

// ── sterrenhemel ──
var STERREN = (function () { var r = rng(3), l = []; for (var i = 0; i < 160; i++) l.push({ x: r(), y: r(), s: r() * 1.4 + 0.3, f: r() * TAU }); return l })()

// ── effecten ──
var deeltjes = [], teksten = [], flitsen = [], puls = 0, tijd = 0
function spat(x, y, kleur, n, v) {
  for (var i = 0; i < n; i++) { var a = Math.random() * TAU, sn = (0.4 + Math.random()) * v; deeltjes.push({ x: x, y: y, vx: Math.cos(a) * sn, vy: Math.sin(a) * sn, leef: 0.7 + Math.random() * 0.4, max: 1.1, kleur: kleur }) }
}
function tekst(x, y, t, kleur) { teksten.push({ x: x, y: y, t: t, leef: 1.1, kleur: kleur || '#fff' }) }

// ── komeet ──
var komeet = null, komeetOm = 18 + Math.random() * 10
function nieuweKomeet() {
  var links = Math.random() < 0.5
  komeet = { x: links ? -60 : W + 60, y: H * (0.12 + Math.random() * 0.3), vx: (links ? 1 : -1) * (W / 6.5), vy: H * (0.02 + Math.random() * 0.04), leef: 8 }
}

// ── tekenen ──
function tekenOppervlak(g) {
  var land = landKleur()
  // bol met licht van linksboven
  var gr = g.createRadialGradient(PX - R * 0.35, PY - R * 0.4, R * 0.05, PX, PY, R)
  gr.addColorStop(0, rgb(mix(land, [255, 255, 255], 0.25))); gr.addColorStop(1, rgb(mix(land, [10, 8, 30], 0.35)))
  g.fillStyle = gr; g.beginPath(); g.arc(PX, PY, R, 0, TAU); g.fill()

  g.save(); g.beginPath(); g.arc(PX, PY, R, 0, TAU); g.clip()
  // kraters op de kale rots (verdwijnen onder het groen)
  var groen = Math.min(1, (S.aantal.gras + S.aantal.boom * 0.5) / 18)
  if (groen < 1) {
    g.fillStyle = 'rgba(30,15,40,' + (0.35 * (1 - groen)) + ')'
    for (var c = 0; c < 16; c++) { var lp = WERELD.land[c * 23 % WERELD.land.length], p = proj(lp.lon, lp.lat); if (p.z <= 0) continue; var sc = schaal(p.z); g.beginPath(); g.ellipse(p.x, p.y, R * 0.07 * sc + R * 0.02, R * 0.05 * sc + R * 0.01, 0, 0, TAU); g.fill() }
  }
  // water
  var water = Math.min(WERELD.oceanen.length, Math.ceil(S.aantal.meer * 0.8 + S.aantal.zee * 2.2))
  var groot = 0.55 + 0.45 * Math.min(1, S.aantal.zee / 12)
  for (var o = 0; o < water; o++) {
    var oc = WERELD.oceanen[o], q = proj(oc.lon, oc.lat)
    if (q.z < -0.35) continue
    var rr = oc.r * R * groot
    var hoek = Math.atan2(q.y - PY, q.x - PX)
    g.fillStyle = 'rgba(40,120,230,.9)'
    g.beginPath(); g.ellipse(q.x, q.y, Math.max(1, rr * Math.max(0.08, q.z)), rr, hoek, 0, TAU); g.fill()
    g.fillStyle = 'rgba(120,200,255,.25)'
    g.beginPath(); g.ellipse(q.x, q.y, Math.max(1, rr * 0.6 * Math.max(0.08, q.z)), rr * 0.6, hoek, 0, TAU); g.fill()
  }
  // ijskappen
  if (S.aantal.ijs) {
    var kap = Math.min(0.36, 0.1 + S.aantal.ijs * 0.018)
    ;[1, -1].forEach(function (pool) {
      var pz = pool * sT, py = pool * cT
      g.fillStyle = 'rgba(235,245,255,.92)'
      g.beginPath(); g.ellipse(PX, PY - py * Math.cos(kap) * R, Math.sin(kap) * R, Math.max(1, Math.sin(kap) * R * Math.abs(pz)), 0, 0, TAU); g.fill()
    })
  }
  // dingen op het land, achterkant eerst niet: alleen wat naar ons toe staat
  var lijst = []
  ;['gras', 'bloem', 'kristal', 'vulkaan', 'boom', 'dier', 'hut', 'molen', 'kasteel', 'zon', 'flat', 'toren'].forEach(function (soort) {
    var n = getekend(soort)
    for (var i = 0; i < n; i++) {
      var lp = landPunt(soort, i), e = eigen(soort, i), lon = lp.lon
      if (soort === 'dier') lon += Math.sin(tijd * 0.2 + e.a * 9) * 0.06
      var p = proj(lon, lp.lat)
      if (p.z > 0.05) lijst.push({ s: soort, p: p, e: e })
    }
  })
  var nv = getekend('vis')
  for (var v = 0; v < nv; v++) {
    var zp = WERELD.zee[(v * 7) % WERELD.zee.length]
    if (zp.o >= water) continue
    var pv = proj(zp.lon, zp.lat)
    if (pv.z > 0.05) lijst.push({ s: 'vis', p: pv, e: eigen('vis', v) })
  }
  lijst.sort(function (a, b) { return a.p.y - b.p.y })
  var basis = R * 0.055
  lijst.forEach(function (d) { TEKEN[d.s](g, d.p.x, d.p.y, basis * schaal(d.p.z), tijd, d.e) })

  // schaduw van de nachtkant
  var sch = g.createRadialGradient(PX - R * 0.45, PY - R * 0.5, R * 0.2, PX - R * 0.1, PY - R * 0.1, R * 1.35)
  sch.addColorStop(0, 'rgba(0,0,20,0)'); sch.addColorStop(0.55, 'rgba(0,0,20,.1)'); sch.addColorStop(1, 'rgba(0,0,25,.72)')
  g.fillStyle = sch; g.fillRect(PX - R, PY - R, R * 2, R * 2)
  // lichtjes van de stad gloeien op de nachtkant
  if (S.aantal.flat || S.aantal.toren || S.aantal.hut) {
    g.globalCompositeOperation = 'lighter'
    lijst.forEach(function (d) {
      if (d.s !== 'flat' && d.s !== 'toren' && d.s !== 'hut') return
      var nacht = Math.max(0, ((d.p.x - PX) + (d.p.y - PY)) / (R * 1.4))
      if (nacht <= 0.05) return
      var kl = d.s === 'hut' ? '255,180,80' : d.e.b < 0.5 ? '62,240,255' : '255,120,220'
      var rr = R * 0.07 * schaal(d.p.z)
      var gl = g.createRadialGradient(d.p.x, d.p.y, 0, d.p.x, d.p.y, rr)
      gl.addColorStop(0, 'rgba(' + kl + ',' + (0.55 * nacht) + ')'); gl.addColorStop(1, 'rgba(' + kl + ',0)')
      g.fillStyle = gl; g.beginPath(); g.arc(d.p.x, d.p.y, rr, 0, TAU); g.fill()
    })
    g.globalCompositeOperation = 'source-over'
  }
  // wolken drijven boven alles
  var nw = getekend('wolk')
  for (var w = 0; w < nw; w++) {
    var wp = landPunt('wolk', w), ew = eigen('wolk', w), pw = proj(wp.lon + tijd * (0.03 + ew.a * 0.03), wp.lat * 0.8, 1.02)
    if (pw.z > 0.1) TEKEN.wolk(g, pw.x, pw.y, R * 0.06 * schaal(pw.z), tijd, ew)
  }
  g.restore()
}

function tekenAtmosfeer(g) {
  var kl = S.tijdperk === 0 ? '255,120,60' : S.tijdperk < 2 ? '90,170,255' : '62,240,255'
  var sterk = 0.18 + Math.min(0.25, S.tijdperk * 0.04) + puls * 0.3
  var gr = g.createRadialGradient(PX, PY, R * 0.92, PX, PY, R * 1.22)
  gr.addColorStop(0, 'rgba(' + kl + ',' + sterk + ')'); gr.addColorStop(1, 'rgba(' + kl + ',0)')
  g.fillStyle = gr; g.beginPath(); g.arc(PX, PY, R * 1.22, 0, TAU); g.fill()
}

function ringBoog(g, voor) {
  var n = Math.min(4, S.aantal.ring)
  for (var i = 0; i < n; i++) {
    var rx = R * (1.42 + i * 0.1), ry = rx * sT
    var kl = ['rgba(255,214,140,', 'rgba(170,200,255,', 'rgba(255,140,220,', 'rgba(140,255,230,'][i]
    g.strokeStyle = kl + (voor ? '.75)' : '.45)'); g.lineWidth = R * 0.045
    g.beginPath(); g.ellipse(PX, PY, rx, ry, 0, voor ? 0 : Math.PI, voor ? Math.PI : TAU); g.stroke()
  }
}

// dingen buiten het oppervlak, met diepte (z) om voor of achter de planeet te tekenen
function baanDingen() {
  var l = []
  var ns = getekend('satelliet')
  for (var i = 0; i < ns; i++) {
    var e = eigen('satelliet', i), p = baan(1.4 + e.a * 0.15, (e.b - 0.5) * 2.2, e.c * TAU, tijd * (0.5 + e.d * 0.4) + e.a * TAU)
    l.push({ z: p.z, teken: (function (p) { return function (g) { satelliet(g, p.x, p.y, R * 0.045 * (0.7 + 0.3 * schaal(p.z))) } })(p) })
  }
  var nst = getekend('station')
  for (var j = 0; j < nst; j++) {
    var es = eigen('station', j), ps = baan(1.75, 0.3 + es.b * 0.4, es.c * TAU, tijd * 0.18 + j * 2.1)
    l.push({ z: ps.z, teken: (function (p) { return function (g) { station(g, p.x, p.y, R * 0.09 * (0.7 + 0.3 * schaal(p.z)), tijd) } })(ps) })
  }
  var nm = getekend('maan')
  for (var m = 0; m < nm; m++) {
    var em = eigen('maan', m), pm = baan(2.3 + m * 0.35, 0.05, 0, tijd * (0.12 - m * 0.02) + em.a * TAU)
    l.push({ z: pm.z, teken: (function (p, e, m) { return function (g) { maan(g, p.x, p.y, R * (0.16 - m * 0.02) * (0.8 + 0.2 * schaal(p.z)), e) } })(pm, em, m) })
  }
  var nr = getekend('raket')
  for (var k = 0; k < nr; k++) {
    var er = eigen('raket', k), duur = 7 + er.a * 6, fase = ((tijd + er.b * duur) % duur) / duur
    if (fase > 0.45) continue
    var lp = landPunt('raket', k), hgt = 1 + Math.pow(fase / 0.45, 1.6) * 1.6, pr = proj(lp.lon, lp.lat, hgt)
    var dx = pr.x - PX, dy = pr.y - PY, afst = Math.hypot(dx, dy)
    if (pr.z < 0 && afst < R) continue
    l.push({ z: pr.z, teken: (function (p, hoek) { return function (g) { raket(g, p.x, p.y, R * 0.06, hoek, true) } })(pr, Math.atan2(dy, dx) + Math.PI / 2) })
  }
  return l
}

function frame(nu) {
  var dt = Math.min(0.1, (nu - (frame.vorig || nu)) / 1000); frame.vorig = nu
  tijd += dt
  PL.stap(S, dt)
  rot += (0.12 + rotV) * dt; rotV *= Math.pow(0.05, dt)
  R += (Rdoel - R) * Math.min(1, dt * 2)
  puls = Math.max(0, puls - dt * 3)

  var g = ctx
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  var lucht = g.createLinearGradient(0, 0, 0, H)
  lucht.addColorStop(0, '#070722'); lucht.addColorStop(1, '#0b0520')
  g.fillStyle = lucht; g.fillRect(0, 0, W, H)
  var neb = g.createRadialGradient(W * 0.2, H * 0.15, 0, W * 0.2, H * 0.15, W * 0.6)
  neb.addColorStop(0, 'rgba(155,107,255,.14)'); neb.addColorStop(1, 'rgba(155,107,255,0)'); g.fillStyle = neb; g.fillRect(0, 0, W, H)
  STERREN.forEach(function (s) { g.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.35 * Math.sin(tijd * 1.5 + s.f)) + ')'; g.fillRect(s.x * W, s.y * H, s.s, s.s) })

  // sterrenpoort staat los in de ruimte
  if (S.aantal.poort) poort(g, PX - R * 1.75, PY - R * 0.9, R * 0.32, tijd, Math.min(3, S.aantal.poort))

  var banen = baanDingen()
  ringBoog(g, false)
  banen.forEach(function (b) { if (b.z < 0) b.teken(g) })
  tekenAtmosfeer(g)
  var sc = 1 + puls * 0.035
  g.save(); g.translate(PX, PY); g.scale(sc, sc); g.translate(-PX, -PY)
  tekenOppervlak(g)
  g.restore()
  ringBoog(g, true)
  banen.forEach(function (b) { if (b.z >= 0) b.teken(g) })
  // vogels vliegen net boven het oppervlak
  var nv = getekend('vogel')
  for (var v = 0; v < nv; v++) {
    var ev = eigen('vogel', v), pv = proj(ev.a * TAU + tijd * (0.25 + ev.b * 0.2), (ev.c - 0.5) * 1.6, 1.1)
    if (pv.z > 0.1) TEKEN.vogel(g, pv.x, pv.y, R * 0.035, tijd, ev)
  }

  // komeet
  komeetOm -= dt
  if (!komeet && komeetOm <= 0) nieuweKomeet()
  if (komeet) {
    komeet.x += komeet.vx * dt; komeet.y += komeet.vy * dt; komeet.leef -= dt
    var kx = komeet.x, ky = komeet.y, len = Math.hypot(komeet.vx, komeet.vy), ux = komeet.vx / len, uy = komeet.vy / len
    var st = g.createLinearGradient(kx, ky, kx - ux * 120, ky - uy * 120)
    st.addColorStop(0, 'rgba(255,240,180,.9)'); st.addColorStop(1, 'rgba(255,79,216,0)')
    g.strokeStyle = st; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx - ux * 120, ky - uy * 120); g.stroke()
    gloed(g, '#ffd23f', 18); g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(kx, ky, 9 + Math.sin(tijd * 12) * 1.5, 0, TAU); g.fill(); g.shadowBlur = 0
    if (komeet.leef <= 0 || kx < -200 || kx > W + 200) { komeet = null; komeetOm = 30 + Math.random() * 30 }
  }

  // effecten
  for (var i = deeltjes.length - 1; i >= 0; i--) {
    var d = deeltjes[i]; d.leef -= dt
    if (d.leef <= 0) { deeltjes.splice(i, 1); continue }
    d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= 0.96; d.vy *= 0.96
    g.globalAlpha = d.leef / d.max; g.fillStyle = d.kleur; g.fillRect(d.x - 2, d.y - 2, 4, 4)
  }
  g.globalAlpha = 1
  for (var j = teksten.length - 1; j >= 0; j--) {
    var t = teksten[j]; t.leef -= dt
    if (t.leef <= 0) { teksten.splice(j, 1); continue }
    t.y -= 40 * dt
    g.globalAlpha = Math.min(1, t.leef * 1.5); g.fillStyle = t.kleur; g.font = '800 18px Outfit, Nunito, sans-serif'; g.textAlign = 'center'
    g.fillText(t.t, t.x, t.y)
  }
  g.globalAlpha = 1
  for (var f = flitsen.length - 1; f >= 0; f--) {
    var fl = flitsen[f]; fl.leef -= dt
    if (fl.leef <= 0) { flitsen.splice(f, 1); continue }
    g.strokeStyle = 'rgba(62,240,255,' + fl.leef + ')'; g.lineWidth = 3
    g.beginPath(); g.arc(PX, PY, R * (1 + (1 - fl.leef) * 0.5), 0, TAU); g.stroke()
  }

  werkHudBij(dt)
  requestAnimationFrame(frame)
}

// ── tikken en draaien ──
var sleep = null
cv.addEventListener('pointerdown', function (e) {
  audio()
  var x = e.clientX, y = e.clientY
  if (komeet && Math.hypot(x - komeet.x, y - komeet.y) < 48) {
    var b = PL.komeetBonus(S); S.stof += b; S.totaal += b; S.kometen++
    Geluid.komeet(); spat(komeet.x, komeet.y, '#ffd23f', 30, 220); tekst(komeet.x, komeet.y - 20, '+' + PL.kort(b), '#ffd23f')
    melding('Komeet gevangen! <b>+' + PL.kort(b) + '</b> sterrenstof')
    komeet = null; komeetOm = 30 + Math.random() * 30
    return
  }
  if (Math.hypot(x - PX, y - PY) < R * 1.15) {
    var w = PL.tik(S)
    puls = 1; Geluid.tik()
    spat(x, y, Math.random() < 0.5 ? '#3ef0ff' : '#ff4fd8', 8, 160)
    tekst(x, y - 14, '+' + PL.kort(w), '#bff9ff')
    if (!I.hulp && S.tikken >= 5) { I.hulp = true; melding('Goed zo! Koop met je sterrenstof dingen voor je planeet. Die verdienen vanzelf meer.') }
  }
  sleep = { x: x }
})
window.addEventListener('pointermove', function (e) {
  if (!sleep) return
  rotV += (e.clientX - sleep.x) * 0.01; sleep.x = e.clientX
})
window.addEventListener('pointerup', function () { sleep = null })

// ── winkel ──
var rijen = {}, opgebouwdVoor = -1
function koopAantal(id) {
  if (I.modus === 'max') return Math.max(1, PL.maxKoop(S, id))
  return Number(I.modus)
}
function icoon(canvas, soort) {
  var n = 46, r = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = canvas.height = n * r
  var g = canvas.getContext('2d'); g.setTransform(r, 0, 0, r, 0, 0)
  var e = { a: 0.3, b: 0.3, c: 0.3, d: 0.3 }
  if (TEKEN[soort] && soort !== 'meer' && soort !== 'zee' && soort !== 'ijs' && soort !== 'wolk') {
    TEKEN[soort](g, n / 2, n * 0.62, n * 0.24, 1, e)
  } else {
    // kleine planeet met het ding eromheen
    var gr = g.createRadialGradient(n * 0.42, n * 0.4, 1, n / 2, n / 2, n * 0.3)
    gr.addColorStop(0, '#8b6aa0'); gr.addColorStop(1, '#3a2850'); g.fillStyle = gr; g.beginPath(); g.arc(n / 2, n / 2, n * 0.28, 0, TAU); g.fill()
    if (soort === 'meer' || soort === 'zee') { g.fillStyle = '#2878e6'; g.beginPath(); g.ellipse(n * 0.45, n * 0.5, n * (soort === 'zee' ? 0.18 : 0.1), n * (soort === 'zee' ? 0.14 : 0.08), 0.3, 0, TAU); g.fill() }
    if (soort === 'ijs') { g.fillStyle = '#eef6ff'; g.beginPath(); g.ellipse(n / 2, n * 0.27, n * 0.15, n * 0.06, 0, 0, TAU); g.fill() }
    if (soort === 'wolk') TEKEN.wolk(g, n / 2, n * 0.45, n * 0.12)
    if (soort === 'satelliet') satelliet(g, n * 0.78, n * 0.22, n * 0.1)
    if (soort === 'station') station(g, n * 0.74, n * 0.22, n * 0.14, 1)
    if (soort === 'raket') raket(g, n * 0.75, n * 0.25, n * 0.14, 0.6, true)
    if (soort === 'maan') maan(g, n * 0.8, n * 0.22, n * 0.11, e)
    if (soort === 'ring') { g.strokeStyle = 'rgba(255,214,140,.9)'; g.lineWidth = 3; g.beginPath(); g.ellipse(n / 2, n / 2, n * 0.44, n * 0.13, -0.3, 0, TAU); g.stroke() }
    if (soort === 'poort') poort(g, n / 2, n / 2, n * 0.32, 1, 1)
  }
}
function bouwWinkel() {
  var lijst = $('lijst'); lijst.innerHTML = ''; rijen = {}
  opgebouwdVoor = S.tijdperk
  var sp = document.createElement('div'); sp.id = 'sprong'; lijst.appendChild(sp)
  for (var t = S.tijdperk; t >= 0; t--) {
    var kop = document.createElement('div'); kop.className = 'groepkop'; kop.textContent = PL.TIJDPERKEN[t].naam; lijst.appendChild(kop)
    PL.ITEMS.filter(function (it) { return it.t === t }).forEach(function (it) {
      var rij = document.createElement('div'); rij.className = 'ding'
      rij.innerHTML = '<canvas></canvas><div class="tekst"><span class="naam">' + it.naam + ' <small></small></span><span class="zin">' + it.zin + '</span><span class="opbrengst"></span></div><button class="koop"></button>'
      lijst.appendChild(rij)
      icoon(rij.querySelector('canvas'), it.id)
      var knop = rij.querySelector('.koop')
      knop.onclick = function () { koop(it.id) }
      rijen[it.id] = { aantal: rij.querySelector('small'), opbrengst: rij.querySelector('.opbrengst'), knop: knop }
    })
  }
  werkWinkelBij()
}
function koop(id) {
  var n = koopAantal(id)
  if (!PL.koop(S, id, n)) return
  Geluid.koop(); puls = 0.6
  // een vonkje op de plek waar het nieuwe ding verschijnt
  var it = PL.PER_ID[id]
  if (it.t <= 5 && id !== 'meer' && id !== 'zee' && id !== 'ijs') {
    var lp = landPunt(id, Math.min(S.aantal[id], MAX_GETEKEND[id] || 30) - 1), p = proj(lp.lon, lp.lat)
    if (p.z > 0) spat(p.x, p.y, '#ffd23f', 12, 120)
  } else flitsen.push({ leef: 1 })
  if (Rdoel) meet()
  werkWinkelBij(); bewaar()
}
function werkWinkelBij() {
  if (opgebouwdVoor !== S.tijdperk) { bouwWinkel(); return }
  PL.ITEMS.forEach(function (it) {
    var r = rijen[it.id]; if (!r) return
    var n = koopAantal(it.id), p = PL.prijs(S, it.id, n)
    r.aantal.textContent = S.aantal[it.id] ? '× ' + S.aantal[it.id] : ''
    r.opbrengst.textContent = '+' + PL.kort(it.inkomen * PL.bonus(S)) + ' per seconde per stuk'
    var label = (n > 1 ? n + '× · ' : '') + PL.kort(p)
    if (r.knop.dataset.t !== label) { r.knop.innerHTML = label + '<span class="ster"></span>'; r.knop.dataset.t = label }
    r.knop.disabled = S.stof < p || (I.modus === 'max' && PL.maxKoop(S, it.id) < 1)
  })
  var sp = $('sprong'), info = PL.sprongInfo(S)
  if (!info) { sp.className = 'eind'; sp.innerHTML = 'Je planeet is compleet! Bouw verder om nog meer sterrenstof te verdienen.'; return }
  var dingen = Math.min(1, info.heeft / info.nodig), geld = Math.min(1, S.stof / info.prijs)
  var html = '<div class="kop">Tijdsprong naar <span>' + info.naar.naam + '</span></div>' +
    '<div class="eis"><span>Bouw ' + info.nodig + ' dingen uit ' + PL.TIJDPERKEN[S.tijdperk].naam + ' (' + Math.min(info.heeft, info.nodig) + '/' + info.nodig + ')</span><div class="balk"><i style="width:' + (dingen * 100) + '%"></i></div>' +
    '<span>Spaar ' + PL.kort(info.prijs) + ' sterrenstof</span><div class="balk"><i style="width:' + (geld * 100) + '%"></i></div></div>' +
    '<button id="sprongknop"' + (info.kan ? ' class="klaar"' : ' disabled') + '>' + (info.kan ? 'Spring naar ' + info.naar.naam + '!' : 'Nog niet klaar') + '</button>'
  if (sp.dataset.html !== html) {
    sp.innerHTML = html; sp.dataset.html = html; sp.className = ''
    $('sprongknop').onclick = springen
  }
}
function springen() {
  if (!PL.sprong(S)) return
  Geluid.sprong(); puls = 1; flitsen.push({ leef: 1 }, { leef: 0.7 })
  for (var i = 0; i < 4; i++) spat(PX, PY, ['#3ef0ff', '#ff4fd8', '#ffd23f', '#4dffa0'][i], 25, 320)
  var tp = PL.TIJDPERKEN[S.tijdperk]
  $('sprongtitel').textContent = tp.naam
  $('sprongtekst').textContent = tp.zin + ' Alles wat je bouwt levert nu ' + PL.kort(PL.bonus(S)) + ' keer zoveel op.'
  $('sprongscherm').classList.add('aan')
  bewaar(); bouwWinkel(); meet()
}
$('sprongverder').onclick = function () { $('sprongscherm').classList.remove('aan') }
Array.prototype.forEach.call(document.querySelectorAll('#modus button'), function (b) {
  b.classList.toggle('aan', b.dataset.n === I.modus)
  b.onclick = function () {
    I.modus = b.dataset.n
    Array.prototype.forEach.call(document.querySelectorAll('#modus button'), function (x) { x.classList.toggle('aan', x === b) })
    werkWinkelBij(); bewaar()
  }
})

// ── hud ──
var hudOm = 0
function werkHudBij(dt) {
  hudOm -= dt
  if (hudOm > 0) return
  hudOm = 0.2
  $('stofgetal').textContent = PL.kort(S.stof)
  $('perSec').textContent = '+' + PL.kort(PL.inkomen(S)) + ' per seconde · tik +' + PL.kort(PL.tikWaarde(S))
  $('tijdperk').textContent = 'Tijdperk ' + (S.tijdperk + 1) + ' · ' + PL.TIJDPERKEN[S.tijdperk].naam
  werkWinkelBij()
}
var meldingTimer = null
function melding(html, ms) {
  var m = $('melding'); m.innerHTML = html; m.classList.add('aan')
  clearTimeout(meldingTimer); meldingTimer = setTimeout(function () { m.classList.remove('aan') }, ms || 3800)
}

// ── start ──
meet(); hudPlaats(); window.addEventListener('resize', hudPlaats)
R = Rdoel
bouwWinkel()
if (wegVerdiend > 0) melding('Terwijl je weg was, verzamelde je planeet <b>' + PL.kort(wegVerdiend) + '</b> sterrenstof!', 5000)
else if (!S.totaal) melding('Tik op je planeet om <b>sterrenstof</b> te verzamelen!', 6000)
requestAnimationFrame(frame)
})()
