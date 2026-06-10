import { useState, useEffect } from 'react'
import FootballGame from './FootballGame'
import SterrenstroompGame from './SterrenstroompGame'
import TowerDefenseGame from './TowerDefenseGame'
import './spel-beloning.css'

// Jetpack draait in een iframe; we gaan automatisch verder na game-over,
// of via de ← Klaar knop.
function JetpackEmbed({ onDone }) {
  useEffect(() => {
    const h = (e) => { if (e.data?.type === 'jetpack-gameover') setTimeout(onDone, 2200) }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [onDone])
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000', display: 'flex', flexDirection: 'column' }}>
      <button className="sb-game-back" onClick={onDone}>← Klaar</button>
      <iframe src="/jetpack/index.html" title="Jetpack" allow="autoplay" style={{ flex: 1, border: 'none' }} />
      <div style={{ textAlign: 'center', color: '#aaa', padding: '8px', fontSize: '0.85rem' }}>Je gaat automatisch verder na het spel ✈️</div>
    </div>
  )
}

const SPELLEN = [
  { key: 'jetpack', emoji: '🚀', name: 'Jetpack',       desc: 'Vlieg zo ver mogelijk!' },
  { key: 'voetbal', emoji: '⚽', name: '1v1 Voetbal',    desc: 'Jij tegen de computer' },
  { key: 'space',   emoji: '🛸', name: 'Spacerunner',    desc: 'Vlieg door de ruimte!' },
  { key: 'tower',   emoji: '🏰', name: 'Tower Defense',  desc: 'Verdedig je toren!' },
]

export default function SpelBeloning({ title, sub, geld, addCuruntie, onDone }) {
  const [picked, setPicked] = useState(null)

  if (picked === 'jetpack') return <JetpackEmbed onDone={onDone} />
  if (picked === 'voetbal') return <FootballGame noQuiz twoPlayer={false} onBack={onDone} addCuruntie={addCuruntie} />
  if (picked === 'space')   return <SterrenstroompGame onBack={onDone} />
  if (picked === 'tower')   return <TowerDefenseGame onBack={onDone} />

  return (
    <div className="sb-screen">
      <div className="sb-star">🎉</div>
      <h2 className="sb-title">{title || 'Goed gedaan!'}</h2>
      {sub && <p className="sb-line">{sub}</p>}
      {geld != null && <p className="sb-geld">+{geld} briefgeld verdiend! 💵</p>}
      <p className="sb-sub">Kies een spel als beloning</p>
      <div className="sb-grid">
        {SPELLEN.map(g => (
          <button key={g.key} className="sb-card" onClick={() => setPicked(g.key)}>
            <span className="sb-emoji">{g.emoji}</span>
            <span className="sb-name">{g.name}</span>
            <span className="sb-desc">{g.desc}</span>
          </button>
        ))}
      </div>
      <button className="sb-skip" onClick={onDone}>Sla over →</button>
    </div>
  )
}
