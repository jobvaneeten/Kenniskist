// Blokkenblitz — scherm, besturing, effecten, winkel. Spelregels staan in kern.js.
(function () {
'use strict'
var cv = document.getElementById('c'), ctx = cv.getContext('2d')
var N = BB.N
var $ = function (id) { return document.getElementById(id) }

// ── inbedding ──
var params = new URLSearchParams(location.search)
var BELONING = !params.has('terug')
if (!BELONING) {
  $('terug').classList.add('aan')
  $('terug').onclick = function () { bewaarSpel(); parent.postMessage({ type: 'blokkenblitz-terug' }, '*') }
}

// ── opslag (kk_-prefix ⇒ synct mee naar het account) ──
// Beloning (1 minuut per keer) heeft een eigen potje dat bewaard blijft: bij de
// volgende beloning ga je verder waar je was. Los van het vrij-spelen-potje.
var OPSLAG = 'kk_bb', SPELOPSLAG = BELONING ? 'kk_bb_beloning' : 'kk_bb_spel'
var D = (function () {
  var d = {}
  try { d = JSON.parse(localStorage.getItem(OPSLAG) || '{}') || {} } catch (e) {}
  return { munten: d.munten || 0, record: d.record || 0, bezit: d.bezit || ['neon'], keuze: d.keuze || 'neon', geluid: d.geluid !== false, gespeeld: d.gespeeld || 0 }
})()
function bewaar() { try { localStorage.setItem(OPSLAG, JSON.stringify(D)) } catch (e) {} }

// ── blokstijlen (winkel) ──
var PALET = ['#3ef0ff', '#ff4fd8', '#ffc83d', '#8cff5a', '#9b6bff', '#ff8a3d', '#ff4f6a', '#4f8cff']
var STIJLEN = [
  { id: 'neon', naam: 'Neon', uitleg: 'Gloeiend glas — de klassieker', prijs: 0, palet: PALET, vorm: 'glas' },
  { id: 'pixel', naam: 'Retro pixel', uitleg: 'Zoals in een oude arcadekast', prijs: 150, palet: PALET, vorm: 'pixel' },
  { id: 'kristal', naam: 'Kristal', uitleg: 'Geslepen edelstenen met facetten', prijs: 300, palet: ['#7ff7ff', '#ff8cf0', '#ffe27a', '#b6ff8c', '#c3a6ff', '#ffb27a', '#ff8c9e', '#8cb6ff'], vorm: 'kristal' },
  { id: 'lava', naam: 'Lava', uitleg: 'Gloeiend gesteente uit een vulkaan', prijs: 500, palet: ['#ff3d00', '#ff6d00', '#ff9100', '#ffc400', '#ff1744', '#ff5252', '#ffab40', '#ff7043'], vorm: 'lava' },
  { id: 'ijs', naam: 'IJs', uitleg: 'Bevroren blokken die glinsteren', prijs: 750, palet: ['#b3f5ff', '#80deea', '#4dd0e1', '#a7c7ff', '#cfe8ff', '#7fb3ff', '#9ee7ff', '#d6f7ff'], vorm: 'ijs' },
  { id: 'galaxy', naam: 'Sterrenstelsel', uitleg: 'Elk blok een stukje heelal', prijs: 1100, palet: ['#7c4dff', '#d500f9', '#2979ff', '#00e5ff', '#651fff', '#f50057', '#3d5afe', '#e040fb'], vorm: 'galaxy' },
  { id: 'goud', naam: 'Goud', uitleg: 'Massief goud, voor kampioenen', prijs: 1600, palet: ['#ffd54f', '#ffca28', '#ffc107', '#ffb300', '#ffe082', '#ffa000', '#ffd740', '#ffe9a8'], vorm: 'goud' },
  { id: 'regenboog', naam: 'Regenboog', uitleg: 'Kleuren die steeds verschuiven', prijs: 2400, palet: PALET, vorm: 'glas', regenboog: true },
]
function stijl() { return STIJLEN.find(function (s) { return s.id === D.keuze }) || STIJLEN[0] }

function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] }
function tint(h, f) {   // f > 0 lichter, f < 0 donkerder
  var c = hex(h).map(function (v) { return Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)) })
  return 'rgb(' + c.join(',') + ')'
}
function rgba(h, a) { var c = hex(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')' }
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
}
function seeded(n) { var a = n * 9301 + 49297; return function () { a = (a * 9301 + 49297) % 233280; return a / 233280 } }

// ── blok-sprites (per stijl, kleur en grootte één keer getekend) ──
var sprites = {}, PAD = 8
function sprite(st, k, s) {
  s = Math.max(4, Math.round(s))
  var key = st.id + k + '_' + s + '_' + dpr
  if (sprites[key]) return sprites[key]
  var c = document.createElement('canvas'), z = s + PAD * 2
  c.width = Math.ceil(z * dpr); c.height = Math.ceil(z * dpr)
  var g = c.getContext('2d'); g.scale(dpr, dpr)
  tekenBlok(g, PAD, PAD, s, st.palet[k % 8], st.vorm, k)
  sprites[key] = c
  return c
}
function tekenBlok(g, x, y, s, col, vorm, k) {
  var r = s * 0.16, i, rnd = seeded(k + 7)
  if (vorm === 'pixel') {
    var b = Math.max(2, Math.round(s * 0.13))
    g.fillStyle = col; g.fillRect(x, y, s, s)
    g.fillStyle = tint(col, 0.45); g.fillRect(x, y, s, b); g.fillRect(x, y, b, s)
    g.fillStyle = tint(col, -0.45); g.fillRect(x, y + s - b, s, b); g.fillRect(x + s - b, y, b, s)
    g.fillStyle = tint(col, 0.75); g.fillRect(x + b, y + b, b, b)
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1)
    return
  }
  // gloed
  g.save(); g.shadowColor = rgba(col, vorm === 'lava' ? 0.9 : 0.7); g.shadowBlur = s * 0.28
  rr(g, x + 1, y + 1, s - 2, s - 2, r); g.fillStyle = col; g.fill(); g.restore()
  if (vorm === 'glas' || vorm === 'goud') {
    var gr = g.createLinearGradient(x, y, x, y + s)
    if (vorm === 'goud') { gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.35, col); gr.addColorStop(0.55, tint(col, -0.35)); gr.addColorStop(0.8, col); gr.addColorStop(1, tint(col, -0.5)) }
    else { gr.addColorStop(0, tint(col, 0.35)); gr.addColorStop(0.5, col); gr.addColorStop(1, tint(col, -0.4)) }
    rr(g, x + 1, y + 1, s - 2, s - 2, r); g.fillStyle = gr; g.fill()
    rr(g, x + s * 0.12, y + s * 0.1, s * 0.76, s * 0.26, r * 0.7); g.fillStyle = 'rgba(255,255,255,' + (vorm === 'goud' ? 0.5 : 0.32) + ')'; g.fill()
    if (vorm === 'goud') { g.save(); rr(g, x + 1, y + 1, s - 2, s - 2, r); g.clip(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = s * 0.08; g.beginPath(); g.moveTo(x + s * 0.2, y + s * 1.1); g.lineTo(x + s * 1.1, y + s * 0.2); g.stroke(); g.restore() }
    rr(g, x + 1.5, y + 1.5, s - 3, s - 3, r); g.strokeStyle = tint(col, 0.55); g.lineWidth = 1.5; g.stroke()
  } else if (vorm === 'kristal') {
    var cx = x + s / 2, cy = y + s / 2, m = s * 0.22
    var vlak = [[[x, y], [x + s, y], [cx + m, cy - m], [cx - m, cy - m], 0.45], [[x + s, y], [x + s, y + s], [cx + m, cy + m], [cx + m, cy - m], -0.1],
      [[x + s, y + s], [x, y + s], [cx - m, cy + m], [cx + m, cy + m], -0.4], [[x, y + s], [x, y], [cx - m, cy - m], [cx - m, cy + m], 0.15]]
    g.save(); rr(g, x + 1, y + 1, s - 2, s - 2, r * 0.6); g.clip()
    vlak.forEach(function (v) { g.beginPath(); g.moveTo(v[0][0], v[0][1]); g.lineTo(v[1][0], v[1][1]); g.lineTo(v[2][0], v[2][1]); g.lineTo(v[3][0], v[3][1]); g.closePath(); g.fillStyle = tint(col, v[4]); g.fill() })
    g.fillStyle = tint(col, 0.6); g.fillRect(cx - m, cy - m, m * 2, m * 2)
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(cx - m, cy - m); g.lineTo(cx, cy - m); g.lineTo(cx - m, cy); g.fill()
    g.restore()
  } else if (vorm === 'lava') {
    rr(g, x + 1, y + 1, s - 2, s - 2, r); g.fillStyle = '#2a0e08'; g.fill()
    var gl = g.createRadialGradient(x + s * 0.5, y + s * 0.55, 1, x + s * 0.5, y + s * 0.55, s * 0.6)
    gl.addColorStop(0, rgba(col, 0.75)); gl.addColorStop(1, 'rgba(0,0,0,0)')
    rr(g, x + 1, y + 1, s - 2, s - 2, r); g.fillStyle = gl; g.fill()
    g.strokeStyle = tint(col, 0.35); g.lineWidth = Math.max(1.2, s * 0.06); g.lineCap = 'round'
    for (i = 0; i < 3; i++) { g.beginPath(); var px = x + s * (0.15 + rnd() * 0.7), py = y + s * (0.15 + rnd() * 0.2); g.moveTo(px, py); for (var j = 0; j < 3; j++) { px += (rnd() - 0.5) * s * 0.35; py += s * 0.22; g.lineTo(px, Math.min(py, y + s * 0.88)) } g.stroke() }
    rr(g, x + 1.5, y + 1.5, s - 3, s - 3, r); g.strokeStyle = rgba(col, 0.8); g.lineWidth = 1.5; g.stroke()
  } else if (vorm === 'ijs') {
    var gi = g.createLinearGradient(x, y, x + s, y + s)
    gi.addColorStop(0, 'rgba(255,255,255,.95)'); gi.addColorStop(0.45, rgba(col, 0.85)); gi.addColorStop(1, tint(col, -0.35))
    rr(g, x + 1, y + 1, s - 2, s - 2, r); g.fillStyle = gi; g.fill()
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1
    for (i = 0; i < 2; i++) { var sx = x + s * (0.25 + rnd() * 0.5), sy = y + s * (0.25 + rnd() * 0.5), l = s * 0.1; g.beginPath(); g.moveTo(sx - l, sy); g.lineTo(sx + l, sy); g.moveTo(sx, sy - l); g.lineTo(sx, sy + l); g.stroke() }
    rr(g, x + 1.5, y + 1.5, s - 3, s - 3, r); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5; g.stroke()
  } else if (vorm === 'galaxy') {
    rr(g, x + 1, y + 1, s - 2, s - 2, r); g.fillStyle = '#0a0620'; g.fill()
    var gg = g.createRadialGradient(x + s * (0.3 + rnd() * 0.4), y + s * (0.3 + rnd() * 0.4), 1, x + s / 2, y + s / 2, s * 0.7)
    gg.addColorStop(0, rgba(col, 0.9)); gg.addColorStop(0.5, rgba(col, 0.3)); gg.addColorStop(1, 'rgba(0,0,0,0)')
    rr(g, x + 1, y + 1, s - 2, s - 2, r); g.fillStyle = gg; g.fill()
    g.fillStyle = '#fff'
    for (i = 0; i < 6; i++) { g.globalAlpha = 0.4 + rnd() * 0.6; g.beginPath(); g.arc(x + s * (0.12 + rnd() * 0.76), y + s * (0.12 + rnd() * 0.76), Math.max(0.6, s * 0.025 * (1 + rnd())), 0, 7); g.fill() }
    g.globalAlpha = 1
    rr(g, x + 1.5, y + 1.5, s - 3, s - 3, r); g.strokeStyle = tint(col, 0.3); g.lineWidth = 1.5; g.stroke()
  }
}

// ── layout ──
var dpr = 1, W = 0, H = 0, B = 0, cel = 0, bx = 0, by = 0, slots = [], staand = true
function meet() {
  dpr = Math.min(2, window.devicePixelRatio || 1)
  W = innerWidth; H = innerHeight
  cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  staand = H >= W * 1.02
  slots = []
  var hud = $('hud'), combo = $('combo')
  if (staand) {
    B = Math.min(W - 40, H * 0.56, 560)
    var trayH = Math.min(B * 0.44, 210)
    var blok = B + 18 + trayH
    by = Math.max(104, 104 + (H - 104 - blok) * 0.35)
    bx = (W - B) / 2
    var sw = Math.min(W, B * 1.08) / 3, sx0 = (W - sw * 3) / 2
    for (var i = 0; i < 3; i++) slots.push({ x: sx0 + sw * i, y: by + B + 18, w: sw, h: trayH })
    hud.style.left = '0'; hud.style.right = '0'; hud.style.top = Math.max(8, by - 100) + 'px'
    combo.style.left = '50%'; combo.style.top = (by - 38) + 'px'
  } else {
    B = Math.min(H * 0.84, W * 0.56, 620)
    by = (H - B) / 2 + 10
    bx = Math.max(16, (W * 0.6 - B) / 2)
    var tx = bx + B + 24, tw = W - tx - 16, th = Math.min((H - 150) / 3, tw * 0.75)
    var ty0 = Math.max(118, (H - th * 3) / 2 + 40)
    for (i = 0; i < 3; i++) slots.push({ x: tx, y: ty0 + th * i, w: tw, h: th })
    hud.style.left = tx + 'px'; hud.style.right = '16px'; hud.style.top = '12px'
    combo.style.left = (tx + tw / 2) + 'px'; combo.style.top = (ty0 - 40) + 'px'
  }
  cel = B / N
  sprites = {}
}
window.addEventListener('resize', meet)

// ── geluid (WebAudio, geen bestanden) ──
var AC = null
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)() } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC }
function toon(f, dur, type, vol, delay, f2) {
  if (!D.geluid) return
  var a = audio(); if (!a) return
  var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain()
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur)
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02)
}
var Geluid = {
  pak: function () { toon(660, 0.05, 'sine', 0.05) },
  leg: function () { toon(180, 0.09, 'triangle', 0.12, 0, 120) },
  fout: function () { toon(140, 0.12, 'sawtooth', 0.05, 0, 90) },
  lijn: function (L, combo) {
    var basis = 440 * Math.pow(2, Math.min(combo - 1, 12) / 12 * 2)
    var stappen = [1, 1.25, 1.5, 2, 2.5, 3]
    for (var i = 0; i < Math.min(L + 1, 6); i++) toon(basis * stappen[i], 0.18, i % 2 ? 'square' : 'sine', 0.06, i * 0.06)
  },
  perfect: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { toon(f, 0.3, 'sine', 0.08, i * 0.08) }) },
  over: function () { [392, 330, 262, 196].forEach(function (f, i) { toon(f, 0.28, 'triangle', 0.09, i * 0.14) }) },
}
function tekenGeluidKnop() { $('golf').style.display = D.geluid ? '' : 'none'; $('geluid').style.opacity = D.geluid ? 1 : 0.6 }
$('geluid').onclick = function () { D.geluid = !D.geluid; bewaar(); tekenGeluidKnop(); if (D.geluid) Geluid.pak() }

// ── spelstaat ──
var spel = null, actief = false, gepauzeerd = false
var geboren = new Float64Array(64)       // pop-in animatie per cel
var weg = [], deeltjes = [], teksten = [], flitsen = []
var schud = 0, toonScore = 0, trayIn = 0, eindeT = 0
var sleep = null, terugVlucht = null

function bewaarSpel() {
  if (!spel || spel.over) return
  try { localStorage.setItem(SPELOPSLAG, JSON.stringify(BB.bewaar(spel))) } catch (e) {}
}
function wisSpel() { try { localStorage.removeItem(SPELOPSLAG) } catch (e) {} }
function opgeslagen() { try { return JSON.parse(localStorage.getItem(SPELOPSLAG) || 'null') } catch (e) { return null } }

function start(herstelData) {
  spel = herstelData ? BB.herstel(herstelData) : BB.nieuwSpel()
  if (spel.over) { spel = BB.nieuwSpel(); wisSpel() }
  geboren.fill(0); weg = []; deeltjes = []; teksten = []; flitsen = []
  schud = 0; toonScore = spel.score; $('score').textContent = spel.score; trayIn = performance.now(); eindeT = 0
  sleep = null; terugVlucht = null
  actief = true; gepauzeerd = false
  toonScherm(null)
  werkHudBij()
  audio()
}

// ── HUD ──
function werkHudBij() {
  $('record').textContent = D.record ? 'Record ' + D.record : ''
  var c = $('combo')
  if (spel && spel.combo >= 2 && !spel.over) {
    var dots = ''
    for (var i = 0; i < 3; i++) dots += '<i' + (i < 3 - spel.sinds ? '' : ' class="op"') + '></i>'
    c.innerHTML = 'COMBO ×' + spel.combo + ' ' + dots
    c.classList.add('aan')
  } else c.classList.remove('aan')
}

// ── invoer ──
function slotVan(x, y) {
  for (var i = 0; i < 3; i++) { var s = slots[i]; if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return i }
  return -1
}
function trayMaat(v, s) { return Math.min(cel * 0.6, (s.w - 16) / Math.max(v.w, 3), (s.h - 16) / Math.max(v.h, 3)) }
cv.addEventListener('pointerdown', function (e) {
  if (!actief || gepauzeerd || spel.over || sleep) return
  audio()
  var i = slotVan(e.clientX, e.clientY)
  if (i < 0 || !spel.set[i]) return
  var v = spel.set[i], s = slots[i], tm = trayMaat(v, s)
  sleep = { i: i, x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse', t0: performance.now(),
    // waar zat het blok in het vak (voor een vloeiende overgang naar volle grootte)
    vanX: s.x + s.w / 2, vanY: s.y + s.h / 2, vanMaat: tm, pre: null }
  try { cv.setPointerCapture(e.pointerId) } catch (er) {}
  Geluid.pak()
  bijwerkSleep(e.clientX, e.clientY)
})
cv.addEventListener('pointermove', function (e) { if (sleep) bijwerkSleep(e.clientX, e.clientY) })
cv.addEventListener('pointerup', laatLos)
cv.addEventListener('pointercancel', laatLos)

// middelpunt van het gesleepte blok: bij aanraken boven de vinger, anders onder de muis
function sleepMidden() {
  var v = spel.set[sleep.i]
  var lift = sleep.touch ? v.h * cel / 2 + cel * 1.1 : 0
  return { x: sleep.x, y: sleep.y - lift }
}
function bijwerkSleep(x, y) {
  sleep.x = x; sleep.y = y
  var v = spel.set[sleep.i], m = sleepMidden()
  var c = Math.round((m.x - v.w * cel / 2 - bx) / cel), r = Math.round((m.y - v.h * cel / 2 - by) / cel)
  var vb = BB.voorbeeld(spel, sleep.i, r, c)
  sleep.pre = vb ? { r: r, c: c, volR: vb.volR, volK: vb.volK } : null
}
function laatLos() {
  if (!sleep) return
  var s = sleep; sleep = null
  if (s.pre) { legNeer(s.i, s.pre.r, s.pre.c); return }
  // terug naar het vak
  var m = { x: s.x, y: s.y - (s.touch ? spel.set[s.i].h * cel / 2 + cel * 1.1 : 0) }
  terugVlucht = { i: s.i, x: m.x, y: m.y, t0: performance.now() }
  if (m.x > bx && m.x < bx + B && m.y > by && m.y < by + B) Geluid.fout()
}

// ── neerleggen + effecten ──
var LOF = ['', '', 'Goed!', 'Geweldig!', 'Fantastisch!', 'Ongelooflijk!']
function legNeer(i, r, c) {
  var v = spel.set[i], nu = performance.now()
  var res = BB.plaats(spel, i, r, c)
  if (!res) return
  v.cellen.forEach(function (p) { geboren[(r + p[0]) * N + c + p[1]] = nu })
  var mr = r + v.h / 2, mc = c + v.w / 2
  Object.keys(res.weg).forEach(function (k) {
    var idx = +k, wr = idx >> 3, wc = idx & 7
    var afst = Math.hypot(wr + 0.5 - mr, wc + 0.5 - mc)
    weg.push({ r: wr, c: wc, kleur: res.weg[k], t0: nu + afst * 32, los: false })
  })
  res.volR.forEach(function (x) { flitsen.push({ rij: true, i: x, t0: nu, kleur: v.kleur }) })
  res.volK.forEach(function (x) { flitsen.push({ rij: false, i: x, t0: nu, kleur: v.kleur }) })
  var px = bx + mc * cel, py = by + mr * cel
  teksten.push({ tekst: '+' + res.punten, x: px, y: py, t0: nu, dur: 900, maat: res.lijnen ? 30 : 20, kleur: res.lijnen ? '#ffffff' : 'rgba(255,255,255,.75)' })
  if (res.lijnen) {
    if (res.lijnen >= 2) teksten.push({ tekst: LOF[Math.min(res.lijnen, 5)], x: bx + B / 2, y: by + B * 0.38, t0: nu + 80, dur: 1100, maat: 40, kleur: stijl().palet[v.kleur], groot: true })
    if (res.combo >= 2) teksten.push({ tekst: 'COMBO ×' + res.combo, x: bx + B / 2, y: by + B * 0.52, t0: nu + 160, dur: 1100, maat: 30, kleur: '#ff4fd8', groot: true })
    schud = Math.max(schud, res.lijnen >= 2 ? 3 + res.lijnen * 2 : 1.5)
    Geluid.lijn(res.lijnen, res.combo)
  } else Geluid.leg()
  if (res.perfect) {
    teksten.push({ tekst: 'PERFECT!', x: bx + B / 2, y: by + B * 0.66, t0: nu + 250, dur: 1500, maat: 54, kleur: '#ffc83d', groot: true })
    schud = 16; Geluid.perfect()
    for (var k = 0; k < 60; k++) deeltje(bx + B / 2, by + B / 2, PALET[k % 8], 9)
  }
  if (res.nieuweSet) trayIn = nu + 120
  werkHudBij()
  if (spel.over) { eindeT = nu; wisSpel(); setTimeout(einde, 1500); Geluid.over() }
  else bewaarSpel()
}
function deeltje(x, y, col, snel) {
  var a = Math.random() * Math.PI * 2, v = (0.4 + Math.random()) * (snel || 4)
  deeltjes.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, leven: 0, max: 35 + Math.random() * 30, col: col, maat: 2 + Math.random() * 3.5 })
}

// ── einde ──
function einde() {
  actief = false
  var verdiend = Math.floor(spel.score / 40)
  var nieuw = spel.score > D.record
  D.munten += verdiend; D.gespeeld++
  if (nieuw) D.record = spel.score
  bewaar()
  $('eindtitel').textContent = 'Geen ruimte meer!'
  $('eindscore').textContent = spel.score
  $('nieuwrecord').classList.toggle('verborgen', !nieuw || spel.score === 0)
  $('st-lijnen').textContent = spel.lijnen
  $('st-combo').textContent = spel.besteCombo ? '×' + spel.besteCombo : '—'
  $('st-zetten').textContent = spel.zetten
  $('verdiend').textContent = verdiend
  $('nogeens').classList.toggle('verborgen', BELONING)
  $('klaar').classList.toggle('verborgen', !BELONING)
  $('combo').classList.remove('aan')
  toonScherm('einde')
}

// ── tekenen ──
var tijd0 = performance.now()
function frame(nu) {
  var t = (nu - tijd0) / 1000
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  achtergrond(t)
  if (spel) {
    ctx.save()
    if (schud > 0.3) { ctx.translate((Math.random() - 0.5) * schud, (Math.random() - 0.5) * schud); schud *= 0.86 } else schud = 0
    bord(nu, t)
    tray(nu)
    if (sleep) gesleept(nu)
    if (terugVlucht) vlucht(nu)
    effecten(nu)
    ctx.restore()
    if (toonScore !== spel.score) { toonScore += Math.max(1, Math.ceil((spel.score - toonScore) * 0.15)); if (toonScore > spel.score) toonScore = spel.score; $('score').textContent = toonScore }
  }
  requestAnimationFrame(frame)
}
function achtergrond(t) {
  var g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#0b0a24'); g.addColorStop(1, '#05050f')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  var blobs = [[0.2, 0.25, '#9b6bff'], [0.8, 0.7, '#3ef0ff'], [0.65, 0.15, '#ff4fd8']]
  ctx.globalCompositeOperation = 'lighter'
  blobs.forEach(function (b, i) {
    var x = W * (b[0] + Math.sin(t * 0.13 + i * 2) * 0.06), y = H * (b[1] + Math.cos(t * 0.11 + i) * 0.05), r = Math.max(W, H) * 0.45
    var rg = ctx.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, rgba(b[2], 0.13)); rg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H)
  })
  ctx.globalCompositeOperation = 'source-over'
}
function kleurVan(k, r, c, t) {
  var st = stijl()
  return st.regenboog ? (k + Math.floor(t * 1.5 + (r + c) * 0.35)) % 8 : k
}
function blok(k, x, y, s, alpha, r, c, t) {
  var st = stijl(), sp = sprite(st, kleurVan(k, r || 0, c || 0, t || 0), s)
  if (alpha != null) ctx.globalAlpha = alpha
  ctx.drawImage(sp, x - PAD, y - PAD, s + PAD * 2, s + PAD * 2)
  ctx.globalAlpha = 1
}
function bord(nu, t) {
  // paneel
  ctx.save()
  ctx.shadowColor = 'rgba(62,240,255,.25)'; ctx.shadowBlur = 30
  rr(ctx, bx - 10, by - 10, B + 20, B + 20, 18); ctx.fillStyle = 'rgba(14,16,42,.88)'; ctx.fill()
  ctx.restore()
  rr(ctx, bx - 10, by - 10, B + 20, B + 20, 18); ctx.strokeStyle = 'rgba(130,150,255,.28)'; ctx.lineWidth = 1.5; ctx.stroke()
  var g = cel * 0.06
  for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
    rr(ctx, bx + c * cel + g, by + r * cel + g, cel - g * 2, cel - g * 2, cel * 0.14)
    ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fill()
  }
  // voorbeeld: welke lijnen gaan verdwijnen
  var pre = sleep && sleep.pre, pv = pre && spel.set[sleep.i]
  var lijnCel = {}
  if (pre) {
    pre.volR.forEach(function (x) { for (var k = 0; k < N; k++) lijnCel[x * N + k] = 1 })
    pre.volK.forEach(function (x) { for (var k = 0; k < N; k++) lijnCel[k * N + x] = 1 })
    var puls = 0.5 + 0.5 * Math.sin(nu / 110)
    ctx.globalCompositeOperation = 'lighter'
    pre.volR.forEach(function (x) { rr(ctx, bx - 4, by + x * cel - 2, B + 8, cel + 4, 10); ctx.fillStyle = rgba(stijl().palet[pv.kleur], 0.12 + puls * 0.12); ctx.fill() })
    pre.volK.forEach(function (x) { rr(ctx, bx + x * cel - 2, by - 4, cel + 4, B + 8, 10); ctx.fillStyle = rgba(stijl().palet[pv.kleur], 0.12 + puls * 0.12); ctx.fill() })
    ctx.globalCompositeOperation = 'source-over'
  }
  // liggende blokken
  var grijs = eindeT ? (nu - eindeT) / 45 : -1
  for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
    var idx = r * N + c, k = spel.kleur[idx]
    if (k < 0) continue
    var x = bx + c * cel, y = by + r * cel, s = cel
    var leeftijd = nu - geboren[idx]
    if (leeftijd < 180) { var f = leeftijd / 180, sc = 0.6 + 0.4 * f + Math.sin(f * Math.PI) * 0.12; s = cel * sc; x += (cel - s) / 2; y += (cel - s) / 2 }
    if (lijnCel[idx]) blok(pv.kleur, x, y, s, 1, r, c, t)
    else blok(k, x, y, s, null, r, c, t)
    if (grijs >= 0 && (N - 1 - r) * N + c < grijs) { rr(ctx, x + 1, y + 1, s - 2, s - 2, s * 0.16); ctx.fillStyle = 'rgba(20,22,40,.72)'; ctx.fill() }
  }
  // spookblok op de plek waar je hem neerlegt
  if (pre) pv.cellen.forEach(function (p) { blok(pv.kleur, bx + (pre.c + p[1]) * cel, by + (pre.r + p[0]) * cel, cel, 0.42, pre.r + p[0], pre.c + p[1], t) })
}
function vorm(v, mx, my, s, alpha, t) {
  var x0 = mx - v.w * s / 2, y0 = my - v.h * s / 2
  v.cellen.forEach(function (p) { blok(v.kleur, x0 + p[1] * s, y0 + p[0] * s, s, alpha, p[0], p[1], t) })
}
function tray(nu) {
  var t = (nu - tijd0) / 1000
  for (var i = 0; i < 3; i++) {
    var v = spel.set[i], s = slots[i]
    if (!v || (sleep && sleep.i === i) || (terugVlucht && terugVlucht.i === i)) continue
    var tm = trayMaat(v, s)
    var f = Math.max(0, Math.min(1, (nu - trayIn - i * 70) / 260)), e = 1 - Math.pow(1 - f, 3)
    var dx = staand ? (1 - e) * W * 0.5 : (1 - e) * (W - s.x)
    var past = BB.pastErgens(spel.rijen, v)
    vorm(v, s.x + s.w / 2 + dx, s.y + s.h / 2, tm, (past ? 1 : 0.28) * e, t)
  }
}
function gesleept(nu) {
  var v = spel.set[sleep.i], m = sleepMidden(), t = (nu - tijd0) / 1000
  var f = Math.min(1, (nu - sleep.t0) / 110)
  var s = sleep.vanMaat + (cel - sleep.vanMaat) * f
  var x = sleep.vanX + (m.x - sleep.vanX) * Math.min(1, f * 1.6), y = sleep.vanY + (m.y - sleep.vanY) * Math.min(1, f * 1.6)
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 10
  vorm(v, x, y, s * 0.98, sleep.pre ? 0.9 : 1, t)
  ctx.restore()
}
function vlucht(nu) {
  var v = spel.set[terugVlucht.i], s = slots[terugVlucht.i]
  if (!v) { terugVlucht = null; return }
  var f = Math.min(1, (nu - terugVlucht.t0) / 170), e = 1 - Math.pow(1 - f, 2)
  var tm = trayMaat(v, s)
  vorm(v, terugVlucht.x + (s.x + s.w / 2 - terugVlucht.x) * e, terugVlucht.y + (s.y + s.h / 2 - terugVlucht.y) * e, cel + (tm - cel) * e, 1, (nu - tijd0) / 1000)
  if (f >= 1) terugVlucht = null
}
function effecten(nu) {
  var st = stijl()
  // lijn-flitsen
  ctx.globalCompositeOperation = 'lighter'
  flitsen = flitsen.filter(function (fl) {
    var f = (nu - fl.t0) / 320; if (f >= 1) return false
    ctx.fillStyle = rgba(st.palet[fl.kleur], 0.55 * (1 - f))
    if (fl.rij) ctx.fillRect(bx - 6, by + fl.i * cel - 3 * f, B + 12, cel + 6 * f)
    else ctx.fillRect(bx + fl.i * cel - 3 * f, by - 6, cel + 6 * f, B + 12)
    return true
  })
  ctx.globalCompositeOperation = 'source-over'
  // verdwijnende cellen: wit flitsen, opzwellen, uiteenspatten
  weg = weg.filter(function (w) {
    var f = (nu - w.t0) / 260
    var x = bx + w.c * cel, y = by + w.r * cel
    if (f < 0) { blok(w.kleur, x, y, cel, 1, w.r, w.c); return true }
    if (!w.los) { w.los = true; for (var k = 0; k < 6; k++) deeltje(x + cel / 2, y + cel / 2, st.palet[kleurVan(w.kleur, w.r, w.c, (nu - tijd0) / 1000)], 4.5) }
    if (f >= 1) return false
    var s = cel * (1 + f * 0.35)
    blok(w.kleur, x + (cel - s) / 2, y + (cel - s) / 2, s, 1 - f, w.r, w.c)
    if (f < 0.35) { rr(ctx, x + 2, y + 2, cel - 4, cel - 4, cel * 0.16); ctx.fillStyle = 'rgba(255,255,255,' + (0.8 * (1 - f / 0.35)) + ')'; ctx.fill() }
    return true
  })
  // deeltjes
  ctx.globalCompositeOperation = 'lighter'
  deeltjes = deeltjes.filter(function (d) {
    d.leven++; d.x += d.vx; d.y += d.vy; d.vy += 0.18; d.vx *= 0.98
    var a = 1 - d.leven / d.max; if (a <= 0) return false
    ctx.fillStyle = rgba(d.col, a); ctx.beginPath(); ctx.arc(d.x, d.y, d.maat * (0.5 + a * 0.5), 0, 7); ctx.fill()
    return true
  })
  ctx.globalCompositeOperation = 'source-over'
  // teksten
  teksten = teksten.filter(function (tx) {
    var f = (nu - tx.t0) / tx.dur; if (f >= 1) return false; if (f < 0) return true
    var sc = tx.groot ? (f < 0.15 ? 0.5 + f / 0.15 * 0.6 : f < 0.25 ? 1.1 - (f - 0.15) : 1) : 1
    var a = f > 0.7 ? 1 - (f - 0.7) / 0.3 : 1
    ctx.save()
    ctx.translate(tx.x, tx.y - (tx.groot ? f * 20 : f * 46)); ctx.scale(sc, sc)
    ctx.font = (tx.groot ? '' : '') + tx.maat + "px 'Russo One', system-ui, sans-serif"
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = a
    ctx.shadowColor = tx.kleur; ctx.shadowBlur = tx.groot ? 22 : 10
    ctx.lineWidth = tx.groot ? 6 : 4; ctx.strokeStyle = 'rgba(6,6,20,.85)'; ctx.strokeText(tx.tekst, 0, 0)
    ctx.fillStyle = tx.groot ? '#fff' : tx.kleur; ctx.fillText(tx.tekst, 0, 0)
    if (tx.groot) { ctx.shadowBlur = 0; ctx.globalAlpha = a * 0.6; ctx.fillStyle = tx.kleur; ctx.fillText(tx.tekst, 0, 0) }
    ctx.restore()
    return true
  })
}

// ── schermen ──
function toonScherm(id) {
  ;['menu', 'einde', 'winkel', 'pauzescherm'].forEach(function (s) { $(s).classList.toggle('aan', s === id) })
  var inSpel = id === null
  $('pauze').style.display = inSpel ? '' : 'none'
  $('hud').style.display = spel ? '' : 'none'
}
function toonMenu() {
  $('menurecord').innerHTML = D.record ? 'Jouw record: <strong>' + D.record + '</strong>' : ''
  $('menumunten').textContent = D.munten
  var heeft = !!opgeslagen()
  $('verder').classList.toggle('verborgen', !heeft)
  $('speel').textContent = heeft ? 'Nieuw spel' : 'Spelen'
  $('speel').className = heeft ? 'knop2' : 'knop'
  toonScherm('menu')
}
$('speel').onclick = function () { wisSpel(); start() }
$('verder').onclick = function () { start(opgeslagen()) }
$('nogeens').onclick = function () { start() }
$('klaar').onclick = function () { parent.postMessage({ type: 'blokkenblitz-gameover' }, '*') }
$('pauze').onclick = function () { if (!actief) return; gepauzeerd = true; sleep = null; toonScherm('pauzescherm') }
$('hervat').onclick = function () { gepauzeerd = false; toonScherm(null) }
$('stop').onclick = function () { bewaarSpel(); actief = false; spel = null; $('combo').classList.remove('aan'); toonMenu() }

var vanScherm = 'menu'
function naarWinkel(van) { vanScherm = van; tekenWinkel(); toonScherm('winkel') }
$('naarwinkel').onclick = function () { naarWinkel('menu') }
$('naarwinkel2').onclick = function () { naarWinkel('einde') }
$('uitwinkel').onclick = function () { if (vanScherm === 'einde') toonScherm('einde'); else toonMenu() }

function tekenWinkel() {
  $('winkelmunten').textContent = D.munten
  var lijst = $('lijst'); lijst.innerHTML = ''
  STIJLEN.forEach(function (st) {
    var kaart = document.createElement('div'); kaart.className = 'kaart' + (D.keuze === st.id ? ' gekozen' : '')
    var c = document.createElement('canvas'); c.width = 240; c.height = 104
    var g = c.getContext('2d'); g.scale(2, 2)
    var s = 22
    ;[[0, 0, 0], [1, 0, 1], [2, 0, 2], [1, 1, 3], [3, 1, 4], [4, 0, 6]].forEach(function (p, i) { tekenBlok(g, 8 + p[0] * s, 4 + p[1] * s, s, st.palet[(p[2] + i) % 8], st.vorm, p[2]) })
    var naam = document.createElement('div'); naam.className = 'naam'; naam.textContent = st.naam
    var uitleg = document.createElement('div'); uitleg.className = 'uitleg'; uitleg.textContent = st.uitleg
    var knop = document.createElement('button')
    var heeft = D.bezit.indexOf(st.id) >= 0
    if (heeft) {
      knop.className = 'kies' + (D.keuze === st.id ? ' aan' : '')
      knop.textContent = D.keuze === st.id ? 'Gekozen' : 'Kiezen'
      knop.onclick = function () { D.keuze = st.id; bewaar(); sprites = {}; tekenWinkel() }
    } else {
      knop.className = 'koop'; knop.textContent = st.prijs + ' munten'
      knop.disabled = D.munten < st.prijs
      knop.onclick = function () {
        if (D.munten < st.prijs) return
        D.munten -= st.prijs; D.bezit.push(st.id); D.keuze = st.id; bewaar(); sprites = {}; Geluid.perfect(); tekenWinkel()
      }
    }
    kaart.appendChild(c); kaart.appendChild(naam); kaart.appendChild(uitleg); kaart.appendChild(knop)
    lijst.appendChild(kaart)
  })
}

document.addEventListener('visibilitychange', function () { if (document.hidden) bewaarSpel() })
window.addEventListener('pagehide', bewaarSpel)

meet()
tekenGeluidKnop()
if (BELONING) start(opgeslagen())   // beloning: meteen spelen, verder met het bewaarde potje
else toonMenu()
requestAnimationFrame(frame)
// wacht op het lettertype zodat canvas-teksten meteen goed staan
if (document.fonts && document.fonts.load) document.fonts.load("30px 'Russo One'")
})()
