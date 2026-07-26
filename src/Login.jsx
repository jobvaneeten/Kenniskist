import { useState } from 'react'
import { useSessie } from './lib/sessie.jsx'
import './login.css'

// soort ligt vast aan het portaal waar je vandaan komt (/leerlingportaal of
// /leerkrachtenportaal) — geen tabje om te wisselen, dus je logt hier alleen
// in als wat je al gekozen hebt.
export default function Login({ soort, onBack, onGast }) {
  const { inloggenLeerling, inloggenLeerkracht, wachtwoordVergeten } = useSessie()
  const [modus, setModus] = useState('inloggen') // 'inloggen' | 'vergeten' | 'verzonden' (alleen leerkracht)
  const [klascode, setKlascode] = useState('')
  const [gebruikersnaam, setGebruikersnaam] = useState('')
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [foutmelding, setFoutmelding] = useState('')
  const [bezig, setBezig] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setFoutmelding('')
    setBezig(true)
    const error = soort === 'leerling'
      ? await inloggenLeerling(klascode, gebruikersnaam, wachtwoord)
      : await inloggenLeerkracht(email, wachtwoord)
    if (error) {
      setBezig(false)
      setFoutmelding(soort === 'leerling'
        ? 'De klascode, gebruikersnaam of het wachtwoord klopt niet.'
        : 'Dit e-mailadres of wachtwoord klopt niet.')
    }
    // bij succes herlaadt de pagina zelf (zie sessie.jsx), dus bezig blijft aan
  }

  const verstuurResetlink = async (e) => {
    e.preventDefault()
    setFoutmelding('')
    setBezig(true)
    const error = await wachtwoordVergeten(email)
    setBezig(false)
    if (error) { setFoutmelding('Kon geen resetlink versturen — probeer het later opnieuw.'); return }
    setModus('verzonden')
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
        {onBack && <button type="button" className="login-terug" onClick={onBack}>← Terug</button>}

        <div className="login-logo-ring">
          <img className="login-logo" src="/logo-rond.png" alt="Kenniskist" />
        </div>
        <h1 className="login-titel">Kenniskist</h1>

        {modus === 'verzonden' ? (
          <>
            <p className="login-subtitel"><span className="login-subtitel-icoon">📬</span>Check je e-mail</p>
            <p className="login-hint">
              Als <strong>{email}</strong> bij een leerkrachtaccount hoort, staat er een linkje in je inbox om een nieuw wachtwoord te kiezen.
            </p>
            <button type="button" className="login-terug" style={{ alignSelf: 'center', paddingTop: 18 }} onClick={() => setModus('inloggen')}>← Terug naar inloggen</button>
          </>
        ) : modus === 'vergeten' ? (
          <>
            <p className="login-subtitel"><span className="login-subtitel-icoon">🔑</span>Wachtwoord vergeten</p>
            <form onSubmit={verstuurResetlink} className="login-formulier">
              <label className="login-label">
                E-mailadres
                <input
                  className="login-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                  autoFocus
                />
              </label>
              {foutmelding && <p className="login-fout">⚠️ {foutmelding}</p>}
              <button type="submit" className="login-knop" disabled={bezig}>
                {bezig ? 'Bezig…' : 'Stuur resetlink →'}
              </button>
            </form>
            <button type="button" className="login-terug" style={{ alignSelf: 'center', paddingTop: 14 }} onClick={() => { setModus('inloggen'); setFoutmelding('') }}>← Terug naar inloggen</button>
          </>
        ) : (
          <>
            <p className="login-subtitel">
              <span className="login-subtitel-icoon">{soort === 'leerling' ? '🎒' : '🧑‍🏫'}</span>
              {soort === 'leerling' ? 'Inloggen als leerling' : 'Inloggen als leerkracht'}
            </p>

            <form onSubmit={submit} className="login-formulier">
              {soort === 'leerling' ? (
                <>
                  <label className="login-label">
                    Klascode
                    <input
                      className="login-input"
                      value={klascode}
                      onChange={(e) => setKlascode(e.target.value)}
                      placeholder="bv. linde7"
                      required
                    />
                  </label>
                  <label className="login-label">
                    Gebruikersnaam
                    <input
                      className="login-input"
                      value={gebruikersnaam}
                      onChange={(e) => setGebruikersnaam(e.target.value)}
                      autoComplete="username"
                      required
                    />
                  </label>
                </>
              ) : (
                <label className="login-label">
                  E-mailadres
                  <input
                    className="login-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </label>
              )}
              <label className="login-label">
                Wachtwoord
                <input
                  className="login-input"
                  type="password"
                  value={wachtwoord}
                  onChange={(e) => setWachtwoord(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              {foutmelding && <p className="login-fout">⚠️ {foutmelding}</p>}
              <button type="submit" className="login-knop" disabled={bezig}>
                {bezig ? 'Bezig…' : 'Inloggen →'}
              </button>
            </form>

            {soort === 'leerling' ? (
              <>
                <p className="login-hint">Vraag je klascode, gebruikersnaam en wachtwoord aan je juf of meester.</p>
                {onGast && (
                  <button type="button" className="login-terug" style={{ alignSelf: 'center', paddingTop: 14 }} onClick={onGast}>
                    Oefenen zonder account (niet bewaard) →
                  </button>
                )}
              </>
            ) : (
              <button type="button" className="login-terug" style={{ alignSelf: 'center', paddingTop: 14 }} onClick={() => { setModus('vergeten'); setFoutmelding('') }}>
                Wachtwoord vergeten?
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
