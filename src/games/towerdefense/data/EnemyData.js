// ── Laag-definities (BTD6-stijl) ─────────────────────────────────────
// Elke laag heeft: kleur, snelheid, HP, immuniteiten
// immune: ['explosion','ice','poison','pierce','lightning']
export const LAYERS = {
  red:    { color: 0xFF2222, border: 0xAA0000, speed: 70,  hp: 1,  glow: 0xFF6666 },
  blue:   { color: 0x2255FF, border: 0x0033BB, speed: 90,  hp: 1,  glow: 0x88AAFF },
  green:  { color: 0x22BB22, border: 0x006600, speed: 110, hp: 1,  glow: 0x88FF88 },
  yellow: { color: 0xFFDD00, border: 0xBB8800, speed: 155, hp: 1,  glow: 0xFFEE88 },
  pink:   { color: 0xFF88BB, border: 0xCC3377, speed: 190, hp: 1,  glow: 0xFFBBDD },
  black:  { color: 0x333333, border: 0x000000, speed: 110, hp: 1,  glow: 0x888888, immune: ['explosion'] },
  white:  { color: 0xEEEEEE, border: 0xAAAAAA, speed: 110, hp: 1,  glow: 0xFFFFFF, immune: ['ice'] },
  purple: { color: 0x9922CC, border: 0x5500AA, speed: 120, hp: 1,  glow: 0xCC88FF, immune: ['poison'] },
  lead:   { color: 0x778899, border: 0x445566, speed: 50,  hp: 1,  glow: 0xAABBCC, immune: ['pierce', 'lightning'] },
  ceramic:{ color: 0xCC7722, border: 0x884400, speed: 65,  hp: 10, glow: 0xEEAA66 },
  moab:   { color: 0x2244AA, border: 0x112266, speed: 30,  hp: 200,glow: 0x6688DD, immune: ['poison'] },
}

// ── Vijand-types ──────────────────────────────────────────────────────
// layers: array van laag-namen, buitenste laag eerst
// size: visuele straal in px
// reward: goud per kill
// flies: recht van links naar rechts (negeert waypoints)
export const ENEMIES = {
  // Vroeg spel
  red:    { key:'red',    name:'Rood',      size:13, reward:1,   layers:['red'] },
  blue:   { key:'blue',   name:'Blauw',     size:14, reward:2,   layers:['blue','red'] },
  green:  { key:'green',  name:'Groen',     size:15, reward:3,   layers:['green','blue','red'] },
  yellow: { key:'yellow', name:'Geel',      size:15, reward:5,   layers:['yellow','green','blue','red'] },

  // Speciaal (met immuniteiten)
  black:  { key:'black',  name:'Zwart',     size:16, reward:11,  layers:['black','black','pink','yellow'] },
  white:  { key:'white',  name:'Wit',       size:16, reward:11,  layers:['white','white','pink','yellow'] },
  purple: { key:'purple', name:'Paars',     size:16, reward:11,  layers:['purple','purple','pink','yellow'] },
  lead:   { key:'lead',   name:'Lood',      size:18, reward:23,  layers:['lead','lead','black','green'] },

  // Laat spel
  ceramic:{ key:'ceramic',name:'Keramiek',  size:20, reward:38,  layers:['ceramic','ceramic','yellow','yellow'] },
  flying: { key:'flying', name:'Vlieger',   size:13, reward:10,  layers:['pink','yellow'], flies:true },
  rainbow:{ key:'rainbow',name:'Regenboog', size:18, reward:25,  layers:['yellow','yellow','black','white'] },

  // Eindbaas
  boss:   { key:'boss',   name:'MOAB',      size:36, reward:200,
            layers:['moab','moab','ceramic','ceramic','lead','lead','black','white','purple','green','red'] },
}
