import { useState } from 'react'
import { TerugKnop } from '../../ui/index.jsx'
import { VerbindStatus } from './VerbindingsMelding.jsx'
import Icoon from './Iconen.jsx'
import './online.css'
import './schermen.css'

// Gedeelde schermen van de online spellen: start (naam + potje maken of
// meedoen), wachtkamer, eindstand en de vaste onderdelen van de HUD. Elk
// spel geeft zijn eigen accentkleur mee; de rest is overal hetzelfde.

const TEAM = [
  { naam: 'Rood', kleur: '#ff4d6d' },
  { naam: 'Blauw', kleur: '#4d9bff' },
]

// Achtergrond met neonrooster. `over`: ligt over het 3D-beeld heen (dan zie
// je de arena er nog doorheen).
export function NeonScherm({ accent, over, onBack, terugTekst, children }) {
  return (
    <div className={'on-scherm' + (over ? ' over' : '')} style={accent ? { '--on-accent': accent } : undefined}>
      {onBack && <TerugKnop onClick={onBack}>{terugTekst}</TerugKnop>}
      {children}
    </div>
  )
}

export function Titel({ icoon, children, sub }) {
  return (
    <header className="on-kop">
      {icoon && <span className="on-embleem"><Icoon naam={icoon} /></span>}
      <h1 className="on-titel">{children}</h1>
      {sub && <p className="on-sub">{sub}</p>}
    </header>
  )
}

// Start: naam invullen, dan een nieuw potje maken of met een code meedoen.
// children = extra keuzes van het spel (map, kart-kleur).
export function StartScherm({
  accent, icoon, titel, sub, onBack, naam, setNaam, codeLengte = 5,
  laden, status, fout, onMaak, onJoin, children,
}) {
  const [code, setCode] = useState('')
  const klaar = code.length >= 4
  return (
    <NeonScherm accent={accent} onBack={onBack}>
      <div className="on-paneel">
        <Titel icoon={icoon} sub={sub}>{titel}</Titel>
        <div className="on-veld">
          <label htmlFor="on-naam">Jouw naam</label>
          <input id="on-naam" className="on-invoer" placeholder="Speler" value={naam} maxLength={12}
            autoComplete="off" onChange={e => setNaam(e.target.value)} />
        </div>
        {children}
        <button type="button" className="on-btn" disabled={laden} onClick={onMaak}>
          <Icoon naam="plus" />Nieuw potje
        </button>
        <div className="on-of"><span>of doe mee met een code</span></div>
        <div className="on-join">
          <input className="on-invoer code" placeholder={'12345'.slice(0, codeLengte)} value={code} maxLength={codeLengte}
            inputMode="numeric" aria-label="Code van het potje" autoComplete="off"
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && klaar && !laden && onJoin(code)} />
          <button type="button" className="on-btn lijn" disabled={laden || !klaar} onClick={() => onJoin(code)}>Meedoen</button>
        </div>
        {laden && <VerbindStatus status={status} />}
        {fout && <p className="on-fout" role="alert">{fout}</p>}
      </div>
    </NeonScherm>
  )
}

// De server zet een robotje voor de naam van een bot; wij tonen een eigen icoon.
const kaal = (naam) => String(naam || 'Speler').replace(/^\u{1F916}\s*/u, '')

function SpelerKaart({ s }) {
  return (
    <li className={'on-speler' + (s.ik ? ' ik' : '')} style={{ '--sp': s.kleur }}>
      <span className="on-speler-kop"><Icoon naam={s.bot ? 'bot' : 'speler'} /></span>
      <span className="on-speler-naam">{kaal(s.naam)}</span>
      {s.ik && <span className="on-chip">Jij</span>}
      {s.bot && <span className="on-chip bot">Bot</span>}
    </li>
  )
}

// Wachtkamer. spelers = [{ sid, naam, kleur, ik, bot, team }]. Met `teams`
// staan ze in twee kolommen (rood tegen blauw). `niveaus`: de server kent
// makkelijke/normale/moeilijke bots (voetbal en paintball).
export function Wachtkamer({ accent, over, code, spelers, teams, niveaus, room, onStart, onBack, terugTekst }) {
  const [niveau, setNiveau] = useState('normaal')
  const cijfers = String(code || '').split('')
  return (
    <NeonScherm accent={accent} over={over} onBack={onBack} terugTekst={terugTekst}>
      <div className="on-paneel breed">
        <div className="on-codeblok">
          <span className="on-label">Code van dit potje</span>
          <div className="on-code" aria-label={'Code ' + cijfers.join(' ')}>
            {cijfers.map((c, i) => <span key={i} style={{ animationDelay: i * 70 + 'ms' }}>{c}</span>)}
          </div>
          <span className="on-sub">Geef de code door. Wie hem intypt doet mee.</span>
        </div>

        {teams ? (
          <div className="on-teams">
            {TEAM.map((t, i) => (
              <section key={i} className="on-team" style={{ '--sp': t.kleur }}>
                <h2>{t.naam}</h2>
                <ul>
                  {spelers.filter(s => s.team === i).map(s => <SpelerKaart key={s.sid} s={{ ...s, kleur: t.kleur }} />)}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <ul className="on-spelers">{spelers.map(s => <SpelerKaart key={s.sid} s={s} />)}</ul>
        )}

        <div className="on-bots">
          <span className="on-label">Bots</span>
          {niveaus && (
            <div className="on-keuze" role="radiogroup" aria-label="Hoe goed zijn de bots">
              {['makkelijk', 'normaal', 'moeilijk'].map(n => (
                <button key={n} type="button" role="radio" aria-checked={niveau === n}
                  className={niveau === n ? 'aan' : ''} onClick={() => setNiveau(n)}>{n}</button>
              ))}
            </div>
          )}
          <div className="on-botknoppen">
            <button type="button" className="on-rond" aria-label="Bot eraf" onClick={() => room?.send('removeBot')}><Icoon naam="min" /></button>
            <Icoon naam="bot" />
            <button type="button" className="on-rond" aria-label="Bot erbij"
              onClick={() => (niveaus ? room?.send('addBot', niveau) : room?.send('addBot'))}><Icoon naam="plus" /></button>
          </div>
        </div>

        <button type="button" className="on-btn groot" onClick={onStart}>
          <Icoon naam="speel" />Start<span className="on-btn-tel">{spelers.length} {spelers.length === 1 ? 'speler' : 'spelers'}</span>
        </button>
      </div>
    </NeonScherm>
  )
}

// Eindstand. kleur = kleur van de winnaar (of goud bij gelijkspel).
export function EindScherm({ over, kleur, kop = 'Afgelopen', winnaar, children, onOpnieuw, onTerug, terugTekst = 'Stoppen', terugIcoon = 'terug' }) {
  return (
    <NeonScherm accent={kleur} over={over}>
      <div className="on-paneel einde">
        <span className="on-stralen" aria-hidden="true" />
        <span className="on-embleem groot"><Icoon naam="beker" /></span>
        <span className="on-label">{kop}</span>
        <h1 className="on-titel">{winnaar}</h1>
        {children}
        <div className="on-rij">
          {onOpnieuw && <button type="button" className="on-btn" onClick={onOpnieuw}><Icoon naam="herlaad" />Nog een keer</button>}
          <button type="button" className="on-btn lijn" onClick={onTerug}><Icoon naam={terugIcoon} />{terugTekst}</button>
        </div>
      </div>
    </NeonScherm>
  )
}

// Eindstand van een teamspel: rood tegen blauw.
export function TeamEinde({ a, b, onOpnieuw, onTerug }) {
  const w = a > b ? 0 : b > a ? 1 : -1
  return (
    <EindScherm kleur={w < 0 ? 'var(--kk-gold)' : TEAM[w].kleur} kop="Tijd is om"
      winnaar={w < 0 ? 'Gelijkspel' : <><span>{TEAM[w].naam}</span> wint</>} onOpnieuw={onOpnieuw} onTerug={onTerug}>
      <div className="on-uitslag">
        <b style={{ '--sp': TEAM[0].kleur }}>{a}</b><i>tegen</i><b style={{ '--sp': TEAM[1].kleur }}>{b}</b>
      </div>
    </EindScherm>
  )
}

// ── HUD ────────────────────────────────────────────────────────────────
// Stand rood tegen blauw met de klok ertussen. De klok wordt elk beeld door
// het spel zelf bijgewerkt (timerRef), zonder React opnieuw te laten tekenen.
export function ScoreBalk({ a, b, timerRef }) {
  return (
    <div className="on-score">
      <span className="on-score-team" style={{ '--sp': TEAM[0].kleur }}><b key={a}>{a}</b></span>
      <span ref={timerRef} className="on-score-tijd">2:00</span>
      <span className="on-score-team" style={{ '--sp': TEAM[1].kleur }}><b key={b}>{b}</b></span>
    </div>
  )
}

export function Aftelling({ n }) {
  return <div className="on-aftel"><span key={n}>{n > 0 ? n : 'GO!'}</span></div>
}

// Groot woord dwars over het scherm (GOAL!).
export function Flits({ children, kleur }) {
  return <div className="on-flits" style={kleur ? { '--sp': kleur } : undefined}><span>{children}</span></div>
}

// Kleine knoppen rechtsboven (camera, volledig scherm).
export function HudKnoppen({ children }) { return <div className="on-hudknoppen">{children}</div> }
export function HudKnop({ icoon, children, ...rest }) {
  return <button type="button" className="on-hudknop" {...rest}><Icoon naam={icoon} />{children && <span>{children}</span>}</button>
}

// Balk onderin (energie, levens). vulRef: het spel zet zelf de breedte.
export function Balk({ icoon, kleur, vulRef }) {
  return (
    <div className="on-balk" style={{ '--sp': kleur }}>
      <Icoon naam={icoon} />
      <div className="on-balk-baan"><div ref={vulRef} className="on-balk-vul" /></div>
    </div>
  )
}
