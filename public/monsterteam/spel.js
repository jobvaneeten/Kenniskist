// Monsterteam: wereldkaart, team, winkel, wezenboek en gevechten. Regels in kern.js.
(function () {
'use strict'
var $ = function (id) { return document.getElementById(id) }
var BELONING = NK.BELONING
var Geluid = NK.Geluid
var S = MT.SOORTEN, AV = MT.AANVALLEN

// ── opslag (na elke actie, ook midden in een gevecht) ──
var D = NK.opslag('kk_mt', {
  munten: 100, team: [], opslag: [], tas: { glimbol: 5, superbol: 0, drankje: 3, superdrank: 0, wekker: 0 },
  gebied: 0, versl: {}, gezien: {}, gevangen: {}, gevecht: null, sterrenkat: false, geluid: true, rustig: false,
  pos: { a: 0, x: 9, y: 11, r: 2 }, huis: { a: 0, x: 4, y: 14 }, opgepakt: {},
})
Geluid.zetAan(function () { return D.geluid })
var SPULLEN = {
  glimbol: { naam: 'Glimbol', uitleg: 'Vang een wild wezen. Hoe zwakker het is, hoe makkelijker.', prijs: 20, kracht: 1 },
  superbol: { naam: 'Superbol', uitleg: 'Vangt veel beter dan een glimbol.', prijs: 60, kracht: 1.8 },
  drankje: { naam: 'Drankje', uitleg: 'Geeft 25 leven terug.', prijs: 15, heel: 25 },
  superdrank: { naam: 'Superdrank', uitleg: 'Geeft 80 leven terug.', prijs: 45, heel: 80 },
  wekker: { naam: 'Wekker', uitleg: 'Maakt een flauwgevallen wezen weer wakker.', prijs: 80, wek: true },
}

// ── geluid ──
var G = {
  raak: function (m) { Geluid.ruis(0.15, 0.16, m > 1 ? 1800 : 900, 0.8); Geluid.toon(m > 1 ? 220 : 160, 0.15, 'square', 0.08, 0, 80) },
  aanval: function (type) { var f = { vuur: 300, water: 500, plant: 420, bliksem: 900, schaduw: 200, normaal: 350 }[type]; Geluid.toon(f, 0.25, type === 'bliksem' ? 'sawtooth' : 'triangle', 0.1, 0, f * 1.8) },
  flauw: function () { Geluid.toon(400, 0.6, 'sine', 0.15, 0, 90) },
  niveau: function () { [523, 659, 784, 1047].forEach(function (f, i) { Geluid.toon(f, 0.15, 'triangle', 0.13, i * 0.07) }) },
  bal: function () { Geluid.toon(700, 0.08, 'triangle', 0.1) },
  schud: function () { Geluid.toon(300, 0.1, 'square', 0.06, 0, 200) },
  gevangen: function () { [784, 988, 1175, 1568, 2093].forEach(function (f, i) { Geluid.toon(f, 0.14, 'triangle', 0.12, i * 0.06) }) },
  heel: function () { [660, 880, 1100].forEach(function (f, i) { Geluid.toon(f, 0.2, 'sine', 0.1, i * 0.08) }) },
  evolutie: function () { for (var i = 0; i < 8; i++) Geluid.toon(400 + i * 120, 0.2, 'sine', 0.08, i * 0.12) },
}

// ── wezens tekenen (alles getekend, geen plaatjes) ──
function licht(hex, f) {
  var n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255
  var t = f < 0 ? 0 : 255, p = Math.abs(f)
  return 'rgb(' + Math.round((t - r) * p + r) + ',' + Math.round((t - g) * p + g) + ',' + Math.round((t - b) * p + b) + ')'
}
// stadium (1, 2 of 3) uit de veranderketen
var STADIUM = (function () {
  var st = {}
  Object.keys(S).forEach(function (id) { st[id] = st[id] || 1; var e = S[id].evo; if (e) st[e[0]] = (st[id] || 1) + 1 })
  Object.keys(S).forEach(function (id) { var e = S[id].evo; if (e && S[e[0]].evo) st[S[e[0]].evo[0]] = st[e[0]] + 1 })
  return st
})()
// eigen kleur per wezen: het element, iets verschoven zodat soortgenoten verschillen
function wezenKleur(id) {
  var basis = MT.KLEUR[S[id].type], h = 0
  for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997
  var n = parseInt(basis.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255
  var f = 0.88 + (h % 30) / 100
  return '#' + [r, g, b].map(function (c) { return ('0' + Math.min(255, Math.round(c * f)).toString(16)).slice(-2) }).join('')
}
var witDoek = document.createElement('canvas')
function tekenWezen(g, id, x, y, r, o) {
  o = o || {}
  // geraakt of veranderen: het wezen zelf licht wit op (niet een vierkant eromheen)
  if (o.wit && !o.binnen) {
    var m = Math.ceil(r * 4.4)
    witDoek.width = m; witDoek.height = m
    var wg = witDoek.getContext('2d')
    tekenWezen(wg, id, m / 2, m / 2, r, Object.assign({}, o, { wit: 0, binnen: true, alfa: 1 }))
    wg.globalCompositeOperation = 'source-atop'; wg.fillStyle = 'rgba(255,255,255,' + Math.min(1, o.wit) + ')'; wg.fillRect(0, 0, m, m)
    g.save(); g.globalAlpha = o.alfa == null ? 1 : o.alfa; g.drawImage(witDoek, x - m / 2, y - m / 2); g.restore()
    return
  }
  var sp = S[id], L = sp.look, type = sp.type, t = o.t || 0, stad = STADIUM[id] || 1
  r *= L.maat * (o.schaal == null ? 1 : o.schaal)
  if (r <= 0.5) return
  var k = o.silhouet ? '#22223e' : wezenKleur(id)
  var donker = o.silhouet ? '#16162a' : licht(k, -0.32), hel = o.silhouet ? '#2a2a4a' : licht(k, 0.45), lijn = o.silhouet ? '#0e0e1e' : licht(k, -0.62)
  var adem = o.stil ? 0 : Math.sin(t * 2.6) * 0.025
  var bob = o.stil ? 0 : Math.sin(t * 2.6) * r * 0.03
  var lw = Math.max(1.2, r * 0.055)
  g.save(); g.translate(x, y + bob); if (o.kijk === -1) g.scale(-1, 1)
  g.globalAlpha = o.alfa == null ? 1 : o.alfa
  g.lineJoin = 'round'; g.lineCap = 'round'
  var vul = function (pad, kleur) { g.fillStyle = kleur; g.fill(pad); if (!o.silhouet || true) { g.strokeStyle = lijn; g.lineWidth = lw; g.stroke(pad) } }
  // schaduw op de grond
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(0, r * 0.98, r * 0.78 * (1 - adem * 2), r * 0.15, 0, 0, 7); g.fill()

  // ── staart (achter) ──
  var st = L.staart, P
  if (st === 'vlam') {
    var fl = Math.sin(t * 9) * r * 0.06
    P = new Path2D(); P.moveTo(r * 0.5, r * 0.45); P.quadraticCurveTo(r * 1.35, r * 0.35, r * 1.15 + fl, -r * 0.55); P.quadraticCurveTo(r * 1.0, -r * 0.05, r * 0.62, r * 0.1); P.closePath()
    vul(P, o.silhouet ? k : '#ff8a3d')
    if (!o.silhouet) { P = new Path2D(); P.moveTo(r * 0.7, r * 0.32); P.quadraticCurveTo(r * 1.12, r * 0.25, r * 1.08 + fl, -r * 0.3); P.quadraticCurveTo(r * 0.98, r * 0.02, r * 0.75, r * 0.15); P.closePath(); g.fillStyle = '#ffe14f'; g.fill(P) }
  } else if (st === 'vis') {
    var zw = Math.sin(t * 4) * 0.15
    g.save(); g.translate(r * 0.62, r * 0.35); g.rotate(-0.4 + zw)
    P = new Path2D(); P.moveTo(0, 0); P.quadraticCurveTo(r * 0.4, -r * 0.1, r * 0.62, -r * 0.42); P.quadraticCurveTo(r * 0.5, 0, r * 0.66, r * 0.34); P.quadraticCurveTo(r * 0.35, r * 0.12, 0, 0.001); vul(P, donker)
    g.restore()
  } else if (st === 'blad') {
    g.save(); g.translate(r * 0.7, r * 0.3); g.rotate(-0.8 + Math.sin(t * 2) * 0.12)
    P = new Path2D(); P.moveTo(0, 0); P.quadraticCurveTo(r * 0.3, -r * 0.3, r * 0.7, 0); P.quadraticCurveTo(r * 0.3, r * 0.3, 0, 0); vul(P, o.silhouet ? k : '#3fbf5a')
    if (!o.silhouet) { g.strokeStyle = '#2a8a42'; g.lineWidth = lw * 0.7; g.beginPath(); g.moveTo(r * 0.05, 0); g.lineTo(r * 0.6, 0); g.stroke() }
    g.restore()
  } else if (st === 'flits') {
    P = new Path2D(); P.moveTo(r * 0.55, r * 0.5); P.lineTo(r * 0.95, r * 0.1); P.lineTo(r * 0.82, r * 0.02); P.lineTo(r * 1.3, -r * 0.6); P.lineTo(r * 1.0, -r * 0.05); P.lineTo(r * 1.12, r * 0.02); P.lineTo(r * 0.7, r * 0.55); P.closePath()
    vul(P, o.silhouet ? k : '#ffe14f')
  } else if (st === 'dun') {
    g.strokeStyle = lijn; g.lineWidth = r * 0.11; g.beginPath(); g.moveTo(r * 0.6, r * 0.6); g.quadraticCurveTo(r * 1.4, r * 0.65, r * 1.15, -r * 0.1 + Math.sin(t * 3) * r * 0.05); g.stroke()
    g.strokeStyle = donker; g.lineWidth = r * 0.06; g.stroke()
  } else if (st === 'veer') {
    for (var v = 0; v < 3; v++) { g.save(); g.translate(r * 0.6, r * (0.3 + v * 0.12)); g.rotate(-0.3 + v * 0.3); P = new Path2D(); P.ellipse(r * 0.3, 0, r * 0.34, r * 0.1, 0, 0, 7); vul(P, v % 2 ? donker : k); g.restore() }
  } else if (st === 'huis') {
    P = new Path2D(); P.arc(r * 0.32, -r * 0.18, r * 0.66, 0, 7); vul(P, o.silhouet ? k : licht(k, -0.15))
    if (!o.silhouet) { g.strokeStyle = hel; g.lineWidth = r * 0.08; g.beginPath(); for (var a = 0; a < 20; a++) { var hh = a * 0.6, rr = r * 0.05 + a * r * 0.028; g.lineTo(r * 0.32 + Math.cos(hh) * rr, -r * 0.18 + Math.sin(hh) * rr) } g.stroke() }
  } else if (st === 'ster') {
    g.strokeStyle = lijn; g.lineWidth = r * 0.12; g.beginPath(); g.moveTo(r * 0.6, r * 0.45); g.quadraticCurveTo(r * 1.35, r * 0.35, r * 1.15, -r * 0.4); g.stroke()
    g.strokeStyle = donker; g.lineWidth = r * 0.07; g.stroke()
    g.save(); g.shadowColor = '#ffd23d'; g.shadowBlur = o.silhouet ? 0 : r * 0.4; NK.ster(g, r * 1.15, -r * 0.45, r * 0.26, o.silhouet ? k : '#ffd23d'); g.restore()
  }
  // vleugels achter het lijf
  if (L.extra === 'vleugel') {
    var fl2 = Math.sin(t * 9) * 0.3
    g.save(); g.translate(-r * 0.45, -r * 0.1); g.rotate(-0.5 + fl2)
    P = new Path2D(); P.moveTo(0, 0); P.quadraticCurveTo(-r * 0.7, -r * 0.5, -r * 0.95, -r * 0.05); P.quadraticCurveTo(-r * 0.6, r * 0.05, -r * 0.7, r * 0.25); P.quadraticCurveTo(-r * 0.35, r * 0.15, 0, r * 0.2); P.closePath()
    vul(P, donker); g.restore()
  }

  // ── lijf ──
  g.save(); g.scale(1 - adem, 1 + adem)
  var lijf = L.lijf, B = new Path2D()
  if (lijf === 'ovaal') B.ellipse(0, r * 0.12, r * 0.88, r * 0.72, 0, 0, 7)
  else if (lijf === 'druppel') { B.moveTo(0, -r * 0.98); B.bezierCurveTo(r * 0.78, -r * 0.3, r * 0.88, r * 0.86, 0, r * 0.86); B.bezierCurveTo(-r * 0.88, r * 0.86, -r * 0.78, -r * 0.3, 0, -r * 0.98) }
  else if (lijf === 'peer') { B.moveTo(0, -r * 0.88); B.bezierCurveTo(r * 0.62, -r * 0.88, r * 0.98, r * 0.92, 0, r * 0.9); B.bezierCurveTo(-r * 0.98, r * 0.92, -r * 0.62, -r * 0.88, 0, -r * 0.88) }
  else if (lijf === 'breed') B.ellipse(0, r * 0.3, r * 0.98, r * 0.6, 0, 0, 7)
  else if (lijf === 'rots') { [[-0.82, 0.22], [-0.6, -0.55], [-0.1, -0.84], [0.48, -0.66], [0.86, -0.1], [0.78, 0.6], [0.2, 0.88], [-0.55, 0.82]].forEach(function (q, i) { if (i) B.lineTo(q[0] * r, q[1] * r); else B.moveTo(q[0] * r, q[1] * r) }); B.closePath() }
  else B.arc(0, r * 0.06, r * 0.84, 0, 7)
  // oren achter de kop (ronde oren, pluimen en antennes)
  var oor = L.oor, oy = lijf === 'breed' ? -r * 0.12 : -r * 0.6
  var oren = function (voor) {
    ;[-1, 1].forEach(function (z) {
      g.save(); g.scale(z, 1)
      if (oor === 'punt' && voor) { P = new Path2D(); P.moveTo(r * 0.22, oy + r * 0.08); P.quadraticCurveTo(r * 0.42, oy - r * 0.42, r * 0.62, oy - r * 0.62); P.quadraticCurveTo(r * 0.78, oy - r * 0.2, r * 0.7, oy + r * 0.18); P.closePath(); vul(P, k); if (!o.silhouet) { P = new Path2D(); P.moveTo(r * 0.36, oy + r * 0.02); P.quadraticCurveTo(r * 0.5, oy - r * 0.3, r * 0.6, oy - r * 0.42); P.quadraticCurveTo(r * 0.66, oy - r * 0.15, r * 0.6, oy + r * 0.08); P.closePath(); g.fillStyle = '#ffb8c8'; g.fill(P) } }
      if (oor === 'rond' && !voor) { P = new Path2D(); P.arc(r * 0.52, oy, r * 0.24, 0, 7); vul(P, k); if (!o.silhouet) { g.fillStyle = hel; g.beginPath(); g.arc(r * 0.52, oy + r * 0.02, r * 0.12, 0, 7); g.fill() } }
      if (oor === 'vin' && !voor) { P = new Path2D(); P.moveTo(r * 0.55, oy + r * 0.25); P.quadraticCurveTo(r * 0.9, oy - r * 0.05, r * 1.02, oy - r * 0.22); P.quadraticCurveTo(r * 0.9, oy + r * 0.25, r * 0.7, oy + r * 0.5); P.closePath(); vul(P, donker) }
      if (oor === 'blad' && voor) { g.save(); g.translate(r * 0.25, oy - r * 0.05); g.rotate(-0.9 + z * 0); P = new Path2D(); P.moveTo(0, 0); P.quadraticCurveTo(r * 0.25, -r * 0.25, r * 0.55, 0); P.quadraticCurveTo(r * 0.25, r * 0.22, 0, 0); vul(P, o.silhouet ? k : '#3fbf5a'); g.restore() }
      if (oor === 'antenne' && !voor) { g.strokeStyle = lijn; g.lineWidth = r * 0.06; g.beginPath(); g.moveTo(r * 0.18, oy + r * 0.05); g.quadraticCurveTo(r * 0.3, oy - r * 0.5, r * 0.52, oy - r * 0.62); g.stroke(); P = new Path2D(); P.arc(r * 0.52, oy - r * 0.62, r * 0.11, 0, 7); vul(P, o.silhouet ? k : '#ffe14f'); if (!o.silhouet) { g.save(); g.globalCompositeOperation = 'lighter'; NK.vlek(g, r * 0.52, oy - r * 0.62, r * 0.3, '#ffe14f', 0.4 + Math.sin(t * 6) * 0.2); g.restore() } }
      if (oor === 'pluim' && voor) { P = new Path2D(); P.moveTo(r * 0.18, oy + r * 0.12); P.quadraticCurveTo(r * 0.32, oy - r * 0.3, r * 0.5, oy - r * 0.45); P.quadraticCurveTo(r * 0.5, oy - r * 0.05, r * 0.56, oy + r * 0.12); P.closePath(); vul(P, donker) }
      g.restore()
    })
  }
  oren(false)
  // lijf met licht van linksboven en schaduw rechtsonder
  var gr = g.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.08, 0, 0, r * 1.15)
  gr.addColorStop(0, hel); gr.addColorStop(0.5, k); gr.addColorStop(1, donker)
  g.fillStyle = o.silhouet ? k : gr; g.fill(B)
  if (!o.silhouet) {
    g.save(); g.clip(B)
    g.fillStyle = 'rgba(0,0,30,0.18)'; g.beginPath(); g.ellipse(r * 0.45, r * 0.45, r * 0.9, r * 0.75, -0.4, 0, 7); g.fill()
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.ellipse(-r * 0.38, -r * 0.42, r * 0.32, r * 0.16, -0.6, 0, 7); g.fill()
    // buik
    var bg = g.createLinearGradient(0, r * 0.05, 0, r * 0.9); bg.addColorStop(0, 'rgba(255,255,240,0.55)'); bg.addColorStop(1, 'rgba(255,255,240,0.25)')
    g.fillStyle = bg; g.beginPath(); g.ellipse(0, r * 0.48, r * 0.46, r * 0.36, 0, 0, 7); g.fill()
    // tekening op de huid vanaf het tweede stadium
    if (stad >= 2) {
      g.fillStyle = 'rgba(0,0,30,0.22)'; g.strokeStyle = 'rgba(0,0,30,0.25)'; g.lineWidth = r * 0.07
      if (type === 'vuur') { g.fillStyle = 'rgba(255,230,80,0.55)'; g.beginPath(); g.moveTo(0, r * 0.05); g.quadraticCurveTo(r * 0.3, r * 0.4, 0, r * 0.75); g.quadraticCurveTo(-r * 0.3, r * 0.4, 0, r * 0.05); g.fill() }
      if (type === 'water') { g.strokeStyle = 'rgba(255,255,255,0.5)'; for (var wv = 0; wv < 2; wv++) { g.beginPath(); for (var q = -4; q <= 4; q++) g.lineTo(q * r * 0.15, -r * 0.25 + wv * r * 0.2 + Math.sin(q) * r * 0.05); g.stroke() } }
      if (type === 'plant') { g.fillStyle = 'rgba(30,140,60,0.5)'; [[-0.5, -0.1], [0.55, 0.05], [0.4, -0.45]].forEach(function (q) { g.beginPath(); g.ellipse(q[0] * r, q[1] * r, r * 0.12, r * 0.07, 0.6, 0, 7); g.fill() }) }
      if (type === 'bliksem') { g.strokeStyle = 'rgba(40,30,0,0.45)'; [-0.55, 0.55].forEach(function (zx) { g.beginPath(); g.moveTo(zx * r, -r * 0.4); g.lineTo(zx * r * 0.8, -r * 0.15); g.lineTo(zx * r, 0); g.lineTo(zx * r * 0.8, r * 0.2); g.stroke() }) }
      if (type === 'schaduw') { g.fillStyle = 'rgba(255,220,255,0.3)'; [[-0.48, -0.15], [0.5, 0.0]].forEach(function (q) { g.beginPath(); g.arc(q[0] * r, q[1] * r, r * 0.12, 0, 7); g.fill(); g.fillStyle = k; g.beginPath(); g.arc(q[0] * r + r * 0.05, q[1] * r - r * 0.03, r * 0.1, 0, 7); g.fill(); g.fillStyle = 'rgba(255,220,255,0.3)' }) }
    }
    g.restore()
  }
  g.strokeStyle = lijn; g.lineWidth = lw; g.stroke(B)
  oren(true)
  // pootjes en armpjes
  var voetY = lijf === 'breed' ? r * 0.82 : r * 0.84
  ;[-1, 1].forEach(function (z) {
    P = new Path2D(); P.ellipse(z * r * 0.38, voetY, r * 0.22, r * 0.12, 0, 0, 7); vul(P, donker)
    if (!o.silhouet) { g.strokeStyle = lijn; g.lineWidth = lw * 0.6; g.beginPath(); g.moveTo(z * r * 0.32, voetY - r * 0.05); g.lineTo(z * r * 0.32, voetY + r * 0.04); g.moveTo(z * r * 0.44, voetY - r * 0.05); g.lineTo(z * r * 0.44, voetY + r * 0.04); g.stroke() }
    if (lijf !== 'breed' && lijf !== 'rots') { var zw2 = Math.sin(t * 2.6 + z) * 0.15; g.save(); g.translate(z * r * 0.72, r * 0.25); g.rotate(z * (0.5 + zw2)); P = new Path2D(); P.ellipse(0, 0, r * 0.1, r * 0.2, 0, 0, 7); vul(P, k); g.restore() }
  })
  g.restore()   // einde adem

  // ── extra's ──
  var ex = L.extra
  if (ex === 'manen') { for (var mm = 0; mm < 11; mm++) { var hm = Math.PI * 1.08 + mm / 10 * Math.PI * 0.84; P = new Path2D(); P.moveTo(Math.cos(hm - 0.12) * r * 0.62, -r * 0.08 + Math.sin(hm - 0.12) * r * 0.62); P.lineTo(Math.cos(hm) * r * 0.98, -r * 0.08 + Math.sin(hm) * r * 0.98); P.lineTo(Math.cos(hm + 0.12) * r * 0.62, -r * 0.08 + Math.sin(hm + 0.12) * r * 0.62); P.closePath(); vul(P, o.silhouet ? k : (type === 'vuur' ? '#ffb02e' : licht(k, 0.25))) } }
  if (ex === 'kroon') { P = new Path2D(); P.moveTo(-r * 0.32, -r * 0.74); P.lineTo(-r * 0.34, -r * 1.06); P.lineTo(-r * 0.16, -r * 0.9); P.lineTo(0, -r * 1.16); P.lineTo(r * 0.16, -r * 0.9); P.lineTo(r * 0.34, -r * 1.06); P.lineTo(r * 0.32, -r * 0.74); P.closePath(); vul(P, o.silhouet ? k : '#ffd23d'); if (!o.silhouet) { g.fillStyle = '#ff4f7a'; g.beginPath(); g.arc(0, -r * 0.86, r * 0.06, 0, 7); g.fill() } }
  if (ex === 'bloem') { for (var bl = 0; bl < 5; bl++) { var hb = bl * 1.257 + t * 0.5; P = new Path2D(); P.arc(Math.cos(hb) * r * 0.17, -r * 0.84 + Math.sin(hb) * r * 0.17, r * 0.13, 0, 7); vul(P, o.silhouet ? k : '#ff8ad8') } P = new Path2D(); P.arc(0, -r * 0.84, r * 0.1, 0, 7); vul(P, o.silhouet ? k : '#ffe14f') }
  if (ex === 'boom') { [[-0.32, -0.86, 0.3], [0.28, -0.9, 0.32], [0, -1.12, 0.36]].forEach(function (q) { P = new Path2D(); P.arc(q[0] * r, q[1] * r, q[2] * r, 0, 7); vul(P, o.silhouet ? k : '#2f9a4a') }); if (!o.silhouet) { g.fillStyle = '#ff5a5a'; g.beginPath(); g.arc(r * 0.15, -r * 1.0, r * 0.06, 0, 7); g.arc(-r * 0.2, -r * 0.82, r * 0.05, 0, 7); g.fill() } }
  if (ex === 'schelp' || ex === 'golfkam') { P = new Path2D(); P.moveTo(-r * 0.42, -r * 0.7); P.quadraticCurveTo(-r * 0.2, -r * 1.25, 0, -r * 1.02); P.quadraticCurveTo(r * 0.2, -r * 1.3, r * 0.42, -r * 0.7); P.quadraticCurveTo(0, -r * 0.86, -r * 0.42, -r * 0.7); vul(P, o.silhouet ? k : hel) }
  if (ex === 'maan') { P = new Path2D(); P.arc(0, -r * 0.3, r * 0.17, 0, 7); vul(P, o.silhouet ? k : '#fff6cf'); if (!o.silhouet) { g.fillStyle = k; g.beginPath(); g.arc(r * 0.08, -r * 0.35, r * 0.14, 0, 7); g.fill() } }
  // vuur: een vlammetje bovenop de kop
  if (type === 'vuur' && stad >= 2 && ex !== 'kroon' && !o.silhouet) { var vf = Math.sin(t * 10) * r * 0.04; P = new Path2D(); P.moveTo(-r * 0.12, -r * 0.7); P.quadraticCurveTo(-r * 0.05, -r * 1.0, vf, -r * 1.08); P.quadraticCurveTo(r * 0.15, -r * 0.9, r * 0.12, -r * 0.7); P.closePath(); g.fillStyle = '#ffb02e'; g.fill(P) }

  if (!o.silhouet) {
    // ── gezicht ──
    var ogenY = lijf === 'breed' ? r * 0.12 : -r * 0.14, ogenX = r * 0.3, oo = r * (0.2 - L.maat * 0.025)
    var knip = !o.stil && (t % 3.7) > 3.58
    var iris = type === 'schaduw' ? '#ff4fd8' : type === 'vuur' ? '#c25a14' : type === 'water' ? '#1f4fa8' : type === 'plant' ? '#2a7a3a' : '#a87a00'
    ;[-1, 1].forEach(function (z) {
      var ex2 = z * ogenX
      if (knip) { g.strokeStyle = lijn; g.lineWidth = lw * 1.2; g.beginPath(); g.moveTo(ex2 - oo, ogenY); g.quadraticCurveTo(ex2, ogenY + oo * 0.5, ex2 + oo, ogenY); g.stroke(); return }
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ex2, ogenY, oo, oo * 1.2, 0, 0, 7); g.fill()
      g.strokeStyle = lijn; g.lineWidth = lw * 0.8; g.stroke()
      if (type === 'schaduw') { g.save(); g.shadowColor = '#ff4fd8'; g.shadowBlur = r * 0.2 }
      g.fillStyle = iris; g.beginPath(); g.ellipse(ex2 + r * 0.035, ogenY + r * 0.03, oo * 0.68, oo * 0.85, 0, 0, 7); g.fill()
      if (type === 'schaduw') g.restore()
      g.fillStyle = '#0e0e1e'; g.beginPath(); g.ellipse(ex2 + r * 0.045, ogenY + r * 0.04, oo * 0.38, oo * 0.52, 0, 0, 7); g.fill()
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex2 + r * 0.09, ogenY - r * 0.06, oo * 0.28, 0, 7); g.fill()
      g.beginPath(); g.arc(ex2 - r * 0.01, ogenY + r * 0.08, oo * 0.13, 0, 7); g.fill()
      // wenkbrauwen bij het laatste stadium: stoerder
      if (stad >= 3) { g.strokeStyle = lijn; g.lineWidth = lw * 1.1; g.beginPath(); g.moveTo(ex2 - z * oo * 0.9, ogenY - oo * 1.45); g.lineTo(ex2 + z * oo * 0.7, ogenY - oo * 1.2); g.stroke() }
    })
    // wangen
    g.fillStyle = 'rgba(255,110,150,0.4)'; g.beginPath(); g.ellipse(-r * 0.52, ogenY + r * 0.24, r * 0.12, r * 0.07, 0, 0, 7); g.ellipse(r * 0.52, ogenY + r * 0.24, r * 0.12, r * 0.07, 0, 0, 7); g.fill()
    // mond: lief, of stoer met een tandje
    g.strokeStyle = lijn; g.lineWidth = lw
    if (stad >= 3) {
      P = new Path2D(); P.moveTo(-r * 0.14, ogenY + r * 0.2); P.quadraticCurveTo(0, ogenY + r * 0.36, r * 0.14, ogenY + r * 0.2); P.closePath()
      g.fillStyle = '#5a1a2a'; g.fill(P); g.stroke(P)
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(r * 0.05, ogenY + r * 0.21); g.lineTo(r * 0.1, ogenY + r * 0.21); g.lineTo(r * 0.075, ogenY + r * 0.27); g.fill()
    } else { g.beginPath(); g.arc(0, ogenY + r * 0.18, r * 0.1, 0.25, Math.PI - 0.25); g.stroke() }
    // elementdeeltjes rond het wezen
    if (!o.stil && r > 30) {
      g.save(); g.globalCompositeOperation = 'lighter'
      for (var dd = 0; dd < 5; dd++) {
        var fase = (t * 0.6 + dd / 5) % 1, ax = Math.sin(dd * 2.3 + t) * r * 0.9, ay = r * 0.6 - fase * r * 1.8
        var dk = type === 'vuur' ? '#ff9a3d' : type === 'water' ? '#9fe0ff' : type === 'plant' ? '#9aff7a' : type === 'bliksem' ? '#ffe14f' : '#c88aff'
        NK.vlek(g, ax, ay, r * 0.08, dk, (1 - fase) * 0.8)
      }
      g.restore()
    }
  }
  g.restore()
}
function wezenCanvas(id, maat, o) {
  var c = document.createElement('canvas'); c.width = maat * 2; c.height = maat * 2
  tekenWezen(c.getContext("2d"), id, maat, maat * 1.0, maat * 0.82, Object.assign({ stil: true }, o || {}))
  return c
}
function spulIcoon(soort, maat) {
  var c = document.createElement('canvas'); c.width = maat * 2; c.height = maat * 2
  var g = c.getContext('2d'), m = maat
  if (soort === 'glimbol' || soort === 'superbol') {
    var kl = soort === 'glimbol' ? '#5be37a' : '#3fa8ff'
    g.fillStyle = kl; g.beginPath(); g.arc(m, m, m * 0.7, Math.PI, 0); g.fill()
    g.fillStyle = '#eef3ff'; g.beginPath(); g.arc(m, m, m * 0.7, 0, Math.PI); g.fill()
    g.fillStyle = '#14142a'; g.fillRect(m * 0.3, m * 0.94, m * 1.4, m * 0.12)
    g.beginPath(); g.arc(m, m, m * 0.2, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(m, m, m * 0.11, 0, 7); g.fill()
  } else if (soort === 'wekker') {
    g.fillStyle = '#ffd23d'; g.beginPath(); g.arc(m, m * 1.05, m * 0.6, 0, 7); g.fill(); g.strokeStyle = '#14142a'; g.lineWidth = m * 0.1
    g.beginPath(); g.moveTo(m, m * 1.05); g.lineTo(m, m * 0.7); g.moveTo(m, m * 1.05); g.lineTo(m * 1.3, m * 1.15); g.stroke()
  } else {
    var dk = soort === 'drankje' ? '#ff5fb0' : '#9b6bff'
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(m * 0.8, m * 0.25, m * 0.4, m * 0.4)
    g.fillStyle = dk; g.beginPath(); g.arc(m, m * 1.15, m * 0.55, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(m * 0.8, m * 1.0, m * 0.12, 0, 7); g.fill()
  }
  return c
}

// ── canvas ──
var C = NK.canvas($('c'))
var ctx = C.ctx, tijd = 0, fx = NK.deeltjes(), schok = NK.schok()

// ── gevecht: weergave ──
var vis = null           // wat er te zien is: { wij: {...}, zij: {...} }
var anim = {}            // lopende effecten per kant
var bezig = false, wachtrij = [], tekstKlaar = null
function zichtVan(w, kant) { return { uid: w.uid, id: w.id, lvl: w.lvl, hp: w.hp, toon: w.hp, max: MT.maxHp(w), schaal: 1, alfa: 1, kant: kant } }
function naamVan(w, kant) {
  var n = S[w.id].naam, g = D.gevecht
  if (kant === 'wij') return n
  return g && g.soort === 'wild' ? 'Wilde ' + n : (g.naam + "'s " + n)
}
function plekVan(kant) {
  var klein = Math.min(C.W, C.H)
  return kant === 'wij' ? { x: C.W * 0.28, y: C.H * 0.5, r: klein * 0.17 } : { x: C.W * 0.72, y: C.H * 0.24, r: klein * 0.13 }
}
// achtergrond van het gevecht: een landschap in de kleuren van het gebied
var heuvels = null
function tekenGevechtDecor(gebied) {
  var th = MTW.THEMA[gebied], H = C.H, W = C.W, hor = H * 0.42
  var lucht = ctx.createLinearGradient(0, 0, 0, hor)
  var donker = gebied >= 3
  lucht.addColorStop(0, donker ? 'hsl(' + th.lucht + ',55%,10%)' : 'hsl(' + (th.lucht + 60) + ',70%,62%)')
  lucht.addColorStop(1, donker ? 'hsl(' + th.lucht + ',50%,24%)' : 'hsl(' + (th.lucht + 30) + ',75%,82%)')
  ctx.fillStyle = lucht; ctx.fillRect(0, 0, W, hor + 2)
  // zon/maan en sterren
  if (donker) { for (var i = 0; i < 40; i++) { ctx.globalAlpha = 0.4 + Math.sin(tijd * 2 + i) * 0.3; ctx.fillStyle = '#fff'; ctx.fillRect((i * 97.3) % W, (i * 53.1) % hor, 2, 2) } ctx.globalAlpha = 1; NK.vlek(ctx, W * 0.82, hor * 0.3, H * 0.12, '#ffe8c8', 0.45) }
  else NK.vlek(ctx, W * 0.82, hor * 0.25, H * 0.18, '#fff6c8', 0.7)
  // wolkjes die langzaam schuiven
  if (!donker) for (var w = 0; w < 4; w++) {
    var wx = ((tijd * 8 + w * W * 0.33) % (W + 200)) - 100, wy = hor * (0.18 + (w % 3) * 0.18)
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(wx, wy, 44, 12, 0, 0, 7); ctx.ellipse(wx + 26, wy - 8, 26, 14, 0, 0, 7); ctx.ellipse(wx - 22, wy - 4, 20, 10, 0, 0, 7); ctx.fill()
  }
  // heuvels in twee lagen
  ;[[0.62, th.boom, 0.9], [0.8, th.boom2, 1]].forEach(function (laag, n) {
    ctx.fillStyle = laag[1]; ctx.globalAlpha = n ? 0.85 : 0.55
    ctx.beginPath(); ctx.moveTo(0, hor + 4)
    for (var x = 0; x <= W; x += 20) ctx.lineTo(x, hor - Math.abs(Math.sin(x * 0.006 * laag[2] + n * 2)) * H * 0.09 * laag[0] - (n ? 0 : H * 0.03))
    ctx.lineTo(W, hor + 4); ctx.fill()
  })
  ctx.globalAlpha = 1
  if (th.lava) { ctx.fillStyle = 'rgba(255,90,20,0.25)'; ctx.fillRect(0, hor - 30, W, 30) }
  // grond met perspectief
  var grond = ctx.createLinearGradient(0, hor, 0, H)
  grond.addColorStop(0, th.gras2); grond.addColorStop(1, th.gras)
  ctx.fillStyle = grond; ctx.fillRect(0, hor, W, H - hor)
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 2
  for (var r = 1; r < 9; r++) { var y = hor + (H - hor) * Math.pow(r / 9, 1.6); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
  // sprieten
  ctx.fillStyle = th.hoog2
  for (var g = 0; g < 70; g++) { var gx = (g * 137.7) % W, gy = hor + 10 + ((g * 61.3) % (H - hor - 10)), hh = 4 + (gy - hor) * 0.03; ctx.fillRect(gx, gy - hh, 2, hh); ctx.fillRect(gx + 3, gy - hh * 0.7, 2, hh * 0.7) }
}
function tekenGevecht(dt) {
  tekenGevechtDecor(D.gevecht ? D.gevecht.gebied : 0)
  if (anim.intro == null) anim.intro = 0
  anim.intro = Math.min(1, anim.intro + dt * 1.8)
  var inschuif = 1 - Math.pow(1 - anim.intro, 3)

  ;['zij', 'wij'].forEach(function (kant) {
    var v = vis[kant], p0 = plekVan(kant), a = anim[kant] || {}
    var p = { x: p0.x + (kant === 'wij' ? -1 : 1) * (1 - inschuif) * C.W * 0.6, y: p0.y, r: p0.r }
    // grasplateau
    var th = MTW.THEMA[D.gevecht ? D.gevecht.gebied : 0]
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r * 0.98, p.r * 1.55, p.r * 0.4, 0, 0, 7); ctx.fill()
    ctx.fillStyle = th.hoog; ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r * 0.9, p.r * 1.5, p.r * 0.38, 0, 0, 7); ctx.fill()
    ctx.fillStyle = th.gras2; ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r * 0.84, p.r * 1.38, p.r * 0.3, 0, 0, 7); ctx.fill()
    var pg = ctx.createRadialGradient(p.x, p.y + p.r * 0.85, 0, p.x, p.y + p.r * 0.85, p.r * 1.5)
    pg.addColorStop(0, NK.hexA(MT.KLEUR[S[v.id].type], 0.25)); pg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r * 0.85, p.r * 1.5, p.r * 0.38, 0, 0, 7); ctx.fill()
    ctx.strokeStyle = NK.hexA(MT.KLEUR[S[v.id].type], 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r * 0.85, p.r * 1.2, p.r * 0.28, 0, 0, 7); ctx.stroke()
    // effecten
    var dx = 0, dy = 0, wit = 0
    if (a.aanval > 0) { a.aanval -= dt; var f = Math.sin((1 - a.aanval / 0.35) * Math.PI); dx = (kant === 'wij' ? 1 : -1) * f * p.r * 0.5; dy = (kant === 'wij' ? -1 : 1) * f * p.r * 0.25 }
    if (a.raak > 0) { a.raak -= dt; dx += Math.sin(a.raak * 60) * p.r * 0.08; wit = Math.max(0, a.raak / 0.4) }
    if (a.flauw > 0) { a.flauw = Math.min(1, a.flauw + dt * 1.6); v.alfa = 1 - a.flauw; dy += a.flauw * p.r * 0.6 }
    if (a.evo > 0) { a.evo -= dt; wit = Math.min(1, Math.sin((1 - a.evo / 2.2) * Math.PI) * 1.3) }
    if (a.terug != null) v.schaal = Math.max(0, v.schaal - dt * 3)
    if (v.alfa > 0.02 && v.schaal > 0.02) tekenWezen(ctx, v.id, p.x + dx, p.y + dy, p.r, { t: tijd + (kant === 'wij' ? 0 : 1.3), kijk: kant === 'wij' ? 1 : -1, alfa: v.alfa, wit: wit, schaal: v.schaal })
    // levensbalk
    v.toon += (v.hp - v.toon) * Math.min(1, dt * 5)
    var bx = (kant === 'wij' ? C.W * 0.52 : C.W * 0.06) + (kant === 'wij' ? 1 : -1) * (1 - inschuif) * C.W * 0.6, by = kant === 'wij' ? C.H * 0.42 : C.H * 0.08, bw = Math.min(C.W * 0.42, 260)
    ctx.fillStyle = 'rgba(16,18,44,0.85)'; NK.rondRect(ctx, bx, by, bw, 58, 14); ctx.fill()
    ctx.strokeStyle = NK.hexA(MT.KLEUR[S[v.id].type], 0.7); ctx.lineWidth = 1.5; ctx.stroke()
    ctx.fillStyle = '#eef3ff'; ctx.font = '700 15px Outfit, system-ui'; ctx.textBaseline = 'top'; ctx.textAlign = 'left'
    ctx.fillText(S[v.id].naam, bx + 12, by + 8)
    ctx.textAlign = 'right'; ctx.fillStyle = '#8f9bc4'; ctx.fillText('niv. ' + v.lvl, bx + bw - 12, by + 8)
    var pr = Math.max(0, v.toon / v.max)
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; NK.rondRect(ctx, bx + 12, by + 32, bw - 24, 9, 5); ctx.fill()
    ctx.fillStyle = pr > 0.5 ? '#5be37a' : pr > 0.2 ? '#ffd23d' : '#ff5a7a'; NK.rondRect(ctx, bx + 12, by + 32, Math.max(0, (bw - 24) * pr), 9, 5); ctx.fill()
    if (kant === 'wij') { ctx.textAlign = 'right'; ctx.fillStyle = '#8f9bc4'; ctx.font = '700 11px Outfit'; ctx.fillText(Math.ceil(v.toon) + ' / ' + v.max, bx + bw - 12, by + 44) }
  })
  // bal
  if (anim.bal) {
    var b = anim.bal, pz = plekVan('zij'), pw = plekVan('wij')
    b.t += dt
    var f2 = Math.min(1, b.t / 0.5), x = pw.x + (pz.x - pw.x) * f2, y = pw.y + (pz.y - pw.y) * f2 - Math.sin(f2 * Math.PI) * C.H * 0.18
    if (f2 >= 1) { y = pz.y + pz.r * 0.6; x = pz.x + Math.sin(b.schudT * 20) * 8 * Math.max(0, b.schudT) }
    b.schudT = Math.max(0, (b.schudT || 0) - dt)
    var ic = spulIcoon(b.soort, 18)
    ctx.drawImage(ic, x - 18, y - 18, 36, 36)
  }
}

// ── gevecht: verloop ──
function stap(tekst, duur, doe) { wachtrij.push({ tekst: tekst, duur: duur == null ? 1.0 : duur, doe: doe }) }
function speelWachtrij(klaar) {
  bezig = true; toonActies(null)
  var volgende = function () {
    if (!wachtrij.length) { bezig = false; klaar && klaar(); return }
    var s = wachtrij.shift()
    if (s.doe) s.doe()
    if (s.tekst != null) $('tekst').textContent = s.tekst
    var t = setTimeout(volgende, s.duur * 1000)
    tekstKlaar = function () { clearTimeout(t); tekstKlaar = null; volgende() }
  }
  volgende()
}
$('tekst').onclick = function () { if (tekstKlaar) tekstKlaar() }

function startGevecht(g) {
  D.gevecht = g; D.bewaar()
  g.zij.forEach(function (w) { D.gezien[w.id] = true })
  var wi = MT.actiefWij(D.team)
  vis = { wij: zichtVan(D.team[wi], 'wij'), zij: zichtVan(g.zij[g.zi], 'zij') }
  anim = { intro: g.intro === false ? 1 : 0 }
  toonScherm(null); $('paneel').classList.add('aan'); $('wereldhud').classList.remove('aan'); $('dpad').classList.remove('aan'); modus = 'gevecht'
  var zij = g.zij[g.zi]
  if (g.intro !== false) {
    stap(g.soort === 'wild' ? 'Een wilde ' + S[zij.id].naam + ' verschijnt!' : (g.soort === 'leider' ? 'Leider ' : 'Trainer ') + g.naam + ' daagt je uit!', 1.3, function () { Geluid.toon(440, 0.3, 'triangle', 0.12, 0, 880) })
    if (g.soort !== 'wild') stap(g.naam + ' stuurt ' + S[zij.id].naam + '!', 1.0)
    stap('Ga, ' + S[D.team[wi].id].naam + '!', 0.9)
    g.intro = false; D.bewaar()
  }
  speelWachtrij(hoofdMenu)
}
function hoofdMenu() {
  var g = D.gevecht
  $('tekst').textContent = 'Wat doet ' + S[D.team[MT.actiefWij(D.team)].id].naam + '?'
  toonActies([
    { t: 'Vechten', s: 'kies een aanval', doe: aanvalMenu },
    { t: 'Tas', s: tasTekst(), doe: tasMenu },
    { t: 'Wissel', s: 'ander wezen', doe: function () { kiesWezen('Wie gaat er vechten?', function (w, i) { return i !== MT.actiefWij(D.team) && w.hp > 0 }, function (i) { doe({ t: 'wissel', i: i }) }, true) } },
    { t: g.soort === 'wild' ? 'Vluchten' : 'Opgeven', s: g.soort === 'wild' ? 'weg uit het gevecht' : 'terug naar de kaart', doe: function () { if (g.soort === 'wild') doe({ t: 'vlucht' }); else opgeven() } },
  ])
}
function tasTekst() { var n = 0; for (var k in D.tas) n += D.tas[k]; return n + ' spullen' }
function aanvalMenu() {
  var wij = D.team[MT.actiefWij(D.team)], zij = D.gevecht.zij[D.gevecht.zi]
  var lijst = wij.aanvallen.map(function (a) {
    var m = AV[a], mult = m.kracht ? MT.EFFECT[m.type][S[zij.id].type] : 1
    var hint = m.kracht ? (mult > 1 ? '<span class="sterk">Super effectief</span>' : mult < 1 ? '<span class="zwak">Niet zo effectief</span>' : 'kracht ' + m.kracht) : (m.heel ? 'genezen' : m.zij ? 'verzwakt de ander' : 'beschermt jezelf')
    return { t: m.naam, s: hint, type: m.type, doe: function () { doe({ t: 'aanval', a: a }) } }
  })
  lijst.push({ t: 'Terug', s: '', doe: hoofdMenu })
  toonActies(lijst)
}
function tasMenu() {
  var g = D.gevecht, lijst = []
  Object.keys(SPULLEN).forEach(function (k) {
    if (!D.tas[k]) return
    var sp = SPULLEN[k]
    if (sp.kracht && g.soort !== 'wild') return
    lijst.push({ t: sp.naam + ' (' + D.tas[k] + ')', s: sp.kracht ? 'vangen' : sp.wek ? 'wakker maken' : '+' + sp.heel + ' leven', doe: function () {
      if (sp.kracht) { D.tas[k]--; doe({ t: 'bal', kracht: sp.kracht }, k) }
      else kiesWezen(sp.naam + ' voor wie?', function (w) { return sp.wek ? w.hp <= 0 : (w.hp > 0 && w.hp < MT.maxHp(w)) }, function (i) { D.tas[k]--; doe({ t: 'drank', heel: sp.heel, wek: sp.wek, i: i }) }, true)
    } })
  })
  if (!lijst.length) { $('tekst').textContent = 'Je tas is leeg. Koop spullen in de winkel.' }
  lijst.push({ t: 'Terug', s: '', doe: hoofdMenu })
  toonActies(lijst)
}
function toonActies(lijst) {
  var a = $('acties'); a.innerHTML = ''
  ;(lijst || []).forEach(function (x) {
    var b = document.createElement('button')
    if (x.type) { b.className = 'aanval t-' + x.type }
    b.innerHTML = x.t + (x.s ? '<small>' + x.s + '</small>' : '')
    b.onclick = function () { Geluid.klik(); x.doe() }
    a.appendChild(b)
  })
}

// een actie uitvoeren en de gebeurtenissen afspelen
function doe(actie, balSoort) {
  var g = D.gevecht
  var ev = MT.beurt(g, D.team, actie)
  D.bewaar()
  ev.forEach(function (e) { verwerk(e, balSoort) })
  speelWachtrij(naBeurt)
}
function verwerk(e, balSoort) {
  var g = D.gevecht
  var wezen = function (kant) { return kant === 'wij' ? D.team[MT.actiefWij(D.team)] || D.team[0] : g.zij[g.zi] }
  if (e.t === 'tekst') stap(e.s, 1.1)
  if (e.t === 'aanval') {
    var m = AV[e.aanval], w = vis[e.wie]
    stap(naamVan(w, e.wie) + ' gebruikt ' + m.naam + '!', 0.75, function () {
      anim[e.wie] = anim[e.wie] || {}; anim[e.wie].aanval = 0.35; G.aanval(m.type)
      var van = plekVan(e.wie), naar = plekVan(e.wie === 'wij' ? 'zij' : 'wij')
      if (m.kracht) for (var i = 0; i < 14; i++) fx.punt({ x: van.x, y: van.y, vx: (naar.x - van.x) * (1.4 + Math.random() * 0.6), vy: (naar.y - van.y) * (1.4 + Math.random() * 0.6) + (Math.random() - 0.5) * 80, t: 0, max: 0.55, r: 3 + Math.random() * 4, col: MT.KLEUR[m.type], zwaarte: 0 })
    })
  }
  if (e.t === 'mis') stap('Mis!', 0.7)
  if (e.t === 'schade') {
    stap(e.mult > 1 ? 'Super effectief!' : e.mult < 1 ? 'Niet zo effectief...' : null, e.mult !== 1 ? 0.9 : 0.45, function () {
      var kant = e.wie
      vis[kant].hp = e.hp; anim[kant] = anim[kant] || {}; anim[kant].raak = 0.4
      G.raak(e.mult); schok.voeg(e.mult > 1 ? 0.35 : 0.15)
      var p = plekVan(kant)
      fx.spat(p.x, p.y, e.mult > 1 ? 24 : 12, MT.KLEUR[S[vis[kant === 'wij' ? 'zij' : 'wij'].id].type], p.r * 3, { ster: e.mult > 1 })
      fx.tekst(p.x, p.y - p.r, '-' + e.n, e.mult > 1 ? '#ffe08a' : '#ffffff', 24)
    })
  }
  if (e.t === 'stat') stap(naamVan(vis[e.wie], e.wie) + (e.k === 'aanval' ? (e.n < 0 ? ' wordt minder sterk!' : ' wordt sterker!') : (e.n > 0 ? ' is beter beschermd!' : ' is minder beschermd!')), 0.9)
  if (e.t === 'heel') stap((e.wie === 'team' ? 'Je wezen' : naamVan(vis[e.wie === 'team' ? 'wij' : e.wie], e.wie === 'team' ? 'wij' : e.wie)) + ' krijgt ' + e.n + ' leven terug.', 0.9, function () { if (e.wie !== 'team') vis[e.wie].hp = e.hp; G.heel() })
  if (e.t === 'wissel') stap('Kom terug! Ga, ' + S[D.team[0].id].naam + '!', 1.0, function () { vis.wij = zichtVan(D.team[0], 'wij'); anim.wij = {} })
  if (e.t === 'flauw') stap(naamVan(vis[e.wie], e.wie) + ' valt flauw!', 1.1, function () { anim[e.wie] = anim[e.wie] || {}; anim[e.wie].flauw = 0.001; G.flauw() })
  if (e.t === 'xp') { var wx = D.team.find(function (w) { return w.uid === e.uid }); stap((wx ? S[wx.id].naam : 'Je wezen') + ' krijgt ' + e.n + ' XP.', 0.8) }
  if (e.t === 'niveau') stap(S[D.team.find(function (w) { return w.uid === e.uid }).id].naam + ' is nu niveau ' + e.lvl + '!', 1.0, function () { if (vis.wij.uid === e.uid) { var w = D.team.find(function (x) { return x.uid === e.uid }); vis.wij.lvl = e.lvl; vis.wij.max = MT.maxHp(w); vis.wij.hp = w.hp } G.niveau() })
  if (e.t === 'leer') stap('Leert ' + AV[e.aanval].naam + '!' + (e.vergeet ? ' (vergeet ' + AV[e.vergeet].naam + ')' : ''), 1.2)
  if (e.t === 'evolutie') {
    stap('Wat? ' + S[e.van].naam + ' verandert...', 2.2, function () { anim.wij = anim.wij || {}; anim.wij.evo = 2.2; G.evolutie() })
    stap('... in ' + S[e.naar].naam + '!', 1.4, function () { if (vis.wij.uid === e.uid) vis.wij.id = e.naar; D.gezien[e.naar] = D.gevangen[e.naar] = true; var p = plekVan('wij'); fx.spat(p.x, p.y, 40, '#ffffff', p.r * 4, { ster: true }) })
  }
  if (e.t === 'volgende') stap(g.naam + ' stuurt ' + S[e.id].naam + '!', 1.0, function () { vis.zij = zichtVan(g.zij[g.zi], 'zij'); anim.zij = {}; D.gezien[e.id] = true })
  if (e.t === 'bal') {
    stap('Je gooit een ' + SPULLEN[balSoort].naam + '...', 0.7, function () { anim.bal = { t: 0, soort: balSoort, schudT: 0 }; G.bal() })
    stap(null, 0.35, function () { vis.zij.alfa = 1; anim.zij = anim.zij || {}; anim.zij.terug = 1 })
    for (var s = 0; s < Math.max(1, e.schud); s++) stap('...', 0.6, function () { anim.bal.schudT = 0.3; G.schud() })
    if (!e.gelukt) stap('Oh nee, hij ontsnapt!', 1.0, function () { anim.bal = null; anim.zij.terug = null; vis.zij.schaal = 1 })
  }
  if (e.t === 'gevangen') stap('Gevangen! ' + S[e.id].naam + ' hoort bij jou!', 1.6, function () { G.gevangen(); var p = plekVan('zij'); fx.spat(p.x, p.y + p.r * 0.6, 30, '#ffe08a', p.r * 3, { ster: true }) })
  if (e.t === 'gevlucht') stap('Je bent weggekomen!', 0.9)
}
function naBeurt() {
  var g = D.gevecht
  if (!g) return
  if (g.klaar) return eindeGevecht()
  if (D.team[MT.actiefWij(D.team)].hp > 0 && MT.actiefWij(D.team) === 0) return hoofdMenu()
  // eigen wezen flauw: kies een ander (verplicht)
  kiesWezen('Wie gaat er nu vechten?', function (w) { return w.hp > 0 }, function (i) {
    var w = D.team.splice(i, 1)[0]; D.team.unshift(w); D.bewaar()
    vis.wij = zichtVan(w, 'wij'); anim.wij = {}
    stap('Ga, ' + S[w.id].naam + '!', 0.9); speelWachtrij(hoofdMenu)
  }, false)
}
function eindeGevecht() {
  var g = D.gevecht, bericht = null
  if (g.gewonnen && g.soort !== 'wild') {
    var munten = g.zij.reduce(function (s, w) { return s + w.lvl * (g.soort === 'leider' ? 20 : 12) }, 0)
    D.munten += munten; D.versl[g.sleutel] = true
    bericht = 'Je wint van ' + g.naam + '! +' + munten + ' munten'
    if (g.soort === 'leider') {
      bericht += '. Je krijgt de ' + MT.GEBIEDEN[g.gebied].leider.badge + '!'
      if (g.gebied === D.gebied && D.gebied < MT.GEBIEDEN.length - 1) { D.gebied++; bericht += ' Een nieuw gebied is open!' }
      Geluid.win()
    }
  } else if (g.gewonnen) { var mw = g.zij[0].lvl * 3; D.munten += mw; bericht = '+' + mw + ' munten' }
  if (g.gevangen) {
    var w = g.gevangen
    D.gevangen[w.id] = D.gezien[w.id] = true
    if (g.sleutel === 'ster') D.sterrenkat = true
    if (D.team.length < 6) D.team.push(w); else { D.opslag.push(w); bericht = S[w.id].naam + ' gaat naar je opslag (je team is vol).' }
  }
  if (g.verloren) {
    var kwijt = Math.floor(D.munten * 0.1)
    D.munten -= kwijt
    MT.heelAlles(D.team)
    bericht = 'Al je wezens zijn flauw. Je rent naar het wezenhuis' + (kwijt ? ' en verliest ' + kwijt + ' munten.' : '.')
  }
  D.team.forEach(function (x) { x.st = { aanval: 0, verdediging: 0 } })
  D.gevecht = null; D.bewaar()
  $('paneel').classList.remove('aan')
  if (g.verloren) { D.pos = { a: D.huis.a, x: D.huis.x, y: D.huis.y, r: 2 }; D.bewaar() }
  naarWereld()
  if (bericht) zeg(null, bericht)
}
function opgeven() {
  D.gevecht = null; D.team.forEach(function (x) { x.st = { aanval: 0, verdediging: 0 } }); D.bewaar()
  $('paneel').classList.remove('aan'); naarWereld(); zeg(null, 'Je hebt opgegeven. Train je team en probeer het opnieuw!')
}

// ── wezen kiezen (wisselen, drankje, flauw) ──
var kiesTerug = null
function kiesWezen(kop, mag, gekozen, terugMag) {
  $('kieskop').textContent = kop
  var l = $('kieslijst'); l.innerHTML = ''
  D.team.forEach(function (w, i) {
    var b = wezenRij(w, i === MT.actiefWij(D.team) && D.gevecht)
    b.disabled = !mag(w, i)
    b.onclick = function () { Geluid.klik(); $('kies').classList.remove('aan'); gekozen(i) }
    l.appendChild(b)
  })
  $('kiesterug').classList.toggle('verborgen', !terugMag)
  kiesTerug = function () { $('kies').classList.remove('aan'); hoofdMenu() }
  $('kies').classList.add('aan')
}
$('kiesterug').onclick = function () { Geluid.klik(); if (kiesTerug) kiesTerug() }
function wezenRij(w, eerste) {
  var b = document.createElement('button'); b.className = 'wezen' + (eerste ? ' eerste' : '')
  b.appendChild(wezenCanvas(w.id, 64, { alfa: w.hp > 0 ? 1 : 0.45 }))
  var max = MT.maxHp(w), pr = w.hp / max, info = document.createElement('div'); info.className = 'info'
  info.innerHTML = '<div class="naam">' + S[w.id].naam + ' <span class="type t-' + S[w.id].type + '">' + MT.TYPENAAM[S[w.id].type] + '</span></div>' +
    '<div class="klein">niveau ' + w.lvl + ' · ' + (w.hp > 0 ? w.hp + ' / ' + max + ' leven' : 'flauw') + '</div>' +
    '<div class="balkje"><i style="width:' + Math.round(pr * 100) + '%;background:' + (pr > 0.5 ? '#5be37a' : pr > 0.2 ? '#ffd23d' : '#ff5a7a') + '"></i></div>' +
    '<div class="balkje xp"><i style="width:' + Math.round(w.xp / MT.xpNodig(w.lvl) * 100) + '%"></i></div>'
  b.appendChild(info)
  return b
}

// ── de wereld: lopen, praten, gras, trainers, gebouwen ──
var W8 = { a: 0, x: 9, y: 11, r: 2, van: null, t: 0, pad: [], stap: 0, kaart: null, vast: null, uitroep: null, overgang: 0, naOvergang: null, banner: 0, slot: false }
var LOOP = 0.17
var vastLaag = document.createElement('canvas'), vastCtx = vastLaag.getContext('2d')
function ruis(x, y, q) { var h = Math.sin(x * 127.1 + y * 311.7 + q * 74.7 + W8.a * 19.3) * 43758.5453; return h - Math.floor(h) }
function laadGebied(a) {
  W8.kaart = MTW.kaart(a); W8.a = a
  var k = W8.kaart
  vastLaag.width = k.w * MTW.T; vastLaag.height = k.h * MTW.T
  for (var y = 0; y < k.h; y++) for (var x = 0; x < k.w; x++) { var c = k.t[y][x]; MTW.tegel(vastCtx, k, c === 'g' || c === '~' ? '.' : c, x, y, 0, ruis) }
  k.gebouwen.forEach(function (b) { MTW.gebouw(vastCtx, b, k) })
  W8.banner = 3
  $('gebiednaam').textContent = k.naam
}
function naarWereld() {
  $('paneel').classList.remove('aan')
  if (!W8.kaart || W8.a !== D.pos.a) laadGebied(D.pos.a)
  W8.x = D.pos.x; W8.y = D.pos.y; W8.r = D.pos.r; W8.van = null; W8.pad = []; W8.slot = false
  toonScherm(null); $('wereldhud').classList.add('aan'); $('dpad').classList.add('aan')
  modus = 'wereld'
}
var modus = 'menu'
function bewaarPos() { D.pos = { a: W8.a, x: W8.x, y: W8.y, r: W8.r }; D.bewaar() }
function verslagen(sl) { return !!D.versl[sl] }
function dingVrij(d) {
  if (d.soort === 'spul') return true
  if (d.soort === 'wachter') return verslagen('l' + d.gym) && D.versl['w' + d.gym]
  return false
}
function kanLopen(x, y) {
  var k = W8.kaart
  if (x < 0 || y < 0 || x >= k.w || y >= k.h) return false
  var c = k.t[y][x]
  if (c === 'T' || c === '~' || c === 'r') return false
  var b = MTW.opGebouw(k, x, y)
  if (b) return false
  var d = MTW.dingOp(k, x, y)
  if (d && !dingVrij(d) && !(d.soort === 'spul' && D.opgepakt[d.sleutel])) return d.soort === 'spul'
  return true
}
function deurOp(x, y) { return W8.kaart.gebouwen.find(function (b) { return b.deur[0] === x && b.deur[1] === y }) }

// één stap proberen
function loopStap(r) {
  if (W8.van || W8.slot || dialoogOpen) return
  W8.r = r
  var nx = W8.x + MTW.DX[r], ny = W8.y + MTW.DY[r], k = W8.kaart
  // naar het volgende gebied
  if (ny < 0 && k.t[0][nx] === '=') { wissel(W8.a + 1, 'onder', nx); return }
  if (ny >= k.h && k.t[k.h - 1][nx] === '=') { wissel(W8.a - 1, 'boven', nx); return }
  var deur = deurOp(nx, ny)
  if (deur) { W8.pad = []; gaNaarBinnen(deur); return }
  if (!kanLopen(nx, ny)) {
    var d = MTW.dingOp(k, nx, ny)
    if (d && W8.pad.length <= 1) { W8.pad = []; praat(d) }
    else { W8.pad = []; if (!W8.bots || tijd - W8.bots > 0.3) { Geluid.toon(120, 0.05, 'square', 0.04); W8.bots = tijd } }
    return
  }
  W8.van = [W8.x, W8.y]; W8.t = 0; W8.x = nx; W8.y = ny; W8.stap = (W8.stap % 2) + 1
}
function wissel(a, kant, x) {
  if (a < 0 || a >= MTW.AANTAL) return
  W8.overgang = 0.001; W8.slot = true
  W8.naOvergang = function () {
    laadGebied(a)
    var k = W8.kaart
    W8.x = x; W8.y = kant === 'onder' ? k.h - 2 : 1; W8.r = kant === 'onder' ? 0 : 2; W8.van = null; W8.pad = []
    W8.slot = false; bewaarPos()
  }
}
function aangekomen() {
  var k = W8.kaart
  bewaarPos()
  // spul oppakken
  var d = MTW.dingOp(k, W8.x, W8.y)
  if (d && d.soort === 'spul' && !D.opgepakt[d.sleutel]) {
    D.opgepakt[d.sleutel] = true; D.tas[d.spul] = (D.tas[d.spul] || 0) + 1; D.bewaar()
    G.gevangen(); W8.pad = []
    zeg(null, 'Je vindt een ' + SPULLEN[d.spul].naam.toLowerCase() + '! Hij gaat in je tas.')
    return
  }
  // trainers die je zien
  if (zienTrainers()) return
  // wild gras
  if (k.t[W8.y][W8.x] === 'g' && Math.random() < 0.11 && MT.actiefWij(D.team) >= 0) {
    W8.pad = []
    var gb = k.soort === 'poort' ? 5 : k.gebied
    var w = MT.wild(gb, Math.random(), Math.random(), Math.random())
    overgangNaar(function () { klaarVoorGevecht(); startGevecht(MT.gevecht('wild', [w], { gebied: gb, sleutel: 'wild' })) })
  }
}
function zienTrainers() {
  var k = W8.kaart
  for (var n = 0; n < k.dingen.length; n++) {
    var d = k.dingen[n]
    if (d.soort !== 'trainer' || verslagen(d.sleutel)) continue
    for (var s2 = 1; s2 <= 5; s2++) {
      var x = d.x + MTW.DX[d.r] * s2, y = d.y + MTW.DY[d.r] * s2
      if (x === W8.x && y === W8.y) { trainerZiet(d, s2 - 1); return true }
      if (!kanLopen(x, y)) break
    }
  }
  return false
}
function trainerZiet(d, afstand) {
  W8.pad = []; W8.slot = true
  W8.uitroep = { d: d, t: 0.8, afstand: afstand, loop: 0 }
  Geluid.toon(880, 0.12, 'square', 0.08); Geluid.toon(1320, 0.15, 'square', 0.07, 0.1)
}
function trainerKlaarMetLopen(d) {
  W8.r = (d.r + 2) % 4
  zeg(d.naam, ['Hé, jij daar! Laat eens zien wat je wezens kunnen!', 'Ik heb op je gewacht. Tijd voor een gevecht!', 'Mijn team is het sterkste van deze route!'][d.y % 3], function () {
    overgangNaar(function () { klaarVoorGevecht(); var zij = d.team.map(function (q) { return MT.maak(q[0], q[1]) }); startGevecht(MT.gevecht('trainer', zij, { gebied: d.gebied, naam: d.naam, sleutel: d.sleutel })) })
  })
}
// praten met wat voor je staat
function praat(d) {
  W8.pad = []
  if (d.soort === 'bord') zeg(null, d.tekst)
  if (d.soort === 'mens') zeg('Dorpeling', d.tekst)
  if (d.soort === 'trainer') zeg(d.naam, verslagen(d.sleutel) ? 'Wat een goed gevecht was dat! Train je wezens goed.' : 'Hé! Een gevecht?', verslagen(d.sleutel) ? null : function () { trainerKlaarMetLopen(d) })
  if (d.soort === 'wachter') {
    var gl = MT.GEBIEDEN[d.gym].leider
    if (verslagen('l' + d.gym)) { D.versl['w' + d.gym] = true; D.bewaar(); zeg('Wachter', 'Je hebt de ' + gl.badge + '! Ga maar verder, succes op de route.') }
    else zeg('Wachter', 'Hier mag je nog niet langs. Versla eerst leider ' + gl.naam + ' in de gym van dit dorp!')
  }
  if (d.soort === 'legende') {
    var alle = MT.GEBIEDEN.every(function (g, i) { return verslagen('l' + i) })
    if (D.sterrenkat) zeg(null, 'Het is stil bij de poort. De Sterrenkat zit nu in jouw team.')
    else if (!alle) zeg(null, 'Een vreemd licht schijnt hier... Kom terug als je alle zes badges hebt.')
    else zeg(null, 'Er verschijnt een wezen van sterrenlicht!', function () { overgangNaar(function () { klaarVoorGevecht(); startGevecht(MT.gevecht('wild', [MT.maak('sterrenkat', 40)], { gebied: 5, sleutel: 'ster', vangkans: 0.3 })) }) })
  }
}
function gaNaarBinnen(b) {
  W8.r = 0
  if (b.soort === 'wezenhuis' || b.soort === 'thuis') {
    zeg(b.soort === 'thuis' ? 'Mama' : 'Wezenverzorger', b.soort === 'thuis' ? 'Daar ben je! Je wezens mogen even uitrusten.' : 'Welkom in het wezenhuis! Ik maak je wezens weer helemaal beter.', function () {
      MT.heelAlles(D.team); D.huis = { a: W8.a, x: b.deur[0], y: b.deur[1] + 1 }; D.bewaar(); G.heel()
      zeg(null, 'Al je wezens zijn weer fit!')
    })
  }
  if (b.soort === 'winkel') { naarWinkel() }
  if (b.soort === 'huis') zeg('Bewoner', ['Mijn opa ving vroeger een Sterrenkat... zegt hij.', 'Wist je dat Herstel je wezen midden in een gevecht beter maakt?', 'Superballen vangen veel beter dan glimbollen!', 'Een wezen leert nieuwe aanvallen als het een niveau omhoog gaat.', 'Schaduwwezens zijn sterk tegen vuur en plant.', 'Op elke route ligt wel iets op de grond. Kijk goed!', 'De leider van dit dorp is erg sterk.'][W8.a / 2])
  if (b.soort === 'gym') {
    var gl = MT.GEBIEDEN[b.gym].leider
    if (verslagen('l' + b.gym)) zeg('Leider ' + gl.naam, 'Je hebt mijn ' + gl.badge + ' al verdiend. Op naar het volgende dorp!')
    else zeg('Leider ' + gl.naam, 'Welkom in mijn gym! Ik ben ' + gl.naam + '. Win van mij en je krijgt de ' + gl.badge + '.', function () {
      overgangNaar(function () { klaarVoorGevecht(); trainerGevecht(b.gym, 'leider') })
    })
  }
}
function overgangNaar(f) { W8.slot = true; W8.overgang = 0.001; W8.naOvergang = function () { W8.slot = false; f() }; Geluid.toon(300, 0.6, 'sawtooth', 0.06, 0, 1200) }

// ── praatwolk ──
var dialoogOpen = false, dialoogNa = null
function zeg(naam, tekst, na) {
  dialoogOpen = true; dialoogNa = na || null
  $('dnaam').textContent = naam || ''; $('dnaam').style.display = naam ? '' : 'none'
  $('dtekst').textContent = tekst
  $('dialoog').classList.add('aan')
}
function dialoogVerder() {
  if (!dialoogOpen) return
  Geluid.klik()
  dialoogOpen = false; $('dialoog').classList.remove('aan')
  var f = dialoogNa; dialoogNa = null
  if (f) f()
}
$('dialoog').onclick = dialoogVerder

// ── lopen per frame ──
var houd = null
function wereldStap(dt) {
  if (W8.overgang > 0) {
    W8.overgang += dt
    if (W8.overgang > 0.45 && W8.naOvergang) { var f = W8.naOvergang; W8.naOvergang = null; f() }
    if (W8.overgang > 0.9) W8.overgang = 0
  }
  if (W8.uitroep) {
    var u = W8.uitroep
    if (u.t > 0) u.t -= dt
    else if (u.loop < u.afstand) { u.loop = Math.min(u.afstand, u.loop + dt / LOOP) }
    else { W8.uitroep = null; W8.slot = false; trainerKlaarMetLopen(u.d) }
  }
  if (W8.van) {
    W8.t += dt
    if (W8.t >= LOOP) { W8.van = null; aangekomen() }
  }
  if (!W8.van && !W8.slot && !dialoogOpen && modus === 'wereld' && huidig === null) {
    if (W8.pad.length) loopStap(W8.pad.shift())
    else if (W8.wacht != null) { var r2 = W8.wacht; W8.wacht = null; loopStap(r2) }
    else if (houd != null) loopStap(houd)
  }
}
function trainerPlek(d) {
  var u = W8.uitroep
  if (u && u.d === d) return [d.x + MTW.DX[d.r] * u.loop, d.y + MTW.DY[d.r] * u.loop]
  return [d.x, d.y]
}

// tikken: lopen naar dat vakje (kortste weg), of praten met wat daar staat
function tikWereld(sx, sy) {
  if (dialoogOpen) { dialoogVerder(); return }
  if (W8.slot) return
  var sch = wereldSchaal(), cam = camera(sch)
  var tx = Math.floor((sx - cam[0]) / (MTW.T * sch)), ty = Math.floor((sy - cam[1]) / (MTW.T * sch))
  var k = W8.kaart
  if (tx < 0 || ty < 0 || tx >= k.w || ty >= k.h) return
  var doelen = [], d = MTW.dingOp(k, tx, ty), deur = deurOp(tx, ty)
  if (deur) doelen = [[tx, ty + 1]]
  else if (d && !(d.soort === 'spul') && !dingVrij(d)) for (var r = 0; r < 4; r++) doelen.push([tx + MTW.DX[r], ty + MTW.DY[r]])
  else if (kanLopen(tx, ty)) doelen = [[tx, ty]]
  else if (ty === 0 || ty === k.h - 1) doelen = [[tx, ty === 0 ? 1 : k.h - 2]]
  else return
  var pad = zoekPad(doelen)
  if (!pad) return
  // aan het eind: kijken naar het ding / de deur, of verder lopen door de uitgang
  if (deur) pad.push(0)
  else if (d && !dingVrij(d) && d.soort !== 'spul') { var eind = pad.length ? eindPlek(pad) : [W8.x, W8.y]; pad.push(eind[0] < tx ? 1 : eind[0] > tx ? 3 : eind[1] < ty ? 2 : 0) }
  else if (ty === 0 && k.t[0][tx] === '=') pad.push(0)
  else if (ty === k.h - 1 && k.t[k.h - 1][tx] === '=') pad.push(2)
  W8.pad = pad
}
function eindPlek(pad) { var x = W8.x, y = W8.y; pad.forEach(function (r) { x += MTW.DX[r]; y += MTW.DY[r] }); return [x, y] }
function zoekPad(doelen) {
  var k = W8.kaart, start = W8.y * k.w + W8.x, van = {}, rij = [start]
  van[start] = -1
  var isDoel = function (i) { return doelen.some(function (d) { return d[1] * k.w + d[0] === i }) }
  if (isDoel(start)) return []
  for (var q = 0; q < rij.length; q++) {
    var i = rij[q], x = i % k.w, y = i / k.w | 0
    for (var r = 0; r < 4; r++) {
      var nx = x + MTW.DX[r], ny = y + MTW.DY[r], ni = ny * k.w + nx
      if (van[ni] !== undefined || !kanLopen(nx, ny) || deurOp(nx, ny)) continue
      van[ni] = [i, r]
      if (isDoel(ni)) { var pad = [], c = ni; while (van[c] !== -1) { pad.unshift(van[c][1]); c = van[c][0] } return pad }
      rij.push(ni)
    }
  }
  return null
}

// ── tekenen ──
function wereldSchaal() { return Math.max(2, Math.round(Math.min(C.W / (13 * MTW.T), C.H / (12 * MTW.T)))) }
function spelerPx() {
  var f = W8.van ? Math.min(1, W8.t / LOOP) : 1
  var x = W8.van ? W8.van[0] + (W8.x - W8.van[0]) * f : W8.x, y = W8.van ? W8.van[1] + (W8.y - W8.van[1]) * f : W8.y
  return [x * MTW.T, y * MTW.T]
}
function camera(sch) {
  var k = W8.kaart, p = spelerPx(), T = MTW.T
  var cx = C.W / 2 - (p[0] + T / 2) * sch, cy = C.H / 2 - (p[1] + T / 2) * sch
  var mw = k.w * T * sch, mh = k.h * T * sch
  if (mw > C.W) cx = Math.min(0, Math.max(C.W - mw, cx)); else cx = (C.W - mw) / 2
  if (mh > C.H) cy = Math.min(0, Math.max(C.H - mh, cy)); else cy = (C.H - mh) / 2
  return [Math.round(cx), Math.round(cy)]
}
var wereldFx = []
function tekenWereld(dt) {
  var k = W8.kaart, T = MTW.T, sch = wereldSchaal(), cam = camera(sch)
  ctx.fillStyle = '#05040f'; ctx.fillRect(0, 0, C.W, C.H)
  ctx.save(); ctx.translate(cam[0], cam[1]); ctx.scale(sch, sch); ctx.imageSmoothingEnabled = false
  ctx.drawImage(vastLaag, 0, 0)
  // zichtbare vakjes met beweging: hoog gras en water
  var x0 = Math.max(0, Math.floor(-cam[0] / (T * sch)) - 1), y0 = Math.max(0, Math.floor(-cam[1] / (T * sch)) - 1)
  var x1 = Math.min(k.w, x0 + Math.ceil(C.W / (T * sch)) + 3), y1 = Math.min(k.h, y0 + Math.ceil(C.H / (T * sch)) + 3)
  for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) { var c = k.t[y][x]; if (c === 'g' || c === '~') MTW.tegel(ctx, k, c, x, y, tijd, ruis) }
  // dingen en poppetjes, van boven naar onder
  var lijst = k.dingen.filter(function (d) { return !(d.soort === 'spul' && D.opgepakt[d.sleutel]) && !(d.soort === 'wachter' && dingVrij(d)) }).map(function (d) { var p = d.soort === 'trainer' ? trainerPlek(d) : [d.x, d.y]; return { y: p[1], d: d, p: p } })
  var sp = spelerPx()
  lijst.push({ y: sp[1] / T, speler: true })
  lijst.sort(function (a, b) { return a.y - b.y })
  lijst.forEach(function (o) {
    if (o.speler) {
      MTW.persoon(ctx, sp[0], sp[1] - 3, W8.r, W8.van ? W8.stap : 0, { pet: '#e83a3a', jas: '#2f6fe0' })
      // in hoog gras: onderkant van het poppetje in het gras
      if (k.t[W8.y][W8.x] === 'g' && (!W8.van || W8.t > LOOP * 0.5)) {
        ctx.save(); ctx.beginPath(); ctx.rect(W8.x * T, W8.y * T + 8, T, 8); ctx.clip(); MTW.tegel(ctx, k, 'g', W8.x, W8.y, tijd, ruis); ctx.restore()
      }
      return
    }
    var d = o.d, X = o.p[0] * T, Y = o.p[1] * T
    if (d.soort === 'bord') { MTW.px(ctx, X + 7, Y + 8, 2, 7, '#6b4426'); MTW.px(ctx, X + 2, Y + 3, 12, 7, '#a8784a'); MTW.px(ctx, X + 3, Y + 4, 10, 5, '#c8985a'); MTW.px(ctx, X + 4, Y + 5, 8, 1, '#6b4426'); MTW.px(ctx, X + 4, Y + 7, 6, 1, '#6b4426') }
    if (d.soort === 'spul') { var bob = Math.sin(tijd * 4) * 1; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(X + 8, Y + 13, 4, 1.5, 0, 0, 7); ctx.fill(); ctx.drawImage(spulIcoon(d.spul, 6), X + 2, Y + 2 + bob, 12, 12); if (Math.sin(tijd * 5 + d.x) > 0.7) NK.ster(ctx, X + 13, Y + 3, 2, '#ffffff') }
    if (d.soort === 'mens') MTW.persoon(ctx, X, Y - 3, d.r, 0, { pet: d.kleur, jas: '#6a5a8a', haar: '#8a5a2a' })
    if (d.soort === 'trainer') {
      var loopt = W8.uitroep && W8.uitroep.d === d && W8.uitroep.t <= 0
      MTW.persoon(ctx, X, Y - 3, d.r, loopt ? (Math.floor(tijd * 8) % 2) + 1 : 0, { pet: d.kleur, jas: '#2a2a3a', haar: '#1a1a1a' })
      if (W8.uitroep && W8.uitroep.d === d && W8.uitroep.t > 0) { MTW.px(ctx, X + 5, Y - 16, 7, 11, '#ffffff'); MTW.px(ctx, X + 7, Y - 14, 3, 5, '#ff3a3a'); MTW.px(ctx, X + 7, Y - 8, 3, 2, '#ff3a3a') }
    }
    if (d.soort === 'wachter') {
      MTW.persoon(ctx, X, Y - 3, 2, 0, { pet: '#1f3f8f', jas: '#1f3f8f', haar: '#1a1a1a' })
      for (var b2 = 0; b2 < 16; b2 += 4) MTW.px(ctx, X + T + b2, Y + 6, 4, 3, b2 % 8 ? '#ffffff' : '#ff3a3a')
      MTW.px(ctx, X + T + 14, Y + 4, 2, 10, '#6a6a7a')
    }
    if (d.soort === 'legende') {
      var gl = 0.5 + Math.sin(tijd * 2) * 0.3
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; NK.vlek(ctx, X + T, Y + 8, 28, '#ff4fd8', gl * 0.6); ctx.restore()
      MTW.px(ctx, X + 4, Y + 10, 24, 6, '#7a6ab8'); MTW.px(ctx, X + 6, Y + 8, 20, 2, '#9a8ad8')
      if (!D.sterrenkat) tekenWezen(ctx, 'sterrenkat', X + T, Y + 2, 10, { t: tijd, alfa: 0.55 + gl * 0.4 })
    }
  })
  ctx.restore()
  // sfeer per gebied
  var th = k.thema
  if (!D.rustig) {
    if (wereldFx.length < 30 && Math.random() < 0.3) wereldFx.push({ x: Math.random() * C.W, y: th.lava ? C.H + 5 : (th.sterren || th.paddo ? Math.random() * C.H : -5), t: 0, f: Math.random() * 6 })
    wereldFx = wereldFx.filter(function (w) {
      w.t += dt
      if (th.lava) { w.y -= dt * 40; w.x += Math.sin(w.t * 2 + w.f) * 0.5 }
      else if (th.sterren || th.paddo) { w.x += Math.sin(w.t + w.f) * 0.4; w.y += Math.cos(w.t * 0.8 + w.f) * 0.3 }
      else { w.y += dt * 30; w.x += Math.sin(w.t * 2 + w.f) * 0.6 }
      var a = Math.min(1, w.t) * (w.t > 5 ? Math.max(0, 6 - w.t) : 1)
      ctx.globalAlpha = a
      if (th.lava) NK.vlek(ctx, w.x, w.y, 4, '#ff9a3d', 0.9)
      else if (th.sterren) NK.ster(ctx, w.x, w.y, 3 * (0.5 + Math.sin(w.t * 3 + w.f) * 0.5), '#ffd0ff')
      else if (th.paddo) NK.vlek(ctx, w.x, w.y, 5, '#c8ff6a', 0.8)
      else { ctx.fillStyle = k.gebied === 1 ? '#ffe14f' : '#ffb3d9'; ctx.fillRect(w.x, w.y, 3, 2) }
      ctx.globalAlpha = 1
      return w.t < 6 && w.y > -10 && w.y < C.H + 10
    })
  }
  // rand donkerder (vignet)
  var vg = ctx.createRadialGradient(C.W / 2, C.H / 2, Math.min(C.W, C.H) * 0.35, C.W / 2, C.H / 2, Math.max(C.W, C.H) * 0.75)
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, th.paddo || th.sterren ? 'rgba(10,0,30,0.55)' : 'rgba(0,0,20,0.35)')
  ctx.fillStyle = vg; ctx.fillRect(0, 0, C.W, C.H)
  // overgang: flitsen en een zwarte veeg
  if (W8.overgang > 0) {
    var o = W8.overgang
    if (o < 0.45) { ctx.fillStyle = 'rgba(255,255,255,' + (Math.floor(o * 14) % 2 ? 0.7 : 0) + ')'; ctx.fillRect(0, 0, C.W, C.H); ctx.fillStyle = '#05040f'; ctx.fillRect(0, 0, C.W * o / 0.45, C.H) }
    else { ctx.fillStyle = 'rgba(5,4,15,' + Math.max(0, 1 - (o - 0.45) / 0.45) + ')'; ctx.fillRect(0, 0, C.W, C.H) }
  }
  // naam van het gebied
  if (W8.banner > 0) { W8.banner -= dt; $('gebiednaam').style.opacity = Math.min(1, W8.banner) } else $('gebiednaam').style.opacity = 0
}

function klaarVoorGevecht() {
  if (MT.actiefWij(D.team) < 0) { melding('Je wezens zijn flauw. Ga eerst naar het wezenhuis.'); return false }
  // het eerste levende wezen vooraan
  var i = MT.actiefWij(D.team); if (i > 0) { var w = D.team.splice(i, 1)[0]; D.team.unshift(w) }
  return true
}
function trainerGevecht(i, soort) {
  if (!klaarVoorGevecht()) return
  var t = MT.GEBIEDEN[i][soort], zij = t.team.map(function (q) { return MT.maak(q[0], q[1]) })
  startGevecht(MT.gevecht(soort, zij, { gebied: i, naam: t.naam, sleutel: (soort === 'leider' ? 'l' : 't') + i }))
}

// ── team, details, wezenboek, winkel ──
function naarTeam() {
  var l = $('teamlijst'); l.innerHTML = ''
  D.team.forEach(function (w, i) { var b = wezenRij(w, i === 0); b.onclick = function () { Geluid.klik(); details(w, 'team', i) }; l.appendChild(b) })
  var o = $('opslaglijst'); o.innerHTML = ''
  $('opslagkop').classList.toggle('verborgen', !D.opslag.length)
  D.opslag.forEach(function (w, i) { var b = wezenRij(w, false); b.onclick = function () { Geluid.klik(); details(w, 'opslag', i) }; o.appendChild(b) })
  toonScherm('team')
}
function details(w, waar, i) {
  var c = $('c-details'), g = c.getContext('2d')
  detailsWezen = w
  g.clearRect(0, 0, 320, 320)
  $('d-naam').textContent = S[w.id].naam
  $('d-type').innerHTML = '<span class="type t-' + S[w.id].type + '">' + MT.TYPENAAM[S[w.id].type] + '</span> <span class="klein">niveau ' + w.lvl + (S[w.id].evo ? ' · verandert op niveau ' + S[w.id].evo[1] : '') + '</span>'
  var b = S[w.id].b, st = function (n, v) { return '<div class="stat"><b>' + v + '</b><span>' + n + '</span></div>' }
  $('d-stats').innerHTML = st('leven', w.hp + '/' + MT.maxHp(w)) + st('aanval', Math.floor(b[1] * 2 * w.lvl / 100) + 5) + st('verdediging', Math.floor(b[2] * 2 * w.lvl / 100) + 5) + st('snelheid', Math.floor(b[3] * 2 * w.lvl / 100) + 5)
  $('d-aanvallen').innerHTML = w.aanvallen.map(function (a) { var m = AV[a]; return '<div class="wezen"><div class="info"><div class="naam">' + m.naam + ' <span class="type t-' + m.type + '">' + MT.TYPENAAM[m.type] + '</span></div><div class="klein">' + (m.kracht ? 'kracht ' + m.kracht + ' · raakt ' + m.kans + '%' : m.heel ? 'geneest 40%' : m.zij ? 'maakt de ander minder sterk' : 'beter beschermd') + '</div></div></div>' }).join('')
  var k = $('d-knoppen'); k.innerHTML = ''
  var knop = function (t, f, hoofd) { var x = document.createElement('button'); x.className = hoofd ? 'knop' : 'knop2'; x.textContent = t; x.onclick = function () { Geluid.klik(); f() }; k.appendChild(x) }
  if (waar === 'team' && i > 0) knop('Zet vooraan', function () { D.team.splice(i, 1); D.team.unshift(w); D.bewaar(); naarTeam() }, true)
  if (waar === 'team' && D.team.length > 1) knop('Naar opslag', function () { D.team.splice(i, 1); D.opslag.push(w); D.bewaar(); naarTeam() })
  if (waar === 'opslag') knop('In je team', function () { if (D.team.length >= 6) { melding('Je team is vol. Zet eerst een wezen in de opslag.'); return } D.opslag.splice(i, 1); D.team.push(w); D.bewaar(); naarTeam() }, true)
  knop('Terug', naarTeam)
  toonScherm('details')
}
var detailsWezen = null
function naarDex() {
  var l = $('dexlijst'); l.innerHTML = ''
  var ids = Object.keys(S), n = ids.filter(function (id) { return D.gevangen[id] }).length
  $('dexsub').textContent = 'Gevangen: ' + n + ' van ' + ids.length + ' · gezien: ' + ids.filter(function (id) { return D.gezien[id] }).length
  ids.forEach(function (id) {
    var d = document.createElement('div'); d.className = 'dexvak'
    if (D.gezien[id]) { d.appendChild(wezenCanvas(id, 64, { silhouet: !D.gevangen[id] })); d.appendChild(document.createTextNode(S[id].naam)) }
    else { var c = document.createElement('canvas'); c.width = 128; c.height = 128; d.appendChild(c); d.appendChild(document.createTextNode('???')) }
    l.appendChild(d)
  })
  toonScherm('dex')
}
function naarWinkel() {
  $('winkelmunten').textContent = D.munten
  var l = $('winkellijst'); l.innerHTML = ''
  Object.keys(SPULLEN).forEach(function (k) {
    var sp = SPULLEN[k], d = document.createElement('div'); d.className = 'winkelrij'
    d.appendChild(spulIcoon(k, 22))
    var info = document.createElement('div'); info.innerHTML = '<b>' + sp.naam + '</b> <span class="klein">(je hebt er ' + (D.tas[k] || 0) + ')</span><div class="klein">' + sp.uitleg + '</div>'
    d.appendChild(info)
    var b = document.createElement('button'); b.className = 'koop'; b.innerHTML = '<span class="munt" style="color:inherit">' + sp.prijs + '</span>'; b.disabled = D.munten < sp.prijs
    b.onclick = function () { if (D.munten < sp.prijs) return; D.munten -= sp.prijs; D.tas[k] = (D.tas[k] || 0) + 1; D.bewaar(); Geluid.koop(); naarWinkel() }
    d.appendChild(b); l.appendChild(d)
  })
  toonScherm('winkel')
}

// ── starter ──
function naarStarter() {
  var l = $('startkeuze'); l.innerHTML = ''
  MT.STARTERS.forEach(function (id) {
    var b = document.createElement('button'); b.className = 'start t-' + S[id].type
    b.appendChild(wezenCanvas(id, 130))
    b.insertAdjacentHTML('beforeend', '<b>' + S[id].naam + '</b><span class="type t-' + S[id].type + '">' + MT.TYPENAAM[S[id].type] + '</span>')
    b.onclick = function () {
      Geluid.koop()
      D.team = [MT.maak(id, 5)]; D.gezien[id] = D.gevangen[id] = true; D.bewaar()
      D.pos = { a: 0, x: 9, y: 11, r: 2 }; D.bewaar()
      naarWereld(); zeg('Mama', 'Wat een mooi wezen! Loop naar boven, naar Route 1. In het hoge gras wonen wilde wezens. Succes!')
    }
    l.appendChild(b)
  })
  toonScherm('starter')
}

// ── schermen ──
var huidig = 'menu'
function toonScherm(id) {
  huidig = id
  ;['menu', 'starter', 'team', 'details', 'dex', 'winkel'].forEach(function (x) { $(x).classList.toggle('aan', x === id) })
  var hub = id === 'team' || id === 'details' || id === 'dex' || id === 'winkel'
  if (id !== null) { $('wereldhud').classList.remove('aan'); $('dpad').classList.remove('aan') }
  if (id !== null) modus = 'scherm'
  $('onderknoppen').classList.toggle('aan', hub)
  $('menutop').classList.toggle('aan', id === 'menu' && !BELONING)
  $('topmunten').textContent = D.munten
}
function melding(t) {
  var m = document.querySelector('.melding') || (function () { var x = document.createElement('div'); x.className = 'melding'; x.style.bottom = 'calc(80px + var(--onder))'; x.style.zIndex = 20; document.body.appendChild(x); return x })()
  m.textContent = t; m.classList.remove('aan'); void m.offsetWidth; m.classList.add('aan'); clearTimeout(melding.t); melding.t = setTimeout(function () { m.classList.remove('aan') }, 3200)
}
$('naarkaart').onclick = function () { Geluid.klik(); naarWereld() }
$('naarteam').onclick = function () { Geluid.klik(); naarTeam() }
$('naardex').onclick = function () { Geluid.klik(); naarDex() }
$('naarwinkel').onclick = function () { Geluid.klik(); naarWinkel() }
$('terug').onclick = function () { Geluid.klik(); NK.naarOuder('monsterteam-terug') }
$('speel').onclick = function () { Geluid.klik(); verder() }
$('s-geluid').onclick = function () { D.geluid = !D.geluid; D.bewaar(); this.classList.toggle('aan', D.geluid); Geluid.klik() }
$('s-rustig').onclick = function () { D.rustig = !D.rustig; D.bewaar(); this.classList.toggle('aan', D.rustig); Geluid.klik() }
function verder() {
  if (!D.team.length) return naarStarter()
  if (D.gevecht && D.gevecht.zij) return startGevecht(D.gevecht)
  naarWereld()
}

// ── besturing in de wereld ──
var TOETS = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 }
window.addEventListener('keydown', function (e) {
  Geluid.audio()
  if (modus !== 'wereld') return
  if (TOETS[e.code] != null) { e.preventDefault(); if (dialoogOpen || e.repeat) return; houd = TOETS[e.code]; W8.pad = []; if (W8.van) W8.wacht = houd; else loopStap(houd) }
  if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); aKnop() }
})
window.addEventListener('keyup', function (e) { if (TOETS[e.code] === houd) houd = null })
function aKnop() {
  if (dialoogOpen) { dialoogVerder(); return }
  if (W8.van || W8.slot) return
  var nx = W8.x + MTW.DX[W8.r], ny = W8.y + MTW.DY[W8.r]
  var deur = deurOp(nx, ny); if (deur) { gaNaarBinnen(deur); return }
  var d = MTW.dingOp(W8.kaart, nx, ny); if (d && d.soort !== 'spul') praat(d)
}
document.querySelectorAll('#dpad [data-r]').forEach(function (b) {
  var r = +b.dataset.r
  b.addEventListener('pointerdown', function (e) { e.preventDefault(); Geluid.audio(); if (dialoogOpen) { dialoogVerder(); return } houd = r; W8.pad = [] })
  b.addEventListener('pointerup', function () { if (houd === r) houd = null })
  b.addEventListener('pointerleave', function () { if (houd === r) houd = null })
})
$('aknop').addEventListener('pointerdown', function (e) { e.preventDefault(); aKnop() })
$('c').addEventListener('pointerdown', function (e) { Geluid.audio(); if (modus === 'wereld') tikWereld(e.clientX, e.clientY) })
$('wmenu').onclick = function () { Geluid.klik(); bewaarPos(); naarTeam() }
$('wterug').onclick = function () { Geluid.klik(); bewaarPos(); houd = null; W8.pad = []; toonScherm('menu'); $('speel').textContent = 'Verder spelen' }
if (BELONING) $('wterug').style.display = 'none'
// controller
var padOud = {}
function controller() {
  if (modus !== 'wereld') return
  var lijst = navigator.getGamepads ? navigator.getGamepads() : []
  for (var i = 0; i < lijst.length; i++) {
    var g = lijst[i]; if (!g) continue
    var ax = g.axes[0] || 0, ay = g.axes[1] || 0, kn = function (n) { return !!(g.buttons[n] && g.buttons[n].pressed) }
    var r = kn(12) || ay < -0.55 ? 0 : kn(15) || ax > 0.55 ? 1 : kn(13) || ay > 0.55 ? 2 : kn(14) || ax < -0.55 ? 3 : null
    houd = r
    if (kn(0) && !padOud.a) aKnop()
    padOud.a = kn(0)
  }
}

// ── hoofdlus ──
var vorige = performance.now()
function frame(nu) {
  var dt = Math.min(0.05, (nu - vorige) / 1000); vorige = nu; tijd += dt
  ctx.setTransform(C.dpr, 0, 0, C.dpr, 0, 0)
  schok.rustig = D.rustig
  controller()
  var gb = D.gevecht ? MT.GEBIEDEN[D.gevecht.gebied] : MT.GEBIEDEN[MTW.gebiedVan(D.pos.a)]
  var hue = { '#5be37a': 140, '#ffd23d': 45, '#3fa8ff': 210, '#ff6a3d': 15, '#a56bff': 270, '#ff4fd8': 320 }[gb.kleur] || 200
  if (modus !== 'gevecht') NK.achtergrond(ctx, C.W, C.H, tijd, hue, D.rustig)
  if (modus === 'wereld' && W8.kaart) { wereldStap(dt); tekenWereld(dt) }
  else if (D.gevecht && vis && huidig === null) {
    var sk = schok.stap(dt)
    ctx.save(); ctx.translate(sk[0], sk[1]); tekenGevecht(dt); fx.teken(ctx, dt); ctx.restore()
  } else if (huidig === 'menu') {
    // drie wezens dansen achter het titelscherm
    var ids = ['vlamvos', 'golfling', 'bladbeer'], r = Math.min(C.W, C.H) * 0.12
    ids.forEach(function (id, i) { tekenWezen(ctx, id, C.W * (0.25 + i * 0.25), C.H * 0.78 + Math.sin(tijd * 2 + i) * 6, r, { t: tijd + i }) })
  }
  requestAnimationFrame(frame)
}

// ── start ──
if (BELONING) verder()
else { $('s-geluid').classList.toggle('aan', D.geluid); $('s-rustig').classList.toggle('aan', D.rustig); toonScherm('menu') }
requestAnimationFrame(frame)
})()
