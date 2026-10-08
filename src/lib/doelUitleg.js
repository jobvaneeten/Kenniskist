// Korte uitleg die de leerling ziet vóórdat hij aan een doel gaat oefenen:
// een paar regels + één voorbeeld. Per oefening (toolId) en zijn instellingen,
// zodat hetzelfde doel uit doelen.js altijd dezelfde uitleg krijgt.
//
// uitlegVoor(opdracht) → { regels: string[], voorbeeld?: { vraag, antwoord } }

import { TOOL_BY_ID } from './tools.js'
import { onderdelenVan } from '../games/redactiesommen.js'

const INTERPUNCTIE = {
  komma: [['Bij een opsomming zet je komma’s tussen de woorden, maar niet vóór “en” of “of”.', 'Twee zinnen die aan elkaar vastzitten krijgen een komma, vaak vóór “maar”, “want” of “omdat”.'],
    { vraag: 'Ik koop appels peren en bananen.', antwoord: 'Ik koop appels, peren en bananen.' }],
  aanhalingstekens: [['Wat iemand letterlijk zegt, zet je tussen aanhalingstekens.', 'Komt de spreker eerst? Dan een dubbele punt vóór de aanhalingstekens.'],
    { vraag: 'Juf zegt: Pak je boek.', antwoord: 'Juf zegt: “Pak je boek.”' }],
  afbreekstreepje: [['Past een woord niet meer op de regel? Breek het af tussen twee klankgroepen.', 'Aan het eind van de regel zet je een streepje.'],
    { vraag: 'boterham', antwoord: 'boter- / ham' }],
  hoofdletters: [['Een zin begint met een hoofdletter.', 'Namen van mensen, plaatsen, landen en dagen van feesten krijgen ook een hoofdletter.'],
    { vraag: 'sanne woont in utrecht.', antwoord: 'Sanne woont in Utrecht.' }],
  punten: [['Een gewone zin eindigt met een punt.', 'Een vraag krijgt een vraagteken, een uitroep een uitroepteken.'],
    { vraag: 'Kom je morgen spelen', antwoord: 'Kom je morgen spelen?' }],
}

const ZINSDELEN = [
  'Persoonsvorm: maak de zin vragend. Het werkwoord dat vooraan komt, is de persoonsvorm.',
  'Onderwerp: vraag “Wie of wat + persoonsvorm?”.',
  'Gezegde: alle werkwoorden in de zin samen.',
  'Lijdend voorwerp: vraag “Wie of wat + gezegde + onderwerp?”.',
  'Meewerkend voorwerp: vraag “Aan wie of voor wie?”.',
  'Bepaling: wat overblijft zegt iets over waar, wanneer, hoe of waarom.',
]
const ZINSDEEL_VB = ['pv = geeft', 'ow = Oma', 'gezegde = geeft', 'lv = een bot', 'mv = de hond', 'bepaling = vandaag']

const WOORDSOORT = {
  'zelfstandig naamwoord': 'Zelfstandig naamwoord: je kunt er “de”, “het” of “een” voor zetten (de fiets).',
  werkwoord: 'Werkwoord: wat je doet of wat er gebeurt (lopen, ik loop).',
  lidwoord: 'Lidwoord: de, het of een.',
  'bijvoeglijk naamwoord': 'Bijvoeglijk naamwoord: zegt hoe iets is, vaak vóór een zelfstandig naamwoord (de rode fiets).',
  bijwoord: 'Bijwoord: zegt iets over een werkwoord of een ander woord (hij rent snel, heel mooi).',
  voornaamwoord: 'Voornaamwoord: staat in plaats van een naam (ik, jij, hij, mijn, deze).',
  telwoord: 'Telwoord: een aantal of een plek in de rij (drie, derde, veel).',
  voorzetsel: 'Voorzetsel: waar iets is of naartoe gaat (op, in, onder, naar).',
  voegwoord: 'Voegwoord: plakt woorden of zinnen aan elkaar (en, maar, want, omdat).',
}

const WERKWOORD = {
  tt: ['Tegenwoordige tijd: ik = stam (ik loop), jij/hij/zij = stam + t (hij loopt).', 'Staat “jij” achter het werkwoord? Dan geen t (loop jij).'],
  vtZwak: ['Verleden tijd, zwak: zit de laatste letter van de stam in ’t kofschip (t, k, f, s, ch, p)? Dan -te(n), anders -de(n).'],
  vtSterk: ['Verleden tijd, sterk: de klank verandert (lopen → liep, zwemmen → zwom). Die leer je uit je hoofd.'],
  vd: ['Voltooid deelwoord: ge + stam + t of d. Maak het woord langer om te horen welke (gefietst → gefietste).'],
}
const WERKWOORD_VB = {
  tt: { vraag: 'Hij word… boos.', antwoord: 'wordt (stam “word” + t)' },
  vtZwak: { vraag: 'werken → ik werk… gisteren', antwoord: 'werkte (k zit in ’t kofschip)' },
  vtSterk: { vraag: 'Gisteren (lopen) ik naar huis.', antwoord: 'liep' },
  vd: { vraag: 'Ik heb hard (fietsen).', antwoord: 'gefietst' },
}

// Spelling per categorie: de regel staat al in het label (na het streepje).
const SPELLING_VB = {
  slang: 'koning', stinkdier: 'bank', specht: 'lucht', pechvogel: 'lachen', stokstaart: 'voetbal',
  beer: 'boom', haai: 'kraai', leeuw: 'nieuw', hond_hert: 'hond (honden)', gestreept: 'lepel',
  krekel: 'ramen', kikker: 'bakker', duiven_ganzen: 'duiven', pauw_goudvis: 'koud', geit_bij: 'trein',
  muisje: 'boompje', biggetje: 'balletje', lamaatje: 'autootje', winterkoninkje: 'koninkje', ara: 'opa',
  gevaarlijk: 'gelukkig', kameel: 'banaan', pandas: "opa's", krab: 'web', eieren: 'kinderen',
  citroenvlinder: 'cirkel', hoogte: 'lengte', bizon: 'piraat', tropisch: 'logisch', snachts: "'s morgens",
  politiehond: 'vakantie', cavia: 'camping', baviaan_leguaan: 'piano', chimpansee: 'chauffeur', puppy: 'baby',
  jaguar: 'cadeau', page: 'garage', axolotl: 'examen', python: 'thee', snelheid: 'universiteit',
  wollen: 'houten', gespleten: 'gebroken', reeen: 'zeeën',
}

const KLOK = {
  analoog: {
    1: ['De kleine wijzer wijst het uur, de grote wijzer de minuten.', 'Grote wijzer op de 3 = kwart over, op de 6 = half (van het volgende uur!), op de 9 = kwart voor.'],
    2: ['Elk cijfer is 5 minuten verder voor de grote wijzer.', 'Na kwart over komt “tien voor half”, na half komt “vijf over half”.'],
    3: ['Tel de kleine streepjes: elk streepje is 1 minuut.'],
    4: ['Reken eerst door tot het hele uur, daarna de rest.'],
  },
  digitaal: {
    1: ['Eerst staan de uren, dan de minuten. :15 = kwart over, :30 = half (het volgende uur), :45 = kwart voor.'],
    2: [':20 = tien voor half, :40 = tien over half. Denk in stappen van 5 minuten.'],
    3: ['Na 12:00 telt de 24-uursklok door: 15:37 is 3 uur ’s middags en 37 minuten.'],
    4: ['Reken eerst door tot het hele uur, daarna de rest: 14:50 + 35 min = 15:00 + 25 min = 15:25.'],
  },
}
const KLOK_VB = { 1: 'kwart over drie', 2: 'tien voor half vijf', 3: '15:37', 4: '14:50 + 35 min = 15:25' }

const MATEN = {
  1: ['De trap: km – hm – dam – m – dm – cm – mm.', 'Eén stap naar een kleinere maat is × 10.'],
  2: ['De trap: km – hm – dam – m – dm – cm – mm.', 'Tel hoeveel stappen je zet: elke stap omlaag × 10, omhoog : 10.'],
  3: ['Bij elke stap naar een kleinere maat schuift de komma één plek naar rechts.', 'Naar een grotere maat schuift hij naar links.'],
}
const MATEN_VB = { 1: { vraag: '5 m = … cm', antwoord: '500 cm' }, 2: { vraag: '3 km = … dm', antwoord: '30 000 dm' }, 3: { vraag: '2,5 m = … cm', antwoord: '250 cm' } }

function verhaaltjesVoorbeeld(config) {
  try {
    const gens = onderdelenVan(Number(config.groep) || 7, config.route ?? 'FS', 'blok').flatMap(b => b.gens)
    const item = gens.find(g => config.doelen?.includes(g.key))
    const gen = item?.gen ?? item?.delen?.[0]?.soorten?.[0]?.gen
    const som = gen?.()
    if (!som) return null
    const antwoord = `${som.antwoord}${som.eenheid ? ' ' + som.eenheid : ''}`
    return { vraag: som.vraag, antwoord: som.uitleg ? `${antwoord} — ${som.uitleg}` : antwoord }
  } catch { return null }
}

export function uitlegVoor({ toolId, config = {} }) {
  const familie = TOOL_BY_ID[toolId]?.familie ?? toolId

  if (familie === 'taal-interpunctie') {
    const [regels, voorbeeld] = INTERPUNCTIE[config.onderdelen?.[0]] ?? INTERPUNCTIE.punten
    return { regels, voorbeeld }
  }
  if (familie === 'taal-zinsdelen') {
    const n = Math.max(1, config.zinsdelen?.length ?? 2)
    return { regels: ZINSDELEN.slice(0, n),
      voorbeeld: { vraag: 'Oma geeft de hond vandaag een bot.', antwoord: ZINSDEEL_VB.slice(0, n).join(' · ') } }
  }
  if (familie === 'taal-woordsoorten') {
    const soorten = config.soorten?.length ? config.soorten : Object.keys(WOORDSOORT)
    return { regels: soorten.map(s => WOORDSOORT[s]).filter(Boolean),
      voorbeeld: { vraag: 'De rode fiets staat op het plein.', antwoord: 'de = lidwoord · rode = bijvoeglijk naamwoord · fiets = zelfstandig naamwoord · staat = werkwoord · op = voorzetsel' } }
  }
  if (familie === 'taal-gebiedende-wijs') {
    return { regels: ['De gebiedende wijs is een bevel of verzoek zonder onderwerp.', 'Het werkwoord staat vooraan, in de ik-vorm (de stam).', 'Staat er “jij” of “u” in de zin? Dan is het géén gebiedende wijs.'],
      voorbeeld: { vraag: 'Pak je jas!', antwoord: 'gebiedende wijs (geen onderwerp, “pak” = stam)' } }
  }
  if (familie === 'werkwoordspelling') {
    const cats = config.categorieen?.length ? config.categorieen : Object.keys(WERKWOORD)
    return { regels: cats.flatMap(c => WERKWOORD[c] ?? []), voorbeeld: WERKWOORD_VB[cats[0]] }
  }
  if (familie === 'dictee-categorie' && config.cats?.length) {
    const opties = TOOL_BY_ID['dictee-categorie'].configVelden[0].opties
    return { regels: config.cats.map(c => {
      const label = opties.find(o => o.value === c)?.label ?? c
      return `${label.split(' — ')[1] ?? label}${SPELLING_VB[c] ? ` (zoals: ${SPELLING_VB[c]})` : ''}`
    }).concat('Twijfel je? Maak het woord langer of denk aan een woord dat erop lijkt.') }
  }
  if (familie === 'tafels') {
    const t = Number(config.tafels?.[0]) || 2
    return config.soort === 'deel'
      ? { regels: [`Delen door ${t} is terugrekenen met de tafel van ${t}.`, `Vraag jezelf: hoeveel keer ${t} is dit getal?`],
          voorbeeld: { vraag: `${6 * t} : ${t} = …`, antwoord: `6, want 6 × ${t} = ${6 * t}` } }
      : { regels: [`De tafel van ${t}: ${[1, 2, 3, 4, 5].map(i => i * t).join(', ')}, …`, `Weet je er één niet? Tel ${t} op bij de som ervoor.`],
          voorbeeld: { vraag: `7 × ${t} = …`, antwoord: `${7 * t} (6 × ${t} = ${6 * t}, plus ${t})` } }
  }
  if (familie === 'klokkijken') {
    const lvl = Number(config.level) || 1
    return { regels: KLOK[config.weergave === 'digitaal' ? 'digitaal' : 'analoog'][lvl], voorbeeld: { vraag: 'Bijvoorbeeld', antwoord: KLOK_VB[lvl] } }
  }
  if (familie === 'maten-omrekenen') {
    const lvl = Number(config.level) || 1
    return { regels: MATEN[lvl], voorbeeld: MATEN_VB[lvl] }
  }
  if (familie === 'breuken-plaatjes') {
    return { regels: ['Het getal onder de streep: in hoeveel gelijke stukken het geheel verdeeld is.', 'Het getal boven de streep: hoeveel stukken er gekleurd zijn.'],
      voorbeeld: { vraag: 'Een pizza in 4 stukken, 3 stukken gekleurd', antwoord: '3/4' } }
  }
  if (familie === 'procenten-breuken') {
    return { regels: ['Procent betekent “van de honderd”.', '50% = 1/2 = 0,5 · 25% = 1/4 = 0,25 · 10% = 1/10 = 0,1'],
      voorbeeld: { vraag: '75% = …', antwoord: '3/4 = 0,75' } }
  }
  if (familie === 'verhaaltjessommen') {
    return { regels: ['Lees de som rustig helemaal.', 'Wat wordt er gevraagd? Welke getallen heb je nodig?', 'Reken het uit en kijk of je antwoord kan kloppen.'],
      voorbeeld: verhaaltjesVoorbeeld(config) }
  }
  if (familie.startsWith('topo')) {
    return { regels: ['Kijk eerst goed naar de kaart.', 'Zoek een plek die je al kent en kijk wat eromheen ligt.', 'Weet je het niet? Kijk na je antwoord goed waar het wél lag.'] }
  }
  if (familie.startsWith('woordenschat')) {
    return { regels: ['Je leert de woorden van dit blok.', 'Twijfel je over een betekenis? Bedenk een zin waarin je het woord gebruikt.'] }
  }
  if (familie.startsWith('dictee')) {
    return { regels: ['Luister goed naar het woord en schrijf het op.', 'Denk aan de spellingregels: maak het woord langer of denk aan een woord dat erop lijkt.'] }
  }
  return { regels: ['Lees elke opgave goed.', 'Heb je 20 opgaven gemaakt? Dan zie je hoeveel procent je goed hebt.'] }
}
