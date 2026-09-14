import { useEffect, useState } from 'react'

// Nieuwe versie live, tab nog open. Kinderen laten hun iPad dagen achter elkaar
// op Kenniskist staan; zonder dit blijven ze op de code draaien die ze bij het
// openen hebben binnengehaald en komt een fix nooit bij ze aan.
//
// Hoe: elke build krijgt een eigen id (zie vite.config.js — __BUILD_ID__ zit in
// de bundel, versie.json staat ernaast op de server). Verschillen die twee, dan
// draait dit tabblad een oude versie.
//
// Wat er dan gebeurt:
//   • een balkje onderin met een knop om nu te vernieuwen;
//   • en zodra het tabblad een halve minuut weg is geweest (iPad op slot, ander
//     tabblad) herlaadt de pagina zichzelf stilletjes bij terugkomst. Dat is het
//     enige moment waarop je zeker weet dat je niemand midden in een spel of
//     oefening stoort.
const INTERVAL_MS = 5 * 60 * 1000
const STIL_HERLADEN_NA_MS = 30 * 1000

export function useNieuweVersie() {
  const [nieuw, setNieuw] = useState(false)

  useEffect(() => {
    let actief = true
    let wegSinds = 0

    const kijk = async () => {
      if (!actief || nieuw || document.visibilityState !== 'visible') return
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}versie.json`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (actief && data?.build && data.build !== __BUILD_ID__) setNieuw(true)
      } catch { /* offline of even geen net — volgende keer weer */ }
    }

    const zichtbaarheid = () => {
      if (document.visibilityState === 'hidden') { wegSinds = Date.now(); return }
      const lang = wegSinds && Date.now() - wegSinds > STIL_HERLADEN_NA_MS
      wegSinds = 0
      if (nieuw && lang) { location.reload(); return }
      kijk()
    }

    kijk()
    const id = setInterval(kijk, INTERVAL_MS)
    document.addEventListener('visibilitychange', zichtbaarheid)
    return () => {
      actief = false
      clearInterval(id)
      document.removeEventListener('visibilitychange', zichtbaarheid)
    }
  }, [nieuw])

  return nieuw
}

export default function VersieBanner() {
  const nieuw = useNieuweVersie()
  if (!nieuw) return null

  return (
    <div
      role="status"
      style={{
        position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 9999,
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'center',
        padding: '12px 18px', borderRadius: 16,
        background: 'rgba(16, 23, 42, 0.92)', border: '1.5px solid rgba(6, 214, 160, 0.55)',
        boxShadow: '0 18px 40px -16px #000', backdropFilter: 'blur(8px)',
        fontFamily: "'Nunito', system-ui, sans-serif", color: '#fff',
      }}
    >
      <span style={{ fontWeight: 700 }}>✨ Er is een nieuwe versie van Kenniskist</span>
      <button
        onClick={() => location.reload()}
        style={{
          padding: '9px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #06d6a0, #049f78)', color: '#04241c',
          fontFamily: 'inherit', fontWeight: 800, fontSize: '1rem',
        }}
      >Nu vernieuwen</button>
    </div>
  )
}
