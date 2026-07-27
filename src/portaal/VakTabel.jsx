import { Fragment, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import DatumFilter from './DatumFilter.jsx'
import { berekenBereik } from './datumBereik.js'
import LeerlingUitklap from './LeerlingUitklap.jsx'
import { toolLabel } from '../lib/tools.js'

function scoreKlasse(pct) {
  if (pct >= 80) return 'portaal-score-goed'
  if (pct >= 50) return 'portaal-score-matig'
  return 'portaal-score-slecht'
}

// Embeddable, altijd geschaald op één klas: geen eigen wrapper/terug-knop
// (die horen bij KlasScherm) en geen Klas-kolom (overbodig binnen één klas).
export default function VakTabel({ klasId, vak, onTerug, onKiesLeerling }) {
  const [bereik, setBereik] = useState('altijd')
  const [rijen, setRijen] = useState(null)
  const [open, setOpen] = useState(null)

  useEffect(() => {
    let actief = true
    async function laad() {
      const { data: leerlingen } = await supabase
        .from('profielen').select('id, weergavenaam')
        .eq('rol', 'leerling').eq('klas_id', klasId).order('weergavenaam')

      const { vanaf, tot } = berekenBereik(bereik)
      let query = supabase.from('resultaten').select('leerling_id, score, max_score, aangemaakt_op').eq('tool_id', vak)
      if (vanaf) query = query.gte('aangemaakt_op', vanaf.toISOString())
      if (tot) query = query.lt('aangemaakt_op', tot.toISOString())
      const { data: resultaten } = await query

      if (!actief) return
      const perLeerling = (leerlingen ?? []).map(l => {
        const eigen = (resultaten ?? []).filter(r => r.leerling_id === l.id)
        const gemiddeld = eigen.length
          ? Math.round(eigen.reduce((som, r) => som + (r.score / r.max_score) * 100, 0) / eigen.length)
          : null
        return { id: l.id, naam: l.weergavenaam, pogingen: eigen.length, gemiddeld }
      })
      setRijen(perLeerling)
    }
    laad()
    return () => { actief = false }
  }, [klasId, vak, bereik])

  return (
    <div className="portaal-kaart">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <button className="portaal-terug" onClick={onTerug} style={{ padding: 0 }}>← Andere vak kiezen</button>
        <DatumFilter waarde={bereik} onChange={setBereik} />
      </div>
      <h2 style={{ marginTop: 0 }}>{toolLabel(vak)}</h2>
      {rijen === null && <p className="portaal-leeg">Laden…</p>}
      {rijen?.length === 0 && <p className="portaal-leeg">Nog geen leerlingen in deze klas.</p>}
      {rijen?.length > 0 && (
        <table className="portaal-tabel">
          <thead>
            <tr><th>Leerling</th><th>Pogingen</th><th>Gemiddeld</th></tr>
          </thead>
          <tbody>
            {rijen.map(r => {
              const isOpen = open === r.id
              return (
                <Fragment key={r.id}>
                  <tr>
                    <td>
                      <button className="portaal-leerlingnaam" onClick={() => setOpen(isOpen ? null : r.id)}>
                        {r.naam} {isOpen ? '▲' : '▼'}
                      </button>
                    </td>
                    <td>{r.pogingen}</td>
                    <td>{r.gemiddeld === null ? '—' : <span className={scoreKlasse(r.gemiddeld)}>{r.gemiddeld}%</span>}</td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={3}>
                        <div className="portaal-uitklap">
                          <LeerlingUitklap leerlingId={r.id} vak={vak} bereik={bereik} onVolledigProfiel={() => onKiesLeerling(r.id)} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
