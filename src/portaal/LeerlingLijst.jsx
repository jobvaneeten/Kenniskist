import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Knop } from '../ui/index.jsx'
import LeerlingVerwijderen from './LeerlingVerwijderen.jsx'

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
      <Knop variant="secundair" maat="sm" disabled={!doelKlasId || bezig} onClick={verplaats}>
        Verplaatsen
      </Knop>
      {melding && <span className="portaal-fout">{melding}</span>}
    </div>
  )
}

// Alleen de namen. Dit scherm is een keuzelijst, geen rapport: je klikt een
// kind aan en ziet dáár alles. Eerder stond hier een tabel met scores, maar
// dan zit je al te lezen voordat je gekozen hebt wie je zoekt.
//
// Verplaatsen en verwijderen zitten achter een schakelaar, zodat de vinkjes
// de lijst niet onnodig vol maken.
export default function LeerlingLijst({ klas, alleKlassen, leerlingen, onKiesLeerling, onGewijzigd }) {
  const [modus, setModus] = useState(null)   // null | 'verplaatsen' | 'verwijderen'
  const [geselecteerd, setGeselecteerd] = useState(new Set())
  const [bevestig, setBevestig] = useState(false)

  const kanVerplaatsen = alleKlassen.length > 1

  const toggel = (id) => setGeselecteerd(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const zetModus = (m) => { setModus(huidig => huidig === m ? null : m); setGeselecteerd(new Set()); setBevestig(false) }
  const alles = geselecteerd.size === leerlingen.length

  return (
    <div className="portaal-kaart">
      <div className="portaal-sectiekop">
        <h2>{leerlingen.length} leerlingen</h2>
        <div className="kk-rij">
          {kanVerplaatsen && modus !== 'verwijderen' && (
            <button className="portaal-terug" style={{ padding: 0 }} onClick={() => zetModus('verplaatsen')}>
              {modus === 'verplaatsen' ? 'klaar met verplaatsen' : 'leerlingen verplaatsen'}
            </button>
          )}
          {modus !== 'verplaatsen' && (
            <button className="portaal-terug" style={{ padding: 0 }} onClick={() => zetModus('verwijderen')}>
              {modus === 'verwijderen' ? 'klaar met verwijderen' : 'leerlingen verwijderen'}
            </button>
          )}
        </div>
      </div>

      {modus && (
        <label className="portaal-zacht" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '0 0 8px' }}>
          <input type="checkbox" checked={alles} onChange={() => setGeselecteerd(alles ? new Set() : new Set(leerlingen.map(l => l.id)))} />
          Alles selecteren
        </label>
      )}

      <div className="portaal-naamlijst">
        {leerlingen.map(l => (
          <div key={l.id} className="portaal-naamrij">
            {modus && (
              <input type="checkbox" aria-label={`${l.weergavenaam} selecteren`} checked={geselecteerd.has(l.id)} onChange={() => { toggel(l.id); setBevestig(false) }} />
            )}
            <button className="portaal-naamknop" onClick={() => modus ? toggel(l.id) : onKiesLeerling(l.id)}>
              <span className="portaal-naamknop-naam">{l.weergavenaam}</span>
              <span className="portaal-zacht">{l.gebruikersnaam}</span>
            </button>
          </div>
        ))}
      </div>

      {modus === 'verplaatsen' && geselecteerd.size > 0 && (
        <Verplaatsen
          klas={klas} alleKlassen={alleKlassen} geselecteerd={geselecteerd}
          onKlaar={() => { setGeselecteerd(new Set()); onGewijzigd() }}
        />
      )}

      {modus === 'verwijderen' && geselecteerd.size > 0 && !bevestig && (
        <div className="portaal-actiebalk">
          <span>{geselecteerd.size} geselecteerd</span>
          <Knop variant="gevaar" maat="sm" onClick={() => setBevestig(true)}>Verwijderen</Knop>
        </div>
      )}

      {modus === 'verwijderen' && bevestig && (
        <LeerlingVerwijderen
          leerlingen={leerlingen.filter(l => geselecteerd.has(l.id))}
          onAnnuleer={() => setBevestig(false)}
          onVerwijderd={(allesGelukt) => { if (allesGelukt) { setGeselecteerd(new Set()); setBevestig(false); setModus(null) } onGewijzigd() }}
        />
      )}
    </div>
  )
}
