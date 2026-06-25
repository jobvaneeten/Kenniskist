import { useEffect, useRef, useState } from 'react'
import OrientationGate from '../OrientationGate'

// Eigen massa-veer-physics (Verlet + constraint-relaxatie, Jakobsen-methode).
// Breken op basis van échte balkkracht i.p.v. een doorzak-trucje.

// ═══════════════════════════════════════════════════════════════════════════
//  BRUG BOUWEN — Build-a-Bridge-stijl (matter-js)
//  Materialen: hout / weg / metaal / touw · 22 levels · stevigheids-kleuren
// ═══════════════════════════════════════════════════════════════════════════

const VW = 1280, VH = 720
const KILL_Y = 820
const SNAP = 20
const HIT = 34

// ── materialen ──────────────────────────────────────────────────────────────
// cost = budget per balk · maxLen = langste balk · break = rekgrens (hoger=sterker)
// density = gewicht · drive = of de auto erop kan rijden · rope = trekkabel (geen balk)
// drive=true ⇒ de auto rijdt erop (alleen WEG). hout/metaal/touw zijn pure steun.
// strength = max balkkracht voor breuk · stiff = relaxatie-stijfheid · tension = alleen trekken (touw)
const MAT = {
  weg:    { name: 'Weg',    icon: '🛣️', cost: 10, maxLen: 168, drive: true,  rope: false, w: 15, col: '#3c4250', col2: '#262b36', edge: '#15181f', strength: 1.7, stiff: 1,   tension: false },
  hout:   { name: 'Hout',   icon: '🪵', cost: 6,  maxLen: 160, drive: false, rope: false, w: 12, col: '#c79a52', col2: '#8a6a30', edge: '#6b4f22', strength: 3.2, stiff: 1,   tension: false },
  metaal: { name: 'Metaal', icon: '🔩', cost: 16, maxLen: 185, drive: false, rope: false, w: 11, col: '#9fb0cc', col2: '#5d6c84', edge: '#3c4860', strength: 9,   stiff: 1,   tension: false },
  touw:   { name: 'Touw',   icon: '🪢', cost: 4,  maxLen: 260, drive: false, rope: true,  w: 5,  col: '#dcc48e', col2: '#a98a54', edge: '#7c5a30', strength: 4,   stiff: 0.9, tension: true },
}
const MAT_ORDER = ['weg', 'hout', 'metaal', 'touw']

// ── Verlet-physics-constanten ──
const GRAV = 0.34       // zwaartekracht (px/frame²)
const DAMP = 0.985      // snelheidsbehoud
const ITER = 22         // relaxatie-iteraties per frame (hoger = stijver)
const NODE_R = 5        // botsradius knoop met terrein
const DRIVE_START = 1500
const MAXVX = 4.3       // kruissnelheid auto (genoeg om van een schans te lanceren)

// ── level-fabriek ────────────────────────────────────────────────────────────
// platforms: [{x0,x1,y}] vaste grond · posts: [{x,top}] hoge torens (hangbrug)
function L(cfg) {
  const terrain = [], anchors = []
  const push = (x, y) => { if (!anchors.some(a => Math.abs(a.x - x) < 8 && Math.abs(a.y - y) < 8)) anchors.push({ x, y }) }
  cfg.platforms.forEach((p, i) => {
    terrain.push({ x: p.x0, y: p.y, w: p.x1 - p.x0, h: KILL_Y + 80 - p.y, grass: true })
    if (i > 0)                       push(p.x0, p.y)
    if (i < cfg.platforms.length - 1) push(p.x1, p.y)
    if (i === 0)                      push(p.x1, p.y)             // start-rand
    if (i === cfg.platforms.length-1) push(p.x0, p.y)            // finish-rand
  })
  ;(cfg.posts || []).forEach(po => {
    terrain.push({ x: po.x - 9, y: po.top, w: 18, h: KILL_Y + 80 - po.top, post: true })
    push(po.x, po.top)
  })
  const first = cfg.platforms[0], last = cfg.platforms[cfg.platforms.length - 1]
  const sx = cfg.shipX != null ? cfg.shipX : 640
  return {
    title: cfg.title, budget: cfg.budget, mats: cfg.mats, heavy: !!cfg.heavy,
    shipX: sx,
    // boot: alleen op open-water levels. Vaart door de kloof; bouw je te laag
    // (steun onder de waterlijn-clearance) dan ramt hij je brug.
    boat: cfg.boat ? { x: sx, half: cfg.boatHalf || 300, top: cfg.boatTop || 512 } : null,
    terrain, anchors, ramps: cfg.ramps || [],
    start: cfg.start || { x: first.x1 - 110, y: first.y },
    finishX: cfg.finishX != null ? cfg.finishX : last.x0 + 26,
    finishY: last.y,
  }
}

// ── level-generatoren (oplosbaar door constructie) ──
const ALL = ['weg', 'hout', 'metaal', 'touw'], WH = ['weg', 'hout'], WHM = ['weg', 'hout', 'metaal']
// kloof met pijlers: elke deelspan blijft kort genoeg om met de weg te overbruggen;
// pijlers staan ≤150 onder het dek zodat je ze met hout/metaal kunt schoren.
function gp(title, budget, mats, o = {}) {
  const gap = o.gap ?? 280, cx = o.cx ?? 640, yL = o.yL ?? 440, yR = o.yR ?? 440
  // minder pijlers + bredere vakken ⇒ je moet zelf het vakwerk bedenken (minder
  // "verbind de stippen"). Vakken blijven ≤ ~190 zodat schoren met metaal nog reikt.
  const piers = Math.max(1, Math.ceil(gap / 195) - 1), depth = Math.min(o.depth ?? 90, 150)
  const cL = cx - gap / 2, cR = cx + gap / 2
  const platforms = [{ x0: -300, x1: cL, y: yL }]
  for (let i = 1; i <= piers; i++) {
    const f = i / (piers + 1), px = cL + gap * f
    platforms.push({ x0: px - 28, x1: px + 28, y: yL + (yR - yL) * f + depth })
  }
  platforms.push({ x0: cR, x1: 1580, y: yR })
  return L({ title, budget, mats, platforms, heavy: o.heavy, posts: o.posts })
}
// schans: lange aanloop, helling aan de rand, kloof, lager landingsplatform.
function jp(title, budget, mats, o = {}) {
  const lx = o.lx ?? 550, yL = o.yL ?? 405, rx = o.rx ?? 690, yR = o.yR ?? 480
  const rise = o.rise ?? 58, run = o.run ?? 120
  return L({
    title, budget, mats, heavy: o.heavy,
    platforms: [{ x0: -300, x1: lx, y: yL }, { x0: rx, x1: 1580, y: yR }],
    ramps: [{ x0: lx - run, y0: yL, x1: lx, y1: yL - rise }],
    start: { x: lx - 330, y: yL },
  })
}

const LEVELS = [
  // ── Tier 1 (1-10): rustig leren — weg schoren met hout/metaal ──
  gp('Eerste brug',     140, WH,  { gap: 240, depth: 70 }),
  gp('Steun nodig',     150, WH,  { gap: 260, depth: 95 }),
  gp('Dieper ravijn',   175, WHM, { gap: 280, depth: 125 }),
  gp('Schuin omhoog',   180, WHM, { gap: 280, depth: 95, yL: 460, yR: 410 }),
  jp('De schans',       150, WH,  { lx: 540, yL: 405, rx: 680, yR: 480, rise: 58 }),
  gp('Brede kloof',     210, WHM, { gap: 320, depth: 115 }),
  gp('Zware vracht',    230, WHM, { gap: 280, depth: 100, heavy: true }),
  gp('Twee steunen',    250, WHM, { gap: 360, piers: 2, depth: 110 }),
  gp('Diepe pijler',    230, WHM, { gap: 300, depth: 150 }),
  gp('Hoog en laag',    250, WHM, { gap: 320, depth: 120, yL: 400, yR: 470 }),

  // ── Tier 2 (11-20): groter, zwaarder, eerste verre sprongen ──
  gp('Lange brug',      300, WHM, { gap: 400, piers: 2, depth: 120 }),
  gp('Zwaar & diep',    300, WHM, { gap: 340, depth: 150, heavy: true }),
  jp('Verre sprong',    200, WHM, { lx: 560, yL: 395, rx: 715, yR: 485, rise: 64 }),
  gp('De trap',         270, WHM, { gap: 360, piers: 2, depth: 105, yL: 495, yR: 405 }),
  gp('Drie steunen',    340, WHM, { gap: 460, piers: 3, depth: 120 }),
  gp('Staal vereist',   290, WHM, { gap: 360, depth: 150, heavy: true }),
  gp('Brede vracht',    340, WHM, { gap: 420, piers: 2, depth: 130, heavy: true }),
  gp('Steile helling',  310, WHM, { gap: 400, piers: 2, depth: 110, yL: 380, yR: 500 }),
  gp('Canyon',          360, WHM, { gap: 480, piers: 3, depth: 140 }),
  jp('Grote sprong',    230, WHM, { lx: 560, yL: 390, rx: 730, yR: 490, rise: 70 }),

  // ── Tier 3 (21-30): wijde kloven, veel steun, krappe budgetten ──
  gp('Wijde steun',     360, WHM, { gap: 440, piers: 2, depth: 150 }),
  gp('Drie & zwaar',    400, WHM, { gap: 480, piers: 3, depth: 130, heavy: true }),
  gp('Vier steunen',    420, WHM, { gap: 560, piers: 4, depth: 125 }),
  gp('Diep & breed',    400, WHM, { gap: 500, piers: 3, depth: 150 }),
  gp('Berg op',         360, WHM, { gap: 460, piers: 2, depth: 130, yL: 360, yR: 510 }),
  jp('Dubbele sprong',  280, WHM, { lx: 560, yL: 385, rx: 740, yR: 495, rise: 74 }),
  gp('Zware overspan',  440, WHM, { gap: 520, piers: 3, depth: 145, heavy: true }),
  gp('Het diepe gat',   400, WHM, { gap: 480, piers: 3, depth: 150 }),
  gp('Lange vracht',    460, WHM, { gap: 540, piers: 3, depth: 140, heavy: true }),
  gp('Vijf steunen',    480, WHM, { gap: 620, piers: 5, depth: 130 }),

  // ── Tier 4 (31-40): torens & touw mogelijk, grote ravijnen ──
  gp('Touwbrug',        380, ['weg', 'hout', 'touw'],   { gap: 420, piers: 2, depth: 130, posts: [{ x: 430, top: 300 }, { x: 850, top: 300 }] }),
  gp('Hangbrug',        440, ALL, { gap: 520, piers: 3, depth: 140, posts: [{ x: 400, top: 290 }, { x: 880, top: 290 }] }),
  gp('Diep & zwaar',    460, WHM, { gap: 500, piers: 3, depth: 150, heavy: true }),
  jp('Mega-sprong',     300, WHM, { lx: 560, yL: 380, rx: 745, yR: 500, rise: 78 }),
  gp('Reuzenkloof',     520, ALL, { gap: 640, piers: 4, depth: 145, posts: [{ x: 360, top: 280 }, { x: 920, top: 280 }] }),
  gp('Zes steunen',     540, WHM, { gap: 700, piers: 6, depth: 135 }),
  gp('Berghelling',     460, WHM, { gap: 560, piers: 3, depth: 140, yL: 350, yR: 520, heavy: true }),
  gp('Diepste pijler',  480, WHM, { gap: 520, piers: 3, depth: 150, heavy: true }),
  gp('Grand Canyon',    560, ALL, { gap: 660, piers: 4, depth: 150, posts: [{ x: 350, top: 270 }, { x: 930, top: 270 }] }),
  jp('Wereldsprong',    340, ALL, { lx: 560, yL: 375, rx: 750, yR: 505, rise: 82 }),

  // ── Tier 5 (41-50): meesterproef — alles tegelijk, krap, zwaar ──
  gp('Lange reis',      560, WHM, { gap: 720, piers: 6, depth: 140 }),
  gp('Zwaar transport', 580, ALL, { gap: 640, piers: 4, depth: 150, heavy: true, posts: [{ x: 360, top: 270 }, { x: 920, top: 270 }] }),
  gp('Het ravijn',      600, ALL, { gap: 700, piers: 5, depth: 150, posts: [{ x: 340, top: 260 }, { x: 940, top: 260 }] }),
  gp('Bergpas',         560, WHM, { gap: 640, piers: 4, depth: 145, yL: 340, yR: 540, heavy: true }),
  jp('Onmogelijke sprong', 380, ALL, { lx: 560, yL: 370, rx: 758, yR: 510, rise: 86 }),
  gp('Zeven steunen',   640, WHM, { gap: 800, piers: 7, depth: 140 }),
  gp('Mega-vracht',     640, ALL, { gap: 700, piers: 5, depth: 150, heavy: true, posts: [{ x: 330, top: 260 }, { x: 950, top: 260 }] }),
  gp('Diepe afgrond',   620, ALL, { gap: 720, piers: 5, depth: 150, posts: [{ x: 330, top: 250 }, { x: 950, top: 250 }] }),
  gp('De eindbaas',     720, ALL, { gap: 820, piers: 7, depth: 150, heavy: true }),
  gp('Meesterbouwer',   780, ALL, { gap: 860, piers: 7, depth: 150, heavy: true, posts: [{ x: 300, top: 250 }, { x: 980, top: 250 }] }),
]

// ── progressie ──
function loadProg() { try { return JSON.parse(localStorage.getItem('kk_brug') || '{}') } catch { return {} } }
function saveProg(d) { localStorage.setItem('kk_brug', JSON.stringify(d)) }

export default function BrugBouwen({ onBack }) {
  const canvasRef = useRef(null)
  const S = useRef(null)
  const [screen, setScreen] = useState('select')   // select | play
  const [levelIdx, setLevelIdx] = useState(0)
  const [mode, setMode] = useState('build')         // build | run | win | lose
  const [mat, setMat] = useState('weg')
  const [budget, setBudget] = useState(0)
  const [prog, setProg] = useState(loadProg())
  const [stars, setStars] = useState(0)
  const matRef = useRef(mat); matRef.current = mat
  const modeRef = useRef(mode); modeRef.current = mode

  // ── level laden ──
  function loadLevel(idx) {
    const lv = LEVELS[idx]
    const nodes = lv.anchors.map(a => ({ x: a.x, y: a.y, fixed: true }))
    S.current = {
      ...S.current, lv, idx, nodes, members: [],
      drag: null, flash: 0, lp: null, lpTimer: null,
      sim: null, t0: 0,
    }
    setLevelIdx(idx)
    setBudget(lv.budget)
    setMode('build')
    setMat(lv.mats[0])
    setScreen('play')
  }

  // ── canvas + loop (één keer) ──
  useEffect(() => {
    const cv = canvasRef.current
    const ctx = cv.getContext('2d')
    if (!S.current) S.current = { lv: LEVELS[0], nodes: [], members: [], view: { scale: 1, ox: 0, oy: 0 } }
    S.current.ctx = ctx

    function resize() {
      const r = cv.parentElement.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = Math.floor(r.width * dpr); cv.height = Math.floor(r.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const scale = Math.min(r.width / VW, r.height / VH)
      S.current.view = { scale, ox: (r.width - VW * scale) / 2, oy: (r.height - VH * scale) / 2, cssW: r.width, cssH: r.height }
    }
    resize(); window.addEventListener('resize', resize)

    const toWorld = e => {
      const r = cv.getBoundingClientRect(), v = S.current.view
      return { x: (e.clientX - r.left - v.ox) / v.scale, y: (e.clientY - r.top - v.oy) / v.scale }
    }
    const nearestNode = p => {
      let bi = -1, bd = HIT * HIT
      S.current.nodes.forEach((n, i) => { const d = (n.x - p.x) ** 2 + (n.y - p.y) ** 2; if (d < bd) { bd = d; bi = i } })
      return bi
    }
    const nearestMember = p => {
      let bi = -1, bd = 16
      S.current.members.forEach((m, i) => {
        const a = S.current.nodes[m.a], b = S.current.nodes[m.b]
        const d = segDist(p.x, p.y, a.x, a.y, b.x, b.y)
        if (d < bd) { bd = d; bi = i }
      })
      return bi
    }
    function cost() { return S.current.members.reduce((s, m) => s + MAT[m.mat].cost, 0) }
    function sync() { setBudget(S.current.lv.budget - cost()) }

    function rebuild() {
      const A = S.current.lv.anchors.length, used = new Set()
      S.current.members.forEach(m => { used.add(m.a); used.add(m.b) })
      const keep = [], map = {}
      S.current.nodes.forEach((n, i) => { if (i < A || used.has(i)) { map[i] = keep.length; keep.push(n) } })
      S.current.nodes = keep
      S.current.members = S.current.members.map(m => ({ ...m, a: map[m.a], b: map[m.b] }))
    }

    function onDown(e) {
      if (modeRef.current !== 'build') return
      const p = toWorld(e)
      const i = nearestNode(p)
      if (i >= 0) { S.current.drag = { from: i, x: p.x, y: p.y }; return }
      const mi = nearestMember(p)
      if (mi >= 0) {
        S.current.lp = { x: e.clientX, y: e.clientY }
        S.current.lpTimer = setTimeout(() => {
          S.current.members.splice(mi, 1); rebuild(); sync(); S.current.lp = null; S.current.lpTimer = null
        }, 420)
      }
    }
    function onMove(e) {
      if (S.current.lp && Math.hypot(e.clientX - S.current.lp.x, e.clientY - S.current.lp.y) > 10) {
        clearTimeout(S.current.lpTimer); S.current.lp = null; S.current.lpTimer = null
      }
      if (!S.current.drag) return
      const p = toWorld(e); S.current.drag.x = p.x; S.current.drag.y = p.y
    }
    function onUp(e) {
      if (S.current.lpTimer) { clearTimeout(S.current.lpTimer); S.current.lpTimer = null }
      S.current.lp = null
      const d = S.current.drag; S.current.drag = null
      if (!d || modeRef.current !== 'build') return
      const m = MAT[matRef.current]
      if (S.current.lv.budget - cost() < m.cost) { S.current.flash = 0.4; return }
      const p = toWorld(e)
      let j = nearestNode(p)
      if (j === d.from) return
      if (j < 0) {
        const nx = Math.round(p.x / SNAP) * SNAP, ny = Math.round(p.y / SNAP) * SNAP
        if (ny < 30 || ny > 700 || nx < -260 || nx > 1540) { S.current.flash = 0.4; return }
        S.current.nodes.push({ x: nx, y: ny, fixed: false }); j = S.current.nodes.length - 1
      }
      const a = S.current.nodes[d.from], b = S.current.nodes[j]
      const len = Math.hypot(a.x - b.x, a.y - b.y)
      if (len > m.maxLen || len < 12) { S.current.flash = 0.4; pruneOrphan(j); return }
      if (S.current.members.some(x => (x.a === d.from && x.b === j) || (x.a === j && x.b === d.from))) { S.current.flash = 0.4; pruneOrphan(j); return }
      S.current.members.push({ a: d.from, b: j, mat: matRef.current })
      sync()
    }
    function pruneOrphan(j) {
      const n = S.current.nodes
      if (j < S.current.lv.anchors.length) return
      if (j === n.length - 1 && !S.current.members.some(x => x.a === j || x.b === j)) n.pop()
    }
    S.current.rebuild = rebuild; S.current.sync = sync

    cv.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)

    let raf, last = performance.now()
    function frame(now) {
      const dt = Math.min(40, now - last); last = now
      if (S.current.sim) step()
      draw(dt / 1000)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf); window.removeEventListener('resize', resize)
      cv.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      teardown()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── physics opbouwen (Verlet) ──
  function startRun() {
    const st = S.current
    // (schans-levels mogen zonder brug starten ⇒ geen lege-brug-blokkade meer)

    // knopen → puntmassa's (im = inverse massa; 0 = vast anker)
    const pts = st.nodes.map(n => ({ x: n.x, y: n.y, px: n.x, py: n.y, im: n.fixed ? 0 : 1, r: NODE_R }))
    // balken → constraints met rustlengte
    const beams = st.members.map(m => {
      const a = pts[m.a], b = pts[m.b]
      return { a: m.a, b: m.b, rest: Math.hypot(a.x - b.x, a.y - b.y), mat: m.mat, broken: false, force: 0 }
    })

    // ── voertuig: stijve doos van 4 punten (2 wielen onder, 2 hoeken boven) ──
    const s = st.lv.start, heavy = st.lv.heavy
    const wR = heavy ? 18 : 15, halfW = heavy ? 48 : 40, bodyH = heavy ? 36 : 30
    const by = s.y - wR - 2, ty = by - bodyH, im = heavy ? 0.34 : 0.42
    const base = pts.length
    const mk = (x, y, r) => { pts.push({ x, y, px: x, py: y, im, r, car: true }); return pts.length - 1 }
    const wl = mk(s.x - halfW, by, wR), wr = mk(s.x + halfW, by, wR)
    const tl = mk(s.x - halfW, ty, 6), tr = mk(s.x + halfW, ty, 6)
    const carBeam = (i, j) => beams.push({ a: i, b: j, rest: Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y), car: true })
    carBeam(wl, wr); carBeam(tl, tr); carBeam(wl, tl); carBeam(wr, tr); carBeam(wl, tr); carBeam(wr, tl)

    st.sim = {
      pts, beams, terrain: st.lv.terrain, ramps: st.lv.ramps || [],
      car: { wl, wr, tl, tr, wR, heavy, base },
      wheels: [wl, wr], grounded: true,
    }
    st.t0 = performance.now(); st.maxX = s.x; st.lastProg = 0
    setMode('run')
  }

  function step() {
    const st = S.current, sim = st.sim
    const el = performance.now() - st.t0
    const grav = GRAV * Math.min(1, el / 1100)   // zwaartekracht zacht opvoeren ⇒ zichtbaar inzakken
    const { pts, beams } = sim

    // 1) Verlet-integratie
    for (const p of pts) {
      if (p.im === 0) continue
      const vx = (p.x - p.px) * DAMP, vy = (p.y - p.py) * DAMP
      p.px = p.x; p.py = p.y
      p.x += vx; p.y += vy + grav
    }

    // 2) aandrijving: alleen op de grond (wielcontact). In de lucht geen duw ⇒
    //    de auto maakt een natuurlijke boog en kan van een schans af vliegen.
    if (modeRef.current === 'run' && el > DRIVE_START && sim.grounded) {
      const c = sim.car
      const w = pts[c.wl], vx = w.x - w.px
      const push = vx >= MAXVX ? 0 : vx < 0.6 ? 0.95 : 0.6
      if (push) for (const ci of [c.wl, c.wr, c.tl, c.tr]) pts[ci].x += push
    }
    // in de lucht: zachte zelf-stabilisatie ⇒ landt op z'n wielen na een sprong
    if (modeRef.current === 'run' && el > DRIVE_START && !sim.grounded) {
      const c = sim.car, P = [c.wl, c.wr, c.tl, c.tr]
      let cx = 0, cy = 0; for (const ci of P) { cx += pts[ci].x; cy += pts[ci].y }; cx /= 4; cy /= 4
      const ang = Math.atan2(pts[c.wr].y - pts[c.wl].y, pts[c.wr].x - pts[c.wl].x)
      const corr = -ang * 0.09, cs = Math.cos(corr), sn = Math.sin(corr)
      for (const ci of P) { const p = pts[ci], dx = p.x - cx, dy = p.y - cy; p.x = cx + dx * cs - dy * sn; p.y = cy + dx * sn + dy * cs }
    }

    // 3) relaxatie: balken stijf maken + botsingen oplossen
    const wlp = pts[sim.car.wl], wrp = pts[sim.car.wr]
    wlp._hit = false; wrp._hit = false
    for (let it = 0; it < ITER; it++) {
      const first = it === 0
      for (const bm of beams) {
        if (bm.broken) continue
        const a = pts[bm.a], b = pts[bm.b]
        let dx = b.x - a.x, dy = b.y - a.y
        let d = Math.hypot(dx, dy) || 0.0001
        const mat = bm.mat ? MAT[bm.mat] : null
        // touw trekt alleen (geen druk)
        if (mat && mat.tension && d < bm.rest) continue
        const diff = (d - bm.rest)
        if (first && mat) bm.force = bm.force * 0.82 + Math.abs(diff) * 0.18   // kracht-proxy
        const stiff = mat ? mat.stiff : 1
        const k = (diff / d) * 0.5 * stiff
        const imA = a.im, imB = b.im, sum = imA + imB
        if (sum === 0) continue
        const fa = imA / sum, fb = imB / sum
        a.x += dx * k * 2 * fa; a.y += dy * k * 2 * fa
        b.x -= dx * k * 2 * fb; b.y -= dy * k * 2 * fb
      }
      // terrein- en schans-botsing voor alle punten
      for (const p of pts) { if (p.im !== 0) { collideTerrain(p, sim.terrain); collideRamp(p, sim.ramps) } }
      // wielen op het weg-dek (lastoverdracht naar de brug)
      for (const wi of sim.wheels) {
        const w = pts[wi]
        for (const bm of beams) {
          if (bm.broken || bm.car || !MAT[bm.mat]?.drive) continue
          collideWheelBeam(w, pts[bm.a], pts[bm.b], MAT[bm.mat].w * 0.5)
        }
      }
    }
    sim.grounded = !!(wlp._hit || wrp._hit)   // wielcontact deze frame

    if (modeRef.current === 'run') {
      // breken zodra de balkkracht de sterkte overschrijdt
      if (el > 500) for (const bm of beams) {
        if (bm.broken || bm.car) continue
        if (bm.force > MAT[bm.mat].strength) bm.broken = true
      }
      // win / verlies
      const wl = pts[sim.car.wl], wr = pts[sim.car.wr]
      const cx = (wl.x + wr.x) / 2, cy = (wl.y + wr.y) / 2
      // vooruitgang bijhouden ⇒ vastgelopen auto verliest (i.p.v. eindeloos wachten)
      if (cx > st.maxX + 2) { st.maxX = cx; st.lastProg = el }
      const stuck = el > DRIVE_START + 600 && el - st.lastProg > 2600
      if (cx > st.lv.finishX && cy < st.lv.finishY + 70) finish('win')
      else if (cy > KILL_Y || stuck || el > 30000) finish('lose')
    }
  }

  function teardown() { if (S.current) S.current.sim = null }

  function finish(result) {
    if (modeRef.current !== 'run') return
    setMode(result)
    if (result === 'win') {
      const idx = S.current.idx
      const used = S.current.members.reduce((s, m) => s + MAT[m.mat].cost, 0)
      const ratio = used / S.current.lv.budget
      const st3 = ratio <= 0.6 ? 3 : ratio <= 0.85 ? 2 : 1
      setStars(st3)
      const p = { ...loadProg() }
      p.unlocked = Math.max(p.unlocked || 1, Math.min(LEVELS.length, idx + 2))
      p.stars = { ...(p.stars || {}), [idx]: Math.max((p.stars || {})[idx] || 0, st3) }
      saveProg(p); setProg(p)
    }
  }

  function backToBuild() { teardown(); setMode('build') }
  function wisLaatste() { if (S.current.members.length) { S.current.members.pop(); S.current.rebuild(); S.current.sync() } }
  function leeg() { S.current.members.length = 0; S.current.nodes.length = S.current.lv.anchors.length; S.current.sync() }

  // ═══ TEKENEN ═══════════════════════════════════════════════════════════════
  function draw(dt) {
    const st = S.current; if (!st) return
    const { ctx, view } = st
    if (st.flash > 0) st.flash = Math.max(0, st.flash - dt)
    st.tAcc = (st.tAcc || 0) + dt
    ctx.save(); ctx.clearRect(0, 0, view.cssW, view.cssH)
    ctx.translate(view.ox, view.oy); ctx.scale(view.scale, view.scale)
    ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip()

    const lv = st.lv, run = !!st.sim, t = st.tAcc

    // lucht — zachte dag-gradient
    const sky = ctx.createLinearGradient(0, 0, 0, VH)
    sky.addColorStop(0, '#1f5fc6'); sky.addColorStop(0.4, '#3f8ce0'); sky.addColorStop(0.72, '#8fc8ef'); sky.addColorStop(1, '#d6f0f6')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH)
    // zon + zonnestralen
    ctx.save()
    const sunX = 1070, sunY = 140
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = 'rgba(255,248,210,.10)'; ctx.lineWidth = 26
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + t * 0.05; ctx.beginPath(); ctx.moveTo(sunX, sunY); ctx.lineTo(sunX + Math.cos(a) * 600, sunY + Math.sin(a) * 600); ctx.stroke() }
    ctx.restore()
    const sun = ctx.createRadialGradient(sunX, sunY, 16, sunX, sunY, 300)
    sun.addColorStop(0, 'rgba(255,250,220,.95)'); sun.addColorStop(0.18, 'rgba(255,244,190,.7)'); sun.addColorStop(1, 'rgba(255,246,200,0)')
    ctx.fillStyle = sun; ctx.fillRect(0, 0, VW, VH)
    ctx.fillStyle = '#fff7da'; ctx.beginPath(); ctx.arc(sunX, sunY, 34, 0, 7); ctx.fill()
    // verre bergen (parallax, gelaagd)
    ctx.fillStyle = '#9fb6cf'; mountains(ctx, -50, 410, 1400, 150, 6, 1)
    ctx.fillStyle = '#8aa9c6'; mountains(ctx, 120, 430, 1300, 120, 5, 3)
    ctx.fillStyle = 'rgba(120,180,150,.55)'; hill(ctx, 0, 452, 1280, 120, 3, 12)
    ctx.fillStyle = 'rgba(96,168,138,.6)';   hill(ctx, -100, 486, 1480, 150, 4, 30)
    // grid (alleen bouwen, blueprint-stijl)
    if (!run) {
      ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1
      for (let x = 0; x <= VW; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VH); ctx.stroke() }
      for (let y = 0; y <= VH; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke() }
    }
    // wolken + ballon + vogels
    cloud(ctx, 170 + Math.sin(t * 0.05) * 14, 110, 1.1)
    cloud(ctx, 520 + Math.sin(t * 0.03) * 10, 70, 0.7)
    cloud(ctx, 860 + Math.sin(t * 0.04) * 16, 96, 0.95)
    balloon(ctx, 620, 116 + Math.sin(t * 0.5) * 7)
    birds(ctx, 380 + (t * 8) % 540, 150)

    // water — gradient, glinstering en zon-reflectie
    const wy = 596
    const water = ctx.createLinearGradient(0, wy, 0, VH)
    water.addColorStop(0, '#56c0e2'); water.addColorStop(0.5, '#2f97c4'); water.addColorStop(1, '#176a96')
    ctx.fillStyle = water; ctx.fillRect(0, wy, VW, VH - wy)
    const refl = ctx.createLinearGradient(sunX - 60, wy, sunX + 60, VH)
    refl.addColorStop(0, 'rgba(255,250,210,.0)'); refl.addColorStop(0.5, 'rgba(255,250,210,.22)'); refl.addColorStop(1, 'rgba(255,250,210,0)')
    ctx.fillStyle = refl; ctx.fillRect(sunX - 90, wy, 180, VH - wy)
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 2
    for (let i = 0; i < 6; i++) {
      const yy = wy + 14 + i * 22
      ctx.beginPath()
      for (let x = 0; x <= VW; x += 40) ctx.lineTo(x, yy + Math.sin(x * 0.03 + t * 1.4 + i) * 2.2)
      ctx.stroke()
    }
    // boot: in run vaart hij; in bouwfase staat hij klaar links in de kloof
    if (lv.boat) {
      const bx = run && st.boat ? st.boat.x : lv.boat.x - lv.boat.half
      ship(ctx, bx, wy, t)
    }

    // terrein
    lv.terrain.forEach(tr => drawTerrain(ctx, tr, t))
    lv.ramps.forEach(rm => drawRamp(ctx, rm))

    // ── leden ──
    if (run) {
      st.sim.beams.forEach(p => {
        if (p.broken || p.car) return
        const a = st.sim.pts[p.a], b = st.sim.pts[p.b]
        const stress = Math.min(1, p.force / MAT[p.mat].strength)
        drawMember(ctx, a, b, p.mat, strainCol(stress), true)
      })
    } else {
      st.members.forEach(m => drawMember(ctx, st.nodes[m.a], st.nodes[m.b], m.mat, null, false))
    }

    // sleep-voorbeeld
    if (st.drag) {
      const a = st.nodes[st.drag.from], m = MAT[matRef.current]
      const len = Math.hypot(a.x - st.drag.x, a.y - st.drag.y)
      const ok = len <= m.maxLen && len >= 12
      ctx.strokeStyle = ok ? 'rgba(150,240,160,.95)' : 'rgba(255,90,90,.95)'
      ctx.lineWidth = m.w; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(st.drag.x, st.drag.y); ctx.stroke()
    }

    // knopen (in run: alleen de brug-knopen, niet de auto-punten)
    const nodes = run ? st.sim.pts.slice(0, st.sim.car.base).map((p, i) => ({ x: p.x, y: p.y, fixed: st.nodes[i].fixed })) : st.nodes
    nodes.forEach(n => peg(ctx, n.x, n.y, n.fixed))

    // truck
    if (run) drawTruck(ctx, st.sim)

    // finish-vlag
    flag(ctx, lv.finishX + 6, lv.finishY)

    if (st.flash > 0) { ctx.fillStyle = `rgba(255,40,40,${st.flash * 0.5})`; ctx.fillRect(0, 0, VW, VH) }
    ctx.restore()
  }

  // ═══ UI ════════════════════════════════════════════════════════════════════
  const lv = LEVELS[levelIdx]
  const unlocked = prog.unlocked || 1

  return (
    <div style={wrap}>
      <button style={backBtn} onClick={() => { if (screen === 'play') { teardown(); setMode('build'); setScreen('select') } else onBack() }}>← {screen === 'play' ? 'Levels' : 'Menu'}</button>
      <div style={{ position: 'absolute', inset: 0 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }} />
      </div>

      {screen === 'play' && (
        <>
          <div style={hudTop}>
            <span style={badge}>Level {levelIdx + 1} · {lv.title}</span>
            <span style={{ ...badge, color: budget >= 0 ? '#ffe08a' : '#ff8a8a' }}>💰 {budget}</span>
          </div>

          {mode === 'build' && (
            <>
              <div style={matBar}>
                {lv.mats.map(k => (
                  <button key={k} onClick={() => setMat(k)}
                    style={{ ...matBtn, ...(mat === k ? matBtnOn : {}), borderColor: MAT[k].col }}>
                    <span style={{ fontSize: 22 }}>{MAT[k].icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 800 }}>{MAT[k].name}</span>
                    <span style={{ fontSize: 11, color: '#ffe08a', fontWeight: 800 }}>💰{MAT[k].cost}</span>
                  </button>
                ))}
              </div>
              <div style={hudBottom}>
                <button style={ghost} onClick={leeg}>🗑</button>
                <button style={ghost} onClick={wisLaatste}>↩</button>
                <button style={primary} onClick={startRun}>▶ Test!</button>
              </div>
            </>
          )}
          {mode === 'run' && (
            <div style={hudBottom}><button style={ghost} onClick={backToBuild}>↺ Stop &amp; aanpassen</button></div>
          )}
          {(mode === 'win' || mode === 'lose') && (
            <div style={overlay}>
              <div style={{ fontSize: 50, fontWeight: 900, color: mode === 'win' ? '#7ef0a0' : '#ff7a7a', filter: 'drop-shadow(0 4px 14px rgba(0,0,0,.5))' }}>
                {mode === 'win' ? 'Gehaald! 🎉' : 'Mislukt 💥'}
              </div>
              {mode === 'win' && <div style={{ fontSize: 40, letterSpacing: 6 }}>{'★★★'.slice(0, stars)}<span style={{ opacity: .25 }}>{'★★★'.slice(stars)}</span></div>}
              <div style={{ color: '#dbe6ff', marginTop: 4, maxWidth: 470 }}>
                {mode === 'win' ? 'De truck is veilig overgestoken!'
                  : S.current?.boatHit ? '🚢 De boot ramde je brug! Bouw hoger, over de boot heen.'
                  : 'Versterk je brug — leg een weg-dek en steun het met hout, metaal of touw (driehoeken!).'}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button style={ghost} onClick={backToBuild}>🔧 Aanpassen</button>
                {mode === 'win' && levelIdx + 1 < LEVELS.length && <button style={primary} onClick={() => loadLevel(levelIdx + 1)}>Volgende →</button>}
                {mode === 'lose' && <button style={primary} onClick={() => { leeg(); backToBuild() }}>↺ Opnieuw</button>}
              </div>
            </div>
          )}
          {mode === 'build' && <div style={hint}>Leg een 🛣️ weg-dek waar de auto op rijdt · steun het met 🪵 hout, 🔩 metaal of 🪢 touw · houd een balk vast om te wissen</div>}
        </>
      )}

      {screen === 'select' && (
        <div style={selectWrap}>
          <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', filter: 'drop-shadow(0 3px 10px rgba(0,0,0,.5))', marginBottom: 4 }}>🌉 Brug Bouwen</div>
          <div style={{ color: '#cfe0ff', marginBottom: 18 }}>Kies een level</div>
          <div style={grid}>
            {LEVELS.map((L2, i) => {
              const lockd = i + 1 > unlocked
              const s = (prog.stars || {})[i] || 0
              return (
                <button key={i} disabled={lockd} onClick={() => loadLevel(i)}
                  style={{ ...cell, ...(lockd ? cellLock : {}) }}>
                  <span style={{ fontSize: 22, fontWeight: 900 }}>{lockd ? '🔒' : i + 1}</span>
                  <span style={{ fontSize: 12, opacity: .85 }}>{L2.title}</span>
                  <span style={{ fontSize: 13, color: '#ffd34d', letterSpacing: 2 }}>{lockd ? '' : '★★★'.slice(0, s) + '☆☆☆'.slice(0, 3 - s)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      <OrientationGate />
    </div>
  )
}

// ═══ teken-helpers ═══════════════════════════════════════════════════════════
function strainCol(r) {
  // 0 = groen, 1 = rood
  const R = Math.round(60 + r * 195), G = Math.round(210 - r * 150), B = Math.round(90 - r * 50)
  return `rgb(${R},${G},${B})`
}
function drawMember(ctx, a, b, matKey, runCol, run) {
  const m = MAT[matKey]
  ctx.lineCap = 'round'
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1
  const nx = -dy / len, ny = dx / len   // normaal
  if (m.rope) {
    // touw: twee gevlochten strengen + lichte glans
    ctx.strokeStyle = run ? runCol : m.edge; ctx.lineWidth = m.w + 1
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
    ctx.strokeStyle = run ? runCol : m.col; ctx.lineWidth = m.w
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
    if (!run) {
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.4
      ctx.beginPath()
      for (let s = 0; s <= len; s += 7) { const px = a.x + dx * s / len + nx * Math.sin(s * 0.5) * 1.6, py = a.y + dy * s / len + ny * Math.sin(s * 0.5) * 1.6; s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py) }
      ctx.stroke()
    }
    return
  }
  // schaduw-rand
  ctx.strokeStyle = run ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.32)'; ctx.lineWidth = m.w + 4
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  // kern
  if (run) {
    ctx.strokeStyle = runCol; ctx.lineWidth = m.w
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  } else {
    const g = ctx.createLinearGradient(a.x + nx * m.w / 2, a.y + ny * m.w / 2, a.x - nx * m.w / 2, a.y - ny * m.w / 2)
    g.addColorStop(0, m.col2); g.addColorStop(0.5, m.col); g.addColorStop(1, m.col2)
    ctx.strokeStyle = g; ctx.lineWidth = m.w
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
    // bovenrand-glans
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = Math.max(1.5, m.w * 0.22)
    const k = m.w * 0.26
    ctx.beginPath(); ctx.moveTo(a.x + nx * k, a.y + ny * k); ctx.lineTo(b.x + nx * k, b.y + ny * k); ctx.stroke()
    // materiaal-detail
    if (matKey === 'weg') {           // gele streeplijn
      ctx.strokeStyle = 'rgba(255,210,80,.9)'; ctx.lineWidth = 2; ctx.setLineDash([10, 9])
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([])
    } else if (matKey === 'hout') {   // houtnerf-streepjes
      ctx.strokeStyle = 'rgba(80,55,20,.5)'; ctx.lineWidth = 1.4
      for (let s = 14; s < len; s += 16) { const px = a.x + dx * s / len, py = a.y + dy * s / len; ctx.beginPath(); ctx.moveTo(px + nx * m.w * 0.34, py + ny * m.w * 0.34); ctx.lineTo(px - nx * m.w * 0.34, py - ny * m.w * 0.34); ctx.stroke() }
    } else if (matKey === 'metaal') { // klinknagels aan de uiteinden
      ctx.fillStyle = '#e8eef8'
      for (const tt of [0.12, 0.88]) { const px = a.x + dx * tt, py = a.y + dy * tt; ctx.beginPath(); ctx.arc(px, py, m.w * 0.22, 0, 7); ctx.fill() }
    }
  }
}
function peg(ctx, x, y, fixed) {
  const r = fixed ? 8 : 6.5
  ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, 7); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill()
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r)
  if (fixed) { g.addColorStop(0, '#ffe79a'); g.addColorStop(1, '#e8a52e') }
  else { g.addColorStop(0, '#bfe3ff'); g.addColorStop(1, '#3f93e6') }
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill()
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.34, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill()
}
function drawTerrain(ctx, tr, t) {
  const x = tr.x, y = tr.y, w = tr.w, h = tr.h
  if (tr.post) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0)
    g.addColorStop(0, '#6b4d2c'); g.addColorStop(.45, '#a17b46'); g.addColorStop(.55, '#8c6a3c'); g.addColorStop(1, '#5e4326')
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h)
    // ribbels
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1.5
    for (let yy = y + 14; yy < y + 160; yy += 18) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke() }
    ctx.fillStyle = '#caa15a'; roundRect(ctx, x - 5, y - 8, w + 10, 10, 3); ctx.fill()
    ctx.fillStyle = '#ffd34d'; ctx.fillRect(x - 3, y - 7, w + 6, 3)
    return
  }
  // rots met gelaagde gradient
  const g = ctx.createLinearGradient(0, y, 0, y + 260)
  g.addColorStop(0, '#c47e34'); g.addColorStop(.4, '#9a5f2a'); g.addColorStop(.75, '#6f441f'); g.addColorStop(1, '#4e3217')
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h)
  // rots-striae (lagen)
  ctx.strokeStyle = 'rgba(60,38,16,.4)'; ctx.lineWidth = 2
  for (let yy = y + 26; yy < y + 170; yy += 24) {
    ctx.beginPath()
    for (let xx = x; xx <= x + w; xx += 50) ctx.lineTo(xx, yy + Math.sin(xx * 0.05 + yy) * 4)
    ctx.stroke()
  }
  // aarde-rand onder het gras
  ctx.fillStyle = '#7a4a22'; ctx.fillRect(x, y + 6, w, 8)
  // gras-cap met golvende onderkant
  ctx.fillStyle = '#4fb14a'
  ctx.beginPath(); ctx.moveTo(x, y - 6)
  for (let i = 0; i <= w; i += 16) ctx.lineTo(x + i, y - 6 + (i % 32 === 0 ? 0 : 3))
  ctx.lineTo(x + w, y + 12); ctx.lineTo(x, y + 12); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#6ad068'
  ctx.beginPath(); ctx.moveTo(x, y - 6)
  for (let i = 0; i <= w; i += 18) ctx.lineTo(x + i, y - 6 - (i % 36 === 0 ? 6 : 1))
  ctx.lineTo(x + w, y + 2); ctx.lineTo(x, y + 2); ctx.closePath(); ctx.fill()
  // grasplukjes + bloemen
  for (let i = 18; i < w - 12; i += 46) {
    const gx = x + i
    ctx.strokeStyle = '#3f9a3d'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(gx, y - 5); ctx.lineTo(gx - 3, y - 12); ctx.moveTo(gx, y - 5); ctx.lineTo(gx + 3, y - 12); ctx.stroke()
    if ((i / 46) % 3 === 1) { ctx.fillStyle = ['#ff6b9d', '#ffd34d', '#fff'][i % 3]; ctx.beginPath(); ctx.arc(gx + 8, y - 11, 2.6, 0, 7); ctx.fill() }
  }
  // begroeiing op brede platforms
  if (w > 120) { tree(ctx, x + 36, y, 1, x); tree(ctx, x + w - 42, y, 0.82, x + 7); if (w > 340) { bush(ctx, x + w * 0.5, y); tree(ctx, x + w * 0.66, y, 0.7, x + 3) } }
}
function tree(ctx, x, y, s, seed = 0) {
  const pine = (Math.floor(seed) % 2) === 0
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(x, y - 2, 16 * s, 4 * s, 0, 0, 7); ctx.fill()
  ctx.fillStyle = '#6b4a2a'; ctx.fillRect(x - 3 * s, y - 24 * s, 6 * s, 24 * s)
  if (pine) {
    const c = ['#2f8f48', '#3fa356', '#52bd66']
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = c[i]
      const ty = y - 16 * s - i * 13 * s, rw = (26 - i * 6) * s
      ctx.beginPath(); ctx.moveTo(x - rw, ty); ctx.lineTo(x + rw, ty); ctx.lineTo(x, ty - 24 * s); ctx.closePath(); ctx.fill()
    }
  } else {
    ctx.fillStyle = '#3fa356'; ctx.beginPath(); ctx.arc(x, y - 34 * s, 20 * s, 0, 7); ctx.fill()
    ctx.fillStyle = '#52bd66'; ctx.beginPath(); ctx.arc(x - 8 * s, y - 40 * s, 12 * s, 0, 7); ctx.fill()
    ctx.fillStyle = '#2f8f48'; ctx.beginPath(); ctx.arc(x + 9 * s, y - 28 * s, 11 * s, 0, 7); ctx.fill()
  }
}
function bush(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(x, y - 2, 20, 4, 0, 0, 7); ctx.fill()
  ctx.fillStyle = '#3fa052'
  for (const [dx, r] of [[-13, 11], [0, 16], [13, 11]]) { ctx.beginPath(); ctx.arc(x + dx, y - r + 5, r, 0, 7); ctx.fill() }
  ctx.fillStyle = '#54bd66'; for (const [dx, r] of [[-13, 7], [0, 10]]) { ctx.beginPath(); ctx.arc(x + dx - 2, y - r - 1, r, 0, 7); ctx.fill() }
}
function hill(ctx, x, y, w, h, n, seed) {
  ctx.beginPath(); ctx.moveTo(x, y + h)
  for (let i = 0; i <= w; i += 60) ctx.lineTo(x + i, y + Math.sin((i + seed * 40) * 0.01) * 22)
  ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill()
}
function mountains(ctx, x, y, w, h, n, seed) {
  ctx.beginPath(); ctx.moveTo(x, y + h)
  const step = w / n
  for (let i = 0; i <= n; i++) {
    const px = x + i * step
    const peak = y - (40 + ((i * 37 + seed * 53) % 60))
    ctx.lineTo(px - step / 2, y)
    ctx.lineTo(px, peak)
  }
  ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill()
}
function cloud(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,.9)'
  for (const [dx, dy, r] of [[-26, 4, 18], [0, -6, 24], [26, 4, 18], [0, 8, 20]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, 7); ctx.fill() }
}
function balloon(ctx, x, y) {
  const cols = ['#e8543d', '#f2b134', '#5bbf52', '#3f7fd6']
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = cols[i]; ctx.beginPath()
    ctx.ellipse(x - 30 + i * 20, y, 11, 34, 0, 0, 7); ctx.fill()
  }
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x - 40, y - 2, 80, 5)
  ctx.strokeStyle = '#7a5a36'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(x - 14, y + 30); ctx.lineTo(x - 8, y + 56); ctx.moveTo(x + 14, y + 30); ctx.lineTo(x + 8, y + 56); ctx.stroke()
  ctx.fillStyle = '#8a5a32'; ctx.fillRect(x - 10, y + 56, 20, 14)
}
function birds(ctx, x, y) {
  ctx.strokeStyle = 'rgba(40,50,70,.55)'; ctx.lineWidth = 2
  for (const dx of [0, 26, 52]) { ctx.beginPath(); ctx.moveTo(x + dx, y); ctx.quadraticCurveTo(x + dx + 6, y - 6, x + dx + 12, y); ctx.stroke() }
}
function ship(ctx, x, wy, t = 0) {
  const bob = Math.sin((t || 0) * 1.6) * 2
  ctx.save(); ctx.translate(x, wy + bob)
  // boeggolf / kielzog
  ctx.fillStyle = 'rgba(255,255,255,.5)'
  ctx.beginPath(); ctx.ellipse(96, 60, 26, 7, 0, 0, 7); ctx.fill()
  ctx.beginPath(); ctx.ellipse(-96, 60, 30, 8, 0, 0, 7); ctx.fill()
  // romp
  ctx.fillStyle = '#e9edf2'
  ctx.beginPath(); ctx.moveTo(-112, -6); ctx.lineTo(118, -6); ctx.lineTo(96, 60); ctx.lineTo(-86, 60); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#c23a3a'; ctx.beginPath(); ctx.moveTo(-112, 30); ctx.lineTo(110, 30); ctx.lineTo(96, 60); ctx.lineTo(-86, 60); ctx.closePath(); ctx.fill()
  // dekken
  ctx.fillStyle = '#fbfdff'; roundRect(ctx, -64, -34, 128, 30, 6); ctx.fill()
  ctx.fillStyle = '#eef3f8'; roundRect(ctx, -40, -58, 80, 26, 6); ctx.fill()
  ctx.fillStyle = '#dfe7ef'; roundRect(ctx, -18, -78, 40, 22, 5); ctx.fill()
  // ramen
  ctx.fillStyle = '#3aa6d8'; for (let i = 0; i < 9; i++) ctx.fillRect(-58 + i * 14, -26, 9, 10)
  ctx.fillStyle = '#7fd0ee'; for (let i = 0; i < 5; i++) ctx.fillRect(-34 + i * 16, -50, 9, 9)
  // schoorsteen + rook
  ctx.fillStyle = '#34507a'; ctx.fillRect(-6, -104, 18, 28)
  ctx.fillStyle = '#ffd34d'; ctx.fillRect(-6, -104, 18, 7)
  ctx.fillStyle = 'rgba(230,235,245,.55)'
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(3 + i * 5, -116 - i * 9, 7 - i, 0, 7); ctx.fill() }
  ctx.restore()
}
function flag(ctx, x, y) {
  ctx.strokeStyle = '#cfd6e6'; ctx.lineWidth = 4
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 64); ctx.stroke()
  ctx.fillStyle = '#ff4d6a'
  ctx.beginPath(); ctx.moveTo(x, y - 64); ctx.lineTo(x + 34, y - 54); ctx.lineTo(x, y - 44); ctx.closePath(); ctx.fill()
}
function drawTruck(ctx, sim) {
  const car = sim.car, pts = sim.pts
  const wl = pts[car.wl], wr = pts[car.wr], tl = pts[car.tl], tr = pts[car.tr]
  const cx = (wl.x + wr.x + tl.x + tr.x) / 4, cy = (wl.y + wr.y + tl.y + tr.y) / 4
  const ang = Math.atan2(wr.y - wl.y, wr.x - wl.x)
  const w = Math.hypot(wr.x - wl.x, wr.y - wl.y) + 16, h = car.heavy ? 26 : 20
  const body = car.heavy ? ['#3f7fd6', '#2c63b0'] : ['#ec4b4b', '#c22f2f']
  ctx.save(); ctx.translate(cx, cy - 2); ctx.rotate(ang)
  ctx.fillStyle = 'rgba(0,0,0,.22)'; roundRect(ctx, -w / 2, h / 2 - 3, w, 7, 4); ctx.fill()
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, body[0]); g.addColorStop(1, body[1])
  ctx.fillStyle = g; roundRect(ctx, -w / 2, -h / 2, w, h, 7); ctx.fill()
  const cabW = car.heavy ? 34 : 28
  ctx.fillStyle = body[1]; roundRect(ctx, w / 2 - cabW - 4, -h / 2 - 12, cabW, 14, 5); ctx.fill()
  const win = ctx.createLinearGradient(0, -h / 2 - 12, 0, -h / 2); win.addColorStop(0, '#dff1ff'); win.addColorStop(1, '#9cc8f0')
  ctx.fillStyle = win; roundRect(ctx, w / 2 - cabW, -h / 2 - 9, cabW - 8, 11, 3); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,.35)'; roundRect(ctx, -w / 2 + 5, -h / 2 + 3, w - cabW - 12, 4, 2); ctx.fill()
  ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(w / 2 - 2, h / 2 - 7, 3, 0, 7); ctx.fill()
  ctx.restore()
  // wielen (rol-hoek uit afgelegde weg)
  for (const wi of [car.wl, car.wr]) {
    const wp = pts[wi]
    wp._spin = (wp._spin || 0) + (wp.x - wp.px) / car.wR
    ctx.save(); ctx.translate(wp.x, wp.y); ctx.rotate(wp._spin)
    ctx.fillStyle = '#15171b'; ctx.beginPath(); ctx.arc(0, 0, car.wR, 0, 7); ctx.fill()
    ctx.fillStyle = '#2b2f36'; ctx.beginPath(); ctx.arc(0, 0, car.wR * 0.92, 0, 7); ctx.fill()
    const hub = ctx.createRadialGradient(-2, -2, 1, 0, 0, car.wR * 0.5); hub.addColorStop(0, '#e8eef6'); hub.addColorStop(1, '#8a93a0')
    ctx.fillStyle = hub; ctx.beginPath(); ctx.arc(0, 0, car.wR * 0.42, 0, 7); ctx.fill()
    ctx.strokeStyle = 'rgba(60,66,76,.9)'; ctx.lineWidth = 2
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * car.wR * 0.4, Math.sin(a) * car.wR * 0.4); ctx.stroke() }
    ctx.restore()
  }
}
// ── Verlet-botsingshelpers ──
function collideTerrain(p, terrain) {
  const r = p.r || 0
  for (const t of terrain) {
    if (t.post) continue   // torens zijn decoratie + topanker; auto/dek rijden er niet tegenaan
    const L = t.x - r, R = t.x + t.w + r, T = t.y - r, B = t.y + t.h + r
    if (p.x <= L || p.x >= R || p.y <= T || p.y >= B) continue
    const dL = p.x - L, dR = R - p.x, dT = p.y - T, dB = B - p.y
    const m = Math.min(dL, dR, dT, dB)
    if (m === dT) p.y = T           // bovenop landen (meest voorkomend)
    else if (m === dL) p.x = L
    else if (m === dR) p.x = R
    else p.y = B
    p._hit = true
  }
}
function drawRamp(ctx, rm) {
  const base = rm.y0 + 10
  const g = ctx.createLinearGradient(0, rm.y1, 0, base + 120)
  g.addColorStop(0, '#c47e34'); g.addColorStop(.5, '#9a5f2a'); g.addColorStop(1, '#6f441f')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.moveTo(rm.x0, base); ctx.lineTo(rm.x0, rm.y0); ctx.lineTo(rm.x1, rm.y1); ctx.lineTo(rm.x1, base + 120); ctx.closePath(); ctx.fill()
  // gras op de helling
  ctx.strokeStyle = '#5bbf52'; ctx.lineWidth = 11; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(rm.x0, rm.y0); ctx.lineTo(rm.x1, rm.y1); ctx.stroke()
  ctx.strokeStyle = '#6ad068'; ctx.lineWidth = 5
  ctx.beginPath(); ctx.moveTo(rm.x0, rm.y0 - 2); ctx.lineTo(rm.x1, rm.y1 - 2); ctx.stroke()
  // richtpijl
  ctx.fillStyle = 'rgba(255,255,255,.7)'
  const mx = (rm.x0 + rm.x1) / 2, my = (rm.y0 + rm.y1) / 2 - 16, ang = Math.atan2(rm.y1 - rm.y0, rm.x1 - rm.x0)
  ctx.save(); ctx.translate(mx, my); ctx.rotate(ang)
  ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(6, -6); ctx.lineTo(6, -11); ctx.lineTo(16, 0); ctx.lineTo(6, 11); ctx.lineTo(6, 6); ctx.lineTo(-10, 6); ctx.closePath(); ctx.fill()
  ctx.restore()
}
// schans: gladde helling van (x0,y0) laag naar (x1,y1) hoog. Een punt op de
// helling wordt naar het oppervlak geduwd ⇒ de auto rijdt omhoog en lanceert.
function collideRamp(p, ramps) {
  const r = p.r || 0
  for (const rm of ramps) {
    if (p.x < rm.x0 || p.x > rm.x1) continue
    const yr = rm.y0 + (rm.y1 - rm.y0) * (p.x - rm.x0) / (rm.x1 - rm.x0)
    if (p.y > yr - r && p.y < yr - r + 70) { p.y = yr - r; p._hit = true }
  }
}
function collideWheelBeam(w, a, b, h) {
  const R = (w.r || 14) + h
  let dx = b.x - a.x, dy = b.y - a.y
  const l2 = dx * dx + dy * dy || 1
  let u = ((w.x - a.x) * dx + (w.y - a.y) * dy) / l2
  u = Math.max(0, Math.min(1, u))
  const cxp = a.x + u * dx, cyp = a.y + u * dy
  let nx = w.x - cxp, ny = w.y - cyp
  let d = Math.hypot(nx, ny) || 0.0001
  if (d >= R) return
  nx /= d; ny /= d
  const overlap = R - d
  // verdeel correctie over wiel en de twee balk-uiteinden (inverse massa + parameter u)
  const imW = w.im, imA = a.im * (1 - u), imB = b.im * u, sum = imW + imA + imB
  if (sum === 0) return
  w.x += nx * overlap * (imW / sum); w.y += ny * overlap * (imW / sum)
  a.x -= nx * overlap * (imA / sum); a.y -= ny * overlap * (imA / sum)
  b.x -= nx * overlap * (imB / sum); b.y -= ny * overlap * (imB / sum)
  w._hit = true
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1
  let t = ((px - ax) * dx + (py - ay) * dy) / l2; t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

// ═══ styles ════════════════════════════════════════════════════════════════
const wrap = { position: 'fixed', inset: 0, background: '#0b1422', fontFamily: 'inherit', overflow: 'hidden' }
const backBtn = { position: 'absolute', top: 12, left: 12, zIndex: 8, background: 'rgba(8,16,34,.8)', color: '#fff', border: '1px solid rgba(255,255,255,.22)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit' }
const hudTop = { position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, zIndex: 6 }
const badge = { background: 'rgba(8,16,34,.78)', color: '#eaf1ff', border: '1px solid rgba(120,140,255,.28)', borderRadius: 30, padding: '8px 16px', fontWeight: 800, fontSize: 14 }
const matBar = { position: 'absolute', left: '50%', bottom: 76, transform: 'translateX(-50%)', display: 'flex', gap: 10, zIndex: 6 }
const matBtn = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width: 78, padding: '8px 4px', borderRadius: 14, cursor: 'pointer', color: '#eaf1ff', background: 'rgba(10,18,40,.82)', border: '2px solid rgba(120,140,255,.3)', fontFamily: 'inherit' }
const matBtnOn = { background: 'rgba(60,90,200,.5)', boxShadow: '0 0 0 2px #fff inset, 0 6px 18px rgba(80,120,255,.4)', transform: 'translateY(-3px)' }
const hudBottom = { position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 12, zIndex: 6 }
const btnB = { border: 'none', borderRadius: 30, cursor: 'pointer', fontWeight: 800, fontFamily: 'inherit' }
const primary = { ...btnB, color: '#04121a', background: 'linear-gradient(135deg,#3ef0ff,#66ffd9)', boxShadow: '0 8px 22px rgba(62,240,255,.35)', padding: '13px 30px', fontSize: 17 }
const ghost = { ...btnB, color: '#cdd8ff', background: 'rgba(12,18,40,.78)', border: '1px solid rgba(120,140,255,.32)', padding: '13px 20px', fontSize: 16 }
const overlay = { position: 'absolute', inset: 0, zIndex: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 6, background: 'radial-gradient(60% 60% at 50% 45%, rgba(6,10,24,.5), rgba(4,6,16,.82))' }
const hint = { position: 'absolute', bottom: 150, left: '50%', transform: 'translateX(-50%)', color: '#cfe0ff', fontSize: 12.5, textAlign: 'center', width: '92%', maxWidth: 580, pointerEvents: 'none', zIndex: 5, textShadow: '0 1px 4px rgba(0,0,0,.6)' }
const selectWrap = { position: 'absolute', inset: 0, zIndex: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(6,12,28,.62)', backdropFilter: 'blur(3px)' }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(116px, 1fr))', gap: 12, width: '100%', maxWidth: 760, maxHeight: '70vh', overflowY: 'auto', padding: 4 }
const cell = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, height: 86, borderRadius: 16, cursor: 'pointer', color: '#fff', background: 'linear-gradient(165deg,rgba(60,90,200,.55),rgba(20,30,70,.6))', border: '2px solid rgba(150,170,255,.4)', fontFamily: 'inherit' }
const cellLock = { background: 'rgba(20,26,46,.6)', border: '2px solid rgba(120,130,160,.25)', color: '#8a93b0', cursor: 'not-allowed' }
