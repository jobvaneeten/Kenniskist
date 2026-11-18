// Neonglij: controleert alle levels en de spelregels.
//  - de oplosser lost elk level op, in precies het opgeslagen minimum (3 sterren)
//  - elke wereld gebruikt wat ze leert (duwen, pijlen, portalen, knoppen)
//  - terugzetten: 1000× willekeurige zet, terug, en de toestand is gelijk
//  - een zet die niets doet, verandert niets; een eeuwige lus telt niet
//  - de uitdaging van vandaag is op elke dag op te lossen en snel genoeg gemaakt
// Gebruik: node tools/neonglijTest.js
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
for (const f of ['kern.js', 'levels.js']) vm.runInContext(readFileSync(new URL('../public/neonglij/' + f, import.meta.url), 'utf8'), ctx)
const NG = vm.runInContext('NG', ctx), WERELDEN = vm.runInContext('NG_WERELDEN', ctx)

let fouten = 0
const fout = m => { fouten++; if (fouten < 15) console.log('✗ ' + m) }

// 1. alle levels
const NODIG = [null, ['duw'], ['pijl', 'kraak'], ['portaal'], ['knop']]
for (const [w, W] of WERELDEN.entries()) {
  if (W.levels.length !== 12) fout(`${W.naam}: ${W.levels.length} levels`)
  let rij = []
  for (const [l, lv] of W.levels.entries()) {
    const t = Date.now(), r = NG.los(NG.laad(lv.r))
    if (r.min !== lv.min) fout(`${W.naam} ${l + 1}: oplosser zegt ${r.min}, opgeslagen ${lv.min}`)
    if (NODIG[w] && r.min > 0) { const g = NG.gebruikt(lv.r, r.zetten); if (!NODIG[w].some(k => g[k])) fout(`${W.naam} ${l + 1}: gebruikt geen ${NODIG[w].join(' of ')}`) }
    // oplossing naspelen: eindigt met winnen
    let s = NG.laad(lv.r), laatste
    for (const z of r.zetten || []) { laatste = NG.zet(s, z); s = laatste.s }
    if (!s.klaar) fout(`${W.naam} ${l + 1}: oplossing wint niet`)
    if (NG.sterren(r.min, lv.min) !== 3) fout(`${W.naam} ${l + 1}: minimum geeft geen 3 sterren`)
    rij.push(`${l + 1}:${r.min}/${r.bekeken}${Date.now() - t > 200 ? '(traag)' : ''}`)
  }
  console.log(W.naam.padEnd(15), rij.join('  '))
}

// 2. terugzetten = de toestand van ervoor (zoals spel.js: de oude toestand bewaren)
const R = NG.rng(7)
for (let n = 0; n < 1000; n++) {
  const W = WERELDEN[n % 5], lv = W.levels[(n * 7) % 12]
  let s = NG.laad(lv.r)
  for (let k = 0; k < 1 + (R() * 6 | 0); k++) { const u = NG.zet(s, R() * 4 | 0); if (u.gevolg === 'ok') s = u.s }
  const voor = NG.sleutel(s) + s.kristallen + s.zetten, hist = [s]
  const u = NG.zet(s, R() * 4 | 0)
  if (u.gevolg === 'niks' || u.gevolg === 'lus') { if (u.s !== s) fout('niks/lus geeft een nieuwe toestand'); continue }
  if (NG.sleutel(s) + s.kristallen + s.zetten !== voor) fout('zet veranderde de oude toestand')
  const terug = hist.pop()
  if (NG.sleutel(terug) + terug.kristallen + terug.zetten !== voor) fout('terugzetten klopt niet')
}

// 3. regels op kleine borden
const zetVan = (rijen, r) => NG.zet(NG.laad(rijen), r)
let u = zetVan(['#####', '#S.*#', '#####'], 1)
if (u.s.bal !== 8 || u.s.kristallen !== 0) fout('glijden of kristal pakken')
u = zetVan(['######', '#SB.O#', '######'], 1)
if (u.s.c.join('').indexOf('O') >= 0 || u.s.c.join('').indexOf('B') >= 0 || u.s.bal !== 7) fout('blok vult gat niet')
u = zetVan(['#####', '#SB##', '#####'], 1)
if (u.gevolg !== 'niks') fout('vastzittend blok moet niks doen')
u = zetVan(['#######', '#Sp#p.#', '#######'], 1)
if (u.s.bal !== 12) fout('portaal')
u = zetVan(['#####', '#Sk.#', '#.G.#', '#####'], 1)
if (!u.s.flip) fout('knop wisselt niet')
u = zetVan(['#####', '#S.O#', '#####'], 1)
if (u.gevolg !== 'val') fout('gat')
u = zetVan(['######', '#Sx..#', '######'], 1)
if (u.s.c[8] !== 'O') fout('breekijs breekt niet')
u = zetVan(['#####', '#S>v#', '#.^<#', '#####'], 1)
if (u.gevolg !== 'lus') fout('eeuwige lus moet niet tellen')
u = zetVan(['#####', '#S.E#', '#*..#', '#####'], 1)
if (u.s.klaar) fout('uitgang open zonder alle kristallen')

// 4. uitdaging van vandaag: 60 dagen
let traagst = 0, mislukt = 0
const d0 = new Date(2026, 10, 1)
for (let k = 0; k < 60; k++) {
  const d = new Date(d0.getTime() + k * 86400000), dag = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
  const t = Date.now(), lv = NG.dagLevel(dag), ms = Date.now() - t
  traagst = Math.max(traagst, ms)
  if (!lv) { mislukt++; continue }
  if (NG.los(NG.laad(lv.r)).min !== lv.min) fout(`dag ${dag} klopt niet`)
  const nog = NG.dagLevel(dag)
  if (nog.r.join() !== lv.r.join()) fout(`dag ${dag}: niet voor iedereen hetzelfde`)
}
if (mislukt) fout(`${mislukt} dagen zonder uitdaging (dan reserve-level)`)
console.log(`uitdaging: 60 dagen, traagste ${traagst} ms`)
if (traagst > 1500) fout('uitdaging maken duurt te lang')

console.log(fouten ? `\n${fouten} fout(en)` : '\nalles goed')
process.exit(fouten ? 1 : 0)
