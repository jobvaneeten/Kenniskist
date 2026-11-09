import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { TOOL_BY_ID, VAKKEN } from '../lib/tools.js'
import { vaardigheid, kleurVan, doelSleutel, GRENS_ROOD, GRENS_GROEN, MIN_OPGAVEN } from '../lib/vaardigheden.js'
import { slaWeektaakOp } from './weektaakOpslaan.js'
import { ZONDER_EIND } from './soortTekst.js'
import { Knop } from '../ui/index.jsx'

// Tab "Groepsoverzicht" van KlasScherm.jsx: per vaardigheid (rekendoel,
// tafel, komma, tegenwoordige tijd ...) in één oogopslag wie het beheerst en
// wie verlengde instructie nodig heeft. Gebaseerd op al het oefenwerk van de
// gekozen periode (migratie 0025). Klik een vaardigheid open om dat doel met
// één klik klaar te zetten voor het groepje dat het nog niet beheerst.

const PERIODES = [{ weken: 2, tekst: 'Laatste 2 weken' }, { weken: 4, tekst: 'Laatste 4 weken' }, { weken: 8, tekst: 'Laatste 8 weken' }]
const GROEPEN = [
  { kleur: 'rood', titel: `Verlengde instructie (onder ${GRENS_ROOD}%)`, kies: true },
  { kleur: 'oranje', titel: `Nog niet zeker (${GRENS_ROOD} tot ${GRENS_GROEN}%)`, kies: true },
  { kleur: 'groen', titel: `Beheerst (${GRENS_GROEN}% of meer)` },
  { kleur: 'weinig', titel: `Te weinig gemaakt (minder dan ${MIN_OPGAVEN} opgaven)` },
  { kleur: 'geen', titel: 'Niet geoefend' },
]
const vandaag = () => new Date().toLocaleDateString('sv-SE')

export default function GroepsOverzicht({ klas, leerlingen }) {
  const [weken, setWeken] = useState(4)
  const [vak, setVak] = useState('')
  const [rijen, setRijen] = useState(null)
  const [fout, setFout] = useState('')
  const [heeftDoel, setHeeftDoel] = useState(new Map()) // doelsleutel → Set(leerling_id)
  const [open, setOpen] = useState(null)

  useEffect(() => {
    let actief = true
    async function laad() {
      setRijen(null); setFout('')
      const vanaf = new Date(Date.now() - weken * 7 * 864e5).toISOString()
      const { data, error } = await supabase.rpc('klas_vaardigheden', { p_klas: klas.id, p_vanaf: vanaf })
      if (!actief) return
      if (error) { setFout('Het overzicht kon niet geladen worden.'); setRijen([]); return }
      setRijen(data ?? [])
    }
    laad()
    return () => { actief = false }
  }, [klas.id, weken])

  // Welke doelen staan al klaar (om dubbel klaarzetten te voorkomen)
  useEffect(() => {
    if (!leerlingen?.length) return
    let actief = true
    supabase.from('toewijzingen').select('leerling_id, status, opdrachten(tool_id, config)')
      .in('leerling_id', leerlingen.map(l => l.id))
      .then(({ data }) => {
        if (!actief) return
        const m = new Map()
        for (const t of data ?? []) {
          const o = t.opdrachten
          if (o?.config?.persoonlijk !== 'doel' || t.status === 'vrijgesteld') continue
          const k = doelSleutel(o.tool_id, o.config)
          if (!m.has(k)) m.set(k, new Set())
          m.get(k).add(t.leerling_id)
        }
        setHeeftDoel(m)
      })
    return () => { actief = false }
  }, [leerlingen])

  const vaardigheden = useMemo(() => {
    if (!rijen) return []
    const per = new Map()
    for (const r of rijen) {
      const key = `${r.tool_id}|${r.cat ?? ''}`
      if (!per.has(key)) per.set(key, { key, toolId: r.tool_id, ...vaardigheid(r.tool_id, r.cat, r.cat_label), stand: new Map(), goed: 0, totaal: 0 })
      const v = per.get(key)
      v.stand.set(r.leerling_id, { goed: Number(r.goed), totaal: Number(r.totaal) })
      v.goed += Number(r.goed); v.totaal += Number(r.totaal)
    }
    return [...per.values()]
      .filter(v => !vak || (TOOL_BY_ID[v.toolId]?.vak ?? 'overig') === vak)
      .map(v => {
        const tel = { rood: 0, oranje: 0, groen: 0 }
        for (const s of v.stand.values()) { const k = kleurVan(100 * s.goed / s.totaal, s.totaal); if (k in tel) tel[k]++ }
        return { ...v, tel, pct: Math.round(100 * v.goed / v.totaal) }
      })
      // genoeg om iets over te zeggen: minstens 2 leerlingen met 5 opgaven
      .filter(v => v.tel.rood + v.tel.oranje + v.tel.groen >= 2)
      .sort((a, b) => b.tel.rood - a.tel.rood || b.tel.oranje - a.tel.oranje || a.pct - b.pct)
  }, [rijen, vak])

  const vakkenMetData = useMemo(() => {
    const set = new Set((rijen ?? []).map(r => TOOL_BY_ID[r.tool_id]?.vak).filter(Boolean))
    return VAKKEN.filter(v => set.has(v.key))
  }, [rijen])

  return (
    <div className="portaal-kaart">
      <div className="portaal-sectiekop">
        <h2>Groepsoverzicht</h2>
        <div className="kk-rij">
          <label className="portaal-veld" style={{ maxWidth: 180 }}>
            <span className="portaal-veld-label">Periode</span>
            <select value={weken} onChange={e => { setWeken(Number(e.target.value)); setOpen(null) }}>
              {PERIODES.map(p => <option key={p.weken} value={p.weken}>{p.tekst}</option>)}
            </select>
          </label>
          <label className="portaal-veld" style={{ maxWidth: 180 }}>
            <span className="portaal-veld-label">Vak</span>
            <select value={vak} onChange={e => { setVak(e.target.value); setOpen(null) }}>
              <option value="">Alle vakken</option>
              {vakkenMetData.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
            </select>
          </label>
        </div>
      </div>
      <p className="portaal-zacht kk-mt-0">
        Per vaardigheid zie je hoe elke leerling het doet, op basis van al het oefenwerk in deze periode (ook vrij oefenen).
        Elk blokje is een leerling. Bovenaan staan de vaardigheden waar de meeste leerlingen hulp bij nodig hebben.
        Klik een vaardigheid open om het doel klaar te zetten voor het groepje dat het nog niet beheerst.
      </p>
      <div className="go-legenda">
        <span><i className="go-blok rood" />onder {GRENS_ROOD}%</span>
        <span><i className="go-blok oranje" />{GRENS_ROOD} tot {GRENS_GROEN}%</span>
        <span><i className="go-blok groen" />{GRENS_GROEN}% of meer</span>
        <span><i className="go-blok weinig" />minder dan {MIN_OPGAVEN} opgaven</span>
        <span><i className="go-blok geen" />niet geoefend</span>
      </div>

      {(rijen === null || leerlingen === null) && <p className="portaal-leeg">Laden…</p>}
      {fout && <p className="portaal-fout">{fout}</p>}
      {rijen && leerlingen && vaardigheden.length === 0 && !fout && (
        <p className="portaal-leeg">Nog te weinig geoefend in deze periode om iets te laten zien.</p>
      )}

      <div className="go-lijst">
        {rijen && leerlingen && vaardigheden.map(v => (
          <Vaardigheid
            key={v.key} v={v} leerlingen={leerlingen} klas={klas} open={open === v.key}
            onOpen={() => setOpen(o => (o === v.key ? null : v.key))}
            heeftAl={v.doel ? heeftDoel.get(doelSleutel(v.doel.toolId, v.doel.config)) ?? new Set() : new Set()}
            onKlaargezet={(ids) => setHeeftDoel(m => {
              const k = doelSleutel(v.doel.toolId, v.doel.config)
              const nieuw = new Map(m); nieuw.set(k, new Set([...(m.get(k) ?? []), ...ids])); return nieuw
            })}
          />
        ))}
      </div>
    </div>
  )
}

function standVan(v, id) {
  const s = v.stand.get(id)
  if (!s) return { kleur: 'geen', pct: null, s: null }
  const pct = Math.round(100 * s.goed / s.totaal)
  return { kleur: kleurVan(pct, s.totaal), pct, s }
}

function Vaardigheid({ v, leerlingen, klas, open, onOpen, heeftAl, onKlaargezet }) {
  return (
    <div className={`go-rij${open ? ' open' : ''}`}>
      <button type="button" className="go-kop" onClick={onOpen} aria-expanded={open}>
        <span className="go-naam">
          <strong>{v.label}</strong>
          <span className="portaal-zacht">{v.sub}</span>
        </span>
        <span className="go-strip" aria-hidden="true">
          {leerlingen.map(l => {
            const { kleur, pct, s } = standVan(v, l.id)
            return <i key={l.id} className={`go-blok ${kleur}`} title={s ? `${l.weergavenaam}: ${pct}% goed (${s.goed} van ${s.totaal})` : `${l.weergavenaam}: niet geoefend`} />
          })}
        </span>
        <span className="go-tel">
          {v.tel.rood > 0 && <span className="go-tel-rood">{v.tel.rood} hulp</span>}
          {v.tel.oranje > 0 && <span className="go-tel-oranje">{v.tel.oranje} twijfel</span>}
          <span className="portaal-zacht">klas {v.pct}%</span>
        </span>
      </button>
      {open && <Paneel v={v} leerlingen={leerlingen} klas={klas} heeftAl={heeftAl} onKlaargezet={onKlaargezet} />}
    </div>
  )
}

// Opengeklapt: de leerlingen per groep; rood staat standaard aangevinkt.
function Paneel({ v, leerlingen, klas, heeftAl, onKlaargezet }) {
  const standVan_ = (id) => standVan(v, id)
  const [gekozen, setGekozen] = useState(() => new Set(leerlingen.filter(l => standVan_(l.id).kleur === 'rood' && !heeftAl.has(l.id)).map(l => l.id)))
  const [status, setStatus] = useState('')

  const wissel = (id) => setGekozen(g => { const n = new Set(g); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const zetKlaar = async () => {
    setStatus('bezig')
    try {
      const ids = [...gekozen]
      await slaWeektaakOp({
        weektaakId: null, schoolId: klas.school_id, klasId: klas.id, titel: v.doel.titel,
        startOp: vandaag(), eindOp: ZONDER_EIND,
        opdrachten: [{ toolId: v.doel.toolId, aantal: null, config: { ...v.doel.config, persoonlijk: 'doel' } }],
        leerlingIds: ids,
      })
      onKlaargezet(ids)
      setGekozen(new Set())
      setStatus(`Klaargezet voor ${ids.length} ${ids.length === 1 ? 'leerling' : 'leerlingen'}. Je vindt het doel bij het tabblad Doelen.`)
    } catch {
      setStatus('fout')
    }
  }

  return (
    <div className="go-paneel">
      {GROEPEN.map(g => {
        const lijst = leerlingen.filter(l => standVan_(l.id).kleur === g.kleur)
        if (!lijst.length) return null
        return (
          <div key={g.kleur} className="go-groep">
            <h4><i className={`go-blok ${g.kleur}`} />{g.titel} <span className="portaal-zacht">{lijst.length}</span></h4>
            <div className="go-namen">
              {lijst.map(l => {
                const { pct, s } = standVan_(l.id)
                const al = heeftAl.has(l.id)
                const kan = g.kies && v.doel && !al
                return (
                  <button key={l.id} type="button" disabled={!kan}
                    className={`go-naamchip ${g.kleur}${gekozen.has(l.id) ? ' aan' : ''}`}
                    onClick={() => kan && wissel(l.id)} aria-pressed={kan ? gekozen.has(l.id) : undefined}>
                    {l.weergavenaam}
                    {s && <span>{pct}% · {s.totaal}</span>}
                    {al && <em>doel staat klaar</em>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      <div className="go-actie">
        {v.doel ? (
          <>
            <span className="portaal-zacht">Doel: <strong>{v.doel.titel}</strong></span>
            <Knop variant="primair" maat="sm" icoon="doel" disabled={!gekozen.size || status === 'bezig'} onClick={zetKlaar}>
              Zet klaar als doel voor {gekozen.size} {gekozen.size === 1 ? 'leerling' : 'leerlingen'}
            </Knop>
          </>
        ) : (
          <span className="portaal-zacht">Dit kun je niet in één keer als doel klaarzetten. Gebruik het tabblad Doelen en kies daar zelf een oefening.</span>
        )}
      </div>
      {status && status !== 'bezig' && status !== 'fout' && <p className="portaal-succes">{status}</p>}
      {status === 'fout' && <p className="portaal-fout">Klaarzetten mislukt. Probeer het nog eens.</p>}
    </div>
  )
}
