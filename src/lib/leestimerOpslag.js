import { supabase } from './supabase.js'

// Opslag van een lopende leesbeurt (zie games/LeesTimer.jsx). Apart bestand
// omdat ook het weektaakscherm de stand leest: daar moet op de kaart staan
// hoeveel minuten er nog te lezen zijn als het kind tussendoor wat anders doet.
//
// De stand rekent met échte kloktijd, niet met tikken: { gebankt, startOp }.
// Loopt de timer, dan staat startOp op het moment van starten en telt de tijd
// dus gewoon door als de iPad in slaapstand gaat of het tabblad wordt gesloten.
// Pauzeren (of het scherm verlaten) zet de verstreken tijd bij in `gebankt` en
// startOp op null.
//
// Twee plekken: localStorage (werkt meteen en offline) en, bij een
// weektaak-opdracht, de tabel leesstanden (migratie 0014). Die laatste is
// nodig omdat school-iPads gedeeld worden en een kind de volgende dag vaak op
// een ander apparaat zit. Bij het lezen geldt de stand met de meeste tijd.
const VERVALT_NA_MS = 24 * 60 * 60 * 1000
const STANDAARD_MINUTEN = 15

export function doelMinuten(config) {
  return Math.max(1, Math.min(60, parseInt(config?.minuten, 10) || STANDAARD_MINUTEN))
}

// Per leerling: op een gedeelde iPad mag het volgende kind niet verder lezen
// op de minuten van het vorige.
function leerlingId() {
  try { return JSON.parse(localStorage.getItem('kk_profiel_cache') || 'null')?.id ?? 'gast' } catch { return 'gast' }
}

export const leesSleutel = (opdrachtId) => `kk_leestimer_${leerlingId()}_${opdrachtId ?? 'vrij'}`

const LEEG = { gebankt: 0, startOp: null }

export function leesStand(opdrachtId, doelSeconden) {
  try {
    // Oude sleutel (zonder leerling-id) nog één keer meenemen.
    const d = JSON.parse(localStorage.getItem(leesSleutel(opdrachtId))
      || (opdrachtId && localStorage.getItem(`kk_leestimer_${opdrachtId}`)) || 'null')
    if (!d || d.doel !== doelSeconden) return LEEG
    // Bij een weektaak-opdracht bewaakt de database de stand; vervallen na een
    // dag is alleen voor vrij lezen.
    if (!d.op || (!opdrachtId && Date.now() - d.op > VERVALT_NA_MS)) return LEEG
    return {
      gebankt: Math.min(doelSeconden, Math.max(0, d.gebankt | 0)),
      startOp: d.startOp || null,
    }
  } catch { return LEEG }
}

export function schrijfStand(opdrachtId, doelSeconden, stand) {
  try {
    localStorage.setItem(leesSleutel(opdrachtId), JSON.stringify({
      gebankt: stand.gebankt, startOp: stand.startOp, doel: doelSeconden, op: Date.now(),
    }))
  } catch { /* vol of privémodus */ }
  bewaarServerStand(opdrachtId, stand)
}

export function wisStand(opdrachtId) {
  try {
    localStorage.removeItem(leesSleutel(opdrachtId))
    if (opdrachtId) localStorage.removeItem(`kk_leestimer_${opdrachtId}`)
  } catch { /* niets aan te doen */ }
  wisServerStand(opdrachtId)
}

// Verstreken seconden op dit moment, afgetopt op het doel.
export function verstreken(stand, doelSeconden) {
  const lopend = stand.startOp ? Math.floor((Date.now() - stand.startOp) / 1000) : 0
  return Math.min(doelSeconden, Math.max(0, stand.gebankt + lopend))
}

// De stand met de meeste gelezen tijd; bij gelijkspel de lopende.
export function besteStand(a, b, doelSeconden) {
  if (!b) return a
  const va = verstreken(a, doelSeconden), vb = verstreken(b, doelSeconden)
  if (vb > va || (vb === va && b.startOp && !a.startOp)) return b
  return a
}

// ── Database ──────────────────────────────────────────────────────────────
// Niet-ingelogd of vrij lezen: dan is er geen opdracht en blijft alles lokaal.
// Fouten zijn stil: localStorage is er dan nog, en de volgende schrijfactie
// (starten, pauzeren, scherm weg) probeert het opnieuw.

export const vanServer = (rij) => rij && {
  gebankt: Math.max(0, rij.gebankt | 0),
  startOp: rij.start_op ? new Date(rij.start_op).getTime() : null,
}

export async function haalServerStand(opdrachtId) {
  if (!opdrachtId || leerlingId() === 'gast') return null
  try {
    const { data } = await supabase.from('leesstanden').select('gebankt, start_op')
      .eq('opdracht_id', opdrachtId).eq('leerling_id', leerlingId()).maybeSingle()
    return vanServer(data)
  } catch { return null }
}

export function bewaarServerStand(opdrachtId, stand) {
  const id = leerlingId()
  if (!opdrachtId || id === 'gast') return Promise.resolve()
  return supabase.from('leesstanden').upsert({
    leerling_id: id,
    opdracht_id: opdrachtId,
    gebankt: stand.gebankt,
    start_op: stand.startOp ? new Date(stand.startOp).toISOString() : null,
    bijgewerkt_op: new Date().toISOString(),
  }).then(() => {}, () => {})
}

function wisServerStand(opdrachtId) {
  const id = leerlingId()
  if (!opdrachtId || id === 'gast') return
  supabase.from('leesstanden').delete().eq('opdracht_id', opdrachtId).eq('leerling_id', id).then(() => {}, () => {})
}

// Voor de weektaakkaart: hoeveel hele minuten er nog te lezen zijn, of null
// als er nog niets gelezen is (dan staat er gewoon de normale tekst).
// serverStand komt mee uit haalMijnWeektaak, zodat dit ook klopt als er op
// een andere iPad gelezen is.
export function resterendeMinuten(opdrachtId, config, serverStand) {
  const doel = doelMinuten(config) * 60
  const gedaan = verstreken(besteStand(leesStand(opdrachtId, doel), serverStand, doel), doel)
  return gedaan > 0 ? Math.ceil((doel - gedaan) / 60) : null
}
