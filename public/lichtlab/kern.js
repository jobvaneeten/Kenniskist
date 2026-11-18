// ═══════════════════════════════════════════════════════════════════════════
//  LICHTLAB: kern. Spelregels, stralen volgen en de levelmaker. Geen DOM:
//  gedeeld door spel.js en tools/lichtlabTest.js.
//
//  Lampen aan de rand schieten een gekleurde straal het veld in. Tik op een
//  spiegel en hij draait een kwartslag (/ of \). Zorg dat elk kristal geraakt
//  wordt door een straal van zijn eigen kleur. Stralen gaan door elkaar heen.
//
//  Level: { w, h, muren: [i], lampen: [{ i, r, k }], doelen: [{ i, k }],
//           spiegels: [{ i, s, vast }], oplossing: [s per spiegel], min }
//  r: richting 0 boven, 1 rechts, 2 onder, 3 links. s: 0 = /, 1 = \. k: kleur 0..2
// ═══════════════════════════════════════════════════════════════════════════
var LL = (function () {
  var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]

  function kaatst(r, s) { return s === 0 ? r ^ 1 : 3 - r }

  // index per vakje: wat staat er?
  function kaart(lv) {
    var m = {}
    lv.muren.forEach(function (i) { m[i] = { t: 'muur' } })
    lv.lampen.forEach(function (l, n) { m[l.i] = { t: 'lamp', n: n } })
    lv.doelen.forEach(function (d, n) { m[d.i] = { t: 'doel', n: n } })
    lv.spiegels.forEach(function (s, n) { m[s.i] = { t: 'spiegel', n: n } })
    return m
  }

  // Volg alle stralen. standen: stand per spiegel. Terug:
  // { stralen: [{ k, punten: [i...], eind: i, raak: [{ i, r }] }], geraakt: [kleuren per doel], klaar }
  function volg(lv, standen, m) {
    m = m || kaart(lv)
    var stralen = [], geraakt = lv.doelen.map(function () { return {} })
    lv.lampen.forEach(function (l) {
      var pos = l.i, r = l.r, punten = [pos], gezien = {}, raak = []
      for (var stap = 0; stap < 500; stap++) {
        var x = pos % lv.w + DX[r], y = (pos / lv.w | 0) + DY[r]
        if (x < 0 || y < 0 || x >= lv.w || y >= lv.h) { punten.push(pos); raak.push({ i: pos, r: r, rand: true }); break }
        var nx = y * lv.w + x, v = m[nx]
        pos = nx
        if (v && (v.t === 'muur' || v.t === 'lamp')) { punten.push(nx); raak.push({ i: nx, r: r, muur: true }); break }
        if (v && v.t === 'doel') { punten.push(nx); geraakt[v.n][l.k] = true; raak.push({ i: nx, r: r, doel: v.n }); break }
        if (v && v.t === 'spiegel') {
          var sleutel = nx * 4 + r
          if (gezien[sleutel]) { punten.push(nx); break }
          gezien[sleutel] = 1
          punten.push(nx); r = kaatst(r, standen[v.n]); raak.push({ i: nx, r: r, spiegel: v.n })
        }
      }
      stralen.push({ k: l.k, punten: punten })
    })
    var klaar = lv.doelen.every(function (d, n) { return geraakt[n][d.k] })
    return { stralen: stralen, geraakt: geraakt, klaar: klaar }
  }

  function sterren(tikken, min) {
    if (tikken <= min) return 3
    if (tikken <= min * 2 + 2) return 2
    return 1
  }

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

  // Instellingen per level: groter, meer lampen, meer spiegels.
  function instellingen(n) {
    return {
      w: 6 + Math.min(3, Math.floor(n / 7)) + 2,
      h: 7 + Math.min(3, Math.floor(n / 6)) + 2,
      lampen: n < 3 ? 1 : n < 12 ? 2 : 3,
      bochten: 2 + Math.min(3, Math.floor(n / 5)),
      nep: Math.min(9, 1 + Math.floor(n / 2)),
      muren: Math.min(6, Math.floor(n / 3)),
      vast: n < 6 ? 0.4 : n < 15 ? 0.2 : 0.1,
    }
  }

  // De levelmaker bouwt eerst de oplossing (straal voor straal, met bochten)
  // en draait daarna spiegels door elkaar. Daardoor is elk level op te lossen.
  function maak(n) {
    var R = rng(n * 9973 + 7), o = instellingen(n)
    for (var poging = 0; poging < 400; poging++) {
      var lv = probeer(R, o)
      if (lv) return lv
    }
    return null
  }
  function probeer(R, o) {
    var w = o.w, h = o.h, bezet = {}, pad = {}, lv = { w: w, h: h, muren: [], lampen: [], doelen: [], spiegels: [] }
    var binnen = function (x, y) { return x > 0 && y > 0 && x < w - 1 && y < h - 1 }
    for (var x = 0; x < w; x++) for (var y = 0; y < h; y++) if (!binnen(x, y)) bezet[y * w + x] = 'rand'
    for (var k = 0; k < o.lampen; k++) {
      // lamp op de rand (geen hoek), kijkt naar binnen
      var lamp = null
      for (var t = 0; t < 40 && !lamp; t++) {
        var kant = R() * 4 | 0, lx, ly, r
        if (kant === 0) { lx = 1 + (R() * (w - 2) | 0); ly = 0; r = 2 }
        else if (kant === 1) { lx = w - 1; ly = 1 + (R() * (h - 2) | 0); r = 3 }
        else if (kant === 2) { lx = 1 + (R() * (w - 2) | 0); ly = h - 1; r = 0 }
        else { lx = 0; ly = 1 + (R() * (h - 2) | 0); r = 1 }
        var li = ly * w + lx, voor = (ly + DY[r]) * w + lx + DX[r]
        if (bezet[li] === 'rand' && !lv.lampen.some(function (q) { return q.i === li }) && !bezet[voor]) lamp = { i: li, r: r, k: k }
      }
      if (!lamp) return null
      lv.lampen.push(lamp)
      var pos = lamp.i, r2 = lamp.r
      for (var b = 0; b <= o.bochten; b++) {
        var stappen = 1 + (R() * 4 | 0), laatste = b === o.bochten, gelukt = false
        // probeer een paar lengtes: vooruit tot een vrij vakje voor een spiegel (of het doel)
        for (var p = 0; p < 6 && !gelukt; p++) {
          var cx = pos % w, cy = pos / w | 0, okPad = true, cel = -1
          for (var st = 1; st <= stappen; st++) {
            cx += DX[r2]; cy += DY[r2]
            if (!binnen(cx, cy)) { okPad = false; break }
            cel = cy * w + cx
            if (bezet[cel]) { okPad = false; break }            // spiegel/doel van een andere straal
          }
          if (okPad && cel >= 0 && !pad[cel]) {
            // tussenliggende vakjes worden pad (stralen mogen elkaar kruisen)
            var tx = pos % w, ty = pos / w | 0
            for (var s2 = 1; s2 < stappen; s2++) { tx += DX[r2]; ty += DY[r2]; pad[ty * w + tx] = 1 }
            if (laatste) {
              bezet[cel] = 'doel'; lv.doelen.push({ i: cel, k: k })
            } else {
              var nr = R() < 0.5 ? (r2 + 1) % 4 : (r2 + 3) % 4
              var stand = kaatst(r2, 0) === nr ? 0 : 1
              bezet[cel] = 'spiegel'; lv.spiegels.push({ i: cel, s: stand, vast: false, eigen: k })
              r2 = nr
            }
            pos = cel; gelukt = true
          } else stappen = 1 + (R() * 4 | 0)
        }
        if (!gelukt) return null
      }
    }
    // losse muren en nep-spiegels buiten de stralen
    var vrij = []
    for (var yy = 1; yy < h - 1; yy++) for (var xx = 1; xx < w - 1; xx++) { var i = yy * w + xx; if (!bezet[i] && !pad[i]) vrij.push(i) }
    var schud = function (a) { for (var q = a.length - 1; q > 0; q--) { var j = R() * (q + 1) | 0, tmp = a[q]; a[q] = a[j]; a[j] = tmp } return a }
    schud(vrij)
    for (var mm = 0; mm < o.muren && vrij.length; mm++) { var mi = vrij.pop(); lv.muren.push(mi); bezet[mi] = 'muur' }
    for (var nn = 0; nn < o.nep && vrij.length; nn++) { var ni = vrij.pop(); lv.spiegels.push({ i: ni, s: R() < 0.5 ? 0 : 1, vast: false, nep: true }); bezet[ni] = 'spiegel' }
    // controle met de oplossing
    lv.oplossing = lv.spiegels.map(function (s) { return s.s })
    var m = kaart(lv)
    if (!volg(lv, lv.oplossing, m).klaar) return null
    // een deel van de goede spiegels zit vast (helpt bij het begin)
    lv.spiegels.forEach(function (s) { if (!s.nep && R() < o.vast) s.vast = true })
    // door elkaar draaien: minstens de helft van de losse goede spiegels verkeerd
    var los = lv.spiegels.filter(function (s) { return !s.vast })
    for (var z = 0; z < 30; z++) {
      lv.spiegels.forEach(function (s, n) { s.s = s.vast ? lv.oplossing[n] : (R() < 0.6 ? 1 - lv.oplossing[n] : lv.oplossing[n]) })
      var fout = lv.spiegels.filter(function (s, n) { return !s.nep && s.s !== lv.oplossing[n] }).length
      var goed = lv.spiegels.filter(function (s) { return !s.nep && !s.vast }).length
      if (fout >= Math.max(1, Math.ceil(goed / 2)) && !volg(lv, lv.spiegels.map(function (s) { return s.s }), m).klaar) {
        lv.min = fout
        lv.spiegels.forEach(function (s) { delete s.eigen })
        return los.length ? lv : null
      }
    }
    return null
  }

  return { maak: maak, volg: volg, kaart: kaart, kaatst: kaatst, sterren: sterren, instellingen: instellingen, rng: rng, DX: DX, DY: DY }
})()
