// ═══════════════════════════════════════════════════════════════════════════
//  STEENKNALLER — kern: levels, bal, batje, stenen en power-ups.
//  Geen DOM: gedeeld door spel.js en tools/steenknallerTest.js (bot-test).
//
//  Regels: kaats de bal met je batje tegen de stenen. Alle breekbare stenen
//  weg = level gehaald. Valt je laatste bal onder het batje, dan kost dat een
//  leven (3 per level). Metalen stenen zijn onbreekbaar, harde stenen moet je
//  vaker raken, bommen nemen hun buren mee. Uit stenen vallen soms power-ups.
//  Veld: breedte 1, hoogte 1.5 (staand), y omlaag.
// ═══════════════════════════════════════════════════════════════════════════
var SK = (function () {
  var B = 1, H = 1.5, KOL = 10, BR = 0.012, SW = B / KOL, SH = 0.045, BOVEN = 0.1
  var BAT_Y = 1.38, BAT_H = 0.024, BAT_W = 0.2, BREED_W = 0.3
  var LEVENS = 3, LEVELS = 30
  var POWERS = ['multi', 'breed', 'vuur', 'traag', 'leven']

  function rng(seed) {
    var a = seed >>> 0 || 1
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
  }
  function klem(v, a, b) { return v < a ? a : v > b ? b : v }

  // ── vormen: geeft voor (kolom, rij) of daar een steen hoort (rijen 0..R-1) ──
  var VORMEN = [
    { naam: 'Muur', rijen: 4, f: function (c, r) { return true } },
    { naam: 'Piramide', rijen: 7, f: function (c, r) { return Math.abs(c - 4.5) <= r * 0.75 + 0.5 } },
    { naam: 'Ruit', rijen: 9, f: function (c, r) { return Math.abs(c - 4.5) + Math.abs(r - 4) * 1.1 <= 4.6 } },
    { naam: 'Hart', rijen: 8, f: function (c, r) { var x = (c - 4.5) / 4.6, y = 1.1 - r / 6.2; return Math.pow(x * x + y * y - 0.55, 3) - x * x * y * y * y * 1.2 <= 0 } },
    { naam: 'Streepjes', rijen: 8, f: function (c, r) { return r % 2 === 0 } },
    { naam: 'Schaakbord', rijen: 8, f: function (c, r) { return (c + r) % 2 === 0 } },
    { naam: 'Smiley', rijen: 9, f: function (c, r) { var x = c - 4.5, y = r - 4; var d = Math.sqrt(x * x + y * y); if (d > 4.9) return false; if ((c === 3 || c === 6) && r === 2) return false; if (r === 6 && c >= 3 && c <= 6) return false; if (r === 5 && (c === 2 || c === 7)) return false; return true } },
    { naam: 'Ruimteschip', rijen: 8, f: function (c, r) { var x = Math.abs(c - 4.5); return [x < 1, x < 2, x < 3, x < 5, x < 5 && x > 1, x < 4, x > 2 && x < 4, x > 3 && x < 5][r] } },
    { naam: 'Pijlen', rijen: 8, f: function (c, r) { return Math.abs(((c + r) % 5) - 2) < 1 || r === 7 } },
    { naam: 'Kasteel', rijen: 7, f: function (c, r) { if (r === 0) return c % 3 !== 1; if (r < 3) return c < 3 || c > 6 || r === 2; return r < 6 || c < 4 || c > 5 } },
  ]

  // ── levels (vast per nummer) ──
  var cache = {}
  function level(L) {
    if (cache[L]) return cache[L]
    var r = rng(L * 104729 + 3), d = L / (LEVELS - 1)
    var vorm = VORMEN[L % VORMEN.length]
    var stenen = []
    for (var rij = 0; rij < vorm.rijen; rij++) for (var kol = 0; kol < KOL; kol++) {
      if (!vorm.f(kol, rij)) continue
      var hp = 1, soort = 'gewoon'
      var x = r()
      if (L >= 3 && x < 0.08 + d * 0.22) { hp = 2; soort = 'hard' }
      if (L >= 10 && x < 0.04 + d * 0.1) { hp = 3; soort = 'hard' }
      var y2 = r()
      if (L >= 6 && y2 < 0.035 + d * 0.035) { soort = 'metaal'; hp = 99 }
      else if (L >= 2 && y2 > 0.94 - d * 0.03) { soort = 'bom'; hp = 1 }
      stenen.push({ kol: kol, rij: rij, hp: hp, max: hp, soort: soort, kleur: (rij + Math.floor(L / 3)) % 7 })
    }
    // metaal mag nooit een hok vormen: hooguit 4 per level, niet tegen de zijmuur
    // en minstens 2 vakjes van ander metaal — anders blijft er een steen opgesloten
    var metaal = []
    stenen.forEach(function (st) {
      if (st.soort !== 'metaal') return
      var buur = metaal.some(function (m) { return Math.abs(m.kol - st.kol) <= 2 && Math.abs(m.rij - st.rij) <= 2 })
      if (buur || metaal.length >= 4 || st.kol === 0 || st.kol === KOL - 1) { st.soort = 'gewoon'; st.hp = st.max = 1 } else metaal.push(st)
    })
    stenen.forEach(function (st) { st.max = st.hp })
    var breekbaar = stenen.filter(function (s) { return s.soort !== 'metaal' }).length
    cache[L] = { nr: L, vorm: vorm.naam, stenen: stenen, snelheid: 1.0 + d * 0.3, breekbaar: breekbaar }
    return cache[L]
  }

  function nieuwLevel(L, seed) {
    var def = level(L)
    var s = {
      L: L, def: def, rand: rng(seed || (Date.now() & 0xffffff)),
      stenen: def.stenen.map(function (x) { return { kol: x.kol, rij: x.rij, hp: x.hp, max: x.max, soort: x.soort, kleur: x.kleur, weg: false } }),
      over: def.breekbaar, ballen: [], bat: { x: 0.5, doel: 0.5, w: BAT_W },
      levens: LEVENS, power: { breed: 0, vuur: 0, traag: 0 }, vallend: [],
      t: 0, stil: 0, magneet: 0, klaar: false, af: false, gebroken: 0, combo: 0, punten: 0,
    }
    nieuweBal(s)
    return s
  }
  function nieuweBal(s) {
    s.ballen = [{ x: s.bat.x, y: BAT_Y - BR - 0.002, vx: 0, vy: 0, vast: true, wacht: 1.6 }]
    s.combo = 0
  }
  function steenRect(st) { return { x0: st.kol * SW, x1: (st.kol + 1) * SW, y0: BOVEN + st.rij * SH, y1: BOVEN + (st.rij + 1) * SH } }
  function snelheid(s) {
    var v = s.def.snelheid
    if (s.t > 30) v *= 1 + Math.min(0.5, (s.t - 30) * 0.02)   // na 30 s gaat het steeds sneller, dan duurt een level niet te lang
    if (s.power.traag > 0) v *= 0.7
    return v
  }

  function lanceer(s) {
    s.ballen.forEach(function (b) {
      if (!b.vast) return
      b.vast = false
      var hoek = (s.rand() - 0.5) * 0.6
      var v = snelheid(s)
      b.vx = Math.sin(hoek) * v; b.vy = -Math.cos(hoek) * v
    })
  }

  // invoer: gewenste x van het batje (of null)
  function stap(s, dt, doelX) {
    var ev = []
    if (s.klaar || s.af) return ev
    dt = Math.min(dt, 0.05)
    s.t += dt
    s.stil += dt
    s.magneet = Math.max(0, s.magneet - dt)
    for (var p in s.power) if (s.power[p] > 0) s.power[p] = Math.max(0, s.power[p] - dt)
    var bat = s.bat
    bat.w = s.power.breed > 0 ? BREED_W : BAT_W
    if (doelX != null) bat.doel = doelX
    var vorigeX = bat.x
    bat.x = klem(bat.doel, bat.w / 2, B - bat.w / 2)
    var batV = (bat.x - vorigeX) / Math.max(dt, 1e-4)

    var v = snelheid(s)
    var n = Math.max(1, Math.ceil(dt * v * 1.8 / BR))
    var h = dt / n
    for (var i = 0; i < n; i++) {
      for (var j = s.ballen.length - 1; j >= 0; j--) {
        var b = s.ballen[j]
        if (b.vast) {
          b.x = bat.x; b.y = BAT_Y - BR - 0.002
          b.wacht -= h
          if (b.wacht <= 0) { lanceer(s); ev.push({ type: 'start' }) }
          continue
        }
        // snelheid bijstellen (traag/sneller) en nooit te plat
        var sp = Math.hypot(b.vx, b.vy) || 1
        b.vx *= v / sp; b.vy *= v / sp
        if (Math.abs(b.vy) < v * 0.32) { b.vy = (b.vy < 0 ? -1 : 1) * v * 0.32; b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt(v * v - b.vy * b.vy) }
        // hulp: een tijdje niets geraakt? dan buigt de bal zachtjes naar de dichtstbijzijnde steen
        if (s.stil > 4 && b.vy < 0) stuur(s, b, h)
        b.x += b.vx * h; b.y += b.vy * h
        // muren
        if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx); wiebel(s, b); ev.push({ type: 'muur' }) }
        if (b.x > B - BR) { b.x = B - BR; b.vx = -Math.abs(b.vx); wiebel(s, b); ev.push({ type: 'muur' }) }
        if (b.y < BR) { b.y = BR; b.vy = Math.abs(b.vy); wiebel(s, b); ev.push({ type: 'muur' }) }
        // batje
        if (b.vy > 0 && b.y + BR >= BAT_Y && b.y - BR <= BAT_Y + BAT_H && b.x >= bat.x - bat.w / 2 - BR && b.x <= bat.x + bat.w / 2 + BR) {
          var rel = klem((b.x - bat.x) / (bat.w / 2), -1, 1)
          var hoek = rel * 1.05 + klem(batV * 0.04, -0.15, 0.15)
          b.vx = Math.sin(hoek) * v; b.vy = -Math.cos(hoek) * v
          b.y = BAT_Y - BR
          s.combo = 0
          ev.push({ type: 'bat', x: b.x })
        }
        // stenen
        raakStenen(s, b, ev)
        // eruit?
        if (b.y > H + BR * 2) {
          s.ballen.splice(j, 1)
          if (!s.ballen.length) {
            s.levens--
            ev.push({ type: 'leven', over: s.levens })
            s.power = { breed: 0, vuur: 0, traag: 0 }
            if (s.levens <= 0) { s.af = true; ev.push({ type: 'af' }); return ev }
            nieuweBal(s)
          }
        }
        if (s.klaar) return ev
      }
    }
    // power-ups vallen
    for (var k = s.vallend.length - 1; k >= 0; k--) {
      var pu = s.vallend[k]
      pu.y += 0.32 * dt
      if (pu.y >= BAT_Y - 0.015 && pu.y <= BAT_Y + BAT_H + 0.02 && Math.abs(pu.x - bat.x) <= bat.w / 2 + 0.025) {
        s.vallend.splice(k, 1); pak(s, pu.soort); ev.push({ type: 'power', soort: pu.soort, x: pu.x })
      } else if (pu.y > H + 0.05) s.vallend.splice(k, 1)
    }
    return ev
  }

  // Raakt de bal een tijd niets (rondjes langs metaal en muren), dan krijgt hij
  // bij elke stuit een klein zetje in een andere richting
  function wiebel(s, b) {
    if (s.stil < 5) return
    var a = (s.rand() < 0.5 ? -1 : 1) * (0.2 + s.rand() * 0.3), c = Math.cos(a), si = Math.sin(a)
    var vx = b.vx * c - b.vy * si, vy = b.vx * si + b.vy * c
    if ((vx > 0) === (b.vx > 0) || Math.abs(vx) < 0.05) { b.vx = vx }
    if ((vy > 0) === (b.vy > 0)) b.vy = vy
  }

  function stuur(s, b, h) {
    var doel = null, best = 1e9
    s.stenen.forEach(function (st) {
      if (st.weg || st.soort === 'metaal') return
      var r = steenRect(st), dx = (r.x0 + r.x1) / 2 - b.x, dy = (r.y0 + r.y1) / 2 - b.y, d = dx * dx + dy * dy
      if (d < best) { best = d; doel = [dx, dy] }
    })
    if (!doel) return
    var nu = Math.atan2(b.vy, b.vx), wil = Math.atan2(doel[1], doel[0])
    var verschil = Math.atan2(Math.sin(wil - nu), Math.cos(wil - nu))
    var draai = Math.max(-1.6 * h, Math.min(1.6 * h, verschil)), v = Math.hypot(b.vx, b.vy)
    b.vx = Math.cos(nu + draai) * v; b.vy = Math.sin(nu + draai) * v
    s.magneet = 0.3
  }

  function raakStenen(s, b, ev) {
    var vuur = s.power.vuur > 0
    // alleen stenen in de buurt bekijken
    var kol = Math.floor(b.x / SW), rij = Math.floor((b.y - BOVEN) / SH)
    var beste = null, diepte = 1e9
    for (var q = 0; q < s.stenen.length; q++) {
      var st = s.stenen[q]
      if (st.weg || Math.abs(st.kol - kol) > 1 || Math.abs(st.rij - rij) > 1) continue
      var r = steenRect(st)
      var nx = klem(b.x, r.x0, r.x1), ny = klem(b.y, r.y0, r.y1)
      var dx = b.x - nx, dy = b.y - ny
      if (dx * dx + dy * dy > BR * BR) continue
      var d = dx * dx + dy * dy
      if (d < diepte) { diepte = d; beste = st }
    }
    if (!beste) return
    var r2 = steenRect(beste)
    if (!(vuur && beste.soort !== 'metaal')) {
      // terugkaatsen langs de kant met de kleinste overlap
      var ol = b.x + BR - r2.x0, or = r2.x1 - (b.x - BR), ob = b.y + BR - r2.y0, oo = r2.y1 - (b.y - BR)
      var m = Math.min(ol, or, ob, oo)
      if (m === ol) { b.x = r2.x0 - BR; b.vx = -Math.abs(b.vx) }
      else if (m === or) { b.x = r2.x1 + BR; b.vx = Math.abs(b.vx) }
      else if (m === ob) { b.y = r2.y0 - BR; b.vy = -Math.abs(b.vy) }
      else { b.y = r2.y1 + BR; b.vy = Math.abs(b.vy) }
    }
    if (beste.soort === 'metaal') { wiebel(s, b); ev.push({ type: 'metaal', kol: beste.kol, rij: beste.rij }); return }
    s.stil = 0
    beste.hp -= vuur ? beste.hp : 1
    if (beste.hp > 0) { ev.push({ type: 'tik', kol: beste.kol, rij: beste.rij }); return }
    breek(s, beste, ev)
  }

  function breek(s, st, ev) {
    if (st.weg) return
    st.weg = true; s.over--; s.gebroken++; s.combo++
    s.punten += 10 * Math.min(s.combo, 8)
    ev.push({ type: 'breek', kol: st.kol, rij: st.rij, soort: st.soort, kleur: st.kleur, combo: s.combo })
    if (s.rand() < 0.11) {
      var x = s.rand(), soort = x < 0.3 ? 'multi' : x < 0.55 ? 'breed' : x < 0.75 ? 'vuur' : x < 0.95 ? 'traag' : 'leven'
      var r = steenRect(st)
      s.vallend.push({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, soort: soort })
    }
    if (st.soort === 'bom') {
      ev.push({ type: 'boem', kol: st.kol, rij: st.rij })
      s.stenen.forEach(function (o) {
        if (!o.weg && o.soort !== 'metaal' && Math.abs(o.kol - st.kol) <= 1 && Math.abs(o.rij - st.rij) <= 1) breek(s, o, ev)
      })
    }
    if (s.over <= 0 && !s.klaar) { s.klaar = true; ev.push({ type: 'klaar' }) }
  }

  function pak(s, soort) {
    if (soort === 'multi') {
      var bron = s.ballen.find(function (b) { return !b.vast }) || s.ballen[0]
      if (!bron) return
      var v = snelheid(s)
      for (var i = 0; i < 2 && s.ballen.length < 8; i++) {
        var hoek = Math.atan2(bron.vx, -bron.vy) + (i ? 0.45 : -0.45)
        s.ballen.push({ x: bron.x, y: bron.y, vx: Math.sin(hoek) * v, vy: -Math.abs(Math.cos(hoek) * v), vast: false })
      }
      if (bron.vast) lanceer(s)
    } else if (soort === 'leven') s.levens = Math.min(5, s.levens + 1)
    else s.power[soort] = soort === 'breed' ? 12 : soort === 'vuur' ? 6 : 10
  }

  function beloning(s) { return Math.floor(s.gebroken / 4) + (s.klaar ? 10 + Math.floor(s.L / 3) + s.levens * 2 : 0) }

  return { B: B, H: H, KOL: KOL, BR: BR, SW: SW, SH: SH, BOVEN: BOVEN, BAT_Y: BAT_Y, BAT_H: BAT_H, LEVENS: LEVENS, LEVELS: LEVELS, POWERS: POWERS,
    level: level, nieuwLevel: nieuwLevel, stap: stap, lanceer: lanceer, steenRect: steenRect, beloning: beloning, rng: rng }
})()
if (typeof globalThis !== 'undefined') globalThis.SK = SK
