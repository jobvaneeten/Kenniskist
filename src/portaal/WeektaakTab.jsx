import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import WeektaakForm from './WeektaakForm.jsx'
import WeektaakVoortgang from './WeektaakVoortgang.jsx'
import WeektaakDifferentiatie from './WeektaakDifferentiatie.jsx'

async function haalWeektaken(klasId) {
  const { data } = await supabase
    .from('weektaken').select('id, titel, start_op, eind_op')
    .eq('klas_id', klasId).order('start_op', { ascending: false })
  return data ?? []
}

function statusLabel(weektaak) {
  const vandaag = new Date().toLocaleDateString('sv-SE')
  if (vandaag < weektaak.start_op) return 'komend'
  if (vandaag > weektaak.eind_op) return 'verlopen'
  return 'actief'
}

// Derde tab van KlasScherm.jsx. Vijf standen: lijst van weektaken, een
// nieuwe aanmaken, een bestaande bewerken, de voortgang van één weektaak
// bekijken, of differentiëren (per leerling toewijzing/aantal aanpassen) —
// de laatste twee delen dezelfde opdrachten-fetch.
export default function WeektaakTab({ klas, onKiesLeerling }) {
  const [weektaken, setWeektaken] = useState(null)
  const [weergave, setWeergave] = useState('lijst') // lijst | nieuw | bewerken | voortgang | differentiatie
  const [gekozen, setGekozen] = useState(null)
  const [gekozenOpdrachten, setGekozenOpdrachten] = useState(null)
  const [alleenNietAf, setAlleenNietAf] = useState(false)
  const [toonVerwijder, setToonVerwijder] = useState(false)
  const [verwijderBezig, setVerwijderBezig] = useState(false)
  const [verwijderFout, setVerwijderFout] = useState('')

  useEffect(() => {
    let actief = true
    haalWeektaken(klas.id).then(data => { if (actief) setWeektaken(data) })
    return () => { actief = false }
  }, [klas.id])

  const kiesWeektaak = (wt) => { setGekozen(wt); setWeergave('voortgang'); setAlleenNietAf(false); setToonVerwijder(false) }

  // De opdrachten en toewijzingen gaan mee (cascade), maar het gemaakte werk
  // niet: resultaten.opdracht_id staat op SET NULL, dus die regels blijven
  // bestaan en tellen voortaan als vrij oefenen.
  const verwijderWeektaak = async () => {
    setVerwijderBezig(true); setVerwijderFout('')
    const { error } = await supabase.from('weektaken').delete().eq('id', gekozen.id)
    setVerwijderBezig(false)
    if (error) { setVerwijderFout('Verwijderen mislukt — heb je hier rechten voor?'); return }
    setToonVerwijder(false)
    naOpslaan()
  }

  const haalOpdrachten = async () => {
    const { data } = await supabase
      .from('opdrachten').select('id, tool_id, aantal, config')
      .eq('weektaak_id', gekozen.id).order('volgorde')
    setGekozenOpdrachten(data ?? [])
    return data ?? []
  }

  const bewerken = async () => { await haalOpdrachten(); setWeergave('bewerken') }
  const differentieren = async () => { await haalOpdrachten(); setWeergave('differentiatie') }

  const naOpslaan = () => {
    haalWeektaken(klas.id).then(setWeektaken)
    setWeergave('lijst'); setGekozen(null)
  }

  if (weergave === 'nieuw') {
    return <WeektaakForm klas={klas} bestaand={null} onKlaar={naOpslaan} onAnnuleren={() => setWeergave('lijst')} />
  }

  if (weergave === 'bewerken' && gekozen && gekozenOpdrachten) {
    return (
      <WeektaakForm
        klas={klas}
        bestaand={{ ...gekozen, opdrachten: gekozenOpdrachten }}
        onKlaar={naOpslaan}
        onAnnuleren={() => setWeergave('voortgang')}
      />
    )
  }

  if (weergave === 'differentiatie' && gekozen && gekozenOpdrachten) {
    return (
      <WeektaakDifferentiatie
        schoolId={klas.school_id}
        klasId={klas.id}
        opdrachten={gekozenOpdrachten}
        onTerug={() => setWeergave('voortgang')}
      />
    )
  }

  if (weergave === 'voortgang' && gekozen) {
    return (
      <div className="portaal-kaart">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div>
            <button className="portaal-terug" onClick={() => { setWeergave('lijst'); setGekozen(null) }} style={{ padding: 0 }}>← Alle weektaken</button>
            <h2 style={{ margin: '4px 0 0' }}>{gekozen.titel}</h2>
            <p className="portaal-leeg" style={{ margin: 0 }}>{gekozen.start_op} t/m {gekozen.eind_op}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className={alleenNietAf ? 'portaal-knop' : 'portaal-knop portaal-knop-subtiel'}
              onClick={() => setAlleenNietAf(v => !v)}
            >{alleenNietAf ? 'Toon iedereen' : 'Alleen niet af'}</button>
            <button className="portaal-knop portaal-knop-subtiel" onClick={differentieren}>Differentiëren</button>
            <button className="portaal-knop portaal-knop-subtiel" onClick={bewerken}>Bewerken</button>
            <button className="portaal-knop portaal-knop-subtiel" onClick={() => setToonVerwijder(v => !v)}>Verwijderen</button>
          </div>
        </div>
        {toonVerwijder && (
          <div className="portaal-waarschuwing">
            <p className="portaal-zacht" style={{ margin: 0 }}>
              <strong>{gekozen.titel}</strong> verwijderen? De opdrachten en de voortgang van deze weektaak
              verdwijnen. <strong>Het gemaakte werk blijft gewoon staan</strong> — het telt daarna mee als
              vrij oefenen in plaats van als weektaakwerk, dus je vindt het terug in het groepsoverzicht en
              bij de leerling zelf. Dit kan niet ongedaan gemaakt worden.
            </p>
            {verwijderFout && <p className="portaal-fout">{verwijderFout}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="portaal-knop portaal-knop-gevaar" disabled={verwijderBezig} onClick={verwijderWeektaak}>
                {verwijderBezig ? 'Bezig…' : 'Definitief verwijderen'}
              </button>
              <button className="portaal-knop portaal-knop-subtiel" onClick={() => setToonVerwijder(false)}>Annuleren</button>
            </div>
          </div>
        )}

        <WeektaakVoortgang
          weektaak={gekozen} klasId={klas.id}
          alleenNietAf={alleenNietAf} onKiesLeerling={onKiesLeerling}
        />
      </div>
    )
  }

  return (
    <div className="portaal-kaart">
      <h2>Weektaken</h2>
      {weektaken === null && <p className="portaal-leeg">Laden…</p>}
      {weektaken?.length === 0 && <p className="portaal-leeg">Nog geen weektaken.</p>}
      <div className="portaal-grid">
        {weektaken?.map(wt => (
          <button key={wt.id} className="portaal-klaskaart" onClick={() => kiesWeektaak(wt)}>
            {wt.titel}
            <span>{wt.start_op} t/m {wt.eind_op}</span>
            <span>{statusLabel(wt)}</span>
          </button>
        ))}
      </div>
      <button className="portaal-knop" style={{ marginTop: 16 }} onClick={() => setWeergave('nieuw')}>+ Nieuwe weektaak</button>
    </div>
  )
}
