// Dierentuinbaas — scherm, bediening, dieren, bezoekers en geluid. De regels
// en getallen staan in kern.js.
(function () {
'use strict'
var cv = document.getElementById('c'), ctx = cv.getContext('2d')
var $ = function (id) { return document.getElementById(id) }
var TAU = Math.PI * 2

// ── inbedding ── met ?terug=1 vrij spelen, anders een beloning van 1 minuut
var params = new URLSearchParams(location.search)
var BELONING = !params.has('terug')
if (BELONING) document.body.classList.add('beloning')
if (!BELONING) {
  $('terug').classList.add('aan')
  $('terug').onclick = function () { bewaar(); parent.postMessage({ type: 'dierentuin-terug' }, '*') }
}

// ── opslag (kk_-prefix ⇒ synct mee naar het account) ──
// Eén sleutel voor alle werelden: { werelden: { id: { tuin, laatst } }, huidige, geluid, doelenDicht }
var OPSLAG = 'kk_dierentuin'
var ruw = null
try { ruw = JSON.parse(localStorage.getItem(OPSLAG) || 'null') } catch (e) {}
if (!ruw || typeof ruw !== 'object') ruw = {}
if (ruw.tuin && !ruw.werelden) { ruw.werelden = { vallei: { tuin: ruw.tuin, laatst: ruw.laatst } }; delete ruw.tuin }
ruw.werelden = ruw.werelden || {}
function levelVan(id) { var w = ruw.werelden[id]; return (w && w.tuin && w.tuin.level) || 1 }
// een wereld gaat open als je in de vorige wereld het gevraagde level gehaald hebt
function wereldOpen(id) {
  if (id === 'creatief') return true
  var i = DT.WERELDEN.map(function (w) { return w.id }).indexOf(id)
  if (i <= 0) return i === 0
  return levelVan(vorigeWereld(i).id) > DT.WERELDEN[i].open
}
function vorigeWereld(i) { var w = DT.WERELDEN[i]; return w.na ? DT.wereld(w.na) : DT.WERELDEN[i - 1] }
var WID = DT.wereld(ruw.huidige || 'vallei').id
if (!wereldOpen(WID)) WID = 'vallei'
var WERELD = DT.wereld(WID), CREATIEF = !!WERELD.creatief
var S = DT.herstel(ruw.werelden[WID] && ruw.werelden[WID].tuin, WID)
var I = { geluid: ruw.geluid !== false, doelen: !ruw.doelenDicht && !CREATIEF }
var wegGeld = 0, wl = ruw.werelden[WID] && ruw.werelden[WID].laatst
if (wl && !CREATIEF) { var weg = (Date.now() - wl) / 1000; if (weg > 30) wegGeld = DT.weg(S, weg).geld }
function bewaar() {
  if (gewist) return
  if (CREATIEF) S.geld = DT.ONEINDIG
  ruw.werelden[WID] = { tuin: DT.bewaarbaar(S), laatst: Date.now() }
  ruw.huidige = naarWereld || WID; ruw.geluid = I.geluid; ruw.doelenDicht = !I.doelen
  try { localStorage.setItem(OPSLAG, JSON.stringify(ruw)) } catch (e) {}
}
// bij het wisselen herlaadt de pagina; ook het opslaan tijdens het sluiten
// moet dan de nieuwe wereld als huidige bewaren
var naarWereld = null
function gaNaarWereld(id) {
  naarWereld = id
  bewaar()
  location.reload()
}
setInterval(bewaar, 3000)
window.addEventListener('pagehide', bewaar)
document.addEventListener('visibilitychange', function () { if (document.hidden) bewaar() })

// ── uiterlijk per wereld ──
var THEMAS = {
  vallei:   { lucht: ['#0d0b2e', '#1a1446', '#2a1650'], gloed: '62,240,255', gras: ['#46a04e', '#4aa652', '#43994a'], blad: '#2f7a38', zijL: ['#7a5534', '#734f30'], zijR: ['#5e4128', '#583c25'], rand: 'rgba(150,230,140,.6)', pad: ['#d6ceba', '#cfc6b1', '#8f8673'], detail: 'gras', sterren: true },
  woestijn: { lucht: ['#2a1240', '#7a2e4a', '#e07a3c'], gloed: '255,170,80', gras: ['#dcb56a', '#d6ae62', '#e0bb70'], blad: '#9a7a3a', zijL: ['#b8643a', '#ad5c35'], zijR: ['#8f4a2a', '#874528'], rand: 'rgba(255,220,150,.7)', pad: ['#a8684a', '#9e6044', '#6e3e2a'], detail: 'woestijn', zon: true },
  ijs:      { lucht: ['#03081e', '#0a2040', '#123656'], gloed: '120,255,210', gras: ['#e8f2fc', '#dfecf9', '#eef6ff'], blad: '#b8d4ee', zijL: ['#9cc8ee', '#94c0e6'], zijR: ['#7aa8d6', '#729fcd'], rand: 'rgba(255,255,255,.85)', pad: ['#8fa6c2', '#879eba', '#5c708c'], detail: 'ijs', sterren: true, noorderlicht: true, sneeuw: true },
  tropisch: { lucht: ['#0b2f55', '#0e4f76', '#137080'], gloed: '120,255,230', gras: ['#3fb85a', '#45c060', '#3ab055'], blad: '#2a8a40', zijL: ['#e8d29a', '#e0ca90'], zijR: ['#c9b07a', '#c0a872'], rand: 'rgba(255,240,190,.85)', pad: ['#e8dcc0', '#e0d4b6', '#a89870'], detail: 'gras', zee: true },
  maan:     { lucht: ['#000004', '#04041a', '#0a0a26'], gloed: '180,180,255', gras: ['#8e8e98', '#878791', '#94949e'], blad: '#6a6a74', zijL: ['#5a5a64', '#55555f'], zijR: ['#44444e', '#40404a'], rand: 'rgba(220,220,240,.55)', pad: ['#5a6078', '#545a72', '#3ef0ff'], detail: 'maan', sterren: true, aarde: true },
  oertijd:  { lucht: ['#1a0a1e', '#4a1630', '#a8402a'], gloed: '255,120,60', gras: ['#3f8f3a', '#45963f', '#3a8636'], blad: '#2a6a2a', zijL: ['#6a3a2a', '#633626'], zijR: ['#4a2a20', '#45261d'], rand: 'rgba(255,170,110,.6)', pad: ['#8a6a5a', '#826252', '#5a3a2e'], detail: 'oer', vulkaan: true },
  creatief: { lucht: ['#140b2e', '#2a1050', '#3a1460'], gloed: '255,79,216', gras: ['#46a04e', '#4aa652', '#43994a'], blad: '#2f7a38', zijL: ['#7a5534', '#734f30'], zijR: ['#5e4128', '#583c25'], rand: 'rgba(150,230,140,.6)', pad: ['#d6ceba', '#cfc6b1', '#8f8673'], detail: 'gras', sterren: true },
}
var THEMA = THEMAS[WID] || THEMAS.vallei

// ── geluid ──
var AC = null
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)() } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC }
function toon(f, dur, type, vol, delay, f2) {
  if (!I.geluid) return
  var a = audio(); if (!a) return
  var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain()
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur)
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.07, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02)
}
var Geluid = {
  pad: function () { toon(300 + Math.random() * 60, 0.05, 'triangle', 0.04) },
  bouw: function () { toon(392, 0.1, 'square', 0.04); toon(523, 0.12, 'triangle', 0.05, 0.07); toon(659, 0.16, 'triangle', 0.05, 0.14) },
  dier: function () { toon(660, 0.12, 'sine', 0.06, 0, 880); toon(990, 0.14, 'sine', 0.05, 0.1) },
  fout: function () { toon(180, 0.18, 'sawtooth', 0.04) },
  kassa: function () { toon(1320, 0.06, 'square', 0.025); toon(1760, 0.08, 'triangle', 0.03, 0.05) },
  niveau: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { toon(f, 0.28, 'triangle', 0.06, i * 0.09) }) },
  sloop: function () { toon(220, 0.12, 'square', 0.04, 0, 110) },
}
function tekenGeluid() { $('golfje').style.display = I.geluid ? '' : 'none' }
$('geluid').onclick = function () { I.geluid = !I.geluid; tekenGeluid(); bewaar() }
tekenGeluid()

// ── layout en camera: schuin van boven (isometrisch), met zoomen en schuiven ──
// ZOOM 1 = de hele gekochte grond past in beeld; PANX/PANY verschuiven het beeld.
var dpr = 1, W = 0, H = 0, TW = 64, TH = 32, T = 40, OX = 0, OY = 0, DIEPTE = 20
var ZOOM = null, PANX = 0, PANY = 0, BASIS = { tw: 40, cx: 0, cy: 0, mx: 0, my: 0 }
var MIN_TW = 16, MAX_TW = 150
function meet() {
  dpr = Math.min(2, window.devicePixelRatio || 1)
  W = innerWidth; H = innerHeight
  cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr)
  var boven = $('hud').getBoundingClientRect().bottom + 6
  var onder = $('balk').getBoundingClientRect().top - 6
  var g = DT.gebied(S), gw = g.x1 - g.x0 + 1, gh = g.y1 - g.y0 + 1, n = gw + gh
  var tw = Math.max(10, Math.min((W - 24) / (n / 2), (onder - boven) / (n / 4 + 0.75), MAX_TW))
  BASIS = { tw: tw, mx: (g.x0 + g.x1 + 1) / 2, my: (g.y0 + g.y1 + 1) / 2, cx: W / 2, cy: boven + tw * 0.45 + (onder - boven - tw * 0.45 - tw * 0.34) / 2 }
  // de eerste keer: niet te klein beginnen, dan liever ingezoomd bij de ingang
  if (ZOOM === null) {
    ZOOM = Math.max(1, 46 / tw)
    if (ZOOM > 1) { zet(); var ip = scherm(DT.INGANG.x, DT.INGANG.y - 3); PANX += BASIS.cx - ip[0]; PANY += (boven + onder) / 2 - ip[1] }
  }
  zet()
}
// rekent TW en de oorsprong uit voor de huidige zoom en verschuiving
function zet() {
  ZOOM = Math.max(MIN_TW / BASIS.tw, Math.min(MAX_TW / BASIS.tw, ZOOM))
  TW = BASIS.tw * ZOOM; TH = TW / 2; DIEPTE = TW * 0.34; T = TW * 0.78
  // niet zo ver schuiven dat de dierentuin uit beeld raakt
  var g = DT.gebied(S), half = ((g.x1 - g.x0 + g.y1 - g.y0 + 2) / 4) * TW
  PANX = Math.max(-half - W * 0.3, Math.min(half + W * 0.3, PANX)); PANY = Math.max(-half - H * 0.3, Math.min(half + H * 0.3, PANY))
  OX = Math.round(BASIS.cx + PANX - (BASIS.mx - BASIS.my) * TW / 2)
  OY = Math.round(BASIS.cy + PANY - (BASIS.mx + BASIS.my) * TH / 2)
  vuil = true
}
// zoomen rond een punt op het scherm (dat punt blijft op zijn plek)
function zoomRond(factor, px, py) {
  var u = (px - OX) / (TW / 2), v = (py - OY) / (TH / 2), wx = (v + u) / 2, wy = (v - u) / 2
  ZOOM *= factor
  ZOOM = Math.max(MIN_TW / BASIS.tw, Math.min(MAX_TW / BASIS.tw, ZOOM))
  var tw = BASIS.tw * ZOOM
  PANX = px - (wx - wy) * tw / 2 + (BASIS.mx - BASIS.my) * tw / 2 - BASIS.cx
  PANY = py - (wx + wy) * tw / 4 + (BASIS.mx + BASIS.my) * tw / 4 - BASIS.cy
  zet()
}
function schuif(dx, dy) { PANX += dx; PANY += dy; zet() }
window.addEventListener('resize', function () { meet() })
// grondpunt (in vakjes, ook met komma's) → scherm
function scherm(x, y) { return [OX + (x - y) * TW / 2, OY + (x + y) * TH / 2] }
function vakOnder(px, py) {
  var u = (px - OX) / (TW / 2), v = (py - OY) / (TH / 2)
  return [Math.floor((v + u) / 2), Math.floor((v - u) / 2)]
}

// ── kleine hulpjes ──
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
function gloed(g, k, b) { g.shadowColor = k; g.shadowBlur = b }
function ellips(g, x, y, rx, ry, kleur) { g.fillStyle = kleur; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); g.fill() }
function cirkel(g, x, y, r, kleur) { g.fillStyle = kleur; g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); g.fill() }
function lijn(g, x1, y1, x2, y2, kleur, b) { g.strokeStyle = kleur; g.lineWidth = b; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke() }

// ── dieren tekenen: (x, y) = tussen de voeten, u = grootte, kijkt naar rechts ──
function poten(g, x, y, u, kleur, n, br, f) {
  for (var i = 0; i < n; i++) {
    var px = x + (i - (n - 1) / 2) * u * br, sw = Math.sin(f + i * Math.PI) * u * 0.08
    lijn(g, px, y - u * 0.35, px + sw, y, kleur, u * 0.13)
  }
}
function oog(g, x, y, u) { cirkel(g, x, y, u * 0.07, '#111'); cirkel(g, x + u * 0.025, y - u * 0.025, u * 0.025, '#fff') }
var DIER = {
  konijn: function (g, x, y, u, f) {
    var h = Math.abs(Math.sin(f * 1.5)) * u * 0.12
    y -= h
    ellips(g, x, y - u * 0.3, u * 0.38, u * 0.28, '#e9e4dc')
    cirkel(g, x - u * 0.38, y - u * 0.3, u * 0.1, '#fff')
    cirkel(g, x + u * 0.28, y - u * 0.55, u * 0.2, '#efeae2')
    ellips(g, x + u * 0.22, y - u * 0.92, u * 0.07, u * 0.24, '#efeae2'); ellips(g, x + u * 0.36, y - u * 0.9, u * 0.07, u * 0.23, '#efeae2')
    ellips(g, x + u * 0.22, y - u * 0.9, u * 0.03, u * 0.16, '#f5a9c0'); ellips(g, x + u * 0.36, y - u * 0.88, u * 0.03, u * 0.15, '#f5a9c0')
    oog(g, x + u * 0.36, y - u * 0.58, u); cirkel(g, x + u * 0.47, y - u * 0.5, u * 0.04, '#f58aa8')
  },
  geit: function (g, x, y, u, f) {
    poten(g, x, y, u, '#cdbb9c', 4, 0.17, f * 2)
    ellips(g, x, y - u * 0.5, u * 0.42, u * 0.22, '#e8dcc4')
    lijn(g, x + u * 0.3, y - u * 0.6, x + u * 0.45, y - u * 0.8, '#e8dcc4', u * 0.16)
    ellips(g, x + u * 0.55, y - u * 0.82, u * 0.17, u * 0.12, '#efe5cf')
    lijn(g, x + u * 0.48, y - u * 0.92, x + u * 0.4, y - u * 1.08, '#8a7a5c', u * 0.05); lijn(g, x + u * 0.56, y - u * 0.93, x + u * 0.52, y - u * 1.1, '#8a7a5c', u * 0.05)
    lijn(g, x + u * 0.62, y - u * 0.72, x + u * 0.62, y - u * 0.62, '#cdbb9c', u * 0.05)
    oog(g, x + u * 0.58, y - u * 0.85, u * 0.8)
    lijn(g, x - u * 0.42, y - u * 0.55, x - u * 0.5, y - u * 0.65, '#e8dcc4', u * 0.06)
  },
  flamingo: function (g, x, y, u, f) {
    lijn(g, x, y, x, y - u * 0.55, '#e86a8f', u * 0.05)
    lijn(g, x, y - u * 0.35, x - u * 0.12, y - u * 0.3 + Math.sin(f) * u * 0.03, '#e86a8f', u * 0.04)
    ellips(g, x - u * 0.05, y - u * 0.66, u * 0.28, u * 0.16, '#ff8fb1')
    g.strokeStyle = '#ff8fb1'; g.lineWidth = u * 0.07; g.beginPath(); g.moveTo(x + u * 0.15, y - u * 0.7)
    g.bezierCurveTo(x + u * 0.38, y - u * 0.8, x + u * 0.05, y - u * 1.05, x + u * 0.22, y - u * 1.2); g.stroke()
    cirkel(g, x + u * 0.24, y - u * 1.22, u * 0.09, '#ff9fbe')
    lijn(g, x + u * 0.3, y - u * 1.22, x + u * 0.42, y - u * 1.12, '#222', u * 0.06)
    oog(g, x + u * 0.26, y - u * 1.25, u * 0.6)
  },
  pinguin: function (g, x, y, u, f) {
    var w = Math.sin(f * 2) * 0.12
    g.save(); g.translate(x, y); g.rotate(w)
    ellips(g, 0, -u * 0.42, u * 0.26, u * 0.42, '#1c2236')
    ellips(g, u * 0.06, -u * 0.38, u * 0.17, u * 0.32, '#f4f6ff')
    cirkel(g, u * 0.04, -u * 0.82, u * 0.18, '#1c2236')
    ellips(g, u * 0.22, -u * 0.8, u * 0.1, u * 0.05, '#ffa53d')
    oog(g, u * 0.1, -u * 0.86, u * 0.7)
    ellips(g, -u * 0.06, 0, u * 0.12, u * 0.05, '#ffa53d'); ellips(g, u * 0.12, 0, u * 0.12, u * 0.05, '#ffa53d')
    g.restore()
  },
  aap: function (g, x, y, u, f) {
    g.strokeStyle = '#7a4e2c'; g.lineWidth = u * 0.07; g.beginPath(); g.moveTo(x - u * 0.25, y - u * 0.35)
    g.quadraticCurveTo(x - u * 0.7, y - u * 0.4, x - u * 0.55, y - u * 0.8 + Math.sin(f) * u * 0.05); g.stroke()
    poten(g, x, y, u, '#6b4226', 2, 0.25, f * 2)
    ellips(g, x, y - u * 0.45, u * 0.26, u * 0.3, '#8a5a34')
    cirkel(g, x + u * 0.12, y - u * 0.82, u * 0.24, '#8a5a34')
    cirkel(g, x - u * 0.08, y - u * 0.86, u * 0.09, '#8a5a34'); cirkel(g, x + u * 0.32, y - u * 0.86, u * 0.09, '#8a5a34')
    ellips(g, x + u * 0.17, y - u * 0.78, u * 0.15, u * 0.13, '#e8c49c')
    oog(g, x + u * 0.13, y - u * 0.84, u * 0.7); oog(g, x + u * 0.24, y - u * 0.84, u * 0.7)
    lijn(g, x + u * 0.15, y - u * 0.5, x + u * 0.35, y - u * 0.35 + Math.sin(f * 2) * u * 0.05, '#8a5a34', u * 0.09)
  },
  zebra: function (g, x, y, u, f) {
    poten(g, x, y, u, '#f2f2f2', 4, 0.2, f * 2)
    ellips(g, x, y - u * 0.55, u * 0.48, u * 0.24, '#f7f7f7')
    g.save(); g.beginPath(); g.ellipse(x, y - u * 0.55, u * 0.48, u * 0.24, 0, 0, TAU); g.clip()
    for (var i = -3; i <= 3; i++) lijn(g, x + i * u * 0.13, y - u * 0.82, x + i * u * 0.13 - u * 0.05, y - u * 0.3, '#1b1b1b', u * 0.06)
    g.restore()
    lijn(g, x + u * 0.35, y - u * 0.6, x + u * 0.55, y - u * 0.95, '#f7f7f7', u * 0.18)
    ellips(g, x + u * 0.62, y - u * 0.95, u * 0.2, u * 0.12, '#f7f7f7')
    lijn(g, x + u * 0.38, y - u * 0.75, x + u * 0.5, y - u * 1.05, '#1b1b1b', u * 0.07)
    ellips(g, x + u * 0.76, y - u * 0.92, u * 0.07, u * 0.07, '#333')
    oog(g, x + u * 0.62, y - u * 0.99, u * 0.7)
    lijn(g, x - u * 0.48, y - u * 0.6, x - u * 0.58, y - u * 0.4, '#1b1b1b', u * 0.05)
  },
  zeehond: function (g, x, y, u, f) {
    var b = Math.sin(f) * u * 0.04
    ellips(g, x - u * 0.05, y - u * 0.2 + b, u * 0.48, u * 0.2, '#8d97a8')
    ellips(g, x + u * 0.35, y - u * 0.38 + b, u * 0.2, u * 0.17, '#9aa4b5')
    ellips(g, x - u * 0.52, y - u * 0.12 + b, u * 0.14, u * 0.06, '#7a8496')
    ellips(g, x + u * 0.05, y - u * 0.05 + b, u * 0.12, u * 0.05, '#7a8496')
    oog(g, x + u * 0.38, y - u * 0.44 + b, u * 0.7); cirkel(g, x + u * 0.52, y - u * 0.36 + b, u * 0.04, '#222')
    lijn(g, x + u * 0.5, y - u * 0.33 + b, x + u * 0.68, y - u * 0.36 + b, 'rgba(255,255,255,.6)', u * 0.015)
  },
  kangoeroe: function (g, x, y, u, f) {
    var h = Math.max(0, Math.sin(f * 1.5)) * u * 0.25
    y -= h
    g.strokeStyle = '#b07a46'; g.lineWidth = u * 0.12; g.beginPath(); g.moveTo(x - u * 0.15, y - u * 0.3); g.quadraticCurveTo(x - u * 0.55, y - u * 0.2, x - u * 0.7, y + h * 0.3); g.stroke()
    ellips(g, x + u * 0.05, y - u * 0.05, u * 0.22, u * 0.06, '#9a6a3c')
    ellips(g, x, y - u * 0.5, u * 0.22, u * 0.36, '#c48a52')
    ellips(g, x + u * 0.06, y - u * 0.45, u * 0.12, u * 0.2, '#e3b98a')
    ellips(g, x + u * 0.16, y - u * 0.95, u * 0.15, u * 0.12, '#c48a52')
    ellips(g, x + u * 0.08, y - u * 1.12, u * 0.05, u * 0.12, '#c48a52'); ellips(g, x + u * 0.18, y - u * 1.12, u * 0.05, u * 0.12, '#c48a52')
    oog(g, x + u * 0.2, y - u * 0.98, u * 0.7); cirkel(g, x + u * 0.3, y - u * 0.92, u * 0.035, '#222')
  },
  giraf: function (g, x, y, u, f) {
    poten(g, x, y, u, '#e8b84e', 4, 0.2, f * 1.6)
    ellips(g, x, y - u * 0.62, u * 0.42, u * 0.24, '#f2c35a')
    lijn(g, x + u * 0.3, y - u * 0.7, x + u * 0.55, y - u * 1.55, '#f2c35a', u * 0.16)
    ellips(g, x + u * 0.62, y - u * 1.6, u * 0.18, u * 0.11, '#f2c35a')
    lijn(g, x + u * 0.55, y - u * 1.68, x + u * 0.53, y - u * 1.82, '#8a5a2c', u * 0.04); lijn(g, x + u * 0.62, y - u * 1.69, x + u * 0.62, y - u * 1.83, '#8a5a2c', u * 0.04)
    var r = rng(9)
    g.fillStyle = '#a8662c'
    for (var i = 0; i < 9; i++) { g.beginPath(); g.ellipse(x - u * 0.3 + r() * u * 0.6, y - u * 0.75 + r() * u * 0.26, u * 0.06, u * 0.045, 0, 0, TAU); g.fill() }
    for (var j = 0; j < 4; j++) { var t = 0.2 + j * 0.2; g.beginPath(); g.ellipse(x + u * (0.3 + 0.25 * t), y - u * (0.7 + 0.85 * t), u * 0.04, u * 0.035, 0, 0, TAU); g.fill() }
    oog(g, x + u * 0.64, y - u * 1.64, u * 0.6)
    lijn(g, x - u * 0.42, y - u * 0.66, x - u * 0.52, y - u * 0.45, '#a8662c', u * 0.04)
  },
  krokodil: function (g, x, y, u, f) {
    var b = Math.sin(f * 2) * u * 0.03
    poten(g, x, y, u, '#3f7a3a', 4, 0.22, f * 2)
    ellips(g, x, y - u * 0.18, u * 0.55, u * 0.14, '#4f9a48')
    g.beginPath(); g.moveTo(x - u * 0.5, y - u * 0.2); g.lineTo(x - u * 1.0, y - u * 0.1 + b); g.lineTo(x - u * 0.5, y - u * 0.1); g.fillStyle = '#4f9a48'; g.fill()
    ellips(g, x + u * 0.65, y - u * 0.16, u * 0.32, u * 0.08, '#5aa852')
    g.fillStyle = '#3d7a38'
    for (var i = 0; i < 6; i++) { g.beginPath(); g.moveTo(x - u * 0.45 + i * u * 0.16, y - u * 0.3); g.lineTo(x - u * 0.38 + i * u * 0.16, y - u * 0.4); g.lineTo(x - u * 0.31 + i * u * 0.16, y - u * 0.3); g.fill() }
    cirkel(g, x + u * 0.45, y - u * 0.27, u * 0.07, '#f2e86a'); cirkel(g, x + u * 0.46, y - u * 0.27, u * 0.03, '#111')
    lijn(g, x + u * 0.4, y - u * 0.12, x + u * 0.95, y - u * 0.13, '#2a5a26', u * 0.02)
  },
  leeuw: function (g, x, y, u, f) {
    g.strokeStyle = '#d29a3e'; g.lineWidth = u * 0.06; g.beginPath(); g.moveTo(x - u * 0.4, y - u * 0.55); g.quadraticCurveTo(x - u * 0.7, y - u * 0.5 + Math.sin(f) * u * 0.1, x - u * 0.68, y - u * 0.8); g.stroke()
    cirkel(g, x - u * 0.68, y - u * 0.82, u * 0.07, '#8a4a1e')
    poten(g, x, y, u, '#d9a24a', 4, 0.2, f * 2)
    ellips(g, x, y - u * 0.52, u * 0.42, u * 0.2, '#e6b25a')
    cirkel(g, x + u * 0.4, y - u * 0.72, u * 0.32, '#a8541e')
    cirkel(g, x + u * 0.45, y - u * 0.7, u * 0.2, '#f0c06a')
    cirkel(g, x + u * 0.32, y - u * 0.88, u * 0.06, '#f0c06a'); cirkel(g, x + u * 0.56, y - u * 0.88, u * 0.06, '#f0c06a')
    oog(g, x + u * 0.42, y - u * 0.75, u * 0.6); oog(g, x + u * 0.54, y - u * 0.75, u * 0.6)
    cirkel(g, x + u * 0.5, y - u * 0.63, u * 0.05, '#5a2a10')
  },
  ijsbeer: function (g, x, y, u, f) {
    poten(g, x, y, u, '#e6edf5', 4, 0.22, f * 1.6)
    ellips(g, x, y - u * 0.5, u * 0.55, u * 0.3, '#f4f8fc')
    cirkel(g, x + u * 0.52, y - u * 0.62, u * 0.22, '#f4f8fc')
    cirkel(g, x + u * 0.42, y - u * 0.8, u * 0.07, '#e6edf5'); cirkel(g, x + u * 0.62, y - u * 0.8, u * 0.07, '#e6edf5')
    ellips(g, x + u * 0.66, y - u * 0.56, u * 0.1, u * 0.08, '#e6edf5')
    cirkel(g, x + u * 0.74, y - u * 0.58, u * 0.04, '#111')
    oog(g, x + u * 0.56, y - u * 0.68, u * 0.6)
  },
  panda: function (g, x, y, u, f) {
    lijn(g, x + u * 0.42, y - u * 0.15, x + u * 0.62, y - u * 1.05, '#5ec86a', u * 0.07)
    lijn(g, x + u * 0.55, y - u * 0.75, x + u * 0.8, y - u * 0.88, '#5ec86a', u * 0.05)
    ellips(g, x, y - u * 0.38, u * 0.38, u * 0.34, '#f4f4f4')
    ellips(g, x - u * 0.22, y - u * 0.08, u * 0.16, u * 0.1, '#1d1d24'); ellips(g, x + u * 0.22, y - u * 0.08, u * 0.16, u * 0.1, '#1d1d24')
    lijn(g, x + u * 0.2, y - u * 0.45, x + u * 0.45, y - u * 0.55 + Math.sin(f) * u * 0.04, '#1d1d24', u * 0.15)
    cirkel(g, x + u * 0.05, y - u * 0.85, u * 0.27, '#f8f8f8')
    cirkel(g, x - u * 0.15, y - u * 1.07, u * 0.09, '#1d1d24'); cirkel(g, x + u * 0.25, y - u * 1.07, u * 0.09, '#1d1d24')
    ellips(g, x - u * 0.04, y - u * 0.86, u * 0.08, u * 0.1, '#1d1d24'); ellips(g, x + u * 0.14, y - u * 0.86, u * 0.08, u * 0.1, '#1d1d24')
    cirkel(g, x - u * 0.03, y - u * 0.87, u * 0.03, '#fff'); cirkel(g, x + u * 0.15, y - u * 0.87, u * 0.03, '#fff')
    cirkel(g, x + u * 0.05, y - u * 0.74, u * 0.04, '#1d1d24')
  },
}
// grootte per soort (in vakjes)
var GROOTTE = { konijn: 0.42, geit: 0.5, flamingo: 0.5, pinguin: 0.45, aap: 0.5, zebra: 0.62, zeehond: 0.55, kangoeroe: 0.55,
  giraf: 0.72, krokodil: 0.55, leeuw: 0.66, ijsbeer: 0.7, olifant: 0.8, panda: 0.6 }
function tekenDier(g, soort, x, y, u, rechts, f) {
  g.save(); g.translate(x, y); if (!rechts) g.scale(-1, 1)
  ellips(g, 0, 0, u * 0.45, u * 0.1, 'rgba(0,0,0,.28)')
  DIER[soort](g, 0, 0, u, f)
  g.restore()
}

// ── de dieren die er later bij kwamen (zelfde opzet: voeten op (x, y), kijkt naar rechts) ──
function vosVorm(g, x, y, u, f, kl, borst, oor) {
  g.strokeStyle = kl; g.lineWidth = u * 0.2; g.lineCap = 'round'
  g.beginPath(); g.moveTo(x - u * 0.3, y - u * 0.4); g.quadraticCurveTo(x - u * 0.7, y - u * 0.35 + Math.sin(f) * u * 0.05, x - u * 0.72, y - u * 0.62); g.stroke()
  cirkel(g, x - u * 0.72, y - u * 0.65, u * 0.08, '#ffffff')
  poten(g, x, y, u, mengKleur(kl, -40), 4, 0.15, f * 2)
  ellips(g, x, y - u * 0.42, u * 0.36, u * 0.17, kl)
  ellips(g, x + u * 0.22, y - u * 0.38, u * 0.12, u * 0.1, borst)
  cirkel(g, x + u * 0.38, y - u * 0.58, u * 0.15, kl)
  g.fillStyle = kl
  g.beginPath(); g.moveTo(x + u * 0.28, y - u * 0.66); g.lineTo(x + u * 0.3, y - u * (0.8 + oor)); g.lineTo(x + u * 0.38, y - u * 0.7); g.fill()
  g.beginPath(); g.moveTo(x + u * 0.4, y - u * 0.7); g.lineTo(x + u * 0.46, y - u * (0.82 + oor)); g.lineTo(x + u * 0.5, y - u * 0.66); g.fill()
  g.beginPath(); g.moveTo(x + u * 0.45, y - u * 0.6); g.lineTo(x + u * 0.66, y - u * 0.52); g.lineTo(x + u * 0.45, y - u * 0.48); g.fill()
  cirkel(g, x + u * 0.65, y - u * 0.52, u * 0.03, '#222'); oog(g, x + u * 0.42, y - u * 0.62, u * 0.55)
}
function hertVorm(g, x, y, u, f, kl, gewei, vlekken) {
  poten(g, x, y, u, mengKleur(kl, -30), 4, 0.18, f * 2)
  ellips(g, x, y - u * 0.55, u * 0.4, u * 0.2, kl)
  if (vlekken) for (var i = 0; i < 5; i++) cirkel(g, x - u * 0.2 + i * u * 0.1, y - u * (0.6 + (i % 2) * 0.05), u * 0.025, '#fff3dc')
  lijn(g, x + u * 0.28, y - u * 0.62, x + u * 0.42, y - u * 0.9, kl, u * 0.13)
  ellips(g, x + u * 0.5, y - u * 0.92, u * 0.15, u * 0.09, kl)
  g.strokeStyle = '#d9c39a'; g.lineWidth = Math.max(1, u * 0.035)
  for (var k = 0; k < 2; k++) {
    var bx = x + u * (0.42 + k * 0.08), by = y - u * 0.98, h = u * gewei
    g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - u * 0.06, by - h); g.moveTo(bx - u * 0.03, by - h * 0.5); g.lineTo(bx + u * 0.06, by - h * 0.7); g.moveTo(bx - u * 0.05, by - h * 0.8); g.lineTo(bx - u * 0.14, by - h * 0.95); g.stroke()
  }
  oog(g, x + u * 0.5, y - u * 0.95, u * 0.6); cirkel(g, x + u * 0.64, y - u * 0.9, u * 0.03, '#222')
  ellips(g, x - u * 0.4, y - u * 0.62, u * 0.05, u * 0.04, '#fff3dc')
}
function olifantVorm(g, x, y, u, f, kl, vacht) {
  poten(g, x, y, u, mengKleur(kl, -15), 4, 0.24, f * 1.4)
  for (var i = 0; i < 4; i++) lijn(g, x + (i - 1.5) * u * 0.24, y - u * 0.3, x + (i - 1.5) * u * 0.24, y, mengKleur(kl, -15), u * 0.17)
  ellips(g, x, y - u * 0.62, u * 0.58, u * 0.36, kl)
  if (vacht) { g.strokeStyle = mengKleur(kl, -35); g.lineWidth = 1; for (var v = 0; v < 9; v++) { var vx = x - u * 0.45 + v * u * 0.11; g.beginPath(); g.moveTo(vx, y - u * 0.4); g.lineTo(vx + u * 0.02, y - u * 0.3); g.stroke() } cirkel(g, x + u * 0.55, y - u * 1.0, u * 0.12, kl) }
  cirkel(g, x + u * 0.58, y - u * 0.8, u * 0.28, kl)
  ellips(g, x + u * 0.44, y - u * 0.8, u * 0.2, u * 0.28, mengKleur(kl, -18))
  g.strokeStyle = kl; g.lineWidth = u * 0.13; g.beginPath(); g.moveTo(x + u * 0.8, y - u * 0.75)
  g.quadraticCurveTo(x + u * 1.0, y - u * 0.45, x + u * 0.92 + Math.sin(f) * u * 0.06, y - u * 0.25); g.stroke()
  if (vacht) { g.strokeStyle = '#fffaf0'; g.lineWidth = u * 0.06; g.beginPath(); g.moveTo(x + u * 0.74, y - u * 0.62); g.quadraticCurveTo(x + u * 1.1, y - u * 0.5, x + u * 1.05, y - u * 0.8); g.stroke() }
  else lijn(g, x + u * 0.74, y - u * 0.62, x + u * 0.92, y - u * 0.52, '#fffaf0', u * 0.06)
  oog(g, x + u * 0.66, y - u * 0.9, u * 0.6)
}
var DIER2 = {
  eend: function (g, x, y, u, f) {
    var w = Math.sin(f * 2) * 0.1
    g.save(); g.translate(x, y); g.rotate(w)
    ellips(g, 0, u * 0, u * 0.1, u * 0.04, '#ff9a3c')
    ellips(g, -u * 0.02, -u * 0.2, u * 0.3, u * 0.17, '#c9a27a'); ellips(g, -u * 0.08, -u * 0.22, u * 0.15, u * 0.08, '#8a6a4a')
    cirkel(g, u * 0.2, -u * 0.42, u * 0.13, '#2e8a4a'); lijn(g, u * 0.12, -u * 0.3, u * 0.22, -u * 0.3, '#fff', u * 0.04)
    ellips(g, u * 0.35, -u * 0.4, u * 0.1, u * 0.04, '#ffa53d'); oog(g, u * 0.23, -u * 0.46, u * 0.6)
    g.restore()
  },
  schaap: function (g, x, y, u, f) {
    poten(g, x, y, u, '#2a2a30', 4, 0.15, f * 2)
    for (var i = 0; i < 7; i++) cirkel(g, x - u * 0.3 + i * u * 0.1, y - u * (0.52 + (i % 2) * 0.08), u * 0.15, '#f4f2ec')
    ellips(g, x, y - u * 0.5, u * 0.34, u * 0.16, '#f4f2ec')
    ellips(g, x + u * 0.42, y - u * 0.6, u * 0.13, u * 0.1, '#2a2a30'); ellips(g, x + u * 0.32, y - u * 0.66, u * 0.08, u * 0.04, '#2a2a30')
    oog(g, x + u * 0.45, y - u * 0.63, u * 0.6)
  },
  varken: function (g, x, y, u, f) {
    poten(g, x, y, u, '#e08aa0', 4, 0.15, f * 2)
    ellips(g, x, y - u * 0.4, u * 0.4, u * 0.22, '#f4a6b8')
    g.strokeStyle = '#e08aa0'; g.lineWidth = u * 0.04; g.beginPath(); g.arc(x - u * 0.44, y - u * 0.45, u * 0.06, 0, Math.PI * 1.6); g.stroke()
    cirkel(g, x + u * 0.36, y - u * 0.48, u * 0.17, '#f4a6b8')
    ellips(g, x + u * 0.52, y - u * 0.45, u * 0.07, u * 0.07, '#e88aa2'); cirkel(g, x + u * 0.51, y - u * 0.46, u * 0.015, '#8a3a4a'); cirkel(g, x + u * 0.55, y - u * 0.44, u * 0.015, '#8a3a4a')
    g.fillStyle = '#e08aa0'; g.beginPath(); g.moveTo(x + u * 0.28, y - u * 0.6); g.lineTo(x + u * 0.24, y - u * 0.76); g.lineTo(x + u * 0.38, y - u * 0.64); g.fill()
    oog(g, x + u * 0.38, y - u * 0.54, u * 0.6)
  },
  hert: function (g, x, y, u, f) { hertVorm(g, x, y, u, f, '#b0784a', 0.32, true) },
  rendier: function (g, x, y, u, f) { hertVorm(g, x, y, u, f, '#8a6a52', 0.5, false); ellips(g, x + u * 0.32, y - u * 0.66, u * 0.1, u * 0.12, '#efe6da') },
  vos: function (g, x, y, u, f) { vosVorm(g, x, y, u, f, '#e8732c', '#fff3e6', 0) },
  fennek: function (g, x, y, u, f) { vosVorm(g, x, y, u, f, '#e8c48a', '#fff6e8', 0.22) },
  poolvos: function (g, x, y, u, f) { vosVorm(g, x, y, u, f, '#eef2f8', '#ffffff', 0) },
  stokstaartje: function (g, x, y, u, f) {
    var k = Math.sin(f) * 0.06
    lijn(g, x - u * 0.12, y - u * 0.15, x - u * 0.35, y - u * 0.05, '#a8845a', u * 0.06)
    ellips(g, x, y - u * 0.35, u * 0.13, u * 0.3, '#c9a77a'); ellips(g, x + u * 0.04, y - u * 0.32, u * 0.07, u * 0.2, '#e8d2ae')
    cirkel(g, x + u * 0.03, y - u * (0.72 + k), u * 0.12, '#c9a77a'); ellips(g, x + u * 0.14, y - u * (0.7 + k), u * 0.07, u * 0.04, '#c9a77a')
    ellips(g, x + u * 0.06, y - u * (0.74 + k), u * 0.05, u * 0.04, '#3a2a1a'); cirkel(g, x + u * 0.07, y - u * (0.74 + k), u * 0.02, '#fff')
  },
  struisvogel: function (g, x, y, u, f) {
    lijn(g, x - u * 0.08, y, x - u * 0.05, y - u * 0.55, '#e8a8a0', u * 0.06); lijn(g, x + u * 0.08, y, x + u * 0.05 + Math.sin(f * 2) * u * 0.04, y - u * 0.55, '#e8a8a0', u * 0.06)
    ellips(g, x - u * 0.02, y - u * 0.72, u * 0.36, u * 0.22, '#2a2a30')
    cirkel(g, x - u * 0.34, y - u * 0.78, u * 0.12, '#ffffff'); cirkel(g, x - u * 0.28, y - u * 0.88, u * 0.1, '#f4f4f4')
    g.strokeStyle = '#e8a8a0'; g.lineWidth = u * 0.07; g.beginPath(); g.moveTo(x + u * 0.25, y - u * 0.8); g.quadraticCurveTo(x + u * 0.4, y - u * 1.1, x + u * 0.32, y - u * 1.38); g.stroke()
    cirkel(g, x + u * 0.34, y - u * 1.4, u * 0.08, '#e8a8a0'); ellips(g, x + u * 0.44, y - u * 1.38, u * 0.07, u * 0.03, '#f0c070'); oog(g, x + u * 0.36, y - u * 1.43, u * 0.6)
  },
  kameel: function (g, x, y, u, f) {
    poten(g, x, y, u, '#b88a52', 4, 0.2, f * 1.6)
    ellips(g, x, y - u * 0.6, u * 0.45, u * 0.22, '#d6a865')
    cirkel(g, x - u * 0.12, y - u * 0.8, u * 0.17, '#d6a865'); cirkel(g, x + u * 0.12, y - u * 0.78, u * 0.14, '#d6a865')
    g.strokeStyle = '#d6a865'; g.lineWidth = u * 0.14; g.beginPath(); g.moveTo(x + u * 0.35, y - u * 0.6); g.quadraticCurveTo(x + u * 0.62, y - u * 0.62, x + u * 0.6, y - u * 0.95); g.stroke()
    ellips(g, x + u * 0.7, y - u * 0.98, u * 0.15, u * 0.08, '#d6a865'); oog(g, x + u * 0.68, y - u * 1.02, u * 0.6)
    lijn(g, x - u * 0.45, y - u * 0.62, x - u * 0.52, y - u * 0.42, '#b88a52', u * 0.04)
  },
  schildpad: function (g, x, y, u, f) {
    var s = Math.sin(f) * u * 0.03
    ellips(g, x - u * 0.2, y - u * 0.04, u * 0.08, u * 0.05, '#7aa85a'); ellips(g, x + u * 0.2, y - u * 0.04, u * 0.08, u * 0.05, '#7aa85a')
    cirkel(g, x + u * 0.38 + s, y - u * 0.18, u * 0.1, '#8ab86a'); oog(g, x + u * 0.42 + s, y - u * 0.2, u * 0.5)
    g.fillStyle = '#4f7a3a'; g.beginPath(); g.ellipse(x, y - u * 0.15, u * 0.34, u * 0.26, 0, Math.PI, TAU); g.fill()
    g.fillStyle = '#6a9a4a'; for (var i = 0; i < 3; i++) { g.beginPath(); g.arc(x - u * 0.15 + i * u * 0.15, y - u * 0.25, u * 0.07, 0, TAU); g.fill() }
    lijn(g, x - u * 0.34, y - u * 0.15, x + u * 0.34, y - u * 0.15, '#c9b07a', u * 0.04)
  },
  nijlpaard: function (g, x, y, u, f) {
    poten(g, x, y, u, '#7a6a8a', 4, 0.22, f * 1.4)
    ellips(g, x, y - u * 0.42, u * 0.55, u * 0.3, '#8f7e9e')
    ellips(g, x + u * 0.58, y - u * 0.5, u * 0.26, u * 0.2, '#8f7e9e'); ellips(g, x + u * 0.74, y - u * 0.42, u * 0.16, u * 0.14, '#a596b4')
    cirkel(g, x + u * 0.48, y - u * 0.72, u * 0.06, '#8f7e9e'); cirkel(g, x + u * 0.62, y - u * 0.7, u * 0.05, '#8f7e9e')
    cirkel(g, x + u * 0.78, y - u * 0.46, u * 0.025, '#4a3a5a'); oog(g, x + u * 0.58, y - u * 0.62, u * 0.6)
    ellips(g, x - u * 0.1, y - u * 0.55, u * 0.25, u * 0.06, 'rgba(255,200,220,.25)')
  },
  walrus: function (g, x, y, u, f) {
    var b = Math.sin(f) * u * 0.03
    ellips(g, x - u * 0.1, y - u * 0.25 + b, u * 0.55, u * 0.27, '#9a6a4a')
    ellips(g, x - u * 0.62, y - u * 0.12 + b, u * 0.16, u * 0.07, '#7a5236'); ellips(g, x + u * 0.1, y - u * 0.04 + b, u * 0.16, u * 0.06, '#7a5236')
    cirkel(g, x + u * 0.38, y - u * 0.45 + b, u * 0.22, '#a87a58')
    ellips(g, x + u * 0.5, y - u * 0.36 + b, u * 0.14, u * 0.1, '#c9a07a')
    lijn(g, x + u * 0.44, y - u * 0.32 + b, x + u * 0.42, y - u * 0.05 + b, '#fffaf0', u * 0.05); lijn(g, x + u * 0.56, y - u * 0.32 + b, x + u * 0.58, y - u * 0.06 + b, '#fffaf0', u * 0.05)
    oog(g, x + u * 0.42, y - u * 0.52 + b, u * 0.6)
  },
  mammoet: function (g, x, y, u, f) { olifantVorm(g, x, y, u, f, '#7a4e30', true) },
  papegaai: function (g, x, y, u, f) {
    var k = Math.sin(f * 1.5) * 0.08
    lijn(g, x - u * 0.05, y - u * 0.3, x - u * 0.28, y + u * 0.02, '#2a6ad6', u * 0.08); lijn(g, x - u * 0.02, y - u * 0.3, x - u * 0.2, y + u * 0.05, '#ffd23f', u * 0.05)
    ellips(g, x, y - u * 0.42, u * 0.14, u * 0.24, '#e8322c'); ellips(g, x - u * 0.06, y - u * 0.42, u * 0.08, u * 0.18, '#2a8ad6')
    cirkel(g, x + u * 0.06, y - u * (0.7 + k), u * 0.12, '#e8322c'); cirkel(g, x + u * 0.1, y - u * (0.72 + k), u * 0.05, '#fff')
    cirkel(g, x + u * 0.1, y - u * (0.72 + k), u * 0.025, '#111')
    g.fillStyle = '#f0e8d0'; g.beginPath(); g.moveTo(x + u * 0.15, y - u * (0.72 + k)); g.quadraticCurveTo(x + u * 0.3, y - u * (0.68 + k), x + u * 0.18, y - u * (0.58 + k)); g.fill()
    lijn(g, x - u * 0.02, y - u * 0.18, x - u * 0.02, y, '#555', u * 0.03); lijn(g, x + u * 0.05, y - u * 0.18, x + u * 0.05, y, '#555', u * 0.03)
  },
  tijger: function (g, x, y, u, f) {
    g.strokeStyle = '#e8822c'; g.lineWidth = u * 0.06; g.beginPath(); g.moveTo(x - u * 0.4, y - u * 0.5); g.quadraticCurveTo(x - u * 0.7, y - u * 0.45 + Math.sin(f) * u * 0.1, x - u * 0.66, y - u * 0.75); g.stroke()
    poten(g, x, y, u, '#d97424', 4, 0.2, f * 2)
    ellips(g, x, y - u * 0.5, u * 0.44, u * 0.2, '#ee8a32')
    g.save(); g.beginPath(); g.ellipse(x, y - u * 0.5, u * 0.44, u * 0.2, 0, 0, TAU); g.clip()
    for (var i = -3; i <= 3; i++) lijn(g, x + i * u * 0.12, y - u * 0.72, x + i * u * 0.12 + u * 0.04, y - u * 0.45, '#1b1b1b', u * 0.05)
    ellips(g, x + u * 0.05, y - u * 0.36, u * 0.3, u * 0.07, '#fff6ec')
    g.restore()
    cirkel(g, x + u * 0.44, y - u * 0.66, u * 0.2, '#ee8a32')
    ellips(g, x + u * 0.52, y - u * 0.6, u * 0.1, u * 0.08, '#fff6ec')
    cirkel(g, x + u * 0.34, y - u * 0.82, u * 0.06, '#ee8a32'); cirkel(g, x + u * 0.52, y - u * 0.84, u * 0.06, '#ee8a32')
    lijn(g, x + u * 0.4, y - u * 0.8, x + u * 0.42, y - u * 0.72, '#1b1b1b', u * 0.03); lijn(g, x + u * 0.5, y - u * 0.8, x + u * 0.48, y - u * 0.72, '#1b1b1b', u * 0.03)
    oog(g, x + u * 0.42, y - u * 0.7, u * 0.55); oog(g, x + u * 0.52, y - u * 0.7, u * 0.55); cirkel(g, x + u * 0.58, y - u * 0.6, u * 0.035, '#5a2a10')
  },
}
// ── het Oertijdpark ──
function vorm(g, pts, kleur) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fillStyle = kleur; g.fill() }
function staart(g, x1, y1, x2, y2, kleur, b) { g.strokeStyle = kleur; g.lineWidth = b; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo((x1 + x2) / 2, y1 + (y2 - y1) * 0.2, x2, y2); g.stroke() }
var DIER3 = {
  dodo: function (g, x, y, u, f) {
    poten(g, x, y, u, '#e8b04a', 2, 0.18, f * 2)
    cirkel(g, x - u * 0.36, y - u * 0.55, u * 0.11, '#f2efe6')
    ellips(g, x - u * 0.05, y - u * 0.42, u * 0.34, u * 0.3, '#8a93a8')
    ellips(g, x - u * 0.08, y - u * 0.46, u * 0.17, u * 0.12, '#737c92')
    cirkel(g, x + u * 0.26, y - u * 0.72, u * 0.16, '#9aa3b8')
    vorm(g, [[x + u * 0.36, y - u * 0.8], [x + u * 0.6, y - u * 0.74], [x + u * 0.6, y - u * 0.62], [x + u * 0.52, y - u * 0.66], [x + u * 0.38, y - u * 0.64]], '#e8c25a')
    cirkel(g, x + u * 0.58, y - u * 0.64, u * 0.035, '#8a6a2a')
    oog(g, x + u * 0.3, y - u * 0.76, u * 0.6)
  },
  oervogel: function (g, x, y, u, f) {
    staart(g, x - u * 0.18, y - u * 0.45, x - u * 0.72, y - u * 0.42 + Math.sin(f) * u * 0.04, '#2e8a7a', u * 0.1)
    for (var i = 0; i < 3; i++) ellips(g, x - u * (0.35 + i * 0.14), y - u * 0.46, u * 0.06, u * 0.025, '#e8c25a')
    poten(g, x, y, u, '#6b5a3a', 2, 0.16, f * 2)
    ellips(g, x, y - u * 0.46, u * 0.25, u * 0.17, '#3fa58f')
    ellips(g, x - u * 0.06, y - u * 0.5, u * 0.2, u * 0.1, '#2a7a6a')
    cirkel(g, x + u * 0.24, y - u * 0.66, u * 0.12, '#46b39b')
    ellips(g, x + u * 0.38, y - u * 0.63, u * 0.11, u * 0.04, '#3a8f7c')
    oog(g, x + u * 0.27, y - u * 0.69, u * 0.55)
  },
  pteranodon: function (g, x, y, u, f) {
    var a = Math.sin(f * 2.5) * u * 0.18
    y -= u * (0.45 + Math.sin(f) * 0.05)
    vorm(g, [[x - u * 0.05, y - u * 0.22], [x - u * 0.78, y - u * 0.3 - a], [x - u * 0.55, y - u * 0.14 - a * 0.5], [x - u * 0.15, y - u * 0.08]], '#e0955a')
    vorm(g, [[x + u * 0.05, y - u * 0.22], [x + u * 0.62, y - u * 0.36 - a], [x + u * 0.45, y - u * 0.16 - a * 0.5], [x + u * 0.15, y - u * 0.08]], '#d08448')
    ellips(g, x, y - u * 0.17, u * 0.2, u * 0.08, '#c9773a')
    cirkel(g, x + u * 0.22, y - u * 0.26, u * 0.08, '#c9773a')
    vorm(g, [[x + u * 0.26, y - u * 0.3], [x + u * 0.58, y - u * 0.24], [x + u * 0.26, y - u * 0.22]], '#f2c35a')
    vorm(g, [[x + u * 0.18, y - u * 0.3], [x - u * 0.06, y - u * 0.44], [x + u * 0.22, y - u * 0.33]], '#b0582a')
    oog(g, x + u * 0.24, y - u * 0.28, u * 0.45)
  },
  parasaurolophus: function (g, x, y, u, f) {
    staart(g, x - u * 0.2, y - u * 0.52, x - u * 0.78, y - u * 0.44, '#5aa86a', u * 0.15)
    poten(g, x, y, u, '#3f8a52', 2, 0.22, f * 2)
    ellips(g, x, y - u * 0.55, u * 0.36, u * 0.22, '#5fb873')
    ellips(g, x + u * 0.05, y - u * 0.44, u * 0.24, u * 0.09, '#d6e8a0')
    for (var i = 0; i < 3; i++) lijn(g, x - u * 0.15 + i * u * 0.13, y - u * 0.74, x - u * 0.12 + i * u * 0.13, y - u * 0.62, '#3f8a52', u * 0.04)
    lijn(g, x + u * 0.25, y - u * 0.65, x + u * 0.4, y - u * 0.9, '#5fb873', u * 0.14)
    ellips(g, x + u * 0.5, y - u * 0.95, u * 0.16, u * 0.09, '#5fb873')
    lijn(g, x + u * 0.42, y - u * 1.0, x + u * 0.06, y - u * 1.16, '#e8743a', u * 0.08)
    lijn(g, x + u * 0.22, y - u * 0.52, x + u * 0.32, y - u * 0.42, '#3f8a52', u * 0.05)
    oog(g, x + u * 0.5, y - u * 0.98, u * 0.55)
  },
  velociraptor: function (g, x, y, u, f) {
    staart(g, x - u * 0.2, y - u * 0.5, x - u * 0.82, y - u * 0.56 + Math.sin(f) * u * 0.06, '#c98a4a', u * 0.1)
    poten(g, x, y, u, '#a86a32', 2, 0.18, f * 2.5)
    ellips(g, x, y - u * 0.5, u * 0.3, u * 0.14, '#d99a56')
    for (var i = 0; i < 3; i++) lijn(g, x - u * 0.15 + i * u * 0.12, y - u * 0.62, x - u * 0.12 + i * u * 0.12, y - u * 0.5, '#8a4a22', u * 0.035)
    lijn(g, x + u * 0.22, y - u * 0.56, x + u * 0.38, y - u * 0.72, '#d99a56', u * 0.1)
    ellips(g, x + u * 0.48, y - u * 0.74, u * 0.17, u * 0.07, '#d99a56')
    lijn(g, x + u * 0.36, y - u * 0.7, x + u * 0.62, y - u * 0.72, '#8a4a22', u * 0.02)
    lijn(g, x + u * 0.2, y - u * 0.46, x + u * 0.3, y - u * 0.36, '#a86a32', u * 0.05)
    oog(g, x + u * 0.46, y - u * 0.77, u * 0.5)
  },
  stegosaurus: function (g, x, y, u, f) {
    staart(g, x - u * 0.42, y - u * 0.48, x - u * 0.88, y - u * 0.3, '#7aa04a', u * 0.14)
    lijn(g, x - u * 0.82, y - u * 0.34, x - u * 0.9, y - u * 0.5, '#f4ead0', u * 0.04); lijn(g, x - u * 0.86, y - u * 0.3, x - u * 1.0, y - u * 0.4, '#f4ead0', u * 0.04)
    poten(g, x, y, u, '#5f7f3a', 4, 0.22, f * 1.6)
    for (var i = 0; i < 5; i++) { var px = x - u * 0.34 + i * u * 0.16, ph = u * (0.2 + 0.08 * Math.sin(i * 1.3 + 1)); vorm(g, [[px - u * 0.08, y - u * 0.66], [px, y - u * 0.7 - ph], [px + u * 0.08, y - u * 0.66]], '#e8743a') }
    ellips(g, x, y - u * 0.48, u * 0.5, u * 0.26, '#7aa04a')
    ellips(g, x + u * 0.05, y - u * 0.36, u * 0.36, u * 0.1, '#c8d890')
    ellips(g, x + u * 0.55, y - u * 0.34, u * 0.15, u * 0.09, '#7aa04a')
    oog(g, x + u * 0.58, y - u * 0.37, u * 0.5)
  },
  ankylosaurus: function (g, x, y, u, f) {
    staart(g, x - u * 0.45, y - u * 0.4, x - u * 0.85, y - u * 0.36 + Math.sin(f) * u * 0.05, '#8a7a4a', u * 0.1)
    cirkel(g, x - u * 0.88, y - u * 0.36 + Math.sin(f) * u * 0.05, u * 0.11, '#5a4a2a')
    poten(g, x, y, u, '#6a5a3a', 4, 0.24, f * 1.4)
    ellips(g, x, y - u * 0.38, u * 0.52, u * 0.24, '#a08a5a')
    for (var i = 0; i < 7; i++) vorm(g, [[x - u * 0.45 + i * u * 0.15, y - u * 0.2], [x - u * 0.41 + i * u * 0.15, y - u * 0.08], [x - u * 0.37 + i * u * 0.15, y - u * 0.2]], '#e8dcb0')
    for (var j = 0; j < 6; j++) cirkel(g, x - u * 0.32 + j * u * 0.13, y - u * (0.5 + (j % 2) * 0.06), u * 0.045, '#6a5a3a')
    ellips(g, x + u * 0.56, y - u * 0.32, u * 0.15, u * 0.1, '#a08a5a')
    oog(g, x + u * 0.6, y - u * 0.35, u * 0.5)
  },
  triceratops: function (g, x, y, u, f) {
    vorm(g, [[x - u * 0.45, y - u * 0.55], [x - u * 0.75, y - u * 0.4], [x - u * 0.45, y - u * 0.38]], '#6f9aa8')
    poten(g, x, y, u, '#557f8c', 4, 0.22, f * 1.5)
    ellips(g, x - u * 0.05, y - u * 0.5, u * 0.48, u * 0.28, '#6f9aa8')
    ellips(g, x + u * 0.42, y - u * 0.7, u * 0.24, u * 0.28, '#e0a040')
    ellips(g, x + u * 0.44, y - u * 0.7, u * 0.17, u * 0.21, '#c8862a')
    ellips(g, x + u * 0.6, y - u * 0.5, u * 0.21, u * 0.14, '#7fa8b5')
    lijn(g, x + u * 0.62, y - u * 0.62, x + u * 0.88, y - u * 0.84, '#f4ead0', u * 0.06)
    lijn(g, x + u * 0.54, y - u * 0.64, x + u * 0.76, y - u * 0.9, '#f4ead0', u * 0.06)
    lijn(g, x + u * 0.76, y - u * 0.52, x + u * 0.86, y - u * 0.6, '#f4ead0', u * 0.05)
    oog(g, x + u * 0.62, y - u * 0.56, u * 0.55)
  },
  sabeltand: function (g, x, y, u, f) {
    lijn(g, x - u * 0.4, y - u * 0.55, x - u * 0.52, y - u * 0.62, '#c49050', u * 0.08)
    poten(g, x, y, u, '#b8864a', 4, 0.2, f * 2)
    ellips(g, x, y - u * 0.5, u * 0.42, u * 0.21, '#d4a060')
    ellips(g, x + u * 0.05, y - u * 0.38, u * 0.28, u * 0.08, '#f2dcb4')
    cirkel(g, x + u * 0.44, y - u * 0.66, u * 0.19, '#d4a060')
    cirkel(g, x + u * 0.34, y - u * 0.82, u * 0.06, '#d4a060'); cirkel(g, x + u * 0.52, y - u * 0.84, u * 0.06, '#d4a060')
    ellips(g, x + u * 0.53, y - u * 0.6, u * 0.1, u * 0.07, '#f2dcb4')
    lijn(g, x + u * 0.5, y - u * 0.56, x + u * 0.5, y - u * 0.4, '#ffffff', u * 0.04); lijn(g, x + u * 0.58, y - u * 0.56, x + u * 0.58, y - u * 0.41, '#ffffff', u * 0.04)
    cirkel(g, x + u * 0.6, y - u * 0.63, u * 0.035, '#5a2a10')
    oog(g, x + u * 0.42, y - u * 0.7, u * 0.55); oog(g, x + u * 0.52, y - u * 0.7, u * 0.55)
  },
  spinosaurus: function (g, x, y, u, f) {
    staart(g, x - u * 0.25, y - u * 0.56, x - u * 0.98, y - u * 0.4 + Math.sin(f) * u * 0.05, '#4a6a8a', u * 0.16)
    poten(g, x, y, u, '#3a5a7a', 2, 0.26, f * 1.6)
    g.fillStyle = '#e0603a'; g.beginPath(); g.moveTo(x - u * 0.38, y - u * 0.7); g.quadraticCurveTo(x - u * 0.1, y - u * 1.4, x + u * 0.3, y - u * 0.78); g.closePath(); g.fill()
    for (var i = 0; i < 4; i++) lijn(g, x - u * 0.25 + i * u * 0.14, y - u * 0.76, x - u * 0.2 + i * u * 0.12, y - u * (1.05 - Math.abs(i - 1.5) * 0.08), '#b0402a', u * 0.03)
    ellips(g, x, y - u * 0.62, u * 0.42, u * 0.25, '#5a7fa6')
    ellips(g, x + u * 0.05, y - u * 0.5, u * 0.3, u * 0.1, '#c8d6e6')
    lijn(g, x + u * 0.3, y - u * 0.7, x + u * 0.46, y - u * 0.9, '#5a7fa6', u * 0.15)
    ellips(g, x + u * 0.64, y - u * 0.92, u * 0.26, u * 0.07, '#5a7fa6')
    lijn(g, x + u * 0.25, y - u * 0.56, x + u * 0.36, y - u * 0.44, '#3a5a7a', u * 0.05)
    oog(g, x + u * 0.56, y - u * 0.96, u * 0.5)
  },
  brachiosaurus: function (g, x, y, u, f) {
    staart(g, x - u * 0.45, y - u * 0.62, x - u * 0.98, y - u * 0.44, '#8aa8b8', u * 0.14)
    poten(g, x, y, u, '#6a8a9a', 4, 0.26, f * 1.2)
    for (var i = 0; i < 4; i++) lijn(g, x + (i - 1.5) * u * 0.26, y - u * 0.4, x + (i - 1.5) * u * 0.26, y, '#6a8a9a', u * 0.15)
    ellips(g, x, y - u * 0.62, u * 0.5, u * 0.3, '#8aa8b8')
    ellips(g, x + u * 0.05, y - u * 0.48, u * 0.36, u * 0.12, '#c4d6de')
    g.strokeStyle = '#8aa8b8'; g.lineWidth = u * 0.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + u * 0.32, y - u * 0.78)
    g.quadraticCurveTo(x + u * 0.62, y - u * 1.2, x + u * 0.62 + Math.sin(f * 0.5) * u * 0.03, y - u * 1.7); g.stroke()
    ellips(g, x + u * 0.72, y - u * 1.74, u * 0.19, u * 0.1, '#8aa8b8')
    cirkel(g, x + u * 0.66, y - u * 1.82, u * 0.08, '#8aa8b8')
    oog(g, x + u * 0.74, y - u * 1.77, u * 0.5)
  },
  trex: function (g, x, y, u, f) {
    staart(g, x - u * 0.25, y - u * 0.62, x - u * 1.0, y - u * 0.55 + Math.sin(f) * u * 0.06, '#5a8a3a', u * 0.18)
    ellips(g, x - u * 0.06, y - u * 0.38, u * 0.17, u * 0.22, '#4a7a32')
    poten(g, x, y, u, '#4a7a32', 2, 0.26, f * 1.8)
    ellips(g, x, y - u * 0.68, u * 0.4, u * 0.27, '#6aa040')
    ellips(g, x + u * 0.08, y - u * 0.56, u * 0.26, u * 0.1, '#c8d890')
    ellips(g, x + u * 0.5, y - u * 1.0, u * 0.32, u * 0.18, '#6aa040')
    lijn(g, x + u * 0.28, y - u * 0.94, x + u * 0.8, y - u * 0.94, '#2a4a1a', u * 0.03)
    for (var i = 0; i < 5; i++) vorm(g, [[x + u * (0.42 + i * 0.08), y - u * 0.95], [x + u * (0.45 + i * 0.08), y - u * 0.89], [x + u * (0.48 + i * 0.08), y - u * 0.95]], '#ffffff')
    lijn(g, x + u * 0.32, y - u * 0.64, x + u * 0.42, y - u * 0.56, '#4a7a32', u * 0.05)
    oog(g, x + u * 0.5, y - u * 1.06, u * 0.6)
  },
  megalodon: function (g, x, y, u, f) {
    var b = Math.sin(f) * u * 0.05
    vorm(g, [[x - u * 0.52, y - u * 0.3 + b], [x - u * 0.88, y - u * 0.62 + b], [x - u * 0.76, y - u * 0.3 + b], [x - u * 0.88, y - u * 0.04 + b]], '#5a6f8a')
    vorm(g, [[x - u * 0.08, y - u * 0.46 + b], [x + u * 0.08, y - u * 0.8 + b], [x + u * 0.2, y - u * 0.44 + b]], '#5a6f8a')
    ellips(g, x, y - u * 0.3 + b, u * 0.6, u * 0.2, '#6a7f9a')
    ellips(g, x + u * 0.06, y - u * 0.23 + b, u * 0.46, u * 0.09, '#dfe6ee')
    vorm(g, [[x + u * 0.05, y - u * 0.2 + b], [x - u * 0.1, y - u * 0.02 + b], [x + u * 0.18, y - u * 0.18 + b]], '#5a6f8a')
    lijn(g, x + u * 0.32, y - u * 0.22 + b, x + u * 0.58, y - u * 0.25 + b, '#2a3a4a', u * 0.03)
    for (var i = 0; i < 4; i++) vorm(g, [[x + u * (0.36 + i * 0.06), y - u * 0.23 + b], [x + u * (0.38 + i * 0.06), y - u * 0.18 + b], [x + u * (0.4 + i * 0.06), y - u * 0.23 + b]], '#ffffff')
    for (var j = 0; j < 3; j++) lijn(g, x + u * (0.2 + j * 0.05), y - u * 0.36 + b, x + u * (0.18 + j * 0.05), y - u * 0.26 + b, '#4a5a6e', u * 0.02)
    oog(g, x + u * 0.42, y - u * 0.34 + b, u * 0.5)
  },
}
Object.keys(DIER2).forEach(function (k) { DIER[k] = DIER2[k] })
Object.keys(DIER3).forEach(function (k) { DIER[k] = DIER3[k] })
DIER.olifant = function (g, x, y, u, f) { olifantVorm(g, x, y, u, f, '#9ea6b8', false) }  // zelfde vorm als de mammoet
Object.assign(GROOTTE, { eend: 0.4, schaap: 0.5, varken: 0.5, hert: 0.62, rendier: 0.66, vos: 0.48, fennek: 0.42, poolvos: 0.44,
  stokstaartje: 0.4, struisvogel: 0.66, kameel: 0.74, schildpad: 0.42, nijlpaard: 0.78, walrus: 0.72, mammoet: 0.9, papegaai: 0.4, tijger: 0.66,
  dodo: 0.45, oervogel: 0.42, pteranodon: 0.55, parasaurolophus: 0.62, velociraptor: 0.55, stegosaurus: 0.7, ankylosaurus: 0.68, triceratops: 0.74,
  sabeltand: 0.62, spinosaurus: 0.8, brachiosaurus: 0.95, trex: 0.88, megalodon: 0.85 })

// ── tekenhulp voor de schuine wereld ──
function pad4(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath() }
// het ruitje van vakje (x, y), eventueel iets kleiner (in)
function ruit(x, y, inn) {
  inn = inn || 0
  return [scherm(x + inn, y + inn), scherm(x + 1 - inn, y + inn), scherm(x + 1 - inn, y + 1 - inn), scherm(x + inn, y + 1 - inn)]
}
function vulRuit(g, x, y, kleur, inn) { pad4(g, ruit(x, y, inn)); g.fillStyle = kleur; g.fill() }
function mengKleur(hex, d) {
  var n = parseInt(hex.slice(1), 16), r = (n >> 16) + d, gr = ((n >> 8) & 255) + d, b = (n & 255) + d
  return 'rgb(' + Math.max(0, Math.min(255, r)) + ',' + Math.max(0, Math.min(255, gr)) + ',' + Math.max(0, Math.min(255, b)) + ')'
}
// een blok op de grond: midden (cx, cy) in px, halve maten a (langs x) en b (langs y) in vakjes, hoogte h in px
function isoBlok(g, cx, cy, a, b, h, boven, links, rechts) {
  var ex = [TW / 2, TH / 2], ey = [-TW / 2, TH / 2]
  function p(i, j, z) { return [cx + ex[0] * i * a + ey[0] * j * b, cy + ex[1] * i * a + ey[1] * j * b - z] }
  pad4(g, [p(-1, 1, 0), p(1, 1, 0), p(1, 1, h), p(-1, 1, h)]); g.fillStyle = links; g.fill()
  pad4(g, [p(1, -1, 0), p(1, 1, 0), p(1, 1, h), p(1, -1, h)]); g.fillStyle = rechts; g.fill()
  pad4(g, [p(-1, -1, h), p(1, -1, h), p(1, 1, h), p(-1, 1, h)]); g.fillStyle = boven; g.fill()
}
function grondEllips(g, cx, cy, r, kleur) { ellips(g, cx, cy, r * TW / 2, r * TH / 2, kleur) }

// ── losse dingen: (cx, cy) = midden van het vakje op de grond ──
function tekenObject(g, soort, cx, cy, tijd) {
  var t = TW
  if (soort === 'boom') {
    grondEllips(g, cx + t * 0.08, cy + t * 0.03, 0.42, 'rgba(0,0,0,.25)')
    isoBlok(g, cx, cy, 0.06, 0.06, t * 0.32, '#7a5532', '#6b4a2a', '#5a3d22')
    cirkel(g, cx - t * 0.12, cy - t * 0.42, t * 0.2, '#2f8f45')
    cirkel(g, cx + t * 0.13, cy - t * 0.44, t * 0.19, '#287c3c')
    cirkel(g, cx, cy - t * 0.58, t * 0.23, '#37a352')
    cirkel(g, cx - t * 0.07, cy - t * 0.66, t * 0.09, 'rgba(190,255,200,.35)')
  } else if (soort === 'bloemen') {
    vulRuitPunt(g, cx, cy, 0.36, '#6b4a2e')
    var kl = ['#ff6fb5', '#ffd84d', '#ff8a5c', '#b98bff', '#ffffff'], r = rng(Math.round(cx * 7 + cy))
    for (var i = 0; i < 9; i++) {
      var a = (r() - 0.5) * 0.55, b = (r() - 0.5) * 0.55, px = cx + (a - b) * t / 2, py = cy + (a + b) * t / 4
      lijn(g, px, py, px, py - t * 0.07, '#3b8a3a', Math.max(1, t * 0.02)); cirkel(g, px, py - t * 0.08, t * 0.045, kl[i % 5])
    }
  } else if (soort === 'bank') {
    grondEllips(g, cx, cy + t * 0.04, 0.32, 'rgba(0,0,0,.2)')
    isoBlok(g, cx, cy, 0.32, 0.1, t * 0.12, '#c08a52', '#9a6a3a', '#7a5230')
    isoBlok(g, cx, cy - t * 0.05, 0.32, 0.03, t * 0.26, '#c08a52', '#9a6a3a', '#7a5230')
  } else if (soort === 'lantaarn') {
    var p = 0.8 + 0.2 * Math.sin(tijd * 2 + cx)
    var gr = g.createRadialGradient(cx, cy, 0, cx, cy, t * 0.9)
    gr.addColorStop(0, 'rgba(255,214,120,' + (0.3 * p) + ')'); gr.addColorStop(1, 'rgba(255,214,120,0)')
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, t * 0.9, t * 0.45, 0, 0, TAU); g.fill()
    isoBlok(g, cx, cy, 0.04, 0.04, t * 0.62, '#4a5070', '#3a4060', '#2c3150')
    gloed(g, '#ffd98a', 16 * p); cirkel(g, cx, cy - t * 0.68, t * 0.09, '#fff1c4'); g.shadowBlur = 0
  } else if (soort === 'ijskraam' || soort === 'snackbar' || soort === 'souvenir') {
    var ijs = soort === 'ijskraam', sou = soort === 'souvenir', kleur = ijs ? '#ff6fb5' : sou ? '#9b6bff' : '#ff8a3c'
    grondEllips(g, cx + t * 0.05, cy + t * 0.03, 0.45, 'rgba(0,0,0,.25)')
    isoBlok(g, cx, cy, 0.36, 0.36, t * 0.34, '#f4f1ea', '#e6e0d4', '#cfc8b8')
    isoBlok(g, cx, cy - t * 0.12, 0.38, 0.38, t * 0.05, '#ffffff', '#3ef0ff', '#2ad0dd')
    // gestreept dak
    var dakY = cy - t * 0.42
    for (var s = 0; s < 4; s++) {
      var a0 = -0.42 + s * 0.21
      pad4(g, [scherm2(cx, dakY, a0, -0.42), scherm2(cx, dakY, a0 + 0.21, -0.42), scherm2(cx, dakY, a0 + 0.21, 0.42), scherm2(cx, dakY, a0, 0.42)])
      g.fillStyle = s % 2 ? '#ffffff' : kleur; g.fill()
    }
    var vx = scherm2(cx, dakY, -0.42, 0.42), vr = scherm2(cx, dakY, 0.42, 0.42), vb = scherm2(cx, dakY, 0.42, -0.42)
    pad4(g, [vx, vr, [vr[0], vr[1] + t * 0.07], [vx[0], vx[1] + t * 0.07]]); g.fillStyle = kleur; g.fill()
    pad4(g, [vr, vb, [vb[0], vb[1] + t * 0.07], [vr[0], vr[1] + t * 0.07]]); g.fillStyle = mengKleur(kleur, -40); g.fill()
    // bord
    gloed(g, ijs ? '#7df9ff' : '#ffd84d', 10)
    if (sou) { cirkel(g, cx, dakY - t * 0.16, t * 0.1, '#c08a52'); cirkel(g, cx - t * 0.08, dakY - t * 0.25, t * 0.045, '#c08a52'); cirkel(g, cx + t * 0.08, dakY - t * 0.25, t * 0.045, '#c08a52'); cirkel(g, cx, dakY - t * 0.13, t * 0.04, '#f2dcb4') }
    else if (ijs) { g.fillStyle = '#e8b06a'; pad4(g, [[cx - t * 0.07, dakY - t * 0.12], [cx + t * 0.07, dakY - t * 0.12], [cx, dakY + t * 0.06]]); g.fill(); cirkel(g, cx, dakY - t * 0.15, t * 0.08, '#ffb3d9') }
    else { g.fillStyle = '#d63a2a'; g.fillRect(cx - t * 0.08, dakY - t * 0.2, t * 0.16, t * 0.16); g.fillStyle = '#ffd84d'; for (var q = 0; q < 4; q++) g.fillRect(cx - t * 0.06 + q * t * 0.035, dakY - t * 0.3, t * 0.02, t * 0.12) }
    g.shadowBlur = 0
  } else if (soort === 'speeltuin') {
    grondEllips(g, cx, cy, 0.46, 'rgba(230,200,140,.55)')
    isoBlok(g, cx - t * 0.12, cy - t * 0.02, 0.12, 0.12, t * 0.42, '#ff4fd8', '#d63ab5', '#b02e95')
    lijn(g, cx - t * 0.08, cy - t * 0.42, cx + t * 0.3, cy + t * 0.05, '#3ef0ff', t * 0.08)
    lijn(g, cx - t * 0.08, cy - t * 0.42, cx + t * 0.3, cy + t * 0.05, 'rgba(255,255,255,.5)', t * 0.02)
    lijn(g, cx - t * 0.32, cy + t * 0.02, cx - t * 0.32, cy - t * 0.3, '#ffd84d', t * 0.04)
    lijn(g, cx - t * 0.32, cy - t * 0.3, cx - t * 0.12, cy - t * 0.4, '#ffd84d', t * 0.04)
  } else if (soort === 'fontein') {
    grondEllips(g, cx, cy, 0.48, '#8a90a8'); grondEllips(g, cx, cy - t * 0.03, 0.4, '#2f8fe8'); grondEllips(g, cx - t * 0.05, cy - t * 0.05, 0.18, 'rgba(180,230,255,.5)')
    isoBlok(g, cx, cy, 0.06, 0.06, t * 0.3, '#c9cfe0', '#a8aec4', '#8a90a8')
    for (var w = 0; w < 8; w++) {
      var fa = (tijd * 1.2 + w / 8) % 1, ang = w / 8 * TAU
      cirkel(g, cx + Math.cos(ang) * t * 0.3 * fa, cy - t * 0.32 + Math.sin(ang) * t * 0.15 * fa + fa * fa * t * 0.32 - Math.sin(fa * Math.PI) * t * 0.12, t * 0.025, 'rgba(190,240,255,' + (1 - fa * 0.7) + ')')
    }
    gloed(g, '#7df9ff', 12); cirkel(g, cx, cy - t * 0.33, t * 0.05, '#e6fbff'); g.shadowBlur = 0
  } else if (soort === 'draaimolen') {
    grondEllips(g, cx, cy + t * 0.03, 0.48, 'rgba(0,0,0,.25)')
    grondEllips(g, cx, cy, 0.44, '#c9cfe0'); grondEllips(g, cx, cy - t * 0.03, 0.4, '#ff4fd8')
    var top = cy - t * 0.62
    for (var h2 = 0; h2 < 3; h2++) {
      var ha = tijd * 1.4 + h2 * TAU / 3, hx = cx + Math.cos(ha) * t * 0.26, hy = cy - t * 0.05 + Math.sin(ha) * t * 0.13, op = Math.sin(tijd * 4 + h2) * t * 0.04
      lijn(g, hx, top + t * 0.1, hx, hy - t * 0.12 + op, '#ffd84d', Math.max(1, t * 0.02))
      ellips(g, hx, hy - t * 0.14 + op, t * 0.09, t * 0.05, ['#ffffff', '#3ef0ff', '#ffd23f'][h2]); cirkel(g, hx + t * 0.07, hy - t * 0.19 + op, t * 0.035, ['#ffffff', '#3ef0ff', '#ffd23f'][h2])
    }
    isoBlok(g, cx, cy, 0.05, 0.05, t * 0.62, '#ffd84d', '#e0b830', '#c09a20')
    for (var s2 = 0; s2 < 8; s2++) {
      var a1 = s2 / 8 * TAU, a2 = (s2 + 1) / 8 * TAU
      vorm(g, [[cx, top - t * 0.2], [cx + Math.cos(a1) * t * 0.44, top + Math.sin(a1) * t * 0.22], [cx + Math.cos(a2) * t * 0.44, top + Math.sin(a2) * t * 0.22]], s2 % 2 ? '#ffffff' : '#ff4fd8')
    }
    gloed(g, '#ff4fd8', 10); cirkel(g, cx, top - t * 0.22, t * 0.04, '#ffe9ff'); g.shadowBlur = 0
  } else if (soort === 'restaurant') {
    grondEllips(g, cx + t * 0.05, cy + t * 0.03, 0.5, 'rgba(0,0,0,.25)')
    isoBlok(g, cx, cy, 0.42, 0.42, t * 0.42, '#f4e8d4', '#e6d8c0', '#cdbea4')
    var rt = cy - t * 0.42, rn = scherm2(cx, rt, -0.46, -0.46), ro = scherm2(cx, rt, 0.46, -0.46), rz = scherm2(cx, rt, 0.46, 0.46), rw = scherm2(cx, rt, -0.46, 0.46)
    var nk1 = scherm2(cx, rt - t * 0.22, -0.46, 0), nk2 = scherm2(cx, rt - t * 0.22, 0.46, 0)
    pad4(g, [rw, rz, nk2, nk1]); g.fillStyle = '#d63a2a'; g.fill()
    pad4(g, [rn, ro, nk2, nk1]); g.fillStyle = '#a82a20'; g.fill()
    pad4(g, [rz, ro, nk2]); g.fillStyle = '#b8302a'; g.fill()
    gloed(g, '#ffd98a', 10); g.fillStyle = '#ffe08a'
    ;[-0.24, 0.18].forEach(function (a) { var rp = scherm2(cx, cy - t * 0.22, a, 0.42); g.fillRect(rp[0] - t * 0.05, rp[1] - t * 0.06, t * 0.1, t * 0.09) })
    var rr = scherm2(cx, cy - t * 0.22, 0.42, 0); g.fillRect(rr[0] - t * 0.05, rr[1] - t * 0.06, t * 0.1, t * 0.09); g.shadowBlur = 0
    cirkel(g, cx, rt - t * 0.34, t * 0.1, '#ffffff'); cirkel(g, cx, rt - t * 0.34, t * 0.07, '#ffb347'); cirkel(g, cx - t * 0.02, rt - t * 0.36, t * 0.02, '#d63a2a'); cirkel(g, cx + t * 0.03, rt - t * 0.32, t * 0.02, '#d63a2a')
  } else if (soort === 'reuzenrad') {
    grondEllips(g, cx, cy + t * 0.03, 0.46, 'rgba(0,0,0,.25)')
    var wx = cx, wy = cy - t * 0.78, wr = t * 0.6
    lijn(g, cx - t * 0.3, cy, wx, wy, '#8a90a8', Math.max(2, t * 0.05)); lijn(g, cx + t * 0.3, cy, wx, wy, '#8a90a8', Math.max(2, t * 0.05))
    g.strokeStyle = '#3ef0ff'; g.lineWidth = Math.max(1.5, t * 0.03); gloed(g, '#3ef0ff', 8); g.beginPath(); g.arc(wx, wy, wr, 0, TAU); g.stroke(); g.shadowBlur = 0
    for (var k3 = 0; k3 < 8; k3++) {
      var ka = tijd * 0.4 + k3 / 8 * TAU, kx = wx + Math.cos(ka) * wr, ky = wy + Math.sin(ka) * wr
      lijn(g, wx, wy, kx, ky, 'rgba(200,240,255,.6)', 1)
      lijn(g, kx, ky, kx, ky + t * 0.06, '#c9cfe0', 1)
      g.fillStyle = KLEUREN[k3 % KLEUREN.length]; g.fillRect(kx - t * 0.06, ky + t * 0.06, t * 0.12, t * 0.09)
    }
    cirkel(g, wx, wy, t * 0.06, '#ffd84d')
  }
}
// punt op een vlak dat op hoogte ligt: (cx, cy) midden, a/b in vakjes
function scherm2(cx, cy, a, b) { return [cx + (a - b) * TW / 2, cy + (a + b) * TH / 2] }
function vulRuitPunt(g, cx, cy, r, kleur) { pad4(g, [scherm2(cx, cy, -r, -r), scherm2(cx, cy, r, -r), scherm2(cx, cy, r, r), scherm2(cx, cy, -r, r)]); g.fillStyle = kleur; g.fill() }

// ── hokken ──
var BODEM_KLEUR = { gras: ['#63bb58', '#5db352'], zand: ['#dcb862', '#d3ae58'], sneeuw: ['#eef6ff', '#e2eefb'], bos: ['#2f7c3f', '#2a733a'], vulkaan: ['#5a3a34', '#523530'] }
var HEK_GLOED = { gras: '#ffd27a', zand: '#ffd27a', sneeuw: '#bff6ff', bos: '#9cff7a', vulkaan: '#ff9a5a' }
function hekStuk(g, a, b, bodem, glans) {
  var hp = 0.34 * TW, lat = '#c8945e', paal = '#a8774a'
  lijn(g, a[0], a[1] - hp * 0.75, b[0], b[1] - hp * 0.75, lat, Math.max(1.5, TW * 0.035))
  lijn(g, a[0], a[1] - hp * 0.35, b[0], b[1] - hp * 0.35, lat, Math.max(1.5, TW * 0.035))
  if (glans) { g.globalAlpha = 0.55; gloed(g, HEK_GLOED[bodem] || '#ffd27a', 8); lijn(g, a[0], a[1] - hp * 0.75, b[0], b[1] - hp * 0.75, HEK_GLOED[bodem] || '#ffd27a', 1); g.shadowBlur = 0; g.globalAlpha = 1 }
  ;[a, b].forEach(function (p) { lijn(g, p[0], p[1], p[0], p[1] - hp, paal, Math.max(2.5, TW * 0.06)); cirkel(g, p[0], p[1] - hp, Math.max(1.5, TW * 0.035), lat) })
}
// de randen van een hok: achterkant (boven) en voorkant (onder, vóór de dieren langs)
function hekRanden(v) {
  var achter = [], voor = []
  for (var i = 0; i < v.w; i++) { achter.push([v.x + i, v.y, v.x + i + 1, v.y]); voor.push([v.x + i, v.y + v.h, v.x + i + 1, v.y + v.h]) }
  for (var j = 0; j < v.h; j++) { achter.push([v.x, v.y + j, v.x, v.y + j + 1]); voor.push([v.x + v.w, v.y + j, v.x + v.w, v.y + j + 1]) }
  return { achter: achter, voor: voor }
}
// bodem per vakje, met wat textuur; water van de badjes ligt plat in de grond
function tekenHokGrond(g, v) {
  var kl = BODEM_KLEUR[v.bodem] || BODEM_KLEUR.gras, r = rng(v.x * 31 + v.y * 7 + 1)
  for (var i = 0; i < v.w; i++) for (var j = 0; j < v.h; j++) {
    var x = v.x + i, y = v.y + j
    vulRuit(g, x, y, kl[(i + j) % 2])
    var p = scherm(x + 0.2 + r() * 0.6, y + 0.2 + r() * 0.6)
    if (v.bodem === 'gras') { lijn(g, p[0], p[1], p[0] + TW * 0.02, p[1] - TW * 0.06, '#4c9a46', Math.max(1, TW * 0.02)); if (r() < 0.2) cirkel(g, p[0] + TW * 0.1, p[1], TW * 0.02, '#fff') }
    else if (v.bodem === 'zand') { cirkel(g, p[0], p[1], TW * 0.018, '#b89640'); cirkel(g, p[0] + TW * 0.08, p[1] + TW * 0.03, TW * 0.012, '#c9a650') }
    else if (v.bodem === 'sneeuw') { cirkel(g, p[0], p[1], TW * 0.03, '#ffffff'); cirkel(g, p[0] + TW * 0.07, p[1] + TW * 0.02, TW * 0.02, '#d8eaff') }
    else if (v.bodem === 'bos') { ellips(g, p[0], p[1], TW * 0.07, TW * 0.03, '#1f6a32'); cirkel(g, p[0] + TW * 0.09, p[1] + TW * 0.03, TW * 0.018, '#7a5232') }
    else if (v.bodem === 'vulkaan') { lijn(g, p[0] - TW * 0.06, p[1], p[0] + TW * 0.02, p[1] + TW * 0.02, '#ff7a3a', Math.max(1, TW * 0.018)); lijn(g, p[0] + TW * 0.02, p[1] + TW * 0.02, p[0] + TW * 0.08, p[1] - TW * 0.01, '#ffb35a', Math.max(1, TW * 0.012)); cirkel(g, p[0] + TW * 0.1, p[1] + TW * 0.04, TW * 0.02, '#2e1e1a') }
  }
  v.items.forEach(function (it) { if (it.soort === 'water') tekenWater(g, v, it) })
}
// een badje: water met een rand; aangrenzende badjes lopen in elkaar over
function tekenWater(g, v, it) {
  var x = it.x, y = it.y, isW = function (a, b) { var o = DT.itemOp(v, a, b); return o && o.soort === 'water' }
  var rand = v.bodem === 'sneeuw' ? '#cfe6fb' : v.bodem === 'zand' ? '#b89a5a' : v.bodem === 'vulkaan' ? '#3a2a26' : '#8a7a5a'
  vulRuit(g, x, y, rand)
  var inN = isW(x, y - 1) ? 0 : 0.12, inW = isW(x - 1, y) ? 0 : 0.12, inO = isW(x + 1, y) ? 0 : 0.12, inZ = isW(x, y + 1) ? 0 : 0.12
  pad4(g, [scherm(x + inW, y + inN), scherm(x + 1 - inO, y + inN), scherm(x + 1 - inO, y + 1 - inZ), scherm(x + inW, y + 1 - inZ)])
  g.fillStyle = v.bodem === 'sneeuw' ? '#3a8fe8' : '#2f8fe8'; g.fill()
  var c = scherm(x + 0.45, y + 0.4); ellips(g, c[0], c[1], TW * 0.12, TW * 0.04, 'rgba(190,235,255,.45)')
}

// ── inrichting in een hok: (cx, cy) = midden van het vakje op de grond ──
function tekenItem(g, soort, cx, cy, tijd) {
  var t = TW
  if (soort === 'voerbak') {
    grondEllips(g, cx, cy + t * 0.02, 0.32, 'rgba(0,0,0,.2)')
    isoBlok(g, cx, cy, 0.3, 0.14, t * 0.12, '#8a6a44', '#7a5a38', '#5e452a')
    ellips(g, cx, cy - t * 0.13, t * 0.2, t * 0.05, '#f2d46a'); lijn(g, cx - t * 0.1, cy - t * 0.15, cx + t * 0.05, cy - t * 0.12, '#c9a640', 1)
    cirkel(g, cx + t * 0.08, cy - t * 0.15, t * 0.03, '#ff8a3c')
  } else if (soort === 'binnen') {
    grondEllips(g, cx + t * 0.05, cy + t * 0.03, 0.46, 'rgba(0,0,0,.22)')
    isoBlok(g, cx, cy, 0.36, 0.36, t * 0.3, '#d9b98a', '#c8a070', '#a8845a')
    // deur aan de voorkant
    var d1 = scherm2(cx, cy, -0.12, 0.36), d2 = scherm2(cx, cy, 0.12, 0.36)
    pad4(g, [d1, d2, [d2[0], d2[1] - t * 0.2], [d1[0], d1[1] - t * 0.2]]); g.fillStyle = '#5a3d22'; g.fill()
    // schuin dak
    var top = cy - t * 0.3, n = scherm2(cx, top, -0.42, -0.42), o = scherm2(cx, top, 0.42, -0.42), z = scherm2(cx, top, 0.42, 0.42), w = scherm2(cx, top, -0.42, 0.42)
    var nok1 = scherm2(cx, top - t * 0.2, -0.42, 0), nok2 = scherm2(cx, top - t * 0.2, 0.42, 0)
    pad4(g, [w, z, nok2, nok1]); g.fillStyle = '#c0453a'; g.fill()
    pad4(g, [n, o, nok2, nok1]); g.fillStyle = '#9a3028'; g.fill()
    pad4(g, [z, o, nok2]); g.fillStyle = '#a83a30'; g.fill()
    gloed(g, '#ffd98a', 8); var raam = scherm2(cx, cy - t * 0.17, 0.36, 0); g.fillStyle = '#ffe08a'; g.fillRect(raam[0] - t * 0.04, raam[1] - t * 0.04, t * 0.08, t * 0.07); g.shadowBlur = 0
  } else if (soort === 'boom') {
    tekenObject(g, 'boom', cx, cy, tijd)
  } else if (soort === 'rots') {
    grondEllips(g, cx + t * 0.04, cy + t * 0.03, 0.36, 'rgba(0,0,0,.22)')
    g.fillStyle = '#8f8a84'; g.beginPath(); g.moveTo(cx - t * 0.32, cy + t * 0.06); g.quadraticCurveTo(cx - t * 0.3, cy - t * 0.3, cx - t * 0.02, cy - t * 0.34)
    g.quadraticCurveTo(cx + t * 0.3, cy - t * 0.28, cx + t * 0.32, cy + t * 0.04); g.quadraticCurveTo(cx, cy + t * 0.16, cx - t * 0.32, cy + t * 0.06); g.fill()
    g.fillStyle = '#aaa59e'; g.beginPath(); g.moveTo(cx - t * 0.2, cy - t * 0.12); g.quadraticCurveTo(cx - t * 0.12, cy - t * 0.3, cx + t * 0.05, cy - t * 0.3); g.quadraticCurveTo(cx - t * 0.02, cy - t * 0.14, cx - t * 0.2, cy - t * 0.12); g.fill()
    cirkel(g, cx + t * 0.2, cy - t * 0.02, t * 0.1, '#7f7a74')
  } else if (soort === 'afdak') {
    grondEllips(g, cx, cy, 0.5, 'rgba(0,0,0,.18)')
    var h = t * 0.5
    ;[[-0.38, -0.38], [0.38, -0.38], [0.38, 0.38], [-0.38, 0.38]].forEach(function (q) { var p = scherm2(cx, cy, q[0], q[1]); lijn(g, p[0], p[1], p[0], p[1] - h, '#7a5532', Math.max(2, t * 0.04)) })
    var top = cy - h
    pad4(g, [scherm2(cx, top, -0.46, -0.46), scherm2(cx, top, 0.46, -0.46), scherm2(cx, top, 0.46, 0.46), scherm2(cx, top, -0.46, 0.46)])
    g.fillStyle = 'rgba(62,240,255,.85)'; g.fill()
    for (var s = 0; s < 3; s++) { var a0 = -0.46 + s * 0.3; pad4(g, [scherm2(cx, top, a0, -0.46), scherm2(cx, top, a0 + 0.15, -0.46), scherm2(cx, top, a0 + 0.15, 0.46), scherm2(cx, top, a0, 0.46)]); g.fillStyle = 'rgba(255,255,255,.75)'; g.fill() }
    var vz = scherm2(cx, top, -0.46, 0.46), vo = scherm2(cx, top, 0.46, 0.46)
    pad4(g, [vz, vo, [vo[0], vo[1] + t * 0.05], [vz[0], vz[1] + t * 0.05]]); g.fillStyle = '#2ad0dd'; g.fill()
  } else if (soort === 'klimrek') {
    grondEllips(g, cx, cy, 0.42, 'rgba(0,0,0,.18)')
    var hh = t * 0.6, P = [[-0.32, -0.32], [0.32, -0.32], [0.32, 0.32], [-0.32, 0.32]].map(function (q) { return scherm2(cx, cy, q[0], q[1]) })
    P.forEach(function (p) { lijn(g, p[0], p[1], p[0], p[1] - hh, '#9a6a3a', Math.max(2, t * 0.045)) })
    ;[0.45, 0.8, 1].forEach(function (f) { for (var k = 0; k < 4; k++) { var a = P[k], b = P[(k + 1) % 4]; lijn(g, a[0], a[1] - hh * f, b[0], b[1] - hh * f, '#c08a52', Math.max(1.5, t * 0.03)) } })
    g.strokeStyle = '#e8d6a8'; g.lineWidth = Math.max(1, t * 0.02); g.beginPath(); g.moveTo(P[1][0], P[1][1] - hh); g.quadraticCurveTo(cx + t * 0.15, cy - t * 0.1, P[2][0] - t * 0.05, P[2][1] - hh * 0.3); g.stroke()
    pad4(g, [[P[0][0], P[0][1] - hh], [P[1][0], P[1][1] - hh], [P[2][0], P[2][1] - hh], [P[3][0], P[3][1] - hh]]); g.fillStyle = 'rgba(192,138,82,.6)'; g.fill()
  } else if (soort === 'bamboe') {
    for (var b = 0; b < 6; b++) {
      var bp = scherm2(cx, cy, -0.25 + (b % 3) * 0.25, -0.2 + Math.floor(b / 3) * 0.35), bh = t * (0.55 + (b % 3) * 0.15)
      lijn(g, bp[0], bp[1], bp[0], bp[1] - bh, '#8fc84a', Math.max(2, t * 0.04))
      for (var k2 = 1; k2 < 4; k2++) lijn(g, bp[0] - t * 0.02, bp[1] - bh * k2 / 4, bp[0] + t * 0.02, bp[1] - bh * k2 / 4, '#5f9a2a', 1)
      ellips(g, bp[0] + t * 0.06, bp[1] - bh, t * 0.09, t * 0.025, '#6fbf3a')
    }
  } else if (soort === 'varens') {
    grondEllips(g, cx, cy + t * 0.02, 0.3, 'rgba(0,0,0,.18)')
    for (var v2 = 0; v2 < 6; v2++) {
      var va = -1.1 + v2 * 0.44, vl = t * (0.32 + (v2 % 2) * 0.1), ex = cx + Math.sin(va) * vl, ey = cy - Math.cos(va) * vl * 0.9
      g.strokeStyle = '#2f8a3a'; g.lineWidth = Math.max(1.5, t * 0.03); g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + Math.sin(va) * vl * 0.4, cy - vl * 0.9, ex, ey); g.stroke()
      for (var b2 = 1; b2 < 5; b2++) { var f2 = b2 / 5, lx = cx + (ex - cx) * f2, ly = cy + (ey - cy) * f2 - Math.sin(f2 * Math.PI) * vl * 0.25; ellips(g, lx, ly, t * 0.05 * (1 - f2 * 0.5), t * 0.018, '#4fb84a') }
    }
  } else if (soort === 'modder') {
    grondEllips(g, cx, cy, 0.46, '#4a3420'); grondEllips(g, cx, cy - t * 0.01, 0.38, '#6b4a2a'); grondEllips(g, cx - t * 0.06, cy - t * 0.03, 0.16, 'rgba(160,120,80,.45)')
    for (var m2 = 0; m2 < 3; m2++) { var mf = (tijd * 0.6 + m2 / 3) % 1, mp = scherm2(cx, cy, -0.2 + m2 * 0.2, (m2 % 2) * 0.15 - 0.05); g.globalAlpha = 1 - mf; cirkel(g, mp[0], mp[1] - mf * t * 0.06, t * (0.02 + mf * 0.03), '#8a6a44'); g.globalAlpha = 1 }
  }
}

// ── de ingang: een poort met een bord ──
function tekenIngang(g, tijd) {
  var a = scherm(DT.INGANG.x, DT.INGANG.y + 1), b = scherm(DT.INGANG.x + 1, DT.INGANG.y + 1), h = TW * 0.95
  ;[a, b].forEach(function (p) { isoBlok(g, p[0], p[1], 0.09, 0.09, h, '#5a4a8a', '#43376b', '#342a55') })
  var top = TW * 0.12
  pad4(g, [[a[0] - TW * 0.12, a[1] - h - top], [b[0] + TW * 0.12, b[1] - h - top], [b[0] + TW * 0.12, b[1] - h + top * 0.6], [a[0] - TW * 0.12, a[1] - h + top * 0.6]])
  g.fillStyle = '#241c44'; g.fill()
  var p = 0.85 + 0.15 * Math.sin(tijd * 3)
  gloed(g, '#ff4fd8', 14 * p); g.strokeStyle = '#ff4fd8'; g.lineWidth = 2; g.stroke(); g.shadowBlur = 0
  g.save(); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - h - top * 0.15); g.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]))
  g.fillStyle = '#ffe9ff'; g.font = '800 ' + Math.max(8, TW * 0.13) + 'px "Russo One", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  gloed(g, '#ff4fd8', 8); g.fillText('DIERENTUIN', 0, 0); g.shadowBlur = 0; g.restore()
}

// ── achtergrond per wereld ──
function tekenAchtergrond(g, mid, straal) {
  if (THEMA.zon) {
    var zx = W * 0.82, zy = H * 0.2, z = g.createRadialGradient(zx, zy, 0, zx, zy, W * 0.25)
    z.addColorStop(0, 'rgba(255,230,150,.9)'); z.addColorStop(0.12, 'rgba(255,190,90,.6)'); z.addColorStop(1, 'rgba(255,140,60,0)')
    g.fillStyle = z; g.fillRect(0, 0, W, H)
    g.fillStyle = 'rgba(120,40,60,.35)'; g.beginPath(); g.moveTo(0, H * 0.75); g.quadraticCurveTo(W * 0.25, H * 0.6, W * 0.5, H * 0.72); g.quadraticCurveTo(W * 0.75, H * 0.62, W, H * 0.7); g.lineTo(W, H); g.lineTo(0, H); g.fill()
  }
  if (THEMA.noorderlicht) {
    ;[['80,255,190', 0.14, 0.18], ['120,200,255', 0.2, 0.12], ['200,120,255', 0.26, 0.08]].forEach(function (b, i) {
      g.strokeStyle = 'rgba(' + b[0] + ',' + b[2] + ')'; g.lineWidth = H * 0.06; g.lineCap = 'round'
      g.beginPath(); for (var k = 0; k <= 20; k++) { var x = W * k / 20, y = H * b[1] + Math.sin(k * 0.6 + i) * H * 0.04; if (k) g.lineTo(x, y); else g.moveTo(x, y) } g.stroke()
    })
  }
  if (THEMA.zee) {
    var zee = g.createLinearGradient(0, 0, 0, H)
    zee.addColorStop(0, 'rgba(10,80,130,.0)'); zee.addColorStop(0.35, 'rgba(14,110,160,.75)'); zee.addColorStop(1, 'rgba(10,70,120,.95)')
    g.fillStyle = zee; g.fillRect(0, 0, W, H)
    var r = rng(8)
    for (var k = 0; k < 70; k++) { var x = r() * W, y = H * (0.3 + r() * 0.7); lijn(g, x, y, x + 10 + r() * 16, y, 'rgba(200,250,255,' + (0.15 + r() * 0.25) + ')', 1.5) }
    // lichte lagune en een strandje in de vorm van het eiland
    var gb = DT.gebied(S)
    ;[[2.2, 'rgba(90,220,220,.35)'], [0.9, 'rgba(232,214,160,.9)']].forEach(function (l) {
      var m = l[0]
      pad4(g, [scherm(gb.x0 - m, gb.y0 - m), scherm(gb.x1 + 1 + m, gb.y0 - m), scherm(gb.x1 + 1 + m, gb.y1 + 1 + m), scherm(gb.x0 - m, gb.y1 + 1 + m)].map(function (p) { return [p[0], p[1] + DIEPTE] }))
      g.fillStyle = l[1]; g.fill()
    })
  }
  if (THEMA.vulkaan) {
    var vx = W * 0.82, vb = H * 0.78, vt = H * 0.3, vw = W * 0.2
    var lg = g.createRadialGradient(vx, vt, 0, vx, vt, W * 0.22)
    lg.addColorStop(0, 'rgba(255,140,60,.55)'); lg.addColorStop(1, 'rgba(255,90,40,0)'); g.fillStyle = lg; g.fillRect(0, 0, W, H)
    g.fillStyle = '#2a1418'; g.beginPath(); g.moveTo(vx - vw, vb); g.lineTo(vx - vw * 0.18, vt); g.lineTo(vx + vw * 0.18, vt); g.lineTo(vx + vw, vb); g.closePath(); g.fill()
    g.strokeStyle = '#ff6a2a'; g.lineWidth = Math.max(2, W * 0.004); g.lineCap = 'round'
    ;[[-0.1, 0.35], [0.06, 0.5], [0.14, 0.28]].forEach(function (l) { g.beginPath(); g.moveTo(vx + vw * l[0], vt); g.quadraticCurveTo(vx + vw * (l[0] * 2 + 0.05), vt + (vb - vt) * l[1] * 0.6, vx + vw * l[0] * 3, vt + (vb - vt) * l[1]); g.stroke() })
    gloed(g, '#ff7a3a', 20); ellips(g, vx, vt, vw * 0.18, H * 0.012, '#ffb35a'); g.shadowBlur = 0
    for (var r2 = 0; r2 < 6; r2++) { var ry = vt - H * (0.04 + r2 * 0.035) - ((tijd * 8) % (H * 0.035)), rx = vx + Math.sin(r2 * 1.7 + tijd * 0.3) * W * 0.02 + r2 * W * 0.008; cirkel(g, rx, ry, W * (0.018 + r2 * 0.006), 'rgba(90,70,80,' + (0.35 - r2 * 0.05) + ')') }
    g.fillStyle = 'rgba(40,16,24,.55)'; g.beginPath(); g.moveTo(0, H * 0.8); g.quadraticCurveTo(W * 0.2, H * 0.66, W * 0.45, H * 0.76); g.lineTo(W * 0.45, H); g.lineTo(0, H); g.fill()
  }
  if (THEMA.aarde) {
    var ax = W * 0.84, ay = H * 0.2, ar = Math.min(W, H) * 0.08
    var ag = g.createRadialGradient(ax - ar * 0.3, ay - ar * 0.3, ar * 0.1, ax, ay, ar)
    ag.addColorStop(0, '#6ac0ff'); ag.addColorStop(1, '#1a4a9a'); g.fillStyle = ag; g.beginPath(); g.arc(ax, ay, ar, 0, TAU); g.fill()
    g.fillStyle = '#3fa85a'; g.beginPath(); g.ellipse(ax - ar * 0.2, ay - ar * 0.1, ar * 0.35, ar * 0.25, 0.5, 0, TAU); g.fill(); g.beginPath(); g.ellipse(ax + ar * 0.35, ay + ar * 0.3, ar * 0.25, ar * 0.18, -0.4, 0, TAU); g.fill()
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(ax + ar * 0.1, ay - ar * 0.45, ar * 0.4, ar * 0.1, 0.2, 0, TAU); g.fill()
    var hal = g.createRadialGradient(ax, ay, ar, ax, ay, ar * 1.5); hal.addColorStop(0, 'rgba(110,190,255,.35)'); hal.addColorStop(1, 'rgba(110,190,255,0)'); g.fillStyle = hal; g.beginPath(); g.arc(ax, ay, ar * 1.5, 0, TAU); g.fill()
  }
}
// sneeuwvlokken in de IJswereld
var VLOKKEN = (function () { var r = rng(12), l = []; for (var i = 0; i < 90; i++) l.push({ x: r(), y: r(), v: 0.02 + r() * 0.04, s: 1 + r() * 2.2, f: r() * TAU }); return l })()
function tekenSneeuw(g, dt) {
  VLOKKEN.forEach(function (v) {
    v.y += v.v * dt; if (v.y > 1) v.y -= 1
    var x = (v.x + Math.sin(tijd * 0.6 + v.f) * 0.01) * W
    cirkel(g, x, v.y * H, v.s, 'rgba(255,255,255,.75)')
  })
}

// ── vaste laag: lucht, eiland, gras, paden en de grond van de verblijven ──
var laag = document.createElement('canvas'), vuil = true, ST = DT.stats(S)
var STERREN = (function () { var r = rng(5), l = []; for (var i = 0; i < 120; i++) l.push([r(), r(), r() * 1.3 + 0.3]); return l })()
function bouwLaag() {
  laag.width = cv.width; laag.height = cv.height
  var g = laag.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0)
  var lucht = g.createLinearGradient(0, 0, 0, H)
  lucht.addColorStop(0, THEMA.lucht[0]); lucht.addColorStop(0.6, THEMA.lucht[1]); lucht.addColorStop(1, THEMA.lucht[2])
  g.fillStyle = lucht; g.fillRect(0, 0, W, H)
  if (THEMA.sterren) STERREN.forEach(function (s) { g.fillStyle = 'rgba(255,255,255,' + (0.3 + s[2] * 0.3) + ')'; g.fillRect(s[0] * W, s[1] * H, s[2], s[2]) })
  var geb = DT.gebied(S), mid = scherm((geb.x0 + geb.x1 + 1) / 2, (geb.y0 + geb.y1 + 1) / 2), straal = (geb.x1 - geb.x0 + geb.y1 - geb.y0) * TW * 0.4
  tekenAchtergrond(g, mid, straal)
  var gl = g.createRadialGradient(mid[0], mid[1], 0, mid[0], mid[1], straal)
  gl.addColorStop(0, 'rgba(' + THEMA.gloed + ',.18)'); gl.addColorStop(1, 'rgba(' + THEMA.gloed + ',0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H)

  // aarde-rand onder het eiland
  for (var x = geb.x0; x <= geb.x1; x++) {
    var a = scherm(x, geb.y1 + 1), b = scherm(x + 1, geb.y1 + 1)
    pad4(g, [a, b, [b[0], b[1] + DIEPTE], [a[0], a[1] + DIEPTE]]); g.fillStyle = THEMA.zijL[x % 2]; g.fill()
  }
  for (var y = geb.y0; y <= geb.y1; y++) {
    var c = scherm(geb.x1 + 1, y), d = scherm(geb.x1 + 1, y + 1)
    pad4(g, [c, d, [d[0], d[1] + DIEPTE], [c[0], c[1] + DIEPTE]]); g.fillStyle = THEMA.zijR[y % 2]; g.fill()
  }
  var ondL = scherm(geb.x0, geb.y1 + 1), ondM = scherm(geb.x1 + 1, geb.y1 + 1), ondR = scherm(geb.x1 + 1, geb.y0)
  lijn(g, ondL[0], ondL[1] + DIEPTE * 0.45, ondM[0], ondM[1] + DIEPTE * 0.45, 'rgba(0,0,0,.15)', 2)
  lijn(g, ondM[0], ondM[1] + DIEPTE * 0.45, ondR[0], ondR[1] + DIEPTE * 0.45, 'rgba(0,0,0,.15)', 2)

  // gras
  var r = rng(4), GRAS = THEMA.gras, lw = Math.max(1, TW * 0.02)
  for (var gy = geb.y0; gy <= geb.y1; gy++) for (var gx = geb.x0; gx <= geb.x1; gx++) {
    vulRuit(g, gx, gy, GRAS[(gx * 7 + gy * 3) % 3])
    if (!DT.vrij(S, gx, gy)) continue
    var q = scherm(gx + 0.2 + r() * 0.6, gy + 0.2 + r() * 0.6), kans = r(), fl = scherm(gx + 0.2 + r() * 0.6, gy + 0.2 + r() * 0.6), extra = r()
    if (THEMA.detail === 'gras') {
      if (kans < 0.6) { lijn(g, q[0], q[1], q[0] - TW * 0.03, q[1] - TW * 0.06, THEMA.blad, lw); lijn(g, q[0], q[1], q[0] + TW * 0.01, q[1] - TW * 0.075, THEMA.blad, lw); lijn(g, q[0], q[1], q[0] + TW * 0.04, q[1] - TW * 0.05, THEMA.blad, lw) }
      if (extra < 0.12) cirkel(g, fl[0], fl[1], TW * 0.025, ['#ffffff', '#ffe066', '#ff9fd0'][Math.floor(r() * 3)])
    } else if (THEMA.detail === 'woestijn') {
      if (kans < 0.4) { cirkel(g, q[0], q[1], TW * 0.02, '#b8924a'); cirkel(g, q[0] + TW * 0.06, q[1] + TW * 0.02, TW * 0.014, '#c9a35a') }
      if (extra < 0.06) { lijn(g, fl[0], fl[1], fl[0], fl[1] - TW * 0.16, '#4f8a3a', Math.max(2, TW * 0.05)); lijn(g, fl[0] - TW * 0.05, fl[1] - TW * 0.08, fl[0] - TW * 0.05, fl[1] - TW * 0.13, '#4f8a3a', Math.max(1.5, TW * 0.035)) }
    } else if (THEMA.detail === 'ijs') {
      if (kans < 0.5) { cirkel(g, q[0], q[1], TW * 0.025, '#ffffff'); cirkel(g, q[0] + TW * 0.07, q[1] + TW * 0.02, TW * 0.015, '#cfe4fa') }
      if (extra < 0.05) { lijn(g, fl[0] - TW * 0.04, fl[1], fl[0] + TW * 0.04, fl[1], '#ffffff', 1); lijn(g, fl[0], fl[1] - TW * 0.04, fl[0], fl[1] + TW * 0.04, '#ffffff', 1) }
    } else if (THEMA.detail === 'oer') {
      if (kans < 0.35) { lijn(g, q[0], q[1], q[0] - TW * 0.05, q[1] - TW * 0.05, '#2a7a2a', lw); lijn(g, q[0], q[1], q[0], q[1] - TW * 0.07, '#2f8a30', lw); lijn(g, q[0], q[1], q[0] + TW * 0.05, q[1] - TW * 0.05, '#2a7a2a', lw) }
      if (extra < 0.05) { ellips(g, fl[0], fl[1], TW * 0.06, TW * 0.03, '#5a4a44'); ellips(g, fl[0] - TW * 0.01, fl[1] - TW * 0.01, TW * 0.04, TW * 0.018, '#6e5e56') }
    } else if (THEMA.detail === 'maan') {
      if (kans < 0.25) { ellips(g, q[0], q[1], TW * 0.09, TW * 0.04, '#6e6e78'); ellips(g, q[0], q[1] - TW * 0.006, TW * 0.07, TW * 0.028, '#7c7c86') }
      if (extra < 0.15) cirkel(g, fl[0], fl[1], TW * 0.015, '#a6a6b0')
    }
  }
  // lichte rand bovenop de aarde
  lijn(g, ondL[0], ondL[1], ondM[0], ondM[1], THEMA.rand, 2); lijn(g, ondM[0], ondM[1], ondR[0], ondR[1], THEMA.rand, 2)

  // paden van stenen tegels, met een stoeprand waar het gras begint
  Object.keys(S.pad).forEach(function (k) {
    var c2 = k.split(','), px = +c2[0], py = +c2[1]
    vulRuit(g, px, py, THEMA.pad[(px + py) % 2])
    var m = scherm(px + 0.5, py + 0.5)
    lijn(g, m[0] - TW * 0.12, m[1] - TW * 0.02, m[0] + TW * 0.08, m[1] + TW * 0.08, 'rgba(140,130,110,.35)', 1)
    lijn(g, m[0] + TW * 0.1, m[1] - TW * 0.06, m[0] - TW * 0.04, m[1] + TW * 0.03, 'rgba(140,130,110,.3)', 1)
  })
  Object.keys(S.pad).forEach(function (k) {
    var c3 = k.split(','), x2 = +c3[0], y2 = +c3[1], rd = ruit(x2, y2), kl = THEMA.pad[2], bw = Math.max(1.5, TW * 0.035)
    if (!S.pad[DT.sleutel(x2, y2 - 1)]) lijn(g, rd[0][0], rd[0][1], rd[1][0], rd[1][1], kl, bw)
    if (!S.pad[DT.sleutel(x2 - 1, y2)]) lijn(g, rd[0][0], rd[0][1], rd[3][0], rd[3][1], kl, bw)
    if (!S.pad[DT.sleutel(x2 + 1, y2)]) lijn(g, rd[1][0], rd[1][1], rd[2][0], rd[2][1], kl, bw)
    if (!S.pad[DT.sleutel(x2, y2 + 1)] && !(x2 === DT.INGANG.x && y2 === DT.INGANG.y)) lijn(g, rd[3][0], rd[3][1], rd[2][0], rd[2][1], kl, bw)
    if (!ST.verbonden[k]) { g.setLineDash([4, 4]); pad4(g, ruit(x2, y2, 0.12)); g.strokeStyle = 'rgba(255,92,122,.9)'; g.lineWidth = 2; g.stroke(); g.setLineDash([]) }
  })
  // verblijven: grond, inrichting en het achterste hek
  S.verblijven.forEach(function (v) {
    tekenHokGrond(g, v)
    hekRanden(v).achter.forEach(function (e) { hekStuk(g, scherm(e[0], e[1]), scherm(e[2], e[3]), v.bodem, true) })
  })
}

// ── dieren die rondlopen ──
var lopers = {}   // verblijf-id → [{ soort, x, y, nx, ny, wacht, rechts, f, baby }]
var babyHok = null   // hier is net een jong geboren (dat begint klein)
function syncDieren() {
  var gezien = {}
  S.verblijven.forEach(function (v) {
    gezien[v.id] = 1
    var l = lopers[v.id] || (lopers[v.id] = [])
    while (l.length > v.dieren.length) l.pop()
    while (l.length < v.dieren.length) {
      var x = v.x + 0.5 + Math.random() * (v.w - 1), y = v.y + 0.7 + Math.random() * (v.h - 1.2)
      l.push({ x: x, y: y, nx: x, ny: y, wacht: Math.random() * 2, rechts: Math.random() < 0.5, f: Math.random() * 9, baby: v.id === babyHok ? 1 : 0 })
    }
    l.forEach(function (d, i) { d.soort = v.dieren[i] })
  })
  Object.keys(lopers).forEach(function (id) { if (!gezien[id]) delete lopers[id] })
}
function beweegDieren(dt) {
  S.verblijven.forEach(function (v) {
    ;(lopers[v.id] || []).forEach(function (d) {
      if (d.baby) d.baby = Math.max(0, d.baby - dt / 90)
      var dx = d.nx - d.x, dy = d.ny - d.y, af = Math.hypot(dx, dy)
      if (af < 0.03) {
        d.wacht -= dt
        if (d.wacht <= 0) { d.nx = v.x + 0.45 + Math.random() * (v.w - 0.9); d.ny = v.y + 0.75 + Math.random() * (v.h - 1.1); d.wacht = 1 + Math.random() * 3 }
        return
      }
      var sn = Math.min(af, dt * (d.soort === 'kangoeroe' || d.soort === 'konijn' || d.soort === 'velociraptor' ? 0.9 : 0.5))
      d.x += dx / af * sn; d.y += dy / af * sn; d.f += dt * 6
      if (Math.abs(dx) > 0.02) d.rechts = dx > 0
    })
  })
}

// ── bezoekers ──
var bezoekers = [], KLEUREN = ['#ff4fd8', '#3ef0ff', '#ffd23f', '#4dffa0', '#ff8a5c', '#9b6bff', '#ff5c7a', '#7df9ff']
function nieuweBezoeker() {
  if (bezoekers.length >= 120) return
  bezoekers.push({ x: DT.INGANG.x, y: DT.INGANG.y + 0.6, vx: DT.INGANG.x, vy: DT.INGANG.y + 0.6, nx: DT.INGANG.x, ny: DT.INGANG.y,
    t: 0, kleur: KLEUREN[Math.floor(Math.random() * KLEUREN.length)], huid: ['#f2c6a0', '#c98e62', '#8a5a3a', '#ffe0c4'][Math.floor(Math.random() * 4)],
    stappen: 25 + Math.floor(Math.random() * 25), kijk: 0, weg: false, hart: 0 })
}
var BUREN = [[1, 0], [-1, 0], [0, 1], [0, -1]]
function beweegBezoekers(dt) {
  for (var i = bezoekers.length - 1; i >= 0; i--) {
    var b = bezoekers[i]
    if (b.kijk > 0) { b.kijk -= dt; b.hart = Math.max(0, b.hart - dt); continue }
    b.t += dt * 1.6
    if (b.t < 1) { b.x = b.vx + (b.nx - b.vx) * b.t; b.y = b.vy + (b.ny - b.vy) * b.t; continue }
    b.x = b.nx; b.y = b.ny; b.t = 0; b.vx = b.nx; b.vy = b.ny
    if (b.weg) { bezoekers.splice(i, 1); continue }
    b.stappen--
    // staat er een verblijf met dieren naast dit stukje pad? even kijken
    var naast = null
    BUREN.forEach(function (o) { var v = DT.verblijfOp(S, b.x + o[0], b.y + o[1]); if (v && v.dieren.length) naast = v })
    if (naast && Math.random() < 0.3) { b.kijk = 1 + Math.random() * 1.5; if (DT.blijheid(S, naast).waarde >= 0.85) b.hart = 1.2 }
    var opties = BUREN.map(function (o) { return [b.x + o[0], b.y + o[1]] }).filter(function (p) { return ST.verbonden[DT.sleutel(p[0], p[1])] })
    if (b.stappen <= 0 && b.x === DT.INGANG.x && b.y === DT.INGANG.y) { b.weg = true; b.nx = b.x; b.ny = b.y + 1; continue }
    if (!opties.length) { b.weg = true; b.nx = b.x; b.ny = b.y + 1; continue }
    var verder = opties.filter(function (p) { return !(p[0] === b.vorigX && p[1] === b.vorigY) })
    if (b.stappen <= 0) verder.sort(function (p, q) { return Math.abs(p[0] - DT.INGANG.x) + Math.abs(p[1] - DT.INGANG.y) - Math.abs(q[0] - DT.INGANG.x) - Math.abs(q[1] - DT.INGANG.y) })
    var kies = verder.length ? (b.stappen <= 0 ? verder[0] : verder[Math.floor(Math.random() * verder.length)]) : opties[0]
    b.vorigX = b.x; b.vorigY = b.y; b.nx = kies[0]; b.ny = kies[1]
  }
}
function tekenBezoeker(g, b) {
  var p = scherm(b.x + 0.5, b.y + 0.5), u = T * 0.34, stap = b.kijk > 0 ? 0 : Math.sin(b.t * TAU * 2) * u * 0.08
  ellips(g, p[0], p[1] + u * 0.55, u * 0.35, u * 0.1, 'rgba(0,0,0,.3)')
  g.fillStyle = b.kleur; g.beginPath(); g.ellipse(p[0], p[1] + u * 0.12 - stap, u * 0.28, u * 0.38, 0, 0, TAU); g.fill()
  cirkel(g, p[0], p[1] - u * 0.38 - stap, u * 0.22, b.huid)
  if (b.hart > 0) {
    var hy = p[1] - u * 1.1 - (1.2 - b.hart) * T * 0.4
    g.globalAlpha = Math.min(1, b.hart); g.fillStyle = '#ff4fd8'
    g.beginPath(); g.moveTo(p[0], hy + u * 0.2); g.bezierCurveTo(p[0] - u * 0.35, hy - u * 0.05, p[0] - u * 0.15, hy - u * 0.3, p[0], hy - u * 0.1)
    g.bezierCurveTo(p[0] + u * 0.15, hy - u * 0.3, p[0] + u * 0.35, hy - u * 0.05, p[0], hy + u * 0.2); g.fill(); g.globalAlpha = 1
  }
}

// ── effecten ──
var teksten = [], deeltjes = []
function tekst(x, y, t, kleur) { teksten.push({ x: x, y: y, t: t, leef: 1.2, kleur: kleur || '#ffd23f' }) }
function spat(x, y, kleur, n) { for (var i = 0; i < n; i++) { var a = Math.random() * TAU, v = 40 + Math.random() * 120; deeltjes.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, leef: 0.6 + Math.random() * 0.4, kleur: kleur }) } }

// ── gereedschap ──
// modus: null = kijken; { type: 'pad'|'hek'|'bodem'|'item'|'dier'|'object'|'sloop', soort }
var modus = null
var tab = 'pad', zweef = null, gekozenVerblijf = null, hekStart = null, sloopVraag = null
var TABS = [
  { id: 'pad', naam: 'Paden', icoon: '<path d="M8 3 L5 21 M16 3 L19 21 M12 6v3 M12 12v3 M12 18v2"/>' },
  { id: 'hek', naam: 'Hek bouwen', icoon: '<path d="M4 20V8 M10 20V8 M16 20V8 M22 20V8 M4 6l0 0 M2 11h22 M2 16h22"/>' },
  { id: 'bodem', naam: 'Bodem', icoon: '<path d="M2 12l10-6 10 6-10 6z M2 12v3l10 6 10-6v-3"/>' },
  { id: 'item', naam: 'Inrichten', icoon: '<path d="M3 11l9-7 9 7 M5 10v10h14V10 M10 20v-6h4v6"/>' },
  { id: 'dier', naam: 'Dieren', icoon: '<circle cx="7" cy="8" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="17" cy="8" r="2"/><path d="M7 17c0-3 2.5-6 5-6s5 3 5 6c0 2-2 2-5 2s-5 0-5-2z"/>' },
  { id: 'decor', naam: 'Versiering', icoon: '<circle cx="12" cy="9" r="5"/><path d="M12 14v7"/>' },
  { id: 'kraam', naam: 'Kraampjes', icoon: '<path d="M4 10h16 M5 10l1-5h12l1 5 M6 10v9h12v-9"/>' },
  { id: 'grond', naam: 'Grond', icoon: '<path d="M3 20h18 M5 20V9l7-5 7 5v11"/>' },
  { id: 'sloop', naam: 'Slopen', icoon: '<path d="M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13"/>' },
]
function kiesTab(id) {
  tab = id
  if (id === 'pad') kiesModus({ type: 'pad' })
  else if (id === 'hek') kiesModus({ type: 'hek' })
  else if (id === 'sloop') kiesModus({ type: 'sloop' })
  else kiesModus(null)
  bouwTabs(); bouwItems()
}
function bouwTabs() {
  $('tabs').innerHTML = ''
  TABS.forEach(function (t) {
    var b = document.createElement('button'); b.className = 'tab' + (t.id === tab ? ' aan' : '')
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + t.icoon + '</svg>' + t.naam
    b.onclick = function () { audio(); kiesTab(t.id) }
    $('tabs').appendChild(b)
  })
}
function kiesModus(m) { modus = m; hekStart = null; sloopVraag = null; sluitInfo(); werkItemsBij(); werkHintBij() }
var itemKnoppen = []
function itemIcoon(canvas, soort, type) {
  var w = 48, h = 42, r = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = w * r; canvas.height = h * r
  var g = canvas.getContext('2d'); g.setTransform(r, 0, 0, r, 0, 0)
  var oud = [TW, TH, T, OX, OY]
  // de brachiosaurus is zo lang dat zijn kop anders buiten het knopje valt
  if (type === 'dier') tekenDier(g, soort, w / 2, h * 0.92, soort === 'brachiosaurus' ? h * 0.48 : h * (0.5 + GROOTTE[soort] * 0.35), true, 1)
  else if (type === 'object') { TW = 34; TH = 17; T = TW * 0.62; tekenObject(g, soort, w / 2, h * 0.74, 1) }
  else if (type === 'item') {
    TW = 34; TH = 17; T = TW * 0.62
    if (soort === 'water') { OX = w / 2; OY = h * 0.3; var v = { x: 0, y: 0, w: 1, h: 1, bodem: 'gras', items: [{ soort: 'water', x: 0, y: 0 }] }; tekenWater(g, v, v.items[0]) }
    else tekenItem(g, soort, w / 2, h * 0.76, 1)
  } else if (type === 'bodem') {
    TW = 15; TH = 7.5; OX = w / 2; OY = h / 2 - 3 * TH / 2 + 1
    tekenHokGrond(g, { x: 0, y: 0, w: 3, h: 3, bodem: soort, items: [] })
  }
  TW = oud[0]; TH = oud[1]; T = oud[2]; OX = oud[3]; OY = oud[4]
}
function bouwItems() {
  var box = $('items'); box.innerHTML = ''; itemKnoppen = []
  var lijst = []
  setTimeout(function () { meet(); zetZoomKnoppen() }, 0)
  if (tab === 'pad') { box.innerHTML = '<div class="uitleg">Tik of sleep over het gras om <b>paden</b> te leggen. Een pad kost <b>' + DT.PAD_PRIJS + '</b> munten. Bezoekers lopen alleen over paden die aan de <b>ingang</b> vastzitten.</div>'; return }
  if (tab === 'hek') { box.innerHTML = '<div class="uitleg"><b>Sleep</b> over het gras om een hok te tekenen (' + DT.MIN_HOK + ' tot ' + DT.MAX_HOK + ' vakjes per kant). Een stukje hek kost <b>' + DT.HEK_PRIJS + '</b> munten. Een hok <b>groter maken</b>? Begin te slepen ín het hok en trek naar buiten.</div>'; return }
  if (tab === 'sloop') { box.innerHTML = '<div class="uitleg">Tik op een pad, ding of iets in een hok om het weg te halen. Tik op een leeg stuk van een hok om het <b>hele hok</b> te slopen. Je krijgt <b>de helft</b> van het geld terug.</div>'; return }
  if (tab === 'grond') {
    var info = DT.grondInfo(S)
    box.innerHTML = info
      ? '<div class="uitleg">Meer ruimte voor je dierentuin: <b>' + DT.GROND[S.grond + 1].w + ' × ' + DT.GROND[S.grond + 1].h + '</b> vakjes.</div><button class="knop goud" id="grondknop"' + (info.kan ? '' : ' disabled') + '>Grond kopen voor ' + DT.kort(info.prijs) + '</button>'
      : '<div class="uitleg">Je hebt alle grond gekocht. Wat een dierentuin!</div>'
    if (info) $('grondknop').onclick = function () {
      if (DT.koopGrond(S)) { var oud = TW; Geluid.bouw(); meet(); ZOOM = oud / BASIS.tw; zet(); wijziging(); bouwItems(); melding('Je dierentuin is groter geworden!') }
    }
    return
  }
  if (tab === 'bodem') lijst = Object.keys(DT.BODEMS).map(function (k) { var b = DT.BODEMS[k]; return { type: 'bodem', soort: k, def: { naam: b.naam, niveau: b.niveau, prijs: b.prijs }, prijsTekst: b.prijs ? b.prijs + ' per vakje' : 'gratis' } })
  if (tab === 'item') lijst = Object.keys(DT.INRICHTING).map(function (k) { return { type: 'item', soort: k, def: DT.INRICHTING[k] } })
  // alleen de dieren die in deze wereld wonen, in de volgorde waarin ze vrijkomen
  if (tab === 'dier') lijst = DT.dierenVan(S).map(function (k) { var d = DT.DIEREN[k]; return { type: 'dier', soort: k, def: { naam: d.naam, prijs: d.prijs, niveau: DT.dierNiveau(S, k) } } })
  if (tab === 'decor') lijst = ['boom', 'bloemen', 'bank', 'lantaarn', 'speeltuin', 'fontein', 'draaimolen', 'reuzenrad'].map(function (k) { return { type: 'object', soort: k, def: DT.OBJECTEN[k] } })
  if (tab === 'kraam') lijst = ['ijskraam', 'snackbar', 'souvenir', 'restaurant'].map(function (k) { return { type: 'object', soort: k, def: DT.OBJECTEN[k] } })
  lijst.forEach(function (it) {
    var b = document.createElement('button'); b.className = 'item'
    b.innerHTML = '<canvas></canvas><span class="naam">' + it.def.naam + '</span><span class="prijs"><span class="munt"></span>' + (it.prijsTekst || DT.kort(it.def.prijs)) + '</span>'
    b.dataset.slot = 'Level ' + it.def.niveau
    itemIcoon(b.querySelector('canvas'), it.soort, it.type)
    b.onclick = function () {
      audio()
      if (!DT.ontgrendeld(S, it.def.niveau)) { melding('Dit komt vrij bij <b>level ' + it.def.niveau + '</b>.', true); Geluid.fout(); return }
      var zelfde = modus && modus.type === it.type && modus.soort === it.soort
      kiesModus(zelfde ? null : { type: it.type, soort: it.soort })
      if (zelfde) return
      if (it.type === 'dier') melding('Tik op een <b>hok</b> om er een ' + it.def.naam.toLowerCase() + ' in te zetten.')
      if (it.type === 'item') melding('Tik op een vakje <b>in een hok</b> om er een ' + it.def.naam.toLowerCase() + ' neer te zetten.')
      if (it.type === 'bodem') melding('Tik op een <b>hok</b> om de bodem ' + it.def.naam.toLowerCase() + ' te maken.')
    }
    box.appendChild(b); itemKnoppen.push({ el: b, it: it })
  })
  werkItemsBij(); meet()
}
function werkItemsBij() {
  itemKnoppen.forEach(function (k) {
    var it = k.it
    k.el.classList.toggle('slot', !DT.ontgrendeld(S, it.def.niveau))
    k.el.classList.toggle('duur', S.geld < it.def.prijs)
    k.el.classList.toggle('aan', !!modus && modus.type === it.type && modus.soort === it.soort)
  })
}

// ── info over een hok ──
function sluitInfo() { gekozenVerblijf = null; $('info').classList.add('verborgen') }
function knopHtml(attr, tekst, prijs, kan) {
  return '<button class="knop goud" ' + attr + (kan ? '' : ' disabled') + '>' + tekst + (prijs != null ? ' <span class="munt"></span>' + DT.kort(prijs) : '') + '</button>'
}
function toonInfo(v) {
  gekozenVerblijf = v
  var el = $('info'), dier = v.dieren[0] && DT.DIEREN[v.dieren[0]]
  var b = DT.blijheid(S, v), harten = Math.floor(b.waarde * 5 + 0.001)
  var gebruikt = v.w * v.h - DT.ruimteOver(v)
  var html = '<button class="sluit" aria-label="Sluiten">×</button>' +
    '<h3>Hok ' + v.w + '×' + v.h + ' · ' + DT.BODEMS[v.bodem].naam.toLowerCase() + (dier ? ' · ' + v.dieren.length + ' ' + (v.dieren.length === 1 ? dier.naam.toLowerCase() : meervoud(v.dieren[0])) : '') + '</h3>'
  if (!v.zichtbaar) html += '<div class="redenen"><span class="nee">Bezoekers kunnen hier niet komen: leg een pad langs het hek</span></div>'
  var knoppen = []
  if (dier) {
    html += '<div class="harten">' + [0, 1, 2, 3, 4].map(function (i) { return '<i' + (i < harten ? ' class="aan"' : '') + '></i>' }).join('') + '</div>'
    html += '<div class="redenen">' + b.wensen.map(function (w) { return '<span' + (w.goed ? '' : ' class="nee"') + '>' + w.t + '</span>' }).join('') + '</div>'
    // snelknoppen voor wat nog ontbreekt
    b.wensen.forEach(function (w) {
      if (w.goed) return
      if (w.type === 'bodem') {
        var bo = w.opties.filter(function (k) { return DT.ontgrendeld(S, DT.BODEMS[k].niveau) })[0]
        if (bo) knoppen.push(knopHtml('data-bodem="' + bo + '"', DT.BODEMS[bo].naam, DT.bodemPrijs(S, v, bo), !DT.waaromNietBodem(S, v, bo)))
      } else if (w.type === 'item') {
        var io = w.opties.filter(function (k) { return DT.ontgrendeld(S, DT.INRICHTING[k].niveau) })[0]
        if (io) knoppen.push(knopHtml('data-item="' + io + '"', '+ ' + DT.INRICHTING[io].naam, DT.INRICHTING[io].prijs, S.geld >= DT.INRICHTING[io].prijs && DT.ruimteOver(v) >= 1))
      } else if (w.type === 'vriend') knoppen.push(knopHtml('data-dier="' + v.dieren[0] + '"', '+ ' + dier.naam, dier.prijs, !DT.waaromNietDier(S, v, v.dieren[0])))
    })
  } else html += '<div class="redenen"><span class="nee">Hier woont nog niemand. Kies een dier!</span></div>'
  html += '<div class="ruimtebalk">Ruimte<div><i style="width:' + Math.min(100, gebruikt / (v.w * v.h) * 100) + '%"></i></div>' + gebruikt + '/' + (v.w * v.h) + '</div>'
  var soorten = dier ? (b.wensen.some(function (w) { return w.type === 'vriend' && !w.goed }) ? [] : [v.dieren[0]])
    : DT.dierenVan(S).filter(function (k) { return DT.ontgrendeld(S, DT.dierNiveau(S, k)) })
  soorten.forEach(function (k) { knoppen.push(knopHtml('data-dier="' + k + '"', '+ ' + DT.DIEREN[k].naam, DT.DIEREN[k].prijs, !DT.waaromNietDier(S, v, k))) })
  html += '<div class="infoknoppen">' + knoppen.join('') + '</div>'
  // groter maken: in de schuine weergave wijst x naar rechtsonder en y naar linksonder
  html += '<div class="groei"><span>Hok groter maken</span><div>' + GROEI.map(function (r) {
    var m = groeiMaat(v, r.id), kan = !DT.waaromNietMaat(S, v, m.x, m.y, m.w, m.h)
    return '<button class="knop2" data-groei="' + r.id + '"' + (kan ? '' : ' disabled') + ' title="' + r.naam + '">' + r.pijl + ' <span class="munt"></span>' + DT.kort(DT.maatPrijs(S, v, m.w, m.h)) + '</button>'
  }).join('') + '</div></div>'
  html += '<div class="infoknoppen"><button class="knop rood" id="sloophok">Hok slopen</button></div>'
  el.innerHTML = html; el.classList.remove('verborgen')
  el.style.bottom = ($('balk').getBoundingClientRect().height + 12) + 'px'
  el.querySelector('.sluit').onclick = sluitInfo
  Array.prototype.forEach.call(el.querySelectorAll('[data-dier]'), function (k) { k.onclick = function () { zetDier(v, k.dataset.dier); toonInfo(v) } })
  Array.prototype.forEach.call(el.querySelectorAll('[data-bodem]'), function (k) { k.onclick = function () { zetBodem(v, k.dataset.bodem); toonInfo(v) } })
  Array.prototype.forEach.call(el.querySelectorAll('[data-groei]'), function (k) {
    k.onclick = function () { var m = groeiMaat(v, k.dataset.groei); pasAan(v, m.x, m.y, m.w, m.h); toonInfo(v) }
  })
  Array.prototype.forEach.call(el.querySelectorAll('[data-item]'), function (k) {
    k.onclick = function () {
      // zet het neer op een vrij vakje, het liefst achterin het hok
      for (var j = 0; j < v.h; j++) for (var i = 0; i < v.w; i++) if (!DT.waaromNietItem(S, v, k.dataset.item, v.x + i, v.y + j)) { zetItem(v, k.dataset.item, v.x + i, v.y + j); toonInfo(v); return }
      melding('Er is geen plek meer in dit hok.', true); Geluid.fout()
    }
  })
  $('sloophok').onclick = function () {
    if (sloopVraag !== v) { sloopVraag = v; this.textContent = 'Zeker weten?'; return }
    var t = DT.sloopHok(S, v)
    Geluid.sloop(); sluitInfo(); wijziging(); sloopVraag = null
    melding('Gesloopt. Je krijgt <b>' + DT.kort(t) + '</b> munten terug.')
  }
}
function meervoud(k) { return { konijn: 'konijnen', geit: 'geiten', flamingo: "flamingo's", pinguin: 'pinguïns', aap: 'apen', zebra: "zebra's", zeehond: 'zeehonden',
  kangoeroe: 'kangoeroes', giraf: 'giraffen', krokodil: 'krokodillen', leeuw: 'leeuwen', ijsbeer: 'ijsberen', olifant: 'olifanten', panda: "panda's",
  eend: 'eenden', schaap: 'schapen', varken: 'varkens', hert: 'herten', rendier: 'rendieren', vos: 'vossen', fennek: 'fenneks', poolvos: 'poolvossen',
  stokstaartje: 'stokstaartjes', struisvogel: 'struisvogels', kameel: 'kamelen', schildpad: 'schildpadden', nijlpaard: 'nijlpaarden', walrus: 'walrussen',
  mammoet: 'mammoeten', papegaai: 'papegaaien', tijger: 'tijgers', dodo: "dodo's", oervogel: 'oervogels', pteranodon: 'pteranodons',
  parasaurolophus: 'parasaurolophussen', velociraptor: 'velociraptors', stegosaurus: 'stegosaurussen', ankylosaurus: 'ankylosaurussen',
  triceratops: 'triceratopsen', sabeltand: 'sabeltandtijgers', spinosaurus: 'spinosaurussen', brachiosaurus: 'brachiosaurussen', trex: 'T. rexen', megalodon: 'megalodons' }[k] }

var GROEI = [
  { id: 'x-', pijl: '↖', naam: 'Een vakje erbij naar linksboven' },
  { id: 'y-', pijl: '↗', naam: 'Een vakje erbij naar rechtsboven' },
  { id: 'y+', pijl: '↙', naam: 'Een vakje erbij naar linksonder' },
  { id: 'x+', pijl: '↘', naam: 'Een vakje erbij naar rechtsonder' },
]
function groeiMaat(v, r) {
  if (r === 'x-') return { x: v.x - 1, y: v.y, w: v.w + 1, h: v.h }
  if (r === 'x+') return { x: v.x, y: v.y, w: v.w + 1, h: v.h }
  if (r === 'y-') return { x: v.x, y: v.y - 1, w: v.w, h: v.h + 1 }
  return { x: v.x, y: v.y, w: v.w, h: v.h + 1 }
}
function pasAan(v, x, y, w, h) {
  var waarom = DT.waaromNietMaat(S, v, x, y, w, h)
  if (waarom) { melding(waarom + '.', true); Geluid.fout(); return false }
  DT.pasHokAan(S, v, x, y, w, h); Geluid.bouw(); wijziging()
  var c = scherm(x + w / 2, y + h / 2); spat(c[0], c[1], '#ffd27a', 18)
  melding('Het hok is nu <b>' + w + ' × ' + h + '</b> vakjes.')
  return true
}

// ── acties ──
function wijziging() { if (CREATIEF) S.geld = DT.ONEINDIG; ST = DT.stats(S); syncDieren(); vuil = true; werkItemsBij(); werkHintBij(); bewaar() }
function zetDier(v, soort) {
  var waarom = DT.waaromNietDier(S, v, soort)
  if (waarom) { melding(waarom + '.', true); Geluid.fout(); return false }
  DT.zetDier(S, v, soort); Geluid.dier(); wijziging()
  var p = scherm(v.x + v.w / 2, v.y + v.h / 2); spat(p[0], p[1], '#ff4fd8', 16); tekst(p[0], p[1] - 10, '+1 ' + DT.DIEREN[soort].naam.toLowerCase(), '#ffb3e6')
  if (v.dieren.length === 1) setTimeout(function () { melding('Tik op het hok om te zien wat je ' + DT.DIEREN[soort].naam.toLowerCase() + ' nog wil!') }, 900)
  return true
}
function zetBodem(v, bodem) {
  var waarom = DT.waaromNietBodem(S, v, bodem)
  if (waarom) { melding(waarom + '.', true); Geluid.fout(); return false }
  DT.zetBodem(S, v, bodem); Geluid.bouw(); wijziging()
  var p = scherm(v.x + v.w / 2, v.y + v.h / 2); spat(p[0], p[1], '#ffd23f', 18)
  return true
}
function zetItem(v, soort, x, y) {
  var waarom = DT.waaromNietItem(S, v, soort, x, y)
  if (waarom) { melding(waarom + '.', true); Geluid.fout(); return false }
  DT.plaatsItem(S, v, soort, x, y); Geluid.bouw(); wijziging()
  var p = scherm(x + 0.5, y + 0.5); spat(p[0], p[1], '#4dffa0', 12)
  return true
}
function hekRechthoek(a, b) {
  return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(a[0] - b[0]) + 1, h: Math.abs(a[1] - b[1]) + 1 }
}
// begin je te slepen in een bestaand hok, dan groeit dat hok mee
function hekPlan(a, b) {
  var r = hekRechthoek(a, b), v = DT.verblijfOp(S, a[0], a[1])
  if (!v) return { r: r }
  var x0 = Math.min(r.x, v.x), y0 = Math.min(r.y, v.y), x1 = Math.max(r.x + r.w, v.x + v.w), y1 = Math.max(r.y + r.h, v.y + v.h)
  return { r: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, hok: v }
}
function bouwHekKlaar(a, b) {
  var plan = hekPlan(a, b)
  if (plan.hok) { if (pasAan(plan.hok, plan.r.x, plan.r.y, plan.r.w, plan.r.h)) toonInfo(plan.hok); return }
  var r = plan.r, waarom = DT.waaromNietHok(S, r.x, r.y, r.w, r.h)
  if (waarom) { melding(waarom + '.', true); Geluid.fout(); return }
  var v = DT.bouwHok(S, r.x, r.y, r.w, r.h); Geluid.bouw(); wijziging()
  var c = scherm(r.x + r.w / 2, r.y + r.h / 2); spat(c[0], c[1], '#ffd27a', 26)
  ST = DT.stats(S)
  kiesTab('dier')
  toonInfo(v)
  melding(v.zichtbaar ? 'Hok gebouwd! Kies wie hier komt wonen.' : 'Hok gebouwd! Leg nog een <b>pad</b> langs het hek, anders kunnen bezoekers er niet bij.')
}
function doeOp(x, y, eerste) {
  if (!modus) {
    var v = DT.verblijfOp(S, x, y)
    if (v) toonInfo(v); else sluitInfo()
    return
  }
  var p = scherm(x + 0.5, y + 0.5)
  if (modus.type === 'pad') {
    if (S.pad[DT.sleutel(x, y)]) return
    if (!DT.binnen(S, x, y)) { if (eerste) melding('Die grond is nog niet van jou. Koop meer grond bij <b>Grond</b>.', true); return }
    if (!DT.vrij(S, x, y)) return
    if (S.geld < DT.PAD_PRIJS) { if (eerste) { melding('Te weinig geld voor een pad.', true); Geluid.fout() } return }
    DT.legPad(S, x, y); Geluid.pad(); wijziging()
  } else if (modus.type === 'dier' || modus.type === 'bodem') {
    var vb = DT.verblijfOp(S, x, y)
    if (!vb) { melding('Tik op een hok.', true); return }
    if (modus.type === 'dier') zetDier(vb, modus.soort); else zetBodem(vb, modus.soort)
  } else if (modus.type === 'item') {
    var vi = DT.verblijfOp(S, x, y)
    if (!vi) { if (eerste) { melding('Dit zet je in een <b>hok</b>.', true); Geluid.fout() } return }
    if (DT.itemOp(vi, x, y)) return
    zetItem(vi, modus.soort, x, y)
  } else if (modus.type === 'object') {
    var od = DT.OBJECTEN[modus.soort]
    if (S.geld < od.prijs) { melding('Te weinig geld.', true); Geluid.fout(); return }
    if (!DT.kanObject(S, modus.soort, x, y)) { if (eerste) { melding('Dat kan alleen op een leeg stukje gras, buiten de hokken.', true); Geluid.fout() } return }
    DT.plaatsObject(S, modus.soort, x, y); Geluid.bouw(); wijziging(); spat(p[0], p[1], '#4dffa0', 10)
  } else if (modus.type === 'sloop') {
    var wat = DT.wat(S, x, y)
    if (wat === 'hok') {
      var hv = DT.verblijfOp(S, x, y)
      if (sloopVraag !== hv) { sloopVraag = hv; melding('Tik nog een keer om het <b>hele hok</b> met alle dieren te slopen.', true); return }
    }
    var t = DT.sloop(S, x, y); sloopVraag = null
    if (t) { Geluid.sloop(); wijziging(); tekst(p[0], p[1], '+' + DT.kort(t), '#ffd23f') }
  }
}
var drukt = false, laatsteVak = null, wijzers = {}, sleepPan = null, knijp = null
function aantalWijzers() { return Object.keys(wijzers).length }
function wijzerLijst() { return Object.keys(wijzers).map(function (k) { return wijzers[k] }) }
function afstand(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
function midden(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
cv.addEventListener('pointerdown', function (e) {
  audio()
  wijzers[e.pointerId] = { x: e.clientX, y: e.clientY }
  try { cv.setPointerCapture(e.pointerId) } catch (er) {}
  if (aantalWijzers() >= 2) {
    // twee vingers: knijpen om te zoomen en schuiven; bouwen stopt dan
    drukt = false; hekStart = null; sleepPan = null
    var p = wijzerLijst(); knijp = { d: afstand(p[0], p[1]), m: midden(p[0], p[1]) }
    return
  }
  var v = vakOnder(e.clientX, e.clientY)
  zweef = v
  // kijken, dieren of bodem: slepen schuift het beeld, tikken kiest
  if (!modus || modus.type === 'dier' || modus.type === 'bodem' || e.button === 1 || e.button === 2) { sleepPan = { x: e.clientX, y: e.clientY, bewogen: 0, vak: v }; return }
  drukt = true; laatsteVak = v.join(',')
  if (modus.type === 'hek') { hekStart = v; return }
  doeOp(v[0], v[1], true)
})
cv.addEventListener('pointermove', function (e) {
  if (wijzers[e.pointerId]) wijzers[e.pointerId] = { x: e.clientX, y: e.clientY }
  if (knijp && aantalWijzers() >= 2) {
    var p = wijzerLijst(), d = afstand(p[0], p[1]), m = midden(p[0], p[1])
    schuif(m.x - knijp.m.x, m.y - knijp.m.y)
    if (knijp.d > 10) zoomRond(d / knijp.d, m.x, m.y)
    knijp = { d: d, m: m }
    return
  }
  if (sleepPan) {
    var dx = e.clientX - sleepPan.x, dy = e.clientY - sleepPan.y
    sleepPan.bewogen += Math.abs(dx) + Math.abs(dy); sleepPan.x = e.clientX; sleepPan.y = e.clientY
    if (sleepPan.bewogen > 6) schuif(dx, dy)
    return
  }
  var v = vakOnder(e.clientX, e.clientY)
  zweef = v
  if (!drukt || !modus || (modus.type !== 'pad' && modus.type !== 'object' && modus.type !== 'item')) return
  if (v.join(',') === laatsteVak) return
  // bij snel slepen alle vakjes ertussen ook meenemen
  var van = laatsteVak.split(',').map(Number), n = Math.max(Math.abs(v[0] - van[0]), Math.abs(v[1] - van[1]))
  for (var i = 1; i <= n; i++) doeOp(Math.round(van[0] + (v[0] - van[0]) * i / n), Math.round(van[1] + (v[1] - van[1]) * i / n), false)
  laatsteVak = v.join(',')
})
function loslaten(e) {
  delete wijzers[e.pointerId]
  if (aantalWijzers() < 2) knijp = null
  if (sleepPan && !aantalWijzers()) { if (sleepPan.bewogen <= 6) doeOp(sleepPan.vak[0], sleepPan.vak[1], true); sleepPan = null }
  if (drukt && hekStart && modus && modus.type === 'hek') {
    var eind = zweef || hekStart
    if (eind[0] === hekStart[0] && eind[1] === hekStart[1]) melding(DT.verblijfOp(S, eind[0], eind[1]) ? 'Sleep vanuit het hok <b>naar buiten</b> om het groter te maken.' : '<b>Sleep</b> van de ene hoek naar de andere hoek van je hok.', true)
    else bouwHekKlaar(hekStart, eind)
  }
  if (!aantalWijzers()) { drukt = false; hekStart = null }
}
cv.addEventListener('pointerup', loslaten)
cv.addEventListener('pointercancel', loslaten)
cv.addEventListener('pointerleave', function () { if (!drukt) zweef = null })
cv.addEventListener('contextmenu', function (e) { e.preventDefault() })
cv.addEventListener('wheel', function (e) { e.preventDefault(); zoomRond(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY) }, { passive: false })
$('zoomIn').onclick = function () { zoomRond(1.3, W / 2, H / 2) }
$('zoomUit').onclick = function () { zoomRond(1 / 1.3, W / 2, H / 2) }
$('zoomAlles').onclick = function () { ZOOM = 1; PANX = 0; PANY = 0; zet() }
function zetZoomKnoppen() { $('zoom').style.bottom = ($('balk').getBoundingClientRect().height + 12) + 'px' }

// ── hud, hint en meldingen ──
var meldTimer = null
function melding(html, fout) {
  var m = $('melding'); m.innerHTML = html; m.classList.add('aan'); m.classList.toggle('fout', !!fout)
  clearTimeout(meldTimer); meldTimer = setTimeout(function () { m.classList.remove('aan') }, 3200)
}
function werkHintBij() {
  var h = null
  var padStukken = Object.keys(S.pad).length
  var met = S.verblijven.filter(function (v) { return v.dieren.length })
  if (padStukken < 3 && !S.verblijven.length) h = 'Welkom, dierentuinbaas! Leg eerst een <b>pad</b> vanaf de ingang (de roze poort). Sleep met je vinger over het gras.'
  else if (!S.verblijven.length) h = 'Mooi pad! Kies nu <b>Hek bouwen</b> en sleep een hok naast het pad, bijvoorbeeld 3 bij 3 vakjes.'
  else if (!met.length) h = 'Zet er dieren in: tik op je hok en kies een dier. Twee konijnen zijn blijer dan één!'
  else if (!ST.perMinuut) h = 'Je dieren zijn er, maar bezoekers kunnen ze niet zien. Leg een <b>pad</b> langs het hek dat vastzit aan de ingang.'
  else if (met.some(function (v) { return DT.blijheid(S, v).waarde < 0.85 }) && S.bezoekers < 60) h = 'Tik op een hok om te zien wat je dieren nog willen: een andere <b>bodem</b>, een <b>binnenverblijf</b>, een <b>badje</b>... Blije dieren trekken meer bezoekers!'
  else if (S.bezoekers < 15) h = 'Daar komen de eerste bezoekers! Van hun entreegeld bouw je meer hokken.'
  if (h && h !== tip) I.doelen = true
  tip = h
  werkDoelenBij()
}
var tip = null
function werkDoelenBij() {
  var info = DT.levelInfo(S, ST), el = $('doelen'), html = '<div class="wereldnaam">' + WERELD.naam + '</div>'
  if (tip) html += '<div class="uitleg" style="padding:0 0 4px;color:var(--ink)">' + tip + '</div>'
  if (CREATIEF) html += '<div class="kop"><b>Creatieve modus</b><span>oneindig geld</span></div><div class="doel">Alles is vrij. Bouw de dierentuin van je dromen!</div>'
  else if (info.alles) html += '<div class="kop"><b>Alle levels gehaald!</b></div><div class="doel">Bouw verder aan je droomdierentuin.</div>'
  else {
    html += '<div class="kop"><b>Level ' + info.nr + ': ' + info.naam + '</b>' + (info.beloning ? '<span>+' + DT.kort(info.beloning) + ' munten</span>' : '') + '</div>'
    html += info.doelen.map(function (d) {
      return '<div class="doel' + (d.klaar ? ' klaar' : '') + '"><div class="r"><span>' + d.t + '</span><span>' + DT.kort(Math.min(d.nu, d.n)) + '/' + DT.kort(d.n) + '</span></div><div class="b"><i style="width:' + Math.min(100, d.nu / d.n * 100) + '%"></i></div></div>'
    }).join('')
  }
  html += '<button class="wereldlink" id="doelwereld">Andere wereld kiezen of opnieuw beginnen</button>'
  if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; $('doelwereld').onclick = function () { audio(); toonWerelden() } }
  el.classList.toggle('dicht', !I.doelen)
  var deel = info.alles ? 1 : info.doelen.reduce(function (t, d) { return t + Math.min(1, d.nu / d.n) }, 0) / info.doelen.length
  $('niveautekst').textContent = CREATIEF ? 'Creatief' : info.alles ? 'Alles gehaald' : 'Level ' + info.nr
  $('niveaubalk').style.width = (deel * 100) + '%'
}
$('niveau').onclick = function () { I.doelen = !I.doelen; werkDoelenBij(); bewaar() }
// ── werelden kiezen ──
function wereldPlaatje(canvas, id) {
  var w = 150, h = 84, r = Math.min(2, window.devicePixelRatio || 1), th = THEMAS[id]
  canvas.width = w * r; canvas.height = h * r
  var g = canvas.getContext('2d'); g.setTransform(r, 0, 0, r, 0, 0)
  var l = g.createLinearGradient(0, 0, 0, h); l.addColorStop(0, th.lucht[0]); l.addColorStop(1, th.lucht[2]); g.fillStyle = l; g.fillRect(0, 0, w, h)
  if (th.zee) { g.fillStyle = 'rgba(14,110,160,.8)'; g.fillRect(0, h * 0.45, w, h) }
  var cx = w / 2, cy = h * 0.42, a = w * 0.34, b = a / 2, d = 9
  g.fillStyle = th.zijL[0]; g.beginPath(); g.moveTo(cx - a, cy); g.lineTo(cx, cy + b); g.lineTo(cx, cy + b + d); g.lineTo(cx - a, cy + d); g.fill()
  g.fillStyle = th.zijR[0]; g.beginPath(); g.moveTo(cx + a, cy); g.lineTo(cx, cy + b); g.lineTo(cx, cy + b + d); g.lineTo(cx + a, cy + d); g.fill()
  g.fillStyle = th.gras[0]; g.beginPath(); g.moveTo(cx, cy - b); g.lineTo(cx + a, cy); g.lineTo(cx, cy + b); g.lineTo(cx - a, cy); g.fill()
  g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(cx - a * 0.5, cy - b * 0.1); g.lineTo(cx, cy - b * 0.35); g.lineTo(cx + a * 0.15, cy - b * 0.28); g.lineTo(cx - a * 0.35, cy); g.fill()
  if (th.aarde) { g.fillStyle = '#3a8fe8'; g.beginPath(); g.arc(w * 0.85, h * 0.2, 8, 0, TAU); g.fill() }
  if (th.zon) { g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(w * 0.85, h * 0.2, 9, 0, TAU); g.fill() }
  if (th.vulkaan) { g.fillStyle = '#2a1418'; g.beginPath(); g.moveTo(w * 0.7, h * 0.48); g.lineTo(w * 0.82, h * 0.1); g.lineTo(w * 0.9, h * 0.1); g.lineTo(w * 1.02, h * 0.48); g.fill(); g.fillStyle = '#ff8a3a'; g.beginPath(); g.ellipse(w * 0.86, h * 0.1, 5, 2, 0, 0, TAU); g.fill() }
  if (th.noorderlicht) { g.strokeStyle = 'rgba(80,255,190,.4)'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, h * 0.15); g.quadraticCurveTo(w / 2, h * 0.02, w, h * 0.18); g.stroke() }
}
function toonWerelden() {
  bewaar()
  var lijst = $('wereldlijst'); lijst.innerHTML = ''
  DT.WERELDEN.concat([DT.CREATIEF]).forEach(function (w, i) {
    var open = wereldOpen(w.id), b = document.createElement('button')
    b.className = 'wereldkaart' + (w.id === WID ? ' huidig' : '') + (open ? '' : ' dicht') + (w.creatief ? ' creatief' : '')
    var status = w.creatief ? 'Oneindig geld' : !open ? 'Haal level ' + w.open + ' in ' + vorigeWereld(i).naam : ruw.werelden[w.id] ? 'Level ' + Math.min(levelVan(w.id), DT.LEVELS.length) : 'Nieuw'
    var gestart = !!ruw.werelden[w.id] || w.id === WID
    b.innerHTML = '<canvas></canvas><span class="naam">' + w.naam + '</span><span class="zin">' + w.zin + '</span><span class="status">' + status + '</span>' +
      (open && gestart ? '<span class="opnieuw" role="button" tabindex="0">Opnieuw beginnen</span>' : '')
    wereldPlaatje(b.querySelector('canvas'), w.id)
    var opn = b.querySelector('.opnieuw')
    if (opn) opn.onclick = function (e) {
      e.stopPropagation()
      if (!opn.classList.contains('zeker')) { opn.classList.add('zeker'); opn.textContent = 'Zeker weten? Alles in deze wereld is dan weg'; return }
      opnieuwBeginnen(w.id)
    }
    b.onclick = function () {
      if (!open) { melding('Deze wereld gaat open als je level ' + w.open + ' haalt in ' + vorigeWereld(i).naam + '.', true); Geluid.fout(); return }
      if (w.id === WID) { $('wereldscherm').classList.remove('aan'); return }
      gaNaarWereld(w.id)
    }
    lijst.appendChild(b)
  })
  $('wereldscherm').classList.add('aan')
}
$('wereldknop').onclick = function () { audio(); toonWerelden() }
$('wereldnaam').textContent = WERELD.naam
// een wereld helemaal opnieuw: startgeld, level 1, een lege kaart
var gewist = false
function opnieuwBeginnen(id) {
  delete ruw.werelden[id]
  if (id === WID) {
    gewist = true; ruw.huidige = id
    try { localStorage.setItem(OPSLAG, JSON.stringify(ruw)) } catch (e) {}
    location.reload()
    return
  }
  try { localStorage.setItem(OPSLAG, JSON.stringify(ruw)) } catch (e) {}
  toonWerelden(); melding(DT.wereld(id).naam + ' begint opnieuw.')
}
$('wereldsluit').onclick = function () { $('wereldscherm').classList.remove('aan') }
function toonLevelUp(r) {
  Geluid.niveau()
  $('niveauklein').textContent = 'Level ' + (r.nr - 1) + ' gehaald!'
  $('niveautitel').textContent = r.alles ? 'Alles gehaald!' : 'Level ' + r.nr
  $('niveaubeloning').textContent = r.beloning ? '+' + DT.kort(r.beloning) + ' munten' : ''
  $('niveaunieuw').innerHTML = r.nieuw.length ? 'Nieuw vrij: <b>' + r.nieuw.join(', ') + '</b>' : (r.alles ? 'Jij bent de beste dierentuinbaas!' : '')
  var info = DT.levelInfo(S, ST)
  $('niveaudoelen').innerHTML = info.alles ? '' : '<b>' + info.naam + '</b>' + info.doelen.map(function (d) { return '<span>• ' + d.t + '</span>' }).join('')
  $('niveaudoelen').style.display = info.alles ? 'none' : ''
  $('niveauscherm').classList.add('aan')
  for (var i = 0; i < 4; i++) spat(W / 2, H / 2, ['#3ef0ff', '#ff4fd8', '#ffd23f', '#4dffa0'][i], 24)
  I.doelen = true
  bouwItems(); wijziging()
}
var hudOm = 0
function werkHudBij(dt) {
  hudOm -= dt
  if (hudOm > 0) return
  hudOm = 0.25
  if (CREATIEF) S.geld = DT.ONEINDIG
  $('geld').textContent = CREATIEF ? '∞' : DT.kort(S.geld)
  Array.prototype.forEach.call($('sterren').children, function (s, i) { s.classList.toggle('aan', i < ST.sterren) })
  $('perMin').textContent = Math.round(ST.perMinuut)
  var nieuwLevel = CREATIEF ? null : DT.checkLevel(S, ST)
  if (nieuwLevel) toonLevelUp(nieuwLevel)
  werkDoelenBij()
  werkItemsBij()
  if (gekozenVerblijf && S.verblijven.indexOf(gekozenVerblijf) >= 0) {
    // knoppen bijwerken als je ondertussen genoeg geld krijgt
    var gv = gekozenVerblijf
    Array.prototype.forEach.call($('info').querySelectorAll('[data-dier]'), function (k) { k.disabled = !!DT.waaromNietDier(S, gv, k.dataset.dier) })
    Array.prototype.forEach.call($('info').querySelectorAll('[data-bodem]'), function (k) { k.disabled = !!DT.waaromNietBodem(S, gv, k.dataset.bodem) })
    Array.prototype.forEach.call($('info').querySelectorAll('[data-item]'), function (k) { k.disabled = S.geld < DT.INRICHTING[k.dataset.item].prijs || DT.ruimteOver(gv) < 1 })
  }
}
$('niveauverder').onclick = function () { $('niveauscherm').classList.remove('aan') }

// ── baby's ──
var babyOm = 40
function geboren() {
  var r = DT.geboorte(S)
  if (!r) return
  babyHok = r.hok.id; wijziging(); babyHok = null
  Geluid.dier(); toon(1320, 0.18, 'sine', 0.05, 0.25, 1760)
  var p = scherm(r.hok.x + r.hok.w / 2, r.hok.y + r.hok.h / 2); spat(p[0], p[1], '#ff9fd0', 24); tekst(p[0], p[1] - 14, '+1 baby!', '#ffb3e6')
  melding('Hoera! Er is een baby geboren bij de <b>' + meervoud(r.soort) + '</b>!')
}

// ── hoofdlus ──
var tijd = 0, statsOm = 0
function frame(nu) {
  var dt = Math.min(0.1, (nu - (frame.vorig || nu)) / 1000); frame.vorig = nu
  tijd += dt
  statsOm -= dt
  if (statsOm <= 0) { ST = DT.stats(S); statsOm = 1 }
  var n = DT.stap(S, dt, ST)
  for (var i = 0; i < n; i++) {
    nieuweBezoeker()
    if (Math.random() < 0.35) { var ip = scherm(DT.INGANG.x + 0.5, DT.INGANG.y); tekst(ip[0], ip[1] - 6, '+' + Math.round(ST.entree + ST.kraam)); Geluid.kassa() }
  }
  babyOm -= dt
  if (babyOm <= 0) { babyOm = 30 + Math.random() * 30; geboren() }
  beweegDieren(dt); beweegBezoekers(dt)
  if (vuil) { bouwLaag(); vuil = false }

  var g = ctx
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(laag, 0, 0)
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  // golfjes in de badjes
  S.verblijven.forEach(function (v) {
    v.items.forEach(function (it, n) {
      if (it.soort !== 'water') return
      var c = scherm(it.x + 0.5, it.y + 0.5), rp = (tijd * 0.5 + n * 0.37 + v.id * 0.21) % 1
      g.strokeStyle = 'rgba(210,245,255,' + (0.6 * (1 - rp)) + ')'; g.lineWidth = 1.2
      g.beginPath(); g.ellipse(c[0], c[1], 0.32 * rp * TW / 2 + 1, 0.32 * rp * TH / 2 + 0.5, 0, 0, TAU); g.stroke()
    })
  })
  // alles wat hoogte heeft, van achter naar voor
  var lijst = []
  S.objecten.forEach(function (o) { lijst.push({ d: o.x + o.y + 1, teken: function () { var p = scherm(o.x + 0.5, o.y + 0.5); tekenObject(g, o.soort, p[0], p[1], tijd) } }) })
  S.verblijven.forEach(function (v) {
    v.items.forEach(function (it) {
      if (it.soort === 'water') return
      lijst.push({ d: it.x + it.y + 1, teken: function () { var p = scherm(it.x + 0.5, it.y + 0.5); tekenItem(g, it.soort, p[0], p[1], tijd) } })
    })
    ;(lopers[v.id] || []).forEach(function (dd) {
      lijst.push({ d: dd.x + dd.y, teken: function () { var p = scherm(dd.x, dd.y); tekenDier(g, dd.soort, p[0], p[1], T * GROOTTE[dd.soort] * (1 - 0.45 * (dd.baby || 0)), dd.rechts, dd.f) } })
    })
    hekRanden(v).voor.forEach(function (e) {
      lijst.push({ d: (e[0] + e[2]) / 2 + (e[1] + e[3]) / 2 + 0.02, teken: function () { hekStuk(g, scherm(e[0], e[1]), scherm(e[2], e[3]), v.bodem, true) } })
    })
    if (v.dieren.length && v.zichtbaar && DT.blijheid(S, v).waarde >= 0.85) {
      var z = 0.6 + 0.4 * Math.sin(tijd * 3 + v.id)
      lijst.push({ d: v.x + v.y + v.w + v.h, teken: function () {
        var hp = scherm(v.x + v.w * 0.5, v.y + v.h * 0.5), u = T * 0.16 * z, x = hp[0], y = hp[1] - TW * 0.9
        g.globalAlpha = 0.9; gloed(g, '#ff4fd8', 10); g.fillStyle = '#ff4fd8'; g.beginPath(); g.moveTo(x, y + u)
        g.bezierCurveTo(x - u * 1.6, y - u * 0.2, x - u * 0.7, y - u * 1.4, x, y - u * 0.5); g.bezierCurveTo(x + u * 0.7, y - u * 1.4, x + u * 1.6, y - u * 0.2, x, y + u); g.fill()
        g.shadowBlur = 0; g.globalAlpha = 1
      } })
    }
  })
  bezoekers.forEach(function (b) { lijst.push({ d: b.x + b.y + 1, teken: function () { tekenBezoeker(g, b) } }) })
  lijst.push({ d: DT.INGANG.x + DT.INGANG.y + 1.6, teken: function () { tekenIngang(g, tijd) } })
  lijst.sort(function (a, b) { return a.d - b.d })
  lijst.forEach(function (l) { l.teken() })

  // voorbeeld van wat je gaat bouwen
  if (zweef && modus && modus.type === 'hek') {
    var sleept = drukt && hekStart, hp = sleept ? hekPlan(hekStart, zweef) : null, rh = hp ? hp.r : { x: zweef[0], y: zweef[1], w: 1, h: 1 }
    var okh = hp ? (hp.hok ? !DT.waaromNietMaat(S, hp.hok, rh.x, rh.y, rh.w, rh.h) : !DT.waaromNietHok(S, rh.x, rh.y, rh.w, rh.h)) : (DT.vrij(S, rh.x, rh.y) || !!DT.verblijfOp(S, rh.x, rh.y))
    pad4(g, [scherm(rh.x, rh.y), scherm(rh.x + rh.w, rh.y), scherm(rh.x + rh.w, rh.y + rh.h), scherm(rh.x, rh.y + rh.h)])
    g.fillStyle = okh ? 'rgba(255,210,122,.25)' : 'rgba(255,92,122,.28)'; g.fill()
    g.strokeStyle = okh ? '#ffd27a' : '#ff5c7a'; g.lineWidth = 2.5; g.setLineDash([7, 4]); g.stroke(); g.setLineDash([])
    if (sleept) {
      var mc = scherm(rh.x + rh.w / 2, rh.y + rh.h / 2), lbl = rh.w + ' × ' + rh.h + '  ·  ' + DT.kort(hp.hok ? DT.maatPrijs(S, hp.hok, rh.w, rh.h) : DT.hekPrijs(rh.w, rh.h)) + ' munten' + (hp.hok ? ' (groter)' : '')
      g.font = '800 14px Outfit, Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
      var bw = g.measureText(lbl).width + 18
      g.fillStyle = 'rgba(12,14,34,.85)'; g.beginPath(); g.roundRect ? g.roundRect(mc[0] - bw / 2, mc[1] - 13, bw, 26, 13) : g.rect(mc[0] - bw / 2, mc[1] - 13, bw, 26); g.fill()
      g.fillStyle = okh ? '#ffe9b0' : '#ffb3c1'; g.fillText(lbl, mc[0], mc[1] + 1); g.textBaseline = 'alphabetic'
    }
  } else if (zweef && modus && (modus.type === 'object' || modus.type === 'item' || (modus.type === 'pad' && !S.pad[DT.sleutel(zweef[0], zweef[1])] && DT.binnen(S, zweef[0], zweef[1])))) {
    var x = zweef[0], y = zweef[1], ok
    if (modus.type === 'object') ok = DT.kanObject(S, modus.soort, x, y)
    else if (modus.type === 'item') { var vz = DT.verblijfOp(S, x, y); ok = !!vz && !DT.waaromNietItem(S, vz, modus.soort, x, y) }
    else ok = DT.kanPad(S, x, y)
    pad4(g, [scherm(x, y), scherm(x + 1, y), scherm(x + 1, y + 1), scherm(x, y + 1)])
    g.fillStyle = ok ? 'rgba(77,255,160,.25)' : 'rgba(255,92,122,.28)'; g.fill()
    g.strokeStyle = ok ? '#4dffa0' : '#ff5c7a'; g.lineWidth = 2; g.setLineDash([6, 4]); g.stroke(); g.setLineDash([])
  }
  if (gekozenVerblijf) {
    var gv = gekozenVerblijf
    pad4(g, [scherm(gv.x, gv.y), scherm(gv.x + gv.w, gv.y), scherm(gv.x + gv.w, gv.y + gv.h), scherm(gv.x, gv.y + gv.h)])
    g.strokeStyle = 'rgba(255,255,255,' + (0.55 + 0.35 * Math.sin(tijd * 5)) + ')'; g.lineWidth = 3; g.stroke()
  }

  if (THEMA.sneeuw) tekenSneeuw(g, dt)
  for (var k = deeltjes.length - 1; k >= 0; k--) {
    var dd = deeltjes[k]; dd.leef -= dt
    if (dd.leef <= 0) { deeltjes.splice(k, 1); continue }
    dd.x += dd.vx * dt; dd.y += dd.vy * dt; dd.vy += 160 * dt
    g.globalAlpha = Math.min(1, dd.leef * 2); g.fillStyle = dd.kleur; g.fillRect(dd.x - 2, dd.y - 2, 4, 4)
  }
  g.globalAlpha = 1
  for (var j = teksten.length - 1; j >= 0; j--) {
    var t = teksten[j]; t.leef -= dt
    if (t.leef <= 0) { teksten.splice(j, 1); continue }
    t.y -= 30 * dt
    g.globalAlpha = Math.min(1, t.leef * 1.5); g.fillStyle = t.kleur; g.font = '800 15px Outfit, Nunito, sans-serif'; g.textAlign = 'center'
    g.fillText(t.t, t.x, t.y)
  }
  g.globalAlpha = 1
  werkHudBij(dt)
  requestAnimationFrame(frame)
}

// ── start ──
// nieuw: meteen paden leggen; anders rustig kijken bij de dieren
if (Object.keys(S.pad).length < 3 && !S.verblijven.length) modus = { type: 'pad' }
else tab = 'dier'
$('hint').classList.add('verborgen')
bouwTabs(); bouwItems(); syncDieren(); meet(); werkHintBij(); zetZoomKnoppen()
werkItemsBij()
if (CREATIEF) setTimeout(function () { melding('Creatieve modus: <b>oneindig geld</b> en alles is vrij!') }, 400)
if (wegGeld > 0) melding('Terwijl je weg was, verdiende je dierentuin <b>' + DT.kort(wegGeld) + '</b> munten!')
requestAnimationFrame(frame)
})()
