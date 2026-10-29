// Vlotstrijd: een bot speelt alle 40 levels op volgorde, koopt met zijn munten
// wapens en upgrades, en mikt goed maar niet perfect (zoals een kind dat het
// spel een beetje kent). We kijken of elk level te halen is, of het niet te
// makkelijk is, en of de regels kloppen.
// Gebruik: node tools/vlotstrijdTest.js   (of: ... snel)
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/vlotstrijd/kern.js', import.meta.url), 'utf8'), ctx)
const V = ctx.VS
let fouten = 0
const fout = m => { fouten++; if (fouten < 20) console.log('✗ ' + m) }

// ── regels ──
if (V.LEVELS !== 40) fout('er zijn geen 40 levels')
for (let L = 0; L < V.LEVELS; L++) {
  const d = V.bouwLevel(L)
  if ((L % 10 === 9) !== d.vijanden.some(v => V.SOORTEN[v.soort].baas)) fout(`level ${L + 1}: eindbaas klopt niet`)
  if (!d.vijanden.length) fout(`level ${L + 1}: geen vijanden`)
  d.vijanden.forEach(v => { if (v.x < d.raft.x0 || v.x > d.raft.x1) fout(`level ${L + 1}: vijand staat naast het vlot`) })
}
{
  const s = V.nieuw(0, { seed: 1 })
  s.vijanden[0].hp = 1
  // recht vooruit schieten valt in zee
  V.schiet(s, 0.05, 0.3, 'bal')
  let ev = []; for (let i = 0; i < 400 && s.kogels.length; i++) ev = ev.concat(V.stap(s, 1 / 60))
  if (!ev.some(e => e.type === 'plons')) fout('een slap schot valt niet in zee')
  V.naVlucht(s)
  if (s.fase !== 'vijand') fout('na jouw schot is de vijand niet aan de beurt')
  V.vijandSchiet(s); for (let i = 0; i < 600 && s.kogels.length; i++) V.stap(s, 1 / 60); V.naVlucht(s)
  if (s.fase !== 'speler' || s.held !== 1) fout('na de vijand is de tweede held niet aan de beurt')
}

// ── de bot ──
function kloon(s) {
  return Object.assign({}, s, {
    helden: s.helden.map(c => ({ ...c })), vijanden: s.vijanden.map(c => ({ ...c })), blokken: s.blokken.map(b => ({ ...b })),
    kogels: [], events: [], gebruik: { ...s.gebruik }, rij: [], rnd: V.rng(5),
  })
}
// wat raakt dit schot? geeft de schade aan vijanden (en of het doel geraakt is)
function proef(s, hoek, kracht, wapen, doelId) {
  const p = kloon(s)
  if (!V.schiet(p, hoek, kracht, wapen)) return null
  let schade = 0, doel = false
  for (let i = 0; i < 500 && p.kogels.length; i++) {
    V.stap(p, 1 / 60).forEach(e => { if (e.type === 'raak' && e.kant === 'vijand') { schade += e.schade; if (e.id === doelId) doel = true } })
  }
  return { schade, doel }
}
function besteSchot(s, wapen, doel) {
  let best = null
  const zoek = (a0, a1, da, k0, k1, dk) => {
    for (let a = a0; a <= a1; a += da) for (let k = k0; k <= k1; k += dk) {
      const r = proef(s, a, k, wapen, doel.id)
      if (!r) continue
      const score = r.schade + (r.doel ? 30 : 0)
      if (!best || score > best.score) best = { a, k, score, r }
    }
  }
  zoek(0.15, 1.4, 0.08, 0.25, 1, 0.03)
  if (best && best.score > 0) zoek(best.a - 0.05, best.a + 0.05, 0.012, best.k - 0.025, best.k + 0.025, 0.005)
  return best
}
function speelLevel(L, opties, seed) {
  const s = V.nieuw(L, { ...opties, seed })
  const r = V.rng(seed * 31 + 7)
  for (let beurt = 0; beurt < 80 && !s.uitslag; beurt++) {
    if (s.fase === 'speler') {
      const doelen = V.levend(s.vijanden).sort((a, b) => a.hp - b.hp)
      const doel = doelen.find(v => v.baas) || doelen[0]
      // speciaal wapen als het loont (baas of meerdere vijanden), anders de kogel
      let wapen = 'bal'
      for (const w of ['bom', 'raket', 'water', 'stuiter', 'drie']) if (s.wapens.includes(w) && s.gebruik[w] > 0 && (doel.baas || doelen.length >= 2 || doel.hp > 60)) { wapen = w; break }
      let b = besteSchot(s, wapen, doel)
      if ((!b || b.score <= 0) && wapen !== 'bal') { wapen = 'bal'; b = besteSchot(s, wapen, doel) }
      const fh = (r() + r() + r() - 1.5) * 0.02, fk = (r() + r() + r() - 1.5) * 0.02
      V.schiet(s, (b ? b.a : 0.7) + fh, (b ? b.k : 0.7) * (1 + fk), wapen)
    } else if (s.fase === 'vijand') V.vijandSchiet(s)
    for (let i = 0; i < 900 && s.kogels.length; i++) V.stap(s, 1 / 60)
    V.naVlucht(s)
  }
  return s
}

const snel = process.argv[2] === 'snel'
const kooplijst = [['wapen', 'drie'], ['up', 'kracht'], ['up', 'hp'], ['up', 'mik'], ['wapen', 'water'], ['up', 'kracht'], ['up', 'schild'], ['up', 'hp'],
  ['wapen', 'stuiter'], ['up', 'kracht'], ['wapen', 'bom'], ['up', 'hp'], ['up', 'extra'], ['up', 'schild'], ['up', 'kracht'], ['wapen', 'raket'], ['up', 'hp'], ['up', 'kracht'], ['up', 'extra'], ['up', 'hp'], ['up', 'schild']]
const D = { munten: 0, wapens: ['bal'], upgrades: {} }
let volgende = 0
function koop() {
  for (;;) {
    while (volgende < kooplijst.length) {
      const [s, i] = kooplijst[volgende]
      if (s === 'wapen' ? !D.wapens.includes(i) : (D.upgrades[i] || 0) < V.UPGRADES[i].prijzen.length) break
      volgende++
    }
    if (volgende >= kooplijst.length) return
    const [soort, id] = kooplijst[volgende]
    const prijs = soort === 'wapen' ? V.WAPENS[id].prijs : V.UPGRADES[id].prijzen[D.upgrades[id] || 0]
    if (D.munten < prijs) return
    D.munten -= prijs
    if (soort === 'wapen') D.wapens.push(id); else D.upgrades[id] = (D.upgrades[id] || 0) + 1
    volgende++
  }
}
const pogingen = [], rondes = []
let seed = 1
for (let L = 0; L < V.LEVELS; L++) {
  let n = 0, s
  do { n++; s = speelLevel(L, { wapens: D.wapens, upgrades: D.upgrades }, seed++); D.munten += V.beloning(s); koop() } while (s.uitslag !== 'gewonnen' && n < 8)
  pogingen.push(n); rondes.push(s.schoten)
  if (s.uitslag !== 'gewonnen') fout(`level ${L + 1} niet gehaald in 8 pogingen`)
}
console.log('pogingen per level: ' + pogingen.join(' '))
console.log('schoten in het gewonnen potje: ' + rondes.join(' '))
console.log('aan het eind: ' + D.munten + ' munten, wapens ' + D.wapens.join(',') + ', upgrades ' + JSON.stringify(D.upgrades))
const gem = pogingen.reduce((a, b) => a + b, 0) / pogingen.length
if (gem > 2.2) fout(`gemiddeld ${gem.toFixed(2)} pogingen per level: te moeilijk`)
if (pogingen.slice(0, 3).some(p => p > 2)) fout('de eerste levels zijn te moeilijk')
if (rondes.some(r => r > 22)) fout('een level duurt te lang (meer dan 22 schoten)')

// ── zonder upgrades: niet alles mag te makkelijk zijn ──
if (!snel) {
  let winst = 0
  for (let i = 0; i < 6; i++) if (speelLevel(38, { wapens: ['bal'] }, 900 + i).uitslag === 'gewonnen') winst++
  console.log(`level 39 zonder wapens of upgrades: ${winst}/6 gewonnen`)
  if (winst === 6) fout('level 39 is ook zonder upgrades heel makkelijk')
  let begin = 0
  for (let i = 0; i < 8; i++) if (speelLevel(0, { wapens: ['bal'] }, 500 + i).uitslag === 'gewonnen') begin++
  console.log(`level 1 zonder upgrades: ${begin}/8 gewonnen`)
  if (begin < 7) fout('level 1 is te moeilijk')
}

console.log(fouten ? `\n${fouten} fout(en)` : '\n✓ alles in orde')
process.exit(fouten ? 1 : 0)
