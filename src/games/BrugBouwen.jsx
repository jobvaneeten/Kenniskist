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
      sim: null, acc: 0,
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
    ctx.save(); ctx.clearRect(0, 0, view.cssW, view.cssH)
    ctx.translate(view.ox + cam.tx, view.oy + cam.ty); ctx.scale(view.scale * cam.z, view.scale * cam.z)
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip()

    const lv = st.lv, sim = st.sim, t = st.tAcc

    // lucht — zachte dag-gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#1f5fc6'); sky.addColorStop(0.4, '#3f8ce0'); sky.addColorStop(0.72, '#8fc8ef'); sky.addColorStop(1, '#d6f0f6')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
    // zon + zonnestralen
    ctx.save()
    const sunX = W - 210, sunY = 140
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = 'rgba(255,248,210,.10)'; ctx.lineWidth = 26
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + t * 0.05; ctx.beginPath(); ctx.moveTo(sunX, sunY); ctx.lineTo(sunX + Math.cos(a) * 700, sunY + Math.sin(a) * 700); ctx.stroke() }
    ctx.restore()
    const sun = ctx.createRadialGradient(sunX, sunY, 16, sunX, sunY, 300)
    sun.addColorStop(0, 'rgba(255,250,220,.95)'); sun.addColorStop(0.18, 'rgba(255,244,190,.7)'); sun.addColorStop(1, 'rgba(255,246,200,0)')
    ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#fff7da'; ctx.beginPath(); ctx.arc(sunX, sunY, 34, 0, 7); ctx.fill()
    // verre bergen (gelaagd)
    const hy = H - 268
    ctx.fillStyle = '#9fb6cf'; mountains(ctx, -50, hy, W + 100, 150, 6, 1)
    ctx.fillStyle = '#8aa9c6'; mountains(ctx, 120, hy + 20, W, 120, 5, 3)
    ctx.fillStyle = 'rgba(120,180,150,.55)'; hill(ctx, 0, hy + 42, W, 120, 3, 12)
    ctx.fillStyle = 'rgba(96,168,138,.6)';   hill(ctx, -100, hy + 76, W + 200, 150, 4, 30)
    // grid (alleen bouwen, blueprint-stijl) — valt samen met het bouwraster
    if (!sim) {
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1
      for (let x = 0; x <= W; x += SNAP * 2) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 0; y <= H; y += SNAP * 2) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    }
    // wolken + vogels
    cloud(ctx, W * 0.13 + Math.sin(t * 0.05) * 14, 110, 1.1)
    cloud(ctx, W * 0.4 + Math.sin(t * 0.03) * 10, 70, 0.7)
    cloud(ctx, W * 0.67 + Math.sin(t * 0.04) * 16, 96, 0.95)
    birds(ctx, 380 + (t * 8) % (W - 200), 150)

    // water — gradient, glinstering en zon-reflectie
    const wy = lv.waterY
    const water = ctx.createLinearGradient(0, wy, 0, H)
    water.addColorStop(0, '#56c0e2'); water.addColorStop(0.5, '#2f97c4'); water.addColorStop(1, '#176a96')
    ctx.fillStyle = water; ctx.fillRect(0, wy, W, H - wy)
    const refl = ctx.createLinearGradient(sunX - 60, wy, sunX + 60, H)
    refl.addColorStop(0, 'rgba(255,250,210,.0)'); refl.addColorStop(0.5, 'rgba(255,250,210,.22)'); refl.addColorStop(1, 'rgba(255,250,210,0)')
    ctx.fillStyle = refl; ctx.fillRect(sunX - 90, wy, 180, H - wy)
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 2
    for (let i = 0; i < 6; i++) {
      const yy = wy + 14 + i * 22
      ctx.beginPath()
      for (let x = 0; x <= W; x += 40) ctx.lineTo(x, yy + Math.sin(x * 0.03 + t * 1.4 + i) * 2.2)
      ctx.stroke()
    }

    // terrein
    lv.terrain.forEach(tr => drawTerrain(ctx, tr))
    lv.ramps.forEach(rm => drawRamp(ctx, rm))
    lv.floatAnchors.forEach(fa => balloonAnchor(ctx, fa.x, fa.y, t))

    // ── balken: tijdens de rit gekleurd naar belasting (groen → rood) ──
    if (sim) {
      sim.beams.forEach(p => {
        if (p.broken || p.car) return
        const a = sim.pts[p.a], b = sim.pts[p.b]
        drawMember(ctx, a, b, p.mat, strainCol(Math.min(1, Math.abs(p.force) / MAT[p.mat].strength)), true)
      })
    } else {
      st.members.forEach(m => drawMember(ctx, st.nodes[m.a], st.nodes[m.b], m.mat, null, false))
    }

    // sleep-voorbeeld: precies waar de balk komt (raster/knoop), rood = kan niet
    if (st.drag && !sim) {
      const a = st.nodes[st.drag.from], m = MAT[matRef.current], d = st.drag
      ctx.strokeStyle = d.ok ? 'rgba(150,240,160,.95)' : 'rgba(255,90,90,.95)'
      ctx.lineWidth = m.w; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(d.x, d.y); ctx.stroke()
      ctx.beginPath(); ctx.arc(a.x, a.y, m.maxLen, 0, 7)
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([])
    }

    // knopen (tijdens de rit alleen de brug-knopen, niet de auto-punten)
    const nodes = sim ? sim.pts.slice(0, sim.car.base) : st.nodes
    nodes.forEach(n => peg(ctx, n.x, n.y, n.fixed))

    if (sim) drawTruck(ctx, sim)
    flag(ctx, lv.finishX + 6, lv.finishY)

    if (st.flash > 0) { ctx.fillStyle = `rgba(255,40,40,${st.flash * 0.5})`; ctx.fillRect(0, 0, W, H) }
    ctx.restore()
  }

  // ═══ UI ════════════════════════════════════════════════════════════════════
  const lv = LEVELS[levelIdx]
  const unlocked = prog.unlocked || 1
  const rewardWins = rewardWon.length
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
            <span style={badge}>Level {levelIdx + 1} · {lv.title}{lv.heavy ? ' · 🚛 zware truck' : ''}</span>
            <span style={{ ...badge, color: '#ffe08a' }}>💰 {budget} over</span>
          </div>

          {mode === 'build' && (
            <>
              <div style={matBar}>
                {lv.mats.map(k => (
                  <button key={k} onClick={() => setMat(k)}
                    style={{ ...matBtn, ...(mat === k ? matBtnOn : {}), borderColor: MAT[k].col }}>
                    <span style={{ fontSize: 18 }}>{MAT[k].icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 800 }}>{MAT[k].name}</span>
                    <span style={{ fontSize: 9.5, opacity: .8, lineHeight: 1.15 }}>{MAT[k].desc}</span>
                    <span style={{ fontSize: 11, color: '#ffe08a', fontWeight: 800 }}>💰{MAT[k].cost}</span>
                  </button>
                ))}
              </div>
              <div style={hudBottom}>
                <button style={ghost} onClick={leeg} title="Alles wissen">🗑</button>
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
              <div style={{ fontSize: 50, fontWeight: 900, color: mode === 'win' ? '#7ef0a0' : '#ff7a7a', filter: 'drop-shadow(0 4px 14px rgba(0,0,0,.5))' }}>
                {mode === 'win' ? 'Gehaald! 🎉' : 'Mislukt 💥'}
              </div>
              {mode === 'win' && <div style={{ fontSize: 40, letterSpacing: 6 }}>{'★★★'.slice(0, stars)}<span style={{ opacity: .25 }}>{'★★★'.slice(stars)}</span></div>}
              {mode === 'win' && stars < 3 && <div style={{ color: '#cfe0ff', fontSize: 14 }}>Meer sterren? Bouw goedkoper: ★★★ = hooguit {Math.floor(lv.budget * 0.6)} munten.</div>}
              {mode === 'win' && reward && <div style={{ color: '#ffe08a', fontWeight: 800, marginTop: 2 }}>Level {Math.min(rewardWins, REWARD_LEVELS)} van {REWARD_LEVELS} gehaald {rewardWins >= REWARD_LEVELS ? '🎁' : ''}</div>}
              <div style={{ color: '#dbe6ff', marginTop: 4, maxWidth: 470 }}>
                {mode === 'win' ? 'De truck is veilig overgestoken!' : LOSE[loseReason] || LOSE.water}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button style={mode === 'lose' ? primary : ghost} onClick={backToBuild}>🔧 Aanpassen</button>
                {mode === 'lose' && <button style={ghost} onClick={() => { leeg(); backToBuild() }}>🗑 Opnieuw beginnen</button>}
                {mode === 'win' && reward && rewardWins >= REWARD_LEVELS && <button style={primary} onClick={() => { teardown(); onBack() }}>Klaar! ✓</button>}
                {mode === 'win' && (!reward || rewardWins < REWARD_LEVELS) && levelIdx + 1 < LEVELS.length && <button style={primary} onClick={() => loadLevel(levelIdx + 1)}>Volgende →</button>}
                {mode === 'win' && !reward && levelIdx + 1 >= LEVELS.length && <button style={primary} onClick={() => { teardown(); setMode('build'); setScreen('select') }}>Alle levels ✓</button>}
              </div>
            </div>
          )}
          {mode === 'build' && <div style={hint}>💡 {TIPS[lv.kind]}<br />Sleep vanaf een knoop om een balk te leggen · houd een balk vast om te wissen · sleep een lege plek om rond te kijken, scroll of knijp om te zoomen</div>}
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
function drawTerrain(ctx, tr) {
  const x = tr.x, y = tr.y, w = tr.w, h = tr.h
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
// zwevend ballon-anker: ballon hoog erboven, touwtje omlaag naar het ankerpunt (x,y)
function balloonAnchor(ctx, x, y, t = 0) {
  const by = y - 78 + Math.sin((t || 0) * 0.8 + x) * 4
  ctx.strokeStyle = 'rgba(40,30,20,.55)'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(x, by + 56); ctx.lineTo(x, y); ctx.stroke()
  balloon(ctx, x, by)
  // ankerplaatje waar je aan vastmaakt
  ctx.fillStyle = '#6b4f2a'; roundRect(ctx, x - 11, y - 5, 22, 10, 3); ctx.fill()
  ctx.fillStyle = '#caa15a'; ctx.fillRect(x - 9, y - 3, 18, 3)
}
function birds(ctx, x, y) {
  ctx.strokeStyle = 'rgba(40,50,70,.55)'; ctx.lineWidth = 2
  for (const dx of [0, 26, 52]) { ctx.beginPath(); ctx.moveTo(x + dx, y); ctx.quadraticCurveTo(x + dx + 6, y - 6, x + dx + 12, y); ctx.stroke() }
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
    wp._spin = (wp._spin || 0) + wp.vx / car.wR
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
function drawRamp(ctx, rm) {
  const base = Math.max(rm.y0, rm.y1) + 14          // tot in de grond eronder
  const g = ctx.createLinearGradient(0, Math.min(rm.y0, rm.y1), 0, base)
  g.addColorStop(0, '#c47e34'); g.addColorStop(.6, '#9a5f2a'); g.addColorStop(1, '#7a4a22')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.moveTo(rm.x0, base); ctx.lineTo(rm.x0, rm.y0); ctx.lineTo(rm.x1, rm.y1); ctx.lineTo(rm.x1, base); ctx.closePath(); ctx.fill()
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
const hudTop = { position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, zIndex: 6 }
const badge = { background: 'rgba(8,16,34,.78)', color: '#eaf1ff', border: '1px solid rgba(120,140,255,.28)', borderRadius: 30, padding: '8px 16px', fontWeight: 800, fontSize: 14 }
// materialen links in een kolom, knoppen rechtsonder: zo blijft de kloof (midden-onder) vrij
const matBar = { position: 'absolute', left: 12, top: 72, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 6 }
const matBtn = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width: 76, padding: '5px 4px', borderRadius: 14, cursor: 'pointer', color: '#eaf1ff', background: 'rgba(10,18,40,.82)', border: '2px solid rgba(120,140,255,.3)', fontFamily: 'inherit' }
const matBtnOn = { background: 'rgba(60,90,200,.5)', boxShadow: '0 0 0 2px #fff inset, 0 6px 18px rgba(80,120,255,.4)', transform: 'translateX(4px)' }
const hudBottom = { position: 'absolute', bottom: 14, right: 14, display: 'flex', gap: 10, zIndex: 6 }
const btnB = { border: 'none', borderRadius: 30, cursor: 'pointer', fontWeight: 800, fontFamily: 'inherit' }
const primary = { ...btnB, color: '#04121a', background: 'linear-gradient(135deg,#3ef0ff,#66ffd9)', boxShadow: '0 8px 22px rgba(62,240,255,.35)', padding: '13px 30px', fontSize: 17 }
const ghost = { ...btnB, color: '#cdd8ff', background: 'rgba(12,18,40,.78)', border: '1px solid rgba(120,140,255,.32)', padding: '13px 20px', fontSize: 16 }
const overlay = { position: 'absolute', inset: 0, zIndex: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 6, background: 'radial-gradient(60% 60% at 50% 45%, rgba(6,10,24,.5), rgba(4,6,16,.82))' }
const hint = { position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', color: '#e4ecff', fontSize: 12, lineHeight: 1.4, textAlign: 'center', width: 'calc(100% - 220px)', maxWidth: 580, padding: '6px 12px', borderRadius: 12, background: 'rgba(8,16,34,.62)', pointerEvents: 'none', zIndex: 5 }
const selectWrap = { position: 'absolute', inset: 0, zIndex: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(6,12,28,.62)', backdropFilter: 'blur(3px)' }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(116px, 1fr))', gap: 12, width: '100%', maxWidth: 760, maxHeight: '70vh', overflowY: 'auto', padding: 4 }
const cell = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, height: 86, borderRadius: 16, cursor: 'pointer', color: '#fff', background: 'linear-gradient(165deg,rgba(60,90,200,.55),rgba(20,30,70,.6))', border: '2px solid rgba(150,170,255,.4)', fontFamily: 'inherit' }
const cellLock = { background: 'rgba(20,26,46,.6)', border: '2px solid rgba(120,130,160,.25)', color: '#8a93b0', cursor: 'not-allowed' }
