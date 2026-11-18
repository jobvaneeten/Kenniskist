// ═══════════════════════════════════════════════════════════════════════════
//  NEONDRIFT: kern. Weg, auto en botsen; geen DOM. Gedeeld door spel.js en
//  tools/neondriftTest.js.
//
//  De weg bestaat uit rechte stukken die om en om naar A (+x) en B (-y) gaan.
//  De auto rijdt vanzelf. Vasthouden = naar B sturen, loslaten = naar A.
//  De auto glijdt een beetje door (driften): de rijrichting loopt achter op de
//  neus. Kom je naast de weg, dan val je eraf (een schild vangt je één keer op).
//  Netjes door het midden van een bocht = perfecte bocht.
//  Eenheden: de weg is 1 breed. Vaste stap van 1/120 s: overal hetzelfde.
// ═══════════════════════════════════════════════════════════════════════════
var ND = (function () {
  var STAP = 1 / 120, BREED = 1

  function dobbel(s) {
    s.zaad = (s.zaad + 0x6D2B79F5) >>> 0
    var t = s.zaad
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  var RICHTING = [[1, 0], [0, -1]]

  // o: { grip: 0..4, magneet: 0..3, schild: 0..2 } (upgrades)
  function nieuw(zaad, o) {
    o = o || {}
    var s = {
      zaad: zaad >>> 0, segs: [], munten: [], basis: 0,
      x: 0, y: 0, neus: 0, rij: 0, v: 3.2, afstand: 0, tijd: 0,
      seg: 0, lengtes: 0, gepakt: 0, perfect: 0, reeks: 0, besteReeks: 0, bochten: 0,
      grip: 5.4 + (o.grip || 0) * 0.6, magneet: 0.42 + (o.magneet || 0) * 0.28, schilden: o.schild || 0,
      boost: 0, over: false,
    }
    // eerste stuk is lang, om te wennen
    s.segs.push({ x: -1, y: 0, r: 0, l: 7 })
    for (var i = 0; i < 40; i++) volgend(s)
    return s
  }
  function volgend(s) {
    var vorig = s.segs[s.segs.length - 1], d = RICHTING[vorig.r]
    var n = s.basis + s.segs.length, moeilijk = Math.min(1, n / 160)
    var min = 2.4 - moeilijk * 0.6, max = 6.5 - moeilijk * 2.6
    var l = Math.round((min + dobbel(s) * (max - min)) * 2) / 2
    var seg = { x: vorig.x + d[0] * vorig.l, y: vorig.y + d[1] * vorig.l, r: 1 - vorig.r, l: l }
    if (dobbel(s) < 0.12 && l >= 4) seg.boost = true
    s.segs.push(seg)
    // munten op een deel van de stukken, in het midden van de weg
    if (dobbel(s) < 0.45) {
      var e = RICHTING[seg.r], aantal = Math.max(1, Math.floor(l / 1.5))
      for (var k = 0; k < aantal; k++) {
        var f = (k + 1) / (aantal + 1)
        s.munten.push({ x: seg.x + e[0] * l * f, y: seg.y + e[1] * l * f, id: n * 10 + k })
      }
    }
  }
  // afstand van punt tot het middenlijntje van een stuk (en hoe ver erlangs)
  function opStuk(seg, x, y) {
    var d = RICHTING[seg.r], dx = x - seg.x, dy = y - seg.y
    var langs = dx * d[0] + dy * d[1], dwars = dx * -d[1] + dy * d[0]
    var buiten = Math.max(0, -BREED / 2 - langs, langs - seg.l - BREED / 2)
    return { langs: langs, dwars: dwars, buiten: buiten, op: buiten === 0 && Math.abs(dwars) <= BREED / 2 }
  }
  function opWeg(s, x, y) {
    for (var k = Math.max(0, s.seg - 2); k < Math.min(s.segs.length, s.seg + 3); k++) if (opStuk(s.segs[k], x, y).op) return true
    return false
  }
  function hoekNaar(a, b, max) {
    var d = Math.atan2(Math.sin(b - a), Math.cos(b - a))
    return a + Math.max(-max, Math.min(max, d))
  }

  // Een vaste stap. vast: knop ingedrukt? Terug: gebeurtenissen.
  function stap(s, vast) {
    var ev = []
    if (s.over) return ev
    var dt = STAP
    s.tijd += dt
    var doel = vast ? -Math.PI / 2 : 0
    s.neus = hoekNaar(s.neus, doel, 9 * dt)
    s.rij = hoekNaar(s.rij, s.neus, s.grip * dt)
    var vmax = Math.min(8.2, 3.6 + s.afstand * 0.008) + (s.boost > 0 ? 2.2 : 0)
    s.v += (vmax - s.v) * Math.min(1, dt * 1.2)
    if (s.boost > 0) s.boost -= dt
    s.x += Math.cos(s.rij) * s.v * dt; s.y += Math.sin(s.rij) * s.v * dt
    // welk stuk? (verder als je het volgende stuk al bent opgereden)
    var nu = s.segs[s.seg], vol = s.segs[s.seg + 1]
    if (vol) {
      var a = opStuk(nu, s.x, s.y), b = opStuk(vol, s.x, s.y)
      if (b.op && (a.langs > nu.l - BREED / 2 || !a.op)) {
        // bocht genomen: hoe netjes ging het door het midden?
        s.lengtes += nu.l; s.seg++; s.bochten++
        var netjes = Math.abs(b.dwars) < 0.17 && Math.abs(a.dwars) < 0.3
        if (netjes) { s.perfect++; s.reeks++; s.besteReeks = Math.max(s.besteReeks, s.reeks); ev.push({ t: 'perfect', reeks: s.reeks, x: s.x, y: s.y }) }
        else s.reeks = 0
        if (vol.boost) { s.boost = 1.6; ev.push({ t: 'boost' }) }
        ev.push({ t: 'bocht', seg: s.seg })
        if (s.segs.length - s.seg < 30) for (var q = 0; q < 10; q++) volgend(s)
        // oude stukken weggooien (alles blijft rekenen vanaf basis)
        if (s.seg > 8) { s.segs.splice(0, 4); s.seg -= 4; s.basis += 4 }
      }
    }
    // afgelegde weg = alle hele stukken + hoe ver je langs dit stuk bent
    var st = opStuk(s.segs[s.seg], s.x, s.y)
    s.afstand = Math.max(s.afstand, s.lengtes + Math.max(0, Math.min(s.segs[s.seg].l, st.langs)))
    // munten
    for (var m = s.munten.length - 1; m >= 0; m--) {
      var mu = s.munten[m], dx = mu.x - s.x, dy = mu.y - s.y, d2 = dx * dx + dy * dy
      if (d2 < s.magneet * s.magneet) { s.munten.splice(m, 1); s.gepakt++; ev.push({ t: 'munt', x: mu.x, y: mu.y }) }
      else if (mu.y > s.y + 6 && mu.x < s.x - 6) s.munten.splice(m, 1)
    }
    // eraf?
    if (!opWeg(s, s.x, s.y)) {
      if (s.schilden > 0) {
        s.schilden--
        var sg = s.segs[s.seg], o = opStuk(sg, s.x, s.y), d = RICHTING[sg.r], langs = Math.max(0, Math.min(sg.l, o.langs))
        s.x = sg.x + d[0] * langs; s.y = sg.y + d[1] * langs; s.rij = s.neus = sg.r ? -Math.PI / 2 : 0; s.reeks = 0
        ev.push({ t: 'schild', x: s.x, y: s.y })
      } else { s.over = true; ev.push({ t: 'val', x: s.x, y: s.y }) }
    }
    return ev
  }
  return { STAP: STAP, BREED: BREED, RICHTING: RICHTING, nieuw: nieuw, stap: stap, opStuk: opStuk, opWeg: opWeg }
})()
