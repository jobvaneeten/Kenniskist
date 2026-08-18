import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

const LEEFTIJDSGROEPEN = [4, 5, 6, 7, 8]

// Achter het tandwieltje op een klaskaart. Alles wat je met de klas zelf doet,
// in de volgorde van het schooljaar: gegevens bijwerken, aan het eind iedereen
// doorschuiven naar de volgende jaargroep, en pas als de klas leeg is hem
// opruimen.
//
// Alleen bereikbaar voor een icter — RLS laat `klassen` ook alleen door
// hulp.is_schoolbeheerder() wijzigen (icter of admin).
export default function KlasInstellingen({ klas, alleKlassen, aantalLeerlingen, onGewijzigd, onVerwijderd }) {
  const [naam, setNaam] = useState(klas.naam)
  const [schooljaar, setSchooljaar] = useState(klas.schooljaar ?? '')
  const [code, setCode] = useState(klas.code)
  const [groepen, setGroepen] = useState(klas.groepen ?? [])
  const [opslaanBezig, setOpslaanBezig] = useState(false)
  const [gegevensFout, setGegevensFout] = useState('')
  const [gegevensOk, setGegevensOk] = useState('')

  const [doelKlasId, setDoelKlasId] = useState('')
  const [verplaatsBezig, setVerplaatsBezig] = useState(false)
  const [verplaatsMelding, setVerplaatsMelding] = useState('')

  const [toonVerwijder, setToonVerwijder] = useState(false)
  const [verwijderBezig, setVerwijderBezig] = useState(false)
  const [verwijderFout, setVerwijderFout] = useState('')

  const aantal = aantalLeerlingen
  const andereKlassen = alleKlassen.filter(k => k.id !== klas.id)

  const toggelGroep = (g) => setGroepen(prev =>
    prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g].sort()
  )

  const bewaarGegevens = async (e) => {
    e.preventDefault()
    setGegevensFout(''); setGegevensOk(''); setOpslaanBezig(true)
    const { error } = await supabase.from('klassen')
      .update({ naam, schooljaar: schooljaar || null, code: code.trim().toLowerCase(), groepen })
      .eq('id', klas.id)
    setOpslaanBezig(false)
    if (error) { setGegevensFout('Opslaan mislukt — bestaat deze naam of inlogcode al?'); return }
    setGegevensOk('Opgeslagen')
    onGewijzigd()
  }

  const verplaatsAllemaal = async () => {
    if (!doelKlasId) return
    setVerplaatsBezig(true); setVerplaatsMelding('')
    const { error } = await supabase.from('profielen')
      .update({ klas_id: doelKlasId })
      .eq('klas_id', klas.id).eq('rol', 'leerling')
    setVerplaatsBezig(false)
    if (error) { setVerplaatsMelding('Verplaatsen mislukt'); return }
    const doel = andereKlassen.find(k => k.id === doelKlasId)
    setVerplaatsMelding(`${aantal} leerlingen staan nu in ${doel?.naam ?? 'de nieuwe klas'}.`)
    setDoelKlasId('')
    onGewijzigd()
  }

  const verwijderKlas = async () => {
    setVerwijderBezig(true); setVerwijderFout('')
    const { error } = await supabase.from('klassen').delete().eq('id', klas.id)
    setVerwijderBezig(false)
    if (error) { setVerwijderFout('Verwijderen mislukt — heb je hier rechten voor?'); return }
    onVerwijderd()
  }

  return (
    <>
      <div className="portaal-kaart">
        <h2>Gegevens van de klas</h2>
        <form onSubmit={bewaarGegevens}>
          <div className="portaal-veldrij">
            <label className="portaal-veld">
              <span className="portaal-veld-label">Naam</span>
              <input value={naam} onChange={e => setNaam(e.target.value)} required />
            </label>
            <label className="portaal-veld">
              <span className="portaal-veld-label">Schooljaar</span>
              <input value={schooljaar} onChange={e => setSchooljaar(e.target.value)} placeholder="bv. 2026-2027" />
            </label>
            <label className="portaal-veld">
              <span className="portaal-veld-label">Inlogcode</span>
              <input
                value={code} onChange={e => setCode(e.target.value)} required
                pattern="[a-z0-9]{2,20}" title="2-20 kleine letters of cijfers"
              />
              <span className="portaal-veld-hint">Hiermee loggen de leerlingen in. Wijzig je dit, dan moeten ze de nieuwe code gebruiken.</span>
            </label>
          </div>
          <div style={{ marginTop: 12 }}>
            <span className="portaal-veld-label">Leeftijdsgroepen</span>
            <p className="portaal-veld-hint" style={{ margin: '2px 0 6px' }}>
              Bepaalt welke oefeningen je standaard te zien krijgt bij een weektaak. Niets aanvinken = alles tonen.
            </p>
            <div className="portaal-keuzevakjes" style={{ maxHeight: 'none' }}>
              {LEEFTIJDSGROEPEN.map(g => (
                <label key={g} className={groepen.includes(g) ? 'portaal-vakje aan' : 'portaal-vakje'}>
                  <input type="checkbox" checked={groepen.includes(g)} onChange={() => toggelGroep(g)} />
                  Groep {g}
                </label>
              ))}
            </div>
          </div>
          {gegevensFout && <p className="portaal-fout">{gegevensFout}</p>}
          {gegevensOk && <p className="portaal-succes">{gegevensOk}</p>}
          <button type="submit" className="portaal-knop" style={{ marginTop: 12 }} disabled={opslaanBezig}>
            {opslaanBezig ? 'Bezig…' : 'Wijzigingen opslaan'}
          </button>
        </form>
      </div>

      <div className="portaal-kaart">
        <h2>Leerlingen doorschuiven</h2>
        <p className="portaal-zacht">
          Aan het eind van het jaar: maak eerst de nieuwe klas aan, verplaats dan iedereen in één keer, en ruim
          daarna deze klas op. Hun gemaakte werk en munten gaan gewoon mee — alleen de klas verandert.
        </p>
        {aantal === 0 && <p className="portaal-leeg">Deze klas is leeg.</p>}
        {aantal > 0 && andereKlassen.length === 0 && (
          <p className="portaal-leeg">Er is nog geen andere klas om ze naartoe te verplaatsen. Maak die eerst aan.</p>
        )}
        {aantal > 0 && andereKlassen.length > 0 && (
          <div className="portaal-actiebalk" style={{ borderTop: 'none', marginTop: 4, paddingTop: 0 }}>
            <span>Alle <strong>{aantal}</strong> leerlingen naar</span>
            <select value={doelKlasId} onChange={e => setDoelKlasId(e.target.value)}>
              <option value="">— kies een klas —</option>
              {andereKlassen.map(k => (
                <option key={k.id} value={k.id}>{k.naam}{k.schooljaar ? ` (${k.schooljaar})` : ''}</option>
              ))}
            </select>
            <button className="portaal-knop" disabled={!doelKlasId || verplaatsBezig} onClick={verplaatsAllemaal}>
              {verplaatsBezig ? 'Bezig…' : 'Doorschuiven'}
            </button>
            {verplaatsMelding && <span className="portaal-succes">{verplaatsMelding}</span>}
          </div>
        )}
        <p className="portaal-veld-hint" style={{ marginTop: 8 }}>
          Eén leerling verplaatsen doe je bij “Per leerling” met de knop “leerlingen verplaatsen”.
        </p>
      </div>

      <div className="portaal-kaart">
        <h2>Klas verwijderen</h2>
          {aantal > 0 ? (
            <p className="portaal-zacht">
              Kan nog niet: hier zitten <strong>{aantal} leerlingen</strong> in. Schuif ze eerst door naar een
              andere klas. Zonder klas kunnen ze niet meer inloggen, want de inlogcode hoort bij de klas.
            </p>
          ) : !toonVerwijder ? (
            <>
              <p className="portaal-zacht">
                De klas is leeg en kan weg. De weektaken en opdrachten van deze klas verdwijnen dan ook.
              </p>
              <button className="portaal-knop portaal-knop-gevaar" onClick={() => setToonVerwijder(true)}>
                Klas verwijderen
              </button>
            </>
          ) : (
            <>
              <p className="portaal-zacht">
                Zeker weten? <strong>{klas.naam}</strong> en alle weektaken van deze klas worden verwijderd.
                Gemaakt werk van leerlingen blijft bewaard. Dit kan niet ongedaan gemaakt worden.
              </p>
              {verwijderFout && <p className="portaal-fout">{verwijderFout}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="portaal-knop portaal-knop-gevaar" disabled={verwijderBezig} onClick={verwijderKlas}>
                  {verwijderBezig ? 'Bezig…' : `Ja, verwijder ${klas.naam}`}
                </button>
                <button className="portaal-knop portaal-knop-subtiel" onClick={() => setToonVerwijder(false)}>Annuleren</button>
              </div>
            </>
          )}
      </div>
    </>
  )
}
