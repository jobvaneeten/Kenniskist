import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { TOOL_BY_ID } from '../lib/tools.js'
import { spellingLabel } from '../lib/methodes.js'
import { doelSleutel } from '../lib/vaardigheden.js'

// Hulpjes voor DicteeDoelKlaarzetten.jsx (een categorie uit de dicteeanalyse als doel klaarzetten).
export const GRENS = 0.8
export const vandaag = () => new Date().toLocaleDateString('sv-SE')

export function doelTitel(catId) {
  const optie = TOOL_BY_ID['dictee-categorie']?.configVelden?.[0]?.opties?.find(o => o.value === catId)
  return spellingLabel(optie?.label ?? catId)
}

// Welke leerlingen hebben al een doel voor deze categorie (één keer per afname geladen).
export function useBestaandeDoelen(leerlingIds) {
  const [kaart, setKaart] = useState(null)
  const sleutel = leerlingIds.join(',')
  useEffect(() => {
    if (!sleutel) return
    let actief = true
    supabase.from('toewijzingen').select('leerling_id, status, opdrachten(tool_id, config)')
      .in('leerling_id', sleutel.split(','))
      .then(({ data }) => {
        if (!actief) return
        const m = new Map()
        for (const t of data ?? []) {
          const o = t.opdrachten
          if (o?.config?.persoonlijk !== 'doel' || t.status === 'vrijgesteld') continue
          const k = doelSleutel(o.tool_id, o.config)
          if (!m.has(k)) m.set(k, new Set())
          m.get(k).add(t.leerling_id)
        }
        setKaart(m)
      })
    return () => { actief = false }
  }, [sleutel])
  return [kaart, setKaart]
}

