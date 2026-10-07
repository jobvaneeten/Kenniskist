// ── Kart + poppetje voor Ballonnengevecht (BotsenGame.jsx) ─────────────
// Kart-model uit Blender + poppetje/kleding-koppeling + rij-animatie-retarget.
import {
  Color3, StandardMaterial, PBRMaterial, TransformNode,
} from '@babylonjs/core'
import { SceneLoader, LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'
import { findItem } from '../itemsCatalog'
import { applyItemToMesh, loadClothingDonor, usesDonor, loadHeadItem, zetLegeOnderdelenUit, ruimAnimatieBronOp } from '../applyClothing'

export const KART_VISUAL = 0.6   // hele kart+poppetje kleiner in de wereld
export const AV_Y = -0.12        // zithoogte avatar in de kart
export const AV_Z = 0            // voor/achter-positie avatar (kart.glb is rond het poppetje gebouwd)
export const KART_COLORS = ['#e63946', '#1d6fd0', '#2a9d8f', '#e9c46a', '#9b5de5', '#f4a261', '#43aa8b', '#ff6b6b']

export const RETARGET_BONES = new Set([
  'Root','Hips','Spine','Spine1','Neck','Head',
  'LeftShoulder','LeftArm','LeftForeArm','LeftHand',
  'RightShoulder','RightArm','RightForeArm','RightHand',
  'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase',
  'RightUpLeg','RightLeg','RightFoot','RightToeBase',
])
export const CLOTHING_NAMES = new Set(['Shirt','Broek','Sokken','Schoenen'])
export const FACE_NAMES     = new Set(['Gezicht','Face','Ogen','Eyes','Wenkbrauwen','Eyebrows','Mond','Mouth','Neus','Nose'])

export function safeJSON(s) { try { return JSON.parse(s || '{}') } catch { return {} } }

// ── Kart uit Blender (tools/blender/bouw_kart.py → public/ballonnen/kart.glb) ──
// Ontworpen rond het poppetje in de rijhouding: handen op het stuur, onder-
// benen in de neus, billen in de kuipstoel. Eén keer laden per scene, daarna
// per speler een kopie met eigen lakkleur. buildKart is synchroon: de wielen
// komen in `wheels` zodra het model binnen is (de spellus draait ze gewoon).
const kartCache = new WeakMap()
function laadKartModel(scene) {
  if (!kartCache.has(scene)) kartCache.set(scene, LoadAssetContainerAsync('/ballonnen/kart.glb', scene))
  return kartCache.get(scene)
}

function kartMaterialen(scene, hex, id) {
  const c = Color3.FromHexString(hex)
  const pbr = (naam, kleur, metaal, ruw) => {
    const m = new PBRMaterial(naam + id, scene)
    m.albedoColor = kleur; m.metallic = metaal; m.roughness = ruw
    return m
  }
  const lak = pbr('klak', c, 0.15, 0.35)
  lak.clearCoat.isEnabled = true; lak.clearCoat.intensity = 0.8; lak.clearCoat.roughness = 0.08   // autolak-glans
  const lakDonker = pbr('klakd', c.scale(0.4), 0.2, 0.4)
  const neon = new StandardMaterial('kneon' + id, scene)
  neon.disableLighting = true; neon.emissiveColor = Color3.Lerp(c, Color3.White(), 0.25).scale(1.3)
  return {
    lak, lak_donker: lakDonker, neon,
    zwart: pbr('kzwart', new Color3(0.035, 0.035, 0.04), 0, 0.55),
    chroom: pbr('kchroom', new Color3(0.92, 0.93, 0.95), 1, 0.12),
    band: pbr('kband', new Color3(0.025, 0.025, 0.03), 0, 0.9),
    koplamp: Object.assign(new StandardMaterial('kkop' + id, scene), { disableLighting: true, emissiveColor: new Color3(1, 0.96, 0.85) }),
  }
}

export function buildKart(scene, hex, idSuffix) {
  const root = new TransformNode('kartRoot_' + idSuffix, scene)
  root.scaling.setAll(KART_VISUAL)   // kart + gezeten poppetje uniform kleiner
  const wheels = []
  laadKartModel(scene).then(container => {
    if (root.isDisposed()) return
    const inst = container.instantiateModelsToScene(n => n + '_' + idSuffix, false, { doNotInstantiate: true })
    const mats = kartMaterialen(scene, hex, idSuffix)
    inst.rootNodes.forEach(n => { n.parent = root })
    root.onDisposeObservable.add(() => Object.values(mats).forEach(m => m.dispose()))
    for (const m of inst.rootNodes[0].getChildMeshes(false)) {
      const naam = (m.material?.name || '').replace(/\.\d+$/, '')
      if (mats[naam]) m.material = mats[naam]
      m.isPickable = false
      if (m.name.startsWith('wiel_')) {
        m.rotationQuaternion = null   // zodat de spellus rotation.x kan laten draaien
        wheels.push(m)
      }
    }
  }).catch(e => console.error('kart.glb niet geladen:', e))
  return { root, wheels }
}

// ── Avatar-loader: Poppetje + kleding + animatie (standaard de rijhouding) ──
// Ook gebruikt door de 3D-itemviewer in de winkel (met anim 'rust.glb').
export function loadAvatar(scene, shirt, wearing, onReady, animBestand = 'rijden.glb') {
  SceneLoader.ImportMesh('', '/', 'Poppetje.glb', scene, (meshes, _ps, skels) => {
    const root = meshes[0]
    const skeleton = skels[0] ?? null
    zetLegeOnderdelenUit(meshes)
    const nodeMap = {}
    scene.transformNodes.forEach(n => { nodeMap[n.name] = n })
    scene.meshes.forEach(m => { if (!nodeMap[m.name]) nodeMap[m.name] = m })

    // Kleding
    meshes.forEach(m => {
      if (!CLOTHING_NAMES.has(m.name)) return
      const key = m.name.toLowerCase()
      const colorKey = key === 'shirt' ? shirt : wearing?.[key]
      if (!colorKey) { m.setEnabled(false); return }
      const item = findItem(key, colorKey)
      if (!item) { m.setEnabled(false); return }
      if (usesDonor(key, item)) loadClothingDonor(scene, m, skeleton, key, item)
      else { applyItemToMesh(scene, m, item); m.setEnabled(true) }
    })
    // Pet (hoofd): los GLB-model getint naar kleur, volgt de Head-bone
    if (wearing?.hoofd) {
      const headItem = findItem('hoofd', wearing.hoofd)
      if (headItem) {
        const parent = meshes.find(m => CLOTHING_NAMES.has(m.name))?.parent || root
        loadHeadItem(scene, parent, skeleton, headItem, wearing.hoofdStance || 'normaal')
      }
    }
    // Zwart gezicht (zoals paintball/kart)
    meshes.forEach(m => {
      if (!FACE_NAMES.has(m.name) || !m.material) return
      const mat = m.material.clone(m.material.name + '_f'); m.material = mat
      if (mat.albedoColor !== undefined) { mat.albedoTexture = null; mat.albedoColor = Color3.Black() }
      else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = null; mat.diffuseColor = Color3.Black() }
    })

    // Rij-animatie — retarget naar Poppetje (zelfde Mixamo-skelet, ruwe keys direct)
    SceneLoader.ImportMesh('', '/', animBestand, scene, (aM, _p, aSk, aG) => {
      aM.forEach(m => m.setEnabled(false))
      if (aG.length) {
        const orig = aG[0]
        const rt = orig.clone('kartrijden', t => RETARGET_BONES.has(t.name) ? (nodeMap[t.name] ?? t) : t)
        const tas = rt.targetedAnimations
        for (let i = tas.length - 1; i >= 0; i--) {
          const { animation: anim, target } = tas[i]
          const prop = anim.targetProperty, name = target.name
          if (prop === 'scaling' || prop === 'scale') { tas.splice(i, 1); continue }
          if (prop === 'position') { tas.splice(i, 1); continue }
          if (!RETARGET_BONES.has(name)) { tas.splice(i, 1); continue }
          if (name === 'Root') { tas.splice(i, 1); continue }
        }
        orig.stop()
        rt.play(true)
        orig.dispose()
      }
      ruimAnimatieBronOp(aM, aSk)
      onReady?.(root)
    }, null, () => onReady?.(root))
  }, null, (_, msg, err) => console.error('Kart avatar load error:', msg, err))
}
