// Blokkenblitz: laat een slimme en een willekeurige bot honderden potjes spelen.
// Controleert dat de blokkengever eerlijk is (er past altijd minstens één blok
// van een nieuwe set), dat game over klopt, dat de gever snel genoeg is en dat
// goed spelen duidelijk meer oplevert dan gokken.
// Gebruik: node tools/blokkenblitzTest.js
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/blokkenblitz/kern.js', import.meta.url), 'utf8'), ctx)
const BB = ctx.BB
const N = BB.N

let fouten = 0
const fout = m => { fouten++; if (fouten < 10) console.log('✗ ' + m) }

// vormen-check: elke vorm uniek en binnen het bord
const keys = new Set(BB.VORMEN.map(v => v.cellen.map(p => p.join(',')).join(';')))
if (keys.size !== BB.VORMEN.length) fout('dubbele vormen')
console.log(`${BB.VORMEN.length} vormen (met draaiingen)`)

// gaten: lege cellen die (bijna) ingesloten zijn — slecht voor de toekomst
function waardeer(rijen) {
  let s = 0
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (rijen[r] & (1 << c)) continue
    let buren = 0
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rr = r + dr, cc = c + dc
      if (rr < 0 || cc < 0 || rr >= N || cc >= N || (rijen[rr] & (1 << cc))) buren++
    }
    if (buren >= 3) s -= 6; else if (buren === 2) s -= 1
  }
  return s - BB.telVol(rijen) * 0.5
}

function speel(seed, slim) {
  const s = BB.nieuwSpel(seed)
  const r = BB.rng(seed ^ 0x5bd1e995)
  let maxMs = 0
  let vorigeSet = null
  while (!s.over && s.zetten < 4000) {
    if (s.set !== vorigeSet) {
      vorigeSet = s.set
      if (!s.set.some(v => v && BB.pastErgens(s.rijen, v))) fout(`seed ${seed}: set zonder passend blok`)
    }
    let best = null
    for (let i = 0; i < 3; i++) {
      const v = s.set[i]; if (!v) continue
      for (let rr = 0; rr <= N - v.h; rr++) for (let cc = 0; cc <= N - v.w; cc++) {
        if (!BB.past(s.rijen, v, rr, cc)) continue
        const x = BB.leg(s.rijen, v, rr, cc)
        const score = slim ? (x.volR.length + x.volK.length) * 40 + waardeer(x.rijen) : r()
        if (!best || score > best.score) best = { i, rr, cc, score }
      }
    }
    if (!best) { fout(`seed ${seed}: niets past maar niet game over`); break }
    const t0 = performance.now()
    const res = BB.plaats(s, best.i, best.rr, best.cc)
    if (res.nieuweSet) maxMs = Math.max(maxMs, performance.now() - t0)
  }
  // game over moet echt kloppen
  if (s.over && s.set.some(v => v && BB.pastErgens(s.rijen, v))) fout(`seed ${seed}: game over terwijl er nog iets past`)
  return { score: s.score, zetten: s.zetten, lijnen: s.lijnen, combo: s.besteCombo, perfects: s.perfects, maxMs }
}

function stats(lijst, k) {
  const v = lijst.map(x => x[k]).sort((a, b) => a - b)
  return `mediaan ${v[v.length >> 1]}, p10 ${v[Math.floor(v.length * 0.1)]}, p90 ${v[Math.floor(v.length * 0.9)]}, max ${v[v.length - 1]}`
}

for (const [naam, slim, n] of [['slimme bot', true, 120], ['gok-bot', false, 300]]) {
  const res = []
  for (let i = 0; i < n; i++) res.push(speel(1000 + i, slim))
  console.log(`${naam}: score ${stats(res, 'score')}`)
  console.log(`   zetten ${stats(res, 'zetten')} · beste combo ${stats(res, 'combo')} · perfects totaal ${res.reduce((a, b) => a + b.perfects, 0)}`)
  console.log(`   blokkengever max ${Math.max(...res.map(r => r.maxMs)).toFixed(1)} ms`)
  if (Math.max(...res.map(r => r.maxMs)) > 150) fout('blokkengever te traag')
  res.naam = naam
  globalThis[slim ? 'SLIM' : 'GOK'] = res
}
const med = (l) => l.map(x => x.score).sort((a, b) => a - b)[l.length >> 1]
if (!(med(globalThis.SLIM) > 3 * med(globalThis.GOK))) fout('goed spelen levert te weinig meer op dan gokken')
// zelfs lukraak leggen moet een paar sets meegaan (beginners zijn niet meteen af)
if (globalThis.GOK.map(x => x.zetten).sort((a, b) => a - b)[globalThis.GOK.length >> 1] < 12) fout('gokken is te snel voorbij (te moeilijk voor beginners)')
if (fouten) { console.log(`\n${fouten} fout(en)`); process.exit(1) }
console.log('✓ alles klopt')
