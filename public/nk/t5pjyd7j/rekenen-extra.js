'use strict'
// Rekenen voor nieuwkomers met een duidelijke opbouw, voor rekenniveau groep 3
// tot en met 6 (ongeveer tot 1F). Vier rekendomeinen met elk een kopje; binnen
// een domein staan de oefeningen van makkelijk naar moeilijk (met volgnummer).
// Elke oefening heeft 5 niveaus. Je kiest zelf een niveau tot en met het
// hoogste dat je gehaald hebt, dus de makkelijke dingen blijven te oefenen.
// Vervangt de oefeningen uit rekenen.js (voortgang blijft in D.reken[id]).
// maak(niveau) geeft { tekst, antwoord, hulp }; antwoorden zijn hele getallen
// (er is alleen een cijferblok).

var DOMEINEN = [
  { id: 'getallen', naam: 'Getallen', kleur: '#38bdf8',
    icoon: '<svg viewBox="0 0 40 40"><text x="20" y="28" font-family="Arial" font-weight="900" font-size="19" text-anchor="middle" fill="currentColor">123</text></svg>' },
  { id: 'verhoudingen', naam: 'Verhoudingen', kleur: '#f472b6',
    icoon: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="3"/><path d="M20 20V5a15 15 0 0 1 0 30z" fill="currentColor"/></svg>' },
  { id: 'meten', naam: 'Meten en meetkunde', kleur: '#fde047',
    icoon: '<svg viewBox="0 0 40 40"><rect x="4" y="13" width="32" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M11 13v6M18 13v4M25 13v6M32 13v4" stroke="currentColor" stroke-width="2.5"/></svg>' },
  { id: 'verbanden', naam: 'Verbanden', kleur: '#34d399',
    icoon: '<svg viewBox="0 0 40 40"><path d="M6 34h30" stroke="currentColor" stroke-width="3"/><rect x="8" y="20" width="6" height="14" fill="currentColor"/><rect x="17" y="10" width="6" height="24" fill="currentColor"/><rect x="26" y="15" width="6" height="19" fill="currentColor"/></svg>' },
]

// ── tekenhulpjes ──
function tegelPlaat(bg, kleur, tekst, extra) {
  return '<svg viewBox="0 0 160 160"><rect width="160" height="160" fill="' + bg + '"/>' + (tekst ? '<text x="80" y="70" font-family="Arial" font-weight="900" font-size="42" text-anchor="middle" fill="' + kleur + '">' + tekst + '</text>' : '') + (extra || '') + '</svg>'
}
function stipjes(aantal, kleur, vanaf) {   // losse stippen; vanaf: index waarna ze doorgestreept zijn
  var h = ''
  for (var i = 0; i < aantal; i++) h += '<span class="stip' + (vanaf != null && i >= vanaf ? ' weg' : '') + '" style="background:' + kleur + '"></span>'
  return h
}
function vijfRij(inhoud) { return '<span class="groepje" style="grid-template-columns:repeat(5,26px)">' + inhoud + '</span>' }
// tienveld: per tiental een kaart van 2 x 5 (vol en leeg), zo zie je 10 in een oogopslag
function tienveld(n, kleur) {
  var h = ''
  for (var t = 0; t < Math.max(1, Math.ceil(n / 10)); t++) {
    var vol = Math.min(10, n - t * 10), cellen = ''
    for (var i = 0; i < 10; i++) cellen += i < vol ? '<span class="stip" style="background:' + kleur + '"></span>' : '<span class="stip leeg"></span>'
    h += vijfRij(cellen)
  }
  return h
}
// staven van tien en losse blokjes (voor tellen tot 100)
function staven(n) {
  var h = '<span class="mab">'
  for (var i = 0; i < Math.floor(n / 10); i++) h += '<span class="staaf"></span>'
  h += '<span class="blokjes">'
  for (var j = 0; j < n % 10; j++) h += '<span class="blokje"></span>'
  return h + '</span></span>'
}
function plusTeken(t) { return '<span class="plus-teken">' + t + '</span>' }
var APPEL = '<svg viewBox="0 0 40 40" class="icoon"><path d="M20 12c-9-5-16 2-15 11 1 10 8 15 15 12 7 3 14-2 15-12 1-9-6-16-15-11z" fill="#ef4444"/><path d="M20 12c0-4 2-7 5-8" stroke="#78350f" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M22 9c4-3 8-2 9 0-3 2-6 2-9 0z" fill="#22c55e"/></svg>'
var MUNT = '<svg viewBox="0 0 40 40" class="icoon"><circle cx="20" cy="20" r="16" fill="#fbbf24" stroke="#b45309" stroke-width="3"/><text x="20" y="27" font-family="Arial" font-weight="900" font-size="18" text-anchor="middle" fill="#92400e">€</text></svg>'
function geldStuk(w) {
  if (w <= 2) return '<svg viewBox="0 0 56 56" class="munt"><circle cx="28" cy="28" r="25" fill="' + (w === 2 ? '#fbbf24' : '#e5e7eb') + '" stroke="' + (w === 2 ? '#b45309' : '#9ca3af') + '" stroke-width="4"/><circle cx="28" cy="28" r="15" fill="' + (w === 2 ? '#e5e7eb' : '#fbbf24') + '"/><text x="28" y="35" font-family="Arial" font-weight="900" font-size="19" text-anchor="middle" fill="#1f2937">' + w + '</text></svg>'
  var kl = { 5: '#94a3b8', 10: '#f87171', 20: '#60a5fa', 50: '#fb923c' }[w]
  return '<svg viewBox="0 0 96 54" class="biljet"><rect x="2" y="2" width="92" height="50" rx="6" fill="' + kl + '" stroke="#1f2937" stroke-opacity=".25" stroke-width="3"/><circle cx="72" cy="27" r="14" fill="#fff" fill-opacity=".35"/><text x="30" y="36" font-family="Arial" font-weight="900" font-size="24" text-anchor="middle" fill="#fff">€' + w + '</text></svg>'
}
var KIND = '<svg viewBox="0 0 40 40" class="icoon"><circle cx="20" cy="11" r="7" fill="#fcd34d"/><path d="M8 38c0-9 5-16 12-16s12 7 12 16z" fill="#38bdf8"/></svg>'
var SNOEP = '<svg viewBox="0 0 40 40" class="icoon"><path d="M4 12l8 6-8 4zM36 12l-8 6 8 4z" fill="#f9a8d4"/><circle cx="20" cy="18" r="9" fill="#f472b6"/></svg>'
var ZAK = '<svg viewBox="0 0 40 40" class="icoon"><path d="M10 14h20l4 22H6z" fill="#d97706"/><path d="M14 14c0-6 12-6 12 0" fill="none" stroke="#92400e" stroke-width="3"/></svg>'
// taart in gelijke stukken, de eerste 'tel' gekleurd
function taart(noem, tel) {
  var s = '<svg class="taart" viewBox="-60 -60 120 120">'
  for (var i = 0; i < noem; i++) {
    var a0 = (i / noem) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / noem) * 2 * Math.PI - Math.PI / 2
    s += '<path d="M0 0L' + (55 * Math.cos(a0)).toFixed(1) + ' ' + (55 * Math.sin(a0)).toFixed(1) + 'A55 55 0 0 1 ' + (55 * Math.cos(a1)).toFixed(1) + ' ' + (55 * Math.sin(a1)).toFixed(1) + 'z" fill="' + (i < tel ? '#f472b6' : '#fff') + '" stroke="#be185d" stroke-width="3"/>'
  }
  return s + '</svg>'
}
// strook in gelijke stukken
function strook(noem, tel) {
  var s = '<svg class="strook" viewBox="0 0 324 64">'
  for (var i = 0; i < noem; i++) s += '<rect x="' + (2 + i * 320 / noem).toFixed(1) + '" y="2" width="' + (320 / noem).toFixed(1) + '" height="60" fill="' + (i < tel ? '#f472b6' : '#fff') + '" stroke="#be185d" stroke-width="3"/>'
  return s + '</svg>'
}
// analoge klok met cijfers 1 tot 12
function klok(h, m) {
  var s = '<svg class="klok-plaat" viewBox="-60 -60 120 120"><circle r="56" fill="#fff" stroke="#b45309" stroke-width="5"/>'
  for (var i = 1; i <= 12; i++) {
    var a = i * Math.PI / 6
    s += '<text x="' + (44 * Math.sin(a)).toFixed(1) + '" y="' + (-44 * Math.cos(a) + 5).toFixed(1) + '" font-family="Arial" font-weight="800" font-size="13" text-anchor="middle" fill="#1f2937">' + i + '</text>'
  }
  var ua = ((h % 12) + m / 60) * Math.PI / 6, ma = m * Math.PI / 30
  s += '<path d="M0 0L' + (26 * Math.sin(ua)).toFixed(1) + ' ' + (-26 * Math.cos(ua)).toFixed(1) + '" stroke="#1f2937" stroke-width="6" stroke-linecap="round"/>'
  s += '<path d="M0 0L' + (40 * Math.sin(ma)).toFixed(1) + ' ' + (-40 * Math.cos(ma)).toFixed(1) + '" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/><circle r="4" fill="#1f2937"/>'
  return s + '</svg>'
}
// liniaal in cm met een potlood erboven van 0 tot l
function liniaal(max, l) {
  var cm = 460 / max, s = '<svg class="lijnplaat" viewBox="0 0 520 120">'
  s += '<rect x="20" y="10" width="' + (l * cm + 10) + '" height="22" rx="4" fill="#fbbf24"/><path d="M' + (30 + l * cm) + ' 10l14 11-14 11z" fill="#f5d0a9"/><rect x="20" y="10" width="14" height="22" fill="#f472b6"/>'
  s += '<rect x="20" y="46" width="480" height="60" rx="6" fill="#fde68a" stroke="#b45309" stroke-width="3"/>'
  for (var i = 0; i <= max; i++) {
    var x = 30 + i * cm
    s += '<path d="M' + x + ' 46v' + (i % 5 === 0 ? 24 : 14) + '" stroke="#78350f" stroke-width="2.5"/>'
    s += '<text x="' + x + '" y="94" font-family="Arial" font-weight="800" font-size="' + (max > 10 ? 13 : 16) + '" text-anchor="middle" fill="#78350f">' + i + '</text>'
  }
  s += '<path d="M30 10v36" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 3"/><path d="M' + (30 + l * cm) + ' 10v36" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 3"/>'
  return s + '</svg>'
}
function breukHtml(teller, noemer) { return '<span class="breuk"><b>' + teller + '</b><i>' + noemer + '</i></span>' }
var ehd = function (t) { return '<span class="eenheid">' + t + '</span>' }

// ── de oefeningen, per domein van makkelijk naar moeilijk ──
// niveaus: een kort voorbeeld per niveau voor de niveaukiezer
var OEFENINGEN = [
  // Getallen
  { id: 'tellen', domein: 'getallen', niveaus: ['1–5', '1–10', '11–20', '21–50', '51–100'],
    plaat: tegelPlaat('#e0f2fe', '#0284c7', '', '<g fill="#38bdf8"><circle cx="40" cy="45" r="13"/><circle cx="80" cy="45" r="13"/><circle cx="120" cy="45" r="13"/><circle cx="60" cy="85" r="13"/><circle cx="100" cy="85" r="13"/></g><text x="80" y="145" font-family="Arial" font-weight="900" font-size="36" text-anchor="middle" fill="#0284c7">5</text>'),
    maak: function (n) {
      var k = [0, rnd(1, 5), rnd(3, 10), rnd(11, 20), rnd(21, 50), rnd(51, 100)][n]
      return { tekst: '?', antwoord: k, hulp: n === 1 ? vijfRij(stipjes(k, KLEUR_A)) : n <= 3 ? tienveld(k, KLEUR_A) : staven(k) }
    } },
  { id: 'getallenlijn', domein: 'getallen', niveaus: ['0–10', '0–20', '0–100', '0–100', '0–1000'],
    plaat: tegelPlaat('#e0f2fe', '#0284c7', '', '<path d="M18 100h124" stroke="#0284c7" stroke-width="5"/><path d="M18 88v24M49 94v12M80 88v24M111 94v12M142 88v24" stroke="#0284c7" stroke-width="4"/><path d="M95 62l-10-14h20z" fill="#ef4444"/><text x="95" y="42" font-family="Arial" font-weight="900" font-size="30" text-anchor="middle" fill="#ef4444">?</text>'),
    maak: function (n) {
      // [max, streepje elke, getal erbij elke, doel in stappen van]
      var c = [0, [10, 1, 5, 1], [20, 1, 10, 1], [100, 10, 50, 10], [100, 5, 50, 5], [1000, 100, 500, 50]][n]
      var max = c[0], doel
      do { doel = c[3] * rnd(1, max / c[3] - 1) } while (doel % c[2] === 0)
      var x = function (v) { return 30 + 460 * v / max }
      var s = '<svg class="lijnplaat" viewBox="0 0 520 120"><path d="M30 80h460" stroke="#e5e7eb" stroke-width="4"/>'
      for (var v = 0; v <= max; v += c[1]) {
        var groot = v % c[2] === 0, middel = !groot && n === 4 && v % 10 === 0
        s += '<path d="M' + x(v) + ' ' + (groot ? 64 : middel ? 68 : 72) + 'v' + (groot ? 30 : middel ? 22 : 16) + '" stroke="#e5e7eb" stroke-width="3"/>'
        if (groot) s += '<text x="' + x(v) + '" y="114" font-family="Arial" font-weight="800" font-size="18" text-anchor="middle" fill="#e5e7eb">' + v + '</text>'
      }
      s += '<path d="M' + x(doel) + ' 62l-11-18h22z" fill="#ef4444"/><text x="' + x(doel) + '" y="36" font-family="Arial" font-weight="900" font-size="28" text-anchor="middle" fill="#ef4444">?</text></svg>'
      return { tekst: '?', antwoord: doel, hulp: s }
    } },
  { id: 'splitsen', domein: 'getallen', niveaus: ['5 = 2 + ?', '9 = 4 + ?', '10 = 3 + ?', '16 = 9 + ?', '100 = 40 + ?'],
    plaat: tegelPlaat('#e0f2fe', '#0284c7', '7', '<path d="M80 82l-30 26M80 82l30 26" stroke="#0284c7" stroke-width="5"/><text x="46" y="145" font-family="Arial" font-weight="900" font-size="34" text-anchor="middle" fill="#0284c7">3</text><text x="114" y="145" font-family="Arial" font-weight="900" font-size="34" text-anchor="middle" fill="#ef4444">?</text>'),
    maak: function (n) {
      var t = [0, rnd(2, 5), rnd(5, 10), 10, rnd(11, 20), 100][n]
      var a = n === 5 ? rnd(1, 9) * 10 + (Math.random() < 0.4 ? 5 : 0) : rnd(1, t - 1)
      var hulp = n <= 3 ? vijfRij(stipjes(a, KLEUR_A) + new Array(t - a + 1).join('<span class="stip leeg"></span>')) : ''
      return { tekst: t + ' = ' + a + ' + ?', antwoord: t - a, hulp: hulp }
    } },
  // plus: van tot 10 (groep 3) tot 1000 (groep 6), één tegel
  { id: 'plus10', domein: 'getallen', niveaus: ['5 + 3', '12 + 5', '8 + 5', '34 + 25', '345 + 278'],
    maak: function (n) {
      var a, b, hulp = ''
      if (n === 1) { a = rnd(1, 8); b = rnd(1, 10 - a) }
      else if (n === 2) { var e = rnd(1, 8); a = 10 + e; b = rnd(1, 9 - e) }
      else if (n === 3) { a = rnd(5, 9); b = rnd(11 - a, 9) }                 // over het tiental
      else if (n === 4) { a = rnd(11, 79); b = rnd(11, 99 - a) }
      else { a = Math.random() < 0.4 ? rnd(11, 89) * 10 : rnd(101, 899); b = a % 10 ? rnd(11, 1000 - a) : rnd(1, (1000 - a) / 10) * 10 }
      if (n === 1) hulp = vijfRij(stipjes(a, KLEUR_A)) + plusTeken('+') + vijfRij(stipjes(b, KLEUR_B))
      else if (n <= 3) hulp = tienveld(a, KLEUR_A) + plusTeken('+') + vijfRij(stipjes(b, KLEUR_B))
      return { tekst: a + ' + ' + b, antwoord: a + b, hulp: hulp }
    } },
  // min: zelfde opbouw als plus
  { id: 'min', domein: 'getallen', niveaus: ['9 − 3', '17 − 4', '13 − 5', '62 − 27', '812 − 356'],
    plaat: tegelPlaat('#e0f2fe', '#0284c7', '9−4', '<g fill="#38bdf8"><circle cx="30" cy="115" r="11"/><circle cx="56" cy="115" r="11"/><circle cx="82" cy="115" r="11"/></g><g fill="#38bdf8" opacity=".3"><circle cx="108" cy="115" r="11"/><circle cx="134" cy="115" r="11"/></g>'),
    maak: function (n) {
      var a, b
      if (n === 1) { a = rnd(3, 10); b = rnd(1, a - 1) }
      else if (n === 2) { var e = rnd(2, 9); a = 10 + e; b = rnd(1, e) }
      else if (n === 3) { a = rnd(11, 17); b = rnd(a - 9, 9) }   // over het tiental heen
      else if (n === 4) { a = rnd(30, 99); b = rnd(11, a - 5) }
      else { a = rnd(200, 999); b = a % 10 && Math.random() < 0.6 ? rnd(101, a - 50) : rnd(1, Math.floor(a / 10) - 5) * 10 }
      return { tekst: a + ' − ' + b, antwoord: a - b, hulp: n <= 3 ? vijfRij(stipjes(a, KLEUR_A, a - b)) : '' }
    } },
  // keer: tafels in de volgorde van de leerlijn, op niveau 5 met tientallen (3 × 40)
  { id: 'keer', domein: 'getallen', niveaus: ['2 × 4', '5 × 3', '4 × 6', '7 × 8', '3 × 40'],
    maak: function (n) {
      var t = kiesUit([0, [1, 2, 10], [2, 5, 10], [3, 4], [6, 7, 8, 9], [2, 3, 4, 5, 6, 7, 8, 9]][n]), a = rnd(1, 10)
      if (n === 5) { var tien = rnd(2, 9) * 10; return { tekst: t + ' × ' + tien, antwoord: t * tien, hulp: '' } }
      return { tekst: a + ' × ' + t, antwoord: a * t, hulp: a * t <= 30 && n <= 3 ? raster(a, t, KLEUR_A) : '' }
    } },
  // delen: zelfde tafels, op niveau 5 met tientallen (120 : 4)
  { id: 'delen', domein: 'getallen', niveaus: ['8 : 2', '15 : 5', '12 : 3', '56 : 8', '120 : 4'],
    maak: function (n) {
      var t = kiesUit([0, [2], [2, 5, 10], [3, 4], [6, 7, 8, 9], [2, 3, 4, 5, 6, 7, 8, 9]][n]), uit = rnd(1, 10)
      if (n === 5) { var u = rnd(2, 9) * 10; return { tekst: (u * t) + ' : ' + t, antwoord: u, hulp: '' } }
      return { tekst: (uit * t) + ' : ' + t, antwoord: uit, hulp: uit * t <= 30 && n <= 3 ? raster(uit, t, KLEUR_B) : '' }
    } },
  // Verhoudingen (leerlijn: twee keer zoveel en half zoveel, eerlijk verdelen,
  // deel van een geheel, daarna verhoudingstabel, breuken en procenten)
  { id: 'dubbel', domein: 'verhoudingen', niveaus: ['dubbel 3', 'dubbel 8', 'helft 14', 'dubbel 35', 'helft 370'],
    plaat: tegelPlaat('#fce7f3', '#be185d', '', '<g fill="#f472b6"><circle cx="38" cy="60" r="12"/><circle cx="38" cy="94" r="12"/><circle cx="38" cy="128" r="12"/></g><g fill="#be185d"><circle cx="122" cy="60" r="12"/><circle cx="122" cy="94" r="12"/><circle cx="122" cy="128" r="12"/></g><path d="M60 94h40" stroke="#be185d" stroke-width="5"/><text x="80" y="36" font-family="Arial" font-weight="900" font-size="28" text-anchor="middle" fill="#be185d">2×</text>'),
    maak: function (n) {
      var w = function (t) { return '<span class="woordje">' + t + '</span> ' }
      if (n === 1) { var a = rnd(1, 5); return { tekst: w('dubbel') + a, antwoord: 2 * a, hulp: vijfRij(stipjes(a, KLEUR_A)) + plusTeken('+') + vijfRij(stipjes(a, KLEUR_A)) } }
      if (n === 2) { var b = rnd(4, 10); return { tekst: w('dubbel') + b, antwoord: 2 * b, hulp: tienveld(b, KLEUR_A) + plusTeken('+') + tienveld(b, KLEUR_A) } }
      if (n === 3) { var c = rnd(2, 10) * 2; return { tekst: w('helft') + c, antwoord: c / 2, hulp: raster(2, c / 2, KLEUR_B) } }
      if (n === 4) { var d = Math.random() < 0.5 ? rnd(11, 49) : rnd(1, 10) * 10; return Math.random() < 0.5 ? { tekst: w('dubbel') + d, antwoord: 2 * d, hulp: '' } : { tekst: w('helft') + 2 * d, antwoord: d, hulp: '' } }
      var e = Math.random() < 0.5 ? rnd(11, 49) * 10 : rnd(101, 499)
      return Math.random() < 0.5 ? { tekst: w('dubbel') + e, antwoord: 2 * e, hulp: '' } : { tekst: w('helft') + 2 * e, antwoord: e, hulp: '' }
    } },
  { id: 'verhouding', domein: 'verhoudingen', niveaus: ['6 : 2 kinderen', '12 : 4 kinderen', '1 zak = 4', '1→7  6→?', '4→60  3→?'],
    plaat: tegelPlaat('#fce7f3', '#be185d', '', '<g transform="translate(20 30) scale(1.2)">' + APPEL.replace('class="icoon"', 'width="40" height="40"') + '</g><text x="110" y="72" font-family="Arial" font-weight="900" font-size="38" text-anchor="middle" fill="#be185d">1</text><g transform="translate(20 92) scale(1.2)">' + MUNT.replace('class="icoon"', 'width="40" height="40"') + '</g><text x="110" y="134" font-family="Arial" font-weight="900" font-size="38" text-anchor="middle" fill="#be185d">3</text>'),
    maak: function (n) {
      if (n <= 2) {
        // eerlijk verdelen: hoeveel krijgt elk kind?
        var k = n === 1 ? 2 : rnd(3, 5), per = rnd(1, 5)
        var kinderen = ''; for (var i = 0; i < k; i++) kinderen += KIND
        return { tekst: '? ' + SNOEP + ' <span class="woordje">per</span> ' + KIND, antwoord: per,
          hulp: vijfRij(stipjes(k * per, '#f472b6')) + plusTeken('→') + '<span class="kinderen">' + kinderen + '</span>' }
      }
      var a = n === 5 ? rnd(2, 5) : 1, u = [0, 0, 0, rnd(2, 5), rnd(2, 10), kiesUit([5, 10, 15, 20, 25])][n], c
      do { c = rnd(2, n === 3 ? 5 : 10) } while (c === a)
      var boven = n === 3 ? ZAK : APPEL, onder = n === 3 ? SNOEP : MUNT
      return { tekst: '<table class="vtabel"><tr><th>' + boven + '</th><td>' + a + '</td><td>' + c + '</td></tr><tr><th>' + onder + '</th><td>' + (a * u) + '</td><td class="vraag">?</td></tr></table>', antwoord: c * u,
        hulp: n === 3 ? '<span class="zakje">' + ZAK + '</span>' + plusTeken('=') + vijfRij(stipjes(u, '#f472b6')) : '' }
    } },
  { id: 'breuk', domein: 'verhoudingen', niveaus: ['? / 2', '? / 6', '½ van 8', '⅕ van 35', '¾ van 20'],
    plaat: tegelPlaat('#fce7f3', '#be185d', '', '<circle cx="80" cy="80" r="52" fill="#fff" stroke="#be185d" stroke-width="5"/><path d="M80 80V28a52 52 0 0 1 0 104z" fill="#f472b6"/><path d="M80 28v104" stroke="#be185d" stroke-width="5"/>'),
    maak: function (n) {
      if (n <= 2) {
        // deel van een geheel: hoeveel stukken zijn gekleurd?
        var noem = n === 1 ? kiesUit([2, 4]) : rnd(3, 8), tel = rnd(1, noem - 1)
        return { tekst: breukHtml('?', noem), antwoord: tel, hulp: n === 1 ? taart(noem, tel) : strook(noem, tel) }
      }
      if (n === 5 && Math.random() < 0.4) {
        // gelijkwaardig: 1/2 = ?/8
        var basis = kiesUit([[1, 2], [1, 4], [3, 4], [1, 3], [2, 5]]), f = rnd(2, 5)
        return { tekst: breukHtml(basis[0], basis[1]) + ' = ' + breukHtml('?', basis[1] * f), antwoord: basis[0] * f, hulp: '' }
      }
      var noemer = [0, 0, 0, kiesUit([2, 4]), kiesUit([3, 5, 10]), kiesUit([4, 3, 5])][n]
      var teller = n === 5 ? rnd(2, noemer - 1) : 1, deel = rnd(1, 10)
      return { tekst: breukHtml(teller, noemer) + ' van ' + (deel * noemer), antwoord: teller * deel,
        hulp: n === 3 && deel * noemer <= 40 ? raster(noemer, deel, KLEUR_B) : '' }
    } },
  { id: 'procent', domein: 'verhoudingen', niveaus: ['? %', '50% van 80', '25% van 40', '10% van 70', '75% van 40'],
    plaat: tegelPlaat('#fce7f3', '#be185d', '50%', '<rect x="20" y="100" width="120" height="26" rx="6" fill="#fff" stroke="#be185d" stroke-width="4"/><rect x="22" y="102" width="58" height="22" rx="4" fill="#f472b6"/>'),
    maak: function (n) {
      if (n === 1) {
        // honderdveld: hoeveel procent is gekleurd?
        var tien = rnd(1, 9), s = '<svg class="honderd" viewBox="0 0 202 202">'
        for (var r = 0; r < 10; r++) for (var k = 0; k < 10; k++) s += '<rect x="' + (1 + k * 20) + '" y="' + (1 + r * 20) + '" width="20" height="20" fill="' + (r < tien ? KLEUR_B : '#fff') + '" stroke="#1f2937" stroke-opacity=".3"/>'
        return { tekst: '? %', antwoord: tien * 10, hulp: s + '</svg>' }
      }
      var p = [0, 0, kiesUit([50, 100]), kiesUit([25, 50]), kiesUit([10, 20]), kiesUit([75, 20, 5])][n]
      var deler = { 100: 1, 50: 2, 25: 4, 75: 4, 10: 10, 20: 5, 5: 20 }[p]
      var basis = n === 2 ? 10 * rnd(1, 10) : n === 4 ? 10 * rnd(1, 20) : deler * rnd(1, Math.floor((n === 3 ? 100 : 200) / deler))
      var balk = '<svg class="procentplaat" viewBox="0 0 320 40"><rect x="2" y="2" width="316" height="36" rx="8" fill="#fff"/><rect x="4" y="4" width="' + (3.12 * p) + '" height="32" rx="6" fill="' + KLEUR_B + '"/>'
      for (var i = 1; i < 10; i++) balk += '<path d="M' + (4 + 31.2 * i) + ' 4v32" stroke="#1f2937" stroke-opacity=".2" stroke-width="2"/>'
      return { tekst: p + '% van ' + basis, antwoord: basis * p / 100, hulp: balk + '</svg>' }
    } },
  // Meten en meetkunde
  { id: 'geld', domein: 'meten', niveaus: ['€ 5', '€ 10', '€ 20', '€ 50', '€ 200'],
    plaat: tegelPlaat('#fef9c3', '#b45309', '', '<g transform="translate(14 30)">' + geldStuk(10).replace('class="biljet"', 'width="100" height="56"') + '</g><g transform="translate(40 92)">' + geldStuk(2).replace('class="munt"', 'width="50" height="50"') + '</g><g transform="translate(94 92)">' + geldStuk(1).replace('class="munt"', 'width="50" height="50"') + '</g>'),
    maak: function (n) {
      var soorten = [0, [1, 2], [1, 2, 5], [1, 2, 5, 10], [1, 2, 5, 10, 20], [1, 2, 5, 10, 20, 50]][n], max = [0, 5, 10, 20, 50, 200][n]
      var stukken = [], som = 0, aantal = rnd(2, n <= 2 ? 4 : 6)
      for (var p = 0; stukken.length < aantal && p < 40; p++) { var w = kiesUit(soorten); if (som + w <= max) { stukken.push(w); som += w } }
      if (stukken.length < 2) { stukken = [2, 1]; som = 3 }
      stukken.sort(function (x, y) { return y - x })
      return { tekst: '€ ?', antwoord: som, hulp: '<span class="geldrij">' + stukken.map(geldStuk).join('') + '</span>' }
    } },
  // tijd: klokkijken (hele, halve uren, kwartieren), daarna tijdseenheden
  { id: 'tijd', domein: 'meten', niveaus: ['3 uur', 'half 4', 'kwart over 2', '1 uur = ? min', '120 min = ? uur'],
    plaat: tegelPlaat('#fef9c3', '#b45309', '', '<circle cx="80" cy="80" r="56" fill="#fff" stroke="#b45309" stroke-width="6"/><path d="M80 80V42M80 80l26 14" stroke="#1f2937" stroke-width="7" stroke-linecap="round"/><circle cx="80" cy="80" r="6" fill="#1f2937"/>'),
    maak: function (n) {
      if (n <= 3) {
        var h = rnd(1, 12), na = function (u) { return u % 12 + 1 }
        if (n === 1) return { tekst: '? ' + ehd('uur'), antwoord: h, hulp: klok(h, 0) }
        if (n === 2) return { tekst: '<span class="woordje">half</span> ?', antwoord: na(h), hulp: klok(h, 30) }
        return Math.random() < 0.5
          ? { tekst: '<span class="woordje">kwart over</span> ?', antwoord: h, hulp: klok(h, 15) }
          : { tekst: '<span class="woordje">kwart voor</span> ?', antwoord: na(h), hulp: klok(h, 45) }
      }
      // [eenheid, meervoud, kleinere eenheid, hoeveel]
      var WEEK = ['week', 'weken', 'dagen', 7], UUR = ['uur', 'uur', 'minuten', 60], DAG = ['dag', 'dagen', 'uur', 24], JAAR = ['jaar', 'jaar', 'maanden', 12]
      var MIN = ['minuut', 'minuten', 'seconden', 60], KWART = ['kwartier', 'kwartier', 'minuten', 15], HALF = ['half uur', 'half uur', 'minuten', 30]
      var f = kiesUit(n === 4 ? [WEEK, UUR, DAG, JAAR, KWART, HALF] : [WEEK, UUR, DAG, JAAR, MIN])
      var k = f === KWART || f === HALF ? 1 : rnd(n === 4 ? 1 : 2, n === 4 ? 3 : 10)
      if (n === 5 && Math.random() < 0.5) return { tekst: (k * f[3]) + ' ' + ehd(f[2]) + ' = ? ' + ehd(f[1]), antwoord: k, hulp: '' }
      return { tekst: k + ' ' + ehd(k === 1 ? f[0] : f[1]) + ' = ? ' + ehd(f[2]), antwoord: k * f[3], hulp: '' }
    } },
  // maten: eerst meten met een liniaal, daarna omrekenen
  { id: 'maten', domein: 'meten', niveaus: ['liniaal 10', 'liniaal 20', '4 m = ? cm', '3 km = ? m', '80 mm = ? cm'],
    maak: function (n) {
      if (n <= 2) {
        var max = n === 1 ? 10 : 20, l = rnd(2, max - 1)
        return { tekst: '? ' + ehd('cm'), antwoord: l, hulp: liniaal(max, l) }
      }
      n = n - 1   // de omrekenniveaus hieronder lopen van 2 tot 4
      // [groot, klein, factor, soort]
      var M = { m: ['m', 'cm', 100, 'lengte'], kg: ['kg', 'g', 1000, 'gewicht'], km: ['km', 'm', 1000, 'lengte'], l: ['l', 'ml', 1000, 'inhoud'], cm: ['cm', 'mm', 10, 'lengte'], dm: ['m', 'dm', 10, 'lengte'] }
      var m = M[kiesUit([0, 0, ['m', 'kg'], ['m', 'kg', 'km', 'l'], ['m', 'kg', 'km', 'l', 'cm', 'dm']][n])]
      var k = rnd(n === 2 ? 1 : 2, n === 2 ? 5 : 9)
      var naarKlein = n === 2 || Math.random() < 0.5
      return naarKlein
        ? { tekst: k + ' ' + ehd(m[0]) + ' = ? ' + ehd(m[1]), antwoord: k * m[2], hulp: MAATPLAAT[m[3]] }
        : { tekst: (k * m[2]) + ' ' + ehd(m[1]) + ' = ? ' + ehd(m[0]), antwoord: k, hulp: MAATPLAAT[m[3]] }
    } },
  { id: 'oppervlakte', domein: 'meten', niveaus: ['6', '12', '30', '8 × 5', '12 × 9 m²'],
    plaat: tegelPlaat('#fef9c3', '#b45309', '', (function () { var s = ''; for (var r = 0; r < 3; r++) for (var k = 0; k < 4; k++) s += '<rect x="' + (24 + k * 28) + '" y="' + (38 + r * 28) + '" width="28" height="28" fill="#fde047" stroke="#b45309" stroke-width="3"/>'; return s })()),
    maak: function (n) {
      var b = [0, rnd(2, 3), rnd(2, 4), rnd(3, 6), rnd(4, 8), rnd(3, 12)][n], h = [0, rnd(1, 2), rnd(2, 3), rnd(2, 5), rnd(3, 6), rnd(2, 9)][n]
      var cel = Math.min(36, Math.floor(300 / b), Math.floor(200 / h)), w = b * cel, hh = h * cel
      var s = '<svg class="vlakplaat" viewBox="-40 -10 ' + (w + 110) + ' ' + (hh + 50) + '" style="width:min(92vw,' + (w + 110) * 1.3 + 'px)">'
      var maat = function (eenheid) {
        return '<text x="' + (w / 2) + '" y="' + (hh + 30) + '" font-family="Arial" font-weight="900" font-size="22" text-anchor="middle" fill="#e5e7eb">' + b + eenheid + '</text>' +
          '<text x="' + (w + 10) + '" y="' + (hh / 2 + 8) + '" font-family="Arial" font-weight="900" font-size="22" fill="#e5e7eb">' + h + eenheid + '</text>'
      }
      if (n <= 4) {
        for (var r = 0; r < h; r++) for (var k = 0; k < b; k++) s += '<rect x="' + (k * cel) + '" y="' + (r * cel) + '" width="' + cel + '" height="' + cel + '" fill="#fde047" stroke="#b45309" stroke-opacity="' + (n === 4 ? .35 : 1) + '" stroke-width="2"/>'
        if (n === 4) s += maat('')
        return { tekst: '? <span class="hokje"></span>', antwoord: b * h, hulp: s + '</svg>' }
      }
      s += '<rect x="0" y="0" width="' + w + '" height="' + hh + '" fill="#fde047" stroke="#b45309" stroke-width="3"/>' + maat(' m')
      return { tekst: '? ' + ehd('m²'), antwoord: b * h, hulp: s + '</svg>' }
    } },
  // Verbanden
  { id: 'patroon', domein: 'verbanden', niveaus: ['1 2 3 ?', '2 4 6 ?', '10 20 30 ?', '20 18 16 ?', '50 100 150 ?'],
    plaat: tegelPlaat('#d1fae5', '#047857', '', '<text x="80" y="92" font-family="Arial" font-weight="900" font-size="32" text-anchor="middle" fill="#047857">2 4 6 ?</text>'),
    maak: function (n) {
      var stap = kiesUit([0, [1], [2, 1], [5, 10], [-1, -2, 3, 4, -10], [25, 50, 100, -5, 'x2']][n]), t = []
      if (stap === 'x2') { t = [rnd(1, 5)]; while (t.length < 5) t.push(t[t.length - 1] * 2) }
      else {
        var start = stap === -10 ? 10 * rnd(4, 10) : stap < 0 ? rnd(-stap * 4, n === 4 ? 30 : 100) : stap >= 5 ? stap * rnd(0, 5) : rnd(0, n === 1 ? 5 : 10)
        for (var i = 0; i < 5; i++) t.push(start + i * stap)
      }
      return { tekst: '<span class="lang">' + t.slice(0, 4).join(', ') + ', ?</span>', antwoord: t[4], hulp: '' }
    } },
  { id: 'grafiek', domein: 'verbanden', niveaus: ['5', '10', '20', '50', '100'],
    plaat: tegelPlaat('#d1fae5', '#047857', '', '<path d="M24 132h116M24 132V24" stroke="#047857" stroke-width="5"/><rect x="38" y="84" width="22" height="48" fill="#38bdf8"/><rect x="70" y="50" width="22" height="82" fill="#f472b6"/><rect x="102" y="70" width="22" height="62" fill="#fbbf24"/><text x="81" y="40" font-family="Arial" font-weight="900" font-size="26" text-anchor="middle" fill="#ef4444">?</text>'),
    maak: function (n) {
      // [max, lijn elke, getal erbij elke, waarden in stappen van]
      var c = [0, [5, 1, 1, 1], [10, 1, 2, 1], [20, 2, 4, 2], [50, 10, 10, 5], [100, 20, 20, 10]][n]
      var max = c[0], kleuren = ['#38bdf8', '#f472b6', '#fbbf24', '#34d399'], aantal = n === 1 ? 3 : 4
      var waarden = []; for (var i = 0; i < aantal; i++) waarden.push(c[3] * rnd(1, max / c[3]))
      var doel = rnd(0, aantal - 1), H = 200, B = 260, y = function (v) { return 10 + H - H * v / max }
      var s = '<svg class="grafplaat" viewBox="0 0 320 240">'
      for (var v = 0; v <= max; v += c[1]) {
        s += '<path d="M44 ' + y(v) + 'h' + B + '" stroke="#e5e7eb" stroke-opacity="' + (v ? .25 : 1) + '" stroke-width="' + (v ? 1.5 : 3) + '"/>'
        if (v % c[2] === 0) s += '<text x="34" y="' + (y(v) + 6) + '" font-family="Arial" font-weight="800" font-size="16" text-anchor="end" fill="#e5e7eb">' + v + '</text>'
      }
      var bw = B / aantal
      waarden.forEach(function (w, i) {
        var x = 44 + i * bw + bw * 0.2
        s += '<rect x="' + x + '" y="' + y(w) + '" width="' + (bw * 0.6) + '" height="' + (H * w / max) + '" fill="' + kleuren[i] + '"/>'
        if (i === doel) s += '<text x="' + (x + bw * 0.3) + '" y="' + (y(w) - 8) + '" font-family="Arial" font-weight="900" font-size="26" text-anchor="middle" fill="#ef4444">?</text>'
      })
      return { tekst: '?', antwoord: waarden[doel], hulp: s + '</svg>' }
    } },
]

// plaatjes van de oude tegels hergebruiken, daarna de lijst vervangen
var OUD = {}; ONDERDELEN.forEach(function (o) { OUD[o.id] = o })
OEFENINGEN.forEach(function (o) {
  if (!o.plaat) o.plaat = OUD[o.id].plaat
  o.kleur = DOMEINEN.filter(function (d) { return d.id === o.domein })[0].kleur
})
ONDERDELEN.length = 0
OEFENINGEN.forEach(function (o) { ONDERDELEN.push(o) })

// ── keuzescherm: een kopje per domein, tegels op volgorde ──
tekenOnderdelen = function () {
  var l = $('onderdelen'); l.innerHTML = ''; l.className = 'onderdelen domeinen'
  var t = 0
  DOMEINEN.forEach(function (d) {
    var sec = document.createElement('section'); sec.className = 'domein'; sec.style.setProperty('--d', d.kleur)
    sec.innerHTML = '<h2 class="domein-kop"><span class="domein-icoon">' + d.icoon + '</span>' + d.naam + '</h2><div class="domein-tegels"></div>'
    var rij = sec.querySelector('.domein-tegels')
    ONDERDELEN.filter(function (o) { return o.domein === d.id }).forEach(function (o, i) {
      var st = standVan(o.id), b = document.createElement('button')
      b.className = 'onderdeel'; b.style.borderColor = o.kleur; b.style.animationDelay = (t++ * 0.03) + 's'; b.setAttribute('aria-label', o.id)
      var sterren = ''; for (var s = 1; s <= MAX_NIVEAU; s++) sterren += s <= st.niveau ? STER : STER_LEEG
      b.innerHTML = '<span class="stapnr">' + (i + 1) + '</span><span class="beeld">' + o.plaat + '</span><span class="niveau">' + sterren + '</span>'
      b.onclick = function () { geluidKlik(); kiesNiveau(o) }
      rij.appendChild(b)
    })
    l.appendChild(sec)
  })
}

// niveaukiezer: alle niveaus staan open; gehaalde niveaus krijgen een ster,
// het niveau waar je nu bent licht op
function kiesNiveau(o) {
  var st = standVan(o.id), laag = $('niveaulaag'), lijst = $('niveaulijst')
  $('niveaubeeld').innerHTML = o.plaat
  laag.style.setProperty('--d', o.kleur)
  lijst.innerHTML = ''
  for (var n = 1; n <= MAX_NIVEAU; n++) (function (n) {
    var b = document.createElement('button')
    b.className = 'nivknop' + (n === st.niveau ? ' nu' : '')
    b.style.animationDelay = (n * 0.04) + 's'
    b.innerHTML = '<span class="nivnr">' + n + '</span><span class="nivvb">' + o.niveaus[n - 1] + '</span><span class="nivster">' + (n < st.niveau ? STER : '') + '</span>'
    b.onclick = function (e) {
      e.stopPropagation()
      geluidKlik(); laag.classList.remove('aan'); startSommen(o, n)
    }
    lijst.appendChild(b)
  })(n)
  laag.classList.add('aan')
}

;(function () {
  var laag = document.createElement('div'); laag.className = 'niveaulaag'; laag.id = 'niveaulaag'
  laag.innerHTML = '<div class="niveaudoos"><div class="niveaubeeld" id="niveaubeeld"></div><div class="niveaulijst" id="niveaulijst"></div></div>'
  laag.onclick = function (e) { if (e.target === laag) laag.classList.remove('aan') }
  document.body.appendChild(laag)
  var css = document.createElement('style')
  css.textContent = [
    '.onderdelen.domeinen { display: flex; flex-direction: column; gap: 22px; align-content: initial; padding-bottom: 20px; }',
    '.domein-kop { margin: 0 0 12px; display: flex; align-items: center; gap: 10px; font-size: 1.5rem; font-weight: 800; color: var(--d); }',
    '.domein-icoon { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: color-mix(in srgb, var(--d) 18%, transparent); }',
    '.domein-icoon svg { width: 34px; height: 34px; }',
    '.domein-tegels { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; padding-left: 6px; }',
    '.onderdeel { position: relative; }',
    '.stapnr { position: absolute; top: -10px; left: -10px; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: var(--d); color: #14122e; font-weight: 900; font-size: 1.05rem; box-shadow: 0 4px 10px rgba(0,0,0,.4); z-index: 1; }',
    '.onderdeel .niveau svg { width: 20px; height: 20px; }',
    '.niveaulaag { position: fixed; inset: 0; z-index: 30; background: rgba(8,8,20,.88); display: none; place-items: center; padding: 16px; }',
    '.niveaulaag.aan { display: grid; }',
    '.niveaudoos { width: min(100%, 420px); display: flex; flex-direction: column; align-items: center; gap: 14px; }',
    '.niveaubeeld { width: 110px; height: 110px; border-radius: 22px; overflow: hidden; border: 3px solid var(--d); }',
    '.niveaubeeld svg { width: 100%; height: 100%; display: block; }',
    '.niveaulijst { width: 100%; display: flex; flex-direction: column; gap: 10px; }',
    '.nivknop { display: flex; align-items: center; gap: 14px; padding: 10px 14px; border-radius: 20px; background: var(--kaart); border: 3px solid var(--rand); font-weight: 800; animation: in .3s both; text-align: left; }',
    '.nivknop:active { transform: scale(.97); }',
    '.nivknop.nu { border-color: var(--d); box-shadow: 0 0 20px color-mix(in srgb, var(--d) 40%, transparent); }',
    '.nivknop.dicht { opacity: .4; }',
    '.nivnr { flex: none; width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; background: var(--d); color: #14122e; font-size: 1.6rem; font-weight: 900; }',
    '.nivknop.dicht .nivnr { background: rgba(255,255,255,.15); color: #fff; }',
    '.nivvb { font-size: 1.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
    '.nivvb svg { width: 30px; height: 30px; vertical-align: middle; }',
    '.stip.weg { opacity: .25; position: relative; }',
    '.stip.weg::after { content: ""; position: absolute; left: -3px; right: -3px; top: 50%; height: 3px; background: #ef4444; transform: rotate(-35deg); }',
    '.stip.leeg { background: transparent; box-shadow: inset 0 0 0 3px rgba(255,255,255,.3); }',
    '.mab { display: flex; align-items: flex-end; gap: 6px; flex-wrap: wrap; justify-content: center; }',
    '.staaf { width: 20px; height: 200px; border-radius: 4px; background: repeating-linear-gradient(to bottom, #38bdf8 0 18px, #0369a1 18px 20px); box-shadow: inset 0 0 0 2px #0369a1; }',
    '.blokjes { display: grid; grid-template-columns: repeat(2, 20px); gap: 2px; align-content: end; }',
    '.blokje { width: 20px; height: 18px; border-radius: 3px; background: #f59e0b; box-shadow: inset 0 0 0 2px #b45309; }',
    '.lijnplaat { flex: none; width: min(92vw, 600px); }',
    '.grafplaat { flex: none; width: min(92vw, 400px); }',
    '.procentplaat { flex: none; width: min(92vw, 340px); }',
    '.vlakplaat { flex: none; }',
    '.geldrij { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-items: center; }',
    '.geldrij .munt { width: 56px; height: 56px; } .geldrij .biljet { width: 96px; height: 54px; }',
    '.som .breuk { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; font-size: .62em; line-height: 1; margin-right: .15em; }',
    '.som .breuk b { border-bottom: .09em solid currentColor; padding: 0 .1em; }',
    '.som .breuk i { font-style: normal; }',
    '.som .lang { font-size: .62em; }',
    '.som .hokje { display: inline-block; width: .7em; height: .7em; background: #fde047; border: .08em solid #b45309; vertical-align: middle; }',
    '.vtabel { margin: 0 auto; border-collapse: separate; border-spacing: 6px; font-size: .62em; }',
    '.vtabel th, .vtabel td { min-width: 1.6em; padding: .1em .3em; border-radius: 12px; background: var(--kaart); text-align: center; }',
    '.vtabel .icoon { width: 1.1em; height: 1.1em; vertical-align: middle; }',
    '.vtabel .vraag { color: #ef4444; }',
    '.som .eenheid { font-size: .7em; }',
    '.som .woordje { font-size: .62em; color: var(--reken); }',
    '.som .icoon { width: .9em; height: .9em; vertical-align: middle; }',
    '.kinderen { display: flex; gap: 4px; } .kinderen .icoon, .zakje .icoon { width: 44px; height: 44px; }',
    '.taart { flex: none; width: 160px; } .strook { flex: none; width: min(92vw, 360px); }',
    '.honderd { flex: none; width: min(70vw, 220px); }',
    '.klok-plaat { flex: none; width: min(60vw, 220px); }',
    '.nivster { margin-left: auto; } .nivster svg { width: 26px; height: 26px; }',
  ].join('\n')
  document.head.appendChild(css)
})()
