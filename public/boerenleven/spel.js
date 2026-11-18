// Boerenleven: een boerderij op een eiland, schuin van boven bekeken (zoals
// Dierentuinbaas). Tekenen, besturing, winkel, dorp en schuur. Regels in kern.js.
(function () {
'use strict'
var $ = function (id) { return document.getElementById(id) }
var BELONING = NK.BELONING
var Geluid = NK.Geluid
var TAU = Math.PI * 2

// ── opslag: de hele boerderij, na elke actie en elke paar seconden ──
var D = NK.opslag('kk_pb', { s: null, zaad: null, geluid: true, rustig: false })
Geluid.zetAan(function () { return D.geluid })
var s = D.s

var G = {
  ploeg: function () { Geluid.ruis(0.12, 0.12, 500, 0.8) },
  zaai: function () { Geluid.toon(880, 0.06, 'triangle', 0.08); Geluid.toon(1100, 0.06, 'triangle', 0.06, 0.05) },
  water: function () { Geluid.ruis(0.3, 0.08, 2500, 0.6, 0, true) },
  oogst: function () { Geluid.toon(660, 0.1, 'triangle', 0.12); Geluid.toon(990, 0.14, 'triangle', 0.1, 0.07) },
  kip: function () { Geluid.toon(900, 0.06, 'square', 0.05); Geluid.toon(1200, 0.08, 'square', 0.04, 0.07) },
  koe: function () { Geluid.toon(140, 0.5, 'sawtooth', 0.06, 0, 110) },
  schaap: function () { Geluid.toon(420, 0.4, 'sawtooth', 0.04, 0, 380) },
  munt: function () { [988, 1319].forEach(function (f, i) { Geluid.toon(f, 0.1, 'triangle', 0.1, i * 0.06) }) },
  niet: function () { Geluid.toon(180, 0.1, 'sine', 0.1, 0, 140) },
  ochtend: function () { [523, 659, 784, 1047].forEach(function (f, i) { Geluid.toon(f, 0.25, 'sine', 0.07, i * 0.12) }) },
}

// ── het eiland: rooster van vakjes, de akker ligt in het midden ──
var GW = 18, GH = 14, FX = 2, FY = 4
var C = NK.canvas($('c'), function () { if (C) pasIn() })
var ctx = C.ctx, A = 30, OX = 0, OY = 0, zoom = 1, panX = 0, panY = 0
// schuin bekeken: x naar rechtsonder, y naar linksonder; h = hoogte (in vakjes)
function iso(x, y, h) { return [OX + (x - y) * A, OY + (x + y) * A * 0.5 - (h || 0) * A] }
function terug(sx, sy) { var u = (sx - OX) / A, v = (sy - OY) / (A * 0.5); return [(u + v) / 2, (v - u) / 2] }
function pasIn() {
  var boven = 70, onder = 100, bw = C.W - 20, bh = C.H - boven - onder
  var basis = Math.min(bw / (GW + GH), bh / ((GW + GH) * 0.5 + 1.2))
  A = basis * zoom
  var midx = C.W / 2, midy = boven + bh / 2
  OX = midx - (GW - GH) / 2 * A + panX
  OY = midy - (GW + GH) / 4 * A + panY
}

// ── kleuren per seizoen ──
var SEIZ = [
  { gras: ['#7ccf5a', '#6fc04f', '#88d866'], blad: ['#4fa840', '#68c254'], bloesem: '#ffc2e0', bloem: ['#ff8ab8', '#ffe066', '#ffffff'] },
  { gras: ['#62c24a', '#56b240', '#70d058'], blad: ['#3a9a3a', '#55b84a'], bloem: ['#ffd23d', '#ff6a5a', '#ffffff'] },
  { gras: ['#b8b04a', '#a8a03e', '#c4bc58'], blad: ['#e08a2a', '#f0aa3a'], bloem: ['#ff8a3d', '#c85a2a', '#ffd23d'] },
  { gras: ['#e8f0f8', '#dce6f0', '#f4f8fc'], blad: ['#5a7a6a', '#eef4fa'], bloem: ['#ffffff', '#cfe8ff', '#ffffff'], sneeuw: true },
]
function rng(z) { var a = z >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
// vaste versiering: bloemetjes, steentjes, graspollen
var DECOR = (function () {
  var R = rng(11), d = []
  for (var i = 0; i < 90; i++) {
    var x = R() * GW, y = R() * GH
    if (x > FX - 0.3 && x < FX + 12.3 && y > FY - 0.3 && y < FY + 8.3) continue
    if (x > 13.6 && y > 3.6 && y < 10.6) { if (R() < 0.6) continue }
    d.push({ x: x, y: y, s: R() < 0.55 ? 'pol' : R() < 0.75 ? 'bloem' : 'steen', k: R() * 3 | 0 })
  }
  return d
})()
var BOMEN = [[0.6, 1.2], [0.5, 4.5], [0.6, 7.6], [0.5, 10.6], [1.6, 12.8], [5.5, 13.2], [9.2, 13.1], [12.4, 12.9], [17.3, 1.4], [15.6, 0.6], [17.2, 3.0], [13.4, 0.5], [6.6, 0.4]]

// ── vormen ──
function ruit(g, x, y, kl) { var a = iso(x, y), b = iso(x + 1, y), c = iso(x + 1, y + 1), d = iso(x, y + 1); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fillStyle = kl; g.fill() }
function blok(g, x0, y0, x1, y1, h0, h1, boven, links, rechts) {
  // een doos van (x0,y0) tot (x1,y1), van hoogte h0 tot h1; links = voorkant langs y1, rechts = voorkant langs x1
  var p = function (x, y, h) { return iso(x, y, h) }
  var vl = [[p(x0, y1, h0), p(x1, y1, h0), p(x1, y1, h1), p(x0, y1, h1)], [p(x1, y0, h0), p(x1, y1, h0), p(x1, y1, h1), p(x1, y0, h1)], [p(x0, y0, h1), p(x1, y0, h1), p(x1, y1, h1), p(x0, y1, h1)]]
  ;[links, rechts, boven].forEach(function (kl, i) { if (!kl) return; var q = vl[i]; g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (var k = 1; k < 4; k++) g.lineTo(q[k][0], q[k][1]); g.closePath(); g.fillStyle = kl; g.fill() })
}
function cirkel(g, x, y, r, kl) { g.fillStyle = kl; g.beginPath(); g.arc(x, y, Math.max(0.3, r), 0, TAU); g.fill() }
function ellips(g, x, y, rx, ry, kl) { g.fillStyle = kl; g.beginPath(); g.ellipse(x, y, Math.max(0.3, rx), Math.max(0.3, ry), 0, 0, TAU); g.fill() }
function bol(g, x, y, r, kl, hl) {
  var gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r)
  gr.addColorStop(0, hl || '#ffffff'); gr.addColorStop(0.35, kl); gr.addColorStop(1, kl.charAt(0) === '#' ? donkerder(kl, -0.25) : kl)
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, Math.max(0.3, r), 0, TAU); g.fill()
}
function donkerder(hex, f) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255, t = f < 0 ? 0 : 255, p = Math.abs(f); return 'rgb(' + Math.round((t - r) * p + r) + ',' + Math.round((t - g) * p + g) + ',' + Math.round((t - b) * p + b) + ')' }

// ── de grond ──
function tekenGrond() {
  var sz = SEIZ[PB.seizoen(s)]
  // zijkanten van het eiland (aarde)
  var zij = function (pts, kl) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fillStyle = kl; ctx.fill() }
  var d = 0.9
  zij([iso(0, GH), iso(GW, GH), iso(GW, GH, -d), iso(0, GH, -d)], '#7a4e2e')
  zij([iso(GW, 0), iso(GW, GH), iso(GW, GH, -d), iso(GW, 0, -d)], '#5e3a22')
  for (var lg = 1; lg < 3; lg++) { ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = Math.max(1, A * 0.04); ctx.beginPath(); var a1 = iso(0, GH, -d * lg / 3), a2 = iso(GW, GH, -d * lg / 3), a3 = iso(GW, 0, -d * lg / 3); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.lineTo(a3[0], a3[1]); ctx.stroke() }
  // gras met een rand
  zij([iso(0, 0), iso(GW, 0), iso(GW, GH), iso(0, GH)], sz.gras[0])
  for (var y = 0; y < GH; y++) for (var x = 0; x < GW; x++) if ((x + y) % 2) ruit(ctx, x, y, NK.hexA(sz.gras[1], 0.35))
  var r1 = iso(0, GH), r2 = iso(GW, GH), r3 = iso(GW, 0)
  ctx.strokeStyle = sz.gras[2]; ctx.lineWidth = Math.max(2, A * 0.08); ctx.beginPath(); ctx.moveTo(r1[0], r1[1]); ctx.lineTo(r2[0], r2[1]); ctx.lineTo(r3[0], r3[1]); ctx.stroke()
  // pad van het huis naar de akker en de wei
  for (var px = 1; px < GW - 1; px++) pad(px, 3)
  for (var py = 0; py < 3; py++) pad(5, py)
  // vijver
  var vm = iso(15.6, 12.1)
  ellips(ctx, vm[0], vm[1] + A * 0.05, A * 1.85, A * 0.95, sz.sneeuw ? '#b8cce0' : '#3a6a3a')
  var wg = ctx.createRadialGradient(vm[0] - A * 0.5, vm[1] - A * 0.2, A * 0.1, vm[0], vm[1], A * 1.8)
  wg.addColorStop(0, sz.sneeuw ? '#eef6ff' : '#7fd0ff'); wg.addColorStop(1, sz.sneeuw ? '#a8c8e8' : '#2f7fd8')
  ellips(ctx, vm[0], vm[1], A * 1.7, A * 0.85, wg)
  if (!sz.sneeuw) for (var w = 0; w < 3; w++) { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; var ww = (tijd * 0.3 + w / 3) % 1; ctx.beginPath(); ctx.ellipse(vm[0] + (w - 1) * A * 0.5, vm[1] + (w % 2) * A * 0.2, A * 0.25 * (1 + ww), A * 0.1 * (1 + ww), 0, 0, TAU); ctx.globalAlpha = 1 - ww; ctx.stroke(); ctx.globalAlpha = 1 }
  // versiering
  DECOR.forEach(function (q) {
    var p = iso(q.x, q.y)
    if (q.s === 'pol') { ctx.strokeStyle = sz.gras[2]; ctx.lineWidth = Math.max(1, A * 0.04); ctx.beginPath(); for (var k = -1; k <= 1; k++) { ctx.moveTo(p[0] + k * A * 0.05, p[1]); ctx.lineTo(p[0] + k * A * 0.09, p[1] - A * 0.14) } ctx.stroke() }
    if (q.s === 'bloem') { cirkel(ctx, p[0], p[1] - A * 0.05, A * 0.05, sz.bloem[q.k]); cirkel(ctx, p[0], p[1] - A * 0.05, A * 0.02, '#ffe066') }
    if (q.s === 'steen') ellips(ctx, p[0], p[1], A * 0.08, A * 0.05, '#9a9aa8')
  })
}
function pad(x, y) { ruit(ctx, x + 0.08, y + 0.08, '#d8c08a'); var p = iso(x + 0.5, y + 0.5); ellips(ctx, p[0] - A * 0.15, p[1], A * 0.05, A * 0.025, '#c4a874'); ellips(ctx, p[0] + A * 0.18, p[1] + A * 0.05, A * 0.04, A * 0.02, '#c4a874') }

// ── de akker ──
function tekenAkker(i) {
  var v = s.velden[i], x = FX + i % PB.W, y = FY + (i / PB.W | 0)
  if (!PB.bruikbaar(s, i)) { ruit(ctx, x, y, 'rgba(30,60,20,0.12)'); return }
  if (v.t !== 'akker') return
  var nat = v.gewas && v.gewas.water, win = PB.seizoen(s) === 3
  var top = nat ? '#5a3a22' : win ? '#9a8a7a' : '#8a5a34'
  blok(ctx, x + 0.06, y + 0.06, x + 0.94, y + 0.94, 0, 0.09, top, nat ? '#3a2412' : '#5e3a1e', nat ? '#4a2e18' : '#6e4426')
  // voren
  ctx.strokeStyle = nat ? 'rgba(20,10,0,0.35)' : 'rgba(60,30,10,0.35)'; ctx.lineWidth = Math.max(1, A * 0.04)
  for (var r = 0.25; r < 0.9; r += 0.25) { var a = iso(x + 0.12, y + r, 0.09), b = iso(x + 0.88, y + r, 0.09); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke() }
  if (nat) { var gl = iso(x + 0.35, y + 0.3, 0.09); ellips(ctx, gl[0], gl[1], A * 0.12, A * 0.04, 'rgba(180,220,255,0.35)') }
}

// ── gewassen (met de kern-gegevens) ──
function tekenGewas(g, cx, cy, u, gewas, t) {
  var info = PB.GEWASSEN[gewas.id], f = gewas.groei / info.dagen, k = info.kleur, id = gewas.id
  var groen = id === 'ijsbes' ? '#5fd0c0' : '#4fbf3a', donker = id === 'ijsbes' ? '#2f8f8a' : '#2f8a2a'
  var zw = Math.sin(t * 2 + cx * 0.05) * u * 0.03
  if (gewas.dood) { g.strokeStyle = '#8a6a3a'; g.lineWidth = u * 0.06; g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + u * 0.1, cy - u * 0.25, cx + u * 0.25, cy - u * 0.15); g.moveTo(cx, cy); g.quadraticCurveTo(cx - u * 0.1, cy - u * 0.2, cx - u * 0.2, cy - u * 0.1); g.stroke(); return }
  if (f === 0) { ellips(g, cx - u * 0.1, cy, u * 0.05, u * 0.03, '#c9a26a'); ellips(g, cx + u * 0.12, cy + u * 0.03, u * 0.05, u * 0.03, '#c9a26a'); return }
  var blad = function (x, y, l, hoek, kl) { g.save(); g.translate(x, y); g.rotate(hoek); g.fillStyle = kl; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(l * 0.5, -l * 0.35, l, 0); g.quadraticCurveTo(l * 0.5, l * 0.25, 0, 0); g.fill(); g.restore() }
  if (f < 0.5) {
    g.strokeStyle = donker; g.lineWidth = u * 0.05; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + zw, cy - u * 0.2); g.stroke()
    blad(cx + zw, cy - u * 0.18, u * 0.2, -0.5, groen); blad(cx + zw, cy - u * 0.18, u * 0.2, Math.PI + 0.5, groen)
    return
  }
  var rijp = f >= 1, h = u * (0.45 + f * 0.35)
  if (id === 'mais' || id === 'zonnebloem') {
    g.strokeStyle = donker; g.lineWidth = u * 0.07; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + zw, cy - h * 1.4); g.stroke()
    for (var b = 0; b < 3; b++) blad(cx + zw * b / 3, cy - h * (0.35 + b * 0.3), u * 0.3, (b % 2 ? -0.3 : Math.PI + 0.3), b % 2 ? groen : donker)
    if (id === 'mais' && rijp) { g.save(); g.translate(cx + u * 0.08 + zw, cy - h * 0.9); g.rotate(0.3); ellips(g, 0, 0, u * 0.08, u * 0.2, k); for (var mk = -2; mk <= 2; mk++) cirkel(g, 0, mk * u * 0.06, u * 0.03, '#fff3a0'); blad(0, u * 0.15, u * 0.2, -1.4, groen); g.restore() }
    if (id === 'zonnebloem') { var hr = rijp ? u * 0.22 : u * 0.1; for (var bl = 0; bl < 12; bl++) { var hh = bl / 12 * TAU; ellips(g, cx + zw + Math.cos(hh) * hr * 0.9, cy - h * 1.45 + Math.sin(hh) * hr * 0.9, hr * 0.38, hr * 0.38, rijp ? k : '#b8e05a') } cirkel(g, cx + zw, cy - h * 1.45, hr * 0.6, rijp ? '#7a4a1a' : '#8ac83a') }
    return
  }
  if (id === 'pompoen') {
    for (var pb = 0; pb < 4; pb++) blad(cx, cy - u * 0.05, u * 0.32, pb * 1.6, pb % 2 ? groen : donker)
    if (rijp) { var pr = u * 0.28; [-0.5, 0, 0.5].forEach(function (o) { var pg = g.createRadialGradient(cx + o * pr - pr * 0.2, cy - pr * 0.9, pr * 0.1, cx + o * pr, cy - pr * 0.6, pr); pg.addColorStop(0, '#ffc070'); pg.addColorStop(1, '#e06a10'); g.fillStyle = pg; g.beginPath(); g.ellipse(cx + o * pr * 0.9, cy - pr * 0.6, pr * 0.55, pr * 0.62, 0, 0, TAU); g.fill() }); g.fillStyle = '#5a7a2a'; g.fillRect(cx - u * 0.02, cy - pr * 1.35, u * 0.05, u * 0.1) }
    else cirkel(g, cx, cy - u * 0.12, u * 0.1, '#c8d84a')
    return
  }
  if (id === 'radijs' || id === 'wortel' || id === 'aardappel') {
    for (var q = 0; q < 5; q++) blad(cx, cy - u * 0.05, u * (0.22 + f * 0.12), -Math.PI / 2 + (q - 2) * 0.4 + zw * 0.5, q % 2 ? groen : donker)
    if (rijp) { if (id === 'aardappel') { ellips(g, cx - u * 0.12, cy + u * 0.02, u * 0.1, u * 0.07, k); ellips(g, cx + u * 0.1, cy + u * 0.04, u * 0.09, u * 0.06, k) } else { var rg = g.createLinearGradient(cx, cy - u * 0.1, cx, cy + u * 0.12); rg.addColorStop(0, k); rg.addColorStop(1, donkerder(k, -0.2)); g.fillStyle = rg; g.beginPath(); g.ellipse(cx, cy, u * 0.1, u * 0.08, 0, 0, TAU); g.fill(); cirkel(g, cx - u * 0.03, cy - u * 0.02, u * 0.02, 'rgba(255,255,255,0.6)') } }
    return
  }
  // struik met vruchtjes (aardbei, tomaat, druif, boerenkool, ijsbes)
  var sr = u * (0.2 + f * 0.12)
  bol(g, cx, cy - sr * 0.8, sr, groen, '#b8f08a'); bol(g, cx - sr * 0.6, cy - sr * 0.45, sr * 0.7, donker, groen); bol(g, cx + sr * 0.6, cy - sr * 0.5, sr * 0.72, groen, '#b8f08a')
  if (id === 'boerenkool') { for (var kk = 0; kk < 5; kk++) blad(cx, cy - sr, sr * 1.1, kk * 1.25, kk % 2 ? '#2f7a4a' : '#4f9a5a'); return }
  if (rijp) {
    var vr = id === 'druif' ? u * 0.05 : u * 0.07
    var plekken = id === 'druif' ? [[-0.3, -0.6], [-0.2, -0.45], [-0.35, -0.4], [0.3, -0.7], [0.4, -0.55], [0.25, -0.5]] : [[-0.4, -0.7], [0.35, -0.9], [0.1, -0.5], [0.5, -0.45], [-0.15, -1.05]]
    plekken.forEach(function (q) { bol(g, cx + q[0] * sr * 1.6, cy + q[1] * sr * 1.4, vr, k, '#ffffff') })
    if (id === 'ijsbes') { g.save(); g.globalCompositeOperation = 'lighter'; NK.vlek(g, cx, cy - sr, sr * 1.6, '#7fe8ff', 0.3 + Math.sin(t * 3) * 0.1); g.restore() }
  }
}

// ── gebouwen, bomen, hekken ──
function huis(sz) {
  var x0 = 1.2, y0 = 0.4, x1 = 4.2, y1 = 2.6, h = 1.15
  schaduw(x0, y0, x1, y1)
  blok(ctx, x0, y0, x1, y1, 0, h, null, '#f2e6d0', '#d8c8aa')
  // ramen en deur
  raam(x0 + 0.5, y1, h * 0.5, 'l'); raam(x0 + 2.3, y1, h * 0.5, 'l'); raam(x1, y0 + 0.6, h * 0.5, 'r')
  deur(x0 + 1.4, y1, '#8a5a32')
  // dak
  var nok0 = iso(x0 - 0.1, (y0 + y1) / 2, h + 0.95), nok1 = iso(x1 + 0.1, (y0 + y1) / 2, h + 0.95)
  var a = iso(x0 - 0.1, y1 + 0.15, h), b = iso(x1 + 0.1, y1 + 0.15, h), c = iso(x1 + 0.1, y0 - 0.15, h)
  vlak([a, b, nok1, nok0], '#d0504a'); vlak([b, c, nok1], '#a83a36')
  for (var p = 0.15; p < 1; p += 0.2) { var l0 = lerp(a, nok0, p), l1 = lerp(b, nok1, p); ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l0[0], l0[1]); ctx.lineTo(l1[0], l1[1]); ctx.stroke() }
  // schoorsteen met rook
  var sc = iso(x1 - 0.7, y0 + 0.6, h + 0.6); blok(ctx, x1 - 0.85, y0 + 0.45, x1 - 0.55, y0 + 0.75, h + 0.3, h + 1.15, '#8a5a4a', '#7a4a3a', '#6a3a2a')
  rookBron = iso(x1 - 0.7, y0 + 0.6, h + 1.2)
  void sc
}
var rookBron = null
function schuur() {
  var x0 = 9.2, y0 = 0.3, x1 = 12.6, y1 = 2.6, h = 1.3
  schaduw(x0, y0, x1, y1)
  blok(ctx, x0, y0, x1, y1, 0, h, null, '#c23a32', '#a02a24')
  // planken
  for (var q = x0 + 0.25; q < x1; q += 0.25) { var a = iso(q, y1, 0), b = iso(q, y1, h); ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke() }
  // grote deur met wit kruis
  var d0 = iso(x0 + 1.1, y1, 0), d1 = iso(x0 + 2.3, y1, 0), d2 = iso(x0 + 2.3, y1, 0.95), d3 = iso(x0 + 1.1, y1, 0.95)
  vlak([d0, d1, d2, d3], '#7a1e18'); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, A * 0.05)
  ctx.beginPath(); ctx.moveTo(d0[0], d0[1]); ctx.lineTo(d1[0], d1[1]); ctx.lineTo(d2[0], d2[1]); ctx.lineTo(d3[0], d3[1]); ctx.closePath(); ctx.moveTo(d0[0], d0[1]); ctx.lineTo(d2[0], d2[1]); ctx.moveTo(d1[0], d1[1]); ctx.lineTo(d3[0], d3[1]); ctx.stroke()
  // dak
  var nok0 = iso(x0 - 0.1, (y0 + y1) / 2, h + 1.0), nok1 = iso(x1 + 0.1, (y0 + y1) / 2, h + 1.0)
  var a2 = iso(x0 - 0.1, y1 + 0.15, h), b2 = iso(x1 + 0.1, y1 + 0.15, h), c2 = iso(x1 + 0.1, y0 - 0.15, h)
  vlak([a2, b2, nok1, nok0], PB.seizoen(s) === 3 ? '#eef4fa' : '#5a3a2a'); vlak([b2, c2, nok1], PB.seizoen(s) === 3 ? '#d8e4f0' : '#45291c')
  raamLicht.push(iso(x0 + 1.7, y1, 0.5))
}
function put() {
  var c = iso(7.5, 1.4)
  schaduwRond(7.5, 1.4, 0.45)
  ellips(ctx, c[0], c[1] - A * 0.05, A * 0.42, A * 0.2, '#8a8a9a'); ellips(ctx, c[0], c[1] - A * 0.32, A * 0.42, A * 0.2, '#a8a8b8'); ctx.fillStyle = '#8a8a9a'; ctx.fillRect(c[0] - A * 0.42, c[1] - A * 0.32, A * 0.84, A * 0.27)
  ellips(ctx, c[0], c[1] - A * 0.32, A * 0.32, A * 0.14, '#2a4a8a')
  ctx.fillStyle = '#6b4426'; ctx.fillRect(c[0] - A * 0.38, c[1] - A * 0.95, A * 0.06, A * 0.65); ctx.fillRect(c[0] + A * 0.32, c[1] - A * 0.95, A * 0.06, A * 0.65)
  ctx.fillStyle = '#b8483a'; ctx.beginPath(); ctx.moveTo(c[0] - A * 0.55, c[1] - A * 0.88); ctx.lineTo(c[0], c[1] - A * 1.25); ctx.lineTo(c[0] + A * 0.55, c[1] - A * 0.88); ctx.closePath(); ctx.fill()
}
function lantaarn(x, y) {
  var c = iso(x, y)
  ctx.fillStyle = '#3a3a4a'; ctx.fillRect(c[0] - A * 0.03, c[1] - A * 1.1, A * 0.06, A * 1.1)
  ctx.fillStyle = '#2a2a3a'; ctx.fillRect(c[0] - A * 0.1, c[1] - A * 1.25, A * 0.2, A * 0.18)
  lampen.push([c[0], c[1] - A * 1.15])
  cirkel(ctx, c[0], c[1] - A * 1.16, A * 0.06, nachtDonker() > 0.2 ? '#fff0b0' : '#e8e0c8')
}
function brievenbus() {
  var c = iso(14.5, 2.4)
  ctx.fillStyle = '#6b4426'; ctx.fillRect(c[0] - A * 0.03, c[1] - A * 0.6, A * 0.06, A * 0.6)
  blok(ctx, 14.35, 2.25, 14.65, 2.55, 0.55, 0.78, '#5a8aff', '#3f6fd8', '#2f5ab8')
  ctx.fillStyle = '#ff3d3d'; ctx.fillRect(c[0] + A * 0.12, c[1] - A * 0.85, A * 0.04, A * 0.14)
}
function boom(x, y, i) {
  var sz = SEIZ[PB.seizoen(s)], c = iso(x, y)
  schaduwRond(x, y, 0.55)
  ctx.fillStyle = '#6b4426'; ctx.fillRect(c[0] - A * 0.08, c[1] - A * 0.7, A * 0.16, A * 0.7)
  var r = A * (0.55 + (i % 3) * 0.08)
  bol(ctx, c[0], c[1] - A * 1.05, r, sz.blad[0], sz.blad[1])
  bol(ctx, c[0] - r * 0.45, c[1] - A * 0.85, r * 0.7, sz.blad[0], sz.blad[1])
  bol(ctx, c[0] + r * 0.5, c[1] - A * 0.9, r * 0.65, sz.blad[0], sz.blad[1])
  if (sz.bloesem) for (var b = 0; b < 6; b++) cirkel(ctx, c[0] + Math.cos(b * 2.1 + i) * r * 0.7, c[1] - A * 1.05 + Math.sin(b * 1.7 + i) * r * 0.5, A * 0.06, sz.bloesem)
  if (sz.sneeuw) ellips(ctx, c[0], c[1] - A * 1.05 - r * 0.6, r * 0.7, r * 0.28, '#ffffff')
}
function hekLijn(x0, y0, x1, y1) {
  var n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 0.5)
  var top = [], ond = []
  for (var i = 0; i <= n; i++) {
    var x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n, a = iso(x, y), b = iso(x, y, 0.32)
    ctx.strokeStyle = '#8a5a32'; ctx.lineWidth = Math.max(1.5, A * 0.06); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
    top.push(b); ond.push(iso(x, y, 0.16))
  }
  ctx.strokeStyle = '#c99a5a'; ctx.lineWidth = Math.max(1.5, A * 0.05)
  ;[top, ond].forEach(function (rij) { ctx.beginPath(); rij.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]) }); ctx.stroke() })
}
function raam(x, y, h, kant) {
  var p = kant === 'l' ? [iso(x, y, h - 0.2), iso(x + 0.45, y, h - 0.2), iso(x + 0.45, y, h + 0.15), iso(x, y, h + 0.15)] : [iso(x, y, h - 0.2), iso(x, y + 0.45, h - 0.2), iso(x, y + 0.45, h + 0.15), iso(x, y, h + 0.15)]
  vlak(p, nachtDonker() > 0.2 ? '#ffd88a' : '#8ac8ff')
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, A * 0.04); ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); ctx.lineTo(p[1][0], p[1][1]); ctx.lineTo(p[2][0], p[2][1]); ctx.lineTo(p[3][0], p[3][1]); ctx.closePath(); ctx.stroke()
  raamLicht.push(lerp(p[0], p[2], 0.5))
}
function deur(x, y, kl) { vlak([iso(x, y, 0), iso(x + 0.45, y, 0), iso(x + 0.45, y, 0.75), iso(x, y, 0.75)], kl); var k = iso(x + 0.36, y, 0.38); cirkel(ctx, k[0], k[1], A * 0.03, '#ffd23d') }
function vlak(pts, kl) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fillStyle = kl; ctx.fill() }
function lerp(a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f] }
function schaduw(x0, y0, x1, y1) { vlak([iso(x0 + 0.2, y1, 0), iso(x1 + 0.2, y1, 0), iso(x1 + 0.4, y1 + 0.35, 0), iso(x0 + 0.4, y1 + 0.35, 0)], 'rgba(0,0,0,0.15)') }
function schaduwRond(x, y, r) { var c = iso(x + 0.1, y + 0.1); ellips(ctx, c[0], c[1], A * r * 1.2, A * r * 0.55, 'rgba(0,0,0,0.16)') }

// ── dieren en de boer ──
var dierPlek = []
function dierLoop(dt) {
  if (!s) return
  while (dierPlek.length < s.dieren.length) dierPlek.push({ x: 14.6 + Math.random() * 2.6, y: 4.6 + Math.random() * 5, doel: null, kijk: 1, wacht: 0 })
  dierPlek.length = s.dieren.length
  dierPlek.forEach(function (d) {
    if (d.wacht > 0) { d.wacht -= dt; return }
    if (!d.doel) d.doel = { x: 14.5 + Math.random() * 2.9, y: 4.5 + Math.random() * 5.6 }
    var dx = d.doel.x - d.x, dy = d.doel.y - d.y, l = Math.hypot(dx, dy)
    if (l < 0.05) { d.doel = null; d.wacht = 1 + Math.random() * 3; return }
    d.kijk = (dx - dy) > 0 ? 1 : -1; d.x += dx / l * dt * 0.45; d.y += dy / l * dt * 0.45
  })
}
function tekenDier(soort, x, y, kijk, loopt) {
  var c = iso(x, y), u = A, st = loopt ? Math.sin(tijd * 12) * u * 0.03 : 0
  ellips(ctx, c[0], c[1], u * 0.3, u * 0.12, 'rgba(0,0,0,0.18)')
  ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(kijk, 1)
  if (soort === 'kip') {
    ctx.fillStyle = '#ffb000'; ctx.fillRect(-u * 0.06, -u * 0.08 + st, u * 0.025, u * 0.08); ctx.fillRect(u * 0.03, -u * 0.08 - st, u * 0.025, u * 0.08)
    bol(ctx, 0, -u * 0.2, u * 0.16, '#f4f0e8', '#ffffff'); bol(ctx, u * 0.13, -u * 0.36, u * 0.09, '#f4f0e8', '#ffffff')
    ctx.fillStyle = '#e83a3a'; ctx.beginPath(); ctx.arc(u * 0.13, -u * 0.46, u * 0.04, 0, TAU); ctx.arc(u * 0.17, -u * 0.44, u * 0.035, 0, TAU); ctx.fill()
    ctx.fillStyle = '#ffb000'; ctx.beginPath(); ctx.moveTo(u * 0.21, -u * 0.37); ctx.lineTo(u * 0.29, -u * 0.34); ctx.lineTo(u * 0.21, -u * 0.31); ctx.fill()
    cirkel(ctx, u * 0.16, -u * 0.38, u * 0.018, '#14142a')
    ellips(ctx, -u * 0.13, -u * 0.25, u * 0.08, u * 0.05, '#e8e0d0')
  } else if (soort === 'schaap') {
    ctx.fillStyle = '#3a3a3a'; [-0.12, -0.04, 0.06, 0.14].forEach(function (q, i) { ctx.fillRect(q * u, -u * 0.12 + (i % 2 ? st : -st), u * 0.035, u * 0.12) })
    ;[[-0.12, -0.28], [0, -0.32], [0.12, -0.28], [-0.06, -0.2], [0.06, -0.2], [0, -0.38]].forEach(function (q) { bol(ctx, q[0] * u, q[1] * u, u * 0.12, '#f4f0e8', '#ffffff') })
    ellips(ctx, u * 0.24, -u * 0.32, u * 0.08, u * 0.1, '#3a3a3a'); cirkel(ctx, u * 0.27, -u * 0.35, u * 0.015, '#ffffff')
  } else {
    ctx.fillStyle = '#e8e4dc'; [-0.18, -0.08, 0.1, 0.2].forEach(function (q, i) { ctx.fillRect(q * u, -u * 0.18 + (i % 2 ? st : -st), u * 0.05, u * 0.18) })
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -u * 0.3, u * 0.3, u * 0.17, 0, 0, TAU); ctx.fill()
    ellips(ctx, -u * 0.1, -u * 0.32, u * 0.08, u * 0.06, '#1a1a1a'); ellips(ctx, u * 0.12, -u * 0.26, u * 0.06, u * 0.05, '#1a1a1a')
    bol(ctx, u * 0.33, -u * 0.4, u * 0.11, '#ffffff', '#ffffff'); ellips(ctx, u * 0.4, -u * 0.36, u * 0.06, u * 0.045, '#ffb3c8')
    ctx.fillStyle = '#d8c8a8'; ctx.fillRect(u * 0.28, -u * 0.55, u * 0.025, u * 0.06); ctx.fillRect(u * 0.36, -u * 0.55, u * 0.025, u * 0.06)
    cirkel(ctx, u * 0.34, -u * 0.43, u * 0.018, '#14142a')
  }
  ctx.restore()
}
var boer = { x: 5.5, y: 2.8, kijk: 1, loop: 0, werk: 0, gereedschap: null, rij: [] }
function tekenBoer() {
  var c = iso(boer.x, boer.y), u = A, st = boer.loop ? Math.sin(tijd * 12) * u * 0.04 : 0, k = boer.kijk
  ellips(ctx, c[0], c[1], u * 0.22, u * 0.09, 'rgba(0,0,0,0.2)')
  ctx.save(); ctx.translate(c[0], c[1])
  // benen en laarzen
  ctx.fillStyle = '#2f4a8a'; ctx.fillRect(-u * 0.08, -u * 0.32 + st, u * 0.07, u * 0.28); ctx.fillRect(u * 0.02, -u * 0.32 - st, u * 0.07, u * 0.28)
  ctx.fillStyle = '#5a3a22'; ctx.fillRect(-u * 0.09, -u * 0.06 + st, u * 0.09, u * 0.06); ctx.fillRect(u * 0.01, -u * 0.06 - st, u * 0.09, u * 0.06)
  // lijf: geruit hemd en tuinbroek
  NK.rondRect(ctx, -u * 0.14, -u * 0.62, u * 0.28, u * 0.34, u * 0.08); ctx.fillStyle = '#e85a4a'; ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-u * 0.14, -u * 0.52, u * 0.28, u * 0.02); ctx.fillRect(-u * 0.04, -u * 0.62, u * 0.02, u * 0.34)
  NK.rondRect(ctx, -u * 0.13, -u * 0.46, u * 0.26, u * 0.2, u * 0.05); ctx.fillStyle = '#3f6fd8'; ctx.fill()
  ctx.fillStyle = '#3f6fd8'; ctx.fillRect(-u * 0.1, -u * 0.6, u * 0.04, u * 0.15); ctx.fillRect(u * 0.06, -u * 0.6, u * 0.04, u * 0.15)
  // armen
  var arm = boer.werk > 0 ? Math.sin(boer.werk * 20) * u * 0.06 : 0
  ctx.fillStyle = '#e85a4a'; ctx.save(); ctx.translate(k * u * 0.16, -u * 0.55); ctx.rotate(k * (0.3 + arm / u * 4)); ctx.fillRect(-u * 0.03, 0, u * 0.06, u * 0.2); cirkel(ctx, 0, u * 0.21, u * 0.035, '#f4c9a0'); ctx.restore()
  // hoofd
  bol(ctx, 0, -u * 0.74, u * 0.13, '#f4c9a0', '#ffe8d0')
  cirkel(ctx, k * u * 0.05, -u * 0.75, u * 0.018, '#14142a'); ellips(ctx, k * u * 0.08, -u * 0.7, u * 0.03, u * 0.018, 'rgba(255,120,120,0.5)')
  // strohoed
  ellips(ctx, 0, -u * 0.82, u * 0.24, u * 0.07, '#e8c45a'); ellips(ctx, 0, -u * 0.88, u * 0.12, u * 0.08, '#e8c45a'); ctx.fillStyle = '#c84a3a'; ctx.fillRect(-u * 0.12, -u * 0.87, u * 0.24, u * 0.025)
  // gereedschap
  if (boer.werk > 0 && boer.gereedschap) {
    var gx = k * u * 0.2, gy = -u * 0.35 + arm
    if (boer.gereedschap === 'schoffel') { ctx.strokeStyle = '#8a5a32'; ctx.lineWidth = u * 0.04; ctx.beginPath(); ctx.moveTo(gx, gy - u * 0.3); ctx.lineTo(gx + k * u * 0.15, gy + u * 0.15); ctx.stroke(); ctx.fillStyle = '#9aa0b0'; ctx.fillRect(gx + k * u * 0.1, gy + u * 0.12, k * u * 0.14, u * 0.06) }
    if (boer.gereedschap === 'gieter') { NK.rondRect(ctx, gx - u * 0.08, gy - u * 0.06, u * 0.16, u * 0.13, u * 0.03); ctx.fillStyle = '#5a9ad8'; ctx.fill(); ctx.strokeStyle = '#5a9ad8'; ctx.lineWidth = u * 0.03; ctx.beginPath(); ctx.moveTo(gx + k * u * 0.08, gy); ctx.lineTo(gx + k * u * 0.2, gy - u * 0.06); ctx.stroke(); if (Math.floor(tijd * 12) % 2) cirkel(ctx, gx + k * u * 0.22, gy + u * 0.02, u * 0.02, '#9ad0ff') }
    if (boer.gereedschap === 'zaad') { NK.rondRect(ctx, gx - u * 0.06, gy - u * 0.08, u * 0.12, u * 0.15, u * 0.02); ctx.fillStyle = '#e8d6b0'; ctx.fill() }
    if (boer.gereedschap === 'mand') { NK.rondRect(ctx, gx - u * 0.1, gy - u * 0.04, u * 0.2, u * 0.12, u * 0.03); ctx.fillStyle = '#a8784a'; ctx.fill(); ctx.strokeStyle = '#a8784a'; ctx.lineWidth = u * 0.02; ctx.beginPath(); ctx.arc(gx, gy - u * 0.04, u * 0.08, Math.PI, 0); ctx.stroke() }
  }
  ctx.restore()
}
function gereedschapVoor(i) {
  var v = s.velden[i]
  if (!PB.bruikbaar(s, i)) return null
  if (v.t === 'gras') return 'schoffel'
  if (!v.gewas) return 'zaad'
  if (v.gewas.dood) return 'schoffel'
  if (v.gewas.groei >= PB.GEWASSEN[v.gewas.id].dagen) return 'mand'
  return 'gieter'
}
function taakPlek(t) {
  if (t.soort === 'veld') return [FX + t.i % PB.W + 0.5, FY + (t.i / PB.W | 0) + 1.05]
  var d = dierPlek[t.n]
  return d ? [d.x - 0.45, d.y + 0.15] : [boer.x, boer.y]
}
function boerLoop(dt) {
  if (boer.werk > 0) { boer.werk -= dt; if (boer.werk <= 0) { var t = boer.bezig; boer.bezig = null; if (t) voerUit(t) } return }
  var taak = boer.rij[0]
  if (!taak) { boer.loop = 0; return }
  var doel = taakPlek(taak), dx = doel[0] - boer.x, dy = doel[1] - boer.y, l = Math.hypot(dx, dy)
  if (l < 0.05) {
    boer.rij.shift(); boer.loop = 0
    boer.gereedschap = taak.soort === 'veld' ? gereedschapVoor(taak.i) : 'mand'
    boer.werk = taak.soort === 'veld' ? 0.32 : 0.2; boer.bezig = taak
    return
  }
  var v = Math.min(l, dt * 2.6)
  boer.x += dx / l * v; boer.y += dy / l * v; boer.loop = 1
  if (Math.abs(dx - dy) > 0.02) boer.kijk = (dx - dy) > 0 ? 1 : -1
}

// ── licht van de dag ──
function nachtDonker() {
  if (!s) return 0
  var t = s.tijd
  if (t < 0.2) return 0.58
  if (t < 0.3) return 0.58 * (1 - (t - 0.2) / 0.1)
  if (t < 0.72) return 0
  if (t < 0.85) return 0.58 * (t - 0.72) / 0.13
  return 0.58
}
var raamLicht = [], lampen = []
function tekenLucht() {
  var dk = nachtDonker(), t = s ? s.tijd : 0.5
  var boven = dk > 0.3 ? '#0a0c2a' : t < 0.32 ? '#ff9ac8' : t > 0.66 ? '#ff8a4a' : '#5aa8ff'
  var onder = dk > 0.3 ? '#1a1650' : t < 0.32 ? '#ffd8b0' : t > 0.66 ? '#ffc070' : '#bfe4ff'
  var gr = ctx.createLinearGradient(0, 0, 0, C.H)
  gr.addColorStop(0, boven); gr.addColorStop(1, onder)
  ctx.fillStyle = gr; ctx.fillRect(0, 0, C.W, C.H)
  if (dk > 0.15) {
    ctx.globalAlpha = Math.min(1, dk * 1.6)
    for (var i = 0; i < 80; i++) { ctx.globalAlpha = Math.min(1, dk * 1.6) * (0.4 + Math.sin(tijd * 2 + i) * 0.3); ctx.fillStyle = '#ffffff'; ctx.fillRect((i * 137.7) % C.W, (i * 71.3) % (C.H * 0.6), 2, 2) }
    ctx.globalAlpha = 1
    NK.vlek(ctx, C.W * 0.82, C.H * 0.14, Math.min(C.W, C.H) * 0.1, '#fff6d8', dk * 0.6); cirkel(ctx, C.W * 0.82, C.H * 0.14, Math.min(C.W, C.H) * 0.035, '#fff6d8')
  } else {
    NK.vlek(ctx, C.W * 0.85, C.H * 0.12, Math.min(C.W, C.H) * 0.25, '#fff6c0', 0.55)
    // wolken
    for (var w = 0; w < 4; w++) { var wx = ((tijd * 10 + w * C.W * 0.33) % (C.W + 300)) - 150, wy = C.H * (0.08 + (w % 3) * 0.07); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(wx, wy, 60, 16, 0, 0, TAU); ctx.ellipse(wx + 34, wy - 10, 34, 18, 0, 0, TAU); ctx.ellipse(wx - 28, wy - 6, 26, 13, 0, 0, TAU); ctx.fill() }
  }
}

// ── weer en sfeer ──
var weer = [], rook = []
function sfeer(dt) {
  var sz = PB.seizoen(s), dk = nachtDonker()
  if (!D.rustig) {
    var soort = sz === 3 ? 'sneeuw' : sz === 2 ? 'blad' : sz === 0 ? 'bloesem' : (dk > 0.3 ? 'vuurvlieg' : null)
    if (soort && weer.length < 45 && Math.random() < 0.5) weer.push({ x: Math.random() * C.W, y: soort === 'vuurvlieg' ? C.H * (0.3 + Math.random() * 0.5) : -6, s: soort, t: 0, f: Math.random() * 6 })
  }
  weer = weer.filter(function (w) {
    w.t += dt
    if (w.s === 'vuurvlieg') { w.x += Math.sin(w.t + w.f) * dt * 20; w.y += Math.cos(w.t * 0.7 + w.f) * dt * 15; return w.t < 6 }
    w.y += dt * (w.s === 'sneeuw' ? 40 : 55); w.x += Math.sin(w.t * 2 + w.f) * dt * 30
    return w.y < C.H + 10
  })
  if (rookBron && Math.random() < dt * 4) rook.push({ x: rookBron[0], y: rookBron[1], t: 0 })
  rook = rook.filter(function (r) { r.t += dt; r.y -= dt * A * 0.6; r.x += dt * A * (0.2 + Math.sin(r.t * 2) * 0.2); return r.t < 3 })
}
function tekenWeer() {
  rook.forEach(function (r) { ctx.fillStyle = 'rgba(230,230,240,' + (0.4 * (1 - r.t / 3)) + ')'; ctx.beginPath(); ctx.arc(r.x, r.y, A * (0.08 + r.t * 0.08), 0, TAU); ctx.fill() })
  weer.forEach(function (w) {
    if (w.s === 'sneeuw') cirkel(ctx, w.x, w.y, 2.4, '#ffffff')
    else if (w.s === 'blad') { ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(w.t * 3); ellips(ctx, 0, 0, 4, 2, Math.floor(w.f) % 2 ? '#e0702a' : '#c2502a'); ctx.restore() }
    else if (w.s === 'bloesem') ellips(ctx, w.x, w.y, 2.5, 1.6, '#ffc8e4')
    else { ctx.save(); ctx.globalCompositeOperation = 'lighter'; NK.vlek(ctx, w.x, w.y, 7, '#d8ff6a', 0.5 + Math.sin(w.t * 4 + w.f) * 0.4); ctx.restore() }
  })
}

// ── de hele wereld tekenen ──
var tijd = 0, fx = NK.deeltjes(), doelFlits = []
function tekenWereld(dt) {
  raamLicht = []; lampen = []
  tekenLucht()
  tekenGrond()
  for (var i = 0; i < PB.W * PB.H; i++) tekenAkker(i)
  // alles met hoogte, van achter naar voor
  var lijst = []
  var voeg = function (diepte, f) { lijst.push({ d: diepte, f: f }) }
  voeg(1.2 + 2.6, huis); voeg(9.2 + 2.6, schuur); voeg(7.5 + 1.4, put); voeg(14.5 + 2.4, brievenbus)
  voeg(1 + 3.3, function () { lantaarn(1, 3.3) }); voeg(13.6 + 3.3, function () { lantaarn(13.6, 3.3) })
  BOMEN.forEach(function (b, n) { voeg(b[0] + b[1], function () { boom(b[0], b[1], n) }) })
  // hekken om de akker en de wei
  voeg(FX + FY - 0.2, function () { hekLijn(FX - 0.15, FY - 0.15, FX + 12.15, FY - 0.15); hekLijn(FX - 0.15, FY - 0.15, FX - 0.15, FY + 8.15) })
  voeg(FX + 12 + FY + 8 + 0.3, function () { hekLijn(FX - 0.15, FY + 8.15, FX + 12.15, FY + 8.15); hekLijn(FX + 12.15, FY - 0.15, FX + 12.15, FY + 8.15) })
  voeg(14 + 4 - 0.2, function () { hekLijn(14.2, 4.1, 17.8, 4.1); hekLijn(14.2, 4.1, 14.2, 10.6) })
  voeg(17.8 + 10.6 + 0.3, function () { hekLijn(14.2, 10.6, 17.8, 10.6); hekLijn(17.8, 4.1, 17.8, 10.6) })
  // gewassen
  for (var j = 0; j < PB.W * PB.H; j++) {
    var v = s.velden[j]
    if (!v.gewas) continue
    ;(function (j, v) {
      var x = FX + j % PB.W + 0.5, y = FY + (j / PB.W | 0) + 0.5
      voeg(x + y, function () {
        var c = iso(x, y, 0.09)
        tekenGewas(ctx, c[0], c[1], A, v.gewas, tijd)
        if (!v.gewas.dood && v.gewas.groei >= PB.GEWASSEN[v.gewas.id].dagen && Math.sin(tijd * 4 + j) > 0.5) NK.ster(ctx, c[0] + A * 0.25, c[1] - A * 0.6, A * 0.08, '#fff6cf')
        else if (!v.gewas.dood && !v.gewas.water && v.gewas.groei < PB.GEWASSEN[v.gewas.id].dagen) { ctx.fillStyle = 'rgba(80,170,255,0.95)'; ctx.beginPath(); ctx.moveTo(c[0] + A * 0.3, c[1] - A * 0.72); ctx.quadraticCurveTo(c[0] + A * 0.38, c[1] - A * 0.58, c[0] + A * 0.3, c[1] - A * 0.54); ctx.quadraticCurveTo(c[0] + A * 0.22, c[1] - A * 0.58, c[0] + A * 0.3, c[1] - A * 0.72); ctx.fill() }
      })
    })(j, v)
  }
  // sproeiers
  PB.sproeiers(s).forEach(function (sp) { var x = FX + sp % PB.W + 0.5, y = FY + (sp / PB.W | 0) + 0.5; voeg(x + y + 0.01, function () { var c = iso(x, y, 0.09); ctx.fillStyle = '#8a93a8'; ctx.fillRect(c[0] - A * 0.04, c[1] - A * 0.3, A * 0.08, A * 0.3); bol(ctx, c[0], c[1] - A * 0.34, A * 0.09, '#3fa8ff', '#bfe4ff') }) })
  // dieren
  dierPlek.forEach(function (d, n) {
    var dier = s.dieren[n]; if (!dier) return
    voeg(d.x + d.y, function () {
      tekenDier(dier.soort, d.x, d.y, d.kijk, d.wacht <= 0)
      var c = iso(d.x, d.y)
      if (dier.product) { cirkel(ctx, c[0], c[1] - A * 0.85, A * 0.17, 'rgba(255,255,255,0.92)'); productIcoon(ctx, PB.DIEREN[dier.soort].product, c[0], c[1] - A * 0.85, A * 0.1) }
      else if (!dier.geaaid && Math.sin(tijd * 3 + n) > 0.3) hartje(ctx, c[0], c[1] - A * 0.8, A * 0.08, 'rgba(255,110,160,0.9)')
    })
  })
  // de boer
  if (s === D.s) voeg(boer.x + boer.y, tekenBoer)
  lijst.sort(function (a, b) { return a.d - b.d })
  lijst.forEach(function (o) { o.f() })
  // tikmarkeringen en geplande klusjes
  doelFlits = doelFlits.filter(function (f) { f.t += dt; ruitRand(f.i, 'rgba(255,255,255,' + (1 - f.t / 0.5) + ')'); return f.t < 0.5 })
  boer.rij.forEach(function (q) { if (q.soort === 'veld') ruitRand(q.i, 'rgba(255,230,120,0.7)', true) })
  // licht: roze ochtend, oranje avond, nacht met lampjes
  var t = s.tijd
  var tint = t < 0.33 && t > 0.2 ? 'rgba(255,170,200,' + (0.14 * (1 - Math.abs(t - 0.27) / 0.07)) + ')' : t > 0.62 && t < 0.85 ? 'rgba(255,140,50,' + (0.18 * (1 - Math.abs(t - 0.72) / 0.13)) + ')' : null
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, C.W, C.H) }
  var dk = nachtDonker()
  if (dk > 0) {
    ctx.fillStyle = 'rgba(10,12,48,' + dk * 0.75 + ')'; ctx.fillRect(0, 0, C.W, C.H)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    raamLicht.forEach(function (p) { NK.vlek(ctx, p[0], p[1], A * 1.2, '#ffc85a', dk * 0.55) })
    lampen.forEach(function (p) { NK.vlek(ctx, p[0], p[1], A * 2, '#ffd27a', dk * 0.7) })
    ctx.restore()
  }
  tekenWeer()
}
function ruitRand(i, kl, stip) {
  var x = FX + i % PB.W, y = FY + (i / PB.W | 0), a = iso(x + 0.05, y + 0.05, 0.1), b = iso(x + 0.95, y + 0.05, 0.1), c = iso(x + 0.95, y + 0.95, 0.1), d = iso(x + 0.05, y + 0.95, 0.1)
  ctx.strokeStyle = kl; ctx.lineWidth = 2; if (stip) ctx.setLineDash([5, 4])
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.stroke(); ctx.setLineDash([])
}
function hartje(g, x, y, r, k) { g.fillStyle = k; g.beginPath(); g.arc(x - r * 0.5, y, r * 0.55, 0, TAU); g.arc(x + r * 0.5, y, r * 0.55, 0, TAU); g.moveTo(x - r, y + r * 0.1); g.lineTo(x, y + r * 1.2); g.lineTo(x + r, y + r * 0.1); g.fill() }
function productIcoon(g, p, x, y, r) {
  if (p === 'ei') { var eg = g.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r); eg.addColorStop(0, '#ffffff'); eg.addColorStop(1, '#e8d8b8'); g.fillStyle = eg; g.beginPath(); g.ellipse(x, y, r * 0.72, r, 0, 0, TAU); g.fill() }
  else if (p === 'melk') { NK.rondRect(g, x - r * 0.55, y - r * 0.7, r * 1.1, r * 1.5, r * 0.2); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = '#b8c8d8'; g.lineWidth = 1; g.stroke(); g.fillStyle = '#3fa8ff'; g.fillRect(x - r * 0.55, y - r * 0.15, r * 1.1, r * 0.35) }
  else { [[-0.35, 0], [0.35, 0.05], [0, -0.3], [0, 0.3]].forEach(function (q) { bol(g, x + q[0] * r, y + q[1] * r, r * 0.55, '#f4f0e8', '#ffffff') }) }
}
// klein plaatje voor knoppen en lijsten
function plaatje(id, zakje) {
  var c = document.createElement('canvas'); c.width = 96; c.height = 96
  var g = c.getContext('2d')
  if (PB.GEWASSEN[id]) {
    if (zakje) {
      NK.rondRect(g, 20, 12, 56, 74, 10); g.fillStyle = '#efe0c0'; g.fill(); g.strokeStyle = '#c4a874'; g.lineWidth = 3; g.stroke()
      g.fillStyle = '#c4a874'; g.fillRect(20, 22, 56, 4)
      var oud = A; A = 70; tekenGewas(g, 48, 72, 60, { id: id, groei: PB.GEWASSEN[id].dagen }, 0); A = oud
    } else { var o2 = A; A = 80; tekenGewas(g, 48, 80, 80, { id: id, groei: PB.GEWASSEN[id].dagen }, 0); A = o2 }
  } else productIcoon(g, id, 48, 50, 30)
  return c
}

// ── tikken, slepen en zoomen ──
var aanraak = null, vingers = {}
$('c').addEventListener('pointerdown', function (e) {
  Geluid.audio()
  vingers[e.pointerId] = [e.clientX, e.clientY]
  aanraak = { x: e.clientX, y: e.clientY, px: panX, py: panY, sleept: false, z: zoom, afstand: null }
  var ids = Object.keys(vingers)
  if (ids.length === 2) { var a = vingers[ids[0]], b = vingers[ids[1]]; aanraak.afstand = Math.hypot(a[0] - b[0], a[1] - b[1]); aanraak.sleept = true }
})
window.addEventListener('pointermove', function (e) {
  if (!aanraak || !vingers[e.pointerId]) return
  vingers[e.pointerId] = [e.clientX, e.clientY]
  var ids = Object.keys(vingers)
  if (ids.length === 2 && aanraak.afstand) { var a = vingers[ids[0]], b = vingers[ids[1]]; zoom = Math.max(1, Math.min(2.8, aanraak.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / aanraak.afstand)); pasIn(); return }
  var dx = e.clientX - aanraak.x, dy = e.clientY - aanraak.y
  if (!aanraak.sleept && Math.hypot(dx, dy) > 10) aanraak.sleept = true
  if (aanraak.sleept && zoom > 1.01) { panX = aanraak.px + dx; panY = aanraak.py + dy; begrens(); pasIn() }
})
window.addEventListener('pointerup', function (e) {
  delete vingers[e.pointerId]
  if (!aanraak) return
  var a = aanraak; aanraak = Object.keys(vingers).length ? aanraak : null
  if (!a.sleept && huidig === null && s) tik(e.clientX, e.clientY)
})
window.addEventListener('pointercancel', function (e) { delete vingers[e.pointerId]; aanraak = null })
$('c').addEventListener('wheel', function (e) { e.preventDefault(); zoom = Math.max(1, Math.min(2.8, zoom * (e.deltaY < 0 ? 1.12 : 0.89))); begrens(); pasIn() }, { passive: false })
function begrens() { var m = (zoom - 1) * Math.min(C.W, C.H) * 0.6; panX = Math.max(-m, Math.min(m, panX)); panY = Math.max(-m, Math.min(m, panY)); if (zoom <= 1.01) { panX = panY = 0 } }
$('z-in').onclick = function () { zoom = Math.min(2.8, zoom * 1.3); begrens(); pasIn() }
$('z-uit').onclick = function () { zoom = Math.max(1, zoom / 1.3); begrens(); pasIn() }
$('z-pas').onclick = function () { zoom = 1; panX = panY = 0; pasIn() }

function tik(sx, sy) {
  // eerst een dier?
  for (var n = 0; n < dierPlek.length; n++) {
    var c = iso(dierPlek[n].x, dierPlek[n].y)
    if (Math.hypot(c[0] - sx, c[1] - A * 0.3 - sy) < A * 0.45) { zetInRij({ soort: 'dier', n: n }); return }
  }
  var w = terug(sx, sy + A * 0.09), fx2 = Math.floor(w[0]) - FX, fy2 = Math.floor(w[1]) - FY
  if (fx2 < 0 || fy2 < 0 || fx2 >= PB.W || fy2 >= PB.H) return
  var i = fy2 * PB.W + fx2
  if (!PB.bruikbaar(s, i)) { G.niet(); melding('Dit stuk grond is nog niet van jou. Koop een grotere akker in de winkel.'); return }
  zetInRij({ soort: 'veld', i: i }); doelFlits.push({ i: i, t: 0 })
}
function zetInRij(t) {
  if (boer.rij.length >= 8) return
  if (boer.rij.some(function (q) { return q.soort === t.soort && q.i === t.i && q.n === t.n })) return
  boer.rij.push(t); Geluid.toon(1100, 0.03, 'triangle', 0.04)
}
function voerUit(taak) {
  if (taak.soort === 'dier') {
    var n = taak.n, r = PB.aai(s, n), d = dierPlek[n]
    if (!r || !d) return
    var c = iso(d.x, d.y)
    G[s.dieren[n].soort](); d.wacht = 1.2
    if (r.t === 'raap') { fx.spat(c[0], c[1] - A * 0.4, 12, '#fff6cf', 120, { ster: true }); fx.tekst(c[0], c[1] - A, '+1 ' + PB.naamVan(r.product), '#ffffff', 18) }
    else if (r.t === 'aai') { for (var h = 0; h < 5; h++) fx.punt({ x: c[0], y: c[1] - A * 0.5, vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 40, t: 0, max: 0.9, r: 3, col: '#ff78aa', zwaarte: 30 }); fx.tekst(c[0], c[1] - A, 'Blij!', '#ff9ac2', 16) }
    else melding('Dit dier is vandaag al geaaid. Morgen heeft het iets voor je.')
    bewaar(); hudBij(); return
  }
  var i = taak.i, res = PB.tik(s, i, D.zaad), p = iso(FX + i % PB.W + 0.5, FY + (i / PB.W | 0) + 0.5, 0.1)
  if (res.t === 'niet') { G.niet(); melding(res.reden); boer.rij = []; return }
  if (res.t === 'ploeg') { G.ploeg(); fx.spat(p[0], p[1], 10, '#8a5a32', 80, { zwaarte: 200 }) }
  if (res.t === 'zaai') { G.zaai(); fx.spat(p[0], p[1], 5, '#c9a26a', 50); if (!s.zaden[D.zaad]) kiesVolgendZaad() }
  if (res.t === 'water') { G.water(); for (var q = 0; q < 12; q++) fx.punt({ x: p[0] + (Math.random() - 0.5) * A, y: p[1] - A * 0.6, vx: 0, vy: 80 + Math.random() * 40, t: 0, max: 0.35, r: 2, col: '#6fc8ff', zwaarte: 200 }) }
  if (res.t === 'oogst') { G.oogst(); fx.spat(p[0], p[1], 14, PB.GEWASSEN[res.id].kleur, 120, { ster: true }); fx.tekst(p[0], p[1] - 24, '+1 ' + PB.GEWASSEN[res.id].naam, '#ffffff', 16) }
  if (res.t === 'ruim') G.ploeg()
  if (res.t === 'groeit') melding(PB.GEWASSEN[s.velden[i].gewas.id].naam + ': nog ' + res.nog + (res.nog === 1 ? ' dag' : ' dagen') + '. Water heeft hij vandaag al.')
  bewaar(); hudBij()
}
function kiesVolgendZaad() {
  var sz = PB.seizoen(s)
  var ander = Object.keys(s.zaden).find(function (id) { return s.zaden[id] > 0 && PB.GEWASSEN[id].seizoen === sz })
  D.zaad = ander || null
}

// ── hoofdlus ──
var vorige = performance.now(), bewaarKlok = 0
function frame(nu) {
  var dt = Math.min(0.05, (nu - vorige) / 1000); vorige = nu; tijd += dt
  ctx.setTransform(C.dpr, 0, 0, C.dpr, 0, 0)
  if (s) {
    if (huidig === null) {
      PB.verder(s, dt).forEach(gebeurtenis)
      bewaarKlok += dt; if (bewaarKlok > 3) { bewaarKlok = 0; bewaar() }
      hudBij(); boerLoop(dt)
    }
    dierLoop(dt); sfeer(dt)
    tekenWereld(dt)
    fx.teken(ctx, dt)
  } else { ctx.fillStyle = '#5aa8ff'; ctx.fillRect(0, 0, C.W, C.H) }
  requestAnimationFrame(frame)
}

// ── gebeurtenissen van de tijd ──
function gebeurtenis(e) {
  if (e.t === 'dag') { G.ochtend(); melding('Goedemorgen! Dag ' + PB.dagInSeizoen(s) + ' van de ' + PB.SEIZOENEN[PB.seizoen(s)].toLowerCase() + '.'); if (!D.zaad || !s.zaden[D.zaad] || PB.GEWASSEN[D.zaad].seizoen !== PB.seizoen(s)) kiesVolgendZaad() }
  if (e.t === 'seizoen') { melding('De ' + PB.SEIZOENEN[e.seizoen].toLowerCase() + ' is begonnen! Wat niet bij dit seizoen hoort, is verwelkt.'); D.zaad = null; kiesVolgendZaad() }
  if (e.t === 'cadeau') melding('Het dorp geeft je ' + e.n + ' zakjes ' + PB.GEWASSEN[e.id].naam.toLowerCase() + '-zaad. Succes!')
  bewaar()
}

// ── HUD ──
function hudBij() {
  if (!s) return
  var uur = Math.floor(s.tijd * 24), min = Math.floor((s.tijd * 24 - uur) * 6) * 10
  $('dagtekst').textContent = PB.SEIZOENEN[PB.seizoen(s)] + ' · dag ' + PB.dagInSeizoen(s) + ' · ' + uur + ':' + (min < 10 ? '0' : '') + min
  $('tijdvul').style.width = (s.tijd * 100).toFixed(1) + '%'
  $('hudmunten').textContent = s.munten
  var zc = $('c-zaad').getContext('2d'); zc.clearRect(0, 0, 64, 64)
  if (D.zaad && s.zaden[D.zaad]) { zc.drawImage(plaatje(D.zaad, true), 0, 0, 64, 64); $('zaadtekst').textContent = PB.GEWASSEN[D.zaad].naam + ' (' + s.zaden[D.zaad] + ')' }
  else $('zaadtekst').textContent = 'Kies zaad'
  var kan = s.opdrachten.filter(function (o) { var bak = PB.GEWASSEN[o.id] ? s.oogst : s.producten; return (bak[o.id] || 0) >= o.n }).length
  $('dorpstip').textContent = kan; $('dorpstip').classList.toggle('verborgen', !kan)
}
function bewaar() { D.s = s; D.bewaar() }

// ── panelen: zaad, winkel, opdrachten, schuur ──
var winkelTab = 'zaden'
function paneel(soort) {
  var kop = $('paneelkop'), sub = $('paneelsub'), tabs = $('paneeltabs'), l = $('paneellijst')
  l.innerHTML = ''; tabs.innerHTML = ''
  var sz = PB.seizoen(s)
  var rij = function (icoon, titel, klein, knop, actie, uit, gekozen) {
    var d = document.createElement('div'); d.className = 'rijtje' + (uit ? ' uit' : '') + (gekozen ? ' gekozen' : '')
    if (icoon) d.appendChild(icoon)
    var m = document.createElement('div'); m.innerHTML = '<b>' + titel + '</b><div class="klein">' + klein + '</div>'; d.appendChild(m)
    if (knop) { var bt = document.createElement('button'); bt.className = knop.k || 'koop'; bt.innerHTML = knop.t; bt.disabled = !!knop.uit; bt.onclick = function () { actie() }; d.appendChild(bt) }
    l.appendChild(d)
  }
  if (soort === 'zaad') {
    kop.textContent = 'Kies zaad'; sub.textContent = 'Dit seizoen: ' + PB.SEIZOENEN[sz].toLowerCase() + '. Tik daarna op een lege akker.'
    var heb = Object.keys(s.zaden).filter(function (id) { return s.zaden[id] > 0 })
    if (!heb.length) sub.textContent = 'Je hebt geen zaad. Koop zaad in de winkel.'
    heb.forEach(function (id) {
      var g = PB.GEWASSEN[id], goed = g.seizoen === sz
      rij(plaatje(id, true), g.naam + ' × ' + s.zaden[id], goed ? g.dagen + ' dagen tot oogst' : 'groeit alleen in de ' + PB.SEIZOENEN[g.seizoen].toLowerCase(), { t: D.zaad === id ? 'Gekozen' : 'Kies', k: D.zaad === id ? 'kies aan' : 'kies', uit: !goed },
        function () { D.zaad = id; D.bewaar(); Geluid.klik(); sluit() }, !goed, D.zaad === id)
    })
  }
  if (soort === 'winkel') {
    kop.textContent = 'Winkel'; sub.innerHTML = 'Je hebt <span class="munt">' + s.munten + '</span>'
    ;[['zaden', 'Zaden'], ['dieren', 'Dieren'], ['upgrades', 'Verbeteren']].forEach(function (t) { var x = document.createElement('button'); x.textContent = t[1]; x.className = winkelTab === t[0] ? 'aan' : ''; x.onclick = function () { winkelTab = t[0]; paneel('winkel') }; tabs.appendChild(x) })
    if (winkelTab === 'zaden') Object.keys(PB.GEWASSEN).filter(function (id) { return PB.GEWASSEN[id].seizoen === sz }).forEach(function (id) {
      var g = PB.GEWASSEN[id]
      rij(plaatje(id, true), g.naam, g.dagen + ' dagen · verkoop ' + g.prijs + (g.opnieuw ? ' · blijft groeien na de oogst' : '') + ' · je hebt er ' + (s.zaden[id] || 0),
        { t: '5 voor <span class="munt" style="color:inherit">' + g.zaad * 5 + '</span>', uit: s.munten < g.zaad * 5 }, function () { if (PB.koopZaad(s, id, 5)) { G.munt(); if (!D.zaad) D.zaad = id; bewaar(); paneel('winkel'); hudBij() } })
    })
    if (winkelTab === 'dieren') {
      sub.innerHTML += ' · plek voor ' + PB.maxDieren(s) + ' dieren (' + s.dieren.length + ' nu)'
      Object.keys(PB.DIEREN).forEach(function (k) {
        var d = PB.DIEREN[k], ic = document.createElement('canvas'); ic.width = 96; ic.height = 96
        var oud = ctx, oA = A, oOX = OX, oOY = OY; ctx = ic.getContext('2d'); A = 110; OX = 48; OY = 80; tekenDier(k, 0, 0, 1, false); ctx = oud; A = oA; OX = oOX; OY = oOY
        rij(ic, d.naam, 'Aai hem elke dag: dan geeft hij de volgende ochtend ' + d.productNaam.toLowerCase() + ' (waard ' + d.waarde + ').', { t: '<span class="munt" style="color:inherit">' + d.prijs + '</span>', uit: s.munten < d.prijs || s.dieren.length >= PB.maxDieren(s) },
          function () { if (PB.koopDier(s, k)) { G[k](); bewaar(); paneel('winkel'); hudBij() } })
      })
    }
    if (winkelTab === 'upgrades') Object.keys(PB.UPGRADES).forEach(function (k) {
      var u = PB.UPGRADES[k], nv = s.upg[k], prijs = u.prijzen[nv]
      rij(null, u.naam + ' (' + nv + '/' + u.prijzen.length + ')', u.uitleg, prijs == null ? { t: 'Maximaal', k: 'kies aan', uit: true } : { t: '<span class="munt" style="color:inherit">' + prijs + '</span>', uit: s.munten < prijs },
        function () { if (PB.koopUpgrade(s, k)) { Geluid.koop(); bewaar(); paneel('winkel'); hudBij() } })
    })
  }
  if (soort === 'dorp') {
    kop.textContent = 'Opdrachten van het dorp'; sub.textContent = 'Breng wat ze vragen en verdien extra munten.'
    s.opdrachten.forEach(function (o, k) {
      var bak = PB.GEWASSEN[o.id] ? s.oogst : s.producten, heb = bak[o.id] || 0
      rij(plaatje(o.id), o.wie + ' wil ' + o.n + ' × ' + PB.naamVan(o.id), 'Je hebt er ' + heb + ' · beloning ' + o.beloning + ' munten',
        { t: 'Breng', uit: heb < o.n }, function () { var w = PB.lever(s, k); if (w) { G.munt(); Geluid.win(); melding(o.wie + ' is blij! +' + w + ' munten'); bewaar(); paneel('dorp'); hudBij() } })
    })
  }
  if (soort === 'schuur') {
    kop.textContent = 'Schuur'; sub.textContent = 'Verkoop wat je hebt geoogst. Bewaar wat het dorp nodig heeft!'
    var alles = []
    Object.keys(s.oogst).forEach(function (id) { if (s.oogst[id]) alles.push(id) })
    Object.keys(s.producten).forEach(function (id) { if (s.producten[id]) alles.push(id) })
    if (!alles.length) sub.textContent = 'Je schuur is leeg. Oogst rijpe gewassen (met een glinster) en raap producten van je dieren.'
    alles.forEach(function (id) {
      var n = (s.oogst[id] || 0) + (s.producten[id] || 0), w = PB.waardeVan(id)
      var nodig = s.opdrachten.some(function (o) { return o.id === id })
      rij(plaatje(id), PB.naamVan(id) + ' × ' + n, w + ' per stuk' + (nodig ? ' · het dorp vraagt hierom!' : ''), { t: 'Verkoop ' + n * w }, function () { var m = PB.verkoop(s, id); if (m) { G.munt(); fx.tekst(C.W / 2, C.H / 2, '+' + m, '#ffc83d', 28) } bewaar(); paneel('schuur'); hudBij() })
    })
  }
  toonScherm('paneel')
}
function sluit() { toonScherm(null); hudBij() }
$('paneeldicht').onclick = function () { Geluid.klik(); sluit() }
$('b-zaad').onclick = function () { Geluid.klik(); paneel('zaad') }
$('b-winkel').onclick = function () { Geluid.klik(); paneel('winkel') }
$('b-dorp').onclick = function () { Geluid.klik(); paneel('dorp') }
$('b-schuur').onclick = function () { Geluid.klik(); paneel('schuur') }
$('b-slaap').onclick = function () {
  Geluid.klik()
  if (s.tijd > 0.25 && s.tijd < 0.6) { melding('Het is nog dag! Slapen kan vanaf de middag.'); return }
  PB.slaap(s).forEach(gebeurtenis); hudBij(); bewaar()
}

// ── schermen ──
var huidig = 'menu'
function toonScherm(id) {
  huidig = id
  ;['menu', 'paneel'].forEach(function (x) { $(x).classList.toggle('aan', x === id) })
  var inSpel = id === null || id === 'paneel'
  $('hud').classList.toggle('aan', inSpel); $('balk').classList.toggle('aan', id === null); $('zoom').classList.toggle('aan', id === null)
  $('menutop').classList.toggle('aan', id === 'menu' && !BELONING)
  $('naarmenu').style.visibility = BELONING ? 'hidden' : ''
}
function melding(t) { var m = $('melding'); m.textContent = t; m.classList.remove('aan'); void m.offsetWidth; m.classList.add('aan'); clearTimeout(melding.t); melding.t = setTimeout(function () { m.classList.remove('aan') }, 3000) }
function start() {
  s = D.s
  if (!s) { s = PB.nieuw((Math.random() * 4294967296) >>> 0); D.zaad = 'radijs'; bewaar(); melding('Welkom op je boerderij! Tik op de akker: de boer gaat zaaien en water geven.') }
  else melding('Je gaat verder op dag ' + PB.dagInSeizoen(s) + ' van de ' + PB.SEIZOENEN[PB.seizoen(s)].toLowerCase() + '.')
  dierPlek = []
  pasIn(); toonScherm(null); hudBij()
}
$('speel').onclick = function () { Geluid.klik(); start() }
$('nieuw').onclick = function () {
  if (!confirm('Weet je het zeker? Je boerderij begint dan helemaal opnieuw.')) return
  s = null; D.s = null; D.bewaar(); start()
}
$('terug').onclick = function () { Geluid.klik(); NK.naarOuder('boerenleven-terug') }
$('naarmenu').onclick = function () { Geluid.klik(); bewaar(); toonMenu() }
$('s-geluid').onclick = function () { D.geluid = !D.geluid; D.bewaar(); this.classList.toggle('aan', D.geluid); Geluid.klik() }
$('s-rustig').onclick = function () { D.rustig = !D.rustig; D.bewaar(); this.classList.toggle('aan', D.rustig); Geluid.klik() }
function toonMenu() {
  if (!s) s = PB.nieuw(1)  // voorbeeldboerderij achter het menu
  $('speel').textContent = D.s ? 'Verder spelen' : 'Spelen'
  $('nieuw').classList.toggle('verborgen', !D.s)
  $('s-geluid').classList.toggle('aan', D.geluid); $('s-rustig').classList.toggle('aan', D.rustig)
  pasIn(); toonScherm('menu')
}
document.addEventListener('visibilitychange', function () { if (document.hidden && D.s) bewaar() })

// ── start ──
if (BELONING) start()
else { s = D.s; toonMenu() }
requestAnimationFrame(frame)
})()
