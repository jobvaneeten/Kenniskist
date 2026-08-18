import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

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

// Alleen de namen. Dit scherm is een keuzelijst, geen rapport: je klikt een
// kind aan en ziet dáár alles. Eerder stond hier een tabel met scores, maar
// dan zit je al te lezen voordat je gekozen hebt wie je zoekt.
//
// Verplaatsen naar een andere klas zit achter een schakelaar, zodat de
// vinkjes de lijst niet onnodig vol maken.
export default function LeerlingLijst({ klas, alleKlassen, samenvatting, onKiesLeerling, onGewijzigd }) {
  const [verplaatsModus, setVerplaatsModus] = useState(false)
  const [geselecteerd, setGeselecteerd] = useState(new Set())

  const leerlingen = [...samenvatting.lijst].sort((a, b) => a.weergavenaam.localeCompare(b.weergavenaam))
  const kanVerplaatsen = alleKlassen.length > 1

  const toggel = (id) => setGeselecteerd(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <div className="portaal-kaart">
      <div className="portaal-sectiekop">
        <h2>{leerlingen.length} leerlingen</h2>
        {kanVerplaatsen && (
          <button
            className="portaal-terug" style={{ padding: 0 }}
            onClick={() => { setVerplaatsModus(v => !v); setGeselecteerd(new Set()) }}
          >{verplaatsModus ? 'klaar met verplaatsen' : 'leerlingen verplaatsen'}</button>
        )}
      </div>

      <div className="portaal-naamlijst">
        {leerlingen.map(l => (
          <div key={l.id} className="portaal-naamrij">
            {verplaatsModus && (
              <input type="checkbox" checked={geselecteerd.has(l.id)} onChange={() => toggel(l.id)} />
            )}
            <button className="portaal-naamknop" onClick={() => onKiesLeerling(l.id)}>
              <span className="portaal-naamknop-naam">{l.weergavenaam}</span>
              <span className="portaal-zacht">{l.gebruikersnaam}</span>
            </button>
          </div>
        ))}
      </div>

      {verplaatsModus && geselecteerd.size > 0 && (
        <Verplaatsen
          klas={klas} alleKlassen={alleKlassen} geselecteerd={geselecteerd}
          onKlaar={() => { setGeselecteerd(new Set()); onGewijzigd() }}
        />
      )}
    </div>
  )
}
