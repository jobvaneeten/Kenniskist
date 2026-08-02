import { VAKKEN, toolLabel, toolVak } from '../lib/tools.js'
import { scoreKlasse, kortMoment } from './resultaatHelpers.js'
import Balk from './Balk.jsx'

// Wat is er in deze periode geoefend, gebundeld per vak. Antwoord op "hoe
// staat de klas ervoor bij spelling" zonder eerst door een raster te hoeven
// lezen. Klik = die ene oefening voor de hele klas.
export default function OefeningLijst({ samenvatting, onKiesOefening }) {
  const { tools } = samenvatting

  if (tools.length === 0) {
    return <div className="portaal-kaart"><p className="portaal-leeg">Er is in deze periode niet geoefend.</p></div>
  }

  const perVak = [...VAKKEN, { key: null, label: 'Overig' }]
    .map(v => ({ ...v, tools: tools.filter(t => (toolVak(t.toolId) ?? null) === v.key) }))
    .filter(v => v.tools.length > 0)

  return (
    <>
      {perVak.map(vak => (
        <div className="portaal-kaart" key={vak.key ?? 'overig'}>
          <h2>{vak.label}</h2>
          <div className="portaal-oefenkaarten">
            {vak.tools.map(t => (
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
      ))}
    </>
  )
}
