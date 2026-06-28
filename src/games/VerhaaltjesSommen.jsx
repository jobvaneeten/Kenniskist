import { useState, useRef, useEffect, useCallback } from 'react'
import { onderdelenVan, maakOpgaveUit, GROEPEN, HEEFT_ROUTE, checkAntwoord, checkSom, GROEP_DOELEN, doelKey } from './redactiesommen'
import SpelBeloning from './SpelBeloning'
import './verhaaltjes-sommen.css'

const PER_BELONING = 5
const BELONING     = 50                     // vast bedrag per beloning
const STATS_KEY    = 'kk_verhaal_stats_v2'  // blijvend overzicht per groep+doel

function laadStats() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY) || '{}') } catch { return {} }
}
function bewaarStats(s) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)) } catch { /* vol/uit */ }
}

const ROUTES = [
  { key: 'FS', label: 'FS', sub: 'Fundamenteel-Streef', desc: 'De basisroute' },
  { key: 'S+', label: 'S+', sub: 'Streef plus',         desc: 'Iets grotere getallen en lastiger' },
]

function toonAntwoord(o) {
  if (o.eenheid === '€') return '€ ' + o.antwoord.toFixed(2).replace('.', ',')
  const n = Number.isInteger(o.antwoord) ? o.antwoord.toLocaleString('nl-NL') : String(o.antwoord).replace('.', ',')
  return o.eenheid ? `${n} ${o.eenheid}` : n
}

// ── Figuur (oppervlakte / omtrek / inhoud) ──
function Figuur({ figuur }) {
  if (!figuur) return null
  const e = figuur.eenheid
  if (figuur.type === 'rechthoek') {
    const max = 170, sc = max / Math.max(figuur.l, figuur.b)
    const w = Math.max(figuur.l * sc, 40), h = Math.max(figuur.b * sc, 30)
    return (
      <svg className="rs-figuur" viewBox={`0 0 ${w + 70} ${h + 46}`} width={w + 70} height={h + 46}>
        <rect x="38" y="8" width={w} height={h} fill="rgba(255,210,63,0.14)" stroke="#ffd23f" strokeWidth="2.5" rx="3" />
        <text x={38 + w / 2} y="2" textAnchor="middle" dominantBaseline="hanging" fill="#fffbeb" fontSize="14" fontWeight="700">{figuur.l} {e}</text>
        <text x="30" y={8 + h / 2} textAnchor="end" dominantBaseline="middle" fill="#fffbeb" fontSize="14" fontWeight="700">{figuur.b} {e}</text>
      </svg>
    )
  }
  if (figuur.type === 'driehoek') {
    const max = 150, sc = max / Math.max(figuur.l, figuur.b)
    const w = Math.max(figuur.l * sc, 50), h = Math.max(figuur.b * sc, 40)
    const x = 40, y = 8
    return (
      <svg className="rs-figuur" viewBox={`0 0 ${w + 70} ${h + 40}`} width={w + 70} height={h + 40}>
        <polygon points={`${x},${y + h} ${x + w},${y + h} ${x + w / 2},${y}`} fill="rgba(255,210,63,0.14)" stroke="#ffd23f" strokeWidth="2.5" />
        <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke="#ffd23f" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x={x + w / 2} y={y + h + 16} textAnchor="middle" fill="#fffbeb" fontSize="13" fontWeight="700">{figuur.l} {e}</text>
        <text x={x + w / 2 + 6} y={y + h / 2} textAnchor="start" dominantBaseline="middle" fill="#fffbeb" fontSize="13" fontWeight="700">{figuur.b} {e}</text>
      </svg>
    )
  }
  if (figuur.type === 'balk') {
    const max = 130, sc = max / Math.max(figuur.l, figuur.b, figuur.h)
    const w = figuur.l * sc, ht = figuur.h * sc, d = figuur.b * sc * 0.55
    const x = 20, y = 20 + d
    return (
      <svg className="rs-figuur" viewBox={`0 0 ${w + d + 70} ${ht + d + 40}`} width={w + d + 70} height={ht + d + 40}>
        <rect x={x} y={y} width={w} height={ht} fill="rgba(255,210,63,0.14)" stroke="#ffd23f" strokeWidth="2.5" />
        <polygon points={`${x},${y} ${x + d},${y - d} ${x + w + d},${y - d} ${x + w},${y}`} fill="rgba(255,210,63,0.22)" stroke="#ffd23f" strokeWidth="2.5" />
        <polygon points={`${x + w},${y} ${x + w + d},${y - d} ${x + w + d},${y + ht - d} ${x + w},${y + ht}`} fill="rgba(255,210,63,0.08)" stroke="#ffd23f" strokeWidth="2.5" />
        <text x={x + w / 2} y={y + ht + 16} textAnchor="middle" fill="#fffbeb" fontSize="13" fontWeight="700">{figuur.l} {e}</text>
        <text x={x + w + d + 6} y={y + ht / 2} textAnchor="start" dominantBaseline="middle" fill="#fffbeb" fontSize="13" fontWeight="700">{figuur.h} {e}</text>
        <text x={x + w + d / 2 + 4} y={y - d / 2 - 2} textAnchor="middle" fill="#fffbeb" fontSize="13" fontWeight="700">{figuur.b} {e}</text>
      </svg>
    )
  }
  return null
}

// ── Vraagkaart: eerst de som, daaronder het antwoord (+ rest indien nodig) ──
function VraagKaart({ opgave, onNext }) {
  const [som, setSom]   = useState('')
  const [antw, setAntw] = useState('')
  const [rest, setRest] = useState('')
  const [phase, setPhase] = useState('answering')   // answering | good | bad
  const [somOk, setSomOk] = useState(null)
  const somRef = useRef(null)
  const heeftRest = opgave.rest != null

  useEffect(() => { setSom(''); setAntw(''); setRest(''); setPhase('answering'); setSomOk(null); setTimeout(() => somRef.current?.focus(), 50) }, [opgave])

  const check = () => {
    if (!antw.trim()) return
    if (heeftRest && !rest.trim()) return
    setSomOk(checkSom(som, opgave.antwoord))
    const antwOk = checkAntwoord(antw, opgave.antwoord)
    const restOk = !heeftRest || checkAntwoord(rest, opgave.rest)
    setPhase(antwOk && restOk ? 'good' : 'bad')
  }

  const label = opgave.groep === 7 ? `📖 Blok ${opgave.blok} · ${opgave.doel}`
    : opgave.groep === 8 ? `🚀 Groep 8 · ${opgave.doel}`
    : `🔁 Groep ${opgave.groep} · ${opgave.doel}`

  return (
    <div className="rs-card">
      <div className={`rs-doel${opgave.groep !== 7 ? ' rs-doel-herhaling' : ''}`}>{label}</div>
      <div className="rs-vraag">{opgave.vraag}</div>
      {opgave.figuur && <div className="rs-figuur-wrap"><Figuur figuur={opgave.figuur} /></div>}

      {phase === 'answering' && (
        <div className="rs-velden">
          <div className="rs-veld">
            <label className="rs-veld-label">Wat is de som? <span className="rs-veld-opt">(hoe reken je het uit)</span></label>
            <input ref={somRef} className="rs-input" type="text" autoComplete="off" placeholder="bijv. 5000 + 923"
              value={som} onChange={e => setSom(e.target.value)} onKeyDown={e => e.key === 'Enter' && check()} />
          </div>
          <div className="rs-veld">
            <label className="rs-veld-label">Antwoord</label>
            <div className="rs-antwoord-row">
              <input className="rs-input" type="text" inputMode="decimal" autoComplete="off" placeholder="Jouw antwoord…"
                value={antw} onChange={e => setAntw(e.target.value)} onKeyDown={e => e.key === 'Enter' && check()} />
              {heeftRest && (
                <div className="rs-rest-vak">
                  <span className="rs-rest-label">Rest</span>
                  <input className="rs-input rs-rest-input" type="text" inputMode="numeric" autoComplete="off" placeholder="…"
                    value={rest} onChange={e => setRest(e.target.value)} onKeyDown={e => e.key === 'Enter' && check()} />
                </div>
              )}
              <button className="rs-check-btn" onClick={check}>Controleer →</button>
            </div>
          </div>
        </div>
      )}

      {phase === 'good' && (
        <div className="rs-feedback rs-goed">
          <span>🎉 Goed!</span>
          {somOk === false && <div className="rs-som-note">✏️ Je antwoord is goed. Je som klopte niet helemaal — kijk maar: {opgave.uitleg}</div>}
          {somOk === true && <div className="rs-som-note rs-som-ok">✅ En je som klopt ook!</div>}
          <div className="rs-uitleg">💡 {opgave.uitleg}</div>
          <button className="rs-verder-btn" onClick={() => onNext(true)}>Verder →</button>
        </div>
      )}

      {phase === 'bad' && (
        <div className="rs-feedback rs-fout">
          <span>❌ Het juiste antwoord is <b>{toonAntwoord(opgave)}{heeftRest ? ` met rest ${opgave.rest}` : ''}</b>.</span>
          <div className="rs-uitleg">💡 {opgave.uitleg}</div>
          <button className="rs-verder-btn" onClick={() => onNext(false)}>Volgende →</button>
        </div>
      )}
    </div>
  )
}

// ── Doel-balkje (gebruikt in het overzicht) ──
function DoelBalk({ groep, doel, stats }) {
  const s = stats[doelKey(groep, doel)] || { goed: 0, fout: 0 }
  const totaal = s.goed + s.fout
  const pctG = totaal ? (s.goed / totaal) * 100 : 0
  return (
    <div className="rs-ov-rij">
      <div className="rs-ov-kop"><span className="rs-ov-doel">{doel}</span></div>
      {totaal === 0 ? (
        <div className="rs-ov-nieuw">Nog niet gemaakt</div>
      ) : (
        <>
          <div className="rs-ov-balk" title={`${s.goed} goed, ${s.fout} fout`}>
            {s.goed > 0 && <div className="rs-ov-goed" style={{ width: `${pctG}%` }} />}
            {s.fout > 0 && <div className="rs-ov-fout" style={{ width: `${100 - pctG}%` }} />}
          </div>
          <div className="rs-ov-cijfers">
            <span className="rs-ov-aantal">{totaal} opgave{totaal !== 1 ? 'n' : ''}</span>
            <span className="rs-ov-g">✅ {s.goed} goed</span>
            <span className="rs-ov-f">❌ {s.fout} fout</span>
          </div>
        </>
      )}
    </div>
  )
}

// ── Overzicht: per groep (klikbaar), alle doelen incl. niet-gemaakte ──
function Overzicht({ stats, terugLabel, onTerug, onWis }) {
  const [open, setOpen] = useState(() => new Set())
  const [bevestig, setBevestig] = useState(false)
  const toggle = (g) => setOpen(p => { const s = new Set(p); s.has(g) ? s.delete(g) : s.add(g); return s })

  const groepCijfers = (groep, doelen) => {
    let goed = 0, fout = 0, geoefend = 0
    for (const d of doelen) {
      const s = stats[doelKey(groep, d)]
      if (s && (s.goed + s.fout) > 0) { goed += s.goed; fout += s.fout; geoefend++ }
    }
    return { goed, fout, totaal: goed + fout, geoefend }
  }

  return (
    <div className="rs-screen">
      <button className="rs-back" onClick={onTerug}>← {terugLabel}</button>
      <div className="rs-header">
        <span className="rs-icon">📊</span>
        <h1 className="rs-title">Mijn overzicht</h1>
        <p className="rs-sub">Klik op een groep om alle doelen te zien</p>
      </div>

      <p className="rs-ov-tip">Een rood balkje betekent: dit doel vind je nog lastig. Oefen die nog eens extra! 💪</p>

      <div className="rs-ov-groepen">
        {GROEP_DOELEN.map(({ groep, doelen }) => {
          const c = groepCijfers(groep, doelen)
          const isOpen = open.has(groep)
          return (
            <div key={groep} className="rs-ov-groep">
              <button className={`rs-ov-groep-kop${isOpen ? ' open' : ''}`} onClick={() => toggle(groep)}>
                <span className="rs-ov-groep-naam">{isOpen ? '▾' : '▸'} Groep {groep}</span>
                <span className="rs-ov-groep-sub">
                  {c.totaal > 0 ? `${c.totaal} opgaven · ✅ ${c.goed} · ❌ ${c.fout}` : 'nog niet geoefend'}
                  <span className="rs-ov-groep-doelen"> · {c.geoefend}/{doelen.length} doelen</span>
                </span>
              </button>
              {isOpen && (
                <div className="rs-ov-lijst">
                  {doelen.map(d => <DoelBalk key={d} groep={groep} doel={d} stats={stats} />)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!bevestig ? (
        <button className="rs-wis-btn" onClick={() => setBevestig(true)}>🗑️ Overzicht wissen</button>
      ) : (
        <div className="rs-wis-bevestig">
          <span>Weet je het zeker? Alles wordt gewist.</span>
          <div className="rs-wis-knoppen">
            <button className="rs-wis-ja" onClick={() => { onWis(); setBevestig(false) }}>Ja, wis alles</button>
            <button className="rs-wis-nee" onClick={() => setBevestig(false)}>Nee, laat staan</button>
          </div>
        </div>
      )}
    </div>
  )
}

const GROEP_INFO = {
  5: { icon: '🌱', desc: 'Herhaling: optellen/aftrekken, tafels, delen, geld, maten' },
  6: { icon: '🌿', desc: 'Herhaling: kolomsgewijs rekenen, maten, omtrek, tijd' },
  7: { icon: '⭐', desc: 'Blok 1 t/m 10' },
  8: { icon: '🚀', desc: 'Vooruitkijken: komma-delen, driehoek, schaal, korting' },
}

export default function VerhaaltjesSommen({ groep: eigenGroep = 7, onBack, addBriefgeld, addCuruntie }) {
  const [klas, setKlas]     = useState(null)        // null | 5 | 6 | 7 | 8
  const [route, setRoute]   = useState(null)        // null | 'FS' | 'S+'
  const [gekozen, setGekozen] = useState(new Set()) // onderdeel-keys
  const [screen, setScreen]   = useState('groep')   // groep | route | kies | oefen | overzicht
  const [opgave, setOpgave]   = useState(null)
  const [sinds, setSinds]     = useState(0)
  const [verdiend, setVerdiend] = useState(0)
  const [showReward, setShowReward] = useState(false)
  const [stats, setStats]     = useState(laadStats)
  const [terugNaar, setTerugNaar] = useState('groep')

  const toggleKeuze = (k) => setGekozen(prev => {
    const s = new Set(prev)
    s.has(k) ? s.delete(k) : s.add(k)
    return s
  })

  const nieuweOpgave = (k = klas, r = route, sel = gekozen) =>
    maakOpgaveUit(onderdelenVan(k, r).filter(o => sel.has(o.key)))

  const naarKies = (k, r) => {
    // standaard alle blokken aan, herhaal-onderdelen uit
    setGekozen(new Set(onderdelenVan(k, r).filter(o => !o.herhaling).map(o => o.key)))
    setScreen('kies')
  }
  const kiesGroep = (g) => { setKlas(g); if (HEEFT_ROUTE(g)) { setRoute(null); setScreen('route') } else { setRoute(null); naarKies(g, null) } }
  const kiesRoute = (r) => { setRoute(r); naarKies(klas, r) }

  const start = () => {
    if (!gekozen.size) return
    setSinds(0); setOpgave(nieuweOpgave()); setScreen('oefen')
  }

  const openOverzicht = (vanaf) => { setTerugNaar(vanaf); setScreen('overzicht') }
  const wisOverzicht  = () => { setStats({}); bewaarStats({}) }

  const volgende = useCallback((correct) => {
    if (opgave) {
      setStats(s => {
        const key = doelKey(opgave.groep, opgave.doel)
        const cur = s[key] || { goed: 0, fout: 0, groep: opgave.groep, doel: opgave.doel }
        const next = { ...s, [key]: { ...cur, goed: cur.goed + (correct ? 1 : 0), fout: cur.fout + (correct ? 0 : 1) } }
        bewaarStats(next)
        return next
      })
    }
    if (correct) {
      const ns = sinds + 1
      if (ns >= PER_BELONING) { setSinds(0); setShowReward(true); return }
      setSinds(ns)
    }
    setOpgave(nieuweOpgave())
  }, [sinds, klas, route, gekozen, opgave])

  const naBeloning = () => {
    setShowReward(false)
    addBriefgeld?.(BELONING)
    setVerdiend(v => v + BELONING)
    setOpgave(nieuweOpgave())
  }

  if (showReward) {
    return <SpelBeloning title="5 sommen goed!" geld={BELONING} addCuruntie={addCuruntie} onDone={naBeloning} />
  }

  // ── 1. Groep-keuze ──
  if (screen === 'groep') {
    return (
      <div className="rs-screen">
        <button className="rs-back" onClick={onBack}>← Terug</button>
        <div className="rs-header">
          <span className="rs-icon">📖</span>
          <h1 className="rs-title">Verhaaltjessommen</h1>
          <p className="rs-sub">Welke groep wil je oefenen?</p>
        </div>
        <div className="rs-groep-grid">
          {GROEPEN.map(g => (
            <button key={g} className="rs-groep-card" onClick={() => kiesGroep(g)}>
              <span className="rs-groep-emoji">{GROEP_INFO[g].icon}</span>
              <span className="rs-groep-naam">Groep {g}</span>
              <span className="rs-groep-desc">{GROEP_INFO[g].desc}</span>
            </button>
          ))}
        </div>
        <button className="rs-bekijk-btn" onClick={() => openOverzicht('groep')}>📊 Bekijk mijn overzicht</button>
      </div>
    )
  }

  // ── Overzicht ──
  if (screen === 'overzicht') {
    const labels = { groep: 'Terug', route: 'Terug', kies: 'Terug', oefen: 'Verder oefenen' }
    return <Overzicht stats={stats} terugLabel={labels[terugNaar] || 'Terug'} onTerug={() => setScreen(terugNaar)} onWis={wisOverzicht} />
  }

  // ── 2. Route-keuze (FS/S+), alleen groep 6/7/8 ──
  if (screen === 'route') {
    return (
      <div className="rs-screen">
        <button className="rs-back" onClick={() => setScreen('groep')}>← Terug</button>
        <div className="rs-header">
          <span className="rs-icon">{GROEP_INFO[klas].icon}</span>
          <h1 className="rs-title">Groep {klas}</h1>
          <p className="rs-sub">Kies je niveau</p>
        </div>
        <div className="rs-route-grid">
          {ROUTES.map(r => (
            <button key={r.key} className="rs-route-card" onClick={() => kiesRoute(r.key)}>
              <span className="rs-route-badge">{r.label}</span>
              <span className="rs-route-naam">{r.sub}</span>
              <span className="rs-route-desc">{r.desc}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── 3. Onderdeel-keuze (blokken voor groep 7, doelen voor de rest) ──
  if (screen === 'kies') {
    const onderdelen = onderdelenVan(klas, route)
    const titel = `Groep ${klas}${route ? ' · ' + route : ''}`
    return (
      <div className="rs-screen">
        <button className="rs-back" onClick={() => setScreen(HEEFT_ROUTE(klas) ? 'route' : 'groep')}>← Terug</button>
        <div className="rs-header">
          <span className="rs-icon">{GROEP_INFO[klas].icon}</span>
          <h1 className="rs-title">{titel}</h1>
          <p className="rs-sub">Vink aan wat je wilt oefenen</p>
        </div>

        <div className="rs-blok-lijst">
          {onderdelen.map(o => {
            const aan = gekozen.has(o.key)
            return (
              <button key={o.key} className={`rs-blok-rij${o.herhaling ? ' rs-blok-herh' : ''}${aan ? ' aan' : ''}`} onClick={() => toggleKeuze(o.key)}>
                <span className="rs-blok-check">{aan ? '☑' : '☐'}</span>
                <span className="rs-blok-tekst">
                  <span className="rs-blok-naam">{o.label}</span>
                  {o.doelen.length > 0 && <span className="rs-blok-doelen">{o.doelen.join(' · ')}</span>}
                </span>
              </button>
            )
          })}
        </div>

        <button className="rs-start-btn" onClick={start} disabled={!gekozen.size}>
          {gekozen.size ? `Start! (${gekozen.size} onderdeel${gekozen.size > 1 ? 'en' : ''}) →` : 'Kies iets om te oefenen'}
        </button>
        <button className="rs-bekijk-btn" onClick={() => openOverzicht('kies')}>📊 Bekijk mijn overzicht</button>
      </div>
    )
  }

  // ── 4. Oefenen ──
  return (
    <div className="rs-screen rs-screen-oefen">
      <div className="rs-oefen-top">
        <button className="rs-back" onClick={() => setScreen('kies')}>← Stop</button>
        <button className="rs-ov-btn" onClick={() => openOverzicht('oefen')}>📊 Overzicht</button>
        <span className="rs-verdiend">💵 € {verdiend}</span>
      </div>
      <div className="rs-progress-wrap">
        <div className="rs-progress-bar" style={{ width: `${(sinds / PER_BELONING) * 100}%` }} />
      </div>
      <div className="rs-progress-label">{PER_BELONING - sinds} goede tot een spelletje 🎮</div>
      {opgave && <VraagKaart opgave={opgave} onNext={volgende} />}
    </div>
  )
}
