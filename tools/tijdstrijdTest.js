// Tijdstrijd: een bot speelt elk van de 5 computerniveaus een paar keer, zonder
// en met upgrades, en speelt redelijk maar niet perfect (zoals een kind dat
// het spel een beetje kent). We kijken of de niveaus echt steeds moeilijker
// worden, of het moeilijkste niveau met upgrades te halen is, of een slag niet
// eindeloos duurt en of een opgeslagen slag verder kan.
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
if (T.NIVEAUS.length !== 5) fout('er zijn geen 5 niveaus')
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
  for (let i = 0; i < 5; i++) { s.zij[0].xp = 1e7; T.evolueer(s, 0) }
  if (s.zij[0].e !== 4) fout('je komt niet tot de Ruimte')
  s.zij[0].e = 0; s.zij[0].torens = [null]
  s.zij[0].goud = 5000
  if (!T.toren(s, 0) || !T.plek(s, 0) || !T.toren(s, 0)) fout('torens of plekken kopen werkt niet')
  if (T.toren(s, 0)) fout('een toren van hetzelfde tijdperk vervangt een andere')
}
{
  // niets doen moet verliezen
  const s = T.nieuw(0)
  while (s.fase === 'spel' && s.t < 600) T.stap(s, 0.5)
  if (s.uitslag !== 'verloren') fout('niets doen verliest op Makkelijk niet')
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

// een slag halverwege opslaan (JSON) en weer verder spelen
{
  const s = T.nieuw(1, { seed: 5 }), r = T.rng(9)
  while (s.t < 120) { bot(s, r, 0.75); T.stap(s, 0.5) }
  const terug = T.herstel(JSON.parse(JSON.stringify(s)))
  if (!terug || terug.zij[0].e !== s.zij[0].e || terug.eenheden.length !== s.eenheden.length) fout('een opgeslagen slag komt niet goed terug')
  else {
    while (terug.fase === 'spel' && terug.t < 1500) { bot(terug, r, 0.75); T.stap(terug, 0.5) }
    if (!terug.uitslag) fout('een herstelde slag speelt niet verder')
  }
}

const VOL = {}
Object.keys(T.UPGRADES).forEach(id => { VOL[id] = T.UPGRADES[id].prijzen.length })
const HALF = { goud: 2, inkomen: 2, basis: 2, kracht: 2, toren: 1, super: 1 }
const N = SNEL ? 3 : 6
const winst = (n, up) => {
  let w = 0, tijd = 0
  for (let i = 0; i < N; i++) {
    const res = speel(n, up, n * 100 + i + 1, 0.75)
    if (res.s.uitslag === 'gewonnen') w++
    tijd = Math.max(tijd, res.s.t)
    if (res.s.t > 1200) fout(`${T.NIVEAUS[n].naam}: een slag duurt te lang (${Math.round(res.s.t)} s)`)
  }
  return { w, tijd }
}
const zonder = [], half = [], vol = []
T.NIVEAUS.forEach((d, n) => {
  zonder.push(winst(n, {})); half.push(winst(n, HALF)); vol.push(winst(n, VOL))
  console.log(`${d.naam.padEnd(14)} zonder upgrades ${zonder[n].w}/${N}, half ${half[n].w}/${N}, alles ${vol[n].w}/${N}, langste slag ${Math.round(vol[n].tijd / 6) / 10} min`)
})
if (zonder[0].w < N - 1) fout('Makkelijk is zonder upgrades niet makkelijk')
if (zonder[4].w > 0) fout('Onmogelijk is zonder upgrades te winnen')
if (vol[4].w === 0) fout('Onmogelijk is zelfs met alle upgrades niet te winnen')
for (let n = 1; n < 5; n++) if (zonder[n].w + half[n].w > zonder[n - 1].w + half[n - 1].w) fout(`${T.NIVEAUS[n].naam} is makkelijker dan ${T.NIVEAUS[n - 1].naam}`)

console.log(fouten ? `\n${fouten} fout(en)` : '\n✓ Tijdstrijd klopt')
process.exit(fouten ? 1 : 0)
