// Tijdstrijd — scherm, besturing, tekeningen, geluid en winkel. De regels,
// levels en de computer staan in kern.js.
(function () {
'use strict'
var cv = document.getElementById('c'), ctx = cv.getContext('2d')
var $ = function (id) { return document.getElementById(id) }
var TAU = Math.PI * 2, GROND = 560, ONDER = 600, BOVEN = 250
var KLEUR = ['#3ef0ff', '#ff4f6a']

// ── inbedding: met ?terug=1 vrij spelen, anders 1 slag als beloning ──
var params = new URLSearchParams(location.search)
var BELONING = !params.has('terug')
if (!BELONING) $('terug').onclick = function () { parent.postMessage({ type: 'tijdstrijd-terug' }, '*') }

// ── opslag (kk_-prefix ⇒ synct mee naar het account) ──
var OPSLAG = 'kk_tijd'
var D = (function () {
  var d = {}
  try { d = JSON.parse(localStorage.getItem(OPSLAG) || '{}') || {} } catch (e) {}
  return { munten: d.munten || 0, open: Math.min(TS.LEVELS.length - 1, d.open || 0), sterren: d.sterren || {}, upgrades: d.upgrades || {},
    geluid: d.geluid !== false, snel: d.snel === 2 ? 2 : 1 }
})()
function bewaar() { try { localStorage.setItem(OPSLAG, JSON.stringify(D)) } catch (e) {} }

// ── tekenhulp ──
function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] }
function rgba(h, a) { var c = hex(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')' }
function tint(h, f) { var c = hex(h).map(function (v) { return Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)) }); return 'rgb(' + c.join(',') + ')' }
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
}
function blok(g, x, y, w, h, r, kleur) { g.fillStyle = kleur; rr(g, x, y, w, h, r); g.fill() }
function cirkel(g, x, y, r, kleur) { g.fillStyle = kleur; g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); g.fill() }
function ellips(g, x, y, rx, ry, kleur, rot) { g.fillStyle = kleur; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); g.fill() }
function lijn(g, x1, y1, x2, y2, kleur, b) { g.strokeStyle = kleur; g.lineWidth = b; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke() }
function veelhoek(g, pts, kleur) { g.fillStyle = kleur; g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill() }
function gloed(g, kleur, blur, fn) { g.save(); g.shadowColor = kleur; g.shadowBlur = blur; fn(); g.restore() }

// ── layout en camera: het veld is breder dan het scherm, je swipet naar de vijand ──
var dpr = 1, W = 0, H = 0, S = 1, OX = 0, OY = 0, dockH = 90, MARGE = 70, ZICHT_H = 420
var camX = -MARGE, camV = 0, sleep = null, toetsen = {}, geswiped = false
function meet() {
  dpr = Math.min(2, window.devicePixelRatio || 1)
  W = innerWidth; H = innerHeight
  cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr)
  dockH = ($('dock').offsetHeight || 80) + 14
  // zo groot mogelijk in de hoogte, maar je ziet altijd minstens 1000 breed en nooit meer dan het hele veld
  // op een lage telefoon minder lucht, zodat de soldaten groot genoeg blijven
  var klein = H < 500
  S = Math.max(W / (TS.B + 2 * MARGE), Math.min((H - dockH - (klein ? 52 : 92)) / (klein ? 300 : ZICHT_H), W / 1000))
  OY = H - dockH - (ONDER - 30) * S
  $('rij').style.bottom = dockH + 'px'
  zetCam(camX)
  lagen = null
}
window.addEventListener('resize', meet)
function camMax() { return TS.B + MARGE - W / S }
function zetCam(x) { camX = Math.max(-MARGE, Math.min(Math.max(-MARGE, camMax()), x)) }
function camOX() { return W / S >= TS.B + 2 * MARGE ? (W - TS.B * S) / 2 : -camX * S }
function camLinks() { return -camOX() / S }
function gepand() { if (!geswiped) { geswiped = true; $('swipe').classList.remove('aan') } }
cv.addEventListener('pointerdown', function (e) {
  if (!s) return
  sleep = { x: e.clientX, cam: camX, lx: e.clientX, lt: performance.now(), vx: 0 }; camV = 0
  try { cv.setPointerCapture(e.pointerId) } catch (er) {}
})
cv.addEventListener('pointermove', function (e) {
  if (!sleep) return
  var n = performance.now(), dt = Math.max(1, n - sleep.lt)
  zetCam(sleep.cam - (e.clientX - sleep.x) / S)
  sleep.vx = sleep.vx * 0.5 + 0.5 * (e.clientX - sleep.lx) / dt; sleep.lx = e.clientX; sleep.lt = n
  if (Math.abs(e.clientX - sleep.x) > 20) gepand()
})
function laatLos() { if (!sleep) return; if (performance.now() - sleep.lt < 80) camV = -sleep.vx * 1000 / S; sleep = null }
cv.addEventListener('pointerup', laatLos); cv.addEventListener('pointercancel', laatLos)
cv.addEventListener('wheel', function (e) { if (!s) return; e.preventDefault(); zetCam(camX + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / S); gepand() }, { passive: false })
document.addEventListener('keyup', function (e) { toetsen[e.key] = false })
function beweegCam(dt) {
  if (!s) return
  var k = (toetsen.ArrowRight || toetsen.d ? 1 : 0) - (toetsen.ArrowLeft || toetsen.a ? 1 : 0)
  if (k) { zetCam(camX + k * 900 * dt); camV = 0; gepand() }
  else if (!sleep && camV) { zetCam(camX + camV * dt); camV *= Math.pow(0.03, dt); if (Math.abs(camV) < 8) camV = 0 }
}
// minikaart bovenin: tik of sleep om erheen te gaan
var kaart = $('kaart'), kg = kaart.getContext('2d'), kaartSleep = false
function kaartNaar(e) { var r = kaart.getBoundingClientRect(), f = (e.clientX - r.left) / r.width; zetCam(-MARGE + f * (TS.B + 2 * MARGE) - W / S / 2); camV = 0; gepand() }
kaart.addEventListener('pointerdown', function (e) { kaartSleep = true; kaartNaar(e); try { kaart.setPointerCapture(e.pointerId) } catch (er) {} })
kaart.addEventListener('pointermove', function (e) { if (kaartSleep) kaartNaar(e) })
kaart.addEventListener('pointerup', function () { kaartSleep = false })
function tekenKaart() {
  var kw = kaart.clientWidth, kh = kaart.clientHeight
  if (!kw) return
  if (kaart.width !== Math.floor(kw * dpr) || kaart.height !== Math.floor(kh * dpr)) { kaart.width = Math.floor(kw * dpr); kaart.height = Math.floor(kh * dpr) }
  var g = kg; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, kw, kh)
  var f = kw / (TS.B + 2 * MARGE), X = function (x) { return (x + MARGE) * f }, gy = kh - 8
  blok(g, 0, 0, kw, kh, 9, 'rgba(8,10,30,.72)')
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(4, gy, kw - 8, 2)
  for (var k = 0; k < 2; k++) {
    var z = s.zij[k], bx = X(TS.BASIS[k]), hp = z.basis.hp / z.basis.max
    blok(g, bx - 8, gy - 16, 16, 16, 3, 'rgba(255,255,255,.18)')
    blok(g, bx - 8, gy - 16 * hp, 16, 16 * hp, 3, KLEUR[k])
  }
  s.eenheden.forEach(function (u) { cirkel(g, X(u.x), gy - 3 - (u.t === 2 ? 2 : 0), u.t === 2 ? 3.2 : 2.3, KLEUR[u.kant]) })
  s.effecten.forEach(function (fx) { if (fx.x != null) cirkel(g, X(fx.x), gy - 12, 3, '#ffc83d') })
  if (s.zij[0].houd) lijn(g, X(TS.HOUD_X + 20), gy - 14, X(TS.HOUD_X + 20), gy + 2, '#5bffa0', 2)
  var l = camLinks()
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.5; rr(g, Math.max(1, X(l)), 2, Math.min(kw - 2, (W / S) * f) - 2, kh - 4, 6); g.stroke()
}
// ── geluid ──
var AC = null
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)() } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC }
function toon(f, dur, type, vol, delay, f2) {
  if (!D.geluid) return
  var a = audio(); if (!a) return
  var t = a.currentTime + (delay || 0), o = a.createOscillator(), gn = a.createGain()
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur)
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol || 0.07, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(gn); gn.connect(a.destination); o.start(t); o.stop(t + dur + 0.02)
}
function ruis(dur, vol, laag, hoog, delay) {
  if (!D.geluid) return
  var a = audio(); if (!a) return
  var n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0)
  for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2)
  var src = a.createBufferSource(), f = a.createBiquadFilter(), gn = a.createGain(), t = a.currentTime + (delay || 0)
  f.type = 'bandpass'; f.frequency.setValueAtTime(hoog, t); f.frequency.exponentialRampToValueAtTime(laag, t + dur); f.Q.value = 0.8
  gn.gain.value = vol
  src.buffer = buf; src.connect(f); f.connect(gn); gn.connect(a.destination); src.start(t)
}
// veel soldaten tegelijk: niet elk geluid afspelen
var laatst = {}
function mag(soort, ms) { var n = performance.now(); if (laatst[soort] && n - laatst[soort] < ms) return false; laatst[soort] = n; return true }
var Geluid = {
  slag: function (e) { if (!mag('slag', 70)) return; if (e >= 3) toon(220, 0.08, 'square', 0.03, 0, 110); else ruis(0.08, 0.18, 400, 1600) },
  schot: function (e) {
    if (!mag('schot', 80)) return
    if (e === 0) ruis(0.12, 0.12, 900, 3000)
    else if (e === 1) toon(700, 0.1, 'triangle', 0.035, 0, 300)
    else if (e === 2) ruis(0.14, 0.22, 300, 2000)
    else toon(1200, 0.12, 'sawtooth', 0.025, 0, 500)
  },
  toren: function () { if (mag('toren', 120)) { toon(160, 0.14, 'sine', 0.07, 0, 70); ruis(0.1, 0.12, 300, 1400) } },
  dood: function () { if (mag('dood', 90)) toon(300, 0.16, 'triangle', 0.04, 0, 120) },
  basis: function () { if (mag('basis', 200)) { toon(90, 0.2, 'sine', 0.08, 0, 50); ruis(0.15, 0.2, 150, 700) } },
  koop: function () { toon(988, 0.06, 'square', 0.03); toon(1319, 0.1, 'triangle', 0.04, 0.05) },
  klaar: function () { [784, 988, 1175, 1568].forEach(function (f, i) { toon(f, 0.22, 'triangle', 0.05, i * 0.07) }) },
  nee: function () { toon(180, 0.12, 'square', 0.03) },
  bouw: function () { ruis(0.15, 0.2, 400, 1800); toon(523, 0.1, 'triangle', 0.05, 0.08); toon(784, 0.16, 'triangle', 0.05, 0.16) },
  tijdperk: function () { [392, 523, 659, 784, 1047].forEach(function (f, i) { toon(f, 0.4, 'triangle', 0.06, i * 0.09) }) },
  super: function () { toon(120, 0.9, 'sawtooth', 0.05, 0, 600); ruis(0.9, 0.25, 200, 2500) },
  knal: function () { if (mag('knal', 60)) { toon(70, 0.4, 'sine', 0.1, 0, 35); ruis(0.4, 0.35, 80, 900) } },
  mega: function () { toon(60, 1.2, 'sawtooth', 0.09, 0, 25); ruis(1.4, 0.6, 50, 700) },
  win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { toon(f, 0.32, 'triangle', 0.06, i * 0.1) }) },
  verlies: function () { [392, 330, 262, 196].forEach(function (f, i) { toon(f, 0.34, 'triangle', 0.06, i * 0.14) }) },
}
function tekenGeluidKnop() { $('golf').style.display = D.geluid ? '' : 'none' }
$('geluid').onclick = function (e) { e.stopPropagation(); D.geluid = !D.geluid; bewaar(); tekenGeluidKnop() }

// ── soldaten tekenen. Oorsprong bij de voeten, kijkend naar rechts. Tekenfilmstijl:
// grote hoofden, ogen met glans, armen en benen met ellebogen en knieën, licht en schaduw. ──
function verloop(g, x0, y0, x1, y1, kleur, licht, donker) {
  var l = g.createLinearGradient(x0, y0, x1, y1)
  l.addColorStop(0, tint(kleur, licht == null ? 0.3 : licht)); l.addColorStop(1, tint(kleur, donker == null ? -0.3 : donker))
  return l
}
// een arm- of beenstuk: dikker aan het begin, rond aan beide kanten
function ledemaat(g, x1, y1, x2, y2, d1, d2, vul) {
  var a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a)
  g.fillStyle = vul; g.beginPath()
  g.moveTo(x1 + nx * d1 / 2, y1 + ny * d1 / 2); g.lineTo(x2 + nx * d2 / 2, y2 + ny * d2 / 2)
  g.arc(x2, y2, d2 / 2, a + Math.PI / 2, a - Math.PI / 2, true)
  g.lineTo(x1 - nx * d1 / 2, y1 - ny * d1 / 2)
  g.arc(x1, y1, d1 / 2, a - Math.PI / 2, a + Math.PI / 2, true)
  g.fill()
}
function voetY(h, b) { return Math.cos(h) * 12 + Math.cos(h - b) * 12 }
function been(g, hx, hy, h, b, st, donker, dik) {
  var kx = hx + Math.sin(h) * 12, ky = hy + Math.cos(h) * 12
  var vx = kx + Math.sin(h - b) * 12, vy = ky + Math.cos(h - b) * 12
  var br = donker ? tint(st.broek, -0.28) : verloop(g, hx - 4, hy, hx + 6, vy, st.broek, 0.2, -0.25)
  var la = donker ? tint(st.laars, -0.3) : verloop(g, vx - 4, vy - 8, vx + 6, vy, st.laars, 0.25, -0.2)
  ledemaat(g, hx, hy, kx, ky, dik, dik * 0.88, br)
  ledemaat(g, kx, ky, vx, vy, dik * 0.88, dik * 0.8, br)
  if (st.robot) { cirkel(g, kx, ky, dik * 0.55, donker ? '#3a4258' : '#5a647c'); cirkel(g, kx - 0.6, ky - 0.6, dik * 0.25, 'rgba(255,255,255,.35)') }
  // laars
  var ax = kx + Math.sin(h - b) * 6, ay = ky + Math.cos(h - b) * 6
  ledemaat(g, ax, ay, vx, vy - 1, dik * 0.95, dik * 0.95, la)
  g.fillStyle = la; rr(g, vx - 3.5, vy - 4.2, 11.5, 5.6, 2.8); g.fill()
  g.fillStyle = donker ? 'rgba(0,0,0,.35)' : tint(st.laars, -0.45); rr(g, vx - 3.5, vy, 11.8, 1.8, 0.9); g.fill()
}
function armDeel(g, sx, sy, th, buig, kl, hand, dik) {
  var ex = sx + Math.sin(th) * 10, ey = sy + Math.cos(th) * 10
  var hx = ex + Math.sin(th + buig) * 10, hy = ey + Math.cos(th + buig) * 10
  ledemaat(g, sx, sy, ex, ey, dik, dik * 0.9, kl)
  ledemaat(g, ex, ey, hx, hy, dik * 0.9, dik * 0.78, kl)
  cirkel(g, hx, hy, dik * 0.62, hand)
  cirkel(g, hx - 0.8, hy - 0.8, dik * 0.25, 'rgba(255,255,255,.25)')
  return [hx, hy, th + buig]
}
function oog(g, x, y, kl) {
  ellips(g, x, y, 3.4, 4.3, '#ffffff')
  cirkel(g, x + 1.2, y + 0.5, 2.4, kl || '#1a1030'); cirkel(g, x + 1.4, y + 0.7, 1.2, '#000')
  cirkel(g, x + 1.9, y - 0.9, 0.95, '#ffffff')
}
function gezicht(g, x, y, huid, boos) {
  ellips(g, x - 6, y + 1, 3.2, 4, tint(huid, -0.15))
  var hg = g.createRadialGradient(x + 4, y - 6, 2, x, y, 14)
  hg.addColorStop(0, tint(huid, 0.28)); hg.addColorStop(1, tint(huid, -0.2))
  g.fillStyle = hg; g.beginPath(); g.arc(x, y, 13, 0, TAU); g.fill()
  ellips(g, x + 6.5, y + 5, 3.2, 2, 'rgba(255,100,110,.35)')
  oog(g, x + 6.5, y - 1)
  g.strokeStyle = '#2a1a14'; g.lineWidth = 1.9; g.lineCap = 'round'
  g.beginPath(); g.moveTo(x + 2.5, y - (boos ? 7.8 : 7)); g.lineTo(x + 10, y - (boos ? 5.2 : 6.6)); g.stroke()
  g.strokeStyle = '#6a2a24'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x + 6.5, y + 7); g.quadraticCurveTo(x + 9, y + 8.3, x + 11.2, y + 6.2); g.stroke()
  cirkel(g, x + 12.4, y + 2.4, 1.2, tint(huid, -0.18))
}

var STIJL = [
  [{ huid: '#d9955f', shirt: '#8a5a2e', broek: '#c98a5a', laars: '#5a3a1e', hoofd: 'haar', wapen: 'knots', romp: 'vacht', blootarm: true },
   { huid: '#e2a272', shirt: '#a8743e', broek: '#d39a6a', laars: '#5a3a1e', hoofd: 'hoofdband', wapen: 'slinger', romp: 'vacht', blootarm: true }],
  [{ huid: '#f0c09a', shirt: '#b8c0d4', broek: '#7a829c', laars: '#3a3f52', hoofd: 'helm', wapen: 'zwaard', romp: 'harnas', schild: true },
   { huid: '#f0c09a', shirt: '#3c8a4a', broek: '#6a5a3a', laars: '#3a2a1a', hoofd: 'hoed', wapen: 'boog', romp: 'tuniek', koker: true }],
  [{ huid: '#e2aa80', shirt: '#f4f2f8', broek: '#2a3c6a', laars: '#2a1e16', hoofd: 'bandana', wapen: 'sabel', romp: 'streep' },
   { huid: '#e2aa80', shirt: '#2a3c78', broek: '#e8e2d0', laars: '#1e1a26', hoofd: 'steek', wapen: 'musket', romp: 'jas' }],
  [{ huid: '#a8b2c8', shirt: '#8a94ac', broek: '#6a748c', laars: '#3a4258', hoofd: 'robot', wapen: 'vuist', romp: 'robot', robot: true },
   { huid: '#b8c2d8', shirt: '#7a849c', broek: '#5a647c', laars: '#2e3446', hoofd: 'robot2', wapen: 'laser', romp: 'robot', robot: true }],
  [{ huid: '#f0c09a', shirt: '#eef2fc', broek: '#d6dcee', laars: '#9aa4c0', hoofd: 'ruimtehelm', wapen: 'lichtzwaard', romp: 'pak', rugzak: true },
   { huid: '#c89070', shirt: '#e6eaf6', broek: '#c8d0e4', laars: '#8a94b0', hoofd: 'ruimtehelm', wapen: 'plasma', romp: 'pak', rugzak: true }],
]
var KAPITEIN = { huid: '#e2aa80', shirt: '#9a1e34', broek: '#2a2030', laars: '#1a1218', hoofd: 'kapitein', wapen: 'sabel', romp: 'kapitein' }
var AFSTAND = { slinger: 1, boog: 1, musket: 1, laser: 1, plasma: 1 }

function rompPad(g) {
  g.beginPath(); g.moveTo(-10, -50); g.quadraticCurveTo(0, -53.5, 10.5, -50); g.quadraticCurveTo(13.5, -47, 12.5, -40)
  g.lineTo(10.5, -23); g.quadraticCurveTo(0, -20.5, -10, -23); g.lineTo(-12, -40); g.quadraticCurveTo(-13, -47, -10, -50); g.closePath()
}
function romp(g, st, team) {
  var r = st.romp
  rompPad(g)
  g.fillStyle = verloop(g, -12, -53, 12, -21, r === 'vacht' ? st.huid : st.shirt, 0.28, -0.28); g.fill()
  g.save(); rompPad(g); g.clip()
  if (r === 'vacht') {
    veelhoek(g, [-13, -46, 3, -54, 14, -41, 14, -21, 9, -17, 6, -21, 2, -16, -2, -21, -6, -16, -9, -21, -13, -18], st.shirt)
    g.fillStyle = verloop(g, -12, -50, 12, -18, st.shirt, 0.2, -0.3); g.fill()
    ;[[-5, -38], [4, -31], [6, -44], [-6, -27]].forEach(function (v) { ellips(g, v[0], v[1], 2.6, 1.8, tint(st.shirt, -0.38)) })
    lijn(g, -13, -46, 3, -54, tint(st.shirt, -0.35), 1.5)
  } else if (r === 'harnas') {
    ellips(g, 3, -42, 8, 7, 'rgba(255,255,255,.35)')
    blok(g, -4.5, -48, 9, 30, 2, team); veelhoek(g, [-4.5, -20, 0, -16, 4.5, -20], team)
    lijn(g, -4.5, -48, -4.5, -20, tint(team, -0.35), 1.2); lijn(g, 0, -44, 0, -24, '#ffffff', 1.3); lijn(g, -3, -36, 3, -36, '#ffffff', 1.3)
    blok(g, -13, -29, 26, 4, 1, '#5a3a22'); blok(g, -1.5, -29.5, 4, 5, 1, '#ffc83d')
  } else if (r === 'tuniek') {
    veelhoek(g, [-3, -52, 3, -43, 9, -52], '#e8d0a8')
    blok(g, -13, -30, 26, 4, 1, '#5a3a22'); blok(g, 2, -30.5, 4.5, 5, 1, '#ffc83d')
    blok(g, -9, -27, 6, 6, 2, '#6a4428')
  } else if (r === 'streep') {
    for (var i = 0; i < 5; i++) blok(g, -14, -49 + i * 6, 28, 2.6, 1, team)
    veelhoek(g, [-14, -52, -6, -52, -7, -20, -14, -20], '#2a2030'); veelhoek(g, [14, -52, 8, -52, 9, -20, 14, -20], '#2a2030')
    blok(g, -14, -28, 28, 5, 2, '#c8283a')
  } else if (r === 'jas') {
    veelhoek(g, [-4, -52, 1, -40, 6, -52], '#f4f2f8')
    lijn(g, -10, -50, 10, -24, '#f4f2f8', 2.6); lijn(g, 10, -50, -10, -24, '#f4f2f8', 2.6)
    for (i = 0; i < 4; i++) cirkel(g, 7, -46 + i * 6, 1.3, '#ffc83d')
    blok(g, -13, -50, 26, 3, 1, team)
  } else if (r === 'kapitein') {
    veelhoek(g, [-3, -53, 1, -40, 5, -53], '#f4f2f8')
    lijn(g, 1, -40, 1, -20, '#ffc83d', 1.6)
    for (i = 0; i < 4; i++) { cirkel(g, -3, -45 + i * 6, 1.3, '#ffc83d'); cirkel(g, 5, -45 + i * 6, 1.3, '#ffc83d') }
    blok(g, -14, -28, 28, 4.5, 1, '#2a1a12'); blok(g, -2.5, -29, 6, 6.5, 1.2, '#ffc83d'); blok(g, -1, -27.5, 3, 3.5, 0.6, '#2a1a12')
  } else if (r === 'robot') {
    blok(g, -7, -46, 15, 14, 3, tint(st.shirt, -0.25)); blok(g, -7, -46, 15, 3, 1.5, 'rgba(255,255,255,.18)')
    gloed(g, team, 8, function () { cirkel(g, 0.5, -39, 3.6, team) }); cirkel(g, 0, -40, 1.3, '#ffffff')
    for (i = 0; i < 3; i++) blok(g, -7 + i * 5.5, -29, 4, 4, 1, tint(st.shirt, -0.35))
    ;[[-9, -48], [9, -48], [-9, -26], [9, -26]].forEach(function (b) { cirkel(g, b[0], b[1], 1, 'rgba(255,255,255,.4)') })
  } else if (r === 'pak') {
    blok(g, -14, -38, 28, 4, 1, team); blok(g, -14, -26, 28, 3, 1, tint(st.shirt, -0.25))
    gloed(g, team, 8, function () { blok(g, 3, -48, 6, 5, 2, team) })
    blok(g, -6, -47, 6, 3, 1, '#9aa4c0')
  }
  g.restore()
  if (r === 'jas' || r === 'kapitein') {
    // jaspanden over de heupen
    veelhoek(g, [-11, -25, -14, -10, -4, -13, -2, -23], tint(st.shirt, -0.2))
    veelhoek(g, [11, -25, 13, -12, 5, -14, 3, -23], tint(st.shirt, -0.08))
    if (r === 'kapitein') { lijn(g, -14, -10, -4, -13, '#ffc83d', 1.2); lijn(g, 13, -12, 5, -14, '#ffc83d', 1.2) }
  }
  if (r === 'robot') { ellips(g, 3, -48, 7.5, 5, verloop(g, -3, -53, 8, -43, st.huid, 0.35, -0.2)); cirkel(g, 3, -48, 1.2, 'rgba(255,255,255,.5)') }
}

function hoofd(g, st, team, x, y) {
  var h = st.hoofd
  if (h === 'robot' || h === 'robot2') {
    lijn(g, x - 2, y - 11, x - 4, y - 21, '#6a748c', 2.2)
    gloed(g, team, 10, function () { cirkel(g, x - 4, y - 22.5, 3, team) }); cirkel(g, x - 4.8, y - 23.3, 1, '#ffffff')
    g.fillStyle = verloop(g, x - 12, y - 12, x + 12, y + 12, st.huid, 0.35, -0.3); rr(g, x - 12, y - 12, 25, 24, 7); g.fill()
    blok(g, x - 12, y - 12, 25, 5, 4, 'rgba(255,255,255,.18)')
    cirkel(g, x - 9, y + 1, 3.4, tint(st.huid, -0.35)); cirkel(g, x - 9, y + 1, 1.4, '#ffffff')
    if (h === 'robot') {
      blok(g, x - 3, y - 5, 16, 8, 3.5, '#141826')
      gloed(g, team, 12, function () { blok(g, x - 1, y - 3, 12, 4, 2, team) }); blok(g, x + 1, y - 3, 4, 1.5, 0.7, '#ffffff')
    } else {
      cirkel(g, x + 6, y - 1, 6.5, '#141826')
      gloed(g, team, 12, function () { cirkel(g, x + 6.5, y - 1, 4, team) }); cirkel(g, x + 8, y - 2.6, 1.4, '#ffffff')
    }
    for (var i = 0; i < 3; i++) lijn(g, x + 3 + i * 3, y + 6.5, x + 3 + i * 3, y + 9.5, '#3a4258', 1.4)
    return
  }
  if (h === 'ruimtehelm') {
    blok(g, x - 10, y + 9, 22, 6, 3, '#9aa4c0')
    gezicht(g, x, y + 1, st.huid)
    g.fillStyle = '#3a2414'; g.beginPath(); g.arc(x, y - 1, 13.2, Math.PI * 1.1, Math.PI * 1.75); g.quadraticCurveTo(x, y - 9, x - 12, y - 4); g.fill()
    var hg = g.createRadialGradient(x + 5, y - 8, 2, x, y, 17)
    hg.addColorStop(0, 'rgba(255,255,255,.4)'); hg.addColorStop(0.5, rgba(team, 0.12)); hg.addColorStop(1, rgba(team, 0.35))
    g.fillStyle = hg; g.beginPath(); g.arc(x, y, 17, 0, TAU); g.fill()
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, 17, 0, TAU); g.stroke()
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.2; g.beginPath(); g.arc(x, y, 13, Math.PI * 1.2, Math.PI * 1.55); g.stroke()
    return
  }
  if (h === 'helm') {
    // grote ridderhelm met pluim
    ;[0, 1, 2].forEach(function (i) {
      g.fillStyle = i === 1 ? tint(team, 0.25) : team; g.beginPath(); g.moveTo(x - 2, y - 13)
      g.quadraticCurveTo(x - 10 - i * 3, y - 30 + i * 3, x - 22 - i * 2, y - 16 + i * 5); g.quadraticCurveTo(x - 10, y - 18, x + 2, y - 11); g.fill()
    })
    g.fillStyle = verloop(g, x - 13, y - 14, x + 14, y + 14, '#c8d0e4', 0.35, -0.35)
    g.beginPath(); g.moveTo(x - 13, y + 13); g.lineTo(x - 13, y - 4); g.quadraticCurveTo(x - 12, y - 15, x + 1, y - 15); g.quadraticCurveTo(x + 14, y - 14, x + 14, y - 2); g.lineTo(x + 14, y + 13); g.closePath(); g.fill()
    lijn(g, x + 1, y - 15, x + 2, y + 12, 'rgba(255,255,255,.4)', 1.4)
    blok(g, x + 2, y - 3, 12.5, 3.4, 1.5, '#141020'); blok(g, x + 4, y + 3, 9, 1.6, 0.8, '#141020')
    for (var j = 0; j < 3; j++) cirkel(g, x + 6 + j * 2.6, y + 7.5, 0.8, '#141020')
    ellips(g, x - 6, y - 8, 4, 2.5, 'rgba(255,255,255,.4)', -0.5)
    return
  }
  gezicht(g, x, y, st.huid, h === 'haar' || h === 'bandana' || h === 'kapitein')
  if (h === 'haar' || h === 'hoofdband') {
    var hk = h === 'haar' ? '#3a2414' : '#5a3418'
    g.fillStyle = verloop(g, x - 14, y - 16, x + 10, y + 4, hk, 0.25, -0.2); g.beginPath()
    g.moveTo(x - 13, y + 8); g.lineTo(x - 15, y - 2)
    var punten = h === 'haar' ? [[-16, -10], [-10, -13], [-12, -20], [-4, -15], [-3, -22], [3, -15], [8, -20], [9, -12], [14, -11], [11, -6]] : [[-14, -10], [-8, -14], [-2, -16], [5, -15], [11, -11], [12, -6]]
    punten.forEach(function (pt) { g.lineTo(x + pt[0], y + pt[1]) })
    g.quadraticCurveTo(x + 2, y - 8, x - 4, y - 4); g.lineTo(x - 6, y + 5); g.closePath(); g.fill()
    if (h === 'haar') {
      ellips(g, x + 10, y + 10, 5, 3.5, 'rgba(58,36,20,.45)')
      lijn(g, x - 6, y - 17, x + 4, y - 19, '#f0e6d0', 2.4); cirkel(g, x - 7, y - 17.5, 1.8, '#f0e6d0'); cirkel(g, x + 5, y - 19.5, 1.8, '#f0e6d0')
    } else {
      blok(g, x - 13, y - 8, 26, 3.6, 1.6, team)
      g.fillStyle = team; g.beginPath(); g.moveTo(x - 12, y - 8); g.quadraticCurveTo(x - 22, y - 22, x - 14, y - 32); g.quadraticCurveTo(x - 12, y - 20, x - 9, y - 8); g.fill()
      lijn(g, x - 11, y - 10, x - 15, y - 28, tint(team, -0.3), 1)
    }
  } else if (h === 'hoed') {
    ellips(g, x - 8, y + 2, 5, 9, '#6a4422')
    g.fillStyle = verloop(g, x - 16, y - 24, x + 14, y - 4, '#3c8a4a', 0.3, -0.25); g.beginPath()
    g.moveTo(x - 15, y - 4); g.quadraticCurveTo(x - 6, y - 10, x + 15, y - 6); g.quadraticCurveTo(x + 6, y - 16, x - 4, y - 18); g.quadraticCurveTo(x - 14, y - 26, x - 22, y - 22); g.quadraticCurveTo(x - 14, y - 16, x - 15, y - 4); g.fill()
    lijn(g, x - 14, y - 6, x + 14, y - 7, '#2a5a32', 2)
    g.fillStyle = team; g.beginPath(); g.moveTo(x - 6, y - 10); g.quadraticCurveTo(x - 12, y - 30, x - 2, y - 36); g.quadraticCurveTo(x - 4, y - 24, x - 3, y - 10); g.fill()
  } else if (h === 'bandana') {
    g.fillStyle = verloop(g, x - 13, y - 14, x + 13, y - 2, team, 0.3, -0.25); g.beginPath(); g.arc(x, y - 1, 13.6, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fill()
    for (var d = 0; d < 4; d++) cirkel(g, x - 6 + d * 4.5, y - 7 - (d % 2) * 3, 1.2, 'rgba(255,255,255,.8)')
    veelhoek(g, [x - 12, y - 4, x - 22, y - 1, x - 19, y - 7], team); veelhoek(g, [x - 12, y - 4, x - 20, y + 6, x - 15, y + 5], tint(team, -0.2))
    ellips(g, x + 7, y + 7, 7, 4.5, 'rgba(40,24,14,.35)')
    cirkel(g, x - 6, y + 6, 1.8, '#ffc83d')
  } else if (h === 'steek' || h === 'kapitein') {
    ellips(g, x - 11, y + 3, 4, 6, '#3a2414')
    if (h === 'kapitein') {
      g.fillStyle = '#1a1018'; g.beginPath(); g.moveTo(x - 4, y + 4); g.quadraticCurveTo(x + 8, y + 18, x + 14, y + 4); g.quadraticCurveTo(x + 10, y + 9, x + 4, y + 8); g.fill()
      lijn(g, x + 4, y + 5.5, x + 12, y + 4.5, '#1a1018', 2.2)
    }
    var w2 = h === 'kapitein' ? 1.2 : 1
    g.fillStyle = verloop(g, x - 18, y - 22, x + 16, y - 4, '#2a2436', 0.25, -0.3); g.beginPath()
    g.moveTo(x - 17 * w2, y - 5); g.quadraticCurveTo(x, y - 11, x + 16 * w2, y - 6); g.lineTo(x + 9 * w2, y - 21 * w2); g.quadraticCurveTo(x, y - 14 * w2, x - 9 * w2, y - 22 * w2); g.closePath(); g.fill()
    g.strokeStyle = '#ffc83d'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - 17 * w2, y - 5); g.quadraticCurveTo(x, y - 11, x + 16 * w2, y - 6); g.stroke()
    gloed(g, team, 6, function () { cirkel(g, x + 2, y - 11, 2.6, team) })
    if (h === 'kapitein') { g.fillStyle = team; g.beginPath(); g.moveTo(x - 6, y - 14); g.quadraticCurveTo(x - 24, y - 34, x - 30, y - 16); g.quadraticCurveTo(x - 20, y - 22, x - 6, y - 12); g.fill() }
  }
}

// wapens worden getekend langs de +x-as vanuit de hand
function wapen(g, st, team, hand, slag) {
  var w = st.wapen
  g.save(); g.translate(hand[0], hand[1]); g.rotate(Math.PI / 2 - (AFSTAND[w] ? Math.PI / 2 : hand[2]))
  if (w === 'knots') {
    g.fillStyle = verloop(g, 0, -6, 0, 6, '#8a5a2e', 0.3, -0.35); g.beginPath()
    g.moveTo(-3, -2); g.lineTo(12, -3.5); g.quadraticCurveTo(26, -9, 30, -2); g.quadraticCurveTo(30, 6, 14, 3.5); g.lineTo(-3, 2); g.closePath(); g.fill()
    ;[[18, -6], [25, -6.5], [27, 3], [20, 4]].forEach(function (b) { cirkel(g, b[0], b[1], 1.8, '#6a4422') })
    lijn(g, 4, -0.5, 16, -1.5, 'rgba(255,255,255,.25)', 1)
  } else if (w === 'slinger') {
    var a = slag > 0 ? -slag * 20 : 0.6
    var px = Math.cos(a) * 12, py = -6 + Math.sin(a) * 12
    lijn(g, 0, 0, px, py, '#c8a878', 1.4); cirkel(g, px, py, 3.4, '#8a8494'); cirkel(g, px - 1, py - 1, 1.2, '#c8c4d0')
  } else if (w === 'zwaard' || w === 'sabel') {
    lijn(g, -4, 0, 2, 0, '#5a3a22', 3.4); cirkel(g, -5, 0, 2.2, '#ffc83d')
    blok(g, 1.5, -5.5, 3, 11, 1.4, '#ffc83d')
    g.fillStyle = verloop(g, 0, -3, 0, 3, '#e8ecf8', 0.4, -0.25); g.beginPath()
    if (w === 'zwaard') { g.moveTo(4, -2.2); g.lineTo(28, -2.2); g.lineTo(32, 0); g.lineTo(28, 2.2); g.lineTo(4, 2.2) }
    else { g.moveTo(4, -2); g.quadraticCurveTo(18, -4, 28, -9); g.quadraticCurveTo(22, 0, 4, 2.4) }
    g.closePath(); g.fill()
    lijn(g, 6, -0.6, w === 'zwaard' ? 27 : 22, w === 'zwaard' ? -0.6 : -4, 'rgba(255,255,255,.8)', 0.9)
    if (w === 'sabel') { g.strokeStyle = '#ffc83d'; g.lineWidth = 1.4; g.beginPath(); g.arc(1, 2, 5.5, -0.3, 1.9); g.stroke() }
  } else if (w === 'lichtzwaard') {
    g.fillStyle = verloop(g, 0, -3, 0, 3, '#9aa4bc', 0.4, -0.3); rr(g, -4, -2.6, 11, 5.2, 1.6); g.fill()
    for (var i = 0; i < 3; i++) lijn(g, -2 + i * 2.5, -2.6, -2 + i * 2.5, 2.6, '#3a4258', 1)
    gloed(g, team, 16, function () { blok(g, 7, -2.6, 28, 5.2, 2.6, team) })
    blok(g, 7, -1.1, 27, 2.2, 1.1, '#ffffff')
  } else if (w === 'vuist') {
    g.fillStyle = verloop(g, -6, -7, 6, 7, '#7a849c', 0.35, -0.3); rr(g, -5, -7, 13, 14, 4); g.fill()
    for (i = 0; i < 3; i++) lijn(g, 7, -4.5 + i * 4.5, 3, -4.5 + i * 4.5, '#3a4258', 1.2)
    gloed(g, team, 8, function () { blok(g, -4, -1, 4, 2, 1, team) })
  } else if (w === 'boog') {
    g.strokeStyle = verloop(g, 0, -18, 0, 18, '#8a5a2e', 0.3, -0.35); g.lineWidth = 3.2
    g.beginPath(); g.moveTo(-3, -17); g.quadraticCurveTo(9, -10, 3, 0); g.quadraticCurveTo(9, 10, -3, 17); g.stroke()
    var tr = slag > 0 ? 0 : 7
    lijn(g, -3, -17, -3 - tr, 0, '#f0ead8', 0.9); lijn(g, -3 - tr, 0, -3, 17, '#f0ead8', 0.9)
    if (!slag) { lijn(g, -10, 0, 16, 0, '#c8a878', 1.6); veelhoek(g, [16, -2, 20, 0, 16, 2], '#e8ecf8'); veelhoek(g, [-11, 0, -7, -3, -5, 0], team); veelhoek(g, [-11, 0, -7, 3, -5, 0], tint(team, -0.2)) }
  } else if (w === 'musket') {
    g.fillStyle = verloop(g, 0, -4, 0, 5, '#7a4a22', 0.3, -0.35); g.beginPath()
    g.moveTo(-14, 1); g.lineTo(-12, -3.5); g.lineTo(10, -2.5); g.lineTo(10, 2.2); g.lineTo(-4, 2.2); g.lineTo(-13, 6); g.closePath(); g.fill()
    g.fillStyle = verloop(g, 0, -3, 0, 1, '#5a5a6a', 0.4, -0.3); rr(g, 2, -3.6, 32, 2.8, 1.2); g.fill()
    blok(g, 6, -4, 2, 6.4, 0.6, '#c8a050'); blok(g, 20, -4, 2, 3.6, 0.6, '#c8a050')
    lijn(g, 4, -3, 33, -3, 'rgba(255,255,255,.35)', 0.6)
  } else if (w === 'laser') {
    g.fillStyle = verloop(g, 0, -6, 0, 6, '#6a748c', 0.35, -0.3); rr(g, -6, -5, 26, 10, 3.5); g.fill()
    blok(g, -2, 3, 6, 8, 2, '#4a546c')
    gloed(g, team, 12, function () { for (var j = 0; j < 3; j++) blok(g, 6 + j * 4.5, -5.5, 2.2, 11, 1, team) })
    blok(g, 19, -2.5, 8, 5, 2, '#3a4258'); gloed(g, team, 10, function () { cirkel(g, 27, 0, 2.2, team) })
  } else if (w === 'plasma') {
    g.fillStyle = verloop(g, 0, -6, 0, 6, '#e8ecf8', 0.3, -0.3); g.beginPath()
    g.moveTo(-10, 4); g.lineTo(-8, -4); g.lineTo(22, -4); g.lineTo(30, -1.5); g.lineTo(30, 2); g.lineTo(4, 3); g.lineTo(-2, 8); g.closePath(); g.fill()
    blok(g, 0, -8, 12, 4, 2, '#7a84a0'); gloed(g, team, 6, function () { cirkel(g, 11, -6, 1.4, team) })
    gloed(g, team, 14, function () { blok(g, 4, -2.5, 14, 4, 2, team) })
    gloed(g, team, 12, function () { cirkel(g, 31, 0.2, 3, team) }); cirkel(g, 31, 0.2, 1.2, '#ffffff')
  }
  g.restore()
}

function schild(g, team) {
  g.save(); g.translate(5, -38)
  var pad = function () { g.beginPath(); g.moveTo(-8, -11); g.quadraticCurveTo(0, -14, 8, -11); g.lineTo(8, 1); g.quadraticCurveTo(7, 10, 0, 14); g.quadraticCurveTo(-7, 10, -8, 1); g.closePath() }
  pad(); g.fillStyle = verloop(g, -8, -12, 8, 14, '#c8d0e4', 0.3, -0.3); g.fill()
  g.save(); g.scale(0.78, 0.78); pad(); g.fillStyle = verloop(g, -8, -12, 8, 14, team, 0.25, -0.3); g.fill(); g.restore()
  lijn(g, 0, -7, 0, 8, '#ffffff', 2); lijn(g, -4.5, -2, 4.5, -2, '#ffffff', 2)
  ellips(g, -3, -6, 2.5, 4, 'rgba(255,255,255,.35)', 0.3)
  g.restore()
}

function mens(g, st, team, fase, slag, staat, schaal, zonderWapen) {
  g.save(); g.scale(schaal, schaal)
  var loopt = staat === 'loop', ph = fase * 9, p = slag / 0.3, ranged = AFSTAND[st.wapen]
  var hA = loopt ? Math.sin(ph) * 0.55 : 0.12, hB = loopt ? -Math.sin(ph) * 0.55 : -0.14
  var kA = loopt ? Math.max(0, -Math.cos(ph)) * 0.95 : 0.1, kB = loopt ? Math.max(0, Math.cos(ph)) * 0.95 : 0.1
  g.translate(0, 24 - Math.max(voetY(hA, kA), voetY(hB, kB)))
  var dik = st.robot ? 7.6 : 6.6, armKl = st.blootarm ? st.huid : st.shirt
  var handKl = st.robot ? tint(st.huid, -0.1) : st.romp === 'harnas' ? '#9aa4bc' : st.romp === 'pak' ? '#dfe4f2' : st.huid
  // achterkant: pijlenkoker of jetpack
  if (st.koker) {
    g.save(); g.translate(-9, -40); g.rotate(-0.35)
    g.fillStyle = verloop(g, -4, -12, 4, 12, '#7a4a22', 0.25, -0.35); rr(g, -4, -12, 8, 24, 3); g.fill()
    for (var i = 0; i < 3; i++) { lijn(g, -2 + i * 2, -12, -2 + i * 2, -17, '#c8a878', 1.2); veelhoek(g, [-3 + i * 2, -17, -2 + i * 2, -22, -1 + i * 2, -17], team) }
    g.restore()
  }
  if (st.rugzak) {
    g.fillStyle = verloop(g, -18, -50, -8, -26, '#b8c0d8', 0.3, -0.3); rr(g, -19, -50, 11, 24, 4); g.fill()
    blok(g, -18, -27, 8, 5, 2, '#5a647c'); gloed(g, team, 10, function () { cirkel(g, -14, -43, 2, team) })
  }
  // achterarm en achterbeen, iets donkerder
  var thB = ranged ? 1.35 : loopt ? 0.3 - Math.sin(ph) * 0.5 : 0.7, bB = ranged ? 0.3 : 0.55
  armDeel(g, -2, -46, thB, bB, tint(armKl, -0.3), tint(handKl, -0.25), dik * 0.95)
  been(g, -2, -24, hB, kB, st, true, dik)
  been(g, 2, -24, hA, kA, st, false, dik)
  romp(g, st, team)
  hoofd(g, st, team, 2, -62)
  if (st.schild) schild(g, team)
  var th, bu
  if (ranged) { th = 1.25 - (slag > 0 ? p * 0.22 : 0); bu = 0.3 }
  // klaar om te slaan: wapen schuin omhoog voor het lijf, bij een klap even omlaag
  else if (staat !== 'loop') { th = slag > 0 ? 1.0 + (1 - p) * 0.5 : 1.5; bu = slag > 0 ? 0.1 + (1 - p) * 0.6 : 0.7 }
  else { th = 0.3 + Math.sin(ph) * 0.5; bu = 0.55 }
  var hand = armDeel(g, 2, -45, th, bu, verloop(g, 0, -48, 10, -30, armKl, 0.25, -0.2), handKl, dik)
  if (!zonderWapen) wapen(g, st, team, hand, slag)
  g.restore()
  return hand
}

function poten(g, x, y, fase, len, kleur, dik, n) {
  for (var i = 0; i < n; i++) {
    var a = Math.sin(fase * 9 + i * Math.PI * 0.5) * 0.45
    ledemaat(g, x[i], y, x[i] + Math.sin(a) * len, y + Math.cos(a) * len, dik, dik * 0.85, i % 2 ? tint(kleur, -0.25) : kleur)
  }
}
// dierpoot in twee stukken met een hoef of teen
function dierpoot(g, x, y, fase, len, kl, dik, voor, hoef) {
  var a = Math.sin(fase) * 0.5, b = Math.max(0, Math.cos(fase)) * 0.8 * (voor ? -1 : 1)
  var kx = x + Math.sin(a) * len * 0.5, ky = y + Math.cos(a) * len * 0.5
  var vx = kx + Math.sin(a - b) * len * 0.5, vy = ky + Math.cos(a - b) * len * 0.5
  ledemaat(g, x, y, kx, ky, dik, dik * 0.75, kl); ledemaat(g, kx, ky, vx, vy, dik * 0.75, dik * 0.6, kl)
  g.fillStyle = hoef; rr(g, vx - dik * 0.45, vy - 3, dik * 0.95, 4, 1.6); g.fill()
}
function zwaar(g, e, team, fase, slag, staat) {
  var loopt = staat === 'loop', f = loopt ? fase * 9 : 0, p = slag / 0.3
  if (e === 0) {
    // triceratops met holbewoner
    var dk = '#5a8a44', bob = loopt ? Math.abs(Math.sin(f)) * 2 : 0
    g.save(); g.translate(-6, -35 - bob); mens(g, STIJL[0][0], team, 0, slag, 'vecht', 0.72); g.restore()
    g.translate(0, -bob)
    ;[[-22, 0.5, 0], [14, 0.5, 2]].forEach(function (pt) { dierpoot(g, pt[0], -30, f + pt[2] + Math.PI, 30, tint(dk, -0.3), 11, pt[0] > 0, '#2a3a20') })
    g.fillStyle = verloop(g, -40, -40, -60, -26, dk, 0.1, -0.3); g.beginPath(); g.moveTo(-26, -46); g.quadraticCurveTo(-50, -44, -64, -30); g.quadraticCurveTo(-46, -34, -26, -30); g.fill()
    g.fillStyle = verloop(g, -30, -64, 20, -18, dk, 0.3, -0.3); g.beginPath(); g.ellipse(0, -41, 34, 21, 0, 0, TAU); g.fill()
    ellips(g, 0, -28, 28, 8, tint(dk, 0.35))
    ;[[-14, -52, 4], [0, -56, 3.5], [12, -50, 3], [-22, -40, 3]].forEach(function (v) { ellips(g, v[0], v[1], v[2] + 1, v[2], tint(dk, -0.25)) })
    ;[[-18, 0], [18, 2]].forEach(function (pt) { dierpoot(g, pt[0], -30, f + pt[1], 30, dk, 12, pt[0] > 0, '#2a3a20') })
    var kx = 34 + p * 6
    // kraag met teamkleur
    g.fillStyle = verloop(g, kx - 16, -76, kx + 8, -36, '#d89a5a', 0.3, -0.25); g.beginPath(); g.ellipse(kx - 2, -54, 15, 22, -0.4, 0, TAU); g.fill()
    for (var i = 0; i < 5; i++) { var a2 = -2.2 + i * 0.45; cirkel(g, kx - 2 + Math.cos(a2) * 16, -54 + Math.sin(a2) * 19, 2.6, team) }
    g.fillStyle = verloop(g, kx - 6, -50, kx + 22, -30, dk, 0.3, -0.25); g.beginPath(); g.ellipse(kx + 9, -40, 16, 11.5, 0.1, 0, TAU); g.fill()
    var hoorn = function (x1, y1, x2, y2, d) { g.fillStyle = verloop(g, x1, y1, x2, y2, '#f6eedc', 0.2, -0.3); g.beginPath(); g.moveTo(x1, y1 - d); g.lineTo(x2, y2); g.lineTo(x1, y1 + d); g.closePath(); g.fill() }
    hoorn(kx + 4, -49, kx + 28, -64, 3); hoorn(kx + 13, -45, kx + 36, -54, 2.6); hoorn(kx + 21, -38, kx + 30, -41, 2)
    oog(g, kx + 10, -44); lijn(g, kx + 7, -49, kx + 13, -48.5, '#1a2a14', 1.6)
    cirkel(g, kx + 23, -37, 1.3, '#1a2a14'); lijn(g, kx + 14, -33, kx + 22, -32, '#1a2a14', 1.3)
  } else if (e === 1) {
    // ridder te paard met lans
    var pk = '#9a6038', ph2 = f, bob2 = loopt ? Math.abs(Math.sin(f)) * 2.5 : 0
    g.translate(0, -bob2)
    var hand = null
    g.save(); g.translate(-4, -46); hand = mens(g, STIJL[1][0], team, 0, 0, 'wacht', 0.78, true); g.restore()
    ;[[-24, 0.4], [18, 2.2]].forEach(function (pt) { dierpoot(g, pt[0], -40, ph2 + pt[1] + Math.PI, 40, tint(pk, -0.3), 8, pt[0] > 0, '#2a1c14') })
    g.fillStyle = '#2a1a14'; g.beginPath(); g.moveTo(-30, -52); g.quadraticCurveTo(-48, -44, -44, -18 + Math.sin(f) * 3); g.quadraticCurveTo(-40, -36, -30, -44); g.fill()
    g.fillStyle = verloop(g, -30, -64, 30, -34, pk, 0.3, -0.3); g.beginPath(); g.ellipse(0, -50, 32, 15, 0, 0, TAU); g.fill()
    g.fillStyle = verloop(g, 20, -90, 40, -50, pk, 0.3, -0.25); g.beginPath(); g.moveTo(18, -60); g.quadraticCurveTo(26, -84, 36, -88); g.lineTo(46, -80); g.quadraticCurveTo(36, -70, 32, -48); g.closePath(); g.fill()
    g.fillStyle = verloop(g, 34, -92, 56, -70, pk, 0.3, -0.25); g.beginPath(); g.moveTo(34, -90); g.quadraticCurveTo(46, -92, 56, -76); g.quadraticCurveTo(58, -70, 52, -69); g.lineTo(40, -74); g.closePath(); g.fill()
    cirkel(g, 53, -73, 1.3, '#2a1a14'); oog(g, 44, -84); veelhoek(g, [36, -88, 38, -98, 42, -89], tint(pk, -0.2))
    g.fillStyle = '#2a1a14'; g.beginPath(); g.moveTo(36, -90); g.quadraticCurveTo(26, -86, 18, -62); g.quadraticCurveTo(24, -78, 32, -82); g.fill()
    ;[[-20, 1.6], [22, 0]].forEach(function (pt) { dierpoot(g, pt[0], -40, ph2 + pt[1], 40, pk, 9, pt[0] > 0, '#2a1c14') })
    // dekkleed in teamkleur met gouden rand
    g.fillStyle = verloop(g, -24, -66, 24, -36, team, 0.2, -0.35); g.beginPath(); g.moveTo(-22, -62); g.quadraticCurveTo(0, -66, 22, -62); g.lineTo(26, -38); g.lineTo(18, -34); g.lineTo(10, -38); g.lineTo(2, -34); g.lineTo(-6, -38); g.lineTo(-14, -34); g.lineTo(-24, -38); g.closePath(); g.fill()
    lijn(g, -24, -38, 26, -38, '#ffc83d', 1.6); blok(g, -10, -64, 18, 5, 2.5, '#5a3a22')
    g.save(); g.translate(-4, -46); g.scale(0.78, 0.78)
    var lx = slag > 0 ? p * 14 : 0
    g.save(); g.translate(hand[0] + lx, hand[1]); g.rotate(-0.08)
    for (var s3 = 0; s3 < 6; s3++) blok(g, -12 + s3 * 13, -2.6, 13, 5.2, 1, s3 % 2 ? '#ffffff' : team)
    veelhoek(g, [66, -4, 84, 0, 66, 4], '#e8ecf8'); veelhoek(g, [-4, -6, 6, -4.5, 6, 4.5, -4, 6], '#c8d0e4')
    g.restore(); g.restore()
  } else if (e === 2) {
    mens(g, KAPITEIN, team, fase * 7 / 9, slag, staat, 1.4)
  } else if (e === 3) {
    // tankbot op rupsbanden
    var r = loopt ? fase * 6 : 0, bx2 = slag > 0 ? -p * 7 : 0
    g.fillStyle = '#1e2232'; rr(g, -38, -26, 76, 24, 12); g.fill()
    g.save(); rr(g, -38, -26, 76, 24, 12); g.clip()
    for (var k = -6; k < 14; k++) { var tx = -40 + ((k * 7 + r * 8) % 84 + 84) % 84; blok(g, tx, -26, 3.5, 3, 1, '#3a4258'); blok(g, tx, -5, 3.5, 3, 1, '#3a4258') }
    g.restore()
    for (var w = 0; w < 5; w++) {
      var wx = -26 + w * 13
      g.fillStyle = verloop(g, wx - 6, -20, wx + 6, -6, '#8a94ac', 0.3, -0.35); g.beginPath(); g.arc(wx, -14, 6.5, 0, TAU); g.fill()
      cirkel(g, wx, -14, 2.4, '#3a4258'); lijn(g, wx, -14, wx + Math.cos(r + w) * 5, -14 + Math.sin(r + w) * 5, '#3a4258', 1.6)
    }
    g.fillStyle = verloop(g, -32, -50, 30, -24, '#7a849c', 0.35, -0.3); g.beginPath(); g.moveTo(-34, -26); g.lineTo(-26, -46); g.lineTo(26, -46); g.lineTo(36, -26); g.closePath(); g.fill()
    lijn(g, -26, -46, 26, -46, 'rgba(255,255,255,.45)', 1.5)
    gloed(g, team, 10, function () { blok(g, -24, -36, 50, 3.4, 1.7, team) })
    ;[-20, -6, 8, 22].forEach(function (x) { cirkel(g, x, -30, 1.1, 'rgba(255,255,255,.4)') })
    g.fillStyle = verloop(g, -12, -66, 14, -46, '#9aa4bc', 0.35, -0.3); g.beginPath(); g.moveTo(-16, -46); g.quadraticCurveTo(-16, -66, 0, -66); g.quadraticCurveTo(16, -66, 16, -46); g.closePath(); g.fill()
    g.fillStyle = verloop(g, 0, -61, 0, -53, '#5a647c', 0.35, -0.3); rr(g, 12 + bx2, -61, 30, 8, 3); g.fill()
    blok(g, 38 + bx2, -62.5, 7, 11, 2.5, '#3a4258')
    gloed(g, team, 12, function () { cirkel(g, -3, -56, 4, team) }); cirkel(g, -4, -57, 1.4, '#ffffff')
    lijn(g, -10, -64, -14, -80, '#6a748c', 2); gloed(g, team, 8, function () { cirkel(g, -14, -81, 2.4, team) })
  } else {
    // mecha met armkanon
    var lp = loopt ? Math.sin(fase * 6) : 0, kx2 = slag > 0 ? -p * 7 : 0
    var mechaBeen = function (x, a, donker) {
      var kl = donker ? '#9aa4bc' : '#dfe4f2', kx3 = x + Math.sin(a) * 18, ky3 = -40 + 18
      ledemaat(g, x, -44, kx3, ky3, 11, 9, verloop(g, x - 6, -44, x + 6, ky3, kl, 0.3, -0.3))
      ledemaat(g, kx3, ky3, kx3 - Math.sin(a) * 4, -5, 9, 8, verloop(g, kx3 - 5, ky3, kx3 + 5, -5, kl, 0.2, -0.35))
      cirkel(g, kx3, ky3, 5, donker ? '#4a546c' : '#6a748c'); cirkel(g, kx3 - 1, ky3 - 1, 1.6, 'rgba(255,255,255,.4)')
      g.fillStyle = donker ? '#4a546c' : '#5a647c'; rr(g, kx3 - Math.sin(a) * 4 - 9, -7, 22, 7, 3); g.fill()
    }
    mechaBeen(-8, lp * 0.45, true)
    mechaBeen(10, -lp * 0.45, false)
    g.fillStyle = verloop(g, -24, -88, 24, -42, '#eef2fc', 0.3, -0.3); rr(g, -24, -86, 48, 44, 12); g.fill()
    blok(g, -24, -60, 48, 4, 1, team)
    g.fillStyle = verloop(g, 0, -82, 20, -64, team, 0.35, -0.4); rr(g, 0, -80, 20, 14, 6); g.fill()
    blok(g, 3, -78, 7, 3, 1.5, 'rgba(255,255,255,.7)')
    g.fillStyle = verloop(g, -34, -88, -18, -64, '#b8c0d8', 0.3, -0.3); rr(g, -34, -88, 16, 26, 5); g.fill()
    for (var m = 0; m < 3; m++) { cirkel(g, -26, -82 + m * 7, 2.4, '#3a4258'); cirkel(g, -26, -82 + m * 7, 1.2, team) }
    g.fillStyle = verloop(g, 12, -66, 50, -50, '#c8d0e4', 0.3, -0.3); rr(g, 12 + kx2, -64, 36, 13, 6); g.fill()
    blok(g, 44 + kx2, -62, 10, 9, 3, '#4a546c')
    gloed(g, team, 12, function () { for (var j = 0; j < 3; j++) blok(g, 20 + j * 7 + kx2, -64.5, 2.5, 14, 1, team); cirkel(g, 54 + kx2, -57.5, 3, team) })
    lijn(g, -14, -86, -18, -100, '#9aa4bc', 2); gloed(g, team, 8, function () { cirkel(g, -18, -101, 2.5, team) })
  }
}
function tekenSoldaat(g, e, t, kant, fase, slag, staat) {
  var team = KLEUR[kant]
  g.lineCap = 'round'; g.lineJoin = 'round'
  if (t === 2) zwaar(g, e, team, fase, slag, staat)
  else mens(g, STIJL[e][t], team, fase, slag, staat, 1)
}

// ── plaatjes: één keer tekenen met donkere rand, licht van boven en een gloed in de teamkleur,
// daarna alleen nog stempelen. Mooier én sneller dan elk beeldje opnieuw tekenen. ──
function maakPlaatje(K, R, team, teken, rand) {
  var pad = 8, x0 = K[0] - pad, y0 = K[1] - pad, w = K[2] - K[0] + pad * 2, h = K[3] - K[1] + pad * 2
  var pw = Math.max(2, Math.ceil(w * R)), ph = Math.max(2, Math.ceil(h * R))
  var a = document.createElement('canvas'); a.width = pw; a.height = ph
  var ga = a.getContext('2d'); ga.lineCap = 'round'; ga.lineJoin = 'round'
  ga.setTransform(R, 0, 0, R, -x0 * R, -y0 * R)
  teken(ga)
  ga.setTransform(1, 0, 0, 1, 0, 0); ga.globalCompositeOperation = 'source-atop'
  var lg = ga.createLinearGradient(0, 0, pw * 0.35, ph)
  lg.addColorStop(0, 'rgba(255,255,255,.26)'); lg.addColorStop(0.42, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(12,0,36,.36)')
  ga.fillStyle = lg; ga.fillRect(0, 0, pw, ph)
  var b = document.createElement('canvas'); b.width = pw; b.height = ph
  var gb = b.getContext('2d'), o = (rand || 1.7) * R
  for (var i = 0; i < 12; i++) gb.drawImage(a, Math.cos(i * TAU / 12) * o, Math.sin(i * TAU / 12) * o)
  gb.globalCompositeOperation = 'source-in'; gb.fillStyle = '#0b0618'; gb.fillRect(0, 0, pw, ph)
  var c = document.createElement('canvas'); c.width = pw; c.height = ph
  var gc = c.getContext('2d')
  gc.shadowColor = rgba(team, 0.6); gc.shadowBlur = 6 * R; gc.drawImage(b, 0, 0); gc.shadowBlur = 0
  gc.drawImage(a, 0, 0)
  return { c: c, x: x0, y: y0, w: w, h: h }
}
function witVan(sp) {
  if (!sp.wit) {
    var c = document.createElement('canvas'); c.width = sp.c.width; c.height = sp.c.height
    var g = c.getContext('2d'); g.drawImage(sp.c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height)
    sp.wit = c
  }
  return sp.wit
}
function stempel(g, sp) { g.drawImage(sp.c, sp.x, sp.y, sp.w, sp.h) }
var KADERS = { m: [-38, -104, 62, 12], z0: [-66, -122, 86, 12], z1: [-50, -130, 98, 12], z2: [-48, -138, 74, 12], z3: [-42, -90, 54, 8], z4: [-38, -106, 60, 10] }
var sprites = new Map(), spriteR = 0
function plaatjeR() { return Math.min(2.4, S * dpr) }
function periode(e, t) { return t === 2 ? (e === 2 ? TAU / 7 : e >= 3 ? TAU / 6 : TAU / 9) : TAU / 9 }
function soldaatPlaatje(e, t, kant, fase, slag, staat) {
  var R = plaatjeR()
  if (R !== spriteR || sprites.size > 600) { sprites.clear(); basisPlaatjes = {}; spriteR = R }
  var loopt = staat === 'loop', P = periode(e, t)
  var f = loopt ? Math.floor((((fase % P) + P) % P) / P * 10) : 0
  var sl = slag > 0 ? Math.ceil(slag / 0.06) : 0
  var key = e + '|' + t + '|' + kant + '|' + (loopt ? 'l' : 'w') + f + '|' + sl
  var sp = sprites.get(key)
  if (!sp) {
    sp = maakPlaatje(t === 2 ? KADERS['z' + e] : KADERS.m, R, KLEUR[kant], function (g) { tekenSoldaat(g, e, t, kant, loopt ? f / 10 * P : 0, sl * 0.06, loopt ? 'loop' : 'vecht') })
    sprites.set(key, sp)
  }
  return sp
}
// zachte gloed op de grond onder elke soldaat
var grondGloed = KLEUR.map(function (k) {
  var c = document.createElement('canvas'); c.width = 64; c.height = 16
  var g = c.getContext('2d'), gr = g.createRadialGradient(32, 8, 0, 32, 8, 32)
  gr.addColorStop(0, rgba(k, 0.45)); gr.addColorStop(1, rgba(k, 0)); g.fillStyle = gr; g.setTransform(1, 0, 0, 0.25, 0, 6); g.fillRect(0, -32, 64, 64)
  return c
})

// ── bases en torens ──
var BASIS_H = [150, 190, 175, 165, 130]
// waar de torenplekken op de basis zitten (dx naar de vijand toe)
var PLEKKEN = [{ dx: 4, y: -1 }, { dx: 56, y: -0.62 }, { dx: 56, y: -0.3 }]
// de bovenste plek staat op de muur of het dak, niet erboven
var BOVENPLEK = [0, 24, 0, 24, 14]
function plekPos(k, e, i) { var P = PLEKKEN[i], dir = k ? -1 : 1; return [TS.BASIS[k] + dir * P.dx, GROND + P.y * BASIS_H[e] + (i ? 0 : BOVENPLEK[e] - 6)] }
var basisPlaatjes = {}
function tekenBasis(g, k, z, schudX) {
  var e = z.e, team = KLEUR[k], h = BASIS_H[e], R = plaatjeR(), sl = e + '|' + k + '|' + R
  if (!basisPlaatjes[sl]) basisPlaatjes[sl] = maakPlaatje([-106, -252, 106, 14], R, team, function (gb) { basisLijf(gb, e, team, h) }, 2.2)
  g.save(); g.translate(TS.BASIS[k] + schudX, GROND); if (k) g.scale(-1, 1)
  stempel(g, basisPlaatjes[sl])
  basisLeven(g, e, team, h, z.basis.hp / z.basis.max)
  g.restore()
  torensVan(g, k, z, schudX)
}
// wat beweegt op de basis: vuur, lampjes, het schild
function basisLeven(g, e, team, h, hp) {
  var t = performance.now() / 1000
  g.save(); g.globalCompositeOperation = 'lighter'
  if (e === 0) { radiaal(g, 52, -14, 46 + Math.sin(t * 9) * 4, '#ff8a3d', 0.45); veelhoek(g, [44, -8, 52, -30 - Math.sin(t * 8) * 5, 60, -8], 'rgba(255,200,61,.8)') }
  else if (e === 1) [[-44, -116], [-16, -116], [-44, -78], [44, -94]].forEach(function (w, i) { radiaal(g, w[0], w[1], 16 + Math.sin(t * 3 + i) * 2, '#ffc83d', 0.35) })
  else if (e === 2) radiaal(g, -19, -h + 43, 20 + Math.sin(t * 4) * 3, '#ffc83d', 0.45)
  else if (e === 3) { g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3); radiaal(g, -20, -h - 30, 22, team, 0.8) }
  else { g.strokeStyle = rgba(team, 0.25 + 0.15 * Math.sin(t * 2)); g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 100 + Math.sin(t * 2) * 2, Math.PI, 0); g.stroke(); radiaal(g, -21, -h + 6, 26, team, 0.5 + 0.2 * Math.sin(t * 4)) }
  g.restore()
}
function basisLijf(g, e, team, h) {
  var r = TS.rng(900 + e), i, j
  if (e === 0) {
    // grot in een rotsheuvel, met mos, botten en een hek van puntige stokken
    var rots = function () { g.beginPath(); g.moveTo(-84, 0); g.quadraticCurveTo(-88, -60, -60, -104); g.quadraticCurveTo(-36, -h - 6, -6, -h); g.quadraticCurveTo(30, -h + 8, 52, -110); g.quadraticCurveTo(80, -70, 82, 0); g.closePath() }
    rots(); g.fillStyle = verloop(g, -80, -h, 60, 0, '#6a5a78', 0.2, -0.45); g.fill()
    g.save(); rots(); g.clip()
    for (i = 0; i < 14; i++) { var sx = -80 + r() * 160, sy = -r() * h; ellips(g, sx, sy, 10 + r() * 14, 6 + r() * 8, rgba(r() < 0.5 ? '#8a7a98' : '#3a2e48', 0.45), r()) }
    for (i = 0; i < 8; i++) { g.strokeStyle = 'rgba(30,20,40,.5)'; g.lineWidth = 1.5; g.beginPath(); var cx = -70 + r() * 140, cy = -r() * h * 0.9; g.moveTo(cx, cy); g.lineTo(cx + 6 + r() * 8, cy + 8 + r() * 6); g.lineTo(cx + 2, cy + 18); g.stroke() }
    g.fillStyle = verloop(g, -60, -h, 40, -h + 40, '#4a8a3a', 0.3, -0.2); g.beginPath(); g.moveTo(-64, -100); g.quadraticCurveTo(-36, -h - 8, -6, -h - 1); g.quadraticCurveTo(28, -h + 6, 50, -112)
    for (i = 0; i < 9; i++) g.quadraticCurveTo(44 - i * 12, -h + 26 + (i % 2) * 8, 40 - i * 13, -h + 20 + (i % 3) * 7)
    g.closePath(); g.fill()
    g.restore()
    // grotingang
    g.fillStyle = verloop(g, 20, -70, 70, 0, '#1a0e14', 0.1, -0.5); g.beginPath(); g.moveTo(20, 0); g.quadraticCurveTo(22, -72, 50, -74); g.quadraticCurveTo(76, -64, 76, 0); g.fill()
    radiaal(g, 50, -14, 40, '#ff8a3d', 0.35)
    ;[[22, -8], [26, -30], [32, -52], [44, -66], [60, -68], [70, -50], [74, -26]].forEach(function (st2) { ellips(g, st2[0], st2[1], 6, 4.5, '#7a6a88'); ellips(g, st2[0] - 1, st2[1] - 1.5, 3.5, 2, 'rgba(255,255,255,.18)') })
    // kampvuur met stenen
    for (i = 0; i < 5; i++) ellips(g, 38 + i * 6, -2, 3.6, 2.6, '#5a5060')
    lijn(g, 40, -4, 62, -10, '#5a3a22', 3); lijn(g, 42, -10, 62, -3, '#6a4428', 3)
    // botten en schedel
    lijn(g, -50, -4, -32, -8, '#f0e6d0', 3.5); cirkel(g, -51, -4, 2.8, '#f0e6d0'); cirkel(g, -31, -8, 2.8, '#f0e6d0')
    ellips(g, -16, -8, 8, 7, '#f0e6d0'); cirkel(g, -18, -9, 1.8, '#2a1a1a'); cirkel(g, -13, -9, 1.8, '#2a1a1a')
    // hek van puntige stokken
    for (i = 0; i < 3; i++) { var px = 80 + i * 8; g.fillStyle = verloop(g, px - 3, -40, px + 3, 0, '#8a5a30', 0.3, -0.3); g.beginPath(); g.moveTo(px - 3, 0); g.lineTo(px - 3, -30 - (i % 2) * 6); g.lineTo(px, -38 - (i % 2) * 6); g.lineTo(px + 3, -30 - (i % 2) * 6); g.lineTo(px + 3, 0); g.fill() }
    lijn(g, 74, -14, 100, -17, '#c8a878', 1.5)
    // vlag van huid op een botstok
    lijn(g, -6, -h, -6, -h - 46, '#f0e6d0', 3.5); cirkel(g, -6, -h - 47, 3, '#f0e6d0')
    g.fillStyle = verloop(g, -6, -h - 44, 22, -h - 24, team, 0.2, -0.3); g.beginPath(); g.moveTo(-4, -h - 44); g.quadraticCurveTo(10, -h - 40, 24, -h - 42); g.lineTo(20, -h - 34); g.lineTo(24, -h - 26); g.quadraticCurveTo(10, -h - 26, -4, -h - 24); g.fill()
    for (i = 0; i < 3; i++) cirkel(g, 4 + i * 6, -h - 34, 1.6, tint(team, -0.4))
  } else if (e === 1) {
    // stenen burcht met toren, ramen en poort
    var muur = function (x, y, w, hh) {
      g.fillStyle = verloop(g, x, y, x + w, y + hh, '#8a92b0', 0.2, -0.4); g.fillRect(x, y, w, hh)
      g.strokeStyle = 'rgba(30,34,56,.45)'; g.lineWidth = 1
      for (var yy = y + 10, rij = 0; yy < y + hh; yy += 10, rij++) {
        g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke()
        for (var xx = x + (rij % 2 ? 8 : 0); xx < x + w; xx += 16) { g.beginPath(); g.moveTo(xx, yy - 10); g.lineTo(xx, yy); g.stroke() }
      }
      for (var k = 0; k < w / 22; k++) blok(g, x + 4 + k * 22 + r() * 6, y + 14 + r() * (hh - 24), 7, 4, 1, 'rgba(255,255,255,.08)')
    }
    muur(-66, -h + 34, 92, h - 34)
    for (i = 0; i < 4; i++) muur(-66 + i * 25, -h + 18, 16, 18)
    muur(26, -120, 52, 120)
    for (i = 0; i < 2; i++) muur(26 + i * 30, -134, 22, 16)
    // dak van de toren in teamkleur
    g.fillStyle = verloop(g, 20, -170, 84, -134, team, 0.25, -0.4); g.beginPath(); g.moveTo(22, -134); g.lineTo(52, -176); g.lineTo(82, -134); g.closePath(); g.fill()
    for (i = 0; i < 4; i++) lijn(g, 28 + i * 14, -134, 52, -172, tint(team, -0.35), 1)
    lijn(g, 52, -176, 52, -194, '#3a3248', 2.5); veelhoek(g, [52, -194, 66, -189, 52, -184], '#ffc83d')
    // ramen
    ;[[-44, -122], [-16, -122], [-44, -84], [44, -100]].forEach(function (w2) {
      g.fillStyle = '#1a1428'; g.beginPath(); g.moveTo(w2[0] - 6, w2[1] + 16); g.lineTo(w2[0] - 6, w2[1]); g.arc(w2[0], w2[1], 6, Math.PI, 0); g.lineTo(w2[0] + 6, w2[1] + 16); g.fill()
      g.fillStyle = verloop(g, w2[0], w2[1] - 6, w2[0], w2[1] + 16, '#ffd36a', 0.3, -0.2); g.beginPath(); g.moveTo(w2[0] - 4, w2[1] + 14); g.lineTo(w2[0] - 4, w2[1]); g.arc(w2[0], w2[1], 4, Math.PI, 0); g.lineTo(w2[0] + 4, w2[1] + 14); g.fill()
      lijn(g, w2[0], w2[1] - 4, w2[0], w2[1] + 14, '#5a3a22', 1); lijn(g, w2[0] - 4, w2[1] + 5, w2[0] + 4, w2[1] + 5, '#5a3a22', 1)
    })
    // poort
    g.fillStyle = '#120e1c'; g.beginPath(); g.moveTo(34, 0); g.lineTo(34, -42); g.arc(52, -42, 18, Math.PI, 0); g.lineTo(70, 0); g.fill()
    g.fillStyle = verloop(g, 36, -56, 68, 0, '#7a5030', 0.25, -0.35); g.beginPath(); g.moveTo(37, 0); g.lineTo(37, -42); g.arc(52, -42, 15, Math.PI, 0); g.lineTo(67, 0); g.fill()
    for (i = 0; i < 4; i++) lijn(g, 41 + i * 7.5, -54, 41 + i * 7.5, 0, 'rgba(40,24,12,.6)', 1.4)
    for (i = 0; i < 3; i++) { lijn(g, 37, -40 + i * 14, 67, -40 + i * 14, '#3a3a48', 2.4); for (j = 0; j < 4; j++) cirkel(g, 41 + j * 7.5, -40 + i * 14, 1.2, '#c8d0e4') }
    g.strokeStyle = '#5a6280'; g.lineWidth = 4; g.beginPath(); g.arc(52, -42, 19, Math.PI, 0); g.stroke()
    // hangende banier
    g.fillStyle = verloop(g, -36, -h + 20, -10, -h + 80, team, 0.25, -0.35); g.beginPath(); g.moveTo(-36, -h + 36); g.lineTo(-10, -h + 36); g.lineTo(-10, -h + 92); g.lineTo(-23, -h + 82); g.lineTo(-36, -h + 92); g.closePath(); g.fill()
    blok(g, -38, -h + 34, 30, 4, 2, '#ffc83d')
    veelhoek(g, [-23, -h + 48, -17, -h + 58, -23, -h + 70, -29, -h + 58], '#ffffff')
  } else if (e === 2) {
    // piratenfort van palen met uitkijktoren, kanonpoort en doodshoofdvlag
    for (i = 0; i < 10; i++) {
      var lx = -74 + i * 15, lh = 100 + (i % 3) * 7
      g.fillStyle = verloop(g, lx, -lh, lx + 14, 0, i % 2 ? '#8a5a36' : '#9a6a40', 0.25, -0.35); g.beginPath()
      g.moveTo(lx, 0); g.lineTo(lx, -lh); g.lineTo(lx + 7, -lh - 10); g.lineTo(lx + 14, -lh); g.lineTo(lx + 14, 0); g.fill()
      for (j = 0; j < 3; j++) lijn(g, lx + 4 + j * 3, -lh + 8 + r() * 20, lx + 4 + j * 3, -lh + 40 + r() * 50, 'rgba(60,36,18,.4)', 0.8)
      cirkel(g, lx + 7, -lh + 30 + r() * 40, 1.8, 'rgba(60,36,18,.5)')
    }
    blok(g, -76, -70, 152, 6, 2, '#5a3a22'); blok(g, -76, -30, 152, 6, 2, '#5a3a22')
    for (i = 0; i < 6; i++) cirkel(g, -66 + i * 28, -67, 1.6, '#c8c8d4')
    // uitkijktoren
    blok(g, -42, -h + 20, 56, 64, 3, '#6a4428')
    g.fillStyle = verloop(g, -42, -h + 20, 14, -h + 84, '#7a5030', 0.25, -0.35); g.fillRect(-42, -h + 20, 56, 64)
    for (i = 0; i < 4; i++) lijn(g, -42, -h + 34 + i * 14, 14, -h + 34 + i * 14, 'rgba(40,24,12,.45)', 1)
    g.fillStyle = verloop(g, -50, -h - 6, 22, -h + 20, '#5a3a22', 0.2, -0.35); g.beginPath(); g.moveTo(-50, -h + 22); g.lineTo(-14, -h - 6); g.lineTo(22, -h + 22); g.closePath(); g.fill()
    blok(g, -26, -h + 36, 14, 14, 3, '#1a1018'); g.fillStyle = verloop(g, -24, -h + 38, -14, -h + 48, '#ffd36a', 0.3, -0.2); rr(g, -24, -h + 38, 10, 10, 2); g.fill()
    // kanonpoort met kanon
    blok(g, 42, -62, 30, 24, 4, '#1a1018'); g.fillStyle = verloop(g, 46, -56, 46, -46, '#3a3a48', 0.35, -0.3); rr(g, 50, -55, 30, 10, 5); g.fill()
    // deur, tonnen en touw
    g.fillStyle = verloop(g, 40, -40, 70, 0, '#5a3a22', 0.2, -0.35); rr(g, 44, -34, 26, 34, 8); g.fill()
    cirkel(g, 64, -16, 1.8, '#ffc83d')
    ;[[-60, 0], [-44, 0]].forEach(function (t2) { g.fillStyle = verloop(g, t2[0] - 8, -22, t2[0] + 8, 0, '#8a5a30', 0.3, -0.35); rr(g, t2[0] - 8, -22, 16, 22, 5); g.fill(); lijn(g, t2[0] - 8, -16, t2[0] + 8, -16, '#3a3a48', 1.8); lijn(g, t2[0] - 8, -6, t2[0] + 8, -6, '#3a3a48', 1.8) })
    // vlag
    lijn(g, -14, -h - 6, -14, -h - 62, '#3a2414', 3)
    g.fillStyle = '#141020'; g.beginPath(); g.moveTo(-12, -h - 60); g.quadraticCurveTo(6, -h - 64, 26, -h - 58); g.lineTo(26, -h - 34); g.quadraticCurveTo(6, -h - 40, -12, -h - 36); g.fill()
    g.strokeStyle = team; g.lineWidth = 2; g.stroke()
    ellips(g, 7, -h - 50, 6, 5.5, '#f4f2f8'); blok(g, 3.5, -h - 46, 7, 4, 1, '#f4f2f8')
    cirkel(g, 5, -h - 51, 1.5, '#141020'); cirkel(g, 9, -h - 51, 1.5, '#141020')
    lijn(g, -1, -h - 44, 15, -h - 38, '#f4f2f8', 2); lijn(g, 15, -h - 44, -1, -h - 38, '#f4f2f8', 2)
  } else if (e === 3) {
    // metalen bunker met panelen, neon, gevarenstrepen en een schotel
    var romp2 = function () { g.beginPath(); g.moveTo(-76, 0); g.lineTo(-62, -h + 22); g.lineTo(42, -h + 22); g.lineTo(78, 0); g.closePath() }
    romp2(); g.fillStyle = verloop(g, -70, -h, 70, 0, '#7a84a0', 0.25, -0.45); g.fill()
    g.save(); romp2(); g.clip()
    for (i = 0; i < 6; i++) lijn(g, -76 + i * 30, -h, -76 + i * 30 + 6, 0, 'rgba(20,24,40,.45)', 1.2)
    for (i = 0; i < 4; i++) lijn(g, -80, -h + 50 + i * 30, 80, -h + 50 + i * 30, 'rgba(20,24,40,.35)', 1.2)
    for (i = 0; i < 24; i++) cirkel(g, -70 + (i % 6) * 30 + 4, -h + 54 + Math.floor(i / 6) * 30, 1.2, 'rgba(255,255,255,.35)')
    for (i = -8; i < 14; i++) veelhoek(g, [i * 12, 0, i * 12 + 6, 0, i * 12 + 14, -10, i * 12 + 8, -10], i % 2 ? '#ffc83d' : '#1a1a24')
    g.restore()
    gloed(g, team, 16, function () { blok(g, -58, -h + 38, 96, 3.5, 1.7, team); blok(g, -66, -64, 120, 3.5, 1.7, team) })
    for (i = 0; i < 4; i++) { blok(g, -46 + i * 22, -h + 52, 14, 10, 2, '#141826'); g.fillStyle = rgba(i % 2 ? team : '#ffc83d', 0.85); rr(g, -44 + i * 22, -h + 54, 10, 6, 1.5); g.fill() }
    // deur
    g.fillStyle = verloop(g, 40, -58, 70, 0, '#3a4258', 0.25, -0.35); rr(g, 40, -56, 30, 56, 4); g.fill()
    lijn(g, 55, -56, 55, 0, '#1a1e2c', 2); gloed(g, team, 10, function () { blok(g, 45, -46, 20, 4, 2, team) })
    // ventilator
    cirkel(g, -40, -30, 14, '#2a3044'); for (i = 0; i < 4; i++) { g.save(); g.translate(-40, -30); g.rotate(i * Math.PI / 2 + 0.3); ellips(g, 6, 0, 7, 3, '#6a748c'); g.restore() }
    cirkel(g, -40, -30, 3, '#9aa4bc')
    // schotel
    lijn(g, -20, -h + 22, -20, -h - 18, '#8a94ac', 4)
    g.fillStyle = verloop(g, -40, -h - 46, 0, -h - 14, '#c8d0e4', 0.3, -0.35); g.beginPath(); g.ellipse(-20, -h - 30, 18, 12, -0.5, 0, Math.PI); g.fill()
    lijn(g, -20, -h - 30, -12, -h - 42, '#8a94ac', 1.5); gloed(g, team, 10, function () { cirkel(g, -12, -h - 43, 2.6, team) })
  } else {
    // ruimtebasis: koepel met panelen, raamband, antennetoren en zonnepaneel
    g.fillStyle = verloop(g, -100, -6, 100, 6, '#5a647c', 0.25, -0.35); rr(g, -96, -8, 192, 10, 4); g.fill()
    var koepel = function () { g.beginPath(); g.arc(-6, 0, 78, Math.PI, 0) }
    koepel(); var kg2 = g.createRadialGradient(-30, -60, 10, -6, 0, 86); kg2.addColorStop(0, '#ffffff'); kg2.addColorStop(0.6, '#d6dcee'); kg2.addColorStop(1, '#8a94b0'); g.fillStyle = kg2; g.fill()
    g.save(); koepel(); g.clip()
    for (i = 1; i < 4; i++) { g.strokeStyle = 'rgba(90,100,130,.4)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(-6, 0, 78, 78 - i * 20, 0, Math.PI, TAU); g.stroke() }
    for (i = -3; i <= 3; i++) { g.beginPath(); g.ellipse(-6, 0, Math.abs(i) * 22 + 0.1, 78, 0, Math.PI, TAU); g.stroke() }
    gloed(g, team, 14, function () { blok(g, -84, -42, 160, 8, 3, rgba(team, 0.85)) })
    for (i = 0; i < 7; i++) blok(g, -70 + i * 20, -41, 12, 6, 2, 'rgba(255,255,255,.6)')
    g.restore()
    // antennetoren
    g.fillStyle = verloop(g, -32, -h - 20, -12, -40, '#c8d0e4', 0.3, -0.3); rr(g, -30, -h + 10, 18, 80, 6); g.fill()
    for (i = 0; i < 3; i++) blok(g, -30, -h + 26 + i * 20, 18, 3, 1, team)
    // zonnepaneel
    lijn(g, 60, -50, 76, -76, '#8a94ac', 3)
    g.save(); g.translate(78, -80); g.rotate(-0.4)
    g.fillStyle = verloop(g, -22, -12, 22, 12, '#3a5aa8', 0.35, -0.3); rr(g, -22, -12, 44, 24, 2); g.fill()
    for (i = 1; i < 4; i++) lijn(g, -22 + i * 11, -12, -22 + i * 11, 12, 'rgba(200,220,255,.5)', 0.8)
    lijn(g, -22, 0, 22, 0, 'rgba(200,220,255,.5)', 0.8)
    g.restore()
    // deur met luchtsluis
    g.fillStyle = '#141826'; g.beginPath(); g.arc(46, 0, 19, Math.PI, 0); g.fill()
    g.fillStyle = verloop(g, 30, -16, 62, 0, '#6a748c', 0.3, -0.3); g.beginPath(); g.arc(46, 0, 15, Math.PI, 0); g.fill()
    gloed(g, team, 8, function () { blok(g, 33, -5, 26, 3, 1.5, team) })
  }
}
function torensVan(g, k, z, schudX) {
  var e = z.e, team = KLEUR[k]
  z.torens.forEach(function (tw, i) {
    var P = plekPos(k, e, i)
    g.save(); g.translate(P[0] + schudX, P[1]); if (k) g.scale(-1, 1)
    if (i) { lijn(g, 6, 8, 6, GROND - P[1], '#2a2840', 5); lijn(g, 6, 18, -34, 52, '#2a2840', 4) }
    blok(g, -18, 0, 36, 8, 3, '#2a2840'); blok(g, -18, 0, 36, 3, 2, '#4a4868')
    if (!tw) { g.setLineDash([4, 4]); g.strokeStyle = rgba(team, 0.6); g.lineWidth = 1.5; rr(g, -15, -22, 30, 22, 5); g.stroke(); g.setLineDash([]) }
    else tekenToren(g, tw.e, team, tw.mik ? Math.atan2(-60, Math.abs(tw.mik - P[0])) * 0.5 : -0.1)
    g.restore()
  })
}
function tekenToren(g, e, team, hoek) {
  g.save(); g.scale(1.25, 1.25)
  if (e === 0) {
    g.fillStyle = verloop(g, -14, -20, 14, 0, '#8a5a30', 0.3, -0.35); g.beginPath(); g.moveTo(-14, 0); g.lineTo(-6, -20); g.lineTo(6, -20); g.lineTo(14, 0); g.lineTo(9, 0); g.lineTo(3, -14); g.lineTo(-3, -14); g.lineTo(-9, 0); g.fill()
    lijn(g, -8, -7, 8, -7, '#5a3a22', 2.6); cirkel(g, 0, -19, 2.6, '#5a3a22')
    g.save(); g.translate(0, -19); g.rotate(hoek - 0.6)
    ledemaat(g, -16, 0, 18, 0, 4.5, 3.5, verloop(g, 0, -3, 0, 3, '#9a6a40', 0.3, -0.3))
    g.fillStyle = verloop(g, -26, -10, -12, 4, '#6a4428', 0.2, -0.3); g.beginPath(); g.ellipse(-19, -3, 8, 5, 0, 0, TAU); g.fill()
    g.fillStyle = verloop(g, -24, -12, -14, -2, '#9a94a8', 0.35, -0.3); g.beginPath(); g.arc(-19, -6, 5.5, 0, TAU); g.fill()
    g.restore()
  } else if (e === 1) {
    g.fillStyle = verloop(g, -6, -18, 6, 0, '#7a5030', 0.3, -0.35); rr(g, -5, -17, 10, 17, 2); g.fill()
    g.save(); g.translate(0, -19); g.rotate(hoek)
    g.fillStyle = verloop(g, 0, -4, 0, 4, '#9a6a40', 0.3, -0.3); rr(g, -14, -3, 34, 6, 2); g.fill()
    g.strokeStyle = verloop(g, 0, -14, 0, 14, '#5a3a1e', 0.3, -0.3); g.lineWidth = 3.4; g.beginPath(); g.arc(14, 0, 13, -1.3, 1.3, true); g.stroke()
    lijn(g, 14 + Math.cos(1.3) * 13 - 12, -12.6, 2, 0, '#f0ead8', 0.9); lijn(g, 2, 0, 14 + Math.cos(1.3) * 13 - 12, 12.6, '#f0ead8', 0.9)
    lijn(g, 4, 0, 24, 0, '#e8ecf8', 2); veelhoek(g, [24, -2.5, 29, 0, 24, 2.5], '#ffffff'); veelhoek(g, [3, 0, 7, -3, 8, 0], team)
    g.restore()
  } else if (e === 2) {
    g.fillStyle = verloop(g, -14, -12, 14, 0, '#7a5030', 0.3, -0.35); rr(g, -14, -12, 28, 12, 3); g.fill()
    for (var w = -1; w <= 1; w += 2) { cirkel(g, w * 8, -1, 5.5, '#3a2414'); cirkel(g, w * 8, -1, 2, '#8a5a30') }
    g.save(); g.translate(0, -14); g.rotate(hoek)
    g.fillStyle = verloop(g, 0, -7, 0, 7, '#4a4a5a', 0.4, -0.35); g.beginPath(); g.moveTo(-12, -7); g.lineTo(20, -5); g.lineTo(20, 5); g.lineTo(-12, 7); g.quadraticCurveTo(-17, 0, -12, -7); g.fill()
    blok(g, 18, -7, 7, 14, 3, '#2a2a36'); blok(g, 2, -7.5, 3, 15, 1, '#c8a050'); lijn(g, -10, -4, 18, -3, 'rgba(255,255,255,.3)', 1)
    g.restore()
  } else if (e === 3) {
    g.fillStyle = verloop(g, -12, -16, 12, 0, '#5a647c', 0.3, -0.35); rr(g, -12, -15, 24, 15, 3); g.fill()
    gloed(g, team, 8, function () { blok(g, -9, -9, 18, 2.5, 1, team) })
    g.save(); g.translate(0, -19); g.rotate(hoek)
    g.fillStyle = verloop(g, -12, -9, 14, 9, '#9aa4bc', 0.35, -0.3); rr(g, -12, -8, 26, 16, 6); g.fill()
    g.fillStyle = verloop(g, 0, -4, 0, 4, '#5a647c', 0.3, -0.3); rr(g, 12, -4, 15, 8, 3); g.fill()
    gloed(g, team, 14, function () { for (var j = 0; j < 2; j++) blok(g, 15 + j * 5, -5, 2, 10, 1, team); cirkel(g, 28, 0, 3.5, team) })
    cirkel(g, -2, -2, 3, '#141826'); cirkel(g, -1.5, -2, 1.4, team)
    g.restore()
  } else {
    g.fillStyle = verloop(g, -10, -14, 10, 0, '#c8d0e4', 0.3, -0.35); rr(g, -10, -14, 20, 14, 5); g.fill()
    g.save(); g.translate(0, -21); g.rotate(hoek)
    var kg = g.createRadialGradient(-2, -5, 1, 2, 0, 16); kg.addColorStop(0, '#ffffff'); kg.addColorStop(1, '#b8c0d8'); g.fillStyle = kg
    g.beginPath(); g.ellipse(2, 0, 16, 9.5, 0, 0, TAU); g.fill()
    g.fillStyle = verloop(g, 0, -3, 0, 3, '#9aa4bc', 0.3, -0.3); rr(g, 10, -3.5, 20, 7, 3); g.fill()
    gloed(g, team, 16, function () { g.strokeStyle = team; g.lineWidth = 2.6; g.beginPath(); g.ellipse(29, 0, 3, 8.5, 0, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(21, 0, 2.2, 6.5, 0, 0, TAU); g.stroke() })
    blok(g, -6, -4, 10, 3, 1.5, rgba(team, 0.8))
    g.restore()
  }
  g.restore()
}

// ── werelden: lucht, twee lagen verte (parallax) en de grond, per tijdperk van de speler ──
var THEMA = [
  { lucht: ['#03100c', '#0c2a22', '#4a2a1a'], nevel: '#6a3a24', grond: ['#3a2a1a', '#1a120a', '#0c0804'], rand: '#7dff9a', glim: '#ff8a3d', sfeer: ['#b6ff7a', '#ffd36a'] },
  { lucht: ['#040622', '#121a4a', '#3a3470'], nevel: '#3a3a78', grond: ['#2e3040', '#181a26', '#0a0a12'], rand: '#b49bff', glim: '#ffc83d', sfeer: ['#ffe9a0', '#fff6d0'] },
  { lucht: ['#120626', '#5a1a4e', '#ff7a3a'], nevel: '#ff9a5a', grond: ['#c8a070', '#8a6440', '#3a2a18'], rand: '#ffd36a', glim: '#ff8a3d', sfeer: ['#ffd9a0', '#ffffff'] },
  { lucht: ['#03040f', '#0c1030', '#3a1450'], nevel: '#5a2a7a', grond: ['#24283c', '#12141f', '#06070c'], rand: '#3ef0ff', glim: '#ff4fd8', sfeer: ['#3ef0ff', '#ff4fd8'] },
  { lucht: ['#010108', '#0c0626', '#3a0e4a'], nevel: '#7a2a9a', grond: ['#4a2c64', '#26163a', '#0e0818'], rand: '#c08bff', glim: '#7df9ff', sfeer: ['#c08bff', '#7df9ff'] },
]
var lagen = null, lagenE = -1
function grondY() { return OY + GROND * S }
function nieuwDoek(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.floor(w * dpr)); c.height = Math.max(1, Math.floor(h * dpr)); var g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.lineCap = 'round'; g.lineJoin = 'round'; return [c, g] }
function radiaal(g, x, y, r, kleur, a) { var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(kleur, a)); gr.addColorStop(1, rgba(kleur, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2) }
function heuvels(g, w, y0, hoogte, golf, kleur, r, ruw) {
  g.fillStyle = kleur; g.beginPath(); g.moveTo(0, y0 + 5)
  var f1 = r() * 6, f2 = r() * 6
  for (var x = 0; x <= w + 20; x += 12) g.lineTo(x, y0 - hoogte * (0.55 + 0.3 * Math.sin(x / golf + f1) + 0.15 * Math.sin(x / (golf * 0.37) + f2) + (ruw ? (r() - 0.5) * ruw : 0)))
  g.lineTo(w, y0 + 5); g.closePath(); g.fill()
}
function nevel(g, w, y, h, kleur, a) { var l = g.createLinearGradient(0, y - h, 0, y); l.addColorStop(0, rgba(kleur, 0)); l.addColorStop(1, rgba(kleur, a)); g.fillStyle = l; g.fillRect(0, y - h, w, h + 2) }

function bouwLucht(e) {
  var d = nieuwDoek(W, H), c = d[0], g = d[1], T = THEMA[e], gy = grondY(), r = TS.rng(11 + e), k = S
  var l = g.createLinearGradient(0, 0, 0, gy)
  l.addColorStop(0, T.lucht[0]); l.addColorStop(0.55, T.lucht[1]); l.addColorStop(1, T.lucht[2])
  g.fillStyle = l; g.fillRect(0, 0, W, H)
  var nS = e === 2 ? 40 : e === 4 ? 420 : 220
  for (var i = 0; i < nS; i++) {
    var sx = r() * W, sy = r() * gy * (e === 2 ? 0.4 : 0.85), sz = r() * (e === 4 ? 2 : 1.6) + 0.3
    g.fillStyle = 'rgba(255,255,255,' + (0.2 + r() * 0.7) * (1 - sy / gy) + ')'; g.fillRect(sx, sy, sz, sz)
    if (r() < 0.04) { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(sx - sz * 2, sy + sz / 2 - 0.4, sz * 5, 0.8); g.fillRect(sx + sz / 2 - 0.4, sy - sz * 2, 0.8, sz * 5) }
  }
  if (e === 0) {
    // rode maan achter de nevel en een zacht noorderlicht
    radiaal(g, W * 0.72, gy * 0.3, 160 * k, '#ff6a3a', 0.25)
    cirkel(g, W * 0.72, gy * 0.3, 34 * k, '#ffb08a'); cirkel(g, W * 0.72 + 8 * k, gy * 0.3 - 6 * k, 7 * k, 'rgba(200,90,60,.4)')
    for (var a = 0; a < 3; a++) {
      g.save(); g.globalCompositeOperation = 'lighter'
      var al = g.createLinearGradient(0, gy * 0.05, 0, gy * 0.5); al.addColorStop(0, 'rgba(125,255,154,0)'); al.addColorStop(0.5, 'rgba(125,255,154,' + (0.06 + a * 0.02) + ')'); al.addColorStop(1, 'rgba(125,255,154,0)')
      g.fillStyle = al; g.beginPath(); g.moveTo(0, gy * 0.2 + a * 30)
      for (var x = 0; x <= W; x += 20) g.lineTo(x, gy * (0.18 + a * 0.06) + Math.sin(x / (160 + a * 40) + a) * 30 * k)
      for (x = W; x >= 0; x -= 20) g.lineTo(x, gy * (0.42 + a * 0.05) + Math.sin(x / (140 + a * 50) + a * 2) * 24 * k)
      g.fill(); g.restore()
    }
  } else if (e === 1) {
    var mx = W * 0.76, my = gy * 0.26, mr = 46 * k
    radiaal(g, mx, my, mr * 6, '#d8d0ff', 0.22)
    var mg = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr); mg.addColorStop(0, '#ffffff'); mg.addColorStop(1, '#d8d2f0')
    g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill()
    ;[[-0.3, -0.2, 0.2], [0.25, 0.15, 0.14], [-0.05, 0.4, 0.1]].forEach(function (p) { cirkel(g, mx + p[0] * mr, my + p[1] * mr, p[2] * mr, 'rgba(150,140,190,.35)') })
    for (i = 0; i < 7; i++) {
      var cx = r() * W, cy = gy * (0.15 + r() * 0.4), cw = (120 + r() * 200) * k
      for (var b = 0; b < 5; b++) ellips(g, cx + (b - 2) * cw * 0.18, cy + Math.sin(b * 1.7) * 6 * k, cw * 0.22, 12 * k, 'rgba(40,44,96,.55)')
      for (b = 0; b < 4; b++) ellips(g, cx + (b - 1.5) * cw * 0.16, cy - 4 * k, cw * 0.15, 6 * k, 'rgba(120,120,190,.18)')
    }
  } else if (e === 2) {
    // ondergaande zon met wolkenstrepen
    var zx = W * 0.62, zy = gy - 120 * k
    radiaal(g, zx, zy, 420 * k, '#ff9a4a', 0.45)
    var zg = g.createLinearGradient(0, zy - 70 * k, 0, zy + 70 * k); zg.addColorStop(0, '#fff2a0'); zg.addColorStop(1, '#ff5a3a')
    g.fillStyle = zg; g.beginPath(); g.arc(zx, zy, 70 * k, 0, TAU); g.fill()
    for (i = 0; i < 4; i++) { g.fillStyle = T.lucht[2]; g.fillRect(zx - 80 * k, zy + (10 + i * 14) * k, 160 * k, (3 + i) * k) }
    for (i = 0; i < 10; i++) { var wy = gy * (0.2 + r() * 0.55), wx = r() * W, ww = (160 + r() * 320) * k; ellips(g, wx, wy, ww / 2, (3 + r() * 5) * k, 'rgba(255,' + Math.floor(120 + r() * 80) + ',140,' + (0.18 + r() * 0.2) + ')') }
  } else if (e === 3) {
    // zoeklichten boven de stad
    for (i = 0; i < 4; i++) {
      var bx = W * (0.15 + i * 0.24), ba = -Math.PI / 2 + (r() - 0.5) * 0.9
      g.save(); g.globalCompositeOperation = 'lighter'
      var bg = g.createLinearGradient(bx, gy, bx + Math.cos(ba) * gy, gy + Math.sin(ba) * gy); bg.addColorStop(0, rgba(i % 2 ? T.rand : T.glim, 0.18)); bg.addColorStop(1, rgba(i % 2 ? T.rand : T.glim, 0))
      g.fillStyle = bg; g.beginPath(); g.moveTo(bx, gy); g.lineTo(bx + Math.cos(ba - 0.06) * gy * 1.2, gy + Math.sin(ba - 0.06) * gy * 1.2); g.lineTo(bx + Math.cos(ba + 0.06) * gy * 1.2, gy + Math.sin(ba + 0.06) * gy * 1.2); g.fill(); g.restore()
    }
    radiaal(g, W * 0.5, gy, 600 * k, '#ff4fd8', 0.18)
  } else {
    // nevels, een planeet met ring en een tweede maan
    ;[['#c08bff', 0.2, 0.3], ['#ff4fd8', 0.7, 0.2], ['#3ef0ff', 0.45, 0.45]].forEach(function (n) {
      g.save(); g.globalCompositeOperation = 'lighter'
      for (var q = 0; q < 6; q++) radiaal(g, W * n[1] + (r() - 0.5) * 300 * k, gy * n[2] + (r() - 0.5) * 120 * k, (120 + r() * 160) * k, n[0], 0.08)
      g.restore()
    })
    var px = W * 0.28, py = gy * 0.32, pr = 80 * k
    g.save(); g.translate(px, py); g.rotate(-0.3)
    g.strokeStyle = 'rgba(125,249,255,.35)'; g.lineWidth = 10 * k; g.beginPath(); g.ellipse(0, 0, pr * 1.8, pr * 0.38, 0, Math.PI, TAU); g.stroke()
    var pg = g.createRadialGradient(-pr * 0.4, -pr * 0.4, pr * 0.1, 0, 0, pr); pg.addColorStop(0, '#f0c8ff'); pg.addColorStop(0.5, '#a05ae0'); pg.addColorStop(1, '#2a0e50')
    g.fillStyle = pg; g.beginPath(); g.arc(0, 0, pr, 0, TAU); g.fill()
    for (i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.06 + i * 0.02) + ')'; g.fillRect(-pr, -pr * 0.5 + i * pr * 0.3, pr * 2, pr * 0.08) }
    g.strokeStyle = 'rgba(125,249,255,.6)'; g.lineWidth = 6 * k; g.beginPath(); g.ellipse(0, 0, pr * 1.8, pr * 0.38, 0, 0, Math.PI); g.stroke()
    g.restore()
    var mg2 = g.createRadialGradient(W * 0.84 - 8 * k, gy * 0.18 - 8 * k, 2 * k, W * 0.84, gy * 0.18, 18 * k); mg2.addColorStop(0, '#ffe8fa'); mg2.addColorStop(1, '#8a4a9a')
    radiaal(g, W * 0.84, gy * 0.18, 60 * k, '#ff9ad8', 0.15); g.fillStyle = mg2; g.beginPath(); g.arc(W * 0.84, gy * 0.18, 18 * k, 0, TAU); g.fill()
  }
  return c
}

// de verte: f = hoe snel hij meeschuift met de camera
function bouwLaag(e, f, diep) {
  var bereik = (TS.B + 2 * MARGE) * S - W, w = W + Math.max(0, bereik) * f + 40
  var d = nieuwDoek(w, H), c = d[0], g = d[1], T = THEMA[e], gy = grondY(), r = TS.rng(31 + e * 7 + (diep ? 3 : 0)), k = S * (diep ? 0.75 : 1)
  var i, x
  if (!diep) {
    // verste laag
    if (e === 0) {
      heuvels(g, w, gy, 90 * k, 120 * k, '#14100e', r)
      for (i = 0; i < 3; i++) {
        var vx = w * (0.15 + i * 0.35) + r() * 60, vb = (200 + r() * 120) * k, vh = (170 + r() * 90) * k
        radiaal(g, vx, gy - vh, 120 * k, '#ff5a1a', 0.35)
        // rookpluim
        for (var p = 0; p < 7; p++) cirkel(g, vx + p * 14 * k + Math.sin(p) * 10 * k, gy - vh - p * 26 * k - 20 * k, (16 + p * 7) * k, 'rgba(40,30,34,' + (0.5 - p * 0.06) + ')')
        veelhoek(g, [vx - vb, gy, vx - 34 * k, gy - vh, vx + 34 * k, gy - vh, vx + vb, gy], '#1e1418')
        veelhoek(g, [vx + 34 * k, gy - vh, vx + vb, gy, vx + vb * 0.35, gy], 'rgba(0,0,0,.25)')
        gloed(g, '#ff6a1a', 14, function () {
          g.strokeStyle = '#ff7a2a'; g.lineWidth = 3.5 * k
          for (var s2 = 0; s2 < 3; s2++) { var ox = (s2 - 1) * 18 * k; g.beginPath(); g.moveTo(vx + ox, gy - vh); g.quadraticCurveTo(vx + ox * 2.5, gy - vh * 0.6, vx + ox * 3.2 + (s2 - 1) * 20 * k, gy - vh * (0.25 + s2 * 0.1)); g.stroke() }
          ellips(g, vx, gy - vh, 34 * k, 5 * k, '#ffd36a')
        })
      }
    } else if (e === 1) {
      heuvels(g, w, gy, 200 * k, 220 * k, '#181c40', r, 0.06)
      // besneeuwde toppen
      heuvels(g, w, gy, 120 * k, 160 * k, '#10132e', r)
      for (i = 0; i < 2; i++) {
        var kx = w * (0.25 + i * 0.45), ky = gy - 110 * k, ks = k * (1 - i * 0.2)
        veelhoek(g, [kx - 120 * ks, gy, kx - 70 * ks, ky + 10 * ks, kx + 150 * ks, ky + 10 * ks, kx + 200 * ks, gy], '#0c0e26')
        g.fillStyle = '#0a0b20'
        ;[[-40, 90, 50], [0, 60, 120], [70, 100, 44], [130, 70, 36]].forEach(function (t) {
          g.fillRect(kx + t[0] * ks, ky - t[1] * ks, t[2] * ks, t[1] * ks + 12 * ks)
          for (var m = 0; m < t[2] / 12; m++) g.fillRect(kx + t[0] * ks + m * 12 * ks, ky - t[1] * ks - 8 * ks, 7 * ks, 8 * ks)
        })
        veelhoek(g, [kx - 44 * ks, ky - 90 * ks, kx - 15 * ks, ky - 140 * ks, kx + 14 * ks, ky - 90 * ks], '#0a0b20')
        gloed(g, '#ffc83d', 10, function () { for (var m2 = 0; m2 < 7; m2++) { g.fillStyle = r() < 0.5 ? '#ffd36a' : '#ffb04a'; g.fillRect(kx + (-30 + r() * 180) * ks, ky - (10 + r() * 70) * ks, 5 * ks, 8 * ks) } })
      }
    } else if (e === 2) {
      // zee met glinstering en verre schepen
      var zy = gy - 70 * k
      var zg = g.createLinearGradient(0, zy, 0, gy); zg.addColorStop(0, '#5a2a5a'); zg.addColorStop(1, '#1a0e2a')
      g.fillStyle = zg; g.fillRect(0, zy, w, gy - zy + 2)
      for (i = 0; i < 160; i++) { var gy2 = zy + Math.pow(r(), 1.4) * (gy - zy); g.fillStyle = 'rgba(255,' + Math.floor(160 + r() * 80) + ',120,' + (0.15 + r() * 0.35) + ')'; g.fillRect(r() * w, gy2, (6 + r() * 26) * k, 1.5) }
      for (i = 0; i < 4; i++) {
        var sx = w * (0.1 + i * 0.25) + r() * 80, ss = k * (0.6 + r() * 0.5), sy = zy + 6 * k
        veelhoek(g, [sx - 70 * ss, sy, sx + 70 * ss, sy, sx + 52 * ss, sy + 18 * ss, sx - 56 * ss, sy + 18 * ss], '#120a1e')
        for (var m3 = 0; m3 < 3; m3++) {
          var mx2 = sx + (m3 - 1) * 40 * ss
          lijn(g, mx2, sy, mx2, sy - (120 - Math.abs(m3 - 1) * 30) * ss, '#120a1e', 3 * ss)
          for (var z = 0; z < 2; z++) veelhoek(g, [mx2 - 22 * ss, sy - (100 - z * 40 - Math.abs(m3 - 1) * 30) * ss, mx2 + 22 * ss, sy - (100 - z * 40 - Math.abs(m3 - 1) * 30) * ss, mx2 + 18 * ss, sy - (66 - z * 40 - Math.abs(m3 - 1) * 30) * ss, mx2 - 18 * ss, sy - (66 - z * 40 - Math.abs(m3 - 1) * 30) * ss], '#1c1028')
        }
        cirkel(g, sx + 40 * ss, sy + 8 * ss, 2.5 * ss, '#ffd36a')
      }
    } else if (e === 3) {
      x = -10
      while (x < w) {
        var bw = (40 + r() * 70) * k, bh = (90 + r() * 200) * k
        g.fillStyle = '#0a0b22'; g.fillRect(x, gy - bh, bw, bh)
        for (var wy = gy - bh + 8 * k; wy < gy - 6; wy += 10 * k) for (var wx = x + 5 * k; wx < x + bw - 6 * k; wx += 9 * k) if (r() < 0.25) { g.fillStyle = rgba(r() < 0.5 ? T.rand : T.glim, 0.35); g.fillRect(wx, wy, 3.5 * k, 4.5 * k) }
        if (r() < 0.3) { lijn(g, x + bw / 2, gy - bh, x + bw / 2, gy - bh - 40 * k, '#0a0b22', 3 * k); gloed(g, '#ff4f6a', 8, function () { cirkel(g, x + bw / 2, gy - bh - 40 * k, 2.5 * k, '#ff4f6a') }) }
        x += bw + r() * 6 * k
      }
    } else {
      heuvels(g, w, gy, 180 * k, 90 * k, '#1a0e30', r, 0.15)
      for (i = 0; i < 40; i++) { var cx2 = r() * w, cr = (4 + r() * 10) * k; ellips(g, cx2, gy - r() * 120 * k, cr, cr * 0.4, 'rgba(192,139,255,.12)') }
    }
    nevel(g, w, gy, 140 * S, T.nevel, 0.35)
    return c
  }
  // dichtbije laag
  if (e === 0) {
    for (i = 0; i < 16; i++) {
      var px = r() * w, ph = (110 + r() * 150) * k, pl = (r() - 0.5) * 30 * k
      g.strokeStyle = '#0a1a10'; g.lineWidth = 7 * k; g.beginPath(); g.moveTo(px, gy); g.quadraticCurveTo(px + pl * 0.3, gy - ph * 0.5, px + pl, gy - ph); g.stroke()
      for (var b = 0; b < 7; b++) {
        var a = -Math.PI / 2 + (b - 3) * 0.5, bl = (44 + r() * 20) * k
        g.fillStyle = b % 2 ? '#0c2214' : '#0e2a18'; g.beginPath(); g.moveTo(px + pl, gy - ph)
        g.quadraticCurveTo(px + pl + Math.cos(a) * bl * 0.6, gy - ph + Math.sin(a) * bl * 0.6 - 16 * k, px + pl + Math.cos(a) * bl, gy - ph + Math.sin(a) * bl + 18 * k)
        g.quadraticCurveTo(px + pl + Math.cos(a) * bl * 0.5, gy - ph + Math.sin(a) * bl * 0.5, px + pl, gy - ph); g.fill()
      }
    }
    for (i = 0; i < 30; i++) { var fx = r() * w, fh = (30 + r() * 50) * k; for (b = 0; b < 5; b++) ellips(g, fx + (b - 2) * 10 * k, gy - fh * (0.4 + Math.abs(b - 2) * -0.1 + 0.3), 7 * k, fh * 0.45, '#0a1c12', (b - 2) * 0.4) }
  } else if (e === 1) {
    for (i = 0; i < 34; i++) {
      var tx = r() * w, th = (70 + r() * 110) * k, tw = th * 0.32
      lijn(g, tx, gy, tx, gy - th * 0.2, '#0a0814', 5 * k)
      for (b = 0; b < 4; b++) veelhoek(g, [tx - tw * (1 - b * 0.18), gy - th * (0.15 + b * 0.2), tx, gy - th * (0.45 + b * 0.2), tx + tw * (1 - b * 0.18), gy - th * (0.15 + b * 0.2)], b % 2 ? '#0c0d22' : '#0e1028')
    }
    var mwx = w * 0.55, mwy = gy - 80 * k
    veelhoek(g, [mwx - 20 * k, gy, mwx - 12 * k, mwy, mwx + 12 * k, mwy, mwx + 20 * k, gy], '#0c0d22')
    for (b = 0; b < 4; b++) { var aa = b * Math.PI / 2 + 0.4; lijn(g, mwx, mwy, mwx + Math.cos(aa) * 60 * k, mwy + Math.sin(aa) * 60 * k, '#0c0d22', 6 * k) }
    gloed(g, '#ffc83d', 8, function () { g.fillStyle = '#ffd36a'; g.fillRect(mwx - 3 * k, mwy + 30 * k, 6 * k, 9 * k) })
  } else if (e === 2) {
    for (i = 0; i < 12; i++) {
      var hx = r() * w, hh = (120 + r() * 120) * k, hl = (20 + r() * 40) * k * (r() < 0.5 ? -1 : 1)
      g.strokeStyle = '#2a140e'; g.lineWidth = 8 * k; g.beginPath(); g.moveTo(hx, gy); g.quadraticCurveTo(hx + hl * 0.1, gy - hh * 0.6, hx + hl, gy - hh); g.stroke()
      for (b = 0; b < 6; b++) {
        var a2 = -Math.PI / 2 + (b - 2.5) * 0.62, bl2 = (56 + r() * 20) * k
        g.strokeStyle = '#1e0e14'; g.lineWidth = 9 * k; g.beginPath(); g.moveTo(hx + hl, gy - hh); g.quadraticCurveTo(hx + hl + Math.cos(a2) * bl2 * 0.6, gy - hh + Math.sin(a2) * bl2 * 0.6 - 12 * k, hx + hl + Math.cos(a2) * bl2, gy - hh + Math.sin(a2) * bl2 + 24 * k); g.stroke()
      }
    }
    for (i = 0; i < 10; i++) { var dx = r() * w; blok(g, dx, gy - 46 * k, 9 * k, 50 * k, 3 * k, '#2a160e'); if (r() < 0.5) { blok(g, dx + 14 * k, gy - 30 * k, 22 * k, 30 * k, 6 * k, '#3a2214'); lijn(g, dx + 14 * k, gy - 20 * k, dx + 36 * k, gy - 20 * k, '#1a0c08', 2 * k) } }
  } else if (e === 3) {
    x = -10
    while (x < w) {
      var bw2 = (60 + r() * 90) * k, bh2 = (60 + r() * 160) * k
      g.fillStyle = '#0e1030'; g.fillRect(x, gy - bh2, bw2, bh2)
      g.fillStyle = '#14163c'; g.fillRect(x, gy - bh2, bw2 * 0.25, bh2)
      for (wy = gy - bh2 + 10 * k; wy < gy - 10; wy += 14 * k) for (wx = x + 8 * k; wx < x + bw2 - 10 * k; wx += 13 * k) if (r() < 0.4) { g.fillStyle = rgba(r() < 0.6 ? T.rand : T.glim, 0.55); g.fillRect(wx, wy, 6 * k, 7 * k) }
      if (r() < 0.35) {
        var nk = r() < 0.5 ? T.rand : T.glim, nw = bw2 * 0.7, ny = gy - bh2 + 16 * k
        gloed(g, nk, 16, function () { g.strokeStyle = nk; g.lineWidth = 2.5 * k; rr(g, x + bw2 * 0.15, ny, nw, 22 * k, 5 * k); g.stroke(); for (var q = 0; q < 4; q++) { g.fillStyle = nk; g.fillRect(x + bw2 * 0.15 + 8 * k + q * nw / 4.5, ny + 7 * k, nw / 7, 8 * k) } })
      }
      x += bw2 + (8 + r() * 40) * k
    }
  } else {
    for (i = 0; i < 22; i++) {
      var kx2 = r() * w, kh = (40 + r() * 110) * k, kk = r() < 0.5 ? T.rand : T.glim
      for (b = 0; b < 3; b++) {
        var bb = (b - 1) * 14 * k, hh2 = kh * (b === 1 ? 1 : 0.6)
        var cg = g.createLinearGradient(0, gy - hh2, 0, gy); cg.addColorStop(0, rgba(kk, 0.55)); cg.addColorStop(1, 'rgba(30,14,48,.9)')
        g.fillStyle = cg; g.beginPath(); g.moveTo(kx2 + bb - 9 * k, gy); g.lineTo(kx2 + bb + (b - 1) * 10 * k, gy - hh2); g.lineTo(kx2 + bb + 9 * k, gy); g.fill()
      }
      radiaal(g, kx2, gy - kh * 0.5, kh * 0.8, kk, 0.12)
    }
  }
  nevel(g, w, gy, 60 * S, T.nevel, 0.3)
  return c
}

// de grond in veldcoördinaten, met versiering per tijdperk
var grondDecor = [], grondE = -1
function maakGrondDecor(e) {
  var r = TS.rng(500 + e), lijst = []
  for (var i = 0; i < 150; i++) lijst.push({ x: -MARGE - 300 + r() * (TS.B + 2 * MARGE + 600), y: GROND + 4 + Math.pow(r(), 1.6) * 70, s: 0.6 + r() * 0.8, v: r(), soort: Math.floor(r() * 4) })
  lijst.sort(function (a, b) { return a.y - b.y })
  return lijst
}
function tekenGrond(g) {
  var e = verE, T = THEMA[e]
  if (grondE !== e) { grondDecor = maakGrondDecor(e); grondE = e }
  var x0 = -MARGE - 400, x1 = TS.B + MARGE + 400, onder = GROND + (H / S)
  var gg = g.createLinearGradient(0, GROND, 0, GROND + 160)
  gg.addColorStop(0, T.grond[0]); gg.addColorStop(0.35, T.grond[1]); gg.addColorStop(1, T.grond[2])
  g.fillStyle = gg; g.fillRect(x0, GROND, x1 - x0, onder - GROND)
  // het pad waar de soldaten over lopen
  g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(x0, GROND + 2, x1 - x0, 16)
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x0, GROND + 18, x1 - x0, 3)
  grondDecor.forEach(function (d) {
    var x = d.x, y = d.y, k = d.s
    if (e === 0) {
      if (d.soort < 2) { for (var b = 0; b < 5; b++) lijn(g, x + b * 3 * k, y, x + b * 3 * k + (b - 2) * 3 * k, y - (8 + (b % 2) * 6) * k, b % 2 ? '#2e5a26' : '#3e7a30', 2 * k) }
      else if (d.soort === 2) { ellips(g, x, y, 9 * k, 5 * k, '#4a3a30'); ellips(g, x - 2 * k, y - 2 * k, 5 * k, 2 * k, '#6a5444') }
      else { lijn(g, x - 8 * k, y, x + 8 * k, y - 2 * k, '#e8dcc0', 3 * k); cirkel(g, x - 9 * k, y, 2.5 * k, '#e8dcc0'); cirkel(g, x + 9 * k, y - 2 * k, 2.5 * k, '#e8dcc0') }
    } else if (e === 1) {
      if (d.soort < 2) blok(g, x, y - 3 * k, 18 * k, 7 * k, 3 * k, d.v < 0.5 ? '#3a3c50' : '#44465c')
      else if (d.soort === 2) { for (b = 0; b < 4; b++) lijn(g, x + b * 3 * k, y, x + b * 3 * k + (b - 1.5) * 2 * k, y - 9 * k, '#24304a', 2 * k) }
      else { lijn(g, x, y, x, y - 10 * k, '#2a4a2a', 1.5 * k); cirkel(g, x, y - 11 * k, 2.5 * k, d.v < 0.5 ? '#ffd36a' : '#ff9ad8') }
    } else if (e === 2) {
      if (d.soort === 0) { g.fillStyle = '#f0d0b0'; g.beginPath(); g.arc(x, y, 5 * k, Math.PI, 0); g.fill(); for (b = 0; b < 3; b++) lijn(g, x, y, x + (b - 1) * 4 * k, y - 4 * k, '#c09070', 1) }
      else if (d.soort === 1) ellips(g, x, y, 12 * k, 2 * k, 'rgba(90,60,30,.35)')
      else if (d.soort === 2) { ellips(g, x, y, 8 * k, 5 * k, '#7a6a5a'); ellips(g, x - 2 * k, y - 2 * k, 4 * k, 2 * k, '#9a8a7a') }
      else { veelhoek(g, [x, y - 5 * k, x + 3 * k, y - 1 * k, x + 7 * k, y - 1 * k, x + 4 * k, y + 2 * k, x + 5 * k, y + 6 * k, x, y + 3 * k, x - 5 * k, y + 6 * k, x - 4 * k, y + 2 * k, x - 7 * k, y - 1 * k, x - 3 * k, y - 1 * k], '#ff8a6a') }
    } else if (e === 3) {
      if (d.soort < 2) { g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1; g.strokeRect(x, y - 4, 40 * k, 10 * k); cirkel(g, x + 3, y - 1, 1.3, 'rgba(255,255,255,.15)') }
      else gloed(g, d.soort === 2 ? T.rand : T.glim, 8, function () { blok(g, x, y, 22 * k, 2, 1, rgba(d.soort === 2 ? T.rand : T.glim, 0.6)) })
    } else {
      if (d.soort < 2) { ellips(g, x, y, 14 * k, 4 * k, 'rgba(0,0,0,.3)'); ellips(g, x, y - 1, 12 * k, 3 * k, 'rgba(192,139,255,.12)') }
      else { var kc = d.soort === 2 ? T.rand : T.glim; gloed(g, kc, 10, function () { veelhoek(g, [x - 4 * k, y, x, y - 14 * k, x + 4 * k, y], rgba(kc, 0.8)) }) }
    }
  })
  gloed(g, T.rand, 12, function () { g.fillStyle = rgba(T.rand, 0.8); g.fillRect(x0, GROND - 1, x1 - x0, 2.5) })
}

// zwevende sfeerdeeltjes (vuurvliegjes, sintels, stof, sterrenstof)
var sfeer = []
function werkSfeerBij(g, dt) {
  var T = THEMA[verE], links = camLinks(), rechts = links + W / S
  while (sfeer.length < 30) sfeer.push({ x: links + Math.random() * (rechts - links), y: GROND - 20 - Math.random() * 300, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 12 - (verE === 0 || verE === 4 ? 8 : 0), f: Math.random() * TAU, k: T.sfeer[Math.floor(Math.random() * 2)], r: 1 + Math.random() * 1.8, l: 4 + Math.random() * 6 })
  g.save(); g.globalCompositeOperation = 'lighter'
  sfeer = sfeer.filter(function (p) {
    p.l -= dt; p.f += dt * 2; p.x += (p.vx + Math.sin(p.f) * 8) * dt; p.y += (p.vy + Math.cos(p.f * 0.7) * 6) * dt
    var a = Math.min(1, p.l / 1.5) * (0.5 + 0.5 * Math.sin(p.f * 2))
    if (verE === 3) { g.globalAlpha = a * 0.6; lijn(g, p.x, p.y, p.x - 2, p.y + 10, p.k, 1) }
    else { g.globalAlpha = a * 0.35; cirkel(g, p.x, p.y, p.r * 3.5, p.k); g.globalAlpha = a; cirkel(g, p.x, p.y, p.r, '#ffffff') }
    return p.l > 0 && p.x > links - 50 && p.x < rechts + 50
  })
  g.restore(); g.globalAlpha = 1
}
var vignet = null
function tekenVignet() {
  if (!vignet || vignet.width !== cv.width || vignet.height !== cv.height) {
    var d = nieuwDoek(W, H); vignet = d[0]
    var vg = d[1].createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.75)
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,10,.55)')
    d[1].fillStyle = vg; d[1].fillRect(0, 0, W, H)
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(vignet, 0, 0)
}

// ── staat ──
var s = null, actief = false, gepauzeerd = false, schud = 0, flits = 0, bannerTimer = null
var deeltjes = [], teksten = [], geesten = [], schudBasis = [0, 0]

function banner(tekst, ms, sub, groot) {
  var b = $('banner')
  b.classList.toggle('groot', !!groot)
  b.innerHTML = tekst + (sub ? '<small>' + sub + '</small>' : '')
  b.classList.add('aan')
  clearTimeout(bannerTimer); bannerTimer = setTimeout(function () { b.classList.remove('aan') }, ms || 1400)
}
function spat(x, y, n, kleuren, kracht, zwaarte, grootte) {
  for (var i = 0; i < n; i++) {
    var a = Math.random() * TAU, v = (0.3 + Math.random()) * (kracht || 160)
    deeltjes.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (kracht || 160) * 0.4, l: 0.5 + Math.random() * 0.5, m: 1, k: kleuren[i % kleuren.length], r: (grootte || 3) * (0.6 + Math.random() * 0.8), z: zwaarte == null ? 500 : zwaarte })
  }
}
var fx = [], rookjes = [], munten = []
function poef(x, y, n, k) { for (var i = 0; i < n; i++) rookjes.push({ x: x + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 50, vy: -20 - Math.random() * 30, r: 6 + Math.random() * 6, g: 26, l: 0.7, m: 0.7, k: k }) }
function knalFx(x, y, maat) {
  fx.push({ s: 'licht', x: x, y: y, r: 130 * maat, l: 0.35, m: 0.35, k: '#ffb04a' })
  fx.push({ s: 'ring', x: x, y: y, r: 10, groei: 320 * maat, l: 0.45, m: 0.45, k: '#fff4d0', dik: 4 * maat })
  for (var i = 0; i < 6 * maat; i++) rookjes.push({ x: x + (Math.random() - 0.5) * 40 * maat, y: y - Math.random() * 30, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 50, r: (10 + Math.random() * 10) * maat, g: 30, l: 1.4, m: 1.4, k: '#4a3e4e' })
}
function muntNaarTeller(x, y) {
  if (munten.length > 14) return
  munten.push({ x0: OX + x * S, y0: OY + y * S, t: -Math.random() * 0.15, duur: 0.75, bx: (Math.random() - 0.5) * 120 })
}
function tekenFx(g, dt) {
  g.save(); g.globalCompositeOperation = 'lighter'
  fx = fx.filter(function (f) {
    f.l -= dt
    var p = 1 - Math.max(0, f.l) / f.m
    if (f.s === 'zwaai') {
      g.globalAlpha = 1 - p
      g.strokeStyle = f.k; g.lineWidth = 7 * (1 - p) + 1; g.beginPath()
      var a0 = f.dir > 0 ? -1.4 : Math.PI + 1.4, a1 = f.dir > 0 ? 0.9 : Math.PI - 0.9
      g.arc(f.x, f.y, f.r, a0 + (a1 - a0) * Math.max(0, p - 0.3), a0 + (a1 - a0) * Math.min(1, p * 1.6), f.dir < 0); g.stroke()
      g.strokeStyle = '#fff'; g.lineWidth = 2.5 * (1 - p); g.stroke()
    } else if (f.s === 'ster') {
      g.globalAlpha = 1 - p; var r = f.r * (0.6 + p * 0.8)
      g.fillStyle = f.k; g.beginPath()
      for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4 + f.x, rr2 = i % 2 ? r * 0.35 : r; g.lineTo(f.x + Math.cos(a) * rr2, f.y + Math.sin(a) * rr2) }
      g.fill(); cirkel(g, f.x, f.y, r * 0.3, '#fff')
    } else if (f.s === 'mond') {
      g.globalAlpha = 1 - p
      radiaal(g, f.x, f.y, 30, f.k, 0.8)
      veelhoek(g, [f.x, f.y - 5, f.x + f.dir * 26, f.y, f.x, f.y + 5], '#fff')
    } else if (f.s === 'ring') {
      if (p <= 0) return true
      g.globalAlpha = Math.max(0, 1 - p); g.strokeStyle = f.k; g.lineWidth = f.dik * (1 - p) + 0.5
      g.beginPath(); g.ellipse(f.x, f.y, f.r + f.groei * p, (f.r + f.groei * p) * 0.55, 0, 0, TAU); g.stroke()
    } else if (f.s === 'licht') {
      g.globalAlpha = 1 - p; radiaal(g, f.x, f.y, f.r, f.k, 0.7)
    }
    return f.l > 0
  })
  g.restore(); g.globalAlpha = 1
}
function tekenRook(g, dt) {
  rookjes = rookjes.filter(function (r) {
    r.l -= dt; r.x += r.vx * dt; r.y += r.vy * dt; r.vx *= 0.97; r.r += r.g * dt
    g.globalAlpha = Math.max(0, r.l / r.m) * 0.45; cirkel(g, r.x, r.y, r.r, r.k)
    return r.l > 0
  })
  g.globalAlpha = 1
}
// munten vliegen in een boogje naar je goudteller
function tekenMunten(dt) {
  if (!munten.length) return
  var doel = $('goud').getBoundingClientRect(), tx = doel.left + 20, ty = doel.top + doel.height / 2
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  munten = munten.filter(function (m) {
    m.t += dt
    if (m.t < 0) return true
    var p = Math.min(1, m.t / m.duur), q = p * p
    var x = m.x0 + (tx - m.x0) * q + Math.sin(p * Math.PI) * m.bx, y = m.y0 + (ty - m.y0) * q - Math.sin(p * Math.PI) * 80
    var sc = 1 - p * 0.35, br = Math.abs(Math.cos(m.t * 14))
    gloed(ctx, '#ffc83d', 10, function () { ellips(ctx, x, y, 8 * sc * Math.max(0.25, br), 8 * sc, '#ffc83d') })
    ellips(ctx, x - 2 * sc * br, y - 2 * sc, 3 * sc * Math.max(0.25, br), 3 * sc, '#fff6c0')
    if (p >= 1) { var gd = $('goud'); gd.classList.remove('pop'); void gd.offsetWidth; gd.classList.add('pop'); if (mag('munt', 60)) toon(1568, 0.06, 'square', 0.02) }
    return p < 1
  })
}
// rook en vuur als een basis het zwaar heeft
function basisSchade(dt) {
  for (var k = 0; k < 2; k++) {
    var z = s.zij[k], hp = z.basis.hp / z.basis.max, bx = TS.BASIS[k], top = GROND - BASIS_H[z.e]
    if (hp < 0.65 && Math.random() < dt * (hp < 0.35 ? 10 : 4)) rookjes.push({ x: bx + (Math.random() - 0.5) * 90, y: top + 30 + Math.random() * 60, vx: 10, vy: -40, r: 8, g: 22, l: 2, m: 2, k: '#2a2430' })
    if (hp < 0.35 && Math.random() < dt * 8) deeltjes.push({ x: bx + (Math.random() - 0.5) * 80, y: top + 40 + Math.random() * 80, vx: (Math.random() - 0.5) * 20, vy: -60, l: 0.8, m: 1, k: Math.random() < 0.5 ? '#ff8a3d' : '#ffc83d', r: 3, z: -40 })
  }
}

var DEEL_KLEUR = [['#8a5a2e', '#c98a5a', '#5bffa0'], ['#9aa4bc', '#e8ecf8', '#ffc83d'], ['#e8e2d0', '#7a5030', '#ffc83d'], ['#7a849c', '#3ef0ff', '#ffc83d'], ['#e8ecf8', '#c08bff', '#7df9ff']]

function verwerk(evs) {
  evs.forEach(function (e) {
    var rd = e.kant ? -1 : 1
    if (e.type === 'slag') {
      Geluid.slag(e.e)
      var br = TS.eenheid(e.e, e.t).breed
      if (e.t === 2 && e.e >= 3) fx.push({ s: 'ster', x: e.x + rd * (br / 2 + 18), y: GROND - 50, r: 18, l: 0.2, m: 0.2, k: KLEUR[e.kant] })
      else fx.push({ s: 'zwaai', x: e.x + rd * br * 0.3, y: GROND - (e.t === 2 ? 70 : 50), dir: rd, r: e.t === 2 ? 40 : 28, l: 0.2, m: 0.2, k: KLEUR[e.kant] })
    } else if (e.type === 'schot') {
      Geluid.schot(e.e)
      if (e.e >= 2) {
        var mx0 = e.x + rd * 44
        fx.push({ s: 'mond', x: mx0, y: GROND - 47, dir: rd, l: 0.09, m: 0.09, k: e.e === 2 ? '#ffd36a' : KLEUR[e.kant] })
        if (e.e === 2) rookjes.push({ x: mx0, y: GROND - 47, vx: rd * 30, vy: -14, r: 4, g: 18, l: 0.7, m: 0.7, k: '#d8d0e8' })
      }
    } else if (e.type === 'torenschot') {
      Geluid.toren()
      var tp = plekPos(e.kant, s.zij[e.kant].e, e.plek)
      fx.push({ s: 'mond', x: tp[0] + rd * 30, y: tp[1] - 18, dir: rd, l: 0.1, m: 0.1, k: e.e === 2 || e.e === 0 ? '#ffd36a' : KLEUR[e.kant] })
      if (e.e === 2) poef(tp[0] + rd * 30, tp[1] - 18, 3, '#d8d0e8')
    } else if (e.type === 'raak') {
      spat(e.x + (Math.random() - 0.5) * 10, GROND - 44 + (Math.random() - 0.5) * 20, 4, ['#fff', '#ffe08a', KLEUR[e.kant]], 110, 350, 2)
      fx.push({ s: 'ster', x: e.x + (Math.random() - 0.5) * 12, y: GROND - 46 + (Math.random() - 0.5) * 24, r: 9, l: 0.12, m: 0.12, k: '#fff' })
    }
    else if (e.type === 'basis') { schudBasis[e.kant] = 0.25; if (e.kant === 0) alarm = 1.5; Geluid.basis(); var bxr = TS.BASIS[e.kant] + (e.kant ? -56 : 56), byr = GROND - 30 - Math.random() * 90; spat(bxr, byr, 3, ['#fff', '#ffc83d', '#8a7a7a'], 140, 450, 2.5); fx.push({ s: 'ster', x: bxr, y: byr, r: 12, l: 0.15, m: 0.15, k: '#ffe08a' }) }
    else if (e.type === 'dood') {
      Geluid.dood()
      spat(e.x, GROND - 34, 12, DEEL_KLEUR[e.e].concat(KLEUR[e.kant]), 170, 500, 3)
      var dr = e.kant ? 1 : -1
      geesten.push({ x: e.x, y: 0, vx: dr * 70, vy: -260, rot: 0, vr: 5, e: e.e, t: e.t, kant: e.kant, l: 0.9 })
      poef(e.x, GROND - 30, 5, '#d8d0e8')
      if (e.kant === 1) muntNaarTeller(e.x, GROND - 50)
      if (e.kant === 1) {
        var E = TS.eenheid(e.e, e.t)
        teksten.push({ x: e.x, y: GROND - 90, tekst: '+' + Math.round(E.prijs * 0.25 * s.zij[0].m.inkomen), k: '#ffc83d', l: 1 })
      }
    } else if (e.type === 'tijdperk') {
      if (e.kant === 0) {
        Geluid.tijdperk(); flits = 0.6; banner(TS.TIJDPERKEN[e.e].naam + '!', 2400, 'Nieuwe soldaten, een nieuwe toren en een nieuwe superaanval', true)
        lagenOud = lagen; oudT = 1.6; lagen = null; tekenIconen()
        for (var pr = 0; pr < 4; pr++) fx.push({ s: 'ring', x: TS.BASIS[0], y: GROND - 90, r: 20, groei: 260 + pr * 120, l: 1 + pr * 0.25, m: 1 + pr * 0.25, k: pr % 2 ? '#ffc83d' : KLEUR[0], dik: 6 })
        spat(TS.BASIS[0], GROND - 120, 50, ['#fff', '#ffc83d', KLEUR[0]], 380, -60, 3.5)
      }
      else banner('De computer gaat naar de ' + TS.TIJDPERKEN[e.e].naam, 1800)
    } else if (e.type === 'super') { Geluid.super(); banner(TS.TIJDPERKEN[e.e].super + '!', 1400, e.kant ? 'van de computer' : '') }
    else if (e.type === 'megabom') { Geluid.super(); banner('Megabom!', 1400, e.kant ? 'van de computer' : '') }
    else if (e.type === 'knal') {
      Geluid.knal()
      if (e.mega) { Geluid.mega(); schud = 0.8; flits = 0.5; spat(e.x, GROND - 60, 60, ['#fff', '#ffc83d', '#ff8a3d', KLEUR[e.kant]], 520, 600, 6); knalFx(e.x, GROND - 40, 3) }
      else { schud = Math.max(schud, 0.2); spat(e.x, GROND - 10, 18, ['#fff', '#ffc83d', '#ff8a3d', '#5a4a4a'], 260, 600, 4); knalFx(e.x, GROND - 10, 1) }
    } else if (e.type === 'toren' && e.kant === 0) Geluid.bouw()
    else if (e.type === 'klaar') setTimeout(einde, 1600)
  })
}

// ── tekenen van de slag ──
function kogelY(b, p) {
  var y0 = b.bron === 'toren' ? plekPos(b.kant, s.zij[b.kant].e, b.plek)[1] - 18 : GROND - 44
  var y1 = b.doel === 'basis' ? GROND - 80 : GROND - 36
  var boog = b.e <= 2 ? Math.min(150, Math.abs(b.doelX - b.x0) * (b.e === 0 ? 0.35 : 0.2)) : 0
  return y0 + (y1 - y0) * p - Math.sin(Math.PI * p) * boog
}
function tekenKogel(g, b) {
  var p = Math.min(1, b.t / b.duur), x = b.x0 + (b.doelX - b.x0) * p, y = kogelY(b, p), team = KLEUR[b.kant]
  // spoor achter de kogel
  b.spoor = b.spoor || []; b.spoor.push(x, y); if (b.spoor.length > 16) b.spoor.splice(0, 2)
  if (b.spoor.length >= 4) {
    var sk = b.e >= 3 ? team : b.e === 1 ? '#ffffff' : '#d8d0e8', sa = b.e >= 3 ? 0.55 : 0.25
    if (b.e >= 3) { g.save(); g.globalCompositeOperation = 'lighter' }
    for (var i = 2; i < b.spoor.length; i += 2) lijn(g, b.spoor[i - 2], b.spoor[i - 1], b.spoor[i], b.spoor[i + 1], rgba(sk.length === 7 ? sk : '#ffffff', sa * i / b.spoor.length), (b.bron === 'toren' ? 6 : 3.5) * i / b.spoor.length)
    if (b.e >= 3) g.restore()
  }
  var p2 = Math.max(0, p - 0.06), x2 = b.x0 + (b.doelX - b.x0) * p2, y2 = kogelY(b, p2), a = Math.atan2(y - y2, x - x2)
  if (b.e === 0) cirkel(g, x, y, b.bron === 'toren' ? 7 : 3.5, '#8a8494')
  else if (b.e === 1) { g.save(); g.translate(x, y); g.rotate(a); lijn(g, -18, 0, 4, 0, '#c8a878', 2); veelhoek(g, [4, -3, 10, 0, 4, 3], '#e8ecf8'); lijn(g, -18, -3, -13, 0, team, 2); lijn(g, -18, 3, -13, 0, team, 2); g.restore() }
  else if (b.e === 2) cirkel(g, x, y, b.bron === 'toren' ? 6.5 : 2.6, '#2a2a3a')
  else gloed(g, team, 12, function () { g.save(); g.translate(x, y); g.rotate(a); blok(g, -14, -2, 22, 4, 2, b.e === 4 ? '#fff' : team); if (b.e === 4) cirkel(g, 6, 0, 4.5, team); g.restore() })
}
function tekenEffect(g, f) {
  var dir = f.kant ? -1 : 1, team = KLEUR[f.kant], t = performance.now() / 1000
  if (f.soort === 'mega') {
    var p = Math.min(1, f.t / 1.2), x = f.x - dir * (1 - p) * 300, y = BOVEN - 200 + (GROND - 80 - BOVEN + 200) * p * p
    for (var i = 0; i < 8; i++) cirkel(g, x - dir * (-i * 10) * -1 - dir * i * 9, y - i * 14, 16 - i * 1.6, rgba('#ff8a3d', 0.5 - i * 0.05))
    gloed(g, '#ffc83d', 30, function () { cirkel(g, x, y, 22, '#ffe08a'); cirkel(g, x, y, 14, '#fff') })
    return
  }
  if (f.soort === 'regen') {
    f.vallen.forEach(function (v) {
      if (v.klaar || f.t < v.t - 0.7) return
      var q = 1 - (v.t - f.t) / 0.7, vx = v.x - dir * (1 - q) * 160, vy = BOVEN - 120 + (GROND - 10 - BOVEN + 120) * q
      cirkel(g, vx, vy, 9, '#1c1a2a'); cirkel(g, vx - 2, vy - 2, 3, 'rgba(255,255,255,.35)')
      lijn(g, vx, vy, vx - dir * 26, vy - 40, 'rgba(255,200,120,.35)', 4)
    })
    return
  }
  var x2 = f.x
  if (f.e === 0) {
    // mammoetkudde
    for (var m = 0; m < 4; m++) {
      var mx = x2 - dir * m * 70, bob = Math.abs(Math.sin(t * 14 + m)) * 4
      g.save(); g.translate(mx, GROND - bob); if (f.kant) g.scale(-1, 1)
      poten(g, [-22, 14, -12, 22], -24, t + m, 22, '#5a3a2a', 9, 4)
      ellips(g, 0, -40, 32, 24, '#6a4430'); ellips(g, -6, -52, 22, 12, '#7a5038')
      ellips(g, 28, -46, 14, 16, '#6a4430')
      g.strokeStyle = '#6a4430'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(36, -40); g.quadraticCurveTo(46, -20, 40, -8); g.stroke()
      g.strokeStyle = '#f0e6d0'; g.lineWidth = 4; g.beginPath(); g.moveTo(30, -34); g.quadraticCurveTo(48, -30, 50, -44); g.stroke()
      cirkel(g, 30, -52, 2.2, '#141026')
      g.restore()
      if (Math.random() < 0.3) spat(mx - dir * 20, GROND - 2, 1, ['#8a7a6a'], 60, 200, 4)
    }
  } else if (f.e === 1) {
    // draak die vuur spuwt
    var dy = GROND - 210 + Math.sin(t * 3) * 10, fl = Math.sin(t * 12)
    g.save(); g.translate(x2, dy); if (f.kant) g.scale(-1, 1)
    gloed(g, '#ff8a3d', 20, function () { veelhoek(g, [30, 10, -10, 190, 60, 190], 'rgba(255,138,61,.35)'); veelhoek(g, [30, 10, 10, 190, 44, 190], 'rgba(255,220,120,.4)') })
    veelhoek(g, [-10, -6, -40, -60 - fl * 30, 10, -14], '#5a1a3a')
    ellips(g, 0, 0, 44, 16, '#8a2a4a'); veelhoek(g, [-40, 0, -80, -10, -40, 8], '#8a2a4a')
    lijn(g, 30, -6, 46, -22, '#8a2a4a', 12); ellips(g, 54, -24, 14, 9, '#8a2a4a')
    cirkel(g, 58, -27, 2.5, '#ffc83d'); veelhoek(g, [48, -32, 44, -44, 54, -33], '#f0e6d0')
    veelhoek(g, [0, -8, -20, -70 + fl * 30, 24, -14], '#a83a5a')
    g.restore()
    if (Math.random() < 0.8) spat(x2 + dir * 20, GROND - 30, 2, ['#ff8a3d', '#ffc83d'], 60, -40, 4)
  } else if (f.e === 3) {
    // EMP-golf
    gloed(g, team, 30, function () {
      g.strokeStyle = rgba(team, 0.85); g.lineWidth = 5
      g.beginPath(); for (var yy = BOVEN + 60; yy <= GROND; yy += 14) g.lineTo(x2 + (Math.random() - 0.5) * 22, yy); g.stroke()
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.beginPath(); for (yy = BOVEN + 60; yy <= GROND; yy += 14) g.lineTo(x2 + (Math.random() - 0.5) * 14, yy); g.stroke()
    })
  } else {
    // satellietlaser
    var sy = BOVEN - 60
    g.save(); g.globalCompositeOperation = 'lighter'
    var lg = g.createLinearGradient(x2 - 30, 0, x2 + 30, 0); lg.addColorStop(0, rgba(team, 0)); lg.addColorStop(0.5, rgba(team, 0.7)); lg.addColorStop(1, rgba(team, 0))
    g.fillStyle = lg; g.fillRect(x2 - 30, sy, 60, GROND - sy)
    g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(x2 - 4, sy, 8, GROND - sy)
    g.restore()
    blok(g, x2 - 14, sy - 14, 28, 18, 4, '#dfe4f2'); blok(g, x2 - 46, sy - 10, 28, 10, 2, '#3a5aa8'); blok(g, x2 + 18, sy - 10, 28, 10, 2, '#3a5aa8')
    spat(x2, GROND - 4, 2, ['#fff', team], 140, 300, 3)
  }
}

function tekenSlag(dt) {
  tekenAchtergrond(s.zij[0].e)
  var sx = schud > 0 ? (Math.random() - 0.5) * 14 * schud * dpr : 0, sy = schud > 0 ? (Math.random() - 0.5) * 10 * schud * dpr : 0
  ctx.setTransform(dpr * S, 0, 0, dpr * S, dpr * OX + sx, dpr * OY + sy)
  var g = ctx
  tekenGrond(g)

  // vlag bij "houd stand"
  if (s.zij[0].houd) {
    g.setLineDash([6, 8]); lijn(g, TS.HOUD_X + 20, GROND - 120, TS.HOUD_X + 20, GROND, rgba('#5bffa0', 0.5), 2); g.setLineDash([])
    lijn(g, TS.HOUD_X + 20, GROND, TS.HOUD_X + 20, GROND - 130, '#c8d0e4', 3)
    var wv = Math.sin(performance.now() / 250) * 4
    gloed(g, '#5bffa0', 10, function () { veelhoek(g, [TS.HOUD_X + 20, GROND - 130, TS.HOUD_X + 58, GROND - 122 + wv, TS.HOUD_X + 20, GROND - 108], '#5bffa0') })
  }
  for (var k = 0; k < 2; k++) { schudBasis[k] = Math.max(0, schudBasis[k] - dt); tekenBasis(g, k, s.zij[k], schudBasis[k] > 0 ? (Math.random() - 0.5) * 6 : 0) }

  // soldaten, achteraan eerst; bij een basis staan ze iets verspreid
  var lijst = s.eenheden.slice().sort(function (a, b) { return (a.id % 3) - (b.id % 3) || a.id - b.id })
  lijst.forEach(function (u) {
    var dy = u.opBasis ? ((u.id % 3) - 1) * 7 : 0, bw0 = u.S.breed * 1.5
    g.drawImage(grondGloed[u.kant], u.x - bw0, GROND - 4 + dy, bw0 * 2, 14)
    ellips(g, u.x, GROND + 2 + dy, u.S.breed * 0.55, 4.5, 'rgba(0,0,0,.45)')
    var sp = soldaatPlaatje(u.e, u.t, u.kant, u.anim, u.slag, u.stun > 0 ? 'wacht' : u.staat)
    g.save(); g.translate(u.x, GROND + dy); if (u.kant) g.scale(-1, 1)
    stempel(g, sp)
    if (u.flits > 0) { g.globalAlpha = Math.min(1, u.flits * 7); g.drawImage(witVan(sp), sp.x, sp.y, sp.w, sp.h) }
    g.restore()
    if (u.staat === 'loop' && Math.random() < dt * (u.t === 2 ? 6 : 2.5)) rookjes.push({ x: u.x - (u.kant ? -1 : 1) * 10, y: GROND - 2, vx: (u.kant ? 1 : -1) * 14, vy: -8, r: 3, g: 10, l: 0.5, m: 0.5, k: '#c8b8a8' })
    if (u.stun > 0) for (var v = 0; v < 2; v++) lijn(g, u.x - 10 + Math.random() * 20, GROND - 80 + Math.random() * 30, u.x - 10 + Math.random() * 20, GROND - 60 + Math.random() * 30, '#7df9ff', 1.5)
    if (u.hp < u.S.hp) {
      var bw = Math.max(26, u.S.breed * 0.8), hy = GROND - (u.t === 2 ? 108 : 88) + dy
      blok(g, u.x - bw / 2, hy, bw, 5, 2.5, 'rgba(0,0,0,.55)')
      blok(g, u.x - bw / 2, hy, bw * Math.max(0, u.hp / u.S.hp), 5, 2.5, KLEUR[u.kant])
    }
  })
  // wie verslagen is, tuimelt achterover en vervaagt
  geesten = geesten.filter(function (q) {
    q.l -= dt; q.vy += 900 * dt; q.y += q.vy * dt; q.x += q.vx * dt; q.rot += q.vr * dt
    if (q.y > 0) { q.y = 0; q.vy *= -0.25; q.vx *= 0.5; q.vr *= 0.4 }
    var sp = soldaatPlaatje(q.e, q.t, q.kant, 0, 0, 'wacht')
    g.save(); g.globalAlpha = Math.max(0, Math.min(1, q.l / 0.4)); g.translate(q.x, GROND + q.y); if (q.kant) g.scale(-1, 1); g.rotate(-q.rot)
    stempel(g, sp); g.globalAlpha *= 0.5; g.drawImage(witVan(sp), sp.x, sp.y, sp.w, sp.h); g.restore()
    return q.l > 0
  })
  tekenRook(g, dt)
  s.kogels.forEach(function (b) { tekenKogel(g, b) })
  s.effecten.forEach(function (f) { tekenEffect(g, f) })
  tekenFx(g, dt)
  if (!gepauzeerd) basisSchade(dt)

  // levensbalken van de bases
  for (k = 0; k < 2; k++) {
    var z = s.zij[k], bx = TS.BASIS[k], by = GROND - BASIS_H[z.e] - 64, bw2 = 150
    blok(g, bx - bw2 / 2, by, bw2, 12, 6, 'rgba(0,0,0,.6)')
    gloed(g, KLEUR[k], 10, function () { blok(g, bx - bw2 / 2 + 2, by + 2, (bw2 - 4) * Math.max(0, z.basis.hp / z.basis.max), 8, 4, KLEUR[k]) })
    g.fillStyle = '#eef3ff'; g.font = '700 13px Outfit, sans-serif'; g.textAlign = 'center'
    g.fillText((k ? 'Computer · ' : 'Jij · ') + TS.TIJDPERKEN[z.e].naam, bx, by - 6)
  }

  deeltjes = deeltjes.filter(function (d) {
    d.l -= dt; d.vy += d.z * dt; d.x += d.vx * dt; d.y += d.vy * dt
    if (d.y > GROND + 4 && d.z > 0) { d.y = GROND + 4; d.vy *= -0.3; d.vx *= 0.7 }
    g.globalAlpha = Math.max(0, Math.min(1, d.l * 2)); cirkel(g, d.x, d.y, d.r, d.k); g.globalAlpha = 1
    return d.l > 0
  })
  teksten = teksten.filter(function (q) {
    q.l -= dt; q.y -= 40 * dt
    g.globalAlpha = Math.max(0, Math.min(1, q.l * 2)); g.fillStyle = q.k; g.font = '15px "Russo One", sans-serif'; g.textAlign = 'center'; g.fillText(q.tekst, q.x, q.y); g.globalAlpha = 1
    return q.l > 0
  })
  werkSfeerBij(g, dt)
  tekenVignet()
  // je basis wordt aangevallen terwijl je ergens anders kijkt
  alarm = Math.max(0, alarm - dt)
  if (alarm > 0 && (TS.BASIS[0] + 60) * S + OX < 0) {
    var ay = OY + (GROND - 80) * S, ap = 0.6 + 0.4 * Math.sin(performance.now() / 120)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    gloed(ctx, '#ff4f6a', 18, function () { veelhoek(ctx, [14, ay, 40, ay - 22, 40, ay + 22], rgba('#ff4f6a', ap)) })
    ctx.fillStyle = '#fff'; ctx.font = '800 13px Outfit, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Je basis!', 46, ay + 5)
  }
  if (flits > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(255,255,255,' + flits * 0.6 + ')'; ctx.fillRect(0, 0, cv.width, cv.height); flits -= dt }
  schud = Math.max(0, schud - dt)
  tekenMunten(dt)
  tekenKaart()
}
var verE = 0, alarm = 0, lagenOud = null, oudT = 0
function tekenAchtergrond(e) {
  OX = camOX()
  if (!lagen || lagenE !== e) { verE = e; lagen = { lucht: bouwLucht(e), ver: bouwLaag(e, 0.2, false), mid: bouwLaag(e, 0.5, true) }; lagenE = e }
  verE = e
  var p = W / S >= TS.B + 2 * MARGE ? 0 : (camX + MARGE) * S * dpr
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(lagen.lucht, 0, 0)
  ctx.drawImage(lagen.ver, -Math.round(p * 0.2), 0)
  ctx.drawImage(lagen.mid, -Math.round(p * 0.5), 0)
  if (lagenOud && oudT > 0) {
    oudT -= 1 / 60
    ctx.globalAlpha = Math.max(0, Math.min(1, oudT / 1.2))
    ctx.drawImage(lagenOud.lucht, 0, 0); ctx.drawImage(lagenOud.ver, -Math.round(p * 0.2), 0); ctx.drawImage(lagenOud.mid, -Math.round(p * 0.5), 0)
    ctx.globalAlpha = 1
  } else lagenOud = null
  tekenWeer(e)
}
// weer per tijdperk, in schermcoördinaten
var weer = { t: 0, vogels: [], vallend: [], regen: [] }, weerLaatst = performance.now()
function tekenWeer(e) {
  var nu = performance.now(), dt = Math.min(0.05, (nu - weerLaatst) / 1000); weerLaatst = nu
  var gy = grondY(), k = S
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (e === 2 || e === 1) {
    // meeuwen boven zee, vleermuizen bij de ridders
    while (weer.vogels.length < (e === 2 ? 5 : 3)) weer.vogels.push({ x: -40 - Math.random() * W, y: gy * (0.25 + Math.random() * 0.35), v: 30 + Math.random() * 40, f: Math.random() * 6, m: 0.7 + Math.random() * 0.6 })
    weer.vogels.forEach(function (v) {
      v.x += v.v * dt; v.f += dt * (e === 2 ? 7 : 14); if (v.x > W + 40) { v.x = -40; v.y = gy * (0.25 + Math.random() * 0.35) }
      var w = 12 * v.m * k, fl = Math.sin(v.f) * 6 * v.m * k
      ctx.strokeStyle = e === 2 ? 'rgba(40,16,40,.8)' : 'rgba(8,6,20,.9)'; ctx.lineWidth = 2 * v.m * k; ctx.beginPath()
      ctx.moveTo(v.x - w, v.y - fl); ctx.quadraticCurveTo(v.x - w * 0.4, v.y - 4 * k, v.x, v.y); ctx.quadraticCurveTo(v.x + w * 0.4, v.y - 4 * k, v.x + w, v.y - fl); ctx.stroke()
    })
  } else if (e === 3) {
    // regen in de neonstad
    while (weer.regen.length < 140) weer.regen.push({ x: Math.random() * W * 1.2, y: Math.random() * H, v: 700 + Math.random() * 400 })
    ctx.strokeStyle = 'rgba(170,200,255,.28)'; ctx.lineWidth = 1; ctx.beginPath()
    weer.regen.forEach(function (d) {
      d.y += d.v * dt; d.x -= d.v * 0.18 * dt
      if (d.y > gy + 6) { if (Math.random() < 0.3) weer.vallend.push({ x: d.x, y: gy + 2 + Math.random() * 20, l: 0.25 }); d.y = -20; d.x = Math.random() * W * 1.2 }
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 3, d.y - 14)
    })
    ctx.stroke()
    weer.vallend = weer.vallend.filter(function (sp) { sp.l -= dt; ctx.strokeStyle = 'rgba(190,220,255,' + sp.l * 2 + ')'; ctx.beginPath(); ctx.ellipse(sp.x, sp.y, (0.25 - sp.l) * 40, (0.25 - sp.l) * 8, 0, 0, TAU); ctx.stroke(); return sp.l > 0 })
  } else if (e === 4 || e === 0) {
    // vallende sterren
    weer.t -= dt
    if (weer.t <= 0) { weer.t = 1.5 + Math.random() * 3; weer.vallend.push({ x: Math.random() * W, y: Math.random() * gy * 0.4, l: 0.8 }) }
    weer.vallend = weer.vallend.filter(function (st) {
      st.l -= dt; st.x += 500 * dt; st.y += 200 * dt
      var lg = ctx.createLinearGradient(st.x, st.y, st.x - 90, st.y - 36); lg.addColorStop(0, 'rgba(255,255,255,' + st.l + ')'); lg.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.strokeStyle = lg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(st.x, st.y); ctx.lineTo(st.x - 90, st.y - 36); ctx.stroke()
      return st.l > 0
    })
  }
}

// ── knoppen ──
function icoon(c, fn) {
  c.width = 92; c.height = 92
  var g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 92, 92); g.lineCap = 'round'; g.lineJoin = 'round'
  fn(g)
}
var soldaatKnoppen = []
function maakKnoppen() {
  var box = $('soldaten'); box.innerHTML = ''
  for (var t = 0; t < 3; t++) (function (t) {
    var b = document.createElement('button'); b.className = 'dk'
    b.innerHTML = '<kbd>' + (t + 1) + '</kbd><canvas></canvas><span class="nm"></span><span class="pr"></span>'
    b.onclick = function () { koopSoldaat(t) }
    box.appendChild(b); soldaatKnoppen.push(b)
  })(t)
}
function tekenIconen() {
  var e = s ? s.zij[0].e : 0
  soldaatKnoppen.forEach(function (b, t) {
    var E = TS.eenheid(e, t)
    var sp = maakPlaatje(t === 2 ? KADERS['z' + e] : KADERS.m, 2, KLEUR[0], function (g) { tekenSoldaat(g, e, t, 0, 0, 0, 'wacht') })
    icoon(b.querySelector('canvas'), function (g) { var sc = t === 2 ? (e === 4 ? 0.6 : 0.62) : 0.8; g.translate(t === 2 ? 40 : 42, 86); g.scale(sc, sc); stempel(g, sp) })
    b.querySelector('.nm').textContent = E.naam
    b.querySelector('.pr').textContent = E.prijs
  })
  icoon($('ktoren').querySelector('canvas'), function (g) { g.translate(46, 76); g.scale(1.6, 1.6); blok(g, -18, 0, 36, 8, 3, '#2a2840'); tekenToren(g, e, KLEUR[0], -0.15) })
  icoon($('kplek').querySelector('canvas'), function (g) {
    g.translate(46, 64); blok(g, -26, 0, 52, 10, 4, '#4a4868'); g.setLineDash([5, 5]); g.strokeStyle = KLEUR[0]; g.lineWidth = 2; rr(g, -22, -34, 44, 32, 7); g.stroke(); g.setLineDash([])
    lijn(g, 0, -26, 0, -10, '#fff', 4); lijn(g, -8, -18, 8, -18, '#fff', 4)
  })
  icoon($('ksuper').querySelector('canvas'), function (g) { superIcoon(g, e) })
  $('ksuper').querySelector('.nm').textContent = TS.TIJDPERKEN[e].super
  werkKnoppenBij(true)
}
function superIcoon(g, e) {
  g.translate(46, 46)
  if (e === 0) { ellips(g, -4, 4, 22, 16, '#6a4430'); ellips(g, 18, 0, 10, 12, '#6a4430'); g.strokeStyle = '#f0e6d0'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(20, 6); g.quadraticCurveTo(32, 8, 32, -4); g.stroke(); lijn(g, -14, 16, -14, 28, '#5a3a2a', 7); lijn(g, 8, 16, 8, 28, '#5a3a2a', 7) }
  else if (e === 1) { veelhoek(g, [-6, -4, -26, -34, 8, -8], '#a83a5a'); ellips(g, 0, 4, 24, 10, '#8a2a4a'); ellips(g, 26, -4, 9, 6, '#8a2a4a'); gloed(g, '#ff8a3d', 12, function () { veelhoek(g, [30, 0, 22, 30, 40, 26], '#ffc83d') }) }
  else if (e === 2) { for (var i = 0; i < 3; i++) { cirkel(g, -16 + i * 16, -12 + i * 10, 8, '#1c1a2a'); lijn(g, -16 + i * 16 - 6, -12 + i * 10 - 10, -16 + i * 16 - 16, -12 + i * 10 - 26, 'rgba(255,200,120,.6)', 4) } }
  else if (e === 3) gloed(g, '#3ef0ff', 14, function () { veelhoek(g, [4, -32, -14, 4, 0, 4, -6, 32, 16, -6, 2, -6], '#3ef0ff') })
  else { blok(g, -10, -34, 20, 12, 3, '#dfe4f2'); blok(g, -30, -32, 16, 8, 2, '#3a5aa8'); blok(g, 14, -32, 16, 8, 2, '#3a5aa8'); gloed(g, '#3ef0ff', 14, function () { blok(g, -4, -22, 8, 50, 3, '#3ef0ff') }) }
}
function evoIcoon(g, z) {
  g.translate(46, 46)
  if (z.e >= s.def.maxE) {
    gloed(g, '#ff8a3d', 14, function () { cirkel(g, 0, 4, 18, '#2a2a3a') })
    lijn(g, 8, -12, 16, -24, '#c8a878', 3); gloed(g, '#ffc83d', 10, function () { cirkel(g, 17, -26, 4, '#ffe08a') })
    cirkel(g, -6, -2, 4, 'rgba(255,255,255,.35)')
  } else {
    var e = z.e + 1
    g.save(); g.translate(0, 40); g.scale(0.62, 0.62); tekenSoldaat(g, e, 0, 0, 0, 0, 'wacht'); g.restore()
    gloed(g, '#ffc83d', 8, function () { veelhoek(g, [-34, -6, -22, -18, -22, -10, -12, -10, -12, -2, -22, -2, -22, 6], '#ffc83d') })
  }
}
var vorigeEvo = null, vorigKan = false
function werkKnoppenBij(heel) {
  if (!s) return
  var z = s.zij[0], e = z.e
  $('goudtal').textContent = Math.floor(z.goud)
  $('inkomen').textContent = '+' + Math.round(TS.inkomen(z) * 10) / 10 + '/s'
  soldaatKnoppen.forEach(function (b, t) {
    var E = TS.eenheid(e, t)
    b.classList.toggle('arm', z.goud < E.prijs || z.rij.length >= TS.MAX_RIJ)
  })
  var T = TS.torenInfo(e), plek = TS.torenPlek(z)
  $('ktoren').querySelector('.pr').textContent = T.prijs
  $('ktoren').querySelector('.nm').textContent = T.naam
  $('ktoren').classList.toggle('arm', plek < 0 || z.goud < T.prijs)
  var pp = TS.plekPrijs(z)
  $('kplek').classList.toggle('verborgen', pp == null)
  if (pp != null) { $('kplek').querySelector('.pr').textContent = pp; $('kplek').classList.toggle('arm', z.goud < pp) }
  $('khoud').classList.toggle('houd', z.houd)
  $('khoud').querySelector('.nm').textContent = z.houd ? 'Houd stand' : 'Vooruit!'
  if (heel || $('khoud').dataset.h !== String(z.houd)) {
    $('khoud').dataset.h = String(z.houd)
    icoon($('khoud').querySelector('canvas'), function (g) {
      g.translate(46, 46)
      if (z.houd) { lijn(g, -14, 30, -14, -30, '#c8d0e4', 4); gloed(g, '#5bffa0', 10, function () { veelhoek(g, [-14, -30, 22, -20, -14, -6], '#5bffa0') }) }
      else gloed(g, KLEUR[0], 10, function () { veelhoek(g, [-26, -10, 4, -10, 4, -24, 30, 0, 4, 24, 4, 10, -26, 10], KLEUR[0]) })
    })
  }
  $('ksuper').querySelector('.vul').style.height = (z.lading * 100) + '%'
  $('ksuper').classList.toggle('klaar', z.lading >= 1)
  $('ksuper').classList.toggle('arm', z.lading < 1)
  var max = z.e >= s.def.maxE, nodig = max ? TS.megaNodig(e) : TS.xpNodig(e)
  $('kevo').querySelector('.vul').style.height = Math.min(100, z.xp / nodig * 100) + '%'
  var kan = max ? TS.kanMegabom(s, 0) : TS.kanEvolueren(s, 0), deel = Math.min(1, z.xp / nodig)
  $('kevo').classList.toggle('klaar', kan); $('kevo').classList.toggle('arm', !kan)
  // balk bovenin: hoe ver je bent tot het volgende tijdperk (of de megabom)
  var doelNaam = max ? 'Megabom' : TS.TIJDPERKEN[e + 1].naam
  $('xpvul').style.width = Math.round(deel * 100) + '%'
  $('xptekst').textContent = kan ? (max ? 'Megabom klaar! Tik op de bom' : 'Klaar! Tik op ' + doelNaam) : (max ? 'Megabom' : 'Op naar de ' + doelNaam) + ' · ' + Math.floor(deel * 100) + '%'
  $('xpbalk').classList.toggle('klaar', kan)
  if (kan && !vorigKan) {
    Geluid.klaar()
    banner(max ? 'Megabom klaar!' : 'Klaar voor de ' + doelNaam + '!', 2200, max ? 'Tik op de bom rechtsonder' : 'Tik op de gouden knop rechtsonder')
  }
  vorigKan = kan
  var pijl = $('evopijl')
  pijl.classList.toggle('aan', kan)
  if (kan) { var kr = $('kevo').getBoundingClientRect(); pijl.style.left = (kr.left + kr.width / 2) + 'px'; pijl.style.top = (kr.top - 8) + 'px' }
  var evoSleutel = e + '|' + max
  if (heel || vorigeEvo !== evoSleutel) {
    vorigeEvo = evoSleutel
    $('kevo').querySelector('.nm').textContent = max ? 'Megabom' : TS.TIJDPERKEN[e + 1].naam
    icoon($('kevo').querySelector('canvas'), function (g) { evoIcoon(g, z) })
  }
  // de rij met soldaten die getraind worden
  var rij = $('rij'), html = ''
  for (var i = 0; i < TS.MAX_RIJ; i++) {
    if (i < z.rij.length) {
      var E = TS.eenheid(z.rij[i].e, z.rij[i].t), p = i === 0 ? Math.max(0, Math.min(1, 1 - z.trainT / E.train)) : 0
      html += '<i class="vol"><b style="height:' + Math.round(p * 100) + '%"></b></i>'
    } else html += '<i></i>'
  }
  rij.innerHTML = html
}
function koopSoldaat(t) {
  if (!s || !actief) return
  audio()
  if (TS.koop(s, 0, t)) Geluid.koop(); else Geluid.nee()
  werkKnoppenBij()
}
$('ktoren').onclick = function () { if (!s || !actief) return; audio(); if (!TS.toren(s, 0)) Geluid.nee(); werkKnoppenBij() }
$('kplek').onclick = function () { if (!s || !actief) return; audio(); if (TS.plek(s, 0)) Geluid.bouw(); else Geluid.nee(); werkKnoppenBij() }
$('khoud').onclick = function () { if (!s || !actief) return; audio(); TS.houding(s, !s.zij[0].houd); Geluid.koop(); werkKnoppenBij() }
$('ksuper').onclick = function () { if (!s || !actief) return; audio(); if (!TS.superAanval(s, 0)) Geluid.nee(); werkKnoppenBij() }
$('kevo').onclick = function () {
  if (!s || !actief) return
  audio()
  var ok = s.zij[0].e >= s.def.maxE ? TS.megabom(s, 0) : TS.evolueer(s, 0)
  if (!ok) Geluid.nee()
  werkKnoppenBij()
}
document.addEventListener('keydown', function (e) {
  toetsen[e.key] = true
  if (!actief || gepauzeerd) return
  var k = e.key.toLowerCase()
  if (k === '1' || k === '2' || k === '3') koopSoldaat(+k - 1)
  else if (k === 't') $('ktoren').onclick()
  else if (k === 'p') $('kplek').onclick()
  else if (k === 'h') $('khoud').onclick()
  else if (k === 's') $('ksuper').onclick()
  else if (k === 'e') $('kevo').onclick()
  else if (k === ' ' || k === 'escape') $('pauze').onclick(e)
})

// ── schermen ──
function toonScherm(id) {
  ;['menu', 'pauzescherm', 'einde', 'winkel'].forEach(function (n) { $(n).classList.toggle('aan', n === id) })
  var spel = !id || id === 'pauzescherm'
  $('dock').classList.toggle('aan', !!s && spel); $('hud').classList.toggle('aan', !!s && spel); $('goud').classList.toggle('aan', !!s && spel)
  $('rij').classList.toggle('aan', !!s && spel)
  if (!(s && spel)) $('evopijl').classList.remove('aan')
  $('pauze').style.display = s && spel ? 'flex' : 'none'; $('snel').style.display = s && spel ? 'flex' : 'none'
  $('terug').classList.toggle('aan', !BELONING && (id === 'menu' || id === 'winkel'))
  $('draai').classList.toggle('mag', !!s && spel)
  if (!(s && spel)) $('swipe').classList.remove('aan')
  if (s && spel) meet()
}
function startLevel(L) {
  s = TS.nieuw(L, { upgrades: D.upgrades, seed: (Date.now() % 100000) + 1 })
  actief = true; gepauzeerd = false; deeltjes = []; teksten = []; geesten = []; schud = 0; flits = 0; lagen = null; sfeer = []; fx = []; rookjes = []; munten = []; lagenOud = null
  weer = { t: 0, vogels: [], vallend: [], regen: [] }
  camX = -MARGE; camV = 0; alarm = 0; vorigKan = false
  s.speeltijd = BELONING ? 60 : 0
  if (!geswiped) setTimeout(function () { if (!geswiped && s && actief) $('swipe').classList.add('aan') }, 2200)
  $('lvl').textContent = 'Slag ' + (L + 1) + ' · tot de ' + TS.TIJDPERKEN[s.def.maxE].naam
  toonScherm(null)
  tekenIconen()
  audio()
  banner('Slag ' + (L + 1), 1800, BELONING ? 'Je mag 1 minuut spelen. Tik op een soldaat!' : 'Tik op een soldaat om hem te trainen')
}
function einde() {
  if (!s || !actief) return
  actief = false
  var tijdOp = s.fase === 'spel', gewonnen = s.uitslag === 'gewonnen', st = TS.sterren(s)
  var verdiend = tijdOp ? Math.min(40, 5 + s.zij[0].gedood * 2) : TS.beloning(s)
  D.munten += verdiend
  if (tijdOp) Geluid.win()
  else if (gewonnen) { D.sterren[s.L] = Math.max(D.sterren[s.L] || 0, st); if (s.L === D.open && D.open < TS.LEVELS.length - 1) D.open++; Geluid.win() }
  else Geluid.verlies()
  bewaar()
  $('eindtitel').textContent = tijdOp ? 'De minuut is om!' : gewonnen ? (s.L === TS.LEVELS.length - 1 ? 'Alles gewonnen!' : 'Gewonnen!') : 'Je basis is gesloopt'
  var es = $('eindsterren'); es.innerHTML = ''
  for (var i = 0; i < 3; i++) es.innerHTML += '<svg class="' + (i < st ? '' : 'leeg') + '"><use href="#ster"/></svg>'
  es.classList.toggle('verborgen', !gewonnen || tijdOp)
  $('st-tijd').textContent = Math.max(1, Math.round(s.t / 60))
  $('st-gedood').textContent = s.zij[0].gedood
  $('st-tijdperk').textContent = TS.TIJDPERKEN[s.zij[0].e].naam
  $('verdiend').textContent = verdiend
  $('volgende').classList.toggle('verborgen', BELONING || !gewonnen || s.L + 1 >= TS.LEVELS.length)
  $('opnieuw').className = BELONING ? 'verborgen' : gewonnen ? 'knop2' : 'knop'
  $('naarmenu').classList.toggle('verborgen', BELONING)
  $('eindwinkel').classList.toggle('verborgen', BELONING)
  $('klaar').classList.toggle('verborgen', !BELONING)
  toonScherm('einde')
}
function toonMenu() {
  s = null; actief = false; meet()
  $('menumunten').textContent = D.munten
  $('speel').textContent = 'Speel slag ' + (D.open + 1)
  var tl = $('tijdlijn')
  if (!tl.childNodes.length) TS.TIJDPERKEN.forEach(function (T, e) {
    var c = document.createElement('canvas'); c.width = 192; c.height = 116; c.title = T.naam
    var g = c.getContext('2d'), Th = THEMA[e], l = g.createLinearGradient(0, 0, 0, 116)
    l.addColorStop(0, Th.lucht[0]); l.addColorStop(0.7, Th.lucht[2]); l.addColorStop(0.7, Th.grond[0]); l.addColorStop(1, Th.grond[1])
    g.fillStyle = l; g.fillRect(0, 0, 192, 116)
    g.fillStyle = rgba(Th.rand, 0.8); g.fillRect(0, 80, 192, 2)
    g.lineCap = 'round'; g.lineJoin = 'round'
    g.save(); g.translate(60, 82); g.scale(0.8, 0.8); tekenSoldaat(g, e, 0, 0, 0, 0, 'wacht'); g.restore()
    g.save(); g.translate(132, 82); g.scale(0.6, 0.6); tekenSoldaat(g, e, 2, 0, 0, 0, 'wacht'); g.restore()
    g.fillStyle = '#fff'; g.font = '15px "Russo One", sans-serif'; g.textAlign = 'center'; g.fillText(T.naam.toUpperCase(), 96, 106)
    tl.appendChild(c)
  })
  var lv = $('levels'); lv.innerHTML = ''
  TS.LEVELS.forEach(function (def, L) {
    var b = document.createElement('button'), st = D.sterren[L] || 0
    b.className = 'lv' + (L === D.open ? ' volgende' : '')
    b.disabled = L > D.open
    var str = ''
    for (var i = 0; i < 3; i++) str += '<svg class="' + (i < st ? '' : 'leeg') + '" viewBox="0 0 24 24"><use href="#ster"/></svg>'
    b.innerHTML = (L + 1) + '<small>tot ' + TS.TIJDPERKEN[def.maxE].naam + '</small><span class="st">' + str + '</span>'
    b.onclick = function () { startLevel(L) }
    lv.appendChild(b)
  })
  toonScherm('menu')
}
$('speel').onclick = function () { startLevel(D.open) }
$('volgende').onclick = function () { startLevel(s.L + 1) }
$('opnieuw').onclick = function () { startLevel(s.L) }
$('naarmenu').onclick = toonMenu
$('klaar').onclick = function () { parent.postMessage({ type: 'tijdstrijd-gameover' }, '*') }
$('pauze').onclick = function (e) { if (e && e.stopPropagation) e.stopPropagation(); if (!actief) return; gepauzeerd = !gepauzeerd; toonScherm(gepauzeerd ? 'pauzescherm' : null) }
$('hervat').onclick = function () { gepauzeerd = false; vorige = performance.now(); toonScherm(null) }
$('stop').onclick = function () { gepauzeerd = false; s.uitslag = 'verloren'; s.fase = 'klaar'; einde() }
$('snel').onclick = function (e) { e.stopPropagation(); D.snel = D.snel === 2 ? 1 : 2; bewaar(); tekenSnel() }
function tekenSnel() { $('snel').textContent = D.snel + '×'; $('snel').classList.toggle('x2', D.snel === 2) }
$('naarwinkel').onclick = function () { tekenWinkel(); toonScherm('winkel') }
$('eindwinkel').onclick = function () { tekenWinkel(); toonScherm('winkel') }
$('uitwinkel').onclick = toonMenu

// ── winkel ──
function upgradeIcoon(c, id) {
  icoon(c, function (g) {
    g.translate(46, 46); g.lineWidth = 5
    if (id === 'goud') { for (var i = 0; i < 3; i++) gloed(g, '#ffc83d', 8, function () { ellips(g, -6 + i * 6, 18 - i * 12, 20, 8, '#ffc83d'); ellips(g, -6 + i * 6, 16 - i * 12, 16, 5, '#ffe08a') }) }
    else if (id === 'inkomen') { gloed(g, '#5bffa0', 10, function () { veelhoek(g, [-24, 20, -8, 0, 4, 10, 22, -14, 14, -18, 30, -26, 30, -10, 26, -16, 4, 20, -8, 10, -20, 26], '#5bffa0') }) }
    else if (id === 'basis') { blok(g, -26, -16, 52, 40, 4, '#6a7290'); for (var c2 = 0; c2 < 4; c2++) blok(g, -26 + c2 * 14, -28, 10, 14, 2, '#6a7290'); blok(g, -8, 4, 16, 20, 7, '#120e1c') }
    else if (id === 'kracht') { gloed(g, '#ffc83d', 10, function () { veelhoek(g, [6, -30, -14, 4, 0, 4, -6, 30, 16, -6, 2, -6], '#ffc83d') }) }
    else if (id === 'toren') { g.translate(0, 18); g.scale(1.8, 1.8); blok(g, -18, 0, 36, 8, 3, '#2a2840'); tekenToren(g, 2, KLEUR[0], -0.2) }
    else superIcoon(g, 1)
  })
}
function tekenWinkel() {
  $('winkelmunten').textContent = D.munten
  var lu = $('lijstupgrades'); lu.innerHTML = ''
  Object.keys(TS.UPGRADES).forEach(function (id) {
    var u = TS.UPGRADES[id], n = D.upgrades[id] || 0, k = document.createElement('div'); k.className = 'kaart'
    var c = document.createElement('canvas'); upgradeIcoon(c, id); k.appendChild(c)
    var niv = ''; for (var i = 0; i < u.prijzen.length; i++) niv += '<i class="' + (i < n ? 'aan' : '') + '"></i>'
    k.insertAdjacentHTML('beforeend', '<div class="naam">' + u.naam + '</div><div class="zin">' + u.zin + '</div><div class="niv">' + niv + '</div>')
    var b = document.createElement('button')
    if (n >= u.prijzen.length) { b.className = 'bezit'; b.textContent = 'Helemaal vol' }
    else {
      var prijs = u.prijzen[n]
      b.className = 'koop'; b.textContent = prijs + ' munten'; b.disabled = D.munten < prijs
      b.onclick = function () { if (D.munten < prijs) return; D.munten -= prijs; D.upgrades[id] = n + 1; bewaar(); Geluid.koop(); tekenWinkel() }
    }
    k.appendChild(b); lu.appendChild(k)
  })
}

// ── de lus ──
var vorige = performance.now(), knopT = 0
function tekenMenuAchtergrond(dt) {
  camX += dt * 25; if (camX > camMax()) camX = -MARGE
  tekenAchtergrond(Math.min(4, Math.floor(D.open / 3)))
  ctx.setTransform(dpr * S, 0, 0, dpr * S, dpr * OX, dpr * OY)
  tekenGrond(ctx); werkSfeerBij(ctx, dt); tekenVignet()
}
function frame(nu) {
  var dt = Math.min(0.05, (nu - vorige) / 1000); vorige = nu
  beweegCam(dt)
  if (s) {
    if (actief && !gepauzeerd) {
      verwerk(TS.stap(s, dt * D.snel))
      // beloning: na 1 minuut (echte tijd) is het klaar
      if (s.speeltijd) {
        s.speeltijd = Math.max(0, s.speeltijd - dt)
        var sec = Math.ceil(s.speeltijd)
        $('lvl').textContent = 'Nog ' + Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2)
        $('lvl').classList.toggle('bijna', s.speeltijd < 10)
        if (s.speeltijd <= 0 && s.fase === 'spel') einde()
      }
    }
    tekenSlag(gepauzeerd ? 0 : dt)
    knopT -= dt
    if (knopT <= 0 && actief) { knopT = 0.1; werkKnoppenBij() }
  } else tekenMenuAchtergrond(dt)
  requestAnimationFrame(frame)
}

// alleen om te testen: ?debug geeft de spelstaat aan de console
if (params.has('debug')) window.__tijd = { s: function () { return s }, D: D, start: startLevel, soldaat: tekenSoldaat, basis: tekenBasis, superIcoon: superIcoon, cam: zetCam, verwerk: verwerk,
  zoom: function (z) { S = z; OY = H - dockH - (ONDER - 30) * S; zetCam(camX); lagen = null } }

maakKnoppen()
meet()
tekenGeluidKnop()
tekenSnel()
if (BELONING) startLevel(D.open)
else toonMenu()
requestAnimationFrame(frame)
})()
