import { useEffect } from 'react'

// Stuiterballen draait als los HTML-spel in public/stuiterballen/. Met ?terug=1
// tekent het spel zijn eigen menuknop en meldt het zich terug via postMessage;
// zonder die parameter is het een beloningsspel (zie SpelBeloning).
export default function StuiterballenGame({ onBack }) {
  useEffect(() => {
    const h = (e) => { if (e.data?.type === 'stuiterballen-terug') onBack?.() }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [onBack])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#070a16' }}>
      <iframe
        src="/stuiterballen/?terug=1"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Stuiterballen"
      />
    </div>
  )
}
