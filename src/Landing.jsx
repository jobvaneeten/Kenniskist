import { useState } from 'react'
import './landing.css'

const GAMES = [
  { emoji: '⚽', label: 'Voetbal' },
  { emoji: '🥅', label: 'Supervoetbal' },
  { emoji: '🚀', label: 'Jetpack' },
  { emoji: '🌉', label: 'Brug Bouwen' },
  { emoji: '🏰', label: 'Tower Defense' },
  { emoji: '🏎️', label: 'Racen' },
  { emoji: '🎯', label: 'Paintball' },
  { emoji: '💥', label: 'Botsen' },
]

const SUBJECTS = [
  { emoji: '🔢', label: 'Rekenen' },
  { emoji: '✏️', label: 'Taal & Spelling' },
  { emoji: '📚', label: 'Begrijpend lezen' },
  { emoji: '🌍', label: 'Wereldoriëntatie' },
]

const STEPS = [
  { emoji: '📝', title: '1. Opgaves maken', desc: 'Je kiest een oefening — rekenen, taal, spelling of begrijpend lezen — en maakt een rondje opgaves.' },
  { emoji: '🎮', title: '2. Tussendoor spelen', desc: 'Na een paar goede antwoorden krijg je een kort, leuk spelletje als afwisseling — een minigame zoals Voetbal of Jetpack.' },
  { emoji: '🪙', title: '3. Belonen verdienen', desc: 'Je verdient munten en briefgeld voor wat je goed hebt gedaan, die je meteen kunt uitgeven in de Kledingkast en de Winkel.' },
]

const SHOWCASE = [
  {
    key: 'game',
    img: '/scenes/game.png',
    title: '🎮 Speel Game',
    desc: 'Oefenspellen voor rekenen, taal en spelling.',
    detail: 'Je start met een setje opgaves — bijvoorbeeld sommen, een dictee of een tafelrij. Na elk paar goed gemaakte opgaves krijg je tussendoor een kort spelletje (zoals Voetbal, Jetpack of Brug Bouwen) als afwisseling en beloning, voordat je verdergaat met oefenen. Elke goed antwoord levert munten 🪙 en briefgeld 💵 op.',
  },
  {
    key: 'kledingkast',
    img: '/scenes/kledingkast.png',
    title: '👗 Kledingkast',
    desc: 'Je eigen 3D-poppetje aankleden.',
    detail: 'In de Kledingkast trek je je 3D-poppetje aan met alle shirts, broeken, sokken, schoenen en petten die je hebt verdiend of gewonnen. Je kunt per categorie kiezen, het poppetje laten bewegen en dansen, en met "Verras me!" een willekeurige outfit uitproberen.',
  },
  {
    key: 'winkel',
    img: '/scenes/winkel.png',
    title: '🛒 Winkel',
    desc: 'Lootboxen openen met verdiend geld.',
    detail: 'In de Winkel open je met je verdiende briefgeld 💵 lootboxen voor Shirt, Broek, Sokken, Schoenen en Pet. Elke box geeft een willekeurig nieuw item — van gewoon tot ultra legendarisch — dat je meteen kunt gebruiken in de Kledingkast.',
  },
]

export default function Landing({ onChoose }) {
  const [openCard, setOpenCard] = useState(null)

  return (
    <div className="landing-screen">
      <div className="landing-stars" aria-hidden="true">
        {Array.from({ length: 30 }, (_, i) => (
          <span key={i} className="landing-star" style={{
            left: `${(i * 37 + 4) % 100}%`,
            top: `${(i * 53 + 6) % 100}%`,
            animationDelay: `${(i * 0.31) % 4}s`,
            animationDuration: `${3 + (i % 4)}s`,
            '--o': 0.15 + (i % 5) * 0.08,
          }} />
        ))}
      </div>

      <header className="landing-hero">
        <img className="landing-logo" src="/logo-rond.png" alt="Kenniskist" />
        <h1 className="landing-title">Kenniskist</h1>
        <p className="landing-tagline">✨ Leren terwijl je speelt ✨</p>
        <p className="landing-intro">
          Kenniskist is een leerplatform voor groep 4 t/m 8 waarin kinderen rekenen, taal en spelling
          oefenen via korte, speelse minigames. Voor elk goed antwoord verdien je munten en briefgeld,
          waarmee je een eigen 3D-poppetje aankleedt en lootboxen opent in de winkel.
        </p>
      </header>

      <section className="portal-choice portal-choice-top">
        <h2 className="landing-section-title">Kies je portaal</h2>
        <div className="portal-cards">
          <button className="portal-card portal-student" onClick={() => onChoose('student')}>
            <span className="portal-icon">🎒</span>
            <span className="portal-name">Leerlingen portaal</span>
            <span className="portal-desc">Ga direct spelen, oefenen en je poppetje aankleden.</span>
            <span className="portal-arrow">Start →</span>
          </button>
          <button className="portal-card portal-teacher" onClick={() => onChoose('teacher')}>
            <span className="portal-icon">🧑‍🏫</span>
            <span className="portal-name">Leerkrachten portaal</span>
            <span className="portal-desc">Lees hoe Kenniskist werkt, welke vakken het dekt en hoe je het inzet in de klas.</span>
            <span className="portal-arrow">Bekijk →</span>
          </button>
        </div>
      </section>

      <section className="landing-subjects" aria-label="Vakken">
        {SUBJECTS.map(s => (
          <span key={s.label} className="landing-chip">{s.emoji} {s.label}</span>
        ))}
      </section>

      <section className="landing-steps" aria-label="Hoe werkt het">
        <h2 className="landing-section-title">Hoe werkt het?</h2>
        <div className="steps-row">
          {STEPS.map(s => (
            <div key={s.title} className="step-card">
              <span className="step-emoji">{s.emoji}</span>
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
                <h3 className="showcase-title">{s.title}</h3>
                <p className="showcase-desc">{s.desc}</p>
                <span className="showcase-toggle">{open ? '▲ Minder' : '▼ Meer uitleg'}</span>
                {open && <p className="showcase-detail">{s.detail}</p>}
              </button>
            )
          })}
        </div>
      </section>

      <section className="landing-games" aria-label="Beschikbare spellen">
        <h2 className="landing-section-title">Wat zit er allemaal in?</h2>
        <div className="landing-games-grid">
          {GAMES.map(g => (
            <span key={g.label} className="landing-game-chip">{g.emoji} {g.label}</span>
          ))}
        </div>
      </section>

      <footer className="landing-footer">Kenniskist · gemaakt om leren leuk te maken</footer>
    </div>
  )
}
