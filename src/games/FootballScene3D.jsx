import { useState, useEffect, useRef } from 'react'
import {
  Engine, Scene, FreeCamera,
  Color3, Color4, Vector3, Quaternion,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  MeshBuilder, StandardMaterial, DynamicTexture,
  DefaultRenderingPipeline,
  Mesh,
} from '@babylonjs/core'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'
import { SHIRT_COLORS } from '../data'
import './football3d.css'

// ── Shared bone list (same as Wardrobe.jsx) ────────────────────────
const RETARGET_BONES = new Set([
  'Root','Hips','Spine','Spine1','Neck','Head',
  'LeftShoulder','LeftArm','LeftForeArm','LeftHand',
  'RightShoulder','RightArm','RightForeArm','RightHand',
  'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase',
  'RightUpLeg','RightLeg','RightFoot','RightToeBase',
])

// ── Constants ──────────────────────────────────────────────────────
const BALL_RADIUS  = 0.22
const KICK_DIST    = 1.1
const FIELD_HALF   = 38
const GOAL_Z       = 35   // goals at the ends of the field
const GOAL_HALF_W  = 3.65
const GOAL_H       = 2.44
const GOAL_DEPTH   = 1.6

// ── Synthetic crowd cheer (Web Audio API) ──────────────────────────
function playCrowdCheer() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const sr = ctx.sampleRate, dur = 2.8
    const buf = ctx.createBuffer(2, sr * dur, sr)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < d.length; i++) {
        const t = i / sr
        d[i] = (Math.random() * 2 - 1) * 0.25
              + Math.sin(t * 2200) * 0.04
              + Math.sin(t * 1800 + ch * 0.5) * 0.03
              + Math.sin(t * 440) * 0.07
      }
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    const bp  = ctx.createBiquadFilter()
    bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 0.6
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(1, ctx.currentTime + 0.5)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    src.connect(bp); bp.connect(gain); gain.connect(ctx.destination)
    src.start(); src.stop(ctx.currentTime + dur)
  } catch {}
}

// ── Particle Pool ──────────────────────────────────────────────────
class ParticlePool {
  constructor(scene, max = 50) {
    this._scene = scene
    this._pool  = []
    const baseMat = new StandardMaterial('_pm', scene)
    baseMat.disableLighting = true
    for (let i = 0; i < max; i++) {
      const m = MeshBuilder.CreateBox('_p', { size: 0.22 }, scene)
      const mat = baseMat.clone('_pm' + i)
      m.material = mat
      m.isPickable = false
      m.setEnabled(false)
      this._pool.push({ mesh: m, vel: Vector3.Zero(), life: 0, maxLife: 1, active: false })
    }
  }

  burst(pos, count, hexColors) {
    let spawned = 0
    for (let i = 0; i < this._pool.length && spawned < count; i++) {
      const p = this._pool[i]
      if (p.active) continue
      p.active = true
      p.mesh.setEnabled(true)
      p.mesh.position.copyFrom(pos)
      const col = Color3.FromHexString(hexColors[spawned % hexColors.length])
      p.mesh.material.emissiveColor = col
      const ang = (spawned / count) * Math.PI * 2 + Math.random()
      const spd = 4 + Math.random() * 6
      p.vel = new Vector3(
        Math.cos(ang) * spd * 0.8,
        3.5 + Math.random() * 4,
        Math.sin(ang) * spd * 0.8
      )
      p.maxLife = 0.9 + Math.random() * 0.6
      p.life = p.maxLife
      spawned++
    }
  }

  update(dt) {
    for (const p of this._pool) {
      if (!p.active) continue
      p.life -= dt
      if (p.life <= 0) { p.active = false; p.mesh.setEnabled(false); continue }
      p.vel.y -= 13 * dt
      p.mesh.position.addInPlace(p.vel.scale(dt))
      p.mesh.material.alpha = Math.max(0, p.life / p.maxLife)
    }
  }

  dispose() { this._pool.forEach(p => p.mesh.dispose()) }
}

// ── CharacterController ────────────────────────────────────────────
class CharacterController {
  constructor(root, scene, anims, restPose) {
    this.root     = root
    this._anims   = anims
    this._rest    = restPose
    this.speed    = 4.8
    this.velocity = 0
    this.rotY     = 0
    this._state   = 'idle'
    this._keys    = {}
    this.joy      = { x: 0, z: 0 }   // set externally by joystick

    this._kd = e => { this._keys[e.code] = true;  this._onKeyDown(e.code) }
    this._ku = e => { this._keys[e.code] = false }
    window.addEventListener('keydown', this._kd)
    window.addEventListener('keyup',   this._ku)
  }

  _onKeyDown(code) {
    if (this._state === 'emote') return
    const map = { Digit1: 'hip_hop', Digit2: 'breakdance', Digit3: 'verloren',
                  Numpad1:'hip_hop', Numpad2:'breakdance',  Numpad3:'verloren' }
    if (map[code]) this._playEmote(map[code])
  }

  _playEmote(name) {
    if (!this._anims[name]) return
    this._stopAll()
    this._state   = 'emote'
    this.velocity = 0
    this._anims[name].play(false)
    this._anims[name].onAnimationGroupEndObservable.addOnce(() => {
      this._resetRest()
      this._state = 'idle'
    })
  }

  _stopAll() { Object.values(this._anims).forEach(g => g?.stop()) }

  _resetRest() {
    Object.values(this._rest).forEach(({ node, rot, pos }) => {
      if (node.rotationQuaternion) node.rotationQuaternion.copyFrom(rot)
      else node.rotationQuaternion = rot.clone()
      node.position.copyFrom(pos)
    })
  }

  update(dt) {
    if (this._state === 'emote') return
    const k = this._keys

    // World-space 4-directional movement — keyboard OR joystick
    // LEFT = -X, RIGHT = +X, UP = -Z (into field), DOWN = +Z
    const kx = k['ArrowLeft'] ? 1 : k['ArrowRight'] ? -1 : 0   // flipped: left=+X from camera view
    const kz = k['ArrowDown']  ? 1 : k['ArrowUp']   ? -1 : 0
    const jx = Math.abs(this.joy.x) > 0.12 ? -this.joy.x : 0  // joystick also flipped to match
    const jz = Math.abs(this.joy.z) > 0.12 ?  this.joy.z : 0
    const rawX = kx !== 0 ? kx : jx
    const rawZ = kz !== 0 ? kz : jz
    const vx = rawX * this.speed
    const vz = rawZ * this.speed * 0.9

    this.root.position.x = Math.max(-FIELD_HALF + 1, Math.min(FIELD_HALF - 1,
      this.root.position.x + vx * dt))
    this.root.position.z = Math.max(-FIELD_HALF + 1, Math.min(FIELD_HALF - 1,
      this.root.position.z + vz * dt))
    this.root.position.y = 0

    const spd = Math.hypot(vx, vz)

    // Character model rotates to face direction of movement
    if (spd > 0.05) {
      const targetRot = Math.atan2(vx, vz)   // atan2(x, z) gives correct Y-rotation
      let diff = targetRot - this.rotY
      while (diff >  Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      this.rotY += diff * Math.min(1, 14 * dt)
    }
    // +π offset because the GLB model's face points in +Z; we want it to face movement dir
    this.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(this.rotY + Math.PI, 0, 0)
    this.velocity = spd

    // Animation
    const blend = spd / this.speed
    if (blend > 0.08) {
      if (this._state !== 'walk') {
        this._resetRest()
        this._anims.lopen?.play(true)
        this._state = 'walk'
      }
      if (this._anims.lopen) this._anims.lopen.speedRatio = Math.max(0.3, blend * 1.6)
    } else {
      if (this._state === 'walk') {
        this._stopAll(); this._resetRest(); this._state = 'idle'
      }
    }
  }

  dispose() {
    window.removeEventListener('keydown', this._kd)
    window.removeEventListener('keyup',   this._ku)
  }
}

// ── PhysicsObject (ball) ───────────────────────────────────────────
class PhysicsObject {
  constructor(scene, shadowGen) {
    this.vel      = new Vector3(0, 0, 0)
    this.onGround = true
    this._prevZ   = 0

    // Mesh
    const ball = MeshBuilder.CreateSphere('ball', { diameter: BALL_RADIUS * 2, segments: 16 }, scene)
    ball.position.set(0, BALL_RADIUS, 0)
    ball.receiveShadows = true
    const mat = new StandardMaterial('ballMat', scene)
    this._addBallTexture(mat, scene)
    ball.material = mat
    if (shadowGen) shadowGen.addShadowCaster(ball)
    this.mesh = ball

    // Shadow disk stretches with sun angle (static sun from upper-left)
    const disc = MeshBuilder.CreateDisc('bShadow', { radius: BALL_RADIUS * 1.6, tessellation: 16 }, scene)
    disc.rotation.x = Math.PI / 2
    disc.isPickable = false
    const sm = new StandardMaterial('bShadMat', scene)
    sm.diffuseColor = Color3.Black()
    sm.alpha = 0.35
    disc.material = sm
    this._shadow = disc
  }

  _addBallTexture(mat, scene) {
    const sz  = 256
    const tex = new DynamicTexture('ballTex', { width: sz, height: sz }, scene)
    const ctx = tex.getContext()
    // White base
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, sz, sz)
    // Black pentagon patches
    ctx.fillStyle = '#111111'
    const r = sz * 0.15
    const drawHex = (cx, cy) => {
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
      }
      ctx.closePath(); ctx.fill()
    }
    drawHex(sz / 2, sz / 2)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      drawHex(sz / 2 + Math.cos(a) * r * 2.55, sz / 2 + Math.sin(a) * r * 2.55)
    }
    tex.update()
    mat.diffuseTexture = tex
    mat.specularPower  = 64
    mat.specularColor  = new Color3(0.2, 0.2, 0.2)
  }

  kick(dir, spd) {
    // dir should be a Vector3 with y = 0
    this.vel.x = dir.x * spd
    this.vel.z = dir.z * spd
    this.vel.y = Math.min(spd * 0.22, 2.8)
    this.onGround = false
  }

  reset() {
    this.vel.set(0, 0, 0)
    this.mesh.position.set(0, BALL_RADIUS, 0)
    this.mesh.rotationQuaternion = Quaternion.Identity()
    this.onGround = true
    this._prevZ = 0
  }

  update(dt) {
    this._prevZ = this.mesh.position.z

    // Gravity
    if (!this.onGround) this.vel.y -= 9.82 * dt

    this.mesh.position.addInPlace(this.vel.scale(dt))

    // Ground bounce
    if (this.mesh.position.y <= BALL_RADIUS) {
      this.mesh.position.y = BALL_RADIUS
      if (Math.abs(this.vel.y) > 0.6) {
        this.vel.y = -this.vel.y * 0.48
      } else {
        this.vel.y = 0; this.onGround = true
      }
    } else {
      this.onGround = false
    }

    // Friction (ground slows faster than air)
    const f = this.onGround ? Math.pow(0.982, dt * 60) : Math.pow(0.999, dt * 60)
    this.vel.x *= f; this.vel.z *= f

    // Field boundary
    const fx = FIELD_HALF - BALL_RADIUS
    if (Math.abs(this.mesh.position.x) > fx) {
      this.mesh.position.x = Math.sign(this.mesh.position.x) * fx
      this.vel.x *= -0.5
    }

    // Rolling rotation
    const hSpd = Math.sqrt(this.vel.x * this.vel.x + this.vel.z * this.vel.z)
    if (hSpd > 0.05) {
      const rollAng = (hSpd * dt) / BALL_RADIUS
      const axis    = new Vector3(this.vel.z, 0, -this.vel.x).normalize()
      const rot     = Quaternion.RotationAxis(axis, rollAng)
      if (!this.mesh.rotationQuaternion) this.mesh.rotationQuaternion = Quaternion.Identity()
      this.mesh.rotationQuaternion = rot.multiply(this.mesh.rotationQuaternion)
    }

    // Shadow disk: follows ball, stretches with height
    const h  = this.mesh.position.y - BALL_RADIUS
    this._shadow.position.x = this.mesh.position.x + h * 0.4  // sun from upper-left
    this._shadow.position.z = this.mesh.position.z
    this._shadow.position.y = 0.01
    this._shadow.scaling.x  = 1 + h * 0.12
    this._shadow.scaling.z  = (1 + h * 0.12) * 1.35
    this._shadow.material.alpha = Math.max(0.04, 0.35 - h * 0.06)
  }

  dispose() { this.mesh.dispose(); this._shadow.dispose() }
}

// ── Goal ───────────────────────────────────────────────────────────
class Goal {
  constructor(scene, posZ, openDir, particles, onScore) {
    this._scene    = scene
    this.posZ      = posZ
    this._openDir  = openDir  // +1 = opening faces +z, -1 = faces -z
    this._parts    = particles
    this._onScore  = onScore
    this.scored    = false
    this._nets     = []
    this._build()
  }

  _build() {
    const mat = new StandardMaterial('goalMat' + this.posZ, this._scene)
    mat.diffuseColor  = new Color3(1.0, 0.82, 0.0)   // bright yellow
    mat.emissiveColor = new Color3(0.25, 0.18, 0.0)
    mat.specularColor = new Color3(0.3, 0.25, 0.0)

    const post = (x, y, h, rx = 0, rz = 0) => {
      const m = MeshBuilder.CreateCylinder('gp', { height: h, diameter: 0.12, tessellation: 8 }, this._scene)
      m.material = mat; m.isPickable = false
      m.position.set(x, y, this.posZ)
      m.rotation.x = rx; m.rotation.z = rz
      return m
    }

    const bZ = this.posZ - this._openDir * GOAL_DEPTH  // back of goal

    // Uprights
    post(-GOAL_HALF_W, GOAL_H / 2, GOAL_H)
    post( GOAL_HALF_W, GOAL_H / 2, GOAL_H)
    // Crossbar
    const bar = post(0, GOAL_H, GOAL_HALF_W * 2, 0, Math.PI / 2)
    bar.position.z = this.posZ
    // Back uprights
    const bl = post(-GOAL_HALF_W, GOAL_H / 2, GOAL_H); bl.position.z = bZ
    const br = post( GOAL_HALF_W, GOAL_H / 2, GOAL_H); br.position.z = bZ
    // Top back bar
    const tb = post(0, GOAL_H, GOAL_HALF_W * 2, 0, Math.PI / 2); tb.position.z = bZ
    // Depth bars at top
    for (const sx of [-GOAL_HALF_W, GOAL_HALF_W]) {
      const db = MeshBuilder.CreateCylinder('db', { height: GOAL_DEPTH, diameter: 0.09, tessellation: 6 }, this._scene)
      db.material = mat; db.isPickable = false
      db.rotation.x = Math.PI / 2
      db.position.set(sx, GOAL_H, (this.posZ + bZ) / 2)
    }

    // Net planes (semi-transparent wireframe)
    const netColors = ['#dddddd']
    const mkNet = (w, h2, x, y, z, ry) => {
      const nm = MeshBuilder.CreatePlane('net', { width: w, height: h2 }, this._scene)
      nm.position.set(x, y, z); nm.rotation.y = ry
      nm.isPickable = false
      const nmat = new StandardMaterial('nmat' + Math.random(), this._scene)
      nmat.diffuseColor    = Color3.White()
      nmat.alpha           = 0.22
      nmat.wireframe       = true
      nmat.backFaceCulling = false
      nm.material = nmat
      this._nets.push(nm)
    }
    const midZ = (this.posZ + bZ) / 2
    mkNet(GOAL_HALF_W * 2, GOAL_H, 0, GOAL_H / 2, bZ, this._openDir < 0 ? Math.PI : 0)  // back
    mkNet(GOAL_DEPTH, GOAL_H, -GOAL_HALF_W, GOAL_H / 2, midZ,  Math.PI / 2)  // left
    mkNet(GOAL_DEPTH, GOAL_H,  GOAL_HALF_W, GOAL_H / 2, midZ, -Math.PI / 2)  // right
    mkNet(GOAL_HALF_W * 2, GOAL_DEPTH, 0, GOAL_H, midZ, 0)   // top (rotated)
    this._nets[3].rotation.x = -Math.PI / 2
  }

  checkScore(ball) {
    if (this.scored) return false
    const p = ball.mesh.position
    const inX = Math.abs(p.x) < GOAL_HALF_W - 0.05
    const inY = p.y > 0.05 && p.y < GOAL_H + 0.1
    // Ball crossed the goal line from the open side
    const prev = ball._prevZ
    const curr = p.z
    const line = this.posZ
    const crossed = this._openDir > 0
      ? prev < line && curr >= line
      : prev > line && curr <= line
    return inX && inY && crossed
  }

  flash() {
    this.scored = true
    this._nets.forEach(n => { n.material.emissiveColor = new Color3(1, 0.9, 0.1); n.material.alpha = 0.6 })
    this._parts.burst(
      new Vector3(0, GOAL_H / 2, this.posZ),
      40,
      ['#FFD700', '#FF6B35', '#FFFFFF', '#4FC3F7', '#06D6A0']
    )
    playCrowdCheer()
    this._onScore()
    setTimeout(() => {
      this._nets.forEach(n => { n.material.emissiveColor = Color3.Black(); n.material.alpha = 0.22 })
      this.scored = false
    }, 2200)
  }
}

// ── SceneBuilder ───────────────────────────────────────────────────
class SceneBuilder {
  static buildWorld(scene, shadowGen) {
    // Evening arena sky
    scene.clearColor = new Color4(0.04, 0.06, 0.14, 1)
    scene.fogMode    = Scene.FOGMODE_EXP2
    scene.fogColor   = new Color3(0.04, 0.06, 0.14)
    scene.fogDensity = 0.006

    // Soft ambient — dark ground, cool sky
    const ambient = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene)
    ambient.intensity   = 0.25
    ambient.groundColor = new Color3(0.02, 0.06, 0.02)
    ambient.diffuse     = new Color3(0.5, 0.6, 0.8)

    // Four stadium floodlights (one at each corner above stands)
    const lightPositions = [
      new Vector3(-FIELD_HALF - 8,  28,  FIELD_HALF + 8),
      new Vector3( FIELD_HALF + 8,  28,  FIELD_HALF + 8),
      new Vector3(-FIELD_HALF - 8,  28, -FIELD_HALF - 8),
      new Vector3( FIELD_HALF + 8,  28, -FIELD_HALF - 8),
    ]
    const lights = lightPositions.map((pos, i) => {
      const l = new DirectionalLight('fl' + i, new Vector3(0, 0, 0).subtract(pos).normalize(), scene)
      l.position  = pos
      l.intensity = 1.8
      l.diffuse   = new Color3(1.0, 0.97, 0.88)
      return l
    })

    // Main shadow from first light
    const sg = new ShadowGenerator(2048, lights[0])
    sg.usePoissonSampling = true
    sg.bias = 0.0003

    // Ground field
    const ground = MeshBuilder.CreateGround('ground',
      { width: FIELD_HALF * 2, height: FIELD_HALF * 2, subdivisions: 1 }, scene)
    ground.receiveShadows = true
    ground.isPickable = false
    const gmat = new StandardMaterial('gmat', scene)
    gmat.diffuseTexture = this._makeFieldTexture(scene)
    gmat.specularColor  = new Color3(0.05, 0.05, 0.05)
    ground.material = gmat

    this._buildStands(scene, sg)
    this._buildFloodlightPoles(scene, lightPositions)
    this._buildFence(scene)

    return { sun: lights[0], shadowGen: sg }
  }

  static _makeFieldTexture(scene) {
    const W = 1024, H = 1024
    const tex = new DynamicTexture('gt', { width: W, height: H }, scene)
    const ctx = tex.getContext()

    // Bright alternating green stripes
    const stripes = 12
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#3ecf3e' : '#33bb33'
      ctx.fillRect(0, i * (H / stripes), W, H / stripes)
    }

    // Bold white lines
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth   = 9
    ctx.lineJoin    = 'round'

    const pad = 28
    // Outer boundary
    ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2)

    // Halfway line (horizontal, field rotated 90° on ground)
    ctx.beginPath(); ctx.moveTo(pad, H / 2); ctx.lineTo(W - pad, H / 2); ctx.stroke()

    // Centre circle
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 110, 0, Math.PI * 2); ctx.stroke()

    // Centre spot
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 10, 0, Math.PI * 2); ctx.fill()

    // Penalty areas (top + bottom)
    const paW = W * 0.44, paH = H * 0.16
    ctx.strokeRect((W - paW) / 2, pad, paW, paH)
    ctx.strokeRect((W - paW) / 2, H - pad - paH, paW, paH)

    // Goal areas (small box)
    const gaW = W * 0.22, gaH = H * 0.07
    ctx.strokeRect((W - gaW) / 2, pad, gaW, gaH)
    ctx.strokeRect((W - gaW) / 2, H - pad - gaH, gaW, gaH)

    // Penalty spots
    ctx.beginPath(); ctx.arc(W / 2, pad + paH * 0.72, 10, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(W / 2, H - pad - paH * 0.72, 10, 0, Math.PI * 2); ctx.fill()

    // Corner arcs
    ctx.lineWidth = 7
    const cr = 42
    for (const [cx, cy, sa, ea] of [
      [pad, pad, 0, Math.PI / 2],
      [W - pad, pad, Math.PI / 2, Math.PI],
      [W - pad, H - pad, Math.PI, 3 * Math.PI / 2],
      [pad, H - pad, 3 * Math.PI / 2, Math.PI * 2],
    ]) {
      ctx.beginPath(); ctx.arc(cx, cy, cr, sa, ea); ctx.stroke()
    }

    tex.update()
    return tex
  }

  static _buildStands(scene, sg) {
    // Stepped concrete stands on all 4 sides
    const concreteMat = new StandardMaterial('conc', scene)
    concreteMat.diffuseColor  = new Color3(0.18, 0.18, 0.22)
    concreteMat.specularColor = Color3.Black()

    const seatMat = new StandardMaterial('seat', scene)
    seatMat.diffuseColor  = new Color3(0.08, 0.12, 0.28)
    seatMat.emissiveColor = new Color3(0.02, 0.04, 0.12)
    seatMat.specularColor = Color3.Black()

    const ROWS = 8, ROW_H = 1.4, ROW_D = 1.8, GAP = 4

    // Build one stand (along X axis, later rotated for sides)
    const buildSide = (offsetZ, rotY, len) => {
      for (let r = 0; r < ROWS; r++) {
        // Concrete step
        const step = MeshBuilder.CreateBox('st', {
          width: len, height: ROW_H, depth: ROW_D
        }, scene)
        step.isPickable = false
        step.material   = concreteMat
        const y = r * ROW_H + ROW_H / 2
        const d = GAP + r * ROW_D + ROW_D / 2
        step.position.set(0, y, offsetZ > 0 ? offsetZ + d : offsetZ - d)
        step.rotation.y = rotY

        // Seat row (thinner colored strip on top of step)
        const seat = MeshBuilder.CreateBox('seat', {
          width: len, height: 0.18, depth: ROW_D * 0.7
        }, scene)
        seat.isPickable = false
        seat.material   = seatMat
        seat.position.set(0, y + ROW_H / 2 + 0.09, offsetZ > 0 ? offsetZ + d : offsetZ - d)
        seat.rotation.y = rotY
      }
    }

    buildSide( FIELD_HALF, 0, FIELD_HALF * 2 + 4)   // +Z side
    buildSide(-FIELD_HALF, 0, FIELD_HALF * 2 + 4)   // -Z side

    // Side stands (perpendicular)
    for (let r = 0; r < ROWS; r++) {
      for (const sx of [1, -1]) {
        const step = MeshBuilder.CreateBox('stX', {
          width: ROW_D, height: ROW_H, depth: FIELD_HALF * 2 + 4
        }, scene)
        step.isPickable = false
        step.material   = concreteMat
        const y = r * ROW_H + ROW_H / 2
        const d = GAP + r * ROW_D + ROW_D / 2
        step.position.set(sx * (FIELD_HALF + d), y, 0)

        const seat = MeshBuilder.CreateBox('seatX', {
          width: ROW_D * 0.7, height: 0.18, depth: FIELD_HALF * 2 + 4
        }, scene)
        seat.isPickable = false
        seat.material   = seatMat
        seat.position.set(sx * (FIELD_HALF + d), y + ROW_H / 2 + 0.09, 0)
      }
    }
  }

  static _buildFloodlightPoles(scene, positions) {
    const poleMat = new StandardMaterial('pole', scene)
    poleMat.diffuseColor  = new Color3(0.7, 0.7, 0.75)
    poleMat.specularColor = new Color3(0.2, 0.2, 0.2)

    const lampMat = new StandardMaterial('lamp', scene)
    lampMat.diffuseColor  = new Color3(1, 0.97, 0.85)
    lampMat.emissiveColor = new Color3(1.0, 0.94, 0.70)

    positions.forEach(pos => {
      // Pole
      const pole = MeshBuilder.CreateCylinder('flp', {
        height: pos.y, diameterTop: 0.35, diameterBottom: 0.55, tessellation: 10
      }, scene)
      pole.position.set(pos.x, pos.y / 2, pos.z)
      pole.material   = poleMat
      pole.isPickable = false

      // Lamp head
      const head = MeshBuilder.CreateBox('flh', { width: 4, height: 0.6, depth: 1.5 }, scene)
      head.position.set(pos.x, pos.y + 0.3, pos.z)
      head.material   = lampMat
      head.isPickable = false
    })
  }

  static _buildFence(scene) {
    const fenceMat = new StandardMaterial('fence', scene)
    fenceMat.diffuseColor    = new Color3(0.12, 0.18, 0.10)
    fenceMat.specularColor   = Color3.Black()
    fenceMat.alpha           = 0.85
    fenceMat.backFaceCulling = false

    const H = 1.4, T = 0.12
    const sides = [
      { w: FIELD_HALF * 2 + T*2, d: T, x: 0,           z:  FIELD_HALF },
      { w: FIELD_HALF * 2 + T*2, d: T, x: 0,           z: -FIELD_HALF },
      { w: T, d: FIELD_HALF * 2, x:  FIELD_HALF,       z: 0 },
      { w: T, d: FIELD_HALF * 2, x: -FIELD_HALF,       z: 0 },
    ]
    sides.forEach(({ w, d, x, z }) => {
      const f = MeshBuilder.CreateBox('fence', { width: w, height: H, depth: d }, scene)
      f.position.set(x, H / 2, z)
      f.material   = fenceMat
      f.isPickable = false
    })
  }
}

// ── Main scene init ────────────────────────────────────────────────
function initScene(canvas, { shirtKey, wearing, joy, teamColor, onScoreA, onScoreB, onLoad }) {
  const engine = new Engine(canvas, true, { adaptToDeviceRatio: true, stencil: true })
  const scene  = new Scene(engine)

  // Camera — FreeCamera driven programmatically for smooth follow
  const camera = new FreeCamera('cam', new Vector3(0, 5, 20), scene)
  camera.inputs.clear()
  camera.minZ = 0.1
  camera.maxZ = 450

  // ── World ──────────────────────────────────────────────────────
  const { shadowGen } = SceneBuilder.buildWorld(scene, null)

  // ── Ball ───────────────────────────────────────────────────────
  const ball = new PhysicsObject(scene, shadowGen)

  // ── Particles ──────────────────────────────────────────────────
  const particles = new ParticlePool(scene, 50)

  // ── Goals ──────────────────────────────────────────────────────
  let scoreA = 0, scoreB = 0
  const goals = [
    new Goal(scene, -GOAL_Z,  1, particles, () => { scoreA++; onScoreA(scoreA) }),
    new Goal(scene,  GOAL_Z, -1, particles, () => { scoreB++; onScoreB(scoreB) }),
  ]

  // ── Post-processing ────────────────────────────────────────────
  try {
    const pipe = new DefaultRenderingPipeline('pipe', true, scene, [camera])
    pipe.bloomEnabled = true; pipe.bloomThreshold = 0.82; pipe.bloomWeight = 0.22
    pipe.bloomKernel  = 64;   pipe.bloomScale     = 0.5
    pipe.vignetteEnabled = true; pipe.vignetteWeight = 1.6
    pipe.imageProcessingEnabled = true
    pipe.imageProcessing.contrast = 1.08
    pipe.imageProcessing.exposure = 1.10
    pipe.sharpenEnabled = true; pipe.sharpen.edgeAmount = 0.2
  } catch {}

  // ── Camera follow state ────────────────────────────────────────
  const camPos    = new Vector3(0, 5, 20)
  const camLookAt = new Vector3(0, 1.5, 0)

  // ── Character ─────────────────────────────────────────────────
  let controller = null
  const nodeMap    = {}
  const dstRests   = {}
  const restPose   = {}
  const animGroups = {}

  // Pick model file based on current shirt
  let modelFile = 'Poppetje.glb'
  if (shirtKey === 'ajax') modelFile = 'poppetjemetajaxshirt.glb'
  if (shirtKey === 'psv')  modelFile = 'poppetjemetpsvshirt.glb'

  SceneLoader.ImportMesh('', '/', modelFile, scene, (meshes) => {
    const charRoot = meshes[0]
    charRoot.position.set(0, 0, 5)
    charRoot.rotationQuaternion = Quaternion.RotationYawPitchRoll(0, 0, 0)

    // Shadows
    meshes.forEach(m => { shadowGen.addShadowCaster(m); m.receiveShadows = true })

    const CLOTHING_NAMES = new Set(['Shirt', 'Broek', 'Sokken', 'Schoenen'])

    // Apply clothing colors (from wardrobe)
    if (modelFile === 'Poppetje.glb') {
      meshes.forEach(m => {
        if (!CLOTHING_NAMES.has(m.name)) return
        const itemKey = m.name.toLowerCase()
        const colorKey = itemKey === 'shirt' ? shirtKey : wearing?.[itemKey]
        if (!colorKey) { m.setEnabled(false); return }
        const col = SHIRT_COLORS.find(c => c.key === colorKey)
        if (col) {
          m.setEnabled(true)
          const c3 = Color3.FromHexString(col.hex)
          const applyCol = mesh => {
            if (!mesh.material) return
            const mat = mesh.material.clone(mesh.material.name + '_c')
            mesh.material = mat
            if (mat.albedoColor !== undefined) { mat.albedoTexture = null; mat.albedoColor = c3 }
            else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = null; mat.diffuseColor = c3 }
          }
          applyCol(m); m.getChildMeshes?.(false)?.forEach(applyCol)
        } else { m.setEnabled(false) }
      })

      // Apply team skin color to all non-clothing meshes
      if (teamColor) {
        const tc = Color3.FromHexString(teamColor)
        meshes.forEach(m => {
          if (CLOTHING_NAMES.has(m.name) || !m.material) return
          const mat = m.material.clone(m.material.name + '_team')
          m.material = mat
          if (mat.albedoColor !== undefined) { mat.albedoTexture = null; mat.albedoColor = tc }
          else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = null; mat.diffuseColor = tc }
        })
      }
    }

    // Build node map + capture T-pose rest rotations
    scene.transformNodes.forEach(n => {
      nodeMap[n.name] = n
      if (!RETARGET_BONES.has(n.name)) return
      dstRests[n.name]  = n.rotationQuaternion ? n.rotationQuaternion.clone() : Quaternion.Identity()
      restPose[n.name]  = {
        node: n,
        rot:  n.rotationQuaternion ? n.rotationQuaternion.clone() : Quaternion.Identity(),
        pos:  n.position.clone(),
      }
    })
    scene.meshes.forEach(m => { if (!nodeMap[m.name]) nodeMap[m.name] = m })

    // ── Load animations ──────────────────────────────────────────
    const ANIMS = [
      { key: 'lopen',      file: 'emote_lopen.glb',      stripRoot: true  },
      { key: 'hip_hop',    file: 'hip_hop_dancing.glb',   stripRoot: false },
      { key: 'breakdance', file: 'emote_breakdance.glb',  stripRoot: false },
      { key: 'verloren',   file: 'emote_verloren.glb',    stripRoot: false },
    ]
    let pending = ANIMS.length

    const done = () => {
      if (--pending > 0) return
      controller = new CharacterController(charRoot, scene, animGroups, restPose)
      if (joy) controller.joy = joy
      onLoad()
    }

    ANIMS.forEach(({ key, file, stripRoot }) => {
      SceneLoader.ImportMesh('', '/', file, scene, (aM, _p, _s, aG) => {
        aM.forEach(m => m.setEnabled(false))
        if (!aG.length) { done(); return }
        const orig = aG[0]

        const srcRests = {}
        orig.targetedAnimations.forEach(ta => {
          const n = ta.target
          srcRests[n.name] = n.rotationQuaternion ? n.rotationQuaternion.clone() : Quaternion.Identity()
        })

        const retargeted = orig.clone(key, t =>
          RETARGET_BONES.has(t.name) ? (nodeMap[t.name] ?? t) : t
        )

        const tas = retargeted.targetedAnimations
        for (let i = tas.length - 1; i >= 0; i--) {
          const { animation: anim, target } = tas[i]
          const prop = anim.targetProperty
          const name = target.name
          if (prop === 'scaling' || prop === 'scale') { tas.splice(i, 1); continue }
          if (prop === 'position') {
            if (stripRoot || name !== 'Root') { tas.splice(i, 1); continue }
            continue
          }
          if (!RETARGET_BONES.has(name)) { tas.splice(i, 1); continue }
          // Rest-pose correction: inv(dstRest) * srcRest * keyframe
          const src = srcRests[name] ?? Quaternion.Identity()
          const dst = dstRests[name] ?? Quaternion.Identity()
          const corr = Quaternion.Inverse(dst).multiply(src)
          anim.getKeys().forEach(kf => kf.value.copyFrom(corr.multiply(kf.value)))
        }

        retargeted.stop()
        animGroups[key] = retargeted
        orig.dispose()
        done()
      }, null, () => done())
    })
  }, null, (_, msg, err) => { console.error('Model load error:', msg, err); onLoad() })

  // ── Game loop ──────────────────────────────────────────────────
  scene.registerBeforeRender(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05)

    controller?.update(dt)
    ball.update(dt)
    particles.update(dt)

    // Ball ↔ character collision
    if (controller) {
      const cp  = controller.root.position
      const bp  = ball.mesh.position
      const dx  = bp.x - cp.x, dz = bp.z - cp.z
      const d2  = dx * dx + dz * dz
      if (d2 < KICK_DIST * KICK_DIST && d2 > 0.001) {
        const spd = Math.abs(controller.velocity)
        const d   = Math.sqrt(d2)
        const fwd = new Vector3(Math.sin(controller.rotY), 0, Math.cos(controller.rotY))
        const toB = new Vector3(dx / d, 0, dz / d)
        if (spd > 0.3) {
          const kickDir = Vector3.Lerp(fwd, toB, 0.35).normalize()
          ball.kick(kickDir, spd * 7 + 4)
        } else {
          ball.kick(toB, 2)
        }
      }
    }

    // Goal scoring
    goals.forEach(goal => {
      if (!goal.scored && goal.checkScore(ball)) {
        goal.flash()
        setTimeout(() => ball.reset(), 2300)
      }
    })

    // Camera: fixed offset behind character (+Z) — follows position, never rotates
    if (controller) {
      const cp  = controller.root.position
      const Lp  = 1 - Math.exp(-dt * 9)
      const Ll  = 1 - Math.exp(-dt * 14)

      camPos.x += (cp.x      - camPos.x) * Lp
      camPos.y += (cp.y + 6  - camPos.y) * Lp
      camPos.z += (cp.z + 11 - camPos.z) * Lp

      camLookAt.x += (cp.x       - camLookAt.x) * Ll
      camLookAt.y += (cp.y + 1.2 - camLookAt.y) * Ll
      camLookAt.z += (cp.z       - camLookAt.z) * Ll

      camera.position.copyFrom(camPos)
      camera.setTarget(camLookAt)
    }
  })

  engine.runRenderLoop(() => scene.render())
  const onResize = () => engine.resize()
  window.addEventListener('resize', onResize)

  // Return cleanup
  return () => {
    controller?.dispose()
    ball.dispose()
    particles.dispose()
    window.removeEventListener('resize', onResize)
    engine.stopRenderLoop()
    scene.dispose()
    engine.dispose()
  }
}

// ── React component ────────────────────────────────────────────────
// ── Virtual joystick (touch + mouse) ───────────────────────────────
function VirtualJoystick({ joyRef }) {
  const baseRef   = useRef(null)
  const knobRef   = useRef(null)
  const activeRef = useRef(false)
  const RADIUS    = 52

  const applyOffset = (dx, dy) => {
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) { dx = dx / len * RADIUS; dy = dy / len * RADIUS }
    joyRef.current.x = dx / RADIUS
    joyRef.current.z = dy / RADIUS
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px,${dy}px)`
  }
  const release = () => {
    activeRef.current = false
    joyRef.current.x = 0; joyRef.current.z = 0
    if (knobRef.current) knobRef.current.style.transform = 'translate(0,0)'
  }
  const getCenter = () => {
    const r = baseRef.current.getBoundingClientRect()
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 }
  }

  // Touch
  const onTouchStart = e => { e.preventDefault(); activeRef.current = true; const t = e.targetTouches[0]; const {cx,cy} = getCenter(); applyOffset(t.clientX-cx, t.clientY-cy) }
  const onTouchMove  = e => { e.preventDefault(); if (!activeRef.current) return; const t = e.targetTouches[0]; const {cx,cy} = getCenter(); applyOffset(t.clientX-cx, t.clientY-cy) }
  const onTouchEnd   = () => release()

  // Mouse
  useEffect(() => {
    const onMove = e => { if (!activeRef.current) return; const {cx,cy} = getCenter(); applyOffset(e.clientX-cx, e.clientY-cy) }
    const onUp   = () => { if (activeRef.current) release() }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const onMouseDown = e => { activeRef.current = true; const {cx,cy} = getCenter(); applyOffset(e.clientX-cx, e.clientY-cy) }

  return (
    <div ref={baseRef} className="fb3d-joy-base"
      onTouchStart={onTouchStart} onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
      onMouseDown={onMouseDown}
    >
      <div ref={knobRef} className="fb3d-joy-knob" />
    </div>
  )
}

// ── Team selection screen ───────────────────────────────────────────
function TeamSelect({ onSelect }) {
  return (
    <div className="fb3d-teamselect">
      <h2 className="fb3d-ts-title">Kies je team</h2>
      <div className="fb3d-ts-teams">
        <button className="fb3d-ts-btn fb3d-ts-red" onClick={() => onSelect('#cc2222')}>
          <div className="fb3d-ts-swatch" style={{ background: '#cc2222' }} />
          <span>Rood Team</span>
        </button>
        <button className="fb3d-ts-btn fb3d-ts-blue" onClick={() => onSelect('#1a55cc')}>
          <div className="fb3d-ts-swatch" style={{ background: '#1a55cc' }} />
          <span>Blauw Team</span>
        </button>
      </div>
    </div>
  )
}

export default function FootballScene3D({ onBack }) {
  const canvasRef   = useRef(null)
  const joyRef      = useRef({ x: 0, z: 0 })
  const [team,      setTeam]      = useState(null)   // null = not chosen yet
  const [scoreA,    setScoreA]    = useState(0)
  const [scoreB,    setScoreB]    = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [showHint,  setShowHint]  = useState(true)

  useEffect(() => {
    if (!team) return
    const t = setTimeout(() => setShowHint(false), 6000)
    return () => clearTimeout(t)
  }, [team])

  useEffect(() => {
    if (!team) return
    const canvas = canvasRef.current
    if (!canvas) return

    const shirt   = (() => { try { return localStorage.getItem('kk_shirt') }       catch { return null } })()
    const wearing = (() => { try { return JSON.parse(localStorage.getItem('kk_wearing') || '{}') } catch { return {} } })()

    const cleanup = initScene(canvas, {
      shirtKey:   shirt,
      wearing,
      joy:        joyRef.current,
      teamColor:  team,
      onScoreA:   v => setScoreA(v),
      onScoreB:   v => setScoreB(v),
      onLoad:     () => setLoading(false),
    })
    return cleanup
  }, [team])

  if (!team) return (
    <div className="fb3d-outer">
      <button className="fb3d-back" onClick={onBack}>← Kledingkast</button>
      <TeamSelect onSelect={setTeam} />
    </div>
  )

  return (
    <div className="fb3d-outer">
      <canvas ref={canvasRef} className="fb3d-canvas" />

      <button className="fb3d-back" onClick={onBack}>← Kledingkast</button>

      <div className="fb3d-score">
        <span className="fb3d-score-a">🥅 {scoreA}</span>
        <span className="fb3d-score-sep"> — </span>
        <span className="fb3d-score-b">{scoreB} 🥅</span>
      </div>

      {/* Joystick — only visible on touch devices */}
      <VirtualJoystick joyRef={joyRef} />

      <div className={`fb3d-hint ${showHint ? 'fb3d-hint-show' : ''}`}>
        <div className="fb3d-hint-row"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Bewegen</div>
        <div className="fb3d-hint-row"><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> Emotes</div>
      </div>

      {loading && (
        <div className="fb3d-loading">
          <div className="fb3d-spinner" />
          <span>Veld laden…</span>
        </div>
      )}
    </div>
  )
}
