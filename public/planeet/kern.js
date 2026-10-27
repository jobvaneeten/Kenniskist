// Planetenbouwer — spelregels en getallen, zonder scherm. Ook geladen door
// tools/planeetTest.js (node vm), dus geen DOM hier.
//
// Je verzamelt sterrenstof door op je planeet te tikken en door wat je bouwt.
// Er zijn 8 tijdperken met elk 3 dingen om te bouwen. Heb je genoeg dingen uit
// het huidige tijdperk, dan maak je een tijdsprong: het volgende tijdperk gaat
// open en alles levert vanaf dan meer op.
var PL = (function () {
  'use strict'

  var TIJDPERKEN = [
    { id: 'rots',    naam: 'Jonge planeet', zin: 'Een kale, gloeiende rots in de ruimte.' },
    { id: 'water',   naam: 'Oceanen',       zin: 'Er komt water op je planeet.' },
    { id: 'planten', naam: 'Planten',       zin: 'Je planeet wordt groen.' },
    { id: 'dieren',  naam: 'Dieren',        zin: 'Er komt leven in het water, op het land en in de lucht.' },
    { id: 'dorpen',  naam: 'Dorpen',        zin: 'De eerste bewoners bouwen hutten en molens.' },
    { id: 'steden',  naam: 'Steden',        zin: 'Lichtjes op de nachtkant: je planeet wordt een stad.' },
    { id: 'ruimte',  naam: 'Ruimtevaart',   zin: 'Raketten, satellieten en een ruimtestation.' },
    { id: 'kosmos',  naam: 'Kosmos',        zin: 'Manen, ringen en een poort naar de sterren.' },
  ]

  var LIJST = [
    ['vulkaan', 'Vulkaan', 'Spuwt gloeiend sterrenstof'],
    ['kristal', 'Kristallen', 'Glinsterende stenen in de rots'],
    ['wolk', 'Wolken', 'Damp rond je planeet'],
    ['meer', 'Meren', 'Kleine plassen water'],
    ['zee', 'Zeeën', 'Grote blauwe oceanen'],
    ['ijs', 'IJskappen', 'Wit ijs op de polen'],
    ['gras', 'Gras', 'Het land wordt groen'],
    ['bloem', 'Bloemen', 'Kleurige vlekjes overal'],
    ['boom', 'Bossen', 'Bomen op elk stukje land'],
    ['vis', 'Vissen', 'Leven in de zee'],
    ['vogel', 'Vogels', 'Zwermen in de lucht'],
    ['dier', 'Grazers', 'Kuddes op het land'],
    ['hut', 'Hutten', 'De eerste huisjes'],
    ['molen', 'Molens', 'Wieken die draaien'],
    ['kasteel', 'Kastelen', 'Torens met vlaggen'],
    ['flat', 'Flats', 'Blokken vol lichtjes'],
    ['toren', 'Wolkenkrabbers', 'Neon tot in de wolken'],
    ['zon', 'Zonneparken', 'Stroom uit zonlicht'],
    ['satelliet', 'Satellieten', 'Draaien rondjes om je planeet'],
    ['raket', 'Raketten', 'Schieten de ruimte in'],
    ['station', 'Ruimtestations', 'Een basis in een baan'],
    ['maan', 'Manen', 'Draaien om je planeet heen'],
    ['ring', 'Ringen', 'Stof en ijs in een cirkel'],
    ['poort', 'Sterrenpoorten', 'Een poort naar andere sterren'],
  ]

  // Prijs en opbrengst: het tweede tijdperk is 40 keer zo duur als het eerste,
  // en die sprong wordt per tijdperk groter (STAP_EXTRA). Binnen een tijdperk
  // is elk ding 6 keer zo duur. Duurdere dingen
  // verdienen zich iets langzamer terug, zodat goedkope dingen bijkopen zin
  // blijft houden.
  var STAP_TIJDPERK = 40, STAP_EXTRA = 25, STAP_DING = 6, GROEI = 1.15
  var TERUG_BASIS = 25, TERUG_GROEI = 1.24
  var ITEMS = LIJST.map(function (r, n) {
    var t = Math.floor(n / 3), k = n % 3
    var basis = 10
    for (var i = 0; i < t; i++) basis *= STAP_TIJDPERK + STAP_EXTRA * i
    var prijs = basis * Math.pow(STAP_DING, k)
    var terug = TERUG_BASIS * Math.pow(TERUG_GROEI, n)   // seconden om zichzelf terug te verdienen (zonder bonus)
    return { id: r[0], naam: r[1], zin: r[2], t: t, nr: n, prijs: prijs, inkomen: prijs / terug }
  })
  var PER_ID = {}
  ITEMS.forEach(function (it) { PER_ID[it.id] = it })

  var SPRONG_DINGEN = 6         // zoveel dingen uit het eerste tijdperk voor een tijdsprong (daarna 2 meer per tijdperk)
  var BONUS_TIJDPERK = 1.4      // elk tijdperk: alles levert zoveel keer meer op
  var MAX_WEG = 3600            // zoveel seconden weg-tijd telt mee (1 uur)
  var WEG_DEEL = 0.25            // en daarvan de helft
  var TIK_DEEL = 0.08           // een tik levert zoveel keer het inkomen per seconde op
  var SPRONG_FACTOR = 1         // tijdsprong kost zoveel keer het eerste ding van het nieuwe tijdperk

  function nieuw() {
    var aantal = {}
    ITEMS.forEach(function (it) { aantal[it.id] = 0 })
    return { stof: 0, totaal: 0, tijdperk: 0, aantal: aantal, tikken: 0, kometen: 0 }
  }

  // Een oude of halve opslag aanvullen, zodat er nooit NaN ontstaat.
  function herstel(d) {
    var s = nieuw()
    if (!d || typeof d !== 'object') return s
    s.stof = getal(d.stof); s.totaal = getal(d.totaal)
    s.tijdperk = Math.max(0, Math.min(TIJDPERKEN.length - 1, Math.floor(getal(d.tijdperk))))
    s.tikken = getal(d.tikken); s.kometen = getal(d.kometen)
    ITEMS.forEach(function (it) { s.aantal[it.id] = Math.max(0, Math.floor(getal(d.aantal && d.aantal[it.id]))) })
    return s
  }
  function getal(x) { x = Number(x); return isFinite(x) && x > 0 ? x : 0 }

  function prijs(s, id, n) {
    var it = PER_ID[id], a = s.aantal[id]
    n = n || 1
    // som van een meetkundige reeks: p·g^a·(g^n − 1)/(g − 1)
    return it.prijs * Math.pow(GROEI, a) * (Math.pow(GROEI, n) - 1) / (GROEI - 1)
  }
  function maxKoop(s, id) {
    var it = PER_ID[id], basis = it.prijs * Math.pow(GROEI, s.aantal[id])
    if (s.stof < basis) return 0
    return Math.floor(Math.log(s.stof * (GROEI - 1) / basis + 1) / Math.log(GROEI))
  }
  function open(s, id) { return PER_ID[id].t <= s.tijdperk }
  function koop(s, id, n) {
    n = n || 1
    if (!open(s, id) || n < 1) return false
    var p = prijs(s, id, n)
    if (s.stof < p) return false
    s.stof -= p; s.aantal[id] += n
    return true
  }

  function bonus(s) { return Math.pow(BONUS_TIJDPERK, s.tijdperk) }
  function inkomenVan(s, id) { return PER_ID[id].inkomen * s.aantal[id] * bonus(s) }
  function inkomen(s) {
    var som = 0
    ITEMS.forEach(function (it) { som += it.inkomen * s.aantal[it.id] })
    return som * bonus(s)
  }
  // Een tik is altijd minstens 1, en groeit mee met wat je planeet verdient.
  function tikWaarde(s) { return Math.max(1, inkomen(s) * TIK_DEEL) }
  function tik(s) { var w = tikWaarde(s); s.stof += w; s.totaal += w; s.tikken++; return w }

  function stap(s, dt) { var w = inkomen(s) * dt; s.stof += w; s.totaal += w }

  function sprongInfo(s) {
    var t = s.tijdperk
    if (t >= TIJDPERKEN.length - 1) return null
    var heeft = 0
    ITEMS.forEach(function (it) { if (it.t === t) heeft += s.aantal[it.id] })
    // De eerste sprongen zijn klein, latere vragen meer.
    var nodig = SPRONG_DINGEN + 2 * t
    var kost = ITEMS[(t + 1) * 3].prijs * (SPRONG_FACTOR + t)
    return { naar: TIJDPERKEN[t + 1], nodig: nodig, heeft: heeft, prijs: kost,
      kan: heeft >= nodig && s.stof >= kost }
  }
  function sprong(s) {
    var info = sprongInfo(s)
    if (!info || !info.kan) return false
    s.stof -= info.prijs; s.tijdperk++
    return true
  }

  // Wat je planeet verdiende terwijl je weg was (maximaal een uur, de helft).
  function weg(s, seconden) {
    var t = Math.min(MAX_WEG, Math.max(0, seconden || 0))
    var w = inkomen(s) * t * WEG_DEEL
    s.stof += w; s.totaal += w
    return w
  }

  function komeetBonus(s) { return Math.max(25, inkomen(s) * 30) }

  // 1234 → "1234", 12345 → "12,3K", 3,4 miljoen → "3,4M" enz.
  var EENHEDEN = ['K', 'M', 'Mld', 'Bln', 'Bld', 'Tln', 'Tld']
  function kort(x) {
    if (!isFinite(x)) return '0'
    if (x < 10) return (Math.floor(x * 10) / 10).toString().replace('.', ',')
    if (x < 10000) return String(Math.floor(x))
    var e = -1
    while (x >= 1000 && e < EENHEDEN.length - 1) { x /= 1000; e++ }
    var t = x < 10 ? Math.floor(x * 100) / 100 : x < 100 ? Math.floor(x * 10) / 10 : Math.floor(x)
    return String(t).replace('.', ',') + EENHEDEN[e]
  }

  return {
    TIJDPERKEN: TIJDPERKEN, ITEMS: ITEMS, PER_ID: PER_ID, SPRONG_DINGEN: SPRONG_DINGEN, MAX_WEG: MAX_WEG,
    nieuw: nieuw, herstel: herstel, prijs: prijs, maxKoop: maxKoop, open: open, koop: koop,
    bonus: bonus, inkomen: inkomen, inkomenVan: inkomenVan, tikWaarde: tikWaarde, tik: tik, stap: stap,
    sprongInfo: sprongInfo, sprong: sprong, weg: weg, komeetBonus: komeetBonus, kort: kort,
  }
})()
if (typeof globalThis !== 'undefined') globalThis.PL = PL
