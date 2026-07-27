import { useState, useEffect, useRef, useCallback } from 'react'
import { THEMAS } from './begrijpendLezenData'
import JetpackGame from './JetpackGame'
import SterrenstroompGame from './SterrenstroompGame'
import AstroKatapultGame from './AstroKatapultGame'
import TowerDefenseGame from './TowerDefenseGame'
import FootballGame from './FootballGame'
import HeadSoccer from './HeadSoccer'
import MenuScene from '../MenuScenes'
import './dictee-thema.css'

// startLes: alleen gezet vanuit een weektaak-opdracht (toolRender.jsx) — het
// lesnummer (1-4) binnen het enige thema "reisrondewereld". Springt direct
// naar die les, de thema/les-kiesschermen overslaand.
export default function BegrijpendLezen({ onBack, addBriefgeld, addCuruntie, startLes }) {
  const [thema, setThema] = useState(() => startLes ? THEMAS[0] : null)
  const [les, setLes]     = useState(() => startLes ? THEMAS[0].lessen[startLes - 1] : null)
  const frameRef = useRef(null)
  const wavesRef = useRef(0)
  const [game, setGame] = useState(null)
  const [tdMounted, setTdMounted] = useState(false)

  const resume = useCallback(() => {
    wavesRef.current = 0
    frameRef.current?.contentWindow?.postMessage({ type: 'begrijpend-resume' }, '*')
    setGame(null)
  }, [])

  // Elk goed antwoord levert 10 briefgeld op + spelletje na elke 5 goede antwoorden
  useEffect(() => {
    function onMsg(e) {
      if (e.data?.type === 'begrijpend-correct')  { addBriefgeld?.(e.data.amount || 10); return }
      if (e.data?.type === 'begrijpend-game')      { if (e.data.game === 'towerdefense') setTdMounted(true); setGame(e.data.game); return }
      if (e.data?.type === 'jetpack-gameover')       { resume(); return }
      if (e.data?.type === 'spacerunner-gameover')   { resume(); return }
      if (e.data?.type === 'astrokatapult-leveldone') { addBriefgeld?.(50); resume(); return }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [addBriefgeld, resume])

  function onWaveDone() {
    wavesRef.current += 1
    if (wavesRef.current >= 2) { addBriefgeld?.(50); resume() }
  }

  const overlay = (
    <>
      {game === 'jetpack'       && <JetpackGame        onBack={resume} addCuruntie={addCuruntie} />}
      {game === 'sterrenstroom' && <SterrenstroompGame onBack={resume} />}
      {game === 'astrokatapult' && <AstroKatapultGame  onBack={resume} reward />}
      {tdMounted && <TowerDefenseGame visible={game === 'towerdefense'} onBack={resume} onRoundDone={onWaveDone} />}
      {game === 'football'      && <FootballGame       onBack={resume} addCuruntie={addCuruntie} noQuiz onMatchEnd={() => addBriefgeld?.(50)} />}
      {game === 'headsoccer'    && <HeadSoccer reward   onBack={() => { addBriefgeld?.(50); resume() }} addCuruntie={addCuruntie} />}
    </>
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
