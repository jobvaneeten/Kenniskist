import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import SpelBeloning, { BRIEFGELD } from './SpelBeloning'
import { useGebruikOpdracht } from './gebruikOpdracht.js'
import { isGoed } from '../lib/eigenVragen.js'
import './verhaaltjes-sommen.css'
import './klok-kijken.css'
import { Knop, TerugKnop, VoortgangsBalk, Icoon, EindScherm } from '../ui/index.jsx'
import { spelNa, heeftSpel } from '../lib/beloning.js'
import { alBeloond, markeerBeloond } from '../lib/eigenOefeningen.js'

// Een eigen oefening van de leerkracht (zie src/portaal/EigenOefeningen.jsx),
// geopend via Speel Game → groep → vak. Met foute keuzes erbij is een vraag
// meerkeuze, anders typt de leerling het antwoord. Na alle vragen volgt een
// eindscherm; "Nog een keer" (onOpnieuw) begint opnieuw.
//
// De leerkracht stelt per oefening in na hoeveel goede antwoorden er een
// spelletje komt (config.spel_na; leeg = zoals de klas is ingesteld) en hoeveel
// briefgeld het afronden oplevert (config.geld, één keer per leerling).

function schud(a) {
  a = a.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

function VraagKaart({ vraag, onNext }) {
  const meerkeuze = vraag.fout?.length > 0
  const [opties] = useState(() => (meerkeuze ? schud([vraag.antwoord, ...vraag.fout]) : []))
  const [invoer, setInvoer] = useState('')
  const [gegeven, setGegeven] = useState(null) // het antwoord van de leerling
  const invoerRef = useRef(null)
  useEffect(() => { if (!meerkeuze) invoerRef.current?.focus() }, [meerkeuze])

  const goed = gegeven != null && (meerkeuze ? gegeven === vraag.antwoord : isGoed(gegeven, vraag.antwoord))
  const controleer = () => { if (invoer.trim()) setGegeven(invoer.trim()) }

  return (
    <div className="rs-card">
      <div className="rs-vraag klk-vraag">{vraag.vraag}</div>

      {meerkeuze ? (
        <div className="klk-opties">
          {opties.map(o => {
            let cls = 'klk-optie'
            if (gegeven != null) cls += o === vraag.antwoord ? ' klk-goed' : o === gegeven ? ' klk-fout' : ' klk-uit'
            return <button key={o} className={cls} disabled={gegeven != null} onClick={() => setGegeven(o)}>{o}</button>
          })}
        </div>
      ) : (
        <div className="rs-antwoord-row">
          <input
            ref={invoerRef} className="rs-input" type="text" autoComplete="off" placeholder="Jouw antwoord…"
            value={invoer} disabled={gegeven != null}
            onChange={e => setInvoer(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && gegeven == null) { e.preventDefault(); controleer() } }}
          />
          {gegeven == null && <Knop variant="primair" disabled={!invoer.trim()} onClick={controleer}>Controleer</Knop>}
        </div>
      )}

      {gegeven != null && (
        <div className={`rs-feedback ${goed ? 'rs-goed' : 'rs-fout'}`}>
          {!meerkeuze && !goed && <div className="rs-jouw">Jouw antwoord: <b>{gegeven}</b></div>}
          <span className="rs-feedback-kop">
            <Icoon naam={goed ? 'goed' : 'fout'} />
            {goed ? 'Goed!' : <>Het goede antwoord is <b>{vraag.antwoord}</b>.</>}
          </span>
          <Knop enter variant="primair" icoonRechts="verder" className="rs-verder-btn" onClick={() => onNext(goed, gegeven)}>
            {goed ? 'Verder' : 'Volgende'}
          </Knop>
        </div>
      )}
    </div>
  )
}

export default function EigenVragen({ onBack, onOpnieuw, addBriefgeld, addCuruntie, aantal, config, titel }) {
  const lijst = useMemo(() => config?.vragen ?? [], [config])
  const schudden = config?.schudden !== false
  const opdracht = useGebruikOpdracht({ toolId: 'eigen-vragen', aantal })
  const maakRij = useCallback(() => (schudden ? schud(lijst) : lijst), [lijst, schudden])
  const [rij, setRij] = useState(maakRij)
  const [pos, setPos] = useState(0)
  const [nr, setNr] = useState(0) // telt mee in de key, zodat dezelfde vraag na een ronde een verse kaart krijgt
  const [sinds, setSinds] = useState(0)
  const [verdiend, setVerdiend] = useState(0)
  const [beloning, setBeloning] = useState(false)
  const [eindGeld, setEindGeld] = useState(0)
  const perBeloning = config?.spel_na === 0 ? Infinity : config?.spel_na > 0 ? config.spel_na : spelNa(5)

  const volgendeVraag = () => {
    setNr(n => n + 1)
    if (pos + 1 >= rij.length) { setRij(maakRij()); setPos(0) } else setPos(p => p + 1)
  }

  const volgende = (correct, gegeven) => {
    const v = rij[pos]
    const zalKlaarZijn = opdracht.aantal != null && (opdracht.gedaan + 1) >= opdracht.aantal
    opdracht.registreer(correct, { vraag: v.vraag, antwoord: gegeven, juist: v.antwoord, cat: titel, catLabel: titel })
    if (zalKlaarZijn) {
      if (config?.geld > 0 && config.id && !alBeloond(config.id)) {
        markeerBeloond(config.id)
        addBriefgeld?.(config.geld)
        setEindGeld(config.geld)
      }
      return
    }
    if (correct) {
      const ns = sinds + 1
      if (ns >= perBeloning) { setSinds(0); setBeloning(true); volgendeVraag(); return }
      setSinds(ns)
    }
    volgendeVraag()
  }

  if (beloning) {
    return (
      <SpelBeloning title={`${perBeloning} goed!`} geld={BRIEFGELD} addCuruntie={addCuruntie}
        onDone={() => { setBeloning(false); addBriefgeld?.(BRIEFGELD); setVerdiend(v => v + BRIEFGELD) }} />
    )
  }

  if (opdracht.klaar) {
    return (
      <div className="game-screen game-screen-center">
        <EindScherm
          titel="Klaar!" score={`${opdracht.goed} / ${opdracht.aantal}`} tekst="goed beantwoord"
          onVerder={onBack} verderTekst="Terug" onOpnieuw={onOpnieuw}
        >
          {eindGeld > 0 && <p className="kk-eind-tekst">Je verdient 💵 € {eindGeld} briefgeld!</p>}
        </EindScherm>
      </div>
    )
  }

  if (!lijst.length) {
    return (
      <div className="rs-screen">
        <TerugKnop onClick={onBack} />
        <div className="rs-header">
          <span className="rs-icon"><Icoon naam="klembord" /></span>
          <h1 className="rs-title">{titel || 'Vragenlijst'}</h1>
          <p className="rs-sub">Er staan nog geen vragen in deze oefening. Vraag je juf of meester ernaar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rs-screen rs-screen-oefen">
      <div className="rs-oefen-top">
        <TerugKnop onClick={onBack}>Stoppen</TerugKnop>
        <span className="rs-verdiend">{titel || 'Vragenlijst'}</span>
        {opdracht.aantal != null && <span className="rs-verdiend">{opdracht.gedaan + 1} / {opdracht.aantal}</span>}
        <span className="rs-verdiend">💵 € {verdiend}</span>
      </div>
      {heeftSpel(perBeloning) && <VoortgangsBalk waarde={sinds} max={perBeloning} label={`nog ${perBeloning - sinds} goed tot een spelletje`} />}
      <VraagKaart key={nr} vraag={rij[pos]} onNext={volgende} />
    </div>
  )
}
