// Parallax. Vier tot vijf lagen per wereld, meerdere geanimeerd. Alles wordt
// één keer naar canvases gebakken; per frame worden er alleen nog een paar
// drawImage-aanroepen gedaan plus een handvol pixels voor de twinkeling.

import { nieuwCanvas, ruis } from '../core/atlas.js'
import { donkerder, lichter, meng } from './palet.js'

export const BREEDTE = 480
export const HOOGTE = 270
const LAAG_BREEDTE = 480 // lagen herhalen horizontaal

function bakLucht(p) {
  const { canvas, ctx } = nieuwCanvas(BREEDTE, HOOGTE)
  const tinten = p.lucht
  for (let y = 0; y < HOOGTE; y++) {
    const t = y / (HOOGTE - 1)
    const i = Math.min(tinten.length - 2, Math.floor(t * (tinten.length - 1)))
    const lokaal = t * (tinten.length - 1) - i
    ctx.fillStyle = meng(tinten[i], tinten[i + 1], lokaal)
    ctx.fillRect(0, y, BREEDTE, 1)
  }
  return canvas
}

function bakSterren(p, dichtheid = 220) {
  const { canvas, ctx } = nieuwCanvas(LAAG_BREEDTE, HOOGTE)
  for (let i = 0; i < dichtheid; i++) {
    const x = Math.floor(ruis(i, 1, 5) * LAAG_BREEDTE)
    const y = Math.floor(ruis(i, 2, 5) * (HOOGTE * 0.75))
    const helder = ruis(i, 3, 5)
    ctx.fillStyle = helder > 0.9 ? '#ffffff' : helder > 0.6 ? lichter(p.gloed, 0.5) : donkerder('#ffffff', 0.55)
    ctx.fillRect(x, y, 1, 1)
    if (helder > 0.96) {
      ctx.fillRect(x - 1, y, 3, 1)
      ctx.fillRect(x, y - 1, 1, 3)
    }
  }
  return canvas
}

// Twee manen (wereld 1), een planeet (wereld 5) of een verre installatie.
function bakHemellichamen(p, soort) {
  const { canvas, ctx } = nieuwCanvas(LAAG_BREEDTE, HOOGTE)
  const cirkel = (cx, cy, r, kleur, schaduwKleur) => {
    for (let y = -r; y <= r; y++) {
      const b = Math.floor(Math.sqrt(r * r - y * y))
      ctx.fillStyle = kleur
      ctx.fillRect(cx - b, cy + y, b * 2 + 1, 1)
      if (schaduwKleur) {
        const s = Math.floor(b * 0.45)
        ctx.fillStyle = schaduwKleur
        ctx.fillRect(cx + b - s * 2, cy + y, Math.max(0, s * 2), 1)
      }
    }
  }
  if (soort === 'twee-manen') {
    cirkel(360, 52, 22, lichter(p.deco[0], 0.35), donkerder(p.deco[1], 0.25))
    cirkel(408, 34, 11, lichter(p.deco[1], 0.5), donkerder(p.deco[2], 0.2))
    // Kraters
    ctx.fillStyle = donkerder(p.deco[1], 0.3)
    for (const [x, y, r] of [[352, 46, 4], [368, 58, 3], [356, 62, 2]]) cirkel(x, y, r, ctx.fillStyle)
  } else if (soort === 'planeet') {
    cirkel(150, 70, 46, donkerder(p.deco[2], 0.15), donkerder(p.deco[2], 0.45))
    ctx.fillStyle = donkerder(p.deco[1], 0.1)
    for (let i = 0; i < 5; i++) ctx.fillRect(104, 52 + i * 14, 92, 3)
  } else {
    cirkel(390, 60, 30, donkerder(p.lucht[3], 0.1), donkerder(p.lucht[2], 0.3))
  }
  return canvas
}

// Silhouetlaag: heuvels/bergen/gebouwen opgebouwd uit een simpele hoogtelijn.
function bakSilhouet(p, { kleur, hoogte, ruwheid, zaad, top }) {
  const { canvas, ctx } = nieuwCanvas(LAAG_BREEDTE, HOOGTE)
  const hoogtes = new Array(LAAG_BREEDTE)
  for (let x = 0; x < LAAG_BREEDTE; x++) {
    // Drie golven op elkaar: geeft een natuurlijke, herhaalbare skyline.
    const a = Math.sin((x / LAAG_BREEDTE) * Math.PI * 2 * 2 + zaad) * 0.5
    const b = Math.sin((x / LAAG_BREEDTE) * Math.PI * 2 * 5 + zaad * 2) * 0.28
    const c = Math.sin((x / LAAG_BREEDTE) * Math.PI * 2 * 11 + zaad * 3) * 0.12
    hoogtes[x] = Math.round(hoogte * (0.55 + (a + b + c) * ruwheid))
  }
  for (let x = 0; x < LAAG_BREEDTE; x++) {
    const h = hoogtes[x]
    ctx.fillStyle = kleur
    ctx.fillRect(x, HOOGTE - h, 1, h)
    if (top) {
      ctx.fillStyle = top
      ctx.fillRect(x, HOOGTE - h, 1, 2)
    }
  }
  return canvas
}

// Kristallen/bomen/pilaren op de middenlaag: geeft de laag herkenbare vorm in
// plaats van alleen een silhouet.
function bakMidden(p, soort) {
  const { canvas, ctx } = nieuwCanvas(LAAG_BREEDTE, HOOGTE)
  const basis = HOOGTE - 40
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(ruis(i, 7, 11) * LAAG_BREEDTE)
    const h = 30 + Math.floor(ruis(i, 8, 11) * 70)
    const b = 6 + Math.floor(ruis(i, 9, 11) * 10)
    const kleur = donkerder(p.deco[1], 0.35 + ruis(i, 10, 11) * 0.2)
    if (soort === 'kristal') {
      // Zeshoekige kristalzuil met een lichte kern.
      for (let y = 0; y < h; y++) {
        const t = y / h
        const w = Math.max(1, Math.round(b * (1 - t * 0.75)))
        ctx.fillStyle = kleur
        ctx.fillRect(x - w, basis - y, w * 2, 1)
        if (y > h * 0.15 && y < h * 0.8 && w > 2) {
          ctx.fillStyle = donkerder(p.deco[0], 0.25)
          ctx.fillRect(x - 1, basis - y, 2, 1)
        }
      }
    } else if (soort === 'pilaar') {
      // Basaltzuilen: smal, recht en met alleen een lichte kant. Horizontale
      // banden zouden er metselwerk van maken.
      const smal = Math.max(3, Math.round(b * 0.6))
      ctx.fillStyle = kleur
      ctx.fillRect(x - smal, basis - h, smal * 2, h)
      ctx.fillStyle = lichter(kleur, 0.18)
      ctx.fillRect(x - smal, basis - h, 2, h)
      ctx.fillStyle = donkerder(kleur, 0.35)
      ctx.fillRect(x + smal - 2, basis - h, 2, h)
      // Afgebroken top
      ctx.fillStyle = lichter(kleur, 0.28)
      ctx.fillRect(x - smal, basis - h, smal * 2, 2)
    } else {
      ctx.fillStyle = kleur
      for (let y = 0; y < h; y++) {
        const w = Math.max(1, Math.round(b * (1 - (y / h) * 0.4)))
        ctx.fillRect(x - w, basis - y, w * 2, 1)
      }
    }
  }
  return canvas
}

const CONFIG = {
  kristalwoud: { hemel: 'twee-manen', midden: 'kristal', deeltje: 'stof', sterren: 240 },
  ijsmaan: { hemel: 'twee-manen', midden: 'kristal', deeltje: 'sneeuw', sterren: 300, aurora: true },
  vulkaan: { hemel: 'anders', midden: 'pilaar', deeltje: 'as', sterren: 90 },
  station: { hemel: 'anders', midden: 'pilaar', deeltje: 'stof', sterren: 180 },
  nevel: { hemel: 'planeet', midden: 'kristal', deeltje: 'sterrenstof', sterren: 340 },
}

const cache = new Map()

export function achtergrond(p) {
  if (cache.has(p.id)) return cache.get(p.id)
  const cfg = CONFIG[p.id] ?? CONFIG.kristalwoud

  const lagen = {
    lucht: bakLucht(p),
    sterren: bakSterren(p, cfg.sterren),
    hemel: bakHemellichamen(p, cfg.hemel),
    // Verre en middellagen krijgen een kleur tússen de lucht en de rots in.
    // Bijna zwart zou ze als vaste grond laten lezen, en in een verticaal level
    // sta je dan naar heuvels te kijken alsof het platforms zijn.
    ver: bakSilhouet(p, { kleur: meng(p.lucht[3], p.rots.s, 0.45), hoogte: 120, ruwheid: 0.6, zaad: 0.4, top: meng(p.lucht[3], p.deco[2], 0.4) }),
    midden: bakMidden(p, cfg.midden),
    dichtbij: bakSilhouet(p, { kleur: meng(p.lucht[3], p.rots.o, 0.6), hoogte: 70, ruwheid: 0.9, zaad: 2.1 }),
    // Bijna zwart: de voorgrond moet als een silhouet vóór het level lezen, niet
    // als een tweede laag modder over de vloer.
    voorgrond: bakSilhouet(p, { kleur: donkerder(p.rots.o, 0.55), hoogte: 22, ruwheid: 1.2, zaad: 5.3 }),
  }

  const uit = { palet: p, cfg, lagen, deeltjes: maakDeeltjes(cfg.deeltje) }
  cache.set(p.id, uit)
  return uit
}

// Zwevende deeltjes (stof, sneeuw, as, sterrenstof). Vaste pool, geen
// allocaties tijdens het spelen.
function maakDeeltjes(soort) {
  const n = soort === 'sneeuw' ? 90 : soort === 'as' ? 70 : 55
  const lijst = new Array(n)
  for (let i = 0; i < n; i++) {
    lijst[i] = {
      x: ruis(i, 21, 3) * BREEDTE,
      y: ruis(i, 22, 3) * HOOGTE,
      vx: (ruis(i, 23, 3) - 0.5) * 14,
      vy: soort === 'as' ? -6 - ruis(i, 24, 3) * 10 : 8 + ruis(i, 24, 3) * 18,
      fase: ruis(i, 25, 3) * Math.PI * 2,
      grootte: ruis(i, 26, 3) > 0.85 ? 2 : 1,
    }
  }
  return { soort, lijst }
}

export function updateDeeltjes(ag, dt) {
  const { lijst, soort } = ag.deeltjes
  for (const d of lijst) {
    d.fase += dt * 2
    d.x += (d.vx + Math.sin(d.fase) * (soort === 'sneeuw' ? 10 : 4)) * dt
    d.y += d.vy * dt
    if (d.y > HOOGTE + 4) { d.y = -4; d.x = ruis(Math.floor(d.x * 7), 31, 9) * BREEDTE }
    if (d.y < -4) { d.y = HOOGTE + 4 }
    if (d.x > BREEDTE + 4) d.x = -4
    if (d.x < -4) d.x = BREEDTE + 4
  }
}

function herhaalTeken(ctx, canvas, offset, dy = 0) {
  const w = canvas.width
  let x = -(((offset % w) + w) % w)
  while (x < BREEDTE) {
    ctx.drawImage(canvas, Math.round(x), Math.round(dy))
    x += w
  }
}

// camX in wereldpixels; camY is de verticale camerapositie ten opzichte van de
// ONDERkant van het level (0 = camera helemaal onderin, negatief = hoger).
//
// Dat is het verschil tussen achtergrond en decor: de heuvels staan op de bodem
// van de wereld, niet aan de onderkant van het scherm geplakt. Klim je in een
// verticaal level omhoog, dan zakken ze uit beeld in plaats van met je mee te
// stijgen — zonder dit lijken ze halverwege het scherm op vaste grond.
export function tekenAchtergrond(ctx, ag, camX, camY, tijd) {
  const p = ag.palet
  ctx.drawImage(ag.lagen.lucht, 0, 0)

  if (ag.cfg.aurora) tekenAurora(ctx, p, tijd)

  herhaalTeken(ctx, ag.lagen.sterren, camX * 0.04, -camY * 0.02)
  // Twinkeling: een handjevol sterren die per frame oplichten.
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 14; i++) {
    const f = tijd * 0.7 + i * 1.37
    if (Math.sin(f) > 0.86) {
      const x = Math.floor(ruis(i, 41, 2) * BREEDTE)
      const y = Math.floor(ruis(i, 42, 2) * HOOGTE * 0.7)
      ctx.fillRect(x, y, 1, 1)
      ctx.fillRect(x - 1, y, 3, 1)
    }
  }

  herhaalTeken(ctx, ag.lagen.hemel, camX * 0.07, -camY * 0.03)
  herhaalTeken(ctx, ag.lagen.ver, camX * 0.18, -camY * 0.06 + 24)
  herhaalTeken(ctx, ag.lagen.midden, camX * 0.38, -camY * 0.12 + 10)
  herhaalTeken(ctx, ag.lagen.dichtbij, camX * 0.62, -camY * 0.2)

  tekenDeeltjes(ctx, ag)
}

// Voorgrond komt ná de entiteiten, en beweegt sneller dan de speler.
export function tekenVoorgrond(ctx, ag, camX, camY) {
  herhaalTeken(ctx, ag.lagen.voorgrond, camX * 1.35, -camY * 0.3 + 16)
}

function tekenDeeltjes(ctx, ag) {
  const { lijst, soort } = ag.deeltjes
  ctx.fillStyle =
    soort === 'sneeuw' ? '#ffffff'
      : soort === 'as' ? lichter(ag.palet.deco[1], 0.1)
        : lichter(ag.palet.gloed, 0.3)
  for (const d of lijst) {
    ctx.fillRect(Math.round(d.x), Math.round(d.y), d.grootte, d.grootte)
  }
}

// Noorderlicht: drie dunne, gekleurde banden. Bewust ijl gehouden — het is
// sfeer aan de hemel, geen tweede wolkendek.
function tekenAurora(ctx, p, tijd) {
  const kleuren = ['#5ef2b0', '#7bd8ff', '#c78bff']
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = 0.1 - i * 0.02
    ctx.fillStyle = kleuren[i]
    for (let x = 0; x < BREEDTE; x += 2) {
      const y = 26 + i * 16 + Math.sin(x * 0.017 + tijd * 0.35 + i * 1.3) * 11
      const hoogte = 10 + Math.sin(x * 0.03 + tijd * 0.6) * 5
      ctx.fillRect(x, Math.round(y), 2, Math.round(hoogte))
    }
  }
  ctx.globalAlpha = 1
}

// Vignette en color grading: één keer gebakken, per frame één drawImage.
const gradeCache = new Map()
export function tekenSfeer(ctx, p) {
  let laag = gradeCache.get(p.id)
  if (!laag) {
    const { canvas, ctx: c } = nieuwCanvas(BREEDTE, HOOGTE)
    const g = c.createRadialGradient(BREEDTE / 2, HOOGTE / 2, HOOGTE * 0.35, BREEDTE / 2, HOOGTE / 2, HOOGTE * 0.85)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    // Licht gehouden: de vignette mag sfeer geven, maar de vloer en de
    // vijanden aan de rand van het beeld moeten leesbaar blijven.
    g.addColorStop(1, 'rgba(0,0,0,0.26)')
    c.fillStyle = g
    c.fillRect(0, 0, BREEDTE, HOOGTE)
    c.fillStyle = p.grade
    c.fillRect(0, 0, BREEDTE, HOOGTE)
    laag = canvas
    gradeCache.set(p.id, laag)
  }
  ctx.drawImage(laag, 0, 0)
}
