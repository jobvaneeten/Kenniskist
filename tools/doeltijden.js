// Controleert (en met --schrijf: herberekent) de doeltijden.
//
//   node tools/doeltijden.js            controleren
//   node tools/doeltijden.js --schrijf  de doeltijd in elk levelbestand bijwerken
//
// Waarom een formule en niet met de hand: met tachtig levels wordt handwerk
// onvermijdelijk inconsistent — het ene level krijgt een doeltijd die je met
// stilstaan haalt, het andere een die niemand haalt. De schatting hieronder
// benadert een rechttoe-rechtaan run; de doeltijd is een veelvoud daarvan.
//
// Dat veelvoud loopt af per wereld: in wereld 1 mag je rustig rondkijken, in
// wereld 5 wordt de tijdster een echte prestatie. De doelgroep is groep 4-8,
// dus zelfs de krapste factor laat ruim tijd over voor een paar missers.

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { ALLE_LEVELS } from '../src/game/data/levels/index.js'
import { BASIS } from '../src/game/engine/physics.js'
import { isBaasLevel } from '../src/game/data/werelden.js'

const TEGEL = 16
const SCHRIJF = process.argv.includes('--schrijf')

// Factor per wereld: hoeveel keer de rechttoe-rechtaan run mag je erover doen.
const FACTOR = { 1: 4.4, 2: 4.1, 3: 3.8, 4: 3.5, 5: 3.2 }
const FACTOR_BAAS = 2.8
const MARGE = 0.12 // hoeveel de opgeslagen waarde van de formule mag afwijken

// Wachttijd per obstakel dat op een cadans loopt. Ruw, maar het verschil tussen
// drie geisers en tien geisers is precies wat we willen meewegen.
const WACHT = {
  v: 0.4, G: 1.4, j: 1.0, k: 1.0, z: 0.5,
  // Verdwijnende platforms en zinkbruggen tellen per tegel, maar je wacht per
  // groep van vier — vandaar een kwart van de kosten per tegel.
  ':': 0.2, ';': 0.2,
  '@': 0.6, '(': 0.4, M: 1.6, N: 1.6, V: 0.6, W: 0.8, O: 0.8,
}
const VIJAND_KOST = 0.55
const VIJANDEN = 'EJKBPYWZLAURDXOnrcmwe'.split('')

function tel(kaart, teken) {
  return kaart.reduce((n, r) => n + [...r].filter((c) => c === teken).length, 0)
}

// Geschatte duur van een run zonder omwegen en zonder doodgaan.
function schat(level) {
  const kaart = level.kaart
  const breedte = kaart[0].length
  const hoogte = kaart.length

  const heen = (breedte * TEGEL) / (BASIS.ren * 0.82)
  // Verticale levels: klimmen kost per rij ongeveer een halve sprong.
  const klim = hoogte > 20 ? (hoogte - 17) * 0.42 : 0

  let wacht = 0
  for (const [teken, kost] of Object.entries(WACHT)) wacht += tel(kaart, teken) * kost

  const vijanden = VIJANDEN.reduce((n, t) => n + tel(kaart, t), 0)
  const munten = tel(kaart, 'o') * 0.12

  return heen + klim + wacht + vijanden * VIJAND_KOST + munten
}

// Baasgevechten zijn geen looproute: negen rake klappen met wachten ertussen.
const schatBaas = () => 9 * 7

function doelVoor(level) {
  const basis = isBaasLevel(level.index) ? schatBaas() : schat(level)
  const factor = isBaasLevel(level.index) ? FACTOR_BAAS : (FACTOR[level.wereld] ?? 4)
  return Math.round((basis * factor) / 5) * 5
}

const regels = []
const fouten = []
const teSchrijven = []

for (const level of ALLE_LEVELS) {
  const berekend = doelVoor(level)
  const afwijking = Math.abs(level.doeltijd - berekend) / berekend
  regels.push({ id: level.id, naam: level.naam, doel: level.doeltijd, berekend, afwijking })
  if (afwijking > MARGE) {
    if (SCHRIJF) teSchrijven.push({ level, berekend })
    else {
      fouten.push(`${level.id} (${level.naam}): doeltijd ${level.doeltijd}s, berekend ${berekend}s`)
    }
  }
}

if (SCHRIJF) {
  for (const { level, berekend } of teSchrijven) {
    const bestand = path.resolve(
      'src/game/data/levels',
      `w${level.wereld}`,
      `l${String(level.index).padStart(2, '0')}.js`,
    )
    const bron = readFileSync(bestand, 'utf8')
    const nieuw = bron.replace(/doeltijd: \d+,/, `doeltijd: ${berekend},`)
    if (nieuw === bron) {
      console.error(`  x ${level.id}: geen doeltijd-regel gevonden in ${bestand}`)
      process.exitCode = 1
      continue
    }
    writeFileSync(bestand, nieuw)
    console.log(`  ${level.id}: ${level.doeltijd}s -> ${berekend}s`)
  }
  console.log(`\n${teSchrijven.length} doeltijd(en) bijgewerkt.`)
} else {
  console.log('Doeltijden (opgeslagen / berekend)\n')
  for (const r of regels) {
    const vlag = r.afwijking > MARGE ? ' <-' : ''
    console.log(`  ${r.id}  ${String(r.doel).padStart(3)}s / ${String(r.berekend).padStart(3)}s${vlag}`)
  }
  if (fouten.length) {
    console.error(`\n${fouten.length} doeltijd(en) wijken meer dan ${MARGE * 100}% af:`)
    for (const f of fouten) console.error(`  x ${f}`)
    console.error('\nDraai `node tools/doeltijden.js --schrijf` om ze bij te werken.')
    process.exit(1)
  }
  console.log('\nAlle doeltijden kloppen met de formule.')
}
