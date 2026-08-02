import { useMemo } from 'react'
import { toolLabel } from '../lib/tools.js'
import { groepeerFouten, scoreKlasse, kortMoment } from './resultaatHelpers.js'
import Balk from './Balk.jsx'

// Eén oefening voor de hele klas. Draait volledig op de rijen die KlasScherm
// al geladen heeft — geen eigen query en dus ook geen eigen datumfilter dat uit
// de pas kan lopen met de rest van het scherm.
export default function OefeningDetail({ toolId, samenvatting, rijen, onKiesLeerling }) {
  const eigen = useMemo(() => rijen.filter(r => r.tool_id === toolId), [rijen, toolId])
  const fouten = useMemo(() => groepeerFouten(eigen), [eigen])

  const tool = samenvatting.tools.find(t => t.toolId === toolId)
  const deelnemers = samenvatting.lijst
    .map(l => ({ ...l, eigen: l.perTool[toolId] }))
    .filter(l => l.eigen)
    .map(l => ({ ...l, toolPct: Math.round((l.eigen.goed / l.eigen.opgaven) * 100) }))
    .sort((a, b) => a.toolPct - b.toolPct)
  const nietGemaakt = samenvatting.lijst.filter(l => !l.perTool[toolId])

  return (
    <>
      <div className="portaal-kaart">
        <div className="portaal-sectiekop">
          <h2 style={{ margin: 0 }}>{toolLabel(toolId)}</h2>
          {tool && (
            <span className="portaal-zacht">
              {tool.leerlingen.size} leerlingen · {tool.opgaven} opgaven ·{' '}
              <span className={scoreKlasse(tool.pct)}>{tool.pct}% goed</span>
            </span>
          )}
        </div>

        <table className="portaal-tabel">
          <thead>
            <tr><th>Leerling</th><th>Gemaakt</th><th>Fout</th><th>Goed</th><th></th></tr>
          </thead>
          <tbody>
            {deelnemers.map(l => (
              <tr key={l.id}>
                <td>
                  <button className="portaal-leerlingnaam" onClick={() => onKiesLeerling(l.id)}>{l.weergavenaam}</button>
                </td>
                <td>{l.eigen.opgaven}</td>
                <td>{l.eigen.opgaven - l.eigen.goed}</td>
                <td>
                  <span className="portaal-scorecel">
                    <Balk pct={l.toolPct} />
                    <span className={scoreKlasse(l.toolPct)}>{l.toolPct}%</span>
                  </span>
                </td>
                <td>
                  <button className="portaal-terug" style={{ padding: 0 }} onClick={() => onKiesLeerling(l.id)}>bekijk →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {nietGemaakt.length > 0 && (
          <p className="portaal-stil">
            <strong>Niet gemaakt door:</strong>{' '}
            {nietGemaakt.map((l, i) => (
              <span key={l.id}>
                {i > 0 && ', '}
                <button className="portaal-leerlingnaam" onClick={() => onKiesLeerling(l.id)}>{l.weergavenaam}</button>
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="portaal-kaart">
        <h2>Meest gemaakte fouten</h2>
        {fouten.length === 0 && (
          <p className="portaal-leeg">
            Geen losse fouten bekend. Niet elke oefening slaat op wélke opgave fout ging.
          </p>
        )}
        {fouten.length > 0 && (
          <table className="portaal-tabel">
            <thead>
              <tr><th>Opgave</th><th>Juist</th><th>Meest ingevuld</th><th>Leerlingen</th><th>Laatst</th></tr>
            </thead>
            <tbody>
              {fouten.slice(0, 20).map(f => (
                <tr key={f.sleutel}>
                  <td>{f.vraag ?? '—'}</td>
                  <td className="portaal-score-goed">{f.juist ?? '—'}</td>
                  <td className="portaal-score-slecht">{f.vaakstFout ?? '—'}</td>
                  <td><strong>{f.leerlingenAantal}</strong> <span className="portaal-zacht">({f.aantal}×)</span></td>
                  <td>{kortMoment(f.laatste)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
