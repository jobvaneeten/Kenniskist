// Neonglij: maakt de 60 levels (5 werelden × 12) met de levelmaker en de
// oplosser uit public/neonglij/kern.js en schrijft public/neonglij/levels.js.
// Elke wereld leert één ding tegelijk: eerst alleen, dan samen met wat je kent.
// Per level wordt uit veel kandidaten degene gekozen die het best bij de
// gewenste moeilijkheid past (aantal zetten), met de meeste keuzemogelijkheden.
// Gebruik: node tools/neonglijLevels.mjs   (daarna: npm run neonglij)
import { readFileSync, writeFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/neonglij/kern.js', import.meta.url), 'utf8'), ctx)
const NG = vm.runInContext('NG', ctx)

const lerp = (a, b, f) => Math.round(a + (b - a) * f)

// per level i (0..11) de instellingen; f = i / 11
const WERELDEN = [
  {
    naam: 'IJsvlakte', kleur: 190,
    o: (i, f) => ({ w: lerp(5, 9, f), h: lerp(5, 9, f), muren: 0.16, kristallen: lerp(1, 4, f), doel: lerp(2, 11, f) }),
  },
  {
    naam: 'Duwgrot', kleur: 285,
    o: (i, f) => ({ w: lerp(6, 9, f), h: lerp(6, 9, f), muren: 0.13, kristallen: lerp(1, 3, f), blokken: lerp(1, 3, f), gaten: i < 2 ? 0 : lerp(1, 3, f), doel: lerp(3, 12, f), nodig: ['duw'] }),
  },
  {
    naam: 'Breekijs', kleur: 160,
    o: (i, f) => ({
      w: lerp(6, 9, f), h: lerp(6, 9, f), muren: 0.13, kristallen: lerp(1, 3, f),
      pijlen: i >= 4 && i < 6 ? 0 : lerp(1, 3, f), breek: i < 4 ? 0 : lerp(2, 6, f), blokken: i >= 9 ? 1 : 0,
      doel: lerp(3, 12, f), nodig: i < 4 ? ['pijl'] : i < 6 ? ['kraak'] : ['pijl', 'kraak'],
    }),
  },
  {
    naam: 'Portaalnevel', kleur: 320,
    o: (i, f) => ({
      w: lerp(6, 9, f), h: lerp(6, 9, f), muren: 0.13, kristallen: lerp(1, 3, f),
      portalen: i < 6 ? 1 : 2, pijlen: i < 4 ? 0 : lerp(0, 2, f), blokken: i >= 8 ? 1 : 0, breek: i >= 10 ? 3 : 0,
      doel: lerp(3, 13, f), nodig: ['portaal'],
    }),
  },
  {
    naam: 'Schakelstation', kleur: 45,
    o: (i, f) => ({
      w: lerp(6, 9, f), h: lerp(6, 9, f), muren: 0.12, kristallen: lerp(1, 3, f),
      poorten: lerp(2, 6, f), blokken: i >= 4 ? 1 : 0, pijlen: i >= 6 ? 2 : 0, portalen: i >= 8 ? 1 : 0, breek: i >= 10 ? 2 : 0,
      doel: lerp(4, 14, f), nodig: ['knop'],
    }),
  },
]

const KANDIDATEN = 160
const uit = []
let zaad = 1000
for (const [wi, W] of WERELDEN.entries()) {
  const levels = []
  for (let i = 0; i < 12; i++) {
    const o = W.o(i, i / 11)
    o.min = Math.max(1, o.doel - 1); o.max = o.doel + 2; o.zoek = 120000
    let beste = null
    for (let poging = 0; poging < 6 && !beste; poging++) {
      // meerdere zaden: de beste kandidaat over alle zaden heen
      for (let z = 0; z < 4; z++) {
        const l = NG.maak(++zaad, o, KANDIDATEN / 4)
        if (!l) continue
        const score = -Math.abs(l.min - o.doel) * 1000 + l.bekeken
        if (!beste || score > beste.score) beste = { ...l, score, zaad }
      }
      if (!beste) { o.min = Math.max(1, o.min - 1); o.max++ }
    }
    if (!beste) throw new Error(`geen level voor ${W.naam} ${i + 1}`)
    levels.push({ rijen: beste.rijen, min: beste.min, bekeken: beste.bekeken })
    console.log(`${W.naam.padEnd(15)} ${String(i + 1).padStart(2)}  ${beste.rijen[0].length - 2}x${beste.rijen.length - 2}  min ${String(beste.min).padStart(2)} (doel ${o.doel})  bekeken ${beste.bekeken}`)
  }
  // 2..12 op gemeten moeilijkheid; level 1 blijft de kennismaking
  const rest = levels.slice(1).sort((a, b) => a.min - b.min || a.bekeken - b.bekeken)
  uit.push({ naam: W.naam, kleur: W.kleur, levels: [levels[0], ...rest].map(l => ({ r: l.rijen, min: l.min })) })
}

const tekst = '// Gemaakt door tools/neonglijLevels.mjs: niet met de hand aanpassen.\n' +
  '// r = rijen (zie kern.js), min = kleinste aantal zetten (3 sterren).\n' +
  'var NG_WERELDEN = ' + JSON.stringify(uit, null, 0).replace(/\{"r"/g, '\n  {"r"') + '\n'
writeFileSync(new URL('../public/neonglij/levels.js', import.meta.url), tekst)
console.log('geschreven: public/neonglij/levels.js')
