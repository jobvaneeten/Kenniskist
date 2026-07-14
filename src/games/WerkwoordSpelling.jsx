import { useState, useRef, useEffect, useCallback } from 'react'
import FootballGame from './FootballGame'
import TowerDefenseGame from './TowerDefenseGame'
import { shuffleOefeningen, shuffleGefilterd, checkAntwoord, uitlegVoor, tokeniseerZin, onderwerpIndices } from './werkwoorden'
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

// ── Onderwerp markeren: los oefenbankje met volledige zinnen ────────────
const ONDERWERP_ZINNEN = [
  { zin: 'De kleine hond blaft naar de postbode.',            onderwerp: 'De kleine hond' },
  { zin: 'Mijn broer en ik voetballen elke zaterdag.',        onderwerp: 'Mijn broer en ik' },
  { zin: 'De juf legt de nieuwe les rustig uit.',              onderwerp: 'De juf' },
  { zin: 'Een grote groep kinderen wacht bij het hek.',       onderwerp: 'Een grote groep kinderen' },
  { zin: 'Hij fietst iedere dag naar school.',                 onderwerp: 'Hij' },
  { zin: 'De rode auto rijdt hard over de weg.',              onderwerp: 'De rode auto' },
  { zin: 'Wij hebben gisteren een taart gebakken.',           onderwerp: 'Wij' },
  { zin: 'Mijn opa en oma komen dit weekend op bezoek.',      onderwerp: 'Mijn opa en oma' },
  { zin: 'De kat slaapt de hele dag op de bank.',             onderwerp: 'De kat' },
  { zin: 'Sam en zijn vrienden spelen buiten in de tuin.',    onderwerp: 'Sam en zijn vrienden' },
]

// Klikbare woorden om het onderwerp in een zin te markeren, met controle/feedback.
// onKlaar(goed) wordt aangeroepen zodra de leerling gecontroleerd heeft.
function OnderwerpMarker({ zin, onderwerp, compact, onKlaar }) {
  const [selected, setSelected] = useState(new Set())
  const [phase, setPhase] = useState('answering') // answering | good | bad

  useEffect(() => { setSelected(new Set()); setPhase('answering') }, [zin, onderwerp])

  const woorden = tokeniseerZin(zin)
  const juisteIdx = onderwerpIndices(zin, onderwerp)

  const toggle = (i) => {
    if (phase !== 'answering') return
    setSelected(prev => {
      const s = new Set(prev)
      if (s.has(i)) s.delete(i); else s.add(i)
      return s
    })
  }

  const check = () => {
    const gekozen = [...selected].sort((a, b) => a - b)
    const goed = gekozen.length === juisteIdx.length && gekozen.every((v, i) => v === juisteIdx[i])
    setPhase(goed ? 'good' : 'bad')
    onKlaar?.(goed)
  }

  return (
    <div className={`ws-ond-marker ${compact ? 'ws-ond-compact' : ''}`}>
      {!compact && <p className="ws-ond-vraag">🎯 Klik op het onderwerp van de zin:</p>}
      <div className="ws-ond-zin">
        {woorden.map((w, i) => {
          const isSel = selected.has(i)
          const isJuist = juisteIdx.includes(i)
          const cls = phase === 'answering'
            ? (isSel ? 'ws-ond-sel' : '')
            : (isJuist ? 'ws-ond-goed' : (isSel ? 'ws-ond-fout' : ''))
          return (
            <span key={i} className={`ws-ond-word ${cls}`} onClick={() => toggle(i)}>{w}</span>
          )
        })}
      </div>
      {phase === 'answering'
        ? <button className="ws-ond-check-btn" onClick={check} disabled={selected.size === 0}>Controleer onderwerp →</button>
        : <div className={`ws-ond-feedback ${phase === 'good' ? 'ws-goed' : 'ws-fout'}`}>
            {phase === 'good' ? '✅ Goed! Dat is het onderwerp.' : `❌ Niet helemaal. Het onderwerp is "${onderwerp}".`}
          </div>}
    </div>
  )
}

function OnderwerpOefenScherm({ onBack }) {
  const [idx, setIdx] = useState(0)
  const item = ONDERWERP_ZINNEN[idx % ONDERWERP_ZINNEN.length]
  return (
    <div className="ws-catsel">
      <button className="ws-back-btn ws-catsel-back" onClick={onBack}>← Terug</button>
      <div className="ws-catsel-header">
        <span className="ws-icon">🎯</span>
        <h1 className="ws-title">Onderwerp markeren</h1>
        <p className="ws-sub">Klik het onderwerp van de zin aan</p>
      </div>
      <OnderwerpMarker key={idx} zin={item.zin} onderwerp={item.onderwerp} />
      <button className="ws-ov-verder-btn" onClick={() => setIdx(i => i + 1)}>Volgende zin →</button>
    </div>
  )
}

// ── Vraagkaart ───────────────────────────────────────────────────────────
// eerstOnderwerp: dan moet bij elke opgave eerst het onderwerp gemarkeerd
// worden voordat het invulveld verschijnt.
function VraagKaart({ oef, onNext, eerstOnderwerp }) {
  const moetMarkeren = !!(eerstOnderwerp && oef.onderwerp)
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState('answering')
  const [ondKlaar, setOndKlaar] = useState(!moetMarkeren)
  const inputRef = useRef(null)

  useEffect(() => {
    setInput(''); setPhase('answering'); setOndKlaar(!moetMarkeren)
    if (!moetMarkeren) setTimeout(() => inputRef.current?.focus(), 50)
  }, [oef, moetMarkeren])

  const onderwerpGedaan = (goed) => {
    // even de feedback laten lezen, dan door naar het invullen
    setTimeout(() => { setOndKlaar(true); setTimeout(() => inputRef.current?.focus(), 50) }, goed ? 600 : 1800)
  }

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

      {!ondKlaar ? (
        <OnderwerpMarker zin={oef.zin.replace('___', '…')} onderwerp={oef.onderwerp} onKlaar={onderwerpGedaan} />
      ) : (
        <>
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
        </>
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

function CatSelectie({ groep, onStart, onBack, onOnderwerp }) {
  const [gekozen, setGekozen] = useState(new Set(ALLE_CATS))
  const [metOnderwerp, setMetOnderwerp] = useState(false)

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
        <button
          className={`ws-catsel-rij ws-ond-row${metOnderwerp ? ' aan' : ''}`}
          onClick={() => setMetOnderwerp(v => !v)}
        >
          <span className="ws-catsel-check">{metOnderwerp ? '☑' : '☐'}</span>
          <span className="ws-catsel-tekst">
            <span className="ws-catsel-label">🎯 Onderwerp markeren</span>
            <span className="ws-catsel-vb">klik bij elke zin eerst het onderwerp aan vóór je invult</span>
          </span>
        </button>
      </div>
      <p className="ws-catsel-uitleg">Je verdient € 10 per onderdeel dat je aanvinkt bij elk spelletje 🎮</p>
      <button className="ws-ov-verder-btn" onClick={() => onStart(gekozen, metOnderwerp)}>
        Start! (€ {gekozen.size * 10} per spel) →
      </button>
      <button className="ws-catsel-onderwerp-btn" onClick={onOnderwerp}>
        🎯 Onderwerp markeren oefenen →
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
  const [onderwerpActief, setOnderwerpActief] = useState(false)
  const [metOnderwerp, setMetOnderwerp] = useState(false)  // eerst onderwerp markeren per opgave

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

  const startMetCats = useCallback((cats, ond) => {
    setGekozenCats(cats)
    setMetOnderwerp(!!ond)
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
  if (onderwerpActief) {
    return <div className="ws-catsel-screen"><OnderwerpOefenScherm onBack={() => setOnderwerpActief(false)} /></div>
  }
  if (gekozenCats === null) {
    return <div className="ws-catsel-screen"><CatSelectie groep={groep} onStart={startMetCats} onBack={onBack} onOnderwerp={() => setOnderwerpActief(true)} /></div>
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

            <VraagKaart key={idx} oef={oef} onNext={volgende} eerstOnderwerp={metOnderwerp} />
          </div>
        </div>
      )}
    </>
  )
}
