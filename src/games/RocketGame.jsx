import { useState, useEffect, useRef, useCallback } from 'react'
import * as Colyseus from '@colyseus/sdk'
import {
  Engine, Scene, FreeCamera,
  Color3, Color4, Vector3, Quaternion,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  MeshBuilder, StandardMaterial, DynamicTexture,
  DefaultRenderingPipeline, Mesh,
} from '@babylonjs/core'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'
import { findItem } from '../itemsCatalog'
import { applyItemToMesh, loadShirtDonor } from '../applyClothing'
import './rocket-game.css'

const SERVER_URL = 'wss://kenniskist-server.onrender.com'

// ── Field constants (identical to FootballScene3D) ─────────────────────
const FIELD_HALF  = 38
const GOAL_Z      = 36
const GOAL_HALF_W = 3.65
const GOAL_H      = 2.44
const BALL_RADIUS = 0.22
const PLAYER_SPEED  = 4.8   // must match server
const BOOST_SPEED   = 9.0
const PLAYER_RADIUS = 0.6
const GOAL_DEPTH    = 1.6
const BOUND         = GOAL_Z          // walls on the white line (±36)
const CORNER_R      = 8               // rounded-corner radius
const GOAL_BACK     = BOUND + GOAL_DEPTH

// Rounded arena boundary + open goal mouths (mirrors the server)
function resolveBoundary(x, z, rad) {
  let ax = Math.abs(x), az = Math.abs(z)
  const sx = x < 0 ? -1 : 1, sz = z < 0 ? -1 : 1
  let nx = 0, nz = 0
  if (ax < GOAL_HALF_W - rad && az > BOUND - rad) {
    const sideLim = GOAL_HALF_W - rad, backLim = GOAL_BACK - rad
    if (ax > sideLim) { ax = sideLim; nx = -sx }
    if (az > backLim) { az = backLim; nz = -sz }
    return { x: sx*ax, z: sz*az, nx, nz }
  }
  const C = BOUND - CORNER_R
  if (ax > C && az > C) {
    const dx = ax - C, dz = az - C
    const d  = Math.hypot(dx, dz) || 1
    const maxd = CORNER_R - rad
    if (d > maxd) {
      const fr = maxd / d
      ax = C + dx*fr; az = C + dz*fr
      nx = -sx*(dx/d); nz = -sz*(dz/d)
    }
    return { x: sx*ax, z: sz*az, nx, nz }
  }
  const lim = BOUND - rad
  if (ax > lim) { ax = lim; nx = -sx }
  if (az > lim && !(ax < GOAL_HALF_W - rad)) { az = lim; nz = -sz }
  return { x: sx*ax, z: sz*az, nx, nz }
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
const SHIRT_GLB_KEYS = new Set(['ajax','psv'])

// ── Shirt helper ───────────────────────────────────────────────────────
function applyShirtGLB(scene, glbFile, poppetjeShirtMesh, poppetjeSkel) {
  SceneLoader.ImportMesh('', '/', glbFile, scene, (loadedMeshes, _ps, srcSkels) => {
    const glbShirt = loadedMeshes.find(lm => (lm.getTotalVertices?.() ?? 0) > 0)
    if (glbShirt && poppetjeSkel && poppetjeShirtMesh) {
      glbShirt.parent             = poppetjeShirtMesh.parent
      glbShirt.position           = Vector3.Zero()
      glbShirt.rotationQuaternion = null
      glbShirt.scaling            = Vector3.One()
      glbShirt.skeleton           = poppetjeSkel
      glbShirt.setEnabled(true)
    }
    loadedMeshes.forEach(lm => { if (lm !== glbShirt) { try { lm.dispose() } catch {} } })
    srcSkels?.[0]?.dispose()
  })
}

// ── Crowd cheer (same as FootballScene3D) ──────────────────────────────
function playCrowdCheer() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const sr = ctx.sampleRate, dur = 2.8
    const buf = ctx.createBuffer(2, sr * dur, sr)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < d.length; i++) {
        const t = i / sr
        d[i] = (Math.random() * 2 - 1) * 0.25 + Math.sin(t * 2200) * 0.04
              + Math.sin(t * 1800 + ch * 0.5) * 0.03 + Math.sin(t * 440) * 0.07
      }
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    const bp = ctx.createBiquadFilter()
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

// ── Particle Pool (identical to FootballScene3D) ───────────────────────
class ParticlePool {
  constructor(scene, max = 50) {
    this._scene = scene
    this._pool  = []
    const baseMat = new StandardMaterial('_pm', scene)
    baseMat.disableLighting = true
    for (let i = 0; i < max; i++) {
      const m = MeshBuilder.CreateBox('_p', { size: 0.22 }, scene)
      const mat = baseMat.clone('_pm' + i)
      m.material = mat; m.isPickable = false; m.setEnabled(false)
      this._pool.push({ mesh: m, vel: Vector3.Zero(), life: 0, maxLife: 1, active: false })
    }
  }
  burst(pos, count, hexColors) {
    let spawned = 0
    for (let i = 0; i < this._pool.length && spawned < count; i++) {
      const p = this._pool[i]
      if (p.active) continue
      p.active = true; p.mesh.setEnabled(true); p.mesh.position.copyFrom(pos)
      const col = Color3.FromHexString(hexColors[spawned % hexColors.length])
      p.mesh.material.emissiveColor = col
      const ang = (spawned / count) * Math.PI * 2 + Math.random()
      const spd = 4 + Math.random() * 6
      p.vel = new Vector3(Math.cos(ang)*spd*0.8, 3.5+Math.random()*4, Math.sin(ang)*spd*0.8)
      p.maxLife = 0.9 + Math.random() * 0.6; p.life = p.maxLife; spawned++
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

// ── PlayerInstance — one Poppetje in the multiplayer scene ────────────
// Loads Poppetje.glb, applies wardrobe, retargets animations
class PlayerInstance {
  constructor(scene, sg, opts) {
    this.scene      = scene
    this.sg         = sg
    this.opts       = opts   // { shirt, wearing, teamColor, name }
    this.root       = null
    this._skeleton  = null
    this._nodeMap   = {}     // per-player node map (avoids conflicts)
    this._dstRests  = {}
    this._restPose  = {}
    this._anims     = {}
    this._state     = 'idle'
    this._ready     = false
    this._onReady   = null
    this._shirtGLB  = null
    this._load()
  }

  _load() {
    SceneLoader.ImportMesh('', '/', 'Poppetje.glb', this.scene, (meshes, _ps, skels) => {
      this.root      = meshes[0]
      this._skeleton = skels[0] ?? null

      meshes.forEach(m => { this.sg?.addShadowCaster(m); m.receiveShadows = true })

      // Build per-player node map
      this.scene.transformNodes.forEach(n => { this._nodeMap[n.name] = n })
      this.scene.meshes.forEach(m => { if (!this._nodeMap[m.name]) this._nodeMap[m.name] = m })

      // Capture rest pose for retargeting
      this.scene.transformNodes.forEach(n => {
        if (!RETARGET_BONES.has(n.name)) return
        this._dstRests[n.name] = n.rotationQuaternion ? n.rotationQuaternion.clone() : Quaternion.Identity()
        this._restPose[n.name] = {
          node: n,
          rot:  n.rotationQuaternion ? n.rotationQuaternion.clone() : Quaternion.Identity(),
          pos:  n.position.clone(),
        }
      })

      // Apply wardrobe (same catalog/logic as the dressing room)
      meshes.forEach(m => {
        if (!CLOTHING_NAMES.has(m.name)) return
        const key      = m.name.toLowerCase()
        const colorKey = key === 'shirt' ? this.opts.shirt : this.opts.wearing?.[key]
        if (!colorKey) { m.setEnabled(false); return }
        const item = findItem(key, colorKey)
        if (!item) { m.setEnabled(false); return }
        if (key === 'shirt' && (item.kind === 'model' || item.kind === 'print')) {
          m.setEnabled(false)
          loadShirtDonor(this.scene, m, this._skeleton, item, (g) => { this._shirtGLB = g })
          return
        }
        applyItemToMesh(this.scene, m, item)
        m.setEnabled(true)
      })

      // Team skin color
      if (this.opts.teamColor) {
        const tc = Color3.FromHexString(this.opts.teamColor)
        meshes.forEach(m => {
          if (CLOTHING_NAMES.has(m.name) || FACE_NAMES.has(m.name) || !m.material) return
          const mat = m.material.clone(m.material.name + '_t')
          m.material = mat
          if (mat.albedoColor !== undefined) { mat.albedoTexture = null; mat.albedoColor = tc }
          else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = null; mat.diffuseColor = tc }
        })
      }
      // Face always black
      meshes.forEach(m => {
        if (!FACE_NAMES.has(m.name) || !m.material) return
        const mat = m.material.clone(m.material.name + '_f')
        m.material = mat
        if (mat.albedoColor !== undefined) { mat.albedoTexture = null; mat.albedoColor = Color3.Black() }
        else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = null; mat.diffuseColor = Color3.Black() }
      })

      // Load animations — same ANIMS list as FootballScene3D
      const ANIMS = [
        { key: 'rust',       file: 'rust.glb',              stripRoot: true  },
        { key: 'lopen',      file: 'emotelopen.glb',        stripRoot: true  },
        { key: 'sprinten',   file: 'emotesprinten.glb',     stripRoot: true  },
        { key: 'hip_hop',    file: 'hip_hop_dancing.glb',   stripRoot: false },
        { key: 'breakdance', file: 'emote_breakdance.glb',  stripRoot: false },
        { key: 'verloren',   file: 'emote_verloren.glb',    stripRoot: false },
      ]
      let pending = ANIMS.length
      const done = () => {
        if (--pending > 0) return
        this._playRest()
        this._ready = true
        this._onReady?.()
      }
      ANIMS.forEach(({ key, file, stripRoot }) => {
        SceneLoader.ImportMesh('', '/', file, this.scene, (aM, _p, _s, aG) => {
          aM.forEach(m => m.setEnabled(false))
          if (!aG.length) { done(); return }
          const orig = aG[0]
          const srcRests = {}
          orig.targetedAnimations.forEach(ta => {
            const n = ta.target
            srcRests[n.name] = n.rotationQuaternion ? n.rotationQuaternion.clone() : Quaternion.Identity()
          })
          const rt = orig.clone(key, t =>
            RETARGET_BONES.has(t.name) ? (this._nodeMap[t.name] ?? t) : t
          )
          const tas = rt.targetedAnimations
          for (let i = tas.length - 1; i >= 0; i--) {
            const { animation: anim, target } = tas[i]
            const prop = anim.targetProperty, name = target.name
            if (prop === 'scaling' || prop === 'scale') { tas.splice(i,1); continue }
            if (prop === 'position') { if (stripRoot || name !== 'Root') { tas.splice(i,1); continue } continue }
            if (!RETARGET_BONES.has(name)) { tas.splice(i,1); continue }
            if (key === 'rust' && name === 'Root') { tas.splice(i,1); continue }
            if (key !== 'rust') {
              const src  = srcRests[name] ?? Quaternion.Identity()
              const dst  = this._dstRests[name] ?? Quaternion.Identity()
              const corr = Quaternion.Inverse(dst).multiply(src)
              anim.getKeys().forEach(kf => kf.value.copyFrom(corr.multiply(kf.value)))
            }
          }
          rt.stop(); this._anims[key] = rt; orig.dispose(); done()
        }, null, () => done())
      })
    }, null, (_, msg, err) => { console.error('Poppetje load error:', msg, err) })
  }

  _stopAll() { Object.values(this._anims).forEach(g => g?.stop()) }
  _resetRest() {
    Object.values(this._restPose).forEach(({ node, rot, pos }) => {
      if (node.rotationQuaternion) node.rotationQuaternion.copyFrom(rot)
      else node.rotationQuaternion = rot.clone()
      node.position.copyFrom(pos)
    })
  }
  // NOTE: no _resetRest() on these transitions — resetting to the bind pose
  // causes a one-frame T-pose flash before the next clip is evaluated.
  // Stopping leaves the bones at the last pose, which blends seamlessly.
  _playRest() { this._stopAll(); this._anims.rust?.play(true); this._state = 'idle' }
  _playWalk(speed) {
    if (this._state !== 'walk') {
      this._stopAll(); this._anims.lopen?.play(true); this._state = 'walk'
    }
    if (this._anims.lopen) this._anims.lopen.speedRatio = Math.max(0.3, (speed / 4.8) * 1.6)
  }
  _playSprint() {
    if (this._state !== 'sprint') {
      this._stopAll()
      // fall back to walk anim if the sprint glb is missing
      ;(this._anims.sprinten ?? this._anims.lopen)?.play(true)
      this._state = 'sprint'
    }
  }
  // Choose locomotion anim from speed + sprint flag
  _locomotion(spd, sprinting) {
    if (this._state === 'emote') return
    if (spd > 0.3) {
      if (sprinting) this._playSprint()
      else           this._playWalk(spd)
    } else if (this._state === 'walk' || this._state === 'sprint') {
      this._playRest()
    }
  }
  playEmote(name) {
    if (!this._anims[name] || this._state === 'emote') return
    this._stopAll(); this._state = 'emote'
    this._anims[name].play(false)
    this._anims[name].onAnimationGroupEndObservable.addOnce(() => { this._playRest() })
  }

  // ── Interpolated pose ──
  setTarget(x, z, rotY, vx, vz, boosting) {
    this._tx = x; this._tz = z; this._trotY = rotY
    this._tvx = vx; this._tvz = vz; this._tboost = !!boosting
    if (this._dx === undefined) { this._dx = x; this._dz = z; this._drotY = rotY }
  }

  // rate: lerp speed (high = snap, low = smooth). dt in seconds.
  tick(dt, rate = 13) {
    if (!this.root || this._dx === undefined) return
    const L = 1 - Math.exp(-dt * rate)
    this._dx += (this._tx - this._dx) * L
    this._dz += (this._tz - this._dz) * L
    // shortest-path angle lerp
    let diff = this._trotY - this._drotY
    while (diff >  Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    this._drotY += diff * L

    this.root.position.set(this._dx, 0, this._dz)
    this.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(this._drotY + Math.PI, 0, 0)

    this._locomotion(Math.hypot(this._tvx, this._tvz), this._tboost)
  }

  // direct pose (for locally-predicted player — no interp lag)
  setPose(x, z, rotY, vx, vz, boosting) {
    if (!this.root) return
    this._dx = x; this._dz = z; this._drotY = rotY
    this.root.position.set(x, 0, z)
    this.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(rotY + Math.PI, 0, 0)
    this._locomotion(Math.hypot(vx, vz), !!boosting)
  }

  onReady(cb) { if (this._ready) cb(); else this._onReady = cb }

  dispose() {
    this._stopAll()
    Object.values(this._anims).forEach(g => { try { g.dispose() } catch {} })
    this._shirtGLB?.dispose?.()
    this.root?.dispose?.()
  }
}

// ── Build world (identical to FootballScene3D's SceneBuilder) ──────────
function buildWorld(scene) {
  scene.clearColor = new Color4(0.42, 0.65, 0.92, 1)
  scene.fogMode    = Scene.FOGMODE_EXP2
  scene.fogColor   = new Color3(0.42, 0.65, 0.92)
  scene.fogDensity = 0.004

  const ambient = new HemisphericLight('hemi', new Vector3(0,1,0), scene)
  ambient.intensity   = 0.55
  ambient.groundColor = new Color3(0.12, 0.20, 0.08)
  ambient.diffuse     = new Color3(0.75, 0.82, 1.0)

  const lightPositions = [
    new Vector3(-FIELD_HALF-8, 32,  FIELD_HALF+8),
    new Vector3( FIELD_HALF+8, 32,  FIELD_HALF+8),
    new Vector3(-FIELD_HALF-8, 32, -FIELD_HALF-8),
    new Vector3( FIELD_HALF+8, 32, -FIELD_HALF-8),
  ]
  const lights = lightPositions.map((pos, i) => {
    const l = new DirectionalLight('fl'+i, new Vector3(0,0,0).subtract(pos).normalize(), scene)
    l.position = pos; l.intensity = 2.2; l.diffuse = new Color3(1.0, 0.98, 0.90)
    return l
  })
  const sg = new ShadowGenerator(2048, lights[0])
  sg.usePoissonSampling = true; sg.bias = 0.0003

  // Field texture
  const W = 1024, H = 1024
  const tex = new DynamicTexture('gt', { width: W, height: H }, scene)
  const ctx = tex.getContext()
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = i%2===0 ? '#28c428' : '#22b022'
    ctx.fillRect(0, i*(H/14), W, H/14)
  }
  ctx.globalAlpha = 0.06
  for (let y2=0; y2<H; y2+=4) for (let x2=0; x2<W; x2+=4) {
    if (Math.random()>0.5) { ctx.fillStyle='#000000'; ctx.fillRect(x2,y2,2,2) }
  }
  ctx.globalAlpha = 1.0
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 9; ctx.lineJoin = 'round'
  const pad = 28
  ctx.strokeRect(pad, pad, W-pad*2, H-pad*2)
  ctx.beginPath(); ctx.moveTo(pad, H/2); ctx.lineTo(W-pad, H/2); ctx.stroke()
  ctx.beginPath(); ctx.arc(W/2, H/2, 110, 0, Math.PI*2); ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath(); ctx.arc(W/2, H/2, 10, 0, Math.PI*2); ctx.fill()
  const paW = W*0.44, paH = H*0.16
  ctx.strokeRect((W-paW)/2, pad, paW, paH)
  ctx.strokeRect((W-paW)/2, H-pad-paH, paW, paH)
  tex.update()

  const ground = MeshBuilder.CreateGround('ground', { width: FIELD_HALF*2, height: FIELD_HALF*2 }, scene)
  ground.receiveShadows = true; ground.isPickable = false
  const gmat = new StandardMaterial('gmat', scene)
  gmat.diffuseTexture = tex; gmat.specularColor = new Color3(0.05, 0.05, 0.05)
  ground.material = gmat

  // Stands
  const concMat = new StandardMaterial('conc', scene)
  concMat.diffuseColor = new Color3(0.24, 0.24, 0.28); concMat.specularColor = Color3.Black()
  const CROWD = [
    new Color3(0.85,0.10,0.10), new Color3(0.95,0.55,0.05),
    new Color3(0.10,0.30,0.85), new Color3(0.95,0.92,0.20),
    new Color3(0.20,0.70,0.25), new Color3(0.92,0.92,0.92),
  ]
  const ROWS=10, ROW_H=1.4, ROW_D=1.8, GAP=4
  const buildSide = (offsetZ, len) => {
    for (let r=0; r<ROWS; r++) {
      const step = MeshBuilder.CreateBox('st', { width:len, height:ROW_H, depth:ROW_D }, scene)
      step.isPickable=false; step.material=concMat
      const y=r*ROW_H+ROW_H/2, d=GAP+r*ROW_D+ROW_D/2
      step.position.set(0, y, offsetZ>0 ? offsetZ+d : offsetZ-d)
      const seat = MeshBuilder.CreateBox('seat', { width:len, height:0.22, depth:ROW_D*0.7 }, scene)
      seat.isPickable=false
      const smat = new StandardMaterial('s_'+r+'_'+offsetZ, scene)
      smat.diffuseColor = CROWD[(r*3+(offsetZ>0?0:1)) % CROWD.length]
      smat.emissiveColor = smat.diffuseColor.scale(0.18)
      smat.specularColor = Color3.Black()
      seat.material = smat
      seat.position.set(0, y+ROW_H/2+0.11, offsetZ>0 ? offsetZ+d : offsetZ-d)
    }
  }
  buildSide( FIELD_HALF, FIELD_HALF*2+4)
  buildSide(-FIELD_HALF, FIELD_HALF*2+4)

  // Floodlight poles
  const poleMat = new StandardMaterial('pole', scene)
  poleMat.diffuseColor = new Color3(0.7,0.7,0.75)
  const lampMat = new StandardMaterial('lamp', scene)
  lampMat.diffuseColor = new Color3(1,0.97,0.85); lampMat.emissiveColor = new Color3(1.0,0.94,0.70)
  lightPositions.forEach(pos => {
    const pole = MeshBuilder.CreateCylinder('flp', { height:pos.y, diameterTop:0.35, diameterBottom:0.55, tessellation:10 }, scene)
    pole.position.set(pos.x, pos.y/2, pos.z); pole.material=poleMat; pole.isPickable=false
    const head = MeshBuilder.CreateBox('flh', { width:4, height:0.6, depth:1.5 }, scene)
    head.position.set(pos.x, pos.y+0.3, pos.z); head.material=lampMat; head.isPickable=false
  })

  // Rounded arena wall — smooth ribbon panels (matches physics, open goal mouths)
  const fenceMat = new StandardMaterial('fence', scene)
  fenceMat.diffuseColor = new Color3(0.12,0.18,0.10); fenceMat.alpha = 0.9
  fenceMat.backFaceCulling = false
  const H2 = 1.6
  const C  = BOUND - CORNER_R
  const wall = (pts) => {
    const bottom = pts.map(([x,z]) => new Vector3(x, 0,  z))
    const top    = pts.map(([x,z]) => new Vector3(x, H2, z))
    const r = MeshBuilder.CreateRibbon('wall', { pathArray:[bottom, top] }, scene)
    r.material = fenceMat; r.isPickable = false
  }
  // Straight side walls (x = ±BOUND)
  wall([[ BOUND,-C],[ BOUND, C]])
  wall([[-BOUND,-C],[-BOUND, C]])
  // Goal-end walls (z = ±BOUND), split by the open goal mouth
  wall([[ GOAL_HALF_W, BOUND],[ C, BOUND]])
  wall([[-C, BOUND],[-GOAL_HALF_W, BOUND]])
  wall([[ GOAL_HALF_W,-BOUND],[ C,-BOUND]])
  wall([[-C,-BOUND],[-GOAL_HALF_W,-BOUND]])
  // Smooth rounded corners
  const Nc = 14
  for (const [sx, sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
    const pts = []
    for (let i = 0; i <= Nc; i++) {
      const th = (i / Nc) * (Math.PI / 2)
      pts.push([sx * (C + CORNER_R * Math.cos(th)), sz * (C + CORNER_R * Math.sin(th))])
    }
    wall(pts)
  }

  // Goals
  const postMat = new StandardMaterial('post', scene)
  postMat.diffuseColor = Color3.White(); postMat.emissiveColor = new Color3(0.14,0.14,0.14)
  postMat.specularColor = new Color3(0.6,0.6,0.6); postMat.specularPower = 48
  const cyl = (x,y,z,h,d,rx=0,rz=0) => {
    const m = MeshBuilder.CreateCylinder('gp', { height:h, diameter:d, tessellation:14 }, scene)
    m.material=postMat; m.isPickable=false; m.position.set(x,y,z); m.rotation.x=rx; m.rotation.z=rz
  }
  for (const gz of [-GOAL_Z, GOAL_Z]) {
    const openDir = gz < 0 ? 1 : -1
    const bZ      = gz - openDir * 1.6
    const midZ    = (gz + bZ) / 2
    cyl(-GOAL_HALF_W, GOAL_H/2, gz, GOAL_H, 0.14)
    cyl( GOAL_HALF_W, GOAL_H/2, gz, GOAL_H, 0.14)
    cyl(0, GOAL_H, gz, GOAL_HALF_W*2+0.14, 0.12, 0, Math.PI/2)
    cyl(-GOAL_HALF_W, GOAL_H, midZ, 1.6, 0.08, Math.PI/2)
    cyl( GOAL_HALF_W, GOAL_H, midZ, 1.6, 0.08, Math.PI/2)

    // Net texture
    const netTex = new DynamicTexture('nt'+gz, { width:512, height:512 }, scene)
    netTex.hasAlpha = true
    const nc = netTex.getContext(); nc.clearRect(0,0,512,512)
    nc.strokeStyle = 'rgba(255,255,255,0.88)'; nc.lineWidth = 3
    for (let x2=0; x2<=512; x2+=22) { nc.beginPath(); nc.moveTo(x2,0); nc.lineTo(x2,512); nc.stroke() }
    for (let y2=0; y2<=512; y2+=22) { nc.beginPath(); nc.moveTo(0,y2); nc.lineTo(512,y2); nc.stroke() }
    netTex.update()
    const mkNet = (w2,h2,nx,ny,nz,ry,rx=0) => {
      const nm = MeshBuilder.CreatePlane('net', { width:w2, height:h2 }, scene)
      nm.position.set(nx,ny,nz); nm.rotation.y=ry; nm.rotation.x=rx; nm.isPickable=false
      const nmat = new StandardMaterial('nm'+Math.random(), scene)
      nmat.diffuseTexture = netTex; nmat.diffuseTexture.hasAlpha = true
      nmat.useAlphaFromDiffuseTexture = true; nmat.backFaceCulling = false
      nmat.specularColor = Color3.Black(); nm.material = nmat
    }
    mkNet(GOAL_HALF_W*2, GOAL_H, 0, GOAL_H/2, bZ, openDir < 0 ? Math.PI : 0)
    mkNet(1.6, GOAL_H, -GOAL_HALF_W, GOAL_H/2, midZ,  Math.PI/2)
    mkNet(1.6, GOAL_H,  GOAL_HALF_W, GOAL_H/2, midZ, -Math.PI/2)
    mkNet(GOAL_HALF_W*2, 1.6, 0, GOAL_H, midZ, 0, -Math.PI/2)
  }

  return sg
}

// ── Create ball (same as FootballScene3D's PhysicsObject mesh) ─────────
function createBallMesh(scene, sg) {
  const ball = MeshBuilder.CreateSphere('ball', { diameter: BALL_RADIUS*2, segments:16 }, scene)
  ball.receiveShadows = true
  const mat = new StandardMaterial('ballMat', scene)
  const sz = 256
  const t  = new DynamicTexture('bt', { width:sz, height:sz }, scene)
  const c  = t.getContext()
  c.fillStyle='#ffffff'; c.fillRect(0,0,sz,sz)
  c.fillStyle='#111111'
  const r = sz * 0.15
  const drawHex = (cx,cy) => {
    c.beginPath()
    for (let i=0;i<6;i++) { const a=(i/6)*Math.PI*2-Math.PI/6; c.lineTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r) }
    c.closePath(); c.fill()
  }
  drawHex(sz/2, sz/2)
  for (let i=0;i<6;i++) { const a=(i/6)*Math.PI*2; drawHex(sz/2+Math.cos(a)*r*2.55, sz/2+Math.sin(a)*r*2.55) }
  t.update(); mat.diffuseTexture = t; mat.specularPower = 64
  mat.specularColor = new Color3(0.2,0.2,0.2); ball.material = mat
  if (sg) sg.addShadowCaster(ball)

  const disc = MeshBuilder.CreateDisc('bShadow', { radius:BALL_RADIUS*1.6, tessellation:16 }, scene)
  disc.rotation.x = Math.PI/2; disc.isPickable = false
  const sm = new StandardMaterial('bShadMat', scene)
  sm.diffuseColor = Color3.Black(); sm.alpha = 0.35; disc.material = sm

  return { ball, disc }
}

// ── Virtual joystick (identical to FootballScene3D) ────────────────────
function VirtualJoystick({ joyRef }) {
  const baseRef = useRef(null)
  const knobRef = useRef(null)
  const active  = useRef(false)
  const RADIUS  = 52

  const apply = (dx, dy) => {
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) { dx=dx/len*RADIUS; dy=dy/len*RADIUS }
    joyRef.current.x = dx/RADIUS; joyRef.current.z = dy/RADIUS
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px,${dy}px)`
  }
  const release = () => {
    active.current = false; joyRef.current.x=0; joyRef.current.z=0
    if (knobRef.current) knobRef.current.style.transform = 'translate(0,0)'
  }
  const center = () => { const r=baseRef.current.getBoundingClientRect(); return { cx:r.left+r.width/2, cy:r.top+r.height/2 } }

  useEffect(() => {
    const onMove = e => { if (!active.current) return; const {cx,cy}=center(); apply(e.clientX-cx,e.clientY-cy) }
    const onUp   = () => { if (active.current) release() }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  return (
    <div ref={baseRef} className="rg-joy-base"
      onTouchStart={e => { e.preventDefault(); active.current=true; const t=e.targetTouches[0]; const {cx,cy}=center(); apply(t.clientX-cx,t.clientY-cy) }}
      onTouchMove={e  => { e.preventDefault(); if (!active.current) return; const t=e.targetTouches[0]; const {cx,cy}=center(); apply(t.clientX-cx,t.clientY-cy) }}
      onTouchEnd={() => release()} onTouchCancel={() => release()}
      onMouseDown={e => { active.current=true; const {cx,cy}=center(); apply(e.clientX-cx,e.clientY-cy) }}
    >
      <div ref={knobRef} className="rg-joy-knob" />
    </div>
  )
}

// ── fmtTime helper ─────────────────────────────────────────────────────
function fmtTime(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s) % 60
  return `${m}:${String(sec).padStart(2,'0')}`
}

// ── Main 3D scene init ─────────────────────────────────────────────────
function initScene(canvas, { localSessionId, getRoomState, sendInput, sendEmote, timerDomRef, staminaDomRef, followBallRef }) {
  const engine = new Engine(canvas, true, { adaptToDeviceRatio: true, stencil: true })
  const scene  = new Scene(engine)

  const camera = new FreeCamera('cam', new Vector3(0,5,20), scene)
  camera.inputs.clear(); camera.minZ = 0.1; camera.maxZ = 450

  const sg         = buildWorld(scene)
  const { ball, disc } = createBallMesh(scene, sg)
  const particles  = new ParticlePool(scene, 50)

  try {
    const pipe = new DefaultRenderingPipeline('pipe', true, scene, [camera])
    pipe.bloomEnabled = true; pipe.bloomThreshold = 0.75; pipe.bloomWeight = 0.35
    pipe.bloomKernel  = 96;   pipe.bloomScale = 0.6
    pipe.vignetteEnabled = true; pipe.vignetteWeight = 1.2
    pipe.imageProcessingEnabled = true
    pipe.imageProcessing.contrast = 1.14; pipe.imageProcessing.exposure = 1.18
    pipe.sharpenEnabled = true; pipe.sharpen.edgeAmount = 0.28
  } catch {}

  const playerInstances = new Map()   // sessionId → PlayerInstance
  const joyRef = { current: { x: 0, z: 0 } }
  const keys   = {}
  const lastEmoteSeq = new Map()   // sessionId → last emoteSeq we played
  const onKD   = e => {
    keys[e.code] = true
    // Emotes: tell the server so EVERYONE sees them (incl. yourself)
    const map = { Digit1:'hip_hop', Digit2:'breakdance', Digit3:'verloren',
                  Numpad1:'hip_hop', Numpad2:'breakdance', Numpad3:'verloren' }
    if (map[e.code]) sendEmote?.(map[e.code])
  }
  const onKU = e => { keys[e.code] = false }
  window.addEventListener('keydown', onKD)
  window.addEventListener('keyup',   onKU)

  const camPos    = new Vector3(0, 5, 20)
  const camLookAt = new Vector3(0, 1.5, 0)
  let goalFlashing = false
  let camInit      = false

  // Locally-predicted pose for the local player (no input lag)
  const pred = { x: 0, z: 0, rotY: 0, init: false }
  // Interpolated ball position
  const ballDisp = { x: 0, y: BALL_RADIUS, z: 0, init: false }

  scene.registerBeforeRender(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05)
    const rs = getRoomState()
    if (!rs) return

    if (timerDomRef?.current) {
      timerDomRef.current.textContent = fmtTime(Math.max(0, rs.timeLeft ?? 0))
    }

    // ── Stamina bar (local player) ──
    if (staminaDomRef?.current) {
      const lp = rs.players.get(localSessionId)
      const s  = Math.max(0, Math.min(1, lp?.stamina ?? 1))
      staminaDomRef.current.style.width = (s * 100) + '%'
      // green when full-ish, orange mid, red low
      staminaDomRef.current.style.background =
        s > 0.5 ? 'linear-gradient(90deg,#06d6a0,#11e0a8)'
      : s > 0.2 ? 'linear-gradient(90deg,#f0a020,#ffc24d)'
      :           'linear-gradient(90deg,#e84343,#ff6b6b)'
    }

    // ── Ball: interpolate toward server position ──
    const b = rs.ball
    if (b) {
      if (!ballDisp.init) { ballDisp.x=b.x; ballDisp.y=b.y; ballDisp.z=b.z; ballDisp.init=true }
      const Lb = 1 - Math.exp(-dt * 26)
      ballDisp.x += (b.x - ballDisp.x) * Lb
      ballDisp.y += (b.y - ballDisp.y) * Lb
      ballDisp.z += (b.z - ballDisp.z) * Lb
      ball.position.set(ballDisp.x, ballDisp.y, ballDisp.z)
      disc.position.x = ballDisp.x + (ballDisp.y - BALL_RADIUS) * 0.4
      disc.position.z = ballDisp.z; disc.position.y = 0.01
      const h = ballDisp.y - BALL_RADIUS
      disc.scaling.x = 1 + h*0.12; disc.scaling.z = (1+h*0.12)*1.35
      disc.material.alpha = Math.max(0.04, 0.35 - h*0.06)
    }

    // ── Local input — CAMERA-RELATIVE ──
    // f = forward (away from camera), r = right (screen-right)
    const f = (keys['ArrowUp']    ? 1 : 0) - (keys['ArrowDown'] ? 1 : 0) - joyRef.current.z
    const r = (keys['ArrowRight'] ? 1 : 0) - (keys['ArrowLeft'] ? 1 : 0) + joyRef.current.x

    // camera forward on the XZ plane (from last frame's camera)
    let cfX = camLookAt.x - camPos.x
    let cfZ = camLookAt.z - camPos.z
    const clen = Math.hypot(cfX, cfZ) || 1
    cfX /= clen; cfZ /= clen
    const crX = cfZ, crZ = -cfX   // camera-right vector

    let wx = crX * r + cfX * f
    let wz = crZ * r + cfZ * f
    const wlen = Math.hypot(wx, wz)
    if (wlen > 1) { wx /= wlen; wz /= wlen }

    const inp = { x: wx, z: wz, boost: !!keys['Space'] }
    sendInput(inp)

    // ── Players ──
    rs.players.forEach((p, sid) => {
      if (!playerInstances.has(sid)) {
        const wearing   = (() => { try { return JSON.parse(p.wearing || '{}') } catch { return {} } })()
        const teamColor = p.team === 0 ? '#cc2222' : '#1a55cc'
        const inst = new PlayerInstance(scene, sg, { shirt: p.shirt, wearing, teamColor, name: p.name })
        playerInstances.set(sid, inst)
        if (sid === localSessionId) { pred.x = p.x; pred.z = p.z; pred.rotY = p.rotY; pred.init = true }
      }
      const inst = playerInstances.get(sid)

      if (sid === localSessionId) {
        // Client-side prediction — same movement math as the server
        if (!pred.init) { pred.x = p.x; pred.z = p.z; pred.rotY = p.rotY; pred.init = true }
        const moving = rs.phase === 'playing'
        const canBoost = inp.boost && (p.stamina ?? 0) > 0
        const spd = canBoost ? BOOST_SPEED : PLAYER_SPEED
        const vx = moving ? inp.x * spd : 0
        const vz = moving ? inp.z * spd : 0
        const pr = resolveBoundary(pred.x + vx*dt, pred.z + vz*dt, PLAYER_RADIUS)
        pred.x = pr.x; pred.z = pr.z
        const ms = Math.hypot(vx, vz)
        if (ms > 0.05) {
          const target = Math.atan2(vx, vz)
          let diff = target - pred.rotY
          while (diff >  Math.PI) diff -= Math.PI*2
          while (diff < -Math.PI) diff += Math.PI*2
          pred.rotY += diff * Math.min(1, 14*dt)
        }
        // gentle reconcile toward server (corrects drift without snapping)
        const Lr = 1 - Math.exp(-dt * 3)
        pred.x += (p.x - pred.x) * Lr
        pred.z += (p.z - pred.z) * Lr
        inst.setPose(pred.x, pred.z, pred.rotY, vx, vz, canBoost)
      } else {
        inst.setTarget(p.x, p.z, p.rotY, p.vx, p.vz, p.boosting)
        inst.tick(dt, 13)
      }

      // Emotes — play when the server's emoteSeq changes (all players)
      if (p.emoteSeq && lastEmoteSeq.get(sid) !== p.emoteSeq) {
        lastEmoteSeq.set(sid, p.emoteSeq)
        inst.playEmote(p.emote)
      }
    })
    playerInstances.forEach((inst, sid) => {
      if (!rs.players.has(sid)) { inst.dispose(); playerInstances.delete(sid) }
    })

    // Goal flash + particles
    if (rs.phase === 'goal' && !goalFlashing) {
      goalFlashing = true
      particles.burst(new Vector3(0, GOAL_H/2, 0), 40,
        ['#FFD700','#FF6B35','#FFFFFF','#4FC3F7','#06D6A0'])
      playCrowdCheer()
    }
    if (rs.phase !== 'goal') goalFlashing = false
    particles.update(dt)

    // ── Camera (Rocket League style) ──
    if (pred.init) {
      const px = pred.x, pz = pred.z
      const CAM_DIST = 9, CAM_HEIGHT = 4.0
      const followBall = followBallRef?.current ?? false

      // "backward" unit vector = where the camera sits relative to the car
      let backX, backZ
      if (followBall) {
        // Ball cam: camera sits behind the car ON the car→ball line,
        // so the ball is always centred ahead of you.
        let dx = px - ballDisp.x, dz = pz - ballDisp.z
        const len = Math.hypot(dx, dz)
        if (len > 0.4) { backX = dx/len; backZ = dz/len }
        else { backX = Math.sin(pred.rotY) * -1; backZ = Math.cos(pred.rotY) * -1 }
      } else {
        // Forward cam: directly behind the car, looking where it faces.
        backX = -Math.sin(pred.rotY); backZ = -Math.cos(pred.rotY)
      }

      const desiredX = px + backX * CAM_DIST
      const desiredZ = pz + backZ * CAM_DIST
      const desiredY = CAM_HEIGHT

      if (!camInit) {
        camPos.set(desiredX, desiredY, desiredZ); camInit = true
      } else {
        const Lp = 1 - Math.exp(-dt * 8)
        camPos.x += (desiredX - camPos.x) * Lp
        camPos.y += (desiredY - camPos.y) * Lp
        camPos.z += (desiredZ - camPos.z) * Lp
      }

      const Ll = 1 - Math.exp(-dt * 11)
      if (followBall) {
        // Aim at a point a bit beyond the ball so both car and ball stay in frame
        camLookAt.x += (ballDisp.x       - camLookAt.x) * Ll
        camLookAt.y += (ballDisp.y + 0.8 - camLookAt.y) * Ll
        camLookAt.z += (ballDisp.z       - camLookAt.z) * Ll
      } else {
        const fwdX = Math.sin(pred.rotY), fwdZ = Math.cos(pred.rotY)
        camLookAt.x += (px + fwdX*10 - camLookAt.x) * Ll
        camLookAt.y += (1.2          - camLookAt.y) * Ll
        camLookAt.z += (pz + fwdZ*10 - camLookAt.z) * Ll
      }
      camera.position.copyFrom(camPos)
      camera.setTarget(camLookAt)
    }
  })

  engine.runRenderLoop(() => scene.render())
  window.addEventListener('resize', () => engine.resize())

  return {
    joyRef,
    dispose: () => {
      window.removeEventListener('keydown', onKD)
      window.removeEventListener('keyup',   onKU)
      playerInstances.forEach(inst => inst.dispose())
      particles.dispose()
      engine.stopRenderLoop()
      scene.dispose()
      engine.dispose()
    },
  }
}

// ── Lobby ──────────────────────────────────────────────────────────────
function Lobby({ onBack, onJoined }) {
  const [code,    setCode]    = useState('')
  const [name,    setName]    = useState(() => localStorage.getItem('kk_playername') || '')
  const [error,   setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  const connect = async (create) => {
    setLoading(true); setError(null)
    try {
      const shirt    = localStorage.getItem('kk_shirt') || ''
      const wearing  = localStorage.getItem('kk_wearing') || '{}'
      const client   = new Colyseus.Client(SERVER_URL)
      // Numeric 5-digit lobby code (host generates one, joiner types it)
      const joinCode = create ? String(Math.floor(10000 + Math.random() * 90000)) : code.trim()
      const opts     = { joinCode, shirt, wearing, name: name || 'Speler' }
      const room     = create
        ? await client.create('rocket', opts)
        : await client.join('rocket', opts)   // joins only an existing matching room
      if (name) localStorage.setItem('kk_playername', name)
      onJoined(room, joinCode)
    } catch {
      setError(create ? 'Kan geen lobby aanmaken.' : 'Lobby niet gevonden.')
      setLoading(false)
    }
  }

  return (
    <div className="rg-lobby">
      <button className="rg-back" onClick={onBack}>← Menu</button>
      <div className="rg-lobby-box">
        <div className="rg-lobby-icon">⚽</div>
        <h1 className="rg-lobby-title">Potje <span>Voetballen</span></h1>
        <p className="rg-lobby-sub">Speel met vrienden</p>

        <div className="rg-lobby-field">
          <label>Jouw naam</label>
          <input className="rg-input" placeholder="Speler" value={name} maxLength={12}
            onChange={e => setName(e.target.value)} />
        </div>

        <button className="rg-lobby-btn rg-lobby-create" disabled={loading} onClick={() => connect(true)}>
          {loading ? '…' : '＋ Lobby aanmaken'}
        </button>

        <div className="rg-lobby-divider">of</div>

        <div className="rg-lobby-field">
          <label>Lobby-code</label>
          <input className="rg-input rg-input-code" placeholder="12345"
            value={code} maxLength={5} inputMode="numeric"
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && connect(false)} />
        </div>

        <button className="rg-lobby-btn rg-lobby-join" disabled={loading || !code.trim()} onClick={() => connect(false)}>
          {loading ? '…' : '→ Joinen'}
        </button>

        {error && <p className="rg-lobby-error">{error}</p>}
      </div>
    </div>
  )
}

// ── Waiting room ───────────────────────────────────────────────────────
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
            <div key={i} className="rg-waiting-player">
              <span className={`rg-team-dot rg-team-${p.team}`} />
              <span>{p.name || 'Speler'}</span>
            </div>
          ))}
        </div>
        <button className="rg-lobby-btn rg-lobby-create" onClick={() => room?.send('start')}>
          ▶ Start spel
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────
export default function RocketGame({ onBack }) {
  const [screen,     setScreen]     = useState('lobby')
  const [room,       setRoom]       = useState(null)
  const [roomState,  setRoomState]  = useState(null)
  const [players,    setPlayers]    = useState([])
  const [goalFlash,  setGoalFlash]  = useState(false)
  const [followBall, setFollowBall] = useState(true)
  const [loading,    setLoading]    = useState(true)
  const [showHint,   setShowHint]   = useState(true)
  const [lobbyCode,  setLobbyCode]  = useState('')

  const canvasRef      = useRef(null)
  const sceneRef       = useRef(null)
  const roomStateRef   = useRef(null)
  const roomRef        = useRef(null)
  const timerDomRef    = useRef(null)
  const staminaDomRef  = useRef(null)
  const followBallRef  = useRef(true)

  useEffect(() => { roomStateRef.current = roomState }, [roomState])
  useEffect(() => { roomRef.current = room }, [room])

  const handleJoined = useCallback((r, code) => {
    setRoom(r); roomRef.current = r
    setLobbyCode(code || '')

    r.onStateChange(state => {
      setRoomState(state); roomStateRef.current = state
      const arr = []
      state.players.forEach((p, sid) => arr.push({ sid, name: p.name, team: p.team }))
      setPlayers(arr)
      if (state.phase === 'playing' || state.phase === 'countdown') setScreen('playing')
      if (state.phase === 'gameover') setScreen('gameover')
      if (state.phase === 'goal') {
        setGoalFlash(true); setTimeout(() => setGoalFlash(false), 2200)
      }
    })
    r.onLeave(() => { setScreen('lobby'); setRoom(null) })
    setScreen('waiting')
  }, [])

  useEffect(() => {
    if (screen !== 'playing' || !canvasRef.current || !room) return
    setLoading(true)
    const sc = initScene(canvasRef.current, {
      localSessionId: room.sessionId,
      getRoomState:   () => roomStateRef.current,
      sendInput:      inp => roomRef.current?.send('input', inp),
      sendEmote:      name => roomRef.current?.send('emote', name),
      timerDomRef,
      staminaDomRef,
      followBallRef,
    })
    sceneRef.current = sc
    setLoading(false)
    setTimeout(() => setShowHint(false), 6000)
    return () => { sc.dispose(); sceneRef.current = null }
  }, [screen, room])

  useEffect(() => { return () => { roomRef.current?.leave() } }, [])

  const toggleCamera = () => {
    const next = !followBallRef.current
    followBallRef.current = next; setFollowBall(next)
  }

  if (screen === 'lobby')   return <Lobby onBack={onBack} onJoined={handleJoined} />
  if (screen === 'waiting') return (
    <WaitingRoom code={lobbyCode} room={room} players={players}
      onBack={() => { room?.leave(); setScreen('lobby') }} />
  )

  if (screen === 'gameover') {
    const rs = roomState
    return (
      <div className="rg-gameover">
        <div className="rg-gameover-box">
          <div className="rg-go-title">Tijd is om! ⏱</div>
          <div className="rg-go-score">{rs?.scoreA ?? 0} — {rs?.scoreB ?? 0}</div>
          <div className="rg-go-winner">
            {(rs?.scoreA??0) > (rs?.scoreB??0) ? '🔴 Rood wint!'
            : (rs?.scoreB??0) > (rs?.scoreA??0) ? '🔵 Blauw wint!' : '🤝 Gelijkspel!'}
          </div>
          <button className="rg-lobby-btn rg-lobby-create" onClick={() => { room?.leave(); onBack() }}>
            ← Terug
          </button>
        </div>
      </div>
    )
  }

  const rs = roomState
  return (
    <div className="rg-outer">
      <canvas ref={canvasRef} className="rg-canvas" />

      <button className="rg-back" onClick={() => { room?.leave(); onBack() }}>← Menu</button>

      <div className="rg-score">
        <span className="rg-score-a">🔴 {rs?.scoreA ?? 0}</span>
        <span ref={timerDomRef} className="rg-score-timer">2:00</span>
        <span className="rg-score-b">{rs?.scoreB ?? 0} 🔵</span>
      </div>

      <button className="rg-cam-btn" onClick={toggleCamera}>
        {followBall ? '📷 Bal' : '📷 Speler'}
      </button>

      {rs?.phase === 'countdown' && (
        <div className="rg-countdown">{rs.countdown}</div>
      )}

      {goalFlash && <div className="rg-goal-flash">GOAL! 🎉</div>}

      <div className="rg-stamina">
        <span className="rg-stamina-icon">⚡</span>
        <div className="rg-stamina-track">
          <div ref={staminaDomRef} className="rg-stamina-fill" />
        </div>
      </div>

      {sceneRef.current && <VirtualJoystick joyRef={sceneRef.current.joyRef} />}

      <div className={`rg-hint ${showHint ? 'rg-hint-show' : ''}`}>
        <div className="rg-hint-row"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Bewegen</div>
        <div className="rg-hint-row"><kbd>Spatie</kbd> Boost</div>
        <div className="rg-hint-row"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> Emotes</div>
      </div>

      {loading && (
        <div className="rg-loading">
          <div className="rg-spinner" />
          <span>Laden…</span>
        </div>
      )}
    </div>
  )
}
