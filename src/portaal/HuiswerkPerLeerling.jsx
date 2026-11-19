import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { TOOL_BY_ID } from '../lib/tools.js'
import { doelStandVan } from '../lib/weektaak.js'
import { doelSleutel } from '../lib/vaardigheden.js'
import { slaWeektaakOp, controleerOpdrachten } from './weektaakOpslaan.js'
import ToolKiezer from './ToolKiezer.jsx'
import OpdrachtRij from './OpdrachtRij.jsx'
import { Knop, TerugKnop } from '../ui/index.jsx'

// Huiswerk → Per leerling. Klik een kind aan en zie de doelen die je voor hem
// klaargezet hebt (tabblad Doelen) in drie bakjes: open (nog niet aan
// begonnen), nog niet behaald en behaald. Wat nog niet behaald is zet je met
// één knop in zijn huiswerk. Daaronder kies je zelf andere oefeningen, net als
// bij een weektaak.

const vandaag = () => new Date().toLocaleDateString('sv-SE')
const overDagen = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE') }
const korteDatum = (s) => new Date(s + 'T12:00').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })

function huiswerkOpdracht(doel) {
  const info = TOOL_BY_ID[doel.toolId]
  return {
    toolId: doel.toolId,
    aantal: info?.eenheid === 'minuten' ? null : info?.standaardAantal ?? 10,
    config: { ...(doel.config ?? {}), persoonlijk: 'huiswerk' },
  }
}

async function laadLeerling(leerlingId) {
  const [{ data: tw }] = await Promise.all([
    supabase.from('toewijzingen').select('opdracht_id, status, opdrachten(id, tool_id, config, aantal, weektaak_id)').eq('leerling_id', leerlingId),
  ])
  const opdrachten = (tw ?? []).filter(t => t.status !== 'vrijgesteld' && t.opdrachten).map(t => t.opdrachten)
  const doelOpd = opdrachten.filter(o => o.config?.persoonlijk === 'doel')
  const huisOpd = opdrachten.filter(o => o.config?.persoonlijk === 'huiswerk')
  const wtIds = [...new Set([...doelOpd, ...huisOpd].map(o => o.weektaak_id))]
  const [{ data: wts }, { data: dv }, { data: vg }] = await Promise.all([
    wtIds.length ? supabase.from('weektaken').select('id, titel, eind_op').in('id', wtIds) : Promise.resolve({ data: [] }),
    doelOpd.length ? supabase.from('doel_voortgang').select('opdracht_id, gemaakt, laatste_goed, laatste_aantal, gehaald').eq('leerling_id', leerlingId).in('opdracht_id', doelOpd.map(o => o.id)) : Promise.resolve({ data: [] }),
    huisOpd.length ? supabase.from('weektaak_voortgang').select('opdracht_id, doel_aantal, som_max, afgerond').eq('leerling_id', leerlingId).in('opdracht_id', huisOpd.map(o => o.id)) : Promise.resolve({ data: [] }),
  ])
  const wtBij = new Map((wts ?? []).map(w => [w.id, w]))
  const dvBij = new Map((dv ?? []).map(d => [d.opdracht_id, d]))
  const vgBij = new Map((vg ?? []).map(v => [v.opdracht_id, v]))

  const doelen = doelOpd.map(o => {
    const stand = doelStandVan(dvBij.get(o.id))
    return {
      sleutel: 'd' + o.id, titel: wtBij.get(o.weektaak_id)?.titel ?? TOOL_BY_ID[o.tool_id]?.label ?? o.tool_id,
      sub: stand.gemaakt ? `klaargezet doel · ${stand.gemaakt} gemaakt · ${stand.pct}% goed` : 'klaargezet doel · nog niet aan begonnen',
      status: stand.gehaald ? 'behaald' : stand.gemaakt > 0 ? 'niet' : 'open',
      doel: { toolId: o.tool_id, config: o.config, titel: wtBij.get(o.weektaak_id)?.titel },
    }
  })

  const huiswerk = huisOpd.map(o => {
    const v = vgBij.get(o.id), wt = wtBij.get(o.weektaak_id)
    const doel = v?.doel_aantal ?? o.aantal
    return {
      id: o.id, titel: wt?.titel ?? TOOL_BY_ID[o.tool_id]?.label, eind: wt?.eind_op, sleutel: doelSleutel(o.tool_id, o.config),
      af: !!v?.afgerond || (doel != null && (v?.som_max ?? 0) >= doel), gemaakt: Math.min(v?.som_max ?? 0, doel ?? 0), doel,
    }
  }).filter(h => !h.eind || h.eind >= vandaag())

  return { doelen, huiswerk }
}

const BAKJES = [
  { key: 'open', titel: 'Open', uitleg: 'Klaargezet, nog niet aan begonnen' },
  { key: 'niet', titel: 'Nog niet behaald', uitleg: 'Wel geoefend, maar nog onder de 80% goed' },
  { key: 'behaald', titel: 'Behaald', uitleg: '80% of meer goed' },
]

function Leerling({ klas, leerling, onTerug }) {
  const [data, setData] = useState(null)
  const [teller, setTeller] = useState(0)
  const [eind, setEind] = useState(overDagen(7))
  const [bezig, setBezig] = useState(null)
  const [melding, setMelding] = useState('')

  useEffect(() => {
    let actief = true
    laadLeerling(leerling.id).then(d => { if (actief) setData(d) }).catch(() => { if (actief) setData({ fout: true }) })
    return () => { actief = false }
  }, [klas.id, leerling.id, teller])

  const inHuiswerk = useMemo(() => new Set((data?.huiswerk ?? []).filter(h => !h.af).map(h => h.sleutel)), [data])
  const items = data?.doelen ?? []
  const [eigen, setEigen] = useState([])          // zelf gekozen oefeningen
  const [kiezer, setKiezer] = useState(false)
  const staatErIn = (x) => x.doel && inHuiswerk.has(doelSleutel(x.doel.toolId, x.doel.config))
  const kanErbij = items.filter(x => x.status !== 'behaald' && x.doel && !staatErIn(x))

  const zetInHuiswerk = async (lijst, sleutel) => {
    setBezig(sleutel); setMelding('')
    try {
      // dubbele doelen (zelfde oefening en instellingen) maar één keer
      const uniek = [...new Map(lijst.map(x => [doelSleutel(x.doel.toolId, x.doel.config), x])).values()]
      const opdrachten = uniek.map(x => x.opdracht ?? huiswerkOpdracht(x.doel))
      await slaWeektaakOp({
        weektaakId: null, schoolId: klas.school_id, klasId: klas.id,
        titel: uniek.length === 1 ? (uniek[0].doel.titel || uniek[0].titel) : `Huiswerk voor ${leerling.weergavenaam}`,
        startOp: vandaag(), eindOp: eind,
        opdrachten,
        leerlingIds: [leerling.id],
      })
      setMelding(`${uniek.length === 1 ? 'Staat' : `${uniek.length} oefeningen staan`} in het huiswerk van ${leerling.weergavenaam}, tot en met ${korteDatum(eind)}.`)
      setTeller(t => t + 1)
      return true
    } catch {
      setMelding('Klaarzetten is niet gelukt. Probeer het nog eens.')
    } finally {
      setBezig(null)
    }
  }

  return (
    <div className="portaal-kaart">
      <TerugKnop vast={false} onClick={onTerug}>Alle leerlingen</TerugKnop>
      <div className="portaal-sectiekop">
        <h2 className="kk-m-0">{leerling.weergavenaam}</h2>
        <label className="portaal-veld" style={{ maxWidth: 200 }}>
          <span className="portaal-veld-label">Huiswerk af op</span>
          <input type="date" value={eind} min={vandaag()} onChange={e => setEind(e.target.value || overDagen(7))} />
        </label>
      </div>

      {data === null && <p className="portaal-leeg">Laden…</p>}
      {data?.fout && <p className="portaal-fout">De gegevens konden niet geladen worden.</p>}
      {data && !data.fout && (
        <>
          {melding && <p className={melding.startsWith('Klaarzetten') ? 'portaal-fout' : 'portaal-succes'}>{melding}</p>}

          <div className="hw-kop">
            <h3 className="kk-m-0">Huiswerk nu</h3>
            {kanErbij.length > 0 && (
              <Knop variant="primair" maat="sm" disabled={!!bezig} onClick={() => zetInHuiswerk(kanErbij, 'alles')}>
                {bezig === 'alles' ? 'Bezig…' : `Alles wat nog niet behaald is in het huiswerk (${kanErbij.length})`}
              </Knop>
            )}
          </div>
          {data.huiswerk.length === 0
            ? <p className="portaal-leeg">Geen huiswerk op dit moment.</p>
            : (
              <div className="hw-lijst">
                {data.huiswerk.map(h => (
                  <div key={h.id} className={`hw-item${h.af ? ' hw-af' : ''}`}>
                    <div><strong>{h.titel}</strong><span className="portaal-zacht">{h.eind ? `af op ${korteDatum(h.eind)}` : ''}{h.doel ? ` · ${h.gemaakt} van ${h.doel} gemaakt` : ''}</span></div>
                    <span className={`hw-status${h.af ? ' af' : ''}`}>{h.af ? 'af' : 'bezig'}</span>
                  </div>
                ))}
              </div>
            )}

          {items.length === 0 && <p className="portaal-leeg kk-mt-3">Voor {leerling.weergavenaam} staan nog geen doelen klaar. Zet ze klaar bij het tabblad Doelen, of kies hieronder zelf iets.</p>}
          <div className="hw-bakjes">
            {BAKJES.map(b => {
              const lijst = items.filter(x => x.status === b.key)
              return (
                <section key={b.key} className={`hw-bakje hw-${b.key}`}>
                  <h3>{b.titel} <span className="portaal-zacht">{lijst.length}</span></h3>
                  <p className="portaal-zacht kk-mt-0">{b.uitleg}</p>
                  {lijst.length === 0 && <p className="portaal-leeg">Niets</p>}
                  {lijst.map(x => (
                    <div key={x.sleutel} className="hw-item">
                      <div><strong>{x.titel}</strong><span className="portaal-zacht">{x.sub}</span></div>
                      {b.key !== 'behaald' && (
                        staatErIn(x) ? <span className="hw-status">in huiswerk</span>
                          : x.doel ? <Knop variant="secundair" maat="sm" disabled={!!bezig} onClick={() => zetInHuiswerk([x], x.sleutel)}>{bezig === x.sleutel ? 'Bezig…' : 'In huiswerk'}</Knop>
                            : null
                      )}
                    </div>
                  ))}
                </section>
              )
            })}
          </div>
          <div className="hw-zelf">
            <h3 className="kk-m-0">Zelf iets kiezen</h3>
            <p className="portaal-zacht kk-mt-0">Kies uit alle oefeningen, net als bij een weektaak. Stel per oefening in hoeveel en wat, en zet het daarna in het huiswerk van {leerling.weergavenaam}.</p>
            <div className="portaal-opdrachtlijst">
              {eigen.map((o, i) => (
                <OpdrachtRij key={i} opdracht={o} nummer={i + 1}
                  onWijzig={nieuw => setEigen(l => l.map((x, j) => j === i ? nieuw : x))}
                  onVerwijder={() => setEigen(l => l.filter((_, j) => j !== i))} />
              ))}
            </div>
            {!kiezer && (
              <div className="kk-rij kk-mt-3">
                <Knop variant="secundair" maat="sm" onClick={() => setKiezer(true)}>+ Opdracht toevoegen</Knop>
                {eigen.length > 0 && (
                  <Knop variant="primair" maat="sm" disabled={!!bezig} onClick={async () => {
                    const fout = controleerOpdrachten(eigen)
                    if (fout) { setMelding('Klaarzetten is niet gelukt: ' + fout); return }
                    const ok = await zetInHuiswerk(eigen.map((o, i) => ({ doel: { toolId: o.toolId, config: o.config, titel: TOOL_BY_ID[o.toolId]?.label }, opdracht: { ...o, config: { ...o.config, persoonlijk: 'huiswerk' } }, titel: String(i) })), 'eigen')
                    if (ok) setEigen([])
                  }}>{bezig === 'eigen' ? 'Bezig…' : `In huiswerk zetten (${eigen.length})`}</Knop>
                )}
              </div>
            )}
            {kiezer && (
              <ToolKiezer klasGroepen={klas.groepen} onSluiten={() => setKiezer(false)} onKies={({ toolId, config = {} }) => {
                const info = TOOL_BY_ID[toolId]
                setEigen(l => [...l, { toolId, aantal: info?.eenheid === 'minuten' ? null : info?.standaardAantal ?? 1, config }])
                setKiezer(false)
              }} />
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function HuiswerkPerLeerling({ klas }) {
  const [leerlingen, setLeerlingen] = useState(null)
  const [gekozen, setGekozen] = useState(null)
  useEffect(() => {
    let actief = true
    supabase.from('profielen').select('id, weergavenaam').eq('klas_id', klas.id).eq('rol', 'leerling').order('weergavenaam')
      .then(({ data }) => { if (actief) setLeerlingen(data ?? []) })
    return () => { actief = false }
  }, [klas.id])

  if (gekozen) return <Leerling klas={klas} leerling={gekozen} onTerug={() => setGekozen(null)} />
  return (
    <div className="portaal-kaart">
      <h2>Per leerling</h2>
      <p className="portaal-zacht kk-mt-0">Klik op een leerling: je ziet welke doelen open staan, welke nog niet behaald zijn en welke wel. Wat nog niet behaald is zet je met één knop in het huiswerk.</p>
      {leerlingen === null && <p className="portaal-leeg">Laden…</p>}
      {leerlingen?.length === 0 && <p className="portaal-leeg">Nog geen leerlingen in deze klas.</p>}
      <div className="portaal-naamlijst">
        {leerlingen?.map(l => (
          <div key={l.id} className="portaal-naamrij">
            <button className="portaal-naamknop" onClick={() => setGekozen(l)}>
              <span className="portaal-naamknop-naam">{l.weergavenaam}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
