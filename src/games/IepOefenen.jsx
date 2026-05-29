import { useState, useEffect, useRef, useCallback } from 'react'
import './iep-oefenen.css'

// ---------- Stars background ----------
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
        <div
          key={s.id}
          className="iep-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            '--dur': `${s.dur}s`,
            '--delay': `${s.delay}s`,
            '--op': s.op,
          }}
        />
      ))}
    </div>
  )
}

// ---------- Level selector ----------
const LEVELS = [
  { num: 1, emoji: '🌙', label: 'Niveau 1', desc: 'Minder dan 1F', file: '/iep_niveau1.json' },
  { num: 2, emoji: '⭐', label: 'Niveau 2', desc: '1F + 1S basis', file: '/iep_niveau2.json' },
  { num: 3, emoji: '🚀', label: 'Niveau 3', desc: '1F + 1S gevorderd', file: '/iep_niveau3.json' },
]

function LevelSelect({ onSelect }) {
  return (
    <div className="iep-level-screen">
      <div className="iep-rocket-icon">🚀</div>
      <h1>IEP Oefenen</h1>
      <p>Beantwoord een rekenvraag en verdien Jetpack-tijd!</p>
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

// ---------- Shuffle helper ----------
function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---------- Question card ----------
function QuestionCard({ q, onCorrect, onWrong }) {
  const [input, setInput]       = useState('')
  const [phase, setPhase]       = useState('answering') // answering | honor | feedback-good | feedback-bad
  const [chosenOption, setChosenOption] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    setInput('')
    setPhase('answering')
    setChosenOption(null)
    if (inputRef.current) inputRef.current.focus()
  }, [q.id])

  function handleMC(opt) {
    setChosenOption(opt)
    setPhase('honor')
  }

  function handleCheck() {
    if (!input.trim()) return
    setPhase('honor')
  }

  function handleHonor(correct) {
    if (correct) {
      setPhase('feedback-good')
    } else {
      setPhase('feedback-bad')
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleCheck()
  }

  return (
    <div className="iep-card">
      {/* Context */}
      {(q.contextText || q.contextImage) && (
        <div className="iep-context">
          {q.contextText && <span>{q.contextText}</span>}
          {q.contextImage && <img src={q.contextImage} alt="opgave afbeelding" />}
        </div>
      )}

      {/* Question */}
      <div className="iep-question-text">{q.questionText}</div>

      {/* Answer input */}
      {phase === 'answering' && (
        <>
          {q.type === 'mc' ? (
            <div className="iep-mc-options">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  className="iep-mc-btn"
                  onClick={() => handleMC(opt)}
                >
                  {opt}
                </button>
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
                onKeyDown={handleKeyDown}
              />
              <button className="iep-check-btn" onClick={handleCheck}>Controleer →</button>
            </div>
          )}
        </>
      )}

      {/* Honor check — for both MC and open */}
      {phase === 'honor' && (
        <div className="iep-honor-check">
          <p>
            {q.type === 'mc'
              ? <>Jij koos: <strong>{chosenOption}</strong></>
              : <>Jouw antwoord: <strong>{input}</strong></>
            }
          </p>
          <p>Klopt jouw antwoord?</p>
          <div className="iep-honor-row">
            <button className="iep-honor-yes" onClick={() => handleHonor(true)}>✅ Ja, goed!</button>
            <button className="iep-honor-no" onClick={() => handleHonor(false)}>❌ Nee, fout</button>
          </div>
        </div>
      )}

      {/* Feedback — correct */}
      {phase === 'feedback-good' && (
        <div className="iep-feedback good">
          <span>🎉 Super goed! Je verdient Jetpack-tijd!</span>
          <button className="iep-next-btn" onClick={onCorrect}>🚀 Spelen!</button>
        </div>
      )}

      {/* Feedback — wrong */}
      {phase === 'feedback-bad' && (
        <div className="iep-feedback bad">
          <span>😅 Niet helemaal goed — probeer het nog eens!</span>
          <button className="iep-next-btn" onClick={onWrong}>↩ Opnieuw</button>
        </div>
      )}
    </div>
  )
}

// ---------- Reward screen ----------
function RewardScreen({ onLaunch }) {
  return (
    <div className="iep-reward-screen">
      <div className="iep-reward-icon">🚀</div>
      <h2>Jetpack verdiend!</h2>
      <p>Geweldig! Vlieg zo ver mogelijk — daarna gaan we door.</p>
      <button className="iep-launch-btn" onClick={onLaunch}>
        🚀 Start Jetpack!
      </button>
    </div>
  )
}

// ---------- Jetpack embed ----------
function JetpackEmbed({ onDone }) {
  const iframeRef = useRef(null)

  useEffect(() => {
    function onMsg(e) {
      if (e.data && e.data.type === 'jetpack-gameover') {
        // short delay so user sees their score on the game canvas
        setTimeout(onDone, 2200)
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [onDone])

  return (
    <div className="iep-jetpack-wrap">
      <iframe
        ref={iframeRef}
        src="/jetpack/index.html"
        title="Jetpack"
        allow="autoplay"
      />
      <div className="iep-jetpack-hint">Je gaat automatisch verder na het spel ✈️</div>
    </div>
  )
}

// ---------- Done screen ----------
function DoneScreen({ level, onRestart, onMenu }) {
  return (
    <div className="iep-done-screen">
      <div style={{ fontSize: '5rem' }}>🏆</div>
      <h2>Alle vragen gedaan!</h2>
      <p>Je hebt alle {level.label}-vragen beantwoord. Goed bezig astronaut!</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="iep-restart-btn" onClick={onRestart}>🔄 Opnieuw</button>
        <button className="iep-menu-btn" onClick={onMenu}>← Menu</button>
      </div>
    </div>
  )
}

// ---------- Main component ----------
export default function IepOefenen({ onBack }) {
  const [screen, setScreen]   = useState('levels')    // levels | questions | reward | jetpack | done
  const [level, setLevel]     = useState(null)
  const [questions, setQuestions] = useState([])
  const [order, setOrder]     = useState([])           // shuffled question indices
  const [qIndex, setQIndex]   = useState(0)            // index into order[]
  const [loading, setLoading] = useState(false)
  const [streak, setStreak]   = useState(0)

  const currentQ = questions.length > 0 && order.length > 0
    ? questions[order[qIndex]]
    : null

  async function startLevel(lvl) {
    setLevel(lvl)
    setLoading(true)
    try {
      const res  = await fetch(lvl.file)
      const data = await res.json()
      const shuffled = shuffleArray(data.map((_, i) => i))
      setQuestions(data)
      setOrder(shuffled)
      setQIndex(0)
      setStreak(0)
      setScreen('questions')
    } catch (err) {
      console.error('Kon vragen niet laden:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleCorrect() {
    setStreak(s => s + 1)
    setScreen('reward')
  }

  function handleWrong() {
    setStreak(0)
    // stay on same question — QuestionCard resets via key/useEffect
    // trigger re-render of QuestionCard by toggling a dummy state
    setScreen('questions') // already on questions, force re-render
  }

  function handleLaunchJetpack() {
    setScreen('jetpack')
  }

  const handleJetpackDone = useCallback(() => {
    const nextIndex = qIndex + 1
    if (nextIndex >= order.length) {
      // Reshuffle and loop infinitely
      setOrder(shuffleArray(questions.map((_, i) => i)))
      setQIndex(0)
      setScreen('questions')
    } else {
      setQIndex(nextIndex)
      setScreen('questions')
    }
  }, [qIndex, order.length, questions])

  function handleRestart() {
    if (level) startLevel(level)
  }

  return (
    <div className="iep-wrap">
      <Stars />
      <button className="iep-back" onClick={onBack}>← Menu</button>

      {loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
          color: '#a78bfa', fontSize: '1.4rem', fontWeight: 700,
          flexDirection: 'column', gap: 16,
        }}>
          <div style={{ fontSize: '3rem', animation: 'iep-float 1s ease-in-out infinite' }}>🚀</div>
          Vragen laden…
        </div>
      )}

      {screen === 'levels' && (
        <LevelSelect onSelect={startLevel} />
      )}

      {screen === 'questions' && currentQ && (
        <div className="iep-question-screen">
          {/* Progress */}
          <div>
            <div className="iep-progress-bar-wrap">
              <div
                className="iep-progress-bar"
                style={{ width: `${((qIndex) / order.length) * 100}%` }}
              />
            </div>
            <div className="iep-progress-label">
              Vraag {qIndex + 1} van {order.length}
            </div>
          </div>

          {/* Streak */}
          <div className="iep-streak">
            {streak >= 3 ? `🔥 ${streak} op rij!` : streak >= 1 ? `⭐ ${streak} goed!` : ''}
          </div>

          <QuestionCard
            key={`${level?.num}-${order[qIndex]}`}
            q={currentQ}
            onCorrect={handleCorrect}
            onWrong={handleWrong}
          />
        </div>
      )}

      {screen === 'reward' && (
        <RewardScreen onLaunch={handleLaunchJetpack} />
      )}

      {screen === 'jetpack' && (
        <JetpackEmbed onDone={handleJetpackDone} />
      )}

      {screen === 'done' && (
        <DoneScreen level={level} onRestart={handleRestart} onMenu={onBack} />
      )}
    </div>
  )
}
