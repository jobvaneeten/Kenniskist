import {
  Engine, Scene, Vector3, Color4, Quaternion,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  MeshBuilder, StandardMaterial, Color3,
  ArcRotateCamera, PointerEventTypes, Tools,
  SceneLoader, TransformNode,
  PhysicsAggregate, PhysicsShapeType,
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import HavokPhysics from '@babylonjs/havok'
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin.js'
import { HOLES, TILE_SIZE } from './data/CourseData.js'

const GOLF_PATH  = '/golf/'
const MAX_SHOTS  = 10
const MAX_POWER  = 14     // impulse
const DRAG_SCALE = 0.14   // px → power
const HOLE_RADIUS = 0.6
const BALL_RADIUS = 0.21

export function scoreName(strokes, par) {
  const diff = strokes - par
  if (strokes === 1) return 'Hole-in-one!'
  if (diff <= -2)    return 'Eagle'
  if (diff === -1)   return 'Birdie'
  if (diff === 0)    return 'Par'
  if (diff === 1)    return 'Bogey'
  if (diff === 2)    return 'Double bogey'
  return `+${diff}`
}

// ── GLB cache ─────────────────────────────────────────────────────────
const modelCache = {}

async function loadGlb(name, scene) {
  if (modelCache[name]) return modelCache[name]
  const res  = await SceneLoader.ImportMeshAsync('', GOLF_PATH, `${name}.glb`, scene)
  const root = new TransformNode(`tmpl_${name}`, scene)
  res.meshes.forEach(m => { if (!m.parent) m.parent = root })
  root.setEnabled(false)
  modelCache[name] = root
  return root
}

function cloneGlb(src, name, parent, scene) {
  const node = src.clone(name, parent ?? null, false)
  node.getChildMeshes().forEach(m => m.isPickable = false)
  node.setEnabled(true)
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

  // ── Engine ────────────────────────────────────────────────────────
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
  const scene  = new Scene(engine)
  scene.clearColor = new Color4(0.13, 0.44, 0.25, 1)
  scene.gravity    = new Vector3(0, -9.81, 0)

  // ── Havok ─────────────────────────────────────────────────────────
  const havok = await HavokPhysics()
  scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok))

  // ── Lights ────────────────────────────────────────────────────────
  const amb = new HemisphericLight('amb', Vector3.Up(), scene)
  amb.intensity = 0.55

  const sun = new DirectionalLight('sun', new Vector3(-1, -2, -0.5).normalize(), scene)
  sun.intensity = 1.1
  sun.position  = new Vector3(20, 30, 10)

  const shadow = new ShadowGenerator(1024, sun)
  shadow.useBlurExponentialShadowMap = true

  // ── Camera ────────────────────────────────────────────────────────
  const camera = new ArcRotateCamera('cam', -Math.PI / 2, 1.05, 20, Vector3.Zero(), scene)
  camera.lowerBetaLimit   = 0.25
  camera.upperBetaLimit   = Math.PI / 2.1
  camera.lowerRadiusLimit = 7
  camera.upperRadiusLimit = 40
  camera.inputs.remove(camera.inputs.attached.mousewheel)
  camera.attachControl(canvas, true)

  canvas.addEventListener('wheel', e => {
    camera.radius = Math.max(camera.lowerRadiusLimit,
      Math.min(camera.upperRadiusLimit, camera.radius + e.deltaY * 0.04))
  }, { passive: true })

  // ── State ─────────────────────────────────────────────────────────
  const players = [
    { id: 0, name: 'Rood',  ballKey: 'ball-red',  shots: 0, scores: [], finished: false, ballMesh: null, ballAgg: null },
    { id: 1, name: 'Blauw', ballKey: 'ball-blue', shots: 0, scores: [], finished: false, ballMesh: null, ballAgg: null },
  ]
  let currentHole   = 0
  let currentPlayer = 0
  let turnOrder     = [0, 1]   // indices of players still on this hole
  let sceneMeshes   = []       // all disposable meshes for current hole
  let tileScale     = null     // measured at first load

  // ── Ball factory ──────────────────────────────────────────────────
  async function spawnBall(p, pos) {
    // Clean old
    if (p.ballAgg)  { p.ballAgg.dispose();  p.ballAgg  = null }
    if (p.ballMesh) { p.ballMesh.dispose();  p.ballMesh = null }
    if (p.ballVisual) { p.ballVisual.dispose(); p.ballVisual = null }

    // Invisible physics sphere (so Havok has clean geometry)
    const sphere = MeshBuilder.CreateSphere(`ball_${p.id}`, { diameter: BALL_RADIUS * 2, segments: 8 }, scene)
    sphere.position  = new Vector3(pos.x, pos.y, pos.z)
    sphere.isVisible = false
    p.ballMesh = sphere

    const agg = new PhysicsAggregate(sphere, PhysicsShapeType.SPHERE,
      { mass: 0.045, radius: BALL_RADIUS, restitution: 0.45, friction: 0.55 }, scene)
    agg.body.setLinearDamping(0.4)
    agg.body.setAngularDamping(0.6)
    p.ballAgg = agg

    // GLB visual parented to sphere
    const glbSrc  = await loadGlb(p.ballKey, scene)
    const visual  = cloneGlb(glbSrc, `ballvis_${p.id}`, null, scene)
    visual.setEnabled(true)
    // Scale visual to ~2× ball radius
    visual.scaling = new Vector3(BALL_RADIUS * 2.2, BALL_RADIUS * 2.2, BALL_RADIUS * 2.2)
    p.ballVisual = visual

    visual.getChildMeshes().forEach(m => {
      m.receiveShadows = true
      shadow.addShadowCaster(m)
    })

    sceneMeshes.push(sphere, visual)
  }

  // ── Tile factory ──────────────────────────────────────────────────
  async function spawnTile(tileDef) {
    const { model, x, z, rotY } = tileDef
    const src  = await loadGlb(model, scene)
    const node = cloneGlb(src, `tile_${model}_${x}_${z}`, null, scene)

    // Measure tile size once
    if (tileScale === null) {
      node.computeWorldMatrix(true)
      const bb = node.getHierarchyBoundingVectors(true)
      const sz = bb.max.subtract(bb.min)
      tileScale = TILE_SIZE / Math.max(sz.x, sz.z, 0.01)
    }

    node.scaling  = new Vector3(tileScale, tileScale, tileScale)
    node.position = new Vector3(x * TILE_SIZE, 0, z * TILE_SIZE)
    node.rotation = new Vector3(0, Tools.ToRadians(rotY), 0)

    node.getChildMeshes().forEach(m => {
      m.receiveShadows = true
      shadow.addShadowCaster(m)
      if (m.getTotalVertices() > 0) {
        try {
          new PhysicsAggregate(m, PhysicsShapeType.CONVEX_HULL,
            { mass: 0, restitution: 0.3, friction: 0.65 }, scene)
        } catch (e) { /* skip non-physics meshes */ }
      }
    })

    sceneMeshes.push(node)
    return node
  }

  // ── Load hole ─────────────────────────────────────────────────────
  async function loadHole(idx) {
    // Dispose previous
    sceneMeshes.forEach(m => {
      m.getChildMeshes?.().forEach(c => { c.physicsBody?.dispose(); c.dispose() })
      m.physicsBody?.dispose()
      m.dispose()
    })
    sceneMeshes = []
    players.forEach(p => {
      p.shots    = 0
      p.finished = false
      p.ballAgg  = null
      p.ballMesh = null
      p.ballVisual = null
    })

    const hole = HOLES[idx]

    // Safety floor
    const floor = MeshBuilder.CreateGround('floor', { width: 300, height: 300 }, scene)
    floor.position.y = -8
    floor.isVisible  = false
    new PhysicsAggregate(floor, PhysicsShapeType.BOX, { mass: 0 }, scene)
    sceneMeshes.push(floor)

    // Spawn tiles
    for (const t of hole.tiles) await spawnTile(t)

    // Flag / hole marker
    try {
      const flagSrc  = await loadGlb('flag-red', scene)
      const flagNode = cloneGlb(flagSrc, 'flag', null, scene)
      flagNode.scaling  = new Vector3(tileScale ?? 1, tileScale ?? 1, tileScale ?? 1)
      flagNode.position = new Vector3(hole.hole.x, hole.hole.y - 0.2, hole.hole.z)
      sceneMeshes.push(flagNode)
    } catch {}

    // Spawn balls
    const tee = hole.tee
    for (const p of players) {
      const offset = p.id === 0 ? -0.35 : 0.35
      await spawnBall(p, { x: tee.x + offset, y: tee.y, z: tee.z })
    }

    // Camera
    const hp   = hole.hole
    const midX = (tee.x + hp.x) / 2
    const midZ = (tee.z + hp.z) / 2
    camera.target = new Vector3(midX, 0, midZ)
    camera.radius = Math.min(38, Math.max(16, Math.hypot(hp.x - tee.x, hp.z - tee.z) * 1.6))

    turnOrder     = [0, 1]
    currentPlayer = 0
    emitState('aiming')
  }

  // ── Turn / game flow ──────────────────────────────────────────────
  function emitState(state, extra = {}) {
    const p = players[currentPlayer]
    onStateChanged?.({ state, player: p, hole: currentHole, par: HOLES[currentHole].par, ...extra })
  }

  function nextTurn() {
    if (turnOrder.length === 0) { finishHole(); return }
    currentPlayer = turnOrder[0]
    const p = players[currentPlayer]
    if (p.ballMesh) {
      Vector3.LerpToRef(camera.target, p.ballMesh.position, 1, camera.target)
    }
    emitState('aiming')
    if (mode === 'vs-ai' && currentPlayer === 1) {
      setTimeout(doAiShot, 900)
    }
  }

  function finishHole() {
    const scores = players.map(p => ({
      player: p, shots: p.shots, name: scoreName(p.shots, HOLES[currentHole].par),
    }))
    players.forEach(p => p.scores.push(p.shots))
    onHoleComplete?.({ hole: currentHole, scores, par: HOLES[currentHole].par })
    currentHole++
    if (currentHole >= HOLES.length) {
      onGameComplete?.({ players })
    }
  }

  function advanceTurn(p) {
    if (turnOrder.length > 1) {
      // Move current player to back of queue
      const idx = turnOrder.indexOf(p.id)
      if (idx >= 0) turnOrder.splice(idx, 1)
      turnOrder.push(p.id)
      nextTurn()
    }
  }

  function markFinished(p) {
    p.finished = true
    turnOrder  = turnOrder.filter(id => id !== p.id)
    if (turnOrder.length === 0) finishHole()
    else nextTurn()
  }

  // ── Per-frame updates ─────────────────────────────────────────────
  scene.registerBeforeRender(() => {
    const hole = HOLES[currentHole]
    if (!hole) return
    const hp = new Vector3(hole.hole.x, hole.hole.y, hole.hole.z)

    for (const p of players) {
      if (p.finished || !p.ballMesh) continue

      // Sync visual to physics sphere
      if (p.ballVisual) {
        p.ballVisual.position.copyFrom(p.ballMesh.position)
        if (p.ballAgg?.body) {
          const q = p.ballAgg.body.getOrientation()
          if (q) p.ballVisual.rotationQuaternion = new Quaternion(q.x, q.y, q.z, q.w)
        }
      }

      // In-hole check (XZ only — Y varies with tile height)
      const dx2d = p.ballMesh.position.x - hp.x
      const dz2d = p.ballMesh.position.z - hp.z
      const dist = Math.sqrt(dx2d * dx2d + dz2d * dz2d)
      if (dist < HOLE_RADIUS) {
        p.ballAgg?.body.setLinearVelocity(Vector3.Zero())
        p.ballAgg?.body.setAngularVelocity(Vector3.Zero())
        onStateChanged?.({ state: 'ball-in-hole', player: p })
        markFinished(p)
        continue
      }

      // Fell off
      if (p.ballMesh.position.y < -5) {
        const tee = hole.tee
        const off = p.id === 0 ? -0.35 : 0.35
        p.ballMesh.position = new Vector3(tee.x + off, tee.y + 0.5, tee.z)
        p.ballAgg?.body.setLinearVelocity(Vector3.Zero())
        p.ballAgg?.body.setAngularVelocity(Vector3.Zero())
      }

      // Max shots
      if (p.shots >= MAX_SHOTS) {
        markFinished(p)
        continue
      }
    }

    // Camera follows active ball
    const active = players[currentPlayer]
    if (active?.ballMesh) {
      Vector3.LerpToRef(camera.target, active.ballMesh.position, 0.07, camera.target)
    }
  })

  // ── Ball speed check ──────────────────────────────────────────────
  function isMoving(p) {
    if (!p.ballAgg) return false
    return p.ballAgg.body.getLinearVelocity().length() > 0.12
  }

  function waitStop(p, onStop) {
    let ticks = 0
    const id = setInterval(() => {
      ticks++
      if (!isMoving(p) || ticks > 300) {
        clearInterval(id)
        onStop()
      }
    }, 100)
  }

  // ── Shoot ─────────────────────────────────────────────────────────
  function shoot(p, worldDirX, worldDirZ, power) {
    if (!p.ballAgg) return
    const imp = new Vector3(worldDirX * power, power * 0.15, worldDirZ * power)
    p.ballAgg.body.applyImpulse(imp, p.ballMesh.getAbsolutePosition())
    p.shots++
    onShotCountChanged?.({ player: p, shots: p.shots })
    emitState('rolling')
    waitStop(p, () => {
      if (!p.finished) advanceTurn(p)
    })
  }

  // ── AI ────────────────────────────────────────────────────────────
  function doAiShot() {
    const p = players[1]
    if (!p.ballMesh || p.finished || isMoving(p)) return
    const hole = HOLES[currentHole]
    const hp   = new Vector3(hole.hole.x, hole.hole.y, hole.hole.z)
    const dir  = hp.subtract(p.ballMesh.position)
    const dist = dir.length()
    dir.normalizeToRef(dir)
    dir.x += (Math.random() - 0.5) * 0.22
    dir.z += (Math.random() - 0.5) * 0.22
    dir.normalize()
    const power = Math.min(MAX_POWER, dist * 1.2 + Math.random() * 2 - 1)
    shoot(p, dir.x, dir.z, power)
  }

  // ── Input ─────────────────────────────────────────────────────────
  let dragStart = null

  scene.onPointerObservable.add(evt => {
    const p = players[currentPlayer]
    if (!p || p.finished || isMoving(p)) return
    if (mode === 'vs-ai' && currentPlayer === 1) return   // AI controls player 1

    if (evt.type === PointerEventTypes.POINTERDOWN && evt.event.button === 0) {
      dragStart = { x: evt.event.clientX, y: evt.event.clientY }
    }

    if (evt.type === PointerEventTypes.POINTERMOVE && dragStart) {
      const dx   = evt.event.clientX - dragStart.x
      const dy   = evt.event.clientY - dragStart.y
      const dist = Math.hypot(dx, dy)
      const pow  = Math.min(MAX_POWER, dist * DRAG_SCALE)
      onPowerChange?.(pow / MAX_POWER)

      if (dist > 3) {
        // Map screen drag → world direction using camera azimuth
        const a   = camera.alpha
        const nx  = -(dx * Math.cos(a) - dy * Math.sin(a)) / dist
        const nz  = -(dx * Math.sin(a) + dy * Math.cos(a)) / dist
        onDirLineChange?.({ ballPos: p.ballMesh.position, dirX: nx, dirZ: nz, power: pow / MAX_POWER })
      }
    }

    if (evt.type === PointerEventTypes.POINTERUP && dragStart) {
      const dx   = evt.event.clientX - dragStart.x
      const dy   = evt.event.clientY - dragStart.y
      const dist = Math.hypot(dx, dy)
      dragStart  = null
      onPowerChange?.(0)
      onDirLineChange?.(null)
      if (dist < 6) return

      const pow  = Math.min(MAX_POWER, dist * DRAG_SCALE)
      const a    = camera.alpha
      const nx   = -(dx * Math.cos(a) - dy * Math.sin(a)) / dist
      const nz   = -(dx * Math.sin(a) + dy * Math.cos(a)) / dist
      shoot(p, nx, nz, pow)
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
