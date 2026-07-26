// localStorage-spiegel voor game_voortgang. Doel: de 158 bestaande
// localStorage-aanroepen in src/ en public/ blijven ongewijzigd — deze module
// hydrateert vóór de eerste render en synchroniseert schrijfacties op de
// achtergrond, zonder dat een spel ooit weet dat Supabase bestaat.
//
// Opslagformaat: `data` is altijd de ruwe localStorage-string, ongewijzigd.
// Dus "0" en niet 0, "true" en niet true — nooit JSON.parse'n. Anders worden
// "0"/0 en "true"/true ononderscheidbaar op de terugweg en leest het
// spaarpotje NaN.
import { supabase } from './supabase.js'

const SYNC_PREFIXES = ['kk_', 'jj_', 'td_', 'bl_']
const SYNC_LOSSE_SLEUTELS = ['astro_progress', 'glitch_de_linde_v2']
const NIET_SYNCEN = new Set([
  'kk_lootbox_muted', // apparaatvoorkeur, geen voortgang
  'kk_playername',    // het profiel bezit de naam zodra ingelogd
  'kk_actieve_leerling',
  'kk_sessie',         // auth-spiegel voor kenniskist-login.js — geen speldata,
  'kk_profiel_cache',  // en zeker geen tokens die in game_voortgang mogen belanden
])

function moetSyncen(key) {
  if (NIET_SYNCEN.has(key)) return false
  if (SYNC_LOSSE_SLEUTELS.includes(key)) return true
  return SYNC_PREFIXES.some((p) => key.startsWith(p))
}

// Ingeschakeld tijdens hydrateer()/wisSleutels() zodat de patch hieronder die
// eigen schrijfacties niet als "nieuwe voortgang van de speler" opvat.
let interneSchrijfactie = false
function metInterneSchrijfactie(fn) {
  interneSchrijfactie = true
  try { fn() } finally { interneSchrijfactie = false }
}

let vuileSleutels = new Set()
let verwijderdeSleutels = new Set()
let debounceTimer = null
let hardCapTimer = null

function plan(key, verwijderd) {
  if (verwijderd) { vuileSleutels.delete(key); verwijderdeSleutels.add(key) }
  else { verwijderdeSleutels.delete(key); vuileSleutels.add(key) }
  if (!hardCapTimer) hardCapTimer = setTimeout(flush, 10000)
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(flush, 2000)
}

async function flush() {
  clearTimeout(debounceTimer)
  clearTimeout(hardCapTimer)
  hardCapTimer = null
  if (vuileSleutels.size === 0 && verwijderdeSleutels.size === 0) return

  const leerlingId = localStorage.getItem('kk_actieve_leerling')
  const teSchrijven = [...vuileSleutels]
  const teVerwijderen = [...verwijderdeSleutels]
  vuileSleutels = new Set()
  verwijderdeSleutels = new Set()
  if (!leerlingId) return // niet ingelogd: alleen lokaal, niets om te synchroniseren

  try {
    if (teSchrijven.length) {
      await supabase.from('game_voortgang').upsert(
        teSchrijven.map((sleutel) => ({ leerling_id: leerlingId, sleutel, data: localStorage.getItem(sleutel) })),
        { onConflict: 'leerling_id,sleutel' },
      )
    }
    if (teVerwijderen.length) {
      await supabase.from('game_voortgang').delete().eq('leerling_id', leerlingId).in('sleutel', teVerwijderen)
    }
  } catch {
    // volgende schrijfactie plant vanzelf een nieuwe poging; niet blokkerend
  }
}

// visibilitychange/pagehide-pad: fetch(keepalive) i.p.v. sendBeacon, want
// sendBeacon kan geen Authorization-header zetten.
let huidigToken = null
let huidigLeerlingId = null
supabase.auth.onAuthStateChange((_event, session) => {
  huidigToken = session?.access_token ?? null
  huidigLeerlingId = session?.user?.id ?? null
})

function noodFlush() {
  if (vuileSleutels.size === 0 || !huidigToken || !huidigLeerlingId) return
  const rijen = [...vuileSleutels].map((sleutel) => ({
    leerling_id: huidigLeerlingId,
    sleutel,
    data: localStorage.getItem(sleutel),
  }))
  vuileSleutels = new Set()
  fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/game_voortgang?on_conflict=leerling_id,sleutel`, {
    method: 'POST',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${huidigToken}`,
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rijen),
  }).catch(() => {})
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') noodFlush()
  })
  window.addEventListener('pagehide', noodFlush)

  // Schrijfacties vanuit de 18 same-origin HTML-tools (iframes): het
  // storage-event vuurt op elk ander venster dan degene die schreef, dus de
  // shell hoort alle iframe-writes zonder dat de tools zelf iets weten.
  window.addEventListener('storage', (e) => {
    if (!e.key || !moetSyncen(e.key)) return
    plan(e.key, e.newValue === null)
  })

  const origSetItem = Storage.prototype.setItem
  const origRemoveItem = Storage.prototype.removeItem
  Storage.prototype.setItem = function (key, value) {
    origSetItem.call(this, key, value)
    if (this === localStorage && !interneSchrijfactie && moetSyncen(key)) plan(key, false)
  }
  Storage.prototype.removeItem = function (key) {
    origRemoveItem.call(this, key)
    if (this === localStorage && !interneSchrijfactie && moetSyncen(key)) plan(key, true)
  }
}

function wisSleutels() {
  metInterneSchrijfactie(() => {
    for (const key of Object.keys(localStorage)) {
      if (moetSyncen(key)) localStorage.removeItem(key)
    }
    localStorage.removeItem('kk_actieve_leerling')
  })
}

// Uitloggen op een gedeeld apparaat (Chromebook): wist alle gesynchroniseerde
// sleutels zodat het volgende kind niet het spaarpotje van het vorige erft.
export function wisAlles() {
  wisSleutels()
}

export { flush }

// Wordt vóór de eerste render aangeroepen (src/main.jsx). Haalt bestaande
// voortgang op en zet die in localStorage, zodat App.jsx:144-155 (die
// synchroon bij render leest) meteen de juiste waarden ziet.
export async function hydrateer() {
  const { data: { session } } = await supabase.auth.getSession()
  const actieveLeerling = localStorage.getItem('kk_actieve_leerling')

  if (!session) {
    // Sessie weg maar er stond nog een actieve leerling: waarschijnlijk
    // verlopen/gewist zonder uit te loggen. Wissen, maar een apparaat dat
    // nooit ingelogd was (actieveLeerling leeg) houdt zijn gast-voortgang.
    if (actieveLeerling) wisSleutels()
    return
  }

  const uid = session.user.id
  if (actieveLeerling && actieveLeerling !== uid) wisSleutels()

  const { data: rijen, error } = await supabase
    .from('game_voortgang')
    .select('sleutel, data')
    .eq('leerling_id', uid)

  metInterneSchrijfactie(() => {
    if (!error && rijen) {
      for (const rij of rijen) localStorage.setItem(rij.sleutel, rij.data)
    }
    localStorage.setItem('kk_actieve_leerling', uid)
  })
}
