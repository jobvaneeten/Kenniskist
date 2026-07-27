import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { roepWorkerAan } from '../lib/worker.js'
import { toolLabel } from '../lib/tools.js'
import DatumFilter from './DatumFilter.jsx'
import { berekenBereik } from './datumBereik.js'

const CATEGORIE_LABELS = {
  tt: 'Tegenwoordige tijd',
  vtZwak: 'Verleden tijd — zwak',
  vtSterk: 'Verleden tijd — sterk',
  vd: 'Voltooid deelwoord',
}

function scoreKlasse(pct) {
  if (pct >= 80) return 'portaal-score-goed'
  if (pct >= 50) return 'portaal-score-matig'
  return 'portaal-score-slecht'
}

function OpgavenTabel({ opgaven }) {
  return (
    <table className="portaal-tabel">
      <thead><tr><th>Opgave</th><th>Antwoord</th><th>Juist</th><th>Goed</th></tr></thead>
      <tbody>
        {opgaven.map((o, i) => (
          <tr key={i}>
            <td>{o.werkwoord ?? o.vraag ?? '—'}</td>
            <td>{o.antwoord ?? '—'}</td>
            <td>{o.juist ?? o.antwoord ?? '—'}</td>
            <td>{o.goed ? '✅' : '❌'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Details({ detailsJson }) {
  if (!detailsJson) return null
  if (Array.isArray(detailsJson.opgaven)) return <OpgavenTabel opgaven={detailsJson.opgaven} />
  return <pre>{JSON.stringify(detailsJson, null, 2)}</pre>
}

// Telt goed/fout per categorie over alle geladen resultaten (die al op het
// datumfilter zijn gefilterd), per tool_id gegroepeerd. Alleen tools die een
// `cat` per opgave loggen (werkwoordspelling: cat is een vast label uit
// CATEGORIE_LABELS; verhaaltjessommen: cat is een doelKey met de volle
// doeltekst in `catLabel`) leveren hier iets op.
function FoutenPerCategorie({ resultaten }) {
  const perTool = {}
  for (const r of resultaten) {
    const opgaven = r.details_json?.opgaven
    if (!Array.isArray(opgaven)) continue
    for (const o of opgaven) {
      if (!o.cat) continue
      const tellingen = perTool[r.tool_id] ?? (perTool[r.tool_id] = {})
      if (!tellingen[o.cat]) tellingen[o.cat] = { goed: 0, fout: 0, label: o.catLabel }
      tellingen[o.cat][o.goed ? 'goed' : 'fout']++
    }
  }
  const toolIds = Object.keys(perTool)
  if (toolIds.length === 0) return null

  return (
    <>
      {toolIds.map(toolId => {
        const tellingen = perTool[toolId]
        const categorieen = Object.keys(tellingen)
        return (
          <div className="portaal-kaart" style={{ marginBottom: 16 }} key={toolId}>
            <h2>Fouten per categorie — {toolLabel(toolId)}</h2>
            <table className="portaal-tabel">
              <thead><tr><th>Categorie</th><th>Goed</th><th>Fout</th><th>Percentage</th></tr></thead>
              <tbody>
                {categorieen.map(cat => {
                  const { goed, fout, label } = tellingen[cat]
                  const totaal = goed + fout
                  const pct = totaal ? Math.round((goed / totaal) * 100) : 0
                  return (
                    <tr key={cat}>
                      <td>{label ?? CATEGORIE_LABELS[cat] ?? cat}</td>
                      <td>{goed}</td>
                      <td>{fout}</td>
                      <td><span className={scoreKlasse(pct)}>{pct}%</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </>
  )
}

function WachtwoordResetten({ leerlingId }) {
  const [open, setOpen] = useState(false)
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState('')
  const [succes, setSucces] = useState('')
  const [bezig, setBezig] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setFout(''); setSucces(''); setBezig(true)
    try {
      await roepWorkerAan('wachtwoord-reset', { gebruikerId: leerlingId, nieuwWachtwoord: wachtwoord })
      setSucces('Wachtwoord gewijzigd')
      setWachtwoord('')
    } catch (err) {
      setFout(err.message)
    } finally {
      setBezig(false)
    }
  }

  if (!open) {
    return <button className="portaal-knop portaal-knop-subtiel" onClick={() => setOpen(true)}>Wachtwoord resetten</button>
  }

  return (
    <form className="portaal-form" onSubmit={submit} style={{ margin: 0 }}>
      <label>Nieuw wachtwoord
        <input type="password" value={wachtwoord} onChange={e => setWachtwoord(e.target.value)} required minLength={6} autoFocus autoComplete="new-password" />
      </label>
      {fout && <p className="portaal-fout">{fout}</p>}
      {succes && <p className="portaal-succes">{succes}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="portaal-knop" disabled={bezig}>{bezig ? 'Bezig…' : 'Opslaan'}</button>
        <button type="button" className="portaal-knop portaal-knop-subtiel" onClick={() => setOpen(false)}>Sluiten</button>
      </div>
    </form>
  )
}

// Embeddable: geen eigen .portaal-wrapper — wordt gerenderd binnen
// KlasScherm, met een eigen terug-knop naar de tab van waaruit je kwam.
export default function LeerlingDetail({ leerlingId, onBack }) {
  const [leerling, setLeerling] = useState(null)
  const [resultaten, setResultaten] = useState(null)
  const [open, setOpen] = useState(null)
  const [bereik, setBereik] = useState('altijd')

  useEffect(() => {
    let actief = true
    async function laad() {
      const { vanaf, tot } = berekenBereik(bereik)
      let resultatenQuery = supabase.from('resultaten').select('*').eq('leerling_id', leerlingId).order('aangemaakt_op', { ascending: false })
      if (vanaf) resultatenQuery = resultatenQuery.gte('aangemaakt_op', vanaf.toISOString())
      if (tot) resultatenQuery = resultatenQuery.lt('aangemaakt_op', tot.toISOString())

      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from('profielen').select('weergavenaam, gebruikersnaam, klassen(code)').eq('id', leerlingId).single(),
        resultatenQuery,
      ])
      if (!actief) return
      setLeerling(p)
      setResultaten(r ?? [])
    }
    laad()
    return () => { actief = false }
  }, [leerlingId, bereik])

  return (
    <>
      <button className="portaal-terug" onClick={onBack}>← Terug</button>
      {resultaten && <FoutenPerCategorie resultaten={resultaten} />}
      <div className="portaal-kaart">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0 }}>{leerling?.weergavenaam ?? '…'}</h2>
            {leerling && (
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem' }}>
                Inloggen met: klas <strong>{leerling.klassen?.code}</strong>, gebruikersnaam <strong>{leerling.gebruikersnaam}</strong>
              </p>
            )}
          </div>
          {leerling && <WachtwoordResetten leerlingId={leerlingId} />}
        </div>
        <div style={{ marginBottom: 14 }}>
          <DatumFilter waarde={bereik} onChange={setBereik} />
        </div>
        {resultaten === null && <p className="portaal-leeg">Laden…</p>}
        {resultaten?.length === 0 && (
          <p className="portaal-leeg">{bereik === 'altijd' ? 'Nog geen resultaten.' : 'Geen resultaten in deze periode.'}</p>
        )}
        {resultaten?.map(r => {
          const pct = Math.round((r.score / r.max_score) * 100)
          const isOpen = open === r.id
          return (
            <div key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', padding: '10px 0' }}>
              <button
                onClick={() => setOpen(isOpen ? null : r.id)}
                style={{ background: 'none', border: 'none', color: '#fff', font: 'inherit', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <strong>{toolLabel(r.tool_id)}</strong> — {r.score}/{r.max_score} ({pct}%) · {new Date(r.aangemaakt_op).toLocaleString('nl-NL')}
                {r.opdracht_id && <span title="Gemaakt als weektaak-opdracht"> 📋</span>}
                {' '}{isOpen ? '▲' : '▼'}
              </button>
              {isOpen && (
                <div className="portaal-uitklap">
                  <Details detailsJson={r.details_json} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
