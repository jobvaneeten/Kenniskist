// Neonhockey — scherm, besturing, effecten, winkel. Natuurkunde en computerspeler staan in kern.js.
(function () {
'use strict'
var cv = document.getElementById('c'), ctx = cv.getContext('2d')
var $ = function (id) { return document.getElementById(id) }
var T = HK.TEGENSTANDERS

// ── inbedding ──
var params = new URLSearchParams(location.search)
var BELONING = !params.has('terug')
if (!BELONING) {
  $('terug').classList.add('aan')
  $('terug').onclick = function () { parent.postMessage({ type: 'neonhockey-terug' }, '*') }
}

// ── opslag (kk_-prefix ⇒ synct mee naar het account) ──
var OPSLAG = 'kk_nh'
var D = (function () {
  var d = {}
  try { d = JSON.parse(localStorage.getItem(OPSLAG) || '{}') || {} } catch (e) {}
  return { munten: d.munten || 0, verslagen: d.verslagen || 0, bezit: d.bezit || ['neon', 'gloed'], stick: d.stick || 'neon',
    spoor: d.spoor || 'gloed', geluid: d.geluid !== false, gewonnen: d.gewonnen || 0, gespeeld: d.gespeeld || 0 }
})()
function bewaar() { try { localStorage.setItem(OPSLAG, JSON.stringify(D)) } catch (e) {} }

// ── winkel ──
var STICKS = [
  { id: 'neon', naam: 'Neon', prijs: 0, kleur: '#3ef0ff' },
  { id: 'limoen', naam: 'Limoen', prijs: 80, kleur: '#8cff5a' },
  { id: 'vuur', naam: 'Vuur', prijs: 150, kleur: '#ff7a2f', vorm: 'vuur' },
  { id: 'ijs', naam: 'IJs', prijs: 250, kleur: '#b3f5ff', vorm: 'ijs' },
  { id: 'ster', naam: 'Ster', prijs: 400, kleur: '#ffc83d', vorm: 'ster' },
  { id: 'galaxy', naam: 'Heelal', prijs: 600, kleur: '#9b6bff', vorm: 'galaxy' },
  { id: 'regenboog', naam: 'Regenboog', prijs: 850, kleur: '#ff4fd8', vorm: 'regenboog' },
  { id: 'goud', naam: 'Goud', prijs: 1200, kleur: '#ffd54f', vorm: 'goud' },
]
var SPOREN = [
  { id: 'gloed', naam: 'Gloed', prijs: 0 },
  { id: 'vonken', naam: 'Vonken', prijs: 120 },
  { id: 'komeet', naam: 'Komeet', prijs: 300 },
  { id: 'regenboog', naam: 'Regenboog', prijs: 500 },
  { id: 'sterren', naam: 'Sterrenstof', prijs: 800 },
]
function stickStijl() { return STICKS.find(function (s) { return s.id === D.stick }) || STICKS[0] }

function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] }
function rgba(h, a) { var c = hex(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')' }
function tint(h, f) { var c = hex(h).map(function (v) { return Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)) }); return 'rgb(' + c.join(',') + ')' }
function hsl(h, s, l) { return 'hsl(' + h + ',' + s + '%,' + l + '%)' }

// ── layout ──
var dpr = 1, W = 0, H = 0, S = 1, ox = 0, oy = 0
function meet() {
  dpr = Math.min(2, window.devicePixelRatio || 1)
  W = innerWidth; H = innerHeight
  cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr)
  S = Math.min((W - 24) / HK.B, (H - 74) / HK.H)
  ox = (W - HK.B * S) / 2
  oy = 62 + (H - 66 - HK.H * S) / 2
}
window.addEventListener('resize', meet)
function px(x) { return ox + x * S }
function py(y) { return oy + y * S }

// ── geluid (WebAudio, geen bestanden) ──
var AC = null
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)() } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC }
function toon(f, dur, type, vol, delay, f2) {
  if (!D.geluid) return
  var a = audio(); if (!a) return
  var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain()
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur)
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02)
}
var laatstGeluid = 0
var Geluid = {
  raak: function (k) { var n = performance.now(); if (n - laatstGeluid < 40) return; laatstGeluid = n; toon(320 + Math.min(k, 3) * 160, 0.07, 'triangle', 0.14, 0, 180) },
  muur: function (k) { var n = performance.now(); if (n - laatstGeluid < 40) return; laatstGeluid = n; toon(200 + Math.min(k, 3) * 60, 0.05, 'square', 0.04) },
  bumper: function () { toon(880, 0.12, 'sine', 0.1, 0, 1320) },
  goal: function () { [523, 659, 784, 1047].forEach(function (f, i) { toon(f, 0.25, 'square', 0.06, i * 0.07) }) },
  tegengoal: function () { [330, 262, 196].forEach(function (f, i) { toon(f, 0.22, 'triangle', 0.1, i * 0.1) }) },
  fluit: function () { toon(1800, 0.12, 'sine', 0.07); toon(2100, 0.2, 'sine', 0.07, 0.13) },
  win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { toon(f, 0.32, 'sine', 0.09, i * 0.09) }) },
  verlies: function () { [392, 330, 262, 196].forEach(function (f, i) { toon(f, 0.3, 'triangle', 0.09, i * 0.15) }) },
  koop: function () { [784, 988, 1319].forEach(function (f, i) { toon(f, 0.18, 'sine', 0.08, i * 0.07) }) },
}
function tekenGeluidKnop() { $('golf').style.display = D.geluid ? '' : 'none'; $('geluid').style.opacity = D.geluid ? 1 : 0.6 }
$('geluid').onclick = function () { D.geluid = !D.geluid; bewaar(); tekenGeluidKnop(); if (D.geluid) Geluid.raak(1) }

// ── spelstaat ──
var w = null, tegenNr = -1, actief = false, gepauzeerd = false
var deeltjes = [], teksten = [], flits = 0, flitsKleur = '#fff', schud = 0
var invoer = [null, null], vingers = {}

function start(nr) {
  tegenNr = nr
  w = HK.nieuweWedstrijd({ tegen: nr < 0 ? null : nr })
  actief = true; gepauzeerd = false
  deeltjes = []; teksten = []; flits = 0; schud = 0
  invoer = [null, null]; vingers = {}
  toonScherm(null)
  tekst(HK.B / 2, HK.H / 2, nr < 0 ? 'Start!' : 'Tegen ' + T[nr].naam, '#fff', 1.4, 0.07)
  Geluid.fluit()
  tekenHud()
}

// ── besturing ──
function naarTafel(e) { return { x: (e.clientX - ox) / S, y: (e.clientY - oy) / S } }
function kantVan(p) { return tegenNr < 0 ? (p.y < HK.H / 2 ? 1 : 0) : 0 }
cv.addEventListener('pointerdown', function (e) {
  audio()
  if (!actief || gepauzeerd) return
  var p = naarTafel(e), k = kantVan(p)
  vingers[e.pointerId] = k
  invoer[k] = p
  try { cv.setPointerCapture(e.pointerId) } catch (er) {}
})
cv.addEventListener('pointermove', function (e) {
  if (!actief) return
  var p = naarTafel(e)
  var k = vingers[e.pointerId]
  if (k == null) { if (e.pointerType !== 'mouse') return; k = 0 }   // muis hoeft niet te klikken
  invoer[k] = p
})
function los(e) { delete vingers[e.pointerId] }
cv.addEventListener('pointerup', los)
cv.addEventListener('pointercancel', los)

// ── effecten ──
function deeltje(x, y, col, snel, leven) {
  var a = Math.random() * Math.PI * 2, v = (0.3 + Math.random()) * (snel || 0.6)
  deeltjes.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, max: leven || (0.35 + Math.random() * 0.4), col: col, r: 0.004 + Math.random() * 0.006 })
}
function tekst(x, y, s, col, duur, maat) { teksten.push({ x: x, y: y, s: s, col: col, t: 0, max: duur || 1, maat: maat || 0.05 }) }
function kleurKant(k) {
  if (k === 0) return stickStijl().kleur
  return tegenNr < 0 ? '#ff4fd8' : T[tegenNr].kleur
}

function verwerk(ev) {
  ev.forEach(function (e) {
    if (e.type === 'raak') {
      Geluid.raak(e.kracht)
      var c = kleurKant(e.kant)
      for (var i = 0; i < Math.min(14, 3 + e.kracht * 4); i++) deeltje(e.x, e.y, c, 0.4 + e.kracht * 0.3)
      if (e.kracht > 2.2) schud = Math.max(schud, 5)
    } else if (e.type === 'muur' || e.type === 'paal') {
      Geluid.muur(e.kracht)
      for (var j = 0; j < 4; j++) deeltje(e.x, e.y, '#ffffff', 0.3)
    } else if (e.type === 'bumper') {
      Geluid.bumper()
      for (var b = 0; b < 10; b++) deeltje(e.x, e.y, '#ff8a3d', 0.6)
    } else if (e.type === 'goal') {
      var jij = e.voor === 0
      var col = kleurKant(e.voor)
      if (tegenNr >= 0 && !jij) Geluid.tegengoal(); else Geluid.goal()
      flits = 1; flitsKleur = col; schud = 14
      var gy = e.voor === 0 ? 0 : HK.H
      for (var g = 0; g < 50; g++) deeltje(e.x, gy, g % 3 ? col : '#ffffff', 1.4, 0.6 + Math.random() * 0.6)
      var woord = tegenNr < 0 ? (jij ? 'Goal onder!' : 'Goal boven!') : (jij ? 'GOAL!' : 'Tegengoal')
      tekst(HK.B / 2, HK.H / 2, woord, col, 1.1, 0.085)
      tekenHud()
    } else if (e.type === 'gouden') {
      Geluid.fluit()
      tekst(HK.B / 2, HK.H / 2, 'Gouden goal!', '#ffc83d', 1.6, 0.075)
      tekst(HK.B / 2, HK.H / 2 + 0.09, 'Wie nu scoort, wint', '#ffffff', 1.6, 0.035)
    } else if (e.type === 'einde') {
      actief = false
      setTimeout(einde, 1300)
    }
  })
}

function tekenHud() {
  if (!w) return
  $('s0').textContent = w.score[0]; $('s1').textContent = w.score[1]
  var s = Math.ceil(w.klok)
  $('klok').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
  $('klok').className = w.gouden ? 'gouden' : s <= 10 ? 'krap' : ''
}

// ── einde ──
function einde() {
  var won = w.winnaar === 0, gelijk = w.winnaar === -1
  $('e0').textContent = w.score[0]; $('e1').textContent = w.score[1]
  $('ontgrendeld').classList.add('verborgen')
  if (tegenNr < 0) {
    $('eindtitel').textContent = gelijk ? 'Gelijkspel!' : won ? 'Onder wint!' : 'Boven wint!'
    $('eindsub').textContent = '2 spelers'
    $('eindmunten').classList.add('verborgen')
    $('volgende').classList.add('verborgen')
    if (gelijk) Geluid.fluit(); else Geluid.win()
  } else {
    var t = T[tegenNr], verdiend = HK.beloning(w, tegenNr)
    D.munten += verdiend; D.gespeeld++
    $('eindtitel').textContent = won ? 'Gewonnen!' : gelijk ? 'Gelijkspel' : 'Verloren'
    $('eindsub').textContent = (won ? 'Je versloeg ' : 'Tegen ') + t.naam
    $('eindmunten').classList.remove('verborgen')
    $('verdiend').textContent = verdiend
    if (won) {
      D.gewonnen++
      if (tegenNr === D.verslagen && D.verslagen < T.length) {
        D.verslagen++
        $('ontgrendeld').textContent = D.verslagen < T.length ? 'Nieuwe tegenstander: ' + T[D.verslagen].naam : 'Je bent de kampioen!'
        $('ontgrendeld').classList.remove('verborgen')
      }
      Geluid.win()
    } else Geluid.verlies()
    bewaar()
    $('volgende').classList.toggle('verborgen', BELONING || !won || tegenNr + 1 >= T.length)
  }
  $('nogeens').classList.toggle('verborgen', BELONING)
  $('naarmenu').classList.toggle('verborgen', BELONING)
  $('klaar').classList.toggle('verborgen', !BELONING)
  $('nogeens').className = BELONING ? 'knop verborgen' : $('volgende').classList.contains('verborgen') ? 'knop' : 'knop2'
  toonScherm('einde')
}

// ── tekenen ──
var vorige = performance.now(), tijd = 0
function frame(nu) {
  var dt = Math.min(0.05, (nu - vorige) / 1000); vorige = nu
  tijd += dt
  if (w && actief && !gepauzeerd) {
    verwerk(HK.stap(w, dt, invoer))
    tekenHud()
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  achtergrond()
  ctx.save()
  if (schud > 0.3) { ctx.translate((Math.random() - 0.5) * schud, (Math.random() - 0.5) * schud); schud *= 0.88 } else schud = 0
  tafel()
  if (w) {
    w.pucks.forEach(tekenPuck)
    tekenStick(w.sticks[1], 1)
    tekenStick(w.sticks[0], 0)
  }
  effecten(dt)
  ctx.restore()
  if (flits > 0) { ctx.fillStyle = rgba(flitsKleur.charAt(0) === '#' ? flitsKleur : '#ffffff', flits * 0.22); ctx.fillRect(0, 0, W, H); flits = Math.max(0, flits - dt * 2.5) }
  requestAnimationFrame(frame)
}

var sterren = []
for (var i = 0; i < 70; i++) sterren.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.3, f: Math.random() * 6 })
function achtergrond() {
  var g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#0a0820'); g.addColorStop(1, '#03040c')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#fff'
  sterren.forEach(function (s) { ctx.globalAlpha = 0.25 + 0.25 * Math.sin(tijd * 1.3 + s.f); ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 7); ctx.fill() })
  ctx.globalAlpha = 1
}

function rr(x, y, w2, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w2, y, x + w2, y + h, r); ctx.arcTo(x + w2, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w2, y, r); ctx.closePath()
}

function tafel() {
  var x0 = px(0), y0 = py(0), tw = HK.B * S, th = HK.H * S, r = 0.06 * S
  var c0 = kleurKant(0), c1 = kleurKant(1)
  // vlak
  ctx.save()
  rr(x0, y0, tw, th, r)
  var g = ctx.createLinearGradient(0, y0, 0, y0 + th)
  g.addColorStop(0, '#120a2a'); g.addColorStop(0.5, '#0b0d24'); g.addColorStop(1, '#071628')
  ctx.fillStyle = g; ctx.fill()
  ctx.clip()
  // luchtgaatjes
  ctx.fillStyle = 'rgba(255,255,255,.05)'
  var stap = 0.05 * S
  for (var yy = y0 + stap / 2; yy < y0 + th; yy += stap) for (var xx = x0 + stap / 2; xx < x0 + tw; xx += stap) ctx.fillRect(xx - 0.8, yy - 0.8, 1.6, 1.6)
  // helft-gloed
  var h0 = ctx.createRadialGradient(px(0.5), py(HK.H), 0, px(0.5), py(HK.H), th * 0.55)
  h0.addColorStop(0, rgba(c0, 0.16)); h0.addColorStop(1, rgba(c0, 0))
  ctx.fillStyle = h0; ctx.fillRect(x0, y0, tw, th)
  var h1 = ctx.createRadialGradient(px(0.5), py(0), 0, px(0.5), py(0), th * 0.55)
  h1.addColorStop(0, rgba(c1, 0.16)); h1.addColorStop(1, rgba(c1, 0))
  ctx.fillStyle = h1; ctx.fillRect(x0, y0, tw, th)
  ctx.restore()
  // lijnen
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255,255,255,.18)'
  ctx.beginPath(); ctx.moveTo(x0, py(HK.H / 2)); ctx.lineTo(x0 + tw, py(HK.H / 2)); ctx.stroke()
  ctx.beginPath(); ctx.arc(px(0.5), py(HK.H / 2), 0.14 * S, 0, 7); ctx.stroke()
  ctx.strokeStyle = rgba(c1, 0.35)
  ctx.beginPath(); ctx.arc(px(0.5), py(0), 0.22 * S, 0, Math.PI); ctx.stroke()
  ctx.strokeStyle = rgba(c0, 0.35)
  ctx.beginPath(); ctx.arc(px(0.5), py(HK.H), 0.22 * S, Math.PI, Math.PI * 2); ctx.stroke()
  // rand
  ctx.save()
  ctx.shadowBlur = 16; ctx.lineWidth = 4
  ctx.shadowColor = '#8296ff'; ctx.strokeStyle = 'rgba(160,175,255,.75)'
  rr(x0, y0, tw, th, r); ctx.stroke()
  ctx.restore()
  // doelen
  doel(0, c1); doel(HK.H, c0)
  // bumpers
  if (w) w.bumpers.forEach(function (b) {
    var p = 0.5 + 0.5 * Math.sin(tijd * 4)
    ctx.save(); ctx.shadowColor = '#ff8a3d'; ctx.shadowBlur = 14 + p * 10
    ctx.beginPath(); ctx.arc(px(b.x), py(b.y), b.r * S, 0, 7)
    var bg = ctx.createRadialGradient(px(b.x), py(b.y), 0, px(b.x), py(b.y), b.r * S)
    bg.addColorStop(0, '#fff3d6'); bg.addColorStop(0.5, '#ff8a3d'); bg.addColorStop(1, '#a83a10')
    ctx.fillStyle = bg; ctx.fill(); ctx.restore()
  })
}
function doel(y, col) {
  ctx.save()
  ctx.shadowColor = col; ctx.shadowBlur = 18
  ctx.fillStyle = '#02030a'
  var x0 = px(HK.D0), x1 = px(HK.D1), h = 0.035 * S
  ctx.fillRect(x0, y === 0 ? py(0) - h : py(HK.H), x1 - x0, h)
  ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x0, py(y)); ctx.lineTo(x1, py(y)); ctx.stroke()
  ctx.restore()
}

function tekenPuck(p) {
  var r = HK.PR * S, x = px(p.x), y = py(p.y)
  var v = Math.hypot(p.vx, p.vy)
  // spoor
  var sp = p.spoor, n = sp.length / 2
  var soort = D.spoor
  for (var i = 0; i < n - 1; i++) {
    var f = (i + 1) / n
    var sx = px(sp[i * 2]), sy = py(sp[i * 2 + 1])
    var col = soort === 'regenboog' ? hsl((tijd * 200 + i * 18) % 360, 100, 60) : soort === 'komeet' ? '#ffb347' : soort === 'sterren' ? '#ffe9a8' : soort === 'vonken' ? '#ffd54f' : '#3ef0ff'
    ctx.globalAlpha = f * Math.min(1, v) * (soort === 'gloed' ? 0.35 : 0.55)
    ctx.fillStyle = col
    ctx.beginPath(); ctx.arc(sx, sy, r * (soort === 'komeet' ? 0.3 + f * 0.9 : f * 0.85), 0, 7); ctx.fill()
  }
  ctx.globalAlpha = 1
  if (v > 0.6 && (soort === 'vonken' || soort === 'sterren') && Math.random() < 0.6) {
    deeltjes.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, t: 0, max: 0.4, col: soort === 'vonken' ? '#ffc83d' : '#ffffff', r: 0.004, ster: soort === 'sterren' })
  }
  // puck
  ctx.save()
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12 + Math.min(v, 3) * 6
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7)
  var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r)
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#d9e2ff'); g.addColorStop(1, '#8a96c8')
  ctx.fillStyle = g; ctx.fill()
  ctx.restore()
  ctx.strokeStyle = 'rgba(40,50,90,.6)'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, 7); ctx.stroke()
}

function tekenStick(s, k) {
  var r = HK.KR * S, x = px(s.x), y = py(s.y)
  var st = k === 0 ? stickStijl() : { kleur: kleurKant(1) }
  stickVorm(ctx, x, y, r, st, tijd)
}
function stickVorm(g, x, y, r, st, t) {
  var col = st.kleur, vorm = st.vorm
  if (vorm === 'regenboog') col = hsl((t * 90) % 360, 100, 62)
  g.save()
  g.shadowColor = col; g.shadowBlur = r * 0.7
  g.beginPath(); g.arc(x, y, r, 0, 7)
  var bg = g.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r)
  if (vorm === 'goud') { bg.addColorStop(0, '#fff6c8'); bg.addColorStop(0.5, '#ffc107'); bg.addColorStop(1, '#a86d00') }
  else if (vorm === 'galaxy') { bg.addColorStop(0, '#d5c2ff'); bg.addColorStop(0.45, '#4a1fa8'); bg.addColorStop(1, '#0a0620') }
  else if (vorm === 'vuur') { bg.addColorStop(0, '#fff2a8'); bg.addColorStop(0.45, '#ff7a2f'); bg.addColorStop(1, '#7a1600') }
  else if (vorm === 'ijs') { bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.55, '#9ee7ff'); bg.addColorStop(1, '#3a7fb0') }
  else { bg.addColorStop(0, tint(col, 0.5)); bg.addColorStop(0.6, col); bg.addColorStop(1, tint(col, -0.55)) }
  g.fillStyle = bg; g.fill()
  g.restore()
  // ring
  g.lineWidth = r * 0.14
  g.strokeStyle = 'rgba(255,255,255,.55)'
  g.beginPath(); g.arc(x, y, r * 0.82, 0, 7); g.stroke()
  if (vorm === 'galaxy') {
    g.fillStyle = '#fff'
    for (var i = 0; i < 7; i++) { var a = i * 2.4 + t * 0.6, d = r * (0.2 + (i % 3) * 0.2); g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i); g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.04, 0, 7); g.fill() }
    g.globalAlpha = 1
  }
  // knop in het midden
  if (vorm === 'ster') {
    g.fillStyle = '#fff8dc'; g.beginPath()
    for (var j = 0; j < 10; j++) { var rr2 = j % 2 ? r * 0.2 : r * 0.46, aa = -Math.PI / 2 + j * Math.PI / 5 + t; g.lineTo(x + Math.cos(aa) * rr2, y + Math.sin(aa) * rr2) }
    g.closePath(); g.fill()
  } else {
    g.beginPath(); g.arc(x, y, r * 0.42, 0, 7)
    var kg = g.createRadialGradient(x - r * 0.12, y - r * 0.15, r * 0.05, x, y, r * 0.42)
    kg.addColorStop(0, '#ffffff'); kg.addColorStop(1, vorm === 'vuur' ? '#ffb347' : vorm === 'ijs' ? '#cfefff' : tint(col, 0.2))
    g.fillStyle = kg; g.fill()
  }
  if (vorm === 'vuur') {
    for (var f = 0; f < 3; f++) { var fa = t * 4 + f * 2.1; g.fillStyle = 'rgba(255,200,80,.5)'; g.beginPath(); g.arc(x + Math.cos(fa) * r * 0.7, y + Math.sin(fa) * r * 0.7, r * 0.1, 0, 7); g.fill() }
  }
}

function effecten(dt) {
  for (var i = deeltjes.length - 1; i >= 0; i--) {
    var d = deeltjes[i]
    d.t += dt
    if (d.t > d.max) { deeltjes.splice(i, 1); continue }
    d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= 0.96; d.vy *= 0.96
    var a = 1 - d.t / d.max
    ctx.globalAlpha = a; ctx.fillStyle = d.col
    if (d.ster) {
      var sx = px(d.x), sy = py(d.y), l = d.r * S * 1.6
      ctx.fillRect(sx - l, sy - 0.6, l * 2, 1.2); ctx.fillRect(sx - 0.6, sy - l, 1.2, l * 2)
    } else { ctx.beginPath(); ctx.arc(px(d.x), py(d.y), d.r * S * a + 0.6, 0, 7); ctx.fill() }
  }
  ctx.globalAlpha = 1
  for (var j = teksten.length - 1; j >= 0; j--) {
    var t = teksten[j]
    t.t += dt
    if (t.t > t.max) { teksten.splice(j, 1); continue }
    var f = t.t / t.max, schaal = f < 0.15 ? 0.6 + f / 0.15 * 0.4 : 1
    ctx.save()
    ctx.globalAlpha = f > 0.7 ? (1 - f) / 0.3 : 1
    ctx.translate(px(t.x), py(t.y) - f * 12); ctx.scale(schaal, schaal)
    ctx.font = Math.round(t.maat * S) + 'px "Russo One", system-ui, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.shadowColor = t.col; ctx.shadowBlur = 20
    ctx.fillStyle = t.col; ctx.fillText(t.s, 0, 0)
    ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.globalAlpha *= 0.5; ctx.fillText(t.s, 0, 0)
    ctx.restore()
  }
}

// ── schermen ──
function toonScherm(id) {
  ;['menu', 'einde', 'winkel', 'pauzescherm'].forEach(function (s) { $(s).classList.toggle('aan', s === id) })
  var inSpel = id === null
  $('pauze').style.display = inSpel ? '' : 'none'
  $('hud').style.display = w && (inSpel || id === 'pauzescherm') ? '' : 'none'
  $('terug').classList.toggle('aan', !BELONING && !inSpel)
}

function gezicht(g, x, y, r, col, nr) {
  stickVorm(g, x, y, r, { kleur: col }, 0)
  // ogen en mond: iedere tegenstander een eigen uitdrukking
  g.fillStyle = '#0a0b1e'
  var oy2 = y - r * 0.08, ox2 = r * 0.16
  g.beginPath(); g.arc(x - ox2, oy2, r * 0.07, 0, 7); g.arc(x + ox2, oy2, r * 0.07, 0, 7); g.fill()
  g.strokeStyle = '#0a0b1e'; g.lineWidth = r * 0.06; g.lineCap = 'round'
  g.beginPath()
  if (nr % 3 === 0) g.arc(x, y + r * 0.08, r * 0.14, 0.2, Math.PI - 0.2)
  else if (nr % 3 === 1) { g.moveTo(x - r * 0.13, y + r * 0.17); g.lineTo(x + r * 0.13, y + r * 0.17) }
  else { g.moveTo(x - r * 0.13, y + r * 0.2); g.quadraticCurveTo(x, y + r * 0.08, x + r * 0.13, y + r * 0.2) }
  g.stroke()
  if (nr >= 6) { g.beginPath(); g.moveTo(x - r * 0.26, y - r * 0.24); g.lineTo(x - r * 0.08, y - r * 0.17); g.moveTo(x + r * 0.26, y - r * 0.24); g.lineTo(x + r * 0.08, y - r * 0.17); g.stroke() }
}

function toonMenu() {
  w = null; actief = false
  $('menumunten').textContent = D.munten
  var l = $('ladder'); l.innerHTML = ''
  T.forEach(function (t, i) {
    var b = document.createElement('button'), open = i <= D.verslagen
    b.className = 'tegen' + (i === Math.min(D.verslagen, T.length - 1) ? ' volgende' : '')
    b.disabled = !open
    var c = document.createElement('canvas'); c.width = 112; c.height = 112
    var g = c.getContext('2d'); g.scale(2, 2); gezicht(g, 28, 28, 24, t.kleur, i)
    b.innerHTML = '<span class="nr">' + (i + 1) + '</span>' + (i < D.verslagen ? '<span class="vink">✓</span>' : '')
    b.appendChild(c)
    var n = document.createElement('span'); n.className = 'naam'; n.textContent = open ? t.naam : '???'; b.appendChild(n)
    var u = document.createElement('span'); u.className = 'uitleg'; u.textContent = open ? t.uitleg : 'Versla eerst nr. ' + i; b.appendChild(u)
    b.onclick = function () { start(i) }
    l.appendChild(b)
  })
  toonScherm('menu')
}

$('tweespelers').onclick = function () { start(-1) }
$('volgende').onclick = function () { start(tegenNr + 1) }
$('nogeens').onclick = function () { start(tegenNr) }
$('naarmenu').onclick = toonMenu
$('klaar').onclick = function () { parent.postMessage({ type: 'neonhockey-gameover' }, '*') }
$('pauze').onclick = function () { if (!actief) return; gepauzeerd = true; toonScherm('pauzescherm') }
$('hervat').onclick = function () { gepauzeerd = false; vorige = performance.now(); toonScherm(null) }
$('stop').onclick = function () { gepauzeerd = false; if (BELONING) { actief = false; einde() } else toonMenu() }
$('naarwinkel').onclick = function () { tekenWinkel(); toonScherm('winkel') }
$('uitwinkel').onclick = toonMenu

function kaart(lijst, item, gekozen, teken, kies) {
  var k = document.createElement('div'); k.className = 'kaart' + (gekozen ? ' gekozen' : '')
  var c = document.createElement('canvas'); c.width = 220; c.height = 128
  var g = c.getContext('2d'); g.scale(2, 2); teken(g)
  var n = document.createElement('div'); n.className = 'naam'; n.textContent = item.naam
  var b = document.createElement('button')
  if (D.bezit.indexOf(item.id + (lijst === 'spoorlijst' ? '_s' : '')) >= 0 || item.prijs === 0) {
    b.className = 'kies' + (gekozen ? ' aan' : ''); b.textContent = gekozen ? 'Gekozen' : 'Kiezen'
    b.onclick = function () { kies(); bewaar(); tekenWinkel() }
  } else {
    b.className = 'koop'; b.textContent = item.prijs + ' munten'; b.disabled = D.munten < item.prijs
    b.onclick = function () {
      if (D.munten < item.prijs) return
      D.munten -= item.prijs; D.bezit.push(item.id + (lijst === 'spoorlijst' ? '_s' : '')); kies(); bewaar(); Geluid.koop(); tekenWinkel()
    }
  }
  k.appendChild(c); k.appendChild(n); k.appendChild(b)
  $(lijst).appendChild(k)
}
function tekenWinkel() {
  $('winkelmunten').textContent = D.munten
  $('sticklijst').innerHTML = ''; $('spoorlijst').innerHTML = ''
  STICKS.forEach(function (st) {
    kaart('sticklijst', st, D.stick === st.id, function (g) { stickVorm(g, 55, 32, 24, st, 1.2) }, function () { D.stick = st.id })
  })
  SPOREN.forEach(function (sp) {
    kaart('spoorlijst', sp, D.spoor === sp.id, function (g) {
      for (var i = 0; i < 12; i++) {
        var f = (i + 1) / 12, x = 10 + i * 6.5, y = 44 - Math.sin(f * 2.2) * 22
        g.globalAlpha = f * 0.7
        g.fillStyle = sp.id === 'regenboog' ? hsl(i * 30, 100, 60) : sp.id === 'komeet' ? '#ffb347' : sp.id === 'sterren' ? '#ffe9a8' : sp.id === 'vonken' ? '#ffd54f' : '#3ef0ff'
        g.beginPath(); g.arc(x, y, sp.id === 'komeet' ? 2 + f * 7 : f * 7, 0, 7); g.fill()
        if ((sp.id === 'vonken' || sp.id === 'sterren') && i % 3 === 0) { g.fillRect(x - 1, y + 9, 2, 2); g.fillRect(x + 4, y - 10, 2, 2) }
      }
      g.globalAlpha = 1
      g.fillStyle = '#e8eeff'; g.shadowColor = '#fff'; g.shadowBlur = 10
      g.beginPath(); g.arc(94, 44 - Math.sin(2.2) * 22, 8, 0, 7); g.fill(); g.shadowBlur = 0
    }, function () { D.spoor = sp.id })
  })
}

meet()
tekenGeluidKnop()
if (BELONING) start(Math.min(D.verslagen, T.length - 1))   // beloning: meteen de volgende tegenstander
else toonMenu()
requestAnimationFrame(frame)
})()
