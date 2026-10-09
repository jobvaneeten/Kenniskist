// ═══════════════════════════════════════════════════════════════════════════
//  NEONHOCKEY — kern: tafel, natuurkunde, computerspeler en wedstrijdklok.
//  Geen DOM: gedeeld door spel.js en tools/neonhockeyTest.js (bot-test).
//
//  Tafel: breedte 1, hoogte 1.6 (staand). Kant 0 speelt onderaan en scoort in
//  het doel bovenaan; kant 1 (computer of speler 2) speelt bovenaan.
//  Een wedstrijd duurt 60 seconden; staat het dan gelijk, dan volgt een
//  gouden goal (max 20 s, daarna gelijkspel). Na een goal krijgt de kant die
//  het doelpunt tegen kreeg de puck.
// ═══════════════════════════════════════════════════════════════════════════
var HK = (function () {
  var B = 1, H = 1.6, PR = 0.034, KR = 0.064, DOEL = 0.34
  var D0 = (B - DOEL) / 2, D1 = (B + DOEL) / 2
  var MAXV = 2.9, WRIJVING = 0.22, VEER = 0.9, MUUR = 0.88
  var DUUR = 60, GOUDEN = 20

  // Tegenstanders: snelheid = max snelheid van zijn stick, reactie = hoe vaak hij
  // opnieuw kijkt (s), fout = hoe slordig hij mikt, aanval = hoe graag hij
  // naar voren komt. Extra's maken de latere tafels anders.
  var TEGENSTANDERS = [
    { naam: 'Robo Rob', kleur: '#8cff5a', snelheid: 0.9, reactie: 0.32, fout: 0.30, aanval: 0.35, uitleg: 'Een rustige robot om te oefenen' },
    { naam: 'Pixel Pim', kleur: '#3ef0ff', snelheid: 1.15, reactie: 0.26, fout: 0.24, aanval: 0.45, uitleg: 'Iets sneller, mikt nog slordig' },
    { naam: 'Turbo Tess', kleur: '#ffc83d', snelheid: 1.4, reactie: 0.22, fout: 0.2, aanval: 0.55, uitleg: 'Houdt van aanvallen', extra: 'snel' },
    { naam: 'Bumper Bas', kleur: '#ff8a3d', snelheid: 1.5, reactie: 0.2, fout: 0.18, aanval: 0.5, uitleg: 'Speelt met bumpers op de middenlijn', extra: 'bumpers' },
    { naam: 'Muur Mila', kleur: '#9b6bff', snelheid: 1.9, reactie: 0.15, fout: 0.15, aanval: 0.45, uitleg: 'Een supersterke keeper' },
    { naam: 'Dubbel Daan', kleur: '#ff4fd8', snelheid: 1.75, reactie: 0.17, fout: 0.16, aanval: 0.5, uitleg: 'Twee pucks tegelijk!', extra: 'dubbel' },
    { naam: 'Flits Fenna', kleur: '#4f8cff', snelheid: 2.05, reactie: 0.14, fout: 0.12, aanval: 0.6, uitleg: 'Bliksemsnel en precies', extra: 'snel' },
    { naam: 'Kampioen Kai', kleur: '#ff4f6a', snelheid: 2.3, reactie: 0.12, fout: 0.1, aanval: 0.6, uitleg: 'De eindbaas: bumpers én twee pucks', extra: 'alles' },
  ]
  var BUMPERS = [{ x: 0.2, y: H / 2, r: 0.045 }, { x: 0.8, y: H / 2, r: 0.045 }]

  function rng(seed) {
    var a = seed >>> 0 || 1
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
  }
  function klem(v, a, b) { return v < a ? a : v > b ? b : v }

  function stick(kant) { var y = kant === 0 ? H - 0.16 : 0.16; return { x: 0.5, y: y, vx: 0, vy: 0, doelX: 0.5, doelY: y } }
  function puck(x, y) { return { x: x, y: y, vx: 0, vy: 0, spoor: [], laatst: -1 } }

  // opties: { tegen: index (of null voor 2 spelers), ai0: index (alleen voor tests), seed }
  function nieuweWedstrijd(o) {
    o = o || {}
    var t = o.tegen == null ? null : TEGENSTANDERS[o.tegen]
    var extra = t ? t.extra : o.extra
    var w = {
      tegen: t, ai: [o.ai0 == null ? null : TEGENSTANDERS[o.ai0], t],
      sticks: [stick(0), stick(1)], pucks: [], score: [0, 0],
      klok: DUUR, gouden: false, over: false, winnaar: -1,
      pauze: 0.9, rand: rng(o.seed || (Date.now() & 0xffffff)),
      bumpers: extra === 'bumpers' || extra === 'alles' ? BUMPERS : [],
      maxv: MAXV * (extra === 'snel' || extra === 'alles' ? 1.12 : 1),
      tijd: 0, stil: 0, raken: [0, 0], schoten: [0, 0], denk: [0, 0], aiDoel: [null, null], wijk: [0, 0],
    }
    var n = extra === 'dubbel' || extra === 'alles' ? 2 : 1
    // begin: de puck ligt bij kant 0 (de speler mag beginnen); bij twee pucks één per helft
    for (var i = 0; i < n; i++) w.pucks.push(puck(n === 1 ? 0.5 : (i ? 0.7 : 0.3), i ? H * 0.28 : H * 0.72))
    return w
  }

  // ── computerspeler ── kiest de gevaarlijkste puck en verdedigt of valt aan
  function denkAI(w, k, dt) {
    var ai = w.ai[k], s = w.sticks[k]
    w.denk[k] -= dt
    // na een klap even terug: anders blijft hij tegen de puck duwen en klemt
    // hij hem vast in een hoek
    if (w.wijk[k] > 0) {
      w.wijk[k] -= dt
      s.doelX = 0.5 + (s.x - 0.5) * 0.6; s.doelY = k === 0 ? H - 0.14 : 0.14
      w.aiDoel[k] = null
      return
    }
    if (w.denk[k] > 0 && w.aiDoel[k]) { s.doelX = w.aiDoel[k].x; s.doelY = w.aiDoel[k].y; return }
    w.denk[k] = ai.reactie * (0.7 + w.rand() * 0.6)
    var eigenY = k === 0 ? H : 0, richting = k === 0 ? -1 : 1   // richting = naar de tegenstander
    // gevaarlijkste puck: dichtbij eigen doel en/of komt eraan
    var p = null, best = -1e9
    w.pucks.forEach(function (q) {
      var afstand = Math.abs(q.y - eigenY), komt = -q.vy * richting
      var g = -afstand * 2 + komt * 0.6
      if (g > best) { best = g; p = q }
    })
    var thuisY = k === 0 ? H - 0.12 : 0.12
    var inEigenHelft = k === 0 ? p.y >= H / 2 : p.y <= H / 2
    var komtEraan = -p.vy * richting > 0.15
    var tx, ty
    var snel = Math.hypot(p.vx, p.vy)
    if (inEigenHelft && (!komtEraan || snel < 1.2 || w.rand() < ai.aanval)) {
      // aanvallen: mik op het doel van de tegenstander, met wat slordigheid
      var mikX = 0.5 + (w.rand() - 0.5) * (DOEL * 0.8 + ai.fout * 1.4)
      var mikY = k === 0 ? 0 : H
      var dx = mikX - p.x, dy = mikY - p.y, l = Math.hypot(dx, dy) || 1
      dx /= l; dy /= l
      var achter = (s.y - p.y) * richting < -0.01   // stick zit tussen puck en eigen doel
      if (achter) { tx = p.x + dx * 0.12; ty = p.y + dy * 0.12 }       // doorstoten
      else {
        // eerst achter de puck komen, opzij langs de puck
        tx = p.x - dx * (KR + PR + 0.05) + (s.x < p.x ? -1 : 1) * 0.06
        ty = p.y - dy * (KR + PR + 0.05)
      }
    } else {
      // verdedigen: tussen puck en eigen doel, op de lijn naar het doelmidden
      var vooruit = komtEraan ? 0.35 : 0.15
      var px = p.x + p.vx * vooruit
      tx = 0.5 + (klem(px, 0, B) - 0.5) * 0.55
      ty = thuisY + richting * (komtEraan ? 0.02 : 0.08)
    }
    tx += (w.rand() - 0.5) * ai.fout * 0.08
    w.aiDoel[k] = { x: tx, y: ty }
    s.doelX = tx; s.doelY = ty
  }

  function grenzen(k) {
    return k === 0 ? [KR, B - KR, H / 2 + KR * 0.35, H - KR] : [KR, B - KR, KR, H / 2 - KR * 0.35]
  }

  function botsStick(w, p, s, k, ev) {
    var dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy), min = PR + KR
    if (d >= min || d === 0) return
    var nx = dx / d, ny = dy / d
    p.x = s.x + nx * min; p.y = s.y + ny * min
    var rvx = p.vx - s.vx, rvy = p.vy - s.vy, vn = rvx * nx + rvy * ny
    if (vn < 0) {
      rvx -= (1 + VEER) * vn * nx; rvy -= (1 + VEER) * vn * ny
      p.vx = rvx + s.vx; p.vy = rvy + s.vy
      var kracht = -vn
      if (kracht > 0.25) { ev.push({ type: 'raak', kant: k, kracht: kracht, x: p.x, y: p.y }); w.raken[k]++ }
      if (w.ai[k]) w.wijk[k] = 0.22 + w.rand() * 0.12
      p.laatst = k
      if (k === 0 ? p.vy < -0.8 : p.vy > 0.8) w.schoten[k]++
    }
    var v = Math.hypot(p.vx, p.vy)
    if (v > w.maxv) { p.vx *= w.maxv / v; p.vy *= w.maxv / v }
  }

  function botsPunt(p, px, py, r, ev, type) {
    var dx = p.x - px, dy = p.y - py, d = Math.hypot(dx, dy), min = PR + r
    if (d >= min || d === 0) return
    var nx = dx / d, ny = dy / d
    p.x = px + nx * min; p.y = py + ny * min
    var vn = p.vx * nx + p.vy * ny
    if (vn < 0) { p.vx -= 2 * vn * nx * MUUR + vn * nx * (1 - MUUR); p.vy -= 2 * vn * ny * MUUR + vn * ny * (1 - MUUR); if (-vn > 0.3) ev.push({ type: type, x: p.x, y: p.y, kracht: -vn }) }
  }

  function zetPuck(w, p, naarKant) {
    // na een goal: puck stil in de helft van de kant die het doelpunt tegen kreeg
    p.x = w.pucks.length > 1 ? 0.3 + w.rand() * 0.4 : 0.5
    p.y = naarKant === 0 ? H * 0.72 : H * 0.28
    p.vx = 0; p.vy = 0; p.spoor = []; p.laatst = -1
  }

  // muren, doelpalen en eindmuren (behalve in de doelmond). Komt na de
  // botsingen met sticks en pucks, zodat die de puck nooit door een muur duwen.
  function muren(w, p, ev) {
    // zijmuren
    if (p.x < PR) { p.x = PR; if (p.vx < 0) { if (p.vx < -0.3) ev.push({ type: 'muur', x: p.x, y: p.y, kracht: -p.vx }); p.vx = -p.vx * MUUR } }
    if (p.x > B - PR) { p.x = B - PR; if (p.vx > 0) { if (p.vx > 0.3) ev.push({ type: 'muur', x: p.x, y: p.y, kracht: p.vx }); p.vx = -p.vx * MUUR } }
    // doelpalen
    botsPunt(p, D0, 0, 0.004, ev, 'paal'); botsPunt(p, D1, 0, 0.004, ev, 'paal')
    botsPunt(p, D0, H, 0.004, ev, 'paal'); botsPunt(p, D1, H, 0.004, ev, 'paal')
    // eindmuren (behalve in de doelmond)
    var inMond = p.x > D0 && p.x < D1
    if (!inMond) {
      if (p.y < PR) { p.y = PR; if (p.vy < 0) { if (p.vy < -0.3) ev.push({ type: 'muur', x: p.x, y: p.y, kracht: -p.vy }); p.vy = -p.vy * MUUR } }
      if (p.y > H - PR) { p.y = H - PR; if (p.vy > 0) { if (p.vy > 0.3) ev.push({ type: 'muur', x: p.x, y: p.y, kracht: p.vy }); p.vy = -p.vy * MUUR } }
    } else {
      // in de doelmond: niet zijwaarts uit de mond ontsnappen
      if (p.y < 0 || p.y > H) { p.x = klem(p.x, D0 + PR * 0.6, D1 - PR * 0.6) }
    }
  }

  // invoer: [ {x,y} | null, {x,y} | null ] = waar de speler zijn stick wil hebben
  function stap(w, dt, invoer) {
    var ev = []
    if (w.over) return ev
    dt = Math.min(dt, 0.05)
    w.tijd += dt
    for (var k = 0; k < 2; k++) {
      if (w.ai[k]) denkAI(w, k, dt)
      else if (invoer && invoer[k]) { w.sticks[k].doelX = invoer[k].x; w.sticks[k].doelY = invoer[k].y }
    }
    // klok
    if (!w.gouden) {
      w.klok -= dt
      if (w.klok <= 0) {
        w.klok = 0
        if (w.score[0] === w.score[1]) { w.gouden = true; w.klok = GOUDEN; ev.push({ type: 'gouden' }) }
        else return eind(w, ev)
      }
    } else {
      w.klok -= dt
      if (w.klok <= 0) { w.klok = 0; return eind(w, ev) }
    }
    // na een goal ligt de puck even stil (de klok loopt door)
    if (w.pauze > 0) {
      w.pauze -= dt
      beweegSticks(w, dt)
      return ev
    }
    // sub-stappen zodat een snelle puck nooit door een stick of muur schiet
    var n = Math.max(2, Math.ceil(dt * w.maxv * 2.2 / PR))
    var h = dt / n
    for (var i = 0; i < n; i++) {
      beweegSticks(w, h)
      for (var j = 0; j < w.pucks.length; j++) {
        var p = w.pucks[j]
        var f = Math.exp(-WRIJVING * h)
        p.vx *= f; p.vy *= f
        p.x += p.vx * h; p.y += p.vy * h
        for (var b = 0; b < w.bumpers.length; b++) botsPunt(p, w.bumpers[b].x, w.bumpers[b].y, w.bumpers[b].r, ev, 'bumper')
        botsStick(w, p, w.sticks[0], 0, ev); botsStick(w, p, w.sticks[1], 1, ev)
        // puck klem tussen stick en muur: stick wijkt
        for (var s = 0; s < 2; s++) {
          var st = w.sticks[s], dx = st.x - p.x, dy = st.y - p.y, d = Math.hypot(dx, dy)
          if (d < PR + KR - 1e-4 && d > 0) { st.x = p.x + dx / d * (PR + KR); st.y = p.y + dy / d * (PR + KR) }
        }
        // pucks onderling
        for (var q = j + 1; q < w.pucks.length; q++) {
          var o = w.pucks[q], ex = o.x - p.x, ey = o.y - p.y, e = Math.hypot(ex, ey)
          if (e < PR * 2 && e > 0) {
            var nx = ex / e, ny = ey / e, ov = (PR * 2 - e) / 2
            p.x -= nx * ov; p.y -= ny * ov; o.x += nx * ov; o.y += ny * ov
            var rv = (o.vx - p.vx) * nx + (o.vy - p.vy) * ny
            if (rv < 0) { p.vx += rv * nx; p.vy += rv * ny; o.vx -= rv * nx; o.vy -= rv * ny }
          }
        }
        muren(w, p, ev)
        // goal?
        if (p.y < -PR * 1.2 || p.y > H + PR * 1.2) {
          var voor = p.y < 0 ? 0 : 1
          w.score[voor]++
          ev.push({ type: 'goal', voor: voor, x: p.x })
          zetPuck(w, p, 1 - voor)
          w.pauze = 0.9
          if (w.gouden) return eind(w, ev)
          return ev
        }
      }
    }
    // stilstand: kruipt de puck lang rond (vastgeklemd in een hoek of gewoon
    // blijven liggen), dan geeft de tafel hem een zetje richting het midden
    var stil = w.pucks.every(function (p) { return Math.hypot(p.vx, p.vy) < 0.3 })
    w.stil = stil ? w.stil + dt : 0
    if (w.stil > 4) {
      w.stil = 0
      w.pucks.forEach(function (p) { p.vx = (0.5 - p.x) * 1.6 + (w.rand() - 0.5) * 0.3; p.vy = (H / 2 - p.y) * 0.9 || (w.rand() < 0.5 ? -0.5 : 0.5) })
      ev.push({ type: 'zetje' })
    }
    w.pucks.forEach(function (p) {
      p.spoor.push(p.x, p.y)
      if (p.spoor.length > 24) p.spoor.splice(0, 2)
    })
    return ev
  }

  function beweegSticks(w, h) {
    for (var k = 0; k < 2; k++) {
      var s = w.sticks[k], g = grenzen(k)
      var tx = klem(s.doelX, g[0], g[1]), ty = klem(s.doelY, g[2], g[3])
      var max = w.ai[k] ? w.ai[k].snelheid : 9   // menselijke speler volgt de vinger bijna direct
      var dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy)
      var m = Math.min(d, max * h)
      var nx = d > 0 ? s.x + dx / d * m : s.x, ny = d > 0 ? s.y + dy / d * m : s.y
      s.vx = h > 0 ? (nx - s.x) / h : 0; s.vy = h > 0 ? (ny - s.y) / h : 0
      // een vinger kan "teleporteren": de snelheid die de puck voelt is begrensd
      var v = Math.hypot(s.vx, s.vy)
      if (v > 4.2) { s.vx *= 4.2 / v; s.vy *= 4.2 / v }
      s.x = nx; s.y = ny
    }
  }

  function eind(w, ev) {
    w.over = true
    w.winnaar = w.score[0] > w.score[1] ? 0 : w.score[1] > w.score[0] ? 1 : -1
    ev.push({ type: 'einde', winnaar: w.winnaar })
    return ev
  }

  // munten voor kant 0 na een wedstrijd tegen tegenstander nr. t
  function beloning(w, t) {
    var m = w.score[0] * 3
    if (w.winnaar === 0) m += 15 + t * 5
    else if (w.winnaar === -1) m += 5
    return m
  }

  return { B: B, H: H, PR: PR, KR: KR, DOEL: DOEL, D0: D0, D1: D1, DUUR: DUUR, TEGENSTANDERS: TEGENSTANDERS,
    nieuweWedstrijd: nieuweWedstrijd, stap: stap, grenzen: grenzen, beloning: beloning, rng: rng }
})()
if (typeof globalThis !== 'undefined') globalThis.HK = HK
