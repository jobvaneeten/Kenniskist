import { useState, useRef, useEffect, useCallback } from 'react'
import FootballGame from './FootballGame'
import TowerDefenseGame from './TowerDefenseGame'
import { BeloningKeuze, JetpackBeloning, AstroBeloning, SpacerunnerBeloning, BRIEFGELD } from './Beloning'
import './tafels-oefenen.css'

const ALLE_TAFELS = [2, 3, 4, 5, 6, 7, 8, 9, 10]
const DUUR = 120  // seconden

function maakVragen(tafels, soort) {
  const vragen = []
  for (const t of tafels) {
    for (let i = 1; i <= 10; i++) {
      if (soort === 'keer')
        vragen.push({ tafel: t, links: t, sym: '×', rechts: i, antwoord: t * i })
      else
        vragen.push({ tafel: t, links: t * i, sym: '÷', rechts: i, antwoord: t })
    }
  }
  for (let i = vragen.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [vragen[i], vragen[j]] = [vragen[j], vragen[i]]
  }
  return vragen
}

// ── Type-keuze ────────────────────────────────────────────────────────────
function TypeKeuze({ groep, onKies }) {
  return (
    <div className="to-wrap to-selectie">
      <div className="to-header">
        <span className="to-icon">🔢</span>
        <h1 className="to-titel">Tafels oefenen · Groep {groep}</h1>
        <p className="to-sub">Wat wil je oefenen?</p>
      </div>
      <div className="to-type-grid">
        <button className="to-type-btn" onClick={() => onKies('keer')}>
          <span className="to-type-sym">×</span>
          <span className="to-type-naam">Keersommen</span>
          <span className="to-type-vb">7 × 8 = ?</span>
        </button>
        <button className="to-type-btn" onClick={() => onKies('deel')}>
          <span className="to-type-sym">÷</span>
          <span className="to-type-naam">Deelsommen</span>
          <span className="to-type-vb">56 ÷ 8 = ?</span>
        </button>
      </div>
    </div>
  )
}

// ── Tafel-selectie ───────────────────────────────────────────────────────
function TafelSelectie({ groep, soort, onStart }) {
  const [gekozen, setGekozen] = useState(new Set(ALLE_TAFELS))

  const toggle = (t) => setGekozen(prev => {
    const s = new Set(prev)
    if (s.has(t)) { if (s.size > 1) s.delete(t) }
    else s.add(t)
    return s
  })

  return (
    <div className="to-wrap to-selectie">
      <div className="to-header">
        <span className="to-icon">🔢</span>
        <h1 className="to-titel">{soort === 'keer' ? 'Keersommen' : 'Deelsommen'} · Groep {groep}</h1>
        <p className="to-sub">Kies welke tafels je wil oefenen</p>
      </div>
      <div className="to-tafel-grid">
        {ALLE_TAFELS.map(t => (
          <button
            key={t}
            className={`to-tafel-btn${gekozen.has(t) ? ' gekozen' : ''}`}
            onClick={() => toggle(t)}
          >
            <span className="to-tafel-num">{soort === 'deel' ? '÷' : '×'} {t}</span>
            <span className="to-tafel-vb">{soort === 'deel' ? `${t * 5} ÷ ${t} = 5` : `${t} × 5 = ${t * 5}`}</span>
          </button>
        ))}
      </div>
      <button className="to-start-btn" onClick={() => onStart([...gekozen].sort((a, b) => a - b))}>
        Start! ({gekozen.size} tafel{gekozen.size !== 1 ? 's' : ''}) →
      </button>
    </div>
  )
}

// ── Oefenspel ────────────────────────────────────────────────────────────
function Oefenspel({ tafels, soort, onKlaar }) {
  const [vragen]   = useState(() => maakVragen(tafels, soort))
  const [idx, setIdx]   = useState(0)
  const [input, setInput] = useState('')
  const [resterend, setResterend] = useState(DUUR)
  const [resultaten, setResultaten] = useState([])  // { a, b, antwoord, jouw, goed }
  const [flash, setFlash] = useState(null)  // 'goed' | 'fout' | null
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setResterend(r => {
        if (r <= 1) { clearInterval(timerRef.current); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  useEffect(() => { if (resterend === 0) onKlaar(resultaten) }, [resterend])

  useEffect(() => { inputRef.current?.focus() }, [idx])

  const vraag = vragen[idx % vragen.length]

  const check = () => {
    const jouw = parseInt(input, 10)
    const goed = jouw === vraag.antwoord
    const res = { tafel: vraag.tafel, links: vraag.links, sym: vraag.sym, rechts: vraag.rechts, antwoord: vraag.antwoord, jouw, goed }
    setResultaten(prev => [...prev, res])
    setFlash(goed ? 'goed' : 'fout')
    setInput('')
    setTimeout(() => { setFlash(null); setIdx(i => i + 1) }, 280)
  }

  const min = String(Math.floor(resterend / 60)).padStart(2, '0')
  const sec = String(resterend % 60).padStart(2, '0')
  const urgent = resterend <= 30

  return (
    <div className={`to-wrap to-spel${flash ? ` to-flash-${flash}` : ''}`}>
      <div className="to-timer-balk">
        <span className={`to-timer${urgent ? ' urgent' : ''}`}>{min}:{sec}</span>
        <span className="to-teller">{resultaten.length} gedaan</span>
        <span className="to-goed-teller">{resultaten.filter(r => r.goed).length} goed</span>
      </div>
      <div className="to-vraag-wrap">
        <div className="to-vraag">
          <span className="to-getal">{vraag.links}</span>
          <span className="to-keer">{vraag.sym}</span>
          <span className="to-getal">{vraag.rechts}</span>
          <span className="to-is">=</span>
          <input
            ref={inputRef}
            className="to-input"
            type="number"
            inputMode="numeric"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input !== '') check() }}
            disabled={flash !== null}
            autoFocus
          />
        </div>
        <button
          className="to-check-btn"
          onClick={check}
          disabled={input === '' || flash !== null}
        >→</button>
      </div>
    </div>
  )
}

// ── Overzicht ─────────────────────────────────────────────────────────────
function Overzicht({ tafels, resultaten, onSpelletje }) {
  const goed  = resultaten.filter(r => r.goed).length
  const fout  = resultaten.length - goed

  // Stats per tafel
  const perTafel = {}
  for (const t of tafels) perTafel[t] = { goed: 0, fout: 0, fouten: [] }
  for (const r of resultaten) {
    const t = r.tafel
    if (!perTafel[t]) continue
    if (r.goed) perTafel[t].goed++
    else { perTafel[t].fout++; perTafel[t].fouten.push(r) }
  }

  return (
    <div className="to-wrap to-overzicht">
      <div className="to-ov-banner">📋 Laat dit aan de meester/juf zien!</div>
      <div className="to-ov-score">
        <span className="to-ov-groot">{goed} / {resultaten.length}</span>
        <span className="to-ov-label">goed in 2 minuten</span>
      </div>

      <div className="to-ov-tafels">
        {tafels.map(t => {
          const s = perTafel[t]
          const totaal = s.goed + s.fout
          return (
            <div key={t} className={`to-ov-rij${s.fout > 0 ? ' heeft-fout' : ''}`}>
              <div className="to-ov-rij-top">
                <span className="to-ov-tafel-naam">Tafel van {t}</span>
                <span className="to-ov-tafel-score">{s.goed}/{totaal}</span>
                {s.fout > 0
                  ? <span className="to-ov-fout-tag">❌ {s.fout} fout</span>
                  : totaal > 0
                  ? <span className="to-ov-ok-tag">✅</span>
                  : <span className="to-ov-leeg-tag">—</span>}
              </div>
              {s.fouten.length > 0 && (
                <div className="to-ov-inline-fouten">
                  {s.fouten.map((f, i) => (
                    <span key={i} className="to-ov-inline-fout">
                      {f.links} {f.sym} {f.rechts} = <b>{f.antwoord}</b>
                      <span className="to-ov-inline-jouw">(jij: {isNaN(f.jouw) ? '—' : f.jouw})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button className="to-spelletje-btn" onClick={onSpelletje}>🎮 Speel een spelletje!</button>
    </div>
  )
}

// ── Hoofdcomponent ────────────────────────────────────────────────────────
export default function TafelsOefenen({ groep, onBack, addBriefgeld, addCuruntie }) {
  const [fase, setFase] = useState('type')   // type | selectie | spel | overzicht | keuze | <game>
  const [soort, setSoort] = useState(null)   // 'keer' | 'deel'
  const [tafels, setTafels] = useState([])
  const [resultaten, setResultaten] = useState([])
  const [footballBracket, setFootballBracket] = useState(null)
  const [tdStarted, setTdStarted] = useState(false)
  const [verdiend, setVerdiend] = useState(0)

  const spelKlaar = useCallback((res) => {
    setResultaten(res)
    setFase('overzicht')
  }, [])

  const kiesBeloning = (key) => {
    if (key === 'towerdefense') setTdStarted(true)
    if (key === 'astrokatapult') { addBriefgeld?.(BRIEFGELD); setVerdiend(v => v + BRIEFGELD) }
    setFase(key)
  }

  const voetbalKlaar = useCallback((won, nextBracket, played) => {
    setFootballBracket(nextBracket || null)
    if (played) { addBriefgeld?.(BRIEFGELD); setVerdiend(v => v + BRIEFGELD) }
    setFase('type')
  }, [addBriefgeld])

  const tdKlaar = useCallback(() => {
    addBriefgeld?.(BRIEFGELD); setVerdiend(v => v + BRIEFGELD)
    setFase('type')
  }, [addBriefgeld])

  const tdTerug = useCallback(() => { setTdStarted(false); setFase('type') }, [])
  const gameKlaar = useCallback(() => setFase('type'), [])

  if (fase === 'football') {
    return (
      <FootballGame
        rewardMode noQuiz
        initialBracket={footballBracket}
        onMatchDone={voetbalKlaar}
        onBack={() => setFase('selectie')}
        addCuruntie={() => {}}
      />
    )
  }
  if (fase === 'jetpack')      return <JetpackBeloning onDone={gameKlaar} />
  if (fase === 'astrokatapult') return <AstroBeloning  onDone={gameKlaar} />
  if (fase === 'spacerunner')  return <SpacerunnerBeloning onDone={gameKlaar} />

  return (
    <>
      {tdStarted && (
        <TowerDefenseGame
          visible={fase === 'towerdefense'}
          onBack={tdTerug}
          onRoundDone={tdKlaar}
        />
      )}

      {fase === 'keuze' && (
        <div className="to-wrap">
          <BeloningKeuze
            onPick={kiesBeloning}
            heeftToernooi={!!footballBracket}
            title="Goed gedaan!"
            sub="Speel een spelletje als beloning"
          />
        </div>
      )}

      {fase === 'type' && (
        <div className="to-outer">
          <button className="to-back-btn" onClick={onBack}>← Terug</button>
          <TypeKeuze groep={groep} onKies={(s) => { setSoort(s); setFase('selectie') }} />
        </div>
      )}

      {fase === 'selectie' && (
        <div className="to-outer">
          <button className="to-back-btn" onClick={() => setFase('type')}>← Terug</button>
          <TafelSelectie
            groep={groep}
            soort={soort}
            onStart={(t) => { setTafels(t); setFase('spel') }}
          />
        </div>
      )}

      {fase === 'spel' && (
        <div className="to-outer">
          <button className="to-back-btn" onClick={() => setFase('selectie')}>← Stop</button>
          <Oefenspel tafels={tafels} soort={soort} onKlaar={spelKlaar} />
        </div>
      )}

      {fase === 'overzicht' && (
        <div className="to-outer">
          <button className="to-back-btn" onClick={() => setFase('type')}>← Opnieuw</button>
          <Overzicht
            tafels={tafels}
            resultaten={resultaten}
            onSpelletje={() => setFase('keuze')}
          />
        </div>
      )}
    </>
  )
}
