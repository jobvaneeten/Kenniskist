import { useMemo, useState } from 'react'
import { toolLabel } from '../lib/tools.js'
import { verzamelFouten, kortMoment } from './resultaatHelpers.js'

// Alle fout gemaakte opgaven op één rij per stuk: wat er gevraagd werd, wat de
// leerling invulde en wat juist was. Geen uitklappen — dit is waar een
// leerkracht begint.
//
// `rijen` zijn resultaten-rijen (met details_json en aangemaakt_op).
export default function FoutenLijst({ rijen, limiet = 40 }) {
  const [oefening, setOefening] = useState('alles')
  const [toonAlles, setToonAlles] = useState(false)

  const fouten = useMemo(() => verzamelFouten(rijen ?? []), [rijen])
  const oefeningen = useMemo(
    () => [...new Set(fouten.map(f => f.toolId))].sort(),
    [fouten],
  )

  const gefilterd = oefening === 'alles' ? fouten : fouten.filter(f => f.toolId === oefening)
  const zichtbaar = toonAlles ? gefilterd : gefilterd.slice(0, limiet)

  if (fouten.length === 0) {
    return (
      <p className="portaal-leeg">
        Geen fouten gevonden in deze periode. Let op: niet elke oefening slaat op
        wélke opgave fout ging — dan zie je hier niets, ook al is er wel geoefend.
      </p>
    )
  }

  return (
    <>
      {oefeningen.length > 1 && (
        <div className="portaal-datumfilter" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={oefening === 'alles' ? 'portaal-datumfilter-knop actief' : 'portaal-datumfilter-knop'}
            onClick={() => setOefening('alles')}
          >Alle oefeningen</button>
          {oefeningen.map(t => (
            <button
              key={t}
              type="button"
              className={oefening === t ? 'portaal-datumfilter-knop actief' : 'portaal-datumfilter-knop'}
              onClick={() => setOefening(t)}
            >{toolLabel(t)}</button>
          ))}
        </div>
      )}

      <table className="portaal-tabel">
        <thead>
          <tr>
            <th>Opgave</th>
            <th>Ingevuld</th>
            <th>Juist</th>
            <th>Oefening</th>
            <th>Wanneer</th>
          </tr>
        </thead>
        <tbody>
          {zichtbaar.map((f, i) => (
            <tr key={i}>
              <td>{f.vraag ?? '—'}</td>
              <td className="portaal-score-slecht">{f.antwoord ?? '—'}</td>
              <td className="portaal-score-goed">{f.juist ?? '—'}</td>
              <td>
                {toolLabel(f.toolId)}
                {f.weektaak && <span title="Gemaakt als weektaak-opdracht"> 📋</span>}
              </td>
              <td>{kortMoment(f.tijd)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {gefilterd.length > zichtbaar.length && (
        <button className="portaal-knop portaal-knop-subtiel" style={{ marginTop: 12 }} onClick={() => setToonAlles(true)}>
          Toon alle {gefilterd.length} fouten
        </button>
      )}
    </>
  )
}
