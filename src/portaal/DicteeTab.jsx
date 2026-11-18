import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  haalSjablonen, haalDictees, maakDictee, zetDicteeOpen, verwijderDictee,
  haalAntwoorden, zetCorrecties, wisAntwoordenVan,
} from '../lib/controleDictee.js'
import { analyseer, kijkWoordNa, markeer, categorieNaam, categorieRegel, NORM } from '../lib/dicteeAnalyse.js'
import { Knop, Icoon } from '../ui/index.jsx'
import './dicteetab.css'

// Tab "Dictee": het controledictee van Taal actief. De leerkracht zet een
// dictee open, dicteert hardop, en ziet daarna per leerling en per
// spellingcategorie waar de fouten zitten (src/lib/dicteeAnalyse.js).

const datum = (d) => new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0)

// Nummering zoals op het blad van de leerling: 1..15, dan Zin 1a, 1b, ...
function labels(woorden) {
  let los = 0
  return woorden.map((w, i) => {
    if (w.zin == null) return String(++los)
    const letter = 'abcdefgh'[woorden.slice(0, i).filter(v => v.zin === w.zin).length]
    return `zin ${w.zin}${letter}`
  })
}

export default function DicteeTab({ klas, leerlingen }) {
  const [dictees, setDictees] = useState(null)
  const [sjablonen, setSjablonen] = useState([])
  const [keuze, setKeuze] = useState('')
  const [openId, setOpenId] = useState(null)
  const [fout, setFout] = useState('')

  const laad = useCallback(() => {
    haalDictees(klas.id).then(setDictees).catch(() => { setDictees([]); setFout('Laden lukt niet.') })
  }, [klas.id])
  useEffect(() => {
    laad()
    haalSjablonen().then(alle => {
      const s = alle.filter(x => !x.klas_ids || x.klas_ids.includes(klas.id))
      setSjablonen(s); if (s.length) setKeuze(s[s.length - 1].id)
    }).catch(() => {})
  }, [laad, klas.id])

  const nieuw = async () => {
    const s = sjablonen.find(x => x.id === keuze)
    if (!s) return
    setFout('')
    try { const id = await maakDictee(klas.id, s); laad(); setOpenId(id) }
    catch { setFout('Aanmaken lukt niet. Probeer het nog eens.') }
  }

  const dictee = dictees?.find(d => d.id === openId)
  if (dictee) return (
    <Afname dictee={dictee} leerlingen={leerlingen ?? []} onTerug={() => { setOpenId(null); laad() }} onVeranderd={laad} />
  )

  return (
    <div className="portaal-kaart">
      <h2>Controledictee</h2>
      <p className="portaal-zacht kk-mt-0">
        Kies het dictee, zet het klaar en dicteer hardop. Zodra het klaarstaat zien de kinderen op hun beginscherm een grote knop Dictee en typen de woorden
        in genummerde vakjes, zonder spellingcontrole. Daarna zie je hier per kind en per spellingcategorie waar de fouten zitten.
      </p>

      <div className="pd-nieuw kk-mt-3">
        {sjablonen.length === 0
          ? <p className="portaal-leeg">Er staan nog geen dictees klaar.</p>
          : (
            <>
              <select value={keuze} onChange={e => setKeuze(e.target.value)} aria-label="Welk dictee">
                {sjablonen.map(s => <option key={s.id} value={s.id}>{s.titel} ({s.woorden.length} woorden)</option>)}
              </select>
              <Knop variant="primair" icoon="plus" onClick={nieuw}>Nieuw dictee</Knop>
            </>
          )}
      </div>
      {fout && <p className="portaal-fout">{fout}</p>}

      <div className="pd-lijst kk-mt-3">
        {dictees === null && <p className="portaal-zacht">Laden…</p>}
        {dictees?.length === 0 && <p className="portaal-leeg">Nog geen dictees afgenomen in deze klas.</p>}
        {dictees?.map(d => (
          <button key={d.id} type="button" className="pd-dictee" onClick={() => setOpenId(d.id)}>
            <b>{d.titel}</b>
            <span className="portaal-zacht">{datum(d.aangemaakt_op)} · {d.woorden.length} woorden</span>
            <span className={d.open ? 'pd-status open' : 'pd-status'}>{d.open ? 'Klaargezet' : 'Niet klaargezet'}</span>
          </button>
        ))}
      </div>
      <p className="portaal-zacht kk-mt-3 pd-klein">
        De antwoorden worden een jaar bewaard en daarna vanzelf gewist. Verwijder je een dictee, dan zijn alle antwoorden meteen weg.
      </p>
    </div>
  )
}

// Alle antwoorden als bestand (opent in Excel): één regel per leerling, per
// woord wat er geschreven is, met "(fout)" erachter als het fout is, en
// daarna de fouten per spellingcategorie. Voor de zekerheid en om te printen.
function download(dictee, rijen, leerlingen, nrs) {
  const a = analyseer(dictee.woorden, rijen)
  const cel = (v) => {
    const s = String(v ?? '')
    return /[;"\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const kop = ['Leerling', 'Ingeleverd', 'Goed', ...dictee.woorden.map((w, i) => `${nrs[i]} ${w.w}`),
    ...a.catIds.map(id => `fouten ${categorieNaam(id)}`), 'fouten overig']
  const regels = [...leerlingen.filter(l => rijen.some(r => r.leerling_id === l.id)).map(l => rijen.find(r => r.leerling_id === l.id))]
    .map(r => {
      const p = a.perLeerling[r.leerling_id]
      const naam = leerlingen.find(l => l.id === r.leerling_id)?.weergavenaam ?? 'Onbekend'
      return [
        naam,
        r.ingeleverd_op ? new Date(r.ingeleverd_op).toLocaleString('nl-NL') : 'nog niet ingeleverd',
        `${p.score} van ${p.aantal}`,
        ...p.per.map(x => x.leeg ? '(leeg)' : x.ingevuld + (x.goed ? '' : ' (fout)')),
        ...a.catIds.map(id => p.cat[id] || 0),
        p.per.filter(x => !x.goed && x.overig).length,
      ]
    })
  const tekst = '﻿' + [kop, ...regels].map(r => r.map(cel).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([tekst], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `Dictee ${dictee.titel.replace(/[^\w\s-]/g, '')} ${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Afname({ dictee, leerlingen, onTerug, onVeranderd }) {
  const [rijen, setRijen] = useState(null)
  const [open, setOpen] = useState(dictee.open)
  const [toonWoorden, setToonWoorden] = useState(false)
  const [kind, setKind] = useState(null)
  const [zeker, setZeker] = useState(false)
  const [fout, setFout] = useState('')
  const [printen, setPrinten] = useState(null)   // 'antwoorden' | 'analyse'
  const woorden = dictee.woorden
  const nrs = useMemo(() => labels(woorden), [woorden])
  // Eerst de afdruk in de pagina zetten, dan het printvenster openen.
  useEffect(() => {
    if (!printen) return
    const t = setTimeout(() => { window.print(); setPrinten(null) }, 60)
    return () => clearTimeout(t)
  }, [printen])
  const naam = useCallback((id) => leerlingen.find(l => l.id === id)?.weergavenaam ?? 'Onbekend', [leerlingen])

  const laad = useCallback(() => { haalAntwoorden(dictee.id).then(setRijen).catch(() => setFout('Antwoorden laden lukt niet.')) }, [dictee.id])
  useEffect(() => {
    laad()
    if (!open) return
    const t = setInterval(laad, 5000)   // live bijhouden wie heeft ingeleverd
    return () => clearInterval(t)
  }, [laad, open])

  const wissel = async () => {
    try { await zetDicteeOpen(dictee.id, !open); setOpen(!open); onVeranderd() }
    catch { setFout('Dat lukt nu niet. Probeer het nog eens.') }
  }
  const weg = async () => {
    try { await verwijderDictee(dictee.id); onTerug() }
    catch { setFout('Verwijderen lukt niet.') }
  }

  const ingeleverd = (rijen ?? []).filter(r => r.ingeleverd_op)
  const bezig = (rijen ?? []).filter(r => !r.ingeleverd_op)
  const a = useMemo(() => analyseer(woorden, ingeleverd), [woorden, rijen])   // eslint-disable-line react-hooks/exhaustive-deps
  const nogNiet = leerlingen.filter(l => !(rijen ?? []).some(r => r.leerling_id === l.id))
  const volgorde = [...ingeleverd].sort((x, y) => a.perLeerling[x.leerling_id].score - a.perLeerling[y.leerling_id].score)
  const cats = [...a.catIds].sort((x, y) => pct(a.groepCat[y].fout, a.groepCat[y].kansen) - pct(a.groepCat[x].fout, a.groepCat[x].kansen))

  if (kind) {
    const r = ingeleverd.find(x => x.leerling_id === kind)
    if (r) return <Kind dictee={dictee} open={open} rij={r} naam={naam(kind)} nrs={nrs} onTerug={() => setKind(null)} onVeranderd={laad} />
  }

  return (
    <div className="portaal-kaart pd-afname">
      <div className="pd-kop">
        <Knop variant="subtiel" icoon="terug" onClick={onTerug}>Alle dictees</Knop>
        <h2>{dictee.titel}</h2>
        <span className={open ? 'pd-status open' : 'pd-status'}>{open ? 'Klaargezet' : 'Niet klaargezet'}</span>
      </div>

      <div className="pd-acties">
        <Knop variant={open ? 'secundair' : 'primair'} onClick={wissel}>{open ? 'Dictee intrekken' : 'Klaarzetten voor de klas'}</Knop>
        <Knop variant="subtiel" onClick={() => setToonWoorden(v => !v)}>{toonWoorden ? 'Woorden verbergen' : 'Woorden om voor te lezen'}</Knop>
        {(rijen ?? []).length > 0 && <Knop variant="secundair" icoon="uit" onClick={() => download(dictee, rijen, leerlingen, nrs)}>Download alle antwoorden</Knop>}
        {ingeleverd.length > 0 && <Knop variant="subtiel" icoon="printer" onClick={() => setPrinten('antwoorden')}>Antwoorden printen</Knop>}
        {ingeleverd.length > 0 && <Knop variant="subtiel" icoon="printer" onClick={() => setPrinten('analyse')}>Analyse printen</Knop>}
        {!zeker
          ? <Knop variant="subtiel" icoon="prullenbak" onClick={() => setZeker(true)}>Verwijderen</Knop>
          : <span className="pd-zeker">Alles van dit dictee wissen? <Knop variant="subtiel" onClick={() => setZeker(false)}>Nee</Knop> <Knop variant="secundair" onClick={weg}>Ja, wissen</Knop></span>}
      </div>
      <p className="portaal-zacht pd-klein kk-mt-2">
        {open
          ? 'De leerlingen zien nu de knop Dictee. Met Dictee intrekken haal je hem weg, ook bij kinderen die het al open hebben.'
          : 'De leerlingen zien dit dictee nu niet.'}
      </p>
      {fout && <p className="portaal-fout">{fout}</p>}

      {toonWoorden && (
        <ol className="pd-voorlezen">
          {woorden.map((w, i) => (
            <li key={i}><span className="pd-nr">{nrs[i]}</span><b>{w.w}</b><span className="portaal-zacht">{[...new Set(w.c.map(c => categorieNaam(c.id)))].join(', ')}</span></li>
          ))}
        </ol>
      )}

      <section className="pd-blok">
        <h3>Ingeleverd: {ingeleverd.length} van {leerlingen.length}</h3>
        <div className="pd-namen">
          {ingeleverd.map(r => <span key={r.leerling_id} className="pd-naam klaar">{naam(r.leerling_id)}</span>)}
          {bezig.map(r => <span key={r.leerling_id} className="pd-naam bezig" title="Is bezig">{naam(r.leerling_id)}</span>)}
          {nogNiet.map(l => <span key={l.id} className="pd-naam" title="Nog niet begonnen">{l.weergavenaam}</span>)}
        </div>
      </section>

      {ingeleverd.length > 0 && (
        <>
          <section className="pd-blok">
            <h3>Per spellingcategorie</h3>
            <p className="portaal-zacht pd-klein">Hoe vaak de klas op de plek van die categorie een fout maakte. Onder de balk: wie extra instructie nodig heeft.</p>
            <div className="pd-cats">
              {cats.map(id => {
                const g = a.groepCat[id]
                const goed = 100 - pct(g.fout, g.kansen)
                return (
                  <div key={id} className="pd-cat">
                    <div className="pd-cat-kop">
                      <b>{categorieNaam(id)}</b>
                      <span className="portaal-zacht">{categorieRegel(id)}</span>
                      <span className="pd-cat-pct">{goed}% goed</span>
                    </div>
                    <div className="pd-balk"><i style={{ width: `${goed}%` }} className={goed >= 85 ? 'goed' : goed >= 70 ? 'matig' : 'slecht'} /></div>
                    {g.leerlingen.length > 0 && (
                      <div className="pd-namen">
                        {[...g.leerlingen].sort((x, y) => y.fout - x.fout).map(l => (
                          <button key={l.id} type="button" className="pd-naam fout" onClick={() => setKind(l.id)}>
                            {naam(l.id)}{l.fout > 1 ? ` (${l.fout}x)` : ''}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {a.overig > 0 && <p className="portaal-zacht pd-klein">Daarnaast {a.overig} {a.overig === 1 ? 'fout' : 'fouten'} buiten de getoetste categorieën (slordig, een andere regel, een heel ander woord of niets ingevuld).</p>}
            </div>
          </section>

          <section className="pd-blok">
            <h3>Per leerling</h3>
            <p className="portaal-zacht pd-klein">Score: groen vanaf {Math.round(NORM.goed * 100)}%, oranje vanaf {Math.round(NORM.matig * 100)}%, anders rood. Een getal in een vakje is het aantal fouten in die categorie. Klik op een naam voor alle woorden.</p>
            <div className="pd-tabelscroll">
              <table className="pd-tabel">
                <thead>
                  <tr>
                    <th>Leerling</th><th>Goed</th>
                    {cats.map(id => <th key={id} className="pd-schuin" title={categorieRegel(id)}><span>{categorieNaam(id)}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {volgorde.map(r => {
                    const p = a.perLeerling[r.leerling_id]
                    return (
                      <tr key={r.leerling_id}>
                        <td><button type="button" className="pd-link" onClick={() => setKind(r.leerling_id)}>{naam(r.leerling_id)}</button></td>
                        <td className={`pd-score ${p.oordeel}`}>{p.score}/{p.aantal}</td>
                        {cats.map(id => <td key={id} className={p.cat[id] ? 'pd-cel fout' : 'pd-cel'}>{p.cat[id] || ''}</td>)}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pd-blok">
            <h3>Per woord</h3>
            <ul className="pd-woorden">
              {woorden.map((w, i) => ({ w, i, ...a.perWoord[i] })).sort((x, y) => y.fout - x.fout).map(({ w, i, fout: f, varianten }) => (
                <li key={i}>
                  <span className="pd-nr">{nrs[i]}</span>
                  <b>{w.w}</b>
                  <span className={f ? 'pd-telfout' : 'portaal-zacht'}>{f ? `${f}x fout` : 'iedereen goed'}</span>
                  <span className="portaal-zacht pd-varianten">
                    {Object.entries(varianten).sort((x, y) => y[1] - x[1]).map(([v, n]) => `${v}${n > 1 ? ` (${n})` : ''}`).join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      {printen && createPortal(
        <Afdruk soort={printen} dictee={dictee} rijen={ingeleverd} a={a} cats={cats} nrs={nrs} naam={naam} aantalKlas={leerlingen.length} />,
        document.body,
      )}
    </div>
  )
}

// Witte afdruk (zie @media print in dicteetab.css): de antwoorden van elke
// leerling, of de analyse van de toets.
function Afdruk({ soort, dictee, rijen, a, cats, nrs, naam, aantalKlas }) {
  const vandaag = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  const opNaam = [...rijen].sort((x, y) => naam(x.leerling_id).localeCompare(naam(y.leerling_id), 'nl'))
  const kop = (
    <header className="pdp-kop">
      <h1>{dictee.titel}: {soort === 'antwoorden' ? 'antwoorden' : 'analyse'}</h1>
      <p>Afgenomen op {datum(dictee.aangemaakt_op)} · {rijen.length} van {aantalKlas} leerlingen ingeleverd · geprint op {vandaag}</p>
    </header>
  )

  if (soort === 'antwoorden') return (
    <div className="pd-print">
      {kop}
      {opNaam.map(r => {
        const p = a.perLeerling[r.leerling_id]
        return (
          <section key={r.leerling_id} className="pdp-kind">
            <h2>{naam(r.leerling_id)} <span>{p.score} van {p.aantal} goed · ingeleverd {new Date(r.ingeleverd_op).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></h2>
            <table>
              <thead><tr><th>Nr</th><th>Geschreven</th><th /><th>Goed woord</th><th>Categorie fout</th></tr></thead>
              <tbody>
                {p.per.map((x, i) => (
                  <tr key={i} className={x.goed ? '' : 'pdp-fout'}>
                    <td>{nrs[i]}</td>
                    <td className="pdp-woord">{x.leeg ? '(leeg)' : x.ingevuld}</td>
                    <td>{x.goed ? '\u2713' : '\u2717'}{x.handmatig ? '*' : ''}</td>
                    <td className="pdp-woord">{x.goed ? '' : dictee.woorden[i].w}</td>
                    <td>{x.goed ? '' : [...x.fout.map(categorieNaam), ...(x.overig ? ['overig'] : [])].join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      })}
      <p className="pdp-voet">* zelf goed of fout gerekend door de leerkracht</p>
    </div>
  )

  const gemiddeld = rijen.length ? rijen.reduce((s, r) => s + a.perLeerling[r.leerling_id].score, 0) / rijen.length : 0
  const tel = (o) => rijen.filter(r => a.perLeerling[r.leerling_id].oordeel === o).length
  return (
    <div className="pd-print">
      {kop}
      <p>Gemiddeld {gemiddeld.toFixed(1).replace('.', ',')} van {dictee.woorden.length} goed · goed (vanaf {Math.round(NORM.goed * 100)}%): {tel('goed')} · matig (vanaf {Math.round(NORM.matig * 100)}%): {tel('matig')} · onvoldoende: {tel('onvoldoende')}</p>

      <h2>Per spellingcategorie</h2>
      <table>
        <thead><tr><th>Categorie</th><th>Regel</th><th>Goed</th><th>Extra instructie</th></tr></thead>
        <tbody>
          {cats.map(id => {
            const g = a.groepCat[id]
            return (
              <tr key={id}>
                <td><b>{categorieNaam(id)}</b></td>
                <td>{categorieRegel(id)}</td>
                <td>{100 - pct(g.fout, g.kansen)}%</td>
                <td>{[...g.leerlingen].sort((x, y) => y.fout - x.fout).map(l => `${naam(l.id)}${l.fout > 1 ? ` (${l.fout}x)` : ''}`).join(', ')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {a.overig > 0 && <p>Daarnaast {a.overig} {a.overig === 1 ? 'fout' : 'fouten'} buiten de getoetste categorieën.</p>}

      <h2>Per leerling</h2>
      <table>
        <thead><tr><th>Leerling</th><th>Goed</th><th>Oordeel</th><th>Fouten per categorie</th></tr></thead>
        <tbody>
          {[...rijen].sort((x, y) => a.perLeerling[x.leerling_id].score - a.perLeerling[y.leerling_id].score).map(r => {
            const p = a.perLeerling[r.leerling_id]
            return (
              <tr key={r.leerling_id}>
                <td>{naam(r.leerling_id)}</td>
                <td>{p.score}/{p.aantal}</td>
                <td>{p.oordeel}</td>
                <td>{cats.filter(id => p.cat[id]).map(id => `${categorieNaam(id)}${p.cat[id] > 1 ? ` (${p.cat[id]})` : ''}`).join(', ')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <h2>Per woord</h2>
      <table>
        <thead><tr><th>Nr</th><th>Woord</th><th>Fout</th><th>Zo geschreven</th></tr></thead>
        <tbody>
          {dictee.woorden.map((w, i) => (
            <tr key={i}>
              <td>{nrs[i]}</td>
              <td className="pdp-woord">{w.w}</td>
              <td>{a.perWoord[i].fout}x</td>
              <td>{Object.entries(a.perWoord[i].varianten).sort((x, y) => y[1] - x[1]).map(([v, n]) => `${v}${n > 1 ? ` (${n})` : ''}`).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Kind({ dictee, open, rij, naam, nrs, onTerug, onVeranderd }) {
  const [correcties, setCorrecties] = useState(rij.correcties ?? {})
  const [zeker, setZeker] = useState(false)
  const [fout, setFout] = useState('')
  const per = dictee.woorden.map((w, i) => kijkWoordNa(w, rij.antwoorden?.[i] ?? '', correcties[String(i)]))
  const score = per.filter(p => p.goed).length

  const reken = async (i, waarde) => {
    const nieuw = { ...correcties }
    if (waarde === null) delete nieuw[String(i)]; else nieuw[String(i)] = waarde
    setCorrecties(nieuw)
    try { await zetCorrecties(dictee.id, rij.leerling_id, nieuw); onVeranderd() }
    catch { setFout('Opslaan lukt niet.') }
  }
  const opnieuw = async () => {
    try { await wisAntwoordenVan(dictee.id, rij.leerling_id); onVeranderd(); onTerug() }
    catch { setFout('Dat lukt nu niet.') }
  }

  return (
    <div className="portaal-kaart pd-afname">
      <div className="pd-kop">
        <Knop variant="subtiel" icoon="terug" onClick={onTerug}>Hele klas</Knop>
        <h2>{naam}</h2>
        <span className="pd-cat-pct">{score} van {per.length} goed</span>
      </div>
      <p className="portaal-zacht pd-klein">{dictee.titel}. Rood is de plek van de fout in het goede woord. Klopt het nakijken niet (bijvoorbeeld een tikfout die je goed wilt rekenen), pas het dan per woord aan.</p>
      {fout && <p className="portaal-fout">{fout}</p>}
      <table className="pd-tabel pd-kindtabel">
        <thead><tr><th>Nr</th><th>Goed woord</th><th>Geschreven</th><th>Categorie fout</th><th /></tr></thead>
        <tbody>
          {per.map((p, i) => {
            const w = dictee.woorden[i]
            const c = correcties[String(i)]
            return (
              <tr key={i} className={p.goed ? '' : 'pd-rij-fout'}>
                <td className="pd-nr">{nrs[i]}</td>
                <td className="pd-woord">
                  {markeer(w.w, p.stukken).map((d, k) => d.fout
                    ? <mark key={k} className={d.invoeging ? 'pd-invoeg' : ''} title={d.gegeven ? `geschreven: ${d.gegeven}` : 'weggelaten'}>{d.invoeging ? '‸' : d.tekst}</mark>
                    : <span key={k}>{d.tekst}</span>)}
                </td>
                <td className="pd-woord">{p.leeg ? <span className="portaal-zacht">leeg</span> : p.ingevuld}</td>
                <td>
                  {p.goed ? <span className="pd-goed"><Icoon naam="goed" /></span>
                    : <>{p.fout.map(id => <span key={id} className="pd-chip" title={categorieRegel(id)}>{categorieNaam(id)}</span>)}{p.overig && <span className="pd-chip overig">overig</span>}</>}
                </td>
                <td className="pd-reken">
                  {c === undefined
                    ? <Knop variant="subtiel" maat="sm" onClick={() => reken(i, !p.goed)}>{p.goed ? 'Fout rekenen' : 'Goed rekenen'}</Knop>
                    : <Knop variant="subtiel" maat="sm" onClick={() => reken(i, null)}>Zelf {c ? 'goed' : 'fout'} gerekend, terugzetten</Knop>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="pd-acties kk-mt-3">
        {!zeker
          ? <Knop variant="secundair" icoon="prullenbak" onClick={() => setZeker(true)}>Resultaat verwijderen</Knop>
          : <span className="pd-zeker">
              Het resultaat van {naam} verwijderen? Dan kan {naam} het dictee opnieuw maken{open ? '' : ' zodra je het weer klaarzet'}. Terughalen kan niet.
              <Knop variant="subtiel" onClick={() => setZeker(false)}>Nee</Knop> <Knop variant="secundair" onClick={opnieuw}>Ja, verwijderen</Knop>
            </span>}
      </div>
    </div>
  )
}
