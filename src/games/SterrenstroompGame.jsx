import { useEffect, useRef } from 'react'

export default function SterrenstroompGame({ onBack }) {
  // Via een ref, zodat de listener niet opnieuw wordt gezet elke keer dat de
  // ouder hertekent en een nieuwe onBack doorgeeft (zie HillClimbGame.jsx).
  const terug = useRef(onBack)
  useEffect(() => { terug.current = onBack }, [onBack])

  // Het spel zelf heeft op het game-over-scherm een "terug naar menu"-knop; die
  // zit in de iframe en kan onBack niet rechtstreeks aanroepen.
  useEffect(() => {
    const onBericht = (e) => {
      // De iframe komt van onze eigen site; berichten van elders negeren we.
      if (e.origin !== window.location.origin) return
      if (e.data?.kenniskist === 'terug-naar-menu') terug.current?.()
    }
    window.addEventListener('message', onBericht)
    return () => window.removeEventListener('message', onBericht)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000' }}>
      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: 12, left: 12, zIndex: 200,
          background: 'rgba(0,0,0,0.75)', color: '#fff',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 8, padding: '6px 16px', cursor: 'pointer',
          fontSize: 14, fontFamily: 'inherit',
        }}
      >
        ← Menu
      </button>
      <iframe
        src="/sterrenstroom/"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Sterrenstroom"
      />
    </div>
  )
}
