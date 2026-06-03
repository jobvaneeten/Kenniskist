import { useState, useEffect, useRef, useCallback } from 'react'
import * as Colyseus from '@colyseus/sdk'
import {
  Engine, Scene, FreeCamera,
  Color3, Color4, Vector3, Quaternion, Ray,
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
const ARENA_X        = 24
const ARENA_Z        = 24
const PLAYER_RADIUS  = 0.6
const PLAYER_SPEED   = 5.2
const PROJ_RADIUS    = 0.18
const MATCH_TIME     = 120
const STEP_UP = 0.3
// Collision boxes from public/map.glb — MUST match the server OBSTACLES list.
const OBSTACLES = [
  { x: 0, z: -42.6, hw: 4.1, hd: 2.7, top: 3 },
  { x: -9.1, z: 37.7, hw: 1.3, hd: 1.3, top: 2.8 },
  { x: 13.6, z: -33.3, hw: 7.9, hd: 5.2, top: 6.4 },
  { x: 0, z: 24.4, hw: 1.7, hd: 1.7, top: 3.5 },
  { x: -18.6, z: 24.4, hw: 1.7, hd: 2.7, top: 3.6 },
  { x: 18.6, z: -24.4, hw: 1.7, hd: 2.7, top: 3.6 },
  { x: 18.6, z: 0, hw: 0.8, hd: 18.9, top: 3.7 },
  { x: -5.8, z: -30, hw: 3.2, hd: 0.8, top: 2.8 },
  { x: -4.1, z: 30, hw: 2.4, hd: 0.8, top: 2.8 },
  { x: 7, z: 30, hw: 3.2, hd: 0.8, top: 2.8 },
  { x: 4.1, z: -30, hw: 2.4, hd: 0.8, top: 2.8 },
  { x: 20.6, z: -16.3, hw: 1.3, hd: 1.3, top: 2.8 },
  { x: -20.6, z: 16.3, hw: 1.3, hd: 1.3, top: 2.8 },
  { x: -23.6, z: -16.3, hw: 1.3, hd: 1.3, top: 2.8 },
  { x: 23.6, z: 16.3, hw: 1.3, hd: 1.3, top: 2.8 },
  { x: 0, z: 0, hw: 13.6, hd: 8.1, top: 5.2 },
  { x: -6.3, z: -4.3, hw: 1, hd: 1, top: 2.7 },
  { x: 0, z: 42.6, hw: 4.1, hd: 2.7, top: 3 },
  { x: 0, z: -24.4, hw: 1.7, hd: 1.7, top: 3.5 },
  { x: 6.3, z: 4.3, hw: 1, hd: 1, top: 2.7 },
  { x: 9.1, z: -37.7, hw: 1.3, hd: 1.3, top: 2.8 },
  { x: -13.6, z: 33.3, hw: 7.9, hd: 5.2, top: 6.4 },
  { x: -14, z: -30, hw: 5, hd: 2, top: 4.5 },
  { x: 14.5, z: 30, hw: 5, hd: 2, top: 4.5 },
  { x: -18.6, z: 0, hw: 0.8, hd: 18.9, top: 3.7 },
]
const TEAM_HEX = ['#e63946', '#1d6fd0']   // 0 rood, 1 blauw

function resolvePos(cx, cz, rad, feetY = 0) {
  const lx = ARENA_X - rad, lz = ARENA_Z - rad
  let x = Math.max(-lx, Math.min(lx, cx))
  let z = Math.max(-lz, Math.min(lz, cz))
  for (const o of OBSTACLES) {
    if (o.top <= feetY + 0.15) continue   // standing on/above it → no wall
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
    this._anims = {}; this._state = ''; this._dead = false   // '' zodat de eerste _playIdle de mik-animatie echt start (geen T-pose)
    this._ready = false; this._onReady = null; this._donors = []
    this._load()
  }

  _load() {
    SceneLoader.ImportMesh('', '/', 'Poppetje.glb', this.scene, (meshes, _ps, skels) => {
      this.root = meshes[0]
      this._skeleton = skels[0] ?? null
      this._meshes = meshes
      meshes.forEach(m => { this.sg?.addShadowCaster(m); m.receiveShadows = true })
      this.setBodyVisible(false)   // stay hidden until the idle pose is ready (no T-pose flash)

      this.scene.transformNodes.forEach(n => { this._nodeMap[n.name] = n })
      this.scene.meshes.forEach(m => { if (!this._nodeMap[m.name]) this._nodeMap[m.name] = m })
      this._handNode = this._nodeMap['RightHand'] || null

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
        if (usesDonor(key, item)) loadClothingDonor(this.scene, m, this._skeleton, key, item, g => {
          this._donors.push(g)
          if (!this._bodyVisible) { g.isVisible = false; g.getChildMeshes?.(false).forEach(c => c.isVisible = false) }
        })
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
      this.gun.setEnabled(false)
      this.sg?.addShadowCaster(this.gun)

      const ANIMS = [
        { key: 'mikken',   file: 'emotemikken.glb',   stripRoot: true },
        { key: 'rennen',   file: 'emoterennen.glb',   stripRoot: true },
        { key: 'schieten', file: 'emoteschieten.glb', stripRoot: true },
        { key: 'geraakt',  file: 'emotegeraakt.glb',  stripRoot: true },
        { key: 'herladen', file: 'emoteherladen.glb', stripRoot: true },
        { key: 'springen', file: 'emotespringen.glb', stripRoot: true },
        { key: 'hurken',       file: 'emotehurken.glb',       stripRoot: true },
        { key: 'hurkenlopen',  file: 'emotehurkenlopen.glb',  stripRoot: true },
        { key: 'hurkenreload', file: 'emotehurkenreload.glb', stripRoot: true },
      ]
      let pending = ANIMS.length
      const done = () => {
        if (--pending > 0) return
        this._ready = true; this._playIdle(); this.setBodyVisible(true); this._onReady?.()
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
  _setLoop(key, state) {
    if (this._dead || this._state === state) return
    this._stopAll(); this._anims[key]?.play(true); this._state = state
  }
  _playIdle()       { this._setLoop('mikken', 'idle') }
  _playMove()       { this._setLoop('rennen', 'move') }
  _playCrouchIdle() { this._setLoop('hurken', 'crouchidle') }
  _playCrouchMove() { this._setLoop('hurkenlopen', 'crouchmove') }
  _locomotion(moving, crouch) {
    this._lastMoving = !!moving; this._lastCrouch = !!crouch
    if (this._dead || this._state === 'shoot' || this._state === 'reload' || this._state === 'jump') return
    if (crouch) { if (moving) this._playCrouchMove(); else this._playCrouchIdle() }
    else        { if (moving) this._playMove(); else this._playIdle() }
  }
  _resumeLoco() { this._state = ''; this._locomotion(this._lastMoving, this._lastCrouch) }
  playJump() { if (!this._dead) this._playOnce('springen', 'jump', 0.85) }
  // Play a one-shot clip scaled to `durationSec` and reliably resume locomotion
  // after that time (the group end-observable is not dependable on clones).
  _playOnce(key, state, durationSec) {
    const g = this._anims[key]
    if (!g) { return }
    this._stopAll(); this._state = state
    const a0 = g.targetedAnimations[0]?.animation
    const fps = a0?.framePerSecond || 30
    const keys = a0?.getKeys?.()
    const lastFrame = (keys && keys.length) ? keys[keys.length - 1].frame : fps
    const len = Math.max(0.05, lastFrame / fps)
    g.speedRatio = len / durationSec
    g.play(false)
    clearTimeout(this._stateTimer)
    this._stateTimer = setTimeout(() => { if (this._state === state) this._resumeLoco() }, durationSec * 1000)
  }
  playShoot() {
    // Gehurkt: blijf in de hurk-houding (geen sta-schietclip → je komt niet omhoog).
    if (this._dead || this._lastCrouch || this._state === 'move' || this._state === 'crouchmove' || this._state === 'reload' || this._state === 'jump') return
    this._playOnce('schieten', 'shoot', 0.5)
  }
  playReload() {
    if (this._dead) return
    this._playOnce(this._lastCrouch ? 'hurkenreload' : 'herladen', 'reload', 1.0)
  }
  setDead(dead) {
    if (dead === this._dead) return
    this._dead = dead
    clearTimeout(this._stateTimer)
    if (dead) { this._stopAll(); this._state = 'dead'; this._anims.geraakt?.play(false) }
    else { this._resumeLoco() }
  }

  setTarget(x, z, rotY, moving, y = 0, crouch = false) {
    this._tx = x; this._tz = z; this._trotY = rotY; this._tmoving = !!moving; this._ty = y; this._tcrouch = !!crouch
    if (this._dx === undefined) { this._dx = x; this._dz = z; this._drotY = rotY; this._dy = y }
  }
  setPose(x, z, rotY, moving, pitch = 0, baseY = 0, crouch = false) {
    if (!this.root) return
    this._dx = x; this._dz = z; this._drotY = rotY; this._dy = baseY
    this._apply(x, z, rotY, pitch, baseY); this._locomotion(moving, crouch)
  }
  setBodyVisible(v) {
    if (this._bodyVisible === v) return
    this._bodyVisible = v
    this._meshes?.forEach(m => { if (m !== this.gun) m.isVisible = v })
    this._donors?.forEach(g => { g.isVisible = v; g.getChildMeshes?.(false).forEach(c => c.isVisible = v) })
  }
  _apply(x, z, rotY, pitch = 0, baseY = 0) {
    const off = this._yOff || 0
    this.root.position.set(x, baseY + off, z)
    this.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(rotY + Math.PI, 0, 0)
    // Dynamic foot-grounding: keep the lowest foot at baseY (ground/platform).
    if (this._ready) {
      const fA = this._nodeMap['LeftToeBase'] || this._nodeMap['LeftFoot']
      const fB = this._nodeMap['RightToeBase'] || this._nodeMap['RightFoot']
      let lowest = null
      if (fA) lowest = fA.getAbsolutePosition().y
      if (fB) { const yb = fB.getAbsolutePosition().y; lowest = (lowest === null) ? yb : Math.min(lowest, yb) }
      if (lowest !== null) {
        const err = lowest - baseY
        this._yOff = (this._yOff === undefined) ? off - err : off - err * 0.25
      }
    }
    if (this.gun) {
      // Follow the right-hand bone (so the gun bobs with the animation) but
      // smooth it so pose changes don't yank the gun around.
      let hx = x + Math.sin(rotY) * 0.3, hy = 1.2 + baseY + off, hz = z + Math.cos(rotY) * 0.3
      if (this._handNode) { const p = this._handNode.getAbsolutePosition(); hx = p.x; hy = p.y; hz = p.z }
      const tx = hx + Math.sin(rotY) * 0.12, ty = hy, tz = hz + Math.cos(rotY) * 0.12
      if (!this._gunPos) this._gunPos = new Vector3(tx, ty, tz)
      this._gunPos.x += (tx - this._gunPos.x) * 0.4
      this._gunPos.y += (ty - this._gunPos.y) * 0.4
      this._gunPos.z += (tz - this._gunPos.z) * 0.4
      this.gun.position.copyFrom(this._gunPos)
      this.gun.rotationQuaternion = Quaternion.RotationYawPitchRoll(rotY, pitch, 0)
      this.gun.setEnabled(this._ready && !this._dead)
    }
  }
  tick(dt, rate = 13) {
    if (!this.root || this._dx === undefined) return
    const L = 1 - Math.exp(-dt * rate)
    this._dx += (this._tx - this._dx) * L
    this._dz += (this._tz - this._dz) * L
    if (this._dy === undefined) this._dy = this._ty || 0
    this._dy += ((this._ty || 0) - this._dy) * L
    let diff = this._trotY - this._drotY
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    this._drotY += diff * L
    this._apply(this._dx, this._dz, this._drotY, 0, this._dy)
    this._locomotion(this._tmoving, this._tcrouch)
  }
  onReady(cb) { if (this._ready) cb(); else this._onReady = cb }
  dispose() {
    clearTimeout(this._stateTimer)
    this._stopAll()
    Object.values(this._anims).forEach(g => { try { g.dispose() } catch {} })
    this._donors.forEach(g => { try { g.dispose() } catch {} })
    this.gun?.dispose?.(); this.root?.dispose?.()
  }
}

// ── Arena world (paintball field + inflatable bunkers) ─────────────────
function buildWorld(scene) {
  scene.clearColor = new Color4(0.55, 0.75, 0.96, 1)
  scene.fogMode = Scene.FOGMODE_EXP2
  scene.fogColor = new Color3(0.7, 0.82, 0.96)
  scene.fogDensity = 0.005
  scene.collisionsEnabled = true   // real mesh collision against map.glb

  const ambient = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene)
  ambient.intensity = 0.8; ambient.groundColor = new Color3(0.22, 0.26, 0.2)
  ambient.diffuse = new Color3(0.95, 0.97, 1.0)

  const sun = new DirectionalLight('sun', new Vector3(-0.5, -1.1, -0.35), scene)
  sun.position = new Vector3(22, 44, 22); sun.intensity = 1.8; sun.diffuse = new Color3(1, 0.98, 0.92)
  const sg = new ShadowGenerator(1024, sun)
  sg.usePoissonSampling = true; sg.bias = 0.0004

  // Sky dome (vertical gradient, follows the camera)
  const sky = MeshBuilder.CreateSphere('sky', { diameter: 280, segments: 16 }, scene)
  sky.infiniteDistance = true; sky.isPickable = false
  const skyMat = new StandardMaterial('skyMat', scene)
  skyMat.backFaceCulling = false; skyMat.disableLighting = true; skyMat.diffuseColor = Color3.Black()
  const skyTex = new DynamicTexture('skyTex', { width: 8, height: 256 }, scene)
  const skc = skyTex.getContext()
  const sgrad = skc.createLinearGradient(0, 0, 0, 256)
  sgrad.addColorStop(0, '#4a86c8'); sgrad.addColorStop(0.6, '#bcd0e0'); sgrad.addColorStop(1, '#e6d9b8')
  skc.fillStyle = sgrad; skc.fillRect(0, 0, 8, 256); skyTex.update()
  skyMat.emissiveTexture = skyTex; sky.material = skyMat

  // The actual map geometry (public/map.glb). Real mesh collision drives both
  // walking and the shoot-raycast. Floor sits at y≈0.
  SceneLoader.ImportMesh('', '/', 'map.glb', scene, (meshes) => {
    meshes.forEach(m => {
      if (m.getTotalVertices && m.getTotalVertices() > 0) {
        m.receiveShadows = true
        m.checkCollisions = true   // blocks the player collider
        m.isPickable = true        // so the shoot-raycast + grounded-ray hit real walls/floor
        try { sg.getShadowMap()?.renderList?.push(m) } catch {}
      } else { m.isPickable = false }
    })
  }, null, (_s, msg, err) => console.error('map.glb load error:', msg, err))

  // Invisible boundary walls so you can't glitch off the map.
  const BH = 10
  const mkBound = (w, d, x, z) => {
    const b = MeshBuilder.CreateBox('bound', { width: w, height: BH, depth: d }, scene)
    b.position.set(x, BH / 2, z); b.checkCollisions = true; b.isVisible = false; b.isPickable = false
  }
  mkBound(1, ARENA_Z * 2 + 2,  ARENA_X + 0.5, 0)
  mkBound(1, ARENA_Z * 2 + 2, -ARENA_X - 0.5, 0)
  mkBound(ARENA_X * 2 + 2, 1, 0,  ARENA_Z + 0.5)
  mkBound(ARENA_X * 2 + 2, 1, 0, -ARENA_Z - 0.5)

  // (Huizen, daken, trapjes en dekking komen uit map.glb — geen losse kratten hier.)

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
function initScene(canvas, { localSessionId, getRoomState, sendState, sendShoot, sendReload, onCrouchToggle, hpDomRef, timerDomRef, ammoDomRef }) {
  const engine = new Engine(canvas, true, { adaptToDeviceRatio: true, stencil: true, powerPreference: 'high-performance' })
  if (window.devicePixelRatio > 1.5) engine.setHardwareScalingLevel(window.devicePixelRatio / 1.5)
  canvas.style.cursor = 'none'   // only the crosshair shows
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
  const jumpRef = { current: false }        // jump request (consumed by the movement loop)
  const crouchRef = { current: false }      // on-screen crouch toggle
  const camModeRef = { current: 'third' }   // 'third' | 'first'
  const look = { yaw: 0, pitch: 0 }
  const keys = {}

  const onKD = e => {
    keys[e.code] = true
    if (e.code === 'KeyR') sendReload?.()
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) jumpRef.current = true }
    if ((e.code === 'ControlLeft' || e.code === 'ControlRight') && !e.repeat) {
      crouchRef.current = !crouchRef.current; onCrouchToggle?.(crouchRef.current)   // toggle hurken
    }
  }
  const onKU = e => { keys[e.code] = false }
  window.addEventListener('keydown', onKD); window.addEventListener('keyup', onKU)

  // Look + fire. Desktop: click locks the mouse, then moving = look and
  // left-click = fire (so bewegen-om-te-kijken schiet niet). Touch: sleep = look.
  let looking = false, lastX = 0, lastY = 0
  let tapShoot = false, touchT = 0, touchSX = 0, touchSY = 0, touchMoved = false
  const isLocked = () => document.pointerLockElement === canvas
  const clampPitch = () => { look.pitch = Math.max(-1.1, Math.min(1.1, look.pitch)) }
  const onPD = e => {
    if (e.pointerType === 'mouse') {
      if (isLocked()) { if (e.button === 0) fireRef.current = true }
      else { try { canvas.requestPointerLock() } catch {} }   // eerste klik pakt de muis, geen schot
    } else {
      looking = true; lastX = e.clientX; lastY = e.clientY
      touchT = performance.now(); touchSX = e.clientX; touchSY = e.clientY; touchMoved = false
    }
  }
  const onPM = e => {
    if (e.pointerType === 'mouse') {
      if (!isLocked()) return
      look.yaw   += (e.movementX || 0) * 0.0026
      look.pitch -= (e.movementY || 0) * 0.0026
      clampPitch()
    } else if (looking) {
      look.yaw   += (e.clientX - lastX) * 0.005
      look.pitch -= (e.clientY - lastY) * 0.005
      clampPitch(); lastX = e.clientX; lastY = e.clientY
      if (Math.hypot(e.clientX - touchSX, e.clientY - touchSY) > 12) touchMoved = true
    }
  }
  const onPU = e => {
    if (e.pointerType === 'mouse') { fireRef.current = false; return }
    looking = false
    // korte tik (niet gesleept, kort vastgehouden) = één schot
    if (!touchMoved && performance.now() - touchT < 260) tapShoot = true
  }
  const onLock = () => { if (!isLocked()) fireRef.current = false }
  canvas.addEventListener('pointerdown', onPD)
  window.addEventListener('pointermove', onPM)
  window.addEventListener('pointerup', onPU)
  document.addEventListener('pointerlockchange', onLock)

  const camPos = new Vector3(0, 5, -12)
  const camTgt = new Vector3(0, 1.5, 0)
  let lastFire = 0
  // Local player collider — real mesh collision against the map (walk anywhere
  // that's open, into houses, blocked only by actual walls).
  const G = 18, JUMP_VEL = 7.5
  const collider = MeshBuilder.CreateBox('pcol', { width: 1, height: 1.8, depth: 1 }, scene)
  collider.isVisible = false; collider.checkCollisions = true
  collider.ellipsoid = new Vector3(0.4, 0.9, 0.4)
  collider.ellipsoidOffset = new Vector3(0, 0.9, 0)
  let vy = 0, grounded = false, jumpCount = 0, spawnedOnce = false, wasDead = false
  let prevShootSeq = {}
  let prevReloadSeq = {}
  let prevJumpSeq = {}

  // Paint splat
  const mkSplatMat = (hex) => { const m = new StandardMaterial('sp', scene); m.disableLighting = true; m.backFaceCulling = false; const c = Color3.FromHexString(hex); m.diffuseColor = c; m.emissiveColor = c; return m }
  const splatMat0 = mkSplatMat(TEAM_HEX[0]), splatMat1 = mkSplatMat(TEAM_HEX[1])
  // Server-driven splat: flat disc oriented to the surface normal at the impact.
  const addSplat = (x, y, z, nx, ny, nz, team) => {
    const b = MeshBuilder.CreateDisc('splat', { radius: 0.3, tessellation: 14 }, scene)
    b.isPickable = false; b.material = (team === 0 ? splatMat0 : splatMat1).clone('spm')
    const n = new Vector3(nx, ny, nz)
    if (n.lengthSquared() < 1e-6) n.set(0, 1, 0)
    n.normalize()
    const up = Math.abs(n.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
    const right = Vector3.Cross(up, n); right.normalize()
    const up2 = Vector3.Cross(n, right); up2.normalize()
    b.rotationQuaternion = Quaternion.RotationQuaternionFromAxis(right, up2, n)   // disc face (+Z) → normal
    b.position.set(x + n.x * 0.03, y + n.y * 0.03, z + n.z * 0.03)
    b.scaling.x = 0.7 + Math.random() * 0.6; b.scaling.y = 0.7 + Math.random() * 0.6
    splats.push({ mesh: b, life: 4 })
    if (splats.length > 80) { const s = splats.shift(); s.mesh.dispose() }
  }

  scene.registerBeforeRender(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05)
    const rs = getRoomState()
    if (!rs) return

    if (timerDomRef?.current) timerDomRef.current.textContent = fmtTime(Math.max(0, rs.timeLeft ?? 0))

    const lp = rs.players.get(localSessionId)
    const crouch = crouchRef.current

    // ── Local movement (client-side mesh collision) ──
    if (lp) {
      // Snap the collider to the server spawn on first appearance and on respawn.
      if (!spawnedOnce || (lp.alive && wasDead)) {
        collider.position.set(lp.x, (lp.y ?? 0), lp.z); vy = 0; spawnedOnce = true
      }
      wasDead = !lp.alive
    }
    const canMove = lp && lp.alive && rs.phase === 'playing' && !lp.reloading
    let moving = false
    if (canMove) {
      const f = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0) - joyRef.current.z
      const r = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0) + joyRef.current.x
      const fwdX = Math.sin(look.yaw), fwdZ = Math.cos(look.yaw)
      const rgtX = Math.cos(look.yaw), rgtZ = -Math.sin(look.yaw)
      let dx = rgtX * r + fwdX * f, dz = rgtZ * r + fwdZ * f
      const dl = Math.hypot(dx, dz); if (dl > 1) { dx /= dl; dz /= dl }
      moving = dl > 0.05
      const spd = crouch ? PLAYER_SPEED * 0.4 : PLAYER_SPEED   // 2,5x trager bij hurken
      if (jumpRef.current) { jumpRef.current = false; if (grounded) { vy = JUMP_VEL; grounded = false; jumpCount++ } }
      vy -= G * dt; if (vy < -30) vy = -30
      // Split horizontal + vertical so the collider slides along edges instead
      // of wedging on them (no more getting stuck on a roof).
      collider.moveWithCollisions(new Vector3(dx * spd * dt, 0, dz * spd * dt))
      collider.moveWithCollisions(new Vector3(0, vy * dt, 0))
      // Grounded via a short downward ray — robust, no mid-air floating.
      const gp = scene.pickWithRay(
        new Ray(new Vector3(collider.position.x, collider.position.y + 0.3, collider.position.z), new Vector3(0, -1, 0), 0.6),
        m => m.checkCollisions && m !== collider)
      grounded = !!(gp && gp.hit)
      if (grounded && vy < 0) vy = 0
      collider.position.x = Math.max(-ARENA_X, Math.min(ARENA_X, collider.position.x))
      collider.position.z = Math.max(-ARENA_Z, Math.min(ARENA_Z, collider.position.z))
      if (collider.position.y < -5 && lp) { collider.position.set(lp.x, lp.y ?? 0, lp.z); vy = 0 }
    } else { vy = 0; jumpRef.current = false }

    // Report our authoritative position to the server (relay).
    sendState({ x: collider.position.x, y: Math.max(0, collider.position.y), z: collider.position.z, rotY: look.yaw, moving, crouch, jumpSeq: jumpCount })

    // ── Fire (hold of korte tik; server bewaakt de cooldown) ──
    const now = performance.now() / 1000
    const wantFire = fireRef.current || tapShoot
    tapShoot = false
    if (wantFire && lp && lp.alive && now - lastFire > 0.13) {
      lastFire = now
      const fx2 = camTgt.x - camPos.x, fy2 = camTgt.y - camPos.y, fz2 = camTgt.z - camPos.z
      const fl = Math.hypot(fx2, fy2, fz2) || 1
      const aimX = camPos.x + fx2 / fl * 50, aimY = camPos.y + fy2 / fl * 50, aimZ = camPos.z + fz2 / fl * 50
      const ex = collider.position.x, ey = collider.position.y + 1.45, ez = collider.position.z
      let dx = aimX - ex, dy = aimY - ey, dz = aimZ - ez
      const dl = Math.hypot(dx, dy, dz) || 1
      dx /= dl; dy /= dl; dz /= dl
      // Raycast to the first real wall so balls fly through doorways but splat on
      // solid walls. range = 999 → no wall, ball just flies (server doesn't have the mesh).
      let range = 999, nx = 0, ny = 1, nz = 0
      const ro = new Vector3(ex + dx * 0.6, ey + dy * 0.6, ez + dz * 0.6)   // start just ahead of the gun
      const pick = scene.pickWithRay(new Ray(ro, new Vector3(dx, dy, dz), 70), m => m.checkCollisions && m !== collider)
      if (pick && pick.hit) {
        range = Math.max(3, pick.distance + 0.6)   // altijd minstens 3 m vliegen (zichtbaar)
        const n = pick.getNormal(true); if (n) { nx = n.x; ny = n.y; nz = n.z }
      }
      sendShoot({ dx, dy, dz, range, nx, ny, nz })
    }

    // HP bar
    if (hpDomRef?.current) hpDomRef.current.style.width = Math.max(0, Math.min(100, lp?.hp ?? 0)) + '%'
    if (ammoDomRef?.current) ammoDomRef.current.textContent = lp ? (lp.reloading ? '⟳ Herladen…' : `🔫 ${lp.ammo}/10`) : ''

    // ── Players ──
    rs.players.forEach((p, sid) => {
      if (!players.has(sid)) {
        const wearing = (() => { try { return JSON.parse(p.wearing || '{}') } catch { return {} } })()
        players.set(sid, new PlayerInstance(scene, sg, { shirt: p.shirt, wearing, team: p.team, teamColor: TEAM_HEX[p.team], name: p.name }))
        prevShootSeq[sid] = p.shootSeq; prevReloadSeq[sid] = p.reloadSeq; prevJumpSeq[sid] = p.jumpSeq
      }
      const inst = players.get(sid)
      inst.setDead(!p.alive)
      const shotChanged = p.shootSeq !== prevShootSeq[sid]
      const reloadChanged = p.reloadSeq !== prevReloadSeq[sid]
      const jumpChanged = p.jumpSeq !== prevJumpSeq[sid]
      prevShootSeq[sid] = p.shootSeq; prevReloadSeq[sid] = p.reloadSeq; prevJumpSeq[sid] = p.jumpSeq
      if (jumpChanged) inst.playJump()
      else if (reloadChanged) inst.playReload()   // reload takes priority over the emptying shot
      else if (shotChanged) inst.playShoot()

      if (sid === localSessionId) {
        // Render the local player at its own collider position (client-authoritative).
        inst.setPose(collider.position.x, collider.position.z,
          p.alive ? look.yaw : p.rotY, p.alive && moving, look.pitch,
          collider.position.y, crouch)
      } else {
        inst.setTarget(p.x, p.z, p.rotY, p.moving, p.y, p.crouching)
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
        m = MeshBuilder.CreateSphere('shot', { diameter: 0.2, segments: 8 }, scene)
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
      if (!live.has(id)) { shotMeshes.get(id).mesh.dispose(); shotMeshes.delete(id) }
    }

    // ── Splats fade ──
    for (let i = splats.length - 1; i >= 0; i--) {
      const s = splats[i]; s.life -= dt
      if (s.life <= 0) { s.mesh.dispose(); splats.splice(i, 1); continue }
      s.mesh.material.alpha = Math.min(1, s.life)
    }

    // ── Camera ──
    const me = players.get(localSessionId)
    const deadView = !!(lp && !lp.alive)
    const fpView = camModeRef.current === 'first' && !deadView   // dead → watch your corpse in 3rd person
    if (me && me._ready) me.setBodyVisible(!fpView)   // stay hidden until the idle pose is ready (geen T-pose)
    const px = (me && me._dx !== undefined) ? me._dx : (lp?.x ?? 0)
    const pz = (me && me._dz !== undefined) ? me._dz : (lp?.z ?? 0)
    const fX = Math.sin(look.yaw) * Math.cos(look.pitch)
    const fY = Math.sin(look.pitch)
    const fZ = Math.cos(look.yaw) * Math.cos(look.pitch)
    const pyY = (me && me._dy !== undefined) ? me._dy : (lp?.y ?? 0)   // player height (jump/floors)
    let wantPos, wantTgt
    if (fpView) {
      wantPos = new Vector3(px + Math.sin(look.yaw) * 0.1, pyY + 1.55, pz + Math.cos(look.yaw) * 0.1)
      wantTgt = new Vector3(px + fX * 6, pyY + 1.55 + fY * 6, pz + fZ * 6)
    } else {
      wantPos = new Vector3(px - Math.sin(look.yaw) * 5 - fX * 1.5, pyY + 3.2 - fY * 2.5, pz - Math.cos(look.yaw) * 5 - fZ * 1.5)
      wantTgt = new Vector3(px + fX * 5, pyY + 1.4 + fY * 5, pz + fZ * 5)
    }
    const cl = 1 - Math.exp(-dt * (fpView ? 45 : 18))
    camPos.addInPlace(wantPos.subtract(camPos).scale(cl))
    camTgt.addInPlace(wantTgt.subtract(camTgt).scale(cl))
    camera.position.copyFrom(camPos); camera.setTarget(camTgt)
  })

  engine.runRenderLoop(() => scene.render())
  const onResize = () => engine.resize()
  window.addEventListener('resize', onResize)

  return {
    joyRef, fireRef, jumpRef, crouchRef, camModeRef,
    pushSplat: (d) => addSplat(d.x, d.y, d.z, d.nx, d.ny, d.nz, d.team),
    dispose: () => {
      window.removeEventListener('keydown', onKD); window.removeEventListener('keyup', onKU)
      window.removeEventListener('pointerup', onPU); window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPM); document.removeEventListener('pointerlockchange', onLock)
      canvas.removeEventListener('pointerdown', onPD)
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
  const [crouchOn, setCrouchOn] = useState(false)

  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const roomStateRef = useRef(null)
  const roomRef = useRef(null)
  const timerDomRef = useRef(null)
  const hpDomRef = useRef(null)
  const ammoDomRef = useRef(null)

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
    r.onMessage('splat', d => sceneRef.current?.pushSplat?.(d))
    r.onLeave(() => { setScreen('lobby'); setRoom(null) })
    setScreen('waiting')
  }, [])

  useEffect(() => {
    if (screen !== 'playing' || !canvasRef.current || !room) return
    const sc = initScene(canvasRef.current, {
      localSessionId: room.sessionId,
      getRoomState: () => roomStateRef.current,
      sendInput: inp => roomRef.current?.send('input', inp),
      sendState: s => roomRef.current?.send('state', s),
      sendShoot: dir => roomRef.current?.send('shoot', dir),
      sendReload: () => roomRef.current?.send('reload'),
      onCrouchToggle: v => setCrouchOn(v),
      timerDomRef, hpDomRef, ammoDomRef,
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

      {/* Ammo (boven, midden) + HP bar (onder) */}
      <div ref={ammoDomRef} className="pb-ammo" title="Herladen (R)"
        onPointerDown={e => { e.preventDefault(); room?.send('reload') }}>🔫 10/10</div>
      <div className="pb-hp"><span className="pb-hp-icon">❤️</span><div className="pb-hp-track"><div ref={hpDomRef} className="pb-hp-fill" /></div></div>

      {me && !me.alive && (
        <>
          <div className="pb-dead-overlay" />
          <div className="pb-respawn">Uitgeschakeld! 💥<br /><span>Respawn in {Math.ceil(me.respawnIn)}…</span></div>
        </>
      )}

      {sceneRef.current && <VirtualJoystick joyRef={sceneRef.current.joyRef} />}

      <button className={'pb-crouch-btn' + (crouchOn ? ' pb-crouch-on' : '')}
        onPointerDown={e => { e.preventDefault(); const n = !crouchOn; setCrouchOn(n); if (sceneRef.current) sceneRef.current.crouchRef.current = n }}
      >🦆<span>Hurk{crouchOn ? ' AAN' : ''}</span></button>

      <div className="rg-actions">
        <button className="pb-fire-btn"
          onPointerDown={e => { e.preventDefault(); if (sceneRef.current) sceneRef.current.fireRef.current = true }}
          onPointerUp={() => { if (sceneRef.current) sceneRef.current.fireRef.current = false }}
          onPointerLeave={() => { if (sceneRef.current) sceneRef.current.fireRef.current = false }}
        >🎯<span>Schiet</span></button>
        <button className="pb-jump-btn"
          onPointerDown={e => { e.preventDefault(); if (sceneRef.current) sceneRef.current.jumpRef.current = true }}
        >⬆️<span>Spring</span></button>
      </div>
    </div>
  )
}
