import { useEffect, useRef, useState } from 'react'
import {
  Engine, Scene, FollowCamera, TransformNode,
  HemisphericLight, DirectionalLight,
  Vector3, Color3, Color4,
  MeshBuilder, StandardMaterial, DynamicTexture, ParticleSystem,
  DefaultRenderingPipeline,
} from '@babylonjs/core'
import OrientationGate from '../OrientationGate'
import { KART_COLORS, AV_Y, AV_Z, buildKart, loadAvatar, safeJSON } from './kartShared'
import {
  ARENA_HALF, CAR_RADIUS, BOMB_RADIUS, BOMB_FUSE, DEK_Y, heightAt, clampHeightStep,
  BOXES_GROND, BOXES_BOVEN, collideBoxes,
} from './online/gedeeld/botsenArena.js'
import { maakItemBlok, maakProjectiel, maakBom } from './botsenItems'
import { nachtOmgeving, glowLaag, nachtLucht } from './neonOmgeving'
import { laadGebakkenMap } from './gebakkenMap'
import './botsen-game.css'
import { TerugKnop } from '../ui/index.jsx'
import Joystick, { ActieKnop } from './online/Joystick.jsx'
import { heeftAanraak } from './online/apparaat.js'
import { maakOfJoin, nieuweCode, FOUT_TEKST } from './online/verbinding.js'
import { autoKwaliteit } from './online/kwaliteit.js'
import VerbindingsMelding from './online/VerbindingsMelding.jsx'
import Icoon from './online/Iconen.jsx'
import { StartScherm, Wachtkamer, EindScherm, Aftelling } from './online/Schermen.jsx'

// ═══════════════════════════════════════════════════════════════════════
//  BALLONNENGEVECHT (intern "botsen", moet matchen met de server) — kart +
//  poppetje + besturing, maar in een kleine gesloten arena i.p.v. een baan.
//  Elke kart heeft 3 ballonnen; geraakt worden door een schild-projectiel
//  laat er één knappen. Bij 0 ballonnen lig je eruit. Laatste kart wint.
// ═══════════════════════════════════════════════════════════════════════

const ROOM_TYPE = 'botsen'

// Arena-vorm en botsingen: één bron met de server (online/gedeeld/botsenArena.js).
const BALLOON_COLORS = ['#ff4d6d', '#ffd23f', '#4dd2ff']
const ITEM_INFO = {
  schild:  { icoon: 'schild', label: 'Schild' },
  bom:     { icoon: 'bom', label: 'Bom' },
  vuurtje: { icoon: 'vuur', label: 'Vuurtje' },
}
const ACCENT = '#ff9a3d'   // neonoranje: de kleur van het ballonnengevecht in menu en HUD

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

// ── Zachte schaduwvlek onder een kart: de gebakken vloer vangt geen echte
//    schaduwen, en zonder schaduw lijkt een kart te zweven. ───────────────
let schaduwMat = null
function maakSchaduw(scene, ouder) {
  if (!schaduwMat || schaduwMat.getScene() !== scene) {
    const t = new DynamicTexture('kartSchaduwTex', { width: 128, height: 128 }, scene, false)
    const c = t.getContext(), g = c.createRadialGradient(64, 64, 4, 64, 64, 62)
    g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(0.6, 'rgba(0,0,0,0.4)'); g.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = g; c.fillRect(0, 0, 128, 128); t.update(); t.hasAlpha = true
    schaduwMat = new StandardMaterial('kartSchaduw', scene)
    schaduwMat.diffuseTexture = t; schaduwMat.useAlphaFromDiffuseTexture = true
    schaduwMat.disableLighting = true; schaduwMat.emissiveColor = Color3.Black(); schaduwMat.specularColor = Color3.Black()
  }
  const d = MeshBuilder.CreateGround('kartSchaduw', { width: 3.2, height: 4.2 }, scene)
  d.material = schaduwMat; d.parent = ouder; d.position.y = 0.04; d.isPickable = false
  return d
}

// ── Neongloed onder de kart, in de kart-kleur: zo herken je elkaar van ver
//    en straalt de lak ook op de (gebakken, donkere) vloer. ───────────────
let gloedTex = null
function maakOnderGloed(scene, ouder, hex) {
  if (!gloedTex || gloedTex.getScene() !== scene) {
    gloedTex = new DynamicTexture('kartGloedTex', { width: 128, height: 128 }, scene, false)
    const c = gloedTex.getContext(), g = c.createRadialGradient(64, 64, 10, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.45, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = g; c.fillRect(0, 0, 128, 128); gloedTex.update(); gloedTex.hasAlpha = true
  }
  const m = new StandardMaterial('kartGloed', scene)
  m.diffuseTexture = gloedTex; m.useAlphaFromDiffuseTexture = true
  m.disableLighting = true; m.diffuseColor = Color3.Black(); m.specularColor = Color3.Black()
  m.emissiveColor = Color3.FromHexString(hex); m.alphaMode = 1   // optellend: licht, geen verf
  m.alpha = 0.5
  const d = MeshBuilder.CreateGround('kartGloed', { width: 4.6, height: 5.8 }, scene)
  d.material = m; d.parent = ouder; d.position.y = 0.06; d.isPickable = false
  scene.effectLayers.forEach(l => l.addExcludedMesh?.(d))   // al zacht genoeg: niet nog eens door de gloedlaag
  d.onDisposeObservable.add(() => m.dispose())
  return d
}

// ── Naamkaartje: zwevend, altijd naar de camera gericht, boven de kart ──
function makeNameTag(scene, name, kleur = '#ffffff') {
  const plane = MeshBuilder.CreatePlane('bnametag', { width: 3.2, height: 0.8 }, scene)
  plane.billboardMode = 7 // Mesh.BILLBOARDMODE_ALL
  plane.isPickable = false
  const tex = new DynamicTexture('bnametagTex', { width: 256, height: 64 }, scene, false)
  const c = tex.getContext()
  c.clearRect(0, 0, 256, 64)
  // donker plaatje met een rand in de kart-kleur; bots zonder het robotje van de server
  const tekst = String(name || 'Speler').replace(/^\u{1F916}\s*/u, '').slice(0, 14)
  c.font = '900 28px "Baloo 2", Nunito, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'
  const br = Math.min(244, c.measureText(tekst).width + 36), x0 = 128 - br / 2
  c.fillStyle = 'rgba(11,10,26,0.78)'
  c.beginPath(); c.roundRect ? c.roundRect(x0, 12, br, 40, 14) : c.rect(x0, 12, br, 40); c.fill()
  c.strokeStyle = kleur; c.lineWidth = 3; c.stroke()
  c.fillStyle = '#fff'
  c.fillText(tekst, 128, 34)
  tex.update(); tex.hasAlpha = true
  const m = new StandardMaterial('bnametagMat', scene)
  // Emissive via de textuur, niet als vlakke witte kleur — anders licht het
  // hele kaartje op als één wit blok in plaats van alleen de letters.
  m.diffuseTexture = tex; m.emissiveTexture = tex; m.emissiveColor = new Color3(1, 1, 1)
  m.disableLighting = true; m.specularColor = Color3.Black()
  m.diffuseTexture.hasAlpha = true; m.useAlphaFromDiffuseTexture = true; m.backFaceCulling = false
  plane.material = m
  plane.position.y = 3.3
  return plane
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
// ── Explosie: felle lichtflits + deeltjes-uitbarsting + een uitdovende
//    ring die de schade-straal van de bom laat zien ──────────────────────
function makeExplosion(scene, x, y, z, radius, fireTex) {
  const burst = new ParticleSystem('boom', 140, scene)
  burst.particleTexture = fireTex
  burst.emitter = new Vector3(x, y + 0.3, z)
  burst.minEmitBox = new Vector3(-0.2, -0.2, -0.2); burst.maxEmitBox = new Vector3(0.2, 0.2, 0.2)
  burst.color1 = new Color4(1, 0.9, 0.4, 1); burst.color2 = new Color4(1, 0.4, 0.05, 1)
  burst.colorDead = new Color4(0.3, 0.05, 0, 0)
  burst.minSize = 0.6; burst.maxSize = 1.6
  burst.minLifeTime = 0.25; burst.maxLifeTime = 0.55
  burst.emitRate = 0
  burst.manualEmitCount = 90
  burst.blendMode = ParticleSystem.BLENDMODE_ADD
  burst.direction1 = new Vector3(-1, 0.3, -1); burst.direction2 = new Vector3(1, 1.6, 1)
  burst.minEmitPower = 3; burst.maxEmitPower = 9
  burst.gravity = new Vector3(0, -2, 0)
  burst.targetStopDuration = 0.15
  burst.disposeOnStop = true
  burst.start()

  // ringen die uitdijen tot de echte schade-straal en dan vervagen
  const rings = []
  for (let i = 0; i < 2; i++) {
    const ring = MeshBuilder.CreateTorus('boomRing' + i, { diameter: 0.6, thickness: 0.18, tessellation: 40 }, scene)
    ring.position.set(x, y + 0.15, z); ring.rotation.x = Math.PI / 2
    const rm = new StandardMaterial('boomRingM' + i, scene)
    rm.emissiveColor = new Color3(1, 0.55, 0.1); rm.disableLighting = true; rm.alpha = 0.85
    ring.material = rm
    rings.push({ mesh: ring, delay: i * 0.08 })
  }
  return { rings, radius, t: 0, dur: 0.5 }
}
function stepExplosion(ex, dt) {
  ex.t += dt
  ex.rings.forEach(r => {
    const rp = Math.min(1, Math.max(0, (ex.t - r.delay) / (ex.dur - r.delay)))
    const d = 0.6 + rp * (ex.radius * 2 - 0.6)
    r.mesh.scaling.setAll(d / 0.6)
    r.mesh.material.alpha = 0.85 * (1 - rp)
  })
  return ex.t >= ex.dur
}
function disposeExplosion(ex) { ex.rings.forEach(r => r.mesh.dispose()) }
// hex '#rrggbb' → [r,g,b] in 0..1
function hexRgb(hex) { const c = Color3.FromHexString(hex); return [c.r, c.g, c.b] }

// ── Zachte wolken: een paar losse bolletjes-clusters die stil in de lucht
//    hangen — puur sfeer, geen botsing. Maakt het "zwevend eiland"-gevoel
//    af zonder de arena zelf drukker te maken. ──
function buildClouds(scene) {
  const mat = new StandardMaterial('bcloudMat', scene)
  // Nachtwolken: donkere silhouetten met een violette onderkant-gloed van de
  // stad eronder — witte wolken zouden 's nachts als gaten in de lucht staan.
  mat.diffuseColor = Color3.Black(); mat.emissiveColor = new Color3(0.14, 0.07, 0.26)
  mat.specularColor = Color3.Black(); mat.alpha = 0.55
  const spots = [
    { x: -70, z: -30, y: 34 }, { x: 60, z: -55, y: 40 }, { x: -55, z: 60, y: 30 },
    { x: 75, z: 25, y: 44 }, { x: -20, z: -90, y: 38 }, { x: 30, z: 85, y: 36 },
  ]
  spots.forEach((s, si) => {
    const cluster = new TransformNode('bcloud' + si, scene)
    cluster.position.set(s.x, s.y, s.z)
    const puffs = 4 + Math.floor(Math.random() * 3)
    for (let i = 0; i < puffs; i++) {
      const r = 3 + Math.random() * 3.5
      const puff = MeshBuilder.CreateSphere('bcloudPuff' + si + i, { diameter: r * 2, segments: 8 }, scene)
      puff.material = mat; puff.isPickable = false
      puff.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 6)
      puff.scaling.y = 0.62
      puff.parent = cluster
    }
  })
}

// ── Arena: gebouwd in Blender (tools/blender/bouw_ballonnen.py) met gebakken
//    nachtlicht — zie gebakkenMap.js. De vorm (platforms, bruggen, hellingen,
//    leuningen, bumpers) volgt exact de constanten hierboven; de BOTSING komt
//    nog steeds uit die constanten (moet gelijk zijn aan de server), niet uit
//    de meshes. ─────────────────────────────────────────────────────────────
const ARENA_MAP = {
  map: '/ballonnen/', glb: 'arena.glb', lichtNiveau: 1.8,
  lightmaps: { floor: 'lm_vloer.jpg', '*': 'lm_arena.jpg' },
  geenBotsing: [''],   // alles: de botsing zit in de constanten, niet in meshes
  materialen: {
    ground_asfalt: { tex: '/tex/asfalt_diff.jpg', m: 5, tint: '#d6dbe6' },
    verf_wit:      { tint: '#e9eef7' },
    verf_geel:     { tint: '#ffd23f' },
    dek:           { tex: '/tex/vloer_diff.jpg', m: 3, tint: '#d2d8e4' },
    paneel:        { tex: '/tex/plaat_diff.jpg', m: 2.5, tint: '#8c95a5' },
    paneel_blauw:  { tex: '/tex/plaat_diff.jpg', m: 2.5, tint: '#6aa8ff' },
    paneel_rood:   { tex: '/tex/plaat_diff.jpg', m: 2.5, tint: '#ff6b78' },
    paneel_groen:  { tex: '/tex/plaat_diff.jpg', m: 2.5, tint: '#5fe39c' },
    paneel_geel:   { tex: '/tex/plaat_diff.jpg', m: 2.5, tint: '#ffcc4d' },
    staal:         { tint: '#59606d' },
    bumper_0:      { tint: '#9b5de5' }, bumper_1: { tint: '#f4a261' }, bumper_2: { tint: '#43aa8b' }, bumper_3: { tint: '#ff6b9d' },
    gebouw:        { gloed: '#5a5a5a', sterkte: 1, tex: '/tex/stad/ramen.jpg', m: 8, geenMist: true },
    dak:           { tint: '#1a1e27', geenMist: true },
    neon_blauw:    { gloed: '#19e6ff', sterkte: 1.2 },
    neon_rood:     { gloed: '#ff2f6e', sterkte: 1.2 },
    neon_groen:    { gloed: '#39ff88', sterkte: 1.2 },
    neon_geel:     { gloed: '#ffc21a', sterkte: 1.2 },
    neon_roze:     { gloed: '#ff2f8e', sterkte: 1.1 },
    neon_paars:    { gloed: '#b388ff', sterkte: 1.1 },
    bumperneon_0:  { gloed: '#9b5de5', sterkte: 1.3 }, bumperneon_1: { gloed: '#f4a261', sterkte: 1.3 },
    bumperneon_2:  { gloed: '#43aa8b', sterkte: 1.3 }, bumperneon_3: { gloed: '#ff6b9d', sterkte: 1.3 },
    lamp_wit:      { gloed: '#fff6e0', sterkte: 1.2 },
  },
}

function buildArena(scene) {
  const half = ARENA_HALF
  const nachtBodem = '#140f2e'
  nachtLucht(scene, half + 160)
  scene.clearColor = new Color4(...hexRgb(nachtBodem), 1)
  scene.fogMode = Scene.FOGMODE_EXP2; scene.fogDensity = 0.004
  scene.fogColor = new Color3(...hexRgb(nachtBodem))

  laadGebakkenMap(scene, ARENA_MAP)
  buildClouds(scene)

  // Botsingsblokken per hoogte: zie BOXES_GROND / BOXES_BOVEN (gedeeld met de server).
  return { boxesGrond: BOXES_GROND, boxesBoven: BOXES_BOVEN }
}

function BotsenMatch({ onBack, room, sessionId, joinCode, myColorProp }) {
  const canvasRef = useRef(null)
  const minimapRef = useRef(null)
  const [phase, setPhase] = useState('lobby')       // lobby | countdown | playing | gameover
  const [count, setCount] = useState(3)
  const [timeLeft, setTimeLeft] = useState(0)
  const [aliveCount, setAliveCount] = useState(0)
  const [myBalloons, setMyBalloons] = useState(3)
  const [amAlive, setAmAlive] = useState(true)
  const [amStunned, setAmStunned] = useState(false)
  const [heldItem, setHeldItem] = useState('')
  const [heldCount, setHeldCount] = useState(0)
  const [winnerName, setWinnerName] = useState('')
  const [players, setPlayers] = useState([])
  const stateRef = useRef({})
  const useItemRef = useRef(() => {})
  // Aanraakbesturing (iPad): duim op de stick = gas, opzij = sturen, naar je toe = remmen.
  const joyRef = useRef({ x: 0, z: 0, actief: false })
  const slipRef = useRef(false)
  const [aanraak] = useState(heeftAanraak)

  const startMatch = () => { room.send('start') }

  useEffect(() => {
    const canvas = canvasRef.current
    // geen preserveDrawingBuffer (kost op veel GPU's flink wat) en vraag de snelle GPU
    const engine = new Engine(canvas, true, { stencil: true, powerPreference: 'high-performance', loseContextOnDispose: true })
    const scene = new Scene(engine)

    // Nachtbelichting: het meeste licht komt uit de HDRI-omgeving en het neon
    // zelf. De "zon" is hier koel maanlicht dat alleen de vormen leest.
    // arena-licht is gebakken; ACES uit zodat de kleuren verzadigd blijven
    nachtOmgeving(scene, { intensiteit: 1.0, contrast: 1.1, belichting: 1.0, tonemap: false })
    glowLaag(scene, 0.35)
    const hemi = new HemisphericLight('h', new Vector3(0, 1, 0), scene)
    hemi.intensity = 1.0
    hemi.diffuse = new Color3(0.55, 0.62, 0.95)
    hemi.groundColor = new Color3(0.20, 0.06, 0.28)
    const sun = new DirectionalLight('s', new Vector3(-0.4, -1, -0.3), scene)
    sun.position = new Vector3(30, 50, 20); sun.intensity = 2.2
    sun.diffuse = new Color3(0.72, 0.80, 1.0)
    // Geen ShadowGenerator: de gebakken vloer reageert niet op licht, dus
    // schaduwen waren onzichtbaar maar kostten elk beeld een extra pass.
    // De schaduwvlek onder elke kart (maakSchaduw) doet het werk.

    const arena = buildArena(scene)
    const fireTex = makeFireTexture(scene)

    // ── Eigen kart + avatar ──
    // "outer" = positie/richting voor besturing + camera (blijft stabiel).
    // "kartRoot" (kind) = puur visueel; tolt los tijdens een treffer zonder
    // dat de camera meedraait — je scherm blijft dus rustig, alleen je
    // autootje met poppetje tolt even rond.
    // room.state.players kan bij mount nog leeg zijn (de eerste server-sync
    // komt soms een fractie later dan de join-belofte) — voor je EIGEN kart
    // gebruiken we daarom wat je net zelf in de lobby koos, niet wat we
    // terug proberen te lezen uit de (mogelijk nog lege) server-state.
    const myP = room.state.players?.get(sessionId)
    const myColor = myColorProp || myP?.color || KART_COLORS[(myP?.grid ?? 0) % KART_COLORS.length]
    const outer = new TransformNode('outerMe', scene)
    outer.position.set(myP?.x ?? 0, heightAt(myP?.x ?? 0, myP?.z ?? 0), myP?.z ?? 0)
    outer.rotation.y = myP?.rotY ?? 0
    const { root: kartRoot, wheels } = buildKart(scene, myColor, 'me')
    kartRoot.parent = outer
    maakSchaduw(scene, outer)
    maakOnderGloed(scene, outer, myColor)
    const myBalloonMeshes = buildBalloons(scene, 'me')
    myBalloonMeshes.forEach(b => { b.parent = kartRoot })

    const cam = new FollowCamera('cam', new Vector3(0, 6, -12), scene)
    cam.lockedTarget = outer
    cam.radius = 9; cam.heightOffset = 3.4; cam.rotationOffset = 180
    cam.cameraAcceleration = 0.06; cam.maxCameraSpeed = 40

    // ── Beeldbewerking: bloom pakt alleen het neon (drempel boven de gewone
    //    materialen), vignet duwt de aandacht naar het midden. Contrast en
    //    tonemapping staan al op de scene via nachtOmgeving. ──
    const pipeline = new DefaultRenderingPipeline('bpipeline', true, scene, [cam])
    pipeline.fxaaEnabled = true
    pipeline.samples = 1   // FXAA is genoeg; 4× MSAA kostte op Chromebooks te veel
    pipeline.bloomEnabled = true
    pipeline.bloomThreshold = 0.88; pipeline.bloomWeight = 0.4; pipeline.bloomKernel = 48; pipeline.bloomScale = 0.5
    pipeline.sharpenEnabled = false
    pipeline.sharpen.edgeAmount = 0.3
    pipeline.imageProcessing.vignetteEnabled = true
    pipeline.imageProcessing.vignetteWeight = 2.6
    pipeline.imageProcessing.vignetteColor = new Color4(0.04, 0.01, 0.10, 1)

    // Trage computer? Zelf terugschakelen (online/kwaliteit.js).
    const stopKwaliteit = autoKwaliteit(engine, scene, { pipe: pipeline })

    // ── Slip-vonken (Shift + sturen): puur visuele feedback tijdens het driften ──
    const driftPs = new ParticleSystem('driftPs', 60, scene)
    driftPs.particleTexture = fireTex
    driftPs.emitter = outer
    driftPs.minEmitBox = new Vector3(-0.6, -0.2, -1.6); driftPs.maxEmitBox = new Vector3(0.6, 0.1, -1.2)
    driftPs.color1 = new Color4(0.65, 0.85, 1, 0.9); driftPs.color2 = new Color4(1, 1, 1, 0.7)
    driftPs.colorDead = new Color4(0.4, 0.6, 1, 0)
    driftPs.minSize = 0.14; driftPs.maxSize = 0.32
    driftPs.minLifeTime = 0.15; driftPs.maxLifeTime = 0.3
    driftPs.emitRate = 0
    driftPs.blendMode = ParticleSystem.BLENDMODE_ADD
    driftPs.direction1 = new Vector3(-0.3, 0.2, -0.3); driftPs.direction2 = new Vector3(0.3, 0.6, 0.3)
    driftPs.minEmitPower = 0.5; driftPs.maxEmitPower = 1.2
    driftPs.start()

    loadAvatar(scene, localStorage.getItem('kk_shirt') || '', safeJSON(localStorage.getItem('kk_wearing')), (av) => {
      av.parent = kartRoot
      av.position.set(0, AV_Y, AV_Z)
      av.rotation = new Vector3(0, Math.PI, 0)
      zonderGloed(av)
    })

    // poppetjes gloeien niet: niet meetekenen in de gloedlaag (scheelt een pass per onderdeel)
    const zonderGloed = (av) => av.getChildMeshes?.(false).forEach(m => scene.effectLayers.forEach(l => l.addExcludedMesh?.(m)))

    // ── Remote karts (ook outer/visual gesplitst, voor dezelfde tol-animatie) ──
    const remotes = new Map()
    const makeRemote = (sid, p) => {
      const col = p.color || KART_COLORS[(p.grid ?? 0) % KART_COLORS.length]
      const outerR = new TransformNode('outer_r' + sid, scene)
      outerR.position.set(p.x || 0, heightAt(p.x || 0, p.z || 0), p.z || 0)
      outerR.rotation.y = p.rotY || 0
      const built = buildKart(scene, col, 'r' + sid)
      built.root.parent = outerR
      maakSchaduw(scene, outerR)
      maakOnderGloed(scene, outerR, col)
      const balloons = buildBalloons(scene, 'r' + sid)
      balloons.forEach(b => { b.parent = built.root })
      const nameTag = makeNameTag(scene, p.name, col)
      nameTag.parent = outerR
      const ent = { outer: outerR, visual: built.root, wheels: built.wheels, balloons, tx: outerR.position.x, tz: outerR.position.z, trot: outerR.rotation.y, tvel: 0, lastBalloons: 3, lastHitSeq: p.hitSeq ?? 0 }
      loadAvatar(scene, p.shirt || '', safeJSON(p.wearing), (av) => {
        av.parent = built.root; av.position.set(0, AV_Y, AV_Z); av.rotation = new Vector3(0, Math.PI, 0)
        zonderGloed(av)
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

    // ── Physics (rustiger tempo dan Karten — dit is bots-en-botsen, geen race) ──
    const phys = {
      vel: 0, maxSpeed: 19, accel: 17, brakeForce: 22, friction: 11,
      turnSpeed: 2.1, heading: myP?.rotY ?? 0, sendAcc: 0,
      drifting: false, driftPower: 0, boostTime: 0,
    }
    stateRef.current = { phys, scene }

    // ── Fase / sync ──
    let lastPhase = room.state.phase
    // room.state.players kan bij mount nog leeg zijn (de eerste server-sync
    // komt soms een fractie later dan de join-belofte) — daarom zet de kart
    // hierboven voorlopig op (0,0,0). Zodra de échte server-positie binnen
    // is, snappen we outer/heading er ÉÉN keer naartoe, zodat je niet
    // midden op de kaart blijft staan i.p.v. op je toegewezen spawn-plek.
    let spawnedFromServer = false
    const sync = (state) => {
      const arr = []
      state.players?.forEach((p, sid) => arr.push({
        sid, name: p.name, me: sid === sessionId, bot: p.isBot,
        color: (sid === sessionId && myColorProp) || p.color || KART_COLORS[(p.grid ?? 0) % KART_COLORS.length],
      }))
      setPlayers(arr)
      setCount(state.countdown)
      setTimeLeft(Math.max(0, Math.ceil(state.timeLeft ?? 0)))
      let alive = 0
      state.players?.forEach(p => { if (p.alive) alive++ })
      setAliveCount(alive)
      const me = state.players?.get(sessionId)
      if (me) {
        setMyBalloons(me.balloons); setAmAlive(me.alive); setHeldItem(me.item); setHeldCount(me.itemCount)
        if (!spawnedFromServer) {
          spawnedFromServer = true
          outer.position.set(me.x, heightAt(me.x, me.z), me.z)
          outer.rotation.y = me.rotY
          phys.heading = me.rotY
        }
      }
      if (state.phase !== lastPhase) {
        // nog een keer: iedereen staat weer op een startplek
        if (state.phase === 'lobby' && me) {
          outer.position.set(me.x, heightAt(me.x, me.z), me.z)
          outer.rotation.y = me.rotY; phys.heading = me.rotY; phys.vel = 0
        }
        lastPhase = state.phase
        setPhase(state.phase)
        if (state.phase === 'gameover') setWinnerName((state.winnerName || '').replace(/^\u{1F916}\s*/u, ''))
      }
    }
    sync(room.state)
    room.onStateChange(sync)

    // ── Bom-explosies: server stuurt een los bericht zodra een bom afgaat,
    //    zodat we een lichtflits + schade-straal-ring kunnen tonen. ──
    const explosions = []
    room.onMessage('bombBoom', (msg) => {
      explosions.push(makeExplosion(scene, msg.x, heightAt(msg.x, msg.z) + 0.2, msg.z, msg.r, fireTex))
    })

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
        e.tx = p.x; e.tz = p.z; e.trot = p.rotY; e.tvel = p.vel; e.stunTime = p.stunTime
        if (p.balloons !== e.lastBalloons) { setBalloons(e.balloons, p.balloons); e.lastBalloons = p.balloons }
        e.outer.setEnabled(p.alive)
      })
      for (const sid of [...remotes.keys()]) {
        if (!room.state.players?.get(sid)) { remotes.get(sid).outer.dispose(); remotes.delete(sid) }
      }
      const k = Math.min(1, dt * 12)
      remotes.forEach(e => {
        e.outer.position.x += (e.tx - e.outer.position.x) * k
        e.outer.position.z += (e.tz - e.outer.position.z) * k
        // Alleen omhoog via een helling (zie clampHeightStep), zo kun je onder
        // een brug door rijden i.p.v. dat je er per ongeluk op glitcht. Stijgen
        // gebeurt direct (de helling zelf is al geleidelijk — extra smoothing
        // maakt de kart alleen maar zichtbaar te laag tijdens het klimmen);
        // dalen blijft vloeiend, zodat een val van een rand er als een val
        // uitziet i.p.v. een snap.
        const rawYr = heightAt(e.outer.position.x, e.outer.position.z)
        const targetYr = clampHeightStep(rawYr, e.outer.position.y)
        e.outer.position.y = targetYr < e.outer.position.y
          ? e.outer.position.y + (targetYr - e.outer.position.y) * Math.min(1, dt * 9)
          : targetYr
        let dr = e.trot - e.outer.rotation.y
        while (dr > Math.PI) dr -= Math.PI * 2; while (dr < -Math.PI) dr += Math.PI * 2
        e.outer.rotation.y += dr * k
        e.wheels.forEach(w => { w.rotation.x += e.tvel * dt * 3 })
        // Tol-animatie + knipperende onkwetsbaarheid, los van de (stabiele) outer-rotatie
        if (e.stunTime > 0) {
          e.visual.rotation.y += 16 * dt
          const blink = Math.floor(now / 90) % 2 === 0
          e.visual.getChildMeshes(false).forEach(m => { m.visibility = blink ? 1 : 0.35 })
        } else if (e.visual.rotation.y !== 0) {
          e.visual.rotation.y = 0
          e.visual.getChildMeshes(false).forEach(m => { m.visibility = 1 })
        }
      })

      const playing = room.state.phase === 'playing'
      const meNow = room.state.players?.get(sessionId)
      if (meNow && meNow.balloons !== stateRef.current.lastMyBalloons) {
        setBalloons(myBalloonMeshes, meNow.balloons); stateRef.current.lastMyBalloons = meNow.balloons
      }
      const stunned = (meNow?.stunTime ?? 0) > 0
      setAmStunned(stunned)

      if (stunned) {
        // Getroffen: even geen besturing, autootje+poppetje tolt los rond
        // (de camera/outer staat stil — je scherm blijft dus rustig) en je
        // knippert als teken dat je nu onkwetsbaar bent.
        phys.vel = 0
        kartRoot.rotation.y += 16 * dt
        const blink = Math.floor(now / 90) % 2 === 0
        kartRoot.getChildMeshes(false).forEach(m => { m.visibility = blink ? 1 : 0.35 })
      } else if (kartRoot.rotation.y !== 0) {
        kartRoot.rotation.y = 0
        kartRoot.getChildMeshes(false).forEach(m => { m.visibility = 1 })
      }

      if (playing && meNow?.alive && !stunned) {
        const joy = joyRef.current
        const gas   = keys['w'] || keys['arrowup'] || (joy.actief && joy.z <= 0.45)
        const brake = keys['s'] || keys['arrowdown'] || (joy.actief && joy.z > 0.45)
        const left  = keys['a'] || keys['arrowleft']
        const right = keys['d'] || keys['arrowright']
        const driftKey = keys['shift'] || slipRef.current

        if (gas)        phys.vel += phys.accel * dt
        else if (brake) phys.vel -= phys.brakeForce * dt
        else { const f = phys.friction * dt; phys.vel = phys.vel > 0 ? Math.max(0, phys.vel - f) : Math.min(0, phys.vel + f) }

        // Slippen (Shift + sturen, met genoeg vaart): scherpere bocht, bouwt
        // een boost op. Loslaten (of stoppen met sturen) geeft een korte
        // snelheidsboost als er genoeg is opgebouwd — mini-turbo-gevoel.
        // toetsen sturen vol; de stick stuurt traploos (met een kleine dode zone)
        const stick = Math.abs(joy.x) > 0.15 ? Math.sign(joy.x) * Math.min(1, (Math.abs(joy.x) - 0.15) / 0.6) : 0
        const steer = (right ? 1 : 0) - (left ? 1 : 0) || stick
        const canDrift = driftKey && steer !== 0 && Math.abs(phys.vel) > phys.maxSpeed * 0.45
        if (canDrift) {
          phys.drifting = true
          phys.driftPower = Math.min(1.4, phys.driftPower + dt)
          phys.heading += steer * phys.turnSpeed * 1.8 * dt
        } else {
          if (phys.drifting) {
            if (phys.driftPower > 0.35) phys.boostTime = 0.8
            phys.drifting = false; phys.driftPower = 0
          }
          phys.heading += steer * phys.turnSpeed * dt
        }
        driftPs.emitRate = canDrift ? 90 : 0
        outer.rotation.y = phys.heading

        let capSpeed = phys.maxSpeed
        if (phys.boostTime > 0) {
          capSpeed = phys.maxSpeed * 1.45
          phys.vel = Math.max(phys.vel, capSpeed * 0.92)
          phys.boostTime = Math.max(0, phys.boostTime - dt)
        }
        phys.vel = Math.max(-phys.maxSpeed * 0.4, Math.min(capSpeed, phys.vel))

        const fwd = new Vector3(Math.sin(phys.heading), 0, Math.cos(phys.heading))
        outer.position.addInPlace(fwd.scale(phys.vel * dt))

        // Arena-grenzen + obstakels. Welke wanden gelden hangt af van je
        // hoogte: op de grond zijn de platforms dicht en bestaan de bruggen
        // niet, op het dek gelden de randen en de brugleuningen.
        const opDek = outer.position.y > DEK_Y
        collideBoxes(outer.position, CAR_RADIUS, opDek ? arena.boxesBoven : arena.boxesGrond)
        // Alleen omhoog via een helling (zie clampHeightStep), zo kun je onder
        // een brug door rijden i.p.v. dat je er per ongeluk op glitcht. Stijgen
        // gebeurt direct (de helling zelf is al geleidelijk — extra smoothing
        // maakt de kart alleen maar zichtbaar te laag tijdens het klimmen);
        // dalen blijft vloeiend, zodat een val van een rand er als een val
        // uitziet i.p.v. een snap.
        const rawY = heightAt(outer.position.x, outer.position.z)
        const targetY = clampHeightStep(rawY, outer.position.y)
        outer.position.y = targetY < outer.position.y
          ? outer.position.y + (targetY - outer.position.y) * Math.min(1, dt * 9)
          : targetY

        // Botsing met andere karts (beuken)
        remotes.forEach(e => {
          if (!e.outer.isEnabled()) return
          let dx = outer.position.x - e.outer.position.x
          let dz = outer.position.z - e.outer.position.z
          const d = Math.hypot(dx, dz), BUMP = 1.6 * 2
          if (d > 0.001 && d < BUMP) {
            const overlap = BUMP - d
            dx /= d; dz /= d
            outer.position.x += dx * overlap * 0.5
            outer.position.z += dz * overlap * 0.5
            phys.vel *= 0.7
          }
        })

        wheels.forEach(w => { w.rotation.x += phys.vel * dt * 3 })

        phys.sendAcc += dt
        if (phys.sendAcc >= 0.04) {
          phys.sendAcc = 0
          room.send('state', { x: outer.position.x, z: outer.position.z, rotY: phys.heading, vel: phys.vel })
        }
      } else {
        driftPs.emitRate = 0
      }

      // Schilden/vuurtjes: lokaal vloeiend doorgerekend, bijgestuurd door de server
      room.state.shells?.forEach((s, id) => {
        let m = shellMeshes.get(id)
        if (!m) {
          m = maakProjectiel(scene, s.kind, fireTex, s.x, heightAt(s.x, s.z) + 0.6, s.z)
          // beginrichting: de kart die hem net afvuurde (server zet hem 2,2 m voor de kart)
          let best = null, bd = 9
          room.state.players?.forEach(p => {
            const d = Math.hypot(p.x + Math.sin(p.rotY) * 2.2 - s.x, p.z + Math.cos(p.rotY) * 2.2 - s.z)
            if (d < bd) { bd = d; best = p }
          })
          if (best) { m.dx = Math.sin(best.rotY); m.dz = Math.cos(best.rotY) }
          shellMeshes.set(id, m)
        }
        m.server(s.x, s.z, now)
        m.stap(dt, now, heightAt)
      })
      for (const id of [...shellMeshes.keys()]) {
        if (!room.state.shells?.get(id)) {
          const m = shellMeshes.get(id)
          let raak = false
          room.state.players?.forEach(p => { if (Math.hypot(p.x - m.rx, p.z - m.rz) < 2.6) raak = true })
          m.weg(raak); shellMeshes.delete(id)
        }
      }
      // Bommen: neerploffen, lont sist, ring knippert steeds sneller
      room.state.bombs?.forEach((b, id) => {
        let m = bombMeshes.get(id)
        if (!m) { m = maakBom(scene, fireTex, b.x, heightAt(b.x, b.z), b.z, BOMB_RADIUS); bombMeshes.set(id, m) }
        m.stap(dt, b.x, heightAt(b.x, b.z), b.z, b.fuse, BOMB_FUSE)
      })
      for (const id of [...bombMeshes.keys()]) {
        if (!room.state.bombs?.get(id)) { bombMeshes.get(id).weg(); bombMeshes.delete(id) }
      }
      // ❔-blokken (zichtbaarheid via active, respawn op de server)
      room.state.boxes?.forEach((box, i) => {
        let m = itemBoxMeshes.get(i)
        if (!m) { m = maakItemBlok(scene, fireTex); itemBoxMeshes.set(i, m) }
        m.update(dt, now, box.active, box.x, heightAt(box.x, box.z) + 1.05, box.z, i)
      })

      // Bom-explosies: ring laten uitdijen tot de schade-straal, dan opruimen
      for (let i = explosions.length - 1; i >= 0; i--) {
        if (stepExplosion(explosions[i], dt)) { disposeExplosion(explosions[i]); explosions.splice(i, 1) }
      }

      // Minimap: "heading-up" — mijn pijl staat altijd vast rechtop (dat ben
      // ik, ik kijk omhoog op de kaart) en de tegenstanders draaien om mij
      // heen mee met mijn rijrichting, i.p.v. andersom.
      const mm = minimapRef.current
      if (mm) {
        const mctx = mm.getContext('2d')
        const S = mm.width, R = S / 2, RANGE = 60
        mctx.clearRect(0, 0, S, S)
        mctx.fillStyle = 'rgba(10,10,20,0.55)'
        mctx.beginPath(); mctx.arc(R, R, R - 2, 0, Math.PI * 2); mctx.fill()
        mctx.strokeStyle = 'rgba(255,255,255,0.35)'; mctx.lineWidth = 2
        mctx.beginPath(); mctx.arc(R, R, R - 2, 0, Math.PI * 2); mctx.stroke()
        // Mijn eigen kijkrichting als lokaal assenstelsel: "voor" en "rechts".
        const fxv = Math.sin(outer.rotation.y), fzv = Math.cos(outer.rotation.y)
        const rxv = fzv, rzv = -fxv
        room.state.players?.forEach((p, sid) => {
          if (sid === sessionId || !p.alive) return
          const dx = p.x - outer.position.x, dz = p.z - outer.position.z
          const lf = dx * fxv + dz * fzv   // hoe ver vóór mij
          const lr = dx * rxv + dz * rzv   // hoe ver rechts van mij
          const d = Math.hypot(lf, lr) || 0.0001
          const clamped = Math.min(d, RANGE) * ((R - 8) / RANGE)
          const mx = R + (lr / d) * clamped
          const my = R - (lf / d) * clamped   // "vóór mij" = omhoog op de kaart
          mctx.fillStyle = p.isBot ? '#ff8a3d' : '#ff4d6d'
          mctx.beginPath(); mctx.arc(mx, my, 5, 0, Math.PI * 2); mctx.fill()
          mctx.strokeStyle = 'rgba(0,0,0,0.5)'; mctx.lineWidth = 1; mctx.stroke()
        })
        // eigen kart: vaste pijl, wijst altijd recht omhoog (jij kijkt altijd "boven" op de kaart)
        mctx.fillStyle = '#4dd2ff'
        mctx.beginPath(); mctx.moveTo(R, R - 7); mctx.lineTo(R + 5, R + 6); mctx.lineTo(R - 5, R + 6); mctx.closePath(); mctx.fill()
      }

      scene.render()
    })

    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)

    return () => {
      stopKwaliteit()
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      window.removeEventListener('resize', onResize)
      scene.dispose(); engine.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const spelers = players.map(p => ({ sid: p.sid, naam: p.name, kleur: p.color, ik: p.me, bot: p.bot }))
  const itemIcoon = <Icoon key={heldItem || 'leeg'} className="botsen-item-icoon" naam={heldItem ? ITEM_INFO[heldItem]?.icoon : 'vraag'} />
  return (
    <div className="botsen-wrap">
      <OrientationGate />
      <canvas ref={canvasRef} className="botsen-canvas" />
      <VerbindingsMelding room={room} />
      {phase !== 'lobby' && phase !== 'gameover' && <TerugKnop onClick={onBack}>Stoppen</TerugKnop>}

      {phase === 'lobby' && (
        <Wachtkamer over accent={ACCENT} code={joinCode} room={room} spelers={spelers}
          onStart={startMatch} onBack={onBack} terugTekst="Stoppen" />
      )}

      {phase !== 'lobby' && phase !== 'gameover' && (
        <div className="botsen-hud">
          <div className="botsen-hud-rij">
            <span className="botsen-hud-tijd" title="Tijd over"><Icoon naam="klok" />{timeLeft}</span>
            <span className="botsen-hud-over" title="Spelers over"><Icoon naam="speler" />{aliveCount}</span>
          </div>
          <div className="botsen-hud-balloons" aria-label={myBalloons + ' ballonnen over'}>
            {[0, 1, 2].map(i => (
              <span key={i} className={i < myBalloons ? '' : 'popped'} style={{ '--sp': BALLOON_COLORS[i] }}><Icoon naam="ballon" /></span>
            ))}
          </div>
          <canvas ref={minimapRef} className="botsen-minimap" width={140} height={140} />
        </div>
      )}

      {phase === 'playing' && amStunned && <div className="on-bericht klein">Je tolt! Even onkwetsbaar</div>}

      {phase === 'countdown' && <Aftelling n={count} />}

      {aanraak && phase === 'playing' && amAlive && (
        <>
          <Joystick joyRef={joyRef} hint={amStunned ? null : 'Rijden'} />
          <div className="on-acties">
            <ActieKnop label="Slip" kleur="var(--kk-cyan)" onIn={() => { slipRef.current = true }} onUit={() => { slipRef.current = false }}>
              <Icoon naam="slip" />
            </ActieKnop>
            <ActieKnop
              className={'groot' + (heldItem ? ' botsen-heeft-item' : '')} kleur="var(--kk-pink)" uit={!heldItem}
              label={heldItem ? ITEM_INFO[heldItem]?.label : 'Geen item'} sub={heldItem ? '×' + heldCount : null}
              onTik={() => useItemRef.current()}
            >
              {itemIcoon}
            </ActieKnop>
          </div>
        </>
      )}

      {!aanraak && phase === 'playing' && amAlive && (
        <button
          className={'botsen-item-btn' + (heldItem ? ' has-item' : '')}
          onClick={() => useItemRef.current()}
          disabled={!heldItem}
        >
          {itemIcoon}
          <span className="botsen-item-label">{heldItem ? ITEM_INFO[heldItem]?.label : 'Geen item'}</span>
          {heldItem && <span className="botsen-item-count">×{heldCount} · spatie</span>}
        </button>
      )}

      {phase === 'playing' && !amAlive && (
        <div className="on-bericht">Uitgeschakeld<small>Kijk mee tot het einde</small></div>
      )}

      {phase === 'gameover' && (
        <EindScherm over kop="Einde" kleur={(winnerName && players.find(p => p.name.endsWith(winnerName))?.color) || 'var(--kk-gold)'}
          winnaar={winnerName ? <><span>{winnerName}</span> wint</> : 'Gelijkspel'}
          onOpnieuw={() => room.send('opnieuw')} onTerug={onBack} />
      )}

      {phase === 'playing' && (
        <div className="on-tip">
          {aanraak
            ? 'Duim op de stick = rijden · opzij = sturen · naar je toe = remmen · pak de blokken met het vraagteken'
            : 'W/↑ gas · S/↓ rem · A/← D/→ sturen · Shift = slippen · spatie = item gebruiken · pak de blokken met het vraagteken'}
        </div>
      )}
    </div>
  )
}

// ── Start (naam, kleur, potje maken of meedoen) en daarna het potje ─────
export default function BotsenGame({ onBack }) {
  const [room, setRoom] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [joinCode, setJoinCode] = useState(null)
  const [myColor, setMyColor] = useState('')
  const [melding, setMelding] = useState(null)

  // Lukt terugkomen na wegvallen niet, dan terug naar het startscherm met uitleg.
  useEffect(() => {
    if (!room) return
    const weg = (code) => {
      if (code === 4000 || code === 1000) return
      setMelding('De verbinding met het potje is verbroken. Maak een nieuw potje of doe opnieuw mee met de code.')
      setRoom(null)
    }
    room.onLeave(weg)
    return () => room.onLeave.remove(weg)
  }, [room])

  if (room) {
    return <BotsenMatch onBack={() => { try { room.leave() } catch {} ; setRoom(null) }} room={room} sessionId={sessionId} joinCode={joinCode} myColorProp={myColor} />
  }
  return <BotsenLobby
    melding={melding} onBack={onBack}
    onJoined={(r, jc, color) => { setMelding(null); setRoom(r); setSessionId(r.sessionId); setJoinCode(jc); setMyColor(color) }}
  />
}

function BotsenLobby({ onBack, onJoined, melding }) {
  const [name, setName] = useState(() => localStorage.getItem('kk_playername') || '')
  const [color, setColor] = useState(() => localStorage.getItem('kk_botsen_color') || KART_COLORS[0])
  const [error, setError] = useState(melding ?? null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)

  const connect = async (create, code = '') => {
    setLoading(true); setError(null)
    try {
      const shirt = localStorage.getItem('kk_shirt') || ''
      const wearing = localStorage.getItem('kk_wearing') || '{}'
      const joinCode = create ? nieuweCode(4) : code.trim()
      const opts = { joinCode, shirt, wearing, name: name || 'Speler', color }
      const room = await maakOfJoin(ROOM_TYPE, opts, { maak: create, onStatus: setStatus })
      if (name) localStorage.setItem('kk_playername', name)
      localStorage.setItem('kk_botsen_color', color)
      onJoined(room, joinCode, color)
    } catch (e) { setError(FOUT_TEKST[e?.soort] ?? FOUT_TEKST.server); setLoading(false); setStatus(null) }
  }

  return (
    <StartScherm
      accent={ACCENT} icoon="ballon" codeLengte={4} titel={<>Ballonnen<br /><span>gevecht</span></>}
      sub="Knal de ballonnen van de anderen. Wie als laatste nog ballonnen heeft, wint."
      onBack={onBack} naam={name} setNaam={setName} laden={loading} status={status} fout={error}
      onMaak={() => connect(true)} onJoin={c => connect(false, c)}>
      <div className="on-veld">
        <span className="on-label">Kleur van je kart</span>
        <div className="on-kleuren">
          {KART_COLORS.map((c, i) => (
            <button key={c} type="button" className={'on-kleur' + (c === color ? ' aan' : '')} style={{ '--sp': c }}
              aria-pressed={c === color} aria-label={'Kleur ' + (i + 1)} onClick={() => setColor(c)} />
          ))}
        </div>
      </div>
    </StartScherm>
  )
}
