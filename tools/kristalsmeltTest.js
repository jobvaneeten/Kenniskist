// Kristalsmelt: bots spelen honderden potjes en de regels worden los getest.
//  - na elke zet ligt er nergens een groep van 3 of meer (alles is gesmolten)
//  - drie stof naast elkaar wordt één scherf op de plek van het laatste stuk
//  - kettingreactie, bom, regenboog en opzij leggen doen wat ze moeten doen
//  - bewaren en verder (JSON heen en terug) geeft hetzelfde potje
// Gebruik: node tools/kristalsmeltTest.js
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/kristalsmelt/kern.js', import.meta.url), 'utf8'), ctx)
const KM = vm.runInContext('KM', ctx)

let fouten = 0
const fout = m => { fouten++; if (fouten < 15) console.log('✗ ' + m) }
const leeg = () => { const s = KM.nieuw(1); s.c = s.c.map(() => -1); return s }

// bot: kiest het vakje dat de hoogste score geeft
function bot(s) {
  let beste = -1, sc = -1
  for (let i = 0; i < s.c.length; i++) {
    if (!KM.magLeggen(s, i)) continue
    const t = KM.kopie(s); KM.leg(t, i)
    const w = t.score + (s.huidig === 'bom' ? s.c[i] * -10 : 0) + Math.random()
    if (w > sc) { sc = w; beste = i }
  }
  return beste
}
const scores = [], hoogste = []
for (let p = 0; p < 200; p++) {
  const s = KM.nieuw(p * 13 + 5)
  let z = 0
  while (!s.over && z < 3000) {
    const i = bot(s)
    if (i < 0) { if (!KM.wissel(s)) { fout('geen zet en niet af'); break } continue }
    KM.leg(s, i); z++
    for (let j = 0; j < s.c.length; j++) if (s.c[j] >= 0 && s.c[j] < KM.MAX && KM.groep(s, j).length >= 3) { fout('groep van 3 bleef liggen'); break }
  }
  scores.push(s.score); hoogste.push(s.hoogste)
}
scores.sort((a, b) => a - b); hoogste.sort((a, b) => a - b)
console.log(`bot: 200 potjes, mediaan ${scores[100]} punten, hoogste stuk meestal ${KM.NAMEN[hoogste[100]]}, beste ${KM.NAMEN[hoogste[199]]}`)

// drie stof
let s = leeg(); s.c[0] = 0; s.c[1] = 0; s.huidig = 0
KM.leg(s, 2)
if (s.c[2] !== 1 || s.c[0] !== -1 || s.c[1] !== -1) fout('drie stof moet één scherf worden op het laatste vakje')
// kettingreactie: stof wordt scherf, die smelt met twee scherven tot kristal
s = leeg(); s.c[0] = 0; s.c[1] = 0; s.c[8] = 1; s.c[14] = 1; s.huidig = 0
const u = KM.leg(s, 2)
if (s.c[2] !== 2 || u.ev.filter(e => e.t === 'smelt').length !== 2) fout('kettingreactie')
// bom
s = leeg(); s.c[5] = 3; s.huidig = 'bom'
if (KM.leg(s, 4).ok) fout('bom op een leeg vakje mag niet')
KM.leg(s, 5); if (s.c[5] !== -1) fout('bom haalt het stuk niet weg')
// regenboog kiest het hoogste dat smelt
s = leeg(); s.c[0] = 3; s.c[2] = 3; s.c[7] = 0; s.c[13] = 0; s.huidig = 'joker'
KM.leg(s, 1)
if (s.c[1] !== 4) fout('regenboog moet de edelstenen laten smelten')
// opzij leggen: één keer per beurt
s = KM.nieuw(5); const h = s.huidig
if (!KM.wissel(s) || s.opslag !== h) fout('opzij leggen')
if (KM.wissel(s)) fout('twee keer wisselen in één beurt mag niet')
// bewaren en verder
const a = KM.nieuw(77), b0 = KM.nieuw(77)
for (let i = 0; i < 15; i++) { const z = bot(a); KM.leg(a, z); KM.leg(b0, z) }
const b = JSON.parse(JSON.stringify(b0))
for (let i = 0; i < 60 && !a.over; i++) { const z = bot(a); if (z < 0) break; KM.leg(a, z); KM.leg(b, z) }
if (JSON.stringify(a) !== JSON.stringify(b)) fout('na bewaren loopt het potje anders')

console.log(fouten ? `\n${fouten} fout(en)` : '\nalles goed')
process.exit(fouten ? 1 : 0)
