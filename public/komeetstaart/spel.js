// Komeetstaart: scherm, besturing, effecten, winkel en opslag. Spelregels in kern.js.
(function () {
'use strict'
var $ = function (id) { return document.getElementById(id) }
var BELONING = NK.BELONING
var Geluid = NK.Geluid

// ── opslag ──
// bezig: het potje dat nog loopt (elke halve seconde bewaard), zo ga je altijd verder
var D = NK.opslag('kk_ks', { munten: 0, record: 0, kometen: ['neon'], komeet: 'neon', geluid: true, rustig: false, uitlegGezien: false, bezig: null, gespeeld: 0 })
Geluid.zetAan(function () { return D.geluid })

var KOMETEN = [
  { id: 'neon', naam: 'Neon', prijs: 0, kop: '#e9fdff', a: '#3ef0ff', b: '#9b6bff' },
  { id: 'vuur', naam: 'Vuurkomeet', prijs: 50, kop: '#fff6d0', a: '#ffe14f', b: '#ff3d3d', vonk: true },
  { id: 'ijs', naam: 'IJskomeet', prijs: 90, kop: '#ffffff', a: '#bff4ff', b: '#3f8dff' },
  { id: 'plasma', naam: 'Plasma', prijs: 140, kop: '#fff0fb', a: '#ff4fd8', b: '#4fa0ff' },
  { id: 'jungle', naam: 'Jungle', prijs: 190, kop: '#f6ffe0', a: '#d0ff4f', b: '#12b37a' },
  { id: 'regenboog', naam: 'Regenboog', prijs: 260, kop: '#ffffff', a: '#ff5a5a', b: '#5a8dff', regenboog: true },
  { id: 'goud', naam: 'Goud', prijs: 340, kop: '#fffbe6', a: '#ffe08a', b: '#d48a00', glans: true },
  { id: 'nevel', naam: 'Sterrennevel', prijs: 450, kop: '#ffffff', a: '#b06bff', b: '#1b0f4a', sterren: true },
]
function komeet() { return KOMETEN.find(function (k) { return k.id === D.komeet }) || KOMETEN[0] }

// ── geluid ──
var PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568]
var G = {
  eet: function (c) { var f = PENTA[Math.min(c - 1, PENTA.length - 1)]; Geluid.toon(f, 0.14, 'triangle', 0.16); Geluid.toon(f * 2, 0.1, 'sine', 0.05, 0.03) },
  draai: function () { Geluid.toon(320, 0.03, 'sine', 0.04) },
  kracht: function () { Geluid.toon(440, 0.25, 'sine', 0.14, 0, 1320); Geluid.toon(660, 0.2, 'triangle', 0.06, 0.08, 1760) },
  einde: function () { Geluid.toon(700, 0.2, 'sine', 0.08, 0, 300) },
  rots: function () { Geluid.ruis(0.3, 0.08, 300, 0.7) },
  rand: function () { Geluid.toon(900, 0.12, 'sine', 0.06, 0, 1600) },
  boem: function () { Geluid.ruis(0.6, 0.25, 250, 0.6); Geluid.toon(160, 0.6, 'sawtooth', 0.12, 0, 40) },
  tel: function (n) { Geluid.toon(n ? 660 : 1320, n ? 0.12 : 0.3, 'triangle', 0.14) },
}

// ── canvas ──
var C = NK.canvas($('c'), function () { if (s) plaats() })
var ctx = C.ctx, S = 30, ox = 0, oy = 0
function plaats() {
  var boven = 112, onder = 24
  S = Math.min((C.W - 16) / s.w, (C.H - boven - onder) / s.h)
  ox = (C.W - S * s.w) / 2; oy = boven + (C.H - boven - onder - S * s.h) / 2
}
function maat() {
  // rooster dat bij het scherm past
  var aw = C.W - 16, ah = C.H - 136, s0 = Math.max(24, Math.min(44, Math.min(aw, ah) / 15))
  return [Math.max(12, Math.min(26, Math.floor(aw / s0))), Math.max(10, Math.min(20, Math.floor(ah / s0)))]
}
function cx(i) { return ox + (i % s.w) * S + S / 2 }
function cy(i) { return oy + ((i / s.w) | 0) * S + S / 2 }

// ── toestand ──
var s = null, vorig = null, modus = 'menu', acc = 0, wachtrij = [], aftel = 0, demo = false
var fx = NK.deeltjes(), schok = NK.schok(), tijd = 0, bewaarKlok = 0, beste = { lengte: 0, combo: 0 }, verdiend = 0
var rotsVorm = {}

function nieuwPotje() {
  var m = maat()
  s = KS.nieuw(m[0], m[1], (Math.random() * 4294967296) >>> 0)
  beste = { lengte: s.slang.length, combo: 0 }; verdiend = 0
  start()
}
function start() {
  demo = false; vorig = s.slang.slice(); acc = 0; wachtrij = []
  fx.leeg(); plaats()
  modus = 'aftellen'; aftel = 3.2
  toonScherm(null)
  $('tip').classList.toggle('aan', D.gespeeld < 2)
  hudBij(); bewaarBezig()
}
function hervat() {
  try { s = D.bezig; if (!s || !s.slang || !s.w) throw new Error() } catch (e) { s = null; return false }
  beste = s.beste || { lengte: s.slang.length, combo: 0 }; verdiend = s.verdiend || 0
  start()
  return true
}
function bewaarBezig() {
  if (demo || !s) return
  if (s.over) D.bezig = null
  else { s.beste = beste; s.verdiend = verdiend; D.bezig = s }
  D.bewaar()
}

// ── besturen ──
function stuur(r) {
  if (modus === 'aftellen' && aftel < 3) { /* alvast mogen sturen */ }
  else if (modus !== 'spelen') return
  // buffer van twee bochten; geen omkeren en niet twee keer hetzelfde
  var laatste = wachtrij.length ? wachtrij[wachtrij.length - 1] : s.r
  if (r === laatste || r === (laatste + 2) % 4 || wachtrij.length >= 2) return
  wachtrij.push(r)
  $('tip').classList.remove('aan')
}

// ── tikken en gebeurtenissen ──
function tik() {
  vorig = s.slang.slice()
  var r = wachtrij.length ? wachtrij.shift() : null
  var oudScore = s.score
  var ev = KS.stap(s, r, 1 / KS.snelheid(s))
  if (r != null && !demo) G.draai()
  ev.forEach(gebeurtenis)
  if (!demo) {
    var munt = Math.floor(s.score / 5) - Math.floor(oudScore / 5)
    if (munt > 0) { D.munten += munt; verdiend += munt; fx.tekst(cx(s.slang[0]), cy(s.slang[0]) - S, '+' + munt + ' munt', '#ffc83d', S * 0.6) }
    beste.lengte = Math.max(beste.lengte, s.slang.length)
    hudBij()
  }
}
function gebeurtenis(e) {
  var k = komeet(), stil = demo
  switch (e.t) {
    case 'eet':
      if (!stil) G.eet(e.combo)
      beste.combo = Math.max(beste.combo, e.combo)
      fx.spat(cx(e.i), cy(e.i), 12, '#ffc83d', S * 4, { ster: true, maat: S * 0.07 })
      if (!stil && e.combo >= 3) fx.tekst(cx(e.i), cy(e.i) - S * 0.6, 'Reeks ' + e.combo + '!', '#ffe08a', S * 0.7)
      if (!stil) schok.voeg(0.06)
      break
    case 'kracht':
      fx.spat(cx(e.i), cy(e.i), 10, KRACHT[e.soort].k, S * 3)
      break
    case 'pak':
      if (!stil) { G.kracht(); schok.voeg(0.2) }
      fx.spat(cx(e.i), cy(e.i), 24, KRACHT[e.soort].k, S * 5, { ster: true, maat: S * 0.08 })
      if (!stil) fx.tekst(cx(e.i), cy(e.i) - S * 0.6, KRACHT[e.soort].naam, KRACHT[e.soort].k, S * 0.75)
      if (e.stukjes) e.stukjes.forEach(function (i) { fx.spat(cx(i), cy(i), 6, k.b, S * 2) })
      break
    case 'einde': if (!stil) G.einde(); break
    case 'rots': if (!stil) G.rots(); rotsVorm[e.i] = null; fx.spat(cx(e.i), cy(e.i), 14, '#b9a8ff', S * 3); break
    case 'weg': fx.spat(cx(e.i), cy(e.i), 8, '#ffffff', S * 2); break
    case 'rand':
      if (!stil) G.rand()
      fx.spat(cx(e.van), cy(e.van), 8, k.a, S * 3); fx.spat(cx(e.naar), cy(e.naar), 8, k.a, S * 3)
      break
    case 'botsing':
      if (stil) { demoOpnieuw = 1.2; break }
      G.boem(); schok.voeg(0.8)
      s.slang.forEach(function (i, n) { fx.spat(cx(i), cy(i), n < 4 ? 10 : 3, n % 2 ? k.a : k.b, S * 5, { duur: 0.9 }) })
      modus = 'boem'; setTimeout(eindScherm, 1100)
      break
  }
}
var KRACHT = {
  traag: { k: '#4fa0ff', naam: 'Traag!' },
  spook: { k: '#ff4fd8', naam: 'Spook!' },
  magneet: { k: '#ff5a5a', naam: 'Magneet!' },
  goud: { k: '#ffc83d', naam: '+5' },
}
function hudBij() {
  $('score').textContent = s.score
  $('record').textContent = D.record ? 'Record ' + Math.max(D.record, s.score) : ''
  var h = ''
  for (var soort in s.effect) if (s.effect[soort] > 0) h += '<span class="effect" style="--k:' + KRACHT[soort].k + ';--p:' + Math.round(s.effect[soort] / KS.DUUR[soort] * 100) + '"><i></i>' + KRACHT[soort].naam.replace('!', '') + '</span>'
  $('effecten').innerHTML = h
}
function eindScherm() {
  D.gespeeld++
  var nieuw = s.score > D.record
  if (nieuw) D.record = s.score
  D.bezig = null; D.bewaar()
  $('eindscore').textContent = s.score
  $('nieuwrecord').classList.toggle('verborgen', !nieuw || s.score < 3)
  $('st-lengte').textContent = beste.lengte; $('st-combo').textContent = beste.combo
  $('verdiend').innerHTML = verdiend ? 'Verdiend: <span class="munt">' + verdiend + '</span>' : 'Eet 5 sterrenstof voor een munt.'
  $('eindmenu').classList.toggle('verborgen', BELONING)
  if (nieuw && s.score >= 3) Geluid.win()
  modus = 'einde'
  toonScherm('einde')
}

// ── demo achter het menu: een komeet die zelf speelt ──
var demoOpnieuw = 0
function startDemo() {
  var m = maat()
  s = KS.nieuw(m[0], m[1], (Math.random() * 1e9) >>> 0); demo = true; vorig = s.slang.slice(); acc = 0; wachtrij = []
  plaats()
}
function demoKeuze() {
  var kop = s.slang[0], beste = null, score = 1e9
  for (var r = 0; r < 4; r++) {
    if (r === (s.r + 2) % 4) continue
    var nx = KS.buur(s, kop, r)
    if (s.rotsen.indexOf(nx) >= 0 || s.slang.slice(0, -1).indexOf(nx) >= 0) continue
    var sc = KS.afstand(s, nx, s.stof) + Math.random() * 0.5
    if (sc < score) { score = sc; beste = r }
  }
  return beste
}

// ── tekenen ──
function rotsPunten(i) {
  if (rotsVorm[i]) return rotsVorm[i]
  var R = NK.rng(i * 7919 + 13), p = []
  for (var k = 0; k < 9; k++) p.push(0.36 + R() * 0.12)
  return (rotsVorm[i] = { p: p, krater: [[R() - 0.5, R() - 0.5, 0.08 + R() * 0.06], [R() - 0.5, R() - 0.5, 0.05 + R() * 0.05]], draai: R() * 6 })
}
function tekenVeld() {
  var w = s.w * S, h = s.h * S
  NK.vlek(ctx, ox + w / 2, oy + h / 2, Math.max(w, h) * 0.7, '#3ef0ff', 0.1)
  ctx.fillStyle = 'rgba(8,8,30,0.55)'; NK.rondRect(ctx, ox, oy, w, h, S * 0.4); ctx.fill()
  // stippen
  ctx.fillStyle = 'rgba(160,200,255,0.12)'
  for (var y = 0; y < s.h; y++) for (var x = 0; x < s.w; x++) { ctx.beginPath(); ctx.arc(ox + x * S + S / 2, oy + y * S + S / 2, Math.max(1, S * 0.04), 0, 7); ctx.fill() }
  // rand: portaal-lijn die meebeweegt (je komt aan de andere kant binnen)
  ctx.save()
  ctx.strokeStyle = 'rgba(62,240,255,0.35)'; ctx.lineWidth = Math.max(3, S * 0.12); ctx.shadowColor = '#3ef0ff'; ctx.shadowBlur = S * 0.5
  NK.rondRect(ctx, ox, oy, w, h, S * 0.4); ctx.stroke()
  ctx.shadowBlur = 0; ctx.strokeStyle = '#bff8ff'; ctx.lineWidth = Math.max(1.5, S * 0.05); ctx.setLineDash([S * 0.5, S * 0.35]); ctx.lineDashOffset = -tijd * S * 1.5
  ctx.stroke(); ctx.restore()
  if (s.effect.traag > 0) { ctx.fillStyle = 'rgba(79,160,255,0.08)'; NK.rondRect(ctx, ox, oy, w, h, S * 0.4); ctx.fill() }
}
function tekenDingen() {
  // planetoïden
  s.rotsen.forEach(function (i) {
    var v = rotsPunten(i), x = cx(i), y = cy(i)
    ctx.save(); ctx.translate(x, y); ctx.rotate(v.draai + tijd * 0.2)
    ctx.shadowColor = '#9b6bff'; ctx.shadowBlur = S * 0.3
    var gr = ctx.createRadialGradient(-S * 0.12, -S * 0.12, 0, 0, 0, S * 0.5); gr.addColorStop(0, '#8a7bb8'); gr.addColorStop(1, '#2e2552')
    ctx.fillStyle = gr; ctx.beginPath()
    v.p.forEach(function (r, k) { var h = k / v.p.length * Math.PI * 2; ctx.lineTo(Math.cos(h) * r * S, Math.sin(h) * r * S) })
    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(200,180,255,0.5)'; ctx.lineWidth = 1.2; ctx.stroke()
    ctx.fillStyle = 'rgba(20,14,40,0.5)'
    v.krater.forEach(function (c) { ctx.beginPath(); ctx.arc(c[0] * S * 0.4, c[1] * S * 0.4, c[2] * S, 0, 7); ctx.fill() })
    ctx.restore()
  })
  // sterrenstof
  if (s.stof >= 0) {
    var x = cx(s.stof), y = cy(s.stof) + Math.sin(tijd * 4) * S * 0.06
    NK.vlek(ctx, x, y, S * 0.9, '#ffc83d', 0.35)
    ctx.save(); ctx.translate(x, y); ctx.rotate(tijd * 1.5); ctx.shadowColor = '#ffc83d'; ctx.shadowBlur = S * 0.5
    NK.ster(ctx, 0, 0, S * 0.32, '#ffd96b'); ctx.shadowBlur = 0; NK.ster(ctx, 0, 0, S * 0.14, '#fffbe6'); ctx.restore()
    if (Math.random() < 0.08 && !D.rustig) fx.punt({ x: x + (Math.random() - 0.5) * S * 0.6, y: y + (Math.random() - 0.5) * S * 0.6, vx: 0, vy: -10, t: 0, max: 0.5, r: S * 0.05, col: '#fff6cf', ster: true, zwaarte: 0 })
  }
  // kracht
  if (s.kracht) {
    var kr = s.kracht, q = KRACHT[kr.soort], kx = cx(kr.i), ky = cy(kr.i), pul = 1 + Math.sin(tijd * 6) * 0.06
    NK.vlek(ctx, kx, ky, S * 1.1, q.k, 0.4)
    ctx.save(); ctx.translate(kx, ky); ctx.scale(pul, pul)
    ctx.shadowColor = q.k; ctx.shadowBlur = S * 0.5
    ctx.fillStyle = NK.hexA(q.k, 0.25); ctx.beginPath(); ctx.arc(0, 0, S * 0.4, 0, 7); ctx.fill()
    ctx.strokeStyle = q.k; ctx.lineWidth = Math.max(2, S * 0.07); ctx.stroke()
    ctx.shadowBlur = 0; krachtIcoon(ctx, kr.soort, S * 0.22)
    // hoe lang hij nog blijft liggen
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(0, 0, S * 0.52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, kr.over / 9)); ctx.stroke()
    ctx.restore()
  }
}
function krachtIcoon(g, soort, r) {
  g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = Math.max(1.5, r * 0.25); g.lineCap = 'round'; g.lineJoin = 'round'
  if (soort === 'traag') { g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r * 0.65); g.moveTo(0, 0); g.lineTo(r * 0.5, r * 0.2); g.stroke() }
  if (soort === 'spook') { g.beginPath(); g.moveTo(-r, r); g.lineTo(-r, -r * 0.1); g.arc(0, -r * 0.1, r, Math.PI, 0); g.lineTo(r, r); g.lineTo(r * 0.5, r * 0.6); g.lineTo(0, r); g.lineTo(-r * 0.5, r * 0.6); g.closePath(); g.globalAlpha = 0.9; g.fill(); g.globalAlpha = 1; g.fillStyle = '#ff4fd8'; g.beginPath(); g.arc(-r * 0.35, -r * 0.15, r * 0.18, 0, 7); g.arc(r * 0.35, -r * 0.15, r * 0.18, 0, 7); g.fill() }
  if (soort === 'magneet') { g.lineWidth = r * 0.45; g.beginPath(); g.arc(0, -r * 0.1, r * 0.75, Math.PI, 0, true); g.stroke(); g.strokeStyle = '#ff5a5a'; g.beginPath(); g.moveTo(-r * 0.75, -r * 0.1); g.lineTo(-r * 0.75, -r * 0.6); g.moveTo(r * 0.75, -r * 0.1); g.lineTo(r * 0.75, -r * 0.6); g.stroke() }
  if (soort === 'goud') NK.ster(g, 0, 0, r * 1.2, '#fff')
}
// plek van segment k tussen de vorige en deze tik
function segPlek(k, a) {
  var nu = s.slang[k], oud = vorig && vorig[k] != null ? vorig[k] : nu
  var x1 = cx(nu), y1 = cy(nu), x0 = cx(oud), y0 = cy(oud)
  if (Math.abs(x1 - x0) > S * 1.5 || Math.abs(y1 - y0) > S * 1.5) return [x1, y1, true]   // net door de rand
  return [x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, false]
}
function kleurOp(k, f) {
  if (k.regenboog) return 'hsl(' + ((f * 300 + tijd * 80) % 360 | 0) + ',95%,62%)'
  var a = parseInt(k.a.slice(1), 16), b = parseInt(k.b.slice(1), 16)
  var r = Math.round((a >> 16) + ((b >> 16) - (a >> 16)) * f), g = Math.round((a >> 8 & 255) + ((b >> 8 & 255) - (a >> 8 & 255)) * f), bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * f)
  return 'rgb(' + r + ',' + g + ',' + bl + ')'
}
function tekenKomeet(a, opBord) {
  var k = komeet(), n = s.slang.length, spook = s.effect.spook > 0
  var punten = []
  for (var i = 0; i < n; i++) punten.push(segPlek(i, a))
  ctx.save()
  if (spook) ctx.globalAlpha = 0.55 + Math.sin(tijd * 10) * 0.1
  // gloed
  ctx.globalCompositeOperation = 'lighter'
  for (var j = n - 1; j >= 0; j--) {
    var f = j / Math.max(1, n - 1), r = S * (0.2 + 0.28 * (1 - f))
    ctx.fillStyle = NK.hexA(k.regenboog ? '#ffffff' : k.a, 0.07 * (1 - f * 0.6))
    ctx.beginPath(); ctx.arc(punten[j][0], punten[j][1], r * 2.1, 0, 7); ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
  // staart: van het puntje naar de kop, steeds dikker
  // als één doorlopende buis: elk stukje een lijn met ronde uiteinden
  ctx.lineCap = 'round'
  for (var q = n - 1; q >= 1; q--) {
    var f2 = q / Math.max(1, n - 1), r2 = S * (0.16 + 0.26 * (1 - f2))
    var p0 = punten[q], p1 = punten[q - 1], col = kleurOp(k, f2)
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = r2 * 2
    if (!p0[2] && !p1[2] && Math.abs(p0[0] - p1[0]) + Math.abs(p0[1] - p1[1]) < S * 1.5) {
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke()
    } else { ctx.beginPath(); ctx.arc(p0[0], p0[1], r2, 0, 7); ctx.fill() }
    // glans bovenop de buis
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(p0[0] - r2 * 0.25, p0[1] - r2 * 0.3, r2 * 0.35, 0, 7); ctx.fill()
    if (k.sterren && q % 3 === 0) { NK.ster(ctx, p0[0], p0[1], r2 * 0.5, 'rgba(255,255,255,0.8)') }
  }
  // kop
  var kp = punten[0], kr = S * 0.46
  ctx.shadowColor = k.a; ctx.shadowBlur = S * 0.7
  var gr = ctx.createRadialGradient(kp[0] - kr * 0.3, kp[1] - kr * 0.3, kr * 0.1, kp[0], kp[1], kr)
  gr.addColorStop(0, k.kop); gr.addColorStop(0.6, k.regenboog ? kleurOp(k, 0) : k.a); gr.addColorStop(1, k.regenboog ? kleurOp(k, 0.2) : k.a)
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(kp[0], kp[1], kr, 0, 7); ctx.fill()
  ctx.shadowBlur = 0
  if (k.glans) { ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + Math.sin(tijd * 5) * 0.3) + ')'; ctx.beginPath(); ctx.arc(kp[0] - kr * 0.35, kp[1] - kr * 0.4, kr * 0.18, 0, 7); ctx.fill() }
  // oogjes die de kant op kijken waar je heen gaat
  var r = s.r, dx = KS.DX[r], dy = KS.DY[r], zx = -dy, zy = dx
  ;[-1, 1].forEach(function (kant) {
    var ex = kp[0] + dx * kr * 0.28 + zx * kr * 0.38 * kant, ey = kp[1] + dy * kr * 0.28 + zy * kr * 0.38 * kant
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex, ey, kr * 0.26, 0, 7); ctx.fill()
    ctx.fillStyle = '#10102a'; ctx.beginPath(); ctx.arc(ex + dx * kr * 0.1, ey + dy * kr * 0.1, kr * 0.13, 0, 7); ctx.fill()
  })
  ctx.restore()
  // magneet: ring om de kop
  if (s.effect.magneet > 0) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,90,90,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([S * 0.2, S * 0.15]); ctx.lineDashOffset = tijd * 30
    ctx.beginPath(); ctx.arc(kp[0], kp[1], S * 2.3, 0, 7); ctx.stroke(); ctx.restore()
  }
  if (spook) NK.vlek(ctx, kp[0], kp[1], S * 1.4, '#ff4fd8', 0.3)
  // spoor van vonkjes achter de kop
  if (opBord && !D.rustig && Math.random() < (k.vonk ? 0.9 : 0.45)) {
    var achter = punten[Math.min(1, n - 1)]
    fx.punt({ x: achter[0] + (Math.random() - 0.5) * S * 0.3, y: achter[1] + (Math.random() - 0.5) * S * 0.3, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, t: 0, max: 0.45, r: S * 0.06, col: k.regenboog ? kleurOp(k, Math.random()) : k.a, zwaarte: 0 })
  }
}

// ── hoofdlus ──
var vorige = performance.now(), invoer
function frame(nu) {
  var dt = Math.min(0.05, (nu - vorige) / 1000); vorige = nu; tijd += dt
  if (invoer) invoer.pad()
  ctx.setTransform(C.dpr, 0, 0, C.dpr, 0, 0)
  schok.rustig = D.rustig
  NK.achtergrond(ctx, C.W, C.H, tijd, 210, D.rustig)
  if (!s && modus === 'menu') startDemo()
  if (s) {
    var tikDuur = 1 / KS.snelheid(s)
    if (modus === 'aftellen') {
      var oud = Math.ceil(aftel); aftel -= dt
      if (Math.ceil(aftel) !== oud && aftel > 0) G.tel(Math.ceil(aftel))
      if (aftel <= 0) { modus = 'spelen'; G.tel(0) }
    } else if (modus === 'spelen' || (demo && modus === 'menu')) {
      if (demo) {
        if (demoOpnieuw > 0) { demoOpnieuw -= dt; if (demoOpnieuw <= 0) startDemo() }
        else { acc += dt; while (acc >= tikDuur && !s.over) { acc -= tikDuur; var r = demoKeuze(); if (r != null) wachtrij = [r]; tik() } }
      } else {
        acc += dt
        while (acc >= tikDuur && modus === 'spelen') { acc -= tikDuur; tik(); tikDuur = 1 / KS.snelheid(s) }
        bewaarKlok += dt
        if (bewaarKlok > 0.5) { bewaarKlok = 0; bewaarBezig() }
        if (Math.random() < 0.1) hudBij()
      }
    }
    var a = modus === 'spelen' || demo ? Math.min(1, acc / tikDuur) : 1
    var sk = schok.stap(dt)
    ctx.save(); ctx.translate(sk[0], sk[1])
    tekenVeld(); tekenDingen()
    if (modus !== 'boem' && modus !== 'einde') tekenKomeet(a, true)
    fx.teken(ctx, dt)
    ctx.restore()
    if (modus === 'aftellen') {
      var getal = Math.ceil(aftel), f = aftel - Math.floor(aftel)
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = Math.round(Math.min(C.W, C.H) * 0.22 * (0.8 + f * 0.4)) + 'px "Russo One", system-ui'
      ctx.globalAlpha = Math.min(1, f * 2); ctx.shadowColor = '#3ef0ff'; ctx.shadowBlur = 30; ctx.fillStyle = '#ffffff'
      ctx.fillText(getal > 0 ? String(getal) : '', C.W / 2, C.H / 2); ctx.restore()
    }
  }
  requestAnimationFrame(frame)
}

// ── invoer ──
invoer = NK.invoer($('c'), {
  richting: function (r) { stuur(r) },
  herhaal: false,
  toets: function (e) { if (e.code === 'Escape' || e.code === 'KeyP') pauze() },
  knop: function (k) { if (k === 'b' || k === 'y') pauze(); if (k === 'a' && modus === 'einde') $('nogeens').click() },
})
document.addEventListener('visibilitychange', function () { if (document.hidden && modus === 'spelen') pauze() })
function pauze() {
  if (modus !== 'spelen' && modus !== 'aftellen') return
  modus = 'pauze'; bewaarBezig()
  $('p-geluid').classList.toggle('aan', D.geluid)
  toonScherm('pauzescherm')
}
$('pauze').onclick = function (e) { e.stopPropagation(); pauze() }
$('hervat').onclick = function () { Geluid.klik(); start() }
$('stop').onclick = function () { Geluid.klik(); bewaarBezig(); s = null; if (BELONING) NK.naarOuder('komeetstaart-gameover'); else toonMenu() }
$('p-geluid').onclick = function () { D.geluid = !D.geluid; D.bewaar(); this.classList.toggle('aan', D.geluid) }
$('naarmenu').onclick = function () { Geluid.klik(); bewaarBezig(); s = null; toonMenu() }

// ── schermen ──
var huidig = 'menu'
function toonScherm(id) {
  huidig = id
  ;['menu', 'pauzescherm', 'einde', 'winkel', 'uitleg'].forEach(function (x) { $(x).classList.toggle('aan', x === id) })
  var inSpel = id === null
  $('hud').classList.toggle('aan', inSpel || id === 'pauzescherm')
  if (!inSpel) $('tip').classList.remove('aan')
  $('menutop').classList.toggle('aan', !inSpel && id !== 'einde' && id !== 'pauzescherm' && !BELONING)
  $('topmunten').textContent = D.munten
  $('naarmenu').style.visibility = BELONING ? 'hidden' : ''
}
function toonMenu() {
  modus = 'menu'; if (s && !demo) s = null
  var bezig = D.bezig && D.bezig.slang
  $('verder').classList.toggle('verborgen', !bezig)
  if (bezig) $('verder').textContent = 'Verder (' + D.bezig.score + ' sterrenstof)'
  $('speel').className = bezig ? 'knop2' : 'knop'
  $('speel').textContent = bezig ? 'Nieuw potje' : 'Spelen'
  $('menurecord').innerHTML = D.record ? 'Jouw record: <strong>' + D.record + '</strong> sterrenstof' : ''
  $('s-geluid').classList.toggle('aan', D.geluid); $('s-rustig').classList.toggle('aan', D.rustig)
  toonScherm('menu')
}
$('terug').onclick = function () { Geluid.klik(); if (huidig === 'menu') NK.naarOuder('komeetstaart-terug'); else toonMenu() }
$('verder').onclick = function () { Geluid.klik(); s = null; hervat() }
$('speel').onclick = function () {
  Geluid.klik(); s = null
  if (!D.uitlegGezien) { D.uitlegGezien = true; D.bewaar(); naUitleg = nieuwPotje; naarUitleg(); return }
  nieuwPotje()
}
$('nogeens').onclick = function () { Geluid.klik(); s = null; nieuwPotje() }
$('eindmenu').onclick = function () { Geluid.klik(); s = null; toonMenu() }
$('naarwinkel').onclick = function () { Geluid.klik(); tekenWinkel(); toonScherm('winkel') }
$('naaruitleg').onclick = function () { Geluid.klik(); naUitleg = toonMenu; naarUitleg() }
$('s-geluid').onclick = function () { D.geluid = !D.geluid; D.bewaar(); this.classList.toggle('aan', D.geluid); Geluid.klik() }
$('s-rustig').onclick = function () { D.rustig = !D.rustig; D.bewaar(); this.classList.toggle('aan', D.rustig); Geluid.klik() }

// ── uitleg ──
var naUitleg = null
function naarUitleg() {
  var regels = [
    ['komeet', 'Veeg of gebruik de pijltjes om je komeet te sturen.'],
    ['stof', 'Eet sterrenstof: je wordt langer en sneller. Elke 5 is een munt.'],
    ['rots', 'Raak geen planetoïden en niet je eigen staart.'],
    ['rand', 'Ga je door de rand, dan kom je aan de andere kant weer binnen.'],
    ['traag', 'Klok: alles gaat even langzamer.'],
    ['spook', 'Spook: je kunt even door je eigen staart.'],
    ['magneet', 'Magneet: sterrenstof in de buurt vliegt naar je toe.'],
    ['goud', 'Gouden ster: 5 punten en je staart wordt korter.'],
  ]
  var l = $('uitleglijst'); l.innerHTML = ''
  regels.forEach(function (rg) {
    var d = document.createElement('div'); d.className = 'regel'
    var c = document.createElement('canvas'); c.width = 80; c.height = 80
    var g = c.getContext('2d'); g.fillStyle = 'rgba(62,240,255,0.08)'; NK.rondRect(g, 3, 3, 74, 74, 14); g.fill()
    g.save(); g.translate(40, 40)
    if (KRACHT[rg[0]]) { var q = KRACHT[rg[0]]; g.shadowColor = q.k; g.shadowBlur = 14; g.fillStyle = NK.hexA(q.k, 0.3); g.beginPath(); g.arc(0, 0, 26, 0, 7); g.fill(); g.strokeStyle = q.k; g.lineWidth = 3; g.stroke(); g.shadowBlur = 0; krachtIcoon(g, rg[0], 13) }
    if (rg[0] === 'stof') { g.shadowColor = '#ffc83d'; g.shadowBlur = 16; NK.ster(g, 0, 0, 24, '#ffd96b') }
    if (rg[0] === 'komeet') { var k = komeet(); for (var i = 3; i >= 1; i--) { g.fillStyle = kleurOp(k, i / 3); g.beginPath(); g.arc(-i * 12 + 6, 0, 10 - i * 1.5, 0, 7); g.fill() } g.shadowColor = k.a; g.shadowBlur = 14; g.fillStyle = k.a; g.beginPath(); g.arc(12, 0, 15, 0, 7); g.fill() }
    if (rg[0] === 'rots') { g.fillStyle = '#5d5088'; g.beginPath(); for (var p = 0; p < 9; p++) { var h = p / 9 * 7; g.lineTo(Math.cos(h) * (22 + (p % 3) * 4), Math.sin(h) * (22 + (p % 3) * 4)) } g.fill(); g.strokeStyle = 'rgba(200,180,255,0.6)'; g.stroke() }
    if (rg[0] === 'rand') { g.strokeStyle = '#3ef0ff'; g.lineWidth = 3; g.setLineDash([8, 6]); g.strokeRect(-26, -26, 52, 52); g.setLineDash([]); g.fillStyle = '#3ef0ff'; g.beginPath(); g.moveTo(14, 0); g.lineTo(30, 0); g.lineTo(24, -6); g.moveTo(30, 0); g.lineTo(24, 6); g.strokeStyle = '#fff'; g.stroke() }
    g.restore()
    var s2 = document.createElement('span'); s2.textContent = rg[1]
    d.appendChild(c); d.appendChild(s2); l.appendChild(d)
  })
  toonScherm('uitleg')
}
$('snapik').onclick = function () { Geluid.klik(); var f = naUitleg || toonMenu; naUitleg = null; f() }

// ── winkel ──
function tekenWinkel() {
  $('winkelmunten').textContent = D.munten; $('topmunten').textContent = D.munten
  NK.winkel($('lijst'), KOMETEN, D, 'kometen', 'komeet', function (g, k) {
    for (var i = 6; i >= 1; i--) {
      var f = i / 6
      g.fillStyle = k.regenboog ? 'hsl(' + (f * 300) + ',95%,62%)' : kleurOp(k, f)
      g.beginPath(); g.arc(70 - i * 8.5, 38 + Math.sin(i * 0.9) * 4, 4 + (1 - f) * 7, 0, 7); g.fill()
      if (k.sterren && i % 2) NK.ster(g, 70 - i * 8.5, 38 + Math.sin(i * 0.9) * 4, 3, '#fff')
    }
    g.shadowColor = k.a; g.shadowBlur = 16
    var gr = g.createRadialGradient(72, 35, 2, 75, 38, 14); gr.addColorStop(0, k.kop); gr.addColorStop(1, k.regenboog ? '#ff5a5a' : k.a)
    g.fillStyle = gr; g.beginPath(); g.arc(75, 38, 13, 0, 7); g.fill(); g.shadowBlur = 0
    g.fillStyle = '#fff'; g.beginPath(); g.arc(79, 33, 3.5, 0, 7); g.arc(79, 43, 3.5, 0, 7); g.fill()
    g.fillStyle = '#10102a'; g.beginPath(); g.arc(80.5, 33, 1.8, 0, 7); g.arc(80.5, 43, 1.8, 0, 7); g.fill()
  }, tekenWinkel)
}

// ── start ──
if (BELONING) { if (!hervat()) nieuwPotje() }
else toonMenu()
requestAnimationFrame(frame)
})()
