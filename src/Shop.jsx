import { useState, useRef, useEffect } from 'react'
import { CLOTHING_ITEMS, LOOTBOX_COST, RARITIES, CRATE_ACCENTS } from './data'
import { getCatalog, swatchStyle, swatchEmoji, swatchBadge } from './itemsCatalog'
import CrateArtwork from './CrateArtwork'
import { playTierSound, isMuted, setMuted } from './lootboxSound'
import './shop.css'

// Generic visual for any item (colour / pattern / print / model)
function ItemSwatch({ item, className = '', style, title }) {
  const emoji = swatchEmoji(item)
  const badge = swatchBadge(item)
  return (
    <div className={`item-swatch ${className}`} title={title} style={{ ...swatchStyle(item), ...style }}>
      {emoji && <span className="item-swatch-emoji">{emoji}</span>}
      {badge && <span className="item-swatch-badge">{badge}</span>}
    </div>
  )
}

const CARD_W  = 90
const CARD_GAP = 8
const SLOT_W  = CARD_W + CARD_GAP
const VISIBLE = 5
const WIN_W   = VISIBLE * CARD_W + (VISIBLE - 1) * CARD_GAP

const SPIN_MS = 5600
const quintic = t => 1 - Math.pow(1 - t, 5)

// Higher legendary/ultra chance. Effective odds also depend on how many
// items each rarity has (see rarityOdds, computed from the real pool).
const RARITY_WEIGHTS = { common: 12, rare: 10, epic: 9, legendary: 8, ultra_legendary: 5 }

// Confetti / particle colours (SHIRT_COLORS import was removed)
const CONFETTI = ['#e63946','#1d6fa4','#2d9e4f','#f4c430','#f77f00','#7b2d8b','#ffd23f','#ffffff']

function buildReel(winner, pool) {
  const reel = []
  for (let round = 0; round < 5; round++) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    reel.push(...shuffled)
  }
  const winIdx = reel.length   // index of winner card
  reel.push(winner)
  const extras = pool.filter(c => c.key !== winner.key)
  for (let i = 0; i < 4; i++) reel.push(extras[i % extras.length])
  return { cards: reel, winIdx }
}

function fmt(n) { return n.toLocaleString('nl-NL') }

// ── Reel card icon: color swatch or team logo ─────────────────────
function ReelIcon({ item }) {
  return <ItemSwatch item={item} className="lb-rc-swatch" />
}

// ── Win card icon: big swatch (colour / pattern / print / logo) ────
function WinIcon({ item, rarity }) {
  if (item.kind === 'model') {
    return (
      <div className={`lb-wc-logo-wrap lb-wl-${rarity}`}>
        <img src={item.preview} className="lb-wc-logo" alt={item.label} />
      </div>
    )
  }
  return <ItemSwatch item={item} className="lb-wc-swatch" />
}

// ── Real drop chances per rarity, computed from the actual pool ───
const RARITY_ORDER = ['common','rare','epic','legendary','ultra_legendary']
function rarityOdds(pool) {
  const weightByRarity = {}
  pool.forEach(c => { weightByRarity[c.rarity] = (weightByRarity[c.rarity] || 0) + (RARITY_WEIGHTS[c.rarity] || 0) })
  const total = Object.values(weightByRarity).reduce((s, w) => s + w, 0) || 1
  return RARITY_ORDER
    .filter(k => weightByRarity[k])
    .map(k => ({ key: k, pct: (weightByRarity[k] / total) * 100 }))
}
function fmtPct(p) {
  return p < 1 ? p.toFixed(1).replace('.', ',') : String(Math.round(p))
}

export default function Shop({ briefgeld, addBriefgeld, unlockedColors, onUnlock, onBack }) {
  const [overlay,   setOverlay]   = useState(null)
  const [boxState,  setBoxState]  = useState('idle')
  const [reelCards, setReelCards] = useState([])
  const [reelWinIdx, setReelWinIdx] = useState(40)
  const [reelX,     setReelX]     = useState(0)
  const [confetti,  setConfetti]  = useState([])
  const [fireworks, setFireworks] = useState([])
  const [showEnd,   setShowEnd]   = useState(false)
  const [muted,     setMutedState] = useState(() => isMuted())
  const [selectedKey, setSelectedKey] = useState(null)   // item key whose detail panel is open

  const rafRef    = useRef(null)
  const startRef  = useRef(null)
  const fwTimers  = useRef([])

  useEffect(() => () => {
    rafRef.current && cancelAnimationFrame(rafRef.current)
    fwTimers.current.forEach(clearTimeout)
  }, [])

  // Close the detail panel on Escape
  useEffect(() => {
    if (!selectedKey) return
    const onKey = (e) => { if (e.key === 'Escape') setSelectedKey(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedKey])

  // Confetti for epic/legendary/ultra
  useEffect(() => {
    if (overlay?.phase !== 'reveal') { setConfetti([]); return }
    const r = overlay.wonItem.rarity
    if (r === 'ultra_legendary') {
      // Ultra: massive confetti in team colors
      const tc = overlay.wonItem.teamColors || ['#ff6600','#fff']
      setConfetti(Array.from({ length: 120 }, (_, i) => ({
        id:    i,
        x:     Math.random() * 100,
        delay: Math.random() * 2.2,
        color: tc[i % tc.length],
        size:  5 + Math.random() * 9,
        shape: Math.random() > 0.5 ? 'circle' : 'rect',
      })))
    } else if (r === 'legendary') {
      setConfetti(Array.from({ length: 60 }, (_, i) => ({
        id: i, x: Math.random() * 100, delay: Math.random() * 1.4,
        color: CONFETTI[i % CONFETTI.length], size: 6 + Math.random() * 7, shape: 'circle',
      })))
    } else if (r === 'epic') {
      setConfetti(Array.from({ length: 34 }, (_, i) => ({
        id: i, x: Math.random() * 100, delay: Math.random() * 1.4,
        color: CONFETTI[i % CONFETTI.length], size: 6 + Math.random() * 7, shape: 'circle',
      })))
    }
  }, [overlay?.phase])

  // Fireworks for ultra_legendary only
  useEffect(() => {
    fwTimers.current.forEach(clearTimeout)
    fwTimers.current = []
    if (overlay?.phase !== 'reveal' || overlay?.wonItem?.rarity !== 'ultra_legendary') {
      setFireworks([])
      return
    }
    let uid = 0
    const teamColors = overlay.wonItem.teamColors || ['#ff6600', '#fff']
    const allColors  = [...teamColors, '#FFD700', '#ff4400', '#00ffcc']

    for (let wave = 0; wave < 10; wave++) {
      const t = fwTimers.current
      t.push(setTimeout(() => {
        setFireworks(prev => [
          ...prev,
          ...Array.from({ length: 14 }, () => ({
            id:    uid++,
            x:     8 + Math.random() * 84,
            y:     4 + Math.random() * 65,
            color: allColors[Math.floor(Math.random() * allColors.length)],
            size:  30 + Math.random() * 50,
            delay: Math.random() * 0.3,
          })),
        ])
      }, wave * 380))
    }
  }, [overlay?.phase])

  const getPool = (itemKey) => getCatalog(itemKey)

  const openLootbox = (item) => {
    if (briefgeld < LOOTBOX_COST) return
    setSelectedKey(null)

    const pool    = getPool(item.key)
    const already = unlockedColors[item.key] || []
    const newItems = pool.filter(c => !already.includes(c.key))
    const isDuplicate = newItems.length === 0
    const drawPool    = isDuplicate ? pool : newItems

    const bag = []
    drawPool.forEach(c => {
      const w = RARITY_WEIGHTS[c.rarity] || 10
      for (let i = 0; i < w; i++) bag.push(c)
    })
    const won = bag[Math.floor(Math.random() * bag.length)]

    if (isDuplicate) {
      // item al in bezit → volledige teruggave, niets afschrijven
    } else {
      addBriefgeld(-LOOTBOX_COST)
      onUnlock(item.key, won.key)
    }

    const { cards, winIdx } = buildReel(won, pool)
    setReelCards(cards)
    setReelWinIdx(winIdx)
    setReelX(0)
    setBoxState('idle')
    setShowEnd(false)
    setFireworks([])
    setOverlay({
      itemKey:      item.key,
      itemEmoji:    item.emoji,
      itemLabel:    item.label,
      wonItem:      won,
      isDuplicate,
      phase:        'box',
    })
  }

  const tapBox = () => {
    if (boxState !== 'idle') return
    setBoxState('shake')

    setTimeout(() => setBoxState('explode'), 580)

    setTimeout(() => {
      setBoxState('idle')
      setOverlay(o => o ? { ...o, phase: 'spin' } : null)

      const winCenter = reelWinIdx * SLOT_W + CARD_W / 2
      const targetX   = WIN_W / 2 - winCenter
      startRef.current = null
      const wonRarity  = overlay?.wonItem?.rarity

      const spin = (ts) => {
        if (!startRef.current) startRef.current = ts
        const t = Math.min((ts - startRef.current) / SPIN_MS, 1)
        setReelX(targetX * quintic(t))
        if (t < 1) {
          rafRef.current = requestAnimationFrame(spin)
        } else {
          setOverlay(o => o ? { ...o, phase: 'reveal' } : null)
          if (wonRarity && wonRarity !== 'common') playTierSound(wonRarity)
          setTimeout(() => setShowEnd(true), wonRarity === 'ultra_legendary' ? 600 : 900)
        }
      }
      rafRef.current = requestAnimationFrame(spin)
    }, 1200)
  }

  const close = () => {
    rafRef.current && cancelAnimationFrame(rafRef.current)
    fwTimers.current.forEach(clearTimeout)
    setOverlay(null)
    setConfetti([])
    setFireworks([])
    setShowEnd(false)
  }

  return (
    <div className="shop-screen">
      <div className="shop-nebula" />
      <div className="shop-starfield">
        {Array.from({ length: 26 }, (_, i) => (
          <span key={i} className="shop-star" style={{
            left: `${(i * 37 + 5) % 100}%`,
            top: `${(i * 53 + 7) % 100}%`,
            width: `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
            animationDelay: `${(i * 0.37) % 4}s`,
            animationDuration: `${3 + (i % 4)}s`,
            '--o': 0.15 + (i % 5) * 0.08,
          }} />
        ))}
        <span className="shop-shootingstar" style={{ left: '75%', top: '12%', animationDelay: '0s' }} />
        <span className="shop-shootingstar" style={{ left: '30%', top: '55%', animationDelay: '3.2s' }} />
      </div>
      <button className="back-btn" onClick={onBack}>← Terug</button>
      <button
        className="mute-btn"
        onClick={() => { const next = !muted; setMuted(next); setMutedState(next) }}
        title={muted ? 'Geluid aan' : 'Geluid uit'}
      >
        {muted ? '🔇' : '🔊'}
      </button>
      <div className="shop-title-wrap">
        <span className="shop-title-sparkle">✦</span>
        <h2 className="shop-title">Winkel</h2>
      </div>

      <div className="shop-grid">
        {CLOTHING_ITEMS.map(item => {
          const pool      = getPool(item.key)
          const unlocked  = (unlockedColors[item.key] || []).length
          const total     = pool.length
          const { accent, icon } = CRATE_ACCENTS[item.key] || CRATE_ACCENTS.shirt
          const isSelected = selectedKey === item.key

          return (
            <div
              key={item.key}
              className={`shopcard ${isSelected ? 'shopcard-selected' : ''}`}
              style={{ '--accent': accent }}
              onClick={() => setSelectedKey(isSelected ? null : item.key)}
            >
              <div className="shopcard-shine" />
              {item.hasFeatured && <div className="shopcard-ultra-badge">ULTRA KANS</div>}
              <CrateArtwork itemKey={item.key} iconKey={icon} accent={accent} size={150} />
              <div className="shopcard-name">{item.label}</div>
              <div className="shopcard-meta">{unlocked}/{total} · 💵 {fmt(LOOTBOX_COST)}</div>
            </div>
          )
        })}
      </div>

      {/* ── Detail panel ── */}
      {selectedKey && (() => {
        const item      = CLOTHING_ITEMS.find(i => i.key === selectedKey)
        const pool      = getPool(item.key)
        const unlocked  = (unlockedColors[item.key] || []).length
        const total     = pool.length
        const allDone   = unlocked >= total
        const canAfford = briefgeld >= LOOTBOX_COST
        const odds      = rarityOdds(pool)
        const { accent, icon } = CRATE_ACCENTS[item.key] || CRATE_ACCENTS.shirt

        return (
          <>
            <div className="shop-detail-backdrop" onClick={() => setSelectedKey(null)} />
            <div className="shop-detail-panel" style={{ '--accent': accent }}>
              <button className="shop-detail-close" onClick={() => setSelectedKey(null)}>✕</button>

              <div className="shop-detail-left">
                <div className="shop-detail-rays" />
                <div className="shop-detail-crate-float">
                  <CrateArtwork itemKey={item.key} iconKey={icon} accent={accent} size={190} big />
                </div>
              </div>

              <div className="shop-detail-right">
                <div className="shop-detail-title-row">
                  <h3 className="shop-detail-title">{item.label} lootbox</h3>
                  {item.hasFeatured && <span className="shopcard-ultra-badge shop-detail-ultra-badge">ULTRA KANS</span>}
                </div>
                <p className="shop-detail-sub">Open en win een nieuwe kleur — of iets legendarisch!</p>

                <div className="shop-detail-oddsbar">
                  {odds.map(o => (
                    <div key={o.key} className="shop-detail-odds-seg" style={{ width: `${o.pct}%`, '--tc': RARITIES[o.key].color }} />
                  ))}
                </div>
                <div className="shop-detail-pills">
                  {odds.map(o => (
                    <span key={o.key} className="shop-detail-pill" style={{ '--tc': RARITIES[o.key].color }}>
                      {RARITIES[o.key].label} · {fmtPct(o.pct)}%
                    </span>
                  ))}
                </div>

                <div className="shop-detail-collection-head">
                  COLLECTIE · <b style={{ color: accent }}>{unlocked}/{total}</b> GEWONNEN
                </div>
                <div className="shop-detail-grid">
                  {pool.map(c => {
                    const owned = (unlockedColors[item.key] || []).includes(c.key)
                    return owned ? (
                      <div
                        key={c.key}
                        className="shop-marble"
                        title={c.label}
                        style={{ ...swatchStyle(c), '--rc': RARITIES[c.rarity].color }}
                      >
                        {swatchEmoji(c) && <span className="item-swatch-emoji">{swatchEmoji(c)}</span>}
                      </div>
                    ) : (
                      <div key={c.key} className="shop-marble shop-marble-locked" title="Nog niet gewonnen" />
                    )
                  })}
                </div>

                <button
                  className={`shop-detail-open-btn ${allDone ? 'lb-btn-done' : !canAfford ? 'lb-btn-broke' : ''}`}
                  onClick={() => openLootbox(item)}
                  disabled={allDone || !canAfford}
                >
                  {allDone ? '✓ Compleet!' : !canAfford ? 'Te weinig 💵' : `💵 ${fmt(LOOTBOX_COST)} · Openen`}
                </button>
              </div>
            </div>
          </>
        )
      })()}

      {/* ── Overlay ── */}
      {overlay && (() => {
        const r  = overlay.phase === 'reveal' ? overlay.wonItem.rarity : null
        const rc = r ? RARITIES[r].color : null
        const isUltra = r === 'ultra_legendary'

        return (
          <div className={`lb-overlay ${isUltra ? 'lb-overlay-ultra' : ''}`}>

            {/* Full-screen fireworks for ultra legendary */}
            {fireworks.map(fw => (
              <div
                key={fw.id}
                className="lb-firework"
                style={{
                  left:            `${fw.x}%`,
                  top:             `${fw.y}%`,
                  '--fw-color':    fw.color,
                  '--fw-size':     `${fw.size}px`,
                  animationDelay:  `${fw.delay}s`,
                }}
              />
            ))}

            <div className={`lb-modal-card ${r ? `lb-mc-${r}` : ''}`}>
              <div
                className="lb-glow-strip"
                style={rc ? { background: `linear-gradient(90deg, transparent, ${rc}cc, transparent)` } : {}}
              />

              {/* ── Phase 1: Box ── */}
              {overlay.phase === 'box' && (
                <div className="lb-box-phase">
                  <p className="lb-box-label">{overlay.itemEmoji} {overlay.itemLabel} lootbox</p>
                  <div className={`lb-open-box lb-box-${boxState}`} onClick={tapBox}>
                    <div className="lb-box-beam" />
                    <div className="lb-box-glow" />
                    {boxState === 'idle' && Array.from({ length: 6 }, (_, i) => (
                      <span key={i} className="lb-box-orbit" style={{ '--oi': i, animationDelay: `${i * 0.55}s` }}>✦</span>
                    ))}
                    <CrateArtwork
                      itemKey={overlay.itemKey}
                      iconKey={(CRATE_ACCENTS[overlay.itemKey] || CRATE_ACCENTS.shirt).icon}
                      accent="#FFD23F"
                      size={190}
                      big
                      animState={boxState}
                    />
                    {boxState === 'explode' && (
                      <>
                        <div className="lb-flash-overlay" />
                        <div className="lb-crate-burst">
                          {Array.from({ length: 16 }, (_, i) => (
                            <span key={i} className="lb-crate-burst-p" style={{ '--ang': `${i * 22.5}deg`, animationDelay: `${(i % 4) * 0.03}s` }} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {boxState === 'idle' && <p className="lb-tap-text">✦ TAP OM TE OPENEN ✦</p>}
                  <div className="lb-box-hint">
                    Bevat kleuren · zeldzaam · episch · legendarisch
                    {overlay.itemKey === 'shirt' && <span className="lb-box-hint-ultra"> · ⚡ ultra</span>}
                  </div>
                </div>
              )}

              {/* ── Phase 2: Spin ── */}
              {overlay.phase === 'spin' && (() => {
                const centerIdx  = Math.round((WIN_W / 2 - reelX - CARD_W / 2) / SLOT_W)
                const targetX    = WIN_W / 2 - (reelWinIdx * SLOT_W + CARD_W / 2)
                const nearLand   = Math.abs(reelX - targetX) < SLOT_W * 2.5
                const bigWin     = ['epic', 'legendary', 'ultra_legendary'].includes(overlay.wonItem.rarity)
                const buildColor = RARITIES[overlay.wonItem.rarity]?.color

                return (
                  <div className="lb-spin-phase">
                    {nearLand && bigWin && (
                      <div className="lb-spin-buildup" style={{ '--bc': buildColor }} />
                    )}
                    <p className="lb-spin-label">{overlay.itemEmoji} {overlay.itemLabel}</p>
                    <div className="lb-ptr-wrap">
                      <div key={centerIdx} className="lb-ptr lb-ptr-tick" />
                    </div>
                    <div className="lb-slot-win">
                      <div className="lb-slot-fade-l" />
                      <div className="lb-slot-fade-r" />
                      <div className="lb-slot-center-line" />
                      <div
                        className="lb-slot-reel"
                        style={{ transform: `translateX(${reelX}px)` }}
                      >
                        {reelCards.map((c, i) => (
                          <div key={i} className={`lb-reel-card lb-rc-${c.rarity} ${i === centerIdx ? 'lb-rc-tick' : ''}`}>
                            <ReelIcon item={c} />
                            <div className="lb-rc-name">{c.label}</div>
                            <div className={`lb-rc-badge lb-rb-${c.rarity}`}>
                              {RARITIES[c.rarity].label.split(' ')[0]}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* ── Phase 3: Reveal ── */}
              {overlay.phase === 'reveal' && (
                <div className={`lb-reveal-phase ${isUltra ? 'lb-reveal-ultra' : ''}`}>
                  {confetti.map(p => (
                    <div
                      key={p.id}
                      className={`lb-confetti ${p.shape === 'rect' ? 'lb-confetti-rect' : ''}`}
                      style={{
                        left:           `${p.x}%`,
                        animationDelay: `${p.delay}s`,
                        background:     p.color,
                        width:          `${p.size}px`,
                        height:         `${p.size}px`,
                      }}
                    />
                  ))}

                  {isUltra && (
                    <div className="lb-ultra-banner">
                      ⚡ ULTRA LEGENDARISCH ⚡
                    </div>
                  )}

                  <div className="lb-ptr-wrap">
                    <div className="lb-ptr lb-ptr-lit" style={{ '--rc': rc }} />
                  </div>

                  <div className="lb-shockwave" style={{ '--rc': rc }} />
                  {(r === 'legendary' || isUltra) && (
                    <div className="lb-embers">
                      {Array.from({ length: 16 }, (_, i) => (
                        <span key={i} className="lb-ember" style={{
                          left: `${(i * 61) % 100}%`,
                          animationDelay: `${(i * 0.37) % 3}s`,
                          '--ec': isUltra ? (i % 2 ? '#FFD700' : '#ff6600') : '#ffd700',
                        }} />
                      ))}
                    </div>
                  )}
                  <div className={`lb-win-card lb-wc-${overlay.wonItem.rarity} ${r === 'legendary' || isUltra ? 'lb-wc-flip' : ''} ${isUltra ? 'lb-wc-chroma' : ''}`}>
                    {(r === 'legendary' || isUltra) && <div className="lb-wc-ultra-rays" />}
                    {r === 'epic' && <div className="lb-wc-epic-rays" />}
                    <WinIcon item={overlay.wonItem} rarity={overlay.wonItem.rarity} />
                    <div className="lb-wc-name">{overlay.wonItem.label}</div>

                    {showEnd && (
                      <>
                        <div
                          className={`lb-wc-badge lb-badge-pop ${isUltra ? 'lb-badge-ultra' : ''}`}
                          style={!isUltra ? { background: RARITIES[overlay.wonItem.rarity].color } : undefined}
                        >
                          {RARITIES[overlay.wonItem.rarity].label}
                        </div>
                        <div className={`lb-wc-message ${isUltra ? 'lb-msg-ultra' : ''}`}>
                          {overlay.isDuplicate ? `🔄 Al in bezit! Geld terug 💵 ${fmt(LOOTBOX_COST)}` : isUltra ? '🎆 GEWELDIG! JE HEBT HET! 🎆' : '🎉 NIEUW GEWONNEN!'}
                        </div>
                      </>
                    )}
                  </div>

                  {showEnd && (
                    <button
                      className={`lb-continue-btn ${isUltra ? 'lb-continue-ultra' : ''}`}
                      onClick={close}
                    >
                      {isUltra ? '🎆 FANTASTISCH! VERDER 🎆' : '✦ VERDER ✦'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
