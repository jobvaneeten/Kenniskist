// Gedeelde nachtlook voor Paintball en Ballonnengevecht: HDRI-omgevingslicht
// (voor spelers, karts en kogels — de maps zelf zijn gebakken, zie
// gebakkenMap.js), een gloedlaag voor neon/lampen en een sterrenhemel.
import {
  HDRCubeTexture, Color3, GlowLayer, ImageProcessingConfiguration,
  MeshBuilder, DynamicTexture, StandardMaterial,
} from '@babylonjs/core'

const HDRI = '/env/nacht_1k.hdr'

// ── Omgevingslicht: HDRI als IBL. Zonder dit blijft elk PBR-materiaal dof,
//    want metaal en glans hebben iets nodig om te spiegelen. ───────────────
export function nachtOmgeving(scene, { intensiteit = 0.4, contrast = 1.3, belichting = 1.0, tonemap = true } = {}) {
  const env = new HDRCubeTexture(HDRI, scene, 128, false, true, false, true)
  scene.environmentTexture = env
  scene.environmentIntensity = intensiteit

  // ACES-tonemapping: houdt neon en koplampen kleurig in plaats van uitgebeten
  // wit, en trekt de donkere delen open zodat het niet dichtslibt.
  const ip = scene.imageProcessingConfiguration
  // gebakken maps hebben hun licht al uitgerekend: daar zou ACES de kleuren
  // alleen verbleken, dus die zetten tonemap uit
  ip.toneMappingEnabled = tonemap
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

// ── Nachtelijke hemel ────────────────────────────────────────────────────
// Vervangt de lichtblauwe gradient-bol: diep indigo naar boven, een violette
// tot magenta gloed net boven de horizon (alsof de stad eronder ligt) en een
// laag sterren. Emissief, zodat licht in de scene er niets aan verandert.
export function nachtLucht(scene, straal, {
  boven = '#05030f', midden = '#160a33', horizon = '#3a1250', gloed = '#ff2f8e',
  sterren = true,
} = {}) {
  // breed genoeg dat een ster een stip blijft (bij 8 px breed werd elke ster
  // een boog van 45° rond de hele hemel)
  const W = 1024, H = 1024
  const dt = new DynamicTexture('nachtLuchtTex', { width: W, height: H }, scene, false)
  const c = dt.getContext()
  const g = c.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, boven)
  g.addColorStop(0.45, midden)
  g.addColorStop(0.82, horizon)
  g.addColorStop(1, horizon)
  c.fillStyle = g; c.fillRect(0, 0, W, H)
  // smalle, warme band pal op de horizon
  const hg = c.createLinearGradient(0, H * 0.86, 0, H)
  hg.addColorStop(0, 'rgba(0,0,0,0)')
  hg.addColorStop(1, gloed)
  c.globalAlpha = 0.55; c.fillStyle = hg; c.fillRect(0, H * 0.86, W, H * 0.14); c.globalAlpha = 1
  if (sterren) {
    c.fillStyle = '#ffffff'
    for (let i = 0; i < 400; i++) {
      const y = H * 0.12 + Math.pow(Math.random(), 1.4) * H * 0.62   // niet vlak bij de pool (daar knijpt de bol samen)
      c.globalAlpha = 0.3 + Math.random() * 0.7
      c.fillRect(Math.random() * W, y, 1, Math.random() < 0.15 ? 3 : 2)   // u beslaat 360°, v 180°: 1×2 px is rond
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
