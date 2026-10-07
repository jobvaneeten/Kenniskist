import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { CLOTHING_ITEMS, LOOTBOX_COST, RARITIES, CRATE_ACCENTS } from './data'
import { getCatalog } from './itemsCatalog'
import CrateArtwork from './CrateArtwork'
import KledingPreview from './KledingPreview'
import { isMuted, setMuted, playKlik, playMunten, playSluiten, playSter } from './lootboxSound'
import './shop.css'
// 3D-poppetje pas laden als er echt iets gewonnen is (Babylon is groot)
const ItemViewer3D = lazy(() => import('./ItemViewer3D'))
const KistOpener3D = lazy(() => import('./KistOpener3D'))
import { Knop, TerugKnop, Icoon } from './ui/index.jsx'

// sterren per zeldzaamheid op het onthul-scherm
const STERREN = { common: 1, rare: 2, epic: 3, legendary: 4, ultra_legendary: 5 }

// Higher legendary/ultra chance. Effective odds also depend on how many
// items each rarity has (see rarityOdds, computed from the real pool).
const RARITY_WEIGHTS = { common: 12, rare: 10, epic: 9, legendary: 8, ultra_legendary: 5 }

// Confetti / particle colours (SHIRT_COLORS import was removed)
const CONFETTI = ['#e63946','#1d6fa4','#2d9e4f','#f4c430','#f77f00','#7b2d8b','#ffd23f','#ffffff']

function fmt(n) { return n.toLocaleString('nl-NL') }

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
  const [confetti,  setConfetti]  = useState([])
  const [fireworks, setFireworks] = useState([])
  const [showEnd,   setShowEnd]   = useState(false)
  const [muted,     setMutedState] = useState(() => isMuted())
  const [selectedKey, setSelectedKey] = useState(null)   // item key whose detail panel is open

  const fwTimers  = useRef([])

  useEffect(() => () => { fwTimers.current.forEach(clearTimeout) }, [])

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
      playMunten()
      onUnlock(item.key, won.key)
    }

    setShowEnd(false)
    setFireworks([])
    setOverlay({
      itemKey:      item.key,
      itemEmoji:    item.emoji,
      itemLabel:    item.label,
      wonItem:      won,
      isDuplicate,
      phase:        'kist',
    })
  }

  // kist is open en het kledingstuk is eruit gezweefd → onthulling
  const naarOnthulling = () => {
    // sterren ploppen één voor één (zelfde vertraging als de CSS)
    const n = STERREN[overlay?.wonItem?.rarity] || 0
    for (let i = 0; i < n; i++) fwTimers.current.push(setTimeout(() => playSter(i), 450 + i * 130))
    setOverlay(o => o ? { ...o, phase: 'reveal' } : null)
    setTimeout(() => setShowEnd(true), 600)
  }

  const close = () => {
    playSluiten()
    fwTimers.current.forEach(clearTimeout)
    setOverlay(null)
    setConfetti([])
    setFireworks([])
    setShowEnd(false)
  }

  return (
    <div className={`shop-screen ${overlay ? 'shop-pauze' : ''}`}>
      <TerugKnop onClick={onBack} />
      <Knop
        variant="secundair" alleenIcoon icoon={muted ? 'stil' : 'geluid'}
        className="hoek-rechtsonder"
        onClick={() => { const next = !muted; setMuted(next); setMutedState(next) }}
        title={muted ? 'Geluid aan' : 'Geluid uit'} aria-label={muted ? 'Geluid aan' : 'Geluid uit'}
      />
      <div className="game-header" style={{ '--kk-accent': 'var(--kk-gold)', marginBottom: 0 }}>
        <span className="game-header-icon"><Icoon naam="tas" /></span>
        <h1 className="game-header-title">Winkel</h1>
        <p className="game-header-sub">Kies een kist — in elke kist zit nieuwe kleding voor je poppetje</p>
      </div>
      <div className="shop-saldo"><span className="shop-saldo-icoon">💵</span><b>{fmt(briefgeld)}</b><span>briefgeld</span></div>

      <div className="shop-grid">
        {CLOTHING_ITEMS.map(item => {
          const pool      = getPool(item.key)
          const unlocked  = (unlockedColors[item.key] || []).length
          const total     = pool.length
          const { accent } = CRATE_ACCENTS[item.key] || CRATE_ACCENTS.shirt
          const isSelected = selectedKey === item.key
          const compleet  = unlocked >= total
          const kanKopen  = briefgeld >= LOOTBOX_COST

          return (
            <button
              type="button"
              key={item.key}
              className={`shopcard ${isSelected ? 'shopcard-selected' : ''}`}
              style={{ '--accent': accent }}
              onClick={() => { playKlik(); setSelectedKey(isSelected ? null : item.key) }}
            >
              <div className="shopcard-podium">
                <div className="shopcard-stralen" />
                <CrateArtwork itemKey={item.key} accent={accent} size={170} />
              </div>
              <div className="shopcard-shine" />
              {item.hasFeatured && <div className="shopcard-ultra-badge">⚡ ULTRA KANS</div>}
              <div className="shopcard-name">{item.emoji} {item.label}</div>
              <div className="shopcard-voortgang" title={`${unlocked} van ${total} gewonnen`}>
                <div className="shopcard-voortgang-balk" style={{ width: `${(unlocked / Math.max(1, total)) * 100}%` }} />
                <span>{unlocked}/{total}</span>
              </div>
              <div className={`shopcard-prijs ${compleet ? 'is-compleet' : kanKopen ? '' : 'te-duur'}`}>
                {compleet ? '✓ Compleet' : <>💵 {fmt(LOOTBOX_COST)} <span>· Openen</span></>}
              </div>
            </button>
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
        const { accent } = CRATE_ACCENTS[item.key] || CRATE_ACCENTS.shirt

        return (
          <>
            <div className="shop-detail-backdrop" onClick={() => setSelectedKey(null)} />
            <div className="shop-detail-panel" style={{ '--accent': accent }}>
              <Knop variant="secundair" maat="sm" alleenIcoon icoon="sluiten" className="shop-detail-close" aria-label="Sluiten" onClick={() => setSelectedKey(null)} />

              <div className="shop-detail-left">
                <div className="shop-detail-rays" />
                <div className="shop-detail-crate-float">
                  <CrateArtwork itemKey={item.key} accent={accent} size={190} big />
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
                    return (
                      <div
                        key={c.key}
                        className={`shop-tegel ${owned ? '' : 'shop-tegel-dicht'}`}
                        title={owned ? c.label : 'Nog niet gewonnen'}
                        style={{ '--rc': RARITIES[c.rarity].color }}
                      >
                        <KledingPreview type={item.key} item={owned ? c : null} size={30} />
                      </div>
                    )
                  })}
                </div>

                <Knop
                  variant="beloning" maat="lg" breed
                  icoon={allDone ? 'goed' : undefined}
                  onClick={() => openLootbox(item)}
                  disabled={allDone || !canAfford}
                >
                  {allDone ? 'Compleet!' : !canAfford ? 'Te weinig 💵' : `💵 ${fmt(LOOTBOX_COST)} · Openen`}
                </Knop>
              </div>
            </div>
          </>
        )
      })()}

      {/* ── Overlay ── */}
      {overlay && (() => {
        const won = overlay.wonItem
        const r  = overlay.phase === 'reveal' ? won.rarity : null
        const rc = r ? RARITIES[r].color : null
        const isUltra = r === 'ultra_legendary'
        const hint = RARITIES[won.rarity].color   // de kist laadt op in de kleur van wat erin zit

        return (
          <div className={`lb-overlay ${isUltra ? 'lb-overlay-ultra' : ''}`}>

            {fireworks.map(fw => (
              <div
                key={fw.id}
                className="lb-firework"
                style={{ left: `${fw.x}%`, top: `${fw.y}%`, '--fw-color': fw.color, '--fw-size': `${fw.size}px`, animationDelay: `${fw.delay}s` }}
              />
            ))}

            <div className={`lb-modal-card ${r ? `lb-mc-${r}` : ''}`} style={{ '--rc': rc || hint }}>

              {/* ── Fase 1: de kist in 3D: tik, tik, open ── */}
              {overlay.phase === 'kist' && (
                <div className="lb-kist-phase">
                  <p className="lb-box-label">{overlay.itemEmoji} {overlay.itemLabel}-kist</p>
                  <Suspense fallback={<div className="ko ko-laden" />}>
                    <KistOpener3D type={overlay.itemKey} item={won} rarity={won.rarity} onKlaar={naarOnthulling} />
                  </Suspense>
                  <div className="lb-box-hint">
                    Bevat kleuren · zeldzaam · episch · legendarisch
                    {overlay.itemKey === 'shirt' && <span className="lb-box-hint-ultra"> · ⚡ ultra</span>}
                  </div>
                </div>
              )}

              {/* ── Fase 2: onthulling ── */}
              {overlay.phase === 'reveal' && (
                <div className={`lb-reveal-phase lb-rv-${r}`} style={{ '--rc': rc }}>
                  {confetti.map(p => (
                    <div
                      key={p.id}
                      className={`lb-confetti ${p.shape === 'rect' ? 'lb-confetti-rect' : ''}`}
                      style={{ left: `${p.x}%`, animationDelay: `${p.delay}s`, background: p.color, width: `${p.size}px`, height: `${p.size}px` }}
                    />
                  ))}
                  <div className="lb-rv-stralen" />
                  <div className="lb-rv-gloed" />
                  <div className="lb-ring lb-rv-ring" />
                  <div className="lb-crate-burst lb-rv-burst">
                    {Array.from({ length: 6 + STERREN[r] * 4 }, (_, i) => (
                      <span key={i} className="lb-scherf lb-scherf-rc"
                        style={{ '--ang': `${(i * 360) / (6 + STERREN[r] * 4)}deg`, '--afst': `${120 + (i * 29) % 60}px` }} />
                    ))}
                  </div>
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

                  {isUltra && <div className="lb-ultra-banner">⚡ ULTRA LEGENDARISCH ⚡</div>}

                  <div className="lb-rv-item">
                    {/* eerst het plaatje (pop-in), dan het echte item op het poppetje, draaibaar */}
                    <Suspense fallback={<div className="lb-rv-zweef"><KledingPreview type={overlay.itemKey} item={won} size={170} glans /></div>}>
                      <ItemViewer3D type={overlay.itemKey} itemKey={won.key} gloed={rc}>
                        <div className="lb-rv-zweef"><KledingPreview type={overlay.itemKey} item={won} size={170} glans /></div>
                      </ItemViewer3D>
                    </Suspense>
                  </div>

                  <div className="lb-rv-sterren">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} className={i < STERREN[r] ? 'aan' : ''} style={{ animationDelay: `${0.45 + i * 0.13}s` }}>★</span>
                    ))}
                  </div>
                  <div className="lb-wc-name">{won.label}</div>
                  <div className={`lb-wc-badge lb-badge-pop ${isUltra ? 'lb-badge-ultra' : ''}`}>
                    {RARITIES[won.rarity].label}
                  </div>

                  {showEnd && (
                    <>
                      <div className={`lb-wc-message ${isUltra ? 'lb-msg-ultra' : ''}`}>
                        {overlay.isDuplicate ? `🔄 Al in bezit! Geld terug 💵 ${fmt(LOOTBOX_COST)}` : isUltra ? '🎆 GEWELDIG! JE HEBT HET! 🎆' : '🎉 NIEUW GEWONNEN!'}
                      </div>
                      <Knop variant="beloning" maat="lg" icoonRechts="verder" className="lb-continue-btn" onClick={close}>
                        {isUltra ? 'Fantastisch! Verder' : 'Verder'}
                      </Knop>
                    </>
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
