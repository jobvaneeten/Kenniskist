import { useEffect, useRef } from 'react'
import { createGame } from './hillclimb/GameEngine.js'
import OrientationGate from '../OrientationGate'
import './hillclimb/hillclimb.css'

export default function HillClimbGame({ onBack, reward = false }) {
  const containerRef = useRef(null)
  const gameRef = useRef(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return
    gameRef.current = createGame(containerRef.current, { onBack, reward })
    return () => {
      if (gameRef.current) {
        try { gameRef.current.destroy(true) } catch { /* al opgeruimd */ }
        gameRef.current = null
      }
    }
  }, [onBack, reward])

  return (
    <div className="hc-wrapper">
      <button
        onClick={onBack}
        style={{
          position: 'fixed', top: 14, left: 14, zIndex: 9999,
          background: 'rgba(0,0,0,0.65)', color: '#fff',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 10, padding: '7px 16px',
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', backdropFilter: 'blur(6px)',
        }}
      >
        ← Menu
      </button>
      <div ref={containerRef} className="hc-container" />
      <OrientationGate />
    </div>
  )
}
