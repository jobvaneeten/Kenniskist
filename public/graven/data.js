/* Diepgravers — alle cijfers op één plek. Zie docs/graafspel/PROMPT.md.
   Bewust los van spel.js: de balans is het ding dat je wilt kunnen bijstellen
   zonder door de motor te hoeven.

   Uitgangspunt van de economie: boren gaat vlot, je tank is klein, en alles in
   de winkel is duur. Een kind moet weken kunnen sparen voor de laatste boor,
   een mooie lak of een nieuwe wereld — niet binnen een middag alles hebben. */

// Eén tegel is 2 meter diep. De wereld is 500 rijen = 1000 m.
const TEGEL = 34
const KOLOMMEN = 24
const RIJEN = 500
const METER_PER_RIJ = 2

// ── De acht lagen ─────────────────────────────────────────────────────────
// vanaf/tot in meters. `boor` = welk boorniveau je minimaal nodig hebt.
// `dichtheid` = kans dat een tegel erts is. De kléuren staan niet hier maar
// per wereld (zie WERELDEN): dezelfde lagen zien er op Mars anders uit.
const LAGEN = [
  { naam: 'Zandlaag',    vanaf: 0,   tot: 60,   boor: 1, dichtheid: 0.12, erts: 0, gas: 0,     lava: 0,     los: 0,    fuel: 1.0,  hitte: 0 },
  { naam: 'Kleilaag',    vanaf: 60,  tot: 140,  boor: 1, dichtheid: 0.12, erts: 1, gas: 0,     lava: 0,     los: 0,    fuel: 1.0,  hitte: 0 },
  { naam: 'Kalksteen',   vanaf: 140, tot: 240,  boor: 2, dichtheid: 0.11, erts: 2, gas: 0,     lava: 0,     los: 0,    fuel: 1.05, hitte: 0 },
  { naam: 'Basalt',      vanaf: 240, tot: 360,  boor: 3, dichtheid: 0.11, erts: 3, gas: 0.028, lava: 0,     los: 0,    fuel: 1.1,  hitte: 0 },
  { naam: 'Kristalgrot', vanaf: 360, tot: 500,  boor: 4, dichtheid: 0.10, erts: 4, gas: 0.03,  lava: 0.014, los: 0,    fuel: 1.15, hitte: 0 },
  { naam: 'Obsidiaan',   vanaf: 500, tot: 660,  boor: 5, dichtheid: 0.10, erts: 5, gas: 0.02,  lava: 0.02,  los: 0.05, fuel: 1.2,  hitte: 0 },
  { naam: 'IJsader',     vanaf: 660, tot: 840,  boor: 6, dichtheid: 0.09, erts: 6, gas: 0.018, lava: 0.016, los: 0.06, fuel: 1.65, hitte: 0 },
  { naam: 'Magmakern',   vanaf: 840, tot: 1000, boor: 7, dichtheid: 0.09, erts: 7, gas: 0.022, lava: 0.03,  los: 0.07, fuel: 1.45, hitte: 1 },
]

// ── De acht ertsen ────────────────────────────────────────────────────────
// De waarde wordt nog vermenigvuldigd met de `factor` van de wereld waarin je
// graaft: een duurdere wereld levert per brok veel meer op.
const ERTSEN = [
  { naam: 'Koper',       kleur: '#e08a4a', waarde: 8 },
  { naam: 'IJzer',       kleur: '#cfd6dd', waarde: 20 },
  { naam: 'Zilver',      kleur: '#dff0ff', waarde: 46 },
  { naam: 'Goud',        kleur: '#ffc23c', waarde: 105 },
  { naam: 'Amethist',    kleur: '#c06bff', waarde: 235 },
  { naam: 'Platina',     kleur: '#7ef0e0', waarde: 520 },
  { naam: 'Diamant',     kleur: '#8fd8ff', waarde: 1150 },
  { naam: 'Sterrenerts', kleur: '#ff5ecb', waarde: 2500 },
]

// ── De werelden ───────────────────────────────────────────────────────────
// Elke wereld heeft dezelfde acht lagen, maar een eigen palet, eigen lucht en
// een eigen opbrengstfactor. Een nieuwe wereld kopen is dus geen plaatje maar
// een echte stap vooruit in je economie — en hij kost er ook naar.
const WERELDEN = [
  {
    key: 'oude-mijn', naam: 'De Oude Mijn', emoji: '⛏️', prijs: 0, factor: 1,
    sfeer: 'Waar iedereen begint. Aarde, klei en steen.',
    lucht: ['#04061a', '#0d1738', '#27365f'], maan: '#cfe4ff',
    lagen: [
      ['#6b4f2a', '#7d5d33'], ['#7a4a3a', '#8c5745'], ['#5f6570', '#6d7581'], ['#3c4250', '#49505f'],
      ['#3b2f5e', '#493a71'], ['#241f2e', '#2f2839'], ['#2b4a5c', '#35596d'], ['#4a1f1f', '#5c2727'],
    ],
  },
  {
    key: 'rode-planeet', naam: 'Rode Planeet', emoji: '🔴', prijs: 32000, factor: 2.2,
    sfeer: 'Roestrood zand, dunne lucht, twee manen.',
    lucht: ['#150612', '#3a1020', '#7a2b2b'], maan: '#ffd2b0',
    lagen: [
      ['#8a4a28', '#a35c32'], ['#96412c', '#ac5138'], ['#7a5148', '#8c6055'], ['#5a3038', '#6b3a44'],
      ['#4d2350', '#5e2c63'], ['#33161f', '#412028'], ['#3f5a6b', '#4d6d80'], ['#6b1c12', '#84271a'],
    ],
  },
  {
    key: 'bevroren-maan', naam: 'Bevroren Maan', emoji: '🧊', prijs: 175000, factor: 3.8,
    sfeer: 'Alles blauw en spiegelend. Het kraakt onder je rupsen.',
    lucht: ['#020a16', '#07223f', '#12466e'], maan: '#dff4ff',
    lagen: [
      ['#2f5c72', '#3c7189'], ['#2a5068', '#37647e'], ['#4a6c80', '#5a8098'], ['#27455e', '#325674'],
      ['#2b3b6e', '#374a85'], ['#141d33', '#1d2947'], ['#3e7d94', '#4f95ad'], ['#1c3350', '#274363'],
    ],
  },
  {
    key: 'kristalrijk', naam: 'Kristalrijk', emoji: '💎', prijs: 900000, factor: 6.5,
    sfeer: 'Een wereld van glas en licht. Hier ligt het echte geld.',
    lucht: ['#0b0320', '#2a0a4d', '#5c1f8c'], maan: '#f0d4ff',
    lagen: [
      ['#5a3a86', '#6d49a0'], ['#6b2f78', '#80398f'], ['#3f4d8c', '#4d5da6'], ['#2b3a6e', '#374885'],
      ['#5b2170', '#6f2a88'], ['#1d1030', '#2a1845'], ['#2e6b8c', '#3a82a8'], ['#7a1450', '#941b62'],
    ],
  },
]

// ── De acht upgradesporen, acht niveaus elk ───────────────────────────────
// Niveau 1 heeft iedereen bij de start. De eerste stap blijft met opzet
// goedkoop — binnen een paar duiken te betalen, anders blijven ze niet hangen.
// Daarna loopt het hard op: niveau 8 is een spaardoel van weken.
const SPOREN = [
  {
    sleutel: 'boor', naam: 'Boor', kleur: '#a855f7', icoon: '⛏️',
    wat: (n) => `graaft door laag ${Math.min(n === 1 ? 2 : n + 1, 8)} · tempo ${n}`,
    basis: 180,
    // Seconden per tegel. Nog een slag sneller: blokken moeten lekker vlot
    // stukgaan, anders voelt graven als wachten.
    tempo: [0.30, 0.25, 0.21, 0.175, 0.145, 0.12, 0.095, 0.075],
  },
  {
    sleutel: 'tank', naam: 'Tank', kleur: '#06d6a0', icoon: '⛽',
    wat: (n) => `${[40, 58, 80, 108, 145, 195, 260, 350][n - 1]} liter brandstof`,
    basis: 160,
    // Je begint met een kleine tank: eerder terug, sneller spannend.
    liters: [40, 58, 80, 108, 145, 195, 260, 350],
  },
  {
    sleutel: 'laadruim', naam: 'Laadruim', kleur: '#ffc23c', icoon: '📦',
    wat: (n) => `${[6, 9, 13, 18, 24, 32, 42, 55][n - 1]} brokken erts`,
    basis: 170,
    plekken: [6, 9, 13, 18, 24, 32, 42, 55],
  },
  {
    sleutel: 'romp', naam: 'Romp', kleur: '#ff6150', icoon: '🛡️',
    wat: (n) => `${[3, 4, 5, 6, 7, 8, 10, 12][n - 1]} klappen incasseren`,
    basis: 200,
    schade: [3, 4, 5, 6, 7, 8, 10, 12],
  },
  {
    sleutel: 'motor', naam: 'Motor', kleur: '#38bdf8', icoon: '🚀',
    wat: (n) => `rijden ${n} · stijgen ${n}`,
    basis: 150,
    rij: [150, 168, 186, 205, 224, 244, 266, 290],
    stijg: [430, 470, 512, 556, 602, 650, 706, 770],
  },
  {
    sleutel: 'koplamp', naam: 'Koplamp', kleur: '#ffe9b0', icoon: '💡',
    wat: (n) => `zicht ${n} · ${[ 'schemerlampje', 'kleine bundel', 'brede bundel', 'verre bundel',
      'zoeklicht', 'sterk zoeklicht', 'schijnwerper', 'daglicht' ][n - 1]}`,
    basis: 190,
    straal: [118, 140, 164, 190, 220, 254, 292, 340],
  },
  {
    sleutel: 'magneet', naam: 'Magneet', kleur: '#7ef0e0', icoon: '🧲',
    wat: (n) => (n === 1 ? 'nog geen magneet' : `trekt erts van ${[0, 1, 2, 2, 3, 4, 5, 6][n - 1]} tegels ver naar je toe`),
    basis: 320,
    // Straal in kaarteenheden waarbinnen los erts vanzelf naar je toe komt.
    straal: [0, 42, 62, 84, 108, 134, 164, 200],
  },
  {
    sleutel: 'koeling', naam: 'Koeling', kleur: '#8fd8ff', icoon: '❄️',
    wat: (n) => (n >= 8 ? 'volledig hittebestendig' : `houdt ${n} van de 8 hitte tegen`),
    basis: 240,
    // Hitteschade per seconde in de magmakern. Zonder koeling hou je het daar
    // geen halve minuut vol.
    hitte: [2.4, 2.0, 1.7, 1.35, 1.0, 0.65, 0.3, 0],
  },
  {
    sleutel: 'radar', naam: 'Radar', kleur: '#4ade80', icoon: '📡',
    wat: (n) => (n === 1 ? 'geen radar' : `laat erts dóór de steen heen zien, ${[0, 3, 4, 6, 8, 10, 13, 16][n - 1]} tegels ver`),
    basis: 280,
    // Straal in kaarteenheden waarbinnen verborgen erts oplicht.
    straal: [0, 100, 150, 200, 260, 330, 420, 540],
  },
  {
    sleutel: 'handelaar', naam: 'Handelaar', kleur: '#ffc23c', icoon: '🤝',
    wat: (n) => `je erts brengt ${[0, 8, 17, 27, 38, 50, 64, 80][n - 1]}% meer op`,
    basis: 300,
    bonus: [1, 1.08, 1.17, 1.27, 1.38, 1.5, 1.64, 1.8],
  },
  {
    sleutel: 'geluk', naam: 'Geluk', kleur: '#c06bff', icoon: '🍀',
    wat: (n) => `${[0, 15, 30, 48, 68, 90, 115, 145][n - 1]}% meer erts in de grond`,
    basis: 260,
    factor: [1, 1.15, 1.3, 1.48, 1.68, 1.9, 2.15, 2.45],
  },
  {
    sleutel: 'schokdemper', naam: 'Schokdemper', kleur: '#f472b6', icoon: '🪶',
    wat: (n) => (n === 1 ? 'geen demping' : `vallend gesteente en gas doen ${[0, 20, 35, 48, 60, 72, 85, 100][n - 1]}% minder pijn`),
    basis: 230,
    demping: [1, 0.8, 0.65, 0.52, 0.4, 0.28, 0.15, 0],
  },
]

// Prijs om van niveau n naar n+1 te gaan. De factor 2.9 maakt het eindspel
// echt duur: de laatste stap van een spoor kost ruim honderdduizend.
function prijsVan(spoor, niveau) {
  if (niveau >= 8) return null
  return Math.round(spoor.basis * Math.pow(2.9, niveau - 1) / 10) * 10
}

// ── Lakken voor je graafwagen ─────────────────────────────────────────────
// Puur uiterlijk, en juist daarom duur: dit is waar een kind maanden naar
// toewerkt. `romp`/`rand`/`cabine` sturen rechtstreeks de tekening aan.
const LAKKEN = [
  { key: 'staal',    naam: 'Staalgrijs',   prijs: 0,      romp: ['#2f394d', '#161c27'], rand: '#9fb0c9', cabine: '#b9f0ff' },
  { key: 'zand',     naam: 'Woestijngeel', prijs: 3000,   romp: ['#8a6a2e', '#3e2f12'], rand: '#ffd166', cabine: '#fff0c2' },
  { key: 'bos',      naam: 'Jungle',       prijs: 9000,   romp: ['#2f6b3f', '#12301d'], rand: '#4ade80', cabine: '#c8ffdd' },
  { key: 'oceaan',   naam: 'Diepzee',      prijs: 22000,  romp: ['#1d4e6b', '#0a2033'], rand: '#38bdf8', cabine: '#c0efff' },
  { key: 'magma',    naam: 'Magma',        prijs: 55000,  romp: ['#7a2a12', '#2c0d05'], rand: '#ff8a1e', cabine: '#ffd9b0' },
  { key: 'gif',      naam: 'Gifgroen',     prijs: 110000, romp: ['#4a6b16', '#1b2807'], rand: '#b6ff3c', cabine: '#e8ffc2' },
  { key: 'nacht',    naam: 'Middernacht',  prijs: 220000, romp: ['#2a1a3e', '#0d0714'], rand: '#a855f7', cabine: '#e5d0ff' },
  { key: 'kristal',  naam: 'Kristal',      prijs: 900000, romp: ['#4a5f8e', '#141a2e'], rand: '#8fd8ff', cabine: '#ffffff' },
  { key: 'goud',     naam: 'Massief goud', prijs: 1600000, romp: ['#8a6a12', '#3a2a04'], rand: '#ffc23c', cabine: '#fff3c2' },
  { key: 'sterren',  naam: 'Sterrenstof',  prijs: 3000000, romp: ['#6a1a52', '#1c0614'], rand: '#ff5ecb', cabine: '#ffd9f2' },
]

// ── Tegelsoorten ──────────────────────────────────────────────────────────
const LEEG = 0
const GROND = 1
const ERTS = 2
const GAS = 3
const LAVA = 4
const LOS = 5
const KERN = 6   // de Sterrenkern helemaal onderin
const MUUR = 7   // rand van de wereld, niet te boren

// ── Uitleg en meldingen ───────────────────────────────────────────────────
const UITLEG_KEER = 3          // zo vaak krijgt een kind de panelen vanzelf
const DUIKEN_PER_BELONING = 3
// Bovengrens op wat er in kk_gr_duiken mag staan. Normaal kom je nooit boven
// de drie uit — alleen de code 0001 in het codescherm van de app zet er meer
// neer (zie src/App.jsx).
const MAX_DUIKEN = 100

const DOOD_REDENEN = {
  brandstof: { icoon: '⛽', titel: 'Je brandstof was op', tekst: 'Je stond stil onder de grond en kwam niet meer boven. Ga de volgende keer eerder terug — omhoog vliegen kost het meest.' },
  lava:      { icoon: '🌋', titel: 'Je reed de lava in', tekst: 'Lava herken je aan het gloeiende licht. Graaf eromheen, nooit erdoorheen.' },
  romp:      { icoon: '💥', titel: 'Je romp is bezweken', tekst: 'Te veel klappen van gasbellen of vallend gesteente. Een sterkere romp houdt meer uit.' },
  hitte:     { icoon: '🔥', titel: 'Je bent verbrand', tekst: 'In de magmakern is het gloeiend heet. Zonder betere koeling hou je het daar niet lang uit.' },
  worm:      { icoon: '🪱', titel: 'De Magmaworm had je te pakken', tekst: 'Je kunt hem niet verslaan met je boor. Lok hem onder een los blok en graaf dat los.' },
}
