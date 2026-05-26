// Mini Golf – Babylon.js + Havok
// Physics approach: GLB tiles = visuals only.
//   Per-tile collision = 3 invisible boxes (floor + left wall + right wall).
//   Ball = visible colored sphere + GLB overlay synced each frame.
import {
  Engine, Scene, Vector3, Color3, Color4, Quaternion,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  MeshBuilder, StandardMaterial,
  ArcRotateCamera, PointerEventTypes, Tools,
  SceneLoader, TransformNode,
  PhysicsAggregate, PhysicsShapeType,
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import HavokPhysics   from '@babylonjs/havok'
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin.js'
import { HOLES, TILE_SIZE } from './data/CourseData.js'

// ── Constants ─────────────────────────────────────────────────────────
const GOLF_PATH   = '/golf/'
const MAX_SHOTS   = 10
const MAX_POWER   = 11
const DRAG_SCALE  = 0.12
const HOLE_R      = 0.55     // XZ-distance counts as in-hole
const BALL_R      = 0.18     // physics + visual radius
const CHAN_HW     = 0.62     // half-width of channel (tiles are X:-1→1 = 2 units)
const WALL_H      = 1.6      // height of side walls

// ── Score helper ──────────────────────────────────────────────────────
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

// ── GLB cache (visual only) ───────────────────────────────────────────
const _glbCache = {}

async function loadGlb(name, scene) {
  if (_glbCache[name]) return _glbCache[name]

  const res  = await SceneLoader.ImportMeshAsync('', GOLF_PATH, `${name}.glb`, scene)
  const root = new TransformNode(`tmpl_${name}_${Date.now()}`, scene)

  res.meshes.forEach(m => {
    if (!m.parent) m.parent = root
    m.isPickable   = false
    m.receiveShadows = true
  })
  root.setEnabled(false)
  _glbCache[name] = root
  return root
}

function cloneGlb(src, id) {
  // Clone the root. Babylon's TransformNode.clone clones direct-child meshes.
  const node = src.clone(id, null)
  node.setEnabled(true)
  // Ensure all descendants are visible (setEnabled(true) on parent is enough
  // because isEnabled() walks ancestors, but let's be safe)
  const walk = (n) => {
    n.setEnabled(true)
    n.getChildren(undefined, false).forEach(walk)
  }
  walk(node)
  return node
}

// ── Invisible box helper ──────────────────────────────────────────────
function makeBox(id, w, h, d, px, py, pz, scene) {
  const box = MeshBuilder.CreateBox(id, { width: w, height: h, depth: d }, scene)
  box.position.set(px, py, pz)
  box.isVisible = false
  return box
}

// ════════════════════════════════════════════════════════════════════
export async function createMiniGolf(canvas, opts = {}) {
  const {
    mode = '2player',
    onHoleComplete, onGameComplete,
    onPowerChange, onDirLineChange,
    onStateChanged, onShotCountChanged,
  } = opts

  // ── Engine ────────────────────────────────────────────────────────
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
  const scene  = new Scene(engine)
  scene.clearColor = new Color4(0.12, 0.42, 0.22, 1)

  // ── Havok ─────────────────────────────────────────────────────────
  const havok = await HavokPhysics()
  scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok))

  // ── Lights ────────────────────────────────────────────────────────
  const amb = new HemisphericLight('amb', Vector3.Up(), scene)
  amb.intensity = 0.65

  const sun = new DirectionalLight('sun', new Vector3(-1, -2, -0.5).normalize(), scene)
  sun.intensity = 1.0
  sun.position  = new Vector3(10, 20, 10)

  const shadow = new ShadowGenerator(1024, sun)
  shadow.useBlurExponentialShadowMap = true

  // ── Ball materials ────────────────────────────────────────────────
  const matRed  = new StandardMaterial('matRed',  scene)
  matRed.diffuseColor  = new Color3(0.9, 0.15, 0.15)
  matRed.specularColor = new Color3(1,   0.5,  0.5)

  const matBlue = new StandardMaterial('matBlue', scene)
  matBlue.diffuseColor  = new Color3(0.15, 0.35, 0.95)
  matBlue.specularColor = new Color3(0.5,  0.7,  1)

  const MATS = [matRed, matBlue]

  // ── Camera ────────────────────────────────────────────────────────
  const camera = new ArcRotateCamera('cam', -Math.PI / 2, 1.1, 18, Vector3.Zero(), scene)
  camera.lowerBetaLimit   = 0.2
  camera.upperBetaLimit   = Math.PI / 2.05
  camera.lowerRadiusLimit = 5
  camera.upperRadiusLimit = 45
  camera.inputs.remove(camera.inputs.attached.mousewheel)
  camera.attachControl(canvas, true)

  canvas.addEventListener('wheel', e => {
    camera.radius = Math.max(camera.lowerRadiusLimit,
      Math.min(camera.upperRadiusLimit, camera.radius + e.deltaY * 0.04))
  }, { passive: true })

  // ── State ─────────────────────────────────────────────────────────
  const players = [
    { id: 0, name: 'Rood',  ballKey: 'ball-red',  shots: 0, scores: [], finished: false },
    { id: 1, name: 'Blauw', ballKey: 'ball-blue', shots: 0, scores: [], finished: false },
  ]

  // Ball handles
  const balls = [
    { mesh: null, agg: null },
    { mesh: null, agg: null },
  ]

  let currentHole   = 0
  let currentPlayer = 0
  let turnQueue     = [0, 1]
  let disposables   = []   // cleared on each loadHole

  // ── Per-tile physics: 3 invisible boxes ──────────────────────────
  // tile world position: (tx, 0, tz)  rotY assumed 0 for straight holes.
  // spline-default-straight extents (natural scale):
  //   X: [-1, 1]   Channel roughly ±CHAN_HW
  //   Z: [-1, 4]   step=4  → box spans Z centre at tz+1.5, half-depth=2.5
  function addTileColliders(tx, tz) {
    const cx = tx
    const cz = tz + 1.5   // centre of tile Z extent (-1..4 → centre at 1.5)
    const hl = 2.5         // half-depth of tile (5/2)

    // Floor
    const fl = makeBox('fl', CHAN_HW*2, 0.12, hl*2, cx, -0.06, cz, scene)
    new PhysicsAggregate(fl, PhysicsShapeType.BOX,
      { mass: 0, restitution: 0.2, friction: 0.75 }, scene)
    disposables.push(fl)

    // Left wall (−X)
    const lw = makeBox('lw', 0.12, WALL_H, hl*2, cx - CHAN_HW - 0.06, WALL_H/2 - 0.06, cz, scene)
    new PhysicsAggregate(lw, PhysicsShapeType.BOX,
      { mass: 0, restitution: 0.35, friction: 0.4 }, scene)
    disposables.push(lw)

    // Right wall (+X)
    const rw = makeBox('rw', 0.12, WALL_H, hl*2, cx + CHAN_HW + 0.06, WALL_H/2 - 0.06, cz, scene)
    new PhysicsAggregate(rw, PhysicsShapeType.BOX,
      { mass: 0, restitution: 0.35, friction: 0.4 }, scene)
    disposables.push(rw)
  }

  // ── Spawn tile (visual only) ──────────────────────────────────────
  async function spawnTile(tileDef) {
    const { model, x, z, rotY } = tileDef
    const src  = await loadGlb(model, scene)
    const node = cloneGlb(src, `vis_${model}_${Date.now()}`)
    node.position = new Vector3(x, 0, z)
    node.rotation = new Vector3(0, Tools.ToRadians(rotY), 0)
    node.getChildMeshes(false).forEach(m => shadow.addShadowCaster(m))
    disposables.push(node)

    // Box colliders (only for rotY=0 straight tiles)
    if (rotY === 0) addTileColliders(x, z)
    return node
  }

  // ── Spawn ball ────────────────────────────────────────────────────
  function makeBall(pid, x, y, z) {
    const b = balls[pid]
    // Dispose old
    if (b.agg)  { b.agg.dispose();  b.agg  = null }
    if (b.mesh) { b.mesh.dispose(); b.mesh = null }

    const mesh = MeshBuilder.CreateSphere(`ball_${pid}`, {
      diameter: BALL_R * 2, segments: 10,
    }, scene)
    mesh.position.set(x, y, z)
    mesh.material = MATS[pid]
    shadow.addShadowCaster(mesh)

    const agg = new PhysicsAggregate(mesh, PhysicsShapeType.SPHERE, {
      mass: 0.046, radius: BALL_R, restitution: 0.4, friction: 0.62,
    }, scene)
    agg.body.setLinearDamping(0.5)
    agg.body.setAngularDamping(0.65)

    b.mesh = mesh
    b.agg  = agg
    disposables.push(mesh)
    return b
  }

  // Teleport ball (recreate physics body at new position)
  function teleportBall(pid, x, y, z) {
    makeBall(pid, x, y, z)
  }

  // ── Load hole ─────────────────────────────────────────────────────
  async function loadHole(idx) {
    // Dispose all previous objects
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

    // Safety net below course
    const ground = makeBox('gnd', 300, 0.5, 300, 0, -7, 0, scene)
    new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene)
    disposables.push(ground)

    // Back wall (prevent ball escaping behind tee)
    const bwall = makeBox('bwall', CHAN_HW*2, WALL_H, 0.12, 0, WALL_H/2, -1.2, scene)
    new PhysicsAggregate(bwall, PhysicsShapeType.BOX, { mass: 0, restitution: 0.2 }, scene)
    disposables.push(bwall)

    // Load tile visuals + add colliders
    for (const t of hole.tiles) await spawnTile(t)

    // Flag
    try {
      const fsrc  = await loadGlb('flag-large-red', scene)
      const fnode = cloneGlb(fsrc, `flag_${Date.now()}`)
      fnode.position.set(hole.hole.x, 0, hole.hole.z)
      fnode.scaling.setAll(0.5)
      fnode.getChildMeshes(false).forEach(m => shadow.addShadowCaster(m))
      disposables.push(fnode)
    } catch {}

    // Spawn balls
    const tee = hole.tee
    makeBall(0, tee.x - 0.2, tee.y, tee.z)
    makeBall(1, tee.x + 0.2, tee.y, tee.z)

    // Camera: look along the hole
    const hlen  = Math.abs(hole.hole.z - tee.z)
    camera.target.set((tee.x + hole.hole.x) / 2, 0, (tee.z + hole.hole.z) / 2)
    camera.radius = Math.min(42, Math.max(14, hlen * 0.65))
    camera.alpha  = -Math.PI / 2
    camera.beta   = 1.05

    turnQueue     = [0, 1]
    currentPlayer = 0
    emit('aiming')
  }

  // ── Game flow ─────────────────────────────────────────────────────
  function emit(state, extra = {}) {
    onStateChanged?.({
      state, player: players[currentPlayer],
      hole: currentHole, par: HOLES[currentHole]?.par, ...extra,
    })
  }

  function nextTurn() {
    if (turnQueue.length === 0) { endHole(); return }
    currentPlayer = turnQueue[0]
    emit('aiming')
    if (mode === 'vs-ai' && currentPlayer === 1) setTimeout(doAiShot, 900)
  }

  function endHole() {
    const scores = players.map(p => ({
      player: p, shots: p.shots,
      name: scoreName(p.shots, HOLES[currentHole].par),
    }))
    players.forEach(p => p.scores.push(p.shots))
    onHoleComplete?.({ hole: currentHole, scores, par: HOLES[currentHole].par })
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

  // ── Per-frame ─────────────────────────────────────────────────────
  scene.registerBeforeRender(() => {
    const hole = HOLES[currentHole]
    if (!hole) return

    for (const p of players) {
      const b = balls[p.id]
      if (p.finished || !b.mesh) continue

      // In-hole (XZ proximity)
      const dx = b.mesh.position.x - hole.hole.x
      const dz = b.mesh.position.z - hole.hole.z
      if (dx*dx + dz*dz < HOLE_R * HOLE_R) {
        b.agg.body.setLinearVelocity(Vector3.Zero())
        b.agg.body.setAngularVelocity(Vector3.Zero())
        onStateChanged?.({ state: 'ball-in-hole', player: p })
        markDone(p)
        continue
      }

      // Fell off
      if (b.mesh.position.y < -4) {
        const xOff = p.id === 0 ? -0.2 : 0.2
        teleportBall(p.id, hole.tee.x + xOff, hole.tee.y, hole.tee.z)
        continue
      }

      // Max shots
      if (!p.finished && p.shots >= MAX_SHOTS) markDone(p)
    }

    // Camera follows active ball
    const ab = balls[currentPlayer]
    if (ab?.mesh) Vector3.LerpToRef(camera.target, ab.mesh.position, 0.07, camera.target)
  })

  // ── Helpers ───────────────────────────────────────────────────────
  function isMoving(pid) {
    const b = balls[pid]
    return b.agg ? b.agg.body.getLinearVelocity().length() > 0.08 : false
  }

  function whenStopped(pid, cb) {
    let ticks = 0
    const id = setInterval(() => {
      ticks++
      if (!isMoving(pid) || ticks > 300) { clearInterval(id); cb() }
    }, 100)
  }

  // ── Shoot ─────────────────────────────────────────────────────────
  function shoot(pid, wdx, wdz, power) {
    const b = balls[pid]
    const p = players[pid]
    if (!b.agg || p.finished) return
    b.agg.body.applyImpulse(
      new Vector3(wdx * power, power * 0.1, wdz * power),
      b.mesh.getAbsolutePosition()
    )
    p.shots++
    onShotCountChanged?.({ player: p, shots: p.shots })
    emit('rolling')
    whenStopped(pid, () => { if (!p.finished) rotateTurn(p) })
  }

  // ── AI ────────────────────────────────────────────────────────────
  function doAiShot() {
    const pid = 1
    const p   = players[pid]
    const b   = balls[pid]
    if (p.finished || isMoving(pid) || !b.mesh) return
    const hole = HOLES[currentHole]
    const dir  = new Vector3(hole.hole.x - b.mesh.position.x, 0, hole.hole.z - b.mesh.position.z)
    const dist = dir.length()
    dir.normalizeToRef(dir)
    dir.x += (Math.random() - 0.5) * 0.18
    dir.z += (Math.random() - 0.5) * 0.18
    dir.normalize()
    shoot(pid, dir.x, dir.z, Math.min(MAX_POWER, dist * 1.15 + Math.random() * 1.5 - 0.7))
  }

  // ── Pointer input ─────────────────────────────────────────────────
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
      const a  = camera.alpha
      const nx = -(dx * Math.cos(a) - dy * Math.sin(a)) / dist
      const nz = -(dx * Math.sin(a) + dy * Math.cos(a)) / dist
      onDirLineChange?.({ ballPos: balls[currentPlayer].mesh?.position, dirX: nx, dirZ: nz, power: power / MAX_POWER })
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

  // ── Render loop ───────────────────────────────────────────────────
  engine.runRenderLoop(() => scene.render())
  window.addEventListener('resize', () => engine.resize())

  await loadHole(0)

  return {
    destroy() { engine.stopRenderLoop(); scene.dispose(); engine.dispose() },
    goNextHole() { if (currentHole < HOLES.length) loadHole(currentHole) },
    get players()       { return players },
    get currentPlayer() { return currentPlayer },
    get currentHole()   { return currentHole },
    holes: HOLES,
  }
}
