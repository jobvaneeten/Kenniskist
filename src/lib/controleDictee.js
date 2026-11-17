import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

// Controledictee (migratie 0026). Leerling: ControleDictee.jsx, via de knop op
// het beginscherm. Leerkracht: tab Dictee in het portaal (DicteeTab.jsx).

// ── Leerling ─────────────────────────────────────────────────────────────
export async function haalMijnDictee() {
  const { data, error } = await supabase.rpc('mijn_controledictee')
  if (error) throw error
  return data?.[0] ?? null
}

export async function bewaarDictee(id, antwoorden, inleveren = false) {
  const { data, error } = await supabase.rpc('bewaar_dictee', { p_dictee: id, p_antwoorden: antwoorden, p_inleveren: inleveren })
  if (error) throw error
  return data === true
}

// Staat er een dictee open dat ik nog moet inleveren? Elke 20 s opnieuw kijken.
export function useOpenDictee(profiel, intervalMs = 20000) {
  const [dictee, setDictee] = useState(null)
  useEffect(() => {
    if (profiel?.rol !== 'leerling' || !profiel?.klas_id) { setDictee(null); return }
    let actief = true
    const laad = () => haalMijnDictee()
      .then(d => { if (actief) setDictee(v => (v?.id === d?.id && v?.ingeleverd === d?.ingeleverd ? v : d)) })
      .catch(() => {})
    laad()
    const t = setInterval(laad, intervalMs)
    return () => { actief = false; clearInterval(t) }
  }, [profiel?.rol, profiel?.klas_id, intervalMs])
  return dictee && !dictee.ingeleverd ? dictee : null
}

// ── Leerkracht ───────────────────────────────────────────────────────────
export async function haalSjablonen() {
  const { data, error } = await supabase.from('dictee_sjablonen').select('id, groep, titel, woorden, klas_ids').order('volgorde')
  if (error) throw error
  return data ?? []
}

export async function haalDictees(klasId) {
  supabase.rpc('ruim_dictees_op').then(() => {}, () => {})   // verlopen afnames weg (AVG)
  const { data, error } = await supabase.from('controledictees')
    .select('id, titel, woorden, open, aangemaakt_op, bewaren_tot, sjabloon_id')
    .eq('klas_id', klasId).order('aangemaakt_op', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function maakDictee(klasId, sjabloon) {
  const { data, error } = await supabase.from('controledictees')
    .insert({ klas_id: klasId, sjabloon_id: sjabloon.id, titel: sjabloon.titel, woorden: sjabloon.woorden })
    .select('id').single()
  if (error) throw error
  return data.id
}

export async function zetDicteeOpen(id, open) {
  const { error } = await supabase.from('controledictees').update({ open }).eq('id', id)
  if (error) throw error
}

export async function verwijderDictee(id) {
  const { error } = await supabase.from('controledictees').delete().eq('id', id)
  if (error) throw error
}

export async function haalAntwoorden(dicteeId) {
  const { data, error } = await supabase.from('dictee_antwoorden')
    .select('leerling_id, antwoorden, correcties, ingeleverd_op').eq('dictee_id', dicteeId)
  if (error) throw error
  return data ?? []
}

export async function zetCorrecties(dicteeId, leerlingId, correcties) {
  const { error } = await supabase.from('dictee_antwoorden').update({ correcties })
    .eq('dictee_id', dicteeId).eq('leerling_id', leerlingId)
  if (error) throw error
}

// Antwoorden van één leerling weghalen: die mag het dan opnieuw maken.
export async function wisAntwoordenVan(dicteeId, leerlingId) {
  const { error } = await supabase.from('dictee_antwoorden').delete()
    .eq('dictee_id', dicteeId).eq('leerling_id', leerlingId)
  if (error) throw error
}
