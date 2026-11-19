import { useState } from 'react'
import { roepWorkerAan } from '../lib/worker.js'
import { Knop } from '../ui/index.jsx'

// Leerlingen definitief verwijderen. Loopt via de Worker: daar zit de
// service-sleutel die auth-accounts mag opruimen, en die controleert ook dat
// het een leerling uit een klas van deze leerkracht is. Het account verdwijnt
// en al het werk gaat mee (ON DELETE CASCADE), dus er blijft niets achter.
export default function LeerlingVerwijderen({ leerlingen, onVerwijderd, onAnnuleer }) {
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')
  const [klaar, setKlaar] = useState(0)

  const een = leerlingen.length === 1
  const wie = een ? leerlingen[0].weergavenaam : `${leerlingen.length} leerlingen`

  const verwijder = async () => {
    setBezig(true); setFout(''); setKlaar(0)
    const mislukt = []
    for (const l of leerlingen) {
      try { await roepWorkerAan('leerling-verwijderen', { leerlingId: l.id }) }
      catch (err) { mislukt.push(`${l.weergavenaam}: ${err.message || 'mislukt'}`) }
      setKlaar(n => n + 1)
    }
    setBezig(false)
    if (mislukt.length) { setFout(`Niet gelukt bij ${mislukt.join(', ')}`); if (mislukt.length < leerlingen.length) onVerwijderd?.(false) }
    else onVerwijderd?.(true)
  }

  return (
    <div className="portaal-waarschuwing">
      <p className="portaal-zacht kk-m-0">
        <strong>{wie}</strong> verwijderen? {een ? 'Het account verdwijnt' : 'De accounts verdwijnen'} en <strong>al het
        gemaakte werk, de munten en de weektaakvoortgang gaan mee</strong>. Dit kan niet ongedaan gemaakt
        worden. Moet een kind alleen naar een andere klas, gebruik dan “leerlingen verplaatsen”.
      </p>
      {fout && <p className="portaal-fout">{fout}</p>}
      <div className="kk-rij kk-mt-3">
        <Knop variant="gevaar" maat="sm" disabled={bezig} onClick={verwijder}>
          {bezig ? `Bezig… (${klaar} van ${leerlingen.length})` : `Ja, verwijder ${wie}`}
        </Knop>
        <Knop variant="secundair" maat="sm" disabled={bezig} onClick={onAnnuleer}>Annuleren</Knop>
      </div>
    </div>
  )
}
