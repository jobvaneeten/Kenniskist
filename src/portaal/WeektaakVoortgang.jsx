import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { toolLabel } from '../lib/tools.js'

function scoreKlasse(pct) {
  if (pct >= 80) return 'portaal-score-goed'
  if (pct >= 50) return 'portaal-score-matig'
  return 'portaal-score-slecht'
}

// Matrix leerling × opdracht voor één weektaak. `som_max`/`doel_aantal` komen
// uit de view weektaak_voortgang (migratie 0007): "gemaakt" is de weergave-
// cap (min(som_max, doel)), zodat een leerling die vaker oefent dan gevraagd
// niet boven 100% getoond wordt — de kwaliteit (%) hieronder blijft wel over
// alles gerekend.
export default function WeektaakVoortgang({ weektaak, klasId, onKiesLeerling }) {
  const [leerlingen, setLeerlingen] = useState(null)
  const [opdrachten, setOpdrachten] = useState([])
  const [voortgang, setVoortgang] = useState([])

  useEffect(() => {
    let actief = true
    async function laad() {
      const [{ data: lln }, { data: opd }, { data: vg }] = await Promise.all([
        supabase.from('profielen').select('id, weergavenaam')
          .eq('klas_id', klasId).eq('rol', 'leerling').order('weergavenaam'),
        supabase.from('opdrachten').select('id, tool_id, aantal, volgorde')
          .eq('weektaak_id', weektaak.id).order('volgorde'),
        supabase.from('weektaak_voortgang').select('opdracht_id, leerling_id, doel_aantal, som_score, som_max')
          .eq('weektaak_id', weektaak.id),
      ])
      if (!actief) return
      setLeerlingen(lln ?? [])
      setOpdrachten(opd ?? [])
      setVoortgang(vg ?? [])
    }
    laad()
    return () => { actief = false }
  }, [weektaak.id, klasId])

  const vind = (leerlingId, opdrachtId) =>
    voortgang.find(v => v.leerling_id === leerlingId && v.opdracht_id === opdrachtId)

  return (
    <div className="portaal-kaart">
      {leerlingen === null && <p className="portaal-leeg">Laden…</p>}
      {leerlingen?.length === 0 && <p className="portaal-leeg">Nog geen leerlingen in deze klas.</p>}
      {leerlingen?.length > 0 && (
        <table className="portaal-tabel">
          <thead>
            <tr>
              <th>Leerling</th>
              {opdrachten.map(o => <th key={o.id}>{toolLabel(o.tool_id)}</th>)}
            </tr>
          </thead>
          <tbody>
            {leerlingen.map(l => (
              <tr key={l.id}>
                <td>
                  <button className="portaal-leerlingnaam" onClick={() => onKiesLeerling(l.id)}>{l.weergavenaam}</button>
                </td>
                {opdrachten.map(o => {
                  const v = vind(l.id, o.id)
                  if (!v || !v.doel_aantal) return <td key={o.id}>—</td>
                  const gemaakt = Math.min(v.som_max, v.doel_aantal)
                  const pct = v.som_max > 0 ? Math.round((v.som_score / v.som_max) * 100) : 0
                  const fout = v.som_max - v.som_score
                  return (
                    <td key={o.id}>
                      <strong>{gemaakt}/{v.doel_aantal}</strong>
                      {v.som_max > 0 && (
                        <>
                          {' '}<span className={scoreKlasse(pct)}>{pct}%</span>
                          {fout > 0 && (
                            <>
                              <br />
                              <button
                                className="portaal-terug" style={{ padding: 0, fontSize: '0.78rem' }}
                                onClick={() => onKiesLeerling(l.id)}
                                title="Open het leerlingprofiel met de foutenlijst"
                              >{Math.round(fout)} fout →</button>
                            </>
                          )}
                        </>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
