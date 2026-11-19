import { useState } from 'react'
import { roepWorkerAan } from '../lib/worker.js'
import { Knop } from '../ui/index.jsx'

// Nieuw wachtwoord voor een leerling. Het veld is gewoon leesbaar (geen
// bolletjes): de leerkracht moet zien wat ze typt, want ze geeft het daarna
// door aan het kind. Opgeslagen wordt het alleen versleuteld, in Supabase Auth.
export default function WachtwoordWijzigen({ leerlingId, naam, open: beginOpen = false, onSluit = null }) {
  const [open, setOpen] = useState(beginOpen)
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState('')
  const [succes, setSucces] = useState('')
  const [bezig, setBezig] = useState(false)

  const sluit = () => { setOpen(false); setWachtwoord(''); setFout(''); onSluit?.() }

  const submit = async (e) => {
    e.preventDefault()
    setFout(''); setSucces('')
    const nieuw = wachtwoord.trim()
    if (nieuw.length < 6) { setFout('Kies een wachtwoord van minstens 6 tekens.'); return }
    setBezig(true)
    try {
      await roepWorkerAan('wachtwoord-reset', { gebruikerId: leerlingId, nieuwWachtwoord: nieuw })
      setSucces(`Gelukt. ${naam ?? 'De leerling'} logt vanaf nu in met het nieuwe wachtwoord.`)
      setWachtwoord('')
    } catch (err) {
      setFout(err.message || 'Wijzigen mislukt')
    } finally {
      setBezig(false)
    }
  }

  if (!open) {
    return <Knop variant="secundair" maat="sm" onClick={() => { setOpen(true); setSucces('') }}>Wachtwoord wijzigen</Knop>
  }

  return (
    <form className="portaal-form kk-m-0" onSubmit={submit} noValidate>
      <label>Nieuw wachtwoord{naam ? ` voor ${naam}` : ''}
        <input
          type="text" value={wachtwoord} onChange={e => { setWachtwoord(e.target.value); setFout('') }}
          autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
          placeholder="minstens 6 tekens"
        />
      </label>
      {fout && <p className="portaal-fout">{fout}</p>}
      {succes && <p className="portaal-succes">{succes}</p>}
      <div className="kk-rij">
        <Knop type="submit" variant="primair" maat="sm" disabled={bezig}>{bezig ? 'Bezig…' : 'Opslaan'}</Knop>
        <Knop type="button" variant="secundair" maat="sm" onClick={sluit}>Sluiten</Knop>
      </div>
    </form>
  )
}
