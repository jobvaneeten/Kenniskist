import { useEffect, useRef, useState } from 'react'
import OrientationGate from '../OrientationGate'
import { TerugKnop } from '../ui/index.jsx'
import { VW, VH, SNAP, STEP_MS, MAT, LEVELS, TIPS, initialBuild, buildCost, insideTerrain, createSim, stepSim } from './brugPhysics'

// ═══════════════════════════════════════════════════════════════════════════
//  BRUG BOUWEN — bouw een brug, de truck rijdt eroverheen. Levels + physics
//  staan in brugPhysics.js (headless getest met tools/brugTest.js).
// ═══════════════════════════════════════════════════════════════════════════

const HIT = 34          // aanklik-straal knoop (wereld-px)

// ── progressie ──
// Versie bumpen ⇒ gewijzigde budgetten: sterren vervallen, vrijgespeelde levels blijven.
const PROG_VERSION = 4
function loadProg() {
  try {
    const d = JSON.parse(localStorage.getItem('kk_brug') || '{}')
    if (d.v !== PROG_VERSION) { const r = { v: PROG_VERSION, unlocked: Math.min(LEVELS.length, d.unlocked || 1), stars: {} }; saveProg(r); return r }
    return d
  } catch { return { v: PROG_VERSION, unlocked: 1, stars: {} } }
}
function saveProg(d) { localStorage.setItem('kk_brug', JSON.stringify({ ...d, v: PROG_VERSION })) }

export default function BrugBouwen({ onBack, reward = false }) {
  const REWARD_LEVELS = 3   // aantal levels in beloning-modus voordat je terugkeert
  const canvasRef = useRef(null)
  const S = useRef(null)
  const [screen, setScreen] = useState('select')   // select | play
  const [levelIdx, setLevelIdx] = useState(0)
  const [mode, setMode] = useState('build')         // build | run | win | lose
  const [mat, setMat] = useState('weg')
  const [budget, setBudget] = useState(0)
  const [prog, setProg] = useState(loadProg())
  const [stars, setStars] = useState(0)
  const [loseReason, setLoseReason] = useState(null)
  const [rewardWon, setRewardWon] = useState([])     // gewonnen levels in beloning-modus
  const matRef = useRef(mat); matRef.current = mat
  const modeRef = useRef(mode); modeRef.current = mode

  // ── level laden ──
  function loadLevel(idx) {
    const lv = LEVELS[idx]
    const { nodes, members, base } = initialBuild(lv)
    S.current = {
      ...S.current, lv, idx, nodes, members, base,
      drag: null, flash: 0, lp: null, lpTimer: null, pan: null, pinch: null,
      cam: { z: 1, tx: 0, ty: 0 },   // camera reset: pan (tx,ty in schermpx) + zoom (z)
      sim: null, acc: 0, fx: [], shake: 0,
    }
    S.current.resize?.()   // view herberekenen voor de zoom van dit level
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
    if (!S.current) S.current = { lv: LEVELS[0], nodes: [], members: [], base: 0, view: { scale: 1, ox: 0, oy: 0 } }
    S.current.ctx = ctx
    if (!S.current.cam) S.current.cam = { z: 1, tx: 0, ty: 0 }
    S.current.ptrs = new Map()   // actieve pointers (voor pinch-zoom)

    function resize() {
      const r = cv.parentElement.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = Math.floor(r.width * dpr); cv.height = Math.floor(r.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const W = S.current.lv?.worldW || VW, H = S.current.lv?.worldH || VH
      const scale = Math.min(r.width / W, r.height / H)
      S.current.view = { scale, ox: (r.width - W * scale) / 2, oy: (r.height - H * scale) / 2, cssW: r.width, cssH: r.height, W, H }
      clampCam()
    }
    S.current.resize = resize
    resize(); window.addEventListener('resize', resize)

    // camera: effectieve schaal = view.scale * cam.z, met pan-offset cam.tx/ty (schermpx)
    const toWorld = e => {
      const r = cv.getBoundingClientRect(), v = S.current.view, c = S.current.cam
      const s = v.scale * c.z
      return { x: (e.clientX - r.left - v.ox - c.tx) / s, y: (e.clientY - r.top - v.oy - c.ty) / s }
    }
    function clampCam() {
      const c = S.current.cam, v = S.current.view; if (!v) return
      const s = v.scale * c.z, wsW = v.W * s, wsH = v.H * s
      const mX = v.cssW * 0.3, mY = v.cssH * 0.3
      const minTx = (v.cssW - v.ox - wsW) - mX, maxTx = -v.ox + mX
      const minTy = (v.cssH - v.oy - wsH) - mY, maxTy = -v.oy + mY
      c.tx = minTx > maxTx ? 0 : Math.max(minTx, Math.min(maxTx, c.tx))
      c.ty = minTy > maxTy ? 0 : Math.max(minTy, Math.min(maxTy, c.ty))
    }
    function zoomAt(mx, my, f) {
      const c = S.current.cam, v = S.current.view
      const nz = Math.max(1, Math.min(3.5, c.z * f))
      const s = v.scale * c.z, s2 = v.scale * nz
      const wx = (mx - v.ox - c.tx) / s, wy = (my - v.oy - c.ty) / s
      c.tx = mx - v.ox - wx * s2; c.ty = my - v.oy - wy * s2; c.z = nz
      clampCam()
    }
    function onWheel(e) {
      e.preventDefault()
      const r = cv.getBoundingClientRect()
      zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12)
    }
    const nearestNode = p => {
      let bi = -1, bd = HIT * HIT
      S.current.nodes.forEach((n, i) => { const d = (n.x - p.x) ** 2 + (n.y - p.y) ** 2; if (d < bd) { bd = d; bi = i } })
      return bi
    }
    const nearestMember = p => {
      let bi = -1, bd = 16
      S.current.members.forEach((m, i) => {
        if (m.pre) return                              // voorgebouwde stukken kun je niet wissen
        const a = S.current.nodes[m.a], b = S.current.nodes[m.b]
        const d = segDist(p.x, p.y, a.x, a.y, b.x, b.y)
        if (d < bd) { bd = d; bi = i }
      })
      return bi
    }
    function sync() { setBudget(S.current.lv.budget - buildCost(S.current.members)) }

    // losse knopen zonder balk opruimen (vaste knopen blijven)
    function rebuild() {
      const used = new Set()
      S.current.members.forEach(m => { used.add(m.a); used.add(m.b) })
      const keep = [], map = {}
      S.current.nodes.forEach((n, i) => { if (i < S.current.base || used.has(i)) { map[i] = keep.length; keep.push(n) } })
      S.current.nodes = keep
      S.current.members = S.current.members.map(m => ({ ...m, a: map[m.a], b: map[m.b] }))
    }

    // waar komt het eind van de balk die je sleept? (bestaande knoop of rasterpunt)
    function target(from, p) {
      const st = S.current, m = MAT[matRef.current], a = st.nodes[from]
      let j = nearestNode(p), x, y
      if (j >= 0 && j !== from) { x = st.nodes[j].x; y = st.nodes[j].y }
      else { j = -1; x = Math.round(p.x / SNAP) * SNAP; y = Math.round(p.y / SNAP) * SNAP }
      const len = Math.hypot(a.x - x, a.y - y)
      const W = st.lv.worldW, H = st.lv.worldH
      let ok = len <= m.maxLen && len >= 12 && st.lv.budget - buildCost(st.members) >= m.cost
      if (j < 0 && (y < 20 || y > H - 40 || x < -280 || x > W + 280 || insideTerrain(st.lv, x, y))) ok = false
      if (j >= 0 && st.members.some(q => (q.a === from && q.b === j) || (q.a === j && q.b === from))) ok = false
      return { j, x, y, ok }
    }

    const dist2 = () => { const a = [...S.current.ptrs.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) }
    function onDown(e) {
      S.current.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
      // tweede vinger → pinch-zoom: stop bouwen/pannen
      if (S.current.ptrs.size === 2) {
        S.current.drag = null; S.current.pan = null
        if (S.current.lpTimer) { clearTimeout(S.current.lpTimer); S.current.lpTimer = null }
        S.current.lp = null; S.current.pinch = { d: dist2() }
        return
      }
      const p = toWorld(e)
      if (modeRef.current === 'build') {
        const i = nearestNode(p)
        if (i >= 0) { S.current.drag = { from: i, ...target(i, p) }; return }
        const mi = nearestMember(p)
        if (mi >= 0) {
          S.current.lp = { x: e.clientX, y: e.clientY }
          S.current.lpTimer = setTimeout(() => {
            S.current.members.splice(mi, 1); rebuild(); sync(); S.current.lp = null; S.current.lpTimer = null
          }, 420)
          return
        }
      }
      // lege plek (of run-modus) → rondkijken door te slepen
      S.current.pan = { sx: e.clientX, sy: e.clientY, tx: S.current.cam.tx, ty: S.current.cam.ty }
    }
    function onMove(e) {
      if (S.current.ptrs.has(e.pointerId)) S.current.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (S.current.pinch && S.current.ptrs.size >= 2) {
        const r = cv.getBoundingClientRect(), a = [...S.current.ptrs.values()]
        const d = dist2(), mx = (a[0].x + a[1].x) / 2 - r.left, my = (a[0].y + a[1].y) / 2 - r.top
        if (S.current.pinch.d > 0) zoomAt(mx, my, d / S.current.pinch.d)
        S.current.pinch.d = d
        return
      }
      if (S.current.pan) {
        S.current.cam.tx = S.current.pan.tx + (e.clientX - S.current.pan.sx)
        S.current.cam.ty = S.current.pan.ty + (e.clientY - S.current.pan.sy)
        clampCam(); return
      }
      if (S.current.lp && Math.hypot(e.clientX - S.current.lp.x, e.clientY - S.current.lp.y) > 10) {
        clearTimeout(S.current.lpTimer); S.current.lp = null; S.current.lpTimer = null
      }
      if (!S.current.drag) return
      S.current.drag = { from: S.current.drag.from, ...target(S.current.drag.from, toWorld(e)) }
    }
    function onUp(e) {
      S.current.ptrs.delete(e.pointerId)
      if (S.current.ptrs.size < 2) S.current.pinch = null
      if (S.current.pan) { S.current.pan = null; return }
      if (S.current.lpTimer) { clearTimeout(S.current.lpTimer); S.current.lpTimer = null }
      S.current.lp = null
      const d = S.current.drag; S.current.drag = null
      if (!d || modeRef.current !== 'build') return
      const t = target(d.from, toWorld(e))
      if (t.j < 0 && Math.hypot(t.x - S.current.nodes[d.from].x, t.y - S.current.nodes[d.from].y) < 12) return   // gewoon getikt
      if (!t.ok) { S.current.flash = 0.4; return }
      let j = t.j
      if (j < 0) { S.current.nodes.push({ x: t.x, y: t.y, fixed: false }); j = S.current.nodes.length - 1 }
      S.current.members.push({ a: d.from, b: j, mat: matRef.current })
      sync()
    }
    S.current.rebuild = rebuild; S.current.sync = sync

    cv.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    cv.addEventListener('wheel', onWheel, { passive: false })

    // vaste physics-tijdstap (60/s), los van de schermverversing (60/120/144 Hz)
    let raf, last = performance.now()
    function frame(now) {
      const dt = Math.min(100, now - last); last = now
      const st = S.current
      if (st.sim && !st.sim.result) {
        st.acc += dt
        let n = 0
        while (st.acc >= STEP_MS && n++ < 5) {
          st.acc -= STEP_MS
          if (stepSim(st.sim)) { finish(st.sim); break }
        }
        if (st.acc > STEP_MS) st.acc = 0
      }
      draw(dt / 1000)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf); window.removeEventListener('resize', resize)
      cv.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      cv.removeEventListener('wheel', onWheel)
      teardown()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── beloning-modus: start meteen in level 1, geen level-keuze ──
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (reward) loadLevel(0)
  }, [reward])

  function startRun() {
    const st = S.current
    st.drag = null
    st.sim = createSim(st.lv, st.nodes, st.members)
    st.acc = 0
    setMode('run')
  }

  function teardown() { if (S.current) S.current.sim = null }

  function finish(sim) {
    if (modeRef.current !== 'run') return
    if (sim.result === 'lose') {
      setLoseReason(sim.reason === 'vast' ? 'vast' : sim.anyBroken ? 'brak' : 'water')
      setMode('lose'); return
    }
    const idx = S.current.idx
    const ratio = buildCost(S.current.members) / S.current.lv.budget
    const st3 = ratio <= 0.6 ? 3 : ratio <= 0.85 ? 2 : 1
    setStars(st3)
    const p = { ...loadProg() }
    p.unlocked = Math.max(p.unlocked || 1, Math.min(LEVELS.length, idx + 2))
    p.stars = { ...(p.stars || {}), [idx]: Math.max((p.stars || {})[idx] || 0, st3) }
    saveProg(p); setProg(p)
    fireworks(S.current.fx || (S.current.fx = []), S.current.lv.finishX, S.current.lv.finishY)
    if (reward) setRewardWon(w => w.includes(idx) ? w : [...w, idx])
    setMode('win')
  }

  function backToBuild() { teardown(); setMode('build') }
  function wisLaatste() {
    const ms = S.current.members
    for (let i = ms.length - 1; i >= 0; i--) if (!ms[i].pre) { ms.splice(i, 1); break }
    S.current.rebuild(); S.current.sync()
  }
  function leeg() {
    S.current.members = S.current.members.filter(m => m.pre)
    S.current.nodes.length = S.current.base
    S.current.sync()
  }

  // ═══ TEKENEN ═══════════════════════════════════════════════════════════════
  function draw(dt) {
    const st = S.current; if (!st) return
    const { ctx, view } = st
    if (st.flash > 0) st.flash = Math.max(0, st.flash - dt)
    st.tAcc = (st.tAcc || 0) + dt
    const W = view.W || VW, H = view.H || VH
    const cam = st.cam || { z: 1, tx: 0, ty: 0 }
    const lv = st.lv, sim = st.sim, t = st.tAcc
    if (!st.fx) st.fx = []

    // effecten uit de simulatie: brekende balken → vonken + schok, truck in het water → plons
    if (sim) {
      sim.beams.forEach(p => {
        if (!p.broken || p._fx) return
        p._fx = true
        const a = sim.pts[p.a], b = sim.pts[p.b]
        sparks(st.fx, (a.x + b.x) / 2, (a.y + b.y) / 2, 26, ['#ffd23f', '#ff8a3d', '#fff'])
        st.shake = Math.max(st.shake || 0, 9)
      })
      const wl = sim.pts[sim.car.wl]
      if (!sim._plons && wl.y > lv.waterY) {
        sim._plons = true
        splash(st.fx, wl.x, lv.waterY)
        st.shake = Math.max(st.shake || 0, 12)
      }
    }
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dt * 30)
    const sh = st.shake || 0

    ctx.save(); ctx.fillStyle = '#07061a'; ctx.fillRect(0, 0, view.cssW, view.cssH)
    ctx.translate(view.ox + cam.tx + (Math.random() - .5) * sh, view.oy + cam.ty + (Math.random() - .5) * sh)
    ctx.scale(view.scale * cam.z, view.scale * cam.z)
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip()

    // stilstaande achtergrond (lucht, sterren, synthwave-zon, bergen, stad) één keer per level
    if (!st.bg || st.bg.lv !== lv) st.bg = { lv, cv: makeBackdrop(lv, W, H) }
    ctx.drawImage(st.bg.cv, 0, 0, W, H)

    // twinkelende sterren
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 26; i++) {
      const sx = (i * 397.3) % W, sy = (i * 131.7) % (H * 0.45)
      const a = 0.35 + 0.65 * Math.max(0, Math.sin(t * (0.8 + (i % 5) * 0.3) + i * 2.1))
      ctx.fillStyle = `rgba(200,220,255,${a * 0.9})`
      ctx.beginPath(); ctx.arc(sx, sy, 1.6, 0, 7); ctx.fill()
      if (a > 0.85) { ctx.fillStyle = `rgba(160,200,255,${(a - 0.85) * 1.6})`; ctx.fillRect(sx - 6, sy - .5, 12, 1); ctx.fillRect(sx - .5, sy - 6, 1, 12) }
    }
    // vallende ster
    const fs = (t * 0.12) % 1
    if (fs < 0.12) {
      const p = fs / 0.12, fx = W * 0.15 + p * W * 0.35, fy = 60 + p * 120
      const g = ctx.createLinearGradient(fx - 90, fy - 30, fx, fy)
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(255,255,255,${0.9 * (1 - p)})`)
      ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx - 90, fy - 30); ctx.lineTo(fx, fy); ctx.stroke()
    }
    ctx.restore()

    // bouwraster (blueprint)
    if (!sim) {
      ctx.strokeStyle = 'rgba(56,189,248,.075)'; ctx.lineWidth = 1
      for (let x = 0; x <= W; x += SNAP * 2) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 0; y <= H; y += SNAP * 2) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    }

    drawWater(ctx, lv.waterY, W, H, t)

    // terrein
    lv.terrain.forEach(tr => drawTerrain(ctx, tr, t))
    lv.ramps.forEach(rm => drawRamp(ctx, rm, t))
    lv.floatAnchors.forEach(fa => balloonAnchor(ctx, fa.x, fa.y, t))
    finishGate(ctx, lv.finishX + 6, lv.finishY, t)

    // ── balken: tijdens de rit gekleurd naar belasting (groen → rood) ──
    if (sim) {
      sim.beams.forEach(p => {
        if (p.broken || p.car) return
        const a = sim.pts[p.a], b = sim.pts[p.b]
        drawMember(ctx, a, b, p.mat, strainCol(Math.min(1, Math.abs(p.force) / MAT[p.mat].strength)))
      })
    } else {
      st.members.forEach(m => drawMember(ctx, st.nodes[m.a], st.nodes[m.b], m.mat, null))
    }

    // sleep-voorbeeld: precies waar de balk komt (raster/knoop), rood = kan niet
    if (st.drag && !sim) {
      const a = st.nodes[st.drag.from], m = MAT[matRef.current], d = st.drag
      ctx.save(); ctx.setLineDash([8, 8]); ctx.lineDashOffset = -t * 30
      ctx.beginPath(); ctx.arc(a.x, a.y, m.maxLen, 0, 7)
      ctx.strokeStyle = 'rgba(56,189,248,.35)'; ctx.lineWidth = 2; ctx.stroke()
      ctx.restore()
      neonLine(ctx, a.x, a.y, d.x, d.y, d.ok ? '#4ade80' : '#fb7185', m.w * 0.7, 1)
      if (d.j < 0) ring(ctx, d.x, d.y, 9, d.ok ? '#4ade80' : '#fb7185', t)
    }

    // knopen (tijdens de rit alleen de brug-knopen, niet de auto-punten)
    const nodes = sim ? sim.pts.slice(0, sim.car.base) : st.nodes
    nodes.forEach(n => peg(ctx, n.x, n.y, n.fixed, t))

    if (sim) drawTruck(ctx, sim)

    // deeltjes
    stepFx(ctx, st.fx, dt)

    if (st.flash > 0) { ctx.fillStyle = `rgba(251,113,133,${st.flash * 0.45})`; ctx.fillRect(0, 0, W, H) }
    ctx.restore()

    // vignet over het hele scherm
    if (!st.vig || st.vig.w !== view.cssW || st.vig.h !== view.cssH) {
      const g = ctx.createRadialGradient(view.cssW / 2, view.cssH / 2, Math.min(view.cssW, view.cssH) * 0.35, view.cssW / 2, view.cssH / 2, Math.max(view.cssW, view.cssH) * 0.75)
      g.addColorStop(0, 'rgba(7,6,26,0)'); g.addColorStop(1, 'rgba(7,6,26,.55)')
      st.vig = { w: view.cssW, h: view.cssH, g }
    }
    ctx.fillStyle = st.vig.g; ctx.fillRect(0, 0, view.cssW, view.cssH)
  }

  // ═══ UI ════════════════════════════════════════════════════════════════════
  const lv = LEVELS[levelIdx]
  const unlocked = prog.unlocked || 1
  const rewardWins = rewardWon.length
  const totalStars = Object.values(prog.stars || {}).reduce((s, n) => s + n, 0)
  const LOSE = {
    brak:  'Er brak een balk. Maak je brug sterker: meer driehoeken, of metaal waar het rood werd.',
    water: 'De truck viel in het water. Loopt je weg wel helemaal door tot de overkant?',
    vast:  'De truck kwam niet verder. Is je weg te steil, of zit er een bult of gat in?',
  }

  return (
    <div style={wrap}>
      <TerugKnop style={{ zIndex: 9999 }} onClick={() => { if (reward) { teardown(); onBack() } else if (screen === 'play') { teardown(); setMode('build'); setScreen('select') } else onBack() }}>{reward ? 'Stoppen' : 'Terug'}</TerugKnop>
      <div style={{ position: 'absolute', inset: 0 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }} />
      </div>

      {screen === 'play' && (
        <>
          <div style={hudTop}>
            <span style={badge}>
              <span style={lvlNum}>{levelIdx + 1}</span>
              <span style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>{lv.title}</span>
              {lv.heavy && <span style={heavyTag}>zware truck</span>}
            </span>
            <span style={{ ...badge, ...budgetBadge, ...(budget < 0 ? { color: '#fb7185' } : {}) }}><Munt />{budget}</span>
          </div>

          {mode === 'build' && (
            <>
              <div style={matBar}>
                {lv.mats.map(k => {
                  const on = mat === k, c = NEON[k]
                  return (
                    <button key={k} onClick={() => setMat(k)}
                      style={{ ...matBtn, borderColor: on ? c : 'rgba(255,255,255,.12)', ...(on ? { boxShadow: `0 0 0 1px ${c} inset, 0 0 22px ${c}66`, transform: 'translateX(4px)', background: 'rgba(26,23,51,.92)' } : {}) }}>
                      <span style={{ ...swatch, ...SWATCH[k] }} />
                      <span style={{ fontFamily: 'var(--kk-head)', fontSize: 14, fontWeight: 800, color: on ? c : '#fff', textTransform: 'uppercase', letterSpacing: '.05em', lineHeight: 1 }}>{MAT[k].name}</span>
                      <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,.62)', lineHeight: 1.15 }}>{MAT[k].desc}</span>
                      <span style={{ fontSize: 12, color: '#ffd23f', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}><Munt s={11} />{MAT[k].cost}</span>
                    </button>
                  )
                })}
              </div>
              <div style={hudBottom}>
                <button style={ghost} onClick={leeg} title="Alles wissen">Wis alles</button>
                <button style={ghost} onClick={wisLaatste} title="Laatste balk weg">↩</button>
                <button style={primary} onClick={startRun}>▶ Test!</button>
              </div>
            </>
          )}
          {mode === 'run' && (
            <div style={hudBottom}><button style={ghost} onClick={backToBuild}>↺ Stop &amp; aanpassen</button></div>
          )}
          {(mode === 'win' || mode === 'lose') && (
            <div style={overlay}>
              <div style={{ ...card, borderColor: mode === 'win' ? 'rgba(74,222,128,.45)' : 'rgba(251,113,133,.45)', boxShadow: `0 0 60px ${mode === 'win' ? 'rgba(74,222,128,.22)' : 'rgba(251,113,133,.22)'}, 0 20px 50px rgba(0,0,0,.5)` }}>
                <div style={{ ...bigTitle, color: mode === 'win' ? '#4ade80' : '#fb7185', textShadow: `0 0 24px ${mode === 'win' ? 'rgba(74,222,128,.7)' : 'rgba(251,113,133,.7)'}` }}>
                  {mode === 'win' ? 'Gehaald!' : 'Ingestort!'}
                </div>
                {mode === 'win' && (
                  <div style={{ display: 'flex', gap: 10, margin: '6px 0 2px' }}>
                    {[0, 1, 2].map(i => <Ster key={i} aan={i < stars} d={i * 0.18} />)}
                  </div>
                )}
                {mode === 'win' && stars < 3 && <div style={{ color: 'rgba(255,255,255,.72)', fontSize: 14 }}>Meer sterren? Bouw goedkoper: ★★★ = hooguit {Math.floor(lv.budget * 0.6)} munten.</div>}
                {mode === 'win' && reward && <div style={{ color: '#ffd23f', fontWeight: 800, marginTop: 2 }}>Level {Math.min(rewardWins, REWARD_LEVELS)} van {REWARD_LEVELS} gehaald</div>}
                <div style={{ color: '#fff', marginTop: 6, maxWidth: 440, fontSize: 16 }}>
                  {mode === 'win' ? 'De truck is veilig overgestoken!' : LOSE[loseReason] || LOSE.water}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button style={mode === 'lose' ? primary : ghost} onClick={backToBuild}>Aanpassen</button>
                  {mode === 'lose' && <button style={ghost} onClick={() => { leeg(); backToBuild() }}>Opnieuw beginnen</button>}
                  {mode === 'win' && reward && rewardWins >= REWARD_LEVELS && <button style={primary} onClick={() => { teardown(); onBack() }}>Klaar! ✓</button>}
                  {mode === 'win' && (!reward || rewardWins < REWARD_LEVELS) && levelIdx + 1 < LEVELS.length && <button style={primary} onClick={() => loadLevel(levelIdx + 1)}>Volgende →</button>}
                  {mode === 'win' && !reward && levelIdx + 1 >= LEVELS.length && <button style={primary} onClick={() => { teardown(); setMode('build'); setScreen('select') }}>Alle levels ✓</button>}
                </div>
              </div>
            </div>
          )}
          {mode === 'build' && <div style={hint}><b style={{ color: '#38bdf8' }}>TIP</b> {TIPS[lv.kind]}<br /><span style={{ opacity: .7 }}>Sleep vanaf een knoop om een balk te leggen · houd een balk vast om te wissen · sleep een lege plek om rond te kijken, scroll of knijp om te zoomen</span></div>}
        </>
      )}

      {screen === 'select' && (
        <div style={selectWrap}>
          <div style={kicker}>Bouw · Test · Rij</div>
          <div style={titleStyle}>Brug Bouwen</div>
          <div style={{ color: 'rgba(255,255,255,.72)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            Kies een level <span style={starPill}>★ {totalStars} / {LEVELS.length * 3}</span>
          </div>
          <div style={grid}>
            {LEVELS.map((L2, i) => {
              const lockd = i + 1 > unlocked
              const s = (prog.stars || {})[i] || 0
              const next = !lockd && i + 1 === unlocked && !s
              return (
                <button key={i} disabled={lockd} onClick={() => loadLevel(i)}
                  style={{ ...cell, ...(s === 3 ? cellGold : {}), ...(next ? cellNext : {}), ...(lockd ? cellLock : {}) }}>
                  <span style={{ fontFamily: 'var(--kk-head)', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{lockd ? <Slot /> : i + 1}</span>
                  <span style={{ fontSize: 11.5, opacity: .8, lineHeight: 1.15 }}>{L2.title}</span>
                  {!lockd && <span style={{ fontSize: 14, letterSpacing: 3 }}>
                    <span style={{ color: '#ffd23f', textShadow: '0 0 8px rgba(255,210,63,.7)' }}>{'★'.repeat(s)}</span>
                    <span style={{ color: 'rgba(255,255,255,.18)' }}>{'★'.repeat(3 - s)}</span>
                  </span>}
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

// ═══ kleine UI-onderdelen ════════════════════════════════════════════════════
function Munt({ s = 14 }) {
  return <span style={{ width: s, height: s, borderRadius: '50%', display: 'inline-block', flex: 'none', background: 'radial-gradient(circle at 35% 30%, #fff3b0, #ffd23f 45%, #c98a00)', boxShadow: '0 0 8px rgba(255,210,63,.6)' }} />
}
function Slot() {
  return <svg width="20" height="22" viewBox="0 0 20 22" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="2" y="9" width="16" height="11" rx="3" /><path d="M6 9V6a4 4 0 0 1 8 0v3" /></svg>
}
function Ster({ aan, d }) {
  return <span style={{ fontSize: 46, lineHeight: 1, color: aan ? '#ffd23f' : 'rgba(255,255,255,.14)', textShadow: aan ? '0 0 22px rgba(255,210,63,.85)' : 'none', animation: aan ? `brugSter .5s ${d}s both cubic-bezier(.3,1.6,.5,1)` : 'none' }}>★</span>
}

// ═══ teken-helpers ═══════════════════════════════════════════════════════════
// neon-kleur per materiaal
const NEON = { weg: '#38bdf8', hout: '#ffb020', metaal: '#c4b5fd', touw: '#ff2f8e' }

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }

function strainCol(r) {
  // 0 = groen, 0.5 = geel, 1 = rood
  if (r < 0.5) { const k = r / 0.5; return `rgb(${Math.round(74 + k * 176)},${Math.round(222 - k * 18)},${Math.round(128 - k * 107)})` }
  const k = (r - 0.5) / 0.5
  return `rgb(${Math.round(250 + k * 1)},${Math.round(204 - k * 91)},${Math.round(21 + k * 112)})`
}

// zachte gloed + heldere kern (additief, geen shadowBlur: blijft snel op tablets)
function neonLine(ctx, ax, ay, bx, by, col, w, a = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = col
  ctx.globalAlpha = 0.10 * a; ctx.lineWidth = w + 16; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke()
  ctx.globalAlpha = 0.22 * a; ctx.lineWidth = w + 7; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke()
  ctx.globalAlpha = 0.9 * a; ctx.lineWidth = Math.max(1.5, w * 0.35); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke()
  ctx.restore()
}
function glowDot(ctx, x, y, r, col, a = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill()
  ctx.restore()
}
function ring(ctx, x, y, r, col, t) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = col
  ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 8); ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.restore()
}

function drawMember(ctx, a, b, matKey, runCol) {
  const m = MAT[matKey], col = runCol || NEON[matKey]
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1
  const nx = -dy / len, ny = dx / len
  ctx.lineCap = 'round'
  if (m.rope) {
    // touw: dunne neonkabel
    neonLine(ctx, a.x, a.y, b.x, b.y, col, m.w + 1, 1)
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
    return
  }
  // donkere kern met lichte rand-gloed
  neonLine(ctx, a.x, a.y, b.x, b.y, col, m.w, runCol ? 0.9 : 0.55)
  ctx.strokeStyle = '#05040f'; ctx.lineWidth = m.w + 3
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  const core = { weg: ['#262a40', '#141627'], hout: ['#4a3216', '#2a1b0b'], metaal: ['#3a3466', '#1f1b3d'] }[matKey] || ['#222', '#111']
  const g = ctx.createLinearGradient(a.x + nx * m.w / 2, a.y + ny * m.w / 2, a.x - nx * m.w / 2, a.y - ny * m.w / 2)
  g.addColorStop(0, core[0]); g.addColorStop(1, core[1])
  ctx.strokeStyle = g; ctx.lineWidth = m.w
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  // twee neon-randen langs de balk
  const k = m.w * 0.36
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.95
  ctx.beginPath(); ctx.moveTo(a.x + nx * k, a.y + ny * k); ctx.lineTo(b.x + nx * k, b.y + ny * k); ctx.stroke()
  ctx.globalAlpha = 0.45
  ctx.beginPath(); ctx.moveTo(a.x - nx * k, a.y - ny * k); ctx.lineTo(b.x - nx * k, b.y - ny * k); ctx.stroke()
  ctx.restore()
  // materiaal-detail
  if (matKey === 'weg') {             // gouden streeplijn
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = 'rgba(255,210,63,.85)'; ctx.lineWidth = 2; ctx.setLineDash([9, 9])
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore()
  } else if (matKey === 'hout') {     // gloeiende plankjes
    ctx.strokeStyle = 'rgba(255,176,32,.35)'; ctx.lineWidth = 1.3
    for (let s = 14; s < len - 6; s += 15) { const px = a.x + dx * s / len, py = a.y + dy * s / len; ctx.beginPath(); ctx.moveTo(px + nx * m.w * 0.3, py + ny * m.w * 0.3); ctx.lineTo(px - nx * m.w * 0.3, py - ny * m.w * 0.3); ctx.stroke() }
  } else if (matKey === 'metaal') {   // vakwerk-kruisjes + klinknagels
    ctx.strokeStyle = 'rgba(196,181,253,.35)'; ctx.lineWidth = 1.2
    const q = m.w * 0.3
    for (let s = 10; s < len - 10; s += 14) {
      const px = a.x + dx * s / len, py = a.y + dy * s / len, ex = dx / len * 7, ey = dy / len * 7
      ctx.beginPath(); ctx.moveTo(px + nx * q, py + ny * q); ctx.lineTo(px + ex - nx * q, py + ey - ny * q); ctx.stroke()
    }
    for (const tt of [0.1, 0.9]) glowDot(ctx, a.x + dx * tt, a.y + dy * tt, 5, '#e9e4ff', 0.9)
  }
}
function peg(ctx, x, y, fixed, t) {
  const col = fixed ? '#ffd23f' : '#38bdf8', r = fixed ? 7.5 : 5.5
  glowDot(ctx, x, y, r * 3, col, fixed ? 0.35 + 0.1 * Math.sin(t * 3 + x) : 0.3)
  ctx.fillStyle = '#0b0a1a'; ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, 7); ctx.fill()
  ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke()
  ctx.fillStyle = fixed ? '#fff3b0' : '#cdeffe'; ctx.beginPath(); ctx.arc(x, y, fixed ? 2.6 : 2, 0, 7); ctx.fill()
}

// ── achtergrond (één keer per level getekend) ──
function makeBackdrop(lv, W, H) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const ctx = cv.getContext('2d'), R = rng(7 + lv.title.length * 13 + W + lv.waterY)
  const hy = Math.min(H - 250, lv.waterY - 110)   // horizon
  // nachtlucht
  const sky = ctx.createLinearGradient(0, 0, 0, lv.waterY)
  sky.addColorStop(0, '#07061a'); sky.addColorStop(0.45, '#160f3d'); sky.addColorStop(0.8, '#3a1660'); sky.addColorStop(1, '#6a1d6e')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
  // nevel
  for (const [nx, ny, nr, c] of [[W * 0.2, H * 0.22, 380, 'rgba(124,58,237,.16)'], [W * 0.78, H * 0.15, 320, 'rgba(56,189,248,.10)'], [W * 0.5, hy, 520, 'rgba(255,47,142,.14)']]) {
    const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  }
  // sterren
  for (let i = 0; i < W * 0.14; i++) {
    const x = R() * W, y = R() * hy * 0.95, s = R()
    ctx.fillStyle = `rgba(255,255,255,${0.25 + s * 0.6})`
    ctx.fillRect(x, y, s > 0.9 ? 2 : 1.2, s > 0.9 ? 2 : 1.2)
  }
  // synthwave-zon met strepen
  const sx = W * 0.62, sr = 150
  const halo = ctx.createRadialGradient(sx, hy, sr * 0.6, sx, hy, sr * 2.4)
  halo.addColorStop(0, 'rgba(255,47,142,.35)'); halo.addColorStop(1, 'rgba(255,47,142,0)')
  ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H)
  ctx.save(); ctx.beginPath(); ctx.arc(sx, hy, sr, Math.PI, 0); ctx.closePath(); ctx.clip()
  const sun = ctx.createLinearGradient(0, hy - sr, 0, hy)
  sun.addColorStop(0, '#ffd23f'); sun.addColorStop(0.55, '#ff7a45'); sun.addColorStop(1, '#ff2f8e')
  ctx.fillStyle = sun; ctx.fillRect(sx - sr, hy - sr, sr * 2, sr)
  ctx.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 7; i++) { const yy = hy - sr * 0.52 + i * 13, hh = 2 + i * 1.4; ctx.fillRect(sx - sr, yy, sr * 2, hh) }
  ctx.restore()
  // bergen (twee lagen, met neon-rand)
  ridge(ctx, R, -40, hy + 4, W + 80, 9, 70, 150, '#1a1040', 'rgba(167,139,250,.45)')
  ridge(ctx, R, -60, hy + 22, W + 120, 13, 30, 90, '#120b30', 'rgba(255,47,142,.45)')
  // neonstad aan de horizon
  let x = -10
  while (x < W + 20) {
    const bw = 22 + R() * 46, bh = 30 + R() * 110 * (R() > 0.85 ? 1.6 : 1)
    const by = hy + 40 - bh
    ctx.fillStyle = '#0d0826'; ctx.fillRect(x, by, bw, bh + 200)
    ctx.fillStyle = 'rgba(167,139,250,.25)'; ctx.fillRect(x, by, bw, 1.5)
    // ramen
    for (let wy = by + 7; wy < hy + 34; wy += 9) for (let wx = x + 5; wx < x + bw - 5; wx += 8) {
      const r = R(); if (r > 0.78) { ctx.fillStyle = r > 0.95 ? 'rgba(255,47,142,.8)' : r > 0.88 ? 'rgba(56,189,248,.75)' : 'rgba(255,210,63,.7)'; ctx.fillRect(wx, wy, 3, 4) }
    }
    if (bh > 120 && R() > 0.4) { ctx.fillStyle = '#ff2f8e'; ctx.fillRect(x + bw / 2 - 1, by - 14, 2, 14); glowDot(ctx, x + bw / 2, by - 15, 8, '#ff2f8e', 0.9) }
    x += bw + 2 + R() * 6
  }
  // horizon-mist
  const mist = ctx.createLinearGradient(0, hy - 10, 0, lv.waterY)
  mist.addColorStop(0, 'rgba(255,47,142,0)'); mist.addColorStop(1, 'rgba(124,58,237,.35)')
  ctx.fillStyle = mist; ctx.fillRect(0, hy - 10, W, lv.waterY - hy + 10)
  return cv
}
function ridge(ctx, R, x, y, w, n, minH, maxH, fill, edge) {
  const pts = [[x, y]]
  const step = w / n
  for (let i = 0; i <= n; i++) {
    pts.push([x + i * step - step / 2 + R() * step * 0.3, y - (minH * 0.4 + R() * minH * 0.4)])
    pts.push([x + i * step, y - (minH + R() * (maxH - minH))])
  }
  pts.push([x + w, y])
  ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(x, y + 400)
  pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(x + w, y + 400); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = edge; ctx.lineWidth = 1.6; ctx.beginPath()
  pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke()
}

function drawWater(ctx, wy, W, H, t) {
  const g = ctx.createLinearGradient(0, wy, 0, H)
  g.addColorStop(0, '#1b0f45'); g.addColorStop(0.35, '#0c0a2a'); g.addColorStop(1, '#05040f')
  ctx.fillStyle = g; ctx.fillRect(0, wy, W, H - wy)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  // weerspiegeling van de zon: gebroken roze strepen
  const sx = W * 0.62
  for (let i = 0; i < 9; i++) {
    const yy = wy + 8 + i * 12, ww = (150 - i * 12) * (0.8 + 0.2 * Math.sin(t * 2 + i))
    ctx.fillStyle = `rgba(255,${80 + i * 10},142,${0.32 - i * 0.03})`
    ctx.fillRect(sx - ww + Math.sin(t * 1.3 + i) * 8, yy, ww * 2, 3)
  }
  // golflijnen
  for (let i = 0; i < 5; i++) {
    const yy = wy + 18 + i * 20
    ctx.strokeStyle = `rgba(56,189,248,${0.16 - i * 0.025})`; ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let x = 0; x <= W; x += 30) ctx.lineTo(x, yy + Math.sin(x * 0.025 + t * 1.6 + i * 1.7) * 2.5)
    ctx.stroke()
  }
  ctx.restore()
  // waterlijn
  neonLine(ctx, 0, wy, W, wy, '#38bdf8', 2, 0.7)
}

function drawTerrain(ctx, tr, t) {
  const { x, y, w, h } = tr
  const g = ctx.createLinearGradient(0, y, 0, y + 280)
  g.addColorStop(0, '#2a1d55'); g.addColorStop(0.35, '#1a1240'); g.addColorStop(1, '#0a0820')
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h)
  // rotslagen
  ctx.strokeStyle = 'rgba(124,58,237,.22)'; ctx.lineWidth = 1.5
  for (let yy = y + 26; yy < y + 190; yy += 26) {
    ctx.beginPath()
    for (let xx = x; xx <= x + w; xx += 40) ctx.lineTo(xx, yy + Math.sin(xx * 0.05 + yy) * 4)
    ctx.stroke()
  }
  // kristallen in de rots
  const R = rng(Math.floor(x * 7 + y))
  for (let i = 0; i < Math.floor(w / 90); i++) {
    const cx = x + 20 + R() * (w - 40), cy = y + 40 + R() * 120, s = 4 + R() * 6
    const col = R() > 0.5 ? '#38bdf8' : '#c084fc'
    glowDot(ctx, cx, cy, s * 3.5, col, 0.35 + 0.15 * Math.sin(t * 2 + i + x))
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx, cy - s * 1.4); ctx.lineTo(cx + s * 0.6, cy); ctx.lineTo(cx, cy + s * 0.8); ctx.lineTo(cx - s * 0.6, cy); ctx.closePath(); ctx.fill()
  }
  // zijranden
  ctx.fillStyle = 'rgba(167,139,250,.35)'; ctx.fillRect(x, y, 1.5, h); ctx.fillRect(x + w - 1.5, y, 1.5, h)
  // bovenkant: neon-rand
  ctx.fillStyle = '#100b2b'; ctx.fillRect(x, y - 3, w, 8)
  neonLine(ctx, x, y - 2, x + w, y - 2, '#c084fc', 3, 1)
  // lantaarns op brede stukken
  if (w > 140) { lamp(ctx, x + 30, y, t); lamp(ctx, x + w - 30, y, t + 1) }
}
function lamp(ctx, x, y, t) {
  ctx.strokeStyle = '#3a3466'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x, y - 46); ctx.lineTo(x + 9, y - 50); ctx.stroke()
  const a = 0.85 + 0.15 * Math.sin(t * 7) * Math.sin(t * 2.3)
  glowDot(ctx, x + 10, y - 47, 30, '#ffd23f', 0.45 * a)
  ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(x + 10, y - 47, 3.4, 0, 7); ctx.fill()
  // lichtkegel
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createLinearGradient(0, y - 47, 0, y)
  g.addColorStop(0, `rgba(255,210,63,${0.22 * a})`); g.addColorStop(1, 'rgba(255,210,63,0)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x + 7, y - 46); ctx.lineTo(x + 13, y - 46); ctx.lineTo(x + 30, y - 2); ctx.lineTo(x - 10, y - 2); ctx.closePath(); ctx.fill()
  ctx.restore()
}
function drawRamp(ctx, rm, t) {
  const base = Math.max(rm.y0, rm.y1) + 14
  const g = ctx.createLinearGradient(0, Math.min(rm.y0, rm.y1), 0, base)
  g.addColorStop(0, '#2a1d55'); g.addColorStop(1, '#1a1240')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.moveTo(rm.x0, base); ctx.lineTo(rm.x0, rm.y0); ctx.lineTo(rm.x1, rm.y1); ctx.lineTo(rm.x1, base); ctx.closePath(); ctx.fill()
  neonLine(ctx, rm.x0, rm.y0 - 2, rm.x1, rm.y1 - 2, '#c084fc', 3, 1)
  // bewegende pijltjes (rijrichting)
  const ang = Math.atan2(rm.y1 - rm.y0, rm.x1 - rm.x0), len = Math.hypot(rm.x1 - rm.x0, rm.y1 - rm.y0)
  ctx.save(); ctx.translate(rm.x0, rm.y0); ctx.rotate(ang)
  for (let i = 0; i < 3; i++) {
    const s = ((t * 40 + i * len / 3) % len)
    ctx.globalAlpha = Math.sin(Math.PI * s / len)
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(s - 7, -22); ctx.lineTo(s, -16); ctx.lineTo(s - 7, -10); ctx.stroke()
  }
  ctx.restore()
}
// zwevend ballon-anker: neonballon hoog erboven, kabel omlaag naar het ankerpunt (x,y)
function balloonAnchor(ctx, x, y, t = 0) {
  const by = y - 82 + Math.sin(t * 0.8 + x) * 4
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(x, by + 34); ctx.lineTo(x, y); ctx.stroke()
  glowDot(ctx, x, by, 70, '#ff2f8e', 0.35)
  const g = ctx.createRadialGradient(x - 10, by - 12, 4, x, by, 34)
  g.addColorStop(0, '#ff8cc6'); g.addColorStop(0.6, '#c0167a'); g.addColorStop(1, '#4a0a40')
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, by, 28, 33, 0, 0, 7); ctx.fill()
  ctx.strokeStyle = '#ff2f8e'; ctx.lineWidth = 2; ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.ellipse(x, by, 12, 33, 0, 0, 7); ctx.stroke()
  ctx.fillStyle = '#ff2f8e'; ctx.beginPath(); ctx.moveTo(x - 5, by + 36); ctx.lineTo(x + 5, by + 36); ctx.lineTo(x, by + 31); ctx.fill()
  ctx.fillStyle = '#1a1240'; roundRect(ctx, x - 11, y - 5, 22, 10, 3); ctx.fill()
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1.5; ctx.stroke()
}
function finishGate(ctx, x, y, t) {
  // pulserende ring op de grond
  const p = (t * 0.8) % 1
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = `rgba(74,222,128,${0.6 * (1 - p)})`; ctx.lineWidth = 2
  ctx.beginPath(); ctx.ellipse(x + 14, y - 2, 18 + p * 30, 4 + p * 7, 0, 0, 7); ctx.stroke()
  ctx.restore()
  neonLine(ctx, x, y - 2, x, y - 74, '#4ade80', 3, 1)
  // wapperende vlag (geblokt)
  const fw = 40, fh = 26, top = y - 74
  ctx.save(); ctx.beginPath()
  for (let i = 0; i <= 8; i++) { const fx = x + i * fw / 8; ctx.lineTo(fx, top + Math.sin(t * 6 - i * 0.7) * 3 * i / 8) }
  for (let i = 8; i >= 0; i--) { const fx = x + i * fw / 8; ctx.lineTo(fx, top + fh + Math.sin(t * 6 - i * 0.7) * 3 * i / 8) }
  ctx.closePath(); ctx.fillStyle = '#0b0a1a'; ctx.fill(); ctx.clip()
  ctx.fillStyle = '#4ade80'
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) if ((r + c) % 2 === 0) ctx.fillRect(x + c * 8, top - 4 + r * 9.5, 8, 9.5)
  ctx.restore()
  glowDot(ctx, x + 20, top + 12, 46, '#4ade80', 0.3)
  ctx.save(); ctx.font = '800 13px "Baloo 2", Nunito, sans-serif'; ctx.textAlign = 'center'
  ctx.fillStyle = '#4ade80'; ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 4)
  ctx.fillText('FINISH', x + 20, top - 10); ctx.restore()
}
function drawTruck(ctx, sim) {
  const car = sim.car, pts = sim.pts
  const wl = pts[car.wl], wr = pts[car.wr], tl = pts[car.tl], tr = pts[car.tr]
  const cx = (wl.x + wr.x + tl.x + tr.x) / 4, cy = (wl.y + wr.y + tl.y + tr.y) / 4
  const ang = Math.atan2(wr.y - wl.y, wr.x - wl.x)
  const w = Math.hypot(wr.x - wl.x, wr.y - wl.y) + 16, h = car.heavy ? 26 : 20
  const col = car.heavy ? '#38bdf8' : '#ff2f8e'
  ctx.save(); ctx.translate(cx, cy - 2); ctx.rotate(ang)
  // koplampbundel
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const beam = ctx.createLinearGradient(w / 2, 0, w / 2 + 170, 0)
  beam.addColorStop(0, 'rgba(255,243,176,.45)'); beam.addColorStop(1, 'rgba(255,243,176,0)')
  ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(w / 2, h / 2 - 9); ctx.lineTo(w / 2 + 170, h / 2 - 40); ctx.lineTo(w / 2 + 170, h / 2 + 26); ctx.lineTo(w / 2, h / 2 - 5); ctx.closePath(); ctx.fill()
  ctx.restore()
  glowDot(ctx, 0, 0, w * 0.9, col, 0.25)
  // laadbak
  const cabW = car.heavy ? 34 : 28
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#2a2350'); g.addColorStop(1, '#120e2a')
  ctx.fillStyle = g; roundRect(ctx, -w / 2, -h / 2, w, h, 6); ctx.fill()
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke()
  // cabine
  ctx.fillStyle = '#1a1540'; roundRect(ctx, w / 2 - cabW - 4, -h / 2 - 13, cabW, 15, 5); ctx.fill()
  ctx.strokeStyle = col; ctx.stroke()
  const win = ctx.createLinearGradient(0, -h / 2 - 12, 0, -h / 2)
  win.addColorStop(0, '#9be7ff'); win.addColorStop(1, '#3a6fd6')
  ctx.fillStyle = win; roundRect(ctx, w / 2 - cabW, -h / 2 - 10, cabW - 8, 10, 3); ctx.fill()
  // neonstreep op de zijkant
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = col; ctx.globalAlpha = 0.8
  ctx.fillRect(-w / 2 + 6, -1, w - cabW - 14, 2.5); ctx.restore()
  // lampen
  ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(w / 2 - 2, h / 2 - 7, 3, 0, 7); ctx.fill()
  glowDot(ctx, w / 2 - 2, h / 2 - 7, 14, '#ffd23f', 0.8)
  ctx.fillStyle = '#ff3b5c'; ctx.fillRect(-w / 2 - 1, h / 2 - 10, 3, 5)
  glowDot(ctx, -w / 2, h / 2 - 8, 12, '#ff3b5c', 0.7)
  ctx.restore()
  // wielen (rol-hoek uit afgelegde weg)
  for (const wi of [car.wl, car.wr]) {
    const wp = pts[wi]
    wp._spin = (wp._spin || 0) + wp.vx / car.wR
    ctx.save(); ctx.translate(wp.x, wp.y); ctx.rotate(wp._spin)
    ctx.fillStyle = '#07061a'; ctx.beginPath(); ctx.arc(0, 0, car.wR, 0, 7); ctx.fill()
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, car.wR - 2, 0, 7); ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * car.wR * 0.55, Math.sin(a) * car.wR * 0.55); ctx.stroke() }
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, 7); ctx.fill()
    ctx.restore()
  }
  // vonkjes onder de wielen bij hoge snelheid
  if (Math.abs(wl.vx) > 2.5 && Math.random() < 0.3) glowDot(ctx, wl.x - 6, wl.y + car.wR, 6, col, 0.6)
}

// ── deeltjes ──
function sparks(fx, x, y, n, cols) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 260
    fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: 0, max: 0.5 + Math.random() * 0.6, col: cols[i % cols.length], size: 1.5 + Math.random() * 2, streak: true })
  }
}
function splash(fx, x, y) {
  for (let i = 0; i < 34; i++) {
    const a = -Math.PI / 2 + (Math.random() - .5) * 1.6, s = 120 + Math.random() * 300
    fx.push({ x: x + (Math.random() - .5) * 30, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 0.7 + Math.random() * 0.6, col: i % 3 ? '#38bdf8' : '#c4f1ff', size: 2 + Math.random() * 3 })
  }
}
function fireworks(fx, x, y) {
  const cols = ['#ffd23f', '#ff2f8e', '#38bdf8', '#4ade80', '#c084fc']
  for (let b = 0; b < 3; b++) {
    const bx = x - 60 + b * 60 + (Math.random() - .5) * 40, by = y - 130 - Math.random() * 90, col = cols[(Math.random() * cols.length) | 0]
    for (let i = 0; i < 30; i++) {
      const a = i / 30 * Math.PI * 2, s = 110 + Math.random() * 60
      fx.push({ x: bx, y: by, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: -b * 0.25, max: 1.1 + Math.random() * 0.4, col, size: 2.2, streak: true, drag: true })
    }
  }
}
function stepFx(ctx, fx, dt) {
  if (!fx.length) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  for (let i = fx.length - 1; i >= 0; i--) {
    const p = fx[i]
    p.life += dt
    if (p.life < 0) continue
    if (p.life > p.max) { fx.splice(i, 1); continue }
    if (p.drag) { p.vx *= 0.97; p.vy *= 0.97 }
    p.vy += 420 * dt; p.x += p.vx * dt; p.y += p.vy * dt
    const a = 1 - p.life / p.max
    ctx.globalAlpha = a; ctx.strokeStyle = p.col; ctx.fillStyle = p.col
    if (p.streak) { ctx.lineWidth = p.size; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke() }
    else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill() }
  }
  ctx.restore()
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

// sterren-animatie voor het win-scherm
if (typeof document !== 'undefined' && !document.getElementById('brug-kf')) {
  const s = document.createElement('style'); s.id = 'brug-kf'
  s.textContent = '@keyframes brugSter{0%{transform:scale(0) rotate(-40deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}@keyframes brugIn{0%{transform:translateY(14px) scale(.96);opacity:0}100%{transform:none;opacity:1}}'
  document.head.appendChild(s)
}

// ═══ styles ════════════════════════════════════════════════════════════════
const glass = { background: 'rgba(16,13,40,.72)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.12)' }
const wrap = { position: 'fixed', inset: 0, background: '#07061a', fontFamily: 'var(--kk-body)', overflow: 'hidden' }
const hudTop = { position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, zIndex: 6, whiteSpace: 'nowrap' }
const badge = { ...glass, display: 'flex', alignItems: 'center', gap: 8, color: '#fff', borderRadius: 999, padding: '6px 14px 6px 6px', fontWeight: 800, fontSize: 14 }
const lvlNum = { display: 'grid', placeItems: 'center', minWidth: 26, height: 26, borderRadius: 999, background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', boxShadow: '0 0 12px rgba(139,92,246,.6)', fontFamily: 'var(--kk-head)', fontSize: 15 }
const heavyTag = { fontSize: 11, color: '#38bdf8', border: '1px solid rgba(56,189,248,.5)', borderRadius: 999, padding: '1px 8px', textTransform: 'uppercase', letterSpacing: '.06em' }
const budgetBadge = { color: '#ffd23f', padding: '6px 16px 6px 10px', borderColor: 'rgba(255,210,63,.35)', fontFamily: 'var(--kk-head)', fontSize: 17 }
// materialen links in een kolom, knoppen rechtsonder: zo blijft de kloof (midden-onder) vrij
const matBar = { position: 'absolute', left: 12, top: 72, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 6 }
const matBtn = { ...glass, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 82, padding: '7px 4px 6px', borderRadius: 14, cursor: 'pointer', color: '#fff', fontFamily: 'inherit', transition: 'transform .15s, box-shadow .15s, border-color .15s' }
const swatch = { width: 52, height: 7, borderRadius: 4, marginBottom: 2 }
const SWATCH = {
  weg:    { background: 'repeating-linear-gradient(90deg,#262a40 0 6px,#ffd23f 6px 10px,#262a40 10px 16px)', boxShadow: '0 0 0 1.5px #38bdf8, 0 0 10px #38bdf8' },
  hout:   { background: 'repeating-linear-gradient(90deg,#4a3216 0 7px,#7a5320 7px 8px)', boxShadow: '0 0 0 1.5px #ffb020, 0 0 10px #ffb020' },
  metaal: { background: 'repeating-linear-gradient(60deg,#3a3466 0 5px,#6d5fb8 5px 6px)', boxShadow: '0 0 0 1.5px #c4b5fd, 0 0 10px #c4b5fd' },
  touw:   { height: 3, marginTop: 2, marginBottom: 4, background: '#ffd1e8', boxShadow: '0 0 8px 1px #ff2f8e' },
}
const hudBottom = { position: 'absolute', bottom: 14, right: 14, display: 'flex', gap: 10, zIndex: 6 }
const btnB = { border: 'none', borderRadius: 999, cursor: 'pointer', fontWeight: 800, fontFamily: 'var(--kk-head)', letterSpacing: '.03em' }
const primary = { ...btnB, color: '#fff', background: 'linear-gradient(135deg,#7c3aed,#a855f7 60%,#ff2f8e)', boxShadow: '0 0 0 1px rgba(255,255,255,.18) inset, 0 8px 26px rgba(139,92,246,.55)', padding: '12px 30px', fontSize: 18 }
const ghost = { ...btnB, ...glass, color: '#fff', padding: '12px 20px', fontSize: 16 }
const overlay = { position: 'absolute', inset: 0, zIndex: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'radial-gradient(60% 60% at 50% 45%, rgba(7,6,26,.1), rgba(7,6,26,.6))' }
const card = { ...glass, background: 'rgba(16,13,40,.82)', borderRadius: 24, padding: '26px 30px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4, maxWidth: 520, animation: 'brugIn .35s cubic-bezier(.2,1.2,.4,1) both' }
const bigTitle = { fontFamily: 'var(--kk-head)', fontSize: 52, fontWeight: 800, lineHeight: 1, textTransform: 'uppercase', letterSpacing: '.05em' }
const hint = { ...glass, position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: 12, lineHeight: 1.45, textAlign: 'center', width: 'calc(100% - 220px)', maxWidth: 580, padding: '6px 14px', borderRadius: 12, pointerEvents: 'none', zIndex: 5 }
const selectWrap = { position: 'absolute', inset: 0, zIndex: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'linear-gradient(180deg, rgba(7,6,26,.55), rgba(7,6,26,.8))' }
const kicker = { color: '#38bdf8', fontSize: 12, fontWeight: 800, letterSpacing: '.3em', textTransform: 'uppercase', marginBottom: 2 }
const titleStyle = { fontFamily: 'var(--kk-head)', fontSize: 46, fontWeight: 800, lineHeight: 1.05, textTransform: 'uppercase', letterSpacing: '.06em', background: 'linear-gradient(90deg,#ffd23f,#ff2f8e 55%,#a78bfa)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 0 18px rgba(255,47,142,.45))', marginBottom: 6 }
const starPill = { color: '#ffd23f', fontWeight: 900, border: '1px solid rgba(255,210,63,.4)', borderRadius: 999, padding: '2px 10px', fontSize: 13 }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: 12, width: '100%', maxWidth: 780, maxHeight: '64vh', overflowY: 'auto', padding: 6 }
const cell = { ...glass, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, height: 92, borderRadius: 16, cursor: 'pointer', color: '#fff', fontFamily: 'inherit', padding: '4px 6px' }
const cellGold = { borderColor: 'rgba(255,210,63,.55)', boxShadow: '0 0 18px rgba(255,210,63,.18)' }
const cellNext = { borderColor: '#a78bfa', boxShadow: '0 0 0 1px #a78bfa inset, 0 0 24px rgba(139,92,246,.55)', background: 'rgba(60,30,120,.6)' }
const cellLock = { background: 'rgba(16,13,40,.45)', borderColor: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.3)', cursor: 'not-allowed', boxShadow: 'none' }
