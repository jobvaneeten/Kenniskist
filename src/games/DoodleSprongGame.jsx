import { useEffect, useRef } from 'react'

// Het spel tekent zijn eigen "← Menu" knop (via ?terug=1) zodat die niet
// achter de HUD verdwijnt en meeschaalt met de rest van de spel-UI; hij meldt
// zich terug via postMessage. In de beloningsmodus (SpelBeloning) wordt de
// parameter niet meegegeven — daar staat al een eigen "← Klaar" knop.
export default function DoodleSprongGame({ onBack }) {
  // Via een ref, zodat de listener niet opnieuw wordt gezet elke keer dat de
  // ouder hertekent en een nieuwe onBack doorgeeft (zie HillClimbGame.jsx).
  const terug = useRef(onBack)
  useEffect(() => { terug.current = onBack }, [onBack])

  useEffect(() => {
    const h = (e) => { if (e.data?.type === 'doodlesprong-terug') terug.current?.() }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#05060f' }}>
      <iframe
        src="/doodlesprong/?terug=1"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Doodle Sprong"
      />
    </div>
  )
}
