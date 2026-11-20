'use strict'
// Rekenen voor nieuwkomers: plus tot 10, plus tot 1000, keer, delen en maten.
// Cijfers lezen ze wel, dus: een grote som, een cijferblok en bij kleine sommen
// stippen om te tellen. Elk onderdeel heeft 3 niveaus; wie 8 van de 10 in een
// keer goed heeft, gaat een niveau omhoog. Gebruikt de helpers van index.html
// (D, bewaar, naar, confetti, geluiden, cadeaumeter en beloning).

if (!D.reken) D.reken = {}
var MAX_NIVEAU = 3, OMHOOG_BIJ = 8

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }
function kiesUit(lijst) { return lijst[Math.floor(Math.random() * lijst.length)] }

var KLEUR_A = '#38bdf8', KLEUR_B = '#f59e0b'
function stippen(n, kleur) { var h = ''; for (var i = 0; i < n; i++) h += '<span class="stip" style="background:' + kleur + ';animation-delay:' + (i * 0.03) + 's"></span>'; return h }
function rij(n, kleur) { return '<span class="groepje" style="grid-template-columns:repeat(' + Math.min(5, Math.max(1, n)) + ',26px)">' + stippen(n, kleur) + '</span>' }
function raster(rijen, kolommen, kleur) {
  var h = '<span class="groepje" style="grid-template-columns:repeat(' + kolommen + ',26px)">'
  for (var i = 0; i < rijen * kolommen; i++) h += '<span class="stip" style="background:' + kleur + '"></span>'
  return h + '</span>'
}

// Plaatjes bij maten: liniaal (lengte), weegschaal (gewicht), fles (inhoud)
var MAATPLAAT = {
  lengte: '<svg class="maatplaat" viewBox="0 0 120 90"><rect x="6" y="30" width="108" height="30" rx="5" fill="#fde047" stroke="#b45309" stroke-width="3"/><path d="M18 30v12M30 30v8M42 30v12M54 30v8M66 30v12M78 30v8M90 30v12M102 30v8" stroke="#b45309" stroke-width="3"/></svg>',
  gewicht: '<svg class="maatplaat" viewBox="0 0 120 90"><path d="M20 78h80l-8-30H28z" fill="#94a3b8" stroke="#475569" stroke-width="3"/><rect x="38" y="20" width="44" height="28" rx="6" fill="#64748b"/><path d="M52 20a8 8 0 0 1 16 0" fill="none" stroke="#475569" stroke-width="4"/><text x="60" y="40" font-size="14" font-weight="900" text-anchor="middle" fill="#fff">kg</text></svg>',
  inhoud: '<svg class="maatplaat" viewBox="0 0 120 90"><path d="M50 8h20v14l10 12v48a6 6 0 0 1-6 6H46a6 6 0 0 1-6-6V34l10-12z" fill="#bae6fd" stroke="#0369a1" stroke-width="3"/><path d="M42 50h36v30a4 4 0 0 1-4 4H46a4 4 0 0 1-4-4z" fill="#38bdf8"/><rect x="48" y="2" width="24" height="8" rx="2" fill="#0369a1"/></svg>',
}
var MATEN = [
  // [groot, klein, factor, soort, vanaf niveau]
  ['m', 'cm', 100, 'lengte', 1], ['km', 'm', 1000, 'lengte', 2], ['kg', 'g', 1000, 'gewicht', 2],
  ['l', 'ml', 1000, 'inhoud', 3], ['cm', 'mm', 10, 'lengte', 3], ['m', 'dm', 10, 'lengte', 3],
]

// Elke generator geeft { tekst (html), antwoord, hulp (html) }
var ONDERDELEN = [
  { id: 'plus10', kleur: '#38bdf8', plaat: '<svg viewBox="0 0 160 160"><rect width="160" height="160" fill="#e0f2fe"/><text x="80" y="70" font-family="Arial" font-weight="900" font-size="46" text-anchor="middle" fill="#0284c7">3+4</text><g fill="#38bdf8"><circle cx="34" cy="110" r="11"/><circle cx="60" cy="110" r="11"/><circle cx="86" cy="110" r="11"/></g><g fill="#f59e0b"><circle cx="34" cy="136" r="11"/><circle cx="60" cy="136" r="11"/><circle cx="86" cy="136" r="11"/><circle cx="112" cy="136" r="11"/></g></svg>',
    maak: function (n) {
      var tot = n === 1 ? 5 : 10, a = rnd(n === 3 ? 2 : 1, tot - 1), b = rnd(n === 3 ? 1 : 1, tot - a)
      return { tekst: a + ' + ' + b, antwoord: a + b, hulp: n < 3 ? rij(a, KLEUR_A) + '<span class="plus-teken">+</span>' + rij(b, KLEUR_B) : '' }
    } },
  { id: 'plus1000', kleur: '#a78bfa', plaat: '<svg viewBox="0 0 160 160"><rect width="160" height="160" fill="#ede9fe"/><text x="80" y="72" font-family="Arial" font-weight="900" font-size="34" text-anchor="middle" fill="#6d28d9">300</text><text x="80" y="112" font-family="Arial" font-weight="900" font-size="34" text-anchor="middle" fill="#6d28d9">+200</text><path d="M30 124h100" stroke="#6d28d9" stroke-width="5"/></svg>',
    maak: function (n) {
      var a, b
      if (n === 1) { a = rnd(1, 8) * 10; b = rnd(1, 10 - a / 10) * 10 }                       // 30 + 40
      else if (n === 2) { a = rnd(1, 8) * 100; b = rnd(1, 10 - a / 100) * 100; if (Math.random() < .4) { a += rnd(1, 9) * 10; b = rnd(1, Math.floor((1000 - a) / 10)) * 10 } }   // 300 + 400, 340 + 250
      else { a = rnd(101, 899); b = rnd(11, 1000 - a) }                                        // 345 + 278
      return { tekst: a + ' + ' + b, antwoord: a + b, hulp: '' }
    } },
  { id: 'keer', kleur: '#34d399', plaat: '<svg viewBox="0 0 160 160"><rect width="160" height="160" fill="#d1fae5"/><text x="80" y="62" font-family="Arial" font-weight="900" font-size="44" text-anchor="middle" fill="#047857">3×4</text><g fill="#34d399">' + [0, 1, 2].map(function (r) { return [0, 1, 2, 3].map(function (k) { return '<circle cx="' + (44 + k * 24) + '" cy="' + (92 + r * 22) + '" r="9"/>' }).join('') }).join('') + '</g></svg>',
    maak: function (n) {
      var tafels = n === 1 ? [1, 2, 5, 10] : n === 2 ? [1, 2, 3, 4, 5, 10] : [2, 3, 4, 5, 6, 7, 8, 9, 10]
      var a = rnd(1, 10), t = kiesUit(tafels)
      return { tekst: a + ' × ' + t, antwoord: a * t, hulp: a * t <= 30 && n < 3 ? raster(a, t, KLEUR_A) : '' }
    } },
  { id: 'delen', kleur: '#f472b6', plaat: '<svg viewBox="0 0 160 160"><rect width="160" height="160" fill="#fce7f3"/><text x="80" y="62" font-family="Arial" font-weight="900" font-size="44" text-anchor="middle" fill="#be185d">12:3</text><g fill="#f472b6">' + [0, 1, 2].map(function (g) { return [0, 1, 2, 3].map(function (k) { return '<circle cx="' + (26 + g * 44 + (k % 2) * 16) + '" cy="' + (96 + Math.floor(k / 2) * 18) + '" r="7"/>' }).join('') }).join('') + '</g></svg>',
    maak: function (n) {
      var tafels = n === 1 ? [1, 2, 5, 10] : n === 2 ? [1, 2, 3, 4, 5, 10] : [2, 3, 4, 5, 6, 7, 8, 9, 10]
      var t = kiesUit(tafels), uit = rnd(1, 10)
      return { tekst: (uit * t) + ' : ' + t, antwoord: uit, hulp: uit * t <= 30 && n < 3 ? raster(uit, t, KLEUR_B) : '' }
    } },
  { id: 'maten', kleur: '#fde047', plaat: '<svg viewBox="0 0 160 160"><rect width="160" height="160" fill="#fef9c3"/><rect x="16" y="34" width="128" height="34" rx="6" fill="#fde047" stroke="#b45309" stroke-width="3"/><path d="M30 34v14M46 34v9M62 34v14M78 34v9M94 34v14M110 34v9M126 34v14" stroke="#b45309" stroke-width="3"/><text x="80" y="120" font-family="Arial" font-weight="900" font-size="34" text-anchor="middle" fill="#b45309">m cm</text></svg>',
    maak: function (n) {
      var m = kiesUit(MATEN.filter(function (x) { return x[4] <= n })), k = rnd(1, 9)
      var naarKlein = Math.random() < (n === 1 ? .7 : .5)
      return naarKlein
        ? { tekst: k + ' <span class="eenheid">' + m[0] + '</span> = ? <span class="eenheid">' + m[1] + '</span>', antwoord: k * m[2], hulp: MAATPLAAT[m[3]] }
        : { tekst: (k * m[2]) + ' <span class="eenheid">' + m[1] + '</span> = ? <span class="eenheid">' + m[0] + '</span>', antwoord: k, hulp: MAATPLAAT[m[3]] }
    } },
]

function standVan(id) { return D.reken[id] || (D.reken[id] = { niveau: 1, goed: 0, keer: 0 }) }

function tekenOnderdelen() {
  var l = $('onderdelen'); l.innerHTML = ''
  ONDERDELEN.forEach(function (o, i) {
    var st = standVan(o.id), b = document.createElement('button')
    b.className = 'onderdeel'; b.style.borderColor = o.kleur; b.style.animationDelay = (i * 0.05) + 's'; b.setAttribute('aria-label', o.id)
    var sterren = ''; for (var s = 1; s <= MAX_NIVEAU; s++) sterren += s <= st.niveau ? STER : STER_LEEG
    b.innerHTML = '<span class="beeld">' + o.plaat + '</span><span class="niveau">' + sterren + '</span>'
    b.onclick = function () { geluidKlik(); startSommen(o) }
    l.appendChild(b)
  })
}

var sr = null   // de rekenronde
function startSommen(o) {
  sr = { o: o, n: standVan(o.id).niveau, i: 0, uitslag: [], vorige: '' }
  naar('s-som'); nieuweSom()
}
function nieuweSom() {
  var som, poging = 0
  do { som = sr.o.maak(sr.n) } while (som.tekst === sr.vorige && ++poging < 10)
  sr.vorige = som.tekst; sr.som = som; sr.invoer = ''; sr.fout = 0; sr.klaar = false
  $('som-hulp').innerHTML = som.hulp
  $('som-tekst').innerHTML = som.tekst.indexOf('?') >= 0 ? som.tekst : som.tekst + ' ='
  toonInvoer(); tekenSomPunten(); tekenCadeau(false)
}
function toonInvoer(klasse) {
  var a = $('som-antwoord'); a.className = 'antwoord' + (sr.invoer ? '' : ' leeg') + (klasse ? ' ' + klasse : '')
  a.textContent = sr.invoer
}
function tekenSomPunten() {
  var p = $('som-punten'); p.innerHTML = ''
  for (var i = 0; i < PER_RONDE; i++) {
    var u = sr.uitslag[i], s = document.createElement('span')
    s.className = 'punt' + (i === sr.i && u == null ? ' nu' : u === 2 ? ' goed' : u === 1 ? ' half' : u === 0 ? ' fout' : '')
    p.appendChild(s)
  }
}
function typ(c) {
  if (!sr || sr.klaar) return
  if (c === 'wis') sr.invoer = sr.invoer.slice(0, -1)
  else if (c === 'ok') return controleer()
  else if (sr.invoer.length < 5) sr.invoer = (sr.invoer === '0' ? '' : sr.invoer) + c
  geluidKlik(); toonInvoer()
}
function controleer() {
  if (!sr.invoer) return
  var st = standVan(sr.o.id)
  if (Number(sr.invoer) === sr.som.antwoord) {
    sr.klaar = true; toonInvoer('goed'); geluidGoed()
    var r = $('som-antwoord').getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2, sr.fout ? 30 : 70)
    st.keer++
    if (!sr.fout) { st.goed++; D.teller = (D.teller || 0) + 1; tekenCadeau(true) }
    sr.uitslag[sr.i] = sr.fout ? 1 : 2; bewaar(); tekenSomPunten()
    setTimeout(volgendeSom, 1100)
  } else {
    sr.fout++; geluidFout(); toonInvoer('fout')
    if (sr.fout >= 2) {
      // twee keer fout: het goede antwoord laten zien en door
      sr.klaar = true; st.keer++; sr.uitslag[sr.i] = 0; bewaar()
      setTimeout(function () { sr.invoer = String(sr.som.antwoord); toonInvoer('toon'); tekenSomPunten() }, 450)
      setTimeout(volgendeSom, 2400)
    } else setTimeout(function () { sr.invoer = ''; toonInvoer() }, 450)
  }
}
function volgendeSom() {
  sr.i++
  if ((D.teller || 0) >= BELONING_NA) { D.teller -= BELONING_NA; bewaar(); return toonBeloning(verderNaSommen) }
  verderNaSommen()
}
function verderNaSommen() {
  if (sr.i < PER_RONDE) { naar('s-som'); return nieuweSom() }
  var n = sr.uitslag.filter(function (u) { return u === 2 }).length, st = standVan(sr.o.id)
  if (n >= OMHOOG_BIJ && st.niveau < MAX_NIVEAU) { st.niveau++; bewaar() }
  var rij = $('eind-sterren'); rij.innerHTML = ''
  for (var i = 0; i < PER_RONDE; i++) { var sp = document.createElement('span'); sp.innerHTML = i < n ? STER : STER_LEEG; sp.firstChild.style.animationDelay = (i * 0.08) + 's'; rij.appendChild(sp.firstChild) }
  var o = sr.o
  eindeKnoppen(function () { naar('s-reken') }, function () { startSommen(o) })
  naar('s-einde'); geluidGoed(); setTimeout(function () { confetti(innerWidth / 2, innerHeight / 3, 120) }, 200)
}

// cijferblok
;(function () {
  var t = $('toetsen')
  var WIS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 5H9l-6 7 6 7h12z"/><path d="M17 9l-6 6M11 9l6 6"/></svg>'
  var OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>'
  ;['1', '2', '3', '4', '5', '6', '7', '8', '9', 'wis', '0', 'ok'].forEach(function (c) {
    var b = document.createElement('button'); b.className = 'toets' + (c === 'ok' ? ' ok' : c === 'wis' ? ' wis' : '')
    b.innerHTML = c === 'wis' ? WIS : c === 'ok' ? OK : c
    b.setAttribute('aria-label', c === 'wis' ? 'Wissen' : c === 'ok' ? 'Klaar' : c)
    b.onclick = function () { typ(c) }
    t.appendChild(b)
  })
  addEventListener('keydown', function (e) {
    if (!$('s-som').classList.contains('aan')) return
    if (/^[0-9]$/.test(e.key)) typ(e.key)
    else if (e.key === 'Backspace') typ('wis')
    else if (e.key === 'Enter') typ('ok')
  })
})()

$('som-terug').onclick = function () { geluidKlik(); naar('s-reken') }
// het rekenscherm opnieuw tekenen als je erheen gaat (sterren kunnen veranderd zijn)
var naarOud = naar
naar = function (id) { naarOud(id); if (id === 's-reken') tekenOnderdelen() }
