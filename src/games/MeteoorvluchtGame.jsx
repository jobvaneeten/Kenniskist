import { useEffect, useRef } from 'react'

// Zelfde opzet als DoodleSprongGame: het spel staat als losse pagina in
// public/meteoorvlucht/ en tekent zelf zijn "← Menu" knop (via ?terug=1).
export default function MeteoorvluchtGame({ onBack }) {
  const terug = useRef(onBack)
  useEffect(() => { terug.current = onBack }, [onBack])

  useEffect(() => {
    const h = (e) => { if (e.data?.type === 'meteoorvlucht-terug') terug.current?.() }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#05060f' }}>
      <iframe
        src="/meteoorvlucht/?terug=1"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Meteoorvlucht"
      />
    </div>
  )
}
