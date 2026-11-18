// Komeetstaart: bots spelen honderden potjes en de regels worden los getest.
//  - een potje loopt nooit vast, sterrenstof ligt altijd op een vrij vakje
//  - door de rand kom je aan de andere kant binnen; omkeren kan niet
//  - je eigen staart raken is af, behalve als spook
//  - bewaren en verder spelen (JSON heen en terug) geeft precies hetzelfde potje
// Gebruik: node tools/komeetstaartTest.js
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/komeetstaart/kern.js', import.meta.url), 'utf8'), ctx)
const KS = vm.runInContext('KS', ctx)

let fouten = 0
const fout = m => { fouten++; if (fouten < 15) console.log('✗ ' + m) }

// slimme bot: richting naar het stof, geen dodelijke vakjes
function bot(s) {
  let beste = null, score = 1e9
  for (let r = 0; r < 4; r++) {
    if (r === (s.r + 2) % 4) continue
    const nx = KS.buur(s, s.slang[0], r)
    if (s.rotsen.includes(nx) || s.slang.slice(0, -1).includes(nx)) continue
    const sc = KS.afstand(s, nx, s.stof)
    if (sc < score) { score = sc; beste = r }
  }
  return beste
}
const scores = []
for (let p = 0; p < 300; p++) {
  const s = KS.nieuw(18, 14, p * 31 + 1)
  let stappen = 0, spookTot = -1
  while (!s.over && stappen < 6000) {
    KS.stap(s, bot(s), 1 / KS.snelheid(s)); stappen++
    if (s.effect.spook > 0) spookTot = stappen + s.slang.length   // na spook kan de staart nog even over zichzelf liggen
    if (s.stof >= 0 && (s.slang.includes(s.stof) || s.rotsen.includes(s.stof))) { fout('stof op een bezet vakje'); break }
    if (new Set(s.slang).size !== s.slang.length && stappen > spookTot) { fout('staart door zichzelf zonder spook'); break }
  }
  scores.push(s.score)
}
scores.sort((a, b) => a - b)
console.log(`bot: 300 potjes, mediaan ${scores[150]} stof, beste ${scores[299]}`)
if (scores[150] < 10) fout('een slimme bot haalt te weinig: te moeilijk?')

// rand
let s = KS.nieuw(10, 8, 1)
s.slang = [4 * 10 + 9, 4 * 10 + 8, 4 * 10 + 7]; s.r = 1; s.rotsen = []; s.stof = 0
KS.stap(s, null, 0.1)
if (s.slang[0] !== 40) fout('door de rand rechts moet je links binnenkomen')
// omkeren kan niet
s = KS.nieuw(10, 8, 2); s.stof = 0; const kop = s.slang[0]
KS.stap(s, 3, 0.1)
if (s.slang[0] !== kop + 1) fout('omkeren zou genegeerd moeten worden')
// eigen staart
const staart = () => { const t = KS.nieuw(10, 8, 3); t.stof = 0; t.slang = [33, 34, 44, 43, 42, 32, 22]; t.r = 3; return t }
s = staart(); KS.stap(s, 2, 0.1)   // omlaag van 33 naar 43: staart
if (!s.over) fout('staart raken moet af zijn')
s = staart(); s.effect.spook = 3; KS.stap(s, 2, 0.1)
if (s.over) fout('als spook mag je door je staart')
// bewaren en verder: zelfde verloop
const a = KS.nieuw(16, 12, 99), b0 = KS.nieuw(16, 12, 99)
for (let i = 0; i < 50; i++) { KS.stap(a, bot(a), 0.1); KS.stap(b0, bot(b0), 0.1) }
const b = JSON.parse(JSON.stringify(b0))
for (let i = 0; i < 400 && !a.over; i++) { const r = bot(a); KS.stap(a, r, 0.1); KS.stap(b, r, 0.1) }
if (JSON.stringify(a) !== JSON.stringify(b)) fout('na bewaren loopt het potje anders')

console.log(fouten ? `\n${fouten} fout(en)` : '\nalles goed')
process.exit(fouten ? 1 : 0)
