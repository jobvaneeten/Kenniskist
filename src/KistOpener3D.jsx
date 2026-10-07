// Lootbox openen in echte 3D: de kist uit Blender (public/crates/kist.glb,
// tools/blender/exporteer_kist.py) staat op een gloeiend podium.
//   1. Drie tikken: de kist springt op, het deksel blijft op een kier en het
//      licht dat eruit lekt toont de zeldzaamheid (die kan per tik omhoog:
//      grijs → blauw → paars → goud → roze). Die naam staat er ook bij.
//   2. Spanning: na de derde tik rammelt de kist steeds harder en flikkert de
//      kleur langs de zeldzaamheden tot hij stopt op de echte.
//   3. Open: het deksel knalt open, een lichtzuil schiet omhoog en het
//      kledingstuk zweeft eruit, eerst als silhouet, dan in kleur.
// Hoe zeldzamer, hoe groter de show: meer schokgolven, vanaf episch
// lichtstralen, vanaf legendarisch slow-motion en een sterrenregen, en bij
// ultra vuurwerk en een regenboogzuil.
import { useEffect, useRef, useState } from 'react'
import {
  Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight, PointLight,
  Vector3, Color3, Color4, Quaternion, MeshBuilder, StandardMaterial, PBRMaterial,
  DynamicTexture, ParticleSystem, GlowLayer, HDRCubeTexture, TransformNode, Texture,
} from '@babylonjs/core'
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'
import { RARITIES } from './data'
import KledingPreview from './KledingPreview'
import { playTapSound, playTierSound, playBurstSound, playRumble, playLanding, startSfeer, playOnthulling } from './lootboxSound'

const ORDE = ['common', 'rare', 'epic', 'legendary', 'ultra_legendary']
const TIKKEN = 3
const NEUTRAAL = '#c4b5fd'
const SPANNING = 2.6        // seconden rammelen en kleur-flikkeren na de laatste tik
const SILHOUET = 1.3        // seconden dat het kledingstuk nog donker is
const NAAR_ONTHULLING = 4.4 // seconden na het openen → onthul-scherm

// Zeldzaamheid na tik 1, 2 en 3 (nooit omlaag). De echte komt pas na de spanning.
function tierReeks(eind) {
  const f = Math.max(0, ORDE.indexOf(eind))
  const t1 = Math.floor(Math.random() * (f + 1) * 0.5)
  const t2 = t1 + Math.floor(Math.random() * (f - t1 + 1) * 0.6)
  const t3 = t2 + Math.floor(Math.random() * (f - t2 + 1) * 0.6)
  return [t1, Math.min(t2, f), Math.min(t3, f), f]
}
// Flikker-volgorde tijdens de spanning: steeds trager, eindigt op de echte.
function flikkerReeks(eind) {
  const tijden = [], tiers = []
  let t = 0.25, stap = 0.12
  while (t < SPANNING - 0.5) {
    tijden.push(t); tiers.push(Math.floor(Math.random() * (Math.min(4, eind + 1) + 1)))
    t += stap; stap *= 1.18
  }
  tijden.push(SPANNING - 0.35); tiers.push(eind)
  return { tijden, tiers }
}

const easeOutBack = (t, s = 2.2) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2)

function radiaal(scene, naam, stops) {
  const t = new DynamicTexture(naam, { width: 128, height: 128 }, scene, false)
  const c = t.getContext()
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64)
  stops.forEach(([o, k]) => g.addColorStop(o, k))
  c.fillStyle = g; c.fillRect(0, 0, 128, 128); t.update(); t.hasAlpha = true
  return t
}
function zuilTextuur(scene) {
  const t = new DynamicTexture('ko_zuil', { width: 16, height: 256 }, scene, false)
  const c = t.getContext()
  const g = c.createLinearGradient(0, 256, 0, 0)
  g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = g; c.fillRect(0, 0, 16, 256); t.update(); t.hasAlpha = true
  return t
}

export default function KistOpener3D({ type, item, rarity, onOpen, onKlaar }) {
  const canvasRef = useRef(null)
  const tikRef = useRef(() => {})
  const [tikken, setTikken] = useState(0)
  const [fase, setFase] = useState('laden')   // laden | tikken | spanning | open
  const [tier, setTier] = useState(-1)
  const [kleurOnthuld, setKleurOnthuld] = useState(false)
  const [flits, setFlits] = useState({ n: 0, sterkte: 0 })   // schermflits bij upgrades en openen
  const cb = useRef({ onOpen, onKlaar })
  useEffect(() => { cb.current = { onOpen, onKlaar } }, [onOpen, onKlaar])

  useEffect(() => {
    const canvas = canvasRef.current
    const engine = new Engine(canvas, true, { stencil: true, powerPreference: 'high-performance' })
    engine.setHardwareScalingLevel(1 / Math.min(1.5, window.devicePixelRatio || 1))   // scherp genoeg, en 60 fps op Chromebooks
    const scene = new Scene(engine)
    scene.clearColor = new Color4(0, 0, 0, 0)
    scene.environmentTexture = new HDRCubeTexture('/env/nacht_1k.hdr', scene, 128)
    scene.environmentIntensity = 1.0
    const timers = []
    const later = (fn, ms) => timers.push(setTimeout(fn, ms))

    // voorkant van de kist (Blender -y) ligt na de glTF-omzetting richting +z
    const ALPHA = Math.PI / 2 - 0.32
    const cam = new ArcRotateCamera('ko_cam', ALPHA, 1.14, 4.3, new Vector3(0, 0.72, 0), scene)
    cam.fov = 0.7
    new HemisphericLight('ko_h', new Vector3(0, 1, 0.3), scene).intensity = 0.45
    const key = new DirectionalLight('ko_k', new Vector3(0.5, -1, -0.8), scene); key.intensity = 1.2
    const rand = new DirectionalLight('ko_r', new Vector3(-0.2, -0.3, 1), scene)   // randlicht van achter in de tierkleur
    rand.intensity = 0
    // boven de kist (niet erin: zonder schaduw zou hij de buitenkant wit verlichten)
    const binnenLicht = new PointLight('ko_p', new Vector3(0, 2.1, -0.4), scene)
    binnenLicht.intensity = 0; binnenLicht.range = 5
    const glow = new GlowLayer('ko_glow', scene, { blurKernelSize: 32, mainTextureRatio: 0.4 }); glow.intensity = 0.9

    const reeks = tierReeks(rarity)
    const eind = reeks[TIKKEN]
    let kleur = Color3.FromHexString(NEUTRAAL), kracht = 0.4   // kracht: hoe fel het goud meegloeit
    let matGem = null, matBinnen = null, goud = null
    let huidigeTier = null
    const zetKleur = (idx) => {
      const hex = idx < 0 ? NEUTRAAL : RARITIES[ORDE[idx]].color
      kleur = Color3.FromHexString(hex)
      binnenLicht.diffuse = kleur; rand.diffuse = kleur
      if (matGem) matGem.emissiveColor = kleur.scale(1.5)
      if (matBinnen) matBinnen.emissiveColor = kleur.scale(1.4)
      if (goud) goud.emissiveColor = kleur.scale(0.12 * kracht)
      vloerMat.emissiveColor = kleur; auraMat.emissiveColor = kleur
      zuilMat.emissiveColor = kleur
      sprank.color1 = new Color4(kleur.r, kleur.g, kleur.b, 1)
      lek.color1 = new Color4(kleur.r, kleur.g, kleur.b, 1); lek.color2 = new Color4(kleur.r, kleur.g, kleur.b, 0.6)
      if (idx !== huidigeTier) { huidigeTier = idx; setTier(idx) }   // React alleen bij een echte wissel
    }

    // podium: gekleurde gloed + zachte schaduw onder de kist + aura-ring
    const gloedTex = radiaal(scene, 'ko_gloedt', [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']])
    const vloer = MeshBuilder.CreateDisc('ko_vloer', { radius: 2.0, tessellation: 48 }, scene)
    vloer.rotation.x = Math.PI / 2; vloer.position.y = 0.005
    const vloerMat = new StandardMaterial('ko_vloerm', scene)
    vloerMat.diffuseTexture = gloedTex; vloerMat.opacityTexture = gloedTex; vloerMat.disableLighting = true; vloerMat.alpha = 0.5
    vloer.material = vloerMat
    const schaduw = MeshBuilder.CreateDisc('ko_schaduw', { radius: 1.2, tessellation: 32 }, scene)
    schaduw.rotation.x = Math.PI / 2; schaduw.position.y = 0.01; schaduw.scaling.y = 0.7
    const sm = new StandardMaterial('ko_schaduwm', scene)
    const st = radiaal(scene, 'ko_schaduwt', [[0, 'rgba(0,0,0,0.75)'], [0.6, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']])
    sm.diffuseTexture = st; sm.opacityTexture = st; sm.disableLighting = true; sm.diffuseColor = Color3.Black()
    schaduw.material = sm
    const aura = MeshBuilder.CreateTorus('ko_aura', { diameter: 2.5, thickness: 0.05, tessellation: 64 }, scene)
    aura.position.y = 0.03
    const auraMat = new StandardMaterial('ko_auram', scene); auraMat.disableLighting = true; auraMat.alpha = 0
    aura.material = auraMat

    // lichtzuil (verschijnt bij openen)
    const zuil = MeshBuilder.CreateCylinder('ko_zuil', { height: 6, diameterTop: 2.4, diameterBottom: 1.1, tessellation: 32, cap: 0 }, scene)
    zuil.position.y = 3.6; zuil.scaling.set(0.01, 0.01, 0.01)
    const zuilMat = new StandardMaterial('ko_zuilm', scene)
    const zt = zuilTextuur(scene)
    zuilMat.opacityTexture = zt; zuilMat.emissiveTexture = zt; zuilMat.disableLighting = true
    zuilMat.backFaceCulling = false; zuilMat.alphaMode = Engine.ALPHA_ADD
    zuil.material = zuilMat

    // deeltjes: sprankels rond de kist, licht dat uit de kier lekt, knallen
    const sprank = new ParticleSystem('ko_sprank', 120, scene)
    sprank.particleTexture = gloedTex; sprank.emitter = new Vector3(0, 0.6, 0)
    sprank.minEmitBox = new Vector3(-1.1, 0, -0.8); sprank.maxEmitBox = new Vector3(1.1, 0.8, 0.8)
    sprank.minSize = 0.04; sprank.maxSize = 0.12; sprank.minLifeTime = 0.8; sprank.maxLifeTime = 1.6
    sprank.emitRate = 14; sprank.blendMode = ParticleSystem.BLENDMODE_ADD
    sprank.color2 = new Color4(1, 1, 1, 0.8); sprank.colorDead = new Color4(0, 0, 0, 0)
    sprank.direction1 = new Vector3(-0.1, 0.5, -0.1); sprank.direction2 = new Vector3(0.1, 1, 0.1)
    sprank.minEmitPower = 0.2; sprank.maxEmitPower = 0.5
    sprank.start()
    const lek = new ParticleSystem('ko_lek', 150, scene)
    lek.particleTexture = gloedTex; lek.emitter = new Vector3(0, 0.98, 0.15)
    lek.minEmitBox = new Vector3(-0.7, 0, -0.05); lek.maxEmitBox = new Vector3(0.7, 0.04, 0.05)
    lek.minSize = 0.08; lek.maxSize = 0.24; lek.minLifeTime = 0.3; lek.maxLifeTime = 0.7
    lek.emitRate = 0; lek.blendMode = ParticleSystem.BLENDMODE_ADD; lek.colorDead = new Color4(0, 0, 0, 0)
    lek.direction1 = new Vector3(-0.3, 1, 0.2); lek.direction2 = new Vector3(0.3, 2, 0.6)
    lek.minEmitPower = 0.4; lek.maxEmitPower = 1.1
    lek.start()
    const knal = (aantal, sterkte, hoogte = 0.9, plek = null, k = null) => {
      const kl = k || kleur
      const ps = new ParticleSystem('ko_knal', aantal, scene)
      ps.particleTexture = gloedTex; ps.emitter = plek || new Vector3(0, hoogte, 0)
      ps.minEmitBox = new Vector3(-0.4, 0, -0.3); ps.maxEmitBox = new Vector3(0.4, 0.1, 0.3)
      ps.color1 = new Color4(kl.r, kl.g, kl.b, 1); ps.color2 = new Color4(1, 1, 1, 1); ps.colorDead = new Color4(kl.r, kl.g, kl.b, 0)
      ps.minSize = 0.06; ps.maxSize = 0.22; ps.minLifeTime = 0.4; ps.maxLifeTime = 1.1
      ps.blendMode = ParticleSystem.BLENDMODE_ADD
      ps.direction1 = new Vector3(-1, 1.2, -1); ps.direction2 = new Vector3(1, 2.6, 1)
      ps.minEmitPower = sterkte * 0.4; ps.maxEmitPower = sterkte
      ps.gravity = new Vector3(0, -5, 0)
      ps.manualEmitCount = aantal; ps.targetStopDuration = 0.15; ps.disposeOnStop = true
      ps.start()
    }

    // schokgolven: ringen die over de vloer uitdijen
    const ringen = []
    const schokgolf = (grootte = 4, dur = 0.7, vertraging = 0) => {
      const r = MeshBuilder.CreateTorus('ko_golf', { diameter: 1, thickness: 0.06, tessellation: 64 }, scene)
      r.position.y = 0.05
      const m = new StandardMaterial('ko_golfm', scene); m.disableLighting = true; m.emissiveColor = kleur.clone(); m.alpha = 0
      r.material = m
      ringen.push({ r, m, t0: t + vertraging, dur, grootte })
    }
    // lichtstralen achter de kist (vanaf episch), draaien langzaam
    const stralenTex = new DynamicTexture('ko_stralent', { width: 256, height: 256 }, scene, false)
    {
      const c = stralenTex.getContext()
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2
        const g = c.createLinearGradient(128, 128, 128 + Math.cos(a) * 128, 128 + Math.sin(a) * 128)
        g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)')
        c.fillStyle = g; c.beginPath(); c.moveTo(128, 128)
        c.arc(128, 128, 128, a - 0.07, a + 0.07); c.closePath(); c.fill()
      }
      stralenTex.update(); stralenTex.hasAlpha = true
    }
    const stralen = MeshBuilder.CreatePlane('ko_stralen', { size: 5 }, scene)
    stralen.position.set(0, 1.5, -0.6)
    const stralenMat = new StandardMaterial('ko_stralenm', scene)
    stralenMat.opacityTexture = stralenTex; stralenMat.emissiveTexture = stralenTex; stralenMat.disableLighting = true
    stralenMat.alphaMode = Engine.ALPHA_ADD; stralenMat.alpha = 0; stralenMat.backFaceCulling = false
    stralen.material = stralenMat; stralen.setEnabled(false)
    // sterrenregen (vanaf legendarisch)
    const regen = new ParticleSystem('ko_regen', 300, scene)
    regen.particleTexture = gloedTex; regen.emitter = new Vector3(0, 4.5, 0)
    regen.minEmitBox = new Vector3(-2.6, 0, -1.5); regen.maxEmitBox = new Vector3(2.6, 0.3, 1.5)
    regen.minSize = 0.05; regen.maxSize = 0.16; regen.minLifeTime = 1.6; regen.maxLifeTime = 2.6
    regen.emitRate = 0; regen.blendMode = ParticleSystem.BLENDMODE_ADD
    regen.color1 = new Color4(1, 0.85, 0.3, 1); regen.color2 = new Color4(1, 1, 1, 1); regen.colorDead = new Color4(1, 0.7, 0.2, 0)
    regen.direction1 = new Vector3(-0.2, -1, -0.2); regen.direction2 = new Vector3(0.2, -0.6, 0.2)
    regen.minEmitPower = 0.5; regen.maxEmitPower = 1.2; regen.gravity = new Vector3(0, -1.2, 0)
    regen.start()

    // kist laden: houtnerf in paars, goud dat meegloeit in de tierkleur
    let romp = null, deksel = null, dicht = false
    const wortel = new TransformNode('ko_wortel', scene)
    LoadAssetContainerAsync('/crates/kist.glb', scene).then(c => {
      if (dicht) return
      c.addAllToScene()
      const r = c.rootNodes[0]; r.parent = wortel
      const nerf = new Texture('/tex/bos/planken.jpg', scene)
      nerf.uScale = nerf.vScale = 1.4
      const hout = new PBRMaterial('ko_hout', scene)
      hout.albedoTexture = nerf; hout.albedoColor = new Color3(0.32, 0.12, 0.62); hout.metallic = 0; hout.roughness = 0.55
      hout.clearCoat.isEnabled = true; hout.clearCoat.intensity = 0.15; hout.clearCoat.roughness = 0.25   // gelakt
      hout.environmentIntensity = 0.45   // anders kleurt de nachtlucht de bovenkant grijs
      const houtD = new PBRMaterial('ko_houtd', scene)
      houtD.albedoColor = new Color3(0.05, 0.015, 0.12); houtD.metallic = 0; houtD.roughness = 0.6
      goud = new PBRMaterial('ko_goud', scene)
      goud.albedoColor = new Color3(1, 0.74, 0.24); goud.metallic = 1; goud.roughness = 0.2
      matGem = new StandardMaterial('ko_gem', scene); matGem.disableLighting = true
      matBinnen = new StandardMaterial('ko_binnen', scene); matBinnen.disableLighting = true
      const vervang = { kist_hout: hout, kist_hout_d: houtD, kist_goud: goud, kist_gem: matGem, kist_binnen: matBinnen }
      r.getChildMeshes(false).forEach(m => {
        const n = (m.material?.name || '').replace(/\.\d+$/, '')
        if (vervang[n]) m.material = vervang[n]
      })
      romp = r
      deksel = r.getChildTransformNodes(false).find(n => n.name === 'k_deksel') || r.getChildMeshes(false).find(m => m.name.startsWith('k_deksel'))
      zetKleur(-1)
      entreeT = t
      playLanding()
      setFase('tikken')
    }).catch(e => console.error('kist.glb niet geladen:', e))

    // ── animatie-toestand ──
    let laatsteTikMs = 0
    let slowTot = -1, entreeT = -1, geland = false, stopSfeer = () => {}
    let t = 0, tikT = -1, spanT = -1, openT = -1, dekselHoek = 0, kier = 0, aantalTikken = 0, schok = 0
    const DEKSEL_OPEN = -1.95
    const flikker = flikkerReeks(eind)
    let flikkerIdx = 0

    const openKnallen = () => {
      if (dicht) return
      openT = t
      kracht = 1; zetKleur(eind)
      playBurstSound(eind); playTierSound(ORDE[eind])
      knal(70 + eind * 35, 6 + eind * 1.5, 1.1)
      schok = 0.15 + eind * 0.06
      for (let i = 0; i <= eind; i++) schokgolf(4 + i * 1.5, 0.8 + i * 0.15, i * 0.12)
      if (eind >= 2) stralen.setEnabled(true)
      if (eind >= 3) { regen.emitRate = eind === 4 ? 160 : 90; slowTot = t + 0.5 }
      if (eind === 4) {
        for (let k = 0; k < 7; k++) later(() => {
          if (dicht) return
          const kl = Color3.FromHSV(Math.random() * 360, 0.8, 1)
          knal(60, 5, 0, new Vector3((Math.random() - 0.5) * 4, 2.2 + Math.random() * 1.6, -0.5 - Math.random()), kl)
        }, 500 + k * 330)
      }
      if (eind >= 1) setFlits(f => ({ n: f.n + 1, sterkte: 0.25 + eind * 0.18 }))
      setFase('open')
      cb.current.onOpen?.()
      later(() => { setKleurOnthuld(true); playOnthulling(eind) }, SILHOUET * 1000)
      later(() => cb.current.onKlaar?.(), NAAR_ONTHULLING * 1000)
    }

    tikRef.current = () => {
      // vergrendeling in echte tijd (animatietijd loopt achter op een trage GPU)
      if (!romp || spanT >= 0 || openT >= 0 || aantalTikken >= TIKKEN || performance.now() - laatsteTikMs < 450) return
      laatsteTikMs = performance.now()
      aantalTikken++
      setTikken(aantalTikken)
      tikT = t
      const nu = reeks[aantalTikken - 1], vorige = aantalTikken > 1 ? reeks[aantalTikken - 2] : -1
      kracht = 0.35 + aantalTikken * 0.2
      zetKleur(nu)
      playTapSound(aantalTikken, nu)
      if (nu > vorige && nu > 0) {   // kleur-upgrade: eigen geluid, schokgolf en flits
        later(() => playTierSound(ORDE[nu], true), 120)
        schokgolf(2.5 + nu * 0.5, 0.6)
        setFlits(f => ({ n: f.n + 1, sterkte: 0.15 + nu * 0.08 }))
      }
      knal(18 + nu * 8, 3 + nu, 1.0)
      schok = 0.08 + nu * 0.025
      kier = 0.06 + aantalTikken * 0.05      // deksel blijft steeds verder op een kier
      if (aantalTikken === TIKKEN) {
        later(() => { if (!dicht) { spanT = t; stopSfeer(); setFase('spanning'); playRumble(SPANNING) } }, 550)
      }
    }

    scene.onBeforeRenderObservable.add(() => {
      let dt = Math.min(0.05, engine.getDeltaTime() / 1000)
      if (t < slowTot) dt *= 0.35   // slow-motion op het openmoment (legendarisch en hoger)
      t += dt
      for (let i = ringen.length - 1; i >= 0; i--) {
        const g = ringen[i], p = (t - g.t0) / g.dur
        if (p < 0) continue
        if (p >= 1) { g.r.dispose(); g.m.dispose(); ringen.splice(i, 1); continue }
        g.r.scaling.setAll(0.5 + (g.grootte - 0.5) * (1 - Math.pow(1 - p, 3)))
        g.m.alpha = 0.9 * (1 - p)
      }
      if (stralen.isEnabled()) {
        stralen.lookAt(cam.position); stralen.rotate(Vector3.Up(), Math.PI)
        stralenTex.wAng += dt * 0.25
        stralenMat.alpha = Math.min(eind >= 3 ? 0.9 : 0.55, stralenMat.alpha + dt * 1.5)
        stralenMat.emissiveColor = kleur
        stralen.scaling.setAll(1 + Math.sin(t * 2) * 0.04 + (eind - 2) * 0.1)
      }
      if (openT >= 0 && eind === 4) {   // ultra: regenboogzuil
        const kl = Color3.FromHSV((t * 140) % 360, 0.65, 1)
        zuilMat.emissiveColor = kl; vloerMat.emissiveColor = kl; auraMat.emissiveColor = kl
      }
      if (!romp) return
      let y = Math.sin(t * 2.2) * 0.04, sx = 1, sy = 1, rz = Math.sin(t * 1.3) * 0.02, ry = 0
      // entree: valt van ~3 m (0,33 s), plof met squash, dan veert hij bij
      if (entreeT >= 0 && t - entreeT < 0.75) {
        const e = t - entreeT
        if (e < 0.33) { const v = e / 0.33; y = 3 * (1 - v * v); sy = 1.12; sx = 0.92 }
        else {
          if (!geland) {
            geland = true; schok = 0.12
            knal(26, 2.5, 0.05, null, new Color3(0.75, 0.7, 0.9)); schokgolf(3, 0.5)
            stopSfeer = startSfeer()
          }
          const v = (e - 0.33) / 0.42
          sy = 1 - Math.sin(v * Math.PI) * 0.2 * (1 - v); sx = 1 + Math.sin(v * Math.PI) * 0.12 * (1 - v)
          y = Math.abs(Math.sin(v * Math.PI * 2)) * 0.12 * (1 - v)
        }
      }
      let hoek = -kier
      lek.emitRate = kier > 0 ? 20 + kier * 300 : 0
      binnenLicht.intensity = kier > 0 ? 0.3 + kier * 3 : 0
      rand.intensity = kier > 0 ? 0.6 + kier * 4 : 0
      auraMat.alpha = Math.min(0.9, kier * 3)
      aura.scaling.setAll(1 + Math.sin(t * 3) * 0.04)

      if (openT >= 0) {
        // open: deksel knalt achterover, sprong, lichtzuil
        const p = Math.min(1, (t - openT) / 0.55)
        hoek = DEKSEL_OPEN * easeOutBack(p, 1.6)
        const sprong = Math.max(0, Math.sin(Math.min(1, (t - openT) / 0.45) * Math.PI))
        y = sprong * 0.35
        const land = (t - openT) > 0.45 && (t - openT) < 0.7 ? Math.sin(((t - openT) - 0.45) / 0.25 * Math.PI) : 0
        sy = 1 + sprong * 0.12 - land * 0.1; sx = 1 - sprong * 0.05 + land * 0.08
        const z = Math.min(1, (t - openT) / 0.35)
        const breed = 0.75 + eind * 0.08
        zuil.scaling.set(z * breed, easeOutBack(z, 1.2), z * breed)
        zuilMat.alpha = Math.max(0.25, 0.9 - Math.max(0, (t - openT) - 2) * 0.4)
        binnenLicht.intensity = 2.5 + Math.sin(t * 8) * 0.4
        rand.intensity = 2.5; lek.emitRate = 0; auraMat.alpha = 0.9
        glow.intensity = 1.3; sprank.emitRate = glow.isEnabled ? 70 : 20
      } else if (spanT >= 0) {
        // spanning: rammelen dat steeds harder wordt, deksel klappert, kleur flikkert
        const s = Math.min(1, (t - spanT) / SPANNING)
        const trilling = 0.01 + s * s * 0.09
        y = 0.05 + s * 0.18 + Math.sin(t * 60) * trilling * 0.6
        rz = Math.sin(t * (30 + s * 40)) * trilling
        ry = Math.sin(t * 23) * trilling * 0.8
        hoek = -(kier + Math.abs(Math.sin(t * (14 + s * 30))) * (0.08 + s * 0.25))
        sx = 1 + Math.sin(t * 9) * 0.02 * s; sy = 1 - Math.sin(t * 9) * 0.02 * s
        lek.emitRate = 80 + s * 260
        binnenLicht.intensity = 0.8 + s * 1.5
        rand.intensity = 1 + s * 3
        auraMat.alpha = 0.5 + s * 0.4
        schok = Math.max(schok, s * 0.05)
        while (flikkerIdx < flikker.tijden.length && t - spanT >= flikker.tijden[flikkerIdx]) {
          const idx = flikker.tiers[flikkerIdx]
          zetKleur(idx)
          if (flikkerIdx === flikker.tijden.length - 1) {   // laatste: de echte, met een knalletje
            knal(30 + eind * 10, 4 + eind, 1.0)
            if (eind > 0) playTierSound(ORDE[eind], true)
            schokgolf(3, 0.6)
          } else playTapSound(1, idx)
          flikkerIdx++
        }
        if (s >= 1) { spanT = -1; openKnallen() }
      } else if (tikT >= 0) {
        // na een tik: sprong + squash & stretch + trillen, deksel wipt even
        const p = (t - tikT) / 0.48
        if (p < 1) {
          const sprong = Math.sin(Math.min(1, p) * Math.PI)
          y += sprong * (0.28 + aantalTikken * 0.08)
          const land = p > 0.75 ? Math.sin((p - 0.75) / 0.25 * Math.PI) : 0
          sy = 1 + sprong * 0.08 - land * 0.14; sx = 1 - sprong * 0.04 + land * 0.1
          rz += Math.sin(p * 40) * 0.05 * (1 - p)
          hoek -= Math.sin(Math.min(1, p) * Math.PI) * 0.3
        }
      }
      dekselHoek += (hoek - dekselHoek) * Math.min(1, dt * (openT >= 0 ? 60 : 22))
      wortel.position.y = y
      wortel.scaling.set(sx, sy, sx)
      wortel.rotation.set(0, ry, rz)
      if (deksel) deksel.rotationQuaternion = Quaternion.RotationAxis(Vector3.Right(), dekselHoek)
      schok *= Math.pow(0.02, dt)
      cam.target.set(Math.sin(t * 47) * schok * 0.5, 0.72 + Math.cos(t * 53) * schok * 0.5, 0)   // vloeiende schok, geen ruis per frame
      cam.alpha = ALPHA + Math.sin(t * 0.4) * 0.06
      cam.radius = 4.3 - (spanT >= 0 ? Math.min(1, (t - spanT) / SPANNING) * 0.5 : openT >= 0 ? 0.5 : 0)   // inzoomen tijdens de spanning
    })

    // Trage GPU (oude Chromebook, software-rendering)? Na een seconde zelf
    // lichter maken: gloed uit, minder pixels, minder deeltjes. Zo blijft
    // de animatie vloeiend in plaats van mooi-maar-haperend.
    later(() => {
      if (engine.getFps() < 50) {
        glow.isEnabled = false
        engine.setHardwareScalingLevel(1.25)
        sprank.emitRate = 6
        lek.updateSpeed = 0.02
      }
    }, 1200)

    engine.runRenderLoop(() => scene.render())
    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)
    return () => { dicht = true; stopSfeer(); timers.forEach(clearTimeout); window.removeEventListener('resize', onResize); engine.dispose() }
  }, [rarity])

  const tc = tier < 0 ? NEUTRAAL : RARITIES[ORDE[tier]].color
  return (
    <div className={`ko ko-${fase}`} style={{ '--tc': tc }} onClick={() => tikRef.current()}>
      <canvas ref={canvasRef} className="ko-canvas" />
      {flits.n > 0 && <div key={flits.n} className="ko-flits" style={{ '--fs': flits.sterkte }} />}
      {(fase === 'tikken' || fase === 'spanning') && tier >= 0 && (
        <div key={tier} className="ko-tier">{RARITIES[ORDE[tier]].label}{fase === 'spanning' ? '…' : '?'}</div>
      )}
      {fase === 'open' && (
        <div className={`ko-item ${kleurOnthuld ? 'ko-item-kleur' : ''}`}>
          <div className="ko-item-gloed" />
          <KledingPreview type={type} item={item} size={150} glans={kleurOnthuld} />
        </div>
      )}
      {fase === 'tikken' && tikken < TIKKEN && (
        <div className="ko-hint">
          <div className="ko-stippen">
            {Array.from({ length: TIKKEN }, (_, i) => <span key={i} className={i < tikken ? 'aan' : ''} />)}
          </div>
          <p>{tikken === 0 ? 'TIK OP DE KIST!' : tikken < TIKKEN - 1 ? 'NOG EEN KEER!' : 'LAATSTE TIK!'}</p>
        </div>
      )}
      {fase === 'spanning' && <div className="ko-hint"><p>WAT ZIT ERIN…?</p></div>}
    </div>
  )
}
