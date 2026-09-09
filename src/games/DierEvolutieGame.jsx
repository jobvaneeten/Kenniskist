import { useEffect, useRef } from 'react'

// Het spel tekent zijn eigen "← Menu" knop (via ?terug=1) zodat die altijd
// zichtbaar is en meeschaalt met de rest van de spel-UI; hij meldt zich terug
// via postMessage. In de beloningsmodus (SpelBeloning) wordt de parameter niet
// meegegeven — daar staat al een eigen "← Klaar" knop.
export default function DierEvolutieGame({ onBack }) {
  // Via een ref, zodat de listener niet opnieuw wordt gezet elke keer dat de
  // ouder hertekent en een nieuwe onBack doorgeeft (zie HillClimbGame.jsx).
  const terug = useRef(onBack)
  useEffect(() => { terug.current = onBack }, [onBack])

  useEffect(() => {
    const h = (e) => { if (e.data?.type === 'evolutie-terug') terug.current?.() }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#06070f' }}>
      <iframe
        src="/evolutie/?terug=1"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Dier Evolutie"
      />
    </div>
  )
}
