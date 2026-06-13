import { useEffect, useRef } from 'react'
import { createGame } from './towerdefense/GameEngine.js'
import OrientationGate from '../OrientationGate'
import './towerdefense.css'

export default function TowerDefenseGame({ onBack, onRoundDone, visible = true }) {
  const containerRef = useRef(null)
  const gameRef      = useRef(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Pause/resume als het venster wordt verborgen (visible prop)
  useEffect(() => {
    if (!gameRef.current) return
    if (visible) gameRef.current.resumeScenes?.()
    else         gameRef.current.pauseScenes?.()
  }, [visible])

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return
    gameRef.current = createGame(containerRef.current, { onBack, onRoundDone })
    return () => {
      if (gameRef.current) {
        try { gameRef.current.destroy(true) } catch {}
        gameRef.current = null
      }
    }
  }, [])

  return (
    <div className="td-wrapper" style={{ display: visible ? 'block' : 'none' }}>
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
      {visible && <OrientationGate />}
    </div>
  )
}
