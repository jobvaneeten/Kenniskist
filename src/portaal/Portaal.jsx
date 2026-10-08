import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useSessie } from '../lib/sessie.jsx'
import AdminScholen from './AdminScholen.jsx'
import KlasScherm from './KlasScherm.jsx'
import KlasInstellingen from './KlasInstellingen.jsx'
import LeerlingToevoegen from './LeerlingToevoegen.jsx'
import LeerkrachtToevoegen from './LeerkrachtToevoegen.jsx'
import './portaal.css'
import { Knop, TerugKnop, Icoon } from '../ui/index.jsx'

const LEEFTIJDSGROEPEN = [4, 5, 6, 7, 8]

function KlasToevoegen({ schoolId, onKlaar }) {
  const [naam, setNaam] = useState('')
  const [schooljaar, setSchooljaar] = useState('')
  const [code, setCode] = useState('')
  const [groepen, setGroepen] = useState([])
  const [fout, setFout] = useState('')
  const [bezig, setBezig] = useState(false)

  const toggelGroep = (g) => setGroepen(prev =>
    prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g].sort()
  )

  const submit = async (e) => {
    e.preventDefault()
    setFout(''); setBezig(true)
    const { error } = await supabase.from('klassen').insert({
      naam, schooljaar: schooljaar || null, school_id: schoolId, code: code.trim().toLowerCase(), groepen,
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
        <label>Leeftijdsgroepen (leeg = geen beperking)
          <div className="kk-rij kk-rij-ruim">
            {LEEFTIJDSGROEPEN.map(g => (
              <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 400 }}>
                <input type="checkbox" checked={groepen.includes(g)} onChange={() => toggelGroep(g)} />
                Groep {g}
              </label>
            ))}
          </div>
        </label>
        {fout && <p className="portaal-fout">{fout}</p>}
        <div className="kk-rij">
          <Knop type="submit" variant="primair" maat="sm" disabled={bezig}>{bezig ? 'Bezig…' : 'Aanmaken'}</Knop>
          <Knop type="button" variant="secundair" maat="sm" onClick={onKlaar}>Sluiten</Knop>
        </div>
      </form>
    </div>
  )
}

function KlasOverzicht({ profiel, klassen, aantallen, leerkrachten, isIcter, onKiesKlas, onKiesInstellingen, onKlassenGewijzigd }) {
  const [toonLeerlingForm, setToonLeerlingForm] = useState(false)
  const [toonLeerkrachtForm, setToonLeerkrachtForm] = useState(false)
  const [toonKlasForm, setToonKlasForm] = useState(false)

  return (
    <div className="portaal-inhoud">
      <div className="portaal-kaart">
        <div className="portaal-sectiekop">
          <h2>Kies een klas</h2>
          <span className="portaal-zacht">daarna zie je het overzicht van die klas</span>
        </div>
        {klassen.length === 0 && <p className="portaal-leeg">Nog geen klassen.</p>}
        <div className="portaal-grid">
          {klassen.map(k => (
            <div key={k.id} className="portaal-klaskaart-wrap">
              <button className="portaal-klaskaart portaal-klas" onClick={() => onKiesKlas(k)}>
                <span className="portaal-klas-kop">
                  <span className="portaal-klas-icoon"><Icoon naam="school" /></span>
                  <span className="portaal-klas-naam">{k.naam}</span>
                </span>
                <span className="portaal-chips">
                  <span className="portaal-chip"><Icoon naam="mensen" />{aantallen[k.id] ?? 0} leerlingen</span>
                  <span className="portaal-chip"><Icoon naam="sleutel" />{k.code}</span>
                  <span className="portaal-chip">{k.groepen?.length ? `groep ${k.groepen.join(', ')}` : 'alle groepen'}</span>
                </span>
                <span className="portaal-klas-voet">
                  {k.schooljaar && <span>{k.schooljaar}</span>}
                  {leerkrachten[k.id]?.length > 0 && <span>{leerkrachten[k.id].join(', ')}</span>}
                  <span className="portaal-klas-pijl"><Icoon naam="verder" /></span>
                </span>
              </button>
              {/* Naast de kaart en niet erin: een knop in een knop mag niet. */}
              {isIcter && (
                <button
                  className="portaal-tandwiel"
                  title={`Instellingen van ${k.naam}`}
                  aria-label={`Instellingen van ${k.naam}`}
                  onClick={() => onKiesInstellingen(k)}
                ><Icoon naam="instellingen" /></button>
              )}
            </div>
          ))}
        </div>

        <div className="portaal-actiebalk">
          <Knop variant="secundair" maat="sm" onClick={() => setToonLeerlingForm(v => !v)}>+ Leerling</Knop>
          {isIcter && <Knop variant="secundair" maat="sm" onClick={() => setToonLeerkrachtForm(v => !v)}>+ Leerkracht</Knop>}
          {isIcter && <Knop variant="secundair" maat="sm" onClick={() => setToonKlasForm(v => !v)}>+ Klas</Knop>}
        </div>
      </div>

      {toonKlasForm && <KlasToevoegen schoolId={profiel.school_id} onKlaar={() => { setToonKlasForm(false); onKlassenGewijzigd() }} />}
      {toonLeerlingForm && <LeerlingToevoegen klassen={klassen} onKlaar={() => { setToonLeerlingForm(false); onKlassenGewijzigd() }} />}
      {toonLeerkrachtForm && <LeerkrachtToevoegen onKlaar={() => setToonLeerkrachtForm(false)} />}
    </div>
  )
}

export default function Portaal() {
  const { profiel, uitloggen } = useSessie()
  // Muziekknop weg zolang je in het portaal zit (zie kenniskist-muziek.js).
  useEffect(() => {
    window.KennisKistMuziek?.toon(false)
    return () => window.KennisKistMuziek?.toon(true)
  }, [])
  const [klassen, setKlassen] = useState([])
  const [aantallen, setAantallen] = useState({})
  const [leerkrachten, setLeerkrachten] = useState({})   // klas_id → [naam]
  const [gekozenKlas, setGekozenKlas] = useState(null)
  const [instellingenKlas, setInstellingenKlas] = useState(null)
  // Puur een weergave-schakelaar: icter heeft via RLS altijd alle rechten
  // van een leerkracht (en meer). Sommige icters geven zelf ook les aan een
  // klas — deze knop verbergt dan gewoon de icter-only knoppen (klas/
  // leerkracht toevoegen) zodat het portaal niet voller oogt dan nodig.
  const [alsLeerkracht, setAlsLeerkracht] = useState(false)

  const laadKlassen = useCallback(async () => {
    // Wie welke klas draait staat sinds migratie 0013 in klas_leerkrachten;
    // los opgehaald en hier samengevoegd, zodat er geen embed nodig is.
    const [{ data }, { data: lln }, { data: pers }, { data: kopp }] = await Promise.all([
      supabase.from('klassen').select('id, school_id, naam, schooljaar, code, groepen').order('naam'),
      supabase.from('profielen').select('klas_id').eq('rol', 'leerling'),
      supabase.from('profielen').select('id, weergavenaam').in('rol', ['leerkracht', 'icter']),
      supabase.from('klas_leerkrachten').select('klas_id, leerkracht_id'),
    ])
    setKlassen(data ?? [])
    setAantallen((lln ?? []).reduce((acc, p) => ({ ...acc, [p.klas_id]: (acc[p.klas_id] ?? 0) + 1 }), {}))
    const naamBij = new Map((pers ?? []).map(p => [p.id, p.weergavenaam]))
    setLeerkrachten((kopp ?? []).reduce((acc, k) => {
      const naam = naamBij.get(k.leerkracht_id)
      return naam ? { ...acc, [k.klas_id]: [...(acc[k.klas_id] ?? []), naam] } : acc
    }, {}))
  }, [])

  useEffect(() => { if (profiel && profiel.rol !== 'admin') laadKlassen() }, [profiel, laadKlassen])

  if (!profiel) return null
  if (profiel.rol === 'admin') return <AdminScholen />

  if (gekozenKlas) {
    return <KlasScherm klas={gekozenKlas} alleKlassen={klassen} onBack={() => setGekozenKlas(null)} />
  }

  if (instellingenKlas) {
    const actueel = klassen.find(k => k.id === instellingenKlas.id) ?? instellingenKlas
    return (
      <div className="portaal">
        <div className="portaal-inhoud">
          <TerugKnop vast={false} onClick={() => setInstellingenKlas(null)}>Alle klassen</TerugKnop>
          <div className="portaal-klaskop">
            <div>
              <h1>{actueel.naam}</h1>
              <p className="portaal-zacht">Instellingen van deze klas</p>
            </div>
          </div>
          <KlasInstellingen
            klas={actueel}
            alleKlassen={klassen}
            onGewijzigd={laadKlassen}
            onVerwijderd={() => { setInstellingenKlas(null); laadKlassen() }}
          />
        </div>
      </div>
    )
  }

  const isIcter = profiel.rol === 'icter' && !alsLeerkracht

  return (
    <div className="portaal">
      <header className="portaal-header">
        <div className="portaal-merk">
          <img src="/logo-rond.png" alt="" />
          <div>
            <h1>Kenniskist</h1>
            <span className="portaal-merk-sub">Leerkrachtenportaal</span>
          </div>
        </div>
        <div className="portaal-header-rechts">
          <span className="portaal-gebruiker">
            <span className="portaal-avatar">{profiel.weergavenaam?.[0]?.toUpperCase() ?? '?'}</span>
            <span className="portaal-gebruiker-tekst">
              <strong>{profiel.weergavenaam}</strong>
              <small>{profiel.rol}{profiel.rol === 'icter' && alsLeerkracht ? ' · als leerkracht' : ''}</small>
            </span>
          </span>
          {profiel.rol === 'icter' && (
            <Knop variant="secundair" maat="sm" onClick={() => setAlsLeerkracht(v => !v)}>
              {alsLeerkracht ? 'Terug naar icter-weergave' : 'Bekijk als leerkracht'}
            </Knop>
          )}
          <Knop variant="secundair" maat="sm" onClick={uitloggen}>Uitloggen</Knop>
        </div>
      </header>
      <KlasOverzicht
        profiel={profiel}
        klassen={klassen}
        aantallen={aantallen}
        leerkrachten={leerkrachten}
        isIcter={isIcter}
        onKiesKlas={setGekozenKlas}
        onKiesInstellingen={setInstellingenKlas}
        onKlassenGewijzigd={laadKlassen}
      />
    </div>
  )
}
