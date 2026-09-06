// Bazen. Groot genoeg (64-128 px) om ze met vormen op te bouwen in plaats van
// met losse pixelstrings; het silhouet moet op 480×270 in één oogopslag te
// lezen zijn.

import { Blad, nieuwCanvas } from '../core/atlas.js'
import { UI, lichter, donkerder } from './palet.js'

export const KONINGIN = { w: 64, h: 48 }
export const SLIJMBAL = { w: 10, h: 10 }

function ellips(ctx, cx, cy, rx, ry, kleur) {
  ctx.fillStyle = kleur
  for (let y = -ry; y <= ry; y++) {
    const b = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))))
    ctx.fillRect(Math.round(cx - b), Math.round(cy + y), b * 2 + 1, 1)
  }
}

function omtrek(ctx, cx, cy, rx, ry, kleur) {
  ctx.fillStyle = kleur
  for (let y = -ry; y <= ry; y++) {
    const b = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))))
    ctx.fillRect(Math.round(cx - b - 1), Math.round(cy + y), 1, 1)
    ctx.fillRect(Math.round(cx + b + 1), Math.round(cy + y), 1, 1)
  }
}

const cache = new Map()

// fase 1-3 verandert de kleur en de kroon, zodat je aan haar kunt zien hoe ver
// het gevecht is zonder naar de balk te kijken.
export function koninginBlad(palet, fase) {
  const sleutel = `kon-${palet.id}-${fase}`
  if (cache.has(sleutel)) return cache.get(sleutel)

  const basis = fase === 1 ? palet.deco[1] : fase === 2 ? palet.deco[2] : lichter(palet.deco[2], 0.15)
  const licht = lichter(basis, 0.3)
  const lijn = palet.rots.o

  // 0-3 idle, 4 hurken, 5 sprong, 6 landing, 7 spugen, 8 geraakt, 9-11 dood
  const poses = [
    { rx: 26, ry: 17, dy: 0, mond: 0, ogen: 'open' },
    { rx: 25, ry: 18, dy: -1, mond: 0, ogen: 'open' },
    { rx: 26, ry: 17, dy: 0, mond: 0, ogen: 'open' },
    { rx: 27, ry: 16, dy: 1, mond: 0, ogen: 'open' },
    { rx: 30, ry: 12, dy: 5, mond: 0, ogen: 'boos' },
    { rx: 22, ry: 21, dy: -4, mond: 0, ogen: 'boos' },
    { rx: 31, ry: 11, dy: 6, mond: 0, ogen: 'dicht' },
    { rx: 26, ry: 17, dy: 0, mond: 1, ogen: 'boos' },
    { rx: 28, ry: 14, dy: 3, mond: 1, ogen: 'kruis' },
    { rx: 29, ry: 12, dy: 5, mond: 1, ogen: 'kruis' },
    { rx: 31, ry: 8, dy: 9, mond: 1, ogen: 'kruis' },
    { rx: 33, ry: 4, dy: 13, mond: 0, ogen: 'kruis' },
  ]

  const blad = new Blad(KONINGIN.w, KONINGIN.h, poses.length)
  poses.forEach((pose, i) => {
    const { canvas, ctx } = nieuwCanvas(KONINGIN.w, KONINGIN.h)
    const cx = 32
    const cy = 30 + pose.dy

    // Lijf
    ellips(ctx, cx, cy, pose.rx, pose.ry, basis)
    ellips(ctx, cx, cy - 2, pose.rx - 6, pose.ry - 5, licht)
    omtrek(ctx, cx, cy, pose.rx, pose.ry, lijn)

    // Druppels die van haar afglijden
    ctx.fillStyle = basis
    for (const dx of [-18, -6, 8, 18]) {
      const h = 3 + ((i + dx) % 3)
      ctx.fillRect(cx + dx, cy + pose.ry - 1, 2, h)
    }

    // Kroon: één punt per fase erbij
    const punten = 4 - fase // 3, 2, 1 — ze verliest haar kroon
    ctx.fillStyle = UI.accent
    const kroonY = cy - pose.ry - 6
    ctx.fillRect(cx - 11, kroonY + 4, 22, 3)
    for (let k = 0; k < 5; k++) {
      if (k >= punten + 1) continue
      const x = cx - 10 + k * 5
      ctx.fillRect(x, kroonY, 3, 5)
      ctx.fillStyle = lichter(UI.accent, 0.5)
      ctx.fillRect(x, kroonY, 1, 2)
      ctx.fillStyle = UI.accent
    }
    ctx.fillStyle = donkerder(UI.accent, 0.4)
    ctx.fillRect(cx - 11, kroonY + 6, 22, 1)

    // Ogen
    const oogY = cy - 4
    if (pose.ogen === 'kruis') {
      ctx.fillStyle = lijn
      for (const ox of [-11, 6]) {
        for (let k = 0; k < 5; k++) {
          ctx.fillRect(cx + ox + k, oogY + k, 1, 1)
          ctx.fillRect(cx + ox + 4 - k, oogY + k, 1, 1)
        }
      }
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(cx - 12, oogY, 7, 6)
      ctx.fillRect(cx + 5, oogY, 7, 6)
      ctx.fillStyle = lijn
      const kijk = pose.ogen === 'boos' ? 1 : 0
      ctx.fillRect(cx - 10 + kijk, oogY + 2, 3, 3)
      ctx.fillRect(cx + 7 + kijk, oogY + 2, 3, 3)
      if (pose.ogen === 'boos') {
        ctx.fillRect(cx - 12, oogY - 1, 7, 2)
        ctx.fillRect(cx + 5, oogY - 1, 7, 2)
      }
      if (pose.ogen === 'dicht') {
        ctx.fillStyle = basis
        ctx.fillRect(cx - 12, oogY, 7, 4)
        ctx.fillRect(cx + 5, oogY, 7, 4)
        ctx.fillStyle = lijn
        ctx.fillRect(cx - 12, oogY + 3, 7, 1)
        ctx.fillRect(cx + 5, oogY + 3, 7, 1)
      }
    }

    // Mond
    ctx.fillStyle = lijn
    if (pose.mond) {
      ellips(ctx, cx, cy + 6, 6, 4, lijn)
      ellips(ctx, cx, cy + 7, 4, 2, donkerder(basis, 0.5))
    } else {
      ctx.fillRect(cx - 4, cy + 6, 9, 1)
      ctx.fillRect(cx - 5, cy + 5, 1, 1)
      ctx.fillRect(cx + 5, cy + 5, 1, 1)
    }

    blad.ctx.drawImage(canvas, i * KONINGIN.w, 0)
  })

  cache.set(sleutel, blad)
  return blad
}

export const KON_FRAME = {
  IDLE: 0, HURK: 4, SPRONG: 5, LANDING: 6, SPUGEN: 7, GERAAKT: 8, DOOD: 9,
}

// --- IJsworm (wereld 2) -----------------------------------------------------
// Alleen de kop is een sprite; het lijf wordt als een reeks segmenten langs de
// baan getekend, zodat de worm elke keer een andere boog kan maken.

export const WORMKOP = { w: 40, h: 40 }

export function ijswormBlad(palet, fase) {
  const sleutel = `worm-${palet.id}-${fase}`
  if (cache.has(sleutel)) return cache.get(sleutel)

  const schild = fase === 1 ? '#8fc4f0' : fase === 2 ? '#a9d4f8' : '#dceaff'
  const donker = '#2c4160'
  const lijn = '#16233d'

  // 0-1 dicht, 2-3 open (hap), 4 geraakt, 5-7 dood
  const poses = [
    { open: 0, ogen: 'boos' },
    { open: 1, ogen: 'boos' },
    { open: 5, ogen: 'boos' },
    { open: 7, ogen: 'boos' },
    { open: 2, ogen: 'kruis' },
    { open: 4, ogen: 'kruis' },
    { open: 2, ogen: 'kruis' },
    { open: 0, ogen: 'kruis' },
  ]

  const blad = new Blad(WORMKOP.w, WORMKOP.h, poses.length)
  poses.forEach((pose, i) => {
    const { canvas, ctx } = nieuwCanvas(WORMKOP.w, WORMKOP.h)
    const cx = 20
    const cy = 22

    // Pantserplaten rond de kop
    ellips(ctx, cx, cy, 15, 17, donker)
    ellips(ctx, cx, cy - 2, 13, 14, schild)
    omtrek(ctx, cx, cy, 15, 17, lijn)
    ctx.fillStyle = donkerder(schild, 0.18)
    for (let k = 0; k < 3; k++) ellips(ctx, cx, cy + 6 + k * 4, 13 - k * 3, 2, donkerder(schild, 0.2))

    // IJspunten op de rug
    ctx.fillStyle = '#ffffff'
    for (const [dx, h] of [[-9, 5], [0, 8], [9, 5]]) {
      for (let y = 0; y < h; y++) {
        const b = Math.max(1, Math.round(3 * (1 - y / h)))
        ctx.fillRect(cx + dx - b, cy - 16 - y, b * 2, 1)
      }
    }

    // Bek: opent naar beneden
    const opening = pose.open
    ctx.fillStyle = lijn
    ctx.fillRect(cx - 9, cy + 6, 18, 3 + opening)
    ctx.fillStyle = '#7a1f3a'
    if (opening > 2) ctx.fillRect(cx - 7, cy + 8, 14, opening - 2)
    // Tanden
    ctx.fillStyle = '#ffffff'
    for (let k = 0; k < 5; k++) {
      ctx.fillRect(cx - 8 + k * 4, cy + 6, 2, 2)
      if (opening > 3) ctx.fillRect(cx - 6 + k * 4, cy + 7 + opening, 2, 2)
    }

    // Ogen
    if (pose.ogen === 'kruis') {
      ctx.fillStyle = lijn
      for (const ox of [-9, 4]) {
        for (let k = 0; k < 5; k++) {
          ctx.fillRect(cx + ox + k, cy - 8 + k, 1, 1)
          ctx.fillRect(cx + ox + 4 - k, cy - 8 + k, 1, 1)
        }
      }
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(cx - 10, cy - 8, 6, 5)
      ctx.fillRect(cx + 4, cy - 8, 6, 5)
      ctx.fillStyle = '#ff6b6b'
      ctx.fillRect(cx - 8, cy - 7, 3, 3)
      ctx.fillRect(cx + 6, cy - 7, 3, 3)
      ctx.fillStyle = lijn
      ctx.fillRect(cx - 10, cy - 9, 6, 2)
      ctx.fillRect(cx + 4, cy - 9, 6, 2)
    }

    blad.ctx.drawImage(canvas, i * WORMKOP.w, 0)
  })

  cache.set(sleutel, blad)
  return blad
}

// Eén lijfsegment; de baas tekent er een handvol achter de kop aan.
export function tekenWormSegment(ctx, x, y, r, fase) {
  const schild = fase === 1 ? '#8fc4f0' : fase === 2 ? '#a9d4f8' : '#dceaff'
  ellips(ctx, x, y, r, r, '#2c4160')
  ellips(ctx, x, y - 1, r - 2, r - 2, schild)
  omtrek(ctx, x, y, r, r, '#16233d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(Math.round(x - 1), Math.round(y - r - 1), 2, 2)
}

// De bult in het ijs waar de worm onderdoor gaat, plus de barst waar hij zo
// meteen uitkomt. Zonder die aankondiging is de baas een gokspel.
export function tekenWormSpoor(ctx, x, y, fase, sterkte = 1) {
  const b = Math.round(13 * sterkte)
  // Donkere kern met een lichte rand: op een witte ijsvloer is een lichte bult
  // niet te zien, en juist deze bult is de enige aanwijzing waar hij zit.
  for (let i = -b; i <= b; i++) {
    const h = Math.round(Math.cos((i / b) * (Math.PI / 2)) * 7 * sterkte)
    ctx.fillStyle = '#2c4160'
    ctx.fillRect(Math.round(x + i), Math.round(y - h), 1, h + 2)
    ctx.fillStyle = fase === 3 ? '#ffffff' : '#8fc4f0'
    ctx.fillRect(Math.round(x + i), Math.round(y - h), 1, 2)
  }
  // Scheurtjes die vanaf de bult uitwaaieren
  ctx.fillStyle = '#16233d'
  for (const dx of [-b - 3, -b - 6, b + 3, b + 6]) {
    ctx.fillRect(Math.round(x + dx), Math.round(y), 2, 1)
  }
}

export function tekenWormBarst(ctx, x, y, deel) {
  ctx.fillStyle = '#16233d'
  const n = Math.min(5, 1 + Math.floor(deel * 5))
  const lijnen = [[0, 0, 2, 3], [-5, 2, 4, 2], [4, 2, 4, 2], [-9, 4, 5, 2], [7, 4, 5, 2]]
  for (let i = 0; i < n; i++) {
    const [dx, dy, w, h] = lijnen[i]
    ctx.fillRect(Math.round(x + dx), Math.round(y + dy), w, h)
  }
}

// --- Magmatitaan (wereld 3) -------------------------------------------------
// Een stenen reus met gloeiende naden. Als hij na een klap voorovergebogen
// blijft staan, komt zijn kop binnen springbereik — dat is het enige moment
// waarop je hem kunt raken, en dat moet je aan de houding kunnen zien.

export const TITAAN = { w: 88, h: 64 }

export function titaanBlad(palet, fase) {
  const sleutel = `titaan-${palet.id}-${fase}`
  if (cache.has(sleutel)) return cache.get(sleutel)

  const steen = fase === 1 ? '#472720' : fase === 2 ? '#3a2a2e' : '#2c1613'
  const licht = lichter(steen, 0.22)
  const naad = fase === 1 ? '#ff8c1a' : fase === 2 ? '#ff9b3d' : '#ffd76b'
  const lijn = '#140809'

  // 0-1 staan, 2 optillen, 3 slaan, 4-5 gebogen (kwetsbaar), 6 geraakt, 7-9 dood
  const poses = [
    { buk: 0, arm: 0, ogen: 1 },
    { buk: 1, arm: 0, ogen: 1 },
    { buk: -3, arm: -12, ogen: 1 },
    { buk: 6, arm: 10, ogen: 1 },
    { buk: 16, arm: 12, ogen: 0.5 },
    { buk: 15, arm: 12, ogen: 0.5 },
    { buk: 10, arm: 6, ogen: 0 },
    { buk: 20, arm: 14, ogen: 0 },
    { buk: 30, arm: 16, ogen: 0 },
    { buk: 42, arm: 18, ogen: 0 },
  ]

  const blad = new Blad(TITAAN.w, TITAAN.h, poses.length)
  poses.forEach((pose, i) => {
    const { canvas, ctx } = nieuwCanvas(TITAAN.w, TITAAN.h)
    const cx = 44
    const voetY = 62

    // Benen: twee zware blokken
    ctx.fillStyle = lijn
    ctx.fillRect(cx - 22, voetY - 16, 16, 16)
    ctx.fillRect(cx + 6, voetY - 16, 16, 16)
    ctx.fillStyle = steen
    ctx.fillRect(cx - 21, voetY - 15, 14, 14)
    ctx.fillRect(cx + 7, voetY - 15, 14, 14)
    ctx.fillStyle = naad
    ctx.fillRect(cx - 18, voetY - 8, 8, 2)
    ctx.fillRect(cx + 10, voetY - 8, 8, 2)

    // Romp, zakt mee met de buiging
    const rompY = voetY - 44 + pose.buk
    ctx.fillStyle = lijn
    ctx.fillRect(cx - 20, rompY, 40, 30)
    ctx.fillStyle = steen
    ctx.fillRect(cx - 19, rompY + 1, 38, 28)
    ctx.fillStyle = licht
    ctx.fillRect(cx - 19, rompY + 1, 38, 4)
    // Gloeiende barsten in de borst
    ctx.fillStyle = naad
    ctx.fillRect(cx - 12, rompY + 8, 24, 3)
    ctx.fillRect(cx - 4, rompY + 11, 3, 10)
    ctx.fillRect(cx + 6, rompY + 12, 8, 2)
    ctx.fillRect(cx - 14, rompY + 18, 7, 2)

    // Armen: de rechterarm is de vuist waarmee hij slaat
    const armY = rompY + 6 + pose.arm
    ctx.fillStyle = lijn
    ctx.fillRect(cx - 34, rompY + 4, 14, 22)
    ctx.fillRect(cx + 20, armY, 16, 20)
    ctx.fillStyle = steen
    ctx.fillRect(cx - 33, rompY + 5, 12, 20)
    ctx.fillRect(cx + 21, armY + 1, 14, 18)
    ctx.fillStyle = naad
    ctx.fillRect(cx + 24, armY + 8, 8, 3)

    // Kop
    const kopY = rompY - 16
    ctx.fillStyle = lijn
    ctx.fillRect(cx - 13, kopY, 26, 18)
    ctx.fillStyle = steen
    ctx.fillRect(cx - 12, kopY + 1, 24, 16)
    ctx.fillStyle = licht
    ctx.fillRect(cx - 12, kopY + 1, 24, 3)
    // Hoorns
    ctx.fillStyle = lijn
    ctx.fillRect(cx - 16, kopY - 6, 4, 8)
    ctx.fillRect(cx + 12, kopY - 6, 4, 8)
    // Ogen: doven uit naarmate hij het zwaarder krijgt
    if (pose.ogen > 0) {
      ctx.fillStyle = pose.ogen > 0.7 ? '#ffe14d' : naad
      ctx.fillRect(cx - 8, kopY + 6, 6, 4)
      ctx.fillRect(cx + 2, kopY + 6, 6, 4)
      ctx.fillStyle = lijn
      ctx.fillRect(cx - 8, kopY + 5, 6, 2)
      ctx.fillRect(cx + 2, kopY + 5, 6, 2)
    } else {
      ctx.fillStyle = lijn
      ctx.fillRect(cx - 8, kopY + 6, 6, 4)
      ctx.fillRect(cx + 2, kopY + 6, 6, 4)
    }

    blad.ctx.drawImage(canvas, i * TITAAN.w, 0)
  })

  cache.set(sleutel, blad)
  return blad
}

// Schokgolf over de vloer na een klap.
export function tekenSchokgolf(ctx, x, y, sterkte, tijd) {
  const h = Math.round(6 * sterkte)
  for (let i = 0; i < 5; i++) {
    const dy = Math.round(Math.sin(tijd * 26 + i) * 2)
    ctx.fillStyle = i < 2 ? '#ffd76b' : '#ff8c1a'
    ctx.fillRect(Math.round(x - 5 + i * 2), Math.round(y - h + dy), 2, h)
  }
  ctx.fillStyle = '#a3260a'
  ctx.fillRect(Math.round(x - 6), Math.round(y - 1), 12, 2)
}

// --- Kern-AI (wereld 4) -----------------------------------------------------
// Een zwevende kern met een schild van vier panelen. Zolang het schild dicht is
// stuiter je eraf; als het opengaat ligt de kern bloot.

export const KERN = { w: 64, h: 64 }

export function kernBlad(palet, fase) {
  const sleutel = `kern-${palet.id}-${fase}`
  if (cache.has(sleutel)) return cache.get(sleutel)

  const romp = '#333b4a'
  const licht = '#525c6e'
  const lijn = '#0d1017'
  const oog = fase === 1 ? '#3ef0ff' : fase === 2 ? '#ffe14d' : '#ff3ec8'

  // 0-3 dicht (draaiend), 4-5 open (kwetsbaar), 6 geraakt, 7-9 dood
  const poses = [
    { open: 0, draai: 0 }, { open: 0, draai: 1 }, { open: 0, draai: 2 }, { open: 0, draai: 3 },
    { open: 1, draai: 0 }, { open: 1, draai: 2 },
    { open: 1, draai: 1, stuk: 1 },
    { open: 1, draai: 0, stuk: 2 }, { open: 1, draai: 2, stuk: 3 }, { open: 1, draai: 1, stuk: 4 },
  ]

  const blad = new Blad(KERN.w, KERN.h, poses.length)
  poses.forEach((pose, i) => {
    const { canvas, ctx } = nieuwCanvas(KERN.w, KERN.h)
    const cx = 32
    const cy = 32

    // Schildpanelen: vier segmenten die bij het openen naar buiten schuiven.
    const uit = pose.open ? 9 : 2
    const hoeken = [0, 1, 2, 3].map((k) => (k * Math.PI) / 2 + (pose.draai * Math.PI) / 8)
    for (const hoek of hoeken) {
      const px = Math.round(cx + Math.cos(hoek) * (14 + uit))
      const py = Math.round(cy + Math.sin(hoek) * (14 + uit))
      ctx.fillStyle = lijn
      ctx.fillRect(px - 8, py - 8, 16, 16)
      ctx.fillStyle = pose.stuk ? donkerder(romp, 0.3) : romp
      ctx.fillRect(px - 7, py - 7, 14, 14)
      ctx.fillStyle = pose.stuk ? donkerder(licht, 0.3) : licht
      ctx.fillRect(px - 7, py - 7, 14, 3)
      ctx.fillStyle = pose.stuk ? '#7a1f3a' : oog
      ctx.fillRect(px - 3, py - 2, 6, 3)
    }

    // Kern
    ellips(ctx, cx, cy, 11, 11, lijn)
    ellips(ctx, cx, cy, 9, 9, pose.open ? '#7a1f3a' : romp)
    if (pose.open) {
      ellips(ctx, cx, cy, 6, 6, oog)
      ellips(ctx, cx, cy, 3, 3, '#ffffff')
    } else {
      ellips(ctx, cx, cy, 6, 6, licht)
      ctx.fillStyle = oog
      ctx.fillRect(cx - 5, cy - 2, 10, 4)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(cx - 5, cy - 2, 3, 2)
    }

    // Scheuren bij de doodsanimatie
    if (pose.stuk) {
      ctx.fillStyle = '#ffffff'
      for (let k = 0; k < pose.stuk * 2; k++) {
        const hoek = (k / 8) * Math.PI * 2
        ctx.fillRect(
          Math.round(cx + Math.cos(hoek) * 6), Math.round(cy + Math.sin(hoek) * 6),
          Math.round(Math.cos(hoek) * 8) || 1, Math.round(Math.sin(hoek) * 8) || 1,
        )
      }
    }

    blad.ctx.drawImage(canvas, i * KERN.w, 0)
  })

  cache.set(sleutel, blad)
  return blad
}

export function slijmbalBlad(palet) {
  const sleutel = `bal-${palet.id}`
  if (cache.has(sleutel)) return cache.get(sleutel)
  const blad = new Blad(SLIJMBAL.w, SLIJMBAL.h, 4)
  for (let i = 0; i < 4; i++) {
    const { canvas, ctx } = nieuwCanvas(SLIJMBAL.w, SLIJMBAL.h)
    const r = 4 - (i % 2 === 0 ? 0 : 1)
    ellips(ctx, 5, 5, r, 4, palet.deco[2])
    ellips(ctx, 5, 4, r - 2, 2, lichter(palet.deco[2], 0.4))
    omtrek(ctx, 5, 5, r, 4, palet.rots.o)
    blad.ctx.drawImage(canvas, i * SLIJMBAL.w, 0)
  }
  cache.set(sleutel, blad)
  return blad
}

// Levensbalk van de baas: apart getekend zodat elke baas dezelfde balk krijgt.
export function tekenLevensbalk(ctx, x, y, w, deel, naam, fase) {
  ctx.fillStyle = 'rgba(10,7,19,0.8)'
  ctx.fillRect(x - 2, y - 2, w + 4, 12)
  ctx.fillStyle = UI.paneelLicht
  ctx.fillRect(x, y, w, 6)
  ctx.fillStyle = fase === 3 ? UI.fout : fase === 2 ? UI.accent : UI.goed
  ctx.fillRect(x, y, Math.round(w * Math.max(0, deel)), 6)
  ctx.fillStyle = UI.paneelRand
  ctx.fillRect(x, y, w, 1)
  ctx.fillRect(x, y + 5, w, 1)
  // Scheidingsstreepjes tussen de drie fases
  ctx.fillStyle = UI.inkt
  ctx.fillRect(x + Math.round(w / 3), y, 1, 6)
  ctx.fillRect(x + Math.round((w * 2) / 3), y, 1, 6)
  return naam
}
