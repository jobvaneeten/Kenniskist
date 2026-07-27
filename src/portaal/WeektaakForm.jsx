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

// bestaand: null voor een nieuwe weektaak, anders { id, titel, start_op,
// eind_op, opdrachten: [{ id, tool_id, aantal, config }] } om te bewerken.
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
    if (eindOp < startOp) { setFout('Einddatum kan niet vóór de startdatum liggen.'); return }
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
    <div className="portaal-kaart">
      <h2>{bestaand ? 'Weektaak bewerken' : 'Nieuwe weektaak'}</h2>
      <form className="portaal-form" onSubmit={submit} style={{ maxWidth: 480 }}>
        <label>Titel
          <input value={titel} onChange={e => setTitel(e.target.value)} placeholder="bv. Week 31" />
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ flex: 1 }}>Start
            <input type="date" value={startOp} onChange={e => setStartOp(e.target.value)} required />
          </label>
          <label style={{ flex: 1 }}>Eind
            <input type="date" value={eindOp} onChange={e => setEindOp(e.target.value)} required />
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
          {opdrachten.map((o, i) => (
            <OpdrachtRij
              key={o.id ?? `nieuw-${i}`}
              opdracht={o}
              onWijzig={nieuw => wijzigOpdracht(i, nieuw)}
              onVerwijder={() => verwijderOpdracht(i)}
            />
          ))}
        </div>

        {opdrachten.length === 0 && <p className="portaal-leeg">Nog geen opdrachten toegevoegd.</p>}

        <button type="button" className="portaal-knop portaal-knop-subtiel" onClick={() => setToonKiezer(v => !v)}>
          + Opdracht toevoegen
        </button>
        {toonKiezer && (
          <ToolKiezer klasGroepen={klas.groepen} onKies={voegToe} onSluiten={() => setToonKiezer(false)} />
        )}

        {fout && <p className="portaal-fout">{fout}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="portaal-knop" disabled={bezig}>{bezig ? 'Bezig…' : 'Opslaan'}</button>
          <button type="button" className="portaal-knop portaal-knop-subtiel" onClick={onAnnuleren}>Annuleren</button>
        </div>
      </form>
    </div>
  )
}
