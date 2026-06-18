import { useRef, useState, useEffect, useCallback } from 'react'
import JetpackGame from './JetpackGame'
import SterrenstroompGame from './SterrenstroompGame'
import AstroKatapultGame from './AstroKatapultGame'
import TowerDefenseGame from './TowerDefenseGame'
import FootballGame from './FootballGame'
import HeadSoccer from './HeadSoccer'
import './dictee-thema.css'

export default function DicteeThema({ onBack, addCuruntie, addBriefgeld, thema = 8, file }) {
  const src = file || `taalactief5/dictee-thema${thema}.html`
  const frameRef   = useRef(null)
  const wavesRef   = useRef(0)
  const [game, setGame]       = useState(null)
  const [tdMounted, setTdMounted] = useState(false)  // eenmaal gemount, nooit meer unmount

  const resume = useCallback(() => {
    wavesRef.current = 0
    frameRef.current?.contentWindow?.postMessage({ type: 'dictee-resume' }, '*')
    setGame(null)
  }, [])

  useEffect(() => {
    function onMsg(e) {
      if (e.data?.type === 'dictee-game')           { if (e.data.game === 'towerdefense') setTdMounted(true); setGame(e.data.game); return }
      if (e.data?.type === 'jetpack-gameover')       { resume(); return }
      if (e.data?.type === 'spacerunner-gameover')   { resume(); return }
      if (e.data?.type === 'astrokatapult-leveldone') { addBriefgeld?.(50); resume(); return }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [resume])

  function onWaveDone() {
    wavesRef.current += 1
    if (wavesRef.current >= 2) { addBriefgeld?.(50); resume() }
  }

  // Game-overlays staan BUITEN .game-screen zodat position:fixed niet
  // overschreven wordt door de `.game-screen > * { position: relative }` regel.
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

  return (
    <>
      <div className="game-screen dictee-screen">
        <button className="back-btn" onClick={onBack}>← Terug</button>
        <iframe
          ref={frameRef}
          className="dictee-frame"
          src={`${import.meta.env.BASE_URL}${src}`}
          title={file ? 'Spelling per categorie' : `Taal Actief 5 — Dictee thema ${thema}`}
        />
      </div>
      {overlay}
    </>
  )
}
