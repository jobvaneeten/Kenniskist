import { useState, useRef, useEffect, useCallback } from 'react'
import { onderdelenVan, maakOpgaveUit, maakToets, GROEPEN, HEEFT_ROUTE, checkAntwoord, checkSom, checkTijd, GROEP_DOELEN, doelKey, LEERLIJN_LABEL, LEERLIJN_VOLGORDE } from './redactiesommen'
import SpelBeloning from './SpelBeloning'
import { useGebruikOpdracht } from './gebruikOpdracht.js'
import OpdrachtKlaarScherm from './OpdrachtKlaarScherm.jsx'
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
  if (o.antwoordType === 'tijd') return `${o.tijdH}:${String(o.tijdM).padStart(2, '0')}`
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
  if (figuur.type === 'klok') {
    const cx = 70, cy = 70, R = 60
    const hand = (deg, len) => [cx + len * Math.sin(deg * Math.PI / 180), cy - len * Math.cos(deg * Math.PI / 180)]
    const ha = ((figuur.h % 12) + figuur.m / 60) * 30, ma = figuur.m * 6
    const [hx, hy] = hand(ha, 30), [mx, my] = hand(ma, 48)
    return (
      <svg className="rs-figuur" viewBox="0 0 140 158" width="150" height="168">
        <circle cx={cx} cy={cy} r={R} fill="rgba(255,210,63,0.08)" stroke="#ffd23f" strokeWidth="3" />
        {[...Array(12)].map((_, i) => { const [x1, y1] = hand(i * 30, R - 2), [x2, y2] = hand(i * 30, R - 9); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffd23f" strokeWidth="2" /> })}
        {[[12, 0], [3, 90], [6, 180], [9, 270]].map(([n, a]) => { const [x, y] = hand(a, R - 20); return <text key={n} x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="#fffbeb" fontSize="15" fontWeight="800">{n}</text> })}
        <line x1={cx} y1={cy} x2={hx} y2={hy} stroke="#fffbeb" strokeWidth="4" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={mx} y2={my} stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill="#fffbeb" />
        {figuur.dagdeel && <text x={cx} y={146} textAnchor="middle" fill="#fffbeb" fontSize="15" fontWeight="800">{figuur.icon} {figuur.dagdeel}</text>}
      </svg>
    )
  }
  if (figuur.type === 'getallenlijn') {
    const x0 = 24, W = 300, y = 46
    const frac = (figuur.waarde - figuur.start) / (figuur.eind - figuur.start)
    const px = x0 + frac * W
    return (
      <svg className="rs-figuur" viewBox={`0 0 ${W + 48} 78`} width={W + 48} height="78">
        <line x1={x0} y1={y} x2={x0 + W} y2={y} stroke="#ffd23f" strokeWidth="3" />
        {[...Array(figuur.segs + 1)].map((_, i) => { const x = x0 + i * (W / figuur.segs); return <line key={i} x1={x} y1={y - 6} x2={x} y2={y + 6} stroke="#ffd23f" strokeWidth="2" /> })}
        <text x={x0} y={y + 22} textAnchor="middle" fill="#fffbeb" fontSize="13" fontWeight="700">{figuur.start.toLocaleString('nl-NL')}</text>
        <text x={x0 + W} y={y + 22} textAnchor="middle" fill="#fffbeb" fontSize="13" fontWeight="700">{figuur.eind.toLocaleString('nl-NL')}</text>
        <polygon points={`${px},${y - 8} ${px - 7},${y - 22} ${px + 7},${y - 22}`} fill="#f87171" />
        <text x={px} y={y - 26} textAnchor="middle" fill="#fca5a5" fontSize="15" fontWeight="900">?</text>
      </svg>
    )
  }
  if (figuur.type === 'staaf' || figuur.type === 'lijn') {
    const items = figuur.items, step = figuur.step
    const top = Math.ceil(Math.max(...items.map(i => i.waarde)) / step) * step
    const x0 = 34, y0 = 10, chartH = 120, bw = 40, gap = 14
    const chartW = items.length * (bw + gap)
    const sx = (i) => x0 + gap / 2 + i * (bw + gap) + bw / 2
    const sy = (v) => y0 + chartH - (v / top) * chartH
    const lines = []
    for (let v = 0; v <= top; v += step) lines.push(v)
    return (
      <svg className="rs-figuur" viewBox={`0 0 ${x0 + chartW + 10} ${y0 + chartH + 28}`} width={x0 + chartW + 10} height={y0 + chartH + 28}>
        {lines.map(v => (
          <g key={v}>
            <line x1={x0} y1={sy(v)} x2={x0 + chartW} y2={sy(v)} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <text x={x0 - 4} y={sy(v)} textAnchor="end" dominantBaseline="central" fill="rgba(255,255,255,0.7)" fontSize="10">{v}</text>
          </g>
        ))}
        {figuur.type === 'staaf' && items.map((it, i) => (
          <rect key={i} x={x0 + gap / 2 + i * (bw + gap)} y={sy(it.waarde)} width={bw} height={y0 + chartH - sy(it.waarde)} fill="#ffd23f" rx="2" />
        ))}
        {figuur.type === 'lijn' && <polyline points={items.map((it, i) => `${sx(i)},${sy(it.waarde)}`).join(' ')} fill="none" stroke="#ffd23f" strokeWidth="2.5" />}
        {figuur.type === 'lijn' && items.map((it, i) => <circle key={i} cx={sx(i)} cy={sy(it.waarde)} r="3.5" fill="#fde68a" />)}
        {items.map((it, i) => <text key={i} x={sx(i)} y={y0 + chartH + 14} textAnchor="middle" fill="#fffbeb" fontSize="11" fontWeight="700">{it.label}</text>)}
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
// Eenvoudige rekenmachine — alleen zichtbaar bij doelen waar de methode
// het gebruik van een rekenmachine toestaat ("…met de rekenmachine").
function RekenMachine() {
  const [expr, setExpr] = useState('')
  const [res, setRes]   = useState('')
  const druk = (t) => { setRes(''); setExpr(e => e + t) }
  const wis  = () => { setExpr(''); setRes('') }
  const backspace = () => { setRes(''); setExpr(e => e.slice(0, -1)) }
  const reken = () => {
    let s = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.')
    if (!/^[0-9+\-*/.() ]+$/.test(s)) { setRes('?'); return }
    try {
      // eslint-disable-next-line no-new-func
      const v = Function(`"use strict";return (${s})`)()
      if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) { setRes('?'); return }
      setRes(String(Math.round(v * 1e6) / 1e6).replace('.', ','))
    } catch { setRes('?') }
  }
  const TOETSEN = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', ',', '=', '+']
  return (
    <div className="rs-calc">
      <div className="rs-calc-display">
        <span className="rs-calc-expr">{expr || '0'}</span>
        {res !== '' && <span className="rs-calc-res">= {res}</span>}
      </div>
      <div className="rs-calc-grid">
        <button className="rs-calc-key rs-calc-wis" onClick={wis}>C</button>
        <button className="rs-calc-key rs-calc-fn" onClick={backspace}>⌫</button>
        <button className="rs-calc-key rs-calc-fn" onClick={() => druk('(')}>(</button>
        <button className="rs-calc-key rs-calc-fn" onClick={() => druk(')')}>)</button>
        {TOETSEN.map(t => (
          <button key={t}
            className={'rs-calc-key' + (['÷', '×', '-', '+'].includes(t) ? ' rs-calc-op' : '') + (t === '=' ? ' rs-calc-eq' : '')}
            onClick={() => t === '=' ? reken() : druk(t)}>
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}

function VraagKaart({ opgave, onNext }) {
  const [som, setSom]   = useState('')
  const [antw, setAntw] = useState('')
  const [rest, setRest] = useState('')
  const [phase, setPhase] = useState('answering')   // answering | good | bad
  const [somOk, setSomOk] = useState(null)
  const [calcOpen, setCalcOpen] = useState(false)
  const somRef = useRef(null)
  const isTijd = opgave.antwoordType === 'tijd'
  const heeftRest = opgave.rest != null && !isTijd
  const magRekenmachine = /rekenmachine/i.test(opgave.doel || '')

  useEffect(() => { setSom(''); setAntw(''); setRest(''); setPhase('answering'); setSomOk(null); setCalcOpen(false); setTimeout(() => somRef.current?.focus(), 50) }, [opgave])

  const check = () => {
    if (!antw.trim()) return
    if (heeftRest && !rest.trim()) return
    if (isTijd) { setPhase(checkTijd(antw, opgave.tijdH, opgave.tijdM) ? 'good' : 'bad'); return }
    setSomOk(checkSom(som, opgave.antwoord))
    const antwOk = checkAntwoord(antw, opgave.antwoord)
    const restOk = !heeftRest || checkAntwoord(rest, opgave.rest)
    setPhase(antwOk && restOk ? 'good' : 'bad')
  }

  const blokLabel = opgave.blok === 0 ? 'Instap' : `Blok ${opgave.blok}`
  const label = opgave.groep === 7 ? `📖 ${blokLabel} · ${opgave.doel}`
    : opgave.groep === 8 ? `🚀 Groep 8 · ${blokLabel} · ${opgave.doel}`
    : `🔁 Groep ${opgave.groep} · ${blokLabel} · ${opgave.doel}`

  return (
    <div className="rs-card">
      <div className={`rs-doel${opgave.groep !== 7 ? ' rs-doel-herhaling' : ''}`}>{label}</div>
      <div className="rs-vraag">{opgave.vraag}</div>
      {opgave.figuur && <div className="rs-figuur-wrap"><Figuur figuur={opgave.figuur} /></div>}

      {magRekenmachine && (
        <div className="rs-calc-wrap">
          <button className="rs-calc-toggle" onClick={() => setCalcOpen(o => !o)}>
            🧮 {calcOpen ? 'Verberg rekenmachine' : 'Rekenmachine mag bij deze som'}
          </button>
          {calcOpen && <RekenMachine />}
        </div>
      )}

      {phase === 'answering' && isTijd && (
        <div className="rs-velden">
          <div className="rs-veld">
            <label className="rs-veld-label">Hoe laat is het?</label>
            <div className="rs-antwoord-row">
              <input ref={somRef} className="rs-input" type="text" autoComplete="off" placeholder="bijv. 3:25"
                value={antw} onChange={e => setAntw(e.target.value)} onKeyDown={e => e.key === 'Enter' && check()} />
              <button className="rs-check-btn" onClick={check}>Controleer →</button>
            </div>
          </div>
        </div>
      )}

      {phase === 'answering' && !isTijd && (
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
function DoelBalk({ groep, doel, badge, stats }) {
  const s = stats[doelKey(groep, doel)] || { goed: 0, fout: 0 }
  const totaal = s.goed + s.fout
  const pctG = totaal ? (s.goed / totaal) * 100 : 0
  return (
    <div className="rs-ov-rij">
      <div className="rs-ov-kop">
        <span className="rs-ov-doel">{doel}</span>
        {badge && <span className="rs-doel-badge">{badge}</span>}
      </div>
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

// ── Overzicht: groep-tabs bovenaan, doelen per leerlijn of per blok ──
function Overzicht({ stats, terugLabel, onTerug, onWis }) {
  const [groepTab, setGroepTab] = useState(GROEP_DOELEN[0]?.groep ?? 5)
  const [mode, setMode] = useState('leerlijn')
  const [bevestig, setBevestig] = useState(false)

  const info = GROEP_DOELEN.find(g => g.groep === groepTab) || GROEP_DOELEN[0]

  const groepCijfers = (groep, doelen) => {
    let goed = 0, fout = 0, geoefend = 0
    for (const d of doelen) {
      const s = stats[doelKey(groep, d.doel)]
      if (s && (s.goed + s.fout) > 0) { goed += s.goed; fout += s.fout; geoefend++ }
    }
    return { goed, fout, totaal: goed + fout, geoefend }
  }

  const secties = mode === 'blok'
    ? [...new Set(info.doelen.map(d => d.blok))].sort((a, b) => a - b).map(nr => ({
        key: 'b' + nr, label: nr === 0 ? '📍 Instap' : 'Blok ' + nr,
        doelen: info.doelen.filter(d => d.blok === nr),
      }))
    : LEERLIJN_VOLGORDE.map(k => ({
        key: k, label: LEERLIJN_LABEL[k],
        doelen: info.doelen.filter(d => d.lijn === k),
      })).filter(s => s.doelen.length)

  const c = groepCijfers(groepTab, info.doelen)

  return (
    <div className="rs-screen">
      <button className="rs-back" onClick={onTerug}>← {terugLabel}</button>
      <div className="rs-header">
        <span className="rs-icon">📊</span>
        <h1 className="rs-title">Mijn overzicht</h1>
        <p className="rs-sub">Een rood balkje betekent: dit doel vind je nog lastig. Oefen die nog eens extra! 💪</p>
      </div>

      <div className="rs-tabs">
        {GROEP_DOELEN.map(({ groep }) => (
          <button key={groep} className={`rs-tab${groep === groepTab ? ' actief' : ''}`} onClick={() => setGroepTab(groep)}>
            Groep {groep}
          </button>
        ))}
      </div>

      <div className="rs-mode-toggle">
        <button className={`rs-mode-btn${mode === 'leerlijn' ? ' actief' : ''}`} onClick={() => setMode('leerlijn')}>📚 Per leerlijn</button>
        <button className={`rs-mode-btn${mode === 'blok' ? ' actief' : ''}`} onClick={() => setMode('blok')}>🧱 Per blok</button>
      </div>

      <p className="rs-ov-tip">
        {c.totaal > 0 ? `${c.totaal} opgaven gemaakt · ✅ ${c.goed} · ❌ ${c.fout} · ${c.geoefend}/${info.doelen.length} doelen geoefend` : 'Nog niet geoefend in deze groep'}
      </p>

      <div className="rs-ov-groepen">
        {secties.map(s => (
          <div key={s.key} className="rs-ov-groep">
            <div className="rs-ov-sectie-kop">{s.label}</div>
            <div className="rs-ov-lijst">
              {s.doelen.map(d => (
                <DoelBalk key={d.doel} groep={groepTab} doel={d.doel} stats={stats}
                  badge={mode === 'leerlijn' ? (d.blok === 0 ? 'instap' : 'blok ' + d.blok) : LEERLIJN_LABEL[d.lijn]} />
              ))}
            </div>
          </div>
        ))}
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
  5: { icon: '🌱', desc: 'Doelen per leerlijn' },
  6: { icon: '🌿', desc: 'Doelen per leerlijn · FS & S+' },
  7: { icon: '⭐', desc: 'Doelen per leerlijn · FS & S+' },
  8: { icon: '🚀', desc: 'Doelen per leerlijn · FS & S+' },
}

// aantal/config: alleen gezet vanuit een weektaak-opdracht (toolRender.jsx).
// config = { groep, route } — slaat groep/route/kies-schermen over en start
// direct in het oefenscherm met alle niet-herhaaldoelen van die groep/route.
export default function VerhaaltjesSommen({ groep: eigenGroep = 7, onBack, addBriefgeld, addCuruntie, aantal, config }) {
  const opdracht = useGebruikOpdracht({ toolId: 'verhaaltjessommen', aantal })
  const [klas, setKlas]     = useState(null)        // null | 5 | 6 | 7 | 8
  const [route, setRoute]   = useState(null)        // null | 'FS' | 'S+'
  const [gekozen, setGekozen] = useState(new Set()) // doel-keys (stabiel over beide weergaven)
  const [kiesMode, setKiesMode] = useState('leerlijn')  // 'leerlijn' | 'blok'
  const [kiesTab, setKiesTab]   = useState(null)        // actieve tab-key
  const [screen, setScreen]   = useState('groep')   // groep | route | kies | oefen | overzicht
  const [opgave, setOpgave]   = useState(null)
  const [sinds, setSinds]     = useState(0)
  const [verdiend, setVerdiend] = useState(0)
  const [showReward, setShowReward] = useState(false)
  const [stats, setStats]     = useState(laadStats)
  const [terugNaar, setTerugNaar] = useState('groep')
  const [toetsJaren, setToetsJaren] = useState(() => new Set([5, 6, 7, 8]))
  const [toetsLijst, setToetsLijst] = useState([])
  const [toetsIdx, setToetsIdx]     = useState(0)
  const [toetsGoed, setToetsGoed]   = useState(0)
  const [toetsSinds, setToetsSinds] = useState(0)
  const [rewardVan, setRewardVan]   = useState('oefen')   // 'oefen' | 'toets'

  const toggleKeuze = (k) => setGekozen(prev => {
    const s = new Set(prev)
    s.has(k) ? s.delete(k) : s.add(k)
    return s
  })
  const toggleBlok = (o) => setGekozen(prev => {
    const keys = o.gens.map(g => g.key)
    const allesAan = keys.every(k => prev.has(k))
    const s = new Set(prev)
    keys.forEach(k => allesAan ? s.delete(k) : s.add(k))
    return s
  })

  const nieuweOpgave = (k = klas, r = route, sel = gekozen) =>
    maakOpgaveUit([{ gens: onderdelenVan(k, r).flatMap(o => o.gens).filter(g => sel.has(g.key)) }])

  const naarKies = (k, r) => {
    // standaard alle doelen van de eigen groep aan, herhaal-doelen uit
    setGekozen(new Set(onderdelenVan(k, r).flatMap(o => o.gens.filter(g => !g.herhaling).map(g => g.key))))
    setKiesMode('leerlijn')
    setKiesTab(null)
    setScreen('kies')
  }
  const kiesGroep = (g) => { setKlas(g); if (HEEFT_ROUTE(g)) { setRoute(null); setScreen('route') } else { setRoute(null); naarKies(g, null) } }
  const kiesRoute = (r) => { setRoute(r); naarKies(klas, r) }

  // Vanuit een weektaak-opdracht: groep/route/kies-schermen overslaan.
  // config.doelen (door de leerkracht aangevinkte doelen, zie
  // VerhaaltjesSommenConfig.jsx) heeft voorrang; zonder specifieke keuze
  // vallen we terug op alle niet-herhaaldoelen van de groep/route. Expliciete
  // argumenten aan nieuweOpgave i.p.v. op klas/route/gekozen-state te
  // vertrouwen — die zijn hier bij mount nog leeg (state-updates zijn niet
  // synchroon).
  useEffect(() => {
    if (!config) return
    const g = Number(config.groep) || eigenGroep
    const r = HEEFT_ROUTE(g) ? (config.route || 'FS') : null
    const sel = config.doelen?.length
      ? new Set(config.doelen)
      : new Set(onderdelenVan(g, r).flatMap(o => o.gens.filter(gg => !gg.herhaling).map(gg => gg.key)))
    setKlas(g); setRoute(r); setGekozen(sel); setSinds(0)
    setOpgave(nieuweOpgave(g, r, sel))
    setScreen('oefen')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = () => {
    if (!gekozen.size) return
    setSinds(0); setOpgave(nieuweOpgave()); setScreen('oefen')
  }

  const openOverzicht = (vanaf) => { setTerugNaar(vanaf); setScreen('overzicht') }
  const wisOverzicht  = () => { setStats({}); bewaarStats({}) }

  const recordStat = (opg, correct) => setStats(s => {
    const key = doelKey(opg.groep, opg.doel)
    const cur = s[key] || { goed: 0, fout: 0, groep: opg.groep, doel: opg.doel }
    const next = { ...s, [key]: { ...cur, goed: cur.goed + (correct ? 1 : 0), fout: cur.fout + (correct ? 0 : 1) } }
    bewaarStats(next)
    return next
  })

  const toggleJaar = (g) => setToetsJaren(p => { const s = new Set(p); s.has(g) ? s.delete(g) : s.add(g); return s })
  const startToets = () => {
    if (!toetsJaren.size) return
    const lijst = maakToets(toetsJaren)
    if (!lijst.length) return
    setToetsLijst(lijst); setToetsIdx(0); setToetsGoed(0); setToetsSinds(0); setScreen('toets')
  }
  const toetsVolgende = (correct) => {
    const opg = toetsLijst[toetsIdx]
    if (opg) recordStat(opg, correct)
    setToetsIdx(i => i + 1)
    if (correct) {
      setToetsGoed(g => g + 1)
      const ns = toetsSinds + 1
      if (ns >= PER_BELONING) { setToetsSinds(0); setRewardVan('toets'); setShowReward(true); return }
      setToetsSinds(ns)
    }
  }

  const volgende = useCallback((correct) => {
    if (opgave) recordStat(opgave, correct)
    const zalKlaarZijn = opdracht.aantal != null && (opdracht.gedaan + 1) >= opdracht.aantal
    opdracht.registreer(correct, {
      vraag: opgave?.vraag,
      juist: opgave ? toonAntwoord(opgave) : null,
      cat: opgave ? doelKey(opgave.groep, opgave.doel) : undefined,
      catLabel: opgave?.doel,
    })
    if (zalKlaarZijn) return
    if (correct) {
      const ns = sinds + 1
      if (ns >= PER_BELONING) { setSinds(0); setRewardVan('oefen'); setShowReward(true); return }
      setSinds(ns)
    }
    setOpgave(nieuweOpgave())
  }, [sinds, klas, route, gekozen, opgave, opdracht])

  const naBeloning = () => {
    setShowReward(false)
    addBriefgeld?.(BELONING)
    setVerdiend(v => v + BELONING)
    if (rewardVan === 'oefen') setOpgave(nieuweOpgave())
  }

  if (showReward) {
    return <SpelBeloning title="5 sommen goed!" geld={BELONING} addCuruntie={addCuruntie} onDone={naBeloning} />
  }

  if (opdracht.klaar) {
    return (
      <OpdrachtKlaarScherm
        goed={opdracht.goed} aantal={opdracht.aantal}
        opslaanMislukt={opdracht.opslaanMislukt} onBack={onBack}
      />
    )
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
        <button className="rs-toets-btn" onClick={() => setScreen('toetsKies')}>📝 Toets — test of je alles kent</button>
      </div>
    )
  }

  // ── Overzicht ──
  if (screen === 'overzicht') {
    const labels = { groep: 'Terug', route: 'Terug', kies: 'Terug', oefen: 'Verder oefenen', toets: 'Terug naar toets' }
    return <Overzicht stats={stats} terugLabel={labels[terugNaar] || 'Terug'} onTerug={() => setScreen(terugNaar)} onWis={wisOverzicht} />
  }

  // ── Toets: jaren kiezen ──
  if (screen === 'toetsKies') {
    const aantal = maakToets(toetsJaren).length
    return (
      <div className="rs-screen">
        <button className="rs-back" onClick={() => setScreen('groep')}>← Terug</button>
        <div className="rs-header">
          <span className="rs-icon">📝</span>
          <h1 className="rs-title">Toets</h1>
          <p className="rs-sub">Vink de jaren aan. Je krijgt 1 som over elk doel van die jaren.</p>
        </div>
        <div className="rs-toets-jaren">
          {GROEPEN.map(g => {
            const aan = toetsJaren.has(g)
            return (
              <button key={g} className={`rs-doel-rij${aan ? ' aan' : ''}`} onClick={() => toggleJaar(g)}>
                <span className="rs-doel-check">{aan ? '☑' : '☐'}</span>
                <span className="rs-doel-tekst">{GROEP_INFO[g].icon} Groep {g}</span>
              </button>
            )
          })}
        </div>
        <button className="rs-start-btn" onClick={startToets} disabled={!toetsJaren.size}>
          {toetsJaren.size ? `Start toets! (${aantal} ${aantal === 1 ? 'som' : 'sommen'}) →` : 'Kies een jaar'}
        </button>
        <button className="rs-bekijk-btn" onClick={() => openOverzicht('toetsKies')}>📊 Bekijk mijn overzicht</button>
      </div>
    )
  }

  // ── Toets: lopend / klaar ──
  if (screen === 'toets') {
    if (toetsIdx >= toetsLijst.length) {
      const tot = toetsLijst.length, pct = tot ? Math.round((toetsGoed / tot) * 100) : 0
      return (
        <div className="rs-screen">
          <div className="rs-header">
            <span className="rs-icon">{pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪'}</span>
            <h1 className="rs-title">Toets klaar!</h1>
            <p className="rs-sub">Je had <b>{toetsGoed}</b> van de <b>{tot}</b> goed ({pct}%).</p>
          </div>
          <p className="rs-ov-tip">Alle antwoorden staan nu in je overzicht. Rode balkjes zijn doelen om nog te oefenen! 💪</p>
          <button className="rs-bekijk-btn" onClick={() => openOverzicht('toetsKies')}>📊 Bekijk mijn overzicht</button>
          <button className="rs-start-btn" onClick={() => setScreen('groep')}>Klaar →</button>
        </div>
      )
    }
    const opg = toetsLijst[toetsIdx]
    return (
      <div className="rs-screen rs-screen-oefen">
        <div className="rs-oefen-top">
          <button className="rs-back" onClick={() => setScreen('groep')}>← Stop</button>
          <span className="rs-verdiend">📝 Groep {opg.groep}</span>
        </div>
        <div className="rs-progress-wrap">
          <div className="rs-progress-bar" style={{ width: `${(toetsIdx / toetsLijst.length) * 100}%` }} />
        </div>
        <div className="rs-progress-label">Vraag {toetsIdx + 1} van {toetsLijst.length}</div>
        <VraagKaart key={toetsIdx} opgave={opg} onNext={toetsVolgende} />
      </div>
    )
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

  // ── 3. Doel-keuze: tabs bovenaan, per leerlijn of per blok ──
  if (screen === 'kies') {
    const onderdelen = onderdelenVan(klas, route, kiesMode)
    const actief = onderdelen.find(o => o.key === kiesTab) || onderdelen[0]
    const titel = `Groep ${klas}${route ? ' · ' + route : ''}`
    const wisselMode = (m) => { setKiesMode(m); setKiesTab(null) }
    const keys = actief.gens.map(g => g.key)
    const aantalAan = keys.filter(k => gekozen.has(k)).length
    const tabVink = aantalAan === keys.length ? '☑' : aantalAan > 0 ? '◪' : '☐'
    return (
      <div className="rs-screen">
        <button className="rs-back" onClick={() => setScreen(HEEFT_ROUTE(klas) ? 'route' : 'groep')}>← Terug</button>
        <div className="rs-header">
          <span className="rs-icon">{GROEP_INFO[klas].icon}</span>
          <h1 className="rs-title">{titel}</h1>
          <p className="rs-sub">Vink aan wat je wilt oefenen — achter elk doel zie je jaar en blok. Doelen van eerdere groepen staan er (uitgevinkt) tussen.</p>
        </div>

        <div className="rs-mode-toggle">
          <button className={`rs-mode-btn${kiesMode === 'leerlijn' ? ' actief' : ''}`} onClick={() => wisselMode('leerlijn')}>📚 Per leerlijn</button>
          <button className={`rs-mode-btn${kiesMode === 'blok' ? ' actief' : ''}`} onClick={() => wisselMode('blok')}>🧱 Per blok</button>
        </div>

        <div className="rs-tabs">
          {onderdelen.map(o => {
            const n = o.gens.filter(g => gekozen.has(g.key)).length
            return (
              <button key={o.key} className={`rs-tab${o.key === actief.key ? ' actief' : ''}`} onClick={() => setKiesTab(o.key)}>
                {o.label}{n > 0 && <span className="rs-tab-count">{n}</span>}
              </button>
            )
          })}
        </div>

        <div className="rs-blok-lijst">
          <div className="rs-blok-groep">
            <button className={`rs-blok-kop${aantalAan ? ' aan' : ''}`} onClick={() => toggleBlok(actief)}>
              <span className="rs-blok-check">{tabVink}</span>
              <span className="rs-blok-naam">{actief.label} — alles aan/uit</span>
            </button>
            <div className="rs-doel-lijst">
              {actief.gens.map((g, i) => {
                const aan = gekozen.has(g.key)
                const badge = `Groep ${g.groep} · ${g.blok === 0 ? 'instap' : 'blok ' + g.blok}`
                return (
                  <button key={g.key} className={`rs-doel-rij${aan ? ' aan' : ''}${g.herhaling ? ' rs-doel-herh' : ''}`} onClick={() => toggleKeuze(g.key)}>
                    <span className="rs-doel-check">{aan ? '☑' : '☐'}</span>
                    <span className="rs-doel-tekst">{g.doel || `Doel ${i + 1}`}</span>
                    <span className={`rs-doel-badge${g.herhaling ? ' herh' : ''}`}>{badge}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <button className="rs-start-btn" onClick={start} disabled={!gekozen.size}>
          {gekozen.size ? `Start! (${gekozen.size} doel${gekozen.size > 1 ? 'en' : ''}) →` : 'Kies iets om te oefenen'}
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
