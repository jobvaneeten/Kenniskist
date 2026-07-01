// ── Gedeeld tussen KartGame.jsx en BalloonBattleGame.jsx ────────────────
// Procedurele kart-mesh + poppetje/kleding-koppeling + rij-animatie-retarget.
// Eén keer bouwen, door beide voertuig-games hergebruikt.
import {
  Vector3, Color3, MeshBuilder, StandardMaterial, TransformNode,
} from '@babylonjs/core'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'
import { findItem } from '../itemsCatalog'
import { applyItemToMesh, loadClothingDonor, usesDonor, loadHeadItem } from '../applyClothing'

export const KART_SCALE = 1.0    // kart op maat van het (native) poppetje
export const KART_VISUAL = 0.6   // hele kart+poppetje kleiner in de wereld
export const AV_Y = -0.12        // zithoogte avatar in de kart
export const AV_Z = -0.12        // voor/achter-positie avatar
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

// ── Procedurele kart (alles onder één TransformNode) ────────────────────
export function buildKart(scene, hex, idSuffix) {
  const root = new TransformNode('kartRoot_' + idSuffix, scene)
  root.scaling.setAll(KART_VISUAL)   // kart + gezeten poppetje uniform kleiner
  const chassis = new TransformNode('chassis_' + idSuffix, scene)
  chassis.parent = root; chassis.scaling = new Vector3(KART_SCALE, KART_SCALE, KART_SCALE)
  const c = Color3.FromHexString(hex)
  const bodyMat = new StandardMaterial('kbody' + idSuffix, scene)
  bodyMat.diffuseColor = c; bodyMat.specularColor = new Color3(0.5, 0.5, 0.5)
  const accentMat = new StandardMaterial('kacc' + idSuffix, scene)
  accentMat.diffuseColor = c.scale(0.55); accentMat.specularColor = new Color3(0.3, 0.3, 0.3)
  const tireMat = new StandardMaterial('ktire' + idSuffix, scene)
  tireMat.diffuseColor = new Color3(0.08, 0.08, 0.09); tireMat.specularColor = new Color3(0.2, 0.2, 0.2)
  const rimMat = new StandardMaterial('krim' + idSuffix, scene)
  rimMat.diffuseColor = new Color3(0.78, 0.8, 0.85); rimMat.specularColor = new Color3(0.6, 0.6, 0.6)
  const darkMat = new StandardMaterial('kdark' + idSuffix, scene)
  darkMat.diffuseColor = new Color3(0.13, 0.13, 0.16)
  const greyMat = new StandardMaterial('kgrey' + idSuffix, scene)
  greyMat.diffuseColor = new Color3(0.55, 0.57, 0.6); greyMat.specularColor = new Color3(0.5, 0.5, 0.5)

  // Lage chassis-plaat
  const floor = MeshBuilder.CreateBox('kfloor', { width: 1.4, height: 0.18, depth: 2.9 }, scene)
  floor.material = darkMat; floor.position.y = 0.32; floor.parent = chassis
  // Zijpods (body-kleur)
  ;[-0.78, 0.78].forEach((sx, i) => {
    const pod = MeshBuilder.CreateBox('kpod' + i, { width: 0.42, height: 0.34, depth: 1.5 }, scene)
    pod.material = bodyMat; pod.position.set(sx, 0.42, -0.1); pod.parent = chassis
  })
  // Neus: aflopende motorkap die naar voren smaller/lager wordt
  const hood = MeshBuilder.CreateBox('khood', { width: 1.0, height: 0.3, depth: 1.1 }, scene)
  hood.material = bodyMat; hood.position.set(0, 0.42, 1.0); hood.rotation.x = -0.16; hood.parent = chassis
  const noseTip = MeshBuilder.CreateBox('knose', { width: 0.55, height: 0.18, depth: 0.7 }, scene)
  noseTip.material = bodyMat; noseTip.position.set(0, 0.34, 1.65); noseTip.rotation.x = -0.16; noseTip.parent = chassis
  // Frontvleugel (breed, laag)
  const fwing = MeshBuilder.CreateBox('kfwing', { width: 1.7, height: 0.08, depth: 0.4 }, scene)
  fwing.material = accentMat; fwing.position.set(0, 0.26, 1.95); fwing.parent = chassis
  // Cockpit-rand + zitkuip
  const cowl = MeshBuilder.CreateBox('kcowl', { width: 1.1, height: 0.42, depth: 1.2 }, scene)
  cowl.material = accentMat; cowl.position.set(0, 0.48, -0.05); cowl.parent = chassis
  const seat = MeshBuilder.CreateBox('kseat', { width: 0.66, height: 0.6, depth: 0.22 }, scene)
  seat.material = darkMat; seat.position.set(0, 0.72, -0.62); seat.parent = chassis
  // Stuurkolom + stuur
  const col = MeshBuilder.CreateCylinder('kcol', { height: 0.55, diameter: 0.07, tessellation: 8 }, scene)
  col.material = greyMat; col.rotation.x = 0.7; col.position.set(0, 0.78, 0.5); col.parent = chassis
  const wheel = MeshBuilder.CreateTorus('ksteer', { diameter: 0.42, thickness: 0.07, tessellation: 18 }, scene)
  wheel.material = darkMat; wheel.rotation.x = 1.0; wheel.position.set(0, 0.92, 0.66); wheel.parent = chassis
  // Achtervleugel
  ;[-0.45, 0.45].forEach((sx, i) => {
    const post = MeshBuilder.CreateBox('kwp' + i, { width: 0.08, height: 0.45, depth: 0.08 }, scene)
    post.material = darkMat; post.position.set(sx, 0.7, -1.4); post.parent = chassis
  })
  const wing = MeshBuilder.CreateBox('kwing', { width: 1.5, height: 0.07, depth: 0.5 }, scene)
  wing.material = accentMat; wing.position.set(0, 0.95, -1.45); wing.parent = chassis
  // Uitlaat
  ;[-0.18, 0.18].forEach((sx, i) => {
    const exh = MeshBuilder.CreateCylinder('kexh' + i, { height: 0.6, diameter: 0.12, tessellation: 8 }, scene)
    exh.rotation.x = Math.PI / 2; exh.material = greyMat
    exh.position.set(sx, 0.55, -1.6); exh.parent = chassis
  })

  // Wielen: band + velg
  const wheels = []
  const wheelDef = [[-0.82, 1.05], [0.82, 1.05], [-0.82, -1.05], [0.82, -1.05]]
  wheelDef.forEach(([wx, wz], i) => {
    const hub = new TransformNode('khub' + i, scene)
    hub.position.set(wx, 0.4, wz); hub.parent = chassis
    const tire = MeshBuilder.CreateCylinder('kw' + i, { height: 0.42, diameter: 0.8, tessellation: 18 }, scene)
    tire.rotation.z = Math.PI / 2; tire.material = tireMat; tire.parent = hub
    const rim = MeshBuilder.CreateCylinder('krimM' + i, { height: 0.44, diameter: 0.4, tessellation: 10 }, scene)
    rim.rotation.z = Math.PI / 2; rim.material = rimMat; rim.parent = hub
    wheels.push(tire)
  })

  return { root, wheels }
}

// ── Avatar-loader: Poppetje + kleding + rij-animatie, gezeten in de kart ──
export function loadAvatar(scene, shirt, wearing, onReady) {
  SceneLoader.ImportMesh('', '/', 'Poppetje.glb', scene, (meshes, _ps, skels) => {
    const root = meshes[0]
    const skeleton = skels[0] ?? null
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
    SceneLoader.ImportMesh('', '/', 'rijden.glb', scene, (aM, _p, _s, aG) => {
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
      onReady?.(root)
    }, null, () => onReady?.(root))
  }, null, (_, msg, err) => console.error('Kart avatar load error:', msg, err))
}
