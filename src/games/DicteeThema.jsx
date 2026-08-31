import { useRef, useState, useEffect, useCallback } from 'react'
import SpelBeloning from './SpelBeloning'
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
  const [beloning, setBeloning] = useState(false)

  const resume = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: 'dictee-resume' }, '*')
    setBeloning(false)
  }, [])

  // Het dictee in het iframe vraagt na 5 goede woorden om een spelletje; de
  // keuze zelf (en de reward-modus per spel) zit in SpelBeloning, zodat elke
  // oefening exact dezelfde spellen en dezelfde "één potje"-regel gebruikt.
  useEffect(() => {
    function onMsg(e) {
      if (e.data?.type === 'dictee-game') setBeloning(true)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

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
      {/* Buiten .game-screen zodat position:fixed niet overschreven wordt
          door de `.game-screen > * { position: relative }` regel. */}
      {beloning && (
        <SpelBeloning
          title="5 woorden goed!"
          geld={50}
          addCuruntie={addCuruntie}
          onDone={() => { addBriefgeld?.(50); resume() }}
        />
      )}
    </>
  )
}
