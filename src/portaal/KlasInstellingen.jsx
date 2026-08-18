import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { roepWorkerAan } from '../lib/worker.js'

const LEEFTIJDSGROEPEN = [4, 5, 6, 7, 8]

// Leerlingen van deze klas: bekijken, en verwijderen als er een account te
// veel is aangemaakt. Verwijderen loopt via de Worker, want daar zit de
// service-sleutel die auth-accounts mag opruimen — de browser heeft die niet.
function Leerlingen({ leerlingen, onGewijzigd }) {
  const [bevestig, setBevestig] = useState(null)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')

  const verwijder = async (leerling) => {
    setBezig(true); setFout('')
    try {
      await roepWorkerAan('leerling-verwijderen', { leerlingId: leerling.id })
      setBevestig(null)
      onGewijzigd()
    } catch (err) {
      setFout(err.message || 'Verwijderen mislukt')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="portaal-kaart">
      <h2>Leerlingen ({leerlingen.length})</h2>
      {leerlingen.length === 0 && <p className="portaal-leeg">Deze klas is leeg.</p>}
      {fout && <p className="portaal-fout">{fout}</p>}
      <div className="portaal-naamlijst">
        {leerlingen.map(l => (
          <div key={l.id} className="portaal-naamrij">
            <div className="portaal-naamknop" style={{ cursor: 'default' }}>
              <span className="portaal-naamknop-naam">{l.weergavenaam}</span>
              <span className="portaal-zacht">{l.gebruikersnaam}</span>
            </div>
            <button className="portaal-rijknop" title={`${l.weergavenaam} verwijderen`} onClick={() => { setBevestig(l); setFout('') }}>✕</button>
          </div>
        ))}
      </div>

      {bevestig && (
        <div className="portaal-waarschuwing">
          <p className="portaal-zacht" style={{ margin: 0 }}>
            <strong>{bevestig.weergavenaam}</strong> verwijderen? Het account verdwijnt en <strong>al het
            gemaakte werk, de munten en de weektaakvoortgang van dit kind gaan mee</strong>. Dit kan niet
            ongedaan gemaakt worden. Wil je alleen dat hij in een andere klas komt, gebruik dan
            “doorschuiven” of “leerlingen verplaatsen”.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="portaal-knop portaal-knop-gevaar" disabled={bezig} onClick={() => verwijder(bevestig)}>
              {bezig ? 'Bezig…' : `Ja, verwijder ${bevestig.weergavenaam}`}
            </button>
            <button className="portaal-knop portaal-knop-subtiel" onClick={() => setBevestig(null)}>Annuleren</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Welke leerkracht hoort bij deze klas. Puur organisatorisch: iedereen van de
// school kan elke klas al inzien (RLS: klassen_lezen op school_id), dit maakt
// alleen zichtbaar wie hem draait.
function LeerkrachtKoppelen({ klas, personeel, onGewijzigd }) {
  const [keuze, setKeuze] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')

  const gekoppeld = personeel.filter(p => p.klas_id === klas.id)
  const vrij = personeel.filter(p => p.klas_id !== klas.id)

  const zetKlas = async (id, klasId) => {
    setBezig(true); setFout('')
    const { error } = await supabase.from('profielen').update({ klas_id: klasId }).eq('id', id)
    setBezig(false)
    if (error) { setFout('Opslaan mislukt'); return }
    setKeuze('')
    onGewijzigd()
  }

  return (
    <div className="portaal-kaart">
      <h2>Leerkracht van deze klas</h2>
      {gekoppeld.length === 0
        ? <p className="portaal-leeg">Nog niemand gekoppeld.</p>
        : (
          <div className="portaal-naamlijst">
            {gekoppeld.map(p => (
              <div key={p.id} className="portaal-naamrij">
                <div className="portaal-naamknop" style={{ cursor: 'default' }}>
                  <span className="portaal-naamknop-naam">{p.weergavenaam}</span>
                  <span className="portaal-zacht">{p.rol}</span>
                </div>
                <button className="portaal-rijknop" title="Loskoppelen" disabled={bezig} onClick={() => zetKlas(p.id, null)}>✕</button>
              </div>
            ))}
          </div>
        )}

      {fout && <p className="portaal-fout">{fout}</p>}

      {vrij.length > 0 && (
        <div className="portaal-actiebalk">
          <select value={keuze} onChange={e => setKeuze(e.target.value)}>
            <option value="">— kies een leerkracht —</option>
            {vrij.map(p => (
              <option key={p.id} value={p.id}>
                {p.weergavenaam}{p.klas_id ? ' (nu bij een andere klas)' : ''}
              </option>
            ))}
          </select>
          <button className="portaal-knop" disabled={!keuze || bezig} onClick={() => zetKlas(keuze, klas.id)}>
            Koppelen
          </button>
        </div>
      )}
      <p className="portaal-veld-hint" style={{ marginTop: 8 }}>
        Dit legt alleen vast wie de klas draait; alle leerkrachten van de school kunnen elke klas blijven inzien.
        Een leerkracht hoort bij één klas tegelijk.
      </p>
    </div>
  )
}

// Achter het tandwieltje op een klaskaart. Alles wat je met de klas zelf doet,
// in de volgorde van het schooljaar: gegevens bijwerken, aan het eind iedereen
// doorschuiven naar de volgende jaargroep, en pas als de klas leeg is hem
// opruimen.
//
// Alleen bereikbaar voor een icter — RLS laat `klassen` ook alleen door
// hulp.is_schoolbeheerder() wijzigen (icter of admin).
export default function KlasInstellingen({ klas, alleKlassen, onGewijzigd, onVerwijderd }) {
  const [leerlingen, setLeerlingen] = useState([])
  const [personeel, setPersoneel] = useState([])
  // Zelfde herlaad-truc als klasGegevens.js: ophalen gebeurt ín het effect, en
  // een teller trekt het opnieuw op gang na een wijziging.
  const [teller, setTeller] = useState(0)

  useEffect(() => {
    let actief = true
    async function laad() {
      const [{ data: lln }, { data: pers }] = await Promise.all([
        supabase.from('profielen').select('id, weergavenaam, gebruikersnaam')
          .eq('klas_id', klas.id).eq('rol', 'leerling').order('weergavenaam'),
        supabase.from('profielen').select('id, weergavenaam, rol, klas_id')
          .eq('school_id', klas.school_id).in('rol', ['leerkracht', 'icter']).order('weergavenaam'),
      ])
      if (!actief) return
      setLeerlingen(lln ?? [])
      setPersoneel(pers ?? [])
    }
    laad()
    return () => { actief = false }
  }, [klas.id, klas.school_id, teller])

  const naGewijzigd = useCallback(() => { setTeller(t => t + 1); onGewijzigd() }, [onGewijzigd])

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

  const aantal = leerlingen.length
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
    naGewijzigd()
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

      <LeerkrachtKoppelen klas={klas} personeel={personeel} onGewijzigd={naGewijzigd} />

      <Leerlingen leerlingen={leerlingen} onGewijzigd={naGewijzigd} />

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
