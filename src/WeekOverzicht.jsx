import { useEffect, useState } from 'react'
import { haalMijnWeek, minuten } from './lib/mijnWeek.js'
import DoelBalk from './DoelBalk.jsx'
import { Knop, Icoon } from './ui/index.jsx'
import './game.css'
import './mijnweek.css'

// Het weekoverzicht van één leerling: weeknavigatie, tegels en de vier
// kolommen. Gebruikt door "Mijn week" (leerling) en het portaal (leerkracht).
// onGeladen(data): na elke geladen week (MijnWeek gebruikt dat voor het feest).

const KOLOM = {
  weektaak: { titel: 'Weektaak',     icoon: 'klembord', accent: 'var(--kk-cyan)',    leeg: 'Deze week nog niets aan de weektaak gedaan.' },
  taak:     { titel: 'Taken',        icoon: 'potlood',  accent: 'var(--kk-pink)',    leeg: 'Deze week geen taken gemaakt.' },
  doel:     { titel: 'Doelen',       icoon: 'doel',     accent: 'var(--kk-gold)',    leeg: 'Deze week niet aan doelen gewerkt.' },
  vrij:     { titel: 'Vrij oefenen', icoon: 'spel',     accent: 'var(--kk-primary)', leeg: 'Deze week niet vrij geoefend.' },
}

const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const dag = (d) => `${d.getDate()} ${MAANDEN[d.getMonth()]}`

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

export default function WeekOverzicht({ leerlingId, onGeladen }) {
  const [terug, setTerug] = useState(0)
  const [week, setWeek] = useState(null)

  useEffect(() => {
    let actief = true
    async function laad() {
      if (!leerlingId) return
      const data = await haalMijnWeek(leerlingId, terug)
      if (!actief) return
      setWeek(data)
      onGeladen?.(data)
    }
    laad()
    return () => { actief = false }
  }, [leerlingId, terug]) // eslint-disable-line react-hooks/exhaustive-deps -- onGeladen is een callback, geen reden om opnieuw te laden

  const eind = week ? new Date(week.tot.getTime() - 1) : null
  const t = week?.totaal

  return (
    <>
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
    </>
  )
}
