// Controleert elk level voordat het het spel in mag. Draait in Node en leest
// dezelfde leveldata als de game.
//
//   node tools/validate-levels.js
//
// Faalt met exit 1 zodra er iets mis is, zodat het in npm test meeloopt.

import { ALLE_LEVELS, muntenInLevel, kaartHash } from '../src/game/data/levels/index.js'
import { LEGENDA } from '../src/game/engine/tilemap.js'
import { zwaksteProfiel } from '../src/game/data/characters.js'
import { BASIS } from '../src/game/engine/physics.js'
import { LEVELS_PER_WERELD, isBaasLevel } from '../src/game/data/werelden.js'

const MIN_MUNTEN = 25
const MAX_MUNTEN = 60
const MIN_MUNTEN_BAAS = 10

// Bereikbaarheid wordt gerekend met de échte sprongbaan uit engine/physics.js,
// en met het zwakste character: wie hier doorheen komt, komt met elk character
// door het level.
//
// De boog: omhoog met zwaartekrachtOp tot het hoogste punt, daarna omlaag met
// zwaartekrachtNeer. De horizontale reikwijdte naar een doel op hoogte h is de
// afstand die je aflegt in de tijd tot je op die hoogte terugkomt — je mag dus
// hoger springen dan het doel en er weer op landen.
const profiel = zwaksteProfiel()
const TEGEL = 16
const G_OP = BASIS.zwaartekrachtOp
const G_NEER = BASIS.zwaartekrachtNeer
const SNELHEID = BASIS.ren * profiel.loop
const V_SPRONG = BASIS.sprong * profiel.sprong
const V_VEER = BASIS.sprong * 1.42 * profiel.sprong

const hoogte = (v) => (v * v) / (2 * G_OP)
const SPRONG_HOOG = Math.floor(hoogte(V_SPRONG) / TEGEL)
const VEER_HOOG = Math.floor(hoogte(V_VEER) / TEGEL)
const VAL_MAX = 16 // tegels vrije val voordat we het niet meer als route tellen

// Horizontale reikwijdte in tegels naar een doel dat `omhoogTegels` hoger ligt
// (negatief = lager). Marge van één tegel omdat je vanaf de rand van een tegel
// springt en op de rand van de volgende landt.
function reikwijdte(v, omhoogTegels) {
  const H = hoogte(v)
  const h = omhoogTegels * TEGEL
  if (h > H) return -1
  const tOp = v / G_OP
  const tNeer = Math.sqrt((2 * Math.max(0, H - h)) / G_NEER)
  return Math.floor(((tOp + tNeer) * SNELHEID) / TEGEL) + 1
}

const VAST = new Set(['#', 'b', 'I', '<', '>'])
const STAANBAAR = new Set([...VAST, '='])

const fouten = []
const waarschuwingen = []

function fout(level, tekst) { fouten.push(`${level.id}: ${tekst}`) }
function waarschuw(level, tekst) { waarschuwingen.push(`${level.id}: ${tekst}`) }

function tekenOp(kaart, x, y) {
  if (y < 0 || y >= kaart.length) return '.'
  const rij = kaart[y]
  if (x < 0 || x >= rij.length) return '.'
  return rij[x]
}

// Alle tegels waar je kunt staan: vaste grond eronder, en ruimte voor het
// lichaam (2 tegels hoog) erboven.
function staanbarePlekken(kaart) {
  const plekken = new Set()
  for (let y = 0; y < kaart.length; y++) {
    for (let x = 0; x < kaart[y].length; x++) {
      const onder = tekenOp(kaart, x, y + 1)
      if (!STAANBAAR.has(onder)) continue
      if (VAST.has(tekenOp(kaart, x, y))) continue
      if (VAST.has(tekenOp(kaart, x, y - 1))) continue
      plekken.add(`${x},${y}`)
    }
  }
  return plekken
}

function veerPlekken(kaart) {
  const set = new Set()
  for (let y = 0; y < kaart.length; y++) {
    for (let x = 0; x < kaart[y].length; x++) {
      if (tekenOp(kaart, x, y) === 'v') set.add(`${x},${y}`)
    }
  }
  return set
}

// Bewegende platforms verplaatsen zich; hun hele baan telt als staanbaar.
function platformPlekken(level) {
  const set = new Set()
  level.kaart.forEach((rij, y) => {
    for (let x = 0; x < rij.length; x++) {
      const t = rij[x]
      if (t !== 'M' && t !== 'N' && t !== 'V') continue
      const afstand = 4
      for (let d = -afstand; d <= afstand; d++) {
        if (t === 'M') { set.add(`${x + d},${y}`); set.add(`${x + d + 1},${y}`); set.add(`${x + d + 2},${y}`) }
        else if (t === 'N') { set.add(`${x},${y + d}`); set.add(`${x + 1},${y + d}`); set.add(`${x + 2},${y + d}`) }
        else { set.add(`${x},${y}`); set.add(`${x + 1},${y}`) }
      }
    }
  })
  return set
}

// Onzichtbare blokken worden pas vast als je ze raakt; voor de bereikbaarheid
// tellen ze mee als staanbaar, want daar zijn ze voor bedoeld.
function verborgenPlekken(kaart) {
  const set = new Set()
  for (let y = 0; y < kaart.length; y++) {
    for (let x = 0; x < kaart[y].length; x++) {
      if (tekenOp(kaart, x, y) === 'x') set.add(`${x},${y - 1}`)
    }
  }
  return set
}

function bereikbaar(level) {
  const kaart = level.kaart
  const staan = staanbarePlekken(kaart)
  for (const k of platformPlekken(level)) staan.add(k)
  for (const k of verborgenPlekken(kaart)) staan.add(k)
  const veren = veerPlekken(kaart)

  let start = null
  kaart.forEach((rij, y) => {
    const x = rij.indexOf('S')
    if (x >= 0) start = { x, y }
  })
  if (!start) return null

  const gezien = new Set([`${start.x},${start.y}`])
  const wachtrij = [start]

  while (wachtrij.length) {
    const hier = wachtrij.pop()
    const opVeer = veren.has(`${hier.x},${hier.y}`)
      || veren.has(`${hier.x - 1},${hier.y}`)
      || veren.has(`${hier.x + 1},${hier.y}`)
    const v = opVeer ? V_VEER : V_SPRONG
    const omhoog = opVeer ? VEER_HOOG : SPRONG_HOOG

    for (let dy = -omhoog; dy <= VAL_MAX; dy++) {
      const ver = reikwijdte(v, -dy)
      if (ver < 0) continue
      for (let dx = -ver; dx <= ver; dx++) {
        const nx = hier.x + dx
        const ny = hier.y + dy
        const sleutel = `${nx},${ny}`
        if (gezien.has(sleutel) || !staan.has(sleutel)) continue
        gezien.add(sleutel)
        wachtrij.push({ x: nx, y: ny })
      }
    }
  }
  return gezien
}

// Een munt is bereikbaar als er een bereikbare staanplek is van waaruit hij
// binnen de sprongboog ligt.
function muntBereikbaar(mx, my, bereik, veren) {
  for (const sleutel of bereik) {
    const [sx, sy] = sleutel.split(',').map(Number)
    const dy = sy - my // positief = de munt ligt hoger dan de staanplek
    if (dy < -VAL_MAX) continue
    const opVeer = veren.has(`${sx},${sy}`) || veren.has(`${sx - 1},${sy}`) || veren.has(`${sx + 1},${sy}`)
    // Een munt hoef je alleen aan te raken, niet erop te landen: het lichaam is
    // ruim een tegel hoog, dus één tegel extra marge omhoog.
    const ver = reikwijdte(opVeer ? V_VEER : V_SPRONG, dy - 1)
    if (ver < 0) continue
    if (Math.abs(sx - mx) <= ver) return true
  }
  return false
}

const hashes = []

for (const level of ALLE_LEVELS) {
  const kaart = level.kaart

  // Rijlengtes
  const breedte = kaart[0].length
  kaart.forEach((r, i) => {
    if (r.length !== breedte) fout(level, `rij ${i} is ${r.length} tekens, rij 0 is ${breedte}`)
  })

  // Legenda
  const legenda = { ...LEGENDA, ...(level.legenda ?? {}) }
  const onbekend = new Set()
  kaart.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      if (!legenda[r[x]]) onbekend.add(`'${r[x]}' (rij ${y}, kolom ${x})`)
    }
  })
  if (onbekend.size) fout(level, `onbekende tekens: ${[...onbekend].join(', ')}`)

  // Tellingen
  const tel = (teken) => kaart.reduce((n, r) => n + [...r].filter((c) => c === teken).length, 0)
  if (tel('S') !== 1) fout(level, `${tel('S')} startpunten, verwacht precies 1`)
  if (tel('F') !== 1) fout(level, `${tel('F')} finishes, verwacht precies 1`)
  if (tel('C') < 1) fout(level, 'geen checkpoint')

  const lang = breedte > 140
  if (lang && tel('C') < 2) waarschuw(level, `${breedte} tegels breed met maar ${tel('C')} checkpoint(s)`)

  // Munten
  const munten = muntenInLevel(level)
  const baas = isBaasLevel(level.index)
  const min = baas ? MIN_MUNTEN_BAAS : MIN_MUNTEN
  if (munten < min || munten > MAX_MUNTEN) {
    fout(level, `${munten} munten, verwacht tussen ${min} en ${MAX_MUNTEN}`)
  }

  // Hints
  const hints = tel('H')
  if (hints > (level.hints?.length ?? 0)) {
    fout(level, `${hints} hintbordjes maar ${level.hints?.length ?? 0} teksten in level.hints`)
  }

  // Capsules
  const capsules = tel('?')
  if (level.capsules && level.capsules.length < capsules) {
    waarschuw(level, `${capsules} capsules maar ${level.capsules.length} soorten opgegeven`)
  }

  // Baaslevel
  if (baas) {
    if (!level.baas) fout(level, 'baaslevel zonder level.baas')
    if (tel('Q') !== 1) fout(level, `${tel('Q')} baasplekken, verwacht precies 1`)
  } else if (tel('Q') > 0) {
    fout(level, 'baasplek (Q) in een regulier level')
  }

  // Doeltijd
  if (!level.doeltijd || level.doeltijd < 30) fout(level, `doeltijd ${level.doeltijd} is te kort`)
  if (!level.naam) fout(level, 'geen naam')

  // Bereikbaarheid
  const bereik = bereikbaar(level)
  const veren = veerPlekken(kaart)
  if (!bereik) {
    fout(level, 'geen startpunt gevonden voor de bereikbaarheidscheck')
  } else {
    let onbereikbaar = 0
    const plekken = []
    kaart.forEach((r, y) => {
      for (let x = 0; x < r.length; x++) {
        if (r[x] !== 'o') continue
        if (!muntBereikbaar(x, y, bereik, veren)) { onbereikbaar++; plekken.push(`(${x},${y})`) }
      }
    })
    if (onbereikbaar > 0) {
      fout(level, `${onbereikbaar} onbereikbare munt(en): ${plekken.slice(0, 8).join(' ')}${plekken.length > 8 ? ' …' : ''}`)
    }

    // Finish bereikbaar?
    let finish = null
    kaart.forEach((r, y) => { const x = r.indexOf('F'); if (x >= 0) finish = { x, y } })
    if (finish && !muntBereikbaar(finish.x, finish.y, bereik, veren)) {
      fout(level, `finish op (${finish.x},${finish.y}) lijkt onbereikbaar`)
    }
  }

  hashes.push({ id: level.id, hash: kaartHash(level), munten })
}

// Volledigheid van de gebouwde werelden
const perWereld = new Map()
for (const l of ALLE_LEVELS) {
  perWereld.set(l.wereld, (perWereld.get(l.wereld) ?? 0) + 1)
}
for (const [wereld, aantal] of perWereld) {
  if (aantal !== LEVELS_PER_WERELD) {
    fouten.push(`wereld ${wereld}: ${aantal} levels, verwacht ${LEVELS_PER_WERELD}`)
  }
}
const ids = ALLE_LEVELS.map((l) => l.id)
if (new Set(ids).size !== ids.length) fouten.push('dubbele level-id\'s')

// --- Rapport ---------------------------------------------------------------

console.log(`Levels gecontroleerd: ${ALLE_LEVELS.length}`)
for (const h of hashes) console.log(`  ${h.id}  munten ${String(h.munten).padStart(2)}  hash ${h.hash}`)
console.log(`Totaal munten: ${hashes.reduce((s, h) => s + h.munten, 0)}`)

if (waarschuwingen.length) {
  console.log('\nWaarschuwingen:')
  for (const w of waarschuwingen) console.log(`  ! ${w}`)
}

if (fouten.length) {
  console.error('\nFouten:')
  for (const f of fouten) console.error(`  x ${f}`)
  process.exit(1)
}

console.log('\nAlle levels in orde.')
