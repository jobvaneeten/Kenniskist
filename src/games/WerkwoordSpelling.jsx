import { useState, useRef, useEffect, useCallback } from 'react'
import FootballGame from './FootballGame'
import TowerDefenseGame from './TowerDefenseGame'
import { shuffleOefeningen, checkAntwoord, uitlegVoor } from './werkwoorden'
import { BeloningKeuze, JetpackBeloning, AstroBeloning, SpacerunnerBeloning, BRIEFGELD } from './Beloning'
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

// ── Hoofdcomponent ───────────────────────────────────────────────────────
export default function WerkwoordSpelling({ groep, onBack, addBriefgeld }) {
  const [oefeningen, setOefeningen] = useState(() => shuffleOefeningen())
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

  const volgende = useCallback((correct, jouwInput) => {
    // categoriseer en registreer
    const cat = catVan(oef)
    setStats(s => ({ ...s, [cat]: { goed: s[cat].goed + (correct ? 1 : 0), fout: s[cat].fout + (correct ? 0 : 1) } }))
    if (!correct) {
      setFouten(f => [...f, { inf: oef.inf, antwoord: oef.antwoord, jouw: jouwInput, cat }])
    }

    // volgende opgave
    const nieuwIdx = idx + 1
    if (nieuwIdx >= oefeningen.length) { setOefeningen(shuffleOefeningen()); setIdx(0) }
    else setIdx(nieuwIdx)

    // 20-opgaven overzicht heeft voorrang
    const nieuwGemaakt = gemaakt + 1
    if (nieuwGemaakt >= PER_OVERZICHT) {
      setGemaakt(PER_OVERZICHT)   // bevries op 20 voor het overzicht
      setPhase('overzicht')
      return
    }
    setGemaakt(nieuwGemaakt)

    // anders: na 5 goede een spelletje
    if (correct) {
      const nieuwSinds = sinds + 1
      if (nieuwSinds >= PER_BELONING) { setSinds(0); setPhase('keuze') }
      else setSinds(nieuwSinds)
    }
  }, [idx, sinds, gemaakt, oef, oefeningen.length])

  // Nieuwe ronde starten na het overzicht
  const nieuweRonde = useCallback(() => {
    setStats(legeStats()); setFouten([]); setGemaakt(0); setSinds(0); setPhase('play')
  }, [])

  const totaalGoed = CATEGORIEEN.reduce((sum, c) => sum + stats[c.key].goed, 0)

  const kiesBeloning = (key) => {
    if (key === 'towerdefense') setTdStarted(true)
    // Astro Katapult: je krijgt de €50 meteen (zodra je speelt)
    if (key === 'astrokatapult') { addBriefgeld?.(BRIEFGELD); setVerdiend(v => v + BRIEFGELD) }
    setPhase(key)
  }

  // Astro Katapult klaar (1 level gespeeld) → briefgeld is al gegeven → terug
  const astroKlaar = useCallback(() => setPhase('play'), [])

  // Tower Defense golf klaar → 50 briefgeld + terug naar spelling (spel blijft gemount)
  const tdKlaar = useCallback(() => {
    addBriefgeld?.(BRIEFGELD); setVerdiend(v => v + BRIEFGELD)
    setPhase('play')
  }, [addBriefgeld])

  // TD handmatig verlaten (via ← Terug) → volledig unmounten
  const tdTerug = useCallback(() => {
    setTdStarted(false)
    setPhase('play')
  }, [])

  // Jetpack klaar → munten zaten al in het spel → geen briefgeld
  const jetpackKlaar = useCallback(() => setPhase('play'), [])

  // Voetbal-wedstrijd afgelopen → toernooi bewaren, 50 briefgeld (als gespeeld), terug
  const voetbalKlaar = useCallback((won, nextBracket, played) => {
    setFootballBracket(nextBracket || null)
    if (played) { addBriefgeld?.(BRIEFGELD); setVerdiend(v => v + BRIEFGELD) }
    setPhase('play')
  }, [addBriefgeld])

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

      {/* Beloningkeuze */}
      {phase === 'keuze' && (
        <div className="ws-wrap">
          <BeloningKeuze onPick={kiesBeloning} heeftToernooi={!!footballBracket} />
        </div>
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
