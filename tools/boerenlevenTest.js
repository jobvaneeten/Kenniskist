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
let s = PB.nieuw(1); s.weerVast = 'zon'
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
  for (let v = 0; v < 3; v++) PB.vis(s, 0.5)
  for (const id of Object.keys(PB.RECEPTEN)) if (s.opdrachten.some(o => o.id === id)) PB.kook(s, id)
  s.opdrachten.slice().forEach(() => { for (let k = 0; k < s.opdrachten.length; k++) if (PB.lever(s, k)) break })
  for (const id of Object.keys(s.oogst)) PB.verkoop(s, id)
  for (const id of Object.keys(s.producten)) if (!s.opdrachten.some(o => o.id === id)) PB.verkoop(s, id)
  if (s.munten > 300) for (const u of ['akker', 'sproeier', 'stal']) PB.koopUpgrade(s, u)
  if (s.munten > 500) PB.koopDier(s, ['kip', 'schaap', 'koe'][s.dieren.length % 3])
  PB.slaap(s)
  if (dag % 10 === 9) log.push(`dag ${s.dag}: ${s.munten} munten, akker ${s.upg.akker}, sproeier ${s.upg.sproeier}, ${s.dieren.length} dieren, ${s.klaarOpdrachten} opdrachten`)
}
console.log(log.join('\n'))
if (s.upg.akker < 2 || s.dieren.length < 1) fout('na 40 dagen moet de bot gegroeid zijn')
if (PB.niveau(s) < 4) fout('na 40 dagen moet de boer minstens niveau 4 zijn, is ' + PB.niveau(s))
// keuken: wat je kookt is de volgende ochtend klaar
s = PB.nieuw(4); s.xp = 100; s.oogst.aardbei = 3
if (!PB.kook(s, 'jam') || s.oogst.aardbei !== 0) fout('jam koken moet aardbeien gebruiken')
PB.slaap(s); if (s.producten.jam !== 1) fout('jam moet de volgende ochtend klaar zijn')
if (PB.kook(s, 'kaas')) fout('kaas mag pas vanaf niveau 3')
// bijenkast en regen
s = PB.nieuw(5); s.xp = 300; s.munten = 1000
if (!PB.koopExtra(s, 'bijenkast')) fout('bijenkast kopen op niveau 4 moet lukken')
PB.slaap(s); if (!PB.raapKast(s, 0) || !s.producten.honing) fout('bijenkast moet honing geven')
s.weerVast = 'regen'; PB.tik(s, 13, 'radijs'); PB.slaap(s); if (!s.velden[13].gewas.water) fout('regen moet water geven')
// bewaren en verder
const a = PB.nieuw(9), b = JSON.parse(JSON.stringify(a))
for (const t of [a, b]) { PB.tik(t, 13, 'radijs'); PB.tik(t, 13); PB.slaap(t); PB.verder(t, 200) }
if (JSON.stringify(a) !== JSON.stringify(b)) fout('na bewaren loopt het anders')
console.log(fouten ? `\n${fouten} fout(en)` : '\nalles goed')
process.exit(fouten ? 1 : 0)
