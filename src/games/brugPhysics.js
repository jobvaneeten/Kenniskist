// ═══════════════════════════════════════════════════════════════════════════
//  BRUG BOUWEN — levels + physics (los van React/canvas, zodat elk level
//  headless getest kan worden: node tools/brugTest.js)
//
//  Physics: XPBD (Macklin, "Small Steps"): elke frame SUB kleine substappen,
//  per balk een afstands-constraint met materiaal-compliance. De Lagrange-
//  multiplier geeft de échte balkkracht (trek + / druk −) ⇒ een balk breekt
//  zodra die kracht boven zijn sterkte komt. Balken hebben gewicht (dichtheid
//  × lengte, verdeeld over de twee knopen), touw kan alleen trekken.
// ═══════════════════════════════════════════════════════════════════════════

export const VW = 1280, VH = 720
export const SNAP = 20
export const STEP_MS = 1000 / 60          // vaste tijdstap: 60 physics-frames per seconde
const KILL_Y = 1200                       // onderkant van de terreinblokken

// ── materialen ──────────────────────────────────────────────────────────────
// cost = prijs per balk · maxLen = langste balk · density = gewicht per 100px
// strength = max kracht (trek én druk) · strain = rek bij die kracht (stijfheid)
// drive = de auto rijdt erop (alleen weg) · rope = alleen trekken (touw)
export const MAT = {
  weg:    { desc: 'auto rijdt erop', name: 'Weg',    icon: '🛣️', cost: 10, maxLen: 150, drive: true,  rope: false, w: 15, col: '#3c4250', col2: '#262b36', edge: '#15181f', density: 1.0,  strength: 7,  strain: 0.008 },
  hout:   { desc: 'goedkope steun', name: 'Hout',   icon: '🪵', cost: 6,  maxLen: 160, drive: false, rope: false, w: 12, col: '#c79a52', col2: '#8a6a30', edge: '#6b4f22', density: 0.6,  strength: 10, strain: 0.006 },
  metaal: { desc: 'extra sterk', name: 'Metaal', icon: '🔩', cost: 16, maxLen: 185, drive: false, rope: false, w: 11, col: '#9fb0cc', col2: '#5d6c84', edge: '#3c4860', density: 1.1,  strength: 26, strain: 0.004 },
  touw:   { desc: 'alleen trekken', name: 'Touw',   icon: '🪢', cost: 4,  maxLen: 300, drive: false, rope: true,  w: 5,  col: '#dcc48e', col2: '#a98a54', edge: '#7c5a30', density: 0.15, strength: 14, strain: 0.012 },
}

// ── physics-constanten (eenheden: px en frames van 1/60 s) ──
const GRAV = 0.34
const SUB = 16              // substappen per frame
const DAMP_NODE = 0.98      // snelheidsbehoud brugknopen per frame (dempt trillen)
const DAMP_CAR = 0.995      // auto: weinig luchtweerstand ⇒ kan van een schans vliegen
const NODE_R = 5            // botsradius knoop met terrein
const GRAV_RAMP = 66        // frames om de zwaartekracht op te voeren (zichtbaar inzakken)
export const DRIVE_AT = 90  // frames voordat de auto gaat rijden
const MAXV = 4.3            // kruissnelheid auto (px/frame)
const STUCK = 160           // frames zonder vooruitgang ⇒ vast
const TIMEOUT = 3000

// ── level-fabriek ────────────────────────────────────────────────────────────
// platforms: [{x0,x1,y}] vaste grond met ankers aan de randen
// hills: extra grondblokken zonder ankers · floats: ankers in de lucht (ballonnen)
// prebuilt: al aangelegde, vaste stukken weg (onbreekbaar, gratis)
function L(cfg) {
  const W = cfg.worldW || VW, H = cfg.worldH || VH
  const terrain = [], anchors = []
  const push = (x, y) => { if (!anchors.some(a => Math.abs(a.x - x) < 8 && Math.abs(a.y - y) < 8)) anchors.push({ x, y }) }
  const n = cfg.platforms.length
  cfg.platforms.forEach((p, i) => {
    terrain.push({ x: p.x0, y: p.y, w: p.x1 - p.x0, h: KILL_Y + 80 - p.y })
    if (i > 0) push(p.x0, p.y)
    if (i < n - 1) push(p.x1, p.y)
  })
  ;(cfg.hills || []).forEach(p => terrain.push({ x: p.x0, y: p.y, w: p.x1 - p.x0, h: KILL_Y + 80 - p.y }))
  ;(cfg.floats || []).forEach(f => push(f.x, f.y))
  const first = cfg.platforms[0], last = cfg.platforms[n - 1]
  return {
    kind: cfg.kind, o: cfg.o || {},
    title: cfg.title, budget: cfg.budget, mats: cfg.mats, heavy: !!cfg.heavy,
    worldW: W, worldH: H, waterY: H - 124,
    terrain, anchors, ramps: cfg.ramps || [],
    floatAnchors: cfg.floats || [],
    prebuilt: cfg.prebuilt || [],
    start: cfg.start || { x: first.x1 - 110, y: first.y },
    finishX: last.x0 + 26, finishY: last.y,
  }
}

// ── level-generatoren ──
// pil: kloof met n pijlers (≤150 diep) onder het dek — zet steunen op de pijlers.
function pil(title, budget, mats, o = {}) {
  const gap = o.gap ?? 280, piers = o.piers ?? 1, depth = Math.min(o.depth ?? 110, 150)
  const yL = o.yL ?? 440, yR = o.yR ?? 440, W = o.worldW ?? VW
  const cL = W / 2 - gap / 2, cR = W / 2 + gap / 2
  const platforms = [{ x0: -300, x1: cL, y: yL }]
  for (let i = 1; i <= piers; i++) {
    const f = i / (piers + 1), px = cL + gap * f
    platforms.push({ x0: px - 30, x1: px + 30, y: yL + (yR - yL) * f + depth })
  }
  platforms.push({ x0: cR, x1: W + 300, y: yR })
  return L({ kind: 'pil', o, title, budget, mats, platforms, heavy: o.heavy, worldW: W, worldH: o.worldH })
}
// opn: open kloof zonder steun ⇒ bouw zelf een vakwerk (driehoeken).
function opn(title, budget, mats, o = {}) {
  const gap = o.gap ?? 280, yL = o.yL ?? 440, yR = o.yR ?? 440, W = o.worldW ?? VW
  return L({ kind: 'opn', o, title, budget, mats, heavy: o.heavy, worldW: W, worldH: o.worldH,
    platforms: [{ x0: -300, x1: W / 2 - gap / 2, y: yL }, { x0: W / 2 + gap / 2, x1: W + 300, y: yR }] })
}
// jmp: aanloop + schans aan de rand, kloof, lager landingsplatform. De sprong
// alleen haalt het niet: bouw een landingsbrug die de klap opvangt.
function jmp(title, budget, mats, o = {}) {
  const gap = o.gap ?? 300, drop = o.drop ?? 78, rise = o.rise ?? 60, run = o.run ?? 120
  const yL = o.yL ?? 405, W = o.worldW ?? VW
  const lx = W / 2 - gap / 2, rx = W / 2 + gap / 2
  return L({ kind: 'jmp', o, title, budget, mats, heavy: o.heavy, worldW: W, worldH: o.worldH,
    platforms: [{ x0: -300, x1: lx, y: yL }, { x0: rx, x1: W + 300, y: yL + drop }],
    ramps: [{ x0: lx - run, y0: yL, x1: lx, y1: yL - rise }],
    start: { x: lx - run - 210, y: yL } })
}
// mjmp: twee schansen achter elkaar met een tussenplatform.
function mjmp(title, budget, mats, o = {}) {
  const g1 = o.gap1 ?? 300, g2 = o.gap2 ?? 300, d1 = o.drop1 ?? 70, d2 = o.drop2 ?? 70
  const midW = o.midW ?? 260, rise = o.rise ?? 60, run = o.run ?? 110, yL = o.yL ?? 395, W = o.worldW ?? VW
  const lx = W / 2 - (g1 + midW + g2) / 2, m0 = lx + g1, m1 = m0 + midW, rx = m1 + g2
  const ymid = yL + d1
  return L({ kind: 'mjmp', o, title, budget, mats, heavy: o.heavy, worldW: W, worldH: o.worldH,
    platforms: [{ x0: -300, x1: lx, y: yL }, { x0: m0, x1: m1, y: ymid }, { x0: rx, x1: W + 300, y: ymid + d2 }],
    ramps: [{ x0: lx - run, y0: yL, x1: lx, y1: yL - rise }, { x0: m1 - run, y0: ymid, x1: m1, y1: ymid - rise }],
    start: { x: lx - run - 210, y: yL } })
}
// stairs: trapsgewijze platforms (omhoog of omlaag) met een gat ertussen.
function stairs(title, budget, mats, o = {}) {
  const n = o.n ?? 4, gapW = o.gapW ?? 150, step = o.step ?? 60, yTop = o.yTop ?? 380
  const W = o.worldW ?? VW, midW = o.midW ?? 130, up = o.up
  const inner = (n - 1) * gapW + (n - 2) * midW, startX = W / 2 - inner / 2
  const platforms = []
  let x = -300
  for (let i = 0; i < n; i++) {
    const y = yTop + (up ? (n - 1 - i) : i) * step
    const w = i === 0 ? startX + 300 : i === n - 1 ? W + 300 - x : midW
    platforms.push({ x0: x, x1: x + w, y })
    x += w + gapW
  }
  return L({ kind: 'stairs', o, title, budget, mats, platforms, heavy: o.heavy, worldW: W, worldH: o.worldH })
}
// susp: open kloof met ballon-ankers hoog in de lucht ⇒ hang het dek met touw op.
function susp(title, budget, mats, o = {}) {
  const gap = o.gap ?? 380, yL = o.yL ?? 430, yR = o.yR ?? 430, W = o.worldW ?? 1450
  const cL = W / 2 - gap / 2, cR = W / 2 + gap / 2, ah = o.anchorH ?? 210
  const floats = (o.anchors ?? [0.34, 0.66]).map(f => ({ x: Math.round(cL + gap * f), y: Math.min(yL, yR) - ah }))
  return L({ kind: 'susp', o, title, budget, mats, heavy: o.heavy, worldW: W, worldH: o.worldH, floats,
    platforms: [{ x0: -300, x1: cL, y: yL }, { x0: cR, x1: W + 300, y: yR }] })
}
// pre: een stuk weg steekt al vast het ravijn in ⇒ maak het af naar de overkant.
function pre(title, budget, mats, o = {}) {
  const gap = o.gap ?? 340, yL = o.yL ?? 430, yR = o.yR ?? 430, W = o.worldW ?? 1400
  const cL = W / 2 - gap / 2, cR = W / 2 + gap / 2
  const segs = Math.ceil(o.preLen / 120), pts = []
  for (let i = 0; i <= segs; i++) pts.push([cL + o.preLen * i / segs, yL])
  return L({ kind: 'pre', o, title, budget, mats, heavy: o.heavy, worldW: W, worldH: o.worldH, prebuilt: [{ pts, mat: 'weg' }],
    platforms: [{ x0: -300, x1: cL, y: yL }, { x0: cR, x1: W + 300, y: yR }] })
}
// slope: de auto start op een heuvel, rolt de helling af (vaart!) en rijdt dan
// over jouw brug naar een lager platform (open of met pijlers).
function slope(title, budget, mats, o = {}) {
  const gap = o.gap ?? 300, piers = o.piers ?? 0, depth = Math.min(o.depth ?? 120, 150)
  const yL = o.yL ?? 360, yR = o.yR ?? 460, W = o.worldW ?? 1400
  const run = o.run ?? 270, rise = o.rise ?? 150
  const cL = W / 2 - gap / 2, cR = W / 2 + gap / 2
  const platforms = [{ x0: -300, x1: cL, y: yL }]
  for (let i = 1; i <= piers; i++) { const f = i / (piers + 1), px = cL + gap * f; platforms.push({ x0: px - 30, x1: px + 30, y: yL + (yR - yL) * f + depth }) }
  platforms.push({ x0: cR, x1: W + 300, y: yR })
  const rx = cL - 150, lx = rx - run
  return L({ kind: 'slope', o, title, budget, mats, heavy: o.heavy, worldW: W, worldH: o.worldH,
    platforms, hills: [{ x0: -300, x1: lx, y: yL - rise }],
    ramps: [{ x0: lx, y0: yL - rise, x1: rx, y1: yL }], start: { x: lx - 70, y: yL - rise } })
}
// pylons: pilaren van wisselende hoogte. Lage = steunpunt onder het dek, hoge
// steken erboven uit ⇒ je weg moet eroverheen.
function pylons(title, budget, mats, o = {}) {
  const gap = o.gap ?? 560, yL = o.yL ?? 430, yR = o.yR ?? 430, W = o.worldW ?? 1500
  const cL = W / 2 - gap / 2, cR = W / 2 + gap / 2
  const platforms = [{ x0: -300, x1: cL, y: yL }]
  o.pillars.forEach(p => {
    const px = Math.round(cL + gap * p.f), w = p.w ?? 40
    platforms.push({ x0: px - w / 2, x1: px + w / 2, y: p.top })
  })
  platforms.push({ x0: cR, x1: W + 300, y: yR })
  return L({ kind: 'pylons', o, title, budget, mats, heavy: o.heavy, worldW: W, worldH: o.worldH, platforms })
}

const WH = ['weg', 'hout'], WHM = ['weg', 'hout', 'metaal'], WHT = ['weg', 'hout', 'touw'], ALL = ['weg', 'hout', 'metaal', 'touw']

// Budgetten zijn afgestemd op een geteste referentie-oplossing (tools/brugTest.js):
// die kost ±70% van het budget ⇒ 3 sterren vraagt een iets slimmere brug.
export const LEVELS = [
  // ── Tier 1 (1-10): leer elke bouwsteen kennen ──
  pil('Eerste brug',       60, WH,  { gap: 240, depth: 80 }),
  opn('Zonder pijler',    100, WH,  { gap: 230 }),
  slope('Van de heuvel',  100, WH,  { gap: 220, yL: 340, yR: 430, rise: 130, run: 240 }),
  opn('Klein vakwerk',    100, WHM, { gap: 260 }),
  pylons('Twee pieren',   240, WHM, { gap: 420, pillars: [{ f: 0.34, top: 470, w: 42 }, { f: 0.66, top: 470, w: 42 }] }),
  susp('Eerste kabel',     70, WHT, { gap: 280, anchorH: 180, anchors: [0.5] }),
  jmp('De schans',        150, WH,  { gap: 300, drop: 80, rise: 60 }),
  pre('Maak het af',      100, WHM, { gap: 340, preLen: 150 }),
  pylons('Hoge piek',     200, WHM, { gap: 460, pillars: [{ f: 0.5, top: 370, w: 30 }] }),
  opn('Zware vracht',     150, WHM, { gap: 290, heavy: true }),

  // ── Tier 2 (11-20): groter, breder — combineer de bouwstenen ──
  slope('Afdaling',       210, WHM, { gap: 300, piers: 1, depth: 120, yL: 330, yR: 470, rise: 150 }),
  susp('Hangbrug',        100, WHT, { gap: 360, anchors: [0.34, 0.66] }),
  pylons('Pieren-trap',   230, WHM, { gap: 560, pillars: [{ f: 0.25, top: 500, w: 40 }, { f: 0.5, top: 430, w: 32 }, { f: 0.75, top: 360, w: 26 }] }),
  mjmp('Dubbele schans',  580, WHM, { gap1: 300, gap2: 300, drop1: 70, drop2: 60 }),
  opn('Brede boog',       150, WHM, { gap: 320, worldW: 1400 }),
  pre('Halve weg',        100, WHM, { gap: 360, preLen: 170, worldW: 1400 }),
  susp('Twee ballonnen',  120, ALL, { gap: 420, anchors: [0.34, 0.66], worldW: 1500 }),
  stairs('Naar boven',    300, WHM, { n: 4, step: 60, gapW: 180, yTop: 340, up: true, worldW: 1350 }),
  jmp('Grote sprong',     150, WHM, { gap: 380, drop: 100, rise: 72, worldW: 1500 }),
  pylons('Pilaarwoud',    400, WHM, { gap: 660, pillars: [{ f: 0.2, top: 470, w: 36 }, { f: 0.45, top: 380, w: 26 }, { f: 0.7, top: 500, w: 40 }], worldW: 1650 }),

  // ── Tier 3 (21-30): wijde en diepe ravijnen ──
  susp('Kabelravijn',     150, ALL, { gap: 520, anchorH: 230, anchors: [0.25, 0.5, 0.75], worldW: 1700 }),
  slope('Steile inrit',   210, WHM, { gap: 360, piers: 1, depth: 140, yL: 320, yR: 500, rise: 170, worldW: 1500 }),
  pre('Halve brug',       150, WHT, { gap: 520, preLen: 200, worldW: 1500 }),
  opn('Het gat',          150, ALL, { gap: 340, heavy: true, worldW: 1500 }),
  pylons('Wisselhoogte',  480, ALL, { gap: 700, pillars: [{ f: 0.22, top: 520, w: 44 }, { f: 0.5, top: 360, w: 24 }, { f: 0.78, top: 470, w: 36 }], worldW: 1700 }),
  mjmp('Sprong-estafette', 580, WHM, { gap1: 340, gap2: 340, drop1: 80, drop2: 70, midW: 260, worldW: 1650 }),
  susp('Hoge hangbrug',   150, ALL, { gap: 520, anchorH: 250, anchors: [0.25, 0.5, 0.75], worldW: 1750 }),
  stairs('Grote trap',    440, WHM, { n: 5, step: 55, gapW: 185, yTop: 350, worldW: 1600 }),
  slope('Afdaling diep',  210, ALL, { gap: 420, piers: 1, depth: 150, yL: 330, yR: 540, rise: 160, worldW: 1650, worldH: 880 }),
  pil('Lange reis',       560, WHM, { gap: 900, piers: 5, depth: 140, worldW: 1950 }),

  // ── Tier 4 (31-40): lange overspanningen ──
  susp('Reuzenkabel',     150, ALL, { gap: 600, anchorH: 260, anchors: [0.2, 0.4, 0.6, 0.8], worldW: 1900 }),
  pylons('Canyonpieren',  640, ALL, { gap: 900, pillars: [{ f: 0.2, top: 520, w: 46 }, { f: 0.4, top: 400, w: 28 }, { f: 0.6, top: 520, w: 46 }, { f: 0.8, top: 400, w: 28 }], worldW: 2050 }),
  slope('Bergafrit',      200, ALL, { gap: 360, yL: 300, yR: 520, rise: 190, run: 320, worldW: 1700 }),
  pre('Halve overspanning', 150, WHM, { gap: 640, preLen: 230, heavy: true, worldW: 1700 }),
  mjmp('Sprong-marathon', 560, WHM, { gap1: 380, gap2: 380, drop1: 95, drop2: 90, midW: 250, worldW: 1850 }),
  opn('Wijde afgrond',    150, ALL, { gap: 350, heavy: true, worldW: 1650 }),
  stairs('Eindeloze trap', 460, WHM, { n: 6, step: 52, gapW: 185, yTop: 300, worldW: 1900 }),
  susp('Drie ballonnen',  150, ALL, { gap: 560, anchorH: 240, anchors: [0.25, 0.5, 0.75], worldW: 1950 }),
  pil('Diep ravijn',      600, WHM, { gap: 780, piers: 4, depth: 150, heavy: true, worldW: 1800, worldH: 900 }),
  pylons('Hangende stad', 540, ALL, { gap: 1000, pillars: [{ f: 0.18, top: 520, w: 44 }, { f: 0.38, top: 380, w: 26 }, { f: 0.6, top: 520, w: 44 }, { f: 0.82, top: 380, w: 26 }], worldW: 2050 }),

  // ── Tier 5 (41-50): meesterproef — groot en zwaar ──
  susp('Meesterkabel',    150, ALL, { heavy: true, gap: 600, anchorH: 270, anchors: [0.2, 0.4, 0.6, 0.8], worldW: 2050 }),
  slope('Bergpas-afrit',  320, ALL, { gap: 520, piers: 2, depth: 150, yL: 320, yR: 560, rise: 180, worldW: 2000, worldH: 880 }),
  jmp('Mega-sprong',      400, ALL, { gap: 480, drop: 140, rise: 88, worldW: 1700 }),
  pre('Voltooi de brug',  400, ALL, { gap: 760, preLen: 240, heavy: true, worldW: 1900 }),
  pylons('Reuzenpieren',  650, ALL, { gap: 1200, pillars: [{ f: 0.16, top: 520, w: 46 }, { f: 0.33, top: 400, w: 28 }, { f: 0.5, top: 520, w: 46 }, { f: 0.66, top: 400, w: 28 }, { f: 0.83, top: 520, w: 46 }], worldW: 2300 }),
  mjmp('Sprong-finale',   580, WHM, { gap1: 400, gap2: 400, drop1: 95, drop2: 90, midW: 250, worldW: 1900 }),
  susp('Hemelbrug',       180, ALL, { heavy: true, gap: 680, anchorH: 280, anchors: [0.2, 0.4, 0.6, 0.8], worldW: 2200 }),
  pil('Mega-transport',   670, ALL, { gap: 1200, piers: 7, depth: 150, heavy: true, worldW: 2300 }),
  slope('De grote afrit', 420, ALL, { gap: 800, piers: 2, depth: 150, yL: 320, yR: 560, rise: 190, heavy: true, worldW: 2300, worldH: 880 }),
  pylons('Meesterbouwer',  700, ALL, { gap: 1500, pillars: [{ f: 0.14, top: 540, w: 48 }, { f: 0.3, top: 400, w: 28 }, { f: 0.46, top: 540, w: 48 }, { f: 0.62, top: 380, w: 26 }, { f: 0.8, top: 520, w: 44 }], heavy: true, worldW: 2700 }),
]

// korte bouwtip per level-soort (in beeld tijdens het bouwen)
export const TIPS = {
  pil:    'Zet steunbalken van de pijler omhoog naar je weg — twee schuine balken vormen een driehoek.',
  opn:    'Geen steun in de kloof: bouw onder je weg een vakwerk van driehoeken.',
  slope:  'De auto komt met vaart naar beneden: maak je brug stevig.',
  pylons: 'Gebruik de pilaren als steunpunt. Steekt er een boven de weg uit? Leid je weg eroverheen.',
  susp:   'Hang je weg met touw aan de ballonnen. Touw kan alleen trekken, niet duwen.',
  jmp:    'De sprong haalt de overkant niet: bouw een stevige landingsbrug die de klap opvangt.',
  mjmp:   'Twee sprongen: bouw na elke schans een landingsbrug.',
  pre:    'Een stuk weg ligt er al (vast en onbreekbaar). Bouw vanaf het uiteinde door naar de overkant.',
  stairs: 'Overbrug elke trede. Langer dan één weg-balk? Steun het midden met een driehoek.',
}

// ── beginstand van een level: ankers + voorgebouwde stukken ──
export function initialBuild(lv) {
  const nodes = lv.anchors.map(a => ({ x: a.x, y: a.y, fixed: true }))
  const members = []
  const findOrAdd = (x, y) => {
    const i = nodes.findIndex(n => Math.abs(n.x - x) < 7 && Math.abs(n.y - y) < 7)
    if (i >= 0) return i
    nodes.push({ x, y, fixed: true, pre: true }); return nodes.length - 1
  }
  lv.prebuilt.forEach(pb => {
    const ids = pb.pts.map(([x, y]) => findOrAdd(x, y))
    for (let k = 0; k < ids.length - 1; k++) members.push({ a: ids[k], b: ids[k + 1], mat: pb.mat, pre: true })
  })
  return { nodes, members, base: nodes.length }   // base = aantal vaste (niet-wisbare) knopen
}

export function buildCost(members) { return members.reduce((s, m) => s + (m.pre ? 0 : MAT[m.mat].cost), 0) }

// zit een punt ín massief terrein? (daar mag je geen losse knoop zetten)
export function insideTerrain(lv, x, y) {
  return lv.terrain.some(t => x > t.x + 2 && x < t.x + t.w - 2 && y > t.y + 2 && y < t.y + t.h)
    || lv.ramps.some(r => x > r.x0 && x < r.x1 && y > r.y0 + (r.y1 - r.y0) * (x - r.x0) / (r.x1 - r.x0) + 2 && y < Math.max(r.y0, r.y1))
}

// ── simulatie ────────────────────────────────────────────────────────────────
export function createSim(lv, nodes, members) {
  const pts = nodes.map(n => ({ x: n.x, y: n.y, px: n.x, py: n.y, vx: 0, vy: 0, w: 0, r: NODE_R, fixed: n.fixed }))
  const mass = pts.map(() => 0)
  const beams = members.map(m => {
    const M = MAT[m.mat], a = pts[m.a], b = pts[m.b]
    const rest = Math.hypot(a.x - b.x, a.y - b.y), half = rest / 100 * M.density / 2
    mass[m.a] += half; mass[m.b] += half
    return { a: m.a, b: m.b, rest, mat: m.mat, rope: M.rope, pre: !!m.pre,
      alpha: rest * M.strain / M.strength, broken: false, force: 0, acc: 0 }
  })
  pts.forEach((p, i) => { p.w = p.fixed ? 0 : 1 / Math.max(0.3, mass[i]) })

  // voertuig: stijve doos van 4 punten (2 wielen onder, 2 hoeken boven)
  const s = lv.start, heavy = lv.heavy
  const wR = heavy ? 18 : 15, halfW = heavy ? 48 : 40, bodyH = heavy ? 36 : 30
  const wc = 4 / (heavy ? 16 : 10)                       // inverse massa per autopunt
  const by = s.y - wR - 1, ty = by - bodyH, base = pts.length
  const mk = (x, y, r) => { pts.push({ x, y, px: x, py: y, vx: 0, vy: 0, w: wc, r, car: true }); return pts.length - 1 }
  const wl = mk(s.x - halfW, by, wR), wr = mk(s.x + halfW, by, wR)
  const tl = mk(s.x - halfW, ty, 6), tr = mk(s.x + halfW, ty, 6)
  const carBeam = (i, j) => beams.push({ a: i, b: j, rest: Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y), alpha: 0, car: true, broken: false })
  carBeam(wl, wr); carBeam(tl, tr); carBeam(wl, tl); carBeam(wr, tr); carBeam(wl, tr); carBeam(wr, tl)

  return {
    lv, pts, beams, frame: 0, grounded: true, maxX: s.x, lastProg: 0, result: null, reason: null,
    car: { wl, wr, tl, tr, wR, heavy, base },
    deck: beams.filter(b => !b.car && MAT[b.mat].drive),
  }
}

// één physics-frame (1/60 s). Geeft 'win' | 'lose' | null.
export function stepSim(sim) {
  if (sim.result) return sim.result
  const { lv, pts, beams, car, deck } = sim
  const f = ++sim.frame
  const g = GRAV * Math.min(1, f / GRAV_RAMP)
  const h = 1 / SUB, h2 = h * h
  const driving = f > DRIVE_AT
  const CP = [car.wl, car.wr, car.tl, car.tr]
  const wl = pts[car.wl], wr = pts[car.wr]
  let hit = false
  for (const bm of beams) bm.acc = 0

  for (let s = 0; s < SUB; s++) {
    // aandrijving alleen met wielcontact; in de lucht vliegt de auto een boog
    if (driving && sim.grounded) {
      const vx = wl.vx, a = vx >= MAXV ? 0 : vx < 0.6 ? 0.95 : 0.6
      if (a) for (const i of CP) pts[i].vx += a * h
    }
    for (const p of pts) {
      if (p.w === 0) continue
      p.vy += g * h
      p.px = p.x; p.py = p.y
      p.x += p.vx * h; p.y += p.vy * h
    }
    // balken (XPBD): kracht = −λ/h² (trek +, druk −)
    for (const bm of beams) {
      if (bm.broken) continue
      const a = pts[bm.a], b = pts[bm.b]
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4
      const C = d - bm.rest
      if (bm.rope && C < 0) continue                 // slap touw
      const ws = a.w + b.w
      if (ws === 0) continue
      const lam = -C / (ws + bm.alpha / h2)
      const nx = dx / d * lam, ny = dy / d * lam
      a.x -= a.w * nx; a.y -= a.w * ny
      b.x += b.w * nx; b.y += b.w * ny
      bm.acc -= lam / h2
    }
    // botsingen: terrein + schans voor alles, wielen ook op het weg-dek
    for (const p of pts) if (p.w !== 0) { collideTerrain(p, lv.terrain); collideRamp(p, lv.ramps) }
    for (const w of [wl, wr]) {
      for (const bm of deck) if (!bm.broken) collideWheelBeam(w, pts[bm.a], pts[bm.b], MAT.weg.w / 2)
      if (w._hit) { hit = true; w._hit = false }
    }
    for (const p of pts) {
      if (p.w === 0) continue
      p.vx = (p.x - p.px) / h; p.vy = (p.y - p.py) / h
      p._hit = false
    }
  }
  sim.grounded = hit
  for (const p of pts) { if (p.w === 0) continue; const d = p.car ? DAMP_CAR : DAMP_NODE; p.vx *= d; p.vy *= d }

  // in de lucht: zachte zelf-stabilisatie ⇒ landt op z'n wielen na een sprong
  if (driving && !hit) {
    let cx = 0, cy = 0; for (const i of CP) { cx += pts[i].x; cy += pts[i].y }; cx /= 4; cy /= 4
    const ang = Math.atan2(wr.y - wl.y, wr.x - wl.x)
    const corr = -ang * 0.06, cs = Math.cos(corr), sn = Math.sin(corr)
    for (const i of CP) { const p = pts[i], dx = p.x - cx, dy = p.y - cy; p.x = cx + dx * cs - dy * sn; p.y = cy + dx * sn + dy * cs }
  }

  // balkkracht (gedempt over een paar frames) ⇒ breken boven de sterkte
  for (const bm of beams) {
    if (bm.car || bm.broken) continue
    bm.force = bm.force * 0.8 + (bm.acc / SUB) * 0.2
    if (!bm.pre && f > 20 && Math.abs(bm.force) > MAT[bm.mat].strength) { bm.broken = true; sim.anyBroken = true }
  }

  // win / verlies
  const cx = (wl.x + wr.x) / 2, cy = (wl.y + wr.y) / 2
  if (cx > sim.maxX + 2) { sim.maxX = cx; sim.lastProg = f }
  if (cx > lv.finishX && cy < lv.finishY) { sim.result = 'win' }
  else if (cy > lv.waterY) { sim.result = 'lose'; sim.reason = 'water' }
  else if (f > DRIVE_AT + 30 && f - Math.max(sim.lastProg, DRIVE_AT) > STUCK) { sim.result = 'lose'; sim.reason = 'vast' }
  else if (f > TIMEOUT) { sim.result = 'lose'; sim.reason = 'vast' }
  return sim.result
}

// ── botsingshelpers ──
// cirkel-vs-rechthoek (dichtstbijzijnde punt): een wiel dat over een rand rolt
// glijdt er rond af i.p.v. met een schok terug omhoog te springen.
function collideTerrain(p, terrain) {
  const r = p.r
  for (const t of terrain) {
    const x0 = t.x, x1 = t.x + t.w, y0 = t.y, y1 = t.y + t.h
    const inside = p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1
    const cx = Math.max(x0, Math.min(p.x, x1)), cy = Math.max(y0, Math.min(p.y, y1))
    const dx = p.x - cx, dy = p.y - cy, d2 = dx * dx + dy * dy
    if (!inside && d2 >= r * r) continue
    if (inside) {
      const dL = p.x - x0, dR = x1 - p.x, dT = p.y - y0, dB = y1 - p.y
      const m = Math.min(dL, dR, dT, dB)
      if (m === dT) p.y = y0 - r
      else if (m === dB) p.y = y1 + r
      else if (m === dL) p.x = x0 - r
      else p.x = x1 + r
    } else {
      const d = Math.sqrt(d2) || 1e-4
      p.x += (dx / d) * (r - d); p.y += (dy / d) * (r - d)
    }
    p._hit = true
  }
}
// helling (schans of heuvel): punt wordt loodrecht uit het oppervlak geduwd
// (niet recht omhoog — dat gaf de auto gratis extra vaart op de schans)
function collideRamp(p, ramps) {
  const r = p.r
  for (const rm of ramps) {
    if (p.x < rm.x0 - r || p.x > rm.x1 + r) continue
    const dx = rm.x1 - rm.x0, dy = rm.y1 - rm.y0, l2 = dx * dx + dy * dy
    const u = Math.max(0, Math.min(1, ((p.x - rm.x0) * dx + (p.y - rm.y0) * dy) / l2))
    const qx = rm.x0 + u * dx, qy = rm.y0 + u * dy
    let nx = p.x - qx, ny = p.y - qy
    const side = dx * (p.y - rm.y0) - dy * (p.x - rm.x0)      // > 0: onder het oppervlak
    const d = Math.hypot(nx, ny) || 1e-4
    if (side > 0) {
      if (u <= 0 || u >= 1 || d > 70) continue                // ver onder de helling: niet terugtrekken
      const L = Math.sqrt(l2); p.x = qx + (dy / L) * r; p.y = qy - (dx / L) * r
    } else {
      if (d >= r) continue
      p.x = qx + nx / d * r; p.y = qy + ny / d * r
    }
    p._hit = true
  }
}
// wiel op een weg-balk: correctie verdeeld over wiel en de twee balk-uiteinden
function collideWheelBeam(w, a, b, half) {
  const R = w.r + half
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1
  const u = Math.max(0, Math.min(1, ((w.x - a.x) * dx + (w.y - a.y) * dy) / l2))
  let nx = w.x - (a.x + u * dx), ny = w.y - (a.y + u * dy)
  const d = Math.hypot(nx, ny) || 1e-4
  if (d >= R) return
  nx /= d; ny /= d
  const ov = R - d, wa = a.w * (1 - u), wb = b.w * u, sum = w.w + wa + wb
  if (sum === 0) return
  w.x += nx * ov * w.w / sum; w.y += ny * ov * w.w / sum
  a.x -= nx * ov * wa / sum; a.y -= ny * ov * wa / sum
  b.x -= nx * ov * wb / sum; b.y -= ny * ov * wb / sum
  w._hit = true
}
