// Pijlenregen — scherm, besturing, effecten, winkel. Levels en regels staan in kern.js.
(function () {
'use strict'
var cv = document.getElementById('c'), ctx = cv.getContext('2d')
var $ = function (id) { return document.getElementById(id) }
var TAU = PR.TAU

// ── inbedding ──
var params = new URLSearchParams(location.search)
var BELONING = !params.has('terug')
if (!BELONING) {
  $('terug').classList.add('aan')
  $('terug').onclick = function () { parent.postMessage({ type: 'pijlenregen-terug' }, '*') }
}

// ── opslag (kk_-prefix ⇒ synct mee naar het account) ──
var OPSLAG = 'kk_pr'
var D = (function () {
  var d = {}
  try { d = JSON.parse(localStorage.getItem(OPSLAG) || '{}') || {} } catch (e) {}
  return { munten: d.munten || 0, open: d.open || 0, sterren: d.sterren || {}, bezit: d.bezit || ['neon'], pijl: d.pijl || 'neon',
    geluid: d.geluid !== false, gespeeld: d.gespeeld || 0 }
})()
function bewaar() { try { localStorage.setItem(OPSLAG, JSON.stringify(D)) } catch (e) {} }

// ── pijlen (winkel) ──
var PIJLEN = [
  { id: 'neon', naam: 'Neon', prijs: 0, kleur: '#3ef0ff', veer: '#ff4fd8' },
  { id: 'limoen', naam: 'Limoen', prijs: 60, kleur: '#8cff5a', veer: '#ffc83d' },
  { id: 'vuur', naam: 'Vuurpijl', prijs: 140, kleur: '#ff7a2f', veer: '#ffd54f', gloed: '#ff5a1f' },
  { id: 'ijs', naam: 'IJspegel', prijs: 240, kleur: '#cfefff', veer: '#4f8cff', gloed: '#9ee7ff' },
  { id: 'bliksem', naam: 'Bliksem', prijs: 380, kleur: '#fff35a', veer: '#9b6bff', gloed: '#fff35a', vorm: 'bliksem' },
  { id: 'kristal', naam: 'Kristal', prijs: 550, kleur: '#c3a6ff', veer: '#7ff7ff', vorm: 'kristal' },
  { id: 'regenboog', naam: 'Regenboog', prijs: 800, kleur: '#ff4fd8', veer: '#3ef0ff', vorm: 'regenboog' },
  { id: 'goud', naam: 'Goud', prijs: 1150, kleur: '#ffd54f', veer: '#ffffff', gloed: '#ffc83d', vorm: 'goud' },
]
function pijlStijl() { return PIJLEN.find(function (p) { return p.id === D.pijl }) || PIJLEN[0] }

function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] }
function rgba(h, a) { var c = hex(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')' }
function tint(h, f) { var c = hex(h).map(function (v) { return Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)) }); return 'rgb(' + c.join(',') + ')' }

// ── layout ──
var dpr = 1, W = 0, H = 0, R = 0, cx = 0, cy = 0, LP = 0, startY = 0
function meet() {
  dpr = Math.min(2, window.devicePixelRatio || 1)
  W = innerWidth; H = innerHeight
  cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr)
  R = Math.min(W * 0.27, H * 0.17, 170)
  LP = R * 0.95
  cx = W / 2; cy = Math.max(110 + R + LP * 0.6, H * 0.38)
  startY = Math.min(H - LP * 0.75, cy + R + LP + Math.max(70, H * 0.14))
}
window.addEventListener('resize', meet)

// ── geluid ──
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
var Geluid = {
  gooi: function () { toon(900, 0.06, 'sine', 0.04, 0, 1500) },
  raak: function (n) { toon(150, 0.09, 'triangle', 0.2, 0, 90); toon(520 + n * 25, 0.05, 'square', 0.03) },
  mis: function () { toon(1400, 0.08, 'square', 0.06, 0, 2200); toon(160, 0.3, 'sawtooth', 0.06, 0.05, 70) },
  kristal: function () { [1319, 1760, 2093].forEach(function (f, i) { toon(f, 0.14, 'sine', 0.06, i * 0.05) }) },
  breek: function () { toon(220, 0.35, 'sawtooth', 0.08, 0, 50); [523, 784].forEach(function (f, i) { toon(f, 0.18, 'sine', 0.07, 0.08 + i * 0.07) }) },
  baas: function () { [196, 185, 175].forEach(function (f, i) { toon(f, 0.22, 'sawtooth', 0.06, i * 0.18) }) },
  win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { toon(f, 0.32, 'sine', 0.09, i * 0.09) }) },
  verlies: function () { [392, 330, 262, 196].forEach(function (f, i) { toon(f, 0.3, 'triangle', 0.09, i * 0.15) }) },
  koop: function () { [784, 988, 1319].forEach(function (f, i) { toon(f, 0.18, 'sine', 0.08, i * 0.07) }) },
}
function tekenGeluidKnop() { $('golf').style.display = D.geluid ? '' : 'none'; $('geluid').style.opacity = D.geluid ? 1 : 0.6 }
$('geluid').onclick = function () { D.geluid = !D.geluid; bewaar(); tekenGeluidKnop(); if (D.geluid) Geluid.gooi() }

// ── spelstaat ──
var lv = null, nr = 0, schijfNr = 0, s = null, harten = 3, kristallen = 0, gegooid = 0
var actief = false, gepauzeerd = false, wachtTot = 0, fase = 'spel'   // spel | mis | breek | einde
var vliegers = [], deeltjes = [], scherven = [], teksten = []
var deuk = 0, flits = 0, flitsKleur = '#fff', schud = 0, klaarZet = 0, verschijn = 0
var tijd = 0

function startLevel(L) {
  nr = L; lv = PR.level(L); schijfNr = 0; harten = PR.HARTEN; kristallen = 0; gegooid = 0
  actief = true; gepauzeerd = false
  vliegers = []; deeltjes = []; scherven = []; teksten = []
  nieuweSchijf()
  toonScherm(null)
  tekenHud()
}
function nieuweSchijf() {
  s = PR.nieuweSchijf(lv.schijven[schijfNr])
  fase = 'spel'; verschijn = 0; klaarZet = 0
  $('baastekst').classList.toggle('aan', s.def.baas)
  if (s.def.baas) Geluid.baas()
  tekenHud()
}

function gooi() {
  if (!actief || gepauzeerd || fase !== 'spel' || verschijn < 0.35) return
  if (PR.gooi(s)) { Geluid.gooi(); klaarZet = 0; gegooid++ }
}
cv.addEventListener('pointerdown', function (e) { audio(); gooi() })
window.addEventListener('keydown', function (e) { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); gooi() } })

function hoekPunt(a, r) { var w = a + s.hoek; return { x: cx + Math.cos(w) * r, y: cy + Math.sin(w) * r } }
function deeltje(x, y, col, snel, leven) {
  var a = Math.random() * TAU, v = (0.3 + Math.random()) * (snel || 200)
  deeltjes.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, max: leven || (0.4 + Math.random() * 0.4), col: col, r: 1.5 + Math.random() * 2.5 })
}
function tekst(x, y, str, col, maat) { teksten.push({ x: x, y: y, s: str, col: col, t: 0, max: 0.9, maat: maat || 22 }) }

function verwerk(ev) {
  ev.forEach(function (e) {
    if (e.type === 'raak') {
      Geluid.raak(s.def.pijlen - e.over)
      deuk = 1
      var p = hoekPunt(e.a, R)
      for (var i = 0; i < 8; i++) deeltje(p.x, p.y, lv.wereld.kleur, 160)
    } else if (e.type === 'kristal') {
      kristallen++
      Geluid.kristal()
      var k = hoekPunt(e.a, R + 14)
      for (var j = 0; j < 16; j++) deeltje(k.x, k.y, '#7ff7ff', 260)
      tekst(k.x, k.y - 10, '+1', '#7ff7ff', 24)
      tekenHud()
    } else if (e.type === 'mis') {
      Geluid.mis()
      harten--
      fase = 'mis'; wachtTot = tijd + 1.0
      flits = 1; flitsKleur = '#ff4f6a'; schud = 12
      // afgeketste pijl tuimelt weg
      vliegers.push({ x: cx, y: cy + R + LP / 2, vx: (Math.random() < 0.5 ? -1 : 1) * (160 + Math.random() * 120), vy: 220, rot: 0, vr: (Math.random() < 0.5 ? -1 : 1) * 14, t: 0 })
      tekenHud()
    } else if (e.type === 'klaar') {
      Geluid.breek()
      fase = 'breek'; wachtTot = tijd + 1.1
      flits = 1; flitsKleur = lv.wereld.kleur; schud = 10
      breekSchijf()
    }
  })
}

function breekSchijf() {
  var n = 10
  for (var i = 0; i < n; i++) {
    var a0 = i * TAU / n + s.hoek, mid = a0 + TAU / n / 2
    scherven.push({ a0: a0, a1: a0 + TAU / n, x: cx, y: cy, vx: Math.cos(mid) * (180 + Math.random() * 160), vy: Math.sin(mid) * (180 + Math.random() * 160) - 160,
      rot: 0, vr: (Math.random() - 0.5) * 8, t: 0, kleur: s.def.baas ? '#ff4f6a' : lv.wereld.kleur })
  }
  // de pijlen vallen eruit
  s.pijlen.forEach(function (p) {
    var w = p.a + s.hoek, q = hoekPunt(p.a, R + LP * 0.45)
    vliegers.push({ x: q.x, y: q.y, vx: Math.cos(w) * (120 + Math.random() * 120), vy: Math.sin(w) * 120 - 180, rot: w - Math.PI / 2, vr: (Math.random() - 0.5) * 10, t: 0, vast: p.vast })
  })
  s.kristallen.forEach(function (k) { if (!k.gepakt) { var q = hoekPunt(k.a, R + 14); for (var j = 0; j < 6; j++) deeltje(q.x, q.y, '#7ff7ff', 120) } })
  for (var d = 0; d < 40; d++) deeltje(cx + (Math.random() - 0.5) * R, cy + (Math.random() - 0.5) * R, d % 2 ? lv.wereld.kleur : '#ffffff', 340, 0.8)
}

function volgendeFase() {
  if (fase === 'mis') {
    if (harten <= 0) { einde(false); return }
    nieuweSchijf()
  } else if (fase === 'breek') {
    schijfNr++
    if (schijfNr >= PR.SCHIJVEN) { einde(true); return }
    nieuweSchijf()
  }
}

// ── HUD ──
function tekenHud() {
  if (!lv) return
  $('lvl').textContent = 'Level ' + (nr + 1) + ' · ' + lv.wereld.naam
  var st = $('stappen'); st.innerHTML = ''
  for (var i = 0; i < PR.SCHIJVEN; i++) {
    var el = document.createElement('i')
    el.className = (i === PR.SCHIJVEN - 1 ? 'baas ' : '') + (i < schijfNr ? 'af' : i === schijfNr ? 'nu' : '')
    st.appendChild(el)
  }
  var h = $('harten'); h.innerHTML = ''
  for (var j = 0; j < PR.HARTEN; j++) h.innerHTML += '<svg class="' + (j < harten ? '' : 'leeg') + '"><use href="#hart"/></svg>'
  $('kristallen').textContent = kristallen
}

// ── einde ──
function sterrenVoor(gehaald) { return gehaald ? harten : 0 }
function einde(gehaald) {
  actief = false; fase = 'einde'
  $('baastekst').classList.remove('aan')
  var st = sterrenVoor(gehaald)
  var verdiend = PR.beloning(nr, kristallen, harten, gehaald)
  D.munten += verdiend; D.gespeeld++
  var nieuweWereld = ''
  if (gehaald) {
    D.sterren[nr] = Math.max(D.sterren[nr] || 0, st)
    if (nr === D.open && D.open < PR.LEVELS - 1) {
      D.open++
      if (D.open % 10 === 0) nieuweWereld = 'Nieuwe wereld: ' + PR.WERELDEN[D.open / 10].naam
    }
    Geluid.win()
  } else Geluid.verlies()
  bewaar()
  $('eindtitel').textContent = gehaald ? (nr === PR.LEVELS - 1 ? 'Alles uitgespeeld!' : 'Level ' + (nr + 1) + ' gehaald!') : 'Geen harten meer'
  var es = $('eindsterren'); es.innerHTML = ''
  for (var i = 0; i < 3; i++) es.innerHTML += '<svg class="' + (i < st ? '' : 'leeg') + '"><use href="#ster"/></svg>'
  es.classList.toggle('verborgen', !gehaald)
  $('nieuwewereld').textContent = nieuweWereld
  $('nieuwewereld').classList.toggle('verborgen', !nieuweWereld)
  $('st-schijven').textContent = (gehaald ? PR.SCHIJVEN : schijfNr) + '/' + PR.SCHIJVEN
  $('st-kristallen').textContent = kristallen
  $('st-pijlen').textContent = gegooid
  $('verdiend').textContent = verdiend
  $('volgende').classList.toggle('verborgen', BELONING || !gehaald || nr + 1 >= PR.LEVELS)
  $('opnieuw').classList.toggle('verborgen', BELONING)
  $('opnieuw').className = BELONING ? 'verborgen' : gehaald ? 'knop2' : 'knop'
  $('naarmenu').classList.toggle('verborgen', BELONING)
  $('klaar').classList.toggle('verborgen', !BELONING)
  setTimeout(function () { toonScherm('einde') }, gehaald ? 500 : 200)
}

// ── tekenen ──
var vorige = performance.now()
function frame(nu) {
  var dt = Math.min(0.05, (nu - vorige) / 1000); vorige = nu
  tijd += dt
  if (actief && !gepauzeerd && s) {
    if (fase === 'spel') { verschijn += dt; verwerk(PR.stap(s, dt)); klaarZet += dt }
    else if (fase === 'mis') PR.draai(s, dt * 0.4)
    if ((fase === 'mis' || fase === 'breek') && tijd >= wachtTot) volgendeFase()
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  achtergrond()
  ctx.save()
  if (schud > 0.3) { ctx.translate((Math.random() - 0.5) * schud, (Math.random() - 0.5) * schud); schud *= 0.86 } else schud = 0
  if (s && fase !== 'breek' && fase !== 'einde') tekenSchijf()
  if (s && actief && fase === 'spel') tekenKlaar()
  tekenScherven(dt)
  tekenVliegers(dt)
  effecten(dt)
  ctx.restore()
  if (flits > 0) { ctx.fillStyle = rgba(flitsKleur, flits * 0.2); ctx.fillRect(0, 0, W, H); flits = Math.max(0, flits - dt * 3) }
  requestAnimationFrame(frame)
}

var sterrenBg = []
for (var i = 0; i < 90; i++) sterrenBg.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3, f: Math.random() * 6 })
function achtergrond() {
  var wk = lv ? lv.wereld : PR.WERELDEN[0]
  var g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#0b0826'); g.addColorStop(1, '#04040e')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  var r = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.6)
  r.addColorStop(0, rgba(wk.tweede, 0.22)); r.addColorStop(1, rgba(wk.tweede, 0))
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#fff'
  sterrenBg.forEach(function (s2) { ctx.globalAlpha = 0.25 + 0.25 * Math.sin(tijd * 1.3 + s2.f); ctx.beginPath(); ctx.arc(s2.x * W, s2.y * H, s2.r, 0, 7); ctx.fill() })
  ctx.globalAlpha = 1
}

function tekenPijl(g, x, y, rot, len, st, alpha) {
  // pijl met de punt op (x, y), wijzend in richting rot (0 = omhoog)
  var kleur = st.kleur, veer = st.veer
  if (st.vorm === 'regenboog') { kleur = 'hsl(' + ((tijd * 160) % 360) + ',100%,62%)'; veer = 'hsl(' + ((tijd * 160 + 180) % 360) + ',100%,62%)' }
  g.save()
  g.globalAlpha = alpha == null ? 1 : alpha
  g.translate(x, y); g.rotate(rot)
  var b = Math.max(2.5, len * 0.055)
  if (st.gloed) { g.shadowColor = st.gloed; g.shadowBlur = 12 }
  // schacht
  g.fillStyle = st.vorm === 'goud' ? '#e0a800' : tint(st.kleur.charAt(0) === '#' ? st.kleur : '#ffffff', -0.15)
  if (st.vorm === 'regenboog') g.fillStyle = kleur
  g.fillRect(-b / 2, len * 0.18, b, len * 0.68)
  if (st.vorm === 'bliksem') {
    g.strokeStyle = '#fff35a'; g.lineWidth = b * 0.6; g.beginPath()
    g.moveTo(0, len * 0.2); g.lineTo(b * 1.2, len * 0.35); g.lineTo(-b * 1.2, len * 0.5); g.lineTo(b * 1.2, len * 0.65); g.lineTo(0, len * 0.8); g.stroke()
  }
  // punt
  g.fillStyle = st.vorm === 'goud' ? '#fff3b0' : kleur
  g.beginPath(); g.moveTo(0, 0); g.lineTo(b * 1.9, len * 0.22); g.lineTo(-b * 1.9, len * 0.22); g.closePath(); g.fill()
  if (st.vorm === 'kristal') { g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(b * 0.9, len * 0.2); g.lineTo(0, len * 0.22); g.closePath(); g.fill() }
  // veren
  g.shadowBlur = 0
  g.fillStyle = veer
  g.beginPath(); g.moveTo(-b / 2, len * 0.78); g.lineTo(-b * 2.6, len * 0.92); g.lineTo(-b * 2.6, len * 1.02); g.lineTo(-b / 2, len * 0.9); g.closePath(); g.fill()
  g.beginPath(); g.moveTo(b / 2, len * 0.78); g.lineTo(b * 2.6, len * 0.92); g.lineTo(b * 2.6, len * 1.02); g.lineTo(b / 2, len * 0.9); g.closePath(); g.fill()
  g.restore()
}
var VASTE = { kleur: '#8a90b8', veer: '#5a6088' }

function tekenSchijf() {
  var wk = lv.wereld, baas = s.def.baas
  var kleur = baas ? '#ff4f6a' : wk.kleur, tweede = baas ? '#7a1030' : wk.tweede
  var schaal = Math.min(1, verschijn / 0.3)
  schaal = schaal < 1 ? 1 - Math.pow(1 - schaal, 3) : 1
  var dk = deuk; deuk = Math.max(0, deuk - 0.12)
  ctx.save()
  ctx.translate(cx, cy - dk * 5)
  ctx.scale(schaal, schaal)
  // pijlen achter de schijf (staart naar buiten)
  s.pijlen.forEach(function (p) {
    var w = p.a + s.hoek
    tekenPijl(ctx, Math.cos(w) * R * 0.7, Math.sin(w) * R * 0.7, w - Math.PI / 2, LP, p.vast ? VASTE : pijlStijl())
  })
  // schijf
  ctx.save()
  ctx.shadowColor = kleur; ctx.shadowBlur = 26 + dk * 20
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU)
  var g = ctx.createRadialGradient(0, -R * 0.3, R * 0.1, 0, 0, R)
  g.addColorStop(0, tint(tweede, -0.35)); g.addColorStop(0.75, tint(tweede, -0.6)); g.addColorStop(1, tint(tweede, -0.2))
  ctx.fillStyle = g; ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.rotate(s.hoek)
  // ringen en spaken
  ctx.strokeStyle = rgba(kleur, 0.55); ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(0, 0, R - 3, 0, TAU); ctx.stroke()
  ctx.strokeStyle = rgba(kleur, 0.25); ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(0, 0, R * 0.62, 0, TAU); ctx.stroke()
  ctx.beginPath(); ctx.arc(0, 0, R * 0.28, 0, TAU); ctx.stroke()
  for (var i = 0; i < 8; i++) { var a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3); ctx.lineTo(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6); ctx.stroke() }
  if (baas) {
    // stekels en een boos gezicht
    ctx.fillStyle = '#ff4f6a'
    for (var k = 0; k < 12; k++) { var b2 = k * TAU / 12; ctx.beginPath(); ctx.moveTo(Math.cos(b2 - 0.08) * R, Math.sin(b2 - 0.08) * R); ctx.lineTo(Math.cos(b2) * (R + 9), Math.sin(b2) * (R + 9)); ctx.lineTo(Math.cos(b2 + 0.08) * R, Math.sin(b2 + 0.08) * R); ctx.fill() }
    ctx.fillStyle = '#ffd0d8'
    ctx.beginPath(); ctx.arc(-R * 0.25, -R * 0.1, R * 0.1, 0, TAU); ctx.arc(R * 0.25, -R * 0.1, R * 0.1, 0, TAU); ctx.fill()
    ctx.strokeStyle = '#ffd0d8'; ctx.lineWidth = R * 0.05; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-R * 0.4, -R * 0.32); ctx.lineTo(-R * 0.12, -R * 0.22); ctx.moveTo(R * 0.4, -R * 0.32); ctx.lineTo(R * 0.12, -R * 0.22); ctx.stroke()
    ctx.beginPath(); ctx.arc(0, R * 0.35, R * 0.2, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke()
  } else {
    ctx.fillStyle = rgba(kleur, 0.9)
    ctx.beginPath(); ctx.arc(0, 0, R * 0.12, 0, TAU); ctx.fill()
  }
  ctx.restore()
  // kristallen op de rand
  s.kristallen.forEach(function (k) {
    if (k.gepakt) return
    var w = k.a + s.hoek, x = Math.cos(w) * (R + 15), y = Math.sin(w) * (R + 15), z = 11 + Math.sin(tijd * 5) * 1.5
    ctx.save(); ctx.translate(x, y); ctx.rotate(w + Math.PI / 2)
    ctx.shadowColor = '#7ff7ff'; ctx.shadowBlur = 16
    ctx.fillStyle = '#7ff7ff'; ctx.beginPath(); ctx.moveTo(0, -z); ctx.lineTo(z * 0.7, 0); ctx.lineTo(0, z); ctx.lineTo(-z * 0.7, 0); ctx.closePath(); ctx.fill()
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(0, -z); ctx.lineTo(z * 0.35, -z * 0.1); ctx.lineTo(-z * 0.35, -z * 0.1); ctx.closePath(); ctx.fill()
    ctx.restore()
  })
  ctx.restore()
  // nog te gooien pijlen (rechtsonder)
  var st = pijlStijl()
  var n = s.nog - (s.vlucht >= 0 ? 1 : 0)
  var tussen = Math.min(20, H * 0.45 / s.def.pijlen)
  for (var j = 0; j < s.def.pijlen; j++) {
    var over = j < n
    tekenPijl(ctx, 30, H - 44 - j * tussen, 0, 30, over ? st : VASTE, over ? 0.95 : 0.18)
  }
}

function tekenKlaar() {
  var st = pijlStijl()
  if (s.vlucht >= 0) {
    var f = Math.min(1, s.vlucht / PR.VLUCHT)
    var doelY = cy + R * 0.7
    var y = startY + (doelY - startY) * f
    ctx.globalAlpha = 0.25; tekenPijl(ctx, cx, y + LP * 0.5, 0, LP, st); ctx.globalAlpha = 1
    tekenPijl(ctx, cx, y, 0, LP, st)
  } else if (s.nog > 0) {
    var op = Math.min(1, klaarZet / 0.08)
    tekenPijl(ctx, cx, startY + (1 - op) * 30, 0, LP, st, op)
    // hint bij de eerste schijf van level 1
    if (nr === 0 && schijfNr === 0 && s.nog === s.def.pijlen) {
      ctx.font = '700 16px Outfit, system-ui, sans-serif'; ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(238,243,255,' + (0.55 + 0.35 * Math.sin(tijd * 4)) + ')'
      ctx.fillText('Tik om te schieten', cx, startY - 22)
    }
  }
}

function tekenScherven(dt) {
  for (var i = scherven.length - 1; i >= 0; i--) {
    var sc = scherven[i]
    sc.t += dt; sc.vy += 900 * dt; sc.x += sc.vx * dt; sc.y += sc.vy * dt; sc.rot += sc.vr * dt
    if (sc.t > 1.4) { scherven.splice(i, 1); continue }
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - sc.t / 1.4)
    ctx.translate(sc.x, sc.y); ctx.rotate(sc.rot)
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, sc.a0, sc.a1); ctx.closePath()
    ctx.fillStyle = rgba(sc.kleur, 0.35); ctx.fill()
    ctx.strokeStyle = sc.kleur; ctx.lineWidth = 2; ctx.stroke()
    ctx.restore()
  }
}
function tekenVliegers(dt) {
  for (var i = vliegers.length - 1; i >= 0; i--) {
    var v = vliegers[i]
    v.t += dt; v.vy += 1300 * dt; v.x += v.vx * dt; v.y += v.vy * dt; v.rot += v.vr * dt
    if (v.y > H + 200 || v.t > 2) { vliegers.splice(i, 1); continue }
    tekenPijl(ctx, v.x, v.y, v.rot, LP, v.vast ? VASTE : pijlStijl())
  }
}
function effecten(dt) {
  for (var i = deeltjes.length - 1; i >= 0; i--) {
    var d = deeltjes[i]
    d.t += dt
    if (d.t > d.max) { deeltjes.splice(i, 1); continue }
    d.vy += 300 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= 0.97
    ctx.globalAlpha = 1 - d.t / d.max; ctx.fillStyle = d.col
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill()
  }
  ctx.globalAlpha = 1
  for (var j = teksten.length - 1; j >= 0; j--) {
    var t = teksten[j]
    t.t += dt
    if (t.t > t.max) { teksten.splice(j, 1); continue }
    ctx.globalAlpha = 1 - t.t / t.max
    ctx.font = t.maat + 'px "Russo One", system-ui, sans-serif'; ctx.textAlign = 'center'
    ctx.shadowColor = t.col; ctx.shadowBlur = 14; ctx.fillStyle = t.col
    ctx.fillText(t.s, t.x, t.y - t.t * 40)
    ctx.shadowBlur = 0
  }
  ctx.globalAlpha = 1
}

// ── schermen ──
function toonScherm(id) {
  ;['menu', 'einde', 'winkel', 'pauzescherm'].forEach(function (x) { $(x).classList.toggle('aan', x === id) })
  var inSpel = id === null
  $('pauze').style.display = inSpel ? '' : 'none'
  $('hud').style.display = $('harten').style.display = $('kristalteller').style.display = inSpel || id === 'pauzescherm' ? '' : 'none'
  if (!inSpel && id !== 'pauzescherm') $('baastekst').classList.remove('aan')
  $('terug').classList.toggle('aan', !BELONING && !inSpel)
}

var STER = '<svg viewBox="0 0 24 24"><use href="#ster"/></svg>'
function toonMenu() {
  actief = false; s = null; lv = null; fase = 'spel'
  $('menumunten').textContent = D.munten
  $('speel').textContent = 'Speel level ' + (D.open + 1)
  var k = $('kaart'); k.innerHTML = ''
  PR.WERELDEN.forEach(function (wk, wi) {
    var blok = document.createElement('div'); blok.className = 'wereld'
    var totaal = 0
    for (var L = wi * 10; L < wi * 10 + 10; L++) totaal += D.sterren[L] || 0
    blok.innerHTML = '<div class="kop" style="color:' + wk.kleur + '">' + wk.naam + ' · ' + totaal + '/30 ★</div>'
    var rij = document.createElement('div'); rij.className = 'levels'
    for (var L2 = wi * 10; L2 < wi * 10 + 10; L2++) {
      (function (L) {
        var b = document.createElement('button'), st = D.sterren[L] || 0
        b.className = 'lv' + (L === D.open ? ' volgende' : '')
        b.disabled = L > D.open
        var sterren = ''
        for (var i = 0; i < 3; i++) sterren += '<svg class="' + (i < st ? '' : 'leeg') + '" viewBox="0 0 24 24"><use href="#ster"/></svg>'
        b.innerHTML = (L + 1) + '<span class="st">' + sterren + '</span>'
        b.onclick = function () { startLevel(L) }
        rij.appendChild(b)
      })(L2)
    }
    blok.appendChild(rij); k.appendChild(blok)
  })
  toonScherm('menu')
}

$('speel').onclick = function () { startLevel(D.open) }
$('volgende').onclick = function () { startLevel(nr + 1) }
$('opnieuw').onclick = function () { startLevel(nr) }
$('naarmenu').onclick = toonMenu
$('klaar').onclick = function () { parent.postMessage({ type: 'pijlenregen-gameover' }, '*') }
$('pauze').onclick = function (e) { e.stopPropagation(); if (!actief) return; gepauzeerd = true; toonScherm('pauzescherm') }
$('hervat').onclick = function () { gepauzeerd = false; vorige = performance.now(); toonScherm(null) }
$('stop').onclick = function () { gepauzeerd = false; if (BELONING) { actief = false; einde(false) } else toonMenu() }
$('naarwinkel').onclick = function () { tekenWinkel(); toonScherm('winkel') }
$('uitwinkel').onclick = toonMenu

function tekenWinkel() {
  $('winkelmunten').textContent = D.munten
  var l = $('lijst'); l.innerHTML = ''
  PIJLEN.forEach(function (p) {
    var k = document.createElement('div'); k.className = 'kaart' + (D.pijl === p.id ? ' gekozen' : '')
    var c = document.createElement('canvas'); c.width = 220; c.height = 140
    var g = c.getContext('2d'); g.scale(2, 2)
    tekenPijl(g, 96, 35, Math.PI / 2, 80, p)
    var n = document.createElement('div'); n.className = 'naam'; n.textContent = p.naam
    var b = document.createElement('button')
    if (D.bezit.indexOf(p.id) >= 0) {
      b.className = 'kies' + (D.pijl === p.id ? ' aan' : ''); b.textContent = D.pijl === p.id ? 'Gekozen' : 'Kiezen'
      b.onclick = function () { D.pijl = p.id; bewaar(); tekenWinkel() }
    } else {
      b.className = 'koop'; b.textContent = p.prijs + ' munten'; b.disabled = D.munten < p.prijs
      b.onclick = function () {
        if (D.munten < p.prijs) return
        D.munten -= p.prijs; D.bezit.push(p.id); D.pijl = p.id; bewaar(); Geluid.koop(); tekenWinkel()
      }
    }
    k.appendChild(c); k.appendChild(n); k.appendChild(b)
    l.appendChild(k)
  })
}

meet()
tekenGeluidKnop()
if (BELONING) startLevel(D.open)   // beloning: meteen het volgende level
else toonMenu()
requestAnimationFrame(frame)
})()
