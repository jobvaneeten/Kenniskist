// Ontworpen skins: kleding met een echt ontwerp in plaats van een kleur,
// patroon of emoji-print. Alles wordt hier in code getekend op de UV-indeling
// van de donor-modellen (zie applyClothing.js), dus er zijn geen plaatjes
// nodig.
//
// Drie lagen per skin:
//   basis    — patroon over het hele kledingstuk
//   zones    — driehoeken van het model kleuren op hun plek in 3D (mouwen,
//              zool, zijbies). Daarvoor lezen we het GLB-model zelf in.
//   voor/rug — embleem op de borst en tekst/nummer op de rug van het shirt,
//              getekend in meters op het lijf (zie OP_LIJF).
//
// UV-metingen (shirtmodel.glb, uitgelezen met de posities van het model):
//   voorpand: u = 1.30 − 0.87·y,  v = 0.693 − 0.95·x   (90° gedraaid)
//   rugpand:  u = 0.755 − 1.14·x, v = 1.533 − 0.91·y   (rechtop)
// sokken.glb: grote strook v = 1.087 − 1.297·y, zijstrook (u > .85)
//   v = 0.601 − 1.32·y.

// Textuurmaat. De kledingkast zet hem op 2048 (één poppetje, scherp van
// dichtbij); in de spellen blijft hij 1024 vanwege het geheugen.
let S = 1024
let resolutie = 1024
export function zetResolutie(n) { resolutie = n }
export const huidigeResolutie = () => resolutie

// ── kleine helpers ──────────────────────────────────────────────────────────
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function sterren(ctx, w, h, n, seed, kleur = '#fff') {
  const r = rng(seed)
  ctx.fillStyle = kleur
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.35 + r() * 0.65
    const s = r() < 0.08 ? 2.6 : 0.6 + r() * 1.2
    ctx.beginPath(); ctx.arc(r() * w, r() * h, s * w / 512, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
}

function ster(ctx, x, y, R, punten = 5) {
  ctx.beginPath()
  for (let i = 0; i < punten * 2; i++) {
    const r = i % 2 ? R * 0.45 : R
    const a = -Math.PI / 2 + i * Math.PI / punten
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
  }
  ctx.closePath()
}

function schild(ctx, w, h) {
  ctx.beginPath()
  ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, 0)
  ctx.quadraticCurveTo(w / 2, h * 0.35, 0, h / 2)
  ctx.quadraticCurveTo(-w / 2, h * 0.35, -w / 2, 0)
  ctx.closePath()
}

// ── basispatronen (vullen 0..w × 0..h) ─────────────────────────────────────
const BASIS = {
  galaxy(ctx, w, h, seed = 7) {
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#0a0620'); g.addColorStop(0.5, '#1b0f4a'); g.addColorStop(1, '#070b26')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    const r = rng(seed)
    for (let i = 0; i < 9; i++) {
      const x = r() * w, y = r() * h, rad = (0.15 + r() * 0.25) * w
      const kleur = ['255,79,216', '62,232,255', '155,108,255'][i % 3]
      const n = ctx.createRadialGradient(x, y, 0, x, y, rad)
      n.addColorStop(0, `rgba(${kleur},.38)`); n.addColorStop(1, `rgba(${kleur},0)`)
      ctx.fillStyle = n; ctx.fillRect(0, 0, w, h)
    }
    sterren(ctx, w, h, Math.round(w * 0.9), seed + 1)
  },
  maliën(ctx, w, h) {
    ctx.fillStyle = '#5d6673'; ctx.fillRect(0, 0, w, h)
    const r = w / 64
    ctx.lineWidth = r * 0.55
    for (let y = 0, rij = 0; y < h + r; y += r * 1.5, rij++) {
      for (let x = (rij % 2) * r; x < w + r; x += r * 2) {
        ctx.strokeStyle = '#2b3038'; ctx.beginPath(); ctx.arc(x, y + r * 0.15, r * 0.85, 0, Math.PI * 2); ctx.stroke()
        ctx.strokeStyle = '#b9c2cf'; ctx.beginPath(); ctx.arc(x, y, r * 0.85, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke()
      }
    }
  },
  circuit(ctx, w, h, seed = 3) {
    ctx.fillStyle = '#06070d'; ctx.fillRect(0, 0, w, h)
    const r = rng(seed), stap = w / 24
    ctx.lineWidth = w / 340; ctx.lineCap = 'round'
    for (let i = 0; i < 70; i++) {
      const kleur = r() < 0.55 ? '#2ee6ff' : '#ff3fd2'
      ctx.strokeStyle = kleur; ctx.fillStyle = kleur
      ctx.shadowColor = kleur; ctx.shadowBlur = w / 90
      let x = Math.round(r() * 24) * stap, y = Math.round(r() * 24) * stap
      ctx.beginPath(); ctx.moveTo(x, y)
      for (let k = 0; k < 4; k++) {
        if (r() < 0.5) x += (r() < 0.5 ? -1 : 1) * stap * (1 + Math.floor(r() * 3))
        else y += (r() < 0.5 ? -1 : 1) * stap * (1 + Math.floor(r() * 3))
        ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.beginPath(); ctx.arc(x, y, w / 200, 0, Math.PI * 2); ctx.fill()
    }
    ctx.shadowBlur = 0
  },
  neonraster(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#12052b'); g.addColorStop(1, '#05020f')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    const n = 16
    ctx.lineWidth = w / 380
    for (let i = 0; i <= n; i++) {
      for (const [kleur, horizontaal] of [['#ff3fd2', true], ['#2ee6ff', false]]) {
        ctx.strokeStyle = kleur; ctx.shadowColor = kleur; ctx.shadowBlur = w / 120
        ctx.beginPath()
        if (horizontaal) { ctx.moveTo(0, i * h / n); ctx.lineTo(w, i * h / n) } else { ctx.moveTo(i * w / n, 0); ctx.lineTo(i * w / n, h) }
        ctx.stroke()
      }
    }
    ctx.shadowBlur = 0
  },
  ruimtepak(ctx, w, h) {
    ctx.fillStyle = '#eef1f6'; ctx.fillRect(0, 0, w, h)
    const r = rng(11)
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.035)' : 'rgba(255,255,255,.5)'
      ctx.fillRect(r() * w, r() * h, w / 160, w / 160)
    }
    ctx.strokeStyle = 'rgba(80,90,110,.35)'; ctx.lineWidth = w / 300
    ctx.setLineDash([w / 70, w / 110])
    for (let i = 1; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(0, i * h / 6); ctx.lineTo(w, i * h / 6); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(i * w / 6, 0); ctx.lineTo(i * w / 6, h); ctx.stroke()
    }
    ctx.setLineDash([])
  },
  oranje(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#ff8c1a'); g.addColorStop(1, '#f25c05')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = w / 90
    for (let i = -h; i < w; i += w / 22) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke() }
  },
  goud(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, w, h)
    ;['#8a6212', '#ffd34d', '#fff3b8', '#d4a017', '#8a6212', '#ffd34d', '#fff3b8', '#c8960f']
      .forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c))
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#fff'
    const r = rng(5)
    for (let i = 0; i < 40; i++) { ctx.globalAlpha = 0.5 + r() * 0.5; ster(ctx, r() * w, r() * h, w / 90, 4); ctx.fill() }
    ctx.globalAlpha = 1
  },
  zwart(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#24262e'); g.addColorStop(1, '#101116')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  },
  tijger(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#ff9a2e'); g.addColorStop(1, '#e86a10')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    const r = rng(21)
    ctx.fillStyle = '#1a0f08'
    for (let i = 0; i < 46; i++) {
      const x = r() * w, y = r() * h, l = w * (0.06 + r() * 0.1), d = w * (0.012 + r() * 0.012), hoek = (r() - 0.5) * 0.8
      ctx.save(); ctx.translate(x, y); ctx.rotate(hoek)
      ctx.beginPath(); ctx.moveTo(-l, 0); ctx.quadraticCurveTo(0, -d * 2, l, 0); ctx.quadraticCurveTo(0, d * 0.6, -l, 0); ctx.fill()
      ctx.restore()
    }
  },
  lava(ctx, w, h) {
    ctx.fillStyle = '#16100e'; ctx.fillRect(0, 0, w, h)
    const r = rng(9)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    for (let i = 0; i < 38; i++) {
      let x = r() * w, y = r() * h
      ctx.strokeStyle = r() < 0.5 ? '#ff6a00' : '#ffb000'
      ctx.shadowColor = '#ff4d00'; ctx.shadowBlur = w / 70
      ctx.lineWidth = w / (180 + r() * 220)
      ctx.beginPath(); ctx.moveTo(x, y)
      for (let k = 0; k < 5; k++) { x += (r() - 0.5) * w / 9; y += (r() - 0.5) * w / 9; ctx.lineTo(x, y) }
      ctx.stroke()
    }
    ctx.shadowBlur = 0
  },
  brei(ctx, w, h) {
    // gebreide trui: rijen kleine V-steekjes
    ctx.fillStyle = '#b3121c'; ctx.fillRect(0, 0, w, h)
    const st = w / 48
    ctx.lineWidth = st * 0.28; ctx.lineCap = 'round'
    for (let y = 0; y < h + st; y += st * 0.8) {
      for (let x = 0; x < w + st; x += st) {
        ctx.strokeStyle = 'rgba(0,0,0,.22)'
        ctx.beginPath(); ctx.moveTo(x - st * 0.35, y - st * 0.3); ctx.lineTo(x, y + st * 0.25); ctx.lineTo(x + st * 0.35, y - st * 0.3); ctx.stroke()
        ctx.strokeStyle = 'rgba(255,255,255,.08)'
        ctx.beginPath(); ctx.moveTo(x - st * 0.35, y - st * 0.4); ctx.lineTo(x, y + st * 0.15); ctx.stroke()
      }
    }
  },
  navy(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#1d2b4f'); g.addColorStop(1, '#121b33')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  },
  paars(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#5b1f9e'); g.addColorStop(1, '#3a1170')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = w / 200
    for (let x = 0; x < w; x += w / 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
  },
  blauw(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#2563eb'); g.addColorStop(1, '#1e40af')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  },
  wit(ctx, w, h) {
    ctx.fillStyle = '#f4f5f8'; ctx.fillRect(0, 0, w, h)
    const r = rng(2)
    for (let i = 0; i < 900; i++) { ctx.fillStyle = 'rgba(0,0,0,.03)'; ctx.fillRect(r() * w, r() * h, w / 200, w / 200) }
  },
}

// ── emblemen: getekend rond (0,0), hoogte ≈ 1 ──────────────────────────────
const EMBLEEM = {
  topscorer(ctx) {
    ctx.fillStyle = '#14224a'; schild(ctx, 0.82, 1); ctx.fill()
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.06; ctx.stroke()
    ctx.fillStyle = '#ffd34d'; ster(ctx, 0, -0.04, 0.3); ctx.fill()
  },
  missie(ctx) {
    ctx.fillStyle = '#1d3f9e'; ctx.beginPath(); ctx.arc(0, 0, 0.5, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.06; ctx.stroke()
    ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.arc(-0.1, 0.06, 0.18, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.035
    ctx.beginPath(); ctx.ellipse(-0.05, 0.04, 0.38, 0.12, -0.4, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = '#fff'; ster(ctx, 0.22, -0.22, 0.08); ctx.fill()
    ctx.save(); ctx.scale(0.01, 0.01)
    ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('KK-1', 0, 36); ctx.restore()
  },
  ridder(ctx) {
    ctx.fillStyle = '#ffd34d'; schild(ctx, 0.84, 1); ctx.fill()
    ctx.fillStyle = '#a4161a'; schild(ctx, 0.68, 0.84); ctx.fill()
    ctx.fillStyle = '#ffd34d'
    ctx.fillRect(-0.06, -0.34, 0.12, 0.64); ctx.fillRect(-0.26, -0.12, 0.52, 0.12)
  },
  controller(ctx) {
    ctx.strokeStyle = '#2ee6ff'; ctx.shadowColor = '#2ee6ff'; ctx.shadowBlur = 12
    ctx.lineWidth = 0.07
    ctx.beginPath(); ctx.roundRect(-0.55, -0.28, 1.1, 0.56, 0.24); ctx.stroke()
    ctx.lineWidth = 0.06
    ctx.beginPath(); ctx.moveTo(-0.38, 0); ctx.lineTo(-0.14, 0); ctx.moveTo(-0.26, -0.12); ctx.lineTo(-0.26, 0.12); ctx.stroke()
    ctx.fillStyle = '#ff3fd2'; ctx.shadowColor = '#ff3fd2'
    ;[[0.24, -0.08], [0.36, 0.04]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 0.055, 0, Math.PI * 2); ctx.fill() })
    ctx.shadowBlur = 0
  },
  bliksemcirkel(ctx) {
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(0, 0, 0.5, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#e02a4a'; ctx.lineWidth = 0.07; ctx.stroke()
    ctx.fillStyle = '#e02a4a'
    ctx.beginPath(); ctx.moveTo(0.08, -0.4); ctx.lineTo(-0.2, 0.05); ctx.lineTo(-0.02, 0.05)
    ctx.lineTo(-0.1, 0.4); ctx.lineTo(0.2, -0.08); ctx.lineTo(0.02, -0.08); ctx.closePath(); ctx.fill()
  },
  doodshoofd(ctx) {
    ctx.strokeStyle = '#f4f5f8'; ctx.lineWidth = 0.1; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-0.42, 0.18); ctx.lineTo(0.42, 0.5); ctx.moveTo(0.42, 0.18); ctx.lineTo(-0.42, 0.5); ctx.stroke()
    ctx.fillStyle = '#f4f5f8'
    ctx.beginPath(); ctx.arc(0, -0.1, 0.32, 0, Math.PI * 2); ctx.fill()
    ctx.fillRect(-0.18, 0.1, 0.36, 0.18)
    ctx.fillStyle = '#111'
    ;[-0.12, 0.12].forEach(x => { ctx.beginPath(); ctx.arc(x, -0.1, 0.085, 0, Math.PI * 2); ctx.fill() })
    ctx.beginPath(); ctx.moveTo(0, 0.0); ctx.lineTo(-0.04, 0.08); ctx.lineTo(0.04, 0.08); ctx.closePath(); ctx.fill()
  },
  kerstboom(ctx) {
    ctx.fillStyle = '#1f7a3a'
    for (let i = 0; i < 3; i++) {
      const y = -0.35 + i * 0.22, b = 0.22 + i * 0.12
      ctx.beginPath(); ctx.moveTo(0, y - 0.15); ctx.lineTo(b, y + 0.18); ctx.lineTo(-b, y + 0.18); ctx.closePath(); ctx.fill()
    }
    ctx.fillStyle = '#7a4a1c'; ctx.fillRect(-0.06, 0.4, 0.12, 0.12)
    ctx.fillStyle = '#ffd34d'; ster(ctx, 0, -0.5, 0.12); ctx.fill()
    ;[['#e63946', -0.12, -0.12], ['#2ee6ff', 0.1, 0.06], ['#ffd34d', -0.18, 0.25], ['#ff3fd2', 0.2, 0.3]]
      .forEach(([c, x, y]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 0.045, 0, Math.PI * 2); ctx.fill() })
  },
  basketbal(ctx) {
    ctx.fillStyle = '#f08a24'; ctx.beginPath(); ctx.arc(0, 0, 0.45, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#3a1a05'; ctx.lineWidth = 0.05
    ctx.beginPath(); ctx.arc(0, 0, 0.45, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(-0.45, 0); ctx.lineTo(0.45, 0); ctx.moveTo(0, -0.45); ctx.lineTo(0, 0.45); ctx.stroke()
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 0.45, 0, Math.PI * 2); ctx.clip()
    ctx.beginPath(); ctx.arc(-0.62, 0, 0.45, -0.75, 0.75); ctx.stroke()
    ctx.beginPath(); ctx.arc(0.62, 0, 0.45, Math.PI - 0.75, Math.PI + 0.75); ctx.stroke()
    ctx.restore()
  },
  vlam(ctx) {
    const g = ctx.createLinearGradient(0, 0.5, 0, -0.5)
    g.addColorStop(0, '#ff3d00'); g.addColorStop(0.6, '#ff9a00'); g.addColorStop(1, '#ffe14d')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.moveTo(0, 0.5)
    ctx.bezierCurveTo(-0.45, 0.45, -0.4, 0, -0.15, -0.2); ctx.bezierCurveTo(-0.15, 0, -0.05, 0.05, 0, 0.0)
    ctx.bezierCurveTo(-0.05, -0.25, 0.1, -0.4, 0.05, -0.55); ctx.bezierCurveTo(0.35, -0.3, 0.45, 0.1, 0.3, 0.3)
    ctx.bezierCurveTo(0.25, 0.45, 0.1, 0.5, 0, 0.5); ctx.fill()
  },
  planeet(ctx) {
    const g = ctx.createRadialGradient(-0.1, -0.12, 0.02, 0, 0, 0.32)
    g.addColorStop(0, '#ffd27a'); g.addColorStop(1, '#e0622a')
    ctx.strokeStyle = '#c9b6ff'; ctx.lineWidth = 0.05
    ctx.beginPath(); ctx.ellipse(0, 0, 0.55, 0.14, -0.35, Math.PI, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 0.3, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(0, 0, 0.55, 0.14, -0.35, 0, Math.PI); ctx.stroke()
  },
}

// Tekst op de rug, rond (0,0), in meters.
// Lettergroottes onder 1px gaan mis in canvas, dus in honderdsten tekenen.
function rugTekst(ctx, regels) {
  ctx.save(); ctx.scale(0.01, 0.01)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (const r of regels) {
    // Nooit breder dan 20 cm: anders loopt een lange tekst om de zij heen.
    let g = r.grootte * 100
    ctx.font = `900 ${g}px sans-serif`
    const breed = ctx.measureText(r.tekst).width
    if (breed > 20) { g *= 20 / breed; ctx.font = `900 ${g}px sans-serif` }
    if (r.gloed) { ctx.shadowColor = r.kleur; ctx.shadowBlur = 14 }
    if (r.rand) { ctx.lineWidth = g * 0.14; ctx.lineJoin = 'round'; ctx.strokeStyle = r.rand; ctx.strokeText(r.tekst, 0, r.y * 100) }
    ctx.fillStyle = r.kleur; ctx.fillText(r.tekst, 0, r.y * 100)
    ctx.shadowBlur = 0
  }
  ctx.restore()
}

// Zet de canvas zo dat je in meters op het lijf tekent: oorsprong op wereldpunt
// (x, y), +x naar rechts zoals je ernaar kijkt, +y omlaag.
const OP_LIJF = {
  voor: (ctx, x, y) => ctx.setTransform(0, -0.95 * S, 0.87 * S, 0, S * (1.30 - 0.87 * y), S * (0.693 - 0.95 * x)),
  rug: (ctx, x, y) => ctx.setTransform(1.14 * S, 0, 0, 0.91 * S, S * (0.755 - 1.14 * x), S * (1.533 - 0.91 * y)),
}

// ── de skins ───────────────────────────────────────────────────────────────
// zones: [voorwaarde op het midden van een driehoek (x, y, z in meters), kleur]
export const SKINS = {
  topscorer: {
    basis: 'oranje',
    zones: [[([x]) => Math.abs(x) > 0.27, '#14224a'], [([, y]) => y < 0.875, '#14224a']],
    voor: { embleem: 'topscorer', x: 0.07, y: 1.24, maat: 0.085 },
    rug: [{ tekst: 'KENNISKIST', y: -0.085, grootte: 0.035, kleur: '#fff' },
      { tekst: '10', y: 0.0, grootte: 0.15, kleur: '#fff', rand: '#14224a' }],
  },
  astronaut: {
    basis: 'ruimtepak',
    zones: [[([x]) => Math.abs(x) > 0.285, '#ff7a1a'], [([x]) => Math.abs(x) > 0.24 && Math.abs(x) < 0.26, '#1d3f9e']],
    voor: { embleem: 'missie', x: 0.07, y: 1.23, maat: 0.1 },
    rug: [{ tekst: 'ASTRONAUT', y: -0.06, grootte: 0.032, kleur: '#1d3f9e' }],
  },
  ridder: {
    basis: 'maliën',
    zones: [[([x, y]) => Math.abs(x) < 0.12 && y < 1.33, '#a4161a']],
    voor: { embleem: 'ridder', x: 0, y: 1.17, maat: 0.13 },
  },
  gamer: {
    basis: 'circuit',
    voor: { embleem: 'controller', x: 0, y: 1.2, maat: 0.11 },
    rug: [{ tekst: 'GG', y: 0, grootte: 0.13, kleur: '#ff3fd2', gloed: true }],
  },
  sterrenstelsel: {
    basis: 'galaxy',
    voor: { embleem: 'planeet', x: 0, y: 1.17, maat: 0.14 },
  },
  superheld: {
    basis: 'blauw',
    zones: [[([x]) => Math.abs(x) > 0.24, '#e02a4a'], [([, y]) => y < 0.9, '#ffd34d']],
    voor: { embleem: 'bliksemcirkel', x: 0, y: 1.2, maat: 0.13 },
  },
  piraat: {
    basis: 'wit',
    zones: [[([, y]) => Math.floor(y / 0.045) % 2 === 0, '#c8102e'], [([x]) => Math.abs(x) > 0.27, '#14224a']],
    voor: { embleem: 'doodshoofd', x: 0, y: 1.19, maat: 0.12 },
    rug: [{ tekst: 'KAPITEIN', y: -0.07, grootte: 0.034, kleur: '#14224a', rand: '#ffffff' }],
  },
  basketbal: {
    basis: 'paars',
    zones: [[([x]) => Math.abs(x) > 0.15 && Math.abs(x) < 0.21, '#ffd34d'], [([x]) => Math.abs(x) > 0.27, '#ffd34d']],
    voor: { embleem: 'basketbal', x: 0, y: 1.2, maat: 0.11 },
    rug: [{ tekst: 'KK HOOPS', y: -0.085, grootte: 0.034, kleur: '#ffd34d' },
      { tekst: '23', y: 0.0, grootte: 0.15, kleur: '#ffd34d', rand: '#2a0a52' }],
  },
  brandweer: {
    basis: 'navy',
    zones: [[([, y]) => (y > 1.0 && y < 1.035) || (y > 1.06 && y < 1.075), '#f2d21b'],
      [([x]) => Math.abs(x) > 0.25 && Math.abs(x) < 0.27, '#d9dde3']],
    voor: { embleem: 'vlam', x: 0.075, y: 1.25, maat: 0.07 },
    rug: [{ tekst: 'BRANDWEER', y: -0.05, grootte: 0.036, kleur: '#f2d21b' }],
  },
  kersttrui: {
    basis: 'brei',
    zones: [[([, y]) => y > 1.27 && y < 1.3, '#f4f5f8'], [([, y]) => y < 0.9, '#f4f5f8'], [([x]) => Math.abs(x) > 0.28, '#f4f5f8']],
    voor: { embleem: 'kerstboom', x: 0, y: 1.14, maat: 0.15 },
  },
  tijger: {
    basis: 'tijger',
    zones: [[([, y]) => y < 0.885, '#1a0f08']],
  },
  galaxybroek: { basis: 'galaxy' },
  tijgerbroek: { basis: 'tijger' },
  lavabroek: { basis: 'lava' },
  brandweerbroek: {
    basis: 'navy',
    zones: [[([, y]) => y > 0.72 && y < 0.745, '#f2d21b'], [([, y]) => y > 0.75 && y < 0.758, '#d9dde3']],
  },
  sportbroek: {
    basis: 'zwart',
    zones: [[([x]) => Math.abs(x) > 0.155, '#ffffff'], [([, y]) => y > 0.875, '#2ee6ff']],
  },
  neonbroek: { basis: 'neonraster' },
  sportsok: { basis: 'wit', strepen: [[0.355, 0.375, '#e63946'], [0.39, 0.41, '#1d3f9e']] },
  galaxysok: { basis: 'galaxy', strepen: [[0.41, 0.46, '#ff3fd2']] },
  regenboogsok: { basis: 'wit', strepen: [[0.39, 0.44, '#e63946'], [0.34, 0.39, '#f77f00'], [0.29, 0.34, '#f4c430'],
    [0.24, 0.29, '#2d9e4f'], [0.19, 0.24, '#1d6fa4'], [0.14, 0.19, '#7b2d8b']] },
  kerstsok: { basis: 'brei', strepen: [[0.4, 0.45, '#f4f5f8'], [0.32, 0.345, '#1f7a3a'], [0.29, 0.30, '#f4f5f8']] },
  tijgersok: { basis: 'tijger', strepen: [[0.41, 0.46, '#1a0f08']] },
  neonsneaker: { basis: 'zwart', zones: [[([, y]) => y < 0.035, '#39ff6a']] },
  goudsneaker: { basis: 'goud', zones: [[([, y]) => y < 0.035, '#ffffff']] },
  galaxysneaker: { basis: 'galaxy', zones: [[([, y]) => y < 0.035, '#f4f5f8']] },
  lavasneaker: { basis: 'lava', zones: [[([, y]) => y < 0.035, '#ff6a00']] },
  basketbalsneaker: { basis: 'wit', zones: [[([, y]) => y < 0.035, '#e02a4a'], [([, y, z]) => z > 0.13 && y < 0.09, '#e02a4a'], [([, y]) => y > 0.15, '#14224a']] },
  tijgersneaker: { basis: 'tijger', zones: [[([, y]) => y < 0.035, '#1a0f08']] },
  brandweerlaars: { basis: 'zwart', zones: [[([, y]) => y > 0.1 && y < 0.12, '#f2d21b'], [([, y]) => y < 0.035, '#5a2a10']] },
}

// ── GLB inlezen (alleen posities, UV en driehoeken) ────────────────────────
const meshCache = new Map()
export function leesMesh(url) {
  if (!meshCache.has(url)) {
    meshCache.set(url, fetch(url).then(r => r.arrayBuffer()).then(buf => {
      const dv = new DataView(buf)
      const jl = dv.getUint32(12, true)
      const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl)))
      const bin = 20 + jl + 8
      const lees = (i) => {
        const a = json.accessors[i], bv = json.bufferViews[a.bufferView]
        const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type]
        const sz = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[a.componentType]
        const stride = bv.byteStride || n * sz
        const out = []
        for (let k = 0; k < a.count; k++) {
          const o = bin + (bv.byteOffset || 0) + (a.byteOffset || 0) + k * stride
          const rij = []
          for (let c = 0; c < n; c++) {
            const q = o + c * sz
            rij.push(a.componentType === 5126 ? dv.getFloat32(q, true) : sz === 4 ? dv.getUint32(q, true) : sz === 2 ? dv.getUint16(q, true) : dv.getUint8(q))
          }
          out.push(n === 1 ? rij[0] : rij)
        }
        return out
      }
      const p = json.meshes[0].primitives[0]
      return { pos: lees(p.attributes.POSITION), uv: lees(p.attributes.TEXCOORD_0), idx: lees(p.indices) }
    }).catch(() => null))
  }
  return meshCache.get(url)
}

// Elke driehoek wordt opgedeeld in n×n stukjes, die los getest worden: zo
// krijgt een bies of zool een strakke rand, ook op een grof model (de broek
// heeft maar ~300 driehoeken). Grove modellen fijner, fijne modellen grover.
function kleurZones(ctx, mesh, zones) {
  const { pos, uv, idx } = mesh
  const n = Math.max(1, Math.min(8, Math.round(Math.sqrt(40000 / (idx.length / 3)))))
  const mix = (a, b, c, l1, l2) => a.map((_, k) => a[k] * l1 + b[k] * l2 + c[k] * (1 - l1 - l2))
  for (const [voorwaarde, kleur] of zones) {
    ctx.fillStyle = kleur; ctx.strokeStyle = kleur; ctx.lineWidth = 2; ctx.lineJoin = 'round'
    for (let t = 0; t < idx.length; t += 3) {
      const [A, B, C] = [idx[t], idx[t + 1], idx[t + 2]]
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n - i; j++) {
          // twee soorten deeldriehoekjes: "rechtop" en "omgekeerd"
          const stukken = [[[i, j], [i + 1, j], [i, j + 1]]]
          if (j < n - i - 1) stukken.push([[i + 1, j], [i + 1, j + 1], [i, j + 1]])
          for (const st of stukken) {
            const l = st.map(([a, b]) => [a / n, b / n])
            const midden = [0, 1].map(k => (l[0][k] + l[1][k] + l[2][k]) / 3)
            if (!voorwaarde(mix(pos[A], pos[B], pos[C], midden[0], midden[1]))) continue
            ctx.beginPath()
            l.forEach(([l1, l2], k) => {
              const [u, v] = mix(uv[A], uv[B], uv[C], l1, l2)
              k ? ctx.lineTo(u * S, v * S) : ctx.moveTo(u * S, v * S)
            })
            ctx.closePath(); ctx.fill(); ctx.stroke()
          }
        }
      }
    }
  }
}

function sokStrepen(ctx, strepen) {
  for (const [y1, y2, kleur] of strepen) {
    ctx.fillStyle = kleur
    const hoofd = [1.087 - 1.297 * y2, 1.087 - 1.297 * y1]
    ctx.fillRect(0, hoofd[0] * S, 0.86 * S, (hoofd[1] - hoofd[0]) * S)
    const zij = [0.601 - 1.32 * y2, 0.601 - 1.32 * y1]
    ctx.fillRect(0.85 * S, zij[0] * S, 0.15 * S, (zij[1] - zij[0]) * S)
  }
}

// Volledige textuur voor een kledingstuk. `donor` = het GLB-bestand waarvan de
// UV gebruikt wordt (nodig voor de zones).
export async function buildSkinTexture(item, donor) {
  const d = SKINS[item.design]
  // Eerst laden, daarna alles in één keer tekenen: S mag tussendoor niet
  // door een andere textuur veranderd worden.
  const mesh = d.zones ? await leesMesh(donor) : null
  S = resolutie
  const cv = document.createElement('canvas')
  cv.width = S; cv.height = S
  const ctx = cv.getContext('2d')
  BASIS[d.basis](ctx, S, S)
  if (mesh) kleurZones(ctx, mesh, d.zones)
  if (d.strepen) sokStrepen(ctx, d.strepen)
  if (d.voor) {
    OP_LIJF.voor(ctx, d.voor.x, d.voor.y)
    ctx.scale(d.voor.maat, d.voor.maat)
    EMBLEEM[d.voor.embleem](ctx)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }
  if (d.rug) {
    OP_LIJF.rug(ctx, 0, 1.17)
    rugTekst(ctx, d.rug)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }
  return cv
}

// Vierkant plaatje voor de kledingkast en de winkel. Het ontwerp zelf (basis,
// embleem of rugnummer) — de echte textuur is een uitgevouwen lap en zegt een
// kind niets.
const previewCache = new Map()
export function skinPreview(item) {
  if (previewCache.has(item.design)) return previewCache.get(item.design)
  const d = SKINS[item.design]
  const P = 160
  const cv = document.createElement('canvas')
  cv.width = P; cv.height = P
  const ctx = cv.getContext('2d')
  BASIS[d.basis](ctx, P, P)
  const zool = d.zones?.find(([f]) => f([0, 0.01, 0]) && !f([0, 0.1, 0]))
  if (zool) { ctx.fillStyle = zool[1]; ctx.fillRect(0, P * 0.78, P, P * 0.22) }
  if (d.strepen) d.strepen.forEach(([, , kleur], i) => { ctx.fillStyle = kleur; ctx.fillRect(0, P * (0.12 + i * 0.14), P, P * 0.08) })
  if (d.zones && !zool && !d.voor) d.zones.forEach(([, kleur], i) => {
    ctx.fillStyle = kleur
    if (i === 0) { ctx.fillRect(P * 0.08, 0, P * 0.08, P); ctx.fillRect(P * 0.84, 0, P * 0.08, P) } else ctx.fillRect(0, 0, P, P * 0.1)
  })
  if (d.rug?.some(r => r.grootte > 0.1)) {
    ctx.setTransform(P / 0.32, 0, 0, P / 0.32, P / 2, P / 2)
    rugTekst(ctx, d.rug)
  } else if (d.voor) {
    ctx.setTransform(P * 0.62, 0, 0, P * 0.62, P / 2, P / 2)
    EMBLEEM[d.voor.embleem](ctx)
  }
  const url = cv.toDataURL()
  previewCache.set(item.design, url)
  return url
}
