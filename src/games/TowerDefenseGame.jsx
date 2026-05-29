import { useEffect, useRef } from 'react'
import { createGame } from './towerdefense/GameEngine.js'
import './towerdefense.css'

export default function TowerDefenseGame({ onBack }) {
  const containerRef = useRef(null)
  const gameRef      = useRef(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return
    gameRef.current = createGame(containerRef.current, { onBack })
    return () => {
      if (gameRef.current) {
        try { gameRef.current.destroy(true) } catch {}
        gameRef.current = null
      }
    }
  }, [])

  return (
    <div className="td-wrapper">
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
      <div ref={containerRef} className="td-container" />
    </div>
  )
}
