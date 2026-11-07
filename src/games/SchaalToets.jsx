import { useRef, useState } from 'react'
import { checkAntwoord } from './redactiesommen'
import { Knop, Icoon } from '../ui/index.jsx'
import './schaal-toets.css'

// Schaalopgaven zoals in de Pluspunt-toets (groep 7 blok 3, vraag 4):
//   schaal   (4a) meet de tekening, vul de tabel, het schaallijntje en 1 : … in
//   tekenen  (4b) teken een lijn op schaal en schrijf op hoe lang hij is
//   echt     (4c) meet de tekening, vul de tabel in, in het echt in cm en in m
// Meten gaat met een liniaal op het scherm die je kunt verschuiven en draaien.
// In de tekening is 1 cm altijd CM schermpixels (de liniaal is daarop gemaakt).

const CM = 30
const getal = (n) => (Math.round(n * 1000) / 1000).toLocaleString('nl-NL')

// ── tekeningen: lengte L in px langs de maatpijl ─────────────────────────────
const ART = {
  schutting: { o: 'h', h: () => 32, f: (L) => { const H = 32; let p = ''; for (let x = 0; x < L - 4; x += 9) p += `<path d="M${x} 0 V${-H + 6} L${x + 3.5} ${-H} L${x + 7} ${-H + 6} V0Z" fill="#b45309"/>`; return `<rect x="0" y="${-H + 10}" width="${L}" height="5" fill="#78350f"/><rect x="0" y="-12" width="${L}" height="5" fill="#78350f"/>${p}` } },
  bus: { o: 'h', h: (L) => .3 * L, f: (L) => { const H = .3 * L; let w = ''; for (let i = 0; i < 6; i++) w += `<rect x="${(.05 + i * .13) * L}" y="${-.9 * H}" width="${.1 * L}" height="${.3 * H}" rx="2" fill="#bfdbfe"/>`; return `<rect x="0" y="${-H}" width="${L}" height="${.82 * H}" rx="${.04 * L}" fill="#facc15"/><rect x="0" y="${-.42 * H}" width="${L}" height="${.07 * H}" fill="#ea580c"/>${w}<circle cx="${.2 * L}" cy="${-.16 * H}" r="${.065 * L}" fill="#1f2937"/><circle cx="${.8 * L}" cy="${-.16 * H}" r="${.065 * L}" fill="#1f2937"/>` } },
  winkel: { o: 'h', h: (L) => Math.min(.32 * L, 110), f: (L) => { const H = Math.min(.32 * L, 110); return `<rect x="0" y="${-H}" width="${L}" height="${H}" fill="#d6a184"/><rect x="0" y="${-H}" width="${L}" height="6" fill="#9ca3af"/><rect x="${.05 * L}" y="${-.75 * H}" width="${.28 * L}" height="${.45 * H}" fill="#7dd3fc" stroke="#e0f2fe" stroke-width="2"/><rect x="${.38 * L}" y="${-.75 * H}" width="${.28 * L}" height="${.45 * H}" fill="#7dd3fc" stroke="#e0f2fe" stroke-width="2"/><rect x="${.74 * L}" y="${-.8 * H}" width="${.2 * L}" height="${.8 * H}" fill="#7c2d12"/><rect x="${.77 * L}" y="${-.74 * H}" width="${.14 * L}" height="${.6 * H}" fill="#7dd3fc"/>` } },
  lokaal: { o: 'h', h: (L) => .55 * L, f: (L) => { const H = .55 * L; let t = ''; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) t += `<rect x="${(.22 + .22 * i) * L}" y="${-H + (.22 + .38 * j) * H}" width="${.13 * L}" height="${.14 * H}" rx="2" fill="#a16207"/>`; return `<rect x="0" y="${-H}" width="${L}" height="${H}" fill="#9ca3af"/><rect x="3" y="${-H + 3}" width="${L - 6}" height="${H - 6}" fill="#fef3c7"/>${t}<rect x="${.05 * L}" y="${-H + 6}" width="${.06 * L}" height="${.25 * H}" fill="#14532d"/>` } },
  zwembad: { o: 'h', h: (L) => .4 * L, f: (L) => { const H = .4 * L; let ln = ''; for (let i = 1; i < 5; i++) ln += `<line x1="6" y1="${-H + 6 + (H - 12) * i / 5}" x2="${L - 6}" y2="${-H + 6 + (H - 12) * i / 5}" stroke="#fff" stroke-width="1.5" stroke-dasharray="8 5"/>`; return `<rect x="0" y="${-H}" width="${L}" height="${H}" fill="#e0f2fe"/><rect x="5" y="${-H + 5}" width="${L - 10}" height="${H - 10}" fill="#0ea5e9"/>${ln}` } },
  flat: { o: 'v', w: () => 64, f: (L) => { const w = 64, n = Math.max(2, Math.round(L / 45)); let v = ''; for (let i = 0; i < n; i++) { const y = -L + i * L / n; v += `<rect x="6" y="${y + 6}" width="30" height="${L / n - 16}" fill="#7dd3fc"/><rect x="42" y="${y + 6}" width="14" height="${L / n - 10}" fill="#92400e"/><rect x="0" y="${y + L / n - 6}" width="${w}" height="4" fill="#a8a29e"/>` } return `<rect x="0" y="${-L}" width="${w}" height="${L}" fill="#e7c9a9"/>${v}` } },
  boom: { o: 'v', w: (L) => .62 * L, f: (L) => { const w = .62 * L; return `<rect x="${.44 * w}" y="${-.45 * L}" width="${.12 * w}" height="${.45 * L}" fill="#92400e"/><circle cx="${.3 * w}" cy="${-.55 * L}" r="${.18 * L}" fill="#15803d"/><circle cx="${.7 * w}" cy="${-.55 * L}" r="${.18 * L}" fill="#15803d"/><circle cx="${.5 * w}" cy="${-.69 * L}" r="${.31 * L}" fill="#22c55e"/>` } },
  lijn: { o: 'h', h: () => 10, geenPijl: true, f: (L) => `<line x1="0" y1="-5" x2="${L}" y2="-5" stroke="#7dd3fc" stroke-width="4"/>` },
  vlag: { o: 'v', w: (L) => .42 * L, f: (L) => { const w = .42 * L, p = 4; return `<rect x="0" y="${-L}" width="${p}" height="${L}" fill="#e2e8f0"/><rect x="${p}" y="${-.98 * L}" width="${w - p}" height="${.07 * L}" fill="#ef4444"/><rect x="${p}" y="${-.91 * L}" width="${w - p}" height="${.07 * L}" fill="#fff"/><rect x="${p}" y="${-.84 * L}" width="${w - p}" height="${.07 * L}" fill="#3b82f6"/>` } },
}

function Liniaal() {
  const w = 15.6 * CM, streepjes = []
  for (let mm = 0; mm <= 150; mm++) {
    const x = .3 * CM + mm * CM / 10, h = mm % 10 === 0 ? 16 : mm % 5 === 0 ? 11 : 6
    streepjes.push(<line key={mm} x1={x} y1={0} x2={x} y2={h} className="st-tick" />)
    if (mm % 10 === 0) streepjes.push(<text key={'t' + mm} x={x} y={29} className="st-rnum">{mm / 10}</text>)
  }
  return (<><rect x={0} y={0} width={w} height={44} rx={6} className="st-liniaal" />{streepjes}<text x={w - 8} y={40} className="st-runit" textAnchor="end">cm</text></>)
}

// Tekening + liniaal. modus 'meten' (voorwerp met maatpijl) of 'tekenen' (lijn slepen).
function Tekenblad({ st, modus, lijn, setLijn, klaar }) {
  const svgRef = useRef(null)
  const art = ART[st.art] || ART.schutting
  const V = modus === 'meten' && art.o === 'v'
  const Lp = st.t * CM
  const W = 16.6 * CM
  // hoogte: voorwerp + maatpijl + ruimte voor de liniaal eronder
  const ybH = modus === 'meten' && !V ? Math.round((art.h?.(Lp) ?? 40) + 16) : 0
  const H = V ? Lp + 40 + 60 : modus === 'tekenen' ? 175 : ybH + 30 + 62
  const [rul, setRul] = useState(() => ({ x: 14, y: H - 52, rot: false }))
  const sleep = useRef(null)
  const punt = (e) => { const svg = svgRef.current, p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()) }

  const rulDown = (e) => { e.preventDefault(); e.stopPropagation(); const p = punt(e); sleep.current = { soort: 'rul', dx: p.x - rul.x, dy: p.y - rul.y }; e.currentTarget.setPointerCapture(e.pointerId) }
  const x0 = 24, yLijn = 86
  const zetLijn = (p) => { if (klaar) return; setLijn(Math.max(0, Math.min(15, Math.round((p.x - x0) / CM * 10) / 10))) }
  const beweeg = (e) => {
    const s = sleep.current; if (!s) return
    const p = punt(e)
    if (s.soort === 'rul') setRul(r => ({ ...r, x: Math.max(-14 * CM, Math.min(W - CM, p.x - s.dx)), y: Math.max(r.rot ? 2 * CM : -10, Math.min(H + (r.rot ? 14 * CM : 0), p.y - s.dy)) }))
    else zetLijn(p)
  }
  const los = () => { sleep.current = null }
  const draai = () => setRul(r => r.rot ? { x: 14, y: H - 52, rot: false } : { x: W - 70, y: H - 6, rot: true })

  // voorwerp: horizontaal met de maatpijl eronder, staand met de pijl links
  let tekening
  if (modus === 'meten') {
    if (V) {
      const xa = 70, yb = Lp + 30
      tekening = (<g>
        <g transform={`translate(${xa + 16},${yb})`} dangerouslySetInnerHTML={{ __html: art.f(Lp) }} />
        <line x1={xa} y1={yb - Lp} x2={xa} y2={yb} className="st-pijl" markerStart="url(#st-pk)" markerEnd="url(#st-pk)" />
      </g>)
    } else {
      const yb = ybH
      tekening = (<g>
        <g transform={`translate(${x0},${yb})`} dangerouslySetInnerHTML={{ __html: art.f(Lp) }} />
        {!art.geenPijl && <line x1={x0} y1={yb + 18} x2={x0 + Lp} y2={yb + 18} className="st-pijl" markerStart="url(#st-pk)" markerEnd="url(#st-pk)" />}
      </g>)
    }
  } else {
    const X = x0 + lijn * CM
    tekening = (<g>
      <rect x={4} y={40} width={W - 8} height={90} rx={10} className="st-tekenvlak"
        onPointerDown={(e) => { if (klaar) return; sleep.current = { soort: 'lijn' }; e.currentTarget.setPointerCapture(e.pointerId); zetLijn(punt(e)) }} />
      <circle cx={x0} cy={yLijn} r={5} className="st-begin" />
      {lijn > 0 && <line x1={x0} y1={yLijn} x2={X} y2={yLijn} className="st-getekend" />}
      {!klaar && <circle cx={Math.max(X, x0)} cy={yLijn} r={13} className="st-greep"
        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); sleep.current = { soort: 'lijn' }; e.currentTarget.setPointerCapture(e.pointerId) }} />}
    </g>)
  }

  return (
    <div className="st-blad">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="st-svg" onPointerMove={beweeg} onPointerUp={los} onPointerCancel={los}>
        <defs><marker id="st-pk" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10" fill="none" stroke="#e5e7eb" strokeWidth="1.6" /></marker></defs>
        {tekening}
        <g transform={`translate(${rul.x},${rul.y})${rul.rot ? ' rotate(-90)' : ''}`} className="st-liniaal-g" onPointerDown={rulDown}><Liniaal /></g>
      </svg>
      <div className="st-blad-acties">
        <span className="st-tip"><Icoon naam="liniaal" />Sleep de liniaal en zet de 0 precies bij het begin{modus === 'tekenen' ? '. Sleep het gele bolletje om de lijn te tekenen.' : (art.geenPijl ? ' van de lijn.' : ' van de pijl.')}</span>
        {modus === 'meten' && <button type="button" className="st-draai" onClick={draai}>Draai de liniaal</button>}
      </div>
    </div>
  )
}

function Vak({ id, w, set, status, breed, label }) {
  return <input className={`st-vak${breed ? ' st-vak-breed' : ''}${status ? ' st-' + status : ''}`} inputMode="decimal" autoComplete="off" aria-label={label}
    value={w[id] ?? ''} onChange={(e) => set(id, e.target.value.replace(/[=＝]/g, ''))} disabled={!!status} />
}


// Kaartje bij "Hoe lang in het echt?" (F-toets groep 8): alleen ter illustratie,
// de lengte op de kaart staat erbij.
function Kaartje({ kleur, lijntje }) {
  const KL = { gele: '#facc15', blauwe: '#38bdf8', oranje: '#fb923c', rode: '#f87171' }
  return (
    <svg viewBox="0 0 300 200" className="st-kaart" aria-hidden="true">
      <rect width="300" height="200" rx="10" fill="#86efac" />
      <path d="M0 40 Q80 10 150 30 T300 25 V0 H0Z" fill="#bae6fd" />
      <ellipse cx="60" cy="150" rx="38" ry="24" fill="#7dd3fc" />
      <rect x="215" y="0" width="85" height="200" fill="#4d7c0f" opacity=".45" />
      <polyline points="30,70 80,95 70,130 120,150 160,110 210,140 250,90" fill="none" stroke={KL[kleur] || '#facc15'} strokeWidth="5" strokeLinejoin="round" />
      <g transform="translate(222,170)"><line x1="0" y1="0" x2={CM} y2="0" stroke="#111" strokeWidth="2" /><line x1="0" y1="-5" x2="0" y2="5" stroke="#111" strokeWidth="2" /><line x1={CM} y1="-5" x2={CM} y2="5" stroke="#111" strokeWidth="2" /><text x={CM / 2} y="20" textAnchor="middle" className="st-kaart-tekst">{lijntje}</text></g>
    </svg>
  )
}

// juiste verhoudingstabel: de kolommen (1, N) en (t, echt), in elke volgorde
function tabelGoed(w, st) {
  const k1 = [w.a1, w.b1], k2 = [w.a2, w.b2]
  const is = (k, a, b) => checkAntwoord(k[0], a) && checkAntwoord(k[1], b)
  return (is(k1, 1, st.N) && is(k2, st.t, st.echt)) || (is(k2, 1, st.N) && is(k1, st.t, st.echt))
}

// Wat er bij elke soort in beeld staat en welke vakjes er zijn.
function opzet(st) {
  const Wat = st.wat ? st.wat[0].toUpperCase() + st.wat.slice(1) : ''
  const lengteZin = ['De lijn is ', { vak: 'lengte' }, ' cm lang.']
  switch (st.soort) {
    case 'schaal': return {   // groep 7, toets 4a
      opdracht: 'Bereken de schaal. Meet met de liniaal.', gegeven: <>{Wat} is <b>{getal(st.L)} m</b> {st.maat}.</>,
      blad: 'meten', lijntje: { vak: 'lijntje', eenheid: 'cm' }, schaal: { vak: 'schaal' }, maatZin: true, tabel: true,
      antw: { maat: st.t, lijntje: st.N, schaal: st.N },
      uitleg: `De pijl is ${getal(st.t)} cm. In de tabel: 1 cm is ${getal(st.N)} cm en ${getal(st.t)} cm is ${getal(st.echt)} cm. ${getal(st.echt)} : ${getal(st.t)} = ${getal(st.N)}, dus het schaallijntje is ${getal(st.N)} cm en de schaal is 1 : ${getal(st.N)}.` }
    case 'echt': return {     // groep 7, toets 4c
      opdracht: 'Hoe groot in het echt? Meet met de liniaal.', gegeven: <>Meet hoe {st.maat} {st.wat} in de tekening is.</>,
      blad: 'meten', lijntje: { tekst: `${getal(st.N)} cm` }, schaal: { tekst: getal(st.N) }, maatZin: true, tabel: true,
      zinnen: [[`${Wat} is in het echt `, { vak: 'cm', breed: true }, ' cm. Dat is ', { vak: 'm' }, ' m.']],
      antw: { maat: st.t, cm: st.echt, m: st.L },
      uitleg: `De pijl is ${getal(st.t)} cm. In de tabel: 1 cm is ${getal(st.N)} cm en ${getal(st.t)} cm is ${getal(st.echt)} cm. ${getal(st.t)} × ${getal(st.N)} = ${getal(st.echt)} cm = ${getal(st.L)} m.` }
    case 'tekenen': return {  // groep 7 toets 4b, groep 8 F-toets 3 (4b) en 7 (1a)
      opdracht: st.opdracht ?? 'Teken op schaal. Gebruik de liniaal.', gegeven: <>Een lijn die in het echt <b>{st.echtTekst ?? `${st.Lf} m`}</b> is.</>,
      blad: 'tekenen', lijntje: { tekst: st.lijntje ?? `${getal(st.N)} cm` }, schaal: st.lijntje ? null : { tekst: getal(st.N) },
      zinnen: [lengteZin], antw: { lengte: st.t }, tekenLijn: st.t,
      uitleg: st.uitleg ?? `${st.Lf} m = ${getal(st.echt)} cm. 1 cm in de tekening is ${getal(st.N)} cm in het echt. ${getal(st.echt)} : ${getal(st.N)} = ${getal(st.t)}, dus de lijn is ${getal(st.t)} cm lang.` }
    case 'kaart': return {    // groep 8 F-toets 3 (4a)
      opdracht: 'Hoe lang in het echt?', kaart: true, gegeven: <>De {st.kleur} route is op de kaart <b>{getal(st.t)} cm</b>.</>,
      lijntje: { tekst: st.lijntje }, zinnen: [['In het echt is dit ', { vak: 'km' }, ' km.']], antw: { km: st.km }, uitleg: st.uitleg }
    case 'lijn-meten': return {   // groep 8 F-toets 7 (1a, tweede deel)
      opdracht: 'Meet de lijn en reken uit. Gebruik een liniaal.', blad: 'meten', lijntje: { tekst: st.lijntje },
      zinnen: [lengteZin, ['De lijn is in het echt ', { vak: 'km' }, ' km.']], antw: { lengte: st.t, km: st.km }, uitleg: st.uitleg }
    case 'lijn-lijntje': return {  // groep 8 F-toets 7 (1b)
      opdracht: 'Bereken de schaal. Meet met een liniaal.', gegeven: <>De lijn is in het echt <b>{st.echtTekst}</b>.</>,
      blad: 'meten', lijntje: { vak: 'lijntje', eenheid: 'm' }, zinnen: [lengteZin], antw: { lengte: st.t, lijntje: st.per }, uitleg: st.uitleg }
    default: return {         // groep 8 S-toets: één getal, met een vak om in te rekenen
      opdracht: st.opdracht, gegeven: <>{st.gegeven.map((r, i) => <span key={i} className="st-regel">{r}</span>)}</>, gegevenVak: true,
      zinnen: [[st.zin[0], { vak: 'antw', breed: true }, st.zin[1]]], klad: true, antw: { antw: st.antw }, uitleg: st.uitleg }
  }
}

export default function SchaalToets({ opgave, onNext }) {
  const st = opgave.schaalToets
  const o = opzet(st)
  const [w, setW] = useState({})
  const [lijn, setLijn] = useState(0)
  const [uitslag, setUitslag] = useState(null)   // { velden: {id: 'goed'|'fout'}, goed }
  const [melding, setMelding] = useState('')
  // nieuwe opgave: alles leeg (state bijwerken tijdens het renderen mag hier)
  const [voor, setVoor] = useState(opgave)
  const [nr, setNr] = useState(0)
  if (voor !== opgave) { setVoor(opgave); setNr(n => n + 1); setW({}); setLijn(0); setUitslag(null); setMelding('') }
  const set = (id, v) => setW(x => ({ ...x, [id]: v }))
  const s = (id) => uitslag?.velden[id]
  const vak = (id, extra = {}) => <Vak id={id} w={w} set={set} status={s(id)} breed={extra.breed} label={extra.label ?? id} />

  const velden = [...Object.keys(o.antw), ...(o.tabel ? ['a1', 'b1', 'a2', 'b2'] : [])]
  const check = () => {
    const leeg = velden.some(id => !String(w[id] ?? '').trim())
    if (leeg || (o.tekenLijn && !lijn)) { setMelding(o.tekenLijn && !lijn ? 'Teken eerst de lijn.' : 'Vul eerst alle vakjes in.'); return }
    setMelding('')
    const v = {}
    for (const [id, a] of Object.entries(o.antw)) v[id] = checkAntwoord(w[id], a) ? 'goed' : 'fout'
    if (o.tabel) { const tg = tabelGoed(w, st) ? 'goed' : 'fout'; for (const id of ['a1', 'b1', 'a2', 'b2']) v[id] = tg }
    if (o.tekenLijn) v.lijn = Math.abs(lijn - o.tekenLijn) < 0.15 ? 'goed' : 'fout'
    setUitslag({ velden: v, goed: Object.values(v).every(x => x === 'goed') })
  }
  const ingevuld = () => [
    o.tekenLijn ? `lijn ${getal(lijn)} cm getekend` : null,
    ...velden.map(id => `${id} ${w[id]}`),
  ].filter(Boolean).join(', ')

  const zin = (delen, i) => (
    <div key={i} className="st-zin">{delen.map((d, j) => typeof d === 'string' ? <span key={j}>{d}</span> : <span key={j}>{vak(d.vak, { breed: d.breed })}</span>)}
      {i === 0 && s('lijn') && <span className={`st-lijn-oordeel st-${s('lijn')}`}>{s('lijn') === 'goed' ? 'Je lijn is goed getekend.' : `Je lijn is ${getal(lijn)} cm.`}</span>}
    </div>
  )

  return (
    <div className="st">
      <p className="st-opdracht">{o.opdracht}</p>
      {o.gegeven && <p className={o.gegevenVak ? 'st-gegeven-vak' : 'st-gegeven'}>{o.gegeven}</p>}

      {(o.blad || o.kaart || o.lijntje || o.schaal) && (
        <div className="st-rij">
          {o.blad && <Tekenblad key={nr} st={st} modus={o.blad} lijn={lijn} setLijn={setLijn} klaar={!!uitslag} />}
          {o.kaart && <Kaartje kleur={st.kleur} lijntje={st.lijntje} />}
          {!o.kaart && (o.lijntje || o.schaal) && (
            <div className="st-schaal">
              {o.lijntje && <div className="st-lijntje"><span className="st-streep" style={{ width: CM }} />
                {o.lijntje.vak ? <>{vak('lijntje', { label: 'schaallijntje' })} {o.lijntje.eenheid}</> : <span>{o.lijntje.tekst}</span>}</div>}
              {o.schaal && <div className="st-schaalgetal">1 : {o.schaal.vak ? vak('schaal', { label: 'schaal' }) : o.schaal.tekst}</div>}
            </div>
          )}
        </div>
      )}

      {o.maatZin && <div className="st-zin">De pijl in de tekening is {vak('maat', { label: 'gemeten lengte in cm' })} cm.</div>}
      {o.tabel && (
        <table className="rs-vtabel st-tabel"><tbody>
          <tr><th>in de tekening (cm)</th><td>{vak('a1')}</td><td>{vak('a2')}</td></tr>
          <tr><th>in het echt (cm)</th><td>{vak('b1')}</td><td>{vak('b2')}</td></tr>
        </tbody></table>
      )}
      {(o.zinnen || []).map(zin)}
      {o.klad && <textarea className="st-klad" placeholder="Hier mag je rekenen" disabled={!!uitslag} />}

      {!uitslag && (
        <div className="st-acties">
          {melding && <span className="st-melding">{melding}</span>}
          <Knop variant="primair" icoonRechts="verder" onClick={check}>Controleer</Knop>
        </div>
      )}
      {uitslag && (
        <div className={`rs-feedback ${uitslag.goed ? 'rs-goed' : 'rs-fout'}`}>
          <span className="rs-feedback-kop"><Icoon naam={uitslag.goed ? 'goed' : 'fout'} />{uitslag.goed ? 'Goed!' : 'Nog niet helemaal goed. De rode vakjes kloppen niet.'}</span>
          <div className="rs-uitleg"><Icoon naam="lamp" />{o.uitleg}</div>
          <Knop enter variant="primair" icoonRechts="verder" className="rs-verder-btn" onClick={() => onNext(uitslag.goed, ingevuld())}>{uitslag.goed ? 'Verder' : 'Volgende'}</Knop>
        </div>
      )}
    </div>
  )
}
