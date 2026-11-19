import { useState } from 'react'
import { supabase } from './lib/supabase.js'
import './login.css'
import { Knop, Feedback, Icoon } from './ui/index.jsx'

// Landingsplek voor de link uit de reset-e-mail (zie sessie.jsx:
// wachtwoordVergeten → redirectTo).
//
// Twee soorten links:
// 1. ?token_hash=…&type=recovery (eigen e-mailsjabloon, aanbevolen). De code
//    wordt pas ingewisseld als de leerkracht op Opslaan drukt. Dat is nodig
//    omdat Outlook (Microsoft Safe Links) links in mails vooraf opent: een
//    gewone Supabase-link is dan al opgebruikt voordat de leerkracht klikt.
// 2. De standaardlink van Supabase: die zet zelf een tijdelijke sessie in de
//    URL (#access_token=…), of geeft #error_code=otp_expired als hij al gebruikt is.
function leesLink() {
  const zoek = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return {
    tokenHash: zoek.get('token_hash'),
    soort: zoek.get('type') || 'recovery',
    fout: zoek.get('error_code') || hash.get('error_code') || zoek.get('error') || hash.get('error'),
  }
}

export default function WachtwoordResetten() {
  const [link] = useState(leesLink)
  const [nieuwWachtwoord, setNieuwWachtwoord] = useState('')
  const [herhaal, setHerhaal] = useState('')
  const [fout, setFout] = useState('')
  const [succes, setSucces] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [geverifieerd, setGeverifieerd] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setFout('')
    if (nieuwWachtwoord.length < 6) { setFout('Kies een wachtwoord van minstens 6 tekens.'); return }
    if (nieuwWachtwoord !== herhaal) { setFout('De twee wachtwoorden zijn niet hetzelfde.'); return }
    setBezig(true)
    if (link.tokenHash && !geverifieerd) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.soort })
      if (error) { setBezig(false); setFout('Deze link is verlopen of al gebruikt. Vraag hieronder een nieuwe aan.'); return }
      setGeverifieerd(true)
    }
    const { error } = await supabase.auth.updateUser({ password: nieuwWachtwoord })
    setBezig(false)
    if (error) {
      const msg = /different from the old/i.test(error.message) ? 'Kies een ander wachtwoord dan je oude.'
        : /session/i.test(error.message) ? 'Deze link is verlopen of al gebruikt. Vraag hieronder een nieuwe aan.'
        : 'Kon het wachtwoord niet wijzigen. Vraag een nieuwe link aan en probeer opnieuw.'
      setFout(msg); return
    }
    setSucces(true)
  }

  const verlopen = !!link.fout && !link.tokenHash

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
        ) : verlopen ? (
          <>
            <p className="login-subtitel"><Icoon naam="slot" />Link verlopen</p>
            <div className="login-fout"><Feedback soort="fout">Deze link is verlopen of al gebruikt. Vraag een nieuwe aan via "Wachtwoord vergeten?" en klik dan zo snel mogelijk op de nieuwe link.</Feedback></div>
            <a className="kk-knop kk-knop--primair kk-knop--breed" style={{ textDecoration: 'none' }} href="/leerkrachtenportaal">Nieuwe link aanvragen <Icoon naam="verder" /></a>
          </>
        ) : (
          <>
            <p className="login-subtitel"><Icoon naam="slot" />Nieuw wachtwoord instellen</p>
            <form onSubmit={submit} className="login-formulier" noValidate>
              <label className="login-label">
                Nieuw wachtwoord
                <input className="kk-invoer" type="password" value={nieuwWachtwoord} onChange={(e) => setNieuwWachtwoord(e.target.value)} autoFocus autoComplete="new-password" />
              </label>
              <label className="login-label">
                Nog een keer
                <input className="kk-invoer" type="password" value={herhaal} onChange={(e) => setHerhaal(e.target.value)} autoComplete="new-password" />
              </label>
              {fout && <div className="login-fout"><Feedback soort="fout">{fout}</Feedback></div>}
              <Knop type="submit" variant="primair" breed disabled={bezig}>
                {bezig ? 'Bezig…' : 'Opslaan'}
              </Knop>
            </form>
            {fout && <a className="login-link" style={{ display: 'block', textAlign: 'center', marginTop: 12 }} href="/leerkrachtenportaal">Nieuwe link aanvragen</a>}
          </>
        )}
      </div>
    </div>
  )
}
