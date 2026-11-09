import { useState } from 'react'
import { HERHAAL_AANTAL, geledenTekst } from './lib/herhaling.js'
import { toolLabel } from './lib/tools.js'
import { Knop, TerugKnop, Icoon } from './ui/index.jsx'

// Herhalen van een behaald doel (zie lib/herhaling.js en migratie 0024).

// Kaartjes "Weet je het nog?" voor de doelen die nu herhaald moeten worden.
// mappen: zoals groepeer() ze geeft (doel = mapje met één of meer oefeningen).
export function HerhaalKaarten({ mappen, onKies }) {
  const lijst = mappen.flatMap(m => m.opdrachten.filter(o => o.herhaling?.nu).map(o => ({ m, o })))
  if (!lijst.length) return null
  return (
    <section className="wt-herhaal-sectie">
      <h2 className="wt-herhaal-kop"><Icoon naam="opnieuw" />Weet je het nog?</h2>
      <p className="mode-desc">Deze doelen heb je een tijdje geleden behaald. Laat zien dat je ze nog kunt!</p>
      <div className="mode-grid">
        {lijst.map(({ m, o }) => {
          const titel = m.opdrachten.length > 1 ? `${m.titel} · ${toolLabel(o.toolId)}` : m.titel
          return (
            <button key={o.opdrachtId} className="mode-card wt-map wt-herhaal" onClick={() => onKies(o, titel)}>
              <span className="mode-icoon"><Icoon naam="opnieuw" /></span>
              <span className="mode-name">{titel}</span>
              <span className="mode-desc">
                {HERHAAL_AANTAL} opgaven · behaald {geledenTekst(o.herhaling.gehaaldOp)}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// Vóór de herhaling: wat er gaat gebeuren.
export function HerhalingIntro({ opdracht, titel, onStart, onBack }) {
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState(null)
  const start = async () => {
    setBezig(true); setFout(null)
    try { await onStart() } catch { setFout('Dit doel hoeft nu niet herhaald te worden.'); setBezig(false) }
  }
  return (
    <div className="game-screen">
      <TerugKnop onClick={onBack} />
      <div className="game-header" style={{ '--kk-accent': 'var(--kk-gold)' }}>
        <span className="game-header-icon"><Icoon naam="opnieuw" /></span>
        <h1 className="game-header-title">{titel}</h1>
        <p className="game-header-sub">Weet je het nog?</p>
      </div>
      <div className="wt-uitleg">
        <ul className="wt-uitleg-regels">
          <li>Je hebt dit doel {geledenTekst(opdracht.herhaling?.gehaaldOp)} behaald.</li>
          <li>Maak {HERHAAL_AANTAL} opgaven, zonder uitleg vooraf.</li>
          <li>Heb je er 4 of 5 goed, dan blijft je doel behaald.</li>
          <li>Gaat het nog niet goed, dan gaat je doel weer open en oefen je het nog een keer.</li>
        </ul>
        {fout && <p className="wt-uitleg-doel">{fout}</p>}
        <Knop variant="primair" icoon="spelen" disabled={bezig} style={{ marginTop: 18 }} onClick={start}>Start herhaling</Knop>
      </div>
    </div>
  )
}

// Linksonder tijdens de herhaling.
export function HerhalingPil({ stand }) {
  const gemaakt = Math.min(HERHAAL_AANTAL, Math.round(stand?.aantal ?? 0))
  return (
    <div className="dw-klok wt-herhaal-pil">
      <Icoon naam="opnieuw" />Herhaling · {gemaakt} van de {HERHAAL_AANTAL}
    </div>
  )
}

// Na 5 opgaven: gelukt of weggezakt.
export function HerhalingKlaar({ stand, titel, onKlaar }) {
  const gelukt = !!stand.geslaagd
  const vast = gelukt && stand.ronde >= 2
  return (
    <div className="wt-hulp" role="dialog" aria-modal="true" aria-label="Herhaling klaar">
      <div className="wt-hulp-kaart" style={{ '--kk-accent': gelukt ? 'var(--kk-gold)' : 'var(--kk-cyan)' }}>
        <span className="wt-hulp-icoon"><Icoon naam={gelukt ? 'trofee' : 'opnieuw'} /></span>
        <h2>{gelukt ? (vast ? 'Dit zit vast!' : 'Goed onthouden!') : 'Een beetje weggezakt'}</h2>
        <p className="wt-hulp-sub">
          Je had er <strong>{stand.goed} van de {stand.aantal}</strong> goed bij <strong>{titel}</strong>.
        </p>
        <p className="wt-hulp-sub">
          {gelukt
            ? (vast ? 'Je kent dit doel nu echt. Het blijft behaald.' : 'Je doel blijft behaald. Over een paar weken komt hij nog één keer terug.')
            : 'Geeft niks, zo leer je juist. Je doel staat weer open, zodat je het nog een keer kunt oefenen.'}
        </p>
        <Knop variant="primair" icoon={gelukt ? 'goed' : 'verder'} onClick={onKlaar}>{gelukt ? 'Klaar' : 'Verder'}</Knop>
      </div>
    </div>
  )
}
