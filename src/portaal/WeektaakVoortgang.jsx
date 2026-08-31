import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { toolLabel } from '../lib/tools.js'
import { scoreKlasse } from './resultaatHelpers.js'

const sleutel = (opdrachtId, leerlingId) => `${opdrachtId}:${leerlingId}`

// Tijd die een leerling aan een opdracht besteedde (som_ms uit de view, zie
// migratie 0009). Leeg bij werk van vóór die meting — dan tonen we niets in
// plaats van een misleidende 0.
function kortTijd(ms) {
  if (!ms || ms < 1000) return null
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec} sec`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}u ${String(min % 60).padStart(2, '0')}`
}

// Matrix leerling × opdracht voor één weektaak. `som_max`/`doel_aantal` komen
// uit de view weektaak_voortgang (migratie 0007): "gemaakt" is de weergave-
// cap (min(som_max, doel)), zodat een leerling die vaker oefent dan gevraagd
// niet boven 100% getoond wordt — de kwaliteit (%) hieronder blijft wel over
// alles gerekend.
//
// Twee weergaven: de volle matrix (sorteerbaar per opdracht — klik op een
// kolomkop om te zien wie achterloopt) en de lijst met alleen wat nog niet af
// is, waar je een opdracht per leerling kunt vrijstellen.
export default function WeektaakVoortgang({ weektaak, klasId, alleenNietAf, onKiesLeerling }) {
  const [leerlingen, setLeerlingen] = useState(null)
  const [opdrachten, setOpdrachten] = useState([])
  const [voortgang, setVoortgang] = useState([])
  const [statussen, setStatussen] = useState(new Map())
  const [aangeraakt, setAangeraakt] = useState(new Set())
  const [sortering, setSortering] = useState({ kolom: 'naam', omgekeerd: false })
  const [opnieuwBezig, setOpnieuwBezig] = useState(null)  // cel die om bevestiging vraagt
  const [fout, setFout] = useState('')

  useEffect(() => {
    let actief = true
    async function laad() {
      const { data: opd } = await supabase
        .from('opdrachten').select('id, tool_id, aantal, volgorde')
        .eq('weektaak_id', weektaak.id).order('volgorde')
      if (!actief) return
      const opdrachtIds = (opd ?? []).map(o => o.id)

      const [{ data: lln }, { data: vg }, { data: tw }] = await Promise.all([
        supabase.from('profielen').select('id, weergavenaam')
          .eq('klas_id', klasId).eq('rol', 'leerling').order('weergavenaam'),
        supabase.from('weektaak_voortgang').select('opdracht_id, leerling_id, doel_aantal, som_score, som_max, som_ms, herkansingen')
          .eq('weektaak_id', weektaak.id),
        opdrachtIds.length
          ? supabase.from('toewijzingen').select('opdracht_id, leerling_id, status').in('opdracht_id', opdrachtIds)
          : Promise.resolve({ data: [] }),
      ])
      if (!actief) return
      setOpdrachten(opd ?? [])
      setLeerlingen(lln ?? [])
      setVoortgang(vg ?? [])
      setStatussen(new Map((tw ?? []).map(t => [sleutel(t.opdracht_id, t.leerling_id), t.status])))
      setAangeraakt(new Set())
      setOpnieuwBezig(null)
    }
    laad()
    return () => { actief = false }
  }, [weektaak.id, klasId])

  const vind = useCallback(
    (leerlingId, opdrachtId) => voortgang.find(v => v.leerling_id === leerlingId && v.opdracht_id === opdrachtId),
    [voortgang],
  )
  const statusVan = useCallback((leerlingId, opdrachtId) => statussen.get(sleutel(opdrachtId, leerlingId)), [statussen])

  // Wat er nog open staat: één regel per leerling per opdracht. Net
  // vrijgestelde regels blijven staan tot je de weergave verlaat, anders kun je
  // een verkeerd vinkje niet meer terugdraaien.
  const openstaand = useMemo(() => {
    const regels = []
    for (const l of leerlingen ?? []) {
      for (const o of opdrachten) {
        const vg = vind(l.id, o.id)
        if (!vg || !vg.doel_aantal) continue
        const status = statusVan(l.id, o.id)
        const vrij = status === 'vrijgesteld'
        const klaar = Number(vg.som_max) >= vg.doel_aantal
        if (klaar) continue
        if (vrij && !aangeraakt.has(sleutel(o.id, l.id))) continue
        regels.push({ leerling: l, opdracht: o, vg, vrij })
      }
    }
    return regels
  }, [leerlingen, opdrachten, vind, statusVan, aangeraakt])

  const sorteerOp = (kolom) => setSortering(s => ({ kolom, omgekeerd: s.kolom === kolom ? !s.omgekeerd : false }))

  const gesorteerd = useMemo(() => {
    const lijst = [...(leerlingen ?? [])]
    const { kolom, omgekeerd } = sortering
    if (kolom === 'naam') {
      lijst.sort((a, b) => a.weergavenaam.localeCompare(b.weergavenaam))
    } else {
      // Minst af bovenaan; wie hem niet hoeft te maken zakt altijd naar onderen,
      // in beide richtingen — anders verdringen ze de kinderen waar het om gaat.
      const deel = (l) => {
        const status = statusVan(l.id, kolom)
        const vg = vind(l.id, kolom)
        if (status === 'vrijgesteld' || !vg || !vg.doel_aantal) return null
        return Math.min(Number(vg.som_max), vg.doel_aantal) / vg.doel_aantal
      }
      lijst.sort((a, b) => {
        const da = deel(a), db = deel(b)
        if (da === null && db === null) return a.weergavenaam.localeCompare(b.weergavenaam)
        if (da === null) return 1
        if (db === null) return -1
        return da - db || a.weergavenaam.localeCompare(b.weergavenaam)
      })
    }
    return omgekeerd ? lijst.reverse() : lijst
  }, [leerlingen, sortering, vind, statusVan])

  // Opnieuw laten maken: alles wat tot nu toe gemaakt is telt niet meer mee
  // voor het doel (herkansing_vanaf, zie migratie 0010). De resultaten zelf
  // blijven staan — de foutenlijst van de leerling verandert dus niet.
  const zetOpnieuw = async (opdrachtId, leerlingId) => {
    const vg = vind(leerlingId, opdrachtId)
    if (!vg) return
    setOpnieuwBezig(null)
    setFout('')
    const { error } = await supabase.from('toewijzingen')
      .update({ herkansing_vanaf: new Date().toISOString(), herkansingen: (vg.herkansingen ?? 0) + 1 })
      .eq('opdracht_id', opdrachtId).eq('leerling_id', leerlingId)
    if (error) { setFout('Opnieuw zetten mislukt — probeer het nog eens.'); return }
    setVoortgang(prev => prev.map(v => (
      v.opdracht_id === opdrachtId && v.leerling_id === leerlingId
        ? { ...v, som_score: 0, som_max: 0, som_ms: 0, herkansingen: (v.herkansingen ?? 0) + 1 }
        : v
    )))
  }

  const zetVrijstelling = async (opdrachtId, leerlingId, vrij) => {
    const k = sleutel(opdrachtId, leerlingId)
    const vorige = statussen.get(k)
    setStatussen(prev => new Map(prev).set(k, vrij ? 'vrijgesteld' : 'open'))
    setAangeraakt(prev => new Set(prev).add(k))
    setFout('')
    const { error } = await supabase.from('toewijzingen')
      .update({ status: vrij ? 'vrijgesteld' : 'open' })
      .eq('opdracht_id', opdrachtId).eq('leerling_id', leerlingId)
    if (error) {
      setStatussen(prev => new Map(prev).set(k, vorige))
      setFout('Opslaan mislukt — probeer opnieuw.')
    }
  }

  if (leerlingen === null) return <p className="portaal-leeg">Laden…</p>
  if (leerlingen.length === 0) return <p className="portaal-leeg">Nog geen leerlingen in deze klas.</p>

  if (alleenNietAf) {
    const nogOpen = openstaand.filter(r => !r.vrij)
    return (
      <>
        <p className="portaal-leeg" style={{ marginTop: 0 }}>
          {nogOpen.length > 0
            ? <><strong>{new Set(nogOpen.map(r => r.leerling.id)).size} leerlingen</strong> hebben samen {nogOpen.length} opdracht{nogOpen.length === 1 ? '' : 'en'} openstaan. </>
            : null}
          Vink aan wat een leerling niet hoeft te maken — die opdracht telt dan niet
          meer mee als achterstand.
        </p>
        {fout && <p className="portaal-fout">{fout}</p>}
        {openstaand.length === 0
          ? <p className="portaal-leeg">Iedereen is klaar met alles.</p>
          : (
            <table className="portaal-tabel">
              <thead>
                <tr><th>Leerling</th><th>Opdracht</th><th>Gemaakt</th><th>Hoeft niet</th></tr>
              </thead>
              <tbody>
                {openstaand.map(({ leerling, opdracht, vg, vrij }) => (
                  <tr key={sleutel(opdracht.id, leerling.id)} className={vrij ? 'portaal-rij-vrijgesteld' : undefined}>
                    <td>
                      <button className="portaal-leerlingnaam" onClick={() => onKiesLeerling(leerling.id)}>{leerling.weergavenaam}</button>
                    </td>
                    <td>{toolLabel(opdracht.tool_id)}</td>
                    <td>
                      <strong>{Math.min(Number(vg.som_max), vg.doel_aantal)}/{vg.doel_aantal}</strong>
                      {Number(vg.som_max) === 0 && (
                        <span className="portaal-score-slecht">
                          {vg.herkansingen > 0 ? ` opnieuw beginnen (poging ${vg.herkansingen + 1})` : ' nog niet begonnen'}
                        </span>
                      )}
                    </td>
                    <td>
                      <label className="portaal-vinkje">
                        <input type="checkbox" checked={vrij} onChange={e => zetVrijstelling(opdracht.id, leerling.id, e.target.checked)} />
                        hoeft niet
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </>
    )
  }

  return (
    <>
      {fout && <p className="portaal-fout">{fout}</p>}
      <div className="portaal-tabel-scroll">
        <table className="portaal-tabel portaal-raster">
          <thead>
            <tr>
              <th>
                <button
                  className={sortering.kolom === 'naam' ? 'portaal-sorteer actief' : 'portaal-sorteer'}
                  onClick={() => sorteerOp('naam')}
                >Leerling{sortering.kolom === 'naam' ? (sortering.omgekeerd ? ' ▴' : ' ▾') : ''}</button>
              </th>
              {opdrachten.map(o => (
                <th key={o.id}>
                  <button
                    className={sortering.kolom === o.id ? 'portaal-sorteer actief' : 'portaal-sorteer'}
                    onClick={() => sorteerOp(o.id)}
                    title="Sorteer op deze opdracht — minst af bovenaan"
                  >{toolLabel(o.tool_id)}{sortering.kolom === o.id ? (sortering.omgekeerd ? ' ▴' : ' ▾') : ''}</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gesorteerd.map(l => (
              <tr key={l.id}>
                <td>
                  <button className="portaal-leerlingnaam" onClick={() => onKiesLeerling(l.id)}>{l.weergavenaam}</button>
                </td>
                {opdrachten.map(o => {
                  const v = vind(l.id, o.id)
                  if (statusVan(l.id, o.id) === 'vrijgesteld') {
                    return <td key={o.id}><span className="portaal-zacht">hoeft niet</span></td>
                  }
                  if (!v || !v.doel_aantal) return <td key={o.id} className="portaal-cel-leeg">—</td>
                  const gemaakt = Math.min(v.som_max, v.doel_aantal)
                  const pct = v.som_max > 0 ? Math.round((v.som_score / v.som_max) * 100) : 0
                  const foutAantal = v.som_max - v.som_score
                  const tijd = kortTijd(Number(v.som_ms))
                  const cel = sleutel(o.id, l.id)
                  return (
                    <td key={o.id}>
                      <strong>{gemaakt}/{v.doel_aantal}</strong>
                      {v.herkansingen > 0 && <> <span className="portaal-zacht">poging {v.herkansingen + 1}</span></>}
                      {v.som_max > 0 && (
                        <>
                          {' '}<span className={scoreKlasse(pct)}>{pct}%</span>
                          {tijd && <><br /><span className="portaal-zacht">⏱ {tijd}</span></>}
                          {foutAantal > 0 && (
                            <>
                              <br />
                              <button
                                className="portaal-terug" style={{ padding: 0, fontSize: '0.78rem' }}
                                onClick={() => onKiesLeerling(l.id)}
                                title="Open het leerlingprofiel met de foutenlijst"
                              >{Math.round(foutAantal)} fout →</button>
                            </>
                          )}
                        </>
                      )}
                      {/* Twee tikken: een misklik in dit raster is zo gebeurd en
                          de teller terugzetten kun je niet ongedaan maken. */}
                      {v.som_max > 0 && (
                        <>
                          <br />
                          {opnieuwBezig === cel ? (
                            <>
                              <button className="portaal-minilink" onClick={() => zetOpnieuw(o.id, l.id)}>ja, opnieuw</button>
                              {' · '}
                              <button className="portaal-minilink" onClick={() => setOpnieuwBezig(null)}>nee</button>
                            </>
                          ) : (
                            <button
                              className="portaal-minilink" onClick={() => setOpnieuwBezig(cel)}
                              title="Zet de teller op 0: de leerling maakt deze opdracht opnieuw. Het gemaakte werk blijft bewaard."
                            >↺ opnieuw laten maken</button>
                          )}
                        </>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
