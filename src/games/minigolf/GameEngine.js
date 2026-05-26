// Mini Golf – Babylon.js + Havok v2
//
// GLB geometry (measured from accessors):
//   node.translation.Y = -1 for all tiles
//   → spawn tiles at world Y = 1  so  surface = world Y = 0
//   channel width:  1.0 unit   (mesh X: -0.5 → +0.5)
//   straight tile:  mesh Y 0 → 0.15   (floor at 0, thin walls)
//   hill peak:      mesh Y ≈ 1.1       (HB/HC/HE)
//   bump up peak:   mesh Y ≈ 0.65
//   bump down min:  mesh Y ≈ -0.5
//   Z span per tile: 0 → 4   (TILE_SIZE = 4, no overlap)
//
// Physics: per-tile invisible BOX colliders (floor + 2 walls)
// Ball:    MeshBuilder.CreateSphere – always visible
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
const GOLF_PATH = '/golf/'
const MAX_SHOTS  = 10
const MAX_POWER  = 8
const DRAG_SCALE = 0.09
const HOLE_R     = 0.30   // XZ detection radius for "ball in hole"
const BALL_R     = 0.15   // physics + visual sphere radius

// Tile geometry (from GLB accessor min/max)
const CHAN_HW  = 0.50   // channel half-width  (mesh X: -0.5 → +0.5)
const WALL_TH  = 0.08   // invisible wall thickness
const WALL_H   = 2.60   // wall height – tall enough to contain ball on hills (peak ≈ 1.1)
const HILL_H   = 1.10   // hill peak height (HB end / HC / HE start)
const BUMP_H   = 0.60   // bump-up peak height
const BUMP_LO  = -0.45  // bump-down trough
const TILE_Y   = 1.0    // world Y at which to place tile wrapper so surface = 0

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

// ── GLB cache (visual only, no physics on GLB meshes) ─────────────────
const _cache = {}

async function loadGlb(name, scene) {
  if (_cache[name]) return _cache[name]
  const res  = await SceneLoader.ImportMeshAsync('', GOLF_PATH, `${name}.glb`, scene)
  const root = new TransformNode(`tmpl_${name}`, scene)
  res.meshes.forEach(m => { if (!m.parent) m.parent = root; m.isPickable = false })
  root.setEnabled(false)
  _cache[name] = root
  return root
}

function cloneGlb(src, id) {
  const node = src.clone(id, null)
  node.setEnabled(true)
  const wake = n => { n.setEnabled(true); n.getChildren(undefined, false).forEach(wake) }
  wake(node)
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

  // ── engine & scene ────────────────────────────────────────────────
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
  const scene  = new Scene(engine)
  scene.clearColor = new Color4(0.45, 0.70, 0.87, 1)

  // ── Havok ─────────────────────────────────────────────────────────
  const havok = await HavokPhysics()
  scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok))

  // ── Lighting (warm sun + green-tinted ambient) ─────────────────────
  const amb = new HemisphericLight('amb', Vector3.Up(), scene)
  amb.intensity   = 0.70
  amb.diffuse     = new Color3(0.92, 1.0, 0.92)
  amb.groundColor = new Color3(0.25, 0.40, 0.25)

  const sun = new DirectionalLight('sun', new Vector3(-0.55, -1.0, -0.35).normalize(), scene)
  sun.intensity = 1.25
  sun.diffuse   = new Color3(1.0, 0.97, 0.88)
  sun.position  = new Vector3(12, 20, 12)

  const shadow = new ShadowGenerator(2048, sun)
  shadow.useBlurExponentialShadowMap = true
  shadow.blurKernel = 6

  // ── Ball materials ────────────────────────────────────────────────
  const mkMat = (r, g, b) => {
    const m = new StandardMaterial('', scene)
    m.diffuseColor  = new Color3(r, g, b)
    m.specularColor = new Color3(0.7, 0.7, 0.7)
    m.specularPower = 90
    return m
  }
  const MATS = [mkMat(0.95, 0.10, 0.10), mkMat(0.10, 0.28, 0.95)]

  // ── Camera ────────────────────────────────────────────────────────
  const camera = new ArcRotateCamera('cam', -Math.PI / 2, 0.88, 18, Vector3.Zero(), scene)
  camera.lowerBetaLimit   = 0.15
  camera.upperBetaLimit   = Math.PI / 2.08
  camera.lowerRadiusLimit = 4
  camera.upperRadiusLimit = 55
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
  const balls = [{ mesh: null, agg: null }, { mesh: null, agg: null }]
  let currentHole   = 0
  let currentPlayer = 0
  let turnQueue     = [0, 1]
  let disposables   = []

  // ── Physics helpers ───────────────────────────────────────────────
  function phyBox(cx, cy, cz, w, h, d, rotX = 0, extra = {}) {
    const b = MeshBuilder.CreateBox('pb', { width: w, height: h, depth: d }, scene)
    b.position.set(cx, cy, cz)
    if (rotX) b.rotation.x = rotX
    b.isVisible = false
    new PhysicsAggregate(b, PhysicsShapeType.BOX,
      { mass: 0, restitution: 0.25, friction: 0.55, ...extra }, scene)
    disposables.push(b)
    return b
  }

  // Flat floor box: top surface at surfaceY, full channel width
  function flatFloor(tx, surfaceY, tz) {
    const cz = tz + 2.1   // half-depth 2.1 → covers tile Z: 0→4 with small seam margin
    phyBox(tx, surfaceY - 0.06, cz, CHAN_HW * 2, 0.12, 4.2)
  }

  // Ramp floor box: surface goes from yA (at Z=tz) to yB (at Z=tz+4)
  function rampFloor(tx, tz, yA, yB) {
    const dZ  = 4.1                          // slightly wider than tile for seam coverage
    const dY  = yB - yA
    const ang = Math.atan2(dY, dZ)           // rotation around X (negative = rises toward +Z)
    const len = Math.sqrt(dZ * dZ + dY * dY)
    const cy  = (yA + yB) / 2 - 0.06
    const cz  = tz + 2
    phyBox(tx, cy, cz, CHAN_HW * 2, 0.12, len, -ang)
  }

  // Pair of ramp boxes forming a peak or trough at the tile midpoint
  function rampPair(tx, tz, yStart, yPeak, yEnd) {
    rampFloor(tx, tz,     yStart, yPeak)     // first half Z: tz → tz+2
    rampFloor(tx, tz + 2, yPeak,  yEnd)      // second half Z: tz+2 → tz+4
  }

  // ── Per-tile colliders ────────────────────────────────────────────
  function addTileColliders(tx, tz, tileType) {
    // Side walls: placed outside the channel edges (X = ±CHAN_HW)
    // They're tall enough to contain the ball even at the hill peaks
    const wallCX = CHAN_HW + WALL_TH / 2   // = 0.54
    const wallCY = WALL_H / 2              // = 1.30  (covers Y 0 → 2.6)
    const wallCZ = tz + 2.1
    const wallD  = 4.4                      // slightly wider than tile depth
    phyBox(tx - wallCX, wallCY, wallCZ, WALL_TH, WALL_H, wallD, 0, { restitution: 0.35, friction: 0.3 })
    phyBox(tx + wallCX, wallCY, wallCZ, WALL_TH, WALL_H, wallD, 0, { restitution: 0.35, friction: 0.3 })

    // Floor (type-specific)
    switch (tileType) {
      case 'spline-default-straight':
        flatFloor(tx, 0, tz)
        break
      case 'spline-default-straight-hill-beginning':
        rampFloor(tx, tz, 0, HILL_H)
        break
      case 'spline-default-straight-hill-complete':
        flatFloor(tx, HILL_H, tz)
        break
      case 'spline-default-straight-hill-end':
        rampFloor(tx, tz, HILL_H, 0)
        break
      case 'spline-default-straight-bump-up':
        rampPair(tx, tz, 0, BUMP_H, 0)
        break
      case 'spline-default-straight-bump-down':
        rampPair(tx, tz, 0, BUMP_LO, 0)
        break
    }
  }

  // ── Spawn tile (visual + colliders) ──────────────────────────────
  async function spawnTile(tileDef) {
    const { model, x, z, rotY } = tileDef
    const src  = await loadGlb(model, scene)
    const node = cloneGlb(src, `vis_${model}_${Date.now()}`)
    // Place at Y=TILE_Y=1 so node Y=-1 offset aligns surface with world Y=0
    node.position.set(x, TILE_Y, z)
    node.rotation.y = Tools.ToRadians(rotY ?? 0)
    node.getChildMeshes(false).forEach(m => {
      m.receiveShadows = true
      shadow.addShadowCaster(m)
    })
    disposables.push(node)
    addTileColliders(x, z, model)
  }

  // ── Balls ─────────────────────────────────────────────────────────
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
    agg.body.setLinearDamping(0.42)
    agg.body.setAngularDamping(0.58)

    b.mesh = mesh; b.agg = agg
    disposables.push(mesh)
  }

  function teleportBall(pid, x, y, z) { makeBall(pid, x, y, z) }

  // ── Load hole ─────────────────────────────────────────────────────
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
    const n    = hole.tiles.length

    // Safety net
    phyBox(0, -8, n * 2, 400, 0.5, 400)

    // Back wall (behind tee, Z < 0)
    phyBox(0, 1.2, -0.2, CHAN_HW * 2 + 0.2, 2.4, 0.1, 0, { restitution: 0.2 })

    // End wall (after last tile)
    phyBox(0, 1.2, n * 4 + 0.2, CHAN_HW * 2 + 0.2, 2.4, 0.1, 0, { restitution: 0.2 })

    // Tile visuals + colliders
    for (const t of hole.tiles) await spawnTile(t)

    // Visual hole: black disk + short cup cylinder
    const holeMat = new StandardMaterial('holeMat', scene)
    holeMat.diffuseColor   = new Color3(0.02, 0.04, 0.02)
    holeMat.emissiveColor  = new Color3(0.0,  0.0,  0.0)

    const disk = MeshBuilder.CreateCylinder('holeDisk', {
      height: 0.04, diameter: HOLE_R * 2.5, tessellation: 32,
    }, scene)
    disk.position.set(hole.hole.x, 0.02, hole.hole.z)
    disk.material = holeMat
    disposables.push(disk)

    const cup = MeshBuilder.CreateCylinder('holeCup', {
      height: 0.35, diameter: HOLE_R * 2.2, tessellation: 32,
    }, scene)
    cup.position.set(hole.hole.x, -0.17, hole.hole.z)
    cup.material = holeMat
    disposables.push(cup)

    // Flag
    try {
      const fsrc = await loadGlb('flag-large-red', scene)
      const fn   = cloneGlb(fsrc, 'flag')
      fn.position.set(hole.hole.x, 0, hole.hole.z)   // flag base at world Y=0 (surface)
      fn.scaling.setAll(0.55)
      fn.getChildMeshes(false).forEach(m => { m.receiveShadows = true; shadow.addShadowCaster(m) })
      disposables.push(fn)
    } catch {}

    // Balls – spawn slightly above tee surface so they fall naturally
    const tee = hole.tee
    makeBall(0, tee.x - 0.12, tee.y, tee.z)
    makeBall(1, tee.x + 0.12, tee.y, tee.z)

    // Camera: look down the hole
    const hlen = hole.hole.z - tee.z
    camera.target.set((tee.x + hole.hole.x) / 2, 0.5, (tee.z + hole.hole.z) / 2)
    camera.radius = Math.min(52, Math.max(10, hlen * 0.70))
    camera.alpha  = -Math.PI / 2
    camera.beta   = 0.86

    turnQueue     = [0, 1]
    currentPlayer = 0
    emit('aiming')
  }

  // ── Game flow ─────────────────────────────────────────────────────
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

  // ── Per-frame ─────────────────────────────────────────────────────
  scene.registerBeforeRender(() => {
    const hole = HOLES[currentHole]
    if (!hole) return

    for (const p of players) {
      const b = balls[p.id]
      if (p.finished || !b.mesh) continue

      const dx = b.mesh.position.x - hole.hole.x
      const dz = b.mesh.position.z - hole.hole.z
      if (dx * dx + dz * dz < HOLE_R * HOLE_R && b.mesh.position.y < 0.5) {
        b.agg.body.setLinearVelocity(Vector3.Zero())
        b.agg.body.setAngularVelocity(Vector3.Zero())
        onStateChanged?.({ state: 'ball-in-hole', player: p })
        markDone(p)
        continue
      }

      if (b.mesh.position.y < -5) {
        teleportBall(p.id, hole.tee.x + (p.id === 0 ? -0.12 : 0.12), hole.tee.y, hole.tee.z)
        continue
      }

      if (p.shots >= MAX_SHOTS) markDone(p)
    }

    const ab = balls[currentPlayer]
    if (ab?.mesh) Vector3.LerpToRef(camera.target, ab.mesh.position, 0.07, camera.target)
  })

  // ── Helpers ───────────────────────────────────────────────────────
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

  // ── Shoot ─────────────────────────────────────────────────────────
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

  // ── Pointer / drag-to-shoot ───────────────────────────────────────
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

  // ── Render loop ───────────────────────────────────────────────────
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
