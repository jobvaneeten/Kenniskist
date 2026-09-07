import { useState } from 'react'
import { BLOKKEN, LESSEN_PER_BLOK, denkvraag, heeftBlok, isHerhalingsles } from './denkvragenData.js'
import '../game.css'
import './denkvragen.css'

// Denkvragen: blok kiezen, les kiezen, vraag lezen. Verder niets — het kind
// schrijft zijn antwoord op papier en bespreekt het met de leerkracht, dus er
// is niets na te kijken en niets te verdienen. Zie denkvragenData.js.
export default function Denkvragen({ groep, onBack }) {
  const [blok, setBlok] = useState(null)
  const [les, setLes] = useState(null)

  if (blok != null && les != null) {
    const v = denkvraag(groep, blok, les)
    if (v) return <VraagScherm vraag={v} blok={blok} onBack={() => setLes(null)} />
  }

  if (blok != null) {
    const blokLabel = BLOKKEN.find(b => b.nr === blok)?.label ?? `Blok ${blok}`
    return (
      <div className="game-screen">
        <button className="back-btn" onClick={() => setBlok(null)}>← Blokken</button>
        <div className="game-header">
          <span className="game-header-icon">💭</span>
          <h1 className="game-header-title">{blokLabel}</h1>
          <p className="game-header-sub">Bij welke les hoort de denkvraag?</p>
        </div>
        <div className="dv-lesgrid">
          {Array.from({ length: LESSEN_PER_BLOK }, (_, i) => i + 1).map(n => {
            const herhaling = isHerhalingsles(n)
            return (
              <button
                key={n}
                className={`dv-les${herhaling ? ' dv-les-uit' : ''}`}
                disabled={herhaling}
                onClick={() => setLes(n)}
              >
                <span className="dv-les-nr">{n}</span>
                <span className="dv-les-sub">{herhaling ? 'herhaling' : `doel ${denkvraag(groep, blok, n)?.doelNr}`}</span>
              </button>
            )
          })}
        </div>
        <p className="dv-voet">Les 5 en les 10 zijn herhalingslessen. Daar hoort geen denkvraag bij.</p>
      </div>
    )
  }

  return (
    <div className="game-screen">
      <button className="back-btn" onClick={onBack}>← Rekenen</button>
      <div className="game-header">
        <span className="game-header-icon">💭</span>
        <h1 className="game-header-title">Denkvragen — Groep {groep}</h1>
        <p className="game-header-sub">Zoek de denkvraag van jouw les op. Schrijf je antwoord op papier.</p>
      </div>
      <div className="dv-blokgrid">
        {BLOKKEN.map(b => {
          const klaar = heeftBlok(groep, b.nr)
          return (
            <button
              key={b.nr}
              className={`dv-blok${klaar ? '' : ' dv-blok-uit'}`}
              disabled={!klaar}
              onClick={() => { setBlok(b.nr); setLes(null) }}
            >
              <span className="dv-blok-naam">{b.label}</span>
              <span className="dv-blok-sub">{klaar ? '8 denkvragen' : 'komt nog'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function VraagScherm({ vraag, blok, onBack }) {
  const [hintOpen, setHintOpen] = useState(false)
  const blokLabel = BLOKKEN.find(b => b.nr === blok)?.label ?? `Blok ${blok}`

  return (
    <div className="game-screen">
      <button className="back-btn" onClick={onBack}>← Lessen</button>
      <div className="dv-kaart">
        <p className="dv-kop">{blokLabel} · les {vraag.les}</p>
        {vraag.doel && (
          <p className="dv-doel"><span className="dv-doel-label">Doel van de les</span>{vraag.doel}</p>
        )}
        {/* pre-wrap: de vraag staat met eigen regelafbrekingen in denkvragenData.js,
            zodat de sommen onder elkaar blijven staan. */}
        <p className="dv-vraag">{vraag.vraag}</p>

        {!hintOpen && (
          <button className="dv-hint-knop" onClick={() => setHintOpen(true)}>
            Ik kom er niet uit
          </button>
        )}
        {hintOpen && (
          <p className="dv-hint"><span className="dv-hint-label">Zetje</span>{vraag.hint}</p>
        )}
      </div>
      <p className="dv-voet">Schrijf je antwoord op papier. Straks bespreek je het met de klas.</p>
    </div>
  )
}
