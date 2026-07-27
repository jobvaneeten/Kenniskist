import { useState } from 'react'
import { supabase } from './lib/supabase.js'
import './login.css'

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
      <div className="login-stars" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => (
          <span key={i} className="login-star" style={{
            left: `${(i * 43 + 6) % 100}%`,
            top: `${(i * 61 + 9) % 100}%`,
            animationDelay: `${(i * 0.29) % 4}s`,
            animationDuration: `${3 + (i % 4)}s`,
            '--o': 0.15 + (i % 5) * 0.08,
          }} />
        ))}
      </div>
      <div className="login-kaart">
        <div className="login-logo-ring">
          <img className="login-logo" src="/logo-rond.png" alt="Kenniskist" />
        </div>
        <h1 className="login-titel">Kenniskist</h1>

        {succes ? (
          <>
            <p className="login-subtitel"><span className="login-subtitel-icoon">✅</span>Wachtwoord gewijzigd</p>
            <a className="login-knop" style={{ textAlign: 'center', textDecoration: 'none' }} href="/leerkrachtenportaal">Naar het portaal →</a>
          </>
        ) : (
          <>
            <p className="login-subtitel"><span className="login-subtitel-icoon">🔑</span>Nieuw wachtwoord instellen</p>
            <form onSubmit={submit} className="login-formulier">
              <label className="login-label">
                Nieuw wachtwoord
                <input
                  className="login-input"
                  type="password"
                  value={nieuwWachtwoord}
                  onChange={(e) => setNieuwWachtwoord(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                  autoComplete="new-password"
                />
              </label>
              {fout && <p className="login-fout">⚠️ {fout}</p>}
              <button type="submit" className="login-knop" disabled={bezig}>
                {bezig ? 'Bezig…' : 'Opslaan →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
