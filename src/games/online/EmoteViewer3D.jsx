// Het eigen poppetje (met de kleding uit de Kledingkast) doet een emote, op
// een gloeiend podium. Slepen = draaien. Voor de Winkel na het openen van de
// Emote-kist.
import { useEffect, useRef, useState } from 'react'
import {
  Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight,
  Vector3, Color3, Color4, MeshBuilder, StandardMaterial,
} from '@babylonjs/core'
import Poppetje from './Poppetje.js'
import './emotes.css'

const leesJSON = (k) => { try { return JSON.parse(localStorage.getItem(k) || '{}') } catch { return {} } }

// children = plaatje dat zichtbaar is tot het poppetje geladen is
export default function EmoteViewer3D({ emote, gloed = '#facc15', hoek = -Math.PI / 2, children }) {
  const canvasRef = useRef(null)
  const [klaar, setKlaar] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const engine = new Engine(canvas, true, { stencil: false })
    engine.setHardwareScalingLevel(1 / Math.min(2, window.devicePixelRatio || 1))
    const scene = new Scene(engine)
    scene.clearColor = new Color4(0, 0, 0, 0)

    const cam = new ArcRotateCamera('cam', hoek, 1.3, 4.2, new Vector3(0, 1.0, 0), scene)
    cam.attachControl(canvas, true)
    cam.lowerRadiusLimit = 3; cam.upperRadiusLimit = 8; cam.panningSensibility = 0
    cam.lowerBetaLimit = 0.5; cam.upperBetaLimit = 1.6
    cam.wheelDeltaPercentage = 0.01; cam.pinchDeltaPercentage = 0.01
    new HemisphericLight('h', new Vector3(0, 1, 0), scene).intensity = 1.2
    const zon = new DirectionalLight('z', new Vector3(-0.6, -1.2, 0.8), scene); zon.intensity = 1.2
    const tegen = new DirectionalLight('t', new Vector3(0.7, -0.3, 1), scene)
    tegen.diffuse = Color3.FromHexString(gloed); tegen.intensity = 1.2

    const p = MeshBuilder.CreateCylinder('podium', { diameter: 2.4, height: 0.08, tessellation: 48 }, scene)
    p.position.y = -0.04
    const pm = new StandardMaterial('podiumM', scene)
    pm.diffuseColor = new Color3(0.08, 0.07, 0.18); pm.emissiveColor = Color3.FromHexString(gloed).scale(0.3)
    p.material = pm

    const pop = new Poppetje(scene, {
      zonderNaam: true, shirt: localStorage.getItem('kk_shirt') || '', wearing: leesJSON('kk_wearing'), anims: [emote],
    })
    pop.zet(0, 0, 0, Math.PI)   // met het gezicht naar de camera
    pop.vast(emote)
    const kijk = setInterval(() => { if (pop.root && pop._anims[emote]) { setKlaar(true); clearInterval(kijk) } }, 100)

    engine.runRenderLoop(() => scene.render())
    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)
    return () => { clearInterval(kijk); window.removeEventListener('resize', onResize); pop.dispose(); engine.dispose() }
  }, [emote, gloed, hoek])

  return (
    <div className="ev3d">
      <canvas ref={canvasRef} className="ev3d-canvas" />
      {!klaar && <div className="ev3d-plaatje">{children}</div>}
    </div>
  )
}
