import { useState, useEffect, useRef } from 'react'
import FootballGame, { loadToernooi } from './FootballGame'
import HeadSoccer from './HeadSoccer'
import TowerDefenseGame from './TowerDefenseGame'
import BrugBouwen from './BrugBouwen'
import HillClimbGame from './HillClimbGame'
import './spel-beloning.css'

// ── Gedeeld beloning-systeem: na 5 goede antwoorden mag je één van de games
// spelen (in "reward-modus": één potje/ronde/level, dan automatisch terug).
// Wordt overal gebruikt (sommen, woorden, begrijpend lezen, spelling, …).

// `seconds` zet een aftelklok: spellen zonder duidelijk einde (zoals het
// idle-spel Dier Evolutie) gaan daarmee na de afgesproken tijd vanzelf terug
// naar de oefening.
function IframeEmbed({ src, title, doneType, hint, onDone, seconds }) {
  const [over, setOver] = useState(seconds ?? null)
  const doneRef = useRef(false)
  const finish = useRef(onDone)
  finish.current = onDone

  useEffect(() => {
    const h = (e) => {
      if (e.data?.type === doneType && !doneRef.current) {
        doneRef.current = true
        setTimeout(() => finish.current?.(), 1800)
      }
    }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [doneType])

  useEffect(() => {
    if (!seconds) return
    const id = setInterval(() => {
      setOver(s => {
        if (s <= 1) {
          clearInterval(id)
          if (!doneRef.current) { doneRef.current = true; setTimeout(() => finish.current?.(), 900) }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [seconds])

  const mmss = over == null ? null
    : `${Math.floor(over / 60)}:${String(over % 60).padStart(2, '0')}`
  const urgent = over != null && over <= 10

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000', display: 'flex', flexDirection: 'column' }}>
      <button className="sb-game-back" onClick={onDone}>← Klaar</button>
      {mmss && (
        <div className={`sb-timer${urgent ? ' sb-timer-urgent' : ''}`}>
          ⏱ {over === 0 ? 'Tijd voorbij!' : mmss}
        </div>
      )}
      <iframe src={src} title={title} allow="autoplay" style={{ flex: 1, border: 'none' }} />
      <div style={{ textAlign: 'center', color: '#aaa', padding: '8px', fontSize: '0.85rem' }}>{hint}</div>
    </div>
  )
}

// Standaard briefgeld per beloning (oefeningen die geen eigen bedrag hebben).
export const BRIEFGELD = 50

const SPELLEN = [
  { key: 'headsoccer', emoji: '🥅', name: 'Supervoetbal',   desc: 'Speel een ronde van het toernooi', img: '/scenes/games/headsoccer.png' },
  { key: 'voetbal',    emoji: '⚽', name: '1v1 Voetbal',    desc: 'Jij tegen de computer',            img: '/scenes/games/football.png' },
  { key: 'jetpack',    emoji: '🚀', name: 'Jetpack',        desc: 'Vlieg zo ver mogelijk!',           img: '/scenes/games/jetpack.png' },
  { key: 'astro',      emoji: '🪐', name: 'Astro Katapult', desc: 'Speel 1 level',                    img: '/scenes/games/astrokatapult.png' },
  { key: 'space',      emoji: '🛸', name: 'Spacerunner',    desc: 'Vlieg door de ruimte!',            img: '/scenes/games/sterrenstroom.png' },
  { key: 'doodle',     emoji: '🦘', name: 'Doodle Sprong',  desc: 'Spring zo hoog mogelijk!',          img: '/scenes/games/doodlesprong.png' },
  { key: 'evolutie',   emoji: '🐨', name: 'Dier Evolutie',  desc: 'Voeg dieren samen',                 img: '/scenes/games/evolutie.png' },
  { key: 'tower',      emoji: '🏰', name: 'Tower Defense',  desc: 'Verdedig je toren!',               img: '/scenes/games/towerdefense.png' },
  { key: 'brug',       emoji: '🌉', name: 'Brug Bouwen',    desc: 'Bouw 3 bruggen',                   img: '/scenes/games/brug.png' },
  { key: 'hillclimb',  emoji: '🚗', name: 'Bergrijden',     desc: 'Rij tot je crasht',                img: '/scenes/games/hillclimb.png' },
  { key: 'fruitsabel', emoji: '🍉', name: 'Fruitsabel',     desc: 'Snijd 60 seconden fruit',          img: '/scenes/games/fruitsabel.svg' },
  { key: 'stuiter',    emoji: '🧱', name: 'Stuiterballen',  desc: 'Schiet door de blokken',           img: '/scenes/games/stuiterballen.svg' },
]

export default function SpelBeloning({ title, sub, geld, addCuruntie, onDone }) {
  const [picked, setPicked] = useState(null)
  // Briefgeld wordt door de ouder-component uitgekeerd (via onDone); hier kies
  // je alleen het spel. Elk spel speelt één potje/ronde/level en gaat dan terug.
  // Wrapper = vast scherm-vullend overlay zodat het spel altijd bovenop het
  // (nog gemounte) oefenscherm valt en kliks goed opvangt.
  const wrap = (el) => <div className="sb-gamewrap">{el}</div>
  if (picked === 'headsoccer') return wrap(<HeadSoccer reward onBack={onDone} addCuruntie={addCuruntie} />)
  // rewardMode: precies één wedstrijd, dan (na de eindstand) automatisch terug.
  // initialBracket houdt het toernooi vast tussen beloningen door.
  if (picked === 'voetbal')    return wrap(<FootballGame rewardMode noQuiz initialBracket={loadToernooi()} onMatchDone={() => onDone()} onBack={onDone} addCuruntie={addCuruntie} />)
  if (picked === 'jetpack')    return <IframeEmbed src="/jetpack/index.html" title="Jetpack" doneType="jetpack-gameover" hint="Je gaat automatisch verder na het spel ✈️" onDone={onDone} />
  if (picked === 'astro')      return <IframeEmbed src="/astrokatapult/?reward=1" title="Astro Katapult" doneType="astrokatapult-leveldone" hint="Speel 1 level — daarna ga je verder 🪐" onDone={onDone} />
  if (picked === 'space')      return <IframeEmbed src="/sterrenstroom/" title="Spacerunner" doneType="spacerunner-gameover" hint="Je gaat automatisch verder na het spel 🛸" onDone={onDone} />
  if (picked === 'doodle')     return <IframeEmbed src="/doodlesprong/" title="Doodle Sprong" doneType="doodlesprong-gameover" hint="Je gaat automatisch verder na het spel 🦘" onDone={onDone} />
  // Evolutie is een idle-spel zonder eigen 'potje', dus hier bepaalt de klok het
  // einde: 1 minuut spelen en dan automatisch terug naar de oefening.
  if (picked === 'evolutie')   return <IframeEmbed src="/evolutie/" title="Dier Evolutie" doneType="evolutie-klaar" seconds={60} hint="Tik op de dieren en raap poep — na 1 minuut ga je verder 🐨" onDone={onDone} />
  if (picked === 'tower')      return wrap(<TowerDefenseGame onBack={onDone} onRoundDone={onDone} />)
  if (picked === 'brug')       return wrap(<BrugBouwen reward onBack={onDone} />)
  if (picked === 'hillclimb')  return wrap(<HillClimbGame reward onBack={onDone} />)
  // Deze twee hebben een eigen winkeltje: na het potje mag je eerst je munten
  // uitgeven en ga je met "Verder" zelf terug naar de oefening.
  if (picked === 'fruitsabel') return <IframeEmbed src="/fruitsabel/" title="Fruitsabel" doneType="fruitsabel-gameover" hint="Speel 1 potje — daarna kun je upgraden en op Verder klikken 🍉" onDone={onDone} />
  if (picked === 'stuiter')    return <IframeEmbed src="/stuiterballen/" title="Stuiterballen" doneType="stuiterballen-gameover" hint="Speel 1 potje — daarna kun je upgraden en op Verder klikken 🧱" onDone={onDone} />

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
            <img className="sb-img" src={g.img} alt="" />
            <span className="sb-name">{g.emoji} {g.name}</span>
            <span className="sb-desc">{g.desc}</span>
          </button>
        ))}
      </div>
      <button className="sb-skip" onClick={onDone}>Sla over →</button>
    </div>
  )
}
