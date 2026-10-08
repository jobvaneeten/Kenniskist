import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { TOOL_BY_ID, toolLabel } from '../lib/tools.js'
import { SOORT_TEKST, ZONDER_EIND } from './soortTekst.js'
import ToolKiezer from './ToolKiezer.jsx'
import DoelKiezer from './DoelKiezer.jsx'
import OpdrachtRij from './OpdrachtRij.jsx'
import { slaWeektaakOp } from './weektaakOpslaan.js'
import { Knop } from '../ui/index.jsx'

function vandaag() { return new Date().toLocaleDateString('sv-SE') }
function overDagen(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE')
}

// Wat er per soort anders is. Een taak of doel is per leerling, dus daar staat
// standaard niemand aangevinkt en is er geen periode (zie ZONDER_EIND).
const STAP1 = {
  weektaak: { kop: 'Wanneer loopt hij?', label: 'Titel', placeholder: 'bv. Week 36', hint: 'Leeg laten mag; dan heet hij "Weektaak".' },
  taak: { kop: 'Wat is de taak?', label: 'Taak', placeholder: 'bv. Oefen de tafel van 7', hint: 'Leeg laten mag; dan heet hij zoals de oefening.' },
  doel: { kop: 'Wat is het doel?', label: 'Doel', placeholder: 'bv. Ik kan het lijdend voorwerp vinden', hint: 'Leeg laten mag; dan heet hij zoals het doel dat je bij stap 2 kiest.' },
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
export default function WeektaakForm({ klas, soort = 'weektaak', bestaand, onKlaar, onAnnuleren }) {
  const persoonlijk = soort !== 'weektaak'
  const tekst = SOORT_TEKST[soort]
  const stap1 = STAP1[soort]
  const [titel, setTitel] = useState(bestaand?.titel ?? '')
  const [startOp, setStartOp] = useState(bestaand?.start_op ?? vandaag())
  const [eindOp, setEindOp] = useState(bestaand?.eind_op ?? (persoonlijk ? ZONDER_EIND : overDagen(6)))
  const [opdrachten, setOpdrachten] = useState(() =>
    (bestaand?.opdrachten ?? []).map(o => ({ id: o.id, toolId: o.tool_id, aantal: o.aantal, config: o.config ?? {} }))
  )
  const [toonKiezer, setToonKiezer] = useState(false)
  // Bij een doel eerst de doelenlijst; "zelf kiezen" valt terug op ToolKiezer.
  const [zelfKiezen, setZelfKiezen] = useState(false)
  const [fout, setFout] = useState('')
  const [bezig, setBezig] = useState(false)

  // Wie krijgt deze weektaak. Standaard de hele klas; bij bewerken de
  // leerlingen die er nu al een toewijzing voor hebben.
  const [leerlingen, setLeerlingen] = useState([])
  const [gekozen, setGekozen] = useState(null)   // null = nog aan het laden
  const opdrachtSleutel = (bestaand?.opdrachten ?? []).map(o => o.id).filter(Boolean).join(',')

  useEffect(() => {
    let actief = true
    async function laad() {
      const { data: lln } = await supabase
        .from('profielen').select('id, weergavenaam')
        .eq('klas_id', klas.id).eq('rol', 'leerling').order('weergavenaam')
      if (!actief) return
      setLeerlingen(lln ?? [])

      const ids = opdrachtSleutel ? opdrachtSleutel.split(',') : []
      if (ids.length) {
        const { data: tw } = await supabase
          .from('toewijzingen').select('leerling_id').in('opdracht_id', ids)
        if (!actief) return
        const bezet = new Set((tw ?? []).map(t => t.leerling_id))
        setGekozen(bezet.size || persoonlijk ? bezet : new Set((lln ?? []).map(l => l.id)))
      } else {
        setGekozen(new Set(persoonlijk ? [] : (lln ?? []).map(l => l.id)))
      }
    }
    laad()
    return () => { actief = false }
  }, [klas.id, opdrachtSleutel, persoonlijk])

  const toggelLeerling = (id) => setGekozen(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  // Vanuit DoelKiezer komen ook de instellingen en de titel mee; die titel
  // wordt alleen ingevuld als de leerkracht er zelf nog niets heeft staan.
  const voegToe = ({ toolId, config = {}, titel: doelTitel }) => {
    const info = TOOL_BY_ID[toolId]
    setOpdrachten(prev => [...prev, { toolId, aantal: info?.standaardAantal ?? 1, config }])
    if (doelTitel) setTitel(t => t.trim() ? t : doelTitel)
    setToonKiezer(false)
    setZelfKiezen(false)
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
    if (!gekozen || gekozen.size === 0) { setFout(`Kies minstens één leerling die deze ${tekst.enkel} krijgt.`); return }
    setBezig(true)
    try {
      await slaWeektaakOp({
        weektaakId: bestaand?.id ?? null,
        schoolId: klas.school_id, klasId: klas.id,
        titel: titel.trim() || (persoonlijk ? toolLabel(opdrachten[0].toolId) : 'Weektaak'), startOp, eindOp,
        // Een doel heeft geen aantal: het is behaald bij 80% goed van de
        // laatste 20 opgaven (zie migratie 0016_doel_voortgang.sql).
        opdrachten: persoonlijk
          ? opdrachten.map(o => ({ ...o, aantal: soort === 'doel' ? null : o.aantal, config: { ...o.config, persoonlijk: soort } }))
          : opdrachten,
        leerlingIds: [...gekozen],
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
        <h2>{bestaand ? `${tekst.enkel[0].toUpperCase()}${tekst.enkel.slice(1)} bewerken` : tekst.nieuw.slice(2)}</h2>

        <div className="portaal-stap">
          <span className="portaal-stap-nr">1</span>
          <div className="portaal-stap-inhoud">
            <h3>{stap1.kop}</h3>
            <p className="portaal-zacht">
              {soort === 'weektaak' && 'De leerlingen zien de opdrachten alleen tussen deze twee datums.'}
              {soort === 'taak' && 'De taak blijft staan tot de leerling hem af heeft.'}
              {soort === 'doel' && 'Het doel blijft staan tot jij hem verwijdert.'}
            </p>
            <div className="portaal-veldrij">
              <label className="portaal-veld">
                <span className="portaal-veld-label">{stap1.label}</span>
                <input value={titel} onChange={e => setTitel(e.target.value)} placeholder={stap1.placeholder} />
                <span className="portaal-veld-hint">{stap1.hint}</span>
              </label>
              {!persoonlijk && (
                <>
                  <label className="portaal-veld">
                    <span className="portaal-veld-label">Start</span>
                    <input type="date" value={startOp} onChange={e => setStartOp(e.target.value)} required />
                  </label>
                  <label className="portaal-veld">
                    <span className="portaal-veld-label">Eind</span>
                    <input type="date" value={eindOp} onChange={e => setEindOp(e.target.value)} required />
                  </label>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="portaal-stap">
          <span className="portaal-stap-nr">2</span>
          <div className="portaal-stap-inhoud">
            <h3>{soort === 'doel' ? 'Waarmee oefenen ze het doel?' : 'Wat moeten ze doen?'}</h3>
            <p className="portaal-zacht">
              {soort === 'doel'
                ? 'Kies een vak en dan het doel, bv. Taal → Interpunctie → Aanhalingstekens of Rekenen → Verhaaltjessommen → Blok 2. De leerling start er met één klik mee.'
                : 'Elke opdracht is één oefening met zijn eigen instellingen. Je kunt er zoveel toevoegen als je wilt.'}
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
                  zonderAantal={soort === 'doel'}
                  onWijzig={nieuw => wijzigOpdracht(i, nieuw)}
                  onVerwijder={() => verwijderOpdracht(i)}
                />
              ))}
            </div>

            {!toonKiezer && (
              <Knop className="kk-mt-3" type="button" variant="primair" maat="sm" onClick={() => setToonKiezer(true)}>
                {soort === 'doel' ? '+ Doel kiezen' : '+ Opdracht toevoegen'}
              </Knop>
            )}
            {toonKiezer && soort === 'doel' && !zelfKiezen && (
              <DoelKiezer
                klasGroepen={klas.groepen} onKies={voegToe}
                onSluiten={() => setToonKiezer(false)} onZelfKiezen={() => setZelfKiezen(true)}
              />
            )}
            {toonKiezer && (soort !== 'doel' || zelfKiezen) && (
              <ToolKiezer klasGroepen={klas.groepen} onKies={voegToe} onSluiten={() => { setToonKiezer(false); setZelfKiezen(false) }} />
            )}
          </div>
        </div>

        <div className="portaal-stap">
          <span className="portaal-stap-nr">3</span>
          <div className="portaal-stap-inhoud">
            <h3>Voor wie?</h3>
            <p className="portaal-zacht">
              {persoonlijk
                ? `Vink aan voor wie deze ${tekst.enkel} is. Alleen zij zien hem, bij "Speciaal voor mij".`
                : 'Standaard krijgt de hele klas hem. Vink uit wie hem niet hoeft te maken — bijvoorbeeld een kind dat aan iets anders werkt.'}
            </p>
            {gekozen === null && <p className="portaal-leeg">Laden…</p>}
            {gekozen !== null && leerlingen.length === 0 && (
              <p className="portaal-leeg">Er zitten nog geen leerlingen in deze klas.</p>
            )}
            {gekozen !== null && leerlingen.length > 0 && (
              <>
                <div className="portaal-veld-kop">
                  <span className="portaal-zacht">{gekozen.size} van {leerlingen.length} geselecteerd</span>
                  <span className="portaal-zacht">
                    <button type="button" className="portaal-minilink" onClick={() => setGekozen(new Set(leerlingen.map(l => l.id)))}>allemaal</button>
                    {' · '}
                    <button type="button" className="portaal-minilink" onClick={() => setGekozen(new Set())}>niemand</button>
                  </span>
                </div>
                <div className="portaal-keuzevakjes">
                  {leerlingen.map(l => (
                    <label key={l.id} className={gekozen.has(l.id) ? 'portaal-vakje aan' : 'portaal-vakje'}>
                      <input type="checkbox" checked={gekozen.has(l.id)} onChange={() => toggelLeerling(l.id)} />
                      {l.weergavenaam}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="portaal-stap">
          <span className="portaal-stap-nr">4</span>
          <div className="portaal-stap-inhoud">
            <h3>Klaarzetten</h3>
            <p className="portaal-zacht">
              Bij opslaan krijgt <strong>{gekozen?.size === 1 ? '1 aangevinkte leerling' : `${gekozen?.size ?? 0} aangevinkte leerlingen`}</strong> alle opdrachten.
              Daarna kun je via Differentiëren per leerling een losse opdracht weghalen of het aantal
              aanpassen, en via "Alleen niet af" iemand vrijstellen.
            </p>
            {fout && <p className="portaal-fout">{fout}</p>}
            <div className="kk-rij kk-mt-1">
              <Knop type="submit" variant="primair" maat="sm" disabled={bezig}>
                {bezig ? 'Bezig…' : bestaand ? 'Wijzigingen opslaan' : `${tekst.enkel[0].toUpperCase()}${tekst.enkel.slice(1)} klaarzetten`}
              </Knop>
              <Knop type="button" variant="secundair" maat="sm" onClick={onAnnuleren}>Annuleren</Knop>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
