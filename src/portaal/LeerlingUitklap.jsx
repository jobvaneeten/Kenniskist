import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
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

// Uitklapbare inhoud onder een leerling-rij: fouten per categorie, zonder de
// tabel te verlaten. `vak` beperkt tot één tool_id (VakTabel); zonder vak
// tellen alle tools mee (KlasTabel). `bereik` is optioneel — zonder filter
// telt alles mee.
export default function LeerlingUitklap({ leerlingId, vak, bereik, onVolledigProfiel }) {
  const [resultaten, setResultaten] = useState(null)

  useEffect(() => {
    let actief = true
    async function laad() {
      let query = supabase.from('resultaten').select('details_json').eq('leerling_id', leerlingId)
      if (vak) query = query.eq('tool_id', vak)
      if (bereik) {
        const { vanaf, tot } = berekenBereik(bereik)
        if (vanaf) query = query.gte('aangemaakt_op', vanaf.toISOString())
        if (tot) query = query.lt('aangemaakt_op', tot.toISOString())
      }
      const { data } = await query
      if (actief) setResultaten(data ?? [])
    }
    laad()
    return () => { actief = false }
  }, [leerlingId, vak, bereik])

  if (resultaten === null) return <p className="portaal-leeg">Laden…</p>

  const tellingen = {}
  for (const r of resultaten) {
    const opgaven = r.details_json?.opgaven
    if (!Array.isArray(opgaven)) continue
    for (const o of opgaven) {
      if (!o.cat) continue
      if (!tellingen[o.cat]) tellingen[o.cat] = { goed: 0, fout: 0 }
      tellingen[o.cat][o.goed ? 'goed' : 'fout']++
    }
  }
  const categorieen = Object.keys(tellingen)

  return (
    <div>
      {categorieen.length === 0 && <p className="portaal-leeg">Geen fouten-per-categorie beschikbaar (nog niets gemaakt, of dit vak logt geen categorieën).</p>}
      {categorieen.length > 0 && (
        <table className="portaal-tabel">
          <thead><tr><th>Categorie</th><th>Goed</th><th>Fout</th><th>Percentage</th></tr></thead>
          <tbody>
            {categorieen.map(cat => {
              const { goed, fout } = tellingen[cat]
              const totaal = goed + fout
              const pct = totaal ? Math.round((goed / totaal) * 100) : 0
              return (
                <tr key={cat}>
                  <td>{CATEGORIE_LABELS[cat] ?? cat}</td>
                  <td>{goed}</td>
                  <td>{fout}</td>
                  <td><span className={scoreKlasse(pct)}>{pct}%</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <button className="portaal-terug" style={{ padding: '10px 0 0' }} onClick={onVolledigProfiel}>→ Volledig leerlingprofiel</button>
    </div>
  )
}
