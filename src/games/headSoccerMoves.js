// Special moves per land. Elke move mapt op een herbruikbare effect-primitief
// (zie HeadSoccer.jsx -> activateSpecial). Distinctie zit in naam/emoji/kleur/params.
//
// effect:
//   dash      -> horizontale snelheidsburst richting tegenstander (params: vx, dur)
//   powershot -> volgend balcontact krijgt extra snelheid (params: mult, curve, dur)
//   superjump -> directe sprong omhoog + extra zweef (params: vy, dur, lob)
//   freeze    -> tegenstander wordt traag/bevroren (params: factor, dur)
//   bighead   -> eigen kop/lichaam tijdelijk groter (params: scale, dur)
//   magnet    -> bal wordt naar speler getrokken (params: force, dur)
//   shield    -> tijdelijk blok voor eigen goal (params: dur)
//   repel     -> bal wordt radiaal weggeslagen (params: force)

// charge = seconden om de special-meter te vullen (hoger = langzamer).
// Bewust traag gemaakt zodat een superschot zeldzaam en speciaal is.
// Geïnspireerd op Head Soccer: elk land heeft een EIGEN mechaniek (geen reskins).
// mascot = themed figuur dat groot in beeld verschijnt bij de special.
// ballEmoji = de bal verandert in dit figuur tijdens het schot.
export const MOVES = {
  nl: { name: 'Stormram',      emoji: '🐏', mascot: '🐏', effect: 'charge',    color: '#FF6900', charge: 20, desc: 'Beuk als een ram vooruit: ram de tegenstander én de bal weg', params: { vx: 560, dur: 0.5, knock: 600, stun: 1.1 } },
  de: { name: 'Raketschot',    emoji: '🚀', mascot: '🚀', ballEmoji: '🚀', effect: 'rocket',    color: '#FFD23F', charge: 24, desc: 'Knal de bal als een homing-raket recht op de goal af', params: { speed: 1750, fx: 'electric', homing: 1 } },
  br: { name: 'Samba Multibal',emoji: '🎉', mascot: '🥁', effect: 'multiball',  color: '#009C3B', charge: 24, desc: 'Schiet 5 ballen tegelijk — welke is echt?', params: { speed: 1200, n: 4 } },
  fr: { name: 'IJstijd',       emoji: '🧊', mascot: '❄️', effect: 'freeze',    color: '#3A6EE0', charge: 26, desc: 'Vries je tegenstander vast in een blok ijs', params: { factor: 0, dur: 2.4 } },
  en: { name: 'Kopwand',       emoji: '🧱', mascot: '🐶', effect: 'bighead',   color: '#CF091B', charge: 22, desc: 'Reuzenkop die alles terugkopt', params: { scale: 2.2, dur: 4 } },
  es: { name: 'Stierenstoot',  emoji: '🐂', mascot: '🐂', effect: 'magnet',    color: '#AA151B', charge: 22, desc: 'Trek de bal naar je toe als een dolle stier', params: { force: 3200, dur: 2.2 } },
  pt: { name: 'Vuuromhaal',    emoji: '🔥', mascot: '🔥', ballEmoji: '🔥', effect: 'firecurve', color: '#FF5500', charge: 24, desc: 'Brandende omhaal met een wilde curve', params: { mult: 2.4, curve: 1, dur: 4, fx: 'flame' } },
  it: { name: 'Catenaccio',    emoji: '🛡️', mascot: '🏰', effect: 'shield',    color: '#0066CC', charge: 26, desc: 'Stalen muur voor je eigen goal', params: { dur: 4.5 } },
  be: { name: 'Teleport',      emoji: '✨', mascot: '🌀', effect: 'teleport',  color: '#EF3340', charge: 20, desc: 'Flits door een portaal direct naar de bal', params: {} },
  us: { name: 'Aardbeving',    emoji: '💥', mascot: '🦅', effect: 'quake',     color: '#B22234', charge: 22, desc: 'Stamp de grond: schokgolf lanceert je tegenstander', params: { knock: 720, up: 440, stun: 1.3 } },
  mx: { name: 'Tornado',       emoji: '🌪️', mascot: '🌵', effect: 'tornado',   color: '#006847', charge: 24, desc: 'Een tornado zuigt de bal mee naar de goal', params: { dur: 3.2, vx: 210, pull: 3200 } },
  jp: { name: 'Tijgerbal',     emoji: '🐯', mascot: '🐯', ballEmoji: '🐯', effect: 'giantball', color: '#FF8800', charge: 24, desc: 'De bal wordt een gigantische brullende tijgerbal', params: { scale: 2.4, dur: 5 } },
  ma: { name: 'Atlas Kop',     emoji: '🏔️', mascot: '🏔️', effect: 'bighead',   color: '#C1272D', charge: 22, desc: 'Bergachtige kop zo groot als de Atlas', params: { scale: 2.0, dur: 4 } },
  sn: { name: 'Leeuwensprong', emoji: '🦁', mascot: '🦁', effect: 'superjump', color: '#00853F', charge: 20, desc: 'Enorme leeuwensprong en knal de bal naar beneden', params: { vy: 1000, dur: 0.85, lob: true } },
  hr: { name: 'Stuiterbal',    emoji: '🏀', mascot: '🏀', ballEmoji: '🏀', effect: 'bouncy',    color: '#FF0000', charge: 22, desc: 'Maak de bal superstuiterend en razendsnel', params: { dur: 4, speed: 1000 } },
  ar: { name: 'Spookbal',      emoji: '👻', mascot: '👻', ballEmoji: '👻', effect: 'ghost',     color: '#74ACDF', charge: 26, desc: 'De bal wordt een onzichtbare spookbal richting de goal', params: { dur: 3, speed: 1300 } },
  // ── 16 nieuwe landen: vooral LUCHT-supers (poppetje springt eerst, schiet dan van boven op de goal) ──
  ng: { name: 'Adelaarsomhaal',emoji: '🦅', mascot: '🦅', effect: 'air', color: '#008751', charge: 24, desc: 'Spring hoog en sla de bal in een omhaal over de keeper — met een spookbal die meevliegt' },
  gh: { name: 'Sterrenduik',   emoji: '⭐', mascot: '⭐', effect: 'air', color: '#FCD116', charge: 24, desc: 'De bal stijgt en stort als een vallende ster op de goal' },
  eg: { name: 'Maanschot',     emoji: '🌙', mascot: '🌙', effect: 'air', color: '#CE1126', charge: 26, desc: 'Een gigantische maansprong — de maanzwaartekracht laat je tegenstander even hulpeloos meezweven' },
  cm: { name: 'Leeuwenduik',   emoji: '🦁', mascot: '🦁', effect: 'air', color: '#007A5E', charge: 24, desc: 'Spring als een leeuw uit de lucht en duik op de bal, de inslag stoot je tegenstander omhoog' },
  kr: { name: 'Donderdunk',    emoji: '🐯', mascot: '🐯', effect: 'air', color: '#003478', charge: 24, desc: 'Spring hoog en dunk de bal met de donder de goal in' },
  sa: { name: 'Kanonduik',     emoji: '🐪', mascot: '🐪', effect: 'air', color: '#006C35', charge: 26, desc: 'De bal schiet de lucht in en valt als een kanonbal omlaag — de inslag blaast jullie beiden uit elkaar' },
  au: { name: 'Kangoeroesmash',emoji: '🦘', mascot: '🦘', effect: 'air', color: '#00843D', charge: 22, desc: 'Een mega kangoeroesprong en een smash van bovenaf' },
  ca: { name: 'IJsgladheid',   emoji: '🍁', mascot: '🍁', effect: 'air', color: '#FF0000', charge: 24, desc: 'Maakt het veld spekglad: je tegenstander kan niet meer stoppen of draaien' },
  co: { name: 'Sterrenregen',  emoji: '🌟', mascot: '🌟', effect: 'air', color: '#FCD116', charge: 24, desc: 'Spring hoog terwijl een sterrenregen de bal de goal in jaagt' },
  uy: { name: 'Zonvolley',     emoji: '☀️', mascot: '☀️', effect: 'air', color: '#0038A8', charge: 24, desc: 'Spring en volley de hoge bal vol op de goal — het felle licht verblindt je tegenstander even (geen sprong)' },
  ch: { name: 'Bergtol',       emoji: '🏔️', mascot: '🏔️', effect: 'air', color: '#D52B1E', charge: 24, desc: 'Een tollende sprong roept een wervelwind op die de bal én je tegenstander naar zich toe zuigt' },
  pl: { name: 'Komeetduik',    emoji: '☄️', mascot: '☄️', effect: 'air', color: '#DC143C', charge: 24, desc: 'De bal vliegt op en komt als een komeet naar beneden' },
  dk: { name: 'Muntflip',      emoji: '🪙', mascot: '🪙', effect: 'gamble', color: '#C60C30', charge: 20, desc: 'Gok het erop: een megaschot óf een compleet mislukt schotje' },
  se: { name: 'Windmuur',      emoji: '💛', mascot: '💛', effect: 'repel', color: '#006AA7', charge: 22, desc: 'Een muur van wind blaast je tegenstander weg bij de bal' },
  tr: { name: 'Drakenvuur',    emoji: '🐉', mascot: '🐉', effect: 'burn', color: '#E30A17', charge: 24, desc: 'De bal vat vlam: wie hem aanraakt (behalve jij) wordt weggeschroeid' },
  gr: { name: 'Feniks Herrijzenis', emoji: '🔱', mascot: '🔱', effect: 'immune', color: '#0D5EAF', charge: 26, desc: 'Herrijs als een feniks: even onraakbaar voor meppen en rammen' },
  // ── 17 landen met ECHT NIEUWE mechanieken (geen lucht-sprong-reskin) ──
  ec: { name: 'Zwaartekrachtgolf', emoji: '🪐', mascot: '🪐', effect: 'charge', color: '#FFDD00', charge: 24, desc: 'Bijna geen zwaartekracht meer: iedereen zweeft in slow motion door de lucht', params: {} },
  py: { name: 'Spiegeltruc',       emoji: '🪞', mascot: '🪞', effect: 'charge', color: '#0038A8', charge: 22, desc: 'Draai de besturing van je tegenstander tijdelijk om', params: {} },
  tn: { name: 'Woestijnstorm',     emoji: '🏜️', mascot: '🏜️', effect: 'charge', color: '#E70013', charge: 24, desc: 'Een zandstorm maakt elke stuiter van de bal onvoorspelbaar', params: {} },
  dz: { name: 'Woestijnwissel',    emoji: '🔄', mascot: '🧭', effect: 'charge', color: '#006233', charge: 20, desc: 'Wissel bliksemsnel van plek met je tegenstander en schiet meteen', params: {} },
  ci: { name: 'Wortelgreep',       emoji: '🌿', mascot: '🌿', effect: 'charge', color: '#FF8200', charge: 24, desc: 'Wortels grijpen je tegenstander vast aan de grond', params: {} },
  cv: { name: 'Vloedgolf',         emoji: '🌊', mascot: '🌊', effect: 'charge', color: '#003893', charge: 24, desc: 'Golven duwen de bal steeds weer richting de goal', params: {} },
  za: { name: 'Vuvuzela',          emoji: '📯', mascot: '📯', effect: 'charge', color: '#FFB81C', charge: 22, desc: 'Een oorverdovende toeter blokkeert de super-meter van je tegenstander', params: {} },
  ir: { name: 'Tapijtvlucht',      emoji: '🧞', mascot: '🧞', effect: 'charge', color: '#239F40', charge: 24, desc: 'Vlieg op een tapijt in één keer dwars over het veld naar de goal', params: {} },
  jo: { name: 'Zandmuur',          emoji: '🏛️', mascot: '🏛️', effect: 'charge', color: '#007A3D', charge: 26, desc: 'Bouw een muur midden op het veld die de bal terugkaatst', params: {} },
  uz: { name: 'Zijdenband',        emoji: '🕸️', mascot: '🕸️', effect: 'charge', color: '#1EB53A', charge: 22, desc: 'Bind je tegenstander vast aan een klein gebied', params: {} },
  qa: { name: 'Hitteflits',        emoji: '🌡️', mascot: '🌡️', effect: 'charge', color: '#8A1538', charge: 20, desc: 'De bal flitst in een oogwenk voorbij je tegenstander', params: {} },
  pa: { name: 'Kanaalboost',       emoji: '🚢', mascot: '🚢', effect: 'charge', color: '#072357', charge: 22, desc: 'De bal krijgt na een korte vertraging een enorme snelheidsboost', params: {} },
  cw: { name: 'Koraalveld',        emoji: '🪸', mascot: '🪸', effect: 'charge', color: '#FFD100', charge: 24, desc: 'Scherpe koraalpunten laten de bal alle kanten op springen', params: {} },
  ht: { name: 'Voodoulink',        emoji: '🪆', mascot: '🪆', effect: 'charge', color: '#D21034', charge: 24, desc: 'Dwing je tegenstander om jouw bewegingen te kopiëren', params: {} },
  nz: { name: 'Haka-schok',        emoji: '🥝', mascot: '🥝', effect: 'charge', color: '#CC142B', charge: 22, desc: 'Dreunende schokgolven stampen de bal steeds weer omhoog', params: {} },
  iq: { name: 'Duinramp',          emoji: '🏺', mascot: '🏺', effect: 'charge', color: '#CE1126', charge: 24, desc: 'De bal raast over een duin en schiet steil de lucht in', params: {} },
  no: { name: 'Aurora-sabotage',   emoji: '🌌', mascot: '🌌', effect: 'charge', color: '#002868', charge: 24, desc: 'Een noorderlicht verwart je tegenstander: zijn volgende trap gaat de verkeerde kant op', params: {} },
  so: { name: 'Abdi-Bal!',         emoji: '⭐', mascot: '⭐', effect: 'air', color: '#4189DD', charge: 24, desc: 'Raak de bal en schiet hem recht de lucht in — er vallen heel veel ballen naar beneden, maar er is er maar 1 echt!', params: {} },
  // ── Groep 7: klasgenoten. Elke bijnaam wordt de naam van het superschot.
  //    Elke bijnaam heeft een EIGEN, gloednieuwe mechaniek (zie SUPERS/HeadSoccer.jsx
  //    voor de behavior-implementatie) — geen enkele is een kopie van een bestaand land.
  dani:     { name: 'Dani Drift',            emoji: '🏎️', mascot: '🏎️', effect: 'charge', color: '#1a1a1a', charge: 20, desc: 'Een lage, giergladde glijschot die de tegenstander zijwaarts een spin-out injaagt', params: {} },
  bas:      { name: 'Bliksem Bas',           emoji: '⚡', mascot: '⚡', effect: 'charge', color: '#E2001A', charge: 22, desc: 'Drie bliksemschichten laden de bal steeds verder op onderweg naar het doel', params: {} },
  liam:     { name: 'Liam Legende',          emoji: '👑', mascot: '👑', effect: 'charge', color: '#FFD700', charge: 24, desc: 'Een koninklijk bevel vertraagt de tegenstander terwijl jij er als een vorst vandoor stormt', params: {} },
  thamal:   { name: 'Thamal Knal',           emoji: '💥', mascot: '💥', effect: 'charge', color: '#FF8200', charge: 22, desc: 'Een megaknal die bij inslag ontploft — en na een paar tellen nóg een keer, nog groter', params: {} },
  floor:    { name: 'Flamingo Floor',        emoji: '🦩', mascot: '🦩', effect: 'charge', color: '#FF8200', charge: 18, desc: 'Een spectaculaire reuzensprong met een wolk veren, eindigend in een zwierige draaiende omhaal', params: {} },
  abdiali:  { name: 'Abdi Ali Arab',         emoji: '⭐', mascot: '⭐', effect: 'charge', color: '#1A9E4A', charge: 24, desc: 'Een volledige sterrenkrans draait mee om de bal naar het doel', params: {} },
  ila:      { name: 'Ila Ice',               emoji: '🧊', mascot: '🧊', effect: 'charge', color: '#5BC0F8', charge: 24, desc: 'Een ijzige bal die kort bevriest en daarna een spekgladde nasleep achterlaat', params: {} },
  zeno:     { name: 'Zilveren Zeno',         emoji: '🥈', mascot: '🥈', effect: 'charge', color: '#C0C0C0', charge: 22, desc: 'Een zilveren spiegelbal vliegt in het exact tegenovergestelde pad mee', params: {} },
  roel:     { name: 'Roel de Rots',          emoji: '🪨', mascot: '🪨', effect: 'charge', color: '#7B2D8B', charge: 22, desc: 'Een complete rotslawine dendert mee naar het doel en bedelft de tegenstander onder het gesteente', params: {} },
  mjob:     { name: 'Jarige Job',            emoji: '🎂', mascot: '🎂', ballEmoji: '🎂', effect: 'charge', color: '#D4AF37', charge: 24, desc: 'Vliegt lang de lucht in en hangt daar, dan een reuzentaart-bal die van bovenaf feestelijk uit elkaar knalt — het beste schot van de klas, mist bijna nooit!', params: {} },
  mluuk:    { name: 'Lachende Luuk',         emoji: '😂', mascot: '😂', effect: 'charge', color: '#1A9E4A', charge: 18, desc: 'Drie giechelschokjes laten de tegenstander struikelen van het lachen', params: {} },
  pim:      { name: 'Pim Slim',              emoji: '🧠', mascot: '🧠', effect: 'charge', color: '#1D6FA4', charge: 20, desc: 'Berekent slim hoe ver de bal moet skippen om precies langs de tegenstander te glippen', params: {} },
  kayleigh: { name: 'Kleine Kayleigh',       emoji: '🎀', mascot: '🎀', effect: 'charge', color: '#FFC0DA', charge: 20, desc: 'Een piepklein, vrolijk stuiterend balletje dat lastig te blokkeren is', params: {} },
  tara:     { name: 'Tara Taart',            emoji: '🍰', mascot: '🍰', effect: 'charge', color: '#1A5C33', charge: 22, desc: 'Een brede stroom minisprinkels regent over het hele doel', params: {} },
  bardo:    { name: 'Bardo Doo Pipo',        emoji: '🤡', mascot: '🤡', effect: 'charge', color: '#C9A3E0', charge: 18, desc: 'Een clowneske toeter wisselt jullie plekken in één klap om', params: {} },
  vince:    { name: 'Veldbaas Vince',        emoji: '🛡️', mascot: '🛡️', effect: 'charge', color: '#E2001A', charge: 24, desc: 'Bouwt een verdedigingsmuur pal voor zijn eigen doel', params: {} },
  hailey:   { name: 'Hoces Foces Hailey',    emoji: '🌪️', mascot: '🌪️', effect: 'charge', color: '#5BC0F8', charge: 24, desc: 'Een wervelwind daalt recht neer bovenop de tegenstander', params: {} },
  lou:      { name: 'Lou de Koe',            emoji: '🐄', mascot: '🐄', effect: 'charge', color: '#5BC0F8', charge: 22, desc: 'Een trage maar onstuitbare charge met een reuzenkop', params: {} },
  bruno:    { name: 'Bliksem Bruno',         emoji: '🌩️', mascot: '🌩️', effect: 'charge', color: '#1A9E4A', charge: 24, desc: 'Een stormfront trekt over het hele veld richting het doel', params: {} },
  nina:     { name: 'Nina Stormina',         emoji: '💨', mascot: '💨', effect: 'charge', color: '#8A8F98', charge: 20, desc: 'Een complete cycloon grijpt de tegenstander en slingert hem in het rond', params: {} },
  elia:     { name: 'Engel Elia',            emoji: '👼', mascot: '👼', ballEmoji: '🕊️', effect: 'charge', color: '#FFF8D6', charge: 26, desc: 'Zuivert zichzelf en stijgt onraakbaar op als een engel, dan een lichtbundel met dalende veren van bovenaf', params: {} },
  vinn:     { name: 'Vinnige Vinn',          emoji: '🚀', mascot: '🚀', effect: 'charge', color: '#1D6FA4', charge: 22, desc: 'Bliksemsnelle dash gecombineerd met een messcherpe homing-knal', params: {} },
  suze:     { name: 'Sunny Suze',            emoji: '☀️', mascot: '☀️', effect: 'charge', color: '#FFE066', charge: 22, desc: 'Een felle flits verblindt én verwart de tegenstander even', params: {} },
}

// ── Authentieke Head Soccer power-shot per land ──────────────────────
// behavior = de ECHTE gameplay-mechaniek bij de super-omhaal (zie activateSpecial).
// Geïnspireerd op de gameplay-video's; elk land krijgt een eigen mechaniek:
//   skyrockets  -> bal schiet omhoog, daarna regent het raketten op de goal
//   goalram     -> keiharde dreun; raakt de tegenstander → die vliegt mét de bal de goal in
//   groundspike -> schot dat de tegenstander bij contact de grond in ramt
//   airshot     -> speler springt hoog en haalt de bal uit de lucht over de keeper
//   freeze      -> vriest de tegenstander vast in een blok ijs
//   icespikes   -> ijspegels schieten uit de grond en lanceren de tegenstander omhoog
//   multiball   -> vijf ballen tegelijk naar de goal (welke is echt?)
//   bighead     -> je kop wordt gigantisch en kopt de bal keihard binnen
//   lightning   -> bliksemschichten slaan in op de tegenstander
//   tornado     -> een tornado zuigt de bal mee de goal in
//   power       -> krachtige rechte knal (fallback)
// color = hoofdtint van de gloed/sunburst/bal.
// 16 landen, 16 verschillende supers — elk land een eigen mechaniek.
// figure = het grote themed figuur dat tijdens de super in beeld komt (uniek per land).
export const SUPERS = {
  nl: { behavior: 'groundspike', color: '#2bd46a', figure: '🐏' },
  de: { behavior: 'goalram',     color: '#ff7a00', figure: '🚂' },
  br: { behavior: 'multiball',   color: '#00d46a', figure: '🥁' },
  fr: { behavior: 'tornado',     color: '#3a6ee0', figure: '🌪️' },
  en: { behavior: 'skyrockets',  color: '#ff2a2a', figure: '🚀' },
  es: { behavior: 'bighead',     color: '#ffcc00', figure: '🐂' },
  pt: { behavior: 'curveball',   color: '#ff4500', figure: '🔥' },
  it: { behavior: 'freeze',      color: '#5bc8ff', figure: '⛄' },
  be: { behavior: 'lightning',   color: '#ffd23f', figure: '⚡' },
  us: { behavior: 'icespikes',   color: '#9fdcff', figure: '🧊' },
  mx: { behavior: 'airshot',     color: '#2aa8ff', figure: '🦅' },
  jp: { behavior: 'giantball',   color: '#ff8800', figure: '🐯' },
  ma: { behavior: 'charge',      color: '#c1272d', figure: '🐫' },
  sn: { behavior: 'ghost',       color: '#9ad9c0', figure: '👻' },
  hr: { behavior: 'bouncy',      color: '#ff3030', figure: '🏀' },
  ar: { behavior: 'meteor',      color: '#ff8c42', figure: '☄️' },
  // 16 nieuwe LUCHT-supers — elk een EIGEN mechaniek (geen reskins onderling):
  ng: { behavior: 'bicycle',     color: '#00b85e', figure: '🦅' }, // krullende omhaal
  gh: { behavior: 'multidrop',   color: '#ffd23f', figure: '⭐' }, // bal splitst in meerdere
  eg: { behavior: 'moonshot',    color: '#ff4d5e', figure: '🌙' }, // slow-motion zweefsprong
  cm: { behavior: 'eagledive',   color: '#00c98a', figure: '🦁' }, // poppetje duikt mee omlaag
  kr: { behavior: 'thunderdunk', color: '#3a7bff', figure: '🐯' }, // bliksem verlamt keeper
  sa: { behavior: 'cannondrop',  color: '#19a35f', figure: '🐪' }, // reuzenkogel
  au: { behavior: 'skyhammer',   color: '#3ad17a', figure: '🦘' }, // hamert keeper de grond in
  ca: { behavior: 'icyslide',    color: '#ff5a5a', figure: '🍁' }, // spekgladde besturing
  co: { behavior: 'starshower',  color: '#ffe04d', figure: '🌟' }, // loodrechte sterregen
  uy: { behavior: 'flatvolley',  color: '#3a8eff', figure: '☀️' }, // vlakke knal-volley
  ch: { behavior: 'airtornado',  color: '#ff4040', figure: '🏔️' }, // wervelwind zuigt bal in
  pl: { behavior: 'cometfall',   color: '#ff3b5c', figure: '☄️' }, // vuurkomeet + inslagregen
  dk: { behavior: 'coinflip',    color: '#ff3050', figure: '🪙' }, // 50/50 gok-schot
  se: { behavior: 'windwall',    color: '#3aa0ff', figure: '💛' }, // blaast tegenstander bij de bal weg
  tr: { behavior: 'dragonfire',  color: '#ff3030', figure: '🐉' }, // brandende hindernis-bal
  gr: { behavior: 'phoenixshield', color: '#2a7fff', figure: '🔱' }, // tijdelijk onraakbaar
  // 17 landen met ECHT NIEUWE mechanieken (veld-effecten, controle stelen, bal-transformaties):
  ec: { behavior: 'lowgravity',      color: '#ffe066', figure: '🪐' }, // zwaartekracht valt weg
  py: { behavior: 'reversecontrols', color: '#5da8ff', figure: '🪞' }, // besturing omgedraaid
  tn: { behavior: 'sandchaos',       color: '#e0b34d', figure: '🏜️' }, // chaotische stuiters
  dz: { behavior: 'desertswap',      color: '#2fbf71', figure: '🧭' }, // plek wisselen
  ci: { behavior: 'rootvines',       color: '#3fae4a', figure: '🌿' }, // vastgeworteld
  cv: { behavior: 'tidewave',        color: '#38b6ff', figure: '🌊' }, // golfstoten op de bal
  za: { behavior: 'hornlock',        color: '#ffcf4d', figure: '📯' }, // super-meter geblokkeerd
  ir: { behavior: 'carpetflight',    color: '#3ad17a', figure: '🧞' }, // vlucht dwars over het veld
  jo: { behavior: 'sandwall',        color: '#c9a24b', figure: '🏛️' }, // muur midden op het veld
  uz: { behavior: 'silkleash',       color: '#e0c14b', figure: '🕸️' }, // vastgebonden aan een plek
  qa: { behavior: 'heatblink',       color: '#ff8f6b', figure: '🌡️' }, // bal teleporteert vooruit
  pa: { behavior: 'canalboost',      color: '#4fa3ff', figure: '🚢' }, // vertraagde snelheidsboost
  cw: { behavior: 'coralfield',      color: '#ff7f7f', figure: '🪸' }, // stuiterende hindernissen
  ht: { behavior: 'voodoolink',      color: '#c76bff', figure: '🪆' }, // gedwongen te spiegelen
  nz: { behavior: 'hakapulse',       color: '#7fd142', figure: '🥝' }, // herhaalde schokgolven
  iq: { behavior: 'duneramp',        color: '#e0a45c', figure: '🏺' }, // vertraagde lancering
  no: { behavior: 'auroraflip',      color: '#7fd6ff', figure: '🌌' }, // volgende trap verkeerd om
  so: { behavior: 'multidrop',       color: '#4189DD', figure: '⭐' }, // bal schiet recht omhoog, splitst in een regen van ballen — 1 is echt
  // ── Groep 7: klasgenoten — elk EEN GLOEDNIEUWE mechaniek (zie HeadSoccer.jsx) ──
  dani:     { behavior: 'driftspin',     color: '#1a1a1a', figure: '🏎️' },  // lage glijschot, spint de tegenstander opzij
  bas:      { behavior: 'chainbolt',     color: '#E2001A', figure: '⚡' },  // 3 bliksemschichten laden de bal op
  liam:     { behavior: 'royaldecree',   color: '#FFD700', figure: '👑' },  // vertraagt tegenstander + koninklijke dash
  thamal:   { behavior: 'blastram',      color: '#FF8200', figure: '💥' },  // dubbele explosie: eerst een knal, dan nóg een grotere
  floor:    { behavior: 'hopdance',      color: '#FF8200', figure: '🦩' },  // reuzensprong met verendecoy + draaiende omhaal
  abdiali:  { behavior: 'starorbit',     color: '#1A9E4A', figure: '⭐' },  // volledige sterrenkrans om de bal
  ila:      { behavior: 'frostbite',     color: '#5BC0F8', figure: '🧊' },  // korte bevriezing → gladde nasleep
  zeno:     { behavior: 'mirrorstrike',  color: '#C0C0C0', figure: '🥈' },  // spiegelbal in tegengesteld pad
  roel:     { behavior: 'rockslide',     color: '#7B2D8B', figure: '🪨' },  // complete rotslawine met meerdere rollende keien
  mjob:     { behavior: 'birthdayblast', color: '#D4AF37', figure: '🎂' },  // reuzentaart-bal ontploft vertraagd
  mluuk:    { behavior: 'jokebomb',      color: '#1A9E4A', figure: '😂' },  // 3 giechelschokjes, instant
  pim:      { behavior: 'smartskip',     color: '#1D6FA4', figure: '🧠' },  // berekende skip-afstand
  kayleigh: { behavior: 'ribbonhop',     color: '#FFC0DA', figure: '🎀' },  // piepklein stuiterballetje
  tara:     { behavior: 'sprinklerain',  color: '#1A5C33', figure: '🍰' },  // brede sprinkelregen over het hele doel
  bardo:    { behavior: 'honkswap',      color: '#C9A3E0', figure: '🤡' },  // ruilt snelheid om, instant
  vince:    { behavior: 'goalwall',      color: '#E2001A', figure: '🛡️' }, // muur voor eigen doel, instant
  hailey:   { behavior: 'skytwister',    color: '#5BC0F8', figure: '🌪️' }, // wervelwind daalt op tegenstander neer
  lou:      { behavior: 'stampede',      color: '#5BC0F8', figure: '🐄' },  // trage onstuitbare reuzenkop-charge
  bruno:    { behavior: 'stormsurge',    color: '#1A9E4A', figure: '🌩️' }, // stormfront over het hele veld
  nina:     { behavior: 'windgust',      color: '#8A8F98', figure: '💨' },  // echte cycloon zuigt de tegenstander mee, instant
  elia:     { behavior: 'guardianwing',  color: '#FFF8D6', figure: '👼' },  // stijgt op, daalt neer met een lichtbundel + verenregen
  vinn:     { behavior: 'turboboost',    color: '#1D6FA4', figure: '🚀' },  // dash + messcherpe homing-knal
  suze:     { behavior: 'sunflare',      color: '#FFE066', figure: '☀️' }, // felle flits verblindt + verwart
}
export const getSuper = key => SUPERS[key] || { behavior: 'power', color: (MOVES[key] || MOVES.nl).color }

// Veld-/controle-effecten die GEEN bal nodig hebben: die gaan direct af zodra de
// super-knop wordt ingedrukt (charge vol), in plaats van te wachten tot de bal
// geraakt wordt. Alles wat niet in deze lijst staat is een ECHT superschot en
// vuurt pas af zodra de speler de bal raakt (zoals voorheen).
export const INSTANT_BEHAVIORS = new Set([
  'lowgravity', 'reversecontrols', 'rootvines', 'hornlock', 'sandwall',
  'silkleash', 'voodoolink', 'auroraflip', 'tidewave', 'hakapulse',
  // Groep 7
  'jokebomb', 'honkswap', 'goalwall', 'windgust',
])

// Korte uitleg per mechaniek (getoond op keuze-/intro-scherm, los van de land-naam)
export const SUPER_DESC = {
  skyrockets:  'Schiet omhoog en laat een raketregen op de goal neerdalen',
  goalram:     'Knal de bal zo hard dat de tegenstander mét bal de goal in vliegt',
  groundspike: 'Ram de tegenstander met de bal de grond in',
  airshot:     'Spring hoog en haal de bal uit de lucht over de keeper',
  freeze:      'Vries de tegenstander vast in een blok ijs',
  icespikes:   'Laat ijspegels uit de grond schieten die de tegenstander lanceren',
  multiball:   'Schiet vijf ballen tegelijk op de goal af',
  bighead:     'Je kop wordt gigantisch en kopt de bal keihard binnen',
  lightning:   'Roep bliksemschichten op die op de tegenstander inslaan',
  tornado:     'Een tornado zuigt de bal mee de goal in',
  curveball:   'Brandende banaan-curve die om de keeper heen krult',
  bouncy:      'Superstuiterende bal die laag en razendsnel de goal in kaatst',
  ghost:       'De bal wordt een spookbal — bijna onzichtbaar voor je tegenstander',
  giantball:   'De bal wordt gigantisch en rolt onhoudbaar de goal in',
  meteor:      'De bal vliegt omhoog en stort als een vuurmeteoor de goal in',
  charge:      'Je dendert vooruit en beukt de tegenstander én de bal weg',
  power:       'Krachtige knal recht op de goal',
  bicycle:     'Hoge omhaal-salto met een meevliegende spookbal — de keeper moet raden welke echt is',
  multidrop:   'De bal springt op en splitst in meerdere die op de goal neerdalen',
  moonshot:    'Slow-motion zweefsprong; de maanzwaartekracht laat je tegenstander even hulpeloos meezweven',
  eagledive:   'Schiet omhoog en duik dan pijlsnel mét de bal op de goal — de inslag stoot je tegenstander omhoog',
  thunderdunk: 'Bliksemschichten verlammen de keeper, dan een spies van bovenaf',
  cannondrop:  'De bal zwelt tot een reuzenkogel; de inslag blaast jullie beiden uit elkaar',
  skyhammer:   'Een reuzenhamer ramt de keeper de grond in; de bal lobt erin',
  icyslide:    'Het veld wordt spekglad: je tegenstander kan niet meer stoppen of draaien',
  starshower:  'Sterren vallen loodrecht op de goal en verlammen de keeper',
  flatvolley:  'Een keiharde, vlakke volley — het felle licht verblindt je tegenstander even (geen sprong)',
  airtornado:  'Een wervelwind tilt de bal op en zuigt ook je tegenstander naar zich toe',
  cometfall:   'De bal stort als vuurkomeet neer met een inslagregen',
  coinflip:    'Een gok-schot: 50% kans op een megaschot, 50% kans op een mislukking',
  windwall:    'Een muur van wind blaast je tegenstander steeds weg bij de bal',
  dragonfire:  'De bal vat vlam — iedereen die hem aanraakt (behalve jij) wordt weggeschroeid',
  phoenixshield: 'Je herrijst als een feniks en bent even onraakbaar voor meppen en rammen',
  lowgravity:      'Bijna geen zwaartekracht meer: iedereen zweeft in slow motion door de lucht',
  reversecontrols: 'Draait de besturing van je tegenstander tijdelijk om',
  sandchaos:       'Een zandstorm maakt elke stuiter van de bal onvoorspelbaar',
  desertswap:      'Wissel bliksemsnel van plek met je tegenstander en schiet meteen',
  rootvines:       'Wortels grijpen je tegenstander vast aan de grond',
  tidewave:        'Golven duwen de bal steeds weer richting de goal',
  hornlock:        'Blokkeert tijdelijk de super-meter van je tegenstander',
  carpetflight:    'Vlieg in één keer dwars over het veld naar de goal',
  sandwall:        'Bouwt een muur midden op het veld die de bal terugkaatst',
  silkleash:       'Bindt je tegenstander vast aan een klein gebied',
  heatblink:       'De bal flitst in een oogwenk voorbij je tegenstander',
  canalboost:      'De bal krijgt na een korte vertraging een enorme snelheidsboost',
  coralfield:      'Scherpe punten laten de bal alle kanten op springen',
  voodoolink:      'Dwingt je tegenstander om jouw bewegingen te kopiëren',
  hakapulse:       'Dreunende schokgolven stampen de bal steeds weer omhoog',
  duneramp:        'De bal raast over een duin en schiet steil de lucht in',
  auroraflip:      'Verwart je tegenstander: zijn volgende trap gaat de verkeerde kant op',
  // ── Groep 7: 23 gloednieuwe mechanieken ──
  driftspin:     'Een lage, snelle glijschot die bij inslag de tegenstander zijwaarts een spin-out injaagt',
  chainbolt:     'Drie bliksemschichten laden de bal steeds verder op onderweg naar het doel',
  royaldecree:   'Vertraagt de tegenstander met een koninklijk bevel terwijl jij er met de bal vandoor stormt',
  blastram:      'Een dubbele megaknal: eerst een explosie bij inslag, dan na een paar tellen nóg een grotere',
  hopdance:      'Een reuzensprong met een wolk veren, eindigend in een zwierige draaiende omhaal',
  starorbit:     'Een volledige sterrenkrans draait mee om de bal naar het doel',
  frostbite:     'Een ijzige bal die kort bevriest en daarna een spekgladde nasleep achterlaat',
  mirrorstrike:  'Een spiegelbal vliegt mee in het exact tegenovergestelde pad — welke is echt?',
  rockslide:     'Een complete rotslawine dendert mee naar het doel en bedelft de tegenstander onder het gesteente',
  birthdayblast: 'Vliegt lang de lucht in en hangt daar, dan knalt een reuzentaart-bal van bovenaf uit elkaar — bijna niet te missen',
  jokebomb:      'Drie giechelschokjes laten de tegenstander struikelen van het lachen',
  smartskip:     'Berekent slim hoe ver de bal moet skippen om precies langs de tegenstander te glippen',
  ribbonhop:     'Een piepklein, vrolijk stuiterend balletje dat lastig te blokkeren is',
  sprinklerain:  'Een brede stroom minisprinkels regent over het hele doel',
  honkswap:      'Een clowneske toeter wisselt jullie plekken in één klap om',
  goalwall:      'Bouwt een verdedigingsmuur pal voor je eigen doel',
  skytwister:    'Een wervelwind daalt recht neer bovenop de tegenstander',
  stampede:      'Een trage maar onstuitbare charge met een reuzenkop',
  stormsurge:    'Een stormfront trekt over het hele veld richting het doel',
  windgust:      'Een complete cycloon grijpt de tegenstander en slingert hem in het rond',
  guardianwing:  'Zuivert jezelf en stijgt onraakbaar op als een engel — dan een lichtbundel met dalende veren van bovenaf',
  turboboost:    'Bliksemsnelle dash gecombineerd met een messcherpe homing-knal',
  sunflare:      'Een felle flits verblindt én verwart de tegenstander even',
}
export const superDescOf = key => SUPER_DESC[getSuper(key).behavior] || SUPER_DESC.power

export const getMove = key => MOVES[key] || MOVES.nl
