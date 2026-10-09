// Steenknaller: laat een bot alle 30 levels spelen.
// Controleert dat de bal nooit door een muur of steen schiet, dat elk level
// uit te spelen is, dat een level ongeveer een minuut duurt en dat de bal
// nooit eindeloos heen en weer blijft stuiteren zonder iets te raken.
// Gebruik: node tools/steenknallerTest.js
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/steenknaller/kern.js', import.meta.url), 'utf8'), ctx)
const SK = ctx.SK

let fouten = 0
const fout = m => { fouten++; if (fouten < 12) console.log('✗ ' + m) }
const DT = 1 / 60

// bot: volgt de laagste bal die omlaag komt, met wat slordigheid en een maximale snelheid
function speel(L, seed, slordig) {
  const s = SK.nieuwLevel(L, seed)
  const r = SK.rng(seed * 3 + 1)
  let mik = 0, t = 0, batX = 0.5, stil = 0, vorige = s.over
  while (!s.klaar && !s.af && t < 240) {
    t += DT
    const bal = s.ballen.filter(b => b.vy >= 0 || b.vast).sort((a, b) => b.y - a.y)[0] || s.ballen[0]
    if (r() < 0.02) mik = (r() - 0.5) * 0.16
    let doel = bal ? bal.x + mik + (r() - 0.5) * slordig : batX
    const pu = s.vallend.find(p => p.y > 1.1)
    if (pu && (!bal || bal.y < 0.9)) doel = pu.x
    batX += Math.max(-2.2 * DT, Math.min(2.2 * DT, doel - batX))
    SK.stap(s, DT, batX)
    for (const b of s.ballen) {
      if (!isFinite(b.x + b.y)) { fout(`NaN in level ${L + 1}`); return null }
      if (b.x < SK.BR - 1e-6 || b.x > SK.B - SK.BR + 1e-6 || b.y < SK.BR - 1e-6) { fout(`bal door de muur (level ${L + 1})`); return null }
      for (const st of s.stenen) {
        if (st.weg) continue
        const q = SK.steenRect(st)
        if (b.x > q.x0 + 0.003 && b.x < q.x1 - 0.003 && b.y > q.y0 + 0.003 && b.y < q.y1 - 0.003 && !(s.power.vuur > 0)) { fout(`bal in een steen (level ${L + 1})`); return null }
      }
    }
    stil = s.over === vorige ? stil + DT : 0
    vorige = s.over
    if (stil > 45) { fout(`level ${L + 1}: 45 s lang niets geraakt`); if (process.env.UITGEBREID) console.log(s.stenen.filter(x => !x.weg).map(x => x.soort[0] + x.kol + ',' + x.rij).join(' '), JSON.stringify(s.ballen), s.levens, s.power); return null }
  }
  return { gehaald: s.klaar, t, levens: s.levens }
}

let tot = 0, n = 0, max = 0, min = 1e9
const mislukt = []
for (let L = 0; L < SK.LEVELS; L++) {
  const def = SK.level(L)
  if (def.breekbaar < 12) fout(`level ${L + 1} heeft maar ${def.breekbaar} stenen`)
  let gehaald = 0, tijd = 0
  for (let seed = 1; seed <= 8; seed++) {
    const r = speel(L, seed * 97 + L, 0.05)
    if (!r) continue
    if (r.gehaald) { gehaald++; tijd += r.t }
  }
  if (!gehaald) { fout(`level ${L + 1} (${def.vorm}) nooit gehaald door de bot`); continue }
  const gem = tijd / gehaald
  tot += gem; n++; max = Math.max(max, gem); min = Math.min(min, gem)
  if (gehaald < 4) mislukt.push(L + 1)
  if (process.env.UITGEBREID) console.log(`level ${L + 1} ${def.vorm}: ${def.breekbaar} stenen, ${gem.toFixed(0)} s, ${gehaald}/8`)
}
console.log(`level-duur (bot): gem. ${(tot / n).toFixed(0)} s, ${min.toFixed(0)}–${max.toFixed(0)} s`)
if (mislukt.length) console.log(`levels die de bot vaak niet haalt: ${mislukt.join(', ')}`)
if (max > 90) fout('een level duurt veel te lang')

console.log(fouten ? `\n${fouten} fout(en)` : '\n✓ alles in orde')
process.exit(fouten ? 1 : 0)
