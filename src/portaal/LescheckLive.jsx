import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const VERVERS_MS = 4000

// Live-bord van één lescheck-blok: per les een tegel per leerling, groen als
// het goed was, rood als het fout was, grijs als hij nog bezig is.
//
// Leest rechtstreeks uit `resultaten` en niet uit de view weektaak_voortgang,
// omdat het ingevulde antwoord in details_json zit — en juist dát wil je zien
// als je de som klassikaal nabespreekt.
export default function LescheckLive({ blok, leerlingen, onTerug }) {
  const opdrachtIds = useMemo(() => blok.opdrachten.map(o => o.id), [blok])
  const [rijen, setRijen] = useState([])
  const [lesId, setLesId] = useState(blok.opdrachten[0]?.id ?? null)
  const [ververst, setVerverst] = useState(true)
  const [open, setOpen] = useState(null)        // leerling-id van de open tegel

  useEffect(() => {
    let actief = true
    async function laad() {
      if (!opdrachtIds.length) return
      const { data } = await supabase
        .from('resultaten')
        .select('opdracht_id, leerling_id, score, details_json, aangemaakt_op')
        .in('opdracht_id', opdrachtIds)
        .order('aangemaakt_op')
      if (actief && data) setRijen(data)
    }
    laad()
    if (!ververst) return () => { actief = false }
    const t = setInterval(laad, VERVERS_MS)
    return () => { actief = false; clearInterval(t) }
  }, [opdrachtIds, ververst])

  // Laatste inzending per leerling telt: wie na een herkansing opnieuw maakt,
  // hoort niet twee keer in de telling te staan.
  const perLes = useMemo(() => {
    const kaart = new Map()
    for (const r of rijen) {
      if (!kaart.has(r.opdracht_id)) kaart.set(r.opdracht_id, new Map())
      kaart.get(r.opdracht_id).set(r.leerling_id, r)
    }
    return kaart
  }, [rijen])

  const les = blok.opdrachten.find(o => o.id === lesId) ?? blok.opdrachten[0]
  const gemaakt = perLes.get(les?.id) ?? new Map()
  const goed = [...gemaakt.values()].filter(r => Number(r.score) > 0).length
  const fout = gemaakt.size - goed

  const opgaveVan = (r) => r?.details_json?.opgaven?.[0] ?? null

  return (
    <div className="portaal-kaart">
      <div className="portaal-sectiekop">
        <h2>{blok.titel}</h2>
        <button className="portaal-knop portaal-knop-subtiel" onClick={onTerug}>← Alle leschecks</button>
      </div>

      <div className="portaal-lestabs">
        {blok.opdrachten.map(o => {
          const g = perLes.get(o.id) ?? new Map()
          const gGoed = [...g.values()].filter(r => Number(r.score) > 0).length
          return (
            <button
              key={o.id}
              className={`portaal-lestab${o.id === les?.id ? ' actief' : ''}`}
              onClick={() => { setLesId(o.id); setOpen(null) }}
            >
              <strong>Les {o.les}</strong>
              <span className="portaal-zacht">{g.size}/{leerlingen.length} · ✅ {gGoed}</span>
            </button>
          )
        })}
      </div>

      {les && (
        <>
          <p className="portaal-zacht" style={{ marginTop: 12 }}>{les.doel}</p>
          <p style={{ margin: '6px 0 12px', fontWeight: 700 }}>
            {gemaakt.size} van de {leerlingen.length} klaar · ✅ {goed} goed · ❌ {fout} fout
          </p>

          <div className="portaal-lescheck-raster">
            {leerlingen.map(l => {
              const r = gemaakt.get(l.id)
              const staat = !r ? 'bezig' : Number(r.score) > 0 ? 'goed' : 'fout'
              return (
                <button
                  key={l.id}
                  className={`portaal-lestegel ${staat}${open === l.id ? ' open' : ''}`}
                  onClick={() => setOpen(open === l.id ? null : l.id)}
                  title={r ? 'Klik voor de som en het antwoord' : 'Nog niet gemaakt'}
                >
                  <span className="portaal-lestegel-icoon">{staat === 'goed' ? '✅' : staat === 'fout' ? '❌' : '⏳'}</span>
                  <span className="portaal-lestegel-naam">{l.weergavenaam}</span>
                </button>
              )
            })}
          </div>

          {open && (() => {
            const r = gemaakt.get(open)
            const o = opgaveVan(r)
            const naam = leerlingen.find(l => l.id === open)?.weergavenaam
            if (!o) return <p className="portaal-leeg">{naam} heeft de som nog niet gemaakt.</p>
            return (
              <div className="portaal-lesdetail">
                <p><strong>{naam}</strong></p>
                <p>{o.vraag}</p>
                <p>
                  Ingevuld: <strong className={o.goed ? 'portaal-score-goed' : 'portaal-score-slecht'}>{o.antwoord ?? '—'}</strong>
                  {!o.goed && <> · juist was <strong>{o.juist}</strong></>}
                </p>
              </div>
            )
          })()}

          {fout > 0 && (
            <>
              <h3 style={{ margin: '18px 0 6px', fontSize: '1rem' }}>Om na te bespreken</h3>
              <ul className="portaal-signaallijst">
                {leerlingen.filter(l => { const r = gemaakt.get(l.id); return r && Number(r.score) === 0 }).map(l => {
                  const o = opgaveVan(gemaakt.get(l.id))
                  return (
                    <li key={l.id} className="portaal-signaal">
                      <span className="portaal-signaal-naam">{l.weergavenaam}</span>
                      <span className="portaal-zacht">{o?.vraag}</span>
                      <span>
                        <strong className="portaal-score-slecht">{o?.antwoord ?? '—'}</strong>
                        {' → '}<strong>{o?.juist}</strong>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </>
      )}

      <p className="portaal-zacht" style={{ marginTop: 16 }}>
        {ververst ? 'Ververst vanzelf elke paar seconden.' : 'Verversen staat uit.'}
        {' '}
        <button className="portaal-minilink" onClick={() => setVerverst(v => !v)}>
          {ververst ? 'Stoppen met verversen' : 'Weer verversen'}
        </button>
      </p>
    </div>
  )
}
