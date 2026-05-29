import { useState } from 'react'
import FootballGame from './games/FootballGame'
import TowerDefenseGame from './games/TowerDefenseGame'
import MiniGolfGame from './games/minigolf/MiniGolfGame'
import JetpackGame from './games/JetpackGame'
import IepOefenen from './games/IepOefenen'
import './game.css'

const YEARS = [
  { num: 4, color: '#4FC3F7', dark: '#0d6ea3' },
  { num: 5, color: '#06D6A0', dark: '#04a077' },
  { num: 6, color: '#CE93D8', dark: '#8e3fa8' },
  { num: 7, color: '#FFD23F', dark: '#c09800' },
  { num: 8, color: '#FF6B6B', dark: '#c03030' },
]

const SUBJECTS = [
  { key: 'taal',       label: 'Taal',            emoji: '📖', color: '#4FC3F7', dark: '#0d6ea3' },
  { key: 'spelling',   label: 'Spelling',         emoji: '✏️', color: '#CE93D8', dark: '#8e3fa8' },
  { key: 'rekenen',    label: 'Rekenen',          emoji: '🔢', color: '#FFD23F', dark: '#c09800' },
  { key: 'begrijpend', label: 'Begrijpend Lezen', emoji: '📚', color: '#06D6A0', dark: '#04a077' },
]

// Which (year, subject) combos have a real game — rest shows placeholder
const GAMES = {
  '7-rekenen': 'iep',
}

const FREE_GAMES = [
  { key: 'football',       emoji: '⚽', name: 'WK Voetbal',    desc: 'Alle groepen' },
  { key: 'towerdefense',   emoji: '🏰', name: 'Tower Defense', desc: 'Alle groepen' },
  { key: 'minigolf',       emoji: '⛳', name: 'Mini Golf',      desc: '2 spelers of vs AI' },
  { key: 'jetpack',        emoji: '🚀', name: 'Jetpack',        desc: 'Vlieg zo ver mogelijk!' },
]

export default function GameMenu({ onBack, addCuruntie }) {
  const [year,       setYear]       = useState(null)
  const [subject,    setSubject]    = useState(null)
  const [directGame, setDirectGame] = useState(null)
  const [gameMode,   setGameMode]   = useState(null)

  // Tower defense (no mode selection needed)
  if (directGame === 'towerdefense') {
    return <TowerDefenseGame onBack={onBack} />
  }

  // Mini golf (mode selection handled inside the component)
  if (directGame === 'minigolf') {
    return <MiniGolfGame onBack={onBack} />
  }

  if (directGame === 'jetpack') {
    return <JetpackGame onBack={onBack} />
  }

  // Direct game (no quiz)
  if (directGame === 'football' && gameMode) {
    return (
      <FootballGame
        noQuiz
        twoPlayer={gameMode === '2player'}
        onBack={onBack}
        addCuruntie={addCuruntie}
      />
    )
  }

  if (directGame === 'football') {
    return (
      <div className="game-screen game-screen-center">
        <button className="back-btn" onClick={() => setDirectGame(null)}>← Menu</button>
        <div className="game-header">
          <span className="game-header-icon">⚽</span>
          <h1 className="game-header-title">WK Voetbal</h1>
          <p className="game-header-sub">Kies een modus</p>
        </div>
        <div className="mode-grid">
          <button className="mode-card" onClick={() => setGameMode('solo')}>
            <span className="mode-emoji">🧑</span>
            <span className="mode-name">1 Speler</span>
            <span className="mode-desc">Jij tegen de computer</span>
          </button>
          <button className="mode-card" onClick={() => setGameMode('2player')}>
            <span className="mode-emoji">👥</span>
            <span className="mode-name">2 Spelers</span>
            <span className="mode-desc">Pijltjes vs WASD</span>
          </button>
        </div>
      </div>
    )
  }

  // Active game (via year + subject)
  if (year !== null && subject !== null) {
    const gameId = `${year}-${subject}`

    if (GAMES[gameId] === 'iep') {
      return <IepOefenen onBack={() => setSubject(null)} />
    }

    if (GAMES[gameId] === 'football') {
      return (
        <FootballGame
          year={year}
          onBack={onBack}
          addCuruntie={addCuruntie}
        />
      )
    }

    // Placeholder for not-yet-built games
    const s = SUBJECTS.find(s => s.key === subject)
    return (
      <div className="game-screen game-screen-center">
        <button className="back-btn" onClick={() => setSubject(null)}>← Menu</button>
        <div className="game-placeholder">
          <span className="gp-emoji">{s.emoji}</span>
          <h2 className="gp-title" style={{ color: s.color }}>{s.label}</h2>
          <p className="gp-sub">Groep {year}</p>
          <div className="gp-soon-badge">🚧 Komt binnenkort 🚧</div>
          <p className="gp-desc">
            Het spel voor <strong>{s.label}</strong> groep {year} is in aanbouw.<br />
            Check snel weer terug!
          </p>
        </div>
      </div>
    )
  }

  // Subject selection
  if (year !== null) {
    const y = YEARS.find(y => y.num === year)
    return (
      <div className="game-screen">
        <button className="back-btn" onClick={() => setYear(null)}>← Menu</button>
        <div className="game-header">
          <span className="game-header-icon" style={{ color: y.color }}>📚</span>
          <h1 className="game-header-title">Groep {year}</h1>
          <p className="game-header-sub">Kies een vak</p>
        </div>
        <div className="subject-grid">
          {SUBJECTS.map(s => {
            const hasGame = !!GAMES[`${year}-${s.key}`]
            return (
              <button
                key={s.key}
                className="subject-card"
                style={{ '--sc': s.color, '--sd': s.dark }}
                onClick={() => setSubject(s.key)}
              >
                <span className="subject-emoji">{s.emoji}</span>
                <span className="subject-label">{s.label}</span>
                <span className="subject-tag">
                  {GAMES[`${year}-${s.key}`] === 'iep'
                    ? '🚀 IEP Oefenen'
                    : hasGame
                    ? '▶ Spelen'
                    : 'Groep ' + year}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Year selection
  return (
    <div className="game-screen">
      <button className="back-btn" onClick={onBack}>← Menu</button>
      <div className="game-header">
        <span className="game-header-icon">🎮</span>
        <h1 className="game-header-title">Games</h1>
        <p className="game-header-sub">Kies jouw groep</p>
      </div>
      <div className="year-grid">
        {YEARS.map(y => (
          <button
            key={y.num}
            className="year-card"
            style={{ '--yc': y.color, '--yd': y.dark }}
            onClick={() => setYear(y.num)}
          >
            <span className="year-badge">Groep</span>
            <span className="year-num">{y.num}</span>
            <span className="year-arrow">→</span>
          </button>
        ))}
      </div>

      <div className="free-games-section">
        <p className="free-games-label">🎮 Games</p>
        <div className="free-games-grid">
          {FREE_GAMES.map(g => (
            <button key={g.key} className="free-game-card" onClick={() => setDirectGame(g.key)}>
              <span className="free-game-emoji">{g.emoji}</span>
              <span className="free-game-name">{g.name}</span>
              <span className="free-game-desc">{g.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
