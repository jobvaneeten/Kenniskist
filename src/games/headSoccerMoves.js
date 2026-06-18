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

export const getMove = key => MOVES[key] || MOVES.nl
