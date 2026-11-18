// Monsterteam: gevechten, vangen, groeien en veranderen.
//  - een team kan het hele spel uitspelen (alle trainers en leiders) door te trainen
//  - type-voordeel klopt (vuur op plant is super effectief, enzovoort)
//  - wezens leren aanvallen, hebben er nooit meer dan 4 en veranderen op het juiste niveau
//  - vangen lukt vaker als het wilde wezen zwak is
//  - bewaren midden in een gevecht (JSON heen en terug) en verder gaat goed
// Gebruik: node tools/monsterteamTest.js
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/monsterteam/kern.js', import.meta.url), 'utf8'), ctx)
const MT = vm.runInContext('MT', ctx)

let fouten = 0
const fout = m => { fouten++; if (fouten < 15) console.log('✗ ' + m) }

// type-voordeel
const vuur = MT.maak('vonkel', 10), plant = MT.maak('knopje', 10)
if (MT.schade(vuur, plant, 'vonk', 0.5).mult !== 2) fout('vuur op plant moet super effectief zijn')
if (MT.schade(plant, vuur, 'blad', 0.5).mult !== 0.5) fout('plant op vuur moet zwak zijn')
// alle soorten: geldige aanvallen, max 4, evolutie bestaat
for (const id of Object.keys(MT.SOORTEN)) {
  const w = MT.maak(id, 50)
  if (w.aanvallen.length > 4 || w.aanvallen.some(a => !MT.AANVALLEN[a])) fout(id + ': aanvallen kloppen niet')
  const evo = MT.SOORTEN[id].evo
  if (evo && !MT.SOORTEN[evo[0]]) fout(id + ': verandert in iets dat niet bestaat')
}
// groeien en veranderen
const g0 = MT.maak('vonkel', 5), ev = []
MT.geefXp(g0, 20000, ev)
if (g0.id !== 'zonnevos') fout('vonkel moet via vlamvos zonnevos worden, is ' + g0.id)
if (g0.aanvallen.length > 4) fout('meer dan 4 aanvallen')
if (!ev.some(e => e.t === 'evolutie')) fout('geen evolutie-gebeurtenis')

// slimme speler: kiest de sterkste aanval, wisselt bij flauw, traint in het wild tot hij sterk genoeg is
function vecht(g, team) {
  let n = 0
  while (!g.klaar && n < 300) {
    const wi = MT.actiefWij(team); if (wi > 0) { const w = team.splice(wi, 1)[0]; team.unshift(w) }
    const wij = team[0], zij = g.zij[g.zi]
    let beste = wij.aanvallen[0], sc = -1
    for (const a of wij.aanvallen) { const m = MT.AANVALLEN[a]; const v = m.kracht ? MT.schade(wij, zij, a, 0.5).n * m.kans / 100 : (m.heel && wij.hp < MT.maxHp(wij) * 0.3 ? 999 : 0); if (v > sc) { sc = v; beste = a } }
    MT.beurt(g, team, { t: 'aanval', a: beste }); n++
  }
  return g
}
const team = [MT.maak('druppie', 5)]
let gevangen = 0, wildGevechten = 0
for (let gb = 0; gb < MT.GEBIEDEN.length; gb++) {
  for (const soort of ['trainer', 'leider']) {
    let gelukt = false
    for (let poging = 0; poging < 40 && !gelukt; poging++) {
      MT.heelAlles(team)
      const t = MT.GEBIEDEN[gb][soort]
      const g = vecht(MT.gevecht(soort, t.team.map(q => MT.maak(q[0], q[1]))), team)
      if (g.gewonnen) { gelukt = true; break }
      // trainen in het wild, en af en toe een wezen vangen
      for (let w = 0; w < 6; w++) {
        MT.heelAlles(team)
        const wild = MT.wild(gb, Math.random(), Math.random(), Math.random())
        const gw = MT.gevecht('wild', [wild])
        if (team.length < 6 && Math.random() < 0.3) {
          for (let b = 0; b < 6 && !gw.klaar; b++) MT.beurt(gw, team, { t: 'bal', kracht: 1.8 })
          if (gw.gevangen) { team.push(gw.gevangen); gevangen++; continue }
        }
        vecht(gw, team); wildGevechten++
      }
    }
    if (!gelukt) fout(`${soort} van ${MT.GEBIEDEN[gb].naam} niet te verslaan`)
  }
}
console.log(`uitgespeeld met ${wildGevechten} wilde gevechten en ${gevangen} gevangen wezens; team: ${team.map(w => w.id + ' ' + w.lvl).join(', ')}`)
// vangen: zwak is makkelijker
function vangKans(hpDeel) {
  let ok = 0
  for (let i = 0; i < 400; i++) { const w = MT.maak('mosmuis', 4); w.hp = Math.max(1, Math.round(MT.maxHp(w) * hpDeel)); const g = MT.gevecht('wild', [w]); MT.beurt(g, [MT.maak('vonkel', 30)], { t: 'bal', kracht: 1 }); if (g.gevangen) ok++ }
  return ok / 400
}
const vol = vangKans(1), zwak = vangKans(0.1)
console.log(`vangen: vol leven ${Math.round(vol * 100)}%, bijna flauw ${Math.round(zwak * 100)}%`)
if (!(zwak > vol + 0.2)) fout('vangen moet makkelijker zijn als het wezen zwak is')
// bewaren midden in een gevecht
const t1 = [MT.maak('knopje', 12)], gb1 = MT.gevecht('trainer', [MT.maak('poelpad', 10), MT.maak('mosmuis', 10)])
gb1.zaad = 12345
MT.beurt(gb1, t1, { t: 'aanval', a: t1[0].aanvallen[0] })
const kopie = JSON.parse(JSON.stringify({ g: gb1, t: t1 }))
for (let i = 0; i < 10 && !gb1.klaar; i++) { MT.beurt(gb1, t1, { t: 'aanval', a: t1[0].aanvallen[0] }); MT.beurt(kopie.g, kopie.t, { t: 'aanval', a: kopie.t[0].aanvallen[0] }) }
if (JSON.stringify(gb1) !== JSON.stringify(kopie.g)) fout('na bewaren loopt het gevecht anders')
// de wereld: in elk gebied kun je van de onderste naar de bovenste uitgang lopen,
// en elke deur, trainer, wachter en elk spul is bereikbaar
vm.runInContext(readFileSync(new URL('../public/monsterteam/wereld.js', import.meta.url), 'utf8'), ctx)
const MTW = vm.runInContext('MTW', ctx)
for (let a = 0; a < MTW.AANTAL; a++) {
  const k = MTW.kaart(a)
  const loop = (x, y) => x >= 0 && y >= 0 && x < k.w && y < k.h && !'T~r'.includes(k.t[y][x]) && !MTW.opGebouw(k, x, y) && !k.dingen.some(d => d.soort !== 'spul' && d.soort !== 'wachter' && d.y === y && x >= d.x && x < d.x + (d.breed || 1))
  const start = []
  for (let x = 0; x < k.w; x++) { if (k.t[k.h - 1][x] === '=') start.push([x, k.h - 1]); if (a === 0 && k.t[k.h - 2][x] === '=') start.push([x, k.h - 2]) }
  const gezien = new Set(), rij = [...start]
  rij.forEach(q => gezien.add(q + ''))
  while (rij.length) { const [x, y] = rij.shift(); for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const n = [x + dx, y + dy]; if (!gezien.has(n + '') && loop(...n)) { gezien.add(n + ''); rij.push(n) } } }
  const kan = (x, y) => gezien.has([x, y] + '') || [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => gezien.has([x + dx, y + dy] + ''))
  if (a < MTW.AANTAL - 1 && ![...Array(k.w).keys()].some(x => k.t[0][x] === '=' && gezien.has([x, 0] + ''))) fout(`${k.naam}: bovenste uitgang niet te bereiken`)
  k.gebouwen.forEach(g => { if (!gezien.has([g.deur[0], g.deur[1] + 1] + '')) fout(`${k.naam}: deur van ${g.soort} niet te bereiken`) })
  k.dingen.forEach(d => { if (!kan(d.x, d.y)) fout(`${k.naam}: ${d.soort} niet te bereiken`) })
}
console.log(`wereld: ${MTW.AANTAL} gebieden nagelopen`)
console.log(fouten ? `\n${fouten} fout(en)` : '\nalles goed')
process.exit(fouten ? 1 : 0)
