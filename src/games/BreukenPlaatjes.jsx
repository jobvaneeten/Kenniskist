import { useState, useRef, useEffect } from 'react'
import SpelBeloning from './SpelBeloning'
import './breuken-plaatjes.css'

const PER_BELONING = 5
const BELONING     = 50

const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const pick = a => a[Math.floor(Math.random() * a.length)]

// ── Plaatje van een breuk: rond (taart) of langwerpig (reep) ──
function BreukPlaatje({ shape, m, n, size = 150 }) {
  const SH = '#ffd23f', LEEG = 'rgba(255,255,255,0.08)', LIJN = '#8a5a00'
  if (shape === 'rond') {
    const cx = size / 2, cy = size / 2, r = size / 2 - 6
    const pt = (deg) => [cx + r * Math.cos((deg - 90) * Math.PI / 180), cy + r * Math.sin((deg - 90) * Math.PI / 180)]
    const sector = (i) => {
      const a1 = i * 360 / n, a2 = (i + 1) * 360 / n, [x1, y1] = pt(a1), [x2, y2] = pt(a2)
      const large = (a2 - a1) > 180 ? 1 : 0
      return `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`
    }
    return (
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="bp-svg">
        {[...Array(n)].map((_, i) => <path key={i} d={sector(i)} fill={i < m ? SH : LEEG} stroke={LIJN} strokeWidth="2.5" strokeLinejoin="round" />)}
      </svg>
    )
  }
  // langwerpig: een liggende reep in n vakjes
  const W = size * 1.5, H = size * 0.55, seg = W / n
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="bp-svg">
      {[...Array(n)].map((_, i) => (
        <rect key={i} x={i * seg} y={0} width={seg} height={H} fill={i < m ? SH : LEEG} stroke={LIJN} strokeWidth="2.5" strokeLinejoin="round" />
      ))}
    </svg>
  )
}

function maakVraag() {
  const shape = pick(['rond', 'langwerpig'])
  const n = rnd(2, 8), m = rnd(1, n - 1)
  return { shape, m, n }
}

export default function BreukenPlaatjes({ onBack, addBriefgeld, addCuruntie }) {
  const [vraag, setVraag] = useState(maakVraag)
  const [phase, setPhase] = useState('vraag')   // vraag | goed | fout
  const [teller, setTeller] = useState('')
  const [noemer, setNoemer] = useState('')
  const [sinds, setSinds] = useState(0)
  const [verdiend, setVerdiend] = useState(0)
  const [reward, setReward] = useState(false)
  const tellerRef = useRef(null)

  useEffect(() => { if (phase === 'vraag') setTimeout(() => tellerRef.current?.focus(), 50) }, [vraag, phase])

  const check = () => {
    if (phase !== 'vraag') return
    if (!teller.trim() || !noemer.trim()) return
    setPhase(+teller === vraag.m && +noemer === vraag.n ? 'goed' : 'fout')
  }

  const verder = () => {
    const wasGoed = phase === 'goed'
    setTeller(''); setNoemer(''); setPhase('vraag')
    if (wasGoed) {
      const ns = sinds + 1
      if (ns >= PER_BELONING) { setSinds(0); setReward(true); return }
      setSinds(ns)
    }
    setVraag(maakVraag())
  }

  const naBeloning = () => {
    setReward(false)
    addBriefgeld?.(BELONING)
    setVerdiend(v => v + BELONING)
    setVraag(maakVraag())
  }

  if (reward) return <SpelBeloning title="5 goed!" geld={BELONING} addCuruntie={addCuruntie} onDone={naBeloning} />

  const { shape, m, n } = vraag

  return (
    <div className="bp-screen">
      <button className="back-btn" onClick={onBack}>← Menu</button>
      <div className="bp-head">
        <span className="bp-icon">🍕</span>
        <h1 className="bp-title">Breuken &amp; plaatjes</h1>
        <p className="bp-sub">Welke breuk is gekleurd? Vul de teller en de noemer in.</p>
      </div>

      <div className="bp-progress-wrap"><div className="bp-progress-bar" style={{ width: `${(sinds / PER_BELONING) * 100}%` }} /></div>
      <div className="bp-progress-label">{PER_BELONING - sinds} goede tot een spelletje 🎮 · 💵 € {verdiend}</div>

      <div className="bp-prompt"><BreukPlaatje shape={shape} m={m} n={n} size={150} /></div>

      <div className="bp-invul">
        <input ref={tellerRef} className={'bp-input' + (phase === 'fout' ? ' fout' : '')} type="text" inputMode="numeric" autoComplete="off"
          aria-label="teller (boven de streep)" placeholder="?" value={teller}
          onChange={e => setTeller(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={e => e.key === 'Enter' && check()} disabled={phase !== 'vraag'} />
        <span className="bp-invul-streep" />
        <input className={'bp-input' + (phase === 'fout' ? ' fout' : '')} type="text" inputMode="numeric" autoComplete="off"
          aria-label="noemer (onder de streep)" placeholder="?" value={noemer}
          onChange={e => setNoemer(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={e => e.key === 'Enter' && check()} disabled={phase !== 'vraag'} />
      </div>

      {phase === 'vraag' && (
        <button className="bp-verder-btn" onClick={check} disabled={!teller.trim() || !noemer.trim()}>Controleer →</button>
      )}
      {phase === 'goed' && (
        <div className="bp-feedback bp-goed">
          <span>🎉 Goed! Het is <b>{m}/{n}</b>.</span>
          <button className="bp-verder-btn" onClick={verder}>Verder →</button>
        </div>
      )}
      {phase === 'fout' && (
        <div className="bp-feedback bp-fout">
          <span>❌ Het juiste antwoord is <b>{m}/{n}</b> ({m} van de {n} delen gekleurd).</span>
          <button className="bp-verder-btn" onClick={verder}>Volgende →</button>
        </div>
      )}
    </div>
  )
}
