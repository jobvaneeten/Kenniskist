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

// De regel waar het om draait: er moet ongeveer elke tien levels een character
// bij betaalbaar zijn. Met tien te kopen characters en tachtig levels is dat om
// de acht levels; de marge eronder maakt het net iets guller dan precies.
//
// Dit verving de oude vaste marges (som 85-90% van het totaal, duurste 17-28%
// van de som). Die golden voor acht characters en zeiden niets over het tempo
// waarin je ze vrijspeelt — precies wat hier telt. Zie docs/DESIGN.md 6.
const AANTAL_TE_KOOP = 10
const AANTAL_STERREN_CHARACTERS = 9
const SOM_MAX = 0.96      // alles kopen mag bijna al je munten kosten, niet meer
const TEMPO_MARGE = 0.98  // de k-de aankoop mag hooguit dit deel van je saldo zijn

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

// Wat je verdiend hebt na de eerste N levels van het spel, in speelvolgorde.
// Elke munt telt eenmalig, dus dit is precies je saldo als je nog niets kocht.
function verdiendNa(n) {
  let som = 0
  for (const l of ALLE_LEVELS.slice(0, n)) {
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

// Het tempo: hoeveel levels moet je gespeeld hebben voordat de k-de aankoop
// erin zit? Bij tien characters hoort dat rond level 8, 16, 24 … te liggen.
const perLevel = ALLE_LEVELS.map((_, i) => verdiendNa(i + 1))
const tempo = []
let cumulatief = 0
prijzen.forEach((prijs, i) => {
  cumulatief += prijs
  const level = perLevel.findIndex((v) => v >= cumulatief) + 1
  tempo.push({ nummer: i + 1, prijs, cum: cumulatief, level: level || null })
})
const STAP = Math.round(ALLE_LEVELS.length / AANTAL_TE_KOOP)

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
console.log(`\nSom van de ${kopen.length} te kopen characters : ${som}  (${(somDeel * 100).toFixed(1)}% van het totaal)`)
console.log(`Goedkoopste                       : ${goedkoopste}`)
console.log(`Duurste                           : ${duurste}  (${(duursteDeel * 100).toFixed(1)}% van de som)`)

console.log(`\nTempo (streefwaarde: de k-de aankoop rond level ${STAP}k):`)
for (const t of tempo) {
  const doel = t.nummer * STAP
  const merk = t.level == null ? ' <- niet te betalen' : t.level > doel ? ' <-' : ''
  console.log(`  ${String(t.nummer).padStart(2)}e aankoop  ${String(t.prijs).padStart(4)} munten`
    + `  totaal ${String(t.cum).padStart(4)}  betaalbaar vanaf level ${String(t.level ?? '-').padStart(2)}`
    + `  (doel ${doel})${merk}`)
}

// --- Controles -------------------------------------------------------------

if (kopen.length !== AANTAL_TE_KOOP) {
  fouten.push(`${kopen.length} characters met een prijs, verwacht ${AANTAL_TE_KOOP}`)
}
if (sterrenCharacters().length !== AANTAL_STERREN_CHARACTERS) {
  fouten.push(`${sterrenCharacters().length} sterren-characters, verwacht ${AANTAL_STERREN_CHARACTERS}`)
}
if (somDeel > SOM_MAX) {
  fouten.push(`som van de prijzen is ${(somDeel * 100).toFixed(1)}% van het totaal, hooguit ${SOM_MAX * 100}%`)
}
// De kern: elke aankoop moet op tijd betaalbaar zijn. Ligt hij later dan het
// doel, dan gaat het te traag; kan een kind alle tien al bij level 40 kopen,
// dan is er in de tweede helft van het spel niets meer om naar toe te sparen.
for (const t of tempo) {
  const doel = t.nummer * STAP
  if (t.level == null) {
    fouten.push(`aankoop ${t.nummer} (totaal ${t.cum}) is nooit te betalen: er valt maar ${totaal} te verdienen`)
  } else if (t.level > doel) {
    fouten.push(`aankoop ${t.nummer} kan pas vanaf level ${t.level}, gestreefd wordt naar level ${doel}`)
  } else if (t.level < doel * 0.55) {
    fouten.push(`aankoop ${t.nummer} kan al vanaf level ${t.level}, dat is te vroeg voor doel ${doel}`)
  }
}
if (som > totaal * TEMPO_MARGE) {
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
