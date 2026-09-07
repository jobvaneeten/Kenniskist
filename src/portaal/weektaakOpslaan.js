import { supabase } from '../lib/supabase.js'

// Slaat een weektaak + opdrachten + toewijzingen op. PostgREST kent geen
// multi-statement transacties, dus de volgorde is bewust idempotent: bij een
// halve mislukking (bv. netwerkfout tussen twee stappen) is de toestand
// consistent genoeg om gewoon opnieuw op te slaan.
//
// leerlingIds: de leerlingen die deze weektaak krijgen (standaard de hele
// klas, aan te vinken in WeektaakForm). Iedereen in die lijst krijgt dezelfde
// opdrachten met hetzelfde aantal; per leerling afwijken doe je daarna in
// WeektaakDifferentiatie.jsx.
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

  // Uitgevinkte leerlingen weer losmaken. Zonder deze stap zou een leerling
  // die je bij het bewerken weghaalt de weektaak gewoon houden, want de upsert
  // hierboven voegt alleen toe.
  const opdrachtIds = [...behoudenIds]
  if (opdrachtIds.length) {
    let query = supabase.from('toewijzingen').delete().in('opdracht_id', opdrachtIds)
    if (leerlingIds.length) query = query.not('leerling_id', 'in', `(${leerlingIds.join(',')})`)
    const { error } = await query
    if (error) throw error
  }

  return wtId
}

// Zet dezelfde weektaak nog een keer klaar, meestal voor de week erna.
//
// Wat mee gaat: de opdrachten (tool, aantal, config, volgorde) en de
// differentiatie — wie welke opdracht krijgt en met welk eigen aantal. Wat níet
// mee gaat: de voortgang, vrijstellingen en herkansingen. Dat is precies de
// bedoeling: hetzelfde werk, schone lei.
//
// De opgaven zelf komen niet uit de database maar worden bij het spelen
// gegenereerd uit tool_id + config. Een kopie levert dus vanzelf nieuwe sommen,
// woorden of zinnen op, met dezelfde soort en hetzelfde niveau.
export async function kopieerWeektaak({ bronId, schoolId, klasId, titel, startOp, eindOp }) {
  const { data: bronOpdrachten, error: opdrachtFout } = await supabase
    .from('opdrachten').select('id, tool_id, aantal, config, volgorde')
    .eq('weektaak_id', bronId).order('volgorde')
  if (opdrachtFout) throw opdrachtFout

  const bronIds = (bronOpdrachten ?? []).map(o => o.id)
  let bronToewijzingen = []
  if (bronIds.length) {
    const { data, error } = await supabase
      .from('toewijzingen').select('opdracht_id, leerling_id, aantal_override')
      .in('opdracht_id', bronIds)
    if (error) throw error
    bronToewijzingen = data ?? []
  }

  const { data: nieuweWeektaak, error: wtFout } = await supabase
    .from('weektaken')
    .insert({ school_id: schoolId, klas_id: klasId, titel, start_op: startOp, eind_op: eindOp })
    .select('id').single()
  if (wtFout) throw wtFout
  const nieuwId = nieuweWeektaak.id

  // Eén insert per opdracht, want we hebben de nieuwe id's nodig om de
  // toewijzingen aan te hangen. Het zijn er hooguit een handvol.
  const idKaart = new Map()
  for (const o of bronOpdrachten ?? []) {
    const { data, error } = await supabase.from('opdrachten').insert({
      school_id: schoolId, klas_id: klasId, weektaak_id: nieuwId,
      tool_id: o.tool_id, aantal: o.aantal, config: o.config ?? {}, volgorde: o.volgorde,
    }).select('id').single()
    if (error) throw error
    idKaart.set(o.id, data.id)
  }

  // status blijft op de standaard 'open' en herkansingen op 0: een vrijstelling
  // of een herkansing hoorde bij de vorige week, niet bij deze.
  const nieuweToewijzingen = bronToewijzingen
    .filter(t => idKaart.has(t.opdracht_id))
    .map(t => ({
      opdracht_id: idKaart.get(t.opdracht_id),
      leerling_id: t.leerling_id,
      aantal_override: t.aantal_override,
      school_id: schoolId,
    }))
  if (nieuweToewijzingen.length) {
    const { error } = await supabase.from('toewijzingen').insert(nieuweToewijzingen)
    if (error) throw error
  }

  return { id: nieuwId, opdrachten: idKaart.size, toewijzingen: nieuweToewijzingen.length }
}
