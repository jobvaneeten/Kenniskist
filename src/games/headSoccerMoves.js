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
export const SUPERS = {
  nl: { behavior: 'groundspike', color: '#2bd46a' },
  de: { behavior: 'goalram',     color: '#ff7a00' },
  br: { behavior: 'multiball',   color: '#00d46a' },
  fr: { behavior: 'tornado',     color: '#3a6ee0' },
  en: { behavior: 'skyrockets',  color: '#ff2a2a' },
  es: { behavior: 'bighead',     color: '#ffcc00' },
  pt: { behavior: 'curveball',   color: '#ff4500' },
  it: { behavior: 'freeze',      color: '#5bc8ff' },
  be: { behavior: 'lightning',   color: '#ffd23f' },
  us: { behavior: 'icespikes',   color: '#9fdcff' },
  mx: { behavior: 'airshot',     color: '#2aa8ff' },
  jp: { behavior: 'giantball',   color: '#ff8800' },
  ma: { behavior: 'charge',      color: '#c1272d' },
  sn: { behavior: 'ghost',       color: '#9ad9c0' },
  hr: { behavior: 'bouncy',      color: '#ff3030' },
  ar: { behavior: 'meteor',      color: '#ff8c42' },
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
}
export const superDescOf = key => SUPER_DESC[getSuper(key).behavior] || SUPER_DESC.power

export const getMove = key => MOVES[key] || MOVES.nl
