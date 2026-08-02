import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { toolLabel } from '../lib/tools.js'
import DatumFilter from './DatumFilter.jsx'
import HerkomstFilter from './HerkomstFilter.jsx'
import { berekenBereik } from './datumBereik.js'
import { filterHerkomst, scoreKlasse, kortMoment } from './resultaatHelpers.js'

// Startscherm van een klas: wie heeft gewerkt en hoe ging het.
//
// Eén tabel, leerlingen × oefeningen, met alleen de oefeningen die déze klas
// in de gekozen periode gemaakt heeft. Per cel het percentage goed over die
// periode en hoeveel opgaven eronder liggen. Vooraan twee kolommen die de
// eigenlijke vraag beantwoorden: wanneer was iemand voor het laatst bezig, en
// hoeveel heeft hij gedaan.
//
// Klik op een naam → leerlingdetail. Klik op een kolomkop → die ene oefening
// voor de hele klas (VakTabel).
export default function KlasTabel({ klas, alleKlassen, onKiesLeerling, onKiesOefening }) {
  const [leerlingen, setLeerlingen] = useState(null)
  const [rijen, setRijen] = useState([])
  const [bereik, setBereik] = useState('week')
  const [herkomst, setHerkomst] = useState('alles')
  const [geselecteerd, setGeselecteerd] = useState(new Set())
  const [doelKlasId, setDoelKlasId] = useState('')
  const [bezig, setBezig] = useState(false)
  const [melding, setMelding] = useState('')

  useEffect(() => {
    let actief = true
    async function laad() {
      const { data: lln } = await supabase
        .from('profielen').select('id, weergavenaam, gebruikersnaam')
        .eq('klas_id', klas.id).eq('rol', 'leerling').order('weergavenaam')
      if (!actief) return
      setLeerlingen(lln ?? [])
      setGeselecteerd(new Set())
      if (!lln?.length) { setRijen([]); return }

      const { vanaf, tot } = berekenBereik(bereik)
      let query = supabase
        .from('resultaten').select('leerling_id, tool_id, score, max_score, opdracht_id, aangemaakt_op')
        .in('leerling_id', lln.map(l => l.id))
      if (vanaf) query = query.gte('aangemaakt_op', vanaf.toISOString())
      if (tot) query = query.lt('aangemaakt_op', tot.toISOString())
      const { data: res } = await query
      if (actief) setRijen(res ?? [])
    }
    laad()
    return () => { actief = false }
  }, [klas.id, bereik])

  const gefilterd = useMemo(() => filterHerkomst(rijen, herkomst), [rijen, herkomst])

  // Per leerling per oefening optellen; los daarvan per leerling het totaal en
  // het laatste moment. Eén pass over de rijen.
  const { perLeerling, toolIds } = useMemo(() => {
    const acc = {}
    const tools = new Set()
    for (const r of gefilterd) {
      tools.add(r.tool_id)
      const l = acc[r.leerling_id] ?? (acc[r.leerling_id] = { totaalMax: 0, laatste: 0, perTool: {} })
      const t = l.perTool[r.tool_id] ?? (l.perTool[r.tool_id] = { score: 0, max: 0 })
      t.score += Number(r.score); t.max += Number(r.max_score)
      l.totaalMax += Number(r.max_score)
      l.laatste = Math.max(l.laatste, new Date(r.aangemaakt_op).getTime())
    }
    return { perLeerling: acc, toolIds: [...tools].sort() }
  }, [gefilterd])

  const toggel = (id) => setGeselecteerd(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const verplaats = async () => {
    if (!doelKlasId || geselecteerd.size === 0) return
    setBezig(true); setMelding('')
    const { error } = await supabase.from('profielen').update({ klas_id: doelKlasId }).in('id', [...geselecteerd])
    setBezig(false)
    if (error) { setMelding('Verplaatsen mislukt'); return }
    setLeerlingen(prev => prev.filter(l => !geselecteerd.has(l.id)))
    setGeselecteerd(new Set())
    setMelding('Verplaatst')
  }

  return (
    <div className="portaal-kaart">
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <DatumFilter waarde={bereik} onChange={setBereik} />
        <HerkomstFilter waarde={herkomst} onChange={setHerkomst} />
      </div>

      {leerlingen === null && <p className="portaal-leeg">Laden…</p>}
      {leerlingen?.length === 0 && <p className="portaal-leeg">Nog geen leerlingen in deze klas.</p>}
      {leerlingen?.length > 0 && (
        <>
          {toolIds.length === 0 && (
            <p className="portaal-leeg">Niemand heeft in deze periode geoefend.</p>
          )}
          <div className="portaal-tabel-scroll">
            <table className="portaal-tabel">
              <thead>
                <tr>
                  <th></th>
                  <th>Leerling</th>
                  <th>Laatst actief</th>
                  <th>Gemaakt</th>
                  {toolIds.map(t => (
                    <th key={t}>
                      <button className="portaal-kolomkop" onClick={() => onKiesOefening(t)} title="Bekijk deze oefening voor de hele klas">
                        {toolLabel(t)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leerlingen.map(l => {
                  const g = perLeerling[l.id]
                  return (
                    <tr key={l.id}>
                      <td><input type="checkbox" checked={geselecteerd.has(l.id)} onChange={() => toggel(l.id)} /></td>
                      <td>
                        <button className="portaal-leerlingnaam" onClick={() => onKiesLeerling(l.id)}>{l.weergavenaam}</button>
                        <br /><span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>{l.gebruikersnaam}</span>
                      </td>
                      <td>{g ? kortMoment(g.laatste) : <span className="portaal-score-slecht">niets</span>}</td>
                      <td>{g ? g.totaalMax : 0}</td>
                      {toolIds.map(t => {
                        const cel = g?.perTool[t]
                        if (!cel) return <td key={t}>—</td>
                        const pct = cel.max > 0 ? Math.round((cel.score / cel.max) * 100) : 0
                        return (
                          <td key={t}>
                            <span className={scoreKlasse(pct)}>{pct}%</span>
                            {' '}<span style={{ color: 'rgba(255,255,255,0.55)' }}>({cel.max})</span>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {alleKlassen.length > 1 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
              <select value={doelKlasId} onChange={e => setDoelKlasId(e.target.value)}>
                <option value="">Verplaats geselecteerden naar…</option>
                {alleKlassen.filter(k => k.id !== klas.id).map(k => (
                  <option key={k.id} value={k.id}>{k.naam}{k.schooljaar ? ` (${k.schooljaar})` : ''}</option>
                ))}
              </select>
              <button className="portaal-knop portaal-knop-subtiel" disabled={!doelKlasId || geselecteerd.size === 0 || bezig} onClick={verplaats}>
                Verplaatsen ({geselecteerd.size})
              </button>
              {melding && <span className="portaal-succes">{melding}</span>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
