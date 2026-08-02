import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { toolLabel } from '../lib/tools.js'
import { scoreKlasse, kortMoment } from './resultaatHelpers.js'
import Balk from './Balk.jsx'
import KlasTabel from './KlasTabel.jsx'

const SORTERINGEN = {
  naam: (a, b) => a.weergavenaam.localeCompare(b.weergavenaam),
  laatst: (a, b) => b.laatste - a.laatste,
  gemaakt: (a, b) => b.opgaven - a.opgaven,
  score: (a, b) => (a.pct ?? 999) - (b.pct ?? 999),
}

function Verplaatsen({ klas, alleKlassen, geselecteerd, onKlaar }) {
  const [doelKlasId, setDoelKlasId] = useState('')
  const [bezig, setBezig] = useState(false)
  const [melding, setMelding] = useState('')

  const verplaats = async () => {
    setBezig(true); setMelding('')
    const { error } = await supabase.from('profielen').update({ klas_id: doelKlasId }).in('id', [...geselecteerd])
    setBezig(false)
    if (error) { setMelding('Verplaatsen mislukt'); return }
    setDoelKlasId('')
    onKlaar()
  }

  return (
    <div className="portaal-actiebalk">
      <span>{geselecteerd.size} geselecteerd</span>
      <select value={doelKlasId} onChange={e => setDoelKlasId(e.target.value)}>
        <option value="">Verplaats naar…</option>
        {alleKlassen.filter(k => k.id !== klas.id).map(k => (
          <option key={k.id} value={k.id}>{k.naam}{k.schooljaar ? ` (${k.schooljaar})` : ''}</option>
        ))}
      </select>
      <button className="portaal-knop portaal-knop-subtiel" disabled={!doelKlasId || bezig} onClick={verplaats}>
        Verplaatsen
      </button>
      {melding && <span className="portaal-fout">{melding}</span>}
    </div>
  )
}

// Alle leerlingen, standaard als leesbare lijst: één regel per kind met de
// dingen waarop je sorteert (wanneer, hoeveel, hoe goed) en waar het misgaat.
// Het volledige raster leerling × oefening staat achter de schakelaar — dat is
// compleet, maar bij twaalf kinderen en acht oefeningen niet iets waar je een
// klas mee opent.
export default function LeerlingLijst({ klas, alleKlassen, samenvatting, onKiesLeerling, onKiesOefening, onGewijzigd }) {
  const [sortering, setSortering] = useState('naam')
  const [weergave, setWeergave] = useState('lijst')
  const [geselecteerd, setGeselecteerd] = useState(new Set())

  const rijen = [...samenvatting.lijst].sort(SORTERINGEN[sortering])
  const kanVerplaatsen = alleKlassen.length > 1

  const toggel = (id) => setGeselecteerd(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const kop = (key, label) => (
    <th>
      <button className={sortering === key ? 'portaal-sorteer actief' : 'portaal-sorteer'} onClick={() => setSortering(key)}>
        {label}{sortering === key ? ' ▾' : ''}
      </button>
    </th>
  )

  return (
    <div className="portaal-kaart">
      <div className="portaal-sectiekop">
        <h2>{rijen.length} leerlingen</h2>
        <div className="portaal-schakel">
          <button className={weergave === 'lijst' ? 'actief' : ''} onClick={() => setWeergave('lijst')}>Lijst</button>
          <button className={weergave === 'raster' ? 'actief' : ''} onClick={() => setWeergave('raster')}>Raster per oefening</button>
        </div>
      </div>

      {weergave === 'raster'
        ? <KlasTabel samenvatting={samenvatting} onKiesLeerling={onKiesLeerling} onKiesOefening={onKiesOefening} />
        : (
          <div className="portaal-tabel-scroll">
            <table className="portaal-tabel">
              <thead>
                <tr>
                  {kanVerplaatsen && <th></th>}
                  {kop('naam', 'Leerling')}
                  {kop('laatst', 'Laatst actief')}
                  {kop('gemaakt', 'Gemaakt')}
                  {kop('score', 'Goed')}
                  <th>Waar het misgaat</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rijen.map(l => (
                  <tr key={l.id}>
                    {kanVerplaatsen && (
                      <td><input type="checkbox" checked={geselecteerd.has(l.id)} onChange={() => toggel(l.id)} /></td>
                    )}
                    <td>
                      <button className="portaal-leerlingnaam" onClick={() => onKiesLeerling(l.id)}>{l.weergavenaam}</button>
                      <br /><span className="portaal-zacht">{l.gebruikersnaam}</span>
                    </td>
                    <td>{l.laatste ? kortMoment(l.laatste) : <span className="portaal-score-slecht">niets</span>}</td>
                    <td>{l.opgaven || '—'}</td>
                    <td>
                      {l.pct === null ? '—' : (
                        <span className="portaal-scorecel">
                          <Balk pct={l.pct} />
                          <span className={scoreKlasse(l.pct)}>{l.pct}%</span>
                        </span>
                      )}
                    </td>
                    <td>
                      {l.zwakstePunt
                        ? <>{toolLabel(l.zwakstePunt.toolId)} <span className={scoreKlasse(l.zwakstePunt.pct)}>{l.zwakstePunt.pct}%</span></>
                        : <span className="portaal-zacht">{l.opgaven ? 'niets opvallends' : '—'}</span>}
                    </td>
                    <td>
                      <button className="portaal-terug" style={{ padding: 0 }} onClick={() => onKiesLeerling(l.id)}>
                        {l.fout > 0 ? `${l.fout} fout →` : 'bekijk →'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {kanVerplaatsen && geselecteerd.size > 0 && (
        <Verplaatsen
          klas={klas} alleKlassen={alleKlassen} geselecteerd={geselecteerd}
          onKlaar={() => { setGeselecteerd(new Set()); onGewijzigd() }}
        />
      )}
    </div>
  )
}
