import { useState } from 'react'
import './App.css'
import Wardrobe        from './Wardrobe'
import Shop            from './Shop'
import GameMenu        from './GameMenu'
import FootballScene3D from './games/FootballScene3D'
import Football3v3     from './games/Football3v3'
import RocketGame      from './games/RocketGame'

const CODES = { pabo: 100000 }

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

function CodeModal({ onClose, onRedeem }) {
  const [code, setCode] = useState('')
  const [msg,  setMsg]  = useState(null)
  const [ok,   setOk]   = useState(false)

  const submit = () => {
    const key = code.trim().toLowerCase()
    if (CODES[key] !== undefined) {
      onRedeem(key, CODES[key])
      setMsg(`+${fmt(CODES[key])} curuntie!`)
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

  // Exchange in the shop: 1000 munten → 100 briefgeld
  const exchangeCoins = () => {
    setCuruntie(prev => {
      if (prev < 1000) return prev
      const next = prev - 1000
      localStorage.setItem('kk_curuntie', String(next))
      addBriefgeld(100)
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

  const unlockColor = (itemKey, colorKey) => {
    setUnlockedColors(prev => {
      const already = prev[itemKey] || []
      if (already.includes(colorKey)) return prev
      const next = { ...prev, [itemKey]: [...already, colorKey] }
      localStorage.setItem('kk_unlocked', JSON.stringify(next))
      return next
    })
  }

  if (screen === 'game') return (
    <>
      <CurrencyBadge munten={curuntie} briefgeld={briefgeld} />
      <GameMenu onBack={() => setScreen('menu')} addCuruntie={addCuruntie} />
    </>
  )

  if (screen === 'wardrobe') return (
    <>
      <CurrencyBadge munten={curuntie} briefgeld={briefgeld} />
      <Wardrobe
        onBack={() => setScreen('menu')}
        onPlay3D={() => setScreen('football3d')}
        onPlayRocket={() => setScreen('rocket')}
        unlockedColors={unlockedColors}
      />
    </>
  )

  if (screen === 'football3d') return (
    <FootballScene3D onBack={() => setScreen('menu')} onPlay3v3={() => setScreen('football3v3')} />
  )

  if (screen === 'football3v3') return (
    <Football3v3 onBack={() => setScreen('menu')} />
  )

  if (screen === 'rocket') return (
    <RocketGame onBack={() => setScreen('wardrobe')} />
  )

  if (screen === 'shop') return (
    <>
      <CurrencyBadge munten={curuntie} briefgeld={briefgeld} />
      <Shop
        curuntie={curuntie}
        briefgeld={briefgeld}
        addBriefgeld={addBriefgeld}
        onExchange={exchangeCoins}
        unlockedColors={unlockedColors}
        onUnlock={unlockColor}
        onBack={() => setScreen('menu')}
      />
    </>
  )

  return (
    <div className="screen">
      <CurrencyBadge munten={curuntie} briefgeld={briefgeld} />

      <div className="hero">
        <div className="logo-wrap">
          <span className="logo-icon">🗃️</span>
          <h1 className="logo-title">Kennis<span className="accent">kist</span></h1>
        </div>
        <p className="hero-sub">Leren terwijl je speelt 🚀</p>
      </div>

      <div className="menu">
        <button className="menu-btn btn-game" onClick={() => setScreen('game')}>
          <span className="btn-icon">🎮</span>
          <div className="btn-text">
            <span className="btn-label">Speel Game</span>
            <span className="btn-desc">Oefen rekenen en taal</span>
          </div>
          <span className="btn-arrow">→</span>
        </button>

        <button className="menu-btn btn-wardrobe" onClick={() => setScreen('wardrobe')}>
          <span className="btn-icon">👗</span>
          <div className="btn-text">
            <span className="btn-label">Kledingkast</span>
            <span className="btn-desc">Pas je poppetje aan</span>
          </div>
          <span className="btn-arrow">→</span>
        </button>

        <button className="menu-btn btn-shop" onClick={() => setScreen('shop')}>
          <span className="btn-icon">🛒</span>
          <div className="btn-text">
            <span className="btn-label">Winkel</span>
            <span className="btn-desc">Koop nieuwe kleding</span>
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
        />
      )}
    </div>
  )
}
