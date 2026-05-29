import { useState, useEffect, useRef } from 'react'
import {
  Engine, Scene, FreeCamera,
  Color3, Color4, Vector3, Quaternion,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  MeshBuilder, StandardMaterial, DynamicTexture, Texture,
  DefaultRenderingPipeline,
  Mesh,
} from '@babylonjs/core'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'
import { SHIRT_COLORS } from '../data'
import './football3d.css'

// ── Remap shirt bone indices so they match Poppetje's skeleton ──────
// GLB skeletons share bone names but can have different bone order.
// Simply swapping mesh.skeleton leaves stale indices → broken deform.
// This function rewrites the matricesIndices vertex buffer then attaches.
function remapAndAttach(mesh, srcSkel, dstSkel) {
  const dstMap = {}
  dstSkel.bones.forEach((b, i) => { dstMap[b.name] = i })
  const remap = srcSkel.bones.map(b => dstMap[b.name] ?? 0)
  ;['matricesIndices', 'matricesIndicesExtra'].forEach(kind => {
    const data = mesh.getVerticesData(kind)
    if (!data) return
    const out = new Float32Array(data.length)
    for (let i = 0; i < data.length; i++) {
      const idx = Math.round(data[i])
      out[i] = (idx >= 0 && idx < remap.length) ? remap[idx] : 0
    }
    mesh.updateVerticesData(kind, out)
  })
  mesh.skeleton = dstSkel
}

// ── Shared bone list ───────────────────────────────────────────────
const RETARGET_BONES = new Set([
  'Root','Hips','Spine','Spine1','Neck','Head',
  'LeftShoulder','LeftArm','LeftForeArm','LeftHand',
  'RightShoulder','RightArm','RightForeArm','RightHand',
  'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase',
  'RightUpLeg','RightLeg','RightFoot','RightToeBase',
])

// ── Constants ──────────────────────────────────────────────────────
const BALL_RADIUS    = 0.22
const KICK_DIST      = 1.1
const FIELD_HALF     = 38
const GOAL_Z         = 36   // aligns with outer white line on field texture
const GOAL_HALF_W    = 3.65
const GOAL_H         = 2.44
const GOAL_DEPTH     = 1.6
const GAME_DURATION  = 120   // seconds

const CLOTHING_NAMES = new Set(['Shirt', 'Broek', 'Sokken', 'Schoenen'])
// Face features that must always be rendered black
const FACE_MESH_NAMES = new Set([
  'Gezicht', 'Face',
  'Ogen', 'Eyes',
  'Wenkbrauwen', 'Eyebrows',
  'Mond', 'Mouth',
  'Neus', 'Nose',
])

// ── Crowd cheer ────────────────────────────────────────────────────
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
    this.joy      = { x: 0, z: 0 }
    this.paused   = false

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
      this._playRest()
    })
  }

  _playRest() {
    this._stopAll()
    this._resetRest()
    const rg = this._anims.rust
    if (rg) rg.play(true)   // loop rust.glb
    this._state = 'idle'
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
    if (this._state === 'emote' || this.paused) return
    const k = this._keys

    const kx = k['ArrowLeft'] ? 1 : k['ArrowRight'] ? -1 : 0
    const kz = k['ArrowDown']  ? 1 : k['ArrowUp']   ? -1 : 0
    const jx = Math.abs(this.joy.x) > 0.12 ? -this.joy.x : 0
    const jz = Math.abs(this.joy.z) > 0.12 ?  this.joy.z : 0
    const rawX = kx !== 0 ? kx : jx
    const rawZ = kz !== 0 ? kz : jz
    const vx = rawX * this.speed
    const vz = rawZ * this.speed

    this.root.position.x = Math.max(-FIELD_HALF + 1, Math.min(FIELD_HALF - 1,
      this.root.position.x + vx * dt))
    this.root.position.z = Math.max(-FIELD_HALF + 1, Math.min(FIELD_HALF - 1,
      this.root.position.z + vz * dt))
    this.root.position.y = 0

    const spd = Math.hypot(vx, vz)

    if (spd > 0.05) {
      const targetRot = Math.atan2(vx, vz)
      let diff = targetRot - this.rotY
      while (diff >  Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      this.rotY += diff * Math.min(1, 14 * dt)
    }
    this.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(this.rotY + Math.PI, 0, 0)
    this.velocity = spd

    const blend = spd / this.speed
    if (blend > 0.08) {
      if (this._state !== 'walk') {
        this._stopAll()
        this._resetRest()
        this._anims.lopen?.play(true)
        this._state = 'walk'
      }
      if (this._anims.lopen) this._anims.lopen.speedRatio = Math.max(0.3, blend * 1.6)
    } else {
      if (this._state === 'walk') {
        this._playRest()
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

    const ball = MeshBuilder.CreateSphere('ball', { diameter: BALL_RADIUS * 2, segments: 16 }, scene)
    ball.position.set(0, BALL_RADIUS, 0)
    ball.receiveShadows = true
    const mat = new StandardMaterial('ballMat', scene)
    this._addBallTexture(mat, scene)
    ball.material = mat
    if (shadowGen) shadowGen.addShadowCaster(ball)
    this.mesh = ball

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
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, sz, sz)
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

    if (!this.onGround) this.vel.y -= 9.82 * dt

    this.mesh.position.addInPlace(this.vel.scale(dt))

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

    // Higher friction — ball slows down quickly on the ground
    const f = this.onGround ? Math.pow(0.91, dt * 60) : Math.pow(0.999, dt * 60)
    this.vel.x *= f; this.vel.z *= f

    const fx = FIELD_HALF - BALL_RADIUS
    if (Math.abs(this.mesh.position.x) > fx) {
      this.mesh.position.x = Math.sign(this.mesh.position.x) * fx
      this.vel.x *= -0.5
    }

    // Z walls — ball bounces off back fence and goal back-net
    const fz = FIELD_HALF - BALL_RADIUS
    if (Math.abs(this.mesh.position.z) > fz) {
      this.mesh.position.z = Math.sign(this.mesh.position.z) * fz
      this.vel.z *= -0.5
    }

    const hSpd = Math.sqrt(this.vel.x * this.vel.x + this.vel.z * this.vel.z)
    if (hSpd > 0.05) {
      const rollAng = (hSpd * dt) / BALL_RADIUS
      const axis    = new Vector3(this.vel.z, 0, -this.vel.x).normalize()
      const rot     = Quaternion.RotationAxis(axis, rollAng)
      if (!this.mesh.rotationQuaternion) this.mesh.rotationQuaternion = Quaternion.Identity()
      this.mesh.rotationQuaternion = rot.multiply(this.mesh.rotationQuaternion)
    }

    const h  = this.mesh.position.y - BALL_RADIUS
    this._shadow.position.x = this.mesh.position.x + h * 0.4
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
    this._openDir  = openDir
    this._parts    = particles
    this._onScore  = onScore
    this.scored    = false
    this._nets     = []
    this._build()
  }

  _makeNetTexture() {
    const sz  = 512
    const tex = new DynamicTexture('netTex' + this.posZ, { width: sz, height: sz }, this._scene)
    tex.hasAlpha = true
    const ctx = tex.getContext()
    ctx.clearRect(0, 0, sz, sz)
    ctx.strokeStyle = 'rgba(255,255,255,0.88)'
    ctx.lineWidth   = 3
    const sp = 22   // grid cell size in px
    for (let x = 0; x <= sz; x += sp) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, sz); ctx.stroke()
    }
    for (let y = 0; y <= sz; y += sp) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(sz, y); ctx.stroke()
    }
    tex.update()
    return tex
  }

  _build() {
    // White post material
    const postMat = new StandardMaterial('goalPost' + this.posZ, this._scene)
    postMat.diffuseColor  = Color3.White()
    postMat.emissiveColor = new Color3(0.14, 0.14, 0.14)
    postMat.specularColor = new Color3(0.6, 0.6, 0.6)
    postMat.specularPower = 48

    const bZ  = this.posZ - this._openDir * GOAL_DEPTH
    const midZ = (this.posZ + bZ) / 2

    const cyl = (x, y, z, h, d, rx = 0, rz = 0) => {
      const m = MeshBuilder.CreateCylinder('gp', { height: h, diameter: d, tessellation: 14 }, this._scene)
      m.material = postMat; m.isPickable = false
      m.position.set(x, y, z)
      m.rotation.x = rx; m.rotation.z = rz
      return m
    }

    // ── Front frame only: 2 uprights + crossbar ────────────────────
    cyl(-GOAL_HALF_W, GOAL_H / 2, this.posZ, GOAL_H,            0.14)
    cyl( GOAL_HALF_W, GOAL_H / 2, this.posZ, GOAL_H,            0.14)
    cyl(0,            GOAL_H,     this.posZ, GOAL_HALF_W * 2 + 0.14, 0.12, 0, Math.PI / 2)

    // ── Top rails running from post tops to back ────────────────────
    cyl(-GOAL_HALF_W, GOAL_H, midZ, GOAL_DEPTH, 0.08, Math.PI / 2)
    cyl( GOAL_HALF_W, GOAL_H, midZ, GOAL_DEPTH, 0.08, Math.PI / 2)

    // ── Net panels with grid texture ───────────────────────────────
    const netTex = this._makeNetTexture()

    const mkNet = (w, h2, x, y, z, ry, rx = 0) => {
      const nm = MeshBuilder.CreatePlane('net', { width: w, height: h2 }, this._scene)
      nm.position.set(x, y, z)
      nm.rotation.y = ry
      nm.rotation.x = rx
      nm.isPickable = false
      const nmat = new StandardMaterial('nmat' + Math.random(), this._scene)
      nmat.diffuseTexture = netTex
      nmat.diffuseTexture.hasAlpha = true
      nmat.useAlphaFromDiffuseTexture = true
      nmat.backFaceCulling = false
      nmat.specularColor   = Color3.Black()
      nm.material = nmat
      this._nets.push(nm)
    }

    // Back net
    mkNet(GOAL_HALF_W * 2, GOAL_H, 0, GOAL_H / 2, bZ, this._openDir < 0 ? Math.PI : 0)
    // Left side net
    mkNet(GOAL_DEPTH, GOAL_H, -GOAL_HALF_W, GOAL_H / 2, midZ,  Math.PI / 2)
    // Right side net
    mkNet(GOAL_DEPTH, GOAL_H,  GOAL_HALF_W, GOAL_H / 2, midZ, -Math.PI / 2)
    // Top net (horizontal)
    mkNet(GOAL_HALF_W * 2, GOAL_DEPTH, 0, GOAL_H, midZ, 0, -Math.PI / 2)
  }

  checkScore(ball) {
    if (this.scored) return false
    const p = ball.mesh.position
    const inX = Math.abs(p.x) < GOAL_HALF_W - 0.05
    const inY = p.y > 0.05 && p.y < GOAL_H + 0.1
    const prev = ball._prevZ
    const curr = p.z
    const line = this.posZ
    // openDir=+1 → goal at -Z end, ball enters from +Z (prev > line, curr <= line)
    // openDir=-1 → goal at +Z end, ball enters from -Z (prev < line, curr >= line)
    const crossed = this._openDir > 0
      ? prev > line && curr <= line
      : prev < line && curr >= line
    return inX && inY && crossed
  }

  flash() {
    this.scored = true
    this._nets.forEach(n => {
      if (n.material) n.material.emissiveColor = new Color3(1, 0.85, 0.1)
    })
    this._parts.burst(
      new Vector3(0, GOAL_H / 2, this.posZ),
      40,
      ['#FFD700', '#FF6B35', '#FFFFFF', '#4FC3F7', '#06D6A0']
    )
    playCrowdCheer()
    this._onScore()
    setTimeout(() => {
      this._nets.forEach(n => {
        if (n.material) n.material.emissiveColor = Color3.Black()
      })
      this.scored = false
    }, 2200)
  }
}

// ── SceneBuilder ───────────────────────────────────────────────────
class SceneBuilder {
  static buildWorld(scene, shadowGen) {
    // Bright stadium afternoon sky
    scene.clearColor = new Color4(0.42, 0.65, 0.92, 1)
    scene.fogMode    = Scene.FOGMODE_EXP2
    scene.fogColor   = new Color3(0.42, 0.65, 0.92)
    scene.fogDensity = 0.004

    const ambient = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene)
    ambient.intensity   = 0.55
    ambient.groundColor = new Color3(0.12, 0.20, 0.08)
    ambient.diffuse     = new Color3(0.75, 0.82, 1.0)

    const lightPositions = [
      new Vector3(-FIELD_HALF - 8,  32,  FIELD_HALF + 8),
      new Vector3( FIELD_HALF + 8,  32,  FIELD_HALF + 8),
      new Vector3(-FIELD_HALF - 8,  32, -FIELD_HALF - 8),
      new Vector3( FIELD_HALF + 8,  32, -FIELD_HALF - 8),
    ]
    const lights = lightPositions.map((pos, i) => {
      const l = new DirectionalLight('fl' + i, new Vector3(0, 0, 0).subtract(pos).normalize(), scene)
      l.position  = pos
      l.intensity = 2.2
      l.diffuse   = new Color3(1.0, 0.98, 0.90)
      return l
    })

    const sg = new ShadowGenerator(2048, lights[0])
    sg.usePoissonSampling = true
    sg.bias = 0.0003

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

    const stripes = 14
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#28c428' : '#22b022'
      ctx.fillRect(0, i * (H / stripes), W, H / stripes)
    }
    // Add a slight noise/texture overlay for a real grass feel
    ctx.globalAlpha = 0.06
    for (let y2 = 0; y2 < H; y2 += 4) {
      for (let x2 = 0; x2 < W; x2 += 4) {
        if (Math.random() > 0.5) {
          ctx.fillStyle = '#000000'
          ctx.fillRect(x2, y2, 2, 2)
        }
      }
    }
    ctx.globalAlpha = 1.0

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth   = 9
    ctx.lineJoin    = 'round'
    const pad = 28
    ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2)
    ctx.beginPath(); ctx.moveTo(pad, H / 2); ctx.lineTo(W - pad, H / 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 110, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 10, 0, Math.PI * 2); ctx.fill()
    const paW = W * 0.44, paH = H * 0.16
    ctx.strokeRect((W - paW) / 2, pad, paW, paH)
    ctx.strokeRect((W - paW) / 2, H - pad - paH, paW, paH)
    const gaW = W * 0.22, gaH = H * 0.07
    ctx.strokeRect((W - gaW) / 2, pad, gaW, gaH)
    ctx.strokeRect((W - gaW) / 2, H - pad - gaH, gaW, gaH)
    ctx.beginPath(); ctx.arc(W / 2, pad + paH * 0.72, 10, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(W / 2, H - pad - paH * 0.72, 10, 0, Math.PI * 2); ctx.fill()
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
    const concreteMat = new StandardMaterial('conc', scene)
    concreteMat.diffuseColor  = new Color3(0.24, 0.24, 0.28)
    concreteMat.specularColor = Color3.Black()

    // Crowd colours — vivid mix to simulate filled stadium
    const CROWD_COLS = [
      new Color3(0.85, 0.10, 0.10),  // red
      new Color3(0.95, 0.55, 0.05),  // orange
      new Color3(0.10, 0.30, 0.85),  // blue
      new Color3(0.95, 0.92, 0.20),  // yellow
      new Color3(0.20, 0.70, 0.25),  // green
      new Color3(0.92, 0.92, 0.92),  // white
    ]
    const getCrowdMat = (r, offset = 0) => {
      const mat = new StandardMaterial('crowd_' + Math.random(), scene)
      mat.diffuseColor  = CROWD_COLS[(r * 3 + offset) % CROWD_COLS.length]
      mat.emissiveColor = mat.diffuseColor.scale(0.18)
      mat.specularColor = Color3.Black()
      return mat
    }

    const ROWS = 10, ROW_H = 1.4, ROW_D = 1.8, GAP = 4

    const buildSide = (offsetZ, rotY, len) => {
      for (let r = 0; r < ROWS; r++) {
        const step = MeshBuilder.CreateBox('st', { width: len, height: ROW_H, depth: ROW_D }, scene)
        step.isPickable = false; step.material = concreteMat
        const y = r * ROW_H + ROW_H / 2
        const d = GAP + r * ROW_D + ROW_D / 2
        step.position.set(0, y, offsetZ > 0 ? offsetZ + d : offsetZ - d)
        step.rotation.y = rotY
        const seat = MeshBuilder.CreateBox('seat', { width: len, height: 0.22, depth: ROW_D * 0.7 }, scene)
        seat.isPickable = false; seat.material = getCrowdMat(r, offsetZ > 0 ? 0 : 1)
        seat.position.set(0, y + ROW_H / 2 + 0.11, offsetZ > 0 ? offsetZ + d : offsetZ - d)
        seat.rotation.y = rotY
      }
    }

    buildSide( FIELD_HALF, 0, FIELD_HALF * 2 + 4)
    buildSide(-FIELD_HALF, 0, FIELD_HALF * 2 + 4)

    for (let r = 0; r < ROWS; r++) {
      for (const [sx, offset] of [[1, 2], [-1, 4]]) {
        const step = MeshBuilder.CreateBox('stX', { width: ROW_D, height: ROW_H, depth: FIELD_HALF * 2 + 4 }, scene)
        step.isPickable = false; step.material = concreteMat
        const y = r * ROW_H + ROW_H / 2
        const d = GAP + r * ROW_D + ROW_D / 2
        step.position.set(sx * (FIELD_HALF + d), y, 0)
        const seat = MeshBuilder.CreateBox('seatX', { width: ROW_D * 0.7, height: 0.22, depth: FIELD_HALF * 2 + 4 }, scene)
        seat.isPickable = false; seat.material = getCrowdMat(r, offset)
        seat.position.set(sx * (FIELD_HALF + d), y + ROW_H / 2 + 0.11, 0)
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
      const pole = MeshBuilder.CreateCylinder('flp', { height: pos.y, diameterTop: 0.35, diameterBottom: 0.55, tessellation: 10 }, scene)
      pole.position.set(pos.x, pos.y / 2, pos.z)
      pole.material = poleMat; pole.isPickable = false
      const head = MeshBuilder.CreateBox('flh', { width: 4, height: 0.6, depth: 1.5 }, scene)
      head.position.set(pos.x, pos.y + 0.3, pos.z)
      head.material = lampMat; head.isPickable = false
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
      f.material = fenceMat; f.isPickable = false
    })
  }
}

// ── Helpers ────────────────────────────────────────────────────────
function fmtTime(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s) % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ── Main scene init ────────────────────────────────────────────────
function initScene(canvas, {
  shirtKey, wearing, joy, teamColor,
  onScoreA, onScoreB, onLoad, onGoal, onGameOver,
  followBallRef, timerDomRef,
}) {
  const engine = new Engine(canvas, true, { adaptToDeviceRatio: true, stencil: true })
  const scene  = new Scene(engine)

  const camera = new FreeCamera('cam', new Vector3(0, 5, 20), scene)
  camera.inputs.clear()
  camera.minZ = 0.1
  camera.maxZ = 450

  const { shadowGen } = SceneBuilder.buildWorld(scene, null)
  const ball           = new PhysicsObject(scene, shadowGen)
  const particles      = new ParticlePool(scene, 50)

  let scoreA = 0, scoreB = 0
  let goalPaused  = false
  let gameActive  = true
  let timeLeft    = GAME_DURATION

  const goals = [
    new Goal(scene, -GOAL_Z,  1, particles, () => { scoreA++; onScoreA(scoreA) }),
    new Goal(scene,  GOAL_Z, -1, particles, () => { scoreB++; onScoreB(scoreB) }),
  ]

  try {
    const pipe = new DefaultRenderingPipeline('pipe', true, scene, [camera])
    pipe.bloomEnabled = true; pipe.bloomThreshold = 0.75; pipe.bloomWeight = 0.35
    pipe.bloomKernel  = 96;   pipe.bloomScale     = 0.6
    pipe.vignetteEnabled = true; pipe.vignetteWeight = 1.2
    pipe.imageProcessingEnabled = true
    pipe.imageProcessing.contrast = 1.14
    pipe.imageProcessing.exposure = 1.18
    pipe.sharpenEnabled = true; pipe.sharpen.edgeAmount = 0.28
  } catch {}

  const camPos    = new Vector3(0, 5, 20)
  const camLookAt = new Vector3(0, 1.5, 0)

  let controller = null
  const nodeMap    = {}
  const dstRests   = {}
  const restPose   = {}
  const animGroups = {}

  const SHIRT_TEXTURE_KEYS = new Set(['ajax', 'psv'])

  SceneLoader.ImportMesh('', '/', 'Poppetje.glb', scene, (meshes) => {
    const charRoot = meshes[0]
    charRoot.position.set(0, 0, 5)
    charRoot.rotationQuaternion = Quaternion.RotationYawPitchRoll(0, 0, 0)

    meshes.forEach(m => { shadowGen.addShadowCaster(m); m.receiveShadows = true })

    // Apply clothing colors (wardrobe)
    {
      let pendingShirtGLB = false
      meshes.forEach(m => {
        if (!CLOTHING_NAMES.has(m.name)) return
        const itemKey  = m.name.toLowerCase()
        const colorKey = itemKey === 'shirt' ? shirtKey : wearing?.[itemKey]
        if (!colorKey) { m.setEnabled(false); return }

        // Ajax / PSV — load GLB shirt directly (material is baked in)
        if (itemKey === 'shirt' && SHIRT_TEXTURE_KEYS.has(colorKey)) {
          m.setEnabled(false)   // hide Poppetje's plain Shirt
          if (!pendingShirtGLB) {
            pendingShirtGLB = true
            const glbFile = colorKey === 'ajax' ? 'ajaxshirt.glb' : 'psvshirt.glb'
            const playerSkel = scene.skeletons[0] ?? null
            SceneLoader.ImportMesh('', '/', glbFile, scene, (shirtMeshes, _ps, srcSkels) => {
              const srcSkel = srcSkels?.[0]
              if (srcSkel && playerSkel) {
                shirtMeshes.forEach(sm => { if (sm.skeleton) remapAndAttach(sm, srcSkel, playerSkel) })
                srcSkel.dispose()
              }
            })
          }
          return
        }

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

      // Apply team skin color — skip clothing AND face features
      if (teamColor) {
        const tc = Color3.FromHexString(teamColor)
        meshes.forEach(m => {
          if (CLOTHING_NAMES.has(m.name) || FACE_MESH_NAMES.has(m.name) || !m.material) return
          const mat = m.material.clone(m.material.name + '_team')
          m.material = mat
          if (mat.albedoColor !== undefined) { mat.albedoTexture = null; mat.albedoColor = tc }
          else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = null; mat.diffuseColor = tc }
        })
      }

      // Face features always black
      meshes.forEach(m => {
        if (!FACE_MESH_NAMES.has(m.name) || !m.material) return
        const mat = m.material.clone(m.material.name + '_face')
        m.material = mat
        if (mat.albedoColor !== undefined) { mat.albedoTexture = null; mat.albedoColor = Color3.Black() }
        else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = null; mat.diffuseColor = Color3.Black() }
      })
    }

    scene.transformNodes.forEach(n => {
      nodeMap[n.name] = n
      if (!RETARGET_BONES.has(n.name)) return
      dstRests[n.name] = n.rotationQuaternion ? n.rotationQuaternion.clone() : Quaternion.Identity()
      restPose[n.name] = {
        node: n,
        rot:  n.rotationQuaternion ? n.rotationQuaternion.clone() : Quaternion.Identity(),
        pos:  n.position.clone(),
      }
    })
    scene.meshes.forEach(m => { if (!nodeMap[m.name]) nodeMap[m.name] = m })

    const ANIMS = [
      { key: 'rust',       file: 'rust.glb',              stripRoot: true  },
      { key: 'lopen',      file: 'emote_lopen.glb',       stripRoot: true  },
      { key: 'hip_hop',    file: 'hip_hop_dancing.glb',   stripRoot: false },
      { key: 'breakdance', file: 'emote_breakdance.glb',  stripRoot: false },
      { key: 'verloren',   file: 'emote_verloren.glb',    stripRoot: false },
    ]
    let pending = ANIMS.length

    const done = () => {
      if (--pending > 0) return
      controller = new CharacterController(charRoot, scene, animGroups, restPose)
      if (joy) controller.joy = joy
      controller._playRest()   // start in rest pose, not T-pose
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
          // Strip Root rotation for rust – raw Z-up in rust.glb would lay character flat
          if (key === 'rust' && name === 'Root') { tas.splice(i, 1); continue }
          // Apply rest-pose correction for emote animations only, not the base rust animation
          if (key !== 'rust') {
            const src  = srcRests[name] ?? Quaternion.Identity()
            const dst  = dstRests[name] ?? Quaternion.Identity()
            const corr = Quaternion.Inverse(dst).multiply(src)
            anim.getKeys().forEach(kf => kf.value.copyFrom(corr.multiply(kf.value)))
          }
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
    if (!gameActive) return
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05)

    // Timer countdown
    timeLeft -= dt
    if (timeLeft <= 0) {
      timeLeft = 0
      gameActive = false
      if (timerDomRef?.current) timerDomRef.current.textContent = '0:00'
      onGameOver()
      return
    }
    if (timerDomRef?.current) timerDomRef.current.textContent = fmtTime(timeLeft)

    if (!goalPaused) {
      controller?.update(dt)
    }
    ball.update(dt)
    particles.update(dt)

    // Ball ↔ character collision
    if (controller && !goalPaused) {
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
          ball.kick(kickDir, spd * 2.5 + 1)  // much slower kick
        } else {
          ball.kick(toB, 0.8)
        }
      }
    }

    // Goal scoring
    if (!goalPaused) {
      goals.forEach(goal => {
        if (!goal.scored && goal.checkScore(ball)) {
          goalPaused = true
          goal.flash()
          onGoal()
          setTimeout(() => {
            ball.reset()
            if (controller) {
              controller.root.position.set(0, 0, 5)
              controller.rotY = 0
              controller.velocity = 0
            }
            goalPaused = false
          }, 2200)
        }
      })
    }

    // Camera: always positioned behind the player
    if (controller) {
      const cp  = controller.root.position
      const bp  = ball.mesh.position
      const Lp  = 1 - Math.exp(-dt * 9)
      const Ll  = 1 - Math.exp(-dt * 14)

      // Camera position always follows player
      camPos.x += (cp.x      - camPos.x) * Lp
      camPos.y += (cp.y + 6  - camPos.y) * Lp
      camPos.z += (cp.z + 11 - camPos.z) * Lp

      const followBall = followBallRef?.current ?? false
      if (followBall) {
        // Ball cam: look AT the ball (Rocket League style)
        camLookAt.x += (bp.x       - camLookAt.x) * Ll
        camLookAt.y += (bp.y + 0.5 - camLookAt.y) * Ll
        camLookAt.z += (bp.z       - camLookAt.z) * Ll
      } else {
        // Normal cam: look at player
        camLookAt.x += (cp.x       - camLookAt.x) * Ll
        camLookAt.y += (cp.y + 1.2 - camLookAt.y) * Ll
        camLookAt.z += (cp.z       - camLookAt.z) * Ll
      }

      camera.position.copyFrom(camPos)
      camera.setTarget(camLookAt)
    }
  })

  engine.runRenderLoop(() => scene.render())
  const onResize = () => engine.resize()
  window.addEventListener('resize', onResize)

  return () => {
    gameActive = false
    controller?.dispose()
    ball.dispose()
    particles.dispose()
    window.removeEventListener('resize', onResize)
    engine.stopRenderLoop()
    scene.dispose()
    engine.dispose()
  }
}

// ── Virtual joystick ────────────────────────────────────────────────
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

  const onTouchStart = e => { e.preventDefault(); activeRef.current = true; const t = e.targetTouches[0]; const {cx,cy} = getCenter(); applyOffset(t.clientX-cx, t.clientY-cy) }
  const onTouchMove  = e => { e.preventDefault(); if (!activeRef.current) return; const t = e.targetTouches[0]; const {cx,cy} = getCenter(); applyOffset(t.clientX-cx, t.clientY-cy) }
  const onTouchEnd   = () => release()

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

// ── Game over screen ────────────────────────────────────────────────
function GameOver({ scoreA, scoreB, onRestart, onBack }) {
  const winner = scoreA > scoreB ? 'Jij wint! 🏆' : scoreB > scoreA ? 'AI wint! 😅' : 'Gelijkspel! 🤝'
  return (
    <div className="fb3d-gameover">
      <div className="fb3d-gameover-box">
        <div className="fb3d-gameover-title">Tijd is om!</div>
        <div className="fb3d-gameover-score">{scoreA} — {scoreB}</div>
        <div className="fb3d-gameover-winner">{winner}</div>
        <div className="fb3d-gameover-btns">
          <button className="fb3d-gameover-btn fb3d-gameover-play" onClick={onRestart}>
            ⚽ Opnieuw spelen
          </button>
          <button className="fb3d-gameover-btn fb3d-gameover-back" onClick={onBack}>
            ← Menu
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────
export default function FootballScene3D({ onBack, onPlay3v3 }) {
  const canvasRef     = useRef(null)
  const joyRef        = useRef({ x: 0, z: 0 })
  const followBallRef = useRef(false)
  const timerDomRef   = useRef(null)

  const [team,       setTeam]       = useState(null)
  const [scoreA,     setScoreA]     = useState(0)
  const [scoreB,     setScoreB]     = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [showHint,   setShowHint]   = useState(true)
  const [goalFlash,  setGoalFlash]  = useState(false)
  const [followBall, setFollowBall] = useState(false)
  const [gameOver,   setGameOver]   = useState(false)

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
      shirtKey:      shirt,
      wearing,
      joy:           joyRef.current,
      teamColor:     team,
      onScoreA:      v => setScoreA(v),
      onScoreB:      v => setScoreB(v),
      onLoad:        () => setLoading(false),
      onGoal:        () => {
        setGoalFlash(true)
        setTimeout(() => setGoalFlash(false), 2200)
      },
      onGameOver:    () => setGameOver(true),
      followBallRef,
      timerDomRef,
    })
    return cleanup
  }, [team])

  const toggleCamera = () => {
    const next = !followBallRef.current
    followBallRef.current = next
    setFollowBall(next)
  }

  if (!team) return (
    <div className="fb3d-outer">
      <button className="fb3d-back" onClick={onBack}>← Menu</button>
      {onPlay3v3 && (
        <button className="fb3d-3v3-btn fb3d-3v3-intro" onClick={onPlay3v3}>
          👥 3 vs 3 Spelen
        </button>
      )}
      <TeamSelect onSelect={t => { setTeam(t); setScoreA(0); setScoreB(0); setGameOver(false); setLoading(true) }} />
    </div>
  )

  if (gameOver) return (
    <div className="fb3d-outer">
      <GameOver
        scoreA={scoreA} scoreB={scoreB}
        onRestart={() => { setTeam(null); setGameOver(false) }}
        onBack={onBack}
      />
    </div>
  )

  return (
    <div className="fb3d-outer">
      <canvas ref={canvasRef} className="fb3d-canvas" />

      <button className="fb3d-back" onClick={onBack}>← Menu</button>

      {/* Score + timer bar */}
      <div className="fb3d-score">
        <span className="fb3d-score-a">🥅 {scoreA}</span>
        <span className="fb3d-score-sep"> — </span>
        <span ref={timerDomRef} className="fb3d-timer">2:00</span>
        <span className="fb3d-score-sep"> — </span>
        <span className="fb3d-score-b">{scoreB} 🥅</span>
      </div>

      {/* Camera toggle */}
      <button className="fb3d-cam-btn" onClick={toggleCamera}>
        {followBall ? '📷 Bal' : '📷 Speler'}
      </button>

      {/* 3v3 game entry */}
      {onPlay3v3 && (
        <button className="fb3d-3v3-btn" onClick={onPlay3v3}>
          👥 3 vs 3 Spelen
        </button>
      )}

      {/* GOAL! flash */}
      {goalFlash && <div className="fb3d-goal-flash">GOAL! 🎉</div>}

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
