import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'
import OrientationGate from '../OrientationGate'

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
const MAT = {
  weg:    { name: 'Weg',    icon: '🛣️', cost: 10, maxLen: 120, break: 0.20, density: 0.011, drive: true,  rope: false, w: 15, col: '#3c4250', col2: '#262b36', edge: '#15181f', sag: 24 },
  hout:   { name: 'Hout',   icon: '🪵', cost: 6,  maxLen: 135, break: 0.30, density: 0.005, drive: false, rope: false, w: 12, col: '#c79a52', col2: '#8a6a30', edge: '#6b4f22' },
  metaal: { name: 'Metaal', icon: '🔩', cost: 16, maxLen: 160, break: 1.0,  density: 0.008, drive: false, rope: false, w: 11, col: '#9fb0cc', col2: '#5d6c84', edge: '#3c4860' },
  touw:   { name: 'Touw',   icon: '🪢', cost: 4,  maxLen: 240, break: 0.45, density: 0.002, drive: false, rope: true,  w: 5,  col: '#dcc48e', col2: '#a98a54', edge: '#7c5a30' },
}
const MAT_ORDER = ['weg', 'hout', 'metaal', 'touw']

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
    terrain, anchors,
    start: cfg.start || { x: first.x1 - 110, y: first.y },
    finishX: cfg.finishX != null ? cfg.finishX : last.x0 + 26,
    finishY: last.y,
  }
}

const LEVELS = [
  // weg = berijdbaar dek (verplicht) · hout/metaal/touw = steun
  L({ title: 'Eerste stapjes',   budget: 100, mats: ['weg'],                          platforms: [{ x0: -300, x1: 580, y: 440 }, { x0: 700, x1: 1580, y: 440 }] }),
  L({ title: 'Over de pilaar',   budget: 120, mats: ['weg'],                          platforms: [{ x0: -300, x1: 510, y: 440 }, { x0: 610, x1: 670, y: 440 }, { x0: 770, x1: 1580, y: 440 }] }),
  L({ title: 'Steun met hout',   budget: 150, mats: ['weg', 'hout'],                  platforms: [{ x0: -300, x1: 520, y: 440 }, { x0: 612, x1: 668, y: 520 }, { x0: 760, x1: 1580, y: 440 }] }),
  L({ title: 'Bredere kloof',    budget: 190, mats: ['weg', 'hout'],                  platforms: [{ x0: -300, x1: 460, y: 440 }, { x0: 600, x1: 680, y: 490 }, { x0: 820, x1: 1580, y: 440 }] }),
  L({ title: 'Op en af',         budget: 220, mats: ['weg', 'hout', 'metaal'],        platforms: [{ x0: -300, x1: 470, y: 420 }, { x0: 605, x1: 675, y: 500 }, { x0: 800, x1: 1580, y: 470 }] }),
  L({ title: 'Diep ravijn',      budget: 240, mats: ['weg', 'hout', 'metaal'],        platforms: [{ x0: -300, x1: 430, y: 430 }, { x0: 612, x1: 668, y: 545 }, { x0: 870, x1: 1580, y: 430 }] }),
  L({ title: 'Twee pilaren',     budget: 260, mats: ['weg', 'hout'],                  platforms: [{ x0: -300, x1: 360, y: 440 }, { x0: 500, x1: 560, y: 540 }, { x0: 720, x1: 780, y: 540 }, { x0: 920, x1: 1580, y: 440 }] }),
  L({ title: 'Over de boot',     budget: 290, mats: ['weg', 'hout', 'metaal'],        platforms: [{ x0: -300, x1: 430, y: 440 }, { x0: 850, x1: 1580, y: 440 }], boat: true, boatHalf: 200 }),
  L({ title: 'Lange overspanning', budget: 300, mats: ['weg', 'hout', 'metaal'],      platforms: [{ x0: -300, x1: 400, y: 435 }, { x0: 612, x1: 668, y: 560 }, { x0: 880, x1: 1580, y: 435 }] }),
  L({ title: 'Trap omhoog',      budget: 270, mats: ['weg', 'hout', 'metaal'],        platforms: [{ x0: -300, x1: 470, y: 490 }, { x0: 640, x1: 700, y: 470 }, { x0: 870, x1: 1580, y: 400 }] }),
  L({ title: 'Touwbrug',         budget: 300, mats: ['weg', 'hout', 'touw'],          platforms: [{ x0: -300, x1: 430, y: 440 }, { x0: 850, x1: 1580, y: 440 }], posts: [{ x: 400, top: 300 }, { x: 880, top: 300 }], boat: true, boatHalf: 200 }),
  L({ title: 'Hangbrug',         budget: 340, mats: ['weg', 'hout', 'metaal', 'touw'],platforms: [{ x0: -300, x1: 400, y: 450 }, { x0: 880, x1: 1580, y: 450 }], posts: [{ x: 380, top: 300 }, { x: 900, top: 300 }], boat: true, boatHalf: 230 }),
  L({ title: 'Eilandhoppen',     budget: 320, mats: ['weg', 'hout', 'metaal'],        platforms: [{ x0: -300, x1: 320, y: 440 }, { x0: 470, x1: 560, y: 470 }, { x0: 720, x1: 810, y: 470 }, { x0: 960, x1: 1580, y: 440 }] }),
  L({ title: 'Zware vracht',     budget: 330, mats: ['weg', 'hout', 'metaal'],        platforms: [{ x0: -300, x1: 430, y: 440 }, { x0: 612, x1: 668, y: 540 }, { x0: 850, x1: 1580, y: 440 }], heavy: true }),
  L({ title: 'Hoog en laag',     budget: 330, mats: ['weg', 'hout', 'metaal'],        platforms: [{ x0: -300, x1: 450, y: 400 }, { x0: 620, x1: 690, y: 540 }, { x0: 880, x1: 1580, y: 470 }] }),
  L({ title: 'Wijde kloof',      budget: 390, mats: ['weg', 'hout', 'metaal', 'touw'],platforms: [{ x0: -300, x1: 330, y: 440 }, { x0: 950, x1: 1580, y: 440 }], posts: [{ x: 310, top: 300 }, { x: 970, top: 300 }], boat: true, boatHalf: 300 }),
  L({ title: 'Dubbele toren',    budget: 390, mats: ['weg', 'hout', 'metaal', 'touw'],platforms: [{ x0: -300, x1: 360, y: 450 }, { x0: 620, x1: 690, y: 600 }, { x0: 920, x1: 1580, y: 450 }], posts: [{ x: 340, top: 300 }, { x: 940, top: 300 }] }),
  L({ title: 'Grand Canyon',     budget: 430, mats: ['weg', 'hout', 'metaal', 'touw'],platforms: [{ x0: -300, x1: 320, y: 430 }, { x0: 980, x1: 1580, y: 430 }], posts: [{ x: 300, top: 280 }, { x: 1000, top: 280 }], boat: true, boatHalf: 320 }),
  L({ title: 'Trappenhuis',      budget: 380, mats: ['weg', 'hout', 'metaal'],        platforms: [{ x0: -300, x1: 380, y: 510 }, { x0: 540, x1: 610, y: 470 }, { x0: 740, x1: 810, y: 430 }, { x0: 940, x1: 1580, y: 390 }] }),
  L({ title: 'Mega-vracht',      budget: 470, mats: ['weg', 'hout', 'metaal', 'touw'],platforms: [{ x0: -300, x1: 400, y: 440 }, { x0: 900, x1: 1580, y: 440 }], posts: [{ x: 380, top: 280 }, { x: 920, top: 280 }], heavy: true, boat: true, boatHalf: 240 }),
  L({ title: 'Het ravijn',       budget: 470, mats: ['weg', 'hout', 'metaal', 'touw'],platforms: [{ x0: -300, x1: 340, y: 420 }, { x0: 940, x1: 1580, y: 420 }], posts: [{ x: 320, top: 270 }, { x: 960, top: 270 }], boat: true, boatHalf: 300 }),
  L({ title: 'Meesterbouwer',    budget: 540, mats: ['weg', 'hout', 'metaal', 'touw'],platforms: [{ x0: -300, x1: 300, y: 440 }, { x0: 470, x1: 540, y: 600 }, { x0: 740, x1: 810, y: 600 }, { x0: 1000, x1: 1580, y: 440 }], posts: [{ x: 280, top: 270 }, { x: 1020, top: 270 }], heavy: true }),
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
      engine: null, bodies: null, car: null, t0: 0,
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
      if (S.current.engine) step()
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

  // ── physics opbouwen + testen ──
  function startRun() {
    const st = S.current
    if (st.members.length === 0) { st.flash = 0.4; return }
    const M = Matter
    const engine = M.Engine.create()
    engine.gravity.y = 0
    engine.positionIterations = 26; engine.velocityIterations = 18; engine.constraintIterations = 10
    const world = engine.world
    // ROAD = berijdbaar dek (botst met auto+grond) · SUPPORT = puur structuur (botst nergens)
    const CAT = { TERRAIN: 1, ROAD: 2, SUPPORT: 16, NODE: 4, CAR: 8 }

    st.lv.terrain.forEach(t => M.Composite.add(world, M.Bodies.rectangle(
      t.x + t.w / 2, t.y + t.h / 2, t.w, t.h,
      { isStatic: true, friction: 1, collisionFilter: { category: CAT.TERRAIN, mask: CAT.ROAD | CAT.CAR } })))

    const nodeBodies = st.nodes.map(n => M.Bodies.circle(n.x, n.y, 6, {
      isStatic: n.fixed, density: 0.01, frictionAir: 0.08, collisionFilter: { category: CAT.NODE, mask: 0 } }))
    M.Composite.add(world, nodeBodies)

    const memObjs = st.members.map(mm => {
      const mat = MAT[mm.mat]
      const a = nodeBodies[mm.a].position, b = nodeBodies[mm.b].position
      const len = Math.hypot(a.x - b.x, a.y - b.y)
      if (mat.rope) {
        const con = M.Constraint.create({ bodyA: nodeBodies[mm.a], bodyB: nodeBodies[mm.b], length: len, stiffness: 0.9, damping: 0.06 })
        M.Composite.add(world, con)
        return { rope: true, con, a: mm.a, b: mm.b, rest: len, mat: mm.mat, broken: false }
      }
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, ang = Math.atan2(b.y - a.y, b.x - a.x)
      const cf = mat.drive ? { category: CAT.ROAD, mask: CAT.TERRAIN | CAT.CAR } : { category: CAT.SUPPORT, mask: 0 }
      const body = M.Bodies.rectangle(cx, cy, len, mat.w, {
        angle: ang, density: mat.density, friction: 0.95, frictionAir: 0.02,
        collisionFilter: cf, chamfer: { radius: 3 } })
      const pin = (px, nb) => M.Constraint.create({ bodyA: body, pointA: { x: px, y: 0 }, bodyB: nb, length: 0, stiffness: 1, damping: 0.1 })
      const cons = [pin(-len / 2, nodeBodies[mm.a]), pin(len / 2, nodeBodies[mm.b])]
      M.Composite.add(world, [body, ...cons])
      return { body, cons, a: mm.a, b: mm.b, rest: len, mat: mm.mat, broken: false }
    })

    // voertuig
    const s = st.lv.start, heavy = st.lv.heavy
    const cw = heavy ? 120 : 96, ch = heavy ? 26 : 18, cy0 = s.y - (heavy ? 30 : 24)
    const cd = heavy ? 0.006 : 0.0035
    const chassis = M.Bodies.rectangle(s.x, cy0, cw, ch, { density: cd, friction: 0.5, chamfer: { radius: 6 },
      collisionFilter: { category: CAT.CAR, mask: CAT.TERRAIN | CAT.ROAD } })
    const wr = heavy ? 19 : 16, wb = heavy ? 42 : 34, wy = cy0 + (heavy ? 16 : 12)
    const wopt = { density: heavy ? 0.016 : 0.012, friction: 1.6, frictionStatic: 2.2,
      collisionFilter: { category: CAT.CAR, mask: CAT.TERRAIN | CAT.ROAD } }
    const wA = M.Bodies.circle(s.x - wb, wy, wr, wopt), wB = M.Bodies.circle(s.x + wb, wy, wr, wopt)
    const axle = (w, dx) => M.Constraint.create({ bodyA: chassis, pointA: { x: dx, y: wy - cy0 }, bodyB: w, length: 0, stiffness: 0.85, damping: 0.35 })
    M.Composite.add(world, [chassis, wA, wB, axle(wA, -wb), axle(wB, wb)])

    // GEEN onzichtbare pre-settle meer: de zwaartekracht wordt nu live en
    // geleidelijk opgevoerd (in step), zodat je de brug ziet inzakken/bezwijken.
    engine.gravity.y = 0
    st.engine = engine; st.bodies = { nodeBodies, memObjs, CAT, origY: st.nodes.map(n => n.y) }
    st.car = { chassis, wheels: [wA, wB], wr, heavy }; st.t0 = performance.now()
    st.boat = null; st.boatHit = false
    setMode('run')
  }

  function step() {
    const M = Matter, st = S.current
    const el = performance.now() - st.t0
    // zwaartekracht zacht opvoeren ⇒ je ziet de brug rustig inzakken/bezwijken
    st.engine.gravity.y = Math.min(1, el / 1100)
    // alles in slow-motion: kleinere tijdstap = trager én stabieler
    const SLOW = 0.6
    M.Engine.update(st.engine, 16.666 * SLOW)

    const clampV = (b, mx) => { const v = b.velocity, sp = Math.hypot(v.x, v.y); if (sp > mx) M.Body.setVelocity(b, { x: v.x * mx / sp, y: v.y * mx / sp }) }
    st.bodies.nodeBodies.forEach(b => { if (!b.isStatic) clampV(b, 16) })
    st.bodies.memObjs.forEach(p => { if (!p.broken && !p.rope) clampV(p.body, 16) })

    if (modeRef.current === 'run') {
      // eerst rustig laten settelen (je ziet of de brug houdt), dan pas rijden
      if (el > 1700) {
        const TARGET = st.car.heavy ? 0.30 : 0.36
        st.car.wheels.forEach(w => {
          if (st.car.chassis.velocity.x < 4.5 && w.angularVelocity < TARGET)
            M.Body.setAngularVelocity(w, Math.min(TARGET, w.angularVelocity + 0.03))
        })
        // continue duwkracht zolang hij niet op kruissnelheid is (helpt klimmen)
        if (st.car.chassis.velocity.x < 3)
          M.Body.applyForce(st.car.chassis, { x: st.car.chassis.position.x, y: st.car.chassis.position.y + 10 },
            { x: (st.car.heavy ? 0.0026 : 0.0019) * st.car.chassis.mass, y: 0 })
      }
      // breken bij overbelasting (rek) of — voor de weg — bij te ver doorzakken.
      // Een weg-dek is zwak op zichzelf: zakt een vrije weg-knoop te ver door,
      // dan bezwijkt de weg. Steun je die knoop met hout/metaal, dan blijft hij.
      st.bodies.memObjs.forEach(p => {
        if (p.broken) return
        const a = st.bodies.nodeBodies[p.a].position, b = st.bodies.nodeBodies[p.b].position
        const cur = Math.hypot(a.x - b.x, a.y - b.y)
        let brk = Math.abs(cur - p.rest) / p.rest > MAT[p.mat].break
        if (!brk && MAT[p.mat].sag) {
          const sagA = st.nodes[p.a].fixed ? 0 : a.y - st.bodies.origY[p.a]
          const sagB = st.nodes[p.b].fixed ? 0 : b.y - st.bodies.origY[p.b]
          if (Math.max(sagA, sagB) > MAT[p.mat].sag) brk = true
        }
        if (brk) {
          p.broken = true
          if (p.rope) M.Composite.remove(st.engine.world, p.con)
          else M.Composite.remove(st.engine.world, [p.body, ...p.cons])
        }
      })
      // de boot vaart door de kloof — bouw je te laag, dan ramt hij je brug
      if (st.lv.boat) {
        const bc = st.lv.boat, sail = el - 2200
        if (sail > 0) {
          const pr = sail / 6500
          st.boat = { x: bc.x - bc.half + pr * bc.half * 2, on: pr <= 1, pr }
          if (st.boat.on) {
            const bx = st.boat.x
            for (const p of st.bodies.memObjs) {
              if (p.broken) continue
              const a = st.bodies.nodeBodies[p.a].position, b = st.bodies.nodeBodies[p.b].position
              if (Math.max(a.y, b.y) > bc.top && Math.max(a.x, b.x) > bx - 92 && Math.min(a.x, b.x) < bx + 92) { st.boatHit = true; finish('lose'); break }
            }
          }
        }
      }
      const c = st.car.chassis
      if (c.position.x > st.lv.finishX && c.position.y < st.lv.finishY + 70) finish('win')
      else if (c.position.y > KILL_Y || el > 60000) finish('lose')
    }
  }

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

  function teardown() {
    if (S.current?.engine) { Matter.World.clear(S.current.engine.world, false); Matter.Engine.clear(S.current.engine) }
    if (S.current) { S.current.engine = null; S.current.bodies = null; S.current.car = null }
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

    const lv = st.lv, run = !!st.engine, t = st.tAcc

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

    // ── leden ──
    if (run) {
      st.bodies.memObjs.forEach(p => {
        if (p.broken) return
        const a = st.bodies.nodeBodies[p.a].position, b = st.bodies.nodeBodies[p.b].position
        const cur = Math.hypot(a.x - b.x, a.y - b.y)
        const strain = Math.min(1, Math.abs(cur - p.rest) / p.rest / MAT[p.mat].break)
        drawMember(ctx, a, b, p.mat, strainCol(strain), true)
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

    // knopen
    const nodes = run ? st.bodies.nodeBodies.map((nb, i) => ({ x: nb.position.x, y: nb.position.y, fixed: st.nodes[i].fixed })) : st.nodes
    nodes.forEach(n => peg(ctx, n.x, n.y, n.fixed))

    // truck
    if (st.car) drawTruck(ctx, st.car)

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
      <button style={backBtn} onClick={() => screen === 'play' ? setScreen('select') : onBack()}>← {screen === 'play' ? 'Levels' : 'Menu'}</button>
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
function drawTruck(ctx, car) {
  const c = car.chassis
  ctx.save(); ctx.translate(c.position.x, c.position.y); ctx.rotate(c.angle)
  const w = car.heavy ? 122 : 98, h = car.heavy ? 26 : 19
  const body = car.heavy ? ['#3f7fd6', '#2c63b0'] : ['#ec4b4b', '#c22f2f']
  // onderstel-schaduw
  ctx.fillStyle = 'rgba(0,0,0,.22)'; roundRect(ctx, -w / 2, h / 2 - 3, w, 7, 4); ctx.fill()
  // carrosserie met gradient
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2)
  g.addColorStop(0, body[0]); g.addColorStop(1, body[1])
  ctx.fillStyle = g; roundRect(ctx, -w / 2, -h / 2, w, h, 7); ctx.fill()
  // cabine
  const cabW = car.heavy ? 34 : 28
  ctx.fillStyle = body[1]; roundRect(ctx, w / 2 - cabW - 4, -h / 2 - 12, cabW, 14, 5); ctx.fill()
  // raam
  const win = ctx.createLinearGradient(0, -h / 2 - 12, 0, -h / 2)
  win.addColorStop(0, '#dff1ff'); win.addColorStop(1, '#9cc8f0')
  ctx.fillStyle = win; roundRect(ctx, w / 2 - cabW, -h / 2 - 9, cabW - 8, 11, 3); ctx.fill()
  // glans-streep
  ctx.fillStyle = 'rgba(255,255,255,.35)'; roundRect(ctx, -w / 2 + 5, -h / 2 + 3, w - cabW - 12, 4, 2); ctx.fill()
  // koplamp + lading
  ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(w / 2 - 2, h / 2 - 7, 3, 0, 7); ctx.fill()
  ctx.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 3; i++) ctx.fillRect(-w / 2 + 10 + i * 16, -h / 2 + 4, 10, h - 8)
  ctx.restore()
  car.wheels.forEach(w2 => {
    ctx.save(); ctx.translate(w2.position.x, w2.position.y); ctx.rotate(w2.angle)
    ctx.fillStyle = '#15171b'; ctx.beginPath(); ctx.arc(0, 0, car.wr, 0, 7); ctx.fill()
    ctx.fillStyle = '#2b2f36'; ctx.beginPath(); ctx.arc(0, 0, car.wr * 0.92, 0, 7); ctx.fill()
    const hub = ctx.createRadialGradient(-2, -2, 1, 0, 0, car.wr * 0.5)
    hub.addColorStop(0, '#e8eef6'); hub.addColorStop(1, '#8a93a0')
    ctx.fillStyle = hub; ctx.beginPath(); ctx.arc(0, 0, car.wr * 0.42, 0, 7); ctx.fill()
    ctx.strokeStyle = 'rgba(60,66,76,.9)'; ctx.lineWidth = 2
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * car.wr * 0.4, Math.sin(a) * car.wr * 0.4); ctx.stroke() }
    ctx.restore()
  })
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
