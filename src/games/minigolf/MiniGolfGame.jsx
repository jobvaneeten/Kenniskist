import { useEffect, useRef, useState, useCallback } from 'react'
import { createMiniGolf, scoreName } from './GameEngine.js'
import { HOLES } from './data/CourseData.js'
import './minigolf.css'

// ── Direction aim line ───────────────────────────────────────────────
function DirLine({ data }) {
  if (!data) return null
  const { power, angle = -90 } = data   // angle: screen degrees, -90 = up (toward hole)
  const len = 160 * power
  return (
    <div className="mg-dir-line" style={{
      width: len,
      transform: `rotate(${angle}deg)`,
      opacity: 0.75 + power * 0.25,
    }} />
  )
}

// ── Power bar ────────────────────────────────────────────────────────
function PowerBar({ power }) {
  const pct = Math.round(power * 100)
  const color = power < 0.4 ? '#4ade80' : power < 0.75 ? '#facc15' : '#f87171'
  return (
    <div className="mg-power-wrap">
      <div className="mg-power-label">KRACHT</div>
      <div className="mg-power-track">
        <div className="mg-power-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="mg-power-pct">{pct}%</div>
    </div>
  )
}

// ── HUD top bar ──────────────────────────────────────────────────────
function HUD({ hole, par, players, currentPlayer }) {
  return (
    <div className="mg-hud">
      <div className="mg-hud-hole">
        <span className="mg-hud-label">Hole</span>
        <span className="mg-hud-value">{hole + 1} / {HOLES.length}</span>
        <span className="mg-hud-name">{HOLES[hole]?.name}</span>
      </div>
      <div className="mg-hud-par">
        <span className="mg-hud-label">Par</span>
        <span className="mg-hud-value">{par}</span>
      </div>
      {players.map((p, i) => (
        <div key={i} className={`mg-hud-player ${i === currentPlayer ? 'mg-active' : ''}`}>
          <div className={`mg-ball-dot mg-ball-${p.ballKey.split('-')[1]}`} />
          <span className="mg-hud-pname">{p.name}</span>
          <span className="mg-hud-shots">{p.shots} slag{p.shots !== 1 ? 'en' : ''}</span>
        </div>
      ))}
    </div>
  )
}

// ── Hole complete overlay ────────────────────────────────────────────
function HoleComplete({ data, onNext, isLast }) {
  if (!data) return null
  return (
    <div className="mg-overlay mg-hole-complete">
      <div className="mg-overlay-card">
        <h2 className="mg-oc-title">Hole {data.hole + 1} klaar!</h2>
        <div className="mg-oc-scores">
          {data.scores.map(({ player, shots, name }) => (
            <div key={player.id} className="mg-oc-row">
              <div className={`mg-ball-dot mg-ball-${player.ballKey.split('-')[1]}`} />
              <span className="mg-oc-pname">{player.name}</span>
              <span className="mg-oc-shots">{shots} slagen</span>
              <span className={`mg-oc-badge mg-badge-${name.toLowerCase().replace(/[^a-z]/g,'')}`}>{name}</span>
            </div>
          ))}
        </div>
        <button className="mg-btn mg-btn-green" onClick={onNext}>
          {isLast ? 'Eindscherm' : 'Volgende hole →'}
        </button>
      </div>
    </div>
  )
}

// ── End screen ───────────────────────────────────────────────────────
function EndScreen({ players, onBack }) {
  const totals = players.map(p => ({ ...p, total: p.scores.reduce((a, b) => a + b, 0) }))
  totals.sort((a, b) => a.total - b.total)
  const winner = totals[0]

  const pars   = HOLES.map(h => h.par)
  const parSum = pars.reduce((a, b) => a + b, 0)

  function stars(total) {
    const diff = total - parSum
    if (diff <= -3) return 3
    if (diff <=  2) return 2
    return 1
  }

  return (
    <div className="mg-overlay mg-end-screen">
      <div className="mg-overlay-card mg-end-card">
        <div className="mg-end-trophy">🏆</div>
        <h2 className="mg-end-title">{winner.name} wint!</h2>
        <div className="mg-end-scores">
          {totals.map((p, i) => (
            <div key={p.id} className="mg-end-row">
              <span className="mg-end-rank">#{i + 1}</span>
              <div className={`mg-ball-dot mg-ball-${p.ballKey.split('-')[1]}`} />
              <span className="mg-end-pname">{p.name}</span>
              <span className="mg-end-total">{p.total} slagen</span>
              <span className="mg-end-stars">{'⭐'.repeat(stars(p.total))}</span>
            </div>
          ))}
        </div>
        <div className="mg-end-par">Par: {parSum}</div>
        <button className="mg-btn mg-btn-green" onClick={onBack}>Terug naar menu</button>
      </div>
    </div>
  )
}

// ── Mode select ──────────────────────────────────────────────────────
function ModeSelect({ onSelect, onBack }) {
  return (
    <div className="mg-menu">
      <button className="mg-back-btn" onClick={onBack}>← Terug</button>
      <div className="mg-menu-logo">⛳</div>
      <h1 className="mg-menu-title">Mini Golf</h1>
      <p className="mg-menu-sub">9 holes • Golf Battle stijl</p>
      <div className="mg-mode-grid">
        <button className="mg-mode-card" onClick={() => onSelect('2player')}>
          <span className="mg-mode-icon">👥</span>
          <span className="mg-mode-name">2 Spelers</span>
          <span className="mg-mode-desc">Rood vs Blauw – beurten</span>
        </button>
        <button className="mg-mode-card" onClick={() => onSelect('vs-ai')}>
          <span className="mg-mode-icon">🤖</span>
          <span className="mg-mode-name">vs Computer</span>
          <span className="mg-mode-desc">Jij (Rood) vs AI (Blauw)</span>
        </button>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────
export default function MiniGolfGame({ onBack }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)

  const [mode,          setMode]          = useState(null)
  const [power,         setPower]         = useState(0)
  const [dirLine,       setDirLine]       = useState(null)
  const [hud,           setHud]           = useState({ hole: 0, par: 2, players: [], currentPlayer: 0 })
  const [holeResult,    setHoleResult]    = useState(null)
  const [gameComplete,  setGameComplete]  = useState(null)
  const [gameState,     setGameState]     = useState(null)  // 'aiming'|'ball-in-hole'|...

  // Lock body scroll while in game
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const startGame = useCallback(async (selectedMode) => {
    setMode(selectedMode)

    // Small delay so canvas is mounted
    await new Promise(r => setTimeout(r, 100))

    const eng = await createMiniGolf(canvasRef.current, {
      mode: selectedMode,

      onPowerChange(p) { setPower(p) },

      onDirLineChange(d) { setDirLine(d) },

      onStateChanged({ state, player, hole, par }) {
        setGameState(state)
        setHud(prev => ({
          ...prev,
          hole:          hole ?? prev.hole,
          par:           par  ?? prev.par,
          currentPlayer: player?.id ?? prev.currentPlayer,
        }))
      },

      onShotCountChanged({ player }) {
        setHud(prev => ({
          ...prev,
          players: prev.players.map(p =>
            p.id === player.id ? { ...p, shots: player.shots } : p
          ),
        }))
      },

      onHoleComplete(data) {
        setHoleResult(data)
        setHud(prev => ({ ...prev, players: data.scores.map(s => ({ ...s.player, shots: s.shots })) }))
      },

      onGameComplete(data) {
        setGameComplete(data)
        setHoleResult(null)
      },
    })

    engineRef.current = eng

    // Hydrate HUD with initial player info
    setHud({
      hole: 0,
      par:  2,
      players:       eng.players.map(p => ({ ...p, shots: 0 })),
      currentPlayer: 0,
    })
  }, [])

  function handleNext() {
    setHoleResult(null)
    engineRef.current?.goNextHole()
  }

  function handleBack() {
    engineRef.current?.destroy()
    engineRef.current = null
    onBack()
  }

  if (!mode) return <ModeSelect onSelect={startGame} onBack={onBack} />

  if (gameComplete) return <EndScreen players={gameComplete.players} onBack={handleBack} />

  return (
    <div className="mg-wrapper">
      <canvas ref={canvasRef} className="mg-canvas" />

      {hud.players.length > 0 && (
        <HUD
          hole={hud.hole}
          par={hud.par}
          players={hud.players}
          currentPlayer={hud.currentPlayer}
        />
      )}

      {power > 0.01 && <PowerBar power={power} />}

      {dirLine && <DirLine data={dirLine} />}

      {holeResult && (
        <HoleComplete
          data={holeResult}
          onNext={handleNext}
          isLast={holeResult.hole >= HOLES.length - 1}
        />
      )}

      {!holeResult && (
        <div className="mg-hint">
          {gameState === 'aiming'
            ? (hud.currentPlayer === 1 && mode === 'vs-ai'
              ? '🤖 Computer is aan het schieten...'
              : '🖱️ Sleep terug om te schieten')
            : '⏳ Bal rolt...'}
        </div>
      )}
    </div>
  )
}
