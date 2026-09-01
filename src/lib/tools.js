// Registry van oefentools: koppelt een tool_id (zoals opgeslagen in
// resultaten.tool_id) aan een leesbare naam, vak, groepen en aan hoe een
// weektaak-opdracht hem configureert.
//
// Bewust puur data — geen React-imports. Het leerkrachtenportaal importeert
// dit bestand om labels te tonen en een weektaak samen te stellen, zonder
// daarmee ook meteen elke game-component te bundelen. De renderkant (welke
// component een tool_id daadwerkelijk opent voor de leerling) staat apart in
// src/games/toolRender.jsx.
//
// `eenheid` bepaalt hoe voortgang gemeten wordt (zie weektaak_voortgang-view,
// migratie 0007):
//   'opgaven' — max_score telt opgaven; `aantal` is instelbaar door de
//               leerkracht en de tool stopt na dat aantal.
//   'sessies' — max_score is punten of tijd (de tool draait een vaste
//               woorden-/vragenlijst tot het eind); `aantal` betekent hoe
//               vaak de tool gemaakt moet worden, niet hoeveel opgaven.
//   'woorden' — als 'opgaven', maar dan woorden (dictee). Aparte naam puur
//               zodat de leerkracht "12 woorden" leest in plaats van
//               "12 opgaven"; de voortgang telt precies zo.

export const VAKKEN = [
  { key: 'taal',       label: 'Taal' },
  { key: 'spelling',   label: 'Spelling' },
  { key: 'rekenen',    label: 'Rekenen' },
  { key: 'begrijpend', label: 'Begrijpend lezen' },
  { key: 'topo',       label: 'Topografie' },
]

// Eén entry per tool-familie. Families met varianten (dictee, spullen)
// hebben een `varianten`-lijst; die leveren elk hun eigen
// concrete tool_id op via VARIANTEN hieronder.
export const TOOL_FAMILIES = [
  {
    familie: 'taal-woordsoorten', toolId: 'taal-woordsoorten', label: 'Woordsoorten',
    vak: 'taal', groepen: [5, 6, 7, 8], aantalInstelbaar: true, standaardAantal: 20, eenheid: 'opgaven',
    configVelden: [
      { key: 'soorten', type: 'checkboxes', label: 'Woordsoorten', min: 2, opties: [
        'lidwoord', 'zelfstandig naamwoord', 'werkwoord', 'bijvoeglijk naamwoord',
        'bijwoord', 'voornaamwoord', 'voorzetsel', 'telwoord', 'voegwoord',
      ] },
    ],
  },
  {
    familie: 'taal-zinsdelen', toolId: 'taal-zinsdelen', label: 'Zinsdelen',
    vak: 'taal', groepen: [5, 6, 7, 8], aantalInstelbaar: true, standaardAantal: 20, eenheid: 'opgaven',
    configVelden: [
      { key: 'zinsdelen', type: 'checkboxes', label: 'Zinsdelen', min: 2, opties: [
        'onderwerp', 'persoonsvorm', 'gezegde', 'lijdend voorwerp', 'meewerkend voorwerp', 'bepaling',
      ] },
      { key: 'samengesteld', type: 'bool', label: 'Ook samengestelde zinnen' },
    ],
  },
  {
    // Blok 1 = thema 1 "Ik ontmoet", les 2/7/12 (zie
    // src/games/woordenschatData.js). Komt er een blok bij, dan wordt dit een
    // familie met `varianten` zoals bij het dictee.
    familie: 'woordenschat', toolId: 'woordenschat-blok1', label: 'Woordenschat blok 1',
    vak: 'taal', groepen: [7],
    aantalInstelbaar: true, standaardAantal: 20, eenheid: 'opgaven', configVelden: [],
  },
  {
    familie: 'werkwoordspelling', toolId: 'werkwoordspelling', label: 'Werkwoordspelling',
    vak: 'spelling', groepen: [6, 7, 8], aantalInstelbaar: true, standaardAantal: 20, eenheid: 'opgaven',
    configVelden: [
      { key: 'categorieen', type: 'checkboxes', label: 'Categorieën', min: 1, opties: [
        'tt', 'vtZwak', 'vtSterk', 'vd',
      ] },
      { key: 'metOnderwerp', type: 'bool', label: 'Eerst onderwerp markeren' },
    ],
  },
  {
    familie: 'dictee-thema', label: 'Dictee', vak: 'spelling', groepen: [7],
    // `aantal` is hier het aantal woorden: het dictee stopt erna en rapporteert
    // één regel per sessie met max_score = het aantal gemaakte woorden. Zo telt
    // de weektaak "0/12" in plaats van "0/1 keer gemaakt".
    aantalInstelbaar: true, standaardAantal: 12, eenheid: 'woorden',
    configVelden: [],
    varianten: Array.from({ length: 8 }, (_, i) => ({
      toolId: `dictee-thema${i + 1}`, label: `Dictee blok ${i + 1}`, thema: i + 1,
    })),
  },
  {
    familie: 'dictee-categorie', toolId: 'dictee-categorie', label: 'Spelling per categorie',
    vak: 'spelling', groepen: [7], aantalInstelbaar: true, standaardAantal: 12, eenheid: 'woorden',
    configVelden: [
      { key: 'cats', type: 'checkboxes', label: 'Categorieën (leeg = allemaal door elkaar)', min: 0, opties: [
        { value: 'slang', label: 'slang — ng' },
        { value: 'stinkdier', label: 'stinkdier — nk' },
        { value: 'specht', label: 'specht — cht' },
        { value: 'pechvogel', label: 'pechvogel — ch (weetwoord)' },
        { value: 'stokstaart', label: 'stokstaart — samenstelling' },
        { value: 'beer', label: 'beer — ee / oo / eu' },
        { value: 'haai', label: 'haai — aai / ooi / oei' },
        { value: 'leeuw', label: 'leeuw — uw / eeuw / ieuw' },
        { value: 'hond_hert', label: 'hond / hert — /t/ aan eind: maak langer' },
        { value: 'gestreept', label: 'gestreept — stomme klank → e' },
        { value: 'krekel', label: 'krekel — lange klank open lettergreep: 1 letter' },
        { value: 'kikker', label: 'kikker — korte klank: dubbele medeklinker' },
        { value: 'duiven_ganzen', label: 'duiven / ganzen — f→v en s→z' },
        { value: 'pauw_goudvis', label: 'pauw / goudvis — /au/ (au of ou)' },
        { value: 'geit_bij', label: 'geit / bij — /ei/ (ei of ij)' },
        { value: 'muisje', label: 'muisje — verkleinwoord -je/-tje/-pje' },
        { value: 'biggetje', label: 'biggetje — verkleinwoord -etje' },
        { value: 'lamaatje', label: 'lamaatje — verkleinwoord -aatje/-ootje/-uutje' },
        { value: 'winterkoninkje', label: 'winterkoninkje — verkleinwoord -inkje (nk)' },
        { value: 'ara', label: 'ara — eindigt op /aa/: 1 a' },
        { value: 'gevaarlijk', label: 'giftig / gevaarlijk — -ig en -lijk' },
        { value: 'kameel', label: 'kameel — onduidelijke a/aa: 1 letter' },
        { value: 'pandas', label: "panda's — meervoud/bezit 's" },
        { value: 'krab', label: 'krab — /p/ aan eind → b' },
        { value: 'eieren', label: 'eieren — -eren: twee e' },
        { value: 'citroenvlinder', label: 'citroenvlinder — c = /s/' },
        { value: 'hoogte', label: 'hoogte — -te / -ste' },
        { value: 'bizon', label: 'bizon — /ie/ → i' },
        { value: 'tropisch', label: 'tropisch — -isch' },
        { value: 'snachts', label: "'s nachts — 's-woord" },
        { value: 'politiehond', label: 'politiehond — -tie' },
        { value: 'cavia', label: 'cavia — c = /k/' },
        { value: 'baviaan_leguaan', label: 'baviaan / leguaan — verborgen /j/ of /w/' },
        { value: 'chimpansee', label: 'chimpansee — /sj/ → ch' },
        { value: 'puppy', label: 'puppy — Griekse y' },
        { value: 'jaguar', label: 'jaguar — leenwoord (é, eau, ou, air, oir)' },
        { value: 'page', label: 'page — g = /zj/' },
        { value: 'axolotl', label: 'axolotl — /ks/ → x' },
        { value: 'weetwoord', label: 'weetwoord — uit je hoofd' },
        { value: 'python', label: 'python — th' },
        { value: 'snelheid', label: 'snelheid — -heid / -teit' },
        { value: 'wollen', label: 'wollen — stoffelijk -en' },
        { value: 'gespleten', label: 'gespleten — voltooid deelwoord -en/-e' },
        { value: 'reeen', label: 'reeën — meervoud -ën (trema)' },
        { value: 'reuzenschildpad', label: 'reuzenschildpad — tussen-n' },
        { value: 'zee_egel', label: 'zee-egel — koppelteken' },
        { value: 'pinguin', label: 'pinguïn — trema bij klinkerbotsing' },
      ] },
    ],
  },
  {
    familie: 'tafels', toolId: 'tafels', label: 'Tafels & deelsommen',
    vak: 'rekenen', groepen: [4, 5, 6], aantalInstelbaar: false, standaardAantal: 1, eenheid: 'sessies',
    configVelden: [
      { key: 'soort', type: 'keuze', label: 'Soort', opties: ['keer', 'deel'] },
      { key: 'tafels', type: 'checkboxes', label: 'Tafels', min: 1, opties: ['2', '3', '4', '5', '6', '7', '8', '9', '10'] },
    ],
  },
  {
    // Groep/route/doelen worden niet via configVelden gedaan (zoals de andere
    // tools), maar via een eigen widget (VerhaaltjesSommenConfig.jsx) — welke
    // doelen geldig zijn hangt cascaderend af van de gekozen groep+route, dat
    // past niet in de generieke, statische configVelden-editor.
    familie: 'verhaaltjessommen', toolId: 'verhaaltjessommen', label: 'Verhaaltjessommen',
    vak: 'rekenen', groepen: [5, 6, 7, 8], aantalInstelbaar: true, standaardAantal: 20, eenheid: 'opgaven',
    configVelden: [],
  },
  {
    familie: 'breuken-plaatjes', toolId: 'breuken-plaatjes', label: 'Breuken & plaatjes',
    vak: 'rekenen', groepen: [6], aantalInstelbaar: true, standaardAantal: 15, eenheid: 'opgaven',
    configVelden: [],
  },
  {
    familie: 'maten-omrekenen', toolId: 'maten-omrekenen', label: 'Maten omrekenen',
    vak: 'rekenen', groepen: [6, 7], aantalInstelbaar: true, standaardAantal: 15, eenheid: 'opgaven',
    configVelden: [
      { key: 'level', type: 'keuze', label: 'Level', opties: ['1', '2', '3'] },
    ],
  },
  {
    familie: 'procenten-breuken', toolId: 'procenten-breuken', label: 'Procenten · Breuken · Komma',
    vak: 'rekenen', groepen: [7, 8], aantalInstelbaar: true, standaardAantal: 5, eenheid: 'sessies',
    configVelden: [],
  },
  {
    familie: 'spullen', label: 'Duurzaam design', vak: 'begrijpend', groepen: [7, 8],
    aantalInstelbaar: false, standaardAantal: 1, eenheid: 'sessies', configVelden: [],
    varianten: [
      'Coole constructies', 'De beste materialen', 'Leve de fabriek?',
      'Kinderen aan het werk', 'Mobiel binnenstebuiten',
    ].map((naam, i) => ({ toolId: `spullen-les${i + 1}`, label: `Les ${i + 1} — ${naam}`, les: i + 1 })),
  },
  {
    // TopoMaster Europa kaart A: landen, hoofdsteden, zeeën, rivieren en
    // gebergtes. `soorten` bepaalt welke daarvan gevraagd worden, `modus` of de
    // leerling aanwijst of sleept.
    familie: 'topo', label: 'Topografie Europa', vak: 'topo', groepen: [7, 8],
    aantalInstelbaar: true, standaardAantal: 20, eenheid: 'opgaven',
    configVelden: [
      { key: 'soorten', type: 'checkboxes', label: 'Wat vragen we? (leeg = alles van die kaart)', min: 0, opties: [
        { value: 'landen', label: 'Landen' },
        { value: 'hoofdsteden', label: 'Hoofdsteden' },
        { value: 'steden', label: 'Steden (kaart B)' },
        { value: 'regios', label: "Regio's (kaart B)" },
        { value: 'wateren', label: 'Zeeën' },
        { value: 'rivieren', label: 'Rivieren' },
        { value: 'gebergtes', label: 'Gebergtes' },
      ] },
      { key: 'modus', type: 'keuze', label: 'Manier', opties: ['klik', 'sleep'] },
    ],
    varianten: [
      { toolId: 'topo-europa-a', label: 'Kaart A — heel Europa', kaart: 'europa-a' },
      { toolId: 'topo-europa-b', label: 'Kaart B — Noordwest-Europa', kaart: 'europa-b' },
    ],
  },
]

// Platgeslagen: elke concrete tool_id → { toolId, familie, label, vak,
// groepen, aantalInstelbaar, standaardAantal, eenheid, configVelden, variant }
export const TOOL_BY_ID = TOOL_FAMILIES.reduce((acc, fam) => {
  const basis = {
    familie: fam.familie, vak: fam.vak, groepen: fam.groepen,
    aantalInstelbaar: fam.aantalInstelbaar, standaardAantal: fam.standaardAantal,
    eenheid: fam.eenheid, configVelden: fam.configVelden,
  }
  if (fam.varianten) {
    for (const v of fam.varianten) acc[v.toolId] = { ...basis, toolId: v.toolId, label: v.label, variant: v }
  } else {
    acc[fam.toolId] = { ...basis, toolId: fam.toolId, label: fam.label, variant: null }
  }
  return acc
}, {})

// Geeft altijd een string terug, ook voor een onbekende id — er staat al
// productiedata in `resultaten` met tool_id's die niet (meer) in de registry
// staan, en het portaal mag daar niet op crashen.
export function toolLabel(toolId) {
  return TOOL_BY_ID[toolId]?.label ?? toolId
}

export function toolVak(toolId) {
  return TOOL_BY_ID[toolId]?.vak ?? null
}

// Voor de ToolKiezer in het leerkrachtenportaal: standaard filteren op de
// groepen van de klas. Lege lijst (klas.groepen = geen beperking, zie
// migratie 0006) betekent: alles tonen.
export function toolsVoorGroepen(groepen) {
  if (!groepen?.length) return TOOL_FAMILIES
  return TOOL_FAMILIES.filter(fam => fam.groepen.some(g => groepen.includes(g)))
}
