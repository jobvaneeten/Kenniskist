import { useState } from 'react'
import { supabase } from './lib/supabase.js'
import './login.css'
import { Knop, Feedback, Icoon } from './ui/index.jsx'

// Landingsplek voor de link uit de reset-e-mail (zie sessie.jsx:
// wachtwoordVergeten → redirectTo). Supabase-js herkent het herstel-token in
// de URL automatisch en zet een tijdelijke sessie, waarmee updateUser hier
// zonder wachtwoord het nieuwe wachtwoord mag zetten.
export default function WachtwoordResetten() {
  const [nieuwWachtwoord, setNieuwWachtwoord] = useState('')
  const [fout, setFout] = useState('')
  const [succes, setSucces] = useState(false)
  const [bezig, setBezig] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setFout(''); setBezig(true)
    const { error } = await supabase.auth.updateUser({ password: nieuwWachtwoord })
    setBezig(false)
    if (error) { setFout('Kon het wachtwoord niet wijzigen — vraag een nieuwe link aan en probeer opnieuw.'); return }
    setSucces(true)
  }

  return (
    <div className="login-scherm">
      <div className="login-kaart">
        <div className="login-logo-ring">
          <img className="login-logo" src="/logo-rond.png" alt="Kenniskist" />
        </div>
        <h1 className="login-titel">Kenniskist</h1>

        {succes ? (
          <>
            <p className="login-subtitel"><Icoon naam="goed" />Wachtwoord gewijzigd</p>
            <a className="kk-knop kk-knop--primair kk-knop--breed" style={{ textDecoration: 'none' }} href="/leerkrachtenportaal">Naar het portaal <Icoon naam="verder" /></a>
          </>
        ) : (
          <>
            <p className="login-subtitel"><Icoon naam="slot" />Nieuw wachtwoord instellen</p>
            <form onSubmit={submit} className="login-formulier">
              <label className="login-label">
                Nieuw wachtwoord
                <input
                  className="kk-invoer"
                  type="password"
                  value={nieuwWachtwoord}
                  onChange={(e) => setNieuwWachtwoord(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                  autoComplete="new-password"
                />
              </label>
              {fout && <div className="login-fout"><Feedback soort="fout">{fout}</Feedback></div>}
              <Knop type="submit" variant="primair" breed disabled={bezig}>
                {bezig ? 'Bezig…' : 'Opslaan'}
              </Knop>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
