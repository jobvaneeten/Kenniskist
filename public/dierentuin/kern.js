// Dierentuinbaas — spelregels, kaart en getallen, zonder scherm. Ook geladen
// door tools/dierentuinTest.js (node vm), dus geen DOM hier.
//
// De dierentuin is een raster. Je legt paden vanaf de ingang en bouwt zelf
// hokken: je zet een hek neer (elke maat), kiest de bodem en richt het in met
// een badje, een binnenverblijf, een afdak, bomen, rotsen enzovoort. Elk dier
// heeft wensen; hoe meer wensen kloppen, hoe blijer het is en hoe meer
// bezoekers het trekt. Een hok telt alleen mee als er een pad langs loopt dat
// met de ingang verbonden is.
//
// Je speelt levels: elk level heeft een paar doelen (zoveel bezoekers, zoveel
// hokken, blije dieren...). Haal je ze allemaal, dan krijg je een beloning en
// komen er nieuwe dieren en spullen vrij.
var DT = (function () {
  'use strict'

  var BREED = 36, HOOG = 26
  var INGANG = { x: 17, y: 25 }
  // stukken grond: steeds groter, onderaan in het midden verankerd
  var GROND = [
    { w: 12, h: 9, prijs: 0 },
    { w: 16, h: 11, prijs: 800 },
    { w: 20, h: 13, prijs: 5000 },
    { w: 24, h: 16, prijs: 20000 },
    { w: 28, h: 19, prijs: 60000 },
    { w: 32, h: 22, prijs: 150000 },
    { w: 36, h: 26, prijs: 350000 },
  ]

  var HEK_PRIJS = 4          // per stukje hek (de omtrek)
  var MIN_HOK = 2, MAX_HOK = 10

  var BODEMS = {
    gras:   { naam: 'Gras',      prijs: 0, niveau: 1 },
    zand:   { naam: 'Zand',      prijs: 2, niveau: 2 },
    sneeuw: { naam: 'Sneeuw',    prijs: 4, niveau: 3 },
    bos:    { naam: 'Bosgrond',  prijs: 3, niveau: 4 },
  }

  // inrichting in een hok, elk één vakje
  var INRICHTING = {
    voerbak: { naam: 'Voerbak',        prijs: 10, niveau: 1, zin: 'Hooi en groente' },
    binnen:  { naam: 'Binnenverblijf', prijs: 60, niveau: 1, zin: 'Warm en droog slapen' },
    boom:    { naam: 'Boom',           prijs: 12, niveau: 1, zin: 'Schaduw, klimmen en blaadjes' },
    water:   { naam: 'Badje',          prijs: 15, niveau: 2, zin: 'Zwemmen en drinken' },
    rots:    { naam: 'Rots',           prijs: 14, niveau: 1, zin: 'Klimmen en uitkijken' },
    afdak:   { naam: 'Afdak',          prijs: 35, niveau: 3, zin: 'Overdekking tegen zon en regen' },
    klimrek: { naam: 'Klimrek',        prijs: 45, niveau: 4, zin: 'Touwen en planken' },
    bamboe:  { naam: 'Bamboe',         prijs: 25, niveau: 10, zin: 'Lekker eten voor panda\'s' },
  }

  // wensen: { bodem: [...] } of { item: [...], aantal } of { vriend } of { alleen }
  var DIEREN = {
    konijn:    { naam: 'Konijn',    prijs: 20,    trek: 1,   ruimte: 2,  wil: [{ bodem: ['gras'] }, { item: ['binnen'] }, { item: ['voerbak'] }, { vriend: 1 }] },
    geit:      { naam: 'Geit',      prijs: 35,    trek: 1.5, ruimte: 3,  wil: [{ bodem: ['gras'] }, { item: ['rots', 'klimrek'] }, { item: ['binnen'] }, { vriend: 1 }] },
    flamingo:  { naam: 'Flamingo',  prijs: 60,    trek: 2.5, ruimte: 2,  wil: [{ bodem: ['zand', 'gras'] }, { item: ['water'], aantal: 2 }, { vriend: 1 }] },
    pinguin:   { naam: 'Pinguïn',   prijs: 90,    trek: 3.5, ruimte: 2,  wil: [{ bodem: ['sneeuw'] }, { item: ['water'], aantal: 2 }, { vriend: 1 }] },
    aap:       { naam: 'Aap',       prijs: 150,   trek: 5,   ruimte: 3,  wil: [{ bodem: ['bos'] }, { item: ['klimrek', 'boom'] }, { item: ['binnen'] }, { vriend: 1 }] },
    zebra:     { naam: 'Zebra',     prijs: 250,   trek: 7,   ruimte: 4,  wil: [{ bodem: ['zand'] }, { item: ['afdak', 'boom'] }, { item: ['voerbak'] }, { vriend: 1 }] },
    zeehond:   { naam: 'Zeehond',   prijs: 800,   trek: 9,   ruimte: 3,  wil: [{ bodem: ['zand', 'sneeuw'] }, { item: ['water'], aantal: 3 }, { vriend: 1 }] },
    kangoeroe: { naam: 'Kangoeroe', prijs: 1500,  trek: 11,  ruimte: 4,  wil: [{ bodem: ['zand'] }, { item: ['afdak', 'boom'] }, { item: ['rots'] }, { vriend: 1 }] },
    giraf:     { naam: 'Giraf',     prijs: 3000,  trek: 15,  ruimte: 6,  wil: [{ bodem: ['zand'] }, { item: ['boom'], aantal: 2 }, { item: ['binnen'] }, { vriend: 1 }] },
    krokodil:  { naam: 'Krokodil',  prijs: 5000,  trek: 18,  ruimte: 5,  wil: [{ bodem: ['bos', 'zand'] }, { item: ['water'], aantal: 3 }, { alleen: 1 }] },
    leeuw:     { naam: 'Leeuw',     prijs: 9000,  trek: 24,  ruimte: 6, wil: [{ bodem: ['zand'] }, { item: ['afdak', 'boom'] }, { item: ['rots'] }, { vriend: 1 }] },
    ijsbeer:   { naam: 'IJsbeer',   prijs: 15000, trek: 30,  ruimte: 8, wil: [{ bodem: ['sneeuw'] }, { item: ['water'], aantal: 2 }, { item: ['rots'] }, { alleen: 1 }] },
    olifant:   { naam: 'Olifant',   prijs: 25000, trek: 40,  ruimte: 8, wil: [{ bodem: ['zand'] }, { item: ['water'], aantal: 2 }, { item: ['binnen'] }, { vriend: 1 }] },
    panda:     { naam: 'Panda',     prijs: 40000, trek: 55,  ruimte: 6, wil: [{ bodem: ['bos'] }, { item: ['bamboe'], aantal: 2 }, { item: ['klimrek', 'boom'] }, { alleen: 1 }] },
    eend:        { naam: 'Eend',        prijs: 25,    trek: 1.2, ruimte: 1, wil: [{ bodem: ['gras', 'sneeuw', 'bos'] }, { item: ['water'], aantal: 2 }, { vriend: 1 }] },
    schaap:      { naam: 'Schaap',      prijs: 45,    trek: 1.8, ruimte: 3, wil: [{ bodem: ['gras', 'sneeuw'] }, { item: ['binnen'] }, { item: ['voerbak'] }, { vriend: 1 }] },
    varken:      { naam: 'Varken',      prijs: 70,    trek: 2.6, ruimte: 3, wil: [{ bodem: ['gras'] }, { item: ['water'] }, { item: ['voerbak'] }, { vriend: 1 }] },
    hert:        { naam: 'Hert',        prijs: 200,   trek: 6,   ruimte: 4, wil: [{ bodem: ['gras', 'bos'] }, { item: ['boom'] }, { item: ['voerbak'] }, { vriend: 1 }] },
    vos:         { naam: 'Vos',         prijs: 350,   trek: 7.5, ruimte: 3, wil: [{ bodem: ['bos', 'gras'] }, { item: ['rots', 'boom'] }, { item: ['binnen'] }, { alleen: 1 }] },
    stokstaartje:{ naam: 'Stokstaartje',prijs: 40,    trek: 1.6, ruimte: 1, wil: [{ bodem: ['zand'] }, { item: ['rots'] }, { item: ['binnen'] }, { vriend: 1 }] },
    fennek:      { naam: 'Fennek',      prijs: 120,   trek: 4,   ruimte: 2, wil: [{ bodem: ['zand'] }, { item: ['rots'] }, { item: ['binnen'] }, { vriend: 1 }] },
    struisvogel: { naam: 'Struisvogel', prijs: 180,   trek: 5.5, ruimte: 3, wil: [{ bodem: ['zand'] }, { item: ['voerbak'] }, { vriend: 1 }] },
    kameel:      { naam: 'Kameel',      prijs: 400,   trek: 8,   ruimte: 5, wil: [{ bodem: ['zand'] }, { item: ['voerbak'] }, { item: ['afdak', 'boom'] }, { vriend: 1 }] },
    schildpad:   { naam: 'Schildpad',   prijs: 2000,  trek: 13,  ruimte: 2, wil: [{ bodem: ['zand', 'bos'] }, { item: ['water'] }, { item: ['voerbak'] }, { vriend: 1 }] },
    nijlpaard:   { naam: 'Nijlpaard',   prijs: 12000, trek: 28,  ruimte: 8, wil: [{ bodem: ['zand', 'bos'] }, { item: ['water'], aantal: 3 }, { vriend: 1 }] },
    poolvos:     { naam: 'Poolvos',     prijs: 110,   trek: 4,   ruimte: 2, wil: [{ bodem: ['sneeuw'] }, { item: ['rots'] }, { item: ['binnen'] }, { alleen: 1 }] },
    rendier:     { naam: 'Rendier',     prijs: 300,   trek: 7,   ruimte: 4, wil: [{ bodem: ['sneeuw'] }, { item: ['voerbak'] }, { item: ['binnen'] }, { vriend: 1 }] },
    walrus:      { naam: 'Walrus',      prijs: 6000,  trek: 21,  ruimte: 6, wil: [{ bodem: ['sneeuw'] }, { item: ['water'], aantal: 3 }, { item: ['rots'] }, { vriend: 1 }] },
    mammoet:     { naam: 'Mammoet',     prijs: 50000, trek: 60,  ruimte: 9, wil: [{ bodem: ['sneeuw'] }, { item: ['voerbak'] }, { item: ['binnen'] }, { vriend: 1 }] },
    papegaai:    { naam: 'Papegaai',    prijs: 50,    trek: 2,   ruimte: 1, wil: [{ bodem: ['bos'] }, { item: ['boom'], aantal: 2 }, { vriend: 1 }] },
    tijger:      { naam: 'Tijger',      prijs: 9000,  trek: 25,  ruimte: 6, wil: [{ bodem: ['bos'] }, { item: ['water'] }, { item: ['rots'] }, { alleen: 1 }] },
  }
  // in welke volgorde de dieren per wereld vrijkomen (plek in de lijst → level)
  var ORDE_LEVEL = [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
  var DIEREN_PER_WERELD = {
    vallei:   ['konijn', 'geit', 'eend', 'schaap', 'varken', 'flamingo', 'hert', 'vos', 'pinguin', 'aap', 'zebra', 'giraf', 'leeuw', 'olifant'],
    woestijn: ['stokstaartje', 'geit', 'fennek', 'flamingo', 'struisvogel', 'kameel', 'zebra', 'kangoeroe', 'schildpad', 'giraf', 'krokodil', 'leeuw', 'nijlpaard', 'olifant'],
    ijs:      ['konijn', 'eend', 'pinguin', 'poolvos', 'schaap', 'geit', 'rendier', 'zeehond', 'hert', 'vos', 'walrus', 'ijsbeer', 'panda', 'mammoet'],
    tropisch: ['papegaai', 'eend', 'schildpad', 'flamingo', 'aap', 'kangoeroe', 'zebra', 'krokodil', 'giraf', 'tijger', 'nijlpaard', 'leeuw', 'panda', 'olifant'],
  }

  // losse dingen buiten de hokken, elk één vakje
  var OBJECTEN = {
    boom:      { naam: 'Boom',       prijs: 8,   niveau: 1, trek: 0.4, zin: 'Groen en schaduw' },
    bloemen:   { naam: 'Bloemen',    prijs: 5,   niveau: 1, trek: 0.3, zin: 'Kleur langs het pad' },
    bank:      { naam: 'Bankje',     prijs: 15,  niveau: 2, trek: 0.6, zin: 'Even zitten en kijken' },
    ijskraam:  { naam: 'IJskraam',   prijs: 80,  niveau: 2, kraam: 2,  zin: 'Bezoekers kopen een ijsje' },
    lantaarn:  { naam: 'Lantaarn',   prijs: 25,  niveau: 3, trek: 0.8, zin: 'Licht in de nacht' },
    snackbar:  { naam: 'Snackbar',   prijs: 300, niveau: 4, kraam: 5,  zin: 'Patat en limonade' },
    speeltuin: { naam: 'Speeltuin',  prijs: 500, niveau: 6, trek: 4,   zin: 'Klimrek en glijbaan' },
    fontein:   { naam: 'Fontein',    prijs: 900, niveau: 8, trek: 6,   zin: 'Een fontein met lichtjes' },
  }

  // doel: { type, n }. Types: pad, hok, dieren, soorten, blij (hokken met 5
  // hartjes), bezoekers, sterren, versiering, kraam, grond (stukken), inrichting
  var LEVELS = [
    { naam: 'Je eerste hok',        beloning: 100,   doelen: [{ type: 'pad', n: 6 }, { type: 'hok', n: 1 }, { type: 'dieren', n: 2 }] },
    { naam: 'De deuren open',       beloning: 150,   doelen: [{ type: 'bezoekers', n: 25 }, { type: 'blij', n: 1 }] },
    { naam: 'Meer soorten',         beloning: 250,   doelen: [{ type: 'soorten', n: 2 }, { type: 'hok', n: 3 }, { type: 'bezoekers', n: 80 }] },
    { naam: 'Lekker druk',          beloning: 400,   doelen: [{ type: 'soorten', n: 3 }, { type: 'bezoekers', n: 180 }, { type: 'sterren', n: 2 }, { type: 'kraam', n: 1 }] },
    { naam: 'Blije dieren',         beloning: 600,   doelen: [{ type: 'blij', n: 4 }, { type: 'bezoekers', n: 350 }, { type: 'versiering', n: 5 }] },
    { naam: 'Meer ruimte',          beloning: 1000,  doelen: [{ type: 'soorten', n: 5 }, { type: 'bezoekers', n: 600 }, { type: 'grond', n: 2 }] },
    { naam: 'Een echte dierentuin', beloning: 1600,  doelen: [{ type: 'hok', n: 6 }, { type: 'sterren', n: 3 }, { type: 'bezoekers', n: 950 }] },
    { naam: 'Mooi ingericht',       beloning: 2500,  doelen: [{ type: 'soorten', n: 7 }, { type: 'inrichting', n: 25 }, { type: 'bezoekers', n: 1400 }] },
    { naam: 'Groot en groen',       beloning: 4000,  doelen: [{ type: 'hok', n: 8 }, { type: 'dieren', n: 20 }, { type: 'versiering', n: 15 }, { type: 'bezoekers', n: 2000 }] },
    { naam: 'Vier sterren',         beloning: 6000,  doelen: [{ type: 'soorten', n: 9 }, { type: 'sterren', n: 4 }, { type: 'bezoekers', n: 2800 }] },
    { naam: 'Tien hokken',          beloning: 9000,  doelen: [{ type: 'hok', n: 10 }, { type: 'blij', n: 8 }, { type: 'bezoekers', n: 3800 }, { type: 'grond', n: 4 }] },
    { naam: 'Wereldberoemd',        beloning: 14000, doelen: [{ type: 'soorten', n: 11 }, { type: 'bezoekers', n: 5200 }, { type: 'kraam', n: 4 }] },
    { naam: 'Vijf sterren',         beloning: 20000, doelen: [{ type: 'soorten', n: 12 }, { type: 'sterren', n: 5 }, { type: 'bezoekers', n: 7000 }] },
    { naam: 'Alle dieren',          beloning: 30000, doelen: [{ type: 'soorten', n: 14 }, { type: 'bezoekers', n: 9500 }, { type: 'grond', n: 5 }] },
    { naam: 'Topdierentuin',        beloning: 50000, doelen: [{ type: 'hok', n: 16 }, { type: 'blij', n: 14 }, { type: 'dieren', n: 40 }, { type: 'bezoekers', n: 14000 }] },
    { naam: 'Dierentuin van de eeuw', beloning: 0,   doelen: [{ type: 'hok', n: 22 }, { type: 'grond', n: 7 }, { type: 'versiering', n: 60 }, { type: 'bezoekers', n: 25000 }] },
  ]
  var DOEL_TEKST = {
    pad: function (n) { return 'Leg ' + n + ' stukjes pad' },
    hok: function (n) { return 'Bouw ' + n + (n === 1 ? ' hok' : ' hokken') },
    dieren: function (n) { return 'Zorg voor ' + n + ' dieren' },
    soorten: function (n) { return 'Heb ' + n + ' verschillende diersoorten' },
    blij: function (n) { return 'Maak ' + n + (n === 1 ? ' hok' : ' hokken') + ' helemaal blij (5 hartjes)' },
    bezoekers: function (n) { return 'Ontvang ' + n + ' bezoekers' },
    sterren: function (n) { return 'Haal ' + n + ' sterren' },
    versiering: function (n) { return 'Zet ' + n + ' versieringen neer' },
    kraam: function (n) { return 'Open ' + n + (n === 1 ? ' kraampje' : ' kraampjes') },
    grond: function (n) { return 'Koop grond erbij (' + n + ' stukken)' },
    inrichting: function (n) { return 'Zet ' + n + ' dingen in je hokken' },
  }

  // werelden: elk een eigen dierentuin. bodem = de bodem van een nieuw hok, en
  // die is in deze wereld gratis. drukte = hoeveel bezoekers er (extra) komen.
  // open = welk level je in de vorige wereld moet halen.
  var WERELDEN = [
    { id: 'vallei',   naam: 'Groene Vallei',    zin: 'Groene heuvels: hier begint het.',             bodem: 'gras',   drukte: 1,    open: 0 },
    { id: 'woestijn', naam: 'Zonnige Woestijn', zin: 'Warm en droog. Zand is hier gratis.',          bodem: 'zand',   drukte: 1.15, open: 4 },
    { id: 'ijs',      naam: 'IJswereld',        zin: 'Noorderlicht en sneeuw. Sneeuw is gratis.',    bodem: 'sneeuw', drukte: 1.3,  open: 4 },
    { id: 'tropisch', naam: 'Tropisch Eiland',  zin: 'Een eiland in de zee. Bosgrond is gratis.',    bodem: 'bos',    drukte: 1.45, open: 4 },
    { id: 'maan',     naam: 'Maanbasis',        zin: 'Een dierentuin op de maan! Heel veel bezoekers.', bodem: 'gras', drukte: 1.7, open: 4 },
  ]
  var CREATIEF = { id: 'creatief', naam: 'Creatief', zin: 'Oneindig geld en alles is vrij. Bouw wat je wilt!', bodem: 'gras', drukte: 1, creatief: true }
  function wereld(id) { return id === 'creatief' ? CREATIEF : WERELDEN.filter(function (w) { return w.id === id })[0] || WERELDEN[0] }
  var ONEINDIG = 1e12
  // de dieren van een wereld, in volgorde; maan en creatief hebben ze allemaal
  function dierenVan(s) {
    var l = DIEREN_PER_WERELD[s.wereld]
    if (l) return l
    return Object.keys(DIEREN).sort(function (a, b) { return DIEREN[a].trek - DIEREN[b].trek })
  }
  // op welk level een dier in deze wereld vrijkomt (Infinity = niet in deze wereld)
  function dierNiveau(s, soort) {
    var l = dierenVan(s), i = l.indexOf(soort)
    if (i < 0) return Infinity
    if (DIEREN_PER_WERELD[s.wereld]) return ORDE_LEVEL[i]
    return 1 + Math.floor(i * 13 / l.length)
  }

  var PAD_PRIJS = 2, START_GELD = 250, TERUG = 0.5
  var MAX_WEG = 3600, WEG_DEEL = 0.5
  var STER_GRENS = [0, 12, 35, 80, 160, 300]   // aantrekkingskracht voor 1 t/m 5 sterren

  function sleutel(x, y) { return x + ',' + y }
  function nieuw(wereldId) {
    var w = wereld(wereldId)
    var s = { wereld: w.id, geld: START_GELD, verdiend: 0, bezoekers: 0, grond: 0, level: 1, pad: {}, verblijven: [], objecten: [], id: 1, teller: 0 }
    // creatief: alles vrij, alle grond, oneindig geld
    if (w.creatief) { s.geld = ONEINDIG; s.level = LEVELS.length + 1; s.grond = GROND.length - 1 }
    s.pad[sleutel(INGANG.x, INGANG.y)] = 1
    return s
  }
  function getal(x) { x = Number(x); return isFinite(x) && x > 0 ? x : 0 }
  function heel(x) { return Math.floor(Number(x)) }
  function herstel(d, wereldId) {
    var s = nieuw(wereldId)
    if (!d || typeof d !== 'object') return s
    if (wereld(wereldId).creatief) d = Object.assign({}, d, { geld: ONEINDIG, level: LEVELS.length + 1, grond: GROND.length - 1 })
    s.geld = getal(d.geld); s.verdiend = getal(d.verdiend); s.bezoekers = Math.floor(getal(d.bezoekers))
    s.grond = Math.min(GROND.length - 1, Math.floor(getal(d.grond)))
    s.level = Math.max(1, Math.min(LEVELS.length + 1, Math.floor(getal(d.level)) || 1))
    ;(Array.isArray(d.pad) ? d.pad : []).forEach(function (k) { var p = String(k).split(','); if (binnen(s, +p[0], +p[1])) s.pad[sleutel(+p[0], +p[1])] = 1 })
    ;(Array.isArray(d.verblijven) ? d.verblijven : []).forEach(function (v) {
      if (!v) return
      var x = heel(v.x), y = heel(v.y), w = heel(v.w), h = heel(v.h)
      if (!(w >= MIN_HOK && h >= MIN_HOK && w <= MAX_HOK && h <= MAX_HOK) || !gebiedVrij(s, x, y, w, h)) return
      var nv = { id: s.id++, x: x, y: y, w: w, h: h, bodem: BODEMS[v.bodem] ? v.bodem : wereld(s.wereld).bodem, dieren: [], items: [] }
      ;(Array.isArray(v.items) ? v.items : []).forEach(function (it) {
        if (it && INRICHTING[it.soort] && binnenHok(nv, it.x, it.y) && !itemOp(nv, it.x, it.y)) nv.items.push({ soort: it.soort, x: it.x, y: it.y })
      })
      ;(Array.isArray(v.dieren) ? v.dieren : []).forEach(function (dn) {
        if (DIEREN[dn] && dierNiveau(s, dn) !== Infinity && ruimteOver(nv) >= DIEREN[dn].ruimte && (!nv.dieren.length || nv.dieren[0] === dn)) nv.dieren.push(dn)
      })
      s.verblijven.push(nv)
    })
    ;(Array.isArray(d.objecten) ? d.objecten : []).forEach(function (o) { if (o && OBJECTEN[o.soort] && vrij(s, o.x, o.y)) s.objecten.push({ soort: o.soort, x: o.x, y: o.y }) })
    return s
  }
  function bewaarbaar(s) {
    return { geld: s.geld, verdiend: s.verdiend, bezoekers: s.bezoekers, grond: s.grond, level: s.level, pad: Object.keys(s.pad),
      wereld: s.wereld, verblijven: s.verblijven.map(function (v) {
        return { x: v.x, y: v.y, w: v.w, h: v.h, bodem: v.bodem, dieren: v.dieren.slice(), items: v.items.map(function (i) { return { soort: i.soort, x: i.x, y: i.y } }) }
      }),
      objecten: s.objecten.map(function (o) { return { soort: o.soort, x: o.x, y: o.y } }) }
  }

  // ── kaart ──
  function gebied(s, lvl) {
    var g = GROND[lvl == null ? s.grond : lvl], x0 = Math.floor((BREED - g.w) / 2), y0 = HOOG - g.h
    return { x0: x0, y0: y0, x1: x0 + g.w - 1, y1: HOOG - 1 }
  }
  function binnen(s, x, y) { var g = gebied(s); return x >= g.x0 && x <= g.x1 && y >= g.y0 && y <= g.y1 }
  function binnenHok(v, x, y) { return x >= v.x && x < v.x + v.w && y >= v.y && y < v.y + v.h }
  function verblijfOp(s, x, y) { for (var i = 0; i < s.verblijven.length; i++) if (binnenHok(s.verblijven[i], x, y)) return s.verblijven[i]; return null }
  function itemOp(v, x, y) { for (var i = 0; i < v.items.length; i++) if (v.items[i].x === x && v.items[i].y === y) return v.items[i]; return null }
  function objectOp(s, x, y) { for (var i = 0; i < s.objecten.length; i++) if (s.objecten[i].x === x && s.objecten[i].y === y) return s.objecten[i]; return null }
  function vrij(s, x, y) { return binnen(s, x, y) && !s.pad[sleutel(x, y)] && !verblijfOp(s, x, y) && !objectOp(s, x, y) }
  function gebiedVrij(s, x, y, w, h) { for (var i = 0; i < w; i++) for (var j = 0; j < h; j++) if (!vrij(s, x + i, y + j)) return false; return true }

  function ontgrendeld(s, niv) { return niveau(s).nr >= niv }
  function kanPad(s, x, y) { return vrij(s, x, y) && s.geld >= PAD_PRIJS }
  function legPad(s, x, y) { if (!kanPad(s, x, y)) return false; s.geld -= PAD_PRIJS; s.pad[sleutel(x, y)] = 1; return true }

  // ── hokken ──
  function hekPrijs(w, h) { return HEK_PRIJS * 2 * (w + h) }
  // waarom hier geen hok kan, of null
  function waaromNietHok(s, x, y, w, h) {
    if (w < MIN_HOK || h < MIN_HOK) return 'Een hok is minstens ' + MIN_HOK + ' bij ' + MIN_HOK + ' vakjes'
    if (w > MAX_HOK || h > MAX_HOK) return 'Een hok is hoogstens ' + MAX_HOK + ' bij ' + MAX_HOK + ' vakjes'
    if (!gebiedVrij(s, x, y, w, h)) return 'Daar staat al iets, of de grond is nog niet van jou'
    if (s.geld < hekPrijs(w, h)) return 'Te weinig geld voor dit hek'
    return null
  }
  function bouwHok(s, x, y, w, h) {
    if (waaromNietHok(s, x, y, w, h)) return null
    s.geld -= hekPrijs(w, h)
    var v = { id: s.id++, x: x, y: y, w: w, h: h, bodem: wereld(s.wereld).bodem, dieren: [], items: [] }
    s.verblijven.push(v)
    return v
  }
  // de eigen bodem van de wereld is gratis
  function bodemPrijs(s, v, bodem) { return bodem === wereld(s.wereld).bodem ? 0 : v.w * v.h * BODEMS[bodem].prijs }
  function waaromNietBodem(s, v, bodem) {
    var b = BODEMS[bodem]
    if (!b || !v) return 'Kies een hok'
    if (!ontgrendeld(s, b.niveau)) return 'Nog op slot: level ' + b.niveau
    if (v.bodem === bodem) return 'Dit hok heeft al ' + b.naam.toLowerCase()
    if (s.geld < bodemPrijs(s, v, bodem)) return 'Te weinig geld'
    return null
  }
  function zetBodem(s, v, bodem) { if (waaromNietBodem(s, v, bodem)) return false; s.geld -= bodemPrijs(s, v, bodem); v.bodem = bodem; return true }

  // vrije ruimte voor de dieren: de vakjes zonder inrichting, min wat de dieren nodig hebben
  function ruimteOver(v) {
    var r = v.w * v.h - v.items.length
    v.dieren.forEach(function (d) { r -= DIEREN[d].ruimte })
    return r
  }
  function waaromNietItem(s, v, soort, x, y) {
    var it = INRICHTING[soort]
    if (!it) return 'Kies iets om neer te zetten'
    if (!v || !binnenHok(v, x, y)) return 'Dit zet je in een hok'
    if (!ontgrendeld(s, it.niveau)) return 'Nog op slot: level ' + it.niveau
    if (itemOp(v, x, y)) return 'Daar staat al iets'
    if (ruimteOver(v) < 1) return 'Dan hebben de dieren te weinig ruimte'
    if (s.geld < it.prijs) return 'Te weinig geld'
    return null
  }
  function plaatsItem(s, v, soort, x, y) { if (waaromNietItem(s, v, soort, x, y)) return false; s.geld -= INRICHTING[soort].prijs; v.items.push({ soort: soort, x: x, y: y }); return true }
  function telItems(v, soorten) { var n = 0; v.items.forEach(function (i) { if (soorten.indexOf(i.soort) >= 0) n++ }); return n }

  function waaromNietDier(s, v, dier) {
    var d = DIEREN[dier]
    if (!d || !v) return 'Kies een hok'
    var dn = dierNiveau(s, dier)
    if (dn === Infinity) return 'Dit dier woont niet in deze wereld'
    if (!ontgrendeld(s, dn)) return 'Nog op slot: level ' + dn
    if (v.dieren.length && v.dieren[0] !== dier) return 'Er woont al een andere diersoort'
    if (ruimteOver(v) < d.ruimte) return 'Te weinig ruimte: maak het hok groter of haal iets weg'
    if (s.geld < d.prijs) return 'Te weinig geld'
    return null
  }
  function zetDier(s, v, dier) { if (waaromNietDier(s, v, dier)) return false; s.geld -= DIEREN[dier].prijs; v.dieren.push(dier); return true }

  function kanObject(s, soort, x, y) { var o = OBJECTEN[soort]; return !!o && ontgrendeld(s, o.niveau) && s.geld >= o.prijs && vrij(s, x, y) }
  function plaatsObject(s, soort, x, y) { if (!kanObject(s, soort, x, y)) return false; s.geld -= OBJECTEN[soort].prijs; s.objecten.push({ soort: soort, x: x, y: y }); return true }

  // wat slopen op dit vakje zou weghalen: 'pad', 'object', 'item', 'hok' of null
  function wat(s, x, y) {
    if (x === INGANG.x && y === INGANG.y) return null
    if (s.pad[sleutel(x, y)]) return 'pad'
    if (objectOp(s, x, y)) return 'object'
    var v = verblijfOp(s, x, y)
    if (v) return itemOp(v, x, y) ? 'item' : 'hok'
    return null
  }
  // slopen geeft de helft terug; de ingang blijft altijd
  function sloop(s, x, y) {
    var w = wat(s, x, y), terug = 0
    if (w === 'pad') { delete s.pad[sleutel(x, y)]; terug = PAD_PRIJS * TERUG }
    else if (w === 'object') { var o = objectOp(s, x, y); s.objecten.splice(s.objecten.indexOf(o), 1); terug = OBJECTEN[o.soort].prijs * TERUG }
    else if (w === 'item') { var v = verblijfOp(s, x, y), it = itemOp(v, x, y); v.items.splice(v.items.indexOf(it), 1); terug = INRICHTING[it.soort].prijs * TERUG }
    else if (w === 'hok') return sloopHok(s, verblijfOp(s, x, y))
    s.geld += terug
    return terug
  }
  // het hele hok weg, met alles erin
  function sloopHok(s, h) {
    if (!h || s.verblijven.indexOf(h) < 0) return 0
    var som = hekPrijs(h.w, h.h) + bodemPrijs(s, h, h.bodem)
    h.items.forEach(function (i) { som += INRICHTING[i.soort].prijs })
    h.dieren.forEach(function (d) { som += DIEREN[d].prijs })
    s.verblijven.splice(s.verblijven.indexOf(h), 1)
    s.geld += som * TERUG
    return som * TERUG
  }
  function grondInfo(s) { var v = GROND[s.grond + 1]; return v ? { prijs: v.prijs, kan: s.geld >= v.prijs } : null }
  function koopGrond(s) { var i = grondInfo(s); if (!i || !i.kan) return false; s.geld -= i.prijs; s.grond++; return true }

  // ── wat bezoekers kunnen bereiken ──
  var BUREN = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  function verbondenPad(s) {
    var gezien = {}, rij = [[INGANG.x, INGANG.y]]
    gezien[sleutel(INGANG.x, INGANG.y)] = 1
    while (rij.length) {
      var p = rij.shift()
      BUREN.forEach(function (b) {
        var k = sleutel(p[0] + b[0], p[1] + b[1])
        if (s.pad[k] && !gezien[k]) { gezien[k] = 1; rij.push([p[0] + b[0], p[1] + b[1]]) }
      })
    }
    return gezien
  }
  function raaktPad(verbonden, x, y, w, h) {
    for (var i = -1; i <= w; i++) for (var j = -1; j <= h; j++) {
      var rand = i === -1 || j === -1 || i === w || j === h, hoek = (i === -1 || i === w) && (j === -1 || j === h)
      if (rand && !hoek && verbonden[sleutel(x + i, y + j)]) return true
    }
    return false
  }

  // ── wensen van de dieren in een hok ──
  function namen(lijst, tabel) { return lijst.map(function (k) { return tabel[k].naam.toLowerCase() }) }
  function ofLijst(l) { return l.length > 1 ? l.slice(0, -1).join(', ') + ' of ' + l[l.length - 1] : l[0] }
  function wensen(v) {
    if (!v.dieren.length) return []
    var d = DIEREN[v.dieren[0]], uit = []
    d.wil.forEach(function (w) {
      if (w.bodem) uit.push({ type: 'bodem', opties: w.bodem, goed: w.bodem.indexOf(v.bodem) >= 0, t: 'Wil ' + ofLijst(namen(w.bodem, BODEMS)) + ' als bodem' })
      else if (w.item) {
        var n = w.aantal || 1, heeft = telItems(v, w.item)
        uit.push({ type: 'item', opties: w.item, aantal: n, heeft: heeft, goed: heeft >= n,
          t: 'Wil ' + (n > 1 ? n + '× ' : 'een ') + ofLijst(namen(w.item, INRICHTING)) + (n > 1 ? ' (' + Math.min(heeft, n) + '/' + n + ')' : '') })
      } else if (w.vriend) uit.push({ type: 'vriend', goed: v.dieren.length >= 2, t: v.dieren.length >= 2 ? 'Heeft vriendjes' : 'Is alleen en wil een vriendje' })
      else if (w.alleen) uit.push({ type: 'alleen', goed: v.dieren.length === 1, t: v.dieren.length === 1 ? 'Is graag alleen' : 'Wil liever alleen wonen' })
    })
    var ruim = ruimteOver(v) >= v.w * v.h * 0.25
    uit.push({ type: 'ruimte', goed: ruim, t: ruim ? 'Heeft lekker veel ruimte' : 'Het is wat krap' })
    return uit
  }
  function blijheid(s, v) {
    var w = wensen(v)
    if (!w.length) return { waarde: 0, redenen: [], wensen: [] }
    var goed = w.filter(function (x) { return x.goed }).length
    return { waarde: 0.4 + 0.6 * goed / w.length, wensen: w, redenen: w.map(function (x) { return { goed: x.goed, t: x.t } }) }
  }

  // ── aantrekkingskracht, sterren en bezoekers ──
  function stats(s) {
    var verbonden = verbondenPad(s), trek = 0, soorten = {}, kraam = 0, blijSom = 0, n = 0
    s.verblijven.forEach(function (v) {
      v.zichtbaar = raaktPad(verbonden, v.x, v.y, v.w, v.h)
      if (!v.zichtbaar || !v.dieren.length) return
      var b = blijheid(s, v).waarde
      v.dieren.forEach(function (d) { trek += DIEREN[d].trek * (0.3 + b); soorten[d] = 1; blijSom += b; n++ })
    })
    var aantalSoorten = Object.keys(soorten).length
    trek += aantalSoorten * 3
    var decor = 0
    s.objecten.forEach(function (o) {
      var def = OBJECTEN[o.soort]
      o.zichtbaar = raaktPad(verbonden, o.x, o.y, 1, 1)
      if (!o.zichtbaar) return
      if (def.trek) decor += def.trek
      if (def.kraam) kraam += def.kraam
    })
    trek += Math.min(decor, 6 + trek * 0.25)
    var sterren = 0
    for (var i = 0; i < STER_GRENS.length - 1; i++) if (n > 0 && trek >= STER_GRENS[i]) sterren = i + 1
    var perMinuut = n ? (3 + trek * 0.6) * wereld(s.wereld).drukte : 0
    var entree = 3 + sterren
    var kraamPer = Math.min(kraam, 2 + perMinuut / 6)
    return { trek: trek, sterren: sterren, perMinuut: perMinuut, entree: entree, kraam: kraamPer, soorten: aantalSoorten,
      dieren: n, blij: n ? blijSom / n : 0, verbonden: verbonden, geldPerMinuut: perMinuut * (entree + kraamPer) }
  }

  // ── levels ──
  var MAX_NIVEAU = LEVELS.length + 1
  function niveau(s) { return { nr: s.level } }
  function doelWaarde(s, d, st) {
    switch (d.type) {
      case 'pad': return Object.keys(s.pad).length
      case 'hok': return s.verblijven.length
      case 'dieren': return s.verblijven.reduce(function (n, v) { return n + v.dieren.length }, 0)
      case 'soorten': var so = {}; s.verblijven.forEach(function (v) { if (v.dieren.length) so[v.dieren[0]] = 1 }); return Object.keys(so).length
      case 'blij': return s.verblijven.filter(function (v) { return v.dieren.length && blijheid(s, v).waarde > 0.999 }).length
      case 'bezoekers': return s.bezoekers
      case 'sterren': return (st || stats(s)).sterren
      case 'versiering': return s.objecten.filter(function (o) { return !OBJECTEN[o.soort].kraam }).length
      case 'kraam': return s.objecten.filter(function (o) { return OBJECTEN[o.soort].kraam }).length
      case 'grond': return s.grond + 1
      case 'inrichting': return s.verblijven.reduce(function (n, v) { return n + v.items.length }, 0)
    }
    return 0
  }
  // level LEVELS.length + 1 = alles gehaald
  function levelInfo(s, st) {
    if (s.level > LEVELS.length) return { nr: s.level, naam: 'Alles gehaald!', beloning: 0, doelen: [], alles: true, klaar: false }
    var L = LEVELS[s.level - 1]
    var doelen = L.doelen.map(function (d) { var nu = doelWaarde(s, d, st); return { type: d.type, n: d.n, nu: nu, klaar: nu >= d.n, t: DOEL_TEKST[d.type](d.n) } })
    return { nr: s.level, naam: L.naam, beloning: L.beloning, doelen: doelen, laatste: s.level === LEVELS.length,
      klaar: doelen.every(function (d) { return d.klaar }) }
  }
  // alle doelen gehaald? dan naar het volgende level; geeft het nieuwe level terug (of null)
  function checkLevel(s, st) {
    if (s.level > LEVELS.length) return null
    var info = levelInfo(s, st)
    if (!info.klaar) return null
    s.geld += info.beloning
    s.level++
    return { nr: s.level, beloning: info.beloning, oud: info.naam, nieuw: nieuwOp(s.level, s), alles: s.level > LEVELS.length }
  }
  function nieuwOp(nr, s) {
    var l = []
    if (s) dierenVan(s).forEach(function (k) { if (dierNiveau(s, k) === nr) l.push(DIEREN[k].naam) })
    ;[[s ? {} : DIEREN], [BODEMS, 'bodem'], [INRICHTING], [OBJECTEN]].forEach(function (p) {
      Object.keys(p[0]).forEach(function (k) { if (p[0][k].niveau === nr && l.indexOf(p[0][k].naam) < 0) l.push(p[0][k].naam + (p[1] ? ' (bodem)' : '')) })
    })
    return l
  }

  // tijd laten lopen: geeft het aantal nieuwe bezoekers terug (voor het scherm)
  function stap(s, dt, st) {
    st = st || stats(s)
    s.teller += st.perMinuut / 60 * dt
    var n = 0
    while (s.teller >= 1) {
      s.teller -= 1; n++
      var geld = st.entree + st.kraam
      s.geld += geld; s.verdiend += geld; s.bezoekers++
    }
    return n
  }
  // Terwijl je weg was, verdient de dierentuin geld (maximaal een uur, de
  // helft). Die bezoekers tellen niet mee voor je niveau: dat haal je door zelf
  // te spelen.
  function weg(s, seconden) {
    var st = stats(s), t = Math.min(MAX_WEG, Math.max(0, seconden || 0)) * WEG_DEEL
    var n = Math.floor(st.perMinuut / 60 * t), geld = n * (st.entree + st.kraam)
    s.geld += geld; s.verdiend += geld
    return { bezoekers: n, geld: geld }
  }

  function kort(x) {
    if (!isFinite(x)) return '0'
    x = Math.floor(x)
    if (x < 10000) return String(x)
    if (x < 1e6) return (Math.floor(x / 100) / 10).toString().replace('.', ',') + 'K'
    return (Math.floor(x / 1e5) / 10).toString().replace('.', ',') + 'M'
  }

  return {
    BREED: BREED, HOOG: HOOG, INGANG: INGANG, GROND: GROND, BODEMS: BODEMS, INRICHTING: INRICHTING, DIEREN: DIEREN, OBJECTEN: OBJECTEN,
    LEVELS: LEVELS, WERELDEN: WERELDEN, dierenVan: dierenVan, dierNiveau: dierNiveau, CREATIEF: CREATIEF, wereld: wereld, ONEINDIG: ONEINDIG, PAD_PRIJS: PAD_PRIJS, HEK_PRIJS: HEK_PRIJS, MIN_HOK: MIN_HOK, MAX_HOK: MAX_HOK, MAX_NIVEAU: MAX_NIVEAU, STER_GRENS: STER_GRENS,
    nieuw: nieuw, herstel: herstel, bewaarbaar: bewaarbaar, sleutel: sleutel,
    gebied: gebied, binnen: binnen, vrij: vrij, gebiedVrij: gebiedVrij, verblijfOp: verblijfOp, itemOp: itemOp, objectOp: objectOp, ontgrendeld: ontgrendeld,
    kanPad: kanPad, legPad: legPad, hekPrijs: hekPrijs, waaromNietHok: waaromNietHok, bouwHok: bouwHok,
    bodemPrijs: bodemPrijs, waaromNietBodem: waaromNietBodem, zetBodem: zetBodem,
    ruimteOver: ruimteOver, waaromNietItem: waaromNietItem, plaatsItem: plaatsItem, telItems: telItems,
    waaromNietDier: waaromNietDier, zetDier: zetDier, kanObject: kanObject, plaatsObject: plaatsObject, wat: wat, sloop: sloop, sloopHok: sloopHok,
    grondInfo: grondInfo, koopGrond: koopGrond, verbondenPad: verbondenPad, raaktPad: raaktPad,
    wensen: wensen, blijheid: blijheid, stats: stats, niveau: niveau, nieuwOp: nieuwOp, levelInfo: levelInfo, checkLevel: checkLevel, doelWaarde: doelWaarde, stap: stap, weg: weg, kort: kort,
  }
})()
if (typeof globalThis !== 'undefined') globalThis.DT = DT
