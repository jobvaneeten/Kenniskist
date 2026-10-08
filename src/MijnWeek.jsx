import { useEffect, useState } from 'react'
import { useSessie } from './lib/sessie.jsx'
import { haalMijnWeek, minuten } from './lib/mijnWeek.js'
import { playTierSound } from './lootboxSound.js'
import DoelBalk from './DoelBalk.jsx'
import { Knop, TerugKnop, Icoon } from './ui/index.jsx'
import './game.css'
import './mijnweek.css'

// Leerlingscherm "Mijn week": wat ik deze schoolweek gedaan heb, in vier
// kolommen. Een doel dat behaald is en nog niet gevierd, krijgt eerst een
// feestmoment (één keer per doel, onthouden op dit apparaat).

const KOLOM = {
  weektaak: { titel: 'Weektaak',     icoon: 'klembord', accent: 'var(--kk-cyan)',    leeg: 'Nog niks aan je weektaak gedaan.' },
  taak:     { titel: 'Taken',        icoon: 'potlood',  accent: 'var(--kk-pink)',    leeg: 'Geen taken gemaakt deze week.' },
  doel:     { titel: 'Doelen',       icoon: 'doel',     accent: 'var(--kk-gold)',    leeg: 'Nog niet aan je doelen gewerkt.' },
  vrij:     { titel: 'Vrij oefenen', icoon: 'spel',     accent: 'var(--kk-primary)', leeg: 'Nog niet vrij geoefend.' },
}

const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const dag = (d) => `${d.getDate()} ${MAANDEN[d.getMonth()]}`

const GEVIERD = 'kk_gevierde_doelen'
function leesGevierd() {
  try { return new Set(JSON.parse(localStorage.getItem(GEVIERD) ?? '[]')) } catch { return new Set() }
}
function bewaarGevierd(set) {
  try { localStorage.setItem(GEVIERD, JSON.stringify([...set])) } catch { /* privé-venster */ }
}

function Cijfers({ opgaven, pct, ms }) {
  if (!opgaven) return null
  return (
    <span className="mw-cijfers">
      <span><strong>{Math.round(opgaven)}</strong> opgaven</span>
      {pct != null && <span><strong>{pct}%</strong> goed</span>}
      {ms > 0 && <span><strong>{minuten(ms)}</strong> min</span>}
    </span>
  )
}

function Item({ item }) {
  const behaald = item.soort === 'doel' && item.af
  return (
    <li className={`mw-item${behaald ? ' behaald' : ''}${item.behaaldDezeWeek ? ' nieuw' : ''}`}>
      <div className="mw-item-kop">
        <span className="mw-item-titel">{item.titel}</span>
        {behaald && <span className="mw-badge"><Icoon naam="trofee" />Behaald!</span>}
        {!behaald && item.af && <span className="mw-af"><Icoon naam="goed" />Af</span>}
      </div>
      {item.sub && <span className="mw-item-sub">{item.sub}</span>}
      <Cijfers opgaven={item.opgaven} pct={item.pct} ms={item.ms} />
      {item.soort === 'doel' && <DoelBalk stand={item.stand} />}
    </li>
  )
}

function Kolom({ soort, data }) {
  const k = KOLOM[soort]
  return (
    <section className="mw-kolom" style={{ '--kk-accent': k.accent }}>
      <header className="mw-kolom-kop">
        <span className="mw-kolom-icoon"><Icoon naam={k.icoon} /></span>
        <h2>{k.titel}</h2>
      </header>
      <Cijfers opgaven={data.opgaven} pct={data.pct} ms={data.ms} />
      {data.items.length === 0
        ? <p className="mw-leeg">{k.leeg}</p>
        : <ul className="mw-items">{data.items.map(i => <Item key={i.sleutel} item={i} />)}</ul>}
    </section>
  )
}

// Confetti: één keer bij het laden van de module, zodat de render puur blijft.
const SNIPPERS = Array.from({ length: 60 }, (_, i) => ({
  left: Math.random() * 100,
  vertraging: Math.random() * 1.2,
  duur: 2.4 + Math.random() * 1.8,
  kleur: ['var(--kk-gold)', 'var(--kk-pink)', 'var(--kk-cyan)', 'var(--kk-success)', 'var(--kk-primary-hi)'][i % 5],
  draai: Math.random() * 360,
}))

// Feestmoment: grote trofee, confetti en een fanfare.
function Feest({ doelen, onKlaar }) {
  useEffect(() => { playTierSound('legendary') }, [])
  return (
    <div className="mw-feest" role="dialog" aria-modal="true" aria-label="Doel behaald">
      <div className="mw-confetti" aria-hidden="true">
        {SNIPPERS.map((s, i) => (
          <span key={i} style={{ left: `${s.left}%`, background: s.kleur, animationDelay: `${s.vertraging}s`, animationDuration: `${s.duur}s`, '--draai': `${s.draai}deg` }} />
        ))}
      </div>
      <div className="mw-feest-kaart">
        <span className="mw-feest-trofee"><Icoon naam="trofee" /></span>
        <h2>{doelen.length === 1 ? 'Doel behaald!' : `${doelen.length} doelen behaald!`}</h2>
        <ul className="mw-feest-lijst">
          {doelen.map(d => <li key={d.sleutel}><Icoon naam="ster" />{d.titel}</li>)}
        </ul>
        <p className="mw-feest-tekst">Je had 80% of meer goed van je laatste 20 opgaven. Knap gedaan!</p>
        <Knop variant="primair" onClick={onKlaar}>Yes!</Knop>
      </div>
    </div>
  )
}

export default function MijnWeek({ onBack }) {
  const { profiel } = useSessie()
  const [terug, setTerug] = useState(0)
  const [week, setWeek] = useState(null)
  const [feest, setFeest] = useState([])

  useEffect(() => {
    let actief = true
    async function laad() {
      if (!profiel?.id) return
      const data = await haalMijnWeek(profiel.id, terug)
      if (!actief) return
      setWeek(data)
      const gevierd = leesGevierd()
      const nieuw = data.behaaldeDoelen.filter(d => !gevierd.has(d.opdrachtId))
      if (nieuw.length) setFeest(nieuw)
    }
    laad()
    return () => { actief = false }
  }, [profiel?.id, terug])

  const klaarMetFeest = () => {
    const gevierd = leesGevierd()
    feest.forEach(d => gevierd.add(d.opdrachtId))
    bewaarGevierd(gevierd)
    setFeest([])
  }

  const eind = week ? new Date(week.tot.getTime() - 1) : null
  const t = week?.totaal

  return (
    <div className="game-screen mw">
      <TerugKnop onClick={onBack} />
      <div className="game-header" style={{ '--kk-accent': 'var(--kk-gold)' }}>
        <span className="game-header-icon"><Icoon naam="grafiek" /></span>
        <h1 className="game-header-title">Mijn week</h1>
        <p className="game-header-sub">Kijk wat je allemaal gedaan hebt</p>
      </div>

      <div className="mw-weeknav">
        <Knop variant="secundair" maat="sm" icoon="terug" onClick={() => { setWeek(null); setTerug(n => n + 1) }}>Vorige week</Knop>
        <span className="mw-weeklabel">
          {terug === 0 ? 'Deze week' : terug === 1 ? 'Vorige week' : `${terug} weken terug`}
          {week && <small>{dag(week.van)} – {dag(eind)}</small>}
        </span>
        <Knop variant="secundair" maat="sm" icoonRechts="verder" disabled={terug === 0} onClick={() => { setWeek(null); setTerug(n => Math.max(0, n - 1)) }}>Volgende week</Knop>
      </div>

      {!week && <p className="mode-desc">Laden…</p>}

      {week && (
        <>
          <div className="mw-tegels">
            <div className="mw-tegel"><span className="mw-tegel-getal">{Math.round(t.opgaven)}</span><span>opgaven gemaakt</span></div>
            <div className="mw-tegel"><span className="mw-tegel-getal">{t.opgaven ? `${Math.round((t.goed / t.opgaven) * 100)}%` : '–'}</span><span>goed</span></div>
            <div className="mw-tegel"><span className="mw-tegel-getal">{minuten(t.ms)}</span><span>minuten geoefend</span></div>
            <div className={`mw-tegel${t.behaald ? ' goud' : ''}`}>
              <span className="mw-tegel-getal">{t.behaald ? <><Icoon naam="trofee" />{t.behaald}</> : 0}</span>
              <span>{t.behaald === 1 ? 'doel behaald' : 'doelen behaald'}</span>
            </div>
          </div>

          <div className="mw-kolommen">
            {Object.keys(KOLOM).map(s => <Kolom key={s} soort={s} data={week.kolommen[s]} />)}
          </div>
        </>
      )}

      {feest.length > 0 && <Feest doelen={feest} onKlaar={klaarMetFeest} />}
    </div>
  )
}
