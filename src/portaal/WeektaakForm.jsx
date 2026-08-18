import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { TOOL_BY_ID } from '../lib/tools.js'
import ToolKiezer from './ToolKiezer.jsx'
import OpdrachtRij from './OpdrachtRij.jsx'
import { slaWeektaakOp } from './weektaakOpslaan.js'

function vandaag() { return new Date().toLocaleDateString('sv-SE') }
function overZesDagen() {
  const d = new Date()
  d.setDate(d.getDate() + 6)
  return d.toLocaleDateString('sv-SE')
}

// Controleert de instellingen die een tool verplicht stelt (bv. minstens twee
// woordsoorten). Zonder deze check sla je een opdracht op die bij de leerling
// nergens op uitkomt.
function controleerOpdrachten(opdrachten) {
  for (const o of opdrachten) {
    const info = TOOL_BY_ID[o.toolId]
    if (!info) continue
    for (const veld of info.configVelden) {
      // Alleen aanvinklijsten hebben een minimum aantal keuzes; bij een
      // getalveld betekent `min` de laagste toegestane waarde en mag leeg.
      if (veld.type !== 'checkboxes' || !veld.min) continue
      const gekozen = o.config?.[veld.key] ?? []
      if (gekozen.length < veld.min) {
        return `${info.label}: kies minstens ${veld.min} bij "${veld.label}".`
      }
    }
  }
  return null
}

// bestaand: null voor een nieuwe weektaak, anders { id, titel, start_op,
// eind_op, opdrachten: [{ id, tool_id, aantal, config }] } om te bewerken.
//
// Opgezet als drie stappen onder elkaar, gericht op iemand die dit voor het
// eerst doet: wanneer loopt hij, wat moeten ze doen, en wat er gebeurt als je
// opslaat.
export default function WeektaakForm({ klas, bestaand, onKlaar, onAnnuleren }) {
  const [titel, setTitel] = useState(bestaand?.titel ?? '')
  const [startOp, setStartOp] = useState(bestaand?.start_op ?? vandaag())
  const [eindOp, setEindOp] = useState(bestaand?.eind_op ?? overZesDagen())
  const [opdrachten, setOpdrachten] = useState(() =>
    (bestaand?.opdrachten ?? []).map(o => ({ id: o.id, toolId: o.tool_id, aantal: o.aantal, config: o.config ?? {} }))
  )
  const [toonKiezer, setToonKiezer] = useState(false)
  const [fout, setFout] = useState('')
  const [bezig, setBezig] = useState(false)

  const voegToe = ({ toolId }) => {
    const info = TOOL_BY_ID[toolId]
    setOpdrachten(prev => [...prev, { toolId, aantal: info?.standaardAantal ?? 1, config: {} }])
    setToonKiezer(false)
  }

  const wijzigOpdracht = (i, nieuw) => setOpdrachten(prev => prev.map((o, idx) => idx === i ? nieuw : o))
  const verwijderOpdracht = (i) => setOpdrachten(prev => prev.filter((_, idx) => idx !== i))

  const submit = async (e) => {
    e.preventDefault()
    setFout('')
    if (opdrachten.length === 0) { setFout('Voeg minstens 1 opdracht toe.'); return }
    if (eindOp < startOp) { setFout('De einddatum kan niet vóór de startdatum liggen.'); return }
    const configFout = controleerOpdrachten(opdrachten)
    if (configFout) { setFout(configFout); return }
    setBezig(true)
    try {
      const { data: leerlingen, error: leerlingFout } = await supabase
        .from('profielen').select('id').eq('klas_id', klas.id).eq('rol', 'leerling')
      if (leerlingFout) throw leerlingFout
      await slaWeektaakOp({
        weektaakId: bestaand?.id ?? null,
        schoolId: klas.school_id, klasId: klas.id,
        titel: titel.trim() || 'Weektaak', startOp, eindOp,
        opdrachten, leerlingIds: (leerlingen ?? []).map(l => l.id),
      })
      onKlaar()
    } catch {
      setFout('Opslaan mislukt — probeer opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="portaal-kaart">
        <h2>{bestaand ? 'Weektaak bewerken' : 'Nieuwe weektaak'}</h2>

        <div className="portaal-stap">
          <span className="portaal-stap-nr">1</span>
          <div className="portaal-stap-inhoud">
            <h3>Wanneer loopt hij?</h3>
            <p className="portaal-zacht">De leerlingen zien de opdrachten alleen tussen deze twee datums.</p>
            <div className="portaal-veldrij">
              <label className="portaal-veld">
                <span className="portaal-veld-label">Titel</span>
                <input value={titel} onChange={e => setTitel(e.target.value)} placeholder="bv. Week 36" />
                <span className="portaal-veld-hint">Leeg laten mag; dan heet hij "Weektaak".</span>
              </label>
              <label className="portaal-veld">
                <span className="portaal-veld-label">Start</span>
                <input type="date" value={startOp} onChange={e => setStartOp(e.target.value)} required />
              </label>
              <label className="portaal-veld">
                <span className="portaal-veld-label">Eind</span>
                <input type="date" value={eindOp} onChange={e => setEindOp(e.target.value)} required />
              </label>
            </div>
          </div>
        </div>

        <div className="portaal-stap">
          <span className="portaal-stap-nr">2</span>
          <div className="portaal-stap-inhoud">
            <h3>Wat moeten ze doen?</h3>
            <p className="portaal-zacht">
              Elke opdracht is één oefening met zijn eigen instellingen. Je kunt er zoveel toevoegen als je wilt.
            </p>

            {opdrachten.length === 0 && !toonKiezer && (
              <p className="portaal-leeg">Nog geen opdrachten. Begin met de knop hieronder.</p>
            )}

            <div className="portaal-opdrachtlijst">
              {opdrachten.map((o, i) => (
                <OpdrachtRij
                  key={o.id ?? `nieuw-${i}`}
                  opdracht={o}
                  nummer={i + 1}
                  onWijzig={nieuw => wijzigOpdracht(i, nieuw)}
                  onVerwijder={() => verwijderOpdracht(i)}
                />
              ))}
            </div>

            {!toonKiezer && (
              <button type="button" className="portaal-knop" style={{ marginTop: 12 }} onClick={() => setToonKiezer(true)}>
                + Opdracht toevoegen
              </button>
            )}
            {toonKiezer && (
              <ToolKiezer klasGroepen={klas.groepen} onKies={voegToe} onSluiten={() => setToonKiezer(false)} />
            )}
          </div>
        </div>

        <div className="portaal-stap">
          <span className="portaal-stap-nr">3</span>
          <div className="portaal-stap-inhoud">
            <h3>Klaarzetten</h3>
            <p className="portaal-zacht">
              Bij opslaan krijgt <strong>iedereen in {klas.naam}</strong> alle opdrachten. Daarna kun je via
              Differentiëren per leerling een opdracht weghalen of het aantal aanpassen, en via
              "Alleen niet af" iemand vrijstellen.
            </p>
            {fout && <p className="portaal-fout">{fout}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="submit" className="portaal-knop" disabled={bezig}>
                {bezig ? 'Bezig…' : bestaand ? 'Wijzigingen opslaan' : 'Weektaak klaarzetten'}
              </button>
              <button type="button" className="portaal-knop portaal-knop-subtiel" onClick={onAnnuleren}>Annuleren</button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
