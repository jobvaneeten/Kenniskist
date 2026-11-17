import Icoon from './Iconen.jsx'
import { EMOTES } from './emotes.js'
import './emotes.css'

// Een emote als tegel: neonrand en icoon in de kleur van de emote. Dicht
// (nog niet gewonnen): alleen een vraagteken.
export default function EmoteTegel({ emote, size = 64, dicht = false, metNaam = false, className = '' }) {
  const e = EMOTES[emote]
  if (!e) return null
  return (
    <span className={`em-tegel ${dicht ? 'em-dicht' : ''} ${className}`} style={{ '--ek': e.kleur, '--em-maat': `${size}px` }}>
      {dicht ? <span className="em-vraag">?</span> : <Icoon naam={e.icoon} />}
      {metNaam && <span className="em-naam">{dicht ? '???' : e.naam}</span>}
    </span>
  )
}
