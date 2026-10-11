// localStorage-spiegel voor game_voortgang. Doel: de 158 bestaande
// localStorage-aanroepen in src/ en public/ blijven ongewijzigd — deze module
// hydrateert vóór de eerste render en synchroniseert schrijfacties op de
// achtergrond, zonder dat een spel ooit weet dat Supabase bestaat.
//
// Opslagformaat: `data` is altijd de ruwe localStorage-string, ongewijzigd.
// Dus "0" en niet 0, "true" en niet true — nooit JSON.parse'n. Anders worden
// "0"/0 en "true"/true ononderscheidbaar op de terugweg en leest het
// spaarpotje NaN.
//
// Niets mag stilletjes verloren gaan:
// - een sleutel blijft 'vuil' tot Supabase de schrijfactie echt bevestigt;
//   mislukt het (geen wifi), dan volgt een nieuwe poging met oplopende wachttijd
// - de lijst met nog niet opgeslagen sleutels staat ook in localStorage
//   (kk_sync_wachtrij), zodat hij een herlaad of gesloten tab overleeft
// - bij het opstarten wint die lokale, nieuwere voortgang van de server
import { supabase, SUPABASE_URL, SUPABASE_ANON } from './supabase.js'

const SYNC_PREFIXES = ['kk_', 'jj_', 'td_', 'bl_']
const SYNC_LOSSE_SLEUTELS = ['astro_progress', 'glitch_de_linde_v2', 'ds_munten', 'mv_munten']
const WACHTRIJ = 'kk_sync_wachtrij'
const NIET_SYNCEN = new Set([
  'kk_lootbox_muted', // apparaatvoorkeur, geen voortgang
  'kk_playername',    // het profiel bezit de naam zodra ingelogd
  'kk_actieve_leerling',
  'kk_sessie',         // auth-spiegel voor kenniskist-login.js — geen speldata,
  'kk_profiel_cache',  // en zeker geen tokens die in game_voortgang mogen belanden
  'kk_actieve_opdracht', // welke weektaak-opdracht nu loopt — apparaat-lokaal,
                         // hoort niet in game_voortgang (leerkracht mag daar nooit bij)
  WACHTRIJ,            // boekhouding van deze module zelf
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

// Nog niet door Supabase bevestigd. `versie` telt per sleutel op bij elke
// wijziging, zodat een schrijfactie die tijdens het versturen opnieuw
// verandert niet onterecht als 'opgeslagen' wordt afgevinkt.
const vuileSleutels = new Set()
const verwijderdeSleutels = new Set()
const versie = new Map()
let debounceTimer = null
let hardCapTimer = null
let herprobeerTimer = null
let pogingen = 0
let bezig = null

function bewaarWachtrij() {
  const leerling = localStorage.getItem('kk_actieve_leerling')
  metInterneSchrijfactie(() => {
    if (!leerling || (vuileSleutels.size === 0 && verwijderdeSleutels.size === 0)) localStorage.removeItem(WACHTRIJ)
    else localStorage.setItem(WACHTRIJ, JSON.stringify({ leerling, schrijf: [...vuileSleutels], verwijder: [...verwijderdeSleutels] }))
  })
}
function leesWachtrij() {
  try {
    const w = JSON.parse(localStorage.getItem(WACHTRIJ) || 'null')
    return w && Array.isArray(w.schrijf) && Array.isArray(w.verwijder) ? w : null
  } catch { return null }
}

function plan(key, verwijderd) {
  versie.set(key, (versie.get(key) || 0) + 1)
  const doel = verwijderd ? verwijderdeSleutels : vuileSleutels
  const ander = verwijderd ? vuileSleutels : verwijderdeSleutels
  const nieuw = !doel.has(key) || ander.has(key)
  ander.delete(key); doel.add(key)
  if (nieuw) bewaarWachtrij()   // alleen als de lijst verandert: spellen schrijven soms elk frame
  if (!hardCapTimer) hardCapTimer = setTimeout(flush, 10000)
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(flush, 2000)
}

export function heeftOngesyncteWijzigingen() {
  return vuileSleutels.size > 0 || verwijderdeSleutels.size > 0
}

// Stuurt alles wat nog niet opgeslagen is naar Supabase. Geeft true als alles
// is aangekomen (of er niets te doen was), false als het (nog) niet lukte.
export async function flush() {
  clearTimeout(debounceTimer)
  clearTimeout(hardCapTimer)
  hardCapTimer = null
  while (bezig) await bezig
  if (!heeftOngesyncteWijzigingen()) return true

  const leerlingId = localStorage.getItem('kk_actieve_leerling')
  if (!leerlingId) {
    // niet ingelogd (gast): alleen lokaal, niets om te synchroniseren
    vuileSleutels.clear(); verwijderdeSleutels.clear(); bewaarWachtrij()
    return true
  }

  const schrijf = [...vuileSleutels].map((k) => [k, versie.get(k)])
  const verwijder = [...verwijderdeSleutels].map((k) => [k, versie.get(k)])
  const rijen = [], weg = verwijder.map(([k]) => k)
  for (const [k] of schrijf) {
    const data = localStorage.getItem(k)
    if (data === null) weg.push(k)   // intussen weg (bv. localStorage.clear in een iframe)
    else rijen.push({ leerling_id: leerlingId, sleutel: k, data })
  }

  bezig = (async () => {
    try {
      if (rijen.length) {
        const { error } = await supabase.from('game_voortgang').upsert(rijen, { onConflict: 'leerling_id,sleutel' })
        if (error) throw error
      }
      if (weg.length) {
        const { error } = await supabase.from('game_voortgang').delete().eq('leerling_id', leerlingId).in('sleutel', weg)
        if (error) throw error
      }
      for (const [k, v] of schrijf) if (versie.get(k) === v) vuileSleutels.delete(k)
      for (const [k, v] of verwijder) if (versie.get(k) === v) verwijderdeSleutels.delete(k)
      pogingen = 0
      clearTimeout(herprobeerTimer)
      bewaarWachtrij()
      return true
    } catch {
      // Niets weggooien: de sleutels blijven vuil. Opnieuw proberen na 3, 6,
      // 12 … seconden (max. een minuut), of meteen zodra er weer internet is.
      pogingen++
      clearTimeout(herprobeerTimer)
      herprobeerTimer = setTimeout(flush, Math.min(60000, 3000 * 2 ** (pogingen - 1)))
      return false
    }
  })()
  try { return await bezig } finally { bezig = null }
}

// visibilitychange/pagehide-pad: fetch(keepalive) i.p.v. sendBeacon, want
// sendBeacon kan geen Authorization-header zetten. De sleutels blijven vuil
// (en in de wachtrij): komt dit niet aan, dan gaan ze bij de volgende start mee.
let huidigToken = null
let huidigLeerlingId = null
supabase.auth.onAuthStateChange((_event, session) => {
  huidigToken = session?.access_token ?? null
  huidigLeerlingId = session?.user?.id ?? null
})

function noodFlush() {
  if (vuileSleutels.size === 0 || !huidigToken || !huidigLeerlingId) return
  const rijen = [...vuileSleutels]
    .map((sleutel) => ({ leerling_id: huidigLeerlingId, sleutel, data: localStorage.getItem(sleutel) }))
    .filter((r) => r.data !== null)
  if (!rijen.length) return
  fetch(`${SUPABASE_URL}/rest/v1/game_voortgang?on_conflict=leerling_id,sleutel`, {
    method: 'POST',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON,
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
  window.addEventListener('online', () => { if (heeftOngesyncteWijzigingen()) flush() })

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
  vuileSleutels.clear(); verwijderdeSleutels.clear()
  clearTimeout(herprobeerTimer)
  metInterneSchrijfactie(() => {
    for (const key of Object.keys(localStorage)) {
      if (moetSyncen(key)) localStorage.removeItem(key)
    }
    localStorage.removeItem('kk_actieve_leerling')
    localStorage.removeItem(WACHTRIJ)
    // Zit in NIET_SYNCEN, dus overleeft anders dit wissen — op een gedeeld
    // apparaat (Chromebook) zou het volgende kind dan de opdracht van het
    // vorige kind erven.
    localStorage.removeItem('kk_actieve_opdracht')
  })
}

// Uitloggen op een gedeeld apparaat (Chromebook): wist alle gesynchroniseerde
// sleutels zodat het volgende kind niet het spaarpotje van het vorige erft.
export function wisAlles() {
  wisSleutels()
}

// Wordt vóór de eerste render aangeroepen (src/main.jsx). Haalt bestaande
// voortgang op en zet die in localStorage, zodat App.jsx (die synchroon bij
// render leest) meteen de juiste waarden ziet. Sleutels die hier nog op
// opslaan wachten zijn nieuwer dan de server en worden niet overschreven.
// Geeft het aantal sleutels terug dat een andere waarde kreeg.
export async function hydrateer() {
  const { data: { session } } = await supabase.auth.getSession()
  const actieveLeerling = localStorage.getItem('kk_actieve_leerling')

  if (!session) {
    // Sessie weg maar er stond nog een actieve leerling: waarschijnlijk
    // verlopen/gewist zonder uit te loggen. Wissen, maar een apparaat dat
    // nooit ingelogd was (actieveLeerling leeg) houdt zijn gast-voortgang.
    // Wacht er nog voortgang op opslaan, dan blijft die staan: logt hetzelfde
    // kind weer in, dan gaat hij alsnog mee; een ander kind of gastmodus wist
    // hem alsnog (zie hieronder en Root.jsx).
    const w = leesWachtrij()
    if (actieveLeerling && !(w && w.leerling === actieveLeerling)) wisSleutels()
    return 0
  }

  const uid = session.user.id
  if (actieveLeerling && actieveLeerling !== uid) wisSleutels()
  const wachtrij = leesWachtrij()
  const eigen = wachtrij && wachtrij.leerling === uid ? wachtrij : null
  const lokaalNieuwer = new Set(eigen ? [...eigen.schrijf, ...eigen.verwijder] : [])

  const { data: rijen, error } = await supabase
    .from('game_voortgang')
    .select('sleutel, data')
    .eq('leerling_id', uid)

  let gewijzigd = 0
  metInterneSchrijfactie(() => {
    if (!error && rijen) {
      for (const rij of rijen) {
        // ook niet overschrijven wat er sinds het opstarten al veranderd is
        // (als dit antwoord pas binnenkomt terwijl er al gespeeld wordt)
        if (lokaalNieuwer.has(rij.sleutel) || vuileSleutels.has(rij.sleutel) || verwijderdeSleutels.has(rij.sleutel)) continue
        if (localStorage.getItem(rij.sleutel) !== rij.data) { localStorage.setItem(rij.sleutel, rij.data); gewijzigd++ }
      }
    }
    localStorage.setItem('kk_actieve_leerling', uid)
  })

  // wat de vorige keer niet aankwam, alsnog versturen
  if (eigen) {
    eigen.schrijf.forEach((k) => { if (!vuileSleutels.has(k)) plan(k, false) })
    eigen.verwijder.forEach((k) => { if (!verwijderdeSleutels.has(k)) plan(k, true) })
  }
  return gewijzigd
}
