import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { getQuestions } from './questions_rekenen'
import { COUNTRIES, getCountry, generateBracket } from './countries'
import './football.css'

// ── Field constants ───────────────────────────────────────────────
const W = 800, H = 450
const FIELD_W   = 2400
const GROUND_Y  = 370
const GOAL_H    = 130
const GOAL_NET  = 52
const G_TOP     = GROUND_Y - GOAL_H
const FIELD_L   = GOAL_NET
const FIELD_R   = FIELD_W - GOAL_NET
const FIELD_MID = FIELD_W / 2
const PR = 26, BR = 12
const GRAVITY    = 900
const PLAYER_SPD = 270
const JUMP_FORCE = 560
const DRIBBLE_FACTOR = 0.52   // speed multiplier when dribbling
const AI_SPD_BY_DIFF = { 1: 155, 2: 180, 3: 215, 4: 248, 5: 272 }
const GAME_TIME = 120

// Pre-generated crowd dots for the stands (stable across frames)
const CROWD = Array.from({ length: 340 }, (_, i) => ({
  x: (i * 73 + 17) % FIELD_W,
  y: 8 + (i * 31 + 5) % 40,
  c: `hsl(${(i * 137) % 360},55%,58%)`,
}))

// ── Shirt pattern drawing ─────────────────────────────────────────
function isLight(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b > 140
}

function drawShirt(ctx, x, y, country, r = PR) {
  const { c1, c2, pattern } = country
  const d = r * 2
  ctx.save()
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip()

  switch (pattern) {
    case 'vstripes': {
      const sw = d / 3
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 === 0 ? c1 : c2
        ctx.fillRect(x - r + i * sw, y - r, sw, d)
      }
      break
    }
    case 'hstripes':
      ctx.fillStyle = c1; ctx.fillRect(x - r, y - r, d, r)
      ctx.fillStyle = c2; ctx.fillRect(x - r, y, d, r)
      break
    case 'checker': {
      const cs = d / 4
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 4; col++) {
          ctx.fillStyle = (row + col) % 2 === 0 ? c1 : c2
          ctx.fillRect(x - r + col * cs, y - r + row * cs, cs, cs)
        }
      break
    }
    case 'cross':
      ctx.fillStyle = c1; ctx.fillRect(x - r, y - r, d, d)
      ctx.fillStyle = c2
      ctx.fillRect(x - 5, y - r, 10, d)
      ctx.fillRect(x - r, y - 5, d, 10)
      break
    default:
      ctx.fillStyle = c1; ctx.fillRect(x - r, y - r, d, d)
  }
  ctx.restore()
}

// ── Player drawing ────────────────────────────────────────────────
const VR = 28   // visual body radius (bigger than physics PR=20)
const HR = 22   // head radius (nearly as big as body)

function drawPlayer(ctx, x, y, country, dizzy = 0, vx = 0, onGround = true) {
  const now = Date.now()
  const moving = Math.abs(vx) > 10
  const swing  = onGround && moving ? Math.sin(now / 120) * 0.52 : 0

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 5, VR * 1.1, 7, 0, 0, Math.PI * 2); ctx.fill()

  // Feet: touch ground when standing, follow body when jumping
  const airSpread = onGround ? 0 : 0.35
  const lFx   = x + Math.sin(-swing - airSpread) * 12 - 3
  const rFx   = x + Math.sin( swing + airSpread) * 12 + 3
  const footY = onGround ? GROUND_Y - 1 : y + VR * 0.85

  ctx.fillStyle = '#111'
  ctx.beginPath(); ctx.ellipse(lFx, footY, 9, 5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(rFx, footY, 9, 5, 0, 0, Math.PI * 2); ctx.fill()

  // Legs
  const legTopY = y + VR * 0.45
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 7; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x - 4, legTopY); ctx.lineTo(lFx, footY); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 4, legTopY); ctx.lineTo(rFx, footY); ctx.stroke()

  // Arms
  const armSwing = onGround && moving ? -swing * 0.7 : 0
  const armY = y - VR * 0.15
  ctx.strokeStyle = '#F0B07A'; ctx.lineWidth = 6; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x - VR * 0.85, armY)
  ctx.lineTo(x - VR * 0.85 - 12 + Math.sin(armSwing) * 7, armY + 15); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + VR * 0.85, armY)
  ctx.lineTo(x + VR * 0.85 + 12 - Math.sin(armSwing) * 7, armY + 15); ctx.stroke()

  // Body shirt
  drawShirt(ctx, x, y, country, VR)
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(x, y, VR, 0, Math.PI * 2); ctx.stroke()

  // Country abbr
  ctx.fillStyle = isLight(country.c1) ? '#222' : '#fff'
  ctx.font = 'bold 12px Arial'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(country.abbr, x, y + 7)

  // Head — big, overlaps slightly with top of body
  const hy = y - VR - HR * 0.6

  // Skin
  ctx.fillStyle = '#F5C89A'
  ctx.beginPath(); ctx.arc(x, hy, HR, 0, Math.PI * 2); ctx.fill()

  // Hair cap: covers top ~40% of head, clipped to head shape
  ctx.save()
  ctx.beginPath(); ctx.arc(x, hy, HR, 0, Math.PI * 2); ctx.clip()
  ctx.fillStyle = '#5A3825'
  ctx.fillRect(x - HR, hy - HR, HR * 2, HR * 0.8)   // 40% of diameter from top
  ctx.restore()

  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(x, hy, HR, 0, Math.PI * 2); ctx.stroke()

  // ── Face ─────────────────────────────────────────────────────────
  const eyeOX = HR * 0.37
  const eyeOY = hy - HR * 0.1
  const eyeR  = HR * 0.26
  const pupR  = HR * 0.14
  const pupOX = vx > 10 ? pupR * 0.4 : vx < -10 ? -pupR * 0.4 : 0

  if (!dizzy) {
    // White of eyes
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(x - eyeOX, eyeOY, eyeR, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(x + eyeOX, eyeOY, eyeR, 0, Math.PI * 2); ctx.fill()
    // Pupils
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath(); ctx.arc(x - eyeOX + pupOX, eyeOY + pupR * 0.2, pupR, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(x + eyeOX + pupOX, eyeOY + pupR * 0.2, pupR, 0, Math.PI * 2); ctx.fill()
    // Eye shine
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath(); ctx.arc(x - eyeOX + pupOX + pupR * 0.3, eyeOY - pupR * 0.2, pupR * 0.32, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(x + eyeOX + pupOX + pupR * 0.3, eyeOY - pupR * 0.2, pupR * 0.32, 0, Math.PI * 2); ctx.fill()
    // Nose
    ctx.fillStyle = '#C8845A'
    ctx.beginPath(); ctx.arc(x, hy + HR * 0.12, HR * 0.1, 0, Math.PI * 2); ctx.fill()
    // Smile
    ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 2; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.arc(x, hy + HR * 0.22, HR * 0.24, 0.18 * Math.PI, 0.82 * Math.PI); ctx.stroke()
  } else {
    // Dizzy X eyes
    ctx.strokeStyle = '#FF3333'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
    const xSz = eyeR * 0.8
    ;[[-1, 1], [1, 1]].forEach(([sign]) => {
      const ex2 = x + sign * eyeOX
      ctx.beginPath(); ctx.moveTo(ex2 - xSz, eyeOY - xSz); ctx.lineTo(ex2 + xSz, eyeOY + xSz); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(ex2 + xSz, eyeOY - xSz); ctx.lineTo(ex2 - xSz, eyeOY + xSz); ctx.stroke()
    })
    // Wavy mouth
    ctx.beginPath(); ctx.moveTo(x - HR * 0.3, hy + HR * 0.4)
    ctx.quadraticCurveTo(x - HR * 0.1, hy + HR * 0.3, x, hy + HR * 0.45)
    ctx.quadraticCurveTo(x + HR * 0.1, hy + HR * 0.6, x + HR * 0.3, hy + HR * 0.4)
    ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 2; ctx.stroke()

    // Spinning stars
    const t = now / 200
    for (let i = 0; i < 4; i++) {
      const a = t + (i / 4) * Math.PI * 2
      const sx = x + Math.cos(a) * (HR + 12)
      const sy = hy + Math.sin(a) * 10
      ctx.fillStyle = '#FFD23F'
      ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('★', sx, sy)
    }
  }
}

// ── Ball drawing with rotation ────────────────────────────────────
function drawBall(ctx, x, y, angle = 0) {
  const ss = Math.max(0.3, 1 - Math.max(0, GROUND_Y - y - BR) / 250)

  // Shadow
  ctx.fillStyle = `rgba(0,0,0,${0.22 * ss})`
  ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 4, BR * ss, 4 * ss, 0, 0, Math.PI * 2); ctx.fill()

  // Gradient sphere
  const g = ctx.createRadialGradient(x - BR * 0.35, y - BR * 0.35, 1, x, y, BR)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.55, '#eeeeee')
  g.addColorStop(1, '#cccccc')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, BR, 0, Math.PI * 2); ctx.fill()

  // Black soccer patches (clip to ball)
  ctx.save()
  ctx.beginPath(); ctx.arc(x, y, BR, 0, Math.PI * 2); ctx.clip()
  ctx.fillStyle = '#1a1a1a'

  // Center pentagon
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = angle + (i / 5) * Math.PI * 2 - Math.PI / 2
    const r = BR * 0.38
    i === 0 ? ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
            : ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
  }
  ctx.closePath(); ctx.fill()

  // 5 outer patches
  for (let p = 0; p < 5; p++) {
    const pa = angle + (p / 5) * Math.PI * 2
    const cx2 = x + Math.cos(pa) * BR * 0.75
    const cy2 = y + Math.sin(pa) * BR * 0.75
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const a = pa + (i / 5) * Math.PI * 2 - Math.PI / 2
      const r = BR * 0.28
      i === 0 ? ctx.moveTo(cx2 + Math.cos(a) * r, cy2 + Math.sin(a) * r)
              : ctx.lineTo(cx2 + Math.cos(a) * r, cy2 + Math.sin(a) * r)
    }
    ctx.closePath(); ctx.fill()
  }
  ctx.restore()

  // Edge
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.arc(x, y, BR, 0, Math.PI * 2); ctx.stroke()

  // Specular highlight
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath(); ctx.arc(x - BR * 0.32, y - BR * 0.32, BR * 0.22, 0, Math.PI * 2); ctx.fill()
}

// ── Field drawing ─────────────────────────────────────────────────
function drawField(ctx, cam) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
  sky.addColorStop(0, '#0a1a2e'); sky.addColorStop(1, '#1a4060')
  ctx.fillStyle = sky; ctx.fillRect(cam, 0, W, GROUND_Y)

  // ── Stands / crowd ───────────────────────────────────────────────
  ctx.fillStyle = 'rgba(5,10,20,0.72)'
  ctx.fillRect(cam, 0, W, 60)
  CROWD.forEach(c => {
    if (c.x < cam - 4 || c.x > cam + W + 4) return
    ctx.fillStyle = c.c
    ctx.globalAlpha = 0.75
    ctx.beginPath(); ctx.arc(c.x, c.y, 2.8, 0, Math.PI * 2); ctx.fill()
  })
  ctx.globalAlpha = 1
  // Stands shadow blending into field
  const sg = ctx.createLinearGradient(cam, 54, cam, 78)
  sg.addColorStop(0, 'rgba(0,0,0,0.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = sg; ctx.fillRect(cam, 54, W, 24)

  // ── Floodlights ──────────────────────────────────────────────────
  const lightX = [cam + 80, cam + W - 80]
  lightX.forEach(lx => {
    const lg = ctx.createRadialGradient(lx, 62, 2, lx, 62, 90)
    lg.addColorStop(0, 'rgba(255,240,200,0.18)')
    lg.addColorStop(1, 'rgba(255,240,200,0)')
    ctx.fillStyle = lg
    ctx.beginPath(); ctx.arc(lx, 62, 90, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#ffe8b0'
    ctx.beginPath(); ctx.arc(lx, 62, 5, 0, Math.PI * 2); ctx.fill()
  })

  ctx.fillStyle = '#267a32'; ctx.fillRect(cam, GROUND_Y, W, H - GROUND_Y)
  ctx.fillStyle = '#1f6b2a'; ctx.fillRect(cam, GROUND_Y + 14, W, H - GROUND_Y - 14)

  // Scrolling grass stripes
  const sw = 120
  const sx = Math.floor(cam / sw) * sw
  for (let x = sx; x < cam + W; x += sw) {
    ctx.fillStyle = Math.floor(x / sw) % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.025)'
    ctx.fillRect(x, GROUND_Y, sw, H - GROUND_Y)
  }

  // Ground line
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(FIELD_L, GROUND_Y); ctx.lineTo(FIELD_R, GROUND_Y); ctx.stroke()

  // Corner flags
  ;[[FIELD_L, 1], [FIELD_R, -1]].forEach(([fx, dir]) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(fx, GROUND_Y); ctx.lineTo(fx, GROUND_Y - 30); ctx.stroke()
    ctx.fillStyle = '#FF6B35'
    ctx.beginPath(); ctx.moveTo(fx, GROUND_Y - 30)
    ctx.lineTo(fx + dir * 14, GROUND_Y - 21); ctx.lineTo(fx, GROUND_Y - 12); ctx.fill()
  })

  // Halfway line
  ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.beginPath(); ctx.moveTo(FIELD_MID, 6); ctx.lineTo(FIELD_MID, GROUND_Y); ctx.stroke()
  ctx.setLineDash([])

  // Center arc
  ctx.beginPath(); ctx.arc(FIELD_MID, GROUND_Y, 60, Math.PI, 0); ctx.stroke()

  // Penalty boxes
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5
  ctx.strokeRect(FIELD_L, GROUND_Y - 110, 140, 110)
  ctx.strokeRect(FIELD_R - 140, GROUND_Y - 110, 140, 110)

  // Left goal
  ctx.fillStyle = 'rgba(200,220,255,0.07)'
  ctx.fillRect(0, G_TOP, GOAL_NET, GOAL_H)
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1
  for (let y = G_TOP + 22; y < GROUND_Y; y += 22) {
    ctx.beginPath(); ctx.moveTo(2, y); ctx.lineTo(GOAL_NET - 4, y); ctx.stroke()
  }
  for (let x = 16; x < GOAL_NET - 4; x += 16) {
    ctx.beginPath(); ctx.moveTo(x, G_TOP + 2); ctx.lineTo(x, GROUND_Y); ctx.stroke()
  }
  ctx.fillStyle = '#fff'
  ctx.fillRect(GOAL_NET - 5, G_TOP, 5, GOAL_H)
  ctx.fillRect(0, G_TOP - 6, GOAL_NET, 6)

  // Right goal
  ctx.fillStyle = 'rgba(200,220,255,0.07)'
  ctx.fillRect(FIELD_R, G_TOP, GOAL_NET, GOAL_H)
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1
  for (let y = G_TOP + 22; y < GROUND_Y; y += 22) {
    ctx.beginPath(); ctx.moveTo(FIELD_R + 4, y); ctx.lineTo(FIELD_W - 2, y); ctx.stroke()
  }
  for (let x = FIELD_R + 16; x < FIELD_W - 2; x += 16) {
    ctx.beginPath(); ctx.moveTo(x, G_TOP + 2); ctx.lineTo(x, GROUND_Y); ctx.stroke()
  }
  ctx.fillStyle = '#fff'
  ctx.fillRect(FIELD_R, G_TOP, 5, GOAL_H)
  ctx.fillRect(FIELD_R, G_TOP - 6, GOAL_NET, 6)
}

// ── Minimap ───────────────────────────────────────────────────────
function drawMinimap(ctx, pX, aiX, ballX, pC, aiC) {
  const mW = 160, mH = 14, mX = (W - mW) / 2, mY = 6
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(mX, mY, mW, mH)
  ctx.fillStyle = 'rgba(46,122,50,0.6)'
  ctx.fillRect(mX + 2, mY + 2, mW - 4, mH - 4)
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillRect(mX + 2, mY + 2, 4, mH - 4)
  ctx.fillRect(mX + mW - 6, mY + 2, 4, mH - 4)
  ctx.fillRect(mX + mW / 2 - 1, mY + 2, 1, mH - 4)

  const px = mX + 2 + (pX / FIELD_W) * (mW - 4)
  ctx.fillStyle = pC.c1
  ctx.beginPath(); ctx.arc(px, mY + mH / 2, 3.5, 0, Math.PI * 2); ctx.fill()
  const ax = mX + 2 + (aiX / FIELD_W) * (mW - 4)
  ctx.fillStyle = aiC.c1
  ctx.beginPath(); ctx.arc(ax, mY + mH / 2, 3.5, 0, Math.PI * 2); ctx.fill()
  const bx = mX + 2 + (ballX / FIELD_W) * (mW - 4)
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(bx, mY + mH / 2, 3, 0, Math.PI * 2); ctx.fill()
}

// ── Collision physics ─────────────────────────────────────────────
function resolveCollision(obj, ball, restitution = 0.85, objR = PR, ballR = BR) {
  const dx = ball.x - obj.x, dy = ball.y - obj.y
  const d  = Math.sqrt(dx * dx + dy * dy)
  const mn = objR + ballR
  if (d >= mn || d < 0.5) return false
  let nx = dx / d, ny = dy / d

  // If collision would push ball downward while it's near the ground,
  // redirect to horizontal only so ball can't get trapped underneath a player.
  if (ny > 0.1 && ball.y + ballR > GROUND_Y - 10) {
    nx = dx !== 0 ? Math.sign(dx) : (obj.x < FIELD_MID ? -1 : 1)
    ny = 0
  }

  ball.x += nx * (mn - d + 0.5)
  ball.y += ny * (mn - d + 0.5)
  const vRN = (ball.vx - obj.vx) * nx + (ball.vy - obj.vy) * ny
  if (vRN < 0) {
    const imp = -(1 + restitution) * vRN
    ball.vx += imp * nx
    ball.vy += imp * ny
  }
  return true
}

// Head center relative to physics y
const headOffY = () => VR + HR * 0.6

// Full character collision: body circle + head circle
function resolveCharacterCollision(player, ball, restitution = 0.85) {
  const bodyHit = resolveCollision(player, ball, restitution)
  const head    = { x: player.x, y: player.y - headOffY(), vx: player.vx, vy: player.vy }
  const headHit = resolveCollision(head, ball, restitution, HR, BR)
  return bodyHit || headHit
}

function charContactDist(player, ball) {
  const bodyD = Math.sqrt((player.x - ball.x) ** 2 + (player.y              - ball.y) ** 2)
  const headD = Math.sqrt((player.x - ball.x) ** 2 + (player.y - headOffY() - ball.y) ** 2)
  return Math.min(bodyD - PR, headD - HR)
}

// ── Game state ────────────────────────────────────────────────────
const newState = () => ({
  player: { x: FIELD_MID - 280, y: GROUND_Y - PR, vx: 0, vy: 0, onGround: true, facingRight: true,  dizzy: 0, stompImmunity: 0 },
  ai:     { x: FIELD_MID + 280, y: GROUND_Y - PR, vx: 0, vy: 0, onGround: true, facingRight: false, dizzy: 0, stompImmunity: 0 },
  ball:   { x: FIELD_MID, y: GROUND_Y - BR, vx: 0, vy: 0, angle: 0 },
  trail:  [],
  particles: [],
  score:  { p: 0, ai: 0 },
  time:   GAME_TIME,
  camera: FIELD_MID - W / 2,
  subPhase: 'playing',
  goalTimer: 0,
  goalKickTimer: 0,
  goalKickTeam: null,   // 'player' | 'ai'
  lastTs: null,
  running: false,
})

// ── Jersey preview (React component for UI) ───────────────────────
function JerseyCircle({ country, size = 32 }) {
  let bg
  const { c1, c2, pattern } = country
  switch (pattern) {
    case 'vstripes':
      bg = `repeating-linear-gradient(90deg,${c1} 0%,${c1} 33%,${c2} 33%,${c2} 66%,${c1} 66%,${c1} 100%)`; break
    case 'hstripes':
      bg = `linear-gradient(180deg,${c1} 50%,${c2} 50%)`; break
    case 'checker':
      bg = `repeating-conic-gradient(${c1} 0% 25%,${c2} 0% 50%) 0 0/${size/2}px ${size/2}px`; break
    case 'cross':
      bg = c1; break  // simplified
    default:
      bg = c1
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, border: '2px solid rgba(255,255,255,0.25)', flexShrink: 0 }} />
  )
}

// ── Main component ────────────────────────────────────────────────
export default function FootballGame({ year, onBack, addCuruntie, noQuiz = false, twoPlayer = false }) {
  const [phase,       setPhase]      = useState('country_select')
  const [bracket,     setBracket]    = useState(null)
  const [difficulty,  setDifficulty] = useState(null)
  const [questions,   setQuestions]  = useState([])
  const [qIndex,      setQIndex]     = useState(0)
  const [input,       setInput]      = useState('')
  const [feedback,    setFeedback]   = useState(null)
  const [score,       setScore]      = useState({ p: 0, ai: 0 })
  const [timeLeft,    setTimeLeft]   = useState(GAME_TIME)
  const [goalInfo,    setGoalInfo]   = useState(null) // { isPlayer: bool }
  const [earnedCoins, setEarnedCoins] = useState(0)

  // Deterministic confetti pieces – recomputed each time goalInfo changes
  const confetti = useMemo(() => {
    if (!goalInfo) return []
    return Array.from({ length: 44 }, (_, i) => ({
      left:  (i * 7.3 + 11) % 100,
      delay: (i * 0.065) % 0.75,
      dur:   1.6 + (i % 5) * 0.28,
      size:  6 + (i % 4) * 2.5,
      color: ['#FFD23F','#FF6B6B','#4FC3F7','#06D6A0','#CE93D8','#fff','#FF8C00'][i % 7],
      round: i % 3 !== 0,
      rot:   (i * 53) % 360,
    }))
  }, [goalInfo])

  const canvasRef = useRef(null)
  const gameRef   = useRef(null)
  const rafRef    = useRef(null)
  const keysRef   = useRef({})
  const inputRef  = useRef(null)

  useEffect(() => {
    const dn = e => { keysRef.current[e.code] = true;  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault() }
    const up = e => { keysRef.current[e.code] = false }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup',   up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  const currentOpponent = bracket ? getCountry(twoPlayer ? bracket.p2Key : bracket.opponents[bracket.currentRound]) : null
  const playerCountry   = bracket ? getCountry(bracket.playerKey) : null
  const aiSpeed = currentOpponent ? (AI_SPD_BY_DIFF[currentOpponent.diff] || 210) : 210

  // ── Country selection ──────────────────────────────────────────
  const pickCountry = key => {
    if (twoPlayer) {
      setBracket({ playerKey: key, p2Key: null, currentRound: 0, roundNames: ['Potje'], opponents: [], results: [] })
      setPhase('pick_p2_country')
    } else {
      setBracket(generateBracket(key))
      setPhase('match_preview')
    }
  }

  const pickP2Country = key => {
    setBracket(b => ({ ...b, p2Key: key }))
    setPhase('match_preview')
  }

  // ── Match preview → difficulty → quiz ─────────────────────────
  const pickDifficulty = d => {
    setDifficulty(d)
    setQuestions(getQuestions(d, 3))
    setQIndex(0); setInput(''); setFeedback(null); setEarnedCoins(0)
    setPhase('quiz')
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  // ── Quiz answer ────────────────────────────────────────────────
  const checkAnswer = useCallback(() => {
    const q = questions[qIndex]; if (!q) return
    const val = parseFloat(input.replace(',', '.'))
    if (isNaN(val)) { setFeedback('err'); return }
    if (Math.abs(val - q.a) <= 0.5) {
      const coins = difficulty === 'moeilijk' ? 20 : difficulty === 'gemiddeld' ? 15 : 10
      addCuruntie(coins); setEarnedCoins(p => p + coins); setFeedback('ok')
      setTimeout(() => {
        setFeedback(null); setInput('')
        if (qIndex + 1 >= questions.length) setPhase('game')
        else { setQIndex(p => p + 1); setTimeout(() => inputRef.current?.focus(), 60) }
      }, 700)
    } else {
      setFeedback('err')
      setTimeout(() => { setFeedback(null); inputRef.current?.focus() }, 1200)
    }
  }, [questions, qIndex, input, difficulty, addCuruntie])

  // ── Game loop ──────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    const state = newState()
    state.running = true
    gameRef.current = state
    const aiSpd = aiSpeed

    const tick = ts => {
      if (!state.running) return
      const raw = ts - (state.lastTs || ts)
      const dt  = Math.min(raw / 1000, 0.05)
      state.lastTs = ts

      if (state.subPhase === 'goal') {
        state.goalTimer -= dt
        if (state.goalTimer <= 0) {
          Object.assign(state.player, { x: FIELD_MID - 280, y: GROUND_Y - PR, vx: 0, vy: 0, onGround: true })
          Object.assign(state.ai,     { x: FIELD_MID + 280, y: GROUND_Y - PR, vx: 0, vy: 0, onGround: true })
          Object.assign(state.ball,   { x: FIELD_MID,       y: GROUND_Y - BR, vx: 0, vy: 0 })
          state.subPhase = 'playing'
          state.trail = []
          setGoalInfo(null)
        }
      } else if (state.subPhase === 'goal_kick') {
        state.goalKickTimer -= dt
        if (state.goalKickTimer <= 0) {
          // Penalty area edges: left = FIELD_L+140, right = FIELD_R-140
          if (state.goalKickTeam === 'player') {
            Object.assign(state.ball,   { x: FIELD_L + 140, y: GROUND_Y - BR, vx: 0, vy: 0 })
            Object.assign(state.player, { x: FIELD_L + 110, y: GROUND_Y - PR, vx: 0, vy: 0, onGround: true, facingRight: true })
            Object.assign(state.ai,     { x: FIELD_MID,     y: GROUND_Y - PR, vx: 0, vy: 0, onGround: true, facingRight: false })
          } else {
            Object.assign(state.ball,   { x: FIELD_R - 140, y: GROUND_Y - BR, vx: 0, vy: 0 })
            Object.assign(state.ai,     { x: FIELD_R - 110, y: GROUND_Y - PR, vx: 0, vy: 0, onGround: true, facingRight: false })
            Object.assign(state.player, { x: FIELD_MID,     y: GROUND_Y - PR, vx: 0, vy: 0, onGround: true, facingRight: true })
          }
          state.trail = []
          state.subPhase = 'playing'
          state.goalKickTeam = null
        }
      } else {
        const k = keysRef.current

        // ── Player input ──
        let pvx = 0
        if (k.ArrowLeft)  { pvx -= PLAYER_SPD; state.player.facingRight = false }
        if (k.ArrowRight) { pvx += PLAYER_SPD; state.player.facingRight = true  }

        // Dribbling = ball very close → slow down
        const dribbling = charContactDist(state.player, state.ball) < BR + 18
        if (dribbling && pvx !== 0) pvx *= DRIBBLE_FACTOR

        state.player.vx = pvx
        if (k.ArrowUp && state.player.onGround) {
          state.player.vy = -JUMP_FORCE; state.player.onGround = false
        }

        // Update timers
        state.player.dizzy         = Math.max(0, (state.player.dizzy         || 0) - dt)
        state.player.stompImmunity = Math.max(0, (state.player.stompImmunity || 0) - dt)
        state.ai.dizzy             = Math.max(0, (state.ai.dizzy             || 0) - dt)
        state.ai.stompImmunity     = Math.max(0, (state.ai.stompImmunity     || 0) - dt)

        state.player.vy += GRAVITY * dt
        state.player.x  += pvx * dt
        state.player.y  += state.player.vy * dt
        if (state.player.y + PR >= GROUND_Y) { state.player.y = GROUND_Y - PR; state.player.vy = 0; state.player.onGround = true }
        if (state.player.y - PR < 0)          { state.player.y = PR;            state.player.vy = 0 }
        state.player.x = Math.max(FIELD_L + PR, Math.min(FIELD_R - PR, state.player.x))

        // ── Stomp: P1 onto P2 ──
        const dxStomp = Math.abs(state.player.x - state.ai.x)
        if (state.player.vy > 120 && dxStomp < PR + 10 &&
            state.player.y + PR >= state.ai.y - PR - 14 && state.player.y < state.ai.y &&
            state.ai.stompImmunity <= 0) {
          state.ai.dizzy = 0.65; state.ai.stompImmunity = 1.0
          state.player.vy = -360; state.player.y = state.ai.y - PR * 2 - 10
        }

        // ── P2 (AI or WASD) ──
        let avx = 0
        if (twoPlayer) {
          if (!state.ai.dizzy) {
            if (k.KeyA) { avx -= PLAYER_SPD; state.ai.facingRight = false }
            if (k.KeyD) { avx += PLAYER_SPD; state.ai.facingRight = true  }
            const dribblingP2 = charContactDist(state.ai, state.ball) < BR + 18
            if (dribblingP2 && avx !== 0) avx *= DRIBBLE_FACTOR
          }
          if (k.KeyW && state.ai.onGround && !state.ai.dizzy) {
            state.ai.vy = -JUMP_FORCE; state.ai.onGround = false
          }
          // Stomp: P2 onto P1
          if (state.ai.vy > 120 && dxStomp < PR + 10 &&
              state.ai.y + PR >= state.player.y - PR - 14 && state.ai.y < state.player.y &&
              state.player.stompImmunity <= 0) {
            state.player.dizzy = 0.65; state.player.stompImmunity = 1.0
            state.ai.vy = -360; state.ai.y = state.player.y - PR * 2 - 10
          }
        } else {
          // AI logic
          const dtP = 0.4
          const predBX = Math.max(FIELD_L + BR, Math.min(FIELD_R - BR, state.ball.x + state.ball.vx * dtP))
          const tBx    = predBX - state.ai.x
          const aiHasBall = charContactDist(state.ai, state.ball) < BR + 18
          if (!state.ai.dizzy) {
            avx = aiHasBall ? -aiSpd * 0.65 : (Math.abs(tBx) > 12 ? Math.sign(tBx) * aiSpd : 0)
          }
          state.ai.jumpCd = Math.max(0, (state.ai.jumpCd || 0) - dt)
          const aiToBall = Math.sqrt((state.ai.x - state.ball.x) ** 2 + (state.ai.y - state.ball.y) ** 2)
          if (state.ai.onGround && !state.ai.dizzy && state.ai.jumpCd <= 0 &&
              aiToBall < 230 && state.ball.y < state.ai.y - 25) {
            state.ai.vy = -JUMP_FORCE * 0.93; state.ai.onGround = false; state.ai.jumpCd = 0.8
          }
        }
        state.ai.vx = avx
        state.ai.vy += GRAVITY * dt
        state.ai.x  += avx * dt
        state.ai.y  += state.ai.vy * dt
        if (state.ai.y + PR >= GROUND_Y) { state.ai.y = GROUND_Y - PR; state.ai.vy = 0; state.ai.onGround = true }
        if (state.ai.y - PR < 0)          { state.ai.y = PR;            state.ai.vy = 0 }
        state.ai.x = Math.max(FIELD_L + PR, Math.min(FIELD_R - PR, state.ai.x))

        // ── Player/AI separation ──
        const sep = Math.sqrt((state.player.x - state.ai.x) ** 2 + (state.player.y - state.ai.y) ** 2)
        if (sep < PR * 2 && sep > 0.1) {
          const nx = (state.player.x - state.ai.x) / sep, ny = (state.player.y - state.ai.y) / sep
          const push = (PR * 2 - sep) / 2
          state.player.x += nx * push; state.ai.x -= nx * push
        }

        // ── Ball physics ──
        state.ball.vy    += GRAVITY * dt
        state.ball.x     += state.ball.vx * dt
        state.ball.y     += state.ball.vy * dt
        state.ball.vx    *= 0.999
        state.ball.angle += state.ball.vx * dt / BR

        // Trail
        state.trail.push({ x: state.ball.x, y: state.ball.y })
        if (state.trail.length > 9) state.trail.shift()

        if (state.ball.y + BR >= GROUND_Y) {
          state.ball.y = GROUND_Y - BR
          const pDrib = charContactDist(state.player, state.ball) < BR + 18
          const aDrib = charContactDist(state.ai,     state.ball) < BR + 18
          if ((pDrib || aDrib) && state.ball.vy >= 0) {
            state.ball.vy = -400   // dribble bounce: just above head height
          } else if (state.ball.vy > 50) {
            state.ball.vy *= -0.72; state.ball.vx *= 0.88
          } else {
            state.ball.vy = 0; state.ball.vx *= 0.93
          }
        }
        if (state.ball.y - BR < 0) { state.ball.y = BR; state.ball.vy *= -0.5 }

        // ── Collisions ──
        const pCont = charContactDist(state.player, state.ball) < BR + 3
        const aCont = charContactDist(state.ai,     state.ball) < BR + 3

        resolveCharacterCollision(state.player, state.ball)
        resolveCharacterCollision(state.ai, state.ball)

        // Contested → pop upward
        if (pCont && aCont) {
          state.ball.vy = Math.min(state.ball.vy, -560)
          state.ball.vx *= 0.12
        }

        // ── Goals ──
        const spawnParticles = (colors) => {
          const bx = state.ball.x, by = state.ball.y
          for (let i = 0; i < 28; i++) {
            const a = Math.random() * Math.PI * 2
            const spd = 120 + Math.random() * 320
            state.particles.push({
              x: bx, y: by,
              vx: Math.cos(a) * spd,
              vy: Math.sin(a) * spd - 180,
              life: 1.4 + Math.random() * 0.6,
              maxLife: 2.0,
              color: colors[Math.floor(Math.random() * colors.length)],
              size: 3 + Math.random() * 5,
            })
          }
        }

        if (state.ball.x - BR < FIELD_L) {
          if (state.ball.y >= G_TOP) {
            state.score.ai++; state.subPhase = 'goal'; state.goalTimer = 2
            spawnParticles([currentOpponent.c1, currentOpponent.c2 || '#fff', '#FF6B6B'])
            setScore({ ...state.score }); setGoalInfo({ isPlayer: false })
          } else {
            // Ball over left end line (not goal) → player gets goal kick
            state.ball.vx = 0; state.ball.vy = 0; state.ball.x = FIELD_L + BR
            state.subPhase = 'goal_kick'; state.goalKickTimer = 1.8; state.goalKickTeam = 'player'
          }
        }
        if (state.ball.x + BR > FIELD_R) {
          if (state.ball.y >= G_TOP) {
            state.score.p++; state.subPhase = 'goal'; state.goalTimer = 2
            spawnParticles([playerCountry.c1, playerCountry.c2 || '#fff', '#FFD23F', '#06D6A0'])
            setScore({ ...state.score }); setGoalInfo({ isPlayer: true })
          } else {
            // Ball over right end line (not goal) → AI gets goal kick
            state.ball.vx = 0; state.ball.vy = 0; state.ball.x = FIELD_R - BR
            state.subPhase = 'goal_kick'; state.goalKickTimer = 1.8; state.goalKickTeam = 'ai'
          }
        }

        // ── Particles ──
        state.particles = state.particles.filter(p => {
          p.x  += p.vx * dt
          p.y  += p.vy * dt
          p.vy += 500 * dt
          p.life -= dt
          return p.life > 0
        })

        // ── Timer ──
        state.time -= dt
        if (state.time <= 0) {
          state.time = 0; state.running = false
          setTimeLeft(0); setScore({ ...state.score }); setPhase('match_end'); return
        }
        setTimeLeft(Math.ceil(state.time))
      }

      // ── Smooth camera ──
      const targetCam = Math.max(0, Math.min(FIELD_W - W, state.ball.x - W / 2))
      state.camera += (targetCam - state.camera) * Math.min(1, dt * 10)
      const cam = Math.round(state.camera)

      // ── Draw ──
      ctx.save(); ctx.translate(-cam, 0)
      drawField(ctx, cam)
      drawPlayer(ctx, state.player.x, state.player.y, playerCountry, state.player.dizzy, state.player.vx, state.player.onGround)
      drawPlayer(ctx, state.ai.x,     state.ai.y,     currentOpponent, state.ai.dizzy,   state.ai.vx,     state.ai.onGround)

      // Ball trail
      const spd = Math.sqrt(state.ball.vx ** 2 + state.ball.vy ** 2)
      if (spd > 80) {
        state.trail.forEach((pt, i) => {
          const t = (i + 1) / state.trail.length
          ctx.globalAlpha = t * 0.28
          ctx.fillStyle = spd > 400 ? '#FFD23F' : '#fff'
          ctx.beginPath(); ctx.arc(pt.x, pt.y, BR * (0.25 + t * 0.55), 0, Math.PI * 2); ctx.fill()
        })
        ctx.globalAlpha = 1
      }

      drawBall(ctx,   state.ball.x,   state.ball.y, state.ball.angle)

      // Particles
      state.particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
        ctx.fillStyle = p.color
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
      })
      ctx.globalAlpha = 1

      ctx.restore()

      if (state.subPhase === 'goal_kick') {
        const kickTeam = state.goalKickTeam === 'player' ? playerCountry : currentOpponent
        ctx.fillStyle = 'rgba(0,0,0,0.42)'
        ctx.fillRect(0, H / 2 - 54, W, 108)
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = '#FFD23F'; ctx.font = 'bold 40px Nunito, Arial'
        ctx.fillText('⚽ DOELTRAP', W / 2, H / 2 - 14)
        ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '700 20px Nunito, Arial'
        ctx.fillText(`${kickTeam.flag}  ${kickTeam.name} krijgt de bal`, W / 2, H / 2 + 22)
      }

      drawMinimap(ctx, state.player.x, state.ai.x, state.ball.x, playerCountry, currentOpponent)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [aiSpeed, playerCountry, currentOpponent, twoPlayer])

  useEffect(() => {
    if (phase === 'game') startGame()
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (gameRef.current) gameRef.current.running = false
    }
  }, [phase, startGame])

  const restart = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (gameRef.current) gameRef.current.running = false
    setScore({ p: 0, ai: 0 }); setTimeLeft(GAME_TIME); setGoalInfo(null); setEarnedCoins(0)
    if (noQuiz) {
      setPhase('match_preview')
    } else {
      setQuestions(getQuestions(difficulty, 3)); setQIndex(0); setInput(''); setFeedback(null)
      setPhase('quiz')
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }

  const advanceRound = won => {
    const newResults = [...bracket.results, won ? 'win' : 'lose']
    if (!won || bracket.currentRound >= 3) {
      setBracket(b => ({ ...b, results: newResults }))
      setPhase(won && bracket.currentRound >= 3 ? 'wk_won' : 'wk_lost')
      return
    }
    const nextRound = bracket.currentRound + 1
    setBracket(b => ({ ...b, currentRound: nextRound, results: newResults }))
    setScore({ p: 0, ai: 0 }); setTimeLeft(GAME_TIME); setGoalInfo(null); setEarnedCoins(0)
    setPhase('match_preview')
  }

  // ── Renders ───────────────────────────────────────────────────────

  // Country selection
  if (phase === 'pick_p2_country') return (
    <div className="fb-screen">
      <button className="back-btn" onClick={() => setPhase('country_select')}>← Terug</button>
      <div className="wk-header">
        <span className="wk-trophy">🎮</span>
        <h1 className="wk-title" style={{ color: '#4FC3F7' }}>Speler 2</h1>
        <p className="wk-sub">WASD — kies jouw land</p>
      </div>
      <div className="wk-country-grid">
        {COUNTRIES.filter(c => c.key !== bracket?.playerKey).map(c => (
          <button key={c.key} className="wk-country-card" onClick={() => pickP2Country(c.key)}>
            <span className="wk-country-flag">{c.flag}</span>
            <JerseyCircle country={c} size={30} />
            <span className="wk-country-name">{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  )

  if (phase === 'country_select') return (
    <div className="fb-screen">
      <button className="back-btn" onClick={onBack}>← Terug</button>
      <div className="wk-header">
        <span className="wk-trophy">{twoPlayer ? '🎮' : '🏆'}</span>
        <h1 className="wk-title">{twoPlayer ? '2 Spelers' : 'WK 2026'}</h1>
        <p className="wk-sub">{twoPlayer ? 'Pijltjes — kies jouw land (P1)' : 'Kies jouw land'}</p>
      </div>
      <div className="wk-country-grid">
        {COUNTRIES.map(c => (
          <button key={c.key} className="wk-country-card" onClick={() => pickCountry(c.key)}>
            <span className="wk-country-flag">{c.flag}</span>
            <JerseyCircle country={c} size={30} />
            <span className="wk-country-name">{c.name}</span>
            <span className="wk-country-stars">{'⭐'.repeat(c.diff)}</span>
          </button>
        ))}
      </div>
    </div>
  )

  // Match preview
  if (phase === 'match_preview' && bracket) {
    const opp = currentOpponent
    const pl  = playerCountry
    const rnd = bracket.roundNames[bracket.currentRound]
    return (
      <div className="fb-screen">
        <button className="back-btn" onClick={() => setPhase('country_select')}>← Terug</button>
        <div className="wk-preview">
          <div className="wk-round-badge">{rnd}</div>
          <div className="wk-vs-row">
            <div className="wk-vs-team">
              <JerseyCircle country={pl} size={72} />
              <span className="wk-vs-flag">{pl.flag}</span>
              <span className="wk-vs-name">{pl.name}</span>
            </div>
            <div className="wk-vs-mid">VS</div>
            <div className="wk-vs-team">
              <JerseyCircle country={opp} size={72} />
              <span className="wk-vs-flag">{opp.flag}</span>
              <span className="wk-vs-name">{opp.name}</span>
            </div>
          </div>
          <div className="wk-diff-row">
            <p className="wk-diff-label">Tegenstander: {'⭐'.repeat(opp.diff)}</p>
          </div>
          {noQuiz ? (
            <button className="fb-quiz-submit" style={{ marginTop: 8, maxWidth: 240 }} onClick={() => setPhase('game')}>
              ▶ Spelen!
            </button>
          ) : (
            <>
            <p className="wk-preview-sub">Kies je quizmoeilijkheid</p>
            <div className="fb-diff-grid" style={{ maxWidth: 360 }}>
            {[
              { key: 'makkelijk', icon: '🟢', name: 'Makkelijk', desc: 'Eind groep 6', cls: 'fb-diff-easy' },
              { key: 'gemiddeld',  icon: '🟡', name: 'Gemiddeld',  desc: 'Eind groep 7', cls: 'fb-diff-med'  },
              { key: 'moeilijk',   icon: '🔴', name: 'Moeilijk',   desc: 'Midden groep 8', cls: 'fb-diff-hard' },
            ].map(d => (
              <button key={d.key} className={`fb-diff-btn ${d.cls}`} onClick={() => pickDifficulty(d.key)}>
                <span className="fb-diff-icon">{d.icon}</span>
                <span className="fb-diff-info">
                  <span className="fb-diff-name">{d.name}</span>
                  <span className="fb-diff-desc">{d.desc}</span>
                </span>
              </button>
            ))}
          </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Quiz
  if (phase === 'quiz') {
    const q = questions[qIndex]
    const opp = currentOpponent
    return (
      <div className="fb-screen">
        <button className="back-btn" onClick={() => setPhase('match_preview')}>← Terug</button>
        <div className="fb-quiz-wrap">
          <div className="fb-quiz-header">
            <span>Los 3 sommen op om te mogen spelen!</span>
            <div className="fb-quiz-progress">
              {questions.map((_, i) => (
                <div key={i} className={`fb-quiz-dot ${i < qIndex ? 'fb-quiz-dot-done' : i === qIndex ? 'fb-quiz-dot-cur' : ''}`} />
              ))}
            </div>
          </div>
          {q && (
            <div className="fb-quiz-card">
              <p className="fb-quiz-q">{q.q}</p>
              <div className="fb-quiz-input-row">
                <input
                  ref={inputRef}
                  className={`fb-quiz-input ${feedback === 'ok' ? 'fb-quiz-input-ok' : feedback === 'err' ? 'fb-quiz-input-err' : ''}`}
                  type="text" inputMode="decimal" value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !feedback && checkAnswer()}
                  placeholder="Jouw antwoord..." disabled={!!feedback}
                />
                {q.unit && <span className="fb-quiz-unit">{q.unit}</span>}
              </div>
              {feedback === 'ok'  && <p className="fb-quiz-feedback fb-quiz-feedback-ok">✓ Goed! +{difficulty === 'moeilijk' ? 20 : difficulty === 'gemiddeld' ? 15 : 10} 🪙</p>}
              {feedback === 'err' && <p className="fb-quiz-feedback fb-quiz-feedback-err">✗ Probeer het nog eens!</p>}
              {!feedback && <button className="fb-quiz-submit" onClick={checkAnswer}>Controleer →</button>}
              <p className="fb-quiz-hint">Tip: antwoord in {q.unit}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Game
  if (phase === 'game') {
    const mins   = Math.floor(timeLeft / 60)
    const secs   = String(timeLeft % 60).padStart(2, '0')
    const urgent = timeLeft <= 20
    const pl = playerCountry, opp = currentOpponent
    const leaveGame = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (gameRef.current) gameRef.current.running = false
      setGoalInfo(null)
      setPhase('match_preview')
    }
    return (
      <div className="fb-screen" style={{ gap: 0, paddingTop: 56 }}>
        <button className="back-btn" style={{ position:'absolute', top:14, left:14, zIndex:50 }} onClick={leaveGame}>← Terug</button>
        <div className="fb-hud">
          <div style={{ display:'flex', alignItems:'center', gap:10, background:`${pl.c1}1a`, padding:'7px 16px', borderRadius:14, border:`1.5px solid ${pl.c1}50` }}>
            <span style={{ fontSize:'1.4rem', lineHeight:1 }}>{pl.flag}</span>
            <span style={{ fontSize:'0.75rem', fontWeight:900, color:pl.c1, opacity:0.85, letterSpacing:'0.06em' }}>{pl.abbr}</span>
            <span style={{ fontSize:'2.4rem', fontWeight:900, lineHeight:1, color:pl.c1 }}>{score.p}</span>
          </div>
          <div className={`fb-timer${urgent ? ' fb-timer-urgent' : ''}`}>{mins}:{secs}</div>
          <div style={{ display:'flex', alignItems:'center', gap:10, background:`${opp.c1}1a`, padding:'7px 16px', borderRadius:14, border:`1.5px solid ${opp.c1}50` }}>
            <span style={{ fontSize:'2.4rem', fontWeight:900, lineHeight:1, color:opp.c1 }}>{score.ai}</span>
            <span style={{ fontSize:'0.75rem', fontWeight:900, color:opp.c1, opacity:0.85, letterSpacing:'0.06em' }}>{opp.abbr}</span>
            <span style={{ fontSize:'1.4rem', lineHeight:1 }}>{opp.flag}</span>
          </div>
        </div>
        <div className="fb-canvas-wrap">
          <canvas ref={canvasRef} className="fb-canvas" width={W} height={H} />
        </div>
        {goalInfo && (
          <div className="fb-goal-overlay" style={{
            background: goalInfo.isPlayer
              ? 'radial-gradient(ellipse at center, rgba(255,210,63,0.28) 0%, rgba(0,0,0,0.9) 65%)'
              : 'radial-gradient(ellipse at center, rgba(255,107,107,0.28) 0%, rgba(0,0,0,0.9) 65%)',
          }}>
            {confetti.map((c, i) => (
              <div key={i} className="fb-confetti-piece" style={{
                left: `${c.left}%`, width: c.size, height: c.size,
                background: c.color, borderRadius: c.round ? '50%' : '3px',
                animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s`,
                transform: `rotate(${c.rot}deg)`,
              }} />
            ))}
            <span className="fb-goal-flag" style={{ animationName: 'goalFlagIn' }}>
              {goalInfo.isPlayer ? pl.flag : opp.flag}
            </span>
            <div className="fb-goal-word" style={{ color: goalInfo.isPlayer ? '#FFD23F' : '#FF6B6B', textShadow: `0 0 60px ${goalInfo.isPlayer ? '#FFD23F' : '#FF6B6B'}88` }}>
              {goalInfo.isPlayer ? 'DOELPUNT!' : 'TEGENDOEL!'}
            </div>
            <div className="fb-goal-team">
              {goalInfo.isPlayer ? pl.name : opp.name}
            </div>
            <div className="fb-goal-scoreline">
              <span style={{ fontSize:'3.5rem' }}>{pl.flag}</span>
              <div className="fb-goal-score-box">
                <span style={{ color:'#4FC3F7' }}>{score.p}</span>
                <span style={{ color:'rgba(255,255,255,0.25)' }}>—</span>
                <span style={{ color:'#FF6B6B' }}>{score.ai}</span>
              </div>
              <span style={{ fontSize:'3.5rem' }}>{opp.flag}</span>
            </div>
          </div>
        )}
        <p className="fb-controls-hint">
          {twoPlayer
            ? 'P1: ← → lopen · ↑ springen   |   P2: A D lopen · W springen   |   Stamp op hoofd = duizelig'
            : '← → lopen · ↑ springen · Dribble = trager · Stamp op hoofd = duizelig'}
        </p>
      </div>
    )
  }

  // Match end
  if (phase === 'match_end' && bracket) {
    const won  = score.p > score.ai
    const draw = score.p === score.ai
    const pl   = playerCountry
    const opp  = currentOpponent
    const rnd  = bracket.roundNames[bracket.currentRound]
    const next = bracket.currentRound < 3 ? bracket.roundNames[bracket.currentRound + 1] : null
    return (
      <div className="fb-screen">
        <div className="fb-end-card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '2rem' }}>{pl.flag}</span>
            <span className="fb-end-score" style={{ fontSize: '1.8rem', color: '#fff' }}>{score.p} – {score.ai}</span>
            <span style={{ fontSize: '2rem' }}>{opp.flag}</span>
          </div>
          <span className="fb-end-icon">{won ? '🏆' : draw ? '🤝' : '😢'}</span>
          <h2 className="fb-end-title" style={{ color: won ? '#FFD23F' : draw ? '#4FC3F7' : '#FF6B6B' }}>
            {won ? `${rnd} gewonnen!` : draw ? 'Gelijkspel — strafschoppen...' : 'Uitgeschakeld'}
          </h2>
          {draw && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Bij gelijkspel win jij de strafschoppen 🎲</p>}
          {earnedCoins > 0 && (
            <div className="fb-end-coins"><span>🪙</span><span>+{earnedCoins} curuntie verdiend!</span></div>
          )}
          <div className="fb-end-btns">
            {(won || draw) && next && (
              <button className="fb-end-btn fb-end-btn-again" style={{ background: '#FFD23F' }} onClick={() => advanceRound(true)}>
                → Naar de {next}
              </button>
            )}
            {(won || draw) && !next && (
              <button className="fb-end-btn fb-end-btn-again" onClick={() => advanceRound(true)}>
                🏆 Claim de WK titel!
              </button>
            )}
            {!won && !draw && (
              <>
                <button className="fb-end-btn fb-end-btn-again" onClick={restart}>🔄 Wedstrijd herspelen</button>
                <button className="fb-end-btn fb-end-btn-back" onClick={() => { setBracket(null); setPhase('country_select') }}>← Nieuw toernooi</button>
              </>
            )}
            {(won || draw) && (
              <button className="fb-end-btn fb-end-btn-back" onClick={onBack}>← Terug naar menu</button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // WK Won!
  if (phase === 'wk_won') return (
    <div className="fb-screen">
      <div className="wk-champion-card">
        <div className="wk-champ-trophy">🏆</div>
        <h1 className="wk-champ-title">WERELDKAMPIOEN!</h1>
        <div className="wk-champ-flag">{playerCountry?.flag}</div>
        <p className="wk-champ-sub">{playerCountry?.name} heeft het WK 2026 gewonnen!</p>
        <button className="fb-end-btn fb-end-btn-again" style={{ marginTop: 16 }} onClick={() => { setBracket(null); setPhase('country_select') }}>
          🔄 Nieuw toernooi
        </button>
        <button className="fb-end-btn fb-end-btn-back" onClick={onBack}>← Terug naar menu</button>
      </div>
    </div>
  )

  // WK Lost
  if (phase === 'wk_lost') return (
    <div className="fb-screen">
      <div className="fb-end-card">
        <span className="fb-end-icon">😢</span>
        <h2 className="fb-end-title" style={{ color: '#FF6B6B' }}>Uitgeschakeld</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Je bent uitgeschakeld in de {bracket?.roundNames[bracket?.currentRound]}.</p>
        <div className="fb-end-btns">
          <button className="fb-end-btn fb-end-btn-again" onClick={restart}>🔄 Wedstrijd herspelen</button>
          <button className="fb-end-btn fb-end-btn-back" onClick={() => { setBracket(null); setPhase('country_select') }}>← Nieuw toernooi</button>
        </div>
      </div>
    </div>
  )

  return null
}
