import { VAKKEN, toolLabel, toolVak } from '../lib/tools.js'
import { scoreKlasse, kortMoment } from './resultaatHelpers.js'
import Balk from './Balk.jsx'

// De oefeningen binnen één vak, mét cijfers — dit is het scherm ná de keuze
// van een vak, dus hier mág het een overzicht zijn. Klik = die ene oefening
// voor de hele klas.
export default function OefeningLijst({ vak, samenvatting, onKiesOefening }) {
  const eigen = samenvatting.tools.filter(t => (toolVak(t.toolId) ?? 'overig') === vak)
  const label = VAKKEN.find(v => v.key === vak)?.label ?? 'Overig'

  if (eigen.length === 0) {
    return <div className="portaal-kaart"><p className="portaal-leeg">Er is in deze periode niets geoefend bij {label}.</p></div>
  }

  const opgaven = eigen.reduce((s, t) => s + t.opgaven, 0)
  const goed = eigen.reduce((s, t) => s + t.goed, 0)
  const pct = opgaven > 0 ? Math.round((goed / opgaven) * 100) : null

  return (
    <div className="portaal-kaart">
      <div className="portaal-sectiekop">
        <h2 style={{ margin: 0 }}>{label}</h2>
        <span className="portaal-zacht">
          {eigen.length} {eigen.length === 1 ? 'oefening' : 'oefeningen'} · {opgaven} opgaven ·{' '}
          <span className={scoreKlasse(pct)}>{pct}% goed</span>
        </span>
      </div>
      <div className="portaal-oefenkaarten">
        {eigen.map(t => (
          <button key={t.toolId} className="portaal-oefenkaart" onClick={() => onKiesOefening(t.toolId)}>
            <span className="portaal-oefenkaart-naam">{toolLabel(t.toolId)}</span>
            <span className="portaal-oefenkaart-cijfer">
              <span className={scoreKlasse(t.pct)}>{t.pct}%</span> goed
            </span>
            <Balk pct={t.pct} />
            <span className="portaal-zacht">
              {t.leerlingen.size} leerlingen · {t.opgaven} opgaven · {t.fout} fout
            </span>
            <span className="portaal-zacht">laatst: {kortMoment(t.laatste)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
