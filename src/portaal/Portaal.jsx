import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useSessie } from '../lib/sessie.jsx'
import AdminScholen from './AdminScholen.jsx'
import KlasScherm from './KlasScherm.jsx'
import LeerlingToevoegen from './LeerlingToevoegen.jsx'
import LeerkrachtToevoegen from './LeerkrachtToevoegen.jsx'
import './portaal.css'

function KlasToevoegen({ schoolId, onKlaar }) {
  const [naam, setNaam] = useState('')
  const [schooljaar, setSchooljaar] = useState('')
  const [code, setCode] = useState('')
  const [fout, setFout] = useState('')
  const [bezig, setBezig] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setFout(''); setBezig(true)
    const { error } = await supabase.from('klassen').insert({
      naam, schooljaar: schooljaar || null, school_id: schoolId, code: code.trim().toLowerCase(),
    })
    setBezig(false)
    if (error) { setFout('Kon klas niet aanmaken (bestaat deze naam of klascode al?)'); return }
    onKlaar()
  }

  return (
    <div className="portaal-kaart">
      <h2>Klas toevoegen</h2>
      <form className="portaal-form" onSubmit={submit}>
        <label>Naam
          <input value={naam} onChange={e => setNaam(e.target.value)} required placeholder="bv. Groep 7A" />
        </label>
        <label>Schooljaar
          <input value={schooljaar} onChange={e => setSchooljaar(e.target.value)} placeholder="bv. 2025-2026" />
        </label>
        <label>Klascode (inlogcode voor leerlingen)
          <input
            value={code} onChange={e => setCode(e.target.value)} required
            pattern="[a-z0-9]{2,20}" title="2-20 kleine letters of cijfers"
            placeholder="bv. linde7 of vliertuin7b"
          />
        </label>
        {fout && <p className="portaal-fout">{fout}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="portaal-knop" disabled={bezig}>{bezig ? 'Bezig…' : 'Aanmaken'}</button>
          <button type="button" className="portaal-knop portaal-knop-subtiel" onClick={onKlaar}>Sluiten</button>
        </div>
      </form>
    </div>
  )
}

function KlasOverzicht({ profiel, klassen, isIcter, onKiesKlas, onKlassenGewijzigd }) {
  const [toonLeerlingForm, setToonLeerlingForm] = useState(false)
  const [toonLeerkrachtForm, setToonLeerkrachtForm] = useState(false)
  const [toonKlasForm, setToonKlasForm] = useState(false)

  return (
    <div className="portaal-inhoud">
      <div className="portaal-kaart">
        <h2>Klassen</h2>
        {klassen.length === 0 && <p className="portaal-leeg">Nog geen klassen.</p>}
        <div className="portaal-grid">
          {klassen.map(k => (
            <button key={k.id} className="portaal-klaskaart" onClick={() => onKiesKlas(k)}>
              {k.naam}
              {k.schooljaar && <span>{k.schooljaar}</span>}
              <span>inlogcode: {k.code}</span>
            </button>
          ))}
        </div>
        {isIcter && (
          toonKlasForm
            ? <div style={{ marginTop: 16 }}><KlasToevoegen schoolId={profiel.school_id} onKlaar={() => { setToonKlasForm(false); onKlassenGewijzigd() }} /></div>
            : <button className="portaal-knop portaal-knop-subtiel" style={{ marginTop: 16 }} onClick={() => setToonKlasForm(true)}>+ Klas toevoegen</button>
        )}
      </div>

      <div className="portaal-kaart">
        <h2>Accounts</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="portaal-knop" onClick={() => setToonLeerlingForm(v => !v)}>+ Leerling toevoegen</button>
          {isIcter && <button className="portaal-knop" onClick={() => setToonLeerkrachtForm(v => !v)}>+ Leerkracht toevoegen</button>}
        </div>
      </div>

      {toonLeerlingForm && <LeerlingToevoegen klassen={klassen} onKlaar={() => setToonLeerlingForm(false)} />}
      {toonLeerkrachtForm && <LeerkrachtToevoegen onKlaar={() => setToonLeerkrachtForm(false)} />}
    </div>
  )
}

export default function Portaal() {
  const { profiel, uitloggen } = useSessie()
  const [klassen, setKlassen] = useState([])
  const [gekozenKlas, setGekozenKlas] = useState(null)
  // Puur een weergave-schakelaar: icter heeft via RLS altijd alle rechten
  // van een leerkracht (en meer). Sommige icters geven zelf ook les aan een
  // klas — deze knop verbergt dan gewoon de icter-only knoppen (klas/
  // leerkracht toevoegen) zodat het portaal niet voller oogt dan nodig.
  const [alsLeerkracht, setAlsLeerkracht] = useState(false)

  const laadKlassen = useCallback(async () => {
    const { data } = await supabase.from('klassen').select('id, naam, schooljaar, code').order('naam')
    setKlassen(data ?? [])
  }, [])

  useEffect(() => { if (profiel && profiel.rol !== 'admin') laadKlassen() }, [profiel, laadKlassen])

  if (!profiel) return null
  if (profiel.rol === 'admin') return <AdminScholen />

  if (gekozenKlas) {
    return <KlasScherm klas={gekozenKlas} alleKlassen={klassen} onBack={() => setGekozenKlas(null)} />
  }

  const isIcter = profiel.rol === 'icter' && !alsLeerkracht

  return (
    <div className="portaal">
      <header className="portaal-header">
        <h1>Kenniskist portaal</h1>
        <div className="portaal-header-rechts">
          <span>{profiel.weergavenaam} ({profiel.rol}{profiel.rol === 'icter' && alsLeerkracht ? ' — als leerkracht' : ''})</span>
          {profiel.rol === 'icter' && (
            <button className="portaal-knop portaal-knop-subtiel" onClick={() => setAlsLeerkracht(v => !v)}>
              {alsLeerkracht ? 'Terug naar icter-weergave' : 'Bekijk als leerkracht'}
            </button>
          )}
          <button className="portaal-knop portaal-knop-subtiel" onClick={uitloggen}>Uitloggen</button>
        </div>
      </header>
      <KlasOverzicht
        profiel={profiel}
        klassen={klassen}
        isIcter={isIcter}
        onKiesKlas={setGekozenKlas}
        onKlassenGewijzigd={laadKlassen}
      />
    </div>
  )
}
