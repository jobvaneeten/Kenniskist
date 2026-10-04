import { useRef, useState } from 'react'
import DoelKiezer from './DoelKiezer.jsx'
import { kanOpWerkblad, maakWerkbladDeel } from '../lib/werkblad.js'
import { Figuur } from '../games/VerhaaltjesSommen.jsx'
import { TOOL_BY_ID } from '../lib/tools.js'
import { Knop, Icoon } from '../ui/index.jsx'

// Werkblad om te printen: de leerkracht kiest één of meer doelen (dezelfde
// lijst als bij "Doel klaarzetten"), per doel hoeveel opgaven, en print het
// werkblad en het antwoordblad elk apart — dertig werkbladen voor de klas,
// één antwoordblad voor jezelf.
//
// Printen gaat via een verborgen iframe met alleen het papier erin: zo komt
// er niets van het (donkere) portaal mee op papier, ook niet op een iPad.
//
// Het blad is zuinig met inkt: geen gekleurde vlakken, alleen dunne lijnen en
// de vakkleur in de koppen en nummers. Het leest ook goed in zwart-wit.

const STANDAARD_AANTAL = 8

// Kleur en icoon per vak: de kop van elk onderdeel en de nummers nemen die
// kleur over. Donkere tinten, zodat ze in zwart-wit niet wegvallen.
const VAK_STIJL = {
  rekenen:  { kleur: '#1d4ed8', icoon: 'rekenen', naam: 'Rekenen' },
  taal:     { kleur: '#047857', icoon: 'boek',    naam: 'Taal' },
  spelling: { kleur: '#7e22ce', icoon: 'potlood', naam: 'Spelling' },
}
const stijlVan = (toolId) => VAK_STIJL[TOOL_BY_ID[toolId]?.vak] ?? VAK_STIJL.taal

const FONTS = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Baloo+2:wght@600;700;800&display=swap'

// Eén stylesheet voor het voorbeeld én voor het printen. Maten in mm waar het
// om schrijfruimte gaat: een kinderhand heeft zo'n 8 à 9 mm per regel nodig.
const WB_CSS = `
.wb-papier { --k:#4338ca; background:#fff; color:#111827; font-family:'Nunito',Arial,sans-serif; width:100%; max-width:210mm;
  margin:0 auto 18px; padding:14mm 14mm 12mm; box-sizing:border-box; border-radius:6px; box-shadow:0 8px 30px rgba(0,0,0,.35);
  line-height:1.4; font-size:14px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.wb-papier * { box-sizing:border-box; }
.wb-papier svg { width:1em; height:1em; flex-shrink:0; }
.wb-voorbeeld-label { max-width:210mm; margin:0 auto 6px; font:800 12px/1 'Nunito',sans-serif; letter-spacing:.08em;
  text-transform:uppercase; color:rgba(255,255,255,.6); }

/* ── Kop ── */
.wb-kop { display:grid; grid-template-columns:1fr auto; gap:6mm; align-items:end; padding-bottom:4mm; margin-bottom:5mm;
  border-bottom:2px solid #111827; }
.wb-merk { display:flex; align-items:center; gap:6px; font-size:10px; font-weight:900; letter-spacing:.16em; text-transform:uppercase; color:#4338ca; }
.wb-merk svg { width:13px; height:13px; }
.wb-titel { font-family:'Baloo 2','Nunito',sans-serif; font-size:28px; font-weight:800; line-height:1.05; margin:3px 0 2px; color:#111827; }
.wb-kop-sub { font-size:11.5px; color:#4b5563; font-weight:700; }
.wb-velden { display:grid; grid-template-columns:auto 52mm; gap:3.5mm 3mm; align-items:end; font-size:12px; font-weight:800; color:#374151; }
.wb-velden i { display:block; border-bottom:1.2px solid #6b7280; height:6mm; }
.wb-velden .wb-twee { display:grid; grid-template-columns:1fr auto 1fr; gap:3mm; align-items:end; }
.wb-score { grid-column:1 / -1; display:flex; justify-content:space-between; align-items:center; margin-top:1mm;
  border:1.5px solid #111827; border-radius:8px; padding:4px 10px; }
.wb-score b { font-size:14px; letter-spacing:.06em; }

/* ── Onderdeel ── */
.wb-sectie { margin-bottom:6mm; }
.wb-sectie-kop { display:flex; align-items:center; gap:10px; padding-bottom:5px; margin-bottom:3.5mm;
  border-bottom:1.5px solid var(--k); break-inside:avoid; break-after:avoid; page-break-after:avoid; }
.wb-sectie-icoon { width:30px; height:30px; display:grid; place-items:center; border-radius:8px; color:var(--k);
  border:1.5px solid var(--k); flex-shrink:0; }
.wb-sectie-icoon svg { width:17px; height:17px; }
.wb-sectie-naam { font-family:'Baloo 2','Nunito',sans-serif; font-size:18px; font-weight:800; color:var(--k); line-height:1.1; }
.wb-sectie-doel { font-size:11.5px; color:#4b5563; font-weight:700; line-height:1.3; }
.wb-sectie-vak { margin-left:auto; align-self:flex-start; font-size:9.5px; font-weight:900; letter-spacing:.14em; text-transform:uppercase; color:var(--k); }
.wb-instructie { display:flex; gap:7px; align-items:center; font-size:13px; font-weight:800; color:#1f2937; margin:0 0 3mm; break-inside:avoid; break-after:avoid; }
/* Kop + eerste opgave blijven samen: nooit een kop onderaan een blad. */
.wb-start { break-inside:avoid; page-break-inside:avoid; }
.wb-instructie svg { color:var(--k); width:14px; height:14px; }

/* ── Opgaven ── */
.wb-lijst { display:flex; flex-direction:column; gap:3mm; }
.wb-lijst.twee { display:grid; grid-template-columns:1fr 1fr; gap:5mm 8mm; }
.wb-opgave { display:flex; gap:9px; break-inside:avoid; page-break-inside:avoid; }
.wb-lijst > .wb-opgave + .wb-opgave { padding-top:3mm; border-top:1px dashed #d1d5db; }
.wb-lijst.twee > .wb-opgave { padding-top:0; border-top:0; }
.wb-nr { flex-shrink:0; width:24px; height:24px; border-radius:50%; border:1.6px solid var(--k); color:var(--k); display:grid; place-items:center;
  font-size:11.5px; font-weight:900; margin-top:-1px; }
.wb-body { flex:1; min-width:0; }
.wb-vraag { margin:1px 0 5px; font-size:14.5px; font-weight:600; }
.wb-tag { display:inline-block; font-size:11px; font-weight:900; color:var(--k); border:1.3px solid var(--k); border-radius:999px;
  padding:0 8px; margin:0 6px 0 0; vertical-align:1px; }
.wb-gat { display:inline-block; width:34mm; height:7mm; vertical-align:-2.5mm; margin:0 3px; border-bottom:1.5px solid #374151; }
.wb-vraag u { text-decoration:none; border-bottom:2.2px solid #111827; padding-bottom:1px; font-weight:800; }
.wb-figuur { margin:2px 0 6px; }
.wb-figuur svg { width:auto; height:auto; filter:invert(1) hue-rotate(180deg); max-width:min(100%, 230px); }

/* Meerkeuze: korte antwoorden op één regel om te omcirkelen, lange onder elkaar met a b c d. */
.wb-opties { display:flex; flex-wrap:wrap; gap:3px 16px; font-size:13.5px; }
.wb-optie { display:inline-flex; align-items:center; gap:6px; }
.wb-optie::before { content:''; width:11px; height:11px; border-radius:50%; border:1.4px solid #4b5563; flex-shrink:0; }
.wb-opties.lang { flex-direction:column; gap:1.3mm; }
.wb-opties.lang .wb-optie::before { display:none; }
/* Korte zinnen: 2×2 naast elkaar, letter bovenaan de regel. */
.wb-opties.lang.raster { display:grid; grid-template-columns:1fr 1fr; gap:2mm 8mm; }
.wb-opties.lang .wb-optie { align-items:flex-start; }
/* Afbreekstreepje: de zin loopt door op een tweede regel, precies waar de 
 staat. */
.wb-opties.lang .wb-optie, .wb-antw { white-space:pre-line; }
.wb-letter { width:19px; height:19px; border-radius:50%; border:1.4px solid #4b5563; display:grid; place-items:center;
  font-size:11px; font-weight:900; flex-shrink:0; }

/* Vraag met korte keuzes: zin en keuzes op één regel als het past. */
.wb-body.inline { display:flex; flex-wrap:wrap; align-items:baseline; column-gap:6mm; }
.wb-body.inline .wb-vraag { margin:1px 0 2px; }
.wb-body.inline .wb-opties { margin-left:auto; }

/* Schrijflijnen: meerdere velden naast elkaar */
.wb-lijnen { display:grid; grid-template-columns:repeat(auto-fit, minmax(62mm, 1fr)); gap:0 6mm; }
.wb-lijn { display:flex; align-items:flex-end; gap:8px; font-size:12px; }
.wb-lijn span { white-space:nowrap; font-weight:800; color:#374151; }
.wb-lijn i { flex:1; border-bottom:1.2px solid #9ca3af; height:8.5mm; }

/* Rekenruimte: ruitjes van 5 mm met het antwoordvak ernaast. */
.wb-reken { display:flex; gap:4mm; margin-top:2mm; align-items:stretch; }
.wb-ruitjes { flex:1; height:30mm; border:1px solid #c4c9d4;
  background-image:linear-gradient(#e2e5eb 1px,transparent 1px),linear-gradient(90deg,#e2e5eb 1px,transparent 1px); background-size:5mm 5mm; }
.wb-antwvak { width:40mm; border:1.6px solid #111827; border-radius:6px; padding:4px 8px; font-size:10.5px; font-weight:900;
  color:#374151; text-transform:uppercase; letter-spacing:.06em; }
.wb-antwvak + .wb-antwvak { width:28mm; }
.wb-lijst.twee .wb-ruitjes { height:24mm; }
.wb-lijst.twee .wb-antwvak { width:26mm; }
.wb-lijst.twee .wb-antwvak + .wb-antwvak { width:20mm; }

/* Kale sommen (tafels): drie kolommen, ruim om te schrijven. */
.wb-kaal { display:grid; grid-template-columns:repeat(3,1fr); gap:6mm 8mm; }
.wb-kaal-som { display:flex; align-items:center; gap:8px; font-size:18px; font-weight:800; break-inside:avoid; }
.wb-kaal-som .wb-nr { width:22px; height:22px; font-size:10.5px; }
.wb-kaal-som .wb-gat { width:18mm; }

/* Afsluiting */
.wb-eind { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:6mm; padding-top:4mm;
  border-top:2px solid #111827; font-size:12.5px; font-weight:800; color:#374151; break-inside:avoid; }
.wb-gezichten { display:flex; gap:12px; }
.wb-gezicht { display:flex; align-items:center; gap:5px; }
.wb-gezicht::before { content:''; width:12px; height:12px; border-radius:3px; border:1.4px solid #4b5563; }
.wb-gezicht svg { width:24px; height:24px; color:#374151; }

/* ── Antwoordblad ── */
.wb-antw-sectie { margin-bottom:5mm; break-inside:avoid; }
.wb-antw-lijst { display:grid; grid-template-columns:repeat(3,1fr); gap:1.5mm 8mm; }
.wb-antw-lijst.twee { grid-template-columns:1fr 1fr; }
.wb-antw-lijst.een { grid-template-columns:1fr; }
.wb-antw { display:flex; gap:8px; align-items:baseline; font-size:12.5px; padding:2px 0 3px; border-bottom:1px solid #e5e7eb; }
.wb-antw .wb-nr { width:20px; height:20px; font-size:10px; align-self:center; }

@media print {
  body { margin:0; background:#fff; }
  .wb-papier { box-shadow:none; border-radius:0; padding:0; max-width:none; margin:0; }
  .wb-voorbeeld-label { display:none; }
}
`

// Paginakop en -voet voor het printen. De titel komt in een CSS-string, dus
// aanhalingstekens en backslashes moeten ontsnapt worden.
const cssTekst = (t) => `"${String(t).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`
const paginaCss = (titel, metNaam) => `
@page { size:A4; margin:14mm 14mm 16mm;
  @bottom-left { content:${metNaam ? '"Naam: ______________________________"' : cssTekst('Antwoorden · ' + titel)}; font:700 9pt Nunito,Arial,sans-serif; color:#6b7280; }
  @bottom-right { content:"blad " counter(page) " van " counter(pages); font:700 9pt Nunito,Arial,sans-serif; color:#6b7280; }
}
${metNaam ? '@page :first { @bottom-left { content:' + cssTekst(titel) + '; font:700 9pt Nunito,Arial,sans-serif; color:#6b7280; } }' : ''}
`

// "……………" in een vraag wordt een schrijfregel.
const metGaten = (tekst) => tekst.split(/…{3,}/).flatMap((stuk, i) => i ? [<span key={i} className="wb-gat" />, stuk] : [stuk])

function Vraag({ o }) {
  const tag = o.tag && <span className="wb-tag">{o.tag}</span>
  if (!o.onderstreep) return <p className="wb-vraag">{tag}{metGaten(o.vraag)}</p>
  // Als los woord zoeken: "in" mag niet onderstreept worden binnen "ging".
  const esc = o.onderstreep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = new RegExp(`(^|[^\\p{L}])${esc}(?![\\p{L}])`, 'u').exec(o.vraag)
  if (!m) return <p className="wb-vraag">{tag}{o.vraag}</p>
  const i = m.index + m[1].length
  return (
    <p className="wb-vraag">
      {tag}{o.vraag.slice(0, i)}<u>{o.onderstreep}</u>{o.vraag.slice(i + o.onderstreep.length)}
    </p>
  )
}

function Opgave({ o, nr, metKop }) {
  // Een som (verhaaltjessommen): ruitjes om te rekenen met het antwoordvak
  // ernaast. Anders gewone schrijflijnen.
  const reken = o.velden?.[0] === 'Som'
  const lijnen = reken ? [] : o.velden ?? (!o.opties && !o.vraag.includes('……') ? ['Antwoord'] : [])
  const inline = o.opties && !o.lang && !o.figuur && !lijnen.length
  return (
    <div className="wb-opgave">
      <span className="wb-nr">{nr}</span>
      <div className={`wb-body${inline ? ' inline' : ''}`}>
        {metKop && o.kop && <p className="wb-instructie"><Icoon naam="potlood" />{o.kop}</p>}
        <Vraag o={o} />
        {o.figuur && <div className="wb-figuur"><Figuur figuur={o.figuur} /></div>}
        {o.opties && (
          <div className={`wb-opties${o.lang ? ' lang' : ''}${o.lang && o.opties.every(x => Math.max(...String(x).split('\n').map(r => r.length)) <= 38) ? ' raster' : ''}`}>
            {o.opties.map((x, i) => (
              <span key={i} className="wb-optie">
                {o.lang && <span className="wb-letter">{'abcd'[i]}</span>}{x}
              </span>
            ))}
          </div>
        )}
        {reken && (
          <div className="wb-reken">
            <div className="wb-ruitjes" />
            {o.velden.slice(1).map(v => <div key={v} className="wb-antwvak">{v}</div>)}
          </div>
        )}
        {lijnen.length > 0 && (
          <div className="wb-lijnen">{lijnen.map(l => <div key={l} className="wb-lijn"><span>{l}</span><i /></div>)}</div>
        )}
      </div>
    </div>
  )
}

// Drie gezichtjes om te omcirkelen, als lijntekening (inktzuinig, geen emoji).
const GEZICHTEN = [
  ['blij', 'M8 14s1.5 2 4 2 4-2 4-2'],
  ['gaat wel', 'M8 15h8'],
  ['lastig', 'M16 16s-1.5-2-4-2-4 2-4 2'],
]
function Gezicht({ mond, label }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" role="img" aria-label={label}>
      <circle cx="12" cy="12" r="9" /><path d={mond} /><path d="M9 9.5h.01M15 9.5h.01" strokeWidth="2.6" />
    </svg>
  )
}

// "Interpunctie — Aanhalingstekens" → naam + doel; bij verhaaltjessommen
// "Blok 2 — Je leert …".
function splitsTitel(t) {
  const i = t.indexOf(' — ')
  return i < 0 ? [t, ''] : [t.slice(0, i), t.slice(i + 3)]
}

// Twee naast elkaar: korte omcirkelvragen en rekensommen met één antwoordvak.
// Invulzinnen (……) en lange keuzes blijven op één kolom, anders breken ze lelijk af.
const pastInTwee = (opgaven) => opgaven.every(o => {
  if (o.figuur || o.lang) return false
  if (o.velden?.[0] === 'Som') return o.velden.length <= 2 && o.vraag.length < 220
  return !o.velden && !o.vraag.includes('……') && o.vraag.length < 90 && (o.opties ?? []).join('').length < 30
})

function SectieKop({ d, i, st }) {
  const [naam, doel] = splitsTitel(d.titel)
  return (
    <div className="wb-sectie-kop">
      <span className="wb-sectie-icoon"><Icoon naam={st.icoon} /></span>
      <div>
        <div className="wb-sectie-naam">{i + 1}. {naam}</div>
        {doel && <div className="wb-sectie-doel">{doel}</div>}
      </div>
      <span className="wb-sectie-vak">{st.naam}</span>
    </div>
  )
}

export default function Werkblad({ klas }) {
  const [titel, setTitel] = useState('Werkblad')
  // Eén onderdeel kan meerdere doelen hebben (komma's + aanhalingstekens);
  // de opgaven worden dan eerlijk over die doelen verdeeld.
  const [delen, setDelen] = useState([])          // [{ id, doelen: [{ toolId, config, titel }], titel, aantal, opgaven }]
  const [toonKiezer, setToonKiezer] = useState(true)
  const werkbladRef = useRef(null)
  const antwoordRef = useRef(null)

  const voegToe = ({ doelen, toolId, config, titel: t }) => {
    const ds = doelen ?? [{ toolId, config, titel: t }]
    // Met meer doelen ook meer opgaven, zodat elk doel er een paar krijgt.
    const aantal = Math.min(30, Math.max(STANDAARD_AANTAL, ds.length * 4))
    setDelen(prev => [...prev, {
      id: `${Date.now()}-${prev.length}`, doelen: ds, titel: t, aantal,
      opgaven: maakWerkbladDeel(ds, aantal),
    }])
    setToonKiezer(false)
  }
  const ververs = (id, aantal) => setDelen(prev => prev.map(d => d.id !== id ? d
    : { ...d, aantal: aantal ?? d.aantal, opgaven: maakWerkbladDeel(d.doelen, aantal ?? d.aantal) }))
  const verwijder = (id) => setDelen(prev => prev.filter(d => d.id !== id))
  const verschuif = (id, stap) => setDelen(prev => {
    const i = prev.findIndex(d => d.id === id), j = i + stap
    if (j < 0 || j >= prev.length) return prev
    const nieuw = [...prev]; [nieuw[i], nieuw[j]] = [nieuw[j], nieuw[i]]
    return nieuw
  })

  const print = (ref, metNaam) => {
    const frame = document.createElement('iframe')
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    document.body.appendChild(frame)
    const doc = frame.contentDocument
    const kop = metNaam ? titel : `Antwoorden — ${titel}`
    doc.open()
    doc.write(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${kop.replace(/</g, '&lt;')}</title><link rel="stylesheet" href="${FONTS}"><style>${WB_CSS}${paginaCss(titel, metNaam)}</style></head><body>${ref.current.innerHTML}</body></html>`)
    doc.close()
    // Wachten tot de lettertypes binnen zijn, anders print hij in Arial.
    const go = () => {
      frame.contentWindow.focus()
      frame.contentWindow.print()
      setTimeout(() => frame.remove(), 1000)
    }
    setTimeout(() => {
      const fonts = frame.contentDocument.fonts
      fonts ? Promise.race([fonts.ready, new Promise(r => setTimeout(r, 1500))]).then(go) : go()
    }, 300)
  }

  // Doorlopende nummering over alle onderdelen heen.
  let nr = 0
  const nummers = delen.map(d => d.opgaven.map(() => ++nr))

  return (
    <div>
      <style>{WB_CSS}</style>
      <div className="portaal-kaart">
        <h2 className="kk-mt-0">Werkblad maken</h2>
        <p className="portaal-zacht">
          Kies de doelen die op het werkblad komen. Vink je er meer aan (bijvoorbeeld komma's en
          aanhalingstekens), dan worden ze samen één onderdeel en verdeelt het werkblad de opgaven eerlijk.
          De opgaven komen uit dezelfde oefeningen als op de iPad, elke keer nieuw. Klokkijken, topografie
          en het dictee kunnen niet op papier.
        </p>
        <div className="portaal-veldrij">
          <label className="portaal-veld portaal-veld-breed" style={{ maxWidth: 420 }}>
            <span className="portaal-veld-label">Titel bovenaan het werkblad</span>
            <input value={titel} onChange={e => setTitel(e.target.value)} />
          </label>
        </div>

        {delen.length > 0 && (
          <div className="portaal-opdrachtlijst kk-mt-4">
            {delen.map((d, i) => (
              <div key={d.id} className="portaal-opdracht wb-deelrij">
                <span className="wb-deelrij-volgorde">
                  <button type="button" className="portaal-rijknop wb-pijl" aria-label="Omhoog" disabled={i === 0} onClick={() => verschuif(d.id, -1)}>▲</button>
                  <button type="button" className="portaal-rijknop wb-pijl" aria-label="Omlaag" disabled={i === delen.length - 1} onClick={() => verschuif(d.id, 1)}>▼</button>
                </span>
                <strong className="wb-deelrij-titel">{i + 1}. {d.titel}</strong>
                <label className="portaal-zacht wb-deelrij-aantal">
                  opgaven
                  <input
                    type="number" min="1" max="30" value={d.aantal}
                    onChange={e => ververs(d.id, Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                  />
                </label>
                <Knop variant="secundair" maat="sm" icoon="opnieuw" onClick={() => ververs(d.id)}>Andere opgaven</Knop>
                <Knop variant="subtiel" maat="sm" icoon="prullenbak" onClick={() => verwijder(d.id)}>Weghalen</Knop>
              </div>
            ))}
          </div>
        )}

        {!toonKiezer && (
          <div className="kk-rij kk-mt-4">
            <Knop variant="secundair" maat="sm" onClick={() => setToonKiezer(true)}>+ Doel toevoegen</Knop>
            {delen.length > 0 && <>
              <Knop variant="primair" icoon="printer" onClick={() => print(werkbladRef, true)}>Werkblad printen</Knop>
              <Knop variant="secundair" icoon="printer" onClick={() => print(antwoordRef, false)}>Antwoorden printen</Knop>
            </>}
          </div>
        )}
        {toonKiezer && (
          <DoelKiezer
            klasGroepen={klas.groepen} alleen={kanOpWerkblad} titel="Doelen op het werkblad" meerdere
            onKies={voegToe} onSluiten={() => setToonKiezer(false)}
          />
        )}
      </div>

      {delen.length > 0 && (
        <div className="kk-mt-4">
          <div className="wb-voorbeeld-label">Voorbeeld werkblad</div>
          <div ref={werkbladRef}>
            <div className="wb-papier">
              <div className="wb-kop">
                <div>
                  <div className="wb-merk"><Icoon naam="boek" />Kenniskist · werkblad</div>
                  <h1 className="wb-titel">{titel}</h1>
                  <div className="wb-kop-sub">{delen.map(d => splitsTitel(d.titel)[0]).join(' · ')}</div>
                </div>
                <div className="wb-velden">
                  <span>Naam</span><i />
                  <span>Groep</span>
                  <span className="wb-twee"><i /><span>Datum</span><i /></span>
                  <div className="wb-score"><span>Score</span><b>…… / {nr}</b></div>
                </div>
              </div>

              {delen.map((d, i) => {
                const st = stijlVan(d.doelen[0].toolId)
                const koppen = [...new Set(d.opgaven.map(o => o.kop).filter(Boolean))]
                const kaal = d.opgaven.length > 0 && d.opgaven.every(o => o.kaal)
                return (
                  <section key={d.id} className="wb-sectie" style={{ '--k': st.kleur }}>
                    <div className="wb-start">
                      <SectieKop d={d} i={i} st={st} />
                      {koppen.length === 1 && <p className="wb-instructie"><Icoon naam="potlood" />{koppen[0]}</p>}
                    </div>
                    {kaal ? (
                      <div className="wb-kaal">
                        {d.opgaven.map((o, j) => (
                          <span key={j} className="wb-kaal-som"><span className="wb-nr">{nummers[i][j]}</span>{metGaten(o.vraag)}</span>
                        ))}
                      </div>
                    ) : (
                      <div className={`wb-lijst${pastInTwee(d.opgaven) ? ' twee' : ''}`}>
                        {d.opgaven.map((o, j) => <Opgave key={j} o={o} nr={nummers[i][j]} metKop={koppen.length > 1} />)}
                      </div>
                    )}
                    {d.opgaven.length === 0 && <p className="wb-instructie">Geen opgaven gevonden voor dit doel.</p>}
                  </section>
                )
              })}

              <div className="wb-eind">
                <span>Klaar? Kijk je werk nog één keer goed na. Hoe ging het? Kruis aan.</span>
                <span className="wb-gezichten">
                  {GEZICHTEN.map(([label, mond]) => <span key={label} className="wb-gezicht"><Gezicht mond={mond} label={label} /></span>)}
                </span>
              </div>
            </div>
          </div>

          <div className="wb-voorbeeld-label">Voorbeeld antwoordblad</div>
          <div ref={antwoordRef}>
            <div className="wb-papier">
              <div className="wb-kop">
                <div>
                  <div className="wb-merk"><Icoon naam="klembord" />Kenniskist · voor de leerkracht</div>
                  <h1 className="wb-titel">Antwoorden</h1>
                  <div className="wb-kop-sub">{titel}</div>
                </div>
              </div>
              {delen.map((d, i) => {
                const st = stijlVan(d.doelen[0].toolId)
                const langste = Math.max(0, ...d.opgaven.map(o => String(o.antwoord).length))
                const kolommen = langste > 34 ? ' een' : langste > 14 ? ' twee' : ''
                return (
                  <section key={d.id} className="wb-antw-sectie" style={{ '--k': st.kleur }}>
                    <SectieKop d={d} i={i} st={st} />
                    <div className={`wb-antw-lijst${kolommen}`}>
                      {d.opgaven.map((o, j) => (
                        <div key={j} className="wb-antw"><span className="wb-nr">{nummers[i][j]}</span><span>{o.antwoord}</span></div>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
