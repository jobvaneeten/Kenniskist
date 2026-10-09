// Steenknaller — scherm, besturing, effecten, winkel. Levels en natuurkunde staan in kern.js.
(function () {
'use strict'
var cv = document.getElementById('c'), ctx = cv.getContext('2d')
var $ = function (id) { return document.getElementById(id) }

// ── inbedding ──
var params = new URLSearchParams(location.search)
var BELONING = !params.has('terug')
if (!BELONING) {
  $('terug').classList.add('aan')
  $('terug').onclick = function () { parent.postMessage({ type: 'steenknaller-terug' }, '*') }
}

// ── opslag (kk_-prefix ⇒ synct mee naar het account) ──
var OPSLAG = 'kk_sk'
var D = (function () {
  var d = {}
  try { d = JSON.parse(localStorage.getItem(OPSLAG) || '{}') || {} } catch (e) {}
  return { munten: d.munten || 0, open: d.open || 0, sterren: d.sterren || {}, bezit: d.bezit || ['neon'], bat: d.bat || 'neon',
    geluid: d.geluid !== false, gespeeld: d.gespeeld || 0 }
})()
function bewaar() { try { localStorage.setItem(OPSLAG, JSON.stringify(D)) } catch (e) {} }

// ── batjes (winkel): kleur van batje én bal-spoor ──
var BATJES = [
  { id: 'neon', naam: 'Neon', prijs: 0, kleur: '#3ef0ff', spoor: '#3ef0ff' },
  { id: 'roze', naam: 'Roze', prijs: 80, kleur: '#ff4fd8', spoor: '#ff9cf0' },
  { id: 'limoen', naam: 'Limoen', prijs: 160, kleur: '#8cff5a', spoor: '#c6ff9e' },
  { id: 'vuur', naam: 'Vuur', prijs: 280, kleur: '#ff7a2f', spoor: '#ffc83d', vorm: 'vuur' },
  { id: 'ijs', naam: 'IJs', prijs: 420, kleur: '#b3f5ff', spoor: '#ffffff', vorm: 'ijs' },
  { id: 'regenboog', naam: 'Regenboog', prijs: 650, kleur: '#ff4fd8', spoor: '#ffffff', vorm: 'regenboog' },
  { id: 'goud', naam: 'Goud', prijs: 950, kleur: '#ffd54f', spoor: '#ffe9a8', vorm: 'goud' },
]
function batStijl() { return BATJES.find(function (b) { return b.id === D.bat }) || BATJES[0] }
var KLEUREN = ['#3ef0ff', '#ff4fd8', '#ffc83d', '#8cff5a', '#9b6bff', '#ff8a3d', '#4f8cff']

function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] }
function rgba(h, a) { var c = hex(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')' }
function tint(h, f) { var c = hex(h).map(function (v) { return Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)) }); return 'rgb(' + c.join(',') + ')' }
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
}

// ── layout ──
var dpr = 1, W = 0, H = 0, S = 1, ox = 0, oy = 0
function meet() {
  dpr = Math.min(2, window.devicePixelRatio || 1)
  W = innerWidth; H = innerHeight
  cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr)
  S = Math.min((W - 16) / SK.B, (H - 64) / SK.H)
  ox = (W - SK.B * S) / 2; oy = 56 + (H - 60 - SK.H * S) / 2
}
window.addEventListener('resize', meet)
function px(x) { return ox + x * S }
function py(y) { return oy + y * S }

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
  bat: function () { toon(330, 0.07, 'triangle', 0.12) },
  muur: function () { toon(220, 0.04, 'square', 0.03) },
  breek: function (c) { toon(440 * Math.pow(2, Math.min(c - 1, 12) / 12), 0.09, 'square', 0.05) },
  tik: function () { toon(700, 0.05, 'triangle', 0.06) },
  metaal: function () { toon(1600, 0.06, 'square', 0.03); toon(1200, 0.1, 'sine', 0.04) },
  boem: function () { toon(120, 0.35, 'sawtooth', 0.12, 0, 40) },
  power: function () { [660, 880, 1100].forEach(function (f, i) { toon(f, 0.12, 'sine', 0.08, i * 0.05) }) },
  leven: function () { toon(400, 0.4, 'sawtooth', 0.07, 0, 90) },
  win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { toon(f, 0.32, 'sine', 0.09, i * 0.09) }) },
  verlies: function () { [392, 330, 262, 196].forEach(function (f, i) { toon(f, 0.3, 'triangle', 0.09, i * 0.15) }) },
  koop: function () { [784, 988, 1319].forEach(function (f, i) { toon(f, 0.18, 'sine', 0.08, i * 0.07) }) },
}
function tekenGeluidKnop() { $('golf').style.display = D.geluid ? '' : 'none'; $('geluid').style.opacity = D.geluid ? 1 : 0.6 }
$('geluid').onclick = function (e) { e.stopPropagation(); D.geluid = !D.geluid; bewaar(); tekenGeluidKnop(); if (D.geluid) Geluid.bat() }

// ── spelstaat ──
var s = null, actief = false, gepauzeerd = false, doelX = null
var deeltjes = [], teksten = [], sporen = [], scherven = [], schud = 0, flits = 0
var geraakt = {}   // laatste tik per steen (oplichten)

function startLevel(L) {
  s = SK.nieuwLevel(L); actief = true; gepauzeerd = false; doelX = null
  deeltjes = []; teksten = []; sporen = []; scherven = []; geraakt = {}
  toonScherm(null)
  tekenHud()
}

// ── besturing ──
function naarVeld(e) { return (e.clientX - ox) / S }
cv.addEventListener('pointerdown', function (e) {
  audio()
  if (!actief || gepauzeerd) return
  doelX = naarVeld(e)
  try { cv.setPointerCapture(e.pointerId) } catch (er) {}
  if (s.ballen.some(function (b) { return b.vast })) SK.lanceer(s)
})
cv.addEventListener('pointermove', function (e) {
  if (!actief || gepauzeerd) return
  if (e.pointerType !== 'mouse' && !e.buttons && e.pressure === 0) return
  doelX = naarVeld(e)
})
window.addEventListener('keydown', function (e) {
  if (!actief || !s) return
  if (e.code === 'Space') { e.preventDefault(); SK.lanceer(s) }
})
var toetsen = {}
window.addEventListener('keydown', function (e) { toetsen[e.code] = true })
window.addEventListener('keyup', function (e) { toetsen[e.code] = false })

// ── effecten ──
function deeltje(x, y, col, snel, leven) {
  var a = Math.random() * Math.PI * 2, v = (0.3 + Math.random()) * (snel || 0.5)
  deeltjes.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, max: leven || (0.4 + Math.random() * 0.4), col: col, r: 0.004 + Math.random() * 0.005 })
}
function tekst(x, y, str, col) { teksten.push({ x: x, y: y, s: str, col: col, t: 0 }) }
function steenKleur(st) { return st.soort === 'metaal' ? '#9aa3c7' : st.soort === 'bom' ? '#ff4f6a' : KLEUREN[st.kleur % KLEUREN.length] }
var POWERNAAM = { multi: '3 ballen!', breed: 'Breed batje!', vuur: 'Vuurbal!', traag: 'Langzaam!', leven: 'Extra leven!' }
var POWERKLEUR = { multi: '#3ef0ff', breed: '#8cff5a', vuur: '#ff7a2f', traag: '#9b6bff', leven: '#ff4f6a' }

function verwerk(ev) {
  ev.forEach(function (e) {
    var r, cxp, cyp
    if (e.type === 'bat') Geluid.bat()
    else if (e.type === 'muur') Geluid.muur()
    else if (e.type === 'tik' || e.type === 'metaal') {
      if (e.type === 'tik') Geluid.tik(); else Geluid.metaal()
      geraakt[e.kol + ',' + e.rij] = tijd
    } else if (e.type === 'breek') {
      Geluid.breek(e.combo)
      r = SK.steenRect({ kol: e.kol, rij: e.rij }); cxp = (r.x0 + r.x1) / 2; cyp = (r.y0 + r.y1) / 2
      var col = e.soort === 'bom' ? '#ff4f6a' : KLEUREN[e.kleur % KLEUREN.length]
      for (var i = 0; i < 10; i++) deeltje(cxp, cyp, col, 0.6)
      scherven.push({ x: cxp, y: cyp, col: col, t: 0 })
      if (e.combo >= 3) tekst(cxp, cyp, '×' + Math.min(e.combo, 8), '#ffc83d')
    } else if (e.type === 'boem') {
      Geluid.boem(); schud = 12; flits = 0.6
      r = SK.steenRect({ kol: e.kol, rij: e.rij })
      for (var j = 0; j < 30; j++) deeltje((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, j % 2 ? '#ff4f6a' : '#ffc83d', 1.2, 0.7)
    } else if (e.type === 'power') {
      Geluid.power()
      tekst(e.x, SK.BAT_Y - 0.06, POWERNAAM[e.soort], POWERKLEUR[e.soort])
    } else if (e.type === 'leven') {
      Geluid.leven(); schud = 10
    } else if (e.type === 'klaar') { actief = false; setTimeout(function () { einde(true) }, 900) }
    else if (e.type === 'af') { actief = false; setTimeout(function () { einde(false) }, 700) }
  })
  if (ev.length) tekenHud()
}

function tekenHud() {
  if (!s) return
  $('lvl').textContent = 'Level ' + (s.L + 1) + ' · ' + s.def.vorm
  var h = $('harten'); h.innerHTML = ''
  for (var j = 0; j < Math.max(SK.LEVENS, s.levens); j++) h.innerHTML += '<svg class="' + (j < s.levens ? '' : 'leeg') + '"><use href="#hart"/></svg>'
  $('punten').textContent = s.punten
}
function tekenPowers() {
  if (!s) return
  var p = s.power, html = ''
  if (p.breed > 0) html += '<span style="color:#8cff5a">Breed ' + Math.ceil(p.breed) + '</span>'
  if (p.vuur > 0) html += '<span style="color:#ff7a2f">Vuur ' + Math.ceil(p.vuur) + '</span>'
  if (p.traag > 0) html += '<span style="color:#c3a6ff">Langzaam ' + Math.ceil(p.traag) + '</span>'
  if ($('powers').innerHTML !== html) $('powers').innerHTML = html
}

// ── einde ──
function einde(gehaald) {
  actief = false
  var st = gehaald ? Math.min(3, s.levens) : 0
  var verdiend = SK.beloning(s)
  D.munten += verdiend; D.gespeeld++
  if (gehaald) {
    D.sterren[s.L] = Math.max(D.sterren[s.L] || 0, st)
    if (s.L === D.open && D.open < SK.LEVELS - 1) D.open++
    Geluid.win()
  } else Geluid.verlies()
  bewaar()
  $('eindtitel').textContent = gehaald ? (s.L === SK.LEVELS - 1 ? 'Alles uitgespeeld!' : 'Level ' + (s.L + 1) + ' gehaald!') : 'Geen levens meer'
  var es = $('eindsterren'); es.innerHTML = ''
  for (var i = 0; i < 3; i++) es.innerHTML += '<svg class="' + (i < st ? '' : 'leeg') + '"><use href="#ster"/></svg>'
  es.classList.toggle('verborgen', !gehaald)
  $('st-stenen').textContent = s.gebroken + '/' + s.def.breekbaar
  $('st-punten').textContent = s.punten
  $('st-tijd').textContent = Math.round(s.t) + ' s'
  $('verdiend').textContent = verdiend
  $('volgende').classList.toggle('verborgen', BELONING || !gehaald || s.L + 1 >= SK.LEVELS)
  $('opnieuw').className = BELONING ? 'verborgen' : gehaald ? 'knop2' : 'knop'
  $('naarmenu').classList.toggle('verborgen', BELONING)
  $('klaar').classList.toggle('verborgen', !BELONING)
  toonScherm('einde')
}

// ── tekenen ──
var vorige = performance.now(), tijd = 0
function frame(nu) {
  var dt = Math.min(0.05, (nu - vorige) / 1000); vorige = nu
  tijd += dt
  if (s && actief && !gepauzeerd) {
    if (toetsen.ArrowLeft || toetsen.ArrowRight) doelX = (doelX == null ? s.bat.x : doelX) + (toetsen.ArrowRight ? 1 : -1) * 1.6 * dt
    verwerk(SK.stap(s, dt, doelX))
    s.ballen.forEach(function (b) { if (!b.vast) sporen.push({ x: b.x, y: b.y, t: 0, vuur: s.power.vuur > 0 }) })
    tekenPowers()
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  achtergrond()
  ctx.save()
  if (schud > 0.3) { ctx.translate((Math.random() - 0.5) * schud, (Math.random() - 0.5) * schud); schud *= 0.86 } else schud = 0
  if (s) { veld(); stenen(); tekenSporen(dt); powerups(); ballen(); batje() }
  effecten(dt)
  ctx.restore()
  if (flits > 0) { ctx.fillStyle = 'rgba(255,120,80,' + flits * 0.25 + ')'; ctx.fillRect(0, 0, W, H); flits = Math.max(0, flits - dt * 3) }
  requestAnimationFrame(frame)
}

var sterBg = []
for (var i = 0; i < 80; i++) sterBg.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.3, f: Math.random() * 6 })
function achtergrond() {
  var g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#0b0826'); g.addColorStop(1, '#04040e')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#fff'
  sterBg.forEach(function (st) { ctx.globalAlpha = 0.2 + 0.2 * Math.sin(tijd * 1.3 + st.f); ctx.beginPath(); ctx.arc(st.x * W, st.y * H, st.r, 0, 7); ctx.fill() })
  ctx.globalAlpha = 1
}
function veld() {
  var x0 = px(0), y0 = py(0), w = SK.B * S, h = SK.H * S
  var g = ctx.createLinearGradient(0, y0, 0, y0 + h)
  g.addColorStop(0, 'rgba(30,24,80,.55)'); g.addColorStop(1, 'rgba(8,10,30,.55)')
  ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h)
  ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1
  for (var gx = 1; gx < 10; gx++) { ctx.beginPath(); ctx.moveTo(px(gx / 10), y0); ctx.lineTo(px(gx / 10), y0 + h); ctx.stroke() }
  ctx.save(); ctx.shadowColor = '#8296ff'; ctx.shadowBlur = 14
  ctx.strokeStyle = 'rgba(160,175,255,.7)'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(x0, y0 + h); ctx.lineTo(x0, y0); ctx.lineTo(x0 + w, y0); ctx.lineTo(x0 + w, y0 + h); ctx.stroke()
  ctx.restore()
  // gevaarzone onderaan
  var dz = ctx.createLinearGradient(0, y0 + h - 0.06 * S, 0, y0 + h)
  dz.addColorStop(0, 'rgba(255,79,106,0)'); dz.addColorStop(1, 'rgba(255,79,106,.25)')
  ctx.fillStyle = dz; ctx.fillRect(x0, y0 + h - 0.06 * S, w, 0.06 * S)
}
function stenen() {
  var pad = 0.004 * S
  s.stenen.forEach(function (st) {
    if (st.weg) return
    var r = SK.steenRect(st), x = px(r.x0) + pad, y = py(r.y0) + pad, w = (r.x1 - r.x0) * S - pad * 2, h = (r.y1 - r.y0) * S - pad * 2
    var col = steenKleur(st), rad = Math.min(5, h * 0.25)
    var aan = geraakt[st.kol + ',' + st.rij], licht = aan ? Math.max(0, 1 - (tijd - aan) * 5) : 0
    ctx.save()
    if (st.soort !== 'metaal') { ctx.shadowColor = col; ctx.shadowBlur = 8 + licht * 12 }
    rr(ctx, x, y, w, h, rad)
    var g = ctx.createLinearGradient(0, y, 0, y + h)
    if (st.soort === 'metaal') { g.addColorStop(0, '#d7dcf0'); g.addColorStop(0.5, '#8a92b8'); g.addColorStop(1, '#4c5378') }
    else { g.addColorStop(0, tint(col, 0.35 + licht * 0.4)); g.addColorStop(0.55, col); g.addColorStop(1, tint(col, -0.45)) }
    ctx.fillStyle = g; ctx.fill()
    ctx.restore()
    // glans
    rr(ctx, x + w * 0.08, y + h * 0.12, w * 0.84, h * 0.28, rad * 0.6); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill()
    if (st.soort === 'metaal') {
      ctx.fillStyle = '#3a4060'
      ;[[0.15, 0.3], [0.85, 0.3], [0.15, 0.72], [0.85, 0.72]].forEach(function (p) { ctx.beginPath(); ctx.arc(x + w * p[0], y + h * p[1], Math.max(1.2, h * 0.08), 0, 7); ctx.fill() })
    } else if (st.soort === 'bom') {
      ctx.fillStyle = '#1a0610'; ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.58, h * 0.26, 0, 7); ctx.fill()
      ctx.strokeStyle = '#ffc83d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + w / 2 + h * 0.15, y + h * 0.36); ctx.quadraticCurveTo(x + w / 2 + h * 0.35, y + h * 0.1, x + w / 2 + h * 0.45, y + h * 0.2); ctx.stroke()
      ctx.fillStyle = Math.sin(tijd * 12) > 0 ? '#fff3b0' : '#ff8a3d'; ctx.beginPath(); ctx.arc(x + w / 2 + h * 0.45, y + h * 0.2, 1.8, 0, 7); ctx.fill()
    } else if (st.max > 1) {
      // harde steen: barsten bij schade, stipjes voor de resterende klappen
      ctx.fillStyle = 'rgba(255,255,255,.85)'
      for (var k = 0; k < st.hp; k++) { ctx.beginPath(); ctx.arc(x + w / 2 + (k - (st.hp - 1) / 2) * h * 0.32, y + h * 0.66, Math.max(1.3, h * 0.08), 0, 7); ctx.fill() }
      if (st.hp < st.max) {
        ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.2; ctx.beginPath()
        ctx.moveTo(x + w * 0.3, y); ctx.lineTo(x + w * 0.4, y + h * 0.45); ctx.lineTo(x + w * 0.28, y + h)
        if (st.max - st.hp > 1) { ctx.moveTo(x + w * 0.75, y); ctx.lineTo(x + w * 0.62, y + h * 0.5); ctx.lineTo(x + w * 0.7, y + h) }
        ctx.stroke()
      }
    }
  })
}
function tekenSporen(dt) {
  var st = batStijl()
  for (var i = sporen.length - 1; i >= 0; i--) {
    var sp = sporen[i]; sp.t += dt
    if (sp.t > 0.22) { sporen.splice(i, 1); continue }
    var f = 1 - sp.t / 0.22
    ctx.globalAlpha = f * 0.45
    ctx.fillStyle = sp.vuur ? (Math.random() < 0.5 ? '#ff7a2f' : '#ffc83d') : st.vorm === 'regenboog' ? 'hsl(' + ((tijd * 300 + i * 10) % 360) + ',100%,62%)' : st.spoor
    ctx.beginPath(); ctx.arc(px(sp.x), py(sp.y), SK.BR * S * f * (sp.vuur ? 1.4 : 1), 0, 7); ctx.fill()
  }
  ctx.globalAlpha = 1
}
function ballen() {
  var vuur = s.power.vuur > 0
  s.ballen.forEach(function (b) {
    var x = px(b.x), y = py(b.y), r = SK.BR * S
    ctx.save()
    ctx.shadowColor = vuur ? '#ff7a2f' : '#ffffff'; ctx.shadowBlur = 14
    var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r)
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, vuur ? '#ff7a2f' : '#b9c6ff')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill()
    ctx.restore()
    if (b.vast) {
      ctx.font = '700 15px Outfit, system-ui, sans-serif'; ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(238,243,255,' + (0.5 + 0.4 * Math.sin(tijd * 5)) + ')'
      ctx.fillText('Tik om te schieten', px(0.5), py(SK.BAT_Y) - 0.12 * S)
    }
  })
  if (s.magneet > 0) {
    s.ballen.forEach(function (b) { ctx.strokeStyle = 'rgba(155,107,255,' + s.magneet + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px(b.x), py(b.y), SK.BR * S * 2.2, 0, 7); ctx.stroke() })
  }
}
function batje() {
  var st = batStijl(), b = s.bat
  var x = px(b.x - b.w / 2), y = py(SK.BAT_Y), w = b.w * S, h = SK.BAT_H * S
  var col = st.vorm === 'regenboog' ? 'hsl(' + ((tijd * 120) % 360) + ',100%,62%)' : st.kleur
  ctx.save()
  ctx.shadowColor = col; ctx.shadowBlur = 18
  rr(ctx, x, y, w, h, h / 2)
  var g = ctx.createLinearGradient(0, y, 0, y + h)
  if (st.vorm === 'goud') { g.addColorStop(0, '#fff6c8'); g.addColorStop(0.5, '#ffc107'); g.addColorStop(1, '#a86d00') }
  else if (st.vorm === 'ijs') { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#6fc3e6') }
  else if (st.vorm === 'vuur') { g.addColorStop(0, '#fff2a8'); g.addColorStop(0.5, '#ff7a2f'); g.addColorStop(1, '#8a1d00') }
  else { g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, col); g.addColorStop(1, '#101830') }
  ctx.fillStyle = g; ctx.fill()
  ctx.restore()
  ctx.fillStyle = 'rgba(255,255,255,.6)'
  ctx.fillRect(x + w * 0.15, y + h * 0.2, w * 0.7, Math.max(1, h * 0.15))
}
function powerups() {
  s.vallend.forEach(function (p) {
    var x = px(p.x), y = py(p.y), w = 0.07 * S, h = 0.032 * S, col = POWERKLEUR[p.soort]
    ctx.save()
    ctx.shadowColor = col; ctx.shadowBlur = 14
    rr(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = rgba(col, 0.85); ctx.fill()
    ctx.restore()
    ctx.fillStyle = '#071018'; ctx.strokeStyle = '#071018'; ctx.lineWidth = 2
    var q = h * 0.3
    if (p.soort === 'multi') { for (var i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x + i * q * 1.4, y, q * 0.55, 0, 7); ctx.fill() } }
    else if (p.soort === 'breed') { ctx.beginPath(); ctx.moveTo(x - q * 2, y); ctx.lineTo(x + q * 2, y); ctx.moveTo(x - q * 1.3, y - q * 0.7); ctx.lineTo(x - q * 2, y); ctx.lineTo(x - q * 1.3, y + q * 0.7); ctx.moveTo(x + q * 1.3, y - q * 0.7); ctx.lineTo(x + q * 2, y); ctx.lineTo(x + q * 1.3, y + q * 0.7); ctx.stroke() }
    else if (p.soort === 'vuur') { ctx.beginPath(); ctx.moveTo(x, y - q * 1.3); ctx.quadraticCurveTo(x + q * 1.2, y, x, y + q * 1.1); ctx.quadraticCurveTo(x - q * 1.2, y, x, y - q * 1.3); ctx.fill() }
    else if (p.soort === 'traag') { ctx.beginPath(); ctx.arc(x, y, q * 1.1, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - q * 0.8); ctx.moveTo(x, y); ctx.lineTo(x + q * 0.6, y); ctx.stroke() }
    else { ctx.beginPath(); ctx.moveTo(x, y + q * 1.1); ctx.bezierCurveTo(x - q * 2.2, y - q * 0.4, x - q * 0.6, y - q * 1.8, x, y - q * 0.5); ctx.bezierCurveTo(x + q * 0.6, y - q * 1.8, x + q * 2.2, y - q * 0.4, x, y + q * 1.1); ctx.fill() }
  })
}
function effecten(dt) {
  for (var k = scherven.length - 1; k >= 0; k--) {
    var sc = scherven[k]; sc.t += dt
    if (sc.t > 0.3) { scherven.splice(k, 1); continue }
    var f = sc.t / 0.3
    ctx.strokeStyle = rgba(sc.col, 1 - f); ctx.lineWidth = 2
    rr(ctx, px(sc.x) - SK.SW * S * (0.5 + f * 0.4), py(sc.y) - SK.SH * S * (0.5 + f * 0.4), SK.SW * S * (1 + f * 0.8), SK.SH * S * (1 + f * 0.8), 5); ctx.stroke()
  }
  for (var i = deeltjes.length - 1; i >= 0; i--) {
    var d = deeltjes[i]; d.t += dt
    if (d.t > d.max) { deeltjes.splice(i, 1); continue }
    d.vy += 1.4 * dt; d.x += d.vx * dt; d.y += d.vy * dt
    ctx.globalAlpha = 1 - d.t / d.max; ctx.fillStyle = d.col
    ctx.beginPath(); ctx.arc(px(d.x), py(d.y), d.r * S, 0, 7); ctx.fill()
  }
  ctx.globalAlpha = 1
  for (var j = teksten.length - 1; j >= 0; j--) {
    var t = teksten[j]; t.t += dt
    if (t.t > 0.9) { teksten.splice(j, 1); continue }
    ctx.globalAlpha = 1 - t.t / 0.9
    ctx.font = Math.round(0.04 * S) + 'px "Russo One", system-ui, sans-serif'; ctx.textAlign = 'center'
    ctx.shadowColor = t.col; ctx.shadowBlur = 12; ctx.fillStyle = t.col
    ctx.fillText(t.s, px(t.x), py(t.y) - t.t * 30)
    ctx.shadowBlur = 0
  }
  ctx.globalAlpha = 1
}

// ── schermen ──
function toonScherm(id) {
  ;['menu', 'einde', 'winkel', 'pauzescherm'].forEach(function (x) { $(x).classList.toggle('aan', x === id) })
  var inSpel = id === null
  $('pauze').style.display = inSpel ? '' : 'none'
  $('hud').style.display = $('punten').style.display = $('powers').style.display = inSpel || id === 'pauzescherm' ? '' : 'none'
  $('terug').classList.toggle('aan', !BELONING && !inSpel)
}
function toonMenu() {
  actief = false; s = null
  $('menumunten').textContent = D.munten
  $('speel').textContent = 'Speel level ' + (D.open + 1)
  var k = $('kaart'); k.innerHTML = ''
  var blokken = [['Begin', '#3ef0ff'], ['Gevorderd', '#ffc83d'], ['Meester', '#ff4fd8']]
  blokken.forEach(function (bl, bi) {
    var blok = document.createElement('div'); blok.className = 'wereld'
    var totaal = 0
    for (var L = bi * 10; L < bi * 10 + 10; L++) totaal += D.sterren[L] || 0
    blok.innerHTML = '<div class="kop" style="color:' + bl[1] + '">' + bl[0] + ' · ' + totaal + '/30 ★</div>'
    var rij = document.createElement('div'); rij.className = 'levels'
    for (var L2 = bi * 10; L2 < bi * 10 + 10; L2++) {
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
$('volgende').onclick = function () { startLevel(s.L + 1) }
$('opnieuw').onclick = function () { startLevel(s.L) }
$('naarmenu').onclick = toonMenu
$('klaar').onclick = function () { parent.postMessage({ type: 'steenknaller-gameover' }, '*') }
$('pauze').onclick = function (e) { e.stopPropagation(); if (!actief) return; gepauzeerd = true; toonScherm('pauzescherm') }
$('hervat').onclick = function () { gepauzeerd = false; vorige = performance.now(); toonScherm(null) }
$('stop').onclick = function () { gepauzeerd = false; if (BELONING) einde(false); else toonMenu() }
$('naarwinkel').onclick = function () { tekenWinkel(); toonScherm('winkel') }
$('uitwinkel').onclick = toonMenu

function tekenWinkel() {
  $('winkelmunten').textContent = D.munten
  var l = $('lijst'); l.innerHTML = ''
  BATJES.forEach(function (bt) {
    var k = document.createElement('div'); k.className = 'kaart' + (D.bat === bt.id ? ' gekozen' : '')
    var c = document.createElement('canvas'); c.width = 220; c.height = 140
    var g = c.getContext('2d'); g.scale(2, 2)
    // spoor + bal + batje
    for (var i = 0; i < 8; i++) { g.globalAlpha = (i + 1) / 8 * 0.5; g.fillStyle = bt.vorm === 'regenboog' ? 'hsl(' + i * 45 + ',100%,62%)' : bt.spoor; g.beginPath(); g.arc(20 + i * 7, 10 + i * 4, 2 + i * 0.4, 0, 7); g.fill() }
    g.globalAlpha = 1; g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 8; g.beginPath(); g.arc(80, 44, 5, 0, 7); g.fill(); g.shadowBlur = 0
    var gr = g.createLinearGradient(0, 54, 0, 62)
    if (bt.vorm === 'goud') { gr.addColorStop(0, '#fff6c8'); gr.addColorStop(1, '#a86d00') }
    else if (bt.vorm === 'regenboog') { gr = g.createLinearGradient(25, 0, 85, 0); gr.addColorStop(0, '#ff4fd8'); gr.addColorStop(0.5, '#ffc83d'); gr.addColorStop(1, '#3ef0ff') }
    else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, bt.kleur); gr.addColorStop(1, '#101830') }
    g.shadowColor = bt.kleur; g.shadowBlur = 10
    rr(g, 25, 54, 60, 9, 4.5); g.fillStyle = gr; g.fill()
    var n = document.createElement('div'); n.className = 'naam'; n.textContent = bt.naam
    var b = document.createElement('button')
    if (D.bezit.indexOf(bt.id) >= 0) {
      b.className = 'kies' + (D.bat === bt.id ? ' aan' : ''); b.textContent = D.bat === bt.id ? 'Gekozen' : 'Kiezen'
      b.onclick = function () { D.bat = bt.id; bewaar(); tekenWinkel() }
    } else {
      b.className = 'koop'; b.textContent = bt.prijs + ' munten'; b.disabled = D.munten < bt.prijs
      b.onclick = function () {
        if (D.munten < bt.prijs) return
        D.munten -= bt.prijs; D.bezit.push(bt.id); D.bat = bt.id; bewaar(); Geluid.koop(); tekenWinkel()
      }
    }
    k.appendChild(c); k.appendChild(n); k.appendChild(b)
    l.appendChild(k)
  })
}

meet()
tekenGeluidKnop()
if (BELONING) startLevel(D.open)
else toonMenu()
requestAnimationFrame(frame)
})()
