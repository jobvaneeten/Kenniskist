import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Na hoeveel goede antwoorden krijgen de leerlingen van deze klas een
// spelletje? Geldt voor alle oefeningen (ook dictee en begrijpend lezen).
// Opslaan loopt via zet_spel_na (migratie 0019): klassen zelf aanpassen mag
// alleen de icter, deze ene instelling hoort bij de leerkracht.
const KEUZES = [
  { waarde: '', tekst: 'Zoals de oefening het doet (meestal na 5 of 10)' },
  { waarde: '3', tekst: 'Na 3 goede antwoorden' },
  { waarde: '5', tekst: 'Na 5 goede antwoorden' },
  { waarde: '10', tekst: 'Na 10 goede antwoorden' },
  { waarde: '15', tekst: 'Na 15 goede antwoorden' },
  { waarde: '20', tekst: 'Na 20 goede antwoorden' },
  { waarde: '0', tekst: 'Geen spelletjes' },
]

export default function SpelInstelling({ klasId, spelNa, onOpgeslagen }) {
  const [waarde, setWaarde] = useState(spelNa == null ? '' : String(spelNa))
  const [status, setStatus] = useState('')

  const kies = async (nieuw) => {
    const oud = waarde
    setWaarde(nieuw); setStatus('bezig')
    const { error } = await supabase.rpc('zet_spel_na', { p_klas: klasId, p_aantal: nieuw === '' ? null : Number(nieuw) })
    if (error) { setWaarde(oud); setStatus('fout'); return }
    setStatus('ok')
    onOpgeslagen?.(nieuw === '' ? null : Number(nieuw))
  }

  return (
    <div className="portaal-kaart">
      <h2>Spelletjes</h2>
      <p className="portaal-zacht">
        Bij het oefenen krijgen leerlingen na een aantal goede antwoorden een spelletje als beloning.
        Kies hoe vaak dat is voor deze klas.
      </p>
      <label className="portaal-veld kk-mt-3" style={{ maxWidth: 360 }}>
        <span className="portaal-veld-label">Spelletje</span>
        <select value={waarde} disabled={status === 'bezig'} onChange={e => kies(e.target.value)}>
          {KEUZES.map(k => <option key={k.waarde} value={k.waarde}>{k.tekst}</option>)}
        </select>
        <span className="portaal-veld-hint">Leerlingen zien de nieuwe instelling als ze opnieuw inloggen of de pagina herladen.</span>
      </label>
      {status === 'ok' && <p className="portaal-succes">Opgeslagen</p>}
      {status === 'fout' && <p className="portaal-fout">Opslaan mislukt — probeer het nog eens.</p>}
    </div>
  )
}
