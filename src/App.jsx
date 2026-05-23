import { useState } from 'react'
import './App.css'
import Wardrobe  from './Wardrobe'
import Shop      from './Shop'
import GameMenu  from './GameMenu'

const CODES = { pabo: 100000 }

function fmt(n) { return n.toLocaleString('nl-NL') }

function CuruntieBadge({ amount }) {
  return (
    <div className="curuntie-badge">
      <span className="curuntie-icon">🪙</span>
      <span className="curuntie-amount">{fmt(amount)}</span>
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
      <CuruntieBadge amount={curuntie} />
      <GameMenu onBack={() => setScreen('menu')} addCuruntie={addCuruntie} />
    </>
  )

  if (screen === 'wardrobe') return (
    <>
      <CuruntieBadge amount={curuntie} />
      <Wardrobe
        onBack={() => setScreen('menu')}
        unlockedColors={unlockedColors}
      />
    </>
  )

  if (screen === 'shop') return (
    <>
      <CuruntieBadge amount={curuntie} />
      <Shop
        curuntie={curuntie}
        addCuruntie={addCuruntie}
        unlockedColors={unlockedColors}
        onUnlock={unlockColor}
        onBack={() => setScreen('menu')}
      />
    </>
  )

  return (
    <div className="screen">
      <CuruntieBadge amount={curuntie} />

      <div className="logo-wrap">
        <span className="logo-icon">🗃️</span>
        <h1 className="logo-title">Kennis<span className="accent">kist</span></h1>
      </div>

      <div className="menu">
        <button className="menu-btn btn-game" onClick={() => setScreen('game')}>
          <span className="btn-icon">🎮</span>
          <span className="btn-label">Speel Game</span>
        </button>

        <button className="menu-btn btn-wardrobe" onClick={() => setScreen('wardrobe')}>
          <span className="btn-icon">👗</span>
          <span className="btn-label">Kledingkast</span>
        </button>

        <button className="menu-btn btn-shop" onClick={() => setScreen('shop')}>
          <span className="btn-icon">🛒</span>
          <span className="btn-label">Winkel</span>
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
