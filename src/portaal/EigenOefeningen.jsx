import { useEffect, useState } from 'react'
import { haalEigenOefeningen, bewaarEigenOefening, verwijderEigenOefening, EIGEN_VAKKEN } from '../lib/eigenOefeningen.js'
import { TOOL_FAMILIES } from '../lib/tools.js'
import VragenTabel from './VragenTabel.jsx'
import { Knop, Icoon } from '../ui/index.jsx'

// Tab "Eigen oefeningen": de leerkracht maakt een vragenlijst en kiest onder
// welke groep en welk vak hij komt te staan. De leerlingen van de klas vinden
// hem dan bij Speel Game → groep → vak, tussen de gewone oefeningen.

const ALLE_GROEPEN = [3, 4, 5, 6, 7, 8]
const SPEL_KEUZES = [
  { waarde: '', tekst: 'Zoals ingesteld voor de klas' },
  { waarde: '3', tekst: 'Na 3 goede antwoorden' },
  { waarde: '5', tekst: 'Na 5 goede antwoorden' },
  { waarde: '10', tekst: 'Na 10 goede antwoorden' },
  { waarde: '15', tekst: 'Na 15 goede antwoorden' },
  { waarde: '20', tekst: 'Na 20 goede antwoorden' },
  { waarde: '0', tekst: 'Geen spelletjes' },
]
const vakNaam = (key) => EIGEN_VAKKEN.find(v => v.key === key)?.label ?? key

function Formulier({ klas, bestaand, onKlaar, onAnnuleren }) {
  const groepen = klas.groepen?.length ? klas.groepen : ALLE_GROEPEN
  const [groep, setGroep] = useState(bestaand?.groep ?? (groepen.length === 1 ? groepen[0] : ''))
  const [vak, setVak] = useState(bestaand?.vak ?? '')
  const [onderwerp, setOnderwerp] = useState(bestaand?.onderwerp ?? '')
  const [vragen, setVragen] = useState(bestaand?.vragen ?? [])
  const [schudden, setSchudden] = useState(bestaand?.schudden !== false)
  const [spelNa, setSpelNa] = useState(bestaand?.spel_na == null ? '' : String(bestaand.spel_na))
  const [geld, setGeld] = useState(bestaand?.geld ?? 0)
  const [fout, setFout] = useState(null)
  const [bezig, setBezig] = useState(false)

  // Voorstellen voor het onderwerp: de oefeningen die al in dat vak staan.
  const onderwerpen = TOOL_FAMILIES.filter(f => f.vak && f.vak === vak && !f.verborgen).map(f => f.label)

  const opslaan = async () => {
    const probleem = !groep ? 'Kies voor welke groep de oefening is.'
      : !vak ? 'Kies onder welk vak de oefening komt te staan.'
      : !onderwerp.trim() ? 'Geef de oefening een naam (onderwerp).'
      : !vragen.length ? 'Vul minstens één vraag met een goed antwoord in.'
      : null
    if (probleem) { setFout(probleem); return }
    setBezig(true); setFout(null)
    try {
      await bewaarEigenOefening({
        id: bestaand?.id, klas_id: klas.id, groep: Number(groep), vak, onderwerp, vragen, schudden,
        spel_na: spelNa === '' ? null : Number(spelNa), geld: Math.min(1000, Math.max(0, Number(geld) || 0)),
      })
      onKlaar()
    } catch {
      setFout('Opslaan mislukt. Probeer het nog eens.')
      setBezig(false)
    }
  }

  return (
    <div className="portaal-kaart">
      <h2>{bestaand ? 'Oefening bewerken' : 'Nieuwe oefening'}</h2>
      <p className="portaal-zacht kk-mt-0">
        Kies waar de oefening komt te staan. Je leerlingen vinden hem dan bij Speel Game, daarna de groep en het vak.
      </p>

      <div className="portaal-veldrij kk-mt-3">
        <label className="portaal-veld">
          <span className="portaal-veld-label">Groep</span>
          <select value={groep} onChange={e => setGroep(e.target.value)}>
            <option value="">— kies —</option>
            {groepen.map(g => <option key={g} value={g}>Groep {g}</option>)}
          </select>
        </label>
        <label className="portaal-veld">
          <span className="portaal-veld-label">Vak</span>
          <select value={vak} onChange={e => setVak(e.target.value)}>
            <option value="">— kies —</option>
            {EIGEN_VAKKEN.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
          </select>
        </label>
        <label className="portaal-veld">
          <span className="portaal-veld-label">Onderwerp</span>
          <input type="text" list="eigen-onderwerpen" maxLength={60} placeholder="bv. Woordenschat thema 3"
            value={onderwerp} onChange={e => setOnderwerp(e.target.value)} />
          <datalist id="eigen-onderwerpen">{onderwerpen.map(o => <option key={o} value={o} />)}</datalist>
          <span className="portaal-veld-hint">Zo heet de oefening bij de leerling.</span>
        </label>
      </div>

      <div className="kk-mt-3">
        <VragenTabel vragen={vragen} onWijzig={setVragen} />
      </div>

      <label className="portaal-vinkje kk-mt-2" style={{ alignSelf: 'flex-start' }}>
        <input type="checkbox" checked={schudden} onChange={e => setSchudden(e.target.checked)} />
        Vragen in willekeurige volgorde
      </label>

      <div className="portaal-veldrij kk-mt-3">
        <label className="portaal-veld">
          <span className="portaal-veld-label">Spelletje</span>
          <select value={spelNa} onChange={e => setSpelNa(e.target.value)}>
            {SPEL_KEUZES.map(k => <option key={k.waarde} value={k.waarde}>{k.tekst}</option>)}
          </select>
          <span className="portaal-veld-hint">Na zoveel goede antwoorden mag de leerling een spelletje doen.</span>
        </label>
        <label className="portaal-veld">
          <span className="portaal-veld-label">Briefgeld bij afronden</span>
          <input type="number" min={0} max={1000} step={10} value={geld} onChange={e => setGeld(e.target.value)} />
          <span className="portaal-veld-hint">Krijgt de leerling één keer, als alle vragen gemaakt zijn. 0 = niets extra.</span>
        </label>
      </div>

      {fout && <p className="portaal-fout kk-mt-2">{fout}</p>}
      <div className="portaal-eigen-knoppen kk-mt-3">
        <Knop variant="primair" disabled={bezig} onClick={opslaan}>{bezig ? 'Bezig…' : 'Opslaan'}</Knop>
        <Knop variant="secundair" disabled={bezig} onClick={onAnnuleren}>Annuleren</Knop>
      </div>
    </div>
  )
}

export default function EigenOefeningen({ klas }) {
  const [lijst, setLijst] = useState(null)
  const [laadFout, setLaadFout] = useState(false)
  const [bewerk, setBewerk] = useState(null) // null | 'nieuw' | oefening
  const [verwijder, setVerwijder] = useState(null)

  const [versie, setVersie] = useState(0)
  const laad = () => setVersie(v => v + 1)

  useEffect(() => {
    let actief = true
    haalEigenOefeningen(klas.id)
      .then(l => { if (actief) { setLijst(l); setLaadFout(false) } })
      .catch(() => { if (actief) { setLaadFout(true); setLijst([]) } })
    return () => { actief = false }
  }, [klas.id, versie])

  if (bewerk) {
    return (
      <Formulier
        klas={klas} bestaand={bewerk === 'nieuw' ? null : bewerk}
        onKlaar={() => { setBewerk(null); laad() }} onAnnuleren={() => setBewerk(null)}
      />
    )
  }

  const bevestigVerwijderen = async () => {
    try { await verwijderEigenOefening(verwijder.id); setVerwijder(null); laad() }
    catch { setVerwijder(v => ({ ...v, fout: true })) }
  }

  return (
    <div className="portaal-kaart">
      <h2>Eigen oefeningen</h2>
      <p className="portaal-zacht kk-mt-0">
        Maak een oefening met je eigen vragen, bijvoorbeeld de woorden van dit thema. Je kiest zelf onder welke groep en welk vak
        hij komt te staan. Je leerlingen vinden hem bij Speel Game, tussen de andere oefeningen van dat vak.
      </p>

      {lijst === null && <p className="portaal-leeg">Laden…</p>}
      {laadFout && <p className="portaal-fout">De oefeningen konden niet geladen worden.</p>}
      {lijst?.length === 0 && !laadFout && <p className="portaal-leeg">Je hebt nog geen eigen oefeningen.</p>}

      <div className="portaal-grid kk-mt-3">
        {lijst?.map(o => (
          <div key={o.id} className="portaal-klaskaart-wrap">
            <button className="portaal-klaskaart" onClick={() => setBewerk(o)}>
              {o.onderwerp}
              <span>Groep {o.groep} · {vakNaam(o.vak)}</span>
              <span>{o.vragen.length} {o.vragen.length === 1 ? 'vraag' : 'vragen'}{o.geld > 0 ? ` · € ${o.geld} briefgeld` : ''}</span>
            </button>
            <button className="portaal-eigen-weg portaal-eigen-kaartweg" aria-label={`${o.onderwerp} verwijderen`} onClick={() => setVerwijder(o)}>
              <Icoon naam="prullenbak" />
            </button>
          </div>
        ))}
      </div>

      {verwijder && (
        <div className="portaal-waarschuwing kk-mt-3">
          <p className="kk-m-0">"{verwijder.onderwerp}" verwijderen? Je leerlingen kunnen hem daarna niet meer oefenen.</p>
          {verwijder.fout && <p className="portaal-fout">Verwijderen mislukt.</p>}
          <div className="portaal-eigen-knoppen kk-mt-2">
            <Knop variant="gevaar" maat="sm" onClick={bevestigVerwijderen}>Verwijderen</Knop>
            <Knop variant="secundair" maat="sm" onClick={() => setVerwijder(null)}>Annuleren</Knop>
          </div>
        </div>
      )}

      <Knop className="kk-mt-4" variant="primair" maat="sm" onClick={() => setBewerk('nieuw')}>Nieuwe oefening</Knop>
    </div>
  )
}
