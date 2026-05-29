import { useState, useEffect, useRef, useCallback } from 'react'
import './iep-oefenen.css'

// ========== Stars ==========
function Stars() {
  const stars = useRef([])
  if (stars.current.length === 0) {
    for (let i = 0; i < 120; i++) {
      stars.current.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 0.8,
        dur: (Math.random() * 4 + 2).toFixed(1),
        delay: (Math.random() * 5).toFixed(1),
        op: (Math.random() * 0.6 + 0.3).toFixed(2),
      })
    }
  }
  return (
    <div className="iep-stars" aria-hidden>
      {stars.current.map(s => (
        <div key={s.id} className="iep-star" style={{
          left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size,
          '--dur': `${s.dur}s`, '--delay': `${s.delay}s`, '--op': s.op,
        }} />
      ))}
    </div>
  )
}

// ========== Doel categorisation ==========
const DOEL_DEFS = [
  { key: 'procenten',        label: 'Procenten',        emoji: '💯', pattern: /%|procent/ },
  { key: 'breuken',          label: 'Breuken',          emoji: '🥧', pattern: /breuk|halv|helft|kwart|derde/ },
  { key: 'geld',             label: 'Geld',             emoji: '💰', pattern: /euro|cent|€|betaal|wisselen/ },
  { key: 'meten',            label: 'Meten',            emoji: '📏', pattern: /meter\b|cm\b|km\b|liter\b|ml\b|kilo\b|gram\b|kg\b|minuut|minuten|uur\b/ },
  { key: 'vermenigvuldigen', label: 'Vermenigvuldigen', emoji: '✖️', pattern: /×|keer\b|maal\b|vermenigvuldig/ },
  { key: 'delen',            label: 'Delen',            emoji: '➗', pattern: /÷|gedeeld|verdeel/ },
  { key: 'aftrekken',        label: 'Aftrekken',        emoji: '➖', pattern: /−|aftrek|verschil\b/ },
  { key: 'optellen',         label: 'Optellen',         emoji: '➕', pattern: /\+|optell/ },
  { key: 'rekenen',          label: 'Rekenen',          emoji: '🔢', pattern: null },
]

function categorizeDoel(q) {
  const text = ((q.contextText || '') + ' ' + (q.questionText || '')).toLowerCase()
  for (const d of DOEL_DEFS) {
    if (d.pattern && d.pattern.test(text)) return d.key
  }
  return 'rekenen'
}

// ========== Helpers ==========
function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ========== Level selector ==========
const LEVELS = [
  { num: 1, emoji: '🌙', label: 'Niveau 1', desc: 'Minder dan 1F',    file: '/iep_niveau1.json' },
  { num: 2, emoji: '⭐', label: 'Niveau 2', desc: '1F + 1S basis',    file: '/iep_niveau2.json' },
  { num: 3, emoji: '🚀', label: 'Niveau 3', desc: '1F + 1S gevorderd', file: '/iep_niveau3.json' },
]

function LevelSelect({ onSelect }) {
  return (
    <div className="iep-level-screen">
      <div className="iep-rocket-icon">🚀</div>
      <h1>IEP Oefenen</h1>
      <p>Beantwoord rekenvragen en verdien Jetpack-tijd!</p>
      <div className="iep-level-cards">
        {LEVELS.map(l => (
          <button key={l.num} className="iep-level-card" onClick={() => onSelect(l)}>
            <span className="iep-lc-emoji">{l.emoji}</span>
            <span className="iep-lc-title">{l.label}</span>
            <span className="iep-lc-desc">{l.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ========== Question card ==========
function QuestionCard({ q, onCorrect, onWrong }) {
  const [input, setInput]               = useState('')
  const [phase, setPhase]               = useState('answering')
  const [chosenOption, setChosenOption] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    setInput('')
    setPhase('answering')
    setChosenOption(null)
    if (inputRef.current) inputRef.current.focus()
  }, [q.id])

  function handleMC(opt) { setChosenOption(opt); setPhase('honor') }
  function handleCheck() { if (input.trim()) setPhase('honor') }
  function handleHonor(correct) { setPhase(correct ? 'feedback-good' : 'feedback-bad') }

  // Reset card internally AND notify parent
  function handleRetry() {
    setPhase('answering')
    setInput('')
    setChosenOption(null)
    onWrong()
  }

  return (
    <div className="iep-card">
      {(q.contextText || q.contextImage) && (
        <div className="iep-context">
          {q.contextText && <span>{q.contextText}</span>}
          {q.contextImage && <img src={q.contextImage} alt="opgave" />}
        </div>
      )}

      <div className="iep-question-text">{q.questionText}</div>

      {phase === 'answering' && (
        q.type === 'mc' ? (
          <div className="iep-mc-options">
            {q.options.map((opt, i) => (
              <button key={i} className="iep-mc-btn" onClick={() => handleMC(opt)}>{opt}</button>
            ))}
          </div>
        ) : (
          <div className="iep-open-row">
            <input
              ref={inputRef}
              className="iep-open-input"
              type="text"
              placeholder="Jouw antwoord…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCheck()}
            />
            <button className="iep-check-btn" onClick={handleCheck}>Controleer →</button>
          </div>
        )
      )}

      {phase === 'honor' && (
        <div className="iep-honor-check">
          <p>{q.type === 'mc'
            ? <>Jij koos: <strong>{chosenOption}</strong></>
            : <>Jouw antwoord: <strong>{input}</strong></>}
          </p>
          <p>Klopt jouw antwoord?</p>
          <div className="iep-honor-row">
            <button className="iep-honor-yes" onClick={() => handleHonor(true)}>✅ Ja, goed!</button>
            <button className="iep-honor-no"  onClick={() => handleHonor(false)}>❌ Nee, fout</button>
          </div>
        </div>
      )}

      {phase === 'feedback-good' && (
        <div className="iep-feedback good">
          <span>🎉 Super goed!</span>
          <button className="iep-next-btn" onClick={onCorrect}>Verder →</button>
        </div>
      )}

      {phase === 'feedback-bad' && (
        <div className="iep-feedback bad">
          <span>😅 Niet helemaal — probeer het nog eens!</span>
          <button className="iep-next-btn" onClick={handleRetry}>↩ Opnieuw</button>
        </div>
      )}
    </div>
  )
}

// ========== Overview screen ==========
function OverviewScreen({ correctCount, wrongCount, questionStats, onContinue }) {
  const total = correctCount + wrongCount
  const pct   = total > 0 ? Math.round((correctCount / total) * 100) : 0

  // Aggregate per doel
  const doelStats = {}
  Object.values(questionStats).forEach(({ correct, wrong, doel }) => {
    if (correct + wrong === 0) return
    if (!doelStats[doel]) doelStats[doel] = { correct: 0, wrong: 0 }
    doelStats[doel].correct += correct
    doelStats[doel].wrong   += wrong
  })

  const attempted = DOEL_DEFS.filter(d => doelStats[d.key])

  function badge(s) {
    const tot = s.correct + s.wrong
    const p   = Math.round((s.correct / tot) * 100)
    if (tot < 2) return { label: 'Bezig…',       icon: '🔄', color: '#94a3b8' }
    if (p >= 60)  return { label: 'Gaat goed!',   icon: '✅', color: '#34d399' }
    return             { label: 'Nog lastig',    icon: '⚠️', color: '#f87171' }
  }

  return (
    <div className="iep-overview-screen">
      <div className="iep-ov-icon">🌟</div>
      <h2 className="iep-ov-title">Na 10 vragen</h2>

      {/* Overall score */}
      <div className="iep-ov-totals">
        <span className="iep-ov-tot-good">✅ {correctCount} goed</span>
        <span className="iep-ov-tot-bad">❌ {wrongCount} fout</span>
      </div>
      <div className="iep-ov-pct-wrap">
        <div className="iep-ov-pct-bar" style={{ width: `${pct}%` }} />
      </div>
      <p className="iep-ov-pct-label">{pct}% goed beantwoord</p>

      {/* Per-doel breakdown */}
      {attempted.length > 0 && (
        <>
          <h3 className="iep-ov-sub">Jouw doelen</h3>
          <div className="iep-ov-grid">
            {attempted.map(d => {
              const s  = doelStats[d.key]
              const tot = s.correct + s.wrong
              const p   = Math.round((s.correct / tot) * 100)
              const b   = badge(s)
              return (
                <div key={d.key} className="iep-ov-card">
                  <span className="iep-ov-card-emoji">{d.emoji}</span>
                  <span className="iep-ov-card-label">{d.label}</span>
                  <div className="iep-ov-card-bar-wrap">
                    <div className="iep-ov-card-bar" style={{ width: `${p}%`, background: b.color }} />
                  </div>
                  <span className="iep-ov-card-stat">{s.correct}/{tot} goed</span>
                  <span className="iep-ov-card-badge" style={{ color: b.color }}>
                    {b.icon} {b.label}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      <button className="iep-launch-btn" style={{ marginTop: 24 }} onClick={onContinue}>
        Verder! 🚀
      </button>
    </div>
  )
}

// ========== Reward screen ==========
function RewardScreen({ onLaunch, streak }) {
  return (
    <div className="iep-reward-screen">
      <div className="iep-reward-icon">🚀</div>
      <h2>Jetpack verdiend!</h2>
      <p>2 vragen goed! Vlieg zo ver mogelijk — daarna gaan we door.</p>
      {streak >= 4 && <p style={{ color: '#fbbf24', fontWeight: 700 }}>🔥 {streak} op rij! Geweldig!</p>}
      <button className="iep-launch-btn" onClick={onLaunch}>🚀 Start Jetpack!</button>
    </div>
  )
}

// ========== Jetpack embed ==========
function JetpackEmbed({ onDone }) {
  useEffect(() => {
    function onMsg(e) {
      if (e.data && e.data.type === 'jetpack-gameover') {
        setTimeout(onDone, 2200)
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [onDone])

  return (
    <div className="iep-jetpack-wrap">
      <iframe src="/jetpack/index.html" title="Jetpack" allow="autoplay" />
      <div className="iep-jetpack-hint">Je gaat automatisch verder na het spel ✈️</div>
    </div>
  )
}

// ========== Main component ==========
export default function IepOefenen({ onBack }) {
  const [screen,               setScreen]               = useState('levels')
  const [level,                setLevel]                = useState(null)
  const [questions,            setQuestions]            = useState([])
  const [order,                setOrder]                = useState([])
  const [qIndex,               setQIndex]               = useState(0)
  const [loading,              setLoading]              = useState(false)
  const [streak,               setStreak]               = useState(0)

  // Stats
  const [correctCount,         setCorrectCount]         = useState(0)
  const [wrongCount,           setWrongCount]           = useState(0)
  const [correctSinceLastPlay, setCorrectSinceLastPlay] = useState(0)
  const [totalAnswered,        setTotalAnswered]        = useState(0)
  const [questionStats,        setQuestionStats]        = useState({}) // id → {correct,wrong,doel}

  // What to do after the overview screen closes
  const [postOverviewAction,   setPostOverviewAction]   = useState(null) // 'reward'|'advance'|'stay'

  const currentQ = questions.length > 0 && order.length > 0 ? questions[order[qIndex]] : null

  // ---- Load level ----
  async function startLevel(lvl) {
    setLevel(lvl)
    setLoading(true)
    try {
      const res  = await fetch(lvl.file)
      const data = await res.json()
      const stats = {}
      data.forEach(q => { stats[q.id] = { correct: 0, wrong: 0, doel: categorizeDoel(q) } })
      setQuestions(data)
      setOrder(shuffleArray(data.map((_, i) => i)))
      setQIndex(0)
      setStreak(0)
      setCorrectCount(0)
      setWrongCount(0)
      setCorrectSinceLastPlay(0)
      setTotalAnswered(0)
      setQuestionStats(stats)
      setScreen('questions')
    } catch (e) {
      console.error('Laden mislukt:', e)
    } finally {
      setLoading(false)
    }
  }

  // ---- Update per-question stats ----
  function bumpStats(qId, doel, isCorrect) {
    setQuestionStats(prev => {
      const cur = prev[qId] || { correct: 0, wrong: 0, doel }
      return { ...prev, [qId]: {
        ...cur,
        correct: cur.correct + (isCorrect ? 1 : 0),
        wrong:   cur.wrong   + (isCorrect ? 0 : 1),
      }}
    })
  }

  // ---- Advance to next question (or loop) ----
  function doAdvance() {
    const next = qIndex + 1
    if (next >= order.length) {
      setOrder(shuffleArray(questions.map((_, i) => i)))
      setQIndex(0)
    } else {
      setQIndex(next)
    }
  }

  // ---- Correct answer ----
  function handleCorrect() {
    if (!currentQ) return
    const newCS = correctSinceLastPlay + 1
    const newTA = totalAnswered + 1
    setCorrectCount(c => c + 1)
    setCorrectSinceLastPlay(newCS)
    setTotalAnswered(newTA)
    setStreak(s => s + 1)
    bumpStats(currentQ.id, categorizeDoel(currentQ), true)

    if (newTA % 10 === 0) {
      // Overview interrupts — decide what happens after
      const action = newCS >= 2 ? 'reward' : 'advance'
      if (action === 'reward') setCorrectSinceLastPlay(0)
      setPostOverviewAction(action)
      setScreen('overview')
    } else if (newCS >= 2) {
      setCorrectSinceLastPlay(0)
      setScreen('reward')
    } else {
      doAdvance()
      // screen stays 'questions', QuestionCard gets new key
    }
  }

  // ---- Wrong answer ----
  // Called from QuestionCard after card resets itself
  function handleWrong() {
    if (!currentQ) return
    const newTA = totalAnswered + 1
    setWrongCount(w => w + 1)
    setTotalAnswered(newTA)
    setStreak(0)
    bumpStats(currentQ.id, categorizeDoel(currentQ), false)

    if (newTA % 10 === 0) {
      setPostOverviewAction('stay')
      setScreen('overview')
    }
    // else: card is already reset internally — same question stays
  }

  // ---- After overview ----
  function handleOverviewContinue() {
    const action = postOverviewAction
    setPostOverviewAction(null)
    if (action === 'reward') {
      setScreen('reward')
    } else if (action === 'advance') {
      doAdvance()
      setScreen('questions')
    } else {
      // 'stay' → same question
      setScreen('questions')
    }
  }

  // ---- Jetpack ----
  const handleJetpackDone = useCallback(() => {
    const next = qIndex + 1
    if (next >= order.length) {
      setOrder(shuffleArray(questions.map((_, i) => i)))
      setQIndex(0)
    } else {
      setQIndex(next)
    }
    setScreen('questions')
  }, [qIndex, order.length, questions])

  return (
    <div className="iep-wrap">
      <Stars />
      <button className="iep-back" onClick={onBack}>← Menu</button>

      {loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.75)', color: '#a78bfa',
          fontSize: '1.4rem', fontWeight: 700, flexDirection: 'column', gap: 16,
        }}>
          <div style={{ fontSize: '3rem', animation: 'iep-float 1s ease-in-out infinite' }}>🚀</div>
          Vragen laden…
        </div>
      )}

      {screen === 'levels' && <LevelSelect onSelect={startLevel} />}

      {screen === 'questions' && currentQ && (
        <div className="iep-question-screen">
          {/* Progress bar */}
          <div>
            <div className="iep-progress-bar-wrap">
              <div className="iep-progress-bar" style={{ width: `${(qIndex / order.length) * 100}%` }} />
            </div>
            <div className="iep-progress-label">Vraag {qIndex + 1} van {order.length}</div>
          </div>

          {/* Counter row */}
          <div className="iep-counter-row">
            <span className="iep-cnt iep-cnt-good">✅ {correctCount} goed</span>
            <span className="iep-cnt iep-cnt-bad">❌ {wrongCount} fout</span>
            <span className="iep-cnt iep-cnt-play">
              🚀 {correctSinceLastPlay}/2
            </span>
          </div>

          {/* Streak */}
          {streak >= 2 && (
            <div className="iep-streak">
              {streak >= 5 ? `🔥🔥 ${streak} op rij!!` : streak >= 3 ? `🔥 ${streak} op rij!` : `⭐ ${streak} goed!`}
            </div>
          )}

          <QuestionCard
            key={`${level?.num}-${order[qIndex]}`}
            q={currentQ}
            onCorrect={handleCorrect}
            onWrong={handleWrong}
          />
        </div>
      )}

      {screen === 'overview' && (
        <OverviewScreen
          correctCount={correctCount}
          wrongCount={wrongCount}
          questionStats={questionStats}
          onContinue={handleOverviewContinue}
        />
      )}

      {screen === 'reward' && (
        <RewardScreen onLaunch={() => setScreen('jetpack')} streak={streak} />
      )}

      {screen === 'jetpack' && <JetpackEmbed onDone={handleJetpackDone} />}
    </div>
  )
}
