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
  ],
}

export function getCatalog(type) { return CATALOG[type] || CATALOG.shirt }
export function findItem(type, key) { return getCatalog(type).find(i => i.key === key) || null }

// ── CSS swatch background (for shop/wardrobe UI previews) ─────────────
export function swatchStyle(item) {
  if (!item) return { background: '#333' }
  switch (item.kind) {
    case 'color':  return { background: item.hex }
    case 'model':  return { backgroundImage: `url('${item.preview}')`, backgroundSize: 'cover', backgroundColor: '#fff' }
    case 'print':  return { background: item.bg }
    case 'pattern': return { background: cssPattern(item) }
    default:       return { background: '#333' }
  }
}
export function swatchEmoji(item) { return item && item.kind === 'print' ? item.emoji : null }

function cssPattern({ pattern, c1, c2 }) {
  switch (pattern) {
    case 'stripes':  return `repeating-linear-gradient(45deg, ${c1} 0 6px, ${c2} 6px 12px)`
    case 'dots':     return `radial-gradient(${c2} 22%, transparent 24%) 0 0 / 9px 9px, ${c1}`
    case 'checker':  return `conic-gradient(${c1} 90deg, ${c2} 90deg 180deg, ${c1} 180deg 270deg, ${c2} 270deg) 0 0 / 10px 10px`
    case 'gradient': return `linear-gradient(135deg, ${c1}, ${c2})`
    case 'camo':     return `radial-gradient(circle at 25% 30%, ${c2} 0 20%, transparent 21%), radial-gradient(circle at 70% 60%, ${c2} 0 18%, transparent 19%), ${c1}`
    default:         return c1 || '#333'
  }
}

// ── Procedural texture canvas (for the 3D meshes) ────────────────────
export function buildTextureCanvas(item) {
  const S = 512
  const cv = document.createElement('canvas')
  cv.width = S; cv.height = S
  const ctx = cv.getContext('2d')

  if (item.kind === 'print') {
    ctx.fillStyle = item.bg; ctx.fillRect(0, 0, S, S)
    const n = 4, cell = S / n
    ctx.font = `${Math.floor(cell * 0.62)}px serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      ctx.save()
      const x = c * cell + cell / 2, y = r * cell + cell / 2
      ctx.translate(x, y); ctx.rotate((((r + c) % 2) ? 0.18 : -0.18))
      ctx.fillText(item.emoji, 0, 0)
      ctx.restore()
    }
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
