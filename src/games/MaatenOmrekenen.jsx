import { useState, useRef, useEffect, useCallback } from 'react'
import SpelBeloning from './SpelBeloning'
import { useGebruikOpdracht } from './gebruikOpdracht.js'
import OpdrachtKlaarScherm from './OpdrachtKlaarScherm.jsx'
import './verhaaltjes-sommen.css'
import './maten-omrekenen.css'

const PER_BELONING = 5
const BELONING     = 50

const LADDERS = [
  { naam: 'lengte', eenheden: ['km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm'] },
  { naam: 'inhoud', eenheden: ['kl', 'hl', 'dal', 'l', 'dl', 'cl', 'ml'] },
]

const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const pick = arr => arr[Math.floor(Math.random() * arr.length)]
const r6   = x => Math.round(x * 1e6) / 1e6
const fmt  = x => r6(x).toString().replace('.', ',')

function uitlegTekst(from, to, steps, omlaag, value, answer) {
  const factor = Math.pow(10, steps)
  const stapw = steps === 1 ? 'stap' : 'stappen'
  if (omlaag)
    return `Van ${from} naar ${to} zijn ${steps} ${stapw} naar een kleinere maat → keer ${factor}. ${fmt(value)} × ${factor} = ${fmt(answer)}.`
  return `Van ${from} naar ${to} zijn ${steps} ${stapw} naar een grotere maat → delen door ${factor}. ${fmt(value)} : ${factor} = ${fmt(answer)}.`
}

// Bouw één opgave voor het gekozen level (1, 2 of 3).
function maakOpgave(level) {
  const ladder = pick(LADDERS)
  const E = ladder.eenheden            // index 0 = grootste, 6 = kleinste
  const omlaag = Math.random() < 0.5   // grotere → kleinere maat

  if (level === 1 || level === 2) {
    const steps = level === 1 ? rint(1, 2) : rint(2, 4)
    const factor = Math.pow(10, steps)
    let idxFrom, value, answer, to
    if (omlaag) {
      idxFrom = rint(0, 6 - steps)
      value   = level === 1 ? rint(2, 9) : rint(2, 25)
      answer  = value * factor
    } else {
      idxFrom = rint(steps, 6)
      value   = (level === 1 ? rint(2, 9) : rint(2, 25)) * factor
      answer  = value / factor
    }
    to = E[idxFrom + (omlaag ? steps : -steps)]
    const from = E[idxFrom]
    return { ladder: ladder.naam, from, to, value, answer, uitleg: uitlegTekst(from, to, steps, omlaag, value, answer) }
  }

  // Level 3: komma plaatsen of weglaten
  const kommaWeg = Math.random() < 0.5
  const steps = rint(1, 3)
  const factor = Math.pow(10, steps)
  if (kommaWeg) {
    // decimaal in → heel getal uit (omlaag): komma verschuift weg
    const dp = rint(1, Math.min(2, steps))
    const sig = rint(11, 999)                 // betekenisvolle cijfers
    const value = r6(sig / Math.pow(10, dp))  // bv. 2,5
    const idxFrom = rint(0, 6 - steps)
    const from = E[idxFrom], to = E[idxFrom + steps]
    const answer = r6(value * factor)
    return { ladder: ladder.naam, from, to, value, answer, uitleg: uitlegTekst(from, to, steps, true, value, answer) }
  } else {
    // heel getal in → decimaal uit (omhoog): komma erbij plaatsen
    let sig = rint(11, 9999)
    if (sig % factor === 0) sig += 1          // garandeer een komma in het antwoord
    const idxFrom = rint(steps, 6)
    const from = E[idxFrom], to = E[idxFrom - steps]
    const answer = r6(sig / factor)
    return { ladder: ladder.naam, from, to, value: sig, answer, uitleg: uitlegTekst(from, to, steps, false, sig, answer) }
  }
}

// Trappetje: lengte- of inhoudmaten, ×10 omlaag / :10 omhoog
function Trap({ kind }) {
  const units = kind === 'inhoud'
    ? [['kl', 'm³'], ['hl'], ['dal'], ['l', 'dm³'], ['dl'], ['cl'], ['ml', 'cm³']]
    : [['km'], ['hm'], ['dam'], ['m'], ['dm'], ['cm'], ['mm']]
  const sw = 64, sh = 40, x0 = 26, y0 = 36
  const n = units.length
  let d = `M ${x0} ${y0}`
  for (let i = 0; i < n; i++) d += ` h ${sw} v ${sh}`
  const W = x0 + n * sw + 36, H = y0 + n * sh + 16
  return (
    <svg className="mo-trap" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }}>
      <defs>
        <marker id="mo-rood" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 z" fill="#ef4444" />
        </marker>
        <marker id="mo-blauw" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 z" fill="#3b82f6" />
        </marker>
      </defs>
      <path d={d} fill="none" stroke="#fffbeb" strokeWidth="3" strokeLinejoin="miter" />
      {units.map((u, i) => (
        <text key={i} x={x0 + i * sw + 8} y={y0 + i * sh - 9} fill="#fffbeb" fontSize="19" fontWeight="700">
          {u[0]}{u[1] && <> = {u[1].slice(0, -1)}<tspan baselineShift="super" fontSize="12">3</tspan></>}
        </text>
      ))}
      <line x1={x0 + sw * 2.4} y1={y0 + sh * 0.5} x2={x0 + sw * 3.3} y2={y0 + sh * 1.5}
        stroke="#ef4444" strokeWidth="3.5" markerEnd="url(#mo-rood)" />
      <text x={x0 + sw * 2.5} y={y0 + sh * 0.35} fill="#ef4444" fontSize="20" fontWeight="800">× 10</text>
      <line x1={x0 + sw * 3.1} y1={y0 + sh * 5.2} x2={x0 + sw * 2.2} y2={y0 + sh * 4.2}
        stroke="#3b82f6" strokeWidth="3.5" markerEnd="url(#mo-blauw)" />
      <text x={x0 + sw * 2.2} y={y0 + sh * 5.6} fill="#3b82f6" fontSize="20" fontWeight="800">: 10</text>
    </svg>
  )
}

function VraagKaart({ opgave, onNext }) {
  const [antw, setAntw] = useState('')
  const [phase, setPhase] = useState('answering')
  const [hulp, setHulp] = useState(false)
  const ref = useRef(null)

  useEffect(() => { setAntw(''); setPhase('answering'); setHulp(false); setTimeout(() => ref.current?.focus(), 50) }, [opgave])

  const check = () => {
    if (!antw.trim()) return
    const v = parseFloat(antw.replace(',', '.').replace(/\s/g, ''))
    setPhase(!isNaN(v) && Math.abs(v - opgave.answer) < 1e-6 ? 'good' : 'bad')
  }

  return (
    <div className="rs-card">
      <div className="rs-vraag" style={{ fontSize: '1.6em', textAlign: 'center' }}>
        {fmt(opgave.value)} {opgave.from} &nbsp;=&nbsp; ? &nbsp;{opgave.to}
      </div>

      {phase === 'answering' && (
        <div className="rs-velden">
          <div className="rs-veld">
            <label className="rs-veld-label">Antwoord in {opgave.to}</label>
            <div className="rs-antwoord-row">
              <input ref={ref} className="rs-input" type="text" inputMode="decimal" autoComplete="off"
                placeholder="Jouw antwoord…" value={antw}
                onChange={e => setAntw(e.target.value)} onKeyDown={e => e.key === 'Enter' && check()} />
              <button className="rs-check-btn" onClick={check}>Controleer →</button>
            </div>
          </div>
          <button className="mo-hulp-btn" onClick={() => setHulp(h => !h)}>
            {hulp ? '🙈 Verberg hulp' : '💡 Hulp: trappetje'}
          </button>
          {hulp && <div className="mo-trap-wrap"><Trap kind={opgave.ladder} /></div>}
        </div>
      )}

      {phase === 'good' && (
        <div className="rs-feedback rs-goed">
          <span>🎉 Goed! {fmt(opgave.value)} {opgave.from} = {fmt(opgave.answer)} {opgave.to}</span>
          <div className="rs-uitleg">💡 {opgave.uitleg}</div>
          <button className="rs-verder-btn" onClick={() => onNext(true)}>Verder →</button>
        </div>
      )}

      {phase === 'bad' && (
        <div className="rs-feedback rs-fout">
          <span>❌ Het juiste antwoord is <b>{fmt(opgave.answer)} {opgave.to}</b>.</span>
          <div className="rs-uitleg">💡 {opgave.uitleg}</div>
          <button className="rs-verder-btn" onClick={() => onNext(false)}>Volgende →</button>
        </div>
      )}
    </div>
  )
}

const LEVELS = [
  { n: 1, icon: '🟢', naam: 'Level 1 — makkelijk', desc: '1 of 2 stappen, hele getallen', vb: '5 m = … cm' },
  { n: 2, icon: '🟡', naam: 'Level 2 — lastiger',  desc: 'Meer stappen, grotere getallen', vb: '3 km = … dm' },
  { n: 3, icon: '🔴', naam: 'Level 3 — komma',      desc: 'Komma plaatsen of weglaten', vb: '2,5 m = … cm' },
]

// aantal/config: alleen gezet vanuit een weektaak-opdracht (toolRender.jsx).
// config = { level } — slaat het levelscherm over.
export default function MaatenOmrekenen({ onBack, addBriefgeld, addCuruntie, aantal, config }) {
  const opdracht = useGebruikOpdracht({ toolId: 'maten-omrekenen', aantal })
  const [level, setLevel] = useState(null)
  const [opgave, setOpgave] = useState(null)
  const [sinds, setSinds] = useState(0)
  const [verdiend, setVerdiend] = useState(0)
  const [showReward, setShowReward] = useState(false)

  const start = (n) => { setLevel(n); setSinds(0); setOpgave(maakOpgave(n)) }

  // Vanuit een weektaak-opdracht: levelscherm overslaan.
  useEffect(() => {
    if (!config) return
    const n = Number(config.level) || 1
    setLevel(n); setSinds(0); setOpgave(maakOpgave(n))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const volgende = useCallback((correct) => {
    const zalKlaarZijn = opdracht.aantal != null && (opdracht.gedaan + 1) >= opdracht.aantal
    opdracht.registreer(correct, {
      vraag: opgave ? `${opgave.value} ${opgave.from} = ? ${opgave.to}` : null,
      juist: opgave ? `${opgave.answer} ${opgave.to}` : null,
    })
    if (zalKlaarZijn) return
    if (correct) {
      const ns = sinds + 1
      if (ns >= PER_BELONING) { setSinds(0); setShowReward(true); return }
      setSinds(ns)
    }
    setOpgave(maakOpgave(level))
  }, [sinds, level, opgave, opdracht])

  const naBeloning = () => {
    setShowReward(false)
    addBriefgeld?.(BELONING)
    setVerdiend(v => v + BELONING)
    setOpgave(maakOpgave(level))
  }

  if (showReward) {
    return <SpelBeloning title="5 goed!" geld={BELONING} addCuruntie={addCuruntie} onDone={naBeloning} />
  }

  if (opdracht.klaar) {
    return (
      <OpdrachtKlaarScherm
        goed={opdracht.goed} aantal={opdracht.aantal}
        opslaanMislukt={opdracht.opslaanMislukt} onBack={onBack}
      />
    )
  }

  if (level === null) {
    return (
      <div className="rs-screen">
        <button className="rs-back" onClick={onBack}>← Terug</button>
        <div className="rs-header">
          <span className="rs-icon">📏</span>
          <h1 className="rs-title">Maten omrekenen</h1>
          <p className="rs-sub">Lengte en inhoud · kies je level</p>
        </div>
        <div className="rs-groep-grid">
          {LEVELS.map(l => (
            <button key={l.n} className="rs-groep-card" onClick={() => start(l.n)}>
              <span className="rs-groep-emoji">{l.icon}</span>
              <span className="rs-groep-naam">{l.naam}</span>
              <span className="rs-groep-desc">{l.desc}</span>
              <span className="vb-line">{l.vb}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rs-screen rs-screen-oefen">
      <div className="rs-oefen-top">
        <button className="rs-back" onClick={() => setLevel(null)}>← Stop</button>
        <span className="rs-verdiend">📏 Level {level}</span>
        <span className="rs-verdiend">💵 € {verdiend}</span>
      </div>
      <div className="rs-progress-wrap">
        <div className="rs-progress-bar" style={{ width: `${(sinds / PER_BELONING) * 100}%` }} />
      </div>
      <div className="rs-progress-label">{PER_BELONING - sinds} goede tot een spelletje 🎮</div>
      {opgave && <VraagKaart opgave={opgave} onNext={volgende} />}
    </div>
  )
}
