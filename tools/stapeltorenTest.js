// Stapeltoren: laat bots met verschillende "handigheid" (hoe nauwkeurig ze
// tikken) honderden torens bouwen. Controleert dat een potje nooit langer dan
// een minuut duurt, dat perfect tikken de toren niet laat krimpen, dat beter
// tikken hoger bouwt en dat een gewone speler niet binnen een paar tellen af is.
// Gebruik: node tools/stapeltorenTest.js
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/stapeltoren/kern.js', import.meta.url), 'utf8'), ctx)
const ST = ctx.ST

let fouten = 0
const fout = m => { fouten++; if (fouten < 10) console.log('✗ ' + m) }
const DT = 1 / 60

function rng(seed) { let a = seed; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 } }
function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()) }

// bot: tikt als het blok (bijna) boven de toren staat, met een tijdfout van sd seconden
function speel(sd, seed) {
  const r = rng(seed), s = ST.nieuw()
  let fout2 = gauss(r) * sd, denk = 0.25 + r() * 0.2
  while (!s.over) {
    ST.stap(s, DT)
    if (s.over) break
    denk -= DT
    if (denk > 0) continue
    const b = s.blok, top = s.lagen[s.lagen.length - 1], nu = ST.huidig(s)
    // waar is het blok over fout2 seconden?
    const voor = nu[b.as + '0'] + b.dir * b.v * fout2 - top[b.as + '0']
    if (Math.abs(voor) < b.v * DT * 0.6 + 1e-9) {
      const res = ST.plaats(s)
      if (res && sd === 0 && res.type !== 'perfect') fout('perfecte bot tikt niet perfect')
      fout2 = gauss(r) * sd; denk = 0.25 + r() * 0.2
    }
  }
  return { h: ST.hoogte(s), t: s.t, reden: s.reden, perfect: s.perfecten }
}

const p0 = speel(0, 1)
console.log(`perfecte bot: ${p0.h} hoog in ${p0.t.toFixed(0)} s (${p0.reden})`)
if (p0.reden !== 'tijd') fout('perfecte bot valt af')

let vorige = 1e9
for (const sd of [0.02, 0.035, 0.05, 0.07]) {
  let h = 0, t = 0, kort = 0, maxT = 0
  const N = 300
  for (let i = 0; i < N; i++) {
    const r = speel(sd, i * 31 + 7)
    h += r.h; t += r.t; maxT = Math.max(maxT, r.t)
    if (r.t < 10) kort++
  }
  console.log(`tijdfout ±${(sd * 1000).toFixed(0)} ms: gem. ${(h / N).toFixed(1)} hoog, gem. ${(t / N).toFixed(0)} s, ${kort} keer binnen 10 s af`)
  if (maxT > ST.DUUR + 0.01) fout('potje duurt langer dan een minuut')
  if (h / N > vorige + 0.5) fout('slordiger tikken bouwt hoger')
  vorige = h / N
  if (sd <= 0.05 && kort > N * 0.1) fout(`te vaak heel snel af bij ±${sd * 1000} ms`)
}

console.log(fouten ? `\n${fouten} fout(en)` : '\n✓ alles in orde')
process.exit(fouten ? 1 : 0)
