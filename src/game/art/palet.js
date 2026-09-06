// Paletten per wereld. Elk palet is een samenhangende set van 24-32 kleuren;
// de sleutels zijn de tekens die in de pixeldata-strings worden gebruikt, zodat
// dezelfde sprite met een ander palet meteen bij een andere wereld past.
//
// Naamgeving: h = highlight, m = midtone, s = shadow, o = outline. Een sprite
// die alleen die vier gebruikt kan dus in elke wereld gerecycled worden.

// Gedeeld UI-palet — staat los van de werelden zodat menu's overal hetzelfde
// aanvoelen, ook midden in een felrode vulkaanwereld.
export const UI = {
  inkt: '#0a0713',
  paneel: '#1b1430',
  paneelRand: '#3d2f66',
  paneelLicht: '#2a1f4a',
  tekst: '#f4f0ff',
  tekstZacht: '#a99cd0',
  accent: '#ffd23f',
  accentDonker: '#c09800',
  goed: '#06d6a0',
  fout: '#ff6b6b',
  ster: '#ffd23f',
  sterLeeg: '#3d2f66',
  hart: '#ff5c7a',
  hartLeeg: '#4a2740',
  munt: '#ffd23f',
  muntRand: '#c08c00',
  muntGeest: '#6b6480',
}

// Elke wereld: 4 achtergrondtinten (ver → dichtbij), 4 tinten voor de grond,
// 3 voor decoratie, plus een gloedkleur die additief geblend wordt.
const werelden = [
  {
    id: 'kristalwoud',
    lucht: ['#0b1f2e', '#12374a', '#1c5566', '#2a7d7a'],
    grond: { h: '#7df2b4', m: '#34bd81', s: '#1a8a5e', o: '#0a3d30' },
    rots: { h: '#4d7784', m: '#325a68', s: '#1e404c', o: '#0a1c24' },
    deco: ['#8ef2d0', '#42d6a8', '#1f8f78'],
    gloed: '#7bffd4',
    vloeistof: null,
    grade: 'rgba(40,180,160,0.06)',
  },
  {
    id: 'ijsmaan',
    lucht: ['#0a1330', '#152a55', '#26467f', '#4a6fb0'],
    grond: { h: '#e8f6ff', m: '#a9cdec', s: '#6b93c4', o: '#2b4a75' },
    rots: { h: '#4a5a86', m: '#334066', s: '#222c4a', o: '#111730' },
    deco: ['#ffffff', '#bfe6ff', '#7fb6e8'],
    gloed: '#9fd8ff',
    vloeistof: null,
    grade: 'rgba(90,150,255,0.07)',
  },
  {
    id: 'vulkaan',
    lucht: ['#1a0a0e', '#3a1210', '#65211a', '#9c3a1e'],
    grond: { h: '#6b4038', m: '#472720', s: '#2c1613', o: '#140809' },
    rots: { h: '#3a2a2e', m: '#26191d', s: '#170e11', o: '#0a0507' },
    deco: ['#ff9b3d', '#e5561f', '#a32a10'],
    gloed: '#ff7a2a',
    vloeistof: { h: '#ffd76b', m: '#ff8c1a', s: '#d43c08' },
    grade: 'rgba(255,110,40,0.08)',
  },
  {
    id: 'station',
    lucht: ['#07090f', '#0e131f', '#161d2e', '#232c42'],
    grond: { h: '#7d8798', m: '#525c6e', s: '#333b4a', o: '#161b26' },
    rots: { h: '#4a5262', m: '#333a47', s: '#20252f', o: '#0d1017' },
    deco: ['#3ef0ff', '#ff3ec8', '#ffe14d'],
    gloed: '#3ef0ff',
    vloeistof: null,
    grade: 'rgba(60,220,255,0.05)',
  },
  {
    id: 'nevel',
    lucht: ['#05030d', '#120a26', '#241146', '#3d1c66'],
    grond: { h: '#7a5cc4', m: '#4e3690', s: '#2f1f5e', o: '#150d2c' },
    rots: { h: '#3c2c62', m: '#281c45', s: '#170f2b', o: '#0a0616' },
    deco: ['#e0a8ff', '#a45cff', '#5f2bd6'],
    gloed: '#c78bff',
    vloeistof: null,
    grade: 'rgba(150,80,255,0.09)',
  },
]

export const PALETTEN = Object.fromEntries(werelden.map((w) => [w.id, w]))

export function paletVoorWereld(nummer) {
  return werelden[nummer - 1] ?? werelden[0]
}

// Mengt twee hexkleuren. Gebruikt bij het bakken van tilevarianten en bij het
// uitfaden van parallaxlagen — nooit in de update-loop.
export function meng(a, b, t) {
  const pa = hex(a)
  const pb = hex(b)
  return `#${kanaal(pa[0], pb[0], t)}${kanaal(pa[1], pb[1], t)}${kanaal(pa[2], pb[2], t)}`
}

function hex(c) {
  const n = parseInt(c.slice(1, 7), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function kanaal(a, b, t) {
  return Math.round(a + (b - a) * t)
    .toString(16)
    .padStart(2, '0')
}

// Donkerder/lichter maken zonder een tweede kleur te hoeven noemen.
export const donkerder = (c, t) => meng(c, '#000000', t)
export const lichter = (c, t) => meng(c, '#ffffff', t)
