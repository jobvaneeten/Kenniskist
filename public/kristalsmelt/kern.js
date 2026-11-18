// ═══════════════════════════════════════════════════════════════════════════
//  KRISTALSMELT: kern. Spelregels zonder DOM: gedeeld door spel.js en
//  tools/kristalsmeltTest.js.
//
//  Leg het stuk dat je krijgt op een leeg vakje. Liggen er daarna 3 of meer
//  dezelfde aan elkaar vast, dan smelten ze samen tot het volgende niveau, op
//  de plek waar je het laatste stuk legde. Dat kan doorgaan (een kettingreactie).
//  Bijzondere stukken: de bom haalt één stuk weg, de regenboog wordt vanzelf
//  het stuk dat het hoogst samensmelt. Je kunt één stuk opzij leggen.
//  Het spel is uit als het bord vol is.
//  De toestand is gewone data (ook de dobbelsteen): bewaren en verder kan altijd.
// ═══════════════════════════════════════════════════════════════════════════
var KM = (function () {
  var N = 6
  var NAMEN = ['Stof', 'Scherf', 'Kristal', 'Edelsteen', 'Juweel', 'Ster', 'Planeet', 'Zon', 'Sterrenstelsel']
  var MAX = NAMEN.length - 1
  var WAARDE = [1, 3, 10, 30, 100, 300, 1000, 3000, 10000]

  function dobbel(s) {
    s.zaad = (s.zaad + 0x6D2B79F5) >>> 0
    var t = s.zaad
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  // nieuw stuk: meestal stof, soms hoger, af en toe een bom of regenboog
  function trek(s) {
    var r = dobbel(s)
    if (s.zetten > 8 && r < 0.035) return 'bom'
    if (s.zetten > 5 && r < 0.065) return 'joker'
    r = dobbel(s)
    return r < 0.68 ? 0 : r < 0.92 ? 1 : 2
  }
  function nieuw(zaad) {
    var s = { n: N, c: [], huidig: 0, volgende: 0, opslag: null, mocht: true, score: 0, zetten: 0, hoogste: 0, zaad: zaad >>> 0, over: false }
    for (var i = 0; i < N * N; i++) s.c.push(-1)
    // een paar stukjes om mee te beginnen, zonder dat ze al samensmelten
    for (var k = 0; k < 5; k++) {
      var p = dobbel(s) * N * N | 0, v = dobbel(s) < 0.7 ? 0 : 1
      if (s.c[p] < 0) { s.c[p] = v; if (groep(s, p).length >= 3) s.c[p] = -1 }
    }
    s.huidig = 0; s.volgende = trek(s)
    return s
  }
  function kopie(s) { var k = JSON.parse(JSON.stringify(s)); return k }
  function buren(s, i) {
    var x = i % s.n, y = i / s.n | 0, b = []
    if (x > 0) b.push(i - 1); if (x < s.n - 1) b.push(i + 1); if (y > 0) b.push(i - s.n); if (y < s.n - 1) b.push(i + s.n)
    return b
  }
  // alle aaneengesloten stukken met dezelfde waarde als vakje i
  function groep(s, i) {
    var v = s.c[i], gezien = {}, stapel = [i], uit = []
    if (v < 0) return uit
    while (stapel.length) {
      var j = stapel.pop()
      if (gezien[j] || s.c[j] !== v) continue
      gezien[j] = 1; uit.push(j)
      buren(s, j).forEach(function (b) { if (!gezien[b]) stapel.push(b) })
    }
    return uit
  }
  // smelt door tot het stopt; terug: lijst stappen { naar, van: [...], v }
  function smelt(s, i) {
    var stappen = []
    while (s.c[i] < MAX) {
      var g = groep(s, i)
      if (g.length < 3) break
      var v = s.c[i] + 1
      var van = g.filter(function (j) { return j !== i })
      van.forEach(function (j) { s.c[j] = -1 })
      s.c[i] = v
      s.score += WAARDE[v] * (g.length > 3 ? 2 : 1)
      if (v > s.hoogste) s.hoogste = v
      stappen.push({ naar: i, van: van, v: v, extra: g.length > 3 })
    }
    return stappen
  }
  // wat de regenboog zou worden op vakje i: het hoogste niveau dat smelt
  function jokerWaarde(s, i) {
    var kandidaten = {}
    buren(s, i).forEach(function (b) { if (s.c[b] >= 0) kandidaten[s.c[b]] = 1 })
    var beste = -1
    Object.keys(kandidaten).map(Number).sort(function (a, b) { return b - a }).forEach(function (v) {
      if (beste >= 0) return
      var t = kopie(s); t.c[i] = v
      if (groep(t, i).length >= 3) beste = v
    })
    return beste >= 0 ? beste : 0
  }
  function vol(s) { return s.c.every(function (v) { return v >= 0 }) }
  function magLeggen(s, i) {
    if (s.over || i < 0 || i >= s.c.length) return false
    return s.huidig === 'bom' ? s.c[i] >= 0 : s.c[i] < 0
  }
  // Leg het huidige stuk op vakje i. Terug: { ok, ev } (ev voor het scherm).
  function leg(s, i) {
    if (!magLeggen(s, i)) return { ok: false, ev: [] }
    var ev = []
    if (s.huidig === 'bom') {
      ev.push({ t: 'bom', i: i, v: s.c[i] })
      s.c[i] = -1
    } else {
      var v = s.huidig === 'joker' ? jokerWaarde(s, i) : s.huidig
      if (s.huidig === 'joker') ev.push({ t: 'joker', i: i, v: v })
      s.c[i] = v; s.score += WAARDE[v]
      if (v > s.hoogste) s.hoogste = v
      ev.push({ t: 'leg', i: i, v: v })
      smelt(s, i).forEach(function (st, k) { ev.push({ t: 'smelt', naar: st.naar, van: st.van, v: st.v, keten: k + 1, extra: st.extra }) })
    }
    s.zetten++
    s.huidig = s.volgende; s.volgende = trek(s); s.mocht = true
    if (vol(s) && s.huidig !== 'bom' && s.opslag !== 'bom') { s.over = true; ev.push({ t: 'vol' }) }
    return { ok: true, ev: ev }
  }
  // het huidige stuk opzij leggen (of ruilen met wat er al ligt); één keer per beurt
  function wissel(s) {
    if (s.over || !s.mocht) return false
    if (s.opslag === null) { s.opslag = s.huidig; s.huidig = s.volgende; s.volgende = trek(s) }
    else { var t = s.opslag; s.opslag = s.huidig; s.huidig = t }
    s.mocht = false
    return true
  }

  return { N: N, NAMEN: NAMEN, MAX: MAX, WAARDE: WAARDE, nieuw: nieuw, kopie: kopie, leg: leg, wissel: wissel, groep: groep, magLeggen: magLeggen, jokerWaarde: jokerWaarde, buren: buren }
})()
