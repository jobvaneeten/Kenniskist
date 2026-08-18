import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { roepWorkerAan } from '../lib/worker.js'
import { toolLabel } from '../lib/tools.js'
import FoutenLijst from './FoutenLijst.jsx'
import Balk from './Balk.jsx'
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

// Kop met de cijfers van deze leerling. Stond eerst in de leerlingenlijst,
// maar die is nu een keuzelijst met alleen namen — dus hoort het hier, bij het
// kind zelf: hoeveel, hoe goed, wanneer voor het laatst, en per oefening.
function LeerlingCijfers({ rijen }) {
  const perTool = {}
  let opgaven = 0, goed = 0, laatste = 0
  for (const r of rijen) {
    const max = Number(r.max_score), score = Number(r.score)
    opgaven += max; goed += score
    laatste = Math.max(laatste, new Date(r.aangemaakt_op).getTime())
    const t = perTool[r.tool_id] ?? (perTool[r.tool_id] = { opgaven: 0, goed: 0 })
    t.opgaven += max; t.goed += score
  }
  const pct = opgaven > 0 ? Math.round((goed / opgaven) * 100) : null
  const tools = Object.entries(perTool)
    .map(([toolId, t]) => ({ toolId, ...t, pct: Math.round((t.goed / t.opgaven) * 100) }))
    .sort((a, b) => a.pct - b.pct)

  if (opgaven === 0) {
    return <div className="portaal-kaart"><p className="portaal-leeg">Deze leerling heeft in deze periode niets gemaakt.</p></div>
  }

  return (
    <>
      <div className="portaal-tegels">
        <div className="portaal-tegel">
          <span className="portaal-tegel-getal">{opgaven}</span>
          <span className="portaal-tegel-label">Opgaven gemaakt</span>
        </div>
        <div className="portaal-tegel">
          <span className={`portaal-tegel-getal ${scoreKlasse(pct)}`}>{pct}%</span>
          <span className="portaal-tegel-label">Goed</span>
        </div>
        <div className="portaal-tegel">
          <span className="portaal-tegel-getal portaal-score-slecht">{opgaven - goed}</span>
          <span className="portaal-tegel-label">Fout</span>
        </div>
        <div className="portaal-tegel">
          <span className="portaal-tegel-getal" style={{ fontSize: '1.15rem' }}>{kortMoment(laatste)}</span>
          <span className="portaal-tegel-label">Laatst actief</span>
        </div>
      </div>

      <div className="portaal-kaart">
        <h2>Per oefening</h2>
        <table className="portaal-tabel">
          <thead><tr><th>Oefening</th><th>Gemaakt</th><th>Fout</th><th>Goed</th></tr></thead>
          <tbody>
            {tools.map(t => (
              <tr key={t.toolId}>
                <td>{toolLabel(t.toolId)}</td>
                <td>{t.opgaven}</td>
                <td>{t.opgaven - t.goed}</td>
                <td>
                  <span className="portaal-scorecel">
                    <Balk pct={t.pct} />
                    <span className={scoreKlasse(t.pct)}>{t.pct}%</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
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

// Embeddable: geen eigen .portaal-wrapper en geen eigen filters — periode en
// herkomst komen van KlasScherm, zodat dit scherm hetzelfde laat zien als de
// lijst waar je vandaan klikte. Terug gaat via de kruimelbalk daarboven.
export default function LeerlingDetail({ leerlingId, bereik, herkomst }) {
  const [leerling, setLeerling] = useState(null)
  const [resultaten, setResultaten] = useState(null)

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
      <div className="portaal-kaart">
        <div className="portaal-sectiekop">
          <div>
            <h2 style={{ margin: 0 }}>{leerling?.weergavenaam ?? '…'}</h2>
            {leerling && (
              <p className="portaal-zacht" style={{ margin: '4px 0 0' }}>
                Inloggen met: klas <strong>{leerling.klassen?.code}</strong>, gebruikersnaam <strong>{leerling.gebruikersnaam}</strong>
              </p>
            )}
          </div>
          {leerling && <WachtwoordResetten leerlingId={leerlingId} />}
        </div>
      </div>

      {resultaten === null && <p className="portaal-leeg">Laden…</p>}

      {resultaten !== null && (
        <>
          <LeerlingCijfers rijen={gefilterd} />

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
