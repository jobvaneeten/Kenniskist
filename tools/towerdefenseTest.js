// Tower Defense: laat bots alle 5 levels spelen om de balans te bewaken.
//   slim     — mengt torens, zet ze op goede plekken, upgradet: moet alles winnen
//   kind     — mengt torens op willekeurige plekken langs het pad, upgradet weinig:
//              moet de eerste levels halen
//   nieuw    — gebruikt vooral de nieuwere torens: moet de eerste levels halen
//   pijlers  — bouwt alleen pijlers: moet verliezen (lood ketst af)
//   niets    — bouwt niets: moet de eerste golven al verliezen
// Controleert ook dat elke golf binnen een redelijke tijd klaar is en dat
// elke kaart klopt (routes eindigen in de kern, pad binnen het veld).
// Gebruik: node tools/towerdefenseTest.js [-v]
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/towerdefense/kern.js', import.meta.url), 'utf8'), ctx)
const TD = ctx.TD
const VERBOSE = process.argv.includes('-v')

let fouten = 0
const fout = m => { fouten++; if (fouten < 20) console.log('✗ ' + m) }
const DT = 1 / 30

// ── kaarten ──
for (let L = 0; L < TD.KAARTEN.length; L++) {
  const k = TD.kaart(L)
  const kern = k.routePunten[0][k.routePunten[0].length - 1]
  k.routePunten.forEach((pts, i) => {
    const e = pts[pts.length - 1]
    if (e[0] !== kern[0] || e[1] !== kern[1]) fout(`kaart ${L} route ${i} eindigt niet in de kern`)
    for (let j = 1; j < pts.length; j++) if (pts[j][0] !== pts[j - 1][0] && pts[j][1] !== pts[j - 1][1]) fout(`kaart ${L} route ${i} heeft een schuin stuk`)
    const s = pts[0]
    if (s[0] >= 0 && s[0] < TD.COLS && s[1] >= 0 && s[1] < TD.ROWS) fout(`kaart ${L} route ${i} begint niet buiten het veld`)
  })
  let vrij = 0
  for (let c = 0; c < TD.COLS; c++) for (let r = 0; r < TD.ROWS; r++) if (TD.kanBouwen(TD.nieuwSpel(L), c, r)) vrij++
  if (vrij < 80) fout(`kaart ${L} heeft maar ${vrij} bouwplekken`)
}

// ── plekken scoren: hoeveel pad ligt er binnen bereik ──
function padPunten(S) {
  const pts = []
  S.kaart.routes.forEach(route => { for (let d = 0.5; d < route.len; d += 0.25) pts.push(TD.opRoute(route, d)) })
  return pts
}
function bestePlek(S, type, pts) {
  // elk stukje pad telt minder zwaar naarmate er al meer torens op letten,
  // zodat een tweede ingang ook verdedigd wordt
  const bereik = Math.min(TD.TORENS[type].bereik, 3)
  const gedekt = pts.map(p => S.torens.filter(t => (p.x - t.x) ** 2 + (p.y - t.y) ** 2 <= Math.min(t.s.bereik, 3) ** 2).length)
  let best = null, bs = -1
  for (let c = 0; c < TD.COLS; c++) for (let r = 0; r < TD.ROWS; r++) {
    if (!TD.kanBouwen(S, c, r)) continue
    let s = 0
    pts.forEach((p, i) => { const dx = p.x - c - 0.5, dy = p.y - r - 0.5; if (dx * dx + dy * dy <= bereik * bereik) s += 1 / (1 + gedekt[i]) })
    if (s > bs) { bs = s; best = [c, r] }
  }
  return best
}
function willekeurigePlek(S, rnd) {
  const kand = []
  for (let c = 0; c < TD.COLS; c++) for (let r = 0; r < TD.ROWS; r++) {
    if (!TD.kanBouwen(S, c, r)) continue
    let naast = false
    for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) if (S.kaart.pad[TD.sleutel(c + dc, r + dr)]) naast = true
    if (naast) kand.push([c, r])
  }
  return kand.length ? kand[Math.floor(rnd() * kand.length)] : null
}

const PLAN_SLIM = ['pijler', 'pijler', 'vriezer', 'kanon', 'pijler', 'tesla', 'railgun', 'laser', 'kanon', 'tesla', 'laser', 'railgun', 'laser', 'tesla']
const PLAN_NIEUW = ['boemerang', 'vlam', 'zaag', 'spijker', 'mijn', 'mortier', 'vlam', 'magneet', 'storm', 'raket', 'boemerang', 'raket', 'storm', 'mortier']
const PLAN_KIND = ['pijler', 'kanon', 'pijler', 'vriezer', 'tesla', 'pijler', 'laser', 'railgun', 'kanon', 'tesla', 'laser', 'pijler', 'railgun']

function speel(L, bot, seed = 1) {
  const S = TD.nieuwSpel(L)
  const pts = padPunten(S), rnd = TD.rng(seed * 31 + L)
  let planI = 0, golfTijd = 0, langste = 0, klok = 0
  const plan = bot === 'slim' ? PLAN_SLIM : bot === 'kind' ? PLAN_KIND : bot === 'nieuw' ? PLAN_NIEUW : ['pijler']

  function handel() {
    if (bot === 'niets') return
    for (let poging = 0; poging < 6; poging++) {
      const type = plan[planI % plan.length]
      const prijs = TD.TORENS[type].prijs
      const veel = S.torens.length >= 4 + S.golf * (bot === 'kind' ? 0.6 : 0.5)
      // upgraden: slim doet dat zodra hij 'genoeg' torens heeft, kind af en toe
      if (veel || (bot === 'pijlers' && S.torens.length >= 6)) {
        const kand = S.torens.filter(t => TD.upgradePrijs(t) && TD.upgradePrijs(t) <= S.goud)
        if (bot === 'kind' && rnd() < 0.6) return
        if (kand.length) { kand.sort((a, b) => TD.upgradePrijs(a) - TD.upgradePrijs(b)); TD.upgrade(S, kand[0]); continue }
        if (S.torens.some(t => TD.upgradePrijs(t))) return   // sparen voor een upgrade
      }
      if (S.goud < prijs) return
      const plek = bot === 'kind' ? willekeurigePlek(S, rnd) : bestePlek(S, type, pts)
      if (!plek) return
      TD.bouw(S, type, plek[0], plek[1]); planI++
    }
  }

  while (!S.gewonnen && !S.verloren) {
    handel()
    if (!S.actief) { TD.startGolf(S); golfTijd = 0 }
    for (let i = 0; i < 15 && S.actief; i++) {
      const ev = TD.stap(S, DT); golfTijd += DT; klok += DT
      if (process.env.TD_DEBUG == L && bot === 'slim') ev.forEach(e => { if (e.type === 'lek') console.log(`   golf ${S.golf}: lek ${e.laag} (-${e.n}) goud ${S.goud} torens ${S.torens.map(t => t.type[0] + t.niveau).join(' ')}`) })
    }
    if (!S.actief) langste = Math.max(langste, golfTijd)
    if (golfTijd > 400) { fout(`level ${L} golf ${S.golf} eindigt niet (${bot})`); break }
  }
  return { gewonnen: S.gewonnen, levens: S.levens, golf: S.golf, sterren: TD.sterren(S), langste, klok, torens: S.torens.length }
}

for (let L = 0; L < TD.KAARTEN.length; L++) {
  const slim = speel(L, 'slim')
  const kind = [1, 2, 3].map(s => speel(L, 'kind', s))
  const pijl = speel(L, 'pijlers')
  const nieuw = speel(L, 'nieuw')
  const niets = speel(L, 'niets')
  const kindWin = kind.filter(k => k.gewonnen).length
  console.log(`Level ${L + 1} ${TD.KAARTEN[L].naam.padEnd(13)} slim: ${slim.gewonnen ? 'WIN' : 'verlies golf ' + slim.golf} ${slim.levens}♥ ${slim.sterren}★ ` +
    `(${Math.round(slim.klok)} s, langste golf ${Math.round(slim.langste)} s) · kind: ${kindWin}/3 (${kind.map(k => k.gewonnen ? k.levens + '♥' : 'g' + k.golf).join(' ')}) · ` +
    `nieuw: ${nieuw.gewonnen ? 'WIN ' + nieuw.levens + '♥' : 'g' + nieuw.golf} · pijlers: ${pijl.gewonnen ? 'WIN' : 'g' + pijl.golf} · niets: g${niets.golf}`)
  if (L <= 2 && !nieuw.gewonnen) fout(`met de nieuwe torens haal je level ${L + 1} niet (golf ${nieuw.golf})`)
  if (!slim.gewonnen) fout(`slimme bot verliest level ${L + 1} (golf ${slim.golf})`)
  else if (slim.sterren < 2 && L < TD.KAARTEN.length - 1) fout(`slimme bot haalt maar ${slim.sterren} ster op level ${L + 1}`)
  if (L <= 1 && kindWin < 2 - L) fout(`een kind haalt level ${L + 1} te vaak niet (${kindWin}/3)`)
  if (L >= 1 && kindWin === 3 && kind.every(k => k.levens === TD.LEVENS)) fout(`level ${L + 1} is te makkelijk: kind wint altijd zonder levens te verliezen`)
  if (pijl.gewonnen) fout(`alleen pijlers wint level ${L + 1} — lood moet je dwingen te mengen`)
  if (niets.golf > 3) fout(`zonder torens haal je golf ${niets.golf} op level ${L + 1}`)
  if (slim.langste > 90) fout(`golf duurt te lang op level ${L + 1}: ${Math.round(slim.langste)} s`)
  if (VERBOSE) {
    for (let g = 1; g <= TD.GOLVEN; g++) console.log('   golf ' + g + ': ' + TD.golf(L, g).map(x => `${x.n}× ${x.laag}`).join(', '))
  }
}

// ── elke toren doet iets ──
for (const type of TD.VOLGORDE) {
  const S = TD.nieuwSpel(0, { goud: 9999 })
  S.levens = 9999
  const pts = padPunten(S)
  const plek = bestePlek(S, type, pts)
  const t = TD.bouw(S, type, plek[0], plek[1])
  S.golf = 8
  TD.startGolf(S)
  const goud = S.goud
  let tijd = 0
  while (S.actief && tijd < 200) { TD.stap(S, DT); tijd += DT }
  const ok = type === 'mijn' ? t.knallen === t.s.goud : t.knallen > 0
  if (!ok) fout(`toren ${type} doet niks (knallen ${t.knallen})`)
  else if (VERBOSE) console.log(`   ${type.padEnd(10)} knalde ${t.knallen} in golf 9, goud ${S.goud - goud}`)
  if (!TD.TORENS[type].tekst || TD.TORENS[type].up.length !== 2) fout(`toren ${type} mist uitleg of upgrades`)
}
if (TD.VOLGORDE.length !== 15) fout(`er zijn ${TD.VOLGORDE.length} torens in plaats van 15`)

console.log(fouten ? `\n${fouten} fout(en)` : '\n✓ Tower Defense klopt')
process.exit(fouten ? 1 : 0)
