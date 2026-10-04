import { useEffect, useRef } from 'react'
import { createGame } from './hillclimb/GameEngine.js'
import OrientationGate from '../OrientationGate'
import './hillclimb/hillclimb.css'
import { TerugKnop } from '../ui/index.jsx'

export default function HillClimbGame({ onBack, reward = false }) {
  const containerRef = useRef(null)
  const gameRef = useRef(null)
  // onBack komt bij elke render van de ouder als een nieuwe functie binnen (de
  // oefeningen geven een inline arrow door aan SpelBeloning). Stond die in de
  // dependencies hieronder, dan brak React het spel af en bouwde het opnieuw
  // op — midden in een level, want de ouder hertekent ook tijdens het spelen.
  // Via een ref blijft de engine staan en roept hij altijd de nieuwste versie.
  const terug = useRef(onBack)
  useEffect(() => { terug.current = onBack }, [onBack])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return
    gameRef.current = createGame(containerRef.current, { onBack: () => terug.current?.(), reward })
    return () => {
      if (gameRef.current) {
        try { gameRef.current.destroy(true) } catch { /* al opgeruimd */ }
        gameRef.current = null
      }
    }
  }, [reward])

  return (
    <div className="hc-wrapper">
      <TerugKnop onClick={onBack} style={{ zIndex: 9999 }} />
      <div ref={containerRef} className="hc-container" />
      <OrientationGate />
    </div>
  )
}
