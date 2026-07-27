import { useState, useRef, useEffect, useCallback } from 'react'
import FootballGame from './FootballGame'
import TowerDefenseGame from './TowerDefenseGame'
import { BeloningKeuze, JetpackBeloning, AstroBeloning, SpacerunnerBeloning, BRIEFGELD } from './Beloning'
import SpelBeloning from './SpelBeloning'
import './tafels-oefenen.css'

const ALLE_TAFELS = [2, 3, 4, 5, 6, 7, 8, 9, 10]
const DUUR = 120  // seconden
const HIGHSCORE_KEY = 'kk_tafels_highscore'

function leesHighscore() {
  return parseInt(localStorage.getItem(HIGHSCORE_KEY) || '0', 10)
}
function schrijfHighscore(goed) {
  const huidig = leesHighscore()
  if (goed > huidig) { localStorage.setItem(HIGHSCORE_KEY, String(goed)); return goed }
  return huidig
}

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
  const [highscore] = useState(() => leesHighscore())
  return (
    <div className="to-wrap to-selectie">
      <div className="to-header">
        <span className="to-icon">🔢</span>
        <h1 className="to-titel">Tafels oefenen · Groep {groep}</h1>
        <p className="to-sub">Wat wil je oefenen?</p>
      </div>
      <div className="to-highscore-vooraf">⭐ Jouw record: {highscore} goed</div>
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
// weektaakModus/onOpslaanMislukt: elk antwoord wordt los gerapporteerd (i.p.v.
// pas als de 2 minuten om zijn), zodat niets verloren gaat als de leerling
// halverwege stopt.
function Oefenspel({ tafels, soort, onKlaar, weektaakModus, onOpslaanMislukt }) {
  const [highscore] = useState(() => leesHighscore())
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
    if (weektaakModus) {
      const opslaan = window.KennisKist?.slaResultaatOp?.('tafels', goed ? 1 : 0, 1, { opgaven: [res] })
      opslaan?.then(r => { if (!r?.ok) onOpslaanMislukt?.() })
    }
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
        <span className="to-highscore-teller">⭐ record: {highscore}</span>
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
  const [vorigeHighscore] = useState(() => leesHighscore())
  const [highscore] = useState(() => schrijfHighscore(goed))
  const nieuwRecord = goed > 0 && goed > vorigeHighscore

  // Stats per tafel
  const perTafel = {}
  for (const t of tafels) perTafel[t] = { goed: 0, fout: 0, fouten: [] }
  for (const r of resultaten) {
    const t = r.tafel
    if (!perTafel[t]) continue
    if (r.goed) perTafel[t].goed++
    else { perTafel[t].fout++; perTafel[t].fouten.push(r) }
  }

  const alleFouten = resultaten.filter(r => !r.goed)

  return (
    <div className="to-overzicht">
      <div className="to-ov-banner">📋 Laat dit aan de meester/juf zien!</div>

      <div className="to-ov-score">
        <span className="to-ov-score-groot">{goed} / {resultaten.length}</span>
        <span className="to-ov-score-label">goed in 2 minuten</span>
      </div>

      <div className="to-ov-highscore">
        {nieuwRecord
          ? <>🏆 Nieuw record! {goed} goed</>
          : <>⭐ Jouw record: {highscore} goed</>}
      </div>

      <div className="to-ov-cats">
        {tafels.map(t => {
          const s = perTafel[t]
          const totaal = s.goed + s.fout
          const pct = totaal > 0 ? Math.round((s.goed / totaal) * 100) : null
          return (
            <div key={t} className="to-ov-cat">
              <div className="to-ov-cat-head">
                <span className="to-ov-cat-naam">Tafel van {t}</span>
                <span className="to-ov-cat-cijfer">{s.goed}/{totaal}{pct !== null ? ` (${pct}%)` : ''} goed</span>
              </div>
              {s.fout > 0
                ? <span className="to-ov-cat-fout">❌ {s.fout} fout{s.fout > 1 ? 'en' : ''}</span>
                : (totaal > 0
                    ? <span className="to-ov-cat-perfect">✅ alles goed</span>
                    : <span className="to-ov-cat-leeg">— niet geoefend</span>)}
            </div>
          )
        })}
      </div>

      {alleFouten.length > 0 && (
        <div className="to-ov-foutenlijst">
          <div className="to-ov-foutenlijst-titel">Fout gemaakt bij:</div>
          {alleFouten.map((f, i) => (
            <div key={i} className="to-ov-fout-rij">
              <span className="to-ov-fout-som">{f.links} {f.sym} {f.rechts}</span>
              <span className="to-ov-fout-jouw">jij: {isNaN(f.jouw) ? '—' : f.jouw}</span>
              <span className="to-ov-fout-goed">goed: {f.antwoord}</span>
            </div>
          ))}
        </div>
      )}

      <button className="to-ov-verder-btn" onClick={onSpelletje}>🎮 Speel een spelletje!</button>
    </div>
  )
}

// ── Hoofdcomponent ────────────────────────────────────────────────────────
// config: alleen gezet vanuit een weektaak-opdracht (toolRender.jsx) —
// { soort, tafels } slaat de type/tafel-keuzeschermen over. `aantal` bestaat
// in de registry (altijd 1, het is een tijdrace) maar wordt hier niet
// gebruikt: elk antwoord rapporteert apart, zie Oefenspel/check hierboven.
export default function TafelsOefenen({ groep, onBack, addBriefgeld, addCuruntie, config }) {
  const [fase, setFase] = useState('type')   // type | selectie | spel | overzicht | keuze | <game>
  const [soort, setSoort] = useState(null)   // 'keer' | 'deel'
  const [tafels, setTafels] = useState([])
  const [resultaten, setResultaten] = useState([])
  const [footballBracket, setFootballBracket] = useState(null)
  const [tdStarted, setTdStarted] = useState(false)
  const [verdiend, setVerdiend] = useState(0)
  const [opslaanMislukt, setOpslaanMislukt] = useState(false)

  useEffect(() => {
    if (!config) return
    setSoort(config.soort || 'keer')
    setTafels(config.tafels?.length ? config.tafels.map(Number) : [...ALLE_TAFELS])
    setFase('spel')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Rapportage gebeurt nu per antwoord (zie Oefenspel/check hierboven), niet
  // meer hier als eindbatch — dus niets verloren als de leerling halverwege
  // de 2 minuten stopt via "← Stop".
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
        <SpelBeloning
          title="Goed gedaan!"
          geld={BRIEFGELD}
          addCuruntie={addCuruntie}
          onDone={() => { addBriefgeld?.(BRIEFGELD); setVerdiend(v => v + BRIEFGELD); setFase('type') }}
        />
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
          <Oefenspel
            tafels={tafels} soort={soort} onKlaar={spelKlaar}
            weektaakModus={!!config} onOpslaanMislukt={() => setOpslaanMislukt(true)}
          />
        </div>
      )}

      {fase === 'overzicht' && (
        <div className="to-outer">
          <button className="to-back-btn" onClick={() => config ? onBack() : setFase('type')}>
            {config ? '← Terug naar weektaak' : '← Opnieuw'}
          </button>
          {opslaanMislukt && (
            <p style={{ color: '#fca5a5', fontWeight: 700, textAlign: 'center' }}>
              ⚠️ Je resultaat kon niet worden opgeslagen — laat dit scherm zien.
            </p>
          )}
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
