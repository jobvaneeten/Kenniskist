// Prints en patronen "op het lijf" tekenen.
//
// Een uitgevouwen kledingstuk bestaat uit losse stukken stof (UV-eilanden) die
// alle kanten op gedraaid liggen: het voorpand van het shirt ligt op zijn zij,
// de broekspijpen schuin. Wie gewoon een patroon over de hele lap tekent,
// krijgt dus panda's op hun zij en strepen die alle kanten op lopen.
//
// Daarom per eiland: uit de 3D-posities van het model halen welke kant "omhoog"
// is en hoe groot een centimeter daar is, en het patroon in die richting en op
// die maat tekenen, afgeknipt op het eiland. Rijen liggen op vaste hoogtes van
// het lijf, dus een verloop of regenboog loopt over het hele kledingstuk door.

import { leesMesh, huidigeResolutie } from './skins'

// Afmetingen van het patroon in meters, per kledingstuk (schoenen zijn klein).
const MAAT = { shirt: 1, broek: 1, sokken: 0.75, schoenen: 0.6 }

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

const hash = (i, j) => (Math.imul(i, 73856093) ^ Math.imul(j, 19349663)) >>> 0

const rgb = (hex) => {
  const h = hex.replace('#', '')
  const n = h.length === 3 ? h.split('').map(x => x + x).join('') : h
  return [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16))
}
const meng = (a, b, t) => `rgb(${rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t)).join(',')})`

function lichter(hex, amt) {
  const h = hex.replace('#', '')
  const n = h.length === 3 ? h.split('').map(x => x + x).join('') : h
  const c = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16))
  return `rgb(${c.map(v => Math.round(v + (255 - v) * amt)).join(',')})`
}

// ── lijf-kaart: elk punt van het model krijgt 2D-coördinaten (p, q) in meters
// q = −hoogte (omlaag). p = rondom het lichaam (shirt/broek) of rondom het
// eigen been (sokken); schoenen per kant geprojecteerd (zijkant, neus, boven).
// Omdat (p, q) uit de 3D-positie komt, loopt een patroon naadloos over de
// naden tussen lapjes heen.
const kaartCache = new Map()

function maakKaart(mesh, type) {
  const { pos } = mesh
  let yMin = Infinity, yMax = -Infinity, zSom = 0
  for (const v of pos) { yMin = Math.min(yMin, v[1]); yMax = Math.max(yMax, v[1]); zSom += v[2] }
  const zMid = zSom / pos.length
  // assen van de benen (sokken): gemiddelde x/z per kant
  const been = [1, -1].map(k => {
    const vs = pos.filter(v => Math.sign(v[0]) === k)
    return [vs.reduce((t, v) => t + v[0], 0) / vs.length, vs.reduce((t, v) => t + v[2], 0) / vs.length]
  })
  // Hoek rondom de as, met de naad op de linkerzij (zoals echte zijnaden):
  // voor, rechterzij en rug lopen zo zonder breuk door.
  const rond = (x, z, ax, az, R) => R * Math.atan2(-(z - az), x - ax)
  const punt = (v, n) => {
    if (type === 'schoenen') {
      const an = n.map(Math.abs)
      if (an[1] >= an[0] && an[1] >= an[2]) return [v[0], v[2]]          // boven/zool
      if (an[0] >= an[2]) return [Math.sign(n[0]) * v[2], -v[1]]         // zijkant
      return [Math.sign(n[2]) * -v[0], -v[1]]                             // neus/hiel
    }
    if (type === 'sokken') {
      const [ax, az] = v[0] >= 0 ? been[0] : been[1]
      return [rond(v[0], v[2], ax, az, 0.06), -v[1]]
    }
    return [rond(v[0], v[2], 0, zMid, type === 'broek' ? 0.17 : 0.2), -v[1]]
  }
  return { punt, yMin, yMax, omtrek: type === 'sokken' ? 0.06 * 2 * Math.PI : 0.2 * 2 * Math.PI }
}

async function kaartVan(url, type) {
  const key = url + '|' + type
  if (!kaartCache.has(key)) {
    kaartCache.set(key, leesMesh(url).then(m => (m ? { mesh: m, ...maakKaart(m, type) } : null)))
  }
  return kaartCache.get(key)
}

// ── patronen, in meters: x naar rechts, Y = −hoogte (dus omlaag) ────────────
function tekenPatroon(ctx, item, b, maat, info, img) {
  const { x0, x1, y0, y1 } = b
  const breed = x1 - x0, hoog = y1 - y0
  if (item.kind === 'print') {
    const t = 0.075 * maat
    const sz = t * 0.78
    let rij = Math.floor(y0 / t)
    for (let y = rij * t; y < y1 + t; y += t, rij++) {
      const off = (rij % 2) ? t / 2 : 0
      for (let x = Math.floor(x0 / t) * t - t + off; x < x1 + t; x += t) {
        if (img && img.width) ctx.drawImage(img, x - sz / 2, y - sz / 2, sz, sz)
        else {
          ctx.save(); ctx.translate(x, y); ctx.scale(0.01, 0.01)
          ctx.font = `${sz * 100}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(item.emoji || '⭐', 0, 0)
          ctx.restore()
        }
      }
    }
    return
  }
  const { pattern, c1, c2 } = item
  const p = 0.05 * maat
  if (pattern === 'stripes') {
    ctx.strokeStyle = c2; ctx.lineWidth = p * 0.5
    for (let k = Math.floor((x0 + y0) / p) - 1; k * p < x1 + y1 + p; k++) {
      ctx.beginPath(); ctx.moveTo(k * p - y0 + 0.001, y0); ctx.lineTo(k * p - y1, y1); ctx.stroke()
    }
  } else if (pattern === 'zigzag') {
    ctx.strokeStyle = c2; ctx.lineWidth = p * 0.32; ctx.lineJoin = 'miter'
    for (let y = Math.floor(y0 / p) * p; y < y1 + p; y += p) {
      ctx.beginPath()
      for (let x = Math.floor(x0 / p) * p - p, k = 0; x < x1 + p; x += p / 2, k++) ctx.lineTo(x, y + (k % 2 ? p * 0.3 : -p * 0.3))
      ctx.stroke()
    }
  } else if (pattern === 'dots') {
    ctx.fillStyle = c2
    let rij = Math.floor(y0 / p)
    for (let y = rij * p; y < y1 + p; y += p, rij++) {
      for (let x = Math.floor(x0 / p) * p - p + (rij % 2 ? p / 2 : 0); x < x1 + p; x += p) {
        ctx.beginPath(); ctx.arc(x, y, p * 0.22, 0, Math.PI * 2); ctx.fill()
      }
    }
  } else if (pattern === 'checker') {
    const c = p * 0.85
    ctx.fillStyle = c2
    for (let r = Math.floor(y0 / c); r * c < y1; r++) {
      for (let k = Math.floor(x0 / c); k * c < x1; k++) if ((r + k) % 2 === 0) ctx.fillRect(k * c, r * c, c, c)
    }
  } else if (pattern === 'camo') {
    // Vlekken op een vast raster op het lijf (hash per vakje), zodat ze over
    // de naden heen doorlopen.
    // Alleen tinten van de eigen twee kleuren — roze camo krijgt geen groene vlekken.
    const kleuren = [c2, meng(c1, c2, 0.5), meng(c2, '#000000', 0.35), meng(c1, '#ffffff', 0.18)]
    for (let i = Math.floor(x0 / p) - 1; i * p < x1 + p; i++) {
      for (let j = Math.floor(y0 / p) - 1; j * p < y1 + p; j++) {
        const r = rng(hash(i, j))
        ctx.fillStyle = kleuren[Math.floor(r() * 4)]
        ctx.beginPath()
        ctx.ellipse((i + r()) * p, (j + r()) * p, p * (0.35 + r() * 0.6), p * (0.25 + r() * 0.45), r() * Math.PI, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else if (pattern === 'denim') {
    // Diagonaal keperweefsel met lichte slijtplekken.
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = p * 0.06
    const q = p * 0.16
    for (let k = Math.floor((x0 - y1) / q) - 1; k * q < x1 - y0 + q; k++) {
      ctx.beginPath(); ctx.moveTo(k * q + y0, y0); ctx.lineTo(k * q + y1, y1); ctx.stroke()
    }
    const v = p * 3
    for (let i = Math.floor(x0 / v) - 1; i * v < x1 + v; i++) {
      for (let j = Math.floor(y0 / v) - 1; j * v < y1 + v; j++) {
        const r = rng(hash(i, j))
        const x = (i + r()) * v, y = (j + r()) * v
        const g = ctx.createRadialGradient(x, y, 0, x, y, p * 1.4)
        g.addColorStop(0, 'rgba(190,215,240,0.2)'); g.addColorStop(1, 'rgba(190,215,240,0)')
        ctx.fillStyle = g; ctx.fillRect(x - p * 1.4, y - p * 1.4, p * 2.8, p * 2.8)
      }
    }
  } else if (pattern === 'gradient' || pattern === 'rainbow') {
    // Over de hele hoogte van het kledingstuk, niet per lapje.
    const boven = -info.yMax, onder = -info.yMin
    const g = ctx.createLinearGradient(0, boven, 0, onder)
    if (pattern === 'gradient') { g.addColorStop(0, c1); g.addColorStop(1, c2) } else {
      const banden = ['#e63946', '#f77f00', '#f4c430', '#2d9e4f', '#1d6fa4', '#7b2d8b']
      banden.forEach((b2, i) => { g.addColorStop(i / banden.length, b2); g.addColorStop((i + 1) / banden.length - 0.001, b2) })
    }
    ctx.fillStyle = g; ctx.fillRect(x0, y0, breed, hoog)
  }
}

// Loopt alle driehoeken langs en roept `teken(ctx, grenzen)` aan met de
// canvas zo ingesteld dat je in lijf-meters tekent (x rondom, y = −hoogte),
// afgeknipt op die driehoek. Zo loopt alles wat je tekent naadloos door over
// de naden tussen de lapjes.
function opLijf(ctx, S, info, maat, teken) {
  const { pos, uv, idx } = info.mesh
  for (let t = 0; t < idx.length; t += 3) {
    const ids = [idx[t], idx[t + 1], idx[t + 2]]
    const P = ids.map(i => pos[i])
    const e1 = [0, 1, 2].map(k => P[1][k] - P[0][k]), e2 = [0, 1, 2].map(k => P[2][k] - P[0][k])
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const pq = P.map(v => info.punt(v, n))
    // Naad van "rondom": een driehoek die over de zijnaad heen gaat.
    const o = info.omtrek
    if (Math.max(...pq.map(a => a[0])) - Math.min(...pq.map(a => a[0])) > o / 2) pq.forEach(a => { if (a[0] < 0) a[0] += o })
    // Affiene afbeelding (p, q) → (u, v) uit de drie hoekpunten.
    const [a, b, c] = pq, U = ids.map(i => uv[i])
    const d = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])
    if (Math.abs(d) < 1e-10) continue
    const m = (k) => {
      const f1 = U[1][k] - U[0][k], f2 = U[2][k] - U[0][k]
      const dp = (f1 * (c[1] - a[1]) - f2 * (b[1] - a[1])) / d
      const dq = (f2 * (b[0] - a[0]) - f1 * (c[0] - a[0])) / d
      return [dp, dq, U[0][k] - dp * a[0] - dq * a[1]]
    }
    const mu = m(0), mv = m(1)
    // Driehoek iets opgeblazen (1px) tegen naadjes.
    const cu = (U[0][0] + U[1][0] + U[2][0]) / 3 * S, cvv = (U[0][1] + U[1][1] + U[2][1]) / 3 * S
    ctx.save()
    ctx.beginPath()
    U.forEach(([u, v], k) => {
      const x = u * S, y = v * S, dx = x - cu, dy = y - cvv, l = Math.hypot(dx, dy) || 1
      const X = x + dx / l * 1.2, Y = y + dy / l * 1.2
      k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)
    })
    ctx.closePath(); ctx.clip()
    ctx.setTransform(S * mu[0], S * mv[0], S * mu[1], S * mv[1], S * mu[2], S * mv[2])
    const marge = 0.08 * maat
    teken(ctx, { x0: Math.min(a[0], b[0], c[0]) - marge, x1: Math.max(a[0], b[0], c[0]) + marge,
      y0: Math.min(a[1], b[1], c[1]) - marge, y1: Math.max(a[1], b[1], c[1]) + marge })
    ctx.restore()
  }
}

// Volledige textuur voor een print of patroon op een donor-model. Geeft null
// als het model niet te lezen is; dan valt applyClothing terug op de oude lap.
export async function bouwKledingTextuur(item, type, donor, img) {
  const info = await kaartVan(donor, type)
  if (!info) return null
  const S = huidigeResolutie()
  const cv = document.createElement('canvas')
  cv.width = S; cv.height = S
  const ctx = cv.getContext('2d')
  const basis = item.kind === 'print' ? item.bg : item.c1
  ctx.fillStyle = basis; ctx.fillRect(0, 0, S, S)
  const maat = MAAT[type] ?? 1
  const belicht = item.kind === 'print'
    ? (() => { const g = ctx.createLinearGradient(0, -info.yMax, 0, -info.yMin); g.addColorStop(0, lichter(item.bg, 0.14)); g.addColorStop(1, item.bg); return g })()
    : null
  opLijf(ctx, S, info, maat, (c, bnd) => {
    if (belicht) { c.fillStyle = belicht; c.fillRect(bnd.x0, bnd.y0, bnd.x1 - bnd.x0, bnd.y1 - bnd.y0) }
    tekenPatroon(c, item, bnd, maat, info, img)
  })
  return cv
}

// Achtergrond van een skin (skins.js) op het lijf: het getekende vlak
// (`patroon`, een canvas) beslaat `tegel` meter en herhaalt zich; zo staan
// tijgerstrepen, sterren en rasters op elk lapje even groot en dezelfde kant op.
export async function tekenSkinBasisOpLijf(ctx, S, type, donor, patroon) {
  const info = await kaartVan(donor, type)
  if (!info) return false
  const maat = MAAT[type] ?? 1
  const tegel = 1.2 * maat
  const vulling = ctx.createPattern(patroon, 'repeat')
  vulling.setTransform(new DOMMatrix().scale(tegel / patroon.width))
  opLijf(ctx, S, info, maat, (c, bnd) => {
    c.fillStyle = vulling
    c.fillRect(bnd.x0, bnd.y0, bnd.x1 - bnd.x0, bnd.y1 - bnd.y0)
  })
  return true
}
