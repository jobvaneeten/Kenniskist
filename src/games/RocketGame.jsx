import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Engine, Scene, FreeCamera,
  Color3, Vector3, Quaternion,
  MeshBuilder, StandardMaterial, DynamicTexture,
  DefaultRenderingPipeline, TrailMesh,
} from '@babylonjs/core'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'
import { findItem } from '../itemsCatalog'
import { applyItemToMesh, loadClothingDonor, usesDonor, loadHeadItem, zetLegeOnderdelenUit } from '../applyClothing'
import OrientationGate from '../OrientationGate'
import { bouwStadion } from './voetbalStadion'
import './rocket-game.css'
import { TerugKnop } from '../ui/index.jsx'
import { maakOfJoin, nieuweCode, FOUT_TEKST } from './online/verbinding.js'
import VerbindingsMelding from './online/VerbindingsMelding.jsx'
import Joystick, { ActieKnop } from './online/Joystick.jsx'
import Icoon from './online/Iconen.jsx'
import { heeftAanraak, schermVol } from './online/apparaat.js'
import { StartScherm, Wachtkamer, TeamEinde, ScoreBalk, HudKnoppen, HudKnop, Aftelling, Flits, Balk } from './online/Schermen.jsx'
import { laadAnimatieBron, kopieVoorSpeler } from './online/animaties.js'
import { autoKwaliteit } from './online/kwaliteit.js'

// Veld, doelen en rand: één bron met de server (online/gedeeld/voetbalVeld.js).
import {
  FIELD_HALF, GOAL_Z, GOAL_HALF_W, GOAL_H, BALL_RADIUS,
  GOAL_DEPTH, BOUND, CORNER_R, bewegSpeler,
} from './online/gedeeld/voetbalVeld.js'
const ACCENT = '#3dffa2'   // neongroen: de kleur van het voetbalspel in menu en HUD

const RETARGET_BONES = new Set([
  'Root','Hips','Spine','Spine1','Neck','Head',
  'LeftShoulder','LeftArm','LeftForeArm','LeftHand',
  'RightShoulder','RightArm','RightForeArm','RightHand',
  'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase',
  'RightUpLeg','RightLeg','RightFoot','RightToeBase',
])
const CLOTHING_NAMES = new Set(['Shirt','Broek','Sokken','Schoenen'])
const FACE_NAMES     = new Set(['Gezicht','Face','Ogen','Eyes','Wenkbrauwen','Eyebrows','Mond','Mouth','Neus','Nose'])
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
    this._donors    = []
    this._load()
  }

  _load() {
    SceneLoader.ImportMesh('', '/', 'Poppetje.glb', this.scene, (meshes, _ps, skels) => {
      zetLegeOnderdelenUit(meshes)
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
        if (usesDonor(key, item)) {
          loadClothingDonor(this.scene, m, this._skeleton, key, item, (g) => { this._donors.push(g) })
        } else {
          applyItemToMesh(this.scene, m, item)
          m.setEnabled(true)
        }
      })

      // Pet (hoofd): standalone GLB tinted to a colour, follows the Head bone
      const headKey = this.opts.wearing?.hoofd
      if (headKey) {
        const headItem = findItem('hoofd', headKey)
        if (headItem) {
          const parent = meshes.find(m => CLOTHING_NAMES.has(m.name))?.parent || this.root
          loadHeadItem(this.scene, parent, this._skeleton, headItem,
            this.opts.wearing?.hoofdStance || 'normaal',
            (g) => { this._donors.push(g); this.sg?.addShadowCaster(g) })
        }
      }

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
      // elk bestand één keer per potje geladen (online/animaties.js), per speler een kopie
      ANIMS.forEach(({ key, file, stripRoot }) => {
        laadAnimatieBron(this.scene, file).then(({ groep: orig, srcRests }) => {
          if (this._disposed) return
          const rt = kopieVoorSpeler({ groep: orig }, key, this.scene, t =>
            RETARGET_BONES.has(t.name) ? (this._nodeMap[t.name] ?? null) : null
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
          rt.stop(); this._anims[key] = rt; done()
        }).catch(() => done())
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
    // nog niet alle animaties binnen: geen stand onthouden die nergens speelt
    if (!this._ready || this._state === 'emote') return
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
    this._disposed = true   // animaties die nog binnenkomen niet meer koppelen
    this._stopAll()
    Object.values(this._anims).forEach(g => { try { g.dispose() } catch {} })
    this._donors.forEach(g => { try { g.dispose() } catch {} })
    this.root?.dispose?.()
  }
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

// ── Neonring onder elke speler, in de teamkleur ────────────────────────
// Op een vol veld zie je zo in één oogopslag wie bij wie hoort. Je eigen
// ring is groter en heeft een pijl in je kijkrichting.
const RING_KLEUR = ['#ff4d6d', '#4d9bff']
function ringTextuur(scene, ik) {
  const t = new DynamicTexture('ringTex' + (ik ? 'Ik' : ''), { width: 128, height: 128 }, scene, true)
  const c = t.getContext()
  c.clearRect(0, 0, 128, 128)
  c.strokeStyle = '#fff'; c.lineCap = 'round'
  c.shadowColor = '#fff'; c.shadowBlur = 10
  c.lineWidth = ik ? 7 : 6
  if (ik) {
    // open ring met een pijl naar voren (boven in de textuur = kijkrichting)
    c.beginPath(); c.arc(64, 64, 46, -Math.PI / 2 + 0.5, Math.PI * 1.5 - 0.5); c.stroke()
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(64, 2); c.lineTo(80, 26); c.lineTo(48, 26); c.closePath(); c.fill()
  } else {
    c.setLineDash([34, 14]); c.beginPath(); c.arc(64, 64, 48, 0, Math.PI * 2); c.stroke()
  }
  t.update(); t.hasAlpha = true
  return t
}
function maakRing(scene, team, ik) {
  const d = MeshBuilder.CreateGround('spelerRing', { width: ik ? 2.5 : 1.9, height: ik ? 2.5 : 1.9 }, scene)
  const m = new StandardMaterial('spelerRingMat', scene)
  m.diffuseTexture = ringTextuur(scene, ik); m.useAlphaFromDiffuseTexture = true
  m.disableLighting = true; m.diffuseColor = Color3.Black(); m.specularColor = Color3.Black()
  m.emissiveColor = Color3.FromHexString(RING_KLEUR[team] ?? '#ffffff').scale(ik ? 1.5 : 1.1)
  m.alpha = ik ? 1 : 0.85
  d.material = m; d.position.y = 0.05; d.isPickable = false; d.setEnabled(false)
  d.onDisposeObservable.add(() => { m.diffuseTexture?.dispose(); m.dispose() })
  return d
}

// Lichtspoor achter de bal: alleen te zien als hij hard gaat (schot).
function maakBalSpoor(scene, ball) {
  const spoor = new TrailMesh('balSpoor', ball, scene, BALL_RADIUS * 0.8, 22, true)
  const m = new StandardMaterial('balSpoorMat', scene)
  m.disableLighting = true; m.emissiveColor = new Color3(1, 0.85, 0.3); m.alpha = 0.55; m.backFaceCulling = false
  spoor.material = m; spoor.isPickable = false; spoor.visibility = 0
  return spoor
}

// ── fmtTime helper ─────────────────────────────────────────────────────
function fmtTime(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s) % 60
  return `${m}:${String(sec).padStart(2,'0')}`
}

// ── Main 3D scene init ─────────────────────────────────────────────────
function initScene(canvas, { localSessionId, getRoomState, sendInput, sendEmote, timerDomRef, staminaDomRef, followBallRef }) {
  const engine = new Engine(canvas, true, { adaptToDeviceRatio: true, stencil: true, powerPreference: 'high-performance', loseContextOnDispose: true })
  // Cap render resolution on very high-DPI screens (phones) to save GPU.
  if (window.devicePixelRatio > 1.5) engine.setHardwareScalingLevel(window.devicePixelRatio / 1.5)
  const scene  = new Scene(engine)

  const camera = new FreeCamera('cam', new Vector3(0,5,20), scene)
  camera.inputs.clear(); camera.minZ = 0.1; camera.maxZ = 450

  const { sg, stadion } = bouwStadion(scene, { half: FIELD_HALF, bound: BOUND, cornerR: CORNER_R, goalZ: GOAL_Z, goalHalfW: GOAL_HALF_W, goalH: GOAL_H, goalDepth: GOAL_DEPTH })
  const { ball, disc } = createBallMesh(scene, sg)
  const particles  = new ParticlePool(scene, 50)
  const ringen     = new Map()   // sessionId → neonring onder de speler
  const spoor      = maakBalSpoor(scene, ball)

  let pipe = null
  try {
    pipe = new DefaultRenderingPipeline('pipe', false, scene, [camera])   // no MSAA
    pipe.bloomEnabled = true; pipe.bloomThreshold = 0.8; pipe.bloomWeight = 0.3
    pipe.bloomKernel  = 32;   pipe.bloomScale = 0.5    // lighter bloom
    pipe.vignetteEnabled = true; pipe.vignetteWeight = 1.0
    pipe.imageProcessingEnabled = true
    pipe.imageProcessing.contrast = 1.12; pipe.imageProcessing.exposure = 1.15
    pipe.sharpenEnabled = false   // sharpen is costly, drop it
  } catch {}

  const playerInstances = new Map()   // sessionId → PlayerInstance
  const joyRef   = { current: { x: 0, z: 0 } }
  const boostRef = { current: false }   // on-screen boost button
  const passRef  = { current: false }   // pass-mode toggle (harder kick on contact)
  const keys     = {}
  const laatsteInput = { t: 0, inp: null }   // wanneer de besturing voor het laatst naar de server ging
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
    stadion.scorebord(rs.scoreA ?? 0, rs.scoreB ?? 0, fmtTime(Math.max(0, rs.timeLeft ?? 0)))

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
      // spoor: onzichtbaar bij rollen, fel bij een hard schot
      const snel = Math.hypot(b.vx ?? 0, b.vz ?? 0)
      spoor.visibility += (Math.min(1, Math.max(0, (snel - 7) / 10)) - spoor.visibility) * Math.min(1, dt * 8)
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

    const inp = { x: wx, z: wz, boost: !!keys['Space'] || boostRef.current, pass: passRef.current }
    // Niet elk beeldje een bericht (60-120 per seconde): alleen als de
    // besturing echt verandert, en anders 15× per seconde. De server onthoudt
    // de laatste besturing.
    const nuMs = performance.now(), vorig = laatsteInput.inp
    const anders = !vorig || vorig.boost !== inp.boost || vorig.pass !== inp.pass ||
      Math.abs(vorig.x - inp.x) > 0.08 || Math.abs(vorig.z - inp.z) > 0.08
    if ((anders && nuMs - laatsteInput.t > 33) || nuMs - laatsteInput.t > 66) {
      sendInput(inp); laatsteInput.inp = inp; laatsteInput.t = nuMs
    }

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
        // zelfde stap als de server (online/gedeeld/voetbalVeld.js), op een kopie:
        // de sprint-energie zelf blijft van de server komen
        const q = { x: pred.x, z: pred.z, rotY: pred.rotY, stamina: p.stamina ?? 0, vx: 0, vz: 0, boosting: false }
        bewegSpeler(q, moving ? inp : { x: 0, z: 0, boost: false }, dt)
        pred.x = q.x; pred.z = q.z; pred.rotY = q.rotY
        const vx = q.vx, vz = q.vz, canBoost = q.boosting
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

      // neonring volgt de speler (pas zichtbaar als het poppetje geladen is)
      if (!ringen.has(sid)) ringen.set(sid, maakRing(scene, p.team, sid === localSessionId))
      const ring = ringen.get(sid), plek = inst.root?.position
      ring.setEnabled(!!plek)
      if (plek) {
        ring.position.x = plek.x; ring.position.z = plek.z
        if (sid === localSessionId) ring.rotation.y = pred.rotY
        else ring.rotation.y += dt * 1.2
      }
    })
    playerInstances.forEach((inst, sid) => {
      if (!rs.players.has(sid)) { inst.dispose(); playerInstances.delete(sid); ringen.get(sid)?.dispose(); ringen.delete(sid) }
    })

    // Goal flash + particles
    if (rs.phase === 'goal' && !goalFlashing) {
      goalFlashing = true
      particles.burst(new Vector3(ball.position.x, GOAL_H/2, ball.position.z), 50,   // vuurwerk in het doel waar de bal ligt
        ['#FFD700','#FF6B35','#FFFFFF','#4FC3F7','#06D6A0'])
      playCrowdCheer()
      stadion.juich()
    }
    if (rs.phase !== 'goal') goalFlashing = false
    particles.update(dt)
    stadion.update(dt)

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
  const onResize = () => engine.resize()
  window.addEventListener('resize', onResize)
  const stopKwaliteit = autoKwaliteit(engine, scene, { pipe, schaduw: sg })

  return {
    joyRef,
    boostRef,
    passRef,
    dispose: () => {
      stopKwaliteit()
      window.removeEventListener('keydown', onKD)
      window.removeEventListener('keyup',   onKU)
      window.removeEventListener('resize',  onResize)
      playerInstances.forEach(inst => inst.dispose())
      particles.dispose()
      engine.stopRenderLoop()
      scene.dispose()
      engine.dispose()
    },
  }
}

// ── Lobby ──────────────────────────────────────────────────────────────
function Lobby({ onBack, onJoined, melding }) {
  const [name,    setName]    = useState(() => localStorage.getItem('kk_playername') || '')
  const [error,   setError]   = useState(melding ?? null)
  const [loading, setLoading] = useState(false)
  const [status,  setStatus]  = useState(null)

  const connect = async (create, code = '') => {
    setLoading(true); setError(null)
    try {
      const shirt    = localStorage.getItem('kk_shirt') || ''
      const wearing  = localStorage.getItem('kk_wearing') || '{}'
      // Code van 5 cijfers (maker krijgt er een, de rest typt hem over)
      const joinCode = create ? nieuweCode(5) : code.trim()
      const opts     = { joinCode, shirt, wearing, name: name || 'Speler' }
      const room     = await maakOfJoin('rocket', opts, { maak: create, onStatus: setStatus })
      if (name) localStorage.setItem('kk_playername', name)
      onJoined(room, joinCode)
    } catch (e) {
      setError(FOUT_TEKST[e?.soort] ?? FOUT_TEKST.server)
      setLoading(false); setStatus(null)
    }
  }

  return (
    <StartScherm
      accent={ACCENT} icoon="bal" titel={<>Potje <span>voetbal</span></>}
      sub="Rood tegen blauw. Wie na twee minuten de meeste doelpunten heeft, wint."
      onBack={onBack} naam={name} setNaam={setName} laden={loading} status={status} fout={error}
      onMaak={() => connect(true)} onJoin={c => connect(false, c)} />
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
  const [passMode,   setPassMode]   = useState(false)
  const [melding,    setMelding]    = useState(null)
  const [aanraak] = useState(heeftAanraak)

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
      state.players.forEach((p, sid) => arr.push({ sid, name: p.name, team: p.team, bot: p.isBot }))
      setPlayers(arr)
      if (state.phase === 'playing' || state.phase === 'countdown') setScreen('playing')
      if (state.phase === 'gameover') setScreen('gameover')
      // nog een keer: de server zet het potje terug in de wachtkamer
      if (state.phase === 'lobby') setScreen(s => (s === 'gameover' ? 'waiting' : s))
      if (state.phase === 'goal') {
        setGoalFlash(true); setTimeout(() => setGoalFlash(false), 2200)
      }
    })
    r.onLeave((code) => {
      // 4000 = zelf weggegaan; anders lukte terugkomen na wegvallen niet
      if (code !== 4000 && code !== 1000) setMelding('De verbinding met het potje is verbroken. Maak een nieuw potje of join opnieuw met de code.')
      setScreen('lobby'); setRoom(null)
    })
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

  const spelers = players.map(p => ({ sid: p.sid, naam: p.name, team: p.team, bot: p.bot, ik: p.sid === room?.sessionId }))

  if (screen === 'lobby')   return <Lobby onBack={onBack} onJoined={(r, c) => { setMelding(null); handleJoined(r, c) }} melding={melding} />
  if (screen === 'waiting') return (
    <>
      <Wachtkamer accent={ACCENT} teams niveaus code={lobbyCode} room={room} spelers={spelers}
        onStart={() => room?.send('start')} onBack={() => { room?.leave(); setScreen('lobby') }} />
      <VerbindingsMelding room={room} />
    </>
  )

  const rs = roomState
  if (screen === 'gameover') return (
    <TeamEinde a={rs?.scoreA ?? 0} b={rs?.scoreB ?? 0}
      onOpnieuw={room ? () => room.send('opnieuw') : null} onTerug={() => { room?.leave(); onBack() }} />
  )

  const zet = (ref, v) => { if (sceneRef.current) sceneRef.current[ref].current = v }
  return (
    <div className="rg-outer">
      <OrientationGate />
      <canvas ref={canvasRef} className="rg-canvas" />

      <TerugKnop onClick={() => { room?.leave(); onBack() }} />
      <VerbindingsMelding room={room} />

      <ScoreBalk a={rs?.scoreA ?? 0} b={rs?.scoreB ?? 0} timerRef={timerDomRef} />
      <HudKnoppen>
        <HudKnop icoon="vol" onClick={schermVol} title="Volledig scherm" aria-label="Volledig scherm" />
        <HudKnop icoon="camera" onClick={toggleCamera} title="Camera wisselen">{followBall ? 'Bal' : 'Speler'}</HudKnop>
      </HudKnoppen>

      {rs?.phase === 'countdown' && <Aftelling n={rs.countdown} />}
      {goalFlash && <Flits>Goal!</Flits>}

      <Balk icoon="bliksem" kleur={ACCENT} vulRef={staminaDomRef} />

      {sceneRef.current && <Joystick joyRef={sceneRef.current.joyRef} />}

      {/* Rechtsonder: hard schieten (aan/uit) en sprinten (ingedrukt houden) */}
      <div className="on-acties">
        <ActieKnop label="Schot" sub={passMode ? 'hard' : 'zacht'} kleur={ACCENT} aan={passMode}
          onTik={() => { const next = !passMode; setPassMode(next); zet('passRef', next) }}>
          <Icoon naam="pass" />
        </ActieKnop>
        <ActieKnop label="Sprint" kleur="var(--kk-gold)" onIn={() => zet('boostRef', true)} onUit={() => zet('boostRef', false)}>
          <Icoon naam="bliksem" />
        </ActieKnop>
      </div>

      {!aanraak && (
        <div className={`rg-hint ${showHint ? 'rg-hint-show' : ''}`}>
          <div className="rg-hint-row"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Bewegen</div>
          <div className="rg-hint-row"><kbd>Spatie</kbd> Sprint</div>
          <div className="rg-hint-row"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> Emotes</div>
        </div>
      )}

      {loading && (
        <div className="rg-loading">
          <span className="on-spinner groot" aria-hidden="true" />
          <span>Laden…</span>
        </div>
      )}
    </div>
  )
}
