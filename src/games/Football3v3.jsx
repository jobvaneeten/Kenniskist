import { useEffect, useRef, useState } from 'react'
import {
  Engine, Scene, FreeCamera, Vector3, Color3, Color4, Quaternion,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  MeshBuilder, StandardMaterial, DynamicTexture,
  DefaultRenderingPipeline,
} from '@babylonjs/core'
import './football3v3.css'

// ── Constants ─────────────────────────────────────────────────────────────────
const FIELD_W      = 52          // half-width  (x axis)
const FIELD_D      = 35          // half-depth  (z axis)
const GOAL_HALF_W  = 4.0
const GOAL_H       = 2.6
const GOAL_DEPTH   = 1.8
const BALL_R       = 0.52
const PLAYER_R     = 0.45
const PLAYER_H     = 1.8
const WALK_SPEED   = 7.5
const BOOST_SPEED  = 17
const BOOST_DRAIN  = 38          // energy/sec while boosting
const BOOST_FILL   = 22          // energy/sec while not boosting
const GOAL_SCORE   = 5           // first to 5 goals wins
const AI_SPEED     = 6.8
const AI_BOOST_SPD = 12
const KICK_DIST    = PLAYER_R + BALL_R + 0.35

// Team colours
const COL_BLUE = '#1155ee'
const COL_RED  = '#dd2222'
const COL_BALL = '#ffffff'

// ── Field texture ─────────────────────────────────────────────────────────────
function makeFieldTexture(scene) {
  const W = 1024, H = 1024
  const tex = new DynamicTexture('ft', { width: W, height: H }, scene)
  const ctx = tex.getContext()
  const stripes = 14
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#25c025' : '#1fac1f'
    ctx.fillRect(0, i * (H / stripes), W, H / stripes)
  }
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8
  const pad = 24
  ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2)
  ctx.beginPath(); ctx.moveTo(W / 2, pad); ctx.lineTo(W / 2, H - pad); ctx.stroke()
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 105, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 8, 0, Math.PI * 2); ctx.fill()
  // Goal areas
  const gaW = W * 0.18, gaH = H * 0.10
  ctx.strokeRect((W - gaW) / 2, pad, gaW, gaH)
  ctx.strokeRect((W - gaW) / 2, H - pad - gaH, gaW, gaH)
  tex.update()
  return tex
}

// ── Build scene geometry ──────────────────────────────────────────────────────
function buildScene(scene, shadowGen) {
  scene.clearColor = new Color4(0.44, 0.67, 0.93, 1)
  scene.fogMode    = 1 // EXP
  scene.fogColor   = new Color3(0.44, 0.67, 0.93)
  scene.fogDensity = 0.005

  // Lights
  const hemi = new HemisphericLight('h', new Vector3(0, 1, 0), scene)
  hemi.intensity   = 0.6
  hemi.groundColor = new Color3(0.1, 0.22, 0.06)
  hemi.diffuse     = new Color3(0.78, 0.85, 1.0)

  const sun = new DirectionalLight('sun', new Vector3(-0.4, -1, -0.6).normalize(), scene)
  sun.position  = new Vector3(40, 60, 40)
  sun.intensity = 2.4
  sun.diffuse   = new Color3(1, 0.97, 0.88)

  const sg = shadowGen ?? new ShadowGenerator(2048, sun)
  sg.usePoissonSampling = true
  sg.bias = 0.0003

  // Field
  const ground = MeshBuilder.CreateGround('g', { width: FIELD_W * 2, height: FIELD_D * 2, subdivisions: 1 }, scene)
  ground.receiveShadows = true; ground.isPickable = false
  const gmat = new StandardMaterial('gm', scene)
  gmat.diffuseTexture = makeFieldTexture(scene)
  gmat.specularColor  = new Color3(0.04, 0.04, 0.04)
  ground.material = gmat

  // Goals (x-axis: blue goal = left x=-FIELD_W, red goal = right x=+FIELD_W)
  _buildGoal(scene, -FIELD_W, COL_BLUE)
  _buildGoal(scene,  FIELD_W, COL_RED)

  // Fence/walls
  _buildFence(scene)

  // Simple stands
  _buildStands(scene)

  return { sun, shadowGen: sg }
}

function _buildGoal(scene, posX, teamHex) {
  const postMat = new StandardMaterial('gp' + posX, scene)
  postMat.diffuseColor  = Color3.White()
  postMat.emissiveColor = new Color3(0.15, 0.15, 0.15)
  postMat.specularColor = new Color3(0.5, 0.5, 0.5)

  const cyl = (x, y, z, h, d, ry = 0, rz = 0) => {
    const m = MeshBuilder.CreateCylinder('gpc', { height: h, diameter: d, tessellation: 12 }, scene)
    m.material = postMat; m.isPickable = false
    m.position.set(x, y, z); m.rotation.y = ry; m.rotation.z = rz
  }
  const dir = posX < 0 ? 1 : -1
  const bX = posX + dir * GOAL_DEPTH
  const mX = (posX + bX) / 2

  // Uprights + crossbar (front frame)
  cyl(posX, GOAL_H / 2, -GOAL_HALF_W, GOAL_H, 0.14)
  cyl(posX, GOAL_H / 2,  GOAL_HALF_W, GOAL_H, 0.14)
  cyl(posX, GOAL_H, 0, GOAL_HALF_W * 2 + 0.14, 0.12, 0, Math.PI / 2)
  // Side rails
  cyl(mX, GOAL_H, -GOAL_HALF_W, GOAL_DEPTH, 0.08, Math.PI / 2)
  cyl(mX, GOAL_H,  GOAL_HALF_W, GOAL_DEPTH, 0.08, Math.PI / 2)

  // Net texture
  const sz = 256
  const netTex = new DynamicTexture('nt' + posX, { width: sz, height: sz }, scene)
  netTex.hasAlpha = true
  const ctx = netTex.getContext()
  ctx.clearRect(0, 0, sz, sz)
  ctx.strokeStyle = 'rgba(255,255,255,0.80)'; ctx.lineWidth = 2.5
  for (let x = 0; x <= sz; x += 18) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, sz); ctx.stroke() }
  for (let y = 0; y <= sz; y += 18) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(sz, y); ctx.stroke() }
  netTex.update()

  const mkNet = (w, h2, x, y, z, ry, rx = 0) => {
    const nm = MeshBuilder.CreatePlane('net', { width: w, height: h2 }, scene)
    nm.position.set(x, y, z); nm.rotation.y = ry; nm.rotation.x = rx; nm.isPickable = false
    const nmat = new StandardMaterial('nm' + Math.random(), scene)
    nmat.diffuseTexture = netTex; nmat.diffuseTexture.hasAlpha = true
    nmat.useAlphaFromDiffuseTexture = true; nmat.backFaceCulling = false
    nmat.specularColor = Color3.Black(); nm.material = nmat
  }
  mkNet(GOAL_HALF_W * 2, GOAL_H, bX, GOAL_H / 2, 0, dir > 0 ? 0 : Math.PI)
  mkNet(GOAL_DEPTH, GOAL_H, mX, GOAL_H / 2, -GOAL_HALF_W,  Math.PI / 2)
  mkNet(GOAL_DEPTH, GOAL_H, mX, GOAL_H / 2,  GOAL_HALF_W, -Math.PI / 2)
  mkNet(GOAL_HALF_W * 2, GOAL_DEPTH, posX < 0 ? mX : mX, GOAL_H, 0, 0, -Math.PI / 2)
}

function _buildFence(scene) {
  const mat = new StandardMaterial('fence', scene)
  mat.diffuseColor = new Color3(0.12, 0.18, 0.1); mat.alpha = 0.75; mat.backFaceCulling = false
  const H = 1.5, T = 0.14
  ;[
    { w: FIELD_W * 2 + T * 2, d: T, x: 0,       z:  FIELD_D },
    { w: FIELD_W * 2 + T * 2, d: T, x: 0,       z: -FIELD_D },
    { w: T, d: FIELD_D * 2,        x:  FIELD_W, z: 0 },
    { w: T, d: FIELD_D * 2,        x: -FIELD_W, z: 0 },
  ].forEach(({ w, d, x, z }) => {
    const f = MeshBuilder.CreateBox('f', { width: w, height: H, depth: d }, scene)
    f.position.set(x, H / 2, z); f.material = mat; f.isPickable = false
  })
}

function _buildStands(scene) {
  const concMat = new StandardMaterial('conc', scene)
  concMat.diffuseColor = new Color3(0.22, 0.22, 0.26); concMat.specularColor = Color3.Black()
  const CROWD = [
    new Color3(0.85, 0.10, 0.10), new Color3(0.95, 0.55, 0.05),
    new Color3(0.10, 0.30, 0.85), new Color3(0.95, 0.92, 0.20),
    new Color3(0.20, 0.70, 0.25), new Color3(0.92, 0.92, 0.92),
  ]
  const ROWS = 8, ROW_H = 1.3, ROW_D = 1.7, GAP = 3
  const side = (oz, len) => {
    for (let r = 0; r < ROWS; r++) {
      const d = GAP + r * ROW_D + ROW_D / 2
      const y = r * ROW_H + ROW_H / 2
      const pos = new Vector3(0, y, oz > 0 ? oz + d : oz - d)
      const step = MeshBuilder.CreateBox('s', { width: len, height: ROW_H, depth: ROW_D }, scene)
      step.position.copyFrom(pos); step.material = concMat; step.isPickable = false
      const seat = MeshBuilder.CreateBox('sc', { width: len, height: 0.2, depth: ROW_D * 0.7 }, scene)
      seat.position.set(0, y + ROW_H / 2 + 0.1, oz > 0 ? oz + d : oz - d)
      const sm = new StandardMaterial('sc' + r + oz, scene)
      sm.diffuseColor = CROWD[(r * 2 + (oz > 0 ? 0 : 3)) % CROWD.length]
      sm.emissiveColor = sm.diffuseColor.scale(0.15); sm.specularColor = Color3.Black()
      seat.material = sm; seat.isPickable = false
    }
  }
  side( FIELD_D, FIELD_W * 2 + 4)
  side(-FIELD_D, FIELD_W * 2 + 4)
  ;[1, -1].forEach((sx, si) => {
    for (let r = 0; r < ROWS; r++) {
      const d = GAP + r * ROW_D + ROW_D / 2
      const y = r * ROW_H + ROW_H / 2
      const step = MeshBuilder.CreateBox('sx', { width: ROW_D, height: ROW_H, depth: FIELD_D * 2 + 4 }, scene)
      step.position.set(sx * (FIELD_W + d), y, 0); step.material = concMat; step.isPickable = false
      const seat = MeshBuilder.CreateBox('scx', { width: ROW_D * 0.7, height: 0.2, depth: FIELD_D * 2 + 4 }, scene)
      seat.position.set(sx * (FIELD_W + d), y + ROW_H / 2 + 0.1, 0)
      const sm = new StandardMaterial('scx' + r + si, scene)
      sm.diffuseColor = CROWD[(r * 2 + si * 3 + 1) % CROWD.length]
      sm.emissiveColor = sm.diffuseColor.scale(0.15); sm.specularColor = Color3.Black()
      seat.material = sm; seat.isPickable = false
    }
  })
}

// ── Player mesh ───────────────────────────────────────────────────────────────
function makePlayerMesh(scene, hex, sg) {
  const root = MeshBuilder.CreateCylinder('body', { height: PLAYER_H, diameter: PLAYER_R * 2, tessellation: 14 }, scene)
  root.position.set(0, PLAYER_H / 2, 0)
  const bmat = new StandardMaterial('bm', scene)
  bmat.diffuseColor  = Color3.FromHexString(hex)
  bmat.specularColor = new Color3(0.3, 0.3, 0.3); bmat.specularPower = 32
  root.material = bmat; root.isPickable = false
  if (sg) sg.addShadowCaster(root)

  const head = MeshBuilder.CreateSphere('head', { diameter: PLAYER_R * 2.2, segments: 10 }, scene)
  head.parent = root; head.position.y = PLAYER_H / 2 + PLAYER_R * 1.0
  const hmat = new StandardMaterial('hm', scene)
  hmat.diffuseColor = new Color3(0.93, 0.78, 0.62); hmat.specularColor = new Color3(0.2, 0.2, 0.2)
  head.material = hmat; head.isPickable = false
  if (sg) sg.addShadowCaster(head)

  // Number on body
  const numTex = new DynamicTexture('nt', { width: 128, height: 128 }, scene)
  const nctx = numTex.getContext()
  nctx.fillStyle = hex; nctx.fillRect(0, 0, 128, 128)
  nctx.fillStyle = '#ffffff'; nctx.font = 'bold 64px Arial'; nctx.textAlign = 'center'
  nctx.fillText('#', 64, 88)
  numTex.update()
  bmat.diffuseTexture = numTex

  const pivot = MeshBuilder.CreateBox('pivot', { size: 0.01 }, scene)
  pivot.isPickable = false
  pivot.isVisible  = false
  root.parent = pivot
  root.position.y = PLAYER_H / 2

  return pivot
}

// ── Ball ──────────────────────────────────────────────────────────────────────
function makeBall(scene, sg) {
  const b = MeshBuilder.CreateSphere('ball', { diameter: BALL_R * 2, segments: 14 }, scene)
  b.position.set(0, BALL_R, 0)
  const bmat = new StandardMaterial('bm', scene)
  // Black-and-white football texture
  const sz = 256
  const tex = new DynamicTexture('bt', { width: sz, height: sz }, scene)
  const ctx = tex.getContext()
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sz, sz)
  ctx.fillStyle = '#111'
  const r = sz * 0.14
  const drawHex = (cx, cy) => {
    ctx.beginPath()
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 6; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) }
    ctx.closePath(); ctx.fill()
  }
  drawHex(sz / 2, sz / 2)
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; drawHex(sz / 2 + Math.cos(a) * r * 2.55, sz / 2 + Math.sin(a) * r * 2.55) }
  tex.update()
  bmat.diffuseTexture = tex; bmat.specularPower = 64; bmat.specularColor = new Color3(0.25, 0.25, 0.25)
  b.material = bmat
  if (sg) sg.addShadowCaster(b)
  b.receiveShadows = true
  return b
}

// ── AI logic ──────────────────────────────────────────────────────────────────
class AIPlayer {
  constructor(mesh, targetGoalX, teamX, idx) {
    this.mesh        = mesh      // the pivot node
    this.targetGoalX = targetGoalX  // x of goal to score in
    this.teamX       = teamX        // x side where this team defends
    this.speed       = AI_SPEED
    this.vel         = { x: 0, z: 0 }
    this._timer      = idx * 0.4
    this._wanderAng  = 0
  }

  update(dt, ballPos, ballVel, playerPos) {
    this._timer += dt

    const bx = ballPos.x, bz = ballPos.z
    const mx = this.mesh.position.x, mz = this.mesh.position.z

    // Decide: is ball on our side? Attack or hold position
    const ballOnOurSide = (this.teamX < 0) ? bx < 5 : bx > -5
    let tx, tz

    if (ballOnOurSide || Math.random() < 0.25) {
      // Intercept ball with slight lead
      tx = bx + ballVel.x * 0.3
      tz = bz + ballVel.z * 0.3
    } else {
      // Hold a defensive position
      tx = this.teamX * 0.45 + (Math.sin(this._timer * 0.8) * 5)
      tz = Math.sin(this._timer * 0.6 + this.teamX) * (FIELD_D * 0.55)
    }

    // Steer toward target
    const dx = tx - mx, dz = tz - mz
    const dist = Math.hypot(dx, dz)
    if (dist > 0.1) {
      const spd = this.speed * Math.min(1, dist / 3)
      this.vel.x = (dx / dist) * spd
      this.vel.z = (dz / dist) * spd
    } else {
      this.vel.x *= 0.85; this.vel.z *= 0.85
    }

    this.mesh.position.x = Math.max(-FIELD_W + 1, Math.min(FIELD_W - 1, mx + this.vel.x * dt))
    this.mesh.position.z = Math.max(-FIELD_D + 1, Math.min(FIELD_D - 1, mz + this.vel.z * dt))

    // Face movement direction
    const spd2 = Math.hypot(this.vel.x, this.vel.z)
    if (spd2 > 0.3) {
      const ang = Math.atan2(this.vel.x, this.vel.z)
      this.mesh.rotation.y = ang + Math.PI
    }
  }
}

// ── Goal detection ────────────────────────────────────────────────────────────
function checkGoal(ballPos, ballPrevX) {
  const inZ = Math.abs(ballPos.z) < GOAL_HALF_W - 0.05
  const inY = ballPos.y > 0.05 && ballPos.y < GOAL_H + 0.15

  // Blue goal at x = -FIELD_W: ball crosses from right to left
  if (inZ && inY && ballPrevX > -FIELD_W && ballPos.x <= -FIELD_W + BALL_R) return 'red'   // red scores
  // Red goal at x = +FIELD_W: ball crosses from left to right
  if (inZ && inY && ballPrevX < FIELD_W && ballPos.x >= FIELD_W - BALL_R) return 'blue'    // blue scores
  return null
}

// ── initScene ─────────────────────────────────────────────────────────────────
function initScene(canvas, { onScoreBlue, onScoreRed, onLoad, onGoal, onWin }) {
  const engine = new Engine(canvas, true, { adaptToDeviceRatio: true })
  const scene  = new Scene(engine)

  const camera = new FreeCamera('cam', new Vector3(0, 12, 25), scene)
  camera.inputs.clear(); camera.minZ = 0.1; camera.maxZ = 600

  const { sun, shadowGen } = buildScene(scene, null)

  try {
    const pipe = new DefaultRenderingPipeline('p', true, scene, [camera])
    pipe.bloomEnabled = true; pipe.bloomThreshold = 0.75; pipe.bloomWeight = 0.3
    pipe.bloomKernel  = 64;   pipe.bloomScale     = 0.5
    pipe.vignetteEnabled = true; pipe.vignetteWeight = 1.1
    pipe.imageProcessingEnabled = true
    pipe.imageProcessing.contrast = 1.12; pipe.imageProcessing.exposure = 1.15
  } catch {}

  // ── Players ──────────────────────────────────────────────────────────────
  const bluePlayer = makePlayerMesh(scene, COL_BLUE, shadowGen)
  bluePlayer.position.set(-8, 0, 0)

  const bluePivots = [
    makePlayerMesh(scene, '#3388ff', shadowGen),
    makePlayerMesh(scene, '#3388ff', shadowGen),
  ]
  bluePivots[0].position.set(-12, 0, -6)
  bluePivots[1].position.set(-12, 0,  6)

  const redPivots = [
    makePlayerMesh(scene, COL_RED, shadowGen),
    makePlayerMesh(scene, '#ff6644', shadowGen),
    makePlayerMesh(scene, '#ff6644', shadowGen),
  ]
  redPivots[0].position.set(10, 0,  0)
  redPivots[1].position.set(14, 0, -6)
  redPivots[2].position.set(14, 0,  6)

  // ── Ball ──────────────────────────────────────────────────────────────────
  const ballMesh = makeBall(scene, shadowGen)
  let ballVel = { x: 0, y: 0, z: 0 }
  let ballPrevX = 0
  let ballOnGround = true

  const resetBall = () => {
    ballMesh.position.set(0, BALL_R, 0)
    ballVel = { x: 0, y: 0, z: 0 }
    ballPrevX = 0; ballOnGround = true
    if (ballMesh.rotationQuaternion) ballMesh.rotationQuaternion = Quaternion.Identity()
    bluePlayer.position.set(-8, 0, 0)
    bluePivots[0].position.set(-12, 0, -6); bluePivots[1].position.set(-12, 0, 6)
    redPivots[0].position.set(10, 0, 0); redPivots[1].position.set(14, 0, -6); redPivots[2].position.set(14, 0, 6)
  }

  // ── AI setup ──────────────────────────────────────────────────────────────
  const blueAI = [
    new AIPlayer(bluePivots[0], FIELD_W, -FIELD_W, 0),
    new AIPlayer(bluePivots[1], FIELD_W, -FIELD_W, 1),
  ]
  const redAI = [
    new AIPlayer(redPivots[0], -FIELD_W, FIELD_W, 0),
    new AIPlayer(redPivots[1], -FIELD_W, FIELD_W, 1),
    new AIPlayer(redPivots[2], -FIELD_W, FIELD_W, 2),
  ]
  // Make red AI slightly smarter
  redAI.forEach(ai => { ai.speed = AI_BOOST_SPD * 0.78 })

  // ── Player input ──────────────────────────────────────────────────────────
  const keys = {}
  const onKD = e => { keys[e.code] = true }
  const onKU = e => { keys[e.code] = false }
  window.addEventListener('keydown', onKD)
  window.addEventListener('keyup',   onKU)

  let energy   = 100   // 0-100
  let playerRotY = Math.PI   // facing toward goal
  let goalPaused = false
  let gameActive = true
  let scoreBlue  = 0, scoreRed = 0

  // ── Camera ────────────────────────────────────────────────────────────────
  const camPos    = new Vector3(-8, 12, 25)
  const camLookAt = new Vector3(0, 1, 0)

  // ── Game loop ─────────────────────────────────────────────────────────────
  scene.registerBeforeRender(() => {
    if (!gameActive) return
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05)
    if (goalPaused) return

    // ── Player movement ──────────────────────────────────────────────────
    const boosting = keys['Space'] && energy > 5
    const spd = boosting ? BOOST_SPEED : WALK_SPEED
    energy = boosting
      ? Math.max(0,   energy - BOOST_DRAIN * dt)
      : Math.min(100, energy + BOOST_FILL  * dt)

    const kx = (keys['ArrowLeft']  || keys['KeyA']) ? -1 : (keys['ArrowRight'] || keys['KeyD']) ? 1 : 0
    const kz = (keys['ArrowUp']    || keys['KeyW']) ? -1 : (keys['ArrowDown']  || keys['KeyS']) ? 1 : 0
    const len2 = Math.hypot(kx, kz)
    const vx = len2 > 0 ? (kx / len2) * spd : 0
    const vz = len2 > 0 ? (kz / len2) * spd : 0

    bluePlayer.position.x = Math.max(-FIELD_W + 1, Math.min(FIELD_W - 1, bluePlayer.position.x + vx * dt))
    bluePlayer.position.z = Math.max(-FIELD_D + 1, Math.min(FIELD_D - 1, bluePlayer.position.z + vz * dt))
    bluePlayer.position.y = 0

    if (Math.hypot(vx, vz) > 0.5) {
      const target = Math.atan2(vx, vz)
      let diff = target - playerRotY
      while (diff >  Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      playerRotY += diff * Math.min(1, 12 * dt)
      bluePlayer.rotation.y = playerRotY
    }

    // ── AI updates ───────────────────────────────────────────────────────
    const bPos  = ballMesh.position
    const bpRef = bluePlayer.position
    blueAI.forEach(ai => ai.update(dt, bPos, ballVel, bpRef))
    redAI.forEach(ai  => ai.update(dt, bPos, ballVel, bpRef))

    // ── Ball physics ─────────────────────────────────────────────────────
    ballPrevX = bPos.x
    if (!ballOnGround) ballVel.y -= 9.82 * dt
    bPos.x += ballVel.x * dt; bPos.y += ballVel.y * dt; bPos.z += ballVel.z * dt

    // Ground bounce
    if (bPos.y <= BALL_R) {
      bPos.y = BALL_R
      if (Math.abs(ballVel.y) > 0.8) { ballVel.y *= -0.45 }
      else { ballVel.y = 0; ballOnGround = true }
    } else { ballOnGround = false }

    // Friction
    const f = ballOnGround ? Math.pow(0.89, dt * 60) : Math.pow(0.999, dt * 60)
    ballVel.x *= f; ballVel.z *= f

    // Wall bounces (Z)
    if (Math.abs(bPos.z) > FIELD_D - BALL_R) {
      bPos.z = Math.sign(bPos.z) * (FIELD_D - BALL_R)
      ballVel.z *= -0.5
    }
    // Wall bounces (X) — but only outside goal area
    const inGoalZ = Math.abs(bPos.z) < GOAL_HALF_W
    if (!inGoalZ && Math.abs(bPos.x) > FIELD_W - BALL_R) {
      bPos.x = Math.sign(bPos.x) * (FIELD_W - BALL_R)
      ballVel.x *= -0.5
    }

    // Ball rolling rotation
    const hSpd = Math.hypot(ballVel.x, ballVel.z)
    if (hSpd > 0.05) {
      const rollAng = (hSpd * dt) / BALL_R
      const axis    = new Vector3(ballVel.z, 0, -ballVel.x).normalize()
      const rot     = Quaternion.RotationAxis(axis, rollAng)
      if (!ballMesh.rotationQuaternion) ballMesh.rotationQuaternion = Quaternion.Identity()
      ballMesh.rotationQuaternion = rot.multiply(ballMesh.rotationQuaternion)
    }

    // ── Player ↔ ball collisions ─────────────────────────────────────────
    const allPlayers = [
      { pivot: bluePlayer, isPlayer: true, boostMult: boosting ? 1.5 : 1 },
      ...bluePivots.map(p => ({ pivot: p, isPlayer: false, boostMult: 1 })),
      ...redPivots.map(p  => ({ pivot: p, isPlayer: false, boostMult: 1 })),
    ]
    allPlayers.forEach(({ pivot, boostMult }) => {
      const px = pivot.position.x, pz = pivot.position.z
      const dx = bPos.x - px, dz = bPos.z - pz
      const dist = Math.hypot(dx, dz)
      if (dist < KICK_DIST && dist > 0.01) {
        const nx = dx / dist, nz = dz / dist
        const overlap = KICK_DIST - dist
        bPos.x += nx * overlap; bPos.z += nz * overlap
        const spd3 = Math.hypot(ballVel.x - 0, ballVel.z - 0)
        const kickSpd = Math.max(4, spd3 * 1.4 + 5) * boostMult
        // Limit how far the ball can fly: cap kick speed
        const cappedSpd = Math.min(kickSpd, 14)
        ballVel.x = nx * cappedSpd
        ballVel.z = nz * cappedSpd
        ballVel.y = Math.min(cappedSpd * 0.18, 2.5)
        ballOnGround = false
      }
    })

    // ── AI kick direction toward goal ─────────────────────────────────────
    ;[...bluePivots, ...redPivots].forEach((pivot, i) => {
      const ai    = i < 2 ? blueAI[i] : redAI[i - 2]
      const px    = pivot.position.x, pz = pivot.position.z
      const dx    = bPos.x - px, dz = bPos.z - pz
      const dist  = Math.hypot(dx, dz)
      if (dist < KICK_DIST + 0.3 && dist > 0.01) {
        // Blend between straight-to-goal and away-from-player
        const goalX = ai.targetGoalX
        const toGoalX = goalX - bPos.x, toGoalZ = -bPos.z * 0.5
        const tgLen = Math.hypot(toGoalX, toGoalZ) + 0.001
        const gx = toGoalX / tgLen, gz = toGoalZ / tgLen
        const blend = 0.55
        const kx2 = (dx / dist) * (1 - blend) + gx * blend
        const kz2 = (dz / dist) * (1 - blend) + gz * blend
        const kLen = Math.hypot(kx2, kz2) + 0.001
        const kickSpd = Math.min(12, 6 + Math.hypot(ai.vel.x, ai.vel.z) * 1.2)
        ballVel.x = (kx2 / kLen) * kickSpd
        ballVel.z = (kz2 / kLen) * kickSpd
        ballVel.y = Math.min(kickSpd * 0.15, 2.0)
        ballOnGround = false
      }
    })

    // ── Goal check ────────────────────────────────────────────────────────
    const scored = checkGoal(bPos, ballPrevX)
    if (scored) {
      goalPaused = true
      if (scored === 'blue') { scoreBlue++; onScoreBlue(scoreBlue) }
      else                   { scoreRed++;  onScoreRed(scoreRed)   }
      onGoal(scored)
      const win = scoreBlue >= GOAL_SCORE || scoreRed >= GOAL_SCORE
      if (win) {
        gameActive = false
        setTimeout(() => onWin(scoreBlue >= GOAL_SCORE ? 'blue' : 'red'), 1800)
      } else {
        setTimeout(() => { resetBall(); goalPaused = false }, 2000)
      }
    }

    // ── Camera follow player ──────────────────────────────────────────────
    const pp  = bluePlayer.position
    const bp2 = ballMesh.position
    const L1  = 1 - Math.exp(-dt * 8)
    const L2  = 1 - Math.exp(-dt * 12)

    // Camera sits behind & above the player, slightly toward ball
    const desiredCamX = pp.x - Math.sin(playerRotY) * 10
    const desiredCamZ = pp.z - Math.cos(playerRotY) * 10 + (bp2.z - pp.z) * 0.2
    camPos.x += (desiredCamX - camPos.x) * L1
    camPos.y += (pp.y + 9    - camPos.y) * L1
    camPos.z += (desiredCamZ - camPos.z) * L1

    // Look at midpoint between player and ball
    const lookX = pp.x * 0.6 + bp2.x * 0.4
    const lookZ = pp.z * 0.6 + bp2.z * 0.4
    camLookAt.x += (lookX       - camLookAt.x) * L2
    camLookAt.y += (pp.y + 1.2  - camLookAt.y) * L2
    camLookAt.z += (lookZ       - camLookAt.z) * L2

    camera.position.copyFrom(camPos)
    camera.setTarget(camLookAt)
  })

  engine.runRenderLoop(() => scene.render())
  const onResize = () => engine.resize()
  window.addEventListener('resize', onResize)

  onLoad()

  return {
    cleanup: () => {
      gameActive = false
      window.removeEventListener('keydown', onKD)
      window.removeEventListener('keyup',   onKU)
      window.removeEventListener('resize',  onResize)
      engine.stopRenderLoop(); scene.dispose(); engine.dispose()
    },
    getEnergy: () => energy,
  }
}

// ── React component ───────────────────────────────────────────────────────────
export default function Football3v3({ onBack }) {
  const canvasRef   = useRef(null)
  const sceneRef    = useRef(null)
  const energyRef   = useRef(null)
  const rafRef      = useRef(null)

  const [phase,      setPhase]      = useState('intro')   // intro | playing | goal | win
  const [scoreBlue,  setScoreBlue]  = useState(0)
  const [scoreRed,   setScoreRed]   = useState(0)
  const [goalTeam,   setGoalTeam]   = useState(null)
  const [winner,     setWinner]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [energyPct,  setEnergyPct]  = useState(100)

  // Poll energy bar at ~30fps
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'goal') return
    const id = setInterval(() => {
      if (sceneRef.current?.getEnergy) setEnergyPct(sceneRef.current.getEnergy())
    }, 33)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return

    const ref = initScene(canvas, {
      onScoreBlue: v => setScoreBlue(v),
      onScoreRed:  v => setScoreRed(v),
      onLoad:      () => setLoading(false),
      onGoal: team => {
        setGoalTeam(team)
        setPhase('goal')
        setTimeout(() => setPhase('playing'), 2100)
      },
      onWin: team => {
        setWinner(team)
        setPhase('win')
      },
    })
    sceneRef.current = ref
    return () => { ref.cleanup(); sceneRef.current = null }
  }, [phase === 'playing'])

  // ── Intro screen ────────────────────────────────────────────────────────
  if (phase === 'intro') return (
    <div className="v3-outer v3-intro">
      <button className="v3-back" onClick={onBack}>← Menu</button>
      <div className="v3-intro-box">
        <div className="v3-intro-title">⚽ 3 vs 3 Voetbal</div>
        <div className="v3-intro-sub">Rocket League stijl</div>
        <div className="v3-rules">
          <div className="v3-rule"><kbd>W A S D</kbd> / <kbd>↑ ↓ ← →</kbd> Bewegen</div>
          <div className="v3-rule"><kbd>SPATIE</kbd> Boost 🚀</div>
          <div className="v3-rule">Eerste team met <b>{GOAL_SCORE} goals</b> wint!</div>
          <div className="v3-rule">Jij speelt: <span className="v3-blue">Blauw team</span></div>
        </div>
        <button className="v3-start-btn" onClick={() => { setLoading(true); setScoreBlue(0); setScoreRed(0); setPhase('playing') }}>
          🏃 Spelen!
        </button>
      </div>
    </div>
  )

  // ── Win screen ───────────────────────────────────────────────────────────
  if (phase === 'win') return (
    <div className="v3-outer v3-win">
      <div className="v3-win-box">
        <div className="v3-win-title">{winner === 'blue' ? '🏆 Gewonnen!' : '😅 Verloren!'}</div>
        <div className="v3-win-score">
          <span className="v3-blue">{scoreBlue}</span>
          <span className="v3-dash"> — </span>
          <span className="v3-red">{scoreRed}</span>
        </div>
        <div className="v3-win-sub">{winner === 'blue' ? 'Wat een geweldige overwinning! 🎉' : 'Probeer het nog eens!'}</div>
        <div className="v3-win-btns">
          <button className="v3-start-btn" onClick={() => { setLoading(true); setScoreBlue(0); setScoreRed(0); setGoalTeam(null); setWinner(null); setPhase('playing') }}>
            🔄 Opnieuw
          </button>
          <button className="v3-back-btn" onClick={onBack}>← Menu</button>
        </div>
      </div>
    </div>
  )

  // ── Playing / goal flash ──────────────────────────────────────────────────
  return (
    <div className="v3-outer">
      <canvas ref={canvasRef} className="v3-canvas" />

      {/* Scoreboard */}
      <div className="v3-score">
        <span className="v3-blue v3-score-num">{scoreBlue}</span>
        <span className="v3-score-sep"> — </span>
        <span className="v3-red v3-score-num">{scoreRed}</span>
      </div>
      <div className="v3-score-labels">
        <span className="v3-blue">Jouw team</span>
        <span className="v3-score-goal">Eerste naar {GOAL_SCORE}</span>
        <span className="v3-red">Tegenstanders</span>
      </div>

      {/* Boost bar */}
      <div className="v3-boost-bar-wrap">
        <div className="v3-boost-label">⚡ Boost</div>
        <div className="v3-boost-track">
          <div
            className={`v3-boost-fill ${energyPct < 20 ? 'v3-boost-low' : ''}`}
            style={{ width: energyPct + '%' }}
          />
        </div>
      </div>

      {/* Goal flash */}
      {phase === 'goal' && (
        <div className={`v3-goal-flash ${goalTeam === 'blue' ? 'v3-goal-blue' : 'v3-goal-red'}`}>
          GOAL! {goalTeam === 'blue' ? '🔵🎉' : '🔴😅'}
        </div>
      )}

      <button className="v3-back" onClick={onBack}>← Menu</button>

      {loading && (
        <div className="v3-loading">
          <div className="v3-spinner" />
          <span>Laden…</span>
        </div>
      )}

      <div className="v3-hint">
        <span><kbd>WASD</kbd>/<kbd>↑↓←→</kbd> bewegen</span>
        <span><kbd>SPATIE</kbd> boost</span>
      </div>
    </div>
  )
}
