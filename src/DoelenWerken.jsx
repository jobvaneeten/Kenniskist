import { useEffect, useState } from 'react'
import DoelBalk from './DoelBalk.jsx'
import { soortVan } from './lib/weektaak.js'
import { groepeer } from './lib/weektaakMapjes.js'
import { haalDoelwerkStand, tijdStandVan } from './lib/doelwerk.js'
import { toolLabel } from './lib/tools.js'
import { Knop, TerugKnop, Icoon } from './ui/index.jsx'

const minuten = (n) => `${n} ${n === 1 ? 'minuut' : 'minuten'}`

// Balk met de gewerkte minuten, in dezelfde stijl als die van een doel.
export function TijdBalk({ stand }) {
  if (!stand) return null
  const { gewerkt, nodig, klaar } = stand
  return (
    <span className={`wt-doelbalk${klaar ? ' gehaald' : ''}`}>
      <span className="wt-doelbalk-baan">
        <span className="wt-doelbalk-vul" style={{ width: `${klaar ? 100 : Math.round((gewerkt / nodig) * 100)}%` }} />
      </span>
      <span className="wt-doelbalk-tekst">{klaar ? `Klaar! ${minuten(nodig)} gewerkt` : `${gewerkt} van de ${nodig} min gewerkt`}</span>
    </span>
  )
}

// "Werk aan je doelen" aan de leerlingkant: de open doelen om uit te kiezen,
// of, als ze allemaal behaald zijn, zelf een oefening kiezen. De tijd telt
// alleen als er echt geoefend wordt (zie migratie 0021).
export default function DoelenWerken({ opdracht, alle, onKiesDoel, onVrij, onBack }) {
  const doelen = alle.filter(o => soortVan(o) === 'doel')
  const open = groepeer(doelen.filter(o => !o.klaar))
  const stand = opdracht.tijdStand
  return (
    <div className="game-screen">
      <TerugKnop onClick={onBack} />
      <div className="game-header" style={{ '--kk-accent': stand?.klaar ? 'var(--kk-success)' : 'var(--kk-pink)' }}>
        <span className="game-header-icon"><Icoon naam="doel" /></span>
        <h1 className="game-header-title">Werk aan je doelen</h1>
        <p className="game-header-sub">
          {stand?.klaar
            ? 'Je tijd zit erop. Je mag nog doorgaan als je wilt.'
            : `Oefen ${minuten(stand?.nodig ?? 15)}. Alleen oefenen telt, spelletjes niet.`}
        </p>
        <div className="dw-tijd"><TijdBalk stand={stand} /></div>
      </div>

      {open.length > 0 ? (
        <>
          <p className="mode-desc dw-uitleg">Kies een doel om aan te werken.</p>
          <div className="mode-grid">
            {open.flatMap(m => m.opdrachten.filter(o => !o.klaar).map(o => (
              <button key={o.opdrachtId} className="mode-card wt-map" onClick={() => onKiesDoel(o, m.titel)}
                style={{ '--kk-accent': 'var(--kk-pink)' }}>
                <span className="mode-icoon"><Icoon naam="doel" /></span>
                <span className="mode-name">{m.opdrachten.length > 1 ? `${m.titel} · ${toolLabel(o.toolId)}` : m.titel}</span>
                <DoelBalk stand={o.doelStand} />
              </button>
            )))}
          </div>
        </>
      ) : (
        <div className="wt-uitleg dw-vrij">
          <span className="dw-vrij-icoon"><Icoon naam="trofee" /></span>
          <p className="wt-uitleg-doel">
            {doelen.length > 0 ? 'Al je doelen zijn behaald. Super!' : 'Je hebt nu geen doelen.'} Je mag zelf kiezen wat je oefent.
          </p>
          <Knop variant="primair" icoon="spelen" onClick={onVrij}>Zelf een oefening kiezen</Knop>
        </div>
      )}
    </div>
  )
}

// Klein klokje in beeld tijdens het oefenen: hoeveel minuten er nog liggen. Na
// elk opgeslagen antwoord (seintje uit kenniskist-login.js) halen we de stand
// opnieuw op, dus dit is de echte oefentijd zonder spelletjes.
export function DoelwerkKlok({ opdracht, profielId }) {
  const [stand, setStand] = useState(opdracht.tijdStand)
  useEffect(() => {
    let actief = true
    const bijOpslaan = async () => {
      const rij = await haalDoelwerkStand(opdracht.opdrachtId, profielId)
      if (actief && rij) setStand(tijdStandVan(rij, opdracht.config))
    }
    window.addEventListener('kk-resultaat-opgeslagen', bijOpslaan)
    return () => { actief = false; window.removeEventListener('kk-resultaat-opgeslagen', bijOpslaan) }
  }, [opdracht.opdrachtId, opdracht.config, profielId])
  if (!stand) return null
  return (
    <div className={`dw-klok${stand.klaar ? ' klaar' : ''}`}>
      <Icoon naam={stand.klaar ? 'goed' : 'doel'} />
      {stand.klaar ? 'Je tijd zit erop! Je mag terug.' : `Doelen · nog ${stand.nodig - stand.gewerkt} min`}
    </div>
  )
}
