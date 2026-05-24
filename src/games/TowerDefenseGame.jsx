import { useState, useRef, useEffect, useCallback } from 'react'
import { TOWERS, TOWER_MAP, LVL_DMG, LVL_RATE, LVL_RANGE, upgradeCost, ENEMY_TYPES, generateWave } from './td_data'
import './towerdefense.css'

// ── Constants ─────────────────────────────────────────────────────────
const CW   = 720
const CH   = 480
const CELL = 40
const COLS = 18
const ROWS = 12
const SAVE_KEY = 'td_kenniskist_save'

const tx = c => c * CELL + CELL / 2
const ty = r => r * CELL + CELL / 2

// ── Path ──────────────────────────────────────────────────────────────
const BEND_TILES = [[0,2],[4,2],[4,8],[10,8],[10,2],[14,2],[14,9],[17,9]]
const WAYPOINTS = [
  { x: -CELL,     y: ty(2) },
  ...BEND_TILES.map(([c,r]) => ({ x: tx(c), y: ty(r) })),
  { x: CW + CELL, y: ty(9) },
]

function computePathTiles() {
  const segs = [
    [[0,2],[4,2]],[[4,2],[4,8]],[[4,8],[10,8]],
    [[10,8],[10,2]],[[10,2],[14,2]],[[14,2],[14,9]],[[14,9],[17,9]],
  ]
  const s = new Set()
  for (const [[c1,r1],[c2,r2]] of segs) {
    if (c1 === c2) for (let r = Math.min(r1,r2); r <= Math.max(r1,r2); r++) s.add(`${c1},${r}`)
    else           for (let c = Math.min(c1,c2); c <= Math.max(c1,c2); c++) s.add(`${c},${r1}`)
  }
  return s
}
const PATH_TILES = computePathTiles()

// ── Static map decorations ────────────────────────────────────────────
function isOnPath(x, y) { return PATH_TILES.has(`${Math.floor(x/CELL)},${Math.floor(y/CELL)}`) }
function isTooClose(x, y, list, minD) { return list.some(o => Math.hypot(o.x-x, o.y-y) < minD) }

const DECO_TREES = (() => {
  const pts = []
  const candidates = [
    [1,0.5],[16.5,0.5],[16.5,11.5],[0.5,11.5],[1.5,5.5],[16,5.5],
    [6.5,0.5],[12,0.5],[6.5,11.5],[12,11.5],[2,10],[16,10],
    [6,5],[8,5],[12,5],[2,4],[5.5,10.5],[11.5,1],
  ]
  for (const [cx,cy] of candidates) {
    const x = cx*CELL, y = cy*CELL
    if (!isOnPath(x,y) && !isTooClose(x,y,pts,30)) {
      pts.push({ x, y, r: 13+Math.floor((cx*7+cy*3)%8), dark: (cx+cy)%3===0 })
    }
  }
  return pts
})()

const DECO_FLOWERS = (() => {
  const pts = []
  for (let i = 0; i < 55; i++) {
    const x = (i*211+60) % CW, y = (i*163+80) % CH
    if (!isOnPath(x,y) && !isTooClose(x,y,DECO_TREES,18) && !isTooClose(x,y,pts,14)) {
      const colors = ['#FF9BE8','#FFD23F','#FF7B7B','#B8F0A0','#7fd4ff','#FFAA55']
      pts.push({ x, y, color: colors[i%6], r: 2+(i%3) })
    }
  }
  return pts
})()

const DECO_ROCKS = (() => {
  const pts = []
  for (let i = 0; i < 20; i++) {
    const x = (i*277+100)%CW, y = (i*191+130)%CH
    if (!isOnPath(x,y) && !isTooClose(x,y,DECO_TREES,20) && !isTooClose(x,y,pts,25)) {
      pts.push({ x, y, w: 6+(i%5), h: 4+(i%3) })
    }
  }
  return pts
})()

// ── Helpers ───────────────────────────────────────────────────────────
let _nextId = 1
const uid = () => _nextId++
function dist(a, b) { return Math.hypot(a.x-b.x, a.y-b.y) }

function towerStats(key, level) {
  const base = TOWER_MAP[key]
  return {
    damage: base.damage * LVL_DMG[level],
    range:  base.range  * LVL_RANGE[level],
    rate:   base.rate   * LVL_RATE[level],
  }
}

function pathProgress(e) {
  return e.wpIdx * 10000 + (e.wpIdx < WAYPOINTS.length ? (WAYPOINTS[e.wpIdx].x - e.x) : 0)
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r)
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r)
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r)
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r)
  ctx.closePath()
}

function lighten(hex, amt) {
  const n = parseInt(hex.slice(1),16)
  const r = Math.min(255,(n>>16)+amt), g = Math.min(255,((n>>8)&0xff)+amt), b = Math.min(255,(n&0xff)+amt)
  return `rgb(${r},${g},${b})`
}

// ── Save / Load ───────────────────────────────────────────────────────
function saveGame(game, wave) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      towers: game.towers.map(t => ({ id:t.id, type:t.type, col:t.col, row:t.row, level:t.level, invested:t.invested })),
      gold: game.gold, lives: game.lives, wave, savedAt: Date.now(),
    }))
  } catch {}
}

function loadSave() {
  try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null } catch { return null }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY) } catch {} }

// ── Drawing ───────────────────────────────────────────────────────────

function drawMapBackground(ctx) {
  // Rich grass base
  const gGrass = ctx.createLinearGradient(0,0,CW,CH)
  gGrass.addColorStop(0,'#5eb84d')
  gGrass.addColorStop(0.5,'#68c457')
  gGrass.addColorStop(1,'#4da03e')
  ctx.fillStyle = gGrass
  ctx.fillRect(0,0,CW,CH)

  // Darker border shadow
  const gBorder = ctx.createLinearGradient(0,0,0,30)
  gBorder.addColorStop(0,'rgba(0,0,0,0.15)')
  gBorder.addColorStop(1,'transparent')
  ctx.fillStyle = gBorder; ctx.fillRect(0,0,CW,30)
  const gBottom = ctx.createLinearGradient(0,CH-30,0,CH)
  gBottom.addColorStop(0,'transparent'); gBottom.addColorStop(1,'rgba(0,0,0,0.15)')
  ctx.fillStyle = gBottom; ctx.fillRect(0,CH-30,CW,30)
}

function drawPath(ctx) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!PATH_TILES.has(`${c},${r}`)) continue
      const px = c*CELL, py = r*CELL
      // Shadow edge
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.fillRect(px,py,CELL,CELL)
      // Dirt base
      ctx.fillStyle = '#c4975a'
      ctx.fillRect(px+1,py+1,CELL-2,CELL-2)
      // Worn center
      ctx.fillStyle = '#b8894e'
      ctx.fillRect(px+3,py+3,CELL-6,CELL-6)
      // Random stone-like patches
      const seed = c*17+r*31
      if (seed%5===0) {
        ctx.fillStyle = 'rgba(100,70,30,0.2)'
        ctx.beginPath(); ctx.ellipse(px+CELL*0.3,py+CELL*0.6,5,3,0.5,0,Math.PI*2); ctx.fill()
      }
      if (seed%7===2) {
        ctx.fillStyle = 'rgba(180,150,90,0.3)'
        ctx.beginPath(); ctx.ellipse(px+CELL*0.7,py+CELL*0.35,4,3,0.8,0,Math.PI*2); ctx.fill()
      }
    }
  }
}

function drawDecorations(ctx) {
  // Grass blades (subtle)
  for (let i = 0; i < 180; i++) {
    const x = (i*137.5+23)%CW, y = (i*97.3+47)%CH
    if (isOnPath(x,y)) continue
    ctx.globalAlpha = 0.12 + (i%5)*0.03
    ctx.fillStyle = i%3===0 ? '#3a8830' : i%3===1 ? '#4aaa3a' : '#2d6a24'
    ctx.fillRect(x,y,1+i%2,3+i%4)
  }
  ctx.globalAlpha = 1

  // Rocks
  DECO_ROCKS.forEach(rock => {
    ctx.fillStyle = '#8a8a8a'
    ctx.beginPath(); ctx.ellipse(rock.x,rock.y,rock.w,rock.h,0.4,0,Math.PI*2); ctx.fill()
    ctx.fillStyle = '#aaaaaa'
    ctx.beginPath(); ctx.ellipse(rock.x-1,rock.y-1,rock.w*0.5,rock.h*0.5,0.4,0,Math.PI*2); ctx.fill()
  })

  // Flowers
  DECO_FLOWERS.forEach(f => {
    ctx.fillStyle = '#2a8a1a'; ctx.beginPath(); ctx.arc(f.x,f.y+f.r+2,2,0,Math.PI*2); ctx.fill()
    ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x,f.y,f.r*0.4,0,Math.PI*2); ctx.fill()
  })

  // Trees
  DECO_TREES.forEach(tree => {
    // Trunk
    ctx.fillStyle = '#7a4a1e'
    ctx.fillRect(tree.x-3,tree.y,6,tree.r*0.6)
    // Shadow
    ctx.globalAlpha = 0.2
    ctx.fillStyle = '#000'
    ctx.beginPath(); ctx.ellipse(tree.x+4,tree.y+2,tree.r*0.7,tree.r*0.35,0,0,Math.PI*2); ctx.fill()
    ctx.globalAlpha = 1
    // Canopy dark
    ctx.fillStyle = tree.dark ? '#2a6e18' : '#338a20'
    ctx.beginPath(); ctx.arc(tree.x,tree.y-tree.r*0.2,tree.r,0,Math.PI*2); ctx.fill()
    // Canopy highlight
    ctx.fillStyle = tree.dark ? '#3a9428' : '#4aab30'
    ctx.beginPath(); ctx.arc(tree.x-tree.r*0.25,tree.y-tree.r*0.45,tree.r*0.65,0,Math.PI*2); ctx.fill()
    // Top shine
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath(); ctx.arc(tree.x-tree.r*0.3,tree.y-tree.r*0.55,tree.r*0.35,0,Math.PI*2); ctx.fill()
  })
}

function drawPathArrows(ctx) {
  ctx.fillStyle = 'rgba(150,110,60,0.4)'
  ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (let c=1;c<=3;c++) ctx.fillText('›',tx(c),ty(2))
  for (let r=3;r<=7;r++) ctx.fillText('⌄',tx(4),ty(r))
  for (let c=5;c<=9;c++) ctx.fillText('›',tx(c),ty(8))
  for (let r=7;r>=3;r--) ctx.fillText('˄',tx(10),ty(r))
  for (let c=11;c<=13;c++) ctx.fillText('›',tx(c),ty(2))
  for (let r=3;r<=8;r++) ctx.fillText('⌄',tx(14),ty(r))
  for (let c=15;c<=16;c++) ctx.fillText('›',tx(c),ty(9))
}

function drawGrid(ctx) {
  ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.lineWidth = 1
  for (let c=0;c<=COLS;c++) { ctx.beginPath(); ctx.moveTo(c*CELL,0); ctx.lineTo(c*CELL,CH); ctx.stroke() }
  for (let r=0;r<=ROWS;r++) { ctx.beginPath(); ctx.moveTo(0,r*CELL); ctx.lineTo(CW,r*CELL); ctx.stroke() }
}

function drawTower(ctx, t, img, cellW, cellH, now) {
  const px = t.col*CELL, py = t.row*CELL
  const tDef = TOWER_MAP[t.type]

  // Level glow
  if (t.level === 1) { ctx.shadowColor = '#4FC3F7'; ctx.shadowBlur = 12 }
  if (t.level === 2) { ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 20 }

  // Platform
  if (t.level === 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    roundRect(ctx, px+4,py+4,CELL-8,CELL-8,6); ctx.fill()
  } else if (t.level === 1) {
    const g = ctx.createLinearGradient(px+4,py+4,px+CELL-4,py+CELL-4)
    g.addColorStop(0,'rgba(30,100,200,0.55)'); g.addColorStop(1,'rgba(10,50,120,0.55)')
    ctx.fillStyle = g; roundRect(ctx, px+4,py+4,CELL-8,CELL-8,7); ctx.fill()
  } else {
    const g = ctx.createLinearGradient(px+4,py+4,px+CELL-4,py+CELL-4)
    g.addColorStop(0,'rgba(220,170,20,0.65)'); g.addColorStop(1,'rgba(120,80,10,0.65)')
    ctx.fillStyle = g; roundRect(ctx, px+3,py+3,CELL-6,CELL-6,8); ctx.fill()
  }
  ctx.shadowBlur = 0

  // Sprite clipped to rounded rect
  if (img) {
    ctx.save()
    roundRect(ctx, px+4,py+4,CELL-8,CELL-8,6); ctx.clip()
    ctx.drawImage(img, tDef.col*cellW, tDef.row*cellH, cellW, cellH, px+3, py+3, CELL-6, CELL-6)
    ctx.restore()
  }

  // Level border
  if (t.level === 1) {
    ctx.strokeStyle = '#4FC3F7'; ctx.lineWidth = 2
    roundRect(ctx, px+2,py+2,CELL-4,CELL-4,8); ctx.stroke()
  } else if (t.level === 2) {
    // Animated dashed gold border
    const dash = now ? (Math.floor(now*4)%8) : 0
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2.5
    ctx.setLineDash([5,3]); ctx.lineDashOffset = -dash
    roundRect(ctx, px+1,py+1,CELL-2,CELL-2,9); ctx.stroke()
    ctx.setLineDash([]); ctx.lineDashOffset = 0
    // Extra gem corners
    const gemPos = [[px+2,py+2],[px+CELL-4,py+2],[px+2,py+CELL-4],[px+CELL-4,py+CELL-4]]
    ctx.fillStyle = '#FFD700'
    gemPos.forEach(([gx,gy]) => { ctx.beginPath(); ctx.arc(gx,gy,3,0,Math.PI*2); ctx.fill() })
  }

  // Stars
  if (t.level > 0) {
    ctx.fillStyle = t.level===2 ? '#FFD700' : '#7fd4ff'
    ctx.font = `${8+t.level}px Arial`
    ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.shadowColor='#000'; ctx.shadowBlur=3
    ctx.fillText('★'.repeat(t.level), px+CELL/2, py+CELL-7)
    ctx.shadowBlur=0
  }
}

function drawEnemy(ctx, e) {
  const { color, outline, radius } = ENEMY_TYPES[e.type]
  const r = radius

  ctx.fillStyle='rgba(0,0,0,0.18)'
  ctx.beginPath(); ctx.ellipse(e.x,e.y+r,r*0.9,r*0.35,0,0,Math.PI*2); ctx.fill()

  const g = ctx.createRadialGradient(e.x-r*0.3,e.y-r*0.3,1,e.x,e.y,r)
  g.addColorStop(0,lighten(color,40)); g.addColorStop(1,color)
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(e.x,e.y,r,0,Math.PI*2); ctx.fill()
  ctx.strokeStyle=outline; ctx.lineWidth=2
  ctx.beginPath(); ctx.arc(e.x,e.y,r,0,Math.PI*2); ctx.stroke()

  const eyeR=r*0.22,eOX=r*0.32,eOY=r*-0.15
  ctx.fillStyle='#fff'
  ctx.beginPath(); ctx.arc(e.x-eOX,e.y+eOY,eyeR,0,Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(e.x+eOX,e.y+eOY,eyeR,0,Math.PI*2); ctx.fill()
  ctx.fillStyle='#222'
  ctx.beginPath(); ctx.arc(e.x-eOX+1,e.y+eOY+1,eyeR*0.55,0,Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(e.x+eOX+1,e.y+eOY+1,eyeR*0.55,0,Math.PI*2); ctx.fill()

  if (e.type==='armored') {
    ctx.strokeStyle='rgba(200,220,255,0.6)'; ctx.lineWidth=3
    ctx.beginPath(); ctx.arc(e.x,e.y,r+2,0,Math.PI*2); ctx.stroke()
  }
  if (e.effects.slow>0) {
    ctx.strokeStyle='rgba(100,180,255,0.55)'; ctx.lineWidth=2.5; ctx.setLineDash([3,3])
    ctx.beginPath(); ctx.arc(e.x,e.y,r+3,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([])
  }
  if (e.effects.poison>0) {
    ctx.fillStyle='rgba(100,200,60,0.7)'
    ctx.beginPath(); ctx.arc(e.x+r*0.5,e.y-r*0.8,3,0,Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.arc(e.x-r*0.4,e.y-r*1.0,2,0,Math.PI*2); ctx.fill()
  }
  if (e.effects.stun>0) {
    ctx.fillStyle='#FFD700'
    ctx.font='10px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillText('★',e.x,e.y-r-8)
  }

  const bw=r*2+4,bh=5,bx=e.x-bw/2,by=e.y-r-12
  ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(bx-1,by-1,bw+2,bh+2)
  ctx.fillStyle='#444'; ctx.fillRect(bx,by,bw,bh)
  const pct=Math.max(0,e.hp/e.maxHp)
  ctx.fillStyle=pct>0.5?'#3e3':pct>0.25?'#ee3':'#e33'
  ctx.fillRect(bx,by,bw*pct,bh)
}

function drawProjectile(ctx, p) {
  const angle = Math.atan2(p.vy || 0, p.vx || 1)
  const r = p.radius
  ctx.save()
  ctx.translate(p.x, p.y)

  switch (p.towerKey) {

    case 'lion': { // Vurige oranje vuurbal
      ctx.shadowColor='#FF4500'; ctx.shadowBlur=14
      const fg = ctx.createRadialGradient(-r*0.3,-r*0.3,0,0,0,r*1.2)
      fg.addColorStop(0,'#FFFFFF'); fg.addColorStop(0.25,'#FFD700')
      fg.addColorStop(0.6,'#FF6B35'); fg.addColorStop(1,'rgba(200,30,0,0.7)')
      ctx.fillStyle=fg; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill()
      // Vlam tong
      ctx.fillStyle='rgba(255,200,0,0.5)'
      ctx.beginPath(); ctx.ellipse(-r*0.5,-r*0.4,r*0.35,r*0.2,0.5,0,Math.PI*2); ctx.fill()
      break
    }

    case 'elephant': { // Bruine rotsblok
      ctx.shadowColor='#5C3A1E'; ctx.shadowBlur=8
      ctx.fillStyle='#8B6914'
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill()
      // Donkere rand
      ctx.strokeStyle='#4A2E00'; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke()
      // Barsten
      ctx.strokeStyle='rgba(40,20,0,0.6)'; ctx.lineWidth=1.2
      ctx.beginPath(); ctx.moveTo(-r*0.3,r*0.1); ctx.lineTo(r*0.2,-r*0.3); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(r*0.1,r*0.3); ctx.lineTo(-r*0.2,r*0.5); ctx.stroke()
      // Licht vlekje
      ctx.fillStyle='rgba(200,160,80,0.45)'
      ctx.beginPath(); ctx.ellipse(-r*0.3,-r*0.35,r*0.35,r*0.22,0.4,0,Math.PI*2); ctx.fill()
      break
    }

    case 'panda': { // Groene bamboestok
      ctx.rotate(angle)
      ctx.shadowColor='#2E7D32'; ctx.shadowBlur=6
      // Stok
      ctx.fillStyle='#4CAF50'
      ctx.fillRect(-r*2.2,-r*0.45,r*4.4,r*0.9)
      // Segmenten
      ctx.strokeStyle='#2E7D32'; ctx.lineWidth=1.8
      ctx.beginPath(); ctx.moveTo(-r*0.6,-r*0.5); ctx.lineTo(-r*0.6,r*0.5); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(r*0.6,-r*0.5); ctx.lineTo(r*0.6,r*0.5); ctx.stroke()
      // Punt
      ctx.fillStyle='#1B5E20'
      ctx.beginPath(); ctx.moveTo(r*2.2,-r*0.45); ctx.lineTo(r*3,0); ctx.lineTo(r*2.2,r*0.45); ctx.closePath(); ctx.fill()
      // Glans
      ctx.fillStyle='rgba(255,255,255,0.25)'
      ctx.fillRect(-r*1.8,-r*0.4,r*3.6,r*0.22)
      break
    }

    case 'monkey': { // Kokosnoot met 3 vlekken
      ctx.shadowColor='#6D3B1E'; ctx.shadowBlur=7
      ctx.fillStyle='#8B5E3C'; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill()
      ctx.strokeStyle='#5C3317'; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke()
      // 3 donkere ogen in driehoek
      ctx.fillStyle='rgba(25,10,0,0.85)'
      const sa=[Math.PI*1.5, Math.PI*1.5+Math.PI*2/3, Math.PI*1.5+Math.PI*4/3]
      sa.forEach(a => { ctx.beginPath(); ctx.arc(Math.cos(a)*r*0.42,Math.sin(a)*r*0.42,r*0.2,0,Math.PI*2); ctx.fill() })
      // Glans
      ctx.fillStyle='rgba(220,180,130,0.35)'
      ctx.beginPath(); ctx.ellipse(-r*0.28,-r*0.32,r*0.28,r*0.18,0.4,0,Math.PI*2); ctx.fill()
      break
    }

    case 'tiger': { // Gouden laserbead met sleepspoor
      ctx.shadowColor='#FFD700'; ctx.shadowBlur=22
      // Spoor
      ctx.strokeStyle='rgba(255,200,0,0.35)'; ctx.lineWidth=r*0.8
      ctx.lineCap='round'
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-Math.cos(angle)*24,-Math.sin(angle)*24); ctx.stroke()
      // Kern gloed
      const tg = ctx.createRadialGradient(0,0,0,0,0,r*2)
      tg.addColorStop(0,'#FFFFFF'); tg.addColorStop(0.3,'#FFE566'); tg.addColorStop(0.7,'#FFD700'); tg.addColorStop(1,'rgba(200,160,0,0)')
      ctx.fillStyle=tg; ctx.beginPath(); ctx.arc(0,0,r*2,0,Math.PI*2); ctx.fill()
      break
    }

    case 'bear': { // Gele ster/burst
      ctx.shadowColor='#FFD23F'; ctx.shadowBlur=12
      ctx.fillStyle='#FFD23F'
      const pts=6, out=r, inn=r*0.45
      ctx.beginPath()
      for(let i=0;i<pts*2;i++) {
        const rad=i%2===0?out:inn, ang=i*Math.PI/pts-Math.PI/2
        i===0?ctx.moveTo(Math.cos(ang)*rad,Math.sin(ang)*rad):ctx.lineTo(Math.cos(ang)*rad,Math.sin(ang)*rad)
      }
      ctx.closePath(); ctx.fill()
      ctx.fillStyle='rgba(255,255,200,0.6)'
      ctx.beginPath(); ctx.arc(0,0,r*0.35,0,Math.PI*2); ctx.fill()
      break
    }

    case 'rhino': { // Grijze hoorn/pijl
      ctx.rotate(angle)
      ctx.shadowColor='#AAB0B5'; ctx.shadowBlur=8
      const rg = ctx.createLinearGradient(-r,-r*0.6,r*1.8,0)
      rg.addColorStop(0,'#9BA0A5'); rg.addColorStop(0.5,'#C8CDD0'); rg.addColorStop(1,'#6c7275')
      ctx.fillStyle=rg
      ctx.beginPath()
      ctx.moveTo(r*1.8,0); ctx.lineTo(-r*0.6,r*0.7); ctx.lineTo(-r*0.3,0); ctx.lineTo(-r*0.6,-r*0.7)
      ctx.closePath(); ctx.fill()
      ctx.strokeStyle='#4a5055'; ctx.lineWidth=1; ctx.stroke()
      break
    }

    case 'hippo': { // Blauwe waterdruppel
      ctx.rotate(angle)
      ctx.shadowColor='#29B6F6'; ctx.shadowBlur=12
      const wg = ctx.createLinearGradient(-r,0,r*1.8,0)
      wg.addColorStop(0,'#B3E5FC'); wg.addColorStop(0.45,'#29B6F6'); wg.addColorStop(1,'#0277BD')
      ctx.fillStyle=wg
      ctx.beginPath()
      ctx.moveTo(r*1.8,0)
      ctx.bezierCurveTo(r*0.5,r*0.95,-r*1.1,r*0.75,-r*1.1,0)
      ctx.bezierCurveTo(-r*1.1,-r*0.75,r*0.5,-r*0.95,r*1.8,0)
      ctx.closePath(); ctx.fill()
      // Glans
      ctx.fillStyle='rgba(255,255,255,0.45)'
      ctx.beginPath(); ctx.ellipse(r*0.1,-r*0.22,r*0.38,r*0.2,-0.4,0,Math.PI*2); ctx.fill()
      break
    }

    case 'croc': { // Gifgroene zuurbol met bellen
      ctx.shadowColor='#00C853'; ctx.shadowBlur=12
      const ag = ctx.createRadialGradient(-r*0.25,-r*0.25,0,0,0,r*1.1)
      ag.addColorStop(0,'#CCFF90'); ag.addColorStop(0.5,'#69F0AE'); ag.addColorStop(1,'rgba(0,100,30,0.9)')
      ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill()
      ctx.strokeStyle='rgba(0,150,50,0.6)'; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke()
      // Bellen
      ctx.fillStyle='rgba(255,255,255,0.5)'
      ctx.beginPath(); ctx.arc(-r*0.35,-r*0.3,r*0.22,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='rgba(255,255,255,0.35)'
      ctx.beginPath(); ctx.arc(r*0.3,r*0.1,r*0.15,0,Math.PI*2); ctx.fill()
      break
    }

    case 'penguin': { // Ijskristal (6-puntige ster)
      ctx.shadowColor='#81D4FA'; ctx.shadowBlur=14
      ctx.strokeStyle='#E1F5FE'; ctx.lineWidth=2.2; ctx.lineCap='round'
      for(let i=0;i<6;i++) {
        const a=i*Math.PI/3, len=r*1.5
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*len,Math.sin(a)*len); ctx.stroke()
        // Zij-takjes
        const mx=Math.cos(a)*len*0.55, my=Math.sin(a)*len*0.55
        const na=a+Math.PI/2, tl=r*0.38
        ctx.beginPath(); ctx.moveTo(mx+Math.cos(na)*tl,my+Math.sin(na)*tl)
        ctx.lineTo(mx-Math.cos(na)*tl,my-Math.sin(na)*tl); ctx.stroke()
      }
      ctx.fillStyle='rgba(179,229,252,0.7)'
      ctx.beginPath(); ctx.arc(0,0,r*0.42,0,Math.PI*2); ctx.fill()
      break
    }

    case 'hedgehog': { // Stekelige gele pinbal
      ctx.shadowColor='#FFD23F'; ctx.shadowBlur=10
      ctx.strokeStyle='#FFD23F'; ctx.lineWidth=1.8; ctx.lineCap='round'
      for(let i=0;i<8;i++) {
        const a=i*Math.PI/4
        ctx.beginPath(); ctx.moveTo(Math.cos(a)*r*0.6,Math.sin(a)*r*0.6)
        ctx.lineTo(Math.cos(a)*r*2,Math.sin(a)*r*2); ctx.stroke()
      }
      ctx.fillStyle='#FFE066'
      ctx.beginPath(); ctx.arc(0,0,r*0.65,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='rgba(255,255,200,0.5)'
      ctx.beginPath(); ctx.arc(-r*0.18,-r*0.18,r*0.28,0,Math.PI*2); ctx.fill()
      break
    }

    default: { // Varken: roze bolletje
      ctx.shadowColor='#FF80AB'; ctx.shadowBlur=7
      ctx.fillStyle='#FFB6C1'; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill()
      ctx.strokeStyle='#FF80AB'; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke()
      ctx.fillStyle='rgba(255,255,255,0.4)'
      ctx.beginPath(); ctx.arc(-r*0.3,-r*0.3,r*0.28,0,Math.PI*2); ctx.fill()
      break
    }
  }

  ctx.shadowBlur=0
  ctx.restore()
}

function drawAnim(ctx, a) {
  const t = 1 - a.life/a.maxLife
  ctx.save()

  if (a.type==='ring') {
    const r = a.r*(0.3+t*0.7)
    ctx.globalAlpha=(1-t)*0.8; ctx.strokeStyle=a.color
    ctx.lineWidth=4*(1-t*0.8)+1
    ctx.shadowColor=a.color; ctx.shadowBlur=8
    ctx.beginPath(); ctx.arc(a.x,a.y,r,0,Math.PI*2); ctx.stroke()
  }
  else if (a.type==='stomp') {
    for (let i=0;i<4;i++) {
      const phase=Math.min(1,(t+i*0.12)%1.0)
      const r=a.r*phase
      ctx.globalAlpha=(1-phase)*0.85
      ctx.strokeStyle='#8B4513'; ctx.lineWidth=5*(1-phase)+1
      ctx.shadowColor='#8B4513'; ctx.shadowBlur=6
      ctx.beginPath(); ctx.arc(a.x,a.y,r,0,Math.PI*2); ctx.stroke()
    }
    for (let i=0;i<10;i++) {
      const ang=(i/10)*Math.PI*2, d=a.r*0.5*t
      const px=a.x+Math.cos(ang)*d, py=a.y+Math.sin(ang)*d
      ctx.globalAlpha=(1-t)*0.9; ctx.fillStyle='#8B6914'
      ctx.shadowBlur=0
      ctx.beginPath(); ctx.arc(px,py,5*(1-t*0.6),0,Math.PI*2); ctx.fill()
    }
  }
  else if (a.type==='laser') {
    ctx.globalAlpha=(1-t)*0.9
    ctx.strokeStyle='#FFD700'; ctx.lineWidth=4*(1-t*0.7)+1
    ctx.shadowColor='#FFD700'; ctx.shadowBlur=15
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(a.tx,a.ty); ctx.stroke()
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.5*(1-t)
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(a.tx,a.ty); ctx.stroke()
  }
  else if (a.type==='beam') {
    ctx.globalAlpha=(1-t)*0.85
    ctx.strokeStyle=a.color; ctx.lineWidth=2.5*(1-t)+0.5
    ctx.shadowColor=a.color; ctx.shadowBlur=10
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(a.tx,a.ty); ctx.stroke()
  }
  else if (a.type==='horn') {
    const numH=5, rise=20*t
    ctx.globalAlpha=Math.min(1,t*3)*(1-t*t)
    ctx.fillStyle='#9BA0A5'; ctx.strokeStyle='#555'; ctx.lineWidth=1
    ctx.shadowColor='#ccc'; ctx.shadowBlur=5
    for (let i=0;i<numH;i++) {
      const sx=a.x+(i-2)*10, baseY=a.y+CELL*0.4
      const h=rise*(0.6+i%2*0.4)
      ctx.beginPath(); ctx.moveTo(sx-5,baseY); ctx.lineTo(sx,baseY-h); ctx.lineTo(sx+5,baseY); ctx.closePath()
      ctx.fill(); ctx.stroke()
    }
  }
  else if (a.type==='freeze') {
    const n=8, len=22*t
    ctx.globalAlpha=1-t; ctx.strokeStyle='#C8EFFF'; ctx.lineWidth=2.5
    ctx.shadowColor='#7fd4ff'; ctx.shadowBlur=10
    for (let i=0;i<n;i++) {
      const ang=(i/n)*Math.PI*2
      ctx.beginPath(); ctx.moveTo(a.x+Math.cos(ang)*5,a.y+Math.sin(ang)*5)
      ctx.lineTo(a.x+Math.cos(ang)*len,a.y+Math.sin(ang)*len); ctx.stroke()
    }
    ctx.beginPath(); ctx.arc(a.x,a.y,20*t,0,Math.PI*2)
    ctx.strokeStyle='rgba(100,200,255,0.6)'; ctx.lineWidth=3*(1-t)+1; ctx.stroke()
  }
  else if (a.type==='acid') {
    ctx.globalAlpha=(1-t)*0.75
    ctx.fillStyle='rgba(60,150,60,0.5)'
    ctx.beginPath(); ctx.arc(a.x,a.y,18*Math.sqrt(t),0,Math.PI*2); ctx.fill()
    for (let i=0;i<8;i++) {
      const ang=(i/8)*Math.PI*2, d=16*t
      ctx.globalAlpha=(1-t)*0.85; ctx.fillStyle='#66BB6A'
      ctx.shadowColor='#66BB6A'; ctx.shadowBlur=5
      ctx.beginPath(); ctx.arc(a.x+Math.cos(ang)*d,a.y+Math.sin(ang)*d,5*(1-t*0.5),0,Math.PI*2); ctx.fill()
    }
  }
  else if (a.type==='shockwave') {
    const r=55*t
    ctx.globalAlpha=(1-t)*0.65; ctx.strokeStyle='#FFD23F'; ctx.lineWidth=6*(1-t)+1
    ctx.shadowColor='#FFD23F'; ctx.shadowBlur=12
    ctx.beginPath(); ctx.arc(a.x,a.y,r,0,Math.PI*2); ctx.stroke()
    ctx.globalAlpha=(1-t)*0.12; ctx.fillStyle='#FFD23F'
    ctx.beginPath(); ctx.arc(a.x,a.y,r,0,Math.PI*2); ctx.fill()
  }
  else if (a.type==='spikes') {
    const n=12, len=32*t
    ctx.globalAlpha=(1-t)*0.9; ctx.strokeStyle='#FFD23F'; ctx.lineWidth=2.5
    ctx.shadowColor='#FFD23F'; ctx.shadowBlur=8
    for (let i=0;i<n;i++) {
      const ang=(i/n)*Math.PI*2
      ctx.beginPath(); ctx.moveTo(a.x,a.y)
      ctx.lineTo(a.x+Math.cos(ang)*len,a.y+Math.sin(ang)*len); ctx.stroke()
    }
    ctx.fillStyle='#FFD23F'; ctx.globalAlpha=(1-t)*0.8
    ctx.beginPath(); ctx.arc(a.x,a.y,6*(1-t*0.5),0,Math.PI*2); ctx.fill()
  }
  else if (a.type==='wave') {
    for (let i=0;i<4;i++) {
      const phase=Math.min(1,(t+i*0.18)%1.0)
      ctx.globalAlpha=(1-phase)*0.65; ctx.strokeStyle='#4FC3F7'; ctx.lineWidth=3*(1-phase)+0.5
      ctx.shadowColor='#4FC3F7'; ctx.shadowBlur=6
      ctx.beginPath(); ctx.arc(a.x,a.y,a.r*phase,0,Math.PI*2); ctx.stroke()
    }
  }
  else if (a.type==='roar') {
    for (let i=0;i<3;i++) {
      const phase=Math.min(1,(t+i*0.2)%1.0)
      ctx.globalAlpha=(1-phase)*0.5; ctx.strokeStyle='#FF6B35'; ctx.lineWidth=4*(1-phase)+1
      ctx.shadowColor='#FF6B35'; ctx.shadowBlur=8
      ctx.beginPath(); ctx.arc(a.x,a.y,a.r*phase,0,Math.PI*2); ctx.stroke()
    }
  }
  else if (a.type==='bamboo') {
    ctx.globalAlpha=Math.min(1,t*2)*(1-t)
    ctx.strokeStyle='#4a9e2a'; ctx.lineWidth=3
    ctx.shadowColor='#4a9e2a'; ctx.shadowBlur=5
    for (let i=0;i<3;i++) {
      const ox=(i-1)*10, len=25*t, ang=-Math.PI/2+0.3*(i-1)
      ctx.beginPath()
      ctx.moveTo(a.x+ox,a.y+10)
      ctx.lineTo(a.x+ox+Math.cos(ang)*len,a.y+10+Math.sin(ang)*len)
      ctx.stroke()
    }
  }

  ctx.restore()
}

function drawField(ctx, img, game, hoverTile, selectedType, inspectedId, cellW, cellH, now) {
  drawMapBackground(ctx)
  drawDecorations(ctx)
  drawPath(ctx)
  drawGrid(ctx)
  drawPathArrows(ctx)

  // Hover preview
  if (selectedType && hoverTile) {
    const { col, row } = hoverTile
    const valid = !PATH_TILES.has(`${col},${row}`) && !game.towers.find(t => t.col===col && t.row===row)
    ctx.fillStyle = valid ? 'rgba(100,255,100,0.3)' : 'rgba(255,60,60,0.3)'
    ctx.fillRect(col*CELL,row*CELL,CELL,CELL)
    ctx.strokeStyle = valid ? 'rgba(100,255,100,0.6)' : 'rgba(255,100,100,0.6)'
    ctx.lineWidth=1.5; ctx.setLineDash([5,5])
    const base = TOWER_MAP[selectedType]
    ctx.beginPath(); ctx.arc(tx(col),ty(row),base.range,0,Math.PI*2); ctx.stroke()
    ctx.setLineDash([])
  }

  // Towers
  game.towers.forEach(t => drawTower(ctx, t, img, cellW, cellH, now))

  // Inspected ring
  const ins = inspectedId ? game.towers.find(t => t.id===inspectedId) : null
  if (ins) {
    const { range } = towerStats(ins.type, ins.level)
    ctx.strokeStyle='rgba(255,220,50,0.6)'; ctx.lineWidth=1.5; ctx.setLineDash([5,5])
    ctx.beginPath(); ctx.arc(tx(ins.col),ty(ins.row),range,0,Math.PI*2); ctx.stroke()
    ctx.setLineDash([])
    ctx.strokeStyle='rgba(255,220,50,0.9)'; ctx.lineWidth=2
    ctx.strokeRect(ins.col*CELL+1,ins.row*CELL+1,CELL-2,CELL-2)
  }

  // Enemies
  game.enemies.forEach(e => drawEnemy(ctx, e))

  // Projectiles
  game.projectiles.forEach(p => drawProjectile(ctx, p))

  // Animations
  game.anims.forEach(a => drawAnim(ctx, a))

  // Particles
  game.particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life/p.maxLife)
    ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill()
  })
  ctx.globalAlpha = 1
}

// ── Main component ────────────────────────────────────────────────────
export default function TowerDefenseGame({ onBack }) {
  const [gold,      setGold]      = useState(150)
  const [lives,     setLives]     = useState(15)
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

  const canvasRef    = useRef(null)
  const wrapperRef   = useRef(null)
  const gameRef      = useRef(null)
  const rafRef       = useRef(null)
  const imgRef       = useRef(null)
  const cellSzRef    = useRef({ w:100, h:100 })
  const selTypeRef   = useRef(null)
  const hoverTileRef = useRef(null)
  const inspectedRef = useRef(null)
  const speedRef     = useRef(1)

  selTypeRef.current   = selType
  hoverTileRef.current = hoverTile
  inspectedRef.current = inspected
  speedRef.current     = speed

  // Load spritesheet
  useEffect(() => {
    const img = new Image()
    img.src = '/Towerdefence.png'
    img.onload = () => { imgRef.current = img; cellSzRef.current = { w:img.width/5, h:img.height/5 } }
  }, [])

  // Check for save on mount
  useEffect(() => { setHasSave(!!loadSave()) }, [])

  // Fullscreen listener
  useEffect(() => {
    const handler = () => setIsFS(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const newGame = useCallback(() => {
    _nextId = 1
    gameRef.current = {
      towers:[], enemies:[], projectiles:[], particles:[], anims:[],
      gold:150, lives:15, wave:0,
      spawnQueue:[], spawnTimer:0, waveActive:false,
      running:false, lastTs:null,
    }
  }, [])

  const applyLoad = useCallback(save => {
    _nextId = 1
    gameRef.current = {
      towers: save.towers.map(t => ({ ...t, lastShot:0 })),
      enemies:[], projectiles:[], particles:[], anims:[],
      gold:save.gold, lives:save.lives, wave:save.wave,
      spawnQueue:[], spawnTimer:0, waveActive:false,
      running:false, lastTs:null,
    }
    _nextId = Math.max(...save.towers.map(t=>t.id), 0) + 1
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
      const rawDt = Math.min((ts-(game.lastTs||ts))/1000, 0.05)
      const dt = rawDt * speedRef.current
      game.lastTs = ts

      // Spawner
      if (game.waveActive && game.spawnQueue.length > 0) {
        game.spawnTimer -= dt
        if (game.spawnTimer <= 0) {
          const entry = game.spawnQueue.shift()
          const et = ENEMY_TYPES[entry.type]
          game.enemies.push({
            id:uid(), type:entry.type,
            x:WAYPOINTS[0].x, y:WAYPOINTS[0].y,
            hp:Math.round(et.baseHp*entry.hpScale),
            maxHp:Math.round(et.baseHp*entry.hpScale),
            speed:et.baseSpd*entry.spdScale,
            wpIdx:1,
            effects:{ slow:0, poison:0, poisonDmg:0, stun:0 },
            reward:et.reward, armor:et.armor,
          })
          game.spawnTimer = game.spawnQueue.length > 0 ? entry.delay * 0.5 : 0
        }
      }

      // Enemies
      game.enemies = game.enemies.filter(e => {
        e.effects.slow   = Math.max(0,e.effects.slow-dt)
        e.effects.stun   = Math.max(0,e.effects.stun-dt)
        e.effects.poison = Math.max(0,e.effects.poison-dt)
        if (e.effects.poison > 0) {
          e.hp -= e.effects.poisonDmg*dt
          if (e.hp <= 0) { game.gold+=e.reward; spawnDeathParticles(game,e); handleSplitter(game,e); return false }
        }
        if (e.effects.stun > 0) return true
        const spd = e.speed*(e.effects.slow>0?0.4:1)
        const wp  = WAYPOINTS[e.wpIdx]
        if (!wp) { game.lives=Math.max(0,game.lives-1); return false }
        const dx=wp.x-e.x, dy=wp.y-e.y, d=Math.sqrt(dx*dx+dy*dy)
        if (d < 4) {
          e.wpIdx++
          if (e.wpIdx >= WAYPOINTS.length) { game.lives=Math.max(0,game.lives-1); return false }
        } else {
          e.x+=(dx/d)*spd*dt; e.y+=(dy/d)*spd*dt
        }
        return true
      })

      if (game.waveActive && game.spawnQueue.length===0 && game.enemies.length===0) {
        game.waveActive = false
        if (game.lives > 0) {
          saveGame(game, game.wave)
          setPhase('between')
        }
      }

      // Towers
      const now = ts/1000
      game.towers.forEach(t => {
        const { damage, range, rate } = towerStats(t.type, t.level)
        const special = TOWER_MAP[t.type].special
        const animType = TOWER_MAP[t.type].animType
        if (now-(t.lastShot||0) < 1/rate) return
        const inRange = game.enemies.filter(e => dist({x:tx(t.col),y:ty(t.row)},e) <= range)
        if (!inRange.length) return
        const target = inRange.reduce((a,b) => pathProgress(b)>pathProgress(a)?b:a)
        if (!target) return
        t.lastShot = now
        fireProjectile(game, t, target, damage, special, animType)
      })

      // Projectiles
      game.projectiles = game.projectiles.filter(p => {
        const target = game.enemies.find(e => e.id===p.targetId)
        if (!target) return false
        const dx=target.x-p.x, dy=target.y-p.y, d=Math.sqrt(dx*dx+dy*dy)
        p.vx=dx/d; p.vy=dy/d
        if (d < 12+(ENEMY_TYPES[target.type]?.radius||14)) {
          applyHit(game,p,target); spawnHitParticles(game,p); return false
        }
        const spd=320; p.x+=(dx/d)*spd*dt; p.y+=(dy/d)*spd*dt
        return true
      })

      // Anims
      game.anims = game.anims.filter(a => { a.life-=dt; return a.life>0 })

      // Particles
      game.particles = game.particles.filter(p => {
        p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=200*dt; p.life-=dt; return p.life>0
      })

      setGold(game.gold); setLives(game.lives)
      if (game.lives <= 0) { game.running=false; clearSave(); setPhase('gameover'); return }

      const { w:cw, h:ch } = cellSzRef.current
      drawField(ctx, imgRef.current, game, hoverTileRef.current, selTypeRef.current, inspectedRef.current, cw, ch, ts/1000)

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  // ── Combat helpers ────────────────────────────────────────────────
  function fireProjectile(game, tower, target, damage, special, animType) {
    const ox=tx(tower.col), oy=ty(tower.row)
    const tDef = TOWER_MAP[tower.type]
    const radMap = { lion:7, elephant:9, panda:5, monkey:7, tiger:4, bear:7, hippo:8, rhino:6, croc:7, penguin:6, hedgehog:5, pig:4 }
    game.projectiles.push({
      id:uid(), x:ox, y:oy, vx:0, vy:0,
      targetId:target.id,
      towerKey:tower.type,
      damage, special,
      color:'#fff',
      radius:radMap[tower.type]||5,
      bounceLeft:special==='chain'?2:0,
      hitIds:new Set([target.id]),
    })

    // Trigger special animation
    const animDur = 0.5
    const range = towerStats(tower.type, tower.level).range
    if (animType==='stomp'||animType==='roar'||animType==='wave') {
      game.anims.push({ id:uid(), type:animType, x:ox, y:oy, r:range, life:animDur, maxLife:animDur, color:tDef.projColor })
    } else if (animType==='shockwave'||animType==='spikes') {
      game.anims.push({ id:uid(), type:animType, x:ox, y:oy, r:range, life:animDur, maxLife:animDur, color:tDef.projColor })
    } else if (animType==='laser') {
      game.anims.push({ id:uid(), type:'laser', x:ox, y:oy, tx:target.x, ty:target.y, r:0, life:0.3, maxLife:0.3, color:'#FFD700' })
    } else if (animType==='beam') {
      game.anims.push({ id:uid(), type:'beam', x:ox, y:oy, tx:target.x, ty:target.y, r:0, life:0.25, maxLife:0.25, color:tDef.projColor })
    } else if (animType==='horn') {
      game.anims.push({ id:uid(), type:'horn', x:target.x, y:target.y, r:0, life:0.6, maxLife:0.6, color:'#9BA0A5' })
    } else if (animType==='freeze') {
      game.anims.push({ id:uid(), type:'freeze', x:target.x, y:target.y, r:0, life:0.5, maxLife:0.5, color:'#C8EFFF' })
    } else if (animType==='acid') {
      game.anims.push({ id:uid(), type:'acid', x:target.x, y:target.y, r:0, life:0.55, maxLife:0.55, color:'#66BB6A' })
    } else if (animType==='bamboo') {
      game.anims.push({ id:uid(), type:'bamboo', x:target.x, y:target.y, r:0, life:0.45, maxLife:0.45, color:'#4a9e2a' })
    }
  }

  function applyHit(game, proj, target) {
    const { special, damage } = proj
    let dmg = damage
    if (target.armor && special==='poison') dmg *= 0.1
    target.hp -= dmg
    if (target.hp <= 0) {
      target.hp = 0; game.gold+=target.reward
      spawnDeathParticles(game,target); handleSplitter(game,target)
      game.enemies = game.enemies.filter(e => e.id!==target.id)
    }
    if (special==='slow')   target.effects.slow=2.5
    if (special==='stun')   target.effects.stun=0.7
    if (special==='poison' && !target.armor) { target.effects.poison=4; target.effects.poisonDmg=damage*0.4 }
    if (special==='splash') {
      game.enemies.forEach(e => {
        if (e.id===target.id||proj.hitIds.has(e.id)) return
        if (dist(e,target)<55) { e.hp-=damage*0.6; proj.hitIds.add(e.id) }
      })
    }
    if (special==='chain' && proj.bounceLeft>0) {
      const next = game.enemies.filter(e => !proj.hitIds.has(e.id)&&dist(e,target)<90)
        .sort((a,b)=>dist(a,target)-dist(b,target))[0]
      if (next) {
        game.projectiles.push({
          id:uid(), x:target.x, y:target.y, vx:0, vy:0,
          targetId:next.id, towerKey:proj.towerKey||'monkey',
          damage:damage*0.7, special:'chain',
          color:'#8B5E3C', radius:7,
          bounceLeft:proj.bounceLeft-1, hitIds:new Set([...proj.hitIds,next.id]),
        })
      }
    }
  }

  function handleSplitter(game, e) {
    if (e.type!=='splitter') return
    const et = ENEMY_TYPES.mini
    for (let i=0;i<2;i++) {
      game.enemies.push({
        id:uid(), type:'mini', x:e.x+(i===0?-8:8), y:e.y,
        hp:et.baseHp, maxHp:et.baseHp, speed:et.baseSpd,
        wpIdx:e.wpIdx, effects:{slow:0,poison:0,poisonDmg:0,stun:0},
        reward:et.reward, armor:false,
      })
    }
  }

  function spawnDeathParticles(game, e) {
    const { color } = ENEMY_TYPES[e.type]
    for (let i=0;i<8;i++) {
      const a=(i/8)*Math.PI*2, spd=60+Math.random()*100
      game.particles.push({ x:e.x, y:e.y, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd-60, life:0.7, maxLife:0.7, color, size:3+Math.random()*3 })
    }
  }

  function spawnHitParticles(game, p) {
    for (let i=0;i<4;i++) {
      const a=Math.random()*Math.PI*2, spd=40+Math.random()*60
      game.particles.push({ x:p.x, y:p.y, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd, life:0.35, maxLife:0.35, color:p.color, size:2 })
    }
  }

  // ── Wave management ───────────────────────────────────────────────
  const startWave = useCallback(() => {
    const game = gameRef.current; if (!game) return
    const nextWave = game.wave+1
    game.wave=nextWave; game.waveActive=true
    game.spawnQueue=generateWave(nextWave); game.spawnTimer=0
    setWave(nextWave); setPhase('playing'); setInspected(null)
    if (!game.running) startLoop()
  }, [startLoop])

  // ── Start / Continue / Restart ────────────────────────────────────
  const startFresh = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    clearSave(); newGame()
    setGold(150); setLives(15); setWave(0)
    setPhase('between'); setSelType(null); setInspected(null); setHasSave(false)
    startLoop()
  }, [newGame, startLoop])

  const continueSave = useCallback(() => {
    const save = loadSave(); if (!save) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    applyLoad(save)
    setGold(save.gold); setLives(save.lives); setWave(save.wave)
    setPhase('between'); setSelType(null); setInspected(null)
    startLoop()
  }, [applyLoad, startLoop])

  // ── Canvas events ─────────────────────────────────────────────────
  const getTile = useCallback(e => {
    const rect = canvasRef.current.getBoundingClientRect()
    const sx=CW/rect.width, sy=CH/rect.height
    const cx=(e.clientX-rect.left)*sx, cy=(e.clientY-rect.top)*sy
    const col=Math.floor(cx/CELL), row=Math.floor(cy/CELL)
    if (col<0||col>=COLS||row<0||row>=ROWS) return null
    return { col, row }
  }, [])

  const handleMouseMove  = useCallback(e => { const t=getTile(e); setHoverTile(t?{col:t.col,row:t.row}:null) }, [getTile])
  const handleMouseLeave = useCallback(()=>setHoverTile(null),[])

  const handleClick = useCallback(e => {
    const game=gameRef.current; if (!game) return
    const tile=getTile(e); if (!tile) return
    const { col, row } = tile
    const existing = game.towers.find(t=>t.col===col&&t.row===row)
    if (selTypeRef.current && !existing && !PATH_TILES.has(`${col},${row}`)) {
      const cost=TOWER_MAP[selTypeRef.current].cost
      if (game.gold<cost) return
      game.gold-=cost
      game.towers.push({ id:uid(), type:selTypeRef.current, col, row, level:0, lastShot:0, invested:cost })
      setGold(game.gold); setSelType(null); return
    }
    if (existing) { setInspected(id=>id===existing.id?null:existing.id); setSelType(null); return }
    setInspected(null)
  }, [getTile])

  const handleRightClick = useCallback(e => { e.preventDefault(); setSelType(null); setInspected(null) }, [])

  // Touch support
  const handleTouch = useCallback(e => {
    e.preventDefault()
    if (e.touches.length===1) {
      const t = e.touches[0]
      handleClick({ clientX:t.clientX, clientY:t.clientY })
    }
  }, [handleClick])

  // ── Upgrade / Sell ────────────────────────────────────────────────
  const upgradeInspected = useCallback(() => {
    const game=gameRef.current; if (!game) return
    const t=game.towers.find(t=>t.id===inspected); if (!t||t.level>=2) return
    const cost=upgradeCost(t.type,t.level)
    if (game.gold<cost) return
    game.gold-=cost; t.level++; t.invested=(t.invested||TOWER_MAP[t.type].cost)+cost
    setGold(game.gold); forceUpdate(n=>n+1)
  }, [inspected])

  const sellInspected = useCallback(() => {
    const game=gameRef.current; if (!game) return
    const t=game.towers.find(t=>t.id===inspected); if (!t) return
    game.gold+=Math.floor((t.invested||TOWER_MAP[t.type].cost)*0.5)
    game.towers=game.towers.filter(x=>x.id!==t.id)
    setGold(game.gold); setInspected(null); forceUpdate(n=>n+1)
  }, [inspected])

  // ── Fullscreen ────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    const el=wrapperRef.current; if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen?.()
  }, [])

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (gameRef.current) gameRef.current.running=false
  }, [])

  // ── Render ────────────────────────────────────────────────────────
  const inspTower = inspected ? gameRef.current?.towers.find(t=>t.id===inspected) : null
  const tDef      = inspTower ? TOWER_MAP[inspTower.type] : null
  const stats     = inspTower ? towerStats(inspTower.type, inspTower.level) : null
  const shopTower = hoverType ? TOWER_MAP[hoverType] : null

  return (
    <div className="td-outer" ref={wrapperRef}>
      <div className="td-layout">
        <div className="td-left">
          <div className="td-hud">
            <button className="back-btn td-back-inline" onClick={() => {
              if (rafRef.current) cancelAnimationFrame(rafRef.current)
              if (gameRef.current) gameRef.current.running=false
              onBack()
            }}>← Terug</button>
            <div className="td-hud-item"><span className="td-hud-icon">❤️</span>
              <span className="td-hud-val" style={{color:lives<=5?'#ff6b6b':'#fff'}}>{lives}</span></div>
            <div className="td-hud-item"><span className="td-hud-icon">🪙</span>
              <span className="td-hud-val" style={{color:'#FFD23F'}}>{gold}</span></div>
            <div className="td-hud-item"><span className="td-hud-icon">🌊</span>
              <span className="td-hud-val">{wave===0?'—':wave}</span></div>
            <div style={{marginLeft:'auto',display:'flex',gap:4,alignItems:'center'}}>
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

          <canvas
            ref={canvasRef} width={CW} height={CH}
            className="td-canvas"
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
                  const save=loadSave()
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

        <div className="td-sidebar">
          <div className="td-wave-section">
            {phase==='between' ? (
              <button className="td-btn td-btn-gold td-wave-btn" onClick={startWave}>
                ▶ Golf {wave+1} starten
              </button>
            ) : phase==='playing' ? (
              <div className="td-wave-info">Golf {wave} bezig…</div>
            ) : null}
          </div>

          {inspTower && tDef && stats ? (
            <div className="td-inspect">
              <div className="td-inspect-header">
                <div style={{
                  width:44,height:44,borderRadius:8,flexShrink:0,overflow:'hidden',
                  backgroundImage:"url('/Towerdefence.png')",
                  backgroundSize:'220px 220px',
                  backgroundPosition:`-${tDef.col*44}px -${tDef.row*44}px`,
                  border:inspTower.level===1?'2px solid #4FC3F7':inspTower.level===2?'2px solid #FFD700':'2px solid rgba(255,255,255,0.15)',
                  boxShadow:inspTower.level===2?'0 0 10px #FFD700':inspTower.level===1?'0 0 8px #4FC3F7':'none',
                }} />
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
                  💰 Verkopen (🪙{Math.floor((inspTower.invested||tDef.cost)*0.5)})
                </button>
              </div>
            </div>
          ) : (
            <div className="td-shop">
              <div className="td-shop-title">Dieren — klik om te plaatsen</div>
              <div className="td-shop-grid">
                {TOWERS.map(t => {
                  const canAfford=gold>=t.cost
                  const isPremium=t.cost>=250
                  return (
                    <button key={t.key}
                      className={`td-shop-btn ${selType===t.key?'td-shop-selected':''} ${!canAfford?'td-shop-poor':''} ${isPremium?'td-shop-premium':''}`}
                      onClick={() => setSelType(k=>k===t.key?null:t.key)}
                      onMouseEnter={() => setHoverType(t.key)}
                      onMouseLeave={() => setHoverType(null)}
                      title={`${t.name} — 🪙${t.cost}`}
                    >
                      <div className="td-shop-sprite" style={{
                        backgroundImage:"url('/Towerdefence.png')",
                        backgroundSize:'220px 220px',
                        backgroundPosition:`-${t.col*44}px -${t.row*44}px`,
                      }} />
                      <span className="td-shop-label">{t.name}</span>
                      <span className="td-shop-price" style={{color:canAfford?'#FFD23F':'#ff6b6b'}}>
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
