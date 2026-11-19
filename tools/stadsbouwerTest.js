// Stadsbouwer: een bot-burgemeester bouwt een stad.
//  - wijken groeien alleen met weg, stroom en water
//  - een verstandig gebouwde stad groeit door de mijlpalen en houdt geld over
//  - industrie naast huizen maakt mensen minder blij, een park meer
//  - bewaren (JSON heen en terug) en verder gaat goed
// Gebruik: node tools/stadsbouwerTest.js
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/stadsbouwer/kern.js', import.meta.url), 'utf8'), ctx)
const SB = vm.runInContext('SB', ctx)

let fouten = 0
const fout = m => { fouten++; if (fouten < 15) console.log('✗ ' + m) }
const N = SB.N, at = (x, y) => y * N + x

// zonder stroom en water groeit er niets
let s = SB.nieuw(1)
for (let x = 3; x < 14; x++) { SB.bouw(s, 'wonen', at(x, 11)); SB.bouw(s, 'winkel', at(x, 13)) }
for (let d = 0; d < 60; d++) SB.dag(s)
if (s.inwoners > 0) fout('zonder stroom en water mag niets groeien')
SB.bouw(s, 'stroom', at(2, 15)); SB.bouw(s, 'water', at(4, 15))
for (let d = 0; d < 60; d++) SB.dag(s)
if (s.inwoners === 0) fout('met stroom en water moet het groeien')
// geluk: park helpt, industrie schaadt
const g0 = SB.geluk(s, at(6, 11))
SB.bouw(s, 'park', at(6, 10)); SB.bereken(s)
if (!(SB.geluk(s, at(6, 11)) > g0)) fout('een park moet blijer maken')
SB.bouw(s, 'industrie', at(7, 10)); s.cel[at(7, 10)].lvl = 2; SB.bereken(s)
if (!(SB.geluk(s, at(6, 11)) < SB.geluk(s, at(6, 11)) + 1) || SB.dekking) {}
const metVuil = SB.geluk(s, at(6, 11)); s.cel[at(7, 10)] = { t: 'gras', lvl: 0 }; SB.bereken(s)
if (!(SB.geluk(s, at(6, 11)) > metVuil)) fout('industrie naast huizen moet minder blij maken')

// bot-burgemeester: een raster van wegen met wijken, stroom, water, parken en diensten
s = SB.nieuw(5)
const log = []
function rij(y, x0, x1, soort) { for (let x = x0; x <= x1; x++) SB.bouw(s, soort, at(x, y)) }
SB.bouw(s, 'stroom', at(1, 1)); SB.bouw(s, 'water', at(3, 1))
for (let d = 0; d < 400; d++) {
  // elke 20 dagen een nieuw blok, als er geld is
  if (d % 20 === 0) {
    const blok = d / 20
    const y = 4 + (blok % 5) * 4, x0 = 1 + Math.floor(blok / 5) * 8
    if (x0 + 6 < N * 0.66 && s.geld > 800) {
      rij(y, x0, x0 + 6, 'weg')
      const soort = s.vraag.wonen >= Math.max(s.vraag.winkel, s.vraag.industrie) ? 'wonen' : (s.vraag.winkel >= s.vraag.industrie ? 'winkel' : 'industrie')
      rij(y - 1, x0, x0 + 6, soort); rij(y + 1, x0, x0 + 6, soort === 'industrie' ? 'industrie' : 'wonen')
      if (blok % 3 === 2) SB.bouw(s, 'park', at(x0 + 3, y - 2))
      if (blok === 6) { SB.bouw(s, 'stroom', at(x0, y + 3)); SB.bouw(s, 'water', at(x0 + 2, y + 3)) }
    }
    for (const dienst of ['school', 'brand', 'zorg', 'stadion']) if (!s.cel.some(c => c.t === dienst) && s.geld > SB.BOUW[dienst].prijs + 500) {
      for (let k = 0; k < N * N; k++) { if (!SB.magBouwen(s, dienst, k) && k % N < N * 0.6 && SB.aanWeg(s, k)) { SB.bouw(s, dienst, k); break } }
    }
  }
  SB.dag(s)
  if (d % 100 === 99) log.push(`dag ${s.dag}: ${s.inwoners} inwoners, ${s.geld} geld, geluk ${s.geluk}, ${SB.MIJLPALEN[s.mijlpaal].naam}`)
}
console.log(log.join('\n'))
if (s.mijlpaal < 3) fout('de bot-stad moet minstens een stadje worden')
if (s.geld < 0) fout('de bot-stad gaat failliet')
if (s.doel < 8) fout('de bot-stad moet minstens 8 doelen halen, haalde ' + s.doel)
// slepen: een lijn weg, een brug over de rivier, een rechthoek wonen
let t = SB.nieuw(3)
const rivier = t.cel.findIndex((c, i) => c.t === 'water0' && Math.floor(i / N) === 5)
const r1 = SB.bouwVeel(t, 'weg', SB.lijn(t, 2, 5, rivier % N + 3, 5))
if (!r1.n || t.cel[rivier].t !== 'weg' || !t.cel[rivier].brug) fout('een weg over de rivier moet een brug worden')
SB.bouw(t, 'sloop', rivier); if (t.cel[rivier].t !== 'water0') fout('een brug slopen geeft weer water')
const r2 = SB.bouwVeel(t, 'wonen', SB.rechthoek(t, 2, 6, 5, 7))
if (r2.n !== 8) fout('rechthoek van 4x2 moet 8 vakjes wonen geven, kreeg ' + r2.n)
SB.bouwVeel(t, 'winkel', SB.rechthoek(t, 2, 6, 3, 6)); if (t.cel[at(2, 6)].t !== 'winkel') fout('een lege wijk moet je kunnen ombouwen')
// brand: zonder brandweer brandt het af, met brandweer wordt het geblust
t.cel[at(10, 10)] = { t: 'wonen', lvl: 2, vuur: 1 }; SB.bereken(t); SB.dag(t)
if (t.cel[at(10, 10)].lvl !== 0) fout('zonder brandweer moet het huis afbranden')
t.geld = 5000; t.inwoners = 500; t.cel[at(10, 10)] = { t: 'wonen', lvl: 2, vuur: 3 }; SB.bouw(t, 'brand', at(12, 10)); SB.bereken(t); SB.dag(t)
if (t.cel[at(10, 10)].vuur || t.cel[at(10, 10)].lvl !== 2) fout('de brandweer moet de brand blussen')
// bewaren
const a = SB.nieuw(9); SB.bouw(a, 'stroom', at(1, 1)); SB.bouw(a, 'water', at(3, 1)); rij.call(null, 0, 0, 0, 'weg')
const b = JSON.parse(JSON.stringify(a))
for (let d = 0; d < 50; d++) { SB.dag(a); SB.dag(b) }
if (JSON.stringify(a) !== JSON.stringify(b)) fout('na bewaren loopt het anders')
console.log(fouten ? `\n${fouten} fout(en)` : '\nalles goed')
process.exit(fouten ? 1 : 0)
