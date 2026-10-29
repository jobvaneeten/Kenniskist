// Dierentuinbaas: een bot bouwt een dierentuin (paden, zelf getekende hokken
// met bodem en inrichting, dieren en kraampjes) en we kijken of het tempo
// klopt, als beloning (1 minuut per keer met pauzes) en als vrij spel.
// Controleert ook de regels: alleen hokken aan een verbonden pad tellen,
// wensen maken dieren blij, slopen geeft de helft terug, kapotte opslag wordt
// hersteld.
// Gebruik: node tools/dierentuinTest.js   (of: ... kaart [beurten])
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/dierentuin/kern.js', import.meta.url), 'utf8'), ctx)
const D = ctx.DT

let fouten = 0
const fout = m => { fouten++; if (fouten < 15) console.log('✗ ' + m) }

// ── regels ──
{
  const s = D.nieuw()
  const g = D.gebied(s)
  const v = D.bouwHok(s, g.x0, g.y0, 3, 3)
  if (!v) fout('kan geen hok bouwen aan het begin')
  D.zetDier(s, v, 'konijn'); D.zetDier(s, v, 'konijn')
  if (D.stats(s).perMinuut !== 0) fout('hok zonder pad trekt toch bezoekers')
  if (D.waaromNietHok(s, g.x0 + 4, g.y0, 1, 3) === null) fout('hok van 1 breed mag')
  if (D.waaromNietHok(s, g.x0 + 1, g.y0 + 1, 3, 3) === null) fout('hok over een ander hok heen mag')

  const s2 = D.nieuw(), IX = D.INGANG.x, IY = D.INGANG.y
  for (let y = IY - 1; y >= IY - 5; y--) D.legPad(s2, IX, y)
  const w2 = D.bouwHok(s2, IX - 4, IY - 5, 4, 3)
  D.zetDier(s2, w2, 'konijn')
  if (!(D.stats(s2).perMinuut > 0)) fout('hok aan een verbonden pad trekt geen bezoekers')
  if (!D.waaromNietDier(s2, w2, 'geit')) fout('twee diersoorten in één hok')
  const b0 = D.blijheid(s2, w2).waarde
  D.zetDier(s2, w2, 'konijn')
  const b1 = D.blijheid(s2, w2).waarde
  D.plaatsItem(s2, w2, 'binnen', IX - 4, IY - 5); D.plaatsItem(s2, w2, 'voerbak', IX - 3, IY - 5)
  const b2 = D.blijheid(s2, w2).waarde
  if (!(b1 > b0 && b2 > b1)) fout('vriendje, binnenverblijf en voerbak maken een konijn niet blijer')
  if (Math.abs(b2 - 1) > 1e-9) fout('konijn met alles wat hij wil is niet helemaal blij (' + b2 + ')')
  if (D.plaatsItem(s2, w2, 'water', IX - 4, IY - 5)) fout('twee dingen op hetzelfde vakje in een hok')
  if (D.plaatsItem(s2, w2, 'voerbak', IX - 5, IY - 5)) fout('inrichting buiten het hok')
  // level 1: 6 stukjes pad, 1 hok, 2 dieren
  if (!D.checkLevel(s2) || s2.level !== 2) fout('level 1 wordt niet gehaald terwijl alle doelen klaar zijn')
  if (D.checkLevel(s2)) fout('level 2 gehaald zonder de doelen')
  const geld = s2.geld
  const terug = D.sloop(s2, IX - 3, IY - 5)
  if (Math.abs(s2.geld - geld - D.INRICHTING.voerbak.prijs / 2) > 1e-9 || !terug || w2.items.length !== 1) fout('slopen van inrichting gaat niet goed')
  if (D.sloop(s2, D.INGANG.x, D.INGANG.y) !== 0) fout('de ingang kan gesloopt worden')
  const terugGeladen = D.herstel(JSON.parse(JSON.stringify(D.bewaarbaar(s2))))
  const tv = terugGeladen.verblijven[0]
  if (!tv || tv.dieren.length !== 2 || tv.items.length !== 1 || tv.w !== 4 || terugGeladen.level !== 2) fout('opslaan en terugladen verliest iets')
  const kapot = D.herstel({ geld: 'x', pad: ['a,b'], verblijven: [{ x: 0, y: 0, w: 3, h: 3 }, { x: 8, y: 8, w: 1, h: 9 }], objecten: [{ soort: 'boom', x: D.INGANG.x, y: D.INGANG.y }] })
  if (kapot.geld !== 0 || kapot.verblijven.length || kapot.objecten.length) fout('herstel laat kapotte of verkeerde dingen staan')
}

// ── hok groter maken ──
{
  const s = D.nieuw(), IX = D.INGANG.x, IY = D.INGANG.y
  for (let y = IY - 1; y >= IY - 6; y--) D.legPad(s, IX, y)
  const v = D.bouwHok(s, IX - 3, IY - 4, 3, 3)
  D.plaatsItem(s, v, 'binnen', IX - 3, IY - 4)
  const geld = s.geld, prijs = D.maatPrijs(s, v, 4, 3)
  if (!D.pasHokAan(s, v, IX - 4, IY - 4, 4, 3) || v.w !== 4 || v.x !== IX - 4) fout('hok naar links groter maken lukt niet')
  if (Math.abs(geld - s.geld - prijs) > 1e-9 || prijs !== 2 * D.HEK_PRIJS) fout('groter maken kost niet het extra hek')
  if (D.waaromNietMaat(s, v, IX - 4, IY - 4, 5, 3) === null) fout('hok mag over het pad heen groeien')
  if (D.waaromNietMaat(s, v, IX - 2, IY - 4, 2, 3) === null) fout('kleiner maken mag terwijl er inrichting op de plek staat die wegvalt')
}

// ── werelden en creatief ──
{
  if (D.WERELDEN.length !== 6) fout('er zijn geen 6 werelden')
  const w = D.nieuw('woestijn'), IX = D.INGANG.x, IY = D.INGANG.y
  for (let y = IY - 1; y >= IY - 5; y--) D.legPad(w, IX, y)
  const h = D.bouwHok(w, IX - 4, IY - 5, 4, 4)
  if (h.bodem !== 'zand' || D.bodemPrijs(w, h, 'zand') !== 0) fout('in de woestijn is zand niet de gratis standaardbodem')
  const c = D.nieuw('creatief')
  if (c.geld < 1e9 || !D.ontgrendeld(c, 13) || c.grond !== D.GROND.length - 1) fout('creatief heeft geen oneindig geld, alles vrij of alle grond')
  if (D.checkLevel(c)) fout('creatief heeft levels')
  const terug = D.herstel(JSON.parse(JSON.stringify(D.bewaarbaar(c))), 'creatief')
  if (terug.geld < 1e9 || terug.wereld !== 'creatief') fout('creatief verliest na opslaan zijn geld of wereld')
  const vallei = D.nieuw('vallei'), maan = D.nieuw('maan')
  for (const s of [vallei, maan]) { for (let y = IY - 1; y >= IY - 5; y--) D.legPad(s, IX, y); const v = D.bouwHok(s, IX - 4, IY - 5, 4, 4); D.zetDier(s, v, 'konijn') }
  if (!(D.stats(maan).perMinuut > D.stats(vallei).perMinuut)) fout('op de maan komen niet meer bezoekers')
  // dieren per wereld
  const ijs = D.nieuw('ijs'); ijs.level = 99
  for (let y = IY - 1; y >= IY - 5; y--) D.legPad(ijs, IX, y)
  const ih = D.bouwHok(ijs, IX - 4, IY - 5, 4, 4)
  if (!D.waaromNietDier(ijs, ih, 'kameel')) fout('een kameel mag in de IJswereld')
  if (D.waaromNietDier(ijs, ih, 'pinguin')) fout('een pinguïn mag niet in de IJswereld')
  for (const w of D.WERELDEN) {
    const l = D.dierenVan(D.nieuw(w.id))
    if (l.length < 14) fout(w.naam + ' heeft minder dan 14 diersoorten (nodig voor level 14)')
    if (l.some(k => !D.DIEREN[k])) fout(w.naam + ' noemt een dier dat niet bestaat')
  }
  // geen dier komt vrij voordat de bodem of de spullen die het wil er zijn
  for (const w of D.WERELDEN.concat([D.CREATIEF])) {
    const s = D.nieuw(w.id)
    for (const k of D.dierenVan(s)) for (const wens of D.DIEREN[k].wil) {
      const n = D.dierNiveau(s, k)
      if (wens.bodem && !wens.bodem.some(b => b === w.bodem || D.BODEMS[b].niveau <= n)) fout(`${w.naam}: ${k} komt vrij voor zijn bodem`)
      if (wens.item && !wens.item.some(i => D.INRICHTING[i].niveau <= n)) fout(`${w.naam}: ${k} komt vrij voor zijn inrichting`)
    }
  }
}

// ── oude opslag van de kleinere kaart (36 × 26) schuift mee ──
{
  const oud = { geld: 500, level: 3, pad: ['17,25', '17,24', '17,23'], verblijven: [{ x: 14, y: 21, w: 3, h: 3, bodem: 'gras', dieren: ['konijn', 'konijn'], items: [{ soort: 'binnen', x: 14, y: 21 }] }], objecten: [{ soort: 'boom', x: 18, y: 24 }] }
  const s = D.herstel(oud, 'vallei'), v = s.verblijven[0]
  if (!s.pad[D.sleutel(D.INGANG.x, D.INGANG.y - 2)] || Object.keys(s.pad).length !== 3) fout('oude paden staan niet meer aan de ingang')
  if (!v || v.x !== 18 || v.y !== 27 || v.dieren.length !== 2 || v.items[0].x !== 18) fout('oud hok is na het groter maken van de kaart verdwenen of verschoven')
  if (!s.objecten.length || s.objecten[0].x !== 22) fout('oude versiering is verdwenen')
  const weer = D.herstel(JSON.parse(JSON.stringify(D.bewaarbaar(s))), 'vallei')
  if (weer.verblijven[0].x !== 18) fout('nieuwe opslag schuift bij terugladen opnieuw op')
}

// ── baby's ──
{
  const s = D.nieuw(), IX = D.INGANG.x, IY = D.INGANG.y
  for (let y = IY - 1; y >= IY - 5; y--) D.legPad(s, IX, y)
  s.geld = 1e6
  const v = D.bouwHok(s, IX - 5, IY - 5, 5, 5)
  D.zetDier(s, v, 'konijn'); D.zetDier(s, v, 'konijn'); D.plaatsItem(s, v, 'binnen', v.x, v.y); D.plaatsItem(s, v, 'voerbak', v.x + 1, v.y)
  D.stats(s)
  if (!D.kanBaby(s, v)) fout('blije konijnen met ruimte krijgen geen baby')
  const r = D.geboorte(s, () => 0)
  if (!r || v.dieren.length !== 3 || s.babies !== 1) fout('geboorte zet geen jong in het hok')
  if (D.levelInfo(s).doelen.length && D.doelWaarde(s, { type: 'baby' }) !== 1) fout('baby-doel telt niet')
  const k = D.nieuw('vallei'); k.level = 99; k.geld = 1e6
  for (let y = IY - 1; y >= IY - 5; y--) D.legPad(k, IX, y)
  const kv = D.bouwHok(k, IX - 5, IY - 5, 5, 5)
  D.zetDier(k, kv, 'vos'); D.stats(k)
  if (D.kanBaby(k, kv)) fout('een dier dat alleen wil wonen krijgt een baby')
}

// ── bot ──
// het padenplan van de bot: een hoofdpad omhoog vanaf de ingang en om de 5
// rijen een zijpad over de hele breedte
function inPlan(s, x, y) { return D.binnen(s, x, y) && (x === D.INGANG.x || (D.INGANG.y - y) % 5 === 0) }
function legPlan(s) {
  const g = D.gebied(s)
  for (let y = g.y1; y >= g.y0; y--) for (let x = g.x0; x <= g.x1; x++) if (inPlan(s, x, y) && s.geld > 160) D.legPad(s, x, y)
}
function vakVrij(s, x, y, w, h) {
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) if (!D.vrij(s, x + i, y + j) || inPlan(s, x + i, y + j)) return false
  return true
}
// maak een hok af: bodem en alle inrichting die het dier wil
function richtIn(s, v) {
  const d = D.DIEREN[v.dieren[0] || v.voor]
  for (const w of d.wil) {
    const nv = D.niveau(s).nr
    if (w.bodem && w.bodem.indexOf(v.bodem) < 0) {
      const b = w.bodem.find(k => D.BODEMS[k].niveau <= nv)
      if (!b || !D.zetBodem(s, v, b)) return false
    }
    if (w.item) {
      const soort = w.item.find(k => D.INRICHTING[k].niveau <= nv)
      if (!soort) continue
      const nodig = (w.aantal || 1) - D.telItems(v, w.item)
      for (let n = 0; n < nodig; n++) {
        let gelukt = false
        for (let j = 0; j < v.h && !gelukt; j++) for (let i = 0; i < v.w && !gelukt; i++) gelukt = D.plaatsItem(s, v, soort, v.x + i, v.y + j)
        if (!gelukt) return false
      }
    }
  }
  return true
}
function hokMaat(soort) {
  const d = D.DIEREN[soort], items = d.wil.reduce((n, w) => n + (w.item ? (w.aantal || 1) : 0), 0)
  const dieren = d.wil.some(w => w.alleen) ? 1 : 3
  const nodig = Math.ceil((dieren * d.ruimte + items) * 1.35)
  // 4 hoog past tussen twee zijpaden; zo breed als nodig
  return [Math.max(2, Math.min(D.MAX_HOK, Math.ceil(nodig / 4))), 4]
}
function bot(s) {
  legPlan(s)
  for (let poging = 0; poging < 40; poging++) {
    const st = D.stats(s), nv = D.niveau(s).nr
    // 1. hokken afmaken en dieren erbij
    let klaar = false
    for (const v of s.verblijven) {
      if (!v.zichtbaar) continue
      const soort = v.dieren[0] || v.voor, d = D.DIEREN[soort]
      // eerst een dier erin, zodat er bezoekers komen; dan inrichten
      if (!v.dieren.length) { if (D.zetDier(s, v, soort)) { klaar = true; continue } break }
      if (!richtIn(s, v)) { klaar = true; break }
      const max = d.wil.some(w => w.alleen) ? 1 : 3
      if (v.dieren.length < max && D.zetDier(s, v, soort)) { klaar = true; break }
    }
    if (klaar) break
    // 2. nieuw hok voor het beste dier dat er nog niet is
    const open = D.dierenVan(s).filter(k => D.dierNiveau(s, k) <= nv).sort((a, b) => D.DIEREN[b].trek - D.DIEREN[a].trek)
    const beste = open.find(k => !s.verblijven.some(v => (v.dieren[0] || v.voor) === k))
    if (beste) {
      const [w, h] = hokMaat(beste)
      if (s.geld >= D.hekPrijs(w, h) + D.DIEREN[beste].prijs * 2 + 40) {
        const g = D.gebied(s)
        let plek = null
        for (let y = g.y0; y <= g.y1 && !plek; y++) for (let x = g.x0; x <= g.x1 && !plek; x++) {
          if (D.waaromNietHok(s, x, y, w, h) || !vakVrij(s, x, y, w, h) || !D.raaktPad(st.verbonden, x, y, w, h)) continue
          plek = [x, y]
        }
        if (plek) { const v = D.bouwHok(s, plek[0], plek[1], w, h); v.voor = beste; continue }
        if (D.koopGrond(s)) continue
        if (!D.grondInfo(s) && s.geld > 3000) {
          const zwakste = s.verblijven.filter(v => v.dieren.length).sort((a, b) => D.DIEREN[a.dieren[0]].trek - D.DIEREN[b.dieren[0]].trek)[0]
          if (zwakste && D.DIEREN[zwakste.dieren[0]].trek < D.DIEREN[beste].trek / 3) { D.sloop(s, zwakste.x, zwakste.y); continue }
        }
      }
    }
    // 3. doelen van het level: grond kopen, versiering neerzetten
    const info = D.levelInfo(s, st)
    const doel = t => info.doelen.find(d => d.type === t && !d.klaar)
    if (doel('grond') && D.koopGrond(s)) continue
    if (doel('inrichting') && s.geld > 200) {
      for (const v of s.verblijven) {
        if (D.ruimteOver(v) < 2 || klaar) continue
        for (let j = v.h - 1; j >= 0 && !klaar; j--) for (let i = v.w - 1; i >= 0 && !klaar; i--) klaar = D.plaatsItem(s, v, 'rots', v.x + i, v.y + j)
      }
      if (klaar) continue
    }
    if (doel('versiering') && s.geld > 200) {
      const g = D.gebied(s)
      for (let y = g.y1; y >= g.y0 && !klaar; y--) for (let x = g.x0; x <= g.x1 && !klaar; x++) {
        if (!inPlan(s, x, y) && (x + y) % 3 === 0 && D.plaatsObject(s, (x + y) % 2 ? 'boom' : 'bloemen', x, y)) klaar = true
      }
      if (klaar) continue
    }
    // 4. een kraampje als het druk is (of als het level er een vraagt)
    const kraamSoort = nv >= 4 ? 'snackbar' : 'ijskraam'
    if (st.perMinuut > 8 + 10 * s.objecten.filter(o => D.OBJECTEN[o.soort].kraam).length || doel('kraam')) {
      for (const k of Object.keys(st.verbonden)) {
        const [px, py] = k.split(',').map(Number)
        if ([[1, 0], [-1, 0]].some(([dx]) => !inPlan(s, px + dx, py) && D.plaatsObject(s, kraamSoort, px + dx, py))) { klaar = true; break }
      }
      if (klaar) continue
    }
    break
  }
}
function start(s) { for (let y = D.INGANG.y - 1; y >= D.INGANG.y - 4; y--) D.legPad(s, D.INGANG.x, y) }
function speel(s, seconden) { for (let t = 0; t < seconden; t += 0.5) { D.stap(s, 0.5); if (t % 2 === 0) { bot(s); D.checkLevel(s) } } }

if (process.argv[2] === 'kaart') {
  const s = D.nieuw(); start(s)
  for (let b = 0; b < Number(process.argv[3] || 15); b++) { if (b) D.weg(s, 1200); speel(s, 60) }
  let uit = ''
  for (let y = 0; y < D.HOOG; y++) {
    for (let x = 0; x < D.BREED; x++) {
      const v = D.verblijfOp(s, x, y), o = D.objectOp(s, x, y), it = v && D.itemOp(v, x, y)
      uit += !D.binnen(s, x, y) ? ' ' : s.pad[D.sleutel(x, y)] ? '#' : it ? it.soort[0].toUpperCase() : v ? v.bodem[0] : o ? '*' : '.'
    }
    uit += '\n'
  }
  const st = D.stats(s)
  console.log(uit + `geld ${Math.round(s.geld)}, niveau ${D.niveau(s).nr}, ${Math.round(st.perMinuut)} bezoekers/min`)
  console.log(s.verblijven.map(v => `${v.w}x${v.h} ${v.bodem}: ${v.dieren.join('/')} blij ${D.blijheid(s, v).waarde.toFixed(2)}${v.zichtbaar ? '' : ' (niet aan pad)'}`).join('\n'))
  process.exit(0)
}

{
  const s = D.nieuw(); start(s)
  const op = []
  let beurt = 0
  while (D.niveau(s).nr < D.MAX_NIVEAU && beurt < 400) {
    beurt++
    if (beurt > 1) D.weg(s, 20 * 60)
    speel(s, 60)
    while (op.length < D.niveau(s).nr - 1) op.push(beurt)
    if (!isFinite(s.geld)) { fout('NaN in geld'); break }
  }
  const st = D.stats(s)
  console.log('beloning (1 min spelen, 20 min weg): level 2..' + D.MAX_NIVEAU + ' na beurt ' + op.join(', '))
  console.log(`  eind: ${s.verblijven.length} hokken, ${st.dieren} dieren, ${st.soorten} soorten, ${st.sterren} sterren, gem. blij ${st.blij.toFixed(2)}, ${Math.round(st.perMinuut)} bezoekers/min, grond ${s.grond + 1}/${D.GROND.length}`)
  if (!(op[0] <= 2)) fout('level 2 niet binnen 2 beurten')
  const eind = op[op.length - 1]
  if (op.length < 14) fout(`bot haalt maar ${op.length + 1} levels als beloning`)
  if (!(op[13] >= 25 && op[13] <= 150)) fout(`level 15 na ${op[13]} beurten, verwacht 25 tot 150`)
  if (st.soorten < 9) fout('bot heeft aan het eind minder dan 9 diersoorten')
  if (st.blij < 0.9) fout('dieren van de bot zijn niet blij, terwijl hij alle wensen vervult')
}
{
  const s = D.nieuw(); start(s)
  const op = []
  let min = 0
  while (D.niveau(s).nr < D.MAX_NIVEAU && min < 600) {
    min++; speel(s, 60)
    while (op.length < D.niveau(s).nr - 1) op.push(min)
  }
  console.log('vrij spelen: level 2..' + D.MAX_NIVEAU + ' na minuut ' + op.join(', '))
  if (!(op[13] >= 40 && op[13] <= 300)) fout(`vrij spelen: level 15 na ${op[13]} minuten, verwacht 40 tot 300`)
}

// ── de andere werelden: de bot moet overal ver komen ──
for (const w of D.WERELDEN.slice(1)) {
  const s = D.nieuw(w.id); start(s)
  let beurt = 0
  while (D.niveau(s).nr < 13 && beurt < 250) { beurt++; if (beurt > 1) D.weg(s, 20 * 60); speel(s, 60) }
  console.log(`${w.naam}: level ${D.niveau(s).nr} na ${beurt} beurten, ${D.stats(s).soorten} soorten`)
  if (D.niveau(s).nr < 13) fout(w.naam + ': bot komt niet voorbij level ' + D.niveau(s).nr)
}

console.log(fouten ? `\n${fouten} fout(en)` : '\n✓ alles in orde')
process.exit(fouten ? 1 : 0)
