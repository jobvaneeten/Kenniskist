import { useState, useRef, useEffect, useCallback } from 'react'
import FootballGame from './FootballGame'
import TowerDefenseGame from './TowerDefenseGame'
import { shuffleOefeningen, shuffleGefilterd, checkAntwoord, uitlegVoor } from './werkwoorden'
import { BeloningKeuze, JetpackBeloning, AstroBeloning, SpacerunnerBeloning, BRIEFGELD } from './Beloning'
import SpelBeloning from './SpelBeloning'
import './werkwoord-spelling.css'

const PER_BELONING = 5     // na elke 5 goede antwoorden een spel kiezen
const PER_OVERZICHT = 20   // na elke 20 opgaven een overzichtsscherm

// Tijd → label + kleur-klasse (tt, vt en vd elk een eigen kleur)
const TIJD_INFO = {
  tt: { label: 'tegenwoordige tijd', cls: 'ws-tijd-tt' },
  vt: { label: 'verleden tijd',      cls: 'ws-tijd-vt' },
  vd: { label: 'voltooid deelwoord', cls: 'ws-tijd-vd' },
}

// 4 categorieën voor het overzicht
const CATEGORIEEN = [
  { key: 'tt',      label: 'Tegenwoordige tijd',  cls: 'ws-tijd-tt' },
  { key: 'vtZwak',  label: 'Verleden tijd — zwak',  cls: 'ws-tijd-vt' },
  { key: 'vtSterk', label: 'Verleden tijd — sterk', cls: 'ws-tijd-vt' },
  { key: 'vd',      label: 'Voltooid deelwoord',  cls: 'ws-tijd-vd' },
]
const legeStats = () => ({
  tt:      { goed: 0, fout: 0 },
  vtZwak:  { goed: 0, fout: 0 },
  vtSterk: { goed: 0, fout: 0 },
  vd:      { goed: 0, fout: 0 },
})
// Welke categorie hoort bij een oefening?
function catVan(oef) {
  if (oef.tijdKey === 'tt') return 'tt'
  if (oef.tijdKey === 'vd') return 'vd'
  return oef.type === 'sterk' ? 'vtSterk' : 'vtZwak'
}

// ── Vraagkaart ───────────────────────────────────────────────────────────
function VraagKaart({ oef, onNext }) {
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState('answering')
  const inputRef = useRef(null)

  useEffect(() => { setInput(''); setPhase('answering'); setTimeout(() => inputRef.current?.focus(), 50) }, [oef])

  const check = () => { if (input.trim()) setPhase(checkAntwoord(input, oef.antwoord) ? 'good' : 'bad') }

  const tijd = TIJD_INFO[oef.tijdKey] || TIJD_INFO.tt
  const [voor, na] = oef.zin.split('___')

  return (
    <div className={`ws-card ${tijd.cls}`}>
      {/* Groot werkwoord + tijd, gekleurd per tijd */}
      <div className="ws-opdracht">
        <span className="ws-inf-groot">{oef.inf}</span>
        <span className="ws-tijd-tag">{tijd.label}</span>
      </div>

      <div className="ws-zin">
        <span>{voor}</span>
        <span className="ws-gat">{phase === 'answering' ? '_____' : (phase === 'good' ? oef.antwoord : input || '—')}</span>
        <span>{na}</span>
      </div>

      {phase === 'answering' && (
        <div className="ws-antwoord-row">
          <input
            ref={inputRef}
            className="ws-input"
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            placeholder="Typ de juiste vorm…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && check()}
          />
          <button className="ws-check-btn" onClick={check}>Controleer →</button>
        </div>
      )}

      {phase === 'good' && (
        <div className="ws-feedback ws-goed">
          <span>🎉 Goed!</span>
          <div className="ws-uitleg">💡 {uitlegVoor(oef)}</div>
          <button className="ws-verder-btn" onClick={() => onNext(true, input)}>Verder →</button>
        </div>
      )}

      {phase === 'bad' && (
        <div className="ws-feedback ws-fout">
          <span>❌ Niet goed. Het juiste antwoord is <b>{oef.antwoord}</b>.</span>
          <div className="ws-uitleg">💡 {uitlegVoor(oef)}</div>
          <button className="ws-verder-btn" onClick={() => onNext(false, input)}>Volgende →</button>
        </div>
      )}
    </div>
  )
}

// ── Overzichtsscherm (na 20 opgaven) ─────────────────────────────────────
function Overzicht({ stats, totaalGoed, fouten, onVerder }) {
  return (
    <div className="ws-overzicht">
      <div className="ws-ov-banner">📋 Laat dit aan de meester zien!</div>

      <div className="ws-ov-score">
        <span className="ws-ov-score-groot">{totaalGoed} / {PER_OVERZICHT}</span>
        <span className="ws-ov-score-label">goed beantwoord</span>
      </div>

      <div className="ws-ov-cats">
        {CATEGORIEEN.map(c => {
          const st = stats[c.key]
          const totaal = st.goed + st.fout
          return (
            <div key={c.key} className={`ws-ov-cat ${c.cls}`}>
              <div className="ws-ov-cat-head">
                <span className="ws-ov-cat-naam">{c.label}</span>
                <span className="ws-ov-cat-cijfer">{st.goed}/{totaal || 0} goed</span>
              </div>
              {st.fout > 0
                ? <span className="ws-ov-cat-fout">❌ {st.fout} fout{st.fout > 1 ? 'en' : ''}</span>
                : (totaal > 0
                    ? <span className="ws-ov-cat-perfect">✅ alles goed</span>
                    : <span className="ws-ov-cat-leeg">— niet geoefend</span>)}
            </div>
          )
        })}
      </div>

      {fouten.length > 0 && (
        <div className="ws-ov-foutenlijst">
          <div className="ws-ov-foutenlijst-titel">Fout gemaakt bij:</div>
          {fouten.map((f, i) => (
            <div key={i} className="ws-ov-fout-rij">
              <span className="ws-ov-fout-inf">{f.inf}</span>
              <span className="ws-ov-fout-jouw">jij: {f.jouw || '—'}</span>
              <span className="ws-ov-fout-goed">goed: {f.antwoord}</span>
            </div>
          ))}
        </div>
      )}

      <button className="ws-ov-verder-btn" onClick={onVerder}>Verder oefenen →</button>
    </div>
  )
}

const ALLE_CATS = ['tt', 'vtZwak', 'vtSterk', 'vd']
const CAT_INFO = {
  tt:      { label: 'Tegenwoordige tijd',   vb: 'hij werkt · wij werken',         cls: 'ws-tijd-tt' },
  vtZwak:  { label: 'Verleden tijd — zwak', vb: 'hij werkte · -de of -te',        cls: 'ws-tijd-vt' },
  vtSterk: { label: 'Verleden tijd — sterk',vb: 'hij liep · reed · zong',         cls: 'ws-tijd-vt' },
  vd:      { label: 'Voltooid deelwoord',   vb: 'hij heeft gewerkt · is gelopen', cls: 'ws-tijd-vd' },
}

function CatSelectie({ groep, onStart, onBack }) {
  const [gekozen, setGekozen] = useState(new Set(ALLE_CATS))

  const toggle = (key) => setGekozen(prev => {
    const s = new Set(prev)
    if (s.has(key)) { if (s.size > 1) s.delete(key) }
    else s.add(key)
    return s
  })

  return (
    <div className="ws-catsel">
      <button className="ws-back-btn ws-catsel-back" onClick={onBack}>← Terug</button>
      <div className="ws-catsel-header">
        <span className="ws-icon">📝</span>
        <h1 className="ws-title">Werkwoordspelling</h1>
        <p className="ws-sub">Groep {groep} · kies wat je wil oefenen</p>
      </div>
      <div className="ws-catsel-lijst">
        {ALLE_CATS.map(key => {
          const info = CAT_INFO[key]
          const aan = gekozen.has(key)
          return (
            <button
              key={key}
              className={`ws-catsel-rij ${info.cls}${aan ? ' aan' : ''}`}
              onClick={() => toggle(key)}
            >
              <span className="ws-catsel-check">{aan ? '☑' : '☐'}</span>
              <span className="ws-catsel-tekst">
                <span className="ws-catsel-label">{info.label}</span>
                <span className="ws-catsel-vb">{info.vb}</span>
              </span>
              <span className="ws-catsel-geld">€ {10}</span>
            </button>
          )
        })}
      </div>
      <p className="ws-catsel-uitleg">Je verdient € 10 per onderdeel dat je aanvinkt bij elk spelletje 🎮</p>
      <button className="ws-ov-verder-btn" onClick={() => onStart(gekozen)}>
        Start! (€ {gekozen.size * 10} per spel) →
      </button>
    </div>
  )
}

// ── Hoofdcomponent ───────────────────────────────────────────────────────
export default function WerkwoordSpelling({ groep, onBack, addBriefgeld }) {
  const [gekozenCats, setGekozenCats] = useState(null)   // null = nog niet gekozen
  const [oefeningen, setOefeningen]   = useState([])
  const [idx, setIdx]       = useState(0)
  const [sinds, setSinds]   = useState(0)       // correcte antwoorden sinds laatste beloning
  const [verdiend, setVerdiend] = useState(0)
  const [phase, setPhase]   = useState('play')  // play | keuze | overzicht | football | ...
  const [footballBracket, setFootballBracket] = useState(null)  // toernooi blijft bewaard
  const [tdStarted, setTdStarted] = useState(false)  // TD ooit gestart in deze sessie?

  // Overzicht-tracking (per 20 opgaven)
  const [gemaakt, setGemaakt] = useState(0)            // beantwoorde opgaven (0..20)
  const [stats, setStats]     = useState(legeStats)    // goed/fout per categorie
  const [fouten, setFouten]   = useState([])           // lijst foute opgaven

  const oef = oefeningen[idx]
  const beloning = gekozenCats ? gekozenCats.size * 10 : BRIEFGELD

  const volgende = useCallback((correct, jouwInput) => {
    // categoriseer en registreer
    const cat = catVan(oef)
    setStats(s => ({ ...s, [cat]: { goed: s[cat].goed + (correct ? 1 : 0), fout: s[cat].fout + (correct ? 0 : 1) } }))
    if (!correct) {
      setFouten(f => [...f, { inf: oef.inf, antwoord: oef.antwoord, jouw: jouwInput, cat }])
    }

    // volgende opgave
    const nieuwIdx = idx + 1
    if (nieuwIdx >= oefeningen.length) { setOefeningen(shuffleGefilterd(gekozenCats)); setIdx(0) }
    else setIdx(nieuwIdx)

    const nieuwGemaakt = gemaakt + 1
    setGemaakt(Math.min(nieuwGemaakt, PER_OVERZICHT))
    const overzichtNu = nieuwGemaakt >= PER_OVERZICHT

    // na 5 goede een spelletje — maar op de 20e opgave gaat het eindoverzicht vóór
    if (correct) {
      const nieuwSinds = sinds + 1
      if (!overzichtNu && nieuwSinds >= PER_BELONING) { setSinds(0); setPhase('keuze'); return }
      setSinds(nieuwSinds)
    }

    // na precies 20 opgaven het overzicht
    if (overzichtNu) { setPhase('overzicht') }
  }, [idx, sinds, gemaakt, oef, oefeningen.length, gekozenCats])

  // Nieuwe ronde: terug naar cat-selectie
  const nieuweRonde = useCallback(() => {
    setStats(legeStats()); setFouten([]); setGemaakt(0); setSinds(0)
    setGekozenCats(null); setPhase('play')
  }, [])

  const startMetCats = useCallback((cats) => {
    setGekozenCats(cats)
    setOefeningen(shuffleGefilterd(cats))
    setIdx(0); setSinds(0); setGemaakt(0); setStats(legeStats()); setFouten([])
  }, [])

  const astroKlaar   = useCallback(() => setPhase('play'), [])
  const tdKlaar      = useCallback(() => { addBriefgeld?.(beloning); setVerdiend(v => v + beloning); setPhase('play') }, [addBriefgeld, beloning])
  const tdTerug      = useCallback(() => { setTdStarted(false); setPhase('play') }, [])
  const jetpackKlaar = useCallback(() => setPhase('play'), [])
  const voetbalKlaar = useCallback((won, nextBracket, played) => {
    setFootballBracket(nextBracket || null)
    if (played) { addBriefgeld?.(beloning); setVerdiend(v => v + beloning) }
    setPhase('play')
  }, [addBriefgeld, beloning])

  // ── Early return voor cat-selectie (pas ná alle hooks) ──
  if (gekozenCats === null) {
    return <div className="ws-catsel-screen"><CatSelectie groep={groep} onStart={startMetCats} onBack={onBack} /></div>
  }

  const totaalGoed = CATEGORIEEN.reduce((sum, c) => sum + stats[c.key].goed, 0)

  const kiesBeloning = (key) => {
    if (key === 'towerdefense') setTdStarted(true)
    if (key === 'astrokatapult') { addBriefgeld?.(beloning); setVerdiend(v => v + beloning) }
    setPhase(key)
  }

  // ── Niet-persistente spellen (volledig unmounten na gebruik) ──
  if (phase === 'football') {
    return (
      <FootballGame
        rewardMode
        noQuiz
        initialBracket={footballBracket}
        onMatchDone={voetbalKlaar}
        onBack={() => setPhase('play')}
        addCuruntie={() => {}}
      />
    )
  }
  if (phase === 'jetpack') {
    return <JetpackBeloning onDone={jetpackKlaar} />
  }
  if (phase === 'astrokatapult') {
    return <AstroBeloning onDone={astroKlaar} />
  }
  if (phase === 'spacerunner') {
    return <SpacerunnerBeloning onDone={jetpackKlaar} />
  }
  if (phase === 'overzicht') {
    return (
      <div className="ws-wrap">
        <Overzicht stats={stats} totaalGoed={totaalGoed} fouten={fouten} onVerder={nieuweRonde} />
      </div>
    )
  }

  // ── Hoofd-render (ook als TD actief is, TD wordt er bovenop gelegd) ──
  return (
    <>
      {/* Tower Defense: persistent gemount, zichtbaar via prop */}
      {tdStarted && (
        <TowerDefenseGame
          visible={phase === 'towerdefense'}
          onBack={tdTerug}
          onRoundDone={tdKlaar}
        />
      )}

      {/* Beloningkeuze — gedeeld reward-systeem met alle 6 games */}
      {phase === 'keuze' && (
        <SpelBeloning
          title="5 goed gedaan!"
          geld={beloning}
          addCuruntie={() => {}}
          onDone={() => { addBriefgeld?.(beloning); setVerdiend(v => v + beloning); setPhase('play') }}
        />
      )}

      {/* Oefenscherm (altijd gemount als niet football/jetpack) */}
      {(phase === 'play' || phase === 'keuze') && (
        <div className="ws-wrap" style={{ display: phase === 'play' ? 'flex' : 'none' }}>
          <div className="ws-oefen">
            <div className="ws-header">
              <button className="ws-back-btn" onClick={onBack}>← Terug</button>
              <div className="ws-header-title">Werkwoordspelling · Groep {groep}</div>
              <span className="ws-verdiend">💵 € {verdiend}</span>
            </div>

            <div className="ws-progress-wrap">
              <div className="ws-progress-bar" style={{ width: `${(sinds / PER_BELONING) * 100}%` }} />
            </div>
            <div className="ws-progress-label">
              <span>{PER_BELONING - sinds} goede tot een spelletje 🎮</span>
              <span className="ws-opgave-teller">Opgave {gemaakt + 1} / {PER_OVERZICHT}</span>
            </div>

            <VraagKaart key={idx} oef={oef} onNext={volgende} />
          </div>
        </div>
      )}
    </>
  )
}
