import { useEffect, useState } from 'react'
import { useSessie } from './lib/sessie.jsx'
import { playTierSound } from './lootboxSound.js'
import WeekOverzicht from './WeekOverzicht.jsx'
import { Knop, TerugKnop, Icoon } from './ui/index.jsx'
import './game.css'
import './mijnweek.css'

// Leerlingscherm "Mijn week": het weekoverzicht (WeekOverzicht.jsx), plus een
// feestmoment voor een doel dat behaald is en nog niet gevierd (één keer per
// doel, onthouden op dit apparaat).

const GEVIERD = 'kk_gevierde_doelen'
function leesGevierd() {
  try { return new Set(JSON.parse(localStorage.getItem(GEVIERD) ?? '[]')) } catch { return new Set() }
}
function bewaarGevierd(set) {
  try { localStorage.setItem(GEVIERD, JSON.stringify([...set])) } catch { /* privé-venster */ }
}

// Confetti: één keer bij het laden van de module, zodat de render puur blijft.
const SNIPPERS = Array.from({ length: 60 }, (_, i) => ({
  left: Math.random() * 100,
  vertraging: Math.random() * 1.2,
  duur: 2.4 + Math.random() * 1.8,
  kleur: ['var(--kk-gold)', 'var(--kk-pink)', 'var(--kk-cyan)', 'var(--kk-success)', 'var(--kk-primary-hi)'][i % 5],
  draai: Math.random() * 360,
}))

// Feestmoment: grote trofee, confetti en een fanfare.
function Feest({ doelen, onKlaar }) {
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
        <Knop variant="primair" onClick={onKlaar}>Yes!</Knop>
      </div>
    </div>
  )
}

export default function MijnWeek({ onBack }) {
  const { profiel } = useSessie()
  const [feest, setFeest] = useState([])

  const naLaden = (data) => {
    const gevierd = leesGevierd()
    const nieuw = data.behaaldeDoelen.filter(d => !gevierd.has(d.opdrachtId))
    if (nieuw.length) setFeest(nieuw)
  }

  const klaarMetFeest = () => {
    const gevierd = leesGevierd()
    feest.forEach(d => gevierd.add(d.opdrachtId))
    bewaarGevierd(gevierd)
    setFeest([])
  }

  return (
    <div className="game-screen mw">
      <TerugKnop onClick={onBack} />
      <div className="game-header" style={{ '--kk-accent': 'var(--kk-gold)' }}>
        <span className="game-header-icon"><Icoon naam="grafiek" /></span>
        <h1 className="game-header-title">Mijn week</h1>
        <p className="game-header-sub">Kijk wat je allemaal gedaan hebt</p>
      </div>

      <WeekOverzicht leerlingId={profiel?.id} onGeladen={naLaden} />

      {feest.length > 0 && <Feest doelen={feest} onKlaar={klaarMetFeest} />}
    </div>
  )
}
