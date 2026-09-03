import { useEffect } from 'react'

// Fruitsabel draait als los HTML-spel in public/fruitsabel/. Met ?terug=1
// tekent het spel zijn eigen menuknop en meldt het zich terug via postMessage;
// zonder die parameter is het een beloningsspel (zie SpelBeloning).
export default function FruitsabelGame({ onBack }) {
  useEffect(() => {
    const h = (e) => { if (e.data?.type === 'fruitsabel-terug') onBack?.() }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [onBack])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#140d1c' }}>
      <iframe
        src="/fruitsabel/?terug=1"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Fruitsabel"
      />
    </div>
  )
}
