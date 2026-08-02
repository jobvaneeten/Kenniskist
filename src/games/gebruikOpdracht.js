import { useCallback, useState } from 'react'

// Gedeelde teller/rapportage-hook voor tools die vanuit een weektaak-opdracht
// óf vrij draaien (zie src/games/toolRender.jsx).
//
// Elke `registreer` wordt DIRECT gerapporteerd als een eigen rijtje (score 0
// of 1, max_score 1) — niet pas gebundeld bij de laatste opgave. Zo gaat er
// niets verloren als de leerling halverwege stopt: de weektaak_voortgang-view
// (migratie 0007) telt toch gewoon alle losse resultaten-rijen voor deze
// opdracht bij elkaar op tot `som_max`/`som_score`.
//
// `aantal == null` is vrij oefenen: dat rapporteert nu ook, maar krijgt geen
// opdracht_id mee (slaResultaatOp vult die alleen bij een lopende weektaak).
// Het portaal filtert daarop, zodat losse oefenrondes het klasoverzicht niet
// dichtslibben maar wél terug te zien zijn.
export function useGebruikOpdracht({ toolId, aantal }) {
  const [gedaan, setGedaan] = useState(0)
  const [goed, setGoed] = useState(0)
  const [klaar, setKlaar] = useState(false)
  const [opslaanMislukt, setOpslaanMislukt] = useState(false)

  const registreer = useCallback((correct, detail) => {
    if (klaar) return
    const nieuwGedaan = gedaan + 1
    const nieuwGoed = goed + (correct ? 1 : 0)
    setGedaan(nieuwGedaan)
    setGoed(nieuwGoed)
    const opslaan = window.KennisKist?.slaResultaatOp?.(toolId, correct ? 1 : 0, 1, { opgaven: [{ ...detail, goed: correct }] })
    // Niet ingelogd is geen storing maar de gast-modus: dan hoort er ook geen
    // waarschuwing te komen dat het opslaan mislukte.
    opslaan?.then(res => { if (!res?.ok && res?.reden !== 'niet-ingelogd') setOpslaanMislukt(true) })
    if (aantal != null && nieuwGedaan >= aantal) setKlaar(true)
  }, [klaar, gedaan, goed, aantal, toolId])

  return { gedaan, goed, klaar, opslaanMislukt, aantal, registreer }
}
