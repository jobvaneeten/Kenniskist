import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { roepWorkerAan } from '../lib/worker.js'
import { useSessie } from '../lib/sessie.jsx'

export default function AdminScholen() {
  const { profiel, uitloggen } = useSessie()
  const [scholen, setScholen] = useState(null)
  const [schoolNaam, setSchoolNaam] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const [icterVoornaam, setIcterVoornaam] = useState('')
  const [icterAchternaamLetter, setIcterAchternaamLetter] = useState('')
  const [icterEmail, setIcterEmail] = useState('')
  const [icterWachtwoord, setIcterWachtwoord] = useState('')
  const [fout, setFout] = useState('')
  const [succes, setSucces] = useState('')
  const [bezig, setBezig] = useState(false)

  const laadScholen = async () => {
    const { data } = await supabase.from('scholen').select('id, naam, code').order('naam')
    setScholen(data ?? [])
  }
  useEffect(() => { laadScholen() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setFout(''); setSucces(''); setBezig(true)
    try {
      await roepWorkerAan('school-aanmaken', {
        schoolNaam, schoolCode: schoolCode.trim().toLowerCase(),
        icterVoornaam, icterAchternaamLetter: icterAchternaamLetter || null,
        icterEmail: icterEmail.trim(), icterWachtwoord,
      })
      setSucces(`School "${schoolNaam}" aangemaakt met icter-account`)
      setSchoolNaam(''); setSchoolCode(''); setIcterVoornaam(''); setIcterAchternaamLetter(''); setIcterEmail(''); setIcterWachtwoord('')
      laadScholen()
    } catch (err) {
      setFout(err.message)
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="portaal">
      <div className="portaal-inhoud">
        <header className="portaal-header">
          <h1>Kenniskist — beheer</h1>
          <div className="portaal-header-rechts">
            <span>{profiel?.weergavenaam}</span>
            <button className="portaal-knop portaal-knop-subtiel" onClick={uitloggen}>Uitloggen</button>
          </div>
        </header>

        <div className="portaal-kaart">
          <h2>Scholen</h2>
          {scholen === null && <p className="portaal-leeg">Laden…</p>}
          {scholen?.length === 0 && <p className="portaal-leeg">Nog geen scholen.</p>}
          {scholen?.length > 0 && (
            <table className="portaal-tabel">
              <thead><tr><th>Naam</th><th>Code</th></tr></thead>
              <tbody>{scholen.map(s => <tr key={s.id}><td>{s.naam}</td><td>{s.code}</td></tr>)}</tbody>
            </table>
          )}
        </div>

        <div className="portaal-kaart">
          <h2>School + icter aanmaken</h2>
          <form className="portaal-form" onSubmit={submit}>
            <label>Schoolnaam
              <input value={schoolNaam} onChange={e => setSchoolNaam(e.target.value)} required />
            </label>
            <label>Schoolcode
              <input value={schoolCode} onChange={e => setSchoolCode(e.target.value)} required pattern="[a-z0-9]{2,20}" title="2-20 kleine letters of cijfers" />
            </label>
            <label>Voornaam icter
              <input value={icterVoornaam} onChange={e => setIcterVoornaam(e.target.value)} required />
            </label>
            <label>Eerste letter achternaam icter
              <input value={icterAchternaamLetter} onChange={e => setIcterAchternaamLetter(e.target.value.slice(0, 1))} maxLength={1} />
            </label>
            <label>E-mailadres icter
              <input type="email" value={icterEmail} onChange={e => setIcterEmail(e.target.value)} required />
            </label>
            <label>Wachtwoord icter
              <input type="password" value={icterWachtwoord} onChange={e => setIcterWachtwoord(e.target.value)} required minLength={6} autoComplete="new-password" />
            </label>
            {fout && <p className="portaal-fout">{fout}</p>}
            {succes && <p className="portaal-succes">{succes}</p>}
            <button type="submit" className="portaal-knop" disabled={bezig}>{bezig ? 'Bezig…' : 'Aanmaken'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}
