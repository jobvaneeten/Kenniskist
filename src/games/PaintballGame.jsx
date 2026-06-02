import { useState, useEffect, useRef, useCallback } from 'react'
import * as Colyseus from '@colyseus/sdk'
import {
  Engine, Scene, FreeCamera,
  Color3, Color4, Vector3, Quaternion,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  MeshBuilder, StandardMaterial, DynamicTexture,
  DefaultRenderingPipeline,
} from '@babylonjs/core'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'
import { findItem } from '../itemsCatalog'
import { applyItemToMesh, loadClothingDonor, usesDonor } from '../applyClothing'
import './rocket-game.css'
import './paintball.css'

const SERVER_URL = 'wss://kenniskist-server.onrender.com'

// ── Arena constants (mirror the server exactly) ────────────────────────
const ARENA_HALF    = 24
const PLAYER_RADIUS  = 0.6
const PLAYER_SPEED   = 5.2
const SPRINT_SPEED   = 8.2
const PROJ_RADIUS    = 0.18
const MATCH_TIME     = 120
const OBSTACLES = [
  { x:   0, z:   0, hw: 2.0, hd: 2.0 },
  { x:  11, z:   8, hw: 1.5, hd: 1.5 },
  { x: -11, z:   8, hw: 1.5, hd: 1.5 },
  { x:  11, z:  -8, hw: 1.5, hd: 1.5 },
  { x: -11, z:  -8, hw: 1.5, hd: 1.5 },
  { x:   0, z:  15, hw: 3.0, hd: 1.0 },
  { x:   0, z: -15, hw: 3.0, hd: 1.0 },
  { x:  17, z:   0, hw: 1.0, hd: 3.0 },
  { x: -17, z:   0, hw: 1.0, hd: 3.0 },
]
const TEAM_HEX = ['#e63946', '#1d6fd0']   // 0 rood, 1 blauw

function resolvePos(cx, cz, rad) {
  const lim = ARENA_HALF - rad
  let x = Math.max(-lim, Math.min(lim, cx))
  let z = Math.max(-lim, Math.min(lim, cz))
  for (const o of OBSTACLES) {
    const minx = o.x - o.hw - rad, maxx = o.x + o.hw + rad
    const minz = o.z - o.hd - rad, maxz = o.z + o.hd + rad
    if (x > minx && x < maxx && z > minz && z < maxz) {
      const dl = x - minx, dr = maxx - x, dt = z - minz, db = maxz - z
      const m = Math.min(dl, dr, dt, db)
      if (m === dl) x = minx; else if (m === dr) x = maxx
      else if (m === dt) z = minz; else z = maxz
    }
  }
  return { x, z }
}

const RETARGET_BONES = new Set([
  'Root','Hips','Spine','Spine1','Neck','Head',
  'LeftShoulder','LeftArm','LeftForeArm','LeftHand',
  'RightShoulder','RightArm','RightForeArm','RightHand',
  'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase',
  'RightUpLeg','RightLeg','RightFoot','RightToeBase',
])
const CLOTHING_NAMES = new Set(['Shirt','Broek','Sokken','Schoenen'])
const FACE_NAMES     = new Set(['Gezicht','Face','Ogen','Eyes','Wenkbrauwen','Eyebrows','Mond','Mouth','Neus','Nose'])

// ── Paintball-marker mesh (barrel along +Z) ────────────────────────────
function makeGun(scene, hex) {
  const mat = new StandardMaterial('gunMat' + Math.random(), scene)
  mat.diffuseColor = new Color3(0.12, 0.12, 0.14)
  mat.specularColor = new Color3(0.3, 0.3, 0.3)
  const tint = new StandardMaterial('gunTint' + Math.random(), scene)
  const c = Color3.FromHexString(hex)
  tint.diffuseColor = c; tint.emissiveColor = c.scale(0.25)

  const root = MeshBuilder.CreateBox('gunBody', { width: 0.12, height: 0.16, depth: 0.5 }, scene)
  root.material = mat; root.isPickable = false
  const barrel = MeshBuilder.CreateCylinder('gunBarrel', { height: 0.6, diameter: 0.08, tessellation: 10 }, scene)
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.04, 0.5); barrel.material = mat
  barrel.parent = root; barrel.isPickable = false
  const hopper = MeshBuilder.CreateSphere('gunHopper', { diameter: 0.18, segments: 8 }, scene)
  hopper.position.set(0, 0.16, 0.05); hopper.material = tint; hopper.parent = root; hopper.isPickable = false
  const grip = MeshBuilder.CreateBox('gunGrip', { width: 0.08, height: 0.2, depth: 0.1 }, scene)
  grip.position.set(0, -0.16, -0.1); grip.material = mat; grip.parent = root; grip.isPickable = false
  return root
}

// ── PlayerInstance ─────────────────────────────────────────────────────
class PlayerInstance {
  constructor(scene, sg, opts) {
    this.scene = scene; this.sg = sg; this.opts = opts
    this.root = null; this.gun = null
    this._skeleton = null
    this._nodeMap = {}; this._dstRests = {}; this._restPose = {}
    this._anims = {}; this._state = 'idle'; this._dead = false
    this._ready = false; this._onReady = null; this._donors = []
    this._load()
  }

  _load() {
    SceneLoader.ImportMesh('', '/', 'Poppetje.glb', this.scene, (meshes, _ps, skels) => {
      this.root = meshes[0]
      this._skeleton = skels[0] ?? null
      meshes.forEach(m => { this.sg?.addShadowCaster(m); m.receiveShadows = true })

      this.scene.transformNodes.forEach(n => { this._nodeMap[n.name] = n })
      this.scene.meshes.forEach(m => { if (!this._nodeMap[m.name]) this._nodeMap[m.name] = m })

      this.scene.transformNodes.forEach(n => {
        if (!RETARGET_BONES.has(n.name)) return
        this._dstRests[n.name] = n.rotationQuaternion ? n.rotationQuaternion.clone() : Quaternion.Identity()
        this._restPose[n.name] = {
          node: n,
          rot: n.rotationQuaternion ? n.rotationQuaternion.clone() : Quaternion.Identity(),
          pos: n.position.clone(),
        }
      })

      meshes.forEach(m => {
        if (!CLOTHING_NAMES.has(m.name)) return
        const key = m.name.toLowerCase()
        const colorKey = key === 'shirt' ? this.opts.shirt : this.opts.wearing?.[key]
        if (!colorKey) { m.setEnabled(false); return }
        const item = findItem(key, colorKey)
        if (!item) { m.setEnabled(false); return }
        if (usesDonor(key, item)) loadClothingDonor(this.scene, m, this._skeleton, key, item, g => this._donors.push(g))
        else { applyItemToMesh(this.scene, m, item); m.setEnabled(true) }
      })

      if (this.opts.teamColor) {
        const tc = Color3.FromHexString(this.opts.teamColor)
        meshes.forEach(m => {
          if (CLOTHING_NAMES.has(m.name) || FACE_NAMES.has(m.name) || !m.material) return
          const mat = m.material.clone(m.material.name + '_t'); m.material = mat
          if (mat.albedoColor !== undefined) { mat.albedoTexture = null; mat.albedoColor = tc }
          else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = null; mat.diffuseColor = tc }
        })
      }
      meshes.forEach(m => {
        if (!FACE_NAMES.has(m.name) || !m.material) return
        const mat = m.material.clone(m.material.name + '_f'); m.material = mat
        if (mat.albedoColor !== undefined) { mat.albedoTexture = null; mat.albedoColor = Color3.Black() }
        else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = null; mat.diffuseColor = Color3.Black() }
      })

      // Gun (positioned each frame in tick, not parented)
      this.gun = makeGun(this.scene, TEAM_HEX[this.opts.team ?? 0])
      this.sg?.addShadowCaster(this.gun)

      const ANIMS = [
        { key: 'mikken',   file: 'emotemikken.glb',   stripRoot: true },
        { key: 'rennen',   file: 'emoterennen.glb',   stripRoot: true },
        { key: 'schieten', file: 'emoteschieten.glb', stripRoot: true },
        { key: 'geraakt',  file: 'emotegeraakt.glb',  stripRoot: true },
      ]
      let pending = ANIMS.length
      const done = () => {
        if (--pending > 0) return
        this._playIdle(); this._ready = true; this._onReady?.()
      }
      ANIMS.forEach(({ key, file }) => {
        SceneLoader.ImportMesh('', '/', file, this.scene, (aM, _p, _s, aG) => {
          aM.forEach(m => m.setEnabled(false))
          if (!aG.length) { done(); return }
          const orig = aG[0]
          const srcRests = {}
          orig.targetedAnimations.forEach(ta => {
            srcRests[ta.target.name] = ta.target.rotationQuaternion ? ta.target.rotationQuaternion.clone() : Quaternion.Identity()
          })
          const rt = orig.clone(key, t => RETARGET_BONES.has(t.name) ? (this._nodeMap[t.name] ?? t) : t)
          const tas = rt.targetedAnimations
          for (let i = tas.length - 1; i >= 0; i--) {
            const { animation: anim, target } = tas[i]
            const prop = anim.targetProperty, name = target.name
            if (prop === 'scaling' || prop === 'scale') { tas.splice(i, 1); continue }
            if (prop === 'position') { tas.splice(i, 1); continue }
            if (!RETARGET_BONES.has(name)) { tas.splice(i, 1); continue }
            const src = srcRests[name] ?? Quaternion.Identity()
            const dst = this._dstRests[name] ?? Quaternion.Identity()
            const corr = Quaternion.Inverse(dst).multiply(src)
            anim.getKeys().forEach(kf => kf.value.copyFrom(corr.multiply(kf.value)))
          }
          rt.stop(); this._anims[key] = rt; orig.dispose(); done()
        }, null, () => done())
      })
    }, null, (_, msg, err) => console.error('Poppetje load error:', msg, err))
  }

  _stopAll() { Object.values(this._anims).forEach(g => g?.stop()) }
  _playIdle()  { if (this._dead || this._state === 'idle') return; this._stopAll(); this._anims.mikken?.play(true); this._state = 'idle' }
  _playMove()  { if (this._dead || this._state === 'move') return; this._stopAll(); this._anims.rennen?.play(true); this._state = 'move' }
  _locomotion(moving) {
    if (this._dead || this._state === 'shoot') return
    if (moving) this._playMove(); else this._playIdle()
  }
  playShoot() {
    if (this._dead || !this._anims.schieten || this._state === 'move') return
    this._stopAll(); this._state = 'shoot'; this._anims.schieten.play(false)
    this._anims.schieten.onAnimationGroupEndObservable.addOnce(() => { this._state = 'idle'; this._playIdle() })
  }
  setDead(dead) {
    if (dead === this._dead) return
    this._dead = dead
    if (dead) { this._stopAll(); this._state = 'dead'; this._anims.geraakt?.play(false) }
    else { this._state = 'idle'; this._playIdle() }
  }

  setTarget(x, z, rotY, moving) {
    this._tx = x; this._tz = z; this._trotY = rotY; this._tmoving = !!moving
    if (this._dx === undefined) { this._dx = x; this._dz = z; this._drotY = rotY }
  }
  setPose(x, z, rotY, moving) {
    if (!this.root) return
    this._dx = x; this._dz = z; this._drotY = rotY
    this._apply(x, z, rotY); this._locomotion(moving)
  }
  _apply(x, z, rotY) {
    this.root.position.set(x, 0, z)
    this.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(rotY + Math.PI, 0, 0)
    if (this.gun) {
      const fx = Math.sin(rotY), fz = Math.cos(rotY)
      const rx = Math.cos(rotY), rz = -Math.sin(rotY)
      this.gun.position.set(x + fx * 0.35 + rx * 0.22, 1.25, z + fz * 0.35 + rz * 0.22)
      this.gun.rotationQuaternion = Quaternion.RotationYawPitchRoll(rotY, 0, 0)
      this.gun.setEnabled(!this._dead)
    }
  }
  tick(dt, rate = 13) {
    if (!this.root || this._dx === undefined) return
    const L = 1 - Math.exp(-dt * rate)
    this._dx += (this._tx - this._dx) * L
    this._dz += (this._tz - this._dz) * L
    let diff = this._trotY - this._drotY
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    this._drotY += diff * L
    this._apply(this._dx, this._dz, this._drotY)
    this._locomotion(this._tmoving)
  }
  onReady(cb) { if (this._ready) cb(); else this._onReady = cb }
  dispose() {
    this._stopAll()
    Object.values(this._anims).forEach(g => { try { g.dispose() } catch {} })
    this._donors.forEach(g => { try { g.dispose() } catch {} })
    this.gun?.dispose?.(); this.root?.dispose?.()
  }
}

// ── Arena world ────────────────────────────────────────────────────────
function buildWorld(scene) {
  scene.clearColor = new Color4(0.46, 0.67, 0.93, 1)
  scene.fogMode = Scene.FOGMODE_EXP2
  scene.fogColor = new Color3(0.46, 0.67, 0.93)
  scene.fogDensity = 0.006

  const ambient = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene)
  ambient.intensity = 0.7; ambient.groundColor = new Color3(0.18, 0.18, 0.2)

  const sun = new DirectionalLight('sun', new Vector3(-0.5, -1, -0.3), scene)
  sun.position = new Vector3(20, 40, 20); sun.intensity = 1.7
  const sg = new ShadowGenerator(1024, sun)
  sg.usePoissonSampling = true; sg.bias = 0.0004

  // Ground
  const ground = MeshBuilder.CreateGround('ground', { width: ARENA_HALF * 2, height: ARENA_HALF * 2 }, scene)
  ground.receiveShadows = true; ground.isPickable = false
  const gtex = new DynamicTexture('gt', { width: 512, height: 512 }, scene)
  const gc = gtex.getContext()
  gc.fillStyle = '#3a4a3a'; gc.fillRect(0, 0, 512, 512)
  gc.strokeStyle = 'rgba(255,255,255,0.08)'; gc.lineWidth = 2
  for (let i = 0; i <= 512; i += 32) { gc.beginPath(); gc.moveTo(i, 0); gc.lineTo(i, 512); gc.stroke(); gc.beginPath(); gc.moveTo(0, i); gc.lineTo(512, i); gc.stroke() }
  gtex.update()
  const gmat = new StandardMaterial('gmat', scene)
  gmat.diffuseTexture = gtex; gmat.specularColor = Color3.Black(); ground.material = gmat

  // Perimeter walls
  const wallMat = new StandardMaterial('wallMat', scene)
  wallMat.diffuseColor = new Color3(0.35, 0.37, 0.42); wallMat.specularColor = Color3.Black()
  const WALL_H = 2.4
  const mkWall = (w, d, x, z) => {
    const wall = MeshBuilder.CreateBox('wall', { width: w, height: WALL_H, depth: d }, scene)
    wall.position.set(x, WALL_H / 2, z); wall.material = wallMat; wall.receiveShadows = true
  }
  const S = ARENA_HALF
  mkWall(S * 2 + 1, 0.5, 0,  S); mkWall(S * 2 + 1, 0.5, 0, -S)
  mkWall(0.5, S * 2 + 1,  S, 0); mkWall(0.5, S * 2 + 1, -S, 0)

  // Cover crates
  const crateMat = new StandardMaterial('crate', scene)
  const ctex = new DynamicTexture('ct', { width: 128, height: 128 }, scene)
  const cc = ctex.getContext()
  cc.fillStyle = '#8a5a2b'; cc.fillRect(0, 0, 128, 128)
  cc.strokeStyle = '#5e3c1c'; cc.lineWidth = 6; cc.strokeRect(4, 4, 120, 120)
  cc.beginPath(); cc.moveTo(0, 0); cc.lineTo(128, 128); cc.moveTo(128, 0); cc.lineTo(0, 128); cc.stroke()
  ctex.update(); crateMat.diffuseTexture = ctex; crateMat.specularColor = Color3.Black()
  OBSTACLES.forEach(o => {
    const c = MeshBuilder.CreateBox('crate', { width: o.hw * 2, height: 1.4, depth: o.hd * 2 }, scene)
    c.position.set(o.x, 0.7, o.z); c.material = crateMat; c.receiveShadows = true; sg.addShadowCaster(c)
  })

  return sg
}

function VirtualJoystick({ joyRef }) {
  const baseRef = useRef(null), knobRef = useRef(null), active = useRef(false)
  const RADIUS = 52
  const apply = (dx, dy) => {
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) { dx = dx / len * RADIUS; dy = dy / len * RADIUS }
    joyRef.current.x = dx / RADIUS; joyRef.current.z = dy / RADIUS
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px,${dy}px)`
  }
  const release = () => { active.current = false; joyRef.current.x = 0; joyRef.current.z = 0; if (knobRef.current) knobRef.current.style.transform = 'translate(0,0)' }
  const center = () => { const r = baseRef.current.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 } }
  useEffect(() => {
    const onMove = e => { if (!active.current) return; const { cx, cy } = center(); apply(e.clientX - cx, e.clientY - cy) }
    const onUp = () => { if (active.current) release() }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])
  return (
    <div ref={baseRef} className="rg-joy-base"
      onTouchStart={e => { e.preventDefault(); active.current = true; const t = e.targetTouches[0]; const { cx, cy } = center(); apply(t.clientX - cx, t.clientY - cy) }}
      onTouchMove={e => { e.preventDefault(); if (!active.current) return; const t = e.targetTouches[0]; const { cx, cy } = center(); apply(t.clientX - cx, t.clientY - cy) }}
      onTouchEnd={release} onTouchCancel={release}
      onMouseDown={e => { active.current = true; const { cx, cy } = center(); apply(e.clientX - cx, e.clientY - cy) }}
    ><div ref={knobRef} className="rg-joy-knob" /></div>
  )
}

function fmtTime(s) { const m = Math.floor(s / 60); const sec = Math.floor(s) % 60; return `${m}:${String(sec).padStart(2, '0')}` }

// ── Scene init ─────────────────────────────────────────────────────────
function initScene(canvas, { localSessionId, getRoomState, sendInput, sendShoot, hpDomRef, timerDomRef }) {
  const engine = new Engine(canvas, true, { adaptToDeviceRatio: true, stencil: true, powerPreference: 'high-performance' })
  if (window.devicePixelRatio > 1.5) engine.setHardwareScalingLevel(window.devicePixelRatio / 1.5)
  const scene = new Scene(engine)
  const camera = new FreeCamera('cam', new Vector3(0, 5, -12), scene)
  camera.inputs.clear(); camera.minZ = 0.1; camera.maxZ = 300

  const sg = buildWorld(scene)
  try {
    const pipe = new DefaultRenderingPipeline('pipe', false, scene, [camera])
    pipe.imageProcessingEnabled = true; pipe.imageProcessing.contrast = 1.1; pipe.imageProcessing.exposure = 1.1
  } catch {}

  const players = new Map()
  const shotMeshes = new Map()
  const splats = []
  const joyRef = { current: { x: 0, z: 0 } }
  const fireRef = { current: false }
  const sprintRef = { current: false }
  const camModeRef = { current: 'third' }   // 'third' | 'first'
  const look = { yaw: 0, pitch: 0 }
  const keys = {}

  const onKD = e => { keys[e.code] = true; if (e.code === 'Space') fireRef.current = true }
  const onKU = e => { keys[e.code] = false; if (e.code === 'Space') fireRef.current = false }
  window.addEventListener('keydown', onKD); window.addEventListener('keyup', onKU)

  // Look-drag on the canvas (touch + mouse)
  let looking = false, lastX = 0, lastY = 0
  const onPD = e => { looking = true; lastX = e.clientX; lastY = e.clientY; if (e.pointerType === 'mouse' && e.button === 0) fireRef.current = true }
  const onPM = e => {
    if (!looking) return
    look.yaw   += (e.clientX - lastX) * 0.005
    look.pitch -= (e.clientY - lastY) * 0.005
    look.pitch = Math.max(-1.1, Math.min(1.1, look.pitch))
    lastX = e.clientX; lastY = e.clientY
  }
  const onPU = () => { looking = false; fireRef.current = false }
  canvas.addEventListener('pointerdown', onPD)
  canvas.addEventListener('pointermove', onPM)
  window.addEventListener('pointerup', onPU)

  const camPos = new Vector3(0, 5, -12)
  const camTgt = new Vector3(0, 1.5, 0)
  let lastFire = 0
  const pred = { x: 0, z: 0, init: false }
  let prevShootSeq = {}

  // Paint splat
  const splatMat0 = new StandardMaterial('sp0', scene); splatMat0.disableLighting = true; splatMat0.diffuseColor = Color3.FromHexString(TEAM_HEX[0]); splatMat0.emissiveColor = Color3.FromHexString(TEAM_HEX[0])
  const splatMat1 = new StandardMaterial('sp1', scene); splatMat1.disableLighting = true; splatMat1.diffuseColor = Color3.FromHexString(TEAM_HEX[1]); splatMat1.emissiveColor = Color3.FromHexString(TEAM_HEX[1])
  const addSplat = (x, y, z, team) => {
    const b = MeshBuilder.CreateSphere('splat', { diameter: 0.6, segments: 6 }, scene)
    b.scaling.y = 0.35; b.position.set(x, Math.max(0.05, y), z); b.isPickable = false
    b.material = (team === 0 ? splatMat0 : splatMat1).clone('spm')
    splats.push({ mesh: b, life: 3 })
    if (splats.length > 60) { const s = splats.shift(); s.mesh.dispose() }
  }

  scene.registerBeforeRender(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05)
    const rs = getRoomState()
    if (!rs) return

    if (timerDomRef?.current) timerDomRef.current.textContent = fmtTime(Math.max(0, rs.timeLeft ?? 0))

    // ── Input (camera-relative) ──
    const lp = rs.players.get(localSessionId)
    const f = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0) - joyRef.current.z
    const r = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0) + joyRef.current.x
    const fwdX = Math.sin(look.yaw), fwdZ = Math.cos(look.yaw)
    const rgtX = Math.cos(look.yaw), rgtZ = -Math.sin(look.yaw)
    let wx = rgtX * r + fwdX * f, wz = rgtZ * r + fwdZ * f
    const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl }
    const sprint = sprintRef.current || !!keys['ShiftLeft']
    sendInput({ x: wx, z: wz, rotY: look.yaw, sprint })

    // ── Fire (auto while held, server enforces cooldown) ──
    const now = performance.now() / 1000
    if (fireRef.current && lp && lp.alive && now - lastFire > 0.13) {
      lastFire = now
      const dx = Math.sin(look.yaw) * Math.cos(look.pitch)
      const dy = Math.sin(look.pitch)
      const dz = Math.cos(look.yaw) * Math.cos(look.pitch)
      sendShoot({ dx, dy, dz })
    }

    // HP bar
    if (hpDomRef?.current) hpDomRef.current.style.width = Math.max(0, Math.min(100, lp?.hp ?? 0)) + '%'

    // ── Players ──
    rs.players.forEach((p, sid) => {
      if (!players.has(sid)) {
        const wearing = (() => { try { return JSON.parse(p.wearing || '{}') } catch { return {} } })()
        players.set(sid, new PlayerInstance(scene, sg, { shirt: p.shirt, wearing, team: p.team, teamColor: TEAM_HEX[p.team], name: p.name }))
        prevShootSeq[sid] = p.shootSeq
      }
      const inst = players.get(sid)
      inst.setDead(!p.alive)
      // shoot feedback
      if (p.shootSeq !== prevShootSeq[sid]) { prevShootSeq[sid] = p.shootSeq; inst.playShoot() }

      if (sid === localSessionId) {
        if (!pred.init) { pred.x = p.x; pred.z = p.z; pred.init = true }
        if (p.alive) {
          const spd = sprint ? SPRINT_SPEED : PLAYER_SPEED
          const pr = resolvePos(pred.x + wx * spd * dt, pred.z + wz * spd * dt, PLAYER_RADIUS)
          pred.x = pr.x; pred.z = pr.z
          // soft reconcile toward server
          pred.x += (p.x - pred.x) * 0.08; pred.z += (p.z - pred.z) * 0.08
        } else { pred.x = p.x; pred.z = p.z }
        inst.setPose(pred.x, pred.z, look.yaw, p.alive && (Math.abs(wx) + Math.abs(wz)) > 0.05)
      } else {
        inst.setTarget(p.x, p.z, p.rotY, p.moving)
        inst.tick(dt)
      }
    })
    // remove gone players
    for (const sid of [...players.keys()]) {
      if (!rs.players.get(sid)) { players.get(sid).dispose(); players.delete(sid) }
    }

    // ── Projectiles ──
    const live = new Set()
    rs.shots.forEach((s, id) => {
      live.add(id)
      let m = shotMeshes.get(id)
      if (!m) {
        m = MeshBuilder.CreateSphere('shot', { diameter: PROJ_RADIUS * 2, segments: 6 }, scene)
        const mat = new StandardMaterial('shotm', scene); mat.disableLighting = true
        const c = Color3.FromHexString(TEAM_HEX[s.team]); mat.emissiveColor = c; mat.diffuseColor = c
        m.material = mat; m.isPickable = false
        shotMeshes.set(id, { mesh: m, x: s.x, y: s.y, z: s.z, team: s.team })
        m = shotMeshes.get(id)
      }
      m.x = s.x; m.y = s.y; m.z = s.z
      m.mesh.position.set(s.x, s.y, s.z)
    })
    for (const id of [...shotMeshes.keys()]) {
      if (!live.has(id)) {
        const m = shotMeshes.get(id)
        addSplat(m.x, m.y, m.z, m.team)
        m.mesh.dispose(); shotMeshes.delete(id)
      }
    }

    // ── Splats fade ──
    for (let i = splats.length - 1; i >= 0; i--) {
      const s = splats[i]; s.life -= dt
      if (s.life <= 0) { s.mesh.dispose(); splats.splice(i, 1); continue }
      s.mesh.material.alpha = Math.min(1, s.life)
    }

    // ── Camera ──
    const me = players.get(localSessionId)
    const px = (me && me._dx !== undefined) ? me._dx : (lp?.x ?? 0)
    const pz = (me && me._dz !== undefined) ? me._dz : (lp?.z ?? 0)
    const fX = Math.sin(look.yaw) * Math.cos(look.pitch)
    const fY = Math.sin(look.pitch)
    const fZ = Math.cos(look.yaw) * Math.cos(look.pitch)
    let wantPos, wantTgt
    if (camModeRef.current === 'first') {
      wantPos = new Vector3(px + Math.sin(look.yaw) * 0.1, 1.55, pz + Math.cos(look.yaw) * 0.1)
      wantTgt = new Vector3(px + fX * 6, 1.55 + fY * 6, pz + fZ * 6)
    } else {
      wantPos = new Vector3(px - Math.sin(look.yaw) * 5 - fX * 1.5, 3.2 - fY * 2.5, pz - Math.cos(look.yaw) * 5 - fZ * 1.5)
      wantTgt = new Vector3(px + fX * 5, 1.4 + fY * 5, pz + fZ * 5)
    }
    const cl = 1 - Math.exp(-dt * 18)
    camPos.addInPlace(wantPos.subtract(camPos).scale(cl))
    camTgt.addInPlace(wantTgt.subtract(camTgt).scale(cl))
    camera.position.copyFrom(camPos); camera.setTarget(camTgt)
  })

  engine.runRenderLoop(() => scene.render())
  const onResize = () => engine.resize()
  window.addEventListener('resize', onResize)

  return {
    joyRef, fireRef, sprintRef, camModeRef,
    dispose: () => {
      window.removeEventListener('keydown', onKD); window.removeEventListener('keyup', onKU)
      window.removeEventListener('pointerup', onPU); window.removeEventListener('resize', onResize)
      canvas.removeEventListener('pointerdown', onPD); canvas.removeEventListener('pointermove', onPM)
      players.forEach(p => p.dispose()); shotMeshes.forEach(m => m.mesh.dispose()); splats.forEach(s => s.mesh.dispose())
      engine.stopRenderLoop(); scene.dispose(); engine.dispose()
    },
  }
}

// ── Lobby ──────────────────────────────────────────────────────────────
function Lobby({ onBack, onJoined }) {
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
      const joinCode = create ? String(Math.floor(10000 + Math.random() * 90000)) : code.trim()
      const opts = { joinCode, shirt, wearing, name: name || 'Speler' }
      const room = create ? await client.create('paintball', opts) : await client.join('paintball', opts)
      if (name) localStorage.setItem('kk_playername', name)
      onJoined(room, joinCode)
    } catch { setError(create ? 'Kan geen lobby aanmaken.' : 'Lobby niet gevonden.'); setLoading(false) }
  }
  return (
    <div className="rg-lobby">
      <button className="rg-back" onClick={onBack}>← Menu</button>
      <div className="rg-lobby-box">
        <div className="rg-lobby-icon">🎯</div>
        <h1 className="rg-lobby-title">Paint<span>ball</span></h1>
        <p className="rg-lobby-sub">Speel met vrienden</p>
        <div className="rg-lobby-field"><label>Jouw naam</label>
          <input className="rg-input" placeholder="Speler" value={name} maxLength={12} onChange={e => setName(e.target.value)} /></div>
        <button className="rg-lobby-btn rg-lobby-create" disabled={loading} onClick={() => connect(true)}>{loading ? '…' : '＋ Lobby aanmaken'}</button>
        <div className="rg-lobby-divider">of</div>
        <div className="rg-lobby-field"><label>Lobby-code</label>
          <input className="rg-input rg-input-code" placeholder="12345" value={code} maxLength={5} inputMode="numeric"
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && connect(false)} /></div>
        <button className="rg-lobby-btn rg-lobby-join" disabled={loading || !code.trim()} onClick={() => connect(false)}>{loading ? '…' : '→ Joinen'}</button>
        {error && <p className="rg-lobby-error">{error}</p>}
      </div>
    </div>
  )
}

function WaitingRoom({ code, players, room, onBack }) {
  return (
    <div className="rg-waiting">
      <button className="rg-back" onClick={onBack}>← Menu</button>
      <div className="rg-waiting-box">
        <p className="rg-waiting-label">Lobby-code</p>
        <div className="rg-waiting-code">{code ?? '?????'}</div>
        <p className="rg-waiting-hint">Deel deze code met vrienden</p>
        <div className="rg-waiting-players">
          {players.map((p, i) => (
            <div key={i} className="rg-waiting-player"><span className={`rg-team-dot rg-team-${p.team}`} /><span>{p.name || 'Speler'}</span></div>
          ))}
        </div>
        <button className="rg-lobby-btn rg-lobby-create" onClick={() => room?.send('start')}>▶ Start spel</button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────
export default function PaintballGame({ onBack }) {
  const [screen, setScreen] = useState('lobby')
  const [room, setRoom] = useState(null)
  const [roomState, setRoomState] = useState(null)
  const [players, setPlayers] = useState([])
  const [lobbyCode, setLobbyCode] = useState('')
  const [camMode, setCamMode] = useState('third')

  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const roomStateRef = useRef(null)
  const roomRef = useRef(null)
  const timerDomRef = useRef(null)
  const hpDomRef = useRef(null)

  useEffect(() => { roomStateRef.current = roomState }, [roomState])
  useEffect(() => { roomRef.current = room }, [room])

  const handleJoined = useCallback((r, code) => {
    setRoom(r); roomRef.current = r; setLobbyCode(code || '')
    r.onStateChange(state => {
      setRoomState(state); roomStateRef.current = state
      const arr = []; state.players.forEach((p, sid) => arr.push({ sid, name: p.name, team: p.team }))
      setPlayers(arr)
      if (state.phase === 'playing' || state.phase === 'countdown') setScreen('playing')
      if (state.phase === 'gameover') setScreen('gameover')
    })
    r.onLeave(() => { setScreen('lobby'); setRoom(null) })
    setScreen('waiting')
  }, [])

  useEffect(() => {
    if (screen !== 'playing' || !canvasRef.current || !room) return
    const sc = initScene(canvasRef.current, {
      localSessionId: room.sessionId,
      getRoomState: () => roomStateRef.current,
      sendInput: inp => roomRef.current?.send('input', inp),
      sendShoot: dir => roomRef.current?.send('shoot', dir),
      timerDomRef, hpDomRef,
    })
    sceneRef.current = sc
    sc.camModeRef.current = camMode
    return () => { sc.dispose(); sceneRef.current = null }
  }, [screen, room])

  useEffect(() => { return () => { roomRef.current?.leave() } }, [])

  const toggleCamera = () => {
    const next = camMode === 'third' ? 'first' : 'third'
    setCamMode(next)
    if (sceneRef.current) sceneRef.current.camModeRef.current = next
  }
  const toggleFullscreen = () => {
    const el = document.documentElement
    if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)
    else (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)
  }

  if (screen === 'lobby') return <Lobby onBack={onBack} onJoined={handleJoined} />
  if (screen === 'waiting') return <WaitingRoom code={lobbyCode} room={room} players={players} onBack={() => { room?.leave(); setScreen('lobby') }} />
  if (screen === 'gameover') {
    const rs = roomState
    return (
      <div className="rg-gameover">
        <div className="rg-gameover-box">
          <div className="rg-go-title">Tijd is om! 🎯</div>
          <div className="rg-go-score">🔴 {rs?.scoreA ?? 0} — {rs?.scoreB ?? 0} 🔵</div>
          <div className="rg-go-winner">
            {(rs?.scoreA ?? 0) > (rs?.scoreB ?? 0) ? '🔴 Rood wint!' : (rs?.scoreB ?? 0) > (rs?.scoreA ?? 0) ? '🔵 Blauw wint!' : '🤝 Gelijkspel!'}
          </div>
          <button className="rg-lobby-btn rg-lobby-create" onClick={() => { room?.leave(); onBack() }}>← Terug</button>
        </div>
      </div>
    )
  }

  const rs = roomState
  const me = rs?.players?.get(room?.sessionId)
  return (
    <div className="rg-outer">
      <canvas ref={canvasRef} className="rg-canvas" />
      <button className="rg-back" onClick={() => { room?.leave(); onBack() }}>← Menu</button>

      <div className="rg-score">
        <span className="rg-score-a">🔴 {rs?.scoreA ?? 0}</span>
        <span ref={timerDomRef} className="rg-score-timer">2:00</span>
        <span className="rg-score-b">{rs?.scoreB ?? 0} 🔵</span>
      </div>

      <button className="rg-cam-btn" onClick={toggleCamera}>{camMode === 'third' ? '📷 3e p.' : '📷 1e p.'}</button>
      <button className="rg-fs-btn" onClick={toggleFullscreen} title="Volledig scherm">⛶</button>

      {rs?.phase === 'countdown' && <div className="rg-countdown">{rs.countdown}</div>}

      <div className="pb-crosshair">+</div>

      {/* HP bar */}
      <div className="pb-hp"><span className="pb-hp-icon">❤️</span><div className="pb-hp-track"><div ref={hpDomRef} className="pb-hp-fill" /></div></div>

      {me && !me.alive && (
        <div className="pb-respawn">Uitgeschakeld!<br /><span>Respawn in {Math.ceil(me.respawnIn)}…</span></div>
      )}

      {sceneRef.current && <VirtualJoystick joyRef={sceneRef.current.joyRef} />}

      <div className="rg-actions">
        <button className="pb-fire-btn"
          onPointerDown={e => { e.preventDefault(); if (sceneRef.current) sceneRef.current.fireRef.current = true }}
          onPointerUp={() => { if (sceneRef.current) sceneRef.current.fireRef.current = false }}
          onPointerLeave={() => { if (sceneRef.current) sceneRef.current.fireRef.current = false }}
        >🎯<span>Schiet</span></button>
        <button className="rg-boost-btn"
          onPointerDown={e => { e.preventDefault(); if (sceneRef.current) sceneRef.current.sprintRef.current = true }}
          onPointerUp={() => { if (sceneRef.current) sceneRef.current.sprintRef.current = false }}
          onPointerLeave={() => { if (sceneRef.current) sceneRef.current.sprintRef.current = false }}
        >⚡<span>Ren</span></button>
      </div>
    </div>
  )
}
