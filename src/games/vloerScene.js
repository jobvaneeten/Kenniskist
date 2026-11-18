import {
  Engine, Scene, FreeCamera, Camera, Vector3, Color3, Color4,
  HemisphericLight, DirectionalLight, MeshBuilder, StandardMaterial, DynamicTexture,
  TransformNode, Mesh,
} from '@babylonjs/core'
import Poppetje from './online/Poppetje.js'
import { nachtOmgeving, glowLaag, nachtLucht } from './neonOmgeving.js'
import { autoKwaliteit } from './online/kwaliteit.js'
import { EMOTE_DUUR } from './online/emotes.js'
import { HALF, MIDDEN, SNELHEID, KLEUREN, VORMEN, vakVan, klem } from './online/gedeeld/vloerArena.js'

// De 3D-vloer van de Vloerquiz: vier neonvlakken met de antwoorden, het
// startvlak in het midden, de poppetjes, vallen bij een fout antwoord en het
// podium aan het eind. Dezelfde scene voor de leerkracht (bord, kijkt alleen)
// en de kinderen (lopen met joystick of pijltjes).
//
// Wie is te zien: tijdens een vraag niemand (een kind alleen zichzelf), bij de
// uitslag alleen wie het goed had (en jezelf). Het bord zoomt dan in op het
// goede vlak.
//
// opties: { ikId, haalState, stuur(type, data), invoerRef, hudRef, opUitslag(aantallen), opBeeldWeg() }
// opBeeldWeg: het 3D-beeld is weggevallen (WebGL-context kwijt, bv. een iPad
// met te weinig geheugen); VloerQuiz.jsx bouwt de scene dan opnieuw op.

const ACCENT = '#3df2ff'
const DIK = 0.6           // dikte van de vloer
const NAAD = 0.35         // ruimte tussen de vlakken
const VAL_TIJD = 2600     // ms, zoals op de server: dan staan de gevallen kinderen weer op het startvlak
const PODIUM = [{ x: 0, z: 0.6, h: 1.5 }, { x: -2.4, z: 0, h: 1.0 }, { x: 2.4, z: 0, h: 0.7 }]
const PODIUM_KLEUR = ['#ffd23d', '#c9d6ff', '#ff9a5a']
const SCHAAL = HALF / 13   // de camera stond goed bij een vloer van 26 m
// Geheugen op een tablet: nooit de hele klas tegelijk laden. Een kind ziet
// zichzelf en hooguit ANDEREN anderen, en nieuwe poppetjes komen er één voor
// één bij (een iPad liet het 3D-beeld anders wegvallen bij het meedoen).
const ANDEREN = 12
const MAX_GELADEN = 16
const STAP_KIND = 350, STAP_BORD = 90   // ms tussen twee nieuwe poppetjes

// ── Vormen (zoals de knoppen in de HUD) ──────────────────────────────────
export function tekenVorm(c, vorm, cx, cy, r) {
  c.beginPath()
  if (vorm === 'driehoek') { c.moveTo(cx, cy - r); c.lineTo(cx + r * 0.95, cy + r * 0.75); c.lineTo(cx - r * 0.95, cy + r * 0.75); c.closePath() }
  else if (vorm === 'ruit') { c.moveTo(cx, cy - r); c.lineTo(cx + r, cy); c.lineTo(cx, cy + r); c.lineTo(cx - r, cy); c.closePath() }
  else if (vorm === 'rondje') c.arc(cx, cy, r * 0.9, 0, Math.PI * 2)
  else c.rect(cx - r * 0.8, cy - r * 0.8, r * 1.6, r * 1.6)
  c.fill()
}

// Tekst zo groot mogelijk binnen een vak, over meer regels.
function pasTekst(c, tekst, br, hg, max = 170, min = 34) {
  for (let px = max; px >= min; px -= 6) {
    c.font = `900 ${px}px "Baloo 2", Nunito, Arial`
    const woorden = String(tekst).split(' '), regels = []
    let regel = ''
    for (const w of woorden) {
      const proef = regel ? regel + ' ' + w : w
      if (c.measureText(proef).width > br && regel) { regels.push(regel); regel = w } else regel = proef
    }
    regels.push(regel)
    const breedste = Math.max(...regels.map(r => c.measureText(r).width))
    if (regels.length * px * 1.05 <= hg && breedste <= br) return { regels, px }
  }
  c.font = `900 ${min}px "Baloo 2", Nunito, Arial`
  return { regels: [String(tekst).slice(0, 60)], px: min }
}

// ── Eén vlak van de vloer ────────────────────────────────────────────────
function maakVlak(scene, i) {
  const kleur = KLEUREN[i]
  const node = new TransformNode('vlak' + i, scene)
  const blok = MeshBuilder.CreateBox('vlakBlok' + i, { size: 1 }, scene)
  const bm = new StandardMaterial('vlakBlokMat' + i, scene)
  bm.diffuseColor = Color3.Black(); bm.specularColor = Color3.Black()
  bm.emissiveColor = Color3.FromHexString(kleur).scale(0.55)
  blok.material = bm; blok.parent = node; blok.isPickable = false
  const top = MeshBuilder.CreateGround('vlakTop' + i, { width: 1, height: 1 }, scene)
  const tm = new StandardMaterial('vlakTopMat' + i, scene)
  tm.diffuseColor = Color3.Black(); tm.specularColor = Color3.Black(); tm.disableLighting = true
  top.material = tm; top.parent = node; top.position.y = 0.012; top.isPickable = false
  return { i, kleur, node, blok, top, bm, tm, tex: null, sleutel: '', y: 0, vy: 0, aan: true }
}

// Het vlak tekenen: 'leeg' (alleen de vorm), 'antwoord', 'goed', 'fout', 'uit'.
function tekenVlak(scene, v, br, dp, stand, tekst) {
  const sleutel = `${br}|${dp}|${stand}|${tekst}`
  if (v.sleutel === sleutel) return
  v.sleutel = sleutel
  const W = br >= dp ? 1024 : 512, H = dp >= br ? 1024 : 512
  if (!v.tex || v.tex.getSize().width !== W || v.tex.getSize().height !== H) {
    v.tex?.dispose()
    v.tex = new DynamicTexture('vlakTex' + v.i, { width: W, height: H }, scene, true)
    v.tex.anisotropicFilteringLevel = 8   // scherpe tekst, ook schuin van boven
    v.tm.emissiveTexture = v.tex
  }
  const c = v.tex.getContext()
  const kleur = v.kleur
  c.clearRect(0, 0, W, H)
  c.fillStyle = '#07061a'; c.fillRect(0, 0, W, H)
  if (stand !== 'uit') {
    const g = c.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, Math.max(W, H) * 0.7)
    g.addColorStop(0, kleur + (stand === 'goed' ? 'aa' : stand === 'fout' ? '22' : '55'))
    g.addColorStop(1, kleur + (stand === 'goed' ? '55' : '11'))
    c.fillStyle = g; c.fillRect(0, 0, W, H)
    // fijn raster, zodat het een neonvloer is en geen plaatje
    c.strokeStyle = kleur + '33'; c.lineWidth = 2
    for (let x = 64; x < W; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke() }
    for (let y = 64; y < H; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke() }
    c.shadowColor = kleur; c.shadowBlur = 30
    c.strokeStyle = kleur; c.lineWidth = stand === 'goed' ? 26 : 16
    c.strokeRect(18, 18, W - 36, H - 36)
    c.shadowBlur = 0
  } else {
    c.strokeStyle = '#2a2850'; c.lineWidth = 10; c.strokeRect(14, 14, W - 28, H - 28)
  }
  const vorm = VORMEN[v.i]
  if (stand === 'leeg') {
    c.fillStyle = kleur; c.shadowColor = kleur; c.shadowBlur = 40
    tekenVorm(c, vorm, W / 2, H / 2, Math.min(W, H) * 0.24)
    c.shadowBlur = 0
  } else if (stand !== 'uit') {
    c.fillStyle = stand === 'fout' ? kleur + '88' : kleur
    tekenVorm(c, vorm, 100, 100, 46)
    const { regels, px } = pasTekst(c, tekst, W - 130, H - 260)
    c.fillStyle = stand === 'fout' ? 'rgba(255,255,255,0.4)' : '#ffffff'
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 12
    const y0 = H / 2 - ((regels.length - 1) * px * 1.05) / 2 + 20
    regels.forEach((r, k) => c.fillText(r, W / 2, y0 + k * px * 1.05))
    c.shadowBlur = 0
  }
  v.tex.update()
  v.bm.emissiveColor = stand === 'uit' ? new Color3(0.08, 0.08, 0.16) : Color3.FromHexString(kleur).scale(stand === 'goed' ? 1 : stand === 'fout' ? 0.25 : 0.55)
}

// Plek en maat van de vlakken: vier kwarten, of twee helften (waar/niet waar).
function zetIndeling(vlakken, aantal) {
  const k = HALF - NAAD / 2
  vlakken.forEach((v, i) => {
    let x, z, br, dp
    if (aantal === 2) {
      if (i > 1) { v.node.setEnabled(false); return }
      x = i === 0 ? -HALF / 2 - NAAD / 4 : HALF / 2 + NAAD / 4; z = 0; br = k; dp = HALF * 2
    } else {
      x = (i % 2 === 0 ? -1 : 1) * (HALF / 2 + NAAD / 4); z = (i < 2 ? 1 : -1) * (HALF / 2 + NAAD / 4); br = k; dp = k
    }
    v.node.setEnabled(true)
    v.node.position.x = x; v.node.position.z = z
    v.blok.scaling.set(br, DIK, dp); v.blok.position.y = -DIK / 2
    v.top.scaling.set(br, 1, dp)
    v.br = br; v.dp = dp
  })
}

// ── Startvlak in het midden ──────────────────────────────────────────────
function maakStartvlak(scene) {
  const pad = MeshBuilder.CreateCylinder('startvlak', { diameter: MIDDEN * 2, height: DIK + 0.06, tessellation: 64 }, scene)
  pad.position.y = -DIK / 2 + 0.03; pad.isPickable = false
  const tex = new DynamicTexture('startTex', { width: 512, height: 512 }, scene, true)
  const c = tex.getContext()
  c.fillStyle = '#0a0920'; c.fillRect(0, 0, 512, 512)
  c.shadowColor = ACCENT; c.shadowBlur = 24; c.strokeStyle = ACCENT
  c.lineWidth = 18; c.beginPath(); c.arc(256, 256, 236, 0, Math.PI * 2); c.stroke()
  c.lineWidth = 6; c.setLineDash([22, 18]); c.beginPath(); c.arc(256, 256, 170, 0, Math.PI * 2); c.stroke()
  c.setLineDash([]); c.shadowBlur = 0
  c.fillStyle = ACCENT; c.font = '900 64px "Baloo 2", Nunito, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'
  c.fillText('START', 256, 262)
  tex.update()
  const m = new StandardMaterial('startMat', scene)
  m.diffuseColor = Color3.Black(); m.specularColor = Color3.Black(); m.disableLighting = true
  m.emissiveTexture = tex
  pad.material = m
  return pad
}

// Neonrand om de hele vloer en vier lichtzuilen op de hoeken.
function maakRand(scene) {
  const neon = []
  const m = new StandardMaterial('randMat', scene)
  m.diffuseColor = Color3.Black(); m.specularColor = Color3.Black(); m.emissiveColor = Color3.FromHexString(ACCENT)
  const L = HALF * 2 + 0.4
  ;[[0, -HALF - 0.1, L, 0.12], [0, HALF + 0.1, L, 0.12], [-HALF - 0.1, 0, 0.12, L], [HALF + 0.1, 0, 0.12, L]].forEach(([x, z, w, d], i) => {
    const b = MeshBuilder.CreateBox('rand' + i, { width: w, height: 0.12, depth: d }, scene)
    b.position.set(x, -0.04, z); b.material = m; b.isPickable = false
    neon.push(b)
  })
  ;[[-1, 1, 0], [1, 1, 1], [-1, -1, 2], [1, -1, 3]].forEach(([sx, sz, k]) => {
    const z = MeshBuilder.CreateCylinder('zuil' + k, { diameter: 0.5, height: 7, tessellation: 12 }, scene)
    z.position.set(sx * (HALF + 1.4), -1.5, sz * (HALF + 1.4)); z.isPickable = false
    const zm = new StandardMaterial('zuilMat' + k, scene)
    zm.diffuseColor = Color3.Black(); zm.specularColor = Color3.Black(); zm.emissiveColor = Color3.FromHexString(KLEUREN[k])
    z.material = zm
    neon.push(z)
  })
  return neon
}

// Diepte: een raster ver onder de vloer, zodat vallen ook écht vallen is.
function maakDiepte(scene) {
  const g = MeshBuilder.CreateGround('diepte', { width: 400, height: 400 }, scene)
  g.position.y = -45; g.isPickable = false
  const tex = new DynamicTexture('diepteTex', { width: 512, height: 512 }, scene, true)
  const c = tex.getContext()
  c.fillStyle = '#05030f'; c.fillRect(0, 0, 512, 512)
  c.strokeStyle = '#2c1763'; c.lineWidth = 2
  for (let i = 0; i <= 512; i += 32) {
    c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 512); c.stroke()
    c.beginPath(); c.moveTo(0, i); c.lineTo(512, i); c.stroke()
  }
  tex.update()
  tex.uScale = 8; tex.vScale = 8
  const m = new StandardMaterial('diepteMat', scene)
  m.diffuseColor = Color3.Black(); m.specularColor = Color3.Black(); m.disableLighting = true
  m.emissiveTexture = tex; m.alpha = 0.5
  g.material = m
}

// Podium: drie treden met een groot cijfer aan de voorkant, een gloeiende
// rand bovenop, een lichtbundel van boven en een gloeiende ring eromheen.
function maakPodium(scene) {
  const node = new TransformNode('podium', scene)
  const gloed = []
  PODIUM.forEach((p, i) => {
    const kleur = PODIUM_KLEUR[i]
    const b = MeshBuilder.CreateBox('podium' + i, { width: 2.2, height: p.h, depth: 2.2 }, scene)
    b.position.set(p.x, p.h / 2, p.z); b.parent = node; b.isPickable = false
    const m = new StandardMaterial('podiumMat' + i, scene)
    m.diffuseColor = Color3.FromHexString('#141233'); m.specularColor = Color3.Black()
    m.emissiveColor = Color3.FromHexString('#1a1640')
    b.material = m
    // rand bovenop
    const rand = MeshBuilder.CreateBox('podiumRand' + i, { width: 2.32, height: 0.1, depth: 2.32 }, scene)
    rand.position.set(p.x, p.h, p.z); rand.parent = node; rand.isPickable = false
    const rm = new StandardMaterial('podiumRandMat' + i, scene)
    rm.diffuseColor = Color3.Black(); rm.specularColor = Color3.Black(); rm.emissiveColor = Color3.FromHexString(kleur)
    rand.material = rm
    gloed.push(rand)
    // cijfer aan de voorkant (de camera staat aan de -z-kant)
    const tex = new DynamicTexture('podiumCijfer' + i, { width: 256, height: 256 }, scene, true)
    const c = tex.getContext()
    c.clearRect(0, 0, 256, 256)
    c.font = '900 200px "Baloo 2", Nunito, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.shadowColor = kleur; c.shadowBlur = 30; c.fillStyle = kleur
    c.fillText(String(i + 1), 128, 142)
    tex.update(); tex.hasAlpha = true
    const vlak = MeshBuilder.CreatePlane('podiumVoor' + i, { width: 1.5, height: 1.5 }, scene)
    const h = Math.min(1.5, p.h * 0.9)
    vlak.scaling.set(h / 1.5, h / 1.5, 1)
    vlak.position.set(p.x, p.h / 2, p.z - 1.115); vlak.parent = node; vlak.isPickable = false
    const vm = new StandardMaterial('podiumVoorMat' + i, scene)
    vm.diffuseTexture = tex; vm.useAlphaFromDiffuseTexture = true; vm.disableLighting = true
    vm.emissiveColor = Color3.White(); vm.diffuseColor = Color3.Black(); vm.specularColor = Color3.Black()
    vlak.material = vm
    // lichtbundel van boven: een open kegel die naar onderen toe vervaagt
    const bundel = MeshBuilder.CreateCylinder('podiumBundel' + i, { diameterTop: 0.5, diameterBottom: 2.4, height: 9, tessellation: 24, cap: Mesh.NO_CAP }, scene)
    bundel.position.set(p.x, p.h + 4.5, p.z); bundel.parent = node; bundel.isPickable = false
    const bm = new StandardMaterial('podiumBundelMat' + i, scene)
    bm.diffuseColor = Color3.Black(); bm.specularColor = Color3.Black(); bm.emissiveColor = Color3.FromHexString(kleur)
    bm.alpha = 0.13; bm.backFaceCulling = false; bm.disableLighting = true
    bundel.material = bm
  })
  // gloeiende ring om het podium
  const ring = MeshBuilder.CreateTorus('podiumRing', { diameter: 9.4, thickness: 0.12, tessellation: 64 }, scene)
  ring.position.set(0, 0.05, 0.3); ring.parent = node; ring.isPickable = false
  const ringMat = new StandardMaterial('podiumRingMat', scene)
  ringMat.diffuseColor = Color3.Black(); ringMat.specularColor = Color3.Black(); ringMat.emissiveColor = Color3.FromHexString('#ffd23d')
  ring.material = ringMat
  gloed.push(ring)
  node.setEnabled(false)
  node.metadata = { gloed }
  return node
}

function maakRing(scene) {
  const t = new DynamicTexture('ikRingTex', { width: 128, height: 128 }, scene, true)
  const c = t.getContext()
  c.clearRect(0, 0, 128, 128)
  c.strokeStyle = '#fff'; c.shadowColor = '#fff'; c.shadowBlur = 10; c.lineWidth = 8; c.lineCap = 'round'
  c.beginPath(); c.arc(64, 64, 46, -Math.PI / 2 + 0.5, Math.PI * 1.5 - 0.5); c.stroke()
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(64, 2); c.lineTo(80, 26); c.lineTo(48, 26); c.closePath(); c.fill()
  t.update(); t.hasAlpha = true
  const d = MeshBuilder.CreateGround('ikRing', { width: 3.2, height: 3.2 }, scene)
  const m = new StandardMaterial('ikRingMat', scene)
  m.diffuseTexture = t; m.useAlphaFromDiffuseTexture = true; m.disableLighting = true
  m.diffuseColor = Color3.Black(); m.specularColor = Color3.Black(); m.emissiveColor = Color3.FromHexString(ACCENT).scale(1.4)
  d.material = m; d.isPickable = false; d.setEnabled(false)
  return d
}

let schaduwMat = null
function maakSchaduw(scene) {
  if (!schaduwMat || schaduwMat.getScene() !== scene) {
    const t = new DynamicTexture('blobTex', { width: 64, height: 64 }, scene, false)
    const c = t.getContext(), g = c.createRadialGradient(32, 32, 4, 32, 32, 32)
    g.addColorStop(0, 'rgba(0,0,0,0.65)'); g.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = g; c.fillRect(0, 0, 64, 64); t.update(); t.hasAlpha = true
    schaduwMat = new StandardMaterial('blobMat', scene)
    schaduwMat.diffuseTexture = t; schaduwMat.useAlphaFromDiffuseTexture = true
    schaduwMat.disableLighting = true; schaduwMat.emissiveColor = Color3.Black(); schaduwMat.specularColor = Color3.Black()
  }
  const d = MeshBuilder.CreateGround('blob', { width: 2, height: 2 }, scene)
  d.material = schaduwMat; d.isPickable = false
  d.alwaysSelectAsActiveMesh = true; d.doNotSyncBoundingInfo = true
  return d
}

const draagt = (json) => { try { return JSON.parse(json || '{}') } catch { return {} } }

export function maakVloerScene(canvas, { ikId = null, haalState, stuur, invoerRef, hudRef, opUitslag, opBeeldWeg }) {
  const engine = new Engine(canvas, true, { adaptToDeviceRatio: true, stencil: true, powerPreference: 'high-performance', loseContextOnDispose: true })
  const host = !ikId
  // Scherpte: zoveel pixels als het scherm echt heeft (hooguit 2 per CSS-pixel),
  // tot een maximum: het bord tot 4K (van ver lezen, tijdens een vraag staat er
  // weinig in beeld), een tablet tot ~1,6 miljoen (geheugen). Een schaal-level van
  // 0,5 betekent 2 beeldpunten per CSS-pixel.
  const zetScherpte = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const css = (canvas.clientWidth || innerWidth) * (canvas.clientHeight || innerHeight)
    const max = host ? 3840 * 2160 : 1.6e6
    engine.setHardwareScalingLevel(Math.max(1 / dpr, Math.sqrt(css / max)))
  }
  zetScherpte()
  const scene = new Scene(engine)
  scene.clearColor = new Color4(0.02, 0.012, 0.06, 1)
  scene.metadata = { kledingLicht: true }   // 35 poppetjes: lichte kleding (applyClothing.js)
  scene.skipPointerMovePicking = true

  // de camera staat aan de -z-kant: zo is +x rechts in beeld en +z boven
  const camera = new FreeCamera('cam', new Vector3(0, 26 * SCHAAL, -24 * SCHAAL), scene)
  camera.inputs.clear(); camera.minZ = 0.5; camera.maxZ = 600
  camera.setTarget(new Vector3(0, 0, host ? -1.5 : 0))
  const pasCamera = () => {
    const staand = engine.getRenderWidth() < engine.getRenderHeight()
    camera.fovMode = staand ? Camera.FOVMODE_HORIZONTAL_FIXED : Camera.FOVMODE_VERTICAL_FIXED
    camera.fov = staand ? 1.15 : (host ? 0.9 : 0.82)
  }
  pasCamera()

  nachtOmgeving(scene, { intensiteit: 0.7, contrast: 1.2, belichting: 1.1 })
  nachtLucht(scene, 300, { midden: '#0b0722', horizon: '#120a2c', gloed: '#3a1670' })
  // alleen de neonrand, de zuilen en het podium gloeien: de poppetjes niet nog een keer tekenen
  const glow = glowLaag(scene, 0.6)
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0.3), scene)
  hemi.intensity = 0.75; hemi.groundColor = new Color3(0.15, 0.1, 0.3)
  const zon = new DirectionalLight('zon', new Vector3(-0.4, -1, -0.5), scene)
  zon.intensity = 1.1

  // geen nabewerking (bloom): die tekende alles zonder anti-aliasing (wazig)
  // en kostte op een groot bord veel te veel
  // het bord nooit grover maken (dan is het van achter in de klas niet te lezen)
  const stopKwaliteit = autoKwaliteit(engine, scene, { pixels: !host, wacht: 10000 })

  const vlakken = [0, 1, 2, 3].map(i => maakVlak(scene, i))
  const startvlak = maakStartvlak(scene)
  const START_Y = startvlak.position.y
  const start = { y: 0, vy: 0, sinds: 0 }
  const neon = maakRand(scene)
  maakDiepte(scene)
  const podium = maakPodium(scene)
  const ikRing = maakRing(scene)
  ;[...neon, ...podium.metadata.gloed].forEach(m => glow.addIncludedOnlyMesh(m))
  // wat stilstaat hoeft niet elk beeld opnieuw doorgerekend te worden
  neon.forEach(m => m.freezeWorldMatrix())

  // camera van het bord: overzicht, of ingezoomd op het goede vlak
  const camStand = { pos: camera.position.clone(), doel: new Vector3(0, 0, host ? -1.5 : 0) }
  const camDoel = { pos: camStand.pos.clone(), doel: camStand.doel.clone() }
  const camKijk = camStand.doel.clone()

  const spelers = new Map()   // sid → { pop, schaduw, x, y, z, rot, val, plek, valt, vy }
  const lokaal = { x: 0, z: 0, rot: 0, loopt: false, verstuurd: 0, laatst: '' }
  const toetsen = {}
  const kd = e => { toetsen[e.code] = true }
  const ku = e => { toetsen[e.code] = false }
  window.addEventListener('keydown', kd)
  window.addEventListener('keyup', ku)

  let fase = '', vraagSleutel = '', indeling = 0, uitslagGedaan = false, dansSleutel = '', volgendePop = 0

  scene.registerBeforeRender(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.1)   // ook op een traag apparaat even snel lopen
    const s = haalState()
    if (!s?.players) return
    const opties = [...(s.opties ?? [])]
    const n = s.phase === 'vraag' || s.phase === 'uitslag' ? opties.length : 4

    // ── vlakken: indeling en tekst ─────────────────────────────────────
    if (n !== indeling) { zetIndeling(vlakken, n === 2 ? 2 : 4); indeling = n }
    const sleutel = `${s.phase}|${s.nr}|${s.goed}|${opties.join('§')}`
    if (sleutel !== vraagSleutel) {
      const nieuweVraag = s.phase === 'vraag' && fase !== 'vraag'
      vraagSleutel = sleutel
      vlakken.forEach(v => {
        if (n === 2 && v.i > 1) return
        const heeft = v.i < opties.length && (s.phase === 'vraag' || s.phase === 'uitslag')
        let stand = s.phase === 'einde' ? 'uit' : 'leeg'   // eindstand: donkere vloer, het podium valt op
        if (s.phase === 'vraag') stand = heeft ? 'antwoord' : 'uit'
        else if (s.phase === 'uitslag') stand = !heeft ? 'uit' : v.i === s.goed ? 'goed' : 'fout'
        tekenVlak(scene, v, v.br, v.dp, stand, heeft ? opties[v.i] : '')
        // bij een nieuwe vraag komen de gevallen vlakken weer omhoog
        if (nieuweVraag || s.phase === 'lobby' || s.phase === 'einde' || s.phase === 'aftellen') {
          if (v.y < -0.01) { v.y = -6; v.vy = 0; v.valt = false }
        }
        v.valt = s.phase === 'uitslag' && heeft && v.i !== s.goed
      })
    }
    vlakken.forEach(v => {
      if (v.valt) { v.vy -= 26 * dt; v.y += v.vy * dt; if (v.y < -60) v.y = -60 }
      else if (v.y < 0) { v.y += (0 - v.y) * Math.min(1, dt * 6); if (v.y > -0.01) v.y = 0 }
      v.node.position.y = v.y
      if (s.phase === 'uitslag' && v.i === s.goed) v.bm.emissiveColor = Color3.FromHexString(v.kleur).scale(0.7 + Math.sin(performance.now() / 120) * 0.15)
    })

    // startvlak valt mee met de foute vlakken en komt terug als de gevallen
    // kinderen er weer op worden gezet (VAL_TIJD op de server)
    const startValt = s.phase === 'uitslag' && performance.now() - start.sinds < VAL_TIJD
    if (startValt) { start.vy -= 26 * dt; start.y = Math.max(-60, start.y + start.vy * dt) }
    else if (start.y < 0) { if (start.y < -6) start.y = -6; start.vy = 0; start.y += (0 - start.y) * Math.min(1, dt * 6); if (start.y > -0.01) start.y = 0 }
    startvlak.position.y = START_Y + start.y

    // ── fase-overgangen ────────────────────────────────────────────────
    if (s.phase !== fase) {
      if (s.phase === 'uitslag') { uitslagGedaan = false; start.sinds = performance.now(); start.vy = 0 }
      podium.setEnabled(s.phase === 'einde')
      fase = s.phase
    }
    {
      const v = host && s.phase === 'uitslag' ? vlakken[s.goed] : null
      if (v) {
        // recht van voren, zo ver dat het hele vlak in beeld is
        const { x, z } = v.node.position
        const d = Math.max(v.br, v.dp) * 0.62 + 3
        camDoel.doel.set(x, 0.6, z - d * 0.12); camDoel.pos.set(x, 0.6 + d * 0.85, z - d * 0.9)
      } else if (s.phase === 'einde') {
        // het podium van dichtbij, het publiek erachter
        // iets naar rechts kijken: het podium schuift naar links, naast het eindstand-paneel
        camDoel.doel.set(2.2, 1.9, 1.2); camDoel.pos.set(2.2, 5.2, -10.5)
      } else { camDoel.doel.copyFrom(camStand.doel); camDoel.pos.copyFrom(camStand.pos) }
      const L = 1 - Math.exp(-dt * 3.5)
      camera.position.addInPlace(camDoel.pos.subtract(camera.position).scaleInPlace(L))
      camKijk.addInPlace(camDoel.doel.subtract(camKijk).scaleInPlace(L))
      camera.setTarget(camKijk)
    }
    if (s.phase === 'uitslag' && !uitslagGedaan) {
      uitslagGedaan = true
      const tel = opties.map(() => 0)
      s.players.forEach(p => { const k = vakVan(p.x, p.z, opties.length); if (k >= 0) tel[k]++ })
      opUitslag?.(tel)
    }

    // ── poppetjes ──────────────────────────────────────────────────────
    const magLopen = s.phase === 'lobby' || s.phase === 'vraag' || s.phase === 'uitslag'
    let opVlak = 0
    const nu0 = performance.now()
    // welke anderen een kind te zien krijgt (het bord: iedereen)
    let toegestaan = null
    if (!host) {
      const anderen = [...s.players.entries()].filter(([sid]) => sid !== ikId)
      const lijst = s.phase === 'vraag' ? []
        : s.phase === 'uitslag' ? anderen.filter(([, p]) => p.goed === 1)
        : s.phase === 'einde' ? anderen.sort((a, b) => b[1].score - a[1].score)
        : anderen   // wachtkamer: op volgorde van binnenkomst, dan wisselt het niet
      toegestaan = new Set(lijst.slice(0, ANDEREN).map(([sid]) => sid))
    }
    s.players.forEach((p, sid) => {
      let pl = spelers.get(sid)
      const ik = sid === ikId
      if (!ik && toegestaan && !toegestaan.has(sid)) {
        if (pl) { pl.pop.zichtbaar(false); pl.schaduw.setEnabled(false) }
        return
      }
      if (!pl) {
        // één voor één: zelf altijd meteen
        if (!ik && nu0 < volgendePop) return
        if (!ik) volgendePop = nu0 + (host ? STAP_BORD : STAP_KIND)
        pl = {
          pop: new Poppetje(scene, { schaal: 1.6, shirt: p.shirt, wearing: draagt(p.wearing), naam: p.name, kleur: ik ? ACCENT : '#b9b4ff', ik }),
          schaduw: maakSchaduw(scene),
          x: p.x, y: 0, z: p.z, rot: p.rotY, val: p.valSeq, plek: p.plekSeq, valt: false, vy: 0,
          emote: p.emoteSeq, emoteTot: 0,
        }
        spelers.set(sid, pl)
        if (ik) { lokaal.x = p.x; lokaal.z = p.z }
      }
      // gevallen van een fout vlak
      if (p.valSeq !== pl.val) { pl.val = p.valSeq; pl.valt = true; pl.vy = 3; pl.pop.vast('geraakt', false) }
      // de server zette dit poppetje ergens neer (start, weer terug na vallen, podium)
      if (p.plekSeq !== pl.plek) {
        pl.plek = p.plekSeq; pl.x = p.x; pl.z = p.z; pl.y = 0; pl.valt = false; pl.vy = 0; pl.rot = p.rotY
        pl.pop.vast(null); pl.emoteTot = 0
        if (ik) { lokaal.x = p.x; lokaal.z = p.z; lokaal.rot = p.rotY }
      }
      // wie mag je zien
      const zien = s.phase === 'vraag' ? ik : s.phase === 'uitslag' ? (ik || p.goed === 1) : true
      pl.pop.zichtbaar(zien)
      // emote: een paar seconden dansen, daarna (of bij weglopen) weer gewoon
      const nu = performance.now()
      if (p.emoteSeq !== pl.emote) {
        pl.emote = p.emoteSeq
        if (!pl.valt && p.emote) { pl.pop.vast(p.emote); pl.emoteTot = nu + EMOTE_DUUR }
      }
      const loopt = ik ? lokaal.loopt : p.loopt
      if (pl.emoteTot && (nu > pl.emoteTot || loopt || pl.valt)) {
        pl.emoteTot = 0
        if (!pl.valt) pl.pop.vast(null)
        if (s.phase === 'einde') dansSleutel = ''   // weer het podiumdansje
      }

      if (pl.valt) {
        pl.vy -= 30 * dt; pl.y = Math.max(-60, pl.y + pl.vy * dt)
      } else if (ik && magLopen) {
        // eigen poppetje: meteen bewegen, de server krijgt de plek
        const j = invoerRef?.current ?? { x: 0, z: 0 }
        let ix = j.x, iz = -j.z   // joystick omlaag = naar de camera
        if (toetsen.ArrowLeft || toetsen.KeyA) ix -= 1
        if (toetsen.ArrowRight || toetsen.KeyD) ix += 1
        if (toetsen.ArrowUp || toetsen.KeyW) iz += 1
        if (toetsen.ArrowDown || toetsen.KeyS) iz -= 1
        const len = Math.hypot(ix, iz)
        if (len > 1) { ix /= len; iz /= len }
        const loopt = len > 0.15
        lokaal.loopt = loopt
        if (loopt) {
          const k = klem(lokaal.x + ix * SNELHEID * dt, lokaal.z + iz * SNELHEID * dt)
          lokaal.x = k.x; lokaal.z = k.z; lokaal.rot = Math.atan2(ix, iz)
        }
        const bericht = `${lokaal.x.toFixed(2)},${lokaal.z.toFixed(2)},${loopt}`
        if (bericht !== lokaal.laatst && nu - lokaal.verstuurd > 90) {
          stuur('plek', { x: lokaal.x, z: lokaal.z, r: lokaal.rot, l: loopt, s: pl.plek })
          lokaal.laatst = bericht; lokaal.verstuurd = nu
        }
        pl.x = lokaal.x; pl.z = lokaal.z; pl.rot = lokaal.rot
        pl.pop.beweeg(loopt)
      } else {
        const L = 1 - Math.exp(-dt * 12)
        pl.x += (p.x - pl.x) * L; pl.z += (p.z - pl.z) * L
        let d = p.rotY - pl.rot
        while (d > Math.PI) d -= Math.PI * 2
        while (d < -Math.PI) d += Math.PI * 2
        pl.rot += d * L
        if (s.phase !== 'einde') pl.pop.beweeg(p.loopt)
      }

      // op het podium staan
      let vloerY = 0
      if (s.phase === 'einde') {
        const op = PODIUM.find(q => Math.abs(pl.x - q.x) < 1.1 && Math.abs(pl.z - q.z) < 1.1)
        if (op) vloerY = op.h
      }
      if (!pl.valt) pl.y = vloerY
      pl.pop.zet(pl.x, pl.y, pl.z, pl.rot)
      pl.schaduw.setEnabled(!pl.valt && zien)
      pl.schaduw.position.set(pl.x, vloerY + 0.08, pl.z)   // boven het startvlak (dat steekt 6 cm uit)
      if (ik) {
        ikRing.setEnabled(!pl.valt)
        ikRing.position.set(pl.x, vloerY + 0.09, pl.z)
        ikRing.rotation.y = pl.rot
        const vak = String(s.phase === 'vraag' ? vakVan(pl.x, pl.z, opties.length) : '')
        if (hudRef?.current && hudRef.current.dataset.vak !== vak) hudRef.current.dataset.vak = vak
      }
      if (!pl.valt && vakVan(p.x, p.z, opties.length || 4) >= 0) opVlak++
    })
    spelers.forEach((pl, sid) => {
      if (!s.players.has(sid)) { pl.pop.dispose(); pl.schaduw.dispose(); spelers.delete(sid) }
    })
    // te veel poppetjes geladen op een tablet: wie nu niet in beeld hoort, weg
    if (toegestaan && spelers.size - 1 > MAX_GELADEN) {
      for (const [sid, pl] of spelers) {
        if (spelers.size - 1 <= MAX_GELADEN) break
        if (sid !== ikId && !toegestaan.has(sid)) { pl.pop.dispose(); pl.schaduw.dispose(); spelers.delete(sid) }
      }
    }
    const tel = host && hudRef?.current?.querySelector('.vq-opvlak')
    if (tel && tel.textContent !== String(opVlak)) tel.textContent = opVlak

    // eindstand: de top drie juicht op het podium (en kiest daarna zelf een
    // dansje), het publiek klapt
    if (s.phase === 'einde') {
      const rij = [...s.players.entries()].sort((a, b) => b[1].score - a[1].score)
      const ds = rij.map(([sid]) => sid).join(',')
      if (ds !== dansSleutel) {
        dansSleutel = ds
        rij.forEach(([sid], i) => { const pl = spelers.get(sid); if (pl && !pl.emoteTot) pl.pop.vast(i < 3 ? 'juichen' : 'klappen') })
      }
    } else if (dansSleutel) {
      dansSleutel = ''
      spelers.forEach(pl => { if (!pl.valt) pl.pop.vast(null) })
    }
  })

  // Beeld kwijt (WebGL-context weg): even wachten of de browser hem
  // terugzet, anders de scene opnieuw laten opbouwen. Gooit het tekenen
  // steeds een fout, dan ook.
  let wegTimer = null, fouten = 0
  engine.onContextLostObservable.add(() => {
    clearTimeout(wegTimer)
    wegTimer = setTimeout(() => opBeeldWeg?.(), 1500)
  })
  engine.onContextRestoredObservable.add(() => {
    clearTimeout(wegTimer)
    vlakken.forEach(v => { v.sleutel = '' })   // de getekende vlakken opnieuw tekenen
    vraagSleutel = ''
  })
  engine.runRenderLoop(() => {
    try { scene.render(); fouten = 0 } catch (e) {
      if (++fouten === 1) console.error('Vloerquiz: tekenen mislukt', e)
      if (fouten === 30) opBeeldWeg?.()
    }
  })
  if (import.meta.env.DEV) window.__vloer = { engine, scene, spelers }   // meten tijdens het ontwikkelen
  const resize = () => { engine.resize(); zetScherpte(); pasCamera() }
  window.addEventListener('resize', resize)

  return {
    dispose() {
      clearTimeout(wegTimer)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      stopKwaliteit()
      spelers.forEach(pl => pl.pop.dispose())
      engine.stopRenderLoop()
      scene.dispose()
      engine.dispose()
    },
  }
}
