// Neonhockey: laat computerspelers honderden wedstrijden tegen elkaar spelen.
// Controleert dat de puck altijd op tafel blijft (of in een doel verdwijnt),
// dat sticks in hun eigen helft blijven, dat er gescoord wordt, dat een
// wedstrijd ongeveer een minuut duurt en dat sterkere tegenstanders winnen.
// Gebruik: node tools/neonhockeyTest.js
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/neonhockey/kern.js', import.meta.url), 'utf8'), ctx)
const HK = ctx.HK

let fouten = 0
const fout = m => { fouten++; if (fouten < 10) console.log('✗ ' + m) }

function speel(a, b, seed) {
  const w = HK.nieuweWedstrijd({ tegen: b, ai0: a, seed })
  let goals = 0, t = 0
  while (!w.over && t < 200) {
    const ev = HK.stap(w, 1 / 60)
    t += 1 / 60
    for (const e of ev) if (e.type === 'goal') goals++
    for (const p of w.pucks) {
      if (!isFinite(p.x + p.y + p.vx + p.vy)) { fout(`NaN (seed ${seed})`); return null }
      if (p.x < -0.01 || p.x > HK.B + 0.01 || p.y < -0.2 || p.y > HK.H + 0.2) { fout(`puck van tafel ${p.x.toFixed(3)},${p.y.toFixed(3)} (seed ${seed})`); return null }
      const buitenMond = p.x < HK.D0 || p.x > HK.D1
      if (buitenMond && (p.y < -0.002 || p.y > HK.H + 0.002)) { fout(`puck door eindmuur (seed ${seed})`); return null }
    }
    for (let k = 0; k < 2; k++) {
      const s = w.sticks[k], g = HK.grenzen(k)
      if (s.x < g[0] - 1e-6 || s.x > g[1] + 1e-6 || s.y < g[2] - 0.08 || s.y > g[3] + 0.08) { fout(`stick ${k} buiten zijn helft (seed ${seed})`); return null }
    }
  }
  if (!w.over) fout(`wedstrijd eindigt niet (seed ${seed})`)
  return { t, goals, winnaar: w.winnaar, score: w.score }
}

const T = HK.TEGENSTANDERS.length
let duur = 0, n = 0, maxDuur = 0, nul = 0
for (let i = 0; i < T; i++) {
  let winst = 0, potjes = 0, goals = 0
  for (let seed = 1; seed <= 40; seed++) {
    // zwakkere bot (onder) tegen tegenstander i (boven)
    const r = speel(Math.max(0, i - 2), i, seed * 7919 + i)
    if (!r) continue
    potjes++; goals += r.goals; duur += r.t; n++; maxDuur = Math.max(maxDuur, r.t)
    if (r.goals === 0) nul++
    if (r.winnaar === 1) winst++
  }
  console.log(`${HK.TEGENSTANDERS[i].naam.padEnd(13)} wint ${winst}/${potjes} van een zwakkere bot, gem. ${(goals / potjes).toFixed(1)} goals`)
  if (i >= 2 && winst < potjes * 0.5) fout(`${HK.TEGENSTANDERS[i].naam} wint te weinig van een zwakkere tegenstander`)
}
console.log(`gem. duur ${(duur / n).toFixed(1)} s, langste ${maxDuur.toFixed(1)} s, ${nul} doelpuntloze potjes`)
if (maxDuur > HK.DUUR + 20 + 20) fout('een wedstrijd duurt veel langer dan een minuut')
if (nul > n * 0.05) fout('te veel wedstrijden zonder doelpunt')

console.log(fouten ? `\n${fouten} fout(en)` : '\n✓ alles in orde')
process.exit(fouten ? 1 : 0)
