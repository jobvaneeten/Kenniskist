import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { roepWorkerAan } from '../lib/worker.js'
import { useSessie } from '../lib/sessie.jsx'
import { Knop } from '../ui/index.jsx'
import { METHODES } from '../lib/methodes.js'

// Per school de lesmethodes aanvinken. Zonder methode ziet de school de
// neutrale versie: rekenen alleen doelen, spelling de regels in plaats van
// de dieren. Wijzigen mag alleen de beheerder (RLS scholen_admin).
function Methodes({ school, onGewijzigd }) {
  const [fout, setFout] = useState('')
  const vakken = [...new Set(METHODES.map(m => m.vak))]
  const zet = async (id) => {
    const huidig = school.methodes ?? []
    const nieuw = huidig.includes(id) ? huidig.filter(x => x !== id) : [...huidig, id]
    setFout('')
    onGewijzigd({ ...school, methodes: nieuw })
    const { error } = await supabase.from('scholen').update({ methodes: nieuw }).eq('id', school.id)
    if (error) { setFout('Opslaan mislukt'); onGewijzigd(school) }
  }
  return (
    <div className="kk-rij" style={{ alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
      {vakken.map(vak => (
        <div key={vak}>
          <div className="portaal-zacht" style={{ fontWeight: 800, marginBottom: 4 }}>{vak}</div>
          {METHODES.filter(m => m.vak === vak).map(m => (
            <label key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '2px 0' }}>
              <input type="checkbox" checked={(school.methodes ?? []).includes(m.id)} onChange={() => zet(m.id)} />
              {m.naam}{!m.inhoud && <span className="portaal-zacht">(nog geen eigen inhoud)</span>}
            </label>
          ))}
        </div>
      ))}
      {fout && <p className="portaal-fout">{fout}</p>}
    </div>
  )
}

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
    const { data } = await supabase.from('scholen').select('id, naam, code, methodes').order('naam')
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
            <Knop variant="secundair" maat="sm" onClick={uitloggen}>Uitloggen</Knop>
          </div>
        </header>

        <div className="portaal-kaart">
          <h2>Scholen</h2>
          {scholen === null && <p className="portaal-leeg">Laden…</p>}
          {scholen?.length === 0 && <p className="portaal-leeg">Nog geen scholen.</p>}
          {scholen?.length > 0 && (
            <>
              <p className="portaal-zacht">Vink per school de lesmethodes aan. Niets aangevinkt: bij rekenen alleen de doelen (geen blokken) en bij spelling de spellingregels in plaats van de dieren. Een wijziging is na opnieuw inloggen of verversen zichtbaar.</p>
              {scholen.map(s => (
                <details key={s.id} className="portaal-vak-chip" style={{ padding: '10px 14px', marginBottom: 8 }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 800 }}>
                    {s.naam} <span className="portaal-zacht">({s.code}) · {(s.methodes ?? []).length ? (s.methodes ?? []).map(id => METHODES.find(m => m.id === id)?.naam ?? id).join(', ') : 'geen methode'}</span>
                  </summary>
                  <div className="kk-mt-2"><Methodes school={s} onGewijzigd={(nieuw) => setScholen(lijst => lijst.map(x => x.id === nieuw.id ? nieuw : x))} /></div>
                </details>
              ))}
            </>
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
            <Knop type="submit" variant="primair" maat="sm" disabled={bezig}>{bezig ? 'Bezig…' : 'Aanmaken'}</Knop>
          </form>
        </div>
      </div>
    </div>
  )
}
