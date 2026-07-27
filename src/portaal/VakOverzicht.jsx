import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { toolLabel } from '../lib/tools.js'

export default function VakOverzicht({ onKiesVak }) {
  const [vakken, setVakken] = useState(null)

  useEffect(() => {
    let actief = true
    async function laad() {
      const { data } = await supabase.from('resultaten').select('tool_id')
      if (!actief) return
      setVakken([...new Set((data ?? []).map(r => r.tool_id))].sort())
    }
    laad()
    return () => { actief = false }
  }, [])

  return (
    <div className="portaal-kaart">
      <h2>Vakken</h2>
      {vakken === null && <p className="portaal-leeg">Laden…</p>}
      {vakken?.length === 0 && <p className="portaal-leeg">Nog geen resultaten binnengekomen.</p>}
      <div className="portaal-grid">
        {vakken?.map(v => (
          <button key={v} className="portaal-vak-chip" onClick={() => onKiesVak(v)}>{toolLabel(v)}</button>
        ))}
      </div>
    </div>
  )
}
