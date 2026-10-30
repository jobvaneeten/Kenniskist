// Vlotstrijd — scherm, besturing, tekeningen, geluid en winkel. De regels
// en levels staan in kern.js.
(function () {
'use strict'
var cv = document.getElementById('c'), ctx = cv.getContext('2d')
var $ = function (id) { return document.getElementById(id) }
var TAU = Math.PI * 2

// ── inbedding: met ?terug=1 vrij spelen, anders 1 level als beloning ──
var params = new URLSearchParams(location.search)
var BELONING = !params.has('terug')
if (!BELONING) $('terug').onclick = function () { parent.postMessage({ type: 'vlotstrijd-terug' }, '*') }

// ── opslag (kk_-prefix ⇒ synct mee naar het account) ──
var OPSLAG = 'kk_vlot'
var D = (function () {
  var d = {}
  try { d = JSON.parse(localStorage.getItem(OPSLAG) || '{}') || {} } catch (e) {}
  return { munten: d.munten || 0, open: Math.min(VS.LEVELS - 1, d.open || 0), sterren: d.sterren || {}, wapens: d.wapens || ['bal'],
    upgrades: d.upgrades || {}, geluid: d.geluid !== false, wapen: d.wapen || 'bal' }
})()
function bewaar() { try { localStorage.setItem(OPSLAG, JSON.stringify(D)) } catch (e) {} }

// ── kleurhulp ──
function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] }
function rgba(h, a) { var c = hex(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')' }
function tint(h, f) { var c = hex(h).map(function (v) { return Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)) }); return 'rgb(' + c.join(',') + ')' }
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
}
function cirkel(g, x, y, r, kleur) { g.fillStyle = kleur; g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); g.fill() }
function ellips(g, x, y, rx, ry, kleur) { g.fillStyle = kleur; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); g.fill() }
function lijn(g, x1, y1, x2, y2, kleur, b) { g.strokeStyle = kleur; g.lineWidth = b; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke() }
function rand(seed) { var r = VS.rng(seed); return r }

// ── layout: het veld (1600 × 900) past altijd helemaal in beeld ──
var dpr = 1, W = 0, H = 0, S = 1, OX = 0, OY = 0
function meet() {
  dpr = Math.min(2, window.devicePixelRatio || 1)
  W = innerWidth; H = innerHeight
  cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr)
  S = Math.min(W / VS.B, H / VS.H)
  // op een hoog scherm komt de extra ruimte vooral boven (lucht), niet onder (lege zee)
  OX = (W - VS.B * S) / 2; OY = (H - VS.H * S) * 0.78
  verAf = null
}
window.addEventListener('resize', meet)

// ── geluid ──
var AC = null
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)() } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC }
function toon(f, dur, type, vol, delay, f2) {
  if (!D.geluid) return
  var a = audio(); if (!a) return
  var t = a.currentTime + (delay || 0), o = a.createOscillator(), gn = a.createGain()
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur)
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol || 0.07, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(gn); gn.connect(a.destination); o.start(t); o.stop(t + dur + 0.02)
}
function ruis(dur, vol, laag, hoog, delay) {
  if (!D.geluid) return
  var a = audio(); if (!a) return
  var n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0)
  for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2)
  var src = a.createBufferSource(), f = a.createBiquadFilter(), gn = a.createGain(), t = a.currentTime + (delay || 0)
  f.type = 'bandpass'; f.frequency.setValueAtTime(hoog, t); f.frequency.exponentialRampToValueAtTime(laag, t + dur); f.Q.value = 0.8
  gn.gain.value = vol
  src.buffer = buf; src.connect(f); f.connect(gn); gn.connect(a.destination); src.start(t)
}
var Geluid = {
  schot: function () { toon(140, 0.18, 'sine', 0.12, 0, 60); ruis(0.15, 0.25, 300, 1800) },
  vijand: function () { toon(110, 0.2, 'triangle', 0.08, 0, 50); ruis(0.12, 0.15, 250, 1200) },
  plons: function () { ruis(0.45, 0.3, 200, 2400) },
  boem: function () { toon(80, 0.45, 'sawtooth', 0.09, 0, 30); ruis(0.6, 0.5, 80, 900) },
  raak: function () { toon(520, 0.08, 'square', 0.05); toon(260, 0.14, 'triangle', 0.06, 0.03) },
  au: function () { toon(330, 0.18, 'sawtooth', 0.04, 0, 160) },
  blok: function () { ruis(0.12, 0.25, 600, 2400); toon(180, 0.06, 'square', 0.03) },
  stuit: function () { toon(420, 0.12, 'sine', 0.06, 0, 700) },
  klik: function () { toon(880, 0.05, 'triangle', 0.04) },
  win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { toon(f, 0.32, 'triangle', 0.06, i * 0.1) }) },
  verlies: function () { [392, 330, 262, 196].forEach(function (f, i) { toon(f, 0.34, 'triangle', 0.06, i * 0.14) }) },
  koop: function () { toon(988, 0.08, 'square', 0.04); toon(1319, 0.16, 'triangle', 0.05, 0.07) },
}
function tekenGeluidKnop() { $('golf').style.display = D.geluid ? '' : 'none' }
$('geluid').onclick = function (e) { e.stopPropagation(); D.geluid = !D.geluid; bewaar(); tekenGeluidKnop() }

// ── staat ──
var s = null, wereld = 0, tijd = 0, schud = 0, flits = 0, bliksem = 0, vijandWacht = 0, gepauzeerd = false
var deeltjes = [], teksten = [], ringen = [], vallen = {}, flitsFig = {}, mik = null, bannerTimer = null, gekozen = 'bal'
function thema() { return THEMA[(s ? s.def.w : wereld)] }

// ── werelden: lucht, verte, zee en weer ──
var THEMA = [
  { lucht: ['#060a2a', '#1a0f45', '#3a1660'], zee: ['#0b2a52', '#071636', '#040a1e'], golf: '#3ef0ff', glim: ['#ff4fd8', '#3ef0ff', '#ffc83d'], vlot: '#8a5a32' },
  { lucht: ['#020a1c', '#08223f', '#0f3a5c'], zee: ['#1a5a86', '#0d3456', '#061a30'], golf: '#bff6ff', glim: ['#7dffcf', '#9be8ff', '#c79bff'], vlot: '#cfeeff' },
  { lucht: ['#1a0508', '#4a0f14', '#a8331a'], zee: ['#3a0f10', '#220709', '#120304'], golf: '#ff8a3d', glim: ['#ff6a1a', '#ffc83d', '#ff3a1a'], vlot: '#3a2a2a' },
  { lucht: ['#06050f', '#141228', '#2a2346'], zee: ['#1c2440', '#10162c', '#070a18'], golf: '#c08bff', glim: ['#c08bff', '#7df9ff', '#ffffff'], vlot: '#4a3a2a' },
]
var verAf = null, verWereld = -1
var MENU_STUK = ['vuurtoren', 'ijspiek', 'lavapiek', 'wrakmast']
// de verte verandert niet: één keer tekenen per formaat en wereld
function bouwVerte(w) {
  var c = document.createElement('canvas'); c.width = Math.floor(W * dpr); c.height = Math.floor(H * dpr)
  var g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0)
  var T = THEMA[w], zy = OY + VS.ZEE * S
  var l = g.createLinearGradient(0, 0, 0, zy)
  l.addColorStop(0, T.lucht[0]); l.addColorStop(0.55, T.lucht[1]); l.addColorStop(1, T.lucht[2])
  g.fillStyle = l; g.fillRect(0, 0, W, zy + 2)
  var r = rand(40 + w)
  if (w !== 2) for (var i = 0; i < 160; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.2 + r() * 0.6) + ')'; var sz = r() * 1.6 + 0.4; g.fillRect(r() * W, r() * zy * 0.8, sz, sz) }
  if (w === 0) {
    // maan en een neonstad aan de horizon
    var mx = W * 0.8, my = zy * 0.22, mr = Math.min(W, H) * 0.06
    var gl = g.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3); gl.addColorStop(0, 'rgba(255,230,255,.35)'); gl.addColorStop(1, 'rgba(255,230,255,0)')
    g.fillStyle = gl; g.fillRect(0, 0, W, zy)
    cirkel(g, mx, my, mr, '#fdf0ff'); cirkel(g, mx + mr * 0.3, my - mr * 0.2, mr * 0.18, 'rgba(200,180,230,.5)'); cirkel(g, mx - mr * 0.35, my + mr * 0.3, mr * 0.12, 'rgba(200,180,230,.5)')
    for (var laag = 0; laag < 2; laag++) {
      var x = -20, kleur = laag ? '#0c0726' : '#130b38'
      while (x < W) {
        var bw = (30 + r() * 70) * S * 1.4, bh = (60 + r() * (laag ? 170 : 110)) * S * 1.4
        g.fillStyle = kleur; g.fillRect(x, zy - bh, bw, bh)
        for (var wy = zy - bh + 8; wy < zy - 6; wy += 10 * S * 1.2) for (var wx = x + 5; wx < x + bw - 6; wx += 9 * S * 1.2) {
          if (r() < 0.35) { g.fillStyle = rgba(T.glim[Math.floor(r() * 3)], laag ? 0.75 : 0.45); g.fillRect(wx, wy, 3.5 * S * 1.2, 4 * S * 1.2) }
        }
        if (laag && r() < 0.25) { g.save(); g.shadowColor = T.glim[0]; g.shadowBlur = 14; g.fillStyle = T.glim[Math.floor(r() * 3)]; g.fillRect(x + bw * 0.2, zy - bh - 6, bw * 0.6, 4); g.restore() }
        x += bw + r() * 8
      }
    }
  } else if (w === 1) {
    // ijsbergen in de verte
    for (var b = 0; b < 7; b++) {
      var bx = r() * W, bb = (80 + r() * 160) * S * 1.3, bh2 = (50 + r() * 130) * S * 1.3
      var gg = g.createLinearGradient(0, zy - bh2, 0, zy); gg.addColorStop(0, '#e8f8ff'); gg.addColorStop(1, '#5a9cc8')
      g.fillStyle = gg; g.beginPath(); g.moveTo(bx - bb / 2, zy); g.lineTo(bx - bb * 0.2, zy - bh2); g.lineTo(bx + bb * 0.05, zy - bh2 * 0.8); g.lineTo(bx + bb * 0.25, zy - bh2 * 0.95); g.lineTo(bx + bb / 2, zy); g.fill()
      g.fillStyle = 'rgba(120,170,220,.35)'; g.beginPath(); g.moveTo(bx + bb * 0.05, zy - bh2 * 0.8); g.lineTo(bx + bb * 0.25, zy - bh2 * 0.95); g.lineTo(bx + bb / 2, zy); g.lineTo(bx + bb * 0.1, zy); g.fill()
    }
  } else if (w === 2) {
    // vulkaan met lavastromen
    var vx = W * 0.78, vb = zy, vt = zy - zy * 0.55, vw = W * 0.24
    var hal = g.createRadialGradient(vx, vt, 0, vx, vt, W * 0.3); hal.addColorStop(0, 'rgba(255,140,60,.55)'); hal.addColorStop(1, 'rgba(255,80,30,0)')
    g.fillStyle = hal; g.fillRect(0, 0, W, zy)
    g.fillStyle = '#1e0a0c'; g.beginPath(); g.moveTo(vx - vw, vb); g.lineTo(vx - vw * 0.16, vt); g.lineTo(vx + vw * 0.16, vt); g.lineTo(vx + vw, vb); g.fill()
    g.save(); g.shadowColor = '#ff6a1a'; g.shadowBlur = 16; g.strokeStyle = '#ff7a2a'; g.lineWidth = Math.max(2, 4 * S); g.lineCap = 'round'
    ;[[-0.1, 0.5], [0.05, 0.75], [0.12, 0.4], [-0.04, 0.9]].forEach(function (p) { g.beginPath(); g.moveTo(vx + vw * p[0], vt); g.quadraticCurveTo(vx + vw * (p[0] * 2.2), vt + (vb - vt) * p[1] * 0.5, vx + vw * p[0] * 3.2, vt + (vb - vt) * p[1]); g.stroke() })
    g.restore()
    ellips(g, vx, vt, vw * 0.16, 6 * S, '#ffc860')
    g.fillStyle = '#2a0c0e'; g.beginPath(); g.moveTo(0, zy); g.quadraticCurveTo(W * 0.15, zy - zy * 0.18, W * 0.35, zy); g.fill()
  } else {
    // stormwolken en een spookschip in de verte
    for (var k = 0; k < 9; k++) { var wx2 = r() * W, wy2 = r() * zy * 0.4, wr = (90 + r() * 160) * S * 1.2; ellips(g, wx2, wy2, wr, wr * 0.35, 'rgba(60,50,90,.55)'); ellips(g, wx2 + wr * 0.4, wy2 + wr * 0.08, wr * 0.7, wr * 0.28, 'rgba(40,34,64,.6)') }
    var sx = W * 0.25, sy = zy - 6, sw = 170 * S
    g.fillStyle = 'rgba(30,26,50,.9)'; g.beginPath(); g.moveTo(sx - sw / 2, sy - sw * 0.18); g.lineTo(sx + sw / 2, sy - sw * 0.18); g.lineTo(sx + sw * 0.38, sy); g.lineTo(sx - sw * 0.4, sy); g.fill()
    ;[-0.2, 0.12].forEach(function (m) { lijn(g, sx + sw * m, sy - sw * 0.18, sx + sw * m, sy - sw * 0.9, 'rgba(30,26,50,.9)', 3 * S); g.fillStyle = 'rgba(160,140,220,.18)'; g.beginPath(); g.moveTo(sx + sw * m, sy - sw * 0.85); g.quadraticCurveTo(sx + sw * (m + 0.2), sy - sw * 0.6, sx + sw * m, sy - sw * 0.3); g.fill() })
    cirkel(g, sx + sw * 0.3, sy - sw * 0.24, 3 * S, 'rgba(125,249,255,.8)')
  }
  // gloed bij de horizon
  var hz = g.createLinearGradient(0, zy - 80 * S, 0, zy); hz.addColorStop(0, rgba(THEMA[w].glim[0], 0)); hz.addColorStop(1, rgba(THEMA[w].glim[0], 0.22))
  g.fillStyle = hz; g.fillRect(0, zy - 80 * S, W, 80 * S)
  return c
}
// het noorderlicht beweegt en tekenen we elk beeld
function noorderlicht() {
  var zy = OY + VS.ZEE * S
  ;[['125,255,207', 0.13, 0.22], ['155,232,255', 0.2, 0.15], ['199,155,255', 0.27, 0.1]].forEach(function (b, i) {
    ctx.strokeStyle = 'rgba(' + b[0] + ',' + b[2] + ')'; ctx.lineWidth = zy * 0.07; ctx.lineCap = 'round'
    ctx.beginPath()
    for (var k = 0; k <= 24; k++) { var x = W * k / 24, y = zy * b[1] + Math.sin(k * 0.5 + tijd * 0.4 + i) * zy * 0.05; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y) }
    ctx.stroke()
  })
}
function rookVulkaan() {
  var zy = OY + VS.ZEE * S, vx = W * 0.78, vt = zy - zy * 0.55
  for (var i = 0; i < 8; i++) {
    var f = ((tijd * 0.08 + i / 8) % 1), y = vt - f * zy * 0.45, x = vx + Math.sin(f * 4 + i) * 30 * S + f * 60 * S
    cirkel(ctx, x, y, (20 + f * 60) * S, 'rgba(60,40,44,' + (0.45 * (1 - f)) + ')')
  }
}

// ── zee ──
function golfY(x, t, laag) { return VS.ZEE + Math.sin(x * 0.012 + t * 1.6 + laag) * 5 + Math.sin(x * 0.031 - t * 2.3 + laag * 2) * 2.5 }
function zee(achter) {
  var T = thema(), zy = OY + VS.ZEE * S
  if (achter) {
    var g = ctx.createLinearGradient(0, zy, 0, H)
    g.addColorStop(0, T.zee[0]); g.addColorStop(0.4, T.zee[1]); g.addColorStop(1, T.zee[2])
    ctx.fillStyle = g; ctx.fillRect(0, zy - 8 * S, W, H - zy + 8 * S)
    // weerspiegelingen
    var diep = H - zy
    for (var i = 0; i < 40; i++) {
      var fx = (i * 0.618) % 1, fy = ((i * 0.377) % 1), len = (30 + (i * 31 % 70)) * S
      var y = zy + 14 * S + fy * fy * diep, a = (0.2 + 0.15 * Math.sin(tijd * 2 + i)) * (1 - fy * 0.6)
      ctx.fillStyle = rgba(T.glim[i % 3], a); ctx.fillRect(fx * W + Math.sin(tijd * 0.8 + i) * 12 * S, y, len * (1 + fy), 2.2 * S * (1 + fy))
    }
    golfLijn(0, rgba(T.golf, 0.35), 3)
    golfLijn(4, rgba(T.golf, 0.15), -4)
  } else {
    // voorste golf over de onderkant van de vlotten
    var vg = ctx.createLinearGradient(0, zy, 0, H)
    vg.addColorStop(0, rgba(T.zee[0], 0.95)); vg.addColorStop(0.25, rgba(T.zee[1], 0.97)); vg.addColorStop(1, T.zee[2])
    ctx.fillStyle = vg
    ctx.beginPath(); ctx.moveTo(0, H)
    for (var px = -20; px <= W + 20; px += 14) { var wx = (px - OX) / S; ctx.lineTo(px, OY + (golfY(wx, tijd, 2) + 8) * S) }
    ctx.lineTo(W, H); ctx.fill()
    golfLijn(2, rgba(T.golf, 0.75), 8, true)
    // schuimvlokjes op de kam
    for (var sf = 0; sf < 36; sf++) {
      var fx = ((sf * 0.137 + tijd * 0.012 * (sf % 3 + 1)) % 1) * (W + 40) - 20, fwx = (fx - OX) / S
      var fy = OY + (golfY(fwx, tijd, 2) + 9) * S
      ellips(ctx, fx, fy, (5 + sf % 4 * 2) * S * 1.5, 2 * S * 1.5, 'rgba(255,255,255,' + (0.25 + 0.2 * Math.sin(tijd * 3 + sf)) + ')')
    }
    golfLijn(3, rgba(T.golf, 0.18), 30)
    golfLijn(1, rgba(T.golf, 0.12), 70)
  }
}
function golfLijn(laag, kleur, dy, glow) {
  ctx.save(); if (glow) { ctx.shadowColor = kleur; ctx.shadowBlur = 10 }
  ctx.strokeStyle = kleur; ctx.lineWidth = Math.max(1.5, 2.5 * S); ctx.beginPath()
  for (var px = -20; px <= W + 20; px += 12) { var wx = (px - OX) / S, y = OY + (golfY(wx, tijd, laag) + dy) * S; if (px < -10) ctx.moveTo(px, y); else ctx.lineTo(px, y) }
  ctx.stroke(); ctx.restore()
}

// ── weer ──
var weer = []
function weerDeeltjes(dt) {
  var w = s ? s.def.w : wereld
  if (w === 0) return
  var nodig = w === 3 ? 140 : w === 1 ? 90 : 50
  while (weer.length < nodig) weer.push({ x: Math.random() * W, y: Math.random() * H, v: Math.random(), f: Math.random() * 6 })
  var wind = s ? s.wind : 0
  weer.forEach(function (d) {
    if (w === 1) { d.y += (30 + d.v * 40) * dt; d.x += (Math.sin(tijd + d.f) * 15 + wind * 0.35) * dt; cirkel(ctx, d.x, d.y, 1 + d.v * 1.8, 'rgba(255,255,255,.8)') }
    else if (w === 2) { d.y -= (25 + d.v * 40) * dt; d.x += (Math.sin(tijd * 2 + d.f) * 20 + wind * 0.3) * dt; cirkel(ctx, d.x, d.y, 1 + d.v * 1.5, 'rgba(255,' + (120 + d.v * 100 | 0) + ',40,' + (0.5 + d.v * 0.4) + ')') }
    else { d.y += (700 + d.v * 300) * dt; d.x += (wind * 1.2 - 120) * dt; lijn(ctx, d.x, d.y, d.x - 4 + wind * 0.02, d.y - 14, 'rgba(180,190,255,.35)', 1) }
    if (d.y > H + 10) { d.y = -10; d.x = Math.random() * W } if (d.y < -10) { d.y = H + 10; d.x = Math.random() * W }
    if (d.x > W + 20) d.x = -20; if (d.x < -20) d.x = W + 20
  })
}

// ── vlotten, dekking en palen (in veld-coördinaten) ──
function bob(kant) { return Math.sin(tijd * 1.3 + (kant === 'speler' ? 0 : 1.8)) * 3.5 }
function vlot(x0, x1, kant, w) {
  var y = VS.DEK + bob(kant), T = THEMA[w], g = ctx
  g.save()
  if (w === 1 && kant === 'vijand') {
    // ijsschots
    var ig = g.createLinearGradient(0, y, 0, y + 34); ig.addColorStop(0, '#f2fbff'); ig.addColorStop(1, '#6fb2dc')
    g.fillStyle = ig; g.beginPath(); g.moveTo(x0 - 10, y); g.lineTo(x1 + 12, y); g.lineTo(x1 - 6, y + 36); g.lineTo(x0 + 8, y + 36); g.fill()
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x0, y, x1 - x0, 4)
  } else if (w === 2 && kant === 'vijand') {
    // lavarots met gloeiende spleten
    g.fillStyle = '#2a1a1a'; g.beginPath(); g.moveTo(x0 - 8, y); g.lineTo(x1 + 8, y); g.lineTo(x1 - 14, y + 38); g.lineTo(x0 + 14, y + 38); g.fill()
    g.shadowColor = '#ff6a1a'; g.shadowBlur = 10; g.strokeStyle = '#ff7a2a'; g.lineWidth = 2
    for (var i = 0; i < 5; i++) { var cx = x0 + (i + 0.5) * (x1 - x0) / 5; g.beginPath(); g.moveTo(cx - 14, y + 6); g.lineTo(cx, y + 18); g.lineTo(cx + 10, y + 30); g.stroke() }
  } else {
    // houten vlot van boomstammen
    var stam = kant === 'speler' || w === 0 ? '#9a6436' : w === 3 ? '#4a3a30' : T.vlot
    var n = Math.round((x1 - x0) / 34)
    for (var j = 0; j < n; j++) {
      var sx = x0 + j * (x1 - x0) / n, sw = (x1 - x0) / n + 1
      var sg = g.createLinearGradient(0, y, 0, y + 26); sg.addColorStop(0, tint(stam, 0.25)); sg.addColorStop(0.5, stam); sg.addColorStop(1, tint(stam, -0.45))
      g.fillStyle = sg; rr(g, sx, y, sw - 2, 26, 9); g.fill()
      cirkel(g, sx + sw / 2 - 1, y + 13, 5, tint(stam, -0.3)); cirkel(g, sx + sw / 2 - 1, y + 13, 2.5, tint(stam, 0.1))
    }
    g.fillStyle = tint(stam, 0.15); g.fillRect(x0 - 4, y - 6, x1 - x0 + 8, 8)
    g.strokeStyle = '#e8d29a'; g.lineWidth = 2.5
    ;[x0 + 30, (x0 + x1) / 2, x1 - 30].forEach(function (tx) { g.beginPath(); g.moveTo(tx, y - 6); g.lineTo(tx + 6, y + 24); g.stroke() })
    // mast met vlag
    var mx = kant === 'speler' ? x0 + 30 : x1 - 26, vlag = kant === 'speler' ? '#3ef0ff' : w === 3 ? '#c08bff' : '#ff4f6a'
    lijn(g, mx, y - 4, mx, y - 150, '#5a3a1e', 6)
    var wap = Math.sin(tijd * 4) * 6, dir = kant === 'speler' ? 1 : -1
    g.shadowColor = vlag; g.shadowBlur = 14; g.fillStyle = vlag
    g.beginPath(); g.moveTo(mx, y - 148); g.quadraticCurveTo(mx + dir * 30, y - 140 + wap, mx + dir * 58, y - 132 + wap); g.lineTo(mx, y - 112); g.fill()
    g.shadowBlur = 0
    if (kant === 'vijand') { cirkel(g, mx + dir * 22, y - 132 + wap * 0.5, 6, '#fff'); lijn(g, mx + dir * 16, y - 122, mx + dir * 28, y - 120, '#fff', 2) }
    else { g.fillStyle = '#071018'; g.font = '900 16px "Russo One"'; g.textAlign = 'center'; g.fillText('★', mx + dir * 22, y - 127 + wap * 0.5) }
    var lt = 0.75 + 0.25 * Math.sin(tijd * 3 + (kant === 'speler' ? 0 : 2))
    var lx = mx + dir * 10, ly = y - 78
    lijn(g, mx, ly - 14, lx, ly - 14, '#5a3a1e', 3); lijn(g, lx, ly - 14, lx, ly - 6, '#3a2a1a', 2)
    var lg = g.createRadialGradient(lx, ly + 4, 1, lx, ly + 4, 46); lg.addColorStop(0, 'rgba(255,214,120,' + 0.55 * lt + ')'); lg.addColorStop(1, 'rgba(255,214,120,0)')
    g.fillStyle = lg; g.beginPath(); g.arc(lx, ly + 4, 46, 0, TAU); g.fill()
    rr(g, lx - 7, ly - 6, 14, 20, 4); g.fillStyle = 'rgba(255,230,160,.95)'; g.fill(); g.strokeStyle = '#3a2a1a'; g.lineWidth = 2; g.stroke()
    if (kant === 'speler') {
      var tx = x1 - 34, ty = y - 44, tg2 = g.createLinearGradient(tx - 18, 0, tx + 18, 0)
      tg2.addColorStop(0, '#6a3a1a'); tg2.addColorStop(0.5, '#b0703a'); tg2.addColorStop(1, '#5a2e14')
      g.fillStyle = tg2; rr(g, tx - 18, ty, 36, 42, 10); g.fill()
      g.save(); g.shadowColor = '#3ef0ff'; g.shadowBlur = 10; g.fillStyle = '#3ef0ff'; g.fillRect(tx - 18, ty + 9, 36, 4); g.fillRect(tx - 18, ty + 29, 36, 4); g.restore()
    }
  }
  g.restore()
}
function blok(b) {
  if (b.stuk) return   // obstakels in zee tekent tekenStuk
  var g = ctx, y = b.y + (b.kant === 'zee' ? 0 : bob(b.kant)), x = b.x, w = b.w, h = b.h, so = b.soort
  g.save()
  if (so === 'krat') {
    var kg = g.createLinearGradient(x, y, x, y + h); kg.addColorStop(0, '#d79a5a'); kg.addColorStop(1, '#8a5a2e')
    g.fillStyle = kg; rr(g, x, y, w, h, 5); g.fill()
    g.strokeStyle = '#5a3416'; g.lineWidth = 4; rr(g, x + 3, y + 3, w - 6, h - 6, 3); g.stroke()
    g.beginPath(); g.moveTo(x + 6, y + 6); g.lineTo(x + w - 6, y + h - 6); g.moveTo(x + w - 6, y + 6); g.lineTo(x + 6, y + h - 6); g.stroke()
    if (b.kant === 'speler') { g.shadowColor = '#3ef0ff'; g.shadowBlur = 10; g.strokeStyle = 'rgba(62,240,255,.8)'; g.lineWidth = 2; rr(g, x, y, w, h, 5); g.stroke() }
  } else if (so === 'ijs') {
    var ig = g.createLinearGradient(x, y, x + w, y + h); ig.addColorStop(0, 'rgba(235,252,255,.95)'); ig.addColorStop(1, 'rgba(110,190,235,.85)')
    g.fillStyle = ig; rr(g, x, y, w, h, 6); g.fill()
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 8, y + 10); g.lineTo(x + 22, y + 24); g.moveTo(x + w - 14, y + h - 18); g.lineTo(x + w - 8, y + h - 10); g.stroke()
  } else if (so === 'rots') {
    g.fillStyle = '#4a3a3a'; g.beginPath(); g.moveTo(x + 4, y + h); g.lineTo(x, y + h * 0.4); g.lineTo(x + w * 0.3, y + 2); g.lineTo(x + w * 0.75, y); g.lineTo(x + w, y + h * 0.45); g.lineTo(x + w - 3, y + h); g.fill()
    g.fillStyle = '#6a5656'; g.beginPath(); g.moveTo(x + w * 0.3, y + 2); g.lineTo(x + w * 0.75, y); g.lineTo(x + w * 0.6, y + h * 0.35); g.fill()
    g.shadowColor = '#ff6a1a'; g.shadowBlur = 8; g.strokeStyle = '#ff7a2a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x + w * 0.2, y + h * 0.7); g.lineTo(x + w * 0.45, y + h * 0.55); g.lineTo(x + w * 0.6, y + h * 0.8); g.stroke()
  } else if (so === 'ton') {
    var tg = g.createLinearGradient(x, 0, x + w, 0); tg.addColorStop(0, '#6a2a1a'); tg.addColorStop(0.5, '#c0482a'); tg.addColorStop(1, '#5a2014')
    g.fillStyle = tg; rr(g, x + 3, y, w - 6, h, 12); g.fill()
    ;[0.2, 0.8].forEach(function (f) { g.fillStyle = '#2a2430'; g.fillRect(x + 2, y + h * f - 3, w - 4, 6) })
    g.shadowColor = '#ffc83d'; g.shadowBlur = 10; g.fillStyle = '#ffc83d'; g.font = '900 20px "Russo One"'; g.textAlign = 'center'; g.fillText('!', x + w / 2, y + h / 2 + 7)
  } else if (so === 'paal') {
    var pg = g.createLinearGradient(x, 0, x + w, 0); pg.addColorStop(0, '#5a3a1e'); pg.addColorStop(0.5, '#9a6a3a'); pg.addColorStop(1, '#4a2e16')
    g.fillStyle = pg; g.fillRect(x + 6, y, w - 12, h)
    g.fillStyle = '#b07a44'; rr(g, x - 4, y - 6, w + 8, 10, 4); g.fill()
    g.strokeStyle = '#e8d29a'; g.lineWidth = 2; for (var k = 1; k * 26 < h; k++) { g.beginPath(); g.moveTo(x + 6, y + k * 26); g.lineTo(x + w - 6, y + k * 26 - 6); g.stroke() }
  } else {
    // pilaar in zee: boei, ijsberg, lavarots of wrak
    var top = y, voet = VS.ZEE + 30
    if (so === 'ijsberg') {
      var ib = g.createLinearGradient(x, top, x + w, voet); ib.addColorStop(0, '#f4fdff'); ib.addColorStop(1, '#5a9cc8')
      g.fillStyle = ib; g.beginPath(); g.moveTo(x - 18, voet); g.lineTo(x + 6, top + 20); g.lineTo(x + w * 0.4, top); g.lineTo(x + w - 4, top + 34); g.lineTo(x + w + 20, voet); g.fill()
    } else if (so === 'lavarots') {
      g.fillStyle = '#2a1818'; g.beginPath(); g.moveTo(x - 14, voet); g.lineTo(x + 4, top + 16); g.lineTo(x + w * 0.55, top); g.lineTo(x + w + 6, top + 26); g.lineTo(x + w + 16, voet); g.fill()
      g.shadowColor = '#ff6a1a'; g.shadowBlur = 14; g.strokeStyle = '#ff8a3a'; g.lineWidth = 3
      g.beginPath(); g.moveTo(x + w * 0.5, top + 6); g.lineTo(x + w * 0.35, top + (voet - top) * 0.4); g.lineTo(x + w * 0.6, top + (voet - top) * 0.7); g.stroke()
    } else if (so === 'wrak') {
      g.fillStyle = '#2a2230'; g.beginPath(); g.moveTo(x - 10, voet); g.lineTo(x + 8, top + 12); g.lineTo(x + w - 6, top); g.lineTo(x + w + 12, voet); g.fill()
      lijn(g, x + w * 0.5, top, x + w * 0.62, top - 60, '#3a3044', 5); g.fillStyle = 'rgba(192,139,255,.25)'; g.fillRect(x + w * 0.62, top - 58, 30, 26)
      g.shadowColor = '#7df9ff'; g.shadowBlur = 12; cirkel(g, x + w * 0.3, top + 30, 5, 'rgba(125,249,255,.85)')
    } else {
      // neonboei
      var bg = g.createLinearGradient(x, 0, x + w, 0); bg.addColorStop(0, '#2a1a5a'); bg.addColorStop(0.5, '#5a3aa8'); bg.addColorStop(1, '#221448')
      g.fillStyle = bg; rr(g, x + 8, top + 18, w - 16, voet - top, 10); g.fill()
      for (var r2 = 0; r2 < 4; r2++) { g.fillStyle = r2 % 2 ? '#ff4fd8' : '#3ef0ff'; g.fillRect(x + 8, top + 30 + r2 * (voet - top - 40) / 4, w - 16, 8) }
      var p = 0.6 + 0.4 * Math.sin(tijd * 3)
      g.shadowColor = '#ffc83d'; g.shadowBlur = 24 * p; cirkel(g, x + w / 2, top + 10, 12, 'rgba(255,220,120,' + p + ')')
    }
  }
  if (b.max !== Infinity && b.hp < b.max) {
    g.shadowBlur = 0; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2
    g.beginPath(); g.moveTo(x + w * 0.3, y); g.lineTo(x + w * 0.45, y + h * 0.4); g.lineTo(x + w * 0.3, y + h * 0.7); g.stroke()
  }
  g.restore()
}

// ── figuren (veld-coördinaten): (x, y) = tussen de voeten, kijkt naar `dir` ──
function oog(g, x, y, r, kijk) { cirkel(g, x, y, r, '#fff'); cirkel(g, x + kijk * r * 0.35, y + r * 0.05, r * 0.55, '#141026'); cirkel(g, x + kijk * r * 0.15, y - r * 0.25, r * 0.22, '#fff') }
function kanonArm(g, sx, sy, hoek, dir, len, kleur) {
  g.save(); g.translate(sx, sy); g.rotate(dir > 0 ? -hoek : Math.PI + hoek)
  rr(g, -4, -6, len, 12, 5); g.fillStyle = kleur || '#2a2f4a'; g.fill()
  g.fillStyle = '#3ef0ff'; g.fillRect(len - 10, -7, 5, 14)
  cirkel(g, 0, 0, 7, '#f2c6a0')
  g.restore()
}
function lijf(g, x, y, br, hg, kleur, streep) {
  var gr = g.createLinearGradient(x - br / 2, 0, x + br / 2, 0); gr.addColorStop(0, tint(kleur, -0.25)); gr.addColorStop(0.5, kleur); gr.addColorStop(1, tint(kleur, -0.35))
  g.fillStyle = gr; rr(g, x - br / 2, y - hg, br, hg, br * 0.35); g.fill()
  if (streep) { g.fillStyle = streep; for (var i = 1; i < 4; i++) g.fillRect(x - br / 2 + 2, y - hg + i * hg / 4 - 2, br - 4, 4) }
}
function benen(g, x, y, kleur, f) {
  var z = Math.sin(f) * 2
  rr(g, x - 11, y - 18, 9, 18 + z, 4); g.fillStyle = kleur; g.fill()
  rr(g, x + 2, y - 18, 9, 18 - z, 4); g.fill()
  ellips(g, x - 7, y, 8, 4, '#1a1426'); ellips(g, x + 7, y, 8, 4, '#1a1426')
}
function tekenFiguur(c, hoek) {
  var g = ctx, m = VS.midden(s, c), dir = c.kant === 'speler' ? 1 : -1, x = c.x, b = bob(c.kant)
  var y = c.voetY + b + (c.zweef ? Math.sin(s.t * 1.7 + c.fase) * c.zweef : 0), adem = Math.sin(tijd * 2.4 + c.id) * 1.2
  var dood = vallen[c.id]
  g.save()
  g.shadowColor = 'rgba(0,0,12,.6)'; g.shadowBlur = 7; g.shadowOffsetY = 2
  if (dood) {
    var t = Math.min(1.6, tijd - dood)
    g.translate(x, y); g.rotate(dir * -t * 1.6); g.translate(-x, -y); y += t * t * 140; g.globalAlpha = Math.max(0, 1 - t / 1.6)
  }
  var fl = flitsFig[c.id] && tijd - flitsFig[c.id] < 0.18
  if (fl) g.filter = 'brightness(2.2)'
  hoek = hoek == null ? (dir > 0 ? 0.6 : 0.6) : hoek
  ellips(g, x, c.voetY + b + 4, c.r * 0.9, 5, 'rgba(0,0,0,.3)')
  var so = c.soort
  if (so === 'mo' || so === 'pip') {
    benen(g, x, y, '#2a3a6a', tijd * 3)
    lijf(g, x, y - 16, 34, 34 + adem, so === 'mo' ? '#ff8a3d' : '#ffd23f')
    cirkel(g, x, y - 66 - adem, 21, so === 'mo' ? '#b97a4a' : '#f6cfa8')
    oog(g, x + 6 * dir, y - 70 - adem, 5.5, dir); oog(g, x - 5 * dir, y - 70 - adem, 5.5, dir)
    g.strokeStyle = '#4a1a1a'; g.lineWidth = 2.4; g.beginPath(); g.arc(x + 2 * dir, y - 60 - adem, 7, 0.2, Math.PI - 0.2); g.stroke()
    if (so === 'mo') {
      g.fillStyle = '#3ef0ff'; g.beginPath(); g.arc(x, y - 72 - adem, 22, Math.PI, 0); g.fill(); g.fillRect(x - 22, y - 76 - adem, 44, 6)
      g.beginPath(); g.moveTo(x - 20 * dir, y - 74 - adem); g.lineTo(x - 36 * dir, y - 66 - adem + Math.sin(tijd * 5) * 3); g.lineTo(x - 30 * dir, y - 78 - adem); g.fill()
    } else {
      g.fillStyle = '#ff4fd8'; g.beginPath(); g.arc(x, y - 74 - adem, 21, Math.PI, 0); g.fill(); rr(g, x - 4 * dir - (dir < 0 ? 26 : 0), y - 78 - adem, 30, 7, 3); g.fill()
      g.fillStyle = '#ffe9ff'; cirkel(g, x, y - 92 - adem, 4, '#fff')
    }
    kanonArm(g, x + 10 * dir, y - 36, hoek, dir, 36, '#222844')
  } else if (so === 'piraat' || so === 'vuurpiraat' || so === 'ijsrover') {
    var kl = so === 'piraat' ? '#e8e4f0' : so === 'vuurpiraat' ? '#2a2030' : '#3a6aa8'
    benen(g, x, y, '#2a2030', tijd * 3)
    lijf(g, x, y - 16, 34, 32 + adem, kl, so === 'piraat' ? '#e8434b' : null)
    cirkel(g, x, y - 64 - adem, 20, so === 'ijsrover' ? '#f6d6c0' : '#d6a07a')
    if (so === 'ijsrover') {
      g.fillStyle = '#f4f8ff'; g.beginPath(); g.arc(x, y - 66 - adem, 25, Math.PI * 0.9, Math.PI * 2.1); g.lineTo(x + 25, y - 54); g.fill()
      rr(g, x - 16, y - 74 - adem, 32, 10, 5); g.fillStyle = '#3ef0ff'; g.fill()
    } else if (so === 'vuurpiraat') {
      for (var v = 0; v < 5; v++) { var vx2 = x - 16 + v * 8, vh = 18 + Math.sin(tijd * 9 + v) * 6; g.save(); g.shadowColor = '#ff6a1a'; g.shadowBlur = 14; g.fillStyle = v % 2 ? '#ffc83d' : '#ff6a1a'; g.beginPath(); g.moveTo(vx2 - 6, y - 76 - adem); g.quadraticCurveTo(vx2, y - 76 - vh - adem, vx2 + 6, y - 76 - adem); g.fill(); g.restore() }
    } else {
      g.fillStyle = '#e8434b'; g.beginPath(); g.arc(x, y - 70 - adem, 21, Math.PI, 0); g.fill()
      g.beginPath(); g.moveTo(x + 18 * dir * -1, y - 72); g.lineTo(x + 32 * -dir, y - 60); g.lineTo(x + 26 * -dir, y - 74); g.fill()
    }
    oog(g, x + 6 * dir, y - 66 - adem, 5, dir)
    if (so === 'piraat') { g.fillStyle = '#141026'; rr(g, x - 13 * dir - 5, y - 71 - adem, 11, 9, 3); g.fill(); lijn(g, x - 20, y - 74 - adem, x + 20, y - 66 - adem, '#141026', 2) }
    else oog(g, x - 6 * dir, y - 66 - adem, 5, dir)
    lijn(g, x - 6, y - 54 - adem, x + 6, y - 55 - adem, '#4a1a1a', 2.2)
    kanonArm(g, x + 10 * dir, y - 34, hoek, dir, 32)
  } else if (so === 'kanonnier' || so === 'robot') {
    var robot = so === 'robot'
    benen(g, x, y, robot ? '#5a6078' : '#1e2850', tijd * 3)
    lijf(g, x, y - 16, 42, 40 + adem, robot ? '#9aa4c0' : '#2a4aa8', robot ? null : null)
    if (robot) {
      rr(g, x - 20, y - 98 - adem, 40, 36, 8); g.fillStyle = '#b8c2dc'; g.fill()
      g.save(); g.shadowColor = '#ff4f6a'; g.shadowBlur = 12; rr(g, x - 15, y - 88 - adem, 30, 10, 5); g.fillStyle = '#ff4f6a'; g.fill(); g.restore()
      lijn(g, x, y - 98 - adem, x, y - 112 - adem, '#9aa4c0', 3); cirkel(g, x, y - 114 - adem, 4 + Math.sin(tijd * 6), '#ffc83d')
      g.fillStyle = '#5a6078'; for (var bo = 0; bo < 3; bo++) cirkel(g, x - 10 + bo * 10, y - 40, 3, '#3ef0ff')
    } else {
      cirkel(g, x, y - 76 - adem, 22, '#c98a5a')
      g.fillStyle = '#1e2850'; rr(g, x - 26, y - 102 - adem, 52, 14, 6); g.fill(); rr(g, x - 16, y - 116 - adem, 32, 18, 6); g.fill()
      oog(g, x + 7 * dir, y - 78 - adem, 5, dir); oog(g, x - 5 * dir, y - 78 - adem, 5, dir)
      g.fillStyle = '#3a2416'; g.beginPath(); g.ellipse(x, y - 64 - adem, 16, 8, 0, 0, Math.PI); g.fill()
    }
    kanonArm(g, x + 14 * dir, y - 40, hoek, dir, 46, robot ? '#5a6078' : '#1a1426')
  } else if (so === 'sneeuwman') {
    cirkel(g, x, y - 26, 28, '#f4f9ff'); cirkel(g, x, y - 70 - adem, 22, '#ffffff'); cirkel(g, x, y - 104 - adem, 17, '#ffffff')
    g.fillStyle = 'rgba(150,190,230,.35)'; g.beginPath(); g.arc(x + 8, y - 22, 24, -0.6, 1.4); g.fill()
    for (var kn = 0; kn < 3; kn++) cirkel(g, x, y - 80 + kn * 12 - adem, 3, '#1a1426')
    oog(g, x + 6 * dir, y - 108 - adem, 4, dir); oog(g, x - 5 * dir, y - 108 - adem, 4, dir)
    g.fillStyle = '#ff8a3d'; g.beginPath(); g.moveTo(x, y - 102 - adem); g.lineTo(x + 18 * dir, y - 99 - adem); g.lineTo(x, y - 97 - adem); g.fill()
    g.fillStyle = '#1a1426'; g.fillRect(x - 15, y - 126 - adem, 30, 6); g.fillRect(x - 10, y - 148 - adem, 20, 24); g.fillStyle = '#e8434b'; g.fillRect(x - 10, y - 132 - adem, 20, 4)
    lijn(g, x - 20 * dir, y - 72, x - 40 * dir, y - 92, '#6a4426', 3)
    kanonArm(g, x + 18 * dir, y - 72, hoek, dir, 30, '#6a4426')
  } else if (so === 'lavakrab' || so === 'krabkoning') {
    var groot = so === 'krabkoning', sc = groot ? 2 : 1
    for (var p = 0; p < 3; p++) { lijn(g, x - 18 * sc + p * 6, y - 14 * sc, x - 30 * sc - p * 4, y, '#a8281a', 4 * sc); lijn(g, x + 18 * sc - p * 6, y - 14 * sc, x + 30 * sc + p * 4, y, '#a8281a', 4 * sc) }
    var kgr = g.createRadialGradient(x - 8 * sc, y - 34 * sc, 4, x, y - 24 * sc, 34 * sc); kgr.addColorStop(0, '#ff7a4a'); kgr.addColorStop(1, '#8a1a10')
    g.fillStyle = kgr; g.beginPath(); g.ellipse(x, y - 24 * sc, 34 * sc, 22 * sc, 0, 0, TAU); g.fill()
    g.save(); g.shadowColor = '#ffc83d'; g.shadowBlur = 10; g.strokeStyle = '#ffc83d'; g.lineWidth = 2 * sc
    g.beginPath(); g.moveTo(x - 18 * sc, y - 30 * sc); g.lineTo(x - 4 * sc, y - 20 * sc); g.lineTo(x + 10 * sc, y - 32 * sc); g.stroke(); g.restore()
    lijn(g, x - 10 * sc, y - 42 * sc, x - 12 * sc, y - 56 * sc, '#c0381a', 3 * sc); lijn(g, x + 10 * sc, y - 42 * sc, x + 12 * sc, y - 56 * sc, '#c0381a', 3 * sc)
    oog(g, x - 12 * sc, y - 58 * sc, 6 * sc, dir); oog(g, x + 12 * sc, y - 58 * sc, 6 * sc, dir)
    var kn2 = Math.sin(tijd * 5) * 0.25
    ;[1, -1].forEach(function (z) {
      g.save(); g.translate(x + z * 36 * sc, y - 32 * sc); g.rotate(z * (-0.5 + kn2))
      g.fillStyle = '#c0301a'; g.beginPath(); g.ellipse(0, -10 * sc, 13 * sc, 17 * sc, 0, 0, TAU); g.fill()
      g.fillStyle = '#5a0c08'; g.beginPath(); g.moveTo(0, -24 * sc); g.lineTo(z * 4 * sc, -8 * sc); g.lineTo(-z * 3 * sc, -10 * sc); g.fill()
      g.restore()
    })
    if (groot) {
      g.save(); g.shadowColor = '#ffc83d'; g.shadowBlur = 16; g.fillStyle = '#ffc83d'
      g.beginPath(); g.moveTo(x - 26, y - 92); g.lineTo(x - 26, y - 116); g.lineTo(x - 13, y - 102); g.lineTo(x, y - 122); g.lineTo(x + 13, y - 102); g.lineTo(x + 26, y - 116); g.lineTo(x + 26, y - 92); g.fill()
      cirkel(g, x, y - 104, 4, '#ff4fd8'); g.restore()
    }
  } else if (so === 'spookpiraat') {
    var sg = g.createLinearGradient(0, y - 90, 0, y); sg.addColorStop(0, 'rgba(160,255,250,.85)'); sg.addColorStop(1, 'rgba(125,180,255,.05)')
    g.save(); g.shadowColor = '#7df9ff'; g.shadowBlur = 20; g.fillStyle = sg
    g.beginPath(); g.moveTo(x - 24, y - 60); g.arc(x, y - 60, 24, Math.PI, 0)
    for (var gz = 0; gz <= 6; gz++) g.lineTo(x + 24 - gz * 8, y - 8 + Math.sin(tijd * 6 + gz) * 5 * (gz % 2 ? 1 : -1))
    g.closePath(); g.fill(); g.restore()
    cirkel(g, x - 8, y - 64, 6, '#141026'); cirkel(g, x + 8, y - 64, 6, '#141026'); cirkel(g, x - 8 + dir * 2, y - 65, 2, '#7df9ff'); cirkel(g, x + 8 + dir * 2, y - 65, 2, '#7df9ff')
    ellips(g, x, y - 48, 6, 8, '#141026')
    g.fillStyle = '#1a1426'; g.beginPath(); g.moveTo(x - 30, y - 80); g.quadraticCurveTo(x, y - 110, x + 30, y - 80); g.lineTo(x + 20, y - 86); g.lineTo(x - 20, y - 86); g.fill()
    cirkel(g, x, y - 92, 4, '#fff')
    kanonArm(g, x + 16 * dir, y - 44, hoek, dir, 28, 'rgba(40,60,90,.9)')
  } else if (so === 'kraak') {
    benen(g, x, y, '#1a1426', tijd * 2)
    lijf(g, x, y - 18, 78, 72 + adem, '#a8202a')
    g.fillStyle = '#ffc83d'; for (var kb = 0; kb < 4; kb++) cirkel(g, x - 8 * dir, y - 30 - kb * 14, 4, '#ffc83d')
    cirkel(g, x, y - 116 - adem, 36, '#d6a07a')
    g.fillStyle = '#1a1426'; g.beginPath(); g.moveTo(x - 34, y - 108 - adem); g.quadraticCurveTo(x, y - 40 - adem, x + 34, y - 108 - adem); g.quadraticCurveTo(x, y - 90 - adem, x - 34, y - 108 - adem); g.fill()
    oog(g, x + 12 * dir, y - 124 - adem, 8, dir)
    g.fillStyle = '#141026'; rr(g, x - 20 * dir - 9, y - 131 - adem, 18, 14, 4); g.fill(); lijn(g, x - 36, y - 136 - adem, x + 36, y - 120 - adem, '#141026', 3)
    g.fillStyle = '#141026'; g.beginPath(); g.moveTo(x - 62, y - 140 - adem); g.quadraticCurveTo(x, y - 210 - adem, x + 62, y - 140 - adem); g.quadraticCurveTo(x, y - 160 - adem, x - 62, y - 140 - adem); g.fill()
    g.fillStyle = '#ffc83d'; g.fillRect(x - 54, y - 148 - adem, 108, 6)
    cirkel(g, x, y - 170 - adem, 9, '#fff'); lijn(g, x - 8, y - 158 - adem, x + 8, y - 150 - adem, '#fff', 3); lijn(g, x + 8, y - 158 - adem, x - 8, y - 150 - adem, '#fff', 3)
    kanonArm(g, x + 30 * dir, y - 60, hoek, dir, 70, '#1a1426')
  } else if (so === 'ijsreus') {
    var yg = g.createRadialGradient(x - 10, y - 90, 10, x, y - 70, 80); yg.addColorStop(0, '#ffffff'); yg.addColorStop(1, '#b8d8f0')
    g.fillStyle = yg; g.beginPath(); g.ellipse(x, y - 64, 54, 66, 0, 0, TAU); g.fill()
    for (var fz = 0; fz < 10; fz++) { var fa = fz / 10 * TAU; cirkel(g, x + Math.cos(fa) * 50, y - 64 + Math.sin(fa) * 60, 12, '#f4fbff') }
    g.fillStyle = '#5a9cc8'; g.beginPath(); g.ellipse(x + 6 * dir, y - 112 - adem, 30, 24, 0, 0, TAU); g.fill()
    oog(g, x + 16 * dir, y - 118 - adem, 7, dir); oog(g, x - 2 * dir, y - 118 - adem, 7, dir)
    g.fillStyle = '#1a2a4a'; g.beginPath(); g.ellipse(x + 8 * dir, y - 100 - adem, 14, 6, 0, 0, Math.PI); g.fill()
    g.fillStyle = '#fff'; g.fillRect(x + 2 * dir - 5, y - 100 - adem, 4, 6); g.fillRect(x + 12 * dir - 2, y - 100 - adem, 4, 6)
    g.fillStyle = '#e8f6ff'; g.beginPath(); g.moveTo(x - 24, y - 130); g.lineTo(x - 34, y - 160); g.lineTo(x - 12, y - 136); g.fill(); g.beginPath(); g.moveTo(x + 24, y - 130); g.lineTo(x + 34, y - 160); g.lineTo(x + 12, y - 136); g.fill()
    kanonArm(g, x + 40 * dir, y - 70, hoek, dir, 50, '#8ab8e0')
  } else if (so === 'kraken') {
    // tentakels die uit zee omhoog komen
    for (var tk = 0; tk < 4; tk++) {
      var tx = x - 70 + tk * 46, golfje = Math.sin(tijd * 2 + tk) * 18
      g.strokeStyle = '#7a3aa8'; g.lineWidth = 18 - tk % 2 * 4; g.lineCap = 'round'
      g.beginPath(); g.moveTo(tx, VS.ZEE + 20); g.quadraticCurveTo(tx + golfje, y - 60, tx - golfje * 0.6, y - 110 - tk % 2 * 20); g.stroke()
      g.fillStyle = '#ffb3f0'; for (var zu = 0; zu < 4; zu++) cirkel(g, tx + golfje * (zu / 4) * 0.5, y - 10 - zu * 24, 3, '#e8a0f0')
    }
    var kr = g.createRadialGradient(x - 14, y - 110, 10, x, y - 80, 90); kr.addColorStop(0, '#c07ae8'); kr.addColorStop(1, '#4a1a78')
    g.fillStyle = kr; g.beginPath(); g.ellipse(x, y - 92, 64, 76, 0, 0, TAU); g.fill()
    g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(x - 20, y - 130, 18, 26, -0.4, 0, TAU); g.fill()
    oog(g, x + 18 * dir, y - 92, 14, dir); oog(g, x - 16 * dir, y - 92, 14, dir)
    lijn(g, x - 30, y - 110, x - 6, y - 104, '#2a0a48', 4); lijn(g, x + 30, y - 110, x + 6, y - 104, '#2a0a48', 4)
    g.fillStyle = '#2a0a48'; g.beginPath(); g.ellipse(x, y - 60, 22, 10, 0, 0, Math.PI); g.fill()
  }
  g.restore()
  // levensbalk
  if (c.hp > 0 && !dood) {
    var bw = c.baas ? 110 : 56, bx = x - bw / 2, by = m.y + b - c.r - (c.baas ? 120 : 64)
    if (c.soort === 'sneeuwman') by -= 26
    rr(g, bx - 2, by - 2, bw + 4, 10, 5); g.fillStyle = 'rgba(8,10,30,.75)'; g.fill()
    var f = c.hp / c.max, kl2 = c.kant === 'speler' ? (f > 0.5 ? '#5bffa0' : f > 0.25 ? '#ffc83d' : '#ff4f6a') : '#ff4fd8'
    g.save(); g.shadowColor = kl2; g.shadowBlur = 8; rr(g, bx, by, Math.max(4, bw * f), 6, 3); g.fillStyle = kl2; g.fill(); g.restore()
  }
}

// ── kogels ──
function tekenKogel(g, k, x, y, r) {
  var so = k.soort
  g.save()
  if (so === 'bal' || so === 'drie') {
    g.shadowColor = '#ffc83d'; g.shadowBlur = 12
    var bg = g.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r); bg.addColorStop(0, '#8a90b8'); bg.addColorStop(1, '#141626')
    g.fillStyle = bg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill()
  } else if (so === 'water') {
    var wob = Math.sin(tijd * 20) * 0.12
    g.shadowColor = '#3ef0ff'; g.shadowBlur = 14; g.fillStyle = 'rgba(80,190,255,.92)'
    g.beginPath(); g.ellipse(x, y, r * (1 + wob), r * (1 - wob), 0, 0, TAU); g.fill(); cirkel(g, x - r * 0.35, y - r * 0.35, r * 0.25, 'rgba(255,255,255,.8)')
  } else if (so === 'stuiter') {
    g.shadowColor = '#5bffa0'; g.shadowBlur = 14; cirkel(g, x, y, r, '#3aff8a'); g.strokeStyle = '#0a5a2a'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, r * 0.7, tijd * 8, tijd * 8 + 2.4); g.stroke()
  } else if (so === 'bom') {
    cirkel(g, x, y, r, '#141020'); cirkel(g, x - r * 0.35, y - r * 0.35, r * 0.3, 'rgba(255,255,255,.35)')
    g.strokeStyle = 'rgba(255,138,61,.75)'; g.lineWidth = Math.max(1.5, r * 0.12); g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke()
    lijn(g, x + r * 0.5, y - r * 0.8, x + r, y - r * 1.4, '#c8a060', 2.5)
    g.shadowColor = '#ffc83d'; g.shadowBlur = 16; cirkel(g, x + r, y - r * 1.45, 3 + Math.random() * 2, Math.random() < 0.5 ? '#fff3b0' : '#ff8a3d')
  } else if (so === 'raket') {
    var a = Math.atan2(k.vy, k.vx)
    g.translate(x, y); g.rotate(a)
    g.shadowColor = '#ff6a1a'; g.shadowBlur = 18; g.fillStyle = Math.random() < 0.5 ? '#ffc83d' : '#ff6a1a'
    g.beginPath(); g.moveTo(-r * 1.2, -r * 0.5); g.lineTo(-r * 2.6 - Math.random() * r, 0); g.lineTo(-r * 1.2, r * 0.5); g.fill()
    g.shadowBlur = 0; rr(g, -r * 1.3, -r * 0.6, r * 2.6, r * 1.2, r * 0.5); g.fillStyle = '#e8ecff'; g.fill()
    g.fillStyle = '#ff4f6a'; g.beginPath(); g.moveTo(r * 1.3, -r * 0.6); g.lineTo(r * 2.1, 0); g.lineTo(r * 1.3, r * 0.6); g.fill()
  } else if (so === 'sneeuw') {
    g.shadowColor = '#fff'; g.shadowBlur = 10; cirkel(g, x, y, r + 1, '#ffffff'); cirkel(g, x + r * 0.3, y + r * 0.3, r * 0.5, 'rgba(160,200,240,.6)')
  } else if (so === 'vuur') {
    g.shadowColor = '#ff6a1a'; g.shadowBlur = 22; cirkel(g, x, y, r + 2, '#ff6a1a'); cirkel(g, x, y, r * 0.6, '#ffe08a')
  } else if (so === 'spook') {
    g.shadowColor = '#7df9ff'; g.shadowBlur = 22; cirkel(g, x, y, r + 1, 'rgba(125,249,255,.8)'); cirkel(g, x, y, r * 0.5, '#fff')
  }
  g.restore()
}
var SPOOR = { bal: '#ffc83d', drie: '#ffc83d', water: '#3ef0ff', stuiter: '#5bffa0', bom: '#ff8a3d', raket: '#ff6a1a', sneeuw: '#ffffff', vuur: '#ff6a1a', spook: '#7df9ff' }
function kogels() {
  s.kogels.forEach(function (k) {
    var sp = k.spoor, kl = SPOOR[k.soort] || '#fff'
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (var i = 2; i < sp.length; i += 2) { ctx.globalAlpha = i / sp.length * 0.7; lijn(ctx, sp[i - 2], sp[i - 1], sp[i], sp[i + 1], kl, Math.max(1, k.r * 1.6 * i / sp.length)) }
    var hl = ctx.createRadialGradient(k.x, k.y, 0, k.x, k.y, k.r * 4); hl.addColorStop(0, rgba(kl, 0.5)); hl.addColorStop(1, rgba(kl, 0))
    ctx.globalAlpha = 1; ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(k.x, k.y, k.r * 4, 0, TAU); ctx.fill()
    ctx.restore()
    tekenKogel(ctx, k, k.x, k.y, k.r * 1.3)
  })
}

// ── effecten ──
function deeltje(x, y, vx, vy, kleur, r, leef, zwaar) { deeltjes.push({ x: x, y: y, vx: vx, vy: vy, kleur: kleur, r: r, t: 0, leef: leef, zwaar: zwaar == null ? 1 : zwaar }) }
function plons(x, groot) {
  var T = thema()
  for (var i = 0; i < (groot ? 34 : 20); i++) deeltje(x + (Math.random() - 0.5) * 20, VS.ZEE, (Math.random() - 0.5) * 260, -150 - Math.random() * 380, i % 3 ? rgba(T.golf, 0.85) : '#ffffff', 2 + Math.random() * 4, 0.9 + Math.random() * 0.5)
  ringen.push({ x: x, y: VS.ZEE, t: 0, max: groot ? 90 : 55, kleur: T.golf })
}
function boem(x, y, r) {
  for (var i = 0; i < 40; i++) { var a = Math.random() * TAU, v = 80 + Math.random() * 380; deeltje(x, y, Math.cos(a) * v, Math.sin(a) * v - 80, ['#ffc83d', '#ff6a1a', '#fff3b0', '#ff4f6a'][i % 4], 2 + Math.random() * 5, 0.5 + Math.random() * 0.5) }
  for (var j = 0; j < 10; j++) deeltje(x + (Math.random() - 0.5) * r, y + (Math.random() - 0.5) * r, (Math.random() - 0.5) * 60, -40 - Math.random() * 60, 'rgba(70,60,80,.6)', 14 + Math.random() * 14, 1.2, -0.05)
  ringen.push({ x: x, y: y, t: 0, max: r * 1.2, kleur: '#ffc83d' })
  schud = Math.max(schud, 14); flits = 0.5
}
function splinters(x, y, soort, veel) {
  var kl = soort === 'ijs' ? ['#ffffff', '#9be8ff'] : soort === 'rots' ? ['#6a5656', '#ff7a2a'] : soort === 'ton' ? ['#c0482a', '#ffc83d'] : ['#d79a5a', '#8a5a2e']
  for (var i = 0; i < (veel ? 22 : 8); i++) deeltje(x, y, (Math.random() - 0.5) * 300, -80 - Math.random() * 260, kl[i % 2], 3 + Math.random() * 4, 0.8)
}
function zweefTekst(x, y, tekst, kleur, groot) { teksten.push({ x: x, y: y, s: tekst, t: 0, kleur: kleur, groot: !!groot }) }
function effecten(dt) {
  for (var i = deeltjes.length - 1; i >= 0; i--) {
    var d = deeltjes[i]; d.t += dt
    if (d.t > d.leef) { deeltjes.splice(i, 1); continue }
    d.vy += 900 * d.zwaar * dt; d.x += d.vx * dt; d.y += d.vy * dt
    if (d.zwaar > 0 && d.y > VS.ZEE + 6 && d.vy > 0) { deeltjes.splice(i, 1); continue }
    ctx.globalAlpha = Math.min(1, (1 - d.t / d.leef) * 1.4); cirkel(ctx, d.x, d.y, d.r * (d.zwaar < 0 ? 1 + d.t : 1), d.kleur)
  }
  ctx.globalAlpha = 1
  for (var j = ringen.length - 1; j >= 0; j--) {
    var r = ringen[j]; r.t += dt
    if (r.t > 0.6) { ringen.splice(j, 1); continue }
    var f = r.t / 0.6
    ctx.strokeStyle = rgba(r.kleur, 1 - f); ctx.lineWidth = 4 * (1 - f) + 1
    ctx.beginPath(); if (r.y === VS.ZEE) ctx.ellipse(r.x, r.y, r.max * f, r.max * f * 0.25, 0, 0, TAU); else ctx.arc(r.x, r.y, r.max * f, 0, TAU); ctx.stroke()
  }
  for (var k = teksten.length - 1; k >= 0; k--) {
    var t = teksten[k]; t.t += dt
    if (t.t > 1.1) { teksten.splice(k, 1); continue }
    ctx.globalAlpha = Math.min(1, (1.1 - t.t) * 2.5)
    ctx.font = (t.groot ? 40 : 28) + 'px "Russo One", system-ui, sans-serif'; ctx.textAlign = 'center'
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(8,10,30,.8)'; ctx.strokeText(t.s, t.x, t.y - t.t * 60)
    ctx.save(); ctx.shadowColor = t.kleur; ctx.shadowBlur = 14; ctx.fillStyle = t.kleur; ctx.fillText(t.s, t.x, t.y - t.t * 60); ctx.restore()
  }
  ctx.globalAlpha = 1
}
function verwerk(ev) {
  ev.forEach(function (e) {
    if (e.type === 'raak') {
      flitsFig[e.id] = tijd
      zweefTekst(e.x, e.y - 10, '-' + e.schade, e.kant === 'speler' ? '#ff4f6a' : '#ffc83d', e.schade >= 40)
      for (var i = 0; i < 10; i++) deeltje(e.x, e.y + 20, (Math.random() - 0.5) * 240, -100 - Math.random() * 200, e.kant === 'speler' ? '#ff4f6a' : '#ffc83d', 2 + Math.random() * 3, 0.5)
      schud = Math.max(schud, 6)
      if (e.kant === 'speler') Geluid.au(); else Geluid.raak()
    } else if (e.type === 'dood') { vallen[e.id] = tijd; setTimeout(function () { plons(e.x, true); Geluid.plons() }, 700) }
    else if (e.type === 'plons') { plons(e.x, e.groot); Geluid.plons() }
    else if (e.type === 'stuit') { plons(e.x, false); Geluid.stuit() }
    else if (e.type === 'boem') { boem(e.x, e.y, e.r); Geluid.boem() }
    else if (e.type === 'blok') { splinters(e.x, e.y, e.soort, e.kapot); Geluid.blok() }
  })
  werkBaasBij()
}

// ── mikken ──
function veldVan(px, py) { return { x: (px - OX) / S, y: (py - OY) / S } }
function mikWaarden(m) {
  var dx = m.sx - m.x, dy = m.sy - m.y, len = Math.hypot(dx, dy), vol = Math.min(W, H) * 0.32
  // naar linksonder trekken = naar rechtsboven schieten (schermcoördinaten: y omlaag)
  var hoek = Math.atan2(-dy, dx)
  hoek = Math.max(-0.35, Math.min(1.5, hoek))
  return { hoek: hoek, kracht: Math.min(1, len / vol), len: len }
}
cv.addEventListener('pointerdown', function (e) {
  audio()
  if (!s || s.fase !== 'speler' || gepauzeerd || !actief) return
  mik = { sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, id: e.pointerId }
  try { cv.setPointerCapture(e.pointerId) } catch (er) {}
  verbergHint()
})
cv.addEventListener('pointermove', function (e) { if (mik && e.pointerId === mik.id) { mik.x = e.clientX; mik.y = e.clientY } })
function laatLos(e) {
  if (!mik || e.pointerId !== mik.id) return
  var m = mikWaarden(mik); mik = null
  if (m.kracht < 0.08 || !s || s.fase !== 'speler') return
  if (VS.schiet(s, m.hoek, m.kracht, gekozen)) {
    Geluid.schot(); schud = Math.max(schud, 4)
    var h = VS.hand(s, s.helden[s.held]); for (var i = 0; i < 8; i++) deeltje(h.x + 30, h.y, 100 + Math.random() * 200, (Math.random() - 0.6) * 160, 'rgba(220,220,240,.7)', 5 + Math.random() * 6, 0.5, -0.1)
    laatsteHoek[s.helden[s.held].id] = m.hoek
    werkWapensBij()
    if (gekozen !== 'bal' && s.gebruik[gekozen] <= 0) kiesWapen('bal')
  }
}
cv.addEventListener('pointerup', laatLos)
cv.addEventListener('pointercancel', function () { mik = null })
var laatsteHoek = {}
function tekenMik() {
  if (!mik || !s || s.fase !== 'speler') return
  var m = mikWaarden(mik), held = s.helden[s.held], h = VS.hand(s, held)
  laatsteHoek[held.id] = m.hoek
  var pts = VS.voorspel(s, m.hoek, m.kracht, gekozen, VS.MIK_TIJD[Math.min(3, D.upgrades.mik || 0)])
  ctx.save(); ctx.lineCap = 'round'; ctx.setLineDash([2, 16]); ctx.lineDashOffset = -tijd * 60
  for (var i = 2; i < pts.length; i += 2) {
    var f = 1 - i / pts.length
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.15 + f * 0.85) + ')'; ctx.lineWidth = 5 + f * 5
    ctx.beginPath(); ctx.moveTo(pts[i - 2], pts[i - 1]); ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke()
  }
  ctx.restore()
  var lx = pts[pts.length - 2], ly = pts[pts.length - 1]
  if (lx != null) { ctx.save(); ctx.globalAlpha = 0.35 + 0.25 * Math.sin(tijd * 6); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(lx, ly, 10, 0, TAU); ctx.stroke(); ctx.restore() }
  // krachtmeter bij de held
  var kl = m.kracht < 0.5 ? '#5bffa0' : m.kracht < 0.8 ? '#ffc83d' : '#ff4f6a'
  ctx.save(); ctx.shadowColor = kl; ctx.shadowBlur = 12
  ctx.strokeStyle = kl; ctx.lineWidth = 6; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(h.x + Math.cos(m.hoek) * (30 + 90 * m.kracht), h.y - Math.sin(m.hoek) * (30 + 90 * m.kracht)); ctx.stroke()
  ctx.restore()
  ctx.font = '22px "Russo One"'; ctx.textAlign = 'center'; ctx.fillStyle = kl
  ctx.fillText(Math.round(m.kracht * 100) + '%', held.x, held.voetY - 150)
}

// ── hud ──
function windTekst() {
  if (!s.wind) { $('wind').style.display = 'none'; return }
  $('wind').style.display = ''
  var st = Math.round(Math.abs(s.wind) / 28), links = s.wind < 0
  $('wind').innerHTML = 'Wind <svg viewBox="0 0 42 14"><path d="M' + (links ? '40 7H6' : '2 7H36') + '" stroke="#3ef0ff" stroke-width="3" stroke-linecap="round"/><path d="' + (links ? 'M10 2L4 7l6 5' : 'M32 2l6 5-6 5') + '" fill="none" stroke="#3ef0ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg> ' + st
}
function werkBaasBij() {
  if (!s) return
  var b = s.vijanden.filter(function (v) { return v.baas })[0]
  $('baasbalk').classList.toggle('aan', !!b && actief)
  if (!b) return
  $('baasnaam').textContent = VS.SOORTEN[b.soort].naam
  $('baashp').firstChild.style.width = (b.hp / b.max * 100) + '%'
}
function banner(html, duur) {
  var el = $('banner'); el.innerHTML = html; el.classList.add('aan')
  clearTimeout(bannerTimer); bannerTimer = setTimeout(function () { el.classList.remove('aan') }, duur || 1300)
}
var hintAan = false
function toonHint() { if ((D.open === 0 && s.L === 0) && s.schoten === 0) { hintAan = true; banner('Sleep naar achteren<small>en laat los om te schieten</small>', 4000) } }
function verbergHint() { if (hintAan) { hintAan = false; $('banner').classList.remove('aan') } }

// wapenbalk
function wapenIcoon(c, id) {
  var g = c.getContext('2d'); c.width = 80; c.height = 80; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 80, 80)
  var k = { soort: id, vx: 1, vy: -0.2 }
  if (id === 'drie') { tekenKogel(g, k, 26, 46, 9); tekenKogel(g, k, 42, 32, 9); tekenKogel(g, k, 56, 50, 9) }
  else tekenKogel(g, k, 40, 42, id === 'raket' ? 12 : 17)
}
function bouwWapens() {
  var box = $('wapens'); box.innerHTML = ''
  VS.WAPEN_VOLGORDE.forEach(function (id) {
    if (D.wapens.indexOf(id) < 0) return
    var b = document.createElement('button'); b.className = 'wp'; b.dataset.id = id; b.title = VS.WAPENS[id].naam
    var c = document.createElement('canvas'); wapenIcoon(c, id); b.appendChild(c)
    b.appendChild(document.createElement('b'))
    b.onclick = function (e) { e.stopPropagation(); audio(); kiesWapen(id); Geluid.klik() }
    box.appendChild(b)
  })
  werkWapensBij()
}
function kiesWapen(id) { gekozen = id; D.wapen = id; bewaar(); werkWapensBij() }
function werkWapensBij() {
  Array.prototype.forEach.call($('wapens').children, function (b) {
    var id = b.dataset.id, n = s && s.gebruik[id]
    b.classList.toggle('aan', id === gekozen)
    b.disabled = n != null && n <= 0
    b.querySelector('b').textContent = n != null ? '×' + n : ''
  })
  $('wapens').classList.toggle('aan', !!(s && actief && s.fase === 'speler' && D.wapens.length > 1))
}

// ── spelverloop ──
var actief = false
function startLevel(L) {
  audio()
  s = VS.nieuw(L, { upgrades: D.upgrades, wapens: D.wapens })
  wereld = s.def.w; actief = true; gepauzeerd = false; mik = null
  deeltjes = []; teksten = []; ringen = []; vallen = {}; flitsFig = {}; laatsteHoek = {}; weer = []
  gekozen = D.wapens.indexOf(D.wapen) >= 0 ? D.wapen : 'bal'
  if (s.gebruik[gekozen] != null && s.gebruik[gekozen] <= 0) gekozen = 'bal'
  $('lvl').textContent = s.wereld.naam + ' · ' + (s.def.k + 1)
  windTekst(); bouwWapens(); toonScherm(null); werkBaasBij()
  if (s.def.baas) { banner('Eindbaas!<small>' + VS.SOORTEN[s.vijanden[0].soort].naam + '</small>', 2200); Geluid.boem() }
  else banner('Level ' + (L + 1) + '<small>' + s.wereld.zin + '</small>', 1800)
  setTimeout(function () { if (s && s.L === L) toonHint() }, 1900)
}
function speelFase(dt) {
  if (s.fase === 'vlucht') { if (!s.kogels.length) { vijandWacht = 0.55; VS.naVlucht(s); naFase() } }
  else if (s.fase === 'vijand') {
    vijandWacht -= dt
    if (vijandWacht <= 0) { var r = VS.vijandSchiet(s); if (r) { Geluid.vijand(); laatsteHoek[r.id] = 0.7 } naFase() }
  }
}
var vorigeFase = null
function naFase() {
  if (s.fase === vorigeFase) return
  vorigeFase = s.fase
  if (s.fase === 'speler') { banner(s.helden[s.held].soort === 'mo' ? 'Mo is aan de beurt' : 'Pip is aan de beurt', 1000) }
  else if (s.fase === 'vijand') banner('De vijand mikt…', 900)
  else if (s.fase === 'klaar') setTimeout(einde, 1500)
  werkWapensBij()
}
function einde() {
  if (!s || !actief) return
  actief = false
  var gewonnen = s.uitslag === 'gewonnen', st = VS.sterren(s), verdiend = VS.beloning(s)
  D.munten += verdiend
  if (gewonnen) { D.sterren[s.L] = Math.max(D.sterren[s.L] || 0, st); if (s.L === D.open && D.open < VS.LEVELS - 1) D.open++; Geluid.win() }
  else Geluid.verlies()
  bewaar()
  $('eindtitel').textContent = gewonnen ? (s.L === VS.LEVELS - 1 ? 'Alles gewonnen!' : s.def.baas ? 'Eindbaas verslagen!' : 'Gewonnen!') : 'Je vlot is verloren'
  var es = $('eindsterren'); es.innerHTML = ''
  for (var i = 0; i < 3; i++) es.innerHTML += '<svg class="' + (i < st ? '' : 'leeg') + '"><use href="#ster"/></svg>'
  es.classList.toggle('verborgen', !gewonnen)
  $('st-schoten').textContent = s.schoten; $('st-raak').textContent = s.raak
  $('verdiend').textContent = verdiend
  $('volgende').classList.toggle('verborgen', BELONING || !gewonnen || s.L + 1 >= VS.LEVELS)
  $('opnieuw').className = BELONING ? 'verborgen' : gewonnen ? 'knop2' : 'knop'
  $('naarmenu').classList.toggle('verborgen', BELONING)
  $('eindwinkel').classList.toggle('verborgen', BELONING)
  $('klaar').classList.toggle('verborgen', !BELONING)
  toonScherm('einde')
}

// ── obstakels in zee (veld-coördinaten). De vorm volgt de raakvlakken in kern.js ──
var ZV = VS.ZEE + 34   // onderkant: verdwijnt achter de voorste golf
function lichtBundel(x, y, kleur) {
  // draaiende lichtbundel van de vuurtoren, achter alles in de lucht
  var a = Math.sin(tijd * 0.7) * 1.25 - Math.PI / 2, len = 900, br = 0.12
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  var g = ctx.createRadialGradient(x, y, 10, x, y, len)
  g.addColorStop(0, rgba(kleur, 0.38)); g.addColorStop(1, rgba(kleur, 0))
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y)
  ctx.lineTo(x + Math.cos(a - br) * len, y + Math.sin(a - br) * len); ctx.lineTo(x + Math.cos(a + br) * len, y + Math.sin(a + br) * len); ctx.fill()
  ctx.restore()
}
function steen(x, y, w, h, kleur, rand) {
  var g = ctx.createLinearGradient(x, 0, x + w, 0)
  g.addColorStop(0, tint(kleur, 0.18)); g.addColorStop(0.45, kleur); g.addColorStop(1, tint(kleur, -0.45))
  ctx.fillStyle = g; rr(ctx, x, y, w, h, 6); ctx.fill()
  if (rand) { ctx.save(); ctx.shadowColor = rand; ctx.shadowBlur = 10; ctx.strokeStyle = rgba(rand, 0.8); ctx.lineWidth = 2; rr(ctx, x, y, w, h, 6); ctx.stroke(); ctx.restore() }
}
function tekenStuk(st, achter) {
  var g = ctx, x = st.x, top = VS.ZEE - st.h, so = st.soort
  if (achter) { if (so === 'vuurtoren') lichtBundel(x, top + 18, '#fff3c0'); return }
  g.save()
  if (so === 'vuurtoren') {
    // rotsen aan de voet
    ;[[-46, 18, 30], [36, 22, 26], [-12, 26, 34]].forEach(function (r) { ellips(g, x + r[0], VS.ZEE + 4, r[2], r[1], '#2a2244'); ellips(g, x + r[0] - 6, VS.ZEE - 2, r[2] * 0.6, r[1] * 0.4, '#3a3260') })
    var bw = 76, tw = 48, lampY = top + 18
    var body = function () { g.beginPath(); g.moveTo(x - bw / 2, ZV); g.lineTo(x - tw / 2, top + 46); g.lineTo(x + tw / 2, top + 46); g.lineTo(x + bw / 2, ZV); g.closePath() }
    body(); var tg = g.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0); tg.addColorStop(0, '#e8e6ff'); tg.addColorStop(0.55, '#b8b4e0'); tg.addColorStop(1, '#5a5480'); g.fillStyle = tg; g.fill()
    g.save(); body(); g.clip()
    var n = 5, hh = (ZV - top - 46) / n
    for (var i = 0; i < n; i += 2) { var sy = top + 46 + i * hh; g.fillStyle = i % 4 ? '#3ef0ff' : '#ff4fd8'; g.globalAlpha = 0.85; g.fillRect(x - bw, sy, bw * 2, hh) }
    g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + 6, top, bw, ZV)
    g.restore()
    for (var wv = 0; wv < 3; wv++) { var wy = top + 80 + wv * (ZV - top - 120) / 3; g.save(); g.shadowColor = '#ffc83d'; g.shadowBlur = 8; rr(g, x - 6, wy, 12, 16, 6); g.fillStyle = '#ffe08a'; g.fill(); g.restore() }
    // omloop en lampenhuis
    g.fillStyle = '#2a2448'; g.fillRect(x - 36, top + 40, 72, 8)
    lijn(g, x - 34, top + 40, x - 34, top + 28, '#7a74a8', 2); lijn(g, x + 34, top + 40, x + 34, top + 28, '#7a74a8', 2); lijn(g, x - 34, top + 28, x + 34, top + 28, '#7a74a8', 2)
    var p = 0.75 + 0.25 * Math.sin(tijd * 4)
    var hal = g.createRadialGradient(x, lampY, 2, x, lampY, 70); hal.addColorStop(0, 'rgba(255,240,180,' + 0.75 * p + ')'); hal.addColorStop(1, 'rgba(255,240,180,0)')
    g.fillStyle = hal; g.beginPath(); g.arc(x, lampY, 70, 0, TAU); g.fill()
    rr(g, x - 18, top + 6, 36, 34, 6); g.fillStyle = 'rgba(255,246,200,.95)'; g.fill()
    g.strokeStyle = '#2a2448'; g.lineWidth = 2; lijn(g, x, top + 6, x, top + 40, '#2a2448', 2)
    g.fillStyle = '#2a2448'; g.beginPath(); g.moveTo(x - 24, top + 8); g.lineTo(x, top - 18); g.lineTo(x + 24, top + 8); g.fill()
    cirkel(g, x, top - 20, 4, '#ff4f6a')
  } else if (so === 'neonbrug' || so === 'ijsboog' || so === 'rotsboog' || so === 'scheepsboog') {
    var L = x - st.span / 2, R = x + st.span / 2 - st.pw, bt = top - st.dik
    // [pijler, balk]: allebei als #hex, want steen() rekent er tinten mee uit
    var stijl = { neonbrug: ['#3a2e6a', '#463a7a'], ijsboog: ['#9fd6f4', '#b6e2f8'], rotsboog: ['#3a2626', '#463030'], scheepsboog: ['#3a2e26', '#4a3a2e'] }[so]
    if (so === 'scheepsboog') {
      // spookschip: ribben als pijlers, de kiel als balk
      ;[L, R].forEach(function (px, i) {
        g.strokeStyle = '#4a3a2e'; g.lineWidth = st.pw - 10; g.lineCap = 'round'
        g.beginPath(); g.moveTo(px + st.pw / 2, ZV); g.quadraticCurveTo(px + st.pw / 2 + (i ? 14 : -14), (bt + ZV) / 2, px + st.pw / 2, bt + 10); g.stroke()
        g.strokeStyle = '#6a5440'; g.lineWidth = 4; g.stroke()
      })
      steen(L - 6, bt, st.span + 12, st.dik, '#4a3a2e')
      for (var bn = 0; bn < 6; bn++) cirkel(g, L + 20 + bn * (st.span - 30) / 5, bt + st.dik - 6, 4, '#8a8a7a')
      var sp = 0.6 + 0.4 * Math.sin(tijd * 3)
      g.save(); g.shadowColor = '#7df9ff'; g.shadowBlur = 18 * sp; lijn(g, x, bt + st.dik, x, bt + st.dik + 26, '#3a3044', 2); rr(g, x - 9, bt + st.dik + 24, 18, 22, 5); g.fillStyle = 'rgba(125,249,255,' + (0.5 + 0.4 * sp) + ')'; g.fill(); g.restore()
    } else {
      steen(L, top, st.pw, ZV - top, stijl[0], so === 'neonbrug' ? '#3ef0ff' : null)
      steen(R, top, st.pw, ZV - top, stijl[0], so === 'neonbrug' ? '#3ef0ff' : null)
      steen(L - 8, bt, st.span + 16, st.dik, stijl[1], so === 'neonbrug' ? '#ff4fd8' : null)
      if (so === 'neonbrug') {
        for (var lp = 0; lp < 7; lp++) { var lx = L + 4 + lp * (st.span - 8) / 6; lijn(g, lx, bt, lx, bt - 16, '#8a84c0', 2); g.save(); g.shadowColor = lp % 2 ? '#3ef0ff' : '#ff4fd8'; g.shadowBlur = 12; cirkel(g, lx, bt - 18, 3.5, lp % 2 ? '#3ef0ff' : '#ff4fd8'); g.restore() }
        lijn(g, L - 4, bt - 12, R + st.pw + 4, bt - 12, '#8a84c0', 2)
        g.save(); g.shadowColor = '#ffc83d'; g.shadowBlur = 14; g.fillStyle = '#ffc83d'; g.font = '900 20px "Russo One"'; g.textAlign = 'center'; g.fillText('HAVEN', x, bt + st.dik - 11); g.restore()
      } else if (so === 'ijsboog') {
        for (var ic = 0; ic < 9; ic++) { var ix = L + 10 + ic * (st.span - 20) / 8, il = 8 + (ic * 7 % 9); g.fillStyle = 'rgba(232,251,255,.9)'; g.beginPath(); g.moveTo(ix - 4, bt + st.dik); g.lineTo(ix, bt + st.dik + il); g.lineTo(ix + 4, bt + st.dik); g.fill() }
        g.fillStyle = '#ffffff'; rr(g, L - 10, bt - 8, st.span + 20, 12, 6); g.fill()
        g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(125,255,207,' + (0.15 + 0.1 * Math.sin(tijd * 2)) + ')'; g.fillRect(L, top, st.pw, ZV - top); g.fillRect(R, top, st.pw, ZV - top); g.restore()
      } else {
        var gl = 0.6 + 0.4 * Math.sin(tijd * 2.5)
        g.save(); g.shadowColor = '#ff6a1a'; g.shadowBlur = 16; g.strokeStyle = 'rgba(255,122,42,' + gl + ')'; g.lineWidth = 3
        ;[L + st.pw / 2, R + st.pw / 2].forEach(function (px) { g.beginPath(); g.moveTo(px - 8, top + 10); g.lineTo(px + 6, top + (ZV - top) * 0.35); g.lineTo(px - 6, top + (ZV - top) * 0.7); g.lineTo(px + 4, ZV); g.stroke() })
        g.beginPath(); g.moveTo(L, bt + st.dik / 2); g.lineTo(x - 20, bt + st.dik / 2 - 6); g.lineTo(x + 30, bt + st.dik / 2 + 4); g.lineTo(R + st.pw, bt + st.dik / 2); g.stroke(); g.restore()
      }
    }
  } else if (so === 'ijspiek') {
    var w2 = 96
    var vorm = function () { g.beginPath(); g.moveTo(x - w2 / 2 - 16, ZV); g.lineTo(x - w2 / 2 + 2, top + st.h * 0.45); g.lineTo(x - 14, top + 30); g.lineTo(x - 4, top); g.lineTo(x + 12, top + 44); g.lineTo(x + w2 / 2 - 4, top + st.h * 0.35); g.lineTo(x + w2 / 2 + 18, ZV); g.closePath() }
    vorm(); var ig = g.createLinearGradient(x - w2, top, x + w2, ZV); ig.addColorStop(0, '#ffffff'); ig.addColorStop(0.5, '#bfe8ff'); ig.addColorStop(1, '#4a8cbc'); g.fillStyle = ig; g.fill()
    g.save(); vorm(); g.clip()
    g.fillStyle = 'rgba(70,130,190,.45)'; g.beginPath(); g.moveTo(x - 4, top); g.lineTo(x + 12, top + 44); g.lineTo(x + w2 / 2 + 18, ZV); g.lineTo(x + 6, ZV); g.fill()
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 20, top + 60); g.lineTo(x - 8, top + 120); g.moveTo(x + 18, top + 140); g.lineTo(x + 8, top + 190); g.stroke()
    var sh = (tijd * 0.4) % 1
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(200,255,240,.25)'; g.fillRect(x - w2, top + sh * st.h, w2 * 2, 10)
    g.restore()
    g.save(); g.shadowColor = '#9be8ff'; g.shadowBlur = 16; g.strokeStyle = 'rgba(232,251,255,.8)'; g.lineWidth = 2; vorm(); g.stroke(); g.restore()
  } else if (so === 'lavapiek') {
    var w3 = 90
    var vorm2 = function () { g.beginPath(); g.moveTo(x - w3 / 2 - 14, ZV); g.lineTo(x - w3 / 2, top + st.h * 0.5); g.lineTo(x - 16, top + 22); g.lineTo(x + 2, top); g.lineTo(x + 20, top + 30); g.lineTo(x + w3 / 2 + 2, top + st.h * 0.55); g.lineTo(x + w3 / 2 + 16, ZV); g.closePath() }
    vorm2(); var lg = g.createLinearGradient(x - w3, 0, x + w3, 0); lg.addColorStop(0, '#4a3434'); lg.addColorStop(0.5, '#2a1a1a'); lg.addColorStop(1, '#140a0a'); g.fillStyle = lg; g.fill()
    var gl2 = 0.55 + 0.45 * Math.sin(tijd * 2.2)
    g.save(); vorm2(); g.clip(); g.shadowColor = '#ff6a1a'; g.shadowBlur = 18; g.strokeStyle = 'rgba(255,138,58,' + gl2 + ')'; g.lineWidth = 3.5
    g.beginPath(); g.moveTo(x + 2, top + 6); g.lineTo(x - 10, top + st.h * 0.3); g.lineTo(x + 14, top + st.h * 0.55); g.lineTo(x - 4, top + st.h * 0.85); g.lineTo(x + 6, ZV)
    g.moveTo(x - 10, top + st.h * 0.3); g.lineTo(x - 30, top + st.h * 0.45); g.moveTo(x + 14, top + st.h * 0.55); g.lineTo(x + 34, top + st.h * 0.7); g.stroke(); g.restore()
    var gloed2 = g.createRadialGradient(x + 2, top, 2, x + 2, top, 40); gloed2.addColorStop(0, 'rgba(255,170,80,' + 0.7 * gl2 + ')'); gloed2.addColorStop(1, 'rgba(255,90,30,0)')
    g.fillStyle = gloed2; g.beginPath(); g.arc(x + 2, top, 40, 0, TAU); g.fill()
    for (var rk = 0; rk < 4; rk++) { var f = (tijd * 0.25 + rk / 4) % 1; cirkel(g, x + 2 + Math.sin(f * 5 + rk) * 12 + f * 20, top - f * 120, 8 + f * 22, 'rgba(70,50,54,' + (0.5 * (1 - f)) + ')') }
  } else if (so === 'wrakmast') {
    g.fillStyle = '#2e2434'; g.beginPath(); g.moveTo(x - 70, ZV); g.lineTo(x - 54, VS.ZEE - 22); g.lineTo(x + 50, VS.ZEE - 34); g.lineTo(x + 76, ZV); g.fill()
    g.strokeStyle = '#4a3c50'; g.lineWidth = 3; for (var pl = 0; pl < 3; pl++) { g.beginPath(); g.moveTo(x - 60, VS.ZEE - 12 + pl * 10); g.lineTo(x + 62, VS.ZEE - 22 + pl * 10); g.stroke() }
    var mg = g.createLinearGradient(x - 9, 0, x + 9, 0); mg.addColorStop(0, '#6a5440'); mg.addColorStop(1, '#2e2418')
    g.fillStyle = mg; g.fillRect(x - 9, top, 18, ZV - top)
    // ra en zeil blijven binnen de breedte waar kogels tegenaan botsen
    lijn(g, x - 30, top + 60, x + 30, top + 60, '#4a3a2e', 8)
    var wap = Math.sin(tijd * 3) * 4
    g.fillStyle = 'rgba(192,139,255,.38)'; g.beginPath(); g.moveTo(x - 27, top + 64); g.quadraticCurveTo(x - 8 + wap, top + 110, x - 25, top + 160); g.lineTo(x - 10, top + 132); g.lineTo(x + 4, top + 168); g.quadraticCurveTo(x + 16 + wap, top + 110, x + 27, top + 64); g.fill()
    lijn(g, x, top, x - 64, VS.ZEE - 26, 'rgba(160,140,180,.5)', 1.5); lijn(g, x, top, x + 64, VS.ZEE - 34, 'rgba(160,140,180,.5)', 1.5)
    g.fillStyle = '#3a2e26'; rr(g, x - 20, top - 4, 40, 18, 4); g.fill()
    var lt = 0.6 + 0.4 * Math.sin(tijd * 5 + 1)
    g.save(); g.shadowColor = '#7df9ff'; g.shadowBlur = 20 * lt; cirkel(g, x + 14, top - 10, 6, 'rgba(125,249,255,' + (0.6 + 0.4 * lt) + ')'); g.restore()
  }
  g.restore()
}
// weerspiegeling van een obstakel in het water
function spiegel(x, breed, kleur) {
  for (var i = 0; i < 7; i++) {
    var y = VS.ZEE + 14 + i * 13, a = 0.22 * (1 - i / 7), off = Math.sin(tijd * 2 + i * 1.3) * 8
    ctx.fillStyle = rgba(kleur, a); ctx.fillRect(x - breed / 2 + off, y, breed * (1 - i * 0.06), 3.5)
  }
}
var SPIEGELKLEUR = { vuurtoren: '#ff4fd8', neonbrug: '#3ef0ff', ijspiek: '#e8fbff', ijsboog: '#bfe8ff', lavapiek: '#ff7a2a', rotsboog: '#ff7a2a', wrakmast: '#c08bff', scheepsboog: '#7df9ff' }

// ── leven in de lucht: wolken, vallende sterren, meeuwen ──
var wolken = null
function lucht(dt, w) {
  var zy = OY + VS.ZEE * S
  if (!wolken) { wolken = []; for (var i = 0; i < 7; i++) wolken.push({ x: Math.random(), y: 0.08 + Math.random() * 0.32, s: 0.6 + Math.random() * 0.8, v: 0.004 + Math.random() * 0.006 }) }
  if (w !== 1) {
    var kl = w === 0 ? '120,80,200' : w === 2 ? '70,40,40' : '50,44,80', al = w === 3 ? 0.55 : 0.28
    wolken.forEach(function (c) {
      c.x += c.v * dt * (1 + (s ? s.wind / 80 : 0)); if (c.x > 1.3) c.x = -0.3; if (c.x < -0.3) c.x = 1.3
      var cx = c.x * W, cy = c.y * zy, r = 110 * c.s * Math.max(0.6, S * 1.4)
      ;[[0, 0, 1], [0.6, 0.12, 0.7], [-0.55, 0.1, 0.65], [0.2, -0.15, 0.6]].forEach(function (p) { ellips(ctx, cx + p[0] * r, cy + p[1] * r, r * p[2], r * p[2] * 0.42, 'rgba(' + kl + ',' + al * 0.5 + ')') })
    })
  }
  if (w <= 1) {
    if (!lucht.ster || lucht.ster.t > 1.2) { if (Math.random() < dt * 0.25) lucht.ster = { x: Math.random() * W * 0.8, y: Math.random() * zy * 0.35, t: 0 } }
    var st = lucht.ster
    if (st && st.t <= 1.2) { st.t += dt; var f = st.t / 1.2, sx = st.x + f * 260 * S * 2, sy = st.y + f * 120 * S * 2; ctx.save(); ctx.globalAlpha = Math.sin(f * Math.PI); lijn(ctx, sx, sy, sx - 70 * S * 2, sy - 32 * S * 2, 'rgba(255,255,255,.8)', 2); cirkel(ctx, sx, sy, 2.5, '#fff'); ctx.restore() }
    if (!lucht.meeuwen) lucht.meeuwen = [0, 1, 2].map(function (i) { return { x: Math.random(), y: 0.2 + i * 0.07, v: 0.02 + i * 0.006, f: i } })
    lucht.meeuwen.forEach(function (m) {
      m.x += m.v * dt; if (m.x > 1.1) m.x = -0.1
      var mx = m.x * W, my = m.y * zy + Math.sin(tijd + m.f) * 6, vl = Math.sin(tijd * 8 + m.f) * 5 * S * 2, b = 10 * S * 2
      ctx.strokeStyle = w === 0 ? 'rgba(220,200,255,.7)' : 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.beginPath()
      ctx.moveTo(mx - b, my - vl); ctx.quadraticCurveTo(mx - b * 0.4, my - b * 0.5, mx, my); ctx.quadraticCurveTo(mx + b * 0.4, my - b * 0.5, mx + b, my - vl); ctx.stroke()
    })
  }
}

function kleinePlons(x) {
  for (var i = 0; i < 6; i++) deeltje(x + (Math.random() - 0.5) * 10, VS.ZEE, (Math.random() - 0.5) * 120, -80 - Math.random() * 120, 'rgba(255,255,255,.8)', 1.5 + Math.random() * 2, 0.6)
}
// ── vissen die uit het water springen (veld-coördinaten, achter de vlotten) ──
var vissen = []
function springVissen(dt, w) {
  if (Math.random() < dt * 0.35 && vissen.length < 2) vissen.push({ x: 520 + Math.random() * 560, t: 0, d: Math.random() < 0.5 ? 1 : -1 })
  var kl = ['#3ef0ff', '#bff6ff', '#ffc83d', '#c08bff'][w]
  for (var i = vissen.length - 1; i >= 0; i--) {
    var v = vissen[i]; v.t += dt
    if (v.t > 1.1) { vissen.splice(i, 1); continue }
    var f = v.t / 1.1, x = v.x + v.d * f * 120, y = VS.ZEE + 10 - Math.sin(f * Math.PI) * 110
    if (!v.uit) { v.uit = true; kleinePlons(x) }
    if (v.t > 1.0 && !v.in) { v.in = true; kleinePlons(x) }
    ctx.save(); ctx.translate(x, y); ctx.rotate(v.d * (f - 0.5) * 2.2); ctx.scale(v.d, 1)
    ctx.shadowColor = kl; ctx.shadowBlur = 12
    ellips(ctx, 0, 0, 16, 7, kl); ctx.fillStyle = kl; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-26, -8); ctx.lineTo(-26, 8); ctx.fill()
    cirkel(ctx, 8, -2, 2, '#141026')
    ctx.restore()
  }
}

// ── maan- of vulkaangloed die in het water schittert ──
function glimpad(w) {
  var zy = OY + VS.ZEE * S, x = w === 2 ? W * 0.78 : W * 0.8, kl = w === 0 ? '255,235,255' : w === 1 ? '125,255,207' : w === 2 ? '255,150,60' : '200,210,255'
  if (w === 3) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (var i = 0; i < 16; i++) {
    var y = zy + 10 + i * i * 2.4 * S * 2, br = (40 + i * 10) * S * 2 * (0.6 + 0.4 * Math.sin(tijd * 2.3 + i * 1.7))
    ctx.fillStyle = 'rgba(' + kl + ',' + (0.3 - i * 0.016) + ')'; ctx.fillRect(x - br / 2 + Math.sin(tijd * 1.5 + i) * 10, y, br, Math.max(1.5, 3 * S))
  }
  ctx.restore()
}

function vignet() {
  var g = ctx.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.78)
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,.5)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
}

// ── tekenen ──
var vorige = performance.now()
// Eén fout in een tekening mag het spel nooit stilzetten: het volgende beeld komt altijd.
function frame(nu) {
  requestAnimationFrame(frame)
  try { teken(nu) } catch (e) { if (!frame.gemeld) { frame.gemeld = true; console.error(e) } }
}
function teken(nu) {
  var dt = Math.min(0.05, (nu - vorige) / 1000); vorige = nu
  tijd += dt
  if (s && actief && !gepauzeerd) { verwerk(VS.stap(s, dt)); speelFase(dt) }
  var w = s ? s.def.w : wereld
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (!verAf || verWereld !== w) { verAf = bouwVerte(w); verWereld = w }
  ctx.drawImage(verAf, 0, 0, W, H)
  lucht(dt, w)
  if (w === 1) noorderlicht()
  if (w === 2) rookVulkaan()
  if (w === 3) { bliksem -= dt; if (bliksem < -4 - Math.random() * 6) { bliksem = 0.25; flits = Math.max(flits, 0.6); setTimeout(function () { ruis(1.2, 0.2, 60, 400) }, 200) } }
  ctx.save()
  if (schud > 0.3) { ctx.translate((Math.random() - 0.5) * schud * S, (Math.random() - 0.5) * schud * S); schud *= 0.88 } else schud = 0
  var stukken = s ? s.def.stukken : [{ soort: MENU_STUK[w], x: 800, h: 250, w: 76 }]
  ctx.save(); ctx.translate(OX, OY); ctx.scale(S, S); stukken.forEach(function (st) { tekenStuk(st, true) }); ctx.restore()
  zee(true); glimpad(w)
  ctx.translate(OX, OY); ctx.scale(S, S)
  stukken.forEach(function (st) { spiegel(st.x, st.span || 96, SPIEGELKLEUR[st.soort]) })
  spiegel(280, 360, '#3ef0ff'); if (s) spiegel((s.def.raft.x0 + s.def.raft.x1) / 2, s.def.raft.x1 - s.def.raft.x0 - 40, THEMA[w].glim[0])
  springVissen(dt, w)
  stukken.forEach(function (st) { tekenStuk(st) })
  if (s) {
    vlot(90, 470, 'speler', w); vlot(s.def.raft.x0, s.def.raft.x1, 'vijand', w)
    s.blokken.forEach(function (b) { if (b.kant !== 'zee') blok(b) })
    s.vijanden.concat(s.helden).forEach(function (c) {
      if (c.hp <= 0 && (!vallen[c.id] || tijd - vallen[c.id] > 1.6)) return
      var hoek = laatsteHoek[c.id]
      if (c.kant === 'speler' && s.helden[s.held] === c && mik) hoek = mikWaarden(mik).hoek
      tekenFiguur(c, hoek)
    })
    // pijltje boven de held die aan de beurt is
    if (actief && s.fase === 'speler') {
      var hd = s.helden[s.held], ay = hd.voetY - 130 + Math.sin(tijd * 5) * 6 + bob('speler')
      ctx.save(); ctx.shadowColor = '#3ef0ff'; ctx.shadowBlur = 14; ctx.fillStyle = '#3ef0ff'
      ctx.beginPath(); ctx.moveTo(hd.x - 12, ay - 14); ctx.lineTo(hd.x + 12, ay - 14); ctx.lineTo(hd.x, ay); ctx.fill(); ctx.restore()
    }
    kogels()
    tekenMik()
  } else {
    // menu: alleen de vlotten van de wereld als decor
    vlot(90, 470, 'speler', w); vlot(1100, 1520, 'vijand', w)
  }
  ctx.restore()
  ctx.save(); ctx.translate(OX, OY); ctx.scale(S, S)
  ctx.restore()
  zee(false)
  ctx.save(); ctx.translate(OX, OY); ctx.scale(S, S); effecten(dt); ctx.restore()
  weerDeeltjes(dt)
  vignet()
  if (flits > 0) { ctx.fillStyle = w === 3 ? 'rgba(210,220,255,' + flits * 0.45 + ')' : 'rgba(255,200,120,' + flits * 0.3 + ')'; ctx.fillRect(0, 0, W, H); flits = Math.max(0, flits - dt * 2.5) }
}

// ── schermen ──
function toonScherm(id) {
  ;['menu', 'einde', 'winkel', 'pauzescherm'].forEach(function (x) { $(x).classList.toggle('aan', x === id) })
  var inSpel = id === null
  $('pauze').style.display = inSpel ? '' : 'none'
  $('hud').style.display = inSpel || id === 'pauzescherm' ? '' : 'none'
  $('terug').classList.toggle('aan', !BELONING && !inSpel)
  if (!inSpel) $('baasbalk').classList.remove('aan'); else werkBaasBij()
  werkWapensBij()
}
var menuWereld = Math.floor(D.open / 10)
function wereldOpen(w) { return D.open >= w * 10 }
function wereldPlaatje(c, w) {
  c.width = 240; c.height = 124
  var g = c.getContext('2d'), T = THEMA[w]
  var l = g.createLinearGradient(0, 0, 0, 124); l.addColorStop(0, T.lucht[0]); l.addColorStop(0.6, T.lucht[2]); l.addColorStop(0.62, T.zee[0]); l.addColorStop(1, T.zee[2])
  g.fillStyle = l; g.fillRect(0, 0, 240, 124)
  if (w === 0) for (var i = 0; i < 12; i++) { g.fillStyle = '#130b38'; var h = 14 + (i * 37 % 30); g.fillRect(i * 20, 76 - h, 16, h); g.fillStyle = T.glim[i % 3]; g.fillRect(i * 20 + 5, 76 - h + 5, 3, 3) }
  if (w === 1) { g.fillStyle = '#e8f8ff'; g.beginPath(); g.moveTo(130, 77); g.lineTo(160, 34); g.lineTo(196, 77); g.fill(); g.strokeStyle = 'rgba(125,255,207,.5)'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, 24); g.quadraticCurveTo(120, 4, 240, 26); g.stroke() }
  if (w === 2) { g.fillStyle = '#1e0a0c'; g.beginPath(); g.moveTo(120, 77); g.lineTo(170, 20); g.lineTo(190, 20); g.lineTo(240, 77); g.fill(); g.fillStyle = '#ffb060'; g.fillRect(170, 18, 20, 4) }
  if (w === 3) { g.strokeStyle = '#e8eaff'; g.lineWidth = 3; g.beginPath(); g.moveTo(170, 0); g.lineTo(158, 30); g.lineTo(172, 34); g.lineTo(156, 70); g.stroke() }
  g.fillStyle = '#9a6436'; g.fillRect(20, 80, 70, 10); g.fillStyle = w === 2 ? '#2a1a1a' : w === 1 ? '#e8f8ff' : '#8a5a32'; g.fillRect(150, 80, 70, 10)
}
function toonMenu() {
  actief = false; s = null; mik = null
  wereld = menuWereld
  $('menumunten').textContent = D.munten
  $('speel').textContent = 'Speel level ' + (D.open + 1)
  var wb = $('werelden'); wb.innerHTML = ''
  VS.WERELDEN.forEach(function (W2, w) {
    var b = document.createElement('button'), tot = 0
    for (var L = w * 10; L < w * 10 + 10; L++) tot += D.sterren[L] || 0
    b.className = 'wtab' + (w === menuWereld ? ' aan' : ''); b.disabled = !wereldOpen(w)
    b.innerHTML = '<canvas></canvas><span>' + W2.naam + '</span><small>' + (wereldOpen(w) ? tot + '/30 ★' : 'Versla eerst de baas') + '</small>'
    wereldPlaatje(b.querySelector('canvas'), w)
    b.onclick = function () { menuWereld = w; Geluid.klik(); toonMenu() }
    wb.appendChild(b)
  })
  $('wzin').textContent = VS.WERELDEN[menuWereld].zin
  var lv = $('levels'); lv.innerHTML = ''
  for (var L2 = menuWereld * 10; L2 < menuWereld * 10 + 10; L2++) {
    (function (L) {
      var b = document.createElement('button'), st = D.sterren[L] || 0
      b.className = 'lv' + (L === D.open ? ' volgende' : '') + (L % 10 === 9 ? ' baas' : '')
      b.disabled = L > D.open
      var str = ''
      for (var i = 0; i < 3; i++) str += '<svg class="' + (i < st ? '' : 'leeg') + '" viewBox="0 0 24 24"><use href="#ster"/></svg>'
      b.innerHTML = (L % 10 + 1) + '<span class="st">' + str + '</span>'
      b.onclick = function () { startLevel(L) }
      lv.appendChild(b)
    })(L2)
  }
  toonScherm('menu')
}
$('speel').onclick = function () { startLevel(D.open) }
$('volgende').onclick = function () { startLevel(s.L + 1) }
$('opnieuw').onclick = function () { startLevel(s.L) }
$('naarmenu').onclick = function () { menuWereld = Math.floor((s ? s.L : D.open) / 10); toonMenu() }
$('klaar').onclick = function () { parent.postMessage({ type: 'vlotstrijd-gameover' }, '*') }
$('pauze').onclick = function (e) { e.stopPropagation(); if (!actief) return; gepauzeerd = true; toonScherm('pauzescherm') }
$('hervat').onclick = function () { gepauzeerd = false; vorige = performance.now(); toonScherm(null) }
$('stop').onclick = function () { gepauzeerd = false; if (BELONING) { s.uitslag = 'verloren'; einde() } else toonMenu() }
$('naarwinkel').onclick = function () { tekenWinkel(); toonScherm('winkel') }
$('eindwinkel').onclick = function () { tekenWinkel(); toonScherm('winkel') }
$('uitwinkel').onclick = toonMenu

// ── winkel ──
function upgradeIcoon(c, id) {
  c.width = 128; c.height = 128
  var g = c.getContext('2d'); g.scale(2, 2); g.lineCap = 'round'; g.lineJoin = 'round'
  g.save(); g.shadowColor = '#3ef0ff'; g.shadowBlur = 10; g.strokeStyle = '#3ef0ff'; g.fillStyle = '#3ef0ff'; g.lineWidth = 4
  if (id === 'kracht') { g.beginPath(); g.moveTo(36, 8); g.lineTo(20, 34); g.lineTo(32, 34); g.lineTo(26, 56); g.lineTo(46, 26); g.lineTo(34, 26); g.closePath(); g.fillStyle = '#ffc83d'; g.shadowColor = '#ffc83d'; g.fill() }
  else if (id === 'hp') { g.fillStyle = '#ff4f6a'; g.shadowColor = '#ff4f6a'; g.beginPath(); g.moveTo(32, 54); g.bezierCurveTo(4, 36, 10, 10, 32, 22); g.bezierCurveTo(54, 10, 60, 36, 32, 54); g.fill() }
  else if (id === 'schild') { g.shadowBlur = 0; g.fillStyle = '#c0884a'; rr(g, 12, 12, 40, 40, 5); g.fill(); g.strokeStyle = '#5a3416'; g.lineWidth = 4; g.beginPath(); g.moveTo(16, 16); g.lineTo(48, 48); g.moveTo(48, 16); g.lineTo(16, 48); g.stroke() }
  else if (id === 'mik') { for (var i = 0; i < 6; i++) { g.globalAlpha = 1 - i * 0.13; g.beginPath(); g.arc(12 + i * 8, 46 - i * 9 + i * i * 0.9, 3.5, 0, TAU); g.fill() } }
  else { g.fillStyle = '#5bffa0'; g.shadowColor = '#5bffa0'; g.font = '900 34px "Russo One"'; g.textAlign = 'center'; g.fillText('+1', 32, 44) }
  g.restore()
}
function tekenWinkel() {
  $('winkelmunten').textContent = D.munten
  var lw = $('lijstwapens'); lw.innerHTML = ''
  VS.WAPEN_VOLGORDE.forEach(function (id) {
    var w = VS.WAPENS[id], k = document.createElement('div'); k.className = 'kaart'
    var c = document.createElement('canvas'); wapenIcoon(c, id)
    k.appendChild(c)
    k.insertAdjacentHTML('beforeend', '<div class="naam">' + w.naam + '</div><div class="zin">' + w.zin + (w.gebruik ? ' · ' + w.gebruik + '× per level' : '') + '</div>')
    var b = document.createElement('button')
    if (D.wapens.indexOf(id) >= 0) { b.className = 'bezit'; b.textContent = 'In bezit' }
    else {
      b.className = 'koop'; b.textContent = w.prijs + ' munten'; b.disabled = D.munten < w.prijs
      b.onclick = function () { if (D.munten < w.prijs) return; D.munten -= w.prijs; D.wapens.push(id); bewaar(); Geluid.koop(); tekenWinkel() }
    }
    k.appendChild(b); lw.appendChild(k)
  })
  var lu = $('lijstupgrades'); lu.innerHTML = ''
  Object.keys(VS.UPGRADES).forEach(function (id) {
    var u = VS.UPGRADES[id], n = D.upgrades[id] || 0, k = document.createElement('div'); k.className = 'kaart'
    var c = document.createElement('canvas'); upgradeIcoon(c, id); k.appendChild(c)
    var niv = ''; for (var i = 0; i < u.prijzen.length; i++) niv += '<i class="' + (i < n ? 'aan' : '') + '"></i>'
    k.insertAdjacentHTML('beforeend', '<div class="naam">' + u.naam + '</div><div class="zin">' + u.zin + '</div><div class="niv">' + niv + '</div>')
    var b = document.createElement('button')
    if (n >= u.prijzen.length) { b.className = 'bezit'; b.textContent = 'Helemaal vol' }
    else {
      var prijs = u.prijzen[n]
      b.className = 'koop'; b.textContent = prijs + ' munten'; b.disabled = D.munten < prijs
      b.onclick = function () { if (D.munten < prijs) return; D.munten -= prijs; D.upgrades[id] = n + 1; bewaar(); Geluid.koop(); tekenWinkel() }
    }
    k.appendChild(b); lu.appendChild(k)
  })
}

// alleen om te testen: ?debug geeft de spelstaat aan de console
if (params.has('debug')) window.__vlot = { s: function () { return s }, D: D, start: startLevel }

meet()
tekenGeluidKnop()
if (BELONING) startLevel(D.open)
else toonMenu()
requestAnimationFrame(frame)
})()
