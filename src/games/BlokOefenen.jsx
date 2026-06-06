import { useState, useRef, useEffect } from 'react'
import { answersMatch } from './iepQuestions'
import { BLOK9 } from './blok9'
import './blok-oefenen.css'

// Alle beschikbare blokken (later uitbreiden)
const BLOKKEN = [
  { nr: 9, data: BLOK9, beschikbaar: true },
  { nr: 8, data: null,  beschikbaar: false },
  { nr: 7, data: null,  beschikbaar: false },
]

// ── Blok-keuze ──────────────────────────────────────────────────────────
function BlokSelect({ level, onPick, onBack }) {
  return (
    <div className="bk-screen">
      <button className="bk-back-btn" onClick={onBack}>← Terug</button>
      <div className="bk-icon">📚</div>
      <h1 className="bk-title">Kies een blok</h1>
      <p className="bk-sub">{level === 'FS' ? 'Oefenen FS' : 'Oefenen S+'}</p>
      <div className="bk-grid">
        {BLOKKEN.map(b => (
          <button
            key={b.nr}
            className={`bk-card ${b.beschikbaar ? '' : 'bk-card-soon'}`}
            onClick={() => b.beschikbaar && onPick(b.nr)}
            disabled={!b.beschikbaar}
          >
            <span className="bk-card-nr">Blok {b.nr}</span>
            {!b.beschikbaar && <span className="bk-card-soon-label">Binnenkort</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── FS / S+ keuze ────────────────────────────────────────────────────────
function LevelSelect({ onPick, onBack }) {
  return (
    <div className="bk-screen">
      <button className="bk-back-btn" onClick={onBack}>← Menu</button>
      <div className="bk-icon">🧮</div>
      <h1 className="bk-title">Rekenen oefenen</h1>
      <p className="bk-sub">Kies jouw niveau</p>
      <div className="bk-level-row">
        <button className="bk-level-card bk-fs" onClick={() => onPick('FS')}>
          <span className="bk-lc-badge">FS</span>
          <span className="bk-lc-name">Functioneel<br/>Sommen</span>
        </button>
        <button className="bk-level-card bk-splus" onClick={() => onPick('Splus')}>
          <span className="bk-lc-badge">S+</span>
          <span className="bk-lc-name">Sterke<br/>Sommen</span>
        </button>
      </div>
    </div>
  )
}

// ── Doel-keuze ──────────────────────────────────────────────────────────
function DoelSelect({ level, blokNr, onPick, onBack }) {
  const blok = BLOKKEN.find(b => b.nr === blokNr)
  const data = blok?.data?.[level]
  if (!data) return null
  return (
    <div className="bk-screen">
      <button className="bk-back-btn" onClick={onBack}>← Terug</button>
      <div className="bk-icon">🎯</div>
      <h1 className="bk-title">Blok {blokNr} — {level === 'FS' ? 'FS' : 'S+'}</h1>
      <p className="bk-sub">Kies een doel</p>
      <div className="bk-doel-list">
        {data.doelen.map(d => (
          <button key={d.nr} className="bk-doel-card" onClick={() => onPick(d.nr)}>
            <span className="bk-doel-nr">Doel {d.nr}</span>
            <span className="bk-doel-titel">{d.titel}</span>
            <span className="bk-doel-arrow">→</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Rekenmachine ─────────────────────────────────────────────────────────
function Rekenmachine() {
  const [display, setDisplay] = useState('0')
  const [prev, setPrev] = useState(null)      // vorige waarde
  const [op, setOp] = useState(null)          // gekozen operator
  const [fresh, setFresh] = useState(true)    // volgende cijfer start nieuw getal

  const fmt = (n) => {
    if (!isFinite(n)) return 'Error'
    let s = String(Math.round(n * 1e8) / 1e8)
    return s.replace('.', ',')
  }
  const toNum = (s) => parseFloat(String(s).replace(',', '.'))

  const inputDigit = (d) => {
    if (fresh) { setDisplay(d); setFresh(false) }
    else { if (display.replace(/[-,]/g, '').length < 12) setDisplay(display === '0' ? d : display + d) }
  }
  const inputComma = () => {
    if (fresh) { setDisplay('0,'); setFresh(false); return }
    if (!display.includes(',')) setDisplay(display + ',')
  }
  const compute = (a, b, o) => {
    switch (o) {
      case '+': return a + b
      case '−': return a - b
      case '×': return a * b
      case ':': return a / b
      default:  return b
    }
  }
  const chooseOp = (o) => {
    const cur = toNum(display)
    if (op && !fresh) {
      const r = compute(prev, cur, op)
      setPrev(r); setDisplay(fmt(r))
    } else {
      setPrev(cur)
    }
    setOp(o); setFresh(true)
  }
  const equals = () => {
    if (op == null) return
    const cur = toNum(display)
    const r = compute(prev, cur, op)
    setDisplay(fmt(r)); setPrev(null); setOp(null); setFresh(true)
  }
  const clear = () => { setDisplay('0'); setPrev(null); setOp(null); setFresh(true) }
  const backspace = () => {
    if (fresh) return
    const s = display.length > 1 ? display.slice(0, -1) : '0'
    setDisplay(s === '' || s === '-' ? '0' : s)
  }

  const Btn = ({ label, onClick, cls = '' }) => (
    <button className={`bk-calc-btn ${cls}`} onClick={onClick}>{label}</button>
  )

  return (
    <div className="bk-calc">
      <div className="bk-calc-display">
        <span className="bk-calc-op">{op || ''}</span>
        <span className="bk-calc-num">{display}</span>
      </div>
      <div className="bk-calc-grid">
        <Btn label="C"  cls="bk-calc-fn"  onClick={clear} />
        <Btn label="⌫"  cls="bk-calc-fn"  onClick={backspace} />
        <Btn label=":"  cls="bk-calc-op-btn" onClick={() => chooseOp(':')} />
        <Btn label="×"  cls="bk-calc-op-btn" onClick={() => chooseOp('×')} />

        <Btn label="7" onClick={() => inputDigit('7')} />
        <Btn label="8" onClick={() => inputDigit('8')} />
        <Btn label="9" onClick={() => inputDigit('9')} />
        <Btn label="−" cls="bk-calc-op-btn" onClick={() => chooseOp('−')} />

        <Btn label="4" onClick={() => inputDigit('4')} />
        <Btn label="5" onClick={() => inputDigit('5')} />
        <Btn label="6" onClick={() => inputDigit('6')} />
        <Btn label="+" cls="bk-calc-op-btn" onClick={() => chooseOp('+')} />

        <Btn label="1" onClick={() => inputDigit('1')} />
        <Btn label="2" onClick={() => inputDigit('2')} />
        <Btn label="3" onClick={() => inputDigit('3')} />
        <Btn label="=" cls="bk-calc-eq" onClick={equals} />

        <Btn label="0" cls="bk-calc-zero" onClick={() => inputDigit('0')} />
        <Btn label="," onClick={inputComma} />
      </div>
    </div>
  )
}

// ── Hulp-overlay (screenshot uit het werkblad) ───────────────────────────
function HulpPanel({ img, onClose }) {
  return (
    <div className="bk-hulp-overlay" onClick={onClose}>
      <div className="bk-hulp-panel" onClick={e => e.stopPropagation()}>
        <div className="bk-hulp-header">
          <span>💡 Hulp uit het werkblad</span>
          <button className="bk-hulp-close" onClick={onClose}>✕</button>
        </div>
        <div className="bk-hulp-img-wrap">
          <img className="bk-hulp-img" src={img} alt="Hulp uit het werkblad" />
        </div>
      </div>
    </div>
  )
}

// ── Vraagkaart ──────────────────────────────────────────────────────────
function VraagKaart({ q, intro, onNext }) {
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState('answering')
  const inputRef = useRef(null)

  useEffect(() => { setInput(''); setPhase('answering'); setTimeout(() => inputRef.current?.focus(), 50) }, [q])

  const check = () => { if (input.trim()) setPhase(answersMatch(input, q.antwoord) ? 'good' : 'bad') }

  return (
    <div className="bk-vraag-card">
      {intro && <div className="bk-intro">{intro}</div>}
      <div className="bk-vraag-tekst">{q.vraag}</div>

      {phase === 'answering' && (
        <div className="bk-antwoord-row">
          <input
            ref={inputRef}
            className="bk-input"
            type="text"
            inputMode="decimal"
            placeholder="Jouw antwoord…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && check()}
          />
          <button className="bk-check-btn" onClick={check}>Controleer →</button>
        </div>
      )}

      {phase === 'good' && (
        <div className="bk-feedback bk-goed">
          <span>🎉 Goed! Het antwoord is <strong>{q.antwoord}</strong>.</span>
          <button className="bk-verder-btn" onClick={onNext}>Verder →</button>
        </div>
      )}

      {phase === 'bad' && (
        <div className="bk-feedback bk-fout">
          <span>❌ Niet goed — jij had <strong>{input || '—'}</strong></span>
          <span>✅ Het juiste antwoord is <strong>{q.antwoord}</strong></span>
          <button className="bk-verder-btn" onClick={onNext}>Volgende →</button>
        </div>
      )}
    </div>
  )
}

// ── Oefenscherm ──────────────────────────────────────────────────────────
function Oefenen({ level, blokNr, doelNr, addBriefgeld, onBack }) {
  const blok = BLOKKEN.find(b => b.nr === blokNr)
  const doel = blok?.data?.[level]?.doelen.find(d => d.nr === doelNr)
  const opgaven = doel?.opgaven ?? []

  const [oi, setOi] = useState(0)
  const [vi, setVi] = useState(0)
  const [reward, setReward] = useState(false)
  const [done, setDone] = useState(false)
  const [verdiend, setVerdiend] = useState(0)
  const [showHulp, setShowHulp] = useState(false)

  const opgave = opgaven[oi]
  const vraag  = opgave?.vragen[vi]
  const voortgang = opgaven.length ? (oi / opgaven.length) * 100 : 0
  // Hulp-screenshot uit het werkblad: bestandsnaam = niveau + doelnummer
  const hulpImg = `/hulp/${level === 'FS' ? 'fs' : 'sp'}${doel.nr}.png`

  const next = () => {
    if (vi + 1 < opgave.vragen.length) { setVi(vi + 1); return }
    addBriefgeld?.(100); setVerdiend(v => v + 100); setReward(true)
  }
  const afterReward = () => {
    setReward(false)
    if (oi + 1 < opgaven.length) { setOi(oi + 1); setVi(0) }
    else setDone(true)
  }

  if (done) return (
    <div className="bk-screen">
      <div className="bk-icon">🏆</div>
      <h2 className="bk-title">Doel {doel.nr} klaar!</h2>
      <p className="bk-sub">Je hebt € {verdiend} briefgeld verdiend 💵</p>
      <button className="bk-primary-btn" onClick={onBack}>← Terug naar doelen</button>
    </div>
  )

  if (reward) return (
    <div className="bk-screen">
      <div className="bk-icon bk-bounce">💵</div>
      <h2 className="bk-title">Opgave {opgave.nr} af!</h2>
      <p className="bk-sub">Je verdient € 100 briefgeld! 🎉</p>
      <button className="bk-primary-btn" onClick={afterReward}>Verder →</button>
    </div>
  )

  return (
    <div className="bk-oefen-wrap">
      {showHulp && <HulpPanel img={hulpImg} onClose={() => setShowHulp(false)} />}

      {/* Header */}
      <div className="bk-oefen-header">
        <button className="bk-back-btn bk-back-inline" onClick={onBack}>← Terug</button>
        <div className="bk-oefen-title">Blok {blokNr} · {level} · Doel {doel.nr}</div>
        <button className="bk-hulp-btn" onClick={() => setShowHulp(true)}>💡 Hulp</button>
      </div>

      {/* Voortgang */}
      <div className="bk-voortgang-wrap">
        <div className="bk-voortgang-bar" style={{ width: `${voortgang}%` }} />
      </div>
      <div className="bk-oefen-meta">
        <span>Opgave {oi + 1} van {opgaven.length}</span>
        <span className="bk-verdiend">💵 € {verdiend}</span>
      </div>

      <VraagKaart key={`${oi}-${vi}`} q={vraag} intro={vi === 0 ? opgave.intro : null} onNext={next} />

      {doel.rekenmachine && <Rekenmachine />}
    </div>
  )
}

// ── Hoofdcomponent ───────────────────────────────────────────────────────
export default function BlokOefenen({ onBack, addBriefgeld }) {
  const [level,  setLevel]  = useState(null)
  const [blokNr, setBlokNr] = useState(null)
  const [doelNr, setDoelNr] = useState(null)

  return (
    <div className="bk-wrap">
      {!level && (
        <LevelSelect onPick={setLevel} onBack={onBack} />
      )}
      {level && blokNr == null && (
        <BlokSelect level={level} onPick={setBlokNr} onBack={() => setLevel(null)} />
      )}
      {level && blokNr != null && doelNr == null && (
        <DoelSelect level={level} blokNr={blokNr} onPick={setDoelNr} onBack={() => setBlokNr(null)} />
      )}
      {level && blokNr != null && doelNr != null && (
        <Oefenen
          level={level} blokNr={blokNr} doelNr={doelNr}
          addBriefgeld={addBriefgeld}
          onBack={() => setDoelNr(null)}
        />
      )}
    </div>
  )
}
