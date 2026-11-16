import { useEffect, useState } from 'react'
import './online.css'

// Wat de leerling ziet tijdens het verbinden met de spelserver (zie
// verbinding.js): gewoon "Verbinden…", of uitleg dat de server wakker wordt.
export function VerbindStatus({ status }) {
  if (!status) return null
  const wekken = status === 'wekken'
  return (
    <div className={`on-verbind${wekken ? ' wekken' : ''}`} role="status">
      <span className="on-spinner" aria-hidden="true" />
      <span>
        {wekken
          ? <><strong>De spelserver wordt wakker.</strong> Dat duurt soms een halve minuut. Even geduld!</>
          : 'Verbinden…'}
      </span>
    </div>
  )
}

// Over het spel heen: de wifi viel even weg. De SDK probeert zelf opnieuw te
// verbinden (de server houdt je plek 30 seconden vast). Lukt dat niet, dan
// een melding met een knop terug.
export default function VerbindingsMelding({ room, onTerug }) {
  const [stand, setStand] = useState('ok')   // ok | kwijt | weg

  useEffect(() => {
    if (!room?.onDrop) return   // solo-oefenpotje: geen server
    const drop = () => setStand('kwijt')
    const terug = () => setStand('ok')
    const weg = (code) => { if (code !== 1000 && code !== 4000) setStand('weg') }
    room.onDrop(drop); room.onReconnect(terug); room.onLeave(weg)
    return () => { room.onDrop.remove(drop); room.onReconnect.remove(terug); room.onLeave.remove(weg) }
  }, [room])

  if (stand === 'ok') return null
  return (
    <div className="on-melding-scrim">
      <div className="on-melding" role="alert">
        {stand === 'kwijt' ? (
          <>
            <span className="on-spinner groot" aria-hidden="true" />
            <h2>Verbinding kwijt</h2>
            <p>We proberen je weer in het potje te krijgen…</p>
          </>
        ) : (
          <>
            <h2>Verbinding verbroken</h2>
            <p>Het lukte niet om terug in het potje te komen. Kijk of je internet hebt.</p>
            <button type="button" className="on-knop" onClick={onTerug}>Terug</button>
          </>
        )}
      </div>
    </div>
  )
}
