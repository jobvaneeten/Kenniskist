import { useState, useRef, useEffect } from 'react'
import { answersMatch } from './iepQuestions'
import { BLOK9 } from './blok9'
import { BLOK10 } from './blok10'
import SpelBeloning from './SpelBeloning'
import './blok-oefenen.css'

const BRIEFGELD = 50              // max per opgave (1x)
const DOEL_BONUS = 100           // extra wanneer het hele doel af is (1x)
const BELOOND_KEY = 'kk_blok_beloond'   // opgaven/doelen die al beloond zijn (1x geld)
function laadBeloond() {
  try { return new Set(JSON.parse(localStorage.getItem(BELOOND_KEY) || '[]')) } catch { return new Set() }
}

// Alle beschikbare blokken (later uitbreiden)
// hulpImg: true = screenshots in /public/hulp; anders tonen we de hulp-tekst.
const BLOKKEN = [
  { nr: 10, data: BLOK10, beschikbaar: true, hulpImg: true },
  { nr: 9,  data: BLOK9,  beschikbaar: true, hulpImg: true },
  { nr: 8,  data: null,   beschikbaar: false },
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

// ── Hulp-overlay (screenshot uit het werkblad; valt terug op tekst) ──────
function HulpPanel({ img, tekst, onClose }) {
  const [imgOk, setImgOk] = useState(!!img)
  return (
    <div className="bk-hulp-overlay" onClick={onClose}>
      <div className="bk-hulp-panel" onClick={e => e.stopPropagation()}>
        <div className="bk-hulp-header">
          <span>💡 Hulp uit het werkblad</span>
          <button className="bk-hulp-close" onClick={onClose}>✕</button>
        </div>
        {img && imgOk ? (
          <div className="bk-hulp-img-wrap">
            <img className="bk-hulp-img" src={img} alt="Hulp uit het werkblad" onError={() => setImgOk(false)} />
          </div>
        ) : (
          <div className="bk-hulp-tekst">{tekst}</div>
        )}
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

// ── Werkblad-opgave met invulvakken over de screenshot ───────────────────
// De afbeelding is het ECHTE werkblad (rode antwoorden weggehaald); de
// invulvakjes staan precies op de plek van het rode antwoord.
function WerkbladOpgave({ opgave, onComplete }) {
  const [vals, setVals] = useState({})
  const [checked, setChecked] = useState(false)
  const boxes = opgave.boxes || []

  useEffect(() => { setVals({}); setChecked(false) }, [opgave])

  const okOf = (i) => answersMatch(vals[i] || '', boxes[i].a)
  const allOk = boxes.every((_, i) => okOf(i))

  const check = () => setChecked(true)

  // Bijsnijden: toon alleen het stuk van de pagina dat bij déze opgave hoort.
  // crop = [x0,y0,x1,y1] als fractie van de pagina. De invulvakjes houden hun
  // pagina-coördinaten; we pannen/zoomen de afbeelding eronder via CSS.
  const PAGE_W = 1310, PAGE_H = 1852
  const [cx0, cy0, cx1, cy1] = opgave.crop || [0, 0, 1, 1]
  const cw = cx1 - cx0, ch = cy1 - cy0
  // Verklein bij hoge uitsneden zodat het op het scherm past (i.p.v. afkappen):
  // breedte = min(volledige breedte, hoogte-limiet × verhouding).
  const cropAspect = (cw * PAGE_W) / (ch * PAGE_H)

  return (
    <div className="bk-werkblad">
      {opgave.intro && <div className="bk-intro">{opgave.intro}</div>}
      <div className="bk-wb-wrap" style={{ aspectRatio: `${cropAspect}`, width: `min(100%, ${(72 * cropAspect).toFixed(1)}vh)` }}>
        <div className="bk-wb-pan" style={{ left: `${(-cx0 / cw) * 100}%`, top: `${(-cy0 / ch) * 100}%`, width: `${(1 / cw) * 100}%` }}>
          <img className="bk-wb-img" src={opgave.img} alt="Werkblad" />
          {boxes.map((b, i) => (
            b.opts ? (
              <select
                key={i}
                className={`bk-wb-input bk-wb-mc${checked ? (okOf(i) ? ' bk-wb-ok' : ' bk-wb-bad') : ''}`}
                style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }}
                value={vals[i] || ''}
                onChange={e => { setVals(v => ({ ...v, [i]: e.target.value })); if (checked) setChecked(false) }}
              >
                <option value="">…</option>
                {b.opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                key={i}
                className={`bk-wb-input${checked ? (okOf(i) ? ' bk-wb-ok' : ' bk-wb-bad') : ''}`}
                style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }}
                type="text"
                inputMode="text"
                value={vals[i] || ''}
                onChange={e => { setVals(v => ({ ...v, [i]: e.target.value })); if (checked) setChecked(false) }}
                title={checked && !okOf(i) ? b.a : ''}
              />
            )
          ))}
        </div>
      </div>

      {!checked && (
        <div className="bk-antwoord-row">
          <button className="bk-check-btn" onClick={check}>Controleer →</button>
        </div>
      )}
      {checked && allOk && (
        <div className="bk-feedback bk-goed">
          <span>🎉 Helemaal goed!</span>
          <button className="bk-verder-btn" onClick={onComplete}>Verder →</button>
        </div>
      )}
      {checked && !allOk && (
        <div className="bk-feedback bk-fout">
          <span>❌ Nog niet alles goed — de foute vakjes zijn rood. Verbeter ze en check opnieuw.</span>
          <button className="bk-verder-btn" onClick={onComplete}>Sla over →</button>
        </div>
      )}
    </div>
  )
}

// ── Teken-/kleur-opgave: teken met je vinger of muis op het werkblad ─────
const TEKEN_KLEUREN = ['#e23b3b', '#2f80ed', '#2e9c4a', '#f2b500', '#e84ec5', '#1a1a1a']
function TekenOpgave({ opgave, onComplete }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [kleur, setKleur] = useState('#e23b3b')
  const kleurRef = useRef('#e23b3b')
  kleurRef.current = kleur

  const PAGE_W = 1310, PAGE_H = 1852
  const [cx0, cy0, cx1, cy1] = opgave.crop || [0, 0, 1, 1]
  const cw = cx1 - cx0, ch = cy1 - cy0
  const cropAspect = (cw * PAGE_W) / (ch * PAGE_H)

  // canvas-resolutie gelijk aan de getoonde grootte houden
  useEffect(() => {
    const fit = () => {
      const w = wrapRef.current, c = canvasRef.current
      if (!w || !c) return
      const r = w.getBoundingClientRect()
      if (Math.round(r.width) !== c.width || Math.round(r.height) !== c.height) {
        c.width = Math.round(r.width); c.height = Math.round(r.height)
      }
    }
    fit(); window.addEventListener('resize', fit)
    const t = setTimeout(fit, 100)
    return () => { window.removeEventListener('resize', fit); clearTimeout(t) }
  }, [opgave])

  const xy = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    const p = e.touches ? e.touches[0] : e
    return { x: p.clientX - r.left, y: p.clientY - r.top }
  }
  const start = (e) => { drawing.current = true; const ctx = canvasRef.current.getContext('2d'); const { x, y } = xy(e); ctx.beginPath(); ctx.moveTo(x, y) }
  const move = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d'); const { x, y } = xy(e)
    if (kleurRef.current === 'gum') { ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 22 }
    else { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = kleurRef.current; ctx.lineWidth = 7 }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineTo(x, y); ctx.stroke()
  }
  const end = () => { drawing.current = false }
  const wis = () => { const c = canvasRef.current; c.getContext('2d').clearRect(0, 0, c.width, c.height) }

  return (
    <div className="bk-werkblad">
      {opgave.intro && <div className="bk-intro">{opgave.intro}</div>}
      <div className="bk-teken-tools">
        {TEKEN_KLEUREN.map(c => (
          <button key={c} className={'bk-kleur' + (kleur === c ? ' on' : '')} style={{ background: c }} onClick={() => setKleur(c)} aria-label={'kleur ' + c} />
        ))}
        <button className={'bk-kleur bk-gum' + (kleur === 'gum' ? ' on' : '')} onClick={() => setKleur('gum')}>🧽</button>
        <button className="bk-wis-btn" onClick={wis}>Wis alles</button>
      </div>
      <div className="bk-wb-wrap" ref={wrapRef} style={{ aspectRatio: `${cropAspect}`, width: `min(100%, ${(72 * cropAspect).toFixed(1)}vh)` }}>
        <div className="bk-wb-pan" style={{ left: `${(-cx0 / cw) * 100}%`, top: `${(-cy0 / ch) * 100}%`, width: `${(1 / cw) * 100}%` }}>
          <img className="bk-wb-img" src={opgave.img} alt="Werkblad" />
        </div>
        <canvas
          ref={canvasRef}
          className="bk-teken-canvas"
          onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
          style={{ touchAction: 'none' }}
        />
      </div>
      <div className="bk-antwoord-row">
        <button className="bk-check-btn" onClick={onComplete}>Klaar →</button>
      </div>
    </div>
  )
}

// ── Oefenscherm ──────────────────────────────────────────────────────────
function Oefenen({ level, blokNr, doelNr, addBriefgeld, addCuruntie, onBack }) {
  const blok = BLOKKEN.find(b => b.nr === blokNr)
  const doel = blok?.data?.[level]?.doelen.find(d => d.nr === doelNr)
  const opgaven = doel?.opgaven ?? []

  const [oi, setOi] = useState(0)
  const [vi, setVi] = useState(0)
  const [screen, setScreen] = useState('oefening')   // 'oefening' | 'reward' | 'done'
  const [verdiend, setVerdiend] = useState(0)
  const [showHulp, setShowHulp] = useState(false)
  const currentOpgave = useRef(null)
  const rewardGeld = useRef(BRIEFGELD)
  const doelBonus = useRef(0)

  const opgave = opgaven[oi]
  const vraag  = opgave?.vragen?.[vi]
  const aantalVragen = opgave?.vragen?.length ?? (opgave?.boxes?.length ?? 0)
  const voortgang = opgaven.length ? (oi / opgaven.length) * 100 : 0
  // Hulp-screenshot uit het werkblad. Blok 9 gebruikt fs/sp per doel; blok 10 één
  // gedeelde hulp-uitsnede per doel (FS en S+ hebben dezelfde HULP-uitleg).
  const hulpImg = blok?.hulpImg
    ? (blokNr === 9 ? `/hulp/${level === 'FS' ? 'fs' : 'sp'}${doel.nr}.png` : `/hulp/b${blokNr}_d${doel.nr}.png`)
    : null

  const afterReward = () => {
    if (oi + 1 < opgaven.length) { setOi(oi + 1); setVi(0); setScreen('oefening') }
    else {
      // hele doel gehaald → eenmalig 100 briefgeld bonus
      const dkey = `${level}-${blokNr}-${doelNr}-DOEL`
      const beloond = laadBeloond()
      if (beloond.has(dkey)) { doelBonus.current = 0 }
      else {
        doelBonus.current = DOEL_BONUS
        addBriefgeld?.(DOEL_BONUS); setVerdiend(v => v + DOEL_BONUS)
        beloond.add(dkey)
        try { localStorage.setItem(BELOOND_KEY, JSON.stringify([...beloond])) } catch { /* ignore */ }
      }
      setScreen('done')
    }
  }

  // Opgave klaar → eenmalig 50 briefgeld, dan beloningsscherm.
  const finishOpgave = () => {
    currentOpgave.current = opgave
    const key = `${level}-${blokNr}-${doelNr}-${opgave.nr}`
    const beloond = laadBeloond()
    if (beloond.has(key)) {
      rewardGeld.current = null
    } else {
      rewardGeld.current = BRIEFGELD
      addBriefgeld?.(BRIEFGELD); setVerdiend(v => v + BRIEFGELD)
      beloond.add(key)
      try { localStorage.setItem(BELOOND_KEY, JSON.stringify([...beloond])) } catch {}
    }
    setScreen('reward')
  }

  const next = () => {
    if (vi + 1 < opgave.vragen.length) { setVi(vi + 1); return }
    finishOpgave()
  }

  if (screen === 'done') return (
    <div className="bk-screen">
      <div className="bk-icon">🏆</div>
      <h2 className="bk-title">Doel {doel.nr} klaar!</h2>
      {doelBonus.current > 0
        ? <p className="bk-sub">🎉 Inclusief € {DOEL_BONUS} doelbonus!</p>
        : <p className="bk-sub">Dit doel had je al helemaal af — geen extra bonus.</p>}
      <p className="bk-sub">Totaal deze keer verdiend: € {verdiend} briefgeld 💵</p>
      <button className="bk-primary-btn" onClick={onBack}>← Terug naar doelen</button>
    </div>
  )

  if (screen === 'reward') return (
    <SpelBeloning
      title={`Opgave ${currentOpgave.current?.nr ?? oi + 1} af!`}
      sub={rewardGeld.current == null ? 'Deze opgave had je al — geen extra briefgeld' : null}
      geld={rewardGeld.current}
      addCuruntie={addCuruntie}
      onDone={afterReward}
    />
  )

  return (
    <div className="bk-oefen-wrap">
      {showHulp && <HulpPanel img={hulpImg} tekst={doel.hulp} onClose={() => setShowHulp(false)} />}

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
        <span>
          Opgave {oi + 1} van {opgaven.length}
          {opgave.teken
            ? ' · teken zelf'
            : opgave.img
            ? ` · ${aantalVragen} ${aantalVragen === 1 ? 'vakje' : 'vakjes'}`
            : ` · vraag ${vi + 1} van ${aantalVragen}`}
        </span>
        <span className="bk-verdiend">💵 € {verdiend}</span>
      </div>

      {opgave.teken
        ? <TekenOpgave key={oi} opgave={opgave} onComplete={finishOpgave} />
        : opgave.img
        ? <WerkbladOpgave key={oi} opgave={opgave} onComplete={finishOpgave} />
        : <VraagKaart key={`${oi}-${vi}`} q={vraag} intro={vi === 0 ? opgave.intro : null} onNext={next} />}

      {doel.rekenmachine && !opgave.img && <Rekenmachine />}
    </div>
  )
}

// ── Hoofdcomponent ───────────────────────────────────────────────────────
export default function BlokOefenen({ onBack, addBriefgeld, addCuruntie }) {
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
          addCuruntie={addCuruntie}
          onBack={() => setDoelNr(null)}
        />
      )}
    </div>
  )
}
