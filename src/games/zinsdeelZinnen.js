import { VRAGEN, SAMENGESTELDE_ZINNEN } from './taalData.js'

// Zinnen voor de zinsdelen-oefening (src/games/Zinsdelen.jsx).
//
// Waarom een eigen lijst naast VRAGEN: die lijst is gemaakt voor de
// woordsoorten-oefening en bestaat vrijwel volledig uit rechttoe-rechtaan
// zinnen — onderwerp vooraan, persoonsvorm er direct achter. Leerlingen
// hadden dat door en klikten simpelweg het eerste stuk aan zonder te kijken.
// Hier staat het onderwerp bijna nooit vooraan: de zin begint met een
// bepaling, een lijdend voorwerp, een vraagwoord of een bijzin, zodat de
// leerling de persoonsvorm écht moet opzoeken.
//
// Compact formaat per zin: [zin, { ond, pv, gez, lv, mv, bep }]. Elke waarde
// is één frase of een lijst frases (twee bepalingen, of twee onderwerpen in
// een samengestelde zin). De frase moet letterlijk in de zin staan, mét
// hoofdletter als hij aan het begin staat — woordIndexen() zoekt op woorden.
// Een uit elkaar getrokken gezegde schrijf je als 'komt aan' of
// 'heeft gerepareerd'; die woorden worden in volgorde gezocht, niet naast
// elkaar.
//
// De uitleg bij elk zinsdeel wordt hieronder afgeleid (uitlegVoor): één vaste
// redenering per zinsdeel is hier beter dan zeventig keer een eigen zinnetje —
// de leerling leert juist dát trucje, en het blijft consistent.

const ZINNEN = [
  // ── Bepaling vooraan (inversie) ─────────────────────────────────────────
  ['Gisteren speelde hij urenlang in de tuin.',
    { ond: 'hij', pv: 'speelde', gez: 'speelde', bep: ['Gisteren', 'urenlang', 'in de tuin'] }],
  ['In de kast ligt een dikke stapel schriften.',
    { ond: 'een dikke stapel schriften', pv: 'ligt', gez: 'ligt', bep: ['In de kast'] }],
  ['Om acht uur komt de trein eindelijk aan.',
    { ond: 'de trein', pv: 'komt', gez: 'komt aan', bep: ['Om acht uur', 'eindelijk'] }],
  ['Morgen gaan wij met de klas naar het museum.',
    { ond: 'wij', pv: 'gaan', gez: 'gaan', bep: ['Morgen', 'met de klas', 'naar het museum'] }],
  ['Achter het schuurtje vond Sem een roestige sleutel.',
    { ond: 'Sem', pv: 'vond', gez: 'vond', lv: 'een roestige sleutel', bep: ['Achter het schuurtje'] }],
  ['Na afloop geeft de juf ons een nieuwe opdracht.',
    { ond: 'de juf', pv: 'geeft', gez: 'geeft', lv: 'een nieuwe opdracht', mv: 'ons', bep: ['Na afloop'] }],
  ['Elke woensdag brengt mijn opa mij naar het zwembad.',
    { ond: 'mijn opa', pv: 'brengt', gez: 'brengt', lv: 'mij', bep: ['Elke woensdag', 'naar het zwembad'] }],
  ['Op het plein stonden gisteren twee grote kramen.',
    { ond: 'twee grote kramen', pv: 'stonden', gez: 'stonden', bep: ['Op het plein', 'gisteren'] }],
  ['Vanmiddag heeft Noor haar fiets zelf gerepareerd.',
    { ond: 'Noor', pv: 'heeft', gez: 'heeft gerepareerd', lv: 'haar fiets', bep: ['Vanmiddag', 'zelf'] }],
  ['Door een windvlaag waaide de parasol om.',
    { ond: 'de parasol', pv: 'waaide', gez: 'waaide om', bep: ['Door een windvlaag'] }],
  ['Toch won ons team de laatste wedstrijd.',
    { ond: 'ons team', pv: 'won', gez: 'won', lv: 'de laatste wedstrijd', bep: ['Toch'] }],
  ['Op zolder bewaart mijn moeder oude fotoalbums.',
    { ond: 'mijn moeder', pv: 'bewaart', gez: 'bewaart', lv: 'oude fotoalbums', bep: ['Op zolder'] }],
  ['In de verte hoorden wij een harde knal.',
    { ond: 'wij', pv: 'hoorden', gez: 'hoorden', lv: 'een harde knal', bep: ['In de verte'] }],
  ['Tijdens de vakantie las ik drie dikke boeken.',
    { ond: 'ik', pv: 'las', gez: 'las', lv: 'drie dikke boeken', bep: ['Tijdens de vakantie'] }],
  ['Onder onze bank lag de afstandsbediening al dagen.',
    { ond: 'de afstandsbediening', pv: 'lag', gez: 'lag', bep: ['Onder onze bank', 'al dagen'] }],
  ['Vanavond kookt papa een lekkere soep voor ons.',
    { ond: 'papa', pv: 'kookt', gez: 'kookt', lv: 'een lekkere soep', mv: 'voor ons', bep: ['Vanavond'] }],
  ['Met een grote sprong landde de kat op de vensterbank.',
    { ond: 'de kat', pv: 'landde', gez: 'landde', bep: ['Met een grote sprong', 'op de vensterbank'] }],
  ['Straks leest de meester ons een spannend verhaal voor.',
    { ond: 'de meester', pv: 'leest', gez: 'leest voor', lv: 'een spannend verhaal', mv: 'ons', bep: ['Straks'] }],
  ['Op de markt kocht mijn tante verse aardbeien.',
    { ond: 'mijn tante', pv: 'kocht', gez: 'kocht', lv: 'verse aardbeien', bep: ['Op de markt'] }],
  ['Gisteravond zijn wij veel te laat thuisgekomen.',
    { ond: 'wij', pv: 'zijn', gez: 'zijn thuisgekomen', bep: ['Gisteravond', 'veel te laat'] }],
  ['In het bos ontdekten de kinderen een verlaten hut.',
    { ond: 'de kinderen', pv: 'ontdekten', gez: 'ontdekten', lv: 'een verlaten hut', bep: ['In het bos'] }],
  ['Volgende maand verhuist onze buurman naar Spanje.',
    { ond: 'onze buurman', pv: 'verhuist', gez: 'verhuist', bep: ['Volgende maand', 'naar Spanje'] }],
  ['Morgenochtend moet ik heel vroeg opstaan.',
    { ond: 'ik', pv: 'moet', gez: 'moet opstaan', bep: ['Morgenochtend', 'heel vroeg'] }],
  ['Na het eten ruimt Jasper altijd de tafel af.',
    { ond: 'Jasper', pv: 'ruimt', gez: 'ruimt af', lv: 'de tafel', bep: ['Na het eten', 'altijd'] }],
  ['Op het strand bouwden wij een enorm zandkasteel.',
    { ond: 'wij', pv: 'bouwden', gez: 'bouwden', lv: 'een enorm zandkasteel', bep: ['Op het strand'] }],
  ['Met veel geduld legde de juf het sommetje nog eens uit.',
    { ond: 'de juf', pv: 'legde', gez: 'legde uit', lv: 'het sommetje', bep: ['Met veel geduld', 'nog eens'] }],
  ['In de zomer slapen wij vaak in een tent.',
    { ond: 'wij', pv: 'slapen', gez: 'slapen', bep: ['In de zomer', 'vaak', 'in een tent'] }],
  ['Gelukkig had Mees zijn zwemdiploma al gehaald.',
    { ond: 'Mees', pv: 'had', gez: 'had gehaald', lv: 'zijn zwemdiploma', bep: ['Gelukkig', 'al'] }],
  ['Voor de zekerheid neemt Fenna een extra jas mee.',
    { ond: 'Fenna', pv: 'neemt', gez: 'neemt mee', lv: 'een extra jas', bep: ['Voor de zekerheid'] }],
  ['Op zaterdag werkt mijn zus in een klein café.',
    { ond: 'mijn zus', pv: 'werkt', gez: 'werkt', bep: ['Op zaterdag', 'in een klein café'] }],
  ['Halverwege onze rit kreeg de bus een lekke band.',
    { ond: 'de bus', pv: 'kreeg', gez: 'kreeg', lv: 'een lekke band', bep: ['Halverwege onze rit'] }],
  ['Aan het eind van de straat staat een oude molen.',
    { ond: 'een oude molen', pv: 'staat', gez: 'staat', bep: ['Aan het eind van de straat'] }],
  ['Vandaag schrijven de kinderen hun ouders een brief.',
    { ond: 'de kinderen', pv: 'schrijven', gez: 'schrijven', lv: 'een brief', mv: 'hun ouders', bep: ['Vandaag'] }],
  ['Met een klap sloeg de deur achter hem dicht.',
    { ond: 'de deur', pv: 'sloeg', gez: 'sloeg dicht', bep: ['Met een klap', 'achter hem'] }],
  ['Sinds het ongeluk rijdt mijn oom veel voorzichtiger.',
    { ond: 'mijn oom', pv: 'rijdt', gez: 'rijdt', bep: ['Sinds het ongeluk', 'veel voorzichtiger'] }],
  ['Vlak voor de vakantie deelt onze juf nieuwe boeken uit.',
    { ond: 'onze juf', pv: 'deelt', gez: 'deelt uit', lv: 'nieuwe boeken', bep: ['Vlak voor de vakantie'] }],
  ['Nooit eerder hebben wij zo hard gelachen.',
    { ond: 'wij', pv: 'hebben', gez: 'hebben gelachen', bep: ['Nooit eerder', 'zo hard'] }],
  ['Boven op de berg lag nog een dun laagje sneeuw.',
    { ond: 'een dun laagje sneeuw', pv: 'lag', gez: 'lag', bep: ['Boven op de berg', 'nog'] }],
  ['Deze week krijgt onze klas een nieuwe gymleraar.',
    { ond: 'onze klas', pv: 'krijgt', gez: 'krijgt', lv: 'een nieuwe gymleraar', bep: ['Deze week'] }],
  ['Vanuit het raam zwaaide oma naar de kinderen.',
    { ond: 'oma', pv: 'zwaaide', gez: 'zwaaide', bep: ['Vanuit het raam', 'naar de kinderen'] }],
  ['Tijdens het concert zong de hele zaal mee.',
    { ond: 'de hele zaal', pv: 'zong', gez: 'zong mee', bep: ['Tijdens het concert'] }],
  ['Om half vier haalt mijn moeder ons van school.',
    { ond: 'mijn moeder', pv: 'haalt', gez: 'haalt', lv: 'ons', bep: ['Om half vier', 'van school'] }],
  ['Op het podium gaf de band een kort optreden.',
    { ond: 'de band', pv: 'gaf', gez: 'gaf', lv: 'een kort optreden', bep: ['Op het podium'] }],
  ['Volgens mij heeft Daan het antwoord goed.',
    { ond: 'Daan', pv: 'heeft', gez: 'heeft', lv: 'het antwoord', bep: ['Volgens mij', 'goed'] }],
  ['Langs het fietspad groeien in mei veel bloemen.',
    { ond: 'veel bloemen', pv: 'groeien', gez: 'groeien', bep: ['Langs het fietspad', 'in mei'] }],
  ['Met een zaklamp zochten wij de hele zolder af.',
    { ond: 'wij', pv: 'zochten', gez: 'zochten af', lv: 'de hele zolder', bep: ['Met een zaklamp'] }],
  ['Vorige zomer leerde mijn broertje eindelijk fietsen.',
    { ond: 'mijn broertje', pv: 'leerde', gez: 'leerde fietsen', bep: ['Vorige zomer', 'eindelijk'] }],
  ['Op rij één zaten de ouders van de spelers.',
    { ond: 'de ouders van de spelers', pv: 'zaten', gez: 'zaten', bep: ['Op rij één'] }],
  ['Elke ochtend brengt onze postbode ons de krant.',
    { ond: 'onze postbode', pv: 'brengt', gez: 'brengt', lv: 'de krant', mv: 'ons', bep: ['Elke ochtend'] }],
  ['Onder de trap heeft papa een kastje getimmerd.',
    { ond: 'papa', pv: 'heeft', gez: 'heeft getimmerd', lv: 'een kastje', bep: ['Onder de trap'] }],
  ['Buiten stond de melkboer al een kwartier te wachten.',
    { ond: 'de melkboer', pv: 'stond', gez: 'stond te wachten', bep: ['Buiten', 'al een kwartier'] }],
  ['Vorige week won Isa de finale van het schaaktoernooi.',
    { ond: 'Isa', pv: 'won', gez: 'won', lv: 'de finale van het schaaktoernooi', bep: ['Vorige week'] }],
  ['Achter in de bus zaten drie jongens luid te praten.',
    { ond: 'drie jongens', pv: 'zaten', gez: 'zaten te praten', bep: ['Achter in de bus', 'luid'] }],
  ['Met een schaar knipte Yara het lint doormidden.',
    { ond: 'Yara', pv: 'knipte', gez: 'knipte', lv: 'het lint', bep: ['Met een schaar', 'doormidden'] }],
  ['Sinds dit jaar geeft meester Bram onze klas gym.',
    { ond: 'meester Bram', pv: 'geeft', gez: 'geeft', lv: 'gym', mv: 'onze klas', bep: ['Sinds dit jaar'] }],
  ['Daarna beloofde papa mij een nieuwe voetbal.',
    { ond: 'papa', pv: 'beloofde', gez: 'beloofde', lv: 'een nieuwe voetbal', mv: 'mij', bep: ['Daarna'] }],

  // ── Lijdend of meewerkend voorwerp vooraan ──────────────────────────────
  ['Dat vervelende liedje ken ik uit mijn hoofd.',
    { ond: 'ik', pv: 'ken', gez: 'ken', lv: 'Dat vervelende liedje', bep: ['uit mijn hoofd'] }],
  ['Zulke dure schoenen koopt mijn vader nooit.',
    { ond: 'mijn vader', pv: 'koopt', gez: 'koopt', lv: 'Zulke dure schoenen', bep: ['nooit'] }],
  ['Die oude fiets heeft Timo van zijn opa gekregen.',
    { ond: 'Timo', pv: 'heeft', gez: 'heeft gekregen', lv: 'Die oude fiets', bep: ['van zijn opa'] }],
  ['Die zware doos kan ik alleen niet tillen.',
    { ond: 'ik', pv: 'kan', gez: 'kan tillen', lv: 'Die zware doos', bep: ['alleen', 'niet'] }],
  ['Aan mijn beste vriendin heb ik het geheim verteld.',
    { ond: 'ik', pv: 'heb', gez: 'heb verteld', lv: 'het geheim', mv: 'Aan mijn beste vriendin' }],
  ['Zijn kleine zusje leert Ravi elke dag lezen.',
    { ond: 'Ravi', pv: 'leert', gez: 'leert lezen', mv: 'Zijn kleine zusje', bep: ['elke dag'] }],
  ['Het laatste stuk taart gaf oma aan de buurjongen.',
    { ond: 'oma', pv: 'gaf', gez: 'gaf', lv: 'Het laatste stuk taart', mv: 'aan de buurjongen' }],

  // ── Vraagzinnen ─────────────────────────────────────────────────────────
  ['Wanneer begint de voorstelling in de grote zaal?',
    { ond: 'de voorstelling', pv: 'begint', gez: 'begint', bep: ['Wanneer', 'in de grote zaal'] }],
  ['Waarom fietst Sara altijd zo hard?',
    { ond: 'Sara', pv: 'fietst', gez: 'fietst', bep: ['Waarom', 'altijd', 'zo hard'] }],
  ['Heeft de meester het proefwerk al nagekeken?',
    { ond: 'de meester', pv: 'Heeft', gez: 'Heeft nagekeken', lv: 'het proefwerk', bep: ['al'] }],
  ['Waar hebben jullie die mooie schelpen gevonden?',
    { ond: 'jullie', pv: 'hebben', gez: 'hebben gevonden', lv: 'die mooie schelpen', bep: ['Waar'] }],
  ['Wat vertelde de gids over dat oude schilderij?',
    { ond: 'de gids', pv: 'vertelde', gez: 'vertelde', lv: 'Wat', bep: ['over dat oude schilderij'] }],
  ['Hoeveel kaartjes verkocht jouw klas voor het toneelstuk?',
    { ond: 'jouw klas', pv: 'verkocht', gez: 'verkocht', lv: 'Hoeveel kaartjes', bep: ['voor het toneelstuk'] }],
  ['Mag Tess vanmiddag bij ons komen spelen?',
    { ond: 'Tess', pv: 'Mag', gez: 'Mag komen spelen', bep: ['vanmiddag', 'bij ons'] }],

  // ── Bijzin vooraan (samengesteld) ───────────────────────────────────────
  ['Omdat het hard regende, bleven wij binnen.',
    { ond: ['het', 'wij'], pv: ['regende', 'bleven'], gez: ['regende', 'bleven'], bep: ['hard', 'binnen'], samen: true }],
  ['Toen de bel ging, renden alle kinderen naar buiten.',
    { ond: ['de bel', 'alle kinderen'], pv: ['ging', 'renden'], gez: ['ging', 'renden'], bep: ['naar buiten'], samen: true }],
  ['Hoewel het hard waaide, fietste Ruben toch naar school.',
    { ond: ['het', 'Ruben'], pv: ['waaide', 'fietste'], gez: ['waaide', 'fietste'], bep: ['hard', 'toch', 'naar school'], samen: true }],
  ['Als de zon schijnt, eten wij buiten op het terras.',
    { ond: ['de zon', 'wij'], pv: ['schijnt', 'eten'], gez: ['schijnt', 'eten'], bep: ['buiten', 'op het terras'], samen: true }],
  ['Terwijl mama kookte, dekte ik alvast de tafel.',
    { ond: ['mama', 'ik'], pv: ['kookte', 'dekte'], gez: ['kookte', 'dekte'], lv: 'de tafel', bep: ['alvast'], samen: true }],
  ['Voordat wij vertrokken, controleerde papa nog de banden.',
    { ond: ['wij', 'papa'], pv: ['vertrokken', 'controleerde'], gez: ['vertrokken', 'controleerde'], lv: 'de banden', bep: ['nog'], samen: true }],
  ['Nu het harder waait, draagt iedereen weer een muts.',
    { ond: ['het', 'iedereen'], pv: ['waait', 'draagt'], gez: ['waait', 'draagt'], lv: 'een muts', bep: ['harder', 'weer'], samen: true }],
  ['Zodra de wedstrijd begon, juichte het hele publiek.',
    { ond: ['de wedstrijd', 'het hele publiek'], pv: ['begon', 'juichte'], gez: ['begon', 'juichte'], samen: true }],
  ['Na de pauze werkten wij door, maar Lars ging naar huis.',
    { ond: ['wij', 'Lars'], pv: ['werkten', 'ging'], gez: ['werkten door', 'ging'], bep: ['Na de pauze', 'naar huis'], samen: true }],
  ['Buiten wachtte Bo, terwijl de juf met haar moeder praatte.',
    { ond: ['Bo', 'de juf'], pv: ['wachtte', 'praatte'], gez: ['wachtte', 'praatte'], bep: ['Buiten', 'met haar moeder'], samen: true }],
]

// Een handvol gewone zinnen blijft erin: een leerling moet de standaardzin
// (onderwerp vooraan) ook nog tegenkomen, anders wordt "níét vooraan" het
// nieuwe automatisme.
const BASISZINNEN = new Set([
  'De hond loopt snel door het park.',
  'De juf leest de kinderen een spannend verhaal voor.',
  'Hij heeft een nieuwe fiets gekocht.',
  'Wij mogen buiten spelen.',
  'Sanne leest haar zusje elke avond een verhaaltje voor.',
  'De brandweer blust het vuur met veel water.',
  'Papa kookt het eten terwijl mama de tafel dekt.',
])

const LABEL = { ond: 'onderwerp', pv: 'persoonsvorm', gez: 'gezegde',
  lv: 'lijdend voorwerp', mv: 'meewerkend voorwerp', bep: 'bepaling' }

// Uitleg na een misser: steeds dezelfde denkstap, ingevuld met deze zin. Geen
// aantallen noemen — dat zou verklappen hoeveel stukken er aangeklikt moeten
// worden.
function uitlegVoor(sleutel, frase, ond, pv) {
  switch (sleutel) {
    case 'ond':
      return `Zoek eerst de persoonsvorm ("${pv}") en vraag dan: wie of wat ${pv}? "${frase}" — dat is het onderwerp. Het hoeft niet vooraan te staan.`
    case 'pv':
      return `Maak er een vraagzin van: "${frase}" springt dan vooraan. Dat is de persoonsvorm.`
    case 'gez':
      return frase === pv
        ? `Er is maar één werkwoord: "${frase}". Dan zijn de persoonsvorm en het gezegde hetzelfde woord.`
        : `Het gezegde zijn álle werkwoorden samen: "${frase}" — ook als ze ver uit elkaar staan.`
    case 'lv':
      return `Vraag: wie of wat ${pv} ${ond}? "${frase}" — dat is het lijdend voorwerp.`
    case 'mv':
      return `Vraag: aan wie of voor wie? "${frase}" — dat is het meewerkend voorwerp.`
    default:
      return `"${frase}" vertelt waar, wanneer, hoe of waarmee het gebeurt — dat is een bepaling.`
  }
}

// Uitklappen naar hetzelfde rijtjesformaat als VRAGEN, want bouwZinnen() in
// Zinsdelen.jsx leest { zin, zinsdeel, zinsdeelWoorden, uitleg_zd }.
const UITGEKLAPT = ZINNEN.flatMap(([zin, delen], zi) =>
  Object.entries(delen)
    .filter(([sleutel]) => LABEL[sleutel])
    .flatMap(([sleutel, waarde]) => {
      const frases = Array.isArray(waarde) ? waarde : [waarde]
      const eerste = (k) => (Array.isArray(delen[k]) ? delen[k][0] : delen[k])
      return frases.map((frase, fi) => ({
        id: `zd-${zi}-${sleutel}-${fi}`,
        zin,
        zinsdeel: LABEL[sleutel],
        zinsdeelWoorden: frase,
        uitleg_zd: uitlegVoor(sleutel, frase, eerste('ond'), eerste('pv')),
      }))
    }))

export const ZINSDEEL_VRAGEN = [
  ...UITGEKLAPT,
  ...VRAGEN.filter(r => r.zinsdeel && BASISZINNEN.has(r.zin)),
]

export const ZINSDEEL_SAMENGESTELD = new Set([
  ...ZINNEN.filter(([, d]) => d.samen).map(([zin]) => zin),
  ...SAMENGESTELDE_ZINNEN,
])
