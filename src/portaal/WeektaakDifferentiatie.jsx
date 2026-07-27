import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { TOOL_BY_ID } from '../lib/tools.js'

const cellKey = (opdrachtId, leerlingId) => `${opdrachtId}:${leerlingId}`

// Matrix leerling × opdracht. Toewijzingen bestaan al sinds fase 1 (bij het
// opslaan van een weektaak krijgt de hele klas standaard alle opdrachten,
// zie weektaakOpslaan.js) — dit scherm maakt die alles-of-niets-toewijzing
// zichtbaar en per cel bewerkbaar: uitvinken haalt een leerling van een
// opdracht af, een eigen aantal wijkt af van het standaard-aantal van de
// opdracht. Lost meteen de "leerling zonder toewijzing"-scheur op (nieuwe
// klasgenoot na het aanmaken van de weektaak): die staat hier gewoon als
// onaangevinkt, aanvinken voegt hem toe.
export default function WeektaakDifferentiatie({ schoolId, klasId, opdrachten, onTerug }) {
  const [leerlingen, setLeerlingen] = useState(null)
  const [toewijzingen, setToewijzingen] = useState(null) // Map<"opdrachtId:leerlingId", {opdracht_id, leerling_id, aantal_override}>
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')
  const [succes, setSucces] = useState('')

  useEffect(() => {
    let actief = true
    async function laad() {
      const opdrachtIds = opdrachten.map(o => o.id)
      const [{ data: lln }, { data: tw }] = await Promise.all([
        supabase.from('profielen').select('id, weergavenaam').eq('klas_id', klasId).eq('rol', 'leerling').order('weergavenaam'),
        supabase.from('toewijzingen').select('opdracht_id, leerling_id, aantal_override').in('opdracht_id', opdrachtIds),
      ])
      if (!actief) return
      setLeerlingen(lln ?? [])
      setToewijzingen(new Map((tw ?? []).map(t => [cellKey(t.opdracht_id, t.leerling_id), t])))
    }
    laad()
    return () => { actief = false }
  }, [klasId, opdrachten])

  const toggel = (opdrachtId, leerlingId) => {
    setToewijzingen(prev => {
      const next = new Map(prev)
      const k = cellKey(opdrachtId, leerlingId)
      if (next.has(k)) next.delete(k)
      else next.set(k, { opdracht_id: opdrachtId, leerling_id: leerlingId, aantal_override: null })
      return next
    })
  }

  const zetAantal = (opdrachtId, leerlingId, waarde) => {
    setToewijzingen(prev => {
      const k = cellKey(opdrachtId, leerlingId)
      const huidig = prev.get(k)
      if (!huidig) return prev
      const next = new Map(prev)
      next.set(k, { ...huidig, aantal_override: waarde === '' ? null : Math.max(1, parseInt(waarde, 10) || 1) })
      return next
    })
  }

  const alleAanUit = (opdrachtId) => {
    setToewijzingen(prev => {
      const next = new Map(prev)
      const staanAllemaalAan = leerlingen.every(l => next.has(cellKey(opdrachtId, l.id)))
      for (const l of leerlingen) {
        const k = cellKey(opdrachtId, l.id)
        if (staanAllemaalAan) next.delete(k)
        else if (!next.has(k)) next.set(k, { opdracht_id: opdrachtId, leerling_id: l.id, aantal_override: null })
      }
      return next
    })
  }

  const opslaan = async () => {
    setBezig(true); setFout(''); setSucces('')
    try {
      const gewenst = [...toewijzingen.values()].map(t => ({ ...t, school_id: schoolId }))
      if (gewenst.length) {
        const { error } = await supabase.from('toewijzingen').upsert(gewenst, { onConflict: 'opdracht_id,leerling_id' })
        if (error) throw error
      }
      const opdrachtIds = opdrachten.map(o => o.id)
      const { data: bestaande, error: leesFout } = await supabase
        .from('toewijzingen').select('id, opdracht_id, leerling_id').in('opdracht_id', opdrachtIds)
      if (leesFout) throw leesFout
      const gewenstKeys = new Set(toewijzingen.keys())
      const teVerwijderen = (bestaande ?? [])
        .filter(t => !gewenstKeys.has(cellKey(t.opdracht_id, t.leerling_id)))
        .map(t => t.id)
      if (teVerwijderen.length) {
        const { error } = await supabase.from('toewijzingen').delete().in('id', teVerwijderen)
        if (error) throw error
      }
      setSucces('Opgeslagen')
    } catch {
      setFout('Opslaan mislukt — probeer opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  if (leerlingen === null || toewijzingen === null) return <p className="portaal-leeg">Laden…</p>

  return (
    <div className="portaal-kaart">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Differentiëren</h2>
        <button className="portaal-terug" onClick={onTerug} style={{ padding: 0 }}>← Terug</button>
      </div>
      <p className="portaal-leeg" style={{ marginTop: 0 }}>
        Vink per leerling aan welke opdrachten hij krijgt. Vul een eigen aantal in om af te wijken van het standaard-aantal.
      </p>

      {leerlingen.length === 0 && <p className="portaal-leeg">Nog geen leerlingen in deze klas.</p>}
      {leerlingen.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="portaal-tabel">
            <thead>
              <tr>
                <th>Leerling</th>
                {opdrachten.map(o => (
                  <th key={o.id}>
                    {TOOL_BY_ID[o.tool_id]?.label ?? o.tool_id}
                    <br />
                    <button
                      type="button" className="portaal-knop portaal-knop-subtiel"
                      style={{ fontSize: '0.68rem', padding: '2px 8px', marginTop: 4 }}
                      onClick={() => alleAanUit(o.id)}
                    >alles aan/uit</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leerlingen.map(l => (
                <tr key={l.id}>
                  <td>{l.weergavenaam}</td>
                  {opdrachten.map(o => {
                    const t = toewijzingen.get(cellKey(o.id, l.id))
                    const info = TOOL_BY_ID[o.tool_id]
                    return (
                      <td key={o.id}>
                        <input type="checkbox" checked={!!t} onChange={() => toggel(o.id, l.id)} />
                        {t && info?.aantalInstelbaar && (
                          <input
                            type="number" min={1}
                            placeholder={String(o.aantal ?? info.standaardAantal)}
                            value={t.aantal_override ?? ''}
                            onChange={e => zetAantal(o.id, l.id, e.target.value)}
                            style={{ width: 56, marginLeft: 6 }}
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {fout && <p className="portaal-fout">{fout}</p>}
      {succes && <p className="portaal-succes">{succes}</p>}
      <button className="portaal-knop" style={{ marginTop: 14 }} disabled={bezig} onClick={opslaan}>
        {bezig ? 'Bezig…' : 'Opslaan'}
      </button>
    </div>
  )
}
