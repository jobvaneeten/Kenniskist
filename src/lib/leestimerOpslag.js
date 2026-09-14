// Opslag van een lopende leesbeurt (zie games/LeesTimer.jsx). Apart bestand
// omdat ook het weektaakscherm de stand leest: daar moet op de kaart staan
// hoeveel minuten er nog te lezen zijn als het kind tussendoor wat anders doet.
//
// De stand rekent met échte kloktijd, niet met tikken: { gebankt, startOp }.
// Loopt de timer, dan staat startOp op het moment van starten en telt de tijd
// dus gewoon door als de iPad in slaapstand gaat of het tabblad wordt gesloten.
// Pauzeren (of het scherm verlaten) zet de verstreken tijd bij in `gebankt` en
// startOp op null.
const VERVALT_NA_MS = 24 * 60 * 60 * 1000
const STANDAARD_MINUTEN = 15

export function doelMinuten(config) {
  return Math.max(1, Math.min(60, parseInt(config?.minuten, 10) || STANDAARD_MINUTEN))
}

export const leesSleutel = (opdrachtId) => `kk_leestimer_${opdrachtId ?? 'vrij'}`

const LEEG = { gebankt: 0, startOp: null }

export function leesStand(opdrachtId, doelSeconden) {
  try {
    const d = JSON.parse(localStorage.getItem(leesSleutel(opdrachtId)) || 'null')
    if (!d || d.doel !== doelSeconden) return LEEG
    if (!d.op || Date.now() - d.op > VERVALT_NA_MS) return LEEG
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
}

export function wisStand(opdrachtId) {
  try { localStorage.removeItem(leesSleutel(opdrachtId)) } catch { /* niets aan te doen */ }
}

// Verstreken seconden op dit moment, afgetopt op het doel.
export function verstreken(stand, doelSeconden) {
  const lopend = stand.startOp ? Math.floor((Date.now() - stand.startOp) / 1000) : 0
  return Math.min(doelSeconden, Math.max(0, stand.gebankt + lopend))
}

// Voor de weektaakkaart: hoeveel hele minuten er nog te lezen zijn, of null
// als er nog niets gelezen is (dan staat er gewoon de normale tekst).
export function resterendeMinuten(opdrachtId, config) {
  const doel = doelMinuten(config) * 60
  const gedaan = verstreken(leesStand(opdrachtId, doel), doel)
  return gedaan > 0 ? Math.ceil((doel - gedaan) / 60) : null
}
