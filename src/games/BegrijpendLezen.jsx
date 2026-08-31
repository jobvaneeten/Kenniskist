import { useState, useEffect, useRef, useCallback } from 'react'
import { THEMAS } from './begrijpendLezenData'
import SpelBeloning from './SpelBeloning'
import MenuScene from '../MenuScenes'
import './dictee-thema.css'

// startLes: alleen gezet vanuit een weektaak-opdracht (toolRender.jsx) — het
// lesnummer (1-4) binnen het enige thema "reisrondewereld". Springt direct
// naar die les, de thema/les-kiesschermen overslaand.
export default function BegrijpendLezen({ onBack, addBriefgeld, addCuruntie, startLes }) {
  const [thema, setThema] = useState(() => startLes ? THEMAS[0] : null)
  const [les, setLes]     = useState(() => startLes ? THEMAS[0].lessen[startLes - 1] : null)
  const frameRef = useRef(null)
  const [beloning, setBeloning] = useState(false)

  const resume = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: 'begrijpend-resume' }, '*')
    setBeloning(false)
  }, [])

  // Elk goed antwoord levert 10 briefgeld op; na 5 goede antwoorden vraagt de
  // les om een spelletje. De keuze en de "één potje"-regel zitten in
  // SpelBeloning, gedeeld met alle andere oefeningen.
  useEffect(() => {
    function onMsg(e) {
      if (e.data?.type === 'begrijpend-correct') { addBriefgeld?.(e.data.amount || 10); return }
      if (e.data?.type === 'begrijpend-game')     { setBeloning(true) }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [addBriefgeld])

  // Buiten .game-screen zodat position:fixed niet overschreven wordt door de
  // `.game-screen > * { position: relative }` regel.
  const overlay = beloning && (
    <SpelBeloning
      title="5 goede antwoorden!"
      geld={50}
      addCuruntie={addCuruntie}
      onDone={() => { addBriefgeld?.(50); resume() }}
    />
  )

  if (thema && les) {
    return (
      <>
        <div className="game-screen dictee-screen">
          <button className="back-btn" onClick={() => setLes(null)}>← Terug</button>
          <iframe
            ref={frameRef}
            className="dictee-frame"
            src={`${import.meta.env.BASE_URL}begrijpend-lezen/${les.file}`}
            title={les.naam}
          />
        </div>
        {overlay}
      </>
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
              <MenuScene name="begrijpend" />
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
      <div className="mode-grid bl-thema-grid">
        {THEMAS.map(t => (
          <button
            key={t.key}
            className="mode-card bl-thema-card"
            onClick={() => setThema(t)}
            style={{ '--bl-kleur': t.kleur }}
          >
            <MenuScene name="begrijpend" />
            <span className="mode-name">{t.emoji} {t.naam}</span>
            <span className="mode-desc">{t.lessen.length} lessen</span>
            <span className="bl-thema-go">Start →</span>
          </button>
        ))}
      </div>
    </div>
  )
}
