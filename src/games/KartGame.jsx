import { useEffect, useRef, useState } from 'react'
import {
  Engine, Scene, FollowCamera,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  Vector3, Color3, Color4,
  MeshBuilder, StandardMaterial, DynamicTexture, TransformNode,
} from '@babylonjs/core'
import * as Colyseus from '@colyseus/sdk'
import OrientationGate from '../OrientationGate'
import {
  KART_SCALE, KART_VISUAL, AV_Y, AV_Z, KART_COLORS,
  buildKart, loadAvatar, safeJSON,
} from './kartShared'
import './kart-game.css'

const SERVER_URL = 'wss://kenniskist-server.onrender.com'

// ── Banen ───────────────────────────────────────────────────────────────
const NSEG = 400          // centerline-resolutie

// Stadion-ovaal (gelijkmatig op booglengte)
function stadiumPath(N, STR, CR) {
  const straight = 2 * STR, corner = Math.PI * CR
  const total = 2 * straight + 2 * corner
  const pts = []
  for (let i = 0; i < N; i++) {
    const s = (i / N) * total
    let x, z
    if (s < straight) { const u = s / straight; x = -STR + u * 2 * STR; z = CR }
    else if (s < straight + corner) { const a = (s - straight) / corner; const ang = Math.PI / 2 - a * Math.PI; x = STR + Math.cos(ang) * CR; z = Math.sin(ang) * CR }
    else if (s < 2 * straight + corner) { const u = (s - straight - corner) / straight; x = STR - u * 2 * STR; z = -CR }
    else { const a = (s - 2 * straight - corner) / corner; const ang = -Math.PI / 2 - a * Math.PI; x = -STR + Math.cos(ang) * CR; z = Math.sin(ang) * CR }
    pts.push({ x, z })
  }
  return pts
}
// Bochtige baan via polaire straal r(θ) (blijft stervormig → robuust)
function polarPath(N, fn) {
  const pts = []
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; const r = fn(a); pts.push({ x: Math.cos(a) * r, z: Math.sin(a) * r }) }
  return pts
}

// 3 banen: makkelijk (lange ovaal) → lastig (golvend bos) → moeilijk (lang, smal & scherp)
// LET OP: de path-functies MOETEN exact gelijk zijn aan de server (KartRoom.ts).
// Langer (grotere straal) + moeilijker (meer/scherpere bochten).
// features: boosts/ramps = posities (fractie van de ronde) van boost-pads & sprong-
// ramps; grip = stroefheid (1 = normaal, lager = glad/ijs). MOET kloppen met server-pad.
const TRACKS = {
  groen: {
    name: 'Groene Weide', diff: 'Makkelijk', laps: 3, roadHW: 7.2,
    path: (N) => polarPath(N, (a) => 82 + 22 * Math.cos(2 * a) + 5 * Math.cos(3 * a)),
    theme: { grass: [0.30, 0.66, 0.32], sky: ['#74c7ff', '#eaf7ff'], trees: 90, rocks: 6, accent: '#ffd23f' },
    features: { boosts: [0.5], ramps: [], grip: 1 },
  },
  woud: {
    name: 'Boscircuit', diff: 'Lastig', laps: 3, roadHW: 5.6,
    path: (N) => polarPath(N, (a) => 84 + 18 * Math.cos(2 * a) + 11 * Math.cos(3 * a) + 7 * Math.sin(5 * a)),
    theme: { grass: [0.16, 0.40, 0.20], sky: ['#5fa17f', '#d3ecda'], trees: 170, rocks: 26, accent: '#8ae66a' },
    features: { boosts: [0.28, 0.72], ramps: [], grip: 1 },
  },
  bergen: {
    name: 'Bergpas', diff: 'Moeilijk', laps: 4, roadHW: 4.4,
    path: (N) => polarPath(N, (a) => 86 + 20 * Math.cos(2 * a) + 13 * Math.sin(3 * a) + 9 * Math.cos(5 * a) + 5 * Math.sin(7 * a)),
    theme: { grass: [0.52, 0.48, 0.42], sky: ['#b98a76', '#f3e3d7'], trees: 46, rocks: 80, accent: '#ff8a3d' },
    features: { boosts: [0.6], ramps: [0.25], grip: 1 },
  },
  vuur: {
    name: 'Vulkaanbaan', diff: 'Heet! 🔥', laps: 3, roadHW: 6.0,
    path: (N) => polarPath(N, (a) => 80 + 24 * Math.cos(3 * a) + 10 * Math.sin(5 * a)),
    theme: { grass: [0.20, 0.12, 0.10], sky: ['#3a0d0a', '#ff7a3d'], trees: 0, rocks: 70, accent: '#ff5a1f' },
    features: { boosts: [0.18, 0.52, 0.82], ramps: [0.35, 0.68], grip: 1 },
  },
  ijs: {
    name: 'IJsbaan', diff: 'Glad! ❄️', laps: 3, roadHW: 6.5,
    path: (N) => polarPath(N, (a) => 84 + 16 * Math.cos(2 * a) + 8 * Math.cos(4 * a)),
    theme: { grass: [0.80, 0.88, 0.95], sky: ['#9fc7e8', '#eaf6ff'], trees: 20, rocks: 30, accent: '#56ccf2' },
    features: { boosts: [0.3, 0.7], ramps: [], grip: 0.55 },
  },
  regenboog: {
    name: 'Regenboogbaan', diff: 'Episch! 🌈', laps: 4, roadHW: 4.2,
    path: (N) => polarPath(N, (a) => 88 + 22 * Math.cos(2 * a) + 14 * Math.sin(3 * a) + 8 * Math.cos(7 * a)),
    theme: { grass: [0.10, 0.08, 0.20], sky: ['#1a0b3a', '#7b2ff7'], trees: 0, rocks: 0, accent: '#ff4fd8' },
    features: { boosts: [0.15, 0.45, 0.75], ramps: [0.3, 0.6, 0.9], grip: 0.85 },
  },
}
const TRACK_IDS = ['groen', 'woud', 'bergen', 'vuur', 'ijs', 'regenboog']

// Actieve baan (mutabel; gezet via setTrack vóór het bouwen)
let CENTER = []
let ROAD_HW = 7
let TOTAL_LAPS = 3
let CUR_TRACK = 'groen'
let START_IDX = 0
let RAMP_IDX = []
let BOOST_IDX = []
let TRACK_GRIP = 1

function setTrack(id) {
  const t = TRACKS[id] || TRACKS.groen
  CUR_TRACK = TRACKS[id] ? id : 'groen'
  CENTER = t.path(NSEG)
  ROAD_HW = t.roadHW
  TOTAL_LAPS = t.laps
  START_IDX = computeStartIdx()
  const f = t.features || {}
  RAMP_IDX  = (f.ramps  || []).map(fr => ((Math.round(fr * NSEG) % NSEG) + NSEG) % NSEG)
  BOOST_IDX = (f.boosts || []).map(fr => ((Math.round(fr * NSEG) % NSEG) + NSEG) % NSEG)
  TRACK_GRIP = f.grip ?? 1
}
// Startvak op het rechtste stuk (laagste kromming) zodat de grid mooi staat
function computeStartIdx() {
  let best = 0, bestCurv = Infinity
  for (let i = 0; i < NSEG; i++) {
    const t1 = tangentAt(i - 5), t2 = tangentAt(i + 5)
    const dot = Math.max(-1, Math.min(1, t1.x * t2.x + t1.z * t2.z))
    const curv = Math.acos(dot)
    if (curv < bestCurv) { bestCurv = curv; best = i }
  }
  return best
}
const ringPos = (i) => new Vector3(CENTER[((i % NSEG) + NSEG) % NSEG].x, 0, CENTER[((i % NSEG) + NSEG) % NSEG].z)
function tangentAt(i) {
  const a = CENTER[((i + 1) % NSEG + NSEG) % NSEG], b = CENTER[((i - 1) % NSEG + NSEG) % NSEG]
  let tx = a.x - b.x, tz = a.z - b.z
  const L = Math.hypot(tx, tz) || 1
  return { x: tx / L, z: tz / L }
}
function normalAt(i) {
  const t = tangentAt(i), c = CENTER[i]
  let nx = t.z, nz = -t.x
  if (nx * c.x + nz * c.z < 0) { nx = -nx; nz = -nz }   // naar buiten
  return { x: nx, z: nz }
}
function nearestIdx(pos) {
  let best = 0, bd = Infinity
  for (let i = 0; i < NSEG; i++) {
    const dx = pos.x - CENTER[i].x, dz = pos.z - CENTER[i].z
    const d = dx * dx + dz * dz
    if (d < bd) { bd = d; best = i }
  }
  return { idx: best, dist: Math.sqrt(bd) }
}
setTrack('groen')

// Startvak-transform op basis van join-index (2 kolommen op het rechte stuk)
function gridStart(grid) {
  const c = ringPos(START_IDX), t = tangentAt(START_IDX), n = normalAt(START_IDX)
  const row = Math.floor(grid / 2), col = grid % 2
  const back = row * 4.5 + 1, side = (col === 0 ? -1 : 1) * 2.4
  const x = c.x - t.x * back + n.x * side
  const z = c.z - t.z * back + n.z * side
  return { x, z, heading: Math.atan2(t.x, t.z) }
}

// ── Item-systeem visuals ────────────────────────────────────────────────
const ITEM_INFO = {
  boost:  { emoji: '🍄', label: 'Boost' },
  star:   { emoji: '⭐', label: 'Ster' },
  banana: { emoji: '🍌', label: 'Banaan' },
  shell:  { emoji: '🐢', label: 'Schild' },
}
// Zwevend, draaiend Mario-Kart "?"-blok met regenboog-glans en gloed-halo.
function makeItemBox(scene, x, z) {
  const root = new TransformNode('iboxRoot', scene)
  root.position.set(x, 1.1, z)
  const cube = MeshBuilder.CreateBox('ibox', { size: 1.35 }, scene)
  cube.parent = root; cube.isPickable = false
  const m = new StandardMaterial('iboxm', scene)
  const tex = new DynamicTexture('iboxt', { width: 128, height: 128 }, scene, false)
  const c = tex.getContext()
  const g = c.createLinearGradient(0, 0, 128, 128)
  g.addColorStop(0, '#ffe14d'); g.addColorStop(0.5, '#ff8a3d'); g.addColorStop(1, '#ff4db8')
  c.fillStyle = g; c.fillRect(0, 0, 128, 128)
  c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 8; c.strokeRect(6, 6, 116, 116)
  c.fillStyle = '#fff'; c.font = 'bold 92px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'
  c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 6
  c.fillText('?', 64, 70)
  tex.update()
  m.diffuseTexture = tex; m.emissiveColor = new Color3(0.6, 0.45, 0.2); m.specularColor = new Color3(0.8, 0.8, 0.8)
  cube.material = m
  // doorzichtige gloed-schil eromheen
  const glow = MeshBuilder.CreateBox('iboxGlow', { size: 1.8 }, scene)
  glow.parent = root; glow.isPickable = false
  const gm = new StandardMaterial('iboxGlowM', scene)
  gm.emissiveColor = new Color3(1, 0.8, 0.3); gm.alpha = 0.18; gm.disableLighting = true
  glow.material = gm
  root._cube = cube
  return root
}
function makeHazardMesh(scene) {
  // Banaan: gebogen gele tube met bruine puntjes.
  const path = []
  for (let i = 0; i <= 8; i++) { const t = i / 8; path.push(new Vector3((t - 0.5) * 1.1, Math.sin(t * Math.PI) * 0.28, 0)) }
  const b = MeshBuilder.CreateTube('hz', { path, radius: 0.18, tessellation: 8, cap: 1 }, scene)
  const m = new StandardMaterial('hzm', scene)
  m.diffuseColor = new Color3(1, 0.85, 0.12); m.emissiveColor = new Color3(0.4, 0.34, 0.02); m.specularColor = new Color3(0.6, 0.6, 0.3)
  b.material = m; b.isPickable = false
  for (const sx of [-0.55, 0.55]) {
    const tip = MeshBuilder.CreateSphere('hztip', { diameter: 0.22, segments: 6 }, scene)
    tip.parent = b; tip.position.set(sx, sx > 0 ? 0 : 0, 0)
    const tm = new StandardMaterial('hztm', scene); tm.diffuseColor = new Color3(0.4, 0.25, 0.08); tm.emissiveColor = new Color3(0.15, 0.09, 0.02)
    tip.material = tm
  }
  return b
}
function makeShellMesh(scene) {
  // Groen schild: koepel met lichte onderrand.
  const dome = MeshBuilder.CreateSphere('sh', { diameter: 0.95, segments: 10, slice: 0.62 }, scene)
  dome.scaling.y = 0.78
  const m = new StandardMaterial('shm', scene)
  m.diffuseColor = new Color3(0.18, 0.8, 0.32); m.emissiveColor = new Color3(0.08, 0.42, 0.16); m.specularColor = new Color3(0.5, 0.7, 0.5)
  dome.material = m; dome.isPickable = false
  const rim = MeshBuilder.CreateCylinder('shrim', { diameter: 0.96, height: 0.22, tessellation: 16 }, scene)
  rim.parent = dome; rim.position.y = 0.02
  const rm = new StandardMaterial('shrimm', scene); rm.diffuseColor = new Color3(0.97, 0.95, 0.8); rm.emissiveColor = new Color3(0.4, 0.39, 0.3)
  rim.material = rm
  return dome
}

function KartRace({ onBack, room, sessionId, joinCode, track = 'groen' }) {
  const mp = !!room
  const trackId = track || 'groen'
  const canvasRef = useRef(null)
  const [phase, setPhase]   = useState(mp ? 'lobby' : 'countdown')   // lobby | countdown | racing | finished
  const [count, setCount]   = useState(3)
  const [lap, setLap]       = useState(1)
  const [speed, setSpeed]   = useState(0)
  const [lapTime, setLapTime] = useState(0)
  const [place, setPlace]   = useState({ pos: 1, total: 1 })
  const [result, setResult]   = useState(null)
  const [players, setPlayers] = useState([])      // lobby-lijst
  const [botDiff, setBotDiff] = useState('normaal')
  const [heldItem, setHeldItem] = useState('')    // item in bezit (HUD)
  const [fxFlash, setFxFlash]   = useState('')    // 'boost' | 'star' | 'spin' korte HUD-flits
  const [spinEmoji, setSpinEmoji] = useState(null) // Mario-Kart roulette tijdens oppakken
  const prevItemRef = useRef('')
  const rollingRef = useRef(false)
  const useItemRef = useRef(() => {})
  const stateRef = useRef({})

  // Roulette: net opgepakt (leeg → item) → laat de emoji's even rollen vóór de onthulling.
  useEffect(() => {
    const had = prevItemRef.current; prevItemRef.current = heldItem
    if (!heldItem || had) { return }
    const pool = ['🍄', '⭐', '🍌', '🐢']
    let n = 0; const ticks = 13 + Math.floor(Math.random() * 5)
    rollingRef.current = true; setSpinEmoji(pool[0])
    const iv = setInterval(() => {
      n++
      if (n >= ticks) { clearInterval(iv); rollingRef.current = false; setSpinEmoji(null) }
      else setSpinEmoji(pool[Math.floor(Math.random() * pool.length)])
    }, 55)
    return () => { clearInterval(iv); rollingRef.current = false }
  }, [heldItem])

  // Lobby: start de race (server zet phase → countdown → racing)
  const startRace = () => { if (room) room.send('start') }

  useEffect(() => {
    const canvas = canvasRef.current
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
    const scene = new Scene(engine)
    scene.clearColor = new Color4(0.55, 0.78, 0.95, 1)

    const hemi = new HemisphericLight('h', new Vector3(0, 1, 0), scene)
    hemi.intensity = 0.85
    const sun = new DirectionalLight('s', new Vector3(-0.4, -1, -0.3), scene)
    sun.position = new Vector3(40, 60, 20); sun.intensity = 1.1
    const sg = new ShadowGenerator(1024, sun); sg.useBlurExponentialShadowMap = true

    setTrack(trackId)
    buildTrack(scene, sg, trackId)

    // ── Eigen kart + avatar ──
    const myGrid = mp ? (room.state.players?.get(sessionId)?.grid ?? 0) : 0
    const myColor = KART_COLORS[myGrid % KART_COLORS.length]
    const { root: kartRoot, wheels } = buildKart(scene, myColor, 'me')
    const gs = gridStart(myGrid)
    kartRoot.position.set(gs.x, 0, gs.z)
    kartRoot.rotation.y = gs.heading

    const cam = new FollowCamera('cam', new Vector3(0, 6, -12), scene)
    cam.lockedTarget = kartRoot
    cam.radius = 9; cam.heightOffset = 3.4; cam.rotationOffset = 180
    cam.cameraAcceleration = 0.06; cam.maxCameraSpeed = 40

    loadAvatar(scene, localStorage.getItem('kk_shirt') || '', safeJSON(localStorage.getItem('kk_wearing')), (av) => {
      // BELANGRIJK: de skinned avatar-root NIET schalen (breekt de skin-matrices).
      av.parent = kartRoot
      av.position.set(0, AV_Y, AV_Z)
      av.rotation = new Vector3(0, Math.PI, 0)
      av.getChildMeshes?.(false).forEach(m => sg.addShadowCaster(m))
    })

    // ── Remote karts (multiplayer) ──
    const remotes = new Map()   // sessionId → { root, wheels, tx, tz, trot, tvel, lap }
    const makeRemote = (sid, p) => {
      const col = KART_COLORS[(p.grid ?? 0) % KART_COLORS.length]
      const built = buildKart(scene, col, 'r' + sid)
      const g = gridStart(p.grid ?? 0)
      built.root.position.set(p.x || g.x, 0, p.z || g.z)
      built.root.rotation.y = p.rotY || g.heading
      const ent = { root: built.root, wheels: built.wheels, tx: built.root.position.x, tz: built.root.position.z, trot: built.root.rotation.y, tvel: 0, lap: 1 }
      loadAvatar(scene, p.shirt || '', safeJSON(p.wearing), (av) => {
        av.parent = built.root; av.position.set(0, AV_Y, AV_Z); av.rotation = new Vector3(0, Math.PI, 0)
        av.getChildMeshes?.(false).forEach(m => sg.addShadowCaster(m))
      })
      remotes.set(sid, ent)
    }

    // ── Item-boxes + hazards/shells (alleen multiplayer) ──
    // Boxes dynamisch syncen uit de room-state: bij join is state.boxes vaak nog
    // leeg, dus maken we de mesh aan zodra een box verschijnt (net als bananen).
    const itemBoxMeshes = new Map()   // index → mesh
    const hazardMeshes = new Map()   // id → mesh
    const shellMeshes  = new Map()   // id → mesh

    // Item gebruiken
    const useItem = () => { if (mp) room.send('useItem') }
    useItemRef.current = useItem

    // ── Input ──
    const keys = {}
    const kd = e => {
      keys[e.key.toLowerCase()] = true
      if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); if (!rollingRef.current) useItem() }
    }
    const ku = e => { keys[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    // ── Physics state ──
    const phys = {
      vel: 0, maxSpeed: 34, accel: 26, brakeForce: 34, friction: 12,
      turnSpeed: 2.2, heading: gs.heading,
      lapsDone: 0, prevIdx: START_IDX, cumIdx: 0, lapStart: performance.now(),
      finished: false, sendAcc: 0,
      airborne: false, vy: 0, jumpCd: 0, padBoost: 0,   // sprong-ramps + boost-pads
    }
    stateRef.current = { phys, scene }

    // ── Race-fasen ──
    let cdTimer = null
    if (mp) {
      // Server bepaalt de fase; lobby-lijst + countdown via onStateChange
      let lastPhase = room.state.phase
      const sync = (state) => {
        const arr = []
        state.players?.forEach((p, sid) => arr.push({ sid, name: p.name, me: sid === sessionId, bot: p.isBot }))
        setPlayers(arr)
        setCount(state.countdown)
        if (state.phase !== lastPhase) {
          lastPhase = state.phase
          setPhase(state.phase)
          if (state.phase === 'racing') { phys.lapStart = performance.now(); stateRef.current.racing = true }
        }
      }
      sync(room.state)
      room.onStateChange(sync)
      if (room.state.phase === 'racing') { phys.lapStart = performance.now(); stateRef.current.racing = true }
    } else {
      let cd = 3
      setPhase('countdown'); setCount(3)
      cdTimer = setInterval(() => {
        cd -= 1
        if (cd <= 0) { clearInterval(cdTimer); setCount(0); setPhase('racing'); phys.lapStart = performance.now(); stateRef.current.racing = true }
        else setCount(cd)
      }, 1000)
    }

    // ── Render/physics loop ──
    let lastT = performance.now()
    engine.runRenderLoop(() => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now

      // Remote karts bijwerken + soepel interpoleren
      if (mp && room.state.players) {
        room.state.players.forEach((p, sid) => {
          if (sid === sessionId) return
          let e = remotes.get(sid)
          if (!e) { makeRemote(sid, p); e = remotes.get(sid) }
          e.tx = p.x; e.tz = p.z; e.trot = p.rotY; e.tvel = p.vel; e.lap = p.lap
        })
        for (const sid of [...remotes.keys()]) {
          if (!room.state.players.get(sid)) { remotes.get(sid).root.dispose(); remotes.delete(sid) }
        }
        const k = Math.min(1, dt * 12)
        remotes.forEach(e => {
          e.root.position.x += (e.tx - e.root.position.x) * k
          e.root.position.z += (e.tz - e.root.position.z) * k
          let dr = e.trot - e.root.rotation.y
          while (dr > Math.PI) dr -= Math.PI * 2; while (dr < -Math.PI) dr += Math.PI * 2
          e.root.rotation.y += dr * k
          e.wheels.forEach(w => { w.rotation.x += e.tvel * dt * 3 })
        })
      }

      const racing = mp ? (room.state.phase === 'racing') : stateRef.current.racing
      if (racing && !phys.finished) {
        const gas   = keys['w'] || keys['arrowup']
        const brake = keys['s'] || keys['arrowdown']
        const left  = keys['a'] || keys['arrowleft']
        const right = keys['d'] || keys['arrowright']

        // Eigen item-effecten (server-gestuurd via aftellende timers)
        const meP = mp ? room.state.players.get(sessionId) : null
        const spinning = !!(meP && meP.spin  > 0)
        const boosting = !!(meP && meP.boost > 0)
        const starring = !!(meP && meP.star  > 0)

        const near = nearestIdx(kartRoot.position)
        const offRoad = near.dist > ROAD_HW
        const fwd = new Vector3(Math.sin(phys.heading), 0, Math.cos(phys.heading))

        if (spinning) {
          // Geraakt → tollen + afremmen, even geen besturing
          phys.vel *= (1 - 3.5 * dt)
          kartRoot.rotation.y += 16 * dt
          kartRoot.position.addInPlace(fwd.scale(phys.vel * dt))
        } else {
          if (gas)        phys.vel += phys.accel * dt
          else if (brake) phys.vel -= phys.brakeForce * dt
          else { const f = phys.friction * TRACK_GRIP * dt; phys.vel = phys.vel > 0 ? Math.max(0, phys.vel - f) : Math.min(0, phys.vel + f) }

          // ── Boost-pad: rij over een chevron-strip → snelheidsboost ──
          if (!offRoad) for (const bi of BOOST_IDX) { let d2 = near.idx - bi; if (d2 > NSEG / 2) d2 -= NSEG; if (d2 < -NSEG / 2) d2 += NSEG; if (Math.abs(d2) <= 2) { phys.padBoost = 1.0; break } }
          phys.padBoost = Math.max(0, phys.padBoost - dt)

          let cap = offRoad ? phys.maxSpeed * 0.45 : phys.maxSpeed
          if (boosting)            cap = phys.maxSpeed * 1.7
          else if (phys.padBoost > 0) cap = phys.maxSpeed * 1.6
          else if (starring)       cap = phys.maxSpeed * 1.25
          phys.vel = Math.max(-phys.maxSpeed * 0.4, Math.min(cap, phys.vel))
          if (boosting) phys.vel = Math.max(phys.vel, phys.maxSpeed * 1.35)   // duwt naar boost-snelheid
          else if (phys.padBoost > 0) phys.vel = Math.max(phys.vel, phys.maxSpeed * 1.3)
          if (offRoad && !boosting && !starring) phys.vel *= (1 - 1.5 * dt)

          // ── Sprong-ramp: lanceer de kart de lucht in (lokaal; y wordt niet gesynct) ──
          if (!phys.airborne && phys.jumpCd <= 0 && !offRoad && phys.vel > phys.maxSpeed * 0.5) {
            for (const ri of RAMP_IDX) { let d2 = near.idx - ri; if (d2 > NSEG / 2) d2 -= NSEG; if (d2 < -NSEG / 2) d2 += NSEG; if (Math.abs(d2) <= 2) { phys.airborne = true; phys.vy = 7 + phys.vel * 0.45; phys.jumpCd = 1.3; phys.vel = Math.min(phys.maxSpeed * 1.25, phys.vel * 1.05); break } }
          }
          phys.jumpCd = Math.max(0, phys.jumpCd - dt)

          const steer = (right ? 1 : 0) - (left ? 1 : 0)
          const speedFactor = Math.min(1, Math.abs(phys.vel) / 6)
          phys.heading += steer * phys.turnSpeed * TRACK_GRIP * dt * speedFactor * Math.sign(phys.vel || 1)
          kartRoot.rotation.y = phys.heading

          kartRoot.position.addInPlace(fwd.scale(phys.vel * dt))

          // ── BEUKEN: botsing met andere karts (push apart + snelheidsverlies) ──
          const BUMP = 1.6
          remotes.forEach(e => {
            let dx = kartRoot.position.x - e.root.position.x
            let dz = kartRoot.position.z - e.root.position.z
            const d = Math.hypot(dx, dz)
            if (d > 0.001 && d < BUMP) {
              const overlap = BUMP - d
              dx /= d; dz /= d
              kartRoot.position.x += dx * overlap
              kartRoot.position.z += dz * overlap
              const into = -(fwd.x * dx + fwd.z * dz)   // >0 = ik ram erop in
              if (into > 0 && !starring) phys.vel *= 0.55   // klap → snelheid eruit (niet met ster)
              phys.vel += 6 * overlap                       // kleine terugstoot-impuls
              phys.vel = Math.min(phys.vel, phys.maxSpeed * (boosting ? 1.7 : 1))
            }
          })
        }

        // ── Sprong-hoogte (lokaal, eigen kart) ──
        if (phys.airborne) {
          kartRoot.position.y += phys.vy * dt
          phys.vy -= 24 * dt
          if (kartRoot.position.y <= 0) { kartRoot.position.y = 0; phys.airborne = false; phys.vy = 0 }
        }

        wheels.forEach(w => { w.rotation.x += phys.vel * dt * 3 })

        let dI = near.idx - phys.prevIdx
        if (dI >  NSEG / 2) dI -= NSEG
        if (dI < -NSEG / 2) dI += NSEG
        phys.cumIdx += dI
        phys.prevIdx = near.idx

        const totalLaps = mp ? (room.state.laps || 3) : (TRACKS[trackId]?.laps || 3)
        if (phys.cumIdx >= NSEG * (phys.lapsDone + 1)) {
          phys.lapsDone += 1
          if (phys.lapsDone >= totalLaps) {
            phys.finished = true
            stateRef.current.racing = false
            const total = (performance.now() - phys.lapStart) / 1000
            setResult({ time: total })
            setPhase('finished')
            if (mp) room.send('finished')
          } else { phys.lapStart = performance.now(); setLap(phys.lapsDone + 1) }
        }

        // Eigen state naar de server (~25 Hz)
        if (mp) {
          phys.sendAcc += dt
          if (phys.sendAcc >= 0.04) {
            phys.sendAcc = 0
            room.send('state', { x: kartRoot.position.x, z: kartRoot.position.z, rotY: phys.heading, vel: phys.vel, lap: phys.lapsDone + 1 })
          }
        }

        // Klassement (mp): rangschik op voortgang = lap*NSEG + index
        if (mp) {
          const myProg = (phys.lapsDone + 1) * NSEG + phys.cumIdx % NSEG
          let pos = 1
          remotes.forEach(e => {
            const eProg = e.lap * NSEG + nearestIdx(e.root.position).idx
            if (eProg > myProg) pos++
          })
          setPlace({ pos, total: room.state.players?.size ?? 1 })
        }

        setSpeed(Math.round(Math.abs(phys.vel) * 3.6))
        setLapTime((performance.now() - phys.lapStart) / 1000)
      }

      // ── Item-visuals (elke frame, ook tijdens countdown) ──
      if (mp) try {
        // Boxes draaien + op/neer + zichtbaarheid via active (mesh op aanvraag)
        if (room.state.boxes) {
          room.state.boxes.forEach((box, i) => {
            let m = itemBoxMeshes.get(i)
            if (!m) { m = makeItemBox(scene, box.x, box.z); itemBoxMeshes.set(i, m) }
            m.rotation.y += dt * 2.2
            m.position.y = 1.1 + Math.sin(now / 400 + i) * 0.18
            m.setEnabled(box.active)
          })
          const n = room.state.boxes.length
          for (const i of [...itemBoxMeshes.keys()]) {
            if (i >= n) { itemBoxMeshes.get(i).dispose(); itemBoxMeshes.delete(i) }
          }
        }
        // Bananen syncen
        if (room.state.hazards) {
          room.state.hazards.forEach((h, id) => {
            let m = hazardMeshes.get(id)
            if (!m) { m = makeHazardMesh(scene); hazardMeshes.set(id, m) }
            m.position.set(h.x, 0.45, h.z)
          })
          for (const id of [...hazardMeshes.keys()]) {
            if (!room.state.hazards.get(id)) { hazardMeshes.get(id).dispose(); hazardMeshes.delete(id) }
          }
        }
        // Schilden (projectielen) syncen
        if (room.state.shells) {
          room.state.shells.forEach((s, id) => {
            let m = shellMeshes.get(id)
            if (!m) { m = makeShellMesh(scene); shellMeshes.set(id, m) }
            m.position.set(s.x, 0.6, s.z); m.rotation.y += dt * 8
          })
          for (const id of [...shellMeshes.keys()]) {
            if (!room.state.shells.get(id)) { shellMeshes.get(id).dispose(); shellMeshes.delete(id) }
          }
        }
        // HUD: vastgehouden item + effect-tint op eigen kart
        const meP2 = room.state.players.get(sessionId)
        const it = meP2?.item || ''
        if (it !== phys._lastItem) { phys._lastItem = it; setHeldItem(it) }
        const fx = meP2 ? (meP2.spin > 0 ? 'spin' : meP2.star > 0 ? 'star' : meP2.boost > 0 ? 'boost' : '') : ''
        if (fx !== phys._lastFx) { phys._lastFx = fx; setFxFlash(fx) }
      } catch (e) { /* item-visuals fout mag de race nooit breken */ }

      scene.render()
    })

    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)

    return () => {
      if (cdTimer) clearInterval(cdTimer)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      window.removeEventListener('resize', onResize)
      scene.dispose(); engine.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalLaps = mp ? (room.state.laps || 3) : (TRACKS[trackId]?.laps || 3)

  return (
    <div className="kart-wrap">
      <OrientationGate />
      <canvas ref={canvasRef} className="kart-canvas" />
      <button className="kart-exit" onClick={onBack}>← {mp ? 'Verlaten' : 'Kledingkast'}</button>

      {mp && phase === 'lobby' && (
        <div className="kart-lobby-wait">
          <h1>🏎️ Wachtkamer</h1>
          {joinCode && <p className="kart-lobby-code">Code: <strong>{joinCode}</strong></p>}
          <p>Deel de code en wacht tot iedereen er is.</p>
          <ul className="kart-lobby-list">
            {players.map(p => <li key={p.sid} className={p.me ? 'me' : ''}>{p.me ? '⭐ ' : (p.bot ? '🤖 ' : '🏎️ ')}{p.name}</li>)}
          </ul>
          <div className="kart-diff-row">
            {['makkelijk', 'normaal', 'moeilijk'].map(d => (
              <button key={d} className={'kart-diff-btn' + (botDiff === d ? ' on' : '')} onClick={() => setBotDiff(d)}>
                {d === 'makkelijk' ? '😊 Makkelijk' : d === 'normaal' ? '😐 Normaal' : '😈 Moeilijk'}
              </button>
            ))}
          </div>
          <div className="kart-bot-row">
            <button className="kart-bot-btn" onClick={() => room.send('addBot', botDiff)}>🤖 Bot erbij</button>
            <button className="kart-bot-btn" onClick={() => room.send('removeBot')}>➖ Bot eraf</button>
          </div>
          <button className="kart-start-btn" onClick={startRace}>Start race! ({players.length})</button>
        </div>
      )}

      {phase !== 'finished' && phase !== 'lobby' && (
        <div className="kart-hud">
          <div className="kart-hud-lap">Ronde {lap} / {totalLaps}</div>
          <div className="kart-hud-time">⏱ {lapTime.toFixed(1)}s</div>
          <div className="kart-hud-speed">{speed}<span>km/u</span></div>
          <div className="kart-hud-pos">{mp ? `${place.pos}e / ${place.total}` : '1e / 1'}</div>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="kart-count">{count > 0 ? count : 'GO!'}</div>
      )}

      {/* Item-HUD (alleen online/met bots) */}
      {mp && phase !== 'finished' && phase !== 'lobby' && (
        <button
          className={'kart-item-btn' + (heldItem ? ' has-item' : '') + (spinEmoji ? ' rolling' : '')}
          onClick={() => useItemRef.current()}
          disabled={!heldItem || !!spinEmoji}
        >
          <span className="kart-item-emoji">{spinEmoji ? spinEmoji : (heldItem ? ITEM_INFO[heldItem]?.emoji : '❔')}</span>
          <span className="kart-item-label">{spinEmoji ? '…' : (heldItem ? ITEM_INFO[heldItem]?.label : 'Geen item')}</span>
          {heldItem && !spinEmoji && <span className="kart-item-use">Gebruik · spatie</span>}
        </button>
      )}
      {mp && fxFlash && <div className={'kart-fx kart-fx-' + fxFlash} />}

      {phase === 'finished' && result && (
        <div className="kart-finish">
          <h1>🏁 FINISH!</h1>
          <p className="kart-finish-time">Totaaltijd: {result.time.toFixed(1)}s</p>
          {mp && <p className="kart-finish-time">Plek: {place.pos}e van {place.total}</p>}
          <div className="kart-finish-btns">
            {!mp && <button onClick={() => window.location.reload()}>🔁 Opnieuw</button>}
            <button onClick={onBack}>👕 {mp ? 'Lobby verlaten' : 'Kledingkast'}</button>
          </div>
        </div>
      )}

      <div className="kart-help">W/↑ gas · S/↓ rem · A/← D/→ sturen{mp ? ' · spatie = item · pak de ❔-blokken!' : ''}</div>
    </div>
  )
}

// ── Menu + lobby + wrapper ──────────────────────────────────────────────
export default function KartGame({ onBack }) {
  const [screen, setScreen] = useState('menu')   // menu | solo | lobby | race
  const [room, setRoom] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [joinCode, setJoinCode] = useState(null)
  const [selTrack, setSelTrack] = useState('groen')
  const [raceTrack, setRaceTrack] = useState('groen')

  if (screen === 'race' && room) {
    return <KartRace onBack={() => { try { room.leave() } catch {} ; setRoom(null); setScreen('menu') }} room={room} sessionId={sessionId} joinCode={joinCode} track={raceTrack} />
  }

  if (screen === 'lobby') {
    return <KartLobby
      track={selTrack}
      onBack={() => setScreen('menu')}
      onJoined={(r, jc) => { setRoom(r); setSessionId(r.sessionId); setJoinCode(jc); setRaceTrack(r.state?.track || selTrack); setScreen('race') }}
    />
  }

  return (
    <div className="kart-menu">
      <button className="kart-exit" onClick={onBack}>← Kledingkast</button>
      <div className="kart-menu-box">
        <div className="kart-menu-icon">🏎️</div>
        <h1 className="kart-menu-title">Karten</h1>
        <p className="kart-menu-sub">Kies een baan</p>
        <TrackPicker value={selTrack} onChange={setSelTrack} />
        <button className="kart-menu-btn online" onClick={() => setScreen('lobby')}>🌍 Online — beuk tegen vrienden (of bots)</button>
      </div>
    </div>
  )
}

// Baan-keuze (3 banen oplopend in moeilijkheid)
function TrackPicker({ value, onChange }) {
  const ICON = { groen: '🌳', woud: '🌲', bergen: '⛰️', vuur: '🌋', ijs: '❄️', regenboog: '🌈' }
  return (
    <div className="kart-track-pick">
      {TRACK_IDS.map(id => (
        <button key={id} type="button"
          className={'kart-track-card' + (value === id ? ' on' : '')}
          onClick={() => onChange(id)}>
          <span className="kt-icon">{ICON[id]}</span>
          <span className="kt-name">{TRACKS[id].name}</span>
          <span className="kt-diff">{TRACKS[id].diff}</span>
        </button>
      ))}
    </div>
  )
}

// ── Lobby: code aanmaken / joinen (zelfde server als voetbal & paintball) ─
function KartLobby({ onBack, onJoined, track = 'groen' }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState(() => localStorage.getItem('kk_playername') || '')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const connect = async (create) => {
    setLoading(true); setError(null)
    try {
      const shirt = localStorage.getItem('kk_shirt') || ''
      const wearing = localStorage.getItem('kk_wearing') || '{}'
      const client = new Colyseus.Client(SERVER_URL)
      const joinCode = create ? String(Math.floor(1000 + Math.random() * 9000)) : code.trim()
      const opts = { joinCode, shirt, wearing, name: name || 'Speler', track, laps: TRACKS[track]?.laps || 3 }
      const room = create ? await client.create('kart', opts) : await client.join('kart', opts)
      if (name) localStorage.setItem('kk_playername', name)
      onJoined(room, joinCode)
    } catch { setError(create ? 'Kan geen race aanmaken.' : 'Race niet gevonden.'); setLoading(false) }
  }

  return (
    <div className="kart-menu">
      <button className="kart-exit" onClick={onBack}>← Terug</button>
      <div className="kart-menu-box">
        <div className="kart-menu-icon">🌍</div>
        <h1 className="kart-menu-title">Online karten</h1>
        <div className="kart-lobby-field">
          <label>Jouw naam</label>
          <input className="kart-input" placeholder="Speler" value={name} maxLength={12} onChange={e => setName(e.target.value)} />
        </div>
        <button className="kart-menu-btn online" disabled={loading} onClick={() => connect(true)}>➕ Nieuwe race (maak code)</button>
        <div className="kart-lobby-field">
          <label>Of join met code</label>
          <input className="kart-input" placeholder="bv. 1234" value={code} maxLength={6} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
        </div>
        <button className="kart-menu-btn solo" disabled={loading || code.trim().length < 1} onClick={() => connect(false)}>🔑 Join race</button>
        {error && <p className="kart-lobby-err">{error}</p>}
        {loading && <p className="kart-lobby-info">Verbinden…</p>}
      </div>
    </div>
  )
}

// ── Procedurele baan (thema per baan) ───────────────────────────────────
function buildTrack(scene, sg, id) {
  const theme = (TRACKS[id] || TRACKS.groen).theme
  // baan-grenzen
  let maxR = 0
  for (const c of CENTER) maxR = Math.max(maxR, Math.hypot(c.x, c.z))

  // Skydome met verticale gradient
  const sky = MeshBuilder.CreateSphere('sky', { diameter: (maxR + 120) * 2, segments: 16 }, scene)
  const skyTex = new DynamicTexture('skyTex', { width: 8, height: 256 }, scene, false)
  const sx = skyTex.getContext()
  const grad = sx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, theme.sky[1]); grad.addColorStop(1, theme.sky[0])
  sx.fillStyle = grad; sx.fillRect(0, 0, 8, 256); skyTex.update()
  const skyMat = new StandardMaterial('skyMat', scene)
  skyMat.emissiveTexture = skyTex; skyMat.disableLighting = true; skyMat.backFaceCulling = false
  skyMat.diffuseColor = Color3.Black(); skyMat.specularColor = Color3.Black()
  sky.material = skyMat; sky.isPickable = false
  scene.clearColor = new Color4(...hexRgb(theme.sky[0]), 1)
  scene.fogMode = Scene.FOGMODE_LINEAR; scene.fogStart = maxR + 40; scene.fogEnd = maxR + 130
  scene.fogColor = new Color3(...hexRgb(theme.sky[1]))

  // Gras-ondergrond
  const grass = MeshBuilder.CreateGround('grass', { width: (maxR + 80) * 2, height: (maxR + 80) * 2 }, scene)
  const gMat = new StandardMaterial('gMat', scene)
  gMat.diffuseColor = new Color3(...theme.grass); gMat.specularColor = Color3.Black()
  grass.material = gMat; grass.receiveShadows = true; grass.position.y = -0.02

  // Curb-textuur (rood/wit)
  const curbTex = new DynamicTexture('curbTex', { width: 64, height: 16 }, scene, false)
  const cctx = curbTex.getContext()
  for (let i = 0; i < 8; i++) { cctx.fillStyle = i % 2 ? '#d6263a' : '#f4f4f4'; cctx.fillRect(i * 8, 0, 8, 16) }
  curbTex.update(); curbTex.wrapU = curbTex.wrapV = 1

  // Asfalt + curbs + witte randlijnen via ribbons langs de centerline
  const inner = [], outer = [], curbInA = [], curbInB = [], curbOutA = [], curbOutB = []
  const lineInA = [], lineInB = [], lineOutA = [], lineOutB = []
  for (let i = 0; i <= NSEG; i++) {
    const c = CENTER[i % NSEG], n = normalAt(i % NSEG)
    inner.push(new Vector3(c.x - n.x * ROAD_HW, 0.01, c.z - n.z * ROAD_HW))
    outer.push(new Vector3(c.x + n.x * ROAD_HW, 0.01, c.z + n.z * ROAD_HW))
    curbInB.push(new Vector3(c.x - n.x * ROAD_HW, 0.03, c.z - n.z * ROAD_HW))
    curbInA.push(new Vector3(c.x - n.x * (ROAD_HW + 0.9), 0.03, c.z - n.z * (ROAD_HW + 0.9)))
    curbOutA.push(new Vector3(c.x + n.x * ROAD_HW, 0.03, c.z + n.z * ROAD_HW))
    curbOutB.push(new Vector3(c.x + n.x * (ROAD_HW + 0.9), 0.03, c.z + n.z * (ROAD_HW + 0.9)))
    lineInA.push(new Vector3(c.x - n.x * (ROAD_HW - 0.25), 0.04, c.z - n.z * (ROAD_HW - 0.25)))
    lineInB.push(new Vector3(c.x - n.x * (ROAD_HW - 0.55), 0.04, c.z - n.z * (ROAD_HW - 0.55)))
    lineOutA.push(new Vector3(c.x + n.x * (ROAD_HW - 0.25), 0.04, c.z + n.z * (ROAD_HW - 0.25)))
    lineOutB.push(new Vector3(c.x + n.x * (ROAD_HW - 0.55), 0.04, c.z + n.z * (ROAD_HW - 0.55)))
  }
  const road = MeshBuilder.CreateRibbon('road', { pathArray: [inner, outer] }, scene)
  const rMat = new StandardMaterial('rMat', scene)
  rMat.diffuseColor = new Color3(0.26, 0.26, 0.29); rMat.specularColor = new Color3(0.05, 0.05, 0.05)
  rMat.backFaceCulling = false
  road.material = rMat; road.receiveShadows = true

  const whiteMat = new StandardMaterial('whiteMat', scene)
  whiteMat.diffuseColor = new Color3(0.92, 0.92, 0.92); whiteMat.emissiveColor = new Color3(0.25, 0.25, 0.25); whiteMat.backFaceCulling = false
  MeshBuilder.CreateRibbon('lineIn', { pathArray: [lineInA, lineInB] }, scene).material = whiteMat
  MeshBuilder.CreateRibbon('lineOut', { pathArray: [lineOutA, lineOutB] }, scene).material = whiteMat

  const curbMat = new StandardMaterial('curbMat', scene)
  curbMat.diffuseTexture = curbTex; curbMat.specularColor = Color3.Black(); curbMat.backFaceCulling = false
  MeshBuilder.CreateRibbon('curbIn', { pathArray: [curbInA, curbInB] }, scene).material = curbMat
  MeshBuilder.CreateRibbon('curbOut', { pathArray: [curbOutA, curbOutB] }, scene).material = curbMat

  // Onderbroken middenlijn
  for (let i = 0; i < NSEG; i += 10) {
    const c = CENTER[i], t = tangentAt(i)
    const dash = MeshBuilder.CreateGround('dash' + i, { width: 0.35, height: 2.4 }, scene)
    dash.material = whiteMat; dash.position.set(c.x, 0.035, c.z)
    dash.rotation.y = Math.atan2(t.x, t.z)
  }

  // Start/finish-streep — recht over de baan, loodrecht op de rijrichting
  const sc = ringPos(START_IDX)
  const sh = Math.atan2(tangentAt(START_IDX).x, tangentAt(START_IDX).z)
  const finishMat = new StandardMaterial('finMat', scene)
  const dt = new DynamicTexture('finTex', { width: 256, height: 64 }, scene, false)
  const ctx = dt.getContext()
  for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) {
    ctx.fillStyle = (x + y) % 2 ? '#fff' : '#111'
    ctx.fillRect(x * 16, y * 16, 16, 16)
  }
  dt.update(); finishMat.diffuseTexture = dt
  const strip = MeshBuilder.CreateGround('finish', { width: ROAD_HW * 2, height: 3 }, scene)
  strip.material = finishMat; strip.position.set(sc.x, 0.05, sc.z); strip.rotation.y = sh

  // Banner-poort
  const nrm = normalAt(START_IDX)
  const poleMat = new StandardMaterial('poleMat', scene)
  poleMat.diffuseColor = Color3.FromHexString(theme.accent)
  ;[-1, 1].forEach(s => {
    const pole = MeshBuilder.CreateCylinder('pole', { height: 6, diameter: 0.5 }, scene)
    pole.material = poleMat
    pole.position.set(sc.x + nrm.x * s * (ROAD_HW + 1), 3, sc.z + nrm.z * s * (ROAD_HW + 1))
  })
  const top = MeshBuilder.CreateBox('bannerTop', { width: ROAD_HW * 2 + 3, height: 1.2, depth: 0.4 }, scene)
  top.material = poleMat; top.position.set(sc.x, 6, sc.z); top.rotation.y = sh

  // ── Speciale baan-elementen: boost-pads (chevrons) + sprong-ramps ──
  const accent = theme.accent || '#ffd23f'
  if (BOOST_IDX.length) {
    const boostTex = new DynamicTexture('boostTex', { width: 64, height: 128 }, scene, false)
    const bx = boostTex.getContext()
    bx.clearRect(0, 0, 64, 128)
    bx.fillStyle = 'rgba(0,0,0,0.30)'; bx.fillRect(0, 0, 64, 128)
    bx.strokeStyle = accent; bx.lineWidth = 9; bx.lineCap = 'round'
    for (let r = 0; r < 3; r++) { const yy = 26 + r * 40; bx.beginPath(); bx.moveTo(8, yy + 18); bx.lineTo(32, yy - 8); bx.lineTo(56, yy + 18); bx.stroke() }
    boostTex.update(); boostTex.hasAlpha = true
    const boostMat = new StandardMaterial('boostMat', scene)
    boostMat.diffuseTexture = boostTex; boostMat.diffuseTexture.hasAlpha = true
    boostMat.emissiveColor = Color3.FromHexString(accent)
    boostMat.specularColor = Color3.Black(); boostMat.backFaceCulling = false; boostMat.useAlphaFromDiffuseTexture = true
    BOOST_IDX.forEach((idx, i) => {
      const c = ringPos(idx), t = tangentAt(idx)
      const pad = MeshBuilder.CreateGround('boostpad' + i, { width: ROAD_HW * 1.4, height: 7 }, scene)
      pad.material = boostMat; pad.position.set(c.x, 0.06, c.z); pad.rotation.y = Math.atan2(t.x, t.z)
    })
  }
  if (RAMP_IDX.length) {
    const rampMat = new StandardMaterial('rampMat', scene)
    rampMat.diffuseColor = Color3.FromHexString(accent); rampMat.emissiveColor = Color3.FromHexString(accent).scale(0.35); rampMat.specularColor = Color3.Black()
    const rampEdge = new StandardMaterial('rampEdge', scene)
    rampEdge.emissiveColor = Color3.FromHexString(accent); rampEdge.disableLighting = true
    RAMP_IDX.forEach((idx, i) => {
      const c = ringPos(idx), t = tangentAt(idx), ang = Math.atan2(t.x, t.z)
      const ramp = MeshBuilder.CreateBox('ramp' + i, { width: ROAD_HW * 1.7, height: 0.5, depth: 6 }, scene)
      ramp.material = rampMat; ramp.position.set(c.x, 0.85, c.z); ramp.rotation.y = ang; ramp.rotation.x = 0.3
      ramp.receiveShadows = true; sg.addShadowCaster(ramp)
      const lip = MeshBuilder.CreateBox('rampLip' + i, { width: ROAD_HW * 1.7, height: 0.14, depth: 0.5 }, scene)
      lip.material = rampEdge; lip.position.set(c.x, 1.55, c.z); lip.rotation.y = ang
    })
  }

  // ── Decor: bomen + rotsen, alleen ver genoeg van de baan ──
  const trunkMat = new StandardMaterial('trunkMat', scene)
  trunkMat.diffuseColor = new Color3(0.4, 0.26, 0.13); trunkMat.specularColor = Color3.Black()
  const leafMat = new StandardMaterial('leafMat', scene)
  leafMat.diffuseColor = new Color3(theme.grass[0] * 0.7, theme.grass[1] * 0.85, theme.grass[2] * 0.7); leafMat.specularColor = Color3.Black()
  const rockMat = new StandardMaterial('rockMat', scene)
  rockMat.diffuseColor = new Color3(0.45, 0.43, 0.4); rockMat.specularColor = Color3.Black()

  const span = maxR + 34
  const placeOk = (x, z) => nearestIdx(new Vector3(x, 0, z)).dist > ROAD_HW + 5
  const scatter = (count, make) => {
    let n = 0, tries = 0
    while (n < count && tries < count * 12) {
      tries++
      const x = (Math.random() * 2 - 1) * span, z = (Math.random() * 2 - 1) * span
      if (Math.hypot(x, z) > span) continue
      if (!placeOk(x, z)) continue
      make(x, z, n); n++
    }
  }
  scatter(theme.trees, (x, z, i) => {
    const s = 0.8 + Math.random() * 0.9
    const trunk = MeshBuilder.CreateCylinder('tr' + i, { height: 2 * s, diameter: 0.6 * s, tessellation: 6 }, scene)
    trunk.material = trunkMat; trunk.position.set(x, s, z)
    const leaves = MeshBuilder.CreateCylinder('lf' + i, { height: 4 * s, diameterTop: 0, diameterBottom: 3 * s, tessellation: 8 }, scene)
    leaves.material = leafMat; leaves.position.set(x, 4 * s, z)
    sg.addShadowCaster(trunk); sg.addShadowCaster(leaves)
  })
  scatter(theme.rocks, (x, z, i) => {
    const s = 1.2 + Math.random() * 2.6
    const rock = MeshBuilder.CreatePolyhedron('rk' + i, { type: Math.floor(Math.random() * 4), size: s }, scene)
    rock.material = rockMat; rock.position.set(x, s * 0.5, z)
    rock.rotation.set(Math.random(), Math.random() * 6, Math.random())
    sg.addShadowCaster(rock); rock.receiveShadows = true
  })
}

// hex '#rrggbb' → [r,g,b] in 0..1
function hexRgb(hex) {
  const c = Color3.FromHexString(hex)
  return [c.r, c.g, c.b]
}
