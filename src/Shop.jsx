import { useState, useRef, useEffect } from 'react'
import { SHIRT_COLORS, SHIRT_SPECIALS, CLOTHING_ITEMS, LOOTBOX_COST, RARITIES } from './data'
import './shop.css'

const CARD_W  = 90
const CARD_GAP = 8
const SLOT_W  = CARD_W + CARD_GAP
const VISIBLE = 5
const WIN_W   = VISIBLE * CARD_W + (VISIBLE - 1) * CARD_GAP

const SPIN_MS = 5600
const quintic = t => 1 - Math.pow(1 - t, 5)

const RARITY_WEIGHTS = { common: 60, rare: 25, epic: 12, legendary: 3, ultra_legendary: 1 }

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
  if (item.logo) {
    return <img src={item.logo} className="lb-rc-logo" alt={item.label} />
  }
  return <div className="lb-rc-swatch" style={{ background: item.hex }} />
}

// ── Win card icon: big color swatch or big team logo ──────────────
function WinIcon({ item, rarity }) {
  if (item.logo) {
    return (
      <div className={`lb-wc-logo-wrap lb-wl-${rarity}`}>
        <img src={item.logo} className="lb-wc-logo" alt={item.label} />
      </div>
    )
  }
  return (
    <div
      className="lb-wc-swatch"
      style={{ background: item.hex, boxShadow: `0 0 22px ${item.hex}` }}
    />
  )
}

// ── Lootbox card: what rarities are possible ──────────────────────
function RarityRow({ isShirt }) {
  const rarities = isShirt
    ? ['common','rare','epic','legendary','ultra_legendary']
    : ['common','rare','epic','legendary']
  return (
    <div className="lb-rarity-row">
      {rarities.map(r => (
        <span key={r} className={`lb-rarity-chip lb-rc-chip-${r}`}>
          {RARITIES[r].label.split(' ')[0]}
        </span>
      ))}
    </div>
  )
}

export default function Shop({ curuntie, addCuruntie, unlockedColors, onUnlock, onBack }) {
  const [overlay,   setOverlay]   = useState(null)
  const [boxState,  setBoxState]  = useState('idle')
  const [particles, setParticles] = useState([])
  const [reelCards, setReelCards] = useState([])
  const [reelWinIdx, setReelWinIdx] = useState(40)
  const [reelX,     setReelX]     = useState(0)
  const [confetti,  setConfetti]  = useState([])
  const [fireworks, setFireworks] = useState([])
  const [showEnd,   setShowEnd]   = useState(false)

  const rafRef    = useRef(null)
  const startRef  = useRef(null)
  const fwTimers  = useRef([])

  useEffect(() => () => {
    rafRef.current && cancelAnimationFrame(rafRef.current)
    fwTimers.current.forEach(clearTimeout)
  }, [])

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
        color: SHIRT_COLORS[i % SHIRT_COLORS.length].hex, size: 6 + Math.random() * 7, shape: 'circle',
      })))
    } else if (r === 'epic') {
      setConfetti(Array.from({ length: 34 }, (_, i) => ({
        id: i, x: Math.random() * 100, delay: Math.random() * 1.4,
        color: SHIRT_COLORS[i % SHIRT_COLORS.length].hex, size: 6 + Math.random() * 7, shape: 'circle',
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

  const getPool = (itemKey) =>
    itemKey === 'shirt'
      ? [...SHIRT_COLORS, ...SHIRT_SPECIALS]
      : SHIRT_COLORS

  const openLootbox = (item) => {
    if (curuntie < LOOTBOX_COST) return

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
      addCuruntie(-LOOTBOX_COST + 50)
    } else {
      addCuruntie(-LOOTBOX_COST)
      onUnlock(item.key, won.key)
    }

    const { cards, winIdx } = buildReel(won, pool)
    setReelCards(cards)
    setReelWinIdx(winIdx)
    setReelX(0)
    setBoxState('idle')
    setParticles([])
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
    setParticles(Array.from({ length: 22 }, (_, i) => ({
      id: i, angle: (i / 22) * 360,
      color: SHIRT_COLORS[i % SHIRT_COLORS.length].hex,
    })))

    setTimeout(() => setBoxState('explode'), 580)

    setTimeout(() => {
      setBoxState('idle')
      setParticles([])
      setOverlay(o => o ? { ...o, phase: 'spin' } : null)

      const winCenter = reelWinIdx * SLOT_W + CARD_W / 2
      const targetX   = WIN_W / 2 - winCenter
      startRef.current = null

      const spin = (ts) => {
        if (!startRef.current) startRef.current = ts
        const t = Math.min((ts - startRef.current) / SPIN_MS, 1)
        setReelX(targetX * quintic(t))
        if (t < 1) {
          rafRef.current = requestAnimationFrame(spin)
        } else {
          setOverlay(o => o ? { ...o, phase: 'reveal' } : null)
          setTimeout(() => setShowEnd(true), overlay?.wonItem?.rarity === 'ultra_legendary' ? 600 : 900)
        }
      }
      rafRef.current = requestAnimationFrame(spin)
    }, 1200)
  }

  const close = () => {
    rafRef.current && cancelAnimationFrame(rafRef.current)
    fwTimers.current.forEach(clearTimeout)
    setOverlay(null)
    setParticles([])
    setConfetti([])
    setFireworks([])
    setShowEnd(false)
  }

  return (
    <div className="shop-screen">
      <button className="back-btn" onClick={onBack}>← Terug</button>
      <h2 className="shop-title">🛒 Winkel</h2>
      <p className="shop-sub">Open een lootbox en win een kleur — of iets legendarisch!</p>

      <div className="lootbox-grid">
        {CLOTHING_ITEMS.map(item => {
          const pool      = getPool(item.key)
          const unlocked  = (unlockedColors[item.key] || []).length
          const total     = pool.length
          const allDone   = unlocked >= total
          const canAfford = curuntie >= LOOTBOX_COST

          return (
            <div
              key={item.key}
              className={`lootbox-card ${allDone ? 'lb-card-done' : ''} ${item.hasFeatured ? 'lb-card-featured' : ''}`}
            >
              {item.hasFeatured && (
                <div className="lb-featured-badge">⚡ ULTRA KANS ⚡</div>
              )}
              <div className="lb-card-emoji lb-card-emoji-float">{item.emoji}</div>
              <div className="lb-card-name">{item.label}</div>

              <RarityRow isShirt={item.key === 'shirt'} />

              <div className="lb-dots">
                {SHIRT_COLORS.map(c => (
                  <span
                    key={c.key}
                    className="lb-dot"
                    title={c.label}
                    style={(unlockedColors[item.key] || []).includes(c.key)
                      ? { background: c.hex, boxShadow: `0 0 6px ${c.hex}` }
                      : { background: '#333', opacity: 0.35 }}
                  />
                ))}
                {item.key === 'shirt' && SHIRT_SPECIALS.map(s => (
                  <img
                    key={s.key}
                    src={s.logo}
                    className={`lb-dot-logo ${(unlockedColors[item.key] || []).includes(s.key) ? 'lb-dot-logo-on' : 'lb-dot-logo-off'}`}
                    title={s.label}
                    alt={s.label}
                  />
                ))}
              </div>

              <div className="lb-progress">{unlocked}/{total} gewonnen</div>

              <button
                className={`lb-open-btn ${allDone ? 'lb-btn-done' : !canAfford ? 'lb-btn-broke' : ''}`}
                onClick={() => openLootbox(item)}
                disabled={allDone || !canAfford}
              >
                {allDone ? '✓ Compleet!' : !canAfford ? 'Te weinig 🪙' : `🪙 ${fmt(LOOTBOX_COST)} Openen`}
              </button>
            </div>
          )
        })}
      </div>

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
                    <div className="lb-box-glow" />
                    <span className="lb-box-emoji">📦</span>
                    {boxState !== 'idle' && <div className="lb-burst-ring" />}
                    {boxState !== 'idle' && <div className="lb-burst-ring lb-burst-ring-2" />}
                    {particles.map(p => (
                      <div
                        key={p.id}
                        className="lb-particle"
                        style={{ '--angle': `${p.angle}deg`, background: p.color }}
                      />
                    ))}
                  </div>
                  {boxState === 'idle' && <p className="lb-tap-text">✦ TAP OM TE OPENEN ✦</p>}
                  <div className="lb-box-hint">
                    Bevat kleuren · zeldzaam · episch · legendarisch
                    {overlay.itemKey === 'shirt' && <span className="lb-box-hint-ultra"> · ⚡ ultra</span>}
                  </div>
                </div>
              )}

              {/* ── Phase 2: Spin ── */}
              {overlay.phase === 'spin' && (
                <div className="lb-spin-phase">
                  <p className="lb-spin-label">{overlay.itemEmoji} {overlay.itemLabel}</p>
                  <div className="lb-ptr-wrap">
                    <div className="lb-ptr" />
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
                        <div key={i} className={`lb-reel-card lb-rc-${c.rarity}`}>
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
              )}

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

                  <div className={`lb-win-card lb-wc-${overlay.wonItem.rarity}`}>
                    {isUltra && <div className="lb-wc-ultra-rays" />}
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
                          {overlay.isDuplicate ? '🔄 Al gewonnen! +50 🪙' : isUltra ? '🎆 GEWELDIG! JE HEBT HET! 🎆' : '🎉 NIEUW GEWONNEN!'}
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
