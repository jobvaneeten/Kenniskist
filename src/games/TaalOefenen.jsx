import { useState, useEffect } from 'react'
import { WOORDSOORTEN, ZINSDELEN, VRAGEN, TIP_WOORDSOORT, splitZin, woordIndexen } from './taalData.js'
import SpelBeloning from './SpelBeloning'
import Woordenschat from './Woordenschat.jsx'
import Zinsdelen from './Zinsdelen.jsx'
import { useGebruikOpdracht } from './gebruikOpdracht.js'
import OpdrachtKlaarScherm from './OpdrachtKlaarScherm.jsx'
import './taal-oefenen.css'

const BRIEFGELD_PER_AANGEVINKT = 5 // € per aangevinkt onderdeel, per beloning
const CORRECT_VOOR_REWARD = 10

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

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

// aantal/config: alleen gezet vanuit een weektaak-opdracht (toolRender.jsx).
// config = { mode: 'woordsoorten'|'zinsdelen', soorten?, zinsdelen? } — slaat
// de menu/taalverkennen/filter-schermen over en start direct in de oefening.
export default function TaalOefenen({ onBack, addBriefgeld, addCuruntie, aantal, config, groep }) {
  const [screen, setScreen] = useState('menu')
  const [mode, setMode] = useState(null)
  const [checked, setChecked] = useState({})
  const [pool, setPool] = useState([])
  const [poolIdx, setPoolIdx] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState(null) // { correct, gekozen, uitleg, juistAntwoord }
  const [showReward, setShowReward] = useState(false)
  const [samengesteld, setSamengesteld] = useState(false) // zinsdelen: ook zinnen met twee deelzinnen
  const [tipOpen, setTipOpen] = useState(false)

  const toolId = mode === 'zinsdelen' ? 'taal-zinsdelen' : 'taal-woordsoorten'
  // Zinsdelen draait in een eigen component met een eigen teller; deze hook
  // telt hier alleen de woordsoorten-opgaven.
  const opdracht = useGebruikOpdracht({ toolId, aantal: mode === 'zinsdelen' ? null : aantal })

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
    if (config.mode === 'zinsdelen') {
      setSamengesteld(!!config.samengesteld)
      setScreen('zinsdelen')
      return
    }
    setPool(shuffle(filterVragen(gekozenLabels)))
    setPoolIdx(0)
    setCorrectCount(0)
    setFeedback(null)
    setScreen('oefening')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkedLabels = Object.entries(checked).filter(([, v]) => v).map(([k]) => k)
  const beloning = checkedLabels.length * BRIEFGELD_PER_AANGEVINKT

  function buildPool() {
    return shuffle(filterVragen(checkedLabels))
  }

  function startOefening() {
    if (mode === 'zinsdelen') {
      setScreen('zinsdelen')
      return
    }
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
    const correct = label === q.woordsoort
    setFeedback({ correct, gekozen: label, uitleg: q.uitleg_ws, juistAntwoord: q.woordsoort })

    // Laatste opgave van de opdracht: eerst de feedback laten zien, dan pas
    // registreren (en dus rapporteren) — geen tussentijdse beloning meer,
    // net als bij WerkwoordSpelling.jsx.
    const zalKlaarZijn = opdracht.aantal != null && (opdracht.gedaan + 1) >= opdracht.aantal
    if (zalKlaarZijn) {
      setTimeout(() => {
        setFeedback(null)
        opdracht.registreer(correct, { vraag: q.zin, antwoord: label, juist: q.woordsoort })
      }, 1400)
      return
    }
    opdracht.registreer(correct, { vraag: q.zin, antwoord: label, juist: q.woordsoort })

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
    setTimeout(() => advanceQuestion(), correct ? 1400 : 2400)
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
        title={`Geweldig — ${CORRECT_VOOR_REWARD} keer goed!`}
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

  if (screen === 'woordenschat') {
    return (
      <Woordenschat
        onBack={() => setScreen('menu')}
        addBriefgeld={addBriefgeld} addCuruntie={addCuruntie}
      />
    )
  }

  if (screen === 'zinsdelen') {
    return (
      <Zinsdelen
        labels={checkedLabels}
        metSamengesteld={samengesteld}
        beloning={beloning}
        onBack={() => setScreen(config ? 'menu' : 'filter')}
        addBriefgeld={addBriefgeld} addCuruntie={addCuruntie}
        aantal={aantal}
      />
    )
  }

  if (screen === 'oefening') {
    const q = pool[poolIdx]
    return (
      <div className="tv-screen">
        <div className="tv-top-bar">
          <button className="tv-back" onClick={() => setScreen('filter')}>← Stop</button>
          <div className="tv-progress">
            <span className="tv-score-badge">✓ {correctCount}</span>
            <span className="tv-reward-meter">
              <span className="tv-reward-track">
                <span
                  className="tv-reward-fill"
                  style={{ width: `${((correctCount % CORRECT_VOOR_REWARD) / CORRECT_VOOR_REWARD) * 100}%` }}
                />
              </span>
              <span className="tv-reward-tekst">nog {CORRECT_VOOR_REWARD - (correctCount % CORRECT_VOOR_REWARD)} 🚀</span>
            </span>
          </div>
        </div>

        <div className="tv-werk">
          <div className={`tv-card ${feedback ? (feedback.correct ? 'tv-card-correct' : 'tv-card-wrong') : ''}`}>
            <p className="tv-mode-label">📚 Woordsoorten</p>
            <div className="tv-zin">{renderZin(q.zin, q.vraagWoord)}</div>
            <p className="tv-vraag">Wat voor woordsoort is het gekleurde woord?</p>
          </div>

          {/* Na het antwoorden blijven de knoppen staan: groen = de juiste
              woordsoort, rood = wat je koos, de rest vervaagt. */}
          <div className="tv-answers">
            {checkedLabels.map(label => {
              const staat = !feedback ? ''
                : label === feedback.juistAntwoord ? ' tv-answer-goed'
                : label === feedback.gekozen ? ' tv-answer-fout'
                : ' tv-answer-dim'
              return (
                <button
                  key={label}
                  className={`tv-answer-btn${staat}`}
                  disabled={!!feedback}
                  onClick={() => handleAnswer(label)}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Hulp: hoe herken je de soorten die je oefent? Geen antwoord op
              deze vraag, wel de trucjes. */}
          {!feedback && (
            <div className="tv-tip-rij">
              <button className="tv-tip-knop" onClick={() => setTipOpen(o => !o)}>
                {tipOpen ? '💡 Tip verbergen' : '💡 Hoe herken ik ze?'}
              </button>
            </div>
          )}
          {!feedback && tipOpen && (
            <div className="tv-tip">
              <span className="tv-tip-icon">💡</span>
              <div>
                {checkedLabels.map(l => (
                  <p key={l}><strong>{l}</strong> — {TIP_WOORDSOORT[l]}</p>
                ))}
              </div>
            </div>
          )}

          {feedback && (
            <div className={`tv-feedback ${feedback.correct ? 'tv-feedback-correct' : 'tv-feedback-wrong'}`}>
              <span className="tv-feedback-icon">{feedback.correct ? '✓' : '✗'}</span>
              <div>
                <p className="tv-feedback-uitleg">{feedback.uitleg}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (screen === 'filter') {
    const canStart = mode === 'zinsdelen' ? checkedLabels.length >= 1 : checkedLabels.length >= 2
    return (
      <div className="tv-screen tv-screen-center">
        <button className="tv-back" onClick={() => setScreen('taalverkennen')}>← Terug</button>
        <div className="tv-header">
          <span className="tv-header-icon">{mode === 'woordsoorten' ? '📚' : '🔍'}</span>
          <h1>{mode === 'woordsoorten' ? 'Woordsoorten' : 'Zinsdelen'}</h1>
          <p>{mode === 'woordsoorten' ? 'Kies wat je wilt oefenen' : 'Deze onderdelen ga je in de zin aanwijzen'}</p>
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
        {mode === 'zinsdelen' && (
          <label className="tv-filter-item tv-filter-extra">
            <input
              type="checkbox"
              checked={samengesteld}
              onChange={e => setSamengesteld(e.target.checked)}
            />
            <span className="tv-filter-label">
              Ook samengestelde zinnen
              <span className="tv-filter-hint">zinnen met twee stukjes — dus twee keer een onderwerp en een persoonsvorm</span>
            </span>
          </label>
        )}
        {!canStart && (
          <p className="tv-filter-warn">
            {mode === 'zinsdelen' ? 'Kies minstens 1 onderdeel' : 'Kies minstens 2 soorten'}
          </p>
        )}
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
            <span className="tv-mode-desc">Sleep onderwerp, persoonsvorm, gezegde, voorwerpen en bepalingen naar de juiste woorden</span>
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
        {/* Alleen groep 7: de woordenlijst is die van thema 1 uit de
            groep 7-methode. */}
        {groep === 7 && (
          <button className="tv-mode-card" onClick={() => setScreen('woordenschat')}>
            <span className="tv-mode-emoji">📓</span>
            <span className="tv-mode-name">Woordenschat</span>
            <span className="tv-mode-desc">Blok 1 — thema 1 "Ik ontmoet" · 45 woorden uit les 2, 7 en 12</span>
          </button>
        )}
      </div>
    </div>
  )
}

// Woordsoorten-vragen voor de aangevinkte soorten.
function filterVragen(labels) {
  return VRAGEN.filter(q => q.woordsoort !== null && labels.includes(q.woordsoort))
}
