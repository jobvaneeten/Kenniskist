// ── Programmatic animal sprites for Tower Defense ─────────────────────
// Each function draws one animal into a PIXI.Graphics object.
// size = diameter of the cell (we draw centered at 0,0, radius = size/2)

import * as PIXI from 'pixi.js'

const TAU = Math.PI * 2

function circle(g, x, y, r, fill, alpha = 1) {
  g.beginFill(fill, alpha)
  g.drawCircle(x, y, r)
  g.endFill()
}

function ellipse(g, x, y, w, h, fill, alpha = 1) {
  g.beginFill(fill, alpha)
  g.drawEllipse(x, y, w, h)
  g.endFill()
}

// ── Animal textures cache ──────────────────────────────────────────────
const _cache = {}

export function getTowerTexture(app, key, size = 40) {
  const cacheKey = `${key}_${size}`
  if (_cache[cacheKey]) return _cache[cacheKey]
  const g = new PIXI.Graphics()
  drawAnimal(g, key, size)
  const tex = app.renderer.generateTexture(g, { resolution: 2 })
  _cache[cacheKey] = tex
  g.destroy()
  return tex
}

export function drawAnimal(g, key, size) {
  const r = size * 0.42
  const fn = DRAWERS[key] || DRAWERS.pig
  fn(g, r)
}

// ── Individual animal drawers ──────────────────────────────────────────

function drawLion(g, r) {
  // Mane (jagged dark ring behind body)
  const maneR = r * 1.22
  const spikes = 14
  g.beginFill(0xC07A20)
  g.moveTo(maneR, 0)
  for (let i = 0; i < spikes; i++) {
    const a1 = (i / spikes) * TAU
    const a2 = ((i + 0.5) / spikes) * TAU
    g.lineTo(Math.cos(a1) * maneR, Math.sin(a1) * maneR)
    g.lineTo(Math.cos(a2) * (maneR * 0.78), Math.sin(a2) * (maneR * 0.78))
  }
  g.closePath()
  g.endFill()

  // Body
  circle(g, 0, 0, r, 0xF5C542)

  // Lighter belly
  ellipse(g, 0, r * 0.2, r * 0.55, r * 0.45, 0xFFE08A)

  // Eyes
  circle(g, -r * 0.32, -r * 0.15, r * 0.13, 0x3B2000)
  circle(g, r * 0.32, -r * 0.15, r * 0.13, 0x3B2000)
  circle(g, -r * 0.28, -r * 0.18, r * 0.05, 0xFFFFFF)
  circle(g, r * 0.28, -r * 0.18, r * 0.05, 0xFFFFFF)

  // Nose
  ellipse(g, 0, r * 0.12, r * 0.2, r * 0.14, 0xE08050)

  // Nostrils
  circle(g, -r * 0.09, r * 0.14, r * 0.055, 0xB85030)
  circle(g, r * 0.09, r * 0.14, r * 0.055, 0xB85030)

  // Ears
  circle(g, -r * 0.72, -r * 0.6, r * 0.22, 0xF5C542)
  circle(g, r * 0.72, -r * 0.6, r * 0.22, 0xF5C542)
  circle(g, -r * 0.72, -r * 0.6, r * 0.13, 0xE09060)
  circle(g, r * 0.72, -r * 0.6, r * 0.13, 0xE09060)
}

function drawElephant(g, r) {
  // Body
  circle(g, 0, 0, r, 0x8090A0)

  // Ears (large)
  ellipse(g, -r * 0.9, 0, r * 0.45, r * 0.65, 0x90A0B0)
  ellipse(g, r * 0.9, 0, r * 0.45, r * 0.65, 0x90A0B0)
  ellipse(g, -r * 0.9, 0.05 * r, r * 0.3, r * 0.45, 0xC0B8B0)
  ellipse(g, r * 0.9, 0.05 * r, r * 0.3, r * 0.45, 0xC0B8B0)

  // Re-draw body over ears
  circle(g, 0, 0, r, 0x8090A0)

  // Head highlight
  ellipse(g, -r * 0.2, -r * 0.25, r * 0.35, r * 0.28, 0xA0B0C0, 0.5)

  // Trunk (curved down)
  g.lineStyle(r * 0.22, 0x8090A0)
  g.moveTo(0, r * 0.3)
  g.bezierCurveTo(r * 0.1, r * 0.7, r * 0.45, r * 0.9, r * 0.3, r * 1.15)
  g.lineStyle(0)

  // Tusk tips
  circle(g, -r * 0.2, r * 0.55, r * 0.1, 0xFFF5DC)
  circle(g, r * 0.2, r * 0.55, r * 0.1, 0xFFF5DC)

  // Eyes
  circle(g, -r * 0.35, -r * 0.2, r * 0.12, 0x1A1A1A)
  circle(g, r * 0.35, -r * 0.2, r * 0.12, 0x1A1A1A)
  circle(g, -r * 0.31, -r * 0.23, r * 0.045, 0xFFFFFF)
  circle(g, r * 0.31, -r * 0.23, r * 0.045, 0xFFFFFF)
}

function drawPanda(g, r) {
  // White body
  circle(g, 0, 0, r, 0xFFFFFF)

  // Black eye patches
  ellipse(g, -r * 0.38, -r * 0.18, r * 0.28, r * 0.22, 0x222222)
  ellipse(g, r * 0.38, -r * 0.18, r * 0.28, r * 0.22, 0x222222)

  // White eyes on patches
  circle(g, -r * 0.38, -r * 0.2, r * 0.13, 0xFFFFFF)
  circle(g, r * 0.38, -r * 0.2, r * 0.13, 0xFFFFFF)
  circle(g, -r * 0.35, -r * 0.18, r * 0.07, 0x111111)
  circle(g, r * 0.35, -r * 0.18, r * 0.07, 0x111111)

  // Black ears
  circle(g, -r * 0.62, -r * 0.7, r * 0.25, 0x222222)
  circle(g, r * 0.62, -r * 0.7, r * 0.25, 0x222222)

  // Nose
  ellipse(g, 0, r * 0.08, r * 0.18, r * 0.12, 0x111111)

  // Mouth
  g.lineStyle(r * 0.06, 0x222222)
  g.moveTo(-r * 0.12, r * 0.22)
  g.lineTo(0, r * 0.32)
  g.lineTo(r * 0.12, r * 0.22)
  g.lineStyle(0)

  // Black legs hint at bottom
  ellipse(g, -r * 0.45, r * 0.75, r * 0.28, r * 0.2, 0x222222)
  ellipse(g, r * 0.45, r * 0.75, r * 0.28, r * 0.2, 0x222222)
}

function drawMonkey(g, r) {
  // Fur tufts ring (like lion's mane — monkey's signature fluffy head)
  g.beginFill(0x5A3015)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const sz = r * 0.22 + (i % 3) * r * 0.07
    g.drawCircle(Math.cos(a) * r * 1.06, Math.sin(a) * r * 1.06, sz)
  }
  g.endFill()

  // Body
  circle(g, 0, 0, r, 0x8B5E3C)

  // Ears (behind the fur tufts visually but set before body redraw)
  circle(g, -r * 0.85, -r * 0.1, r * 0.27, 0x7A4E2A)
  circle(g, r * 0.85, -r * 0.1, r * 0.27, 0x7A4E2A)
  circle(g, -r * 0.85, -r * 0.1, r * 0.17, 0xD4A070)
  circle(g, r * 0.85, -r * 0.1, r * 0.17, 0xD4A070)

  // Face patch (lighter, large)
  ellipse(g, 0, r * 0.06, r * 0.72, r * 0.68, 0xD4A070)

  // Eyebrows (raised = curious/happy monkey)
  g.lineStyle(r * 0.07, 0x3A1800)
  g.arc(-r * 0.28, -r * 0.3, r * 0.15, Math.PI, 0, false)
  g.arc(r * 0.28, -r * 0.3, r * 0.15, Math.PI, 0, false)
  g.lineStyle(0)

  // Eyes (amber iris — more expressive)
  circle(g, -r * 0.28, -r * 0.15, r * 0.16, 0x1A1A1A)
  circle(g, r * 0.28, -r * 0.15, r * 0.16, 0x1A1A1A)
  circle(g, -r * 0.28, -r * 0.13, r * 0.1, 0x8B5A10)
  circle(g, r * 0.28, -r * 0.13, r * 0.1, 0x8B5A10)
  circle(g, -r * 0.28, -r * 0.13, r * 0.055, 0x1A1A1A)
  circle(g, r * 0.28, -r * 0.13, r * 0.055, 0x1A1A1A)
  circle(g, -r * 0.24, -r * 0.17, r * 0.04, 0xFFFFFF)
  circle(g, r * 0.24, -r * 0.17, r * 0.04, 0xFFFFFF)

  // Protruding muzzle
  ellipse(g, 0, r * 0.28, r * 0.4, r * 0.3, 0xE0B888)

  // Nostrils
  circle(g, -r * 0.12, r * 0.26, r * 0.08, 0x7A4020)
  circle(g, r * 0.12, r * 0.26, r * 0.08, 0x7A4020)

  // Grin with white teeth
  g.beginFill(0xFFFFFF)
  g.drawRoundedRect(-r * 0.25, r * 0.34, r * 0.5, r * 0.18, r * 0.04)
  g.endFill()
  g.lineStyle(r * 0.045, 0x7A4020)
  g.moveTo(-r * 0.25, r * 0.43); g.lineTo(r * 0.25, r * 0.43)
  g.lineStyle(0)
}

function drawTiger(g, r) {
  // Body orange
  circle(g, 0, 0, r, 0xFF8C00)

  // Lighter belly
  ellipse(g, 0, r * 0.2, r * 0.5, r * 0.42, 0xFFD090)

  // Stripes (dark)
  const stripeCol = 0x1A0A00
  // Forehead stripe
  g.beginFill(stripeCol)
  g.drawRect(-r * 0.08, -r * 0.9, r * 0.16, r * 0.5)
  g.endFill()
  // Side stripes
  for (let side of [-1, 1]) {
    g.beginFill(stripeCol)
    g.drawPolygon([
      side * r * 0.35, -r * 0.55,
      side * r * 0.55, -r * 0.45,
      side * r * 0.5, -r * 0.25,
      side * r * 0.3, -r * 0.35,
    ])
    g.endFill()
    g.beginFill(stripeCol)
    g.drawPolygon([
      side * r * 0.55, -r * 0.1,
      side * r * 0.78, 0,
      side * r * 0.72, r * 0.2,
      side * r * 0.5, r * 0.12,
    ])
    g.endFill()
  }

  // Ears
  for (let side of [-1, 1]) {
    g.beginFill(0xFF8C00)
    g.drawPolygon([side * r * 0.45, -r * 0.7, side * r * 0.75, -r * 1.0, side * r * 0.82, -r * 0.65])
    g.endFill()
    g.beginFill(0xFF5090)
    g.drawPolygon([side * r * 0.52, -r * 0.72, side * r * 0.73, -r * 0.94, side * r * 0.78, -r * 0.68])
    g.endFill()
  }

  // Eyes (fierce)
  circle(g, -r * 0.3, -r * 0.2, r * 0.15, 0x22EE44)
  circle(g, r * 0.3, -r * 0.2, r * 0.15, 0x22EE44)
  circle(g, -r * 0.3, -r * 0.2, r * 0.08, 0x111111)
  circle(g, r * 0.3, -r * 0.2, r * 0.08, 0x111111)

  // Nose
  g.beginFill(0xFF5080)
  g.drawPolygon([0, -r * 0.02, -r * 0.12, r * 0.12, r * 0.12, r * 0.12])
  g.endFill()

  // Whiskers
  g.lineStyle(r * 0.04, 0xFFFFFF, 0.7)
  g.moveTo(-r * 0.18, r * 0.18); g.lineTo(-r * 0.85, r * 0.1)
  g.moveTo(-r * 0.18, r * 0.24); g.lineTo(-r * 0.85, r * 0.3)
  g.moveTo(r * 0.18, r * 0.18); g.lineTo(r * 0.85, r * 0.1)
  g.moveTo(r * 0.18, r * 0.24); g.lineTo(r * 0.85, r * 0.3)
  g.lineStyle(0)
}

function drawBear(g, r) {
  // Body
  circle(g, 0, 0, r, 0x6B4226)

  // Ears
  circle(g, -r * 0.62, -r * 0.68, r * 0.25, 0x6B4226)
  circle(g, r * 0.62, -r * 0.68, r * 0.25, 0x6B4226)
  circle(g, -r * 0.62, -r * 0.68, r * 0.14, 0xA07050)
  circle(g, r * 0.62, -r * 0.68, r * 0.14, 0xA07050)

  // Snout
  ellipse(g, 0, r * 0.22, r * 0.4, r * 0.32, 0xC09070)

  // Eyes
  circle(g, -r * 0.32, -r * 0.15, r * 0.13, 0x1A1A1A)
  circle(g, r * 0.32, -r * 0.15, r * 0.13, 0x1A1A1A)
  circle(g, -r * 0.27, -r * 0.18, r * 0.05, 0xFFFFFF)
  circle(g, r * 0.27, -r * 0.18, r * 0.05, 0xFFFFFF)

  // Nose
  ellipse(g, 0, r * 0.12, r * 0.16, r * 0.11, 0x1A1A1A)
}

function drawHippo(g, r) {
  // Body (large purple-gray oval)
  ellipse(g, 0, 0, r, r * 0.88, 0x9090B8)

  // Highlight
  ellipse(g, -r * 0.2, -r * 0.25, r * 0.4, r * 0.28, 0xB0B0D0, 0.5)

  // Snout bump
  ellipse(g, 0, r * 0.38, r * 0.5, r * 0.32, 0xA0A0C0)

  // Nostrils
  circle(g, -r * 0.18, r * 0.35, r * 0.1, 0x6868A0)
  circle(g, r * 0.18, r * 0.35, r * 0.1, 0x6868A0)

  // Eyes (on top of head, like real hippos)
  circle(g, -r * 0.35, -r * 0.35, r * 0.14, 0x3A3A3A)
  circle(g, r * 0.35, -r * 0.35, r * 0.14, 0x3A3A3A)
  circle(g, -r * 0.3, -r * 0.38, r * 0.06, 0xFFFFFF)
  circle(g, r * 0.3, -r * 0.38, r * 0.06, 0xFFFFFF)

  // Ears (tiny)
  circle(g, -r * 0.65, -r * 0.55, r * 0.15, 0x9090B8)
  circle(g, r * 0.65, -r * 0.55, r * 0.15, 0x9090B8)
}

function drawRhino(g, r) {
  // Body
  circle(g, 0, 0, r, 0x8A8A7A)

  // Horn on front (top)
  g.beginFill(0xBBB8A0)
  g.drawPolygon([0, -r * 1.25, -r * 0.15, -r * 0.75, r * 0.15, -r * 0.75])
  g.endFill()
  // Small second horn
  g.beginFill(0xA8A590)
  g.drawPolygon([0, -r * 0.8, -r * 0.09, -r * 0.6, r * 0.09, -r * 0.6])
  g.endFill()

  // Wrinkle lines
  g.lineStyle(r * 0.04, 0x6A6A5A, 0.5)
  g.moveTo(-r * 0.5, r * 0.1); g.lineTo(-r * 0.3, r * 0.05)
  g.moveTo(r * 0.5, r * 0.1); g.lineTo(r * 0.3, r * 0.05)
  g.lineStyle(0)

  // Ears (tiny square-ish)
  circle(g, -r * 0.7, -r * 0.5, r * 0.18, 0x8A8A7A)
  circle(g, r * 0.7, -r * 0.5, r * 0.18, 0x8A8A7A)
  circle(g, -r * 0.7, -r * 0.5, r * 0.1, 0xD0C8A0)
  circle(g, r * 0.7, -r * 0.5, r * 0.1, 0xD0C8A0)

  // Eyes (small, set back)
  circle(g, -r * 0.35, -r * 0.1, r * 0.12, 0x2A2A2A)
  circle(g, r * 0.35, -r * 0.1, r * 0.12, 0x2A2A2A)
  circle(g, -r * 0.3, -r * 0.13, r * 0.05, 0xFFFFFF)
  circle(g, r * 0.3, -r * 0.13, r * 0.05, 0xFFFFFF)
}

function drawCroc(g, r) {
  // Front-facing crocodile: head at top, jaws open downward

  // Main head/body oval
  ellipse(g, 0, -r * 0.08, r * 0.88, r * 0.72, 0x2E8B57)

  // Scales along top of head
  g.beginFill(0x1A6640)
  for (let i = -2; i <= 2; i++) {
    g.drawEllipse(i * r * 0.28, -r * 0.48, r * 0.14, r * 0.09)
  }
  g.endFill()

  // Protruding eye sockets (bumps on top of head — real croc style)
  circle(g, -r * 0.38, -r * 0.45, r * 0.2, 0x1A6640)
  circle(g, r * 0.38, -r * 0.45, r * 0.2, 0x1A6640)
  // Yellow eyes with vertical slit pupils
  circle(g, -r * 0.38, -r * 0.45, r * 0.14, 0xFFEE00)
  circle(g, r * 0.38, -r * 0.45, r * 0.14, 0xFFEE00)
  g.beginFill(0x111111)
  g.drawEllipse(-r * 0.38, -r * 0.45, r * 0.05, r * 0.1)
  g.drawEllipse(r * 0.38, -r * 0.45, r * 0.05, r * 0.1)
  g.endFill()

  // Nostrils (on top of snout, not eyes)
  circle(g, -r * 0.16, -r * 0.08, r * 0.1, 0x1A6640)
  circle(g, r * 0.16, -r * 0.08, r * 0.1, 0x1A6640)
  circle(g, -r * 0.16, -r * 0.08, r * 0.055, 0x0A3A20)
  circle(g, r * 0.16, -r * 0.08, r * 0.055, 0x0A3A20)

  // Lower jaw extending downward
  ellipse(g, 0, r * 0.38, r * 0.72, r * 0.42, 0x269A4E)

  // Lighter belly on lower jaw
  ellipse(g, 0, r * 0.45, r * 0.52, r * 0.28, 0xA8D8A0)

  // Upper teeth (pointing down from head)
  g.beginFill(0xFFFFFF)
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue
    const bx = i * r * 0.22
    g.drawPolygon([bx - r * 0.08, r * 0.15, bx, r * 0.38, bx + r * 0.08, r * 0.15])
  }
  g.endFill()

  // Lower teeth (pointing up from jaw)
  g.beginFill(0xFFFFFF)
  for (let i = -1; i <= 1; i += 2) {
    const bx = i * r * 0.3
    g.drawPolygon([bx - r * 0.07, r * 0.26, bx, r * 0.12, bx + r * 0.07, r * 0.26])
  }
  g.endFill()
}

function drawPenguin(g, r) {
  // Black body
  circle(g, 0, 0, r, 0x1A1A2E)

  // White belly
  ellipse(g, 0, r * 0.15, r * 0.55, r * 0.7, 0xF0F0FF)

  // Wing hints
  ellipse(g, -r * 0.8, r * 0.1, r * 0.25, r * 0.55, 0x1A1A2E)
  ellipse(g, r * 0.8, r * 0.1, r * 0.25, r * 0.55, 0x1A1A2E)

  // Eyes (white circles with pupil)
  circle(g, -r * 0.3, -r * 0.25, r * 0.18, 0xFFFFFF)
  circle(g, r * 0.3, -r * 0.25, r * 0.18, 0xFFFFFF)
  circle(g, -r * 0.28, -r * 0.23, r * 0.1, 0x1A1A2E)
  circle(g, r * 0.28, -r * 0.23, r * 0.1, 0x1A1A2E)
  circle(g, -r * 0.24, -r * 0.26, r * 0.04, 0xFFFFFF)
  circle(g, r * 0.24, -r * 0.26, r * 0.04, 0xFFFFFF)

  // Orange beak
  g.beginFill(0xFF8C00)
  g.drawPolygon([0, r * 0.02, -r * 0.15, r * 0.2, r * 0.15, r * 0.2])
  g.endFill()

  // Orange feet
  g.beginFill(0xFF8C00)
  g.drawEllipse(-r * 0.28, r * 0.85, r * 0.22, r * 0.12)
  g.drawEllipse(r * 0.28, r * 0.85, r * 0.22, r * 0.12)
  g.endFill()
}

function drawHedgehog(g, r) {
  // Spikes on TOP half — radiating from back of head upward
  // Arc from Math.PI (left) to 2*Math.PI (right) passing through 3π/2 (UP in canvas)
  const numSpikes = 14
  for (let i = 0; i <= numSpikes; i++) {
    const a = Math.PI + (i / numSpikes) * Math.PI  // top arc: left→up→right
    g.lineStyle(r * 0.12, 0x5C3A1E)
    g.moveTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72)
    g.lineTo(Math.cos(a) * r * 1.42, Math.sin(a) * r * 1.42)
  }
  g.lineStyle(0)

  // Body (brownish)
  circle(g, 0, 0, r, 0x8B6538)

  // Face/belly on bottom half (lighter beige — arc from right→bottom→left)
  g.beginFill(0xC8956C)
  g.moveTo(r, 0)
  g.arc(0, 0, r, 0, Math.PI, false)  // bottom half clockwise
  g.closePath()
  g.endFill()

  // Eyes (in upper center of body, above the face/belly dividing line)
  circle(g, -r * 0.3, -r * 0.18, r * 0.14, 0x1A1A1A)
  circle(g, r * 0.3, -r * 0.18, r * 0.14, 0x1A1A1A)
  circle(g, -r * 0.25, -r * 0.21, r * 0.06, 0xFFFFFF)
  circle(g, r * 0.25, -r * 0.21, r * 0.06, 0xFFFFFF)

  // Nose (center, just below eyes)
  circle(g, 0, r * 0.05, r * 0.12, 0x2A1000)

  // Smile curve
  g.lineStyle(r * 0.065, 0x2A1000, 0.8)
  g.arc(0, r * 0.18, r * 0.18, Math.PI, 0, false)  // TOP of mini-circle = smile arc
  g.lineStyle(0)
}

function drawPig(g, r) {
  // Body pink
  circle(g, 0, 0, r, 0xFFAEB5)

  // Lighter belly
  ellipse(g, 0, r * 0.18, r * 0.55, r * 0.45, 0xFFD0D5)

  // Ears (pink triangles with dark pink inner)
  for (let side of [-1, 1]) {
    g.beginFill(0xFF9AA0)
    g.drawPolygon([side * r * 0.3, -r * 0.75, side * r * 0.62, -r * 1.05, side * r * 0.7, -r * 0.65])
    g.endFill()
    g.beginFill(0xFF7080)
    g.drawPolygon([side * r * 0.34, -r * 0.73, side * r * 0.6, -r * 0.97, side * r * 0.64, -r * 0.67])
    g.endFill()
  }

  // Snout
  ellipse(g, 0, r * 0.3, r * 0.38, r * 0.28, 0xFFB0B8)
  // Nostrils
  circle(g, -r * 0.14, r * 0.3, r * 0.09, 0xFF8090)
  circle(g, r * 0.14, r * 0.3, r * 0.09, 0xFF8090)

  // Eyes
  circle(g, -r * 0.32, -r * 0.08, r * 0.13, 0x2A1A1A)
  circle(g, r * 0.32, -r * 0.08, r * 0.13, 0x2A1A1A)
  circle(g, -r * 0.27, -r * 0.11, r * 0.05, 0xFFFFFF)
  circle(g, r * 0.27, -r * 0.11, r * 0.05, 0xFFFFFF)
}

const DRAWERS = {
  lion: drawLion,
  elephant: drawElephant,
  panda: drawPanda,
  monkey: drawMonkey,
  tiger: drawTiger,
  bear: drawBear,
  hippo: drawHippo,
  rhino: drawRhino,
  croc: drawCroc,
  penguin: drawPenguin,
  hedgehog: drawHedgehog,
  pig: drawPig,
}
