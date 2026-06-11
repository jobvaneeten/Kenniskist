import { useState } from 'react'
import { DOELEN, OEFENVRAGEN, INSTAPTOETS_VRAGEN } from './toetsThema8Data.js'
import SpelBeloning from './SpelBeloning'
import './toets-oefenen.css'

const BELONING = 50           // briefgeld, 1x per afgeronde doel-oefening
const BELOOND_KEY = 'kk_toets8_beloond'
const SCORES_KEY = 'kk_toets8_scores'
const ZINSDEEL_OPTIES = ['ond', 'pv/gez', 'gez', 'lv', 'mv', 'bep']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function laadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')) } catch { return new Set() }
}
function laadScores() {
  try { return JSON.parse(localStorage.getItem(SCORES_KEY) || '{}') } catch { return {} }
}

// ── Eén vraag: regelt eigen antwoord-state, geeft resultaat terug ──
function Vraag({ vraag, onResult }) {
  const [woordSel, setWoordSel] = useState(new Set())   // gezegde
  const [optie, setOptie] = useState(null)              // meerkeuze
  const [zinsdeel, setZinsdeel] = useState({})          // zinsdelen idx→waarde
  const [checked, setChecked] = useState(false)

  const isGezegde = vraag.type === 'gezegde'
  const isMeerkeuze = vraag.buitenlands !== undefined || vraag.spreekwoord !== undefined || vraag.gedicht !== undefined
  const isZinsdelen = vraag.delen !== undefined

  // antwoord compleet genoeg om te controleren?
  let kanControleren = false
  if (isGezegde) kanControleren = woordSel.size > 0
  else if (isMeerkeuze) kanControleren = optie !== null
  else if (isZinsdelen) {
    const nodig = vraag.delen.filter(d => !d.isVoegwoord).length
    kanControleren = Object.values(zinsdeel).filter(Boolean).length === nodig
  }

  function bepaalGoed() {
    if (isGezegde) {
      const correct = new Set(vraag.gezegde)
      return correct.size === woordSel.size && [...correct].every(i => woordSel.has(i))
    }
    if (isMeerkeuze) {
      const correctIdx = vraag.rijmsoort !== undefined ? vraag.opties.indexOf(vraag.rijmsoort) : vraag.correct
      return optie === correctIdx
    }
    // zinsdelen
    return vraag.delen.every((d, i) => d.isVoegwoord || zinsdeel[i] === d.label)
  }

  function controleer() {
    if (!kanControleren || checked) return
    setChecked(true)
    onResult(bepaalGoed())
  }

  const correctIdx = isMeerkeuze
    ? (vraag.rijmsoort !== undefined ? vraag.opties.indexOf(vraag.rijmsoort) : vraag.correct)
    : -1

  return (
    <>
      {/* GEZEGDE */}
      {isGezegde && (
        <>
          <p className="to-vraag-tekst">Klik op de woorden die <strong>samen het gezegde</strong> vormen:</p>
          <div className="to-context">"{vraag.zin}"</div>
          <p className="to-hint">💡 Tip: het gezegde = de persoonsvorm + eventueel andere werkwoorden</p>
          <div className="to-woorden">
            {vraag.woorden.map((w, i) => {
              let cls = 'to-woord'
              if (checked) {
                const inCorrect = vraag.gezegde.includes(i)
                const gekozen = woordSel.has(i)
                if (inCorrect && gekozen) cls += ' goed'
                else if (!inCorrect && gekozen) cls += ' fout'
                else if (inCorrect && !gekozen) cls += ' gemist'
              } else if (woordSel.has(i)) cls += ' geselecteerd'
              return (
                <button key={i} className={cls} disabled={checked}
                  onClick={() => setWoordSel(prev => {
                    const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n
                  })}>{w}</button>
              )
            })}
          </div>
        </>
      )}

      {/* MEERKEUZE */}
      {isMeerkeuze && (
        <>
          {vraag.buitenlands !== undefined && (
            <p className="to-vraag-tekst">Wat is het <strong>Nederlandse woord</strong> voor: <span className="to-fremd">"{vraag.buitenlands}"</span>?</p>
          )}
          {vraag.spreekwoord !== undefined && (
            <>
              <p className="to-vraag-tekst">Vul het spreekwoord aan. Welk woord past op de plek van ___?</p>
              <div className="to-context">"{vraag.spreekwoord}"</div>
            </>
          )}
          {vraag.gedicht !== undefined && (
            <>
              <p className="to-vraag-tekst">Welk soort rijm zie je hier?</p>
              <div className="to-context">{vraag.gedicht.map((r, i) => <div key={i}>{r}</div>)}</div>
            </>
          )}
          <div className="to-opties">
            {vraag.opties.map((opt, i) => {
              let cls = 'to-optie'
              if (checked) {
                if (i === correctIdx) cls += ' goed'
                else if (i === optie) cls += ' fout'
              } else if (optie === i) cls += ' geselecteerd'
              return (
                <button key={i} className={cls} disabled={checked} onClick={() => setOptie(i)}>
                  <span className="to-opt-letter">{['A', 'B', 'C'][i]}</span>{opt}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* ZINSDELEN */}
      {isZinsdelen && (
        <>
          <p className="to-vraag-tekst">Geef elk zinsdeel de <strong>juiste naam</strong>.{vraag.soort === 'samengesteld' ? ' Het voegwoord staat er al bij.' : ''}</p>
          <div className={`to-zin-badge ${vraag.soort === 'samengesteld' ? 'samengesteld' : 'enkelvoudig'}`}>
            {vraag.soort === 'samengesteld' ? '🔗 Samengestelde zin — hoofdzin + bijzin' : '1️⃣ Enkelvoudige zin — één persoonsvorm'}
          </div>
          <div className="to-context">"{vraag.zin}"</div>
          <div className="to-legende">
            <span>ond = onderwerp</span><span>pv/gez = persoonsvorm</span><span>gez = gezegde (groep)</span>
            <span>lv = lijdend vw.</span><span>mv = meewerk. vw.</span><span>bep = bepaling</span>
          </div>
          <div className="to-zinsdelen">
            {vraag.delen.map((d, i) => {
              if (d.isVoegwoord) return (
                <div key={i} className="to-voegwoord"><span className="to-voegwoord-label">voegwoord</span>{d.tekst}</div>
              )
              const goed = checked && zinsdeel[i] === d.label
              const fout = checked && zinsdeel[i] !== d.label
              return (
                <div key={i} className={`to-zinsdeel ${goed ? 'goed' : ''} ${fout ? 'fout' : ''}`}>
                  <div className="to-zinsdeel-tekst">{d.tekst}</div>
                  <select className="to-zinsdeel-select" disabled={checked} value={zinsdeel[i] || ''}
                    onChange={e => setZinsdeel(prev => ({ ...prev, [i]: e.target.value }))}>
                    <option value="">kies...</option>
                    {ZINSDEEL_OPTIES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {checked && <div className={`to-zinsdeel-hint ${goed ? 'goed' : 'fout'}`}>{goed ? '✓ ' : '→ '}{d.label}</div>}
                </div>
              )
            })}
          </div>
        </>
      )}

      {checked ? (
        <div className={`to-feedback ${bepaalGoed() ? 'goed' : 'fout'}`}>
          <strong>{bepaalGoed() ? '✅ Goed zo! ' : '❌ Niet helemaal. '}</strong>{vraag.uitleg}
        </div>
      ) : (
        <button className="to-btn to-btn-primary" disabled={!kanControleren} onClick={controleer}>✅ Controleer</button>
      )}
    </>
  )
}

export default function ToetsOefenen({ onBack, addBriefgeld, addCuruntie }) {
  const [screen, setScreen] = useState('thema')
  const [scores, setScores] = useState(laadScores)
  const [beloond, setBeloond] = useState(laadSet(BELOOND_KEY))

  // run-state (instaptoets of doel-oefening)
  const [vragen, setVragen] = useState([])
  const [idx, setIdx] = useState(0)
  const [goed, setGoed] = useState(0)
  const [beantwoord, setBeantwoord] = useState(false)
  const [oeDoel, setOeDoel] = useState(null)            // null = instaptoets
  const [itResultaat, setItResultaat] = useState({})
  const [showReward, setShowReward] = useState(false)

  function startInstap() {
    setOeDoel(null)
    setVragen(INSTAPTOETS_VRAGEN)
    setIdx(0); setGoed(0); setBeantwoord(false)
    setItResultaat({ 1: { g: 0, t: 0 }, 2: { g: 0, t: 0 }, 3: { g: 0, t: 0 }, 4: { g: 0, t: 0 }, 5: { g: 0, t: 0 } })
    setScreen('vraag')
  }

  function startDoel(doelId) {
    setOeDoel(doelId)
    setVragen(shuffle(OEFENVRAGEN[doelId - 1]).slice(0, 8))
    setIdx(0); setGoed(0); setBeantwoord(false)
    setScreen('vraag')
  }

  function onResult(correct) {
    setBeantwoord(true)
    if (correct) setGoed(g => g + 1)
    if (oeDoel === null) {
      const doel = vragen[idx].doel
      setItResultaat(prev => ({ ...prev, [doel]: { g: prev[doel].g + (correct ? 1 : 0), t: prev[doel].t + 1 } }))
    }
  }

  function volgende() {
    const next = idx + 1
    if (next >= vragen.length) {
      if (oeDoel === null) { setScreen('instapResult'); return }
      // doel-oefening klaar → score + eenmalige beloning
      const pct = Math.round((goed / vragen.length) * 100)
      const nieuweScores = { ...scores, [oeDoel]: pct }
      setScores(nieuweScores)
      try { localStorage.setItem(SCORES_KEY, JSON.stringify(nieuweScores)) } catch {}
      if (!beloond.has(oeDoel)) {
        const n = new Set(beloond); n.add(oeDoel); setBeloond(n)
        try { localStorage.setItem(BELOOND_KEY, JSON.stringify([...n])) } catch {}
        setScreen('eindscore')
        setShowReward(true)
        return
      }
      setScreen('eindscore')
      return
    }
    setIdx(next); setBeantwoord(false)
  }

  function naBeloning() {
    setShowReward(false)
    if (addBriefgeld) addBriefgeld(BELONING)
  }

  if (showReward) {
    return (
      <SpelBeloning
        title="Oefening voltooid! 🎉"
        sub={`Je verdient eenmalig ${BELONING} briefgeld voor dit doel`}
        geld={BELONING}
        addCuruntie={addCuruntie}
        onDone={naBeloning}
      />
    )
  }

  // ── VRAAG-SCHERM ──
  if (screen === 'vraag') {
    const v = vragen[idx]
    const doel = DOELEN[(oeDoel ?? v.doel) - 1]
    return (
      <div className="to-screen">
        <div className="to-top-bar">
          <button className="to-back" onClick={() => setScreen(oeDoel === null ? 'thema' : 'doelen')}>← Stop</button>
          <div className="to-teller">Vraag {idx + 1} van {vragen.length}</div>
        </div>
        <div className="to-prog"><div className="to-prog-vul" style={{ width: `${(idx / vragen.length) * 100}%`, background: doel.kleur }} /></div>
        <div className="to-card">
          <div className="to-kleur-balk" style={{ background: doel.kleur }} />
          <Vraag key={idx} vraag={v} onResult={onResult} />
        </div>
        {beantwoord && (
          <button className="to-btn to-btn-light" onClick={volgende}>
            {idx + 1 >= vragen.length ? 'Klaar →' : 'Volgende →'}
          </button>
        )}
      </div>
    )
  }

  // ── INSTAPTOETS RESULTAAT ──
  if (screen === 'instapResult') {
    return (
      <div className="to-screen">
        <div className="to-top-bar">
          <button className="to-back" onClick={() => setScreen('doelen')}>← Verder</button>
          <h2 className="to-titel">Jouw resultaat 🎯</h2>
        </div>
        <p className="to-sub">Dit heb ik gevonden. Klik op een doel om te oefenen.</p>
        {DOELEN.map(d => {
          const r = itResultaat[d.id]
          if (!r || r.t === 0) return null
          const pct = Math.round((r.g / r.t) * 100)
          const beheerst = pct >= 60
          return (
            <div key={d.id} className="to-result-kaart" style={{ borderColor: d.kleur + '66', background: d.licht + '22' }}>
              <div>
                <h3>{d.emoji} Doel {d.id} — {d.naam}</h3>
                <p>{r.g} van {r.t} goed ({pct}%)</p>
              </div>
              {beheerst
                ? <span className="to-badge groen">✓ Beheerst!</span>
                : <button className="to-btn-mini" onClick={() => startDoel(d.id)}>Oefen →</button>}
            </div>
          )
        })}
      </div>
    )
  }

  // ── EINDSCORE doel-oefening ──
  if (screen === 'eindscore') {
    const d = DOELEN[oeDoel - 1]
    const pct = scores[oeDoel] ?? 0
    const titel = pct >= 80 ? 'Geweldig! 🎉' : pct >= 50 ? 'Goed bezig! 💪' : 'Nog even oefenen 📖'
    return (
      <div className="to-screen to-center">
        <div className="to-eind-cirkel" style={{ borderColor: d.kleur, color: d.kleur, background: d.licht + '22' }}>
          <div className="to-eind-getal">{pct}%</div>
          <div className="to-eind-label">{goed} van {vragen.length} goed</div>
        </div>
        <h2 className="to-titel">{titel}</h2>
        <p className="to-sub">Doel {oeDoel}: {d.naam}</p>
        <button className="to-btn to-btn-primary" onClick={() => startDoel(oeDoel)}>🔄 Opnieuw oefenen</button>
        <button className="to-btn to-btn-light" onClick={() => setScreen('doelen')}>← Naar doelen</button>
      </div>
    )
  }

  // ── DOELEN-OVERZICHT (Thema 8) ──
  if (screen === 'doelen') {
    return (
      <div className="to-screen">
        <button className="to-back" onClick={() => setScreen('thema')}>← Thema's</button>
        <div className="to-header">
          <span className="to-header-icon">📝</span>
          <h1>Thema 8</h1>
          <p>Oefenen voor de toets</p>
        </div>
        <button className="to-instap-kaart" onClick={startInstap}>
          <span className="to-instap-icon">🔍</span>
          <div><h3>Instaptoets doen</h3><p>Ontdek in ±5 min wat je al weet.</p></div>
          <span className="to-instap-pijl">›</span>
        </button>
        <p className="to-doelen-label">Of ga direct naar een doel:</p>
        <div className="to-doelen-grid">
          {DOELEN.map(d => {
            const score = scores[d.id]
            const badge = score == null
              ? <span className="to-badge grijs">Nog niet gedaan</span>
              : score >= 70 ? <span className="to-badge groen">✓ {score}%</span>
                : <span className="to-badge oranje">⚡ {score}%</span>
            return (
              <button key={d.id} className="to-doel-knop" style={{ background: d.licht, borderColor: d.kleur + '55' }} onClick={() => startDoel(d.id)}>
                <span className="to-doel-emoji">{d.emoji}</span>
                <span className="to-doel-nr" style={{ color: d.kleur }}>Doel {d.id}</span>
                <span className="to-doel-naam">{d.naam}</span>
                {badge}
                {beloond.has(d.id) && <span className="to-doel-beloond">💵 beloning gehad</span>}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── THEMA-MENU ──
  return (
    <div className="to-screen to-center">
      <button className="to-back" onClick={onBack}>← Menu</button>
      <div className="to-header">
        <span className="to-header-icon">📚</span>
        <h1>Oefenen voor de toets</h1>
        <p>Kies een thema</p>
      </div>
      <div className="to-thema-grid">
        <button className="to-thema-card" onClick={() => setScreen('doelen')}>
          <span className="to-thema-emoji">📝</span>
          <span className="to-thema-naam">Thema 8</span>
          <span className="to-thema-desc">Gezegde · Woorden · Spreekwoorden · Zinsdelen · Rijm</span>
        </button>
        {[7, 6, 5].map(t => (
          <button key={t} className="to-thema-card disabled">
            <span className="to-thema-emoji">📔</span>
            <span className="to-thema-naam">Thema {t}</span>
            <span className="to-thema-desc">🚧 Komt binnenkort</span>
          </button>
        ))}
      </div>
    </div>
  )
}
