// ═══════════════════════════════════════════════════════════════════════════
//  KOMEETSTAART: kern. Spelregels per tik, zonder DOM: gedeeld door spel.js
//  en tools/komeetstaartTest.js.
//
//  Je komeet glijdt over een rooster en wordt langer van sterrenstof. Botst hij
//  op zijn eigen staart of een planetoïde, dan is het afgelopen. Aan de randen
//  kom je aan de andere kant weer binnen. Krachten: traag (alles langzamer),
//  spook (door je staart heen), magneet (stof in de buurt komt naar je toe) en
//  een gouden ster (5 punten en je staart wordt korter).
//  De toestand is gewone data (ook de dobbelsteen): bewaren en verder spelen kan altijd.
// ═══════════════════════════════════════════════════════════════════════════
var KS = (function () {
  var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]
  var KRACHTEN = ['traag', 'spook', 'magneet', 'goud']
  var DUUR = { traag: 6, spook: 5, magneet: 7 }

  // dobbelsteen met de stand in de toestand zelf
  function dobbel(s) {
    s.zaad = (s.zaad + 0x6D2B79F5) >>> 0
    var t = s.zaad
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  function nieuw(w, h, zaad) {
    var mx = w >> 1, my = h >> 1, slang = []
    for (var k = 0; k < 4; k++) slang.push(my * w + mx - k)
    var s = { w: w, h: h, slang: slang, r: 1, groei: 0, stof: -1, kracht: null, rotsen: [], score: 0, gegeten: 0, tijd: 0,
      effect: { traag: 0, spook: 0, magneet: 0 }, over: false, zaad: zaad >>> 0, combo: 0, laatsteHap: -9 }
    s.stof = vrijVak(s, 3)
    return s
  }
  function snelheid(s) {
    var v = Math.min(12.5, 6 + s.gegeten * 0.13)
    return s.effect.traag > 0 ? v * 0.6 : v
  }
  function buur(s, i, r) {
    var x = (i % s.w + DX[r] + s.w) % s.w, y = ((i / s.w | 0) + DY[r] + s.h) % s.h
    return y * s.w + x
  }
  function afstand(s, a, b) {
    var dx = Math.abs(a % s.w - b % s.w), dy = Math.abs((a / s.w | 0) - (b / s.w | 0))
    return Math.min(dx, s.w - dx) + Math.min(dy, s.h - dy)
  }
  function bezet(s, i) {
    return s.slang.indexOf(i) >= 0 || s.rotsen.indexOf(i) >= 0 || i === s.stof || (s.kracht && s.kracht.i === i)
  }
  // vrij vakje, niet te dicht bij de kop
  function vrijVak(s, minAfstand) {
    for (var p = 0; p < 400; p++) {
      var i = dobbel(s) * s.w * s.h | 0
      if (!bezet(s, i) && afstand(s, i, s.slang[0]) >= (minAfstand || 0)) return i
    }
    for (var j = 0; j < s.w * s.h; j++) if (!bezet(s, j)) return j
    return -1
  }

  // Eén tik: richting r (of null: rechtdoor), dt = seconden sinds de vorige tik.
  // Terug: lijst gebeurtenissen voor het scherm.
  function stap(s, r, dt) {
    var ev = []
    if (s.over) return ev
    s.tijd += dt
    for (var k in s.effect) if (s.effect[k] > 0) { s.effect[k] = Math.max(0, s.effect[k] - dt); if (!s.effect[k]) ev.push({ t: 'einde', soort: k }) }
    if (s.kracht) { s.kracht.over -= dt; if (s.kracht.over <= 0) { ev.push({ t: 'weg', i: s.kracht.i }); s.kracht = null } }
    if (r != null && r !== (s.r + 2) % 4) s.r = r
    var kop = s.slang[0], nx = buur(s, kop, s.r)
    var x0 = kop % s.w, y0 = kop / s.w | 0, x1 = nx % s.w, y1 = nx / s.w | 0
    if (Math.abs(x1 - x0) > 1 || Math.abs(y1 - y0) > 1) ev.push({ t: 'rand', van: kop, naar: nx })
    // botsen (het puntje van de staart schuift net weg, behalve als je groeit)
    var staart = s.slang.slice(0, s.groei > 0 ? s.slang.length : s.slang.length - 1)
    if (s.rotsen.indexOf(nx) >= 0) { s.over = true; ev.push({ t: 'botsing', i: nx, rots: true }); return ev }
    if (staart.indexOf(nx) >= 0 && !(s.effect.spook > 0)) { s.over = true; ev.push({ t: 'botsing', i: nx }); return ev }
    s.slang.unshift(nx)
    if (s.groei > 0) s.groei--; else s.slang.pop()
    // magneet: stof dichtbij wordt meteen gepakt
    var eet = nx === s.stof || (s.effect.magneet > 0 && afstand(s, nx, s.stof) <= 2)
    if (eet) {
      var waar = s.stof
      s.combo = s.tijd - s.laatsteHap < 2.2 ? s.combo + 1 : 1
      s.laatsteHap = s.tijd
      s.score += 1; s.gegeten++; s.groei += 1
      ev.push({ t: 'eet', i: waar, combo: s.combo, magneet: waar !== nx })
      s.stof = vrijVak(s, 3)
      if (s.gegeten % 5 === 0 && !s.kracht) {
        var soort = KRACHTEN[dobbel(s) * KRACHTEN.length | 0], ki = vrijVak(s, 4)
        if (ki >= 0) { s.kracht = { i: ki, soort: soort, over: 9 }; ev.push({ t: 'kracht', i: ki, soort: soort }) }
      }
      if (s.gegeten % 6 === 0 && s.rotsen.length < Math.floor(s.w * s.h / 18)) {
        var ri = vrijVak(s, 5)
        if (ri >= 0) { s.rotsen.push(ri); ev.push({ t: 'rots', i: ri }) }
      }
    }
    if (s.kracht && nx === s.kracht.i) {
      var kr = s.kracht.soort
      s.kracht = null
      if (kr === 'goud') {
        s.score += 5
        var weg = Math.min(3, s.slang.length - 4)
        var stukjes = weg > 0 ? s.slang.splice(s.slang.length - weg, weg) : []
        ev.push({ t: 'pak', i: nx, soort: kr, stukjes: stukjes })
      } else { s.effect[kr] = DUUR[kr]; ev.push({ t: 'pak', i: nx, soort: kr }) }
    }
    return ev
  }

  return { nieuw: nieuw, stap: stap, snelheid: snelheid, buur: buur, afstand: afstand, DX: DX, DY: DY, KRACHTEN: KRACHTEN, DUUR: DUUR }
})()
