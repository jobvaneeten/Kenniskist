import { useState } from 'react'
import SpelBeloning from './SpelBeloning'
import { useGebruikOpdracht } from './gebruikOpdracht.js'
import OpdrachtKlaarScherm from './OpdrachtKlaarScherm.jsx'
import { ONDERDELEN, REGELS, vragenVoor, maakVraag } from './interpunctieData.js'
import { HULP, maakGebiedendVraag, gebiedendRonde } from './gebiedendeWijsData.js'
import './taal-oefenen.css'

const CORRECT_VOOR_REWARD = 10

// Kern van beide oefeningen: vier zinnen, kies de goede. `volgende()` geeft
// { opties: [{ tekst, goed, uitleg: [] }], cat }. Geen automatische
// doorklik: de uitleg is het leerzame deel en verdient leestijd.
function KeuzeOefening({ toolId, titel, vraag, volgende, hulp, beloning, aantal, onStop, onBack, addBriefgeld, addCuruntie }) {
  const opdracht = useGebruikOpdracht({ toolId, aantal })
  const [v, setV] = useState(volgende)
  const [gekozen, setGekozen] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [showReward, setShowReward] = useState(false)
  const [hulpOpen, setHulpOpen] = useState(false)

  const kies = (i) => {
    if (gekozen != null) return
    const o = v.opties[i]
    setGekozen(i)
    if (o.goed) setCorrectCount(c => c + 1)
    opdracht.registreer(o.goed, {
      vraag: v.opties.find(x => x.goed).tekst, antwoord: o.tekst,
      juist: v.opties.find(x => x.goed).tekst, cat: o.cat ?? v.cat, catLabel: o.cat ?? v.cat,
    })
  }

  const verder = () => {
    if (v.opties[gekozen].goed && correctCount > 0 && correctCount % CORRECT_VOOR_REWARD === 0) {
      setShowReward(true)
      return
    }
    setGekozen(null)
    setV(volgende())
  }

  if (showReward) {
    return (
      <SpelBeloning
        title={`Geweldig — ${CORRECT_VOOR_REWARD} keer goed!`}
        geld={beloning} addCuruntie={addCuruntie}
        onDone={() => { setShowReward(false); addBriefgeld?.(beloning); setGekozen(null); setV(volgende()) }}
      />
    )
  }

  if (opdracht.klaar && gekozen == null) {
    return <OpdrachtKlaarScherm goed={opdracht.goed} aantal={opdracht.aantal} opslaanMislukt={opdracht.opslaanMislukt} onBack={onBack} />
  }

  const keuze = gekozen != null ? v.opties[gekozen] : null
  const uitleg = !keuze ? []
    : keuze.goed
      ? [...new Set(v.opties.filter(o => !o.goed).flatMap(o => o.uitleg))]
      : keuze.uitleg

  return (
    <div className="tv-screen">
      <div className="tv-top-bar">
        <button className="tv-back" onClick={onStop}>← Stop</button>
        <div className="tv-progress">
          <span className="tv-score-badge">✓ {correctCount}</span>
          <span className="tv-reward-meter">
            <span className="tv-reward-track">
              <span className="tv-reward-fill" style={{ width: `${((correctCount % CORRECT_VOOR_REWARD) / CORRECT_VOOR_REWARD) * 100}%` }} />
            </span>
            <span className="tv-reward-tekst">nog {CORRECT_VOOR_REWARD - (correctCount % CORRECT_VOOR_REWARD)} 🚀</span>
          </span>
        </div>
      </div>

      <div className="tv-werk">
        <div className={`tv-card ${keuze ? (keuze.goed ? 'tv-card-correct' : 'tv-card-wrong') : ''}`}>
          <p className="tv-mode-label">{titel}</p>
          <p className="tv-vraag">{vraag}</p>
        </div>

        <div className="tv-answers tv-answers-kolom">
          {v.opties.map((o, i) => {
            const staat = gekozen == null ? ''
              : o.goed ? ' tv-answer-goed'
              : i === gekozen ? ' tv-answer-fout'
              : ' tv-answer-dim'
            return (
              <button key={o.tekst} className={`tv-answer-btn zk-zin${staat}`} disabled={gekozen != null} onClick={() => kies(i)}>
                {o.tekst}
              </button>
            )
          })}
        </div>

        {gekozen == null && (
          <div className="tv-tip-rij">
            <button className="tv-tip-knop" onClick={() => setHulpOpen(h => !h)}>
              {hulpOpen ? '💡 Hulp verbergen' : '💡 Hulp'}
            </button>
          </div>
        )}
        {gekozen == null && hulpOpen && (
          <div className="tv-tip">
            <span className="tv-tip-icon">💡</span>
            <div>{hulp}</div>
          </div>
        )}

        {keuze && (
          <>
            <div className={`tv-feedback ${keuze.goed ? 'tv-feedback-correct' : 'tv-feedback-wrong'}`}>
              <span className="tv-feedback-icon">{keuze.goed ? '✓' : '✗'}</span>
              <div>
                <p className="tv-feedback-uitleg">
                  {keuze.goed ? 'Goed gezien! Dit was er mis met de andere zinnen:' : 'Helaas. Dit klopt niet aan jouw zin:'}
                </p>
                {uitleg.map(u => <p key={u} className="tv-feedback-uitleg">• {u}</p>)}
              </div>
            </div>
            <button className="tv-btn tv-btn-primary" onClick={verder}>Volgende →</button>
          </>
        )}
      </div>
    </div>
  )
}

// Rondes: elke zin één keer, dan opnieuw geschud. Bewust een closure en geen
// state: KeuzeOefening roept volgende() aan en mag niet twee keer dezelfde
// zin achter elkaar krijgen.
function ronde(maak) {
  let rij = []
  return () => {
    if (!rij.length) rij = maak()
    return rij.pop()
  }
}

function interpunctieVolgende(cats) {
  const pak = ronde(() => vragenVoor(cats))
  return () => {
    const vr = maakVraag(pak(), cats)
    return {
      cat: cats[0],
      opties: vr.opties.map(o => ({ tekst: o.tekst, goed: o.goed, cat: o.fouten[0]?.cat, uitleg: o.fouten.map(f => f.uitleg) })),
    }
  }
}

// config.onderdelen: vanuit een weektaak, taak of doel (zie tools.js) — dan
// geen keuzescherm.
export function Interpunctie({ onBack, addBriefgeld, addCuruntie, aantal, config }) {
  const vast = config?.onderdelen?.length ? config.onderdelen : null
  const [cats, setCats] = useState(vast ?? ONDERDELEN.map(o => o.id))
  // null = keuzescherm, anders de vragenbron van de lopende oefening
  const [volgende, setVolgende] = useState(() => (vast ? interpunctieVolgende(vast) : null))

  const start = () => setVolgende(() => interpunctieVolgende(cats))

  if (volgende) {
    const labels = ONDERDELEN.filter(o => cats.includes(o.id))
    return (
      <KeuzeOefening
        toolId="taal-interpunctie"
        titel={`✏️ Interpunctie · ${labels.map(l => l.label.toLowerCase()).join(', ')}`}
        vraag="Welke zin is helemaal goed geschreven?"
        volgende={volgende}
        hulp={labels.map(l => (
          <div key={l.id} className="zk-regels">
            <strong>{l.label}</strong>
            {REGELS[l.id].map(r => <p key={r}>{r}</p>)}
          </div>
        ))}
        beloning={5 + cats.length * 5}
        aantal={aantal}
        onStop={vast ? onBack : () => setVolgende(null)}
        onBack={onBack} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie}
      />
    )
  }
  const toggel = (id) => setCats(c => (c.includes(id) ? c.filter(x => x !== id) : [...c, id]))
  return (
    <div className="tv-screen tv-screen-center">
      <button className="tv-back" onClick={onBack}>← Terug</button>
      <div className="tv-header">
        <span className="tv-header-icon">✏️</span>
        <h1>Interpunctie</h1>
        <p>Kies wat je wilt oefenen — meerdere tegelijk mag</p>
      </div>
      <div className="tv-filter-list">
        {ONDERDELEN.map(o => (
          <label key={o.id} className="tv-filter-item">
            <input type="checkbox" checked={cats.includes(o.id)} onChange={() => toggel(o.id)} />
            <span className="tv-filter-label">
              <span className="zk-teken">{o.emoji}</span> {o.label}
            </span>
          </label>
        ))}
      </div>
      {cats.length === 0 && <p className="tv-filter-warn">Kies minstens 1 onderdeel</p>}
      <button className="tv-btn tv-btn-primary" disabled={cats.length === 0} onClick={start}>Start oefenen →</button>
    </div>
  )
}

export function GebiedendeWijs({ onBack, addBriefgeld, addCuruntie, aantal }) {
  const [volgende] = useState(() => {
    const pak = ronde(gebiedendRonde)
    return () => {
      const vr = maakGebiedendVraag(pak())
      return {
        cat: 'gebiedende wijs',
        opties: vr.opties.map(o => ({ tekst: o.zin, goed: o.goed, uitleg: [o.uitleg] })),
      }
    }
  })
  return (
    <KeuzeOefening
      toolId="taal-gebiedende-wijs"
      titel="👉 Gebiedende wijs"
      vraag="Welke zin is een gebiedende wijs?"
      volgende={volgende}
      hulp={HULP.map(r => <p key={r}>{r}</p>)}
      beloning={15}
      aantal={aantal}
      onStop={onBack}
      onBack={onBack} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie}
    />
  )
}
