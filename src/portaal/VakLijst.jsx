import { VAKKEN, toolVak } from '../lib/tools.js'

// Alleen de vakken. Net als bij de leerlingen: eerst kiezen, dan pas cijfers.
// Een vak zonder werk in deze periode blijft staan maar is niet klikbaar —
// zo zie je in één oogopslag waar wél iets ligt.
export default function VakLijst({ samenvatting, onKiesVak }) {
  const { tools } = samenvatting

  const rijen = [...VAKKEN, { key: null, label: 'Overig' }]
    .map(v => ({ ...v, aantal: tools.filter(t => (toolVak(t.toolId) ?? null) === v.key).length }))
    .filter(v => v.key !== null || v.aantal > 0)

  return (
    <div className="portaal-kaart">
      <div className="portaal-sectiekop">
        <h2>Kies een vak</h2>
        <span className="portaal-zacht">daarna zie je de oefeningen erbinnen</span>
      </div>
      <div className="portaal-naamlijst">
        {rijen.map(v => (
          <div key={v.key ?? 'overig'} className="portaal-naamrij">
            <button
              className="portaal-naamknop"
              disabled={v.aantal === 0}
              onClick={() => onKiesVak(v.key ?? 'overig')}
            >
              <span className="portaal-naamknop-naam">{v.label}</span>
              <span className="portaal-zacht">
                {v.aantal === 0 ? 'niets geoefend' : `${v.aantal} ${v.aantal === 1 ? 'oefening' : 'oefeningen'}`}
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
