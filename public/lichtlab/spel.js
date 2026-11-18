// Lichtlab: scherm, besturing, effecten, winkel en opslag. Spelregels in kern.js.
(function () {
'use strict'
var $ = function (id) { return document.getElementById(id) }
var BELONING = NK.BELONING
var Geluid = NK.Geluid

// ── opslag ──
// bezig: het level waar je mee bezig was (na elke tik bewaard)
var D = NK.opslag('kk_ll', { munten: 0, level: 0, sterren: {}, stijlen: ['klassiek'], stijl: 'klassiek', geluid: true, rustig: false, uitlegGezien: false, bezig: null })
Geluid.zetAan(function () { return D.geluid })

// ── straalstijlen (winkel) ──
var STIJLEN = [
  { id: 'klassiek', naam: 'Neon', prijs: 0, k: ['#3ef0ff', '#ff4fd8', '#ffc83d'] },
  { id: 'vuur', naam: 'Vuur', prijs: 60, k: ['#ff7a3d', '#ff3d7a', '#ffe14f'] },
  { id: 'ijs', naam: 'IJs', prijs: 120, k: ['#6fdcff', '#b49bff', '#8dffd8'] },
  { id: 'jungle', naam: 'Jungle', prijs: 180, k: ['#8dff4f', '#ff9a3d', '#4fffe0'] },
  { id: 'plasma', naam: 'Plasma', prijs: 260, k: ['#4fa0ff', '#d36bff', '#ff6b9d'], dik: true },
  { id: 'regenboog', naam: 'Regenboog', prijs: 360, k: ['#ff5a5a', '#5aff9d', '#5a8dff'], regenboog: true },
]
function stijl() { return STIJLEN.find(function (s) { return s.id === D.stijl }) || STIJLEN[0] }
function kleur(k, t) {
  var s = stijl()
  if (s.regenboog) return 'hsl(' + ((k * 120 + (t || 0) * 40) % 360 | 0) + ',95%,62%)'
  return s.k[k]
}

// ── geluid ──
var NOTEN = [523, 659, 784, 988, 1175]
var G = {
  draai: function () { Geluid.toon(880, 0.05, 'triangle', 0.09); Geluid.ruis(0.06, 0.05, 3000, 0.8) },
  vast: function () { Geluid.toon(180, 0.1, 'square', 0.06, 0, 140) },
  raak: function (k) { Geluid.toon(NOTEN[k % 5], 0.35, 'sine', 0.14); Geluid.toon(NOTEN[k % 5] * 2, 0.25, 'triangle', 0.05, 0.03) },
  terug: function () { Geluid.toon(520, 0.08, 'sine', 0.1, 0, 380) },
}

// ── canvas en layout ──
var C = NK.canvas($('c'), function () { if (lv) plaats() })
var ctx = C.ctx, S = 40, ox = 0, oy = 0
function plaats() {
  var boven = 104, onder = 92
  S = Math.floor(Math.min((C.W - 16) / lv.w, (C.H - boven - onder) / lv.h, 80))
  ox = Math.round((C.W - S * lv.w) / 2)
  oy = Math.round(boven + (C.H - boven - onder - S * lv.h) / 2)
}
function px(i) { return ox + (i % lv.w) * S + S / 2 }
function py(i) { return oy + ((i / lv.w) | 0) * S + S / 2 }

// ── toestand ──
var lv = null, kaart = null, n = 0, standen = [], begin = [], tikken = 0, hist = [], gewonnen = false, demo = false
var hoek = [], doelHoek = [], uitkomst = null, aanWas = [], flits = 0, wiebel = {}, cursor = -1, cursorZicht = false
var fx = NK.deeltjes(), schok = NK.schok(), tijd = 0

function laadLevel(nr, als) {
  n = nr; lv = LL.maak(nr); kaart = LL.kaart(lv)
  begin = lv.spiegels.map(function (s) { return s.s })
  standen = begin.slice(); tikken = 0; hist = []; gewonnen = false; flits = 0; wiebel = {}
  if (als) { standen = als.standen.slice(); tikken = als.tikken; hist = (als.hist || []).slice() }
  hoek = standen.map(function (s) { return s ? 45 : -45 }); doelHoek = hoek.slice()
  cursor = lv.spiegels.findIndex(function (s) { return !s.vast })
  fx.leeg()
  bereken(true)
  plaats()
}
function bereken(stil) {
  uitkomst = LL.volg(lv, standen, kaart)
  var nu = lv.doelen.map(function (d, i) { return !!uitkomst.geraakt[i][d.k] })
  if (!stil) nu.forEach(function (a, i) {
    if (a && !aanWas[i]) { G.raak(i); fx.spat(px(lv.doelen[i].i), py(lv.doelen[i].i), 16, kleur(lv.doelen[i].k, tijd), S * 3, { ster: i % 2 === 0, maat: S * 0.05 }); schok.voeg(0.12) }
  })
  aanWas = nu
}
function bewaarBezig() {
  if (demo) return
  D.bezig = gewonnen ? null : { n: n, standen: standen.slice(), tikken: tikken, hist: hist.slice(-40) }
  D.bewaar()
}

function startLevel(nr) {
  demo = false
  var z = D.bezig
  laadLevel(nr, z && z.n === nr && z.standen && z.standen.length === LL.maak(nr).spiegels.length ? z : null)
  toonScherm(null)
  $('titel').textContent = 'Level ' + (nr + 1)
  $('tip').classList.toggle('aan', nr === 0 && tikken === 0)
  if (tikken) melding('Je gaat verder waar je was.')
  hudBij(); bewaarBezig()
}
function hudBij() {
  if (!lv) return
  $('tikken').textContent = tikken
  $('drie').innerHTML = '· ' + sterSvg(true, 14) + ' bij ' + lv.min
  var aan = aanWas.filter(Boolean).length
  $('doelinfo').textContent = '· kristallen ' + aan + '/' + lv.doelen.length
  $('terugzet').disabled = !hist.length
}
function sterSvg(aan, maat) {
  return '<svg class="ster' + (aan ? '' : ' uit') + '" style="width:' + maat + 'px;height:' + maat + 'px;display:inline-block;vertical-align:-2px" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>'
}

// ── draaien ──
function draai(m, terug) {
  if (!lv || gewonnen || demo) return
  var sp = lv.spiegels[m]
  if (sp.vast) { G.vast(); wiebel[m] = 0.3; melding('Deze spiegel zit vast.'); return }
  standen[m] = 1 - standen[m]
  doelHoek[m] += terug ? -90 : 90
  if (!terug) { tikken++; hist.push(m) }
  G.draai()
  fx.spat(px(sp.i), py(sp.i), 6, '#ffffff', S * 1.6, { maat: S * 0.03 })
  $('tip').classList.remove('aan'); verbergMelding()
  bereken(false); hudBij()
  if (uitkomst.klaar) {
    gewonnen = true; flits = 1; schok.voeg(0.35); Geluid.win()
    lv.doelen.forEach(function (d) { fx.spat(px(d.i), py(d.i), 26, kleur(d.k, tijd), S * 4, { ster: true, maat: S * 0.06, duur: 0.9 }) })
    bewaarBezig()
    setTimeout(winScherm, 1000)
  } else bewaarBezig()
}
function zetTerug() {
  if (!hist.length || gewonnen || demo) return
  var m = hist.pop(); tikken = Math.max(0, tikken - 1)
  draai(m, true); G.terug(); hudBij(); bewaarBezig()
}
function opnieuw() {
  if (gewonnen || demo || !tikken) return
  standen = begin.slice(); tikken = 0; hist = []
  standen.forEach(function (s, i) { doelHoek[i] = hoek[i] = s ? 45 : -45 })
  bereken(true); G.terug(); hudBij(); bewaarBezig()
}

// ── gewonnen ──
function winScherm() {
  var st = LL.sterren(tikken, lv.min), oud = D.sterren[n] || 0, extra = 0
  if (!oud) extra += 3
  if (st > oud) { extra += (st - oud) * 2; D.sterren[n] = st }
  D.munten += extra
  if (n >= D.level) D.level = n + 1
  D.bezig = null; D.bewaar()
  $('wintitel').textContent = st === 3 ? 'Perfect!' : 'Gelukt!'
  $('winsterren').innerHTML = [1, 2, 3].map(function (k) { return sterSvg(k <= st, 58) }).join('')
  $('wintekst').textContent = st === 3 ? 'In het minste aantal tikken. Knap!' : 'Lukt het in ' + lv.min + ' tikken? Dan krijg je 3 sterren.'
  $('w-tikken').textContent = tikken; $('w-min').textContent = lv.min
  $('w-munten').innerHTML = extra ? 'Verdiend: <span class="munt">' + extra + '</span>' : ''
  $('winmenu').classList.toggle('verborgen', BELONING)
  toonScherm('gewonnen')
}

// ── tekenen ──
function tekenVeld() {
  // glazen vloer
  for (var y = 1; y < lv.h - 1; y++) for (var x = 1; x < lv.w - 1; x++) {
    var X = ox + x * S, Y = oy + y * S
    ctx.fillStyle = (x + y) % 2 ? 'rgba(120,140,255,0.07)' : 'rgba(120,140,255,0.04)'
    NK.rondRect(ctx, X + 1.5, Y + 1.5, S - 3, S - 3, S * 0.14); ctx.fill()
  }
  // neonlijst om het veld
  var hue = 300
  ctx.save()
  ctx.strokeStyle = 'hsla(' + hue + ',95%,62%,0.5)'; ctx.lineWidth = Math.max(4, S * 0.14); ctx.shadowColor = 'hsl(' + hue + ',95%,60%)'; ctx.shadowBlur = S * 0.5
  NK.rondRect(ctx, ox + S * 0.92, oy + S * 0.92, (lv.w - 1.84) * S, (lv.h - 1.84) * S, S * 0.2); ctx.stroke()
  ctx.shadowBlur = S * 0.12; ctx.strokeStyle = 'hsl(' + hue + ',100%,78%)'; ctx.lineWidth = Math.max(1.5, S * 0.045); ctx.stroke()
  ctx.restore()
  // muren
  lv.muren.forEach(function (i) {
    var X = px(i), Y = py(i), m = S * 0.42
    var gr = ctx.createLinearGradient(X, Y - m, X, Y + m); gr.addColorStop(0, '#2a1f55'); gr.addColorStop(1, '#120c2a')
    ctx.fillStyle = gr; NK.rondRect(ctx, X - m, Y - m, m * 2, m * 2, S * 0.1); ctx.fill()
    ctx.strokeStyle = 'rgba(190,160,255,0.55)'; ctx.lineWidth = 1.5; ctx.stroke()
  })
}
function tekenStralen() {
  var nu = tijd
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  uitkomst.stralen.forEach(function (st) {
    var col = kleur(st.k, nu), pts = st.punten.map(function (i) { return [px(i), py(i)] })
    // eindpunt tegen een muur: tot de rand
    var a = pts[pts.length - 2], b = pts[pts.length - 1], laatsteCel = kaart[st.punten[st.punten.length - 1]]
    if (a && b && (!laatsteCel || laatsteCel.t === 'muur' || laatsteCel.t === 'lamp')) {
      var dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1])
      pts[pts.length - 1] = [b[0] - dx * S * 0.45, b[1] - dy * S * 0.45]
    }
    var pad = new Path2D()
    pts.forEach(function (p, i) { if (i) pad.lineTo(p[0], p[1]); else pad.moveTo(p[0], p[1]) })
    var dik = stijl().dik ? 1.4 : 1, f = 1 + flits * 0.8
    ctx.globalAlpha = 0.16 * f; ctx.strokeStyle = col; ctx.lineWidth = S * 0.5 * dik; ctx.stroke(pad)
    ctx.globalAlpha = 0.5 * f; ctx.lineWidth = S * 0.15 * dik; ctx.stroke(pad)
    ctx.globalAlpha = 0.95; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, S * 0.045); ctx.stroke(pad)
    // energiebolletjes die over de straal reizen
    if (!D.rustig) {
      var lengte = 0, stukken = []
      for (var i = 1; i < pts.length; i++) { var l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); stukken.push(l); lengte += l }
      var tus = S * 0.9, start = (nu * S * 3.2) % tus
      ctx.fillStyle = col; ctx.globalAlpha = 0.9
      for (var d = start; d < lengte; d += tus) {
        var rest = d, k = 0
        while (k < stukken.length && rest > stukken[k]) { rest -= stukken[k]; k++ }
        if (k >= stukken.length) break
        var p0 = pts[k], p1 = pts[k + 1], q = stukken[k] ? rest / stukken[k] : 0
        ctx.beginPath(); ctx.arc(p0[0] + (p1[0] - p0[0]) * q, p0[1] + (p1[1] - p0[1]) * q, S * 0.06, 0, 7); ctx.fill()
      }
    }
    // vonkjes waar de straal ergens tegenaan komt
    var eind = pts[pts.length - 1]
    if (Math.random() < 0.25 && !D.rustig) fx.spat(eind[0], eind[1], 1, col, S * 1.4, { maat: S * 0.03, duur: 0.35 })
    NK.vlek(ctx, eind[0], eind[1], S * 0.5, col, 0.35 * f)
  })
  ctx.restore()
}
function vorm(k, x, y, r) {
  // kleur heeft ook een eigen vorm (ruit, rondje, driehoek): ook te zien zonder kleur
  ctx.beginPath()
  if (k === 0) { ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.8, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.8, y); ctx.closePath() }
  else if (k === 1) ctx.arc(x, y, r * 0.8, 0, 7)
  else { ctx.moveTo(x, y - r * 0.9); ctx.lineTo(x + r * 0.9, y + r * 0.65); ctx.lineTo(x - r * 0.9, y + r * 0.65); ctx.closePath() }
}
function tekenDingen(dt) {
  // lampen
  lv.lampen.forEach(function (l) {
    var x = px(l.i), y = py(l.i), col = kleur(l.k, tijd)
    ctx.save(); ctx.translate(x, y); ctx.rotate(l.r * Math.PI / 2)
    ctx.fillStyle = '#1a1438'; NK.rondRect(ctx, -S * 0.36, -S * 0.1, S * 0.72, S * 0.5, S * 0.12); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.shadowColor = col; ctx.shadowBlur = S * 0.6; ctx.fillStyle = col
    ctx.beginPath(); ctx.ellipse(0, -S * 0.1, S * 0.24, S * 0.12, 0, Math.PI, 0); ctx.fill()
    ctx.restore()
    ctx.save(); ctx.fillStyle = '#05040f'; ctx.shadowBlur = 0; vorm(l.k, x - NK_DX(l.r) * S * 0.08, y - NK_DY(l.r) * S * 0.08, S * 0.1); ctx.fill(); ctx.restore()
  })
  // kristallen
  lv.doelen.forEach(function (d, i) {
    var x = px(d.i), y = py(d.i), col = kleur(d.k, tijd), aan = aanWas[i]
    var r = S * 0.3 * (aan ? 1 + Math.sin(tijd * 6) * 0.05 : 1)
    ctx.save()
    if (aan) {
      NK.vlek(ctx, x, y, S * 0.9, col, 0.4)
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, S * 0.04); ctx.globalAlpha = 0.7
      ctx.beginPath(); ctx.arc(x, y, S * 0.42, tijd * 2, tijd * 2 + 4.4); ctx.stroke(); ctx.globalAlpha = 1
    }
    ctx.shadowColor = col; ctx.shadowBlur = aan ? S * 0.6 : S * 0.15
    vorm(d.k, x, y, r)
    if (aan) { var gr = ctx.createLinearGradient(x, y - r, x, y + r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, col); gr.addColorStop(1, col); ctx.fillStyle = gr; ctx.fill() }
    else { ctx.fillStyle = NK.hexA(col.charAt(0) === '#' ? col : '#ffffff', 0.12); ctx.fill() }
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, S * 0.05); ctx.stroke()
    ctx.restore()
  })
  // spiegels
  lv.spiegels.forEach(function (sp, m) {
    var x = px(sp.i), y = py(sp.i)
    hoek[m] += (doelHoek[m] - hoek[m]) * Math.min(1, dt * 16)
    var w = 0
    if (wiebel[m] > 0) { wiebel[m] -= dt; w = Math.sin(wiebel[m] * 50) * 6 * (wiebel[m] / 0.3) }
    ctx.save(); ctx.translate(x, y)
    // voetje
    ctx.fillStyle = sp.vast ? 'rgba(255,255,255,0.06)' : 'rgba(155,107,255,0.12)'
    ctx.beginPath(); ctx.arc(0, 0, S * 0.38, 0, 7); ctx.fill()
    ctx.strokeStyle = sp.vast ? 'rgba(255,255,255,0.18)' : 'rgba(196,168,255,0.35)'; ctx.lineWidth = 1; ctx.stroke()
    if (sp.vast) { ctx.fillStyle = 'rgba(255,255,255,0.45)'; for (var b = 0; b < 4; b++) { var h = b * Math.PI / 2 + Math.PI / 4; ctx.beginPath(); ctx.arc(Math.cos(h) * S * 0.3, Math.sin(h) * S * 0.3, S * 0.035, 0, 7); ctx.fill() } }
    ctx.rotate((hoek[m] + w) * Math.PI / 180)
    var l = S * 0.4, d2 = S * 0.07
    ctx.shadowColor = '#c4a8ff'; ctx.shadowBlur = S * 0.25
    var gr = ctx.createLinearGradient(0, -d2, 0, d2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#cfd8ff'); gr.addColorStop(1, '#7f86c8')
    ctx.fillStyle = gr; NK.rondRect(ctx, -l, -d2, l * 2, d2 * 2, d2); ctx.fill()
    ctx.restore()
  })
  // cursor (toetsenbord of controller)
  if (cursorZicht && cursor >= 0 && !gewonnen) {
    var c = lv.spiegels[cursor], cx = px(c.i), cy = py(c.i)
    ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.setLineDash([S * 0.12, S * 0.08]); ctx.lineDashOffset = -tijd * 20
    NK.rondRect(ctx, cx - S * 0.47, cy - S * 0.47, S * 0.94, S * 0.94, S * 0.16); ctx.stroke(); ctx.restore()
  }
}
function NK_DX(r) { return LL.DX[r] }
function NK_DY(r) { return LL.DY[r] }

// ── hoofdlus ──
var vorige = performance.now(), invoer
function frame(nu) {
  var dt = Math.min(0.05, (nu - vorige) / 1000); vorige = nu; tijd += dt
  if (invoer) invoer.pad()
  ctx.setTransform(C.dpr, 0, 0, C.dpr, 0, 0)
  schok.rustig = D.rustig
  NK.achtergrond(ctx, C.W, C.H, tijd, 290, D.rustig)
  if (lv) {
    flits = Math.max(0, flits - dt * 1.5)
    var s = schok.stap(dt)
    ctx.save(); ctx.translate(s[0], s[1])
    NK.vlek(ctx, ox + lv.w * S / 2, oy + lv.h * S / 2, Math.max(lv.w, lv.h) * S * 0.7, '#9b6bff', 0.16)
    tekenVeld()
    tekenStralen()
    tekenDingen(dt)
    fx.teken(ctx, dt)
    ctx.restore()
  }
  requestAnimationFrame(frame)
}

// ── invoer ──
function spiegelOp(x, y) {
  var cx = Math.floor((x - ox) / S), cy = Math.floor((y - oy) / S)
  if (cx < 0 || cy < 0 || cx >= lv.w || cy >= lv.h) return -1
  var v = kaart[cy * lv.w + cx]
  return v && v.t === 'spiegel' ? v.n : -1
}
function beweegCursor(r) {
  cursorZicht = true
  if (cursor < 0) { cursor = 0; return }
  var c = lv.spiegels[cursor], x0 = c.i % lv.w, y0 = c.i / lv.w | 0, beste = -1, score = 1e9
  lv.spiegels.forEach(function (s, m) {
    if (m === cursor) return
    var dx = s.i % lv.w - x0, dy = (s.i / lv.w | 0) - y0
    var voor = dx * LL.DX[r] + dy * LL.DY[r], opzij = Math.abs(dx * LL.DY[r] - dy * LL.DX[r])
    if (voor <= 0) return
    var sc = voor + opzij * 2
    if (sc < score) { score = sc; beste = m }
  })
  if (beste >= 0) { cursor = beste; Geluid.toon(1000, 0.03, 'triangle', 0.05) }
}
invoer = NK.invoer($('c'), {
  tik: function (x, y) { if (!huidig && lv && !demo) { var m = spiegelOp(x, y); cursorZicht = false; if (m >= 0) { cursor = m; draai(m) } } },
  richting: function (r) { if (!huidig && lv && !demo && !gewonnen) beweegCursor(r) },
  toets: function (e) {
    if (huidig || !lv) return
    if ((e.code === 'Space' || e.code === 'Enter') && cursor >= 0) { e.preventDefault(); cursorZicht = true; draai(cursor) }
    if (e.code === 'KeyZ' || e.code === 'Backspace') { e.preventDefault(); zetTerug() }
    if (e.code === 'KeyR') opnieuw()
  },
  knop: function (k) {
    if (huidig || !lv) return
    if (k === 'a' && cursor >= 0) { cursorZicht = true; draai(cursor) }
    if (k === 'x') zetTerug()
    if (k === 'y') opnieuw()
  },
})
$('terugzet').onclick = zetTerug
$('opnieuw').onclick = opnieuw

// ── schermen ──
var huidig = 'menu'
function toonScherm(id) {
  huidig = id
  ;['menu', 'levels', 'gewonnen', 'winkel', 'uitleg'].forEach(function (x) { $(x).classList.toggle('aan', x === id) })
  var inSpel = id === null
  $('hud').classList.toggle('aan', inSpel); $('onderbalk').classList.toggle('aan', inSpel)
  if (!inSpel) { $('tip').classList.remove('aan'); verbergMelding() }
  $('menutop').classList.toggle('aan', !inSpel && id !== 'gewonnen' && !BELONING)
  $('topmunten').textContent = D.munten
}
function melding(s) { var m = $('melding'); m.textContent = s; m.classList.remove('aan'); void m.offsetWidth; m.classList.add('aan'); clearTimeout(melding.t); melding.t = setTimeout(verbergMelding, 2600) }
function verbergMelding() { $('melding').classList.remove('aan') }

function toonMenu() {
  // achter het menu: het level waar je bent, met lopende stralen
  demo = true; laadLevel(D.bezig ? D.bezig.n : D.level, D.bezig)
  var nr = D.bezig ? D.bezig.n : D.level
  $('speel').textContent = (D.bezig && D.bezig.tikken ? 'Verder met level ' : 'Spelen: level ') + (nr + 1)
  $('naarlevels').classList.toggle('verborgen', D.level < 1)
  $('s-geluid').classList.toggle('aan', D.geluid); $('s-rustig').classList.toggle('aan', D.rustig)
  toonScherm('menu')
}
$('terug').onclick = function () { Geluid.klik(); if (huidig === 'menu') NK.naarOuder('lichtlab-terug'); else toonMenu() }
$('naarmenu').onclick = function () { Geluid.klik(); toonMenu() }
$('speel').onclick = function () {
  Geluid.klik()
  var nr = D.bezig ? D.bezig.n : D.level
  if (!D.uitlegGezien) { D.uitlegGezien = true; D.bewaar(); naUitleg = function () { startLevel(nr) }; naarUitleg(); return }
  startLevel(nr)
}
$('naarlevels').onclick = function () { Geluid.klik(); naarLevels() }
$('naarwinkel').onclick = function () { Geluid.klik(); naarWinkel() }
$('naaruitleg').onclick = function () { Geluid.klik(); naUitleg = toonMenu; naarUitleg() }
$('s-geluid').onclick = function () { D.geluid = !D.geluid; D.bewaar(); this.classList.toggle('aan', D.geluid); geluidKnop(); Geluid.klik() }
$('s-rustig').onclick = function () { D.rustig = !D.rustig; D.bewaar(); this.classList.toggle('aan', D.rustig); Geluid.klik() }
$('geluid').onclick = function () { D.geluid = !D.geluid; D.bewaar(); geluidKnop(); Geluid.klik() }
function geluidKnop() { $('golf').style.display = D.geluid ? '' : 'none'; $('geluid').style.opacity = D.geluid ? 1 : 0.55 }
$('volgende').onclick = function () { startLevel(n + 1) }
$('nogeens').onclick = function () { D.bezig = null; startLevel(n) }
$('winmenu').onclick = function () { toonMenu() }

function naarLevels() {
  var l = $('levellijst'); l.innerHTML = ''
  var totaal = 0
  for (var k in D.sterren) totaal += D.sterren[k]
  $('levelsub').innerHTML = sterSvg(true, 15) + ' ' + totaal + ' sterren · speel een level opnieuw voor meer sterren'
  for (var i = Math.max(0, D.level - 59); i <= D.level; i++) {
    (function (i) {
      var b = document.createElement('button'), st = D.sterren[i] || 0
      b.className = 'lvl' + (i === D.level ? ' volgende' : '')
      b.innerHTML = '<span>' + (i + 1) + '</span><span class="sterren">' + [1, 2, 3].map(function (q) { return sterSvg(q <= st, 12) }).join('') + '</span>'
      b.setAttribute('aria-label', 'Level ' + (i + 1) + ', ' + st + ' sterren')
      b.onclick = function () { Geluid.klik(); if (!D.bezig || D.bezig.n !== i) D.bezig = null; startLevel(i) }
      l.appendChild(b)
    })(i)
  }
  toonScherm('levels')
}

// ── uitleg ──
var naUitleg = null
function naarUitleg() {
  var regels = [
    ['lamp', 'Lampen schieten een lichtstraal het veld in.'],
    ['spiegel', 'Tik op een spiegel: hij draait en de straal gaat een andere kant op.'],
    ['doel', 'Raak elk kristal met een straal van dezelfde kleur. Kleur en vorm horen bij elkaar.'],
    ['vast', 'Spiegels met puntjes zitten vast.'],
    ['muur', 'Muren houden licht tegen. Stralen gaan wel door elkaar heen.'],
    ['ster', 'Hoe minder tikken, hoe meer sterren.'],
  ]
  var l = $('uitleglijst'); l.innerHTML = ''
  regels.forEach(function (rg) {
    var d = document.createElement('div'); d.className = 'regel'
    var c = document.createElement('canvas'); c.width = 80; c.height = 80
    icoon(c.getContext('2d'), rg[0])
    var s = document.createElement('span'); s.textContent = rg[1]
    d.appendChild(c); d.appendChild(s); l.appendChild(d)
  })
  toonScherm('uitleg')
}
$('snapik').onclick = function () { Geluid.klik(); var f = naUitleg || toonMenu; naUitleg = null; f() }
function icoon(g, soort) {
  var oud = ctx; ctx = g
  g.fillStyle = 'rgba(255,79,216,0.08)'; NK.rondRect(g, 3, 3, 74, 74, 14); g.fill()
  var col = kleur(0, 0)
  if (soort === 'lamp') { g.save(); g.translate(40, 48); g.fillStyle = '#1a1438'; NK.rondRect(g, -22, -6, 44, 26, 8); g.fill(); g.shadowColor = col; g.shadowBlur = 16; g.fillStyle = col; g.beginPath(); g.ellipse(0, -6, 15, 8, 0, Math.PI, 0); g.fill(); g.restore() }
  if (soort === 'spiegel' || soort === 'vast') {
    g.save(); g.translate(40, 40); g.fillStyle = 'rgba(155,107,255,0.15)'; g.beginPath(); g.arc(0, 0, 28, 0, 7); g.fill()
    if (soort === 'vast') { g.fillStyle = 'rgba(255,255,255,0.5)'; for (var b = 0; b < 4; b++) { var h = b * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.arc(Math.cos(h) * 22, Math.sin(h) * 22, 3, 0, 7); g.fill() } }
    g.rotate(-Math.PI / 4); g.shadowColor = '#c4a8ff'; g.shadowBlur = 10; g.fillStyle = '#e6eaff'; NK.rondRect(g, -26, -5, 52, 10, 5); g.fill(); g.restore()
  }
  if (soort === 'doel') { g.save(); g.shadowColor = col; g.shadowBlur = 18; vorm(0, 28, 40, 16); g.fillStyle = col; g.fill(); g.restore(); g.save(); g.shadowColor = kleur(1, 0); g.shadowBlur = 18; vorm(1, 56, 40, 14); g.fillStyle = kleur(1, 0); g.fill(); g.restore() }
  if (soort === 'muur') { var gr = g.createLinearGradient(0, 18, 0, 62); gr.addColorStop(0, '#2a1f55'); gr.addColorStop(1, '#120c2a'); g.fillStyle = gr; NK.rondRect(g, 18, 18, 44, 44, 8); g.fill(); g.strokeStyle = 'rgba(190,160,255,0.6)'; g.lineWidth = 2; g.stroke() }
  if (soort === 'ster') { g.save(); g.shadowColor = '#ffc83d'; g.shadowBlur = 14; NK.ster(g, 40, 40, 24, '#ffc83d'); g.restore() }
  ctx = oud
}

// ── winkel ──
function naarWinkel() { tekenWinkel(); toonScherm('winkel') }
function tekenWinkel() {
  $('winkelmunten').textContent = D.munten; $('topmunten').textContent = D.munten
  NK.winkel($('lijst'), STIJLEN, D, 'stijlen', 'stijl', function (g, it) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'
    it.k.forEach(function (col, k) {
      if (it.regenboog) col = 'hsl(' + (k * 120) + ',95%,62%)'
      var y = 16 + k * 20
      g.strokeStyle = col; g.globalAlpha = 0.25; g.lineWidth = it.dik ? 14 : 10; g.beginPath(); g.moveTo(8, y); g.lineTo(52, y); g.lineTo(52 + 12, y + 12); g.stroke()
      g.globalAlpha = 0.9; g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke()
    })
    g.restore()
  }, tekenWinkel)
}

// ── start ──
geluidKnop()
if (BELONING) {
  $('naarmenu').style.visibility = 'hidden'
  startLevel(D.bezig ? D.bezig.n : D.level)
} else toonMenu()
requestAnimationFrame(frame)
})()
