import { useEffect, useMemo, useState } from 'react'
import { useSessie } from './lib/sessie.jsx'
import { haalMijnWeektaak, zetActieveOpdracht, wisActieveOpdracht, soortVan, DOEL_MIN, DOEL_PCT } from './lib/weektaak.js'
import DoelBalk from './DoelBalk.jsx'
import { uitlegVoor } from './lib/doelUitleg.js'
import { toolLabel, TOOL_BY_ID, VAKKEN } from './lib/tools.js'
import { resterendeMinuten } from './lib/leestimerOpslag.js'
import { isLescheck, lesLabel } from './lib/lescheck.js'
import { groepeer, korteDatum } from './lib/weektaakMapjes.js'
import RenderTool from './games/toolRender.jsx'
import { Knop, TerugKnop, Icoon } from './ui/index.jsx'
import './game.css'

// Halverwege gestopt met lezen: dan telt niet "0 / 1 gemaakt" maar hoeveel
// minuten er nog liggen. De stand staat lokaal én in de database (zie
// lib/leestimerOpslag.js), dus dit klopt ook op een andere iPad.
function leesRest(o) {
  if (o.klaar || TOOL_BY_ID[o.toolId]?.familie !== 'lezen') return null
  return resterendeMinuten(o.opdrachtId, o.config, o.leesstand)
}

// Leerlingscherm: de weektaken van de eigen klas als mapjes, met daarin de
// opdrachten die aan deze leerling zijn toegewezen. Los van GameMenu.jsx (zie
// toolRender.jsx voor waarom) — deze state-machine heeft drie standen: de
// mapjes, de opdrachten in één mapje, of één gekozen opdracht.
// openMapId: direct in dit mapje beginnen. Gebruikt door de lescheck-banner op
// het startscherm — het kind heeft net les gehad en moet in één klik bij zijn
// les zijn, niet eerst door de mapjes.
// persoonlijk: "Speciaal voor mij" — dezelfde schermen, maar alleen de taken
// of doelen (tabblad bovenin) i.p.v. de weektaken.
// Doelen staan per vak: de leerling kiest eerst het vak en ziet dan de
// doelen daarvan. Het vak van een doel is dat van zijn (eerste) oefening.
const VAK_ICOON = { taal: 'boek', spelling: 'potlood', rekenen: 'rekenen', begrijpend: 'lezen', lezen: 'boek', topo: 'kaart' }
const VAK_KLEUR = { taal: 'var(--kk-vak-taal)', spelling: 'var(--kk-vak-spelling)', rekenen: 'var(--kk-vak-rekenen)', begrijpend: 'var(--kk-vak-lezen)', lezen: 'var(--kk-vak-lezen)', topo: 'var(--kk-vak-topo)' }
const vakVan = (m) => TOOL_BY_ID[m.opdrachten[0]?.toolId]?.vak ?? 'overig'
const vakNaam = (key) => VAKKEN.find(v => v.key === key)?.label ?? 'Overig'

// Vóór het oefenen van een doel: kort de uitleg, dan pas de oefening.
function DoelUitleg({ opdracht, titel, onStart, onBack }) {
  const { regels, voorbeeld } = uitlegVoor(opdracht)
  return (
    <div className="game-screen">
      <TerugKnop onClick={onBack} />
      <div className="game-header" style={{ '--kk-accent': VAK_KLEUR[TOOL_BY_ID[opdracht.toolId]?.vak] ?? 'var(--kk-pink)' }}>
        <span className="game-header-icon"><Icoon naam="doel" /></span>
        <h1 className="game-header-title">{titel}</h1>
        <p className="game-header-sub">Zo werkt het</p>
      </div>
      <div className="wt-uitleg">
        <ul className="wt-uitleg-regels">
          {regels.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
        {voorbeeld && (
          <div className="wt-uitleg-vb">
            <span className="wt-uitleg-vb-kop">Voorbeeld</span>
            <span>{voorbeeld.vraag}</span>
            <strong>{voorbeeld.antwoord}</strong>
          </div>
        )}
        <p className="wt-uitleg-doel">Het doel is gehaald als je van je laatste {DOEL_MIN} opgaven er minstens {DOEL_PCT}% goed hebt.</p>
        <DoelBalk stand={opdracht.doelStand} />
        <Knop variant="primair" icoon="spelen" style={{ marginTop: 18 }} onClick={onStart}>Start oefenen</Knop>
      </div>
    </div>
  )
}

const PERSOONLIJK = {
  taak: { icoon: 'potlood', meervoud: 'Taken', leeg: 'Je hebt nu geen taken.' },
  doel: { icoon: 'doel',    meervoud: 'Doelen', leeg: 'Je hebt nu geen doelen.' },
}

export default function Weektaak({ onBack, addBriefgeld, addCuruntie, openMapId = null, persoonlijk = false }) {
  const { profiel, toegestaneGroepen } = useSessie()
  const [opdrachten, setOpdrachten] = useState(null)
  const [gekozen, setGekozen] = useState(null)
  const [openMap, setOpenMap] = useState(openMapId)
  const [ververs, setVervers] = useState(0)
  const [tab, setTab] = useState('taak')
  const [doelVak, setDoelVak] = useState(null)
  const [uitleg, setUitleg] = useState(null) // { opdracht, titel } — doel vóór het oefenen
  const soort = persoonlijk ? tab : 'weektaak'

  useEffect(() => {
    let actief = true
    async function laad() {
      if (!profiel?.id || !profiel?.klas_id) { if (actief) setOpdrachten([]); return }
      const data = await haalMijnWeektaak(profiel.id, profiel.klas_id)
      if (actief) setOpdrachten(data)
    }
    laad()
    return () => { actief = false }
  }, [profiel?.id, profiel?.klas_id, ververs])

  const zichtbaar = useMemo(() => (opdrachten ?? []).filter(o => soortVan(o) === soort), [opdrachten, soort])
  // Een taak is weg zodra hij af is; een doel blijft staan (ook als hij
  // behaald is) tot de leerkracht hem verwijdert.
  const mappen = useMemo(() => groepeer(zichtbaar)
    .filter(m => soort !== 'taak' || !m.opdrachten.every(o => o.klaar)), [zichtbaar, soort])

  // Precies hier, vlak vóór het renderen van de tool, wordt kk_actieve_
  // opdracht gezet — en nergens anders. slaResultaatOp (kenniskist-login.js)
  // leest hem uit om het resultaat aan deze opdracht te hangen, maar alleen
  // als de toolId matcht: klikt de leerling terug en oefent hij iets anders
  // vrij, dan mag dát resultaat nooit aan deze opdracht blijven hangen.
  const start = (opdracht) => {
    setUitleg(null)
    zetActieveOpdracht(opdracht)
    setGekozen(opdracht)
  }
  // Een doel krijgt eerst de uitleg; de rest start meteen.
  const kies = (opdracht, titel) => (soortVan(opdracht) === 'doel' ? setUitleg({ opdracht, titel }) : start(opdracht))

  const terugVanTool = () => {
    wisActieveOpdracht()
    setGekozen(null)
    setVervers(v => v + 1) // haalt de bijgewerkte voortgang opnieuw op
  }

  if (gekozen) {
    return (
      <RenderTool
        opdracht={gekozen}
        groep={toegestaneGroepen?.[0]}
        onBack={terugVanTool}
        addBriefgeld={addBriefgeld}
        addCuruntie={addCuruntie}
      />
    )
  }

  if (uitleg) {
    return <DoelUitleg opdracht={uitleg.opdracht} titel={uitleg.titel} onStart={() => start(uitleg.opdracht)} onBack={() => setUitleg(null)} />
  }

  // Het open mapje wordt per render opnieuw opgezocht in plaats van in state
  // bewaard: na het maken van een opdracht laadt de voortgang opnieuw, en dan
  // moet het mapje de nieuwe cijfers tonen en niet die van een oude kopie.
  const map = openMap ? mappen.find(m => m.id === openMap) : null

  if (map) {
    const af = map.opdrachten.filter(o => o.klaar).length
    const direct = openMapId === map.id
    return (
      <div className="game-screen">
        <TerugKnop onClick={() => (direct ? onBack() : setOpenMap(null))} />
        <div className="game-header" style={{ '--kk-accent': 'var(--kk-cyan)' }}>
          <span className="game-header-icon"><Icoon naam={persoonlijk ? PERSOONLIJK[tab].icoon : 'klembord'} /></span>
          <h1 className="game-header-title">{map.titel}</h1>
          <p className="game-header-sub">
            {af} van de {map.opdrachten.length} opdracht{map.opdrachten.length === 1 ? '' : 'en'} af
            {map.eindOp && !persoonlijk ? ` · tot en met ${korteDatum(map.eindOp)}` : ''}
          </p>
        </div>

        <div className="mode-grid">
          {map.opdrachten.map(o => (
            <button key={o.opdrachtId} className="mode-card" onClick={() => kies(o, toolLabel(o.toolId))}
              style={{ '--kk-accent': o.klaar ? 'var(--kk-success)' : VAK_KLEUR[TOOL_BY_ID[o.toolId]?.vak] }}>
              <span className="mode-icoon"><Icoon naam={o.klaar ? 'goed' : VAK_ICOON[TOOL_BY_ID[o.toolId]?.vak] ?? 'doel'} /></span>
              <span className="mode-name">
                {isLescheck(o) ? lesLabel(o) : toolLabel(o.toolId)}
              </span>
              <span className="mode-desc">
                {isLescheck(o)
                  ? (o.klaar ? 'Je som is gemaakt' : 'Eén som over de les van vandaag')
                  : leesRest(o) != null
                    ? `Nog ${leesRest(o)} min te lezen`
                    : o.doelStand
                      ? null
                    : o.doel != null
                      ? `${Math.min(o.somMax, o.doel)} / ${o.doel} gemaakt`
                      : `${o.pogingen}× gemaakt`}
              </span>
              {o.doelStand && <DoelBalk stand={o.doelStand} />}
              {/* Opnieuw gezet: door de juf of meester, of automatisch omdat er
                  minder dan de helft goed was. De teller staat dan weer op 0. */}
              {o.herkansingen > 0 && !o.klaar && (
                <span className="wt-opnieuw">Opnieuw maken · poging {o.herkansingen + 1}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="game-screen">
      <TerugKnop onClick={onBack} />
      {persoonlijk ? (
        <div className="game-header" style={{ '--kk-accent': 'var(--kk-pink)' }}>
          <span className="game-header-icon"><Icoon naam="ster" /></span>
          <h1 className="game-header-title">Speciaal voor mij</h1>
          <p className="game-header-sub">Door je juf of meester alleen voor jou klaargezet</p>
          <div className="svm-tabs">
            {Object.entries(PERSOONLIJK).map(([key, p]) => (
              <button key={key} className={tab === key ? 'svm-tab actief' : 'svm-tab'} onClick={() => { setTab(key); setDoelVak(null) }}>
                {p.meervoud}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="game-header" style={{ '--kk-accent': 'var(--kk-cyan)' }}>
          <span className="game-header-icon"><Icoon naam="klembord" /></span>
          <h1 className="game-header-title">Mijn weektaak</h1>
          <p className="game-header-sub">Opdrachten die je juf of meester voor je heeft klaargezet</p>
        </div>
      )}

      {opdrachten === null && <p className="mode-desc">Laden…</p>}
      {opdrachten !== null && zichtbaar.length === 0 && (
        <p className="mode-desc">
          {persoonlijk ? PERSOONLIJK[tab].leeg : 'Nog geen weektaak — vraag het aan je juf of meester.'}
        </p>
      )}
      {/* Doelen: eerst de vakken, dan de doelen van het gekozen vak. */}
      {soort === 'doel' && !doelVak && mappen.length > 0 && (
        <div className="mode-grid">
          {VAKKEN.map(v => v.key).concat('overig')
            .filter(key => mappen.some(m => vakVan(m) === key))
            .map(key => {
              const lijst = mappen.filter(m => vakVan(m) === key)
              return (
                <button key={key} className="mode-card wt-map" style={{ '--kk-accent': VAK_KLEUR[key] }} onClick={() => setDoelVak(key)}>
                  <span className="mode-icoon"><Icoon naam={VAK_ICOON[key] ?? 'doel'} /></span>
                  <span className="mode-name">{vakNaam(key)}</span>
                  <span className="mode-desc">{lijst.length} {lijst.length === 1 ? 'doel' : 'doelen'}</span>
                </button>
              )
            })}
        </div>
      )}
      {soort === 'doel' && doelVak && (
        <Knop variant="secundair" maat="sm" icoon="terug" style={{ marginBottom: 14 }} onClick={() => setDoelVak(null)}>
          {vakNaam(doelVak)} · alle vakken
        </Knop>
      )}
      {mappen.length > 0 && (soort !== 'doel' || doelVak) && (
        <div className="mode-grid">
          {mappen.filter(m => soort !== 'doel' || vakVan(m) === doelVak).map(m => {
            const af = m.opdrachten.filter(o => o.klaar).length
            const alles = af === m.opdrachten.length
            return (
              // Een taak of doel met maar één oefening opent meteen die oefening.
              <button
                key={m.id} className="mode-card wt-map"
                style={alles ? { '--kk-accent': 'var(--kk-success)' } : undefined}
                onClick={() => (persoonlijk && m.opdrachten.length === 1 ? kies(m.opdrachten[0], m.titel) : setOpenMap(m.id))}
              >
                <span className="mode-icoon"><Icoon naam={alles ? 'goed' : persoonlijk ? PERSOONLIJK[tab].icoon : 'klembord'} /></span>
                <span className="mode-name">{m.titel}</span>
                <span className="mode-desc">
                  {soort === 'doel'
                    ? (m.opdrachten.length === 1
                        ? (alles ? 'Je mag blijven oefenen' : null)
                        : `${af} van de ${m.opdrachten.length} behaald`)
                    : soort === 'taak' && m.opdrachten.length === 1 && m.opdrachten[0].doel != null
                      ? `${Math.min(m.opdrachten[0].somMax, m.opdrachten[0].doel)} / ${m.opdrachten[0].doel} gemaakt`
                      : `${af} van de ${m.opdrachten.length} af`}
                </span>
                {soort === 'doel' && m.opdrachten.length === 1 && <DoelBalk stand={m.opdrachten[0].doelStand} />}
                {m.eindOp && !persoonlijk && (
                  <span className="wt-map-datum">tot en met {korteDatum(m.eindOp)}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
