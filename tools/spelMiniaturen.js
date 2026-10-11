// Maakt kleine WebP-plaatjes (480 px breed) van alle spellen voor de
// voorpagina, zodat die niet megabytes aan grote PNG's hoeft te laden.
// Draai opnieuw als er een spel bijkomt: node tools/spelMiniaturen.js
// (src/lib/spellen.test.js controleert dat er voor elk spel een miniatuur is.)
import sharp from 'sharp'
import { mkdirSync, statSync } from 'node:fs'
import { VRIJE_SPELLEN, spelPlaatje } from '../src/lib/spellen.js'

const doel = new URL('../public/scenes/games/klein/', import.meta.url)
mkdirSync(doel, { recursive: true })
let totaal = 0
for (const spel of VRIJE_SPELLEN) {
  const bron = new URL('../public' + spelPlaatje(spel), import.meta.url)
  const uit = new URL(spel.key + '.webp', doel)
  await sharp(bron.pathname.replace(/^\/([A-Z]:)/, '$1'), { density: 144 })
    .resize(480, 300, { fit: 'cover' })
    .webp({ quality: 78 })
    .toFile(uit.pathname.replace(/^\/([A-Z]:)/, '$1'))
  const kb = Math.round(statSync(uit).size / 1024)
  totaal += kb
  console.log(spel.key.padEnd(14), kb + ' kB')
}
// de drie sceneplaatjes van de voorpagina (Speel Game, Kledingkast, Winkel)
for (const naam of ['game', 'kledingkast', 'winkel']) {
  const uit = new URL(naam + '.webp', doel)
  await sharp(new URL('../public/scenes/' + naam + '.png', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'))
    .resize(720).webp({ quality: 78 }).toFile(uit.pathname.replace(/^\/([A-Z]:)/, '$1'))
  const kb = Math.round(statSync(uit).size / 1024)
  totaal += kb
  console.log(naam.padEnd(14), kb + ' kB')
}
console.log('samen', totaal + ' kB')
