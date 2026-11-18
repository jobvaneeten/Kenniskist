// Boerenleven: een bot-boer speelt een heel jaar.
//  - water geven laat gewassen groeien, zonder water groeien ze niet
//  - bij een nieuw seizoen verwelkt wat er niet bij hoort
//  - de bot verdient genoeg om upgrades en dieren te kopen (het spel loopt niet vast)
//  - dieren die je aait geven de volgende ochtend iets
//  - bewaren (JSON heen en terug) en verder gaat goed
// Gebruik: node tools/boerenlevenTest.js
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/boerenleven/kern.js', import.meta.url), 'utf8'), ctx)
const PB = vm.runInContext('PB', ctx)

let fouten = 0
const fout = m => { fouten++; if (fouten < 15) console.log('✗ ' + m) }

// groeien met en zonder water
let s = PB.nieuw(1)
PB.tik(s, 13, 'radijs'); PB.tik(s, 14, 'radijs')
for (let d = 0; d < 3; d++) { PB.tik(s, 13); PB.slaap(s) }
if (s.velden[13].gewas.groei !== 3 || s.velden[14].gewas.groei !== 0) fout('water moet het verschil maken')
if (PB.tik(s, 13).t !== 'oogst') fout('rijpe radijs moet te oogsten zijn')
// verwelken bij nieuw seizoen
s = PB.nieuw(2); PB.tik(s, 13, 'radijs')
for (let d = 0; d < 10; d++) PB.slaap(s)
if (!s.velden[13].gewas || !s.velden[13].gewas.dood) fout('radijs moet verwelken in de zomer')
// dieren
s = PB.nieuw(3); s.munten = 1000; PB.koopDier(s, 'kip'); PB.aai(s, 0); PB.slaap(s)
if (PB.aai(s, 0).t !== 'raap' || s.producten.ei !== 1) fout('geaaide kip moet een ei geven')

// bot-boer: elke dag alles aftikken, zaad kopen voor het seizoen, verkopen, opdrachten leveren
s = PB.nieuw(7)
const log = []
for (let dag = 0; dag < 40; dag++) {
  const sz = PB.seizoen(s)
  const opVoorraad = Object.keys(s.zaden).find(id => PB.GEWASSEN[id].seizoen === sz && s.zaden[id] > 0)
  const over = 10 - PB.dagInSeizoen(s) + 1
  const zaad = opVoorraad || Object.keys(PB.GEWASSEN).filter(id => PB.GEWASSEN[id].seizoen === sz && PB.GEWASSEN[id].dagen <= over).sort((a, b) => (PB.GEWASSEN[b].prijs / PB.GEWASSEN[b].dagen) - (PB.GEWASSEN[a].prijs / PB.GEWASSEN[a].dagen))[0]
  for (let i = 0; i < PB.W * PB.H; i++) {
    if (!PB.bruikbaar(s, i)) continue
    const v = s.velden[i]
    if (zaad && !v.gewas && v.t === 'akker' && !s.zaden[zaad]) PB.koopZaad(s, zaad, 1)
    for (let k = 0; k < 3; k++) { const r = PB.tik(s, i, zaad); if (r.t === 'niet' || r.t === 'groeit' || r.t === 'water' || r.t === 'zaai') break }
  }
  s.dieren.forEach((d, n) => { PB.aai(s, n); PB.aai(s, n) })
  s.opdrachten.slice().forEach(() => { for (let k = 0; k < s.opdrachten.length; k++) if (PB.lever(s, k)) break })
  for (const id of Object.keys(s.oogst)) PB.verkoop(s, id)
  for (const id of Object.keys(s.producten)) PB.verkoop(s, id)
  if (s.munten > 300) for (const u of ['akker', 'sproeier', 'stal']) PB.koopUpgrade(s, u)
  if (s.munten > 600) PB.koopDier(s, ['kip', 'schaap', 'koe'][s.dieren.length % 3])
  PB.slaap(s)
  if (dag % 10 === 9) log.push(`dag ${s.dag}: ${s.munten} munten, akker ${s.upg.akker}, sproeier ${s.upg.sproeier}, ${s.dieren.length} dieren, ${s.klaarOpdrachten} opdrachten`)
}
console.log(log.join('\n'))
if (s.upg.akker < 2 || s.dieren.length < 1) fout('na 40 dagen moet de bot gegroeid zijn')
// bewaren en verder
const a = PB.nieuw(9), b = JSON.parse(JSON.stringify(a))
for (const t of [a, b]) { PB.tik(t, 13, 'radijs'); PB.tik(t, 13); PB.slaap(t); PB.verder(t, 200) }
if (JSON.stringify(a) !== JSON.stringify(b)) fout('na bewaren loopt het anders')
console.log(fouten ? `\n${fouten} fout(en)` : '\nalles goed')
process.exit(fouten ? 1 : 0)
