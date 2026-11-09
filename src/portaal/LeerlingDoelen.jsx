import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { doelStandVan } from '../lib/weektaak.js'
import { toolLabel } from '../lib/tools.js'
import { DoelCel } from './WeektaakVoortgang.jsx'

// Bij één leerling (LeerlingDetail): welke doelen er voor hem klaarstaan en
// welke hij al behaald heeft. Een doel is een "weektaak" met config
// persoonlijk = 'doel' (zie lib/weektaak.js); behaald als al zijn opdrachten
// behaald zijn (doel_voortgang, 0016/0018).
const datum = (d) => (d ? new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' }) : '')

export default function LeerlingDoelen({ leerlingId, teller }) {
  const [doelen, setDoelen] = useState(null)

  useEffect(() => {
    let actief = true
    async function laad() {
      const { data: tw } = await supabase.from('toewijzingen')
        .select('opdracht_id, status, opdrachten(id, tool_id, config, weektaak_id, weektaken(id, titel, start_op))')
        .eq('leerling_id', leerlingId)
      const rijen = (tw ?? []).filter(t => t.status !== 'vrijgesteld' && t.opdrachten?.config?.persoonlijk === 'doel')
      const ids = rijen.map(t => t.opdracht_id)
      const { data: dv } = ids.length
        ? await supabase.from('doel_voortgang').select('opdracht_id, gemaakt, laatste_goed, laatste_aantal, gehaald, gehaald_op')
          .eq('leerling_id', leerlingId).in('opdracht_id', ids)
        : { data: [] }
      if (!actief) return
      const stand = new Map((dv ?? []).map(d => [d.opdracht_id, d]))
      const perDoel = new Map()
      for (const t of rijen) {
        const wt = t.opdrachten.weektaken ?? { id: t.opdrachten.weektaak_id, titel: '' }
        if (!perDoel.has(wt.id)) perDoel.set(wt.id, { id: wt.id, titel: wt.titel, sinds: wt.start_op, opdrachten: [] })
        const d = stand.get(t.opdracht_id)
        perDoel.get(wt.id).opdrachten.push({ id: t.opdracht_id, tool: toolLabel(t.opdrachten.tool_id), stand: doelStandVan(d), gehaaldOp: d?.gehaald_op })
      }
      const lijst = [...perDoel.values()].map(d => ({
        ...d,
        behaald: d.opdrachten.every(o => o.stand.gehaald),
        behaaldOp: d.opdrachten.map(o => o.gehaaldOp).filter(Boolean).sort().at(-1),
      }))
      setDoelen(lijst)
    }
    laad()
    return () => { actief = false }
  }, [leerlingId, teller])

  if (doelen === null) return null
  const open = doelen.filter(d => !d.behaald).sort((a, b) => String(a.sinds).localeCompare(String(b.sinds)))
  const behaald = doelen.filter(d => d.behaald).sort((a, b) => String(b.behaaldOp).localeCompare(String(a.behaaldOp)))

  const tabel = (rijen, isBehaald) => (
    <table className="portaal-tabel">
      <thead><tr><th>Doel</th><th>Oefening</th><th>{isBehaald ? 'Behaald op' : 'Stand'}</th><th>Klaargezet</th></tr></thead>
      <tbody>
        {rijen.flatMap(d => d.opdrachten.map((o, i) => (
          <tr key={o.id}>
            {i === 0 && <td rowSpan={d.opdrachten.length}><strong>{d.titel}</strong></td>}
            <td>{o.tool}</td>
            <td>{isBehaald ? <span className="portaal-score-goed"><strong>{datum(o.gehaaldOp) || 'Gehaald'}</strong></span> : <DoelCel stand={o.stand} />}</td>
            {i === 0 && <td rowSpan={d.opdrachten.length} className="portaal-zacht">{datum(d.sinds)}</td>}
          </tr>
        )))}
      </tbody>
    </table>
  )

  return (
    <div className="portaal-kaart">
      <h2 style={{ marginTop: 0 }}>Doelen</h2>
      {doelen.length === 0 && <p className="portaal-leeg">Er staan nog geen doelen voor deze leerling klaar. Je zet ze klaar bij Taken en doelen.</p>}
      {doelen.length > 0 && (
        <>
          <h3 style={{ margin: '4px 0 8px', fontSize: '1rem' }}>Staan klaar ({open.length})</h3>
          {open.length ? tabel(open, false) : <p className="portaal-zacht">Alle doelen zijn behaald.</p>}
          <h3 style={{ margin: '18px 0 8px', fontSize: '1rem' }}>Behaald ({behaald.length})</h3>
          {behaald.length ? tabel(behaald, true) : <p className="portaal-zacht">Nog geen doelen behaald.</p>}
        </>
      )}
    </div>
  )
}
