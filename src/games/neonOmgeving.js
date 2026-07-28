// Gedeelde "donkere neon-arena"-look voor Paintball en Ballonnengevecht.
//
// Waarom dit bestaat: beide scenes draaiden op StandardMaterial met platte
// kleuren en één diffuse texture. Dat leest altijd als plastic — er is geen
// reflectie, geen microdetail in het oppervlak en geen tonemapping, dus fel
// licht "klipt" naar wit en donker wordt vlak zwart. Hier staat de vervanging:
// echte PBR-materialen (albedo + normal + AO/rough/metal), een HDRI als
// omgevingslicht zodat metaal iets te spiegelen heeft, en emissieve neon die
// de GlowLayer oppikt.
//
// Texturesets komen van Poly Haven (CC0) en staan in public/tex als
// <set>_diff.jpg / <set>_nor.jpg / <set>_arm.jpg.
import {
  PBRMaterial, Texture, HDRCubeTexture, CubeTexture, Color3,
  GlowLayer, ImageProcessingConfiguration, MeshBuilder, DynamicTexture,
  StandardMaterial,
} from '@babylonjs/core'

const HDRI = '/env/nacht_1k.hdr'

// Beschikbare sets in public/tex.
export const SET = {
  vloer:  'vloer',   // versleten beton — vloeren, platformdekken
  plaat:  'plaat',   // metaalplaat — randen, bruggen, constructie
  muur:   'muur',    // betonblokken — muren, gebouwen, dekking
  asfalt: 'asfalt',  // asfalt — buitengrond, straten
  gras:   'gras',    // gras met steengruis — bosgrond
  zand:   'zand',    // zand — dorpsgrond
}

// Eén Texture-object per (scene, bestand): een PBR-set wordt op tientallen
// meshes gebruikt en elke `new Texture` is anders een aparte GPU-upload.
const cache = new WeakMap()
function tex(scene, pad) {
  let perScene = cache.get(scene)
  if (!perScene) { perScene = new Map(); cache.set(scene, perScene) }
  let t = perScene.get(pad)
  if (!t) { t = new Texture(pad, scene); perScene.set(pad, t) }
  return t
}

// De UV-schaal verschilt per mesh, dus elk materiaal krijgt een eigen
// texture-instantie die de GPU-textuur deelt met de gecachete basis.
// `uv` is één getal (gelijk in u en v) of [u, v].
function schaal(scene, pad, uv) {
  const t = tex(scene, pad).clone()
  const [u, v] = Array.isArray(uv) ? uv : [uv, uv]
  t.uScale = u; t.vScale = v
  return t
}

// ── Omgevingslicht: HDRI als IBL. Zonder dit blijft elk PBR-materiaal dof,
//    want metaal en glans hebben iets nodig om te spiegelen. ───────────────
export function nachtOmgeving(scene, { intensiteit = 0.4, contrast = 1.3, belichting = 1.0 } = {}) {
  const env = new HDRCubeTexture(HDRI, scene, 128, false, true, false, true)
  scene.environmentTexture = env
  scene.environmentIntensity = intensiteit

  // ACES-tonemapping: houdt neon en koplampen kleurig in plaats van uitgebeten
  // wit, en trekt de donkere delen open zodat het niet dichtslibt.
  const ip = scene.imageProcessingConfiguration
  ip.toneMappingEnabled = true
  ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES
  ip.contrast = contrast
  ip.exposure = belichting
  return env
}

// Neon moet gloeien, anders is het gewoon een felle kleur.
export function glowLaag(scene, intensiteit = 0.45) {
  const g = new GlowLayer('neonGlow', scene, { blurKernelSize: 40, mainTextureFixedSize: 512 })
  g.intensity = intensiteit
  return g
}

// ── PBR-materiaal uit een Poly Haven-set ─────────────────────────────────
// arm-map is R=ambient occlusion, G=roughness, B=metalness — precies de
// packing die Babylon met deze drie vlaggen uit één texture leest.
export function pbrMat(scene, naam, set, { uv = 4, tint = null, ruw = 1, metaal = 1, bump = 1 } = {}) {
  const m = new PBRMaterial(naam, scene)
  m.albedoTexture = schaal(scene, `/tex/${set}_diff.jpg`, uv)
  m.bumpTexture = schaal(scene, `/tex/${set}_nor.jpg`, uv)
  m.bumpTexture.level = bump
  m.metallicTexture = schaal(scene, `/tex/${set}_arm.jpg`, uv)
  m.useAmbientOcclusionFromMetallicTextureRed = true
  m.useRoughnessFromMetallicTextureGreen = true
  m.useMetallnessFromMetallicTextureBlue = true
  m.metallic = metaal
  m.roughness = ruw
  if (tint) m.albedoColor = Color3.FromHexString(tint)
  return m
}

// Zelflichtend neon-materiaal. `kracht` boven 1 duwt het door de bloom-drempel
// heen zodat het echt straalt in plaats van alleen fel gekleurd te zijn.
export function neonMat(scene, naam, hex, { kracht = 1.05, ruw = 0.3 } = {}) {
  const c = Color3.FromHexString(hex)
  const m = new PBRMaterial(naam, scene)
  m.albedoColor = c.scale(0.12)
  m.emissiveColor = c.scale(kracht)
  m.metallic = 0
  m.roughness = ruw
  return m
}

// Donker gelakt metaal in een teamkleur: het chassis/behuizing-materiaal dat
// de platte diffuseColor-blokken vervangt.
export function gelaktMat(scene, naam, hex, { ruw = 0.35, metaal = 0.85 } = {}) {
  const m = new PBRMaterial(naam, scene)
  m.albedoColor = Color3.FromHexString(hex).scale(0.55)
  m.metallic = metaal
  m.roughness = ruw
  m.emissiveColor = Color3.FromHexString(hex).scale(0.06)
  return m
}

// ── Nachtelijke hemel ────────────────────────────────────────────────────
// Vervangt de lichtblauwe gradient-bol: diep indigo naar boven, een violette
// tot magenta gloed net boven de horizon (alsof de stad eronder ligt) en een
// laag sterren. Emissief, zodat licht in de scene er niets aan verandert.
export function nachtLucht(scene, straal, {
  boven = '#05030f', midden = '#160a33', horizon = '#3a1250', gloed = '#ff2f8e',
  sterren = true,
} = {}) {
  const H = 1024
  const dt = new DynamicTexture('nachtLuchtTex', { width: 8, height: H }, scene, false)
  const c = dt.getContext()
  const g = c.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, boven)
  g.addColorStop(0.45, midden)
  g.addColorStop(0.82, horizon)
  g.addColorStop(1, horizon)
  c.fillStyle = g; c.fillRect(0, 0, 8, H)
  // smalle, warme band pal op de horizon
  const hg = c.createLinearGradient(0, H * 0.86, 0, H)
  hg.addColorStop(0, 'rgba(0,0,0,0)')
  hg.addColorStop(1, gloed)
  c.globalAlpha = 0.55; c.fillStyle = hg; c.fillRect(0, H * 0.86, 8, H * 0.14); c.globalAlpha = 1
  if (sterren) {
    c.fillStyle = '#ffffff'
    for (let i = 0; i < 90; i++) {
      const y = Math.pow(Math.random(), 1.7) * H * 0.7
      c.globalAlpha = 0.25 + Math.random() * 0.6
      c.fillRect(Math.random() * 8, y, 1, 1)
    }
    c.globalAlpha = 1
  }
  dt.update()

  const sky = MeshBuilder.CreateSphere('nachtLucht', { diameter: straal * 2, segments: 16 }, scene)
  sky.isPickable = false
  sky.infiniteDistance = true
  const m = new StandardMaterial('nachtLuchtMat', scene)
  m.backFaceCulling = false
  m.disableLighting = true
  m.diffuseColor = Color3.Black()
  m.specularColor = Color3.Black()
  m.emissiveTexture = dt
  sky.material = m
  return sky
}

// Neon-rasterpatroon als emissive-laag over een PBR-vloer: vervangt platte
// schaakbord- of kleurvlakken door lijnen die de GlowLayer oppikt.
export function neonRaster(scene, hex, { dikte = 6, vakken = 4 } = {}) {
  const S = 512
  const dt = new DynamicTexture('neonRasterTex', { width: S, height: S }, scene, false)
  const c = dt.getContext()
  c.fillStyle = '#000000'; c.fillRect(0, 0, S, S)
  c.strokeStyle = hex; c.lineWidth = dikte
  c.shadowColor = hex; c.shadowBlur = dikte
  const stap = S / vakken
  for (let i = 0; i <= vakken; i++) {
    c.beginPath(); c.moveTo(i * stap, 0); c.lineTo(i * stap, S); c.stroke()
    c.beginPath(); c.moveTo(0, i * stap); c.lineTo(S, i * stap); c.stroke()
  }
  dt.update()
  return dt
}

export { CubeTexture }
