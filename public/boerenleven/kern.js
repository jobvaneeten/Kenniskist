// ═══════════════════════════════════════════════════════════════════════════
//  BOERENLEVEN: kern. Akker, gewassen, seizoenen, dieren, winkel en opdrachten.
//  Geen DOM: gedeeld door spel.js en tools/boerenlevenTest.js.
//
//  Een dag duurt DAG seconden. Tik op een vakje en het doet wat logisch is:
//  gras omploegen, zaaien, water geven, oogsten of opruimen. Gewassen groeien
//  's nachts een dag als ze water kregen. Elk seizoen duurt 10 dagen; wat niet
//  bij het nieuwe seizoen hoort, verwelkt. Dieren die je aait, geven de
//  volgende ochtend iets (ei, melk, wol). Het dorp vraagt om spullen.
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
  }
  var UPGRADES = {
    akker: { naam: 'Grotere akker', uitleg: 'Meer grond om te zaaien.', prijzen: [150, 400, 900] },
    sproeier: { naam: 'Sproeiers', uitleg: 'Elke ochtend krijgen de vakjes rond een sproeier vanzelf water.', prijzen: [250, 600, 1200] },
    stal: { naam: 'Grotere stal', uitleg: 'Ruimte voor meer dieren.', prijzen: [200, 500] },
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
      oogst: {}, zaden: { radijs: 6, wortel: 3 }, upg: { akker: 0, sproeier: 0, stal: 0 }, opdrachten: [], klaarOpdrachten: 0, totaalVerdiend: 0 }
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
    if (v.t === 'gras') { s.velden[i] = { t: 'akker' }; return { t: 'ploeg', i: i } }
    if (v.gewas) {
      var g = v.gewas, info = GEWASSEN[g.id]
      if (g.dood) { delete v.gewas; return { t: 'ruim', i: i } }
      if (g.groei >= info.dagen) {
        s.oogst[g.id] = (s.oogst[g.id] || 0) + 1
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
    v.gewas = { id: zaadId, groei: 0, water: false }
    return { t: 'zaai', i: i, id: zaadId }
  }
  function aai(s, n) {
    var d = s.dieren[n]
    if (!d) return null
    if (d.product) { d.product = false; s.producten[DIEREN[d.soort].product]++; return { t: 'raap', n: n, product: DIEREN[d.soort].product } }
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
    var oudSeizoen = seizoen(s)
    s.dag++
    var nieuwSeizoen = seizoen(s)
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
    ev.push({ t: 'dag', dag: s.dag })
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
    if (s.munten < d.prijs || s.dieren.length >= maxDieren(s)) return false
    s.munten -= d.prijs; s.dieren.push({ soort: soort, blij: 0, geaaid: false, product: false })
    return true
  }
  function koopUpgrade(s, k) {
    var nv = s.upg[k], prijs = UPGRADES[k].prijzen[nv]
    if (prijs == null || s.munten < prijs) return false
    s.munten -= prijs; s.upg[k]++
    return true
  }
  function waardeVan(id) { return GEWASSEN[id] ? GEWASSEN[id].prijs : DIEREN[Object.keys(DIEREN).find(function (k) { return DIEREN[k].product === id })].waarde }
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
    while (s.opdrachten.length < 3) {
      var id = kan[Math.floor(dobbel(s) * kan.length)]
      if (s.opdrachten.some(function (o) { return o.id === id })) { if (kan.length <= s.opdrachten.length) break; continue }
      var n = 3 + Math.floor(dobbel(s) * 4) + Math.floor(s.klaarOpdrachten / 4)
      s.opdrachten.push({ id: id, n: n, wie: DORP[Math.floor(dobbel(s) * DORP.length)], beloning: Math.round(waardeVan(id) * n * 1.6 / 5) * 5 })
    }
  }
  function lever(s, k) {
    var o = s.opdrachten[k]
    if (!o) return false
    var bak = GEWASSEN[o.id] ? s.oogst : s.producten
    if ((bak[o.id] || 0) < o.n) return false
    bak[o.id] -= o.n; s.munten += o.beloning; s.totaalVerdiend += o.beloning; s.klaarOpdrachten++
    s.opdrachten.splice(k, 1); vulOpdrachten(s)
    return o.beloning
  }
  function naamVan(id) { return GEWASSEN[id] ? GEWASSEN[id].naam : DIEREN[Object.keys(DIEREN).find(function (k) { return DIEREN[k].product === id })].productNaam }

  return { DAG: DAG, W: W, H: H, SEIZOENEN: SEIZOENEN, GEWASSEN: GEWASSEN, DIEREN: DIEREN, UPGRADES: UPGRADES,
    nieuw: nieuw, tik: tik, aai: aai, verder: verder, slaap: slaap, seizoen: seizoen, dagInSeizoen: dagInSeizoen, bruikbaar: bruikbaar,
    sproeiers: sproeiers, maxDieren: maxDieren, koopZaad: koopZaad, koopDier: koopDier, koopUpgrade: koopUpgrade, verkoop: verkoop,
    lever: lever, naamVan: naamVan, waardeVan: waardeVan }
})()
