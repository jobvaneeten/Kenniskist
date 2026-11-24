import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { TOOL_BY_ID } from '../lib/tools.js'
import { spellingLabel } from '../lib/methodes.js'
import { doelSleutel } from '../lib/vaardigheden.js'

// Hulpjes voor DicteeDoelKlaarzetten.jsx (een categorie uit de dicteeanalyse als doel klaarzetten).
export const GRENS = 0.8   // aangevinkt: minder dan 80% goed in die categorie
export const vandaag = () => new Date().toLocaleDateString('sv-SE')

// Korte naam van een subcategorie in de analyse: "eau: leenwoord met eau" wordt
// "leenwoord met eau"; bij de dubbele dieren het dier erbij ("hond: /t/ ...").
export function subNaam(subId) {
  const optie = TOOL_BY_ID['dictee-categorie']?.configVelden?.[0]?.opties?.find(o => o.value === subId)
  if (!optie) return subId.split(':')[1]
  const [dier, regel] = optie.label.split(' — ')
  const kaal = spellingLabel(optie.label)
  if (kaal !== optie.label) return kaal          // zonder Taal actief: alleen de regel
  return dier.includes(' · ') ? regel : `${dier}: ${regel}`
}

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

