import { useEffect, useRef } from 'react'
import { startSterrenveer } from '../game/main.js'
import './sterrenveer.css'

// Dunne wrapper om het spel. Alle logica zit in src/game/; hier alleen het
// canvas, het dempen van de shell-muziek en een terugknop.
export default function SterrenveerGame({ onBack, reward = false }) {
  const canvasRef = useRef(null)
  const stopRef = useRef(null)
  // onBack komt bij elke render van de ouder als een nieuwe functie binnen (de
  // oefeningen geven een inline arrow door aan SpelBeloning). Stond die in de
  // dependencies hieronder, dan stopte React het spel en startte het opnieuw —
  // midden in een level, want de ouder hertekent ook tijdens het spelen.
  // Via een ref blijft het spel draaien en roept het altijd de nieuwste versie.
  const terug = useRef(onBack)
  useEffect(() => { terug.current = onBack }, [onBack])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    // De achtergrondmuziek van Kenniskist zou over de eigen soundtrack heen
    // lopen; kenniskist-muziek.js biedt daar muziekDemp voor.
    let hersteld = false
    const demp = window.KennisKist?.muziekDemp
    try { demp?.(true) } catch { /* shell-tool kan ontbreken in dev */ }

    stopRef.current = startSterrenveer(canvas, { onBack: () => terug.current?.(), beloning: reward })

    return () => {
      stopRef.current?.()
      stopRef.current = null
      if (!hersteld) {
        hersteld = true
        try { demp?.(false) } catch { /* zie boven */ }
      }
    }
  }, [reward])

  return (
    <div className="sterrenveer-wrap">
      <canvas ref={canvasRef} className="sterrenveer-canvas" />
      <button type="button" className="sterrenveer-terug" onClick={onBack}>
        ← Terug
      </button>
    </div>
  )
}
