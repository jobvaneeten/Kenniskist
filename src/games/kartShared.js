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
// Afgeronde, "speelgoed"-achtige kart: capsule-body met zachte randen,
// glanzende materialen, spatborden over de wielen en velgen met spaken.
export function buildKart(scene, hex, idSuffix) {
  const root = new TransformNode('kartRoot_' + idSuffix, scene)
  root.scaling.setAll(KART_VISUAL)   // kart + gezeten poppetje uniform kleiner
  const chassis = new TransformNode('chassis_' + idSuffix, scene)
  chassis.parent = root; chassis.scaling = new Vector3(KART_SCALE, KART_SCALE, KART_SCALE)
  const c = Color3.FromHexString(hex)
  const bodyMat = new StandardMaterial('kbody' + idSuffix, scene)
  bodyMat.diffuseColor = c; bodyMat.specularColor = new Color3(0.85, 0.85, 0.9); bodyMat.specularPower = 64
  bodyMat.emissiveColor = c.scale(0.12)
  const accentMat = new StandardMaterial('kacc' + idSuffix, scene)
  accentMat.diffuseColor = c.scale(0.5); accentMat.specularColor = new Color3(0.5, 0.5, 0.5); accentMat.specularPower = 48
  const lightMat = new StandardMaterial('klight' + idSuffix, scene)
  lightMat.diffuseColor = c.scale(1.15); lightMat.emissiveColor = c.scale(0.35); lightMat.specularColor = new Color3(1, 1, 1)
  const tireMat = new StandardMaterial('ktire' + idSuffix, scene)
  tireMat.diffuseColor = new Color3(0.09, 0.09, 0.11); tireMat.specularColor = new Color3(0.25, 0.25, 0.28); tireMat.specularPower = 32
  const rimMat = new StandardMaterial('krim' + idSuffix, scene)
  rimMat.diffuseColor = new Color3(0.85, 0.87, 0.92); rimMat.specularColor = new Color3(0.9, 0.9, 0.95); rimMat.specularPower = 80
  const hubMat = new StandardMaterial('khubmat' + idSuffix, scene)
  hubMat.diffuseColor = c.scale(0.9); hubMat.specularColor = new Color3(0.8, 0.8, 0.85); hubMat.specularPower = 64
  const darkMat = new StandardMaterial('kdark' + idSuffix, scene)
  darkMat.diffuseColor = new Color3(0.12, 0.12, 0.15); darkMat.specularColor = new Color3(0.3, 0.3, 0.35)
  const greyMat = new StandardMaterial('kgrey' + idSuffix, scene)
  greyMat.diffuseColor = new Color3(0.55, 0.57, 0.6); greyMat.specularColor = new Color3(0.6, 0.6, 0.65); greyMat.specularPower = 48
  const glassMat = new StandardMaterial('kglass' + idSuffix, scene)
  glassMat.diffuseColor = new Color3(0.1, 0.12, 0.16); glassMat.specularColor = new Color3(1, 1, 1); glassMat.specularPower = 128; glassMat.alpha = 0.55

  // Lage chassis-plaat (afgerond)
  const floor = MeshBuilder.CreateBox('kfloor', { width: 1.42, height: 0.2, depth: 2.9 }, scene)
  floor.material = darkMat; floor.position.y = 0.32; floor.parent = chassis

  // Hoofd-body: capsule (ronde uiteinden) — geeft de zachte speelgoed-look
  const body = MeshBuilder.CreateCapsule('kbodycap', { radius: 0.62, height: 2.5, tessellation: 20, capSubdivisions: 8, orientation: Vector3.Forward() }, scene)
  body.material = bodyMat; body.position.set(0, 0.6, -0.1); body.scaling.set(1.05, 0.82, 1); body.parent = chassis

  // Zijpods (afgeronde capsules langs de flanken)
  ;[-0.7, 0.7].forEach((sx, i) => {
    const pod = MeshBuilder.CreateCapsule('kpod' + i, { radius: 0.26, height: 1.7, tessellation: 14, orientation: Vector3.Forward() }, scene)
    pod.material = bodyMat; pod.position.set(sx, 0.46, -0.05); pod.scaling.set(0.85, 0.85, 1); pod.parent = chassis
  })

  // Neus: gladde, afgeronde kegel naar voren
  const nose = MeshBuilder.CreateCapsule('knose', { radius: 0.34, height: 1.5, tessellation: 16, orientation: Vector3.Forward() }, scene)
  nose.material = bodyMat; nose.position.set(0, 0.42, 1.25); nose.scaling.set(1, 0.7, 1); nose.rotation.x = -0.05; nose.parent = chassis
  const noseCone = MeshBuilder.CreateCylinder('knosecone', { height: 0.5, diameterTop: 0.05, diameterBottom: 0.5, tessellation: 20 }, scene)
  noseCone.material = bodyMat; noseCone.rotation.x = Math.PI / 2; noseCone.position.set(0, 0.4, 2.0); noseCone.parent = chassis

  // Koplampen
  ;[-0.28, 0.28].forEach((sx, i) => {
    const lamp = MeshBuilder.CreateSphere('klamp' + i, { diameter: 0.22, segments: 10 }, scene)
    lamp.material = lightMat; lamp.position.set(sx, 0.5, 1.72); lamp.scaling.z = 0.6; lamp.parent = chassis
  })

  // Frontvleugel (breed, laag, afgerond)
  const fwing = MeshBuilder.CreateBox('kfwing', { width: 1.75, height: 0.1, depth: 0.42 }, scene)
  fwing.material = accentMat; fwing.position.set(0, 0.26, 1.98); fwing.parent = chassis
  ;[-0.82, 0.82].forEach((sx, i) => {
    const ep = MeshBuilder.CreateBox('kfwingep' + i, { width: 0.1, height: 0.24, depth: 0.42 }, scene)
    ep.material = bodyMat; ep.position.set(sx, 0.34, 1.98); ep.parent = chassis
  })

  // Cockpit-rand + zitkuip
  const cowl = MeshBuilder.CreateCapsule('kcowl', { radius: 0.5, height: 1.1, tessellation: 16, orientation: Vector3.Forward() }, scene)
  cowl.material = accentMat; cowl.position.set(0, 0.5, -0.1); cowl.scaling.set(1.05, 0.7, 1); cowl.parent = chassis
  const seat = MeshBuilder.CreateCapsule('kseat', { radius: 0.3, height: 0.62, tessellation: 12 }, scene)
  seat.material = darkMat; seat.position.set(0, 0.74, -0.62); seat.scaling.z = 0.5; seat.parent = chassis
  // headrest
  const headrest = MeshBuilder.CreateSphere('kheadrest', { diameter: 0.4, segments: 12 }, scene)
  headrest.material = accentMat; headrest.position.set(0, 0.95, -0.78); headrest.scaling.set(1, 1, 0.6); headrest.parent = chassis

  // Stuurkolom + stuur
  const col = MeshBuilder.CreateCylinder('kcol', { height: 0.55, diameter: 0.08, tessellation: 10 }, scene)
  col.material = greyMat; col.rotation.x = 0.7; col.position.set(0, 0.78, 0.5); col.parent = chassis
  const wheel = MeshBuilder.CreateTorus('ksteer', { diameter: 0.44, thickness: 0.08, tessellation: 24 }, scene)
  wheel.material = darkMat; wheel.rotation.x = 1.0; wheel.position.set(0, 0.92, 0.66); wheel.parent = chassis

  // Achtervleugel (op afgeronde staanders)
  ;[-0.46, 0.46].forEach((sx, i) => {
    const post = MeshBuilder.CreateCapsule('kwp' + i, { radius: 0.055, height: 0.5, tessellation: 8 }, scene)
    post.material = darkMat; post.position.set(sx, 0.72, -1.42); post.parent = chassis
  })
  const wing = MeshBuilder.CreateBox('kwing', { width: 1.55, height: 0.08, depth: 0.52 }, scene)
  wing.material = accentMat; wing.position.set(0, 0.98, -1.46); wing.parent = chassis
  const wingLip = MeshBuilder.CreateBox('kwinglip', { width: 1.55, height: 0.16, depth: 0.06 }, scene)
  wingLip.material = bodyMat; wingLip.position.set(0, 1.02, -1.7); wingLip.rotation.x = -0.35; wingLip.parent = chassis

  // Uitlaat (glimmend metaal)
  ;[-0.2, 0.2].forEach((sx, i) => {
    const exh = MeshBuilder.CreateCylinder('kexh' + i, { height: 0.62, diameterTop: 0.16, diameterBottom: 0.11, tessellation: 12 }, scene)
    exh.rotation.x = Math.PI / 2; exh.material = greyMat
    exh.position.set(sx, 0.56, -1.62); exh.parent = chassis
  })

  // Wielen: dikke band met afgeronde flank + velg met spaken + spatbord
  const wheels = []
  const wheelDef = [[-0.84, 1.05], [0.84, 1.05], [-0.84, -1.05], [0.84, -1.05]]
  wheelDef.forEach(([wx, wz], i) => {
    const hub = new TransformNode('khub' + i, scene)
    hub.position.set(wx, 0.4, wz); hub.parent = chassis
    // band (hoge tessellation = rond) met licht afgeronde flank via torus
    const tire = MeshBuilder.CreateCylinder('kw' + i, { height: 0.42, diameter: 0.82, tessellation: 28 }, scene)
    tire.rotation.z = Math.PI / 2; tire.material = tireMat; tire.parent = hub
    const sidewall = MeshBuilder.CreateTorus('ktw' + i, { diameter: 0.7, thickness: 0.22, tessellation: 24 }, scene)
    sidewall.rotation.z = Math.PI / 2; sidewall.material = tireMat; sidewall.parent = hub
    // velg
    const rim = MeshBuilder.CreateCylinder('krimM' + i, { height: 0.44, diameter: 0.46, tessellation: 20 }, scene)
    rim.rotation.z = Math.PI / 2; rim.material = rimMat; rim.parent = hub
    // spaken
    for (let s = 0; s < 5; s++) {
      const spoke = MeshBuilder.CreateBox('kspoke' + i + s, { width: 0.06, height: 0.42, depth: 0.06 }, scene)
      spoke.material = rimMat; spoke.rotation.z = Math.PI / 2; spoke.rotation.x = (s / 5) * Math.PI
      spoke.parent = tire
    }
    // naaf-dop in body-kleur
    const cap = MeshBuilder.CreateSphere('kcap' + i, { diameter: 0.24, segments: 10 }, scene)
    cap.rotation.z = Math.PI / 2; cap.scaling.x = 0.5; cap.material = hubMat; cap.parent = hub
    // spatbord (halve ronde kap boven het wiel)
    const fender = MeshBuilder.CreateTorus('kfender' + i, { diameter: 0.92, thickness: 0.16, tessellation: 20 }, scene)
    fender.rotation.z = Math.PI / 2; fender.material = accentMat; fender.scaling.y = 0.55
    fender.position.set(wx, 0.12, wz); fender.parent = chassis
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
