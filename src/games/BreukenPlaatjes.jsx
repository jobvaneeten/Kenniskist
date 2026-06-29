import { useState } from 'react'
import SpelBeloning from './SpelBeloning'
import './breuken-plaatjes.css'

const PER_BELONING = 5
const BELONING     = 50

const rnd  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const pick = a => a[Math.floor(Math.random() * a.length)]
const val  = (m, n) => m / n
const shuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[r[i], r[j]] = [r[j], r[i]] } return r }

// ── Plaatje van een breuk: rond (taart) of langwerpig (reep) ──
function BreukPlaatje({ shape, m, n, size = 130 }) {
  const SH = '#ffd23f', LEEG = 'rgba(255,255,255,0.08)', LIJN = '#ffd23f'
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
        {[...Array(n)].map((_, i) => <path key={i} d={sector(i)} fill={i < m ? SH : LEEG} stroke={LIJN} strokeWidth="2" />)}
      </svg>
    )
  }
  // langwerpig: een liggende reep in n vakjes
  const W = size * 1.5, H = size * 0.55, seg = W / n
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="bp-svg">
      {[...Array(n)].map((_, i) => (
        <rect key={i} x={i * seg} y={0} width={seg} height={H} fill={i < m ? SH : LEEG} stroke={LIJN} strokeWidth="2" />
      ))}
    </svg>
  )
}

function maakVraag() {
  const shape = pick(['rond', 'langwerpig'])
  const n = rnd(2, 8), m = rnd(1, n - 1)
  const opts = [{ m, n }]
  const gezien = new Set([val(m, n)])
  let guard = 0
  while (opts.length < 4 && guard++ < 300) {
    const nn = rnd(2, 8), mm = rnd(1, nn - 1)
    if (!gezien.has(val(mm, nn))) { gezien.add(val(mm, nn)); opts.push({ m: mm, n: nn }) }
  }
  const mode = pick(['kiesBreuk', 'kiesPlaatje'])
  return { shape, m, n, opts: shuffle(opts), mode }
}

export default function BreukenPlaatjes({ onBack, addBriefgeld, addCuruntie }) {
  const [vraag, setVraag]   = useState(maakVraag)
  const [phase, setPhase]   = useState('vraag')   // vraag | goed | fout
  const [gekozen, setGekozen] = useState(null)
  const [sinds, setSinds]   = useState(0)
  const [verdiend, setVerdiend] = useState(0)
  const [reward, setReward] = useState(false)

  const goed = (o) => o.m === vraag.m && o.n === vraag.n

  const kies = (o) => {
    if (phase !== 'vraag') return
    setGekozen(o)
    setPhase(goed(o) ? 'goed' : 'fout')
  }

  const verder = () => {
    const wasGoed = phase === 'goed'
    setGekozen(null); setPhase('vraag')
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

  const { shape, m, n, opts, mode } = vraag

  return (
    <div className="bp-screen">
      <button className="back-btn" onClick={onBack}>← Menu</button>
      <div className="bp-head">
        <span className="bp-icon">🍕</span>
        <h1 className="bp-title">Breuken &amp; plaatjes</h1>
        <p className="bp-sub">{mode === 'kiesBreuk' ? 'Welke breuk hoort bij dit plaatje?' : 'Welk plaatje hoort bij deze breuk?'}</p>
      </div>

      <div className="bp-progress-wrap"><div className="bp-progress-bar" style={{ width: `${(sinds / PER_BELONING) * 100}%` }} /></div>
      <div className="bp-progress-label">{PER_BELONING - sinds} goede tot een spelletje 🎮 · 💵 € {verdiend}</div>

      {mode === 'kiesBreuk' ? (
        <>
          <div className="bp-prompt"><BreukPlaatje shape={shape} m={m} n={n} size={150} /></div>
          <div className="bp-opts bp-opts-breuk">
            {opts.map((o, i) => {
              const st = phase !== 'vraag' && (goed(o) ? ' goed' : (o === gekozen ? ' fout' : ''))
              return (
                <button key={i} className={'bp-opt bp-opt-breuk' + (st || '')} onClick={() => kies(o)} disabled={phase !== 'vraag'}>
                  <span className="bp-breuk"><span className="bp-teller">{o.m}</span><span className="bp-streep" /><span className="bp-noemer">{o.n}</span></span>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <div className="bp-prompt"><span className="bp-breuk bp-breuk-groot"><span className="bp-teller">{m}</span><span className="bp-streep" /><span className="bp-noemer">{n}</span></span></div>
          <div className="bp-opts bp-opts-plaatje">
            {opts.map((o, i) => {
              const st = phase !== 'vraag' && (goed(o) ? ' goed' : (o === gekozen ? ' fout' : ''))
              return (
                <button key={i} className={'bp-opt bp-opt-plaatje' + (st || '')} onClick={() => kies(o)} disabled={phase !== 'vraag'}>
                  <BreukPlaatje shape={shape} m={o.m} n={o.n} size={shape === 'rond' ? 92 : 80} />
                </button>
              )
            })}
          </div>
        </>
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
