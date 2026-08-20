import { useRef, useState, useEffect, useCallback } from 'react'
import JetpackGame from './JetpackGame'
import SterrenstroompGame from './SterrenstroompGame'
import AstroKatapultGame from './AstroKatapultGame'
import TowerDefenseGame from './TowerDefenseGame'
import FootballGame from './FootballGame'
import HeadSoccer from './HeadSoccer'
import './dictee-thema.css'

// cats: alleen gezet vanuit een weektaak-opdracht voor dictee-categorie (zie
// toolRender.jsx) — welke spellingcategorieën de leerkracht heeft aangevinkt.
// Gaat als ?cats=... mee in de iframe-src; dictee-categorie.html leest die
// query-param zelf uit om het categoriescherm over te slaan (zie aldaar).
export default function DicteeThema({ onBack, addCuruntie, addBriefgeld, thema = 8, file, cats, woorden }) {
  // Tweede slot op het dempen: de pagina in het iframe zet de muziek zelf uit
  // en bij pagehide weer aan. Blijft dat event ooit uit, dan zou de muziek
  // stil blijven staan; bij het sluiten van dit scherm dus sowieso weer aan.
  useEffect(() => () => window.KennisKistMuziek?.demp(false), [])

  const basis = file || `dictees/dictee-thema${thema}.html`
  const params = new URLSearchParams()
  if (cats?.length) params.set('cats', cats.join(','))
  // woorden: door de leerkracht ingesteld aantal woorden voor deze opdracht.
  // Zonder deze parameter draait het dictee gewoon de hele lijst af.
  if (woorden > 0) params.set('woorden', String(woorden))
  const query = params.toString()
  const src = query ? `${basis}?${query}` : basis
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
          title={file ? 'Spelling per categorie' : `Dictee thema ${thema}`}
        />
      </div>
      {overlay}
    </>
  )
}
