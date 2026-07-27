import { useState, useEffect, useCallback } from 'react'
import { WOORDSOORTEN, ZINSDELEN, VRAGEN } from './taalData.js'
import SpelBeloning from './SpelBeloning'
import { useGebruikOpdracht } from './gebruikOpdracht.js'
import OpdrachtKlaarScherm from './OpdrachtKlaarScherm.jsx'
import './taal-oefenen.css'

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

// vraagWoord mag een los woord zijn, een aaneengesloten frase (bijv. "heeft gekocht"),
// of een uit elkaar getrokken werkwoordelijk gezegde (bijv. "mogen ... spelen" in
// "Wij mogen buiten spelen") — de woorden worden dan in volgorde gezocht, niet per se naast elkaar.
function renderZin(zin, vraagWoord) {
  const words = zin.split(' ')
  const clean = (w) => w.replace(/[.,!?;:]$/, '')
  const vraagWoorden = vraagWoord.split(' ')

  const matched = new Set()
  let ti = 0
  for (let i = 0; i < words.length && ti < vraagWoorden.length; i++) {
    if (clean(words[i]) === vraagWoorden[ti] || words[i] === vraagWoorden[ti]) {
      matched.add(i)
      ti++
    }
  }

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
  const [feedback, setFeedback] = useState(null) // { correct, uitleg, juistAntwoord }
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
    const field = config.mode === 'woordsoorten' ? 'woordsoort' : 'zinsdeel'
    const alleLabels = (config.mode === 'woordsoorten' ? WOORDSOORTEN : ZINSDELEN).map(t => t.label)
    const gekozenLabels = (config.mode === 'woordsoorten' ? config.soorten : config.zinsdelen)?.length
      ? (config.mode === 'woordsoorten' ? config.soorten : config.zinsdelen)
      : alleLabels
    const init = {}
    gekozenLabels.forEach(l => { init[l] = true })
    setMode(config.mode)
    setChecked(init)
    setPool(shuffle(VRAGEN.filter(q => q[field] !== null && gekozenLabels.includes(q[field]))))
    setPoolIdx(0)
    setCorrectCount(0)
    setFeedback(null)
    setScreen('oefening')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkedLabels = Object.entries(checked).filter(([, v]) => v).map(([k]) => k)
  const beloning = checkedLabels.length * BRIEFGELD_PER_AANGEVINKT

  function buildPool() {
    const field = mode === 'woordsoorten' ? 'woordsoort' : 'zinsdeel'
    const filtered = VRAGEN.filter(q => q[field] !== null && checkedLabels.includes(q[field]))
    return shuffle(filtered)
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

  function handleAnswer(label) {
    if (feedback) return
    const q = pool[poolIdx]
    const field = mode === 'woordsoorten' ? 'woordsoort' : 'zinsdeel'
    const uitlegField = mode === 'woordsoorten' ? 'uitleg_ws' : 'uitleg_zd'
    const correct = label === q[field]
    setFeedback({ correct, uitleg: q[uitlegField], juistAntwoord: q[field] })

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
    const next = poolIdx + 1
    if (next >= pool.length) {
      const newPool = buildPool()
      setPool(newPool)
      setPoolIdx(0)
    } else {
      setPoolIdx(next)
    }
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
    const field = mode === 'woordsoorten' ? 'woordsoort' : 'zinsdeel'
    const answerLabel = mode === 'woordsoorten' ? 'Wat voor woordsoort is het gekleurde woord?' : 'Wat is het zinsdeel van het gekleurde deel?'
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
          <p className="tv-mode-label">{mode === 'woordsoorten' ? '📚 Woordsoorten' : '🔍 Zinsdelen'}</p>
          <div className="tv-zin">{renderZin(q.zin, q.vraagWoord)}</div>
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
