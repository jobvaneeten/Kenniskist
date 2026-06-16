import { useState, useEffect } from 'react'
import { THEMAS } from './begrijpendLezenData'
import './dictee-thema.css'

export default function BegrijpendLezen({ onBack, addBriefgeld, addCuruntie }) {
  const [thema, setThema] = useState(null)
  const [les, setLes]     = useState(null)

  // Elk goed antwoord in de oefening (iframe) levert 10 briefgeld op
  useEffect(() => {
    function onMsg(e) {
      if (e.data?.type === 'begrijpend-correct') addBriefgeld?.(e.data.amount || 10)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [addBriefgeld])

  if (thema && les) {
    return (
      <div className="game-screen dictee-screen">
        <button className="back-btn" onClick={() => setLes(null)}>← Terug</button>
        <iframe
          className="dictee-frame"
          src={`${import.meta.env.BASE_URL}begrijpend-lezen/${les.file}`}
          title={les.naam}
        />
      </div>
    )
  }

  if (thema) {
    return (
      <div className="game-screen game-screen-center">
        <button className="back-btn" onClick={() => setThema(null)}>← Menu</button>
        <div className="game-header">
          <span className="game-header-icon" style={{ color: thema.kleur }}>{thema.emoji}</span>
          <h1 className="game-header-title">{thema.naam}</h1>
          <p className="game-header-sub">Kies een les</p>
        </div>
        <div className="blok-grid">
          {thema.lessen.map(l => (
            <button
              key={l.key}
              className={`blok-card${l.klaar ? ' ready' : ''}`}
              onClick={() => l.klaar && setLes(l)}
              disabled={!l.klaar}
            >
              <span className="blok-num">{l.naam}</span>
              <span className="blok-tag">{l.klaar ? '✅ Klaar' : '🚧 binnenkort'}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="game-screen game-screen-center">
      <button className="back-btn" onClick={onBack}>← Menu</button>
      <div className="game-header">
        <span className="game-header-icon" style={{ color: '#06D6A0' }}>📚</span>
        <h1 className="game-header-title">Begrijpend Lezen</h1>
        <p className="game-header-sub">Kies een thema</p>
      </div>
      <div className="mode-grid">
        {THEMAS.map(t => (
          <button key={t.key} className="mode-card" onClick={() => setThema(t)}>
            <span className="mode-name">{t.emoji} {t.naam}</span>
            <span className="mode-desc">{t.lessen.length} lessen</span>
          </button>
        ))}
      </div>
    </div>
  )
}
