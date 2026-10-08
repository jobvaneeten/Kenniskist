import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { kopieVoorstel } from '../lib/weektaakKopie.js'
import { kopieerWeektaak } from './weektaakOpslaan.js'
import WeektaakForm from './WeektaakForm.jsx'
import WeektaakVoortgang from './WeektaakVoortgang.jsx'
import WeektaakDifferentiatie from './WeektaakDifferentiatie.jsx'
import PersoonlijkPerLeerling from './PersoonlijkPerLeerling.jsx'
import LeerlingDetail from './LeerlingDetail.jsx'
import { SOORT_TEKST, ZONDER_EIND } from './soortTekst.js'
import { Knop, TerugKnop } from '../ui/index.jsx'

// Weektaken, taken en doelen staan in dezelfde tabel; de soort zit in de
// config van de opdrachten (zie soortVan in lib/weektaak.js). Bij taken en
// doelen komt er bij voor wie hij is — die zijn per leerling, dus de titel
// alleen zegt te weinig.
async function haalWeektaken(klasId, soort) {
  const { data } = await supabase
    .from('weektaken').select('id, titel, start_op, eind_op, opdrachten(id, persoonlijk:config->>persoonlijk)')
    .eq('klas_id', klasId).order('start_op', { ascending: false })
  const lijst = (data ?? []).filter(wt => (wt.opdrachten?.[0]?.persoonlijk ?? 'weektaak') === soort)
  if (soort === 'weektaak' || !lijst.length) return lijst

  const opdrachtIds = lijst.flatMap(wt => wt.opdrachten.map(o => o.id))
  const [{ data: tw }, { data: lln }, { data: vg }, { data: dv }] = await Promise.all([
    supabase.from('toewijzingen').select('opdracht_id, leerling_id').in('opdracht_id', opdrachtIds),
    supabase.from('profielen').select('id, weergavenaam').eq('klas_id', klasId).eq('rol', 'leerling'),
    supabase.from('weektaak_voortgang').select('opdracht_id, leerling_id, doel_aantal, som_max, afgerond').in('opdracht_id', opdrachtIds),
    soort === 'doel'
      ? supabase.from('doel_voortgang').select('opdracht_id, leerling_id, gehaald').in('opdracht_id', opdrachtIds)
      : Promise.resolve({ data: [] }),
  ])
  const gehaald = new Set((dv ?? []).filter(d => d.gehaald).map(d => `${d.opdracht_id}:${d.leerling_id}`))
  const naamBij = new Map((lln ?? []).map(l => [l.id, l.weergavenaam]))
  return lijst.map(wt => {
    const ids = new Set(wt.opdrachten.map(o => o.id))
    const leerlingIds = new Set((tw ?? []).filter(t => ids.has(t.opdracht_id)).map(t => t.leerling_id))
    const namen = [...leerlingIds].map(id => naamBij.get(id)).filter(Boolean)
    // Af = alle opdrachten van deze taak/dit doel gehaald (zelfde regel als
    // `klaar` in haalMijnWeektaak).
    const af = [...leerlingIds].filter(id => {
      const rijen = (vg ?? []).filter(v => v.leerling_id === id && ids.has(v.opdracht_id))
      return rijen.length > 0 && rijen.every(v => soort === 'doel'
        ? gehaald.has(`${v.opdracht_id}:${v.leerling_id}`)
        : v.afgerond || (v.doel_aantal != null && v.som_max >= v.doel_aantal))
    }).length
    return { ...wt, voor: namen.sort(), aantal: leerlingIds.size, af }
  })
}

function statusLabel(weektaak) {
  if (weektaak.voor) {
    const n = weektaak.aantal
    const woord = weektaak.opdrachten?.[0]?.persoonlijk === 'doel' ? 'behaald' : 'af'
    return n === 0 ? '' : weektaak.af === n ? `iedereen ${woord}` : `${weektaak.af} van ${n} ${woord}`
  }
  const vandaag = new Date().toLocaleDateString('sv-SE')
  if (vandaag < weektaak.start_op) return 'komend'
  if (vandaag > weektaak.eind_op) return 'verlopen'
  return 'actief'
}

// Tab van KlasScherm.jsx, voor weektaken, taken of doelen (`soort`). Vijf standen: lijst van weektaken, een
// nieuwe aanmaken, een bestaande bewerken, de voortgang van één weektaak
// bekijken, of differentiëren (per leerling toewijzing/aantal aanpassen) —
// de laatste twee delen dezelfde opdrachten-fetch.
export default function WeektaakTab({ klas, soort = 'weektaak', onKiesLeerling }) {
  const tekst = SOORT_TEKST[soort]
  const [weektaken, setWeektaken] = useState(null)
  const [weergave, setWeergave] = useState('lijst') // lijst | nieuw | bewerken | voortgang | differentiatie
  const [gekozen, setGekozen] = useState(null)
  const [gekozenOpdrachten, setGekozenOpdrachten] = useState(null)
  const [alleenNietAf, setAlleenNietAf] = useState(false)
  const [toonVerwijder, setToonVerwijder] = useState(false)
  const [verwijderBezig, setVerwijderBezig] = useState(false)
  const [verwijderFout, setVerwijderFout] = useState('')
  // Kopiëren: null = dicht, anders het ingevulde voorstel voor de nieuwe week.
  const [kopie, setKopie] = useState(null)
  const [kopieBezig, setKopieBezig] = useState(false)
  const [kopieFout, setKopieFout] = useState('')
  // Taken en doelen: bekijken per doel/taak of per leerling.
  const [kijk, setKijk] = useState('items') // items | leerlingen
  // Per doel/taak → één leerling: alleen zijn werk op dit doel of deze taak.
  const [leerlingKeuze, setLeerlingKeuze] = useState(null) // { id, naam }
  const persoonlijk = soort !== 'weektaak'

  useEffect(() => {
    let actief = true
    haalWeektaken(klas.id, soort).then(data => { if (actief) setWeektaken(data) })
    return () => { actief = false }
  }, [klas.id, soort])

  const kiesWeektaak = (wt) => {
    setGekozen(wt); setWeergave('voortgang'); setAlleenNietAf(false); setLeerlingKeuze(null)
    setToonVerwijder(false); setKopie(null); setKopieFout('')
  }

  // Dezelfde weektaak nog een keer klaarzetten, standaard voor de week erna.
  // De opdrachten en de differentiatie gaan mee; de voortgang begint opnieuw en
  // de opgaven worden bij het spelen opnieuw gegenereerd.
  const opslaanKopie = async () => {
    setKopieBezig(true); setKopieFout('')
    try {
      await kopieerWeektaak({
        bronId: gekozen.id,
        schoolId: klas.school_id,
        klasId: klas.id,
        titel: kopie.titel.trim() || gekozen.titel,
        startOp: kopie.startOp,
        eindOp: kopie.eindOp,
      })
      setKopie(null)
      naOpslaan()
    } catch {
      setKopieFout('Kopiëren mislukt — probeer opnieuw.')
    } finally {
      setKopieBezig(false)
    }
  }

  // De opdrachten en toewijzingen gaan mee (cascade), maar het gemaakte werk
  // niet: resultaten.opdracht_id staat op SET NULL, dus die regels blijven
  // bestaan en tellen voortaan als vrij oefenen.
  const verwijderWeektaak = async () => {
    setVerwijderBezig(true); setVerwijderFout('')
    const { error } = await supabase.from('weektaken').delete().eq('id', gekozen.id)
    setVerwijderBezig(false)
    if (error) { setVerwijderFout('Verwijderen mislukt — heb je hier rechten voor?'); return }
    setToonVerwijder(false)
    naOpslaan()
  }

  const haalOpdrachten = async () => {
    const { data } = await supabase
      .from('opdrachten').select('id, tool_id, aantal, config')
      .eq('weektaak_id', gekozen.id).order('volgorde')
    setGekozenOpdrachten(data ?? [])
    return data ?? []
  }

  const bewerken = async () => { await haalOpdrachten(); setWeergave('bewerken') }
  const differentieren = async () => { await haalOpdrachten(); setWeergave('differentiatie') }

  const naOpslaan = () => {
    haalWeektaken(klas.id, soort).then(setWeektaken)
    setWeergave('lijst'); setGekozen(null)
  }

  if (weergave === 'nieuw') {
    return <WeektaakForm klas={klas} soort={soort} bestaand={null} onKlaar={naOpslaan} onAnnuleren={() => setWeergave('lijst')} />
  }

  if (weergave === 'bewerken' && gekozen && gekozenOpdrachten) {
    return (
      <WeektaakForm
        klas={klas}
        soort={soort}
        bestaand={{ ...gekozen, opdrachten: gekozenOpdrachten }}
        onKlaar={naOpslaan}
        onAnnuleren={() => setWeergave('voortgang')}
      />
    )
  }

  if (weergave === 'differentiatie' && gekozen && gekozenOpdrachten) {
    return (
      <WeektaakDifferentiatie
        schoolId={klas.school_id}
        klasId={klas.id}
        opdrachten={gekozenOpdrachten}
        onTerug={() => setWeergave('voortgang')}
      />
    )
  }

  if (weergave === 'voortgang' && gekozen && leerlingKeuze) {
    return (
      <>
        <div className="portaal-kruimels">
          <button onClick={() => { setWeergave('lijst'); setGekozen(null); setLeerlingKeuze(null) }}>Alle {tekst.meervoud.toLowerCase()}</button>
          <span>›</span>
          <button onClick={() => setLeerlingKeuze(null)}>{gekozen.titel}</button>
          <span>›</span>
          <strong>{leerlingKeuze.naam}</strong>
        </div>
        <LeerlingDetail leerlingId={leerlingKeuze.id} opdrachtIds={gekozen.opdrachten.map(o => o.id)} kop={gekozen.titel} />
      </>
    )
  }

  if (weergave === 'voortgang' && gekozen) {
    return (
      <div className="portaal-kaart">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div>
            <TerugKnop vast={false} onClick={() => { setWeergave('lijst'); setGekozen(null) }}>Alle {tekst.meervoud.toLowerCase()}</TerugKnop>
            <h2 style={{ margin: '4px 0 0' }}>{gekozen.titel}</h2>
            <p className="portaal-leeg kk-m-0">
              {gekozen.eind_op === ZONDER_EIND
                ? `sinds ${gekozen.start_op}`
                : `${gekozen.start_op} t/m ${gekozen.eind_op}`}
              {gekozen.voor?.length ? ` · voor ${gekozen.voor.join(', ')}` : ''}
            </p>
          </div>
          <div className="kk-rij">
            <Knop
              variant={alleenNietAf ? 'primair' : 'secundair'} maat="sm"
              onClick={() => setAlleenNietAf(v => !v)}
            >{alleenNietAf ? 'Toon iedereen' : 'Alleen niet af'}</Knop>
            <Knop variant="secundair" maat="sm" onClick={differentieren}>Differentiëren</Knop>
            {soort === 'weektaak' && (
              <Knop
                variant="secundair" maat="sm"
                onClick={() => {
                  setToonVerwijder(false); setKopieFout('')
                  setKopie(k => (k ? null : kopieVoorstel(gekozen)))
                }}
              >Kopiëren</Knop>
            )}
            <Knop variant="secundair" maat="sm" onClick={bewerken}>Bewerken</Knop>
            <Knop variant="secundair" maat="sm" onClick={() => setToonVerwijder(v => !v)}>Verwijderen</Knop>
          </div>
        </div>

        {kopie && (
          <div className="portaal-waarschuwing" style={{ borderColor: 'rgba(120,180,255,0.5)' }}>
            <p className="portaal-zacht kk-m-0">
              <strong>{gekozen.titel}</strong> nog een keer klaarzetten. De opdrachten gaan mee, en ook wie
              welke opdracht krijgt, met welk eigen aantal en wie een opdracht niet hoeft te maken — de
              differentiatie blijft dus precies zoals je hem hebt ingesteld. De <strong>opgaven zelf zijn
              nieuw</strong>: sommen, woorden en zinnen worden bij het spelen gemaakt, dus je leerlingen
              krijgen andere opgaven van dezelfde soort. De voortgang begint weer op nul.
            </p>
            <div className="kk-rij kk-mt-3">
              <label className="portaal-veld">
                Titel
                <input
                  type="text" value={kopie.titel}
                  onChange={e => setKopie(k => ({ ...k, titel: e.target.value }))}
                />
              </label>
              <label className="portaal-veld">
                Van
                <input
                  type="date" value={kopie.startOp}
                  onChange={e => setKopie(k => ({ ...k, startOp: e.target.value }))}
                />
              </label>
              <label className="portaal-veld">
                Tot en met
                <input
                  type="date" value={kopie.eindOp}
                  onChange={e => setKopie(k => ({ ...k, eindOp: e.target.value }))}
                />
              </label>
            </div>
            {kopie.eindOp < kopie.startOp && (
              <p className="portaal-fout">De einddatum ligt vóór de startdatum.</p>
            )}
            {kopieFout && <p className="portaal-fout">{kopieFout}</p>}
            <div className="kk-rij kk-mt-3">
              <Knop
                variant="primair" maat="sm"
                disabled={kopieBezig || kopie.eindOp < kopie.startOp}
                onClick={opslaanKopie}
              >{kopieBezig ? 'Bezig…' : 'Kopie klaarzetten'}</Knop>
              <Knop variant="secundair" maat="sm" onClick={() => setKopie(null)}>Annuleren</Knop>
            </div>
          </div>
        )}
        {toonVerwijder && (
          <div className="portaal-waarschuwing">
            <p className="portaal-zacht kk-m-0">
              <strong>{gekozen.titel}</strong> verwijderen? De opdrachten en de voortgang van deze {tekst.enkel}
              verdwijnen. Het gemaakte werk blijft bij de leerling bewaard, maar telt daarna als vrij oefenen
              en staat dus niet meer in het portaal. Dit kan niet ongedaan gemaakt worden.
            </p>
            {verwijderFout && <p className="portaal-fout">{verwijderFout}</p>}
            <div className="kk-rij kk-mt-3">
              <Knop variant="gevaar" maat="sm" disabled={verwijderBezig} onClick={verwijderWeektaak}>
                {verwijderBezig ? 'Bezig…' : 'Definitief verwijderen'}
              </Knop>
              <Knop variant="secundair" maat="sm" onClick={() => setToonVerwijder(false)}>Annuleren</Knop>
            </div>
          </div>
        )}

        <WeektaakVoortgang
          weektaak={gekozen} klasId={klas.id}
          alleenNietAf={alleenNietAf} onKiesLeerling={persoonlijk ? (id, naam) => setLeerlingKeuze({ id, naam }) : (id) => onKiesLeerling(id)}
        />
      </div>
    )
  }

  const keuze = persoonlijk && (
    <div className="portaal-keuze">
      <Knop variant={kijk === 'items' ? 'primair' : 'secundair'} maat="sm" onClick={() => setKijk('items')}>Per {tekst.enkel}</Knop>
      <Knop variant={kijk === 'leerlingen' ? 'primair' : 'secundair'} maat="sm" onClick={() => setKijk('leerlingen')}>Per leerling</Knop>
    </div>
  )

  if (persoonlijk && kijk === 'leerlingen') {
    return (
      <>
        {keuze}
        {weektaken === null
          ? <p className="portaal-leeg">Laden…</p>
          : <PersoonlijkPerLeerling klas={klas} soort={soort} weektaken={weektaken} tekst={tekst} />}
      </>
    )
  }

  return (
    <>
    {keuze}
    <div className="portaal-kaart">
      <h2>{tekst.meervoud}</h2>
      {soort !== 'weektaak' && (
        <p className="portaal-zacht kk-mt-0">
          {soort === 'taak'
            ? 'Een taak zet je voor één of een paar leerlingen klaar. Ze vinden hem bij "Speciaal voor mij".'
            : 'Een doel is een leerdoel, bv. een doel uit verhaaltjessommen of één zinsdeel. De leerling oefent erop bij "Speciaal voor mij".'}
        </p>
      )}
      {weektaken === null && <p className="portaal-leeg">Laden…</p>}
      {weektaken?.length === 0 && <p className="portaal-leeg">{tekst.leeg}</p>}
      <div className="portaal-grid">
        {weektaken?.map(wt => (
          <button key={wt.id} className="portaal-klaskaart" onClick={() => kiesWeektaak(wt)}>
            {wt.titel}
            <span>{wt.eind_op === ZONDER_EIND ? `sinds ${wt.start_op}` : `${wt.start_op} t/m ${wt.eind_op}`}</span>
            {wt.voor && <span>voor {wt.voor.length ? wt.voor.join(', ') : 'niemand'}</span>}
            <span>{statusLabel(wt)}</span>
          </button>
        ))}
      </div>
      <Knop className="kk-mt-4" variant="primair" maat="sm" onClick={() => setWeergave('nieuw')}>{tekst.nieuw}</Knop>
    </div>
    </>
  )
}
