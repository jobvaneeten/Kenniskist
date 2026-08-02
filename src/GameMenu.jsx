import { useState, useRef } from 'react'
import FootballGame, { loadToernooi } from './games/FootballGame'
import TowerDefenseGame from './games/TowerDefenseGame'
import HillClimbGame from './games/HillClimbGame'
import JetpackGame from './games/JetpackGame'
import HeadSoccer from './games/HeadSoccer'
import AstroKatapultGame from './games/AstroKatapultGame'
import SterrenstroompGame from './games/SterrenstroompGame'
import DoodleSprongGame from './games/DoodleSprongGame'
import DierEvolutieGame from './games/DierEvolutieGame'
import BrugBouwen from './games/BrugBouwen'
import ProcentenBreuken from './games/ProcentenBreuken'
import VerhaaltjesSommen from './games/VerhaaltjesSommen'
import BreukenPlaatjes from './games/BreukenPlaatjes'
import MaatenOmrekenen from './games/MaatenOmrekenen'
import TafelsOefenen from './games/TafelsOefenen'
import WerkwoordSpelling from './games/WerkwoordSpelling'
import DicteeThema from './games/DicteeThema'
import TaalOefenen from './games/TaalOefenen'
import BegrijpendLezen from './games/BegrijpendLezen'
import EngelsOefenen from './games/EngelsOefenen'
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
  { key: 'engels',     label: 'Engels',           emoji: '🇬🇧', color: '#8b6bff', dark: '#5a3fd6', scene: 'taal',       vb: '"phone" → telefoon · blok 7, 8 & 9' },
]

// Beloningen per spel-type (chips op de kaarten)
const REWARDS = {
  taal:      ['💵 briefgeld'],
  iep:       ['💵 briefgeld'],
  werkwoord: ['💵 briefgeld'],
  tafels:    ['💵 briefgeld'],
}

// Which (year, subject) combos have a real game — rest shows placeholder
const GAMES = {
  '5-taal': 'taal',
  '6-taal': 'taal',
  '7-taal': 'taal',
  '8-taal': 'taal',
  '4-rekenen': 'tafels',
  '5-rekenen': 'iep',
  '6-rekenen': 'iep',
  '7-rekenen': 'iep',
  '8-rekenen': 'iep',
  '6-spelling': 'werkwoord',
  '7-spelling': 'werkwoord',
  '8-spelling': 'werkwoord',
  '7-begrijpend': 'begrijpend',
  '8-begrijpend': 'begrijpend',
  '7-engels': 'engels',
}

const FREE_GAMES = [
  { key: 'football',      emoji: '⚽', name: '1 tegen 1 voetbal', desc: 'Scoor tegen de computer of een vriend' },
  { key: 'headsoccer',    emoji: '🥅', name: 'Supervoetbal',     desc: '1-tegen-1 met landen & special moves' },
  { key: 'towerdefense',  emoji: '🏰', name: 'Tower Defense',   desc: 'Bouw torens & stop de vijanden' },
  { key: 'jetpack',       emoji: '🚀', name: 'Jetpack',          desc: 'Vlieg zo ver mogelijk!' },
  { key: 'astrokatapult', emoji: '🪐', name: 'Astro Katapult',   desc: 'Lanceer & versla de aliens in 50 levels!' },
  { key: 'sterrenstroom', emoji: '🛸', name: 'Spacerunner',     desc: 'Ontwijk de asteroïden in de ruimte!' },
  { key: 'doodlesprong',  emoji: '🦘', name: 'Doodle Sprong',   desc: 'Spring zo hoog mogelijk en shop nieuwe personages!' },
  { key: 'evolutie',      emoji: '🐨', name: 'Dier Evolutie',   desc: 'Voeg dieren samen en ontdek 24 evoluties per soort!' },
  { key: 'brug',          emoji: '🌉', name: 'Brug Bouwen',     desc: 'Bouw bruggen in 22 levels — hout, weg, metaal & touw!' },
  { key: 'hillclimb',     emoji: '🚗', name: 'Bergrijden',      desc: 'Race over heuvels, verzamel munten en upgrade je auto!' },
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

export default function GameMenu({ onBack, addCuruntie, addBriefgeld, toegestaneGroepen }) {
  const [year,       setYear]       = useState(null)
  const [subject,    setSubject]    = useState(null)
  const [directGame, setDirectGame] = useState(null)
  const [gameMode,   setGameMode]   = useState(null)
  const [rekenKeuze,    setRekenKeuze]    = useState(null)   // null | 'verhaal' | 'tafels' | …
  const [spellingKeuze, setSpellingKeuze] = useState(null)   // null | 'werkwoord' | 'dictee'
  const [taSoonBlok,    setTaSoonBlok]    = useState(null)   // blok-nr met "komt binnenkort"
  const [dicteeNr,      setDicteeNr]      = useState(8)      // gekozen dictee-blok (7 of 8)

  // Leeg/undefined = geen beperking (gast, leerkracht-weergave, klas zonder groepen)
  const zichtbareJaren = toegestaneGroepen?.length ? YEARS.filter(y => toegestaneGroepen.includes(y.num)) : YEARS

  // Eenmalig-verdienen: alle spellen geven maar 1x geld, behalve de oefen-
  // activiteiten (heel spelling, breuken/procenten/komma, zinsontleding +
  // woordsoorten, tafels + deelsommen) die hun eigen rauwe add-functies houden.
  const earnedRef = useRef(null)
  if (earnedRef.current === null) {
    try { earnedRef.current = JSON.parse(localStorage.getItem('kk_earned_once') || '{}') } catch { earnedRef.current = {} }
  }
  const gateRef = useRef({})   // gameKey -> beloning aan/uit voor deze sessie
  const makeGated = (key, realAdd) => {
    if (!(key in gateRef.current)) gateRef.current[key] = !earnedRef.current[key]
    const on = gateRef.current[key]
    return (amount) => {
      if (!on) return
      if (!earnedRef.current[key]) {
        earnedRef.current[key] = true
        try { localStorage.setItem('kk_earned_once', JSON.stringify(earnedRef.current)) } catch {}
      }
      realAdd?.(amount)
    }
  }
  const clearGate = (key) => { delete gateRef.current[key] }

  // Tower defense (no mode selection needed)
  if (directGame === 'towerdefense') {
    return <TowerDefenseGame onBack={onBack} />
  }

  if (directGame === 'jetpack') {
    return <JetpackGame onBack={onBack} addCuruntie={makeGated('jetpack', addCuruntie)} />
  }

  if (directGame === 'headsoccer') {
    return <HeadSoccer onBack={onBack} addCuruntie={makeGated('headsoccer', addCuruntie)} />
  }

  if (directGame === 'astrokatapult') {
    return <AstroKatapultGame onBack={onBack} />
  }

  if (directGame === 'sterrenstroom') {
    return <SterrenstroompGame onBack={onBack} />
  }

  if (directGame === 'doodlesprong') {
    return <DoodleSprongGame onBack={onBack} />
  }

  if (directGame === 'evolutie') {
    return <DierEvolutieGame onBack={onBack} />
  }

  if (directGame === 'brug') {
    return <BrugBouwen onBack={onBack} />
  }

  if (directGame === 'hillclimb') {
    return <HillClimbGame onBack={onBack} />
  }


  // Verder met een opgeslagen toernooi (buiten de opgaves)
  if (directGame === 'football' && gameMode === 'resume') {
    return (
      <FootballGame
        noQuiz
        resumeBracket={loadToernooi()}
        onBack={onBack}
        addCuruntie={makeGated('football', addCuruntie)}
      />
    )
  }

  // Direct game (no quiz)
  if (directGame === 'football' && gameMode) {
    return (
      <FootballGame
        noQuiz
        twoPlayer={gameMode === '2player'}
        onBack={onBack}
        addCuruntie={makeGated('football', addCuruntie)}
      />
    )
  }

  if (directGame === 'football') {
    return (
      <div className="game-screen game-screen-center">
        <button className="back-btn" onClick={() => setDirectGame(null)}>← Menu</button>
        <div className="game-header">
          <span className="game-header-icon">⚽</span>
          <h1 className="game-header-title">1 tegen 1 voetbal</h1>
          <p className="game-header-sub">Kies een modus</p>
        </div>
        {loadToernooi() && (
          <button className="mode-card" style={{ maxWidth: 360, marginBottom: 14 }} onClick={() => setGameMode('resume')}>
            <span className="mode-name">🏆 Verder met je toernooi</span>
            <span className="mode-desc">Speel de volgende ronde van je lopende toernooi</span>
          </button>
        )}
        <div className="mode-grid">
          <button className="mode-card" onClick={() => setGameMode('solo')}>
            <MenuScene name="solo" />
            <span className="mode-name">🧑 1 Speler</span>
            <span className="mode-desc">Jij tegen de computer</span>
          </button>
          <button className="mode-card" onClick={() => setGameMode('2player')}>
            <MenuScene name="duo" />
            <span className="mode-name">👥 2 Spelers</span>
            <span className="mode-desc">Pijltjes vs WASD</span>
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
          onBack={() => setSubject(null)}
          addBriefgeld={addBriefgeld}
          addCuruntie={addCuruntie}
        />
      )
    }

    if (GAMES[gameId] === 'tafels') {
      return (
        <TafelsOefenen
          groep={year}
          onBack={() => setSubject(null)}
          addBriefgeld={addBriefgeld}
          addCuruntie={addCuruntie}
        />
      )
    }

    if (GAMES[gameId] === 'iep') {
      if (rekenKeuze === 'procenten') {
        return <ProcentenBreuken onBack={() => setRekenKeuze(null)} addBriefgeld={addBriefgeld} />
      }
      if (rekenKeuze === 'verhaal') {
        return <VerhaaltjesSommen groep={year} onBack={() => setRekenKeuze(null)} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie} />
      }
      if (rekenKeuze === 'tafels') {
        return <TafelsOefenen groep={year} onBack={() => setRekenKeuze(null)} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie} />
      }
      if (rekenKeuze === 'breuken') {
        return <BreukenPlaatjes onBack={() => setRekenKeuze(null)} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie} />
      }
      if (rekenKeuze === 'maten') {
        return <MaatenOmrekenen onBack={() => setRekenKeuze(null)} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie} />
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
            {(year === 5 || year === 6) && (
              <button className="mode-card" onClick={() => setRekenKeuze('tafels')}>
                <MenuScene name="blok9" />
                <span className="mode-name">✖️ Tafels &amp; deelsommen</span>
                <span className="mode-desc">Oefen de keer- en deelsommen</span>
                <span className="vb-line">"7 × 8 = ?" en "56 : 8 = ?"</span>
                <RewardChips rewards={['💵 briefgeld']} />
              </button>
            )}
            {year === 6 && (
              <button className="mode-card" onClick={() => setRekenKeuze('breuken')}>
                <MenuScene name="blok9" />
                <span className="mode-name">🍕 Breuken &amp; plaatjes</span>
                <span className="mode-desc">Koppel de breuk aan het plaatje</span>
                <span className="vb-line">Ronde taarten en langwerpige repen</span>
                <RewardChips rewards={['💵 briefgeld']} />
              </button>
            )}
            {(year === 6 || year === 7) && (
              <button className="mode-card" onClick={() => setRekenKeuze('maten')}>
                <MenuScene name="blok9" />
                <span className="mode-name">📏 Maten omrekenen</span>
                <span className="mode-desc">Lengte &amp; inhoud · 3 levels</span>
                <span className="vb-line">"5 m = ? cm" · "2,5 m = ? cm"</span>
                <RewardChips rewards={['💵 briefgeld']} />
              </button>
            )}
            {(year === 7 || year === 8) && (
              <button className="mode-card" onClick={() => setRekenKeuze('procenten')}>
                <MenuScene name="blok9" />
                <span className="mode-name">💯 Procenten · Breuken · Komma</span>
                <span className="mode-desc">Sleep wat bij elkaar hoort</span>
                <span className="vb-line">"25% = 1/4 = 0,25"</span>
                <RewardChips rewards={['💵 briefgeld']} />
              </button>
            )}
            <button className="mode-card" onClick={() => setRekenKeuze('verhaal')}>
              <MenuScene name="taal" />
              <span className="mode-name">📖 Verhaaltjessommen</span>
              <span className="mode-desc">Redactiesommen op jouw niveau{year >= 6 ? ' (FS of S+)' : ''}</span>
              <span className="vb-line">Oefen per doel uit de leerlijn</span>
              <RewardChips rewards={['💵 briefgeld']} />
            </button>
          </div>
        </div>
      )
    }

    if (GAMES[gameId] === 'engels') {
      return <EngelsOefenen onBack={() => setSubject(null)} />
    }

    if (GAMES[gameId] === 'begrijpend') {
      return (
        <BegrijpendLezen
          onBack={() => { clearGate('begrijpend'); setSubject(null) }}
          addBriefgeld={makeGated('begrijpend', addBriefgeld)}
          addCuruntie={makeGated('begrijpend', addCuruntie)}
        />
      )
    }

    if (subject === 'spelling') {
      if (spellingKeuze === 'dictee') {
        return <DicteeThema thema={dicteeNr} onBack={() => setSpellingKeuze('blokken')} addCuruntie={addCuruntie} addBriefgeld={addBriefgeld} />
      }
      if (spellingKeuze === 'categorie') {
        return <DicteeThema file="dictees/dictee-categorie.html" onBack={() => setSpellingKeuze('nietww')} addCuruntie={addCuruntie} addBriefgeld={addBriefgeld} />
      }
      if (spellingKeuze === 'werkwoord') {
        return (
          <WerkwoordSpelling
            groep={year}
            onBack={() => setSpellingKeuze(null)}
            addBriefgeld={addBriefgeld}
          />
        )
      }
      if (taSoonBlok !== null) {
        return (
          <div className="game-screen game-screen-center">
            <button className="back-btn" onClick={() => setTaSoonBlok(null)}>← Terug</button>
            <div className="game-placeholder">
              <span className="gp-emoji">✏️</span>
              <h2 className="gp-title" style={{ color: '#CE93D8' }}>Spellingblok {taSoonBlok}</h2>
              <p className="gp-sub">Groep {year}</p>
              <div className="gp-soon-badge">🚧 Komt binnenkort 🚧</div>
              <p className="gp-desc">Dit blok is nog in aanbouw.<br />Check snel weer terug!</p>
            </div>
          </div>
        )
      }
      const hasWerkwoord = GAMES[gameId] === 'werkwoord'
      const dicteeBlokken = year === 7 ? [1, 2, 3, 4, 5, 6, 7, 8] : []   // groep 7: blok 1 t/m 8 zijn af

      // Niet-werkwoordspelling: keuze tussen per blok of per categorie
      if (spellingKeuze === 'nietww') {
        return (
          <div className="game-screen game-screen-center">
            <button className="back-btn" onClick={() => setSpellingKeuze(null)}>← Terug</button>
            <div className="game-header">
              <span className="game-header-icon" style={{ color: '#CE93D8' }}>✏️</span>
              <h1 className="game-header-title">Niet-werkwoordspelling</h1>
              <p className="game-header-sub">Hoe wil je oefenen?</p>
            </div>
            <div className="mode-grid">
              <button className="mode-card" onClick={() => setSpellingKeuze('blokken')}>
                <MenuScene name="spelling" />
                <span className="mode-name">📕 Per blok oefenen</span>
                <span className="mode-desc">Oefen de woorden van een spellingblok</span>
                <span className="vb-line">Blok 1 t/m 8 — dictee + dieren</span>
                <RewardChips rewards={['💵 briefgeld']} />
              </button>
              <button className="mode-card" onClick={() => setSpellingKeuze('categorie')}>
                <MenuScene name="taal" />
                <span className="mode-name">🐾 Per categorie oefenen</span>
                <span className="mode-desc">Kies een spellingregel en oefen alleen die woorden</span>
                <span className="vb-line">"open lettergreep", "ei/ij", "verkleinwoord -je", ...</span>
                <RewardChips rewards={['💵 briefgeld']} />
              </button>
            </div>
          </div>
        )
      }

      // Per blok: de losse blokken
      if (spellingKeuze === 'blokken') {
        return (
          <div className="game-screen game-screen-center">
            <button className="back-btn" onClick={() => setSpellingKeuze('nietww')}>← Terug</button>
            <div className="game-header">
              <span className="game-header-icon" style={{ color: '#CE93D8' }}>📕</span>
              <h1 className="game-header-title">Per blok oefenen</h1>
              <p className="game-header-sub">Kies een spellingblok</p>
            </div>
            <div className="blok-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(b => {
                const ready = dicteeBlokken.includes(b)
                return (
                  <button
                    key={b}
                    className={`blok-card${ready ? ' ready' : ''}`}
                    onClick={() => ready ? (setDicteeNr(b), setSpellingKeuze('dictee')) : setTaSoonBlok(b)}
                  >
                    <MenuScene name="spelling" />
                    <span className="blok-num">Blok {b}</span>
                    <span className="blok-tag">{ready ? '✅ Dictee + dieren' : '🚧 binnenkort'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      }

      // Hoofdkeuze: werkwoordspelling of niet-werkwoordspelling
      return (
        <div className="game-screen game-screen-center">
          <button className="back-btn" onClick={() => setSubject(null)}>← Menu</button>
          <div className="game-header">
            <span className="game-header-icon" style={{ color: '#CE93D8' }}>✏️</span>
            <h1 className="game-header-title">Spelling — Groep {year}</h1>
            <p className="game-header-sub">Wat wil je oefenen?</p>
          </div>
          <div className="mode-grid">
            {hasWerkwoord && (
              <button className="mode-card" onClick={() => setSpellingKeuze('werkwoord')}>
                <MenuScene name="spelling" />
                <span className="mode-name">✒️ Werkwoordspelling</span>
                <span className="mode-desc">Tegenwoordige tijd, verleden tijd & voltooid deelwoord</span>
                <span className="vb-line">"ik vind → gisteren ... hij" en "lopen → hij heeft ...?"</span>
                <RewardChips rewards={['💵 briefgeld']} />
              </button>
            )}
            <button className="mode-card" onClick={() => setSpellingKeuze('nietww')}>
              <MenuScene name="taal" />
              <span className="mode-name">📝 Niet-werkwoordspelling</span>
              <span className="mode-desc">Per blok of per categorie oefenen</span>
              <span className="vb-line">Spellingblokken of een spellingregel</span>
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
          addCuruntie={makeGated('football', addCuruntie)}
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
                  {game === 'tafels'
                    ? '✖️ Tafels oefenen'
                    : game === 'iep'
                    ? '🚀 Verhaaltjessommen + blok 9 & 10'
                    : s.key === 'spelling'
                    ? (game === 'werkwoord' ? '✒️ Werkwoord + spellingblok' : '📕 Spellingblokken')
                    : game === 'taal'
                    ? '📖 Taalverkennen + toets'
                    : game === 'begrijpend'
                    ? '🧭 Reis rond de wereld'
                    : game === 'engels'
                    ? '🇬🇧 Song 7, 8 & 9'
                    : '🚧 Komt binnenkort'}
                </span>
                {(game || s.key === 'spelling') && <span className="vb-line">{s.vb}</span>}
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
        {zichtbareJaren.map(y => {
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
              <img className="fg-img" src={`/scenes/games/${g.key}.png`} alt="" />
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
