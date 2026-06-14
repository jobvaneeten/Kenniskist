// ── Per-clothing-type item catalog ───────────────────────────────────
// Each item is one of:
//   color   : flat colour              { kind:'color',   hex }
//   pattern : procedural canvas texture { kind:'pattern', pattern, c1, c2 }
//   print   : tiled emoji print         { kind:'print',   emoji, bg }
//   model   : GLB shirt (Ajax/PSV)      { kind:'model',   file, preview }

const color   = (key, label, rarity, hex)               => ({ key, label, rarity, kind: 'color', hex })
const pat     = (key, label, rarity, pattern, c1, c2)   => ({ key, label, rarity, kind: 'pattern', pattern, c1, c2 })
const print   = (key, label, rarity, emoji, bg)         => ({ key, label, rarity, kind: 'print', emoji, bg })
const model   = (key, label, file, preview)             => ({ key, label, rarity: 'ultra_legendary', kind: 'model', file, preview })
// Donor GLB with a custom baked texture image (a designed clothing skin)
const texmodel = (key, label, file, texture, preview)  => ({ key, label, rarity: 'ultra_legendary', kind: 'texmodel', file, texture, preview })

// Base colours shared by every clothing type (keeps existing saved unlocks)
const BASE = () => [
  color('rood',   'Rood',   'common',    '#e63946'),
  color('blauw',  'Blauw',  'common',    '#1d6fa4'),
  color('groen',  'Groen',  'common',    '#2d9e4f'),
  color('wit',    'Wit',    'common',    '#f0f0f0'),
  color('geel',   'Geel',   'rare',      '#f4c430'),
  color('oranje', 'Oranje', 'rare',      '#f77f00'),
  color('paars',  'Paars',  'epic',      '#7b2d8b'),
  color('zwart',  'Zwart',  'legendary', '#222222'),
]

export const CATALOG = {
  shirt: [
    ...BASE(),
    pat  ('strepen_rb', 'Rood-blauw gestreept', 'common', 'stripes', '#e63946', '#1d6fa4'),
    pat  ('stippen_w',  'Witte stippen',        'common', 'dots',    '#1d6fa4', '#ffffff'),
    pat  ('verloop_zon','Zonsverloop',          'rare',   'gradient','#f77f00', '#f4c430'),
    print('voetbal',    'Voetbal print',        'rare',   '⚽',       '#0d8a3e'),
    print('ster',       'Sterren',              'rare',   '⭐',       '#1a2a55'),
    pat  ('camo',       'Camouflage',           'epic',   'camo',    '#4a5d23', '#2d3a16'),
    pat  ('ruit',       'Ruitje',               'epic',   'checker', '#e63946', '#111111'),
    print('bliksem',    'Bliksem',              'epic',   '⚡',       '#1b1b2f'),
    print('vuur',       'Vuur',                 'legendary', '🔥',    '#2a0a00'),
    print('kampioen',   'Kampioen',             'legendary', '🏆',    '#3a2e00'),
    // ── extra shirts ──
    color('turkoois',   'Turkoois',             'common',    '#2ec4b6'),
    color('roze',       'Roze',                 'common',    '#ff6fb5'),
    color('lime',       'Limegroen',            'common',    '#9ccc3c'),
    color('navy',       'Marineblauw',          'rare',      '#1b2a52'),
    color('koraal',     'Koraal',               'rare',      '#ff6f5e'),
    color('magentakl',  'Magenta',              'epic',      '#d6336c'),
    color('zilver',     'Zilver',               'epic',      '#c4cdd6'),
    color('goud',       'Goud',                 'legendary', '#d4af37'),
    pat  ('strepen_gp', 'Groen-paars gestreept','common',    'stripes', '#2d9e4f', '#7b2d8b'),
    pat  ('stippen_zw', 'Zwarte stippen',       'common',    'dots',    '#f4c430', '#222222'),
    pat  ('verloop_oceaan','Oceaanverloop',     'rare',      'gradient','#2ec4b6', '#1d6fa4'),
    pat  ('camo_woestijn','Woestijn-camo',      'rare',      'camo',    '#c2a36b', '#8a6d3b'),
    pat  ('ruit_pw',    'Paars ruitje',         'epic',      'checker', '#7b2d8b', '#f0f0f0'),
    print('hart_sh',    'Hartjes',              'rare',      '❤️',     '#3a0010'),
    print('raket_sh',   'Raketten',             'epic',      '🚀',     '#0a1030'),
    print('draak_sh',   'Draken',               'legendary', '🐲',     '#06250f'),
    print('eenhoorn_sh','Eenhoorn',             'ultra_legendary', '🦄', '#2a0a3a'),
    print('regenboog_sh','Regenboog',           'ultra_legendary', '🌈', '#101030'),
    // ── extra shirts (batch 2) ──
    color('hemelsblauw','Hemelsblauw',          'common',    '#56ccf2'),
    color('perzik',     'Perzik',               'common',    '#ffb997'),
    color('aqua',       'Aqua',                 'rare',      '#00d4d4'),
    color('indigo',     'Indigo',               'rare',      '#4b3bbb'),
    color('amber',      'Amber',                'epic',      '#ffbf00'),
    color('robijn',     'Robijnrood',           'legendary', '#9b111e'),
    pat  ('strepen_bw2','Blauw-wit gestreept',  'common',    'stripes', '#1d6fa4', '#f0f0f0'),
    pat  ('stippen_rw', 'Rood-wit stippen',     'common',    'dots',    '#e63946', '#ffffff'),
    pat  ('verloop_lava','Lavaverloop',         'rare',      'gradient','#e34234', '#ffbf00'),
    pat  ('camo_grijs', 'Grijze camo',          'rare',      'camo',    '#6b7280', '#374151'),
    pat  ('ruit_groenw','Groen ruitje',         'epic',      'checker', '#2d9e4f', '#f0f0f0'),
    pat  ('regenboog_pat','Regenboogprint',     'ultra_legendary', 'rainbow', '#e63946', '#7b2d8b'),
    print('panda_sh',   'Pandas',               'rare',      '🐼',     '#2a2a2a'),
    print('vlinder_sh', 'Vlinders',             'rare',      '🦋',     '#1a0a2a'),
    print('basket_sh',  'Basketbal',            'rare',      '🏀',     '#3a1c00'),
    print('pizza_sh',   'Pizza',                'epic',      '🍕',     '#3a1500'),
    print('robot_sh',   'Robots',               'epic',      '🤖',     '#10202a'),
    print('alien_sh',   'Aliens',               'epic',      '👽',     '#0a2a10'),
    print('leeuw_sh',   'Leeuwen',              'legendary', '🦁',     '#3a2a00'),
    print('aarde_sh',   'Aarde',                'legendary', '🌍',     '#06203a'),
    model('ajax',       'Ajax Shirt',           '/ajaxshirt.glb', '/logo_ajax.svg'),
    model('psv',        'PSV Shirt',            '/psvshirt.glb',  '/logo_psv.svg'),
  ],
  broek: [
    ...BASE(),
    pat  ('spijker',    'Spijkerstof',          'common', 'gradient','#3b6ea5', '#274b6e'),
    pat  ('strepen_zw', 'Zwart gestreept',      'common', 'stripes', '#222222', '#444444'),
    pat  ('camo_groen', 'Camo groen',           'rare',   'camo',    '#4a5d23', '#2d3a16'),
    print('bliksem_b',  'Bliksem',              'rare',   '⚡',       '#15152a'),
    print('hartjes',    'Hartjes',              'rare',   '❤️',      '#3a0010'),
    pat  ('ruit_b',     'Ruitje',               'epic',   'checker', '#1d6fa4', '#0c2a40'),
    pat  ('stippen_g',  'Gouden stippen',       'epic',   'dots',    '#222222', '#f4c430'),
    print('vuur_b',     'Vuur',                 'epic',   '🔥',      '#2a0a00'),
    print('kroon',      'Kroon',                'legendary', '👑',   '#2a1f00'),
    print('diamant',    'Diamant',              'legendary', '💎',   '#06243a'),
    print('eenhoorn',   'Eenhoorn',             'ultra_legendary', '🦄', '#2a0a3a'),
    print('regenboog_b','Regenboog',            'ultra_legendary', '🌈', '#101030'),
    // ── extra broeken ──
    color('turkoois',   'Turkoois',             'common',    '#2ec4b6'),
    color('roze',       'Roze',                 'common',    '#ff6fb5'),
    color('navy',       'Marineblauw',          'common',    '#1b2a52'),
    color('bordeaux',   'Bordeaux',             'rare',      '#7a1f2b'),
    color('mint',       'Mint',                 'rare',      '#3ddc97'),
    color('goud_b',     'Goud',                 'legendary', '#d4af37'),
    pat  ('strepen_rw', 'Rood-wit gestreept',   'common',    'stripes', '#e63946', '#f0f0f0'),
    pat  ('stippen_bl', 'Blauwe stippen',       'common',    'dots',    '#f0f0f0', '#1d6fa4'),
    pat  ('verloop_zons','Zonsondergang',       'rare',      'gradient','#f77f00', '#d6336c'),
    pat  ('camo_blauw', 'Blauwe camo',          'rare',      'camo',    '#1d6fa4', '#0c2a40'),
    pat  ('ruit_groen', 'Groen ruitje',         'epic',      'checker', '#2d9e4f', '#0c2a16'),
    print('voetbal_b',  'Voetbal',              'rare',      '⚽',      '#0d8a3e'),
    print('ster_b',     'Sterren',              'rare',      '⭐',      '#1a2a55'),
    print('vos_b',      'Vosjes',               'epic',      '🦊',      '#3a1a00'),
    print('raket_b',    'Raketten',             'epic',      '🚀',      '#0a1030'),
    print('draak_b',    'Draken',               'legendary', '🐲',      '#06250f'),
    // ── extra broeken (batch 2) ──
    color('hemelsblauw','Hemelsblauw',          'common',    '#56ccf2'),
    color('olijf',      'Olijfgroen',           'common',    '#7a7a2a'),
    color('staalblauw', 'Staalblauw',           'rare',      '#4682b4'),
    color('lavendel',   'Lavendel',             'rare',      '#b794f6'),
    color('amber_b',    'Amber',                'epic',      '#ffbf00'),
    color('robijn_b',   'Robijnrood',           'legendary', '#9b111e'),
    pat  ('strepen_gw', 'Groen-wit gestreept',  'common',    'stripes', '#2d9e4f', '#f0f0f0'),
    pat  ('stippen_geel','Gele stippen',        'common',    'dots',    '#222222', '#f4c430'),
    pat  ('verloop_zee_b','Zeeverloop',         'rare',      'gradient','#00d4d4', '#1d6fa4'),
    pat  ('camo_grijs_b','Grijze camo',         'rare',      'camo',    '#6b7280', '#374151'),
    pat  ('ruit_zww',   'Zwart-wit ruitje',     'epic',      'checker', '#222222', '#f0f0f0'),
    pat  ('regenboog_pat_b','Regenboogprint',   'ultra_legendary', 'rainbow', '#e63946', '#7b2d8b'),
    print('haai_b',     'Haaien',               'rare',      '🦈',     '#06283a'),
    print('burger_b',   'Hamburgers',           'rare',      '🍔',     '#3a2200'),
    print('game_b',     'Gamepads',             'rare',      '🎮',     '#10102a'),
    print('octopus_b',  'Octopussen',           'epic',      '🐙',     '#2a0a2a'),
    print('tijger_b',   'Tijgers',              'epic',      '🐯',     '#3a2200'),
    print('robot_b',    'Robots',               'epic',      '🤖',     '#10202a'),
    print('skull_b',    'Skulls',               'legendary', '💀',     '#1a1a1a'),
    print('planeet_b',  'Planeten',             'legendary', '🪐',     '#0a0a2a'),
    texmodel('ajaxbroek', 'Ajax Broek', '/test/nieuwebroektest.glb', '/test/uvmapajaxbroek.png', '/logo_ajax.svg'),
    texmodel('psvbroek',  'PSV Broek',  '/test/nieuwebroektest.glb', '/test/uvmappsvbroek.png',  '/logo_psv.svg'),
  ],
  sokken: [
    ...BASE(),
    pat  ('strepen_kl', 'Kleurstrepen',         'common', 'stripes', '#e63946', '#f4c430'),
    pat  ('stippen_r',  'Rode stippen',         'common', 'dots',    '#ffffff', '#e63946'),
    print('hond',       'Hondjes',              'rare',   '🐶',      '#5a3a1a'),
    print('kat',        'Katjes',               'rare',   '🐱',      '#3a2a1a'),
    print('voetbal_s',  'Voetbal',              'rare',   '⚽',      '#0d8a3e'),
    pat  ('zigzag',     'Zigzag',               'epic',   'stripes', '#7b2d8b', '#f4c430'),
    print('aap',        'Aapjes',               'epic',   '🐵',      '#3a2410'),
    print('ster_s',     'Sterren',              'epic',   '⭐',      '#1a2a55'),
    print('vos',        'Vosjes',               'legendary', '🦊',   '#3a1a00'),
    print('draak',      'Draken',               'legendary', '🐲',   '#06250f'),
    print('eenhoorn_s', 'Eenhoorn',             'ultra_legendary', '🦄', '#2a0a3a'),
    print('regenboog_s','Regenboog',            'ultra_legendary', '🌈', '#101030'),
    // ── extra sokken ──
    color('turkoois',   'Turkoois',             'common',    '#2ec4b6'),
    color('roze',       'Roze',                 'common',    '#ff6fb5'),
    color('lime',       'Limegroen',            'common',    '#9ccc3c'),
    color('navy',       'Marineblauw',          'rare',      '#1b2a52'),
    color('koraal',     'Koraal',               'rare',      '#ff6f5e'),
    color('goud_s',     'Goud',                 'legendary', '#d4af37'),
    pat  ('strepen_bw', 'Blauw-wit gestreept',  'common',    'stripes', '#1d6fa4', '#f0f0f0'),
    pat  ('stippen_zw_s','Zwarte stippen',      'common',    'dots',    '#f4c430', '#222222'),
    pat  ('verloop_zee','Zeeverloop',           'rare',      'gradient','#2ec4b6', '#1d6fa4'),
    pat  ('camo_roze',  'Roze camo',            'epic',      'camo',    '#ff6fb5', '#b3477e'),
    pat  ('ruit_rood',  'Rood ruitje',          'epic',      'checker', '#e63946', '#111111'),
    print('raket_s',    'Raketten',             'rare',      '🚀',      '#0a1030'),
    print('hart_s',     'Hartjes',              'rare',      '❤️',      '#3a0010'),
    print('vuur_s',     'Vuur',                 'epic',      '🔥',      '#2a0a00'),
    print('kroon_s',    'Kroon',                'legendary', '👑',      '#2a1f00'),
    // ── extra sokken (batch 2) ──
    color('perzik',     'Perzik',               'common',    '#ffb997'),
    color('aqua',       'Aqua',                 'common',    '#00d4d4'),
    color('jade',       'Jade',                 'rare',      '#00a86b'),
    color('lavendel',   'Lavendel',             'rare',      '#b794f6'),
    color('amber_s',    'Amber',                'epic',      '#ffbf00'),
    color('saffier',    'Saffierblauw',         'legendary', '#0f52ba'),
    pat  ('strepen_pw', 'Paars-wit gestreept',  'common',    'stripes', '#7b2d8b', '#f0f0f0'),
    pat  ('stippen_gr', 'Groene stippen',       'common',    'dots',    '#f0f0f0', '#2d9e4f'),
    pat  ('verloop_zon_s','Zonsverloop',        'rare',      'gradient','#f77f00', '#f4c430'),
    pat  ('camo_paars_s','Paarse camo',         'rare',      'camo',    '#7b2d8b', '#3a1550'),
    pat  ('ruit_blw_s', 'Blauw ruitje',         'epic',      'checker', '#1d6fa4', '#f0f0f0'),
    pat  ('regenboog_pat_s','Regenboogprint',   'ultra_legendary', 'rainbow', '#e63946', '#7b2d8b'),
    print('pinguin_s',  'Pinguïns',             'rare',      '🐧',     '#06283a'),
    print('kikker_s',   'Kikkers',              'rare',      '🐸',     '#0a2a10'),
    print('bij_s',      'Bijtjes',              'rare',      '🐝',     '#3a2e00'),
    print('ijsje_s',    'IJsjes',               'rare',      '🍦',     '#2a1a3a'),
    print('aardbei_s',  'Aardbeien',            'epic',      '🍓',     '#3a0010'),
    print('uil_s',      'Uilen',                'epic',      '🦉',     '#2a1a00'),
    print('dino_s',     'Dinos',                'legendary', '🦖',     '#0a2a10'),
    print('spook_s',    'Spookjes',             'legendary', '👻',     '#10102a'),
  ],
  schoenen: [
    ...BASE(),
    pat  ('strepen_wit','Witte strepen',        'common', 'stripes', '#222222', '#ffffff'),
    pat  ('verloop_vuur','Vuurverloop',         'common', 'gradient','#e63946', '#f77f00'),
    print('bliksem_sch','Bliksem',              'rare',   '⚡',       '#15152a'),
    print('ster_sch',   'Sterren',              'rare',   '⭐',      '#1a2a55'),
    pat  ('camo_sch',   'Camo',                 'rare',   'camo',    '#4a5d23', '#2d3a16'),
    pat  ('ruit_sch',   'Ruitje',               'epic',   'checker', '#7b2d8b', '#111111'),
    print('vuur_sch',   'Vuur',                 'epic',   '🔥',      '#2a0a00'),
    print('raket',      'Raketten',             'epic',   '🚀',      '#0a1030'),
    print('kroon_sch',  'Kroon',                'legendary', '👑',   '#2a1f00'),
    print('diamant_sch','Diamant',              'legendary', '💎',   '#06243a'),
    print('eenhoorn_sch','Eenhoorn',            'ultra_legendary', '🦄', '#2a0a3a'),
    print('regenboog_sch','Regenboog',          'ultra_legendary', '🌈', '#101030'),
    // ── extra schoenen ──
    color('turkoois',   'Turkoois',             'common',    '#2ec4b6'),
    color('roze',       'Roze',                 'common',    '#ff6fb5'),
    color('navy',       'Marineblauw',          'common',    '#1b2a52'),
    color('lime',       'Limegroen',            'rare',      '#9ccc3c'),
    color('magentakl',  'Magenta',              'epic',      '#d6336c'),
    color('goud_sch',   'Goud',                 'legendary', '#d4af37'),
    pat  ('strepen_rood','Rood gestreept',      'common',    'stripes', '#e63946', '#7a1f2b'),
    pat  ('stippen_w_sch','Witte stippen',      'common',    'dots',    '#222222', '#ffffff'),
    pat  ('verloop_oceaan_sch','Oceaanverloop', 'rare',      'gradient','#2ec4b6', '#1d6fa4'),
    pat  ('camo_blauw_sch','Blauwe camo',       'rare',      'camo',    '#1d6fa4', '#0c2a40'),
    pat  ('ruit_groen_sch','Groen ruitje',      'epic',      'checker', '#2d9e4f', '#0c2a16'),
    print('voetbal_sch','Voetbal',              'rare',      '⚽',      '#0d8a3e'),
    print('hart_sch',   'Hartjes',              'rare',      '❤️',      '#3a0010'),
    print('vos_sch',    'Vosjes',               'epic',      '🦊',      '#3a1a00'),
    print('draak_sch',  'Draken',               'legendary', '🐲',      '#06250f'),
    // ── extra schoenen (batch 2) ──
    color('hemelsblauw','Hemelsblauw',          'common',    '#56ccf2'),
    color('olijf_sch',  'Olijfgroen',           'common',    '#7a7a2a'),
    color('perzik_sch', 'Perzik',               'rare',      '#ffb997'),
    color('jade_sch',   'Jade',                 'rare',      '#00a86b'),
    color('amber_sch',  'Amber',                'epic',      '#ffbf00'),
    color('saffier_sch','Saffierblauw',         'legendary', '#0f52ba'),
    pat  ('strepen_zg', 'Zwart-geel gestreept', 'common',    'stripes', '#222222', '#f4c430'),
    pat  ('stippen_paars','Paarse stippen',     'common',    'dots',    '#f0f0f0', '#7b2d8b'),
    pat  ('verloop_ijs','IJsverloop',           'rare',      'gradient','#56ccf2', '#00d4d4'),
    pat  ('camo_zwart', 'Zwarte camo',          'rare',      'camo',    '#374151', '#111111'),
    pat  ('ruit_roodw', 'Rood ruitje',          'epic',      'checker', '#e63946', '#f0f0f0'),
    pat  ('regenboog_pat_sch','Regenboogprint', 'ultra_legendary', 'rainbow', '#e63946', '#7b2d8b'),
    print('dolfijn_sch','Dolfijnen',            'rare',      '🐬',     '#06283a'),
    print('schildpad_sch','Schildpadden',       'rare',      '🐢',     '#0a2a10'),
    print('donut_sch',  'Donuts',               'rare',      '🍩',     '#3a1a00'),
    print('watermeloen_sch','Watermeloen',      'rare',      '🍉',     '#0a2a10'),
    print('auto_sch',   'Autootjes',            'epic',      '🚗',     '#1a1a2a'),
    print('ster_glow_sch','Sterren',            'epic',      '🌟',     '#1a2a55'),
    print('bloem_sch',  'Bloemen',              'epic',      '🌸',     '#2a0a1a'),
    print('ufo_sch',    'Invaders',             'legendary', '👾',     '#10102a'),
  ],
  // Hoofd = pet (één GLB-model, normaal/achterstevoren te dragen) getint naar
  // de gekozen kleur. Alleen kleur-items: het 3D-model wordt gekleurd, net als
  // de shirt-kleuren het lichaam tinten.
  hoofd: [
    ...BASE(),
    color('turkoois',   'Turkoois',             'common',    '#2ec4b6'),
    color('roze',       'Roze',                 'common',    '#ff6fb5'),
    color('lime',       'Limegroen',            'rare',      '#9ccc3c'),
    color('navy',       'Marineblauw',          'rare',      '#1b2a52'),
    color('magentakl',  'Magenta',              'epic',      '#d6336c'),
    color('zilver',     'Zilver',               'epic',      '#c4cdd6'),
    color('goud_h',     'Goud',                 'legendary', '#d4af37'),
    // Ultra legendary: pet met een eigen UV-design (petny.png op het pet-model).
    // badge 'NY' wordt in het swatch-rondje getoond i.p.v. de zware UV-afbeelding.
    { ...texmodel('petny', 'Toffe Pet', '/Pet/petnormaal.glb', '/Pet/petny.png', '/Pet/petny.png'), badge: 'NY' },
    { ...texmodel('petgiraffe', 'Giraffe Pet', '/Pet/petnormaal.glb', '/Pet/petgiraffe.png', '/Pet/petgiraffe.png'), badge: '🦒' },
  ],
}

export function getCatalog(type) { return CATALOG[type] || CATALOG.shirt }
export function findItem(type, key) { return getCatalog(type).find(i => i.key === key) || null }

// Every item key per clothing type — used by the "joop" unlock-all code.
export function allUnlockedMap() {
  const out = {}
  Object.keys(CATALOG).forEach(type => { out[type] = CATALOG[type].map(i => i.key) })
  return out
}

// ── CSS swatch background (for shop/wardrobe UI previews) ─────────────
export function swatchStyle(item) {
  if (!item) return { background: '#333' }
  // Items with a text badge (e.g. petny → "NY") show the badge on a solid
  // gradient instead of a (heavy) preview image.
  if (item.badge) return { background: 'linear-gradient(135deg, #ffe08a, #d4af37)' }
  switch (item.kind) {
    case 'color':  return { background: item.hex }
    case 'model':
    case 'texmodel': return { backgroundImage: `url('${item.preview}')`, backgroundSize: 'cover', backgroundColor: '#fff' }
    case 'print':  return { background: item.bg }
    case 'pattern': return { background: cssPattern(item) }
    default:       return { background: '#333' }
  }
}
export function swatchEmoji(item) { return item && item.kind === 'print' ? item.emoji : null }
export function swatchBadge(item) { return item && item.badge ? item.badge : null }

// Lighten a #rrggbb colour by amount (0..1)
function lighten(hex, amt) {
  const h = hex.replace('#', '')
  const n = h.length === 3 ? h.split('').map(x => x + x).join('') : h
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16)
  const mix = (v) => Math.round(v + (255 - v) * amt)
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`
}

function cssPattern({ pattern, c1, c2 }) {
  switch (pattern) {
    case 'stripes':  return `repeating-linear-gradient(45deg, ${c1} 0 6px, ${c2} 6px 12px)`
    case 'dots':     return `radial-gradient(${c2} 22%, transparent 24%) 0 0 / 9px 9px, ${c1}`
    case 'checker':  return `conic-gradient(${c1} 90deg, ${c2} 90deg 180deg, ${c1} 180deg 270deg, ${c2} 270deg) 0 0 / 10px 10px`
    case 'gradient': return `linear-gradient(135deg, ${c1}, ${c2})`
    case 'camo':     return `radial-gradient(circle at 25% 30%, ${c2} 0 20%, transparent 21%), radial-gradient(circle at 70% 60%, ${c2} 0 18%, transparent 19%), ${c1}`
    case 'rainbow':  return 'linear-gradient(135deg,#e63946,#f77f00,#f4c430,#2d9e4f,#1d6fa4,#7b2d8b)'
    default:         return c1 || '#333'
  }
}

// ── Emoji → Twemoji image (works identically on every device incl. iOS) ──
export function emojiCode(e) {
  const cps = [...e].map(c => c.codePointAt(0))
  const out = cps.filter(cp => cp !== 0xFE0F || cps.includes(0x20E3))
  return out.map(c => c.toString(16)).join('-')
}
export function emojiUrl(e) { return `/twemoji/${emojiCode(e)}.png` }

// Tile an emoji across the canvas. Prefer the Twemoji image (img) — the system
// emoji font isn't reliably drawn to a WebGL texture on iOS/iPad. Falls back to
// fillText only if the image failed to load.
function tileEmoji(ctx, S, cols, item, img) {
  const cw = S / cols, ch = cw
  const rows = Math.ceil(S / ch) + 1
  if (img && img.width) {
    const sz = cw * 0.8
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) ? cw / 2 : 0
      for (let c = -1; c <= cols; c++) {
        ctx.drawImage(img, c * cw + cw / 2 + off - sz / 2, r * ch + ch / 2 - sz / 2, sz, sz)
      }
    }
  } else {
    ctx.font = `${Math.floor(cw * 0.7)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const e = item.emoji || '⭐'
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) ? cw / 2 : 0
      for (let c = -1; c <= cols; c++) ctx.fillText(e, c * cw + cw / 2 + off, r * ch + ch / 2)
    }
  }
}

// ── Shirt print baked onto the Ajax/PSV shirt UV layout ──────────────
// The donor shirt mesh has a real UV: front-chest ≈ (0.342, 0.526),
// back ≈ (0.668, 0.731). We fill the shirt colour and stamp the emoji on
// the front (big) and back (smaller). Texture is used with invertY=false,
// so canvas (u*S, v*S) maps straight to the UV.
export function buildShirtPrintTexture(item, emojiImg = null) {
  // Patterns (dots/checker/stripes/…) are not emoji — draw the real pattern,
  // otherwise tileEmoji falls back to ⭐ and every pattern shirt shows stars.
  if (item.kind === 'pattern') return buildTextureCanvas(item, emojiImg)

  const S = 1024
  const cv = document.createElement('canvas')
  cv.width = S; cv.height = S
  const ctx = cv.getContext('2d')

  const bg = item.kind === 'print' ? item.bg : (item.c1 || '#333')
  const g = ctx.createLinearGradient(0, 0, 0, S)
  g.addColorStop(0, lighten(bg, 0.12))
  g.addColorStop(1, bg)
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S)

  tileEmoji(ctx, S, 9, item, emojiImg)   // all-over small emoji print
  return cv
}

// ── Procedural texture canvas (for the 3D meshes) ────────────────────
export function buildTextureCanvas(item, emojiImg = null) {
  const S = 1024
  const cv = document.createElement('canvas')
  cv.width = S; cv.height = S
  const ctx = cv.getContext('2d')

  if (item.kind === 'print') {
    // Soft vertical gradient background so the print has depth (not flat)
    const g = ctx.createLinearGradient(0, 0, 0, S)
    g.addColorStop(0, lighten(item.bg, 0.14))
    g.addColorStop(1, item.bg)
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S)
    tileEmoji(ctx, S, 6, item, emojiImg)
    return cv
  }

  // patterns
  const { pattern, c1, c2 } = item
  ctx.fillStyle = c1; ctx.fillRect(0, 0, S, S)
  if (pattern === 'stripes') {
    ctx.strokeStyle = c2; ctx.lineWidth = S / 14
    for (let i = -S; i < S * 2; i += S / 7) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + S, S); ctx.stroke()
    }
  } else if (pattern === 'dots') {
    ctx.fillStyle = c2
    const step = S / 8
    for (let y = step / 2; y < S; y += step) for (let x = step / 2; x < S; x += step) {
      ctx.beginPath(); ctx.arc(x, y, step * 0.22, 0, Math.PI * 2); ctx.fill()
    }
  } else if (pattern === 'checker') {
    ctx.fillStyle = c2
    const n = 8, cell = S / n
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if ((r + c) % 2) ctx.fillRect(c * cell, r * cell, cell, cell)
    }
  } else if (pattern === 'gradient') {
    const g = ctx.createLinearGradient(0, 0, S, S)
    g.addColorStop(0, c1); g.addColorStop(1, c2)
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S)
  } else if (pattern === 'camo') {
    const cols = [c1, c2, '#6b7d3a', '#1f2a10']
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = cols[i % cols.length]
      ctx.beginPath()
      ctx.ellipse(Math.random() * S, Math.random() * S, 30 + Math.random() * 60, 25 + Math.random() * 50, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (pattern === 'rainbow') {
    const bands = ['#e63946', '#f77f00', '#f4c430', '#2d9e4f', '#1d6fa4', '#7b2d8b']
    const h = S / bands.length
    bands.forEach((b, i) => { ctx.fillStyle = b; ctx.fillRect(0, i * h, S, h + 1) })
  }
  return cv
}
