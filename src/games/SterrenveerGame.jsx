import { useEffect, useRef } from 'react'
import { startSterrenveer } from '../game/main.js'
import './sterrenveer.css'

// Dunne wrapper om het spel. Alle logica zit in src/game/; hier alleen het
// canvas, het dempen van de shell-muziek en een terugknop.
export default function SterrenveerGame({ onBack }) {
  const canvasRef = useRef(null)
  const stopRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    // De achtergrondmuziek van Kenniskist zou over de eigen soundtrack heen
    // lopen; kenniskist-muziek.js biedt daar muziekDemp voor.
    let hersteld = false
    const demp = window.KennisKist?.muziekDemp
    try { demp?.(true) } catch { /* shell-tool kan ontbreken in dev */ }

    stopRef.current = startSterrenveer(canvas, { onBack })

    return () => {
      stopRef.current?.()
      stopRef.current = null
      if (!hersteld) {
        hersteld = true
        try { demp?.(false) } catch { /* zie boven */ }
      }
    }
  }, [onBack])

  return (
    <div className="sterrenveer-wrap">
      <canvas ref={canvasRef} className="sterrenveer-canvas" />
      <button type="button" className="sterrenveer-terug" onClick={onBack}>
        ← Terug
      </button>
    </div>
  )
}
