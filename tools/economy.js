// Rekent de economie van Sterrenveer door en faalt als de prijzen buiten de
// afgesproken marges vallen.
//
//   node tools/economy.js
//
// Werelden die nog niet gebouwd zijn tellen mee met hun geplande aantallen uit
// data/werelden.js; gebouwde werelden met hun gemeten aantallen. De uitvoer
// zegt per wereld welke van de twee gebruikt is.

import { ALLE_LEVELS, muntenInLevel } from '../src/game/data/levels/index.js'
import { CHARACTERS, teKoop, sterrenCharacters } from '../src/game/data/characters.js'
import { totaalVerdienbaar, WERELDEN, LEVELS_PER_WERELD, TOTAAL_STERREN, BONUS_REGULIER, BONUS_BAAS } from '../src/game/data/werelden.js'

// Marges. De opdracht gaf drie richtlijnen die elkaar tegenspreken (zie
// docs/DESIGN.md §6); dit is de vastgelegde interpretatie.
const SOM_MIN = 0.85
const SOM_MAX = 0.90
const DUURSTE_DEEL_MIN = 0.17
const DUURSTE_DEEL_MAX = 0.28
const GOEDKOOPSTE_LEVEL = 8 // moet betaalbaar zijn na ongeveer de helft van wereld 1

const fouten = []

// Gemeten munten per gebouwde wereld.
const gemeten = {}
for (const l of ALLE_LEVELS) {
  gemeten[l.wereld] = (gemeten[l.wereld] ?? 0) + muntenInLevel(l)
}
// Alleen werelden die compleet zijn tellen als gemeten.
for (const w of WERELDEN) {
  const aantal = ALLE_LEVELS.filter((l) => l.wereld === w.nummer).length
  if (aantal !== LEVELS_PER_WERELD) delete gemeten[w.nummer]
}

const { munten, bonus, totaal, per } = totaalVerdienbaar(gemeten)

// Cumulatief verdienbaar tot en met level N van wereld 1 — voor de vraag of het
// goedkoopste character halverwege wereld 1 te betalen is.
function cumulatiefWereld1(tot) {
  let som = 0
  for (const l of ALLE_LEVELS.filter((x) => x.wereld === 1 && x.index <= tot)) {
    som += muntenInLevel(l) + (l.index === LEVELS_PER_WERELD ? BONUS_BAAS : BONUS_REGULIER)
  }
  return som
}

const kopen = teKoop()
const prijzen = kopen.map((c) => c.prijs).sort((a, b) => a - b)
const som = prijzen.reduce((a, b) => a + b, 0)
const goedkoopste = prijzen[0]
const duurste = prijzen[prijzen.length - 1]

const somDeel = som / totaal
const duursteDeel = duurste / som
const halverwegeW1 = cumulatiefWereld1(GOEDKOOPSTE_LEVEL)

// --- Rapport ---------------------------------------------------------------

console.log('Sterrenveer — economie\n')
console.log('Per wereld:')
for (const w of per) {
  const bron = w.gemeten ? 'gemeten' : 'gepland'
  console.log(`  wereld ${w.wereld}: ${String(w.munten).padStart(4)} munten + ${w.bonus} bonus  (${bron})`)
}
console.log(`\nTotaal munten in levels : ${munten}`)
console.log(`Totaal voltooiingsbonus : ${bonus}`)
console.log(`Totaal verdienbaar      : ${totaal}`)
console.log(`Sterren in het spel     : ${TOTAAL_STERREN}\n`)

console.log('Prijzen:')
for (const c of CHARACTERS) {
  if (c.prijs > 0) console.log(`  ${c.naam.padEnd(9)} ${String(c.prijs).padStart(5)} munten`)
  else if (c.sterren) console.log(`  ${c.naam.padEnd(9)} ${String(c.sterren).padStart(5)} sterren`)
  else console.log(`  ${c.naam.padEnd(9)}     — gratis`)
}
console.log(`\nSom van de 8 te kopen characters : ${som}  (${(somDeel * 100).toFixed(1)}% van het totaal)`)
console.log(`Goedkoopste                      : ${goedkoopste}  (verdienbaar t/m 1-${GOEDKOOPSTE_LEVEL}: ${halverwegeW1})`)
console.log(`Duurste                          : ${duurste}  (${(duursteDeel * 100).toFixed(1)}% van de som)`)

// --- Controles -------------------------------------------------------------

if (kopen.length !== 8) {
  fouten.push(`${kopen.length} characters met een prijs, verwacht 8`)
}
if (sterrenCharacters().length !== 3) {
  fouten.push(`${sterrenCharacters().length} sterren-characters, verwacht 3`)
}
if (somDeel < SOM_MIN || somDeel > SOM_MAX) {
  fouten.push(`som van de prijzen is ${(somDeel * 100).toFixed(1)}% van het totaal, verwacht ${SOM_MIN * 100}-${SOM_MAX * 100}%`)
}
if (duursteDeel < DUURSTE_DEEL_MIN || duursteDeel > DUURSTE_DEEL_MAX) {
  fouten.push(`duurste character is ${(duursteDeel * 100).toFixed(1)}% van de som, verwacht ${DUURSTE_DEEL_MIN * 100}-${DUURSTE_DEEL_MAX * 100}%`)
}
if (goedkoopste > halverwegeW1) {
  fouten.push(`goedkoopste character kost ${goedkoopste}, maar t/m level 1-${GOEDKOOPSTE_LEVEL} is er pas ${halverwegeW1} te verdienen`)
}
if (goedkoopste < halverwegeW1 * 0.5) {
  fouten.push(`goedkoopste character kost ${goedkoopste}: te goedkoop, dat is al binnen een kwart van wereld 1 te betalen`)
}
if (som > totaal) {
  fouten.push(`alle characters samen kosten ${som}, meer dan er te verdienen valt (${totaal})`)
}
for (const c of sterrenCharacters()) {
  if (c.sterren > TOTAAL_STERREN) fouten.push(`${c.naam} vraagt ${c.sterren} sterren, er zijn er maar ${TOTAAL_STERREN}`)
}

if (fouten.length) {
  console.error('\nFouten:')
  for (const f of fouten) console.error(`  x ${f}`)
  process.exit(1)
}

console.log('\nEconomie in balans.')
