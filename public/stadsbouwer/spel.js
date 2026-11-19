// Stadsbouwer: scherm, bouwen met slepen, gebouwen, auto's, dag en nacht. Regels in kern.js.
(function () {
'use strict'
var $ = function (id) { return document.getElementById(id) }
var BELONING = NK.BELONING
var Geluid = NK.Geluid
var TAU = Math.PI * 2, N = SB.N, B = SB.BOUW

// ── opslag ──
var D = NK.opslag('kk_sb', { s: null, geluid: true, rustig: false, tempo: 1, uitlegGezien: false, tipSlepen: false })
Geluid.zetAan(function () { return D.geluid })
var s = D.s
var G = {
  bouw: function () { Geluid.toon(520, 0.06, 'triangle', 0.08); Geluid.toon(780, 0.08, 'triangle', 0.06, 0.05) },
  weg: function () { Geluid.ruis(0.15, 0.08, 700, 0.8) },
  sloop: function () { Geluid.ruis(0.3, 0.14, 300, 0.7); Geluid.toon(160, 0.2, 'sawtooth', 0.04, 0, 90) },
  groei: function () { Geluid.toon(1200 + Math.random() * 300, 0.05, 'sine', 0.025) },
  niet: function () { Geluid.toon(200, 0.12, 'sine', 0.1, 0, 140) },
  mijlpaal: function () { Geluid.win() },
  doel: function () { [659, 880, 1175].forEach(function (f, i) { Geluid.toon(f, 0.18, 'triangle', 0.1, i * 0.08) }) },
  brand: function () { [880, 660, 880, 660].forEach(function (f, i) { Geluid.toon(f, 0.14, 'square', 0.05, i * 0.16) }) },
}

// ── beeld: schuin bekeken rooster (x naar rechtsonder, y naar linksonder) ──
var C = NK.canvas($('c'), function () { if (C) { pasIn(); laagVersie++ } })
var ctx = C.ctx, A = 16, OX = 0, OY = 0, zoom = 1, panX = 0, panY = 0, basis = 16
function iso(x, y, h) { return [OX + (x - y) * A, OY + (x + y) * A * 0.5 - (h || 0) * A] }
function terug(sx, sy) { var u = (sx - OX) / A, v = (sy - OY) / (A * 0.5); return [(u + v) / 2, (v - u) / 2] }
function pasIn() {
  var boven = 70, onder = 120, bw = C.W - 16, bh = C.H - boven - onder
  basis = Math.max(6, Math.min(bw / (N * 2 + 2), bh / (N + 3)))
  A = basis * zoom
  OX = C.W / 2 + panX
  OY = boven + (bh - N * A) / 2 + A * 1.6 + panY
}
function begrens() { var m = (zoom - 1) * Math.max(C.W, C.H) * 0.55 + 40; panX = Math.max(-m, Math.min(m, panX)); panY = Math.max(-m, Math.min(m, panY)) }
function zoomOm(f, sx, sy) { zoomNaar(zoom * f, sx == null ? C.W / 2 : sx, sy == null ? C.H / 2 : sy) }
// zoom zo dat het punt onder (sx, sy) op dezelfde plek blijft
function zoomNaar(z, sx, sy, w) {
  w = w || terug(sx, sy)
  zoom = Math.max(1, Math.min(4, z)); pasIn()
  if (zoom <= 1.001) { panX = 0; panY = 0; pasIn(); return }
  var p = iso(w[0], w[1]); panX += sx - p[0]; panY += sy - p[1]; begrens(); pasIn()
}

// ── kleuren ──
function tint(hex, f) {
  var n = parseInt(hex.slice(1), 16), r = n >> 16, g2 = n >> 8 & 255, b = n & 255, t = f < 0 ? 0 : 255, p = Math.abs(f)
  return 'rgb(' + Math.round((t - r) * p + r) + ',' + Math.round((t - g2) * p + g2) + ',' + Math.round((t - b) * p + b) + ')'
}
function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296 }
var DAKEN = ['#d0504a', '#3f6fd8', '#3fae58', '#e8902a', '#8a5ad8']
var MUREN = ['#f6ead6', '#fff4e0', '#e8f0f8', '#f8e0e0', '#e8f4e0']
var FLATS = ['#e8e4dc', '#d8c8b0', '#c8d4e4', '#f0d8c0']
var AUTOS = ['#e8443a', '#3f8fe8', '#ffd23d', '#ffffff', '#5be37a', '#ff8a3d', '#2a2a3a', '#c88aff']

// ── tekenen op de laag (alles wat stilstaat) ──
var g = null, nacht = 0, lichten = []
function P(x, y, h) { return iso(x, y, h) }
function vlak(pts, kl) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fillStyle = kl; g.fill() }
function ruit(x, y, kl, m) { m = m || 0; vlak([P(x + m, y + m), P(x + 1 - m, y + m), P(x + 1 - m, y + 1 - m), P(x + m, y + 1 - m)], kl) }
function doos(x0, y0, x1, y1, h0, h1, kl, boven) {
  vlak([P(x0, y1, h0), P(x1, y1, h0), P(x1, y1, h1), P(x0, y1, h1)], tint(kl, -0.08))
  vlak([P(x1, y0, h0), P(x1, y1, h0), P(x1, y1, h1), P(x1, y0, h1)], tint(kl, -0.24))
  vlak([P(x0, y0, h1), P(x1, y0, h1), P(x1, y1, h1), P(x0, y1, h1)], boven || tint(kl, 0.12))
}
function schaduw(x0, y0, x1, y1, h) { var d = Math.min(0.5, h * 0.35); vlak([P(x0, y1), P(x1, y1), P(x1 + d, y1 + d * 0.4), P(x0 + d, y1 + d * 0.4)], 'rgba(0,0,0,0.13)'); vlak([P(x1, y0), P(x1 + d, y0 + d * 0.4), P(x1 + d, y1 + d * 0.4), P(x1, y1)], 'rgba(0,0,0,0.13)') }
// ramen op de voorkant langs y = vy (van x0 tot x1) en op de zijkant langs x = vx
function raamKleur(id) { if (nacht > 0.35 && hash(id) < 0.7) return 'licht'; return nacht > 0.35 ? '#2a3050' : '#9ad0ff' }
function ramenY(x0, x1, vy, h0, h1, rijen, kol, id) {
  for (var r = 0; r < rijen; r++) for (var k = 0; k < kol; k++) {
    var a = x0 + (x1 - x0) * (k + 0.22) / kol, b = x0 + (x1 - x0) * (k + 0.78) / kol, c = h0 + (h1 - h0) * (r + 0.28) / rijen, d = h0 + (h1 - h0) * (r + 0.78) / rijen
    var pts = [P(a, vy, c), P(b, vy, c), P(b, vy, d), P(a, vy, d)], kl = raamKleur(id * 131 + r * 17 + k)
    if (kl === 'licht') lichten.push(pts); else vlak(pts, kl)
  }
}
function ramenX(y0, y1, vx, h0, h1, rijen, kol, id) {
  for (var r = 0; r < rijen; r++) for (var k = 0; k < kol; k++) {
    var a = y0 + (y1 - y0) * (k + 0.22) / kol, b = y0 + (y1 - y0) * (k + 0.78) / kol, c = h0 + (h1 - h0) * (r + 0.28) / rijen, d = h0 + (h1 - h0) * (r + 0.78) / rijen
    var pts = [P(vx, a, c), P(vx, b, c), P(vx, b, d), P(vx, a, d)], kl = raamKleur(id * 977 + r * 23 + k * 5)
    if (kl === 'licht') lichten.push(pts); else vlak(pts, kl === '#9ad0ff' ? '#7ab8e8' : kl)
  }
}
function cilinder(cx, cy, r, h0, h1, kl, dak) {
  var a = P(cx, cy, h0), b = P(cx, cy, h1), rx = r * A * 1.41, ry = rx / 2
  var gr = g.createLinearGradient(a[0] - rx, 0, a[0] + rx, 0); gr.addColorStop(0, tint(kl, 0.08)); gr.addColorStop(1, tint(kl, -0.3))
  g.fillStyle = gr; g.beginPath(); g.moveTo(b[0] - rx, b[1]); g.lineTo(b[0] + rx, b[1]); g.lineTo(a[0] + rx, a[1]); g.ellipse(a[0], a[1], rx, ry, 0, 0, Math.PI, false); g.closePath(); g.fill()
  g.fillStyle = dak || tint(kl, 0.18); g.beginPath(); g.ellipse(b[0], b[1], rx, ry, 0, 0, TAU); g.fill()
}
function boompje(x, y, maat, kl) {
  var c = P(x, y, 0), r = A * 0.28 * maat
  g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.ellipse(c[0] + r * 0.3, c[1], r * 1.1, r * 0.45, 0, 0, TAU); g.fill()
  g.fillStyle = '#7a5232'; g.fillRect(c[0] - r * 0.15, c[1] - r * 1.2, r * 0.3, r * 1.2)
  var gr = g.createRadialGradient(c[0] - r * 0.3, c[1] - r * 1.9, r * 0.1, c[0], c[1] - r * 1.6, r * 1.1)
  gr.addColorStop(0, tint(kl, 0.3)); gr.addColorStop(1, tint(kl, -0.2)); g.fillStyle = gr
  g.beginPath(); g.arc(c[0], c[1] - r * 1.65, r, 0, TAU); g.fill()
}

// ── de grond ──
function isWeg(x, y) { return x >= 0 && y >= 0 && x < N && y < N && s.cel[y * N + x].t === 'weg' }
function isWater(x, y) { if (x < 0 || y < 0 || x >= N || y >= N) return false; var c = s.cel[y * N + x]; return c.t === 'water0' || c.brug }
function tekenGrond() {
  // zijkanten van het eiland
  var d = 1.1
  vlak([P(0, N), P(N, N), P(N, N, -d), P(0, N, -d)], '#7a4e2e')
  vlak([P(N, 0), P(N, N), P(N, N, -d), P(N, 0, -d)], '#5e3a22')
  vlak([P(0, N, -d * 0.35), P(N, N, -d * 0.35), P(N, N, -d * 0.38), P(0, N, -d * 0.38)], 'rgba(0,0,0,0.12)')
  vlak([P(0, 0), P(N, 0), P(N, N), P(0, N)], '#7ccf5a')
  for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
    var i = y * N + x, c = s.cel[i]
    if (c.t === 'water0' || c.brug) {
      ruit(x, y, '#3a8ae0')
      ;[[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (q) { if (!isWater(x + q[0], y + q[1])) { var m = 0.12; if (q[0] === -1) vlak([P(x, y), P(x + m, y), P(x + m, y + 1), P(x, y + 1)], '#e8d8a0'); if (q[0] === 1) vlak([P(x + 1 - m, y), P(x + 1, y), P(x + 1, y + 1), P(x + 1 - m, y + 1)], '#e8d8a0'); if (q[1] === -1) vlak([P(x, y), P(x + 1, y), P(x + 1, y + m), P(x, y + m)], '#e8d8a0'); if (q[1] === 1) vlak([P(x, y + 1 - m), P(x + 1, y + 1 - m), P(x + 1, y + 1), P(x, y + 1)], '#e8d8a0') } })
      if ((x * 7 + y * 3) % 5 === 0) { var w = P(x + 0.5, y + 0.5); g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1; g.beginPath(); g.ellipse(w[0], w[1], A * 0.25, A * 0.08, 0, 0, TAU); g.stroke() }
    } else if ((x + y) % 2) ruit(x, y, 'rgba(90,170,60,0.22)')
    if (c.t === 'weg') tekenWeg(x, y, c)
    else if (B[c.t] && B[c.t].zone) {
      if (!c.lvl) { ruit(x, y, NK.hexA(B[c.t].kleur, 0.3), 0.06); g.strokeStyle = NK.hexA(B[c.t].kleur, 0.9); g.lineWidth = Math.max(1, A * 0.05); g.setLineDash([A * 0.15, A * 0.1]); g.beginPath(); var a = P(x + 0.1, y + 0.1), b = P(x + 0.9, y + 0.1), e = P(x + 0.9, y + 0.9), f = P(x + 0.1, y + 0.9); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(e[0], e[1]); g.lineTo(f[0], f[1]); g.closePath(); g.stroke(); g.setLineDash([]) }
      else ruit(x, y, c.t === 'wonen' ? '#a8dc8a' : c.t === 'winkel' ? '#c8ccd8' : '#b8b0a0', 0.02)
    } else if (c.t === 'park') ruit(x, y, '#5ec04a', 0.02)
    else if (c.t === 'school' || c.t === 'zorg' || c.t === 'brand' || c.t === 'water' || c.t === 'stroom' || c.t === 'stadion') ruit(x, y, '#c8ccd8', 0.03)
    if (netwerk && c.t !== 'water0' && !c.brug) {
      var dk = s.dekking, st = dk.stroom[i] > 0, wt = dk.water[i] > 0
      ruit(x, y, st && wt ? 'rgba(62,240,255,0.32)' : st || wt ? 'rgba(255,170,60,0.32)' : 'rgba(255,60,90,0.28)', 0.04)
    }
  }
}
function tekenWeg(x, y, c) {
  if (c.brug) { vlak([P(x, y, 0.08), P(x + 1, y, 0.08), P(x + 1, y + 1, 0.08), P(x, y + 1, 0.08)], '#8a8f9e'); doos(x, y + 0.92, x + 1, y + 1, 0, 0.08, '#6a6e7c') }
  var h = c.brug ? 0.08 : 0
  vlak([P(x, y, h), P(x + 1, y, h), P(x + 1, y + 1, h), P(x, y + 1, h)], '#4c5164')
  // stoep waar geen weg naast ligt
  var m = 0.1
  if (!isWeg(x - 1, y)) vlak([P(x, y, h), P(x + m, y, h), P(x + m, y + 1, h), P(x, y + 1, h)], '#b8bccb')
  if (!isWeg(x + 1, y)) vlak([P(x + 1 - m, y, h), P(x + 1, y, h), P(x + 1, y + 1, h), P(x + 1 - m, y + 1, h)], '#b8bccb')
  if (!isWeg(x, y - 1)) vlak([P(x, y, h), P(x + 1, y, h), P(x + 1, y + m, h), P(x, y + m, h)], '#b8bccb')
  if (!isWeg(x, y + 1)) vlak([P(x, y + 1 - m, h), P(x + 1, y + 1 - m, h), P(x + 1, y + 1, h), P(x, y + 1, h)], '#b8bccb')
  // middenstreep naar de buren
  g.strokeStyle = 'rgba(255,230,140,0.85)'; g.lineWidth = Math.max(1, A * 0.05); g.setLineDash([A * 0.12, A * 0.12])
  var mid = P(x + 0.5, y + 0.5, h), buren = [[-1, 0, x, y + 0.5], [1, 0, x + 1, y + 0.5], [0, -1, x + 0.5, y], [0, 1, x + 0.5, y + 1]], n = 0
  buren.forEach(function (q) { if (isWeg(x + q[0], y + q[1])) { n++; var e = P(q[2], q[3], h); g.beginPath(); g.moveTo(mid[0], mid[1]); g.lineTo(e[0], e[1]); g.stroke() } })
  g.setLineDash([])
  if (c.brug) { g.strokeStyle = '#e8e8f0'; g.lineWidth = Math.max(1, A * 0.04); [[x, y + 0.04], [x, y + 0.96]].forEach(function (q) { if (isWeg(x - 1, y) || isWeg(x + 1, y)) { var a = P(q[0], q[1], 0.25), b = P(q[0] + 1, q[1], 0.25); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke() } }); [[x + 0.04, y], [x + 0.96, y]].forEach(function (q) { if (isWeg(x, y - 1) || isWeg(x, y + 1)) { var a = P(q[0], q[1], 0.25), b = P(q[0], q[1] + 1, 0.25); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke() } }) }
  if ((x * 3 + y * 5) % 4 === 0) lampen.push(P(x + 0.5, y + 0.5, 0.6))
}

// ── gebouwen ──
var lampen = [], rookPlek = [], molens = [], antennes = []
function tekenCel(x, y, i) {
  var c = s.cel[i], v = c.v == null ? hash(i) : c.v, k
  if (c.t === 'boom') { boompje(x + 0.5, y + 0.55, 0.9 + v * 0.5, v > 0.5 ? '#3fae58' : '#4fbf4a'); if (v > 0.6) boompje(x + 0.25, y + 0.3, 0.7, '#5ac850'); return }
  if (c.t === 'wonen' && c.lvl) {
    if (c.lvl === 1) {
      var muur = MUREN[(v * 5) | 0], dak = DAKEN[(v * 7 | 0) % 5]
      schaduw(x + 0.2, y + 0.2, x + 0.8, y + 0.8, 0.8)
      doos(x + 0.2, y + 0.2, x + 0.8, y + 0.8, 0, 0.42, muur)
      vlak([P(x + 0.15, y + 0.85, 0.42), P(x + 0.85, y + 0.85, 0.42), P(x + 0.85, y + 0.5, 0.78), P(x + 0.15, y + 0.5, 0.78)], dak)
      vlak([P(x + 0.85, y + 0.85, 0.42), P(x + 0.85, y + 0.15, 0.42), P(x + 0.85, y + 0.5, 0.78)], tint(muur, -0.24))
      vlak([P(x + 0.15, y + 0.15, 0.42), P(x + 0.85, y + 0.15, 0.42), P(x + 0.85, y + 0.5, 0.78), P(x + 0.15, y + 0.5, 0.78)], tint(dak, -0.2))
      vlak([P(x + 0.45, y + 0.8, 0), P(x + 0.58, y + 0.8, 0), P(x + 0.58, y + 0.8, 0.26), P(x + 0.45, y + 0.8, 0.26)], '#8a5a32')
      ramenX(y + 0.3, y + 0.7, x + 0.8, 0.05, 0.38, 1, 2, i)
      if (v > 0.55) boompje(x + 0.12, y + 0.85, 0.55, '#4fbf4a')
    } else if (c.lvl === 2) {
      var m2 = MUREN[((v * 9) | 0) % 5], acc = DAKEN[(v * 11 | 0) % 5]
      schaduw(x + 0.12, y + 0.12, x + 0.88, y + 0.88, 1)
      doos(x + 0.12, y + 0.12, x + 0.88, y + 0.88, 0, 0.92, m2, tint(acc, 0.2))
      doos(x + 0.12, y + 0.12, x + 0.88, y + 0.88, 0.92, 0.98, acc)
      ramenY(x + 0.12, x + 0.88, y + 0.88, 0.05, 0.9, 2, 3, i); ramenX(y + 0.12, y + 0.88, x + 0.88, 0.05, 0.9, 2, 3, i)
      vlak([P(x + 0.12, y + 0.88, 0.45), P(x + 0.88, y + 0.88, 0.45), P(x + 0.88, y + 0.95, 0.45), P(x + 0.12, y + 0.95, 0.45)], acc)
    } else {
      var fl = FLATS[(v * 4) | 0], hh = 1.8 + v * 0.9, band = DAKEN[(v * 13 | 0) % 5]
      schaduw(x + 0.1, y + 0.1, x + 0.9, y + 0.9, hh)
      doos(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0, hh, fl)
      var rijen = Math.round(hh / 0.3)
      for (var bb = 0; bb < rijen; bb += 2) vlak([P(x + 0.1, y + 0.9, bb * hh / rijen + 0.02), P(x + 0.9, y + 0.9, bb * hh / rijen + 0.02), P(x + 0.9, y + 0.9, bb * hh / rijen + 0.06), P(x + 0.1, y + 0.9, bb * hh / rijen + 0.06)], band)
      ramenY(x + 0.1, x + 0.9, y + 0.9, 0.05, hh - 0.05, rijen, 3, i); ramenX(y + 0.1, y + 0.9, x + 0.9, 0.05, hh - 0.05, rijen, 3, i)
      doos(x + 0.35, y + 0.3, x + 0.6, y + 0.55, hh, hh + 0.22, '#a8acb8')
    }
    return
  }
  if (c.t === 'winkel' && c.lvl) {
    if (c.lvl === 1) {
      schaduw(x + 0.15, y + 0.15, x + 0.85, y + 0.85, 0.6)
      doos(x + 0.15, y + 0.15, x + 0.85, y + 0.85, 0, 0.48, '#f4f4f8', '#d8dce8')
      var lk = ['#e8443a', '#3f8fe8', '#3fae58', '#ff8a3d'][(v * 4) | 0]
      for (var st = 0; st < 6; st++) vlak([P(x + 0.15 + st * 0.1167, y + 0.85, 0.42), P(x + 0.15 + (st + 1) * 0.1167, y + 0.85, 0.42), P(x + 0.15 + (st + 1) * 0.1167, y + 1.0, 0.3), P(x + 0.15 + st * 0.1167, y + 1.0, 0.3)], st % 2 ? '#ffffff' : lk)
      vlak([P(x + 0.25, y + 0.85, 0.05), P(x + 0.75, y + 0.85, 0.05), P(x + 0.75, y + 0.85, 0.3), P(x + 0.25, y + 0.85, 0.3)], nacht > 0.35 ? '#ffd88a' : '#9ad0ff')
      if (nacht > 0.35) lichten.push([P(x + 0.25, y + 0.85, 0.05), P(x + 0.75, y + 0.85, 0.05), P(x + 0.75, y + 0.85, 0.3), P(x + 0.25, y + 0.85, 0.3)])
      doos(x + 0.35, y + 0.4, x + 0.65, y + 0.45, 0.48, 0.68, lk)
    } else if (c.lvl === 2) {
      schaduw(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 1)
      doos(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0, 0.82, '#e0e4ee')
      var glas = [P(x + 0.14, y + 0.9, 0.04), P(x + 0.86, y + 0.9, 0.04), P(x + 0.86, y + 0.9, 0.5), P(x + 0.14, y + 0.9, 0.5)]
      if (nacht > 0.35) lichten.push(glas); else vlak(glas, '#7ab8f0')
      ramenX(y + 0.1, y + 0.9, x + 0.9, 0.5, 0.8, 1, 3, i)
      var bord = ['#ff4f7a', '#3ef0ff', '#ffd23d', '#8dff4f'][(v * 4) | 0]
      vlak([P(x + 0.2, y + 0.9, 0.86), P(x + 0.8, y + 0.9, 0.86), P(x + 0.8, y + 0.9, 1.12), P(x + 0.2, y + 0.9, 1.12)], bord)
      if (nacht > 0.35) lichten.push([P(x + 0.2, y + 0.9, 0.86), P(x + 0.8, y + 0.9, 0.86), P(x + 0.8, y + 0.9, 1.12), P(x + 0.2, y + 0.9, 1.12), bord])
    } else {
      var th = 2.6 + v * 1.4, glasK = v > 0.5 ? '#5a9ae8' : '#4ac8c8'
      schaduw(x + 0.15, y + 0.15, x + 0.85, y + 0.85, th)
      doos(x + 0.15, y + 0.15, x + 0.85, y + 0.85, 0, th, glasK, '#c8d8f0')
      var rij2 = Math.round(th / 0.25)
      for (var r2 = 1; r2 < rij2; r2++) { var hr = r2 * th / rij2; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; var a1 = P(x + 0.15, y + 0.85, hr), a2 = P(x + 0.85, y + 0.85, hr), a3 = P(x + 0.85, y + 0.15, hr); g.beginPath(); g.moveTo(a1[0], a1[1]); g.lineTo(a2[0], a2[1]); g.lineTo(a3[0], a3[1]); g.stroke() }
      if (nacht > 0.35) { ramenY(x + 0.15, x + 0.85, y + 0.85, 0.1, th - 0.1, rij2, 4, i); ramenX(y + 0.15, y + 0.85, x + 0.85, 0.1, th - 0.1, rij2, 4, i) }
      var gl = g.createLinearGradient(P(x + 0.15, y + 0.85, th)[0], 0, P(x + 0.85, y + 0.85, th)[0], 0); gl.addColorStop(0, 'rgba(255,255,255,0.25)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = gl
      vlak([P(x + 0.15, y + 0.85, 0), P(x + 0.85, y + 0.85, 0), P(x + 0.85, y + 0.85, th), P(x + 0.15, y + 0.85, th)], 'rgba(255,255,255,0.08)')
      doos(x + 0.4, y + 0.4, x + 0.6, y + 0.6, th, th + 0.15, '#8a8ea0')
      antennes.push(P(x + 0.5, y + 0.5, th + 0.55))
      var at = P(x + 0.5, y + 0.5, th + 0.15), au = P(x + 0.5, y + 0.5, th + 0.55); g.strokeStyle = '#8a8ea0'; g.lineWidth = Math.max(1, A * 0.04); g.beginPath(); g.moveTo(at[0], at[1]); g.lineTo(au[0], au[1]); g.stroke()
    }
    return
  }
  if (c.t === 'industrie' && c.lvl) {
    if (c.lvl === 1) {
      schaduw(x + 0.1, y + 0.15, x + 0.9, y + 0.85, 0.6)
      doos(x + 0.1, y + 0.15, x + 0.9, y + 0.85, 0, 0.42, '#d8d0b8')
      for (k = 0; k < 3; k++) { var x0 = x + 0.1 + k * 0.2667, x1 = x0 + 0.2667; vlak([P(x0, y + 0.85, 0.42), P(x1, y + 0.85, 0.42), P(x1, y + 0.85, 0.62)], '#ffd23d'); vlak([P(x1, y + 0.85, 0.42), P(x1, y + 0.15, 0.42), P(x1, y + 0.15, 0.62), P(x1, y + 0.85, 0.62)], '#e8b82a'); vlak([P(x0, y + 0.85, 0.42), P(x1, y + 0.85, 0.62), P(x1, y + 0.15, 0.62), P(x0, y + 0.15, 0.42)], '#9aa0b0') }
      vlak([P(x + 0.4, y + 0.85, 0), P(x + 0.65, y + 0.85, 0), P(x + 0.65, y + 0.85, 0.32), P(x + 0.4, y + 0.85, 0.32)], '#7a7e8e')
      doos(x + 0.75, y + 0.88, x + 0.9, y + 0.98, 0, 0.12, '#c8945a')
    } else if (c.lvl === 2) {
      schaduw(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 1)
      doos(x + 0.1, y + 0.3, x + 0.9, y + 0.9, 0, 0.6, '#c8704a')
      ramenY(x + 0.1, x + 0.9, y + 0.9, 0.1, 0.55, 1, 4, i)
      cilinder(x + 0.3, y + 0.2, 0.08, 0, 1.5, '#e8e4dc', '#3a3a4a')
      var band2 = P(x + 0.3, y + 0.2, 1.3); g.fillStyle = '#e8443a'; g.fillRect(band2[0] - A * 0.113, band2[1] - A * 0.05, A * 0.226, A * 0.1)
      rookPlek.push([x + 0.3, y + 0.2, 1.5])
    } else {
      schaduw(x + 0.05, y + 0.05, x + 0.95, y + 0.95, 1.2)
      doos(x + 0.4, y + 0.35, x + 0.95, y + 0.95, 0, 0.55, '#9aa0b0')
      cilinder(x + 0.22, y + 0.7, 0.14, 0, 1.0, '#d8dce8')
      cilinder(x + 0.22, y + 0.35, 0.13, 0, 0.95, '#c8ccd8')
      cilinder(x + 0.75, y + 0.18, 0.08, 0.3, 2.0, '#e8e4dc', '#3a3a4a')
      ramenY(x + 0.4, x + 0.95, y + 0.95, 0.1, 0.5, 1, 3, i)
      rookPlek.push([x + 0.75, y + 0.18, 2.0])
      vlak([P(x + 0.55, y + 0.95, 0.56), P(x + 0.9, y + 0.95, 0.56), P(x + 0.9, y + 0.95, 0.66), P(x + 0.55, y + 0.95, 0.66)], '#ffd23d')
    }
    return
  }
  if (c.t === 'park') {
    var pc = P(x + 0.5, y + 0.5)
    g.strokeStyle = '#e8d8a8'; g.lineWidth = Math.max(1.5, A * 0.12); g.beginPath(); var q1 = P(x + 0.5, y), q2 = P(x + 0.5, y + 1), q3 = P(x, y + 0.5), q4 = P(x + 1, y + 0.5); g.moveTo(q1[0], q1[1]); g.lineTo(q2[0], q2[1]); g.moveTo(q3[0], q3[1]); g.lineTo(q4[0], q4[1]); g.stroke()
    g.fillStyle = '#a8a8b8'; g.beginPath(); g.ellipse(pc[0], pc[1], A * 0.26, A * 0.13, 0, 0, TAU); g.fill(); g.fillStyle = '#5ac8ff'; g.beginPath(); g.ellipse(pc[0], pc[1] - A * 0.02, A * 0.2, A * 0.09, 0, 0, TAU); g.fill()
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(pc[0] - A * 0.02, pc[1] - A * 0.25, A * 0.04, A * 0.22)
    boompje(x + 0.2, y + 0.2, 0.75, '#3fae58'); boompje(x + 0.8, y + 0.25, 0.65, '#4fbf4a'); boompje(x + 0.22, y + 0.8, 0.6, '#5ac850')
    var fb = P(x + 0.78, y + 0.78); g.fillStyle = ['#ff8ab8', '#ffe066', '#ff6a5a'][(v * 3) | 0]; g.beginPath(); g.arc(fb[0], fb[1] - A * 0.04, A * 0.07, 0, TAU); g.fill()
    return
  }
  if (c.t === 'stroom') {
    schaduw(x + 0.05, y + 0.55, x + 0.5, y + 0.95, 0.5)
    for (k = 0; k < 3; k++) vlak([P(x + 0.08 + k * 0.14, y + 0.6, 0.05), P(x + 0.2 + k * 0.14, y + 0.6, 0.05), P(x + 0.2 + k * 0.14, y + 0.95, 0.2), P(x + 0.08 + k * 0.14, y + 0.95, 0.2)], '#2a4a9a')
    doos(x + 0.6, y + 0.6, x + 0.92, y + 0.92, 0, 0.35, '#e8e4dc'); vlak([P(x + 0.66, y + 0.92, 0.1), P(x + 0.86, y + 0.92, 0.1), P(x + 0.86, y + 0.92, 0.28), P(x + 0.66, y + 0.92, 0.28)], '#ffd23d')
    ;[[x + 0.3, y + 0.3, 2.3], [x + 0.75, y + 0.25, 1.9]].forEach(function (m) { cilinder(m[0], m[1], 0.035, 0, m[2], '#f4f6fa'); doos(m[0] - 0.05, m[1] - 0.03, m[0] + 0.07, m[1] + 0.03, m[2] - 0.03, m[2] + 0.07, '#f4f6fa'); molens.push(P(m[0] + 0.07, m[1], m[2] + 0.02)) })
    return
  }
  if (c.t === 'water') {
    schaduw(x + 0.2, y + 0.2, x + 0.8, y + 0.8, 1.6)
    ;[[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]].forEach(function (q) { var a = P(x + q[0], y + q[1], 0), b = P(x + 0.5 + (q[0] - 0.5) * 0.6, y + 0.5 + (q[1] - 0.5) * 0.6, 1.1); g.strokeStyle = '#8a8ea0'; g.lineWidth = Math.max(1.5, A * 0.06); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke() })
    cilinder(x + 0.5, y + 0.5, 0.3, 1.05, 1.75, '#5ab8f0', '#8ad0ff')
    var top = P(x + 0.5, y + 0.5, 1.75), tp = P(x + 0.5, y + 0.5, 2.05); g.fillStyle = '#3f8fd8'; g.beginPath(); g.moveTo(top[0] - A * 0.42, top[1]); g.lineTo(tp[0], tp[1]); g.lineTo(top[0] + A * 0.42, top[1]); g.closePath(); g.fill()
    var dr = P(x + 0.5, y + 0.5, 1.4); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(dr[0], dr[1] - A * 0.16); g.quadraticCurveTo(dr[0] + A * 0.12, dr[1], dr[0], dr[1] + A * 0.08); g.quadraticCurveTo(dr[0] - A * 0.12, dr[1], dr[0], dr[1] - A * 0.16); g.fill()
    return
  }
  if (c.t === 'school') {
    schaduw(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 1)
    doos(x + 0.1, y + 0.1, x + 0.9, y + 0.55, 0, 0.75, '#e8885a')
    doos(x + 0.1, y + 0.55, x + 0.45, y + 0.9, 0, 0.75, '#e8885a')
    ramenY(x + 0.45, x + 0.9, y + 0.55, 0.08, 0.7, 2, 3, i); ramenX(y + 0.1, y + 0.55, x + 0.9, 0.08, 0.7, 2, 2, i); ramenY(x + 0.1, x + 0.45, y + 0.9, 0.08, 0.7, 2, 2, i + 7)
    ruit(x + 0.47, y + 0.57, 'rgba(255,255,255,0.25)', 0.1)
    var vp = P(x + 0.8, y + 0.8, 0), vt = P(x + 0.8, y + 0.8, 1.3); g.strokeStyle = '#d8dce8'; g.lineWidth = Math.max(1, A * 0.04); g.beginPath(); g.moveTo(vp[0], vp[1]); g.lineTo(vt[0], vt[1]); g.stroke()
    g.fillStyle = '#ffd23d'; g.fillRect(vt[0], vt[1], A * 0.3, A * 0.18)
    return
  }
  if (c.t === 'brand') {
    schaduw(x + 0.1, y + 0.15, x + 0.9, y + 0.9, 1)
    doos(x + 0.1, y + 0.15, x + 0.9, y + 0.9, 0, 0.7, '#d8342a')
    ;[0.18, 0.52].forEach(function (q) { vlak([P(x + q, y + 0.9, 0), P(x + q + 0.3, y + 0.9, 0), P(x + q + 0.3, y + 0.9, 0.45), P(x + q, y + 0.9, 0.45)], '#f4f4f8'); for (var l = 1; l < 4; l++) { var a = P(x + q, y + 0.9, l * 0.11), b = P(x + q + 0.3, y + 0.9, l * 0.11); g.strokeStyle = '#b8bccb'; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke() } })
    doos(x + 0.65, y + 0.2, x + 0.85, y + 0.4, 0.7, 1.4, '#c02a22')
    var sl = P(x + 0.75, y + 0.3, 1.45); g.fillStyle = '#3ef0ff'; g.beginPath(); g.arc(sl[0], sl[1], A * 0.06, 0, TAU); g.fill()
    return
  }
  if (c.t === 'zorg') {
    schaduw(x + 0.08, y + 0.08, x + 0.92, y + 0.92, 1.4)
    doos(x + 0.08, y + 0.08, x + 0.92, y + 0.92, 0, 1.1, '#f4f6fa', '#e8ecf4')
    ramenY(x + 0.08, x + 0.92, y + 0.92, 0.1, 1.05, 3, 4, i); ramenX(y + 0.08, y + 0.92, x + 0.92, 0.1, 1.05, 3, 4, i)
    var kr = P(x + 0.5, y + 0.92, 0.85); g.fillStyle = '#e8302a'; g.fillRect(kr[0] - A * 0.06, kr[1] - A * 0.18, A * 0.12, A * 0.36); g.fillRect(kr[0] - A * 0.18, kr[1] - A * 0.06, A * 0.36, A * 0.12)
    var hp = P(x + 0.5, y + 0.5, 1.1); g.fillStyle = '#3fae58'; g.beginPath(); g.ellipse(hp[0], hp[1], A * 0.3, A * 0.15, 0, 0, TAU); g.fill(); g.fillStyle = '#ffffff'; g.font = '900 ' + Math.max(6, Math.round(A * 0.2)) + 'px Outfit, system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', hp[0], hp[1] + A * 0.01)
    return
  }
  if (c.t === 'stadion') {
    var sc = P(x + 0.5, y + 0.5, 0), sh = A * 0.45
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.ellipse(sc[0] + A * 0.1, sc[1] + A * 0.05, A * 0.95, A * 0.5, 0, 0, TAU); g.fill()
    g.fillStyle = '#8a8ea0'; g.beginPath(); g.ellipse(sc[0], sc[1], A * 0.9, A * 0.46, 0, 0, Math.PI); g.lineTo(sc[0] - A * 0.9, sc[1] - sh); g.ellipse(sc[0], sc[1] - sh, A * 0.9, A * 0.46, 0, Math.PI, 0, true); g.closePath(); g.fill()
    g.fillStyle = '#c8ccd8'; g.beginPath(); g.ellipse(sc[0], sc[1] - sh, A * 0.9, A * 0.46, 0, 0, TAU); g.fill()
    g.fillStyle = '#e8443a'; g.beginPath(); g.ellipse(sc[0], sc[1] - sh, A * 0.78, A * 0.39, 0, 0, TAU); g.fill()
    g.fillStyle = '#4fbf4a'; g.beginPath(); g.ellipse(sc[0], sc[1] - sh + A * 0.04, A * 0.58, A * 0.27, 0, 0, TAU); g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1; g.beginPath(); g.ellipse(sc[0], sc[1] - sh + A * 0.04, A * 0.12, A * 0.06, 0, 0, TAU); g.moveTo(sc[0], sc[1] - sh - A * 0.23); g.lineTo(sc[0], sc[1] - sh + A * 0.31); g.stroke()
    ;[[-0.85, -0.2], [0.85, -0.2], [-0.5, 0.3], [0.5, 0.3]].forEach(function (q) { var lx = sc[0] + q[0] * A, ly = sc[1] + q[1] * A; g.strokeStyle = '#d8dce8'; g.lineWidth = Math.max(1, A * 0.04); g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx, ly - A * 1.3); g.stroke(); g.fillStyle = nacht > 0.35 ? '#fff6cf' : '#e8e8f0'; g.fillRect(lx - A * 0.08, ly - A * 1.38, A * 0.16, A * 0.1); if (nacht > 0.35) lampen.push([lx, ly - A * 1.33, 2]) })
    return
  }
}

// ── de laag opnieuw tekenen als er iets veranderd is ──
var laag = document.createElement('canvas'), laagVersie = 1, laagSleutel = '', netwerk = false
function tekenLaag() {
  var sleutel = [laagVersie, A.toFixed(2), OX.toFixed(1), OY.toFixed(1), Math.round(nacht * 8), netwerk, C.W, C.H].join('|')
  if (sleutel === laagSleutel) return
  laagSleutel = sleutel
  laag.width = Math.floor(C.W * C.dpr); laag.height = Math.floor(C.H * C.dpr)
  g = laag.getContext('2d'); g.setTransform(C.dpr, 0, 0, C.dpr, 0, 0); g.lineCap = 'round'; g.lineJoin = 'round'
  lichten = []; lampen = []; rookPlek = []; molens = []; antennes = []
  tekenGrond()
  // van achter naar voor: per diagonaal
  for (var som = 0; som < N * 2 - 1; som++) for (var x = Math.max(0, som - N + 1); x <= Math.min(N - 1, som); x++) { var y = som - x; tekenCel(x, y, y * N + x) }
  // nacht: alles donkerder, daarna de lichtjes erbovenop
  if (nacht > 0.02) {
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(14,16,52,' + (nacht * 0.62) + ')'; g.fillRect(0, 0, C.W, C.H); g.globalCompositeOperation = 'source-over'
    lichten.forEach(function (pts) { vlak(pts.slice(0, 4), pts[4] || '#ffd88a') })
    g.save(); g.globalCompositeOperation = 'lighter'
    lampen.forEach(function (p) { NK.vlek(g, p[0], p[1] + A * 0.3, A * (p[2] || 1.1), '#ffd27a', nacht * 0.45) })
    lichten.forEach(function (pts) { if (pts[4]) { var m = pts[0]; NK.vlek(g, (pts[0][0] + pts[2][0]) / 2, (pts[0][1] + pts[2][1]) / 2, A * 0.7, pts[4], nacht * 0.4) } })
    g.restore()
  }
}

// ── auto's ──
var autos = []
function autoLoop(dt) {
  var wegen = []
  if (!autoLoop.lijst || autoLoop.versie !== laagVersie) { autoLoop.lijst = []; s.cel.forEach(function (c, i) { if (c.t === 'weg') autoLoop.lijst.push(i) }); autoLoop.versie = laagVersie }
  wegen = autoLoop.lijst
  var doel = D.rustig ? 6 : Math.min(42, 3 + Math.floor((s.inwoners || 0) / 22))
  if (wegen.length < 3) doel = 0
  if (autos.length < doel && Math.random() < dt * 3) {
    var start = wegen[Math.random() * wegen.length | 0], vv = volgende(start, -1)
    if (vv >= 0) autos.push({ i: start, j: vv, f: 0, kl: AUTOS[Math.random() * AUTOS.length | 0], v: 0.8 + Math.random() * 0.6, vorig: -1 })
  }
  if (autos.length > doel + 2) autos.shift()
  autos = autos.filter(function (a) {
    if (s.cel[a.i].t !== 'weg' || s.cel[a.j].t !== 'weg') return false
    a.f += dt * a.v
    if (a.f >= 1) { a.f -= 1; var n = volgende(a.j, a.i); if (n < 0) return false; a.vorig = a.i; a.i = a.j; a.j = n }
    return true
  })
}
function volgende(i, vorig) {
  var opties = SB.buren(s, i).filter(function (j) { return s.cel[j].t === 'weg' && j !== vorig })
  if (!opties.length) return vorig >= 0 && s.cel[vorig].t === 'weg' ? vorig : -1
  return opties[Math.random() * opties.length | 0]
}
function tekenAutos() {
  autos.forEach(function (a) {
    var xi = a.i % N + 0.5, yi = (a.i / N | 0) + 0.5, xj = a.j % N + 0.5, yj = (a.j / N | 0) + 0.5
    var dx = xj - xi, dy = yj - yi, x = xi + dx * a.f + dy * 0.17 * -1, y = yi + dy * a.f + dx * 0.17
    var brug = s.cel[a.i].brug ? 0.08 : 0, p = iso(x, y, brug), q = iso(x + dx, y + dy, brug), hoek = Math.atan2(q[1] - p[1], q[0] - p[0])
    ctx.save(); ctx.translate(p[0], p[1] - A * 0.08); ctx.rotate(hoek); ctx.scale(1, 0.75)
    var l = A * 0.3, w = A * 0.17
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; NK.rondRect(ctx, -l / 2 + 1, -w / 2 + 2, l, w, w * 0.3); ctx.fill()
    ctx.fillStyle = nacht > 0.3 ? tint(a.kl, -nacht * 0.5) : a.kl; NK.rondRect(ctx, -l / 2, -w / 2, l, w, w * 0.3); ctx.fill()
    ctx.fillStyle = nacht > 0.3 ? '#2a3050' : '#bfe4ff'; NK.rondRect(ctx, -l * 0.12, -w * 0.38, l * 0.4, w * 0.76, w * 0.2); ctx.fill()
    if (nacht > 0.35) { ctx.globalCompositeOperation = 'lighter'; NK.vlek(ctx, l * 0.75, 0, l * 0.7, '#fff6cf', nacht * 0.5); ctx.globalCompositeOperation = 'source-over' }
    ctx.restore()
  })
}

// ── rook, molens, vuur ──
var rook = []
function effecten(dt) {
  if (!D.rustig) rookPlek.forEach(function (r) { if (Math.random() < dt * 2.5) rook.push({ x: r[0], y: r[1], h: r[2], t: 0, f: Math.random() * 6 }) })
  rook = rook.filter(function (r) { r.t += dt; return r.t < 3 })
}
function tekenEffecten() {
  rook.forEach(function (r) { var p = iso(r.x + r.t * 0.25, r.y - r.t * 0.1, r.h + r.t * 0.5); ctx.fillStyle = 'rgba(220,224,236,' + (0.45 * (1 - r.t / 3)) + ')'; ctx.beginPath(); ctx.arc(p[0] + Math.sin(r.t * 2 + r.f) * A * 0.1, p[1], A * (0.1 + r.t * 0.12), 0, TAU); ctx.fill() })
  molens.forEach(function (m, n) {
    var hk = tijd * (2.2 + n * 0.3) + n, l = A * 0.62
    ctx.strokeStyle = nacht > 0.3 ? '#a8acc0' : '#ffffff'; ctx.lineWidth = Math.max(1.5, A * 0.06); ctx.lineCap = 'round'
    for (var b = 0; b < 3; b++) { var h = hk + b * TAU / 3; ctx.beginPath(); ctx.moveTo(m[0], m[1]); ctx.lineTo(m[0] + Math.cos(h) * l * 0.35, m[1] + Math.sin(h) * l); ctx.stroke() }
    ctx.fillStyle = '#d8dce8'; ctx.beginPath(); ctx.arc(m[0], m[1], A * 0.05, 0, TAU); ctx.fill()
  })
  if (Math.sin(tijd * 3) > 0) antennes.forEach(function (p) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; NK.vlek(ctx, p[0], p[1], A * (nacht > 0.3 ? 0.35 : 0.15), '#ff3d5a', nacht > 0.3 ? 0.9 : 0.6); ctx.restore() })
  // vuur
  s.cel.forEach(function (c, i) {
    if (!c.vuur) return
    var x = i % N + 0.5, y = (i / N | 0) + 0.5, hgt = c.t === 'wonen' ? [0.5, 0.5, 1, 2.2][c.lvl] : 0.9, p = iso(x, y, hgt)
    for (var f = 0; f < 4; f++) { var fl = Math.sin(tijd * 12 + f * 2) * A * 0.06, fx2 = p[0] + (f - 1.5) * A * 0.15; ctx.fillStyle = f % 2 ? '#ff8a1a' : '#ffd23d'; ctx.beginPath(); ctx.moveTo(fx2 - A * 0.1, p[1]); ctx.quadraticCurveTo(fx2 - A * 0.08, p[1] - A * 0.3, fx2 + fl, p[1] - A * (0.45 + (f % 2) * 0.15)); ctx.quadraticCurveTo(fx2 + A * 0.1, p[1] - A * 0.3, fx2 + A * 0.1, p[1]); ctx.fill() }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; NK.vlek(ctx, p[0], p[1] - A * 0.2, A * 0.9, '#ff6a1a', 0.5 + Math.sin(tijd * 9) * 0.15); ctx.restore()
    var rp = iso(x + 0.2, y - 0.1, hgt + 0.8 + Math.sin(tijd) * 0.1); ctx.fillStyle = 'rgba(60,60,70,0.35)'; ctx.beginPath(); ctx.arc(rp[0], rp[1], A * 0.3, 0, TAU); ctx.fill()
  })
}

// ── lucht ──
function tekenLucht() {
  var gr = ctx.createLinearGradient(0, 0, 0, C.H)
  var dag1 = ['#7ec8ff', '#c8ecff'], avond = ['#ff9a6a', '#ffd8a8'], nacht1 = ['#0b1030', '#24205a']
  var t = klok % DAGDUUR / DAGDUUR, kl
  if (nacht > 0.5) kl = nacht1; else if (t > 0.55 && t < 0.72) kl = avond; else kl = dag1
  gr.addColorStop(0, kl[0]); gr.addColorStop(1, kl[1]); ctx.fillStyle = gr; ctx.fillRect(0, 0, C.W, C.H)
  if (nacht > 0.4) { ctx.fillStyle = 'rgba(255,255,255,' + (nacht - 0.4) + ')'; for (var i = 0; i < 50; i++) { ctx.beginPath(); ctx.arc(hash(i * 3) * C.W, hash(i * 7) * C.H * 0.5, 1 + hash(i) * 1.2, 0, TAU); ctx.fill() } }
  else { ctx.fillStyle = 'rgba(255,255,255,0.75)'; for (var w = 0; w < 4; w++) { var wx = ((hash(w * 11) * C.W + tijd * (8 + w * 3)) % (C.W + 200)) - 100, wy = 60 + hash(w * 5) * C.H * 0.25; ctx.beginPath(); ctx.ellipse(wx, wy, 60, 18, 0, 0, TAU); ctx.ellipse(wx + 40, wy - 10, 40, 18, 0, 0, TAU); ctx.fill() } }
}
var DAGDUUR = 150, klok = 30
function berekenNacht() {
  var t = klok % DAGDUUR / DAGDUUR
  // 0..0.55 dag, 0.55..0.72 avond, 0.72..0.95 nacht, 0.95..1 ochtend
  if (t < 0.55) return 0
  if (t < 0.72) return (t - 0.55) / 0.17
  if (t < 0.95) return 1
  return 1 - (t - 0.95) / 0.05
}

// ── bouwen: gereedschap en slepen ──
var KNOPPEN = [
  ['kijk', 'Kijken', '#c8d0ff', '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3"/>'],
  ['weg', 'Weg', '#b8bccb', '<path d="M8 3L5 21M16 3l3 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M12 5v3M12 11v3M12 17v3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'],
  ['wonen', 'Wonen', '#5be37a', '<path d="M3 11l9-7 9 7v9H3z"/><path d="M10 20v-5h4v5" fill="#0a0a1a"/>'],
  ['winkel', 'Winkels', '#3fa8ff', '<path d="M4 9l2-5h12l2 5zM5 10h14v10H5z"/><path d="M10 20v-6h4v6" fill="#0a0a1a"/>'],
  ['industrie', 'Industrie', '#ffd23d', '<path d="M3 20V10l6 4v-4l6 4V4h4v16z"/>'],
  ['park', 'Park', '#8dff4f', '<circle cx="12" cy="9" r="6"/><path d="M11 14h2v7h-2z"/>'],
  ['stroom', 'Stroom', '#ffe14f', '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'],
  ['water', 'Water', '#5ac8ff', '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>'],
  ['school', 'School', '#ff9a5a', '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5l-6 3z"/>'],
  ['brand', 'Brandweer', '#ff5a4a', '<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-8z"/>'],
  ['zorg', 'Ziekenhuis', '#ff8ab0', '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>'],
  ['stadion', 'Stadion', '#c88aff', '<ellipse cx="12" cy="12" rx="10" ry="7"/><ellipse cx="12" cy="12" rx="5" ry="3" fill="#0a0a1a"/>'],
  ['sloop', 'Slopen', '#ff6a8a', '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>'],
]
var gereed = 'kijk', sleep = null, info = -1
function maakKnoppen() {
  var k = $('knoppen'); k.innerHTML = ''
  KNOPPEN.forEach(function (kn) {
    var b = document.createElement('button'), bw = B[kn[0]]
    b.dataset.g = kn[0]; b.style.setProperty('--k', kn[2])
    b.innerHTML = '<i><svg viewBox="0 0 24 24" fill="currentColor">' + kn[3] + '</svg></i>' + kn[1] + '<small></small>'
    b.onclick = function () { kiesGereed(kn[0]) }
    k.appendChild(b)
  })
  if (s) knoppenBij()
}
function knoppenBij() {
  if (!s) return
  Array.prototype.forEach.call($('knoppen').children, function (b) {
    var id = b.dataset.g, bw = B[id], slot = bw && bw.nodig && s.inwoners < bw.nodig
    b.classList.toggle('aan', id === gereed)
    b.querySelector('small').textContent = !bw ? '' : slot ? 'vanaf ' + bw.nodig : bw.prijs
    b.style.opacity = slot ? 0.45 : ''
  })
}
var TIPS = {
  kijk: 'Sleep om de kaart te verschuiven. Tik op een gebouw om te zien hoe het gaat.',
  weg: 'Sleep van het ene punt naar het andere om een weg te leggen. Over de rivier wordt het een brug.',
  wonen: 'Sleep een rechthoek naast de weg. Daar gaan mensen wonen.',
  winkel: 'Sleep een rechthoek naast de weg. Winkels geven werk en hebben klanten nodig.',
  industrie: 'Sleep een rechthoek naast de weg, niet te dicht bij huizen: fabrieken stinken.',
  park: 'Tik of sleep: parken maken de huizen eromheen blij.',
  stroom: 'Tik op een plek. Alles binnen 11 vakjes krijgt stroom.',
  water: 'Tik op een plek. Alles binnen 9 vakjes krijgt water.',
  school: 'Een school maakt de huizen in de buurt blijer.',
  brand: 'De brandweer blust branden in de buurt.',
  zorg: 'Een ziekenhuis maakt de huizen in de buurt blijer.',
  stadion: 'Een stadion maakt een groot deel van de stad blij.',
  sloop: 'Sleep over wat weg moet.',
}
function kiesGereed(id) {
  var bw = B[id]
  if (bw && bw.nodig && s.inwoners < bw.nodig) { G.niet(); melding(bw.naam + ' kun je bouwen vanaf ' + bw.nodig + ' inwoners.'); return }
  gereed = gereed === id && id !== 'kijk' ? 'kijk' : id; info = -1
  Geluid.klik(); knoppenBij(); onderTekst()
  if (gereed !== 'kijk' && !D.tipSlepen) { D.tipSlepen = true; D.bewaar(); melding('Tip: verschuif de kaart met twee vingers of met Kijken.') }
}
function onderTekst() {
  var u = $('uitleg')
  if (info >= 0) { u.innerHTML = infoTekst(info); return }
  if (gereed !== 'kijk') { u.textContent = TIPS[gereed]; return }
  var dl = SB.DOELEN[s.doel]
  u.innerHTML = dl ? '<b style="color:var(--goud)">Doel ' + (s.doel + 1) + ':</b> ' + dl.tekst + ' <span class="munt" style="color:var(--goud)">' + dl.bonus + '</span>' : 'Alle doelen gehaald! Bouw verder aan je droomstad.'
}
function infoTekst(i) {
  var c = s.cel[i], bw = B[c.t]
  if (c.t === 'water0') return 'De rivier. Een weg erover wordt een brug.'
  if (c.t === 'gras' || c.t === 'boom') return c.t === 'boom' ? 'Bomen. Hier kun je gewoon overheen bouwen.' : 'Leeg gras.'
  if (c.t === 'weg') return c.brug ? 'Een brug.' : 'Een weg. Huizen, winkels en industrie moeten ernaast liggen.'
  var t = '<b>' + bw.naam + '</b>'
  if (bw.zone) {
    var namen = { wonen: ['leeg', 'huisje', 'rijtjeshuis', 'flat'], winkel: ['leeg', 'winkeltje', 'winkel', 'kantoortoren'], industrie: ['leeg', 'werkplaats', 'fabriek', 'grote fabriek'] }
    t += ': ' + namen[c.t][c.lvl]
    if (c.t === 'wonen') t += ' · ' + SB.WONEN[c.lvl] + ' mensen · blij ' + SB.geluk(s, i)
    else t += ' · ' + (c.t === 'winkel' ? SB.WERK_W : SB.WERK_I)[c.lvl] + ' banen'
    var w = SB.waarom(s, i)
    if (w && w.length) t += '<br><span style="color:#ff8aa0">Groeit niet: ' + w.join(', ') + '</span>'
    else if (c.lvl < 3) t += '<br><span style="color:#8dff4f">Alles goed, dit groeit vanzelf.</span>'
  } else if (bw.bereik) t += ': helpt alles binnen ' + bw.bereik + ' vakjes.'
  if (c.vuur) t += '<br><span style="color:#ff8a3d">Brand! Bouw snel een brandweer in de buurt.</span>'
  return t
}
// welke vakjes het slepen raakt
function sleepVakjes() {
  if (!sleep) return []
  var a = sleep.van, b = sleep.naar
  if (gereed === 'weg') return SB.lijn(s, a[0], a[1], b[0], b[1])
  if (B[gereed] && (B[gereed].zone || gereed === 'park' || gereed === 'sloop')) return SB.rechthoek(s, a[0], a[1], b[0], b[1])
  return [b[1] * N + b[0]]
}
function vakVan(sx, sy) { var w = terug(sx, sy); var x = Math.floor(w[0]), y = Math.floor(w[1]); if (x < 0 || y < 0 || x >= N || y >= N) return null; return [x, y] }
function tekenSleep() {
  if (info >= 0) { lijnRuit(info, '#ffffff', 2.5) }
  if (!sleep) return
  var lijst = sleepVakjes(), k = SB.kostenVan(s, gereed, lijst)
  lijst.forEach(function (i) { var f = SB.magBouwen(s, gereed, i); lijnRuit(i, !f ? (gereed === 'sloop' ? '#ff6a8a' : '#8dff4f') : f === 'Niet genoeg geld' ? '#ffd23d' : 'rgba(255,80,100,0.6)', 2, true) })
  if (k.n && sleep.px) {
    var tx = sleep.px[0], ty = sleep.px[1] - 46, tekst = String(k.kosten), arm = k.kosten > s.geld
    ctx.font = '800 16px Outfit, system-ui'; var bw = ctx.measureText(tekst).width + 40
    ctx.fillStyle = 'rgba(16,18,44,0.9)'; NK.rondRect(ctx, tx - bw / 2, ty - 16, bw, 32, 16); ctx.fill()
    ctx.fillStyle = '#ffc83d'; ctx.beginPath(); ctx.arc(tx - bw / 2 + 16, ty, 8, 0, TAU); ctx.fill()
    ctx.fillStyle = arm ? '#ff8aa0' : '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(tekst, tx - bw / 2 + 30, ty + 1)
  }
}
function lijnRuit(i, kl, dik, vul) {
  var x = i % N, y = i / N | 0, a = iso(x, y), b = iso(x + 1, y), c = iso(x + 1, y + 1), d = iso(x, y + 1)
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath()
  if (vul) { ctx.fillStyle = NK.hexA(kl.charAt(0) === '#' ? kl : '#ff5070', 0.28); ctx.fill() }
  ctx.strokeStyle = kl; ctx.lineWidth = dik; ctx.stroke()
}
function voerSleepUit() {
  var lijst = sleepVakjes()
  if (!lijst.length) return
  var r = SB.bouwVeel(s, gereed, lijst)
  if (r.n) {
    if (gereed === 'sloop') G.sloop(); else if (gereed === 'weg') G.weg(); else G.bouw()
    lijst.forEach(function (i) { if (Math.random() < 0.5 || lijst.length < 6) { var p = iso(i % N + 0.5, (i / N | 0) + 0.5); fx.spat(p[0], p[1], 3, gereed === 'sloop' ? '#a8a0a0' : '#ffffff', 40, { duur: 0.5 }) } })
    var mid = sleep.px || [C.W / 2, C.H / 2]
    fx.tekst(mid[0], mid[1] - 30, '-' + r.kosten, '#ffc83d', 18)
    laagVersie++; s.vies = false
    SB.checkDoel(s).forEach(gebeurtenis)
    bewaar(); hudBij(); knoppenBij()
  } else { G.niet() }
  if (r.fout) melding(r.fout === 'Niet genoeg geld' ? 'Niet genoeg geld! Wacht tot er belasting binnenkomt.' : r.fout)
}

// ── aanraken: tikken, slepen, twee vingers en muis ──
var vingers = {}, aanraak = null
$('c').addEventListener('pointerdown', function (e) {
  Geluid.audio()
  vingers[e.pointerId] = [e.clientX, e.clientY]
  var ids = Object.keys(vingers)
  if (ids.length === 2) {
    var a = vingers[ids[0]], b = vingers[ids[1]]
    sleep = null
    aanraak = { twee: true, afstand: Math.hypot(a[0] - b[0], a[1] - b[1]), z: zoom, w0: terug((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) }
    return
  }
  var pan = e.button === 1 || e.button === 2 || gereed === 'kijk'
  aanraak = { x: e.clientX, y: e.clientY, px: panX, py: panY, pan: pan, verschoven: false }
  if (!pan) { var v = vakVan(e.clientX, e.clientY); if (v) { sleep = { van: v, naar: v, px: [e.clientX, e.clientY] }; info = -1 } }
})
window.addEventListener('pointermove', function (e) {
  if (!vingers[e.pointerId]) return
  vingers[e.pointerId] = [e.clientX, e.clientY]
  if (!aanraak) return
  var ids = Object.keys(vingers)
  if (aanraak.twee && ids.length === 2) {
    var a = vingers[ids[0]], b = vingers[ids[1]], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
    var f = Math.hypot(a[0] - b[0], a[1] - b[1]) / aanraak.afstand
    zoomNaar(aanraak.z * f, mx, my, aanraak.w0)
    return
  }
  var dx = e.clientX - aanraak.x, dy = e.clientY - aanraak.y
  if (Math.hypot(dx, dy) > 8) aanraak.verschoven = true
  if (aanraak.pan) { if (aanraak.verschoven) { panX = aanraak.px + dx; panY = aanraak.py + dy; begrens(); pasIn() } return }
  if (sleep) { var v = vakVan(e.clientX, e.clientY); if (v) sleep.naar = v; sleep.px = [e.clientX, e.clientY] }
})
function los(e) {
  delete vingers[e.pointerId]
  if (!aanraak) return
  var a = aanraak
  if (a.twee) { if (!Object.keys(vingers).length) aanraak = null; return }
  aanraak = null
  if (a.pan) {
    if (!a.verschoven && huidig === null) { var v = vakVan(e.clientX, e.clientY); info = v ? v[1] * N + v[0] : -1; if (v) Geluid.klik(); onderTekst() }
    return
  }
  if (sleep) { voerSleepUit(); sleep = null }
}
window.addEventListener('pointerup', los)
window.addEventListener('pointercancel', function (e) { delete vingers[e.pointerId]; aanraak = null; sleep = null })
$('c').addEventListener('contextmenu', function (e) { e.preventDefault() })
$('c').addEventListener('wheel', function (e) { e.preventDefault(); zoomOm(e.deltaY < 0 ? 1.15 : 0.87, e.clientX, e.clientY) }, { passive: false })
$('z-in').onclick = function () { zoomOm(1.35) }
$('z-uit').onclick = function () { zoomOm(1 / 1.35) }
$('z-net').onclick = function () { netwerk = !netwerk; this.classList.toggle('aan', netwerk); Geluid.klik(); melding(netwerk ? 'Blauw: stroom en water. Oranje: een van de twee mist. Rood: niets.' : 'Kaart met stroom en water uit.') }
window.addEventListener('keydown', function (e) {
  if (huidig !== null) return
  var stap = 40
  if (e.key === 'ArrowLeft') { panX += stap; begrens(); pasIn() }
  if (e.key === 'ArrowRight') { panX -= stap; begrens(); pasIn() }
  if (e.key === 'ArrowUp') { panY += stap; begrens(); pasIn() }
  if (e.key === 'ArrowDown') { panY -= stap; begrens(); pasIn() }
  if (e.key === 'Escape') { kiesGereed('kijk') }
  if (e.key === ' ') { e.preventDefault(); zetTempo(D.tempo ? 0 : 1) }
})

// ── tijd en gebeurtenissen ──
var tijd = 0, acc = 0, fx = NK.deeltjes(), bewaarKlok = 0, hudKlok = 0
function zetTempo(t) { D.tempo = t; D.bewaar(); Array.prototype.forEach.call($('tempo').children, function (b) { b.classList.toggle('aan', +b.dataset.t === t) }) }
Array.prototype.forEach.call($('tempo').children, function (b) { b.onclick = function () { Geluid.klik(); zetTempo(+b.dataset.t) } })
function gebeurtenis(e) {
  var p = e.i != null ? iso(e.i % N + 0.5, (e.i / N | 0) + 0.5, 0.5) : null
  if (e.t === 'groei') { if (Math.random() < 0.3) G.groei(); if (p && !D.rustig) fx.spat(p[0], p[1], 6, '#fff6cf', 50, { ster: true, duur: 0.6 }); laagVersie++ }
  if (e.t === 'krimp') { laagVersie++ }
  if (e.t === 'mijlpaal') { G.mijlpaal(); banner(e.naam + '!', 'Je stad groeit. Bonus: ' + e.bonus + ' munten'); fx.spat(C.W / 2, C.H * 0.3, 40, '#ffc83d', 260, { ster: true }); knoppenBij() }
  if (e.t === 'doel') { G.doel(); banner('Doel gehaald!', '+' + e.bonus + ' munten'); onderTekst() }
  if (e.t === 'brand') { G.brand(); melding(s.dekking.brand[e.i] ? 'Brand! De brandweer komt eraan.' : 'Brand! Bouw snel een brandweer in de buurt, anders brandt het af.'); laagVersie++ }
  if (e.t === 'geblust') { melding('De brandweer heeft een brand geblust.'); laagVersie++ }
  if (e.t === 'afgebrand') { melding('Een gebouw is afgebrand. Een brandweer had het kunnen redden.'); if (p) fx.spat(p[0], p[1], 14, '#5a5a6a', 80); laagVersie++ }
}
function banner(kop, tekst) { $('bannerkop').textContent = kop; $('bannertekst').textContent = tekst; $('banner').classList.add('aan'); clearTimeout(banner.t); banner.t = setTimeout(function () { $('banner').classList.remove('aan') }, 2600) }
function melding(t) { var m = $('melding'); m.textContent = t; m.classList.remove('aan'); void m.offsetWidth; m.classList.add('aan'); clearTimeout(melding.t); melding.t = setTimeout(function () { m.classList.remove('aan') }, 3400) }

function hudBij() {
  if (!s) return
  $('geld').textContent = s.geld
  $('inkomen').textContent = (s.inkomen >= 0 ? '+' : '') + (s.inkomen || 0) + '/dag'
  $('inkomen').style.color = s.inkomen < 0 ? '#ff8aa0' : 'var(--dim)'
  $('inwoners').textContent = s.inwoners
  $('geluk').textContent = s.geluk
  var bocht = (s.geluk - 50) / 50 * 4
  $('mond').setAttribute('d', 'M8 15q4 ' + bocht.toFixed(1) + ' 8 0')
  $('gelukpil').style.color = s.geluk >= 65 ? '#8dff4f' : s.geluk >= 40 ? '#ffd23d' : '#ff6a8a'
  ;['wonen', 'winkel', 'industrie'].forEach(function (k) { var v = s.vraag[k]; $('v-' + k).style.height = Math.max(3, (v + 1) / 2 * 20) + 'px'; $('v-' + k).style.opacity = v > 0.05 ? 1 : 0.4 })
  $('mijlnaam').textContent = SB.MIJLPALEN[s.mijlpaal].naam
}
function bewaar() { if (s && s === D.s) D.bewaar() }

// ── hoofdlus ──
var vorige = performance.now()
function frame(nu) {
  var dt = Math.min(0.05, (nu - vorige) / 1000); vorige = nu; tijd += dt
  ctx.setTransform(C.dpr, 0, 0, C.dpr, 0, 0)
  if (s) {
    var speelt = huidig === null && s === D.s
    if (speelt) {
      klok += dt
      acc += dt * D.tempo
      while (acc >= 1.4) { acc -= 1.4; SB.dag(s).forEach(gebeurtenis) }
      bewaarKlok += dt; if (bewaarKlok > 4) { bewaarKlok = 0; bewaar() }
      hudKlok += dt; if (hudKlok > 0.25) { hudKlok = 0; hudBij(); if (info >= 0) onderTekst() }
    } else klok += dt * 0.3
    nacht = D.rustig ? Math.min(nacht, berekenNacht()) : berekenNacht()
    autoLoop(dt); effecten(dt)
    tekenLucht()
    tekenLaag()
    ctx.drawImage(laag, 0, 0, C.W, C.H)
    tekenAutos()
    tekenEffecten()
    if (speelt) tekenSleep()
    fx.teken(ctx, dt)
  }
  requestAnimationFrame(frame)
}

// ── stadpaneel ──
function naarStad() {
  $('stadnaam').textContent = SB.MIJLPALEN[s.mijlpaal].naam
  var vol = SB.MIJLPALEN[s.mijlpaal + 1]
  var rijen = [['Inwoners', s.inwoners], ['Banen in winkels', s.banenW], ['Banen in industrie', s.banenI], ['Tevredenheid', s.geluk + ' van 100'], ['Geld per dag', (s.inkomen >= 0 ? '+' : '') + s.inkomen], ['Dag', s.dag]]
  if (vol) rijen.push(['Volgende mijlpaal', vol.naam + ' bij ' + vol.inwoners + ' inwoners'])
  $('stadlijst').innerHTML = rijen.map(function (r) { return '<div class="stat"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>' }).join('')
  $('belwaarde').textContent = s.belasting + '%'
  $('doellijst').innerHTML = SB.DOELEN.map(function (d, n) { var klaar = n < s.doel, nu = n === s.doel; return '<div class="doelrij' + (klaar ? ' klaar' : '') + (nu ? ' nu' : '') + '"><i>' + (klaar ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#071018" stroke-width="3.5" stroke-linecap="round"><path d="M5 12l5 5 9-10"/></svg>' : '') + '</i><span>' + d.tekst + '</span><span class="munt" style="margin-left:auto">' + d.bonus + '</span></div>' }).filter(function (x, n) { return n <= s.doel + 2 }).join('')
  toonScherm('stad')
}
$('mijlpaal').onclick = function () { Geluid.klik(); naarStad() }
$('bel-min').onclick = function () { SB.zetBelasting(s, s.belasting - 1); Geluid.klik(); bewaar(); naarStad() }
$('bel-plus').onclick = function () { SB.zetBelasting(s, s.belasting + 1); Geluid.klik(); bewaar(); naarStad() }
$('stadterug').onclick = function () { Geluid.klik(); toonScherm(null) }

// ── schermen ──
var huidig = 'menu'
function toonScherm(id) {
  huidig = id
  ;['menu', 'stad'].forEach(function (x) { $(x).classList.toggle('aan', x === id) })
  var inSpel = id === null
  $('top').classList.toggle('aan', inSpel); $('gereed').classList.toggle('aan', inSpel); $('zoom').classList.toggle('aan', inSpel)
  $('menutop').classList.toggle('aan', id === 'menu' && !BELONING)
  $('naarmenu').style.visibility = BELONING ? 'hidden' : ''
  if (inSpel) { hudBij(); onderTekst(); knoppenBij() }
}
function start() {
  if (!D.s && !D.uitlegGezien) { D.uitlegGezien = true; D.bewaar(); toonUitleg(start); return }
  if (!D.s) { D.s = SB.nieuw((Math.random() * 4294967296) >>> 0); D.bewaar() }
  s = D.s; SB.bereken(s); laagVersie++; autos = []
  gereed = 'kijk'; info = -1; zetTempo(D.tempo || 1)
  pasIn(); toonScherm(null)
  melding(s.dag ? 'Welkom terug in ' + SB.MIJLPALEN[s.mijlpaal].naam.toLowerCase() + '! Dag ' + s.dag + '.' : 'Welkom, burgemeester! Volg de doelen onderin.')
}
function toonMenu() {
  if (!s) { s = SB.nieuw(77); demoStad(s) }
  $('speel').textContent = D.s ? 'Verder bouwen' : 'Spelen'
  $('nieuw').classList.toggle('verborgen', !D.s)
  $('s-geluid').classList.toggle('aan', D.geluid); $('s-rustig').classList.toggle('aan', D.rustig)
  pasIn(); toonScherm('menu')
}
// een voorbeeldstadje achter het menu
function demoStad(d) {
  d.geld = 1e6
  for (var x = 2; x < 17; x++) { SB.bouw(d, 'weg', 8 * N + x); SB.bouw(d, 'weg', 14 * N + x) }
  for (var y = 4; y < 20; y++) { SB.bouw(d, 'weg', y * N + 6); SB.bouw(d, 'weg', y * N + 12) }
  SB.bouw(d, 'stroom', 2 * N + 2); SB.bouw(d, 'water', 2 * N + 4); SB.bouw(d, 'park', 10 * N + 9)
  for (var i = 0; i < N * N; i++) {
    var xx = i % N, yy = i / N | 0
    if (xx > 16 || yy < 4 || yy > 19 || d.cel[i].t !== 'gras' && d.cel[i].t !== 'boom' || !SB.aanWeg(d, i)) continue
    var soort = yy > 14 ? 'industrie' : xx > 12 ? 'winkel' : 'wonen'
    SB.bouw(d, soort, i); d.cel[i].lvl = 1 + (hash(i) * 3 | 0)
  }
  SB.bereken(d)
}
$('speel').onclick = function () { Geluid.klik(); start() }
$('nieuw').onclick = function () {
  if (!confirm('Weet je het zeker? Je stad begint dan helemaal opnieuw.')) return
  D.s = null; D.bewaar(); s = null; start()
}
$('terug').onclick = function () { Geluid.klik(); NK.naarOuder('stadsbouwer-terug') }
$('naarmenu').onclick = function () { Geluid.klik(); bewaar(); toonMenu() }
$('s-geluid').onclick = function () { D.geluid = !D.geluid; D.bewaar(); this.classList.toggle('aan', D.geluid); Geluid.klik() }
$('s-rustig').onclick = function () { D.rustig = !D.rustig; D.bewaar(); this.classList.toggle('aan', D.rustig); Geluid.klik() }
document.addEventListener('visibilitychange', function () { if (document.hidden) bewaar() })

// ── uitleg ──
function toonUitleg(klaar) {
  var vak = function (kl) { return function (g2) { g2.fillStyle = kl; g2.beginPath(); g2.moveTo(40, 16); g2.lineTo(66, 30); g2.lineTo(40, 44); g2.lineTo(14, 30); g2.closePath(); g2.fill() } }
  var icoon = function (pad, kl) { return function (g2) { g2.save(); g2.translate(16, 16); g2.scale(2, 2); g2.fillStyle = kl; g2.strokeStyle = kl; var p = new Path2D(pad); g2.fill(p); g2.restore() } }
  NK.uitleg([
    [function (g2) { g2.fillStyle = '#4c5164'; g2.beginPath(); g2.moveTo(12, 52); g2.lineTo(40, 24); g2.lineTo(68, 52); g2.lineTo(40, 66); g2.closePath(); g2.fill(); g2.strokeStyle = '#ffe68c'; g2.lineWidth = 2; g2.setLineDash([4, 4]); g2.beginPath(); g2.moveTo(26, 50); g2.lineTo(54, 50); g2.stroke() }, 'Kies Weg en sleep over het gras om een weg aan te leggen. Over de rivier wordt het een brug.'],
    [function (g2) { vak('#5be37a')(g2); g2.save(); g2.translate(0, 14); vak('#3fa8ff')(g2); g2.restore(); g2.save(); g2.translate(0, 28); vak('#ffd23d')(g2); g2.restore() }, 'Kies Wonen, Winkels of Industrie en sleep een rechthoek naast een weg. Daar komen vanzelf gebouwen.'],
    [icoon('M13 2L4 14h7l-1 8 9-12h-7z', '#ffe14f'), 'Gebouwen groeien alleen met stroom en water. Bouw stroom en een watertoren in de buurt. Met de bliksemknop rechts zie je waar ze bij kunnen.'],
    [function (g2) { [['#5be37a', 34], ['#3fa8ff', 20], ['#ffd23d', 12]].forEach(function (q, i) { g2.fillStyle = q[0]; g2.fillRect(22 + i * 14, 62 - q[1], 10, q[1]) }) }, 'De balkjes bovenin laten zien wat de stad nodig heeft: groen is wonen, blauw winkels, geel industrie. Hoe hoger, hoe meer vraag.'],
    [function (g2) { g2.strokeStyle = '#8dff4f'; g2.lineWidth = 4; g2.beginPath(); g2.arc(40, 40, 22, 0, 7); g2.stroke(); g2.beginPath(); g2.arc(40, 44, 11, 0.3, Math.PI - 0.3); g2.stroke(); g2.fillStyle = '#8dff4f'; g2.beginPath(); g2.arc(32, 34, 3, 0, 7); g2.arc(48, 34, 3, 0, 7); g2.fill() }, 'Parken, scholen en een ziekenhuis maken mensen blij. Een fabriek vlak naast huizen niet. Blije mensen bouwen grotere huizen en flats.'],
    [function (g2) { g2.fillStyle = '#ffc83d'; g2.beginPath(); g2.arc(40, 40, 20, 0, 7); g2.fill(); g2.fillStyle = '#e8a82a'; g2.beginPath(); g2.arc(40, 40, 13, 0, 7); g2.fill() }, 'Elke dag betalen mensen belasting. Wegen en gebouwen kosten onderhoud. Tik op de naam van je stad (rechtsboven) voor de belasting en je doelen.'],
    [function (g2) { NK.ster(g2, 40, 40, 24, '#ffd23d') }, 'Volg de doelen onderin. Elk doel en elke mijlpaal geeft extra geld.'],
    [icoon('M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z', '#c8d0ff'), 'Met Kijken verschuif je de kaart en tik je op een gebouw om te zien wat er mis is. Met twee vingers of het wieltje zoom je in.'],
    [icoon('M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-8z', '#ff5a4a'), 'Vanaf 500 inwoners kan er brand uitbreken. Zorg dat elk huis dicht bij een brandweer staat.'],
  ], klaar)
}
$('naaruitleg').onclick = function () { Geluid.klik(); toonUitleg() }

// ── start ──
maakKnoppen()
if (BELONING) start()
else { s = D.s; if (s) SB.bereken(s); toonMenu() }
requestAnimationFrame(frame)
})()
