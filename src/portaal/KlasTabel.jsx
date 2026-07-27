import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { toolLabel } from '../lib/tools.js'

function scoreKlasse(score, maxScore) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0
  if (pct >= 80) return 'portaal-score-goed'
  if (pct >= 50) return 'portaal-score-matig'
  return 'portaal-score-slecht'
}

// Embeddable: geen eigen .portaal-wrapper of terug-knop — die horen bij
// KlasScherm, dat dit rendert als de "Per leerling"-tab.
export default function KlasTabel({ klas, alleKlassen, onKiesLeerling }) {
  const [leerlingen, setLeerlingen] = useState(null)
  const [resultaten, setResultaten] = useState([])
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
      if (lln?.length) {
        const { data: res } = await supabase
          .from('laatste_resultaten').select('leerling_id, tool_id, score, max_score, aangemaakt_op')
          .in('leerling_id', lln.map(l => l.id))
        if (actief) setResultaten(res ?? [])
      } else {
        setResultaten([])
      }
    }
    laad()
    return () => { actief = false }
  }, [klas.id])

  const toolIds = [...new Set(resultaten.map(r => r.tool_id))].sort()
  const vind = (leerlingId, toolId) => resultaten.find(r => r.leerling_id === leerlingId && r.tool_id === toolId)

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
      {leerlingen === null && <p className="portaal-leeg">Laden…</p>}
      {leerlingen?.length === 0 && <p className="portaal-leeg">Nog geen leerlingen in deze klas.</p>}
      {leerlingen?.length > 0 && (
        <>
          <table className="portaal-tabel">
            <thead>
              <tr>
                <th></th>
                <th>Leerling</th>
                {toolIds.map(t => <th key={t}>{toolLabel(t)}</th>)}
              </tr>
            </thead>
            <tbody>
              {leerlingen.map(l => (
                <tr key={l.id}>
                  <td><input type="checkbox" checked={geselecteerd.has(l.id)} onChange={() => toggel(l.id)} /></td>
                  <td>
                    <button className="portaal-leerlingnaam" onClick={() => onKiesLeerling(l.id)}>{l.weergavenaam}</button>
                    <br /><span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>{l.gebruikersnaam}</span>
                  </td>
                  {toolIds.map(t => {
                    const r = vind(l.id, t)
                    if (!r) return <td key={t}>—</td>
                    const pct = Math.round((r.score / r.max_score) * 100)
                    return (
                      <td key={t}>
                        <span className={scoreKlasse(r.score, r.max_score)}>{pct}%</span>
                        {' '}<span style={{ color: 'rgba(255,255,255,0.55)' }}>{new Date(r.aangemaakt_op).toLocaleDateString('nl-NL')}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {alleKlassen.length > 1 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}>
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
