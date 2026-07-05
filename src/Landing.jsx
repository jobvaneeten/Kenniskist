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

const SHOWCASE = [
  { img: '/scenes/game.png',        title: 'Speel Game',    desc: 'Oefenspellen voor rekenen, taal en spelling — elke goed antwoord levert munten en briefgeld op.' },
  { img: '/scenes/kledingkast.png', title: 'Kledingkast',   desc: 'Een eigen 3D-poppetje aankleden met alles wat je hebt verdiend, en er zelfs mee bewegen en dansen.' },
  { img: '/scenes/winkel.png',      title: 'Winkel',        desc: 'Lootboxen openen met verdiend briefgeld voor nieuwe kleuren, patronen en zeldzame items.' },
]

export default function Landing({ onChoose }) {
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

      <section className="landing-subjects" aria-label="Vakken">
        {SUBJECTS.map(s => (
          <span key={s.label} className="landing-chip">{s.emoji} {s.label}</span>
        ))}
      </section>

      <section className="landing-showcase">
        {SHOWCASE.map(s => (
          <div key={s.title} className="showcase-card">
            <img src={s.img} alt={s.title} className="showcase-img" loading="lazy" />
            <h3 className="showcase-title">{s.title}</h3>
            <p className="showcase-desc">{s.desc}</p>
          </div>
        ))}
      </section>

      <section className="landing-games" aria-label="Beschikbare spellen">
        <h2 className="landing-section-title">Wat zit er allemaal in?</h2>
        <div className="landing-games-grid">
          {GAMES.map(g => (
            <span key={g.label} className="landing-game-chip">{g.emoji} {g.label}</span>
          ))}
        </div>
      </section>

      <section className="portal-choice">
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

      <footer className="landing-footer">Kenniskist · gemaakt om leren leuk te maken</footer>
    </div>
  )
}
