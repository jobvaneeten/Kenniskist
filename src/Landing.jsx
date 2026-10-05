import { useState } from 'react'
import './landing.css'
import { Knop, Icoon } from './ui/index.jsx'

// Moet kloppen met FREE_GAMES in GameMenu.jsx plus de drie 3D-spellen die je
// vanuit de Kledingkast start (Voetbal, Paintball, Ballonnengevecht).
const GAMES = [
  'Voetbal', 'Supervoetbal', 'Jetpack', 'Astro Katapult', 'Spacerunner',
  'Doodle Sprong', 'Meteoorvlucht', 'Dier Evolutie', 'Brug Bouwen', 'Tower Defense',
  'Bergrijden', 'Paintball', 'Ballonnengevecht', 'Fruitsabel', 'Sterrenveer', 'Diepgravers',
  'Neongolf', 'Blokkenblitz',
]

// Moet kloppen met VAKKEN in src/lib/tools.js en MODES in GameMenu.jsx.
const SUBJECTS = [
  { icoon: 'rekenen', label: 'Rekenen',          kleur: 'var(--kk-vak-rekenen)' },
  { icoon: 'potlood', label: 'Taal & Spelling',  kleur: 'var(--kk-vak-spelling)' },
  { icoon: 'lezen',   label: 'Begrijpend lezen', kleur: 'var(--kk-vak-lezen)' },
  { icoon: 'kaart',   label: 'Topografie',       kleur: 'var(--kk-vak-topo)' },
]

const STATS = [
  { value: String(GAMES.length), label: 'minigames' },
  { value: '300+',  label: 'items te winnen' },
  { value: '4',     label: 'vakgebieden' },
  { value: '4–8',   label: 'voor groep' },
]

const STEPS = [
  { icoon: 'potlood', title: '1. Opgaves maken', desc: 'Je kiest een oefening — rekenen, taal, spelling of begrijpend lezen — en maakt een rondje opgaves.' },
  { icoon: 'spel', title: '2. Tussendoor spelen', desc: 'Na een paar goede antwoorden krijg je een kort, leuk spelletje als afwisseling — een minigame zoals Voetbal of Jetpack.' },
  { icoon: 'munt', title: '3. Belonen verdienen', desc: 'Je verdient munten en briefgeld voor wat je goed hebt gedaan, die je meteen kunt uitgeven in de Kledingkast en de Winkel.' },
]

const SHOWCASE = [
  {
    key: 'game',
    img: '/scenes/game.png',
    icoon: 'spel',
    title: 'Speel Game',
    desc: 'Oefenspellen voor rekenen, taal en spelling.',
    detail: 'Je start met een setje opgaves — bijvoorbeeld sommen, een dictee of een tafelrij. Na elk paar goed gemaakte opgaves krijg je tussendoor een kort spelletje (zoals Voetbal, Jetpack of Brug Bouwen) als afwisseling en beloning, voordat je verdergaat met oefenen. Elk goed antwoord levert munten en briefgeld op.',
  },
  {
    key: 'kledingkast',
    img: '/scenes/kledingkast.png',
    icoon: 'shirt',
    title: 'Kledingkast',
    desc: 'Je eigen 3D-poppetje aankleden.',
    detail: 'In de Kledingkast trek je je 3D-poppetje aan met alle shirts, broeken, sokken, schoenen en petten die je hebt verdiend of gewonnen. Je kunt per categorie kiezen, het poppetje laten bewegen en dansen, en met "Verras me!" een willekeurige outfit uitproberen.',
  },
  {
    key: 'winkel',
    img: '/scenes/winkel.png',
    icoon: 'tas',
    title: 'Winkel',
    desc: 'Lootboxen openen met verdiend geld.',
    detail: 'In de Winkel open je met je verdiende briefgeld lootboxen voor Shirt, Broek, Sokken, Schoenen en Pet. Elke box geeft een willekeurig nieuw item — van gewoon tot ultra legendarisch — dat je meteen kunt gebruiken in de Kledingkast.',
  },
]

const AUDIENCE = [
  { icoon: 'ster', title: 'Thuis', desc: 'Zelfstandig extra oefenen op een leuke manier — zonder account, gewoon openen en beginnen.' },
  { icoon: 'klembord', title: 'In de klas', desc: 'Als los oefenmoment, keuzewerk of beloning na afgerond werk, op chromebook of tablet.' },
  { icoon: 'boek', title: 'Groep 4 t/m 8', desc: 'Oefeningen sluiten aan bij de basisschoolstof, van tafels en spelling tot begrijpend lezen.' },
]

const VOOR_LEERKRACHTEN = [
  {
    title: 'Welke vaardigheden komen aan bod?',
    body: 'Rekenen (sommen, tafels), taal & spelling (dictees, werkwoordspelling, woordenschat, zinsontleding) en begrijpend lezen, via verschillende minigames en thema\'s. Nieuwe oefeningen en spellen worden regelmatig toegevoegd.',
  },
  {
    title: 'Hoe motiveert het spelen?',
    body: 'Elke oefensessie geeft een directe, tastbare beloning: munten voor de winkel, briefgeld voor lootboxen. Kinderen bouwen zo een eigen verzameling kleding en accessoires op voor hun personage — een lichte, speelse motivatieprikkel naast het oefenen zelf.',
  },
  {
    title: 'Privacy & inzage',
    body: 'Van leerlingen slaan we alleen voornaam + eerste letter achternaam, gebruikersnaam en klas op — geen e-mail, geen geboortedatum. Leerlingen loggen in met een account dat de leerkracht voor hen aanmaakt, nooit zelf. Resultaten van de leertools zijn zichtbaar in het leerkrachtenportaal; wat een kind aan het personage of in de winkel doet, blijft privé.',
  },
  {
    title: 'Inzetten in de klas',
    body: 'Geschikt als losse oefenmomenten, keuzewerk, of beloning na afgerond werk. Werkt op een gedeeld klasapparaat of chromebook per leerling.',
  },
]

export default function Landing({ onChoose, ingelogd, onUitloggen }) {
  const [openCard, setOpenCard] = useState(null)

  return (
    <div className="landing-screen">
      {ingelogd && <Knop variant="secundair" maat="sm" icoon="uit" className="hoek-rechtsboven" onClick={onUitloggen}>Uitloggen</Knop>}

      {/* ── Hero met Nano Banana-artwork ── */}
      <header className="landing-hero-banner">
        <img className="hero-art" src="/branding/hero.webp" alt="" aria-hidden="true" />
        <div className="hero-art-fade" aria-hidden="true" />
        <div className="landing-hero">
          <div className="landing-logo-ring">
            <img className="landing-logo" src="/logo-rond.png" alt="Kenniskist" />
          </div>
          <h1 className="landing-title">Kenniskist</h1>
          <p className="landing-tagline">Leren terwijl je speelt</p>
          <p className="landing-intro">
            Kenniskist is een leerplatform voor groep 4 t/m 8 waarin kinderen rekenen, taal en spelling
            oefenen via korte, speelse minigames. Voor elk goed antwoord verdien je munten en briefgeld,
            waarmee je een eigen 3D-poppetje aankleedt en lootboxen opent in de winkel.
          </p>
        </div>
      </header>

      <section className="portal-choice portal-choice-top">
        <h2 className="landing-section-title">Kies je portaal</h2>
        <div className="portal-cards">
          <button className="portal-card portal-student" onClick={() => onChoose('student')}>
            <span className="landing-icoon"><Icoon naam="spel" /></span>
            <span className="portal-name">Leerlingen portaal</span>
            <span className="portal-desc">Ga direct spelen, oefenen en je poppetje aankleden.</span>
            <span className="portal-arrow">Start <Icoon naam="verder" /></span>
          </button>
          <button className="portal-card portal-teacher" onClick={() => onChoose('teacher')}>
            <span className="landing-icoon"><Icoon naam="klembord" /></span>
            <span className="portal-name">Leerkrachten portaal</span>
            <span className="portal-desc">Lees hoe Kenniskist werkt, welke vakken het dekt en hoe je het inzet in de klas.</span>
            <span className="portal-arrow">Bekijk <Icoon naam="verder" /></span>
          </button>
        </div>
      </section>

      <section className="landing-stats" aria-label="Kenniskist in cijfers">
        {STATS.map(s => (
          <div key={s.label} className="stat-card">
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      <section className="landing-subjects" aria-label="Vakken">
        {SUBJECTS.map(s => (
          <span key={s.label} className="kk-chip" style={{ '--kk-accent': s.kleur }}><Icoon naam={s.icoon} />{s.label}</span>
        ))}
      </section>

      <section className="landing-steps" aria-label="Hoe werkt het">
        <h2 className="landing-section-title">Hoe werkt het?</h2>
        <div className="steps-row">
          {STEPS.map(s => (
            <div key={s.title} className="step-card">
              <span className="landing-icoon"><Icoon naam={s.icoon} /></span>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-showcase-wrap">
        <h2 className="landing-section-title">Klik voor meer uitleg</h2>
        <div className="landing-showcase">
          {SHOWCASE.map(s => {
            const open = openCard === s.key
            return (
              <button
                key={s.key}
                className={`showcase-card ${open ? 'showcase-card-open' : ''}`}
                onClick={() => setOpenCard(open ? null : s.key)}
                aria-expanded={open}
              >
                <img src={s.img} alt={s.title} className="showcase-img" loading="lazy" />
                <h3 className="showcase-title"><Icoon naam={s.icoon} />{s.title}</h3>
                <p className="showcase-desc">{s.desc}</p>
                <span className="showcase-toggle">{open ? 'Minder' : 'Meer uitleg'}</span>
                {open && <p className="showcase-detail">{s.detail}</p>}
              </button>
            )
          })}
        </div>
      </section>

      <section className="landing-audience" aria-label="Voor wie is Kenniskist">
        <h2 className="landing-section-title">Voor wie is Kenniskist?</h2>
        <div className="audience-row">
          {AUDIENCE.map(a => (
            <div key={a.title} className="audience-card">
              <span className="landing-icoon"><Icoon naam={a.icoon} /></span>
              <h3 className="audience-title">{a.title}</h3>
              <p className="audience-desc">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-showcase-wrap" aria-label="Voor leerkrachten">
        <h2 className="landing-section-title">Voor leerkrachten</h2>
        <div className="landing-showcase landing-faq">
          {VOOR_LEERKRACHTEN.map(s => (
            <div key={s.title} className="showcase-card">
              <h3 className="showcase-title">{s.title}</h3>
              <p className="showcase-desc">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-games" aria-label="Beschikbare spellen">
        <h2 className="landing-section-title">Wat zit er allemaal in?</h2>
        <div className="landing-games-grid">
          {GAMES.map(g => (
            <span key={g} className="kk-chip">{g}</span>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <h2 className="landing-cta-title">Klaar om te beginnen?</h2>
        <Knop variant="primair" maat="lg" icoonRechts="verder" onClick={() => onChoose('student')}>
          Open het leerlingen portaal
        </Knop>
      </section>

      {/* Twemoji staat onder CC-BY 4.0: commercieel gebruik mag, maar
          naamsvermelding is verplicht. Kenney-spelart en de Poly Haven-
          texturen zijn CC0 en hoeven het niet, maar staan er netjes bij. */}
      <footer className="landing-footer">
        Kenniskist · gemaakt om leren leuk te maken
        <span className="landing-credits">
          Emoji-graphics: <a href="https://github.com/twitter/twemoji" target="_blank" rel="noreferrer">Twemoji</a> (CC-BY 4.0) ·
          spelart: <a href="https://kenney.nl" target="_blank" rel="noreferrer">Kenney</a> ·
          texturen: <a href="https://polyhaven.com" target="_blank" rel="noreferrer">Poly Haven</a> (CC0)
        </span>
      </footer>
    </div>
  )
}
