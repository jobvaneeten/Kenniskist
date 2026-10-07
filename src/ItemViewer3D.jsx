// Gewonnen item in 3D: het poppetje met je huidige outfit, maar met het
// nieuwe item aan, op een draaiend podium. Slepen = draaien (alle kanten),
// scrollen/knijpen = zoomen. De camera richt zich op waar het item zit.
import { useEffect, useRef, useState } from 'react'
import {
  Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight,
  Vector3, Color3, Color4, MeshBuilder, StandardMaterial,
} from '@babylonjs/core'
import { loadAvatar, safeJSON } from './games/kartShared'

// hoogte (fractie van het poppetje) en afstand per categorie
const FOCUS = {
  shirt:    { h: 0.64, r: 0.7 },
  broek:    { h: 0.34, r: 0.75 },
  sokken:   { h: 0.12, r: 0.75 },
  schoenen: { h: 0.1,  r: 0.75 },
  hoofd:    { h: 0.92, r: 0.4 },
}

// children = plaatje dat zichtbaar is tot het 3D-poppetje geladen is
export default function ItemViewer3D({ type, itemKey, gloed = '#facc15', children }) {
  const canvasRef = useRef(null)
  const [klaar, setKlaar] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false })
    engine.setHardwareScalingLevel(1 / Math.min(2, window.devicePixelRatio || 1))
    const scene = new Scene(engine)
    scene.clearColor = new Color4(0, 0, 0, 0)

    const cam = new ArcRotateCamera('cam', Math.PI / 2, Math.PI / 2.2, 4, Vector3.Zero(), scene)
    cam.attachControl(canvas, true)
    cam.lowerBetaLimit = 0.35; cam.upperBetaLimit = Math.PI - 0.35   // ook van boven en onder bekijken
    cam.panningSensibility = 0
    cam.wheelDeltaPercentage = 0.01; cam.pinchDeltaPercentage = 0.01
    cam.useAutoRotationBehavior = true
    cam.autoRotationBehavior.idleRotationSpeed = 0.6
    cam.autoRotationBehavior.idleRotationWaitTime = 1800
    cam.autoRotationBehavior.idleRotationSpinupTime = 800

    new HemisphericLight('h', new Vector3(0, 1, 0), scene).intensity = 1.25
    const zon = new DirectionalLight('z', new Vector3(-0.6, -1.2, 0.8), scene); zon.intensity = 1.3
    const tegen = new DirectionalLight('t', new Vector3(0.7, -0.3, -1), scene)   // randlicht in de zeldzaamheidskleur
    tegen.diffuse = Color3.FromHexString(gloed); tegen.intensity = 1.2

    // outfit uit de kledingkast, met het gewonnen item erover
    const shirt = type === 'shirt' ? itemKey : (localStorage.getItem('kk_shirt') || '')
    const wearing = { ...safeJSON(localStorage.getItem('kk_wearing')) }
    if (type !== 'shirt') wearing[type] = itemKey
    if (type === 'sokken') wearing.schoenen = null   // anders zie je de sokken niet

    let dicht = false
    loadAvatar(scene, shirt, wearing, (root) => {
      if (dicht) return
      // poppetje in beeld: meet de hoogte (na de rust-pose) en richt op het item
      scene.onAfterRenderObservable.addOnce(() => {
        let mn = new Vector3(1e9, 1e9, 1e9), mx = new Vector3(-1e9, -1e9, -1e9)
        root.getChildMeshes(false).forEach(m => {
          if (!m.isEnabled() || !m.getTotalVertices?.()) return
          try { if (m.skeleton) m.refreshBoundingInfo({ applySkeleton: true }) } catch { /* geen skelet */ }
          const bb = m.getBoundingInfo().boundingBox
          mn = Vector3.Minimize(mn, bb.minimumWorld); mx = Vector3.Maximize(mx, bb.maximumWorld)
        })
        const hoog = mx.y - mn.y, f = FOCUS[type] || FOCUS.shirt
        cam.target = new Vector3((mn.x + mx.x) / 2, mn.y + hoog * f.h, (mn.z + mx.z) / 2)
        cam.radius = hoog * 1.2 * f.r
        cam.lowerRadiusLimit = hoog * 0.6; cam.upperRadiusLimit = hoog * 2.4   // niet zo dichtbij dat je door voeten/hoofd kijkt
        cam.minZ = 0.01
        // podium onder de voeten
        const p = MeshBuilder.CreateCylinder('podium', { diameter: hoog * 0.75, height: hoog * 0.03, tessellation: 48 }, scene)
        p.position.set(cam.target.x, mn.y - hoog * 0.015, cam.target.z)
        const pm = new StandardMaterial('podiumM', scene)
        pm.diffuseColor = new Color3(0.08, 0.07, 0.18); pm.emissiveColor = Color3.FromHexString(gloed).scale(0.25)
        p.material = pm
        setKlaar(true)
      })
    }, 'rust.glb')

    engine.runRenderLoop(() => scene.render())
    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)
    return () => { dicht = true; window.removeEventListener('resize', onResize); engine.dispose() }
  }, [type, itemKey, gloed])

  return (
    <div className={`iv3d ${klaar ? 'iv3d-klaar' : ''}`}>
      <canvas ref={canvasRef} className="iv3d-canvas" />
      {!klaar && <div className="iv3d-plaatje">{children}</div>}
      {klaar && <div className="iv3d-hint">↻ sleep om te draaien</div>}
    </div>
  )
}
