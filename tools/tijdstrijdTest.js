// Tijdstrijd: een bot speelt alle 15 veldslagen op volgorde, koopt met zijn
// munten upgrades en speelt redelijk maar niet perfect (zoals een kind dat
// het spel een beetje kent). We kijken of elke slag te winnen is, niet te
// makkelijk is en niet eindeloos duurt, en of de regels kloppen.
// Gebruik: node tools/tijdstrijdTest.js   (of: ... snel)
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/tijdstrijd/kern.js', import.meta.url), 'utf8'), ctx)
const T = ctx.TS
const SNEL = process.argv.includes('snel')
let fouten = 0
const fout = m => { fouten++; if (fouten < 20) console.log('✗ ' + m) }

// ── regels ──
if (T.LEVELS.length !== 15) fout('er zijn geen 15 veldslagen')
{
  const s = T.nieuw(0)
  if (!T.koop(s, 0, 0)) fout('kan geen holbewoner kopen')
  for (let i = 0; i < 60; i++) T.stap(s, 0.05)
  if (!s.eenheden.some(u => u.kant === 0)) fout('de soldaat komt niet uit de basis')
  T.houding(s, true)
  for (let i = 0; i < 400; i++) T.stap(s, 0.05)
  if (s.eenheden.some(u => u.kant === 0 && u.x > T.HOUD_X + 1)) fout('"houd stand" houdt de soldaten niet tegen')
  s.zij[0].xp = 99999
  if (!T.evolueer(s, 0) || s.zij[0].e !== 1) fout('evolueren werkt niet')
  if (T.evolueer(s, 0)) fout('slag 1 laat je verder dan de Ridders')
  s.zij[0].goud = 5000
  if (!T.toren(s, 0) || !T.plek(s, 0) || !T.toren(s, 0)) fout('torens of plekken kopen werkt niet')
  if (T.toren(s, 0)) fout('een toren van hetzelfde tijdperk vervangt een andere')
}
{
  // niets doen moet verliezen
  const s = T.nieuw(0)
  while (s.fase === 'spel' && s.t < 600) T.stap(s, 0.5)
  if (s.uitslag !== 'verloren') fout('niets doen verliest slag 1 niet')
}

// ── de bot ──
function bot(s, r, slim) {
  const z = s.zij[0]
  if (T.kanEvolueren(s, 0)) T.evolueer(s, 0)
  if (T.kanMegabom(s, 0)) T.megabom(s, 0)
  const vijanden = s.eenheden.filter(u => u.kant === 1)
  if (z.lading >= 1 && vijanden.filter(u => u.x < 900).length >= 3) T.superAanval(s, 0)
  const tw = T.torenInfo(z.e)
  if (r() < slim * 0.4 && z.goud > tw.prijs * 1.4) {
    if (T.torenPlek(z) >= 0) T.toren(s, 0)
    else if (T.plekPrijs(z) != null && z.goud > T.plekPrijs(z) + tw.prijs) T.plek(s, 0)
  }
  // spaart voor wat hij van plan was
  if (z.rij.length >= 2) return
  if (s.plan == null) { const x = r(); s.plan = x < 0.35 ? 0 : x < 0.8 ? 1 : 2 }
  if (T.koop(s, 0, s.plan)) s.plan = null
}
function speel(L, upgrades, seed, slim) {
  const s = T.nieuw(L, { upgrades, seed }), r = T.rng(seed * 31 + 7)
  const evo = []
  while (s.fase === 'spel' && s.t < 1500) {
    bot(s, r, slim)
    T.stap(s, 0.5).forEach(e => { if (e.type === 'tijdperk' && e.kant === 0) evo.push(Math.round(s.t)) })
  }
  return { s, evo }
}
function koopUpgrades(up, munten) {
  for (;;) {
    let best = null
    for (const id of Object.keys(T.UPGRADES)) {
      const n = up[id] || 0, p = T.UPGRADES[id].prijzen[n]
      if (p != null && (!best || p < best.p)) best = { id, p }
    }
    if (!best || best.p > munten) return munten
    munten -= best.p; up[best.id] = (up[best.id] || 0) + 1
  }
}

let up = {}, munten = 0
const pogingen = []
for (let L = 0; L < T.LEVELS.length; L++) {
  let n = 0, res
  for (;;) {
    n++
    munten = koopUpgrades(up, munten)
    res = speel(L, up, L * 100 + n, 0.75)
    munten += T.beloning(res.s)
    if (res.s.uitslag === 'gewonnen' || n >= 12) break
  }
  pogingen.push(n)
  const s = res.s
  if (s.uitslag !== 'gewonnen') fout(`slag ${L + 1}: na 12 pogingen nog niet gewonnen`)
  if (s.t > 1200) fout(`slag ${L + 1}: duurt te lang (${Math.round(s.t)} s)`)
  if (!SNEL || L % 3 === 2) console.log(`slag ${String(L + 1).padStart(2)}: ${(s.uitslag || 'gelijk').padEnd(9)} poging ${n}, ${Math.round(s.t / 6) / 10} min, ${T.sterren(s)} sterren, tijdperken op ${res.evo.join('/')} s, computer in ${T.TIJDPERKEN[s.zij[1].e].naam}, upgrades ${JSON.stringify(up)}`)
}
if (pogingen[0] > 1) fout('slag 1 lukt niet in één keer')
if (pogingen.every(n => n === 1)) fout('elke slag lukt meteen: te makkelijk')

// zonder upgrades moet de laatste slag een stuk zwaarder zijn dan met
{
  let win = 0
  for (let i = 0; i < 4; i++) if (speel(14, {}, 900 + i, 0.75).s.uitslag === 'gewonnen') win++
  console.log(`slag 15 zonder upgrades: ${win}/4 gewonnen`)
  if (win === 4) fout('slag 15 is zonder upgrades ook makkelijk')
}

console.log(fouten ? `\n${fouten} fout(en)` : '\n✓ Tijdstrijd klopt')
process.exit(fouten ? 1 : 0)
