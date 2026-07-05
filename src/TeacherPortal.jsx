import './landing.css'

const SECTIONS = [
  {
    title: '🎯 Wat is Kenniskist?',
    body: 'Kenniskist is een webgebaseerd oefenplatform voor groep 4 t/m 8. Leerlingen oefenen rekenen, taal, spelling en begrijpend lezen via korte minigames. Goede antwoorden leveren munten en briefgeld op, waarmee kinderen een eigen 3D-poppetje aankleden en lootboxen openen in de winkel — dat houdt oefenen leuk zonder dat het om de beloning zelf gaat draaien.',
  },
  {
    title: '📚 Welke vaardigheden komen aan bod?',
    body: 'Rekenen (sommen, tafels), taal & spelling (dictees, werkwoordspelling), begrijpend lezen, en wereldoriëntatie via verschillende minigames en thema\'s. Nieuwe oefeningen en spellen worden regelmatig toegevoegd.',
  },
  {
    title: '🕹️ Hoe motiveert het spelen?',
    body: 'Elke oefensessie geeft een directe, tastbare beloning: munten voor de winkel, briefgeld voor lootboxen. Kinderen bouwen zo een eigen verzameling kleding en accessoires op voor hun personage — een lichte, speelse motivatieprikkel naast het oefenen zelf.',
  },
  {
    title: '🔒 Privacy & inzage',
    body: 'Kenniskist werkt zonder accounts of inlogverplichting: voortgang, munten en ontgrendelde items worden lokaal op het apparaat van de leerling opgeslagen (in de browser), niet in een centrale database. Er is op dit moment geen leerkracht-dashboard met voortgang per leerling — dit portaal is bedoeld als introductie tot de app, niet als volgsysteem.',
  },
  {
    title: '🏫 Inzetten in de klas',
    body: 'Geschikt als losse oefenmomenten, keuzewerk, of beloning na afgerond werk. Werkt op een gedeeld klasapparaat of chromebook per leerling — houd er rekening mee dat voortgang per apparaat wordt bewaard, dus bij een gedeeld apparaat delen leerlingen ook hetzelfde spaarpotje.',
  },
]

export default function TeacherPortal({ onBack, onGoStudent }) {
  return (
    <div className="landing-screen">
      <div className="landing-stars" aria-hidden="true">
        {Array.from({ length: 20 }, (_, i) => (
          <span key={i} className="landing-star" style={{
            left: `${(i * 41 + 5) % 100}%`,
            top: `${(i * 59 + 7) % 100}%`,
            animationDelay: `${(i * 0.33) % 4}s`,
            animationDuration: `${3 + (i % 4)}s`,
            '--o': 0.15 + (i % 5) * 0.08,
          }} />
        ))}
      </div>

      <button className="landing-back-btn" onClick={onBack}>← Terug</button>

      <header className="landing-hero">
        <span style={{ fontSize: '2.4rem' }}>🧑‍🏫</span>
        <h1 className="landing-title">Leerkrachten portaal</h1>
        <p className="landing-tagline">Wat Kenniskist is, en hoe je het inzet in de klas</p>
      </header>

      <section className="landing-showcase" style={{ maxWidth: 780, gridTemplateColumns: '1fr' }}>
        {SECTIONS.map(s => (
          <div key={s.title} className="showcase-card" style={{ padding: '4px 0' }}>
            <h3 className="showcase-title" style={{ marginTop: 18 }}>{s.title}</h3>
            <p className="showcase-desc" style={{ fontSize: '0.88rem' }}>{s.body}</p>
          </div>
        ))}
      </section>

      <section className="portal-choice">
        <button className="portal-card portal-student" onClick={onGoStudent} style={{ maxWidth: 360, margin: '0 auto' }}>
          <span className="portal-icon">🎒</span>
          <span className="portal-name">Bekijk als leerling</span>
          <span className="portal-desc">Open het leerlingen portaal om zelf rond te kijken.</span>
          <span className="portal-arrow">Start →</span>
        </button>
      </section>

      <footer className="landing-footer">Kenniskist · gemaakt om leren leuk te maken</footer>
    </div>
  )
}
