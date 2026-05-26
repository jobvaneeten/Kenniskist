import { useEffect, useRef } from 'react'
import { createGame } from './towerdefense/GameEngine.js'
import './towerdefense.css'

export default function TowerDefenseGame({ onBack }) {
  const containerRef = useRef(null)
  const gameRef      = useRef(null)

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
      <div ref={containerRef} className="td-container" />
    </div>
  )
}
