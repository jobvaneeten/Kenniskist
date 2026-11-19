// ═══════════════════════════════════════════════════════════════════════════
//  BOERENLEVEN: kern. Akker, gewassen, seizoenen, dieren, winkel en opdrachten.
//  Geen DOM: gedeeld door spel.js en tools/boerenlevenTest.js.
//
//  Een dag duurt DAG seconden. Tik op een vakje en het doet wat logisch is:
//  gras omploegen, zaaien, water geven, oogsten of opruimen. Gewassen groeien
//  's nachts een dag als ze water kregen. Elk seizoen duurt 10 dagen; wat niet
//  bij het nieuwe seizoen hoort, verwelkt. Dieren die je aait, geven de
//  volgende ochtend iets (ei, melk, wol, truffel). Het dorp vraagt om spullen.
//  Alles wat je doet geeft ervaring: hogere niveaus openen de keuken, de
//  bijenkasten, het varken en appelbomen. In de vijver kun je vissen en soms
//  regent het: dan krijgen alle planten vanzelf water.
// ═══════════════════════════════════════════════════════════════════════════
var PB = (function () {
  var DAG = 60, W = 12, H = 8
  var SEIZOENEN = ['Lente', 'Zomer', 'Herfst', 'Winter']
  var GEWASSEN = {
    radijs: { naam: 'Radijs', seizoen: 0, dagen: 3, zaad: 10, prijs: 24, kleur: '#ff4f7a' },
    wortel: { naam: 'Wortel', seizoen: 0, dagen: 4, zaad: 15, prijs: 36, kleur: '#ff9a3d' },
    aardbei: { naam: 'Aardbei', seizoen: 0, dagen: 6, zaad: 30, prijs: 72, kleur: '#ff3d4a', opnieuw: 3 },
    tomaat: { naam: 'Tomaat', seizoen: 1, dagen: 5, zaad: 20, prijs: 30, kleur: '#ff4a3d', opnieuw: 2 },
    mais: { naam: 'Maïs', seizoen: 1, dagen: 7, zaad: 30, prijs: 85, kleur: '#ffd23d' },
    zonnebloem: { naam: 'Zonnebloem', seizoen: 1, dagen: 6, zaad: 25, prijs: 65, kleur: '#ffcf2a' },
    aardappel: { naam: 'Aardappel', seizoen: 2, dagen: 4, zaad: 15, prijs: 40, kleur: '#c99a5a' },
    druif: { naam: 'Druif', seizoen: 2, dagen: 6, zaad: 35, prijs: 45, kleur: '#9b5bd8', opnieuw: 2 },
    pompoen: { naam: 'Pompoen', seizoen: 2, dagen: 8, zaad: 40, prijs: 130, kleur: '#ff8a1a' },
    boerenkool: { naam: 'Boerenkool', seizoen: 3, dagen: 5, zaad: 20, prijs: 55, kleur: '#3f9a5a' },
    ijsbes: { naam: 'IJsbes', seizoen: 3, dagen: 7, zaad: 50, prijs: 160, kleur: '#7fe8ff' },
  }
  var DIEREN = {
    kip: { naam: 'Kip', prijs: 120, product: 'ei', productNaam: 'Ei', waarde: 30 },
    schaap: { naam: 'Schaap', prijs: 350, product: 'wol', productNaam: 'Wol', waarde: 70 },
    koe: { naam: 'Koe', prijs: 500, product: 'melk', productNaam: 'Melk', waarde: 90 },
    varken: { naam: 'Varken', prijs: 700, product: 'truffel', productNaam: 'Truffel', waarde: 150, niveau: 4 },
  }
  var UPGRADES = {
    akker: { naam: 'Grotere akker', uitleg: 'Meer grond om te zaaien.', prijzen: [150, 400, 900] },
    sproeier: { naam: 'Sproeiers', uitleg: 'Elke ochtend krijgen de vakjes rond een sproeier vanzelf water.', prijzen: [250, 600, 1200] },
    stal: { naam: 'Grotere stal', uitleg: 'Ruimte voor meer dieren.', prijzen: [200, 500] },
    fornuis: { naam: 'Tweede fornuis', uitleg: 'Kook twee recepten tegelijk.', prijzen: [600], niveau: 2 },
  }
  // nieuwe dingen op de boerderij: kopen in de winkel vanaf een niveau
  var EXTRA = {
    bijenkast: { naam: 'Bijenkast', uitleg: 'Elke ochtend (niet in de winter) zit hij vol honing. Staan er zonnebloemen? Dan nog meer!', prijs: 400, max: 2, niveau: 3 },
    appelboom: { naam: 'Appelboom', uitleg: 'Groeit 5 dagen, daarna hangen er om de dag appels aan (niet in de winter).', prijs: 600, max: 3, niveau: 5 },
  }
  // overige spullen: honing, appels en vissen
  var SPUL = {
    honing: { naam: 'Honing', waarde: 50 }, appel: { naam: 'Appel', waarde: 40 },
    voorn: { naam: 'Voorn', waarde: 25, vis: 0.5 }, baars: { naam: 'Baars', waarde: 45, vis: 0.3 }, karper: { naam: 'Karper', waarde: 85, vis: 0.15 }, goudvis: { naam: 'Goudvis', waarde: 220, vis: 0.05 },
  }
  // de keuken: wat je kookt is de volgende ochtend klaar en is meer waard
  var RECEPTEN = {
    tomatensoep: { naam: 'Tomatensoep', nodig: { tomaat: 3 }, waarde: 140, niveau: 2, vorm: 'kom', kleur: '#e8443a' },
    pannenkoek: { naam: 'Pannenkoeken', nodig: { ei: 2, melk: 1 }, waarde: 230, niveau: 2, vorm: 'bord', kleur: '#e8b04a' },
    jam: { naam: 'Aardbeienjam', nodig: { aardbei: 3 }, waarde: 260, niveau: 2, vorm: 'pot', kleur: '#d8243a' },
    popcorn: { naam: 'Popcorn', nodig: { mais: 2 }, waarde: 220, niveau: 2, vorm: 'bak', kleur: '#fff3c0' },
    friet: { naam: 'Frietjes', nodig: { aardappel: 3 }, waarde: 165, niveau: 2, vorm: 'bak', kleur: '#ffd23d' },
    druivensap: { naam: 'Druivensap', nodig: { druif: 3 }, waarde: 180, niveau: 2, vorm: 'fles', kleur: '#7a2ab8' },
    kaas: { naam: 'Kaas', nodig: { melk: 3 }, waarde: 360, niveau: 3, vorm: 'kaas', kleur: '#ffcf3a' },
    sjaal: { naam: 'Wollen sjaal', nodig: { wol: 2 }, waarde: 190, niveau: 3, vorm: 'sjaal', kleur: '#e8443a' },
    honingkoek: { naam: 'Honingkoek', nodig: { honing: 2, ei: 1 }, waarde: 200, niveau: 3, vorm: 'taart', kleur: '#d8902a' },
    pompoensoep: { naam: 'Pompoensoep', nodig: { pompoen: 1, aardappel: 1 }, waarde: 240, niveau: 3, vorm: 'kom', kleur: '#ff8a1a' },
    stamppot: { naam: 'Boerenkoolstamppot', nodig: { boerenkool: 2, aardappel: 2 }, waarde: 260, niveau: 3, vorm: 'bord', kleur: '#3f9a5a' },
    vissoep: { naam: 'Vissoep', nodig: { baars: 1, wortel: 2 }, waarde: 170, niveau: 4, vorm: 'kom', kleur: '#f4d8a0' },
    truffelpasta: { naam: 'Truffelpasta', nodig: { truffel: 1, tomaat: 2 }, waarde: 300, niveau: 4, vorm: 'bord', kleur: '#f4e0a0' },
    appeltaart: { naam: 'Appeltaart', nodig: { appel: 3, ei: 1 }, waarde: 250, niveau: 5, vorm: 'taart', kleur: '#c8783a' },
    ijsbestaart: { naam: 'IJsbessentaart', nodig: { ijsbes: 2, ei: 1 }, waarde: 440, niveau: 5, vorm: 'taart', kleur: '#7fe8ff' },
  }
  // niveaus van de boer
  var NIVEAU_XP = [0, 0, 40, 110, 220, 380, 600, 900, 1300, 1800, 2500, 3400]
  var ONTGRENDEL = { 2: 'De keuken is open! Tik op je huis om te koken.', 3: 'Je kunt nu bijenkasten kopen en kaas maken.', 4: 'Je kunt nu een varken kopen. Het zoekt truffels!', 5: 'Je kunt nu appelbomen kopen.' }
  function niveau(s) { var n = 1; while (n + 1 < NIVEAU_XP.length && (s.xp || 0) >= NIVEAU_XP[n + 1]) n++; return n }
  function voortgang(s) { var n = niveau(s); if (n + 1 >= NIVEAU_XP.length) return 1; return ((s.xp || 0) - NIVEAU_XP[n]) / (NIVEAU_XP[n + 1] - NIVEAU_XP[n]) }
  function xp(s, n) {
    var oud = niveau(s); s.xp = (s.xp || 0) + n
    var nw = niveau(s)
    if (nw > oud) { s.ev = s.ev || []; s.ev.push({ t: 'niveau', niveau: nw, tekst: ONTGRENDEL[nw] || 'Je bent een betere boer geworden. Het dorp vraagt nu meer.' }) }
  }
  // oude opslag aanvullen met alles wat later bij het spel kwam
  function herstel(s) {
    if (s.xp == null) s.xp = 0
    if (!s.pannen) s.pannen = []
    if (!s.kasten) s.kasten = []
    if (!s.bomen) s.bomen = []
    if (!s.weer) s.weer = 'zon'
    if (s.visVandaag == null) s.visVandaag = 0
    if (s.upg.fornuis == null) s.upg.fornuis = 0
    if (!s.ev) s.ev = []
    return s
  }
  function info(id) {
    if (GEWASSEN[id]) return { naam: GEWASSEN[id].naam, waarde: GEWASSEN[id].prijs }
    if (RECEPTEN[id]) return { naam: RECEPTEN[id].naam, waarde: RECEPTEN[id].waarde }
    if (SPUL[id]) return SPUL[id]
    var d = DIEREN[Object.keys(DIEREN).find(function (k) { return DIEREN[k].product === id })]
    return d ? { naam: d.productNaam, waarde: d.waarde } : { naam: id, waarde: 0 }
  }
  function bakVan(s, id) { return GEWASSEN[id] ? s.oogst : s.producten }
  function hoeveel(s, id) { return bakVan(s, id)[id] || 0 }

  // ── keuken ──
  function kanKoken(s, id) {
    var r = RECEPTEN[id]
    if (!r || niveau(s) < r.niveau) return false
    return Object.keys(r.nodig).every(function (n) { return hoeveel(s, n) >= r.nodig[n] })
  }
  function kook(s, id) {
    herstel(s)
    if (!kanKoken(s, id) || s.pannen.length >= 1 + s.upg.fornuis) return false
    var r = RECEPTEN[id]
    Object.keys(r.nodig).forEach(function (n) { bakVan(s, n)[n] -= r.nodig[n] })
    s.pannen.push({ id: id }); xp(s, 8)
    return true
  }

  // ── vissen: kwaliteit 0..1 (hoe snel je trok) ──
  function vis(s, kwaliteit) {
    herstel(s)
    if (s.visVandaag >= 6) return { t: 'moe' }
    s.visVandaag++
    var r = dobbel(s) * (1 - Math.min(1, kwaliteit || 0) * 0.35), som = 0
    var lijst = ['goudvis', 'karper', 'baars', 'voorn']
    for (var i = 0; i < lijst.length; i++) { som += SPUL[lijst[i]].vis; if (r < som) break }
    var id = lijst[Math.min(i, lijst.length - 1)]
    s.producten[id] = (s.producten[id] || 0) + 1; xp(s, 4)
    return { t: 'vis', id: id }
  }

  // ── bijenkasten en appelbomen ──
  function koopExtra(s, k) {
    herstel(s)
    var e = EXTRA[k], lijst = k === 'bijenkast' ? s.kasten : s.bomen
    if (niveau(s) < e.niveau || lijst.length >= e.max || s.munten < e.prijs) return false
    s.munten -= e.prijs; lijst.push(k === 'bijenkast' ? { vol: 0 } : { leeftijd: 0, vol: false })
    return true
  }
  function raapKast(s, n) {
    var k = s.kasten[n]
    if (!k || !k.vol) return null
    s.producten.honing = (s.producten.honing || 0) + k.vol; var m = k.vol; k.vol = 0; xp(s, 3)
    return { t: 'honing', n: m }
  }
  function plukBoom(s, n) {
    var b = s.bomen[n]
    if (!b) return null
    if (!b.vol) return { t: 'niks', nog: Math.max(0, 5 - b.leeftijd) }
    s.producten.appel = (s.producten.appel || 0) + 3; b.vol = false; xp(s, 3)
    return { t: 'appel', n: 3 }
  }

  function dobbel(s) {
    s.zaad = (s.zaad + 0x6D2B79F5) >>> 0
    var t = s.zaad
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  // de akker: welke vakjes je mag gebruiken (groeit met de upgrade)
  function bruikbaar(s, i) {
    var x = i % W, y = i / W | 0, n = s.upg.akker
    var bw = [6, 8, 10, 12][n], bh = [4, 6, 7, 8][n]
    return x < bw && y < bh
  }
  function sproeiers(s) {
    // vaste plekken, één per niveau
    return [[2, 2], [7, 3], [4, 6]].slice(0, s.upg.sproeier).map(function (p) { return p[1] * W + p[0] })
  }
  function nieuw(zaad) {
    var s = { zaad: zaad >>> 0, dag: 1, tijd: 0.25, munten: 120, velden: [], dieren: [], producten: { ei: 0, wol: 0, melk: 0 },
      oogst: {}, zaden: { radijs: 6, wortel: 3 }, upg: { akker: 0, sproeier: 0, stal: 0, fornuis: 0 }, opdrachten: [], klaarOpdrachten: 0, totaalVerdiend: 0,
      xp: 0, pannen: [], kasten: [], bomen: [], weer: 'zon', visVandaag: 0, ev: [] }
    for (var i = 0; i < W * H; i++) s.velden.push({ t: 'gras' })
    // een paar vakjes zijn al omgeploegd om te beginnen
    ;[13, 14, 15, 25, 26, 27].forEach(function (i) { s.velden[i] = { t: 'akker' } })
    vulOpdrachten(s)
    return s
  }
  function seizoen(s) { return Math.floor((s.dag - 1) / 10) % 4 }
  function dagInSeizoen(s) { return (s.dag - 1) % 10 + 1 }
  function maxDieren(s) { return [2, 4, 6][s.upg.stal] }

  // ── tikken ──
  // Tik op vakje i, met het gekozen zaad. Terug: { t, ... } wat er gebeurde.
  function tik(s, i, zaadId) {
    var v = s.velden[i]
    if (!v || !bruikbaar(s, i)) return { t: 'niet', reden: 'Dit stuk grond is nog niet van jou. Koop een grotere akker.' }
    if (v.t === 'gras') { s.velden[i] = { t: 'akker' }; xp(s, 1); return { t: 'ploeg', i: i } }
    if (v.gewas) {
      var g = v.gewas, info = GEWASSEN[g.id]
      if (g.dood) { delete v.gewas; return { t: 'ruim', i: i } }
      if (g.groei >= info.dagen) {
        s.oogst[g.id] = (s.oogst[g.id] || 0) + 1; xp(s, Math.max(2, Math.round(info.prijs / 14)))
        if (info.opnieuw) { g.groei = info.dagen - info.opnieuw; g.water = false }
        else delete v.gewas
        return { t: 'oogst', i: i, id: g.id }
      }
      if (!g.water) { g.water = true; return { t: 'water', i: i } }
      return { t: 'groeit', i: i, nog: info.dagen - g.groei }
    }
    // lege akker: zaaien
    if (!zaadId || !s.zaden[zaadId]) return { t: 'niet', reden: 'Kies eerst zaad onderaan, of koop zaad in de winkel.' }
    if (GEWASSEN[zaadId].seizoen !== seizoen(s)) return { t: 'niet', reden: GEWASSEN[zaadId].naam + ' groeit alleen in de ' + SEIZOENEN[GEWASSEN[zaadId].seizoen].toLowerCase() + '.' }
    // te laat in het seizoen? dan verwelkt het voordat het rijp is
    var over = 10 - dagInSeizoen(s) + (s.tijd < 0.5 ? 1 : 0)
    if (GEWASSEN[zaadId].dagen > over) return { t: 'niet', reden: 'Te laat: ' + GEWASSEN[zaadId].naam + ' heeft ' + GEWASSEN[zaadId].dagen + ' dagen nodig en dit seizoen duurt nog ' + over + (over === 1 ? ' dag.' : ' dagen.') }
    s.zaden[zaadId]--
    if (!s.zaden[zaadId]) delete s.zaden[zaadId]
    v.gewas = { id: zaadId, groei: 0, water: false }; xp(s, 1)
    return { t: 'zaai', i: i, id: zaadId }
  }
  function aai(s, n) {
    var d = s.dieren[n]
    if (!d) return null
    if (d.product) { d.product = false; s.producten[DIEREN[d.soort].product] = (s.producten[DIEREN[d.soort].product] || 0) + 1; xp(s, 3); return { t: 'raap', n: n, product: DIEREN[d.soort].product } }
    if (d.geaaid) return { t: 'blij', n: n }
    d.geaaid = true; d.blij = Math.min(5, (d.blij || 0) + 1)
    return { t: 'aai', n: n }
  }

  // ── tijd ──
  // dt seconden verder. Terug: gebeurtenissen (nieuwe dag, seizoen...)
  function verder(s, dt) {
    var ev = []
    s.tijd += dt / DAG
    while (s.tijd >= 1) { s.tijd -= 1; nieuweDag(s, ev) }
    return ev
  }
  function slaap(s) {
    var ev = []
    nieuweDag(s, ev)
    s.tijd = 0.25
    return ev
  }
  function nieuweDag(s, ev) {
    herstel(s)
    var oudSeizoen = seizoen(s)
    s.dag++
    var nieuwSeizoen = seizoen(s)
    s.visVandaag = 0
    // het weer van vandaag; bij regen krijgt alles vanzelf water (na het groeien, hieronder)
    s.weer = s.weerVast || (nieuwSeizoen === 3 ? (dobbel(s) < 0.3 ? 'sneeuw' : 'zon') : (dobbel(s) < 0.22 ? 'regen' : 'zon'))
    // wat in de pan zat, is klaar
    s.pannen.forEach(function (p) { s.producten[p.id] = (s.producten[p.id] || 0) + 1; ev.push({ t: 'gekookt', id: p.id }) })
    s.pannen = []
    var bloemen = s.velden.some(function (v) { return v.gewas && v.gewas.id === 'zonnebloem' && !v.gewas.dood })
    s.kasten.forEach(function (k) { if (nieuwSeizoen !== 3) k.vol = Math.min(4, k.vol + (bloemen ? 2 : 1)) })
    s.bomen.forEach(function (b) { b.leeftijd++; if (b.leeftijd >= 5 && nieuwSeizoen !== 3 && s.dag % 2 === 0) b.vol = true; if (nieuwSeizoen === 3) b.vol = false })
    s.velden.forEach(function (v) {
      if (!v.gewas || v.gewas.dood) return
      if (v.gewas.water) v.gewas.groei = Math.min(GEWASSEN[v.gewas.id].dagen, v.gewas.groei + 1)
      v.gewas.water = false
      if (nieuwSeizoen !== oudSeizoen && GEWASSEN[v.gewas.id].seizoen !== nieuwSeizoen) v.gewas.dood = true
    })
    // sproeiers geven 's ochtends water aan de vakjes eromheen
    sproeiers(s).forEach(function (sp) {
      var sx = sp % W, sy = sp / W | 0
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var x = sx + dx, y = sy + dy
        if (x < 0 || y < 0 || x >= W || y >= H) continue
        var v = s.velden[y * W + x]
        if (v.gewas && !v.gewas.dood) v.gewas.water = true
      }
    })
    s.dieren.forEach(function (d) { if (d.geaaid) d.product = true; d.geaaid = false })
    if (s.weer === 'regen') s.velden.forEach(function (v) { if (v.gewas && !v.gewas.dood) v.gewas.water = true })
    ev.push({ t: 'dag', dag: s.dag, weer: s.weer })
    // nooit vastlopen: geen geld, geen zaad en niets op het land? Dan krijg je zaad van het dorp
    var groeit = s.velden.some(function (v) { return v.gewas && !v.gewas.dood })
    var heeftZaad = Object.keys(s.zaden).some(function (id) { return GEWASSEN[id].seizoen === nieuwSeizoen && s.zaden[id] > 0 })
    if (!groeit && !heeftZaad && s.munten < 40) {
      var goedkoop = Object.keys(GEWASSEN).filter(function (id) { return GEWASSEN[id].seizoen === nieuwSeizoen }).sort(function (x, y) { return GEWASSEN[x].zaad - GEWASSEN[y].zaad })[0]
      s.zaden[goedkoop] = (s.zaden[goedkoop] || 0) + 4
      ev.push({ t: 'cadeau', id: goedkoop, n: 4 })
    }
    if (nieuwSeizoen !== oudSeizoen) { ev.push({ t: 'seizoen', seizoen: nieuwSeizoen }); vulOpdrachten(s, true) }
    else if (s.opdrachten.length < 3) vulOpdrachten(s)
    return ev
  }

  // ── winkel en verkopen ──
  function koopZaad(s, id, n) {
    var p = GEWASSEN[id].zaad * (n || 1)
    if (s.munten < p) return false
    s.munten -= p; s.zaden[id] = (s.zaden[id] || 0) + (n || 1)
    return true
  }
  function koopDier(s, soort) {
    var d = DIEREN[soort]
    if (s.munten < d.prijs || s.dieren.length >= maxDieren(s) || niveau(herstel(s)) < (d.niveau || 1)) return false
    s.munten -= d.prijs; s.dieren.push({ soort: soort, blij: 0, geaaid: false, product: false })
    return true
  }
  function koopUpgrade(s, k) {
    var nv = s.upg[k], prijs = UPGRADES[k].prijzen[nv]
    if (prijs == null || s.munten < prijs || niveau(herstel(s)) < (UPGRADES[k].niveau || 1)) return false
    s.munten -= prijs; s.upg[k]++
    return true
  }
  function waardeVan(id) { return info(id).waarde }
  function verkoop(s, id) {
    var bak = GEWASSEN[id] ? s.oogst : s.producten
    var n = bak[id] || 0
    if (!n) return 0
    var w = n * waardeVan(id)
    bak[id] = 0; s.munten += w; s.totaalVerdiend += w
    return w
  }

  // ── opdrachten van het dorp ──
  var DORP = ['Bakker Bram', 'Juf Fenna', 'Visser Sem', 'Oma Lien', 'Kok Ravi', 'Smid Noor']
  function vulOpdrachten(s, nieuwSeizoen) {
    if (nieuwSeizoen) s.opdrachten = s.opdrachten.filter(function (o) { return !GEWASSEN[o.id] })
    var kan = Object.keys(GEWASSEN).filter(function (id) { return GEWASSEN[id].seizoen === seizoen(s) })
    if (s.dieren.length) s.dieren.forEach(function (d) { var p = DIEREN[d.soort].product; if (kan.indexOf(p) < 0) kan.push(p) })
    kan.push('voorn')
    if ((s.kasten || []).length) kan.push('honing')
    if ((s.bomen || []).some(function (b) { return b.leeftijd >= 5 }) && seizoen(s) !== 3) kan.push('appel')
    var nv = niveau(s)
    Object.keys(RECEPTEN).forEach(function (id) {
      var r = RECEPTEN[id]
      if (r.niveau > nv) return
      // alleen recepten waarvan je de spullen nu kunt krijgen
      var lukt = Object.keys(r.nodig).every(function (n) { return hoeveel(s, n) >= r.nodig[n] || (GEWASSEN[n] && GEWASSEN[n].seizoen === seizoen(s)) || s.dieren.some(function (d) { return DIEREN[d.soort].product === n }) || n === 'baars' })
      if (lukt && dobbel(s) < 0.35) kan.push(id)
    })
    while (s.opdrachten.length < 3) {
      var id = kan[Math.floor(dobbel(s) * kan.length)]
      if (s.opdrachten.some(function (o) { return o.id === id })) { if (kan.length <= s.opdrachten.length) break; continue }
      var n = RECEPTEN[id] ? 1 + Math.floor(dobbel(s) * 2) : SPUL[id] && SPUL[id].vis ? 2 + Math.floor(dobbel(s) * 3) : 3 + Math.floor(dobbel(s) * 4) + Math.floor(s.klaarOpdrachten / 4)
      s.opdrachten.push({ id: id, n: n, wie: DORP[Math.floor(dobbel(s) * DORP.length)], beloning: Math.round(waardeVan(id) * n * 1.6 / 5) * 5 })
    }
  }
  function lever(s, k) {
    var o = s.opdrachten[k]
    if (!o) return false
    var bak = GEWASSEN[o.id] ? s.oogst : s.producten
    if ((bak[o.id] || 0) < o.n) return false
    bak[o.id] -= o.n; s.munten += o.beloning; s.totaalVerdiend += o.beloning; s.klaarOpdrachten++; xp(s, 20 + o.n * 2)
    s.opdrachten.splice(k, 1); vulOpdrachten(s)
    return o.beloning
  }
  function naamVan(id) { return info(id).naam }

  return { DAG: DAG, W: W, H: H, SEIZOENEN: SEIZOENEN, GEWASSEN: GEWASSEN, DIEREN: DIEREN, UPGRADES: UPGRADES,
    nieuw: nieuw, tik: tik, aai: aai, verder: verder, slaap: slaap, seizoen: seizoen, dagInSeizoen: dagInSeizoen, bruikbaar: bruikbaar,
    sproeiers: sproeiers, maxDieren: maxDieren, koopZaad: koopZaad, koopDier: koopDier, koopUpgrade: koopUpgrade, verkoop: verkoop,
    lever: lever, naamVan: naamVan, waardeVan: waardeVan,
    EXTRA: EXTRA, SPUL: SPUL, RECEPTEN: RECEPTEN, NIVEAU_XP: NIVEAU_XP, niveau: niveau, voortgang: voortgang, herstel: herstel, info: info, hoeveel: hoeveel,
    kanKoken: kanKoken, kook: kook, vis: vis, koopExtra: koopExtra, raapKast: raapKast, plukBoom: plukBoom }
})()
