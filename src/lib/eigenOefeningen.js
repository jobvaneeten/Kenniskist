import { supabase } from './supabase.js'

// Eigen oefeningen van de leerkracht (tabel eigen_oefeningen, migratie 0020).
// Leerlingen zien ze bij Speel Game → groep → vak (GameMenu.jsx); de
// leerkracht beheert ze in het portaal (portaal/EigenOefeningen.jsx).

export const EIGEN_VAKKEN = [
  { key: 'taal',       label: 'Taal' },
  { key: 'spelling',   label: 'Spelling' },
  { key: 'rekenen',    label: 'Rekenen' },
  { key: 'begrijpend', label: 'Begrijpend lezen' },
  { key: 'topo',       label: 'Topografie' },
]

const VELDEN = 'id, klas_id, groep, vak, onderwerp, vragen, schudden, spel_na, geld, aangemaakt_op'

export async function haalEigenOefeningen(klasId) {
  if (!klasId) return []
  const { data, error } = await supabase.from('eigen_oefeningen').select(VELDEN)
    .eq('klas_id', klasId).order('aangemaakt_op', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function bewaarEigenOefening(oefening) {
  const rij = {
    klas_id: oefening.klas_id, groep: oefening.groep, vak: oefening.vak,
    onderwerp: oefening.onderwerp.trim(), vragen: oefening.vragen, schudden: oefening.schudden !== false,
    spel_na: oefening.spel_na ?? null, geld: oefening.geld || 0,
  }
  const { error } = oefening.id
    ? await supabase.from('eigen_oefeningen').update(rij).eq('id', oefening.id)
    : await supabase.from('eigen_oefeningen').insert(rij)
  if (error) throw error
}

// Het briefgeld van een eigen oefening krijgt een leerling maar één keer
// (kk_-sleutel, dus het gaat mee met de voortgang naar het account).
const BELOOND = 'kk_eigen_beloond'
export function alBeloond(id) {
  try { return (JSON.parse(localStorage.getItem(BELOOND) || '[]') || []).includes(id) } catch { return false }
}
export function markeerBeloond(id) {
  try {
    const lijst = JSON.parse(localStorage.getItem(BELOOND) || '[]') || []
    if (!lijst.includes(id)) localStorage.setItem(BELOOND, JSON.stringify([...lijst, id]))
  } catch { /* niet op te slaan: dan geen geheugen, wel het geld */ }
}

export async function verwijderEigenOefening(id) {
  const { error } = await supabase.from('eigen_oefeningen').delete().eq('id', id)
  if (error) throw error
}
