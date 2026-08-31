import { useEffect, useRef, useState, useCallback } from 'react'
import SpelBeloning from './SpelBeloning'

export default function EngelsOefenen({ onBack, addBriefgeld, addCuruntie }) {
  // Tweede slot op het dempen: de pagina in het iframe zet de muziek zelf uit
  // en bij pagehide weer aan. Blijft dat event ooit uit, dan zou de muziek
  // stil blijven staan; bij het sluiten van dit scherm dus sowieso weer aan.
  useEffect(() => () => window.KennisKistMuziek?.demp(false), [])

  const frameRef = useRef(null)
  const [beloning, setBeloning] = useState(false)

  const resume = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: 'engels-resume' }, '*')
    setBeloning(false)
  }, [])

  // Na 5 goede antwoorden vraagt de quiz om een spelletje; de keuze en de
  // "een potje"-regel zitten in SpelBeloning, gedeeld met de andere oefeningen.
  useEffect(() => {
    function onMsg(e) { if (e.data?.type === 'engels-game') setBeloning(true) }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  // Engelse woordjes (blok 7, 8 & 9). Volledige quiz draait in /engels/,
  // gestyld in het Kenniskist-thema. Voortgang is per sessie (geen opslag nodig).
  return (
    <>
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#0d0d1a' }}>
      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: 12, left: 12, zIndex: 200,
          background: 'rgba(13,13,26,0.82)', color: '#fff',
          border: '1px solid rgba(255,255,255,0.22)',
          borderRadius: 12, padding: '8px 16px', cursor: 'pointer',
          fontSize: 14, fontFamily: "'Nunito', sans-serif", fontWeight: 800,
        }}
      >
        ← Menu
      </button>
      <iframe
        ref={frameRef}
        src="/engels/"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Engelse woordjes — Song 7, 8 & 9"
      />
    </div>
    {beloning && (
      <SpelBeloning
        title="5 goede antwoorden!"
        geld={50}
        addCuruntie={addCuruntie}
        onDone={() => { addBriefgeld?.(50); resume() }}
      />
    )}
    </>
  )
}
