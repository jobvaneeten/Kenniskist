import { useState } from 'react'
import { roepWorkerAan } from '../lib/worker.js'

export default function LeerlingToevoegen({ klassen, onKlaar }) {
  const [voornaam, setVoornaam] = useState('')
  const [achternaamLetter, setAchternaamLetter] = useState('')
  const [gebruikersnaam, setGebruikersnaam] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [klasId, setKlasId] = useState(klassen[0]?.id ?? '')
  const [fout, setFout] = useState('')
  const [succes, setSucces] = useState('')
  const [bezig, setBezig] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setFout(''); setSucces(''); setBezig(true)
    try {
      const res = await roepWorkerAan('leerling-aanmaken', {
        voornaam, achternaamLetter: achternaamLetter || null,
        gebruikersnaam: gebruikersnaam.trim().toLowerCase(),
        wachtwoord, klasId,
      })
      setSucces(`Aangemaakt — inloggegevens: klas "${res.klasCode}", gebruikersnaam "${res.gebruikersnaam}"`)
      setVoornaam(''); setAchternaamLetter(''); setGebruikersnaam(''); setWachtwoord('')
    } catch (err) {
      setFout(err.message)
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="portaal-kaart">
      <h2>Leerling toevoegen</h2>
      <form className="portaal-form" onSubmit={submit}>
        <label>Voornaam
          <input value={voornaam} onChange={e => setVoornaam(e.target.value)} required />
        </label>
        <label>Eerste letter achternaam
          <input value={achternaamLetter} onChange={e => setAchternaamLetter(e.target.value.slice(0, 1))} maxLength={1} placeholder="bv. V" />
        </label>
        <label>Gebruikersnaam
          <input value={gebruikersnaam} onChange={e => setGebruikersnaam(e.target.value)} required pattern="[a-z0-9]{3,30}" title="3-30 kleine letters of cijfers" />
        </label>
        <label>Wachtwoord
          <input type="password" value={wachtwoord} onChange={e => setWachtwoord(e.target.value)} required minLength={6} />
        </label>
        {klassen.length > 0 ? (
          <label>Klas
            <select value={klasId} onChange={e => setKlasId(e.target.value)} required>
              <option value="" disabled>— kies een klas —</option>
              {klassen.map(k => <option key={k.id} value={k.id}>{k.naam}{k.schooljaar ? ` (${k.schooljaar})` : ''}</option>)}
            </select>
          </label>
        ) : (
          <p className="portaal-fout">Er is nog geen klas — maak eerst een klas aan.</p>
        )}
        {fout && <p className="portaal-fout">{fout}</p>}
        {succes && <p className="portaal-succes">{succes}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="portaal-knop" disabled={bezig || klassen.length === 0}>{bezig ? 'Bezig…' : 'Aanmaken'}</button>
          <button type="button" className="portaal-knop portaal-knop-subtiel" onClick={onKlaar}>Sluiten</button>
        </div>
      </form>
    </div>
  )
}
