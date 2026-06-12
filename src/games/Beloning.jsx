import { useEffect } from 'react'
import './werkwoord-spelling.css'

export const BRIEFGELD = 50   // eurobiljetten voor voetbal / tower defense / astro

// ── Jetpack embed ─────────────────────────────────────────────────────────
export function JetpackBeloning({ onDone }) {
  useEffect(() => {
    const h = (e) => { if (e.data && e.data.type === 'jetpack-gameover') setTimeout(onDone, 2200) }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [onDone])
  return (
    <div className="ws-game-wrap">
      <button className="ws-game-exit" onClick={onDone}>← Klaar</button>
      <iframe src="/jetpack/" title="Jetpack" allow="autoplay" />
      <div className="ws-game-hint">Je gaat automatisch verder na het spel ✈️</div>
    </div>
  )
}

// ── Astro Katapult embed (1 level, dan terug) ─────────────────────────────
export function AstroBeloning({ onDone }) {
  useEffect(() => {
    const h = (e) => { if (e.data && e.data.type === 'astrokatapult-leveldone') setTimeout(onDone, 1800) }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [onDone])
  return (
    <div className="ws-game-wrap">
      <button className="ws-game-exit" onClick={onDone}>← Klaar</button>
      <iframe src="/astrokatapult/?reward=1" title="Astro Katapult" allow="autoplay" />
      <div className="ws-game-hint">Speel 1 level — daarna ga je verder 🪐</div>
    </div>
  )
}

// ── Spacerunner embed ─────────────────────────────────────────────────────
export function SpacerunnerBeloning({ onDone }) {
  useEffect(() => {
    const h = (e) => { if (e.data && e.data.type === 'spacerunner-gameover') setTimeout(onDone, 1800) }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [onDone])
  return (
    <div className="ws-game-wrap">
      <button className="ws-game-exit" onClick={onDone}>← Klaar</button>
      <iframe src="/sterrenstroom/" title="Spacerunner" allow="autoplay" />
      <div className="ws-game-hint">Je gaat automatisch verder na het spel 🛸</div>
    </div>
  )
}

// ── Beloning-keuze ───────────────────────────────────────────────────────
export function BeloningKeuze({ onPick, heeftToernooi, title = '5 goed gedaan!', sub = 'Kies jouw beloning — daarna ga je verder' }) {
  return (
    <div className="ws-screen">
      <div className="ws-icon ws-bounce">🎉</div>
      <h2 className="ws-title">{title}</h2>
      <p className="ws-sub">{sub}</p>
      <div className="ws-beloning-grid">
        <button className="ws-beloning-card" onClick={() => onPick('football')}>
          <span className="ws-bc-emoji">⚽</span>
          <span className="ws-bc-name">{heeftToernooi ? 'Verder in toernooi' : 'Voetbal tegen computer'}</span>
          <span className="ws-bc-reward">+ € {BRIEFGELD} briefgeld</span>
        </button>
        <button className="ws-beloning-card" onClick={() => onPick('towerdefense')}>
          <span className="ws-bc-emoji">🏰</span>
          <span className="ws-bc-name">Tower Defense</span>
          <span className="ws-bc-reward">+ € {BRIEFGELD} briefgeld</span>
        </button>
        <button className="ws-beloning-card" onClick={() => onPick('astrokatapult')}>
          <span className="ws-bc-emoji">🪐</span>
          <span className="ws-bc-name">Astro Katapult</span>
          <span className="ws-bc-reward">+ € {BRIEFGELD} briefgeld</span>
        </button>
        <button className="ws-beloning-card" onClick={() => onPick('jetpack')}>
          <span className="ws-bc-emoji">🚀</span>
          <span className="ws-bc-name">Jetpack</span>
          <span className="ws-bc-reward">munten in het spel 🪙</span>
        </button>
        <button className="ws-beloning-card" onClick={() => onPick('spacerunner')}>
          <span className="ws-bc-emoji">🛸</span>
          <span className="ws-bc-name">Spacerunner</span>
          <span className="ws-bc-reward">munten in het spel 🪙</span>
        </button>
      </div>
    </div>
  )
}
