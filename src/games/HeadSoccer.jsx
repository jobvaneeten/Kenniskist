import { useState, useRef, useEffect, useCallback } from 'react'
import { COUNTRIES, getCountry, generateBracket, UNLOCK_TIERS, LEVELS } from './countries'
import { getMove, getSuper, superDescOf } from './headSoccerMoves'
import OrientationGate from '../OrientationGate'
import './football.css'
import './headsoccer.css'

// ── Arena constants (single screen) ───────────────────────────────
const W = 1100, H = 480     // langer veld → rustiger tempo (canvas schaalt mee, blijft op scherm)
const GROUND_Y = 400
const CEIL     = 28
const GOAL_W   = 34          // goal opening depth
const GOAL_H   = 110         // kleiner doel → moeilijker scoren
const CROSSBAR = GROUND_Y - GOAL_H
const BAR_TH   = 12          // dikte van de massieve bovenlat (plaat)
const PR = 30                // physics player radius
const BR = 12                // ball radius
const GRAVITY    = 1650      // rustiger vallen → kalmer tempo
const PLAYER_SPD = 185       // duidelijk trager lopen
const JUMP_FORCE = 540       // wat lager springen
const BALL_BOUNCE = 0.62     // bal verliest meer energie
const KICK_RANGE = PR + BR + 16
const KICK_ANIM = 0.24       // iets langere schop-animatie (zwaarder gevoel)
const MATCH_TIME = 75        // iets langer potje (want minder goals)
const KICK_POWER = 340       // zwakker, rustiger basis-schot
// Basis-AI = "hard" (de sterke AI van vóór). Per niveau wordt dit geschaald.
const AI_SPD_BY_DIFF = { 1: 120, 2: 145, 3: 170, 4: 195, 5: 225 }
// Per niveau: spd = snelheidsfactor, err = mik-fout (hoger = slechter mikken),
// kick/jump/special = kans-factoren (lager = minder vaak).
const LEVEL_TUNE = {
  hard:   { spd: 1.0,  err: 1.0, kick: 1.0,  jump: 1.0,  special: 1.0 },
  medium: { spd: 0.85, err: 1.6, kick: 0.78, jump: 0.8,  special: 0.7 },
  easy:   { spd: 0.66, err: 2.4, kick: 0.5,  jump: 0.55, special: 0.4 },
}

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
  const charged = p.armed                     // gloed pas ná het indrukken van de super-knop
  const auraOn = charged || p.t.dash > 0 || p.t.bighead > 0 || p.t.powershot > 0 || p.t.magnet > 0
  const run = p.onGround && moving ? Math.sin(now / 90) : 0

  // ── grond-schaduw ──
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 4, HR * 0.95, 7, 0, 0, Math.PI * 2); ctx.fill()

  // power-shot: acrobatische omhaal → de speler draait een salto.
  // buried: tegenstander is de grond in geramd → klem onder de grondlijn + zak omlaag.
  ctx.save()
  if (p.buried > 0) {
    ctx.beginPath(); ctx.rect(0, 0, W, GROUND_Y + 4); ctx.clip()
    ctx.translate(0, PR * 1.45)
  }
  if (p.powerKick > 0) {
    const pk = 1 - p.powerKick / 0.6
    ctx.translate(x, bodyCY); ctx.rotate(facing * pk * Math.PI * 2); ctx.translate(-x, -bodyCY)
  }

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
  ctx.restore()   // sluit de power-shot salto-rotatie / buried-clip
  // aarde-hoop rond een ingegraven speler
  if (p.buried > 0) {
    ctx.fillStyle = '#6b4a2a'
    ctx.beginPath(); ctx.ellipse(x, GROUND_Y, HR * 1.25, 13, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#5a3d22'
    ctx.beginPath(); ctx.ellipse(x, GROUND_Y - 3, HR * 0.95, 9, 0, Math.PI, 0); ctx.fill()
    ctx.fillStyle = '#7c5a36'
    for (let i = 0; i < 5; i++) { const a = Math.PI + (i / 4) * Math.PI; ctx.beginPath(); ctx.arc(x + Math.cos(a) * HR, GROUND_Y - 2 + Math.sin(a) * 6, 3, 0, Math.PI * 2); ctx.fill() }
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
  // ── power-shot bal-transformaties ──
  if (b.dark) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, BR, 0, Math.PI * 2); ctx.clip()
    ctx.fillStyle = '#0a0a12'; ctx.fillRect(x - BR, y - BR, BR * 2, BR * 2)
    ctx.strokeStyle = 'rgba(150,90,255,0.85)'; ctx.lineWidth = 2
    for (let i = 0; i < 3; i++) { const a = angle * 2 + i * 2.1; ctx.beginPath(); ctx.arc(x, y, BR * (0.3 + i * 0.28), a, a + 2.4); ctx.stroke() }
    ctx.restore()
  } else if (b.superColor) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, BR, 0, Math.PI * 2); ctx.clip()
    ctx.globalAlpha = 0.55; ctx.fillStyle = b.superColor; ctx.fillRect(x - BR, y - BR, BR * 2, BR * 2)
    ctx.globalAlpha = 1; ctx.restore()
  }
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

// felle goud-witte sunburst (scherpe stralen) die kort explodeert — kern van de power-shot
function drawSunburst(ctx, x, y, k, color) {
  const env = Math.sin(Math.min(1, Math.max(0, k)) * Math.PI)   // 0→1→0
  if (env <= 0.01) return
  const rays = 16
  const R = 44 + k * 150
  ctx.save()
  ctx.translate(x, y)
  ctx.globalAlpha = env
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, R)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.4, hexA(color, 0.7))
  g.addColorStop(1, hexA(color, 0))
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill()
  ctx.rotate(k * 2.2)
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2
    const long = (i % 2 === 0) ? R * 1.2 : R * 0.72
    ctx.fillStyle = (i % 2 === 0) ? '#fff' : color
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * long, Math.sin(a) * long)
    ctx.lineTo(Math.cos(a + 0.05) * 14, Math.sin(a + 0.05) * 14)
    ctx.lineTo(Math.cos(a - 0.05) * 14, Math.sin(a - 0.05) * 14)
    ctx.closePath(); ctx.fill()
  }
  ctx.restore(); ctx.globalAlpha = 1
}

// kleine raket met vlam-staart (skyrockets / raketregen)
function drawRocket(ctx, rk) {
  const ang = Math.atan2(rk.vy, rk.vx)
  ctx.save(); ctx.translate(rk.x, rk.y); ctx.rotate(ang)
  ctx.fillStyle = 'rgba(255,200,60,0.85)'
  ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-26, -5); ctx.lineTo(-26, 5); ctx.closePath(); ctx.fill()
  ctx.fillStyle = rk.color
  ctx.beginPath(); ctx.ellipse(0, 0, 12, 4.5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(7, 0, 2.6, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

// jagged verticale bliksemschicht van plafond naar grond
function drawBolt(ctx, x, k, color) {
  const a = Math.sin(Math.min(1, Math.max(0, k)) * Math.PI)
  if (a <= 0.02) return
  ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  for (const [w, c] of [[8, color], [3, '#ffffff']]) {
    ctx.strokeStyle = c; ctx.lineWidth = w
    ctx.beginPath(); let yy = CEIL; ctx.moveTo(x, yy)
    while (yy < GROUND_Y) { yy += 22 + Math.random() * 22; ctx.lineTo(x + (Math.random() - 0.5) * 38, Math.min(GROUND_Y, yy)) }
    ctx.stroke()
  }
  ctx.restore(); ctx.globalAlpha = 1
}

// grote gouden 3D-"GOAL!"-letters die over het scherm vegen
function drawGoalText(ctx, k) {
  const env = k < 0.15 ? k / 0.15 : k > 0.82 ? Math.max(0, (1 - k) / 0.18) : 1
  ctx.save()
  ctx.globalAlpha = env
  ctx.translate(W / 2 + (k - 0.5) * 130, H * 0.42)
  const sc = 1 + (1 - env) * 0.35
  ctx.scale(sc, sc)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = '900 86px Arial'
  ctx.lineWidth = 11; ctx.lineJoin = 'round'; ctx.strokeStyle = '#5a3a00'
  ctx.strokeText('GOAL!', 0, 0)
  const g = ctx.createLinearGradient(0, -50, 0, 50)
  g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#ffd23f'); g.addColorStop(1, '#d48a00')
  ctx.fillStyle = g
  ctx.fillText('GOAL!', 0, 0)
  ctx.restore(); ctx.globalAlpha = 1
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
  // massieve bovenlat (plaat) — dik, met schaduwrand zodat hij echt solide oogt
  ctx.fillStyle = '#e9e9ee'
  ctx.fillRect(x0, CROSSBAR - BAR_TH, GOAL_W, BAR_TH)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(x0, CROSSBAR - 2, GOAL_W, 2)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillRect(x0, CROSSBAR - BAR_TH, GOAL_W, 2)
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
    const showDummy = true
    const VW = 520, VX = 100, VY = 150
    const scale = cv.width / VW
    const G = GROUND_Y
    const DGX = VX + VW - 6, DGY = G - 95   // goal-mond (rechts) → doel voor homing/aim

    const mkP = (px, facing) => ({
      side: facing > 0 ? 'L' : 'R', move: facing > 0 ? move : getMove(dummyC.key), facing,
      x: px, y: G - PR, vx: 0, vy: 0, onGround: true, dizzy: 0, kickCD: 0, kickAnim: 0, powerKick: 0, buried: 0,
      charge: 0, bigScale: 1, powMult: 1, powCurve: false, powFx: 'energy',
      t: { dash: 0, bighead: 0, magnet: 0, shield: 0, powershot: 0, frozen: 0, float: 0 },
    })
    const p = mkP(VX + 80, 1)
    const dummy = mkP(VX + VW - 90, -1)
    const newBall = () => ({ x: p.x + 46, y: G - 26, vx: 0, vy: 0, angle: 0, spin: 0, scale: 1, scaleT: 0, ghostT: 0, bouncyT: 0, floatT: 0, homing: 0, homingStr: 4, homeT: 0, held: false, superT: 0, superColor: null, dark: false, laser: false, superKind: null, superOwner: null, trail: [], fx: { t: 0, type: 'energy', color: '#fff' } })
    let ball = newBall()
    let shocks = [], parts = [], decoys = [], tornado = null, mascots = [], rockets = [], bolts = [], sun = null, superSeq = null, tt = 0, triggered = false
    const period = 4.0

    const reset = () => {
      p.x = VX + 80; p.y = G - PR; p.vx = 0; p.vy = 0; p.onGround = true; p.charge = 0; p.bigScale = 1; p.buried = 0; p.powerKick = 0; p.armed = false
      for (const k in p.t) p.t[k] = 0
      dummy.x = VX + VW - 90; dummy.dizzy = 0; dummy.vx = 0; dummy.vy = 0; dummy.buried = 0; dummy.onGround = true; dummy.armed = false; for (const k in dummy.t) dummy.t[k] = 0
      ball = newBall()
      shocks = []; parts = []; decoys = []; tornado = null; mascots = []; rockets = []; bolts = []; sun = null; superSeq = null; triggered = false
    }
    const burst = (x, y, color, n = 20) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 300 * (0.4 + Math.random()); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: 0.5 + Math.random() * 0.4, color, r: 2 + Math.random() * 3 }) } }
    const goalDir = () => { const gx = W - 4, gy = (G - 175) + 90; const dx = gx - ball.x, dy = gy - ball.y, d = Math.hypot(dx, dy) || 1; return { x: dx / d, y: dy / d } }
    const trigger = () => {
      triggered = true
      const su = getSuper(countryKey)
      const col = su.color || move.color
      // acrobatische omhaal + gouden sunburst (zelfde model als in de match)
      p.armed = true                                   // gloed om het hoofd
      p.powerKick = 0.6                                  // sprong wordt per super bepaald
      ball.x = p.x + PR + BR; ball.y = p.y - PR * 0.3; ball.vx = 0; ball.vy = 0
      ball.homing = 0; ball.homeT = 0; ball.held = false; ball.floatT = 0
      ball.bouncyT = 0; ball.ghostT = 0; ball.scale = 1; ball.scaleT = 0
      sun = { x: ball.x, y: ball.y - PR * 0.2, t: 0.55, dur: 0.55, color: col }
      shocks.push({ x: ball.x, y: ball.y, color: '#ffffff', r0: 6, maxR: 120, t: 0.45, dur: 0.45 })
      burst(ball.x, ball.y, col, 24)
      ball.superT = 2.2; ball.superColor = col; ball.dark = false; ball.laser = false; ball.spin = 0
      ball.superKind = null; ball.superOwner = 'L'
      ball.fx = { t: 1.4, type: 'energy', color: col }
      const gx = VX + VW - 40
      // groot, uniek themed figuur (zelfde idee als in de match)
      const fig = su.figure || move.emoji, beh = su.behavior
      if (beh === 'charge' || beh === 'goalram' || beh === 'groundspike') mascots.push({ emoji: fig, x: VX - 30, y: G - PR - 6, vx: 760, vy: 0, t: 1.6, dur: 1.6, scale: 0.4, size: 150 })
      else if (beh === 'bighead') mascots.push({ emoji: fig, x: p.x, y: G + 130, vx: 0, vy: -300, t: 1.7, dur: 1.7, scale: 0.5, size: 165 })
      else if (beh === 'freeze' || beh === 'icespikes' || beh === 'lightning') mascots.push({ emoji: fig, x: dummy.x, y: VY - 30, vx: 0, vy: 540, t: 1.5, dur: 1.5, scale: 0.3, size: 160 })
      else mascots.push({ emoji: fig, x: VX + 110, y: VY - 30, vx: 70, vy: 430, t: 1.7, dur: 1.7, scale: 0.25, size: 155 })
      // ── Gedeelde bouwstenen (zelfde mechaniek als de echte match-super) ──
      const dir = 1
      const aimAtGoal = (speed) => { const ddx = DGX - ball.x, ddy = DGY - ball.y, d = Math.hypot(ddx, ddy) || 1; ball.vx = ddx / d * speed; ball.vy = ddy / d * speed }
      const leap = (h) => { p.vy = -h; p.onGround = false }
      const lift = () => { burst(p.x, p.y - PR * 0.6, col, 10) }
      const air = (jump, upV, hstr) => { leap(jump); lift(); ball.x = p.x + dir * 22; ball.y = G - PR - 6; ball.vx = dir * 150; ball.vy = -(upV || 1050); ball.homing = dir; ball.homingStr = hstr || 4; ball.homeT = 1.4 }
      const startSeq = (jump, total, hold, run) => { leap(jump); lift(); p.t.float = total + 0.6; superSeq = { t: total, hold, apexY: null, run, col } }
      const strikeDown = (fwd, down, hstr, extra) => () => {
        ball.vx = dir * fwd; ball.vy = down; ball.homing = dir; ball.homingStr = hstr; ball.homeT = 1.2
        ball.superColor = col; ball.fx = { t: 1.4, type: 'flame', color: col }
        shocks.push({ x: ball.x, y: ball.y, color: col, r0: 6, maxR: 170, t: 0.55, dur: 0.55 }); burst(ball.x, ball.y, col, 18)
        if (extra) extra()
      }
      const dropRain = (n) => { for (let i = 0; i < n; i++) rockets.push({ x: gx + (Math.random() - 0.5) * 40, y: VY - 30 - Math.random() * 120, vx: 0, vy: 420 + Math.random() * 200, color: col, life: 2.2, owner: 'L', delay: 0.2 + i * 0.05 }) }

      switch (su.behavior) {
        case 'skyrockets': // bal omhoog, daarna raketregen op de goal
          ball.vx = dir * 260; ball.vy = -980; ball.homing = 0; ball.fx = { t: 1.4, type: 'flame', color: col }; leap(560)
          for (let i = 0; i < 9; i++) rockets.push({ x: gx - dir * 220 + (Math.random() - 0.5) * 90, y: VY - 40 - Math.random() * 120, vx: dir * (180 + Math.random() * 120), vy: 360 + Math.random() * 220, color: col, life: 2.2, owner: 'L', delay: i * 0.07 })
          break
        case 'goalram':    // beuk: tegenstander vliegt mét de bal de goal in
          ball.vx = dir * 1500; ball.vy = -40; ball.superKind = 'goalram'; ball.fx = { t: 1.4, type: 'flame', color: col }; break
        case 'groundspike':// grondstamp: ramt de tegenstander de grond in
          ball.vx = dir * 1250; ball.vy = 60; ball.superKind = 'groundspike'; ball.dark = true; ball.spin = dir * 800; break
        case 'airshot':    // lucht-omhaal over de keeper
          leap(1150); ball.vx = dir * 520; ball.vy = -760; ball.homing = dir; ball.homingStr = 3; break
        case 'freeze':     // vries de tegenstander vast
          aimAtGoal(1050); ball.homing = dir; ball.homingStr = 4; ball.superColor = '#bfe8ff'
          dummy.t.frozen = 2.6; dummy.frozenFactor = 0; dummy.dizzy = 2.6; burst(dummy.x, dummy.y - PR * 0.6, '#bde0ff', 18); break
        case 'icespikes':  // ijspegels lanceren de tegenstander omhoog
          aimAtGoal(1150); ball.homing = dir; ball.homingStr = 4; ball.superColor = col
          dummy.dizzy = 1.4; dummy.vy = -640; dummy.onGround = false
          for (let i = 0; i < 18; i++) parts.push({ x: dummy.x + (Math.random() - 0.5) * 70, y: G - 5, vx: (Math.random() - 0.5) * 160, vy: -300 - Math.random() * 360, life: 1.0, color: i % 2 ? '#bfe8ff' : '#fff', r: 3 + Math.random() * 3 }); break
        case 'multiball':  // vijf ballen tegelijk
          aimAtGoal(1150); ball.homing = dir; ball.homingStr = 3; ball.superColor = col
          for (let i = 0; i < 4; i++) { const sp = ((i - 1.5) / 4) * 0.7; decoys.push({ x: ball.x, y: ball.y, vx: ball.vx * Math.cos(sp) - ball.vy * Math.sin(sp), vy: ball.vx * Math.sin(sp) + ball.vy * Math.cos(sp), angle: 0, life: 1.8, color: col }) }
          break
        case 'bighead':    // reuzenkop kopt keihard binnen
          p.t.bighead = 2.4; p.bigScale = 2.2; aimAtGoal(1350); ball.homing = dir; ball.homingStr = 5; ball.superColor = col; break
        case 'lightning':  // bliksem slaat in op de tegenstander
          aimAtGoal(1150); ball.homing = dir; ball.homingStr = 4; ball.superColor = col
          dummy.dizzy = 1.6; dummy.vy = -260; dummy.onGround = false
          for (let i = 0; i < 5; i++) bolts.push({ x: dummy.x + (Math.random() - 0.5) * 120, t: 0.5, dur: 0.5, color: col, delay: i * 0.05 }); break
        case 'tornado':    // wervelwind zuigt de bal de goal in
          tornado = { x: p.x + dir * 30, y: G, vx: dir * 230, t: 3.0, pull: 3200, dir, color: col }; aimAtGoal(700); break
        case 'curveball':  // brandende banaan-curve
          ball.vx = dir * 1150; ball.vy = -360; ball.spin = dir * 1500; ball.fx = { t: 1.4, type: 'flame', color: col }; ball.superColor = col; break
        case 'bouncy':     // razendsnelle stuiterbal
          ball.bouncyT = 3; ball.vx = dir * 1050; ball.vy = 260; ball.superColor = col; break
        case 'ghost':      // (half-)onzichtbare spookbal + meevliegende spoken
          ball.ghostT = 3; aimAtGoal(1250); ball.homing = dir; ball.homingStr = 3; ball.superColor = col
          for (let i = 0; i < 5; i++) { const sp = ((i - 2) / 5) * 0.5; decoys.push({ x: ball.x, y: ball.y, vx: ball.vx * Math.cos(sp) - ball.vy * Math.sin(sp), vy: ball.vx * Math.sin(sp) + ball.vy * Math.cos(sp), angle: 0, life: 2, color: col }) }
          break
        case 'giantball':  // reuzenbal rolt de goal in
          ball.scale = 2.6; ball.scaleT = 2.6; ball.vx = dir * 900; ball.vy = -240; ball.fx = { t: 1.4, type: 'flame', color: col }; ball.superColor = col; break
        case 'meteor':     // bal omhoog en stort als vuurmeteoor de goal in
          ball.vx = dir * 300; ball.vy = -760; ball.homing = dir; ball.homingStr = 6; ball.fx = { t: 1.4, type: 'flame', color: col }; ball.superColor = col
          for (let i = 0; i < 6; i++) rockets.push({ x: gx + (Math.random() - 0.5) * 50, y: VY - 60 - Math.random() * 80, vx: dir * (60 + Math.random() * 60), vy: 420 + Math.random() * 160, color: col, life: 2.0, owner: 'L', delay: 0.4 + i * 0.05 }); break
        case 'charge':     // stormram: dendert vooruit en beukt tegenstander + bal weg
          leap(120); ball.vx = dir * 900; ball.vy = -120; ball.fx = { t: 1.4, type: 'flame', color: col }; ball.superColor = col
          dummy.dizzy = 1.2; dummy.vx = dir * 700; dummy.vy = -220; dummy.onGround = false; break
        case 'bicycle':    // hoge omhaal die van boven binnenkrult
          air(1250, 1080, 4); ball.spin = dir * 1900; break
        case 'multidrop':  // zweef, dan omlaag en de bal splitst
          startSeq(1150, 1.0, 0.55, strikeDown(700, 760, 5, () => { for (let i = 0; i < 4; i++) decoys.push({ x: ball.x, y: ball.y, vx: dir * (260 + i * 130), vy: 360 + i * 90, angle: 0, life: 2.0, color: col }) })); break
        case 'moonshot':   // lange slow-motion zweef, loom neerwaarts schot
          startSeq(900, 1.5, 0.9, strikeDown(360, 360, 3, () => { ball.floatT = 1.6; ball.superT = 2.8; ball.homeT = 2.6 })); break
        case 'eagledive':  // zweef, dan duikt het poppetje zélf mee omlaag
          startSeq(1250, 1.0, 0.5, () => { p.vy = 1050; p.onGround = false; ball.vx = dir * 760; ball.vy = 980; ball.homing = dir; ball.homingStr = 6; ball.homeT = 1.0; ball.fx = { t: 1.4, type: 'flame', color: col }; ball.superColor = col }); break
        case 'thunderdunk':// zweef, bliksem verlamt keeper, spies omlaag
          startSeq(1200, 1.1, 0.6, strikeDown(620, 980, 5, () => { dummy.dizzy = 1.6; dummy.vy = -200; dummy.onGround = false; for (let i = 0; i < 5; i++) bolts.push({ x: dummy.x + (Math.random() - 0.5) * 110, t: 0.5, dur: 0.5, color: col, delay: i * 0.05 }) })); break
        case 'cannondrop': // zweef, bal zwelt tot reuzenkogel, stort omlaag
          startSeq(1100, 1.0, 0.6, strikeDown(560, 980, 4, () => { ball.scale = 2.7; ball.scaleT = 2.6 })); break
        case 'skyhammer':  // zweef, ramt de keeper de grond in
          startSeq(1300, 1.1, 0.6, strikeDown(700, 880, 4, () => { dummy.dizzy = 1.8; dummy.buried = 1.6; dummy.vx = 0; dummy.vy = 0; dummy.y = G - PR; dummy.onGround = true; shocks.push({ x: dummy.x, y: G, color: col, r0: 6, maxR: 200, t: 0.6, dur: 0.6 }); for (let i = 0; i < 14; i++) parts.push({ x: dummy.x + (Math.random() - 0.5) * 70, y: G - 5, vx: (Math.random() - 0.5) * 200, vy: -180 - Math.random() * 200, life: 0.9, color: '#8a6a4a', r: 3 + Math.random() * 4 }) })); break
        case 'snowfreeze': // zweef, keeper vriest vast, schot omlaag
          startSeq(1150, 1.1, 0.6, strikeDown(760, 820, 4, () => { ball.superColor = '#cfeaff'; dummy.t.frozen = 2.6; dummy.frozenFactor = 0; dummy.dizzy = 2.6; burst(dummy.x, dummy.y - PR * 0.6, '#bde0ff', 16); for (let i = 0; i < 14; i++) parts.push({ x: gx + (Math.random() - 0.5) * 60, y: VY, vx: 0, vy: 150 + Math.random() * 170, life: 1.6, color: '#eaf6ff', r: 2 + Math.random() * 2 }) })); break
        case 'starshower': // zweef, schot omlaag + loodrechte sterregen
          startSeq(1200, 1.0, 0.55, strikeDown(720, 820, 4, () => dropRain(7))); break
        case 'flatvolley': // korte zweef, dan vlakke knal vol op de goal
          startSeq(900, 0.7, 0.3, () => { ball.vx = dir * 1250; ball.vy = 90; ball.homing = dir; ball.homingStr = 6; ball.homeT = 1.0; ball.fx = { t: 1.4, type: 'electric', color: col }; ball.superColor = col; burst(ball.x, ball.y, col, 18) }); break
        case 'airtornado': // zweef, dan wervelwind die de bal de goal in zuigt
          startSeq(1000, 1.0, 0.55, () => { tornado = { x: p.x + dir * 30, y: G, vx: dir * 250, t: 3.0, pull: 3400, dir, color: col }; ball.vx = dir * 360; ball.vy = 500; ball.superColor = col }); break
        case 'cometfall':  // zweef, stort als vuurkomeet + inslagregen
          startSeq(1200, 1.1, 0.6, strikeDown(360, 1050, 6, () => { ball.dark = true; dropRain(6) })); break
        case 'bouncelob':  // zweef, schot omlaag dat razend over de grond kaatst
          startSeq(1150, 1.0, 0.55, strikeDown(820, 620, 3, () => { ball.bouncyT = 3; ball.spin = -dir * 900 })); break
        case 'ghostfloat': // lange zweef; half-onzichtbare bal daalt traag
          startSeq(1000, 1.5, 0.9, strikeDown(360, 360, 3, () => { ball.ghostT = 3.2; ball.floatT = 1.6; ball.superT = 2.8; ball.homeT = 2.6 })); break
        case 'dragonram':  // zweef, vurige duik die keeper mét bal de goal in ramt
          startSeq(1200, 1.0, 0.5, () => { ball.vx = dir * 1000; ball.vy = 520; ball.superKind = 'goalram'; ball.fx = { t: 1.4, type: 'flame', color: col }; ball.superColor = col; ball.homing = dir; ball.homingStr = 4; ball.homeT = 0.8 }); break
        case 'phoenixhead':// zweef met reuzenkop, kop de bal van boven omlaag
          startSeq(1100, 1.1, 0.6, strikeDown(680, 900, 5, () => { p.t.bighead = 2.6; p.bigScale = 2.3; shocks.push({ x: p.x, y: p.y - PR * 1.4, color: col, r0: 6, maxR: 200, t: 0.6, dur: 0.6 }) })); break
        default:           // krachtige rechte knal
          aimAtGoal(1180); ball.homing = dir; ball.homingStr = 4
      }
    }

    let last = performance.now(), raf = 0
    const loop = (now) => {
      let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05
      tt += dt
      if (!triggered && tt > 1.0) trigger()
      if (tt > period) { tt = 0; reset() }
      p.charge = triggered ? 1 : Math.min(1, tt / 1.0)

      for (const q of [p, dummy]) { for (const k in q.t) if (q.t[k] > 0) q.t[k] = Math.max(0, q.t[k] - dt); if (q.dizzy > 0) q.dizzy -= dt; if (q.kickAnim > 0) q.kickAnim -= dt; if (q.powerKick > 0) q.powerKick -= dt; if (q.buried > 0) { q.buried -= dt; q.vx = 0 } q.vy += GRAVITY * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.y >= G - PR) { q.y = G - PR; q.vy = 0; q.onGround = true } q.vx *= 0.9 }
      if (p.t.magnet > 0) { const dx = p.x - ball.x, dy = (p.y - PR) - ball.y, d = Math.hypot(dx, dy) || 1; ball.vx += dx / d * 3200 * dt; ball.vy += dy / d * 3200 * dt }
      if (tornado) { tornado.t -= dt; tornado.x += tornado.vx * dt; if (tornado.t <= 0) tornado = null; else { const dx = tornado.x - ball.x, dy = (G - 70) - ball.y, d = Math.hypot(dx, dy) || 1; if (d < 200) { ball.vx += dx / d * 3000 * dt + 200 * dt; ball.vy += dy / d * 3000 * dt } } }
      if (ball.scaleT > 0) { ball.scaleT -= dt; if (ball.scaleT <= 0) ball.scale = 1 }
      if (ball.ghostT > 0) ball.ghostT -= dt
      if (ball.bouncyT > 0) ball.bouncyT -= dt
      if (ball.superT > 0) { ball.superT -= dt; if (ball.superT <= 0) { ball.superColor = null; ball.dark = false; ball.laser = false; ball.superKind = null } }
      if (sun) { sun.t -= dt; if (sun.t <= 0) sun = null }
      // Zweef-sequence: poppetje springt, blijft hangen op het hoogste punt, en
      // schiet DAARNA pas (run) — zelfde mechaniek als de echte match-super.
      if (superSeq) {
        superSeq.t -= dt
        superSeq.apexY = superSeq.apexY == null ? p.y : Math.min(superSeq.apexY, p.y)
        if (superSeq.t < superSeq.hold) { p.y = superSeq.apexY; p.vy = 0; p.onGround = false }
        ball.held = true
        ball.x = p.x + 20; ball.y = p.y - PR * 1.7; ball.vx = 0; ball.vy = 0
        if (Math.random() < 0.7) burst(ball.x, ball.y, superSeq.col, 2)
        if (superSeq.t <= 0) { ball.held = false; superSeq.run(); superSeq = null }
      }
      // Homing: krult de bal richting de goal (lucht-supers krullen van bovenaf in).
      if (ball.homeT > 0) ball.homeT -= dt
      if (ball.homing && !ball.held) {
        const ddx = DGX - ball.x, ddy = DGY - ball.y, d = Math.hypot(ddx, ddy) || 1
        const sp = Math.max(900, Math.hypot(ball.vx, ball.vy)), str = ball.homingStr || 4
        ball.vx += ((ddx / d) * sp - ball.vx) * Math.min(1, str * dt)
        ball.vy += ((ddy / d) * sp - ball.vy) * Math.min(1, str * dt)
        if (ball.homeT <= 0) ball.homing = 0
      }
      if (ball.floatT > 0) ball.floatT -= dt
      const ebr = BR * (ball.scale || 1), bb = ball.bouncyT > 0 ? 0.95 : 0.6
      if (!ball.held) {
        ball.vy += GRAVITY * (ball.floatT > 0 ? 0.06 : 0.30) * dt; ball.vx += ball.spin * dt * 0.06; ball.spin *= 0.96
        ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.angle += ball.vx * dt * 0.05
        if (ball.y >= G - ebr) { ball.y = G - ebr; ball.vy = -ball.vy * bb; ball.vx *= 0.97 }
      }
      // super-mechaniek raakt de dummy (beuk / grondstamp)
      if (ball.superKind && Math.hypot(ball.x - dummy.x, ball.y - (dummy.y - PR * 0.2)) < PR + BR) {
        const fxCol = ball.fx.color
        if (ball.superKind === 'goalram') { dummy.dizzy = 1.4; dummy.vx = 900; dummy.vy = -240; dummy.onGround = false; ball.x = dummy.x; ball.vx = 1000; ball.vy = -120 }
        else if (ball.superKind === 'groundspike') { dummy.dizzy = 1.8; dummy.buried = 1.4; dummy.vx = 0; dummy.vy = 0; dummy.y = G - PR; dummy.onGround = true; ball.vy = -240; ball.vx *= 0.2; burst(dummy.x, G, '#8a6a4a', 18) }
        shocks.push({ x: dummy.x, y: dummy.y - PR * 0.4, color: fxCol, r0: 6, maxR: 160, t: 0.5, dur: 0.5 })
        ball.superKind = null
      }
      // raketregen
      for (const rk of rockets) {
        if (rk.delay > 0) { rk.delay -= dt; continue }
        rk.vy += 380 * dt; rk.x += rk.vx * dt; rk.y += rk.vy * dt; rk.life -= dt
        if (rk.y >= G) { rk.y = G; rk.life = 0; burst(rk.x, G - 4, rk.color, 8) }
        if (Math.hypot(rk.x - dummy.x, rk.y - (dummy.y - PR)) < PR + 8) { dummy.dizzy = Math.max(dummy.dizzy, 0.7); dummy.vy = -220; dummy.onGround = false; rk.life = 0; burst(rk.x, rk.y, rk.color, 10) }
      }
      rockets = rockets.filter(rk => rk.life > 0)
      for (const lb of bolts) { if (lb.delay > 0) { lb.delay -= dt; continue } lb.t -= dt }
      bolts = bolts.filter(lb => lb.t > 0)
      ball.trail.push({ x: ball.x, y: ball.y }); while (ball.trail.length > (ball.fx.t > 0 ? 16 : 8)) ball.trail.shift()
      if (ball.fx.t > 0) ball.fx.t -= dt
      for (const d of decoys) { d.vy += GRAVITY * 0.30 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.angle += d.vx * dt * 0.05; if (d.y >= G - BR) { d.y = G - BR; d.vy = -d.vy * 0.6 } d.life -= dt }
      decoys = decoys.filter(d => d.life > 0)
      for (const ms of mascots) { ms.t -= dt; ms.x += ms.vx * dt; ms.y += (ms.vy || 0) * dt; ms.scale = Math.min(1, ms.scale + dt * 4) }
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
      if (sun) drawSunburst(ctx, ball.x, ball.y, 1 - sun.t / sun.dur, sun.color)
      for (const rk of rockets) { if (rk.delay <= 0) drawRocket(ctx, rk) }
      for (const lb of bolts) { if (lb.delay <= 0) drawBolt(ctx, lb.x, 1 - lb.t / lb.dur, lb.color) }
      for (const ms of mascots) { ctx.globalAlpha = Math.max(0, Math.min(1, ms.t / 0.3)); ctx.font = `${(ms.size || 70) * (0.55 + ms.scale * 0.45)}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 14; ctx.fillText(ms.emoji, ms.x, ms.y); ctx.shadowBlur = 0; ctx.globalAlpha = 1 }
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
  const [level, setLevel]   = useState(rewardTour?.level || 'medium')  // toernooi-niveau: easy | medium | hard
  const [score, setScore]   = useState({ L: 0, R: 0 })
  const [result, setResult] = useState(null)        // 'win' | 'lose'
  const [mysteryReveal, setMysteryReveal] = useState(null)
  const [coinsEarned, setCoinsEarned] = useState(0)

  const canvasRef = useRef(null)
  const controlsRef = useRef({ left: false, right: false, jump: false, kick: false, special: false })
  const stateRef = useRef(null)
  const onMatchEndRef = useRef(null)
  const dashRef = useRef(null)        // door de match-engine gezet; aangeroepen door dubbel-tik (toets + schermknop)
  const dpadTapRef = useRef({ '-1': 0, '1': 0 })

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
  const chooseLevel = (l) => {
    setLevel(l)
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
  const rewardStartRound = () => { setOppKey(bracket.opponents[bracket.currentRound]); setCoinsEarned(0); setPhase('vs_intro') }

  // ── toernooi voortzetten vanuit het menu (buiten de opgaves) ──
  const [menuTour, setMenuTour] = useState(false)
  const resumeRewardTour = () => {
    const t = loadRewardTour(); if (!t) return
    setPlayerKey(t.playerKey); setBracket(t.bracket); setLevel(t.level || 'medium')
    setMenuTour(true); setCoinsEarned(0); setPhase('reward_round')
  }

  // ── match end handling ──
  const handleMatchEnd = useCallback((finalScore) => {
    const won = finalScore.L > finalScore.R
    setScore(finalScore)
    setResult(won ? 'win' : 'lose')
    // geen curuntie voor dit spel

    // reward-modus of menu-toernooi: speel precies één ronde, bewaar voortgang
    if (reward || menuTour) {
      if (won && bracket.currentRound >= 3) {
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
      // mysterybox: ontgrendel een nog-vergrendeld land van DIT niveau
      const pool = (UNLOCK_TIERS[level] || []).filter(k => !unlocked.includes(k))
      if (pool.length) {
        const win = pool[Math.floor(Math.random() * pool.length)]
        const next = [...unlocked, win]
        setUnlocked(next); saveUnlocked(next); setMysteryReveal(win)
      } else {
        setMysteryReveal(null)
      }
      setPhase('wk_won'); return
    }
    const nextRound = bracket.currentRound + 1
    setBracket(b => ({ ...b, currentRound: nextRound, results }))
    setOppKey(bracket.opponents[nextRound])
    setPhase('wk_round')
  }, [bracket, unlocked, addCuruntie, reward, menuTour, playerKey, level])
  onMatchEndRef.current = handleMatchEnd

  const nextWKMatch = () => { setPhase('vs_intro') }

  // ── match engine ──
  useEffect(() => {
    if (phase !== 'match') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const pMove = getMove(playerKey), oMove = getMove(oppKey)
    const oppDiff = oppCountry?.diff || 3
    const LV = LEVEL_TUNE[level] || LEVEL_TUNE.medium    // toernooi-niveau (easy/medium/hard)
    const aiSpd = (AI_SPD_BY_DIFF[oppDiff] || 240) * LV.spd

    const mkPlayer = (side, move) => ({
      side, move, facing: side === 'L' ? 1 : -1,
      x: side === 'L' ? W * 0.28 : W * 0.72, y: GROUND_Y - PR,
      vx: 0, vy: 0, onGround: true, dizzy: 0, kickCD: 0, kickAnim: 0, powerKick: 0, buried: 0, armed: false,
      kickHits: 0, hitWindow: 0, meleeCD: 0,
      charge: 0, bigScale: 1, powMult: 1, powCurve: false, powCurveDir: 1, dashVx: 0, powFx: 'energy',
      magForce: 0, frozenFactor: 1, comebackT: 0,
      ram: false, ramKnock: 0, ramStun: 0,
      t: { dash: 0, bighead: 0, magnet: 0, shield: 0, powershot: 0, frozen: 0 },
    })
    const mkBall = (x, y) => ({ x, y, vx: 0, vy: 0, angle: 0, spin: 0, scale: 1, scaleT: 0, ghostT: 0, bouncyT: 0, emoji: null, emojiT: 0, homing: 0, homingStr: 4, superT: 0, superColor: null, dark: false, laser: false, superKind: null, superOwner: null, trail: [], fx: { t: 0, type: 'energy', color: '#fff' } })
    const S = {
      L: mkPlayer('L', pMove), R: mkPlayer('R', oMove),
      ball: mkBall(W / 2, GROUND_Y - 120),
      decoys: [], tornado: null, mascots: [], rockets: [], bolts: [],
      cutin: { t: 0, dur: 0 },
      score: { L: 0, R: 0 }, time: MATCH_TIME, golden: false,
      kickoffT: 0.8, msg: '', msgT: 0, ended: false, particles: [],
      shockwaves: [], shake: { t: 0, mag: 0 }, goalFlash: { t: 0, color: '#fff' }, specFlash: { t: 0, color: '#fff' },
      sunburst: { t: 0, dur: 0.55, x: 0, y: 0, color: '#fff' }, goalText: { t: 0, dur: 1.1 },
    }
    stateRef.current = S

    const resetPositions = (serveTo) => {
      S.L.x = W * 0.28; S.L.y = GROUND_Y - PR; S.L.vx = 0; S.L.vy = 0; S.L.onGround = true; S.L.armed = false; S.L.kickHits = 0; S.L.hitWindow = 0
      S.R.x = W * 0.72; S.R.y = GROUND_Y - PR; S.R.vx = 0; S.R.vy = 0; S.R.onGround = true; S.R.armed = false; S.R.kickHits = 0; S.R.hitWindow = 0
      S.ball = mkBall(W / 2, GROUND_Y - 120)
      S.ball.vx = serveTo === 'L' ? -90 : serveTo === 'R' ? 90 : 0
      S.decoys = []; S.tornado = null; S.mascots = []; S.rockets = []; S.bolts = []
      S.kickoffT = 0.6
    }
    const flash = txt => { S.msg = txt; S.msgT = 1.2 }
    const addParticles = (x, y, color, n = 14, spd = 320) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = spd * (0.4 + Math.random() * 0.8); S.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.3, life: 0.4 + Math.random() * 0.5, color, r: 2 + Math.random() * 3 }) } }
    const addShock = (x, y, color, maxR = 90, dur = 0.45) => S.shockwaves.push({ x, y, color, r0: 6, maxR, t: dur, dur })
    const addShake = (mag, dur = 0.3) => { if (mag > S.shake.mag || S.shake.t <= 0) { S.shake.mag = mag; S.shake.t = dur; S.shake.dur = dur } }
    // bal-contact laadt de super, maar met cooldown: anders vult aanhoudend contact
    // (bv. een ram-super of dash die de bal meesleept) de bar meteen weer vol.
    const gainCharge = (p, amt) => { if ((p.chargeCD || 0) > 0) return; p.charge = Math.min(1, p.charge + amt); p.chargeCD = 0.5 }
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
    // Welke entree-stijl hoort bij welke super-mechaniek (zodat elk land een
    // herkenbaar, eigen groots figuur krijgt — net als in de echte gameplay).
    const ENTRANCE_BY_BEH = {
      groundspike: 'charge', goalram: 'charge', charge: 'charge',
      skyrockets: 'sky', meteor: 'sky', airshot: 'sky',
      bighead: 'rise',
      tornado: 'spin', curveball: 'spin',
      multiball: 'swarm', ghost: 'swarm', bouncy: 'swarm',
      freeze: 'strike', icespikes: 'strike', lightning: 'strike',
      // nieuwe lucht-supers: groot figuur daalt uit de lucht / slaat toe / rijst op
      bicycle: 'sky', multidrop: 'swarm', moonshot: 'sky', eagledive: 'sky',
      cannondrop: 'sky', cometfall: 'sky', bouncelob: 'sky', flatvolley: 'sky',
      thunderdunk: 'strike', starshower: 'sky', snowfreeze: 'strike', skyhammer: 'strike',
      airtornado: 'spin', ghostfloat: 'swarm', dragonram: 'charge', phoenixhead: 'rise',
    }
    // CINEMATISCHE entree: een groot themed figuur (e) komt het veld op.
    const bigEntrance = (p, e, col, type, tx) => {
      const atk = p.facing
      if (type === 'sky') {                       // daalt reusachtig uit de lucht
        spawnMascot(p, {}, { emoji: e, size: 180, x: p.x + atk * 120, y: CEIL - 50, vx: atk * 70, vy: 460, dur: 2.0, scale0: 0.2 })
        for (let i = 0; i < 22; i++) { const a = Math.random() * Math.PI * 2, v = 220 + Math.random() * 240; S.particles.push({ x: p.x + atk * 120, y: CEIL, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.2, color: i % 2 ? '#fff' : col, r: 2 + Math.random() * 3 }) }
      } else if (type === 'charge') {             // stormt gigantisch vanaf je eigen kant
        spawnMascot(p, {}, { emoji: e, size: 168, x: p.x - atk * 240, y: GROUND_Y - PR - 6, vx: atk * 820, vy: 0, dur: 1.7, scale0: 0.4 })
        for (let i = 0; i < 18; i++) S.particles.push({ x: p.x - atk * 60, y: GROUND_Y - 5, vx: -atk * (160 + Math.random() * 160), vy: -60 - Math.random() * 90, life: 0.85, color: i % 2 ? '#caa' : col, r: 3 + Math.random() * 4 })
      } else if (type === 'rise') {               // rijst enorm op uit de grond achter de speler
        spawnMascot(p, {}, { emoji: e, size: 190, x: p.x, y: GROUND_Y + 150, vx: 0, vy: -320, dur: 1.9, scale0: 0.5 })
        for (let i = 0; i < 16; i++) S.particles.push({ x: p.x + (Math.random() - 0.5) * 80, y: GROUND_Y - 5, vx: (Math.random() - 0.5) * 200, vy: -150 - Math.random() * 160, life: 0.9, color: col, r: 3 + Math.random() * 4 })
      } else if (type === 'spin') {               // groot, draaiend figuur
        spawnMascot(p, {}, { emoji: e, size: 165, x: p.x + atk * 40, y: p.y - PR - 30, vx: atk * 260, vy: -40, dur: 1.9, scale0: 0.25 })
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; S.particles.push({ x: p.x, y: p.y - PR, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, life: 1.0, color: i % 2 ? '#fff' : col, r: 3 + Math.random() * 3 }) }
      } else if (type === 'swarm') {              // hele zwerm figuren naar de goal
        for (let i = 0; i < 6; i++) spawnMascot(p, {}, { emoji: e, size: 100, x: p.x - atk * (30 + i * 36), y: p.y - PR - 10 + (Math.random() - 0.5) * 70, vx: atk * (560 + i * 70), vy: (Math.random() - 0.5) * 120, dur: 1.7, scale0: 0.2 })
      } else if (type === 'strike') {             // reuzenfiguur dondert op de TEGENSTANDER
        const X = tx != null ? tx : p.x + atk * 220
        spawnMascot(p, {}, { emoji: e, size: 185, x: X, y: CEIL - 40, vx: 0, vy: 560, dur: 1.6, scale0: 0.3 })
        for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, v = 200 + Math.random() * 220; S.particles.push({ x: X, y: CEIL + 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.1, color: i % 2 ? '#fff' : col, r: 2 + Math.random() * 3 }) }
      }
      addShock(p.x, p.y - PR * 0.4, col, 230, 0.7)
    }
    // ── 1) Super "scherp zetten": knop indrukken → gloed om het hoofd. ──
    // De super gaat NIET meteen af; hij wacht tot je de bal raakt (zie doKick/ballPlayerCollide).
    const armSpecial = (p) => {
      if (p.charge < 1 || p.dizzy > 0 || p.armed) return
      p.armed = true
      const col = getSuper(p === S.L ? playerKey : oppKey).color || p.move.color
      addShock(p.x, p.y - PR * 0.6, col, 90, 0.4)
      addParticles(p.x, p.y - PR, col, 12, 240)
    }

    // ── 2) Super afvuren OP HET MOMENT van balcontact, vanaf de huidige balpositie. ──
    // Geen grabBall/teleport: het schot vertrekt waar de bal nú is.
    const fireSuper = (p) => {
      const opp = p === S.L ? S.R : S.L
      p.charge = 0; p.armed = false
      p.facing = p.side === 'L' ? 1 : -1
      const m = p.move
      const su = getSuper(p === S.L ? playerKey : oppKey)
      const col = su.color || m.color
      const dir = p.facing
      const figure = su.figure || m.emoji

      p.powerKick = 0.6
      // sunburst + flits op de plek waar de bal geraakt wordt (getint naar de super-kleur)
      S.sunburst = { t: 0.55, dur: 0.55, x: S.ball.x, y: S.ball.y - PR * 0.2, color: col }
      S.specFlash = { t: 0.4, color: col }
      addShock(S.ball.x, S.ball.y, '#ffffff', 130, 0.45)
      addParticles(S.ball.x, S.ball.y, col, 30, 460)
      addParticles(S.ball.x, S.ball.y, '#ffffff', 16, 320)
      addShake(14, 0.45)
      // groot, uniek themed figuur per land (draak/Buddha/bliksem/…)
      bigEntrance(p, figure, col, ENTRANCE_BY_BEH[su.behavior] || 'charge', opp.x)
      S.cutin = { t: 1.0, dur: 1.0, color: col, name: m.name, emoji: figure, flag: (p === S.L ? playerCountry : oppCountry).flag, side: p.side }

      // reset bal-effecten, behoud huidige positie
      S.ball.superT = 1.6; S.ball.superColor = col; S.ball.dark = false; S.ball.laser = false
      S.ball.emoji = null; S.ball.spin = 0; S.ball.scale = 1; S.ball.scaleT = 0; S.ball.bouncyT = 0; S.ball.ghostT = 0; S.ball.floatT = 0; S.ball.homeT = 0; S.ball.homing = 0; S.ball.held = false
      S.ball.superKind = null; S.ball.superOwner = p.side
      setBallFx(col, 'energy')
      const goalX = dir > 0 ? W - GOAL_W - 20 : GOAL_W + 20
      // gedeelde bouwstenen voor de LUCHT-supers (poppetje springt eerst, dan eigen mechaniek)
      const leap = (h) => { p.vy = -h; p.onGround = false }
      const lift = (h) => { for (let i = 0; i < 12; i++) S.particles.push({ x: p.x, y: p.y - PR, vx: (Math.random() - 0.5) * 220, vy: -160 - Math.random() * 240, life: 0.9, color: i % 2 ? '#fff' : col, r: 2 + Math.random() * 3 }); addShock(p.x, p.y - PR * 0.6, col, 150 + h * 0.02, 0.5) }
      // LUCHT-LANCERING: poppetje springt + de bal wordt ECHT de lucht in geknald;
      // aanhoudende homing (homeT) krult hem daarna van bovenaf de goal in.
      const air = (jump, upV, hstr) => {
        leap(jump); lift(jump)
        S.ball.x = p.x + dir * 22; S.ball.y = GROUND_Y - PR - 6
        S.ball.vx = dir * 150; S.ball.vy = -(upV || 1050)
        S.ball.homing = dir; S.ball.homingStr = hstr || 4; S.ball.homeT = 1.4
      }
      // ZWEEF-super: poppetje springt floaty omhoog, blijft hangen, en schiet DAARNA
      // pas naar beneden op de goal. rise+hold maken het spannend en goed zichtbaar.
      const startSeq = (jump, total, hold, strike) => {
        leap(jump); lift(jump); p.t.float = total + 0.6
        S.superSeq = { p, dir, col, t: total, hold, apexY: null, run: strike }
        // de sequence loopt op SLOW-MO tijd (~0.3x); zorg dat de cut-in/slow-mo de
        // hele actie (zweven + schot + vlucht) dekt zodat je alles goed ziet.
        const cover = total * 2.6 + 1.4
        S.cutin.t = cover; S.cutin.dur = cover
      }
      // standaard NEERWAARTS schot vanuit het zweven (steil omlaag de goal in)
      const strikeDown = (fwd, down, hstr, extra) => () => {
        S.ball.vx = dir * fwd; S.ball.vy = down
        S.ball.homing = dir; S.ball.homingStr = hstr; S.ball.homeT = 1.2
        S.ball.superColor = col; setBallFx(col, 'flame')
        addShake(15, 0.5); addShock(S.ball.x, S.ball.y, col, 170, 0.55)
        addParticles(S.ball.x, S.ball.y, col, 26, 480); addParticles(S.ball.x, S.ball.y, '#fff', 12, 320)
        if (extra) extra()
      }
      // raket-/sterregen die LOODRECHT op de goal valt (anders dan skyrockets die schuin gaan)
      const dropRain = (n, emoji) => { for (let i = 0; i < n; i++) { const rx = goalX + (Math.random() - 0.5) * GOAL_W; S.rockets.push({ x: rx, y: CEIL - 30 - Math.random() * 140, vx: 0, vy: 420 + Math.random() * 220, color: col, life: 2.2, owner: p.side, delay: 0.2 + i * 0.05, emoji }) } }
      switch (su.behavior) {
        case 'skyrockets': // HEMELDUIK: bal schiet omhoog, daarna regent het raketten op de goal
          S.ball.vx = dir * 260; S.ball.vy = -980; S.ball.homing = 0; setBallFx(col, 'flame')
          p.vy = -JUMP_FORCE * 0.9
          for (let i = 0; i < 9; i++) { const rx = goalX + (Math.random() - 0.5) * 90; S.rockets.push({ x: rx - dir * 220, y: CEIL - 40 - Math.random() * 120, vx: dir * (180 + Math.random() * 120), vy: 360 + Math.random() * 220, color: col, life: 2.2, owner: p.side, delay: i * 0.07 }) }
          addShake(16, 0.5); break
        case 'goalram':    // BEUK: tegenstander vliegt mét de bal de goal in
          S.ball.vx = dir * 1500; S.ball.vy = -40; S.ball.superKind = 'goalram'; setBallFx(col, 'flame'); break
        case 'groundspike':// GRONDSTAMP: ramt de tegenstander de grond in
          S.ball.vx = dir * 1250; S.ball.vy = 60; S.ball.superKind = 'groundspike'; S.ball.dark = true; S.ball.spin = dir * 800; break
        case 'airshot':    // LUCHT-OMHAAL: speler springt hoog, bal hoog door de lucht
          p.vy = -1150; p.onGround = false; S.ball.vx = dir * 520; S.ball.vy = -760; S.ball.homing = dir; S.ball.homingStr = 3; break
        case 'freeze':     // IJSTIJD: vries de tegenstander vast
          aimAtGoal(p, 1050); S.ball.homing = dir; S.ball.homingStr = 4; S.ball.superColor = '#bfe8ff'
          opp.t.frozen = 2.6; opp.frozenFactor = 0; opp.dizzy = 2.6
          addShock(opp.x, opp.y - PR * 0.4, '#bde0ff', 170, 0.6)
          for (let i = 0; i < 22; i++) { const a = Math.random() * Math.PI * 2, v = 160 + Math.random() * 220; S.particles.push({ x: opp.x, y: opp.y - PR * 0.6, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 0.9, color: i % 2 ? '#bde0ff' : '#ffffff', r: 2 + Math.random() * 3 }) }
          break
        case 'icespikes':  // IJSPEGELS: lanceren de tegenstander omhoog
          aimAtGoal(p, 1150); S.ball.homing = dir; S.ball.homingStr = 4; S.ball.superColor = col
          opp.dizzy = 1.4; opp.vy = -640; opp.onGround = false
          addShock(opp.x, GROUND_Y, '#bfe8ff', 200, 0.55); addShake(16, 0.45)
          for (let i = 0; i < 18; i++) S.particles.push({ x: opp.x + (Math.random() - 0.5) * 70, y: GROUND_Y - 5, vx: (Math.random() - 0.5) * 160, vy: -300 - Math.random() * 360, life: 1.0, color: i % 2 ? '#bfe8ff' : '#ffffff', r: 3 + Math.random() * 3 })
          break
        case 'multiball':  // SAMBA: vijf ballen tegelijk
          aimAtGoal(p, 1150); S.ball.homing = dir; S.ball.homingStr = 3; S.ball.superColor = col
          for (let i = 0; i < 4; i++) { const sp = ((i - 1.5) / 4) * 0.7; S.decoys.push({ x: S.ball.x, y: S.ball.y, vx: S.ball.vx * Math.cos(sp) - S.ball.vy * Math.sin(sp), vy: S.ball.vx * Math.sin(sp) + S.ball.vy * Math.cos(sp), angle: 0, life: 1.8, color: col }) }
          break
        case 'bighead':    // KOPWAND: reuzenkop kopt de bal keihard binnen
          p.t.bighead = 2.4; p.bigScale = 2.2
          aimAtGoal(p, 1350); S.ball.homing = dir; S.ball.homingStr = 5; S.ball.superColor = col
          addShock(p.x, p.y - PR * 1.4, col, 200, 0.6); break
        case 'lightning':  // BLIKSEM: schichten slaan in op de tegenstander
          aimAtGoal(p, 1150); S.ball.homing = dir; S.ball.homingStr = 4; S.ball.superColor = col
          opp.dizzy = 1.6; opp.vy = -260; opp.onGround = false
          for (let i = 0; i < 5; i++) S.bolts.push({ x: opp.x + (Math.random() - 0.5) * 120, t: 0.5, dur: 0.5, color: col, delay: i * 0.05 })
          addShake(18, 0.5); break
        case 'tornado':    // TORNADO: wervelwind zuigt de bal de goal in
          S.tornado = { x: p.x + dir * 30, y: GROUND_Y, vx: dir * 230, t: 3.0, pull: 3200, dir, color: col }
          aimAtGoal(p, 700); break
        case 'curveball':  // BANANA: brandende curve om de keeper heen
          S.ball.vx = dir * 1150; S.ball.vy = -360; S.ball.spin = dir * 1500
          setBallFx(col, 'flame'); S.ball.superColor = col; break
        case 'bouncy':     // STUITERBAL: kaatst razendsnel laag over de grond
          S.ball.bouncyT = 3; S.ball.vx = dir * 1050; S.ball.vy = 260; S.ball.superColor = col; break
        case 'ghost':      // SPOOKBAL: (half-)onzichtbare bal + meevliegende spoken
          S.ball.ghostT = 3; aimAtGoal(p, 1250); S.ball.homing = dir; S.ball.homingStr = 3; S.ball.superColor = col
          for (let i = 0; i < 5; i++) { const sp = ((i - 2) / 5) * 0.5; S.decoys.push({ x: S.ball.x, y: S.ball.y, vx: S.ball.vx * Math.cos(sp) - S.ball.vy * Math.sin(sp), vy: S.ball.vx * Math.sin(sp) + S.ball.vy * Math.cos(sp), angle: 0, life: 2, color: col }) }
          break
        case 'giantball':  // REUZENBAL: bal wordt gigantisch en rolt de goal in
          S.ball.scale = 2.6; S.ball.scaleT = 2.6; S.ball.vx = dir * 900; S.ball.vy = -240
          setBallFx(col, 'flame'); S.ball.superColor = col; addShake(14, 0.4); break
        case 'meteor':     // METEOOR: bal vliegt hoog op en stort als vuurbal de goal in
          S.ball.vx = dir * 300; S.ball.vy = -760; S.ball.homing = dir; S.ball.homingStr = 6
          setBallFx(col, 'flame'); S.ball.superColor = col
          for (let i = 0; i < 6; i++) S.rockets.push({ x: goalX + (Math.random() - 0.5) * 50, y: CEIL - 60 - Math.random() * 80, vx: dir * (60 + Math.random() * 60), vy: 420 + Math.random() * 160, color: col, life: 2.0, owner: p.side, delay: 0.4 + i * 0.05 })
          break
        case 'charge':     // STORMRAM: speler dendert vooruit en beukt tegenstander + bal weg
          p.t.dash = 0.5; p.dashVx = dir * 950; p.ram = true; p.ramKnock = 720; p.ramStun = 1.2
          p.vy = -120; p.onGround = false
          S.ball.vx = dir * 900; S.ball.vy = -120; setBallFx(col, 'flame'); S.ball.superColor = col
          for (let i = 0; i < 3; i++) addShock(p.x + dir * i * 40, p.y - PR * 0.4, col, 110, 0.45)
          break
        case 'bicycle':    // OMHAAL (de ENE boog): de bal wordt hoog de lucht in geslagen en krult van boven binnen
          air(1250, 1080, 4); S.ball.spin = dir * 1900; break
        case 'multidrop':  // STERREN: zweeft hoog, schiet dan omlaag en de bal splitst in meerdere
          startSeq(1150, 1.0, 0.55, strikeDown(700, 760, 5, () => {
            for (let i = 0; i < 4; i++) S.decoys.push({ x: S.ball.x, y: S.ball.y, vx: dir * (260 + i * 130), vy: 360 + i * 90, angle: 0, life: 2.0, color: col })
          })); break
        case 'moonshot':   // MAANSPRONG: lange slow-motion zweef, daarna een loom neerwaarts schot
          startSeq(900, 1.5, 0.9, strikeDown(360, 360, 3, () => { S.ball.floatT = 1.6; S.ball.superT = 2.8; S.ball.homeT = 2.6 })); break
        case 'eagledive':  // ROOFVOGELDUIK: zweeft, dan DUIKT het poppetje zélf mee pijlsnel omlaag
          startSeq(1250, 1.0, 0.5, () => { p.vy = 1050; p.onGround = false; p.t.dash = 0.5; p.dashVx = dir * 700
            S.ball.vx = dir * 760; S.ball.vy = 980; S.ball.homing = dir; S.ball.homingStr = 6; S.ball.homeT = 1.0; setBallFx(col, 'flame'); S.ball.superColor = col; addShake(16, 0.5) }); break
        case 'thunderdunk':// DONDERDUNK: zweeft, bliksem verlamt de keeper, dan een spies recht omlaag
          startSeq(1200, 1.1, 0.6, strikeDown(620, 980, 5, () => {
            opp.dizzy = 1.6; opp.vy = -200; opp.onGround = false
            for (let i = 0; i < 5; i++) S.bolts.push({ x: opp.x + (Math.random() - 0.5) * 110, t: 0.5, dur: 0.5, color: col, delay: i * 0.05 })
          })); break
        case 'cannondrop': // KANONKOGEL: zweeft, de bal zwelt tot reuzenkogel en stort recht naar beneden
          startSeq(1100, 1.0, 0.6, strikeDown(560, 980, 4, () => { S.ball.scale = 2.7; S.ball.scaleT = 2.6 })); break
        case 'skyhammer':  // LUCHTHAMER: zweeft, ramt de keeper de grond in en schiet omlaag
          startSeq(1300, 1.1, 0.6, strikeDown(700, 880, 4, () => {
            opp.dizzy = 1.8; opp.buried = 1.6; opp.vx = 0; opp.vy = 0; opp.y = GROUND_Y - PR; opp.onGround = true
            addShock(opp.x, GROUND_Y, col, 220, 0.6); addShake(18, 0.5)
            for (let i = 0; i < 14; i++) S.particles.push({ x: opp.x + (Math.random() - 0.5) * 70, y: GROUND_Y - 5, vx: (Math.random() - 0.5) * 200, vy: -180 - Math.random() * 200, life: 0.9, color: '#8a6a4a', r: 3 + Math.random() * 4 })
          })); break
        case 'snowfreeze': // SNEEUWSTORM: zweeft, de keeper vriest vast, dan een schot omlaag
          startSeq(1150, 1.1, 0.6, strikeDown(760, 820, 4, () => {
            S.ball.superColor = '#cfeaff'; opp.t.frozen = 2.6; opp.frozenFactor = 0; opp.dizzy = 2.6; addShock(opp.x, opp.y - PR * 0.4, '#bde0ff', 180, 0.6)
            for (let i = 0; i < 18; i++) S.particles.push({ x: goalX + (Math.random() - 0.5) * GOAL_W, y: CEIL, vx: dir * 30, vy: 150 + Math.random() * 170, life: 1.6, color: '#eaf6ff', r: 2 + Math.random() * 2 })
          })); break
        case 'starshower': // STERRENREGEN: zweeft, dan schot omlaag terwijl sterren loodrecht neervallen
          startSeq(1200, 1.0, 0.55, strikeDown(720, 820, 4, () => dropRain(7))); break
        case 'flatvolley': // ZONVOLLEY: korte zweef, dan een keiharde vlakke knal vol op de goal
          startSeq(900, 0.7, 0.3, () => { S.ball.vx = dir * 1250; S.ball.vy = 90; S.ball.homing = dir; S.ball.homingStr = 6; S.ball.homeT = 1.0
            setBallFx(col, 'electric'); S.ball.superColor = col; addShake(14, 0.45); addParticles(S.ball.x, S.ball.y, col, 24, 480) }); break
        case 'airtornado': // BERGTORNADO: zweeft, dan vormt een wervelwind die de bal de goal in zuigt
          startSeq(1000, 1.0, 0.55, () => { S.tornado = { x: p.x + dir * 30, y: GROUND_Y, vx: dir * 250, t: 3.0, pull: 3400, dir, color: col }
            S.ball.vx = dir * 360; S.ball.vy = 500; S.ball.superColor = col; addShake(13, 0.45) }); break
        case 'cometfall':  // KOMEET: zweeft, stort als vuurkomeet recht omlaag + inslagregen
          startSeq(1200, 1.1, 0.6, strikeDown(360, 1050, 6, () => { S.ball.dark = true
            for (let i = 0; i < 6; i++) S.rockets.push({ x: goalX + (Math.random() - 0.5) * 70, y: CEIL - 50 - Math.random() * 90, vx: dir * (60 + Math.random() * 70), vy: 420 + Math.random() * 180, color: col, life: 2.0, owner: p.side, delay: 0.35 + i * 0.05 })
          })); break
        case 'bouncelob':  // SALTO-STUITER: zweeft, schiet omlaag en de bal kaatst razend over de grond
          startSeq(1150, 1.0, 0.55, strikeDown(820, 620, 3, () => { S.ball.bouncyT = 3; S.ball.spin = -dir * 900 })); break
        case 'ghostfloat': // ZWEEFSPOOK: lange zweef; de bal wordt half-onzichtbaar en daalt traag omlaag
          startSeq(1000, 1.5, 0.9, strikeDown(360, 360, 3, () => { S.ball.ghostT = 3.2; S.ball.floatT = 1.6; S.ball.superT = 2.8; S.ball.homeT = 2.6 })); break
        case 'dragonram':  // DRAAKBEUK: zweeft, dan een vurige duik die de keeper mét bal de goal in ramt
          startSeq(1200, 1.0, 0.5, () => { S.ball.vx = dir * 1000; S.ball.vy = 520; S.ball.superKind = 'goalram'; setBallFx(col, 'flame'); S.ball.superColor = col
            S.ball.homing = dir; S.ball.homingStr = 4; S.ball.homeT = 0.8; addShake(16, 0.5) }); break
        case 'phoenixhead':// FENIKSKOP: zweeft met een reuzenkop, kopt de bal van bovenaf omlaag binnen
          startSeq(1100, 1.1, 0.6, strikeDown(680, 900, 5, () => { p.t.bighead = 2.6; p.bigScale = 2.3; addShock(p.x, p.y - PR * 1.4, col, 200, 0.6) })); break
        default:           // krachtige rechte knal
          aimAtGoal(p, 1180); S.ball.homing = dir; S.ball.homingStr = 4
      }
      flash(`${m.name}!`)
    }

    const doKick = (p) => {
      if (p.kickCD > 0 || S.ball.held) return   // bal is vastgezet tijdens een super-zweef
      const dx = S.ball.x - p.x, dy = S.ball.y - (p.y - PR * 0.3)
      if (Math.hypot(dx, dy) > KICK_RANGE) return
      if (p.armed) { fireSuper(p); p.kickCD = 0.42; p.kickAnim = KICK_ANIM; return }   // super vuurt op contact
      p.kickCD = 0.42; p.kickAnim = KICK_ANIM       // langere cooldown tussen schoten
      const isPower = p.t.powershot > 0
      let power = isPower ? KICK_POWER * p.powMult : KICK_POWER
      S.ball.vx = p.facing * power + p.vx * 0.4
      S.ball.vy = -power * 0.85                      // schopt makkelijk de lucht in
      if (dy < 0) S.ball.vy -= 200                   // van onderaf geraakt → extra lift
      if (p.powCurve) { S.ball.spin = (p.powCurveDir || 1) * p.facing * 1100; p.powCurve = false }
      addParticles(S.ball.x, S.ball.y, '#ffffff', 6, 220)
      addShake(3, 0.12)
      if (isPower) triggerPower(p)
    }

    // Raak je de tegenstander met een trap (binnen mêlee-bereik, in zijn richting),
    // dan telt dat. 5 treffers snel achter elkaar → tegenstander even K.O.
    const meleeHit = (att, vic) => {
      if (att.meleeCD > 0 || vic.dizzy > 0 || vic.buried > 0) return
      const dx = vic.x - att.x
      if (Math.abs(dx) > PR * 2.1 || Math.sign(dx) !== att.facing) return
      if (Math.abs((vic.y) - (att.y)) > PR * 1.4) return
      att.meleeCD = 0.32; att.kickAnim = KICK_ANIM
      vic.kickHits = (vic.kickHits || 0) + 1
      vic.hitWindow = 1.2
      vic.vx += att.facing * 150; vic.vy = Math.min(vic.vy, -60)
      addParticles(vic.x, vic.y - PR * 0.4, '#ffffff', 6, 220); addShake(3, 0.12)
      if (vic.kickHits >= 5) {           // K.O.!
        vic.kickHits = 0; vic.hitWindow = 0
        vic.dizzy = 2.4; vic.vx = att.facing * 360; vic.vy = -300; vic.onGround = false
        flash('💥 K.O.!'); addShock(vic.x, vic.y - PR * 0.4, '#ffd23f', 170, 0.55)
        addParticles(vic.x, vic.y - PR, '#ffd23f', 24, 420); addShake(16, 0.45)
      }
    }

    const ballPlayerCollide = (p) => {
      if (S.ball.held) return false   // bal kleeft aan de schutter tijdens het zweven
      const headScale = p.t.bighead > 0 ? p.bigScale : 1
      const rad = PR * (0.95) * (1 + (headScale - 1) * 0.5)
      const cx = p.x, cy = p.y - PR * 0.2
      const dx = S.ball.x - cx, dy = S.ball.y - cy
      const dist = Math.hypot(dx, dy)
      const minD = rad + BR * (S.ball.scale || 1)
      if (dist < minD && dist > 0) {
        // ── super staat scherp en deze speler raakt de bal → vuur hier af ──
        if (p.armed) { fireSuper(p); return true }
        // ── super-mechaniek raakt de TEGENSTANDER (niet de schutter zelf) ──
        if (S.ball.superKind && p.side !== S.ball.superOwner) {
          const kdir = Math.sign(S.ball.vx) || (S.ball.superOwner === 'L' ? 1 : -1)
          const fxCol = S.ball.fx.color
          if (S.ball.superKind === 'goalram') {            // tegenstander vliegt mét de bal de goal in
            p.dizzy = 1.4; p.vx = kdir * 1000; p.vy = -240; p.onGround = false
            S.ball.x = p.x; S.ball.vx = kdir * 1100; S.ball.vy = -120
            addShock(p.x, p.y - PR * 0.4, fxCol, 200, 0.6); addShake(20, 0.5)
            addParticles(p.x, p.y - PR, fxCol, 28, 460)
          } else if (S.ball.superKind === 'groundspike') { // tegenstander wordt de grond in geramd
            p.dizzy = 1.8; p.buried = 1.4; p.vx = 0; p.vy = 0; p.y = GROUND_Y - PR; p.onGround = true
            S.ball.vy = -240; S.ball.vx *= 0.2
            addShock(p.x, GROUND_Y, fxCol, 240, 0.6); addShake(22, 0.55)
            for (let i = 0; i < 24; i++) { const a = Math.PI + Math.random() * Math.PI; const v = 220 + Math.random() * 220; S.particles.push({ x: p.x + (Math.random() - 0.5) * 60, y: GROUND_Y - 5, vx: Math.cos(a) * v * 0.6, vy: Math.sin(a) * v - 120, life: 0.9, color: i % 2 ? '#8a6a4a' : fxCol, r: 3 + Math.random() * 4 }) }
          }
          S.ball.superKind = null
          gainCharge(p, 0.05)
          return true
        }
        // ── dash: bal schoon vooruit punten i.p.v. eromheen glitchen ──
        if (p.t.dash > 0) {
          const ddir = Math.sign(p.dashVx) || p.facing
          if (dx * ddir >= -BR) {                      // bal staat vóór de dashende speler
            S.ball.x = p.x + ddir * (minD + 2)
            S.ball.y = Math.min(S.ball.y, cy)
            S.ball.vx = ddir * Math.max(Math.abs(p.dashVx) * 1.05, 620)
            S.ball.vy = Math.min(S.ball.vy, 0) - 240
            gainCharge(p, 0.05)
            addShake(2, 0.08)
            return true
          }
        }
        const nx = dx / dist, ny = dy / dist
        S.ball.x = cx + nx * minD; S.ball.y = cy + ny * minD
        const rel = S.ball.vx * nx + S.ball.vy * ny
        let imp = -rel * (1 + 0.45)               // minder elastische botsing
        S.ball.vx += nx * imp + p.vx * 0.4
        S.ball.vy += ny * imp + p.vy * 0.3 - 110     // wat meer omhoog-bias
        if (ny < 0) S.ball.vy += ny * 240            // van onderaf geraakt → wipt makkelijk de lucht in
        if (p.t.powershot > 0) { S.ball.vx *= p.powMult; S.ball.vy *= p.powMult; if (p.powCurve) S.ball.spin = (p.powCurveDir || 1) * p.facing * 1000; triggerPower(p) }
        else {
          // voorkom dat de bal aan de speler 'kleeft': geef altijd een duidelijke wegduw
          const outV = S.ball.vx * nx + S.ball.vy * ny
          const MIN_SEP = 150
          if (outV < MIN_SEP) { const add = MIN_SEP - outV; S.ball.vx += nx * add; S.ball.vy += ny * add }
          addShake(2, 0.08)
        }
        gainCharge(p, 0.05)
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
        if (p.powerKick > 0) p.powerKick -= dt
        if (p.buried > 0) { p.buried -= dt; p.vx = 0; p.x = p.x }   // vastgeramd in de grond
        if (p.meleeCD > 0) p.meleeCD -= dt
        if (p.chargeCD > 0) p.chargeCD -= dt   // cooldown op super-laden via bal-contact
        if (p.hitWindow > 0) { p.hitWindow -= dt; if (p.hitWindow <= 0) p.kickHits = 0 }   // streak verloopt
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
      if (S.ball.floatT > 0) S.ball.floatT -= dt   // maan/zweef-bal: trage val
      if (S.ball.emojiT > 0) { S.ball.emojiT -= dt; if (S.ball.emojiT <= 0) S.ball.emoji = null }
      if (S.ball.superT > 0) { S.ball.superT -= dt; if (S.ball.superT <= 0) { S.ball.superColor = null; S.ball.dark = false; S.ball.laser = false; S.ball.superKind = null } }
      if (S.sunburst.t > 0) S.sunburst.t -= dt
      if (S.goalText.t > 0) S.goalText.t -= rdt   // GOAL-letters lopen op echte tijd (niet slow-mo)
      // homing-raket stuurt naar de goal. homeT = aanhoudende sturing (voor lucht-
      // schoten: de bal gaat eerst de lucht in en krult dáárna pas omlaag de goal in).
      if (S.ball.homeT > 0) S.ball.homeT -= dt
      if (S.ball.homing && live) {
        const gx = S.ball.homing > 0 ? W - 4 : 4, gy = CROSSBAR + GOAL_H * 0.55
        const dx = gx - S.ball.x, dy = gy - S.ball.y, d = Math.hypot(dx, dy) || 1
        const sp = Math.max(900, Math.hypot(S.ball.vx, S.ball.vy))
        const str = S.ball.homingStr || 4
        S.ball.vx += ((dx / d) * sp - S.ball.vx) * Math.min(1, str * dt)
        S.ball.vy += ((dy / d) * sp - S.ball.vy) * Math.min(1, str * dt)
        if (S.ball.homeT <= 0 && S.ball.emojiT <= 0) S.ball.homing = 0
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
          if (c.kick) { doKick(L); meleeHit(L, S.R) }
          if (c.special) { armSpecial(L); c.special = false }
        } else L.vx *= 0.8

        // ── AI (R) ──
        const R = S.R
        if (R.dizzy <= 0) {
          const aspd = aiSpd * R.frozenFactor
          // spookbal: AI ziet de bal slecht → mikt met grote fout
          const ghostErr = S.ball.ghostT > 0 ? (Math.sin(now / 140) * 120) : 0
          // mik-fout: groter bij minder sterren én op een lager niveau
          const aiErr = (6 - oppDiff) * 12 * LV.err
          const ballSide = S.ball.x + ghostErr + Math.sin(now / 520) * aiErr
          // chase ball, but retreat to defend if ball behind toward own goal
          let target = ballSide
          if (S.ball.x > W * 0.62 && S.ball.vx > 0) target = Math.max(W * 0.6, S.ball.x - 30)
          const dxr = target - R.x
          // kleine dode zone → AI beweegt vrijwel altijd richting de bal
          if (Math.abs(dxr) > 14) { R.vx = Math.sign(dxr) * aspd; R.facing = S.ball.x < R.x ? -1 : 1 }
          else R.vx *= 0.7
          if (R.t.dash > 0) R.vx = R.dashVx * R.frozenFactor
          // springt voor hoge ballen (minder vaak op een lager niveau)
          if (R.onGround && S.ball.y < GROUND_Y - 130 && Math.abs(S.ball.x - R.x) < 80 && S.ball.vy > -50 && Math.random() < (0.12 + oppDiff * 0.04) * LV.jump) { R.vy = -JUMP_FORCE; R.onGround = false }
          // schiet als de bal binnen bereik is (minder vaak op een lager niveau)
          if (Math.hypot(S.ball.x - R.x, S.ball.y - (R.y - PR * 0.3)) < KICK_RANGE && Math.random() < (0.2 + oppDiff * 0.09) * LV.kick) doKick(R)
          if (Math.abs(S.L.x - R.x) < PR * 2.1 && Math.random() < (0.06 + oppDiff * 0.02) * LV.kick) meleeHit(R, S.L)
          // zet de super scherp (vuurt vanzelf zodra de AI de bal raakt)
          if (R.charge >= 1 && !R.armed && Math.random() < (0.01 + oppDiff * 0.006) * LV.special) armSpecial(R)
        } else R.vx *= 0.8

        // physics players
        for (const p of [S.L, S.R]) {
          p.vy += GRAVITY * (p.t.float > 0 ? 0.32 : 1) * dt   // maan-sprong = lange hangtijd
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

        // speler-speler: alleen botsen op ~gelijke hoogte, zodat je OVER elkaar
        // heen kunt springen (en niemand je klem kan zetten)
        {
          const dx2 = S.R.x - S.L.x
          const minSep = PR * 1.7
          const closeY = Math.abs(S.L.y - S.R.y) < PR * 1.1
          if (Math.abs(dx2) < minSep && closeY) {
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

        // ── SUPER-SEQUENCE: poppetje ZWEEFT omhoog en schiet daarna naar beneden ──
        // Tijdens deze fase kleeft de bal boven het hoofd; pas als de hang voorbij is
        // wordt het echte schot (sq.run) afgevuurd. Geeft de super meer spanning.
        if (S.superSeq) {
          const sq = S.superSeq, pp = sq.p
          sq.t -= dt
          sq.apexY = sq.apexY == null ? pp.y : Math.min(sq.apexY, pp.y)
          if (sq.t < sq.hold) { pp.y = sq.apexY; pp.vy = 0; pp.onGround = false }   // ZWEVEN op het hoogste punt
          S.ball.held = true
          S.ball.x = pp.x + sq.dir * 20; S.ball.y = pp.y - PR * 1.7; S.ball.vx = 0; S.ball.vy = 0
          if (Math.random() < 0.7) addParticles(S.ball.x, S.ball.y, sq.col, 3, 170)   // opbouwende energie
          if (sq.t <= 0) { S.ball.held = false; pp.kickAnim = KICK_ANIM; sq.run(); S.superSeq = null }
        }

        // ball physics
        const b = S.ball
        const effBR = BR * (b.scale || 1)
        const BB = b.bouncyT > 0 ? 0.95 : BALL_BOUNCE
        b.vy += GRAVITY * (b.floatT > 0 ? 0.07 : 0.30) * dt   // zweef-bal valt heel traag
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
        // crossbar = ECHT massieve plaat. Volledige AABB-botsing (van boven, onder
        // én opzij) met een swept-test, zodat de bal er nooit doorheen tunnelt of
        // er van de zijkant doorheen de goal in vliegt.
        const collideBar = (gx0) => {
          const rx0 = gx0 - effBR, rx1 = gx0 + GOAL_W + effBR
          const ry0 = CROSSBAR - BAR_TH - effBR, ry1 = CROSSBAR + effBR
          const px = b.x - b.vx * dt, py = b.y - b.vy * dt   // vorige positie
          // 1) swept: snijdt het pad vorige→nu de (vergrote) plaat? → stop bij eerste contact
          const dx = b.x - px, dy = b.y - py
          let hit = false, nx = 0, ny = 0
          {
            const inv = (a) => (Math.abs(a) < 1e-6 ? 1e30 : 1 / a)
            const tx1 = (rx0 - px) * inv(dx), tx2 = (rx1 - px) * inv(dx)
            const ty1 = (ry0 - py) * inv(dy), ty2 = (ry1 - py) * inv(dy)
            const txmin = Math.min(tx1, tx2), txmax = Math.max(tx1, tx2)
            const tymin = Math.min(ty1, ty2), tymax = Math.max(ty1, ty2)
            const tenter = Math.max(txmin, tymin), texit = Math.min(txmax, tymax)
            const startInside = px > rx0 && px < rx1 && py > ry0 && py < ry1
            if (!startInside && tenter <= texit && tenter >= 0 && tenter <= 1) {
              const t = Math.max(0, tenter - 0.001)
              b.x = px + dx * t; b.y = py + dy * t
              if (txmin > tymin) { nx = dx > 0 ? -1 : 1 } else { ny = dy > 0 ? -1 : 1 }
              hit = true
            }
          }
          // 2) statisch: bal zit (langzaam) in de plaat → duw eruit langs kleinste kant
          if (!hit && b.x > rx0 && b.x < rx1 && b.y > ry0 && b.y < ry1) {
            const pl = b.x - rx0, pr = rx1 - b.x, pt = b.y - ry0, pb = ry1 - b.y
            const m = Math.min(pl, pr, pt, pb)
            if (m === pt) { b.y = ry0; ny = -1 } else if (m === pb) { b.y = ry1; ny = 1 }
            else if (m === pl) { b.x = rx0; nx = -1 } else { b.x = rx1; nx = 1 }
            hit = true
          }
          if (hit) {
            if (nx) { b.vx = (nx > 0 ? Math.abs(b.vx) : -Math.abs(b.vx)) * BB; b.vy *= 0.92 }
            if (ny) {
              b.vy = (ny > 0 ? Math.abs(b.vy) : -Math.abs(b.vy)) * BB; b.vx *= 0.9
              // op de lat geland → laat de bal altijd naar voren (richting veld) rollen
              // zodat hij er nooit boven op blijft liggen
              if (ny < 0) {
                const fieldDir = gx0 < W / 2 ? 1 : -1
                const minRoll = 130
                if (b.vx * fieldDir < minRoll) b.vx += fieldDir * (minRoll - b.vx * fieldDir)
              }
            }
          }
        }
        collideBar(0); collideBar(W - GOAL_W)
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
        const bs = Math.hypot(b.vx, b.vy), BMAX = b.floatT > 0 ? 430 : 1250
        if (bs > BMAX) { b.vx = b.vx / bs * BMAX; b.vy = b.vy / bs * BMAX }

        // goals (de speler die incasseert krijgt een comeback-laadboost)
        if (b.x - effBR <= 2 && b.y > CROSSBAR) { S.score.R++; S.L.comebackT = 12; flash('⚽ Tegendoelpunt!'); addParticles(40, GROUND_Y - 60, S.R.move.color, 40, 520); addShock(40, GROUND_Y - 60, S.R.move.color, 220, 0.7); addShake(16, 0.5); S.goalFlash = { t: 0.5, color: S.R.move.color }; S.goalText = { t: 1.1, dur: 1.1 }; resetPositions('L'); if (S.golden) S.ended = true }
        else if (b.x + effBR >= W - 2 && b.y > CROSSBAR) { S.score.L++; S.R.comebackT = 12; flash('⚽ GOAL!'); addParticles(W - 40, GROUND_Y - 60, S.L.move.color, 40, 520); addShock(W - 40, GROUND_Y - 60, S.L.move.color, 220, 0.7); addShake(16, 0.5); S.goalFlash = { t: 0.5, color: S.L.move.color }; S.goalText = { t: 1.1, dur: 1.1 }; resetPositions('R'); if (S.golden) S.ended = true }

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
        d.vy += GRAVITY * 0.30 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.angle += d.vx * dt * 0.05
        if (d.y >= GROUND_Y - BR) { d.y = GROUND_Y - BR; d.vy = -d.vy * BALL_BOUNCE }
        d.life -= dt
      }
      S.decoys = S.decoys.filter(d => d.life > 0 && d.x > -20 && d.x < W + 20)

      // raketregen (skyrockets): vallen schuin naar beneden op de goal; raken ze de tegenstander → stun
      for (const rk of S.rockets) {
        if (rk.delay > 0) { rk.delay -= dt; continue }
        rk.vy += 380 * dt; rk.x += rk.vx * dt; rk.y += rk.vy * dt; rk.life -= dt
        if (rk.y >= GROUND_Y) { rk.y = GROUND_Y; rk.life = 0; addParticles(rk.x, GROUND_Y - 4, rk.color, 10, 300); addShake(5, 0.12) }
        for (const pl of [S.L, S.R]) {
          if (pl.side !== rk.owner && Math.hypot(rk.x - pl.x, rk.y - (pl.y - PR)) < PR + 8) {
            pl.dizzy = Math.max(pl.dizzy, 0.7); pl.vy = -240; pl.onGround = false
            rk.life = 0; addParticles(rk.x, rk.y, rk.color, 14, 360); addShake(8, 0.18)
          }
        }
      }
      S.rockets = S.rockets.filter(rk => rk.life > 0)

      // bliksemschichten
      for (const lb of S.bolts) { if (lb.delay > 0) { lb.delay -= dt; continue } lb.t -= dt }
      S.bolts = S.bolts.filter(lb => lb.t > 0)

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
      // gouden sunburst van de power-shot (volgt de bal zolang actief)
      if (S.sunburst.t > 0) drawSunburst(ctx, S.ball.x, S.ball.y, 1 - S.sunburst.t / S.sunburst.dur, S.sunburst.color)
      // raketregen
      for (const rk of S.rockets) { if (rk.delay <= 0) drawRocket(ctx, rk) }
      // bliksemschichten
      for (const lb of S.bolts) { if (lb.delay <= 0) drawBolt(ctx, lb.x, 1 - lb.t / lb.dur, lb.color) }
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

      // grote gouden "GOAL!"-letters
      if (S.goalText.t > 0) drawGoalText(ctx, 1 - S.goalText.t / S.goalText.dur)

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
        // sunburst + groot uniek figuur dat inzoomt + landnaam
        const dir = ci.side === 'L' ? 1 : -1
        const ex = W / 2 - dir * (1 - inOut) * 260
        drawSunburst(ctx, ex, bandY - 4, Math.min(1, k * 1.3), ci.color)
        if (ci.emoji) {
          ctx.globalAlpha = inOut
          ctx.font = `${96 + inOut * 28}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.shadowColor = ci.color; ctx.shadowBlur = 24
          ctx.fillText(ci.emoji, ex, bandY - 4); ctx.shadowBlur = 0
        }
        ctx.globalAlpha = inOut
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
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
    // dubbel-tik A/D (of pijltjes) kort achter elkaar → dash-burst in die richting
    const lastTap = { '-1': 0, '1': 0 }
    const tapDash = (dir) => {
      const L = S.L
      if (!L || L.dizzy > 0 || L.buried > 0 || S.kickoffT > 0 || S.ended) return
      L.facing = dir
      L.t.dash = 0.26; L.dashVx = dir * 560
      addParticles(L.x - dir * PR, L.y - PR * 0.3, '#ffffff', 8, 280)
      addShake(4, 0.12)
    }
    dashRef.current = tapDash   // ook bruikbaar vanuit de schermknoppen
    const onTapDir = (e, dir) => {
      if (e.repeat) return
      const now = performance.now()
      if (now - lastTap[dir] < 280) tapDash(dir)
      lastTap[dir] = now
    }
    const down = e => {
      const c = controlsRef.current
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { onTapDir(e, -1); c.left = true }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { onTapDir(e, 1); c.right = true }
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') { c.jump = true; e.preventDefault() }
      else if (e.code === 'Space' || e.code === 'KeyX' || e.code === 'KeyK') { c.kick = true; e.preventDefault() }
      else if (e.code === 'KeyE' || e.code === 'KeyZ' || e.code === 'KeyL' || e.code === 'ArrowDown') c.special = true
    }
    const up = e => {
      const c = controlsRef.current
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') c.left = false
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') c.right = false
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') c.jump = false
      else if (e.code === 'Space' || e.code === 'KeyX' || e.code === 'KeyK') c.kick = false
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
  // dubbel-tik op een schermpijl → dash in die richting
  const screenDash = (dir) => {
    const now = performance.now()
    if (now - (dpadTapRef.current[dir] || 0) < 280) dashRef.current && dashRef.current(dir)
    dpadTapRef.current[dir] = now
  }
  const holdDir = (key, dir) => () => { controlsRef.current[key] = true; screenDash(dir) }

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
        <button className="hs-skip-link" onClick={onBack}>{menuTour ? '← Menu' : 'Sla over →'}</button>
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
          <p className="wk-champ-sub">{menuTour
            ? (won ? 'Door naar de volgende ronde!' : 'Je speelt deze ronde opnieuw.')
            : (won ? 'Geef weer 5 goede antwoorden voor de volgende ronde!' : 'Volgende keer speel je deze ronde opnieuw.')}</p>
        </div>
        {menuTour
          ? <button className="mode-card hs-go" onClick={() => setPhase('reward_round')}>▶ Volgende ronde</button>
          : <button className="mode-card hs-go" onClick={onBack}>← En weer terug naar het leren!</button>}
        {menuTour && <button className="hs-skip-link" onClick={onBack}>← Menu</button>}
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
        <button className="mode-card hs-go" onClick={onBack}>{menuTour ? '← Menu' : '← En weer terug naar het leren!'}</button>
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
        {loadRewardTour() && (
          <button className="mode-card hs-go" style={{ marginBottom: 14 }} onClick={resumeRewardTour}>
            🏆 Verder met je toernooi
          </button>
        )}
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
            <p className="hs-preview-desc">{superDescOf(playerKey)}</p>
            <p className="hs-preview-how">Laad de ⭐-meter vol en druk op de special-knop om hem te gebruiken!</p>
          </div>
        </div>
        <div className="mode-grid">
          <button className="mode-card hs-go" onClick={startQuick}>
            <span style={{ fontSize: '2rem' }}>⚽</span>
            <span className="mode-name">Start wedstrijd</span>
            <span className="mode-desc">1 potje tegen een willekeurig land</span>
          </button>
          <button className="mode-card" onClick={() => setPhase('wk_level')}>
            <span style={{ fontSize: '2rem' }}>🏆</span>
            <span className="mode-name">Speel Cup</span>
            <span className="mode-desc">Kies een niveau → win 4 rondes → nieuw land</span>
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'wk_level') {
    return (
      <div className="game-screen game-screen-center">
        <button className="back-btn" onClick={() => setPhase('mode')}>← Terug</button>
        <div className="wk-header">
          <span className="wk-trophy">🏆</span>
          <h1 className="wk-title">Kies je niveau</h1>
          <p className="wk-sub">Elk niveau heeft eigen landen om te winnen — moeilijker = sterkere landen!</p>
        </div>
        <div className="mode-grid hs-level-grid">
          {LEVELS.map(lv => {
            const tier = UNLOCK_TIERS[lv.key] || []
            return (
              <button key={lv.key} className="mode-card hs-level-card" onClick={() => chooseLevel(lv.key)}>
                <span style={{ fontSize: '1.8rem' }}>{lv.emoji}</span>
                <span className="mode-name">{lv.label}</span>
                <span className="mode-desc">{lv.desc}</span>
                <span className="hs-level-prizes">
                  {tier.map(k => {
                    const c = getCountry(k), owned = unlocked.includes(k)
                    return <span key={k} className="hs-level-prize" style={owned ? { opacity: 0.35 } : undefined} title={owned ? `${c.name} (al ontgrendeld)` : c.name}>{owned ? '✓' : c.flag}</span>
                  })}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (phase === 'wk_bracket') {
    return (
      <div className="game-screen game-screen-center">
        <button className="back-btn" onClick={() => { setBracket(null); setPhase('wk_level') }}>← Terug</button>
        <div className="wk-header">
          <span className="wk-trophy">🏆</span>
          <h1 className="wk-title">WK Toernooi</h1>
          <p className="wk-sub">{playerCountry.flag} {playerCountry.name} — {(LEVELS.find(l => l.key === level) || {}).emoji} {(LEVELS.find(l => l.key === level) || {}).label} — versla 4 landen!</p>
        </div>
        <Bracket bracket={bracket} playerKey={playerKey} />
        <button className="mode-card hs-go" onClick={() => setPhase('vs_intro')}>▶ Start toernooi</button>
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

  if (phase === 'vs_intro') {
    const om = getMove(oppKey)
    return (
      <div className="game-screen game-screen-center">
        <div className="wk-header">
          <span className="wk-trophy">{oppCountry.flag}</span>
          <h1 className="wk-title">{oppCountry.name}</h1>
          <p className="wk-sub">Jouw volgende tegenstander — {'★'.repeat(oppCountry.diff)}{'☆'.repeat(5 - oppCountry.diff)}</p>
        </div>
        <div className="hs-preview">
          <div className="hs-demo-box"><SpecialDemo countryKey={oppKey} /></div>
          <div className="hs-preview-info">
            <div className="hs-preview-move" style={{ color: om.color }}>{om.emoji} {om.name}</div>
            <p className="hs-preview-desc">{superDescOf(oppKey)}</p>
            <p className="hs-preview-how">Let op zijn superschot — versla {oppCountry.name}!</p>
          </div>
        </div>
        <button className="mode-card hs-go" onClick={() => setPhase('match')}>▶ Start wedstrijd</button>
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
          <div className={`hs-charge${hud.L >= 1 ? ' hs-charge-full' : ''}`} style={{ '--chg': getMove(playerKey).color }}>
            <div className="hs-charge-fill" style={{ width: `${hud.L * 100}%`, background: getMove(playerKey).color }} />
            <span className="hs-charge-label">{hud.L >= 1 ? '⚡ SUPER!' : 'SUPER'}</span>
          </div>
        </div>
        <div className="hs-scoreboard">{hud.sL} <span className="hs-time">{hud.time}s</span> {hud.sR}</div>
        <div className="hs-hud-team hs-hud-right">
          <span>{oppCountry.flag}</span>
          <div className={`hs-charge${hud.R >= 1 ? ' hs-charge-full' : ''}`} style={{ '--chg': getMove(oppKey).color }}>
            <div className="hs-charge-fill" style={{ width: `${hud.R * 100}%`, background: getMove(oppKey).color }} />
            <span className="hs-charge-label">{hud.R >= 1 ? '⚡ SUPER!' : 'SUPER'}</span>
          </div>
        </div>
      </div>

      <div className="hs-canvas-wrap">
        <canvas ref={canvasRef} width={W} height={H} className="hs-canvas" />
      </div>

      <div className="hs-controls">
        <div className="hs-dpad">
          <button className="hs-btn" onPointerDown={holdDir('left', -1)} onPointerUp={hold('left', false)} onPointerLeave={hold('left', false)}>◀</button>
          <button className="hs-btn" onPointerDown={holdDir('right', 1)} onPointerUp={hold('right', false)} onPointerLeave={hold('right', false)}>▶</button>
        </div>
        <div className="hs-actions">
          <button className="hs-btn hs-jump" onPointerDown={hold('jump', true)} onPointerUp={hold('jump', false)} onPointerLeave={hold('jump', false)}>⤴</button>
          <button className="hs-btn hs-kick" onPointerDown={tap('kick')} onPointerUp={hold('kick', false)}>⚽</button>
          <button className={`hs-btn hs-special${hud.L >= 1 ? ' hs-special-ready' : ''}`} onPointerDown={tap('special')} style={{ borderColor: getMove(playerKey).color }}>
            {hud.L >= 1 ? 'POWER' : getMove(playerKey).emoji}
          </button>
        </div>
      </div>
      <OrientationGate />
    </div>
  )
}
