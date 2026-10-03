import { useRef, useState } from 'react'
import DoelKiezer from './DoelKiezer.jsx'
import { kanOpWerkblad, maakWerkbladOpgaven } from '../lib/werkblad.js'
import { Figuur } from '../games/VerhaaltjesSommen.jsx'

// Werkblad om te printen: de leerkracht kiest één of meer doelen (dezelfde
// lijst als bij "Doel klaarzetten"), per doel hoeveel opgaven, en krijgt een
// A4 met naam/datum-regel en desgewenst een antwoordblad op een eigen pagina.
//
// Printen gaat via een verborgen iframe met alleen het werkblad erin: zo komt
// er niets van het (donkere) portaal mee op papier, ook niet op een iPad.

const STANDAARD_AANTAL = 8

// Eén stylesheet voor het voorbeeld én voor het printen.
const WB_CSS = `
.wb-papier { background:#fff; color:#111; font-family:'Nunito',Arial,sans-serif; width:100%; max-width:794px; margin:0 auto 18px;
  padding:40px 46px; box-sizing:border-box; border-radius:6px; box-shadow:0 8px 30px rgba(0,0,0,.35); line-height:1.45; }
.wb-titel { font-size:24px; font-weight:900; margin:0 0 6px; }
.wb-naamregel { display:flex; gap:24px; font-size:14px; margin-bottom:22px; padding-bottom:12px; border-bottom:2px solid #111; }
.wb-naamregel span { flex:1; white-space:nowrap; }
.wb-sectie { margin-bottom:22px; }
.wb-sectie h2 { font-size:17px; font-weight:900; margin:0 0 4px; }
.wb-instructie { font-size:13px; font-style:italic; color:#444; margin:0 0 10px; }
.wb-opgave { display:flex; gap:10px; margin-bottom:16px; break-inside:avoid; page-break-inside:avoid; }
.wb-nr { font-weight:900; min-width:24px; }
.wb-body { flex:1; }
.wb-vraag { margin:0 0 6px; font-size:15px; }
.wb-vraag u { text-decoration-thickness:2px; text-underline-offset:3px; }
.wb-figuur { margin:4px 0 8px; }
.wb-figuur svg { filter:invert(1) hue-rotate(180deg); max-width:min(100%, 260px); height:auto; }
.wb-opties { display:flex; flex-wrap:wrap; gap:6px 22px; font-size:14px; }
.wb-opties.lang { flex-direction:column; gap:5px; }
.wb-optie::before { content:'○'; margin-right:6px; }
.wb-lijn { display:flex; align-items:flex-end; gap:8px; font-size:13px; margin-top:8px; }
.wb-lijn span { white-space:nowrap; font-weight:700; }
.wb-lijn i { flex:1; border-bottom:1px solid #777; height:18px; }
.wb-kaal { display:grid; grid-template-columns:repeat(3,1fr); gap:14px 24px; font-size:17px; }
.wb-antwoorden ol { margin:0 0 14px; padding-left:24px; font-size:14px; }
.wb-antwoorden li { margin-bottom:3px; }
@media print {
  @page { size:A4; margin:14mm; }
  body { margin:0; background:#fff; }
  .wb-papier { box-shadow:none; border-radius:0; padding:0; max-width:none; margin:0; }
  .wb-antwoorden { break-before:page; page-break-before:always; }
}
`

function Vraag({ o }) {
  if (!o.onderstreep) return <p className="wb-vraag">{o.vraag}</p>
  // Als los woord zoeken: "in" mag niet onderstreept worden binnen "ging".
  const esc = o.onderstreep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = new RegExp(`(^|[^\\p{L}])${esc}(?![\\p{L}])`, 'u').exec(o.vraag)
  if (!m) return <p className="wb-vraag">{o.vraag}</p>
  const i = m.index + m[1].length
  return (
    <p className="wb-vraag">
      {o.vraag.slice(0, i)}<u>{o.onderstreep}</u>{o.vraag.slice(i + o.onderstreep.length)}
    </p>
  )
}

function Opgave({ o, nr, metKop }) {
  const lijnen = o.velden ?? (!o.opties && !o.vraag.includes('……') ? ['Antwoord'] : [])
  return (
    <div className="wb-opgave">
      <span className="wb-nr">{nr}.</span>
      <div className="wb-body">
        {metKop && o.kop && <p className="wb-instructie">{o.kop}</p>}
        <Vraag o={o} />
        {o.figuur && <div className="wb-figuur"><Figuur figuur={o.figuur} /></div>}
        {o.opties && (
          <div className={`wb-opties${o.lang ? ' lang' : ''}`}>
            {o.opties.map((x, i) => <span key={i} className="wb-optie">{o.lang ? `${'abcd'[i]}. ` : ''}{x}</span>)}
          </div>
        )}
        {lijnen.map(l => <div key={l} className="wb-lijn"><span>{l}:</span><i /></div>)}
      </div>
    </div>
  )
}

export default function Werkblad({ klas }) {
  const [titel, setTitel] = useState('Werkblad')
  const [delen, setDelen] = useState([])          // [{ id, toolId, config, titel, aantal, opgaven }]
  const [antwoordblad, setAntwoordblad] = useState(true)
  const [toonKiezer, setToonKiezer] = useState(true)
  const papierRef = useRef(null)

  const voegToe = ({ toolId, config, titel: t }) => {
    setDelen(prev => [...prev, {
      id: `${Date.now()}-${prev.length}`, toolId, config, titel: t, aantal: STANDAARD_AANTAL,
      opgaven: maakWerkbladOpgaven({ toolId, config }, STANDAARD_AANTAL),
    }])
    setToonKiezer(false)
  }
  const ververs = (id, aantal) => setDelen(prev => prev.map(d => d.id !== id ? d
    : { ...d, aantal: aantal ?? d.aantal, opgaven: maakWerkbladOpgaven(d, aantal ?? d.aantal) }))
  const verwijder = (id) => setDelen(prev => prev.filter(d => d.id !== id))

  const print = () => {
    const frame = document.createElement('iframe')
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    document.body.appendChild(frame)
    const doc = frame.contentDocument
    doc.open()
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${titel.replace(/</g, '&lt;')}</title><style>${WB_CSS}</style></head><body>${papierRef.current.innerHTML}</body></html>`)
    doc.close()
    // Even wachten tot het iframe de inhoud heeft opgebouwd.
    setTimeout(() => {
      frame.contentWindow.focus()
      frame.contentWindow.print()
      setTimeout(() => frame.remove(), 1000)
    }, 250)
  }

  // Doorlopende nummering over alle onderdelen heen.
  let nr = 0
  const nummers = delen.map(d => d.opgaven.map(() => ++nr))

  return (
    <div>
      <style>{WB_CSS}</style>
      <div className="portaal-kaart">
        <h2 style={{ marginTop: 0 }}>Werkblad maken</h2>
        <p className="portaal-zacht">
          Kies de doelen die op het werkblad komen. De opgaven komen uit dezelfde oefeningen als op de iPad,
          elke keer nieuw. Klokkijken, topografie en het dictee kunnen niet op papier.
        </p>
        <div className="portaal-veldrij">
          <label className="portaal-veld">
            <span className="portaal-veld-label">Titel</span>
            <input value={titel} onChange={e => setTitel(e.target.value)} />
          </label>
          <label className="portaal-vakje aan" style={{ alignSelf: 'flex-end' }}>
            <input type="checkbox" checked={antwoordblad} onChange={e => setAntwoordblad(e.target.checked)} />
            Antwoordblad op een eigen pagina
          </label>
        </div>

        {delen.length > 0 && (
          <div className="portaal-opdrachtlijst" style={{ marginTop: 14 }}>
            {delen.map((d, i) => (
              <div key={d.id} className="portaal-opdracht" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong style={{ flex: 1, minWidth: 200 }}>{i + 1}. {d.titel}</strong>
                <label className="portaal-zacht" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  opgaven
                  <input
                    type="number" min="1" max="30" value={d.aantal} style={{ width: 64 }}
                    onChange={e => ververs(d.id, Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                  />
                </label>
                <button type="button" className="portaal-knop portaal-knop-subtiel" onClick={() => ververs(d.id)}>↻ Andere opgaven</button>
                <button type="button" className="portaal-knop portaal-knop-subtiel" onClick={() => verwijder(d.id)}>Weghalen</button>
              </div>
            ))}
          </div>
        )}

        {!toonKiezer && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button type="button" className="portaal-knop portaal-knop-subtiel" onClick={() => setToonKiezer(true)}>+ Doel toevoegen</button>
            {delen.length > 0 && <button type="button" className="portaal-knop" onClick={print}>🖨️ Printen</button>}
          </div>
        )}
        {toonKiezer && (
          <DoelKiezer
            klasGroepen={klas.groepen} alleen={kanOpWerkblad} titel="Doel op het werkblad"
            onKies={voegToe} onSluiten={() => setToonKiezer(false)}
          />
        )}
      </div>

      {delen.length > 0 && (
        <div ref={papierRef} style={{ marginTop: 18 }}>
          <div className="wb-papier">
            <h1 className="wb-titel">{titel}</h1>
            <div className="wb-naamregel">
              <span>Naam: ……………………………</span><span>Groep: ……</span><span>Datum: ………………</span>
            </div>
            {delen.map((d, i) => {
              const koppen = [...new Set(d.opgaven.map(o => o.kop).filter(Boolean))]
              const kaal = d.opgaven.every(o => o.kaal)
              return (
                <section key={d.id} className="wb-sectie">
                  <h2>{i + 1}. {d.titel}</h2>
                  {koppen.length === 1 && <p className="wb-instructie">{koppen[0]}</p>}
                  {kaal
                    ? <div className="wb-kaal">{d.opgaven.map((o, j) => <span key={j}><b>{nummers[i][j]}.</b> {o.vraag}</span>)}</div>
                    : d.opgaven.map((o, j) => <Opgave key={j} o={o} nr={nummers[i][j]} metKop={koppen.length > 1} />)}
                  {d.opgaven.length === 0 && <p className="wb-instructie">Geen opgaven gevonden voor dit doel.</p>}
                </section>
              )
            })}
          </div>

          {antwoordblad && (
            <div className="wb-papier wb-antwoorden">
              <h1 className="wb-titel">Antwoorden — {titel}</h1>
              {delen.map((d, i) => (
                <section key={d.id} className="wb-sectie">
                  <h2>{i + 1}. {d.titel}</h2>
                  <ol start={nummers[i][0]}>
                    {d.opgaven.map((o, j) => <li key={j}>{o.antwoord}</li>)}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
