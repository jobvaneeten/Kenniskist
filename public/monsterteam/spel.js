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
  pos: { a: 0, x: 9, y: 11, r: 2 }, huis: { a: 0, x: 4, y: 14 }, opgepakt: {}, versie: 0,
})
Geluid.zetAan(function () { return D.geluid })
if (!D.versie) {
  // vroeger: 6 gyms (plant, bliksem, water, vuur, schaduw, alles). Nu 8.
  var oudNaarNieuw = { 0: 0, 1: 1, 2: 2, 3: 4, 4: 7 }, nieuw = {}
  Object.keys(D.versl || {}).forEach(function (k) { var n = +k.slice(1); if (oudNaarNieuw[n] != null) nieuw[k[0] + oudNaarNieuw[n]] = true })
  D.versl = nieuw
  var hoogste = -1; for (var gg = 0; gg < 8; gg++) if (D.versl['l' + gg]) hoogste = gg
  D.pos = { a: Math.max(0, hoogste * 2 + 2), x: 9, y: 11, r: 2 }; D.huis = { a: D.pos.a, x: 4, y: 9 }
  D.opgepakt = {}; D.gevecht = null; D.versie = 2; D.bewaar()
}
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
var tekenWezen = MTZ.teken
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
  var breed = C.W > C.H * 1.4
  return kant === 'wij' ? { x: C.W * 0.28, y: C.H * (breed ? 0.4 : 0.5), r: klein * (breed ? 0.15 : 0.17) } : { x: C.W * 0.72, y: C.H * (breed ? 0.2 : 0.24), r: klein * 0.13 }
}
// achtergrond van het gevecht: een landschap in de kleuren van het gebied
var heuvels = null
function tekenGevechtDecor(gebied) {
  var th = MTW.THEMA[gebied], H = C.H, W = C.W, hor = H * 0.42
  var lucht = ctx.createLinearGradient(0, 0, 0, hor)
  var donker = !!th.nacht
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
  tekenEffecten(dt)
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

// ── aanvalsanimaties: elk element ziet er anders uit, sterker = groter ──
var effecten = []
function startEffect(aanval, wie) {
  var m = AV[aanval], van = plekVan(wie), naar = plekVan(wie === 'wij' ? 'zij' : 'wij')
  var kracht = m.kracht >= 100 ? 3 : m.kracht >= 70 ? 2 : 1
  var soort = m.heel ? 'herstel' : m.wij ? 'schild' : m.zij ? 'grauw' : m.type
  effecten.push({ soort: soort, kracht: kracht, van: { x: van.x, y: van.y - van.r * 0.2, r: van.r }, naar: { x: naar.x, y: naar.y - naar.r * 0.2, r: naar.r }, t: 0, dur: soort === 'bliksem' ? 0.7 : 0.75, zaad: Math.random() * 1000 })
  if (kracht === 3 && !D.rustig) flitsKleur = { k: MT.KLEUR[m.type] || '#ffffff', t: 0.35 }
}
var flitsKleur = null
function ruisE(e, i) { var h = Math.sin(e.zaad + i * 12.9898) * 43758.5453; return h - Math.floor(h) }
function tekenEffecten(dt) {
  effecten = effecten.filter(function (e) {
    e.t += dt
    var f = Math.min(1, e.t / e.dur), van = e.van, naar = e.naar, R = naar.r, k = e.kracht
    var reis = Math.min(1, f / 0.55), inslag = Math.max(0, (f - 0.5) / 0.5)
    var punt = function (q, boog) { return [van.x + (naar.x - van.x) * q, van.y + (naar.y - van.y) * q - Math.sin(q * Math.PI) * (boog || 0)] }
    ctx.save()
    switch (e.soort) {
      case 'vuur':
        for (var i = 0; i < k; i++) {
          var q = Math.max(0, Math.min(1, reis * 1.15 - i * 0.12)); if (q <= 0 || q >= 1) continue
          var p = punt(q, R * (0.6 + i * 0.3))
          for (var s = 5; s >= 0; s--) { var pp = punt(Math.max(0, q - s * 0.035), R * (0.6 + i * 0.3)); NK.vlek(ctx, pp[0], pp[1], R * (0.18 - s * 0.022) * (1 + k * 0.15), s < 2 ? '#ffe14f' : '#ff5a1a', 0.9 - s * 0.12) }
          var vb = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], R * 0.2 * (1 + k * 0.2)); vb.addColorStop(0, '#ffffff'); vb.addColorStop(0.4, '#ffe14f'); vb.addColorStop(1, 'rgba(255,90,20,0)')
          ctx.fillStyle = vb; ctx.beginPath(); ctx.arc(p[0], p[1], R * 0.2 * (1 + k * 0.2), 0, 7); ctx.fill()
        }
        if (inslag > 0) {
          ctx.globalCompositeOperation = 'lighter'
          for (var v = 0; v < 6 + k * 3; v++) { var h = v / (6 + k * 3) * 6.28 + e.zaad, l = R * (0.3 + inslag * (0.8 + k * 0.25)); ctx.save(); ctx.translate(naar.x + Math.cos(h) * l * 0.6, naar.y + Math.sin(h) * l * 0.5); ctx.rotate(h + Math.PI / 2); ctx.globalAlpha = 1 - inslag; ctx.fillStyle = v % 2 ? '#ffb02e' : '#ff5a1a'; ctx.beginPath(); ctx.moveTo(0, -R * 0.25); ctx.quadraticCurveTo(R * 0.12, 0, 0, R * 0.12); ctx.quadraticCurveTo(-R * 0.12, 0, 0, -R * 0.25); ctx.fill(); ctx.restore() }
          NK.vlek(ctx, naar.x, naar.y, R * (0.6 + inslag), '#ff8a3d', (1 - inslag) * 0.8)
        }
        break
      case 'water':
        for (var d = 0; d < 10 + k * 8; d++) {
          var q2 = reis * 1.3 - d * 0.03; if (q2 <= 0 || q2 >= 1) continue
          var p2 = punt(q2, R * 0.3), zw = Math.sin(q2 * 12 + d) * R * 0.08
          ctx.fillStyle = d % 3 ? 'rgba(90,180,255,0.85)' : 'rgba(220,245,255,0.95)'; ctx.beginPath(); ctx.arc(p2[0], p2[1] + zw, R * (0.05 + (d % 3) * 0.02) * (1 + k * 0.15), 0, 7); ctx.fill()
        }
        if (inslag > 0) {
          ctx.strokeStyle = 'rgba(160,220,255,' + (1 - inslag) + ')'; ctx.lineWidth = 4
          for (var w = 0; w < k; w++) { ctx.beginPath(); ctx.ellipse(naar.x, naar.y + R * 0.6, R * (0.4 + inslag * (1 + w * 0.4)), R * (0.12 + inslag * 0.3), 0, 0, 7); ctx.stroke() }
          for (var sp = 0; sp < 10 + k * 4; sp++) { var hs = -Math.PI * (0.1 + 0.8 * ruisE(e, sp)), ls = R * inslag * (0.6 + ruisE(e, sp + 50) * 0.8); ctx.fillStyle = 'rgba(200,240,255,' + (1 - inslag) + ')'; ctx.beginPath(); ctx.arc(naar.x + Math.cos(hs) * ls, naar.y + Math.sin(hs) * ls + inslag * inslag * R * 0.6, R * 0.05, 0, 7); ctx.fill() }
        }
        break
      case 'plant':
        for (var b = 0; b < 3 + k * 2; b++) {
          var q3 = reis * 1.2 - b * 0.06; if (q3 <= 0 || q3 >= 1) continue
          var p3 = punt(q3, R * (0.2 + ruisE(e, b) * 0.8)), off = (ruisE(e, b + 9) - 0.5) * R * 0.8
          ctx.save(); ctx.translate(p3[0], p3[1] + off * Math.sin(q3 * Math.PI)); ctx.rotate(e.t * 18 + b)
          ctx.fillStyle = b % 2 ? '#5be37a' : '#3fbf5a'; ctx.beginPath(); ctx.moveTo(-R * 0.14, 0); ctx.quadraticCurveTo(0, -R * 0.1, R * 0.14, 0); ctx.quadraticCurveTo(0, R * 0.1, -R * 0.14, 0); ctx.fill()
          ctx.strokeStyle = '#2a8a42'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-R * 0.12, 0); ctx.lineTo(R * 0.12, 0); ctx.stroke(); ctx.restore()
        }
        if (inslag > 0) {
          if (k >= 2) { ctx.strokeStyle = 'rgba(60,170,80,' + (1 - inslag) + ')'; ctx.lineWidth = R * 0.08; for (var rk = 0; rk < k; rk++) { ctx.beginPath(); ctx.moveTo(naar.x - R * (0.9 - rk * 0.3), naar.y + R * 0.9); ctx.quadraticCurveTo(naar.x, naar.y - R * (0.5 + inslag * 0.4), naar.x + R * (0.9 - rk * 0.3), naar.y + R * 0.4); ctx.stroke() } }
          for (var gs = 0; gs < 8; gs++) NK.ster(ctx, naar.x + (ruisE(e, gs) - 0.5) * R * 1.6, naar.y + (ruisE(e, gs + 20) - 0.5) * R * 1.2 - inslag * R * 0.4, R * 0.06 * (1 - inslag), '#c8ff9a')
        }
        break
      case 'bliksem':
        if (f > 0.25 && f < 0.75) {
          var bovenY = k >= 2 ? -20 : van.y, bovenX = k >= 2 ? naar.x : van.x
          ctx.globalCompositeOperation = 'lighter'
          for (var z = 0; z < (k >= 2 ? 2 : 1); z++) {
            ctx.strokeStyle = z ? 'rgba(255,255,255,0.95)' : 'rgba(255,225,80,0.9)'; ctx.lineWidth = z ? 2.5 : 7 + k * 2; ctx.shadowColor = '#ffe14f'; ctx.shadowBlur = 18
            ctx.beginPath(); ctx.moveTo(bovenX, bovenY)
            var stukken = 9
            for (var j = 1; j <= stukken; j++) { var qq = j / stukken; ctx.lineTo(bovenX + (naar.x - bovenX) * qq + (j < stukken ? (Math.random() - 0.5) * R * 0.5 : 0), bovenY + (naar.y - bovenY) * qq) }
            ctx.stroke()
          }
          ctx.shadowBlur = 0
          NK.vlek(ctx, naar.x, naar.y, R * (0.8 + k * 0.2), '#ffe14f', 0.6)
        }
        if (inslag > 0) for (var vk = 0; vk < 6 + k * 2; vk++) { var hv = ruisE(e, vk) * 6.28, lv = R * (0.4 + inslag * 0.8); ctx.strokeStyle = 'rgba(255,240,120,' + (1 - inslag) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(naar.x + Math.cos(hv) * lv * 0.5, naar.y + Math.sin(hv) * lv * 0.5); ctx.lineTo(naar.x + Math.cos(hv + 0.3) * lv * 0.8, naar.y + Math.sin(hv - 0.2) * lv * 0.8); ctx.lineTo(naar.x + Math.cos(hv) * lv, naar.y + Math.sin(hv) * lv); ctx.stroke() }
        break
      case 'schaduw':
        if (reis < 1) { var p4 = punt(reis, R * 0.3), orb = R * (0.18 + k * 0.05); var og = ctx.createRadialGradient(p4[0], p4[1], 0, p4[0], p4[1], orb * 1.6); og.addColorStop(0, '#1a0a2a'); og.addColorStop(0.5, '#5a2a9a'); og.addColorStop(1, 'rgba(165,107,255,0)'); ctx.fillStyle = og; ctx.beginPath(); ctx.arc(p4[0], p4[1], orb * 1.6, 0, 7); ctx.fill(); for (var sw = 0; sw < 4; sw++) { var pw = punt(Math.max(0, reis - sw * 0.06), R * 0.3); NK.vlek(ctx, pw[0], pw[1], orb * (1 - sw * 0.2), '#a56bff', 0.3) } }
        if (inslag > 0) {
          for (var kl = 0; kl < 3; kl++) {
            var start = kl * 0.15; if (inslag < start) continue
            var q5 = Math.min(1, (inslag - start) / 0.3), fade = Math.max(0, 1 - (inslag - start) / 0.7)
            ctx.strokeStyle = 'rgba(200,120,255,' + fade + ')'; ctx.lineWidth = R * 0.07; ctx.shadowColor = '#a56bff'; ctx.shadowBlur = 14
            ctx.beginPath(); ctx.moveTo(naar.x - R * 0.6 + kl * R * 0.3, naar.y - R * 0.7); ctx.lineTo(naar.x - R * 0.6 + kl * R * 0.3 + R * 0.6 * q5, naar.y - R * 0.7 + R * 1.2 * q5); ctx.stroke(); ctx.shadowBlur = 0
          }
          NK.vlek(ctx, naar.x, naar.y, R * 0.9, '#5a2a9a', (1 - inslag) * 0.5)
        }
        break
      case 'ijs':
        for (var ijs = 0; ijs < 3 + k * 2; ijs++) {
          var q6 = reis * 1.2 - ijs * 0.05; if (q6 <= 0 || q6 >= 1) continue
          var p6 = punt(q6, R * 0.2), o6 = (ruisE(e, ijs) - 0.5) * R * 0.7 * Math.sin(q6 * Math.PI), hoek = Math.atan2(naar.y - van.y, naar.x - van.x)
          ctx.save(); ctx.translate(p6[0], p6[1] + o6); ctx.rotate(hoek); ctx.fillStyle = 'rgba(210,245,255,0.95)'; ctx.strokeStyle = '#7fe0ff'; ctx.lineWidth = 1.5
          ctx.beginPath(); ctx.moveTo(R * 0.2, 0); ctx.lineTo(-R * 0.06, -R * 0.06); ctx.lineTo(-R * 0.14, 0); ctx.lineTo(-R * 0.06, R * 0.06); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore()
        }
        if (inslag > 0) {
          ctx.strokeStyle = 'rgba(200,240,255,' + (1 - inslag) + ')'; ctx.lineWidth = 2
          for (var sf = 0; sf < 4 + k * 2; sf++) { var hx = naar.x + (ruisE(e, sf) - 0.5) * R * 1.8, hy = naar.y + (ruisE(e, sf + 7) - 0.5) * R * 1.4, sr = R * 0.12 * (0.5 + inslag); for (var a3 = 0; a3 < 3; a3++) { var h3 = a3 * Math.PI / 3 + inslag; ctx.beginPath(); ctx.moveTo(hx - Math.cos(h3) * sr, hy - Math.sin(h3) * sr); ctx.lineTo(hx + Math.cos(h3) * sr, hy + Math.sin(h3) * sr); ctx.stroke() } }
          if (k >= 2) { ctx.fillStyle = 'rgba(160,230,255,' + (0.5 * (1 - inslag)) + ')'; for (var kr = 0; kr < 5; kr++) { var hk = -Math.PI * (0.15 + kr * 0.17); ctx.save(); ctx.translate(naar.x + Math.cos(hk) * R * 0.7, naar.y + R * 0.7); ctx.rotate(hk + Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -R * 0.4 * Math.min(1, inslag * 3)); ctx.lineTo(R * 0.08, 0); ctx.lineTo(-R * 0.08, 0); ctx.fill(); ctx.restore() } }
        }
        break
      case 'aarde':
        for (var rs = 0; rs < k + 1; rs++) {
          var q7 = reis * 1.15 - rs * 0.12; if (q7 <= 0 || q7 >= 1) continue
          var p7 = punt(q7, R * (0.9 + rs * 0.2)), rr = R * (0.13 + k * 0.03)
          ctx.save(); ctx.translate(p7[0], p7[1]); ctx.rotate(e.t * 8 + rs); ctx.fillStyle = '#8a6a4a'; ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 2
          ctx.beginPath(); for (var pt = 0; pt < 7; pt++) { var hp = pt / 7 * 6.28, lr = rr * (0.75 + ruisE(e, pt + rs * 10) * 0.4); ctx.lineTo(Math.cos(hp) * lr, Math.sin(hp) * lr) } ctx.closePath(); ctx.fill(); ctx.stroke()
          ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(-rr * 0.3, -rr * 0.3, rr * 0.25, 0, 7); ctx.fill(); ctx.restore()
        }
        if (inslag > 0) {
          for (var st2 = 0; st2 < 6 + k * 2; st2++) { var hd = -Math.PI * ruisE(e, st2), ld = R * inslag * (0.6 + ruisE(e, st2 + 3) * 0.6); ctx.fillStyle = 'rgba(190,150,100,' + (0.7 * (1 - inslag)) + ')'; ctx.beginPath(); ctx.arc(naar.x + Math.cos(hd) * ld, naar.y + R * 0.6 + Math.sin(hd) * ld * 0.4, R * (0.1 + inslag * 0.15), 0, 7); ctx.fill() }
          if (k >= 3) { ctx.strokeStyle = 'rgba(60,40,20,' + (1 - inslag) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(naar.x - R, naar.y + R * 0.85); ctx.lineTo(naar.x - R * 0.4, naar.y + R * 0.75); ctx.lineTo(naar.x, naar.y + R * 0.9); ctx.lineTo(naar.x + R * 0.5, naar.y + R * 0.75); ctx.lineTo(naar.x + R, naar.y + R * 0.88); ctx.stroke() }
        }
        break
      case 'lucht':
        for (var wb = 0; wb < k + 1; wb++) {
          var q8 = reis * 1.15 - wb * 0.1; if (q8 <= 0 || q8 >= 1) continue
          var p8 = punt(q8, R * 0.1 * wb)
          ctx.save(); ctx.translate(p8[0], p8[1] + (wb - k / 2) * R * 0.2); ctx.rotate(e.t * 14 + wb)
          ctx.strokeStyle = 'rgba(230,245,255,0.95)'; ctx.lineWidth = R * 0.06; ctx.beginPath(); ctx.arc(0, 0, R * (0.2 + k * 0.04), 0, Math.PI * 1.1); ctx.stroke()
          ctx.strokeStyle = 'rgba(168,200,255,0.7)'; ctx.lineWidth = R * 0.03; ctx.beginPath(); ctx.arc(0, 0, R * (0.28 + k * 0.04), 0.4, Math.PI * 1.3); ctx.stroke(); ctx.restore()
        }
        if (inslag > 0) {
          ctx.strokeStyle = 'rgba(220,240,255,' + (1 - inslag) + ')'; ctx.lineWidth = 2.5
          for (var tor = 0; tor < 5 + k; tor++) { var yy = naar.y + R * 0.8 - tor * R * 0.28, br = R * (0.15 + tor * 0.1) * (1 + inslag * 0.3); ctx.beginPath(); ctx.ellipse(naar.x + Math.sin(e.t * 10 + tor) * R * 0.1, yy, br, br * 0.28, 0, inslag * 10 + tor, inslag * 10 + tor + 4.5); ctx.stroke() }
        }
        break
      case 'grauw':
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3
        for (var gr2 = 0; gr2 < 4; gr2++) { var q9 = (f * 1.5 - gr2 * 0.15); if (q9 <= 0 || q9 >= 1) continue; var p9 = punt(q9, 0); ctx.globalAlpha = 1 - q9; ctx.beginPath(); ctx.arc(p9[0], p9[1], R * (0.2 + q9 * 0.5), -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(p9[0], p9[1], R * (0.2 + q9 * 0.5), Math.PI - 0.9, Math.PI + 0.9); ctx.stroke() }
        break
      case 'schild':
        var sR = van.r * 1.15 * Math.min(1, f * 3), sa = f < 0.7 ? 0.8 : (1 - f) / 0.3 * 0.8
        ctx.strokeStyle = 'rgba(127,224,255,' + sa + ')'; ctx.fillStyle = 'rgba(127,224,255,' + sa * 0.18 + ')'; ctx.lineWidth = 3
        ctx.beginPath(); for (var hx2 = 0; hx2 < 6; hx2++) { var hh2 = hx2 / 6 * 6.28 + Math.PI / 6; ctx.lineTo(van.x + Math.cos(hh2) * sR, van.y + Math.sin(hh2) * sR * 1.05) } ctx.closePath(); ctx.fill(); ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,' + sa * 0.6 + ')'; ctx.beginPath(); ctx.ellipse(van.x - sR * 0.35, van.y - sR * 0.45, sR * 0.25, sR * 0.1, -0.6, 0, 7); ctx.fill()
        break
      case 'herstel':
        for (var hl = 0; hl < 10; hl++) { var qh = (f * 1.4 - ruisE(e, hl) * 0.4); if (qh <= 0 || qh >= 1) continue; var hxp = van.x + (ruisE(e, hl + 5) - 0.5) * van.r * 1.6, hyp = van.y + van.r * 0.6 - qh * van.r * 1.6, hr = van.r * 0.08; ctx.globalAlpha = 1 - qh; ctx.fillStyle = '#7dff9a'; ctx.fillRect(hxp - hr, hyp - hr * 0.3, hr * 2, hr * 0.6); ctx.fillRect(hxp - hr * 0.3, hyp - hr, hr * 0.6, hr * 2) }
        ctx.globalAlpha = 1; NK.vlek(ctx, van.x, van.y, van.r * 1.3, '#7dff9a', 0.35 * Math.sin(f * Math.PI))
        break
      default:
        // normale stoot: een klap-ster met snelheidsstreepjes
        if (inslag > 0) {
          ctx.fillStyle = 'rgba(255,255,255,' + (1 - inslag) + ')'
          ctx.beginPath(); for (var ns = 0; ns < 16; ns++) { var hn = ns / 16 * 6.28, ln = (ns % 2 ? 0.25 : 0.6) * R * (0.6 + inslag * 0.6); ctx.lineTo(naar.x + Math.cos(hn) * ln, naar.y + Math.sin(hn) * ln) } ctx.closePath(); ctx.fill()
          ctx.fillStyle = 'rgba(255,225,100,' + (1 - inslag) + ')'; ctx.beginPath(); ctx.arc(naar.x, naar.y, R * 0.18 * (1 - inslag * 0.5), 0, 7); ctx.fill()
        }
    }
    ctx.restore()
    return f < 1
  })
  if (flitsKleur) { flitsKleur.t -= dt; if (flitsKleur.t <= 0) flitsKleur = null; else { ctx.fillStyle = NK.hexA(flitsKleur.k, flitsKleur.t * 0.7); ctx.fillRect(0, 0, C.W, C.H) } }
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
      startEffect(e.aanval, e.wie)
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
    var gb = k.soort === 'poort' ? MT.GEBIEDEN.length - 1 : k.gebied
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
    else if (!alle) zeg(null, 'Een vreemd licht schijnt hier... Kom terug als je alle acht badges hebt.')
    else zeg(null, 'Er verschijnt een wezen van sterrenlicht!', function () { overgangNaar(function () { klaarVoorGevecht(); startGevecht(MT.gevecht('wild', [MT.maak('sterrenkat', 42)], { gebied: MT.GEBIEDEN.length - 1, sleutel: 'ster', vangkans: 0.3 })) }) })
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
  if (b.soort === 'huis') zeg('Bewoner', ['Mijn opa ving vroeger een Sterrenkat... zegt hij.', 'Wist je dat Herstel je wezen midden in een gevecht beter maakt?', 'Superbollen vangen veel beter dan glimbollen!', 'Een wezen leert nieuwe aanvallen als het een niveau omhoog gaat.', 'Aardewezens zijn sterk tegen vuur en bliksem, maar water spoelt ze weg.', 'Op elke route ligt wel iets op de grond. Kijk goed!', 'Luchtwezens? Neem een bliksem- of ijswezen mee!', 'IJs smelt door vuur. Neem een vuurwezen mee naar de gym!', 'Dit is het laatste dorp. Leider Nox is de sterkste van allemaal.'][W8.a / 2])
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
  if (!D.team.length) { if (!D.uitlegGezien) { D.uitlegGezien = true; D.bewaar(); return toonUitleg(naarStarter) } return naarStarter() }
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
  var gb = D.gevecht ? MT.GEBIEDEN[D.gevecht.gebied] : MT.GEBIEDEN[Math.min(MT.GEBIEDEN.length - 1, MTW.gebiedVan(D.pos.a))]
  var hue = { '#5be37a': 140, '#ffd23d': 45, '#3fa8ff': 210, '#c8904a': 30, '#ff6a3d': 15, '#a8c8ff': 210, '#7fe0ff': 195, '#a56bff': 270 }[gb.kleur] || 200
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

// ── uitleg ──
function toonUitleg(klaar) {
  var wezen = function (id) { return function (g, w) { MTZ.teken(g, id, w / 2, w / 2 + 4, 36, { stil: true }) } }
  var spul = function (soort) { return function (g, w) { g.drawImage(spulIcoon(soort, 28), w / 2 - 28, w / 2 - 28) } }
  NK.uitleg([
    [wezen('vonkel'), 'Kies je eerste wezen. Loop met de pijltjes of tik op de plek waar je heen wilt. Met de A-knop praat je en bekijk je dingen.'],
    [function (g, w) { for (var i = 0; i < 9; i++) { var x = 14 + i * 6.5; g.strokeStyle = i % 2 ? '#3fbf5a' : '#2a9a46'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 64); g.quadraticCurveTo(x + 3, 42, x + (i % 3 - 1) * 5, 20 + (i % 2) * 8); g.stroke() } }, 'In het hoge gras wonen wilde wezens. Loop erdoor en je komt ze tegen.'],
    [function (g, w) { MTW.embleem(g, 'water', 28, 40, 13, MT.KLEUR.water); MTW.embleem(g, 'vuur', 54, 40, 13, MT.KLEUR.vuur); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(36, 40); g.lineTo(45, 40); g.moveTo(41, 35); g.lineTo(46, 40); g.lineTo(41, 45); g.stroke() }, 'In een gevecht kies je een aanval. Elk element is sterk tegen een ander: water wint van vuur, vuur van plant, plant van water. Kijk wat de mensen in de dorpen erover zeggen.'],
    [spul('glimbol'), 'Is een wild wezen zwak? Gooi een bol om het te vangen. Een superbol vangt beter.'],
    [spul('drankje'), 'Een drankje maakt je wezen beter. In het wezenhuis van elk dorp wordt je hele team gratis weer gezond.'],
    [wezen('vlamvos'), 'Door te vechten worden je wezens sterker. Op een bepaald niveau veranderen ze in een nieuwe, stoere vorm.'],
    [function (g, w) { NK.ster(g, w / 2, w / 2, 24, '#ffd23d') }, 'In elk dorp is een gym. Versla de leider en je krijgt een badge. De wachter laat je pas door als je die badge hebt. Met acht badges mag je naar de Sterrenpoort.'],
    [function (g, w) { g.save(); g.imageSmoothingEnabled = false; g.translate(16, 12); g.scale(3, 3); MTW.persoon(g, 0, 0, 2, 0, { pet: '#7a3ad8', jas: '#e8443a' }); g.restore() }, 'Trainers die je zien, dagen je uit. Winnen geeft munten voor de winkel.'],
  ], klaar)
}
$('naaruitleg').onclick = function () { Geluid.klik(); toonUitleg() }
})()
