import { useState, useRef, useEffect } from 'react'
import { answersMatch } from './iepQuestions'
import { BLOK9 } from './blok9'
import './iep-oefenen.css'

// ── Niveau-keuze (FS / S+) ──────────────────────────────────────────────
function LevelSelect({ onPick, onBack }) {
  return (
    <div className="iep-level-screen">
      <div className="iep-rocket-icon">📘</div>
      <h1>Oefenen blok 9</h1>
      <p>Kies welk werkblad je wilt oefenen</p>
      <div className="iep-level-cards">
        <button className="iep-level-card" onClick={() => onPick('FS')}>
          <span className="iep-lc-emoji">🟦</span>
          <span className="iep-lc-title">Oefenen FS</span>
        </button>
        <button className="iep-level-card" onClick={() => onPick('Splus')}>
          <span className="iep-lc-emoji">⭐</span>
          <span className="iep-lc-title">Oefenen S+</span>
        </button>
      </div>
      <button className="iep-next-btn" style={{ marginTop: 26 }} onClick={onBack}>← Terug</button>
    </div>
  )
}

// ── Doel-keuze ──────────────────────────────────────────────────────────
function DoelSelect({ level, onPick, onBack }) {
  const data = BLOK9[level]
  return (
    <div className="iep-level-screen">
      <div className="iep-rocket-icon">🎯</div>
      <h1>{data.label}</h1>
      <p>Aan welk doel wil je werken?</p>
      <div className="iep-level-cards" style={{ flexDirection: 'column' }}>
        {data.doelen.map(d => (
          <button key={d.nr} className="iep-level-card" style={{ minWidth: 280 }} onClick={() => onPick(d.nr)}>
            <span className="iep-lc-emoji">📐</span>
            <span className="iep-lc-title">Doel {d.nr}</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.85, padding: '0 10px', textAlign: 'center' }}>{d.titel}</span>
          </button>
        ))}
      </div>
      <button className="iep-next-btn" style={{ marginTop: 26 }} onClick={onBack}>← Terug</button>
    </div>
  )
}

// ── Vraagkaart ──────────────────────────────────────────────────────────
function VraagKaart({ q, intro, onNext }) {
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState('answering')   // answering | good | bad
  const inputRef = useRef(null)

  useEffect(() => { setInput(''); setPhase('answering'); inputRef.current?.focus() }, [q])

  const check = () => { if (input.trim()) setPhase(answersMatch(input, q.antwoord) ? 'good' : 'bad') }

  return (
    <div className="iep-card">
      {intro && <div className="iep-context"><span>{intro}</span></div>}
      <div className="iep-question-text">{q.vraag}</div>

      {phase === 'answering' && (
        <div className="iep-open-row">
          <input ref={inputRef} className="iep-open-input" type="text" inputMode="decimal"
            placeholder="Jouw antwoord…" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && check()} />
          <button className="iep-check-btn" onClick={check}>Controleer →</button>
        </div>
      )}
      {phase === 'good' && (
        <div className="iep-feedback good">
          <span>🎉 Goed! Het antwoord is {q.antwoord}.</span>
          <button className="iep-next-btn" onClick={onNext}>Verder →</button>
        </div>
      )}
      {phase === 'bad' && (
        <div className="iep-feedback bad">
          <span className="iep-wrong-line">❌ Niet goed — jij had <strong>{input || '—'}</strong>.</span>
          <span className="iep-correct-answer">✅ Het juiste antwoord is <strong>{q.antwoord}</strong></span>
          <button className="iep-next-btn" onClick={onNext}>Volgende →</button>
        </div>
      )}
    </div>
  )
}

// ── Oefenscherm (loopt door de opgaven van een doel) ────────────────────
function Oefenen({ level, doelNr, addBriefgeld, onBack }) {
  const doel = BLOK9[level].doelen.find(d => d.nr === doelNr)
  const opgaven = doel.opgaven
  const [oi, setOi] = useState(0)        // opgave-index
  const [vi, setVi] = useState(0)        // vraag-index binnen opgave
  const [reward, setReward] = useState(false)   // "opgave af + €100" tussenscherm
  const [done, setDone] = useState(false)
  const [verdiend, setVerdiend] = useState(0)

  const opgave = opgaven[oi]
  const vraag = opgave?.vragen[vi]

  const next = () => {
    if (vi + 1 < opgave.vragen.length) { setVi(vi + 1); return }
    // opgave af → €100
    addBriefgeld?.(100)
    setVerdiend(v => v + 100)
    setReward(true)
  }

  const afterReward = () => {
    setReward(false)
    if (oi + 1 < opgaven.length) { setOi(oi + 1); setVi(0) }
    else setDone(true)
  }

  if (done) {
    return (
      <div className="iep-overview-screen">
        <div className="iep-ov-icon">🏆</div>
        <h2 className="iep-ov-title">Doel {doel.nr} klaar!</h2>
        <p className="iep-ov-pct-label">Je hebt € {verdiend} briefgeld verdiend 💵</p>
        <button className="iep-launch-btn" style={{ marginTop: 24 }} onClick={onBack}>← Terug</button>
      </div>
    )
  }

  if (reward) {
    return (
      <div className="iep-reward-screen">
        <div className="iep-reward-icon">💵</div>
        <h2>Opgave {opgave.nr} af!</h2>
        <p>Je verdient € 100 briefgeld! 🎉</p>
        <button className="iep-launch-btn" onClick={afterReward}>Verder →</button>
      </div>
    )
  }

  return (
    <div className="iep-question-screen">
      <div>
        <div className="iep-progress-bar-wrap">
          <div className="iep-progress-bar" style={{ width: `${(vi / opgave.vragen.length) * 100}%` }} />
        </div>
        <div className="iep-progress-label">Opgave {opgave.nr} — vraag {vi + 1} van {opgave.vragen.length}</div>
      </div>
      <div className="iep-counter-row">
        <span className="iep-cnt iep-cnt-play">💵 € {verdiend} verdiend</span>
        <span className="iep-cnt">Opgave {oi + 1}/{opgaven.length}</span>
      </div>
      <VraagKaart key={`${oi}-${vi}`} q={vraag} intro={vi === 0 ? opgave.intro : null} onNext={next} />
    </div>
  )
}

// ── Hoofdcomponent ──────────────────────────────────────────────────────
export default function BlokOefenen({ onBack, addBriefgeld }) {
  const [level, setLevel] = useState(null)
  const [doelNr, setDoelNr] = useState(null)

  return (
    <div className="iep-wrap">
      <button className="iep-back" onClick={onBack}>← Menu</button>
      {!level && <LevelSelect onPick={setLevel} onBack={onBack} />}
      {level && doelNr == null && <DoelSelect level={level} onPick={setDoelNr} onBack={() => setLevel(null)} />}
      {level && doelNr != null && (
        <Oefenen level={level} doelNr={doelNr} addBriefgeld={addBriefgeld} onBack={() => setDoelNr(null)} />
      )}
    </div>
  )
}
