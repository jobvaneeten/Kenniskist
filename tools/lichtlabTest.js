// Lichtlab: controleert de levelmaker en de stralen.
//  - level 1 t/m 300 worden gemaakt, zijn met de oplossing klaar en bij de start niet
//  - het minimum (3 sterren) klopt met het aantal verkeerd gedraaide spiegels
//  - vaste spiegels staan goed, elke straal stopt, stralen gaan door elkaar heen
//  - hetzelfde levelnummer geeft op elk apparaat hetzelfde level
// Gebruik: node tools/lichtlabTest.js
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/lichtlab/kern.js', import.meta.url), 'utf8'), ctx)
const LL = vm.runInContext('LL', ctx)

let fouten = 0
const fout = m => { fouten++; if (fouten < 15) console.log('✗ ' + m) }

let traagst = 0
for (let n = 0; n < 300; n++) {
  const t = Date.now(), lv = LL.maak(n)
  traagst = Math.max(traagst, Date.now() - t)
  if (!lv) { fout(`level ${n + 1} niet gemaakt`); continue }
  const start = lv.spiegels.map(s => s.s)
  if (!LL.volg(lv, lv.oplossing).klaar) fout(`level ${n + 1}: oplossing werkt niet`)
  if (LL.volg(lv, start).klaar) fout(`level ${n + 1}: al klaar bij de start`)
  const verkeerd = lv.spiegels.filter((s, i) => !s.nep && s.s !== lv.oplossing[i]).length
  if (verkeerd !== lv.min) fout(`level ${n + 1}: min ${lv.min}, verkeerd ${verkeerd}`)
  lv.spiegels.forEach((s, i) => { if (s.vast && s.s !== lv.oplossing[i]) fout(`level ${n + 1}: vaste spiegel verkeerd`) })
  // de oplossing naspelen met tikken: na lv.min tikken klaar
  const st = start.slice()
  lv.spiegels.forEach((s, i) => { if (!s.vast && st[i] !== lv.oplossing[i]) st[i] = 1 - st[i] })
  if (!LL.volg(lv, st).klaar) fout(`level ${n + 1}: tikken naar de oplossing werkt niet`)
  if (LL.sterren(lv.min, lv.min) !== 3) fout('minimum geeft geen 3 sterren')
  if (n === 42 && JSON.stringify(LL.maak(42)) !== JSON.stringify(lv)) fout('level 43 is niet steeds hetzelfde')
  // alle mogelijke standen van een klein level: elke straal stopt
  if (n < 3) {
    const k = lv.spiegels.length
    for (let b = 0; b < 1 << Math.min(k, 10); b++) {
      const u = LL.volg(lv, lv.spiegels.map((s, i) => (b >> i) & 1))
      u.stralen.forEach(s => { if (s.punten.length > 400) fout('straal stopt niet') })
    }
  }
}
// kruisende stralen beïnvloeden elkaar niet
const kruis = { w: 5, h: 5, muren: [], lampen: [{ i: 2, r: 2, k: 0 }, { i: 10, r: 1, k: 1 }], doelen: [{ i: 22, k: 0 }, { i: 14, k: 1 }], spiegels: [] }
if (!LL.volg(kruis, []).klaar) fout('kruisende stralen')
console.log(`300 levels gemaakt, traagste ${traagst} ms`)
console.log(fouten ? `\n${fouten} fout(en)` : '\nalles goed')
process.exit(fouten ? 1 : 0)
