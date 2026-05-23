import { useState, useRef, useEffect, useCallback } from 'react'
import { TOWERS, TOWER_MAP, LVL_DMG, LVL_RATE, LVL_RANGE, upgradeCost, ENEMY_TYPES, generateWave } from './td_data'
import './towerdefense.css'

// ── Grid / canvas constants ───────────────────────────────────────────
const CW   = 720
const CH   = 480
const CELL = 40
const COLS = 18
const ROWS = 12

const tx = c => c * CELL + CELL / 2   // tile → pixel center X
const ty = r => r * CELL + CELL / 2   // tile → pixel center Y

// ── Path definition ───────────────────────────────────────────────────
// Waypoints [col, row] at bends + entry col 0 + exit col 17
const BEND_TILES = [[0,2],[4,2],[4,8],[10,8],[10,2],[14,2],[14,9],[17,9]]

// Pixel-space waypoints enemies follow
const WAYPOINTS = [
  { x: -CELL,       y: ty(2) },
  ...BEND_TILES.map(([c,r]) => ({ x: tx(c), y: ty(r) })),
  { x: CW + CELL,   y: ty(9) },
]

function computePathTiles() {
  const segs = [
    [[0,2],[4,2]],[[4,2],[4,8]],[[4,8],[10,8]],
    [[10,8],[10,2]],[[10,2],[14,2]],[[14,2],[14,9]],[[14,9],[17,9]],
  ]
  const s = new Set()
  for (const [[c1,r1],[c2,r2]] of segs) {
    if (c1 === c2)
      for (let r = Math.min(r1,r2); r <= Math.max(r1,r2); r++) s.add(`${c1},${r}`)
    else
      for (let c = Math.min(c1,c2); c <= Math.max(c1,c2); c++) s.add(`${c},${r1}`)
  }
  return s
}
const PATH_TILES = computePathTiles()

// Decorative grass noise (static)
const GRASS_DOTS = Array.from({ length: 200 }, (_, i) => ({
  x: (i * 73 + 11) % CW,
  y: (i * 51 + 7) % CH,
  s: 1 + (i % 3),
  a: 0.08 + (i % 5) * 0.03,
}))

// ── Helpers ───────────────────────────────────────────────────────────
let _nextId = 1
const uid = () => _nextId++

function dist(a, b) { return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2) }

function towerStats(towerKey, level) {
  const base = TOWER_MAP[towerKey]
  return {
    damage: base.damage * LVL_DMG[level],
    range:  base.range  * LVL_RANGE[level],
    rate:   base.rate   * LVL_RATE[level],
  }
}

// How far along the path an enemy is (for targeting priority)
function pathProgress(e) {
  return e.wpIdx * 10000 + (e.wpIdx < WAYPOINTS.length
    ? WAYPOINTS[e.wpIdx].x - e.x   // rough
    : 0)
}

// ── Drawing helpers ───────────────────────────────────────────────────
function drawEnemy(ctx, e, img) {
  const { color, outline, radius } = ENEMY_TYPES[e.type]
  const r = radius * (e.type === 'tank' ? 1 : 1)

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath(); ctx.ellipse(e.x, e.y + r, r * 0.9, r * 0.35, 0, 0, Math.PI * 2); ctx.fill()

  // Body
  const g = ctx.createRadialGradient(e.x - r*0.3, e.y - r*0.3, 1, e.x, e.y, r)
  g.addColorStop(0, lighten(color, 40))
  g.addColorStop(1, color)
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = outline; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.stroke()

  // Eyes
  const eyeR = r * 0.22, eyeOX = r * 0.32, eyeOY = r * -0.15
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(e.x - eyeOX, e.y + eyeOY, eyeR, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(e.x + eyeOX, e.y + eyeOY, eyeR, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#222'
  ctx.beginPath(); ctx.arc(e.x - eyeOX + 1, e.y + eyeOY + 1, eyeR * 0.55, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(e.x + eyeOX + 1, e.y + eyeOY + 1, eyeR * 0.55, 0, Math.PI * 2); ctx.fill()

  // Armor shimmer
  if (e.type === 'armored') {
    ctx.strokeStyle = 'rgba(200,220,255,0.6)'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(e.x, e.y, r + 2, 0, Math.PI * 2); ctx.stroke()
  }

  // Slow frost
  if (e.effects.slow > 0) {
    ctx.strokeStyle = 'rgba(100,180,255,0.55)'; ctx.lineWidth = 2.5
    ctx.setLineDash([3,3])
    ctx.beginPath(); ctx.arc(e.x, e.y, r + 3, 0, Math.PI * 2); ctx.stroke()
    ctx.setLineDash([])
  }

  // Poison bubbles
  if (e.effects.poison > 0) {
    ctx.fillStyle = 'rgba(100,200,60,0.7)'
    ctx.beginPath(); ctx.arc(e.x + r * 0.5, e.y - r * 0.8, 3, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(e.x - r * 0.4, e.y - r * 1.0, 2, 0, Math.PI * 2); ctx.fill()
  }

  // HP bar
  const bw = r * 2 + 4, bh = 5, bx = e.x - bw / 2, by = e.y - r - 10
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2)
  ctx.fillStyle = '#e33'; ctx.fillRect(bx, by, bw, bh)
  const pct = Math.max(0, e.hp / e.maxHp)
  ctx.fillStyle = pct > 0.5 ? '#3e3' : pct > 0.25 ? '#ee3' : '#e33'
  ctx.fillRect(bx, by, bw * pct, bh)
}

function drawTower(ctx, t, img, cellW, cellH) {
  const px = t.col * CELL, py = t.row * CELL
  const tDef = TOWER_MAP[t.type]
  const pad  = 3 + t.level * 1

  // Platform
  ctx.fillStyle = t.level === 0 ? '#e8f5e0' : t.level === 1 ? '#d4edff' : '#fff0cc'
  ctx.strokeStyle = t.level === 0 ? '#a8cc88' : t.level === 1 ? '#7ab8e8' : '#e8b840'
  ctx.lineWidth = 2
  roundRect(ctx, px + 3, py + 3, CELL - 6, CELL - 6, 8)
  ctx.fill(); ctx.stroke()

  // Sprite
  if (img) {
    ctx.drawImage(img,
      tDef.col * cellW, tDef.row * cellH, cellW, cellH,
      px + pad, py + pad, CELL - pad * 2, CELL - pad * 2
    )
  }

  // Level stars
  if (t.level > 0) {
    ctx.fillStyle = '#FFD23F'
    ctx.font = `${8 + t.level}px Arial`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('⭐'.repeat(t.level), px + CELL / 2, py + CELL - 7)
  }
}

function drawField(ctx, img, towers, enemies, projectiles, particles, hoverTile, selectedType, inspectedId, cellW, cellH) {
  // Background
  ctx.fillStyle = '#6db856'
  ctx.fillRect(0, 0, CW, CH)

  // Grass texture dots
  GRASS_DOTS.forEach(d => {
    ctx.globalAlpha = d.a
    ctx.fillStyle = '#4a9940'
    ctx.fillRect(d.x, d.y, d.s, d.s)
  })
  ctx.globalAlpha = 1

  // Path tiles
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!PATH_TILES.has(`${c},${r}`)) continue
      const px = c * CELL, py = r * CELL
      // Base dirt
      ctx.fillStyle = '#c8a96a'
      ctx.fillRect(px, py, CELL, CELL)
      // Path detail
      ctx.fillStyle = '#b89550'
      ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4)
      // Border line
      ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1
      ctx.strokeRect(px, py, CELL, CELL)
    }
  }

  // Grid lines (faint, grass only)
  ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 1
  for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c*CELL,0); ctx.lineTo(c*CELL,CH); ctx.stroke() }
  for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0,r*CELL); ctx.lineTo(CW,r*CELL); ctx.stroke() }

  // Hover preview when placing a tower
  if (selectedType && hoverTile) {
    const { col, row } = hoverTile
    const valid = !PATH_TILES.has(`${col},${row}`) && !towers.find(t => t.col===col && t.row===row)
    ctx.fillStyle = valid ? 'rgba(100,255,100,0.28)' : 'rgba(255,60,60,0.28)'
    ctx.fillRect(col * CELL, row * CELL, CELL, CELL)
    // Range preview
    const base = TOWER_MAP[selectedType]
    ctx.strokeStyle = valid ? 'rgba(100,255,100,0.5)' : 'rgba(255,100,100,0.5)'
    ctx.lineWidth = 1.5; ctx.setLineDash([5,5])
    ctx.beginPath(); ctx.arc(tx(col), ty(row), base.range, 0, Math.PI * 2); ctx.stroke()
    ctx.setLineDash([])
  }

  // Towers
  towers.forEach(t => drawTower(ctx, t, img, cellW, cellH))

  // Range ring for inspected tower
  const ins = inspectedId ? towers.find(t => t.id === inspectedId) : null
  if (ins) {
    const { range } = towerStats(ins.type, ins.level)
    ctx.strokeStyle = 'rgba(255,220,50,0.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([5,5])
    ctx.beginPath(); ctx.arc(tx(ins.col), ty(ins.row), range, 0, Math.PI * 2); ctx.stroke()
    ctx.setLineDash([])
    ctx.strokeStyle = 'rgba(255,220,50,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([])
    ctx.strokeRect(ins.col*CELL+1, ins.row*CELL+1, CELL-2, CELL-2)
  }

  // Enemies
  enemies.forEach(e => drawEnemy(ctx, e))

  // Projectiles
  projectiles.forEach(p => {
    ctx.fillStyle = p.color
    ctx.shadowColor = p.color; ctx.shadowBlur = 6
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
  })

  // Particles
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
    ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
  })
  ctx.globalAlpha = 1

  // Path arrows (decorative)
  ctx.fillStyle = 'rgba(180,140,80,0.35)'
  ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  // row 2 horizontal: →
  for (let c = 1; c <= 3; c++) ctx.fillText('›', tx(c), ty(2))
  // col 4 down: ↓
  for (let r = 3; r <= 7; r++) ctx.fillText('⌄', tx(4), ty(r))
  // row 8 right: →
  for (let c = 5; c <= 9; c++) ctx.fillText('›', tx(c), ty(8))
  // col 10 up: ↑
  for (let r = 3; r <= 7; r++) ctx.fillText('˄', tx(10), ty(r))
  // row 2 right: →
  for (let c = 11; c <= 13; c++) ctx.fillText('›', tx(c), ty(2))
  // col 14 down: ↓
  for (let r = 3; r <= 8; r++) ctx.fillText('⌄', tx(14), ty(r))
  // row 9 right: →
  for (let c = 15; c <= 16; c++) ctx.fillText('›', tx(c), ty(9))
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x+r, y)
  ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r)
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r)
  ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r)
  ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r)
  ctx.closePath()
}

function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, (n >> 16) + amt)
  const g = Math.min(255, ((n >> 8) & 0xff) + amt)
  const b = Math.min(255, (n & 0xff) + amt)
  return `rgb(${r},${g},${b})`
}

// ── Projectile colors per special ────────────────────────────────────
const PROJ_COLOR = { none:'#fff', rapid:'#fff', slow:'#7fd4ff', splash:'#ff9944', poison:'#88dd44', stun:'#ffdd22', chain:'#ff88cc', snipe:'#ffee44' }
const PROJ_RAD   = { none:4, rapid:3, slow:5, splash:6, poison:4, stun:5, chain:4, snipe:3 }

// ── Main component ────────────────────────────────────────────────────
export default function TowerDefenseGame({ onBack }) {
  const [gold,      setGold]      = useState(150)
  const [lives,     setLives]     = useState(15)
  const [wave,      setWave]      = useState(0)
  const [phase,     setPhase]     = useState('idle')   // idle | playing | between | gameover
  const [selType,   setSelType]   = useState(null)     // tower key being placed
  const [inspected, setInspected] = useState(null)     // placed tower id
  const [hoverType, setHoverType] = useState(null)     // shop hover
  const [hoverTile, setHoverTile] = useState(null)     // canvas hover tile {col,row}
  const [, forceUpdate]           = useState(0)        // trigger re-render for sidebar

  const canvasRef  = useRef(null)
  const gameRef    = useRef(null)
  const rafRef     = useRef(null)
  const imgRef     = useRef(null)
  const cellSzRef  = useRef({ w: 100, h: 100 })
  const selTypeRef = useRef(null)
  const hoverTileRef = useRef(null)
  const inspectedRef = useRef(null)

  selTypeRef.current   = selType
  hoverTileRef.current = hoverTile
  inspectedRef.current = inspected

  // Load spritesheet
  useEffect(() => {
    const img = new Image()
    img.src = '/Towerdefence.png'
    img.onload = () => {
      imgRef.current = img
      cellSzRef.current = { w: img.width / 5, h: img.height / 5 }
    }
  }, [])

  // Init game state
  const newGame = useCallback(() => {
    _nextId = 1
    gameRef.current = {
      towers: [], enemies: [], projectiles: [], particles: [],
      gold: 150, lives: 15, wave: 0,
      spawnQueue: [], spawnTimer: 0,
      waveActive: false,
      running: false, lastTs: null,
    }
  }, [])

  useEffect(() => { newGame() }, [newGame])

  // ── Game loop ─────────────────────────────────────────────────────
  const startLoop = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    const game = gameRef.current
    game.running = true

    const tick = ts => {
      if (!game.running) return
      const dt = Math.min(((ts - (game.lastTs || ts)) / 1000), 0.05)
      game.lastTs = ts

      // ── Wave spawner ──
      if (game.waveActive && game.spawnQueue.length > 0) {
        game.spawnTimer -= dt
        if (game.spawnTimer <= 0) {
          const entry = game.spawnQueue.shift()
          const etype = ENEMY_TYPES[entry.type]
          game.enemies.push({
            id: uid(), type: entry.type,
            x: WAYPOINTS[0].x, y: WAYPOINTS[0].y,
            hp: Math.round(etype.baseHp * entry.hpScale),
            maxHp: Math.round(etype.baseHp * entry.hpScale),
            speed: etype.baseSpd * entry.spdScale,
            wpIdx: 1,
            effects: { slow: 0, poison: 0, poisonDmg: 0, stun: 0 },
            reward: etype.reward,
            armor: etype.armor,
          })
          game.spawnTimer = game.spawnQueue.length > 0 ? game.spawnQueue[0].delay - (game.wave > 1 ? 0 : 0) : 0
          if (game.spawnQueue.length === 0) game.spawnTimer = 0
        }
      }

      // ── Enemies ──
      const toRemove = new Set()
      game.enemies = game.enemies.filter(e => {
        if (toRemove.has(e.id)) return false

        // Tick effects
        e.effects.slow   = Math.max(0, e.effects.slow   - dt)
        e.effects.stun   = Math.max(0, e.effects.stun   - dt)
        e.effects.poison = Math.max(0, e.effects.poison - dt)
        if (e.effects.poison > 0) {
          e.hp -= e.effects.poisonDmg * dt
          if (e.hp <= 0) { game.gold += e.reward; spawnDeathParticles(game, e); handleSplitter(game, e); return false }
        }

        if (e.effects.stun > 0) return true  // frozen

        const spd = e.speed * (e.effects.slow > 0 ? 0.45 : 1)
        const wp  = WAYPOINTS[e.wpIdx]
        if (!wp) { game.lives = Math.max(0, game.lives - 1); return false }

        const dx = wp.x - e.x, dy = wp.y - e.y
        const d  = Math.sqrt(dx*dx + dy*dy)
        if (d < 4) {
          e.wpIdx++
          if (e.wpIdx >= WAYPOINTS.length) { game.lives = Math.max(0, game.lives - 1); return false }
        } else {
          e.x += (dx / d) * spd * dt
          e.y += (dy / d) * spd * dt
        }
        return true
      })

      // Wave complete check
      if (game.waveActive && game.spawnQueue.length === 0 && game.enemies.length === 0) {
        game.waveActive = false
        if (game.lives > 0) setPhase('between')
      }

      // ── Towers shoot ──
      const now = ts / 1000
      game.towers.forEach(t => {
        const { damage, range, rate } = towerStats(t.type, t.level)
        const special = TOWER_MAP[t.type].special
        if (now - (t.lastShot || 0) < 1 / rate) return

        // Find target
        let target = null
        const inRange = game.enemies.filter(e => dist({ x: tx(t.col), y: ty(t.row) }, e) <= range)
        if (inRange.length === 0) return
        if (special === 'snipe') {
          // target furthest along path
          target = inRange.reduce((a,b) => pathProgress(b) > pathProgress(a) ? b : a)
        } else {
          // target first (most progress)
          target = inRange.reduce((a,b) => pathProgress(b) > pathProgress(a) ? b : a)
        }
        if (!target) return
        t.lastShot = now
        fireProjectile(game, t, target, damage, special)
      })

      // ── Projectiles ──
      game.projectiles = game.projectiles.filter(p => {
        const target = game.enemies.find(e => e.id === p.targetId)
        if (!target) return false  // target died

        const dx = target.x - p.x, dy = target.y - p.y
        const d  = Math.sqrt(dx*dx + dy*dy)

        if (d < 12 + (target.radius || 14)) {
          // Hit!
          applyHit(game, p, target)
          spawnHitParticles(game, p)
          return false
        }

        const spd = 320
        p.x += (dx / d) * spd * dt
        p.y += (dy / d) * spd * dt
        return true
      })

      // ── Particles ──
      game.particles = game.particles.filter(p => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt
        return p.life > 0
      })

      // ── Sync React state ──
      setGold(game.gold)
      setLives(game.lives)
      if (game.lives <= 0) {
        game.running = false; setPhase('gameover'); return
      }

      // ── Draw ──
      const { w: cw, h: ch } = cellSzRef.current
      drawField(ctx, imgRef.current, game.towers, game.enemies, game.projectiles, game.particles,
        hoverTileRef.current, selTypeRef.current, inspectedRef.current, cw, ch)

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  // ── Projectile / hit helpers ──────────────────────────────────────
  function fireProjectile(game, tower, target, damage, special) {
    const ox = tx(tower.col), oy = ty(tower.row)
    const proj = {
      id: uid(), x: ox, y: oy,
      targetId: target.id,
      damage, special,
      color: PROJ_COLOR[special] || '#fff',
      radius: PROJ_RAD[special] || 4,
      bounceLeft: special === 'chain' ? 2 : 0,
      hitIds: new Set([target.id]),
    }
    game.projectiles.push(proj)
  }

  function applyHit(game, proj, target) {
    const { special, damage } = proj
    const isArmored = target.armor

    let dmg = damage
    if (isArmored && special === 'poison') dmg *= 0.1  // armor resists poison

    target.hp -= dmg
    if (target.hp <= 0) {
      target.hp = 0
      game.gold += target.reward
      spawnDeathParticles(game, target)
      handleSplitter(game, target)
      game.enemies = game.enemies.filter(e => e.id !== target.id)
    }

    if (special === 'slow')   { target.effects.slow  = 2.5 }
    if (special === 'stun')   { target.effects.stun  = 0.7 }
    if (special === 'poison' && !isArmored) { target.effects.poison = 4; target.effects.poisonDmg = damage * 0.4 }

    if (special === 'splash') {
      game.enemies.forEach(e => {
        if (e.id === target.id || proj.hitIds.has(e.id)) return
        if (dist(e, target) < 55) { e.hp -= damage * 0.6; proj.hitIds.add(e.id) }
      })
    }

    if (special === 'chain' && proj.bounceLeft > 0) {
      const next = game.enemies
        .filter(e => !proj.hitIds.has(e.id) && dist(e, target) < 90)
        .sort((a,b) => dist(a,target) - dist(b,target))[0]
      if (next) {
        game.projectiles.push({
          id: uid(), x: target.x, y: target.y,
          targetId: next.id,
          damage: damage * 0.7, special: 'chain',
          color: PROJ_COLOR.chain, radius: 3,
          bounceLeft: proj.bounceLeft - 1,
          hitIds: new Set([...proj.hitIds, next.id]),
        })
      }
    }
  }

  function handleSplitter(game, e) {
    if (e.type !== 'splitter') return
    for (let i = 0; i < 2; i++) {
      const etype = ENEMY_TYPES.mini
      game.enemies.push({
        id: uid(), type: 'mini',
        x: e.x + (i===0?-8:8), y: e.y,
        hp: etype.baseHp, maxHp: etype.baseHp,
        speed: etype.baseSpd,
        wpIdx: e.wpIdx,
        effects: { slow:0, poison:0, poisonDmg:0, stun:0 },
        reward: etype.reward, armor: false,
      })
    }
  }

  function spawnDeathParticles(game, e) {
    const { color } = ENEMY_TYPES[e.type]
    for (let i = 0; i < 8; i++) {
      const a = (i/8)*Math.PI*2, spd = 60+Math.random()*100
      game.particles.push({ x:e.x, y:e.y, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd-60, life:0.7, maxLife:0.7, color, size:3+Math.random()*3 })
    }
  }

  function spawnHitParticles(game, p) {
    for (let i = 0; i < 4; i++) {
      const a = Math.random()*Math.PI*2, spd = 40+Math.random()*60
      game.particles.push({ x:p.x, y:p.y, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd, life:0.4, maxLife:0.4, color:p.color, size:2 })
    }
  }

  // ── Wave management ───────────────────────────────────────────────
  const startWave = useCallback(() => {
    const game = gameRef.current; if (!game) return
    const nextWave = game.wave + 1
    game.wave = nextWave
    game.waveActive = true
    game.spawnQueue = generateWave(nextWave)
    game.spawnTimer = 0
    setWave(nextWave)
    setPhase('playing')
    setInspected(null)
    if (!game.running) startLoop()
  }, [startLoop])

  // ── Canvas interaction ────────────────────────────────────────────
  const getTile = useCallback(e => {
    const rect = canvasRef.current.getBoundingClientRect()
    const sx = CW / rect.width, sy = CH / rect.height
    const cx = (e.clientX - rect.left) * sx
    const cy = (e.clientY - rect.top)  * sy
    const col = Math.floor(cx / CELL), row = Math.floor(cy / CELL)
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null
    return { col, row, px: cx, py: cy }
  }, [])

  const handleMouseMove = useCallback(e => {
    const tile = getTile(e)
    setHoverTile(tile ? { col: tile.col, row: tile.row } : null)
  }, [getTile])

  const handleMouseLeave = useCallback(() => setHoverTile(null), [])

  const handleClick = useCallback(e => {
    const game = gameRef.current; if (!game) return
    const tile = getTile(e); if (!tile) return
    const { col, row } = tile

    const existing = game.towers.find(t => t.col===col && t.row===row)

    if (selTypeRef.current && !existing && !PATH_TILES.has(`${col},${row}`)) {
      const cost = TOWER_MAP[selTypeRef.current].cost
      if (game.gold < cost) return
      game.gold -= cost
      game.towers.push({ id: uid(), type: selTypeRef.current, col, row, level: 0, lastShot: 0, invested: cost })
      setGold(game.gold)
      setSelType(null)
      return
    }

    if (existing) {
      setInspected(id => id === existing.id ? null : existing.id)
      setSelType(null)
      return
    }

    setInspected(null)
  }, [getTile])

  const handleRightClick = useCallback(e => {
    e.preventDefault()
    setSelType(null); setInspected(null)
  }, [])

  // ── Upgrade / sell ────────────────────────────────────────────────
  const upgradeInspected = useCallback(() => {
    const game = gameRef.current; if (!game) return
    const t = game.towers.find(t => t.id === inspected); if (!t || t.level >= 2) return
    const cost = upgradeCost(t.type, t.level)
    if (game.gold < cost) return
    game.gold -= cost
    t.level++
    t.invested = (t.invested || TOWER_MAP[t.type].cost) + cost
    setGold(game.gold)
    forceUpdate(n => n+1)
  }, [inspected])

  const sellInspected = useCallback(() => {
    const game = gameRef.current; if (!game) return
    const t = game.towers.find(t => t.id === inspected); if (!t) return
    const refund = Math.floor((t.invested || TOWER_MAP[t.type].cost) * 0.5)
    game.gold += refund
    game.towers = game.towers.filter(x => x.id !== t.id)
    setGold(game.gold)
    setInspected(null)
    forceUpdate(n => n+1)
  }, [inspected])

  // ── Start / restart ───────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    newGame()
    setGold(150); setLives(15); setWave(0)
    setPhase('between'); setSelType(null); setInspected(null)
    startLoop()
  }, [newGame, startLoop])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (gameRef.current) gameRef.current.running = false
    }
  }, [])

  // ── Render ────────────────────────────────────────────────────────
  const inspectedTower = inspected ? gameRef.current?.towers.find(t => t.id === inspected) : null
  const tDef = inspectedTower ? TOWER_MAP[inspectedTower.type] : null
  const stats = inspectedTower ? towerStats(inspectedTower.type, inspectedTower.level) : null

  const shopTower = hoverType ? TOWER_MAP[hoverType] : null

  return (
    <div className="td-wrapper">
      <div className="td-left">
        <button className="back-btn td-back" onClick={() => {
          if (rafRef.current) cancelAnimationFrame(rafRef.current)
          if (gameRef.current) gameRef.current.running = false
          onBack()
        }}>← Terug</button>

        <div className="td-hud">
          <div className="td-hud-item">
            <span className="td-hud-icon">❤️</span>
            <span className="td-hud-val" style={{ color: lives <= 5 ? '#ff6b6b' : '#fff' }}>{lives}</span>
          </div>
          <div className="td-hud-item">
            <span className="td-hud-icon">🪙</span>
            <span className="td-hud-val" style={{ color: '#FFD23F' }}>{gold}</span>
          </div>
          <div className="td-hud-item">
            <span className="td-hud-icon">🌊</span>
            <span className="td-hud-val">{wave === 0 ? '—' : wave}</span>
          </div>
        </div>

        <canvas
          ref={canvasRef} width={CW} height={CH}
          className="td-canvas"
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleRightClick}
        />

        {phase === 'gameover' && (
          <div className="td-overlay">
            <div className="td-overlay-card">
              <div style={{ fontSize:'4rem' }}>💀</div>
              <h2 style={{ color:'#ff6b6b', margin:'8px 0' }}>Game Over</h2>
              <p style={{ color:'rgba(255,255,255,0.6)', marginBottom:20 }}>Je hebt golf {wave} gehaald</p>
              <button className="td-btn td-btn-gold" onClick={startGame}>🔄 Opnieuw</button>
              <button className="td-btn td-btn-ghost" onClick={onBack}>← Menu</button>
            </div>
          </div>
        )}
        {phase === 'idle' && (
          <div className="td-overlay">
            <div className="td-overlay-card">
              <div style={{ fontSize:'3.5rem' }}>🏰</div>
              <h2 style={{ color:'#FFD23F', margin:'8px 0' }}>Tower Defense</h2>
              <p style={{ color:'rgba(255,255,255,0.55)', marginBottom:20 }}>
                Zet dieren neer langs het pad.<br/>Verdedig je basis!
              </p>
              <button className="td-btn td-btn-gold" onClick={startGame}>▶ Spelen</button>
              <button className="td-btn td-btn-ghost" onClick={onBack}>← Menu</button>
            </div>
          </div>
        )}
      </div>

      <div className="td-sidebar">
        {/* Wave button */}
        <div className="td-wave-section">
          {phase === 'between' ? (
            <button className="td-btn td-btn-gold td-wave-btn" onClick={startWave}>
              ▶ Golf {wave + 1} starten
            </button>
          ) : phase === 'playing' ? (
            <div className="td-wave-info">Golf {wave} bezig…</div>
          ) : null}
        </div>

        {/* Inspect panel */}
        {inspectedTower && tDef && stats ? (
          <div className="td-inspect">
            <div className="td-inspect-header">
              <div style={{
                width:44, height:44, borderRadius:10, flexShrink:0,
                backgroundImage:"url('/Towerdefence.png')",
                backgroundSize:'220px 220px',
                backgroundPosition:`-${tDef.col*44}px -${tDef.row*44}px`,
              }} />
              <div>
                <div className="td-inspect-name">{tDef.name}</div>
                <div className="td-inspect-level">{'⭐'.repeat(inspectedTower.level + 1)}</div>
              </div>
            </div>
            <div className="td-stat-row"><span>💥 Schade</span><span>{Math.round(stats.damage)}</span></div>
            <div className="td-stat-row"><span>🎯 Bereik</span><span>{Math.round(stats.range)}</span></div>
            <div className="td-stat-row"><span>⚡ Snelheid</span><span>{stats.rate.toFixed(1)}/s</span></div>
            <div className="td-stat-row"><span>✨ Speciaal</span><span style={{ color:'#FFD23F', textTransform:'capitalize' }}>{tDef.special}</span></div>
            <div className="td-inspect-btns">
              {inspectedTower.level < 2 && (
                <button
                  className={`td-btn td-btn-upgrade ${gold < upgradeCost(inspectedTower.type, inspectedTower.level) ? 'td-btn-disabled' : ''}`}
                  onClick={upgradeInspected}
                >
                  ⬆ Upgrade 🪙{upgradeCost(inspectedTower.type, inspectedTower.level)}
                </button>
              )}
              {inspectedTower.level === 2 && <div className="td-max-badge">✅ Max level!</div>}
              <button className="td-btn td-btn-sell" onClick={sellInspected}>
                💰 Verkopen (🪙{Math.floor((inspectedTower.invested || tDef.cost) * 0.5)})
              </button>
            </div>
          </div>
        ) : (
          /* Shop */
          <div className="td-shop">
            <div className="td-shop-title">Dieren — klik om te plaatsen</div>
            <div className="td-shop-grid">
              {TOWERS.map(t => {
                const canAfford = gold >= t.cost
                return (
                  <button
                    key={t.key}
                    className={`td-shop-btn ${selType === t.key ? 'td-shop-selected' : ''} ${!canAfford ? 'td-shop-poor' : ''}`}
                    onClick={() => setSelType(k => k === t.key ? null : t.key)}
                    onMouseEnter={() => setHoverType(t.key)}
                    onMouseLeave={() => setHoverType(null)}
                    title={`${t.name} — 🪙${t.cost}`}
                  >
                    <div style={{
                      width:36, height:36, borderRadius:4, flexShrink:0,
                      backgroundImage:"url('/Towerdefence.png')",
                      backgroundSize:'180px 180px',
                      backgroundPosition:`-${t.col*36}px -${t.row*36}px`,
                    }} />
                    <span className="td-shop-price" style={{ color: canAfford ? '#FFD23F' : '#ff6b6b' }}>
                      {t.cost}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Tooltip */}
            {shopTower && (
              <div className="td-tooltip">
                <div className="td-tooltip-name">{shopTower.name}</div>
                <div className="td-tooltip-special" style={{ color: '#FFD23F' }}>✨ {shopTower.special}</div>
                <div className="td-tooltip-desc">{shopTower.desc}</div>
                <div className="td-tooltip-stats">
                  💥{shopTower.damage} · 🎯{shopTower.range} · ⚡{shopTower.rate}/s
                </div>
                <div className="td-tooltip-cost">🪙 {shopTower.cost}</div>
              </div>
            )}
          </div>
        )}

        <div className="td-hint">
          {selType
            ? `Klik op een groen vakje om ${TOWER_MAP[selType].name} te plaatsen · Rechts = annuleer`
            : 'Klik op een geplaatst dier om te upgraden of verkopen'}
        </div>
      </div>
    </div>
  )
}
