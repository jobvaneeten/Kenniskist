import { useState, useEffect } from 'react'
import FootballGame from './FootballGame'
import HeadSoccer from './HeadSoccer'
import TowerDefenseGame from './TowerDefenseGame'
import BrugBouwen from './BrugBouwen'
import './spel-beloning.css'

// ── Gedeeld beloning-systeem: na 5 goede antwoorden mag je 1 van de 6 games
// spelen (in "reward-modus": één potje/ronde/level, dan automatisch terug).
// Wordt overal gebruikt (sommen, woorden, begrijpend lezen, spelling, …).

function IframeEmbed({ src, title, doneType, hint, onDone }) {
  useEffect(() => {
    const h = (e) => { if (e.data?.type === doneType) setTimeout(onDone, 1800) }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [onDone, doneType])
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000', display: 'flex', flexDirection: 'column' }}>
      <button className="sb-game-back" onClick={onDone}>← Klaar</button>
      <iframe src={src} title={title} allow="autoplay" style={{ flex: 1, border: 'none' }} />
      <div style={{ textAlign: 'center', color: '#aaa', padding: '8px', fontSize: '0.85rem' }}>{hint}</div>
    </div>
  )
}

const SPELLEN = [
  { key: 'headsoccer', emoji: '🥅', name: 'Head Soccer',   desc: 'Speel een ronde van het toernooi' },
  { key: 'voetbal',    emoji: '⚽', name: '1v1 Voetbal',    desc: 'Jij tegen de computer' },
  { key: 'jetpack',    emoji: '🚀', name: 'Jetpack',        desc: 'Vlieg zo ver mogelijk!' },
  { key: 'astro',      emoji: '🪐', name: 'Astro Katapult', desc: 'Speel 1 level' },
  { key: 'space',      emoji: '🛸', name: 'Spacerunner',    desc: 'Vlieg door de ruimte!' },
  { key: 'tower',      emoji: '🏰', name: 'Tower Defense',  desc: 'Verdedig je toren!' },
  { key: 'brug',       emoji: '🌉', name: 'Brug Bouwen',    desc: 'Bouw 3 bruggen' },
]

export default function SpelBeloning({ title, sub, geld, addCuruntie, onDone }) {
  const [picked, setPicked] = useState(null)
  // Briefgeld wordt door de ouder-component uitgekeerd (via onDone); hier kies
  // je alleen het spel. Elk spel speelt één potje/ronde/level en gaat dan terug.
  // Wrapper = vast scherm-vullend overlay zodat het spel altijd bovenop het
  // (nog gemounte) oefenscherm valt en kliks goed opvangt.
  const wrap = (el) => <div className="sb-gamewrap">{el}</div>
  if (picked === 'headsoccer') return wrap(<HeadSoccer reward onBack={onDone} addCuruntie={addCuruntie} />)
  if (picked === 'voetbal')    return wrap(<FootballGame noQuiz twoPlayer={false} onBack={onDone} addCuruntie={addCuruntie} />)
  if (picked === 'jetpack')    return <IframeEmbed src="/jetpack/index.html" title="Jetpack" doneType="jetpack-gameover" hint="Je gaat automatisch verder na het spel ✈️" onDone={onDone} />
  if (picked === 'astro')      return <IframeEmbed src="/astrokatapult/?reward=1" title="Astro Katapult" doneType="astrokatapult-leveldone" hint="Speel 1 level — daarna ga je verder 🪐" onDone={onDone} />
  if (picked === 'space')      return <IframeEmbed src="/sterrenstroom/" title="Spacerunner" doneType="spacerunner-gameover" hint="Je gaat automatisch verder na het spel 🛸" onDone={onDone} />
  if (picked === 'tower')      return wrap(<TowerDefenseGame onBack={onDone} />)
  if (picked === 'brug')       return wrap(<BrugBouwen reward onBack={onDone} />)

  return (
    <div className="sb-screen">
      <div className="sb-star">🎉</div>
      <h2 className="sb-title">{title || 'Goed gedaan!'}</h2>
      {sub && <p className="sb-line">{sub}</p>}
      {geld != null && <p className="sb-geld">+{geld} briefgeld verdiend! 💵</p>}
      <p className="sb-sub">Kies een spel als beloning</p>
      <div className="sb-grid">
        {SPELLEN.map(g => (
          <button key={g.key} className="sb-card" onClick={() => setPicked(g.key)}>
            <span className="sb-emoji">{g.emoji}</span>
            <span className="sb-name">{g.name}</span>
            <span className="sb-desc">{g.desc}</span>
          </button>
        ))}
      </div>
      <button className="sb-skip" onClick={onDone}>Sla over →</button>
    </div>
  )
}
