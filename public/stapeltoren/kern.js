// ═══════════════════════════════════════════════════════════════════════════
//  STAPELTOREN — kern: blokken, schuiven, afsnijden en de klok.
//  Geen DOM: gedeeld door spel.js en tools/stapeltorenTest.js (bot-test).
//
//  Regels: een blok schuift heen en weer boven je toren. Tik en hij valt: wat
//  over de rand steekt wordt eraf gesneden, dus je volgende blok is kleiner.
//  Precies goed (perfect) ⇒ niets eraf, en vanaf 3 perfect op rij groeit je
//  blok weer een stukje. Mis je de toren helemaal, dan is het afgelopen.
//  Je hebt 60 seconden: bouw zo hoog als je kunt.
//  Ruimte: x en z in [-0.5, 0.5] voor het startblok, lagen om en om langs x en z.
// ═══════════════════════════════════════════════════════════════════════════
var ST = (function () {
  var DUUR = 60, LAAG = 0.13, PERFECT = 0.035, GROEI = 0.06, START = 1.45

  function nieuw() {
    var s = {
      lagen: [{ x0: -0.5, x1: 0.5, z0: -0.5, z1: 0.5 }],
      klok: DUUR, over: false, reden: '', combo: 0, perfecten: 0, besteCombo: 0, t: 0,
      blok: null,
    }
    volgend(s)
    return s
  }
  function snelheid(n) { return Math.min(3.1, 1.05 + n * 0.05) }

  // nieuw schuivend blok, zo groot als de bovenste laag
  function volgend(s) {
    var n = s.lagen.length, top = s.lagen[n - 1], as = n % 2 ? 'x' : 'z'
    s.blok = { x0: top.x0, x1: top.x1, z0: top.z0, z1: top.z1, as: as, pos: -START, dir: 1, v: snelheid(n - 1) }
  }

  function stap(s, dt) {
    var ev = []
    if (s.over) return ev
    s.t += dt
    s.klok -= dt
    if (s.klok <= 0) { s.klok = 0; s.over = true; s.reden = 'tijd'; ev.push({ type: 'tijd' }); return ev }
    var b = s.blok
    b.pos += b.dir * b.v * dt
    if (b.pos > START) { b.pos = 2 * START - b.pos; b.dir = -1 }
    if (b.pos < -START) { b.pos = -2 * START - b.pos; b.dir = 1 }
    return ev
  }

  // waar staat het schuivende blok nu (zelfde vorm als een laag)
  function huidig(s) {
    var b = s.blok, o = { x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1 }
    o[b.as + '0'] += b.pos; o[b.as + '1'] += b.pos
    return o
  }

  function plaats(s) {
    if (s.over) return null
    var b = s.blok, top = s.lagen[s.lagen.length - 1], nu = huidig(s), a = b.as
    var lo = Math.max(nu[a + '0'], top[a + '0']), hi = Math.min(nu[a + '1'], top[a + '1'])
    var y = s.lagen.length
    if (hi - lo <= 0) {
      s.over = true; s.reden = 'mis'; s.combo = 0
      return { type: 'mis', stuk: nu, y: y }
    }
    var verschuif = nu[a + '0'] - top[a + '0']
    var laag, stuk = null, type
    if (Math.abs(verschuif) <= PERFECT) {
      // perfect: precies op de toren, bij een reeks groeit hij terug
      laag = { x0: top.x0, x1: top.x1, z0: top.z0, z1: top.z1 }
      s.combo++; s.perfecten++
      s.besteCombo = Math.max(s.besteCombo, s.combo)
      if (s.combo >= 3) {
        var maat = laag[a + '1'] - laag[a + '0'], erbij = Math.min(GROEI, 1 - maat)
        if (erbij > 0) { laag[a + '0'] -= erbij / 2; laag[a + '1'] += erbij / 2 }
      }
      type = 'perfect'
    } else {
      laag = { x0: nu.x0, x1: nu.x1, z0: nu.z0, z1: nu.z1 }
      laag[a + '0'] = lo; laag[a + '1'] = hi
      stuk = { x0: nu.x0, x1: nu.x1, z0: nu.z0, z1: nu.z1 }
      if (verschuif > 0) stuk[a + '0'] = hi; else stuk[a + '1'] = lo
      s.combo = 0
      type = 'snij'
    }
    s.lagen.push(laag)
    volgend(s)
    return { type: type, laag: laag, stuk: stuk, y: y, combo: s.combo, as: a }
  }

  function hoogte(s) { return s.lagen.length - 1 }
  function munten(s) { return hoogte(s) + s.perfecten }

  return { DUUR: DUUR, LAAG: LAAG, PERFECT: PERFECT, START: START, nieuw: nieuw, stap: stap, plaats: plaats, huidig: huidig, hoogte: hoogte, munten: munten, snelheid: snelheid }
})()
if (typeof globalThis !== 'undefined') globalThis.ST = ST
