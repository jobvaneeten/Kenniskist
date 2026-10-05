// ═══════════════════════════════════════════════════════════════════════════
//  BLOKKENBLITZ — kern: bord, vormen, score en de eerlijke blokkengever.
//  Geen DOM: gedeeld door spel.js en tools/blokkenblitzTest.js (bot-test).
//
//  Regels: 8×8 bord, je krijgt 3 blokken tegelijk. Volle rijen én kolommen
//  verdwijnen. Pas als alle 3 zijn gelegd komen er 3 nieuwe. Past geen van je
//  overgebleven blokken meer ⇒ game over.
//  Eerlijk: de gever geeft nooit een set waarvan niets past, en vroeg in het
//  spel altijd een set die in z'n geheel te leggen is. Hoe hoger je score, hoe
//  vaker hij dat loslaat (moeilijker) — maar er past altijd minstens één.
// ═══════════════════════════════════════════════════════════════════════════
var BB = (function () {
  var N = 8, VOL = 255

  // ── vormen ── (families met gewicht; alle draaiingen worden afgeleid)
  var FAMILIES = [
    { cellen: [[0, 0]], gewicht: 1.5, kleur: 0 },
    { cellen: [[0, 0], [0, 1]], gewicht: 3, kleur: 1 },
    { cellen: [[0, 0], [0, 1], [0, 2]], gewicht: 4, kleur: 2 },
    { cellen: [[0, 0], [1, 0], [1, 1]], gewicht: 5, kleur: 3 },
    { cellen: [[0, 0], [0, 1], [0, 2], [0, 3]], gewicht: 4, kleur: 4 },
    { cellen: [[0, 0], [0, 1], [1, 0], [1, 1]], gewicht: 5, kleur: 5 },
    { cellen: [[0, 0], [0, 1], [0, 2], [1, 1]], gewicht: 4, kleur: 6 },
    { cellen: [[0, 0], [1, 0], [2, 0], [2, 1]], gewicht: 5, kleur: 7, spiegel: true },
    { cellen: [[0, 1], [0, 2], [1, 0], [1, 1]], gewicht: 3, kleur: 1, spiegel: true },
    { cellen: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], gewicht: 2, kleur: 2 },
    { cellen: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], gewicht: 3, kleur: 3 },
    { cellen: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], gewicht: 3, kleur: 4 },
    { cellen: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], gewicht: 1.5, kleur: 6 },
  ]
  var KLEUREN = 8

  function norm(c) {
    var mr = Math.min.apply(null, c.map(function (p) { return p[0] })), mc = Math.min.apply(null, c.map(function (p) { return p[1] }))
    return c.map(function (p) { return [p[0] - mr, p[1] - mc] }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1] })
  }
  function sleutel(c) { return c.map(function (p) { return p.join(',') }).join(';') }
  var VORMEN = []
  FAMILIES.forEach(function (f, fi) {
    var gezien = {}, varianten = []
    var basis = [f.cellen]
    if (f.spiegel) basis.push(f.cellen.map(function (p) { return [p[0], -p[1]] }))
    basis.forEach(function (b) {
      var c = b
      for (var k = 0; k < 4; k++) {
        c = norm(c.map(function (p) { return [p[1], -p[0]] }))
        var s = sleutel(c)
        if (!gezien[s]) { gezien[s] = 1; varianten.push(c) }
      }
    })
    varianten.forEach(function (c) {
      var h = 0, w = 0, rijen = []
      c.forEach(function (p) { h = Math.max(h, p[0] + 1); w = Math.max(w, p[1] + 1) })
      for (var r = 0; r < h; r++) rijen.push(0)
      c.forEach(function (p) { rijen[p[0]] |= 1 << p[1] })
      VORMEN.push({ id: VORMEN.length, familie: fi, cellen: c, h: h, w: w, rijen: rijen, n: c.length,
        gewicht: f.gewicht / varianten.length, kleur: f.kleur })
    })
  })

  // ── random (seedbaar voor tests) ──
  function rng(seed) {
    var a = seed >>> 0
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
  }

  // ── bitbord-operaties (rijen = 8 getallen van 8 bits) ──
  function past(rijen, v, r, c) {
    if (r < 0 || c < 0 || r + v.h > N || c + v.w > N) return false
    for (var i = 0; i < v.h; i++) if (rijen[r + i] & (v.rijen[i] << c)) return false
    return true
  }
  function pastErgens(rijen, v) {
    for (var r = 0; r <= N - v.h; r++) for (var c = 0; c <= N - v.w; c++) if (past(rijen, v, r, c)) return true
    return false
  }
  // legt v neer en ruimt op; geeft {rijen: nieuwe rijen, volR: [...], volK: [...]}
  function leg(rijen, v, r, c) {
    var nr = rijen.slice()
    for (var i = 0; i < v.h; i++) nr[r + i] |= v.rijen[i] << c
    var volR = [], kol = VOL
    for (i = 0; i < N; i++) { if (nr[i] === VOL) volR.push(i); kol &= nr[i] }
    var volK = []
    for (i = 0; i < N; i++) if (kol & (1 << i)) volK.push(i)
    for (i = 0; i < volR.length; i++) nr[volR[i]] = 0
    if (kol) for (i = 0; i < N; i++) nr[i] &= ~kol
    return { rijen: nr, volR: volR, volK: volK }
  }
  // kan de hele set (in een of andere volgorde) gelegd worden? (begrensd zoeken)
  function allesPlaatsbaar(rijen, set, budget) {
    var teller = { n: budget || 40000 }
    function dfs(rj, rest) {
      if (!rest.length) return true
      if (--teller.n < 0) return true          // te veel werk: geef het voordeel van de twijfel
      for (var k = 0; k < rest.length; k++) {
        var v = rest[k], over = rest.slice(0, k).concat(rest.slice(k + 1))
        for (var r = 0; r <= N - v.h; r++) for (var c = 0; c <= N - v.w; c++) {
          if (!past(rj, v, r, c)) continue
          if (dfs(leg(rj, v, r, c).rijen, over)) return true
        }
      }
      return false
    }
    return dfs(rijen, set)
  }
  function telVol(rijen) { var n = 0; for (var i = 0; i < N; i++) { var x = rijen[i]; while (x) { n += x & 1; x >>= 1 } } return n }

  // ── eerlijke blokkengever ──
  function trekVorm(rand, groot) {
    var tot = 0, i
    for (i = 0; i < VORMEN.length; i++) tot += VORMEN[i].gewicht * (VORMEN[i].n >= 5 ? groot : 1)
    var x = rand() * tot
    for (i = 0; i < VORMEN.length; i++) { x -= VORMEN[i].gewicht * (VORMEN[i].n >= 5 ? groot : 1); if (x <= 0) return VORMEN[i] }
    return VORMEN[VORMEN.length - 1]
  }
  // maakt een van de blokken in de set ergens een rij of kolom vol?
  function helpt(rijen, set) {
    return set.some(function (v) {
      for (var r = 0; r <= N - v.h; r++) for (var c = 0; c <= N - v.w; c++) {
        if (!past(rijen, v, r, c)) continue
        var x = leg(rijen, v, r, c); if (x.volR.length || x.volK.length) return true
      }
      return false
    })
  }
  function trekSet(rijen, score, rand) {
    var d = Math.min(1, score / 8000)                 // 0 = begin, 1 = expert
    var vul = telVol(rijen) / 64
    var groot = (0.6 + 0.9 * d) * (vul > 0.5 ? 0.5 : 1)  // vol bord: minder grote stukken (genade)
    var eisAlles = rand() < 1 - 0.4 * d               // kans dat de héle set gegarandeerd past
    var eisHulp = vul > 0.25 && rand() < 0.55 * (1 - d)  // beginners: vaak een blok dat een lijn afmaakt
    var reserve = null
    for (var poging = 0; poging < 40; poging++) {
      var set = [trekVorm(rand, groot), trekVorm(rand, groot), trekVorm(rand, groot)]
      if (!set.some(function (v) { return pastErgens(rijen, v) })) continue
      if (eisAlles && !allesPlaatsbaar(rijen, set)) continue
      if (eisHulp && !helpt(rijen, set)) { reserve = reserve || set; continue }
      return set
    }
    if (reserve) return reserve
    // terugval: zorg dat er minstens één klein stuk is dat past
    set = [trekVorm(rand, groot), trekVorm(rand, groot), VORMEN[0]]
    var klein = VORMEN.filter(function (v) { return v.n <= 3 && pastErgens(rijen, v) })
    if (klein.length) set[2] = klein[Math.floor(rand() * klein.length)]
    return set
  }

  // ── score ──
  // cellen leggen = 1 punt per cel · lijnen: 1→10, 2→30, 3→60, 4→100 … × combo
  // combo loopt op zolang je binnen 3 zetten weer iets wegspeelt
  function lijnPunten(L) { return 10 * L * (L + 1) / 2 }
  var PERFECT = 300

  // ── spel ──
  function nieuwSpel(seed) {
    var s = { kleur: new Int8Array(64).fill(-1), rijen: [0, 0, 0, 0, 0, 0, 0, 0], set: null, score: 0, combo: 0, sinds: 0,
      zetten: 0, lijnen: 0, perfects: 0, besteCombo: 0, over: false, rand: rng(seed == null ? (Math.random() * 4294967296) >>> 0 : seed) }
    s.set = trekSet(s.rijen, 0, s.rand)
    return s
  }
  function kan(s, i, r, c) { return !s.over && !!s.set[i] && past(s.rijen, s.set[i], r, c) }
  // welke rijen/kolommen zouden verdwijnen (voor de preview)
  function voorbeeld(s, i, r, c) {
    if (!kan(s, i, r, c)) return null
    var x = leg(s.rijen, s.set[i], r, c)
    return { volR: x.volR, volK: x.volK }
  }
  function plaats(s, i, r, c) {
    if (!kan(s, i, r, c)) return null
    var v = s.set[i], x = leg(s.rijen, v, r, c)
    v.cellen.forEach(function (p) { s.kleur[(r + p[0]) * N + c + p[1]] = v.kleur })
    var weg = []
    x.volR.forEach(function (rr) { for (var k = 0; k < N; k++) weg.push(rr * N + k) })
    x.volK.forEach(function (cc) { for (var k = 0; k < N; k++) weg.push(k * N + cc) })
    var wegKleur = {}
    weg.forEach(function (idx) { if (!(idx in wegKleur)) { wegKleur[idx] = s.kleur[idx]; s.kleur[idx] = -1 } })
    s.rijen = x.rijen
    var L = x.volR.length + x.volK.length, punten = v.n, perfect = false
    if (L) {
      s.combo++; s.sinds = 0
      punten += lijnPunten(L) * s.combo
      if (telVol(s.rijen) === 0) { punten += PERFECT; perfect = true; s.perfects++ }
      s.lijnen += L
      s.besteCombo = Math.max(s.besteCombo, s.combo)
    } else if (++s.sinds >= 3) s.combo = 0
    s.score += punten; s.zetten++
    s.set[i] = null
    var nieuw = false
    if (!s.set.some(Boolean)) { s.set = trekSet(s.rijen, s.score, s.rand); nieuw = true }
    if (!s.set.some(function (w) { return w && pastErgens(s.rijen, w) })) s.over = true
    return { punten: punten, lijnen: L, volR: x.volR, volK: x.volK, weg: wegKleur, perfect: perfect, combo: s.combo, nieuweSet: nieuw, vorm: v }
  }

  // lopend spel bewaren/herstellen (verder spelen na het afsluiten)
  function bewaar(s) {
    return { kleur: Array.prototype.slice.call(s.kleur), set: s.set.map(function (v) { return v ? v.id : -1 }), score: s.score,
      combo: s.combo, sinds: s.sinds, zetten: s.zetten, lijnen: s.lijnen, perfects: s.perfects, besteCombo: s.besteCombo }
  }
  function herstel(o) {
    var s = nieuwSpel()
    s.kleur = Int8Array.from(o.kleur)
    s.rijen = [0, 0, 0, 0, 0, 0, 0, 0]
    for (var i = 0; i < 64; i++) if (s.kleur[i] >= 0) s.rijen[i >> 3] |= 1 << (i & 7)
    s.set = o.set.map(function (id) { return id >= 0 ? VORMEN[id] : null })
    ;['score', 'combo', 'sinds', 'zetten', 'lijnen', 'perfects', 'besteCombo'].forEach(function (k) { s[k] = o[k] || 0 })
    if (!s.set.some(Boolean)) s.set = trekSet(s.rijen, s.score, s.rand)
    s.over = !s.set.some(function (w) { return w && pastErgens(s.rijen, w) })
    return s
  }

  return { N: N, VORMEN: VORMEN, bewaar: bewaar, herstel: herstel, KLEUREN: KLEUREN, rng: rng, past: past, pastErgens: pastErgens, leg: leg,
    allesPlaatsbaar: allesPlaatsbaar, trekSet: trekSet, telVol: telVol, lijnPunten: lijnPunten, PERFECT: PERFECT,
    nieuwSpel: nieuwSpel, kan: kan, voorbeeld: voorbeeld, plaats: plaats }
})()
if (typeof globalThis !== 'undefined') globalThis.BB = BB
