// Neondrift: scherm, besturing, effecten, garage, opdrachten en opslag. Regels in kern.js.
(function () {
'use strict'
var $ = function (id) { return document.getElementById(id) }
var BELONING = NK.BELONING
var Geluid = NK.Geluid

// ── opslag ──
// bezig: de rit die nog loopt (elke halve seconde bewaard), zo ga je altijd verder
var D = NK.opslag('kk_nd', {
  munten: 0, record: 0, autos: ['neon'], auto: 'neon', upg: { grip: 0, magneet: 0, schild: 0 },
  missies: null, niveau: {}, ritten: 0, geluid: true, rustig: false, bezig: null, gezien: false,
})
Geluid.zetAan(function () { return D.geluid })

var AUTOS = [
  { id: 'neon', naam: 'Neon', prijs: 0, a: '#ff4fd8', b: '#3ef0ff' },
  { id: 'lava', naam: 'Lava', prijs: 60, a: '#ff5a2a', b: '#ffd23d' },
  { id: 'gif', naam: 'Gifgroen', prijs: 100, a: '#8dff4f', b: '#1fbf8a' },
  { id: 'plasma', naam: 'Plasma', prijs: 160, a: '#9b6bff', b: '#ff4fd8' },
  { id: 'ijs', naam: 'IJsbreker', prijs: 220, a: '#bff4ff', b: '#3f8dff' },
  { id: 'nacht', naam: 'Nachtrijder', prijs: 300, a: '#1a1c3a', b: '#3ef0ff' },
  { id: 'regenboog', naam: 'Regenboog', prijs: 400, a: '#ff5a5a', b: '#5a8dff', regenboog: true },
  { id: 'goud', naam: 'Goudpijl', prijs: 550, a: '#ffd96b', b: '#fff6cf', glans: true },
]
var UPGRADES = [
  { id: 'grip', naam: 'Grip', uitleg: 'Je auto glijdt minder door in de bocht.', prijzen: [60, 120, 200, 320] },
  { id: 'magneet', naam: 'Muntmagneet', uitleg: 'Je pakt munten van verder weg.', prijzen: [50, 110, 200] },
  { id: 'schild', naam: 'Schild', uitleg: 'Val je eraf, dan zet het schild je terug op de weg.', prijzen: [150, 300] },
]
var MISSIES = [
  { id: 'afstand', tekst: 'Rijd {n} meter in één rit', n: [100, 200, 350, 500, 750, 1000, 1500] },
  { id: 'munten', tekst: 'Pak {n} munten in één rit', n: [5, 10, 20, 35, 50, 75] },
  { id: 'perfect', tekst: 'Maak {n} perfecte bochten in één rit', n: [3, 8, 15, 25, 40, 60] },
  { id: 'reeks', tekst: 'Maak {n} perfecte bochten achter elkaar', n: [2, 4, 6, 9, 12, 16] },
  { id: 'ritten', tekst: 'Rijd {n} ritten', n: [3, 5, 8, 12, 20, 30] },
]
function auto() { return AUTOS.find(function (a) { return a.id === D.auto }) || AUTOS[0] }

// ── geluid: motor die met de snelheid meezingt ──
var motor = null
function motorAan() {
  var a = Geluid.audio(); if (!a || motor || !D.geluid) return
  var o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter()
  o.type = 'sawtooth'; o.frequency.value = 60; f.type = 'lowpass'; f.frequency.value = 500; g.gain.value = 0
  o.connect(f); f.connect(g); g.connect(a.destination); o.start()
  motor = { o: o, g: g, a: a }
}
function motorBij(v, drift, aan) {
  if (!motor) return
  var t = motor.a.currentTime
  motor.o.frequency.setTargetAtTime(50 + v * 9 + drift * 25, t, 0.08)
  motor.g.gain.setTargetAtTime(aan && D.geluid ? 0.025 + drift * 0.02 : 0, t, 0.1)
}
var G = {
  munt: function () { Geluid.toon(1319, 0.08, 'triangle', 0.12); Geluid.toon(1760, 0.1, 'sine', 0.06, 0.04) },
  perfect: function (r) { var f = 660 * Math.pow(1.06, Math.min(r, 12)); Geluid.toon(f, 0.18, 'triangle', 0.15); Geluid.toon(f * 1.5, 0.2, 'sine', 0.07, 0.06) },
  val: function () { Geluid.toon(500, 0.9, 'sine', 0.18, 0, 60); Geluid.ruis(0.5, 0.1, 400, 0.6, 0.3) },
  schild: function () { Geluid.toon(300, 0.3, 'sine', 0.15, 0, 900); Geluid.ruis(0.2, 0.08, 2000, 1) },
  boost: function () { Geluid.toon(200, 0.5, 'sawtooth', 0.06, 0, 900) },
  tel: function (n) { Geluid.toon(n ? 660 : 1320, n ? 0.12 : 0.3, 'triangle', 0.14) },
  missie: function () { [784, 988, 1175, 1568].forEach(function (f, i) { Geluid.toon(f, 0.16, 'triangle', 0.12, i * 0.08) }) },
}

// ── canvas en schuine (isometrische) weergave ──
var C = NK.canvas($('c'))
var ctx = C.ctx, K = 60, CO = Math.cos(Math.PI / 6), SI = 0.5, camX = 0, camY = 0
function maat() { K = Math.min(C.W, C.H) / 8 }
window.addEventListener('resize', maat); maat()
function ankerX() { return C.W / 2 }
function ankerY() { return C.H * 0.7 }
function scherm(x, y) {
  return [ankerX() + CO * K * ((x - camX) + (y - camY)), ankerY() + SI * K * ((y - camY) - (x - camX))]
}
function wereldMatrix(dy) {
  var e = scherm(0, 0)
  ctx.setTransform(C.dpr * CO * K, -C.dpr * SI * K, C.dpr * CO * K, C.dpr * SI * K, C.dpr * e[0], C.dpr * (e[1] + (dy || 0)))
}
function schermMatrix() { ctx.setTransform(C.dpr, 0, 0, C.dpr, 0, 0) }

// ── toestand ──
var s = null, modus = 'menu', demo = false, vast = false, acc = 0, aftel = 0, tijd = 0
var fx = NK.deeltjes(), schok = NK.schok(), sporen = [], valT = 0, bewaarKlok = 0, ritMunten = 0, schildFlits = 0

function nieuweRit() {
  s = ND.nieuw((Math.random() * 4294967296) >>> 0, D.upg)
  ritMunten = 0
  start()
}
function start() {
  demo = false; acc = 0; vast = false; valT = 0; sporen = []; fx.leeg()
  camX = s.x; camY = s.y
  modus = 'aftellen'; aftel = 3.2
  toonScherm(null)
  $('houd').classList.toggle('aan', !D.gezien)
  motorAan()
  hudBij(); bewaarBezig()
}
function hervat() {
  var z = D.bezig
  if (!z || !z.segs) return false
  s = z; ritMunten = z.ritMunten || 0
  start()
  return true
}
function bewaarBezig() {
  if (demo || !s) return
  if (s.over) D.bezig = null
  else { s.ritMunten = ritMunten; D.bezig = s }
  D.bewaar()
}

// ── opdrachten ──
function zorgVoorMissies() {
  if (D.missies && D.missies.length === 3) return
  D.missies = ['afstand', 'munten', 'perfect'].map(function (id) { return { id: id, start: D.ritten } })
}
function missieDoel(m) { var t = MISSIES.find(function (x) { return x.id === m.id }); var nv = D.niveau[m.id] || 0; return t.n[Math.min(nv, t.n.length - 1)] * (nv >= t.n.length ? (nv - t.n.length + 2) : 1) }
function missieTekst(m) { var t = MISSIES.find(function (x) { return x.id === m.id }); return t.tekst.replace('{n}', missieDoel(m)) }
function missieStand(m, rit) {
  if (m.id === 'afstand') return rit ? Math.floor(rit.afstand * 2) : 0
  if (m.id === 'munten') return rit ? rit.gepakt : 0
  if (m.id === 'perfect') return rit ? rit.perfect : 0
  if (m.id === 'reeks') return rit ? rit.besteReeks : 0
  if (m.id === 'ritten') return D.ritten - m.start
  return 0
}
function beloning(m) { return 20 + (D.niveau[m.id] || 0) * 10 }
// tijdens of na een rit: klaar? dan beloning en een nieuwe opdracht
function controleerMissies(rit) {
  zorgVoorMissies()
  D.missies.forEach(function (m, i) {
    if (missieStand(m, rit) < missieDoel(m)) return
    var bel = beloning(m)
    D.munten += bel; D.niveau[m.id] = (D.niveau[m.id] || 0) + 1
    G.missie(); melding('Opdracht klaar! +' + bel + ' munten')
    var bezet = D.missies.map(function (x) { return x.id })
    var volgende = MISSIES.map(function (x) { return x.id }).filter(function (id) { return bezet.indexOf(id) < 0 })
    var nieuwId = volgende.length ? volgende[(D.ritten + i) % volgende.length] : m.id
    D.missies[i] = { id: nieuwId, start: D.ritten }
    D.bewaar()
  })
}
function tekenMissies(el, rit) {
  zorgVoorMissies()
  el.innerHTML = D.missies.map(function (m) {
    var doel = missieDoel(m), st = Math.min(doel, missieStand(m, rit))
    return '<div class="missie' + (st >= doel ? ' klaar' : '') + '"><span>' + missieTekst(m) + '</span><span class="munt" style="flex:none">' + beloning(m) + '</span><div class="balk"><i style="width:' + Math.round(st / doel * 100) + '%"></i></div></div>'
  }).join('')
}

// ── gebeurtenissen ──
function gebeurtenis(e) {
  var p = scherm(e.x, e.y)
  if (e.t === 'munt') {
    if (!demo) { G.munt(); ritMunten++; D.munten++ }
    fx.spat(p[0], p[1] - K * 0.3, 10, '#ffc83d', K * 2.2, { ster: true, maat: K * 0.04 })
  }
  if (e.t === 'perfect') {
    if (!demo) { G.perfect(e.reeks); schok.voeg(0.06) }
    fx.spat(p[0], p[1], 16, auto().b, K * 2.5, { maat: K * 0.035 })
    if (!demo) fx.tekst(p[0], p[1] - K * 0.8, e.reeks > 1 ? 'Perfect x' + e.reeks : 'Perfect!', e.reeks > 2 ? '#ffe08a' : '#ffffff', K * 0.36)
    ringen.push({ x: p[0], y: p[1], t: 0, k: e.reeks > 2 ? '#ffc83d' : auto().b.charAt(0) === '#' ? auto().b : '#3ef0ff' })
  }
  if (e.t === 'boost') { if (!demo) { G.boost(); schok.voeg(0.15) } }
  if (e.t === 'schild') { if (!demo) { G.schild(); schok.voeg(0.4); schildFlits = 1; fx.tekst(p[0], p[1] - K, 'Schild!', '#3ef0ff', K * 0.4) } fx.spat(p[0], p[1], 24, '#3ef0ff', K * 3) }
  if (e.t === 'val') {
    if (demo) { demoOpnieuw = 1.3; return }
    G.val(); schok.voeg(0.6); valT = 0.0001; modus = 'val'
    setTimeout(eindScherm, 1300)
  }
}
function hudBij() {
  if (!s) return
  $('afstand').innerHTML = Math.floor(s.afstand * 2) + '<small>m</small>'
  $('ritmunten').textContent = ritMunten
  var sch = ''
  for (var i = 0; i < s.schilden; i++) sch += '<svg class="schild" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/></svg>'
  $('schilden').innerHTML = sch
}
function eindScherm() {
  D.ritten++
  var meter = Math.floor(s.afstand * 2), bonus = Math.floor(meter / 25)
  D.munten += bonus
  var nieuw = meter > D.record
  if (nieuw) D.record = meter
  D.bezig = null
  controleerMissies(s)
  D.bewaar()
  $('eindafstand').textContent = meter
  $('nieuwrecord').classList.toggle('verborgen', !nieuw || meter < 20)
  $('st-munten').textContent = ritMunten; $('st-perfect').textContent = s.perfect; $('st-reeks').textContent = s.besteReeks
  $('verdiend').innerHTML = 'Verdiend: <span class="munt">' + (ritMunten + bonus) + '</span> (' + ritMunten + ' gepakt + ' + bonus + ' voor de afstand)'
  tekenMissies($('eindmissies'), s)
  $('eindmenu').classList.toggle('verborgen', BELONING); $('eindgarage').classList.toggle('verborgen', BELONING)
  if (nieuw && meter >= 20) Geluid.win()
  modus = 'einde'
  toonScherm('einde')
}

// ── demo achter het menu ──
var demoOpnieuw = 0
function startDemo() { s = ND.nieuw((Math.random() * 1e9) >>> 0, { grip: 2 }); demo = true; camX = s.x; camY = s.y; sporen = []; demoOpnieuw = 0 }
function demoVast() {
  var nu = s.segs[s.seg], vol = s.segs[s.seg + 1], o = ND.opStuk(nu, s.x, s.y)
  return (nu.l - o.langs < 0.45 + s.v * 0.12 ? vol.r : nu.r) === 1
}

// ── tekenen ──
function stukPoly(seg) {
  var d = ND.RICHTING[seg.r], n = [-d[1], d[0]], b = ND.BREED / 2
  var a0 = -b, a1 = seg.l + b
  return [
    [seg.x + d[0] * a0 + n[0] * b, seg.y + d[1] * a0 + n[1] * b],
    [seg.x + d[0] * a1 + n[0] * b, seg.y + d[1] * a1 + n[1] * b],
    [seg.x + d[0] * a1 - n[0] * b, seg.y + d[1] * a1 - n[1] * b],
    [seg.x + d[0] * a0 - n[0] * b, seg.y + d[1] * a0 - n[1] * b],
  ]
}
function pad(poly) { ctx.beginPath(); poly.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]) }); ctx.closePath() }
function tekenWeg() {
  var a = auto(), van = Math.max(0, s.seg - 3), tot = Math.min(s.segs.length - 1, s.seg + 16)
  // zijkanten (zelfde vorm, iets lager) eerst, van ver naar dichtbij
  for (var k = tot; k >= van; k--) {
    var seg = s.segs[k], poly = stukPoly(seg)
    wereldMatrix(K * 0.32); pad(poly)
    ctx.fillStyle = '#0b0820'; ctx.fill()
    wereldMatrix(K * 0.16); pad(poly); ctx.fillStyle = '#1a1240'; ctx.fill()
  }
  for (var j = tot; j >= van; j--) {
    var sg = s.segs[j], pl = stukPoly(sg), d = ND.RICHTING[sg.r]
    wereldMatrix(0)
    pad(pl)
    var gr = ctx.createLinearGradient(sg.x, sg.y, sg.x + d[0] * sg.l, sg.y + d[1] * sg.l)
    gr.addColorStop(0, '#221a4a'); gr.addColorStop(1, '#2d2160')
    ctx.fillStyle = gr; ctx.fill()
    // randen
    ctx.save(); ctx.lineWidth = 0.05; ctx.strokeStyle = j === s.seg + 1 ? a.b : 'rgba(255,79,216,0.85)'
    ctx.shadowColor = '#ff4fd8'; ctx.shadowBlur = 14 * C.dpr
    pad(pl); ctx.stroke(); ctx.restore()
    // middenstreep
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 0.035; ctx.setLineDash([0.25, 0.25]); ctx.lineDashOffset = -tijd * 2
    ctx.beginPath(); ctx.moveTo(sg.x, sg.y); ctx.lineTo(sg.x + d[0] * sg.l, sg.y + d[1] * sg.l); ctx.stroke(); ctx.restore()
    // turbostrook
    if (sg.boost) {
      ctx.save(); ctx.fillStyle = 'rgba(62,240,255,' + (0.5 + Math.sin(tijd * 8) * 0.3) + ')'
      for (var c = 0; c < 3; c++) {
        var m = sg.l * 0.35 + c * 0.35, px = sg.x + d[0] * m, py = sg.y + d[1] * m, nx = -d[1], ny = d[0]
        ctx.beginPath(); ctx.moveTo(px + nx * 0.3, py + ny * 0.3); ctx.lineTo(px + d[0] * 0.22, py + d[1] * 0.22); ctx.lineTo(px - nx * 0.3, py - ny * 0.3)
        ctx.lineTo(px - nx * 0.3 + d[0] * 0.1, py - ny * 0.3 + d[1] * 0.1); ctx.lineTo(px + d[0] * 0.32, py + d[1] * 0.32); ctx.lineTo(px + nx * 0.3 + d[0] * 0.1, py + ny * 0.3 + d[1] * 0.1); ctx.fill()
      }
      ctx.restore()
    }
  }
  // bandensporen
  wereldMatrix(0)
  ctx.lineCap = 'round'
  for (var q = 1; q < sporen.length; q++) {
    var p0 = sporen[q - 1], p1 = sporen[q]
    if (p1.t - p0.t > 0.1) continue
    ctx.strokeStyle = 'rgba(10,6,25,' + Math.max(0, 0.55 - (tijd - p1.t) * 0.25) + ')'; ctx.lineWidth = 0.06
    ctx.beginPath(); ctx.moveTo(p0.a[0], p0.a[1]); ctx.lineTo(p1.a[0], p1.a[1]); ctx.moveTo(p0.b[0], p0.b[1]); ctx.lineTo(p1.b[0], p1.b[1]); ctx.stroke()
  }
}
function tekenMunten() {
  schermMatrix()
  s.munten.forEach(function (m) {
    var p = scherm(m.x, m.y)
    if (p[1] < -50 || p[1] > C.H + 50) return
    var y = p[1] - K * (0.32 + Math.sin(tijd * 3 + m.id) * 0.05), br = Math.abs(Math.cos(tijd * 3 + m.id)) * K * 0.13 + K * 0.03
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(p[0], p[1], K * 0.12, K * 0.05, 0, 0, 7); ctx.fill()
    NK.vlek(ctx, p[0], y, K * 0.35, '#ffc83d', 0.35)
    var gr = ctx.createLinearGradient(p[0] - br, y, p[0] + br, y); gr.addColorStop(0, '#b8860b'); gr.addColorStop(0.5, '#fff3b0'); gr.addColorStop(1, '#ffc83d')
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(p[0], y, br, K * 0.16, 0, 0, 7); ctx.fill()
    ctx.strokeStyle = '#a8700a'; ctx.lineWidth = 1.2; ctx.stroke()
    if (br > K * 0.08) { ctx.save(); ctx.translate(p[0], y); ctx.scale(br / (K * 0.16), 1); NK.ster(ctx, 0, 0, K * 0.08, '#fff8d0'); ctx.restore() }
    if (Math.sin(tijd * 6 + m.id) > 0.85) NK.ster(ctx, p[0] + K * 0.1, y - K * 0.12, K * 0.05, '#ffffff')
  })
}
// ── 3D-auto: een klein model van vlakken, gedraaid, schuin bekeken en op diepte getekend ──
// lokale assen: x naar voren, y opzij, z omhoog (eenheden van de weg)
function doos(v, x0, x1, y0, y1, z0, z1, kleur, o) {
  o = o || {}
  var p = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]
  // bovenkant iets smaller (afgeronde look)
  if (o.smal) { var sm = o.smal; [4, 5, 6, 7].forEach(function (i) { p[i][1] *= (1 - sm); if (o.voorSchuin && (i === 5 || i === 6)) p[i][0] -= o.voorSchuin; if (o.achterSchuin && (i === 4 || i === 7)) p[i][0] += o.achterSchuin }) }
  var vl = [[0, 1, 2, 3, 'onder'], [4, 7, 6, 5, 'boven'], [0, 4, 5, 1, 'links'], [2, 6, 7, 3, 'rechts'], [1, 5, 6, 2, 'voor'], [3, 7, 4, 0, 'achter']]
  vl.forEach(function (f) {
    var k = (o.kleuren && o.kleuren[f[4]]) || kleur
    if (k) v.push({ p: [p[f[0]], p[f[1]], p[f[2]], p[f[3]]], k: k, licht: o.licht && o.licht[f[4]] })
  })
}
function wiel(v, x, y, r, b) {
  // achthoekige band, as langs y
  var n = 10, y0 = y - b / 2, y1 = y + b / 2, rand = []
  for (var i = 0; i < n; i++) { var h = i / n * Math.PI * 2; rand.push([x + Math.cos(h) * r, Math.sin(h) * r + r]) }
  for (var j = 0; j < n; j++) { var a = rand[j], c = rand[(j + 1) % n]; v.push({ p: [[a[0], y0, a[1]], [c[0], y0, c[1]], [c[0], y1, c[1]], [a[0], y1, a[1]]], k: '#15151c' }) }
  v.push({ p: rand.map(function (q) { return [q[0], y1, q[1]] }), k: '#2a2a35', velg: true })
  v.push({ p: rand.slice().reverse().map(function (q) { return [q[0], y0, q[1]] }), k: '#2a2a35', velg: true })
}
var modelCache = {}
function autoModel(a) {
  var sleutel = a.id
  if (modelCache[sleutel]) return modelCache[sleutel]
  var v = [], L = 0.29, B = 0.165, glas = '#16203a'
  // onderstel en carrosserie
  doos(v, -L, L, -B, B, 0.04, 0.11, a.a, { licht: { voor: '#fff8d8', achter: '#ff2d4a' }, kleuren: { voor: '#2a2a35', achter: '#2a2a35' } })
  // lampen als smalle gloeiende strips op voor- en achterkant
  doos(v, L - 0.002, L + 0.006, -B + 0.02, -B + 0.07, 0.075, 0.1, null, { kleuren: { voor: '#fff8d8' }, licht: { voor: '#fff8d8' } })
  doos(v, L - 0.002, L + 0.006, B - 0.07, B - 0.02, 0.075, 0.1, null, { kleuren: { voor: '#fff8d8' }, licht: { voor: '#fff8d8' } })
  doos(v, -L - 0.006, -L + 0.002, -B + 0.015, B - 0.015, 0.078, 0.1, null, { kleuren: { achter: '#ff2d4a' }, licht: { achter: '#ff2d4a' } })
  // motorkap en kofferbak (iets hoger, afgerond)
  doos(v, -L + 0.01, L - 0.02, -B + 0.005, B - 0.005, 0.11, 0.145, a.a, { smal: 0.1, voorSchuin: 0.03 })
  // cabine met schuine ruiten
  doos(v, -0.14, 0.07, -B + 0.025, B - 0.025, 0.145, 0.225, a.a, { smal: 0.22, voorSchuin: 0.08, achterSchuin: 0.06,
    kleuren: { voor: glas, achter: glas, links: glas, rechts: glas } })
  // racestreep
  doos(v, -L + 0.012, L - 0.03, -0.03, 0.03, 0.146, 0.148, a.b)
  // spoiler
  doos(v, -L + 0.005, -L + 0.06, -B, B, 0.185, 0.198, a.b)
  doos(v, -L + 0.02, -L + 0.04, -0.1, -0.08, 0.145, 0.185, '#222')
  doos(v, -L + 0.02, -L + 0.04, 0.08, 0.1, 0.145, 0.185, '#222')
  // wielen
  wiel(v, 0.18, -B - 0.01, 0.06, 0.06); wiel(v, 0.18, B + 0.01, 0.06, 0.06)
  wiel(v, -0.18, -B - 0.01, 0.065, 0.07); wiel(v, -0.18, B + 0.01, 0.065, 0.07)
  return (modelCache[sleutel] = v)
}
var KIJK = (function () { var x = -1, y = 1, z = 1.35, l = Math.hypot(x, y, z); return [x / l, y / l, z / l] })()
var ZON = (function () { var x = -0.3, y = 0.7, z = 1, l = Math.hypot(x, y, z); return [x / l, y / l, z / l] })()
function kleurMaal(hex, f) {
  if (hex[0] !== '#') return hex
  var n = parseInt(hex.slice(1), 16), r = Math.min(255, (n >> 16) * f), g = Math.min(255, (n >> 8 & 255) * f), b = Math.min(255, (n & 255) * f)
  return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')'
}
// teken het model op schermpunt (ox, oy) met schaal k (pixels per eenheid)
function tekenModel(g, model, ox, oy, k, hoek, rol, alfa, regenboog) {
  var c = Math.cos(hoek), sn = Math.sin(hoek), cr = Math.cos(rol), sr = Math.sin(rol)
  var draai = function (q) {
    // eerst kantelen (rol om de lengteas), dan draaien om de hoogte-as
    var y1 = q[1] * cr - q[2] * sr, z1 = q[1] * sr + q[2] * cr
    return [q[0] * c - y1 * sn, q[0] * sn + y1 * c, z1]
  }
  var vlakken = []
  model.forEach(function (f) {
    var w = f.p.map(draai)
    var a = w[0], b = w[1], d = w[2]
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2]
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, nl = Math.hypot(nx, ny, nz) || 1
    nx /= -nl; ny /= -nl; nz /= -nl   // vlakken zijn met de klok mee opgegeven
    if (nx * KIJK[0] + ny * KIJK[1] + nz * KIJK[2] <= 0.001) return   // achterkant: niet zichtbaar
    var diep = 0
    w.forEach(function (q) { diep += q[0] * KIJK[0] + q[1] * KIJK[1] + q[2] * KIJK[2] })
    vlakken.push({ w: w, d: diep / w.length, f: f, l: 0.45 + 0.6 * Math.max(0, nx * ZON[0] + ny * ZON[1] + nz * ZON[2]) })
  })
  vlakken.sort(function (p, q) { return p.d - q.d })
  g.save(); g.globalAlpha = alfa; g.lineJoin = 'round'
  vlakken.forEach(function (v) {
    g.beginPath()
    v.w.forEach(function (q, i) {
      var sx = ox + CO * k * (q[0] + q[1]), sy = oy + SI * k * (q[1] - q[0]) - q[2] * k * 0.95
      if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy)
    })
    g.closePath()
    var kl = v.f.k
    if (regenboog && kl === regenboog.a) kl = 'hsl(' + ((tijd * 120) % 360 | 0) + ',90%,' + Math.round(38 + v.l * 22) + '%)'
    else if (v.f.licht) { g.shadowColor = v.f.licht; g.shadowBlur = k * 0.25 }
    else kl = kleurMaal(kl, v.f.velg ? 1 : v.l)
    g.fillStyle = kl; g.fill()
    g.shadowBlur = 0
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 0.6; g.stroke()
  })
  g.restore()
}

function tekenAuto(dt) {
  var a = auto(), zak = 0, alfa = 1
  if (valT > 0) { valT += dt; zak = valT * valT * K * 6; alfa = Math.max(0, 1 - valT / 1.1) }
  var p = scherm(s.x, s.y), drift = Math.abs(Math.atan2(Math.sin(s.neus - s.rij), Math.cos(s.neus - s.rij)))
  // schaduw
  schermMatrix()
  if (!valT) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(p[0], p[1] + K * 0.05, K * 0.32, K * 0.14, 0, 0, 7); ctx.fill() }
  // koplampbundel
  wereldMatrix(-K * 0.12 + zak)
  ctx.save(); ctx.globalAlpha = alfa
  ctx.translate(s.x, s.y); ctx.rotate(s.neus)
  var bundel = ctx.createLinearGradient(0.2, 0, 1.6, 0); bundel.addColorStop(0, 'rgba(255,255,220,0.35)'); bundel.addColorStop(1, 'rgba(255,255,220,0)')
  ctx.fillStyle = bundel; ctx.beginPath(); ctx.moveTo(0.22, -0.1); ctx.lineTo(1.6, -0.45); ctx.lineTo(1.6, 0.45); ctx.lineTo(0.22, 0.1); ctx.fill()
  ctx.restore()
  // neon onder de auto
  schermMatrix()
  if (!valT) NK.vlek(ctx, p[0], p[1], K * 0.55, a.b.charAt(0) === '#' ? a.b : '#3ef0ff', 0.35)
  // de auto zelf: 3D, helt over naar buiten als je drift
  var helling = Math.atan2(Math.sin(s.neus - s.rij), Math.cos(s.neus - s.rij)) * 0.35
  tekenModel(ctx, autoModel(a), p[0], p[1] + zak, K * 1.3, s.neus, valT ? helling + valT * 3 : helling, alfa, a.regenboog ? a : null)
  if (schildFlits > 0) { schermMatrix(); NK.vlek(ctx, p[0], p[1] - K * 0.1, K * 1.2, '#3ef0ff', 0.5 * schildFlits) }
  // rook en sporen bij het driften
  if (!valT && drift > 0.18 && modus !== 'aftellen') {
    var kos = Math.cos(s.neus), sin = Math.sin(s.neus)
    sporen.push({ t: tijd, a: [s.x - kos * 0.2 - sin * 0.11, s.y - sin * 0.2 + kos * 0.11], b: [s.x - kos * 0.2 + sin * 0.11, s.y - sin * 0.2 - kos * 0.11] })
    if (!D.rustig && Math.random() < 0.6) fx.punt({ x: p[0] + (Math.random() - 0.5) * K * 0.3, y: p[1] - K * 0.05, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, t: 0, max: 0.6, r: K * (0.05 + Math.random() * 0.05), col: 'rgba(220,210,255,0.5)', zwaarte: 0 })
  } else if (sporen.length && tijd - sporen[sporen.length - 1].t > 0.05) sporen.push({ t: -99, a: [0, 0], b: [0, 0] })
  while (sporen.length > 160 || (sporen.length && tijd - sporen[0].t > 2.2 && sporen[0].t > 0)) sporen.shift()
  if (sporen.length && sporen[0].t === -99) sporen.shift()
  if (s.boost > 0 && !D.rustig) fx.punt({ x: p[0] - Math.cos(s.rij) * K * 0.2, y: p[1] - K * 0.1, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, t: 0, max: 0.35, r: K * 0.05, col: '#3ef0ff', zwaarte: 0 })
  return drift
}
function tekenRuimte() {
  schermMatrix()
  // neonrooster diep onder de weg (beweegt mee: zo voel je de snelheid)
  wereldMatrix(K * 2.6)
  ctx.save()
  var gx0 = Math.floor(camX) - 14, gy0 = Math.floor(camY) - 14
  ctx.lineWidth = 0.03; ctx.strokeStyle = 'rgba(160,80,255,0.35)'
  ctx.beginPath()
  for (var q = 0; q <= 28; q += 1) {
    ctx.moveTo(gx0 + q, gy0); ctx.lineTo(gx0 + q, gy0 + 28)
    ctx.moveTo(gx0, gy0 + q); ctx.lineTo(gx0 + 28, gy0 + q)
  }
  ctx.stroke()
  ctx.restore()
  schermMatrix()
  // de rand van het rooster vervaagt in de verte
  var mist = ctx.createRadialGradient(C.W / 2, ankerY(), Math.min(C.W, C.H) * 0.25, C.W / 2, ankerY(), Math.max(C.W, C.H) * 0.75)
  mist.addColorStop(0, 'rgba(5,4,15,0)'); mist.addColorStop(1, 'rgba(5,4,15,0.85)')
  ctx.fillStyle = mist; ctx.fillRect(0, 0, C.W, C.H)
  // een grote neonzon met strepen, ver weg (beweegt bijna niet mee)
  var zx = C.W * 0.24 - (((camX + camY) * 0.8) % 40), zy = C.H * 0.22, zr = Math.min(C.W, C.H) * 0.17
  ctx.save()
  ctx.beginPath(); ctx.arc(zx, zy, zr, 0, 7); ctx.clip()
  var zg = ctx.createLinearGradient(0, zy - zr, 0, zy + zr)
  zg.addColorStop(0, '#ffe14f'); zg.addColorStop(0.45, '#ff7a3d'); zg.addColorStop(1, '#ff2d9a')
  ctx.fillStyle = zg; ctx.fillRect(zx - zr, zy - zr, zr * 2, zr * 2)
  ctx.fillStyle = '#100828'
  for (var st = 0; st < 7; st++) { var sy = zy + zr * (0.05 + st * 0.14), sh = 2 + st * 1.6; ctx.fillRect(zx - zr, sy, zr * 2, sh) }
  ctx.restore()
  NK.vlek(ctx, zx, zy, zr * 1.8, '#ff4fd8', 0.25)
}
// lantaarnpalen langs de weg, om de 2 eenheden, aan beide kanten
function lantaarns(voorAuto) {
  var p0 = scherm(s.x, s.y)
  schermMatrix()
  for (var k = Math.max(0, s.seg - 2); k < Math.min(s.segs.length, s.seg + 12); k++) {
    var sg = s.segs[k], d = ND.RICHTING[sg.r], n = [-d[1], d[0]]
    for (var t = 1; t < sg.l; t += 2) for (var z = -1; z <= 1; z += 2) {
      var wx = sg.x + d[0] * t + n[0] * z * 0.62, wy = sg.y + d[1] * t + n[1] * z * 0.62, p = scherm(wx, wy)
      if ((p[1] > p0[1]) !== voorAuto) continue
      if (p[1] < -40 || p[1] > C.H + 40) continue
      var h = K * 0.55, kl = (k + t) % 2 ? '#3ef0ff' : '#ff4fd8'
      ctx.strokeStyle = '#2a2450'; ctx.lineWidth = Math.max(1.5, K * 0.03)
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0], p[1] - h); ctx.stroke()
      ctx.save(); ctx.globalCompositeOperation = 'lighter'
      NK.vlek(ctx, p[0], p[1] - h, K * 0.22, kl, 0.9)
      NK.vlek(ctx, p[0] - n[0] * K * 0.2, p[1] + K * 0.02, K * 0.35, kl, 0.18)
      ctx.restore()
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p[0], p[1] - h, Math.max(1.5, K * 0.03), 0, 7); ctx.fill()
    }
  }
}
// rode lichtsporen van de achterlichten
var lichtSpoor = []
function tekenLichtSpoor() {
  if (valT) return
  var kos = Math.cos(s.neus), sin = Math.sin(s.neus)
  lichtSpoor.push({ t: tijd, a: [s.x - kos * 0.3 - sin * 0.1, s.y - sin * 0.3 + kos * 0.1], b: [s.x - kos * 0.3 + sin * 0.1, s.y - sin * 0.3 - kos * 0.1] })
  while (lichtSpoor.length && tijd - lichtSpoor[0].t > 0.35) lichtSpoor.shift()
  wereldMatrix(-K * 0.1)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  for (var q = 1; q < lichtSpoor.length; q++) {
    var p0 = lichtSpoor[q - 1], p1 = lichtSpoor[q], f = 1 - (tijd - p1.t) / 0.35
    ctx.strokeStyle = 'rgba(255,45,90,' + (f * 0.6) + ')'; ctx.lineWidth = 0.05 * f + 0.01
    ctx.beginPath(); ctx.moveTo(p0.a[0], p0.a[1]); ctx.lineTo(p1.a[0], p1.a[1]); ctx.moveTo(p0.b[0], p0.b[1]); ctx.lineTo(p1.b[0], p1.b[1]); ctx.stroke()
  }
  ctx.restore()
}
// snelheidsstrepen
var strepen = []
function tekenStrepen(dt) {
  if (D.rustig || modus !== 'rijden' || !s) return
  var hard = Math.max(0, (s.v - 5) / 3)
  if (Math.random() < hard * 0.8) strepen.push({ x: Math.random() * C.W, y: Math.random() * C.H, t: 0 })
  schermMatrix()
  var rx = -Math.cos(s.rij) * CO - Math.sin(s.rij) * CO, ry = Math.cos(s.rij) * SI - Math.sin(s.rij) * SI
  strepen = strepen.filter(function (st) {
    st.t += dt
    var l = 60 + hard * 80
    ctx.strokeStyle = 'rgba(200,220,255,' + (0.25 * (1 - st.t / 0.4)) + ')'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(st.x, st.y); ctx.lineTo(st.x + rx * l, st.y + ry * l); ctx.stroke()
    st.x += rx * dt * 900; st.y += ry * dt * 900
    return st.t < 0.4
  })
}
// lichtring bij een perfecte bocht
var ringen = []
function tekenRingen(dt) {
  schermMatrix()
  ringen = ringen.filter(function (r) {
    r.t += dt
    var f = r.t / 0.6
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = NK.hexA(r.k, 1 - f); ctx.lineWidth = 4 * (1 - f) + 1
    ctx.beginPath(); ctx.ellipse(r.x, r.y, K * (0.4 + f * 1.6), K * (0.2 + f * 0.8), 0, 0, 7); ctx.stroke()
    ctx.restore()
    return f < 1
  })
}

// ── hoofdlus ──
var vorige = performance.now(), invoer
function frame(nu) {
  var dt = Math.min(0.05, (nu - vorige) / 1000); vorige = nu; tijd += dt
  if (invoer) invoer.pad()
  schermMatrix()
  schok.rustig = D.rustig
  NK.achtergrond(ctx, C.W, C.H, tijd, 300, D.rustig)
  if (!s && modus === 'menu') startDemo()
  var drift = 0
  if (s) {
    tekenRuimte()
    if (modus === 'aftellen') {
      var oud = Math.ceil(aftel); aftel -= dt
      if (Math.ceil(aftel) !== oud && aftel > 0) G.tel(Math.ceil(aftel))
      if (aftel <= 0) { modus = 'rijden'; G.tel(0) }
    } else if (modus === 'rijden' || (demo && modus === 'menu')) {
      if (demo && demoOpnieuw > 0) { demoOpnieuw -= dt; if (demoOpnieuw <= 0) startDemo() }
      else {
        acc += dt
        while (acc >= ND.STAP && !s.over) { acc -= ND.STAP; ND.stap(s, demo ? demoVast() : vast).forEach(gebeurtenis) }
        if (!demo) {
          bewaarKlok += dt
          if (bewaarKlok > 0.5) { bewaarKlok = 0; bewaarBezig(); controleerMissies(s) }
          hudBij()
        }
      }
    }
    // camera loopt soepel achter de auto aan
    camX += (s.x - camX) * Math.min(1, dt * 6); camY += (s.y - camY) * Math.min(1, dt * 6)
    var sk = schok.stap(dt)
    ctx.save()
    tekenWegMet(sk)
    ctx.restore()
    schildFlits = Math.max(0, schildFlits - dt * 2)
    tekenRingen(dt); tekenStrepen(dt)
    schermMatrix(); ctx.save(); ctx.translate(sk[0], sk[1]); fx.teken(ctx, dt); ctx.restore()
    if (modus === 'aftellen') {
      var getal = Math.ceil(aftel), f = aftel - Math.floor(aftel)
      schermMatrix(); ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = Math.round(Math.min(C.W, C.H) * 0.22 * (0.8 + f * 0.4)) + 'px "Russo One", system-ui'
      ctx.globalAlpha = Math.min(1, f * 2); ctx.shadowColor = '#ff4fd8'; ctx.shadowBlur = 30; ctx.fillStyle = '#ffffff'
      if (getal > 0) ctx.fillText(String(getal), C.W / 2, C.H * 0.38)
      ctx.restore()
    }
    drift = lastDrift
  }
  motorBij(s ? s.v : 0, drift, modus === 'rijden' && !demo)
  requestAnimationFrame(frame)
}
var lastDrift = 0
function tekenWegMet(sk) {
  var bx = ankerX, by = ankerY
  ankerX = function () { return bx() + sk[0] }; ankerY = function () { return by() + sk[1] }
  tekenWeg(); lantaarns(false); tekenMunten(); tekenLichtSpoor(); lastDrift = tekenAuto(1 / 60); lantaarns(true)
  ankerX = bx; ankerY = by
}

// ── invoer: vasthouden ──
function neer() { if (modus === 'rijden' || modus === 'aftellen') { vast = true; if (!D.gezien) { D.gezien = true; D.bewaar(); $('houd').classList.remove('aan') } } }
function los() { vast = false }
$('c').addEventListener('pointerdown', function (e) { Geluid.audio(); motorAan(); neer(); e.preventDefault() })
window.addEventListener('pointerup', los); window.addEventListener('pointercancel', los)
window.addEventListener('keydown', function (e) {
  if (e.repeat) return
  if (e.code === 'Escape' || e.code === 'KeyP') { pauze(); return }
  if (huidig === null && (e.code === 'Space' || e.code.indexOf('Arrow') === 0 || e.code === 'Enter')) { e.preventDefault(); neer() }
})
window.addEventListener('keyup', function (e) { if (e.code === 'Space' || e.code.indexOf('Arrow') === 0 || e.code === 'Enter') los() })
var padVast = false
invoer = { pad: function () {
  var lijst = navigator.getGamepads ? navigator.getGamepads() : []
  var nu = false
  for (var i = 0; i < lijst.length; i++) { var g = lijst[i]; if (g && ((g.buttons[0] && g.buttons[0].pressed) || (g.buttons[7] && g.buttons[7].pressed))) nu = true }
  if (nu && !padVast) neer(); if (!nu && padVast) los()
  padVast = nu
} }
document.addEventListener('visibilitychange', function () { if (document.hidden) pauze() })
function pauze() {
  if (modus !== 'rijden' && modus !== 'aftellen') return
  modus = 'pauze'; vast = false; bewaarBezig(); toonScherm('pauzescherm')
}
$('pauze').onclick = function (e) { e.stopPropagation(); pauze() }
$('hervat').onclick = function () { Geluid.klik(); start() }
$('stop').onclick = function () { Geluid.klik(); bewaarBezig(); s = null; if (BELONING) NK.naarOuder('neondrift-gameover'); else toonMenu() }
$('naarmenu').onclick = function () { Geluid.klik(); if (modus === 'rijden') bewaarBezig(); s = null; toonMenu() }

// ── schermen ──
var huidig = 'menu'
function toonScherm(id) {
  huidig = id
  ;['menu', 'pauzescherm', 'einde', 'garage'].forEach(function (x) { $(x).classList.toggle('aan', x === id) })
  var inSpel = id === null
  $('hud').classList.toggle('aan', inSpel || id === 'pauzescherm')
  if (!inSpel) $('houd').classList.remove('aan')
  $('menutop').classList.toggle('aan', !inSpel && id !== 'einde' && id !== 'pauzescherm' && !BELONING)
  $('topmunten').textContent = D.munten
  $('naarmenu').style.visibility = BELONING ? 'hidden' : ''
}
function melding(t) { var m = $('melding'); m.textContent = t; m.classList.remove('aan'); void m.offsetWidth; m.classList.add('aan'); clearTimeout(melding.t); melding.t = setTimeout(function () { m.classList.remove('aan') }, 2600) }
function toonMenu() {
  modus = 'menu'; if (s && !demo) s = null
  var b = D.bezig && D.bezig.segs
  $('verder').classList.toggle('verborgen', !b)
  if (b) $('verder').textContent = 'Verder (' + Math.floor(D.bezig.afstand * 2) + ' m)'
  $('speel').className = b ? 'knop2' : 'knop'
  $('speel').textContent = b ? 'Nieuwe rit' : 'Rijden'
  $('menurecord').innerHTML = D.record ? 'Jouw record: <strong>' + D.record + ' meter</strong>' : ''
  tekenMissies($('menumissies'), null)
  $('s-geluid').classList.toggle('aan', D.geluid); $('s-rustig').classList.toggle('aan', D.rustig)
  toonScherm('menu')
}
$('terug').onclick = function () { Geluid.klik(); if (huidig === 'menu') NK.naarOuder('neondrift-terug'); else toonMenu() }
$('verder').onclick = function () { Geluid.klik(); s = null; hervat() }
$('speel').onclick = function () { Geluid.klik(); s = null; if (!D.uitlegGezien) { D.uitlegGezien = true; D.bewaar(); return toonUitleg(nieuweRit) } nieuweRit() }
$('nogeens').onclick = function () { Geluid.klik(); s = null; nieuweRit() }
$('eindmenu').onclick = function () { Geluid.klik(); s = null; toonMenu() }
$('eindgarage').onclick = function () { Geluid.klik(); s = null; naarGarage() }
$('naargarage').onclick = function () { Geluid.klik(); naarGarage() }
$('s-geluid').onclick = function () { D.geluid = !D.geluid; D.bewaar(); this.classList.toggle('aan', D.geluid); Geluid.klik() }
$('s-rustig').onclick = function () { D.rustig = !D.rustig; D.bewaar(); this.classList.toggle('aan', D.rustig); Geluid.klik() }

// ── garage ──
var tab = 'auto'
function naarGarage() { modus = 'menu'; tekenGarage(); toonScherm('garage') }
$('tab-auto').onclick = function () { tab = 'auto'; tekenGarage() }
$('tab-upg').onclick = function () { tab = 'upg'; tekenGarage() }
function tekenGarage() {
  $('garagemunten').textContent = D.munten; $('topmunten').textContent = D.munten
  $('tab-auto').classList.toggle('aan', tab === 'auto'); $('tab-upg').classList.toggle('aan', tab === 'upg')
  $('lijst').classList.toggle('verborgen', tab !== 'auto'); $('upgrlijst').classList.toggle('verborgen', tab !== 'upg')
  if (tab === 'auto') {
    NK.winkel($('lijst'), AUTOS, D, 'autos', 'auto', function (g, a) {
      NK.vlek(g, 48, 50, 34, a.b.charAt(0) === '#' ? a.b : '#3ef0ff', 0.3)
      tekenModel(g, autoModel(a), 48, 46, 110, 0.55, 0, 1, a.regenboog ? a : null)
    }, tekenGarage)
  } else {
    var l = $('upgrlijst'); l.innerHTML = ''
    UPGRADES.forEach(function (u) {
      var nv = D.upg[u.id] || 0, prijs = u.prijzen[nv]
      var d = document.createElement('div'); d.className = 'upg'
      var bol = ''
      for (var i = 0; i < u.prijzen.length; i++) bol += '<i class="' + (i < nv ? 'aan' : '') + '"></i>'
      d.innerHTML = '<div><b>' + u.naam + '</b><div class="uitl">' + u.uitleg + '</div><div class="bolletjes">' + bol + '</div></div>'
      var b = document.createElement('button')
      if (prijs == null) { b.className = 'kies aan'; b.textContent = 'Maximaal'; b.disabled = true }
      else {
        b.className = 'koop'; b.innerHTML = '<span class="munt" style="color:inherit">' + prijs + '</span>'; b.disabled = D.munten < prijs
        b.onclick = function () { if (D.munten < prijs) return; D.munten -= prijs; D.upg[u.id] = nv + 1; D.bewaar(); Geluid.koop(); tekenGarage() }
      }
      d.appendChild(b); l.appendChild(d)
    })
  }
}

// ── start ──
zorgVoorMissies()
if (BELONING) { if (!hervat()) nieuweRit() }
else toonMenu()
requestAnimationFrame(frame)

// ── uitleg ──
function toonUitleg(klaar) {
  var weg = function (g, w, bocht) { g.strokeStyle = '#2a2a5a'; g.lineWidth = 16; g.beginPath(); g.moveTo(10, 62); g.lineTo(40, 62); if (bocht) g.lineTo(40, 14); else g.lineTo(70, 62); g.stroke(); g.strokeStyle = '#ff4fd8'; g.lineWidth = 2; g.beginPath(); g.moveTo(10, 54); g.lineTo(32, 54); g.lineTo(32, 14); g.moveTo(10, 70); g.lineTo(48, 70); g.lineTo(48, 14); g.stroke() }
  NK.uitleg([
    [function (g, w) { g.fillStyle = 'rgba(77,232,255,0.25)'; g.beginPath(); g.arc(40, 40, 26, 0, 7); g.fill(); g.fillStyle = '#4de8ff'; g.beginPath(); g.arc(40, 40, 13, 0, 7); g.fill() }, 'Je auto rijdt vanzelf. Houd het scherm (of de spatiebalk) ingedrukt om de ene kant op te sturen. Laat los en je stuurt weer de andere kant op.'],
    [function (g, w) { weg(g, w, true); g.fillStyle = '#ffd23d'; g.beginPath(); g.arc(40, 62, 5, 0, 7); g.fill() }, 'De weg slingert. Druk op tijd bij elke bocht. Kom je naast de weg, dan val je eraf.'],
    [function (g, w) { g.save(); g.shadowColor = '#4de8ff'; g.shadowBlur = 12; g.strokeStyle = '#4de8ff'; g.lineWidth = 4; g.beginPath(); g.arc(40, 40, 22, 0, 7); g.stroke(); g.restore() }, 'Ga netjes door het midden van een bocht: dat is een perfecte bocht. Meer perfecte bochten achter elkaar geeft meer punten.'],
    [function (g, w) { NK.ster(g, 40, 40, 20, '#ffd23d') }, 'Pak de sterren op de weg. Daarmee koop je in de garage nieuwe auto’s en betere onderdelen.'],
    [function (g, w) { g.strokeStyle = '#7fe0ff'; g.lineWidth = 4; g.beginPath(); g.moveTo(40, 14); g.lineTo(62, 22); g.lineTo(60, 44); g.quadraticCurveTo(54, 60, 40, 68); g.quadraticCurveTo(26, 60, 20, 44); g.lineTo(18, 22); g.closePath(); g.stroke() }, 'Een schild vangt je één keer op als je van de weg raakt. Een magneet trekt sterren naar je toe. Meer grip laat je auto strakker sturen.'],
    [function (g, w) { g.fillStyle = '#5be37a'; g.beginPath(); g.moveTo(22, 42); g.lineTo(34, 54); g.lineTo(58, 28); g.lineTo(52, 22); g.lineTo(34, 42); g.lineTo(28, 36); g.closePath(); g.fill() }, 'Doe de drie opdrachten in het menu voor extra sterren. Daarna krijg je nieuwe, moeilijkere opdrachten.'],
  ], klaar)
}
$('naaruitleg').onclick = function () { Geluid.klik(); toonUitleg() }
})()
