import { useEffect, useRef, useState } from 'react'
import {
  Engine, Scene, FollowCamera,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  Vector3, Color3, Color4,
  MeshBuilder, StandardMaterial, DynamicTexture, TransformNode,
} from '@babylonjs/core'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'
import * as Colyseus from '@colyseus/sdk'
import { findItem } from '../itemsCatalog'
import { applyItemToMesh, loadClothingDonor, usesDonor } from '../applyClothing'
import './kart-game.css'

const SERVER_URL = 'wss://kenniskist-server.onrender.com'

// ── Banen ───────────────────────────────────────────────────────────────
const NSEG = 400          // centerline-resolutie
const KART_SCALE = 1.0    // kart op maat van het (native) poppetje
const AV_Y = -0.12        // zithoogte avatar in de kart
const AV_Z = -0.12        // voor/achter-positie avatar
const KART_COLORS = ['#e63946', '#1d6fd0', '#2a9d8f', '#e9c46a', '#9b5de5', '#f4a261', '#43aa8b', '#ff6b6b']

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

// 3 banen: makkelijk (ovaal) → moeilijker (meer bochten) → moeilijkst (smal + scherp)
const TRACKS = {
  groen: {
    name: 'Groene Weide', diff: 'Makkelijk', laps: 3, roadHW: 7.2,
    path: (N) => stadiumPath(N, 36, 26),
    theme: { grass: [0.34, 0.62, 0.31], sky: ['#7ec8ff', '#dff1ff'], trees: 34, rocks: 0, accent: '#e9c46a' },
  },
  woud: {
    name: 'Boscircuit', diff: 'Lastig', laps: 3, roadHW: 6,
    path: (N) => polarPath(N, (a) => 48 + 12 * Math.cos(2 * a) + 7 * Math.cos(3 * a)),
    theme: { grass: [0.2, 0.42, 0.22], sky: ['#6fae8f', '#cfe8d6'], trees: 80, rocks: 6, accent: '#7ad67a' },
  },
  bergen: {
    name: 'Bergpas', diff: 'Moeilijk', laps: 4, roadHW: 5,
    path: (N) => polarPath(N, (a) => 44 + 10 * Math.cos(2 * a) + 9 * Math.sin(3 * a) + 6 * Math.cos(5 * a)),
    theme: { grass: [0.5, 0.46, 0.38], sky: ['#c79a86', '#f0ddcf'], trees: 22, rocks: 30, accent: '#d98a5a' },
  },
}
const TRACK_IDS = ['groen', 'woud', 'bergen']

// Actieve baan (mutabel; gezet via setTrack vóór het bouwen)
let CENTER = []
let ROAD_HW = 7
let TOTAL_LAPS = 3
let CUR_TRACK = 'groen'
let START_IDX = 0

function setTrack(id) {
  const t = TRACKS[id] || TRACKS.groen
  CUR_TRACK = TRACKS[id] ? id : 'groen'
  CENTER = t.path(NSEG)
  ROAD_HW = t.roadHW
  TOTAL_LAPS = t.laps
  START_IDX = computeStartIdx()
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

const RETARGET_BONES = new Set([
  'Root','Hips','Spine','Spine1','Neck','Head',
  'LeftShoulder','LeftArm','LeftForeArm','LeftHand',
  'RightShoulder','RightArm','RightForeArm','RightHand',
  'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase',
  'RightUpLeg','RightLeg','RightFoot','RightToeBase',
])
const CLOTHING_NAMES = new Set(['Shirt','Broek','Sokken','Schoenen'])
const FACE_NAMES     = new Set(['Gezicht','Face','Ogen','Eyes','Wenkbrauwen','Eyebrows','Mond','Mouth','Neus','Nose'])

// ── Procedurele kart (alles onder één TransformNode) ────────────────────
function buildKart(scene, hex, idSuffix) {
  const root = new TransformNode('kartRoot_' + idSuffix, scene)
  const chassis = new TransformNode('chassis_' + idSuffix, scene)
  chassis.parent = root; chassis.scaling = new Vector3(KART_SCALE, KART_SCALE, KART_SCALE)
  const c = Color3.FromHexString(hex)
  const bodyMat = new StandardMaterial('kbody' + idSuffix, scene)
  bodyMat.diffuseColor = c; bodyMat.specularColor = new Color3(0.5, 0.5, 0.5)
  const accentMat = new StandardMaterial('kacc' + idSuffix, scene)
  accentMat.diffuseColor = c.scale(0.55); accentMat.specularColor = new Color3(0.3, 0.3, 0.3)
  const tireMat = new StandardMaterial('ktire' + idSuffix, scene)
  tireMat.diffuseColor = new Color3(0.08, 0.08, 0.09); tireMat.specularColor = new Color3(0.2, 0.2, 0.2)
  const rimMat = new StandardMaterial('krim' + idSuffix, scene)
  rimMat.diffuseColor = new Color3(0.78, 0.8, 0.85); rimMat.specularColor = new Color3(0.6, 0.6, 0.6)
  const darkMat = new StandardMaterial('kdark' + idSuffix, scene)
  darkMat.diffuseColor = new Color3(0.13, 0.13, 0.16)
  const greyMat = new StandardMaterial('kgrey' + idSuffix, scene)
  greyMat.diffuseColor = new Color3(0.55, 0.57, 0.6); greyMat.specularColor = new Color3(0.5, 0.5, 0.5)

  // Lage chassis-plaat
  const floor = MeshBuilder.CreateBox('kfloor', { width: 1.4, height: 0.18, depth: 2.9 }, scene)
  floor.material = darkMat; floor.position.y = 0.32; floor.parent = chassis
  // Zijpods (body-kleur)
  ;[-0.78, 0.78].forEach((sx, i) => {
    const pod = MeshBuilder.CreateBox('kpod' + i, { width: 0.42, height: 0.34, depth: 1.5 }, scene)
    pod.material = bodyMat; pod.position.set(sx, 0.42, -0.1); pod.parent = chassis
  })
  // Neus: aflopende motorkap die naar voren smaller/lager wordt
  const hood = MeshBuilder.CreateBox('khood', { width: 1.0, height: 0.3, depth: 1.1 }, scene)
  hood.material = bodyMat; hood.position.set(0, 0.42, 1.0); hood.rotation.x = -0.16; hood.parent = chassis
  const noseTip = MeshBuilder.CreateBox('knose', { width: 0.55, height: 0.18, depth: 0.7 }, scene)
  noseTip.material = bodyMat; noseTip.position.set(0, 0.34, 1.65); noseTip.rotation.x = -0.16; noseTip.parent = chassis
  // Frontvleugel (breed, laag)
  const fwing = MeshBuilder.CreateBox('kfwing', { width: 1.7, height: 0.08, depth: 0.4 }, scene)
  fwing.material = accentMat; fwing.position.set(0, 0.26, 1.95); fwing.parent = chassis
  // Cockpit-rand + zitkuip
  const cowl = MeshBuilder.CreateBox('kcowl', { width: 1.1, height: 0.42, depth: 1.2 }, scene)
  cowl.material = accentMat; cowl.position.set(0, 0.48, -0.05); cowl.parent = chassis
  const seat = MeshBuilder.CreateBox('kseat', { width: 0.66, height: 0.6, depth: 0.22 }, scene)
  seat.material = darkMat; seat.position.set(0, 0.72, -0.62); seat.parent = chassis
  // Stuurkolom + stuur
  const col = MeshBuilder.CreateCylinder('kcol', { height: 0.55, diameter: 0.07, tessellation: 8 }, scene)
  col.material = greyMat; col.rotation.x = 0.7; col.position.set(0, 0.78, 0.5); col.parent = chassis
  const wheel = MeshBuilder.CreateTorus('ksteer', { diameter: 0.42, thickness: 0.07, tessellation: 18 }, scene)
  wheel.material = darkMat; wheel.rotation.x = 1.0; wheel.position.set(0, 0.92, 0.66); wheel.parent = chassis
  // Achtervleugel
  ;[-0.45, 0.45].forEach((sx, i) => {
    const post = MeshBuilder.CreateBox('kwp' + i, { width: 0.08, height: 0.45, depth: 0.08 }, scene)
    post.material = darkMat; post.position.set(sx, 0.7, -1.4); post.parent = chassis
  })
  const wing = MeshBuilder.CreateBox('kwing', { width: 1.5, height: 0.07, depth: 0.5 }, scene)
  wing.material = accentMat; wing.position.set(0, 0.95, -1.45); wing.parent = chassis
  // Uitlaat
  ;[-0.18, 0.18].forEach((sx, i) => {
    const exh = MeshBuilder.CreateCylinder('kexh' + i, { height: 0.6, diameter: 0.12, tessellation: 8 }, scene)
    exh.rotation.x = Math.PI / 2; exh.material = greyMat
    exh.position.set(sx, 0.55, -1.6); exh.parent = chassis
  })

  // Wielen: band + velg
  const wheels = []
  const wheelDef = [[-0.82, 1.05], [0.82, 1.05], [-0.82, -1.05], [0.82, -1.05]]
  wheelDef.forEach(([wx, wz], i) => {
    const hub = new TransformNode('khub' + i, scene)
    hub.position.set(wx, 0.4, wz); hub.parent = chassis
    const tire = MeshBuilder.CreateCylinder('kw' + i, { height: 0.42, diameter: 0.8, tessellation: 18 }, scene)
    tire.rotation.z = Math.PI / 2; tire.material = tireMat; tire.parent = hub
    const rim = MeshBuilder.CreateCylinder('krimM' + i, { height: 0.44, diameter: 0.4, tessellation: 10 }, scene)
    rim.rotation.z = Math.PI / 2; rim.material = rimMat; rim.parent = hub
    wheels.push(tire)
  })

  return { root, wheels }
}

// ── Avatar-loader: Poppetje + kleding + rust-idle, gezeten in de kart ───
function loadAvatar(scene, shirt, wearing, onReady) {
  SceneLoader.ImportMesh('', '/', 'Poppetje.glb', scene, (meshes, _ps, skels) => {
    const root = meshes[0]
    const skeleton = skels[0] ?? null
    const nodeMap = {}
    scene.transformNodes.forEach(n => { nodeMap[n.name] = n })
    scene.meshes.forEach(m => { if (!nodeMap[m.name]) nodeMap[m.name] = m })

    // Kleding
    meshes.forEach(m => {
      if (!CLOTHING_NAMES.has(m.name)) return
      const key = m.name.toLowerCase()
      const colorKey = key === 'shirt' ? shirt : wearing?.[key]
      if (!colorKey) { m.setEnabled(false); return }
      const item = findItem(key, colorKey)
      if (!item) { m.setEnabled(false); return }
      if (usesDonor(key, item)) loadClothingDonor(scene, m, skeleton, key, item)
      else { applyItemToMesh(scene, m, item); m.setEnabled(true) }
    })
    // Zwart gezicht (zoals paintball)
    meshes.forEach(m => {
      if (!FACE_NAMES.has(m.name) || !m.material) return
      const mat = m.material.clone(m.material.name + '_f'); m.material = mat
      if (mat.albedoColor !== undefined) { mat.albedoTexture = null; mat.albedoColor = Color3.Black() }
      else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = null; mat.diffuseColor = Color3.Black() }
    })

    // Rij-animatie — retarget naar Poppetje + rest-pose-correctie (zoals emotes)
    SceneLoader.ImportMesh('', '/', 'rijden.glb', scene, (aM, _p, _s, aG) => {
      aM.forEach(m => m.setEnabled(false))
      if (aG.length) {
        const orig = aG[0]
        // Poppetje en rijden.glb delen hetzelfde Mixamo-skelet → ruwe keys direct
        // retargeten (géén rest-pose-correctie; de loader speelt rijden auto af,
        // dus bind-pose uitlezen zou onbetrouwbaar zijn — net als bij 'rust').
        const rt = orig.clone('kartrijden', t => RETARGET_BONES.has(t.name) ? (nodeMap[t.name] ?? t) : t)
        const tas = rt.targetedAnimations
        for (let i = tas.length - 1; i >= 0; i--) {
          const { animation: anim, target } = tas[i]
          const prop = anim.targetProperty, name = target.name
          if (prop === 'scaling' || prop === 'scale') { tas.splice(i, 1); continue }
          if (prop === 'position') { tas.splice(i, 1); continue }
          if (!RETARGET_BONES.has(name)) { tas.splice(i, 1); continue }
          if (name === 'Root') { tas.splice(i, 1); continue }
        }
        orig.stop()
        rt.play(true)
        orig.dispose()
      }
      onReady?.(root)
    }, null, () => onReady?.(root))
  }, null, (_, msg, err) => console.error('Kart avatar load error:', msg, err))
}

// Startvak-transform op basis van join-index (2 kolommen op het rechte stuk)
function gridStart(grid) {
  const c = ringPos(START_IDX), t = tangentAt(START_IDX), n = normalAt(START_IDX)
  const row = Math.floor(grid / 2), col = grid % 2
  const back = row * 4.5 + 1, side = (col === 0 ? -1 : 1) * 2.4
  const x = c.x - t.x * back + n.x * side
  const z = c.z - t.z * back + n.z * side
  return { x, z, heading: Math.atan2(t.x, t.z) }
}

function KartRace({ onBack, room, sessionId, joinCode, track = 'groen' }) {
  const mp = !!room
  const trackId = mp ? (room.state.track || 'groen') : track
  const canvasRef = useRef(null)
  const [phase, setPhase]   = useState(mp ? 'lobby' : 'countdown')   // lobby | countdown | racing | finished
  const [count, setCount]   = useState(3)
  const [lap, setLap]       = useState(1)
  const [speed, setSpeed]   = useState(0)
  const [lapTime, setLapTime] = useState(0)
  const [place, setPlace]   = useState({ pos: 1, total: 1 })
  const [result, setResult]   = useState(null)
  const [players, setPlayers] = useState([])      // lobby-lijst
  const stateRef = useRef({})

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
    cam.radius = 13; cam.heightOffset = 5; cam.rotationOffset = 180
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

    // ── Input ──
    const keys = {}
    const kd = e => { keys[e.key.toLowerCase()] = true }
    const ku = e => { keys[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    // ── Physics state ──
    const phys = {
      vel: 0, maxSpeed: 34, accel: 26, brakeForce: 34, friction: 12,
      turnSpeed: 2.2, heading: gs.heading,
      lapsDone: 0, prevIdx: START_IDX, cumIdx: 0, lapStart: performance.now(),
      finished: false, sendAcc: 0,
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

        if (gas)        phys.vel += phys.accel * dt
        else if (brake) phys.vel -= phys.brakeForce * dt
        else { const f = phys.friction * dt; phys.vel = phys.vel > 0 ? Math.max(0, phys.vel - f) : Math.min(0, phys.vel + f) }

        const near = nearestIdx(kartRoot.position)
        const offRoad = near.dist > ROAD_HW
        const cap = offRoad ? phys.maxSpeed * 0.45 : phys.maxSpeed
        phys.vel = Math.max(-phys.maxSpeed * 0.4, Math.min(cap, phys.vel))
        if (offRoad) phys.vel *= (1 - 1.5 * dt)

        const steer = (right ? 1 : 0) - (left ? 1 : 0)
        const speedFactor = Math.min(1, Math.abs(phys.vel) / 6)
        phys.heading += steer * phys.turnSpeed * dt * speedFactor * Math.sign(phys.vel || 1)
        kartRoot.rotation.y = phys.heading

        const fwd = new Vector3(Math.sin(phys.heading), 0, Math.cos(phys.heading))
        kartRoot.position.addInPlace(fwd.scale(phys.vel * dt))

        // ── BEUKEN: botsing met andere karts (push apart + snelheidsverlies) ──
        const BUMP = 2.4
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
            if (into > 0) phys.vel *= 0.55             // klap → snelheid eruit
            phys.vel += 6 * overlap                    // kleine terugstoot-impuls
            phys.vel = Math.min(phys.vel, phys.maxSpeed)
          }
        })

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
          <div className="kart-bot-row">
            <button className="kart-bot-btn" onClick={() => room.send('addBot')}>🤖 Bot erbij</button>
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

      <div className="kart-help">W/↑ gas · S/↓ rem · A/← D/→ sturen{mp ? ' · ram je tegenstanders!' : ''}</div>
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

  if (screen === 'solo') return <KartRace onBack={() => setScreen('menu')} track={selTrack} />

  if (screen === 'race' && room) {
    return <KartRace onBack={() => { try { room.leave() } catch {} ; setRoom(null); setScreen('menu') }} room={room} sessionId={sessionId} joinCode={joinCode} />
  }

  if (screen === 'lobby') {
    return <KartLobby
      track={selTrack}
      onBack={() => setScreen('menu')}
      onJoined={(r, jc) => { setRoom(r); setSessionId(r.sessionId); setJoinCode(jc); setScreen('race') }}
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
        <button className="kart-menu-btn solo" onClick={() => setScreen('solo')}>🧑 Oefenen (alleen)</button>
        <button className="kart-menu-btn online" onClick={() => setScreen('lobby')}>🌍 Online — beuk tegen vrienden</button>
      </div>
    </div>
  )
}

// Baan-keuze (3 banen oplopend in moeilijkheid)
function TrackPicker({ value, onChange }) {
  const ICON = { groen: '🌳', woud: '🌲', bergen: '⛰️' }
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

function safeJSON(s) { try { return JSON.parse(s || '{}') } catch { return {} } }

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
