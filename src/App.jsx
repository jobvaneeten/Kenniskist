import { useState } from 'react'
import './App.css'

const subjects = [
  { icon: '🔢', label: 'Rekenen', color: '#FF6B35', bg: '#FFF0EB', desc: 'Optellen, aftrekken en nog veel meer!' },
  { icon: '📖', label: 'Taal', color: '#118AB2', bg: '#EBF6FF', desc: 'Lezen, schrijven en spelling oefenen.' },
  { icon: '🌿', label: 'Natuur', color: '#06D6A0', bg: '#E8FBF6', desc: 'Ontdek planten, dieren en de natuur.' },
  { icon: '🌍', label: 'Aardrijkskunde', color: '#7B2FBE', bg: '#F2EBFC', desc: 'Landen, steden en de wereld om je heen.' },
  { icon: '🏰', label: 'Geschiedenis', color: '#E9C46A', bg: '#FEF9EC', desc: 'Ridders, vikingen en oude tijden.' },
  { icon: '🔬', label: 'Wetenschap', color: '#E76F51', bg: '#FEF0EC', desc: 'Experimenten en ontdekkingen doen!' },
]

const steps = [
  { num: '1', icon: '🎯', title: 'Kies een vak', desc: 'Rekenen, taal of iets anders — jij bepaalt!' },
  { num: '2', icon: '🎮', title: 'Speel en leer', desc: 'Leuke opdrachten en quizzes wachten op je.' },
  { num: '3', icon: '⭐', title: 'Verdien sterren', desc: 'Hoe meer je oefent, hoe meer sterren je krijgt!' },
]

const achievements = [
  { icon: '🏆', value: '50.000+', label: 'Leerlingen' },
  { icon: '📚', value: '2.000+', label: 'Oefeningen' },
  { icon: '⭐', value: '1.000.000+', label: 'Verdiende sterren' },
  { icon: '🎓', value: '500+', label: 'Scholen' },
]

function Stars({ count = 5 }) {
  return (
    <div className="stars-row">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="star-deco" style={{ animationDelay: `${i * 0.15}s` }}>⭐</span>
      ))}
    </div>
  )
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="header">
      <div className="container header-inner">
        <a href="#" className="logo">
          <span className="logo-box">🗃️</span>
          <span className="logo-text">Kennis<span className="logo-accent">kist</span></span>
        </a>
        <nav className={`nav ${menuOpen ? 'open' : ''}`}>
          <a href="#vakken">Vakken</a>
          <a href="#hoe-werkt-het">Hoe werkt het?</a>
          <a href="#ouders">Ouders &amp; Leraren</a>
          <a href="#start" className="btn btn-nav">Begin nu! 🚀</a>
        </nav>
        <button className="hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-bubbles" aria-hidden="true">
        {['🌟','🎈','📚','✏️','🔭','🎨','🦋','🌈'].map((e, i) => (
          <span key={i} className="bubble" style={{ '--i': i }}>{e}</span>
        ))}
      </div>
      <div className="container hero-inner">
        <div className="hero-text">
          <div className="hero-badge">🎉 Gratis voor alle basisschoolleerlingen!</div>
          <h1 className="hero-title">
            Leren is <span className="hero-accent">superleuk</span> bij Kenniskist!
          </h1>
          <p className="hero-subtitle">
            Oefen rekenen, taal, natuur en nog veel meer — met leuke spelletjes, quizzes en sterren verzamelen!
          </p>
          <div className="hero-actions">
            <a href="#start" className="btn btn-hero-primary">Begin nu gratis! 🚀</a>
            <a href="#vakken" className="btn btn-hero-outline">Bekijk de vakken 👀</a>
          </div>
          <Stars count={5} />
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="mascot-card">
            <div className="mascot-face">🦉</div>
            <div className="mascot-bubble">Hoi! Ik ben Kees de uil.<br />Zullen we samen leren?</div>
            <div className="mascot-stars">⭐⭐⭐⭐⭐</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Subjects() {
  return (
    <section className="subjects" id="vakken">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Welk vak ga jij oefenen? 📚</h2>
          <p className="section-sub">Kies je favoriete vak en ga aan de slag!</p>
        </div>
        <div className="subjects-grid">
          {subjects.map((s) => (
            <a href="#start" className="subject-card" key={s.label}
               style={{ '--card-color': s.color, '--card-bg': s.bg }}>
              <div className="subject-icon">{s.icon}</div>
              <h3 className="subject-label">{s.label}</h3>
              <p className="subject-desc">{s.desc}</p>
              <span className="subject-cta">Leer nu →</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section className="how" id="hoe-werkt-het">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Zo werkt Kenniskist! 🎮</h2>
          <p className="section-sub">In drie stappen ben je al aan het leren.</p>
        </div>
        <div className="steps-row">
          {steps.map((s) => (
            <div className="step-card" key={s.num}>
              <div className="step-num">{s.num}</div>
              <div className="step-icon">{s.icon}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Achievements() {
  return (
    <section className="achievements">
      <div className="container">
        <div className="achievements-grid">
          {achievements.map((a) => (
            <div className="ach-card" key={a.label}>
              <span className="ach-icon">{a.icon}</span>
              <span className="ach-value">{a.value}</span>
              <span className="ach-label">{a.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section className="features" id="features">
      <div className="container features-inner">
        <div className="features-text">
          <h2 className="section-title left">Waarom kiezen voor Kenniskist? 🌟</h2>
          <ul className="features-list">
            <li><span className="feat-icon">🎯</span><div><strong>Op jouw niveau</strong><br/>De oefeningen passen zich aan — niet te moeilijk, niet te makkelijk.</div></li>
            <li><span className="feat-icon">🏅</span><div><strong>Verdien badges en sterren</strong><br/>Elke dag dat je oefent, word je beloond met leuke beloningen!</div></li>
            <li><span className="feat-icon">📱</span><div><strong>Overal te gebruiken</strong><br/>Op de tablet, computer of telefoon — altijd en overal leren.</div></li>
            <li><span className="feat-icon">🔒</span><div><strong>Veilig en gratis</strong><br/>Geen advertenties, geen betalen — gewoon lekker leren.</div></li>
          </ul>
        </div>
        <div className="features-visual">
          <div className="trophy-card">
            <div className="trophy-header">🏆 Jouw beloningen</div>
            <div className="badge-row">
              <div className="badge-item">🥇<span>Rekenaar</span></div>
              <div className="badge-item">📖<span>Leesbeest</span></div>
              <div className="badge-item">🌿<span>Natuurkenner</span></div>
              <div className="badge-item">🌍<span>Wereldreiziger</span></div>
              <div className="badge-item badge-locked">🔒<span>???</span></div>
              <div className="badge-item badge-locked">🔒<span>???</span></div>
            </div>
            <div className="xp-bar-wrap">
              <div className="xp-label">Voortgang deze week</div>
              <div className="xp-bar"><div className="xp-fill" style={{ width: '68%' }}>68%</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Parents() {
  return (
    <section className="parents" id="ouders">
      <div className="container parents-inner">
        <div className="parents-icon">👨‍👩‍👧‍👦</div>
        <div className="parents-text">
          <h2>Voor ouders &amp; leerkrachten</h2>
          <p>
            Kenniskist is volledig gratis en veilig. Volg de voortgang van kinderen, stel eigen oefensets in
            en ontvang wekelijkse rapportages. AVG-conform — alle data blijft in Nederland.
          </p>
          <div className="parents-btns">
            <a href="#start" className="btn btn-parents">Maak een docentaccount</a>
            <a href="#start" className="btn btn-parents-outline">Meer informatie</a>
          </div>
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="cta" id="start">
      <div className="cta-decoration" aria-hidden="true">
        {['🌟','🎉','🚀','📚','⭐','🎈'].map((e, i) => (
          <span key={i} className="cta-deco" style={{ '--j': i }}>{e}</span>
        ))}
      </div>
      <div className="container cta-inner">
        <h2 className="cta-title">Klaar om te beginnen? 🚀</h2>
        <p className="cta-sub">Maak gratis een account aan en start meteen met leren!</p>
        <form className="cta-form" onSubmit={(e) => e.preventDefault()}>
          <input type="email" placeholder="jouw e-mailadres" className="cta-input" required />
          <button type="submit" className="btn btn-cta">Aanmelden! ⭐</button>
        </form>
        <p className="cta-note">Gratis · Geen creditcard · Veilig voor kinderen</p>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <a href="#" className="logo">
            <span className="logo-box">🗃️</span>
            <span className="logo-text">Kennis<span className="logo-accent">kist</span></span>
          </a>
          <p>Leren is een avontuur!</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <strong>Vakken</strong>
            <a href="#vakken">Rekenen</a>
            <a href="#vakken">Taal</a>
            <a href="#vakken">Natuur</a>
            <a href="#vakken">Alle vakken</a>
          </div>
          <div className="footer-col">
            <strong>Over ons</strong>
            <a href="#ouders">Voor ouders</a>
            <a href="#ouders">Voor leerkrachten</a>
            <a href="#">Privacy</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 Kenniskist.nl — Gemaakt met ❤️ voor basisschoolkinderen overal in Nederland</p>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Subjects />
        <HowItWorks />
        <Achievements />
        <Features />
        <Parents />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
