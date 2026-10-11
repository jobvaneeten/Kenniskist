// ═══════════════════════════════════════════════════════════════════════════
//  TOWER DEFENSE (neon) — kern: kaarten, ballonnen, torens, golven en de
//  simulatie. Geen DOM: gedeeld door spel.js en tools/towerdefenseTest.js.
//
//  Regels: ballonnen volgen het pad naar je kern. Een ballon bestaat uit
//  lagen: elke knal haalt er één laag af (blauw → rood → weg). Torens kosten
//  goud; elke geknalde laag geeft 1 goud, elke afgemaakte golf een bonus.
//  Bereikt een ballon de kern, dan verlies je levens. 15 golven per level.
//  Drie lagen hebben een zwakke plek nodig:
//    zwart  — kan niet tegen ontploffingen (kanon)
//    wit    — kan niet bevroren worden (vriezer)
//    lood   — pijlen ketsen af (pijler)
//  Eenheden: posities en bereik in tegels, tijd in seconden.
// ═══════════════════════════════════════════════════════════════════════════
var TD = (function () {
  var COLS = 20, ROWS = 12
  var LEVENS = 20, START_GOUD = 400, GOLVEN = 15, BELONING_GOLVEN = 5

  function rng(seed) {
    var a = seed >>> 0 || 1
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
  }

  // ── ballonlagen ── v = tegels per seconde, kind = de laag eronder,
  //    lek = levens die je verliest als deze laag de kern haalt
  var LAGEN = {
    rood:    { naam: 'Rood',    kleur: '#ff3b5c', v: 1.25, kind: null,    lek: 1 },
    blauw:   { naam: 'Blauw',   kleur: '#3d8bff', v: 1.6,  kind: 'rood',  lek: 1 },
    groen:   { naam: 'Groen',   kleur: '#35f08a', v: 2.0,  kind: 'blauw', lek: 1 },
    geel:    { naam: 'Geel',    kleur: '#ffe03d', v: 2.6,  kind: 'groen', lek: 1 },
    roze:    { naam: 'Roze',    kleur: '#ff5fd2', v: 3.0,  kind: 'geel',  lek: 1 },
    zwart:   { naam: 'Zwart',   kleur: '#2a2342', rand: '#b07bff', v: 1.9, kind: 'roze', immuun: 'explosie', lek: 2 },
    wit:     { naam: 'Wit',     kleur: '#eef6ff', rand: '#8fe9ff', v: 2.1, kind: 'roze', immuun: 'ijs', lek: 2 },
    lood:    { naam: 'Lood',    kleur: '#8a94a8', v: 1.0,  kind: 'zwart', immuun: 'scherp', lek: 2 },
    pantser: { naam: 'Pantser', kleur: '#ff8a2b', v: 1.3,  kind: 'roze',  hp: 10, goud: 3, lek: 3 },
    blimp:   { naam: 'Blimp',   kleur: '#5b6cff', v: 0.65, kinderen: ['pantser', 'pantser', 'pantser'], hp: 200, goud: 40, lek: 10, groot: true },
  }
  // uitleg bij de eerste keer dat een soort ballon verschijnt
  var NIEUW = {
    blauw: 'Blauwe ballonnen hebben 2 lagen en zijn sneller.',
    groen: 'Groene ballonnen: 3 lagen.',
    geel: 'Gele ballonnen zijn snel! 4 lagen.',
    roze: 'Roze ballonnen zijn de snelste. 5 lagen.',
    zwart: 'Zwarte ballonnen kunnen tegen ontploffingen. Een kanon doet ze niks.',
    wit: 'Witte ballonnen bevriezen niet. De vriezer doet ze niks.',
    lood: 'Loden ballonnen! Pijlen ketsen af. Gebruik kanon, laser, tesla of railgun.',
    pantser: 'Pantserballonnen hebben 10 levens per laag.',
    blimp: 'Een BLIMP! Heel sterk en zit vol pantserballonnen.',
  }

  function hpVan(laag, L) {
    if (laag === 'blimp') return 60 + 30 * (L || 0)
    return LAGEN[laag].hp || 1
  }
  // totaal aantal knallen in een ballon (= goud dat hij ongeveer oplevert)
  function rbe(laag, L) {
    var d = LAGEN[laag], n = hpVan(laag, L)
    if (d.kind) n += rbe(d.kind, L)
    if (d.kinderen) d.kinderen.forEach(function (k) { n += rbe(k, L) })
    return n
  }

  // ── torens ── tik = seconden tussen schoten, bereik in tegels
  var TORENS = {
    pijler: {
      naam: 'Pijler', kleur: '#3ef0ff', prijs: 100, soort: 'scherp', bereik: 2.6, tik: 0.65, schade: 1, doelen: 1, kogel: 14,
      tekst: 'Snelle pijlen op één ballon.', zwak: 'Ketst af op lood.',
      up: [
        { prijs: 90, tekst: 'Sneller schieten en verder kijken', tik: 0.45, bereik: 2.9 },
        { prijs: 200, tekst: '3 pijlen tegelijk', doelen: 3 },
      ],
    },
    vriezer: {
      naam: 'Vriezer', kleur: '#9ee7ff', prijs: 220, soort: 'ijs', bereik: 1.7, tik: 2.0, schade: 1, vries: 0.9, traag: 0,
      tekst: 'Bevriest alle ballonnen om zich heen.', zwak: 'Werkt niet op wit.',
      up: [
        { prijs: 160, tekst: 'Langer bevriezen, daarna nog traag', vries: 1.3, traag: 1.6 },
        { prijs: 340, tekst: 'Groter bereik en meer schade', bereik: 2.2, schade: 2 },
      ],
    },
    kanon: {
      naam: 'Kanon', kleur: '#ff7a2f', prijs: 300, soort: 'explosie', bereik: 2.7, tik: 1.5, schade: 1, straal: 0.95, kogel: 8,
      tekst: 'Bom die alles in de buurt raakt.', zwak: 'Werkt niet op zwart.',
      up: [
        { prijs: 200, tekst: 'Grotere ontploffing', straal: 1.3 },
        { prijs: 420, tekst: 'Dubbele kracht, sneller', schade: 2, tik: 1.15 },
      ],
    },
    tesla: {
      naam: 'Tesla', kleur: '#ffe03d', prijs: 380, soort: 'energie', bereik: 2.4, tik: 1.1, schade: 1, keten: 4,
      tekst: 'Bliksem springt naar 4 ballonnen.', zwak: '',
      up: [
        { prijs: 260, tekst: 'Springt naar 7 ballonnen', keten: 7 },
        { prijs: 560, tekst: 'Sterkere bliksem, sneller', schade: 2, tik: 0.85 },
      ],
    },
    railgun: {
      naam: 'Railgun', kleur: '#5cff7a', prijs: 400, soort: 'energie', bereik: 99, tik: 1.9, schade: 4, doel: 'sterkste',
      tekst: 'Raakt de sterkste ballon, overal op de kaart.', zwak: 'Herlaadt langzaam.',
      up: [
        { prijs: 280, tekst: 'Sneller herladen', tik: 1.3 },
        { prijs: 600, tekst: 'Superschot: 10 schade', schade: 10 },
      ],
    },
    laser: {
      naam: 'Laser', kleur: '#ff4fd8', prijs: 450, soort: 'energie', bereik: 2.2, tik: 0.24, schade: 1,
      tekst: 'Supersnelle straal. Knalt alles.', zwak: 'Klein bereik.',
      up: [
        { prijs: 320, tekst: 'Nog sneller', tik: 0.16 },
        { prijs: 650, tekst: 'Dubbele straal, groter bereik', schade: 2, bereik: 2.7 },
      ],
    },
    zaag: {
      naam: 'Zaag', kleur: '#c3a6ff', prijs: 180, soort: 'scherp', bereik: 1.15, tik: 0.4, schade: 1,
      tekst: 'Draaiende zaag: raakt alles vlak naast hem.', zwak: 'Alleen vlak bij het pad. Ketst af op lood.',
      up: [
        { prijs: 140, tekst: 'Snellere zaag', tik: 0.28 },
        { prijs: 320, tekst: 'Diamantzaag: 2 schade en groter', schade: 2, bereik: 1.45 },
      ],
    },
    boemerang: {
      naam: 'Boemerang', kleur: '#d4ff3a', prijs: 200, soort: 'scherp', bereik: 2.6, tik: 1.1, schade: 1, kogel: 6, doelen: 1, doorboor: 8,
      tekst: 'Vliegt heen en terug en raakt alles onderweg.', zwak: 'Ketst af op lood.',
      up: [
        { prijs: 150, tekst: 'Raakt tot 14 ballonnen per worp', doorboor: 14 },
        { prijs: 340, tekst: 'Twee boemerangs tegelijk', doelen: 2 },
      ],
    },
    spijker: {
      naam: 'Spijkers', kleur: '#2fe6b4', prijs: 240, soort: 'scherp', bereik: 1.8, tik: 2.2, schade: 1, spijkers: 5, stapels: 4,
      tekst: 'Legt spijkerstapels op het pad. Elke spijker knalt één laag.', zwak: 'Ketst af op lood.',
      up: [
        { prijs: 160, tekst: 'Meer spijkers, sneller', spijkers: 8, tik: 1.7 },
        { prijs: 380, tekst: 'Gloeiende spijkers: ook door lood', spijkers: 10, soort: 'vuur' },
      ],
    },
    mijn: {
      naam: 'Goudmijn', kleur: '#ffb020', prijs: 250, soort: 'geen', bereik: 0, tik: 99, schade: 0, goud: 45,
      tekst: 'Valt niet aan, maar geeft na elke golf goud.', zwak: 'Knalt zelf geen ballonnen!',
      up: [
        { prijs: 200, tekst: '+90 goud per golf', goud: 90 },
        { prijs: 400, tekst: '+150 goud per golf', goud: 150 },
      ],
    },
    vlam: {
      naam: 'Vlammen', kleur: '#ff5533', prijs: 260, soort: 'vuur', bereik: 1.8, tik: 0.3, schade: 1, doelen: 4, kegel: 0.5,
      tekst: 'Spuit vuur over 4 ballonnen tegelijk. Smelt ook lood.', zwak: 'Klein bereik.',
      up: [
        { prijs: 200, tekst: 'Verder spuiten, 6 ballonnen', bereik: 2.3, doelen: 6 },
        { prijs: 420, tekst: 'Blauwe vlam: 2 schade', schade: 2 },
      ],
    },
    magneet: {
      naam: 'Magneet', kleur: '#4f8cff', prijs: 300, soort: 'energie', bereik: 2.0, tik: 3.2, schade: 1, trek: 1.4, groot: false,
      tekst: 'Trekt ballonnen een stuk terug over het pad.', zwak: 'Elke ballon gaat hooguit 2× terug.',
      up: [
        { prijs: 220, tekst: 'Trekt verder en vaker', trek: 2.2, tik: 2.5 },
        { prijs: 450, tekst: 'Supermagneet: trekt ook blimps', groot: true, bereik: 2.5 },
      ],
    },
    mortier: {
      naam: 'Mortier', kleur: '#ffd38a', prijs: 350, soort: 'explosie', bereik: 5.5, tik: 2.6, schade: 2, straal: 1.1, kogel: 5, doelen: 1,
      tekst: 'Schiet granaten heel ver weg, met een grote ontploffing.', zwak: 'Langzaam. Werkt niet op zwart.',
      up: [
        { prijs: 250, tekst: 'Sneller laden', tik: 1.9 },
        { prijs: 520, tekst: 'Zware granaten: 4 schade', schade: 4, straal: 1.4 },
      ],
    },
    storm: {
      naam: 'Storm', kleur: '#f2f5ff', prijs: 420, soort: 'energie', bereik: 99, tik: 1.6, schade: 1, inslagen: 3,
      tekst: 'Bliksem slaat in op 3 ballonnen, waar dan ook.', zwak: 'Kiest zijn doelen zelf.',
      up: [
        { prijs: 300, tekst: '5 inslagen', inslagen: 5 },
        { prijs: 600, tekst: 'Zware storm: 2 schade, sneller', schade: 2, tik: 1.2 },
      ],
    },
    raket: {
      naam: 'Raketten', kleur: '#ff8fab', prijs: 500, soort: 'explosie', bereik: 4, tik: 2.4, schade: 3, straal: 1.0, kogel: 6, doelen: 1, doel: 'sterkste',
      tekst: 'Zoekende raketten op de sterkste ballon.', zwak: 'Werkt niet op zwart.',
      up: [
        { prijs: 300, tekst: 'Twee raketten tegelijk', doelen: 2 },
        { prijs: 650, tekst: 'Zware raketten: 6 schade', schade: 6, straal: 1.3 },
      ],
    },
  }
  var VOLGORDE = ['pijler', 'zaag', 'boemerang', 'vriezer', 'spijker', 'mijn', 'vlam', 'kanon', 'magneet', 'mortier', 'tesla', 'railgun', 'storm', 'laser', 'raket']
  var VERKOOP = 0.7

  function torenStats(type, niveau) {
    var b = TORENS[type], s = {}
    for (var k in b) if (k !== 'up') s[k] = b[k]
    for (var i = 0; i < niveau; i++) for (var k2 in b.up[i]) if (k2 !== 'prijs' && k2 !== 'tekst') s[k2] = b.up[i][k2]
    return s
  }

  // ── kaarten ── routes in tegels [kolom, rij]; elke route eindigt in de kern.
  //    Een punt buiten het veld (-1 of 20/12) is de ingang.
  var KAARTEN = [
    { naam: 'Neonstad', thema: 'stad', kleur: '#3ef0ff', tweede: '#9b6bff', zin: 'Een lange slinger door de stad.',
      routes: [[[-1, 2], [16, 2], [16, 6], [3, 6], [3, 9], [17, 9]]] },
    { naam: 'Lavagrot', thema: 'lava', kleur: '#ff7a2f', tweede: '#ff4f6a', zin: 'Twee ingangen die samenkomen.',
      routes: [[[-1, 2], [6, 2], [6, 6], [13, 6], [13, 9], [17, 9]],
               [[10, -1], [10, 6], [13, 6], [13, 9], [17, 9]]] },
    { naam: 'IJsplaneet', thema: 'ijs', kleur: '#9ee7ff', tweede: '#4f8cff', zin: 'Een slakkenhuis naar het midden.',
      routes: [[[-1, 1], [17, 1], [17, 10], [4, 10], [4, 5], [11, 5]]] },
    { naam: 'Sterrennevel', thema: 'nevel', kleur: '#ff4fd8', tweede: '#ffc83d', zin: 'Twee paden die elkaar kruisen.',
      routes: [[[-1, 3], [7, 3], [7, 9], [13, 9], [13, 3], [17, 3], [17, 6]],
               [[10, 12], [10, 6], [17, 6]]] },
    { naam: 'Zwart gat', thema: 'gat', kleur: '#c3a6ff', tweede: '#ffc83d', zin: 'Van links én rechts — en kort!',
      routes: [[[-1, 2], [6, 2], [6, 10], [10, 10], [10, 6]],
               [[20, 2], [15, 2], [15, 9], [12, 9], [12, 6], [10, 6]]] },
  ]

  function sleutel(c, r) { return c + ',' + r }
  function maakRoute(pts) {
    var p = pts.map(function (q) { return { x: q[0] + 0.5, y: q[1] + 0.5 } })
    var cum = [0]
    for (var i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.abs(p[i].x - p[i - 1].x) + Math.abs(p[i].y - p[i - 1].y))
    return { pts: p, cum: cum, len: cum[cum.length - 1] }
  }
  var kaartCache = {}
  function kaart(L) {
    if (kaartCache[L]) return kaartCache[L]
    var def = KAARTEN[L], pad = {}, routes = def.routes.map(maakRoute)
    def.routes.forEach(function (pts) {
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i]
        var n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))
        for (var k = 0; k <= n; k++) {
          var c = a[0] + Math.sign(b[0] - a[0]) * k, r = a[1] + Math.sign(b[1] - a[1]) * k
          if (c >= 0 && c < COLS && r >= 0 && r < ROWS) pad[sleutel(c, r)] = true
        }
      }
    })
    var eind = def.routes[0][def.routes[0].length - 1]
    // aankleding (gebouwen, lavapoelen, ijspieken…): niet bebouwbaar, nooit naast het pad
    var blok = {}, r = rng(L * 977 + 3), n = 0
    for (var poging = 0; poging < 600 && n < 13; poging++) {
      var c2 = Math.floor(r() * COLS), r2 = Math.floor(r() * ROWS), vrij = true
      for (var dc = -1; dc <= 1 && vrij; dc++) for (var dr = -1; dr <= 1; dr++) if (pad[sleutel(c2 + dc, r2 + dr)]) { vrij = false; break }
      if (vrij && !blok[sleutel(c2, r2)]) { blok[sleutel(c2, r2)] = true; n++ }
    }
    kaartCache[L] = { nr: L, naam: def.naam, thema: def.thema, kleur: def.kleur, tweede: def.tweede, zin: def.zin, routes: routes, routePunten: def.routes,
      pad: pad, blok: blok, kern: { c: eind[0], r: eind[1] } }
    return kaartCache[L]
  }

  function opRoute(route, d) {
    var cum = route.cum, p = route.pts
    if (d <= 0) return { x: p[0].x, y: p[0].y }
    for (var i = 1; i < p.length; i++) {
      if (d <= cum[i]) {
        var f = (d - cum[i - 1]) / (cum[i] - cum[i - 1])
        return { x: p[i - 1].x + (p[i].x - p[i - 1].x) * f, y: p[i - 1].y + (p[i].y - p[i - 1].y) * f }
      }
    }
    return { x: p[p.length - 1].x, y: p[p.length - 1].y }
  }

  // ── golven ── elke soort is te zien van golf-voortgang 'van' tot 'tot'
  var SOORTEN = [
    { laag: 'rood', van: 0, tot: 6 }, { laag: 'blauw', van: 2, tot: 9 }, { laag: 'groen', van: 4, tot: 13 },
    { laag: 'geel', van: 6, tot: 99 }, { laag: 'zwart', van: 7.5, tot: 99 }, { laag: 'roze', van: 8.5, tot: 99 },
    { laag: 'wit', van: 9.5, tot: 99 }, { laag: 'lood', van: 11, tot: 99 }, { laag: 'pantser', van: 12.5, tot: 99 },
  ]
  var BLIMPS = [1, 1, 1, 2, 2]
  var golfCache = {}
  // een golf = groepen { laag, n, tus (s tussen twee), start (s na begin) }
  function golf(L, g) {
    var k = L + ':' + g
    if (golfCache[k]) return golfCache[k]
    var r = rng(L * 1000 + g * 37 + 5)
    var p = g + L * 0.6
    var budget = (8 + g * 7 + g * g * 2) * (1 + L * 0.12)
    // in een blimp-golf neemt de blimp een deel van de ballonnen voor zijn rekening
    if (g === GOLVEN) budget *= 0.55
    else if (g === 10 && L >= 3) budget *= 0.75
    budget = Math.round(budget)
    var pool = SOORTEN.filter(function (s) { return p >= s.van && p <= s.tot })
    var nieuwste = pool[pool.length - 1]
    var nGroep = 1 + (g > 3 ? 1 : 0) + (g > 8 && r() < 0.6 ? 1 : 0)
    var groepen = [], dur = 10 + g * 1.4
    for (var i = 0; i < nGroep; i++) {
      var over = pool.filter(function (q) { return !groepen.some(function (gr) { return gr.laag === q.laag }) })
      var s = i === 0 ? nieuwste : (over.length ? over : pool)[Math.floor(r() * (over.length || pool.length))]
      var deel = i === 0 ? (nGroep === 1 ? 1 : 0.45) : 0.55 / (nGroep - 1)
      var n = Math.max(1, Math.round(budget * deel / rbe(s.laag, L)))
      var tus = Math.max(0.22, Math.min(1.6, dur / n))
      groepen.push({ laag: s.laag, n: n, tus: tus, start: i * dur * 0.45 })
    }
    if (g === GOLVEN) groepen.push({ laag: 'blimp', n: BLIMPS[L], tus: 6, start: 2 })
    if (g === 10 && L >= 3) groepen.push({ laag: 'blimp', n: 1, tus: 0, start: dur * 0.6 })
    golfCache[k] = groepen
    return groepen
  }
  function golfBonus(g) { return 40 + g * 6 }

  // ── spel ──
  function nieuwSpel(L, opties) {
    opties = opties || {}
    return {
      L: L, kaart: kaart(L), levens: LEVENS, goud: opties.goud || START_GOUD + L * 75,
      golf: 0, maxGolf: opties.golven || GOLVEN, actief: false, t: 0,
      vijanden: [], torens: [], kogels: [], wachtrij: [], id: 1,
      gewonnen: false, verloren: false, gezien: {}, geknald: 0,
      stapels: [], boemerangs: [], rnd: rng(L * 7 + 11),
    }
  }
  function torenOp(S, c, r) { return S.torens.find(function (t) { return t.c === c && t.r === r }) || null }
  function kanBouwen(S, c, r) {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false
    var k = sleutel(c, r)
    return !S.kaart.pad[k] && !S.kaart.blok[k] && !torenOp(S, c, r)
  }
  function bouw(S, type, c, r) {
    var prijs = TORENS[type].prijs
    if (S.goud < prijs || !kanBouwen(S, c, r)) return null
    S.goud -= prijs
    var t = { id: S.id++, type: type, c: c, r: r, x: c + 0.5, y: r + 0.5, niveau: 0, wacht: 0.15, besteed: prijs, hoek: -Math.PI / 2, knallen: 0 }
    t.s = torenStats(type, 0)
    S.torens.push(t)
    return t
  }
  function upgradePrijs(t) { var u = TORENS[t.type].up[t.niveau]; return u ? u.prijs : 0 }
  function upgrade(S, t) {
    var p = upgradePrijs(t)
    if (!p || S.goud < p) return false
    S.goud -= p; t.besteed += p; t.niveau++
    t.s = torenStats(t.type, t.niveau)
    return true
  }
  function verkoopWaarde(t) { return Math.floor(t.besteed * VERKOOP) }
  function verkoop(S, t) {
    var i = S.torens.indexOf(t)
    if (i < 0) return 0
    S.torens.splice(i, 1)
    S.stapels = S.stapels.filter(function (p) { return p.toren !== t })
    var w = verkoopWaarde(t)
    S.goud += w
    return w
  }

  function startGolf(S) {
    if (S.actief || S.gewonnen || S.verloren || S.golf >= S.maxGolf) return null
    S.golf++
    S.actief = true
    var groepen = golf(S.L, S.golf), nieuw = [], rIdx = 0, nRoutes = S.kaart.routes.length
    groepen.forEach(function (gr) {
      // blimps nemen altijd de hoofdroute (de langste): anders is een korte zij-ingang niet te verdedigen
      for (var i = 0; i < gr.n; i++) S.wachtrij.push({ t: S.t + gr.start + i * gr.tus, laag: gr.laag, route: gr.laag === 'blimp' ? 0 : (rIdx++) % nRoutes })
      if (!S.gezien[gr.laag]) { S.gezien[gr.laag] = true; if (NIEUW[gr.laag]) nieuw.push(gr.laag) }
    })
    S.wachtrij.sort(function (a, b) { return a.t - b.t })
    return { golf: S.golf, nieuw: nieuw }
  }

  function maakVijand(S, laag, route, d) {
    var e = { id: S.id++, laag: laag, hp: hpVan(laag, S.L), route: route, d: d || 0, vries: 0, traag: 0, getrokken: 0, dood: false, x: 0, y: 0 }
    var p = opRoute(S.kaart.routes[route], e.d); e.x = p.x; e.y = p.y
    S.vijanden.push(e)
    return e
  }

  function resterend(S, e) { return S.kaart.routes[e.route].len - e.d }
  function immuun(e, soort) { return LAGEN[e.laag].immuun === soort }
  function kracht(S, e) { return rbe(e.laag, S.L) - (hpVan(e.laag, S.L) - e.hp) }

  // schade op één ballon; geeft het aantal geknalde lagen terug
  function raak(S, e, n, soort, ev) {
    var knal = 0
    while (n > 0 && !e.dood) {
      var d = LAGEN[e.laag]
      if (d.immuun === soort) { ev.push({ type: 'immuun', x: e.x, y: e.y }); break }
      var neem = Math.min(n, e.hp)
      e.hp -= neem; n -= neem
      if (e.hp > 0) { ev.push({ type: 'tik', x: e.x, y: e.y, laag: e.laag }); break }
      knal++
      S.goud += d.goud || 1
      S.geknald++
      ev.push({ type: 'knal', x: e.x, y: e.y, laag: e.laag, groot: !!d.groot })
      if (d.kind) { e.laag = d.kind; e.hp = hpVan(d.kind, S.L) }
      else {
        e.dood = true
        if (d.kinderen) d.kinderen.forEach(function (k, i) {
          var kind = maakVijand(S, k, e.route, Math.max(0, e.d - i * 0.35))
          kind.vries = e.vries
        })
      }
    }
    return knal
  }

  function inBereik(t, e) { var dx = e.x - t.x, dy = e.y - t.y; return dx * dx + dy * dy <= t.s.bereik * t.s.bereik }
  function zoekDoelen(S, t, n) {
    var kand = S.vijanden.filter(function (e) { return !e.dood && e.d > 0.05 && inBereik(t, e) && !immuun(e, t.s.soort) })
    if (t.s.doel === 'sterkste') kand.sort(function (a, b) { return kracht(S, b) - kracht(S, a) || resterend(S, a) - resterend(S, b) })
    else kand.sort(function (a, b) { return resterend(S, a) - resterend(S, b) })
    return kand.slice(0, n)
  }
  function richt(t, e) { t.hoek = Math.atan2(e.y - t.y, e.x - t.x) }

  function inKegel(t, e, hoek, kegel) {
    var a = Math.atan2(e.y - t.y, e.x - t.x), d = Math.abs(((a - hoek) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI)
    return d <= kegel
  }
  function legStapel(S, t, ev) {
    var mijne = S.stapels.filter(function (p) { return p.toren === t })
    if (mijne.length >= t.s.stapels) return false
    // vrije plekken op het pad binnen bereik, niet bovenop een andere stapel
    var plekken = []
    S.kaart.routes.forEach(function (route) {
      for (var d = 0.5; d < route.len - 0.3; d += 0.5) {
        var p = opRoute(route, d), dx = p.x - t.x, dy = p.y - t.y
        if (p.x < 0 || p.y < 0 || p.x > COLS || p.y > ROWS || dx * dx + dy * dy > t.s.bereik * t.s.bereik) continue
        if (S.stapels.some(function (q) { return Math.abs(q.x - p.x) + Math.abs(q.y - p.y) < 0.45 })) continue
        plekken.push(p)
      }
    })
    if (!plekken.length) return false
    var p = plekken[Math.floor(S.rnd() * plekken.length)]
    S.stapels.push({ id: S.id++, toren: t, x: p.x, y: p.y, n: t.s.spijkers, max: t.s.spijkers, soort: t.s.soort, schade: t.s.schade, geraakt: {} })
    ev.push({ type: 'stapel', toren: t.id, x1: t.x, y1: t.y, x: p.x, y: p.y })
    return true
  }

  function vuur(S, t, ev) {
    var s = t.s, doelen
    if (t.type === 'mijn') return false
    if (t.type === 'spijker') return legStapel(S, t, ev)
    if (t.type === 'zaag') {
      var raakt = S.vijanden.filter(function (e) { return !e.dood && e.d > 0.05 && inBereik(t, e) })
      if (!raakt.length) return false
      ev.push({ type: 'zaag', toren: t.id })
      raakt.forEach(function (e) { t.knallen += raak(S, e, s.schade, 'scherp', ev) })
      return true
    }
    if (t.type === 'vlam') {
      doelen = zoekDoelen(S, t, 1)
      if (!doelen.length) return false
      richt(t, doelen[0])
      var kegel = S.vijanden.filter(function (e) { return !e.dood && e.d > 0.05 && inBereik(t, e) && inKegel(t, e, t.hoek, s.kegel) })
      kegel.sort(function (a, b) { return resterend(S, a) - resterend(S, b) })
      ev.push({ type: 'vlam', toren: t.id, x: t.x, y: t.y, hoek: t.hoek, r: s.bereik, kegel: s.kegel })
      kegel.slice(0, s.doelen).forEach(function (e) { t.knallen += raak(S, e, s.schade, 'vuur', ev) })
      return true
    }
    if (t.type === 'magneet') {
      var trekbaar = S.vijanden.filter(function (e) {
        return !e.dood && e.d > 0.3 && inBereik(t, e) && e.getrokken < 2 && (s.groot || !LAGEN[e.laag].groot)
      })
      if (!trekbaar.length) return false
      ev.push({ type: 'magneet', toren: t.id, x: t.x, y: t.y, r: s.bereik, pts: trekbaar.map(function (e) { return { x: e.x, y: e.y } }) })
      trekbaar.forEach(function (e) {
        e.getrokken++
        e.d = Math.max(0, e.d - s.trek * (LAGEN[e.laag].groot ? 0.4 : 1))
        var p = opRoute(S.kaart.routes[e.route], e.d); e.x = p.x; e.y = p.y
        t.knallen += raak(S, e, s.schade, 'energie', ev)
      })
      return true
    }
    if (t.type === 'storm') {
      var kand = S.vijanden.filter(function (e) { return !e.dood && e.d > 0.3 && e.x > 0 && e.y > 0 && e.x < COLS && e.y < ROWS })
      if (!kand.length) return false
      var gekozen = []
      for (var i = 0; i < s.inslagen && kand.length; i++) gekozen.push(kand.splice(Math.floor(S.rnd() * kand.length), 1)[0])
      gekozen.forEach(function (e) {
        ev.push({ type: 'inslag', toren: t.id, x: e.x, y: e.y })
        t.knallen += raak(S, e, s.schade, 'energie', ev)
      })
      return true
    }
    if (t.type === 'boemerang') {
      doelen = zoekDoelen(S, t, s.doelen)
      if (!doelen.length) return false
      richt(t, doelen[0])
      doelen.forEach(function (e, i) {
        // mikken op waar de ballon straks is, en er een stukje voorbij
        var route = S.kaart.routes[e.route], d0 = Math.sqrt((e.x - t.x) * (e.x - t.x) + (e.y - t.y) * (e.y - t.y))
        var straks = opRoute(route, Math.min(route.len, e.d + LAGEN[e.laag].v * d0 / s.kogel * 1.3))
        var dx = straks.x - t.x, dy = straks.y - t.y, a = Math.max(0.8, Math.sqrt(dx * dx + dy * dy) + 0.5)
        S.boemerangs.push({ id: S.id++, toren: t, x: t.x, y: t.y, u: 0, duur: 2 * a / s.kogel * 1.25, a: a, hoek: Math.atan2(dy, dx),
          zij: i % 2 ? -1 : 1, over: s.doorboor, schade: s.schade, soort: s.soort, geraakt: {} })
      })
      ev.push({ type: 'schot', toren: t.id, soort: 'boemerang' })
      return true
    }
    if (t.type === 'vriezer') {
      var geraakt = S.vijanden.filter(function (e) { return !e.dood && e.d > 0.05 && inBereik(t, e) && !immuun(e, 'ijs') })
      if (!geraakt.length) return false
      ev.push({ type: 'vries', x: t.x, y: t.y, r: s.bereik, toren: t.id })
      geraakt.forEach(function (e) {
        t.knallen += raak(S, e, s.schade, 'ijs', ev)
        if (!e.dood && !immuun(e, 'ijs')) { e.vries = Math.max(e.vries, s.vries); e.traag = Math.max(e.traag, s.traag || 0) }
      })
      return true
    }
    if (t.type === 'tesla') {
      doelen = zoekDoelen(S, t, 1)
      if (!doelen.length) return false
      var keten = [doelen[0]], laatste = doelen[0]
      while (keten.length < s.keten) {
        var best = null, bd = 1.7 * 1.7
        S.vijanden.forEach(function (e) {
          if (e.dood || keten.indexOf(e) >= 0 || e.d <= 0.05) return
          var dx = e.x - laatste.x, dy = e.y - laatste.y, dd = dx * dx + dy * dy
          if (dd < bd) { bd = dd; best = e }
        })
        if (!best) break
        keten.push(best); laatste = best
      }
      richt(t, keten[0])
      ev.push({ type: 'keten', toren: t.id, pts: [{ x: t.x, y: t.y }].concat(keten.map(function (e) { return { x: e.x, y: e.y } })) })
      keten.forEach(function (e) { t.knallen += raak(S, e, s.schade, 'energie', ev) })
      return true
    }
    if (t.type === 'laser' || t.type === 'railgun') {
      doelen = zoekDoelen(S, t, 1)
      if (!doelen.length) return false
      var e1 = doelen[0]
      richt(t, e1)
      ev.push({ type: t.type === 'laser' ? 'straal' : 'rail', toren: t.id, x1: t.x, y1: t.y, x2: e1.x, y2: e1.y })
      t.knallen += raak(S, e1, s.schade, 'energie', ev)
      return true
    }
    // pijler, kanon, mortier en raket schieten kogels die hun doel volgen
    doelen = zoekDoelen(S, t, s.doelen || 1)
    if (!doelen.length) return false
    richt(t, doelen[0])
    doelen.forEach(function (e) {
      S.kogels.push({ id: S.id++, type: t.type, toren: t, x: t.x, y: t.y, sx: t.x, sy: t.y, doel: e, tx: e.x, ty: e.y, v: s.kogel, schade: s.schade, soort: s.soort, straal: s.straal || 0 })
    })
    ev.push({ type: 'schot', toren: t.id, soort: t.type })
    return true
  }

  function landKogel(S, k, ev) {
    if (k.straal) {
      ev.push({ type: 'boem', x: k.x, y: k.y, r: k.straal })
      S.vijanden.forEach(function (e) {
        if (e.dood) return
        var dx = e.x - k.x, dy = e.y - k.y
        if (dx * dx + dy * dy <= k.straal * k.straal) k.toren.knallen += raak(S, e, k.schade, 'explosie', ev)
      })
    } else if (k.doel && !k.doel.dood) {
      k.toren.knallen += raak(S, k.doel, k.schade, k.soort, ev)
    }
  }

  function stap(S, dt) {
    var ev = []
    if (S.gewonnen || S.verloren) return ev
    S.t += dt
    // nieuwe ballonnen
    while (S.wachtrij.length && S.wachtrij[0].t <= S.t) {
      var w = S.wachtrij.shift()
      maakVijand(S, w.laag, w.route, 0)
    }
    // bewegen
    S.vijanden.forEach(function (e) {
      if (e.dood) return
      var v = LAGEN[e.laag].v
      if (e.vries > 0) { e.vries -= dt; v = 0 }
      else if (e.traag > 0) { e.traag -= dt; v *= 0.5 }
      e.d += v * dt
      var route = S.kaart.routes[e.route]
      if (e.d >= route.len) {
        e.dood = true
        var lek = LAGEN[e.laag].lek
        S.levens = Math.max(0, S.levens - lek)
        ev.push({ type: 'lek', n: lek, laag: e.laag })
        return
      }
      var p = opRoute(route, e.d); e.x = p.x; e.y = p.y
    })
    // torens
    S.torens.forEach(function (t) {
      t.wacht -= dt
      if (t.wacht <= 0) { if (vuur(S, t, ev)) t.wacht = t.s.tik; else t.wacht = 0.05 }
    })
    // spijkerstapels: een ballon die eroverheen gaat kost één spijker
    if (S.stapels.length) {
      S.stapels = S.stapels.filter(function (p) {
        S.vijanden.forEach(function (e) {
          if (p.n <= 0 || e.dood || p.geraakt[e.id]) return
          var dx = e.x - p.x, dy = e.y - p.y
          if (dx * dx + dy * dy > 0.16) return
          p.geraakt[e.id] = true
          if (immuun(e, p.soort)) { ev.push({ type: 'immuun', x: e.x, y: e.y }); return }
          p.n--
          p.toren.knallen += raak(S, e, p.schade, p.soort, ev)
        })
        return p.n > 0
      })
    }
    // boemerangs: een lusje heen en terug, alles onderweg raken
    if (S.boemerangs.length) {
      S.boemerangs = S.boemerangs.filter(function (b) {
        b.u += dt / b.duur
        var f = b.u * 2 * Math.PI, vooruit = b.a * (1 - Math.cos(f)) / 2, opzij = b.a * 0.5 * Math.sin(f) * b.zij
        b.x = b.toren.x + Math.cos(b.hoek) * vooruit - Math.sin(b.hoek) * opzij
        b.y = b.toren.y + Math.sin(b.hoek) * vooruit + Math.cos(b.hoek) * opzij
        S.vijanden.forEach(function (e) {
          if (b.over <= 0 || e.dood || b.geraakt[e.id]) return
          var dx = e.x - b.x, dy = e.y - b.y
          if (dx * dx + dy * dy > 0.2) return
          b.geraakt[e.id] = true
          if (immuun(e, b.soort)) { ev.push({ type: 'immuun', x: e.x, y: e.y }); return }
          b.over--
          b.toren.knallen += raak(S, e, b.schade, b.soort, ev)
        })
        return b.u < 1
      })
    }
    // kogels
    S.kogels = S.kogels.filter(function (k) {
      if (k.doel && !k.doel.dood) { k.tx = k.doel.x; k.ty = k.doel.y }
      var dx = k.tx - k.x, dy = k.ty - k.y, dd = Math.sqrt(dx * dx + dy * dy), sp = k.v * dt
      if (dd <= sp || dd < 0.12) { k.x = k.tx; k.y = k.ty; landKogel(S, k, ev); return false }
      k.x += dx / dd * sp; k.y += dy / dd * sp
      return true
    })
    S.vijanden = S.vijanden.filter(function (e) { return !e.dood })
    if (S.levens <= 0) { S.verloren = true; S.actief = false; ev.push({ type: 'verloren' }); return ev }
    if (S.actief && !S.wachtrij.length && !S.vijanden.length) {
      S.actief = false
      S.kogels = []
      var bonus = golfBonus(S.golf)
      S.goud += bonus
      S.torens.forEach(function (t) {
        if (t.type !== 'mijn') return
        S.goud += t.s.goud; t.knallen += t.s.goud
        ev.push({ type: 'mijn', toren: t.id, x: t.x, y: t.y, n: t.s.goud })
      })
      ev.push({ type: 'golfklaar', golf: S.golf, bonus: bonus })
      if (S.golf >= S.maxGolf) { S.gewonnen = true; ev.push({ type: 'gewonnen' }) }
    }
    return ev
  }

  function sterren(S) { return !S.gewonnen ? 0 : S.levens >= 18 ? 3 : S.levens >= 10 ? 2 : 1 }

  return {
    COLS: COLS, ROWS: ROWS, LEVENS: LEVENS, START_GOUD: START_GOUD, GOLVEN: GOLVEN, BELONING_GOLVEN: BELONING_GOLVEN,
    LAGEN: LAGEN, NIEUW: NIEUW, TORENS: TORENS, VOLGORDE: VOLGORDE, KAARTEN: KAARTEN, VERKOOP: VERKOOP,
    rng: rng, rbe: rbe, hpVan: hpVan, kaart: kaart, opRoute: opRoute, golf: golf, golfBonus: golfBonus, torenStats: torenStats,
    nieuwSpel: nieuwSpel, kanBouwen: kanBouwen, torenOp: torenOp, bouw: bouw, upgrade: upgrade, upgradePrijs: upgradePrijs,
    verkoop: verkoop, verkoopWaarde: verkoopWaarde, startGolf: startGolf, stap: stap, sterren: sterren, sleutel: sleutel,
  }
})()
if (typeof globalThis !== 'undefined') globalThis.TD = TD
