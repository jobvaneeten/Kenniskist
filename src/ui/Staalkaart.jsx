// Staalkaart van de huisstijl: alle tokens en componenten op één pagina.
// Alleen via /huisstijl.html op de dev-server.
import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { Knop, TerugKnop, Kaart, SchermKop, Saldo, VoortgangsBalk, Feedback, Paneel, EindScherm } from './index.jsx'

const KLEUREN = [
  ['bg', '--kk-bg'], ['surface-solid', '--kk-surface-solid'], ['primary', '--kk-primary'], ['primary-hi', '--kk-primary-hi'],
  ['gold', '--kk-gold'], ['cyan', '--kk-cyan'], ['pink', '--kk-pink'], ['success', '--kk-success'], ['error', '--kk-error'], ['danger', '--kk-danger'],
]
const VAKKEN = [['Rekenen', '--kk-vak-rekenen'], ['Taal', '--kk-vak-taal'], ['Spelling', '--kk-vak-spelling'], ['Begrijpend lezen', '--kk-vak-lezen'], ['Topografie', '--kk-vak-topo'], ['Vrij spelen', '--kk-vak-spel']]

const sectie = { boxSizing: 'border-box', width: 'min(1100px, 100%)', margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 16 }
const kop = { font: '800 0.75rem/1 var(--kk-body)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--kk-text-faint)', margin: 0 }
const rij = { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }

function Staalkaart() {
  const [modal, setModal] = useState(false)
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(900px 500px at 15% -10%, rgba(124,58,237,.22), transparent 65%), radial-gradient(800px 500px at 95% 10%, rgba(255,47,142,.12), transparent 60%), var(--kk-bg)', color: 'var(--kk-text)', fontFamily: 'var(--kk-body)' }}>
      <SchermKop titel="Huisstijl" sub="Staalkaart: tokens en componenten" onTerug={() => {}} rechts={<Saldo bedrag={120} />} />

      <section style={sectie}>
        <h2 style={kop}>Kleuren</h2>
        <div style={rij}>
          {KLEUREN.map(([n, v]) => (
            <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 92 }}>
              <div style={{ height: 56, borderRadius: 'var(--kk-r-md)', background: `var(${v})`, border: '1px solid var(--kk-border)' }} />
              <span style={{ fontSize: 12, color: 'var(--kk-text-soft)' }}>{n}</span>
            </div>
          ))}
        </div>
        <div style={rij}>{VAKKEN.map(([n, v]) => <span key={n} className="kk-chip" style={{ '--kk-accent': `var(${v})` }}>{n}</span>)}</div>
      </section>

      <section style={sectie}>
        <h2 style={kop}>Typografie</h2>
        <div style={{ font: '800 var(--kk-fs-2xl)/1.1 var(--kk-head)' }}>Schermtitel — Baloo 2</div>
        <div style={{ font: '800 var(--kk-fs-xl)/1.2 var(--kk-head)' }}>Sectiekop</div>
        <div style={{ font: '800 var(--kk-fs-lg)/1.2 var(--kk-head)' }}>Kaarttitel</div>
        <div style={{ font: '600 var(--kk-fs-md)/1.5 var(--kk-body)' }}>Basistekst in Nunito. Hoeveel is 23 × 4? Lees de vraag goed.</div>
        <div style={{ font: '600 var(--kk-fs-sm)/1.4 var(--kk-body)', color: 'var(--kk-text-soft)' }}>Bijtekst, uitleg onder een kaart.</div>
      </section>

      <section style={sectie}>
        <h2 style={kop}>Knoppen</h2>
        <div style={rij}>
          <Knop variant="primair" icoonRechts="verder">Verder</Knop>
          <Knop variant="secundair" icoon="opnieuw">Opnieuw</Knop>
          <Knop variant="beloning" icoon="spelen">Speel een spel</Knop>
          <Knop variant="gevaar">Verwijderen</Knop>
          <Knop variant="subtiel">Overslaan</Knop>
          <Knop variant="primair" disabled>Uitgeschakeld</Knop>
        </div>
        <div style={rij}>
          <Knop variant="primair" maat="sm">Klein</Knop>
          <Knop variant="primair">Normaal</Knop>
          <Knop variant="primair" maat="lg" icoon="spelen">Start!</Knop>
          <Knop variant="secundair" alleenIcoon icoon="pauze" aria-label="Pauze" />
          <Knop variant="secundair" alleenIcoon maat="sm" icoon="sluiten" aria-label="Sluiten" />
          <TerugKnop onClick={() => {}} />
        </div>
      </section>

      <section style={sectie}>
        <h2 style={kop}>Kaarten</h2>
        <div style={grid}>
          <Kaart onClick={() => {}} accent="var(--kk-vak-rekenen)" icoon="ster" titel="Maten omrekenen" tekst="Lengte en inhoud · 3 levels" chips={['briefgeld']} />
          <Kaart onClick={() => {}} accent="var(--kk-vak-taal)" icoon="info" titel="Taalverkennen" tekst="Zinsdelen, woordsoorten, interpunctie" />
          <Kaart onClick={() => {}} accent="var(--kk-vak-spelling)" icoon="goed" titel="Werkwoordspelling" tekst="Tegenwoordige tijd, verleden tijd" />
          <Kaart onClick={() => {}} disabled accent="var(--kk-vak-topo)" icoon="menu" titel="Topografie" tekst="Komt binnenkort" />
        </div>
      </section>

      <section style={sectie}>
        <h2 style={kop}>Voortgang en feedback</h2>
        <VoortgangsBalk waarde={6} max={10} />
        <VoortgangsBalk waarde={3} max={5} accent="var(--kk-vak-lezen)" label="nog 2 tot een spelletje" />
        <Feedback soort="goed">Goed zo! 23 × 4 = 92</Feedback>
        <Feedback soort="fout">Bijna. Het goede antwoord is 92.</Feedback>
        <Feedback soort="info">Tip: reken eerst 20 × 4.</Feedback>
      </section>

      <section style={sectie}>
        <h2 style={kop}>Eindscherm en paneel</h2>
        <div style={{ ...rij, alignItems: 'flex-start' }}>
          <EindScherm score="8 / 10" tekst="Goed gedaan! Je verdient 40 briefgeld." onOpnieuw={() => {}} onVerder={() => {}} />
          <Knop variant="secundair" onClick={() => setModal(true)}>Open paneel</Knop>
        </div>
      </section>

      {modal && (
        <Paneel titel="Stoppen met oefenen?" onSluiten={() => setModal(false)}
          knoppen={<><Knop variant="secundair" onClick={() => setModal(false)}>Doorgaan</Knop><Knop variant="gevaar" onClick={() => setModal(false)}>Stoppen</Knop></>}>
          Je voortgang van deze ronde gaat verloren.
        </Paneel>
      )}
      <div style={{ height: 48 }} />
    </div>
  )
}

createRoot(document.getElementById('root')).render(<Staalkaart />)
