import { useState } from 'react'
import './App.css'
import Wardrobe        from './Wardrobe'
import Shop            from './Shop'
import GameMenu        from './GameMenu'
import RocketGame      from './games/RocketGame'
import PaintballGame   from './games/PaintballGame'
import KartGame        from './games/KartGame'
import BotsenGame      from './games/BotsenGame'
import { allUnlockedMap } from './itemsCatalog'
import { COUNTRIES, DEFAULT_UNLOCKED } from './games/countries'

const CODES = { pabo: 100000 }
const BRIEF_CODES = { start: 800 }   // eenmalige briefgeld-codes
const UNLOCK_ALL_CODE = 'joop'
const UNLOCK_COUNTRIES_CODE = 'frans'   // ontgrendelt alle Supervoetbal-landen
const UNLOCK_SOMALIA_CODE = '124'       // ontgrendelt direct Somalië in Supervoetbal
const UNLOCK_TARA_CODE = 'tara'         // ontgrendelt de Tara Pet
const UNLOCK_NINA_CODE = 'nina'         // ontgrendelt de Nina Pet
const UNLOCK_PIM_CODE = 'pim'           // ontgrendelt de Pim Pet
const UNLOCK_VINN_CODE = 'vinn'         // ontgrendelt de Vinn Pet
const ESCAPE_CODE = 'vrijdag'           // opent de GLITCH-escaperoom

function fmt(n) { return n.toLocaleString('nl-NL') }

function CurrencyBadge({ munten, briefgeld, hideMunten }) {
  return (
    <div className="currency-badges">
      {!hideMunten && (
        <div className="curuntie-badge">
          <span className="curuntie-icon">🪙</span>
          <span className="curuntie-amount">{fmt(munten)}</span>
        </div>
      )}
      <div className="curuntie-badge briefgeld-badge">
        <span className="curuntie-icon">💵</span>
        <span className="curuntie-amount briefgeld-amount">{fmt(briefgeld)}</span>
      </div>
    </div>
  )
}

function CodeModal({ onClose, onRedeem, onRedeemBrief, onUnlockAll, onUnlockCountries, onUnlockSomalia, onUnlockTara, onUnlockNina, onUnlockPim, onUnlockVinn, onEscape, usedCodes }) {
  const [code, setCode] = useState('')
  const [msg,  setMsg]  = useState(null)
  const [ok,   setOk]   = useState(false)

  const submit = () => {
    const key = code.trim().toLowerCase()
    if (key === ESCAPE_CODE) {
      onEscape()
    } else if (key === UNLOCK_ALL_CODE) {
      onUnlockAll()
      setMsg('🎉 Alle kleding ontgrendeld!')
      setOk(true)
    } else if (key === UNLOCK_COUNTRIES_CODE) {
      onUnlockCountries()
      setMsg('🎉 Alle Supervoetbal-landen ontgrendeld!')
      setOk(true)
    } else if (key === UNLOCK_SOMALIA_CODE) {
      onUnlockSomalia()
      setMsg('⭐ Somalië ontgrendeld in Supervoetbal!')
      setOk(true)
    } else if (key === UNLOCK_TARA_CODE) {
      onUnlockTara()
      setMsg('🌈 Tara Pet ontgrendeld!')
      setOk(true)
    } else if (key === UNLOCK_NINA_CODE) {
      onUnlockNina()
      setMsg('💖 Nina Pet ontgrendeld!')
      setOk(true)
    } else if (key === UNLOCK_PIM_CODE) {
      onUnlockPim()
      setMsg('🧢 Pim Pet ontgrendeld!')
      setOk(true)
    } else if (key === UNLOCK_VINN_CODE) {
      onUnlockVinn()
      setMsg('🧢 Vinn Pet ontgrendeld!')
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

  // "124" code → ontgrendel direct Somalië in Head Soccer
  const unlockSomalia = () => {
    let current
    try {
      const v = JSON.parse(localStorage.getItem('kk_hs_unlocked'))
      current = Array.isArray(v) && v.length ? v : [...DEFAULT_UNLOCKED]
    } catch { current = [...DEFAULT_UNLOCKED] }
    if (!current.includes('so')) current.push('so')
    localStorage.setItem('kk_hs_unlocked', JSON.stringify(current))
  }

  // "tara" code → ontgrendel de Tara Pet
  const unlockTara = () => unlockColor('hoofd', 'pettara')

  // "nina" code → ontgrendel de Nina Pet
  const unlockNina = () => unlockColor('hoofd', 'petnina')

  // "pim" code → ontgrendel de Pim Pet
  const unlockPim = () => unlockColor('hoofd', 'petpim')

  // "vinn" code → ontgrendel de Vinn Pet
  const unlockVinn = () => unlockColor('hoofd', 'petvinn')

  // Re-read the wallet from localStorage (games update it directly) so the
  // home badge always matches — call when returning to a React screen.
  const refreshWallet = () => {
    try { setCuruntie(parseInt(localStorage.getItem('kk_curuntie') || '0', 10)) } catch {}
    try { setBriefgeld(parseInt(localStorage.getItem('kk_briefgeld') || '0', 10)) } catch {}
  }
  const goMenu = () => { refreshWallet(); setScreen('menu') }

  if (screen === 'game') return (
    <>
      <CurrencyBadge munten={curuntie} briefgeld={briefgeld} hideMunten />
      <GameMenu onBack={goMenu} addCuruntie={addCuruntie} addBriefgeld={addBriefgeld} />
    </>
  )

  if (screen === 'wardrobe') return (
    <>
      <CurrencyBadge munten={curuntie} briefgeld={briefgeld} hideMunten />
      <Wardrobe
        onBack={goMenu}
        onPlayRocket={() => setScreen('rocket')}
        onPlayPaintball={() => setScreen('paintball')}
        onPlayKart={() => setScreen('kart')}
        onPlayBotsen={() => setScreen('botsen')}
        onGoShop={() => setScreen('shop')}
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

  if (screen === 'botsen') return (
    <BotsenGame onBack={() => setScreen('wardrobe')} />
  )

  if (screen === 'paintball') return (
    <PaintballGame onBack={() => setScreen('wardrobe')} />
  )

  if (screen === 'escaperoom') return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0e14' }}>
      <iframe
        src="/escaperoom.html"
        title="GLITCH Escaperoom"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
      <button
        onClick={goMenu}
        style={{ position: 'fixed', left: 12, top: 12, zIndex: 100, padding: '8px 14px',
          borderRadius: 10, border: '1px solid #1d2a38', background: '#0f1620',
          color: '#cfe3ef', fontWeight: 700, cursor: 'pointer' }}
      >
        ← Terug
      </button>
    </div>
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
        {['🚀','⭐','🎮','✏️','🔢','📚','🏆','🎨','🧮','🌟','🎈','🪁'].map((e, i) => (
          <span key={i} className={`floaty floaty-${i + 1}`}>{e}</span>
        ))}
      </div>

      <div className="hero">
        <div className="logo-wrap">
          <img className="logo-img" src="/logo-rond.png" alt="Kenniskist" />
        </div>
        <p className="hero-sub">✨ Leren terwijl je speelt ✨</p>
      </div>

      <div className="menu">
        <button className="menu-btn btn-game" onClick={() => setScreen('game')}>
          <div className="btn-scene"><img className="scene-img" src="/scenes/game.png" alt="" /></div>
          <div className="btn-text">
            <span className="btn-label">🎮 Speel Game</span>
            <span className="btn-desc">Oefen rekenen, taal, spelling & meer — verdien 🪙 en 💵</span>
            <span className="btn-examples">⚽ Voetbal · 🥅 Supervoetbal · 🚀 Jetpack · 🌉 Brug Bouwen · 🏰 Tower Defense</span>
          </div>
          <span className="btn-arrow">→</span>
        </button>

        <button className="menu-btn btn-wardrobe" onClick={() => setScreen('wardrobe')}>
          <div className="btn-scene"><img className="scene-img" src="/scenes/kledingkast.png" alt="" /></div>
          <div className="btn-text">
            <span className="btn-label">👗 Kledingkast</span>
            <span className="btn-desc">Pas je poppetje aan in 3D</span>
            <span className="btn-examples">🏎️ Racen · 🎯 Paintball · 💥 Botsen · ⚽ Voetbal</span>
          </div>
          <span className="btn-arrow">→</span>
        </button>

        <button className="menu-btn btn-shop" onClick={() => setScreen('shop')}>
          <div className="btn-scene"><img className="scene-img" src="/scenes/winkel.png" alt="" /></div>
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
          onUnlockSomalia={unlockSomalia}
          onUnlockTara={unlockTara}
          onUnlockNina={unlockNina}
          onUnlockPim={unlockPim}
          onUnlockVinn={unlockVinn}
          onEscape={() => { setShowCode(false); setScreen('escaperoom') }}
          usedCodes={usedCodes}
        />
      )}
    </div>
  )
}
