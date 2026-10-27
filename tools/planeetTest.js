// Planetenbouwer: speelt het spel na met een "slimme" bot (koopt steeds het
// ding dat zich het snelst terugverdient, springt zodra het kan) en kijkt of
// het tempo klopt: als beloning (1 minuut per keer, met pauzes ertussen) en
// als vrij spel. Controleert ook de rekenregels en het getalformaat.
// Gebruik: node tools/planeetTest.js
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/planeet/kern.js', import.meta.url), 'utf8'), ctx)
const PL = ctx.PL

let fouten = 0
const fout = m => { fouten++; if (fouten < 15) console.log('✗ ' + m) }
const DT = 0.25

// koopt alles wat kan: eerst een tijdsprong, anders het ding met de beste
// terugverdientijd (prijs gedeeld door wat het erbij oplevert)
function koopSlim(s) {
  for (let i = 0; i < 200; i++) {
    if (PL.sprong(s)) continue
    let beste = null, score = Infinity
    for (const it of PL.ITEMS) {
      if (!PL.open(s, it.id)) continue
      let sc = PL.prijs(s, it.id) / (it.inkomen * PL.bonus(s))
      // dingen uit het huidige tijdperk tellen mee voor de sprong: iets voorrang
      const info = PL.sprongInfo(s)
      if (info && it.t === s.tijdperk && info.heeft < info.nodig) sc *= 0.5
      if (sc < score) { score = sc; beste = it }
    }
    if (!beste || !PL.koop(s, beste.id)) break
  }
}

function speel(s, seconden, tikPerSec) {
  let tikTeller = 0
  for (let t = 0; t < seconden; t += DT) {
    PL.stap(s, DT)
    tikTeller += tikPerSec * DT
    while (tikTeller >= 1) { PL.tik(s); tikTeller-- }
    koopSlim(s)
  }
}

// ── rekenregels ──
{
  const s = PL.nieuw()
  s.stof = 1e6
  const drie = PL.prijs(s, 'vulkaan', 3)
  let los = 0
  for (let i = 0; i < 3; i++) { los += PL.prijs(s, 'vulkaan'); s.aantal.vulkaan++ }
  if (Math.abs(drie - los) > 1e-6 * los) fout('prijs voor 3 is niet de som van 3 losse')
  const t = PL.nieuw(); t.stof = 5000
  const m = PL.maxKoop(t, 'vulkaan')
  if (PL.prijs(t, 'vulkaan', m) > t.stof + 1e-9 || PL.prijs(t, 'vulkaan', m + 1) <= t.stof) fout('maxKoop klopt niet')
  if (PL.koop(PL.nieuw(), 'meer')) fout('kan iets kopen uit een dicht tijdperk')
  const h = PL.herstel({ stof: 'NaN', aantal: { vulkaan: -3, kristal: 2.7 }, tijdperk: 99 })
  if (h.stof !== 0 || h.aantal.vulkaan !== 0 || h.aantal.kristal !== 2 || h.tijdperk !== PL.TIJDPERKEN.length - 1) fout('herstel ruimt kapotte opslag niet goed op')
  if (PL.ITEMS.length !== PL.TIJDPERKEN.length * 3) fout('niet 3 dingen per tijdperk')
  for (let i = 1; i < PL.ITEMS.length; i++) if (PL.ITEMS[i].prijs <= PL.ITEMS[i - 1].prijs) fout('prijzen lopen niet op bij ' + PL.ITEMS[i].id)
}
{
  const verwacht = [[0, '0'], [3.75, '3,7'], [42, '42'], [9999, '9999'], [12345, '12,3K'], [3.4e6, '3,4M'], [1.25e9, '1,25Mld'], [5e12, '5Bln']]
  for (const [x, v] of verwacht) if (PL.kort(x) !== v) fout(`kort(${x}) = ${PL.kort(x)}, verwacht ${v}`)
}

// ── als beloning: 1 minuut spelen, 20 minuten weg ──
{
  const s = PL.nieuw()
  const opSessie = []
  let sessie = 0
  while (s.tijdperk < PL.TIJDPERKEN.length - 1 && sessie < 400) {
    sessie++
    if (sessie > 1) PL.weg(s, 20 * 60)
    speel(s, 60, 4)
    while (opSessie.length < s.tijdperk) opSessie.push(sessie)
    if (!isFinite(s.stof) || !isFinite(PL.inkomen(s))) { fout('NaN of oneindig in beloningsspel'); break }
  }
  console.log('beloning (1 min spelen, 20 min weg): tijdperk 2..8 bereikt na beurt ' + opSessie.join(', '))
  if (!(opSessie[0] <= 2)) fout('tweede tijdperk niet binnen 2 beurten')
  if (!(opSessie[2] >= 3)) fout('vierde tijdperk al binnen 3 beurten: te snel')
  const eind = opSessie[opSessie.length - 1]
  if (!(eind >= 25 && eind <= 150)) fout(`laatste tijdperk na ${eind} beurten, verwacht 25 tot 150`)
  const tussen = opSessie.map((x, i) => x - (opSessie[i - 1] ?? 0))
  if (Math.max(...tussen) > 40) fout('een tijdperk duurt meer dan 40 beurten: te lang wachten')
}

// ── vrij spelen: aan één stuk door ──
{
  const s = PL.nieuw()
  const opMinuut = []
  let min = 0
  while (s.tijdperk < PL.TIJDPERKEN.length - 1 && min < 600) {
    min++
    speel(s, 60, 3)
    while (opMinuut.length < s.tijdperk) opMinuut.push(min)
  }
  console.log('vrij spelen (3 tikken per seconde): tijdperk 2..8 na minuut ' + opMinuut.join(', '))
  const eind = opMinuut[opMinuut.length - 1]
  if (!(eind >= 30 && eind <= 240)) fout(`vrij spelen: laatste tijdperk na ${eind} minuten, verwacht 30 tot 240`)
}

// ── wie alleen tikt en niets koopt, komt niet ver: kopen moet lonen ──
{
  const s = PL.nieuw()
  for (let t = 0; t < 600; t += DT) { PL.tik(s); PL.stap(s, DT) }
  const b = PL.nieuw()
  speel(b, 600, 4)
  if (b.totaal < s.totaal * 5) fout('kopen levert te weinig op vergeleken met alleen tikken')
}

console.log(fouten ? `\n${fouten} fout(en)` : '\n✓ alles in orde')
process.exit(fouten ? 1 : 0)
