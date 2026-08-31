import { useState, useEffect } from 'react'
import { WOORDSOORTEN, ZINSDELEN, VRAGEN } from './taalData.js'
import SpelBeloning from './SpelBeloning'
import { useGebruikOpdracht } from './gebruikOpdracht.js'
import OpdrachtKlaarScherm from './OpdrachtKlaarScherm.jsx'
import './taal-oefenen.css'

// "Klik op de persoonsvorm" / "Klik op het onderwerp" — puur voor een zin die
// loopt; alles wat hier niet in staat krijgt "het".
const LIDWOORD = {
  'onderwerp': 'het',
  'persoonsvorm': 'de',
  'gezegde': 'het',
  'lijdend voorwerp': 'het',
  'meewerkend voorwerp': 'het',
  'bepaling': 'de',
}

const BRIEFGELD_PER_AANGEVINKT = 5 // € per aangevinkt onderdeel, per beloning
const CORRECT_VOOR_REWARD = 5

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const splitZin = (zin) => zin.split(' ')
const cleanWoord = (w) => w.replace(/[.,!?;:]$/, '')

// De frase mag een los woord zijn, een aaneengesloten stuk (bijv. "een appel"),
// of een uit elkaar getrokken werkwoordelijk gezegde (bijv. "mogen ... spelen"
// in "Wij mogen buiten spelen") — de woorden worden in volgorde gezocht, niet
// per se naast elkaar. Hoofdletters tellen mee, zodat "de kinderen" niet aan
// het "De" aan het zinsbegin blijft plakken.
function woordIndexen(zin, frase) {
  const words = splitZin(zin)
  const doel = frase.split(' ')
  const matched = new Set()
  let ti = 0
  for (let i = 0; i < words.length && ti < doel.length; i++) {
    if (cleanWoord(words[i]) === doel[ti] || words[i] === doel[ti]) {
      matched.add(i)
      ti++
    }
  }
  return matched
}

// Welke woorden hóren bij het zinsdeel: het volledige zinsdeel ("De hond"),
// niet alleen het kernwoord ("hond") dat de woordsoorten-modus gebruikt.
const zinsdeelFrase = (q) => q.zinsdeelWoorden || q.vraagWoord

function renderZin(zin, vraagWoord) {
  const words = splitZin(zin)
  const matched = woordIndexen(zin, vraagWoord)

  return words.map((word, i) => {
    const isMatch = matched.has(i)
    return (
      <span key={i}>
        {isMatch
          ? <mark className="tv-highlight">{word}</mark>
          : word}
        {i < words.length - 1 ? ' ' : ''}
      </span>
    )
  })
}

const zelfdeSet = (a, b) => a.size === b.size && [...a].every(i => b.has(i))

// Bij zinsdelen klik je het zinsdeel in de zin aan. Dezelfde zin kan meerdere
// geldige antwoorden hebben (twee bepalingen bijvoorbeeld), en die staan als
// losse rijen in de data — als vráág is dat één en dezelfde opgave, dus houden
// we per zin+zinsdeel één rij over en gelden de andere als goed alternatief.
function filterVragen(mode, labels) {
  const field = mode === 'woordsoorten' ? 'woordsoort' : 'zinsdeel'
  const gefilterd = VRAGEN.filter(q => q[field] !== null && labels.includes(q[field]))
  if (mode === 'woordsoorten') return gefilterd
  const gezien = new Set()
  return gefilterd.filter(q => {
    const k = `${q.zin}|${q.zinsdeel}`
    if (gezien.has(k)) return false
    gezien.add(k)
    return true
  })
}

// Alle goedgekeurde woordgroepen voor deze vraag: het eigen zinsdeel plus de
// alternatieven uit dezelfde zin met hetzelfde zinsdeel.
function goedeSets(q) {
  return VRAGEN
    .filter(a => a.zin === q.zin && a.zinsdeel === q.zinsdeel)
    .map(a => woordIndexen(q.zin, zinsdeelFrase(a)))
}

// aantal/config: alleen gezet vanuit een weektaak-opdracht (toolRender.jsx).
// config = { mode: 'woordsoorten'|'zinsdelen', soorten?, zinsdelen? } — slaat
// de menu/taalverkennen/filter-schermen over en start direct in de oefening.
export default function TaalOefenen({ onBack, addBriefgeld, addCuruntie, aantal, config }) {
  const [screen, setScreen] = useState('menu')
  const [mode, setMode] = useState(null)
  const [checked, setChecked] = useState({})
  const [pool, setPool] = useState([])
  const [poolIdx, setPoolIdx] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState(null) // { correct, uitleg, juistAntwoord, juisteWoorden? }
  const [gekozenWoorden, setGekozenWoorden] = useState(new Set()) // zinsdelen: aangeklikte woordindexen
  const [showReward, setShowReward] = useState(false)

  const toolId = mode === 'woordsoorten' ? 'taal-woordsoorten' : 'taal-zinsdelen'
  const opdracht = useGebruikOpdracht({ toolId, aantal })

  const types = mode === 'woordsoorten' ? WOORDSOORTEN : ZINSDELEN

  // Initialize checkboxes when mode is set (vrij-oefen-pad — bij config
  // hieronder wordt mode al met de juiste checked-set gezet)
  useEffect(() => {
    if (mode && !config) {
      const init = {}
      const list = mode === 'woordsoorten' ? WOORDSOORTEN : ZINSDELEN
      list.forEach(t => { init[t.label] = true })
      setChecked(init)
    }
  }, [mode, config])

  // Vanuit een weektaak-opdracht: menu/taalverkennen/filter overslaan en
  // direct de gekozen soorten oefenen. Rechtstreeks de pool berekenen i.p.v.
  // op de checked-state te vertrouwen — die is hier bij mount nog leeg en
  // een state-update is niet synchroon binnen dit effect.
  useEffect(() => {
    if (!config) return
    const alleLabels = (config.mode === 'woordsoorten' ? WOORDSOORTEN : ZINSDELEN).map(t => t.label)
    const gekozenLabels = (config.mode === 'woordsoorten' ? config.soorten : config.zinsdelen)?.length
      ? (config.mode === 'woordsoorten' ? config.soorten : config.zinsdelen)
      : alleLabels
    const init = {}
    gekozenLabels.forEach(l => { init[l] = true })
    setMode(config.mode)
    setChecked(init)
    setPool(shuffle(filterVragen(config.mode, gekozenLabels)))
    setPoolIdx(0)
    setCorrectCount(0)
    setFeedback(null)
    setScreen('oefening')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkedLabels = Object.entries(checked).filter(([, v]) => v).map(([k]) => k)
  const beloning = checkedLabels.length * BRIEFGELD_PER_AANGEVINKT

  function buildPool() {
    return shuffle(filterVragen(mode, checkedLabels))
  }

  function startOefening() {
    const p = buildPool()
    if (p.length === 0) return
    setPool(p)
    setPoolIdx(0)
    setCorrectCount(0)
    setFeedback(null)
    setScreen('oefening')
  }

  // Woordsoorten: `label` is de aangeklikte knop. Zinsdelen: de leerling heeft
  // woorden in de zin aangeklikt en `label` is de tekst daarvan.
  function handleAnswer(label, correctOverride) {
    if (feedback) return
    const q = pool[poolIdx]
    const field = mode === 'woordsoorten' ? 'woordsoort' : 'zinsdeel'
    const uitlegField = mode === 'woordsoorten' ? 'uitleg_ws' : 'uitleg_zd'
    const correct = correctOverride ?? (label === q[field])
    setFeedback({
      correct,
      uitleg: q[uitlegField],
      juistAntwoord: mode === 'woordsoorten' ? q[field] : zinsdeelFrase(q),
      juisteWoorden: mode === 'woordsoorten' ? null : woordIndexen(q.zin, zinsdeelFrase(q)),
    })

    // Laatste opgave van de opdracht: eerst de feedback laten zien, dan pas
    // registreren (en dus rapporteren) — geen tussentijdse beloning meer,
    // net als bij WerkwoordSpelling.jsx.
    const zalKlaarZijn = opdracht.aantal != null && (opdracht.gedaan + 1) >= opdracht.aantal
    if (zalKlaarZijn) {
      setTimeout(() => {
        setFeedback(null)
        opdracht.registreer(correct, { vraag: q.zin, antwoord: label, juist: q[field] })
      }, 1400)
      return
    }
    opdracht.registreer(correct, { vraag: q.zin, antwoord: label, juist: q[field] })

    if (correct) {
      const newCount = correctCount + 1
      setCorrectCount(newCount)
      if (newCount % CORRECT_VOOR_REWARD === 0) {
        setTimeout(() => {
          setFeedback(null)
          setShowReward(true)
        }, 1400)
        return
      }
    }
    setTimeout(() => advanceQuestion(), 1400)
  }

  function advanceQuestion() {
    setFeedback(null)
    setGekozenWoorden(new Set())
    const next = poolIdx + 1
    if (next >= pool.length) {
      const newPool = buildPool()
      setPool(newPool)
      setPoolIdx(0)
    } else {
      setPoolIdx(next)
    }
  }

  // Nakijken van een zinsdelen-vraag: goed als de aangeklikte woorden precies
  // één van de geldige zinsdelen in deze zin vormen.
  function checkZinsdeel() {
    if (feedback || gekozenWoorden.size === 0) return
    const q = pool[poolIdx]
    const words = splitZin(q.zin)
    const gekozenTekst = [...gekozenWoorden].sort((a, b) => a - b).map(i => words[i]).join(' ')
    handleAnswer(gekozenTekst, goedeSets(q).some(set => zelfdeSet(set, gekozenWoorden)))
  }

  function afterReward() {
    setShowReward(false)
    if (addBriefgeld) addBriefgeld(beloning)
    advanceQuestion()
  }

  if (showReward) {
    return (
      <SpelBeloning
        title="Geweldig — 5 zinnen goed!"
        geld={beloning}
        addCuruntie={addCuruntie}
        onDone={afterReward}
      />
    )
  }

  if (opdracht.klaar) {
    return (
      <OpdrachtKlaarScherm
        goed={opdracht.goed} aantal={opdracht.aantal}
        opslaanMislukt={opdracht.opslaanMislukt} onBack={onBack}
      />
    )
  }

  if (screen === 'oefening') {
    const q = pool[poolIdx]
    const zoeken = mode === 'zinsdelen'
    const answerLabel = zoeken
      ? `Klik op ${q.zinsdeel === 'gezegde' ? 'het' : LIDWOORD[q.zinsdeel] ?? 'het'} ${q.zinsdeel} in de zin`
      : 'Wat voor woordsoort is het gekleurde woord?'
    return (
      <div className="tv-screen">
        <div className="tv-top-bar">
          <button className="tv-back" onClick={() => setScreen('filter')}>← Stop</button>
          <div className="tv-progress">
            <span className="tv-score-badge">✓ {correctCount}</span>
            <span className="tv-next-reward">nog {CORRECT_VOOR_REWARD - (correctCount % CORRECT_VOOR_REWARD)} voor 🚀</span>
          </div>
        </div>

        <div className={`tv-card ${feedback ? (feedback.correct ? 'tv-card-correct' : 'tv-card-wrong') : ''}`}>
          <p className="tv-mode-label">{zoeken ? '🔍 Zinsdelen' : '📚 Woordsoorten'}</p>
          {zoeken ? (
            // Zoekmodus: elk woord is aanklikbaar. Een zinsdeel kan uit
            // meerdere woorden bestaan ("De hond", "aan de kinderen"), dus je
            // klikt er net zoveel aan als nodig en kijkt daarna na.
            <div className="tv-zin tv-zin-klik">
              {splitZin(q.zin).map((woord, i) => {
                const aan = gekozenWoorden.has(i)
                const juist = feedback?.juisteWoorden?.has(i)
                const klasse = feedback
                  ? `tv-woord${juist ? ' tv-woord-juist' : ''}${aan && !juist ? ' tv-woord-mis' : ''}`
                  : `tv-woord${aan ? ' tv-woord-aan' : ''}`
                return (
                  <button
                    key={i} type="button" className={klasse} disabled={!!feedback}
                    onClick={() => setGekozenWoorden(prev => {
                      const next = new Set(prev)
                      next.has(i) ? next.delete(i) : next.add(i)
                      return next
                    })}
                  >{woord}</button>
                )
              })}
            </div>
          ) : (
            <div className="tv-zin">{renderZin(q.zin, q.vraagWoord)}</div>
          )}
          <p className="tv-vraag">{answerLabel}</p>
        </div>

        {feedback ? (
          <div className={`tv-feedback ${feedback.correct ? 'tv-feedback-correct' : 'tv-feedback-wrong'}`}>
            <span className="tv-feedback-icon">{feedback.correct ? '✓' : '✗'}</span>
            <div>
              {!feedback.correct && <p className="tv-feedback-antwoord">Juist: <strong>{feedback.juistAntwoord}</strong></p>}
              <p className="tv-feedback-uitleg">{feedback.uitleg}</p>
            </div>
          </div>
        ) : zoeken ? (
          <div className="tv-answers tv-answers-klik">
            <button
              className="tv-answer-btn tv-nakijk-btn"
              disabled={gekozenWoorden.size === 0}
              onClick={checkZinsdeel}
            >Nakijken ✓</button>
            {gekozenWoorden.size > 0 && (
              <button className="tv-wis-btn" onClick={() => setGekozenWoorden(new Set())}>wissen</button>
            )}
          </div>
        ) : (
          <div className="tv-answers">
            {checkedLabels.map(label => (
              <button
                key={label}
                className="tv-answer-btn"
                onClick={() => handleAnswer(label)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (screen === 'filter') {
    const canStart = checkedLabels.length >= 2
    return (
      <div className="tv-screen tv-screen-center">
        <button className="tv-back" onClick={() => setScreen('taalverkennen')}>← Terug</button>
        <div className="tv-header">
          <span className="tv-header-icon">{mode === 'woordsoorten' ? '📚' : '🔍'}</span>
          <h1>{mode === 'woordsoorten' ? 'Woordsoorten' : 'Zinsdelen'}</h1>
          <p>Kies wat je wilt oefenen</p>
        </div>
        <div className="tv-filter-list">
          {types.map(t => (
            <label key={t.id} className="tv-filter-item">
              <input
                type="checkbox"
                checked={!!checked[t.label]}
                onChange={e => setChecked(prev => ({ ...prev, [t.label]: e.target.checked }))}
              />
              <span className="tv-filter-label">{t.label}</span>
            </label>
          ))}
        </div>
        {!canStart && <p className="tv-filter-warn">Kies minstens 2 soorten</p>}
        <button
          className="tv-btn tv-btn-primary"
          disabled={!canStart}
          onClick={startOefening}
        >
          Start oefenen →
        </button>
      </div>
    )
  }

  if (screen === 'taalverkennen') {
    return (
      <div className="tv-screen tv-screen-center">
        <button className="tv-back" onClick={() => setScreen('menu')}>← Menu</button>
        <div className="tv-header">
          <span className="tv-header-icon">🌱</span>
          <h1>Taalverkennen</h1>
          <p>Wat wil je oefenen?</p>
        </div>
        <div className="tv-mode-grid">
          <button className="tv-mode-card" onClick={() => { setMode('zinsdelen'); setScreen('filter') }}>
            <span className="tv-mode-emoji">🔍</span>
            <span className="tv-mode-name">Zinsdelen</span>
            <span className="tv-mode-desc">Onderwerp · Persoonsvorm · Gezegde · Lijdend/meewerkend voorwerp · Bepaling</span>
          </button>
          <button className="tv-mode-card" onClick={() => { setMode('woordsoorten'); setScreen('filter') }}>
            <span className="tv-mode-emoji">📚</span>
            <span className="tv-mode-name">Woordsoorten</span>
            <span className="tv-mode-desc">Naamwoord · Werkwoord · Bijvoeglijk · Bijwoord en meer</span>
          </button>
        </div>
      </div>
    )
  }

  // menu
  return (
    <div className="tv-screen tv-screen-center">
      <button className="tv-back" onClick={onBack}>← Menu</button>
      <div className="tv-header">
        <span className="tv-header-icon">📖</span>
        <h1>Taal</h1>
        <p>Kies een onderdeel</p>
      </div>
      <div className="tv-mode-grid">
        <button className="tv-mode-card" onClick={() => setScreen('taalverkennen')}>
          <span className="tv-mode-emoji">🌱</span>
          <span className="tv-mode-name">Taalverkennen</span>
          <span className="tv-mode-desc">Zinsdelen en woordsoorten oefenen</span>
        </button>
        <button className="tv-mode-card tv-mode-card-disabled">
          <span className="tv-mode-emoji">📓</span>
          <span className="tv-mode-name">Woordenschat</span>
          <span className="tv-mode-desc">🚧 Komt binnenkort</span>
        </button>
      </div>
    </div>
  )
}
