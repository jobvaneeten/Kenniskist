import { useState } from 'react'
import './App.css'
import Wardrobe        from './Wardrobe'
import Shop            from './Shop'
import GameMenu        from './GameMenu'
import RocketGame      from './games/RocketGame'
import PaintballGame   from './games/PaintballGame'
import KartGame        from './games/KartGame'
import MenuScene       from './MenuScenes'
import { allUnlockedMap } from './itemsCatalog'
import { COUNTRIES } from './games/countries'

const CODES = { pabo: 100000 }
const BRIEF_CODES = { start: 800 }   // eenmalige briefgeld-codes
const UNLOCK_ALL_CODE = 'joop'
const UNLOCK_COUNTRIES_CODE = 'frans'   // ontgrendelt alle Head Soccer-landen

function fmt(n) { return n.toLocaleString('nl-NL') }

function CurrencyBadge({ munten, briefgeld }) {
  return (
    <div className="currency-badges">
      <div className="curuntie-badge">
        <span className="curuntie-icon">🪙</span>
        <span className="curuntie-amount">{fmt(munten)}</span>
      </div>
      <div className="curuntie-badge briefgeld-badge">
        <span className="curuntie-icon">💵</span>
        <span className="curuntie-amount briefgeld-amount">{fmt(briefgeld)}</span>
      </div>
    </div>
  )
}

function CodeModal({ onClose, onRedeem, onRedeemBrief, onUnlockAll, onUnlockCountries, usedCodes }) {
  const [code, setCode] = useState('')
  const [msg,  setMsg]  = useState(null)
  const [ok,   setOk]   = useState(false)

  const submit = () => {
    const key = code.trim().toLowerCase()
    if (key === UNLOCK_ALL_CODE) {
      onUnlockAll()
      setMsg('🎉 Alle kleding ontgrendeld!')
      setOk(true)
    } else if (key === UNLOCK_COUNTRIES_CODE) {
      onUnlockCountries()
      setMsg('🎉 Alle Head Soccer-landen ontgrendeld!')
      setOk(true)
    } else if (BRIEF_CODES[key] !== undefined) {
      if (usedCodes.includes(key)) {
        setMsg('Deze code is al gebruikt.')
        setOk(false)
      } else {
        onRedeemBrief(key, BRIEF_CODES[key])
        setMsg(`+${fmt(BRIEF_CODES[key])} briefgeld! 💵`)
        setOk(true)
      }
    } else if (CODES[key] !== undefined) {
      onRedeem(key, CODES[key])
      setMsg(`+${fmt(CODES[key])} munten!`)
      setOk(true)
    } else {
      setMsg('Ongeldige code.')
      setOk(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Code invoeren</h2>
        <input
          className="modal-input"
          placeholder="Typ hier je code..."
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          autoFocus
        />
        {msg && <p className={`modal-msg ${ok ? 'modal-msg-ok' : 'modal-msg-err'}`}>{msg}</p>}
        <div className="modal-actions">
          <button className="modal-btn modal-btn-confirm" onClick={submit}>Activeren</button>
          <button className="modal-btn modal-btn-cancel"  onClick={onClose}>Sluiten</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState('menu')

  const [curuntie, setCuruntie] = useState(() => {
    try { return parseInt(localStorage.getItem('kk_curuntie') || '0', 10) } catch { return 0 }
  })
  const [briefgeld, setBriefgeld] = useState(() => {
    try { return parseInt(localStorage.getItem('kk_briefgeld') || '0', 10) } catch { return 0 }
  })
  const [usedCodes, setUsedCodes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kk_used_codes') || '[]') } catch { return [] }
  })
  const [unlockedColors, setUnlockedColors] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kk_unlocked') || '{}') } catch { return {} }
  })
  const [showCode, setShowCode] = useState(false)

  const addCuruntie = (amount) => {
    setCuruntie(prev => {
      const next = prev + amount
      localStorage.setItem('kk_curuntie', String(next))
      return next
    })
  }

  const addBriefgeld = (amount) => {
    setBriefgeld(prev => {
      const next = prev + amount
      localStorage.setItem('kk_briefgeld', String(next))
      return next
    })
  }

  const redeemCode = (key, amount) => {
    if (usedCodes.includes(key)) return
    addCuruntie(amount)
    const next = [...usedCodes, key]
    setUsedCodes(next)
    localStorage.setItem('kk_used_codes', JSON.stringify(next))
  }

  const redeemBriefCode = (key, amount) => {
    if (usedCodes.includes(key)) return
    addBriefgeld(amount)
    const next = [...usedCodes, key]
    setUsedCodes(next)
    localStorage.setItem('kk_used_codes', JSON.stringify(next))
  }

  const unlockColor = (itemKey, colorKey) => {
    setUnlockedColors(prev => {
      const already = prev[itemKey] || []
      if (already.includes(colorKey)) return prev
      const next = { ...prev, [itemKey]: [...already, colorKey] }
      localStorage.setItem('kk_unlocked', JSON.stringify(next))
      return next
    })
  }

  // "joop" code → unlock every clothing item
  const unlockAll = () => {
    const all = allUnlockedMap()
    localStorage.setItem('kk_unlocked', JSON.stringify(all))
    setUnlockedColors(all)
  }

  // "frans" code → ontgrendel alle Head Soccer-landen
  const unlockCountries = () => {
    localStorage.setItem('kk_hs_unlocked', JSON.stringify(COUNTRIES.map(c => c.key)))
  }

  // Re-read the wallet from localStorage (games update it directly) so the
  // home badge always matches — call when returning to a React screen.
  const refreshWallet = () => {
    try { setCuruntie(parseInt(localStorage.getItem('kk_curuntie') || '0', 10)) } catch {}
    try { setBriefgeld(parseInt(localStorage.getItem('kk_briefgeld') || '0', 10)) } catch {}
  }
  const goMenu = () => { refreshWallet(); setScreen('menu') }

  if (screen === 'game') return (
    <>
      <CurrencyBadge munten={curuntie} briefgeld={briefgeld} />
      <GameMenu onBack={goMenu} addCuruntie={addCuruntie} addBriefgeld={addBriefgeld} />
    </>
  )

  if (screen === 'wardrobe') return (
    <>
      <CurrencyBadge munten={curuntie} briefgeld={briefgeld} />
      <Wardrobe
        onBack={goMenu}
        onPlayRocket={() => setScreen('rocket')}
        onPlayPaintball={() => setScreen('paintball')}
        onPlayKart={() => setScreen('kart')}
        unlockedColors={unlockedColors}
      />
    </>
  )

  if (screen === 'rocket') return (
    <RocketGame onBack={() => setScreen('wardrobe')} />
  )

  if (screen === 'kart') return (
    <KartGame onBack={() => setScreen('wardrobe')} />
  )

  if (screen === 'paintball') return (
    <PaintballGame onBack={() => setScreen('wardrobe')} />
  )

  if (screen === 'shop') return (
    <>
      <CurrencyBadge munten={curuntie} briefgeld={briefgeld} />
      <Shop
        curuntie={curuntie}
        briefgeld={briefgeld}
        addBriefgeld={addBriefgeld}
        unlockedColors={unlockedColors}
        onUnlock={unlockColor}
        onBack={goMenu}
      />
    </>
  )

  return (
    <div className="screen">
      {/* Spectaculaire achtergrond-lagen */}
      <div className="bg-orbs" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
        <span className="orb orb-4" />
      </div>
      <div className="floaties" aria-hidden="true">
        {['🚀','⭐','🎮','✏️','🔢','📚','🏆','🎨'].map((e, i) => (
          <span key={i} className={`floaty floaty-${i + 1}`}>{e}</span>
        ))}
      </div>

      <CurrencyBadge munten={curuntie} briefgeld={briefgeld} />

      <div className="hero">
        <div className="logo-wrap">
          <span className="logo-icon">🗃️</span>
          <h1 className="logo-title">Kennis<span className="accent">kist</span></h1>
        </div>
        <p className="hero-sub">✨ Leren terwijl je speelt ✨</p>
      </div>

      <div className="menu">
        <button className="menu-btn btn-game" onClick={() => setScreen('game')}>
          <div className="btn-scene"><MenuScene name="game" /></div>
          <div className="btn-text">
            <span className="btn-label">🎮 Speel Game</span>
            <span className="btn-desc">Oefen rekenen, taal & spelling — verdien 🪙 en 💵</span>
            <span className="btn-examples">⚽ Voetbal · 🏰 Tower Defense · 🚀 Jetpack · 🪐 Astro</span>
          </div>
          <span className="btn-arrow">→</span>
        </button>

        <button className="menu-btn btn-wardrobe" onClick={() => setScreen('wardrobe')}>
          <div className="btn-scene"><MenuScene name="wardrobe" /></div>
          <div className="btn-text">
            <span className="btn-label">👗 Kledingkast</span>
            <span className="btn-desc">Pas je poppetje aan in 3D</span>
            <span className="btn-examples">🏎️ Kart · 🎯 Paintball · 🚀 Raket spelen</span>
          </div>
          <span className="btn-arrow">→</span>
        </button>

        <button className="menu-btn btn-shop" onClick={() => setScreen('shop')}>
          <div className="btn-scene"><MenuScene name="shop" /></div>
          <div className="btn-text">
            <span className="btn-label">🛒 Winkel</span>
            <span className="btn-desc">Koop nieuwe kleding met je 🪙 munten en 💵 briefgeld</span>
            <span className="btn-examples">👕 Shirts · 👟 Schoenen · 🕶️ Accessoires</span>
          </div>
          <span className="btn-arrow">→</span>
        </button>
      </div>

      <button className="code-btn" onClick={() => setShowCode(true)}>
        🎟️ Code invoeren
      </button>

      {showCode && (
        <CodeModal
          onClose={() => setShowCode(false)}
          onRedeem={(key, amount) => redeemCode(key, amount)}
          onRedeemBrief={(key, amount) => redeemBriefCode(key, amount)}
          onUnlockAll={unlockAll}
          onUnlockCountries={unlockCountries}
          usedCodes={usedCodes}
        />
      )}
    </div>
  )
}
