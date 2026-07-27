import { supabase } from '../lib/supabase.js'

// Slaat een weektaak + opdrachten + toewijzingen op. PostgREST kent geen
// multi-statement transacties, dus de volgorde is bewust idempotent: bij een
// halve mislukking (bv. netwerkfout tussen twee stappen) is de toestand
// consistent genoeg om gewoon opnieuw op te slaan.
//
// leerlingIds: alle leerlingen van de klas. Fase 1 wijst de hele klas toe
// zonder differentiatie (zie WeektaakDifferentiatie.jsx) — elke leerling
// krijgt dezelfde opdrachten met hetzelfde aantal.
export async function slaWeektaakOp({ weektaakId, schoolId, klasId, titel, startOp, eindOp, opdrachten, leerlingIds }) {
  const weektaakRij = { school_id: schoolId, klas_id: klasId, titel, start_op: startOp, eind_op: eindOp }

  let wtId = weektaakId
  if (wtId) {
    const { error } = await supabase.from('weektaken').update(weektaakRij).eq('id', wtId)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('weektaken').insert(weektaakRij).select('id').single()
    if (error) throw error
    wtId = data.id
  }

  const { data: bestaandeOpdrachten, error: leesFout } = await supabase
    .from('opdrachten').select('id').eq('weektaak_id', wtId)
  if (leesFout) throw leesFout
  const bestaandeIds = new Set((bestaandeOpdrachten ?? []).map(o => o.id))
  const behoudenIds = new Set()

  for (let i = 0; i < opdrachten.length; i++) {
    const o = opdrachten[i]
    const rij = {
      school_id: schoolId, klas_id: klasId, weektaak_id: wtId,
      tool_id: o.toolId, aantal: o.aantal ?? null, config: o.config ?? {}, volgorde: i,
    }
    if (o.id && bestaandeIds.has(o.id)) {
      const { error } = await supabase.from('opdrachten').update(rij).eq('id', o.id)
      if (error) throw error
      behoudenIds.add(o.id)
    } else {
      const { data, error } = await supabase.from('opdrachten').insert(rij).select('id').single()
      if (error) throw error
      behoudenIds.add(data.id)
    }
  }

  // Cascade op opdrachten -> toewijzingen ruimt de rest vanzelf op.
  const teVerwijderen = [...bestaandeIds].filter(id => !behoudenIds.has(id))
  if (teVerwijderen.length) {
    const { error } = await supabase.from('opdrachten').delete().in('id', teVerwijderen)
    if (error) throw error
  }

  const gewenst = []
  for (const opdrachtId of behoudenIds) {
    for (const leerlingId of leerlingIds) {
      gewenst.push({ opdracht_id: opdrachtId, leerling_id: leerlingId, school_id: schoolId })
    }
  }
  if (gewenst.length) {
    const { error } = await supabase
      .from('toewijzingen')
      .upsert(gewenst, { onConflict: 'opdracht_id,leerling_id', ignoreDuplicates: true })
    if (error) throw error
  }

  return wtId
}
