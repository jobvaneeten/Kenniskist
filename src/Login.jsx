import { useState } from 'react'
import { useSessie } from './lib/sessie.jsx'
import './login.css'
import { Knop, TerugKnop, Feedback, Icoon } from './ui/index.jsx'

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

      <div className="login-kaart">
        {onBack && <TerugKnop vast={false} onClick={onBack} />}

        <div className="login-logo-ring">
          <img className="login-logo" src="/logo-rond.png" alt="Kenniskist" />
        </div>
        <h1 className="login-titel">Kenniskist</h1>

        {modus === 'verzonden' ? (
          <>
            <p className="login-subtitel"><Icoon naam="info" />Check je e-mail</p>
            <p className="login-hint">
              Als <strong>{email}</strong> bij een leerkrachtaccount hoort, staat er een linkje in je inbox om een nieuw wachtwoord te kiezen.
            </p>
            <Knop variant="subtiel" icoon="terug" className="login-link" onClick={() => setModus('inloggen')}>Terug naar inloggen</Knop>
          </>
        ) : modus === 'vergeten' ? (
          <>
            <p className="login-subtitel"><Icoon naam="slot" />Wachtwoord vergeten</p>
            <form onSubmit={verstuurResetlink} className="login-formulier">
              <label className="login-label">
                E-mailadres
                <input
                  className="kk-invoer"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                  autoFocus
                />
              </label>
              {foutmelding && <div className="login-fout"><Feedback soort="fout">{foutmelding}</Feedback></div>}
              <Knop type="submit" variant="primair" breed icoonRechts="verder" disabled={bezig}>
                {bezig ? 'Bezig…' : 'Stuur resetlink'}
              </Knop>
            </form>
            <Knop variant="subtiel" icoon="terug" className="login-link" onClick={() => { setModus('inloggen'); setFoutmelding('') }}>Terug naar inloggen</Knop>
          </>
        ) : (
          <>
            <p className="login-subtitel">
              <Icoon naam={soort === 'leerling' ? 'spel' : 'klembord'} />
              {soort === 'leerling' ? 'Inloggen als leerling' : 'Inloggen als leerkracht'}
            </p>

            <form onSubmit={submit} className="login-formulier">
              {soort === 'leerling' ? (
                <>
                  <label className="login-label">
                    Klascode
                    <input
                      className="kk-invoer"
                      value={klascode}
                      onChange={(e) => setKlascode(e.target.value)}
                      placeholder="bv. linde7"
                      required
                    />
                  </label>
                  <label className="login-label">
                    Gebruikersnaam
                    <input
                      className="kk-invoer"
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
                    className="kk-invoer"
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
                  className="kk-invoer"
                  type="password"
                  value={wachtwoord}
                  onChange={(e) => setWachtwoord(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              {foutmelding && <div className="login-fout"><Feedback soort="fout">{foutmelding}</Feedback></div>}
              <Knop type="submit" variant="primair" breed icoonRechts="verder" disabled={bezig}>
                {bezig ? 'Bezig…' : 'Inloggen'}
              </Knop>
            </form>

            {soort === 'leerling' ? (
              <>
                <p className="login-hint">Vraag je klascode, gebruikersnaam en wachtwoord aan je juf of meester.</p>
                {onGast && (
                  <Knop variant="subtiel" icoonRechts="verder" className="login-link" onClick={onGast}>
                    Oefenen zonder account (niet bewaard)
                  </Knop>
                )}
              </>
            ) : (
              <Knop variant="subtiel" className="login-link" onClick={() => { setModus('vergeten'); setFoutmelding('') }}>
                Wachtwoord vergeten?
              </Knop>
            )}
          </>
        )}
      </div>
    </div>
  )
}
