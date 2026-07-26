import { useState } from 'react'
import { roepWorkerAan } from '../lib/worker.js'

export default function LeerkrachtToevoegen({ onKlaar }) {
  const [voornaam, setVoornaam] = useState('')
  const [achternaamLetter, setAchternaamLetter] = useState('')
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState('')
  const [succes, setSucces] = useState('')
  const [bezig, setBezig] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setFout(''); setSucces(''); setBezig(true)
    try {
      await roepWorkerAan('leerkracht-aanmaken', {
        voornaam, achternaamLetter: achternaamLetter || null,
        email: email.trim(), wachtwoord,
      })
      setSucces(`Leerkracht "${voornaam}" aangemaakt`)
      setVoornaam(''); setAchternaamLetter(''); setEmail(''); setWachtwoord('')
    } catch (err) {
      setFout(err.message)
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="portaal-kaart">
      <h2>Leerkracht toevoegen</h2>
      <form className="portaal-form" onSubmit={submit}>
        <label>Voornaam
          <input value={voornaam} onChange={e => setVoornaam(e.target.value)} required />
        </label>
        <label>Eerste letter achternaam
          <input value={achternaamLetter} onChange={e => setAchternaamLetter(e.target.value.slice(0, 1))} maxLength={1} placeholder="bv. V" />
        </label>
        <label>E-mailadres
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <label>Wachtwoord
          <input type="password" value={wachtwoord} onChange={e => setWachtwoord(e.target.value)} required minLength={6} />
        </label>
        {fout && <p className="portaal-fout">{fout}</p>}
        {succes && <p className="portaal-succes">{succes}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="portaal-knop" disabled={bezig}>{bezig ? 'Bezig…' : 'Aanmaken'}</button>
          <button type="button" className="portaal-knop portaal-knop-subtiel" onClick={onKlaar}>Sluiten</button>
        </div>
      </form>
    </div>
  )
}
