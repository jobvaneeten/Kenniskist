// Kristalsmelt: scherm, besturing, effecten, winkel en opslag. Spelregels in kern.js.
(function () {
'use strict'
var $ = function (id) { return document.getElementById(id) }
var BELONING = NK.BELONING
var Geluid = NK.Geluid

// ── opslag ──
// bezig: het bord waar je mee bezig was (na elke zet bewaard)
var D = NK.opslag('kk_km', { munten: 0, record: 0, hoogste: 0, sets: ['neon'], set: 'neon', geluid: true, rustig: false, uitlegGezien: false, bezig: null })
Geluid.zetAan(function () { return D.geluid })

var SETS = [
  { id: 'neon', naam: 'Neon', prijs: 0, k: ['#9fb4d9', '#3ef0ff', '#4fffa0', '#4f8dff', '#ff4fd8', '#ffc83d', '#ff8a3d', '#fff3a0', '#b06bff'] },
  { id: 'snoep', naam: 'Snoep', prijs: 80, k: ['#ffd1e8', '#ff8ad8', '#ffb36b', '#8de9ff', '#c39bff', '#ffe36b', '#7dffb0', '#fffbe0', '#ff6bb5'] },
  { id: 'ijs', naam: 'IJs', prijs: 150, k: ['#c9d8ee', '#9fe8ff', '#7dd3ff', '#5aa8ff', '#a8b8ff', '#e8f6ff', '#6fc8ff', '#ffffff', '#8d9bff'] },
  { id: 'lava', naam: 'Lava', prijs: 220, k: ['#a08080', '#ff8a3d', '#ff5a3d', '#ff3d7a', '#ffbf3d', '#ffe14f', '#ff6b2a', '#fff0c0', '#d43dff'] },
  { id: 'jungle', naam: 'Jungle', prijs: 320, k: ['#a8c4a0', '#8dff4f', '#3dffb0', '#ffd23d', '#4fffe0', '#d0ff4f', '#ff9a3d', '#fffbd0', '#3dff7a'] },
  { id: 'regenboog', naam: 'Regenboog', prijs: 450, k: null },
]
function kleur(v, t) {
  var set = SETS.find(function (x) { return x.id === D.set }) || SETS[0]
  if (!set.k) return 'hsl(' + ((v * 40 + (t || 0) * 30) % 360 | 0) + ',95%,64%)'
  return set.k[v]
}
function naarRgb(col) {
  if (col[0] === '#') return col
  var m = /hsl\((\d+),(\d+)%,(\d+)%\)/.exec(col), h = +m[1] / 360, s2 = +m[2] / 100, l = +m[3] / 100
  var q = l < 0.5 ? l * (1 + s2) : l + s2 - l * s2, p = 2 * l - q
  var f = function (t) { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p }
  var hx = function (x) { return ('0' + Math.round(x * 255).toString(16)).slice(-2) }
  return '#' + hx(f(h + 1 / 3)) + hx(f(h)) + hx(f(h - 1 / 3))
}

// ── geluid ──
var TOON = [392, 440, 523, 587, 659, 784, 880, 1047, 1319]
var G = {
  leg: function () { Geluid.toon(330, 0.08, 'triangle', 0.1); Geluid.ruis(0.05, 0.05, 2500, 1) },
  smelt: function (v, keten) { var f = TOON[v] * (1 + (keten - 1) * 0.06); Geluid.toon(f, 0.3, 'triangle', 0.16); Geluid.toon(f * 1.5, 0.25, 'sine', 0.07, 0.05); Geluid.toon(f * 2, 0.2, 'sine', 0.04, 0.1) },
  bom: function () { Geluid.ruis(0.45, 0.22, 300, 0.6); Geluid.toon(120, 0.4, 'sawtooth', 0.08, 0, 40) },
  joker: function () { [784, 988, 1175, 1568].forEach(function (f, i) { Geluid.toon(f, 0.14, 'sine', 0.08, i * 0.04) }) },
  wissel: function () { Geluid.toon(600, 0.08, 'sine', 0.08, 0, 900) },
  niet: function () { Geluid.toon(160, 0.1, 'sine', 0.1, 0, 120) },
  vol: function () { Geluid.toon(400, 0.7, 'sine', 0.16, 0, 90) },
}

// ── canvas ──
var C = NK.canvas($('c'), function () { if (C) plaats() })
var ctx = C.ctx, S = 60, ox = 0, oy = 0
function plaats() {
  var boven = 100, onder = 160
  S = Math.floor(Math.min((C.W - 24) / KM.N, (C.H - boven - onder) / KM.N, 96))
  ox = Math.round((C.W - S * KM.N) / 2); oy = Math.round(boven + (C.H - boven - onder - S * KM.N) / 2)
}
function cx(i) { return ox + (i % KM.N) * S + S / 2 }
function cy(i) { return oy + ((i / KM.N) | 0) * S + S / 2 }

// ── stukken tekenen ──
function stuk(g, v, x, y, r, t, schaal) {
  if (v === -1) return
  schaal = schaal == null ? 1 : schaal
  if (schaal <= 0) return
  g.save(); g.translate(x, y); g.scale(schaal, schaal)
  if (v === 'bom') { bom(g, r, t); g.restore(); return }
  if (v === 'joker') { joker(g, r, t); g.restore(); return }
  var col = kleur(v, t), rgb = naarRgb(col), rr = r * (0.58 + v * 0.045)
  NK.vlek(g, 0, 0, rr * 1.9, rgb, 0.22 + v * 0.02)
  g.shadowColor = rgb; g.shadowBlur = rr * 0.6
  var gr = g.createLinearGradient(-rr, -rr, rr, rr)
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, rgb); gr.addColorStop(1, NK.hexA(rgb, 0.55))
  g.fillStyle = gr; g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = Math.max(1, rr * 0.06)
  var draai = t * 0.6
  if (v === 0) {
    // stof: drie lichtpuntjes
    g.shadowBlur = rr * 0.8
    for (var k = 0; k < 3; k++) { var h = draai * 1.5 + k * 2.09; g.beginPath(); g.arc(Math.cos(h) * rr * 0.38, Math.sin(h) * rr * 0.38, rr * 0.24, 0, 7); g.fill() }
  } else if (v === 1) {
    g.beginPath(); g.moveTo(0, -rr); g.lineTo(rr * 0.75, rr * 0.7); g.lineTo(-rr * 0.75, rr * 0.7); g.closePath(); g.fill(); g.stroke()
    g.shadowBlur = 0; g.beginPath(); g.moveTo(0, -rr); g.lineTo(0, rr * 0.7); g.globalAlpha = 0.4; g.stroke()
  } else if (v === 2) {
    g.beginPath(); for (var a = 0; a < 6; a++) { var hh = a * Math.PI / 3 + Math.PI / 6; g.lineTo(Math.cos(hh) * rr * 0.72, Math.sin(hh) * rr) } g.closePath(); g.fill(); g.stroke()
    g.shadowBlur = 0; g.globalAlpha = 0.35; g.beginPath(); g.moveTo(-rr * 0.62, -rr * 0.5); g.lineTo(0, -rr * 0.15); g.lineTo(rr * 0.62, -rr * 0.5); g.moveTo(0, -rr * 0.15); g.lineTo(0, rr); g.stroke()
  } else if (v === 3) {
    g.beginPath(); g.moveTo(0, -rr); g.lineTo(rr * 0.8, -rr * 0.15); g.lineTo(0, rr); g.lineTo(-rr * 0.8, -rr * 0.15); g.closePath(); g.fill(); g.stroke()
    g.shadowBlur = 0; g.globalAlpha = 0.4; g.beginPath(); g.moveTo(-rr * 0.8, -rr * 0.15); g.lineTo(rr * 0.8, -rr * 0.15); g.moveTo(-rr * 0.3, -rr * 0.15); g.lineTo(0, rr); g.lineTo(rr * 0.3, -rr * 0.15); g.stroke()
  } else if (v === 4) {
    g.beginPath(); for (var b = 0; b < 8; b++) { var h4 = b * Math.PI / 4 + Math.PI / 8; g.lineTo(Math.cos(h4) * rr, Math.sin(h4) * rr) } g.closePath(); g.fill(); g.stroke()
    g.shadowBlur = 0; g.globalAlpha = 0.45; g.beginPath()
    for (var c2 = 0; c2 < 8; c2++) { var h5 = c2 * Math.PI / 4 + Math.PI / 8; g.moveTo(Math.cos(h5) * rr, Math.sin(h5) * rr); g.lineTo(Math.cos(h5 + Math.PI / 8) * rr * 0.45, Math.sin(h5 + Math.PI / 8) * rr * 0.45) }
    g.stroke()
  } else if (v === 5) {
    g.rotate(Math.sin(t * 1.2) * 0.12)
    g.beginPath(); for (var d = 0; d < 10; d++) { var h6 = d * Math.PI / 5 - Math.PI / 2, r6 = d % 2 ? rr * 0.45 : rr * 1.05; g.lineTo(Math.cos(h6) * r6, Math.sin(h6) * r6) } g.closePath(); g.fill(); g.stroke()
  } else if (v === 6) {
    var bol = g.createRadialGradient(-rr * 0.3, -rr * 0.3, rr * 0.1, 0, 0, rr * 0.8); bol.addColorStop(0, '#ffffff'); bol.addColorStop(0.4, rgb); bol.addColorStop(1, NK.hexA(rgb, 0.4))
    g.fillStyle = bol; g.beginPath(); g.arc(0, 0, rr * 0.72, 0, 7); g.fill()
    g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = rr * 0.1
    g.beginPath(); g.ellipse(0, 0, rr * 1.15, rr * 0.32, -0.35, Math.PI * 0.95, Math.PI * 2.05); g.stroke()
  } else if (v === 7) {
    g.rotate(draai)
    g.globalAlpha = 0.8
    for (var e = 0; e < 12; e++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(rr * 0.6, -rr * 0.08); g.lineTo(rr * 1.08, 0); g.lineTo(rr * 0.6, rr * 0.08); g.fill() }
    g.globalAlpha = 1
    var zon = g.createRadialGradient(0, 0, 0, 0, 0, rr * 0.7); zon.addColorStop(0, '#ffffff'); zon.addColorStop(0.5, rgb); zon.addColorStop(1, NK.hexA(rgb, 0.6))
    g.fillStyle = zon; g.beginPath(); g.arc(0, 0, rr * 0.66, 0, 7); g.fill()
  } else {
    // sterrenstelsel: draaiende spiraalarmen
    g.rotate(t * 0.8)
    for (var arm = 0; arm < 3; arm++) for (var p = 0; p < 14; p++) {
      var f = p / 14, h8 = arm * 2.09 + f * 3.4, rp = f * rr * 1.05
      g.globalAlpha = 1 - f * 0.6; g.fillStyle = p % 3 ? rgb : '#ffffff'
      g.beginPath(); g.arc(Math.cos(h8) * rp, Math.sin(h8) * rp, rr * (0.12 - f * 0.07), 0, 7); g.fill()
    }
    g.globalAlpha = 1; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, rr * 0.22, 0, 7); g.fill()
  }
  g.globalAlpha = 1; g.shadowBlur = 0
  if (v > 0 && v < 8) { g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(-rr * 0.28, -rr * 0.35, rr * 0.1, 0, 7); g.fill() }
  g.restore()
}
function bom(g, r, t) {
  var rr = r * 0.6
  NK.vlek(g, 0, 0, rr * 1.8, '#ff5a5a', 0.3)
  var gr = g.createRadialGradient(-rr * 0.3, -rr * 0.3, rr * 0.1, 0, 0, rr); gr.addColorStop(0, '#6b6b8a'); gr.addColorStop(1, '#14142a')
  g.fillStyle = gr; g.beginPath(); g.arc(0, rr * 0.1, rr * 0.8, 0, 7); g.fill()
  g.strokeStyle = '#ff9a3d'; g.lineWidth = rr * 0.12; g.lineCap = 'round'
  g.beginPath(); g.moveTo(rr * 0.35, -rr * 0.5); g.quadraticCurveTo(rr * 0.6, -rr * 0.95, rr * 0.9, -rr * 0.8); g.stroke()
  NK.ster(g, rr * 0.92, -rr * 0.82, rr * (0.22 + Math.sin(t * 20) * 0.06), '#ffe14f')
}
function joker(g, r, t) {
  var rr = r * 0.62
  for (var k = 0; k < 6; k++) {
    g.fillStyle = 'hsl(' + ((k * 60 + t * 120) % 360) + ',95%,62%)'
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, rr, k * Math.PI / 3 + t, (k + 1) * Math.PI / 3 + t); g.closePath(); g.fill()
  }
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(0, 0, rr * 0.38, 0, 7); g.fill()
  NK.ster(g, 0, 0, rr * 0.3, '#ff4fd8')
}

// ── toestand ──
var s = null, vis = null, vorigeZet = null, demo = false, bezig = [], cursor = 14, cursorZicht = false, muis = -1
var fx = NK.deeltjes(), schok = NK.schok(), tijd = 0, popT = {}, verdiend = 0, demoKlok = 0

function nieuwPotje() { s = KM.nieuw((Math.random() * 4294967296) >>> 0); verdiend = 0; start() }
function start() {
  demo = false; vis = s.c.slice(); bezig = []; vorigeZet = null; popT = {}; fx.leeg(); plaats()
  toonScherm(null)
  $('tip').classList.toggle('aan', s.zetten < 2)
  hudBij(); bewaarBezig()
}
function hervat() {
  var z = D.bezig
  if (!z || !z.c || z.c.length !== KM.N * KM.N) return false
  s = z; verdiend = z.verdiend || 0; start()
  if (s.zetten) melding('Je gaat verder waar je was.')
  return true
}
function bewaarBezig() {
  if (demo || !s) return
  if (s.over) D.bezig = null
  else { s.verdiend = verdiend; D.bezig = s }
  D.bewaar()
}

// ── zetten ──
function leg(i) {
  if (!s || s.over || bezig.length || (huidig && !demo)) return
  if (!KM.magLeggen(s, i)) { G.niet(); popT[i] = -0.25; melding(s.huidig === 'bom' ? 'De bom moet op een kristal.' : 'Dat vakje is al bezet.'); return }
  var oud = KM.kopie(s)
  var u = KM.leg(s, i)
  if (!u.ok) return
  if (!demo) vorigeZet = oud
  $('tip').classList.remove('aan'); verbergMelding()
  speelAf(u.ev)
  if (!demo) { hudBij(); bewaarBezig() }
}
// gebeurtenissen na elkaar afspelen (invoer wacht tot alles klaar is)
function speelAf(ev) {
  var t = 0
  ev.forEach(function (e) {
    if (e.t === 'leg') bezig.push({ t: t, e: e })
    else if (e.t === 'joker') { bezig.push({ t: t, e: e }); t += 0.25 }
    else if (e.t === 'bom') { bezig.push({ t: t, e: e }); t += 0.3 }
    else if (e.t === 'smelt') { t += 0.2; bezig.push({ t: t, e: e }); t += 0.3 }
    else if (e.t === 'vol') { t += 0.4; bezig.push({ t: t, e: e }) }
  })
  bezig.push({ t: t + 0.05, e: { t: 'klaar' } })
  bezig.klok = 0
}
var vliegers = []
function stapAnimatie(dt) {
  if (!bezig.length) return
  bezig.klok += dt
  while (bezig.length && bezig[0].t <= bezig.klok) {
    var e = bezig.shift().e
    if (e.t === 'leg') { vis[e.i] = e.v; popT[e.i] = 0; if (!demo) G.leg(); fx.spat(cx(e.i), cy(e.i), 6, naarRgb(kleur(e.v, tijd)), S * 1.5, { maat: S * 0.03 }) }
    if (e.t === 'joker') { if (!demo) G.joker(); fx.spat(cx(e.i), cy(e.i), 18, 'hsl(' + (Math.random() * 360 | 0) + ',95%,65%)', S * 3, { ster: true, maat: S * 0.05 }) }
    if (e.t === 'bom') {
      vis[e.i] = -1; if (!demo) { G.bom(); schok.voeg(0.45) }
      fx.spat(cx(e.i), cy(e.i), 30, '#ff9a3d', S * 5, { maat: S * 0.05 }); fx.spat(cx(e.i), cy(e.i), 16, naarRgb(kleur(e.v, tijd)), S * 4, { ster: true, maat: S * 0.05 })
    }
    if (e.t === 'smelt') {
      e.van.forEach(function (j) { vliegers.push({ van: j, naar: e.naar, v: vis[j], t: 0 }); vis[j] = -1 })
      ;(function (e) { setTimeout(function () { klaarSmelt(e) }, 200) })(e)
    }
    if (e.t === 'vol') { if (!demo) { G.vol(); schok.voeg(0.3) } }
    if (e.t === 'klaar') {
      vis = s.c.slice()
      if (s.over) { if (demo) demoKlok = 2; else setTimeout(eindScherm, 900) }
    }
  }
}
function klaarSmelt(e) {
  vis[e.naar] = e.v; popT[e.naar] = 0
  var col = naarRgb(kleur(e.v, tijd))
  fx.spat(cx(e.naar), cy(e.naar), 14 + e.v * 3, col, S * (2.5 + e.v * 0.4), { ster: e.v >= 3, maat: S * 0.05 })
  if (demo) return
  G.smelt(e.v, e.keten)
  schok.voeg(0.08 + e.v * 0.04)
  var munt = Math.max(0, e.v - 1)
  if (munt) { D.munten += munt; verdiend += munt; D.bewaar() }
  fx.tekst(cx(e.naar), cy(e.naar) - S * 0.5, e.keten > 1 ? 'Ketting x' + e.keten + '!' : KM.NAMEN[e.v] + '!', e.keten > 1 ? '#ffe08a' : col, S * (0.32 + Math.min(e.v, 6) * 0.03))
  if (munt) fx.tekst(cx(e.naar), cy(e.naar) + S * 0.1, '+' + munt + ' munt', '#ffc83d', S * 0.26)
  if (e.v > D.hoogste) { D.hoogste = e.v; D.bewaar(); if (e.v >= 4) melding('Nieuw: ' + KM.NAMEN[e.v] + '!') }
  hudBij()
}
function wissel() {
  if (!s || s.over || bezig.length || demo) return
  if (!KM.wissel(s)) { G.niet(); melding('Je kunt één keer per beurt wisselen.'); return }
  G.wissel(); vorigeZet = null; hudBij(); bewaarBezig()
}
function zetTerug() {
  if (!vorigeZet || bezig.length || demo || !s || s.over) return
  s = vorigeZet; vorigeZet = null; vis = s.c.slice(); Geluid.toon(520, 0.08, 'sine', 0.1, 0, 380)
  hudBij(); bewaarBezig()
}

// ── HUD ──
function teken(id, v, maat) {
  var c = $(id), g = c.getContext('2d')
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height)
  if (v === null || v === undefined) {
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.setLineDash([6, 6]); g.lineWidth = 2; NK.rondRect(g, 10, 10, c.width - 20, c.height - 20, 14); g.stroke(); return
  }
  stuk(g, v, c.width / 2, c.height / 2, maat || c.width * 0.42, tijd)
}
function naamVan(v) { return v === 'bom' ? 'Bom' : v === 'joker' ? 'Regenboog' : KM.NAMEN[v] }
function hudBij() {
  if (!s) return
  $('score').textContent = s.score
  $('record').textContent = D.record ? 'Record ' + Math.max(D.record, s.score) : ''
  $('nunaam').textContent = naamVan(s.huidig)
  $('opzij').disabled = !s.mocht
  $('terugzet').disabled = !vorigeZet
}
function eindScherm() {
  var nieuw = s.score > D.record
  if (nieuw) D.record = s.score
  D.bezig = null; D.bewaar()
  $('eindscore').textContent = s.score
  $('nieuwrecord').classList.toggle('verborgen', !nieuw)
  $('hoogstenaam').textContent = KM.NAMEN[s.hoogste]
  teken('c-hoogste', s.hoogste, 46)
  $('verdiend').innerHTML = verdiend ? 'Verdiend: <span class="munt">' + verdiend + '</span>' : ''
  $('eindmenu').classList.toggle('verborgen', BELONING)
  if (nieuw) Geluid.win()
  toonScherm('einde')
}

// ── demo achter het menu ──
function startDemo() { s = KM.nieuw((Math.random() * 1e9) >>> 0); demo = true; vis = s.c.slice(); bezig = []; demoKlok = 0.8; plaats() }
function demoZet() {
  var beste = -1, sc = -1
  for (var i = 0; i < s.c.length; i++) {
    if (!KM.magLeggen(s, i)) continue
    var t = KM.kopie(s); KM.leg(t, i)
    var w = t.score + Math.random() * 3
    if (w > sc) { sc = w; beste = i }
  }
  if (beste >= 0) leg(beste); else startDemo()
}

// ── tekenen ──
function tekenBord(dt) {
  var w = KM.N * S
  NK.vlek(ctx, ox + w / 2, oy + w / 2, w * 0.8, '#c77dff', 0.18)
  ctx.save()
  ctx.fillStyle = 'rgba(10,8,30,0.6)'; NK.rondRect(ctx, ox - S * 0.12, oy - S * 0.12, w + S * 0.24, w + S * 0.24, S * 0.3); ctx.fill()
  ctx.strokeStyle = 'rgba(199,125,255,0.6)'; ctx.lineWidth = Math.max(2, S * 0.05); ctx.shadowColor = '#c77dff'; ctx.shadowBlur = S * 0.4; ctx.stroke()
  ctx.restore()
  // wat smelt er als je hier legt? (muis of cursor)
  var kijk = cursorZicht ? cursor : muis, groep = []
  if (s && kijk >= 0 && !bezig.length && !demo && KM.magLeggen(s, kijk) && s.huidig !== 'bom') {
    var t = KM.kopie(s); t.c[kijk] = s.huidig === 'joker' ? KM.jokerWaarde(s, kijk) : s.huidig
    groep = KM.groep(t, kijk); if (groep.length < 3) groep = []
  }
  for (var i = 0; i < KM.N * KM.N; i++) {
    var x = ox + (i % KM.N) * S, y = oy + ((i / KM.N) | 0) * S
    var licht = groep.indexOf(i) >= 0
    ctx.fillStyle = licht ? 'rgba(199,125,255,' + (0.18 + Math.sin(tijd * 8) * 0.06) + ')' : (i % KM.N + (i / KM.N | 0)) % 2 ? 'rgba(160,140,255,0.08)' : 'rgba(160,140,255,0.05)'
    NK.rondRect(ctx, x + 3, y + 3, S - 6, S - 6, S * 0.18); ctx.fill()
    if (i === kijk && !demo && s && !s.over) {
      ctx.save(); ctx.strokeStyle = KM.magLeggen(s, i) ? '#ffffff' : 'rgba(255,90,122,0.8)'; ctx.lineWidth = 2.5; ctx.setLineDash([S * 0.12, S * 0.08]); ctx.lineDashOffset = -tijd * 20
      NK.rondRect(ctx, x + 3, y + 3, S - 6, S - 6, S * 0.18); ctx.stroke(); ctx.restore()
      if (vis[i] < 0 && s.huidig !== 'bom') { ctx.globalAlpha = 0.35; stuk(ctx, s.huidig === 'joker' ? 'joker' : s.huidig, cx(i), cy(i), S * 0.45, tijd); ctx.globalAlpha = 1 }
    }
  }
  // stukken met een veerkrachtige plop als ze verschijnen
  for (var j = 0; j < vis.length; j++) {
    if (vis[j] < 0) continue
    var sch = 1
    if (popT[j] != null) {
      popT[j] += dt
      var p = popT[j] / 0.32
      if (popT[j] < 0) sch = 1 + Math.sin(popT[j] * 60) * 0.05
      else if (p >= 1) delete popT[j]
      else { var c1 = 1.70158 * 1.4, c3 = c1 + 1; sch = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2) }
    }
    var bob = D.rustig ? 0 : Math.sin(tijd * 2 + j) * S * 0.02
    stuk(ctx, vis[j], cx(j), cy(j) + bob, S * 0.45, tijd + j * 0.3, sch)
  }
  // stukken die naar het nieuwe stuk vliegen
  for (var k = vliegers.length - 1; k >= 0; k--) {
    var vl = vliegers[k]; vl.t += dt
    var f = Math.min(1, vl.t / 0.2), e2 = f * f
    stuk(ctx, vl.v, cx(vl.van) + (cx(vl.naar) - cx(vl.van)) * e2, cy(vl.van) + (cy(vl.naar) - cy(vl.van)) * e2, S * 0.45, tijd, 1 - f * 0.6)
    if (f >= 1) vliegers.splice(k, 1)
  }
  if (s && s.over && !bezig.length) { ctx.fillStyle = 'rgba(5,4,15,0.35)'; ctx.fillRect(ox, oy, w, w) }
}

// ── hoofdlus ──
var vorige = performance.now(), invoer, hudKlok = 0
function frame(nu) {
  var dt = Math.min(0.05, (nu - vorige) / 1000); vorige = nu; tijd += dt
  if (invoer) invoer.pad()
  ctx.setTransform(C.dpr, 0, 0, C.dpr, 0, 0)
  schok.rustig = D.rustig
  NK.achtergrond(ctx, C.W, C.H, tijd, 275, D.rustig)
  if (!s && huidig === 'menu') startDemo()
  if (s) {
    stapAnimatie(dt)
    if (demo && !bezig.length) { demoKlok -= dt; if (demoKlok <= 0) { if (s.over) startDemo(); else { demoZet(); demoKlok = 0.9 } } }
    var sk = schok.stap(dt)
    ctx.save(); ctx.translate(sk[0], sk[1])
    tekenBord(dt)
    fx.teken(ctx, dt)
    ctx.restore()
    hudKlok -= dt
    if (!demo && hudKlok <= 0 && huidig === null) {
      hudKlok = 1 / 20
      teken('c-nu', s.huidig, 56); teken('c-straks', s.volgende, 38); teken('c-opzij', s.opslag, 38)
    }
  }
  requestAnimationFrame(frame)
}

// ── invoer ──
function vakOp(x, y) {
  var a = Math.floor((x - ox) / S), b = Math.floor((y - oy) / S)
  return a < 0 || b < 0 || a >= KM.N || b >= KM.N ? -1 : b * KM.N + a
}
invoer = NK.invoer($('c'), {
  tik: function (x, y) { if (!huidig && s && !demo) { cursorZicht = false; var i = vakOp(x, y); if (i >= 0) { cursor = i; leg(i) } } },
  richting: function (r) {
    if (huidig || !s || demo) return
    cursorZicht = true
    var x = cursor % KM.N + [0, 1, 0, -1][r], y = (cursor / KM.N | 0) + [-1, 0, 1, 0][r]
    if (x >= 0 && y >= 0 && x < KM.N && y < KM.N) { cursor = y * KM.N + x; Geluid.toon(1000, 0.03, 'triangle', 0.04) }
  },
  herhaal: true,
  toets: function (e) {
    if (huidig || !s) return
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); cursorZicht = true; leg(cursor) }
    if (e.code === 'KeyQ' || e.code === 'Tab') { e.preventDefault(); wissel() }
    if (e.code === 'KeyZ' || e.code === 'Backspace') { e.preventDefault(); zetTerug() }
  },
  knop: function (k) {
    if (huidig || !s) return
    if (k === 'a') { cursorZicht = true; leg(cursor) }
    if (k === 'x') wissel()
    if (k === 'y') zetTerug()
  },
})
$('c').addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') { muis = vakOp(e.clientX, e.clientY); cursorZicht = false } })
$('c').addEventListener('pointerleave', function () { muis = -1 })
$('opzij').onclick = wissel
$('terugzet').onclick = zetTerug

// ── schermen ──
var huidig = 'menu'
function toonScherm(id) {
  huidig = id
  ;['menu', 'einde', 'winkel', 'uitleg'].forEach(function (x) { $(x).classList.toggle('aan', x === id) })
  var inSpel = id === null
  $('hud').classList.toggle('aan', inSpel); $('stukken').classList.toggle('aan', inSpel)
  if (!inSpel) { $('tip').classList.remove('aan'); verbergMelding() }
  $('menutop').classList.toggle('aan', !inSpel && id !== 'einde' && !BELONING)
  $('topmunten').textContent = D.munten
  $('naarmenu').style.visibility = BELONING ? 'hidden' : ''
}
function melding(t) { var m = $('melding'); m.textContent = t; m.classList.remove('aan'); void m.offsetWidth; m.classList.add('aan'); clearTimeout(melding.t); melding.t = setTimeout(verbergMelding, 2400) }
function verbergMelding() { $('melding').classList.remove('aan') }
function toonMenu() {
  if (s && !demo) s = null
  var b = D.bezig && D.bezig.c
  $('verder').classList.toggle('verborgen', !b)
  if (b) $('verder').textContent = 'Verder (' + D.bezig.score + ' punten)'
  $('speel').className = b ? 'knop2' : 'knop'
  $('speel').textContent = b ? 'Nieuw bord' : 'Spelen'
  $('menurecord').innerHTML = D.record ? 'Jouw record: <strong>' + D.record + '</strong> punten · hoogste stuk: ' + KM.NAMEN[D.hoogste] : ''
  $('s-geluid').classList.toggle('aan', D.geluid); $('s-rustig').classList.toggle('aan', D.rustig)
  toonScherm('menu')
}
$('terug').onclick = function () { Geluid.klik(); if (huidig === 'menu') NK.naarOuder('kristalsmelt-terug'); else toonMenu() }
$('naarmenu').onclick = function () { Geluid.klik(); bewaarBezig(); s = null; toonMenu() }
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
$('s-geluid').onclick = function () { D.geluid = !D.geluid; D.bewaar(); this.classList.toggle('aan', D.geluid); geluidKnop(); Geluid.klik() }
$('s-rustig').onclick = function () { D.rustig = !D.rustig; D.bewaar(); this.classList.toggle('aan', D.rustig); Geluid.klik() }
$('geluid').onclick = function () { D.geluid = !D.geluid; D.bewaar(); geluidKnop(); Geluid.klik() }
function geluidKnop() { $('golf').style.display = D.geluid ? '' : 'none'; $('geluid').style.opacity = D.geluid ? 1 : 0.55 }

// ── uitleg ──
var naUitleg = null
function naarUitleg() {
  var regels = [
    [0, 'Tik op een leeg vakje om het stuk neer te leggen.'],
    [1, 'Liggen er 3 of meer dezelfde tegen elkaar? Dan smelten ze samen tot het volgende stuk.'],
    [3, 'Dat nieuwe stuk kan ook weer samensmelten: een ketting!'],
    ['bom', 'De bom haalt één stuk van het bord.'],
    ['joker', 'De regenboog wordt vanzelf het beste stuk.'],
    ['opzij', 'Tik op Opzij om een stuk te bewaren voor later.'],
    [5, 'Is het bord vol, dan is het spel klaar.'],
  ]
  var l = $('uitleglijst'); l.innerHTML = ''
  regels.forEach(function (rg) {
    var d = document.createElement('div'); d.className = 'regel'
    var c = document.createElement('canvas'); c.width = 80; c.height = 80
    var g = c.getContext('2d'); g.fillStyle = 'rgba(199,125,255,0.08)'; NK.rondRect(g, 3, 3, 74, 74, 14); g.fill()
    if (rg[0] === 'opzij') { g.strokeStyle = 'rgba(255,255,255,0.5)'; g.setLineDash([6, 6]); g.lineWidth = 2; NK.rondRect(g, 16, 16, 48, 48, 10); g.stroke() }
    else stuk(g, rg[0], 40, 40, 30, 1)
    var t = document.createElement('span'); t.textContent = rg[1]
    d.appendChild(c); d.appendChild(t); l.appendChild(d)
  })
  var ld = $('ladder'); ld.innerHTML = ''
  KM.NAMEN.forEach(function (n, v) { var c = document.createElement('canvas'); c.width = 88; c.height = 88; c.title = n; stuk(c.getContext('2d'), v, 44, 44, 34, 1); ld.appendChild(c) })
  toonScherm('uitleg')
}
$('snapik').onclick = function () { Geluid.klik(); var f = naUitleg || toonMenu; naUitleg = null; f() }

// ── winkel ──
function tekenWinkel() {
  $('winkelmunten').textContent = D.munten; $('topmunten').textContent = D.munten
  NK.winkel($('lijst'), SETS, D, 'sets', 'set', function (g, it) {
    var echt = D.set; D.set = it.id
    ;[2, 4, 6].forEach(function (v, k) { stuk(g, v, 18 + k * 30, 38, 16, 1) })
    D.set = echt
  }, tekenWinkel)
}

// ── start ──
geluidKnop()
if (BELONING) { if (!hervat()) nieuwPotje() }
else toonMenu()
requestAnimationFrame(frame)
})()
