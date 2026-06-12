import { useState } from 'react'
import FootballGame from './games/FootballGame'
import TowerDefenseGame from './games/TowerDefenseGame'
import JetpackGame from './games/JetpackGame'
import AstroKatapultGame from './games/AstroKatapultGame'
import SterrenstroompGame from './games/SterrenstroompGame'
import BlokOefenen from './games/BlokOefenen'
import ProcentenBreuken from './games/ProcentenBreuken'
import WerkwoordSpelling from './games/WerkwoordSpelling'
import TaalOefenen from './games/TaalOefenen'
import MenuScene from './MenuScenes'
import './game.css'

const YEARS = [
  { num: 4, color: '#4FC3F7', dark: '#0d6ea3' },
  { num: 5, color: '#06D6A0', dark: '#04a077' },
  { num: 6, color: '#CE93D8', dark: '#8e3fa8' },
  { num: 7, color: '#FFD23F', dark: '#c09800' },
  { num: 8, color: '#FF6B6B', dark: '#c03030' },
]

const SUBJECTS = [
  { key: 'taal',       label: 'Taal',            emoji: '📖', color: '#4FC3F7', dark: '#0d6ea3', scene: 'taal',       vb: '"Enorm" betekent: heel groot of heel klein?' },
  { key: 'spelling',   label: 'Spelling',         emoji: '✏️', color: '#CE93D8', dark: '#8e3fa8', scene: 'spelling',   vb: 'ik loop → hij ...?' },
  { key: 'rekenen',    label: 'Rekenen',          emoji: '🔢', color: '#FFD23F', dark: '#c09800', scene: 'rekenen',    vb: '23 × 4 = ?' },
  { key: 'begrijpend', label: 'Begrijpend Lezen', emoji: '📚', color: '#06D6A0', dark: '#04a077', scene: 'begrijpend', vb: 'Lees de tekst & beantwoord de vragen' },
]

// Beloningen per spel-type (chips op de kaarten)
const REWARDS = {
  taal:      ['🪙 munten', '💵 briefgeld'],
  iep:       ['🪙 munten', '💵 briefgeld'],
  werkwoord: ['💵 briefgeld'],
}

// Which (year, subject) combos have a real game — rest shows placeholder
const GAMES = {
  '5-taal': 'taal',
  '6-taal': 'taal',
  '7-taal': 'taal',
  '8-taal': 'taal',
  '7-rekenen': 'iep',
  '7-spelling': 'werkwoord',
  '8-spelling': 'werkwoord',
}

const FREE_GAMES = [
  { key: 'football',      emoji: '⚽', name: 'WK Voetbal',      desc: 'Scoor tegen de computer of een vriend', rewards: ['🪙 munten'] },
  { key: 'towerdefense',  emoji: '🏰', name: 'Tower Defense',   desc: 'Bouw torens & stop de vijanden' },
  { key: 'jetpack',       emoji: '🚀', name: 'Jetpack',          desc: 'Vlieg zo ver mogelijk!', rewards: ['🪙 munten'] },
  { key: 'astrokatapult', emoji: '🪐', name: 'Astro Katapult',   desc: 'Lanceer & versla de aliens in 50 levels!' },
  { key: 'sterrenstroom', emoji: '🛸', name: 'Spacerunner',     desc: 'Ontwijk de asteroïden in de ruimte!' },
]

function RewardChips({ rewards }) {
  if (!rewards?.length) return null
  return (
    <span className="reward-chips">
      {rewards.map(r => (
        <span key={r} className={`reward-chip${r.includes('💵') ? ' brief' : ''}`}>{r}</span>
      ))}
    </span>
  )
}

export default function GameMenu({ onBack, addCuruntie, addBriefgeld }) {
  const [year,       setYear]       = useState(null)
  const [subject,    setSubject]    = useState(null)
  const [directGame, setDirectGame] = useState(null)
  const [gameMode,   setGameMode]   = useState(null)
  const [rekenKeuze,    setRekenKeuze]    = useState(null)   // null | 'verhaal' | 'blok9'
  const [spellingKeuze, setSpellingKeuze] = useState(null)   // null | 'werkwoord'
  const [taalActive,    setTaalActive]    = useState(false)

  // Tower defense (no mode selection needed)
  if (directGame === 'towerdefense') {
    return <TowerDefenseGame onBack={onBack} />
  }

  if (directGame === 'jetpack') {
    return <JetpackGame onBack={onBack} addCuruntie={addCuruntie} />
  }

  if (directGame === 'astrokatapult') {
    return <AstroKatapultGame onBack={onBack} />
  }

  if (directGame === 'sterrenstroom') {
    return <SterrenstroompGame onBack={onBack} />
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
            <MenuScene name="solo" />
            <span className="mode-name">🧑 1 Speler</span>
            <span className="mode-desc">Jij tegen de computer</span>
            <RewardChips rewards={['🪙 munten']} />
          </button>
          <button className="mode-card" onClick={() => setGameMode('2player')}>
            <MenuScene name="duo" />
            <span className="mode-name">👥 2 Spelers</span>
            <span className="mode-desc">Pijltjes vs WASD</span>
            <RewardChips rewards={['🪙 munten']} />
          </button>
        </div>
      </div>
    )
  }

  // Active game (via year + subject)
  if (year !== null && subject !== null) {
    const gameId = `${year}-${subject}`

    if (GAMES[gameId] === 'taal') {
      return (
        <TaalOefenen
          onBack={() => { setTaalActive(false); setSubject(null) }}
          addBriefgeld={addBriefgeld}
          addCuruntie={addCuruntie}
        />
      )
    }

    if (GAMES[gameId] === 'iep') {
      if (rekenKeuze === 'blok9') {
        return <BlokOefenen onBack={() => setRekenKeuze(null)} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie} />
      }
      if (rekenKeuze === 'procenten') {
        return <ProcentenBreuken onBack={() => setRekenKeuze(null)} addBriefgeld={addBriefgeld} />
      }
      // keuzescherm: verhaaltjessommen of oefenen blok 9
      return (
        <div className="game-screen game-screen-center">
          <button className="back-btn" onClick={() => setSubject(null)}>← Menu</button>
          <div className="game-header">
            <span className="game-header-icon" style={{ color: '#FFD23F' }}>🔢</span>
            <h1 className="game-header-title">Rekenen — Groep {year}</h1>
            <p className="game-header-sub">Wat wil je oefenen?</p>
          </div>
          <div className="mode-grid">
            <button className="mode-card" onClick={() => setRekenKeuze('blok9')}>
              <MenuScene name="blok9" />
              <span className="mode-name">📘 Oefenen blok 9</span>
              <span className="mode-desc">FS en S+ werkbladen</span>
              <span className="vb-line">"748 + 156 = ?" en "6 × 125 = ?"</span>
              <RewardChips rewards={['🪙 munten', '💵 briefgeld']} />
            </button>
            <button className="mode-card" onClick={() => setRekenKeuze('procenten')}>
              <MenuScene name="blok9" />
              <span className="mode-name">💯 Procenten · Breuken · Komma</span>
              <span className="mode-desc">Sleep wat bij elkaar hoort</span>
              <span className="vb-line">"25% = 1/4 = 0,25"</span>
              <RewardChips rewards={['💵 briefgeld']} />
            </button>
          </div>
        </div>
      )
    }

    if (GAMES[gameId] === 'werkwoord') {
      if (spellingKeuze === 'werkwoord') {
        return (
          <WerkwoordSpelling
            groep={year}
            onBack={() => setSpellingKeuze(null)}
            addBriefgeld={addBriefgeld}
          />
        )
      }
      // keuzescherm spelling
      return (
        <div className="game-screen game-screen-center">
          <button className="back-btn" onClick={() => setSubject(null)}>← Menu</button>
          <div className="game-header">
            <span className="game-header-icon" style={{ color: '#CE93D8' }}>✏️</span>
            <h1 className="game-header-title">Spelling — Groep {year}</h1>
            <p className="game-header-sub">Wat wil je oefenen?</p>
          </div>
          <div className="mode-grid">
            <button className="mode-card" onClick={() => setSpellingKeuze('werkwoord')}>
              <MenuScene name="spelling" />
              <span className="mode-name">✒️ Werkwoordspelling</span>
              <span className="mode-desc">Tegenwoordige tijd, verleden tijd & voltooid deelwoord</span>
              <span className="vb-line">"ik vind → gisteren ... hij" en "lopen → hij heeft ...?"</span>
              <RewardChips rewards={['💵 briefgeld']} />
            </button>
          </div>
        </div>
      )
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
            const game = GAMES[`${year}-${s.key}`]
            return (
              <button
                key={s.key}
                className="subject-card"
                style={{ '--sc': s.color, '--sd': s.dark }}
                onClick={() => setSubject(s.key)}
              >
                <MenuScene name={s.scene} />
                <span className="subject-label">{s.emoji} {s.label}</span>
                <span className="subject-tag">
                  {game === 'iep'
                    ? '🚀 Verhaaltjessommen + blok 9'
                    : game === 'werkwoord'
                    ? '✒️ Werkwoordspelling'
                    : game === 'taal'
                    ? '📖 Taalverkennen + toets'
                    : '🚧 Komt binnenkort'}
                </span>
                {game && <span className="vb-line">{s.vb}</span>}
                {game && <RewardChips rewards={REWARDS[game]} />}
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
        {YEARS.map(y => {
          const tags = SUBJECTS
            .filter(s => GAMES[`${y.num}-${s.key}`])
            .map(s => `${s.emoji} ${s.label}`)
          return (
            <button
              key={y.num}
              className="year-card"
              style={{ '--yc': y.color, '--yd': y.dark }}
              onClick={() => setYear(y.num)}
            >
              <span className="year-badge">Groep</span>
              <span className="year-num">{y.num}</span>
              <span className="year-tags">
                {tags.length
                  ? tags.map(t => <span key={t} className="year-tag">{t}</span>)
                  : <span className="year-tag year-tag-soon">🚧 In aanbouw</span>}
              </span>
              <span className="year-arrow">→</span>
            </button>
          )
        })}
      </div>

      <div className="free-games-section">
        <p className="free-games-label">🎮 Games</p>
        <div className="free-games-grid">
          {FREE_GAMES.map(g => (
            <button key={g.key} className="free-game-card" onClick={() => setDirectGame(g.key)}>
              <MenuScene name={g.key} />
              <span className="free-game-name">{g.emoji} {g.name}</span>
              <span className="free-game-desc">{g.desc}</span>
              <RewardChips rewards={g.rewards} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
