import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { roepWorkerAan } from '../lib/worker.js'
import { toolLabel } from '../lib/tools.js'
import DatumFilter from './DatumFilter.jsx'
import HerkomstFilter from './HerkomstFilter.jsx'
import FoutenLijst from './FoutenLijst.jsx'
import { berekenBereik } from './datumBereik.js'
import { groepeerSessies, filterHerkomst, scoreKlasse, kortMoment } from './resultaatHelpers.js'

const CATEGORIE_LABELS = {
  tt: 'Tegenwoordige tijd',
  vtZwak: 'Verleden tijd — zwak',
  vtSterk: 'Verleden tijd — sterk',
  vd: 'Voltooid deelwoord',
}

// Samenvatting per spellingregel/doel. Alleen tools die een `cat` per opgave
// loggen leveren hier iets op (werkwoordspelling; verhaaltjessommen via
// catLabel). Staat bewust ónder de foutenlijst: dit toont patronen, niet de
// losse fouten waar je mee begint.
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
    <div className="portaal-kaart">
      <h2>Fouten per categorie</h2>
      {toolIds.map(toolId => {
        const tellingen = perTool[toolId]
        return (
          <div key={toolId} style={{ marginBottom: 18 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem' }}>{toolLabel(toolId)}</h3>
            <table className="portaal-tabel">
              <thead><tr><th>Categorie</th><th>Goed</th><th>Fout</th><th>Percentage</th></tr></thead>
              <tbody>
                {Object.keys(tellingen).map(cat => {
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
    </div>
  )
}

// Losse opgave-rijen gebundeld tot één regel per oefensessie. Uitklappen toont
// alle opgaven van die sessie, fout bovenaan gemarkeerd.
function Sessies({ sessies }) {
  const [open, setOpen] = useState(null)

  if (sessies.length === 0) return <p className="portaal-leeg">Niets gemaakt in deze periode.</p>

  return (
    <table className="portaal-tabel">
      <thead>
        <tr><th>Wanneer</th><th>Oefening</th><th>Gemaakt</th><th>Goed</th><th></th></tr>
      </thead>
      <tbody>
        {sessies.map(s => {
          const pct = s.maxScore > 0 ? Math.round((s.score / s.maxScore) * 100) : 0
          const isOpen = open === s.id
          return (
            <tr key={s.id} className={isOpen ? 'portaal-rij-open' : undefined}>
              <td>{kortMoment(s.laatste)}</td>
              <td>
                {toolLabel(s.toolId)}
                {s.weektaak
                  ? <span title="Weektaak-opdracht"> 📋</span>
                  : <span className="portaal-vrij-label"> vrij</span>}
              </td>
              <td>{s.maxScore}</td>
              <td><span className={scoreKlasse(pct)}>{pct}%</span></td>
              <td>
                {s.opgaven.length > 0 && (
                  <button className="portaal-terug" style={{ padding: 0 }} onClick={() => setOpen(isOpen ? null : s.id)}>
                    {isOpen ? '▲ sluiten' : '▼ opgaven'}
                  </button>
                )}
                {isOpen && (
                  <div className="portaal-uitklap">
                    <table className="portaal-tabel">
                      <thead><tr><th>Opgave</th><th>Ingevuld</th><th>Juist</th><th></th></tr></thead>
                      <tbody>
                        {s.opgaven.map((o, i) => (
                          <tr key={i}>
                            <td>{o.vraag ?? '—'}</td>
                            <td>{o.antwoord ?? '—'}</td>
                            <td>{o.juist ?? '—'}</td>
                            <td>{o.goed ? '✅' : '❌'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
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
  const [bereik, setBereik] = useState('week')
  const [herkomst, setHerkomst] = useState('alles')

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

  const gefilterd = useMemo(() => filterHerkomst(resultaten ?? [], herkomst), [resultaten, herkomst])
  const sessies = useMemo(() => groepeerSessies(gefilterd), [gefilterd])

  return (
    <>
      <button className="portaal-terug" onClick={onBack}>← Terug</button>

      <div className="portaal-kaart">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
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
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
          <DatumFilter waarde={bereik} onChange={setBereik} />
          <HerkomstFilter waarde={herkomst} onChange={setHerkomst} />
        </div>
      </div>

      {resultaten === null && <p className="portaal-leeg">Laden…</p>}

      {resultaten !== null && (
        <>
          <div className="portaal-kaart">
            <h2>Wat ging er fout?</h2>
            <FoutenLijst rijen={gefilterd} />
          </div>

          <div className="portaal-kaart">
            <h2>Wat is er gemaakt?</h2>
            <Sessies sessies={sessies} />
          </div>

          <FoutenPerCategorie resultaten={gefilterd} />
        </>
      )}
    </>
  )
}
