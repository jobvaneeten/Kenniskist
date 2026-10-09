// Stapeltoren — scherm, besturing, effecten, winkel. Spelregels staan in kern.js.
(function () {
'use strict'
var cv = document.getElementById('c'), ctx = cv.getContext('2d')
var $ = function (id) { return document.getElementById(id) }

// ── inbedding ──
var params = new URLSearchParams(location.search)
var BELONING = !params.has('terug')
if (!BELONING) {
  $('terug').classList.add('aan')
  $('terug').onclick = function () { parent.postMessage({ type: 'stapeltoren-terug' }, '*') }
}

// ── opslag (kk_-prefix ⇒ synct mee naar het account) ──
var OPSLAG = 'kk_st'
var D = (function () {
  var d = {}
  try { d = JSON.parse(localStorage.getItem(OPSLAG) || '{}') || {} } catch (e) {}
  return { munten: d.munten || 0, record: d.record || 0, bezit: d.bezit || ['neon'], thema: d.thema || 'neon', geluid: d.geluid !== false, gespeeld: d.gespeeld || 0 }
})()
function bewaar() { try { localStorage.setItem(OPSLAG, JSON.stringify(D)) } catch (e) {} }

// ── thema's: kleur van laag k als [tint, verzadiging, licht] ──
var THEMAS = [
  { id: 'neon', naam: 'Neon', prijs: 0, kleur: function (k) { return [(190 + k * 7) % 360, 90, 58] }, lucht: [250, 300] },
  { id: 'snoep', naam: 'Snoep', prijs: 120, kleur: function (k) { return [[330, 190, 50, 280, 120][k % 5], 85, 70] }, lucht: [320, 280] },
  { id: 'ijs', naam: 'IJs', prijs: 250, kleur: function (k) { return [195 + Math.sin(k * 0.5) * 15, 80, 72 + Math.sin(k * 0.9) * 8] }, lucht: [210, 230] },
  { id: 'lava', naam: 'Lava', prijs: 400, kleur: function (k) { return [10 + Math.abs(Math.sin(k * 0.35)) * 40, 100, 52] }, lucht: [350, 10] },
  { id: 'jungle', naam: 'Jungle', prijs: 600, kleur: function (k) { return [90 + Math.sin(k * 0.4) * 35, 70, 48] }, lucht: [160, 200] },
  { id: 'heelal', naam: 'Heelal', prijs: 850, kleur: function (k) { return [250 + Math.sin(k * 0.3) * 40, 80, 55] }, lucht: [260, 230], sterren: true },
  { id: 'goud', naam: 'Goud', prijs: 1200, kleur: function (k) { return [42 + (k % 2) * 6, 95, 55 + (k % 3) * 5] }, lucht: [40, 280], glans: true },
]
function thema() { return THEMAS.find(function (t) { return t.id === D.thema }) || THEMAS[0] }
function hsl(c, dl, a) { return 'hsla(' + c[0] + ',' + c[1] + '%,' + Math.max(0, Math.min(100, c[2] + (dl || 0))) + '%,' + (a == null ? 1 : a) + ')' }

// ── layout ──
var dpr = 1, W = 0, H = 0, K = 1, cx = 0, basisY = 0
var C30 = Math.cos(Math.PI / 6)
function meet() {
  dpr = Math.min(2, window.devicePixelRatio || 1)
  W = innerWidth; H = innerHeight
  cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr)
  K = Math.min(W * 0.24, H * 0.17, 150)
  cx = W / 2; basisY = H * 0.5
}
window.addEventListener('resize', meet)
var camY = 0
function scherm(x, y, z) { return [cx + (x - z) * C30 * K, basisY + (x + z) * 0.5 * K - (y - camY) * K] }

// ── geluid ──
var AC = null
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)() } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC }
function toon(f, dur, type, vol, delay, f2) {
  if (!D.geluid) return
  var a = audio(); if (!a) return
  var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain()
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur)
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02)
}
var TOONLADDER = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]
var Geluid = {
  zet: function () { toon(170, 0.1, 'triangle', 0.16, 0, 110) },
  perfect: function (c) { var f = 523 * Math.pow(2, TOONLADDER[Math.min(c - 1, TOONLADDER.length - 1)] / 12); toon(f, 0.22, 'sine', 0.1); toon(f * 2, 0.15, 'sine', 0.035, 0.03) },
  mis: function () { toon(300, 0.5, 'sawtooth', 0.07, 0, 60) },
  tik: function () { toon(880, 0.04, 'square', 0.03) },
  einde: function () { [523, 659, 784, 1047].forEach(function (f, i) { toon(f, 0.28, 'sine', 0.08, i * 0.1) }) },
  koop: function () { [784, 988, 1319].forEach(function (f, i) { toon(f, 0.18, 'sine', 0.08, i * 0.07) }) },
}
function tekenGeluidKnop() { $('golf').style.display = D.geluid ? '' : 'none'; $('geluid').style.opacity = D.geluid ? 1 : 0.6 }
$('geluid').onclick = function (e) { e.stopPropagation(); D.geluid = !D.geluid; bewaar(); tekenGeluidKnop(); if (D.geluid) Geluid.zet() }

// ── spelstaat ──
var s = null, actief = false, gepauzeerd = false
var vallers = [], golven = [], deeltjes = [], teksten = [], schud = 0, laatsteTik = 10, zak = 0

function start() {
  s = ST.nieuw(); actief = true; gepauzeerd = false
  vallers = []; golven = []; deeltjes = []; teksten = []; camY = 0; zak = 0
  toonScherm(null)
  tekenHud()
}

function tik() {
  if (!actief || gepauzeerd || !s || s.over) return
  var r = ST.plaats(s)
  if (!r) return
  var k = r.y
  if (r.type === 'mis') {
    Geluid.mis(); schud = 14
    vallers.push({ b: r.stuk, y: k, vy: 0, t: 0, k: k, rot: 0 })
    eindigen()
    return
  }
  zak = 1
  if (r.type === 'perfect') {
    Geluid.perfect(r.combo)
    golven.push({ b: r.laag, y: k, t: 0 })
    if (r.combo >= 2) tekst((r.combo >= 3 ? 'Perfect ×' + r.combo : 'Perfect!'), r.combo)
    var hoek = scherm((r.laag.x0 + r.laag.x1) / 2, k * ST.LAAG, (r.laag.z0 + r.laag.z1) / 2)
    for (var i = 0; i < 12 + r.combo * 2; i++) deeltje(hoek[0], hoek[1], hsl(thema().kleur(k), 15))
  } else {
    Geluid.zet()
    vallers.push({ b: r.stuk, y: k, vy: 0, t: 0, k: k })
  }
  tekenHud()
}
cv.addEventListener('pointerdown', function () { audio(); tik() })
window.addEventListener('keydown', function (e) { if (e.code === 'Space') { e.preventDefault(); tik() } })

function deeltje(x, y, col) {
  var a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 180
  deeltjes.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 80, t: 0, max: 0.6 + Math.random() * 0.4, col: col, r: 1.5 + Math.random() * 2.5 })
}
function tekst(str, c) { teksten.push({ s: str, t: 0, c: c }) }

function tekenHud() {
  if (!s) return
  $('hoogte').textContent = ST.hoogte(s)
  var sec = Math.ceil(s.klok)
  $('tijd').textContent = '0:' + String(sec).padStart(2, '0')
  $('balkvul').style.transform = 'scaleX(' + (s.klok / ST.DUUR) + ')'
  $('balk').classList.toggle('krap', s.klok <= 10)
  $('record').textContent = D.record ? 'Record ' + D.record : ''
}

function eindigen() {
  actief = false
  var h = ST.hoogte(s), verdiend = ST.munten(s), nieuw = h > D.record
  D.munten += verdiend; D.gespeeld++
  if (nieuw) D.record = h
  bewaar()
  $('eindtitel').textContent = s.reden === 'tijd' ? 'Tijd is om!' : 'Mis!'
  $('eindhoogte').textContent = h
  $('nieuwrecord').classList.toggle('verborgen', !nieuw || h === 0)
  $('st-perfect').textContent = s.perfecten
  $('st-combo').textContent = s.besteCombo
  $('verdiend').textContent = verdiend
  $('nogeens').classList.toggle('verborgen', BELONING)
  $('klaar').classList.toggle('verborgen', !BELONING)
  if (s.reden === 'tijd') Geluid.einde()
  setTimeout(function () { toonScherm('einde') }, s.reden === 'tijd' ? 700 : 1300)
}

// ── tekenen ──
function blok(b, y0, y1, c, alpha, glans) {
  // drie zichtbare vlakken: boven, voor-links (+z) en voor-rechts (+x)
  var p = function (x, y, z) { return scherm(x, y, z) }
  var a1 = p(b.x0, y1, b.z0), a2 = p(b.x1, y1, b.z0), a3 = p(b.x1, y1, b.z1), a4 = p(b.x0, y1, b.z1)
  var o2 = p(b.x1, y0, b.z0), o3 = p(b.x1, y0, b.z1), o4 = p(b.x0, y0, b.z1)
  ctx.globalAlpha = alpha == null ? 1 : alpha
  // links (+z)
  ctx.fillStyle = hsl(c, -14)
  ctx.beginPath(); ctx.moveTo(a4[0], a4[1]); ctx.lineTo(a3[0], a3[1]); ctx.lineTo(o3[0], o3[1]); ctx.lineTo(o4[0], o4[1]); ctx.closePath(); ctx.fill()
  // rechts (+x)
  ctx.fillStyle = hsl(c, -26)
  ctx.beginPath(); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(a3[0], a3[1]); ctx.lineTo(o3[0], o3[1]); ctx.lineTo(o2[0], o2[1]); ctx.closePath(); ctx.fill()
  // boven
  ctx.fillStyle = hsl(c, 6)
  ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.lineTo(a3[0], a3[1]); ctx.lineTo(a4[0], a4[1]); ctx.closePath(); ctx.fill()
  if (glans) {
    ctx.fillStyle = 'rgba(255,255,255,.22)'
    ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo((a1[0] + a2[0]) / 2, (a1[1] + a2[1]) / 2); ctx.lineTo((a4[0] + a3[0]) / 2 - (a3[0] - a4[0]) * 0.2, (a4[1] + a3[1]) / 2); ctx.lineTo(a4[0], a4[1]); ctx.closePath(); ctx.fill()
  }
  // neonrand
  ctx.strokeStyle = hsl(c, 26, 0.9); ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.lineTo(a3[0], a3[1]); ctx.lineTo(a4[0], a4[1]); ctx.closePath(); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(a3[0], a3[1]); ctx.lineTo(o3[0], o3[1]); ctx.stroke()
  ctx.globalAlpha = 1
}

var sterren = []
for (var i = 0; i < 120; i++) sterren.push({ x: Math.random(), y: Math.random() * 3, r: Math.random() * 1.4 + 0.3, f: Math.random() * 6 })
function achtergrond(t) {
  var th = thema(), hoog = Math.min(1, camY / 9)
  var g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, 'hsl(' + th.lucht[0] + ',55%,' + (12 - hoog * 7) + '%)')
  g.addColorStop(1, 'hsl(' + th.lucht[1] + ',50%,' + (18 - hoog * 10) + '%)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  // hoe hoger, hoe meer sterren
  ctx.fillStyle = '#fff'
  sterren.forEach(function (st) {
    var y = ((st.y * H + camY * K * 0.25) % (H * 3)) - H
    if (y < 0 || y > H) return
    ctx.globalAlpha = (0.2 + hoog * 0.6) * (0.6 + 0.4 * Math.sin(t * 1.5 + st.f))
    ctx.beginPath(); ctx.arc(st.x * W, y, st.r, 0, 7); ctx.fill()
  })
  ctx.globalAlpha = 1
}

var vorige = performance.now(), tijd = 0
function frame(nu) {
  var dt = Math.min(0.05, (nu - vorige) / 1000); vorige = nu
  tijd += dt
  if (s && actief && !gepauzeerd) {
    var ev = ST.stap(s, dt)
    if (ev.length && ev[0].type === 'tijd') eindigen()
    var sec = Math.ceil(s.klok)
    if (sec <= 5 && sec !== laatsteTik && s.klok > 0) { laatsteTik = sec; Geluid.tik() }
    tekenHud()
  }
  var n = s ? s.lagen.length : 1
  var doel = Math.max(0, (n - 1) * ST.LAAG - 0.15)
  camY += (doel - camY) * Math.min(1, dt * 5)
  zak = Math.max(0, zak - dt * 6)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  achtergrond(tijd)
  ctx.save()
  if (schud > 0.3) { ctx.translate((Math.random() - 0.5) * schud, (Math.random() - 0.5) * schud); schud *= 0.88 } else schud = 0
  tekenToren(dt)
  effecten(dt)
  ctx.restore()
  requestAnimationFrame(frame)
}

function tekenToren(dt) {
  var th = thema()
  // gloed onder de toren
  var voet = scherm(0, -0.4, 0)
  var gl = ctx.createRadialGradient(voet[0], voet[1], 0, voet[0], voet[1], K * 1.3)
  gl.addColorStop(0, hsl(th.kleur(0), 0, 0.25)); gl.addColorStop(1, hsl(th.kleur(0), 0, 0))
  ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H)
  // vallende stukken achter de toren (aan de min-kant) eerst
  tekenVallers(dt, true)
  if (!s) { blok({ x0: -0.5, x1: 0.5, z0: -0.5, z1: 0.5 }, -4, 0, th.kleur(0), 1, th.glans); return }
  // alleen de lagen die in beeld zijn
  var eerste = Math.max(1, Math.floor((camY - (H - basisY) / K) / ST.LAAG) - 2)
  blok(s.lagen[0], -4, 0, th.kleur(0), 1, th.glans)
  for (var k = eerste; k < s.lagen.length; k++) {
    var dip = k === s.lagen.length - 1 ? -zak * 0.02 : 0
    blok(s.lagen[k], (k - 1) * ST.LAAG + dip, k * ST.LAAG + dip, th.kleur(k), 1, th.glans)
  }
  // perfect-golven
  for (var g = golven.length - 1; g >= 0; g--) {
    var gv = golven[g]; gv.t += dt
    if (gv.t > 0.5) { golven.splice(g, 1); continue }
    var e = gv.t / 0.5, m = 0.05 + e * 0.18, b = gv.b, y = gv.y * ST.LAAG
    var q = [scherm(b.x0 - m, y, b.z0 - m), scherm(b.x1 + m, y, b.z0 - m), scherm(b.x1 + m, y, b.z1 + m), scherm(b.x0 - m, y, b.z1 + m)]
    ctx.strokeStyle = 'rgba(255,255,255,' + (1 - e) + ')'; ctx.lineWidth = 3 * (1 - e) + 1
    ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (var j = 1; j < 4; j++) ctx.lineTo(q[j][0], q[j][1]); ctx.closePath(); ctx.stroke()
  }
  // het schuivende blok
  if (actief && !s.over) {
    var nb = ST.huidig(s), kk = s.lagen.length
    blok(nb, (kk - 1) * ST.LAAG, kk * ST.LAAG, th.kleur(kk), 1, th.glans)
  }
  tekenVallers(dt, false)
}
function tekenVallers(dt, achter) {
  var th = thema()
  for (var i = vallers.length - 1; i >= 0; i--) {
    var v = vallers[i]
    var isAchter = (v.b.x0 + v.b.x1) / 2 + (v.b.z0 + v.b.z1) / 2 < 0
    if (isAchter !== achter) continue
    v.t += dt; v.vy += 9 * dt; v.y -= v.vy * dt / ST.LAAG
    if (v.t > 2.2) { vallers.splice(i, 1); continue }
    blok(v.b, (v.y - 1) * ST.LAAG, v.y * ST.LAAG, th.kleur(v.k), Math.max(0, 1 - v.t / 2.2), th.glans)
  }
}
function effecten(dt) {
  for (var i = deeltjes.length - 1; i >= 0; i--) {
    var d = deeltjes[i]; d.t += dt
    if (d.t > d.max) { deeltjes.splice(i, 1); continue }
    d.vy += 260 * dt; d.x += d.vx * dt; d.y += d.vy * dt
    ctx.globalAlpha = 1 - d.t / d.max; ctx.fillStyle = d.col
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill()
  }
  ctx.globalAlpha = 1
  for (var j = teksten.length - 1; j >= 0; j--) {
    var t = teksten[j]; t.t += dt
    if (t.t > 0.9) { teksten.splice(j, 1); continue }
    var f = t.t / 0.9
    ctx.save()
    ctx.globalAlpha = f > 0.6 ? (1 - f) / 0.4 : 1
    ctx.font = Math.round(22 + Math.min(t.c, 8) * 2) + 'px "Russo One", system-ui, sans-serif'; ctx.textAlign = 'center'
    var col = t.c >= 3 ? '#ffc83d' : '#ffffff'
    ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.fillStyle = col
    ctx.fillText(t.s, cx, basisY - K * 0.95 - f * 30)
    ctx.restore()
  }
}

// ── schermen ──
function toonScherm(id) {
  ;['menu', 'einde', 'winkel', 'pauzescherm'].forEach(function (x) { $(x).classList.toggle('aan', x === id) })
  var inSpel = id === null
  $('pauze').style.display = inSpel ? '' : 'none'
  $('hud').style.display = inSpel || id === 'pauzescherm' ? '' : 'none'
  $('terug').classList.toggle('aan', !BELONING && !inSpel)
}
function toonMenu() {
  s = null; actief = false
  $('menurecord').innerHTML = D.record ? 'Jouw record: <strong>' + D.record + '</strong> blokken' : ''
  $('menumunten').textContent = D.munten
  toonScherm('menu')
}
$('speel').onclick = start
$('nogeens').onclick = start
$('klaar').onclick = function () { parent.postMessage({ type: 'stapeltoren-gameover' }, '*') }
$('pauze').onclick = function (e) { e.stopPropagation(); if (!actief) return; gepauzeerd = true; toonScherm('pauzescherm') }
$('hervat').onclick = function () { gepauzeerd = false; vorige = performance.now(); toonScherm(null) }
$('stop').onclick = function () { gepauzeerd = false; if (BELONING) { s.reden = 'tijd'; eindigen() } else toonMenu() }
var vanScherm = 'menu'
$('naarwinkel').onclick = function () { vanScherm = 'menu'; tekenWinkel(); toonScherm('winkel') }
$('naarwinkel2').onclick = function () { vanScherm = 'einde'; tekenWinkel(); toonScherm('winkel') }
$('uitwinkel').onclick = function () { if (vanScherm === 'einde') toonScherm('einde'); else toonMenu() }

function tekenWinkel() {
  $('winkelmunten').textContent = D.munten
  var l = $('lijst'); l.innerHTML = ''
  THEMAS.forEach(function (th) {
    var k = document.createElement('div'); k.className = 'kaart' + (D.thema === th.id ? ' gekozen' : '')
    var c = document.createElement('canvas'); c.width = 200; c.height = 180
    var g = c.getContext('2d'); g.scale(2, 2)
    // mini-torentje
    var s2 = 26, x0 = 50, y0 = 78
    for (var i = 0; i < 6; i++) {
      var col = th.kleur(i), y = y0 - i * 9, w = s2 - (i % 2) * 2
      g.fillStyle = hsl(col, -14); g.beginPath(); g.moveTo(x0 - w * C30, y); g.lineTo(x0, y + w / 2); g.lineTo(x0, y + w / 2 + 9); g.lineTo(x0 - w * C30, y + 9); g.fill()
      g.fillStyle = hsl(col, -26); g.beginPath(); g.moveTo(x0 + w * C30, y); g.lineTo(x0, y + w / 2); g.lineTo(x0, y + w / 2 + 9); g.lineTo(x0 + w * C30, y + 9); g.fill()
      g.fillStyle = hsl(col, 6); g.beginPath(); g.moveTo(x0, y - w / 2); g.lineTo(x0 + w * C30, y); g.lineTo(x0, y + w / 2); g.lineTo(x0 - w * C30, y); g.fill()
    }
    var n = document.createElement('div'); n.className = 'naam'; n.textContent = th.naam
    var b = document.createElement('button')
    if (D.bezit.indexOf(th.id) >= 0) {
      b.className = 'kies' + (D.thema === th.id ? ' aan' : ''); b.textContent = D.thema === th.id ? 'Gekozen' : 'Kiezen'
      b.onclick = function () { D.thema = th.id; bewaar(); tekenWinkel() }
    } else {
      b.className = 'koop'; b.textContent = th.prijs + ' munten'; b.disabled = D.munten < th.prijs
      b.onclick = function () {
        if (D.munten < th.prijs) return
        D.munten -= th.prijs; D.bezit.push(th.id); D.thema = th.id; bewaar(); Geluid.koop(); tekenWinkel()
      }
    }
    k.appendChild(c); k.appendChild(n); k.appendChild(b)
    l.appendChild(k)
  })
}

meet()
tekenGeluidKnop()
if (BELONING) start()
else toonMenu()
requestAnimationFrame(frame)
})()
