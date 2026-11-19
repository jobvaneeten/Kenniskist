// ═══════════════════════════════════════════════════════════════════════════
//  MONSTERTEAM: kern. Wezens, aanvallen, gevechten, vangen en groeien. Geen DOM:
//  gedeeld door spel.js en tools/monsterteamTest.js.
//
//  Acht elementen (zie EFFECT). Vuur wint van plant, plant van water, water van vuur.
//  Een gevecht gaat in beurten; wie sneller is, valt eerst aan.
// ═══════════════════════════════════════════════════════════════════════════
var MT = (function () {
  var TYPES = ['vuur', 'water', 'plant', 'bliksem', 'schaduw', 'ijs', 'aarde', 'lucht']
  var TYPENAAM = { vuur: 'Vuur', water: 'Water', plant: 'Plant', bliksem: 'Bliksem', schaduw: 'Schaduw', ijs: 'IJs', aarde: 'Aarde', lucht: 'Lucht', normaal: 'Normaal' }
  var KLEUR = { vuur: '#ff6a3d', water: '#3fa8ff', plant: '#5be37a', bliksem: '#ffd23d', schaduw: '#a56bff', ijs: '#7fe0ff', aarde: '#c8904a', lucht: '#a8c8ff', normaal: '#c9cfe8' }
  // [aanvaller][verdediger]: 2 = super effectief, 0.5 = niet zo effectief
  var EFFECT = {
    vuur: { vuur: 0.5, water: 0.5, plant: 2, bliksem: 1, schaduw: 1, ijs: 2, aarde: 0.5, lucht: 1 },
    water: { vuur: 2, water: 0.5, plant: 0.5, bliksem: 1, schaduw: 1, ijs: 1, aarde: 2, lucht: 1 },
    plant: { vuur: 0.5, water: 2, plant: 0.5, bliksem: 1, schaduw: 1, ijs: 0.5, aarde: 2, lucht: 0.5 },
    bliksem: { vuur: 1, water: 2, plant: 0.5, bliksem: 0.5, schaduw: 2, ijs: 1, aarde: 0.5, lucht: 2 },
    schaduw: { vuur: 2, water: 1, plant: 2, bliksem: 0.5, schaduw: 0.5, ijs: 1, aarde: 1, lucht: 1 },
    ijs: { vuur: 0.5, water: 0.5, plant: 2, bliksem: 1, schaduw: 1, ijs: 0.5, aarde: 2, lucht: 2 },
    aarde: { vuur: 2, water: 1, plant: 0.5, bliksem: 2, schaduw: 1, ijs: 1, aarde: 1, lucht: 0.5 },
    lucht: { vuur: 1, water: 1, plant: 2, bliksem: 0.5, schaduw: 1, ijs: 0.5, aarde: 0.5, lucht: 1 },
    normaal: { vuur: 1, water: 1, plant: 1, bliksem: 1, schaduw: 1, ijs: 1, aarde: 1, lucht: 1 },
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
    ijsprik: { naam: 'IJsprik', type: 'ijs', kracht: 40, kans: 100 },
    hagel: { naam: 'Hagelslag', type: 'ijs', kracht: 70, kans: 95 },
    sneeuwstorm: { naam: 'Sneeuwstorm', type: 'ijs', kracht: 100, kans: 80 },
    modder: { naam: 'Modderbal', type: 'aarde', kracht: 40, kans: 100 },
    rotsworp: { naam: 'Rotsworp', type: 'aarde', kracht: 70, kans: 95 },
    aardbeving: { naam: 'Aardbeving', type: 'aarde', kracht: 100, kans: 80 },
    wind: { naam: 'Windstoot', type: 'lucht', kracht: 40, kans: 100 },
    luchtsnede: { naam: 'Luchtsnede', type: 'lucht', kracht: 70, kans: 95 },
    orkaan: { naam: 'Orkaan', type: 'lucht', kracht: 100, kans: 80 },
  }
  var PER_TYPE = {
    vuur: ['vonk', 'vuurbal', 'vlammenzee'], water: ['spat', 'golf', 'vloed'], plant: ['blad', 'wortel', 'zonblad'], bliksem: ['prik', 'flits', 'donder'],
    schaduw: ['schim', 'klauw', 'eclips'], ijs: ['ijsprik', 'hagel', 'sneeuwstorm'], aarde: ['modder', 'rotsworp', 'aardbeving'], lucht: ['wind', 'luchtsnede', 'orkaan'],
  }
  // een tweede element dat veranderde wezens erbij leren
  var BIJ = { vuur: 'rotsworp', water: 'hagel', plant: 'rotsworp', bliksem: 'luchtsnede', schaduw: 'luchtsnede', ijs: 'golf', aarde: 'vuurbal', lucht: 'flits' }

  // ── 128 wezens in families. Uiterlijk: lijf, oren, staart en per stadium een extra. ──
  // [element, [namen], [niveau naar stadium 2, 3], [leven, aanval, verdediging, snelheid], uiterlijk]
  var FAMILIES = [
    ['vuur', ['Vonkel', 'Vlamvos', 'Zonnevos'], [14, 32], [39, 52, 43, 65], { vorm: 'vier', v: 'vos', lijf: 'rond', oor: 'punt', staart: 'vlam', x: ['', 'manen', 'kroon'] }],
    ['vuur', ['Sintel', 'Gloeirots', 'Vulkanos'], [18, 36], [50, 58, 68, 28], { vorm: 'rots', v: '', lijf: 'rots', oor: 'geen', staart: 'geen', x: ['', 'stekels', 'kristal'] }],
    ['vuur', ['Lavaslak', 'Magmaslak', 'Lavaridder'], [20, 38], [55, 52, 72, 25], { vorm: 'slak', v: '', lijf: 'breed', oor: 'antenne', staart: 'huis', x: ['', '', 'horens'] }],
    ['vuur', ['Pyropup', 'Brandhond', 'Vuurwolf'], [16, 34], [45, 60, 40, 65], { vorm: 'vier', v: 'wolf', lijf: 'ovaal', oor: 'punt', staart: 'vlam', x: ['', 'manen', 'manen'], streep: true }],
    ['vuur', ['Fakkelmot', 'Vlammot'], [22], [40, 52, 40, 70], { vorm: 'insect', v: 'mot', lijf: 'insect', oor: 'antenne', staart: 'geen', x: ['vleugel', 'vleugel'] }],
    ['vuur', ['Feniksje'], [], [80, 92, 70, 100], { vorm: 'vogel', v: 'feniks', lijf: 'vogel', oor: 'pluim', staart: 'vlam', x: ['kroon'], snavel: true }],
    ['vuur', ['Vuurvlieg'], [], [42, 55, 38, 82], { vorm: 'insect', v: '', lijf: 'insect', oor: 'antenne', staart: 'vlam', x: ['vleugel'] }],
    ['water', ['Druppie', 'Golfling', 'Tsunamor'], [14, 32], [44, 48, 65, 43], { vorm: 'twee', v: 'water', lijf: 'druppel', oor: 'vin', staart: 'vis', x: ['', 'schelp', 'golfkam'] }],
    ['water', ['Poelpad', 'Moerasbaas', 'Moeraskoning'], [16, 34], [50, 45, 55, 35], { vorm: 'vier', v: 'kikker', lijf: 'breed', oor: 'geen', staart: 'geen', x: ['', '', 'kroon'], stip: true }],
    ['water', ['Spatvis', 'Zwaardvis', 'Oceaanridder'], [18, 36], [40, 55, 40, 70], { vorm: 'vis', v: 'zwaard', lijf: 'vis', oor: 'vin', staart: 'vis', x: ['', 'vin', 'horens'] }],
    ['water', ['Kwalletje', 'Gloeikwal', 'Diepzeekwal'], [20, 38], [45, 42, 50, 50], { vorm: 'kwal', v: '', lijf: 'kwal', oor: 'geen', staart: 'geen', x: ['tentakels', 'tentakels', 'kroon'] }],
    ['water', ['Schelpie', 'Parelschelp'], [24], [50, 40, 88, 30], { vorm: 'slak', v: 'schelp', lijf: 'rond', oor: 'geen', staart: 'geen', x: ['schelp', 'schelp'] }],
    ['water', ['Dolfijntje'], [], [62, 66, 56, 86], { vorm: 'vis', v: 'dolfijn', lijf: 'vis', oor: 'vin', staart: 'vis', x: ['vin'] }],
    ['water', ['Waterdraak'], [], [86, 92, 80, 86], { vorm: 'draak', v: 'water', lijf: 'lang', oor: 'vin', staart: 'vis', x: ['horens'] }],
    ['plant', ['Knopje', 'Bladbeer', 'Woudreus'], [14, 32], [45, 49, 49, 45], { vorm: 'twee', v: 'beer', lijf: 'rond', oor: 'blad', staart: 'blad', x: ['', 'bloem', 'boom'] }],
    ['plant', ['Mosmuis', 'Mosrat', 'Mosreus'], [15, 33], [40, 45, 40, 70], { vorm: 'vier', v: 'rat', lijf: 'rond', oor: 'rond', staart: 'dun', x: ['', 'stekels', 'boom'] }],
    ['plant', ['Zaadje', 'Bloemelf', 'Bloesemfee'], [16, 34], [40, 42, 45, 55], { vorm: 'twee', v: 'fee', lijf: 'druppel', oor: 'blad', staart: 'geen', x: ['', 'bloem', 'vleugel'] }],
    ['plant', ['Sporie', 'Zwammie', 'Zwamkoning'], [18, 36], [55, 45, 60, 30], { vorm: 'twee', v: 'paddo', lijf: 'peer', oor: 'geen', staart: 'geen', x: ['paddo', 'paddo', 'paddo'], stip: true }],
    ['plant', ['Cactie', 'Stekelreus'], [24], [55, 60, 70, 30], { vorm: 'twee', v: 'cactus', lijf: 'peer', oor: 'geen', staart: 'geen', x: ['stekels', 'stekels'] }],
    ['plant', ['Lianaap'], [], [66, 72, 56, 76], { vorm: 'twee', v: 'aap', lijf: 'ovaal', oor: 'rond', staart: 'dun', x: ['bloem'] }],
    ['plant', ['Klavertje'], [], [52, 52, 52, 90], { vorm: 'vier', v: 'konijn', lijf: 'rond', oor: 'blad', staart: 'blad', x: ['bloem'] }],
    ['bliksem', ['Zoemer', 'Flitskat', 'Donderleeuw'], [16, 32], [35, 55, 40, 90], { vorm: 'vier', v: 'kat', lijf: 'rond', oor: 'antenne', staart: 'flits', x: ['vleugel', '', 'manen'] }],
    ['bliksem', ['Stormvink', 'Stormarend', 'Stormkoning'], [22, 38], [40, 50, 35, 75], { vorm: 'vogel', v: '', lijf: 'vogel', oor: 'pluim', staart: 'veer', x: ['vleugel', 'vleugel', 'kroon'], snavel: true }],
    ['bliksem', ['Gloeislak', 'Vonkslak', 'Dynamoslak'], [18, 35], [50, 40, 70, 25], { vorm: 'slak', v: '', lijf: 'breed', oor: 'antenne', staart: 'huis', x: ['', '', 'kristal'] }],
    ['bliksem', ['Batterat', 'Volterat', 'Megavolt'], [16, 34], [38, 55, 38, 85], { vorm: 'vier', v: 'rat', lijf: 'ovaal', oor: 'rond', staart: 'flits', x: ['', '', 'manen'], streep: true }],
    ['bliksem', ['Magnetje', 'Magnetor'], [26], [45, 55, 75, 45], { vorm: 'rots', v: 'magneet', lijf: 'rots', oor: 'antenne', staart: 'geen', x: ['', 'kristal'] }],
    ['bliksem', ['Neonaal'], [], [62, 76, 56, 82], { vorm: 'draak', v: 'aal', lijf: 'lang', oor: 'vin', staart: 'flits', x: [''] }],
    ['bliksem', ['Statiek'], [], [52, 62, 50, 95], { vorm: 'blob', v: 'statisch', lijf: 'rond', oor: 'punt', staart: 'flits', x: ['wolk'] }],
    ['schaduw', ['Nachtje', 'Schimuil', 'Maanuil'], [16, 32], [40, 45, 45, 60], { vorm: 'vogel', v: 'uil', lijf: 'vogel', oor: 'pluim', staart: 'geen', x: ['vleugel', 'vleugel', 'maan'], snavel: true }],
    ['schaduw', ['Spookvis', 'Schimvis', 'Nevelhaai'], [20, 38], [50, 62, 45, 70], { vorm: 'vis', v: 'haai', lijf: 'vis', oor: 'vin', staart: 'vis', x: ['', 'vin', 'horens'] }],
    ['schaduw', ['Fladder', 'Nachtfladder', 'Duistervleugel'], [18, 34], [40, 50, 35, 80], { vorm: 'vogel', v: 'vleermuis', lijf: 'rond', oor: 'punt', staart: 'geen', x: ['vleugel', 'vleugel', 'horens'] }],
    ['schaduw', ['Schimpoes', 'Nachtpoes', 'Duisterpanter'], [17, 35], [45, 60, 40, 75], { vorm: 'vier', v: 'kat', lijf: 'ovaal', oor: 'punt', staart: 'dun', x: ['', 'maan', 'maan'], streep: true }],
    ['schaduw', ['Spookje', 'Spokenheer'], [26], [45, 60, 45, 65], { vorm: 'kwal', v: 'spook', lijf: 'kwal', oor: 'geen', staart: 'geen', x: ['', 'kroon'] }],
    ['schaduw', ['Nevelgeest'], [], [62, 76, 60, 72], { vorm: 'kwal', v: 'spook', lijf: 'druppel', oor: 'geen', staart: 'geen', x: ['wolk'] }],
    ['schaduw', ['Sterrenkat'], [], [100, 110, 95, 120], { vorm: 'vier', v: 'kat', lijf: 'ovaal', oor: 'punt', staart: 'ster', x: ['kroon'] }],
    ['ijs', ['IJskever', 'Vriesschild', 'Gletsjerkever'], [20, 38], [48, 52, 72, 30], { vorm: 'insect', v: 'kever', lijf: 'rots', oor: 'antenne', staart: 'geen', x: ['schild', 'schild', 'kristal'] }],
    ['ijs', ['Sneeuwpluis', 'Sneeuwvos', 'Poolvos'], [16, 34], [42, 50, 40, 70], { vorm: 'vier', v: 'vos', lijf: 'ovaal', oor: 'punt', staart: 'dun', x: ['', 'manen', 'kroon'] }],
    ['ijs', ['Pingel', 'Glijpin', 'Keizerpin'], [18, 36], [50, 46, 50, 50], { vorm: 'twee', v: 'pinguin', lijf: 'peer', oor: 'geen', staart: 'geen', x: ['', '', 'kroon'], snavel: true }],
    ['ijs', ['IJspegel', 'Kristalpegel', 'Gletsjerreus'], [20, 38], [45, 55, 60, 35], { vorm: 'rots', v: '', lijf: 'rots', oor: 'geen', staart: 'geen', x: ['kristal', 'kristal', 'kristal'] }],
    ['ijs', ['Rijpvlinder', 'Vorstvlinder'], [22], [40, 46, 40, 76], { vorm: 'insect', v: '', lijf: 'insect', oor: 'antenne', staart: 'geen', x: ['vleugel', 'vleugel'] }],
    ['ijs', ['Hagelbeer'], [], [86, 86, 76, 50], { vorm: 'twee', v: 'beer', lijf: 'peer', oor: 'rond', staart: 'geen', x: ['manen'] }],
    ['ijs', ['Noorderlichtje'], [], [72, 82, 70, 90], { vorm: 'kwal', v: '', lijf: 'kwal', oor: 'geen', staart: 'geen', x: ['kroon'] }],
    ['aarde', ['Rotsbol', 'Keibol', 'Bergreus'], [18, 36], [45, 55, 75, 20], { vorm: 'rots', v: '', lijf: 'rots', oor: 'geen', staart: 'geen', x: ['', 'stekels', 'kristal'] }],
    ['aarde', ['Graafje', 'Graafmol', 'Tunnelkoning'], [16, 34], [45, 55, 45, 45], { vorm: 'twee', v: 'mol', lijf: 'peer', oor: 'rond', staart: 'dun', x: ['', '', 'kroon'] }],
    ['aarde', ['Zandje', 'Duinslang', 'Woestijnslang'], [18, 36], [40, 55, 40, 65], { vorm: 'draak', v: 'slang', lijf: 'lang', oor: 'geen', staart: 'geen', x: ['', '', 'horens'], streep: true }],
    ['aarde', ['Fossi', 'Fossiklauw', 'Oerkrab'], [20, 38], [45, 60, 65, 35], { vorm: 'insect', v: 'krab', lijf: 'breed', oor: 'antenne', staart: 'geen', x: ['schild', 'schild', 'horens'] }],
    ['aarde', ['Kleipop', 'Kleireus'], [26], [60, 55, 60, 30], { vorm: 'rots', v: '', lijf: 'peer', oor: 'geen', staart: 'geen', x: ['', 'kristal'] }],
    ['aarde', ['Wroeter'], [], [72, 72, 66, 56], { vorm: 'vier', v: 'zwijn', lijf: 'ovaal', oor: 'rond', staart: 'dun', x: ['horens'] }],
    ['aarde', ['Kristalrots'], [], [72, 82, 100, 40], { vorm: 'rots', v: '', lijf: 'rots', oor: 'geen', staart: 'geen', x: ['kristal'] }],
    ['lucht', ['Veertje', 'Zwaluwing', 'Windvalk'], [16, 34], [40, 48, 38, 75], { vorm: 'vogel', v: '', lijf: 'vogel', oor: 'pluim', staart: 'veer', x: ['vleugel', 'vleugel', 'vleugel'], snavel: true }],
    ['lucht', ['Wolkje', 'Wolkendans', 'Stormwolk'], [18, 36], [50, 42, 50, 55], { vorm: 'blob', v: 'wolk', lijf: 'rond', oor: 'geen', staart: 'geen', x: ['wolk', 'wolk', 'wolk'] }],
    ['lucht', ['Pluisje', 'Zweefpluis', 'Hemelpluis'], [16, 34], [38, 40, 40, 72], { vorm: 'blob', v: 'pluis', lijf: 'rond', oor: 'pluim', staart: 'geen', x: ['wolk', 'vleugel', 'kroon'] }],
    ['lucht', ['Libeltje', 'Libellio', 'Hemellibel'], [18, 36], [40, 50, 38, 86], { vorm: 'insect', v: 'libel', lijf: 'insect', oor: 'antenne', staart: 'dun', x: ['vleugel', 'vleugel', 'vleugel'] }],
    ['lucht', ['Blaasje', 'Blaasballon'], [24], [60, 40, 50, 40], { vorm: 'blob', v: 'ballon', lijf: 'rond', oor: 'geen', staart: 'geen', x: ['', 'wolk'] }],
    ['lucht', ['Prisma'], [], [66, 72, 60, 96], { vorm: 'vogel', v: 'paradijs', lijf: 'vogel', oor: 'pluim', staart: 'veer', x: ['vleugel'], snavel: true }],
    ['lucht', ['Hemeldraak'], [], [90, 100, 86, 96], { vorm: 'draak', v: 'hemel', lijf: 'lang', oor: 'pluim', staart: 'veer', x: ['vleugel'] }],
  ]
  var SOORTEN = {}
  function idVan(naam) { return naam.toLowerCase().replace(/[^a-z]/g, '') }
  FAMILIES.forEach(function (f) {
    var type = f[0], namen = f[1], evo = f[2], b = f[3], look = f[4]
    namen.forEach(function (naam, st) {
      var factor = [1, 1.35, 1.72][st]
      var maat = namen.length === 1 ? 0.95 : [0.72, 0.9, 1.08][st]
      SOORTEN[idVan(naam)] = {
        naam: naam, type: type, stadium: st + 1,
        b: b.map(function (v) { return Math.round(v * factor) }),
        evo: st < namen.length - 1 ? [idVan(namen[st + 1]), evo[st]] : null,
        look: { vorm: look.vorm, v: look.v, fase: namen.length === 1 ? (b.reduce(function (s, x) { return s + x }, 0) >= 300 ? 3 : 2) : namen.length === 2 ? [1, 3][st] : st + 1, lijf: look.lijf, oor: look.oor, staart: look.staart, extra: look.x[st] || '', maat: maat, snavel: !!look.snavel, stip: look.stip && st > 0, streep: look.streep && st > 0 },
      }
    })
  })
  var STARTERS = ['vonkel', 'druppie', 'knopje']

  // wat een wezen leert, op welk niveau
  function leerlijst(id) {
    var t = SOORTEN[id].type, m = PER_TYPE[t]
    var l = [[1, 'stoot'], [1, m[0]], [6, t === 'water' || t === 'plant' || t === 'aarde' || t === 'ijs' ? 'schild' : 'grauw'], [10, 'snel'], [15, m[1]], [22, 'herstel'], [29, m[2]]]
    if (SOORTEN[id].stadium >= 2 || !SOORTEN[id].evo) l.push([18, BIJ[t]])
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

  // ── wereld: 8 gebieden, elk met een leider en een badge ──
  var GEBIEDEN = [
    { naam: 'Gloeiweide', kleur: '#5be37a', wild: [['mosmuis', 2, 4], ['zaadje', 2, 4], ['veertje', 2, 5], ['poelpad', 3, 5], ['knopje', 3, 4, 0.04], ['klavertje', 4, 5, 0.03], ['lianaap', 4, 5, 0.02]],
      trainer: { naam: 'Sam', team: [['mosmuis', 4], ['veertje', 5]] }, leider: { naam: 'Mira', type: 'plant', team: [['zaadje', 8], ['sporie', 8], ['bladbeer', 10]], badge: 'Bladbadge' } },
    { naam: 'Bliksembergen', kleur: '#ffd23d', wild: [['batterat', 5, 8], ['gloeislak', 5, 8], ['rotsbol', 6, 9], ['stormvink', 6, 9], ['magnetje', 7, 9, 0.08], ['statiek', 8, 9, 0.03]],
      trainer: { naam: 'Kai', team: [['batterat', 9], ['rotsbol', 10]] }, leider: { naam: 'Volt', type: 'bliksem', team: [['batterat', 13], ['gloeislak', 13], ['flitskat', 15]], badge: 'Flitsbadge' } },
    { naam: 'Nevelmeer', kleur: '#3fa8ff', wild: [['spatvis', 9, 13], ['kwalletje', 9, 13], ['schelpie', 10, 13], ['poelpad', 10, 14], ['druppie', 10, 12, 0.04], ['dolfijntje', 12, 14, 0.03], ['neonaal', 12, 14, 0.02]],
      trainer: { naam: 'Lotte', team: [['spatvis', 13], ['kwalletje', 14]] }, leider: { naam: 'Marin', type: 'water', team: [['spatvis', 17], ['kwalletje', 17], ['golfling', 19]], badge: 'Golfbadge' } },
    { naam: 'Rotskloof', kleur: '#c8904a', wild: [['graafje', 13, 17], ['zandje', 13, 17], ['fossi', 14, 17], ['cactie', 14, 18], ['kleipop', 15, 18], ['wroeter', 16, 18, 0.04], ['kristalrots', 17, 18, 0.02]],
      trainer: { naam: 'Ravi', team: [['graafmol', 18], ['cactie', 18]] }, leider: { naam: 'Rotsa', type: 'aarde', team: [['graafmol', 21], ['duinslang', 21], ['keibol', 23]], badge: 'Rotsbadge' } },
    { naam: 'Lavakrater', kleur: '#ff6a3d', wild: [['sintel', 17, 21], ['lavaslak', 17, 21], ['pyropup', 18, 21], ['fakkelmot', 18, 22], ['vonkel', 18, 20, 0.04], ['vuurvlieg', 19, 22, 0.05], ['feniksje', 21, 22, 0.015]],
      trainer: { naam: 'Noor', team: [['brandhond', 22], ['magmaslak', 22]] }, leider: { naam: 'Blaze', type: 'vuur', team: [['brandhond', 25], ['magmaslak', 25], ['vlamvos', 27]], badge: 'Vlambadge' } },
    { naam: 'Wolkenkliffen', kleur: '#a8c8ff', wild: [['wolkje', 21, 25], ['pluisje', 21, 25], ['libeltje', 22, 25], ['blaasje', 22, 26], ['veertje', 22, 25], ['prisma', 24, 26, 0.03], ['hemeldraak', 25, 26, 0.015]],
      trainer: { naam: 'Jesse', team: [['zwaluwing', 26], ['wolkendans', 26]] }, leider: { naam: 'Zefier', type: 'lucht', team: [['zwaluwing', 29], ['wolkendans', 29], ['libellio', 30], ['windvalk', 31]], badge: 'Windbadge' } },
    { naam: 'Vriesveld', kleur: '#7fe0ff', wild: [['sneeuwpluis', 25, 29], ['pingel', 25, 29], ['ijspegel', 26, 29], ['ijskever', 26, 30], ['rijpvlinder', 26, 29], ['hagelbeer', 28, 30, 0.04], ['noorderlichtje', 29, 30, 0.015], ['waterdraak', 29, 30, 0.01]],
      trainer: { naam: 'Elin', team: [['sneeuwvos', 30], ['glijpin', 30], ['vriesschild', 31]] }, leider: { naam: 'Frida', type: 'ijs', team: [['sneeuwvos', 33], ['glijpin', 33], ['kristalpegel', 34], ['poolvos', 35]], badge: 'IJsbadge' } },
    { naam: 'Schaduwwoud', kleur: '#a56bff', wild: [['fladder', 29, 33], ['schimpoes', 29, 33], ['spookje', 30, 33], ['nachtje', 29, 33], ['spookvis', 30, 34], ['nevelgeest', 32, 34, 0.04]],
      trainer: { naam: 'Mees', team: [['nachtfladder', 34], ['nachtpoes', 34], ['schimvis', 35]] }, leider: { naam: 'Nox', type: 'schaduw', team: [['nachtpoes', 37], ['nevelhaai', 37], ['duistervleugel', 38], ['maanuil', 40]], badge: 'Nachtbadge' } },
  ]
  // een wild wezen voor dit gebied (zeldzame met hun eigen kans)
  function wild(gebied, toeval1, toeval2, toeval3) {
    var lijst = GEBIEDEN[gebied].wild, gewoon = lijst.filter(function (w) { return !w[3] })
    var keuze = null, kans = 0
    lijst.filter(function (w) { return w[3] }).forEach(function (w) { if (!keuze && toeval1 < kans + w[3]) keuze = w; kans += w[3] })
    if (!keuze) keuze = gewoon[Math.floor(toeval2 * gewoon.length)]
    return maak(keuze[0], keuze[1] + Math.floor(toeval3 * (keuze[2] - keuze[1] + 1)))
  }
  function heelAlles(team) { team.forEach(function (w) { w.hp = maxHp(w); w.st = { aanval: 0, verdediging: 0 } }) }

  return {
    TYPES: TYPES, FAMILIES: FAMILIES, idVan: idVan, TYPENAAM: TYPENAAM, KLEUR: KLEUR, EFFECT: EFFECT, AANVALLEN: AANVALLEN, SOORTEN: SOORTEN, STARTERS: STARTERS, GEBIEDEN: GEBIEDEN,
    maak: maak, maxHp: maxHp, xpNodig: xpNodig, schade: schade, effect: effect, gevecht: gevecht, beurt: beurt, actiefWij: actiefWij,
    wild: wild, heelAlles: heelAlles, leerlijst: leerlijst, geefXp: geefXp,
  }
})()
