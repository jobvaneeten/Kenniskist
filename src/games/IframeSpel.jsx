import { useEffect, useRef } from 'react'

// Los HTML-spel uit public/<map>/ als vrij spel. Met ?terug=1 tekent het spel
// zijn eigen menuknop en meldt het zich terug via postMessage ({ type: terugType });
// zonder die parameter is het een beloningsspel (zie SpelBeloning).
export default function IframeSpel({ src, titel, terugType, achtergrond = '#05060f', onBack }) {
  // Via een ref, zodat de listener niet opnieuw wordt gezet elke keer dat de
  // ouder hertekent en een nieuwe onBack doorgeeft (zie HillClimbGame.jsx).
  const terug = useRef(onBack)
  useEffect(() => { terug.current = onBack }, [onBack])

  useEffect(() => {
    const h = (e) => { if (e.data?.type === terugType) terug.current?.() }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [terugType])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: achtergrond }}>
      <iframe
        src={`${src}?terug=1`}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title={titel}
      />
    </div>
  )
}
