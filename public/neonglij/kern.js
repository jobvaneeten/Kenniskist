// ═══════════════════════════════════════════════════════════════════════════
//  NEONGLIJ — kern: spelregels, oplosser en levelmaker. Geen DOM: gedeeld door
//  spel.js, tools/neonglijLevels.mjs (levels maken) en tools/neonglijTest.js.
//
//  Je bolletje glijdt over ijs tot het ergens tegenaan botst. Pak alle
//  kristallen; daarna zuigt de uitgang je naar binnen als je eroverheen glijdt.
//
//  Vakjes (één teken per vakje):
//   #  muur            .  ijs              S  start (wordt ijs)
//   *  kristal         E  uitgang          O  gat (erin = gevallen)
//   B  duwblok: glijdt weg tot hij botst, vult een gat (dan wordt het ijs)
//   x  breekijs: wordt een gat zodra je eraf gaat
//   > < ^ v  pijl: je gaat die kant op
//   k  knop: elke keer dat je erover gaat, wisselen alle poorten
//   G  poort, dicht bij de start     g  poort, open bij de start
//   p q r  portalen (paren): je komt bij de andere uit en glijdt door
//
//  zet(s, richting) geeft een nieuwe toestand plus een lijst gebeurtenissen;
//  het scherm speelt die af, de toestand is de enige waarheid.
// ═══════════════════════════════════════════════════════════════════════════
var NG = (function () {
  var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]
  var PIJL = { '^': 0, '>': 1, 'v': 2, '<': 3 }
  var PORTAAL = 'pqr'

  function laad(rijen) {
    var h = rijen.length, w = 0
    for (var i = 0; i < h; i++) w = Math.max(w, rijen[i].length)
    var c = [], bal = 0, kr = 0
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var t = rijen[y][x] || '#'
        if (t === 'S') { bal = y * w + x; t = '.' }
        if (t === '*') kr++
        c.push(t)
      }
    }
    return { w: w, h: h, c: c, bal: bal, flip: false, kristallen: kr, totaal: kr, zetten: 0, klaar: false }
  }
  function kopie(s) {
    return { w: s.w, h: s.h, c: s.c.slice(), bal: s.bal, flip: s.flip, kristallen: s.kristallen, totaal: s.totaal, zetten: s.zetten, klaar: s.klaar }
  }
  function buur(s, i, r) {
    var x = i % s.w + DX[r], y = (i / s.w | 0) + DY[r]
    return x < 0 || y < 0 || x >= s.w || y >= s.h ? -1 : y * s.w + x
  }
  function dicht(s, t) { return t === '#' || (t === 'G' && !s.flip) || (t === 'g' && s.flip) }
  function partner(s, i) {
    var t = s.c[i]
    for (var j = 0; j < s.c.length; j++) if (j !== i && s.c[j] === t) return j
    return i
  }

  // Eén zet. Terug: { s, ev, pad, gevolg } met gevolg 'ok' | 'win' | 'val' |
  // 'niks' (er gebeurt niets) | 'lus' (je zou eeuwig rondglijden: telt niet).
  // pad: [{ i, a }] plekken van het bolletje met afgelegde vakjes a (sprong:
  // portaal). Elke gebeurtenis heeft ook a, zodat het scherm ze op tijd toont.
  function zet(s0, r) {
    var s = kopie(s0), ev = [], pos = s.bal, a = 0
    var pad = [{ i: pos, a: 0 }], gezien = {}, bewogen = false, veranderd = false, gevolg = 'ok'
    for (var stap = 0; stap < 4000; stap++) {
      var sleutel = pos * 8 + r * 2 + (s.flip ? 1 : 0) + '|' + s.kristallen
      if (gezien[sleutel]) return { s: s0, ev: [], pad: [], gevolg: 'lus' }
      gezien[sleutel] = 1
      var nx = buur(s, pos, r), t = nx < 0 ? '#' : s.c[nx]
      if (dicht(s, t)) { if (bewogen) ev.push({ t: 'bots', i: pos, r: r, a: a }); break }
      if (t === 'B') {
        // duwen: het blok glijdt tot het botst; over ijs, en een gat vult hij
        var b = nx, gevuld = false
        for (;;) {
          var nb = buur(s, b, r), tb = nb < 0 ? '#' : s.c[nb]
          if (tb === '.') { b = nb; continue }
          if (tb === 'O') { b = nb; gevuld = true }
          break
        }
        if (b !== nx) {
          s.c[nx] = '.'; s.c[b] = gevuld ? '.' : 'B'; veranderd = true
          ev.push({ t: 'duw', van: nx, naar: b, gevuld: gevuld, r: r, a: a })
        } else ev.push({ t: 'bots', i: pos, r: r, a: a, blok: true })
        break
      }
      // het bolletje gaat een vakje verder
      if (s.c[pos] === 'x') { s.c[pos] = 'O'; ev.push({ t: 'kraak', i: pos, a: a + 0.5 }) }
      pos = nx; a++; bewogen = true; pad.push({ i: pos, a: a })
      t = s.c[pos]
      if (t === 'O') { ev.push({ t: 'val', i: pos, a: a }); gevolg = 'val'; break }
      if (t === '*') { s.c[pos] = '.'; s.kristallen--; ev.push({ t: 'kristal', i: pos, a: a, over: s.kristallen }) }
      else if (t === 'E' && s.kristallen === 0) { s.klaar = true; ev.push({ t: 'win', i: pos, a: a }); gevolg = 'win'; break }
      else if (t === 'k') { s.flip = !s.flip; ev.push({ t: 'knop', i: pos, a: a, flip: s.flip }) }
      else if (PIJL[t] != null) { if (PIJL[t] !== r) ev.push({ t: 'pijl', i: pos, a: a, r: PIJL[t] }); r = PIJL[t] }
      else if (PORTAAL.indexOf(t) >= 0) {
        var p = partner(s, pos)
        ev.push({ t: 'portaal', van: pos, naar: p, a: a })
        pos = p; pad.push({ i: pos, a: a, sprong: true })
      }
    }
    if (!bewogen && !veranderd) return { s: s0, ev: [], pad: [], gevolg: 'niks' }
    s.bal = pos; s.zetten++
    return { s: s, ev: ev, pad: pad, gevolg: gevolg }
  }

  function sleutel(s) { return s.c.join('') + s.bal + (s.flip ? 'f' : '') }

  // Breedte-eerst zoeken: het kleinste aantal zetten. Terug { min, zetten,
  // bekeken } of { min: -1 } als het niet kan (binnen max toestanden).
  function los(s0, max) {
    max = max || 250000
    var start = kopie(s0); start.zetten = 0
    var rij = [start], van = [-1], richting = [-1], gezien = {}
    gezien[sleutel(start)] = 1
    for (var k = 0; k < rij.length; k++) {
      for (var r = 0; r < 4; r++) {
        var u = zet(rij[k], r)
        if (u.gevolg === 'niks' || u.gevolg === 'lus' || u.gevolg === 'val') continue
        if (u.gevolg === 'win') {
          var z = [r], j = k
          while (van[j] >= 0) { z.unshift(richting[j]); j = van[j] }
          return { min: z.length, zetten: z, bekeken: rij.length }
        }
        var h = sleutel(u.s)
        if (gezien[h]) continue
        gezien[h] = 1
        rij.push(u.s); van.push(k); richting.push(r)
        if (rij.length > max) return { min: -1, bekeken: rij.length, teVeel: true }
      }
    }
    return { min: -1, bekeken: rij.length }
  }

  // Welke soorten gebeurtenissen de snelste oplossing gebruikt.
  function gebruikt(rijen, zetten) {
    var s = laad(rijen), soorten = {}
    for (var i = 0; i < zetten.length; i++) {
      var u = zet(s, zetten[i])
      u.ev.forEach(function (e) { soorten[e.t] = (soorten[e.t] || 0) + 1 })
      s = u.s
    }
    return soorten
  }

  // Sterren: 3 als je het in het minste aantal zetten doet.
  function sterren(zetten, min) {
    if (zetten <= min) return 3
    if (zetten <= min + Math.max(2, Math.ceil(min * 0.5))) return 2
    return 1
  }

  // ── levelmaker ─────────────────────────────────────────────────────────────
  function rng(zaad) {
    var a = zaad >>> 0
    return function () {
      a = (a + 0x6D2B79F5) >>> 0
      var t = a
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  // o: { w, h (binnenmaat), muren (0..1), kristallen, blokken, gaten, pijlen,
  //      breek, portalen (paren), poorten (aantal, met één knop), min, max,
  //      nodig: ['duw', ...] gebeurtenissen die de oplossing moet gebruiken }
  function maakEen(R, o) {
    var w = o.w + 2, h = o.h + 2, c = []
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) c.push(x === 0 || y === 0 || x === w - 1 || y === h - 1 ? '#' : '.')
    function vrij() {
      for (var n = 0; n < 200; n++) {
        var i = (1 + (R() * o.w | 0)) + (1 + (R() * o.h | 0)) * w
        if (c[i] === '.') return i
      }
      return -1
    }
    function zetNeer(t, n) { for (var k = 0; k < n; k++) { var i = vrij(); if (i < 0) return false; c[i] = t } return true }
    // muren: losse blokjes en korte stukjes
    var aantal = Math.round(o.w * o.h * (o.muren || 0.14))
    for (var m = 0; m < aantal; m++) {
      var i0 = vrij(); if (i0 < 0) break
      c[i0] = '#'
      if (R() < 0.3) { var r0 = R() * 4 | 0, j = i0 + (r0 === 0 ? -w : r0 === 1 ? 1 : r0 === 2 ? w : -1); if (c[j] === '.') c[j] = '#' }
    }
    if (!zetNeer('S', 1) || !zetNeer('E', 1) || !zetNeer('*', o.kristallen || 1)) return null
    if (!zetNeer('B', o.blokken || 0) || !zetNeer('O', o.gaten || 0) || !zetNeer('x', o.breek || 0)) return null
    for (var p = 0; p < (o.pijlen || 0); p++) if (!zetNeer('^>v<'[R() * 4 | 0], 1)) return null
    for (var q = 0; q < (o.portalen || 0); q++) if (!zetNeer(PORTAAL[q], 2)) return null
    if (o.poorten) {
      if (!zetNeer('k', 1)) return null
      for (var g = 0; g < o.poorten; g++) if (!zetNeer(R() < 0.6 ? 'G' : 'g', 1)) return null
    }
    var rijen = []
    for (var yy = 0; yy < h; yy++) rijen.push(c.slice(yy * w, yy * w + w).join(''))
    return rijen
  }

  function maak(zaad, o, pogingen) {
    var R = rng(zaad), beste = null
    for (var n = 0; n < (pogingen || 400); n++) {
      var rijen = maakEen(R, o)
      if (!rijen) continue
      var l = los(laad(rijen), o.zoek || 60000)
      if (l.min < (o.min || 1) || l.min > (o.max || 99)) continue
      if (o.nodig && o.nodig.length) {
        var soorten = gebruikt(rijen, l.zetten), ok = true
        for (var k = 0; k < o.nodig.length; k++) if (!soorten[o.nodig[k]]) ok = false
        if (!ok) continue
      }
      var lv = { rijen: rijen, min: l.min, bekeken: l.bekeken, zetten: l.zetten }
      if (!beste || lv.min > beste.min || (lv.min === beste.min && lv.bekeken > beste.bekeken)) beste = lv
      if (o.eerste) break
    }
    return beste
  }

  // Uitdaging van vandaag: iedereen krijgt op dezelfde dag hetzelfde level
  // (zaad = datum als getal, bijvoorbeeld 20261118).
  var DAGSOORTEN = [
    { naam: 'Duwdag', o: { blokken: 2, gaten: 2, nodig: ['duw'] } },
    { naam: 'Breekdag', o: { pijlen: 3, breek: 4, nodig: ['pijl'] } },
    { naam: 'Portaaldag', o: { portalen: 2, pijlen: 1, nodig: ['portaal'] } },
    { naam: 'Schakeldag', o: { poorten: 4, blokken: 1, nodig: ['knop'] } },
    { naam: 'Alles door elkaar', o: { blokken: 1, pijlen: 2, portalen: 1, poorten: 3, breek: 2 } },
  ]
  function dagLevel(dag) {
    var soort = DAGSOORTEN[dag % DAGSOORTEN.length]
    var o = { w: 8, h: 8, muren: 0.13, kristallen: 3, min: 9, max: 14, zoek: 40000 }
    for (var k in soort.o) o[k] = soort.o[k]
    var l = maak(dag, o, 40)
    if (!l) { o.min = 6; l = maak(dag + 1, o, 60) }
    return l ? { r: l.rijen, min: l.min, naam: soort.naam } : null
  }

  return { dagLevel: dagLevel, laad: laad, kopie: kopie, zet: zet, los: los, sleutel: sleutel, gebruikt: gebruikt, sterren: sterren, maak: maak, rng: rng, DX: DX, DY: DY, PIJL: PIJL, PORTAAL: PORTAAL, dicht: dicht }
})()
