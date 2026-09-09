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

  // Eén les kan uit twee sommen bestaan (plus én min), dus per leerling een
  // lijstje. De laatste inzendingen tellen: wie opnieuw begint, hoort niet
  // dubbel in de telling te staan.
  const perLes = useMemo(() => {
    const kaart = new Map()
    for (const r of rijen) {
      if (!kaart.has(r.opdracht_id)) kaart.set(r.opdracht_id, new Map())
      const perLeerling = kaart.get(r.opdracht_id)
      if (!perLeerling.has(r.leerling_id)) perLeerling.set(r.leerling_id, [])
      perLeerling.get(r.leerling_id).push(r)
    }
    return kaart
  }, [rijen])

  const les = blok.opdrachten.find(o => o.id === lesId) ?? blok.opdrachten[0]
  const nodig = Math.max(1, les?.soorten?.length ?? 1)
  const gemaakt = perLes.get(les?.id) ?? new Map()
  // Klaar = alle sommen van die les gemaakt; goed = ze allemaal goed.
  const staatVan = (rs) => {
    const laatste = (rs ?? []).slice(-nodig)
    if (laatste.length < nodig) return laatste.length === 0 ? 'bezig' : 'half'
    return laatste.every(r => Number(r.score) > 0) ? 'goed' : 'fout'
  }
  const staten = [...gemaakt.values()].map(staatVan)
  const klaar = staten.filter(t => t === 'goed' || t === 'fout').length
  const goed = staten.filter(t => t === 'goed').length
  const fout = staten.filter(t => t === 'fout').length

  const opgavenVan = (rs) => (rs ?? []).slice(-nodig)
    .map(r => r?.details_json?.opgaven?.[0]).filter(Boolean)

  return (
    <div className="portaal-kaart">
      <div className="portaal-sectiekop">
        <h2>{blok.titel}</h2>
        <button className="portaal-knop portaal-knop-subtiel" onClick={onTerug}>← Alle leschecks</button>
      </div>

      <div className="portaal-lestabs">
        {blok.opdrachten.map(o => {
          const g = perLes.get(o.id) ?? new Map()
          const n = Math.max(1, o.soorten?.length ?? 1)
          const alle = [...g.values()].map(rs => rs.slice(-n))
          const gKlaar = alle.filter(rs => rs.length >= n).length
          const gGoed = alle.filter(rs => rs.length >= n && rs.every(r => Number(r.score) > 0)).length
          return (
            <button
              key={o.id}
              className={`portaal-lestab${o.id === les?.id ? ' actief' : ''}`}
              onClick={() => { setLesId(o.id); setOpen(null) }}
            >
              <strong>Les {o.les}</strong>
              <span className="portaal-zacht">{gKlaar}/{leerlingen.length} · ✅ {gGoed}</span>
            </button>
          )
        })}
      </div>

      {les && (
        <>
          <p className="portaal-zacht" style={{ marginTop: 12 }}>
            {les.doel}
            {les.deelLabel && <> · <strong>de som gaat over: {les.deelLabel}</strong></>}
            {les.soorten?.length > 1 && <> ({les.soorten.length} sommen: {les.soorten.join(' en ')})</>}
          </p>
          <p style={{ margin: '6px 0 12px', fontWeight: 700 }}>
            {klaar} van de {leerlingen.length} klaar · ✅ {goed} goed · ❌ {fout} fout
            {nodig > 1 && <span className="portaal-zacht"> · {nodig} sommen per kind</span>}
          </p>

          <div className="portaal-lescheck-raster">
            {leerlingen.map(l => {
              const staat = staatVan(gemaakt.get(l.id))
              const icoon = staat === 'goed' ? '✅' : staat === 'fout' ? '❌' : staat === 'half' ? '✍️' : '⏳'
              return (
                <button
                  key={l.id}
                  className={`portaal-lestegel ${staat}${open === l.id ? ' open' : ''}`}
                  onClick={() => setOpen(open === l.id ? null : l.id)}
                  title={staat === 'bezig' ? 'Nog niet gemaakt' : 'Klik voor de sommen en de antwoorden'}
                >
                  <span className="portaal-lestegel-icoon">{icoon}</span>
                  <span className="portaal-lestegel-naam">{l.weergavenaam}</span>
                </button>
              )
            })}
          </div>

          {open && (() => {
            const opgaven = opgavenVan(gemaakt.get(open))
            const naam = leerlingen.find(l => l.id === open)?.weergavenaam
            if (!opgaven.length) return <p className="portaal-leeg">{naam} heeft de som nog niet gemaakt.</p>
            return (
              <div className="portaal-lesdetail">
                <p><strong>{naam}</strong></p>
                {opgaven.map((o, i) => (
                  <p key={i}>
                    {o.vraag} → <strong className={o.goed ? 'portaal-score-goed' : 'portaal-score-slecht'}>{o.antwoord ?? '—'}</strong>
                    {!o.goed && <> · juist was <strong>{o.juist}</strong></>}
                  </p>
                ))}
              </div>
            )
          })()}

          {fout > 0 && (
            <>
              <h3 style={{ margin: '18px 0 6px', fontSize: '1rem' }}>Om na te bespreken</h3>
              <ul className="portaal-signaallijst">
                {leerlingen.filter(l => staatVan(gemaakt.get(l.id)) === 'fout').flatMap(l =>
                  opgavenVan(gemaakt.get(l.id)).filter(o => !o.goed).map((o, i) => (
                    <li key={`${l.id}-${i}`} className="portaal-signaal">
                      <span className="portaal-signaal-naam">{l.weergavenaam}</span>
                      <span className="portaal-zacht">{o.vraag}</span>
                      <span>
                        <strong className="portaal-score-slecht">{o.antwoord ?? '—'}</strong>
                        {' → '}<strong>{o.juist}</strong>
                      </span>
                    </li>
                  )),
                )}
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
