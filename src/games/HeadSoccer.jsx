import { useState, useRef, useEffect, useCallback } from 'react'
import { COUNTRIES, getCountry, generateBracket } from './countries'
import { getMove } from './headSoccerMoves'
import OrientationGate from '../OrientationGate'
import './football.css'
import './headsoccer.css'

// ── Arena constants (single screen) ───────────────────────────────
const W = 900, H = 480
const GROUND_Y = 400
const CEIL     = 28
const GOAL_W   = 34          // goal opening depth
const GOAL_H   = 110         // kleiner doel → moeilijker scoren
const CROSSBAR = GROUND_Y - GOAL_H
const PR = 30                // physics player radius
const BR = 12                // ball radius
const GRAVITY    = 2100      // hogere zwaartekracht → minder hangtijd
const PLAYER_SPD = 260       // trager lopen
const JUMP_FORCE = 600       // lager springen
const BALL_BOUNCE = 0.62     // bal verliest meer energie
const KICK_RANGE = PR + BR + 16
const KICK_ANIM = 0.24       // iets langere schop-animatie (zwaarder gevoel)
const MATCH_TIME = 75        // iets langer potje (want minder goals)
const KICK_POWER = 480       // zwakker basis-schot
const AI_SPD_BY_DIFF = { 1: 145, 2: 170, 3: 200, 4: 235, 5: 265 }

const DEFAULT_UNLOCKED = ['nl', 'de', 'br', 'fr']
const UNLOCK_KEY = 'kk_hs_unlocked'

function loadUnlocked() {
  try {
    const v = JSON.parse(localStorage.getItem(UNLOCK_KEY))
    if (Array.isArray(v) && v.length) return v
  } catch { /* ignore */ }
  return [...DEFAULT_UNLOCKED]
}
function saveUnlocked(arr) {
  localStorage.setItem(UNLOCK_KEY, JSON.stringify([...new Set(arr)]))
}

// Reward-toernooi (gespeeld als beloning bij spelling): blijft tussen sessies bewaard.
const REWARD_KEY = 'kk_hs_reward'
function loadRewardTour() {
  try { const v = JSON.parse(localStorage.getItem(REWARD_KEY)); if (v && v.playerKey && v.bracket) return v } catch { /* ignore */ }
  return null
}
function saveRewardTour(v) { localStorage.setItem(REWARD_KEY, JSON.stringify(v)) }
function clearRewardTour() { localStorage.removeItem(REWARD_KEY) }

// ── Drawing helpers ───────────────────────────────────────────────
function isLight(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b > 140
}
function hexA(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

function drawShirt(ctx, x, y, country, r) {
  const { c1, c2, pattern } = country
  const d = r * 2
  ctx.save()
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip()
  switch (pattern) {
    case 'vstripes': {
      const sw = d / 3
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 === 0 ? c1 : c2; ctx.fillRect(x - r + i * sw, y - r, sw, d) }
      break
    }
    case 'hstripes':
      ctx.fillStyle = c1; ctx.fillRect(x - r, y - r, d, r)
      ctx.fillStyle = c2; ctx.fillRect(x - r, y, d, r); break
    case 'checker': {
      const cs = d / 4
      for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? c1 : c2
        ctx.fillRect(x - r + col * cs, y - r + row * cs, cs, cs)
      }
      break
    }
    case 'cross':
      ctx.fillStyle = c1; ctx.fillRect(x - r, y - r, d, d)
      ctx.fillStyle = c2; ctx.fillRect(x - 5, y - r, 10, d); ctx.fillRect(x - r, y - 5, d, 10); break
    default:
      ctx.fillStyle = c1; ctx.fillRect(x - r, y - r, d, d)
  }
  ctx.restore()
}

function drawPlayer(ctx, p, country) {
  // Head Soccer-stijl: GROTE kop, klein lijfje, dikke schoenen, zichtbare schop-voet.
  const now = Date.now()
  const facing = p.facing
  const moving = Math.abs(p.vx) > 12
  const headScale = p.t.bighead > 0 ? p.bigScale : 1
  const HR = PR * 1.12 * headScale          // grote kop
  const BW = PR * 0.78, BH = PR * 0.62       // klein lijfje
  const x = p.x, y = p.y
  const bodyCY = y + PR * 0.5                 // lijf onderaan
  const headCY = bodyCY - BH * 0.55 - HR * 0.78
  const charged = p.charge >= 1
  const auraOn = charged || p.t.dash > 0 || p.t.bighead > 0 || p.t.powershot > 0 || p.t.magnet > 0
  const run = p.onGround && moving ? Math.sin(now / 90) : 0

  // ── grond-schaduw ──
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 4, HR * 0.95, 7, 0, 0, Math.PI * 2); ctx.fill()

  // ── aura achter de speler ──
  if (auraOn) {
    const pulse = 0.5 + Math.sin(now / 110) * 0.18
    const ag = ctx.createRadialGradient(x, headCY, HR * 0.3, x, headCY, HR * 1.9)
    ag.addColorStop(0, hexA(p.move.color, 0.45 * pulse))
    ag.addColorStop(1, hexA(p.move.color, 0))
    ctx.fillStyle = ag
    ctx.beginPath(); ctx.arc(x, headCY, HR * 1.9, 0, Math.PI * 2); ctx.fill()
    if (charged) {
      // ring + ronddraaiende vonken als special klaar is
      ctx.strokeStyle = hexA(p.move.color, 0.9); ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.arc(x, headCY, HR + 7 + Math.sin(now / 130) * 2, 0, Math.PI * 2); ctx.stroke()
      for (let i = 0; i < 6; i++) {
        const a = now / 250 + (i / 6) * Math.PI * 2
        ctx.fillStyle = p.move.color
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * (HR + 10), headCY + Math.sin(a) * (HR + 10), 2.4, 0, Math.PI * 2); ctx.fill()
      }
    }
  }

  // ── benen / schoenen ──
  const hipY = bodyCY + BH * 0.15          // heup net onder lijf-midden
  const groundFootY = GROUND_Y - 4
  const shoe = (fx, fy, ang) => {
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(ang)
    ctx.fillStyle = '#1b1b1b'
    ctx.beginPath(); ctx.ellipse(facing * 2, 0, 10.5, 6, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.ellipse(facing * 5, -1.5, 3.4, 2, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
  const kicking = p.kickAnim > 0
  const kProg = kicking ? 1 - p.kickAnim / KICK_ANIM : 0       // 0..1
  const kSwing = kicking ? Math.sin(kProg * Math.PI) : 0       // uit en weer terug
  const bob = p.onGround && moving ? Math.sin(Date.now() / 90) * 4 : 0
  ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.strokeStyle = '#2a2a2a'

  // achterste been (steun): voet altijd op de grond, of hangt bij sprong
  const backHx = x - facing * 7
  const backFx = backHx - facing * bob * 0.4
  const backFy = p.onGround ? groundFootY : hipY + PR * 0.5
  ctx.beginPath(); ctx.moveTo(backHx, hipY); ctx.lineTo(backFx, backFy); ctx.stroke()
  shoe(backFx, backFy, 0)

  // voorste been
  const frontHx = x + facing * 7
  let frontFx, frontFy, shoeAng
  if (kicking) {
    const A = kSwing * 2.0                 // 0 → 2 rad: van omlaag naar vooruit/omhoog
    const len = PR * 0.95
    frontFx = frontHx + facing * Math.sin(A) * len
    frontFy = Math.min(groundFootY, hipY + Math.cos(A) * len)
    shoeAng = facing * A * 0.5
  } else if (!p.onGround) {
    frontFx = frontHx + facing * 4
    frontFy = hipY + PR * 0.5
    shoeAng = facing * 0.25
  } else {
    frontFx = frontHx + facing * bob * 0.4
    frontFy = groundFootY
    shoeAng = 0
  }
  ctx.beginPath(); ctx.moveTo(frontHx, hipY); ctx.lineTo(frontFx, frontFy); ctx.stroke()
  shoe(frontFx, frontFy, shoeAng)

  // schop-streep (motion lines achter de schietende voet)
  if (kicking && kSwing > 0.3) {
    ctx.save(); ctx.globalAlpha = kSwing * 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath()
      ctx.moveTo(frontFx - facing * (6 + i * 3), frontFy + i * 2)
      ctx.lineTo(frontFx - facing * (16 + i * 5), frontFy + i * 3)
      ctx.stroke()
    }
    ctx.restore()
  }

  // ── lijfje (shirt) ──
  ctx.save()
  ctx.beginPath(); ctx.ellipse(x, bodyCY, BW, BH, 0, 0, Math.PI * 2); ctx.clip()
  drawShirt(ctx, x, bodyCY, country, Math.max(BW, BH) + 4)
  ctx.restore()
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.ellipse(x, bodyCY, BW, BH, 0, 0, Math.PI * 2); ctx.stroke()

  // armpjes
  const armSwing = kicking ? 1.1 * facing : (moving ? run * 0.5 : 0.15)
  ctx.strokeStyle = '#F0B07A'; ctx.lineWidth = 5; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x - BW * 0.8, bodyCY - 2); ctx.lineTo(x - BW * 0.8 - 8, bodyCY + 8 + Math.sin(-armSwing) * 6); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + BW * 0.8, bodyCY - 2); ctx.lineTo(x + BW * 0.8 + 8, bodyCY + 8 + Math.sin(armSwing) * 6); ctx.stroke()

  // ── grote kop ──
  const hy = headCY
  // nek
  ctx.strokeStyle = '#F0B07A'; ctx.lineWidth = 7
  ctx.beginPath(); ctx.moveTo(x, hy + HR * 0.7); ctx.lineTo(x, bodyCY - BH * 0.4); ctx.stroke()

  ctx.fillStyle = '#F5C89A'
  ctx.beginPath(); ctx.arc(x, hy, HR, 0, Math.PI * 2); ctx.fill()
  // oren
  ctx.beginPath(); ctx.arc(x - HR, hy + 2, HR * 0.2, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + HR, hy + 2, HR * 0.2, 0, Math.PI * 2); ctx.fill()
  // haar
  ctx.save(); ctx.beginPath(); ctx.arc(x, hy, HR, 0, Math.PI * 2); ctx.clip()
  ctx.fillStyle = '#3a2417'; ctx.fillRect(x - HR, hy - HR, HR * 2, HR * 0.62)
  ctx.beginPath(); ctx.arc(x, hy - HR * 0.38, HR * 0.95, Math.PI, 0); ctx.fill()
  ctx.restore()
  // vlag-hoofdband
  ctx.save(); ctx.beginPath(); ctx.arc(x, hy, HR, 0, Math.PI * 2); ctx.clip()
  ctx.fillStyle = country.c1; ctx.fillRect(x - HR, hy - HR * 0.5, HR * 2, HR * 0.16)
  ctx.fillStyle = country.c2 || '#fff'; ctx.fillRect(x - HR, hy - HR * 0.5 + HR * 0.16, HR * 2, HR * 0.05)
  ctx.restore()
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(x, hy, HR, 0, Math.PI * 2); ctx.stroke()

  // ── gezicht ──
  const eyeOX = HR * 0.36, eyeOY = hy + HR * 0.04, eyeR = HR * 0.3, pupR = HR * 0.15
  const pupOX = facing * pupR * 0.45
  if (p.dizzy <= 0) {
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.ellipse(x - eyeOX, eyeOY, eyeR, eyeR * 1.15, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(x + eyeOX, eyeOY, eyeR, eyeR * 1.15, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath(); ctx.arc(x - eyeOX + pupOX, eyeOY + pupR * 0.2, pupR, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(x + eyeOX + pupOX, eyeOY + pupR * 0.2, pupR, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath(); ctx.arc(x - eyeOX + pupOX + 2, eyeOY - 1, pupR * 0.4, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(x + eyeOX + pupOX + 2, eyeOY - 1, pupR * 0.4, 0, Math.PI * 2); ctx.fill()
    // wenkbrauwen (fel/strijdlustig)
    ctx.strokeStyle = '#3a2417'; ctx.lineWidth = 3; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(x - eyeOX - eyeR * 0.7, eyeOY - eyeR * 0.9); ctx.lineTo(x - eyeOX + eyeR * 0.6, eyeOY - eyeR * 1.3); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + eyeOX + eyeR * 0.7, eyeOY - eyeR * 0.9); ctx.lineTo(x + eyeOX - eyeR * 0.6, eyeOY - eyeR * 1.3); ctx.stroke()
    // mond — open schreeuw bij schoppen, anders glimlach
    ctx.fillStyle = '#7a2b1c'; ctx.strokeStyle = '#5a1e12'; ctx.lineWidth = 2
    if (kicking) { ctx.beginPath(); ctx.ellipse(x, hy + HR * 0.45, HR * 0.18, HR * 0.16, 0, 0, Math.PI * 2); ctx.fill() }
    else { ctx.strokeStyle = '#5a1e12'; ctx.beginPath(); ctx.arc(x, hy + HR * 0.3, HR * 0.28, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke() }
  } else {
    ctx.strokeStyle = '#FF3333'; ctx.lineWidth = 3; ctx.lineCap = 'round'
    const xSz = eyeR * 0.8
    ;[-1, 1].forEach(sign => {
      const ex = x + sign * eyeOX
      ctx.beginPath(); ctx.moveTo(ex - xSz, eyeOY - xSz); ctx.lineTo(ex + xSz, eyeOY + xSz); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(ex + xSz, eyeOY - xSz); ctx.lineTo(ex - xSz, eyeOY + xSz); ctx.stroke()
    })
    for (let i = 0; i < 4; i++) {
      const a = now / 200 + (i / 4) * Math.PI * 2
      ctx.fillStyle = '#FFD23F'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('★', x + Math.cos(a) * (HR + 12), hy - HR * 0.7 + Math.sin(a) * 9)
    }
  }
}

function drawBall(ctx, b) {
  const x = b.x, y = b.y, angle = b.angle
  const now = Date.now()
  const fxOn = b.fx && b.fx.t > 0
  const fxK = fxOn ? Math.min(1, b.fx.t / 0.5) : 0
  const speed = Math.hypot(b.vx || 0, b.vy || 0)
  const s = b.scale || 1
  const ghost = b.ghostT > 0
  ctx.save()
  if (ghost) ctx.globalAlpha = 0.4 + Math.sin(now / 130) * 0.12
  if (s !== 1) { ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y) }

  // ── trail ──
  if (b.trail && b.trail.length > 1) {
    for (let i = 0; i < b.trail.length; i++) {
      const tp = b.trail[i]
      const k = i / b.trail.length
      const rad = BR * (0.4 + k * 0.6)
      ctx.globalAlpha = k * (fxOn ? 0.7 : 0.32)
      ctx.fillStyle = fxOn ? b.fx.color : '#ffffff'
      ctx.beginPath(); ctx.arc(tp.x, tp.y, rad, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // grond-schaduw
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 3, BR, 4, 0, 0, Math.PI * 2); ctx.fill()

  // ── power-FX rond de bal ──
  if (fxOn) {
    const c = b.fx.color
    // gloed
    const gl = ctx.createRadialGradient(x, y, 1, x, y, BR * 3)
    gl.addColorStop(0, hexA(c, 0.6 * fxK)); gl.addColorStop(1, hexA(c, 0))
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, BR * 3, 0, Math.PI * 2); ctx.fill()
    if (b.fx.type === 'flame') {
      for (let i = 0; i < 7; i++) {
        const a = now / 60 + i; const fr = BR * (1.2 + Math.sin(now / 70 + i) * 0.4)
        ctx.fillStyle = i % 2 ? hexA('#ffcf33', 0.8 * fxK) : hexA(c, 0.8 * fxK)
        ctx.beginPath(); ctx.arc(x - b.vx * 0.012 + Math.cos(a) * fr, y - b.vy * 0.012 + Math.sin(a) * fr, BR * 0.55, 0, Math.PI * 2); ctx.fill()
      }
    } else if (b.fx.type === 'electric') {
      ctx.strokeStyle = hexA('#bde0ff', fxK); ctx.lineWidth = 2
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(x, y)
        let px = x, py = y
        for (let s = 0; s < 4; s++) { px += (Math.random() - 0.5) * BR * 2.4; py += (Math.random() - 0.5) * BR * 2.4; ctx.lineTo(px, py) }
        ctx.stroke()
      }
    } else { // energy
      ctx.strokeStyle = hexA(c, fxK); ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(x, y, BR * (1.6 + Math.sin(now / 80) * 0.2), 0, Math.PI * 2); ctx.stroke()
    }
  } else if (speed > 700) {
    // snelle bal: subtiele speed-gloed
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.beginPath(); ctx.arc(x, y, BR * 1.5, 0, Math.PI * 2); ctx.fill()
  }

  // ── bal zelf ──
  const g = ctx.createRadialGradient(x - BR * 0.35, y - BR * 0.35, 1, x, y, BR)
  g.addColorStop(0, '#fff'); g.addColorStop(0.55, '#eee'); g.addColorStop(1, '#ccc')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, BR, 0, Math.PI * 2); ctx.fill()
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, BR, 0, Math.PI * 2); ctx.clip()
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath()
  for (let i = 0; i < 5; i++) { const a = angle + (i / 5) * Math.PI * 2 - Math.PI / 2, r = BR * 0.38; i === 0 ? ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) }
  ctx.closePath(); ctx.fill()
  for (let pp = 0; pp < 5; pp++) {
    const pa = angle + (pp / 5) * Math.PI * 2
    const cx = x + Math.cos(pa) * BR * 0.75, cy = y + Math.sin(pa) * BR * 0.75
    ctx.beginPath()
    for (let i = 0; i < 5; i++) { const a = pa + (i / 5) * Math.PI * 2 - Math.PI / 2, r = BR * 0.26; i === 0 ? ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) }
    ctx.closePath(); ctx.fill()
  }
  ctx.restore()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath(); ctx.arc(x - BR * 0.32, y - BR * 0.32, BR * 0.22, 0, Math.PI * 2); ctx.fill()
  // bal-transformatie: emoji over de bal (vuurbal/tijger/spook/raket…)
  if (b.emoji) {
    const es = BR * 2.2
    ctx.font = `${es}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(b.vy || 0, b.vx || 0) * 0.3)
    ctx.fillText(b.emoji, 0, 0); ctx.restore()
  }
  ctx.restore()
}

// expanding ring shockwaves
function drawShockwaves(ctx, list) {
  for (const s of list) {
    const k = 1 - s.t / s.dur
    ctx.globalAlpha = (1 - k) * 0.8
    ctx.strokeStyle = s.color; ctx.lineWidth = 4 * (1 - k) + 1
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r0 + (s.maxR - s.r0) * k, 0, Math.PI * 2); ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function drawGoal(ctx, side) {
  const x0 = side === 'L' ? 0 : W - GOAL_W
  // net
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  ctx.fillRect(x0, CROSSBAR, GOAL_W, GOAL_H)
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1
  for (let gx = x0 + 4; gx < x0 + GOAL_W; gx += 8) { ctx.beginPath(); ctx.moveTo(gx, CROSSBAR); ctx.lineTo(gx, GROUND_Y); ctx.stroke() }
  for (let gy = CROSSBAR + 6; gy < GROUND_Y; gy += 8) { ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x0 + GOAL_W, gy); ctx.stroke() }
  // posts
  ctx.fillStyle = '#f2f2f2'
  const postX = side === 'L' ? GOAL_W - 6 : x0
  ctx.fillRect(postX, CROSSBAR, 6, GOAL_H)        // upright
  ctx.fillRect(x0, CROSSBAR - 6, GOAL_W, 6)        // crossbar
  ctx.restore()
}

function drawArena(ctx, ph) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
  sky.addColorStop(0, '#0a1a2e'); sky.addColorStop(1, '#1a4060')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND_Y)
  // crowd band
  ctx.fillStyle = 'rgba(5,10,20,0.7)'; ctx.fillRect(0, 0, W, 46)
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `hsl(${(i * 137) % 360},55%,58%)`; ctx.globalAlpha = 0.7
    ctx.beginPath(); ctx.arc((i * 71 + 13) % W, 8 + (i * 31) % 32, 2.6, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
  // floodlights
  ;[120, W - 120].forEach(lx => {
    const lg = ctx.createRadialGradient(lx, 50, 2, lx, 50, 90)
    lg.addColorStop(0, 'rgba(255,240,200,0.16)'); lg.addColorStop(1, 'rgba(255,240,200,0)')
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, 50, 90, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#ffe8b0'; ctx.beginPath(); ctx.arc(lx, 50, 5, 0, Math.PI * 2); ctx.fill()
  })
  // pitch
  ctx.fillStyle = '#267a32'; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y)
  for (let x = 0; x < W; x += 120) { ctx.fillStyle = Math.floor(x / 120) % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.025)'; ctx.fillRect(x, GROUND_Y, 120, H - GROUND_Y) }
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(GOAL_W, GROUND_Y); ctx.lineTo(W - GOAL_W, GROUND_Y); ctx.stroke()
  // center line
  ctx.setLineDash([6, 8]); ctx.strokeStyle = 'rgba(255,255,255,0.2)'
  ctx.beginPath(); ctx.moveTo(W / 2, CEIL); ctx.lineTo(W / 2, GROUND_Y); ctx.stroke(); ctx.setLineDash([])

  drawGoal(ctx, 'L'); drawGoal(ctx, 'R')

  // shields
  if (ph.L.t.shield > 0) drawShieldWall(ctx, 'L', ph.L.move.color)
  if (ph.R.t.shield > 0) drawShieldWall(ctx, 'R', ph.R.move.color)
}

function drawTornado(ctx, T) {
  const now = Date.now()
  const H_T = GROUND_Y - CEIL - 10        // reusachtig: bijna volledige veldhoogte
  const N = 16
  ctx.save()
  // donkere kern-gloed
  ctx.globalAlpha = 0.18; ctx.fillStyle = T.color
  ctx.beginPath(); ctx.ellipse(T.x, GROUND_Y - H_T * 0.5, 90, H_T * 0.5, 0, 0, Math.PI * 2); ctx.fill()
  for (let i = 0; i < N; i++) {
    const k = i / N
    const cy = GROUND_Y - k * H_T
    const w = 18 + k * 95                  // breed bovenin
    const ox = Math.sin(now / 70 + i * 0.8) * (8 + k * 26)
    ctx.globalAlpha = 0.4 + k * 0.4
    ctx.fillStyle = i % 2 ? hexA(T.color, 0.8) : 'rgba(225,240,255,0.7)'
    ctx.beginPath(); ctx.ellipse(T.x + ox, cy, w, 9 + k * 6, 0, 0, Math.PI * 2); ctx.fill()
  }
  // ronddwarrelende stukjes
  ctx.globalAlpha = 0.8
  for (let i = 0; i < 10; i++) {
    const a = now / 120 + i, ry = GROUND_Y - ((i * 37 + (now / 6)) % H_T)
    const rk = (GROUND_Y - ry) / H_T
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(T.x + Math.cos(a) * (20 + rk * 80), ry, 3, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1; ctx.restore()
}

function drawIce(ctx, p) {
  const now = Date.now()
  ctx.save()
  ctx.fillStyle = 'rgba(150,210,255,0.4)'
  ctx.strokeStyle = 'rgba(220,245,255,0.9)'; ctx.lineWidth = 2
  const w = PR * 1.5, h = PR * 2.6
  ctx.beginPath(); ctx.rect(p.x - w, p.y - PR - h * 0.45, w * 2, h); ctx.fill(); ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'
  ctx.fillText('❄️', p.x, p.y - PR + Math.sin(now / 200) * 2)
  ctx.restore()
}

function shieldX(side) { return side === 'L' ? GOAL_W + 40 : W - GOAL_W - 40 }
function drawShieldWall(ctx, side, color) {
  const sx = shieldX(side)
  ctx.save(); ctx.globalAlpha = 0.35 + Math.sin(Date.now() / 120) * 0.1
  ctx.fillStyle = color
  ctx.fillRect(sx - 5, CROSSBAR, 10, GOAL_H)
  ctx.globalAlpha = 1; ctx.strokeStyle = color; ctx.lineWidth = 2
  ctx.strokeRect(sx - 5, CROSSBAR, 10, GOAL_H); ctx.restore()
}

// ── Special-move demo (klein loopend filmpje) ─────────────────────
function SpecialDemo({ countryKey }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const ctx = cv.getContext('2d')
    const country = getCountry(countryKey), move = getMove(countryKey)
    const dummyC = COUNTRIES.find(c => c.key !== countryKey) || country
    const showDummy = ['freeze', 'charge', 'quake'].includes(move.effect)
    const VW = 520, VX = 100, VY = 150
    const scale = cv.width / VW
    const G = GROUND_Y

    const mkP = (px, facing) => ({
      side: facing > 0 ? 'L' : 'R', move: facing > 0 ? move : getMove(dummyC.key), facing,
      x: px, y: G - PR, vx: 0, vy: 0, onGround: true, dizzy: 0, kickCD: 0, kickAnim: 0,
      charge: 0, bigScale: 1, powMult: 1, powCurve: false, powFx: 'energy',
      t: { dash: 0, bighead: 0, magnet: 0, shield: 0, powershot: 0, frozen: 0 },
    })
    const p = mkP(VX + 80, 1)
    const dummy = mkP(VX + VW - 90, -1)
    const newBall = () => ({ x: p.x + 46, y: G - 26, vx: 0, vy: 0, angle: 0, spin: 0, scale: 1, ghostT: 0, bouncyT: 0, trail: [], fx: { t: 0, type: 'energy', color: '#fff' } })
    let ball = newBall()
    let shocks = [], parts = [], decoys = [], tornado = null, mascots = [], tt = 0, triggered = false
    const period = 3.0

    const reset = () => {
      p.x = VX + 80; p.y = G - PR; p.vx = 0; p.vy = 0; p.onGround = true; p.charge = 0; p.bigScale = 1
      for (const k in p.t) p.t[k] = 0
      dummy.x = VX + VW - 90; dummy.dizzy = 0; dummy.vx = 0; dummy.vy = 0; for (const k in dummy.t) dummy.t[k] = 0
      ball = newBall()
      shocks = []; parts = []; decoys = []; tornado = null; mascots = []; triggered = false
    }
    const burst = (x, y, color, n = 20) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 300 * (0.4 + Math.random()); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: 0.5 + Math.random() * 0.4, color, r: 2 + Math.random() * 3 }) } }
    const goalDir = () => { const gx = W - 4, gy = (G - 175) + 90; const dx = gx - ball.x, dy = gy - ball.y, d = Math.hypot(dx, dy) || 1; return { x: dx / d, y: dy / d } }
    const trigger = () => {
      triggered = true
      const pa = move.params
      shocks.push({ x: p.x, y: p.y - PR * 0.4, color: move.color, r0: 6, maxR: 130, t: 0.5, dur: 0.5 })
      burst(p.x, p.y - PR, move.color)
      mascots.push({ emoji: move.mascot || move.emoji, x: p.x - 30, y: p.y - PR - 10, vx: 360, t: 1.3, dur: 1.3, scale: 0 })
      if (move.ballEmoji) { ball.emoji = move.ballEmoji; ball.emojiT = 2.5 }
      p.kickAnim = KICK_ANIM
      const g = goalDir()
      switch (move.effect) {
        case 'charge': p.t.dash = 0.5; p.vx = 760; dummy.dizzy = 1; dummy.vx = 520; dummy.vy = -200; dummy.onGround = false; ball.vx = 760; ball.vy = -260; ball.fx = { t: 0.8, type: 'energy', color: move.color }; break
        case 'rocket': ball.vx = g.x * 1500; ball.vy = g.y * 1500; ball.fx = { t: 1, type: pa.fx || 'electric', color: move.color }; break
        case 'multiball': ball.vx = g.x * 1000; ball.vy = g.y * 1000; ball.fx = { t: 1, type: 'energy', color: move.color }; for (let i = 0; i < 2; i++) { const a = (i ? 1 : -1) * 0.22; decoys.push({ x: ball.x, y: ball.y, vx: ball.vx * Math.cos(a) - ball.vy * Math.sin(a), vy: ball.vx * Math.sin(a) + ball.vy * Math.cos(a), angle: 0, life: 1.4, color: move.color }) } break
        case 'firecurve': ball.vx = 560 * (pa.mult || 2); ball.vy = -320; ball.spin = (pa.curve || 1) * 1100; ball.fx = { t: 1, type: 'flame', color: move.color }; break
        case 'rocketcurve': break
        case 'freeze': dummy.t.frozen = pa.dur; dummy.frozenFactor = 0; dummy.dizzy = pa.dur; shocks.push({ x: dummy.x, y: dummy.y - PR * 0.4, color: move.color, r0: 6, maxR: 100, t: 0.5, dur: 0.5 }); burst(dummy.x, dummy.y - PR, move.color, 14); break
        case 'bighead': p.t.bighead = 2.2; p.bigScale = pa.scale; ball.vx = 600; ball.vy = -360; ball.fx = { t: 0.7, type: 'energy', color: move.color }; break
        case 'magnet': p.t.magnet = 2.2; ball.x = p.x + 210; ball.y = G - 80; break
        case 'shield': p.t.shield = 2.4; break
        case 'teleport': shocks.push({ x: ball.x, y: ball.y - PR * 0.4, color: move.color, r0: 6, maxR: 110, t: 0.5, dur: 0.5 }); p.x = ball.x - PR - 6; break
        case 'quake': dummy.dizzy = 1; dummy.vx = 560; dummy.vy = -360; dummy.onGround = false; shocks.push({ x: p.x, y: G, color: move.color, r0: 8, maxR: 260, t: 0.6, dur: 0.6 }); ball.vy = -460; break
        case 'tornado': tornado = { x: p.x + 30, vx: 150, t: 2.4, color: move.color }; break
        case 'giantball': ball.scale = pa.scale; ball.scaleT = pa.dur; ball.fx = { t: 0.8, type: 'flame', color: move.color }; ball.vx = 360; ball.vy = -300; break
        case 'superjump': p.vy = -900; p.onGround = false; ball.vx = 320; ball.vy = -720; ball.fx = { t: 0.7, type: 'energy', color: move.color }; break
        case 'bouncy': ball.bouncyT = 3; ball.vx = g.x * 900; ball.vy = -520; ball.fx = { t: 1, type: 'energy', color: move.color }; break
        case 'ghost': ball.ghostT = 3; ball.vx = g.x * 1150; ball.vy = g.y * 1150; ball.fx = { t: 1, type: 'energy', color: move.color }; break
        default: ball.vx = 700; ball.vy = -340; ball.fx = { t: 0.8, type: 'energy', color: move.color }; break
      }
    }

    let last = performance.now(), raf = 0
    const loop = (now) => {
      let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05
      tt += dt
      if (!triggered && tt > 1.0) trigger()
      if (tt > period) { tt = 0; reset() }
      p.charge = triggered ? 1 : Math.min(1, tt / 1.0)

      for (const q of [p, dummy]) { for (const k in q.t) if (q.t[k] > 0) q.t[k] = Math.max(0, q.t[k] - dt); if (q.dizzy > 0) q.dizzy -= dt; if (q.kickAnim > 0) q.kickAnim -= dt; q.vy += GRAVITY * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.y >= G - PR) { q.y = G - PR; q.vy = 0; q.onGround = true } q.vx *= 0.9 }
      if (p.t.magnet > 0) { const dx = p.x - ball.x, dy = (p.y - PR) - ball.y, d = Math.hypot(dx, dy) || 1; ball.vx += dx / d * 3200 * dt; ball.vy += dy / d * 3200 * dt }
      if (tornado) { tornado.t -= dt; tornado.x += tornado.vx * dt; if (tornado.t <= 0) tornado = null; else { const dx = tornado.x - ball.x, dy = (G - 70) - ball.y, d = Math.hypot(dx, dy) || 1; if (d < 200) { ball.vx += dx / d * 3000 * dt + 200 * dt; ball.vy += dy / d * 3000 * dt } } }
      if (ball.scaleT > 0) { ball.scaleT -= dt; if (ball.scaleT <= 0) ball.scale = 1 }
      if (ball.ghostT > 0) ball.ghostT -= dt
      if (ball.bouncyT > 0) ball.bouncyT -= dt
      const ebr = BR * (ball.scale || 1), bb = ball.bouncyT > 0 ? 0.95 : 0.6
      ball.vy += GRAVITY * 0.55 * dt; ball.vx += ball.spin * dt * 0.06; ball.spin *= 0.96
      ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.angle += ball.vx * dt * 0.05
      if (ball.y >= G - ebr) { ball.y = G - ebr; ball.vy = -ball.vy * bb; ball.vx *= 0.97 }
      ball.trail.push({ x: ball.x, y: ball.y }); while (ball.trail.length > (ball.fx.t > 0 ? 16 : 8)) ball.trail.shift()
      if (ball.fx.t > 0) ball.fx.t -= dt
      for (const d of decoys) { d.vy += GRAVITY * 0.55 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.angle += d.vx * dt * 0.05; if (d.y >= G - BR) { d.y = G - BR; d.vy = -d.vy * 0.6 } d.life -= dt }
      decoys = decoys.filter(d => d.life > 0)
      for (const ms of mascots) { ms.t -= dt; ms.x += ms.vx * dt; ms.scale = Math.min(1, ms.scale + dt * 4) }
      mascots = mascots.filter(ms => ms.t > 0)
      for (const s of shocks) s.t -= dt; shocks = shocks.filter(s => s.t > 0)
      for (const pt of parts) { pt.vy += 800 * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt } parts = parts.filter(q => q.life > 0)

      ctx.clearRect(0, 0, cv.width, cv.height)
      const sky = ctx.createLinearGradient(0, 0, 0, cv.height); sky.addColorStop(0, '#0a1a2e'); sky.addColorStop(1, '#1a4060')
      ctx.fillStyle = sky; ctx.fillRect(0, 0, cv.width, cv.height)
      ctx.save(); ctx.scale(scale, scale); ctx.translate(-VX, -VY)
      ctx.fillStyle = '#267a32'; ctx.fillRect(VX - 20, G, VW + 40, 200)
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(VX - 20, G); ctx.lineTo(VX + VW + 20, G); ctx.stroke()
      if (p.t.shield > 0) { ctx.save(); ctx.globalAlpha = 0.4 + Math.sin(now / 120) * 0.1; ctx.fillStyle = move.color; ctx.fillRect(p.x + 70, G - 150, 10, 146); ctx.restore() }
      drawShockwaves(ctx, shocks)
      for (const pt of parts) { ctx.globalAlpha = Math.max(0, pt.life * 1.4); ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r || 3, 0, Math.PI * 2); ctx.fill() } ctx.globalAlpha = 1
      for (const d of decoys) { ctx.globalAlpha = Math.min(0.85, d.life); drawBall(ctx, { x: d.x, y: d.y, angle: d.angle, trail: [], fx: { t: 0.4, type: 'energy', color: d.color }, scale: 1 }); ctx.globalAlpha = 1 }
      if (tornado) { ctx.save(); for (let i = 0; i < 7; i++) { const k = i / 7, cy = G - k * 150, w = 14 + k * 46, ox = Math.sin(now / 90 + i) * (6 + k * 10); ctx.globalAlpha = 0.35 + k * 0.4; ctx.fillStyle = i % 2 ? hexA(move.color, 0.7) : 'rgba(220,235,255,0.65)'; ctx.beginPath(); ctx.ellipse(tornado.x + ox, cy, w, 7 + k * 4, 0, 0, Math.PI * 2); ctx.fill() } ctx.globalAlpha = 1; ctx.restore() }
      if (showDummy) { drawPlayer(ctx, dummy, dummyC); if (dummy.t.frozen > 0) drawIce(ctx, dummy) }
      drawPlayer(ctx, p, country)
      drawBall(ctx, ball)
      for (const ms of mascots) { ctx.globalAlpha = Math.max(0, Math.min(1, ms.t / 0.3)); ctx.font = `${60 * ms.scale}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ms.emoji, ms.x, ms.y); ctx.globalAlpha = 1 }
      ctx.restore()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [countryKey])
  return <canvas ref={ref} width={300} height={188} className="hs-demo-canvas" />
}

// ── Toernooi-bracket ──────────────────────────────────────────────
function Bracket({ bracket, playerKey }) {
  const me = getCountry(playerKey)
  return (
    <div className="hs-bracket">
      {bracket.opponents.map((ok, i) => {
        const opp = getCountry(ok)
        const res = bracket.results[i]
        const cur = i === bracket.currentRound && res === undefined
        return (
          <div key={i} className={`hs-br-row${cur ? ' cur' : ''}${res ? ' ' + res : ''}`}>
            <span className="hs-br-round">{bracket.roundNames[i]}</span>
            <span className="hs-br-match">
              <span className="hs-br-flag">{me.flag}</span>
              <span className="hs-br-mid">{res === 'win' ? '✅' : res === 'lose' ? '❌' : 'vs'}</span>
              <span className="hs-br-flag">{opp.flag}</span>
              <span className="hs-br-name">{opp.name}</span>
              <span className="hs-br-stars">{'★'.repeat(opp.diff)}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────
export default function HeadSoccer({ onBack, addCuruntie, reward = false }) {
  const rewardTour = reward ? loadRewardTour() : null
  const [unlocked, setUnlocked] = useState(loadUnlocked)
  const [phase, setPhase]   = useState(reward ? (rewardTour ? 'reward_round' : 'reward_select') : 'select')
  const [playerKey, setPlayerKey] = useState(rewardTour?.playerKey || null)
  const [oppKey, setOppKey] = useState(null)
  const [bracket, setBracket] = useState(rewardTour?.bracket || null)  // {playerKey, currentRound, opponents[], roundNames[], results[]}
  const [score, setScore]   = useState({ L: 0, R: 0 })
  const [result, setResult] = useState(null)        // 'win' | 'lose'
  const [mysteryReveal, setMysteryReveal] = useState(null)
  const [coinsEarned, setCoinsEarned] = useState(0)

  const canvasRef = useRef(null)
  const controlsRef = useRef({ left: false, right: false, jump: false, kick: false, special: false })
  const stateRef = useRef(null)
  const onMatchEndRef = useRef(null)

  const isWK = !!bracket
  const playerCountry = playerKey ? getCountry(playerKey) : null
  const oppCountry = oppKey ? getCountry(oppKey) : null

  // ── selection ──
  const choosePlayer = key => { setPlayerKey(key); setPhase('mode') }
  const startQuick = () => {
    const pool = COUNTRIES.filter(c => c.key !== playerKey)
    const opp = pool[Math.floor(Math.random() * pool.length)].key
    setOppKey(opp); setBracket(null); setCoinsEarned(0); setPhase('match')
  }
  const startWK = () => {
    const b = generateBracket(playerKey)
    setBracket(b); setOppKey(b.opponents[0]); setCoinsEarned(0); setPhase('wk_bracket')
  }

  // ── reward-toernooi (één ronde per beloning, blijft tussen sessies) ──
  const rewardChoosePlayer = key => {
    const b = generateBracket(key)
    setPlayerKey(key); setBracket(b)
    saveRewardTour({ playerKey: key, bracket: b })
    setPhase('reward_round')
  }
  const rewardStartRound = () => { setOppKey(bracket.opponents[bracket.currentRound]); setCoinsEarned(0); setPhase('match') }

  // ── match end handling ──
  const handleMatchEnd = useCallback((finalScore) => {
    const won = finalScore.L > finalScore.R
    setScore(finalScore)
    setResult(won ? 'win' : 'lose')
    if (won) { addCuruntie?.(15); setCoinsEarned(c => c + 15) }

    // reward-modus: speel precies één ronde, bewaar voortgang, ga daarna terug
    if (reward) {
      if (won && bracket.currentRound >= 3) {
        addCuruntie?.(50); setCoinsEarned(c => c + 50)
        const locked = COUNTRIES.filter(c => !unlocked.includes(c.key)).map(c => c.key)
        if (locked.length) { const w = locked[Math.floor(Math.random() * locked.length)]; const next = [...unlocked, w]; setUnlocked(next); saveUnlocked(next); setMysteryReveal(w) }
        else setMysteryReveal(null)
        clearRewardTour(); setPhase('reward_champ'); return
      }
      if (won) {
        const nb = { ...bracket, currentRound: bracket.currentRound + 1, results: [...bracket.results, 'win'] }
        setBracket(nb); saveRewardTour({ playerKey, bracket: nb })
      } else {
        // verloren → blijf in dezelfde ronde (volgende keer opnieuw deze ronde)
        saveRewardTour({ playerKey, bracket })
      }
      setPhase('reward_result'); return
    }

    if (!bracket) { setPhase('result'); return }
    const results = [...bracket.results, won ? 'win' : 'lose']
    if (!won) { setBracket(b => ({ ...b, results })); setPhase('wk_lost'); return }
    if (bracket.currentRound >= 3) {
      setBracket(b => ({ ...b, results }))
      addCuruntie?.(50); setCoinsEarned(c => c + 50)
      // mystery box: unlock random locked country
      const locked = COUNTRIES.filter(c => !unlocked.includes(c.key)).map(c => c.key)
      if (locked.length) {
        const win = locked[Math.floor(Math.random() * locked.length)]
        const next = [...unlocked, win]
        setUnlocked(next); saveUnlocked(next); setMysteryReveal(win)
      } else {
        addCuruntie?.(50); setCoinsEarned(c => c + 50); setMysteryReveal(null)
      }
      setPhase('wk_won'); return
    }
    const nextRound = bracket.currentRound + 1
    setBracket(b => ({ ...b, currentRound: nextRound, results }))
    setOppKey(bracket.opponents[nextRound])
    setPhase('wk_round')
  }, [bracket, unlocked, addCuruntie, reward, playerKey])
  onMatchEndRef.current = handleMatchEnd

  const nextWKMatch = () => { setPhase('match') }

  // ── match engine ──
  useEffect(() => {
    if (phase !== 'match') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const pMove = getMove(playerKey), oMove = getMove(oppKey)
    const oppDiff = oppCountry?.diff || 3
    const aiSpd = AI_SPD_BY_DIFF[oppDiff] || 240

    const mkPlayer = (side, move) => ({
      side, move, facing: side === 'L' ? 1 : -1,
      x: side === 'L' ? W * 0.28 : W * 0.72, y: GROUND_Y - PR,
      vx: 0, vy: 0, onGround: true, dizzy: 0, kickCD: 0, kickAnim: 0,
      charge: 0, bigScale: 1, powMult: 1, powCurve: false, powCurveDir: 1, dashVx: 0, powFx: 'energy',
      magForce: 0, frozenFactor: 1, comebackT: 0,
      ram: false, ramKnock: 0, ramStun: 0,
      t: { dash: 0, bighead: 0, magnet: 0, shield: 0, powershot: 0, frozen: 0 },
    })
    const mkBall = (x, y) => ({ x, y, vx: 0, vy: 0, angle: 0, spin: 0, scale: 1, scaleT: 0, ghostT: 0, bouncyT: 0, emoji: null, emojiT: 0, homing: 0, homingStr: 4, trail: [], fx: { t: 0, type: 'energy', color: '#fff' } })
    const S = {
      L: mkPlayer('L', pMove), R: mkPlayer('R', oMove),
      ball: mkBall(W / 2, GROUND_Y - 120),
      decoys: [], tornado: null, mascots: [],
      cutin: { t: 0, dur: 0 },
      score: { L: 0, R: 0 }, time: MATCH_TIME, golden: false,
      kickoffT: 0.8, msg: '', msgT: 0, ended: false, particles: [],
      shockwaves: [], shake: { t: 0, mag: 0 }, goalFlash: { t: 0, color: '#fff' }, specFlash: { t: 0, color: '#fff' },
    }
    stateRef.current = S

    const resetPositions = (serveTo) => {
      S.L.x = W * 0.28; S.L.y = GROUND_Y - PR; S.L.vx = 0; S.L.vy = 0; S.L.onGround = true
      S.R.x = W * 0.72; S.R.y = GROUND_Y - PR; S.R.vx = 0; S.R.vy = 0; S.R.onGround = true
      S.ball = mkBall(W / 2, GROUND_Y - 120)
      S.ball.vx = serveTo === 'L' ? -90 : serveTo === 'R' ? 90 : 0
      S.decoys = []; S.tornado = null; S.mascots = []
      S.kickoffT = 0.6
    }
    const flash = txt => { S.msg = txt; S.msgT = 1.2 }
    const addParticles = (x, y, color, n = 14, spd = 320) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = spd * (0.4 + Math.random() * 0.8); S.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.3, life: 0.4 + Math.random() * 0.5, color, r: 2 + Math.random() * 3 }) } }
    const addShock = (x, y, color, maxR = 90, dur = 0.45) => S.shockwaves.push({ x, y, color, r0: 6, maxR, t: dur, dur })
    const addShake = (mag, dur = 0.3) => { if (mag > S.shake.mag || S.shake.t <= 0) { S.shake.mag = mag; S.shake.t = dur; S.shake.dur = dur } }
    const setBallFx = (color, type) => { S.ball.fx = { t: 0.6, type: type || 'energy', color } }

    const triggerPower = (p) => {
      // grote knal-fx wanneer een powershot de bal raakt
      const fx = p.powFx || 'energy'
      setBallFx(p.move.color, fx)
      if (p.move.ballEmoji) { S.ball.emoji = p.move.ballEmoji; S.ball.emojiT = 1.2 }
      addParticles(S.ball.x, S.ball.y, p.move.color, 28, 480)
      addParticles(S.ball.x, S.ball.y, '#ffffff', 12, 300)
      addShock(S.ball.x, S.ball.y, p.move.color, 140, 0.5)
      addShake(12, 0.35)
      p.t.powershot = 0
    }

    // pak de bal bij de voeten van de speler (special-shots starten altijd met de bal)
    const grabBall = (p) => { S.ball.x = p.x + p.facing * (PR + BR); S.ball.y = p.y - PR * 0.3; S.ball.vx = 0; S.ball.vy = 0; S.ball.spin = 0; S.ball.scale = 1 }
    // mik de bal richting het doel van de tegenstander (op kruishoogte)
    const aimAtGoal = (p, speed) => {
      const gx = p.facing > 0 ? W - 4 : 4
      const gy = CROSSBAR + GOAL_H * 0.5
      const dx = gx - S.ball.x, dy = gy - S.ball.y, d = Math.hypot(dx, dy) || 1
      S.ball.vx = dx / d * speed; S.ball.vy = dy / d * speed
    }

    const spawnMascot = (p, m, opts = {}) => {
      // groot themed figuur dat over het veld zwiept (achter de bal langs)
      const baseSize = opts.size || 90
      const trail = opts.trail || 1
      const dur = opts.dur || 1.8
      for (let i = 0; i < trail; i++) {
        S.mascots.push({
          emoji: opts.emoji || m.mascot || m.emoji,
          x: (opts.x != null ? opts.x : p.x - p.facing * (40 + i * 30)),
          y: (opts.y != null ? opts.y : p.y - PR - 10) + (Math.random() - 0.5) * 16 - i * (opts.vy ? 40 : 0),
          vx: opts.vx != null ? opts.vx : p.facing * (520 + i * 40),
          vy: opts.vy != null ? opts.vy : 0,
          t: dur, dur, scale: opts.scale0 != null ? opts.scale0 : 0,
          size: baseSize + Math.random() * 10
        })
      }
    }
    // CINEMATISCHE entree per effect → elk land krijgt een groots, themed figuur
    const ENTRANCE = {
      charge: 'charge', rocket: 'sky', multiball: 'swarm', freeze: 'sky', bighead: 'rise',
      magnet: 'charge', firecurve: 'spin', shield: 'rise', teleport: 'spin', quake: 'sky',
      tornado: 'spin', giantball: 'sky', superjump: 'charge', bouncy: 'sky', ghost: 'swarm',
    }
    const bigEntrance = (p, m) => {
      const e = m.mascot || m.emoji, atk = p.facing, col = m.color
      const type = ENTRANCE[m.effect] || 'charge'
      if (type === 'sky') {                       // daalt reusachtig uit de lucht
        spawnMascot(p, m, { emoji: e, size: 175, x: p.x + atk * 120, y: CEIL - 50, vx: atk * 70, vy: 440, dur: 2.0, scale0: 0.2 })
        for (let i = 0; i < 22; i++) { const a = Math.random() * Math.PI * 2, v = 220 + Math.random() * 240; S.particles.push({ x: p.x + atk * 120, y: CEIL, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.2, color: i % 2 ? '#fff' : col, r: 2 + Math.random() * 3 }) }
      } else if (type === 'charge') {             // stormt gigantisch vanaf je eigen kant
        spawnMascot(p, m, { emoji: e, size: 165, x: p.x - atk * 220, y: GROUND_Y - PR - 6, vx: atk * 760, vy: 0, dur: 1.7, scale0: 0.4 })
        for (let i = 0; i < 18; i++) S.particles.push({ x: p.x - atk * 60, y: GROUND_Y - 5, vx: -atk * (160 + Math.random() * 160), vy: -60 - Math.random() * 90, life: 0.85, color: i % 2 ? '#caa' : col, r: 3 + Math.random() * 4 })
      } else if (type === 'rise') {               // rijst enorm op uit de grond
        spawnMascot(p, m, { emoji: e, size: 180, x: p.x, y: GROUND_Y + 140, vx: 0, vy: -300, dur: 1.9, scale0: 0.5 })
        for (let i = 0; i < 16; i++) S.particles.push({ x: p.x + (Math.random() - 0.5) * 80, y: GROUND_Y - 5, vx: (Math.random() - 0.5) * 200, vy: -150 - Math.random() * 160, life: 0.9, color: col, r: 3 + Math.random() * 4 })
      } else if (type === 'spin') {               // groot, draaiend figuur
        spawnMascot(p, m, { emoji: e, size: 160, x: p.x + atk * 40, y: p.y - PR - 30, vx: atk * 240, vy: -40, dur: 1.9, scale0: 0.25 })
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; S.particles.push({ x: p.x, y: p.y - PR, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, life: 1.0, color: i % 2 ? '#fff' : col, r: 3 + Math.random() * 3 }) }
      } else if (type === 'swarm') {              // hele zwerm figuren
        for (let i = 0; i < 6; i++) spawnMascot(p, m, { emoji: e, size: 95, x: p.x - atk * (30 + i * 36), y: p.y - PR - 10 + (Math.random() - 0.5) * 70, vx: atk * (520 + i * 70), vy: (Math.random() - 0.5) * 120, dur: 1.7, scale0: 0.2 })
      }
      addShock(p.x, p.y - PR * 0.4, col, 230, 0.7)
    }
    const activateSpecial = (p, opp) => {
      if (p.charge < 1 || p.dizzy > 0) return
      p.charge = 0
      // ALTIJD richting de goal van de tegenstander schieten (niet de kijkrichting!)
      p.facing = p.side === 'L' ? 1 : -1
      const m = p.move, pa = m.params
      addParticles(p.x, p.y - PR, m.color, 36, 480)
      addParticles(p.x, p.y - PR, '#ffffff', 18, 360)
      addShock(p.x, p.y - PR * 0.4, m.color, 200, 0.65)
      addShock(p.x, p.y - PR * 0.4, '#ffffff', 100, 0.5)
      addShake(14, 0.45)
      S.specFlash = { t: 0.5, color: m.color }
      // langere cinematische slow-motion cut-in zodat je de special echt ziet
      S.cutin = { t: 1.3, dur: 1.3, color: m.color, emoji: m.emoji, name: m.name, flag: (p === S.L ? playerCountry : oppCountry).flag, side: p.side }
      bigEntrance(p, m)   // groots themed figuur per land
      flash(`${m.emoji} ${m.name}!`)
      switch (m.effect) {
        case 'charge':   // STORMRAM: kudde rammen stormt mee
          p.t.dash = pa.dur; p.dashVx = p.facing * pa.vx; p.ram = true; p.ramKnock = pa.knock; p.ramStun = pa.stun
          for (let i = 0; i < 3; i++) addShock(p.x + p.facing * i * 40, p.y - PR * 0.4, m.color, 100, 0.45)
          break
        case 'rocket': {  // RAKET UIT HET HEELAL: gigantische raket daalt uit de lucht en knalt de goal in
          grabBall(p)
          const gx = p.facing > 0 ? W - GOAL_W - 30 : GOAL_W + 30
          // reuzenraket die van bovenaf (uit de "ruimte") neerdaalt boven de goal
          spawnMascot(p, m, { emoji: '🚀', size: 170, x: gx, y: CEIL - 40, vx: 0, vy: 360, dur: 2.0, scale0: 0.2 })
          spawnMascot(p, m, { size: 90, trail: 2, dur: 1.4 })
          S.ball.vx = p.facing * 760; S.ball.vy = -640           // boog omhoog-vooruit
          S.ball.homing = p.facing; S.ball.homingStr = 6         // homing stuurt 'm de goal in
          setBallFx(m.color, pa.fx || 'electric'); S.ball.emoji = m.ballEmoji; S.ball.emojiT = 2.4
          // sterren/ruimte-deeltjes
          for (let i = 0; i < 22; i++) { const a = Math.random() * Math.PI * 2, v = 200 + Math.random() * 260; S.particles.push({ x: gx, y: CEIL, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.2, color: i % 2 ? '#FFD23F' : '#ffffff', r: 2 + Math.random() * 3 }) }
          addShock(gx, CEIL + 20, m.color, 200, 0.7); addShake(18, 0.6); break
        }
        case 'multiball': {  // SAMBA: 5 echte-lijkende ballen waaieren naar de goal
          grabBall(p); spawnMascot(p, m, { size: 90, trail: 2 })
          aimAtGoal(p, pa.speed); setBallFx(m.color, 'energy')
          for (let i = 0; i < pa.n; i++) {
            const spread = ((i - (pa.n - 1) / 2) / pa.n) * 0.7
            S.decoys.push({ x: S.ball.x, y: S.ball.y, vx: S.ball.vx * Math.cos(spread) - S.ball.vy * Math.sin(spread), vy: S.ball.vx * Math.sin(spread) + S.ball.vy * Math.cos(spread), angle: 0, life: 1.8, color: m.color })
          }
          for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, v = 200 + Math.random() * 200; S.particles.push({ x: p.x, y: p.y - PR, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, life: 1.5, color: ['#FFD23F', '#FF6900', '#4FC3F7', '#4aff4a', '#ff4aff'][Math.floor(Math.random() * 5)], r: 3 + Math.random() * 3 }) }
          addShake(12, 0.35); break
        }
        case 'freeze': {  // IJSTIJD: ijskristallen schieten naar de tegenstander
          spawnMascot(p, m, { size: 110, trail: 2, dur: 1.4 })
          opp.t.frozen = pa.dur; opp.frozenFactor = pa.factor; opp.dizzy = pa.dur
          addShock(opp.x, opp.y - PR * 0.4, m.color, 160, 0.6)
          addShock(opp.x, opp.y - PR * 0.4, '#bde0ff', 90, 0.55)
          // ijskristal-deeltjes vliegen naar de opp
          for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2; S.particles.push({ x: p.x + p.facing * 20, y: p.y - PR, vx: (opp.x - p.x) * 1.8 + Math.cos(a) * 80, vy: -200 + Math.sin(a) * 120, life: 0.8, color: i % 2 ? '#bde0ff' : '#ffffff', r: 3 + Math.random() * 3 }) }
          break
        }
        case 'bighead': {  // KOPWAND: gigantische kop verschijnt boven speler
          p.t.bighead = pa.dur; p.bigScale = pa.scale
          spawnMascot(p, m, { size: 130, trail: 1, dur: 1.8 })
          addShock(p.x, p.y - PR * 1.5, m.color, 180, 0.6); break
        }
        case 'magnet': {  // STIERENSTOOT: stier-figuur charged en magnetiseert bal
          p.t.magnet = pa.dur; p.magForce = pa.force
          spawnMascot(p, m, { size: 105, trail: 3, dur: 1.5 })
          // stof-wolken
          for (let i = 0; i < 12; i++) S.particles.push({ x: p.x - p.facing * 30 + Math.random() * 60, y: GROUND_Y - Math.random() * 10, vx: -p.facing * (100 + Math.random() * 100), vy: -50 - Math.random() * 60, life: 0.7, color: '#caa', r: 4 + Math.random() * 3 })
          break
        }
        case 'firecurve': {  // BANANA: bal curvet hard om de keeper heen, in brand
          grabBall(p); spawnMascot(p, m, { size: 100, trail: 3, dur: 1.4 })
          S.ball.vx = p.facing * 920; S.ball.vy = -300
          S.ball.spin = (pa.curve || 1) * p.facing * 1500   // curve → banaanschot
          setBallFx(m.color, pa.fx || 'flame'); S.ball.emoji = m.ballEmoji; S.ball.emojiT = 2
          addShock(S.ball.x, S.ball.y, m.color, 150, 0.5); addShake(13, 0.4)
          for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; S.particles.push({ x: p.x + Math.cos(a) * 50, y: p.y - PR + Math.sin(a) * 50, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 - 100, life: 1.0, color: i % 2 ? '#ff4500' : '#ffaa00', r: 4 + Math.random() * 3 }) }
          break
        }
        case 'shield': {  // CATENACCIO: kasteel stijgt op voor de goal
          p.t.shield = pa.dur
          const sx = shieldX(p.side)
          spawnMascot(p, m, { size: 100, trail: 1, dur: 2.2 })
          S.mascots[S.mascots.length - 1].x = sx; S.mascots[S.mascots.length - 1].vx = 0; S.mascots[S.mascots.length - 1].y = CROSSBAR + GOAL_H / 2
          addShock(sx, CROSSBAR + GOAL_H / 2, m.color, 140, 0.6); break
        }
        case 'teleport': {  // TELEPORT: portaal-effect bij start en eind
          addShock(p.x, p.y - PR * 0.4, m.color, 120, 0.5)
          for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; S.particles.push({ x: p.x + Math.cos(a) * 40, y: p.y - PR + Math.sin(a) * 40, vx: Math.cos(a) * -300, vy: Math.sin(a) * -300, life: 0.5, color: m.color, r: 3 + Math.random() * 3 }) }
          spawnMascot(p, m, { size: 80, trail: 1, dur: 0.8 })
          p.x = Math.max(PR, Math.min(W - PR, S.ball.x - p.facing * (PR + 6)))
          p.y = Math.min(GROUND_Y - PR, S.ball.y + PR * 0.2); p.vy = Math.min(p.vy, 0)
          if (p.y < GROUND_Y - PR) p.onGround = false
          addShock(p.x, p.y - PR * 0.4, m.color, 150, 0.6)
          for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; S.particles.push({ x: p.x + Math.cos(a) * 40, y: p.y - PR + Math.sin(a) * 40, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.7, color: m.color, r: 3 + Math.random() * 3 }) }
          break
        }
        case 'quake': {  // AARDBEVING: stamp + adelaar + scheuren
          spawnMascot(p, m, { size: 110, trail: 2, dur: 1.6 })
          opp.dizzy = pa.stun; const dir = opp.x >= p.x ? 1 : -1
          opp.vx = dir * pa.knock; opp.vy = -pa.up; opp.onGround = false
          addShock(p.x, GROUND_Y, m.color, 360, 0.75)
          addShock(p.x, GROUND_Y, '#ffffff', 180, 0.6)
          addShake(24, 0.65)
          S.ball.vy = -Math.max(500, Math.abs(S.ball.vy))
          // stof + grond-deeltjes
          for (let i = 0; i < 30; i++) { const a = Math.PI + Math.random() * Math.PI; const v = 200 + Math.random() * 250; S.particles.push({ x: p.x + (Math.random() - 0.5) * 80, y: GROUND_Y - 5, vx: Math.cos(a) * v * 0.5, vy: Math.sin(a) * v - 100, life: 0.9, color: i % 3 ? '#8a6a4a' : '#caa', r: 3 + Math.random() * 4 }) }
          break
        }
        case 'tornado':
          spawnMascot(p, m, { size: 90, trail: 2 })
          S.tornado = { x: p.x + p.facing * 20, y: GROUND_Y, vx: p.facing * pa.vx, t: pa.dur, pull: pa.pull, dir: p.facing, color: m.color }
          break
        case 'giantball': {  // TIJGERBAL: reuzenbal + tijgerstrepen-deeltjes
          S.ball.scale = pa.scale; S.ball.scaleT = pa.dur; S.ball.emoji = m.ballEmoji; S.ball.emojiT = pa.dur
          spawnMascot(p, m, { size: 120, trail: 2, dur: 1.6 })
          setBallFx(m.color, 'flame'); addShock(S.ball.x, S.ball.y, m.color, 180, 0.6); addShake(14, 0.4)
          for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2; S.particles.push({ x: S.ball.x, y: S.ball.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300 - 100, life: 0.9, color: i % 2 ? '#ff8800' : '#000000', r: 3 + Math.random() * 3 }) }
          break
        }
        case 'superjump': {  // LEEUWENSPRONG: leeuw verschijnt, gigantische sprong
          p.vy = -pa.vy; p.onGround = false; p.t.dash = pa.dur
          spawnMascot(p, m, { size: 110, trail: 3, dur: 1.6 })
          if (pa.lob && Math.abs(S.ball.x - p.x) < KICK_RANGE + 30) { S.ball.vy = -740; S.ball.vx = p.facing * 420 }
          break
        }
        case 'bouncy': {  // STUITERBAL: bal kaatst razendsnel laag over de grond naar de goal
          grabBall(p); S.ball.bouncyT = pa.dur; S.ball.emoji = m.ballEmoji; S.ball.emojiT = pa.dur; setBallFx(m.color, 'energy')
          spawnMascot(p, m, { size: 95, trail: 2 })
          S.ball.vx = p.facing * pa.speed; S.ball.vy = 260   // naar beneden → stuitert vooruit
          addShake(12, 0.4)
          for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2; S.particles.push({ x: S.ball.x, y: S.ball.y, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, life: 0.7, color: '#ff5500', r: 3 + Math.random() * 3 }) }
          break
        }
        case 'ghost': {  // SPOOKZWERM: echte bal + een zwerm meevliegende spookballen
          grabBall(p); S.ball.ghostT = pa.dur; S.ball.emoji = m.ballEmoji; S.ball.emojiT = pa.dur; setBallFx(m.color, 'energy')
          spawnMascot(p, m, { size: 100, trail: 4, dur: 1.8 })
          aimAtGoal(p, pa.speed)
          for (let i = 0; i < 6; i++) {
            const spread = ((i - 2.5) / 6) * 0.5
            S.decoys.push({ x: S.ball.x, y: S.ball.y, vx: S.ball.vx * Math.cos(spread) - S.ball.vy * Math.sin(spread), vy: S.ball.vx * Math.sin(spread) + S.ball.vy * Math.cos(spread), angle: 0, life: 2, color: m.color, emoji: '👻' })
          }
          addShake(12, 0.4); break
        }
        default: break
      }
    }

    const doKick = (p) => {
      if (p.kickCD > 0) return
      const dx = S.ball.x - p.x, dy = S.ball.y - (p.y - PR * 0.3)
      if (Math.hypot(dx, dy) > KICK_RANGE) return
      p.kickCD = 0.42; p.kickAnim = KICK_ANIM       // langere cooldown tussen schoten
      const isPower = p.t.powershot > 0
      let power = isPower ? KICK_POWER * p.powMult : KICK_POWER
      S.ball.vx = p.facing * power + p.vx * 0.4
      S.ball.vy = -power * 0.55
      if (p.powCurve) { S.ball.spin = (p.powCurveDir || 1) * p.facing * 1100; p.powCurve = false }
      addParticles(S.ball.x, S.ball.y, '#ffffff', 6, 220)
      addShake(3, 0.12)
      if (isPower) triggerPower(p)
    }

    const ballPlayerCollide = (p) => {
      const headScale = p.t.bighead > 0 ? p.bigScale : 1
      const rad = PR * (0.95) * (1 + (headScale - 1) * 0.5)
      const cx = p.x, cy = p.y - PR * 0.2
      const dx = S.ball.x - cx, dy = S.ball.y - cy
      const dist = Math.hypot(dx, dy)
      const minD = rad + BR * (S.ball.scale || 1)
      if (dist < minD && dist > 0) {
        const nx = dx / dist, ny = dy / dist
        S.ball.x = cx + nx * minD; S.ball.y = cy + ny * minD
        const rel = S.ball.vx * nx + S.ball.vy * ny
        let imp = -rel * (1 + 0.45)               // minder elastische botsing
        S.ball.vx += nx * imp + p.vx * 0.4
        S.ball.vy += ny * imp + p.vy * 0.3 - 30
        if (p.t.powershot > 0) { S.ball.vx *= p.powMult; S.ball.vy *= p.powMult; if (p.powCurve) S.ball.spin = (p.powCurveDir || 1) * p.facing * 1000; triggerPower(p) }
        else addShake(2, 0.08)
        p.charge = Math.min(1, p.charge + 0.05)
        return true
      }
      return false
    }

    let lastT = performance.now()
    let raf = 0
    const loop = (now) => {
      let rdt = (now - lastT) / 1000; lastT = now
      if (rdt > 0.05) rdt = 0.05
      // cut-in: CINEMATISCHE slow-motion → je ziet de special echt gebeuren.
      if (S.cutin.t > 0) S.cutin.t -= rdt
      const slowK = S.cutin.t > 0 ? 0.3 : 1
      const dt = rdt * slowK                // alles vertraagt tijdens de cut-in

      if (S.kickoffT > 0) S.kickoffT -= rdt
      if (S.msgT > 0) S.msgT -= rdt
      const live = S.kickoffT <= 0 && !S.ended

      // mascotte/effect-figuren (raket, tornado, …) — in slow-mo zodat je ze ziet
      for (const ms of S.mascots) { ms.t -= dt; ms.x += ms.vx * dt; ms.y += (ms.vy || 0) * dt; ms.scale = Math.min(1, ms.scale + dt * 5) }
      S.mascots = S.mascots.filter(ms => ms.t > 0)

      // timers
      for (const p of [S.L, S.R]) {
        for (const k in p.t) if (p.t[k] > 0) p.t[k] = Math.max(0, p.t[k] - dt)
        if (p.t.frozen <= 0) p.frozenFactor = 1
        if (p.dizzy > 0) p.dizzy -= dt
        if (p.kickCD > 0) p.kickCD -= dt
        if (p.kickAnim > 0) p.kickAnim -= dt
        if (p.comebackT > 0) p.comebackT -= dt
        if (p.ram && p.t.dash <= 0) p.ram = false
        // special laadt langzaam; na een tegengoal iets sneller (comeback)
        const rate = p.comebackT > 0 ? 1.5 : 1
        p.charge = Math.min(1, p.charge + (dt / p.move.charge) * rate)
      }
      // bal-effect timers
      if (S.ball.scaleT > 0) { S.ball.scaleT -= dt; if (S.ball.scaleT <= 0) S.ball.scale = 1 }
      if (S.ball.ghostT > 0) S.ball.ghostT -= dt
      if (S.ball.bouncyT > 0) S.ball.bouncyT -= dt
      if (S.ball.emojiT > 0) { S.ball.emojiT -= dt; if (S.ball.emojiT <= 0) S.ball.emoji = null }
      // homing-raket stuurt naar de goal
      if (S.ball.homing && live) {
        const gx = S.ball.homing > 0 ? W - 4 : 4, gy = CROSSBAR + GOAL_H * 0.5
        const dx = gx - S.ball.x, dy = gy - S.ball.y, d = Math.hypot(dx, dy) || 1
        const sp = Math.max(900, Math.hypot(S.ball.vx, S.ball.vy))
        const str = S.ball.homingStr || 4
        S.ball.vx += ((dx / d) * sp - S.ball.vx) * Math.min(1, str * dt)
        S.ball.vy += ((dy / d) * sp - S.ball.vy) * Math.min(1, str * dt)
        if (S.ball.emojiT <= 0) S.ball.homing = 0
      }

      if (live) {
        // ── human input (L) ──
        const c = controlsRef.current, L = S.L
        const spd = PLAYER_SPD * L.frozenFactor
        if (L.dizzy <= 0) {
          if (c.left)  { L.vx = -spd; L.facing = -1 }
          else if (c.right) { L.vx = spd; L.facing = 1 }
          else L.vx *= 0.7
          if (L.t.dash > 0) L.vx = L.dashVx * L.frozenFactor
          if (c.jump && L.onGround) { L.vy = -JUMP_FORCE; L.onGround = false }
          if (c.kick) doKick(L)
          if (c.special) { activateSpecial(L, S.R); c.special = false }
        } else L.vx *= 0.8

        // ── AI (R) ──
        const R = S.R
        if (R.dizzy <= 0) {
          const aspd = aiSpd * R.frozenFactor
          // spookbal: AI ziet de bal slecht → mikt met grote fout
          const ghostErr = S.ball.ghostT > 0 ? (Math.sin(now / 140) * 120) : 0
          const ballSide = S.ball.x + ghostErr
          // chase ball, but retreat to defend if ball behind toward own goal
          let target = ballSide
          if (S.ball.x > W * 0.62 && S.ball.vx > 0) target = Math.max(W * 0.6, S.ball.x - 30)
          const dxr = target - R.x
          if (Math.abs(dxr) > 12) { R.vx = Math.sign(dxr) * aspd; R.facing = S.ball.x < R.x ? -1 : 1 }
          else R.vx *= 0.7
          if (R.t.dash > 0) R.vx = R.dashVx * R.frozenFactor
          // jump for high ball
          if (R.onGround && S.ball.y < GROUND_Y - 120 && Math.abs(S.ball.x - R.x) < 90 && S.ball.vy > -50) { R.vy = -JUMP_FORCE; R.onGround = false }
          // kick when close & ball on its side or moving toward own goal
          if (Math.hypot(S.ball.x - R.x, S.ball.y - (R.y - PR * 0.3)) < KICK_RANGE) doKick(R)
          // special: use when charged and ball roughly in play near center/own half
          if (R.charge >= 1 && Math.random() < 0.012 + oppDiff * 0.004 && S.ball.x > W * 0.4) activateSpecial(R, S.L)
        } else R.vx *= 0.8

        // physics players
        for (const p of [S.L, S.R]) {
          p.vy += GRAVITY * dt
          p.x += p.vx * dt; p.y += p.vy * dt
          if (p.y >= GROUND_Y - PR) { p.y = GROUND_Y - PR; p.vy = 0; p.onGround = true }
          p.x = Math.max(PR, Math.min(W - PR, p.x))
        }

        // stormram (charge): beukt de tegenstander weg
        for (const [p, opp] of [[S.L, S.R], [S.R, S.L]]) {
          if (p.ram && p.t.dash > 0 && opp.dizzy <= 0 && Math.abs(p.x - opp.x) < PR * 1.9 && (p.facing > 0) === (opp.x > p.x)) {
            opp.dizzy = p.ramStun; opp.vx = p.facing * p.ramKnock; opp.vy = -200; opp.onGround = false
            addShock(opp.x, opp.y - PR * 0.4, p.move.color, 120, 0.5); addShake(10, 0.3)
          }
        }

        // speler-speler: niet door elkaar heen (voorkomt klem-bal-glitch)
        {
          const dx2 = S.R.x - S.L.x
          const minSep = PR * 1.7
          if (Math.abs(dx2) < minSep) {
            const push = (minSep - Math.abs(dx2)) / 2
            const dir = dx2 >= 0 ? 1 : -1
            S.L.x = Math.max(PR, Math.min(W - PR, S.L.x - dir * push))
            S.R.x = Math.max(PR, Math.min(W - PR, S.R.x + dir * push))
          }
        }

        // tornado: beweegt richting tegenstander-goal en zuigt de bal mee
        if (S.tornado) {
          const T = S.tornado
          T.t -= dt; T.x += T.vx * dt
          if (T.t <= 0 || T.x < GOAL_W || T.x > W - GOAL_W) S.tornado = null
          else {
            const dx = T.x - S.ball.x, dy = (GROUND_Y - 70) - S.ball.y, d = Math.hypot(dx, dy) || 1
            if (d < 180) { S.ball.vx += (dx / d) * T.pull * dt + T.dir * 240 * dt; S.ball.vy += (dy / d) * T.pull * dt }
            // duw tegenstander licht weg
            const opp = T.dir > 0 ? S.R : S.L
            if (Math.abs(opp.x - T.x) < 80) opp.vx += T.dir * 300 * dt
          }
        }

        // magnet pull
        for (const p of [S.L, S.R]) if (p.t.magnet > 0) {
          const dx = p.x - S.ball.x, dy = (p.y - PR) - S.ball.y, d = Math.hypot(dx, dy) || 1
          if (d < 260) { S.ball.vx += (dx / d) * p.magForce * dt; S.ball.vy += (dy / d) * p.magForce * dt }
        }

        // ball physics
        const b = S.ball
        const effBR = BR * (b.scale || 1)
        const BB = b.bouncyT > 0 ? 0.95 : BALL_BOUNCE
        b.vy += GRAVITY * 0.55 * dt
        b.vx += b.spin * dt * 0.06; b.spin *= 0.96
        b.x += b.vx * dt; b.y += b.vy * dt
        b.angle += b.vx * dt * 0.05
        // ground
        if (b.y >= GROUND_Y - effBR) { b.y = GROUND_Y - effBR; b.vy = -b.vy * BB; b.vx *= b.bouncyT > 0 ? 0.99 : 0.94; if (Math.abs(b.vy) < 40 && b.bouncyT <= 0) b.vy = 0 }
        // ceiling
        if (b.y <= CEIL + effBR) { b.y = CEIL + effBR; b.vy = -b.vy * BB }
        // shields
        for (const p of [S.L, S.R]) if (p.t.shield > 0) {
          const sx = shieldX(p.side)
          if (p.side === 'L' && b.x - effBR < sx + 5 && b.vx < 0 && b.y > CROSSBAR) { b.x = sx + 5 + effBR; b.vx = Math.abs(b.vx) * 0.9 + 60 }
          if (p.side === 'R' && b.x + effBR > sx - 5 && b.vx > 0 && b.y > CROSSBAR) { b.x = sx - 5 - effBR; b.vx = -Math.abs(b.vx) * 0.9 - 60 }
        }
        // side walls above crossbar
        if (b.x <= effBR && b.y < CROSSBAR) { b.x = effBR; b.vx = Math.abs(b.vx) * BB }
        if (b.x >= W - effBR && b.y < CROSSBAR) { b.x = W - effBR; b.vx = -Math.abs(b.vx) * BB }
        // crossbar
        for (const x0 of [0, W - GOAL_W]) {
          if (b.x > x0 - effBR && b.x < x0 + GOAL_W + effBR && Math.abs(b.y - (CROSSBAR - 3)) < effBR + 3 && b.vy < 0) { b.y = CROSSBAR - 3 + effBR; b.vy = Math.abs(b.vy) * BB }
        }
        // collisions
        const hitL = ballPlayerCollide(S.L)
        const hitR = ballPlayerCollide(S.R)
        if (hitL && hitR) {
          // bal zit klem tussen beide spelers → pop netjes omhoog i.p.v. glitchen
          S.ball.y = Math.min(S.L.y, S.R.y) - PR - BR - 2
          S.ball.vy = -Math.max(460, Math.abs(S.ball.vy))
          S.ball.vx = (S.ball.x - (S.L.x + S.R.x) / 2) * 6
        }
        // snelheid begrenzen (voorkomt tunnelen/glitchen)
        const bs = Math.hypot(b.vx, b.vy), BMAX = 1700
        if (bs > BMAX) { b.vx = b.vx / bs * BMAX; b.vy = b.vy / bs * BMAX }

        // goals (de speler die incasseert krijgt een comeback-laadboost)
        if (b.x - effBR <= 2 && b.y > CROSSBAR) { S.score.R++; S.L.comebackT = 12; flash('⚽ Tegendoelpunt!'); addParticles(40, GROUND_Y - 60, S.R.move.color, 40, 520); addShock(40, GROUND_Y - 60, S.R.move.color, 220, 0.7); addShake(16, 0.5); S.goalFlash = { t: 0.5, color: S.R.move.color }; resetPositions('L'); if (S.golden) S.ended = true }
        else if (b.x + effBR >= W - 2 && b.y > CROSSBAR) { S.score.L++; S.R.comebackT = 12; flash('⚽ GOAL!'); addParticles(W - 40, GROUND_Y - 60, S.L.move.color, 40, 520); addShock(W - 40, GROUND_Y - 60, S.L.move.color, 220, 0.7); addShake(16, 0.5); S.goalFlash = { t: 0.5, color: S.L.move.color }; resetPositions('R'); if (S.golden) S.ended = true }

        // timer
        S.time -= dt
        if (S.time <= 0) {
          S.time = 0
          if (S.score.L !== S.score.R) S.ended = true
          else if (!S.golden) { S.golden = true; flash('⏱️ Golden Goal!') }
        }
      }

      // effecten bijwerken
      const b2 = S.ball
      b2.trail.push({ x: b2.x, y: b2.y })
      const trailMax = b2.fx.t > 0 ? 16 : 9
      while (b2.trail.length > trailMax) b2.trail.shift()
      if (b2.fx.t > 0) b2.fx.t -= dt
      if (S.shake.t > 0) S.shake.t -= dt
      if (S.goalFlash.t > 0) S.goalFlash.t -= dt
      if (S.specFlash.t > 0) S.specFlash.t -= dt
      for (const s of S.shockwaves) s.t -= dt
      S.shockwaves = S.shockwaves.filter(s => s.t > 0)

      // decoy-ballen (multibal): vliegen, stuiteren, vervagen
      for (const d of S.decoys) {
        d.vy += GRAVITY * 0.55 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.angle += d.vx * dt * 0.05
        if (d.y >= GROUND_Y - BR) { d.y = GROUND_Y - BR; d.vy = -d.vy * BALL_BOUNCE }
        d.life -= dt
      }
      S.decoys = S.decoys.filter(d => d.life > 0 && d.x > -20 && d.x < W + 20)

      for (const pt of S.particles) { pt.vy += 900 * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt }
      S.particles = S.particles.filter(p => p.life > 0)

      // ── render ──
      ctx.clearRect(0, 0, W, H)
      ctx.save()
      if (S.shake.t > 0) { const k = S.shake.t / (S.shake.dur || 0.3), m = S.shake.mag * k; ctx.translate((Math.random() - 0.5) * m * 2, (Math.random() - 0.5) * m * 2) }
      drawArena(ctx, S)
      drawShockwaves(ctx, S.shockwaves)
      for (const pt of S.particles) { ctx.globalAlpha = Math.max(0, pt.life * 1.4); ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r || 3, 0, Math.PI * 2); ctx.fill() }
      ctx.globalAlpha = 1
      for (const d of S.decoys) { ctx.globalAlpha = Math.min(0.85, d.life); drawBall(ctx, { x: d.x, y: d.y, vx: d.vx, vy: d.vy, angle: d.angle, trail: [], fx: { t: 0.4, type: 'energy', color: d.color }, scale: 1, emoji: d.emoji || null }); ctx.globalAlpha = 1 }
      if (S.tornado) drawTornado(ctx, S.tornado)
      drawPlayer(ctx, S.L, playerCountry); if (S.L.t.frozen > 0 && S.L.frozenFactor < 0.2) drawIce(ctx, S.L)
      drawPlayer(ctx, S.R, oppCountry); if (S.R.t.frozen > 0 && S.R.frozenFactor < 0.2) drawIce(ctx, S.R)
      drawBall(ctx, S.ball)
      // themed mascotte-figuren (groot, met gloed)
      for (const ms of S.mascots) {
        const a = Math.min(1, ms.t / 0.3) * Math.min(1, (ms.dur - ms.t) / 0.12 + 0.3)
        const sz = (ms.size || 80) * (0.6 + ms.scale * 0.4)
        ctx.globalAlpha = Math.max(0, a)
        ctx.font = `${sz}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.shadowColor = '#fff'; ctx.shadowBlur = 18
        ctx.fillText(ms.emoji, ms.x, ms.y)
        ctx.shadowBlur = 0; ctx.globalAlpha = 1
      }
      ctx.restore()

      // full-screen flashes (zonder shake)
      if (S.specFlash.t > 0) { ctx.globalAlpha = Math.min(0.5, S.specFlash.t * 1.4); ctx.fillStyle = S.specFlash.color; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1 }
      if (S.goalFlash.t > 0) { ctx.globalAlpha = Math.min(0.45, S.goalFlash.t); ctx.fillStyle = S.goalFlash.color; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1 }

      // ── dramatische cut-in (Head Soccer-stijl) ──
      if (S.cutin.t > 0) {
        const ci = S.cutin, k = 1 - ci.t / ci.dur          // 0..1 voortgang
        const inOut = Math.sin(Math.min(1, k * 1.15) * Math.PI) // 0→1→0 envelope
        ctx.save()
        // donkere vignette
        ctx.globalAlpha = 0.45 * inOut; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)
        // diagonale gekleurde band die over het scherm veegt
        const bandY = H * (0.5) + (k - 0.5) * 60
        ctx.globalAlpha = 0.85 * inOut; ctx.fillStyle = ci.color
        ctx.save(); ctx.translate(W / 2, bandY); ctx.rotate(-0.08)
        ctx.fillRect(-W, -64, W * 2, 128)
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-W, -64, W * 2, 10); ctx.fillRect(-W, 54, W * 2, 10)
        ctx.restore()
        // speed-lijnen
        ctx.globalAlpha = 0.5 * inOut; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3
        for (let i = 0; i < 10; i++) { const yy = (i / 10) * H + ((Date.now() / 8) % (H / 10)); ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy - 30); ctx.stroke() }
        // grote emoji die inzoomt + naam
        const dir = ci.side === 'L' ? 1 : -1
        const ex = W / 2 - dir * (1 - inOut) * 260
        ctx.globalAlpha = inOut
        ctx.font = `${90 + inOut * 26}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(ci.emoji, ex, bandY - 4)
        ctx.font = '900 40px Arial'; ctx.fillStyle = '#fff'
        ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.6)'
        ctx.strokeText(`${ci.flag} ${ci.name}`, ex + dir * 30, bandY + 70)
        ctx.fillText(`${ci.flag} ${ci.name}`, ex + dir * 30, bandY + 70)
        ctx.globalAlpha = 1; ctx.restore()
      }

      if (S.kickoffT > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#fff'; ctx.font = '900 48px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.shadowColor = '#4FC3F7'; ctx.shadowBlur = 24
        ctx.fillText('KLAAR?', W / 2, H / 2); ctx.shadowBlur = 0
      }
      if (S.msgT > 0) {
        const sc = 1 + Math.max(0, S.msgT - 0.9) * 1.5
        ctx.save(); ctx.translate(W / 2, 92); ctx.scale(sc, sc)
        ctx.globalAlpha = Math.min(1, S.msgT * 1.4)
        ctx.font = '900 38px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(S.msg, 0, 0)
        ctx.shadowColor = '#FFD23F'; ctx.shadowBlur = 18; ctx.fillStyle = '#FFD23F'
        ctx.fillText(S.msg, 0, 0); ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.restore()
      }

      if (S.ended) { cancelAnimationFrame(raf); onMatchEndRef.current({ L: S.score.L, R: S.score.R }); return }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // keyboard
    const down = e => {
      const c = controlsRef.current
      if (e.code === 'ArrowLeft') c.left = true
      else if (e.code === 'ArrowRight') c.right = true
      else if (e.code === 'ArrowUp' || e.code === 'Space') { c.jump = true; e.preventDefault() }
      else if (e.code === 'KeyX' || e.code === 'KeyK') c.kick = true
      else if (e.code === 'KeyZ' || e.code === 'KeyL' || e.code === 'ArrowDown') c.special = true
    }
    const up = e => {
      const c = controlsRef.current
      if (e.code === 'ArrowLeft') c.left = false
      else if (e.code === 'ArrowRight') c.right = false
      else if (e.code === 'ArrowUp' || e.code === 'Space') c.jump = false
      else if (e.code === 'KeyX' || e.code === 'KeyK') c.kick = false
    }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [phase, playerKey, oppKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // HUD charge poll
  const [hud, setHud] = useState({ L: 0, R: 0, sL: 0, sR: 0, time: MATCH_TIME })
  useEffect(() => {
    if (phase !== 'match') return
    const id = setInterval(() => {
      const S = stateRef.current; if (!S) return
      setHud({ L: S.L.charge, R: S.R.charge, sL: S.score.L, sR: S.score.R, time: Math.ceil(S.time) })
    }, 100)
    return () => clearInterval(id)
  }, [phase])

  // touch helpers
  const hold = (key, val) => () => { controlsRef.current[key] = val }
  const tap = (key) => () => { controlsRef.current[key] = true }

  // ── RENDER ─────────────────────────────────────────────────────
  // ── Reward-modus schermen ──
  if (phase === 'reward_select') {
    return (
      <div className="game-screen game-screen-center hs-select">
        <div className="hs-select-head">
          <span className="hs-select-logo">🥅⚽</span>
          <h1 className="hs-select-title">HEAD SOCCER CUP</h1>
          <p className="hs-select-sub">Kies je land — elke beloning speel je één ronde van het toernooi!</p>
        </div>
        <div className="wk-country-grid hs-grid">
          {COUNTRIES.map(c => {
            const open = unlocked.includes(c.key)
            const m = getMove(c.key)
            return (
              <button key={c.key} className={`wk-country-card hs-card${open ? '' : ' hs-locked'}`} disabled={!open}
                style={open ? { '--mv': m.color } : undefined}
                onClick={() => open && rewardChoosePlayer(c.key)} title={open ? `${m.name}: ${m.desc}` : 'Vergrendeld'}>
                <span className="wk-country-flag">{open ? c.flag : '🔒'}</span>
                <span className="wk-country-name">{open ? c.name : '???'}</span>
                <span className="hs-move">{open ? `${m.emoji} ${m.name}` : '🔒 vergrendeld'}</span>
              </button>
            )
          })}
        </div>
        <button className="hs-skip-link" onClick={onBack}>Sla over →</button>
      </div>
    )
  }

  if (phase === 'reward_round') {
    return (
      <div className="game-screen game-screen-center">
        <div className="wk-header">
          <span className="wk-trophy">🏆</span>
          <h1 className="wk-title">{bracket.roundNames[bracket.currentRound]}</h1>
          <p className="wk-sub">{playerCountry.flag} {playerCountry.name} — speel deze ronde!</p>
        </div>
        <Bracket bracket={bracket} playerKey={playerKey} />
        <button className="mode-card hs-go" onClick={rewardStartRound}>▶ Start ronde</button>
        <button className="hs-skip-link" onClick={onBack}>Sla over →</button>
      </div>
    )
  }

  if (phase === 'reward_result') {
    const won = result === 'win'
    return (
      <div className="game-screen game-screen-center">
        <div className="wk-champion-card">
          <span className="wk-champ-trophy">{won ? '🎉' : '💪'}</span>
          <h1 className="wk-champ-title">{won ? 'Ronde gewonnen!' : 'Helaas verloren'}</h1>
          <p className="wk-champ-sub">{playerCountry.flag} {score.L} — {score.R} {oppCountry.flag}</p>
          <p className="wk-champ-sub">{won ? 'Geef weer 5 goede antwoorden voor de volgende ronde!' : 'Volgende keer speel je deze ronde opnieuw.'}</p>
        </div>
        <button className="mode-card hs-go" onClick={onBack}>← Terug naar spelling</button>
      </div>
    )
  }

  if (phase === 'reward_champ') {
    const revealC = mysteryReveal ? getCountry(mysteryReveal) : null
    return (
      <div className="game-screen game-screen-center">
        <div className="wk-champion-card">
          <span className="wk-champ-trophy">🏆</span>
          <h1 className="wk-champ-title">Wereldkampioen!</h1>
          <p className="wk-champ-sub">{playerCountry.flag} {playerCountry.name} wint het toernooi!</p>
          {coinsEarned > 0 && <p className="wk-champ-sub">🪙 +{coinsEarned} curuntie</p>}
        </div>
        <div className="hs-mystery">
          {revealC
            ? <><div className="hs-box">🎁</div><p className="wk-champ-sub">Mysterybox: <b>{revealC.flag} {revealC.name}</b> ontgrendeld!</p></>
            : <p className="wk-champ-sub">Je hebt alle landen al! 🪙 Extra bonus.</p>}
        </div>
        <button className="mode-card hs-go" onClick={onBack}>← Terug naar spelling</button>
      </div>
    )
  }

  if (phase === 'select') {
    const total = COUNTRIES.length, got = unlocked.length
    return (
      <div className="game-screen game-screen-center hs-select">
        <button className="back-btn" onClick={onBack}>← Menu</button>
        <div className="hs-select-head">
          <span className="hs-select-logo">🥅⚽</span>
          <h1 className="hs-select-title">HEAD SOCCER</h1>
          <p className="hs-select-sub">Kies jouw land — elk land heeft een eigen special move!</p>
          <span className="hs-select-count">{got} / {total} landen</span>
        </div>
        <div className="wk-country-grid hs-grid">
          {COUNTRIES.map(c => {
            const open = unlocked.includes(c.key)
            const m = getMove(c.key)
            return (
              <button key={c.key} className={`wk-country-card hs-card${open ? '' : ' hs-locked'}`} disabled={!open}
                style={open ? { '--mv': m.color } : undefined}
                onClick={() => open && choosePlayer(c.key)} title={open ? `${m.name}: ${m.desc}` : 'Win de Cup om te ontgrendelen'}>
                <span className="wk-country-flag">{open ? c.flag : '🔒'}</span>
                <span className="wk-country-name">{open ? c.name : '???'}</span>
                <span className="hs-move">{open ? `${m.emoji} ${m.name}` : '🔒 vergrendeld'}</span>
              </button>
            )
          })}
        </div>
        <p className="hs-hint">🔒 = nog vergrendeld. Win de Cup voor een mysterybox met een nieuw land!</p>
      </div>
    )
  }

  if (phase === 'mode') {
    const m = getMove(playerKey)
    return (
      <div className="game-screen game-screen-center">
        <button className="back-btn" onClick={() => setPhase('select')}>← Terug</button>
        <div className="wk-header">
          <span className="wk-trophy">{playerCountry.flag}</span>
          <h1 className="wk-title">{playerCountry.name}</h1>
        </div>
        <div className="hs-preview">
          <div className="hs-demo-box"><SpecialDemo countryKey={playerKey} /></div>
          <div className="hs-preview-info">
            <div className="hs-preview-move" style={{ color: m.color }}>{m.emoji} {m.name}</div>
            <p className="hs-preview-desc">{m.desc}</p>
            <p className="hs-preview-how">Laad de ⭐-meter vol en druk op de special-knop om hem te gebruiken!</p>
          </div>
        </div>
        <div className="mode-grid">
          <button className="mode-card hs-go" onClick={startQuick}>
            <span style={{ fontSize: '2rem' }}>⚽</span>
            <span className="mode-name">Start wedstrijd</span>
            <span className="mode-desc">1 potje tegen een willekeurig land</span>
          </button>
          <button className="mode-card" onClick={startWK}>
            <span style={{ fontSize: '2rem' }}>🏆</span>
            <span className="mode-name">Speel Cup</span>
            <span className="mode-desc">Win 4 rondes → mysterybox met nieuw land</span>
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'wk_bracket') {
    return (
      <div className="game-screen game-screen-center">
        <button className="back-btn" onClick={() => { setBracket(null); setPhase('mode') }}>← Terug</button>
        <div className="wk-header">
          <span className="wk-trophy">🏆</span>
          <h1 className="wk-title">WK Toernooi</h1>
          <p className="wk-sub">{playerCountry.flag} {playerCountry.name} — versla 4 landen om te winnen!</p>
        </div>
        <Bracket bracket={bracket} playerKey={playerKey} />
        <button className="mode-card hs-go" onClick={() => setPhase('match')}>▶ Start toernooi</button>
      </div>
    )
  }

  if (phase === 'wk_round') {
    return (
      <div className="game-screen game-screen-center">
        <div className="wk-header">
          <span className="wk-trophy">🏆</span>
          <h1 className="wk-title">{bracket.roundNames[bracket.currentRound]}</h1>
          <p className="wk-sub">Volgende: {oppCountry.flag} {oppCountry.name}</p>
        </div>
        <Bracket bracket={bracket} playerKey={playerKey} />
        <button className="mode-card hs-go" onClick={nextWKMatch}>▶ Start wedstrijd</button>
      </div>
    )
  }

  if (phase === 'result' || phase === 'wk_lost') {
    const won = result === 'win'
    return (
      <div className="game-screen game-screen-center">
        <div className="wk-champion-card">
          <span className="wk-champ-trophy">{won ? '🎉' : '😢'}</span>
          <h1 className="wk-champ-title">{won ? 'Gewonnen!' : 'Verloren'}</h1>
          <p className="wk-champ-sub">{playerCountry.flag} {score.L} — {score.R} {oppCountry.flag}</p>
          {coinsEarned > 0 && <p className="wk-champ-sub">🪙 +{coinsEarned} curuntie</p>}
        </div>
        <div className="mode-grid">
          <button className="mode-card hs-go" onClick={() => { setBracket(null); setPhase('mode') }}>Opnieuw</button>
          <button className="mode-card" onClick={() => setPhase('select')}>Ander land</button>
        </div>
      </div>
    )
  }

  if (phase === 'wk_won') {
    const revealC = mysteryReveal ? getCountry(mysteryReveal) : null
    return (
      <div className="game-screen game-screen-center">
        <div className="wk-champion-card">
          <span className="wk-champ-trophy">🏆</span>
          <h1 className="wk-champ-title">Wereldkampioen!</h1>
          <p className="wk-champ-sub">{playerCountry.flag} {playerCountry.name} wint het WK!</p>
          {coinsEarned > 0 && <p className="wk-champ-sub">🪙 +{coinsEarned} curuntie</p>}
        </div>
        <div className="hs-mystery">
          {revealC ? (
            <>
              <div className="hs-box">🎁</div>
              <p className="wk-champ-sub">Mysterybox: <b>{revealC.flag} {revealC.name}</b> ontgrendeld!</p>
              <p className="hs-move">{getMove(revealC.key).emoji} {getMove(revealC.key).name}</p>
            </>
          ) : (
            <p className="wk-champ-sub">Je hebt alle landen al! 🪙 Extra bonus toegevoegd.</p>
          )}
        </div>
        <div className="mode-grid">
          <button className="mode-card hs-go" onClick={() => { setBracket(null); setMysteryReveal(null); setPhase('select') }}>Naar landen</button>
          <button className="mode-card" onClick={onBack}>← Menu</button>
        </div>
      </div>
    )
  }

  // phase === 'match'
  return (
    <div className="hs-match-root">
      <button className="back-btn" onClick={onBack}>← Menu</button>
      <div className="hs-hud">
        <div className="hs-hud-team">
          <span>{playerCountry.flag}</span>
          <div className="hs-charge"><div className="hs-charge-fill" style={{ width: `${hud.L * 100}%`, background: getMove(playerKey).color }} /></div>
        </div>
        <div className="hs-scoreboard">{hud.sL} <span className="hs-time">{hud.time}s</span> {hud.sR}</div>
        <div className="hs-hud-team hs-hud-right">
          <span>{oppCountry.flag}</span>
          <div className="hs-charge"><div className="hs-charge-fill" style={{ width: `${hud.R * 100}%`, background: getMove(oppKey).color }} /></div>
        </div>
      </div>

      <div className="hs-canvas-wrap">
        <canvas ref={canvasRef} width={W} height={H} className="hs-canvas" />
      </div>

      <div className="hs-controls">
        <div className="hs-dpad">
          <button className="hs-btn" onPointerDown={hold('left', true)} onPointerUp={hold('left', false)} onPointerLeave={hold('left', false)}>◀</button>
          <button className="hs-btn" onPointerDown={hold('right', true)} onPointerUp={hold('right', false)} onPointerLeave={hold('right', false)}>▶</button>
        </div>
        <div className="hs-actions">
          <button className="hs-btn hs-jump" onPointerDown={hold('jump', true)} onPointerUp={hold('jump', false)} onPointerLeave={hold('jump', false)}>⤴</button>
          <button className="hs-btn hs-kick" onPointerDown={tap('kick')} onPointerUp={hold('kick', false)}>⚽</button>
          <button className="hs-btn hs-special" onPointerDown={tap('special')} style={{ borderColor: getMove(playerKey).color }}>
            {getMove(playerKey).emoji}
          </button>
        </div>
      </div>
      <OrientationGate />
    </div>
  )
}
