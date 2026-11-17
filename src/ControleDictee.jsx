import { useEffect, useRef, useState } from 'react'
import { haalMijnDictee, bewaarDictee } from './lib/controleDictee.js'
import { Knop, TerugKnop, Icoon } from './ui/index.jsx'
import './controledictee.css'

// Controledictee voor de leerling: genummerde vakjes, de juf of meester
// dicteert hardop. Geen spel, geen tijd, geen goed of fout. Spellingcontrole
// en autocorrectie staan uit. Wat het kind typt blijft op het apparaat staan
// (en wordt tussendoor bewaard) tot het is ingeleverd.

const TEKENS = ['é', 'è', 'ë', 'ï', 'ö', 'ü', "'"]
const sleutel = (id) => `kk_dictee_${id}`

export default function ControleDictee({ onBack }) {
  const [dictee, setDictee] = useState(undefined)   // undefined = laden, null = geen
  const [antw, setAntw] = useState([])
  const [stap, setStap] = useState('maken')         // maken | zeker | klaar | ingetrokken
  const [fout, setFout] = useState('')
  const [bezig, setBezig] = useState(false)
  const velden = useRef([])
  const laatste = useRef(null)                      // laatst gebruikte vakje (voor é ë ...)
  const bewaard = useRef('')

  useEffect(() => {
    haalMijnDictee().then(d => {
      setDictee(d)
      if (!d) return
      if (d.ingeleverd) { setStap('klaar'); return }
      const n = d.vakken?.length ?? 0
      let lokaal = null
      try { lokaal = JSON.parse(localStorage.getItem(sleutel(d.id)) || 'null') } catch {}
      const bron = Array.isArray(lokaal) ? lokaal : d.antwoorden ?? []
      setAntw(Array.from({ length: n }, (_, i) => typeof bron[i] === 'string' ? bron[i] : ''))
      bewaard.current = JSON.stringify(d.antwoorden ?? [])
    }).catch(() => setDictee(null))
  }, [])

  // Trekt de leerkracht het dictee in, dan verdwijnt het ook hier.
  useEffect(() => {
    if (!dictee || stap === 'klaar' || stap === 'ingetrokken') return
    const t = setInterval(() => {
      haalMijnDictee().then(d => { if (d?.id !== dictee.id) setStap('ingetrokken') }).catch(() => {})
    }, 10000)
    return () => clearInterval(t)
  }, [dictee, stap])

  // Lokaal bij elke letter, op de server bij het verlaten van een vakje.
  const zet = (i, waarde) => {
    const nieuw = antw.slice(); nieuw[i] = waarde.slice(0, 60); setAntw(nieuw)
    try { localStorage.setItem(sleutel(dictee.id), JSON.stringify(nieuw)) } catch {}
  }
  const tussendoor = () => {
    const tekst = JSON.stringify(antw)
    if (!dictee || tekst === bewaard.current) return
    bewaard.current = tekst
    bewaarDictee(dictee.id, antw).catch(() => { bewaard.current = '' })
  }
  const teken = (t) => {
    const i = laatste.current ?? 0
    const el = velden.current[i]
    if (!el) return
    const van = el.selectionStart ?? el.value.length, tot = el.selectionEnd ?? van
    zet(i, el.value.slice(0, van) + t + el.value.slice(tot))
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(van + t.length, van + t.length) })
  }
  const volgende = (e, i) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    velden.current[i + 1]?.focus()
  }

  const inleveren = async () => {
    setBezig(true); setFout('')
    try {
      const ok = await bewaarDictee(dictee.id, antw, true)
      if (!ok) { setFout('Het dictee is al gesloten. Zeg het tegen je juf of meester.'); setBezig(false); return }
      try { localStorage.removeItem(sleutel(dictee.id)) } catch {}
      setStap('klaar')
    } catch {
      setFout('Inleveren lukt nu niet. Je antwoorden staan nog op dit apparaat: probeer het zo nog eens.')
    }
    setBezig(false)
  }

  if (dictee === undefined) return <div className="cd-scherm"><p className="cd-zacht">Even laden…</p></div>

  if (stap === 'ingetrokken') return (
    <div className="cd-scherm cd-midden">
      <TerugKnop onClick={onBack} />
      <div className="cd-klaar">
        <span className="cd-klaar-icoon"><Icoon naam="slot" /></span>
        <h1>Dictee gestopt</h1>
        <p>Je juf of meester heeft het dictee weggehaald.</p>
        <Knop variant="primair" onClick={onBack}>Terug naar het begin</Knop>
      </div>
    </div>
  )

  if (!dictee || stap === 'klaar') return (
    <div className="cd-scherm cd-midden">
      <TerugKnop onClick={onBack} />
      <div className="cd-klaar">
        <span className="cd-klaar-icoon"><Icoon naam={dictee ? 'goed' : 'potlood'} /></span>
        <h1>{dictee ? 'Ingeleverd' : 'Geen dictee'}</h1>
        <p>{dictee ? 'Je juf of meester kijkt het na.' : 'Er staat nu geen dictee voor je klaar.'}</p>
        <Knop variant="primair" onClick={onBack}>Terug naar het begin</Knop>
      </div>
    </div>
  )

  const vakken = dictee.vakken ?? []
  const leeg = antw.filter(a => !a.trim()).length
  // los woord: "1".."15"; woorden in een zin: kopje "Zin 1" met a, b, c
  let losNr = 0
  const regels = vakken.map((zin, i) => {
    if (zin == null) return { i, label: String(++losNr) }
    const eerste = vakken.indexOf(zin) === i
    const letter = 'abcdefgh'[vakken.slice(0, i).filter(z => z === zin).length]
    return { i, label: letter, kop: eerste ? `Zin ${zin}` : null }
  })

  return (
    <div className="cd-scherm">
      <TerugKnop onClick={() => { tussendoor(); onBack() }} />
      <header className="cd-kop">
        <h1>{dictee.titel}</h1>
        <p className="cd-zacht">Schrijf het woord dat je juf of meester zegt in het goede vakje. Bij een zin schrijf je alleen de woorden die worden genoemd.</p>
      </header>

      <div className="cd-tekens" role="toolbar" aria-label="Letters met tekens">
        {TEKENS.map(t => (
          <button key={t} type="button" className="cd-teken" onMouseDown={e => e.preventDefault()} onClick={() => teken(t)}>{t}</button>
        ))}
      </div>

      <ol className="cd-lijst" spellCheck={false}>
        {regels.map(({ i, label, kop }) => (
          <li key={i} className={kop !== undefined ? 'cd-regel cd-zinregel' : 'cd-regel'}>
            {kop && <span className="cd-zinkop">{kop}</span>}
            <label className="cd-veld">
              <span className="cd-nr">{label}</span>
              <input
                ref={el => { velden.current[i] = el }}
                value={antw[i] ?? ''}
                onChange={e => zet(i, e.target.value)}
                onFocus={() => { laatste.current = i }}
                onBlur={tussendoor}
                onKeyDown={e => volgende(e, i)}
                disabled={stap !== 'maken'}
                maxLength={60}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
                data-lt-active="false"
                data-ms-editor="false"
                enterKeyHint="next"
                aria-label={kop !== undefined ? `Zin ${vakken[i]} woord ${label}` : `Woord ${label}`}
              />
            </label>
          </li>
        ))}
      </ol>

      {fout && <p className="cd-fout">{fout}</p>}

      <div className="cd-onder">
        {stap === 'maken' && (
          <Knop variant="primair" maat="lg" onClick={() => { tussendoor(); setStap('zeker') }}>Inleveren</Knop>
        )}
        {stap === 'zeker' && (
          <div className="cd-zeker">
            <p>{leeg ? `Je hebt nog ${leeg} ${leeg === 1 ? 'vakje' : 'vakjes'} leeg. ` : ''}Lees alles nog een keer goed na. Daarna kun je niets meer veranderen.</p>
            <div className="cd-knoppen">
              <Knop variant="subtiel" onClick={() => setStap('maken')}>Nog even nalezen</Knop>
              <Knop variant="primair" disabled={bezig} onClick={inleveren}>{bezig ? 'Bezig…' : 'Ja, inleveren'}</Knop>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
