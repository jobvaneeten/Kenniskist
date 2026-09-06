// Meldt alle levels waarvan de rijen niet even lang zijn, in één keer.
// maakLevel() gooit bij de eerste fout — handig tijdens het spelen, onhandig
// als je twintig levels tegelijk schrijft.
//
//   node tools/rijen.js
import { readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const basis = path.resolve('src/game/data/levels')
const fouten = []
let aantal = 0

for (const wereld of readdirSync(basis).filter((d) => /^w\d$/.test(d))) {
  for (const bestand of readdirSync(path.join(basis, wereld)).filter((f) => f.endsWith('.js'))) {
    const pad = pathToFileURL(path.join(basis, wereld, bestand)).href
    aantal++
    try {
      await import(pad)
    } catch (e) {
      fouten.push(`${wereld}/${bestand}: ${e.message}`)
    }
  }
}

console.log(`${aantal} levelbestanden gelezen`)
if (fouten.length) {
  for (const f of fouten) console.error(`  x ${f}`)
  process.exit(1)
}
console.log('Alle rijen even lang.')
