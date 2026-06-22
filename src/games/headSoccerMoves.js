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
  ng: { name: 'Adelaarsomhaal',emoji: '🦅', mascot: '🦅', effect: 'air', color: '#008751', charge: 24, desc: 'Spring hoog en sla de bal in een omhaal over de keeper' },
  gh: { name: 'Sterrenduik',   emoji: '⭐', mascot: '⭐', effect: 'air', color: '#FCD116', charge: 24, desc: 'De bal stijgt en stort als een vallende ster op de goal' },
  eg: { name: 'Maanschot',     emoji: '🌙', mascot: '🌙', effect: 'air', color: '#CE1126', charge: 26, desc: 'Een gigantische maansprong en de bal valt loodrecht in de goal' },
  cm: { name: 'Leeuwenduik',   emoji: '🦁', mascot: '🦁', effect: 'air', color: '#007A5E', charge: 24, desc: 'Spring als een leeuw uit de lucht en duik op de bal' },
  kr: { name: 'Donderdunk',    emoji: '🐯', mascot: '🐯', effect: 'air', color: '#003478', charge: 24, desc: 'Spring hoog en dunk de bal met de donder de goal in' },
  sa: { name: 'Kanonduik',     emoji: '🐪', mascot: '🐪', effect: 'air', color: '#006C35', charge: 26, desc: 'De bal schiet de lucht in en valt als een kanonbal omlaag' },
  au: { name: 'Kangoeroesmash',emoji: '🦘', mascot: '🦘', effect: 'air', color: '#00843D', charge: 22, desc: 'Een mega kangoeroesprong en een smash van bovenaf' },
  ca: { name: 'Sneeuwstorm',   emoji: '🍁', mascot: '🍁', effect: 'air', color: '#FF0000', charge: 24, desc: 'Spring op en laat de bal door een sneeuwstorm naar binnen vallen' },
  co: { name: 'Sterrenregen',  emoji: '🌟', mascot: '🌟', effect: 'air', color: '#FCD116', charge: 24, desc: 'Spring hoog terwijl een sterrenregen de bal de goal in jaagt' },
  uy: { name: 'Zonvolley',     emoji: '☀️', mascot: '☀️', effect: 'air', color: '#0038A8', charge: 24, desc: 'Spring en volley de hoge bal vol op de goal' },
  ch: { name: 'Bergtol',       emoji: '🏔️', mascot: '🏔️', effect: 'air', color: '#D52B1E', charge: 24, desc: 'Een tollende sprong slingert de bal van boven de goal in' },
  pl: { name: 'Komeetduik',    emoji: '☄️', mascot: '☄️', effect: 'air', color: '#DC143C', charge: 24, desc: 'De bal vliegt op en komt als een komeet naar beneden' },
  dk: { name: 'Achterwaartse', emoji: '🪙', mascot: '🪙', effect: 'air', color: '#C60C30', charge: 22, desc: 'Een achterwaartse salto-trap hoog over de keeper heen' },
  se: { name: 'Zweefschot',    emoji: '💛', mascot: '💛', effect: 'air', color: '#006AA7', charge: 22, desc: 'Zweef hoog door de lucht en laat de bal zacht binnenvallen' },
  tr: { name: 'Draakduik',     emoji: '🐉', mascot: '🐉', effect: 'air', color: '#E30A17', charge: 24, desc: 'Duik als een draak uit de lucht boven op de bal' },
  gr: { name: 'Feniksvlucht',  emoji: '🔱', mascot: '🔱', effect: 'air', color: '#0D5EAF', charge: 24, desc: 'Rijs op als een feniks en laat de bal omlaag spiralen' },
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
  ca: { behavior: 'snowfreeze',  color: '#ff5a5a', figure: '🍁' }, // bevriest de keeper
  co: { behavior: 'starshower',  color: '#ffe04d', figure: '🌟' }, // loodrechte sterregen
  uy: { behavior: 'flatvolley',  color: '#3a8eff', figure: '☀️' }, // vlakke knal-volley
  ch: { behavior: 'airtornado',  color: '#ff4040', figure: '🏔️' }, // wervelwind zuigt bal in
  pl: { behavior: 'cometfall',   color: '#ff3b5c', figure: '☄️' }, // vuurkomeet + inslagregen
  dk: { behavior: 'bouncelob',   color: '#ff3050', figure: '🪙' }, // stuiterende salto
  se: { behavior: 'ghostfloat',  color: '#3aa0ff', figure: '💛' }, // zwevende spookbal
  tr: { behavior: 'dragonram',   color: '#ff3030', figure: '🐉' }, // ramt keeper mét bal binnen
  gr: { behavior: 'phoenixhead', color: '#2a7fff', figure: '🔱' }, // reuzenkop-kopbal
}
export const getSuper = key => SUPERS[key] || { behavior: 'power', color: (MOVES[key] || MOVES.nl).color }

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
  bicycle:     'Hoge omhaal-salto; de bal krult met veel effect over de keeper',
  multidrop:   'De bal springt op en splitst in meerdere die op de goal neerdalen',
  moonshot:    'Slow-motion zweefsprong; de bal daalt loom en onhoudbaar in de goal',
  eagledive:   'Schiet omhoog en duik dan pijlsnel mét de bal op de goal',
  thunderdunk: 'Bliksemschichten verlammen de keeper, dan een spies van bovenaf',
  cannondrop:  'De bal zwelt tot een reuzenkogel en beukt de goal in',
  skyhammer:   'Een reuzenhamer ramt de keeper de grond in; de bal lobt erin',
  snowfreeze:  'De keeper vriest vast in het ijs terwijl de bal binnenvalt',
  starshower:  'Sterren vallen loodrecht op de goal en verlammen de keeper',
  flatvolley:  'Een keiharde, vlakke volley op kophoogte vol op de goal',
  airtornado:  'Een wervelwind tilt de bal op en zuigt hem de goal in',
  cometfall:   'De bal stort als vuurkomeet neer met een inslagregen',
  bouncelob:   'Achterwaartse salto; de bal stuitert hoog over de keeper heen',
  ghostfloat:  'De bal wordt half-onzichtbaar en zweeft onleesbaar traag binnen',
  dragonram:   'Een vurige duik die de keeper mét bal de goal in ramt',
  phoenixhead: 'Rijs op met een reuzenkop en kop de bal keihard omlaag binnen',
}
export const superDescOf = key => SUPER_DESC[getSuper(key).behavior] || SUPER_DESC.power

export const getMove = key => MOVES[key] || MOVES.nl
