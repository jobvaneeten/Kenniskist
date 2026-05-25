// ── Tower Defense PixiJS game engine helpers ───────────────────────────
import * as PIXI from 'pixi.js'
import Matter from 'matter-js'
import { gsap } from 'gsap'
import {
  TOWERS, TOWER_MAP, LVL_DMG, LVL_RATE, LVL_RANGE,
  upgradeCost, ENEMY_TYPES, generateWave
} from './td_data'
import { drawAnimal } from './td_sprites'

// ── Constants ─────────────────────────────────────────────────────────
export const CW   = 720
export const CH   = 480
export const CELL = 40
export const COLS = 18
export const ROWS = 12
export const SAVE_KEY = 'td_kenniskist_save'

export const tx = c => c * CELL + CELL / 2
export const ty = r => r * CELL + CELL / 2

// ── Path ──────────────────────────────────────────────────────────────
const BEND_TILES = [[0,2],[4,2],[4,8],[10,8],[10,2],[14,2],[14,9],[17,9]]
export const WAYPOINTS = [
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
    if (c1===c2) for (let r=Math.min(r1,r2);r<=Math.max(r1,r2);r++) s.add(`${c1},${r}`)
    else         for (let c=Math.min(c1,c2);c<=Math.max(c1,c2);c++) s.add(`${c},${r1}`)
  }
  return s
}
export const PATH_TILES = computePathTiles()

// ── Helpers ───────────────────────────────────────────────────────────
let _nextId = 1
export const uid = () => _nextId++
export const resetIds = () => { _nextId = 1 }
export const setNextId = v => { _nextId = v }
export const dist = (a, b) => Math.hypot(a.x-b.x, a.y-b.y)

export function towerStats(key, level) {
  const base = TOWER_MAP[key]
  return {
    damage: base.damage * LVL_DMG[level],
    range:  base.range  * LVL_RANGE[level],
    rate:   base.rate   * LVL_RATE[level],
  }
}

export function pathProgress(e) {
  return e.wpIdx * 10000 + (e.wpIdx < WAYPOINTS.length ? Math.abs(WAYPOINTS[e.wpIdx].x - e.x) : 0)
}

// ── Save / Load ───────────────────────────────────────────────────────
export function saveGame(game, wave) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      towers: game.towers.map(t => ({ id:t.id, type:t.type, col:t.col, row:t.row, level:t.level, invested:t.invested })),
      gold: game.gold, lives: game.lives, wave, savedAt: Date.now(),
    }))
  } catch {}
}
export function loadSave() {
  try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null } catch { return null }
}
export function clearSave() { try { localStorage.removeItem(SAVE_KEY) } catch {} }

// ── Texture cache ─────────────────────────────────────────────────────
const _texCache = {}

export function getTowerTexture(renderer, key, size) {
  const k = `${key}_${size}`
  if (_texCache[k]) return _texCache[k]
  const g = new PIXI.Graphics()
  g.x = size / 2; g.y = size / 2
  drawAnimal(g, key, size)
  const tex = renderer.generateTexture(g, PIXI.SCALE_MODES.LINEAR, 2)
  _texCache[k] = tex
  g.destroy()
  return tex
}

export function clearTextureCache() {
  for (const k of Object.keys(_texCache)) {
    _texCache[k]?.destroy?.()
    delete _texCache[k]
  }
}

// ── Static map data ────────────────────────────────────────────────────
function isOnPath(x, y) { return PATH_TILES.has(`${Math.floor(x/CELL)},${Math.floor(y/CELL)}`) }
function isTooClose(x, y, list, minD) { return list.some(o => Math.hypot(o.x-x, o.y-y) < minD) }

export const DECO_TREES = (() => {
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

export const DECO_FLOWERS = (() => {
  const pts = []
  const cols = ['#FF9BE8','#FFD23F','#FF7B7B','#B8F0A0','#7fd4ff','#FFAA55']
  for (let i = 0; i < 55; i++) {
    const x = (i*211+60)%CW, y = (i*163+80)%CH
    if (!isOnPath(x,y) && !isTooClose(x,y,DECO_TREES,18) && !isTooClose(x,y,pts,14)) {
      pts.push({ x, y, color: parseInt(cols[i%6].slice(1),16), r: 2+(i%3) })
    }
  }
  return pts
})()

export const DECO_ROCKS = (() => {
  const pts = []
  for (let i = 0; i < 20; i++) {
    const x = (i*277+100)%CW, y = (i*191+130)%CH
    if (!isOnPath(x,y) && !isTooClose(x,y,DECO_TREES,20) && !isTooClose(x,y,pts,25)) {
      pts.push({ x, y, w: 6+(i%5), h: 4+(i%3) })
    }
  }
  return pts
})()

// ── Build static background texture ───────────────────────────────────
export function buildStaticBg(renderer) {
  const g = new PIXI.Graphics()

  // Grass gradient via rectangles
  for (let y = 0; y < CH; y += 4) {
    const t = y / CH
    const r = Math.round(0x5e + (0x4d - 0x5e) * t)
    const grn = Math.round(0xb8 + (0xa0 - 0xb8) * t)
    const b = Math.round(0x4d + (0x3e - 0x4d) * t)
    g.beginFill((r << 16) | (grn << 8) | b)
    g.drawRect(0, y, CW, 4)
    g.endFill()
  }

  // Subtle grass blade noise
  for (let i = 0; i < 200; i++) {
    const x = (i*137.5+23)%CW, y = (i*97.3+47)%CH
    if (isOnPath(x,y)) continue
    const c = i%3===0 ? 0x3a8830 : i%3===1 ? 0x4aaa3a : 0x2d6a24
    g.beginFill(c, 0.12 + (i%5)*0.03)
    g.drawRect(x, y, 1+(i%2), 3+(i%4))
    g.endFill()
  }

  // Rocks
  for (const rock of DECO_ROCKS) {
    g.beginFill(0x8a8a8a); g.drawEllipse(rock.x,rock.y,rock.w,rock.h); g.endFill()
    g.beginFill(0xaaaaaa); g.drawEllipse(rock.x-1,rock.y-1,rock.w*.5,rock.h*.5); g.endFill()
  }

  // Flowers
  for (const f of DECO_FLOWERS) {
    g.beginFill(0x2a8a1a); g.drawCircle(f.x,f.y+f.r+2,2); g.endFill()
    g.beginFill(f.color); g.drawCircle(f.x,f.y,f.r); g.endFill()
    g.beginFill(0xFFFFFF); g.drawCircle(f.x,f.y,f.r*.4); g.endFill()
  }

  // Trees
  for (const tree of DECO_TREES) {
    // Trunk
    g.beginFill(0x7a4a1e); g.drawRect(tree.x-3,tree.y,6,tree.r*.6); g.endFill()
    // Shadow
    g.beginFill(0x000000, 0.15)
    g.drawEllipse(tree.x+4, tree.y+2, tree.r*.7, tree.r*.35); g.endFill()
    // Canopy
    g.beginFill(tree.dark ? 0x2a6e18 : 0x338a20)
    g.drawCircle(tree.x, tree.y-tree.r*.2, tree.r); g.endFill()
    g.beginFill(tree.dark ? 0x3a9428 : 0x4aab30)
    g.drawCircle(tree.x-tree.r*.25, tree.y-tree.r*.45, tree.r*.65); g.endFill()
    g.beginFill(0xFFFFFF, 0.12)
    g.drawCircle(tree.x-tree.r*.3, tree.y-tree.r*.55, tree.r*.35); g.endFill()
  }

  // Path tiles
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!PATH_TILES.has(`${c},${r}`)) continue
      const px = c*CELL, py = r*CELL
      g.beginFill(0x000000, 0.18); g.drawRect(px,py,CELL,CELL); g.endFill()
      g.beginFill(0xc4975a); g.drawRect(px+1,py+1,CELL-2,CELL-2); g.endFill()
      g.beginFill(0xb8894e); g.drawRect(px+3,py+3,CELL-6,CELL-6); g.endFill()
      const seed = c*17+r*31
      if (seed%5===0) { g.beginFill(0x64461e,0.2); g.drawEllipse(px+CELL*.3,py+CELL*.6,5,3); g.endFill() }
      if (seed%7===2) { g.beginFill(0xb4965a,0.25); g.drawEllipse(px+CELL*.7,py+CELL*.35,4,3); g.endFill() }
    }
  }

  // Grid
  g.lineStyle(1, 0x000000, 0.05)
  for (let c=0;c<=COLS;c++) { g.moveTo(c*CELL,0); g.lineTo(c*CELL,CH) }
  for (let r=0;r<=ROWS;r++) { g.moveTo(0,r*CELL); g.lineTo(CW,r*CELL) }
  g.lineStyle(0)

  // Path arrows
  const arrowStyle = { fill: 0x967840, alpha: 0.35, size: 11 }
  const arrow = (gfx, x, y, dir) => {
    gfx.beginFill(arrowStyle.fill, arrowStyle.alpha)
    if (dir === 'r') gfx.drawPolygon([x-4,y-4, x+5,y, x-4,y+4])
    if (dir === 'd') gfx.drawPolygon([x-4,y-4, x+4,y-4, x,y+5])
    if (dir === 'u') gfx.drawPolygon([x-4,y+4, x+4,y+4, x,y-5])
    gfx.endFill()
  }
  for (let c=1;c<=3;c++) arrow(g,tx(c),ty(2),'r')
  for (let r=3;r<=7;r++) arrow(g,tx(4),ty(r),'d')
  for (let c=5;c<=9;c++) arrow(g,tx(c),ty(8),'r')
  for (let r=7;r>=3;r--) arrow(g,tx(10),ty(r),'u')
  for (let c=11;c<=13;c++) arrow(g,tx(c),ty(2),'r')
  for (let r=3;r<=8;r++) arrow(g,tx(14),ty(r),'d')
  for (let c=15;c<=16;c++) arrow(g,tx(c),ty(9),'r')

  const tex = renderer.generateTexture(g, PIXI.SCALE_MODES.LINEAR, 1)
  g.destroy()
  return tex
}

// ── Draw enemy ────────────────────────────────────────────────────────
function hexToNum(hex) { return parseInt(hex.slice(1),16) }

export function updateEnemyGfx(gfx, e) {
  gfx.clear()
  const et = ENEMY_TYPES[e.type]
  const r = et.radius
  const col = hexToNum(et.color)
  const outl = hexToNum(et.outline)

  // Shadow
  gfx.beginFill(0x000000, 0.18); gfx.drawEllipse(0, r*.9, r*.9, r*.28); gfx.endFill()

  // Body gradient via two circles
  gfx.beginFill(col); gfx.drawCircle(0, 0, r); gfx.endFill()
  // Highlight
  gfx.beginFill(0xFFFFFF, 0.25); gfx.drawEllipse(-r*.28, -r*.28, r*.42, r*.28); gfx.endFill()
  // Outline
  gfx.lineStyle(2, outl); gfx.drawCircle(0, 0, r); gfx.lineStyle(0)

  // Eyes
  const eyeR=r*.22, eOX=r*.32, eOY=r*-.15
  gfx.beginFill(0xFFFFFF); gfx.drawCircle(-eOX,eOY,eyeR); gfx.drawCircle(eOX,eOY,eyeR); gfx.endFill()
  gfx.beginFill(0x1A1A1A); gfx.drawCircle(-eOX+1,eOY+1,eyeR*.55); gfx.drawCircle(eOX+1,eOY+1,eyeR*.55); gfx.endFill()

  // Armor ring
  if (e.type==='armored') {
    gfx.lineStyle(3, 0xC8DCFF, 0.6); gfx.drawCircle(0, 0, r+2); gfx.lineStyle(0)
  }
  // Slow ring
  if (e.effects.slow > 0) {
    gfx.lineStyle(2, 0x64B4FF, 0.55)
    gfx.setLineDash?.(3,3)
    gfx.drawCircle(0, 0, r+3); gfx.lineStyle(0)
  }
  // Poison dots
  if (e.effects.poison > 0) {
    gfx.beginFill(0x64C83C, 0.75)
    gfx.drawCircle(r*.5, -r*.8, 3); gfx.drawCircle(-r*.4, -r*1.0, 2)
    gfx.endFill()
  }
  // Stun star
  if (e.effects.stun > 0) {
    gfx.beginFill(0xFFD700)
    const sa=6, so=8, si=4
    for (let i=0;i<sa*2;i++) {
      const a=i*Math.PI/sa - Math.PI/2, rad=i%2===0?so:si
      if(i===0) gfx.moveTo(Math.cos(a)*rad, -r-rad+Math.sin(a)*rad)
      else      gfx.lineTo(Math.cos(a)*rad*0.5, -r-3+Math.sin(a)*rad*0.5)
    }
    gfx.closePath(); gfx.endFill()
  }

  // Health bar
  const bw = r*2+4, bh = 5, bx = -bw/2, by = -r-12
  gfx.beginFill(0x000000,0.5); gfx.drawRect(bx-1,by-1,bw+2,bh+2); gfx.endFill()
  gfx.beginFill(0x444444); gfx.drawRect(bx,by,bw,bh); gfx.endFill()
  const pct = Math.max(0,e.hp/e.maxHp)
  const hpCol = pct>0.5 ? 0x33EE33 : pct>0.25 ? 0xEEEE33 : 0xEE3333
  gfx.beginFill(hpCol); gfx.drawRect(bx,by,bw*pct,bh); gfx.endFill()
}

// ── Draw projectile ───────────────────────────────────────────────────
export function drawProjectile(gfx, p) {
  gfx.clear()
  const r = p.radius
  const angle = Math.atan2(p.vy||0, p.vx||1)

  switch (p.towerKey) {
    case 'lion': {
      // Outer glow
      gfx.beginFill(0xFF4500, 0.3); gfx.drawCircle(0,0,r*1.6); gfx.endFill()
      gfx.beginFill(0xFF6B35); gfx.drawCircle(0,0,r); gfx.endFill()
      gfx.beginFill(0xFFD700); gfx.drawCircle(0,0,r*.55); gfx.endFill()
      gfx.beginFill(0xFFFFFF); gfx.drawCircle(0,0,r*.22); gfx.endFill()
      break
    }
    case 'elephant': {
      gfx.beginFill(0x5C3A1E, 0.3); gfx.drawCircle(0,0,r*1.3); gfx.endFill()
      gfx.beginFill(0x8B6914); gfx.drawCircle(0,0,r); gfx.endFill()
      gfx.lineStyle(1.5, 0x4A2E00); gfx.drawCircle(0,0,r); gfx.lineStyle(0)
      gfx.lineStyle(1.2, 0x28140000, 0.6)
      gfx.moveTo(-r*.3,r*.1); gfx.lineTo(r*.2,-r*.3)
      gfx.moveTo(r*.1,r*.3); gfx.lineTo(-r*.2,r*.5)
      gfx.lineStyle(0)
      gfx.beginFill(0xC8A050, 0.4); gfx.drawEllipse(-r*.28,-r*.3,r*.3,r*.18); gfx.endFill()
      break
    }
    case 'panda': {
      // Bamboo stick (rotated)
      const cos = Math.cos(angle), sin = Math.sin(angle)
      const len = r*2.2, hw = r*0.45
      const corners = [
        [-len, -hw], [len, -hw], [len, hw], [-len, hw]
      ].map(([x,y]) => [x*cos - y*sin, x*sin + y*cos])
      gfx.beginFill(0x4CAF50)
      gfx.drawPolygon(corners.flat())
      gfx.endFill()
      gfx.lineStyle(1.8, 0x2E7D32)
      gfx.moveTo(-r*.6*cos - (-hw)*sin, -r*.6*sin + (-hw)*cos)
      gfx.lineTo(-r*.6*cos - hw*sin, -r*.6*sin + hw*cos)
      gfx.lineStyle(0)
      break
    }
    case 'monkey': {
      gfx.beginFill(0x6D3B1E, 0.3); gfx.drawCircle(0,0,r*1.25); gfx.endFill()
      gfx.beginFill(0x8B5E3C); gfx.drawCircle(0,0,r); gfx.endFill()
      gfx.lineStyle(1.5, 0x5C3317); gfx.drawCircle(0,0,r); gfx.lineStyle(0)
      gfx.beginFill(0x190A00, 0.85)
      const sa=[Math.PI*1.5, Math.PI*1.5+Math.PI*2/3, Math.PI*1.5+Math.PI*4/3]
      for (const a of sa) gfx.drawCircle(Math.cos(a)*r*.42, Math.sin(a)*r*.42, r*.2)
      gfx.endFill()
      break
    }
    case 'tiger': {
      // Trail
      gfx.lineStyle(r*.8, 0xFFD700, 0.3, 0, true)
      gfx.moveTo(0,0); gfx.lineTo(-Math.cos(angle)*22, -Math.sin(angle)*22)
      gfx.lineStyle(0)
      // Core glow
      gfx.beginFill(0xFFD700, 0.5); gfx.drawCircle(0,0,r*2.2); gfx.endFill()
      gfx.beginFill(0xFFE566); gfx.drawCircle(0,0,r*1.1); gfx.endFill()
      gfx.beginFill(0xFFFFFF); gfx.drawCircle(0,0,r*.45); gfx.endFill()
      break
    }
    case 'bear': {
      // 6-pointed star
      gfx.beginFill(0xFFD23F, 0.3); gfx.drawCircle(0,0,r*1.4); gfx.endFill()
      const pts=6, out=r, inn=r*.45
      const poly = []
      for(let i=0;i<pts*2;i++) {
        const rad=i%2===0?out:inn, a=i*Math.PI/pts-Math.PI/2
        poly.push(Math.cos(a)*rad, Math.sin(a)*rad)
      }
      gfx.beginFill(0xFFD23F); gfx.drawPolygon(poly); gfx.endFill()
      gfx.beginFill(0xFFFFCC, 0.7); gfx.drawCircle(0,0,r*.35); gfx.endFill()
      break
    }
    case 'rhino': {
      // Horn/arrow shape
      const cos = Math.cos(angle), sin = Math.sin(angle)
      const hw = r*.65, tail = -r*.6, head = r*1.8
      const pts = [
        [head, 0], [-tail, hw], [tail*.4, 0], [-tail, -hw]
      ].map(([x,y]) => [x*cos - y*sin, x*sin + y*cos])
      gfx.beginFill(0xAAB0B5, 0.35);
      gfx.drawEllipse(Math.cos(angle)*r*.4, Math.sin(angle)*r*.4, r*1.5, r*.8)
      gfx.endFill()
      gfx.beginFill(0xC8CDD0); gfx.drawPolygon(pts.flat()); gfx.endFill()
      break
    }
    case 'hippo': {
      // Water teardrop
      const cos = Math.cos(angle), sin = Math.sin(angle)
      const a1x = r*1.8*cos, a1y = r*1.8*sin
      const c1x = r*.5*cos - r*.95*(-sin), c1y = r*.5*sin + r*.95*cos
      const c2x = -r*1.1*cos - r*.75*(-sin), c2y = -r*1.1*sin + r*.75*cos
      const base = [-r*1.1*cos, -r*1.1*sin]
      gfx.beginFill(0x29B6F6, 0.4); gfx.drawEllipse(Math.cos(angle)*r*.2, Math.sin(angle)*r*.2, r*1.8, r*1.0); gfx.endFill()
      gfx.beginFill(0x29B6F6); gfx.drawPolygon([a1x,a1y, c1x,c1y, base[0],base[1], c2x,c2y]); gfx.endFill()
      gfx.beginFill(0xE1F5FE, 0.45); gfx.drawEllipse(Math.cos(angle)*r*.1, Math.sin(angle)*r*.1, r*.38, r*.2); gfx.endFill()
      break
    }
    case 'croc': {
      gfx.beginFill(0x00C853, 0.3); gfx.drawCircle(0,0,r*1.4); gfx.endFill()
      gfx.beginFill(0x69F0AE); gfx.drawCircle(0,0,r); gfx.endFill()
      gfx.lineStyle(1.5, 0x009632, 0.6); gfx.drawCircle(0,0,r); gfx.lineStyle(0)
      gfx.beginFill(0xFFFFFF, 0.5); gfx.drawCircle(-r*.35,-r*.3,r*.22); gfx.endFill()
      gfx.beginFill(0xFFFFFF, 0.35); gfx.drawCircle(r*.3,r*.1,r*.15); gfx.endFill()
      break
    }
    case 'penguin': {
      // Ice crystal
      gfx.lineStyle(2.2, 0xE1F5FE)
      for(let i=0;i<6;i++) {
        const a=i*Math.PI/3, len=r*1.5
        const ex = Math.cos(a)*len, ey = Math.sin(a)*len
        gfx.moveTo(0,0); gfx.lineTo(ex,ey)
        const mx=ex*.55, my=ey*.55, na=a+Math.PI/2, tl=r*.38
        gfx.moveTo(mx+Math.cos(na)*tl, my+Math.sin(na)*tl)
        gfx.lineTo(mx-Math.cos(na)*tl, my-Math.sin(na)*tl)
      }
      gfx.lineStyle(0)
      gfx.beginFill(0xB3E5FC, 0.7); gfx.drawCircle(0,0,r*.42); gfx.endFill()
      break
    }
    case 'hedgehog': {
      gfx.lineStyle(1.8, 0xFFD23F)
      for(let i=0;i<8;i++) {
        const a=i*Math.PI/4
        gfx.moveTo(Math.cos(a)*r*.6, Math.sin(a)*r*.6)
        gfx.lineTo(Math.cos(a)*r*2, Math.sin(a)*r*2)
      }
      gfx.lineStyle(0)
      gfx.beginFill(0xFFE066); gfx.drawCircle(0,0,r*.65); gfx.endFill()
      gfx.beginFill(0xFFFFCC, 0.5); gfx.drawCircle(-r*.18,-r*.18,r*.28); gfx.endFill()
      break
    }
    default: { // pig
      gfx.beginFill(0xFF80AB, 0.3); gfx.drawCircle(0,0,r*1.3); gfx.endFill()
      gfx.beginFill(0xFFB6C1); gfx.drawCircle(0,0,r); gfx.endFill()
      gfx.lineStyle(1.5, 0xFF80AB); gfx.drawCircle(0,0,r); gfx.lineStyle(0)
      gfx.beginFill(0xFFFFFF, 0.4); gfx.drawCircle(-r*.3,-r*.3,r*.28); gfx.endFill()
      break
    }
  }
}

// ── Draw animation effect ─────────────────────────────────────────────
export function drawAnim(gfx, a, t) {
  gfx.clear()
  if (t >= 1) return

  const alpha = 1 - t
  switch (a.type) {
    case 'ring':
    case 'roar': {
      const rings = a.type==='roar' ? 3 : 1
      for (let i=0;i<rings;i++) {
        const ph = Math.min(1,(t+i*.2)%1.0)
        gfx.lineStyle((4*(1-ph)+1), a.color || 0xFF6B35, (1-ph)*.6)
        gfx.drawCircle(0, 0, a.r*(0.2+ph*.8))
      }
      gfx.lineStyle(0)
      break
    }
    case 'stomp': {
      for (let i=0;i<4;i++) {
        const ph = Math.min(1,(t+i*.12)%1.0)
        gfx.lineStyle(5*(1-ph)+1, 0x8B4513, (1-ph)*.9)
        gfx.drawCircle(0, 0, a.r*ph)
      }
      gfx.lineStyle(0)
      for (let i=0;i<10;i++) {
        const ang=(i/10)*Math.PI*2, d=a.r*.5*t
        gfx.beginFill(0x8B6914, (1-t)*.9)
        gfx.drawCircle(Math.cos(ang)*d, Math.sin(ang)*d, 5*(1-t*.6))
        gfx.endFill()
      }
      break
    }
    case 'laser': {
      gfx.lineStyle(4*(1-t*.7)+1, 0xFFD700, alpha*.9)
      gfx.moveTo(a.ox||0, a.oy||0); gfx.lineTo(a.tx||0, a.ty||0)
      gfx.lineStyle(1.5*(1-t), 0xFFFFFF, alpha)
      gfx.moveTo(a.ox||0, a.oy||0); gfx.lineTo(a.tx||0, a.ty||0)
      gfx.lineStyle(0)
      break
    }
    case 'beam': {
      gfx.lineStyle(2.5*(1-t)+.5, a.color||0x4FC3F7, alpha*.85)
      gfx.moveTo(a.ox||0, a.oy||0); gfx.lineTo(a.tx||0, a.ty||0)
      gfx.lineStyle(0)
      break
    }
    case 'horn': {
      const rise = 20*t
      const drawAlpha = Math.min(1,t*3)*(1-t*t)
      for (let i=0;i<5;i++) {
        const sx=(i-2)*10, baseY=CELL*.4, h=rise*(.6+i%2*.4)
        gfx.beginFill(0x9BA0A5, drawAlpha)
        gfx.drawPolygon([sx-5,baseY, sx,baseY-h, sx+5,baseY])
        gfx.endFill()
      }
      break
    }
    case 'freeze': {
      const len = 22*t
      gfx.lineStyle(2.5, 0xC8EFFF, 1-t)
      for (let i=0;i<8;i++) {
        const ang=(i/8)*Math.PI*2
        gfx.moveTo(Math.cos(ang)*5,Math.sin(ang)*5)
        gfx.lineTo(Math.cos(ang)*len,Math.sin(ang)*len)
      }
      gfx.drawCircle(0,0,20*t)
      gfx.lineStyle(0)
      break
    }
    case 'acid': {
      gfx.beginFill(0x3C9650, (1-t)*.7)
      gfx.drawCircle(0, 0, 18*Math.sqrt(t))
      gfx.endFill()
      for (let i=0;i<8;i++) {
        const ang=(i/8)*Math.PI*2, d=16*t
        gfx.beginFill(0x66BB6A, (1-t)*.85)
        gfx.drawCircle(Math.cos(ang)*d, Math.sin(ang)*d, 5*(1-t*.5))
        gfx.endFill()
      }
      break
    }
    case 'shockwave': {
      gfx.lineStyle(6*(1-t)+1, 0xFFD23F, (1-t)*.65)
      gfx.drawCircle(0,0,55*t)
      gfx.lineStyle(0)
      gfx.beginFill(0xFFD23F, (1-t)*.1)
      gfx.drawCircle(0,0,55*t)
      gfx.endFill()
      break
    }
    case 'spikes': {
      const len = 32*t
      gfx.lineStyle(2.5, 0xFFD23F, (1-t)*.9)
      for (let i=0;i<12;i++) {
        const ang=(i/12)*Math.PI*2
        gfx.moveTo(0,0); gfx.lineTo(Math.cos(ang)*len, Math.sin(ang)*len)
      }
      gfx.lineStyle(0)
      gfx.beginFill(0xFFD23F, (1-t)*.8)
      gfx.drawCircle(0,0,6*(1-t*.5))
      gfx.endFill()
      break
    }
    case 'wave': {
      for (let i=0;i<4;i++) {
        const ph=Math.min(1,(t+i*.18)%1.0)
        gfx.lineStyle(3*(1-ph)+.5, 0x4FC3F7, (1-ph)*.65)
        gfx.drawCircle(0,0,a.r*ph)
      }
      gfx.lineStyle(0)
      break
    }
    case 'bamboo': {
      const ba = Math.min(1,t*2)*(1-t)
      gfx.lineStyle(3, 0x4a9e2a, ba)
      for (let i=0;i<3;i++) {
        const ox=(i-1)*10, len=25*t, ang=-Math.PI/2+.3*(i-1)
        gfx.moveTo(ox, 10)
        gfx.lineTo(ox+Math.cos(ang)*len, 10+Math.sin(ang)*len)
      }
      gfx.lineStyle(0)
      break
    }
    case 'chain': {
      // Electric arc between two world-space points (gfx at 0,0)
      const dx = a.tx - a.ox, dy = a.ty - a.oy
      const len = Math.hypot(dx, dy)
      if (len < 1) break
      const px = -dy/len, py = dx/len  // perpendicular unit vector
      const segs = 8
      // Outer glow
      gfx.lineStyle(5*(1-t)+1, 0xFFD23F, alpha*0.4)
      gfx.moveTo(a.ox, a.oy)
      for (let i=1; i<segs; i++) {
        const f=i/segs, perp=Math.sin(i*2.3+t*18)*12*(1-t)
        gfx.lineTo(a.ox+dx*f+px*perp, a.oy+dy*f+py*perp)
      }
      gfx.lineTo(a.tx, a.ty)
      // Bright core
      gfx.lineStyle(2*(1-t)+0.5, 0xFFFFAA, alpha*0.95)
      gfx.moveTo(a.ox, a.oy)
      for (let i=1; i<segs; i++) {
        const f=i/segs, perp=Math.sin(i*2.3+t*18)*12*(1-t)
        gfx.lineTo(a.ox+dx*f+px*perp, a.oy+dy*f+py*perp)
      }
      gfx.lineTo(a.tx, a.ty)
      gfx.lineStyle(0)
      // Impact flash at destination
      gfx.beginFill(0xFFD23F, alpha*0.9)
      gfx.drawCircle(a.tx, a.ty, 7*(1-t))
      gfx.endFill()
      gfx.beginFill(0xFFFFFF, alpha*0.7)
      gfx.drawCircle(a.tx, a.ty, 3*(1-t))
      gfx.endFill()
      // Origin flash
      gfx.beginFill(0xFFD23F, alpha*0.5)
      gfx.drawCircle(a.ox, a.oy, 4*(1-t))
      gfx.endFill()
      break
    }
  }
}

// ── Tower hover/range visual (separate Graphics) ───────────────────────
export function drawHoverPreview(gfx, col, row, valid, range) {
  gfx.clear()
  gfx.beginFill(valid ? 0x64FF64 : 0xFF3C3C, 0.25)
  gfx.drawRect(col*CELL, row*CELL, CELL, CELL)
  gfx.endFill()
  gfx.lineStyle(1.5, valid ? 0x64FF64 : 0xFF6464, 0.55)
  gfx.setLineDash?.(5,5)
  gfx.drawCircle(tx(col), ty(row), range)
  gfx.lineStyle(0)
}

export function drawInspectRange(gfx, tower) {
  gfx.clear()
  if (!tower) return
  const { range } = towerStats(tower.type, tower.level)
  gfx.lineStyle(1.5, 0xFFDC32, 0.55)
  gfx.setLineDash?.(5,5)
  gfx.drawCircle(tx(tower.col), ty(tower.row), range)
  gfx.lineStyle(1.5, 0xFFDC32, 0.85)
  gfx.setLineDash?.()
  gfx.drawRect(tower.col*CELL+1, tower.row*CELL+1, CELL-2, CELL-2)
  gfx.lineStyle(0)
}

// ── matter-js physics engine (for arc projectiles) ────────────────────
export function createPhysicsEngine() {
  const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.5 } })
  return engine
}

const ARC_TOWERS = new Set(['monkey', 'hippo', 'panda'])

export function shouldUsePhysics(towerKey) {
  return ARC_TOWERS.has(towerKey)
}

export function createPhysicsProjectile(engine, proj, targetX, targetY) {
  const dx = targetX - proj.x
  const dy = targetY - proj.y
  const dist2 = Math.sqrt(dx*dx+dy*dy)
  const speed = 280
  const t = dist2 / speed

  // Calculate arc initial velocity to land on target
  const vx = dx / t
  const vy = dy / t - 0.5 * engine.gravity.y * 1.5 * t * 60

  const body = Matter.Bodies.circle(proj.x, proj.y, proj.radius, {
    restitution: proj.towerKey === 'monkey' ? 0.65 : 0.1,
    friction: 0.1,
    label: `proj_${proj.id}`,
  })
  Matter.Body.setVelocity(body, { x: vx / 60, y: vy / 60 })
  Matter.Composite.add(engine.world, body)
  return body
}
