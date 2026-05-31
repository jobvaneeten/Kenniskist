import { useState, useEffect, useRef, useCallback } from 'react'
import * as Colyseus from '@colyseus/sdk'
import {
  Engine, Scene, FreeCamera,
  Color3, Color4, Vector3, Quaternion,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  MeshBuilder, StandardMaterial, DynamicTexture, Texture,
  DefaultRenderingPipeline,
} from '@babylonjs/core'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'
import { SHIRT_COLORS } from '../data'
import './rocket-game.css'

const SERVER_URL   = 'wss://kenniskist-server.onrender.com'
const FIELD_HALF   = 38
const GOAL_Z       = 36
const GOAL_HALF_W  = 3.65
const GOAL_H       = 2.44
const BALL_RADIUS  = 0.22
const SHIRT_TEXTURE_KEYS = new Set(['ajax', 'psv'])
const CLOTHING_NAMES     = new Set(['Shirt', 'Broek', 'Sokken', 'Schoenen'])
const FACE_NAMES         = new Set(['Gezicht','Face','Ogen','Eyes','Wenkbrauwen','Eyebrows','Mond','Mouth','Neus','Nose'])

// ── Shirt GLB helper (same as Wardrobe) ─────────────────────────────────
function applyShirtGLB(scene, glbFile, poppetjeShirtMesh, poppetjeSkel, onDone) {
  SceneLoader.ImportMesh('', '/', glbFile, scene, (loadedMeshes, _ps, srcSkels) => {
    const glbShirt = loadedMeshes.find(lm => (lm.getTotalVertices?.() ?? 0) > 0)
    if (glbShirt && poppetjeSkel && poppetjeShirtMesh) {
      glbShirt.parent             = poppetjeShirtMesh.parent
      glbShirt.position           = new Vector3(0, 0, 0)
      glbShirt.rotationQuaternion = null
      glbShirt.scaling            = new Vector3(1, 1, 1)
      glbShirt.skeleton           = poppetjeSkel
      glbShirt.setEnabled(true)
    }
    loadedMeshes.forEach(lm => { if (lm !== glbShirt) { try { lm.dispose() } catch {} } })
    srcSkels?.[0]?.dispose()
    onDone?.(glbShirt)
  })
}

function applyColor(mesh, hex) {
  if (!mesh?.material) return
  const col = Color3.FromHexString(hex)
  const mat  = mesh.material.clone(mesh.material.name + '_c')
  mesh.material = mat
  if (mat.albedoColor !== undefined) { mat.albedoTexture = null; mat.albedoColor = col }
  else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = null; mat.diffuseColor = col }
}

// ── Build field (reused from FootballScene3D) ──────────────────────────
function buildField(scene) {
  scene.clearColor = new Color4(0.42, 0.65, 0.92, 1)

  const ambient = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene)
  ambient.intensity   = 0.55
  ambient.groundColor = new Color3(0.12, 0.20, 0.08)
  ambient.diffuse     = new Color3(0.75, 0.82, 1.0)

  const lightPos = [
    new Vector3(-FIELD_HALF - 8, 32,  FIELD_HALF + 8),
    new Vector3( FIELD_HALF + 8, 32,  FIELD_HALF + 8),
    new Vector3(-FIELD_HALF - 8, 32, -FIELD_HALF - 8),
    new Vector3( FIELD_HALF + 8, 32, -FIELD_HALF - 8),
  ]
  const lights = lightPos.map((pos, i) => {
    const l = new DirectionalLight('fl' + i, Vector3.Zero().subtract(pos).normalize(), scene)
    l.position = pos; l.intensity = 2.2
    l.diffuse  = new Color3(1.0, 0.98, 0.90)
    return l
  })
  const sg = new ShadowGenerator(2048, lights[0])
  sg.usePoissonSampling = true; sg.bias = 0.0003

  // Field texture
  const W = 1024, H = 1024
  const tex = new DynamicTexture('gt', { width: W, height: H }, scene)
  const ctx = tex.getContext()
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#28c428' : '#22b022'
    ctx.fillRect(0, i * (H / 14), W, H / 14)
  }
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 9; ctx.lineJoin = 'round'
  const pad = 28
  ctx.strokeRect(pad, pad, W - pad*2, H - pad*2)
  ctx.beginPath(); ctx.moveTo(pad, H/2); ctx.lineTo(W-pad, H/2); ctx.stroke()
  ctx.beginPath(); ctx.arc(W/2, H/2, 110, 0, Math.PI*2); ctx.stroke()
  tex.update()

  const ground = MeshBuilder.CreateGround('ground', { width: FIELD_HALF*2, height: FIELD_HALF*2 }, scene)
  ground.receiveShadows = true; ground.isPickable = false
  const gmat = new StandardMaterial('gmat', scene)
  gmat.diffuseTexture = tex; gmat.specularColor = new Color3(0.05, 0.05, 0.05)
  ground.material = gmat

  // Goals
  const postMat = new StandardMaterial('post', scene)
  postMat.diffuseColor = Color3.White(); postMat.emissiveColor = new Color3(0.14, 0.14, 0.14)
  const cyl = (x, y, z, h, d, rx=0, rz=0) => {
    const m = MeshBuilder.CreateCylinder('gp', { height: h, diameter: d, tessellation: 14 }, scene)
    m.material = postMat; m.isPickable = false; m.position.set(x, y, z)
    m.rotation.x = rx; m.rotation.z = rz
  }
  for (const gz of [-GOAL_Z, GOAL_Z]) {
    cyl(-GOAL_HALF_W, GOAL_H/2, gz, GOAL_H, 0.14)
    cyl( GOAL_HALF_W, GOAL_H/2, gz, GOAL_H, 0.14)
    cyl(0, GOAL_H, gz, GOAL_HALF_W*2+0.14, 0.12, 0, Math.PI/2)
  }

  // Fence
  const fenceMat = new StandardMaterial('fence', scene)
  fenceMat.diffuseColor = new Color3(0.12, 0.18, 0.10); fenceMat.alpha = 0.85
  fenceMat.backFaceCulling = false
  const H2 = 1.4, T = 0.12
  const sides = [
    { w: FIELD_HALF*2+T*2, d: T, x: 0, z:  FIELD_HALF },
    { w: FIELD_HALF*2+T*2, d: T, x: 0, z: -FIELD_HALF },
    { w: T, d: FIELD_HALF*2, x:  FIELD_HALF, z: 0 },
    { w: T, d: FIELD_HALF*2, x: -FIELD_HALF, z: 0 },
  ]
  sides.forEach(({ w, d, x, z }) => {
    const f = MeshBuilder.CreateBox('fence', { width: w, height: H2, depth: d }, scene)
    f.position.set(x, H2/2, z); f.material = fenceMat; f.isPickable = false
  })

  return sg
}

// ── Create ball mesh ───────────────────────────────────────────────────
function createBall(scene, sg) {
  const ball = MeshBuilder.CreateSphere('ball', { diameter: BALL_RADIUS*2, segments: 16 }, scene)
  ball.position.set(0, BALL_RADIUS, 0); ball.receiveShadows = true
  const mat = new StandardMaterial('ballMat', scene)
  const sz = 256
  const t  = new DynamicTexture('bt', { width: sz, height: sz }, scene)
  const c  = t.getContext()
  c.fillStyle = '#fff'; c.fillRect(0, 0, sz, sz)
  c.fillStyle = '#111'
  const r = sz * 0.15
  const hex = (cx, cy) => { c.beginPath(); for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2-Math.PI/6;c.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r)}; c.closePath(); c.fill() }
  hex(sz/2, sz/2)
  for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2;hex(sz/2+Math.cos(a)*r*2.55,sz/2+Math.sin(a)*r*2.55)}
  t.update(); mat.diffuseTexture = t; ball.material = mat
  if (sg) sg.addShadowCaster(ball)
  return ball
}

// ── PoppetjeInstance — one player's 3D character ───────────────────────
class PoppetjeInstance {
  constructor(scene, sg, sessionId, { shirt, wearing, teamColor, isLocal }) {
    this.scene     = scene
    this.sg        = sg
    this.sessionId = sessionId
    this.shirt     = shirt
    this.wearing   = wearing
    this.teamColor = teamColor
    this.isLocal   = isLocal
    this.root      = null
    this._skeleton = null
    this._shirtMesh = null
    this._shirtGLB  = null
    this._animGroups = {}
    this._state    = 'idle'
    this._ready    = false
    this._onReady  = null
    this._load()
  }

  _load() {
    SceneLoader.ImportMesh('', '/', 'Poppetje.glb', this.scene, (meshes, _ps, skels) => {
      this.root      = meshes[0]
      this._skeleton = skels[0] ?? null

      meshes.forEach(m => { this.sg?.addShadowCaster(m); m.receiveShadows = true })

      meshes.forEach(m => {
        if (!CLOTHING_NAMES.has(m.name)) return
        const key      = m.name.toLowerCase()
        const colorKey = key === 'shirt' ? this.shirt : this.wearing?.[key]
        if (!colorKey) { m.setEnabled(false); return }

        if (key === 'shirt' && SHIRT_TEXTURE_KEYS.has(colorKey)) {
          m.setEnabled(false)
          this._shirtMesh = m
          const glbFile = colorKey === 'ajax' ? 'ajaxshirt.glb' : 'psvshirt.glb'
          applyShirtGLB(this.scene, glbFile, m, this._skeleton, (g) => { this._shirtGLB = g })
          return
        }

        const col = SHIRT_COLORS.find(c => c.key === colorKey)
        if (col) { applyColor(m, col.hex); m.setEnabled(true) }
        else m.setEnabled(false)
      })

      // Team skin color
      if (this.teamColor) {
        const tc = Color3.FromHexString(this.teamColor)
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

      // Load idle + walk animations
      this._loadAnim('rust',   'rust.glb',         () => {
        this._loadAnim('lopen', 'emote_lopen.glb', () => {
          this._playIdle()
          this._ready = true
          this._onReady?.()
        })
      })
    })
  }

  _loadAnim(key, file, done) {
    SceneLoader.ImportMesh('', '/', file, this.scene, (aM, _p, _s, aG) => {
      aM.forEach(m => m.setEnabled(false))
      if (!aG.length) { done?.(); return }
      // Retarget animation to this character's nodes
      const nodeMap = {}
      this.scene.transformNodes.forEach(n => { nodeMap[n.name] = n })
      this.scene.meshes.forEach(m => { if (!nodeMap[m.name]) nodeMap[m.name] = m })
      const rt = aG[0].clone(this.sessionId + '_' + key, t => nodeMap[t.name] ?? t)
      rt.stop()
      this._animGroups[key] = rt
      aG[0].dispose()
      done?.()
    }, null, () => done?.())
  }

  _stopAll() { Object.values(this._animGroups).forEach(g => g?.stop()) }
  _playIdle() { this._stopAll(); this._animGroups['rust']?.play(true); this._state = 'idle' }
  _playWalk() {
    if (this._state === 'walk') return
    this._stopAll(); this._animGroups['lopen']?.play(true); this._state = 'walk'
  }

  update(x, z, rotY, isMoving) {
    if (!this.root) return
    this.root.position.set(x, 0, z)
    this.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(rotY + Math.PI, 0, 0)
    if (isMoving) this._playWalk()
    else this._playIdle()
  }

  onReady(cb) {
    if (this._ready) cb()
    else this._onReady = cb
  }

  dispose() {
    this._stopAll()
    Object.values(this._animGroups).forEach(g => { try { g.dispose() } catch {} })
    this._shirtGLB?.dispose?.()
    this.root?.dispose?.()
  }
}

// ── Main scene initialiser ─────────────────────────────────────────────
function initScene(canvas, { localSessionId, getRoomState, sendInput, onGoal }) {
  const engine = new Engine(canvas, true, { adaptToDeviceRatio: true })
  const scene  = new Scene(engine)

  const camera = new FreeCamera('cam', new Vector3(0, 12, 22), scene)
  camera.inputs.clear(); camera.minZ = 0.1; camera.maxZ = 450

  const sg   = buildField(scene)
  const ball = createBall(scene, sg)

  try {
    const pipe = new DefaultRenderingPipeline('pipe', true, scene, [camera])
    pipe.bloomEnabled = true; pipe.bloomThreshold = 0.75; pipe.bloomWeight = 0.28
    pipe.vignetteEnabled = true; pipe.vignetteWeight = 1.1
    pipe.imageProcessingEnabled = true; pipe.imageProcessing.contrast = 1.12
  } catch {}

  const poppetjes = new Map()  // sessionId → PoppetjeInstance

  const keys    = {}
  const onKD    = e => { keys[e.code] = true }
  const onKU    = e => { keys[e.code] = false }
  window.addEventListener('keydown', onKD)
  window.addEventListener('keyup',   onKU)

  const joyInput = { x: 0, z: 0 }

  // Camera smooth follow of local player
  const camPos    = new Vector3(0, 12, 22)
  const camLookAt = new Vector3(0, 1, 0)

  scene.registerBeforeRender(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05)
    const rs = getRoomState()
    if (!rs) return

    // Sync ball
    const b = rs.ball
    if (b) {
      ball.position.set(b.x, b.y, b.z)
    }

    // Sync players
    rs.players.forEach((p, sid) => {
      if (!poppetjes.has(sid)) {
        // New player — figure out what shirt/wearing they have
        // Server sends shirt key; for remote players use their shirt
        const isLocal   = sid === localSessionId
        const wearing   = isLocal
          ? (() => { try { return JSON.parse(localStorage.getItem('kk_wearing') || '{}') } catch { return {} } })()
          : {}
        const teamColor = p.team === 0 ? '#cc2222' : '#1a55cc'
        const inst = new PoppetjeInstance(scene, sg, sid, {
          shirt:      p.shirt,
          wearing,
          teamColor,
          isLocal,
        })
        poppetjes.set(sid, inst)
      }

      const inst = poppetjes.get(sid)
      const moving = Math.abs(p.vx) > 0.2 || Math.abs(p.vz) > 0.2
      inst.update(p.x, p.z, p.rotY, moving)
    })

    // Remove disconnected players
    poppetjes.forEach((inst, sid) => {
      if (!rs.players.has(sid)) {
        inst.dispose()
        poppetjes.delete(sid)
      }
    })

    // Local player input
    const lp  = rs.players.get(localSessionId)
    const inp = {
      x: (keys['ArrowLeft'] ? 1 : keys['ArrowRight'] ? -1 : 0) + joyInput.x,
      z: (keys['ArrowUp']   ? -1 : keys['ArrowDown']  ?  1 : 0) + joyInput.z,
      boost: !!keys['Space'],
    }
    if (Math.abs(inp.x) > 1) inp.x = Math.sign(inp.x)
    if (Math.abs(inp.z) > 1) inp.z = Math.sign(inp.z)
    sendInput(inp)

    // Camera follows local player
    if (lp) {
      const L = 1 - Math.exp(-dt * 8)
      camPos.x += (lp.x      - camPos.x) * L
      camPos.y += (8         - camPos.y) * L
      camPos.z += (lp.z + 18 - camPos.z) * L
      camLookAt.x += (lp.x - camLookAt.x) * L
      camLookAt.y += (1     - camLookAt.y) * L
      camLookAt.z += (lp.z  - camLookAt.z) * L
      camera.position.copyFrom(camPos)
      camera.setTarget(camLookAt)
    }
  })

  engine.runRenderLoop(() => scene.render())
  window.addEventListener('resize', () => engine.resize())

  return {
    setJoy: (x, z) => { joyInput.x = -x; joyInput.z = z },
    dispose: () => {
      window.removeEventListener('keydown', onKD)
      window.removeEventListener('keyup',   onKU)
      poppetjes.forEach(inst => inst.dispose())
      engine.stopRenderLoop()
      scene.dispose()
      engine.dispose()
    },
  }
}

// ── Joystick ────────────────────────────────────────────────────────────
function VirtualJoystick({ onMove }) {
  const baseRef = useRef(null)
  const knobRef = useRef(null)
  const active  = useRef(false)
  const RADIUS  = 52

  const apply = (dx, dy) => {
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) { dx = dx/len*RADIUS; dy = dy/len*RADIUS }
    onMove(dx/RADIUS, dy/RADIUS)
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px,${dy}px)`
  }
  const release = () => {
    active.current = false; onMove(0, 0)
    if (knobRef.current) knobRef.current.style.transform = 'translate(0,0)'
  }
  const center = () => { const r = baseRef.current.getBoundingClientRect(); return { cx: r.left + r.width/2, cy: r.top + r.height/2 } }

  return (
    <div ref={baseRef} className="rg-joy-base"
      onTouchStart={e => { e.preventDefault(); active.current = true; const t = e.targetTouches[0]; const {cx,cy}=center(); apply(t.clientX-cx, t.clientY-cy) }}
      onTouchMove={e  => { e.preventDefault(); if (!active.current) return; const t = e.targetTouches[0]; const {cx,cy}=center(); apply(t.clientX-cx, t.clientY-cy) }}
      onTouchEnd={() => release()} onTouchCancel={() => release()}
      onMouseDown={e => { active.current = true; const {cx,cy}=center(); apply(e.clientX-cx, e.clientY-cy) }}
    >
      <div ref={knobRef} className="rg-joy-knob" />
    </div>
  )
}

// ── Lobby screen ────────────────────────────────────────────────────────
function Lobby({ onBack, onJoined }) {
  const [code,    setCode]    = useState('')
  const [name,    setName]    = useState(() => localStorage.getItem('kk_playername') || '')
  const [error,   setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  const connect = async (create) => {
    setLoading(true); setError(null)
    try {
      const shirt   = localStorage.getItem('kk_shirt') || ''
      const client  = new Colyseus.Client(SERVER_URL)
      const options = { shirt, name: name || 'Speler' }
      const room    = create
        ? await client.create('rocket', options)
        : await client.joinById(code.trim(), options)
      if (name) localStorage.setItem('kk_playername', name)
      onJoined(room)
    } catch (e) {
      setError(create ? 'Kan geen lobby aanmaken.' : 'Lobby niet gevonden.')
      setLoading(false)
    }
  }

  return (
    <div className="rg-lobby">
      <button className="rg-back" onClick={onBack}>← Menu</button>
      <div className="rg-lobby-box">
        <div className="rg-lobby-icon">🚀</div>
        <h1 className="rg-lobby-title">Potje <span>Voetballen</span></h1>
        <p className="rg-lobby-sub">Speel met vrienden</p>

        <div className="rg-lobby-field">
          <label>Jouw naam</label>
          <input
            className="rg-input"
            placeholder="Speler"
            value={name}
            maxLength={12}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <button
          className="rg-lobby-btn rg-lobby-create"
          disabled={loading}
          onClick={() => connect(true)}
        >
          {loading ? '…' : '＋ Lobby aanmaken'}
        </button>

        <div className="rg-lobby-divider">of</div>

        <div className="rg-lobby-field">
          <label>Lobby-code</label>
          <input
            className="rg-input rg-input-code"
            placeholder="lHQYj-vF1"
            value={code}
            maxLength={12}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && connect(false)}
          />
        </div>

        <button
          className="rg-lobby-btn rg-lobby-join"
          disabled={loading || !code.trim()}
          onClick={() => connect(false)}
        >
          {loading ? '…' : '→ Joinen'}
        </button>

        {error && <p className="rg-lobby-error">{error}</p>}
      </div>
    </div>
  )
}

// ── Waiting room (lobby joined, waiting for start) ──────────────────────
function WaitingRoom({ room, players, onBack }) {
  const code = room?.roomId ?? '????'
  const start = () => room?.send('start')

  return (
    <div className="rg-waiting">
      <button className="rg-back" onClick={onBack}>← Menu</button>
      <div className="rg-waiting-box">
        <p className="rg-waiting-label">Lobby-code</p>
        <div className="rg-waiting-code">{code}</div>
        <p className="rg-waiting-hint">Deel deze code met vrienden</p>

        <div className="rg-waiting-players">
          {players.map((p, i) => (
            <div key={i} className="rg-waiting-player">
              <span className={`rg-team-dot rg-team-${p.team}`} />
              <span>{p.name || 'Speler'}</span>
            </div>
          ))}
        </div>

        <button className="rg-lobby-btn rg-lobby-create" onClick={start}>
          ▶ Start spel
        </button>
      </div>
    </div>
  )
}

// ── Main export ─────────────────────────────────────────────────────────
export default function RocketGame({ onBack }) {
  const [screen,    setScreen]    = useState('lobby')   // lobby | waiting | playing | gameover
  const [room,      setRoom]      = useState(null)
  const [roomState, setRoomState] = useState(null)
  const [players,   setPlayers]   = useState([])
  const [goalFlash, setGoalFlash] = useState(false)
  const [loading,   setLoading]   = useState(true)

  const canvasRef     = useRef(null)
  const sceneRef      = useRef(null)
  const roomStateRef  = useRef(null)
  const roomRef       = useRef(null)

  // Keep refs in sync
  useEffect(() => { roomStateRef.current = roomState }, [roomState])
  useEffect(() => { roomRef.current = room }, [room])

  const handleJoined = useCallback((r) => {
    setRoom(r)
    roomRef.current = r

    // Sync state on every patch
    r.onStateChange(state => {
      setRoomState(state)
      roomStateRef.current = state
      // Update player list for waiting room
      const arr = []
      state.players.forEach((p, sid) => arr.push({ sid, name: p.name, team: p.team, shirt: p.shirt }))
      setPlayers(arr)
      // Transition screens
      if (state.phase === 'playing' || state.phase === 'countdown') {
        setScreen('playing')
      }
      if (state.phase === 'gameover') setScreen('gameover')
      if (state.phase === 'goal') {
        setGoalFlash(true)
        setTimeout(() => setGoalFlash(false), 2200)
      }
    })

    r.onLeave(() => { setScreen('lobby'); setRoom(null) })
    setScreen('waiting')
  }, [])

  // Init 3D scene when entering playing screen
  useEffect(() => {
    if (screen !== 'playing' || !canvasRef.current || !room) return
    setLoading(true)

    const sc = initScene(canvasRef.current, {
      localSessionId: room.sessionId,
      getRoomState:   () => roomStateRef.current,
      sendInput:      (inp) => roomRef.current?.send('input', inp),
      onGoal:         () => {},
    })
    sceneRef.current = sc
    setLoading(false)

    return () => { sc.dispose(); sceneRef.current = null }
  }, [screen, room])

  // Cleanup room on unmount
  useEffect(() => {
    return () => { roomRef.current?.leave() }
  }, [])

  if (screen === 'lobby') return <Lobby onBack={onBack} onJoined={handleJoined} />

  if (screen === 'waiting') return (
    <WaitingRoom
      room={room}
      players={players}
      onBack={() => { room?.leave(); setScreen('lobby') }}
    />
  )

  if (screen === 'gameover') {
    const rs = roomState
    return (
      <div className="rg-gameover">
        <div className="rg-gameover-box">
          <div className="rg-go-title">Tijd is om! ⏱</div>
          <div className="rg-go-score">{rs?.scoreA ?? 0} — {rs?.scoreB ?? 0}</div>
          <div className="rg-go-winner">
            {(rs?.scoreA ?? 0) > (rs?.scoreB ?? 0) ? '🔴 Rood wint!'
            : (rs?.scoreB ?? 0) > (rs?.scoreA ?? 0) ? '🔵 Blauw wint!'
            : '🤝 Gelijkspel!'}
          </div>
          <button className="rg-lobby-btn rg-lobby-create" onClick={() => { room?.leave(); onBack() }}>
            ← Terug naar menu
          </button>
        </div>
      </div>
    )
  }

  // Playing screen
  const rs = roomState
  const timeLeft = Math.max(0, Math.floor(rs?.timeLeft ?? 180))
  const mins = Math.floor(timeLeft / 60)
  const secs = String(timeLeft % 60).padStart(2, '0')

  return (
    <div className="rg-outer">
      <canvas ref={canvasRef} className="rg-canvas" />

      <button className="rg-back" onClick={() => { room?.leave(); onBack() }}>← Menu</button>

      <div className="rg-score">
        <span className="rg-score-a">🔴 {rs?.scoreA ?? 0}</span>
        <span className="rg-score-timer">{mins}:{secs}</span>
        <span className="rg-score-b">{rs?.scoreB ?? 0} 🔵</span>
      </div>

      {rs?.phase === 'countdown' && (
        <div className="rg-countdown">{rs.countdown}</div>
      )}

      {goalFlash && <div className="rg-goal-flash">GOAL! 🎉</div>}

      <VirtualJoystick onMove={(x, z) => sceneRef.current?.setJoy(x, z)} />

      <div className="rg-hint">
        <span>↑↓←→ Bewegen</span>
        <span>SPATIE Boost</span>
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
