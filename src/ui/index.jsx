// Gedeelde UI-componenten van de Kenniskist-huisstijl. Alleen tokens uit
// src/theme.css; geen eigen kleuren per scherm.
import { useEffect, useRef } from 'react'
import '../theme.css'
import './ui.css'

// ── Iconen: lijn-iconen i.p.v. emoji, erven currentColor ──────────────
const PADEN = {
  terug:   'M15 18l-6-6 6-6',
  verder:  'M9 18l6-6-6-6',
  opnieuw: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  pauze:   'M8 5v14M16 5v14',
  spelen:  'M7 4l13 8-13 8z',
  goed:    'M4 12.5l5 5L20 6.5',
  fout:    'M6 6l12 12M18 6L6 18',
  sluiten: 'M6 6l12 12M18 6L6 18',
  ster:    'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  menu:    'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  info:    'M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  munt:    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4',
  trofee:  'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4v4h-4z',
  spel:    'M6 8h12a4 4 0 0 1 4 4v1a3 3 0 0 1-5.4 1.8L15.5 13h-7l-1.1 1.8A3 3 0 0 1 2 13v-1a4 4 0 0 1 4-4zM7 10.5v3M5.5 12h3M16 11h.01M18 13h.01',
  shirt:   'M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0z',
  tas:     'M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2',
  klembord:'M9 4h6v3H9zM9 5H6v16h12V5h-3M9 12h6M9 16h4',
  ticket:  'M3 8a2 2 0 0 0 0 4v0a2 2 0 0 0 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3zM14 6v12',
  uit:     'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  boek:    'M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2zM22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z',
  potlood: 'M4 20l1-5L16 4l4 4L9 19zM14 6l4 4',
  rekenen: 'M5 3h14v18H5zM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01',
  kaart:   'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15',
  lezen:   'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM15 15l6 6',
  klok:    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  doel:    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  slot:    'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3',
  geluid:  'M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  stil:    'M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6',
  grafiek: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  liniaal: 'M3 16L16 3l5 5L8 21zM7 12l2 2M10 9l2 2M13 6l2 2',
  lamp:    'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  prullenbak: 'M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3',
  rekenmachine: 'M6 3h12v18H6zM9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01',
  tekst:   'M4 6h16M4 12h16M4 18h10',
  uitroep: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v6M12 16.5h.01',
  denk:    'M7 17a5 5 0 0 1-1-9.9A6 6 0 0 1 17.5 6 4.5 4.5 0 0 1 17 15H9zM7 21h.01M5 19h.01',
  wijs:    'M9 11V5a2 2 0 0 1 4 0v5l4.5.8a2 2 0 0 1 1.6 2.3L18 19a2 2 0 0 1-2 1.6h-5.6a2 2 0 0 1-1.6-.8L6 16a1.5 1.5 0 0 1 2.3-2L9 15',
  slepen:  'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
  printer: 'M6 9V3h12v6M6 18H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7h-2M7 14h10v7H7z',
  instellingen: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
}
export function Icoon({ naam, titel }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden={!titel} role={titel ? 'img' : undefined}>
      {titel && <title>{titel}</title>}
      <path d={PADEN[naam]} />
    </svg>
  )
}

const cx = (...c) => c.filter(Boolean).join(' ')

// ── Knop ──────────────────────────────────────────────────────────────
// variant: primair | secundair | beloning | gevaar | subtiel
// maat: sm | md | lg — icoon links, icoonRechts rechts, alleenIcoon = vierkant
// enter: deze knop reageert ook op de Enter-toets, waar de focus ook staat
// (bv. "Verder" na het nakijken: dan hoeft het kind niet naar de muis).
// Typt iemand in een veld of staat de focus op een andere knop, dan blijft
// Enter van dat veld of die knop.
export function Knop({ variant = 'secundair', maat = 'md', icoon, icoonRechts, alleenIcoon, breed, className, children, enter, ...rest }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!enter) return
    // De Enter die "Controleer" deed, mag niet meteen ook "Verder" doen: die
    // toets was er al vóór deze knop verscheen.
    const sinds = performance.now()
    const opEnter = (e) => {
      if (e.timeStamp < sinds) return
      if (e.key !== 'Enter' || e.repeat || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const doel = e.target
      if (doel !== ref.current && doel?.closest?.('input, textarea, select, button, a, [contenteditable="true"]')) return
      e.preventDefault()
      ref.current?.click()
    }
    window.addEventListener('keydown', opEnter)
    return () => window.removeEventListener('keydown', opEnter)
  }, [enter])
  return (
    <button type="button" ref={ref} {...rest}
      className={cx('kk-knop', `kk-knop--${variant}`, maat !== 'md' && `kk-knop--${maat}`,
        alleenIcoon && 'kk-knop--icoon', breed && 'kk-knop--breed', className)}>
      {icoon && <Icoon naam={icoon} />}
      {children}
      {icoonRechts && <Icoon naam={icoonRechts} />}
    </button>
  )
}

// Terugknop: standaard vast linksboven in beeld. Tekst "Terug" (één niveau
// omhoog) of "Stoppen" (midden in een oefening/spel). vast={false} zet hem in
// de flow, bv. bovenin een kaart (login, portaal).
export function TerugKnop({ onClick, children = 'Terug', vast = true, className, ...rest }) {
  return (
    <Knop variant="secundair" maat="sm" icoon="terug" onClick={onClick} {...rest}
      className={cx('kk-terug', vast && 'kk-terug--vast', className)}>{children}</Knop>
  )
}

// ── Kaart ─────────────────────────────────────────────────────────────
// Met onClick wordt het een knop-kaart. accent = CSS-kleur of var(--kk-vak-…)
export function Kaart({ titel, tekst, icoon, accent, chips, onClick, disabled, children, className }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={cx('kk-kaart', accent && 'kk-kaart--accent', className)}
      style={accent ? { '--kk-accent': accent } : undefined}
      onClick={onClick} disabled={onClick ? disabled : undefined} type={onClick ? 'button' : undefined}>
      {icoon && <span className="kk-kaart-icoon">{typeof icoon === 'string' ? <Icoon naam={icoon} /> : icoon}</span>}
      {titel && <h3 className="kk-kaart-titel">{titel}</h3>}
      {tekst && <p className="kk-kaart-tekst">{tekst}</p>}
      {chips?.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{chips.map(c => <span key={c} className="kk-chip">{c}</span>)}</div>}
      {children}
    </Tag>
  )
}

// ── Schermkop: terug links, titel midden, saldo/acties rechts ─────────
export function SchermKop({ titel, sub, onTerug, terugTekst, rechts }) {
  return (
    <header className="kk-schermkop">
      <div className="kk-schermkop-links">{onTerug && <TerugKnop onClick={onTerug}>{terugTekst}</TerugKnop>}</div>
      <div className="kk-schermkop-midden">
        <h1 className="kk-schermkop-titel">{titel}</h1>
        {sub && <p className="kk-schermkop-sub">{sub}</p>}
      </div>
      <div className="kk-schermkop-rechts">{rechts}</div>
    </header>
  )
}

export function Saldo({ bedrag }) {
  return <span className="kk-saldo"><Icoon naam="munt" />{bedrag}</span>
}

// ── Voortgangsbalk ────────────────────────────────────────────────────
export function VoortgangsBalk({ waarde, max, accent, label }) {
  const pct = max ? Math.min(100, Math.round((waarde / max) * 100)) : 0
  return (
    <div className="kk-voortgang" style={accent ? { '--kk-accent': accent } : undefined}
      role="progressbar" aria-valuenow={waarde} aria-valuemin={0} aria-valuemax={max}>
      <div className="kk-voortgang-baan"><div className="kk-voortgang-vulling" style={{ width: `${pct}%` }} /></div>
      <span>{label ?? `${waarde}/${max}`}</span>
    </div>
  )
}

// ── Feedback: goed | fout | info ──────────────────────────────────────
export function Feedback({ soort = 'info', children }) {
  return (
    <div className={`kk-feedback kk-feedback--${soort}`} role="status">
      <Icoon naam={soort === 'goed' ? 'goed' : soort === 'fout' ? 'fout' : 'info'} />
      <span>{children}</span>
    </div>
  )
}

// ── Paneel (modal) ────────────────────────────────────────────────────
export function Paneel({ titel, children, knoppen, onSluiten }) {
  return (
    <div className="kk-scrim" onClick={e => e.target === e.currentTarget && onSluiten?.()}>
      <div className="kk-paneel" role="dialog" aria-modal="true" aria-label={titel}>
        {titel && <h2 className="kk-paneel-titel">{titel}</h2>}
        <div className="kk-paneel-tekst">{children}</div>
        {knoppen && <div className="kk-knoppenrij">{knoppen}</div>}
      </div>
    </div>
  )
}

// ── Eindscherm: één vorm voor elke oefening en elk spel ───────────────
// Vaste knoppen: primair "Verder" (of onMenu), secundair "Opnieuw".
export function EindScherm({ titel = 'Klaar!', score, tekst, onVerder, verderTekst = 'Verder', onOpnieuw, children }) {
  return (
    <section className="kk-eind">
      <span className="kk-eind-icoon"><Icoon naam="trofee" /></span>
      <h2 className="kk-eind-titel">{titel}</h2>
      {score != null && <p className="kk-eind-score">{score}</p>}
      {tekst && <p className="kk-eind-tekst">{tekst}</p>}
      {children}
      <div className="kk-knoppenrij">
        {onOpnieuw && <Knop variant="secundair" icoon="opnieuw" onClick={onOpnieuw}>Opnieuw</Knop>}
        {onVerder && <Knop enter variant="primair" icoonRechts="verder" onClick={onVerder}>{verderTekst}</Knop>}
      </div>
    </section>
  )
}
