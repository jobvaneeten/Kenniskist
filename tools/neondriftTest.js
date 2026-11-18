// Neondrift: bots rijden honderden ritten.
//  - een bot die goed stuurt komt ver; een bot die nooit stuurt valt er snel af
//  - de weg is altijd verbonden (elk stuk begint waar het vorige eindigt)
//  - een schild vangt je op en zet je terug op de weg
//  - bewaren en verder (JSON heen en terug) geeft dezelfde rit
// Gebruik: node tools/neondriftTest.js
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/neondrift/kern.js', import.meta.url), 'utf8'), ctx)
const ND = vm.runInContext('ND', ctx)

let fouten = 0
const fout = m => { fouten++; if (fouten < 15) console.log('✗ ' + m) }

// bot: kijkt een stukje vooruit langs de weg en houdt vast als het stuk daar naar B gaat
function bot(s, vooruit, fout2) {
  const nu = s.segs[s.seg], vol = s.segs[s.seg + 1]
  const o = ND.opStuk(nu, s.x, s.y)
  const rest = nu.l - o.langs
  const r = rest < 0.45 + s.v * vooruit ? vol.r : nu.r
  return (r === 1) !== (Math.random() < fout2)
}
function rit(zaad, vooruit, fout2, max) {
  const s = ND.nieuw(zaad, {})
  let n = 0
  while (!s.over && n < max) {
    ND.stap(s, bot(s, vooruit, fout2)); n++
    for (let k = 1; k < s.segs.length; k++) {
      const a = s.segs[k - 1], b = s.segs[k], d = ND.RICHTING[a.r]
      if (Math.abs(a.x + d[0] * a.l - b.x) > 1e-9 || Math.abs(a.y + d[1] * a.l - b.y) > 1e-9) { fout('weg niet verbonden'); return s }
    }
  }
  return s
}
const goed = []
for (let i = 0; i < 120; i++) goed.push(rit(i + 1, 0.12, 0, 120 * 90).afstand)
goed.sort((a, b) => a - b)
console.log(`goede bot: mediaan ${goed[60] | 0} m, minste ${goed[0] | 0} m`)
if (goed[60] < 300 || goed[0] < 150) fout('goed sturen moet ver komen')
// nooit sturen: na het eerste stuk eraf
const nooitBot = ND.nieuw(5, {}); let z = 0
while (!nooitBot.over && z < 120 * 30) { ND.stap(nooitBot, false); z++ }
if (!nooitBot.over || nooitBot.afstand > 15) fout('nooit sturen moet snel misgaan')
// schild
const sch = ND.nieuw(7, { schild: 1 }); z = 0
let gered = false
while (!sch.over && z < 120 * 30) { const ev = ND.stap(sch, false); if (ev.some(e => e.t === 'schild')) gered = true; z++ }
if (!gered) fout('schild vangt niet op')
if (!ND.opWeg(sch, sch.x, sch.y) && !sch.over) fout('na schild niet op de weg')
// bewaren en verder
const a = ND.nieuw(42, {}), b0 = ND.nieuw(42, {})
for (let i = 0; i < 600; i++) { ND.stap(a, bot(a, 0.12, 0)); ND.stap(b0, bot(b0, 0.12, 0)) }
const b = JSON.parse(JSON.stringify(b0))
for (let i = 0; i < 3000 && !a.over; i++) { const v = bot(a, 0.12, 0); ND.stap(a, v); ND.stap(b, v) }
if (JSON.stringify(a) !== JSON.stringify(b)) fout('na bewaren rijdt de rit anders')
console.log(fouten ? `\n${fouten} fout(en)` : '\nalles goed')
process.exit(fouten ? 1 : 0)
