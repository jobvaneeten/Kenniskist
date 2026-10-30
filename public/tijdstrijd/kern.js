// Tijdstrijd — spelregels, levels en de veldslag zelf, zonder scherm. Ook
// geladen door tools/tijdstrijdTest.js (node vm), dus geen DOM hier.
//
// Jouw basis staat links, die van de computer rechts, met één weg ertussen.
// Je traint soldaten die vanzelf naar de overkant lopen en vechten met wat ze
// tegenkomen. Goud krijg je vanzelf en voor elke verslagen vijand, ervaring
// (XP) voor verslagen vijanden en voor wat je traint. Met genoeg XP ga je naar
// het volgende tijdperk: sterkere soldaten, een sterkere toren en een nieuwe
// superaanval. Wie eerst de basis van de ander sloopt, wint.
//
// Kant 0 is de speler (loopt naar rechts), kant 1 de computer. Alleen x telt;
// y is voor het scherm.
var TS = (function () {
  'use strict'

  var B = 1600, BASIS = [110, 1490], BASIS_HALF = 46, HOUD_X = 560, STAP = 1 / 30
  var M = [1, 2.3, 5.2, 11.5, 25]   // alles (prijs, levens, schade) groeit zo mee per tijdperk

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed)
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
      return ((t ^ t >>> 14) >>> 0) / 4294967296
    }
  }

  var TIJDPERKEN = [
    { id: 'oer',    naam: 'Oertijd', eenheden: ['Holbewoner', 'Slingeraar', 'Dinorijder'], toren: 'Rotsgooier',   super: 'Mammoetkudde' },
    { id: 'ridder', naam: 'Ridders', eenheden: ['Ridder', 'Boogschutter', 'Ruiter'],       toren: 'Kruisboog',    super: 'Drakenvuur' },
    { id: 'piraat', naam: 'Piraten', eenheden: ['Matroos', 'Musketier', 'Kapitein'],       toren: 'Scheepskanon', super: 'Kanonsalvo' },
    { id: 'robot',  naam: 'Robots',  eenheden: ['Vuistbot', 'Laserbot', 'Tankbot'],        toren: 'Lasertoren',   super: 'EMP-golf' },
    { id: 'ruimte', naam: 'Ruimte',  eenheden: ['Ruimtesoldaat', 'Plasmaschutter', 'Mecha'], toren: 'Ionkanon',   super: 'Satellietlaser' },
  ]
  // t = 0 vechter, 1 schutter, 2 zware. Waarden voor de Oertijd, daarna × M.
  var SOORTEN = [
    { id: 'vechter',  prijs: 15, hp: 55,  schade: 9,  tempo: 0.9, bereik: 22,  snel: 52, train: 1.0, breed: 34 },
    { id: 'schutter', prijs: 25, hp: 36,  schade: 7,  tempo: 1.1, bereik: 200, snel: 48, train: 1.4, breed: 30 },
    { id: 'zwaar',    prijs: 70, hp: 240, schade: 20, tempo: 1.4, bereik: 28,  snel: 38, train: 2.6, breed: 56 },
  ]
  // veeg: trekt over de weg en raakt elke vijand één keer; regen: valt op willekeurige plekken
  var SUPERS = [
    { soort: 'veeg', snel: 520, schade: 26 },
    { soort: 'veeg', snel: 380, schade: 30 },
    { soort: 'regen', n: 14, duur: 2.4, r: 70, schade: 14 },
    { soort: 'veeg', snel: 950, schade: 14, stun: 3 },
    { soort: 'veeg', snel: 320, schade: 36, van: 420 },
  ]
  var SUPER_LAAD = 45, PLEK_PRIJS = [0, 200, 600], MAX_RIJ = 5

  var UPGRADES = {
    goud:    { naam: 'Startgoud',   prijzen: [60, 140, 260, 420, 650],  zin: '40 goud extra aan het begin' },
    inkomen: { naam: 'Inkomen',     prijzen: [90, 200, 360, 560, 820],  zin: '10% meer goud' },
    basis:   { naam: 'Muren',       prijzen: [80, 180, 320, 500, 740],  zin: '12% meer levens voor je basis' },
    kracht:  { naam: 'Kracht',      prijzen: [100, 220, 400, 620, 900], zin: '8% meer schade voor je soldaten' },
    toren:   { naam: 'Torens',      prijzen: [90, 220, 420],            zin: '25% meer schade voor je torens' },
    super:   { naam: 'Superaanval', prijzen: [120, 300, 560],           zin: 'Je superaanval laadt sneller op' },
  }
  function mods(up) {
    up = up || {}
    return { goud: 120 + 40 * (up.goud || 0), inkomen: 1 + 0.1 * (up.inkomen || 0), basis: 1 + 0.12 * (up.basis || 0),
      kracht: 1 + 0.08 * (up.kracht || 0), toren: 1 + 0.25 * (up.toren || 0), laad: 1 + 0.18 * (up.super || 0), xp: 1 }
  }

  // 15 veldslagen. maxE = het hoogste tijdperk dat je (en de computer) kan halen.
  var LEVELS = []
  for (var l = 0; l < 15; l++) {
    LEVELS.push({ L: l, maxE: l < 3 ? 1 : l < 6 ? 2 : l < 9 ? 3 : 4,
      ai: { inkomen: 0.7 + 0.045 * l, xp: 0.9 + 0.01 * l, goud: 100 + 12 * l, kracht: 1 + 0.015 * l, basis: 1 + 0.03 * l, slim: Math.min(1, 0.3 + 0.06 * l) } })
  }

  function eenheid(e, t) {
    var S = SOORTEN[t]
    return { naam: TIJDPERKEN[e].eenheden[t], t: t, e: e, prijs: Math.round(S.prijs * M[e]), hp: S.hp * M[e], schade: S.schade * M[e],
      tempo: S.tempo, bereik: S.bereik, snel: S.snel, train: S.train, breed: S.breed }
  }
  function torenInfo(e) { return { naam: TIJDPERKEN[e].toren, prijs: Math.round(100 * M[e]), schade: 9 * M[e], tempo: 1.1, bereik: 380 } }
  function xpNodig(e) { return Math.round(600 * M[e]) }
  // in het laatste tijdperk spaar je XP voor de megabom: een flinke klap op de vijandelijke basis
  function megaNodig(e) { return Math.round(350 * M[e]) }
  function basisMax(e, m) { return 900 * M[e] * m.basis }
  function inkomen(z) { return 3 * M[z.e] * z.m.inkomen }
  // na 6 minuten raakt de computer langzaam op, zodat een slag niet eindeloos duurt
  function moeheid(s) { return Math.max(0.5, 1 - Math.max(0, s.t - 360) / 500) }

  function maakZij(k, m) {
    return { k: k, e: 0, goud: m.goud, xp: 0, m: m, rij: [], trainT: 0, torens: [null], lading: 0, houd: false,
      basis: { hp: basisMax(0, m), max: basisMax(0, m) }, gedood: 0 }
  }

  function nieuw(L, opts) {
    opts = opts || {}
    var def = LEVELS[L], a = def.ai
    var s = { L: L, def: def, t: 0, acc: 0, id: 1, eenheden: [], kogels: [], effecten: [], events: [], fase: 'spel', uitslag: null,
      rnd: rng(opts.seed || L * 7919 + 13), aiT: 1, aiPlan: null }
    s.zij = [maakZij(0, mods(opts.upgrades)), maakZij(1, { goud: a.goud, inkomen: a.inkomen, basis: a.basis, kracht: a.kracht, toren: 1, laad: 1, xp: a.xp })]
    return s
  }

  function ev(s, type, d) { d = d || {}; d.type = type; s.events.push(d) }
  function richting(k) { return k ? -1 : 1 }

  // ── acties (voor speler en computer) ──
  function koop(s, k, t) {
    var z = s.zij[k], E = eenheid(z.e, t)
    if (s.fase !== 'spel' || z.rij.length >= MAX_RIJ || z.goud < E.prijs) return false
    z.goud -= E.prijs; z.xp += E.prijs * 0.25 * z.m.xp
    if (!z.rij.length) z.trainT = E.train
    z.rij.push({ t: t, e: z.e })
    return true
  }
  function kanEvolueren(s, k) { var z = s.zij[k]; return z.e < s.def.maxE && z.xp >= xpNodig(z.e) }
  function evolueer(s, k) {
    var z = s.zij[k]
    if (s.fase !== 'spel' || !kanEvolueren(s, k)) return false
    z.xp -= xpNodig(z.e); z.e++
    var r = z.basis.hp / z.basis.max
    z.basis.max = basisMax(z.e, z.m); z.basis.hp = Math.min(z.basis.max, (r + 0.1) * z.basis.max)
    ev(s, 'tijdperk', { kant: k, e: z.e })
    return true
  }
  function kanMegabom(s, k) { var z = s.zij[k]; return z.e === s.def.maxE && z.xp >= megaNodig(z.e) }
  function megabom(s, k) {
    var z = s.zij[k], doel = s.zij[1 - k], dir = richting(k)
    if (s.fase !== 'spel' || !kanMegabom(s, k)) return false
    z.xp -= megaNodig(z.e)
    s.effecten.push({ kant: k, e: z.e, soort: 'mega', t: 0, x: BASIS[1 - k], geraakt: {} })
    ev(s, 'megabom', { kant: k })
    return true
  }
  // bouwt een toren van nu op een lege plek, of vervangt de oudste (halve prijs terug)
  function torenPlek(z) {
    var leeg = z.torens.indexOf(null)
    if (leeg >= 0) return leeg
    var oud = -1
    z.torens.forEach(function (tw, i) { if (tw.e < z.e && (oud < 0 || tw.e < z.torens[oud].e)) oud = i })
    return oud
  }
  function toren(s, k) {
    var z = s.zij[k], T = torenInfo(z.e), i = torenPlek(z)
    if (s.fase !== 'spel' || i < 0 || z.goud < T.prijs) return false
    if (z.torens[i]) z.goud += Math.round(torenInfo(z.torens[i].e).prijs / 2)
    z.goud -= T.prijs
    z.torens[i] = { e: z.e, cd: 0.5, mik: 0 }
    ev(s, 'toren', { kant: k, plek: i })
    return true
  }
  function plekPrijs(z) { return z.torens.length < PLEK_PRIJS.length ? PLEK_PRIJS[z.torens.length] : null }
  function plek(s, k) {
    var z = s.zij[k], p = plekPrijs(z)
    if (s.fase !== 'spel' || p == null || z.goud < p) return false
    z.goud -= p; z.torens.push(null)
    return true
  }
  function superAanval(s, k) {
    var z = s.zij[k], S = SUPERS[z.e], dir = richting(k)
    if (s.fase !== 'spel' || z.lading < 1) return false
    z.lading = 0
    var f = { kant: k, e: z.e, soort: S.soort, t: 0, schade: S.schade * M[z.e] * z.m.kracht, geraakt: {} }
    if (S.soort === 'veeg') { f.x = S.van ? BASIS[k] + dir * S.van : BASIS[k]; f.snel = S.snel; f.stun = S.stun || 0 }
    else {
      f.vallen = []; f.r = S.r; f.duur = S.duur
      for (var i = 0; i < S.n; i++) f.vallen.push({ t: 0.3 + S.duur * i / S.n + s.rnd() * 0.15, x: BASIS[k] + dir * (380 + s.rnd() * 1000), klaar: false })
    }
    s.effecten.push(f)
    ev(s, 'super', { kant: k, e: z.e })
    return true
  }
  function houding(s, houd) { s.zij[0].houd = !!houd }

  // ── de slag ──
  function raak(s, doel, schade, vanKant) {
    if (doel === 'basis') {
      var b = s.zij[1 - vanKant].basis
      b.hp = Math.max(0, b.hp - schade)
      ev(s, 'basis', { kant: 1 - vanKant, schade: schade })
    } else if (doel.hp > 0) {
      doel.hp -= schade; doel.flits = 0.12
      ev(s, 'raak', { kant: doel.kant, x: doel.x, id: doel.id, schade: schade })
    }
  }
  function zoekEenheid(s, id) { for (var i = 0; i < s.eenheden.length; i++) if (s.eenheden[i].id === id) return s.eenheden[i]; return null }

  function trainen(s, k, dt) {
    var z = s.zij[k]
    if (!z.rij.length) return
    z.trainT -= dt
    if (z.trainT > 0) return
    var r = z.rij[0], E = eenheid(r.e, r.t), dir = richting(k), x = BASIS[k] + dir * (BASIS_HALF + E.breed / 2 + 4)
    // wacht als de achterste eigen soldaat nog voor de deur staat
    for (var i = 0; i < s.eenheden.length; i++) {
      var u = s.eenheden[i]
      if (u.kant === k && (u.x - x) * dir < (u.S.breed + E.breed) / 2 + 4) return
    }
    z.rij.shift()
    s.eenheden.push({ id: s.id++, kant: k, e: r.e, t: r.t, S: E, x: x, hp: E.hp, cd: 0.3, stun: 0, anim: s.rnd() * 3, slag: 0, flits: 0, staat: 'loop' })
    ev(s, 'nieuw', { kant: k, t: r.t, e: r.e })
    if (z.rij.length) z.trainT = eenheid(z.rij[0].e, z.rij[0].t).train
  }

  function beweeg(s, dt) {
    var lijsten = [[], []]
    s.eenheden.forEach(function (u) { lijsten[u.kant].push(u) })
    lijsten[0].sort(function (a, b) { return b.x - a.x }); lijsten[1].sort(function (a, b) { return a.x - b.x })
    for (var k = 0; k < 2; k++) {
      var dir = richting(k), mijn = lijsten[k], voorste = lijsten[1 - k][0] || null, z = s.zij[k]
      var basisVoor = BASIS[1 - k] - dir * BASIS_HALF
      for (var i = 0; i < mijn.length; i++) {
        var u = mijn[i], S = u.S, p = u.x * dir
        u.anim += dt; u.slag = Math.max(0, u.slag - dt); u.flits = Math.max(0, u.flits - dt); u.cd = Math.max(0, u.cd - dt)
        if (u.stun > 0) { u.stun -= dt; u.staat = 'stun'; u.opBasis = false; continue }
        var doel = null, gat = 0
        if (voorste) { gat = (voorste.x - u.x) * dir - (voorste.S.breed + S.breed) / 2; if (gat <= S.bereik) doel = voorste }
        if (!doel) { gat = basisVoor * dir - p - S.breed / 2; if (gat <= S.bereik) doel = 'basis' }
        u.opBasis = doel === 'basis'
        if (doel) {
          u.staat = 'vecht'
          if (u.cd <= 0) aanval(s, u, doel, Math.max(0, gat))
          continue
        }
        var max = p + S.snel * dt
        // bij de vijandelijke basis dringen ze naast elkaar, zodat iedereen kan slaan
        if (i > 0 && !mijn[i - 1].opBasis) max = Math.min(max, mijn[i - 1].x * dir - (mijn[i - 1].S.breed + S.breed) / 2 - 6)
        if (voorste) max = Math.min(max, voorste.x * dir - (voorste.S.breed + S.breed) / 2)
        max = Math.min(max, basisVoor * dir - S.breed / 2)
        if (k === 0 && z.houd) max = Math.min(max, HOUD_X)
        if (max > p + 1e-6) { u.x = max * dir; u.staat = 'loop' } else u.staat = 'wacht'
      }
    }
  }
  function aanval(s, u, doel, afstand) {
    var dir = richting(u.kant), schade = u.S.schade * s.zij[u.kant].m.kracht
    u.cd = u.S.tempo; u.slag = 0.3
    if (u.t === 1) {
      var doelX = doel === 'basis' ? BASIS[1 - u.kant] : doel.x
      s.kogels.push({ kant: u.kant, e: u.e, bron: 'eenheid', x0: u.x + dir * u.S.breed / 2, doelX: doelX, t: 0, duur: Math.max(0.12, Math.min(0.5, afstand / 650)),
        doel: doel === 'basis' ? 'basis' : doel.id, schade: schade })
      ev(s, 'schot', { kant: u.kant, e: u.e, x: u.x })
    } else {
      raak(s, doel, schade, u.kant)
      ev(s, 'slag', { kant: u.kant, e: u.e, t: u.t, x: u.x })
    }
  }

  function torens(s, k, dt) {
    var z = s.zij[k], dir = richting(k)
    z.torens.forEach(function (tw, plek) {
      if (!tw) return
      tw.cd -= dt
      if (tw.cd > 0) return
      var T = torenInfo(tw.e), doel = null, best = Infinity
      s.eenheden.forEach(function (u) {
        var d = (u.x - BASIS[k]) * dir
        if (u.kant !== k && d <= T.bereik && d < best) { best = d; doel = u }
      })
      if (!doel) return
      tw.cd = T.tempo; tw.mik = doel.x
      s.kogels.push({ kant: k, e: tw.e, bron: 'toren', plek: plek, x0: BASIS[k], doelX: doel.x, t: 0, duur: Math.max(0.2, best / 900), doel: doel.id, schade: T.schade * z.m.toren })
      ev(s, 'torenschot', { kant: k, e: tw.e, plek: plek })
    })
  }

  function kogels(s, dt) {
    s.kogels = s.kogels.filter(function (b) {
      b.t += dt
      if (b.doel !== 'basis') { var u = zoekEenheid(s, b.doel); if (u) b.doelX = u.x }
      if (b.t < b.duur) return true
      var d = b.doel === 'basis' ? 'basis' : zoekEenheid(s, b.doel)
      if (d) raak(s, d, b.schade, b.kant)
      return false
    })
  }

  function effecten(s, dt) {
    s.effecten = s.effecten.filter(function (f) {
      var dir = richting(f.kant)
      f.t += dt
      if (f.soort === 'mega') {
        // valt 1,2 s na het afvuren in: 20% van de basis en een klap voor wie ervoor staat
        if (f.t < 1.2) return true
        var b = s.zij[1 - f.kant].basis
        raak(s, 'basis', b.max * 0.2, f.kant)
        s.eenheden.forEach(function (u) { if (u.kant !== f.kant && Math.abs(u.x - f.x) < 320) raak(s, u, 40 * M[u.e], f.kant) })
        ev(s, 'knal', { kant: f.kant, x: f.x, e: f.e, mega: true })
        return false
      }
      if (f.soort === 'veeg') {
        f.x += dir * f.snel * dt
        s.eenheden.forEach(function (u) {
          if (u.kant === f.kant || f.geraakt[u.id] || (u.x - f.x) * dir > 0) return
          f.geraakt[u.id] = true
          raak(s, u, f.schade, f.kant)
          if (f.stun) u.stun = Math.max(u.stun, f.stun)
        })
        return f.x * dir < BASIS[1 - f.kant] * dir
      }
      f.vallen.forEach(function (v) {
        if (v.klaar || f.t < v.t) return
        v.klaar = true
        ev(s, 'knal', { kant: f.kant, x: v.x, e: f.e })
        s.eenheden.forEach(function (u) { if (u.kant !== f.kant && Math.abs(u.x - v.x) < f.r) raak(s, u, f.schade, f.kant) })
      })
      return f.vallen.some(function (v) { return !v.klaar })
    })
  }

  function opruimen(s) {
    s.eenheden = s.eenheden.filter(function (u) {
      if (u.hp > 0) return true
      var z = s.zij[1 - u.kant]
      z.goud += u.S.prijs * 0.25 * z.m.inkomen
      z.xp += u.S.prijs * z.m.xp
      z.gedood++
      ev(s, 'dood', { kant: u.kant, x: u.x, e: u.e, t: u.t, id: u.id })
      return false
    })
  }

  // ── de computer ──
  function ai(s, dt) {
    s.aiT -= dt
    if (s.aiT > 0) return
    s.aiT = 0.5
    var z = s.zij[1], a = s.def.ai, r = s.rnd
    if (kanEvolueren(s, 1)) evolueer(s, 1)
    if (kanMegabom(s, 1)) megabom(s, 1)
    var vijanden = s.eenheden.filter(function (u) { return u.kant === 0 })
    if (z.lading >= 1 && vijanden.length) {
      var dichtbij = vijanden.filter(function (u) { return u.x > 750 }).length
      if (dichtbij >= 4 || vijanden.length >= 7 || z.basis.hp < z.basis.max * 0.4) superAanval(s, 1)
    }
    var T = torenInfo(z.e)
    if (r() < a.slim * 0.4 && z.goud > T.prijs * 1.5) {
      if (torenPlek(z) >= 0) toren(s, 1)
      else if (plekPrijs(z) != null && z.goud > plekPrijs(z) + T.prijs * 1.5) plek(s, 1)
    }
    if (z.rij.length >= 2) return
    // een slimme computer spaart voor wat hij wil; een domme koopt meteen wat goedkoops
    if (s.aiPlan == null) {
      var zwaar = vijanden.filter(function (u) { return u.t === 2 }).length, x = r()
      s.aiPlan = x < 0.4 - zwaar * 0.04 ? 0 : x < 0.8 ? 1 : 2
    }
    if (koop(s, 1, s.aiPlan)) s.aiPlan = null
    else if (r() > a.slim) koop(s, 1, 0)
  }

  function tik(s) {
    var dt = STAP
    s.t += dt
    for (var k = 0; k < 2; k++) {
      var z = s.zij[k]
      z.goud += inkomen(z) * dt * (k ? moeheid(s) : 1)
      z.lading = Math.min(1, z.lading + dt * z.m.laad / SUPER_LAAD)
      trainen(s, k, dt)
      torens(s, k, dt)
    }
    ai(s, dt)
    beweeg(s, dt)
    kogels(s, dt)
    effecten(s, dt)
    opruimen(s)
    for (k = 0; k < 2; k++) {
      if (s.zij[k].basis.hp <= 0) { s.fase = 'klaar'; s.uitslag = k ? 'gewonnen' : 'verloren'; ev(s, 'klaar', { uitslag: s.uitslag }); return }
    }
  }
  function stap(s, dt) {
    s.acc = Math.min(s.acc + dt, 0.5)
    while (s.acc >= STAP && s.fase === 'spel') { tik(s); s.acc -= STAP }
    var e = s.events; s.events = []
    return e
  }

  function sterren(s) {
    if (s.uitslag !== 'gewonnen') return 0
    var r = s.zij[0].basis.hp / s.zij[0].basis.max
    return r >= 0.6 ? 3 : r >= 0.3 ? 2 : 1
  }
  function beloning(s) {
    if (s.uitslag === 'gewonnen') return 40 + 10 * s.L + 15 * sterren(s)
    return 10 + 3 * s.L + Math.min(30, s.zij[0].gedood)
  }

  return {
    B: B, BASIS: BASIS, BASIS_HALF: BASIS_HALF, HOUD_X: HOUD_X, STAP: STAP, M: M, MAX_RIJ: MAX_RIJ, SUPER_LAAD: SUPER_LAAD,
    TIJDPERKEN: TIJDPERKEN, SOORTEN: SOORTEN, SUPERS: SUPERS, UPGRADES: UPGRADES, LEVELS: LEVELS,
    rng: rng, eenheid: eenheid, torenInfo: torenInfo, xpNodig: xpNodig, plekPrijs: plekPrijs, torenPlek: torenPlek, inkomen: inkomen,
    nieuw: nieuw, stap: stap, koop: koop, kanEvolueren: kanEvolueren, evolueer: evolueer, kanMegabom: kanMegabom, megabom: megabom, megaNodig: megaNodig, toren: toren, plek: plek,
    superAanval: superAanval, houding: houding, sterren: sterren, beloning: beloning,
  }
})()
