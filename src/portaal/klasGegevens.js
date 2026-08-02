import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { berekenBereik } from './datumBereik.js'

// Eén fetch per klas + periode, gedeeld door alle schermen van KlasScherm.
// Daarvoor haalde elk tabblad zijn eigen resultaten op met een eigen
// datumfilter; dat gaf drie keer hetzelfde verkeer én drie filters die uit
// elkaar konden lopen. `details_json` gaat mee: het klasoverzicht laat nu ook
// zien wát er fout ging, en dat staat alleen daarin.
export function useKlasGegevens(klasId, bereik) {
  const [leerlingen, setLeerlingen] = useState(null)
  const [rijen, setRijen] = useState([])
  const [teller, setTeller] = useState(0)

  useEffect(() => {
    let actief = true
    async function laad() {
      const { data: lln } = await supabase
        .from('profielen').select('id, weergavenaam, gebruikersnaam')
        .eq('klas_id', klasId).eq('rol', 'leerling').order('weergavenaam')
      if (!actief) return
      setLeerlingen(lln ?? [])
      if (!lln?.length) { setRijen([]); return }

      const { vanaf, tot } = berekenBereik(bereik)
      let query = supabase
        .from('resultaten')
        .select('id, leerling_id, tool_id, score, max_score, opdracht_id, aangemaakt_op, details_json')
        .in('leerling_id', lln.map(l => l.id))
        .order('aangemaakt_op', { ascending: false })
      if (vanaf) query = query.gte('aangemaakt_op', vanaf.toISOString())
      if (tot) query = query.lt('aangemaakt_op', tot.toISOString())
      const { data: res } = await query
      if (actief) setRijen(res ?? [])
    }
    laad()
    return () => { actief = false }
  }, [klasId, bereik, teller])

  return { leerlingen, rijen, herlaad: useCallback(() => setTeller(t => t + 1), []) }
}

// Alles wat de schermen nodig hebben in één pass over de rijen: per leerling
// een regel (hoeveel, hoe goed, wanneer voor het laatst, per oefening) en per
// oefening een regel (hoeveel leerlingen, hoe goed, hoeveel fout).
export function vatKlasSamen(leerlingen, rijen) {
  const perLeerling = new Map()
  for (const l of leerlingen ?? []) {
    perLeerling.set(l.id, { ...l, opgaven: 0, goed: 0, laatste: 0, perTool: {} })
  }
  const perTool = new Map()

  for (const r of rijen) {
    const l = perLeerling.get(r.leerling_id)
    if (!l) continue
    const score = Number(r.score)
    const max = Number(r.max_score)
    const tijd = new Date(r.aangemaakt_op).getTime()

    l.opgaven += max
    l.goed += score
    if (tijd > l.laatste) l.laatste = tijd
    const lt = l.perTool[r.tool_id] ?? (l.perTool[r.tool_id] = { opgaven: 0, goed: 0 })
    lt.opgaven += max
    lt.goed += score

    const t = perTool.get(r.tool_id)
      ?? { toolId: r.tool_id, opgaven: 0, goed: 0, laatste: 0, leerlingen: new Set() }
    t.opgaven += max
    t.goed += score
    t.leerlingen.add(r.leerling_id)
    if (tijd > t.laatste) t.laatste = tijd
    perTool.set(r.tool_id, t)
  }

  const rond = (o) => ({ ...o, fout: o.opgaven - o.goed, pct: o.opgaven > 0 ? Math.round((o.goed / o.opgaven) * 100) : null })

  const lijst = [...perLeerling.values()].map(l => ({
    ...rond(l),
    zwakstePunt: zwakstePunt(l.perTool),
  }))
  const tools = [...perTool.values()].map(rond).sort((a, b) => b.opgaven - a.opgaven)

  const opgaven = lijst.reduce((s, l) => s + l.opgaven, 0)
  const goed = lijst.reduce((s, l) => s + l.goed, 0)

  return {
    lijst,
    tools,
    totaal: {
      leerlingen: lijst.length,
      actief: lijst.filter(l => l.opgaven > 0).length,
      opgaven,
      fout: opgaven - goed,
      pct: opgaven > 0 ? Math.round((goed / opgaven) * 100) : null,
    },
  }
}

// De oefening waar deze leerling het slechtst op scoort, mits er genoeg
// opgaven onder liggen om er iets over te zeggen.
function zwakstePunt(perTool) {
  let slechtste = null
  for (const [toolId, t] of Object.entries(perTool)) {
    if (t.opgaven < 4) continue
    const pct = Math.round((t.goed / t.opgaven) * 100)
    if (pct >= 70) continue
    if (!slechtste || pct < slechtste.pct) slechtste = { toolId, pct }
  }
  return slechtste
}
