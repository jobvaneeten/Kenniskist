'use strict'
// Meer rekenen voor nieuwkomers, tot ongeveer 1F, verdeeld over de vier
// rekendomeinen (Getallen, Verhoudingen, Meten en meetkunde, Verbanden).
// Vult ONDERDELEN uit rekenen.js aan en tekent het keuzescherm met een kopje
// per domein. Elke oefening: maak(niveau) geeft { tekst, antwoord, hulp }.
// Antwoorden zijn altijd hele getallen: er is alleen een cijferblok.

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

// plaatje voor een tegel: lichte achtergrond met grote tekst
function tegelPlaat(bg, kleur, tekst, extra) {
  return '<svg viewBox="0 0 160 160"><rect width="160" height="160" fill="' + bg + '"/>' + (tekst ? '<text x="80" y="70" font-family="Arial" font-weight="900" font-size="42" text-anchor="middle" fill="' + kleur + '">' + tekst + '</text>' : '') + (extra || '') + '</svg>'
}
function wegStippen(a, b) {
  var h = '<span class="groepje" style="grid-template-columns:repeat(5,26px)">'
  for (var i = 0; i < a; i++) h += '<span class="stip' + (i >= a - b ? ' weg' : '') + '" style="background:' + KLEUR_A + '"></span>'
  return h + '</span>'
}
var APPEL = '<svg viewBox="0 0 40 40" class="icoon"><path d="M20 12c-9-5-16 2-15 11 1 10 8 15 15 12 7 3 14-2 15-12 1-9-6-16-15-11z" fill="#ef4444"/><path d="M20 12c0-4 2-7 5-8" stroke="#78350f" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M22 9c4-3 8-2 9 0-3 2-6 2-9 0z" fill="#22c55e"/></svg>'
var MUNT = '<svg viewBox="0 0 40 40" class="icoon"><circle cx="20" cy="20" r="16" fill="#fbbf24" stroke="#b45309" stroke-width="3"/><text x="20" y="27" font-family="Arial" font-weight="900" font-size="18" text-anchor="middle" fill="#92400e">€</text></svg>'

function geldStuk(w) {
  if (w <= 2) return '<svg viewBox="0 0 56 56" class="munt"><circle cx="28" cy="28" r="25" fill="' + (w === 2 ? '#fbbf24' : '#e5e7eb') + '" stroke="' + (w === 2 ? '#b45309' : '#9ca3af') + '" stroke-width="4"/><circle cx="28" cy="28" r="15" fill="' + (w === 2 ? '#e5e7eb' : '#fbbf24') + '"/><text x="28" y="35" font-family="Arial" font-weight="900" font-size="19" text-anchor="middle" fill="#1f2937">' + w + '</text></svg>'
  var kl = { 5: '#94a3b8', 10: '#f87171', 20: '#60a5fa', 50: '#fb923c' }[w]
  return '<svg viewBox="0 0 96 54" class="biljet"><rect x="2" y="2" width="92" height="50" rx="6" fill="' + kl + '" stroke="#1f2937" stroke-opacity=".25" stroke-width="3"/><circle cx="72" cy="27" r="14" fill="#fff" fill-opacity=".35"/><text x="30" y="36" font-family="Arial" font-weight="900" font-size="24" text-anchor="middle" fill="#fff">€' + w + '</text></svg>'
}

var NIEUW = [
  // ── Getallen ──
  { id: 'min', domein: 'getallen', plaat: tegelPlaat('#e0f2fe', '#0284c7', '9−4', '<g fill="#38bdf8"><circle cx="30" cy="115" r="11"/><circle cx="56" cy="115" r="11"/><circle cx="82" cy="115" r="11"/></g><g fill="#38bdf8" opacity=".3"><circle cx="108" cy="115" r="11"/><circle cx="134" cy="115" r="11"/></g>'),
    maak: function (n) {
      var a, b, hulp = ''
      if (n === 1) { a = rnd(2, 10); b = rnd(1, a - 1); hulp = wegStippen(a, b) }
      else if (n === 2) { a = rnd(11, 99); b = Math.random() < 0.5 ? rnd(1, Math.floor(a / 10)) * 10 : rnd(1, a - 1) }
      else { a = rnd(101, 999); b = rnd(11, a - 1) }
      return { tekst: a + ' − ' + b, antwoord: a - b, hulp: hulp }
    } },
  { id: 'getallenlijn', domein: 'getallen', plaat: tegelPlaat('#e0f2fe', '#0284c7', '', '<path d="M18 100h124" stroke="#0284c7" stroke-width="5"/><path d="M18 88v24M49 94v12M80 88v24M111 94v12M142 88v24" stroke="#0284c7" stroke-width="4"/><path d="M95 62l-10-14h20z" fill="#ef4444"/><text x="95" y="42" font-family="Arial" font-weight="900" font-size="30" text-anchor="middle" fill="#ef4444">?</text>'),
    maak: function (n) {
      var max = n === 1 ? 10 : n === 2 ? 100 : 1000, stap = max / 10
      var doel = n === 1 ? rnd(1, 9) : n === 2 ? rnd(1, 19) * 5 : rnd(1, 39) * 25
      var x = function (v) { return 30 + 460 * v / max }
      var s = '<svg class="lijnplaat" viewBox="0 0 520 120"><path d="M30 80h460" stroke="#e5e7eb" stroke-width="4"/>'
      for (var v = 0; v <= max; v += stap) {
        var groot = n === 1 || v % (max / 2) === 0
        s += '<path d="M' + x(v) + ' ' + (groot ? 66 : 72) + 'v' + (groot ? 28 : 16) + '" stroke="#e5e7eb" stroke-width="3"/>'
        if (groot) s += '<text x="' + x(v) + '" y="114" font-family="Arial" font-weight="800" font-size="18" text-anchor="middle" fill="#e5e7eb">' + v + '</text>'
      }
      s += '<path d="M' + x(doel) + ' 62l-11-18h22z" fill="#ef4444"/><text x="' + x(doel) + '" y="36" font-family="Arial" font-weight="900" font-size="28" text-anchor="middle" fill="#ef4444">?</text></svg>'
      return { tekst: '?', antwoord: doel, hulp: s }
    } },
  // ── Verhoudingen ──
  { id: 'breuk', domein: 'verhoudingen', plaat: tegelPlaat('#fce7f3', '#be185d', '', '<circle cx="80" cy="80" r="52" fill="#fff" stroke="#be185d" stroke-width="5"/><path d="M80 80V28a52 52 0 0 1 0 104z" fill="#f472b6"/><path d="M80 28v104" stroke="#be185d" stroke-width="5"/>'),
    maak: function (n) {
      var noemer = n === 1 ? 2 : n === 2 ? kiesUit([2, 4]) : kiesUit([3, 4, 5, 10]), deel = rnd(n === 3 ? 2 : 1, 10)
      return { tekst: '<span class="breuk"><b>1</b><i>' + noemer + '</i></span> van ' + (deel * noemer), antwoord: deel,
        hulp: n < 3 && deel * noemer <= 40 ? raster(noemer, deel, KLEUR_B) : '' }
    } },
  { id: 'procent', domein: 'verhoudingen', plaat: tegelPlaat('#fce7f3', '#be185d', '50%', '<rect x="20" y="100" width="120" height="26" rx="6" fill="#fff" stroke="#be185d" stroke-width="4"/><rect x="22" y="102" width="58" height="22" rx="4" fill="#f472b6"/>'),
    maak: function (n) {
      var p = n === 1 ? 50 : n === 2 ? kiesUit([50, 25, 10, 100]) : kiesUit([50, 25, 75, 10, 20, 5])
      var deler = { 100: 1, 50: 2, 25: 4, 75: 4, 10: 10, 20: 5, 5: 20 }[p], max = n === 1 ? 100 : 200
      var basis = deler * rnd(1, Math.floor(max / deler)); if (n === 1 && basis > 20) basis = Math.round(basis / 10) * 10 || 10
      var balk = '<svg class="procentplaat" viewBox="0 0 320 40"><rect x="2" y="2" width="316" height="36" rx="8" fill="#fff"/><rect x="4" y="4" width="' + (3.12 * p) + '" height="32" rx="6" fill="' + KLEUR_B + '"/>'
      for (var i = 1; i < 10; i++) balk += '<path d="M' + (4 + 31.2 * i) + ' 4v32" stroke="#1f2937" stroke-opacity=".2" stroke-width="2"/>'
      return { tekst: p + '% van ' + basis, antwoord: basis * p / 100, hulp: balk + '</svg>' }
    } },
  { id: 'verhouding', domein: 'verhoudingen', plaat: tegelPlaat('#fce7f3', '#be185d', '', '<g transform="translate(20 30) scale(1.2)">' + APPEL.replace('class="icoon"', 'width="40" height="40"') + '</g><text x="110" y="72" font-family="Arial" font-weight="900" font-size="38" text-anchor="middle" fill="#be185d">1</text><g transform="translate(20 92) scale(1.2)">' + MUNT.replace('class="icoon"', 'width="40" height="40"') + '</g><text x="110" y="134" font-family="Arial" font-weight="900" font-size="38" text-anchor="middle" fill="#be185d">3</text>'),
    maak: function (n) {
      var a = n === 3 ? rnd(2, 5) : 1, u = n === 1 ? rnd(2, 5) : rnd(2, 10), c
      do { c = n === 1 ? rnd(2, 5) : rnd(2, 10) } while (c === a)
      return { tekst: '<table class="vtabel"><tr><th>' + APPEL + '</th><td>' + a + '</td><td>' + c + '</td></tr><tr><th>' + MUNT + '</th><td>' + (a * u) + '</td><td class="vraag">?</td></tr></table>', antwoord: c * u, hulp: '' }
    } },
  // ── Meten en meetkunde ──
  { id: 'geld', domein: 'meten', plaat: tegelPlaat('#fef9c3', '#b45309', '', '<g transform="translate(14 30)">' + geldStuk(10).replace('class="biljet"', 'width="100" height="56"') + '</g><g transform="translate(40 92)">' + geldStuk(2).replace('class="munt"', 'width="50" height="50"') + '</g><g transform="translate(94 92)">' + geldStuk(1).replace('class="munt"', 'width="50" height="50"') + '</g>'),
    maak: function (n) {
      var soorten = n === 1 ? [1, 2] : n === 2 ? [1, 2, 5, 10] : [1, 2, 5, 10, 20, 50], max = n === 1 ? 10 : n === 2 ? 50 : 200
      var stukken = [], som = 0, aantal = rnd(n === 3 ? 3 : 2, n === 1 ? 5 : 6)
      while (stukken.length < aantal) { var w = kiesUit(soorten); if (som + w > max) break; stukken.push(w); som += w }
      if (stukken.length < 2) { stukken = [2, 1]; som = 3 }
      stukken.sort(function (x, y) { return y - x })
      return { tekst: '€ ?', antwoord: som, hulp: '<span class="geldrij">' + stukken.map(geldStuk).join('') + '</span>' }
    } },
  { id: 'tijd', domein: 'meten', plaat: tegelPlaat('#fef9c3', '#b45309', '', '<circle cx="80" cy="80" r="56" fill="#fff" stroke="#b45309" stroke-width="6"/><path d="M80 80V42M80 80l26 14" stroke="#1f2937" stroke-width="7" stroke-linecap="round"/><circle cx="80" cy="80" r="6" fill="#1f2937"/>'),
    maak: function (n) {
      // [eenheid, meervoud, kleinere eenheid, hoeveel]
      var F = [['uur', 'uur', 'minuten', 60], ['dag', 'dagen', 'uur', 24], ['week', 'weken', 'dagen', 7], ['jaar', 'jaar', 'maanden', 12], ['minuut', 'minuten', 'seconden', 60]]
      var f = kiesUit(n === 1 ? F.slice(0, 4) : F), k = n === 1 ? 1 : rnd(2, n === 2 ? 5 : 10)
      var e = function (t) { return '<span class="eenheid">' + t + '</span>' }
      if (n === 3 && Math.random() < 0.5) return { tekst: (k * f[3]) + ' ' + e(f[2]) + ' = ? ' + e(f[1]), antwoord: k, hulp: '' }
      return { tekst: k + ' ' + e(k === 1 ? f[0] : f[1]) + ' = ? ' + e(f[2]), antwoord: k * f[3], hulp: '' }
    } },
  { id: 'oppervlakte', domein: 'meten', plaat: tegelPlaat('#fef9c3', '#b45309', '', (function () { var s = ''; for (var r = 0; r < 3; r++) for (var k = 0; k < 4; k++) s += '<rect x="' + (24 + k * 28) + '" y="' + (38 + r * 28) + '" width="28" height="28" fill="#fde047" stroke="#b45309" stroke-width="3"/>'; return s })()),
    maak: function (n) {
      var b = n === 1 ? rnd(2, 4) : n === 2 ? rnd(3, 8) : rnd(3, 12), h = n === 1 ? rnd(1, 3) : n === 2 ? rnd(2, 6) : rnd(2, 9)
      var cel = Math.min(36, Math.floor(300 / b), Math.floor(200 / h)), w = b * cel, hh = h * cel
      var s = '<svg class="vlakplaat" viewBox="-40 -10 ' + (w + 110) + ' ' + (hh + 50) + '" style="width:min(92vw,' + (w + 110) * 1.3 + 'px)">'
      if (n < 3) {
        for (var r = 0; r < h; r++) for (var k = 0; k < b; k++) s += '<rect x="' + (k * cel) + '" y="' + (r * cel) + '" width="' + cel + '" height="' + cel + '" fill="#fde047" stroke="#b45309" stroke-width="2"/>'
        return { tekst: '? <span class="hokje"></span>', antwoord: b * h, hulp: s + '</svg>' }
      }
      s += '<rect x="0" y="0" width="' + w + '" height="' + hh + '" fill="#fde047" stroke="#b45309" stroke-width="3"/>' +
        '<text x="' + (w / 2) + '" y="' + (hh + 30) + '" font-family="Arial" font-weight="900" font-size="22" text-anchor="middle" fill="#e5e7eb">' + b + ' m</text>' +
        '<text x="' + (w + 10) + '" y="' + (hh / 2 + 8) + '" font-family="Arial" font-weight="900" font-size="22" fill="#e5e7eb">' + h + ' m</text>'
      return { tekst: '? <span class="eenheid">m²</span>', antwoord: b * h, hulp: s + '</svg>' }
    } },
  // ── Verbanden ──
  { id: 'patroon', domein: 'verbanden', plaat: tegelPlaat('#d1fae5', '#047857', '', '<text x="80" y="92" font-family="Arial" font-weight="900" font-size="32" text-anchor="middle" fill="#047857">2 4 6 ?</text>'),
    maak: function (n) {
      var stap = kiesUit(n === 1 ? [1, 2] : n === 2 ? [5, 10, 3, -1, -2] : [25, 50, 100, -5, -10, 'x2'])
      var t = []
      if (stap === 'x2') { t = [rnd(1, 5)]; while (t.length < 5) t.push(t[t.length - 1] * 2) }
      else {
        // aflopend: nooit onder nul; grote sprongen beginnen op een rond getal
        var start = stap < 0 ? rnd(-stap * 4, 100) : stap >= 25 ? stap * rnd(0, 6) : rnd(0, n === 1 ? 10 : 50)
        for (var i = 0; i < 5; i++) t.push(start + i * stap)
      }
      return { tekst: '<span class="lang">' + t.slice(0, 4).join(', ') + ', ?</span>', antwoord: t[4], hulp: '' }
    } },
  { id: 'grafiek', domein: 'verbanden', plaat: tegelPlaat('#d1fae5', '#047857', '', '<path d="M24 132h116M24 132V24" stroke="#047857" stroke-width="5"/><rect x="38" y="84" width="22" height="48" fill="#38bdf8"/><rect x="70" y="50" width="22" height="82" fill="#f472b6"/><rect x="102" y="70" width="22" height="62" fill="#fbbf24"/><text x="81" y="40" font-family="Arial" font-weight="900" font-size="26" text-anchor="middle" fill="#ef4444">?</text>'),
    maak: function (n) {
      var max = n === 1 ? 5 : n === 2 ? 20 : 50, lijn = n === 1 ? 1 : n === 2 ? 2 : 10, eenheid = n === 3 ? 5 : lijn
      var kleuren = ['#38bdf8', '#f472b6', '#fbbf24', '#34d399'], aantal = n === 1 ? 3 : 4
      var waarden = []; for (var i = 0; i < aantal; i++) waarden.push(eenheid * rnd(1, max / eenheid))
      var doel = rnd(0, aantal - 1), H = 200, B = 260, y = function (v) { return 10 + H - H * v / max }
      var s = '<svg class="grafplaat" viewBox="0 0 320 240">'
      for (var v = 0; v <= max; v += lijn) {
        s += '<path d="M44 ' + y(v) + 'h' + B + '" stroke="#e5e7eb" stroke-opacity="' + (v ? .25 : 1) + '" stroke-width="' + (v ? 1.5 : 3) + '"/>'
        if (n === 1 || v % (lijn * (n === 2 ? 2 : 1)) === 0) s += '<text x="34" y="' + (y(v) + 6) + '" font-family="Arial" font-weight="800" font-size="16" text-anchor="end" fill="#e5e7eb">' + v + '</text>'
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

// bestaande oefeningen in hun domein, nieuwe erbij (voortgang blijft in D.reken[id])
var BESTAAND_DOMEIN = { plus10: 'getallen', plus1000: 'getallen', keer: 'getallen', delen: 'getallen', maten: 'meten' }
ONDERDELEN.forEach(function (o) { o.domein = BESTAAND_DOMEIN[o.id] })
NIEUW.forEach(function (o) { ONDERDELEN.push(o) })
var VOLGORDE = ['plus10', 'plus1000', 'min', 'keer', 'delen', 'getallenlijn', 'breuk', 'procent', 'verhouding', 'maten', 'geld', 'tijd', 'oppervlakte', 'patroon', 'grafiek']
ONDERDELEN.sort(function (a, b) { return VOLGORDE.indexOf(a.id) - VOLGORDE.indexOf(b.id) })
ONDERDELEN.forEach(function (o) { o.kleur = DOMEINEN.filter(function (d) { return d.id === o.domein })[0].kleur })

// keuzescherm: een kopje per domein, de tegels eronder
tekenOnderdelen = function () {
  var l = $('onderdelen'); l.innerHTML = ''; l.className = 'onderdelen domeinen'
  var n = 0
  DOMEINEN.forEach(function (d) {
    var sec = document.createElement('section'); sec.className = 'domein'; sec.style.setProperty('--d', d.kleur)
    sec.innerHTML = '<h2 class="domein-kop"><span class="domein-icoon">' + d.icoon + '</span>' + d.naam + '</h2><div class="domein-tegels"></div>'
    var rij = sec.querySelector('.domein-tegels')
    ONDERDELEN.filter(function (o) { return o.domein === d.id }).forEach(function (o) {
      var st = standVan(o.id), b = document.createElement('button')
      b.className = 'onderdeel'; b.style.borderColor = o.kleur; b.style.animationDelay = (n++ * 0.03) + 's'; b.setAttribute('aria-label', o.id)
      var sterren = ''; for (var s = 1; s <= MAX_NIVEAU; s++) sterren += s <= st.niveau ? STER : STER_LEEG
      b.innerHTML = '<span class="beeld">' + o.plaat + '</span><span class="niveau">' + sterren + '</span>'
      b.onclick = function () { geluidKlik(); startSommen(o) }
      rij.appendChild(b)
    })
    l.appendChild(sec)
  })
}

;(function () {
  var css = document.createElement('style')
  css.textContent = [
    '.onderdelen.domeinen { display: flex; flex-direction: column; gap: 22px; align-content: initial; padding-bottom: 20px; }',
    '.domein-kop { margin: 0 0 10px; display: flex; align-items: center; gap: 10px; font-size: 1.5rem; font-weight: 800; color: var(--d); }',
    '.domein-icoon { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: color-mix(in srgb, var(--d) 18%, transparent); }',
    '.domein-icoon svg { width: 34px; height: 34px; }',
    '.domein-tegels { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px; }',
    '.stip.weg { opacity: .25; position: relative; }',
    '.stip.weg::after { content: ""; position: absolute; left: -3px; right: -3px; top: 50%; height: 3px; background: #ef4444; transform: rotate(-35deg); }',
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
  ].join('\n')
  document.head.appendChild(css)
})()
