import { useEffect, useRef } from 'react'

// Diepgravers draait als los HTML-spel in public/graven/. Met ?terug=1 tekent
// het spel zijn eigen menuknop en meldt het zich terug via postMessage; zonder
// die parameter is het een beloningsspel en krijgt het kind 3 duiken (zie
// SpelBeloning en docs/graafspel/PROMPT.md).
export default function GraafGame({ onBack }) {
  // Via een ref, zodat de listener niet opnieuw wordt gezet elke keer dat de
  // ouder hertekent en een nieuwe onBack doorgeeft (zie HillClimbGame.jsx).
  const terug = useRef(onBack)
  useEffect(() => { terug.current = onBack }, [onBack])

  useEffect(() => {
    const h = (e) => { if (e.data?.type === 'graven-terug') terug.current?.() }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#05060f' }}>
      <iframe
        src="/graven/?terug=1"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Diepgravers"
      />
    </div>
  )
}
