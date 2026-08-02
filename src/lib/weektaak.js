import { supabase } from './supabase.js'

// kk_actieve_opdracht: gelezen door public/kenniskist-login.js om een
// resultaat aan de juiste opdracht te hangen (toolId moet matchen — zie
// aldaar). Losse helpers i.p.v. losse localStorage-calls in Weektaak.jsx,
// puur zodat het zetten van de sleutel (en de niet-pure Date.now()) niet in
// de render-scope van het component staat.
export function zetActieveOpdracht(opdracht) {
  localStorage.setItem('kk_actieve_opdracht', JSON.stringify({
    opdrachtId: opdracht.opdrachtId,
    toolId: opdracht.toolId,
    gezetOp: Date.now(),
  }))
}

export function wisActieveOpdracht() {
  localStorage.removeItem('kk_actieve_opdracht')
}

// YYYY-MM-DD in lokale tijd (Europe/Amsterdam op dit apparaat). Bewust geen
// current_date/UTC-vergelijking in de database: Supabase draait in UTC en
// zou een weektaak die "vandaag" eindigt om 02:00 Nederlandse tijd al laten
// verlopen (zie migratie 0007_weektaken.sql).
function vandaag() {
  return new Date().toLocaleDateString('sv-SE')
}

// Haalt de actieve weektaak-opdrachten van de ingelogde leerling op: alle
// weektaken van zijn klas die vandaag lopen, de opdrachten daarbinnen die aan
// hem zijn toegewezen, en de voortgang per opdracht. Drie losse query's,
// client-side samengevoegd — bewust geen PostgREST-embeds twee niveaus diep,
// dat is broos en lastig te debuggen.
//
// Een opdracht zonder voortgangsrij is niet aan deze leerling toegewezen:
// weektaak_voortgang is opgebouwd vanuit `toewijzingen` (zie migratie 0007),
// dus het bestaan van de rij ís de toewijzing — geen aparte query nodig.
export async function haalMijnWeektaak(profielId, klasId) {
  if (!profielId || !klasId) return []
  const vandaagStr = vandaag()

  const { data: weektaken } = await supabase
    .from('weektaken').select('id, titel, start_op, eind_op')
    .eq('klas_id', klasId)
    .lte('start_op', vandaagStr).gte('eind_op', vandaagStr)
    .order('start_op', { ascending: false })
  if (!weektaken?.length) return []

  const weektaakIds = weektaken.map(w => w.id)
  const { data: opdrachten } = await supabase
    .from('opdrachten').select('id, tool_id, aantal, config, volgorde, weektaak_id')
    .in('weektaak_id', weektaakIds)
    .order('volgorde')
  if (!opdrachten?.length) return []

  const opdrachtIds = opdrachten.map(o => o.id)
  // De status staat niet in weektaak_voortgang, dus apart erbij: een opdracht
  // die de leerkracht heeft vrijgesteld ("hoeft niet") hoort niet meer in het
  // lijstje van de leerling te staan.
  const [{ data: voortgang }, { data: toewijzingen }] = await Promise.all([
    supabase.from('weektaak_voortgang').select('opdracht_id, doel_aantal, som_score, som_max, pogingen')
      .eq('leerling_id', profielId).in('opdracht_id', opdrachtIds),
    supabase.from('toewijzingen').select('opdracht_id, status')
      .eq('leerling_id', profielId).in('opdracht_id', opdrachtIds),
  ])

  const weektaakBij = new Map(weektaken.map(w => [w.id, w]))
  const voortgangBij = new Map((voortgang ?? []).map(v => [v.opdracht_id, v]))
  const vrijgesteld = new Set((toewijzingen ?? []).filter(t => t.status === 'vrijgesteld').map(t => t.opdracht_id))

  return opdrachten
    .filter(o => voortgangBij.has(o.id) && !vrijgesteld.has(o.id))
    .map(o => {
      const v = voortgangBij.get(o.id)
      const doel = v.doel_aantal ?? null
      return {
        opdrachtId: o.id,
        toolId: o.tool_id,
        aantal: doel ?? o.aantal,
        config: o.config,
        weektaak: weektaakBij.get(o.weektaak_id),
        doel,
        somMax: v.som_max,
        somScore: v.som_score,
        pogingen: v.pogingen,
        // Cap op de weergave, niet op de data: een leerling die de opdracht
        // vaker doet dan gevraagd komt boven 100%, dat is prima — hij heeft
        // 'm dan allang gehaald.
        klaar: doel != null && v.som_max >= doel,
      }
    })
}
