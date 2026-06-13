import { useState, useEffect, useRef, useCallback } from 'react'
import * as Colyseus from '@colyseus/sdk'
import {
  Engine, Scene, FreeCamera,
  Color3, Color4, Vector3, Quaternion, Ray,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  MeshBuilder, StandardMaterial, DynamicTexture, Texture,
  DefaultRenderingPipeline, ParticleSystem,
} from '@babylonjs/core'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'
import { findItem } from '../itemsCatalog'
import { applyItemToMesh, loadClothingDonor, usesDonor } from '../applyClothing'
import OrientationGate from '../OrientationGate'
import './rocket-game.css'
import './paintball.css'

const SERVER_URL = 'wss://kenniskist-server.onrender.com'

// ── Arena constants (mirror the server exactly) ────────────────────────
let ARENA_X = 24    // wordt per map gezet
let ARENA_Z = 24
const MAPS = {
  dorp: { label: 'Dorp', glb: 'map.glb', ax: 24, az: 24,
    clear: [0.55, 0.75, 0.96], fog: [0.70, 0.82, 0.96], fogD: 0.006,
    sky: ['#4a86c8', '#bcd0e0', '#e6d9b8'],
    tex: { ground: '/zand.png', stone: '/zandsteen.png', scale: 9, stoneScale: 3 } },
  bos:  { label: 'Bos', glb: 'bos.glb', ax: 40, az: 40,
    clear: [0.58, 0.74, 0.62], fog: [0.72, 0.82, 0.70], fogD: 0.0045,
    sky: ['#6a93c4', '#bcd8c4', '#dcebd2'],
    tex: { ground: '/gras.png', stone: '/plankenhuis.png', scale: 22, stoneScale: 2 } },
  stad: { label: 'Industrieterrein', glb: 'stad.glb', ax: 25, az: 50,
    clear: [0.55, 0.75, 0.96], fog: [0.70, 0.82, 0.96], fogD: 0.004,
    sky: ['#4a86c8', '#bcd0e0', '#e6d9b8'],
    tex: { ground: '/stenen.jpg', stone: '/stenenhuis.jpg', scale: 12, brickSize: 1.5 } },
}
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

// ── Sky-decor: zonnegloed + zachte wolken (statisch, GPU-goedkoop) ──────
function addSkyDecor(scene, mapCfg) {
  // Zon-gloed in de richting van het zonlicht
  const sunPos = new Vector3(-0.5, -1.05, -0.4).normalize().scale(-130)
  const glowTex = new DynamicTexture('sunGlow', { width: 128, height: 128 }, scene)
  const gc = glowTex.getContext()
  const gg = gc.createRadialGradient(64, 64, 3, 64, 64, 62)
  gg.addColorStop(0, 'rgba(255,253,238,1)'); gg.addColorStop(0.22, 'rgba(255,246,205,0.8)'); gg.addColorStop(1, 'rgba(255,240,190,0)')
  gc.fillStyle = gg; gc.fillRect(0, 0, 128, 128); glowTex.update(); glowTex.hasAlpha = true
  const sunMat = new StandardMaterial('sunGlowMat', scene)
  sunMat.diffuseTexture = glowTex; sunMat.useAlphaFromDiffuseTexture = true
  sunMat.emissiveColor = Color3.White(); sunMat.disableLighting = true; sunMat.backFaceCulling = false
  const sunDisc = MeshBuilder.CreatePlane('sunDisc', { size: 80 }, scene)
  sunDisc.position = sunPos; sunDisc.billboardMode = 7; sunDisc.isPickable = false
  sunDisc.material = sunMat; sunDisc.applyFog = false

  // Geen wolken in het bos (dicht bladerdak)
  if (mapCfg.glb === 'bos.glb') return
  const cloudTex = new DynamicTexture('cloudTex', { width: 256, height: 128 }, scene)
  const cc = cloudTex.getContext()
  cc.clearRect(0, 0, 256, 128)
  for (let i = 0; i < 8; i++) {
    const x = 40 + Math.random() * 176, y = 48 + Math.random() * 42, r = 24 + Math.random() * 30
    const cg = cc.createRadialGradient(x, y, 2, x, y, r)
    cg.addColorStop(0, 'rgba(255,255,255,0.92)'); cg.addColorStop(1, 'rgba(255,255,255,0)')
    cc.fillStyle = cg; cc.beginPath(); cc.arc(x, y, r, 0, Math.PI * 2); cc.fill()
  }
  cloudTex.update(); cloudTex.hasAlpha = true
  const cloudMat = new StandardMaterial('cloudMat', scene)
  cloudMat.diffuseTexture = cloudTex; cloudMat.useAlphaFromDiffuseTexture = true
  cloudMat.emissiveColor = new Color3(0.96, 0.97, 1); cloudMat.disableLighting = true; cloudMat.backFaceCulling = false
  for (let i = 0; i < 6; i++) {
    const cl = MeshBuilder.CreatePlane('cloud' + i, { width: 64, height: 30 }, scene)
    const ang = (i / 6) * Math.PI * 2 + Math.random()
    cl.position = new Vector3(Math.cos(ang) * 95, 52 + Math.random() * 28, Math.sin(ang) * 95)
    cl.billboardMode = 7; cl.isPickable = false; cl.material = cloudMat; cl.applyFog = false
  }
}

// ── Zachte ronde stip-textuur voor particles ────────────────────────────
function softDotTexture(scene, rgb = '255,255,255') {
  const t = new DynamicTexture('dot' + Math.random(), { width: 64, height: 64 }, scene)
  const c = t.getContext()
  const g = c.createRadialGradient(32, 32, 2, 32, 32, 30)
  g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(1, `rgba(${rgb},0)`)
  c.fillStyle = g; c.fillRect(0, 0, 64, 64)
  t.update(); t.hasAlpha = true
  return t
}

// ── Onregelmatige verf-splat als alpha-masker (witte vlek + spetters + drips) ──
function makeSplatAlphaTexture(scene) {
  const S = 128
  const t = new DynamicTexture('splatA' + Math.random(), { width: S, height: S }, scene)
  const c = t.getContext()
  c.clearRect(0, 0, S, S)
  c.fillStyle = '#ffffff'
  const cx = 64, cy = 64
  // centrale grillige klodder
  c.beginPath()
  const pts = 12
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2
    const r = 22 + Math.random() * 20
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
    i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)
  }
  c.closePath(); c.fill()
  // losse spetters eromheen
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 34
    c.beginPath(); c.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.5 + Math.random() * 6, 0, Math.PI * 2); c.fill()
  }
  // een paar drips
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2, d = 18 + Math.random() * 14
    c.save(); c.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d); c.rotate(a)
    c.beginPath(); c.ellipse(0, 0, 2.5, 7 + Math.random() * 7, 0, 0, Math.PI * 2); c.fill(); c.restore()
  }
  t.update(); t.hasAlpha = true
  return t
}

// ── Map-decor: omgeving buiten de arena + sfeer-particles ───────────────
// Alles is puur visueel: isPickable=false, geen collisions, frozen matrices.
function addMapDecor(scene, mapCfg) {
  const ax = mapCfg.ax, az = mapCfg.az
  const isBos  = mapCfg.glb === 'bos.glb'
  const isStad = mapCfg.glb === 'stad.glb'
  const rnd  = (a, b) => a + Math.random() * (b - a)
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

  const mkMat = (hex, emiss = 0) => {
    const m = new StandardMaterial('dm' + Math.random(), scene)
    const c = Color3.FromHexString(hex)
    m.diffuseColor = c; m.specularColor = Color3.Black()
    if (emiss) m.emissiveColor = c.scale(emiss)
    return m
  }
  const done = (m) => { m.isPickable = false; try { m.freezeWorldMatrix() } catch {} }

  // Grote omgevingsvloer — geen lege void meer achter de arenarand
  const groundHex = isBos ? '#27431f' : isStad ? '#3c4046' : '#cdb377'
  const bigGround = MeshBuilder.CreateDisc('decoGround', { radius: 220, tessellation: 48 }, scene)
  bigGround.rotation.x = Math.PI / 2
  bigGround.position.y = -0.08
  bigGround.material = mkMat(groundHex)
  done(bigGround)

  // Verre decor-ring: RUIM buiten de map-geometrie, zodat niets clipt of bereikbaar is.
  const R0 = Math.max(ax, az) + 30
  const ringSpot = () => {
    const a = Math.random() * Math.PI * 2
    const r = R0 + Math.random() * 60
    return { x: Math.cos(a) * r, z: Math.sin(a) * r }
  }

  const mkTree = (x, z, s, leafHex) => {
    const trunk = MeshBuilder.CreateCylinder('dTr', { height: 2.2 * s, diameter: 0.5 * s, tessellation: 6 }, scene)
    trunk.material = mkMat('#6b4a2a'); trunk.position.set(x, 1.1 * s, z); done(trunk)
    const top = MeshBuilder.CreateCylinder('dLf', { height: 3.6 * s, diameterTop: 0, diameterBottom: 2.9 * s, tessellation: 7 }, scene)
    top.material = mkMat(leafHex); top.position.set(x, 2.2 * s + 1.6 * s, z); done(top)
  }
  const mkRock = (x, z, s) => {
    const r = MeshBuilder.CreatePolyhedron('dRk', { type: Math.floor(Math.random() * 4), size: s }, scene)
    r.material = mkMat(pick(['#8d8a82', '#7c7a74', '#9a958a']))
    r.position.set(x, s * 0.45, z)
    r.rotation.set(Math.random(), Math.random() * 6, Math.random())
    done(r)
  }
  const mkBuilding = (x, z) => {
    const w = rnd(5, 10), h = rnd(8, 26), d = rnd(5, 10)
    const b = MeshBuilder.CreateBox('dBld', { width: w, height: h, depth: d }, scene)
    b.material = mkMat(pick(['#3a3f4a', '#454b56', '#2f343d', '#525a6b', '#3f4654']))
    b.position.set(x, h / 2, z); b.rotation.y = rnd(0, Math.PI * 2); done(b)
  }
  const mkHouse = (x, z) => {
    const w = rnd(4, 6), h = rnd(2.6, 3.4), d = rnd(3.5, 5)
    const body = MeshBuilder.CreateBox('dHs', { width: w, height: h, depth: d }, scene)
    body.material = mkMat(pick(['#e8d9b8', '#d9c4a0', '#e3cfae'])); body.position.set(x, h / 2, z)
    body.rotation.y = rnd(0, Math.PI * 2); done(body)
    const roof = MeshBuilder.CreateCylinder('dRf', { height: rnd(1.4, 1.9), diameterTop: 0, diameterBottom: Math.max(w, d) * 1.3, tessellation: 4 }, scene)
    roof.material = mkMat(pick(['#b0563a', '#9c4a30', '#bd6a48'])); roof.position.set(x, h + 0.8, z)
    roof.rotation.y = body.rotation.y + Math.PI / 4; done(roof)
  }

  if (isBos) {
    for (let i = 0; i < 110; i++) { const p = ringSpot(); mkTree(p.x, p.z, rnd(1.0, 2.4), pick(['#2d6b35', '#1f5429', '#357840', '#2a6030'])) }
    for (let i = 0; i < 22; i++)  { const p = ringSpot(); mkRock(p.x, p.z, rnd(1.0, 2.6)) }
  } else if (isStad) {
    for (let i = 0; i < 46; i++) { const p = ringSpot(); mkBuilding(p.x, p.z) }
    for (let i = 0; i < 16; i++) { const p = ringSpot(); mkTree(p.x, p.z, rnd(0.9, 1.6), pick(['#3f7a40', '#357040'])) }
  } else {
    for (let i = 0; i < 70; i++) { const p = ringSpot(); mkTree(p.x, p.z, rnd(0.9, 1.9), pick(['#3f8a4a', '#4a9a55', '#357a40'])) }
    for (let i = 0; i < 16; i++) { const p = ringSpot(); mkRock(p.x, p.z, rnd(0.8, 1.9)) }
    for (let i = 0; i < 8;  i++) { const p = ringSpot(); mkHouse(p.x, p.z) }
  }

  // ── Sfeer-particles boven de arena ──
  if (isBos) {
    const lv = new ParticleSystem('dLv', 90, scene)
    lv.particleTexture = softDotTexture(scene, '200,235,130')
    lv.emitter = new Vector3(0, 11, 0)
    lv.minEmitBox = new Vector3(-ax, 0, -az); lv.maxEmitBox = new Vector3(ax, 0, az)
    lv.color1 = new Color4(0.55, 0.78, 0.3, 0.8); lv.color2 = new Color4(0.85, 0.62, 0.25, 0.75)
    lv.colorDead = new Color4(0.6, 0.6, 0.3, 0)
    lv.minSize = 0.1; lv.maxSize = 0.26
    lv.minLifeTime = 6; lv.maxLifeTime = 10; lv.emitRate = 9
    lv.direction1 = new Vector3(-0.4, -1, -0.4); lv.direction2 = new Vector3(0.4, -0.6, 0.4)
    lv.minEmitPower = 0.5; lv.maxEmitPower = 1.1
    lv.gravity = new Vector3(0, -0.45, 0); lv.updateSpeed = 0.01
    lv.start()
  } else if (!isStad) {
    const dust = new ParticleSystem('dDu', 70, scene)
    dust.particleTexture = softDotTexture(scene, '255,245,220')
    dust.emitter = new Vector3(0, 1.4, 0)
    dust.minEmitBox = new Vector3(-ax, 0, -az); dust.maxEmitBox = new Vector3(ax, 2.5, az)
    dust.color1 = new Color4(1, 0.96, 0.85, 0.1); dust.color2 = new Color4(1, 0.94, 0.8, 0.07)
    dust.colorDead = new Color4(1, 0.95, 0.85, 0)
    dust.minSize = 0.08; dust.maxSize = 0.22
    dust.minLifeTime = 5; dust.maxLifeTime = 9; dust.emitRate = 8
    dust.direction1 = new Vector3(-0.3, 0.05, -0.1); dust.direction2 = new Vector3(0.5, 0.25, 0.2)
    dust.minEmitPower = 0.2; dust.maxEmitPower = 0.6; dust.updateSpeed = 0.008
    dust.start()
  }
}

// ── Arena world (loads the chosen GLB map) ─────────────────────────────
function buildWorld(scene, mapCfg, onObstacles) {
  scene.clearColor = new Color4(mapCfg.clear[0], mapCfg.clear[1], mapCfg.clear[2], 1)
  scene.fogMode = Scene.FOGMODE_EXP2
  scene.fogColor = new Color3(mapCfg.fog[0], mapCfg.fog[1], mapCfg.fog[2])
  scene.fogDensity = mapCfg.fogD
  scene.collisionsEnabled = true   // real mesh collision against the GLB map

  const ambient = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene)
  ambient.intensity = 0.72
  ambient.groundColor = new Color3(0.20, 0.24, 0.22)
  ambient.diffuse = new Color3(0.92, 0.96, 1.0)
  ambient.specular = new Color3(0.12, 0.12, 0.14)

  // Warme zon (key light) met zachte schaduwen
  const sun = new DirectionalLight('sun', new Vector3(-0.5, -1.05, -0.4), scene)
  sun.position = new Vector3(40, 70, 35); sun.intensity = 2.0
  sun.diffuse = new Color3(1.0, 0.96, 0.86); sun.specular = new Color3(1.0, 0.94, 0.82)
  sun.shadowMinZ = 1; sun.shadowMaxZ = 170
  const sg = new ShadowGenerator(1024, sun)
  sg.useBlurExponentialShadowMap = true; sg.blurKernel = 24; sg.bias = 0.0009; sg.setDarkness(0.38)

  // Koel invullicht voor diepte (geen schaduw → goedkoop)
  const fill = new DirectionalLight('fill', new Vector3(0.55, -0.35, 0.7), scene)
  fill.intensity = 0.32; fill.diffuse = new Color3(0.62, 0.74, 0.96); fill.specular = Color3.Black()

  // Sky dome (vertical gradient, follows the camera)
  const sky = MeshBuilder.CreateSphere('sky', { diameter: 280, segments: 16 }, scene)
  sky.infiniteDistance = true; sky.isPickable = false
  const skyMat = new StandardMaterial('skyMat', scene)
  skyMat.backFaceCulling = false; skyMat.disableLighting = true; skyMat.diffuseColor = Color3.Black()
  const skyTex = new DynamicTexture('skyTex', { width: 16, height: 512 }, scene)
  const skc = skyTex.getContext()
  const sgrad = skc.createLinearGradient(0, 0, 0, 512)
  sgrad.addColorStop(0,    mapCfg.sky[0])
  sgrad.addColorStop(0.42, mapCfg.sky[1])
  sgrad.addColorStop(0.78, mapCfg.sky[2])
  sgrad.addColorStop(1,    mapCfg.sky[2])
  skc.fillStyle = sgrad; skc.fillRect(0, 0, 16, 512)
  // zachte heldere band rond de horizon
  const haze = skc.createLinearGradient(0, 360, 0, 470)
  haze.addColorStop(0, 'rgba(255,255,255,0)'); haze.addColorStop(1, 'rgba(255,255,255,0.18)')
  skc.fillStyle = haze; skc.fillRect(0, 360, 16, 110)
  skyTex.update()
  skyMat.emissiveTexture = skyTex; sky.material = skyMat

  addSkyDecor(scene, mapCfg)
  try { addMapDecor(scene, mapCfg) } catch (e) { console.warn('map-decor overgeslagen:', e) }

  // Optionele texturen voor deze map: grond + gebouwen.
  let groundTex = null, stoneBaseTex = null
  if (mapCfg.tex) {
    const s = mapCfg.tex.scale || 9
    groundTex    = new Texture(mapCfg.tex.ground, scene); groundTex.uScale = s; groundTex.vScale = s; groundTex.hasAlpha = false
    stoneBaseTex = new Texture(mapCfg.tex.stone,  scene); stoneBaseTex.hasAlpha = false
  }
  // Clone material + texture per mesh — prevents shared-material contamination
  // and lets us set per-mesh UV scale/rotation independently.
  const applyTex = (mesh, baseTex, uS, vS, wAng = 0) => {
    if (!mesh || !baseTex) return
    const orig = mesh.material
    if (!orig) return
    const t = baseTex.clone()      // shares WebGL texture, independent UV settings
    t.uScale = uS; t.vScale = vS; t.wAng = wAng
    const mat = orig.clone(mesh.name + '_mat')
    mesh.material = mat
    if (mat.albedoTexture  !== undefined) { mat.albedoTexture  = t; mat.albedoColor  = Color3.White() }
    else if (mat.diffuseTexture !== undefined) { mat.diffuseTexture = t; mat.diffuseColor = Color3.White() }
  }

  // The chosen GLB map. Real mesh collision drives walking + the shoot-raycast.
  const derivedObstacles = []   // hitbox-AABB's, afgeleid uit de échte geometrie
  SceneLoader.ImportMesh('', '/', mapCfg.glb, scene, (meshes) => {
    meshes.forEach(m => {
      if (m.getTotalVertices && m.getTotalVertices() > 0) {
        m.receiveShadows = true
        m.checkCollisions = true   // blocks the player collider
        m.isPickable = true        // so the shoot-raycast + grounded-ray hit real walls/floor

        // Hitbox-AABB afleiden (alles behalve grond/vloer) → naar de server voor bot-LOS
        const mnL = (m.name || '').toLowerCase()
        const matnL = (m.material?.name || '').toLowerCase()
        const ground = matnL.includes('ground') || matnL.includes('grass') || mnL === 'floor' || mnL.includes('floor')
        if (!ground) {
          try {
            m.computeWorldMatrix(true)
            const bb = m.getBoundingInfo().boundingBox
            const mn2 = bb.minimumWorld, mx2 = bb.maximumWorld
            const hw = (mx2.x - mn2.x) / 2, hd = (mx2.z - mn2.z) / 2, top = mx2.y
            if (top > 0.5 && hw < 30 && hd < 30 && (hw > 0.2 || hd > 0.2)) {
              derivedObstacles.push({ x: (mn2.x + mx2.x) / 2, z: (mn2.z + mx2.z) / 2, hw, hd, top })
            }
          } catch {}
        }
        if (mapCfg.tex) {
          const mn   = (m.name || '').toLowerCase()
          const matn = (m.material?.name || '').toLowerCase()
          const cfg  = mapCfg.tex

          const isGround = matn.includes('ground') || matn.includes('grass') || mn === 'floor' || mn.includes('floor')
          if (isGround) {
            applyTex(m, groundTex, cfg.scale || 9, cfg.scale || 9)
          } else if (matn.includes('sand') || matn.includes('wall') || matn.includes('roof') || matn.includes('wood') ||
                     mn.includes('house') || mn.includes('cover') || mn.includes('big') || mn.includes('cube') ||
                     mn.includes('cylinder') || mn.includes('object') || mn.includes('jump')) {
            // brickSize aanwezig → cube-projection UVs (1 UV-unit = 1m, e.g. stad).
            // stoneScale → genormaliseerde UVs (0-1), vaste tiling (bos/dorp).
            let uS, vS
            if (cfg.brickSize) {
              const s = 1 / cfg.brickSize
              uS = s; vS = s
            } else {
              const ss = cfg.stoneScale || 3
              uS = ss; vS = ss
            }
            applyTex(m, stoneBaseTex, uS, vS, 0)
          }
        }
        try { m.freezeWorldMatrix() } catch {}
        try { sg.getShadowMap()?.renderList?.push(m) } catch {}
      } else { m.isPickable = false }
    })
    onObstacles?.(derivedObstacles)
  }, null, (_s, msg, err) => console.error('map load error:', msg, err))

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
function initScene(canvas, { localSessionId, getRoomState, sendState, sendShoot, sendReload, sendObstacles, onCrouchToggle, mapCfg, hpDomRef, timerDomRef, ammoDomRef }) {
  const engine = new Engine(canvas, true, { adaptToDeviceRatio: true, stencil: true, powerPreference: 'high-performance' })
  if (window.devicePixelRatio > 1.5) engine.setHardwareScalingLevel(window.devicePixelRatio / 1.5)
  canvas.style.cursor = 'none'   // only the crosshair shows
  const scene = new Scene(engine)
  const camera = new FreeCamera('cam', new Vector3(0, 5, -12), scene)
  camera.inputs.clear(); camera.minZ = 0.1; camera.maxZ = 300

  // Compact versturen: plat getallen-array, gefilterd + afgerond + gecapt zodat
  // het bericht ruim binnen de websocket-payloadlimiet blijft (bos heeft veel meshes).
  const packObstacles = (list) => {
    const r1 = v => Math.round(v * 10) / 10
    const sorted = [...list]
      .filter(o => o.top > 0.9 && o.hw * o.hd > 0.15)
      .sort((a, b) => (b.hw * b.hd) - (a.hw * a.hd))
      .slice(0, 80)
    const flat = []
    sorted.forEach(o => flat.push(r1(o.x), r1(o.z), r1(o.hw), r1(o.hd), r1(o.top)))
    return flat
  }
  const sg = buildWorld(scene, mapCfg, (obstacles) => sendObstacles?.(packObstacles(obstacles)))
  try {
    const pipe = new DefaultRenderingPipeline('pipe', true, scene, [camera])   // HDR → mooiere bloom
    pipe.imageProcessingEnabled = true; pipe.imageProcessing.contrast = 1.12; pipe.imageProcessing.exposure = 1.12
    pipe.fxaaEnabled = true            // gladde randen (smoother)
    pipe.samples = 4                   // MSAA tegen kartelranden
    pipe.bloomEnabled = true; pipe.bloomThreshold = 0.82; pipe.bloomWeight = 0.18; pipe.bloomScale = 0.5
    // Subtiele vignette voor meer sfeer/diepte
    pipe.imageProcessing.vignetteEnabled = true
    pipe.imageProcessing.vignetteWeight = 2.2
    pipe.imageProcessing.vignetteColor = new Color4(0, 0, 0, 0)
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

  // Paint splat: gekleurd vlak met een grillig verf-alpha-masker → echte splat-vorm.
  const mkSplatMat = (hex) => {
    const m = new StandardMaterial('sp', scene); m.disableLighting = true; m.backFaceCulling = false
    const c = Color3.FromHexString(hex); m.diffuseColor = c; m.emissiveColor = c
    m.useAlphaFromDiffuseTexture = true            // alpha (splat-vorm) uit de textuur
    return m
  }
  const splatMat0 = mkSplatMat(TEAM_HEX[0]), splatMat1 = mkSplatMat(TEAM_HEX[1])
  const splatTextures = [0, 1, 2, 3].map(() => makeSplatAlphaTexture(scene))   // wat variatie
  const burstTex = softDotTexture(scene, '255,255,255')

  // Server-driven splat: plat vlak op het oppervlak, plus een spetter-burst.
  const addSplat = (x, y, z, nx, ny, nz, team) => {
    const n = new Vector3(nx, ny, nz)
    if (n.lengthSquared() < 1e-6) n.set(0, 1, 0)
    n.normalize()
    const up = Math.abs(n.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
    const right = Vector3.Cross(up, n); right.normalize()
    const up2 = Vector3.Cross(n, right); up2.normalize()
    let quat = Quaternion.RotationQuaternionFromAxis(right, up2, n)              // vlak (+Z) → normaal
    quat = Quaternion.RotationAxis(n, Math.random() * Math.PI * 2).multiply(quat) // willekeurige rol
    const px = x + n.x * 0.03, py = y + n.y * 0.03, pz = z + n.z * 0.03

    const b = MeshBuilder.CreatePlane('splat', { size: 0.78, sideOrientation: 2 }, scene)
    b.isPickable = false
    const mat = (team === 0 ? splatMat0 : splatMat1).clone('spm')
    mat.diffuseTexture = splatTextures[(Math.random() * splatTextures.length) | 0]   // grillige verf-vorm (alpha)
    mat.transparencyMode = 2   // ALPHABLEND
    mat.zOffset = -4
    b.material = mat
    b.rotationQuaternion = quat
    b.position.set(px, py, pz)
    b.renderingGroupId = 1     // bovenop de muur (geen z-fighting)
    b.scaling.x = 0.8 + Math.random() * 0.7
    b.scaling.y = 0.8 + Math.random() * 0.7
    splats.push({ mesh: b, life: 8 })
    if (splats.length > 80) { const s = splats.shift(); s.mesh.dispose() }

    // ── Spetter-burst: kleine verfdruppels spatten van het oppervlak ──
    const ps = new ParticleSystem('splatBurst', 22, scene)
    ps.particleTexture = burstTex
    ps.emitter = new Vector3(px, py, pz)
    ps.minEmitBox = Vector3.Zero(); ps.maxEmitBox = Vector3.Zero()
    const c = Color3.FromHexString(TEAM_HEX[team])
    ps.color1 = new Color4(c.r, c.g, c.b, 1); ps.color2 = new Color4(c.r * 0.75, c.g * 0.75, c.b * 0.75, 1)
    ps.colorDead = new Color4(c.r, c.g, c.b, 0)
    ps.minSize = 0.04; ps.maxSize = 0.15
    ps.minLifeTime = 0.2; ps.maxLifeTime = 0.5
    ps.emitRate = 320; ps.targetStopDuration = 0.06; ps.disposeOnStop = true
    ps.gravity = new Vector3(0, -9, 0)
    ps.direction1 = new Vector3(n.x - right.x - up2.x, n.y + 0.2, n.z - right.z - up2.z)
    ps.direction2 = new Vector3(n.x + right.x + up2.x, n.y + 0.9, n.z + right.z + up2.z)
    ps.minEmitPower = 1.6; ps.maxEmitPower = 4.4; ps.updateSpeed = 0.016
    ps.start()
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
      const eyeOff = crouch ? 1.05 : 1.45   // lager mikpunt als je bukt
      const ex = collider.position.x, ey = collider.position.y + eyeOff, ez = collider.position.z
      let dx = aimX - ex, dy = aimY - ey, dz = aimZ - ez
      const dl = Math.hypot(dx, dy, dz) || 1
      dx /= dl; dy /= dl; dz /= dl
      // Raycast to the first real wall so balls fly through doorways but splat on
      // solid walls. range = 999 → no wall, ball just flies (server doesn't have the mesh).
      let range = 999, nx = 0, ny = 1, nz = 0, hx = 0, hy = 0, hz = 0, hit = 0
      const ro = new Vector3(ex + dx * 0.6, ey + dy * 0.6, ez + dz * 0.6)   // start just ahead of the gun
      const pick = scene.pickWithRay(new Ray(ro, new Vector3(dx, dy, dz), 70), m => m.checkCollisions && m !== collider)
      if (pick && pick.hit) {
        range = Math.max(0.4, pick.distance)   // bal stopt OP de muur (geen overshoot → splat op het oppervlak)
        const n = pick.getNormal(true)
        if (n) {
          // Zorg dat de normaal naar de schutter wijst (anders komt de splat ACHTER de muur → onzichtbaar)
          if (n.x * dx + n.y * dy + n.z * dz > 0) { n.x = -n.x; n.y = -n.y; n.z = -n.z }
          nx = n.x; ny = n.y; nz = n.z
        }
        const pp = pick.pickedPoint; if (pp) { hx = pp.x; hy = pp.y; hz = pp.z; hit = 1 }   // exact raakpunt
      }
      sendShoot({ dx, dy, dz, range, nx, ny, nz, oy: ey, hx, hy, hz, hit })
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
    const eyeH = crouchRef.current ? 1.05 : 1.55   // hoofd zakt bij bukken; pyY volgt de sprong
    let wantPos, wantTgt
    if (fpView) {
      wantPos = new Vector3(px + Math.sin(look.yaw) * 0.1, pyY + eyeH, pz + Math.cos(look.yaw) * 0.1)
      wantTgt = new Vector3(px + fX * 6, pyY + eyeH + fY * 6, pz + fZ * 6)
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
  const [mapKey, setMapKey] = useState('dorp')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const connect = async (create) => {
    setLoading(true); setError(null)
    try {
      const shirt = localStorage.getItem('kk_shirt') || ''
      const wearing = localStorage.getItem('kk_wearing') || '{}'
      const client = new Colyseus.Client(SERVER_URL)
      const joinCode = create ? String(Math.floor(10000 + Math.random() * 90000)) : code.trim()
      const opts = { joinCode, shirt, wearing, name: name || 'Speler', map: mapKey }
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
        <div className="rg-lobby-field"><label>Kies een map</label>
          <div className="pb-map-pick">
            {[['dorp', 'Dorp', '/mapshot_dorp.png'], ['bos', 'Bos', '/mapshot_bos.png'], ['stad', 'Industrieterrein', '/mapshot_stad.png']].map(([k, lbl, img]) => (
              <button key={k} type="button" className={'pb-map-card' + (mapKey === k ? ' on' : '')} onClick={() => setMapKey(k)}>
                <img src={img} alt={lbl} />
                <span>{lbl}</span>
              </button>
            ))}
          </div></div>
        <button className="rg-lobby-btn rg-lobby-create" disabled={loading} onClick={() => connect(true)}>{loading ? '…' : '＋ Lobby aanmaken'}</button>
        <div className="rg-lobby-divider">of</div>
        <div className="rg-lobby-field"><label>Lobby-code</label>
          <input className="rg-input rg-input-code" placeholder="12345" value={code} maxLength={5} inputMode="numeric"
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && connect(false)} /></div>
        <button className="rg-lobby-btn rg-lobby-join" disabled={loading || !code.trim()} onClick={() => connect(false)}>{loading ? '…' : '→ Joinen'}</button>
        {loading && <p className="rg-lobby-sub">⏳ Verbinden… de server kan even wakker worden (~1 min de eerste keer).</p>}
        {error && <p className="rg-lobby-error">{error}</p>}
      </div>
    </div>
  )
}

function WaitingRoom({ code, players, room, onBack }) {
  const [botDiff, setBotDiff] = useState('normaal')
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
        <div className="rg-diff-row">
          {['makkelijk', 'normaal', 'moeilijk'].map(d => (
            <button key={d} className={'rg-diff-btn' + (botDiff === d ? ' on' : '')} onClick={() => setBotDiff(d)}>
              {d === 'makkelijk' ? '😊 Makkelijk' : d === 'normaal' ? '😐 Normaal' : '😈 Moeilijk'}
            </button>
          ))}
        </div>
        <div className="rg-bot-row">
          <button className="rg-bot-btn" onClick={() => room?.send('addBot', botDiff)}>🤖 Bot erbij</button>
          <button className="rg-bot-btn" onClick={() => room?.send('removeBot')}>➖ Bot eraf</button>
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
    const mapCfg = MAPS[roomStateRef.current?.map] || MAPS.dorp
    ARENA_X = mapCfg.ax; ARENA_Z = mapCfg.az
    const sc = initScene(canvasRef.current, {
      localSessionId: room.sessionId,
      getRoomState: () => roomStateRef.current,
      sendState: s => roomRef.current?.send('state', s),
      sendShoot: dir => roomRef.current?.send('shoot', dir),
      sendReload: () => roomRef.current?.send('reload'),
      sendObstacles: o => roomRef.current?.send('mapObstacles', o),
      onCrouchToggle: v => setCrouchOn(v),
      mapCfg,
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
      <OrientationGate />
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
