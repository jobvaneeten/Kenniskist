import { toolLabel } from '../lib/tools.js'
import { scoreKlasse } from './resultaatHelpers.js'

// Het volledige raster leerling × oefening: per cel het percentage goed en
// hoeveel opgaven eronder liggen. Compleet, maar breed — daarom niet langer
// het startscherm van een klas, maar een weergave binnen "Leerlingen".
// Rekent zelf niets uit: alles komt uit vatKlasSamen (klasGegevens.js).
export default function KlasTabel({ samenvatting, onKiesLeerling, onKiesOefening }) {
  const tools = [...samenvatting.tools].sort((a, b) => toolLabel(a.toolId).localeCompare(toolLabel(b.toolId)))

  if (tools.length === 0) return <p className="portaal-leeg">Er is in deze periode niet geoefend.</p>

  return (
    <div className="portaal-tabel-scroll">
      <table className="portaal-tabel portaal-raster">
        <thead>
          <tr>
            <th>Leerling</th>
            {tools.map(t => (
              <th key={t.toolId}>
                <button className="portaal-kolomkop" onClick={() => onKiesOefening(t.toolId)} title="Bekijk deze oefening voor de hele klas">
                  {toolLabel(t.toolId)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {samenvatting.lijst.map(l => (
            <tr key={l.id}>
              <td>
                <button className="portaal-leerlingnaam" onClick={() => onKiesLeerling(l.id)}>{l.weergavenaam}</button>
              </td>
              {tools.map(t => {
                const cel = l.perTool[t.toolId]
                if (!cel) return <td key={t.toolId} className="portaal-cel-leeg">—</td>
                const pct = cel.opgaven > 0 ? Math.round((cel.goed / cel.opgaven) * 100) : 0
                return (
                  <td key={t.toolId}>
                    <span className={scoreKlasse(pct)}>{pct}%</span>
                    {' '}<span className="portaal-zacht">({cel.opgaven})</span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
