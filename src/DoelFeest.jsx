import { useEffect } from 'react'
import { playTierSound } from './lootboxSound.js'
import { Knop, Icoon } from './ui/index.jsx'
import './mijnweek.css'

// Feestscherm als een doel behaald is: trofee, confetti en een fanfare.
// Gebruikt door Mijn week en tijdens het oefenen (Weektaak.jsx).
// doelen: [{ sleutel, opdrachtId, titel }]

// Confetti: één keer bij het laden van de module, zodat de render puur blijft.
const SNIPPERS = Array.from({ length: 60 }, (_, i) => ({
  left: Math.random() * 100,
  vertraging: Math.random() * 1.2,
  duur: 2.4 + Math.random() * 1.8,
  kleur: ['var(--kk-gold)', 'var(--kk-pink)', 'var(--kk-cyan)', 'var(--kk-success)', 'var(--kk-primary-hi)'][i % 5],
  draai: Math.random() * 360,
}))

// Feestmoment: grote trofee, confetti en een fanfare.
export default function DoelFeest({ doelen, onKlaar, knopTekst = 'Yes!' }) {
  useEffect(() => { playTierSound('legendary') }, [])
  return (
    <div className="mw-feest" role="dialog" aria-modal="true" aria-label="Doel behaald">
      <div className="mw-confetti" aria-hidden="true">
        {SNIPPERS.map((s, i) => (
          <span key={i} style={{ left: `${s.left}%`, background: s.kleur, animationDelay: `${s.vertraging}s`, animationDuration: `${s.duur}s`, '--draai': `${s.draai}deg` }} />
        ))}
      </div>
      <div className="mw-feest-kaart">
        <span className="mw-feest-trofee"><Icoon naam="trofee" /></span>
        <h2>{doelen.length === 1 ? 'Doel behaald!' : `${doelen.length} doelen behaald!`}</h2>
        <ul className="mw-feest-lijst">
          {doelen.map(d => <li key={d.sleutel}><Icoon naam="ster" />{d.titel}</li>)}
        </ul>
        <p className="mw-feest-tekst">Je had 80% of meer goed van je laatste 20 opgaven. Knap gedaan!</p>
        <Knop variant="primair" onClick={onKlaar}>{knopTekst}</Knop>
      </div>
    </div>
  )
}
