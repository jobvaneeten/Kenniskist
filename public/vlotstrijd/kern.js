// Vlotstrijd — spelregels, levels en natuurkunde, zonder scherm. Ook geladen
// door tools/vlotstrijdTest.js (node vm), dus geen DOM hier.
//
// Twee helden op een vlot links, vijanden op een vlot rechts, de zee ertussen.
// Om de beurt schieten: jij mikt (hoek en kracht), daarna schiet elke vijand
// één keer terug. Wie als eerste alle tegenstanders uitschakelt, wint.
// Dekking (kratten, ijs, rots) houdt kogels tegen; kogels gaan door de eigen
// dekking heen. Palen en rotsen in zee zijn niet stuk te krijgen.
//
// Coördinaten: het veld is B × H, y naar beneden. De zee begint op ZEE, het
// dek van de vlotten ligt op DEK.
var VS = (function () {
  'use strict'

  var B = 1600, H = 900, ZEE = 700, DEK = 684, G = 900, VMAX = 1500, STAP = 1 / 120
  var HELD_X = [205, 325], KRAT = 56, PAAL_HOOG = 72

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed)
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
      return ((t ^ t >>> 14) >>> 0) / 4294967296
    }
  }
  function gauss(r) { return (r() + r() + r() - 1.5) * 1.15 }

  var WERELDEN = [
    { id: 'baai',    naam: 'Neonbaai',   zin: 'Piraten in de haven van de neonstad.',        wind: 0,   blok: 'krat', pilaar: 'boei',   vijanden: ['piraat', 'kanonnier'],    baas: 'kraak',      kogel: 'bal' },
    { id: 'ijs',     naam: 'IJszee',     zin: 'IJsrovers tussen de ijsbergen. Let op de wind!', wind: 55,  blok: 'ijs',  pilaar: 'ijsberg', vijanden: ['ijsrover', 'sneeuwman'],  baas: 'ijsreus',    kogel: 'sneeuw' },
    { id: 'vulkaan', naam: 'Vulkaanzee', zin: 'Vuurpiraten en lavakrabben bij de vulkaan.',  wind: 90,  blok: 'rots', pilaar: 'lavarots', vijanden: ['vuurpiraat', 'lavakrab'], baas: 'krabkoning', kogel: 'vuur' },
    { id: 'storm',   naam: 'Stormzee',   zin: 'Spookpiraten en robots in de storm.',        wind: 140, blok: 'krat', pilaar: 'wrak',   vijanden: ['spookpiraat', 'robot'],   baas: 'kraken',     kogel: 'spook' },
  ]
  var LEVELS = WERELDEN.length * 10

  // r = straal van de raakcirkel; zweef = hoe ver hij op en neer zweeft
  var SOORTEN = {
    piraat:      { naam: 'Piraat',          hp: 40,  schade: 14, fout: 0.085, r: 28 },
    kanonnier:   { naam: 'Kanonnier',       hp: 70,  schade: 18, fout: 0.075, r: 32 },
    kraak:       { naam: 'Kapitein Kraak',  hp: 280, schade: 15, fout: 0.08,  r: 60, baas: true, schoten: 2 },
    ijsrover:    { naam: 'IJsrover',        hp: 50,  schade: 15, fout: 0.08,  r: 28 },
    sneeuwman:   { naam: 'Sneeuwman',       hp: 90,  schade: 19, fout: 0.07,  r: 34 },
    ijsreus:     { naam: 'IJsreus',         hp: 350, schade: 16, fout: 0.08,  r: 68, baas: true, schoten: 2 },
    vuurpiraat:  { naam: 'Vuurpiraat',      hp: 60,  schade: 17, fout: 0.075, r: 28 },
    lavakrab:    { naam: 'Lavakrab',        hp: 90,  schade: 19, fout: 0.075, r: 34 },
    krabkoning:  { naam: 'Krabkoning',      hp: 390, schade: 18, fout: 0.075, r: 72, baas: true, schoten: 2 },
    spookpiraat: { naam: 'Spookpiraat',     hp: 70,  schade: 19, fout: 0.07,  r: 28, zweef: 34 },
    robot:       { naam: 'Robotpiraat',     hp: 120, schade: 23, fout: 0.065, r: 32 },
    kraken:      { naam: 'De Kraken',       hp: 580, schade: 21, fout: 0.07,  r: 78, baas: true, schoten: 2, zweef: 16 },
  }

  // Wapens van de speler. gebruik = zo vaak per level (de kanonskogel altijd).
  var WAPENS = {
    bal:     { naam: 'Kanonskogel', prijs: 0,    schade: 25, r: 9,  zin: 'Altijd raak te schieten' },
    drie:    { naam: 'Drieschot',   prijs: 150,  schade: 15, r: 7,  aantal: 3, spreid: 0.075, gebruik: 2, zin: 'Drie kogels tegelijk' },
    water:   { naam: 'Waterbom',    prijs: 300,  schade: 22, r: 11, spat: 80, gebruik: 2, zin: 'Spat over iedereen in de buurt' },
    stuiter: { naam: 'Stuiterbal',  prijs: 450,  schade: 28, r: 10, stuiter: 2, gebruik: 3, zin: 'Stuitert op het water verder' },
    bom:     { naam: 'Knalbom',     prijs: 700,  schade: 45, r: 12, spat: 95, blok: 3, gebruik: 2, zin: 'Grote knal, sloopt dekking' },
    raket:   { naam: 'Raket',       prijs: 1000, schade: 42, r: 9,  zwaarte: 0.3, blok: 2, gebruik: 2, zin: 'Vliegt bijna recht vooruit' },
  }
  var WAPEN_VOLGORDE = ['bal', 'drie', 'water', 'stuiter', 'bom', 'raket']

  var UPGRADES = {
    kracht: { naam: 'Kracht',    prijzen: [120, 260, 450, 700, 1000], zin: 'Meer schade per raak schot' },
    hp:     { naam: 'Levens',    prijzen: [100, 220, 400, 650, 950],  zin: 'Je helden kunnen meer hebben' },
    schild: { naam: 'Krat',      prijzen: [150, 350, 650],            zin: 'Een krat op je vlot dat schoten tegenhoudt' },
    mik:    { naam: 'Mikhulp',   prijzen: [80, 200, 400],             zin: 'Een langere mikstreep' },
    extra:  { naam: 'Extra munitie', prijzen: [250, 600],             zin: 'Je speciale wapens vaker per level' },
  }
  var BLOKKEN = { krat: 2, ijs: 2, rots: 3, ton: 1 }   // klappen voordat hij breekt
  // wat er per wereld tussen de vlotten in zee staat: [toren, poort]
  var STUKKEN = { baai: ['vuurtoren', 'neonbrug'], ijs: ['ijspiek', 'ijsboog'], vulkaan: ['lavapiek', 'rotsboog'], storm: ['wrakmast', 'scheepsboog'] }

  // ── levels ──
  function bouwLevel(L) {
    var w = Math.floor(L / 10), k = L % 10, W = WERELDEN[w], r = rng(1000 + L * 7919)
    var x0 = Math.min(1110, 1010 + k * 10 + w * 15), x1 = Math.min(1570, x0 + 450)
    var def = { L: L, w: w, k: k, baas: k === 9, wereld: W, raft: { x0: x0, x1: x1 }, vijanden: [], blokken: [], stukken: [] }
    def.wind = W.wind ? Math.round(W.wind * (0.45 + 0.55 * k / 9) * (r() < 0.5 ? -1 : 1)) : 0
    var muurSoort = function (j) { return W.id === 'storm' && j % 2 === 1 ? 'ton' : W.blok }
    function muur(x, hoog) { for (var j = 0; j < hoog; j++) def.blokken.push({ x: x, y: DEK - KRAT * (j + 1), w: KRAT, h: KRAT, soort: muurSoort(j) }) }
    if (def.baas) {
      def.vijanden.push({ soort: W.baas, x: x0 + 320, hoog: 0 })
      def.vijanden.push({ soort: W.vijanden[0], x: x0 + 120, hoog: 0 })
      muur(x0 + 22, 2)
    } else {
      var n = [1, 1, 2, 2, 2, 3, 3, 3, w >= 3 ? 4 : 3][k]
      for (var i = 0; i < n; i++) {
        var tweede = (k >= 3 && i === n - 1) || (k >= 6 && i % 2 === 1)
        var hoog = k >= 5 && i === n - 1 ? (k >= 7 ? 2 : 1) : 0
        def.vijanden.push({ soort: W.vijanden[tweede ? 1 : 0], x: Math.round(x0 + 135 + i * (x1 - x0 - 190) / Math.max(1, n - 1)), hoog: hoog })
      }
      if (n === 1) def.vijanden[0].x = Math.round((x0 + x1) / 2)
      if (k >= 1) muur(x0 + 22, k < 4 ? 1 : k < 7 ? 2 : 3)
      if (k >= 6 && n >= 3) muur(Math.round((def.vijanden[0].x + def.vijanden[1].x) / 2) - KRAT / 2, 1 + (k >= 8 ? 1 : 0))
    }
    // Tussen de vlotten staat altijd iets in zee: een toren waar je met een
    // boog overheen moet, of een poort waar je óók doorheen kunt schieten.
    // Level 1 begint laag, daarna wordt het steeds hoger.
    var ST = STUKKEN[W.id]
    if (k === 0) toren(ST[0], 800, 120)
    else if (k % 3 === 2) poort(ST[1], Math.round(760 + r() * 80), Math.round(150 + r() * 40 + w * 8), 230)
    else toren(ST[0], Math.round(740 + r() * 140), Math.min(300, Math.round(170 + k * 11 + w * 12 + r() * 40)))
    if (k >= 6 && !def.baas && r() < 0.65) toren(ST[0], r() < 0.5 ? 580 : 1000 - (k >= 8 ? 20 : 0), Math.round(130 + r() * 60))
    function toren(soort, x, h) {
      var bw = soort === 'wrakmast' ? 56 : 76
      def.stukken.push({ soort: soort, x: x, h: h, w: bw })
      def.blokken.push({ x: x - bw / 2, y: ZEE - h, w: bw, h: h + 40, soort: soort, vast: true, zee: true, stuk: true })
    }
    function poort(soort, x, h, span) {
      var pw = 46, dik = 38
      def.stukken.push({ soort: soort, x: x, h: h, span: span, pw: pw, dik: dik })
      def.blokken.push({ x: x - span / 2, y: ZEE - h, w: pw, h: h + 40, soort: soort, vast: true, zee: true, stuk: true })
      def.blokken.push({ x: x + span / 2 - pw, y: ZEE - h, w: pw, h: h + 40, soort: soort, vast: true, zee: true, stuk: true })
      def.blokken.push({ x: x - span / 2, y: ZEE - h - dik, w: span, h: dik, soort: soort, vast: true, zee: true, stuk: true })
    }
    // palen onder de vijanden die hoger staan
    def.vijanden.forEach(function (v) { if (v.hoog) def.blokken.push({ x: v.x - 20, y: DEK - v.hoog * PAAL_HOOG, w: 40, h: v.hoog * PAAL_HOOG, soort: 'paal', vast: true }) })
    return def
  }

  // ── een spel ──
  function lvl(u, k) { return (u && u[k]) || 0 }
  function nieuw(L, opties) {
    opties = opties || {}
    var def = bouwLevel(L), u = opties.upgrades || {}, wapens = opties.wapens || ['bal']
    var s = { L: L, def: def, wereld: def.wereld, wind: def.wind, t: 0, fase: 'speler', held: 0, rij: [], laatste: 'speler',
      kogels: [], blokken: [], helden: [], vijanden: [], events: [], schoten: 0, raak: 0, uitslag: null,
      rnd: rng(opties.seed != null ? opties.seed : (Date.now() & 0xffffff)), id: 1,
      kracht: 1 + 0.12 * lvl(u, 'kracht'), wapens: wapens.slice(), gebruik: {} }
    var hp = 120 + 20 * lvl(u, 'hp')
    HELD_X.forEach(function (x, i) { s.helden.push({ id: s.id++, kant: 'speler', soort: i ? 'pip' : 'mo', x: x, voetY: DEK, hp: hp, max: hp, r: 30, fase: 0 }) })
    def.vijanden.forEach(function (v) {
      var so = SOORTEN[v.soort]
      s.vijanden.push({ id: s.id++, kant: 'vijand', soort: v.soort, x: v.x, voetY: DEK - v.hoog * PAAL_HOOG, hp: so.hp, max: so.hp, r: so.r,
        zweef: so.zweef || 0, fase: s.rnd() * 6, baas: !!so.baas })
    })
    def.blokken.forEach(function (b) {
      var hp = b.vast ? Infinity : BLOKKEN[b.soort]
      s.blokken.push({ id: s.id++, x: b.x, y: b.y, w: b.w, h: b.h, soort: b.soort, kant: b.zee ? 'zee' : 'vijand', hp: hp, max: hp, stuk: !!b.stuk })
    })
    var sch = lvl(u, 'schild')
    for (var j = 0; j < (sch ? 1 + (sch >= 3 ? 1 : 0) : 0); j++) s.blokken.push({ id: s.id++, x: 430, y: DEK - KRAT * (j + 1), w: KRAT, h: KRAT, soort: 'krat', kant: 'speler', hp: 1 + sch, max: 1 + sch })
    WAPEN_VOLGORDE.forEach(function (k) { var w = WAPENS[k]; if (w.gebruik) s.gebruik[k] = w.gebruik + lvl(u, 'extra') })
    return s
  }

  // middelpunt van de raakcirkel (zwevers bewegen op en neer)
  function midden(s, c) {
    var dy = c.zweef ? Math.sin(s.t * 1.7 + c.fase) * c.zweef : 0
    return { x: c.x, y: c.voetY - c.r - 8 + dy }
  }
  // waar de kogel vertrekt: de hand van het figuur, naar de vijand toe
  function hand(s, c) {
    var m = midden(s, c), kant = c.kant === 'speler' ? 1 : -1
    return { x: m.x + kant * (c.r * 0.7), y: m.y - c.r * 0.35 }
  }
  function levend(lijst) { return lijst.filter(function (c) { return c.hp > 0 }) }

  // ── kogels ──
  function maakKogel(s, kant, x, y, vx, vy, wapen, schade, soort) {
    var w = WAPENS[wapen] || WAPENS.bal
    return { id: s.id++, kant: kant, x: x, y: y, vx: vx, vy: vy, r: w.r, wapen: wapen, schade: schade, zwaarte: w.zwaarte || 1,
      stuiter: w.stuiter || 0, spat: w.spat || 0, blok: w.blok || 1, soort: soort || wapen, t: 0, spoor: [] }
  }
  // speler schiet: hoek in radialen boven de horizon (naar rechts), kracht 0..1
  function schiet(s, hoek, kracht, wapen) {
    if (s.fase !== 'speler' || s.uitslag) return false
    wapen = s.wapens.indexOf(wapen) >= 0 ? wapen : 'bal'
    if (s.gebruik[wapen] != null) { if (s.gebruik[wapen] <= 0) return false; s.gebruik[wapen]-- }
    var held = s.helden[s.held], h = hand(s, held), w = WAPENS[wapen], v = Math.max(0.05, Math.min(1, kracht)) * VMAX
    var n = w.aantal || 1
    for (var i = 0; i < n; i++) {
      var a = hoek + (i - (n - 1) / 2) * (w.spreid || 0)
      s.kogels.push(maakKogel(s, 'speler', h.x, h.y, Math.cos(a) * v, -Math.sin(a) * v, wapen, w.schade * s.kracht))
    }
    s.schoten++; s.fase = 'vlucht'; s.laatste = 'speler'; s.raakDitSchot = false
    return true
  }

  function raakBlok(b, k) { return k.x + k.r > b.x && k.x - k.r < b.x + b.w && k.y + k.r > b.y && k.y - k.r < b.y + b.h }
  function schadeAan(s, c, n, x, y) {
    if (c.hp <= 0) return
    n = Math.round(n)
    c.hp = Math.max(0, c.hp - n)
    if (c.kant === 'vijand') { s.raak++; s.raakDitSchot = true }
    s.events.push({ type: 'raak', id: c.id, kant: c.kant, x: x, y: y, schade: n })
    if (c.hp <= 0) s.events.push({ type: 'dood', id: c.id, kant: c.kant, x: c.x, y: c.voetY })
  }
  function blokKlap(s, b, n) {
    if (b.hp === Infinity || b.hp <= 0) return
    b.hp -= n
    s.events.push({ type: 'blok', id: b.id, x: b.x + b.w / 2, y: b.y + b.h / 2, soort: b.soort, kapot: b.hp <= 0 })
    if (b.hp <= 0) {
      s.blokken.splice(s.blokken.indexOf(b), 1)
      if (b.soort === 'ton') knal(s, b.x + b.w / 2, b.y + b.h / 2, 85, 30, 1, null)
    }
  }
  // ontploffing: schade aan iedereen (behalve `spaar`-kant) en aan dekking in de buurt
  function knal(s, x, y, straal, schade, blok, spaar) {
    s.events.push({ type: 'boem', x: x, y: y, r: straal })
    s.helden.concat(s.vijanden).forEach(function (c) {
      if (c.hp <= 0 || c.kant === spaar) return
      var m = midden(s, c), d = Math.hypot(m.x - x, m.y - y) - c.r
      if (d < straal) schadeAan(s, c, schade * (1 - 0.6 * Math.max(0, d) / straal), m.x, m.y - c.r)
    })
    s.blokken.slice().forEach(function (b) {
      if (b.kant === spaar) return
      var cx = Math.max(b.x, Math.min(x, b.x + b.w)), cy = Math.max(b.y, Math.min(y, b.y + b.h))
      if (Math.hypot(cx - x, cy - y) < straal * 0.8) blokKlap(s, b, blok)
    })
  }
  function weg(s, k, x, y) {
    if (k.spat) knal(s, x, y, k.spat, k.schade, k.blok, k.kant)
    s.kogels.splice(s.kogels.indexOf(k), 1)
  }

  // Eén kogel een klein stapje verder. Geeft true als hij weg is.
  function beweeg(s, k, dt) {
    k.vx += s.wind * dt; k.vy += G * k.zwaarte * dt
    k.x += k.vx * dt; k.y += k.vy * dt; k.t += dt
    var tegen = k.kant === 'speler' ? s.vijanden : s.helden
    for (var i = 0; i < tegen.length; i++) {
      var c = tegen[i]
      if (c.hp <= 0) continue
      var m = midden(s, c)
      if (Math.hypot(m.x - k.x, m.y - k.y) < c.r + k.r) { if (!k.spat) schadeAan(s, c, k.schade, m.x, m.y - c.r); weg(s, k, k.x, k.y); return true }
    }
    for (var j = 0; j < s.blokken.length; j++) {
      var b = s.blokken[j]
      if (b.kant === k.kant || !raakBlok(b, k)) continue
      if (!k.spat) blokKlap(s, b, k.blok)
      weg(s, k, k.x, k.y); return true
    }
    if (k.y > ZEE) {
      if (k.stuiter > 0 && k.vy > 0) { k.stuiter--; k.vy = -k.vy * 0.62; k.vx *= 0.85; k.y = ZEE; s.events.push({ type: 'stuit', x: k.x }); return false }
      s.events.push({ type: 'plons', x: k.x, groot: !!k.spat })
      weg(s, k, k.x, ZEE); return true
    }
    if (k.x < -150 || k.x > B + 150 || k.t > 8) { s.kogels.splice(s.kogels.indexOf(k), 1); return true }
    return false
  }

  // Tijd laten lopen. Kogels in kleine stapjes, zodat ze nergens doorheen vliegen.
  function stap(s, dt) {
    s.t += dt
    var n = Math.ceil(dt / STAP), d = dt / n
    for (var i = 0; i < n; i++) s.kogels.slice().forEach(function (k) { if (s.kogels.indexOf(k) >= 0) beweeg(s, k, d) })
    s.kogels.forEach(function (k) { k.spoor.push(k.x, k.y); if (k.spoor.length > 40) k.spoor.splice(0, 2) })
    var ev = s.events; s.events = []
    return ev
  }

  // Alle kogels zijn weg: wie is er nu aan de beurt?
  function naVlucht(s) {
    if (s.fase !== 'vlucht' || s.kogels.length) return
    if (!levend(s.vijanden).length) { s.uitslag = 'gewonnen'; s.fase = 'klaar'; return }
    if (!levend(s.helden).length) { s.uitslag = 'verloren'; s.fase = 'klaar'; return }
    if (s.laatste === 'speler') { s.rij = levend(s.vijanden).map(function (v) { return v.id }); s.fase = 'vijand'; return }
    if (s.rij.length) { s.fase = 'vijand'; return }
    var alle = s.helden, start = s.held
    for (var i = 1; i <= alle.length; i++) { var j = (start + i) % alle.length; if (alle[j].hp > 0) { s.held = j; break } }
    s.fase = 'speler'
  }

  // ── mikken van de vijand ──
  // Volgt de baan tot hij bij doelX is (of in zee valt). Geeft de y daar, en
  // of er onderweg dekking in de weg zit.
  function baan(s, x, y, vx, vy, zwaarte, kant, doelX, rKogel) {
    var dt = 1 / 60, links = doelX < x
    for (var i = 0; i < 600; i++) {
      vx += s.wind * dt; vy += G * zwaarte * dt; x += vx * dt; y += vy * dt
      if (y > ZEE) return { y: Infinity, geblokt: false }
      for (var j = 0; j < s.blokken.length; j++) {
        var b = s.blokken[j]
        if (b.kant !== kant && raakBlok(b, { x: x, y: y, r: rKogel || 9 })) return { y: y, geblokt: true }
      }
      if (links ? x <= doelX : x >= doelX) return { y: y, geblokt: false }
    }
    return { y: Infinity, geblokt: false }
  }
  // snelheid bij een vaste hoek zodat de baan door het doel gaat
  function snelheidVoor(s, van, doel, hoek, kant) {
    var richting = doel.x < van.x ? -1 : 1, lo = 150, hi = VMAX * 1.25, best = null
    for (var it = 0; it < 32; it++) {
      var v = (lo + hi) / 2, b = baan(s, van.x, van.y, richting * Math.cos(hoek) * v, -Math.sin(hoek) * v, 1, kant, doel.x)
      if (b.y > doel.y) lo = v; else hi = v
      best = { v: v, geblokt: b.geblokt && Math.abs(b.y - doel.y) > 40 }
    }
    var check = baan(s, van.x, van.y, richting * Math.cos(hoek) * best.v, -Math.sin(hoek) * best.v, 1, kant, doel.x)
    return { v: best.v, ok: isFinite(check.y) && Math.abs(check.y - doel.y) < 30 && !check.geblokt }
  }
  var HOEKEN = [40, 50, 32, 58, 66, 24, 72].map(function (g) { return g * Math.PI / 180 })
  function mik(s, schutter, doel) {
    var van = hand(s, schutter), m = midden(s, doel)
    for (var i = 0; i < HOEKEN.length; i++) {
      var o = snelheidVoor(s, van, m, HOEKEN[i], schutter.kant)
      if (o.ok) return { hoek: HOEKEN[i], v: o.v }
    }
    var noodHoek = HOEKEN[4]
    return { hoek: noodHoek, v: snelheidVoor(s, van, m, noodHoek, schutter.kant).v }
  }
  // De volgende vijand in de rij schiet. Hoe verder in een wereld, hoe beter ze mikken.
  function vijandSchiet(s) {
    if (s.fase !== 'vijand') return null
    var v = null
    while (s.rij.length && !v) { var id = s.rij.shift(); v = s.vijanden.filter(function (x) { return x.id === id && x.hp > 0 })[0] || null }
    var doelen = levend(s.helden)
    if (!v || !doelen.length) { s.rij = []; s.fase = 'vlucht'; s.laatste = 'vijand'; naVlucht(s); return null }
    var doel = doelen[Math.floor(s.rnd() * doelen.length)], so = SOORTEN[v.soort]
    var a = mik(s, v, doel), fout = so.fout * (1.45 - 0.045 * s.def.k) * (1 - 0.04 * s.def.w)
    var van = hand(s, v), n = so.schoten || 1
    for (var i = 0; i < n; i++) {
      var hoek = a.hoek + gauss(s.rnd) * fout * 0.5 + (i - (n - 1) / 2) * 0.09, snel = a.v * (1 + gauss(s.rnd) * fout)
      s.kogels.push(maakKogel(s, 'vijand', van.x, van.y, -Math.cos(hoek) * snel, -Math.sin(hoek) * snel, 'bal', so.schade, s.wereld.kogel))
    }
    s.fase = 'vlucht'; s.laatste = 'vijand'
    return { id: v.id, doel: doel.id }
  }

  // Voorspelling voor de mikstreep (zonder botsingen): punten tot `tijd` seconden.
  function voorspel(s, hoek, kracht, wapen, tijd) {
    var held = s.helden[s.held], h = hand(s, held), w = WAPENS[wapen] || WAPENS.bal, v = Math.max(0.05, Math.min(1, kracht)) * VMAX
    var x = h.x, y = h.y, vx = Math.cos(hoek) * v, vy = -Math.sin(hoek) * v, dt = 1 / 30, pts = []
    for (var t = 0; t < tijd; t += dt) {
      vx += s.wind * dt; vy += G * (w.zwaarte || 1) * dt; x += vx * dt; y += vy * dt
      pts.push(x, y)
      if (y > ZEE) break
    }
    return pts
  }
  var MIK_TIJD = [0.55, 0.75, 0.95, 1.2]

  // ── uitslag ──
  function sterren(s) {
    if (s.uitslag !== 'gewonnen') return 0
    var totaal = s.def.vijanden.reduce(function (n, v) { return n + SOORTEN[v.soort].hp }, 0)
    var par = Math.ceil(totaal / 25) + 1 + s.def.vijanden.length
    var heel = levend(s.helden).length === s.helden.length
    return 1 + (heel ? 1 : 0) + (s.schoten <= par ? 1 : 0)
  }
  function beloning(s) {
    var d = s.def, m = s.raak * 3
    if (s.uitslag === 'gewonnen') m += 30 + d.w * 25 + d.k * 4 + (d.baas ? 150 + d.w * 60 : 0)
    else m += 8
    return m
  }

  return {
    B: B, H: H, ZEE: ZEE, DEK: DEK, G: G, VMAX: VMAX, KRAT: KRAT, LEVELS: LEVELS, HELD_X: HELD_X,
    WERELDEN: WERELDEN, SOORTEN: SOORTEN, WAPENS: WAPENS, WAPEN_VOLGORDE: WAPEN_VOLGORDE, UPGRADES: UPGRADES, MIK_TIJD: MIK_TIJD,
    rng: rng, bouwLevel: bouwLevel, nieuw: nieuw, midden: midden, hand: hand, levend: levend,
    schiet: schiet, stap: stap, naVlucht: naVlucht, vijandSchiet: vijandSchiet, mik: mik, voorspel: voorspel,
    sterren: sterren, beloning: beloning,
  }
})()
if (typeof globalThis !== 'undefined') globalThis.VS = VS
