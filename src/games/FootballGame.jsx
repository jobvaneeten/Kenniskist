import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { getQuestions } from './questions_rekenen'
import { COUNTRIES, getCountry, generateBracket, DEFAULT_UNLOCKED } from './countries'
import OrientationGate from '../OrientationGate'
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
const GAME_TIME_NORMAL   = 60
const GAME_TIME_TWOPLAYER = 60

// ── Stadion-indeling (van boven naar beneden) ─────────────────────
// De bal kan tot bovenin het beeld vliegen, dus de bovenste helft blijft
// rustige nachtlucht; de tribune is een smalle band vlak achter het veld.
const SKY_H     = 196          // nachtlucht met sterren, boven het dak uit
const ROOF_Y    = 196          // dak van de tribune
const STAND_Y   = 222          // begin van de vakken met publiek
const BOARD_Y   = 332          // LED-reclameborden voor de tribune
// (GROUND_Y = 370 = grasmat)

// Sterren: vast patroon dat met een lichte parallax meeschuift.
const STARS = Array.from({ length: 90 }, (_, i) => ({
  x: (i * 137 + 23) % (W + 60),
  y: (i * 53 + 11) % (SKY_H - 12),
  r: 0.6 + ((i * 7) % 5) * 0.24,
  a: 0.25 + ((i * 11) % 6) * 0.11,
  tw: (i % 7) * 0.9,           // twinkel-fase
}))

// Lichtmasten staan op vaste plekken in het veld (niet in beeld), zodat ze
// langsschuiven als de camera meebeweegt — dat geeft pas diepte.
const PYLONS = [360, 1200, 2040]

// ── Kleurhulpjes ──────────────────────────────────────────────────
function isLight(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b > 140
}

// amt < 0 donkerder, amt > 0 lichter
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const p = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)
  return `rgb(${p((n >> 16) & 255)},${p((n >> 8) & 255)},${p(n & 255)})`
}

function hash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

// ── Shirt pattern drawing ─────────────────────────────────────────
// Vult een rechthoek met het landspatroon; de aanroeper clipt eerst op de
// vorm van het shirt (romp, mouw of het rondje in de UI-preview).
function drawShirt(ctx, cx, cy, w, h, country) {
  const { c1, c2, c3, pattern } = country
  const x = cx - w / 2, y = cy - h / 2

  switch (pattern) {
    case 'v2':
      ctx.fillStyle = c1; ctx.fillRect(x, y, w / 2, h)
      ctx.fillStyle = c2; ctx.fillRect(cx, y, w / 2, h)
      break
    case 'v3': {
      const bw = w / 3
      ctx.fillStyle = c1; ctx.fillRect(x, y, bw, h)
      ctx.fillStyle = c2; ctx.fillRect(x + bw, y, bw, h)
      ctx.fillStyle = c3 || c1; ctx.fillRect(x + 2 * bw, y, bw, h)
      break
    }
    case 'h2':
      ctx.fillStyle = c1; ctx.fillRect(x, y, w, h / 2)
      ctx.fillStyle = c2; ctx.fillRect(x, cy, w, h / 2)
      break
    case 'h3': {
      const bh = h / 3
      ctx.fillStyle = c1; ctx.fillRect(x, y, w, bh)
      ctx.fillStyle = c2; ctx.fillRect(x, y + bh, w, bh)
      ctx.fillStyle = c3 || c1; ctx.fillRect(x, y + 2 * bh, w, bh)
      break
    }
    case 'cross':
      ctx.fillStyle = c1; ctx.fillRect(x, y, w, h)
      ctx.fillStyle = c2
      ctx.fillRect(cx - w * 0.09, y, w * 0.18, h)
      ctx.fillRect(x, cy - h * 0.09, w, h * 0.18)
      if (c3) {
        ctx.fillStyle = c3
        ctx.fillRect(cx - w * 0.045, y, w * 0.09, h)
        ctx.fillRect(x, cy - h * 0.045, w, h * 0.09)
      }
      break
    case 'circle':
      ctx.fillStyle = c1; ctx.fillRect(x, y, w, h)
      ctx.fillStyle = c2
      ctx.beginPath(); ctx.arc(cx, cy, Math.min(w, h) * 0.3, 0, Math.PI * 2); ctx.fill()
      break
    case 'circle2':
      ctx.fillStyle = c1; ctx.fillRect(x, y, w, h)
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Math.min(w, h) * 0.3, 0, Math.PI * 2); ctx.clip()
      ctx.fillStyle = c2; ctx.fillRect(x, y, w, h / 2)
      ctx.fillStyle = c3 || c2; ctx.fillRect(x, cy, w, h / 2)
      ctx.restore()
      break
    case 'usa': {
      const bands = 7, bh = h / bands
      for (let i = 0; i < bands; i++) { ctx.fillStyle = i % 2 === 0 ? c1 : c2; ctx.fillRect(x, y + i * bh, w, bh) }
      ctx.fillStyle = c3 || '#3C3B6E'
      ctx.fillRect(x, y, w * 0.5, h * 0.5)
      break
    }
    case 'quarters':
      ctx.fillStyle = c1; ctx.fillRect(x, y, w / 2, h / 2)
      ctx.fillStyle = c2; ctx.fillRect(cx, y, w / 2, h / 2)
      ctx.fillStyle = c3 || c2; ctx.fillRect(x, cy, w / 2, h / 2)
      ctx.fillStyle = c1; ctx.fillRect(cx, cy, w / 2, h / 2)
      break
    default:
      ctx.fillStyle = c1; ctx.fillRect(x, y, w, h)
  }
}

// ── Player drawing ────────────────────────────────────────────────
const VR = 28   // visual body radius (bigger than physics PR=20)
const HR = 22   // head radius (nearly as big as body)

// Elk land krijgt een eigen speler: huidskleur, haarkleur en kapsel liggen
// vast per land (hash van de key), zodat je tegenstander er elke wedstrijd
// hetzelfde uitziet en de twee poppetjes duidelijk verschillen.
const SKINS = ['#F7D3B0', '#EFC098', '#DDA271', '#B77C4E', '#8A5A34', '#69422a']
const HAIRS = ['#221610', '#3E2417', '#5A3825', '#101014', '#8C5A2B', '#C9A24B', '#6E2E1B']

function drawPlayer(ctx, p, country, nummer = 10) {
  const x = p.x, y = p.y
  const dir      = p.facingRight === false ? -1 : 1
  const dizzy    = p.dizzy || 0
  const onGround = p.onGround
  const moving   = Math.abs(p.vx) > 10
  const now      = Date.now()
  // Pasfase loopt op met de afgelegde afstand, niet met de klok: hoe sneller
  // hij rent, hoe sneller de benen gaan.
  const swing = onGround && moving ? Math.sin((p.stride || 0) / 12) : 0

  const seed  = hash(String(country.key ?? country.abbr ?? 'x'))
  const skin  = SKINS[seed % SKINS.length]
  const hair  = HAIRS[(seed >> 3) % HAIRS.length]
  const kapsel = (seed >> 6) % 5
  const donker = shade(skin, -0.22)

  const c1 = country.c1
  const c2 = country.c2 || shade(country.c1, -0.35)
  const sok = c1
  const broek = isLight(c1) ? shade(c1, -0.55) : shade(c1, -0.3)

  // ── Schaduw: kleiner en lichter naarmate hij hoger springt ──
  const hoogte = Math.max(0, GROUND_Y - (y + PR))
  const s = Math.max(0.35, 1 - hoogte / 260)
  ctx.fillStyle = `rgba(0,0,0,${0.34 * s})`
  ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 4, VR * 1.05 * s, 6.5 * s, 0, 0, Math.PI * 2); ctx.fill()

  ctx.save()
  ctx.translate(x, 0); ctx.scale(dir, 1); ctx.translate(-x, 0)

  const footY   = onGround ? GROUND_Y : y + 22
  const heupY   = y + 8
  const schoudY = y - 20

  // ── Benen (achterste eerst) ──
  const been = (offset, voor) => {
    const fx = x + offset * 12 + (voor ? 2 : -2)
    const fy = onGround ? footY - Math.max(0, offset) * 5 : footY - (voor ? 5 : 0)
    // dijbeen in huidskleur, sok in teamkleur
    ctx.lineCap = 'round'
    ctx.strokeStyle = voor ? skin : donker
    ctx.lineWidth = 9
    ctx.beginPath(); ctx.moveTo(x + offset * 3, heupY); ctx.lineTo(fx, fy - 10); ctx.stroke()
    ctx.strokeStyle = voor ? sok : shade(sok, -0.35)
    ctx.lineWidth = 8.5
    ctx.beginPath(); ctx.moveTo(fx, fy - 11); ctx.lineTo(fx, fy - 4); ctx.stroke()
    ctx.strokeStyle = voor ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(fx - 4, fy - 9.5); ctx.lineTo(fx + 4, fy - 9.5); ctx.stroke()
    // schoen
    ctx.fillStyle = voor ? '#17171f' : '#0e0e13'
    roundRect(ctx, fx - 7, fy - 5.5, 16, 7, 3.5); ctx.fill()
    ctx.fillStyle = c2
    ctx.fillRect(fx - 6, fy - 5, 14, 1.8)
  }
  been(-swing, false)
  been(swing, true)

  // ── Achterste arm ──
  const armSwing = onGround && moving ? -swing : (onGround ? 0 : -0.9)
  const arm = (side, voor) => {
    const sx = x + side * 19
    const hx = sx + side * 5 + Math.sin(armSwing * side) * 9
    const hy = onGround ? y + 2 + Math.cos(armSwing) * 2 : y - 20
    ctx.strokeStyle = voor ? skin : donker
    ctx.lineWidth = 7; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(sx, schoudY + 2); ctx.lineTo(hx, hy); ctx.stroke()
    ctx.fillStyle = voor ? skin : donker
    ctx.beginPath(); ctx.arc(hx, hy, 4.2, 0, Math.PI * 2); ctx.fill()
  }
  arm(-1, false)

  // ── Broekje ──
  ctx.fillStyle = broek
  roundRect(ctx, x - 20, y - 4, 40, 15, 6); ctx.fill()
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(x - 2, y - 2, 3, 12)

  // ── Romp met shirtpatroon ──
  ctx.save()
  roundRect(ctx, x - 23, y - 32, 46, 34, 14); ctx.clip()
  drawShirt(ctx, x, y - 15, 46, 34, country)
  // stofplooi: licht bovenaan, schaduw onderaan
  const sg = ctx.createLinearGradient(0, y - 32, 0, y + 2)
  sg.addColorStop(0, 'rgba(255,255,255,0.18)')
  sg.addColorStop(0.55, 'rgba(255,255,255,0)')
  sg.addColorStop(1, 'rgba(0,0,0,0.32)')
  ctx.fillStyle = sg; ctx.fillRect(x - 24, y - 33, 48, 36)
  ctx.restore()
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.6
  roundRect(ctx, x - 23, y - 32, 46, 34, 14); ctx.stroke()

  // Mouwtjes
  ;[-1, 1].forEach(side => {
    ctx.save()
    roundRect(ctx, x + side * 19 - 7, schoudY - 6, 14, 15, 6); ctx.clip()
    drawShirt(ctx, x + side * 19, schoudY + 1, 16, 16, country)
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x + side * 19 - 8, schoudY - 7, 16, 17)
    ctx.restore()
  })

  // Kraagje
  ctx.strokeStyle = isLight(c1) ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 2.4
  ctx.beginPath(); ctx.arc(x, y - 33, 8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke()

  // ── Voorste arm ──
  arm(1, true)

  // ── Nek ──
  ctx.fillStyle = donker
  ctx.fillRect(x - 6, y - 38, 12, 9)

  // ── Hoofd ──
  const hy = y - VR - HR * 0.6
  ctx.fillStyle = skin
  ctx.beginPath(); ctx.ellipse(x, hy, HR * 0.95, HR, 0, 0, Math.PI * 2); ctx.fill()
  // oor
  ctx.fillStyle = donker
  ctx.beginPath(); ctx.ellipse(x - HR * 0.9, hy + 2, 3.4, 4.6, 0, 0, Math.PI * 2); ctx.fill()
  // zachte schaduw langs de rand
  ctx.save()
  ctx.beginPath(); ctx.ellipse(x, hy, HR * 0.95, HR, 0, 0, Math.PI * 2); ctx.clip()
  const hg = ctx.createRadialGradient(x - 6, hy - 8, 2, x, hy, HR * 1.3)
  hg.addColorStop(0, 'rgba(255,255,255,0.22)')
  hg.addColorStop(0.6, 'rgba(255,255,255,0)')
  hg.addColorStop(1, 'rgba(0,0,0,0.28)')
  ctx.fillStyle = hg; ctx.fillRect(x - HR, hy - HR, HR * 2, HR * 2)

  // ── Kapsel (geclipt op het hoofd, behalve wat er bovenuit steekt) ──
  ctx.fillStyle = hair
  if (kapsel === 0) {                       // korte coupe
    ctx.fillRect(x - HR, hy - HR, HR * 2, HR * 0.72)
    ctx.beginPath(); ctx.ellipse(x, hy - HR * 0.28, HR * 0.95, HR * 0.5, 0, 0, Math.PI * 2); ctx.fill()
  } else if (kapsel === 1) {                 // krullen
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * HR * 0.8, hy + Math.sin(a) * HR * 0.8, 7, 0, Math.PI * 2); ctx.fill()
    }
  } else if (kapsel === 2) {                 // scheiding opzij
    ctx.beginPath()
    ctx.moveTo(x - HR, hy - HR * 0.1)
    ctx.quadraticCurveTo(x - HR * 0.6, hy - HR * 1.15, x + HR * 0.35, hy - HR * 0.95)
    ctx.quadraticCurveTo(x + HR, hy - HR * 0.8, x + HR * 0.95, hy - HR * 0.1)
    ctx.quadraticCurveTo(x + HR * 0.3, hy - HR * 0.55, x - HR, hy - HR * 0.1)
    ctx.fill()
  } else if (kapsel === 3) {                 // hoofdband, kort haar
    ctx.fillRect(x - HR, hy - HR, HR * 2, HR * 0.55)
    ctx.fillStyle = c2
    ctx.fillRect(x - HR, hy - HR * 0.62, HR * 2, 5)
  } else {                                   // stekeltjes
    ctx.fillRect(x - HR, hy - HR * 0.55, HR * 2, HR * 0.5)
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath()
      ctx.moveTo(x + i * 8 - 5, hy - HR * 0.5)
      ctx.lineTo(x + i * 8, hy - HR * 1.25)
      ctx.lineTo(x + i * 8 + 5, hy - HR * 0.5)
      ctx.fill()
    }
  }
  ctx.restore()

  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.4
  ctx.beginPath(); ctx.ellipse(x, hy, HR * 0.95, HR, 0, 0, Math.PI * 2); ctx.stroke()

  // ── Gezicht ──────────────────────────────────────────────────────
  const eyeOX = HR * 0.34
  const eyeOY = hy + HR * 0.02
  const eyeR  = HR * 0.24
  const pupR  = HR * 0.13
  const knipper = (now % 4200) < 120

  if (!dizzy) {
    if (knipper) {
      ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 2; ctx.lineCap = 'round'
      ;[-1, 1].forEach(sgn => {
        ctx.beginPath()
        ctx.arc(x + sgn * eyeOX, eyeOY, eyeR, 1.1 * Math.PI, 1.9 * Math.PI)
        ctx.stroke()
      })
    } else {
      const pupOX = moving ? pupR * 0.7 : 0
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.ellipse(x - eyeOX, eyeOY, eyeR * 0.85, eyeR, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(x + eyeOX, eyeOY, eyeR * 0.85, eyeR, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#20242e'
      ctx.beginPath(); ctx.arc(x - eyeOX + pupOX, eyeOY + pupR * 0.15, pupR, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(x + eyeOX + pupOX, eyeOY + pupR * 0.15, pupR, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.beginPath(); ctx.arc(x - eyeOX + pupOX + pupR * 0.35, eyeOY - pupR * 0.3, pupR * 0.34, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(x + eyeOX + pupOX + pupR * 0.35, eyeOY - pupR * 0.3, pupR * 0.34, 0, Math.PI * 2); ctx.fill()
    }

    // Wenkbrauwen — omhoog bij springen, gefronst bij rennen
    ctx.strokeStyle = hair; ctx.lineWidth = 2.6; ctx.lineCap = 'round'
    const brw = onGround ? (moving ? 1.5 : 0) : -2
    ;[-1, 1].forEach(sgn => {
      ctx.beginPath()
      ctx.moveTo(x + sgn * eyeOX - eyeR * 0.9, eyeOY - eyeR * 1.5 + (sgn < 0 ? brw : brw * 0.4))
      ctx.lineTo(x + sgn * eyeOX + eyeR * 0.9, eyeOY - eyeR * 1.9)
      ctx.stroke()
    })

    // Neus + mond
    ctx.fillStyle = shade(skin, -0.3)
    ctx.beginPath(); ctx.ellipse(x + 2, hy + HR * 0.18, 2.4, 1.8, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#7a3b26'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'
    if (!onGround) {
      ctx.fillStyle = '#7a3b26'
      ctx.beginPath(); ctx.ellipse(x, hy + HR * 0.46, 4.2, 5, 0, 0, Math.PI * 2); ctx.fill()
    } else {
      ctx.beginPath(); ctx.arc(x, hy + HR * 0.26, HR * 0.28, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke()
    }
    // Blosjes
    ctx.fillStyle = 'rgba(230,110,110,0.28)'
    ctx.beginPath(); ctx.ellipse(x - HR * 0.6, hy + HR * 0.34, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(x + HR * 0.6, hy + HR * 0.34, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill()
  } else {
    // Duizelig: kruisogen, golvende mond en tollende sterren
    ctx.strokeStyle = '#FF3B3B'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'
    const xSz = eyeR * 0.85
    ;[-1, 1].forEach(sgn => {
      const ex = x + sgn * eyeOX
      ctx.beginPath(); ctx.moveTo(ex - xSz, eyeOY - xSz); ctx.lineTo(ex + xSz, eyeOY + xSz); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(ex + xSz, eyeOY - xSz); ctx.lineTo(ex - xSz, eyeOY + xSz); ctx.stroke()
    })
    ctx.strokeStyle = '#7a3b26'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(x - HR * 0.3, hy + HR * 0.42)
    ctx.quadraticCurveTo(x - HR * 0.1, hy + HR * 0.3, x, hy + HR * 0.46)
    ctx.quadraticCurveTo(x + HR * 0.1, hy + HR * 0.62, x + HR * 0.3, hy + HR * 0.42)
    ctx.stroke()
    const tt = now / 200
    for (let i = 0; i < 4; i++) {
      const a = tt + (i / 4) * Math.PI * 2
      ctx.fillStyle = '#FFD23F'
      ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('★', x + Math.cos(a) * (HR + 12), hy - HR * 0.4 + Math.sin(a) * 9)
    }
  }

  ctx.restore()

  // Rugnummer buiten de spiegeling, anders staat het achterstevoren
  ctx.fillStyle = isLight(c1) ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.78)'
  ctx.font = 'bold 15px Nunito, Arial'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(String(nummer), x, y - 14)
}

// ── Ball drawing with rotation ────────────────────────────────────
// De vlakken worden naar de rand toe platgedrukt (foreshortening), zodat de
// bal als een bol draait in plaats van als een platte sticker.
function drawBall(ctx, x, y, angle = 0, speed = 0) {
  const ss = Math.max(0.3, 1 - Math.max(0, GROUND_Y - y - BR) / 250)

  // Schaduw
  ctx.fillStyle = `rgba(0,0,0,${0.3 * ss})`
  ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 4, BR * 1.05 * ss, 4.5 * ss, 0, 0, Math.PI * 2); ctx.fill()

  // Gloed bij een harde bal
  if (speed > 420) {
    const glow = Math.min(1, (speed - 420) / 700)
    const gg = ctx.createRadialGradient(x, y, BR * 0.5, x, y, BR * 2.6)
    gg.addColorStop(0, `rgba(255,214,63,${0.32 * glow})`)
    gg.addColorStop(1, 'rgba(255,214,63,0)')
    ctx.fillStyle = gg
    ctx.beginPath(); ctx.arc(x, y, BR * 2.6, 0, Math.PI * 2); ctx.fill()
  }

  // Bol
  const g = ctx.createRadialGradient(x - BR * 0.38, y - BR * 0.42, 1, x, y, BR * 1.05)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.5, '#f2f4f7')
  g.addColorStop(0.85, '#cdd3da')
  g.addColorStop(1, '#9aa3ae')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, BR, 0, Math.PI * 2); ctx.fill()

  ctx.save()
  ctx.beginPath(); ctx.arc(x, y, BR, 0, Math.PI * 2); ctx.clip()

  // Middenvlak
  ctx.fillStyle = '#1b1d24'
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = angle + (i / 5) * Math.PI * 2 - Math.PI / 2
    const r = BR * 0.36
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.closePath(); ctx.fill()

  // Vijf vlakken eromheen, platgedrukt richting de rand
  for (let p = 0; p < 5; p++) {
    const pa = angle + (p / 5) * Math.PI * 2
    const d  = 0.74
    const cx2 = x + Math.cos(pa) * BR * d
    const cy2 = y + Math.sin(pa) * BR * d
    const squash = Math.sqrt(Math.max(0.05, 1 - d * d)) + 0.25
    ctx.save()
    ctx.translate(cx2, cy2); ctx.rotate(pa); ctx.scale(squash, 1)
    ctx.fillStyle = '#1b1d24'
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2
      const r = BR * 0.3
      i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath(); ctx.fill()
    ctx.restore()
  }

  // Schaduw langs de onderrand — maakt het bol
  const rim = ctx.createRadialGradient(x - BR * 0.3, y - BR * 0.3, BR * 0.2, x, y, BR)
  rim.addColorStop(0, 'rgba(0,0,0,0)')
  rim.addColorStop(0.72, 'rgba(0,0,0,0)')
  rim.addColorStop(1, 'rgba(0,0,0,0.4)')
  ctx.fillStyle = rim
  ctx.fillRect(x - BR, y - BR, BR * 2, BR * 2)
  ctx.restore()

  // Rand + glanspunt
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.arc(x, y, BR, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.beginPath(); ctx.ellipse(x - BR * 0.34, y - BR * 0.38, BR * 0.26, BR * 0.19, -0.7, 0, Math.PI * 2); ctx.fill()
}

// ── Tribune ───────────────────────────────────────────────────────
// Duizenden toeschouwers elke frame tekenen is zonde: het publiek staat stil,
// dus het gaat één keer op een los canvas dat daarna als één plaatje met
// parallax voorbijschuift. De sfeer komt van de lichtsweep eroverheen.
const TRIBUNE_W = 1600
let tribuneCanvas = null

function maakTribune() {
  const c = document.createElement('canvas')
  c.width = TRIBUNE_W; c.height = BOARD_Y - STAND_Y
  const g = c.getContext('2d')
  const h = c.height

  // Vakken: donkere banken, per rij iets lichter naar boven toe
  const bg = g.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#131a2b'); bg.addColorStop(1, '#080c16')
  g.fillStyle = bg; g.fillRect(0, 0, TRIBUNE_W, h)

  // Trappen tussen de vakken
  g.fillStyle = 'rgba(255,255,255,0.045)'
  for (let x = 0; x < TRIBUNE_W; x += 200) g.fillRect(x, 0, 7, h)

  // Publiek: het moet lezen als een donkere massa met wat kleurspikkels — niet
  // als confetti, anders verdwijnen de bal en de spelers ertussen.
  let i = 0
  for (let ry = 6; ry < h - 10; ry += 13) {
    const rij = Math.floor((ry - 6) / 13)
    const schaal = 0.6 + rij * 0.035           // verderweg = kleiner
    for (let rx = (rij % 2) * 6; rx < TRIBUNE_W; rx += 12) {
      i++
      if (i % 9 === 0) continue                // hier en daar een leeg stoeltje
      const hue = (i * 47) % 360
      g.fillStyle = `hsl(${hue},${14 + (i % 4) * 7}%,${11 + (i % 5) * 3}%)`
      g.fillRect(rx, ry, 5 * schaal + 2, 4.5 * schaal + 2)
      if (i % 4 === 0) {                       // een enkel hoofdje vangt licht
        g.fillStyle = 'rgba(255,235,215,0.07)'
        g.fillRect(rx + 1.5, ry - 2, 3, 2.5)
      }
    }
    g.fillStyle = 'rgba(0,0,0,0.34)'
    g.fillRect(0, ry + 8, TRIBUNE_W, 3)
  }

  // Diepte: bovenin donkerder, onderin vangt de eerste ring wat veldlicht
  const dim = g.createLinearGradient(0, 0, 0, h)
  dim.addColorStop(0, 'rgba(3,5,12,0.75)')
  dim.addColorStop(0.55, 'rgba(3,5,12,0.35)')
  dim.addColorStop(1, 'rgba(3,5,12,0.12)')
  g.fillStyle = dim; g.fillRect(0, 0, TRIBUNE_W, h)

  // Balustrade onderaan
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, h - 7, TRIBUNE_W, 7)
  return c
}

// ── Field drawing ─────────────────────────────────────────────────
function drawField(ctx, cam, t) {
  // ── Alles wat ver weg staat: in schermruimte, met eigen parallax ──
  ctx.save()
  ctx.translate(cam, 0)

  const sky = ctx.__sky || (ctx.__sky = (() => {
    const s = ctx.createLinearGradient(0, 0, 0, STAND_Y)
    s.addColorStop(0, '#070b1c'); s.addColorStop(0.55, '#0d1836'); s.addColorStop(1, '#16224a')
    return s
  })())
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, STAND_Y)

  // Sterren (langzaamste laag)
  const sterOff = (cam * 0.06) % (W + 60)
  STARS.forEach(st => {
    let sx = st.x - sterOff
    if (sx < -20) sx += W + 60
    const tw = 0.65 + 0.35 * Math.sin(t * 1.6 + st.tw)
    ctx.fillStyle = `rgba(255,255,255,${st.a * tw})`
    ctx.beginPath(); ctx.arc(sx, st.y, st.r, 0, Math.PI * 2); ctx.fill()
  })

  // Maan met halo
  const mx = 660 - (cam * 0.06) % (W + 400)
  if (mx > -60 && mx < W + 60) {
    const halo = ctx.createRadialGradient(mx, 44, 4, mx, 44, 54)
    halo.addColorStop(0, 'rgba(210,225,255,0.22)')
    halo.addColorStop(1, 'rgba(210,225,255,0)')
    ctx.fillStyle = halo
    ctx.beginPath(); ctx.arc(mx, 44, 54, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#e8eeff'
    ctx.beginPath(); ctx.arc(mx, 44, 17, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(190,205,235,0.55)'
    ctx.beginPath(); ctx.arc(mx - 5, 40, 4, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(mx + 6, 49, 2.6, 0, Math.PI * 2); ctx.fill()
  }

  // Tribune
  if (!tribuneCanvas) tribuneCanvas = maakTribune()
  const trOff = -((cam * 0.4) % TRIBUNE_W)
  ctx.drawImage(tribuneCanvas, trOff, STAND_Y)
  ctx.drawImage(tribuneCanvas, trOff + TRIBUNE_W, STAND_Y)

  // Lichtsweep over het publiek — geeft leven zonder duizenden tekeningen
  const sweepX = ((t * 110) % (W + 700)) - 350
  const sw = ctx.createLinearGradient(sweepX - 150, 0, sweepX + 150, 0)
  sw.addColorStop(0, 'rgba(255,240,200,0)')
  sw.addColorStop(0.5, 'rgba(255,240,200,0.07)')
  sw.addColorStop(1, 'rgba(255,240,200,0)')
  ctx.fillStyle = sw; ctx.fillRect(sweepX - 150, STAND_Y, 300, BOARD_Y - STAND_Y)

  // Dak boven de tribune
  ctx.fillStyle = '#05070f'
  ctx.fillRect(0, ROOF_Y, W, STAND_Y - ROOF_Y)
  ctx.fillStyle = 'rgba(120,160,255,0.10)'
  ctx.fillRect(0, STAND_Y - 3, W, 3)
  // Lampenrij onder het dak
  for (let lx = 20 - (cam * 0.4) % 90; lx < W; lx += 90) {
    ctx.fillStyle = 'rgba(255,240,190,0.5)'
    ctx.fillRect(lx, STAND_Y - 6, 16, 3)
    const lg = ctx.createRadialGradient(lx + 8, STAND_Y - 2, 1, lx + 8, STAND_Y - 2, 34)
    lg.addColorStop(0, 'rgba(255,240,190,0.10)'); lg.addColorStop(1, 'rgba(255,240,190,0)')
    ctx.fillStyle = lg; ctx.fillRect(lx - 26, STAND_Y - 6, 68, 40)
  }

  // Donkere band tussen tribune en veld (schaduw van de eerste ring)
  const bandG = ctx.createLinearGradient(0, BOARD_Y - 16, 0, BOARD_Y)
  bandG.addColorStop(0, 'rgba(0,0,0,0)'); bandG.addColorStop(1, 'rgba(0,0,0,0.6)')
  ctx.fillStyle = bandG; ctx.fillRect(0, BOARD_Y - 16, W, 16)

  ctx.restore()

  // ── Lichtmasten (wereldruimte, schuiven dus echt mee) ──
  PYLONS.forEach(px => {
    if (px < cam - 120 || px > cam + W + 120) return
    ctx.strokeStyle = '#0b1020'; ctx.lineWidth = 6
    ctx.beginPath(); ctx.moveTo(px, STAND_Y + 10); ctx.lineTo(px, 62); ctx.stroke()
    ctx.fillStyle = '#0b1020'
    roundRect(ctx, px - 34, 34, 68, 26, 5); ctx.fill()
    for (let i = 0; i < 6; i++) {
      const lx = px - 27 + (i % 3) * 27
      const ly = 41 + Math.floor(i / 3) * 12
      ctx.fillStyle = '#fff8dc'
      ctx.beginPath(); ctx.arc(lx, ly, 4.2, 0, Math.PI * 2); ctx.fill()
    }
    const glow = ctx.createRadialGradient(px, 48, 4, px, 48, 120)
    glow.addColorStop(0, 'rgba(255,244,205,0.3)')
    glow.addColorStop(1, 'rgba(255,244,205,0)')
    ctx.fillStyle = glow
    ctx.beginPath(); ctx.arc(px, 48, 120, 0, Math.PI * 2); ctx.fill()
    // Lichtbundel naar het gras
    const cone = ctx.createLinearGradient(px, 60, px, GROUND_Y)
    cone.addColorStop(0, 'rgba(255,246,214,0.13)')
    cone.addColorStop(1, 'rgba(255,246,214,0)')
    ctx.fillStyle = cone
    ctx.beginPath()
    ctx.moveTo(px - 26, 58); ctx.lineTo(px + 26, 58)
    ctx.lineTo(px + 230, GROUND_Y + 60); ctx.lineTo(px - 230, GROUND_Y + 60)
    ctx.closePath(); ctx.fill()
  })

  // ── Reclameborden langs het veld ──
  ctx.fillStyle = '#070a14'
  ctx.fillRect(cam, BOARD_Y, W, GROUND_Y - BOARD_Y)
  const bordBreedte = 200
  const eerste = Math.floor(cam / bordBreedte) * bordBreedte
  for (let bx = eerste; bx < cam + W; bx += bordBreedte) {
    const idx = Math.floor(bx / bordBreedte)
    const hue = (idx * 47 + t * 26) % 360
    const bg2 = ctx.createLinearGradient(0, BOARD_Y + 4, 0, GROUND_Y - 6)
    bg2.addColorStop(0, `hsla(${hue},70%,52%,0.32)`)
    bg2.addColorStop(1, `hsla(${hue},70%,32%,0.14)`)
    ctx.fillStyle = bg2
    ctx.fillRect(bx + 4, BOARD_Y + 5, bordBreedte - 8, GROUND_Y - BOARD_Y - 11)
    ctx.fillStyle = `hsla(${hue},80%,74%,0.34)`
    ctx.font = 'bold 14px Nunito, Arial'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(idx % 2 === 0 ? 'KENNISKIST' : '⚽ 1 TEGEN 1', bx + bordBreedte / 2, BOARD_Y + 17)
  }
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(cam, GROUND_Y - 6, W, 6)

  // ── Grasmat ──
  const gras = ctx.__gras || (ctx.__gras = (() => {
    const g2 = ctx.createLinearGradient(0, GROUND_Y, 0, H)
    g2.addColorStop(0, '#237038'); g2.addColorStop(0.4, '#1a5a2c'); g2.addColorStop(1, '#0e3a1d')
    return g2
  })())
  ctx.fillStyle = gras; ctx.fillRect(cam, GROUND_Y, W, H - GROUND_Y)

  // Maaibanen
  const sw2 = 110
  const sx2 = Math.floor(cam / sw2) * sw2
  for (let x = sx2; x < cam + W; x += sw2) {
    ctx.fillStyle = Math.floor(x / sw2) % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'
    ctx.fillRect(x, GROUND_Y, sw2, H - GROUND_Y)
  }

  // Lichtplekken van de masten op het gras
  PYLONS.forEach(px => {
    if (px < cam - 400 || px > cam + W + 400) return
    const lp = ctx.createRadialGradient(px, GROUND_Y + 30, 10, px, GROUND_Y + 30, 300)
    lp.addColorStop(0, 'rgba(255,246,214,0.16)')
    lp.addColorStop(1, 'rgba(255,246,214,0)')
    ctx.fillStyle = lp
    ctx.beginPath(); ctx.ellipse(px, GROUND_Y + 30, 300, 60, 0, 0, Math.PI * 2); ctx.fill()
  })

  // Randlijn waar het gras het licht vangt
  ctx.fillStyle = 'rgba(255,255,255,0.09)'
  ctx.fillRect(cam, GROUND_Y, W, 2)

  // ── Belijning ──
  // Alleen de zijlijn: middenlijn, middencirkel en de 16-meterlijnen stonden
  // in dit zij-aanzicht dwars door het speelveld en maakten het beeld onrustig.
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(FIELD_L, GROUND_Y + 2); ctx.lineTo(FIELD_R, GROUND_Y + 2); ctx.stroke()

  // ── Doelen ──
  const doel = (kant) => {
    const links = kant === 'L'
    const x0 = links ? 0 : FIELD_R
    const paalX = links ? GOAL_NET : FIELD_R

    // Net
    ctx.save()
    ctx.beginPath(); ctx.rect(x0, G_TOP, GOAL_NET, GOAL_H); ctx.clip()
    const net = ctx.createLinearGradient(x0, G_TOP, x0, GROUND_Y)
    net.addColorStop(0, 'rgba(190,215,255,0.13)')
    net.addColorStop(1, 'rgba(150,180,230,0.05)')
    ctx.fillStyle = net; ctx.fillRect(x0, G_TOP, GOAL_NET, GOAL_H)
    ctx.strokeStyle = 'rgba(255,255,255,0.17)'; ctx.lineWidth = 1
    for (let d = -GOAL_H; d < GOAL_NET + GOAL_H; d += 12) {
      ctx.beginPath(); ctx.moveTo(x0 + d, G_TOP); ctx.lineTo(x0 + d + GOAL_H, GROUND_Y); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x0 + d, GROUND_Y); ctx.lineTo(x0 + d + GOAL_H, G_TOP); ctx.stroke()
    }
    ctx.restore()

    // Paal + lat met een streepje glans
    const paal = ctx.createLinearGradient(paalX, 0, paalX + 6, 0)
    paal.addColorStop(0, '#ffffff'); paal.addColorStop(1, '#b9c4d6')
    ctx.fillStyle = paal
    ctx.fillRect(links ? paalX - 6 : paalX, G_TOP - 6, 6, GOAL_H + 6)
    ctx.fillStyle = '#eef2f8'
    ctx.fillRect(x0, G_TOP - 6, GOAL_NET, 6)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(x0, G_TOP, GOAL_NET, 1.5)
  }
  doel('L'); doel('R')
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
const newState = (tp = false) => ({
  player: { x: FIELD_MID - 280, y: GROUND_Y - PR, vx: 0, vy: 0, onGround: true, facingRight: true,  dizzy: 0, stompImmunity: 0 },
  ai:     { x: FIELD_MID + 280, y: GROUND_Y - PR, vx: 0, vy: 0, onGround: true, facingRight: false, dizzy: 0, stompImmunity: 0 },
  ball:   { x: FIELD_MID, y: GROUND_Y - BR, vx: 0, vy: 0, angle: 0 },
  trail:  [],
  particles: [],
  score:  { p: 0, ai: 0 },
  time:   tp ? GAME_TIME_TWOPLAYER : GAME_TIME_NORMAL,
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
  const { c1, c2, c3, pattern } = country
  switch (pattern) {
    case 'v2':
      bg = `linear-gradient(90deg,${c1} 50%,${c2} 50%)`; break
    case 'v3':
      bg = `linear-gradient(90deg,${c1} 0,${c1} 33.3%,${c2} 33.3%,${c2} 66.6%,${c3 || c1} 66.6%,${c3 || c1} 100%)`; break
    case 'h2':
      bg = `linear-gradient(180deg,${c1} 50%,${c2} 50%)`; break
    case 'h3':
      bg = `linear-gradient(180deg,${c1} 0,${c1} 33.3%,${c2} 33.3%,${c2} 66.6%,${c3 || c1} 66.6%,${c3 || c1} 100%)`; break
    case 'cross':
      bg = `linear-gradient(${c2},${c2}) center/18% 100% no-repeat,` +
           `linear-gradient(${c2},${c2}) center/100% 18% no-repeat,` +
           (c3 ? `linear-gradient(${c3},${c3}) center/9% 100% no-repeat,linear-gradient(${c3},${c3}) center/100% 9% no-repeat,` : '') +
           c1
      break
    case 'circle':
      bg = `radial-gradient(circle at center, ${c2} 0 38%, ${c1} 38% 100%)`; break
    case 'circle2':
      bg = `radial-gradient(circle at center, transparent 0 38%, ${c1} 38% 100%), linear-gradient(180deg,${c2} 50%,${c3 || c2} 50%)`; break
    case 'usa':
      bg = `linear-gradient(${c3 || '#3C3B6E'},${c3 || '#3C3B6E'}) 0 0/50% 50% no-repeat,` +
           `repeating-linear-gradient(180deg,${c1} 0,${c1} 14.28%,${c2} 14.28%,${c2} 28.56%)`
      break
    case 'quarters':
      bg = `linear-gradient(${c1},${c1}) 0 0/50% 50% no-repeat,` +
           `linear-gradient(${c2},${c2}) 100% 0/50% 50% no-repeat,` +
           `linear-gradient(${c3 || c2},${c3 || c2}) 0 100%/50% 50% no-repeat,` +
           `linear-gradient(${c1},${c1}) 100% 100%/50% 50% no-repeat`
      break
    default:
      bg = c1
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, border: '2px solid rgba(255,255,255,0.25)', flexShrink: 0 }} />
  )
}

// ── Main component ────────────────────────────────────────────────
// Toernooi-voortgang bewaren zodat je buiten de opgaves verder kunt spelen.
const TOERNOOI_KEY = 'kk_toernooi_voetbal'
export function loadToernooi() {
  try { const v = JSON.parse(localStorage.getItem(TOERNOOI_KEY)); if (v && v.playerKey && v.opponents?.length) return v } catch { /* ignore */ }
  return null
}
function saveToernooi(b) {
  // alleen echte 1-speler-toernooien (geen 2-speler-potje, niet uitgespeeld)
  try { if (b && !b.p2Key && b.opponents?.length && b.currentRound <= 3) localStorage.setItem(TOERNOOI_KEY, JSON.stringify(b)) } catch { /* ignore */ }
}
function clearToernooi() { try { localStorage.removeItem(TOERNOOI_KEY) } catch { /* ignore */ } }

// Ontgrendelde landen: standaard 10, rest ontgrendel je door het toernooi te winnen.
const UNLOCK_KEY = 'kk_wk_unlocked'
function loadUnlocked() {
  try { const v = JSON.parse(localStorage.getItem(UNLOCK_KEY)); if (Array.isArray(v) && v.length) return v } catch { /* ignore */ }
  return [...DEFAULT_UNLOCKED]
}
function saveUnlocked(arr) {
  try { localStorage.setItem(UNLOCK_KEY, JSON.stringify([...new Set(arr)])) } catch { /* ignore */ }
}

export default function FootballGame({ year, onBack, addCuruntie, noQuiz = false, twoPlayer = false,
                                       rewardMode = false, initialBracket = null, resumeBracket = null, onMatchDone, onMatchEnd }) {
  const [phase,       setPhase]      = useState((rewardMode && initialBracket) || resumeBracket ? 'match_preview' : 'country_select')
  const [bracket,     setBracket]    = useState(rewardMode ? initialBracket : resumeBracket)
  const [difficulty,  setDifficulty] = useState(null)
  const [questions,   setQuestions]  = useState([])
  const [qIndex,      setQIndex]     = useState(0)
  const [input,       setInput]      = useState('')
  const [feedback,    setFeedback]   = useState(null)
  const [score,       setScore]      = useState({ p: 0, ai: 0 })
  const gameDuration = twoPlayer ? GAME_TIME_TWOPLAYER : GAME_TIME_NORMAL
  const [timeLeft,    setTimeLeft]   = useState(gameDuration)
  const [goalInfo,    setGoalInfo]   = useState(null) // { isPlayer: bool }
  const [earnedCoins, setEarnedCoins] = useState(0)
  const [unlocked,    setUnlocked]   = useState(loadUnlocked)
  const [newUnlock,   setNewUnlock]  = useState(null)

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
      const nb = generateBracket(key)
      setBracket(nb); saveToernooi(nb)
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
    const state = newState(twoPlayer)
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
        // Pasfase voor de loopanimatie: telt afgelegde afstand, niet tijd
        state.player.stride = (state.player.stride || 0) + Math.abs(pvx) * dt
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
        if (!twoPlayer && Math.abs(avx) > 10) state.ai.facingRight = avx > 0
        state.ai.vy += GRAVITY * dt
        state.ai.x  += avx * dt
        state.ai.y  += state.ai.vy * dt
        state.ai.stride = (state.ai.stride || 0) + Math.abs(avx) * dt
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
      const klok = ts / 1000
      ctx.save(); ctx.translate(-cam, 0)
      drawField(ctx, cam, klok)
      drawPlayer(ctx, state.player, playerCountry, 10)
      drawPlayer(ctx, state.ai,     currentOpponent, 7)

      // Ball trail
      const spd = Math.sqrt(state.ball.vx ** 2 + state.ball.vy ** 2)
      if (spd > 80) {
        state.trail.forEach((pt, i) => {
          const t = (i + 1) / state.trail.length
          ctx.globalAlpha = t * 0.3
          ctx.fillStyle = spd > 400 ? '#FFD23F' : '#fff'
          ctx.beginPath(); ctx.arc(pt.x, pt.y, BR * (0.25 + t * 0.6), 0, Math.PI * 2); ctx.fill()
        })
        ctx.globalAlpha = 1
      }

      drawBall(ctx, state.ball.x, state.ball.y, state.ball.angle, spd)

      // Particles
      state.particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
        ctx.fillStyle = p.color
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
      })
      ctx.globalAlpha = 1

      ctx.restore()

      // Vignet: houdt de aandacht in het midden en dempt de tribune aan de rand
      const vig = ctx.__vig || (ctx.__vig = (() => {
        const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.72)
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)')
        return v
      })())
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H)

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
    setScore({ p: 0, ai: 0 }); setTimeLeft(gameDuration); setGoalInfo(null); setEarnedCoins(0)
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
      clearToernooi()
      if (won && bracket.currentRound >= 3) {
        const locked = COUNTRIES.filter(c => !unlocked.includes(c.key)).map(c => c.key)
        if (locked.length) {
          const win = locked[Math.floor(Math.random() * locked.length)]
          const next = [...unlocked, win]
          setUnlocked(next); saveUnlocked(next); setNewUnlock(win)
        } else {
          setNewUnlock(null)
        }
      }
      setPhase(won && bracket.currentRound >= 3 ? 'wk_won' : 'wk_lost')
      return
    }
    const nextRound = bracket.currentRound + 1
    const nb = { ...bracket, currentRound: nextRound, results: newResults }
    setBracket(nb); saveToernooi(nb)
    setScore({ p: 0, ai: 0 }); setTimeLeft(gameDuration); setGoalInfo(null); setEarnedCoins(0)
    setPhase('match_preview')
  }

  // ── Reward-mode: na de wedstrijd automatisch terug naar spelling ──
  const rewardNextBracket = () => {
    const won = score.p >= score.ai          // gelijk = strafschoppen gewonnen
    if (!won) return { won:false, next:null }                                  // verloren → nieuw toernooi
    if (bracket.currentRound >= 3) return { won:true, next:null }              // hele toernooi gewonnen
    return { won:true, next:{ ...bracket, currentRound: bracket.currentRound + 1, results:[...bracket.results, 'win'] } }
  }
  useEffect(() => {
    if (phase === 'match_end') onMatchEnd?.()
  }, [phase])

  useEffect(() => {
    if (!rewardMode || phase !== 'match_end') return
    const { won, next } = rewardNextBracket()
    if (next) saveToernooi(next); else clearToernooi()   // toernooi ook buiten de opgaves verder speelbaar
    const t = setTimeout(() => onMatchDone?.(won, next, true), 2800)
    return () => clearTimeout(t)
  }, [phase, rewardMode])

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
        {COUNTRIES.filter(c => c.key !== bracket?.playerKey && unlocked.includes(c.key)).map(c => (
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
      <button className="back-btn" onClick={onBack}>← Menu</button>
      <div className="wk-header">
        <span className="wk-trophy">{twoPlayer ? '🎮' : '🏆'}</span>
        <h1 className="wk-title">{twoPlayer ? '2 Spelers' : '1 tegen 1 voetbal'}</h1>
        <p className="wk-sub">{twoPlayer ? 'Pijltjes — kies jouw land (P1)' : 'Kies jouw land'}</p>
      </div>
      <div className="wk-country-grid">
        {COUNTRIES.map(c => {
          const open = unlocked.includes(c.key)
          return (
            <button key={c.key} className={`wk-country-card${open ? '' : ' wk-locked'}`} disabled={!open}
              onClick={() => open && pickCountry(c.key)} title={open ? undefined : 'Win het toernooi om dit land te ontgrendelen'}>
              {!open && <span className="wk-lock-badge">🔒</span>}
              <span className="wk-country-flag">{c.flag}</span>
              <JerseyCircle country={c} size={30} />
              <span className="wk-country-name">{c.name}</span>
              <span className="wk-country-stars">{'⭐'.repeat(c.diff)}</span>
            </button>
          )
        })}
      </div>
      <p className="wk-unlock-progress">{unlocked.length}/{COUNTRIES.length} landen ontgrendeld</p>
    </div>
  )

  // Match preview
  if (phase === 'match_preview' && bracket) {
    const opp = currentOpponent
    const pl  = playerCountry
    const rnd = bracket.roundNames[bracket.currentRound]
    return (
      <div className="fb-screen">
        <button className="back-btn" onClick={() => rewardMode ? onMatchDone?.(false, bracket, false) : setPhase('country_select')}>← Terug</button>
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
        <OrientationGate />
        <button className="back-btn" style={{ position:'absolute', top:14, left:14, zIndex:50 }} onClick={onBack}>← Menu</button>
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

  // Match end — reward-mode (auto terug naar spelling)
  if (phase === 'match_end' && bracket && rewardMode) {
    const won  = score.p >= score.ai     // gelijk = strafschoppen gewonnen
    const pl   = playerCountry
    const opp  = currentOpponent
    const { next } = rewardNextBracket()
    return (
      <div className="fb-screen">
        <div className="fb-end-card">
          <div style={{ display:'flex', gap:12, alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:'2rem' }}>{pl.flag}</span>
            <span className="fb-end-score" style={{ fontSize:'1.8rem', color:'#fff' }}>{score.p} – {score.ai}</span>
            <span style={{ fontSize:'2rem' }}>{opp.flag}</span>
          </div>
          <span className="fb-end-icon">{won ? '🏆' : '😢'}</span>
          <h2 className="fb-end-title" style={{ color: won ? '#FFD23F' : '#FF6B6B' }}>
            {won ? 'Gewonnen!' : 'Verloren'}
          </h2>
          <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.9rem', margin:'4px 0' }}>
            {won
              ? (next ? 'Top! Na 5 goede antwoorden speel je de volgende ronde 🏆' : '🎉 Je hebt het hele toernooi gewonnen!')
              : 'Volgende keer een nieuw toernooi 💪'}
          </p>
          <div className="fb-end-coins"><span>💵</span><span>+ € 50 briefgeld!</span></div>
          <div className="fb-end-btns">
            <button className="fb-end-btn fb-end-btn-again" style={{ background:'#FFD23F' }}
              onClick={() => onMatchDone?.(won, next, true)}>
              ✏️ Verder met oefenen →
            </button>
          </div>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.75rem', marginTop:6 }}>Je gaat zo automatisch verder…</p>
        </div>
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
                🏆 Claim de beker!
              </button>
            )}
            {!won && !draw && (
              <>
                <button className="fb-end-btn fb-end-btn-again" onClick={restart}>🔄 Wedstrijd herspelen</button>
                <button className="fb-end-btn fb-end-btn-back" onClick={() => { clearToernooi(); setBracket(null); setPhase('country_select') }}>← Nieuw toernooi</button>
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
        <h1 className="wk-champ-title">TOERNOOI GEWONNEN!</h1>
        <div className="wk-champ-flag">{playerCountry?.flag}</div>
        <p className="wk-champ-sub">{playerCountry?.name} wint alle vier de duels!</p>
        {newUnlock && (
          <p className="wk-champ-unlock">🔓 Nieuw land ontgrendeld: {getCountry(newUnlock)?.flag} {getCountry(newUnlock)?.name}!</p>
        )}
        <button className="fb-end-btn fb-end-btn-again" style={{ marginTop: 16 }} onClick={() => { clearToernooi(); setBracket(null); setNewUnlock(null); setPhase('country_select') }}>
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
          <button className="fb-end-btn fb-end-btn-back" onClick={() => { clearToernooi(); setBracket(null); setPhase('country_select') }}>← Nieuw toernooi</button>
        </div>
      </div>
    </div>
  )

  return null
}
