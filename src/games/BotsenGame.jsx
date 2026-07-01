import { useEffect, useRef, useState } from 'react'
import {
  Engine, Scene, FollowCamera,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  Vector3, Color3, Color4,
  MeshBuilder, StandardMaterial, DynamicTexture,
} from '@babylonjs/core'
import * as Colyseus from '@colyseus/sdk'
import OrientationGate from '../OrientationGate'
import { KART_COLORS, AV_Y, AV_Z, buildKart, loadAvatar, safeJSON } from './kartShared'
import './botsen-game.css'

// ═══════════════════════════════════════════════════════════════════════
//  BOTSEN — eigen ballon-gevecht-modus (los van Racen), zelfde kart +
//  poppetje + besturing, maar in een kleine gesloten arena i.p.v. een baan.
//  Elke kart heeft 3 ballonnen; geraakt worden door een schild-projectiel
//  laat er één knappen. Bij 0 ballonnen lig je eruit. Laatste kart wint.
// ═══════════════════════════════════════════════════════════════════════

const SERVER_URL = 'wss://kenniskist-server.onrender.com'
const ROOM_TYPE = 'botsen'

// ── Simpele vierkante arena met een paar obstakels ──────────────────────
const ARENA_HALF = 34            // speelveld: -34..34 in x en z
const WALL_H = 3.2, WALL_T = 1.4
const OBSTACLES = [
  { x: 12, z: 10, w: 6, d: 6 },
  { x: -12, z: -10, w: 6, d: 6 },
  { x: -14, z: 12, w: 5, d: 5 },
  { x: 14, z: -12, w: 5, d: 5 },
  { x: 0, z: 0, w: 7, d: 3 },
]
const BALLOON_COLORS = ['#ff4d6d', '#ffd23f', '#4dd2ff']
const SHOOT_COOLDOWN = 1.3
const SHELL_SPEED = 22
const SHELL_LIFE = 3.2
const HIT_RADIUS = 2.3
const CAR_RADIUS = 1.5

// ── Ballonnen: 3 bolletjes op een dun mastje achter de kart ─────────────
function buildBalloons(scene, idSuffix) {
  const balls = []
  for (let i = 0; i < 3; i++) {
    const s = MeshBuilder.CreateSphere('balloon' + idSuffix + i, { diameter: 0.6, segments: 10 }, scene)
    const m = new StandardMaterial('balloonMat' + idSuffix + i, scene)
    m.diffuseColor = Color3.FromHexString(BALLOON_COLORS[i])
    m.emissiveColor = Color3.FromHexString(BALLOON_COLORS[i]).scale(0.3)
    m.specularColor = new Color3(0.6, 0.6, 0.6)
    s.material = m
    s.position.set((i - 1) * 0.42, 1.7 + i * 0.05, -1.9)
    balls.push(s)
  }
  return balls
}
function setBalloons(balls, count) {
  balls.forEach((b, i) => b.setEnabled(i < count))
}

// ── Projectiel: klein groen schild (zelfde look als Karten) ─────────────
function makeShellMesh(scene) {
  const dome = MeshBuilder.CreateSphere('bshell', { diameter: 0.85, segments: 10, slice: 0.62 }, scene)
  dome.scaling.y = 0.78
  const m = new StandardMaterial('bshellm', scene)
  m.diffuseColor = new Color3(0.18, 0.8, 0.32); m.emissiveColor = new Color3(0.08, 0.42, 0.16); m.specularColor = new Color3(0.5, 0.7, 0.5)
  dome.material = m; dome.isPickable = false
  return dome
}

// ── Arena bouwen: grond, muren, obstakels ───────────────────────────────
function buildArena(scene, sg) {
  scene.clearColor = new Color4(0.55, 0.72, 0.85, 1)
  const hemi = scene.lights[0]
  const ground = MeshBuilder.CreateGround('bground', { width: ARENA_HALF * 2 + 4, height: ARENA_HALF * 2 + 4 }, scene)
  const gMat = new StandardMaterial('bgMat', scene)
  gMat.diffuseColor = new Color3(0.75, 0.62, 0.4); gMat.specularColor = Color3.Black()
  ground.material = gMat; ground.receiveShadows = true

  // vloerlijnen (cirkel-patroon, decoratief)
  const ringMat = new StandardMaterial('bringMat', scene)
  ringMat.diffuseColor = new Color3(0.65, 0.52, 0.3); ringMat.specularColor = Color3.Black()
  for (let r = 8; r < ARENA_HALF; r += 8) {
    const ring = MeshBuilder.CreateTorus('bring' + r, { diameter: r * 2, thickness: 0.25, tessellation: 48 }, scene)
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; ring.material = ringMat; ring.isPickable = false
  }

  const wallMat = new StandardMaterial('bwallMat', scene)
  wallMat.diffuseColor = new Color3(0.85, 0.4, 0.55); wallMat.specularColor = new Color3(0.2, 0.2, 0.2)
  const stripeMat = new StandardMaterial('bstripeMat', scene)
  stripeMat.diffuseColor = new Color3(0.95, 0.95, 0.95); stripeMat.specularColor = Color3.Black()

  // 4 grenswanden rondom de arena (zichtbaar, blokkeert de kart)
  const walls = []
  const half = ARENA_HALF
  const mk = (x, z, w, d) => {
    const wall = MeshBuilder.CreateBox('bwall', { width: w, height: WALL_H, depth: d }, scene)
    wall.position.set(x, WALL_H / 2, z); wall.material = wallMat
    wall.receiveShadows = true; sg.addShadowCaster(wall)
    walls.push({ x, z, hw: w / 2, hd: d / 2 })
    // wit-rode streep bovenop
    const cap = MeshBuilder.CreateBox('bwallcap', { width: w, height: 0.3, depth: d }, scene)
    cap.position.set(x, WALL_H + 0.15, z); cap.material = stripeMat
    return wall
  }
  mk(0, half + WALL_T / 2, half * 2 + WALL_T * 2, WALL_T)
  mk(0, -half - WALL_T / 2, half * 2 + WALL_T * 2, WALL_T)
  mk(half + WALL_T / 2, 0, WALL_T, half * 2 + WALL_T * 2)
  mk(-half - WALL_T / 2, 0, WALL_T, half * 2 + WALL_T * 2)

  // obstakels middenin (dekking)
  const obsMat = new StandardMaterial('bobsMat', scene)
  obsMat.diffuseColor = new Color3(0.5, 0.36, 0.25); obsMat.specularColor = new Color3(0.15, 0.15, 0.15)
  const boxes = []
  OBSTACLES.forEach((o, i) => {
    const h = 2.4
    const box = MeshBuilder.CreateBox('bobs' + i, { width: o.w, height: h, depth: o.d }, scene)
    box.position.set(o.x, h / 2, o.z); box.material = obsMat
    box.receiveShadows = true; sg.addShadowCaster(box)
    boxes.push({ x: o.x, z: o.z, hw: o.w / 2, hd: o.d / 2 })
  })

  return { walls, boxes: boxes.concat(walls) }
}

// Cirkel-vs-AABB botsing: duwt een punt (met straal r) uit een blok.
function collideBoxes(pos, r, boxes) {
  for (const b of boxes) {
    const x0 = b.x - b.hw, x1 = b.x + b.hw, z0 = b.z - b.hd, z1 = b.z + b.hd
    const cx = Math.max(x0, Math.min(pos.x, x1)), cz = Math.max(z0, Math.min(pos.z, z1))
    const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz
    const inside = pos.x > x0 && pos.x < x1 && pos.z > z0 && pos.z < z1
    if (!inside && d2 >= r * r) continue
    if (inside) {
      const dL = pos.x - x0, dR = x1 - pos.x, dT = pos.z - z0, dB = z1 - pos.z
      const m = Math.min(dL, dR, dT, dB)
      if (m === dT) pos.z = z0 - r
      else if (m === dB) pos.z = z1 + r
      else if (m === dL) pos.x = x0 - r
      else pos.x = x1 + r
    } else {
      const d = Math.sqrt(d2) || 0.0001
      pos.x += (dx / d) * (r - d)
      pos.z += (dz / d) * (r - d)
    }
  }
}

function BotsenMatch({ onBack, room, sessionId, joinCode }) {
  const canvasRef = useRef(null)
  const [phase, setPhase] = useState('lobby')       // lobby | countdown | playing | gameover
  const [count, setCount] = useState(3)
  const [timeLeft, setTimeLeft] = useState(0)
  const [aliveCount, setAliveCount] = useState(0)
  const [myBalloons, setMyBalloons] = useState(3)
  const [amAlive, setAmAlive] = useState(true)
  const [winnerName, setWinnerName] = useState('')
  const [players, setPlayers] = useState([])
  const [botDiff, setBotDiff] = useState('normaal')
  const stateRef = useRef({})

  const startMatch = () => { room.send('start') }

  useEffect(() => {
    const canvas = canvasRef.current
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
    const scene = new Scene(engine)

    const hemi = new HemisphericLight('h', new Vector3(0, 1, 0), scene)
    hemi.intensity = 0.9
    const sun = new DirectionalLight('s', new Vector3(-0.4, -1, -0.3), scene)
    sun.position = new Vector3(30, 50, 20); sun.intensity = 1.05
    const sg = new ShadowGenerator(1024, sun); sg.useBlurExponentialShadowMap = true

    const arena = buildArena(scene, sg)

    // ── Eigen kart + avatar ──
    const myP = room.state.players.get(sessionId)
    const myColor = KART_COLORS[(myP?.grid ?? 0) % KART_COLORS.length]
    const { root: kartRoot, wheels } = buildKart(scene, myColor, 'me')
    kartRoot.position.set(myP?.x ?? 0, 0, myP?.z ?? 0)
    kartRoot.rotation.y = myP?.rotY ?? 0
    const myBalloonMeshes = buildBalloons(scene, 'me')
    myBalloonMeshes.forEach(b => { b.parent = kartRoot })

    const cam = new FollowCamera('cam', new Vector3(0, 6, -12), scene)
    cam.lockedTarget = kartRoot
    cam.radius = 9; cam.heightOffset = 3.4; cam.rotationOffset = 180
    cam.cameraAcceleration = 0.06; cam.maxCameraSpeed = 40

    loadAvatar(scene, localStorage.getItem('kk_shirt') || '', safeJSON(localStorage.getItem('kk_wearing')), (av) => {
      av.parent = kartRoot
      av.position.set(0, AV_Y, AV_Z)
      av.rotation = new Vector3(0, Math.PI, 0)
      av.getChildMeshes?.(false).forEach(m => sg.addShadowCaster(m))
    })

    // ── Remote karts ──
    const remotes = new Map()
    const makeRemote = (sid, p) => {
      const col = KART_COLORS[(p.grid ?? 0) % KART_COLORS.length]
      const built = buildKart(scene, col, 'r' + sid)
      built.root.position.set(p.x || 0, 0, p.z || 0)
      built.root.rotation.y = p.rotY || 0
      const balloons = buildBalloons(scene, 'r' + sid)
      balloons.forEach(b => { b.parent = built.root })
      const ent = { root: built.root, wheels: built.wheels, balloons, tx: built.root.position.x, tz: built.root.position.z, trot: built.root.rotation.y, tvel: 0, lastBalloons: 3 }
      loadAvatar(scene, p.shirt || '', safeJSON(p.wearing), (av) => {
        av.parent = built.root; av.position.set(0, AV_Y, AV_Z); av.rotation = new Vector3(0, Math.PI, 0)
        av.getChildMeshes?.(false).forEach(m => sg.addShadowCaster(m))
      })
      remotes.set(sid, ent)
    }

    // ── Schilden (projectielen) ──
    const shellMeshes = new Map()
    const shoot = () => { room.send('shoot') }
    const shootRef = { current: shoot }

    // ── Input ──
    const keys = {}
    const kd = e => {
      keys[e.key.toLowerCase()] = true
      if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); shootRef.current() }
    }
    const ku = e => { keys[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    // ── Physics ──
    const phys = {
      vel: 0, maxSpeed: 28, accel: 24, brakeForce: 30, friction: 14,
      turnSpeed: 2.5, heading: myP?.rotY ?? 0, sendAcc: 0,
    }
    stateRef.current = { phys, scene }

    // ── Fase / sync ──
    let lastPhase = room.state.phase
    const sync = (state) => {
      const arr = []
      state.players?.forEach((p, sid) => arr.push({ sid, name: p.name, me: sid === sessionId, bot: p.isBot }))
      setPlayers(arr)
      setCount(state.countdown)
      setTimeLeft(Math.max(0, Math.ceil(state.timeLeft ?? 0)))
      let alive = 0
      state.players?.forEach(p => { if (p.alive) alive++ })
      setAliveCount(alive)
      const me = state.players?.get(sessionId)
      if (me) { setMyBalloons(me.balloons); setAmAlive(me.alive) }
      if (state.phase !== lastPhase) {
        lastPhase = state.phase
        setPhase(state.phase)
        if (state.phase === 'gameover') setWinnerName(state.winnerName || '')
      }
    }
    sync(room.state)
    room.onStateChange(sync)

    // ── Render/physics-loop ──
    let lastT = performance.now()
    engine.runRenderLoop(() => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now

      // Remote karts bijwerken
      room.state.players.forEach((p, sid) => {
        if (sid === sessionId) return
        let e = remotes.get(sid)
        if (!e) { makeRemote(sid, p); e = remotes.get(sid) }
        e.tx = p.x; e.tz = p.z; e.trot = p.rotY; e.tvel = p.vel
        if (p.balloons !== e.lastBalloons) { setBalloons(e.balloons, p.balloons); e.lastBalloons = p.balloons }
        e.root.setEnabled(p.alive)
      })
      for (const sid of [...remotes.keys()]) {
        if (!room.state.players.get(sid)) { remotes.get(sid).root.dispose(); remotes.delete(sid) }
      }
      const k = Math.min(1, dt * 12)
      remotes.forEach(e => {
        e.root.position.x += (e.tx - e.root.position.x) * k
        e.root.position.z += (e.tz - e.root.position.z) * k
        let dr = e.trot - e.root.rotation.y
        while (dr > Math.PI) dr -= Math.PI * 2; while (dr < -Math.PI) dr += Math.PI * 2
        e.root.rotation.y += dr * k
        e.wheels.forEach(w => { w.rotation.x += e.tvel * dt * 3 })
      })

      const playing = room.state.phase === 'playing'
      const meNow = room.state.players.get(sessionId)
      if (meNow && meNow.balloons !== stateRef.current.lastMyBalloons) {
        setBalloons(myBalloonMeshes, meNow.balloons); stateRef.current.lastMyBalloons = meNow.balloons
      }

      if (playing && meNow?.alive) {
        const gas   = keys['w'] || keys['arrowup']
        const brake = keys['s'] || keys['arrowdown']
        const left  = keys['a'] || keys['arrowleft']
        const right = keys['d'] || keys['arrowright']

        if (gas)        phys.vel += phys.accel * dt
        else if (brake) phys.vel -= phys.brakeForce * dt
        else { const f = phys.friction * dt; phys.vel = phys.vel > 0 ? Math.max(0, phys.vel - f) : Math.min(0, phys.vel + f) }
        phys.vel = Math.max(-phys.maxSpeed * 0.4, Math.min(phys.maxSpeed, phys.vel))

        const steer = (right ? 1 : 0) - (left ? 1 : 0)
        const speedFactor = Math.min(1, Math.abs(phys.vel) / 6)
        phys.heading += steer * phys.turnSpeed * dt * speedFactor * Math.sign(phys.vel || 1)
        kartRoot.rotation.y = phys.heading

        const fwd = new Vector3(Math.sin(phys.heading), 0, Math.cos(phys.heading))
        kartRoot.position.addInPlace(fwd.scale(phys.vel * dt))

        // Arena-grenzen + obstakels
        collideBoxes(kartRoot.position, CAR_RADIUS, arena.boxes)

        // Botsing met andere karts (beuken)
        remotes.forEach(e => {
          if (!e.root.isEnabled()) return
          let dx = kartRoot.position.x - e.root.position.x
          let dz = kartRoot.position.z - e.root.position.z
          const d = Math.hypot(dx, dz), BUMP = 1.6 * 2
          if (d > 0.001 && d < BUMP) {
            const overlap = BUMP - d
            dx /= d; dz /= d
            kartRoot.position.x += dx * overlap * 0.5
            kartRoot.position.z += dz * overlap * 0.5
            phys.vel *= 0.7
          }
        })

        wheels.forEach(w => { w.rotation.x += phys.vel * dt * 3 })

        phys.sendAcc += dt
        if (phys.sendAcc >= 0.04) {
          phys.sendAcc = 0
          room.send('state', { x: kartRoot.position.x, z: kartRoot.position.z, rotY: phys.heading, vel: phys.vel })
        }
      }

      // Schilden syncen + draaien
      room.state.shells?.forEach((s, id) => {
        let m = shellMeshes.get(id)
        if (!m) { m = makeShellMesh(scene); shellMeshes.set(id, m) }
        m.position.set(s.x, 0.6, s.z); m.rotation.y += dt * 8
      })
      for (const id of [...shellMeshes.keys()]) {
        if (!room.state.shells?.get(id)) { shellMeshes.get(id).dispose(); shellMeshes.delete(id) }
      }

      scene.render()
    })

    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      window.removeEventListener('resize', onResize)
      scene.dispose(); engine.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="botsen-wrap">
      <OrientationGate />
      <canvas ref={canvasRef} className="botsen-canvas" />
      <button className="botsen-exit" onClick={onBack}>← Verlaten</button>

      {phase === 'lobby' && (
        <div className="botsen-lobby-wait">
          <h1>💥 Wachtkamer</h1>
          {joinCode && <p className="botsen-lobby-code">Code: <strong>{joinCode}</strong></p>}
          <p>Deel de code en wacht tot iedereen er is.</p>
          <ul className="botsen-lobby-list">
            {players.map(p => <li key={p.sid} className={p.me ? 'me' : ''}>{p.me ? '⭐ ' : (p.bot ? '🤖 ' : '💥 ')}{p.name}</li>)}
          </ul>
          <div className="botsen-bot-row">
            <button className="botsen-bot-btn" onClick={() => room.send('addBot', botDiff)}>🤖 Bot erbij</button>
            <button className="botsen-bot-btn" onClick={() => room.send('removeBot')}>➖ Bot eraf</button>
          </div>
          <button className="botsen-start-btn" onClick={startMatch}>Start! ({players.length})</button>
        </div>
      )}

      {phase !== 'lobby' && phase !== 'gameover' && (
        <div className="botsen-hud">
          <div className="botsen-hud-time">⏱ {timeLeft}s</div>
          <div className="botsen-hud-alive">{aliveCount} over</div>
          <div className="botsen-hud-balloons">
            {[0, 1, 2].map(i => <span key={i} className={i < myBalloons ? '' : 'popped'}>🎈</span>)}
          </div>
        </div>
      )}

      {phase === 'countdown' && <div className="botsen-count">{count > 0 ? count : 'GO!'}</div>}

      {phase === 'playing' && !amAlive && (
        <div className="botsen-out">💥 Uitgeschakeld — kijk toe tot het einde!</div>
      )}

      {phase === 'gameover' && (
        <div className="botsen-finish">
          <h1>🏆 Einde!</h1>
          <p>{winnerName ? `${winnerName} wint!` : 'Gelijkspel!'}</p>
          <div className="botsen-finish-btns">
            <button onClick={onBack}>👕 Kledingkast</button>
          </div>
        </div>
      )}

      <div className="botsen-help">W/↑ gas · S/↓ rem · A/← D/→ sturen · spatie = schild afvuren</div>
    </div>
  )
}

// ── Menu + lobby-connect (zelfde server als Karten/Voetbal/Paintball) ───
export default function BotsenGame({ onBack }) {
  const [screen, setScreen] = useState('menu')   // menu | lobby | match
  const [room, setRoom] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [joinCode, setJoinCode] = useState(null)

  if (screen === 'match' && room) {
    return <BotsenMatch onBack={() => { try { room.leave() } catch {} ; setRoom(null); setScreen('menu') }} room={room} sessionId={sessionId} joinCode={joinCode} />
  }

  if (screen === 'lobby') {
    return <BotsenLobby
      onBack={() => setScreen('menu')}
      onJoined={(r, jc) => { setRoom(r); setSessionId(r.sessionId); setJoinCode(jc); setScreen('match') }}
    />
  }

  return (
    <div className="botsen-menu">
      <button className="botsen-exit" onClick={onBack}>← Kledingkast</button>
      <div className="botsen-menu-box">
        <div className="botsen-menu-icon">💥</div>
        <h1 className="botsen-menu-title">Botsen</h1>
        <p className="botsen-menu-sub">Ballon-gevecht in de arena — laatste kart wint!</p>
        <button className="botsen-menu-btn online" onClick={() => setScreen('lobby')}>🌍 Online — knal ballonnen (of tegen bots)</button>
      </div>
    </div>
  )
}

function BotsenLobby({ onBack, onJoined }) {
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
      const joinCode = create ? String(Math.floor(1000 + Math.random() * 9000)) : code.trim()
      const opts = { joinCode, shirt, wearing, name: name || 'Speler' }
      const room = create ? await client.create(ROOM_TYPE, opts) : await client.join(ROOM_TYPE, opts)
      if (name) localStorage.setItem('kk_playername', name)
      onJoined(room, joinCode)
    } catch { setError(create ? 'Kan geen potje aanmaken.' : 'Potje niet gevonden.'); setLoading(false) }
  }

  return (
    <div className="botsen-menu">
      <button className="botsen-exit" onClick={onBack}>← Terug</button>
      <div className="botsen-menu-box">
        <div className="botsen-menu-icon">🌍</div>
        <h1 className="botsen-menu-title">Online botsen</h1>
        <div className="botsen-lobby-field">
          <label>Jouw naam</label>
          <input className="botsen-input" placeholder="Speler" value={name} maxLength={12} onChange={e => setName(e.target.value)} />
        </div>
        <button className="botsen-menu-btn online" disabled={loading} onClick={() => connect(true)}>➕ Nieuw potje (maak code)</button>
        <div className="botsen-lobby-field">
          <label>Of join met code</label>
          <input className="botsen-input" placeholder="bv. 1234" value={code} maxLength={6} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
        </div>
        <button className="botsen-menu-btn solo" disabled={loading || code.trim().length < 1} onClick={() => connect(false)}>🔑 Join potje</button>
        {error && <p className="botsen-lobby-err">{error}</p>}
        {loading && <p className="botsen-lobby-info">Verbinden…</p>}
      </div>
    </div>
  )
}
