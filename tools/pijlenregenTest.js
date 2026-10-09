// Pijlenregen: laat een oplettende bot en een gokbot alle 40 levels spelen.
// Controleert dat elke schijf uit te spelen is (de oplettende bot faalt nooit,
// met menselijke pauzes tussen de worpen), dat een level ongeveer een minuut
// duurt, dat kristallen niet onder vaste pijlen liggen en dat de levels
// moeilijker worden (de gokbot faalt later vaker).
// Gebruik: node tools/pijlenregenTest.js
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/pijlenregen/kern.js', import.meta.url), 'utf8'), ctx)
const PR = ctx.PR

let fouten = 0
const fout = m => { fouten++; if (fouten < 12) console.log('✗ ' + m) }
const DT = 1 / 60

// waar landt een pijl die je nu gooit? (schijf-kopie een vlucht vooruit draaien)
function voorspel(s) {
  const kopie = { def: s.def, t: s.t, hoek: s.hoek }
  PR.draai(kopie, PR.VLUCHT)
  return PR.plek(kopie)
}
function ruimte(s, a) { return Math.min(...s.pijlen.map(p => PR.verschil(a, p.a)), 9) }

// oplettend: wacht op een ruime plek; denktijd tussen worpen zoals een kind
function speelSchijf(def, slim, r) {
  const s = PR.nieuweSchijf(def)
  let sinds = 0, wacht = 0, t = 0
  while (!s.klaar && !s.mis && t < 60) {
    sinds += DT; t += DT
    if (sinds > (slim ? 0.35 : 0.3 + r() * 0.5) && s.vlucht < 0) {
      wacht += DT
      const ok = slim ? ruimte(s, voorspel(s)) >= PR.MIN * (wacht > 1.5 ? 1.15 : 1.5) : true
      if (ok) { PR.gooi(s); sinds = 0; wacht = 0 }
    }
    PR.stap(s, DT)
  }
  if (!s.klaar && !s.mis) fout(`schijf eindigt niet`)
  return { gehaald: s.klaar, t }
}

let totaal = 0, langste = 0, kortste = 1e9
const gokMis = []
for (let L = 0; L < PR.LEVELS; L++) {
  const lv = PR.level(L)
  let tijd = 0
  lv.schijven.forEach((d, i) => {
    if (d.pijlen + d.vast.length > 18) fout(`level ${L + 1} schijf ${i + 1}: te vol`)
    d.kristallen.forEach(k => { if (d.vast.some(v => PR.verschil(k, v) < PR.MIN * 1.5)) fout(`level ${L + 1}: kristal onder een vaste pijl`) })
    for (let i2 = 0; i2 < d.vast.length; i2++) for (let j = i2 + 1; j < d.vast.length; j++)
      if (PR.verschil(d.vast[i2], d.vast[j]) < PR.MIN * 1.5) fout(`level ${L + 1}: vaste pijlen te dicht op elkaar`)
    const r = speelSchijf(d, true)
    if (!r.gehaald) fout(`level ${L + 1} schijf ${i + 1} (${d.patroon}) niet te halen voor de oplettende bot`)
    tijd += r.t + 1.2   // + breek-animatie tussen schijven
  })
  totaal += tijd; langste = Math.max(langste, tijd); kortste = Math.min(kortste, tijd)
  // gokbot: hoe vaak gaat hij mis per schijf (gem. over 30 pogingen)
  const rnd = PR.rng(L + 99)
  let mis = 0, n = 0
  for (let k = 0; k < 30; k++) for (const d of lv.schijven) { n++; if (!speelSchijf(d, false, rnd).gehaald) mis++ }
  gokMis.push(mis / n)
}
console.log(`level-duur (oplettend, zonder fouten): gem. ${(totaal / PR.LEVELS).toFixed(0)} s, ${kortste.toFixed(0)}–${langste.toFixed(0)} s`)
const deel = (a, b) => gokMis.slice(a, b).reduce((x, y) => x + y, 0) / (b - a)
console.log(`gokbot faalt per schijf: level 1-10 ${(deel(0, 10) * 100).toFixed(0)}%, 11-20 ${(deel(10, 20) * 100).toFixed(0)}%, 21-30 ${(deel(20, 30) * 100).toFixed(0)}%, 31-40 ${(deel(30, 40) * 100).toFixed(0)}%`)
if (langste > 75) fout('een level duurt te lang')
if (kortste < 15) fout('een level is te kort')
if (deel(30, 40) <= deel(0, 10)) fout('de levels worden niet moeilijker')

console.log(fouten ? `\n${fouten} fout(en)` : '\n✓ alles in orde')
process.exit(fouten ? 1 : 0)
