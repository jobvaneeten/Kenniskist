// ═══════════════════════════════════════════════════════════════════════════
//  MONSTERTEAM: kern. Wezens, aanvallen, gevechten, vangen en groeien. Geen DOM:
//  gedeeld door spel.js en tools/monsterteamTest.js.
//
//  Vijf elementen. Vuur wint van plant, plant van water, water van vuur.
//  Bliksem wint van water en schaduw, schaduw van vuur en plant.
//  Een gevecht gaat in beurten; wie sneller is, valt eerst aan.
// ═══════════════════════════════════════════════════════════════════════════
var MT = (function () {
  var TYPES = ['vuur', 'water', 'plant', 'bliksem', 'schaduw']
  var TYPENAAM = { vuur: 'Vuur', water: 'Water', plant: 'Plant', bliksem: 'Bliksem', schaduw: 'Schaduw', normaal: 'Normaal' }
  var KLEUR = { vuur: '#ff6a3d', water: '#3fa8ff', plant: '#5be37a', bliksem: '#ffd23d', schaduw: '#a56bff', normaal: '#c9cfe8' }
  // [aanvaller][verdediger]
  var EFFECT = {
    vuur: { vuur: 0.5, water: 0.5, plant: 2, bliksem: 1, schaduw: 1 },
    water: { vuur: 2, water: 0.5, plant: 0.5, bliksem: 1, schaduw: 1 },
    plant: { vuur: 0.5, water: 2, plant: 0.5, bliksem: 1, schaduw: 1 },
    bliksem: { vuur: 1, water: 2, plant: 0.5, bliksem: 0.5, schaduw: 2 },
    schaduw: { vuur: 2, water: 1, plant: 2, bliksem: 0.5, schaduw: 0.5 },
    normaal: { vuur: 1, water: 1, plant: 1, bliksem: 1, schaduw: 1 },
  }

  // aanvallen: kracht, trefkans, en soms een extra werking
  var AANVALLEN = {
    stoot: { naam: 'Stoot', type: 'normaal', kracht: 40, kans: 100 },
    snel: { naam: 'Snelle stoot', type: 'normaal', kracht: 30, kans: 100, eerst: true },
    grauw: { naam: 'Grauw', type: 'normaal', kracht: 0, kans: 100, zij: { aanval: -1 } },
    schild: { naam: 'Schild', type: 'normaal', kracht: 0, kans: 100, wij: { verdediging: 1 } },
    herstel: { naam: 'Herstel', type: 'normaal', kracht: 0, kans: 100, heel: 0.4 },
    vonk: { naam: 'Vonkje', type: 'vuur', kracht: 40, kans: 100 },
    vuurbal: { naam: 'Vuurbal', type: 'vuur', kracht: 70, kans: 95 },
    vlammenzee: { naam: 'Vlammenzee', type: 'vuur', kracht: 100, kans: 80 },
    spat: { naam: 'Spetter', type: 'water', kracht: 40, kans: 100 },
    golf: { naam: 'Golfslag', type: 'water', kracht: 70, kans: 95 },
    vloed: { naam: 'Vloedgolf', type: 'water', kracht: 100, kans: 80 },
    blad: { naam: 'Bladschot', type: 'plant', kracht: 40, kans: 100 },
    wortel: { naam: 'Wortelzweep', type: 'plant', kracht: 70, kans: 95 },
    zonblad: { naam: 'Zonneblad', type: 'plant', kracht: 100, kans: 80 },
    prik: { naam: 'Prik', type: 'bliksem', kracht: 40, kans: 100 },
    flits: { naam: 'Flitsstraal', type: 'bliksem', kracht: 70, kans: 95 },
    donder: { naam: 'Donderslag', type: 'bliksem', kracht: 100, kans: 75 },
    schim: { naam: 'Schimtik', type: 'schaduw', kracht: 40, kans: 100 },
    klauw: { naam: 'Nachtklauw', type: 'schaduw', kracht: 70, kans: 95 },
    eclips: { naam: 'Eclips', type: 'schaduw', kracht: 100, kans: 80 },
  }
  var PER_TYPE = { vuur: ['vonk', 'vuurbal', 'vlammenzee'], water: ['spat', 'golf', 'vloed'], plant: ['blad', 'wortel', 'zonblad'], bliksem: ['prik', 'flits', 'donder'], schaduw: ['schim', 'klauw', 'eclips'] }

  // wezens: basiswaarden [leven, aanval, verdediging, snelheid], uiterlijk (zie spel.js)
  var SOORTEN = {
    vonkel: { naam: 'Vonkel', type: 'vuur', b: [39, 52, 43, 65], evo: ['vlamvos', 14], look: { lijf: 'rond', oor: 'punt', staart: 'vlam', maat: 0.75 } },
    vlamvos: { naam: 'Vlamvos', type: 'vuur', b: [58, 66, 58, 80], evo: ['zonnevos', 30], look: { lijf: 'ovaal', oor: 'punt', staart: 'vlam', maat: 0.9, extra: 'manen' } },
    zonnevos: { naam: 'Zonnevos', type: 'vuur', b: [78, 90, 76, 100], look: { lijf: 'ovaal', oor: 'punt', staart: 'vlam', maat: 1.05, extra: 'kroon' } },
    druppie: { naam: 'Druppie', type: 'water', b: [44, 48, 65, 43], evo: ['golfling', 14], look: { lijf: 'druppel', oor: 'vin', staart: 'vis', maat: 0.75 } },
    golfling: { naam: 'Golfling', type: 'water', b: [59, 63, 80, 58], evo: ['tsunamor', 30], look: { lijf: 'rond', oor: 'vin', staart: 'vis', maat: 0.9, extra: 'schelp' } },
    tsunamor: { naam: 'Tsunamor', type: 'water', b: [79, 83, 100, 78], look: { lijf: 'peer', oor: 'vin', staart: 'vis', maat: 1.1, extra: 'golfkam' } },
    knopje: { naam: 'Knopje', type: 'plant', b: [45, 49, 49, 45], evo: ['bladbeer', 14], look: { lijf: 'rond', oor: 'blad', staart: 'blad', maat: 0.75 } },
    bladbeer: { naam: 'Bladbeer', type: 'plant', b: [60, 62, 63, 60], evo: ['woudreus', 30], look: { lijf: 'peer', oor: 'rond', staart: 'blad', maat: 0.95, extra: 'bloem' } },
    woudreus: { naam: 'Woudreus', type: 'plant', b: [80, 82, 83, 80], look: { lijf: 'peer', oor: 'rond', staart: 'blad', maat: 1.12, extra: 'boom' } },
    zoemer: { naam: 'Zoemer', type: 'bliksem', b: [35, 55, 40, 90], evo: ['flitskat', 16], look: { lijf: 'rond', oor: 'antenne', staart: 'flits', maat: 0.7, extra: 'vleugel' } },
    flitskat: { naam: 'Flitskat', type: 'bliksem', b: [55, 75, 55, 110], evo: ['donderleeuw', 32], look: { lijf: 'ovaal', oor: 'punt', staart: 'flits', maat: 0.9 } },
    donderleeuw: { naam: 'Donderleeuw', type: 'bliksem', b: [75, 100, 70, 115], look: { lijf: 'ovaal', oor: 'rond', staart: 'flits', maat: 1.1, extra: 'manen' } },
    nachtje: { naam: 'Nachtje', type: 'schaduw', b: [40, 45, 45, 60], evo: ['schimuil', 16], look: { lijf: 'rond', oor: 'pluim', staart: 'geen', maat: 0.7, extra: 'vleugel' } },
    schimuil: { naam: 'Schimuil', type: 'schaduw', b: [60, 65, 60, 80], evo: ['maanuil', 32], look: { lijf: 'peer', oor: 'pluim', staart: 'geen', maat: 0.9, extra: 'vleugel' } },
    maanuil: { naam: 'Maanuil', type: 'schaduw', b: [80, 90, 80, 100], look: { lijf: 'peer', oor: 'pluim', staart: 'geen', maat: 1.1, extra: 'maan' } },
    mosmuis: { naam: 'Mosmuis', type: 'plant', b: [40, 45, 40, 70], look: { lijf: 'rond', oor: 'rond', staart: 'dun', maat: 0.65 } },
    poelpad: { naam: 'Poelpad', type: 'water', b: [50, 45, 55, 35], evo: ['moeraskoning', 20], look: { lijf: 'breed', oor: 'geen', staart: 'geen', maat: 0.75 } },
    moeraskoning: { naam: 'Moeraskoning', type: 'water', b: [80, 70, 80, 45], look: { lijf: 'breed', oor: 'geen', staart: 'geen', maat: 1.05, extra: 'kroon' } },
    stormvink: { naam: 'Stormvink', type: 'bliksem', b: [40, 50, 35, 75], evo: ['stormarend', 22], look: { lijf: 'druppel', oor: 'pluim', staart: 'veer', maat: 0.65, extra: 'vleugel' } },
    stormarend: { naam: 'Stormarend', type: 'bliksem', b: [75, 85, 65, 100], look: { lijf: 'druppel', oor: 'pluim', staart: 'veer', maat: 1.0, extra: 'vleugel' } },
    gloeislak: { naam: 'Gloeislak', type: 'bliksem', b: [50, 40, 70, 25], look: { lijf: 'breed', oor: 'antenne', staart: 'huis', maat: 0.75 } },
    sintel: { naam: 'Sintel', type: 'vuur', b: [50, 60, 70, 30], look: { lijf: 'rots', oor: 'geen', staart: 'geen', maat: 0.75 } },
    lavaslak: { naam: 'Lavaslak', type: 'vuur', b: [65, 70, 85, 30], look: { lijf: 'breed', oor: 'antenne', staart: 'huis', maat: 0.9 } },
    spookvis: { naam: 'Spookvis', type: 'schaduw', b: [50, 65, 45, 70], look: { lijf: 'druppel', oor: 'vin', staart: 'vis', maat: 0.8 } },
    ijskever: { naam: 'IJskever', type: 'water', b: [60, 70, 95, 40], look: { lijf: 'rots', oor: 'antenne', staart: 'geen', maat: 0.85 } },
    sterrenkat: { naam: 'Sterrenkat', type: 'schaduw', b: [100, 110, 95, 120], look: { lijf: 'ovaal', oor: 'punt', staart: 'ster', maat: 1.1, extra: 'kroon' } },
  }
  var STARTERS = ['vonkel', 'druppie', 'knopje']

  // wat een wezen leert, op welk niveau
  function leerlijst(id) {
    var t = SOORTEN[id].type, m = PER_TYPE[t]
    var l = [[1, 'stoot'], [1, m[0]], [6, t === 'water' || t === 'plant' ? 'schild' : 'grauw'], [10, 'snel'], [15, m[1]], [22, 'herstel'], [29, m[2]]]
    // een paar wezens kennen ook een aanval van een ander element
    var extra = { vlamvos: 'klauw', zonnevos: 'klauw', golfling: 'blad', tsunamor: 'flits', bladbeer: 'klauw', woudreus: 'vuurbal', flitskat: 'klauw', donderleeuw: 'vuurbal', schimuil: 'golf', maanuil: 'flits', moeraskoning: 'wortel', stormarend: 'golf', sterrenkat: 'flits' }
    if (extra[id]) l.push([18, extra[id]])
    return l
  }

  // ── wezens maken ──
  var volgnummer = 1
  function stat(b, lvl, hp) { return Math.floor(b * 2 * lvl / 100) + (hp ? lvl + 10 : 5) }
  function maxHp(w) { return stat(SOORTEN[w.id].b[0], w.lvl, true) }
  function waarde(w, i) {
    var v = stat(SOORTEN[w.id].b[i], w.lvl)
    var st = i === 1 ? w.st.aanval : i === 2 ? w.st.verdediging : 0
    return v * (st >= 0 ? (2 + st) / 2 : 2 / (2 - st))
  }
  function maak(id, lvl, uid) {
    var w = { id: id, lvl: lvl, xp: 0, hp: 0, aanvallen: [], st: { aanval: 0, verdediging: 0 }, uid: uid || ('w' + Date.now().toString(36) + (volgnummer++)) }
    leerlijst(id).forEach(function (r) { if (r[0] <= lvl && w.aanvallen.indexOf(r[1]) < 0) w.aanvallen.push(r[1]) })
    while (w.aanvallen.length > 4) w.aanvallen.shift()
    w.hp = maxHp(w)
    return w
  }
  function xpNodig(lvl) { return 15 + lvl * lvl * 2 }

  // ── schade ──
  function effect(aanval, verdediger) { return EFFECT[AANVALLEN[aanval].type][SOORTEN[verdediger.id].type] }
  function schade(a, d, aanval, toeval) {
    var m = AANVALLEN[aanval]
    if (!m.kracht) return { n: 0, mult: 1 }
    var mult = EFFECT[m.type][SOORTEN[d.id].type]
    var stab = m.type === SOORTEN[a.id].type ? 1.25 : 1
    var basis = ((2 * a.lvl / 5 + 2) * m.kracht * waarde(a, 1) / waarde(d, 2)) / 50 + 2
    return { n: Math.max(1, Math.floor(basis * mult * stab * (0.85 + toeval * 0.15))), mult: mult }
  }

  // ── gevecht ──
  // g: { soort: 'wild'|'trainer'|'leider', zij: [wezens], zi: 0, naam, beloning, rng }
  function dobbel(g) {
    g.zaad = (g.zaad + 0x6D2B79F5) >>> 0
    var t = g.zaad
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  function gevecht(soort, zij, extra) {
    var g = { soort: soort, zij: zij, zi: 0, zaad: (Math.random() * 4294967296) >>> 0, beurt: 0, klaar: false }
    for (var k in (extra || {})) g[k] = extra[k]
    return g
  }
  function actiefWij(team) { for (var i = 0; i < team.length; i++) if (team[i].hp > 0) return i; return -1 }
  // tegenstander kiest de aanval met de meeste verwachte schade (en geneest soms)
  function kiesZij(g, zijW, wijW) {
    var beste = null, sc = -1
    zijW.aanvallen.forEach(function (a) {
      var m = AANVALLEN[a], v
      if (m.heel) v = zijW.hp < maxHp(zijW) * 0.35 ? 999 : -1
      else if (!m.kracht) v = g.beurt < 1 && dobbel(g) < 0.4 ? 30 : 5
      else v = schade(zijW, wijW, a, 0.5).n * m.kans / 100
      v *= 0.8 + dobbel(g) * 0.4
      if (v > sc) { sc = v; beste = a }
    })
    return beste
  }
  function voerUit(g, a, d, aanval, wie, ev) {
    var m = AANVALLEN[aanval], ander = wie === 'wij' ? 'zij' : 'wij'
    ev.push({ t: 'aanval', wie: wie, aanval: aanval })
    if (dobbel(g) * 100 >= m.kans) { ev.push({ t: 'mis', wie: wie }); return }
    if (m.kracht) {
      var r = schade(a, d, aanval, dobbel(g))
      d.hp = Math.max(0, d.hp - r.n)
      ev.push({ t: 'schade', wie: ander, n: r.n, mult: r.mult, hp: d.hp })
    }
    if (m.zij) for (var k in m.zij) { d.st[k] = Math.max(-3, Math.min(3, d.st[k] + m.zij[k])); ev.push({ t: 'stat', wie: ander, k: k, n: m.zij[k] }) }
    if (m.wij) for (var k2 in m.wij) { a.st[k2] = Math.max(-3, Math.min(3, a.st[k2] + m.wij[k2])); ev.push({ t: 'stat', wie: wie, k: k2, n: m.wij[k2] }) }
    if (m.heel) { var oud = a.hp; a.hp = Math.min(maxHp(a), a.hp + Math.round(maxHp(a) * m.heel)); ev.push({ t: 'heel', wie: wie, n: a.hp - oud, hp: a.hp }) }
  }
  // XP, nieuwe niveaus, nieuwe aanvallen en veranderen (evolutie)
  function geefXp(w, n, ev) {
    w.xp += n
    ev.push({ t: 'xp', uid: w.uid, n: n })
    while (w.xp >= xpNodig(w.lvl) && w.lvl < 60) {
      w.xp -= xpNodig(w.lvl)
      var oudMax = maxHp(w)
      w.lvl++
      w.hp += maxHp(w) - oudMax
      ev.push({ t: 'niveau', uid: w.uid, lvl: w.lvl })
      leerlijst(w.id).forEach(function (r) {
        if (r[0] === w.lvl && w.aanvallen.indexOf(r[1]) < 0) {
          var weg = null
          if (w.aanvallen.length >= 4) {
            // de zwakste aanval maakt plaats
            var zw = w.aanvallen.slice().sort(function (x, y) { return (AANVALLEN[x].kracht || 35) - (AANVALLEN[y].kracht || 35) })[0]
            weg = zw; w.aanvallen.splice(w.aanvallen.indexOf(zw), 1)
          }
          w.aanvallen.push(r[1])
          ev.push({ t: 'leer', uid: w.uid, aanval: r[1], vergeet: weg })
        }
      })
      var evo = SOORTEN[w.id].evo
      if (evo && w.lvl >= evo[1]) {
        var van = w.id, oud2 = maxHp(w)
        w.id = evo[0]; w.hp += maxHp(w) - oud2
        ev.push({ t: 'evolutie', uid: w.uid, van: van, naar: w.id })
      }
    }
  }
  function xpVoor(versl) { return Math.round(SOORTEN[versl.id].b.reduce(function (a, b) { return a + b }, 0) * versl.lvl / 16) }

  // Eén beurt. actie: { t: 'aanval', a } | { t: 'wissel', i } | { t: 'bal', kracht } | { t: 'drank', heel, i } | { t: 'vlucht' }
  // team: jouw wezens (eerste levende vecht). Terug: gebeurtenissen.
  function beurt(g, team, actie) {
    var ev = []
    if (g.klaar) return ev
    var wi = actiefWij(team), wij = team[wi], zij = g.zij[g.zi]
    g.beurt++
    var zijAanval = kiesZij(g, zij, wij)
    var wijEerst = true
    if (actie.t === 'aanval') {
      var snelW = waarde(wij, 3) + (AANVALLEN[actie.a].eerst ? 999 : 0), snelZ = waarde(zij, 3) + (AANVALLEN[zijAanval].eerst ? 999 : 0)
      wijEerst = snelW > snelZ || (snelW === snelZ && dobbel(g) < 0.5)
    }
    // eerst wat jij doet als het geen aanval is (wisselen, bal, drankje, vluchten gaat altijd voor)
    if (actie.t === 'vlucht') {
      if (g.soort !== 'wild') { ev.push({ t: 'tekst', s: 'Je kunt niet vluchten van een trainer!' }); g.beurt--; return ev }
      if (dobbel(g) < 0.75 || waarde(wij, 3) > waarde(zij, 3)) { g.klaar = true; ev.push({ t: 'gevlucht' }); return ev }
      ev.push({ t: 'tekst', s: 'Vluchten lukt niet!' })
    }
    if (actie.t === 'wissel') {
      var nieuw = team.splice(actie.i, 1)[0]; team.unshift(nieuw)
      wij.st = { aanval: 0, verdediging: 0 }
      ev.push({ t: 'wissel', wie: 'wij', uid: nieuw.uid })
      wij = nieuw
    }
    if (actie.t === 'drank') {
      var doel = team[actie.i], oud = doel.hp
      if (actie.wek) { if (doel.hp > 0) { g.beurt--; return [{ t: 'tekst', s: 'Dat wezen is wakker.' }] } doel.hp = Math.round(maxHp(doel) / 2) }
      else { if (doel.hp <= 0) { g.beurt--; return [{ t: 'tekst', s: 'Dit wezen is flauwgevallen.' }] } doel.hp = Math.min(maxHp(doel), doel.hp + actie.heel) }
      ev.push({ t: 'heel', wie: actie.i === actiefWij(team) ? 'wij' : 'team', uid: doel.uid, n: doel.hp - oud, hp: doel.hp })
    }
    if (actie.t === 'bal') {
      if (g.soort !== 'wild') { g.beurt--; return [{ t: 'tekst', s: 'Wezens van een trainer kun je niet vangen.' }] }
      var leven = zij.hp / maxHp(zij), basis = g.vangkans || 0.45
      var kans = Math.min(0.97, (1 - leven * 0.75) * basis * actie.kracht * (1 + Math.max(0, 15 - zij.lvl) / 30))
      var schud = 0
      for (var k = 0; k < 3; k++) if (dobbel(g) < Math.pow(kans, 1 / 3)) schud++
      ev.push({ t: 'bal', schud: schud, gelukt: schud === 3 })
      if (schud === 3) { zij.st = { aanval: 0, verdediging: 0 }; g.klaar = true; g.gevangen = zij; ev.push({ t: 'gevangen', id: zij.id }); return ev }
    }
    var zijDoet = function () {
      if (zij.hp <= 0 || wij.hp <= 0) return
      voerUit(g, zij, wij, zijAanval, 'zij', ev)
    }
    if (actie.t === 'aanval') {
      if (wijEerst) { voerUit(g, wij, zij, actie.a, 'wij', ev); zijDoet() }
      else { zijDoet(); if (wij.hp > 0) voerUit(g, wij, zij, actie.a, 'wij', ev) }
    } else zijDoet()
    // flauwgevallen?
    if (zij.hp <= 0) {
      ev.push({ t: 'flauw', wie: 'zij' })
      geefXp(wij, Math.round(xpVoor(zij) * (g.soort === "wild" ? 1 : 1.5)), ev)
      if (g.zi < g.zij.length - 1) { g.zi++; ev.push({ t: 'volgende', wie: 'zij', id: g.zij[g.zi].id }) }
      else { g.klaar = true; g.gewonnen = true; ev.push({ t: 'gewonnen' }) }
    }
    if (wij.hp <= 0) {
      ev.push({ t: 'flauw', wie: 'wij' })
      if (actiefWij(team) < 0) { g.klaar = true; g.verloren = true; ev.push({ t: 'verloren' }) }
      else ev.push({ t: 'kies' })
    }
    return ev
  }

  // ── wereld ──
  var GEBIEDEN = [
    { naam: 'Gloeiweide', kleur: '#5be37a', wild: [['mosmuis', 2, 4], ['poelpad', 2, 4], ['stormvink', 3, 5], ['knopje', 3, 4, 0.08]],
      trainer: { naam: 'Sam', team: [['mosmuis', 4], ['poelpad', 5]] }, leider: { naam: 'Mira', type: 'plant', team: [['knopje', 6], ['mosmuis', 7]], badge: 'Bladbadge' } },
    { naam: 'Bliksembergen', kleur: '#ffd23d', wild: [['zoemer', 5, 8], ['gloeislak', 5, 8], ['sintel', 6, 8], ['stormvink', 6, 9]],
      trainer: { naam: 'Kai', team: [['zoemer', 8], ['sintel', 9]] }, leider: { naam: 'Volt', type: 'bliksem', team: [['gloeislak', 10], ['zoemer', 11], ['flitskat', 12]], badge: 'Flitsbadge' } },
    { naam: 'Nevelmeer', kleur: '#3fa8ff', wild: [['druppie', 9, 12], ['poelpad', 10, 13], ['spookvis', 10, 13], ['golfling', 12, 14, 0.15]],
      trainer: { naam: 'Lotte', team: [['spookvis', 13], ['golfling', 14]] }, leider: { naam: 'Marin', type: 'water', team: [['poelpad', 15], ['ijskever', 15], ['golfling', 17]], badge: 'Golfbadge' } },
    { naam: 'Lavakrater', kleur: '#ff6a3d', wild: [['sintel', 14, 18], ['lavaslak', 15, 18], ['vonkel', 14, 17], ['vlamvos', 17, 19, 0.12]],
      trainer: { naam: 'Ravi', team: [['lavaslak', 18], ['vlamvos', 19]] }, leider: { naam: 'Blaze', type: 'vuur', team: [['sintel', 20], ['lavaslak', 21], ['vlamvos', 23]], badge: 'Vlambadge' } },
    { naam: 'Schaduwwoud', kleur: '#a56bff', wild: [['nachtje', 19, 23], ['spookvis', 20, 24], ['mosmuis', 20, 23], ['schimuil', 22, 25, 0.15]],
      trainer: { naam: 'Noor', team: [['schimuil', 24], ['bladbeer', 24]] }, leider: { naam: 'Nox', type: 'schaduw', team: [['spookvis', 26], ['nachtje', 26], ['schimuil', 28]], badge: 'Nachtbadge' } },
    { naam: 'Sterrentop', kleur: '#ff4fd8', wild: [['stormarend', 26, 30], ['ijskever', 26, 30], ['flitskat', 27, 30], ['moeraskoning', 27, 31]],
      trainer: { naam: 'Jesse', team: [['stormarend', 30], ['flitskat', 31], ['moeraskoning', 31]] }, leider: { naam: 'Astra', type: 'alles', team: [['donderleeuw', 33], ['maanuil', 33], ['tsunamor', 34], ['zonnevos', 35]], badge: 'Sterrenbadge' } },
  ]
  // een wild wezen voor dit gebied (zeldzame met kans r)
  function wild(gebied, toeval1, toeval2, toeval3) {
    var lijst = GEBIEDEN[gebied].wild, gewoon = lijst.filter(function (w) { return !w[3] })
    var zeldzaam = lijst.filter(function (w) { return w[3] })
    var keuze = zeldzaam.length && toeval1 < zeldzaam[0][3] ? zeldzaam[0] : gewoon[Math.floor(toeval2 * gewoon.length)]
    return maak(keuze[0], keuze[1] + Math.floor(toeval3 * (keuze[2] - keuze[1] + 1)))
  }
  function heelAlles(team) { team.forEach(function (w) { w.hp = maxHp(w); w.st = { aanval: 0, verdediging: 0 } }) }

  return {
    TYPES: TYPES, TYPENAAM: TYPENAAM, KLEUR: KLEUR, EFFECT: EFFECT, AANVALLEN: AANVALLEN, SOORTEN: SOORTEN, STARTERS: STARTERS, GEBIEDEN: GEBIEDEN,
    maak: maak, maxHp: maxHp, xpNodig: xpNodig, schade: schade, effect: effect, gevecht: gevecht, beurt: beurt, actiefWij: actiefWij,
    wild: wild, heelAlles: heelAlles, leerlijst: leerlijst, geefXp: geefXp,
  }
})()
