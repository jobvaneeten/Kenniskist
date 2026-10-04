import { useEffect, useRef } from 'react'
import { createGame } from './towerdefense/GameEngine.js'
import OrientationGate from '../OrientationGate'
import './towerdefense.css'
import { TerugKnop } from '../ui/index.jsx'

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
      <TerugKnop onClick={onBack} style={{ zIndex: 9999 }} />
      <div ref={containerRef} className="td-container" />
      {visible && <OrientationGate />}
    </div>
  )
}
