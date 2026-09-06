// Ontwikkel- en screenshot-ingang. Hoort bij sterrenveer-dev.html en zit niet
// in de productiebundel.
//
//   /sterrenveer-dev.html                 → titelscherm
//   /sterrenveer-dev.html?level=w1-l03    → direct dat level
//   /sterrenveer-dev.html?level=w1-l03&stil=1 → zonder audio-gate-melding
//
// window.sterrenveer geeft de tests toegang tot het spel, zodat
// tools/screenshot-levels.js kan wachten tot een level echt geladen is.

import { Spel } from './main.js'
import { levelVan } from './data/levels/index.js'
import { ontleedLevelId } from './data/werelden.js'
import { opslag } from './core/save-adapter.js'

const doel = document.getElementById('doel')
const canvas = document.createElement('canvas')
doel.appendChild(canvas)

const params = new URLSearchParams(location.search)
const levelParam = params.get('level')

// Screenshots moeten elk level kunnen tonen, ook de nog niet vrijgespeelde.
// Alleen in deze dev-ingang; het spel zelf doet dit nooit.
if (params.get('alles') === '1') {
  for (let w = 1; w <= 5; w++) {
    for (let i = 1; i <= 16; i++) {
      const id = `w${w}-l${String(i).padStart(2, '0')}`
      if (levelVan(id)) opslag.voortgang.levels[id] = { c: 1, s: [0, 0, 0], t: 0, m: '', b: 0 }
    }
  }
}

const spel = new Spel(canvas, { onBack: () => {} })
window.sterrenveer = spel

if (levelParam) {
  const ontleed = ontleedLevelId(levelParam)
  if (ontleed && levelVan(levelParam)) {
    spel.startLevel(ontleed.wereld, ontleed.index)
  } else {
    console.error(`Onbekend level: ${levelParam}`)
  }
}
