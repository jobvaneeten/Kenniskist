import { useEffect, useRef, useState } from 'react'
import {
  Engine, Scene, ArcRotateCamera,
  HemisphericLight, DirectionalLight, SpotLight,
  Vector3, Color3, Color4, Texture, Plane,
  MeshBuilder, StandardMaterial, Quaternion, Mesh,
  MirrorTexture, TransformNode,
} from '@babylonjs/core'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'
import { getCatalog, findItem, swatchStyle, emojiUrl } from './itemsCatalog'
import { applyItemToMesh, loadClothingDonor, usesDonor, loadHeadItem } from './applyClothing'
import { RARITIES, CRATE_ACCENTS } from './data'
import './wardrobe.css'

// Category tabs — same accent colours as the shop's lootboxes. Icons are
// real Nano Banana Pro illustrations (public/icons/).
const TAB_ICON_IMAGES = {
  shirt:    '/icons/icon_shirt.webp',
  broek:    '/icons/icon_broek.webp',
  sokken:   '/icons/icon_sokken.webp',
  schoenen: '/icons/icon_schoenen.webp',
  pet:      '/icons/icon_pet.webp',
}
const TABS = [
  { key: 'shirt',    label: 'Shirt',    ...CRATE_ACCENTS.shirt },
  { key: 'broek',    label: 'Broek',    ...CRATE_ACCENTS.broek },
  { key: 'sokken',   label: 'Sokken',   ...CRATE_ACCENTS.sokken },
  { key: 'schoenen', label: 'Schoenen', ...CRATE_ACCENTS.schoenen },
  { key: 'hoofd',    label: 'Pet',      ...CRATE_ACCENTS.hoofd },
]
const RARITY_ORDER = ['ultra_legendary', 'legendary', 'epic', 'rare', 'common']

const CLOTHING_MESHES = ['Shirt', 'Broek', 'Sokken', 'Schoenen']
const FACE_MESH_NAMES = new Set([
  'Gezicht', 'Face',
  'Ogen', 'Eyes',
  'Wenkbrauwen', 'Eyebrows',
  'Mond', 'Mouth',
  'Neus', 'Nose',
])
const ITEMS = [
  { key: 'broek',    label: 'Broek',    emoji: '👖' },
  { key: 'sokken',   label: 'Sokken',   emoji: '🧦' },
  { key: 'schoenen', label: 'Schoenen', emoji: '👟' },
]

// All animation GLBs use the same bone names as Poppetje.glb — no remapping needed.
// Hips excluded: Mixamo FBX bakes the root orientation into Hips data.
const RETARGET_BONES = new Set([
  'Root',
  'Hips','Spine','Spine1',
  'Neck','Head',
  'LeftShoulder','LeftArm','LeftForeArm','LeftHand',
  'RightShoulder','RightArm','RightForeArm','RightHand',
  'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase',
  'RightUpLeg','RightLeg','RightFoot','RightToeBase',
])

// Each file has one animation; we store it under a stable key (not the internal name).
const ANIM_FILES = [
  { key: 'rust',       file: 'rust.glb'              },
  { key: 'hip_hop',    file: 'hip_hop_dancing.glb'   },
  { key: 'breakdance', file: 'emote_breakdance.glb'  },
  { key: 'lopen',      file: 'emote_lopen.glb'       },
  { key: 'verloren',   file: 'emote_verloren.glb'    },
]

const EMOTE_META = {
  hip_hop:    { emoji: '💃', label: 'Hip Hop'    },
  breakdance: { emoji: '🕺', label: 'Breakdance' },
  lopen:      { emoji: '🚶', label: 'Lopen'      },
  verloren:   { emoji: '😢', label: 'Verloren'   },
}

// Kledingstuk-silhouetten (viewBox 0 0 100 100) → als CSS-mask, zodat de
// tegel de vorm van het échte kledingstuk krijgt i.p.v. een rondje/emoji.
const GARMENT_PATH = {
  shirt:    'M35,20 L45,14 Q50,19 55,14 L65,20 L84,32 L75,45 L66,39 L66,84 L34,84 L34,39 L25,45 L16,32 Z',
  broek:    'M32,16 L68,16 L70,40 L62,86 L52,86 L50,50 L48,86 L38,86 L30,40 Z',
  sokken:   'M40,14 L58,14 L58,56 Q58,66 68,70 L82,80 Q70,90 56,82 L46,76 Q40,70 40,58 Z',
  schoenen: 'M14,66 L18,48 Q22,40 36,42 L66,52 Q86,56 88,68 L88,74 L14,74 Z',
  hoofd:    'M20,54 Q20,28 50,28 Q80,28 80,54 L80,58 Q50,50 20,58 Z M78,52 L96,60 L94,67 L77,60 Z',
}
const maskUrl = (path) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='${path}' fill='white'/></svg>`)}")`
const GARMENT_MASK = Object.fromEntries(Object.entries(GARMENT_PATH).map(([k, p]) => [k, maskUrl(p)]))

// De echte vulling van een kledingstuk: kleur, patroon, getegelde print of
// model-preview. Voor prints tegelen we het Twemoji-plaatje als stof-print.
function appearanceStyle(item) {
  if (item.kind === 'print') return {
    backgroundColor: item.bg,
    backgroundImage: `url("${emojiUrl(item.emoji)}")`,
    backgroundSize: '40%',
    backgroundRepeat: 'repeat',
  }
  return swatchStyle(item)   // color → hex, pattern → CSS-patroon, model/texmodel → preview-afbeelding
}

// Eén item als mini-preview-tegel: een kledingstuk-silhouet gevuld met de
// echte look, met een gloeiende rariteits-rand.
function SwatchTile({ item, slot, active, isNew, bursting, onClick }) {
  const rarity = item.rarity || 'common'
  const rar    = RARITIES[rarity]?.color || RARITIES.common.color
  const badge  = item.badge || null
  const mask   = GARMENT_MASK[slot]
  const shimmer = rarity === 'legendary' || rarity === 'ultra_legendary'
  return (
    <button
      className={`swatch-tile rar-${rarity} ${active ? 'tile-active' : ''} ${shimmer ? 'tile-shimmer' : ''}`}
      style={{ '--rar': rar }}
      title={`${item.label} · ${RARITIES[rarity]?.label || ''}`}
      onClick={onClick}
    >
      <span
        className="tile-garment"
        style={{ ...appearanceStyle(item), WebkitMaskImage: mask, maskImage: mask }}
      />
      {badge && <span className="tile-badge">{badge}</span>}
      {active && <span className="tile-check">✓</span>}
      {isNew && !active && <span className="tile-new-dot" title="Nieuw!" />}
      {bursting && (
        <span className="tile-burst">
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className="tile-burst-p" style={{ '--ba': `${i * 120}deg` }} />
          ))}
        </span>
      )}
    </button>
  )
}

// ── Remap shirt bone indices to match Poppetje's skeleton ─────────
function remapAndAttach(mesh, srcSkel, dstSkel) {
  const dstMap = {}
  dstSkel.bones.forEach((b, i) => { dstMap[b.name] = i })
  const remap = srcSkel.bones.map(b => dstMap[b.name] ?? 0)
  ;['matricesIndices', 'matricesIndicesExtra'].forEach(kind => {
    const data = mesh.getVerticesData(kind)
    if (!data) return
    const out = new Float32Array(data.length)
    for (let i = 0; i < data.length; i++) {
      const idx = Math.round(data[i])
      out[i] = (idx >= 0 && idx < remap.length) ? remap[idx] : 0
    }
    mesh.updateVerticesData(kind, out)
  })
  mesh.skeleton = dstSkel
}

// ── Material helpers ──────────────────────────────────────────────
function walkMeshes(node, fn) {
  fn(node)
  ;(node.getChildMeshes ? node.getChildMeshes(false) : []).forEach(fn)
}

function applyColor(mesh, hex) {
  const col = Color3.FromHexString(hex)
  walkMeshes(mesh, m => {
    if (!m.material) return
    const mat = m.material.clone(m.material.name + '_col')
    m.material = mat
    if (mat.albedoColor !== undefined) {
      mat.albedoTexture = null
      mat.albedoColor   = col
      mat.metallic      = 0
      mat.roughness     = 0.8
      mat.unlit         = false
    } else if (mat.diffuseColor !== undefined) {
      mat.diffuseTexture = null
      mat.diffuseColor   = col
    }
  })
}

function applyTexture(mesh, texture) {
  walkMeshes(mesh, m => {
    if (!m.material) return
    const mat = m.material.clone(m.material.name + '_tex')
    m.material = mat
    if (mat.albedoColor !== undefined) {
      mat.albedoTexture = texture
      mat.albedoColor   = Color3.White()
      mat.metallic      = 0
      mat.roughness     = 0.8
    } else if (mat.diffuseColor !== undefined) {
      mat.diffuseTexture = texture
      mat.diffuseColor   = Color3.White()
    }
  })
}

// Apply any catalog item (colour / pattern / print) onto a clothing mesh.
// 'model' items (Ajax/PSV GLB) are handled separately in pickShirt.
function applyItem(mesh, item, scene) {
  if (!mesh || !item) return
  if (item.kind === 'color') { applyColor(mesh, item.hex); return }
  if (item.kind === 'pattern' || item.kind === 'print') {
    const url = buildTextureCanvas(item).toDataURL()
    const tex = new Texture(url, scene, false, false)
    applyTexture(mesh, tex)   // applies now; Babylon updates it once the image is ready
  }
}

// ── Component ─────────────────────────────────────────────────────
export default function Wardrobe({ onBack, onPlayRocket, onPlayPaintball, onPlayKart, onPlayBotsen, onGoShop, unlockedColors = {} }) {
  const canvasRef      = useRef(null)
  const sceneRef       = useRef(null)
  const skeletonRef    = useRef(null)
  const meshesRef      = useRef({})
  const donorsRef      = useRef({})   // slot -> donor mesh
  const headRef        = useRef(null) // loaded pet mesh (hoofd slot)
  const headGenRef     = useRef(0)    // guards against stale/duplicate pet loads
  const animGroupsRef  = useRef({})
  const restPoseRef    = useRef({})   // bone name → { node, rot, pos } captured at T-pose
  const podiumRef      = useRef(null) // draaiend showpodium
  const positionStageRef = useRef(null) // herpositioneert podium op de echte zool-hoogte

  const [shirtColor, setShirtColor] = useState(() => {
    try { return localStorage.getItem('kk_shirt') || null } catch { return null }
  })
  const [wearing, setWearing] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kk_wearing') || '{}') } catch { return {} }
  })
  const [loading,    setLoading]    = useState(true)
  const [activeAnim, setActiveAnim] = useState(null)
  const [animsReady, setAnimsReady] = useState(false)
  const [showGames,  setShowGames]  = useState(false)
  const [activeTab,  setActiveTab]  = useState('shirt')
  const [rarityFilter, setRarityFilter] = useState('alle')
  const [newItems,   setNewItems]   = useState({})
  const [burstTile,  setBurstTile]  = useState(null)
  const [shuffling,  setShuffling]  = useState(false)

  // "Nieuw sinds laatste bezoek": vergelijk met wat er de vorige keer al
  // ontgrendeld was, toon dat verschil deze sessie, en sla dan de huidige
  // stand op als nieuwe baseline.
  useEffect(() => {
    let seen = {}
    try { seen = JSON.parse(localStorage.getItem('kk_wardrobe_seen') || '{}') } catch {}
    const fresh = {}
    Object.keys(unlockedColors).forEach(slot => {
      const seenSet = new Set(seen[slot] || [])
      fresh[slot] = (unlockedColors[slot] || []).filter(k => !seenSet.has(k))
    })
    setNewItems(fresh)
    try { localStorage.setItem('kk_wardrobe_seen', JSON.stringify(unlockedColors)) } catch {}
  }, [])

  const fireBurst = (slot, key) => {
    setBurstTile(`${slot}:${key}`)
    setTimeout(() => setBurstTile(cur => (cur === `${slot}:${key}` ? null : cur)), 400)
  }

  useEffect(() => {
    if (shirtColor) localStorage.setItem('kk_shirt', shirtColor)
    else localStorage.removeItem('kk_shirt')
  }, [shirtColor])

  useEffect(() => {
    localStorage.setItem('kk_wearing', JSON.stringify(wearing))
  }, [wearing])

  const disposeDonor = (slot) => {
    const d = donorsRef.current[slot]
    if (d) { try { d.dispose() } catch {} ; donorsRef.current[slot] = null }
  }
  const disposeHead = () => {
    if (headRef.current) { try { headRef.current.dispose() } catch {} ; headRef.current = null }
  }
  const clearExtraMeshes = () => {
    Object.keys(donorsRef.current).forEach(disposeDonor)
    disposeHead()
  }

  // Apply an item to a clothing slot (shirt/broek/sokken/schoenen):
  // colours go straight onto Poppetje's mesh; prints/patterns/models load a
  // donor mesh with a real UV and bake the generated texture onto it.
  const applySlot = (slot, key) => {
    const scene = sceneRef.current
    const mesh  = meshesRef.current[slot]
    if (!scene || !mesh) return
    disposeDonor(slot)
    if (!key) { mesh.setEnabled(false); return }
    const item = findItem(slot, key)
    if (!item) { mesh.setEnabled(false); return }
    if (usesDonor(slot, item)) {
      loadClothingDonor(scene, mesh, skeletonRef.current, slot, item, (g) => {
        donorsRef.current[slot] = g
        positionStageRef.current?.()
      })
    } else {
      applyItemToMesh(scene, mesh, item)
      mesh.setEnabled(true)
      requestAnimationFrame(() => positionStageRef.current?.())
    }
  }

  const pickShirt = (key) => {
    const next = shirtColor === key ? null : key
    setShirtColor(next)
    applySlot('shirt', next)
    if (next) fireBurst('shirt', next)
  }

  const pickClothing = (itemKey, colorKey) => {
    setWearing(prev => {
      const next = prev[itemKey] === colorKey ? null : colorKey
      applySlot(itemKey, next)
      if (next) fireBurst(itemKey, next)
      return { ...prev, [itemKey]: next }
    })
  }

  // ── Hoofd (pet): standalone GLB tinted to a colour, normaal/achter stance ──
  // NB: keep applyHead OUT of the setWearing updater — StrictMode invokes
  // updaters twice, which would load (and leave) two caps. A generation guard
  // also discards any load that a newer pick has already superseded.
  const applyHead = (colorKey, stance) => {
    const scene = sceneRef.current
    if (!scene) return
    const gen = ++headGenRef.current
    disposeHead()
    if (!colorKey) return
    const item = findItem('hoofd', colorKey)
    if (!item) return
    const parent = (meshesRef.current.shirt || meshesRef.current.broek ||
                    meshesRef.current.sokken || meshesRef.current.schoenen)?.parent || null
    loadHeadItem(scene, parent, skeletonRef.current, item, stance, (g) => {
      if (gen !== headGenRef.current) { try { g.dispose() } catch {} ; return }
      headRef.current = g
    })
  }

  const pickHead = (colorKey) => {
    const next = wearing.hoofd === colorKey ? null : colorKey
    applyHead(next, wearing.hoofdStance || 'normaal')
    setWearing(prev => ({ ...prev, hoofd: next }))
    if (next) fireBurst('hoofd', next)
  }

  const setHeadStance = (stance) => {
    if ((wearing.hoofdStance || 'normaal') === stance) return
    applyHead(wearing.hoofd || null, stance)
    setWearing(prev => ({ ...prev, hoofdStance: stance }))
  }

  // 🎲 Verras me: korte shuffle door de tegels, dan een willekeurige outfit
  // aantrekken uit wat er ontgrendeld is.
  const surpriseMe = () => {
    setShuffling(true)
    setTimeout(() => { runSurprise(); setShuffling(false) }, 500)
  }

  const runSurprise = () => {
    const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)]
    const unlocked = (slot) => getCatalog(slot).filter(c => (unlockedColors[slot] || []).includes(c.key))
    const sh = unlocked('shirt')
    if (sh.length) { const k = rnd(sh).key; setShirtColor(k); applySlot('shirt', k) }
    const next = {}
    ITEMS.forEach(it => {
      const list = unlocked(it.key)
      if (list.length) { const k = rnd(list).key; applySlot(it.key, k); next[it.key] = k }
    })
    const hd = unlocked('hoofd')
    if (hd.length) { const k = rnd(hd).key; applyHead(k, wearing.hoofdStance || 'normaal'); next.hoofd = k }
    if (Object.keys(next).length) setWearing(prev => ({ ...prev, ...next }))
  }

  const resetToTPose = () => {
    Object.values(restPoseRef.current).forEach(({ node, rot, pos }) => {
      if (node.rotationQuaternion) node.rotationQuaternion.copyFrom(rot)
      else node.rotationQuaternion = rot.clone()
      node.position.copyFrom(pos)
    })
  }

  const playRust = (groups) => {
    const all = groups ?? animGroupsRef.current
    // Stop any running animation
    Object.values(all).forEach(g => { try { g?.stop() } catch {} })
    const rg = all['rust']
    if (rg) {
      rg.play(true)  // loop=true
    }
    setActiveAnim('rust')
  }

  const pickEmote = (name) => {
    const groups = animGroupsRef.current
    if (activeAnim === name) {
      // Toggle off → go back to rust
      groups[name]?.stop()
      playRust()
    } else {
      if (activeAnim && activeAnim !== 'rust') groups[activeAnim]?.stop()
      groups['rust']?.stop()
      groups[name]?.play(true)
      setActiveAnim(name)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = new Engine(canvas, true)
    const scene  = new Scene(engine)
    sceneRef.current = scene
    scene.clearColor = new Color4(0, 0, 0, 0)

    const camera = new ArcRotateCamera('cam', Math.PI / 2, Math.PI / 2.04, 5, Vector3.Zero(), scene)
    camera.wheelPrecision = 50
    camera.lowerBetaLimit = Math.PI / 2.04
    camera.upperBetaLimit = Math.PI / 2.04
    camera.attachControl(canvas, true)
    // Auto-draaien; stopt zodra de speler zelf sleept en hervat na een rust.
    camera.useAutoRotationBehavior = true
    if (camera.autoRotationBehavior) {
      camera.autoRotationBehavior.idleRotationSpeed     = 0.35
      camera.autoRotationBehavior.idleRotationWaitTime  = 1500
      camera.autoRotationBehavior.idleRotationSpinupTime = 1000
      camera.autoRotationBehavior.zoomStopsAnimation    = false
    }

    new HemisphericLight('hemi', new Vector3(0, 1, 0), scene).intensity = 1.35
    const sun = new DirectionalLight('sun', new Vector3(-1, -2, -1), scene)
    sun.intensity = 1.6

    SceneLoader.ImportMesh('', '/', 'Poppetje.glb', scene, (meshes) => {
      // Store Poppetje's skeleton so extra meshes (Ajax shirt) can share it
      skeletonRef.current = scene.skeletons[0] ?? null

      // Store clothing mesh refs
      meshes.forEach(mesh => {
        const name = mesh.name
        const key  = name.toLowerCase()
        if (CLOTHING_MESHES.includes(name)) {
          mesh.setEnabled(false)
          meshesRef.current[key] = mesh
        }
      })

      // Fit camera to character
      let min = new Vector3( 1e9,  1e9,  1e9)
      let max = new Vector3(-1e9, -1e9, -1e9)
      meshes.forEach(m => {
        if (!m.getHierarchyBoundingVectors) return
        const b = m.getHierarchyBoundingVectors(true)
        min = Vector3.Minimize(min, b.min)
        max = Vector3.Maximize(max, b.max)
      })
      const center = Vector3.Lerp(min, max, 0.5)
      const maxDim = Math.max(...max.subtract(min).asArray())
      camera.target           = center
      camera.radius           = maxDim * 1.5
      camera.lowerRadiusLimit = maxDim * 0.8
      camera.upperRadiusLimit = maxDim * 5

      // ── Neon-showpodium: reflecterend bovenblad, draaiende ring, spotlight ──
      // Het poppetje staat ~lift hoger zodat hij bovenóp het podium staat
      // (anders zakt hij door het bovenblad heen).
      const lift   = maxDim * 0.20
      const stageY = min.y - maxDim * 0.035 + lift   // schatting; wordt na de rust-pose exact gemeten

      // Til het hele personage op tot op het podium.
      const charRoot = scene.getTransformNodeByName('__root__')
      if (charRoot) charRoot.position.y += lift
      camera.target = new Vector3(center.x, center.y + lift * 0.6, center.z)

      // Reflecterend bovenblad (spiegel) — toont het poppelje mét kleren.
      const plate = MeshBuilder.CreateCylinder('stagePlate', { diameter: maxDim * 1.5, height: 0.06, tessellation: 64 }, scene)
      plate.position.set(center.x, stageY - 0.03, center.z)
      const plateMat = new StandardMaterial('stagePlateM', scene)
      plateMat.diffuseColor  = new Color3(0.03, 0.04, 0.10)
      plateMat.specularColor = new Color3(0.35, 0.4, 0.7)
      plateMat.specularPower = 90
      const mirror = new MirrorTexture('mirror', 512, scene, true)
      mirror.mirrorPlane = new Plane(0, -1, 0, stageY)
      mirror.level = 0.55
      mirror.adaptiveBlurKernel = 12
      plateMat.reflectionTexture = mirror
      plate.material = plateMat

      // Draaiende podium-onderdelen (basis + neon-ring + cyaan blokjes).
      const podium = new TransformNode('podiumRoot', scene)
      podium.position.set(center.x, stageY, center.z)
      podiumRef.current = podium
      const base = MeshBuilder.CreateCylinder('podiumBase', { diameterTop: maxDim * 1.5, diameterBottom: maxDim * 1.68, height: lift, tessellation: 64 }, scene)
      base.parent = podium; base.position.y = -0.03 - lift / 2
      const baseMat = new StandardMaterial('podiumBaseM', scene)
      baseMat.diffuseColor  = new Color3(0.05, 0.05, 0.13)
      baseMat.emissiveColor = new Color3(0.16, 0.02, 0.28)
      base.material = baseMat
      const ring = MeshBuilder.CreateTorus('podiumRing', { diameter: maxDim * 1.55, thickness: 0.06, tessellation: 72 }, scene)
      ring.parent = podium
      const ringMat = new StandardMaterial('podiumRingM', scene)
      ringMat.emissiveColor = new Color3(1.0, 0.15, 0.9)   // neon magenta
      ringMat.disableLighting = true
      ring.material = ringMat
      const nibMat = new StandardMaterial('podiumNibM', scene)
      nibMat.emissiveColor = new Color3(0.15, 0.95, 1.0)   // neon cyaan
      nibMat.disableLighting = true
      const nibR = maxDim * 0.77
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        const nib = MeshBuilder.CreateBox('podiumNib' + i, { size: 0.09 }, scene)
        nib.parent = podium
        nib.position.set(Math.cos(a) * nibR, 0.02, Math.sin(a) * nibR)
        nib.material = nibMat
      }

      // Spotlight van schuin boven → gerichte lichtpoel op het personage.
      const spot = new SpotLight('spot',
        new Vector3(center.x, center.y + maxDim * 2.0 + lift, center.z + maxDim * 0.7),
        new Vector3(0, -1, -0.32), Math.PI / 2.3, 8, scene)
      spot.intensity = 1.5
      spot.diffuse = new Color3(0.78, 0.88, 1.0)

      // Draai het podium + houd de spiegel-renderlijst actueel (incl. kleding/
      // pet die later inladen), zodat de reflectie altijd de hele outfit toont.
      scene.onBeforeRenderObservable.add(() => {
        podium.rotation.y += 0.004
        mirror.renderList = scene.meshes.filter(
          m => m.isEnabled() && m.isVisible !== false && !/^(stagePlate|podium)/.test(m.name)
        )
      })

      // Meet de échte voetzool-hoogte (na de rust-pose) en zet het podium-
      // oppervlak er net onder, zodat hij er bovenop staat en de schoenen
      // altijd zichtbaar blijven — geen giswerk met pose-offsets meer.
      const positionStage = () => {
        let lowest = Infinity
        scene.meshes.forEach(m => {
          if (!m.isEnabled() || m.isVisible === false || /^(stagePlate|podium)/.test(m.name)) return
          // Skinned meshes: neem de échte (geanimeerde) pose mee, anders meet je
          // de T-pose en lijkt het poppetje boven het podium te zweven.
          try { if (m.skeleton) m.refreshBoundingInfo({ applySkeleton: true, applyMorph: true }) } catch {}
          const bb = m.getBoundingInfo && m.getBoundingInfo().boundingBox
          if (bb) lowest = Math.min(lowest, bb.minimumWorld.y)
        })
        if (!isFinite(lowest)) return
        const top = lowest + maxDim * 0.006    // oppervlak precies op de zolen (geen zweef-gat)
        plate.position.y  = top - 0.03         // plate-hoogte 0.06 → bovenkant op `top`
        podium.position.y = top
        mirror.mirrorPlane = new Plane(0, -1, 0, top)
      }
      positionStageRef.current = positionStage

      // Restore saved clothing
      if (shirtColor) applySlot('shirt', shirtColor)
      Object.entries(wearing).forEach(([slot, key]) => {
        if (!key || slot === 'hoofd' || slot === 'hoofdStance') return
        applySlot(slot, key)
      })
      if (wearing.hoofd) applyHead(wearing.hoofd, wearing.hoofdStance || 'normaal')

      // Face features always black
      meshes.forEach(m => {
        if (!FACE_MESH_NAMES.has(m.name) || !m.material) return
        const mat = m.material.clone(m.material.name + '_face')
        m.material = mat
        if (mat.albedoColor !== undefined) { mat.albedoTexture = null; mat.albedoColor = Color3.Black() }
        else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = null; mat.diffuseColor = Color3.Black() }
      })

      setLoading(false)

      // ── Build Poppetje node map + capture T-pose for reset ──
      const nodeMap = {}
      const dstRestRots = {}
      scene.transformNodes.forEach(n => {
        nodeMap[n.name] = n
        if (RETARGET_BONES.has(n.name)) {
          dstRestRots[n.name] = n.rotationQuaternion
            ? n.rotationQuaternion.clone()
            : Quaternion.Identity()
          restPoseRef.current[n.name] = {
            node: n,
            rot:  n.rotationQuaternion ? n.rotationQuaternion.clone() : Quaternion.Identity(),
            pos:  n.position.clone(),
          }
        }
      })
      scene.meshes.forEach(m2 => { if (!nodeMap[m2.name]) nodeMap[m2.name] = m2 })

      // ── Load all animation files with rest-pose-corrected retargeting ──
      const groups = {}
      let pending = ANIM_FILES.length

      const onFileLoaded = () => {
        pending--
        if (pending === 0) {
          animGroupsRef.current = groups
          setAnimsReady(true)
          playRust(groups)
          // Pose is nu actief → meet de zolen en zet het podium eronder.
          scene.onAfterRenderObservable.addOnce(() => positionStageRef.current?.())
          setTimeout(() => positionStageRef.current?.(), 300)
        }
      }

      ANIM_FILES.forEach(({ key, file }) => {
        SceneLoader.ImportMesh('', '/', file, scene,
          (aMeshes, _ps, _sk, aGroups) => {
            aMeshes.forEach(m2 => m2.setEnabled(false))
            if (aGroups.length > 0) {
              const orig = aGroups[0]

              // Capture SOURCE rest rotations before cloning remaps the targets
              const srcRestRots = {}
              orig.targetedAnimations.forEach(ta => {
                const n = ta.target
                srcRestRots[n.name] = n.rotationQuaternion
                  ? n.rotationQuaternion.clone()
                  : Quaternion.Identity()
              })

              // Clone and remap targets to Poppetje's nodes
              const retargeted = orig.clone(key, target => {
                if (!RETARGET_BONES.has(target.name)) return target
                return nodeMap[target.name] ?? target
              })

              // Process each track
              const tas = retargeted.targetedAnimations
              for (let i = tas.length - 1; i >= 0; i--) {
                const ta   = tas[i]
                const prop = ta.animation.targetProperty
                const name = ta.target.name

                // Strip scale always
                if (prop === 'scaling' || prop === 'scale') { tas.splice(i, 1); continue }

                // Strip position for all bones except Root (Root carries the actual movement)
                if (prop === 'position') {
                  if (name !== 'Root') { tas.splice(i, 1); continue }
                  // Keep Root position as-is (no rotation correction needed for translation)
                  continue
                }

                // Rotation tracks: only keep retargeted bones
                if (!RETARGET_BONES.has(name)) { tas.splice(i, 1); continue }

                // Strip Root rotation for rust – the raw Z-up in rust.glb would
                // lay the character flat; keeping it out lets Hips drive the pose.
                if (key === 'rust' && name === 'Root') { tas.splice(i, 1); continue }

                // Apply rest-pose correction for emote animations only, not the base rust animation
                if (key !== 'rust') {
                  const srcRest = srcRestRots[name] ?? Quaternion.Identity()
                  const dstRest = dstRestRots[name] ?? Quaternion.Identity()
                  const correction = Quaternion.Inverse(dstRest).multiply(srcRest)
                  ta.animation.getKeys().forEach(kf => {
                    kf.value.copyFrom(correction.multiply(kf.value))
                  })
                }
              }

              retargeted.stop()
              groups[key] = retargeted
              orig.dispose()
            }
            onFileLoaded()
          },
          null,
          (_, msg) => { console.warn(file + ' load error:', msg); onFileLoaded() }
        )
      })
    }, null, (_, msg, err) => {
      console.error('Poppetje load error:', msg, err)
      setLoading(false)
    })

    engine.runRenderLoop(() => scene.render())
    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      Object.values(animGroupsRef.current).forEach(g => { try { g.dispose() } catch {} })
      clearExtraMeshes()
      scene.dispose()
      engine.dispose()
    }
  }, [])

  const activeTabMeta = TABS.find(t => t.key === activeTab) || TABS[0]
  const rawActiveItems = getCatalog(activeTab).filter(c => (unlockedColors[activeTab] || []).includes(c.key))
  const filteredActiveItems = rawActiveItems
    .filter(c => rarityFilter === 'alle' || (c.rarity || 'common') === rarityFilter)
    .slice()
    .sort((a, b) => RARITY_ORDER.indexOf(a.rarity || 'common') - RARITY_ORDER.indexOf(b.rarity || 'common'))
  const activeWorn = activeTab === 'shirt' ? shirtColor : wearing[activeTab]
  const activeNew  = new Set(newItems[activeTab] || [])

  return (
    <div className="wardrobe-screen">
      <div className="wd-starfield">
        {Array.from({ length: 20 }, (_, i) => (
          <span key={i} className="wd-star" style={{
            left: `${(i * 41 + 6) % 100}%`,
            top: `${(i * 59 + 9) % 100}%`,
            width: `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
            animationDelay: `${(i * 0.33) % 4}s`,
            animationDuration: `${3 + (i % 4)}s`,
            '--o': 0.15 + (i % 5) * 0.08,
          }} />
        ))}
      </div>
      <button className="back-btn" onClick={onBack}>← Menu</button>

      {/* ── Left: clothing ── */}
      <aside className="clothing-panel">
        <div className="panel-header-art" aria-hidden="true">
          <img src="/icons/wardrobe_header.webp" alt="" loading="lazy" />
        </div>
        <h2 className="panel-title">Kledingkast</h2>
        <p className="panel-sub">Klik om aan te trekken</p>

        <button className="surprise-btn" onClick={surpriseMe}>
          <span className="surprise-dice">🎲</span> Verras me!
        </button>

        <div className="category-tabs">
          {TABS.map(tab => {
            const total = getCatalog(tab.key).length
            const unlocked = (unlockedColors[tab.key] || []).length
            const pct = total ? unlocked / total : 0
            const isActive = activeTab === tab.key
            const isWorn = tab.key === 'shirt' ? !!shirtColor : !!wearing[tab.key]
            const circ = 2 * Math.PI * 8
            return (
              <button
                key={tab.key}
                className={`cat-tab ${isActive ? 'cat-tab-active' : ''} ${isWorn ? 'cat-tab-worn' : ''}`}
                style={{ '--accent': tab.accent }}
                onClick={() => setActiveTab(tab.key)}
              >
                <img src={TAB_ICON_IMAGES[tab.icon]} alt="" loading="lazy" className="cat-tab-icon" />
                <span className="cat-tab-label">{tab.label}</span>
                {isWorn && <span className="cat-tab-check">✓</span>}
                <span
                  className="cat-tab-progress"
                  onClick={(e) => { e.stopPropagation(); onGoShop?.() }}
                  title="Win meer in de winkel"
                >
                  <svg viewBox="0 0 20 20" width="18" height="18" className="cat-ring">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2.6" />
                    <circle
                      cx="10" cy="10" r="8" fill="none" stroke={tab.accent} strokeWidth="2.6"
                      strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
                      transform="rotate(-90 10 10)"
                    />
                  </svg>
                  <span className="cat-tab-count">{unlocked}/{total}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="rarity-filters">
          {['alle', ...RARITY_ORDER].map(r => (
            <button
              key={r}
              className={`rf-chip ${rarityFilter === r ? 'rf-active' : ''}`}
              style={r !== 'alle' ? { '--tc': RARITIES[r].color } : undefined}
              onClick={() => setRarityFilter(r)}
            >
              {r === 'alle' ? 'Alles' : RARITIES[r].label}
            </button>
          ))}
        </div>

        <div className={`tile-panel ${shuffling ? 'tile-panel-shuffling' : ''}`}>
          {activeTab === 'hoofd' && rawActiveItems.length > 0 && (
            <div className="head-stance">
              <button
                className={`head-stance-btn ${(wearing.hoofdStance || 'normaal') === 'normaal' ? 'stance-active' : ''}`}
                onClick={() => setHeadStance('normaal')}
              >Normaal</button>
              <button
                className={`head-stance-btn ${(wearing.hoofdStance || 'normaal') === 'achter' ? 'stance-active' : ''}`}
                onClick={() => setHeadStance('achter')}
              >Achterstevoren</button>
            </div>
          )}

          {!rawActiveItems.length ? (
            <p className="clothing-empty">Nog niets ontgrendeld — win {activeTabMeta.label.toLowerCase()} in de 🛒 Winkel!</p>
          ) : (
            <div className="color-swatches">
              {filteredActiveItems.map(c => {
                const key = activeTab === 'shirt' ? () => pickShirt(c.key)
                  : activeTab === 'hoofd' ? () => pickHead(c.key)
                  : () => pickClothing(activeTab, c.key)
                return (
                  <SwatchTile
                    key={c.key}
                    item={c}
                    slot={activeTab}
                    active={activeWorn === c.key}
                    isNew={activeNew.has(c.key)}
                    bursting={burstTile === `${activeTab}:${c.key}`}
                    onClick={key}
                  />
                )
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ── Center: 3D viewer ── */}
      <div className="viewer-panel">
        <canvas ref={canvasRef} className="three-canvas" />
        {loading && <div className="viewer-loading">Laden...</div>}
        {!loading && (
          showGames ? (
            <div className="wd-game-menu">
              <button className="play3d-btn play-rocket-btn" onClick={onPlayRocket}>
                ⚽ Voetbal
              </button>
              <button className="play3d-btn play-paintball-btn" onClick={onPlayPaintball}>
                🎯 Paintball
              </button>
              <button className="play3d-btn play-kart-btn" onClick={onPlayKart}>
                🏎️ Racen
              </button>
              <button className="play3d-btn play-botsen-btn" onClick={onPlayBotsen}>
                💥 Botsen
              </button>
              <button className="play3d-btn wd-game-close" onClick={() => setShowGames(false)}>
                ✕ Sluiten
              </button>
            </div>
          ) : (
            <button className="play3d-btn" onClick={() => setShowGames(true)}>
              🎮 Speel een spel!
            </button>
          )
        )}
      </div>

      {/* ── Emote-knoppen los bovenin (geen balk) ── */}
      <div className="emote-bar">
        {/* Rust button — speelt rust.glb in lus */}
        <button
          className={`emote-btn ${activeAnim === 'rust' ? 'emote-on' : ''}`}
          onClick={() => playRust()}
          disabled={!animsReady}
          title={!animsReady ? 'Laden…' : 'Rust'}
        >
          <span className="emote-emoji">🧍</span>
          <span className="emote-label">Rust</span>
        </button>

        {Object.entries(EMOTE_META).map(([name, meta]) => (
          <button
            key={name}
            className={`emote-btn ${activeAnim === name ? 'emote-on' : ''}`}
            onClick={() => pickEmote(name)}
            disabled={!animsReady}
            title={!animsReady ? 'Laden…' : meta.label}
          >
            <span className="emote-emoji">{meta.emoji}</span>
            <span className="emote-label">{meta.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
