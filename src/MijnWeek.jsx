import { useState } from 'react'
import { useSessie } from './lib/sessie.jsx'
import WeekOverzicht from './WeekOverzicht.jsx'
import DoelFeest from './DoelFeest.jsx'
import { leesGevierd, markeerGevierd } from './lib/gevierd.js'
import { TerugKnop, Icoon } from './ui/index.jsx'
import './game.css'
import './mijnweek.css'

// Leerlingscherm "Mijn week": het weekoverzicht (WeekOverzicht.jsx), plus een
// feestmoment voor een doel dat behaald is en nog niet gevierd (één keer per
// doel, onthouden op dit apparaat).

export default function MijnWeek({ onBack }) {
  const { profiel } = useSessie()
  const [feest, setFeest] = useState([])

  const naLaden = (data) => {
    const gevierd = leesGevierd()
    const nieuw = data.behaaldeDoelen.filter(d => !gevierd.has(d.opdrachtId))
    if (nieuw.length) setFeest(nieuw)
  }

  const klaarMetFeest = () => {
    markeerGevierd(feest.map(d => d.opdrachtId))
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

      {feest.length > 0 && <DoelFeest doelen={feest} onKlaar={klaarMetFeest} />}
    </div>
  )
}
