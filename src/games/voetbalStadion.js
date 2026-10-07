// ═══════════════════════════════════════════════════════════════════════════
//  Voetbal — avondstadion onder schijnwerpers.
//
//  Gebouwd voor Chromebooks/iPads: alles wat stilstaat is één keer getekend
//  (textures uit canvas, samengevoegde meshes), het publiek is één thin-
//  instance-mesh per onderdeel (2 draw calls voor duizenden mensen) en er is
//  maar één schaduwlicht met een strak schaduwvlak rond het veld. De "glans"
//  komt van emissieve lampen + bloom, niet van extra realtime lichten.
//
//  Maten van veld, muren en doelen komen van de aanroeper (moeten gelijk zijn
//  aan de server); het stadion eromheen is puur decor.
// ═══════════════════════════════════════════════════════════════════════════
import {
  Color3, Color4, Vector3, Matrix, Quaternion, Scene,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  MeshBuilder, StandardMaterial, DynamicTexture, Texture, Mesh,
  ParticleSystem, TransformNode,
} from '@babylonjs/core'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'

// ── stadionmaten (decor) ──
const TRIBUNE_START = 41      // afstand van het midden tot de eerste rij
const RIJEN = 16
const RIJ_H = 0.62, RIJ_D = 0.95
const TRIBUNE_LEN = 92        // lengte van een tribune langs het veld
const DAK_H = 17.5
const MAST = 52               // lichtmasten in de hoeken (±MAST, ±MAST)
const MAST_H = 34

const SHIRTS = ['#e63946', '#e63946', '#1d6fd0', '#1d6fd0', '#ffffff', '#ffd23f', '#111827', '#f4a261', '#2a9d8f', '#e76f51', '#8ecae6', '#ff006e']
const HUID = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac']

function rnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// ── Gras: maaipatroon, sprietjes, krijtlijnen en lichtvlekken ────────────
function grasTexture(scene, F) {
  const S = 2048, px = S / (F.half * 2)        // pixels per meter
  const t = new DynamicTexture('grasTex', { width: S, height: S }, scene, true)
  const c = t.getContext(), r = rnd(7)
  // maaibanen in twee richtingen (licht/donker), zoals in een echt stadion
  const banen = 16, bw = S / banen
  for (let i = 0; i < banen; i++) for (let j = 0; j < banen; j++) {
    const a = (i % 2) ^ (j % 2) ? 0 : 1, b = i % 2
    c.fillStyle = ['#1d6b2a', '#22792f', '#246f2c', '#2a8a36'][a * 2 + b]
    c.fillRect(i * bw, j * bw, bw + 1, bw + 1)
  }
  // sprietjes
  for (let k = 0; k < 90000; k++) {
    const x = r() * S, y = r() * S, l = 2 + r() * 4
    c.strokeStyle = r() < 0.5 ? 'rgba(10,40,12,.22)' : 'rgba(140,220,120,.12)'
    c.lineWidth = 1
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 2, y - l); c.stroke()
  }
  // krijtlijnen (posities in meters → pixels; midden = S/2)
  const m = v => S / 2 + v * px
  c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = 0.14 * px; c.lineJoin = 'round'
  const B = F.bound
  c.strokeRect(m(-B), m(-B), 2 * B * px, 2 * B * px)
  c.beginPath(); c.moveTo(m(-B), S / 2); c.lineTo(m(B), S / 2); c.stroke()
  c.beginPath(); c.arc(S / 2, S / 2, 8.2 * px, 0, Math.PI * 2); c.stroke()
  c.fillStyle = 'rgba(255,255,255,.95)'
  c.beginPath(); c.arc(S / 2, S / 2, 0.3 * px, 0, Math.PI * 2); c.fill()
  for (const s of [-1, 1]) {
    const lijn = m(s * B)
    const strafW = 33, strafD = 12.5, doelW = 16, doelD = 5
    // strafschopgebied + doelgebied (canvas-y loopt in dezelfde richting als z)
    c.strokeRect(m(-strafW / 2), s > 0 ? lijn - strafD * px : lijn, strafW * px, strafD * px)
    c.strokeRect(m(-doelW / 2), s > 0 ? lijn - doelD * px : lijn, doelW * px, doelD * px)
    const stip = lijn - s * 11 * px
    c.beginPath(); c.arc(S / 2, stip, 0.25 * px, 0, Math.PI * 2); c.fill()
    // strafschopboog: alleen het deel buiten het strafschopgebied
    const rand = lijn - s * strafD * px, R = 9.15 * px
    const hoek = Math.acos(Math.min(1, Math.abs(rand - stip) / R))
    c.beginPath()
    if (s > 0) c.arc(S / 2, stip, R, -Math.PI / 2 - hoek, -Math.PI / 2 + hoek)
    else c.arc(S / 2, stip, R, Math.PI / 2 - hoek, Math.PI / 2 + hoek)
    c.stroke()
  }
  // licht: midden helder, randen iets donkerder, vier lichte vlekken richting de masten
  const g = c.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S * 0.75)
  g.addColorStop(0, 'rgba(255,255,230,0.06)'); g.addColorStop(1, 'rgba(0,10,20,0.38)')
  c.fillStyle = g; c.fillRect(0, 0, S, S)
  t.update()
  t.anisotropicFilteringLevel = 8
  return t
}

// ── Ledborden rond het veld: neon-teksten die langzaam doorschuiven ──────
function ledTexture(scene) {
  const W = 2048, H = 128
  const t = new DynamicTexture('ledTex', { width: W, height: H }, scene, true)
  const c = t.getContext()
  const vakken = [
    ['KENNISKIST', '#3ef0ff', '#06122a'], ['REKENEN', '#ffd23f', '#1a0d2e'],
    ['GOED GEDAAN!', '#8cff5a', '#071a12'], ['TAAL', '#ff4fd8', '#1a0920'],
    ['SPELLING', '#ff9d2f', '#1f0e05'], ['TOPO', '#4f8cff', '#0a1030'],
  ]
  const vw = W / vakken.length
  vakken.forEach(([tekst, kleur, bg], i) => {
    const x = i * vw
    const gr = c.createLinearGradient(x, 0, x, H); gr.addColorStop(0, bg); gr.addColorStop(1, '#000')
    c.fillStyle = gr; c.fillRect(x, 0, vw, H)
    c.fillStyle = kleur; c.fillRect(x, 0, vw, 6); c.fillRect(x, H - 6, vw, 6)
    c.font = '900 64px "Russo One", Arial Black, sans-serif'
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.shadowColor = kleur; c.shadowBlur = 18; c.fillStyle = kleur
    c.fillText(tekst, x + vw / 2, H / 2 + 2)
    c.shadowBlur = 0
  })
  // led-raster
  c.fillStyle = 'rgba(0,0,0,.28)'
  for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 1)
  for (let x = 0; x < W; x += 4) c.fillRect(x, 0, 1, H)
  t.update()
  t.wrapU = Texture.WRAP_ADDRESSMODE
  return t
}

// ── Nachtlucht met sterren en een gloed boven het stadion ────────────────
function lucht(scene) {
  const t = new DynamicTexture('luchtTex', { width: 1024, height: 512 }, scene, false)
  const c = t.getContext(), r = rnd(3)
  const g = c.createLinearGradient(0, 0, 0, 512)
  g.addColorStop(0, '#02030b'); g.addColorStop(0.55, '#0a1030'); g.addColorStop(0.8, '#1d1745'); g.addColorStop(1, '#3a2a5a')
  c.fillStyle = g; c.fillRect(0, 0, 1024, 512)
  for (let i = 0; i < 700; i++) {
    const y = r() * 330, a = 0.25 + r() * 0.75 * (1 - y / 400)
    c.fillStyle = `rgba(255,255,255,${a})`
    const s = r() < 0.92 ? 1 : 2
    c.fillRect(r() * 1024, y, s, s)
  }
  t.update()
  const bol = MeshBuilder.CreateSphere('lucht', { diameter: 600, segments: 16, sideOrientation: Mesh.BACKSIDE }, scene)
  const m = new StandardMaterial('luchtMat', scene)
  m.emissiveTexture = t; m.disableLighting = true; m.fogEnabled = false; m.backFaceCulling = false
  bol.material = m; bol.isPickable = false; bol.infiniteDistance = true
  bol.applyFog = false
}

// mat met vaste kleur, zonder glans
function mat(scene, naam, hex, { emis = 0, alpha = 1 } = {}) {
  const m = new StandardMaterial(naam, scene)
  m.diffuseColor = Color3.FromHexString(hex)
  m.specularColor = Color3.Black()
  if (emis) m.emissiveColor = Color3.FromHexString(hex).scale(emis)
  if (alpha < 1) m.alpha = alpha
  return m
}

// ── Tribunes ──────────────────────────────────────────────────────────────
// Zijde 0..3 draait rond y; lokaal -z wijst van het veld af. Babylon draait
// lokaal (x, z) naar wereld (x·cos + z·sin, −x·sin + z·cos).
const ROT = [0, Math.PI / 2, Math.PI, -Math.PI / 2]
function naarWereld(zijde, x, lz) {
  const t = ROT[zijde], c = Math.cos(t), s = Math.sin(t)
  return [x * c + lz * s, -x * s + lz * c]
}

// Getrapte tribune als samengevoegde treden + achterwand + stoelruggen.
function tribune(scene, beton, stoel, zijde) {
  const delen = [], ruggen = []
  for (let i = 0; i < RIJEN; i++) {
    const h = (i + 1) * RIJ_H
    const tree = MeshBuilder.CreateBox('trede', { width: TRIBUNE_LEN, height: h, depth: RIJ_D }, scene)
    tree.position.set(0, h / 2, -(TRIBUNE_START + i * RIJ_D + RIJ_D / 2))
    delen.push(tree)
    const rug = MeshBuilder.CreateBox('rug', { width: TRIBUNE_LEN - 1, height: 0.38, depth: 0.1 }, scene)
    rug.position.set(0, h + 0.19, -(TRIBUNE_START + i * RIJ_D + RIJ_D * 0.9))
    ruggen.push(rug)
  }
  const diep = TRIBUNE_START + RIJEN * RIJ_D
  const wand = MeshBuilder.CreateBox('achterwand', { width: TRIBUNE_LEN, height: DAK_H, depth: 0.6 }, scene)
  wand.position.set(0, DAK_H / 2, -(diep + 0.3))
  delen.push(wand)
  const t = Mesh.MergeMeshes(delen, true, true), r = Mesh.MergeMeshes(ruggen, true, true)
  t.material = beton; r.material = stoel
  for (const m of [t, r]) { m.rotation.y = ROT[zijde]; m.isPickable = false; m.freezeWorldMatrix() }
}

// ── Publiek: duizenden mensjes als thin instances (2 draw calls) ─────────
function publiek(scene) {
  const r = rnd(11)
  const lijf = MeshBuilder.CreateBox('publiekLijf', { width: 0.46, height: 0.62, depth: 0.32 }, scene)
  const hoofd = MeshBuilder.CreateBox('publiekHoofd', { size: 0.26 }, scene)
  for (const [m, naam] of [[lijf, 'lijf'], [hoofd, 'hoofd']]) {
    const mt = new StandardMaterial('publiek_' + naam, scene)
    mt.diffuseColor = Color3.White(); mt.specularColor = Color3.Black()
    mt.emissiveColor = new Color3(0.12, 0.12, 0.14)
    m.material = mt; m.isPickable = false
  }
  const plekken = []
  for (let zijde = 0; zijde < 4; zijde++) {
    for (let rij = 0; rij < RIJEN; rij++) {
      for (let x = -TRIBUNE_LEN / 2 + 1; x < TRIBUNE_LEN / 2 - 1; x += 0.62) {
        if (r() < 0.16) continue                       // lege stoel
        const [wx, wz] = naarWereld(zijde, x, -(TRIBUNE_START + rij * RIJ_D + RIJ_D * 0.45))
        plekken.push({ x: wx, y: (rij + 1) * RIJ_H, z: wz, rot: ROT[zijde], fase: r() * 6.28, shirt: SHIRTS[Math.floor(r() * SHIRTS.length)], huid: HUID[Math.floor(r() * HUID.length)], gr: 0.9 + r() * 0.2 })
      }
    }
  }
  const n = plekken.length
  const mL = new Float32Array(n * 16), mH = new Float32Array(n * 16), cL = new Float32Array(n * 4), cH = new Float32Array(n * 4)
  const tmp = Matrix.Identity(), q = new Quaternion(), schaal = new Vector3(), pos = new Vector3()
  function schrijf(sprong) {
    for (let i = 0; i < n; i++) {
      const p = plekken[i], j = sprong ? Math.max(0, Math.sin(sprong * 9 + p.fase)) * 0.45 : 0
      Quaternion.FromEulerAnglesToRef(0, p.rot, 0, q)
      schaal.set(p.gr, p.gr, p.gr)
      pos.set(p.x, p.y + 0.31 * p.gr + j, p.z); Matrix.ComposeToRef(schaal, q, pos, tmp); tmp.copyToArray(mL, i * 16)
      pos.set(p.x, p.y + 0.75 * p.gr + j, p.z); Matrix.ComposeToRef(schaal, q, pos, tmp); tmp.copyToArray(mH, i * 16)
    }
  }
  plekken.forEach((p, i) => {
    const s = Color3.FromHexString(p.shirt), h = Color3.FromHexString(p.huid)
    cL.set([s.r, s.g, s.b, 1], i * 4); cH.set([h.r, h.g, h.b, 1], i * 4)
  })
  schrijf(0)
  lijf.thinInstanceSetBuffer('matrix', mL, 16, false); lijf.thinInstanceSetBuffer('color', cL, 4, true)
  hoofd.thinInstanceSetBuffer('matrix', mH, 16, false); hoofd.thinInstanceSetBuffer('color', cH, 4, true)
  lijf.alwaysSelectAsActiveMesh = true; hoofd.alwaysSelectAsActiveMesh = true
  let juichTot = 0, t = 0
  return {
    aantal: n,
    juich(sec = 4) { juichTot = Math.max(juichTot, sec) },
    update(dt) {
      if (juichTot <= 0) return
      t += dt; juichTot -= dt
      schrijf(juichTot > 0 ? t : 0)
      lijf.thinInstanceBufferUpdated('matrix'); hoofd.thinInstanceBufferUpdated('matrix')
    },
  }
}

// ── Lichtbundel van een mast naar het veld (additief, heel transparant) ──
function lichtbundel(scene, x, z, bundelMat) {
  const van = new Vector3(x, MAST_H + 3, z), doel = new Vector3(-x * 0.15, 0, -z * 0.15)
  const bundel = MeshBuilder.CreateCylinder('bundel', { height: Vector3.Distance(van, doel), diameterTop: 6, diameterBottom: 30, tessellation: 20, cap: Mesh.NO_CAP }, scene)
  bundel.material = bundelMat; bundel.isPickable = false
  bundel.position.copyFrom(van.add(doel).scale(0.5))
  const as = doel.subtract(van).normalize(), y = new Vector3(0, 1, 0)
  bundel.rotationQuaternion = Quaternion.RotationAxis(Vector3.Cross(y, as).normalize(), Math.acos(Vector3.Dot(y, as)))
}

// ── Blender-modellen (tools/blender/voetbalstadion.blend → public/voetbal) ──
// De glTF-materialen zijn PBR; zonder omgevingslicht worden die zwart, dus
// we vervangen ze op naam door goedkope StandardMaterials.
async function laadModel(scene, bestand, mats) {
  const c = await SceneLoader.LoadAssetContainerAsync('/voetbal/', bestand, scene)
  c.meshes.forEach(m => { if (m.material && mats[m.material.name]) m.material = mats[m.material.name] })
  c.materials.forEach(m => m.dispose())
  return (x, z, rotY, y = 0) => {
    const inst = c.instantiateModelsToScene(n => n, false)
    // de __root__ van glTF draagt de links/rechtshandig-omzetting: niet aan
    // zitten, maar in een eigen ouder hangen die we plaatsen en draaien
    const houder = new TransformNode('houder_' + bestand, scene)
    inst.rootNodes.forEach(r => { r.parent = houder })
    houder.position.set(x, y, z)
    houder.rotation.y = rotY + Math.PI   // Blender +Y komt als −Z binnen
    houder.computeWorldMatrix(true)
    houder.getChildMeshes(false).forEach(m => { m.isPickable = false; m.computeWorldMatrix(true); m.freezeWorldMatrix() })
    return houder
  }
}

// ── Scorebord-scherm: stand + tijd, alleen hertekend als er iets verandert ──
function schermTexture(scene) {
  const t = new DynamicTexture('schermTex', { width: 1024, height: 432 }, scene, true)
  let vorige = ''
  function teken(a, b, tijd) {
    const sleutel = a + '|' + b + '|' + tijd
    if (sleutel === vorige) return
    vorige = sleutel
    const c = t.getContext()
    // het model komt gespiegeld binnen (Blender → glTF → Babylon), dus spiegelen we de tekening ook
    c.setTransform(-1, 0, 0, 1, 1024, 0)
    const g = c.createLinearGradient(0, 0, 0, 432); g.addColorStop(0, '#071029'); g.addColorStop(1, '#02040c')
    c.fillStyle = g; c.fillRect(0, 0, 1024, 432)
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.font = '900 52px "Russo One", Arial Black, sans-serif'
    c.fillStyle = '#3ef0ff'; c.shadowColor = '#3ef0ff'; c.shadowBlur = 16
    c.fillText('KENNISKIST STADION', 512, 62)
    c.shadowBlur = 0
    c.font = '900 170px "Russo One", Arial Black, sans-serif'
    c.fillStyle = '#ff4d5e'; c.fillText(String(a), 300, 235)
    c.fillStyle = '#ffffff'; c.fillText('–', 512, 225)
    c.fillStyle = '#4f9dff'; c.fillText(String(b), 724, 235)
    c.font = '800 34px "Russo One", Arial Black, sans-serif'
    c.fillStyle = '#ff9aa4'; c.fillText('ROOD', 300, 352)
    c.fillStyle = '#9cc7ff'; c.fillText('BLAUW', 724, 352)
    c.fillStyle = '#ffd23f'; c.font = '900 56px "Russo One", Arial Black, sans-serif'
    c.fillText(tijd, 512, 350)
    c.fillStyle = 'rgba(0,0,0,.25)'
    for (let y = 0; y < 432; y += 4) c.fillRect(0, y, 1024, 1)
    t.update()
  }
  teken(0, 0, '2:00')
  return { t, teken }
}

export function bouwStadion(scene, F) {
  // F = { half, bound, cornerR, goalZ, goalHalfW, goalH, goalDepth }
  scene.clearColor = new Color4(0.01, 0.015, 0.04, 1)
  scene.fogMode = Scene.FOGMODE_EXP2
  scene.fogColor = new Color3(0.03, 0.04, 0.09)
  scene.fogDensity = 0.0028
  lucht(scene)

  // ── licht: koel maanlicht van boven + één schijnwerper met schaduw ──
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene)
  hemi.intensity = 0.55
  hemi.diffuse = new Color3(0.72, 0.8, 1.0)
  hemi.groundColor = new Color3(0.08, 0.1, 0.12)
  hemi.specular = Color3.Black()
  const zon = new DirectionalLight('schijnwerper', new Vector3(-0.45, -1, -0.35).normalize(), scene)
  zon.position = new Vector3(30, 60, 25)
  zon.intensity = 1.25
  zon.diffuse = new Color3(1.0, 0.97, 0.9)
  zon.specular = new Color3(0.5, 0.5, 0.5)
  zon.autoUpdateExtends = false
  zon.orthoLeft = -46; zon.orthoRight = 46; zon.orthoBottom = -46; zon.orthoTop = 46
  zon.shadowMinZ = 1; zon.shadowMaxZ = 160
  const tegen = new DirectionalLight('tegenlicht', new Vector3(0.5, -0.8, 0.45).normalize(), scene)
  tegen.intensity = 0.55
  tegen.diffuse = new Color3(0.75, 0.85, 1.0)
  tegen.specular = Color3.Black()
  const sg = new ShadowGenerator(1024, zon)
  sg.usePoissonSampling = true; sg.bias = 0.0006; sg.setDarkness(0.35)

  // ── grond rondom + veld ──
  const omgeving = MeshBuilder.CreateGround('omgeving', { width: 220, height: 220 }, scene)
  omgeving.position.y = -0.03; omgeving.isPickable = false
  omgeving.material = mat(scene, 'omgevingMat', '#0d1a12')
  const veld = MeshBuilder.CreateGround('ground', { width: F.half * 2, height: F.half * 2 }, scene)
  veld.receiveShadows = true; veld.isPickable = false
  const vm = new StandardMaterial('gmat', scene)
  vm.diffuseTexture = grasTexture(scene, F)
  vm.specularColor = new Color3(0.04, 0.05, 0.04)
  veld.material = vm
  // rand tussen veld en tribune: atletiekbaan-achtig donkerrood
  const baan = MeshBuilder.CreateGround('baan', { width: TRIBUNE_START * 2, height: TRIBUNE_START * 2 }, scene)
  baan.position.y = -0.015; baan.isPickable = false
  baan.material = mat(scene, 'baanMat', '#3a1d1f')

  // ── ledborden op de randmuur (zelfde vorm als de botsmuur) ──
  const led = ledTexture(scene)
  const ledMat = new StandardMaterial('ledMat', scene)
  ledMat.diffuseColor = Color3.Black(); ledMat.specularColor = Color3.Black()
  ledMat.emissiveTexture = led; ledMat.backFaceCulling = false
  const H2 = 1.05
  const C = F.bound - F.cornerR
  // één texture voor alle borden: de u-coördinaat loopt in meters/14, zodat
  // de teksten overal even groot zijn en samen doorschuiven
  const muur = (pts) => {
    const len = pts.reduce((s, p, i) => i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0)
    const onder = pts.map(([x, z]) => new Vector3(x, 0, z))
    const boven = pts.map(([x, z]) => new Vector3(x, H2, z))
    const rib = MeshBuilder.CreateRibbon('ledbord', { pathArray: [onder, boven], updatable: true }, scene)
    const uv = rib.getVerticesData('uv')
    for (let i = 0; i < uv.length; i += 2) uv[i] *= len / 14
    rib.setVerticesData('uv', uv)
    rib.material = ledMat; rib.isPickable = false
  }
  muur([[F.bound, -C], [F.bound, C]])
  muur([[-F.bound, C], [-F.bound, -C]])
  muur([[F.goalHalfW, F.bound], [C, F.bound]])
  muur([[-C, F.bound], [-F.goalHalfW, F.bound]])
  muur([[C, -F.bound], [F.goalHalfW, -F.bound]])
  muur([[-F.goalHalfW, -F.bound], [-C, -F.bound]])
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const pts = []
    for (let i = 0; i <= 14; i++) {
      const th = (i / 14) * (Math.PI / 2)
      pts.push([sx * (C + F.cornerR * Math.cos(th)), sz * (C + F.cornerR * Math.sin(th))])
    }
    muur(pts)
  }

  // ── doelen: witte palen + net met ruitjes ──
  const paal = mat(scene, 'doelpaal', '#ffffff', { emis: 0.35 })
  const net = new DynamicTexture('netTex', { width: 512, height: 512 }, scene, true)
  const nc = net.getContext(); nc.clearRect(0, 0, 512, 512)
  nc.strokeStyle = 'rgba(235,240,255,0.85)'; nc.lineWidth = 2.5
  for (let k = -512; k <= 1024; k += 20) {
    nc.beginPath(); nc.moveTo(k, 0); nc.lineTo(k + 512, 512); nc.stroke()
    nc.beginPath(); nc.moveTo(k, 512); nc.lineTo(k + 512, 0); nc.stroke()
  }
  net.update(); net.hasAlpha = true
  const netMat = new StandardMaterial('netMat', scene)
  netMat.diffuseTexture = net; netMat.useAlphaFromDiffuseTexture = true
  netMat.backFaceCulling = false; netMat.specularColor = Color3.Black()
  netMat.emissiveColor = new Color3(0.25, 0.25, 0.3)
  const cyl = (x, y, z, h, d, rx = 0, rz = 0) => {
    const m = MeshBuilder.CreateCylinder('gp', { height: h, diameter: d, tessellation: 14 }, scene)
    m.material = paal; m.isPickable = false; m.position.set(x, y, z); m.rotation.x = rx; m.rotation.z = rz
    sg.addShadowCaster(m)
  }
  for (const gz of [-F.goalZ, F.goalZ]) {
    const open = gz < 0 ? 1 : -1, bZ = gz - open * F.goalDepth, midZ = (gz + bZ) / 2
    cyl(-F.goalHalfW, F.goalH / 2, gz, F.goalH, 0.14)
    cyl(F.goalHalfW, F.goalH / 2, gz, F.goalH, 0.14)
    cyl(0, F.goalH, gz, F.goalHalfW * 2 + 0.14, 0.12, 0, Math.PI / 2)
    cyl(-F.goalHalfW, F.goalH, midZ, F.goalDepth, 0.08, Math.PI / 2)
    cyl(F.goalHalfW, F.goalH, midZ, F.goalDepth, 0.08, Math.PI / 2)
    const vlak = (w, h, x, y, z, ry, rx = 0) => {
      const p = MeshBuilder.CreatePlane('net', { width: w, height: h }, scene)
      p.position.set(x, y, z); p.rotation.y = ry; p.rotation.x = rx; p.material = netMat; p.isPickable = false
    }
    vlak(F.goalHalfW * 2, F.goalH, 0, F.goalH / 2, bZ, open < 0 ? Math.PI : 0)
    vlak(F.goalDepth, F.goalH, -F.goalHalfW, F.goalH / 2, midZ, Math.PI / 2)
    vlak(F.goalDepth, F.goalH, F.goalHalfW, F.goalH / 2, midZ, -Math.PI / 2)
    vlak(F.goalHalfW * 2, F.goalDepth, 0, F.goalH, midZ, 0, -Math.PI / 2)
  }

  // ── tribunes, dak, lichtmasten ──
  const beton = mat(scene, 'beton', '#5a5f6e')
  const stoel = mat(scene, 'stoel', '#1d3f8a', { emis: 0.15 })
  for (let z = 0; z < 4; z++) tribune(scene, beton, stoel, z)
  const bundelMat = new StandardMaterial('bundelMat', scene)
  bundelMat.emissiveColor = new Color3(1.0, 0.95, 0.8)
  bundelMat.diffuseColor = Color3.Black(); bundelMat.specularColor = Color3.Black()
  bundelMat.alpha = 0.022; bundelMat.backFaceCulling = false; bundelMat.disableLighting = true
  bundelMat.alphaMode = 1   // additief
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) lichtbundel(scene, sx * MAST, sz * MAST, bundelMat)

  // modellen uit Blender: dak per zijde, lichtmasten in de hoeken, twee schermen
  const scherm = schermTexture(scene)
  const schermMat = new StandardMaterial('schermMat', scene)
  schermMat.diffuseColor = Color3.Black(); schermMat.specularColor = Color3.Black()
  schermMat.emissiveTexture = scherm.t
  const mats = {
    staal: mat(scene, 'staal', '#9aa3b5'),
    lamp: mat(scene, 'lamp', '#fff6d8', { emis: 2.4 }),
    paneel: mat(scene, 'paneel', '#151821'),
    neon: mat(scene, 'neon', '#3ef0ff', { emis: 1.6 }),
    dakplaat: mat(scene, 'dakplaat', '#262b36'),
    scherm: schermMat,
  }
  ;(async () => {
    try {
      const [dak, mast, bord] = await Promise.all(['dak.glb', 'lichtmast.glb', 'scorebord.glb'].map(b => laadModel(scene, b, mats)))
      for (let z = 0; z < 4; z++) { const [x, zz] = naarWereld(z, 0, -(TRIBUNE_START - 4)); dak(x, zz, ROT[z]) }
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) mast(sx * MAST, sz * MAST, Math.atan2(-sx, -sz))
      for (const z of [0, 2]) { const [x, zz] = naarWereld(z, 0, -(TRIBUNE_START + 4)); bord(x, zz, ROT[z], 24.5) }
    } catch (e) { console.warn('stadionmodellen niet geladen', e) }
  })()

  const fans = publiek(scene)

  // ── flitslichtjes van camera's op de tribunes ──
  const flits = new ParticleSystem('flitsen', 60, scene)
  const ft = new DynamicTexture('flitsTex', { width: 32, height: 32 }, scene, false)
  const fc = ft.getContext(), fg = fc.createRadialGradient(16, 16, 0, 16, 16, 16)
  fg.addColorStop(0, 'rgba(255,255,255,1)'); fg.addColorStop(1, 'rgba(255,255,255,0)')
  fc.fillStyle = fg; fc.fillRect(0, 0, 32, 32); ft.update(); ft.hasAlpha = true
  flits.particleTexture = ft
  flits.emitter = Vector3.Zero()
  flits.startPositionFunction = (wm, pos) => {
    const zijde = Math.floor(Math.random() * 4)
    const rij = Math.random() * RIJEN
    const [wx, wz] = naarWereld(zijde, (Math.random() - 0.5) * TRIBUNE_LEN * 0.9, -(TRIBUNE_START + rij * RIJ_D))
    pos.set(wx, rij * RIJ_H + 1.4, wz)
  }
  flits.minSize = 0.5; flits.maxSize = 1.1
  flits.minLifeTime = 0.06; flits.maxLifeTime = 0.12
  flits.emitRate = 6
  flits.color1 = new Color4(1, 1, 1, 1); flits.color2 = new Color4(0.9, 0.95, 1, 1)
  flits.blendMode = ParticleSystem.BLENDMODE_ADD
  flits.gravity = Vector3.Zero(); flits.minEmitPower = 0; flits.maxEmitPower = 0
  flits.start()

  let ledT = 0
  const stadion = {
    publiek: fans,
    scorebord: (a, b, tijd) => scherm.teken(a, b, tijd),
    juich() { fans.juich(4); flits.emitRate = 60; setTimeout(() => { flits.emitRate = 6 }, 3500) },
    update(dt) {
      ledT += dt
      const off = (ledT * 0.02) % 1
      led.uOffset = off
      fans.update(dt)
    },
  }
  return { sg, stadion }
}

