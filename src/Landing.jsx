import { useEffect, useState } from 'react'
import './landing.css'
import { Knop, Icoon } from './ui/index.jsx'
import { TOOL_FAMILIES } from './lib/tools.js'
import { VRIJE_SPELLEN, KLEDINGKAST_SPELLEN, spelMiniatuur } from './lib/spellen.js'
import { VOORPAGINA_TABS, tabVoorPad } from './lib/voorpaginaTabs.js'

const CONTACT = 'info@kenniskist.nl'

// Vakken en oefeningen komen uit src/lib/tools.js (dezelfde lijst als de
// leerkracht in het portaal ziet), dus een nieuwe oefening staat hier vanzelf.
const VAKKEN = [
  { titel: 'Rekenen', icoon: 'rekenen', kleur: 'var(--kk-vak-rekenen)', vakken: ['rekenen'],
    zin: 'Van tafels en kale sommen tot verhaaltjessommen, breuken en klokkijken.' },
  { titel: 'Taal en spelling', icoon: 'potlood', kleur: 'var(--kk-vak-spelling)', vakken: ['taal', 'spelling'],
    zin: 'Dictees, werkwoordspelling, woordenschat en zinnen ontleden.' },
  { titel: 'Lezen', icoon: 'boek', kleur: 'var(--kk-vak-lezen)', vakken: ['begrijpend', 'lezen'],
    zin: 'Begrijpend lezen in thema’s, met voorlezen voor wie dat nodig heeft.' },
  { titel: 'Topografie', icoon: 'kaart', kleur: 'var(--kk-vak-topo)', vakken: ['topo'],
    zin: 'Landen, hoofdsteden en steden van Europa aanwijzen of naar de goede plek slepen.' },
].map(v => ({ ...v, oefeningen: TOOL_FAMILIES.filter(f => v.vakken.includes(f.vak)).map(f => f.label) }))

const AANTAL_SPELLEN = VRIJE_SPELLEN.length + KLEDINGKAST_SPELLEN.length

const STATS = [
  { value: String(TOOL_FAMILIES.filter(f => !f.verborgen).length), label: 'soorten oefeningen' },
  { value: String(AANTAL_SPELLEN), label: 'minigames' },
  { value: '300+', label: 'items te winnen' },
  { value: '4 t/m 8', label: 'groep' },
]

const STAPPEN = [
  { icoon: 'potlood', title: 'Oefenen', desc: 'Kies een oefening en maak een rondje opgaves, passend bij jouw groep.' },
  { icoon: 'spel', title: 'Spelletje', desc: 'Na een paar goede antwoorden volgt een kort spelletje als beloning. Daarna ga je weer verder.' },
  { icoon: 'munt', title: 'Verdienen', desc: 'Met je munten en briefgeld open je lootboxen en kleed je je eigen 3D-poppetje aan.' },
]

const SHOWCASE = [
  {
    key: 'game', img: '/scenes/games/klein/game.webp', icoon: 'spel', title: 'Speel Game',
    desc: 'Oefenen met spelletjes als beloning.',
    detail: 'Je begint met een setje opgaves, bijvoorbeeld sommen, een dictee of een tafelrij. Na een paar goede antwoorden krijg je een kort spelletje als afwisseling en beloning. Daarna ga je verder met oefenen. Elk goed antwoord levert munten en briefgeld op.',
  },
  {
    key: 'kledingkast', img: '/scenes/games/klein/kledingkast.webp', icoon: 'shirt', title: 'Kledingkast',
    desc: 'Je eigen 3D-poppetje aankleden.',
    detail: 'In de Kledingkast trek je je 3D-poppetje aan met alle shirts, broeken, sokken, schoenen en petten die je hebt verdiend of gewonnen. Je laat het poppetje dansen, probeert met "Verras me!" een willekeurige outfit en speelt er 3D-spellen mee.',
  },
  {
    key: 'winkel', img: '/scenes/games/klein/winkel.webp', icoon: 'tas', title: 'Winkel',
    desc: 'Lootboxen openen met verdiend geld.',
    detail: 'In de Winkel open je met je verdiende briefgeld lootboxen voor shirts, broeken, sokken, schoenen en petten. Elke box geeft een willekeurig nieuw item, van gewoon tot ultra legendarisch. Je kunt het meteen dragen.',
  },
]

const LEERKRACHT = [
  { icoon: 'klembord', title: 'Weektaak voor de klas', desc: 'Zet oefeningen klaar voor de hele klas. Leerlingen zien ze meteen als ze inloggen.' },
  { icoon: 'doel', title: 'Taken en doelen per kind', desc: 'Geef een leerling extra oefening op precies het doel waar hij nog aan werkt.' },
  { icoon: 'grafiek', title: 'Weekoverzicht', desc: 'Zie per leerling en per week wat er geoefend is en hoe het ging.' },
  { icoon: 'info', title: 'Fouten inzien', desc: 'Bekijk welke opgaven fout gingen en welk antwoord het kind gaf.' },
  { icoon: 'printer', title: 'Werkbladen printen', desc: 'Print een werkblad met antwoordblad, op dezelfde doelen als de oefeningen.' },
  { icoon: 'spel', title: 'Spelletjes per klas', desc: 'Bepaal na hoeveel goede antwoorden er een spelletje komt, of zet ze uit.' },
]

const VRAGEN = [
  {
    vraag: 'Hoe krijgen leerlingen een account?',
    antwoord: 'De leerkracht maakt de accounts aan in het leerkrachtenportaal. Leerlingen loggen in met de klascode, hun gebruikersnaam en een wachtwoord. Ze maken nooit zelf een account aan.',
  },
  {
    vraag: 'Kan mijn kind ook zonder account oefenen?',
    antwoord: 'Ja. Kies in het leerlingenportaal "Oefenen zonder account" en je kunt meteen beginnen. Munten, kleding en voortgang worden dan alleen niet bewaard.',
  },
  {
    vraag: 'Wat gebeurt er met de gegevens van leerlingen?',
    antwoord: 'Van leerlingen bewaren we alleen de voornaam met de eerste letter van de achternaam, de gebruikersnaam en de klas. Geen e-mailadres en geen geboortedatum. Resultaten van de oefeningen zijn zichtbaar voor de eigen leerkracht. Wat een kind met zijn poppetje of in de winkel doet, blijft privé.',
  },
  {
    vraag: 'Op welke apparaten werkt het?',
    antwoord: 'Op chromebooks, laptops, computers en tablets, gewoon in de browser. Er hoeft niets geïnstalleerd te worden. De spellen speel je het fijnst met het scherm liggend.',
  },
  {
    vraag: 'Blijft de voortgang bewaard als je op een andere computer inlogt?',
    antwoord: 'Ja. Met een account worden munten, kleding en voortgang online opgeslagen, dus je gaat op elk apparaat verder waar je was. Op een gedeelde chromebook wordt alles gewist zodra je uitlogt.',
  },
]

function Kop({ kicker, titel, sub }) {
  return (
    <header className="lp-paginakop">
      <span className="lp-kicker">{kicker}</span>
      <h1 className="lp-paginatitel">{titel}</h1>
      {sub && <p className="lp-sectie-sub">{sub}</p>}
    </header>
  )
}

// Kleine neon-illustratie van het leerkrachtenportaal: grafiek, takenlijst
function DashboardPlaat() {
  return (
    <svg viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="dbBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#13204a" /><stop offset="1" stopColor="#090b22" /></linearGradient>
        <filter id="dbGloed" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect width="320" height="150" fill="url(#dbBg)" />
      <g fill="none" stroke="rgba(120,160,255,.08)">{[30, 60, 90, 120].map(y => <path key={y} d={`M0 ${y}H320`} />)}</g>
      <rect x="18" y="16" width="150" height="120" rx="12" fill="rgba(56,189,248,.07)" stroke="rgba(56,189,248,.5)" />
      <g filter="url(#dbGloed)">
        {[[34, 62], [58, 44], [82, 78], [106, 36], [130, 56]].map(([x, h]) => <rect key={x} x={x} y={126 - h} width="16" height={h} rx="4" fill="#38bdf8" opacity={0.55 + h / 200} />)}
      </g>
      <path d="M34 58 L66 44 L90 66 L114 30 L146 46" fill="none" stroke="#ffd23f" strokeWidth="3" strokeLinecap="round" filter="url(#dbGloed)" />
      <rect x="182" y="16" width="120" height="120" rx="12" fill="rgba(167,139,250,.08)" stroke="rgba(167,139,250,.5)" />
      {[36, 62, 88, 114].map((y, i) => (
        <g key={y}>
          <circle cx="200" cy={y} r="8" fill={i < 3 ? '#22c55e' : 'none'} stroke={i < 3 ? '#22c55e' : 'rgba(255,255,255,.4)'} filter="url(#dbGloed)" />
          {i < 3 && <path d={`M196 ${y}l3 3 5-6`} stroke="#0b0a1a" strokeWidth="2.2" fill="none" strokeLinecap="round" />}
          <rect x="216" y={y - 4} width={[62, 48, 70, 54][i]} height="8" rx="4" fill="rgba(255,255,255,.28)" />
        </g>
      ))}
    </svg>
  )
}

function Home({ onChoose }) {
  return (
    <>
      <header className="landing-hero-banner">
        <img className="hero-art" src="/branding/hero.webp" alt="" aria-hidden="true" />
        <div className="hero-art-fade" aria-hidden="true" />
        <div className="landing-hero">
          <div className="landing-logo-ring">
            <img className="landing-logo" src="/logo-rond.png" alt="Kenniskist" />
          </div>
          <span className="lp-badge"><Icoon naam="school" />Voor groep 4 t/m 8</span>
          <h1 className="landing-title">Kenniskist</h1>
          <p className="landing-tagline">Leren terwijl je speelt</p>
          <p className="landing-intro">
            Oefen rekenen, taal, spelling, lezen en topografie en speel tussendoor een van de {AANTAL_SPELLEN} minigames.
            Met de munten die je verdient, kleed je je eigen 3D-poppetje aan.
          </p>
        </div>
      </header>

      <section className="portal-choice portal-choice-top" aria-label="Kies je portaal">
        <div className="portal-cards">
          <button className="portal-card portal-student" onClick={() => onChoose('student')}>
            <span className="portal-plaat"><img src="/scenes/games/klein/game.webp" alt="" /></span>
            <span className="landing-icoon"><Icoon naam="spel" /></span>
            <span className="portal-name">Leerlingenportaal</span>
            <span className="portal-desc">Log in met je klascode of oefen meteen zonder account.</span>
            <span className="portal-arrow">Start met oefenen <Icoon naam="verder" /></span>
          </button>
          <button className="portal-card portal-teacher" onClick={() => onChoose('teacher')}>
            <span className="portal-plaat"><DashboardPlaat /></span>
            <span className="landing-icoon"><Icoon naam="klembord" /></span>
            <span className="portal-name">Leerkrachtenportaal</span>
            <span className="portal-desc">Zet weektaken klaar en volg wat je klas oefent.</span>
            <span className="portal-arrow">Inloggen als leerkracht <Icoon naam="verder" /></span>
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
    </>
  )
}

function Vakken() {
  return (
    <>
      <Kop kicker="Wat oefen je?" titel={`Vier vakken, ${TOOL_FAMILIES.filter(f => !f.verborgen).length} soorten oefeningen`}
        sub="Alle oefeningen sluiten aan bij de stof van groep 4 t/m 8. Nieuwe oefeningen komen er regelmatig bij." />
      <div className="lp-vakken">
        {VAKKEN.map(v => (
          <article key={v.titel} className="lp-vak" style={{ '--kk-accent': v.kleur }}>
            <div className="lp-vak-kop">
              <span className="landing-icoon"><Icoon naam={v.icoon} /></span>
              <h2>{v.titel}</h2>
            </div>
            <p>{v.zin}</p>
            <ul className="lp-oefeningen">
              {v.oefeningen.map(o => <li key={o}>{o}</li>)}
            </ul>
          </article>
        ))}
      </div>

      <section className="lp-sectie" aria-label="Zo werkt het">
        <span className="lp-kicker">Zo werkt het</span>
        <h2 className="landing-section-title">Oefenen, spelen, verdienen</h2>
        <ol className="lp-stappen">
          {STAPPEN.map((s, i) => (
            <li key={s.title} className="lp-stap">
              <span className="lp-stap-nr">{i + 1}</span>
              <span className="landing-icoon"><Icoon naam={s.icoon} /></span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

function Spellen() {
  const [openCard, setOpenCard] = useState(null)
  return (
    <>
      <Kop kicker={`${AANTAL_SPELLEN} minigames`} titel="Spelletjes als beloning"
        sub="Na een paar goede antwoorden kies je er zelf een. Je kunt ze ook vrij spelen in het spelmenu." />
      <div className="lp-spellen">
        {VRIJE_SPELLEN.map(g => (
          <figure key={g.key} className="lp-spel">
            <img src={spelMiniatuur(g)} alt="" loading="lazy" decoding="async" width="480" height="300" />
            <figcaption>
              <strong>{g.name}</strong>
              <span>{g.desc}</span>
            </figcaption>
          </figure>
        ))}
        <figure className="lp-spel lp-spel-3d">
          <img src="/scenes/games/klein/kledingkast.webp" alt="" loading="lazy" decoding="async" width="480" height="300" />
          <figcaption>
            <strong>Plus 3 spellen in 3D</strong>
            <span>{KLEDINGKAST_SPELLEN.map(s => s.name).join(', ')}. Je speelt ze met je eigen poppetje uit de Kledingkast.</span>
          </figcaption>
        </figure>
      </div>

      <section className="lp-sectie lp-sectie-breed" aria-label="Wat kun je doen">
        <span className="lp-kicker">In Kenniskist</span>
        <h2 className="landing-section-title">Spelen, aankleden, sparen</h2>
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
    </>
  )
}

function Leerkrachten({ onChoose }) {
  return (
    <div className="lp-leerkracht">
      <div className="lp-leerkracht-intro">
        <span className="lp-kicker">Voor leerkrachten</span>
        <h1 className="lp-paginatitel">Jij houdt het overzicht</h1>
        <p>
          In het leerkrachtenportaal maak je accounts voor je klas, zet je weektaken en persoonlijke doelen klaar
          en zie je per leerling wat er goed en fout ging. Kinderen oefenen gericht en jij ziet waar ze staan.
        </p>
        <Knop variant="primair" icoonRechts="verder" onClick={() => onChoose('teacher')}>Naar het leerkrachtenportaal</Knop>
      </div>
      <div className="lp-functies">
        {LEERKRACHT.map(f => (
          <div key={f.title} className="lp-functie">
            <span className="landing-icoon"><Icoon naam={f.icoon} /></span>
            <div>
              <h2>{f.title}</h2>
              <p>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Vragen() {
  return (
    <>
      <Kop kicker="Goed om te weten" titel="Veelgestelde vragen" />
      <div className="lp-vragen">
        {VRAGEN.map(v => (
          <details key={v.vraag} className="lp-vraag">
            <summary>{v.vraag}<Icoon naam="verder" /></summary>
            <p>{v.antwoord}</p>
          </details>
        ))}
      </div>
      <p className="lp-sectie-sub lp-vragen-meer">Staat je vraag er niet bij? Mail naar <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    </>
  )
}

function Contact() {
  const [gekopieerd, setGekopieerd] = useState(false)
  const kopieer = async () => {
    try { await navigator.clipboard.writeText(CONTACT); setGekopieerd(true); setTimeout(() => setGekopieerd(false), 2200) } catch { /* geen klembord: de mailknop werkt nog */ }
  }
  return (
    <>
      <Kop kicker="Contact" titel="Vragen of ideeën?" />
      <section className="lp-contact" aria-label="Contact">
        <span className="lp-contact-icoon"><Icoon naam="mail" /></span>
        <div className="lp-contact-tekst">
          <h2>Mail ons gerust</h2>
          <p>Wil je Kenniskist gebruiken op jouw school, heb je een vraag over privacy of een idee voor een nieuwe oefening of game? We horen het graag.</p>
        </div>
        <div className="lp-contact-knoppen">
          <a className="lp-mailknop" href={`mailto:${CONTACT}`}><Icoon naam="mail" />{CONTACT}</a>
          <button className="lp-kopieer" onClick={kopieer} aria-live="polite">
            <Icoon naam={gekopieerd ? 'goed' : 'kopie'} />{gekopieerd ? 'Gekopieerd!' : 'Kopieer adres'}
          </button>
        </div>
      </section>
    </>
  )
}

export default function Landing({ onChoose, ingelogd, onUitloggen }) {
  const [tab, setTab] = useState(() => tabVoorPad(window.location.pathname) ?? 'home')

  // terug/vooruit in de browser wisselt ook van tabblad
  useEffect(() => {
    const onPop = () => setTab(tabVoorPad(window.location.pathname) ?? 'home')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // eigen titel en canonical per tabblad, zodat Google ze als losse pagina's ziet
  useEffect(() => {
    const t = VOORPAGINA_TABS.find(x => x.key === tab)
    document.title = tab === 'home' ? 'Kenniskist | Leren terwijl je speelt' : `${t.label} | Kenniskist`
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://kenniskist.nl' + t.pad)
  }, [tab])

  const naar = (t) => {
    const pad = VOORPAGINA_TABS.find(x => x.key === t).pad
    if (window.location.pathname !== pad) window.history.pushState(null, '', pad)
    setTab(t)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="landing-screen">
      <nav className="lp-nav" aria-label="Menu">
        <button className="lp-nav-merk" onClick={() => naar('home')}>
          <img src="/logo-rond.png" alt="" />
          <span>Kenniskist</span>
        </button>
        <div className="lp-nav-tabs" role="tablist">
          {VOORPAGINA_TABS.map(t => (
            <a
              key={t.key}
              href={t.pad}
              role="tab"
              aria-selected={tab === t.key}
              className={tab === t.key ? 'lp-tab actief' : 'lp-tab'}
              onClick={(e) => { e.preventDefault(); naar(t.key) }}
            >
              {t.label}
            </a>
          ))}
        </div>
        {ingelogd
          ? <Knop variant="secundair" maat="sm" icoon="uit" onClick={onUitloggen}>Uitloggen</Knop>
          : <button className="lp-nav-cta" onClick={() => onChoose('student')}>Start met oefenen <Icoon naam="verder" /></button>}
      </nav>

      <main className={`lp-pagina lp-pagina-${tab}`}>
        {tab === 'home' && <Home onChoose={onChoose} />}
        {tab === 'vakken' && <Vakken />}
        {tab === 'spellen' && <Spellen />}
        {tab === 'leerkrachten' && <Leerkrachten onChoose={onChoose} />}
        {tab === 'vragen' && <Vragen />}
        {tab === 'contact' && <Contact />}
      </main>

      {/* Twemoji staat onder CC-BY 4.0: commercieel gebruik mag, maar
          naamsvermelding is verplicht. Kenney-spelart en de Poly Haven-
          texturen zijn CC0 en hoeven het niet, maar staan er netjes bij. */}
      <footer className="landing-footer">
        <div className="lp-footer-rij">
          <img src="/logo-rond.png" alt="" className="lp-footer-logo" />
          <span className="lp-footer-naam">Kenniskist</span>
          <nav className="lp-footer-links" aria-label="Snel naar">
            <button onClick={() => onChoose('student')}>Leerlingenportaal</button>
            <button onClick={() => onChoose('teacher')}>Leerkrachtenportaal</button>
            <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
          </nav>
        </div>
        <span className="landing-credits">
          © {new Date().getFullYear()} Kenniskist · gemaakt om leren leuk te maken ·
          Emoji-graphics: <a href="https://github.com/twitter/twemoji" target="_blank" rel="noreferrer">Twemoji</a> (CC-BY 4.0) ·
          spelart: <a href="https://kenney.nl" target="_blank" rel="noreferrer">Kenney</a> ·
          texturen: <a href="https://polyhaven.com" target="_blank" rel="noreferrer">Poly Haven</a> (CC0)
        </span>
      </footer>
    </div>
  )
}
