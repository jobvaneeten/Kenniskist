// ═══════════════════════════════════════════════════════════════════════════
//  STADSBOUWER: kern. Rooster, bouwen, groei van wijken, geld en tevredenheid.
//  Geen DOM: gedeeld door spel.js en tools/stadsbouwerTest.js.
//
//  Je legt wegen en wijst wijken aan: wonen, winkels en industrie. Een wijk
//  groeit als hij aan een weg ligt, stroom en water heeft, en er vraag naar is.
//  Mensen willen werk (winkels en industrie), winkels willen klanten, industrie
//  wil werknemers. Parken, scholen en ziekenhuizen maken mensen blij; industrie
//  vlakbij niet. Belasting levert geld op, wegen en voorzieningen kosten geld.
//  Doelen leren je stap voor stap hoe een stad werkt (met een geldbonus).
//  Vanaf 500 inwoners kan er brand uitbreken: alleen de brandweer blust die.
// ═══════════════════════════════════════════════════════════════════════════
var SB = (function () {
  var N = 28
  var BOUW = {
    weg: { naam: 'Weg', prijs: 10, onderhoud: 0.1, brug: 40 },
    wonen: { naam: 'Wonen', prijs: 20, zone: true, kleur: '#5be37a' },
    winkel: { naam: 'Winkels', prijs: 25, zone: true, kleur: '#3fa8ff' },
    industrie: { naam: 'Industrie', prijs: 25, zone: true, kleur: '#ffd23d' },
    park: { naam: 'Park', prijs: 60, onderhoud: 0.5, bereik: 3 },
    stroom: { naam: 'Stroom', prijs: 900, onderhoud: 8, bereik: 11 },
    water: { naam: 'Watertoren', prijs: 350, onderhoud: 3, bereik: 9 },
    school: { naam: 'School', prijs: 700, onderhoud: 6, bereik: 8, nodig: 250 },
    brand: { naam: 'Brandweer', prijs: 600, onderhoud: 5, bereik: 9, nodig: 450 },
    zorg: { naam: 'Ziekenhuis', prijs: 1000, onderhoud: 9, bereik: 9, nodig: 700 },
    stadion: { naam: 'Stadion', prijs: 3000, onderhoud: 15, bereik: 14, nodig: 2000 },
    sloop: { naam: 'Slopen', prijs: 5 },
  }
  var MIJLPALEN = [
    { inwoners: 0, naam: 'Gehucht' }, { inwoners: 100, naam: 'Dorp', bonus: 500 }, { inwoners: 250, naam: 'Groot dorp', bonus: 800 },
    { inwoners: 450, naam: 'Stadje', bonus: 1200 }, { inwoners: 700, naam: 'Stad', bonus: 1800 }, { inwoners: 1200, naam: 'Grote stad', bonus: 2500 },
    { inwoners: 2000, naam: 'Metropool', bonus: 4000 }, { inwoners: 3500, naam: 'Wereldstad', bonus: 8000 },
  ]
  var WONEN = [0, 8, 22, 45], WERK_W = [0, 5, 12, 24], WERK_I = [0, 8, 18, 32]
  var tel = function (s, f) { var n = 0; s.cel.forEach(function (c) { if (f(c)) n++ }); return n }
  var heeft = function (s, t) { return s.cel.some(function (c) { return c.t === t }) }
  // doelen: één tegelijk, van makkelijk naar moeilijk
  var DOELEN = [
    { tekst: 'Leg 10 stukjes weg aan. Sleep over het gras met de weg.', bonus: 200, klaar: function (s) { return tel(s, function (c) { return c.t === 'weg' }) >= 21 } },
    { tekst: 'Wijs 8 vakjes Wonen aan, naast de weg.', bonus: 200, klaar: function (s) { return tel(s, function (c) { return c.t === 'wonen' }) >= 8 } },
    { tekst: 'Huizen hebben stroom nodig. Bouw stroom vlak bij de huizen.', bonus: 300, klaar: function (s) { return heeft(s, 'stroom') } },
    { tekst: 'En water! Bouw een watertoren.', bonus: 300, klaar: function (s) { return heeft(s, 'water') } },
    { tekst: 'Wacht tot er 50 mensen wonen. Zet de tijd sneller als je wilt.', bonus: 400, klaar: function (s) { return s.inwoners >= 50 } },
    { tekst: 'Mensen willen werken. Wijs 6 vakjes Winkels en 6 vakjes Industrie aan.', bonus: 400, klaar: function (s) { return tel(s, function (c) { return c.t === 'winkel' }) >= 6 && tel(s, function (c) { return c.t === 'industrie' }) >= 6 } },
    { tekst: 'Bouw 2 parken tussen de huizen. Daar worden mensen blij van.', bonus: 300, klaar: function (s) { return tel(s, function (c) { return c.t === 'park' }) >= 2 } },
    { tekst: 'Laat je stad groeien tot 150 inwoners. Kijk naar de vraag-balkjes bovenin.', bonus: 600, klaar: function (s) { return s.inwoners >= 150 } },
    { tekst: 'Vanaf 250 inwoners kun je een school bouwen. Doe dat!', bonus: 500, klaar: function (s) { return heeft(s, 'school') } },
    { tekst: 'Maak je stad blij: tevredenheid 70 of meer, met minstens 200 inwoners.', bonus: 800, klaar: function (s) { return s.inwoners >= 200 && s.geluk >= 70 } },
    { tekst: 'Bouw een brandweer. Vanaf 500 inwoners kan er brand uitbreken!', bonus: 500, klaar: function (s) { return heeft(s, 'brand') } },
    { tekst: 'Groei tot 500 inwoners.', bonus: 1000, klaar: function (s) { return s.inwoners >= 500 } },
    { tekst: 'Bouw een ziekenhuis (vanaf 700 inwoners).', bonus: 800, klaar: function (s) { return heeft(s, 'zorg') } },
    { tekst: 'Zorg voor 5 flats: huizen die helemaal gegroeid zijn.', bonus: 1000, klaar: function (s) { return tel(s, function (c) { return c.t === 'wonen' && c.lvl === 3 }) >= 5 } },
    { tekst: 'Groei tot 1000 inwoners.', bonus: 1500, klaar: function (s) { return s.inwoners >= 1000 } },
    { tekst: 'Bouw een stadion (vanaf 2000 inwoners).', bonus: 2000, klaar: function (s) { return heeft(s, 'stadion') } },
    { tekst: 'Word een wereldstad: 3500 inwoners!', bonus: 5000, klaar: function (s) { return s.inwoners >= 3500 } },
  ]

  function dobbel(s) {
    s.zaad = (s.zaad + 0x6D2B79F5) >>> 0
    var t = s.zaad
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  function nieuw(zaad) {
    var s = { n: N, zaad: zaad >>> 0, geld: 4000, dag: 0, cel: [], mijlpaal: 0, belasting: 9, doel: 0, inkomen: 0 }
    for (var i = 0; i < N * N; i++) s.cel.push({ t: 'gras', lvl: 0 })
    // een rivier en wat bomen maken het landschap
    var rx = Math.floor(N * 0.68)
    for (var y = 0; y < N; y++) { var x = rx + Math.round(Math.sin(y * 0.35) * 2); s.cel[y * N + x] = { t: 'water0' }; s.cel[y * N + x + 1] = { t: 'water0' } }
    for (var b = 0; b < 60; b++) { var i2 = dobbel(s) * N * N | 0; if (s.cel[i2].t === 'gras') s.cel[i2] = { t: 'boom', lvl: 0, v: dobbel(s) } }
    // een stukje weg om mee te beginnen
    for (var w = 3; w < 14; w++) s.cel[12 * N + w] = { t: 'weg', lvl: 0 }
    bereken(s)
    return s
  }
  function xy(s, i) { return [i % s.n, i / s.n | 0] }
  function buren(s, i) {
    var x = i % s.n, y = i / s.n | 0, r = []
    if (x > 0) r.push(i - 1); if (x < s.n - 1) r.push(i + 1); if (y > 0) r.push(i - s.n); if (y < s.n - 1) r.push(i + s.n)
    return r
  }
  function aanWeg(s, i) { return buren(s, i).some(function (j) { return s.cel[j].t === 'weg' }) }
  // dekking per vakje (stroom, water, diensten) en de tellers van de stad
  function bereken(s) {
    var d = { stroom: [], water: [], school: [], zorg: [], brand: [], stadion: [], park: [], vuil: [] }
    // niet bewaren (wordt altijd opnieuw berekend)
    Object.defineProperty(s, 'dekking', { value: d, enumerable: false, writable: true, configurable: true })
    var bronnen = {}
    s.cel.forEach(function (c, j) { if (BOUW[c.t] && BOUW[c.t].bereik) (bronnen[c.t] = bronnen[c.t] || []).push(j); if (c.t === 'industrie' && c.lvl > 0) (bronnen.vuil = bronnen.vuil || []).push(j) })
    for (var i = 0; i < s.n * s.n; i++) {
      var x = i % s.n, y = i / s.n | 0
      for (var k in d) {
        var lijst = bronnen[k] || [], r = k === 'vuil' ? 3 : BOUW[k].bereik, t = 0
        lijst.forEach(function (j) { var dx = j % s.n - x, dy = (j / s.n | 0) - y; if (dx * dx + dy * dy <= r * r) t++ })
        d[k][i] = t
      }
    }
    var inw = 0, werkW = 0, werkI = 0
    s.cel.forEach(function (c) {
      if (c.t === 'wonen') inw += WONEN[c.lvl]
      if (c.t === 'winkel') werkW += WERK_W[c.lvl]
      if (c.t === 'industrie') werkI += WERK_I[c.lvl]
    })
    s.inwoners = inw; s.banenW = werkW; s.banenI = werkI
    // vraag: -1 (niemand wil) tot 1 (iedereen wil)
    var banen = werkW + werkI
    s.vraag = {
      wonen: klem((banen * 1.15 + 30 - inw) / 60),
      winkel: klem((inw * 0.35 - werkW) / 30),
      industrie: klem((inw * 0.55 + 10 - werkI) / 30),
    }
    // tevredenheid gemiddeld over de woonhuizen
    var blij = 0, t2 = 0
    s.cel.forEach(function (c, j) { if (c.t === 'wonen' && c.lvl > 0) { blij += geluk(s, j); t2++ } })
    s.geluk = t2 ? Math.round(blij / t2) : 60
  }
  function klem(v) { return Math.max(-1, Math.min(1, v)) }
  function geluk(s, i) {
    var d = s.dekking, g = 45
    g += Math.min(25, d.park[i] * 8)
    if (d.school[i]) g += 12
    if (d.zorg[i]) g += 12
    if (d.brand[i]) g += 6
    if (d.stadion[i]) g += 10
    g -= Math.min(36, d.vuil[i] * 12)
    if (!d.stroom[i]) g -= 30
    if (!d.water[i]) g -= 30
    g -= Math.max(0, s.belasting - 9) * 4
    g += Math.max(0, 9 - s.belasting) * 2
    return Math.max(0, Math.min(100, g))
  }

  // ── bouwen ──
  function prijsVan(s, soort, i) {
    var c = s.cel[i]
    if (soort === 'weg' && c && c.t === 'water0') return BOUW.weg.brug
    return BOUW[soort].prijs
  }
  function magBouwen(s, soort, i) {
    var c = s.cel[i], b = BOUW[soort]
    if (!c || !b) return 'Kan niet'
    if (b.nodig && s.inwoners < b.nodig) return b.naam + ' kan vanaf ' + b.nodig + ' inwoners'
    if (soort === 'sloop') return c.t === 'gras' || c.t === 'water0' ? 'Hier staat niets' : null
    if (c.t === 'water0' && soort !== 'weg') return 'Op het water kun je alleen een brug (weg) bouwen'
    if (c.t === soort) return 'Dit ligt er al'
    // een lege wijk mag je ombouwen naar een andere soort wijk
    var leegZone = BOUW[c.t] && BOUW[c.t].zone && !c.lvl
    if (c.t !== 'gras' && c.t !== 'boom' && c.t !== 'water0' && !(leegZone && b.zone)) return 'Hier staat al iets: sloop het eerst'
    if (s.geld < prijsVan(s, soort, i)) return 'Niet genoeg geld'
    return null
  }
  function bouw(s, soort, i) {
    var fout = magBouwen(s, soort, i)
    if (fout) return fout
    var c = s.cel[i]
    s.geld -= prijsVan(s, soort, i)
    if (soort === 'sloop') s.cel[i] = c.brug ? { t: 'water0' } : { t: 'gras', lvl: 0 }
    else s.cel[i] = { t: soort, lvl: 0, v: dobbel(s), brug: c.t === 'water0' || undefined }
    s.vies = true
    return null
  }
  // veel vakjes tegelijk (een getrokken lijn of rechthoek)
  function bouwVeel(s, soort, lijst) {
    var n = 0, kosten = 0, fout = null
    lijst.forEach(function (i) {
      var p = s.cel[i] ? prijsVan(s, soort, i) : 0, f = bouw(s, soort, i)
      if (!f) { n++; kosten += p } else if (!fout || f === 'Niet genoeg geld') fout = f
    })
    if (n) bereken(s)
    return { n: n, kosten: kosten, fout: n ? (fout === 'Niet genoeg geld' ? fout : null) : fout }
  }
  // wat het zou kosten (voor de voorvertoning tijdens het slepen)
  function kostenVan(s, soort, lijst) {
    var k = 0, n = 0
    lijst.forEach(function (i) { var c = s.cel[i]; if (!c) return; var f = magBouwen(s, soort, i); if (!f || f === 'Niet genoeg geld') { k += prijsVan(s, soort, i); n++ } })
    return { kosten: k, n: n }
  }
  // een weg van a naar b: eerst langs x, dan langs y
  function lijn(s, x0, y0, x1, y1) {
    var r = [], x = x0, y = y0, dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0)
    r.push(y * s.n + x)
    while (x !== x1) { x += dx; r.push(y * s.n + x) }
    while (y !== y1) { y += dy; r.push(y * s.n + x) }
    return r
  }
  function rechthoek(s, x0, y0, x1, y1) {
    var r = []
    for (var y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (var x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) r.push(y * s.n + x)
    return r
  }
  function zetBelasting(s, v) { s.belasting = Math.max(5, Math.min(15, Math.round(v))); bereken(s) }

  // ── een dag verder: wijken groeien of krimpen, brand, geld en doelen ──
  function dag(s) {
    var ev = []
    if (s.vies || !s.dekking) { bereken(s); s.vies = false }
    s.dag++
    var d = s.dekking
    // groeien: een paar willekeurige wijkvakjes per dag
    var kansen = Math.max(4, Math.floor(s.n * s.n / 40))
    for (var p = 0; p < kansen; p++) {
      var i = dobbel(s) * s.n * s.n | 0, c = s.cel[i]
      if (!BOUW[c.t] || !BOUW[c.t].zone || c.vuur) continue
      var ok = aanWeg(s, i) && d.stroom[i] > 0 && d.water[i] > 0
      var vraag = s.vraag[c.t]
      var blij = c.t === 'wonen' ? geluk(s, i) : (d.vuil[i] && c.t === 'winkel' ? 40 : 60)
      if (ok && vraag > 0.05 && c.lvl < 3 && blij >= [0, 30, 45, 60][c.lvl + 1 > 3 ? 3 : c.lvl + 1] && dobbel(s) < 0.35 + vraag * 0.5) {
        c.lvl++; c.v = dobbel(s); ev.push({ t: 'groei', i: i, lvl: c.lvl }); s.vies = true
      } else if (c.lvl > 0 && (!ok || vraag < -0.5 || blij < 20) && dobbel(s) < 0.25) {
        c.lvl--; ev.push({ t: 'krimp', i: i, reden: !ok ? (d.stroom[i] ? (d.water[i] ? 'weg' : 'water') : 'stroom') : 'vraag' }); s.vies = true
      }
    }
    // brand: alleen in een stad vanaf 500 inwoners; de brandweer blust binnen zijn bereik
    s.cel.forEach(function (c, j) {
      if (!c.vuur) return
      if (d.brand[j]) { c.vuur = 0; ev.push({ t: 'geblust', i: j }); return }
      c.vuur--
      if (c.vuur <= 0) { c.vuur = 0; if (BOUW[c.t] && BOUW[c.t].zone) c.lvl = 0; else s.cel[j] = { t: 'gras', lvl: 0 }; ev.push({ t: 'afgebrand', i: j }); s.vies = true }
    })
    if (s.inwoners >= 500) {
      var kandidaat = dobbel(s) * s.n * s.n | 0, kc = s.cel[kandidaat]
      if (kc.lvl > 0 && !kc.vuur && dobbel(s) < 0.25) { kc.vuur = 3; ev.push({ t: 'brand', i: kandidaat }) }
    }
    if (s.vies) { bereken(s); s.vies = false }
    // geld: belasting min onderhoud
    var onderhoud = 0
    s.cel.forEach(function (c) { if (BOUW[c.t] && BOUW[c.t].onderhoud) onderhoud += BOUW[c.t].onderhoud * (c.brug ? 3 : 1) })
    var inkomen = (s.inwoners * 0.14 + (s.banenW + s.banenI) * 0.1) * s.belasting / 9
    s.inkomen = Math.round(inkomen - onderhoud)
    s.geld = Math.round(s.geld + inkomen - onderhoud)
    // mijlpalen
    while (s.mijlpaal < MIJLPALEN.length - 1 && s.inwoners >= MIJLPALEN[s.mijlpaal + 1].inwoners) {
      s.mijlpaal++; var m = MIJLPALEN[s.mijlpaal]; s.geld += m.bonus
      ev.push({ t: 'mijlpaal', naam: m.naam, bonus: m.bonus })
    }
    ev = ev.concat(checkDoel(s))
    return ev
  }
  function checkDoel(s) {
    var ev = []
    if (s.doel == null) s.doel = 0
    while (s.doel < DOELEN.length && DOELEN[s.doel].klaar(s)) { var dl = DOELEN[s.doel]; s.geld += dl.bonus; ev.push({ t: 'doel', nr: s.doel, bonus: dl.bonus }); s.doel++ }
    return ev
  }
  function waarom(s, i) {
    var c = s.cel[i], d = s.dekking
    if (!BOUW[c.t] || !BOUW[c.t].zone) return null
    var r = []
    if (!aanWeg(s, i)) r.push('geen weg')
    if (!d.stroom[i]) r.push('geen stroom')
    if (!d.water[i]) r.push('geen water')
    if (!r.length && s.vraag[c.t] <= 0.05) r.push('geen vraag naar ' + BOUW[c.t].naam.toLowerCase())
    if (!r.length && c.t === 'wonen' && c.lvl < 3 && geluk(s, i) < [30, 45, 60][c.lvl]) r.push('niet blij genoeg')
    return r
  }

  return { N: N, BOUW: BOUW, MIJLPALEN: MIJLPALEN, DOELEN: DOELEN, WONEN: WONEN, WERK_W: WERK_W, WERK_I: WERK_I,
    nieuw: nieuw, bouw: bouw, bouwVeel: bouwVeel, kostenVan: kostenVan, magBouwen: magBouwen, prijsVan: prijsVan, lijn: lijn, rechthoek: rechthoek,
    dag: dag, bereken: bereken, geluk: geluk, aanWeg: aanWeg, waarom: waarom, xy: xy, buren: buren, zetBelasting: zetBelasting, checkDoel: checkDoel }
})()
