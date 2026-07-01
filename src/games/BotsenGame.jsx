import { useEffect, useRef, useState } from 'react'
import {
  Engine, Scene, FollowCamera,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  Vector3, Color3, Color4,
  MeshBuilder, StandardMaterial, DynamicTexture, ParticleSystem,
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

// ── Grote, sfeervolle arena met natuurlijke dekking + een oprijhelling naar
//    een plateau. Grens is ONZICHTBAAR (geen muur-mesh, alleen botsing) —
//    bomen/rotsen net erbuiten + mist geven het randgevoel zonder blokkerig
//    "muur"-uiterlijk. MOET kloppen met de server (BotsenRoom.ts). ────────
const ARENA_HALF = 55            // speelveld: -55..55 in x en z
const CAR_RADIUS = 1.5
// Plateau + helling: vanaf de grond omhoog rijden naar een verhoogd platform.
const PLATEAU = { x: 0, z: -40, w: 22, d: 14, h: 4.2 }
const RAMP_LEN = 16
const OBSTACLES = [
  { x: 20, z: 18, w: 8, d: 8, kind: 'rock' },
  { x: -20, z: -6, w: 8, d: 8, kind: 'crate' },
  { x: -22, z: 20, w: 7, d: 7, kind: 'rock' },
  { x: 22, z: -6, w: 7, d: 7, kind: 'crate' },
  { x: 0, z: 10, w: 9, d: 4, kind: 'rock' },
  { x: 34, z: -28, w: 6, d: 6, kind: 'crate' },
  { x: -34, z: 28, w: 6, d: 6, kind: 'rock' },
]
const BALLOON_COLORS = ['#ff4d6d', '#ffd23f', '#4dd2ff']
// Item-boxen: vaste plekken (MOET kloppen met de server BotsenRoom.ts) —
// één staat bovenop het plateau om het beklimmen te belonen.
const BOX_SPOTS = [
  { x: 0, z: 44 }, { x: 38, z: 6 }, { x: -38, z: 6 },
  { x: 26, z: -34 }, { x: -26, z: -34 }, { x: 0, z: -40 },
]

// Hoogte van de grond op (x,z): 0 = normaal, oploopt over de helling naar
// PLATEAU.h bovenop het plateau. Puur visueel (client) — de server rekent
// alleen in x/z, treffers/botsing zijn hoogte-onafhankelijk.
function heightAt(x, z) {
  const { x: px, z: pz, w, d, h } = PLATEAU
  const hw = w / 2, hd = d / 2
  if (x < px - hw || x > px + hw) return 0
  if (z > pz - hd && z < pz + hd) return h
  const rz0 = pz + hd, rz1 = rz0 + RAMP_LEN
  if (z >= rz0 && z <= rz1) return h * (1 - (z - rz0) / RAMP_LEN)
  return 0
}
// Botsingswanden voor het plateau (3 zijden dicht, de helling-zijde open) +
// lage leuningen langs de helling zodat je er niet naast af rijdt.
function plateauWalls() {
  const { x: px, z: pz, w, d } = PLATEAU
  const hw = w / 2, hd = d / 2, rz0 = pz + hd
  return [
    { x: px - hw, z: pz, hw: 0.4, hd },                              // linkerzijde plateau
    { x: px + hw, z: pz, hw: 0.4, hd },                              // rechterzijde plateau
    { x: px, z: pz - hd, hw, hd: 0.4 },                              // achterzijde plateau
    { x: px - hw, z: rz0 + RAMP_LEN / 2, hw: 0.4, hd: RAMP_LEN / 2 }, // linkerleuning helling
    { x: px + hw, z: rz0 + RAMP_LEN / 2, hw: 0.4, hd: RAMP_LEN / 2 }, // rechterleuning helling
  ]
}
const ITEM_INFO = {
  schild:  { emoji: '🛡️', label: 'Schild' },
  bom:     { emoji: '💣', label: 'Bom' },
  vuurtje: { emoji: '🔥', label: 'Vuurtje' },
}

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

// ── Zachte gloed-textuur voor vuurdeeltjes (radiaal verloop) ────────────
function makeFireTexture(scene) {
  const tex = new DynamicTexture('bfireTex', { width: 64, height: 64 }, scene, false)
  const c = tex.getContext()
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,225,1)')
  g.addColorStop(0.35, 'rgba(255,170,40,0.95)')
  g.addColorStop(1, 'rgba(255,60,0,0)')
  c.fillStyle = g; c.fillRect(0, 0, 64, 64)
  tex.update(); tex.hasAlpha = true
  return tex
}
// ── Projectielen: groen schild (zelfde look als Karten) of een écht
//    vlammend vuurtje (kleine gloeikern + deeltjes-vuur eromheen) ────────
function makeShellMesh(scene, kind, fireTex) {
  if (kind === 'vuurtje') {
    const core = MeshBuilder.CreateSphere('bflame', { diameter: 0.45, segments: 8 }, scene)
    const m = new StandardMaterial('bflamem', scene)
    m.emissiveColor = new Color3(1, 0.75, 0.25); m.diffuseColor = new Color3(1, 0.4, 0.05)
    m.specularColor = Color3.Black()
    core.material = m; core.isPickable = false
    const ps = new ParticleSystem('firePs', 80, scene)
    ps.particleTexture = fireTex
    ps.emitter = core
    ps.minEmitBox = new Vector3(-0.1, -0.1, -0.1); ps.maxEmitBox = new Vector3(0.1, 0.1, 0.1)
    ps.color1 = new Color4(1, 0.75, 0.25, 1); ps.color2 = new Color4(1, 0.35, 0.05, 1)
    ps.colorDead = new Color4(0.3, 0.05, 0, 0)
    ps.minSize = 0.35; ps.maxSize = 0.75
    ps.minLifeTime = 0.12; ps.maxLifeTime = 0.28
    ps.emitRate = 140
    ps.blendMode = ParticleSystem.BLENDMODE_ADD
    ps.direction1 = new Vector3(-0.6, 0.4, -0.6); ps.direction2 = new Vector3(0.6, 1.4, 0.6)
    ps.minEmitPower = 0.3; ps.maxEmitPower = 0.8
    ps.gravity = new Vector3(0, 1.4, 0)
    ps.start()
    core._fireParticles = ps
    return core
  }
  const dome = MeshBuilder.CreateSphere('bshell', { diameter: 0.85, segments: 10, slice: 0.62 }, scene)
  dome.scaling.y = 0.78
  const m = new StandardMaterial('bshellm', scene)
  m.diffuseColor = new Color3(0.18, 0.8, 0.32); m.emissiveColor = new Color3(0.08, 0.42, 0.16); m.specularColor = new Color3(0.5, 0.7, 0.5)
  dome.material = m; dome.isPickable = false
  return dome
}
function disposeShellMesh(mesh) {
  mesh._fireParticles?.stop(); mesh._fireParticles?.dispose()
  mesh.dispose()
}
// ── Bom: zwarte bol met lont ─────────────────────────────────────────────
function makeBombMesh(scene) {
  const body = MeshBuilder.CreateSphere('bbomb', { diameter: 1.1, segments: 12 }, scene)
  const m = new StandardMaterial('bbombm', scene)
  m.diffuseColor = new Color3(0.1, 0.1, 0.12); m.specularColor = new Color3(0.4, 0.4, 0.4)
  body.material = m; body.isPickable = false
  const fuse = MeshBuilder.CreateCylinder('bfuse', { height: 0.4, diameter: 0.08, tessellation: 6 }, scene)
  fuse.parent = body; fuse.position.set(0, 0.6, 0); fuse.rotation.x = -0.3
  const fm = new StandardMaterial('bfusem', scene); fm.diffuseColor = new Color3(0.6, 0.5, 0.3)
  fuse.material = fm
  const spark = MeshBuilder.CreateSphere('bspark', { diameter: 0.18, segments: 6 }, scene)
  spark.parent = body; spark.position.set(0, 0.82, 0)
  const sm = new StandardMaterial('bsparkm', scene); sm.emissiveColor = new Color3(1, 0.7, 0.1); sm.diffuseColor = new Color3(1, 0.6, 0.1)
  spark.material = sm
  return body
}
// ── Item-box: draaiend "?"-blok (zelfde stijl als Karten) ───────────────
function makeItemBox(scene, x, z) {
  const box = MeshBuilder.CreateBox('bibox', { size: 1.3 }, scene)
  box.position.set(x, 1.05, z); box.isPickable = false
  const m = new StandardMaterial('biboxm', scene)
  const tex = new DynamicTexture('biboxt', { width: 128, height: 128 }, scene, false)
  const c = tex.getContext()
  const g = c.createLinearGradient(0, 0, 128, 128)
  g.addColorStop(0, '#ffe14d'); g.addColorStop(0.5, '#ff8a3d'); g.addColorStop(1, '#ff4db8')
  c.fillStyle = g; c.fillRect(0, 0, 128, 128)
  c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 8; c.strokeRect(6, 6, 116, 116)
  c.fillStyle = '#fff'; c.font = 'bold 92px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'
  c.fillText('?', 64, 70)
  tex.update()
  m.diffuseTexture = tex; m.emissiveColor = new Color3(0.6, 0.45, 0.2)
  box.material = m
  return box
}

// hex '#rrggbb' → [r,g,b] in 0..1
function hexRgb(hex) { const c = Color3.FromHexString(hex); return [c.r, c.g, c.b] }

// ── Arena bouwen: lucht + mist, gras, plateau+helling, natuurlijke
//    obstakels (rots/kist), bomen/rotsen als rand-decor. Grens = ONZICHTBAAR
//    (geen muur-mesh — alleen botsing), de mist verbergt waar de wereld
//    "stopt" zodat het niet blokkerig aanvoelt. ──────────────────────────
function buildArena(scene, sg) {
  const half = ARENA_HALF
  const skyTop = '#bfe6ff', skyBot = '#eefaff'

  // Skydome met verticale gradient (zelfde aanpak als Karten)
  const sky = MeshBuilder.CreateSphere('bsky', { diameter: (half + 160) * 2, segments: 16 }, scene)
  const skyTex = new DynamicTexture('bskyTex', { width: 8, height: 256 }, scene, false)
  const sx = skyTex.getContext()
  const grad = sx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, skyTop); grad.addColorStop(1, skyBot)
  sx.fillStyle = grad; sx.fillRect(0, 0, 8, 256); skyTex.update()
  const skyMat = new StandardMaterial('bskyMat', scene)
  skyMat.emissiveTexture = skyTex; skyMat.disableLighting = true; skyMat.backFaceCulling = false
  skyMat.diffuseColor = Color3.Black(); skyMat.specularColor = Color3.Black()
  sky.material = skyMat; sky.isPickable = false
  scene.clearColor = new Color4(...hexRgb(skyBot), 1)
  scene.fogMode = Scene.FOGMODE_LINEAR; scene.fogStart = half + 20; scene.fogEnd = half + 95
  scene.fogColor = new Color3(...hexRgb(skyBot))

  // Grasveld (groot, loopt door tot ver voorbij de onzichtbare grens)
  const grass = MeshBuilder.CreateGround('bgrass', { width: (half + 130) * 2, height: (half + 130) * 2 }, scene)
  const gMat = new StandardMaterial('bgMat', scene)
  gMat.diffuseColor = new Color3(0.32, 0.62, 0.32); gMat.specularColor = Color3.Black()
  grass.material = gMat; grass.receiveShadows = true; grass.position.y = -0.03

  // Zandkleurige "arena-vloer" binnen de speelgrens (visueel onderscheid, geen muur)
  const floor = MeshBuilder.CreateGround('bfloor', { width: half * 2, height: half * 2 }, scene)
  const fMat = new StandardMaterial('bfloorMat', scene)
  fMat.diffuseColor = new Color3(0.78, 0.68, 0.46); fMat.specularColor = Color3.Black()
  floor.material = fMat; floor.receiveShadows = true; floor.position.y = -0.015

  // vloerlijnen (cirkel-patroon, decoratief)
  const ringMat = new StandardMaterial('bringMat', scene)
  ringMat.diffuseColor = new Color3(0.66, 0.56, 0.36); ringMat.specularColor = Color3.Black()
  for (let r = 12; r < half; r += 12) {
    const ring = MeshBuilder.CreateTorus('bring' + r, { diameter: r * 2, thickness: 0.22, tessellation: 56 }, scene)
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; ring.material = ringMat; ring.isPickable = false
  }

  // ── Plateau + helling (beklimbaar, hoogte via heightAt()) ──
  const rockMat = new StandardMaterial('bplatMat', scene)
  rockMat.diffuseColor = new Color3(0.5, 0.47, 0.44); rockMat.specularColor = new Color3(0.1, 0.1, 0.1)
  const topMat = new StandardMaterial('bplatTopMat', scene)
  topMat.diffuseColor = new Color3(0.42, 0.66, 0.36); topMat.specularColor = Color3.Black()
  const { x: px, z: pz, w: pw, d: pd, h: ph } = PLATEAU
  const plat = MeshBuilder.CreateBox('bplateau', { width: pw, height: ph, depth: pd }, scene)
  plat.position.set(px, ph / 2, pz); plat.material = rockMat
  plat.receiveShadows = true; sg.addShadowCaster(plat)
  const platTop = MeshBuilder.CreateGround('bplateauTop', { width: pw, height: pd }, scene)
  platTop.position.set(px, ph + 0.01, pz); platTop.material = topMat; platTop.receiveShadows = true
  const rampZ0 = pz + pd / 2
  const rampSlopeLen = Math.hypot(RAMP_LEN, ph)
  const ramp = MeshBuilder.CreateBox('bramp', { width: pw, height: 0.6, depth: rampSlopeLen }, scene)
  ramp.position.set(px, ph / 2, rampZ0 + RAMP_LEN / 2)
  ramp.rotation.x = -Math.atan2(ph, RAMP_LEN)
  ramp.material = rockMat; ramp.receiveShadows = true; sg.addShadowCaster(ramp)
  // leuningen langs de helling + plateau-rand (visueel, volgt de botsing)
  const railMat = new StandardMaterial('bplatRailMat', scene)
  railMat.diffuseColor = new Color3(0.9, 0.6, 0.2); railMat.specularColor = new Color3(0.3, 0.3, 0.3)
  plateauWalls().forEach((seg, i) => {
    const railH = 0.9
    const rail = MeshBuilder.CreateBox('brail' + i, { width: seg.hw * 2 * 0.9, height: railH, depth: seg.hd * 2 * 0.9 }, scene)
    // hoogte van de leuning volgt de helling bij de hellingsegmenten, anders plateau-top
    const midZ = seg.z
    const y = heightAt(seg.x > 0 ? seg.x - 0.01 : seg.x + 0.01, midZ)
    rail.position.set(seg.x, y + railH / 2, midZ); rail.material = railMat
  })

  // ── Natuurlijke obstakels: rotsblokken of houten kisten ──
  const crateTex = new DynamicTexture('bcrateTex', { width: 64, height: 64 }, scene, false)
  const ctx = crateTex.getContext()
  ctx.fillStyle = '#a9702f'; ctx.fillRect(0, 0, 64, 64)
  ctx.strokeStyle = '#6b4720'; ctx.lineWidth = 4
  ctx.strokeRect(2, 2, 60, 60); ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(62, 62); ctx.moveTo(62, 2); ctx.lineTo(2, 62); ctx.stroke()
  crateTex.update()
  const crateMat = new StandardMaterial('bcrateMat', scene)
  crateMat.diffuseTexture = crateTex; crateMat.specularColor = new Color3(0.1, 0.1, 0.1)
  const obsRockMat = new StandardMaterial('bobsRockMat', scene)
  obsRockMat.diffuseColor = new Color3(0.48, 0.46, 0.44); obsRockMat.specularColor = Color3.Black()

  const boxes = []
  OBSTACLES.forEach((o, i) => {
    if (o.kind === 'crate') {
      const h = 2.6
      const box = MeshBuilder.CreateBox('bobs' + i, { width: o.w, height: h, depth: o.d }, scene)
      box.position.set(o.x, h / 2, o.z); box.material = crateMat
      box.receiveShadows = true; sg.addShadowCaster(box)
    } else {
      // rotscluster: een paar onregelmatige polyhedra samen (minder blokkerig dan een kubus)
      const cx = o.x, cz = o.z, n = 3
      for (let k = 0; k < n; k++) {
        const s = Math.max(o.w, o.d) * (0.42 + Math.random() * 0.22)
        const rock = MeshBuilder.CreatePolyhedron('bobsRock' + i + '_' + k, { type: Math.floor(Math.random() * 3), size: s * 0.5 }, scene)
        rock.position.set(cx + (Math.random() - 0.5) * o.w * 0.5, s * 0.3, cz + (Math.random() - 0.5) * o.d * 0.5)
        rock.rotation.set(Math.random() * 3, Math.random() * 6, Math.random() * 3)
        rock.material = obsRockMat; rock.receiveShadows = true; sg.addShadowCaster(rock)
      }
    }
    boxes.push({ x: o.x, z: o.z, hw: o.w / 2, hd: o.d / 2 })
  })

  // ── Rand-decor: bomen + rotsen net buiten de (onzichtbare) grens ──
  const trunkMat = new StandardMaterial('btrunkMat', scene)
  trunkMat.diffuseColor = new Color3(0.4, 0.26, 0.13); trunkMat.specularColor = Color3.Black()
  const leafMat = new StandardMaterial('bleafMat', scene)
  leafMat.diffuseColor = new Color3(0.22, 0.5, 0.24); leafMat.specularColor = Color3.Black()
  const decoRockMat = new StandardMaterial('bdecoRockMat', scene)
  decoRockMat.diffuseColor = new Color3(0.5, 0.48, 0.45); decoRockMat.specularColor = Color3.Black()
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2, r = half + 6 + Math.random() * 55
    const x = Math.cos(a) * r, z = Math.sin(a) * r
    if (Math.random() < 0.7) {
      const s = 0.9 + Math.random() * 1.1
      const trunk = MeshBuilder.CreateCylinder('btr' + i, { height: 2.2 * s, diameter: 0.6 * s, tessellation: 6 }, scene)
      trunk.material = trunkMat; trunk.position.set(x, 1.1 * s, z)
      const leaves = MeshBuilder.CreateCylinder('blf' + i, { height: 4.2 * s, diameterTop: 0, diameterBottom: 3.2 * s, tessellation: 8 }, scene)
      leaves.material = leafMat; leaves.position.set(x, 4.2 * s, z)
    } else {
      const s = 1.2 + Math.random() * 2.4
      const rock = MeshBuilder.CreatePolyhedron('bdr' + i, { type: Math.floor(Math.random() * 4), size: s }, scene)
      rock.material = decoRockMat; rock.position.set(x, s * 0.5, z)
      rock.rotation.set(Math.random(), Math.random() * 6, Math.random())
    }
  }

  // ── Onzichtbare grens (alleen botsing, geen mesh) ──
  const invisWalls = [
    { x: 0, z: half + 1, hw: half + 1, hd: 1 },
    { x: 0, z: -half - 1, hw: half + 1, hd: 1 },
    { x: half + 1, z: 0, hw: 1, hd: half + 1 },
    { x: -half - 1, z: 0, hw: 1, hd: half + 1 },
  ]

  return { boxes: boxes.concat(invisWalls, plateauWalls()) }
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
  const [heldItem, setHeldItem] = useState('')
  const [heldCount, setHeldCount] = useState(0)
  const [winnerName, setWinnerName] = useState('')
  const [players, setPlayers] = useState([])
  const [botDiff, setBotDiff] = useState('normaal')
  const stateRef = useRef({})
  const useItemRef = useRef(() => {})

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
    const fireTex = makeFireTexture(scene)

    // ── Eigen kart + avatar ──
    const myP = room.state.players?.get(sessionId)
    const myColor = KART_COLORS[(myP?.grid ?? 0) % KART_COLORS.length]
    const { root: kartRoot, wheels } = buildKart(scene, myColor, 'me')
    kartRoot.position.set(myP?.x ?? 0, heightAt(myP?.x ?? 0, myP?.z ?? 0), myP?.z ?? 0)
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
      built.root.position.set(p.x || 0, heightAt(p.x || 0, p.z || 0), p.z || 0)
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

    // ── Projectielen, bommen, item-boxen ──
    const shellMeshes = new Map()
    const bombMeshes = new Map()
    const itemBoxMeshes = new Map()
    const useItem = () => { room.send('useItem') }
    useItemRef.current = useItem

    // ── Input (WASD én pijltjes rijden, spatie schiet) ──
    const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'])
    const keys = {}
    const kd = e => {
      const k = e.key.toLowerCase()
      keys[k] = true
      if (MOVE_KEYS.has(k)) e.preventDefault()
      if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); useItemRef.current() }
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
      if (me) { setMyBalloons(me.balloons); setAmAlive(me.alive); setHeldItem(me.item); setHeldCount(me.itemCount) }
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
      room.state.players?.forEach((p, sid) => {
        if (sid === sessionId) return
        let e = remotes.get(sid)
        if (!e) { makeRemote(sid, p); e = remotes.get(sid) }
        e.tx = p.x; e.tz = p.z; e.trot = p.rotY; e.tvel = p.vel
        if (p.balloons !== e.lastBalloons) { setBalloons(e.balloons, p.balloons); e.lastBalloons = p.balloons }
        e.root.setEnabled(p.alive)
      })
      for (const sid of [...remotes.keys()]) {
        if (!room.state.players?.get(sid)) { remotes.get(sid).root.dispose(); remotes.delete(sid) }
      }
      const k = Math.min(1, dt * 12)
      remotes.forEach(e => {
        e.root.position.x += (e.tx - e.root.position.x) * k
        e.root.position.z += (e.tz - e.root.position.z) * k
        e.root.position.y = heightAt(e.root.position.x, e.root.position.z)
        let dr = e.trot - e.root.rotation.y
        while (dr > Math.PI) dr -= Math.PI * 2; while (dr < -Math.PI) dr += Math.PI * 2
        e.root.rotation.y += dr * k
        e.wheels.forEach(w => { w.rotation.x += e.tvel * dt * 3 })
      })

      const playing = room.state.phase === 'playing'
      const meNow = room.state.players?.get(sessionId)
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

        // Arcade-sturen: draait altijd direct, ook stilstaand (bumper-car-gevoel,
        // geen racewagen-traagheid nodig in een kleine arena).
        const steer = (right ? 1 : 0) - (left ? 1 : 0)
        phys.heading += steer * phys.turnSpeed * dt
        kartRoot.rotation.y = phys.heading

        const fwd = new Vector3(Math.sin(phys.heading), 0, Math.cos(phys.heading))
        kartRoot.position.addInPlace(fwd.scale(phys.vel * dt))

        // Arena-grenzen + obstakels
        collideBoxes(kartRoot.position, CAR_RADIUS, arena.boxes)
        kartRoot.position.y = heightAt(kartRoot.position.x, kartRoot.position.z)

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

      // Schilden/vuurtjes syncen + draaien
      room.state.shells?.forEach((s, id) => {
        let m = shellMeshes.get(id)
        if (!m) { m = makeShellMesh(scene, s.kind, fireTex); shellMeshes.set(id, m) }
        m.position.set(s.x, heightAt(s.x, s.z) + 0.6, s.z); m.rotation.y += dt * 8
      })
      for (const id of [...shellMeshes.keys()]) {
        if (!room.state.shells?.get(id)) { disposeShellMesh(shellMeshes.get(id)); shellMeshes.delete(id) }
      }
      // Bommen syncen (lont knippert sneller naarmate hij korter wordt — hier simpel: schalen)
      room.state.bombs?.forEach((b, id) => {
        let m = bombMeshes.get(id)
        if (!m) { m = makeBombMesh(scene); bombMeshes.set(id, m) }
        m.position.set(b.x, heightAt(b.x, b.z) + 0.55, b.z)
        const pulse = 1 + Math.sin(now / 90) * 0.08
        m.scaling.setAll(pulse)
      })
      for (const id of [...bombMeshes.keys()]) {
        if (!room.state.bombs?.get(id)) { bombMeshes.get(id).dispose(); bombMeshes.delete(id) }
      }
      // Item-boxen syncen (zichtbaarheid via active, respawn op de server)
      room.state.boxes?.forEach((box, i) => {
        let m = itemBoxMeshes.get(i)
        if (!m) { m = makeItemBox(scene, box.x, box.z); itemBoxMeshes.set(i, m) }
        m.rotation.y += dt * 1.8
        m.position.y = heightAt(box.x, box.z) + 1.05 + Math.sin(now / 400 + i) * 0.15
        m.setEnabled(box.active)
      })

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

      {phase === 'playing' && amAlive && (
        <button
          className={'botsen-item-btn' + (heldItem ? ' has-item' : '')}
          onClick={() => useItemRef.current()}
          disabled={!heldItem}
        >
          <span className="botsen-item-emoji">{heldItem ? ITEM_INFO[heldItem]?.emoji : '❔'}</span>
          <span className="botsen-item-label">{heldItem ? ITEM_INFO[heldItem]?.label : 'Geen item'}</span>
          {heldItem && <span className="botsen-item-count">×{heldCount}</span>}
        </button>
      )}

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

      <div className="botsen-help">W/↑ gas · S/↓ rem · A/← D/→ sturen · spatie = item gebruiken · pak de ❔-blokken!</div>
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
