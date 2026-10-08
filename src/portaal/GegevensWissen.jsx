import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Knop } from '../ui/index.jsx'

// Wist het gemaakte werk van één leerling of een hele klas (migratie 0017).
// Weektaken, taken en doelen blijven staan; wat al af of behaald was blijft
// dat ook. Twee stappen, want terughalen kan niet.
export default function GegevensWissen({ leerlingIds, wie, onGewist }) {
  const [open, setOpen] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')
  const [klaar, setKlaar] = useState('')

  const wis = async () => {
    setBezig(true); setFout('')
    const { data, error } = await supabase.rpc('wis_resultaten', { p_leerlingen: leerlingIds })
    setBezig(false)
    if (error) { setFout('Wissen mislukt — probeer het opnieuw.'); return }
    setOpen(false)
    setKlaar(`${data ?? 0} resultaten gewist.`)
    onGewist?.()
  }

  if (!open) {
    return (
      <>
        <Knop variant="secundair" maat="sm" disabled={!leerlingIds.length} onClick={() => { setOpen(true); setKlaar('') }}>
          Gemaakt werk wissen
        </Knop>
        {klaar && <span className="portaal-zacht">{klaar}</span>}
      </>
    )
  }

  return (
    <div className="portaal-waarschuwing" style={{ flexBasis: '100%' }}>
      <p className="portaal-zacht kk-m-0">
        Al het gemaakte werk van <strong>{wie}</strong> wissen? De opgaven, fouten en sessies verdwijnen uit het
        portaal. Weektaken, taken en doelen blijven gewoon klaarstaan, en wat al af of behaald was blijft af of
        behaald. Dit kan niet ongedaan gemaakt worden.
      </p>
      {fout && <p className="portaal-fout">{fout}</p>}
      <div className="kk-rij kk-mt-3">
        <Knop variant="gevaar" maat="sm" disabled={bezig} onClick={wis}>{bezig ? 'Bezig…' : 'Definitief wissen'}</Knop>
        <Knop variant="secundair" maat="sm" onClick={() => setOpen(false)}>Annuleren</Knop>
      </div>
    </div>
  )
}
