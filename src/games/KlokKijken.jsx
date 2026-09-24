import { useState, useCallback } from 'react'
import SpelBeloning from './SpelBeloning'
import { useGebruikOpdracht } from './gebruikOpdracht.js'
import OpdrachtKlaarScherm from './OpdrachtKlaarScherm.jsx'
import { LEVELS, maakOpgave, tijdLabel } from './klokData.js'
import './verhaaltjes-sommen.css'
import './klok-kijken.css'

const PER_BELONING = 5
const BELONING     = 50

function AnalogeKlok({ t, klein = false }) {
  const h = Math.floor(t / 60) % 12, m = t % 60
  const uurHoek = h * 30 + m * 0.5, minHoek = m * 6
  return (
    <svg className={`klk-analoog${klein ? ' klk-klein' : ''}`} viewBox="-110 -110 220 220" role="img"
      aria-label="klok">
      <defs>
        <radialGradient id="klk-wijzerplaat" cx="0" cy="-20" r="120" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1d2350" />
          <stop offset="1" stopColor="#0b0e26" />
        </radialGradient>
      </defs>
      <circle r="106" className="klk-rand" />
      <circle r="98" fill="url(#klk-wijzerplaat)" />
      {Array.from({ length: 60 }, (_, i) => {
        const groot = i % 5 === 0
        return (
          <line key={i} x1="0" y1={groot ? -92 : -94} x2="0" y2="-86"
            transform={`rotate(${i * 6})`} className={groot ? 'klk-streep-groot' : 'klk-streep'} />
        )
      })}
      {!klein && Array.from({ length: 12 }, (_, i) => {
        const n = i + 1, a = (n * 30 - 90) * Math.PI / 180
        return (
          <text key={n} x={Math.cos(a) * 71} y={Math.sin(a) * 71} className="klk-cijfer"
            textAnchor="middle" dominantBaseline="central">{n}</text>
        )
      })}
      <line x1="0" y1="10" x2="0" y2="-50" className="klk-uurwijzer" transform={`rotate(${uurHoek})`} />
      <line x1="0" y1="14" x2="0" y2="-80" className="klk-minuutwijzer" transform={`rotate(${minHoek})`} />
      <circle r="7" className="klk-as" />
    </svg>
  )
}

function DigitaleKlok({ tekst, klein = false }) {
  return <div className={`klk-digitaal${klein ? ' klk-klein' : ''}`}>{tekst}</div>
}

function Klok({ t, modus, level, klein }) {
  return modus === 'analoog'
    ? <AnalogeKlok t={t} klein={klein} />
    : <DigitaleKlok tekst={tijdLabel(t, modus, level)} klein={klein} />
}

function VraagKaart({ opgave, modus, level, onNext }) {
  const [gekozen, setGekozen] = useState(null)

  const goed = gekozen === opgave.goed
  const klokOpties = opgave.soort === 'zet'

  return (
    <div className="rs-card">
      <div className="rs-vraag klk-vraag">{opgave.vraag}</div>

      {(opgave.soort === 'lees' || opgave.soort === 'later') && (
        <div className="klk-beeld"><Klok t={opgave.soort === 'lees' ? opgave.t : opgave.t0} modus={modus} level={level} /></div>
      )}
      {opgave.soort === 'duur' && (
        <div className="klk-beeld klk-duur">
          <Klok t={opgave.t0} modus={modus} level={level} klein />
          <span className="klk-pijl">→</span>
          <Klok t={opgave.t1} modus={modus} level={level} klein />
        </div>
      )}

      <div className={`klk-opties${klokOpties ? ' klk-opties-klok' : ''}`}>
        {opgave.opties.map(o => {
          let cls = 'klk-optie'
          if (gekozen !== null) {
            if (o.key === opgave.goed) cls += ' klk-goed'
            else if (o.key === gekozen) cls += ' klk-fout'
            else cls += ' klk-uit'
          }
          return (
            <button key={o.key} className={cls} disabled={gekozen !== null} onClick={() => setGekozen(o.key)}>
              {klokOpties ? <Klok t={o.t} modus={modus} level={level} klein /> : o.label}
            </button>
          )
        })}
      </div>

      {gekozen !== null && (
        <div className={`rs-feedback ${goed ? 'rs-goed' : 'rs-fout'}`}>
          <span>{goed ? '🎉 Goed!' : <>❌ Het goede antwoord is <b>{opgave.juist}</b>.</>}</span>
          <div className="rs-uitleg">💡 {opgave.uitleg}</div>
          <button className="rs-verder-btn" onClick={() => onNext(goed)}>{goed ? 'Verder →' : 'Volgende →'}</button>
        </div>
      )}
    </div>
  )
}

// aantal/config: alleen gezet vanuit een weektaak-opdracht (toolRender.jsx).
// config = { weergave, level } — slaat de keuzeschermen over.
export default function KlokKijken({ onBack, addBriefgeld, addCuruntie, aantal, config }) {
  const opdracht = useGebruikOpdracht({ toolId: 'klokkijken', aantal })
  // Vanuit een weektaak-opdracht beginnen we meteen met de ingestelde klok en level.
  const startModus = config ? (config.weergave === 'digitaal' ? 'digitaal' : 'analoog') : null
  const startLevel = config ? (Number(config.level) || 1) : null
  const [modus, setModus] = useState(startModus)
  const [level, setLevel] = useState(startLevel)
  const [opgave, setOpgave] = useState(() => (config ? maakOpgave(startModus, startLevel) : null))
  const [sinds, setSinds] = useState(0)
  const [verdiend, setVerdiend] = useState(0)
  const [showReward, setShowReward] = useState(false)

  const start = (m, n) => { setModus(m); setLevel(n); setSinds(0); setOpgave(maakOpgave(m, n)) }

  const volgende = useCallback((correct) => {
    const zalKlaarZijn = opdracht.aantal != null && (opdracht.gedaan + 1) >= opdracht.aantal
    opdracht.registreer(correct, {
      vraag: opgave ? opgave.vraag : null,
      juist: opgave ? opgave.juist : null,
    })
    if (zalKlaarZijn) return
    if (correct) {
      const ns = sinds + 1
      if (ns >= PER_BELONING) { setSinds(0); setShowReward(true); return }
      setSinds(ns)
    }
    setOpgave(maakOpgave(modus, level))
  }, [sinds, modus, level, opgave, opdracht])

  const naBeloning = () => {
    setShowReward(false)
    addBriefgeld?.(BELONING)
    setVerdiend(v => v + BELONING)
    setOpgave(maakOpgave(modus, level))
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

  if (modus === null) {
    return (
      <div className="rs-screen">
        <button className="rs-back" onClick={onBack}>← Terug</button>
        <div className="rs-header">
          <span className="rs-icon">🕒</span>
          <h1 className="rs-title">Klokkijken</h1>
          <p className="rs-sub">Welke klok wil je oefenen?</p>
        </div>
        <div className="rs-groep-grid">
          <button className="rs-groep-card" onClick={() => setModus('analoog')}>
            <div className="klk-keuze-beeld"><AnalogeKlok t={3 * 60 + 40} klein /></div>
            <span className="rs-groep-naam">Analoog</span>
            <span className="rs-groep-desc">Een klok met wijzers</span>
            <span className="vb-line">"twintig voor vier"</span>
          </button>
          <button className="rs-groep-card" onClick={() => setModus('digitaal')}>
            <div className="klk-keuze-beeld"><DigitaleKlok tekst="15:40" klein /></div>
            <span className="rs-groep-naam">Digitaal</span>
            <span className="rs-groep-desc">Een klok met cijfers</span>
            <span className="vb-line">"15:40"</span>
          </button>
        </div>
      </div>
    )
  }

  if (level === null) {
    return (
      <div className="rs-screen">
        <button className="rs-back" onClick={() => setModus(null)}>← Terug</button>
        <div className="rs-header">
          <span className="rs-icon">🕒</span>
          <h1 className="rs-title">Klokkijken — {modus === 'analoog' ? 'analoog' : 'digitaal'}</h1>
          <p className="rs-sub">Kies je level</p>
        </div>
        <div className="rs-groep-grid">
          {LEVELS.map(l => (
            <button key={l.n} className="rs-groep-card" onClick={() => start(modus, l.n)}>
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
        <span className="rs-verdiend">🕒 Level {level}</span>
        <span className="rs-verdiend">💵 € {verdiend}</span>
      </div>
      <div className="rs-progress-wrap">
        <div className="rs-progress-bar" style={{ width: `${(sinds / PER_BELONING) * 100}%` }} />
      </div>
      <div className="rs-progress-label">{PER_BELONING - sinds} goede tot een spelletje 🎮</div>
      {/* key: bij elke nieuwe opgave een verse kaart, zodat de vorige keuze weg is */}
      {opgave && <VraagKaart key={opgave.id} opgave={opgave} modus={modus} level={level} onNext={volgende} />}
    </div>
  )
}
