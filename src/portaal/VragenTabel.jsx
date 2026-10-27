import { useRef, useState } from 'react'
import { leesRijen, VOORBEELD_CSV, MAX_VRAGEN, MAX_LENGTE, MAX_FOUT } from '../lib/eigenVragen.js'
import { Knop, Icoon } from '../ui/index.jsx'

// Invultabel voor een eigen oefening (EigenOefeningen.jsx), met per regel de
// vraag, het goede antwoord en eventueel foute keuzes. Plakken uit Excel,
// Google Spreadsheets of een Word-tabel vult meteen meerdere cellen en
// regels, net als in een spreadsheet; een CSV-bestand inladen kan ook.
// Alleen regels met een vraag én een antwoord gaan mee naar onWijzig(vragen).
//
// Een .xlsx lezen zou een flinke bibliotheek vragen; kopiëren en plakken uit
// Excel doet hetzelfde.

const KOLOMMEN = ['vraag', 'antwoord', ...Array.from({ length: MAX_FOUT }, (_, i) => `fout${i}`)]
const leeg = () => ({ vraag: '', antwoord: '', fout: Array(MAX_FOUT).fill('') })
const vanCellen = ([vraag = '', antwoord = '', ...fout]) => ({
  vraag, antwoord, fout: Array.from({ length: MAX_FOUT }, (_, i) => fout[i] ?? ''),
})
const isLeeg = (r) => !r.vraag.trim() && !r.antwoord.trim() && r.fout.every(f => !f.trim())
const naarVragen = (rijen) => rijen
  .filter(r => r.vraag.trim() && r.antwoord.trim())
  .slice(0, MAX_VRAGEN)
  .map(r => ({ vraag: r.vraag.trim(), antwoord: r.antwoord.trim(), fout: r.fout.map(f => f.trim()).filter(Boolean) }))
// Er staat altijd één lege regel onderaan, om verder te typen.
const metLegeRegel = (rijen) => (rijen.length && isLeeg(rijen[rijen.length - 1]) ? rijen : [...rijen, leeg()])

// Excel bewaart CSV vaak als Windows-1252 in plaats van UTF-8: dan zouden é
// en ë als vreemde tekens binnenkomen.
async function leesBestand(file) {
  const buf = await file.arrayBuffer()
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf) }
  catch { return new TextDecoder('windows-1252').decode(buf) }
}

function downloadVoorbeeld() {
  const url = URL.createObjectURL(new Blob([VOORBEELD_CSV], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = 'voorbeeld-vragenlijst.csv'
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function VragenTabel({ vragen, onWijzig }) {
  const [rijen, setRijen] = useState(() => metLegeRegel((vragen.length ? vragen : [leeg(), leeg()])
    .map(v => vanCellen([v.vraag, v.antwoord, ...(v.fout ?? [])]))))
  const [melding, setMelding] = useState(null)
  const bestandRef = useRef(null)
  const tabelRef = useRef(null)

  // Elke wijziging in de tabel gaat meteen door naar boven.
  const werkBij = (nieuw) => {
    const r = metLegeRegel(nieuw)
    setRijen(r)
    onWijzig(naarVragen(r))
  }

  const zetCel = (i, kolom, waarde) => werkBij(rijen.map((r, idx) => {
    if (idx !== i) return r
    if (kolom.startsWith('fout')) { const fout = [...r.fout]; fout[Number(kolom.slice(4))] = waarde; return { ...r, fout } }
    return { ...r, [kolom]: waarde }
  }))

  // Plakken van meer dan één cel: vanaf deze cel naar rechts en naar beneden
  // invullen, zoals in Excel.
  const plak = (e, i, k) => {
    const tekst = e.clipboardData.getData('text')
    if (!/[\t\n]/.test(tekst.trim())) return
    e.preventDefault()
    const geplakt = leesRijen(tekst)
    if (!geplakt.length) return
    const nieuw = [...rijen]
    geplakt.forEach((cellen, n) => {
      const bestaand = nieuw[i + n] ?? leeg()
      const vlak = [bestaand.vraag, bestaand.antwoord, ...bestaand.fout]
      cellen.forEach((c, j) => { if (k + j < KOLOMMEN.length) vlak[k + j] = c })
      nieuw[i + n] = vanCellen(vlak)
    })
    werkBij(nieuw)
    setMelding(`${geplakt.length} ${geplakt.length === 1 ? 'regel' : 'regels'} geplakt.`)
  }

  const verwijder = (i) => werkBij(rijen.filter((_, idx) => idx !== i))

  // Enter springt naar dezelfde kolom op de volgende regel.
  const opToets = (e, i, k) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    tabelRef.current?.querySelector(`[data-cel="${i + 1}-${k}"]`)?.focus()
  }

  const kiesBestand = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (/\.xlsx?$/i.test(file.name)) {
      setMelding('Een Excel-bestand kan niet direct. Selecteer de cellen in Excel, kopieer ze en plak ze in de eerste cel van de tabel. Of kies in Excel "Opslaan als" en dan CSV.')
      return
    }
    const ingelezen = leesRijen(await leesBestand(file))
    if (!ingelezen.length) { setMelding('Er stonden geen vragen in dit bestand.'); return }
    werkBij([...rijen.filter(r => !isLeeg(r)), ...ingelezen.map(vanCellen)])
    setMelding(`${ingelezen.length} ${ingelezen.length === 1 ? 'regel' : 'regels'} ingeladen uit ${file.name}.`)
  }

  const meerkeuze = vragen.filter(v => v.fout?.length).length
  const onvolledig = rijen.filter(r => !isLeeg(r) && !(r.vraag.trim() && r.antwoord.trim())).length

  return (
    <div className="portaal-veld portaal-veld-breed portaal-eigen">
      <div className="portaal-veld-kop">
        <span className="portaal-veld-label">Je vragen</span>
        <div className="portaal-eigen-knoppen">
          <Knop type="button" variant="secundair" maat="sm" onClick={() => bestandRef.current?.click()}>Bestand inladen</Knop>
          <Knop type="button" variant="secundair" maat="sm" icoon="tekst" onClick={downloadVoorbeeld}>Voorbeeldbestand</Knop>
          <input ref={bestandRef} type="file" accept=".csv,.txt,.tsv,.xlsx,.xls,text/csv,text/plain" hidden onChange={kiesBestand} />
        </div>
      </div>
      <p className="portaal-veld-hint kk-m-0">
        Vul je foute antwoorden in, dan wordt het meerkeuze. Laat je ze leeg, dan typt de leerling het antwoord zelf.
        Meer goede antwoorden mogen met " / " ertussen, bv. <i>Den Haag / 's-Gravenhage</i>.
        Uit Excel of Word? Kopieer de cellen en plak ze in de eerste cel.
      </p>

      <div className="portaal-eigen-scroll">
        <table className="portaal-eigen-tabel" ref={tabelRef}>
          <colgroup>
            <col className="nr" /><col className="vraag" /><col className="antw" />
            {Array.from({ length: MAX_FOUT }, (_, i) => <col key={i} className="fout" />)}
            <col className="soort" /><col className="weg" />
          </colgroup>
          <thead>
            <tr>
              <th>#</th><th>Vraag</th><th className="goed">Goed antwoord</th>
              {Array.from({ length: MAX_FOUT }, (_, i) => <th key={i} className="fout">Fout {i + 1}</th>)}
              <th /><th />
            </tr>
          </thead>
          <tbody>
            {rijen.map((r, i) => {
              const ingevuld = !isLeeg(r)
              const mistVraag = ingevuld && !r.vraag.trim()
              const mistAntw = ingevuld && !r.antwoord.trim()
              const isMk = r.fout.some(f => f.trim())
              const waarden = [r.vraag, r.antwoord, ...r.fout]
              return (
                <tr key={i} className={ingevuld ? undefined : 'leeg'}>
                  <td className="nr">{i + 1}</td>
                  {KOLOMMEN.map((kolom, k) => (
                    <td key={kolom} className={k === 1 ? 'goed' : k > 1 ? 'fout' : undefined}>
                      <input
                        data-cel={`${i}-${k}`} type="text" maxLength={MAX_LENGTE} value={waarden[k]}
                        className={(k === 0 && mistVraag) || (k === 1 && mistAntw) ? 'mist' : undefined}
                        placeholder={i === 0 ? ['Hoofdstad van Frankrijk?', 'Parijs', 'Lyon', 'Nice', ''][k] ?? '' : ''}
                        aria-label={`Regel ${i + 1}, ${k === 0 ? 'vraag' : k === 1 ? 'goed antwoord' : `fout antwoord ${k - 1}`}`}
                        onChange={e => zetCel(i, kolom, e.target.value)}
                        onPaste={e => plak(e, i, k)}
                        onKeyDown={e => opToets(e, i, k)}
                      />
                    </td>
                  ))}
                  <td className="soort">
                    {ingevuld && !mistVraag && !mistAntw && (
                      <span className={`portaal-eigen-label ${isMk ? 'mk' : 'open'}`}>{isMk ? 'meerkeuze' : 'open'}</span>
                    )}
                  </td>
                  <td className="weg">
                    {ingevuld && (
                      <button type="button" className="portaal-eigen-weg" aria-label={`Regel ${i + 1} verwijderen`} onClick={() => verwijder(i)}>
                        <Icoon naam="sluiten" />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="portaal-eigen-status">
        <span>
          <strong>{vragen.length}</strong> {vragen.length === 1 ? 'vraag' : 'vragen'}
          {vragen.length > 0 && ` · ${meerkeuze} meerkeuze, ${vragen.length - meerkeuze} open`}
          {vragen.length >= MAX_VRAGEN && ` · maximaal ${MAX_VRAGEN}`}
        </span>
        {onvolledig > 0 && (
          <span className="portaal-fout">
            {onvolledig} {onvolledig === 1 ? 'regel mist' : 'regels missen'} nog een vraag of goed antwoord en {onvolledig === 1 ? 'telt' : 'tellen'} niet mee.
          </span>
        )}
        {melding && <span className="portaal-zacht">{melding}</span>}
      </div>

    </div>
  )
}
