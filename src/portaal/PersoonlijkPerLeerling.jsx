import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { doelStandVan } from '../lib/weektaak.js'
import { DoelCel } from './WeektaakVoortgang.jsx'
import LeerlingDetail from './LeerlingDetail.jsx'
import { TerugKnop } from '../ui/index.jsx'

// Taken of doelen per leerling: eerst de leerlingen, dan wat één leerling
// allemaal heeft en hoe ver hij is, dan het werk en de fouten van één doel of
// taak. `weektaken` komt uit haalWeektaken (WeektaakTab.jsx), met de ids van
// de opdrachten erin.
export default function PersoonlijkPerLeerling({ klas, soort, weektaken, tekst }) {
  const [leerlingen, setLeerlingen] = useState(null)
  const [toewijzingen, setToewijzingen] = useState([])
  const [voortgang, setVoortgang] = useState(new Map())
  const [doelen, setDoelen] = useState(new Map())
  const [leerlingId, setLeerlingId] = useState(null)
  const [item, setItem] = useState(null)

  const opdrachtIds = useMemo(() => weektaken.flatMap(wt => wt.opdrachten.map(o => o.id)), [weektaken])
  const idSleutel = opdrachtIds.join(',')

  useEffect(() => {
    let actief = true
    async function laad() {
      const ids = idSleutel ? idSleutel.split(',') : []
      const leeg = Promise.resolve({ data: [] })
      const [{ data: lln }, { data: tw }, { data: vg }, { data: dv }] = await Promise.all([
        supabase.from('profielen').select('id, weergavenaam').eq('klas_id', klas.id).eq('rol', 'leerling').order('weergavenaam'),
        ids.length ? supabase.from('toewijzingen').select('opdracht_id, leerling_id, status').in('opdracht_id', ids) : leeg,
        ids.length ? supabase.from('weektaak_voortgang').select('opdracht_id, leerling_id, doel_aantal, som_max, afgerond').in('opdracht_id', ids) : leeg,
        ids.length && soort === 'doel'
          ? supabase.from('doel_voortgang').select('opdracht_id, leerling_id, gemaakt, laatste_goed, laatste_aantal, gehaald').in('opdracht_id', ids)
          : leeg,
      ])
      if (!actief) return
      setLeerlingen(lln ?? [])
      setToewijzingen((tw ?? []).filter(t => t.status !== 'vrijgesteld'))
      setVoortgang(new Map((vg ?? []).map(v => [`${v.opdracht_id}:${v.leerling_id}`, v])))
      setDoelen(new Map((dv ?? []).map(d => [`${d.opdracht_id}:${d.leerling_id}`, d])))
    }
    laad()
    return () => { actief = false }
  }, [klas.id, soort, idSleutel])

  // Per leerling: zijn doelen/taken, elk met de stand per opdracht.
  const perLeerling = useMemo(() => {
    const map = new Map()
    for (const l of leerlingen ?? []) {
      const mijn = new Set(toewijzingen.filter(t => t.leerling_id === l.id).map(t => t.opdracht_id))
      const items = weektaken
        .filter(wt => wt.opdrachten.some(o => mijn.has(o.id)))
        .map(wt => {
          const opdrachten = wt.opdrachten.filter(o => mijn.has(o.id)).map(o => {
            const k = `${o.id}:${l.id}`
            const v = voortgang.get(k)
            if (soort === 'doel') {
              const stand = doelStandVan(doelen.get(k))
              return { id: o.id, stand, klaar: stand.gehaald }
            }
            const klaar = !!v && (v.afgerond || (v.doel_aantal != null && Number(v.som_max) >= v.doel_aantal))
            return { id: o.id, v, klaar }
          })
          return { wt, opdrachten, klaar: opdrachten.every(o => o.klaar) }
        })
      map.set(l.id, items)
    }
    return map
  }, [leerlingen, toewijzingen, voortgang, doelen, weektaken, soort])

  const woord = soort === 'doel' ? 'behaald' : 'af'
  const leerling = leerlingen?.find(l => l.id === leerlingId)

  if (leerling && item) {
    return (
      <>
        <div className="portaal-kruimels">
          <button onClick={() => { setLeerlingId(null); setItem(null) }}>Alle leerlingen</button>
          <span>›</span>
          <button onClick={() => setItem(null)}>{leerling.weergavenaam}</button>
          <span>›</span>
          <strong>{item.wt.titel}</strong>
        </div>
        <LeerlingDetail leerlingId={leerling.id} opdrachtIds={item.opdrachten.map(o => o.id)} kop={item.wt.titel} />
      </>
    )
  }

  if (leerling) {
    const items = perLeerling.get(leerling.id) ?? []
    return (
      <div className="portaal-kaart">
        <TerugKnop vast={false} onClick={() => setLeerlingId(null)}>Alle leerlingen</TerugKnop>
        <h2 style={{ margin: '4px 0 4px' }}>{leerling.weergavenaam}</h2>
        <p className="portaal-zacht kk-mt-0">
          {items.length} {items.length === 1 ? tekst.enkel : tekst.meervoud.toLowerCase()} · {items.filter(i => i.klaar).length} {woord}.
          Klik er een aan voor de foutanalyse en de gemaakte opgaven.
        </p>
        {items.length === 0 && <p className="portaal-leeg">Deze leerling heeft geen {tekst.meervoud.toLowerCase()}.</p>}
        <div className="portaal-grid">
          {items.map(it => (
            <button key={it.wt.id} className="portaal-klaskaart" onClick={() => setItem(it)}>
              {it.wt.titel}
              {it.opdrachten.map(o => (
                <span key={o.id}>
                  {o.stand
                    ? <DoelCel stand={o.stand} />
                    : o.klaar
                      ? <span className="portaal-score-goed"><strong>Af</strong></span>
                      : `${Math.min(Number(o.v?.som_max ?? 0), o.v?.doel_aantal ?? 0)}/${o.v?.doel_aantal ?? '?'} gemaakt`}
                </span>
              ))}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="portaal-kaart">
      <h2>{tekst.meervoud} per leerling</h2>
      {leerlingen === null && <p className="portaal-leeg">Laden…</p>}
      {leerlingen?.length === 0 && <p className="portaal-leeg">Nog geen leerlingen in deze klas.</p>}
      <div className="portaal-grid">
        {leerlingen?.map(l => {
          const items = perLeerling.get(l.id) ?? []
          const klaar = items.filter(i => i.klaar).length
          return (
            <button key={l.id} className="portaal-klaskaart" onClick={() => setLeerlingId(l.id)} style={items.length ? undefined : { opacity: 0.55 }}>
              {l.weergavenaam}
              <span>
                {items.length
                  ? `${items.length} ${items.length === 1 ? tekst.enkel : tekst.meervoud.toLowerCase()} · ${klaar} ${woord}`
                  : `geen ${tekst.meervoud.toLowerCase()}`}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
