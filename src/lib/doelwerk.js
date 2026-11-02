import { supabase } from './supabase.js'

// "Werk aan je doelen" (tool_id 'doelen-werken'): een weektaak-opdracht die in
// minuten telt in plaats van in opgaven. De gewerkte tijd komt uit de view
// doelwerk_voortgang (migratie 0021): oefentijd aan de eigen doelen binnen de
// looptijd van de weektaak, plus wat de leerling zelf koos toen al zijn
// doelen behaald waren.
export const DOELWERK = 'doelen-werken'
export const isDoelwerk = (o) => (o?.toolId ?? o?.tool_id) === DOELWERK
export const doelwerkMinuten = (config) => Number(config?.minuten) || 15

// Stand voor de balk en het portaal: hele minuten gewerkt (naar beneden, zodat
// "15 van 15" ook echt 15 minuten is) en of het af is.
export function tijdStandVan(rij, config) {
  const nodig = rij?.minuten ?? doelwerkMinuten(config)
  const gewerkt = Math.floor(Number(rij?.som_ms ?? 0) / 60000)
  return { gewerkt: Math.min(gewerkt, nodig), nodig, klaar: !!rij?.afgerond || gewerkt >= nodig }
}

export async function haalDoelwerkStand(opdrachtId, leerlingId) {
  const { data } = await supabase.from('doelwerk_voortgang').select('minuten, som_ms, afgerond')
    .eq('opdracht_id', opdrachtId).eq('leerling_id', leerlingId).maybeSingle()
  return data
}
