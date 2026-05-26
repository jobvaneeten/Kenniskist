import {
  Engine, Scene, Vector3, Color4, Quaternion,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  MeshBuilder, ArcRotateCamera, PointerEventTypes, Tools,
  SceneLoader, TransformNode,
  PhysicsAggregate, PhysicsShapeType,
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import HavokPhysics from '@babylonjs/havok'
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin.js'
import { HOLES, TILE_SIZE, BALL_SCALE, BALL_RADIUS } from './data/CourseData.js'

// ── Constants ─────────────────────────────────────────────────────────
const GOLF_PATH   = '/golf/'
const MAX_SHOTS   = 10
const MAX_POWER   = 12     // impulse units
const DRAG_SCALE  = 0.13   // screen-px → power
const HOLE_RADIUS = 0.5    // XZ-distance to count as "in hole"

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

// ── GLB cache ─────────────────────────────────────────────────────────
const _cache = {}

async function loadGlb(name, scene) {
  if (_cache[name]) return _cache[name]

  const res  = await SceneLoader.ImportMeshAsync('', GOLF_PATH, `${name}.glb`, scene)
  const root = new TransformNode(`tmpl_${name}`, scene)

  res.meshes.forEach(m => {
    if (!m.parent) m.parent = root
    m.isPickable = false
    m.receiveShadows = true
  })
  root.setEnabled(false)
  _cache[name] = root
  return root
}

// Clone a cached GLB into the scene
function cloneGlb(src, id, scene) {
  const node = src.clone(id, null)
  node.setEnabled(true)

  // Make sure every descendant mesh is visible
  node.getChildMeshes(false).forEach(m => {
    m.setEnabled(true)
    m.isPickable = false
  })
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

  // ── Engine & scene ────────────────────────────────────────────────
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
  const scene  = new Scene(engine)
  scene.clearColor = new Color4(0.12, 0.42, 0.22, 1)

  // ── Havok physics ─────────────────────────────────────────────────
  const havok = await HavokPhysics()
  scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok))

  // ── Lights ────────────────────────────────────────────────────────
  const amb = new HemisphericLight('amb', Vector3.Up(), scene)
  amb.intensity = 0.6

  const sun = new DirectionalLight('sun', new Vector3(-1, -2, -0.5).normalize(), scene)
  sun.intensity = 1.0
  sun.position  = new Vector3(10, 20, 10)

  const shadow = new ShadowGenerator(1024, sun)
  shadow.useBlurExponentialShadowMap = true

  // ── Camera ────────────────────────────────────────────────────────
  const camera = new ArcRotateCamera('cam', -Math.PI / 2, 1.1, 18, Vector3.Zero(), scene)
  camera.lowerBetaLimit   = 0.2
  camera.upperBetaLimit   = Math.PI / 2.05
  camera.lowerRadiusLimit = 6
  camera.upperRadiusLimit = 40
  camera.inputs.remove(camera.inputs.attached.mousewheel)
  camera.attachControl(canvas, true)

  canvas.addEventListener('wheel', e => {
    camera.radius = Math.max(camera.lowerRadiusLimit,
      Math.min(camera.upperRadiusLimit, camera.radius + e.deltaY * 0.04))
  }, { passive: true })

  // ── Game state ────────────────────────────────────────────────────
  const players = [
    { id: 0, name: 'Rood',  ballKey: 'ball-red',  shots: 0, scores: [], finished: false },
    { id: 1, name: 'Blauw', ballKey: 'ball-blue', shots: 0, scores: [], finished: false },
  ]
  let currentHole   = 0
  let currentPlayer = 0
  let turnQueue     = [0, 1]   // players still active this hole
  let disposables   = []       // all scene objects created for current hole

  // Ball handles per player
  const balls = [
    { physMesh: null, agg: null, visual: null },
    { physMesh: null, agg: null, visual: null },
  ]

  // ── Spawn tile ────────────────────────────────────────────────────
  async function spawnTile(tileDef) {
    const { model, x, z, rotY } = tileDef
    const src  = await loadGlb(model, scene)
    const node = cloneGlb(src, `tile_${model}_${x}_${z}_${Date.now()}`, scene)

    node.position = new Vector3(x, 0, z)
    node.rotation = new Vector3(0, Tools.ToRadians(rotY), 0)
    // No extra scaling — tiles at natural scale (TILE_SIZE=4 matches their Z extent)

    // Force world matrix so physics picks up correct positions
    node.computeWorldMatrix(true)

    node.getChildMeshes(false).forEach(m => {
      m.receiveShadows = true
      shadow.addShadowCaster(m)
      m.computeWorldMatrix(true)

      if (m.getTotalVertices() > 0) {
        try {
          new PhysicsAggregate(m, PhysicsShapeType.MESH,
            { mass: 0, restitution: 0.3, friction: 0.7 }, scene)
        } catch { /* non-physical sub-meshes */ }
      }
    })

    disposables.push(node)
    return node
  }

  // ── Spawn ball ────────────────────────────────────────────────────
  async function spawnBall(p, pos) {
    const b = balls[p.id]

    // Remove old ball
    b.agg?.dispose()
    b.physMesh?.dispose()
    b.visual?.getChildMeshes(false).forEach(m => { m.physicsBody?.dispose(); m.dispose() })
    b.visual?.dispose()

    // Physics sphere (invisible)
    const sphere = MeshBuilder.CreateSphere(`ball_phys_${p.id}`, {
      diameter: BALL_RADIUS * 2, segments: 6,
    }, scene)
    sphere.position  = new Vector3(pos.x, pos.y, pos.z)
    sphere.isVisible = false

    const agg = new PhysicsAggregate(sphere, PhysicsShapeType.SPHERE, {
      mass: 0.046, radius: BALL_RADIUS, restitution: 0.4, friction: 0.6,
    }, scene)
    agg.body.setLinearDamping(0.45)
    agg.body.setAngularDamping(0.6)

    b.physMesh = sphere
    b.agg      = agg

    // GLB visual (scaled down to fit channel)
    const src    = await loadGlb(p.ballKey, scene)
    const visual = cloneGlb(src, `ball_vis_${p.id}`, scene)
    visual.scaling = new Vector3(BALL_SCALE, BALL_SCALE, BALL_SCALE)
    visual.getChildMeshes(false).forEach(m => shadow.addShadowCaster(m))
    b.visual = visual

    disposables.push(sphere, visual)
    p.shots    = 0
    p.finished = false
  }

  // ── Load hole ─────────────────────────────────────────────────────
  async function loadHole(idx) {
    // Dispose everything from previous hole
    for (const d of disposables) {
      try {
        d.getChildMeshes?.(false).forEach(m => { m.physicsBody?.dispose(); m.dispose() })
        d.physicsBody?.dispose()
        d.dispose()
      } catch {}
    }
    disposables = []
    balls.forEach(b => { b.physMesh=null; b.agg=null; b.visual=null })

    const hole = HOLES[idx]

    // Safety net floor (catches ball if it falls off)
    const floor = MeshBuilder.CreateGround('floor', { width: 200, height: 200 }, scene)
    floor.position.y = -5
    floor.isVisible  = false
    new PhysicsAggregate(floor, PhysicsShapeType.BOX, { mass: 0 }, scene)
    disposables.push(floor)

    // Spawn tiles sequentially (order matters for physics)
    for (const t of hole.tiles) {
      await spawnTile(t)
    }

    // Flag marker
    try {
      const flagSrc  = await loadGlb('flag-large-red', scene)
      const flagNode = cloneGlb(flagSrc, 'flag', scene)
      flagNode.position = new Vector3(hole.hole.x, 0, hole.hole.z)
      flagNode.scaling  = new Vector3(0.5, 0.5, 0.5)
      flagNode.getChildMeshes(false).forEach(m => shadow.addShadowCaster(m))
      disposables.push(flagNode)
    } catch {}

    // Spawn both balls (side by side on tee)
    const tee = hole.tee
    for (const p of players) {
      const xOff = p.id === 0 ? -0.25 : 0.25
      await spawnBall(p, { x: tee.x + xOff, y: tee.y, z: tee.z })
    }

    // Camera: look down the length of the hole
    const holeCenter = new Vector3(
      (tee.x + hole.hole.x) / 2,
      0,
      (tee.z + hole.hole.z) / 2
    )
    camera.target = holeCenter.clone()
    const holeLen  = Math.abs(hole.hole.z - tee.z) + 8
    camera.radius  = Math.min(40, Math.max(16, holeLen * 0.7))
    camera.alpha   = -Math.PI / 2   // face along Z axis
    camera.beta    = 1.1

    turnQueue     = [0, 1]
    currentPlayer = 0
    emit('aiming')
  }

  // ── Game flow ─────────────────────────────────────────────────────
  function emit(state, extra = {}) {
    const p = players[currentPlayer]
    onStateChanged?.({
      state, player: p,
      hole: currentHole,
      par:  HOLES[currentHole]?.par,
      ...extra,
    })
  }

  function nextTurn() {
    if (turnQueue.length === 0) { endHole(); return }
    currentPlayer = turnQueue[0]
    const b = balls[currentPlayer]
    if (b.physMesh) camera.target.copyFrom(b.physMesh.position)
    emit('aiming')
    if (mode === 'vs-ai' && currentPlayer === 1) setTimeout(doAiShot, 900)
  }

  function endHole() {
    const scores = players.map(p => ({
      player: p, shots: p.shots,
      name:   scoreName(p.shots, HOLES[currentHole].par),
    }))
    players.forEach(p => p.scores.push(p.shots))
    onHoleComplete?.({ hole: currentHole, scores, par: HOLES[currentHole].par })
    currentHole++
    if (currentHole >= HOLES.length) onGameComplete?.({ players })
  }

  function markFinished(p) {
    p.finished = true
    turnQueue  = turnQueue.filter(id => id !== p.id)
    if (turnQueue.length === 0) endHole()
    else nextTurn()
  }

  function rotateTurn(p) {
    if (turnQueue.length < 2) return
    const idx = turnQueue.indexOf(p.id)
    if (idx >= 0) {
      turnQueue.splice(idx, 1)
      turnQueue.push(p.id)
    }
    nextTurn()
  }

  // ── Per-frame ─────────────────────────────────────────────────────
  scene.registerBeforeRender(() => {
    const hole = HOLES[currentHole]
    if (!hole) return
    const hx = hole.hole.x, hz = hole.hole.z

    for (const p of players) {
      const b = balls[p.id]
      if (p.finished || !b.physMesh) continue

      // Sync visual to physics sphere
      if (b.visual) {
        b.visual.position.copyFrom(b.physMesh.position)
        const q = b.agg?.body.getOrientation()
        if (q) b.visual.rotationQuaternion = new Quaternion(q.x, q.y, q.z, q.w)
      }

      // In-hole detection (XZ only)
      const dx = b.physMesh.position.x - hx
      const dz = b.physMesh.position.z - hz
      if (Math.sqrt(dx*dx + dz*dz) < HOLE_RADIUS) {
        b.agg.body.setLinearVelocity(Vector3.Zero())
        b.agg.body.setAngularVelocity(Vector3.Zero())
        onStateChanged?.({ state: 'ball-in-hole', player: p })
        markFinished(p)
        continue
      }

      // Fell off → reset to tee
      if (b.physMesh.position.y < -3) {
        const tee = hole.tee
        const xOff = p.id === 0 ? -0.25 : 0.25
        b.physMesh.position.set(tee.x + xOff, tee.y, tee.z)
        b.agg.body.setLinearVelocity(Vector3.Zero())
        b.agg.body.setAngularVelocity(Vector3.Zero())
      }

      // Max shots exceeded
      if (!p.finished && p.shots >= MAX_SHOTS) markFinished(p)
    }

    // Smooth camera follow active ball
    const ab = balls[currentPlayer]
    if (ab?.physMesh) {
      Vector3.LerpToRef(camera.target, ab.physMesh.position, 0.06, camera.target)
    }
  })

  // ── Speed check ───────────────────────────────────────────────────
  function isMoving(pid) {
    const b = balls[pid]
    if (!b.agg) return false
    return b.agg.body.getLinearVelocity().length() > 0.1
  }

  function whenStopped(pid, cb) {
    let ticks = 0
    const id = setInterval(() => {
      ticks++
      if (!isMoving(pid) || ticks > 250) { clearInterval(id); cb() }
    }, 120)
  }

  // ── Shoot ─────────────────────────────────────────────────────────
  function shoot(pid, wdx, wdz, power) {
    const b = balls[pid]
    const p = players[pid]
    if (!b.agg || p.finished) return

    const imp = new Vector3(wdx * power, power * 0.12, wdz * power)
    b.agg.body.applyImpulse(imp, b.physMesh.getAbsolutePosition())
    p.shots++
    onShotCountChanged?.({ player: p, shots: p.shots })
    emit('rolling')

    whenStopped(pid, () => {
      if (!p.finished) rotateTurn(p)
    })
  }

  // ── AI ────────────────────────────────────────────────────────────
  function doAiShot() {
    const pid = 1
    if (players[pid].finished || isMoving(pid)) return
    const hole = HOLES[currentHole]
    const b    = balls[pid]
    const dir  = new Vector3(hole.hole.x - b.physMesh.position.x, 0, hole.hole.z - b.physMesh.position.z)
    const dist = dir.length()
    dir.normalize()
    dir.x += (Math.random() - 0.5) * 0.2
    dir.z += (Math.random() - 0.5) * 0.2
    dir.normalize()
    const power = Math.min(MAX_POWER, dist * 1.1 + Math.random() * 2 - 1)
    shoot(pid, dir.x, dir.z, power)
  }

  // ── Input ─────────────────────────────────────────────────────────
  let drag = null

  scene.onPointerObservable.add(evt => {
    if (mode === 'vs-ai' && currentPlayer === 1) return
    const p = players[currentPlayer]
    if (!p || p.finished || isMoving(currentPlayer)) return

    if (evt.type === PointerEventTypes.POINTERDOWN && evt.event.button === 0) {
      drag = { x: evt.event.clientX, y: evt.event.clientY }
    }

    if (evt.type === PointerEventTypes.POINTERMOVE && drag) {
      const dx   = evt.event.clientX - drag.x
      const dy   = evt.event.clientY - drag.y
      const dist = Math.hypot(dx, dy)
      if (dist < 4) return

      const power = Math.min(MAX_POWER, dist * DRAG_SCALE)
      onPowerChange?.(power / MAX_POWER)

      // Map screen drag → world direction using camera azimuth
      const a  = camera.alpha
      const nx = -(dx * Math.cos(a) - dy * Math.sin(a)) / dist
      const nz = -(dx * Math.sin(a) + dy * Math.cos(a)) / dist
      onDirLineChange?.({
        ballPos: balls[currentPlayer].physMesh?.position,
        dirX: nx, dirZ: nz,
        power: power / MAX_POWER,
      })
    }

    if (evt.type === PointerEventTypes.POINTERUP && drag) {
      const dx   = evt.event.clientX - drag.x
      const dy   = evt.event.clientY - drag.y
      const dist = Math.hypot(dx, dy)
      drag = null
      onPowerChange?.(0)
      onDirLineChange?.(null)
      if (dist < 8) return

      const power = Math.min(MAX_POWER, dist * DRAG_SCALE)
      const a     = camera.alpha
      const nx    = -(dx * Math.cos(a) - dy * Math.sin(a)) / dist
      const nz    = -(dx * Math.sin(a) + dy * Math.cos(a)) / dist
      shoot(currentPlayer, nx, nz, power)
    }
  })

  // ── Render loop ───────────────────────────────────────────────────
  engine.runRenderLoop(() => scene.render())
  window.addEventListener('resize', () => engine.resize())

  // ── Start ─────────────────────────────────────────────────────────
  await loadHole(0)

  return {
    destroy() {
      engine.stopRenderLoop()
      scene.dispose()
      engine.dispose()
    },
    goNextHole() { if (currentHole < HOLES.length) loadHole(currentHole) },
    get players()       { return players },
    get currentPlayer() { return currentPlayer },
    get currentHole()   { return currentHole },
    holes: HOLES,
  }
}
