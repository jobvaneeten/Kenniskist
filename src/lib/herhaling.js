import { supabase } from './supabase.js'

// Herhaling van behaalde doelen (migratie 0024): 2 weken na het behalen 5
// opgaven, en 4 weken na een geslaagde eerste herhaling nog eens. 4 van de 5
// goed: het doel blijft behaald. Minder: het doel staat weer open.
export const HERHAAL_AANTAL = 5

// Rij uit de view doel_herhaling → wat de schermen nodig hebben.
export function herhalingVan(rij, nu = Date.now()) {
  if (!rij) return null
  const volgende = rij.volgende_op ? new Date(rij.volgende_op) : null
  return {
    nu: !!volgende && volgende.getTime() <= nu,
    volgendeOp: rij.volgende_op ?? null,
    ronde: (rij.rondes_ok ?? 0) + 1,
    vast: !!rij.vast,
    misluktOp: rij.mislukt_op ?? null,
    gehaaldOp: rij.gehaald_op ?? null,
  }
}

export async function startHerhaling(opdrachtId) {
  const { data, error } = await supabase.rpc('herhaling_start', { p_opdracht: opdrachtId })
  if (error) throw error
  return data
}

export async function herhalingStand(id) {
  const { data, error } = await supabase.rpc('herhaling_stand', { p_id: id })
  if (error) throw error
  return data
}

const dagen = (ms) => Math.round(ms / 86400000)

// "2 weken geleden behaald" e.d., voor de kaart van de leerling.
export function geledenTekst(datum, nu = Date.now()) {
  if (!datum) return ''
  const d = dagen(nu - new Date(datum).getTime())
  if (d < 1) return 'vandaag'
  if (d === 1) return 'gisteren'
  if (d < 14) return `${d} dagen geleden`
  return `${Math.round(d / 7)} weken geleden`
}

export const korteDag = (d) => (d ? new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : '')
