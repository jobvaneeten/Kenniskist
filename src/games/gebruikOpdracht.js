import { useCallback, useState } from 'react'

// Gedeelde teller/rapportage-hook voor tools die vanuit een weektaak-
// opdracht draaien (zie src/games/toolRender.jsx). `aantal == null` betekent
// vrij oefenen: telt alleen voor de UI, rapporteert nooit — dat houdt vrij
// oefenen exact zoals het nu is, en voorkomt dat VakOverzicht/KlasTabel
// vollopen met losse oefenrondes.
//
// `aantal > 0`: elke `registreer` wordt DIRECT gerapporteerd als een eigen
// rijtje (score 0 of 1, max_score 1) — niet pas gebundeld bij de laatste
// opgave. Zo gaat er niets verloren als de leerling halverwege stopt: de
// weektaak_voortgang-view (migratie 0007) telt toch gewoon alle losse
// resultaten-rijen voor deze opdracht bij elkaar op tot `som_max`/`som_score`,
// dus dit is puur een wijziging in wannéér we schrijven, niet in het schema.
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
    if (aantal != null) {
      const opslaan = window.KennisKist?.slaResultaatOp?.(toolId, correct ? 1 : 0, 1, { opgaven: [{ ...detail, goed: correct }] })
      opslaan?.then(res => { if (!res?.ok) setOpslaanMislukt(true) })
      if (nieuwGedaan >= aantal) setKlaar(true)
    }
  }, [klaar, gedaan, goed, aantal, toolId])

  return { gedaan, goed, klaar, opslaanMislukt, aantal, registreer }
}
