import { useState } from 'react'
import { doelSleutel } from '../lib/vaardigheden.js'
import { GRENS, vandaag, doelTitel } from './dicteeDoelen.js'
import { slaWeektaakOp } from './weektaakOpslaan.js'
import { ZONDER_EIND } from './soortTekst.js'
import { Knop } from '../ui/index.jsx'

// Bij een categorie in de dicteeanalyse (DicteeTab.jsx): die categorie meteen
// als doel klaarzetten. Aangevinkt staan de leerlingen die meer dan 80% van de
// plekken in die categorie fout hadden; de leerkracht kan er zelf nog bij
// vinken. Leerlingen die dit doel al hebben, kunnen niet nog een keer.

export default function DicteeDoelKlaarzetten({ catId, kansen, leerlingen, naam, klas, bestaand, onKlaargezet }) {
  const [open, setOpen] = useState(false)
  const config = { cats: [catId] }
  const heeftAl = bestaand?.get(doelSleutel('dictee-categorie', config)) ?? new Set()
  const lijst = [...leerlingen]
    .map(l => ({ ...l, deel: kansen ? l.fout / kansen : 0 }))
    .sort((x, y) => y.deel - x.deel)
  const [gekozen, setGekozen] = useState(() => new Set(lijst.filter(l => l.deel > GRENS).map(l => l.id)))
  const [status, setStatus] = useState('')

  if (!lijst.length) return null
  const wissel = (id) => setGekozen(g => { const n = new Set(g); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const ids = [...gekozen].filter(id => !heeftAl.has(id))

  const zetKlaar = async () => {
    setStatus('bezig')
    try {
      await slaWeektaakOp({
        weektaakId: null, schoolId: klas.school_id, klasId: klas.id, titel: doelTitel(catId),
        startOp: vandaag(), eindOp: ZONDER_EIND,
        opdrachten: [{ toolId: 'dictee-categorie', aantal: null, config: { ...config, persoonlijk: 'doel' } }],
        leerlingIds: ids,
      })
      onKlaargezet?.(doelSleutel('dictee-categorie', config), ids)
      setStatus(`Klaargezet als doel voor ${ids.length} ${ids.length === 1 ? 'leerling' : 'leerlingen'}. Je vindt het bij het tabblad Doelen.`)
    } catch {
      setStatus('Klaarzetten is niet gelukt. Probeer het nog eens.')
    }
  }

  if (!open) {
    const aantal = lijst.filter(l => l.deel > GRENS && !heeftAl.has(l.id)).length
    return (
      <div className="pd-doel">
        <Knop variant="secundair" maat="sm" icoon="doel" onClick={() => setOpen(true)}>
          Klaarzetten als doel{aantal ? ` (${aantal})` : ''}
        </Knop>
        {status && <span className="portaal-zacht pd-klein">{status}</span>}
      </div>
    )
  }
  return (
    <div className="pd-doel open">
      <p className="portaal-zacht pd-klein">
        Aangevinkt: wie meer dan 80% van deze categorie fout had. Je kunt zelf nog leerlingen aan- of uitvinken.
      </p>
      <div className="pd-doel-lijst">
        {lijst.map(l => {
          const al = heeftAl.has(l.id)
          return (
            <label key={l.id} className={'portaal-vinkje' + (al ? ' pd-al' : '')}>
              <input type="checkbox" disabled={al} checked={al || gekozen.has(l.id)} onChange={() => wissel(l.id)} />
              {naam(l.id)} <span className="portaal-zacht">{l.fout} van {kansen} fout{al ? ' · heeft dit doel al' : ''}</span>
            </label>
          )
        })}
      </div>
      <div className="pd-doel-knoppen">
        <Knop variant="primair" maat="sm" disabled={!ids.length || status === 'bezig'} onClick={zetKlaar}>
          {status === 'bezig' ? 'Bezig…' : `Zet klaar voor ${ids.length} ${ids.length === 1 ? 'leerling' : 'leerlingen'}`}
        </Knop>
        <Knop variant="subtiel" maat="sm" onClick={() => setOpen(false)}>Sluiten</Knop>
      </div>
      {status && status !== 'bezig' && <p className="portaal-zacht pd-klein">{status}</p>}
    </div>
  )
}
