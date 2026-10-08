import { useState } from 'react'
import WeekOverzicht from '../WeekOverzicht.jsx'

// Tab "Weekoverzicht" van KlasScherm.jsx: kies een leerling en zie precies
// wat hij in "Mijn week" ziet — per week, in vier kolommen.
export default function KlasWeekoverzicht({ leerlingen }) {
  const [gekozen, setGekozen] = useState(null)

  if (gekozen) {
    return (
      <>
        <div className="portaal-kruimels">
          <button onClick={() => setGekozen(null)}>Weekoverzicht</button>
          <span>›</span>
          <strong>{gekozen.weergavenaam}</strong>
        </div>
        <div className="portaal-week">
          <WeekOverzicht key={gekozen.id} leerlingId={gekozen.id} />
        </div>
      </>
    )
  }

  return (
    <div className="portaal-kaart">
      <h2>Weekoverzicht</h2>
      <p className="portaal-zacht kk-mt-0">
        Kies een leerling om te zien wat hij of zij per week heeft gedaan: weektaak, taken, doelen en vrij oefenen.
        Dit is hetzelfde overzicht dat de leerling zelf ziet bij "Mijn week".
      </p>
      {leerlingen === null && <p className="portaal-leeg">Laden…</p>}
      {leerlingen?.length === 0 && <p className="portaal-leeg">Nog geen leerlingen in deze klas.</p>}
      <div className="portaal-grid">
        {leerlingen?.map(l => (
          <button key={l.id} className="portaal-klaskaart" onClick={() => setGekozen(l)}>
            {l.weergavenaam}
            <span>bekijk de week</span>
          </button>
        ))}
      </div>
    </div>
  )
}
