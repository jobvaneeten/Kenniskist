// Interpunctie: één goede zin en drie bijna-goede versies van dezelfde zin.
//
// Elke zin heeft een lijst `fouten`: een stukje tekst (`van`) dat in de foute
// versie vervangen wordt door `naar`. Een foute keuze is de goede zin met één
// of twee van die fouten erin — alleen fouten uit de onderdelen die de
// leerling heeft aangevinkt. Zo blijven de vier zinnen bijna gelijk en zie je
// het verschil pas als je echt de regel kent.
//
// `van` komt precies één keer in de zin voor (zie interpunctieData.test.js).
// Komma's bij een citaat ("...", zei hij / "..." , zei hij) staan er bewust
// niet in: methodes en de Taalunie verschillen daarover van mening.
//
// Afbreekstreepje = het streepje aan het eind van een regel als een woord op
// de volgende regel verdergaat. In die zinnen staat "\n" waar de regel
// eindigt; de oefening en het werkblad tonen dat als echte regelovergang.
// Het streepje ín een woord (zee-egel, wc-bril) hoort hier niet bij.

export const ONDERDELEN = [
  { id: 'komma', label: 'Komma', emoji: ',' },
  { id: 'aanhalingstekens', label: 'Aanhalingstekens', emoji: '“ ”' },
  { id: 'afbreekstreepje', label: 'Afbreekstreepje', emoji: '-↵' },
  { id: 'hoofdletters', label: 'Hoofdletters', emoji: 'Aa' },
  { id: 'punten', label: 'Punten', emoji: '.' },
]

export const REGELS = {
  komma: [
    'Tussen twee persoonsvormen staat meestal een komma: "Toen de bel ging, rende iedereen weg."',
    'Een stukje dat tussen de zin geschoven is, zet je tussen twee komma\'s.',
    'Na een naam waarmee je iemand aanspreekt, en na ja of nee aan het begin: "Nee, dat klopt niet."',
    'Voor "maar" en "want" tussen twee zinnen zet je een komma, erna niet.',
    'In een opsomming zet je komma\'s, maar níet voor het laatste "en".',
  ],
  aanhalingstekens: [
    'Komt het gezegde ná "zei", "riep" of "vroeg"? Dan eerst een dubbele punt: Hij zei: "..."',
    'De punt, het vraagteken of het uitroepteken van wat iemand zegt, staat vóór het laatste aanhalingsteken.',
    'Na een vraagteken of uitroepteken komt geen komma en geen extra punt.',
    'Staat "vroeg Daan" na het citaat? Dan gaat de zin door met een kleine letter.',
  ],
  afbreekstreepje: [
    'Past een woord niet meer op de regel? Dan breek je het af en zet je een streepje aan het eind van de regel.',
    'Het streepje staat achteraan de regel, niet vooraan op de volgende regel.',
    'Je breekt af tussen twee lettergrepen: ka-mer, span-nend, la-chen.',
    'Een samengesteld woord breek je af tussen de delen: zand-bak, boter-ham.',
    'Klanken als ch, ij, ei, ui, ou en oe blijven bij elkaar: la-chen, bij-en.',
    'Eén letter alleen breek je niet af (dus niet e-zel): dan zet je het hele woord op de volgende regel, zonder streepje.',
  ],
  hoofdletters: [
    'Een zin begint met een hoofdletter. Bij \'s ervoor krijgt het tweede woord hem: \'s Morgens.',
    'Namen van mensen, plaatsen, landen, talen en volken: Frans, Spanje, een Duitse.',
    'Bijvoeglijke naamwoorden van plaatsen en landen ook: Amsterdams, Engelse.',
    'Dagen, maanden, seizoenen en windrichtingen níet: dinsdag, maart, het noorden.',
    'Mevrouw De Jong (zonder voornaam: hoofdletter), maar Lisa de Vries (met voornaam: kleine letter).',
  ],
  punten: [
    'Een zin eindigt met een punt (of ? of !).',
    'Afkortingen krijgen punten: o.a., enz., d.w.z., ca., dhr.',
    'Maten en letterwoorden níet: km, kg, m, tv, ANWB.',
    'Eindigt de zin op een afkorting met punt? Dan zet je er geen tweede punt achter.',
  ],
}

const k = (van, naar, uitleg) => ({ cat: 'komma', van, naar, uitleg })
const a = (van, naar, uitleg) => ({ cat: 'aanhalingstekens', van, naar, uitleg })
const af = (van, naar, uitleg) => ({ cat: 'afbreekstreepje', van, naar, uitleg })
const h = (van, naar, uitleg) => ({ cat: 'hoofdletters', van, naar, uitleg })
const p = (van, naar, uitleg) => ({ cat: 'punten', van, naar, uitleg })

const BEGIN = 'Een zin begint met een hoofdletter.'
const GEEN_NAAM = 'Dit is geen naam, dus een kleine letter.'
const DUBBELE_PUNT = 'Voor wat iemand letterlijk zegt, na "zei" of "riep", komt een dubbele punt.'
const PUNT_BINNEN = 'De punt hoort bij wat er gezegd wordt, dus vóór het laatste aanhalingsteken.'
const DOORLOPEN = 'Na het citaat loopt de zin gewoon door, dus een kleine letter.'
const CITAAT_HOOFDLETTER = 'Wat iemand letterlijk zegt, begint met een hoofdletter.'
const EIND_PUNT = 'Een zin eindigt met een punt.'
const STREEP_EIND = 'Het afbreekstreepje staat aan het eind van de regel, niet aan het begin van de volgende regel.'
const STREEP_NODIG = 'Breek je een woord af, dan zet je aan het eind van de regel een streepje.'
const LETTERGREEP = (w) => `Je breekt een woord af tussen twee lettergrepen: ${w}.`
const DELEN = (w) => `Een samengesteld woord breek je af tussen de delen: ${w}.`

export const ZINNEN = [
  // ── komma ───────────────────────────────────────────────────────────────
  { zin: 'Toen de bel ging, rende iedereen naar het schoolplein.', fouten: [
    k('ging, rende', 'ging rende', 'Tussen de persoonsvormen "ging" en "rende" hoort een komma.'),
    k('Toen de bel', 'Toen, de bel', 'Na "Toen" komt geen komma: het eerste stuk loopt door tot "ging".'),
  ] },
  { zin: 'Sanne, wil jij de ramen even dichtdoen?', fouten: [
    k('Sanne, wil', 'Sanne wil', 'Na een naam waarmee je iemand aanspreekt, komt een komma.'),
    k('wil jij de', 'wil jij, de', 'Tussen "jij" en "de ramen" hoort geen komma.'),
  ] },
  { zin: 'We kochten appels, peren en bananen bij de markt in Utrecht.', fouten: [
    k('peren en', 'peren, en', 'Voor het laatste "en" in een opsomming komt geen komma.'),
    k('appels, peren', 'appels peren', 'Tussen de dingen in een opsomming komt een komma.'),
    k('We kochten', 'We, kochten', 'Tussen "We" en "kochten" hoort geen komma.'),
    h('Utrecht', 'utrecht', 'Een plaatsnaam krijgt een hoofdletter.'),
    h('bananen', 'Bananen', GEEN_NAAM),
  ] },
  { zin: 'Ik wilde graag mee, maar ik moest eerst mijn huiswerk maken.', fouten: [
    k('mee, maar', 'mee maar', 'Voor "maar" tussen twee zinnen komt een komma.'),
    k('maar ik moest', 'maar, ik moest', 'Na "maar" komt geen komma.'),
    k('Ik wilde graag', 'Ik wilde, graag', 'Tussen "wilde" en "graag" hoort geen komma.'),
  ] },
  { zin: 'Nee, ik heb mijn gymspullen vandaag niet bij me.', fouten: [
    k('Nee, ik', 'Nee ik', 'Na "ja" of "nee" aan het begin van de zin komt een komma.'),
    k('vandaag niet', 'vandaag, niet', 'Tussen "vandaag" en "niet" hoort geen komma.'),
    p('bij me.', 'bij me', EIND_PUNT),
  ] },
  { zin: 'Als je goed oplet, zie je de vos tussen de bomen.', fouten: [
    k('oplet, zie', 'oplet zie', 'Tussen de persoonsvormen "oplet" en "zie" hoort een komma.'),
    k('Als je goed', 'Als, je goed', 'Na "Als" komt geen komma.'),
    h('de vos', 'de Vos', GEEN_NAAM),
    p('bomen.', 'bomen', EIND_PUNT),
  ] },
  { zin: 'Morgen gaan we, als het niet regent, naar het strand in Zandvoort.', fouten: [
    k('regent, naar', 'regent naar', '"als het niet regent" staat tussen de zin geschoven: er hoort een komma vóór én na.'),
    k('we, als', 'we als', '"als het niet regent" staat tussen de zin geschoven: er hoort een komma vóór én na.'),
    h('Zandvoort', 'zandvoort', 'Een plaatsnaam krijgt een hoofdletter.'),
    h('Morgen', 'morgen', BEGIN),
  ] },
  { zin: 'Kun je, voordat je gaat spelen, eerst je kamer opruimen?', fouten: [
    k('je, voordat', 'je voordat', '"voordat je gaat spelen" staat tussen de zin geschoven: komma vóór én na.'),
    k('spelen, eerst', 'spelen eerst', '"voordat je gaat spelen" staat tussen de zin geschoven: komma vóór én na.'),
  ] },
  { zin: 'Omdat het hard waaide, bleven de kinderen tijdens de pauze binnen.', fouten: [
    k('waaide, bleven', 'waaide bleven', 'Tussen de persoonsvormen "waaide" en "bleven" hoort een komma.'),
    k('Omdat het', 'Omdat, het', 'Na "Omdat" komt geen komma.'),
    h('pauze', 'Pauze', GEEN_NAAM),
  ] },
  { zin: 'Pak je jas, want het gaat zo regenen.', fouten: [
    k('jas, want', 'jas want', 'Voor "want" tussen twee zinnen komt een komma.'),
    k('want het', 'want, het', 'Na "want" komt geen komma.'),
    k('Pak je', 'Pak, je', 'Tussen "Pak" en "je jas" hoort geen komma.'),
  ] },
  { zin: 'Ja, ik heb mijn opa uit Den Bosch gisteren gebeld.', fouten: [
    k('Ja, ik', 'Ja ik', 'Na "ja" of "nee" aan het begin van de zin komt een komma.'),
    k('Bosch gisteren', 'Bosch, gisteren', 'Tussen "Den Bosch" en "gisteren" hoort geen komma.'),
    h('Den Bosch', 'den Bosch', '"Den" hoort bij de plaatsnaam en krijgt een hoofdletter.'),
    h('opa', 'Opa', GEEN_NAAM),
  ] },

  // ── aanhalingstekens ────────────────────────────────────────────────────
  { zin: 'Juf Annemiek zei: "Pak allemaal je rekenschrift."', fouten: [
    a('zei: "Pak', 'zei "Pak', DUBBELE_PUNT),
    a('rekenschrift."', 'rekenschrift".', PUNT_BINNEN),
    h('"Pak', '"pak', CITAAT_HOOFDLETTER),
    h('Juf Annemiek', 'juf Annemiek', BEGIN),
  ] },
  { zin: '"Kom je morgen ook naar mijn feestje?" vroeg Daan.', fouten: [
    a('feestje?" vroeg', 'feestje?", vroeg', 'Na een vraagteken komt geen komma meer.'),
    a('"Kom je', 'Kom je', 'Wat Daan zegt, begint met een aanhalingsteken.'),
    h('vroeg Daan', 'Vroeg Daan', DOORLOPEN),
    h('je morgen', 'je Morgen', GEEN_NAAM),
  ] },
  { zin: 'Mama riep: "Het eten staat op tafel!"', fouten: [
    a('riep: "Het', 'riep "Het', DUBBELE_PUNT),
    a('tafel!"', 'tafel"!', 'Het uitroepteken hoort bij wat mama roept, dus vóór het laatste aanhalingsteken.'),
    h('"Het', '"het', CITAAT_HOOFDLETTER),
    h('Mama', 'mama', BEGIN),
  ] },
  { zin: 'Op het bord stond: "Niet voetballen op het grasveld."', fouten: [
    a('stond: "Niet', 'stond "Niet', DUBBELE_PUNT),
    a('grasveld."', 'grasveld".', PUNT_BINNEN),
    h('"Niet', '"niet', CITAAT_HOOFDLETTER),
    h('Op het', 'op het', BEGIN),
  ] },
  { zin: '"Wat een prachtige regenboog!" riep Lotte.', fouten: [
    a('regenboog!" riep', 'regenboog!", riep', 'Na een uitroepteken komt geen komma meer.'),
    a('"Wat', 'Wat', 'Wat Lotte roept, begint met een aanhalingsteken.'),
    h('riep Lotte', 'Riep Lotte', DOORLOPEN),
    h('Lotte.', 'lotte.', 'Een naam krijgt een hoofdletter.'),
  ] },
  { zin: 'De buschauffeur vroeg: "Waar wil je uitstappen?"', fouten: [
    a('vroeg: "Waar', 'vroeg "Waar', DUBBELE_PUNT),
    a('uitstappen?"', 'uitstappen?".', 'Na het vraagteken komt geen punt meer.'),
    h('"Waar', '"waar', CITAAT_HOOFDLETTER),
    h('De bus', 'de bus', BEGIN),
  ] },
  { zin: 'Opa vertelde: "Vroeger hadden wij thuis geen tv."', fouten: [
    a('vertelde: "Vroeger', 'vertelde "Vroeger', DUBBELE_PUNT),
    a('tv."', 'tv".', PUNT_BINNEN),
    h('"Vroeger', '"vroeger', CITAAT_HOOFDLETTER),
    h('Opa vertelde', 'opa vertelde', BEGIN),
    p('geen tv', 'geen t.v', 'Een letterwoord als tv krijgt geen punten.'),
  ] },
  { zin: '"Stop!" riep de agent. "Hier mag je niet oversteken."', fouten: [
    a('"Stop!" riep', '"Stop!", riep', 'Na een uitroepteken komt geen komma meer.'),
    a('oversteken."', 'oversteken".', PUNT_BINNEN),
    h('riep de', 'Riep de', DOORLOPEN),
    h('"Hier', '"hier', 'Na een punt begint een nieuwe zin met een hoofdletter.'),
    p('agent. "', 'agent "', 'Na "riep de agent" is de zin af: daar hoort een punt.'),
  ] },
  { zin: 'Mijn broer fluisterde: "Ik weet waar het cadeau verstopt is."', fouten: [
    a('fluisterde: "Ik', 'fluisterde "Ik', DUBBELE_PUNT),
    a('is."', 'is".', PUNT_BINNEN),
    h('Mijn broer', 'mijn broer', BEGIN),
    h('cadeau', 'Cadeau', GEEN_NAAM),
  ] },
  { zin: 'Op het briefje stond: "Ben zo terug, ik ben even naar de winkel."', fouten: [
    a('stond: "Ben', 'stond "Ben', DUBBELE_PUNT),
    a('winkel."', 'winkel".', PUNT_BINNEN),
    k('terug, ik', 'terug ik', 'Tussen twee zinnen ("Ben zo terug" en "ik ben even weg") hoort een komma.'),
    k('even naar', 'even, naar', 'Tussen "even" en "naar" hoort geen komma.'),
    h('"Ben', '"ben', CITAAT_HOOFDLETTER),
  ] },
  { zin: 'Meester Bram vroeg: "Wie weet het antwoord?"', fouten: [
    a('vroeg: "Wie', 'vroeg "Wie', DUBBELE_PUNT),
    a('antwoord?"', 'antwoord"?', 'Het vraagteken hoort bij de vraag, dus vóór het laatste aanhalingsteken.'),
    h('"Wie', '"wie', CITAAT_HOOFDLETTER),
    h('Meester Bram', 'meester Bram', BEGIN),
  ] },

  // ── afbreekstreepje (woord loopt door op de volgende regel) ──────────────
  { zin: 'Op school eet ik een boter-\nham met kaas.', fouten: [
    af('boter-\nham', 'bote-\nrham', DELEN('boter-ham')),
    af('boter-\nham', 'boter\n-ham', STREEP_EIND),
    af('boter-\nham', 'boter\nham', STREEP_NODIG),
    h('Op school', 'op school', BEGIN),
  ] },
  { zin: 'De kinderen spelen in de zand-\nbak bij het hek.', fouten: [
    af('zand-\nbak', 'zan-\ndbak', DELEN('zand-bak')),
    af('zand-\nbak', 'zand\n-bak', STREEP_EIND),
    af('zand-\nbak', 'zand\nbak', STREEP_NODIG),
    p('hek.', 'hek', EIND_PUNT),
  ] },
  { zin: 'In onze klas staat een ka-\nmerplant.', fouten: [
    af('ka-\nmerplant', 'kam-\nerplant', LETTERGREEP('ka-mer-plant')),
    af('ka-\nmerplant', 'ka\n-merplant', STREEP_EIND),
    af('ka-\nmerplant', 'ka\nmerplant', STREEP_NODIG),
    h('In onze', 'in onze', BEGIN),
  ] },
  { zin: 'De clown liet ons hard la-\nchen om zijn grap.', fouten: [
    af('la-\nchen', 'lac-\nhen', 'De klank ch blijft bij elkaar: la-chen.'),
    af('la-\nchen', 'la\n-chen', STREEP_EIND),
    af('la-\nchen', 'la\nchen', STREEP_NODIG),
    p('grap.', 'grap', EIND_PUNT),
  ] },
  { zin: 'Gisteren zagen we een\nezel in de wei.', fouten: [
    af('een\nezel', 'een e-\nzel', 'Eén letter alleen breek je niet af: dan zet je het hele woord op de volgende regel.'),
    af('een\nezel', 'een ez-\nel', 'Je breekt af tussen lettergrepen (e-zel), en één letter alleen breek je niet af: dus hier helemaal niet.'),
    af('een\nezel', 'een\n-ezel', 'Staat het hele woord op de nieuwe regel, dan komt er geen streepje.'),
    h('Gisteren', 'gisteren', BEGIN),
  ] },
  { zin: 'Mijn zus wil later dieren-\narts worden.', fouten: [
    af('dieren-\narts', 'dierena-\nrts', DELEN('dieren-arts')),
    af('dieren-\narts', 'dieren\n-arts', STREEP_EIND),
    af('dieren-\narts', 'dieren\narts', STREEP_NODIG),
    p('worden.', 'worden', EIND_PUNT),
  ] },
  { zin: 'In de tuin vliegen veel bij-\nen rond.', fouten: [
    af('bij-\nen', 'bi-\njen', 'De klank ij blijft bij elkaar: bij-en.'),
    af('bij-\nen', 'bij\n-en', STREEP_EIND),
    af('bij-\nen', 'bij\nen', STREEP_NODIG),
    h('In de tuin', 'in de tuin', BEGIN),
  ] },
  { zin: 'Op het plein staat een kas-\ntanjeboom.', fouten: [
    af('kas-\ntanjeboom', 'ka-\nstanjeboom', 'Staan er twee medeklinkers tussen de klinkers, dan breek je ertussen af: kas-tan-je-boom.'),
    af('kas-\ntanjeboom', 'kas\n-tanjeboom', STREEP_EIND),
    af('kas-\ntanjeboom', 'kas\ntanjeboom', STREEP_NODIG),
    p('tanjeboom.', 'tanjeboom', EIND_PUNT),
  ] },
  { zin: 'Juf leest voor uit een span-\nnend boek.', fouten: [
    af('span-\nnend', 'spann-\nend', LETTERGREEP('span-nend')),
    af('span-\nnend', 'span\n-nend', STREEP_EIND),
    af('span-\nnend', 'span\nnend', STREEP_NODIG),
    h('Juf leest', 'juf leest', BEGIN),
  ] },
  { zin: 'Morgen komt de school-\nfotograaf langs.', fouten: [
    af('school-\nfotograaf', 'schoolf-\notograaf', DELEN('school-fotograaf')),
    af('school-\nfotograaf', 'school\n-fotograaf', STREEP_EIND),
    af('school-\nfotograaf', 'school\nfotograaf', STREEP_NODIG),
    h('Morgen', 'morgen', BEGIN),
  ] },
  { zin: 'Na de gymles moeten we ons om-\nkleden.', fouten: [
    af('om-\nkleden', 'omk-\nleden', DELEN('om-kleden')),
    af('om-\nkleden', 'om\n-kleden', STREEP_EIND),
    af('om-\nkleden', 'om\nkleden', STREEP_NODIG),
    p('kleden.', 'kleden', EIND_PUNT),
  ] },

  // ── hoofdletters en punten in zinnen met een streepje in een woord ───────
  { zin: 'Op het strand vonden we een zee-egel en een zeester.', fouten: [
    h('Op het', 'op het', BEGIN),
    p('zeester.', 'zeester', EIND_PUNT),
  ] },
  { zin: 'Mijn ex-buurman woont nu in Noord-Brabant.', fouten: [
    h('Mijn', 'mijn', BEGIN),
    h('Noord-', 'noord-', 'Noord hoort bij de naam Noord-Brabant: hoofdletter.'),
  ] },
  { zin: 'Na het auto-ongeluk stond de autoweg urenlang vast.', fouten: [
    h('Na het', 'na het', BEGIN),
  ] },
  { zin: 'Vul je voor- en achternaam in op het formulier.', fouten: [
    h('formulier', 'Formulier', GEEN_NAAM),
    p('formulier.', 'formulier', EIND_PUNT),
  ] },
  { zin: 'We keken naar een tv-programma over de Noordzee.', fouten: [
    h('We keken', 'we keken', BEGIN),
    p('tv-', 't.v.-', 'Een letterwoord als tv krijgt geen punten.'),
  ] },
  { zin: 'Bij de in- en uitgang van de supermarkt stonden karretjes.', fouten: [
    h('Bij de', 'bij de', BEGIN),
  ] },
  { zin: 'De radio-omroep sprak met een oud-leerling van onze school.', fouten: [
    h('onze school', 'onze School', GEEN_NAAM),
  ] },
  { zin: 'In Zuid-Afrika zagen we een zeearend boven het water.', fouten: [
    h('het water', 'het Water', GEEN_NAAM),
  ] },
  { zin: 'Mijn klasgenoot kreeg een cd-speler en een fotoalbum.', fouten: [
  ] },
  { zin: 'Bij de wc-deur hangt een briefje voor de schoonmaker.', fouten: [
    p('wc-', 'w.c.-', 'Een letterwoord als wc krijgt geen punten.'),
  ] },

  // ── hoofdletters ────────────────────────────────────────────────────────
  { zin: 'Op dinsdag 4 maart gaan we met de bus naar Den Haag.', fouten: [
    h('dinsdag', 'Dinsdag', 'Dagen van de week krijgen een kleine letter.'),
    h('maart', 'Maart', 'Maanden krijgen een kleine letter.'),
    h('Den Haag', 'den Haag', '"Den" hoort bij de plaatsnaam en krijgt een hoofdletter.'),
  ] },
  { zin: 'In Frankrijk spreken ze Frans en eten ze veel stokbrood.', fouten: [
    h('Frans ', 'frans ', 'Talen krijgen een hoofdletter.'),
    h('Frankrijk', 'frankrijk', 'Landen krijgen een hoofdletter.'),
    h('stokbrood', 'Stokbrood', GEEN_NAAM),
  ] },
  { zin: "'s Morgens fiets ik met Ayoub naar school.", fouten: [
    h("'s Morgens", "'S morgens", "Bij 's aan het begin krijgt het tweede woord de hoofdletter: 's Morgens."),
    h("'s Morgens", "'s morgens", "Een zin begint met een hoofdletter. Bij 's krijgt het tweede woord hem: 's Morgens."),
    h('Ayoub', 'ayoub', 'Een naam krijgt een hoofdletter.'),
    p('school.', 'school', EIND_PUNT),
  ] },
  { zin: 'Mevrouw De Jong is onze nieuwe juf.', fouten: [
    h('Mevrouw De Jong', 'Mevrouw de Jong', 'Zonder voornaam ervoor krijgt "De" een hoofdletter: mevrouw De Jong.'),
    h('onze', 'Onze', GEEN_NAAM),
    h('juf.', 'Juf.', GEEN_NAAM),
  ] },
  { zin: 'Tijdens de Tweede Wereldoorlog was Nederland bezet.', fouten: [
    h('Tweede Wereldoorlog', 'tweede wereldoorlog', 'De Tweede Wereldoorlog is een naam: hoofdletters.'),
    h('Nederland', 'nederland', 'Landen krijgen een hoofdletter.'),
    h('bezet', 'Bezet', GEEN_NAAM),
  ] },
  { zin: 'Lisa de Vries woont in een Amsterdams grachtenpand.', fouten: [
    h('Lisa de Vries', 'Lisa De Vries', 'Met de voornaam ervoor krijgt "de" een kleine letter: Lisa de Vries.'),
    h('Amsterdams', 'amsterdams', 'Een woord dat van een plaatsnaam komt (Amsterdams) krijgt een hoofdletter.'),
  ] },
  { zin: 'In het noorden van het land ligt de provincie Groningen.', fouten: [
    h('noorden', 'Noorden', 'Windrichtingen krijgen een kleine letter.'),
    h('provincie', 'Provincie', GEEN_NAAM),
    h('Groningen', 'groningen', 'Een provincie is een naam: hoofdletter.'),
  ] },
  { zin: 'Onze buren komen uit Turkije en vieren het Suikerfeest.', fouten: [
    h('Turkije', 'turkije', 'Landen krijgen een hoofdletter.'),
    h('Suikerfeest', 'suikerfeest', 'Feestdagen als het Suikerfeest krijgen een hoofdletter.'),
    h('buren', 'Buren', GEEN_NAAM),
  ] },
  { zin: 'In de zomervakantie gingen we naar Spanje en Portugal.', fouten: [
    h('zomervakantie', 'Zomervakantie', 'Seizoenen en vakanties krijgen een kleine letter.'),
    h('Spanje', 'spanje', 'Landen krijgen een hoofdletter.'),
    h('Portugal', 'portugal', 'Landen krijgen een hoofdletter.'),
  ] },
  { zin: 'Mijn tante is een Duitse en woont vlak bij de grens.', fouten: [
    h('Duitse', 'duitse', 'Iemand uit een land (een Duitse) krijgt een hoofdletter.'),
    h('grens', 'Grens', GEEN_NAAM),
    h('tante', 'Tante', GEEN_NAAM),
  ] },

  // ── punten ──────────────────────────────────────────────────────────────
  { zin: 'Neem o.a. je gymschoenen en een handdoek mee.', fouten: [
    p('o.a.', 'oa', 'De afkorting o.a. (onder andere) krijgt punten.'),
    p('mee.', 'mee', EIND_PUNT),
    p('o.a.', 'o.a', 'Bij o.a. hoort na elke letter een punt.'),
  ] },
  { zin: 'De wandeling is 5 km lang en duurt ongeveer twee uur.', fouten: [
    p('km', 'km.', 'Na een maat als km komt geen punt.'),
    p('uur.', 'uur', EIND_PUNT),
    h('De wandeling', 'de wandeling', BEGIN),
  ] },
  { zin: 'Ik verzamel stickers, kaarten, knikkers enz.', fouten: [
    p('enz.', 'enz..', 'Eindigt de zin op een afkorting met een punt, dan zet je geen tweede punt.'),
    p('enz.', 'enz', 'De afkorting enz. krijgt een punt.'),
    k('kaarten, knikkers', 'kaarten knikkers', 'Tussen de dingen in een opsomming komt een komma.'),
    k('knikkers enz.', 'knikkers, enz.', 'Voor "enz." komt geen komma.'),
  ] },
  { zin: 'De les begint om half negen, d.w.z. over tien minuten.', fouten: [
    p('d.w.z.', 'dwz', 'De afkorting d.w.z. (dat wil zeggen) krijgt punten.'),
    p('minuten.', 'minuten', EIND_PUNT),
    h('half negen', 'Half negen', GEEN_NAAM),
  ] },
  { zin: 'Mijn zusje is 1,20 m lang en weegt 25 kg.', fouten: [
    p('m lang', 'm. lang', 'Na een maat als m komt geen punt.'),
    p('kg.', 'kg', 'De zin is af, dus er hoort een punt achter.'),
    p('kg.', 'kg..', 'Na kg komt geen punt van de maat; alleen de punt van de zin.'),
  ] },
  { zin: 'Dhr. Bakker is de directeur van onze school.', fouten: [
    p('Dhr.', 'Dhr', 'De afkorting dhr. (de heer) krijgt een punt.'),
    p('school.', 'school', EIND_PUNT),
    h('Bakker', 'bakker', 'Een achternaam krijgt een hoofdletter.'),
    h('directeur', 'Directeur', GEEN_NAAM),
  ] },
  { zin: 'De ANWB heeft o.a. wegenkaarten van heel Europa.', fouten: [
    p('ANWB', 'A.N.W.B.', 'Een letterwoord als ANWB krijgt geen punten.'),
    p('o.a.', 'oa', 'De afkorting o.a. (onder andere) krijgt punten.'),
    h('Europa', 'europa', 'Werelddelen krijgen een hoofdletter.'),
  ] },
  { zin: 'Er stonden ca. dertig kinderen in de rij.', fouten: [
    p('ca.', 'ca', 'De afkorting ca. (circa) krijgt een punt.'),
    p('rij.', 'rij', EIND_PUNT),
    h('dertig', 'Dertig', GEEN_NAAM),
  ] },
  { zin: 'Kom je vanmiddag spelen? Ik ben de hele dag thuis.', fouten: [
    p('spelen?', 'spelen.', 'Een vraag eindigt met een vraagteken.'),
    p('thuis.', 'thuis?', 'Dit is geen vraag, dus een punt.'),
    h('Ik ben', 'ik ben', 'Na een vraagteken begint een nieuwe zin met een hoofdletter.'),
  ] },
  { zin: 'Mijn opa is geboren in 1958. Hij woonde toen in Indonesië.', fouten: [
    p('1958.', '1958', 'De eerste zin is af: daar hoort een punt.'),
    p('Indonesië.', 'Indonesië', EIND_PUNT),
    h('Hij', 'hij', 'Na een punt begint een nieuwe zin met een hoofdletter.'),
  ] },
]

// ── vragen maken ───────────────────────────────────────────────────────────

function bereik(zin, f) {
  const start = zin.indexOf(f.van)
  return [start, start + f.van.length]
}
const overlapt = (x, y) => x[0] < y[1] && y[0] < x[1]

// Past fouten toe, achteraan beginnend zodat de posities kloppen.
export function pasToe(zin, fouten) {
  return [...fouten]
    .map(f => ({ f, r: bereik(zin, f) }))
    .sort((x, y) => y.r[0] - x.r[0])
    .reduce((z, { f, r }) => z.slice(0, r[0]) + f.naar + z.slice(r[1]), zin)
}

// Alle foute versies die je met de gekozen onderdelen kunt maken: elke fout
// los, en twee fouten samen als ze elkaar niet raken.
export function foutVersies(item, cats) {
  const fouten = item.fouten.filter(f => cats.includes(f.cat))
  const sets = fouten.map(f => [f])
  for (let i = 0; i < fouten.length; i++) {
    for (let j = i + 1; j < fouten.length; j++) {
      if (!overlapt(bereik(item.zin, fouten[i]), bereik(item.zin, fouten[j]))) sets.push([fouten[i], fouten[j]])
    }
  }
  const gezien = new Set([item.zin])
  const versies = []
  for (const set of sets) {
    const tekst = pasToe(item.zin, set)
    if (gezien.has(tekst)) continue
    gezien.add(tekst)
    versies.push({ tekst, fouten: set })
  }
  return versies
}

export const bruikbaar = (item, cats) => foutVersies(item, cats).length >= 3

function schud(arr) {
  const x = [...arr]
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]]
  }
  return x
}

// Eén vraag: de goede zin + drie foute. Bij voorkeur foute zinnen met maar
// één fout — die zijn het lastigst te zien. Bij meer onderdelen komen er
// zoveel mogelijk verschillende onderdelen in de foute zinnen terug.
export function maakVraag(item, cats) {
  const versies = schud(foutVersies(item, cats))
  const enkel = versies.filter(v => v.fouten.length === 1)
  const dubbel = versies.filter(v => v.fouten.length === 2)
  const gekozen = []
  const catsGehad = new Set()
  for (const v of enkel) {
    if (gekozen.length < 3 && !catsGehad.has(v.fouten[0].cat)) { gekozen.push(v); catsGehad.add(v.fouten[0].cat) }
  }
  for (const v of [...enkel, ...dubbel]) {
    if (gekozen.length < 3 && !gekozen.includes(v)) gekozen.push(v)
  }
  return {
    zin: item.zin,
    opties: schud([{ tekst: item.zin, goed: true, fouten: [] }, ...gekozen.map(v => ({ ...v, goed: false }))]),
  }
}

export function vragenVoor(cats) {
  return schud(ZINNEN.filter(it => bruikbaar(it, cats)))
}
