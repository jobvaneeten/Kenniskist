import { useState, useRef, useEffect, useCallback } from 'react'
import * as PIXI from 'pixi.js'
import Matter from 'matter-js'
import { gsap } from 'gsap'
import {
  TOWERS, TOWER_MAP, LVL_DMG, LVL_RATE, LVL_RANGE,
  upgradeCost, ENEMY_TYPES, generateWave,
} from './td_data'
import { drawAnimal } from './td_sprites'
import {
  CW, CH, CELL, COLS, ROWS, SAVE_KEY, tx, ty, WAYPOINTS, PATH_TILES,
  uid, resetIds, setNextId, dist, towerStats, pathProgress,
  saveGame, loadSave, clearSave,
  getTowerTexture, buildStaticBg,
  updateEnemyGfx, drawProjectile, drawAnim,
  drawHoverPreview, drawInspectRange,
  createPhysicsEngine, shouldUsePhysics, createPhysicsProjectile,
} from './td_game'
import './towerdefense.css'

// ── Shop thumbnail component ──────────────────────────────────────────
function TowerThumb({ towerKey, size = 44 }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, size, size)
    draw2d(ctx, towerKey, size)
  }, [towerKey, size])
  return <canvas ref={ref} width={size} height={size} style={{ display:'block', width:size, height:size }} />
}

// ── 2D canvas animal drawing (for thumbnails, no white border) ─────────
function draw2d(ctx, key, s) {
  const r = s * 0.42
  const cx = s / 2, cy = s / 2
  const c = (x, y, rad, col, alpha = 1) => {
    ctx.globalAlpha = alpha
    ctx.fillStyle = col
    ctx.beginPath(); ctx.arc(cx+x, cy+y, rad, 0, Math.PI*2); ctx.fill()
  }
  const e = (x, y, w, h, col, alpha = 1) => {
    ctx.globalAlpha = alpha
    ctx.fillStyle = col
    ctx.beginPath(); ctx.ellipse(cx+x, cy+y, w, h, 0, 0, Math.PI*2); ctx.fill()
  }
  ctx.globalAlpha = 1

  if (key === 'lion') {
    // Mane
    ctx.fillStyle='#C07A20'; ctx.beginPath()
    for (let i=0;i<14;i++) {
      const a1=i/14*Math.PI*2, a2=(i+.5)/14*Math.PI*2
      const mr=r*1.22
      ctx.lineTo(cx+Math.cos(a1)*mr, cy+Math.sin(a1)*mr)
      ctx.lineTo(cx+Math.cos(a2)*mr*.78, cy+Math.sin(a2)*mr*.78)
    }
    ctx.closePath(); ctx.fill()
    c(0,0,r,'#F5C542'); e(0,r*.2,r*.55,r*.45,'#FFE08A')
    c(-r*.32,-r*.15,r*.13,'#3B2000'); c(r*.32,-r*.15,r*.13,'#3B2000')
    e(0,r*.12,r*.2,r*.14,'#E08050')
  } else if (key === 'elephant') {
    e(-r*.9,0,r*.45,r*.65,'#90A0B0'); e(r*.9,0,r*.45,r*.65,'#90A0B0')
    c(0,0,r,'#8090A0')
    ctx.strokeStyle='#8090A0'; ctx.lineWidth=r*.22; ctx.lineCap='round'
    ctx.beginPath(); ctx.moveTo(cx,cy+r*.3)
    ctx.bezierCurveTo(cx+r*.1,cy+r*.7, cx+r*.45,cy+r*.9, cx+r*.3,cy+r*1.1)
    ctx.stroke(); ctx.lineWidth=1
    c(-r*.35,-r*.2,r*.12,'#1A1A1A'); c(r*.35,-r*.2,r*.12,'#1A1A1A')
  } else if (key === 'panda') {
    c(0,0,r,'#FFFFFF')
    e(-r*.38,-r*.18,r*.28,r*.22,'#222222'); e(r*.38,-r*.18,r*.28,r*.22,'#222222')
    c(-r*.38,-r*.2,r*.13,'#FFFFFF'); c(r*.38,-r*.2,r*.13,'#FFFFFF')
    c(-r*.35,-r*.18,r*.07,'#111111'); c(r*.35,-r*.18,r*.07,'#111111')
    c(-r*.62,-r*.7,r*.25,'#222222'); c(r*.62,-r*.7,r*.25,'#222222')
    e(0,r*.08,r*.18,r*.12,'#111111')
  } else if (key === 'monkey') {
    // Fur tufts ring
    ctx.fillStyle='#5A3015'
    for (let i=0;i<12;i++) {
      const a=i/12*Math.PI*2, sz=r*.22+(i%3)*r*.07
      ctx.beginPath(); ctx.arc(cx+Math.cos(a)*r*1.06, cy+Math.sin(a)*r*1.06, sz, 0, Math.PI*2); ctx.fill()
    }
    c(0,0,r,'#8B5E3C')
    c(-r*.85,-r*.1,r*.27,'#7A4E2A'); c(r*.85,-r*.1,r*.27,'#7A4E2A')
    c(-r*.85,-r*.1,r*.17,'#D4A070'); c(r*.85,-r*.1,r*.17,'#D4A070')
    e(0,r*.06,r*.72,r*.68,'#D4A070')
    // Eyebrows
    ctx.strokeStyle='#3A1800'; ctx.lineWidth=r*.07; ctx.beginPath()
    ctx.arc(cx-r*.28,cy-r*.3,r*.15,Math.PI,0,false); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx+r*.28,cy-r*.3,r*.15,Math.PI,0,false); ctx.stroke()
    // Amber eyes
    c(-r*.28,-r*.15,r*.16,'#1A1A1A'); c(r*.28,-r*.15,r*.16,'#1A1A1A')
    c(-r*.28,-r*.13,r*.1,'#8B5A10'); c(r*.28,-r*.13,r*.1,'#8B5A10')
    c(-r*.28,-r*.13,r*.055,'#1A1A1A'); c(r*.28,-r*.13,r*.055,'#1A1A1A')
    c(-r*.24,-r*.17,r*.04,'#FFFFFF'); c(r*.24,-r*.17,r*.04,'#FFFFFF')
    // Muzzle + teeth
    e(0,r*.28,r*.4,r*.3,'#E0B888')
    c(-r*.12,r*.26,r*.08,'#7A4020'); c(r*.12,r*.26,r*.08,'#7A4020')
    ctx.fillStyle='#FFFFFF'; ctx.beginPath(); ctx.roundRect?.(cx-r*.25,cy+r*.34,r*.5,r*.18,r*.04)||ctx.rect(cx-r*.25,cy+r*.34,r*.5,r*.18); ctx.fill()
    ctx.strokeStyle='#7A4020'; ctx.lineWidth=r*.045
    ctx.beginPath(); ctx.moveTo(cx-r*.25,cy+r*.43); ctx.lineTo(cx+r*.25,cy+r*.43); ctx.stroke()
    ctx.lineWidth=1
  } else if (key === 'tiger') {
    c(0,0,r,'#FF8C00'); e(0,r*.2,r*.5,r*.42,'#FFD090')
    ctx.fillStyle='#1A0A00'
    ctx.fillRect(cx-r*.08,cy-r*.9,r*.16,r*.5)
    c(-r*.3,-r*.2,r*.15,'#22EE44'); c(r*.3,-r*.2,r*.15,'#22EE44')
    c(-r*.3,-r*.2,r*.08,'#111111'); c(r*.3,-r*.2,r*.08,'#111111')
    ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=r*.04
    ctx.beginPath(); ctx.moveTo(cx-r*.18,cy+r*.18); ctx.lineTo(cx-r*.85,cy+r*.1); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx+r*.18,cy+r*.18); ctx.lineTo(cx+r*.85,cy+r*.1); ctx.stroke()
    ctx.lineWidth=1
  } else if (key === 'bear') {
    c(0,0,r,'#6B4226')
    c(-r*.62,-r*.68,r*.25,'#6B4226'); c(r*.62,-r*.68,r*.25,'#6B4226')
    c(-r*.62,-r*.68,r*.14,'#A07050'); c(r*.62,-r*.68,r*.14,'#A07050')
    e(0,r*.22,r*.4,r*.32,'#C09070')
    c(-r*.32,-r*.15,r*.13,'#1A1A1A'); c(r*.32,-r*.15,r*.13,'#1A1A1A')
    e(0,r*.12,r*.16,r*.11,'#1A1A1A')
  } else if (key === 'hippo') {
    e(0,0,r,r*.88,'#9090B8')
    e(0,r*.38,r*.5,r*.32,'#A0A0C0')
    c(-r*.18,r*.35,r*.1,'#6868A0'); c(r*.18,r*.35,r*.1,'#6868A0')
    c(-r*.35,-r*.35,r*.14,'#3A3A3A'); c(r*.35,-r*.35,r*.14,'#3A3A3A')
    c(-r*.65,-r*.55,r*.15,'#9090B8'); c(r*.65,-r*.55,r*.15,'#9090B8')
  } else if (key === 'rhino') {
    c(0,0,r,'#8A8A7A')
    ctx.fillStyle='#BBB8A0'
    ctx.beginPath(); ctx.moveTo(cx,cy-r*1.25); ctx.lineTo(cx-r*.15,cy-r*.75); ctx.lineTo(cx+r*.15,cy-r*.75); ctx.closePath(); ctx.fill()
    c(-r*.35,-r*.1,r*.12,'#2A2A2A'); c(r*.35,-r*.1,r*.12,'#2A2A2A')
    c(-r*.7,-r*.5,r*.18,'#8A8A7A'); c(r*.7,-r*.5,r*.18,'#8A8A7A')
    c(-r*.7,-r*.5,r*.1,'#D0C8A0'); c(r*.7,-r*.5,r*.1,'#D0C8A0')
  } else if (key === 'croc') {
    // Front-facing croc: body, lower jaw, belly, top scales, protruding eyes, teeth, nostrils
    e(0,0,r*.9,r*.8,'#2E8B57')
    e(0,r*.4,r*.7,r*.38,'#267A44')
    e(0,r*.18,r*.58,r*.62,'#A8D8A0')
    ctx.fillStyle='#1A6640'
    for(let i=-2;i<=2;i++){ctx.beginPath();ctx.ellipse(cx+i*r*.26,cy-r*.44,r*.12,r*.08,0,0,Math.PI*2);ctx.fill()}
    c(-r*.35,-r*.42,r*.18,'#1A6640'); c(r*.35,-r*.42,r*.18,'#1A6640')
    c(-r*.35,-r*.42,r*.12,'#DDCC00'); c(r*.35,-r*.42,r*.12,'#DDCC00')
    ctx.fillStyle='#111111'
    ctx.beginPath();ctx.ellipse(cx-r*.35,cy-r*.42,r*.04,r*.09,0,0,Math.PI*2);ctx.fill()
    ctx.beginPath();ctx.ellipse(cx+r*.35,cy-r*.42,r*.04,r*.09,0,0,Math.PI*2);ctx.fill()
    ctx.fillStyle='#FFFDE0'
    for(let i=0;i<4;i++){const tx2=cx-r*.42+i*r*.28;ctx.beginPath();ctx.moveTo(tx2,cy+r*.05);ctx.lineTo(tx2-r*.07,cy+r*.24);ctx.lineTo(tx2+r*.07,cy+r*.24);ctx.closePath();ctx.fill()}
    c(-r*.14,-r*.04,r*.07,'#1A5530'); c(r*.14,-r*.04,r*.07,'#1A5530')
  } else if (key === 'penguin') {
    c(0,0,r,'#1A1A2E')
    e(0,r*.15,r*.55,r*.7,'#F0F0FF')
    c(-r*.3,-r*.25,r*.18,'#FFFFFF'); c(r*.3,-r*.25,r*.18,'#FFFFFF')
    c(-r*.28,-r*.23,r*.1,'#1A1A2E'); c(r*.28,-r*.23,r*.1,'#1A1A2E')
    c(-r*.24,-r*.26,r*.04,'#FFFFFF'); c(r*.24,-r*.26,r*.04,'#FFFFFF')
    ctx.fillStyle='#FF8C00'
    ctx.beginPath(); ctx.moveTo(cx,cy+r*.02); ctx.lineTo(cx-r*.15,cy+r*.2); ctx.lineTo(cx+r*.15,cy+r*.2); ctx.closePath(); ctx.fill()
  } else if (key === 'hedgehog') {
    // Spikes on top: angles π→2π trace left→up→right (canvas y-down, 3π/2 = up)
    const sn = 14
    ctx.strokeStyle='#5C3A1E'; ctx.lineWidth=r*.12; ctx.lineCap='round'
    for(let i=0;i<=sn;i++){const a=Math.PI+(i/sn)*Math.PI;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r*.72,cy+Math.sin(a)*r*.72);ctx.lineTo(cx+Math.cos(a)*r*1.42,cy+Math.sin(a)*r*1.42);ctx.stroke()}
    ctx.lineWidth=1; ctx.lineCap='butt'
    c(0,0,r,'#8B6538')
    // Face = bottom half (0→π clockwise = bottom)
    ctx.fillStyle='#C8956C'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI,false); ctx.closePath(); ctx.fill()
    // Eyes above center, nose, smile
    c(-r*.3,-r*.18,r*.14,'#1A1A1A'); c(r*.3,-r*.18,r*.14,'#1A1A1A')
    c(0,r*.05,r*.12,'#2A1000')
    ctx.strokeStyle='#2A1000'; ctx.lineWidth=r*.065
    ctx.beginPath(); ctx.arc(cx,cy+r*.18,r*.18,Math.PI,0,false); ctx.stroke()
    ctx.lineWidth=1
  } else { // pig
    c(0,0,r,'#FFAEB5'); e(0,r*.18,r*.55,r*.45,'#FFD0D5')
    ctx.fillStyle='#FF9AA0'
    for (const side of [-1,1]) {
      ctx.beginPath(); ctx.moveTo(cx+side*r*.3,cy-r*.75); ctx.lineTo(cx+side*r*.62,cy-r*1.05); ctx.lineTo(cx+side*r*.7,cy-r*.65); ctx.closePath(); ctx.fill()
    }
    e(0,r*.3,r*.38,r*.28,'#FFB0B8')
    c(-r*.14,r*.3,r*.09,'#FF8090'); c(r*.14,r*.3,r*.09,'#FF8090')
    c(-r*.32,-r*.08,r*.13,'#2A1A1A'); c(r*.32,-r*.08,r*.13,'#2A1A1A')
  }
  ctx.globalAlpha = 1
}

// ── Main component ─────────────────────────────────────────────────────
export default function TowerDefenseGame({ onBack }) {
  const [gold,      setGold]      = useState(250)
  const [lives,     setLives]     = useState(20)
  const [wave,      setWave]      = useState(0)
  const [phase,     setPhase]     = useState('idle')
  const [selType,   setSelType]   = useState(null)
  const [inspected, setInspected] = useState(null)
  const [hoverType, setHoverType] = useState(null)
  const [hoverTile, setHoverTile] = useState(null)
  const [speed,     setSpeed]     = useState(1)
  const [hasSave,   setHasSave]   = useState(false)
  const [isFS,      setIsFS]      = useState(false)
  const [,          forceUpdate]  = useState(0)

  const containerRef  = useRef(null)
  const wrapperRef    = useRef(null)
  const pixiRef       = useRef(null)
  const gameRef       = useRef(null)
  const matterRef     = useRef(null)
  const physProjs     = useRef(new Map())   // projId -> Matter.Body
  const enemyGfxMap   = useRef(new Map())   // enemyId -> PIXI.Graphics
  const projGfxMap    = useRef(new Map())   // projId -> PIXI.Graphics
  const animGfxMap    = useRef(new Map())   // animId -> PIXI.Graphics
  const particleGfxs  = useRef([])          // [{p, gfx}]
  const towerSprites  = useRef(new Map())   // towerId -> PIXI.Container
  const selTypeRef    = useRef(null)
  const hoverTileRef  = useRef(null)
  const inspectedRef  = useRef(null)
  const speedRef      = useRef(1)
  const goldRef       = useRef(null)        // DOM ref for GSAP
  const livesRef      = useRef(null)
  const waveStartRef  = useRef(null)

  selTypeRef.current   = selType
  hoverTileRef.current = hoverTile
  inspectedRef.current = inspected
  speedRef.current     = speed

  // ── PixiJS init ──────────────────────────────────────────────────────
  useEffect(() => {
    const app = new PIXI.Application({
      width: CW, height: CH,
      backgroundAlpha: 0,
      resolution: 1,
      antialias: true,
    })
    app.view.className = 'td-canvas'
    containerRef.current.appendChild(app.view)

    // Layers (order = z-order)
    const bgSprite    = new PIXI.Sprite(buildStaticBg(app.renderer))
    const hoverLayer  = new PIXI.Graphics()
    const rangeLayer  = new PIXI.Graphics()
    const towerLayer  = new PIXI.Container()
    const enemyLayer  = new PIXI.Container()
    const projLayer   = new PIXI.Container()
    const animLayer   = new PIXI.Container()
    const partLayer   = new PIXI.Container()

    app.stage.addChild(bgSprite)
    app.stage.addChild(hoverLayer)
    app.stage.addChild(rangeLayer)
    app.stage.addChild(towerLayer)
    app.stage.addChild(enemyLayer)
    app.stage.addChild(projLayer)
    app.stage.addChild(animLayer)
    app.stage.addChild(partLayer)

    // Matter.js engine
    const physEngine = createPhysicsEngine()
    matterRef.current = physEngine

    pixiRef.current = { app, bgSprite, hoverLayer, rangeLayer, towerLayer, enemyLayer, projLayer, animLayer, partLayer }

    // ── Ticker ──────────────────────────────────────────────────────────
    let lastTs = performance.now()

    const tick = () => {
      const now = performance.now()
      const rawDt = Math.min((now - lastTs) / 1000, 0.05)
      lastTs = now
      const game = gameRef.current
      if (!game || !game.running) return

      const dt = rawDt * speedRef.current

      // Update matter.js physics
      Matter.Engine.update(physEngine, rawDt * 1000 * speedRef.current)

      // ── Spawn ────────────────────────────────────────────────────────
      if (game.waveActive && game.spawnQueue.length > 0) {
        game.spawnTimer -= dt
        if (game.spawnTimer <= 0) {
          const entry = game.spawnQueue.shift()
          const et = ENEMY_TYPES[entry.type]
          const e = {
            id: uid(), type: entry.type,
            x: WAYPOINTS[0].x, y: WAYPOINTS[0].y,
            hp: Math.round(et.baseHp * entry.hpScale),
            maxHp: Math.round(et.baseHp * entry.hpScale),
            speed: et.baseSpd * entry.spdScale,
            wpIdx: 1,
            effects: { slow: 0, poison: 0, poisonDmg: 0, stun: 0 },
            reward: et.reward, armor: et.armor,
          }
          game.enemies.push(e)
          // Create enemy graphics
          const gfx = new PIXI.Graphics()
          gfx.x = e.x; gfx.y = e.y
          enemyLayer.addChild(gfx)
          enemyGfxMap.current.set(e.id, gfx)
          game.spawnTimer = game.spawnQueue.length > 0 ? entry.delay * 0.5 : 0
        }
      }

      // ── Enemies ──────────────────────────────────────────────────────
      game.enemies = game.enemies.filter(e => {
        e.effects.slow   = Math.max(0, e.effects.slow   - dt)
        e.effects.stun   = Math.max(0, e.effects.stun   - dt)
        e.effects.poison = Math.max(0, e.effects.poison - dt)
        if (e.effects.poison > 0) {
          e.hp -= e.effects.poisonDmg * dt
          if (e.hp <= 0) {
            game.gold += e.reward
            spawnDeath(partLayer, e)
            handleSplitter(game, e)
            removeEnemyGfx(e.id)
            return false
          }
        }
        if (e.effects.stun > 0) {
          const gfx = enemyGfxMap.current.get(e.id)
          if (gfx) { updateEnemyGfx(gfx, e); gfx.x = e.x; gfx.y = e.y }
          return true
        }

        const spd = e.speed * (e.effects.slow > 0 ? 0.4 : 1)
        const wp = WAYPOINTS[e.wpIdx]
        if (!wp) {
          game.lives = Math.max(0, game.lives - 1)
          removeEnemyGfx(e.id)
          return false
        }
        const dx = wp.x - e.x, dy = wp.y - e.y, d = Math.sqrt(dx*dx+dy*dy)
        if (d < 4) {
          e.wpIdx++
          if (e.wpIdx >= WAYPOINTS.length) {
            game.lives = Math.max(0, game.lives - 1)
            removeEnemyGfx(e.id)
            if (livesRef.current) gsap.to(livesRef.current, { x: -4, duration: 0.05, yoyo: true, repeat: 5, ease: 'power1.inOut' })
            return false
          }
        } else {
          e.x += (dx/d)*spd*dt; e.y += (dy/d)*spd*dt
        }

        const gfx = enemyGfxMap.current.get(e.id)
        if (gfx) { updateEnemyGfx(gfx, e); gfx.x = e.x; gfx.y = e.y }
        return true
      })

      if (game.waveActive && game.spawnQueue.length===0 && game.enemies.length===0) {
        game.waveActive = false
        if (game.lives > 0) {
          saveGame(game, game.wave)
          setPhase('between')
        }
      }

      // ── Towers fire ──────────────────────────────────────────────────
      const nowSec = now / 1000
      game.towers.forEach(t => {
        const { damage, range, rate } = towerStats(t.type, t.level)
        const special   = TOWER_MAP[t.type].special
        const animType  = TOWER_MAP[t.type].animType
        if (nowSec - (t.lastShot||0) < 1/rate) return
        const inRange = game.enemies.filter(e => dist({ x:tx(t.col), y:ty(t.row) }, e) <= range)
        if (!inRange.length) return
        const target = inRange.reduce((a, b) => pathProgress(b) > pathProgress(a) ? b : a)
        if (!target) return
        t.lastShot = nowSec
        if (t.type === 'pig' && t.level > 0) {
          const sorted = [...inRange].sort((a,b) => pathProgress(b)-pathProgress(a))
          const numShots = 1 + t.level
          for (let s = 0; s < numShots; s++) doFire(game, t, sorted[s % sorted.length], damage, special, animType)
        } else {
          doFire(game, t, target, damage, special, animType)
        }
      })

      // ── Projectiles ──────────────────────────────────────────────────
      // Bounces pushed during filter would be lost (new array replaces old),
      // so collect them separately and merge afterwards.
      game._newProjs = []
      game.projectiles = game.projectiles.filter(p => {
        const target = game.enemies.find(e => e.id === p.targetId)
        const gfx = projGfxMap.current.get(p.id)

        // Physics-driven arc projectiles
        const body = physProjs.current.get(p.id)
        if (body) {
          p.x = body.position.x; p.y = body.position.y
          p.vx = body.velocity.x; p.vy = body.velocity.y
          // Bounce within screen bounds
          if (p.y > CH - 20) {
            Matter.Body.setPosition(body, { x: p.x, y: CH - 20 })
            Matter.Body.setVelocity(body, { x: p.vx * 0.8, y: -Math.abs(p.vy) * 0.6 })
          }
          if (gfx) { drawProjectile(gfx, p); gfx.x = p.x; gfx.y = p.y }
          // Hit detection by proximity
          if (target && dist(p, target) < 18 + (ENEMY_TYPES[target.type]?.radius||14)) {
            applyHit(game, p, target)
            spawnHit(partLayer, p)
            removeProjGfx(p.id)
            return false
          }
          // Time-based expiry
          p.life = (p.life||0) + dt
          if (p.life > 3.5) { removeProjGfx(p.id); return false }
          return true
        }

        // Standard homing projectiles
        if (!target) { removeProjGfx(p.id); return false }
        const dx = target.x-p.x, dy = target.y-p.y, d = Math.sqrt(dx*dx+dy*dy)
        p.vx = dx/d; p.vy = dy/d
        if (d < 12 + (ENEMY_TYPES[target.type]?.radius||14)) {
          applyHit(game, p, target)
          spawnHit(partLayer, p)
          removeProjGfx(p.id)
          return false
        }
        p.x += (dx/d)*320*dt; p.y += (dy/d)*320*dt
        if (gfx) { drawProjectile(gfx, p); gfx.x = p.x; gfx.y = p.y }
        return true
      })

      if (game._newProjs?.length) { game.projectiles.push(...game._newProjs); game._newProjs = [] }

      // ── Animations ───────────────────────────────────────────────────
      game.anims = game.anims.filter(a => {
        a.life -= dt
        const gfx = animGfxMap.current.get(a.id)
        if (!gfx) return false
        if (a.life <= 0) { removeAnimGfx(a.id); return false }
        const t = 1 - a.life / a.maxLife
        drawAnim(gfx, a, t)
        return true
      })

      // ── Particles ────────────────────────────────────────────────────
      particleGfxs.current = particleGfxs.current.filter(({ p, gfx }) => {
        p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 200*dt; p.life -= dt
        if (p.life <= 0) { partLayer.removeChild(gfx); gfx.destroy(); return false }
        gfx.alpha = Math.max(0, p.life / p.maxLife)
        gfx.x = p.x; gfx.y = p.y
        return true
      })

      // ── Hover & range preview ─────────────────────────────────────────
      const ht = hoverTileRef.current
      const st = selTypeRef.current
      if (st && ht) {
        const valid = !PATH_TILES.has(`${ht.col},${ht.row}`) && !game.towers.find(t => t.col===ht.col && t.row===ht.row)
        const base = TOWER_MAP[st]
        hoverLayer.clear()
        drawHoverPreview(hoverLayer, ht.col, ht.row, valid, base.range)
      } else {
        hoverLayer.clear()
      }
      drawInspectRange(rangeLayer, inspectedRef.current ? game.towers.find(t => t.id===inspectedRef.current) : null)

      // React state sync
      setGold(game.gold)
      setLives(game.lives)
      if (game.lives <= 0) { game.running = false; clearSave(); setPhase('gameover') }
    }

    app.ticker.add(tick)

    return () => {
      app.ticker.remove(tick)
      app.destroy(true, { children: true, texture: true })
      Matter.World.clear(physEngine.world)
      Matter.Engine.clear(physEngine)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Cleanup helpers ───────────────────────────────────────────────────
  function removeEnemyGfx(id) {
    const gfx = enemyGfxMap.current.get(id)
    if (gfx) { pixiRef.current?.enemyLayer.removeChild(gfx); gfx.destroy(); enemyGfxMap.current.delete(id) }
  }
  function removeProjGfx(id) {
    const gfx = projGfxMap.current.get(id)
    if (gfx) { pixiRef.current?.projLayer.removeChild(gfx); gfx.destroy(); projGfxMap.current.delete(id) }
    const body = physProjs.current.get(id)
    if (body) { Matter.Composite.remove(matterRef.current.world, body); physProjs.current.delete(id) }
  }
  function removeAnimGfx(id) {
    const gfx = animGfxMap.current.get(id)
    if (gfx) { pixiRef.current?.animLayer.removeChild(gfx); gfx.destroy(); animGfxMap.current.delete(id) }
  }

  // ── Particle helpers ──────────────────────────────────────────────────
  function spawnDeath(layer, e) {
    const col = parseInt(ENEMY_TYPES[e.type].color.slice(1), 16)
    for (let i = 0; i < 12; i++) {
      const a = (i/12)*Math.PI*2, spd = 70 + Math.random()*120
      const gfx = new PIXI.Graphics()
      gfx.beginFill(col); gfx.drawCircle(0,0, 3+Math.random()*4); gfx.endFill()
      layer.addChild(gfx)
      const p = { x: e.x, y: e.y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd-70, life: 0.8, maxLife: 0.8 }
      gfx.x = p.x; gfx.y = p.y
      particleGfxs.current.push({ p, gfx })
    }
    // Big flash ring
    const ring = new PIXI.Graphics()
    ring.lineStyle(3, col, 0.8); ring.drawCircle(0,0,5)
    ring.x = e.x; ring.y = e.y
    layer.addChild(ring)
    gsap.to(ring.scale, { x: 5, y: 5, duration: 0.35, ease: 'power2.out' })
    gsap.to(ring, { alpha: 0, duration: 0.35, ease: 'power2.out', onComplete: () => { layer.removeChild(ring); ring.destroy() } })
  }

  function spawnHit(layer, p) {
    const col = 0xFFFFFF
    for (let i = 0; i < 5; i++) {
      const a = Math.random()*Math.PI*2, spd = 40+Math.random()*70
      const gfx = new PIXI.Graphics()
      gfx.beginFill(col, 0.9); gfx.drawCircle(0,0,2); gfx.endFill()
      layer.addChild(gfx)
      const part = { x: p.x, y: p.y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd, life: 0.28, maxLife: 0.28 }
      gfx.x = part.x; gfx.y = part.y
      particleGfxs.current.push({ p: part, gfx })
    }
  }

  // ── Combat helpers ────────────────────────────────────────────────────
  function doFire(game, tower, target, damage, special, animType) {
    const ox = tx(tower.col), oy = ty(tower.row)
    const radMap = { lion:7, elephant:9, panda:5, monkey:7, tiger:4, bear:7, hippo:8, rhino:6, croc:7, penguin:6, hedgehog:5, pig:4 }
    const proj = {
      id: uid(), x: ox, y: oy, vx: 0, vy: 0,
      targetId: target.id, towerKey: tower.type,
      towerLevel: tower.level, towerId: tower.id,
      damage, special,
      radius: radMap[tower.type]||5,
      bounceLeft: special==='chain' ? (2 + tower.level) : 0,
      hitIds: new Set([target.id]),
    }
    game.projectiles.push(proj)

    // Create projectile graphics
    const gfx = new PIXI.Graphics()
    gfx.x = ox; gfx.y = oy
    pixiRef.current?.projLayer.addChild(gfx)
    projGfxMap.current.set(proj.id, gfx)

    // Physics for arc towers
    if (shouldUsePhysics(tower.type) && matterRef.current) {
      const body = createPhysicsProjectile(matterRef.current, proj, target.x, target.y)
      physProjs.current.set(proj.id, body)
    }

    // Animation effects
    const dur = 0.5
    const range = towerStats(tower.type, tower.level).range
    const newAnim = (type, ox2, oy2, tx2, ty2) => {
      const a = { id: uid(), type, x: ox2||ox, y: oy2||oy, ox: ox2||ox, oy: oy2||oy, tx: tx2||target.x, ty: ty2||target.y, r: range, life: dur, maxLife: dur }
      game.anims.push(a)
      const agfx = new PIXI.Graphics()
      agfx.x = a.x; agfx.y = a.y
      pixiRef.current?.animLayer.addChild(agfx)
      animGfxMap.current.set(a.id, agfx)
    }

    if (animType==='stomp'||animType==='roar'||animType==='wave') newAnim(animType)
    else if (animType==='shockwave'||animType==='spikes') newAnim(animType)
    else if (animType==='laser') {
      const a = { id: uid(), type: 'laser', ox, oy, tx: target.x, ty: target.y, r: 0, life: 0.3, maxLife: 0.3 }
      game.anims.push(a)
      const agfx = new PIXI.Graphics()
      agfx.x = 0; agfx.y = 0
      pixiRef.current?.animLayer.addChild(agfx)
      animGfxMap.current.set(a.id, agfx)
    }
    else if (animType==='horn') newAnim('horn', target.x, target.y, target.x, target.y)
    else if (animType==='freeze') newAnim('freeze', target.x, target.y, target.x, target.y)
    else if (animType==='acid') newAnim('acid', target.x, target.y, target.x, target.y)
    else if (animType==='bamboo') newAnim('bamboo', target.x, target.y, target.x, target.y)
  }

  function applyHit(game, proj, target) {
    const lvl = proj.towerLevel || 0
    const key = proj.towerKey

    // Damage (croc armor pierce scales with level)
    let dmg = proj.damage
    if (target.armor && proj.special==='poison') {
      dmg *= lvl>=2 ? 1 : lvl>=1 ? 0.5 : 0.1
    }
    target.hp -= dmg

    if (target.hp <= 0) {
      target.hp = 0
      game.gold += target.reward
      handleSplitter(game, target)
      game.enemies = game.enemies.filter(e => e.id !== target.id)
      removeEnemyGfx(target.id)
      if (goldRef.current) gsap.fromTo(goldRef.current, { scale: 1.25, color: '#FFD23F' }, { scale: 1, duration: 0.3, ease: 'back.out' })
    }

    // ── Base special effects (upgraded by level) ──────────────────────
    if (proj.special==='slow') {
      const dur = key==='panda' ? (lvl===2?6:lvl===1?4:2.5) : 2.5
      target.effects.slow = Math.max(target.effects.slow, dur)
      // Penguin lvl1+: full freeze (stun)
      if (key==='penguin' && lvl>=1) {
        target.effects.stun = Math.max(target.effects.stun, lvl===2?1.2:0.8)
      }
      // Penguin lvl2: freeze adjacent too
      if (key==='penguin' && lvl===2) {
        game.enemies.forEach(e => { if (e.id!==target.id && dist(e,target)<50) { e.effects.slow=6; e.effects.stun=0.8 } })
      }
    }

    if (proj.special==='stun') {
      const baseDur = key==='rhino' ? (lvl===2?1.5:lvl===1?0.9:0.7) : 0.7
      target.effects.stun = Math.max(target.effects.stun, baseDur)
      // Rhino lvl1+: also slow
      if (key==='rhino' && lvl>=1) target.effects.slow = Math.max(target.effects.slow, lvl===2?4:2)
      // Bear/Hedgehog lvl1+: area stun
      if ((key==='bear'||key==='hedgehog') && lvl>=1) {
        const aoeR = lvl===2 ? 70 : 50
        game.enemies.forEach(e => { if (e.id!==target.id && dist(e,target)<aoeR) e.effects.stun=Math.max(e.effects.stun,baseDur) })
      }
      // Hedgehog lvl2: also poison
      if (key==='hedgehog' && lvl===2) {
        const aoeR = 70
        game.enemies.forEach(e => { if (dist(e,target)<aoeR) { e.effects.poison=Math.max(e.effects.poison,3); e.effects.poisonDmg=Math.max(e.effects.poisonDmg,proj.damage*.3) } })
      }
    }

    if (proj.special==='poison') {
      const canPoison = !target.armor || lvl>=2 || (lvl===1 && Math.random()<0.5)
      if (canPoison) { target.effects.poison=Math.max(target.effects.poison,4); target.effects.poisonDmg=Math.max(target.effects.poisonDmg,proj.damage*.4) }
    }

    if (proj.special==='snipe') {
      // Tiger lvl1+: slow; lvl2: also stun
      if (lvl>=1) target.effects.slow = Math.max(target.effects.slow, lvl===2?3:1.5)
      if (lvl===2) target.effects.stun = Math.max(target.effects.stun, 0.4)
    }

    if (proj.special==='splash') {
      const splashR = key==='elephant'&&lvl===2 ? 100 : key==='hippo'&&lvl===2 ? 90 : 55
      const splashDmgMul = lvl===2 ? 0.85 : 0.6
      game.enemies.forEach(e => {
        if (e.id===target.id||proj.hitIds.has(e.id)) return
        if (dist(e,target)<splashR) {
          e.hp -= proj.damage*splashDmgMul; proj.hitIds.add(e.id)
          // Lion/Elephant/Hippo lvl1+: splash slows
          if (lvl>=1) { e.effects.slow = Math.max(e.effects.slow, key==='hippo'&&lvl===2?4:2) }
          // Lion lvl2 / Elephant lvl2: also stun
          if ((key==='lion'||key==='elephant') && lvl===2) e.effects.stun = Math.max(e.effects.stun, 0.5)
        }
      })
    }

    if (proj.special==='chain' && proj.bounceLeft>0) {
      const chainDmg = proj.damage * (key==='monkey'&&lvl===2 ? 0.85 : 0.7)
      const next = game.enemies.filter(e => !proj.hitIds.has(e.id) && dist(e,target)<90)
        .sort((a,b)=>dist(a,target)-dist(b,target))[0]
      if (next) {
        const bounce = { ...proj, id:uid(), x:target.x, y:target.y, targetId:next.id, damage:chainDmg, bounceLeft:proj.bounceLeft-1, hitIds:new Set([...proj.hitIds,next.id]) }
        // Push to pending queue — game.projectiles is being filtered right now
        // and would discard anything pushed to the old array
        ;(game._newProjs || game.projectiles).push(bounce)
        const bgfx = new PIXI.Graphics(); bgfx.x = bounce.x; bgfx.y = bounce.y
        pixiRef.current?.projLayer.addChild(bgfx)
        projGfxMap.current.set(bounce.id, bgfx)

        // Spawn electric chain arc animation
        const ca = { id:uid(), type:'chain', x:0, y:0, ox:target.x, oy:target.y, tx:next.x, ty:next.y, r:0, life:0.4, maxLife:0.4 }
        game.anims.push(ca)
        const cgfx = new PIXI.Graphics(); cgfx.x=0; cgfx.y=0
        pixiRef.current?.animLayer.addChild(cgfx)
        animGfxMap.current.set(ca.id, cgfx)
      }
    }
  }

  function handleSplitter(game, e) {
    if (e.type !== 'splitter') return
    const et = ENEMY_TYPES.mini
    for (let i=0;i<2;i++) {
      const mini = { id:uid(), type:'mini', x:e.x+(i===0?-8:8), y:e.y, hp:et.baseHp, maxHp:et.baseHp, speed:et.baseSpd, wpIdx:e.wpIdx, effects:{slow:0,poison:0,poisonDmg:0,stun:0}, reward:et.reward, armor:false }
      game.enemies.push(mini)
      const gfx = new PIXI.Graphics()
      gfx.x = mini.x; gfx.y = mini.y
      pixiRef.current?.enemyLayer.addChild(gfx)
      enemyGfxMap.current.set(mini.id, gfx)
    }
  }

  // ── Tower sprite helpers ───────────────────────────────────────────────
  function addTowerSprite(tower) {
    const pixi = pixiRef.current; if (!pixi) return
    const size = CELL - 6
    const tex = getTowerTexture(pixi.app.renderer, tower.type, size)
    const spr = new PIXI.Sprite(tex)
    spr.anchor.set(0.5)
    spr.x = tx(tower.col); spr.y = ty(tower.row)

    const cont = new PIXI.Container()
    cont.addChild(spr)
    cont.x = 0; cont.y = 0

    // Platform background circle (light, so tower blends in)
    const bg = new PIXI.Graphics()
    bg.beginFill(0xE0EAEF); bg.drawRoundedRect(tower.col*CELL+4, tower.row*CELL+4, CELL-8, CELL-8, 6); bg.endFill()

    pixi.towerLayer.addChild(bg)
    pixi.towerLayer.addChild(cont)
    towerSprites.current.set(tower.id, { cont, spr, bg })

    // Pop-in animation
    cont.scale.set(0.1)
    spr.scale.set(0.1)
    gsap.to(cont.scale, { x: 1, y: 1, duration: 0.35, ease: 'back.out(1.7)' })
    gsap.to(spr.scale, { x: 1, y: 1, duration: 0.35, ease: 'back.out(1.7)' })

    refreshTowerVisual(tower)
  }

  function refreshTowerVisual(tower) {
    const entry = towerSprites.current.get(tower.id); if (!entry) return
    const { cont, bg } = entry

    // Remove old border if any
    if (entry.border) { entry.border.parent?.removeChild(entry.border); entry.border.destroy(); delete entry.border }
    if (entry.stars) { entry.stars.parent?.removeChild(entry.stars); entry.stars.destroy(); delete entry.stars }

    if (tower.level >= 1) {
      const border = new PIXI.Graphics()
      if (tower.level === 1) {
        border.lineStyle(2, 0x4FC3F7, 0.9); border.drawRoundedRect(tower.col*CELL+2, tower.row*CELL+2, CELL-4, CELL-4, 8)
      } else {
        border.lineStyle(2.5, 0xFFD700, 0.9); border.drawRoundedRect(tower.col*CELL+1, tower.row*CELL+1, CELL-2, CELL-2, 9)
        const gemPos = [[tower.col*CELL+2,tower.row*CELL+2],[tower.col*CELL+CELL-4,tower.row*CELL+2],[tower.col*CELL+2,tower.row*CELL+CELL-4],[tower.col*CELL+CELL-4,tower.row*CELL+CELL-4]]
        border.beginFill(0xFFD700)
        gemPos.forEach(([gx,gy]) => border.drawCircle(gx,gy,3))
        border.endFill()
      }
      pixiRef.current?.towerLayer.addChild(border)
      entry.border = border

      // Stars text
      const style = new PIXI.TextStyle({ fontSize: 8+tower.level, fill: tower.level===2?0xFFD700:0x7fd4ff, dropShadow: true, dropShadowDistance: 1 })
      const stars = new PIXI.Text('★'.repeat(tower.level), style)
      stars.anchor.set(0.5, 0.5)
      stars.x = tx(tower.col); stars.y = tower.row*CELL + CELL - 7
      pixiRef.current?.towerLayer.addChild(stars)
      entry.stars = stars

      // Glow on upgrade
      gsap.to(border, { alpha: 0.5, duration: 0.4, yoyo: true, repeat: 3, onComplete: () => { border.alpha = 1 } })
    }
  }

  function removeTowerSprite(id) {
    const entry = towerSprites.current.get(id); if (!entry) return
    const { cont, bg, border, stars } = entry
    cont.parent?.removeChild(cont); cont.destroy({ children: true })
    bg.parent?.removeChild(bg); bg.destroy()
    border?.parent?.removeChild(border); border?.destroy()
    stars?.parent?.removeChild(stars); stars?.destroy()
    towerSprites.current.delete(id)
  }

  // ── Game management ────────────────────────────────────────────────────
  const newGame = useCallback(() => {
    resetIds()
    gameRef.current = {
      towers:[], enemies:[], projectiles:[], anims:[],
      gold: 250, lives: 20, wave: 0,
      spawnQueue:[], spawnTimer:0, waveActive:false,
      running: false, lastTs: null,
    }
  }, [])

  const applyLoad = useCallback(save => {
    resetIds()
    gameRef.current = {
      towers: save.towers.map(t => ({ ...t, lastShot:0 })),
      enemies:[], projectiles:[], anims:[],
      gold: save.gold, lives: save.lives, wave: save.wave,
      spawnQueue:[], spawnTimer:0, waveActive:false,
      running: false, lastTs: null,
    }
    setNextId(Math.max(...save.towers.map(t => t.id), 0) + 1)
    // Re-add tower sprites
    save.towers.forEach(t => addTowerSprite(t))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { newGame() }, [newGame])
  useEffect(() => { setHasSave(!!loadSave()) }, [])
  useEffect(() => {
    const h = () => setIsFS(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  // ── Fullscreen ─────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    const el = wrapperRef.current; if (!el) return
    document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.()
  }, [])

  // ── Wave start ─────────────────────────────────────────────────────────
  const startWave = useCallback(() => {
    const game = gameRef.current; if (!game) return
    const nextWave = game.wave + 1
    game.wave = nextWave; game.waveActive = true
    game.spawnQueue = generateWave(nextWave); game.spawnTimer = 0
    setWave(nextWave); setPhase('playing'); setInspected(null)
    if (!game.running) { game.running = true }
  }, [])

  // ── Start fresh / continue ─────────────────────────────────────────────
  function clearAllDisplayObjects() {
    // Clear all tracking maps
    enemyGfxMap.current.forEach(gfx => { gfx.parent?.removeChild(gfx); gfx.destroy() })
    enemyGfxMap.current.clear()
    projGfxMap.current.forEach(gfx => { gfx.parent?.removeChild(gfx); gfx.destroy() })
    projGfxMap.current.clear()
    animGfxMap.current.forEach(gfx => { gfx.parent?.removeChild(gfx); gfx.destroy() })
    animGfxMap.current.clear()
    particleGfxs.current.forEach(({ gfx }) => { gfx.parent?.removeChild(gfx); gfx.destroy() })
    particleGfxs.current = []
    towerSprites.current.forEach((_, id) => removeTowerSprite(id))
    physProjs.current.forEach(body => { try { Matter.Composite.remove(matterRef.current.world, body) } catch {} })
    physProjs.current.clear()
  }

  const startFresh = useCallback(() => {
    clearAllDisplayObjects()
    clearSave(); newGame()
    setGold(250); setLives(20); setWave(0)
    setPhase('between'); setSelType(null); setInspected(null); setHasSave(false)
    gameRef.current.running = true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newGame])

  const continueSave = useCallback(() => {
    const save = loadSave(); if (!save) return
    clearAllDisplayObjects()
    applyLoad(save)
    setGold(save.gold); setLives(save.lives); setWave(save.wave)
    setPhase('between'); setSelType(null); setInspected(null)
    gameRef.current.running = true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyLoad])

  // ── Canvas events ──────────────────────────────────────────────────────
  const getTile = useCallback(e => {
    const pixi = pixiRef.current; if (!pixi) return null
    const rect = pixi.app.view.getBoundingClientRect()
    const sx = CW / rect.width, sy = CH / rect.height
    const cx = (e.clientX - rect.left) * sx
    const cy = (e.clientY - rect.top) * sy
    const col = Math.floor(cx / CELL), row = Math.floor(cy / CELL)
    if (col<0||col>=COLS||row<0||row>=ROWS) return null
    return { col, row }
  }, [])

  const handleMouseMove = useCallback(e => {
    const t = getTile(e); setHoverTile(t ? { col:t.col, row:t.row } : null)
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
      const tower = { id:uid(), type:selTypeRef.current, col, row, level:0, lastShot:0, invested:cost }
      game.towers.push(tower)
      addTowerSprite(tower)
      setGold(game.gold); setSelType(null)
      return
    }
    if (existing) { setInspected(id => id===existing.id ? null : existing.id); setSelType(null); return }
    setInspected(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getTile])

  const handleRightClick = useCallback(e => { e.preventDefault(); setSelType(null); setInspected(null) }, [])
  const handleTouch = useCallback(e => {
    e.preventDefault()
    if (e.touches.length===1) handleClick({ clientX:e.touches[0].clientX, clientY:e.touches[0].clientY })
  }, [handleClick])

  // ── Upgrade / Sell ─────────────────────────────────────────────────────
  const upgradeInspected = useCallback(() => {
    const game = gameRef.current; if (!game) return
    const t = game.towers.find(t => t.id===inspected); if (!t||t.level>=2) return
    const cost = upgradeCost(t.type, t.level)
    if (game.gold < cost) return
    game.gold -= cost; t.level++; t.invested = (t.invested||TOWER_MAP[t.type].cost) + cost
    refreshTowerVisual(t)
    setGold(game.gold); forceUpdate(n => n+1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspected])

  const sellInspected = useCallback(() => {
    const game = gameRef.current; if (!game) return
    const t = game.towers.find(t => t.id===inspected); if (!t) return
    game.gold += Math.floor((t.invested||TOWER_MAP[t.type].cost)*.5)
    removeTowerSprite(t.id)
    game.towers = game.towers.filter(x => x.id !== t.id)
    setGold(game.gold); setInspected(null); forceUpdate(n => n+1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspected])

  // Cleanup on unmount
  useEffect(() => () => {
    if (gameRef.current) gameRef.current.running = false
  }, [])

  // ── GSAP wave button pulse ─────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'between' && waveStartRef.current) {
      gsap.fromTo(waveStartRef.current,
        { boxShadow: '0 0 0 0 rgba(255,210,63,0.8)' },
        { boxShadow: '0 0 0 12px rgba(255,210,63,0)', duration: 1, repeat: -1, ease: 'power2.out' }
      )
    }
    return () => { if (waveStartRef.current) gsap.killTweensOf(waveStartRef.current) }
  }, [phase])

  // ── Render ─────────────────────────────────────────────────────────────
  const inspTower = inspected ? gameRef.current?.towers.find(t => t.id===inspected) : null
  const tDef      = inspTower ? TOWER_MAP[inspTower.type] : null
  const stats     = inspTower ? towerStats(inspTower.type, inspTower.level) : null
  const shopTower = hoverType ? TOWER_MAP[hoverType] : null

  return (
    <div className="td-outer" ref={wrapperRef}>
      <div className="td-layout">
        <div className="td-left">
          {/* HUD */}
          <div className="td-hud">
            <button className="back-btn td-back-inline" onClick={() => {
              if (gameRef.current) gameRef.current.running = false
              onBack()
            }}>← Terug</button>
            <div className="td-hud-item">
              <span className="td-hud-icon">❤️</span>
              <span ref={livesRef} className="td-hud-val" style={{ color: lives<=5?'#ff6b6b':'#fff' }}>{lives}</span>
            </div>
            <div className="td-hud-item">
              <span className="td-hud-icon">🪙</span>
              <span ref={goldRef} className="td-hud-val" style={{ color:'#FFD23F', display:'inline-block' }}>{gold}</span>
            </div>
            <div className="td-hud-item">
              <span className="td-hud-icon">🌊</span>
              <span className="td-hud-val">{wave===0?'—':wave}</span>
            </div>
            <div style={{ marginLeft:'auto', display:'flex', gap:4, alignItems:'center' }}>
              {[1,2,3].map(s => (
                <button key={s} className={`td-speed-btn ${speed===s?'td-speed-active':''}`}
                  onClick={() => { setSpeed(s); speedRef.current=s }}>
                  {'▶'.repeat(s)}
                </button>
              ))}
              <button className="td-speed-btn" onClick={toggleFullscreen} title="Volledig scherm">
                {isFS?'⊡':'⛶'}
              </button>
            </div>
          </div>

          {/* PixiJS canvas container */}
          <div
            ref={containerRef}
            style={{ position:'relative', lineHeight:0 }}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onContextMenu={handleRightClick}
            onTouchStart={handleTouch}
          />

          {/* Overlays */}
          {phase==='gameover' && (
            <div className="td-overlay">
              <div className="td-overlay-card">
                <div style={{fontSize:'4rem'}}>💀</div>
                <h2 style={{color:'#ff6b6b',margin:'8px 0'}}>Game Over</h2>
                <p style={{color:'rgba(255,255,255,0.6)',marginBottom:20}}>Je haalde golf {wave}</p>
                <button className="td-btn td-btn-gold" onClick={startFresh}>🔄 Opnieuw</button>
                <button className="td-btn td-btn-ghost" onClick={onBack}>← Menu</button>
              </div>
            </div>
          )}
          {phase==='idle' && (
            <div className="td-overlay">
              <div className="td-overlay-card">
                <div style={{fontSize:'3rem'}}>🏰</div>
                <h2 style={{color:'#FFD23F',margin:'8px 0'}}>Tower Defense</h2>
                <p style={{color:'rgba(255,255,255,0.55)',marginBottom:20}}>
                  Zet dieren neer langs het pad.<br/>Verdedig je basis!
                </p>
                {hasSave && (() => {
                  const save = loadSave()
                  return save ? (
                    <button className="td-btn td-btn-gold" onClick={continueSave}>
                      ▶ Doorgaan (golf {save.wave}) 🪙{save.gold}
                    </button>
                  ) : null
                })()}
                <button className="td-btn td-btn-ghost" onClick={startFresh}>
                  {hasSave?'🗑 Nieuw spel':'▶ Spelen'}
                </button>
                <button className="td-btn td-btn-ghost" style={{marginTop:4,fontSize:'0.75rem'}} onClick={onBack}>← Menu</button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="td-sidebar">
          <div className="td-wave-section">
            {phase==='between' ? (
              <button ref={waveStartRef} className="td-btn td-btn-gold td-wave-btn" onClick={startWave}>
                ▶ Golf {wave+1} starten
              </button>
            ) : phase==='playing' ? (
              <div className="td-wave-info">Golf {wave} bezig…</div>
            ) : null}
          </div>

          {inspTower && tDef && stats ? (
            <div className="td-inspect">
              <div className="td-inspect-header">
                {/* Inspect thumbnail: small canvas, no white border */}
                <div style={{
                  width:44, height:44, borderRadius:8, flexShrink:0, overflow:'hidden',
                  border: inspTower.level===1?'2px solid #4FC3F7':inspTower.level===2?'2px solid #FFD700':'2px solid rgba(255,255,255,0.15)',
                  boxShadow: inspTower.level===2?'0 0 10px #FFD700':inspTower.level===1?'0 0 8px #4FC3F7':'none',
                }}>
                  <TowerThumb towerKey={inspTower.type} size={44} />
                </div>
                <div>
                  <div className="td-inspect-name">{tDef.name}</div>
                  <div className="td-inspect-level">
                    {inspTower.level===0?'Basis':inspTower.level===1?'⭐ Level 2':'⭐⭐ Max!'}
                  </div>
                </div>
              </div>
              <div className="td-stat-row"><span>💥 Schade</span><span>{Math.round(stats.damage)}</span></div>
              <div className="td-stat-row"><span>🎯 Bereik</span><span>{Math.round(stats.range)}</span></div>
              <div className="td-stat-row"><span>⚡ Snelheid</span><span>{stats.rate.toFixed(1)}/s</span></div>
              <div className="td-stat-row"><span>✨ Kracht</span>
                <span style={{color:'#FFD23F',textTransform:'capitalize'}}>{tDef.special}</span></div>
              {inspTower.level<2 && (
                <div style={{fontSize:'0.68rem',color:'rgba(255,255,255,0.5)',padding:'5px 0 3px',lineHeight:1.35}}>
                  <span style={{color:inspTower.level===0?'#4FC3F7':'#FFD700',fontWeight:900}}>
                    {inspTower.level===0?'⭐ Level 2: ':'⭐⭐ Level 3: '}
                  </span>
                  {tDef[inspTower.level===0?'lvl1':'lvl2']}
                </div>
              )}
              <div className="td-inspect-btns">
                {inspTower.level<2 && (
                  <button
                    className={`td-btn td-btn-upgrade ${gold<upgradeCost(inspTower.type,inspTower.level)?'td-btn-disabled':''}`}
                    onClick={upgradeInspected}>
                    ⬆ Upgrade 🪙{upgradeCost(inspTower.type,inspTower.level)}
                  </button>
                )}
                {inspTower.level===2 && <div className="td-max-badge">✅ Max level!</div>}
                <button className="td-btn td-btn-sell" onClick={sellInspected}>
                  💰 Verkopen (🪙{Math.floor((inspTower.invested||tDef.cost)*.5)})
                </button>
              </div>
            </div>
          ) : (
            <div className="td-shop">
              <div className="td-shop-title">Dieren — klik om te plaatsen</div>
              <div className="td-shop-grid">
                {TOWERS.map(t => {
                  const canAfford = gold >= t.cost
                  const isPremium = t.cost >= 250
                  return (
                    <button key={t.key}
                      className={`td-shop-btn ${selType===t.key?'td-shop-selected':''} ${!canAfford?'td-shop-poor':''} ${isPremium?'td-shop-premium':''}`}
                      onClick={() => setSelType(k => k===t.key ? null : t.key)}
                      onMouseEnter={() => setHoverType(t.key)}
                      onMouseLeave={() => setHoverType(null)}
                      title={`${t.name} — 🪙${t.cost}`}
                    >
                      <TowerThumb towerKey={t.key} size={44} />
                      <span className="td-shop-label">{t.name}</span>
                      <span className="td-shop-price" style={{ color: canAfford?'#FFD23F':'#ff6b6b' }}>
                        🪙{t.cost}
                      </span>
                    </button>
                  )
                })}
              </div>
              {shopTower && (
                <div className="td-tooltip">
                  <div className="td-tooltip-name">{shopTower.name}</div>
                  <div className="td-tooltip-special" style={{color:'#FFD23F'}}>✨ {shopTower.special}</div>
                  <div className="td-tooltip-desc">{shopTower.desc}</div>
                  <div className="td-tooltip-stats">💥{shopTower.damage} · 🎯{shopTower.range} · ⚡{shopTower.rate}/s</div>
                  <div className="td-tooltip-cost">🪙 {shopTower.cost}</div>
                </div>
              )}
            </div>
          )}

          <div className="td-hint">
            {selType
              ? `Klik op groen vakje om ${TOWER_MAP[selType].name} te plaatsen · Rechts = stop`
              : 'Klik op een dier om te upgraden of verkopen'}
          </div>
        </div>
      </div>
    </div>
  )
}
