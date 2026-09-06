// Eigen bitmap-pixelfont, 5×7, in code getekend. Geen systeemfont in het spel.
// Elke glyph is 7 rijen van 5 tekens, gescheiden door '/'. De breedte wordt bij
// het bakken getrimd, zodat 'i' smaller is dan 'm' en de tekst niet uit elkaar
// valt.
import { nieuwCanvas } from '../core/atlas.js'

const G = {
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#',
  B: '####./#...#/#...#/####./#...#/#...#/####.',
  C: '.###./#...#/#..../#..../#..../#...#/.###.',
  D: '####./#...#/#...#/#...#/#...#/#...#/####.',
  E: '#####/#..../#..../####./#..../#..../#####',
  F: '#####/#..../#..../####./#..../#..../#....',
  G: '.###./#...#/#..../#.###/#...#/#...#/.###.',
  H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I: '#####/..#../..#../..#../..#../..#../#####',
  J: '..###/...#./...#./...#./...#./#..#./.##..',
  K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
  L: '#..../#..../#..../#..../#..../#..../#####',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
  N: '#...#/##..#/#.#.#/#.#.#/#..##/#...#/#...#',
  O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  P: '####./#...#/#...#/####./#..../#..../#....',
  Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
  R: '####./#...#/#...#/####./#.#../#..#./#...#',
  S: '.####/#..../#..../.###./....#/....#/####.',
  T: '#####/..#../..#../..#../..#../..#../..#..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',
  X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..',
  Z: '#####/....#/...#./..#../.#.../#..../#####',
  a: '...../...../.###./....#/.####/#...#/.####',
  b: '#..../#..../####./#...#/#...#/#...#/####.',
  c: '...../...../.###./#..../#..../#..../.###.',
  d: '....#/....#/.####/#...#/#...#/#...#/.####',
  e: '...../...../.###./#...#/#####/#..../.###.',
  f: '..##./.#.../####./.#.../.#.../.#.../.#...',
  g: '...../...../.###./#...#/.####/....#/.###.',
  h: '#..../#..../####./#...#/#...#/#...#/#...#',
  i: '..#../...../..#../..#../..#../..#../..#..',
  j: '...#./...../...#./...#./...#./#..#./.##..',
  k: '#..../#..#./#.#../##.../#.#../#..#./#...#',
  l: '.##../..#../..#../..#../..#../..#../.###.',
  m: '...../...../##.#./#.#.#/#.#.#/#.#.#/#.#.#',
  n: '...../...../####./#...#/#...#/#...#/#...#',
  o: '...../...../.###./#...#/#...#/#...#/.###.',
  p: '...../...../####./#...#/####./#..../#....',
  q: '...../...../.####/#...#/.####/....#/....#',
  r: '...../...../#.##./##..#/#..../#..../#....',
  s: '...../...../.####/#..../.###./....#/####.',
  t: '.#.../.#.../####./.#.../.#.../.#..#/..##.',
  u: '...../...../#...#/#...#/#...#/#...#/.####',
  v: '...../...../#...#/#...#/#...#/.#.#./..#..',
  w: '...../...../#.#.#/#.#.#/#.#.#/#.#.#/.#.#.',
  x: '...../...../#...#/.#.#./..#../.#.#./#...#',
  y: '...../...../#...#/#...#/.####/....#/.###.',
  z: '...../...../#####/...#./..#../.#.../#####',
  0: '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
  1: '..#../.##../..#../..#../..#../..#../.###.',
  2: '.###./#...#/....#/...#./..#../.#.../#####',
  3: '####./....#/....#/.###./....#/....#/####.',
  4: '...#./..##./.#.#./#..#./#####/...#./...#.',
  5: '#####/#..../####./....#/....#/#...#/.###.',
  6: '.###./#..../####./#...#/#...#/#...#/.###.',
  7: '#####/....#/...#./..#../.#.../.#.../.#...',
  8: '.###./#...#/.###./#...#/#...#/#...#/.###.',
  9: '.###./#...#/#...#/.####/....#/....#/.###.',
  ' ': '...../...../...../...../...../...../.....',
  '.': '...../...../...../...../...../...../..#..',
  ',': '...../...../...../...../...../..#../.#...',
  ':': '...../...../..#../...../..#../...../.....',
  ';': '...../...../..#../...../..#../..#../.#...',
  '!': '..#../..#../..#../..#../..#../...../..#..',
  '?': '.###./#...#/....#/...#./..#../...../..#..',
  "'": '..#../..#../...../...../...../...../.....',
  '"': '.#.#./.#.#./...../...../...../...../.....',
  '-': '...../...../...../.###./...../...../.....',
  // Gedachtestreepje: breder dan het koppelteken, zodat "Wereld 1 — Kristalwoud"
  // niet als een afbreekstreepje leest.
  '—': '...../...../...../#####/...../...../.....',
  '–': '...../...../...../.####/...../...../.....',
  '_': '...../...../...../...../...../...../#####',
  '+': '...../..#../..#../#####/..#../..#../.....',
  '=': '...../...../#####/...../#####/...../.....',
  '/': '....#/...#./...#./..#../.#.../.#.../#....',
  '(': '...#./..#../.#.../.#.../.#.../..#../...#.',
  ')': '.#.../..#../...#./...#./...#./..#../.#...',
  '%': '#...#/#..#./...#./..#../.#.../.#..#/#...#',
  '*': '...../.#.#./..#../#####/..#../.#.#./.....',
  '<': '...#./..#../.#.../#..../.#.../..#../...#.',
  '>': '.#.../..#../...#./....#/...#./..#../.#...',
  é: '...#./..#../.###./#...#/#####/#..../.###.',
  ë: '.#.#./...../.###./#...#/#####/#..../.###.',
  ï: '.#.#./...../.##../..#../..#../..#../.###.',
  ö: '.#.#./...../.###./#...#/#...#/#...#/.###.',
  ü: '.#.#./...../#...#/#...#/#...#/#...#/.####',
  á: '...#./..#../.###./....#/.####/#...#/.####',
  è: '.#.../..#../.###./#...#/#####/#..../.###.',
  // Pijlen voor de bedieningshints in de menu's.
  '↑': '..#../.###./#.#.#/..#../..#../..#../..#..',
  '↓': '..#../..#../..#../..#../#.#.#/.###./..#..',
  '←': '...../..#../.#.../#####/.#.../..#../.....',
  '→': '...../..#../...#./#####/...#./..#../.....',
  '✓': '...../....#/...#./#..#./.##../...../.....',
  // Vaste tekens die als één glyph makkelijker zijn dan als sprite in de tekst.
  '★': '..#../..#../#####/.###./..#../.#.#./#...#',
  '♥': '.#.#./#####/#####/#####/.###./..#../.....',
  '●': '...../.###./#####/#####/#####/.###./.....',
}

const HOOGTE = 7
const SPATIE_BREEDTE = 3
const LETTER_SPATIE = 1

let blad = null // { canvas, posities: { teken: {x, w} }, breedte }
const getint = new Map() // kleur -> canvas

function bak() {
  if (blad) return blad
  const tekens = Object.keys(G)
  const getrimd = {}
  let totaal = 0

  for (const t of tekens) {
    const rijen = G[t].split('/')
    let min = 5
    let max = -1
    for (const r of rijen) {
      for (let x = 0; x < 5; x++) {
        if (r[x] === '#') {
          if (x < min) min = x
          if (x > max) max = x
        }
      }
    }
    // Een lege glyph (spatie) heeft geen inkt; die krijgt een vaste breedte.
    const breedte = max < min ? SPATIE_BREEDTE : max - min + 1
    getrimd[t] = { rijen, min: max < min ? 0 : min, w: breedte, x: totaal }
    totaal += breedte + LETTER_SPATIE
  }

  const { canvas, ctx } = nieuwCanvas(totaal, HOOGTE)
  ctx.fillStyle = '#ffffff'
  for (const t of tekens) {
    const g = getrimd[t]
    for (let y = 0; y < HOOGTE; y++) {
      const rij = g.rijen[y]
      for (let x = 0; x < g.w; x++) {
        if (rij[x + g.min] === '#') ctx.fillRect(g.x + x, y, 1, 1)
      }
    }
  }

  blad = { canvas, glyphs: getrimd }
  return blad
}

// Getinte kopie van het hele blad. Eén canvas per kleur, gecached — zo hoeft de
// renderloop nooit per letter een compositing-operatie te doen.
function tint(kleur) {
  let c = getint.get(kleur)
  if (c) return c
  const b = bak()
  const { canvas, ctx } = nieuwCanvas(b.canvas.width, b.canvas.height)
  ctx.drawImage(b.canvas, 0, 0)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = kleur
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  getint.set(kleur, canvas)
  c = canvas
  return c
}

export function tekstBreedte(tekst, schaal = 1) {
  const b = bak()
  let w = 0
  for (const teken of tekst) {
    const g = b.glyphs[teken] ?? b.glyphs['?']
    w += (g.w + LETTER_SPATIE) * schaal
  }
  return Math.max(0, w - LETTER_SPATIE * schaal)
}

export const tekstHoogte = (schaal = 1) => HOOGTE * schaal

// x/y is linksboven. Geeft de eindbreedte terug zodat aanroepers kunnen
// doorschrijven zonder opnieuw te meten.
export function tekst(ctx, tekst_, x, y, kleur = '#ffffff', schaal = 1) {
  const b = bak()
  const bron = tint(kleur)
  let cx = Math.round(x)
  const cy = Math.round(y)
  for (const teken of tekst_) {
    const g = b.glyphs[teken] ?? b.glyphs['?']
    if (g.w > 0 && teken !== ' ') {
      ctx.drawImage(bron, g.x, 0, g.w, HOOGTE, cx, cy, g.w * schaal, HOOGTE * schaal)
    }
    cx += (g.w + LETTER_SPATIE) * schaal
  }
  return cx - x - LETTER_SPATIE * schaal
}

export function tekstMidden(ctx, tekst_, midX, y, kleur, schaal = 1) {
  return tekst(ctx, tekst_, Math.round(midX - tekstBreedte(tekst_, schaal) / 2), y, kleur, schaal)
}

export function tekstRechts(ctx, tekst_, rechtsX, y, kleur, schaal = 1) {
  return tekst(ctx, tekst_, Math.round(rechtsX - tekstBreedte(tekst_, schaal)), y, kleur, schaal)
}

// Tekst met een 1px schaduw eronder: leest op elke achtergrond, ook boven lava.
export function tekstSchaduw(ctx, tekst_, x, y, kleur, schaal = 1, schaduw = '#0a0713') {
  tekst(ctx, tekst_, x + schaal, y + schaal, schaduw, schaal)
  return tekst(ctx, tekst_, x, y, kleur, schaal)
}

export function tekstMiddenSchaduw(ctx, tekst_, midX, y, kleur, schaal = 1, schaduw = '#0a0713') {
  const x = Math.round(midX - tekstBreedte(tekst_, schaal) / 2)
  return tekstSchaduw(ctx, tekst_, x, y, kleur, schaal, schaduw)
}

// Breekt op spaties binnen maxBreedte. Alleen gebruikt in menu's en hintbordjes.
export function breek(tekst_, maxBreedte, schaal = 1) {
  const woorden = tekst_.split(' ')
  const regels = []
  let huidig = ''
  for (const w of woorden) {
    const poging = huidig ? `${huidig} ${w}` : w
    if (tekstBreedte(poging, schaal) > maxBreedte && huidig) {
      regels.push(huidig)
      huidig = w
    } else {
      huidig = poging
    }
  }
  if (huidig) regels.push(huidig)
  return regels
}
