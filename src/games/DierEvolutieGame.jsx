import { useEffect } from 'react'

// Het spel tekent zijn eigen "← Menu" knop (via ?terug=1) zodat die altijd
// zichtbaar is en meeschaalt met de rest van de spel-UI; hij meldt zich terug
// via postMessage. In de beloningsmodus (SpelBeloning) wordt de parameter niet
// meegegeven — daar staat al een eigen "← Klaar" knop.
export default function DierEvolutieGame({ onBack }) {
  useEffect(() => {
    const h = (e) => { if (e.data?.type === 'evolutie-terug') onBack?.() }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [onBack])

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
