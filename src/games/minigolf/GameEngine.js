// Mini Golf – Babylon.js + Havok v2
// Tile channel: X [-1, +1] = 2 units wide.  Surface at world Y = 0.
// Physics: invisible box colliders per tile (floor + 2 walls).
// Ball:    visible colored MeshBuilder.CreateSphere.
import {
  Engine, Scene, Vector3, Color3, Color4,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  MeshBuilder, StandardMaterial,
  ArcRotateCamera, PointerEventTypes, Tools,
  SceneLoader, TransformNode,
  PhysicsAggregate, PhysicsShapeType,
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import HavokPhysics   from '@babylonjs/havok'
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin.js'
import { HOLES } from './data/CourseData.js'

// ── constants ─────────────────────────────────────────────────────────
const GOLF_PATH  = '/golf/'
const MAX_SHOTS  = 10
const MAX_POWER  = 9        // maximum impulse force (N·s)
const DRAG_SCALE = 0.10     // pixels → power ratio
const HOLE_R     = 0.45     // XZ radius that counts as "in hole"
const BALL_R     = 0.16     // physics sphere radius → diameter 0.32

// Tile geometry (from GLB analysis)
const CHAN_HW  = 1.0         // half-width of channel  (tile X: -1 → +1)
const WALL_TH  = 0.16        // physics wall thickness
const WALL_H   = 1.0         // physics wall height
const HILL_H   = 0.15        // hill peak height above surface

// Tile type strings
const S  = 'spline-default-straight'
const HB = 'spline-default-straight-hill-beginning'
const HC = 'spline-default-straight-hill-complete'
const HE = 'spline-default-straight-hill-end'
const BU = 'spline-default-straight-bump-up'
const BD = 'spline-default-straight-bump-down'

// ── score helper ──────────────────────────────────────────────────────
export function scoreName(strokes, par) {
  const d = strokes - par
  if (strokes === 1) return 'Hole-in-one!'
  if (d <= -2) return 'Eagle'
  if (d === -1) return 'Birdie'
  if (d ===  0) return 'Par'
  if (d ===  1) return 'Bogey'
  if (d ===  2) return 'Double Bogey'
  return `+${d}`
}

// ── GLB visual cache ──────────────────────────────────────────────────
const _glbCache = {}

async function loadGlb(name, scene) {
  if (_glbCache[name]) return _glbCache[name]
  const res  = await SceneLoader.ImportMeshAsync('', GOLF_PATH, `${name}.glb`, scene)
  const root = new TransformNode(`tmpl_${name}`, scene)
  res.meshes.forEach(m => {
    if (!m.parent) m.parent = root
    m.isPickable = false
  })
  root.setEnabled(false)
  _glbCache[name] = root
  return root
}

function cloneGlb(src, id) {
  const node = src.clone(id, null)
  node.setEnabled(true)
  const enable = n => { n.setEnabled(true); n.getChildren(undefined, false).forEach(enable) }
  enable(node)
  return node
}

// ════════════════════════════════════════════════════════════════════
export async function createMiniGolf(canvas, opts = {}) {
  const {
    mode = '2player',
    onHoleComplete, onGameComplete,
    onPowerChange, onDirLineChange,
    onStateChanged, onShotCountChanged,
  } = opts

  // ── engine / scene ────────────────────────────────────────────────
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
  const scene  = new Scene(engine)
  scene.clearColor = new Color4(0.47, 0.73, 0.88, 1)   // sky blue

  // ── physics ───────────────────────────────────────────────────────
  const havok = await HavokPhysics()
  scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok))

  // ── lighting ──────────────────────────────────────────────────────
  const amb = new HemisphericLight('amb', Vector3.Up(), scene)
  amb.intensity   = 0.75
  amb.diffuse     = new Color3(0.95, 1.0, 0.95)
  amb.groundColor = new Color3(0.28, 0.42, 0.28)

  const sun = new DirectionalLight('sun', new Vector3(-0.6, -1.0, -0.4).normalize(), scene)
  sun.intensity = 1.3
  sun.diffuse   = new Color3(1.0, 0.97, 0.88)
  sun.position  = new Vector3(15, 25, 15)

  const shadow = new ShadowGenerator(2048, sun)
  shadow.useBlurExponentialShadowMap = true
  shadow.blurKernel = 8

  // ── ball materials ────────────────────────────────────────────────
  function makeMat(r, g, b) {
    const m = new StandardMaterial('m', scene)
    m.diffuseColor  = new Color3(r, g, b)
    m.specularColor = new Color3(0.6, 0.6, 0.6)
    m.specularPower = 80
    return m
  }
  const MATS = [makeMat(0.92, 0.12, 0.12), makeMat(0.12, 0.30, 0.95)]

  // ── camera ────────────────────────────────────────────────────────
  const camera = new ArcRotateCamera('cam', -Math.PI / 2, 0.90, 20, Vector3.Zero(), scene)
  camera.lowerBetaLimit   = 0.15
  camera.upperBetaLimit   = Math.PI / 2.1
  camera.lowerRadiusLimit = 4
  camera.upperRadiusLimit = 55
  camera.inputs.remove(camera.inputs.attached.mousewheel)
  camera.attachControl(canvas, true)
  canvas.addEventListener('wheel', e => {
    camera.radius = Math.max(camera.lowerRadiusLimit,
      Math.min(camera.upperRadiusLimit, camera.radius + e.deltaY * 0.04))
  }, { passive: true })

  // ── game state ────────────────────────────────────────────────────
  const players = [
    { id: 0, name: 'Rood',  ballKey: 'ball-red',  shots: 0, scores: [], finished: false },
    { id: 1, name: 'Blauw', ballKey: 'ball-blue', shots: 0, scores: [], finished: false },
  ]
  const balls = [{ mesh: null, agg: null }, { mesh: null, agg: null }]

  let currentHole   = 0
  let currentPlayer = 0
  let turnQueue     = [0, 1]
  let disposables   = []

  // ── physics box helper ────────────────────────────────────────────
  function staticBox(cx, cy, cz, w, h, d, rotX = 0, opts2 = {}) {
    const b = MeshBuilder.CreateBox('b', { width: w, height: h, depth: d }, scene)
    b.position.set(cx, cy, cz)
    if (rotX !== 0) b.rotation.x = rotX
    b.isVisible = false
    new PhysicsAggregate(b, PhysicsShapeType.BOX,
      { mass: 0, restitution: 0.25, friction: 0.55, ...opts2 }, scene)
    disposables.push(b)
    return b
  }

  // ── per-tile colliders ────────────────────────────────────────────
  // Tile placed at world (tx, 0, tz).
  // Z extent: tz-1 → tz+4 (5 u), so centre is at tz+1.5, half-depth 2.5.
  // We extend slightly (hd=2.7) to seal the 1-unit overlapping seam.
  function addTileColliders(tx, tz, tileType) {
    const cz = tz + 1.5
    const hd = 2.7     // slightly wider than 2.5 to seal seams

    // ── side walls (same for every tile type) ──
    // Outer face at X = tx ± CHAN_HW, wall extends inward by WALL_TH
    const wxL = tx - CHAN_HW + WALL_TH / 2
    const wxR = tx + CHAN_HW - WALL_TH / 2
    const wallCY = WALL_H / 2   // wall sits from Y=0 upward
    staticBox(wxL, wallCY, cz, WALL_TH, WALL_H, hd * 2, 0, { restitution: 0.35, friction: 0.3 })
    staticBox(wxR, wallCY, cz, WALL_TH, WALL_H, hd * 2, 0, { restitution: 0.35, friction: 0.3 })

    // ── floor ──
    const fw = CHAN_HW * 2 - WALL_TH * 2   // floor width between the walls
    switch (tileType) {
      case S:
      case BU:
      case BD:
        // flat surface at Y = 0
        staticBox(tx, -0.06, cz, fw, 0.12, hd * 2)
        break

      case HB: {
        // ramp rising 0 → HILL_H over the 4-unit tile step
        const dZ = 4.2, dY = HILL_H
        const ang = Math.atan2(dY, dZ)
        const len = Math.sqrt(dZ * dZ + dY * dY)
        staticBox(tx, (dY / 2) - 0.06, tz + 2, fw, 0.12, len, -ang)
        break
      }
      case HC:
        // flat surface elevated by HILL_H
        staticBox(tx, HILL_H - 0.06, cz, fw, 0.12, hd * 2)
        break

      case HE: {
        // ramp falling HILL_H → 0 over the 4-unit tile step
        const dZ = 4.2, dY = HILL_H
        const ang = Math.atan2(dY, dZ)
        const len = Math.sqrt(dZ * dZ + dY * dY)
        staticBox(tx, (dY / 2) - 0.06, tz + 2, fw, 0.12, len, ang)
        break
      }
    }
  }

  // ── spawn tile (visual + colliders) ──────────────────────────────
  async function spawnTile(tileDef) {
    const { model, x, z, rotY } = tileDef
    const src  = await loadGlb(model, scene)
    const node = cloneGlb(src, `vis_${model}_${Date.now()}`)
    node.position.set(x, 0, z)
    node.rotation.y = Tools.ToRadians(rotY ?? 0)
    node.getChildMeshes(false).forEach(m => {
      m.receiveShadows = true
      shadow.addShadowCaster(m)
    })
    disposables.push(node)
    addTileColliders(x, z, model)
  }

  // ── ball ──────────────────────────────────────────────────────────
  function makeBall(pid, x, y, z) {
    const b = balls[pid]
    b.agg?.dispose();  b.agg  = null
    b.mesh?.dispose(); b.mesh = null

    const mesh = MeshBuilder.CreateSphere(`ball_${pid}`, { diameter: BALL_R * 2, segments: 12 }, scene)
    mesh.position.set(x, y, z)
    mesh.material = MATS[pid]
    shadow.addShadowCaster(mesh)

    const agg = new PhysicsAggregate(mesh, PhysicsShapeType.SPHERE,
      { mass: 0.046, radius: BALL_R, restitution: 0.35, friction: 0.55 }, scene)
    agg.body.setLinearDamping(0.40)
    agg.body.setAngularDamping(0.55)

    b.mesh = mesh; b.agg = agg
    disposables.push(mesh)
    return b
  }

  function teleportBall(pid, x, y, z) { makeBall(pid, x, y, z) }

  // ── load hole ─────────────────────────────────────────────────────
  async function loadHole(idx) {
    for (const d of disposables) {
      try {
        d.getChildMeshes?.(false).forEach(m => { m.physicsBody?.dispose(); m.dispose() })
        d.physicsBody?.dispose()
        d.dispose()
      } catch {}
    }
    disposables = []
    balls[0].mesh = null; balls[0].agg = null
    balls[1].mesh = null; balls[1].agg = null
    players[0].shots = 0; players[0].finished = false
    players[1].shots = 0; players[1].finished = false

    const hole = HOLES[idx]

    // Safety floor (catches any ball that escapes the course)
    staticBox(0, -9, 0, 400, 0.5, 400)

    // Back wall (behind tee, at tile start)
    staticBox(0, 0.5, -1.4, CHAN_HW * 2, WALL_H, 0.15, 0, { restitution: 0.2 })

    // End wall (after last tile)
    const lastZ = (hole.tiles.length - 1) * 4
    staticBox(0, 0.5, lastZ + 4.2, CHAN_HW * 2, WALL_H, 0.15, 0, { restitution: 0.2 })

    // Visual tiles + per-tile box colliders
    for (const t of hole.tiles) await spawnTile(t)

    // Flag
    try {
      const fsrc = await loadGlb('flag-large-red', scene)
      const fn   = cloneGlb(fsrc, 'flag')
      fn.position.set(hole.hole.x, 0, hole.hole.z)
      fn.scaling.setAll(0.5)
      fn.getChildMeshes(false).forEach(m => shadow.addShadowCaster(m))
      disposables.push(fn)
    } catch {}

    // Spawn balls slightly above tee surface
    const tee = hole.tee
    makeBall(0, tee.x - 0.22, tee.y, tee.z)
    makeBall(1, tee.x + 0.22, tee.y, tee.z)

    // Camera: look along the hole, slight top-down angle
    const mid  = new Vector3((tee.x + hole.hole.x) / 2, 0, (tee.z + hole.hole.z) / 2)
    const hlen = Math.abs(hole.hole.z - tee.z)
    camera.target.copyFrom(mid)
    camera.radius = Math.min(50, Math.max(12, hlen * 0.72))
    camera.alpha  = -Math.PI / 2
    camera.beta   = 0.88

    turnQueue     = [0, 1]
    currentPlayer = 0
    emit('aiming')
  }

  // ── flow ──────────────────────────────────────────────────────────
  function emit(state, extra = {}) {
    onStateChanged?.({ state, player: players[currentPlayer],
      hole: currentHole, par: HOLES[currentHole]?.par, ...extra })
  }

  function nextTurn() {
    if (turnQueue.length === 0) { endHole(); return }
    currentPlayer = turnQueue[0]
    emit('aiming')
    if (mode === 'vs-ai' && currentPlayer === 1) setTimeout(doAiShot, 900)
  }

  function endHole() {
    const par    = HOLES[currentHole].par
    const scores = players.map(p => ({ player: p, shots: p.shots, name: scoreName(p.shots, par) }))
    players.forEach(p => p.scores.push(p.shots))
    onHoleComplete?.({ hole: currentHole, scores, par })
    currentHole++
    if (currentHole >= HOLES.length) onGameComplete?.({ players })
  }

  function markDone(p) {
    p.finished = true
    turnQueue  = turnQueue.filter(id => id !== p.id)
    if (turnQueue.length === 0) endHole()
    else nextTurn()
  }

  function rotateTurn(p) {
    if (turnQueue.length < 2) return
    const i = turnQueue.indexOf(p.id)
    if (i >= 0) { turnQueue.splice(i, 1); turnQueue.push(p.id) }
    nextTurn()
  }

  // ── per-frame ─────────────────────────────────────────────────────
  scene.registerBeforeRender(() => {
    const hole = HOLES[currentHole]
    if (!hole) return

    for (const p of players) {
      const b = balls[p.id]
      if (p.finished || !b.mesh) continue

      // In-hole check
      const dx = b.mesh.position.x - hole.hole.x
      const dz = b.mesh.position.z - hole.hole.z
      if (dx * dx + dz * dz < HOLE_R * HOLE_R && b.mesh.position.y < 0.6) {
        b.agg.body.setLinearVelocity(Vector3.Zero())
        b.agg.body.setAngularVelocity(Vector3.Zero())
        onStateChanged?.({ state: 'ball-in-hole', player: p })
        markDone(p)
        continue
      }

      // Fell off course
      if (b.mesh.position.y < -4) {
        teleportBall(p.id, hole.tee.x + (p.id === 0 ? -0.22 : 0.22), hole.tee.y, hole.tee.z)
        continue
      }

      // Max shots
      if (p.shots >= MAX_SHOTS) markDone(p)
    }

    // Camera smoothly follows active ball
    const ab = balls[currentPlayer]
    if (ab?.mesh) Vector3.LerpToRef(camera.target, ab.mesh.position, 0.07, camera.target)
  })

  // ── helpers ───────────────────────────────────────────────────────
  function isMoving(pid) {
    const b = balls[pid]
    return b.agg ? b.agg.body.getLinearVelocity().length() > 0.05 : false
  }

  function whenStopped(pid, cb) {
    let ticks = 0
    const id = setInterval(() => {
      ticks++
      if (!isMoving(pid) || ticks > 300) { clearInterval(id); cb() }
    }, 100)
  }

  // ── shoot ─────────────────────────────────────────────────────────
  function shoot(pid, wdx, wdz, power) {
    const b = balls[pid], p = players[pid]
    if (!b.agg || p.finished) return
    b.agg.body.applyImpulse(
      new Vector3(wdx * power, 0, wdz * power),
      b.mesh.getAbsolutePosition(),
    )
    p.shots++
    onShotCountChanged?.({ player: p })
    emit('rolling')
    whenStopped(pid, () => { if (!p.finished) rotateTurn(p) })
  }

  // ── AI ────────────────────────────────────────────────────────────
  function doAiShot() {
    const pid = 1, p = players[pid], b = balls[pid]
    if (p.finished || isMoving(pid) || !b.mesh) return
    const hole = HOLES[currentHole]
    const dir  = new Vector3(hole.hole.x - b.mesh.position.x, 0, hole.hole.z - b.mesh.position.z)
    const dist = dir.length()
    dir.normalize()
    dir.x += (Math.random() - 0.5) * 0.18
    dir.z += (Math.random() - 0.5) * 0.18
    dir.normalize()
    shoot(pid, dir.x, dir.z, Math.min(MAX_POWER, dist * 1.1 + 0.5))
  }

  // ── pointer / drag-to-shoot ───────────────────────────────────────
  let drag = null

  scene.onPointerObservable.add(evt => {
    if (mode === 'vs-ai' && currentPlayer === 1) return
    const p = players[currentPlayer]
    if (!p || p.finished || isMoving(currentPlayer)) return

    if (evt.type === PointerEventTypes.POINTERDOWN && evt.event.button === 0) {
      drag = { x: evt.event.clientX, y: evt.event.clientY }
    }

    if (evt.type === PointerEventTypes.POINTERMOVE && drag) {
      const dx = evt.event.clientX - drag.x
      const dy = evt.event.clientY - drag.y
      const dist = Math.hypot(dx, dy)
      if (dist < 4) return
      const power = Math.min(MAX_POWER, dist * DRAG_SCALE)
      onPowerChange?.(power / MAX_POWER)
      const a = camera.alpha
      const nx = -(dx * Math.cos(a) - dy * Math.sin(a)) / dist
      const nz = -(dx * Math.sin(a) + dy * Math.cos(a)) / dist
      onDirLineChange?.({ power: power / MAX_POWER, dirX: nx, dirZ: nz })
    }

    if (evt.type === PointerEventTypes.POINTERUP && drag) {
      const dx = evt.event.clientX - drag.x
      const dy = evt.event.clientY - drag.y
      const dist = Math.hypot(dx, dy)
      drag = null; onPowerChange?.(0); onDirLineChange?.(null)
      if (dist < 8) return
      const power = Math.min(MAX_POWER, dist * DRAG_SCALE)
      const a  = camera.alpha
      const nx = -(dx * Math.cos(a) - dy * Math.sin(a)) / dist
      const nz = -(dx * Math.sin(a) + dy * Math.cos(a)) / dist
      shoot(currentPlayer, nx, nz, power)
    }
  })

  // ── run ───────────────────────────────────────────────────────────
  engine.runRenderLoop(() => scene.render())
  window.addEventListener('resize', () => engine.resize())

  await loadHole(0)

  return {
    destroy()    { engine.stopRenderLoop(); scene.dispose(); engine.dispose() },
    goNextHole() { if (currentHole < HOLES.length) loadHole(currentHole) },
    get players()       { return players },
    get currentPlayer() { return currentPlayer },
    get currentHole()   { return currentHole },
    holes: HOLES,
  }
}
