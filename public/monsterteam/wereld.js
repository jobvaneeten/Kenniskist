// ═══════════════════════════════════════════════════════════════════════════
//  MONSTERTEAM: de wereld om doorheen te lopen. Dorpen met een wezenhuis, een
//  winkel en een gym; routes met hoog gras (wilde wezens), trainers die je
//  uitdagen als je in hun zicht loopt, spullen op de grond en wachters die je
//  pas doorlaten als je de leider van het dorp hebt verslagen.
//
//  Gebieden liggen boven elkaar: startdorp, route 1, dorp 1, route 2, ... en
//  helemaal bovenaan de Sterrenpoort. Alles wordt met een vast zaad gemaakt:
//  elke keer dezelfde wereld. Getekend met vectoren (16 eenheden per vakje).
// ═══════════════════════════════════════════════════════════════════════════
var MTW = (function () {
  var T = 16, DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]
  var DORPEN = ['Morgenrood', 'Bladerdorp', 'Vonkstad', 'Meerhaven', 'Rotsdal', 'Askrater', 'Windhoek', 'Vriesveld', 'Nevelwoud']
  var EXTRA = ['Wandelaar Tim', 'Kampeerder Ivy', 'Visser Joep', 'Graver Wouter', 'Verkenner Bo', 'Vliegeraar Fien', 'Skiër Lars', 'Sterrenkijker Lin']
  var GYMS = 8, AANTAL = 1 + GYMS * 2 + 1
  // kleuren per gebied: gras, gras2, hoog gras, pad, boom, boom2, water, rots
  var THEMA = [
    { gras: '#4fae4a', gras2: '#5fc05a', hoog: '#2f8f3a', hoog2: '#46b04a', pad: '#d8c08a', pad2: '#c4a874', boom: '#2a7d3a', boom2: '#3e9e48', water: '#3f8fff', rots: '#8a8a9a', lucht: 140 },
    { gras: '#9aa84a', gras2: '#aab85a', hoog: '#7a8a2a', hoog2: '#c4c45a', pad: '#c8b48a', pad2: '#b49a6a', boom: '#2f5a3a', boom2: '#3f7048', water: '#3f8fff', rots: '#9a9088', lucht: 50 },
    { gras: '#3fae7a', gras2: '#4fc08a', hoog: '#1f8a5a', hoog2: '#3fb07a', pad: '#e8d8a8', pad2: '#d4c08a', boom: '#2a7a5a', boom2: '#3a9a6a', water: '#2f8fff', rots: '#7a8a9a', lucht: 200 },
    { gras: '#c8a060', gras2: '#d8b070', hoog: '#a8783a', hoog2: '#d8a850', pad: '#9a7a5a', pad2: '#8a6a4a', boom: '#5a8a3a', boom2: '#7aaa4a', water: '#3f8fff', rots: '#a0704a', lucht: 30 },
    { gras: '#6a4a3a', gras2: '#7a5848', hoog: '#b8622a', hoog2: '#e08a3a', pad: '#4a3a3a', pad2: '#3a2c2c', boom: '#3a2a2a', boom2: '#5a3a2a', water: '#ff6a1a', rots: '#5a4a4a', lucht: 15, lava: true, nacht: true },
    { gras: '#9ad0a0', gras2: '#b0e0b8', hoog: '#5ab0c0', hoog2: '#a0e0f0', pad: '#ece4d4', pad2: '#d8d0c0', boom: '#4a9a8a', boom2: '#6abaa8', water: '#8ad8ff', rots: '#f4f8ff', lucht: 195 },
    { gras: '#e4eef8', gras2: '#f4f8fc', hoog: '#8ac0e4', hoog2: '#d0ecff', pad: '#b8c8d8', pad2: '#a8b8c8', boom: '#3a6a5a', boom2: '#e8f4ff', water: '#6ab8ff', rots: '#b8e0ff', lucht: 205, sneeuw: true },
    { gras: '#3a3a6a', gras2: '#46467a', hoog: '#5a3a8a', hoog2: '#8a5ab8', pad: '#6a6a8a', pad2: '#5a5a7a', boom: '#1f1f3f', boom2: '#2f2f5a', water: '#5a4aff', rots: '#4a4a6a', lucht: 270, paddo: true, nacht: true },
    { gras: '#2a2a5a', gras2: '#36366e', hoog: '#a03ab8', hoog2: '#e05ad8', pad: '#5a5a9a', pad2: '#4a4a86', boom: '#1a1a44', boom2: '#3a2a7a', water: '#6a5aff', rots: '#7a6ab8', lucht: 300, sterren: true, nacht: true },
  ]

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
  function gebiedVan(a) { return a === 0 ? 0 : a >= AANTAL - 1 ? GYMS : Math.floor((a - 1) / 2) }   // GYMS = de sterrenpoort
  function soortVan(a) { return a === AANTAL - 1 ? 'poort' : a % 2 === 0 ? 'dorp' : 'route' }

  var cache = {}
  function kaart(a) {
    if (cache[a]) return cache[a]
    var soort = soortVan(a), R = rng(a * 7919 + 3), gb = gebiedVan(a)
    var W = 20, H = soort === 'route' ? 26 : 16
    var t = [], k = { a: a, soort: soort, gebied: gb, thema: THEMA[gb], w: W, h: H, t: t, gebouwen: [], dingen: [] }
    for (var y = 0; y < H; y++) { t.push([]); for (var x = 0; x < W; x++) t[y].push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? 'T' : '.') }
    var zet = function (x, y, c) { if (x >= 0 && y >= 0 && x < W && y < H) t[y][x] = c }
    var boven = a < AANTAL - 1, onder = a > 0
    if (soort === 'dorp') {
      var gym = a === 0 ? -1 : a / 2 - 1
      k.naam = DORPEN[a / 2]
      for (var py = 0; py < H; py++) { zet(9, py, '='); zet(10, py, '=') }
      if (!boven) { zet(9, 0, 'T'); zet(10, 0, 'T') }
      if (!onder) { zet(9, H - 1, 'T'); zet(10, H - 1, 'T') }
      for (var px2 = 2; px2 <= 17; px2++) { zet(px2, 9, '='); zet(px2, 14, '=') }
      k.gebouwen.push({ soort: 'wezenhuis', x: 2, y: 5, w: 5, h: 4, deur: [4, 8] })
      k.gebouwen.push({ soort: 'winkel', x: 13, y: 5, w: 5, h: 4, deur: [15, 8] })
      if (gym >= 0) k.gebouwen.push({ soort: 'gym', x: 2, y: 10, w: 6, h: 4, deur: [5, 13], gym: gym })
      else k.gebouwen.push({ soort: 'thuis', x: 2, y: 10, w: 5, h: 4, deur: [4, 13] })
      k.gebouwen.push({ soort: 'huis', x: 13, y: 10, w: 5, h: 4, deur: [15, 13], dak: ['#5a8aff', '#ff8a3d', '#8a5aff', '#3fbf8a', '#c8904a', '#ff5a8a', '#5ac8ff', '#9ab8d8', '#8a5ab8'][a / 2] })
      // bloemen en een paar bomen
      for (var b = 0; b < 26; b++) { var fx = 1 + (R() * 18 | 0), fy = 1 + (R() * 14 | 0); if (t[fy][fx] === '.' && !opGebouw(k, fx, fy)) t[fy][fx] = R() < 0.75 ? 'f' : 'T' }
      ;[[1, 1], [2, 1], [17, 1], [18, 1], [1, 2], [18, 2]].forEach(function (p) { if (t[p[1]][p[0]] === '.') t[p[1]][p[0]] = 'T' })
      // weg naar de gebouwen vrij houden
      k.gebouwen.forEach(function (g) { zet(g.deur[0], g.deur[1] + 1, '=') })
      k.dingen.push({ soort: 'bord', x: 11, y: H - 3, tekst: k.naam + (gym >= 0 ? ': het dorp van leider ' + MTDATA().GEBIEDEN[gym].leider.naam + '.' : ': waar elk avontuur begint.') })
      if (boven && gym >= 0) k.dingen.push({ soort: 'wachter', x: 9, y: 1, breed: 2, gym: gym })
      var tips = [
        'In het hoge gras wonen wilde wezens. Maak ze eerst zwak, dan vang je ze makkelijker!',
        'Vuur wint van plant, plant van water, water van vuur. Bliksem is sterk tegen water en schaduw.',
        'Kom je vast te zitten? Het wezenhuis maakt je wezens gratis beter.',
        'Trainers dagen je uit als je in hun zicht loopt. Na een gevecht krijg je munten.',
        'Een wezen dat sterker wordt, kan veranderen in iets heel anders!',
        'In de winkel koop je vangkristallen en drankjes.',
        'In de Rotskloof wonen aardewezens. Water en plant zijn sterk tegen aarde!',
        'Luchtwezens vliegen boven het gras. Bliksem en ijs zijn sterk tegen lucht.',
        'Achter het laatste dorp ligt een geheime poort. Daar woont iets heel bijzonders.',
      ]
      k.dingen.push({ soort: 'mens', x: 7, y: 11 + (a % 2), r: 2, tekst: tips[a / 2], kleur: ['#ff8a3d', '#3fa8ff', '#ff5fb0', '#8dff4f', '#c8904a', '#ffd23d', '#a8c8ff', '#5ae0ff', '#c77dff'][a / 2] })
    } else if (soort === 'route') {
      var i = (a - 1) / 2
      k.naam = 'Route ' + (i + 1)
      // kronkelend pad van onder naar boven
      var x = 9, padX = []
      for (var ry = H - 1; ry >= 0; ry--) {
        if (ry < H - 3 && ry > 3 && R() < 0.22) {
          var nx = Math.max(3, Math.min(15, x + (R() < 0.5 ? -1 : 1) * (1 + (R() * 3 | 0))))
          for (var sx = Math.min(x, nx); sx <= Math.max(x, nx) + 1; sx++) zet(sx, ry, '=')
          x = nx
        }
        if (ry <= 3) x = 9
        zet(x, ry, '='); zet(x + 1, ry, '='); padX[ry] = x
      }
      // hoog gras in plekken
      for (var g2 = 0; g2 < 8; g2++) {
        var gx = 2 + (R() * 16 | 0), gy = 3 + (R() * 20 | 0), rw = 2 + (R() * 3 | 0), rh = 1 + (R() * 3 | 0)
        for (var yy = gy - rh; yy <= gy + rh; yy++) for (var xx = gx - rw; xx <= gx + rw; xx++) if (yy > 0 && yy < H - 1 && xx > 0 && xx < W - 1 && t[yy][xx] === '.') t[yy][xx] = 'g'
      }
      // landschap per gebied
      var th = THEMA[i]
      for (var q = 0; q < 12; q++) { var bx = 1 + (R() * 18 | 0), by = 2 + (R() * 22 | 0); if (t[by][bx] === '.') t[by][bx] = 'T' }
      var extra = th.lava || i === 2 || i === 6 ? '~' : 'r'
      for (var p2 = 0; p2 < (i === 2 || th.lava ? 3 : 5); p2++) {
        var ex = 2 + (R() * 15 | 0), ey = 3 + (R() * 19 | 0), er = extra === '~' ? 1 + (R() * 2 | 0) : 0
        for (var e1 = -er; e1 <= er; e1++) for (var e2 = -er; e2 <= er; e2++) if (t[ey + e1] && t[ey + e1][ex + e2] && t[ey + e1][ex + e2] !== '=' && t[ey + e1][ex + e2] !== 'T') t[ey + e1][ex + e2] = extra
      }
      for (var f = 0; f < 10; f++) { var fx2 = 1 + (R() * 18 | 0), fy2 = 1 + (R() * 24 | 0); if (t[fy2][fx2] === '.') t[fy2][fx2] = 'f' }
      // twee trainers naast het pad, kijkend naar het pad
      var GD = MTDATA().GEBIEDEN[i]
      ;[[18, 't', GD.trainer.naam, GD.trainer.team], [8, 'u', EXTRA[i], GD.wild.filter(function (w) { return !w[3] }).slice(0, 2).map(function (w) { return [w[0], w[2]] })]].forEach(function (tr) {
        var ty = tr[0], kant = R() < 0.5 ? -1 : 1, tx = padX[ty] + (kant < 0 ? -3 : 4)
        tx = Math.max(1, Math.min(18, tx))
        t[ty][tx] = '.'
        for (var c2 = Math.min(tx, padX[ty]); c2 <= Math.max(tx, padX[ty] + 1); c2++) if (t[ty][c2] !== '=') t[ty][c2] = '.'
        k.dingen.push({ soort: 'trainer', x: tx, y: ty, r: kant < 0 ? 1 : 3, sleutel: tr[1] + i, naam: tr[2], team: tr[3], gebied: i, kleur: tr[1] === 't' ? '#ff5a5a' : '#5a8aff' })
      })
      // spullen op de grond
      for (var it = 0; it < 2; it++) {
        for (var tries = 0; tries < 30; tries++) {
          var ix = 2 + (R() * 16 | 0), iy = 3 + (R() * 20 | 0)
          if (t[iy][ix] === '.' || t[iy][ix] === 'g') { k.dingen.push({ soort: 'spul', x: ix, y: iy, spul: ['glimbol', 'drankje', 'superbol', 'superdrank'][(i + it) % 4], sleutel: 'r' + a + '-' + it }); break }
        }
      }
      k.dingen.push({ soort: 'bord', x: padX[H - 3] + 2, y: H - 3, tekst: k.naam + ': op weg naar ' + DORPEN[i + 1] + '. Pas op voor het hoge gras!' })
    } else {
      k.naam = 'Sterrenpoort'
      for (var sy = 3; sy < H; sy++) { zet(9, sy, '='); zet(10, sy, '=') }
      zet(9, 0, 'T'); zet(10, 0, 'T')
      for (var r2 = 0; r2 < 30; r2++) { var cx = 1 + (R() * 18 | 0), cy = 1 + (R() * 14 | 0); if (t[cy][cx] === '.') t[cy][cx] = R() < 0.5 ? 'f' : 'r' }
      for (var hy = 2; hy <= 5; hy++) for (var hx = 7; hx <= 12; hx++) zet(hx, hy, '=')
      k.dingen.push({ soort: 'legende', x: 9, y: 3, breed: 2 })
      k.dingen.push({ soort: 'bord', x: 12, y: H - 3, tekst: 'De Sterrenpoort. Alleen wie alle acht emblemen heeft, mag hier komen.' })
    }
    cache[a] = k
    return k
  }
  function opGebouw(k, x, y) {
    return k.gebouwen.find(function (g) { return x >= g.x && x < g.x + g.w && y >= g.y && y < g.y + g.h })
  }
  function dingOp(k, x, y) {
    return k.dingen.find(function (d) { return d.y === y && x >= d.x && x < d.x + (d.breed || 1) })
  }
  var MTDATA = function () { return MT }

  // ── tekenen: zachte, getekende stijl. Alles in vectoren, 16 eenheden per vakje;
  //    de vaste laag wordt op een hogere resolutie gemaakt (R keer) zodat hij scherp blijft.
  function px(g, x, y, w, h, k) { g.fillStyle = k; g.fillRect(x, y, w || 1, h || 1) }
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255] }
  // kleur lichter (f > 0) of donkerder (f < 0), met doorzichtigheid a
  function kl(hex, f, a) {
    var c = rgb(hex), t = f < 0 ? 0 : 255, p = Math.abs(f || 0)
    return 'rgba(' + Math.round((t - c[0]) * p + c[0]) + ',' + Math.round((t - c[1]) * p + c[1]) + ',' + Math.round((t - c[2]) * p + c[2]) + ',' + (a == null ? 1 : a) + ')'
  }
  function shade(hex, f) { return kl(hex, f, 1) }
  function h3(x, y, q) { var h = Math.sin(x * 127.1 + y * 311.7 + q * 74.7) * 43758.5453; return h - Math.floor(h) }
  function rr(g, x, y, w, h, r) {
    var a = typeof r === 'number' ? [r, r, r, r] : r
    g.moveTo(x + a[0], y)
    g.arcTo(x + w, y, x + w, y + h, a[1]); g.arcTo(x + w, y + h, x, y + h, a[2]); g.arcTo(x, y + h, x, y, a[3]); g.arcTo(x, y, x + w, y, a[0]); g.closePath()
  }
  function rond(g, x, y, r) { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2) }
  // alle vakjes van één soort als één zachte vorm met ronde buitenhoeken (e: hoeveel groter dan het vakje)
  function vlakPad(g, k, is, e, r) {
    g.beginPath()
    var op = function (x, y) { return x < 0 || y < 0 || x >= k.w || y >= k.h ? false : is(k.t[y][x]) }
    for (var y = 0; y < k.h; y++) for (var x = 0; x < k.w; x++) {
      if (!is(k.t[y][x])) continue
      var n = y === 0 || op(x, y - 1), z = y === k.h - 1 || op(x, y + 1), w = op(x - 1, y), o = op(x + 1, y)
      var X = x * T, Y = y * T
      var x0 = X - (w ? 0.6 : e), y0 = Y - (n ? 0.6 : e), x1 = X + T + (o ? 0.6 : e), y1 = Y + T + (z ? 0.6 : e)
      var rm = Math.max(0, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2))
      rr(g, x0, y0, x1 - x0, y1 - y0, [!n && !w ? rm : 0, !n && !o ? rm : 0, !z && !o ? rm : 0, !z && !w ? rm : 0])
    }
  }
  function vlak(g, k, is, e, r, kleur) { vlakPad(g, k, is, e, r); g.fillStyle = kleur; g.fill() }
  function zachteVlek(g, x, y, r, kleur) {
    var gr = g.createRadialGradient(x, y, 0, x, y, r)
    gr.addColorStop(0, kleur); gr.addColorStop(1, kleur.replace(/[\d.]+\)$/, '0)'))
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2)
  }

  // ── de vaste laag: gras, paden, water, bloemen, stenen, bomen en gebouwen ──
  function laag(g, k, R, ruis) {
    var th = k.thema, W = k.w * T, H = k.h * T
    g.setTransform(R, 0, 0, R, 0, 0); g.clearRect(0, 0, W, H)
    g.lineCap = 'round'; g.lineJoin = 'round'
    var x, y
    // gras met zachte lichte en donkere plekken
    var bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, kl(th.gras, 0.06)); bg.addColorStop(1, kl(th.gras, -0.06))
    g.fillStyle = bg; g.fillRect(0, 0, W, H)
    for (y = 0; y < k.h; y++) for (x = 0; x < k.w; x++) {
      zachteVlek(g, (x + ruis(x, y, 1)) * T, (y + ruis(x, y, 2)) * T, 8 + ruis(x, y, 3) * 12, kl(th.gras2, 0, 0.5))
      if (ruis(x, y, 4) < 0.5) zachteVlek(g, (x + ruis(x, y, 5)) * T, (y + ruis(x, y, 6)) * T, 6 + ruis(x, y, 7) * 10, kl(th.gras, -0.14, 0.4))
    }
    // sprietjes
    g.lineWidth = 0.55
    for (y = 0; y < k.h; y++) for (x = 0; x < k.w; x++) for (var q = 0; q < 3; q++) {
      var bx = (x + ruis(x, y, 10 + q)) * T, by = (y + ruis(x, y, 20 + q)) * T, hh = 1.6 + ruis(x, y, 30 + q) * 1.6
      g.strokeStyle = q ? kl(th.gras, -0.22, 0.55) : kl(th.gras2, 0.15, 0.7)
      g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx - 0.3, by - hh * 0.6, bx - 1, by - hh)
      g.moveTo(bx + 0.4, by); g.quadraticCurveTo(bx + 0.6, by - hh * 0.6, bx + 1.3, by - hh * 0.9); g.stroke()
    }
    if (th.sterren) for (y = 0; y < k.h; y++) for (x = 0; x < k.w; x++) if (ruis(x, y, 9) < 0.3) zachteVlek(g, (x + ruis(x, y, 10)) * T, (y + ruis(x, y, 11)) * T, 1.6, 'rgba(255,230,255,0.9)')
    var isG = function (c) { return c === 'g' }, isP = function (c) { return c === '=' }, isW = function (c) { return c === '~' }
    // ondergrond van het hoge gras
    vlak(g, k, isG, 1.4, 6, kl(th.hoog, -0.32, 0.9))
    vlak(g, k, isG, 0.2, 5, kl(th.hoog, -0.1))
    // pad met een donkere rand en steentjes
    vlak(g, k, isP, 1.5, 6, kl(th.pad, -0.28))
    vlak(g, k, isP, 0.5, 5.5, th.pad)
    g.save(); vlakPad(g, k, isP, 0.5, 5.5); g.clip()
    for (y = 0; y < k.h; y++) for (x = 0; x < k.w; x++) if (k.t[y][x] === '=') {
      zachteVlek(g, (x + ruis(x, y, 40)) * T, (y + ruis(x, y, 41)) * T, 9, kl(th.pad, 0.16, 0.6))
      for (var s = 0; s < 4; s++) {
        var sx = (x + ruis(x, y, 50 + s)) * T, sy = (y + ruis(x, y, 60 + s)) * T, sr = 0.6 + ruis(x, y, 70 + s) * 0.9
        g.fillStyle = kl(th.pad2, -0.1, 0.85); g.beginPath(); g.ellipse(sx, sy, sr * 1.3, sr, 0, 0, 7); g.fill()
        g.fillStyle = kl(th.pad, 0.35, 0.8); g.beginPath(); g.ellipse(sx - sr * 0.3, sy - sr * 0.3, sr * 0.5, sr * 0.35, 0, 0, 7); g.fill()
      }
    }
    g.restore()
    // water (of lava) met een oever
    if (k.t.some(function (r) { return r.indexOf('~') >= 0 })) {
      vlak(g, k, isW, 2.8, 7, th.lava ? '#2a1410' : kl(th.pad, 0.12))
      vlak(g, k, isW, 1.3, 6.5, th.lava ? '#7a2a0a' : kl(th.water, -0.3))
      vlak(g, k, isW, -0.2, 6, th.water)
      g.save(); vlakPad(g, k, isW, -0.2, 6); g.clip()
      for (y = 0; y < k.h; y++) for (x = 0; x < k.w; x++) if (k.t[y][x] === '~') {
        zachteVlek(g, (x + 0.5) * T, (y + 0.6) * T, 10, th.lava ? 'rgba(255,220,80,0.45)' : kl(th.water, -0.25, 0.5))
        zachteVlek(g, (x + ruis(x, y, 80)) * T, (y + ruis(x, y, 81)) * T, 6, th.lava ? 'rgba(255,255,180,0.35)' : kl(th.water, 0.35, 0.35))
      }
      g.restore()
    }
    // bloemen en stenen
    var bloemKl = th.nacht ? ['#ff6ad8', '#8affea', '#ffd23d', '#c8a0ff'] : th.sneeuw ? ['#8ac8ff', '#ffffff', '#c8b0ff', '#ff9ac0'] : ['#ff5a8a', '#ffd23d', '#ffffff', '#8ac8ff', '#ff8a3d']
    for (y = 0; y < k.h; y++) for (x = 0; x < k.w; x++) {
      var c = k.t[y][x], X = x * T, Y = y * T
      if (c === 'f') {
        var aant = 2 + (ruis(x, y, 90) * 2 | 0)
        for (var b = 0; b < aant; b++) bloem(g, X + 3 + ruis(x, y, 91 + b) * 10, Y + 4 + ruis(x, y, 95 + b) * 9, bloemKl[(ruis(x, y, 99 + b) * bloemKl.length) | 0], th, 0.85 + ruis(x, y, 100 + b) * 0.4)
      }
      if (c === 'r') steen(g, X, Y, th, ruis(x, y, 110))
    }
    // gebouwen
    k.gebouwen.forEach(function (b) { gebouw(g, b, k) })
    // bomen, rij voor rij zodat de onderste vooraan staan
    for (y = 0; y < k.h; y++) for (x = 0; x < k.w; x++) if (k.t[y][x] === 'T') {
      var v = ruis(x, y, 120), cx = x * T + 8 + (ruis(x, y, 121) - 0.5) * 2.4
      if (th.lava) basalt(g, cx, y * T, v)
      else if (th.sneeuw || ((k.gebied === 1 || k.gebied === 6) && v < 0.55) || (k.gebied === 3 && v < 0.25)) den(g, cx, y * T, th, v)
      else loofboom(g, cx, y * T, th, v)
      if (th.paddo && ruis(x, y, 40) < 0.4) paddo(g, x * T + 12.5, y * T + 14.5)
    }
    g.setTransform(1, 0, 0, 1, 0, 0)
  }
  function bloem(g, x, y, k, th, s) {
    g.fillStyle = kl(th.hoog, 0.05); g.beginPath(); g.ellipse(x - 1.4 * s, y + 1.8 * s, 1.5 * s, 0.6 * s, -0.5, 0, 7); g.ellipse(x + 1.4 * s, y + 1.9 * s, 1.5 * s, 0.6 * s, 0.5, 0, 7); g.fill()
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.ellipse(x + 0.4, y + 1.4 * s, 1.8 * s, 0.7 * s, 0, 0, 7); g.fill()
    g.fillStyle = k; g.beginPath()
    for (var i = 0; i < 5; i++) { var a = i * 1.2566 - 1.57; rond(g, x + Math.cos(a) * 1.25 * s, y + Math.sin(a) * 1.25 * s, 1.05 * s) }
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); rond(g, x - 0.7 * s, y - 1.2 * s, 0.45 * s); g.fill()
    g.fillStyle = '#ffd84a'; g.beginPath(); rond(g, x, y, 0.75 * s); g.fill()
    g.fillStyle = '#e8902a'; g.beginPath(); rond(g, x + 0.2 * s, y + 0.25 * s, 0.35 * s); g.fill()
  }
  function steen(g, X, Y, th, v) {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(X + 9, Y + 14, 7, 2.2, 0, 0, 7); g.fill()
    var gr = g.createLinearGradient(X + 3, Y + 4, X + 12, Y + 15); gr.addColorStop(0, kl(th.rots, 0.3)); gr.addColorStop(0.55, th.rots); gr.addColorStop(1, kl(th.rots, -0.35))
    g.fillStyle = gr; g.strokeStyle = kl(th.rots, -0.5, 0.6); g.lineWidth = 0.6
    g.beginPath(); g.moveTo(X + 2.5, Y + 13.5); g.bezierCurveTo(X + 1.5, Y + 8, X + 4, Y + 4, X + 8.5, Y + 4); g.bezierCurveTo(X + 13, Y + 4, X + 14.5, Y + 8.5, X + 13.8, Y + 13.5); g.quadraticCurveTo(X + 8, Y + 15.2, X + 2.5, Y + 13.5); g.fill(); g.stroke()
    if (v > 0.4) { g.beginPath(); g.ellipse(X + 13.5, Y + 13.2, 2.6, 1.9, 0, 0, 7); g.fillStyle = kl(th.rots, -0.15); g.fill(); g.stroke() }
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(X + 6.5, Y + 6.8, 2.4, 1.1, -0.5, 0, 7); g.fill()
    g.strokeStyle = kl(th.rots, -0.45, 0.7); g.lineWidth = 0.5; g.beginPath(); g.moveTo(X + 9, Y + 6); g.lineTo(X + 10, Y + 9); g.lineTo(X + 9.2, Y + 11); g.stroke()
    if (th.sneeuw) { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(X + 3.5, Y + 8); g.bezierCurveTo(X + 4.5, Y + 4.4, X + 12, Y + 3.6, X + 13.2, Y + 8); g.quadraticCurveTo(X + 10, Y + 7, X + 8, Y + 8.6); g.quadraticCurveTo(X + 6, Y + 7.2, X + 3.5, Y + 8); g.fill() }
    if (th.sterren || th.lava) { var kk = th.lava ? '#ffb03a' : '#ff9af0'; g.fillStyle = kk; g.beginPath(); g.moveTo(X + 9, Y + 1); g.lineTo(X + 11, Y + 6); g.lineTo(X + 8.5, Y + 7.5); g.lineTo(X + 7.4, Y + 5); g.closePath(); g.fill(); zachteVlek(g, X + 9.4, Y + 4.5, 5, th.lava ? 'rgba(255,140,40,0.4)' : 'rgba(255,150,240,0.4)') }
  }
  function schaduwBoom(g, cx, Y, s) { g.fillStyle = 'rgba(0,0,0,0.24)'; g.beginPath(); g.ellipse(cx + 2.4, Y + 14.6, 8 * s, 2.7, 0, 0, 7); g.fill() }
  function stam(g, cx, Y, w, h) {
    var st = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0); st.addColorStop(0, '#9a6a3e'); st.addColorStop(1, '#4a2c16')
    g.fillStyle = st; g.beginPath(); rr(g, cx - w / 2, Y + 15 - h, w, h, 1.2); g.fill()
  }
  function loofboom(g, cx, Y, th, v) {
    var s = 0.92 + v * 0.22, cy = Y + 5.5
    schaduwBoom(g, cx, Y, s); stam(g, cx, Y, 3.6, 7)
    var bol = function (kleur, lijst) { g.fillStyle = kleur; g.beginPath(); lijst.forEach(function (c) { rond(g, cx + c[0] * s, cy + c[1] * s, c[2] * s) }); g.fill() }
    bol(kl(th.boom, -0.32), [[0, -0.6, 8.4], [-5, 2.4, 5.4], [5, 2.6, 5.4], [0, 3.2, 6]])
    bol(th.boom, [[0, -1.4, 7.5], [-4.6, 1.5, 4.6], [4.4, 1.8, 4.4]])
    bol(th.boom2, [[-1.8, -3.4, 4.7], [2.8, -2, 3.2], [-4.8, 0.2, 2.4]])
    bol(kl(th.boom2, 0.35, 0.6), [[-3, -5, 1.9], [1.8, -4.2, 1.1], [-5.4, -0.6, 0.9]])
    if (th.sneeuw) bol('rgba(255,255,255,0.95)', [[-1.5, -6.4, 3.4], [2.8, -5.2, 2.2]])
    // een paar besjes of bloesem
    if (!th.nacht && v > 0.7) bol(v > 0.85 ? '#ff6a8a' : '#ffd84a', [[-3.5, 1.5, 0.8], [2.6, 0.4, 0.8], [0.2, 3.2, 0.8], [4.4, 3.6, 0.7]])
  }
  function den(g, cx, Y, th, v) {
    var s = 0.9 + v * 0.25
    schaduwBoom(g, cx, Y, s * 0.85); stam(g, cx, Y, 2.8, 4.5)
    ;[[13.2, 7.4, 6.4], [9.4, 6, 6], [5.6, 4.4, 5.8]].forEach(function (l) {
      var by = Y + l[0] - (1 - s) * 4, hw = l[1] * s, h = l[2] * s
      g.fillStyle = kl(th.boom, -0.3)
      g.beginPath(); g.moveTo(cx, by - h); g.quadraticCurveTo(cx + hw * 0.45, by - h * 0.35, cx + hw, by); g.quadraticCurveTo(cx, by + 1.8, cx - hw, by); g.quadraticCurveTo(cx - hw * 0.45, by - h * 0.35, cx, by - h); g.fill()
      g.fillStyle = th.sneeuw ? '#4a8a74' : th.boom
      g.beginPath(); g.moveTo(cx, by - h); g.quadraticCurveTo(cx - hw * 0.45, by - h * 0.35, cx - hw, by); g.quadraticCurveTo(cx - hw * 0.3, by + 1.2, cx + hw * 0.1, by + 0.6); g.quadraticCurveTo(cx - hw * 0.05, by - h * 0.4, cx, by - h); g.fill()
      if (th.sneeuw) { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(cx, by - h - 0.2); g.quadraticCurveTo(cx + hw * 0.3, by - h * 0.62, cx + hw * 0.5, by - h * 0.4); g.quadraticCurveTo(cx + hw * 0.1, by - h * 0.52, cx, by - h * 0.38); g.quadraticCurveTo(cx - hw * 0.25, by - h * 0.5, cx - hw * 0.55, by - h * 0.38); g.quadraticCurveTo(cx - hw * 0.3, by - h * 0.62, cx, by - h - 0.2); g.fill() }
    })
  }
  // lavagebied: zuilen van zwart gesteente met gloeiende scheuren
  function basalt(g, cx, Y, v) {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(cx + 1.5, Y + 14.6, 8, 2.6, 0, 0, 7); g.fill()
    ;[[-4.2, 9 + v * 3, 3.4], [4, 7 + (1 - v) * 4, 3.2], [0, 12 + v * 2, 3.8]].forEach(function (z, i) {
      var x = cx + z[0], top = Y + 14 - z[1], w = z[2], bodem = Y + 14 + (i === 2 ? 0.8 : 0)
      var zg = g.createLinearGradient(x - w, 0, x + w, 0); zg.addColorStop(0, '#5a4440'); zg.addColorStop(0.5, '#3a2a28'); zg.addColorStop(1, '#1e1414')
      g.fillStyle = zg; g.beginPath(); g.moveTo(x - w, top); g.lineTo(x - w, bodem); g.quadraticCurveTo(x, bodem + 1.4, x + w, bodem); g.lineTo(x + w, top); g.closePath(); g.fill()
      g.fillStyle = '#6a5450'; g.beginPath(); g.ellipse(x, top, w, w * 0.45, 0, 0, 7); g.fill()
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(x - w * 0.3, top - 0.3, w * 0.5, w * 0.18, 0, 0, 7); g.fill()
      var sc = top + 2 + v * (z[1] - 4)
      g.strokeStyle = 'rgba(255,170,60,0.95)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x - w * 0.5, sc); g.lineTo(x - w * 0.1, sc + 1.6); g.lineTo(x + w * 0.3, sc + 1); g.lineTo(x + w * 0.5, sc + 2.6); g.stroke()
      zachteVlek(g, x, sc + 1.4, 2.6, 'rgba(255,120,30,0.5)')
    })
  }
  function paddo(g, x, y) {
    zachteVlek(g, x, y - 1.5, 5, 'rgba(255,95,216,0.45)')
    g.fillStyle = '#f4e8ff'; g.beginPath(); rr(g, x - 0.7, y - 2, 1.4, 2.4, 0.6); g.fill()
    g.fillStyle = '#ff5fd8'; g.beginPath(); g.ellipse(x, y - 2, 2.3, 1.5, 0, Math.PI, 0); g.fill()
    g.fillStyle = '#ffffff'; g.beginPath(); rond(g, x - 0.8, y - 2.7, 0.35); rond(g, x + 0.9, y - 2.4, 0.3); g.fill()
  }

  // ── wat beweegt: hoog gras dat wiegt en water dat glinstert ──
  var grasCache = {}
  function grasSprite(th) {
    var sl = th.hoog + th.hoog2
    if (grasCache[sl]) return grasCache[sl]
    var S = 6, c = document.createElement('canvas'); c.width = 19 * S; c.height = 13 * S
    var g = c.getContext('2d'); g.scale(S, S)
    var spriet = function (bx, h, lean, kleur, top) {
      var gr = g.createLinearGradient(0, 13, 0, 13 - h); gr.addColorStop(0, kleur); gr.addColorStop(1, top)
      g.fillStyle = gr; g.beginPath(); g.moveTo(bx - 1.3, 13); g.quadraticCurveTo(bx - 0.5 + lean * 0.3, 13 - h * 0.6, bx + lean, 13 - h); g.quadraticCurveTo(bx + 0.7 + lean * 0.4, 13 - h * 0.5, bx + 1.3, 13); g.fill()
    }
    var r = rng(sl.length * 99 + 7)
    for (var i = 0; i < 6; i++) spriet(2 + i * 3 + r() * 1.5, 8 + r() * 4, (r() - 0.5) * 4, kl(th.hoog, -0.35), kl(th.hoog, 0.05))
    for (var j = 0; j < 7; j++) spriet(1.5 + j * 2.6 + r() * 1.2, 6 + r() * 5, (r() - 0.5) * 4.5, kl(th.hoog, -0.12), th.hoog2)
    g.fillStyle = kl(th.hoog2, 0.45, 0.7)
    for (var k = 0; k < 5; k++) { g.beginPath(); g.ellipse(2.5 + k * 3.6 + r(), 6 + r() * 3, 0.35, 1.4, 0.2, 0, 7); g.fill() }
    grasCache[sl] = c
    return c
  }
  // rij 0 = achterste helft, 1 = voorste helft (die over het poppetje valt), anders allebei
  function gras(g, k, x, y, tijd, rij, schud) {
    var spr = grasSprite(k.thema), X = x * T, Y = y * T
    for (var i = rij === 1 ? 1 : 0; i <= (rij === 0 ? 0 : 1); i++) {
      var sw = Math.sin(tijd * 2.2 + x * 0.8 + y * 1.1 + i * 0.9) * 0.12 + (schud || 0) * Math.sin(tijd * 24 + i * 2) * 0.3
      g.save(); g.translate(X + 8, Y + (i ? 16.6 : 9)); g.transform(1, 0, -sw, 1, 0, 0)
      if ((x + y + i) % 2) g.scale(-1, 1)
      g.drawImage(spr, -9.5, i ? -10.5 : -12.5, 19, i ? 10.5 : 12.5)
      g.restore()
    }
  }
  function golf(g, k, x, y, tijd) {
    var th = k.thema, X = x * T, Y = y * T
    if (th.lava) {
      for (var b = 0; b < 2; b++) {
        var f = (tijd * 0.45 + h3(x, y, b)) % 1, bx = X + 3 + h3(x, y, b + 4) * 10, by = Y + 4 + h3(x, y, b + 6) * 8
        g.globalAlpha = Math.sin(f * Math.PI)
        g.fillStyle = '#ffe07a'; g.beginPath(); rond(g, bx, by, 0.6 + f * 1.8); g.fill()
        g.fillStyle = '#ff9a2a'; g.beginPath(); rond(g, bx, by, 0.3 + f * 1.1); g.fill()
      }
      g.globalAlpha = 1
      return
    }
    g.strokeStyle = '#ffffff'; g.lineWidth = 0.7; g.lineCap = 'round'
    for (var i = 0; i < 2; i++) {
      var p = (tijd * 0.35 + h3(x, y, i)) % 1, wx = X + 2 + h3(x, y, i + 2) * 9 + p * 3, wy = Y + 4 + i * 6 + h3(x, y, i + 8) * 2
      g.globalAlpha = Math.sin(p * Math.PI) * 0.55
      g.beginPath(); g.moveTo(wx, wy); g.quadraticCurveTo(wx + 1.6, wy - 1, wx + 3.2, wy); g.quadraticCurveTo(wx + 4.6, wy + 0.9, wx + 6, wy); g.stroke()
    }
    var sp = (tijd * 0.8 + h3(x, y, 12) * 7) % 7
    if (sp < 0.5) { g.globalAlpha = Math.sin(sp / 0.5 * Math.PI); g.fillStyle = '#ffffff'; ster4(g, X + 4 + h3(x, y, 13) * 8, Y + 4 + h3(x, y, 14) * 8, 1.6) }
    g.globalAlpha = 1
  }
  function ster4(g, x, y, r) { g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill() }

  // ── gebouwen: muur, dak met dakpannen, ramen met bloembakken, een deur met boog ──
  function gebouw(g, b, k) {
    var X = b.x * T, Y = b.y * T, W = b.w * T, H = b.h * T, gym = b.soort === 'gym'
    var dak = gym ? MTDATA().KLEUR[gymType(b.gym)] : { wezenhuis: '#2fae8a', winkel: '#e8962a', thuis: '#c2503a', huis: b.dak || '#5a8aff' }[b.soort]
    var muur = gym ? kl(dak, 0.8) : b.soort === 'winkel' ? '#f2ecdf' : '#f6e9d2'
    var muurHex = gym ? '#eeeeee' : b.soort === 'winkel' ? '#f2ecdf' : '#f6e9d2'
    var top = Y + T * 1.55, voet = Y + H
    // schaduw op de grond
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); rr(g, X + 4, voet - 3, W, 6.5, 3); g.fill()
    g.beginPath(); rr(g, X + W - 3, Y + T, 6.5, H - T + 2, 3); g.fill()
    // muur
    var mg = g.createLinearGradient(0, top, 0, voet); mg.addColorStop(0, gym ? kl(dak, 0.62) : kl(muurHex, -0.12)); mg.addColorStop(0.3, muur); mg.addColorStop(1, gym ? kl(dak, 0.7) : kl(muurHex, -0.05))
    g.fillStyle = mg; g.beginPath(); rr(g, X + 1.5, top - 2, W - 3, voet - top + 1.5, [0, 0, 2, 2]); g.fill()
    g.strokeStyle = gym ? kl(dak, 0.45, 0.7) : kl(muurHex, -0.12, 0.8); g.lineWidth = 0.45
    g.beginPath(); for (var pl = top + 3.5; pl < voet - 4; pl += 3.6) { g.moveTo(X + 2, pl); g.lineTo(X + W - 2, pl) } g.stroke()
    // hoekbalken en sokkel
    g.fillStyle = gym ? kl(dak, 0.3) : kl(muurHex, -0.2)
    g.beginPath(); rr(g, X + 1.5, top - 1, 2.2, voet - top, 0.6); rr(g, X + W - 3.7, top - 1, 2.2, voet - top, 0.6); g.fill()
    var sok = g.createLinearGradient(0, voet - 4, 0, voet); sok.addColorStop(0, gym ? kl(dak, -0.25) : '#a8988a'); sok.addColorStop(1, gym ? kl(dak, -0.5) : '#7a6a5e')
    g.fillStyle = sok; g.beginPath(); rr(g, X + 1, voet - 4, W - 2, 4, [0.5, 0.5, 2, 2]); g.fill()
    // ramen
    var deurX = b.deur[0] * T + 8
    for (var w = X + 6; w < X + W - 12; w += 16) if (Math.abs(w + 5 - deurX) > (gym ? 15 : 10)) raam(g, w, top + 4.5, 10, 9.5, b.soort !== 'winkel' && !gym, muurHex)
    // winkel: gestreepte luifel
    if (b.soort === 'winkel') luifel(g, X + 3, top - 0.6, W - 6, 2.4, dak)
    // gym: pilaren naast de deur
    if (gym) { [-7.5, 5.5].forEach(function (o) { var pg = g.createLinearGradient(deurX + o, 0, deurX + o + 2.6, 0); pg.addColorStop(0, '#ffffff'); pg.addColorStop(1, '#b8b8cc'); g.fillStyle = pg; g.beginPath(); rr(g, deurX + o, top + 1, 2.6, voet - top - 4, 0.8); g.fill() }) }
    deur(g, b.deur[0] * T + 3, b.deur[1] * T + 1, b.soort, dak)
    // dak
    var dakB = top + 1.2, dakT = Y - 1, xl = X - 3, xr = X + W + 3, il = X + 5, ir = X + W - 5
    var dg = g.createLinearGradient(0, dakT, 0, dakB); dg.addColorStop(0, kl(dak, 0.22)); dg.addColorStop(0.6, dak); dg.addColorStop(1, kl(dak, -0.18))
    g.fillStyle = dg; g.beginPath(); g.moveTo(il, dakT); g.lineTo(ir, dakT); g.lineTo(xr, dakB); g.lineTo(xl, dakB); g.closePath(); g.fill()
    // dakpannen: rijen kleine boogjes
    g.save(); g.clip(); g.strokeStyle = kl(dak, -0.3, 0.75); g.lineWidth = 0.55
    for (var ry = dakT + 3, rij = 0; ry < dakB; ry += 3.1, rij++) {
      var f = (ry - dakT) / (dakB - dakT), lx = il + (xl - il) * f, rx = ir + (xr - ir) * f
      g.beginPath(); for (var sx = lx - (rij % 2) * 1.6; sx < rx; sx += 3.2) { g.moveTo(sx, ry); g.arc(sx + 1.6, ry, 1.6, Math.PI, 0, true) } g.stroke()
    }
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(il, dakT); g.lineTo(il + 10, dakT); g.lineTo(xl + 6, dakB); g.lineTo(xl, dakB); g.closePath(); g.fill()
    g.restore()
    // nok en dakrand met schaduw op de muur
    g.fillStyle = kl(dak, -0.35); g.beginPath(); rr(g, il - 1, dakT - 1.2, ir - il + 2, 2.4, 1.2); g.fill()
    var sch = g.createLinearGradient(0, dakB, 0, dakB + 4); sch.addColorStop(0, 'rgba(0,0,0,0.28)'); sch.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = sch; g.fillRect(X + 1.5, dakB, W - 3, 4)
    g.fillStyle = kl(dak, -0.4); g.beginPath(); rr(g, xl, dakB - 1.2, xr - xl, 2.4, 1.2); g.fill()
    // schoorsteen
    if (b.soort === 'huis' || b.soort === 'thuis') {
      var sx2 = X + W * 0.72, sy2 = dakT - 3.5
      g.fillStyle = '#9a4a3a'; g.beginPath(); rr(g, sx2, sy2, 5, 8, [0.6, 0.6, 0, 0]); g.fill()
      g.fillStyle = '#c8705a'; g.fillRect(sx2, sy2 + 2.5, 5, 0.6); g.fillRect(sx2, sy2 + 5.2, 5, 0.6)
      g.fillStyle = '#5a2a20'; g.beginPath(); rr(g, sx2 - 0.8, sy2 - 1, 6.6, 2, 0.8); g.fill()
    }
    // bord of embleem op het dak
    var bx = X + W / 2, by = Y + T * 0.72
    if (b.soort === 'wezenhuis') {
      zachteVlek(g, bx, by, 10, 'rgba(255,255,255,0.35)')
      g.fillStyle = '#ffffff'; g.strokeStyle = kl(dak, -0.35); g.lineWidth = 0.9; g.beginPath(); rond(g, bx, by, 6); g.fill(); g.stroke()
      g.fillStyle = '#ff4a7a'; g.beginPath(); g.moveTo(bx, by + 3.4); g.bezierCurveTo(bx - 5.4, by - 0.6, bx - 2.6, by - 4.6, bx, by - 1.8); g.bezierCurveTo(bx + 2.6, by - 4.6, bx + 5.4, by - 0.6, bx, by + 3.4); g.fill()
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(bx - 1.8, by - 1.2, 0.9, 0.6, -0.6, 0, 7); g.fill()
    }
    if (b.soort === 'winkel') {
      g.fillStyle = '#ffffff'; g.strokeStyle = kl(dak, -0.4); g.lineWidth = 0.9; g.beginPath(); rr(g, bx - 8, by - 5, 16, 10, 2.5); g.fill(); g.stroke()
      g.fillStyle = dak; g.beginPath(); rr(g, bx - 3.6, by - 1.6, 7.2, 5, [0.6, 0.6, 1.8, 1.8]); g.fill()
      g.strokeStyle = dak; g.lineWidth = 0.9; g.beginPath(); g.arc(bx, by - 1.6, 2, Math.PI, 0); g.stroke()
    }
    if (gym) {
      var tk = MTDATA().KLEUR[gymType(b.gym)]
      zachteVlek(g, bx, by, 13, kl(tk, 0, 0.55))
      g.fillStyle = '#1a1830'; g.strokeStyle = '#ffffff'; g.lineWidth = 1.2; g.beginPath(); rond(g, bx, by, 7.5); g.fill(); g.stroke()
      g.strokeStyle = tk; g.lineWidth = 0.8; g.beginPath(); rond(g, bx, by, 6.2); g.stroke()
      embleem(g, gymType(b.gym), bx, by, 4.4, tk)
    }
  }
  function raam(g, x, y, w, h, bak, muur) {
    g.fillStyle = kl(muur, -0.35); g.beginPath(); rr(g, x - 1, y - 1, w + 2, h + 2, 1.8); g.fill()
    var gl = g.createLinearGradient(x, y, x + w, y + h); gl.addColorStop(0, '#bfe6ff'); gl.addColorStop(0.5, '#5a9ad8'); gl.addColorStop(1, '#2a4a8a')
    g.fillStyle = gl; g.beginPath(); rr(g, x, y, w, h, 1.3); g.fill()
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.moveTo(x + 1, y + h * 0.75); g.lineTo(x + w * 0.55, y + 0.8); g.lineTo(x + w * 0.8, y + 0.8); g.lineTo(x + 1, y + h * 0.95); g.closePath(); g.fill()
    g.strokeStyle = '#ffffff'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke()
    g.fillStyle = kl(muur, -0.45); g.beginPath(); rr(g, x - 1.6, y + h + 0.6, w + 3.2, 1.4, 0.6); g.fill()
    if (bak) {
      g.fillStyle = '#8a5530'; g.beginPath(); rr(g, x - 0.6, y + h + 1.6, w + 1.2, 2.6, [0, 0, 1, 1]); g.fill()
      g.fillStyle = '#3f9a48'; g.beginPath(); for (var i = 0; i < 4; i++) rond(g, x + 1 + i * 2.7, y + h + 1.4, 1.3); g.fill()
      ;['#ff5a8a', '#ffd23d', '#ff5a8a', '#ffffff'].forEach(function (k, i) { g.fillStyle = k; g.beginPath(); rond(g, x + 1.2 + i * 2.6, y + h + 0.8, 0.85); g.fill() })
    }
  }
  function luifel(g, x, y, w, h, kleur) {
    var n = Math.max(4, Math.round(w / 4)), sw = w / n
    for (var i = 0; i < n; i++) {
      g.fillStyle = i % 2 ? '#ffffff' : kleur
      g.beginPath(); g.moveTo(x + i * sw, y); g.lineTo(x + (i + 1) * sw, y); g.lineTo(x + (i + 1) * sw, y + h); g.arc(x + (i + 0.5) * sw, y + h, sw / 2, 0, Math.PI); g.closePath(); g.fill()
    }
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, y, w, 1)
  }
  function deur(g, dx, dy, soort, dak) {
    g.fillStyle = '#b8aa98'; g.beginPath(); rr(g, dx - 2.5, dy + 14, 15, 2.6, 1); g.fill()
    g.fillStyle = soort === 'gym' ? '#ffffff' : '#6a4a3a'
    g.beginPath(); g.moveTo(dx - 1, dy + 14.4); g.lineTo(dx - 1, dy + 4); g.arc(dx + 5, dy + 4, 6, Math.PI, 0); g.lineTo(dx + 11, dy + 14.4); g.closePath(); g.fill()
    var hg = g.createLinearGradient(dx, 0, dx + 10, 0)
    if (soort === 'gym') { hg.addColorStop(0, kl(dak, -0.2)); hg.addColorStop(1, kl(dak, -0.55)) } else { hg.addColorStop(0, '#a8683a'); hg.addColorStop(1, '#5e341a') }
    g.fillStyle = hg; g.beginPath(); g.moveTo(dx, dy + 14.4); g.lineTo(dx, dy + 4); g.arc(dx + 5, dy + 4, 5, Math.PI, 0); g.lineTo(dx + 10, dy + 14.4); g.closePath(); g.fill()
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(dx + 5, dy + 0); g.lineTo(dx + 5, dy + 14.4); g.stroke()
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); rr(g, dx + 1.2, dy + 5, 2.6, 3.6, 0.8); rr(g, dx + 6.2, dy + 5, 2.6, 3.6, 0.8); g.fill()
    g.fillStyle = '#ffd23d'; g.beginPath(); rond(g, dx + 7.8, dy + 9.6, 0.7); rond(g, dx + 2.2, dy + 9.6, 0.7); g.fill()
    g.fillStyle = soort === 'wezenhuis' ? '#5ad8b8' : soort === 'gym' ? kl(dak, 0) : '#c8584a'
    g.beginPath(); rr(g, dx - 1.5, dy + 15, 13, 2, 0.8); g.fill()
  }
  function gymType(i) { var t = MTDATA().GEBIEDEN[i].leider.type; return t === 'alles' ? 'schaduw' : t }
  function embleem(g, type, x, y, r, k) {
    g.fillStyle = k; g.strokeStyle = k; g.lineWidth = 1.6
    if (type === 'vuur') { g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x + r, y, x, y + r); g.quadraticCurveTo(x - r, y, x, y - r); g.fill() }
    else if (type === 'water') { g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x + r, y + r * 0.4, x, y + r); g.quadraticCurveTo(x - r, y + r * 0.4, x, y - r); g.fill() }
    else if (type === 'plant') { g.beginPath(); g.ellipse(x, y, r * 0.5, r, 0.6, 0, 7); g.fill() }
    else if (type === 'bliksem') { g.beginPath(); g.moveTo(x + 1, y - r); g.lineTo(x - 3, y + 1); g.lineTo(x, y + 1); g.lineTo(x - 1, y + r); g.lineTo(x + 3, y - 1); g.lineTo(x, y - 1); g.closePath(); g.fill() }
    else if (type === 'ijs') { g.lineWidth = 1.6; g.beginPath(); for (var a = 0; a < 3; a++) { var h = a * Math.PI / 3; g.moveTo(x - Math.cos(h) * r, y - Math.sin(h) * r); g.lineTo(x + Math.cos(h) * r, y + Math.sin(h) * r) } g.stroke() }
    else if (type === 'aarde') { g.beginPath(); g.moveTo(x - r, y + r * 0.6); g.lineTo(x - r * 0.3, y - r * 0.6); g.lineTo(x + r * 0.1, y); g.lineTo(x + r * 0.5, y - r * 0.4); g.lineTo(x + r, y + r * 0.6); g.closePath(); g.fill() }
    else if (type === 'lucht') { g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - r, y - r * 0.3); g.quadraticCurveTo(x + r * 0.3, y - r * 0.6, x + r * 0.5, y - r * 0.1); g.moveTo(x - r * 0.8, y + r * 0.3); g.quadraticCurveTo(x + r * 0.6, y + r * 0.1, x + r, y + r * 0.5); g.stroke() }
    else { g.beginPath(); g.arc(x, y, r * 0.8, 0, 7); g.fill(); g.fillStyle = '#14142a'; g.beginPath(); g.arc(x + 2, y - 1, r * 0.65, 0, 7); g.fill() }
  }
  // ── een poppetje met een groot hoofd: pet, haar, ogen, jas met rugzak, armen en benen die meelopen ──
  // (x, y) is de linkerbovenhoek van een vakje van 16, de voeten staan op y + 15. stap: 0 stil, 1 of 2 een loopstapje.
  function persoon(g, x, y, r, stap, k2) {
    k2 = k2 || {}
    var pet = k2.pet || '#e83a3a', jas = k2.jas || '#2f6fe0', haar = k2.haar || '#3a2a1a', huid = k2.huid || '#f6cfa8', broek = k2.broek || '#2a2a44', tas = k2.tas || '#f0b84a'
    var cx = x + 8, voet = y + 15, l = stap === 1 ? 1 : stap === 2 ? -1 : 0, bob = stap ? -0.7 : 0
    var zij = r === 1 || r === 3, sx = r === 1 ? 1 : -1, lijn = 'rgba(28,22,48,0.8)'
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round'
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(cx, voet, 5, 1.7, 0, 0, 7); g.fill()
    var been = function (bx, lift, donker) {
      g.fillStyle = donker ? kl(broek, -0.3) : broek; g.strokeStyle = lijn; g.lineWidth = 0.55
      g.beginPath(); rr(g, bx - 1.25, y + 10.8, 2.5, voet - y - 11.6 - lift, 1); g.fill(); g.stroke()
      g.fillStyle = donker ? '#2a1a1a' : '#4a2e22'; g.beginPath(); g.ellipse(bx + (zij ? sx * 0.5 : 0), voet - 0.9 - lift, 1.7, 1, 0, 0, 7); g.fill(); g.stroke()
    }
    var arm = function (ax, ay, hx, hy, kleur) {
      g.strokeStyle = lijn; g.lineWidth = 2.6; g.beginPath(); g.moveTo(ax, ay); g.lineTo(hx, hy); g.stroke()
      g.strokeStyle = kleur; g.lineWidth = 1.6; g.beginPath(); g.moveTo(ax, ay); g.lineTo(hx, hy); g.stroke()
      g.fillStyle = huid; g.strokeStyle = lijn; g.lineWidth = 0.5; g.beginPath(); rond(g, hx, hy + 0.3, 0.95); g.fill(); g.stroke()
    }
    // benen (en bij zijaanzicht de verste arm eerst)
    if (zij) {
      arm(cx - sx * 0.6, y + 8.6 + bob, cx - sx * 0.6 - sx * l * 1.8, y + 11.4 + bob, kl(jas, -0.3))
      been(cx - sx * l * 1.5, l < 0 ? 0.8 : 0, true); been(cx + sx * l * 1.5, l > 0 ? 0.8 : 0)
    } else { been(cx - 1.8, l > 0 ? 0.9 : 0); been(cx + 1.8, l < 0 ? 0.9 : 0) }
    // lijf
    var by = y + 7.4 + bob
    var jg = g.createLinearGradient(0, by, 0, by + 5.4); jg.addColorStop(0, kl(jas, 0.15)); jg.addColorStop(1, kl(jas, -0.2))
    if (zij) { g.fillStyle = tas; g.strokeStyle = lijn; g.lineWidth = 0.55; g.beginPath(); rr(g, cx - sx * 4.6 - 1.6, by + 0.4, 3.2, 4.4, 1.2); g.fill(); g.stroke() }
    g.fillStyle = jg; g.strokeStyle = lijn; g.lineWidth = 0.6; g.beginPath(); rr(g, cx - 3.9, by, 7.8, 5.4, [2.4, 2.4, 1.6, 1.6]); g.fill(); g.stroke()
    if (r === 2) { g.strokeStyle = kl(jas, -0.4); g.lineWidth = 0.45; g.beginPath(); g.moveTo(cx, by + 1); g.lineTo(cx, by + 5.2); g.stroke(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(cx - 2, by + 0.2); g.lineTo(cx, by + 1.6); g.lineTo(cx + 2, by + 0.2); g.closePath(); g.fill() }
    if (r === 0) {
      g.fillStyle = tas; g.strokeStyle = lijn; g.lineWidth = 0.55; g.beginPath(); rr(g, cx - 3, by + 0.6, 6, 4.6, 1.6); g.fill(); g.stroke()
      g.fillStyle = kl(tas, -0.2); g.beginPath(); rr(g, cx - 2, by + 2.6, 4, 1.8, 0.7); g.fill()
    }
    // armen voor
    if (zij) arm(cx + sx * 0.4, y + 8.6 + bob, cx + sx * 0.4 + sx * l * 1.8, y + 11.4 + bob, jas)
    else { arm(cx - 3.8, y + 8.4 + bob, cx - 4.4, y + 11.2 + bob + l * 0.5, jas); arm(cx + 3.8, y + 8.4 + bob, cx + 4.4, y + 11.2 + bob - l * 0.5, jas) }
    // hoofd
    var hy = y + 4.1 + bob, hr = 4.7
    g.fillStyle = huid; g.strokeStyle = lijn; g.lineWidth = 0.65; g.beginPath(); rond(g, cx, hy, hr); g.fill(); g.stroke()
    g.save(); g.beginPath(); rond(g, cx, hy, hr - 0.3); g.clip()
    g.fillStyle = haar
    if (r === 0) g.fillRect(cx - hr, hy - hr, hr * 2, hr * 2)
    else if (zij) { g.beginPath(); g.moveTo(cx - sx * hr, hy - hr); g.lineTo(cx + sx * 1.2, hy - hr); g.lineTo(cx + sx * 0.6, hy - 0.4); g.lineTo(cx - sx * 1.2, hy + 0.4); g.lineTo(cx - sx * 1.6, hy + 3); g.lineTo(cx - sx * hr, hy + 3.4); g.closePath(); g.fill() }
    else { g.beginPath(); g.moveTo(cx - hr, hy + 1.6); g.lineTo(cx - hr, hy - hr); g.lineTo(cx + hr, hy - hr); g.lineTo(cx + hr, hy + 1.6); g.lineTo(cx + 3.4, hy - 0.6); g.lineTo(cx + 2, hy - 0.2); g.lineTo(cx + 0.8, hy - 1); g.lineTo(cx - 0.6, hy - 0.2); g.lineTo(cx - 2, hy - 1); g.lineTo(cx - 3.4, hy - 0.4); g.closePath(); g.fill() }
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.ellipse(cx - 1.6, hy - 1.5, 2, 1, -0.4, 0, 7); g.fill()
    g.restore()
    // gezicht
    var oog = function (ox) { g.fillStyle = '#1c1a2e'; g.beginPath(); g.ellipse(ox, hy + 0.9, 0.75, 1.05, 0, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); rond(g, ox + 0.25, hy + 0.5, 0.32); g.fill() }
    if (r === 2) {
      oog(cx - 1.75); oog(cx + 1.75)
      g.fillStyle = 'rgba(255,110,120,0.4)'; g.beginPath(); g.ellipse(cx - 3, hy + 2.3, 0.9, 0.55, 0, 0, 7); g.ellipse(cx + 3, hy + 2.3, 0.9, 0.55, 0, 0, 7); g.fill()
      g.strokeStyle = '#8a3a3a'; g.lineWidth = 0.4; g.beginPath(); g.arc(cx, hy + 2.3, 0.7, 0.3, Math.PI - 0.3); g.stroke()
    } else if (zij) {
      oog(cx + sx * 2.3)
      g.fillStyle = 'rgba(255,110,120,0.4)'; g.beginPath(); g.ellipse(cx + sx * 2.5, hy + 2.4, 0.8, 0.5, 0, 0, 7); g.fill()
      g.fillStyle = huid; g.strokeStyle = lijn; g.lineWidth = 0.4; g.beginPath(); rond(g, cx - sx * 0.9, hy + 1.1, 1); g.fill(); g.stroke()
    }
    // pet met klep
    var pg = g.createLinearGradient(0, hy - hr - 0.6, 0, hy); pg.addColorStop(0, kl(pet, 0.25)); pg.addColorStop(1, kl(pet, -0.1))
    if (r === 2) { g.fillStyle = kl(pet, -0.35); g.strokeStyle = lijn; g.lineWidth = 0.55; g.beginPath(); g.ellipse(cx, hy - 1.1, 4.8, 1.35, 0, 0, Math.PI); g.fill(); g.stroke() }
    if (zij) { g.fillStyle = kl(pet, -0.35); g.strokeStyle = lijn; g.lineWidth = 0.55; g.beginPath(); g.ellipse(cx + sx * 4, hy - 1.3, 3, 1, 0, 0, 7); g.fill(); g.stroke() }
    g.fillStyle = pg; g.strokeStyle = lijn; g.lineWidth = 0.65
    g.beginPath(); g.arc(cx, hy - 0.8, hr + 0.25, Math.PI * 1.02, Math.PI * 1.98); g.quadraticCurveTo(cx, hy - 0.2, cx - hr - 0.2, hy - 0.9); g.closePath(); g.fill(); g.stroke()
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(cx - 1.6, hy - 3.6, 1.6, 0.7, -0.3, 0, 7); g.fill()
    if (r === 2) { g.fillStyle = '#ffffff'; g.beginPath(); rond(g, cx, hy - 3, 1.1); g.fill(); g.fillStyle = pet; g.beginPath(); rond(g, cx, hy - 3, 0.5); g.fill() }
    if (r === 0) { g.fillStyle = kl(pet, -0.35); g.beginPath(); rr(g, cx - 1.6, hy - 1.4, 3.2, 1, 0.5); g.fill() }
    g.restore()
  }

  // ── kleine dingen in de wereld ──
  function bord(g, X, Y) {
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(X + 9, Y + 14.5, 6, 1.8, 0, 0, 7); g.fill()
    g.fillStyle = '#6b4426'; g.beginPath(); rr(g, X + 7, Y + 6, 2.2, 9, 0.8); g.fill()
    var hg = g.createLinearGradient(0, Y + 2, 0, Y + 10); hg.addColorStop(0, '#d8a868'); hg.addColorStop(1, '#a8743e')
    g.fillStyle = hg; g.strokeStyle = '#5a361c'; g.lineWidth = 0.7; g.beginPath(); rr(g, X + 1.5, Y + 2, 13, 8, 1.8); g.fill(); g.stroke()
    g.strokeStyle = 'rgba(90,54,28,0.7)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(X + 4, Y + 4.8); g.lineTo(X + 12, Y + 4.8); g.moveTo(X + 4, Y + 7.2); g.lineTo(X + 10, Y + 7.2); g.stroke()
  }
  function hek(g, X, Y) {
    for (var i = 0; i < 2; i++) { g.fillStyle = '#5a5a6a'; g.beginPath(); rr(g, X + i * 15.5, Y + 3, 2, 11, 0.8); g.fill() }
    for (var b = 0; b < 4; b++) { g.fillStyle = b % 2 ? '#ffffff' : '#ff3a4a'; g.beginPath(); rr(g, X + 1 + b * 3.6, Y + 5.5, 3.8, 3.4, b === 0 ? [1, 0, 0, 1] : b === 3 ? [0, 1, 1, 0] : 0); g.fill() }
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.5; g.strokeRect(X + 1, Y + 5.5, 14.4, 3.4)
  }
  function uitroep(g, X, Y) {
    g.fillStyle = '#ffffff'; g.strokeStyle = '#1a1830'; g.lineWidth = 0.8
    g.beginPath(); rr(g, X + 3.5, Y - 17, 9, 11, 3); g.moveTo(X + 7, Y - 6.2); g.lineTo(X + 8, Y - 4); g.lineTo(X + 9.4, Y - 6.2); g.fill(); g.stroke()
    g.fillStyle = '#ff3a3a'; g.beginPath(); rr(g, X + 7, Y - 15.4, 2, 5, 1); rond(g, X + 8, Y - 8.6, 1.1); g.fill()
  }
  function sokkel(g, X, Y, tijd) {
    var gl = 0.5 + Math.sin(tijd * 2) * 0.3
    zachteVlek(g, X + T, Y + 8, 26, 'rgba(255,79,216,' + (gl * 0.5).toFixed(2) + ')')
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(X + T, Y + 15, 13, 3, 0, 0, 7); g.fill()
    var sg = g.createLinearGradient(0, Y + 7, 0, Y + 15); sg.addColorStop(0, '#b8a8f0'); sg.addColorStop(1, '#5a4a9a')
    g.fillStyle = sg; g.beginPath(); g.ellipse(X + T, Y + 12, 12, 3.4, 0, 0, Math.PI); g.lineTo(X + T - 12, Y + 9.5); g.ellipse(X + T, Y + 9.5, 12, 3.4, 0, Math.PI, 0, true); g.closePath(); g.fill()
    g.fillStyle = '#d8ccff'; g.beginPath(); g.ellipse(X + T, Y + 9.5, 12, 3.4, 0, 0, 7); g.fill()
    g.strokeStyle = 'rgba(255,79,216,' + (0.5 + gl * 0.5).toFixed(2) + ')'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(X + T, Y + 9.5, 9, 2.4, 0, 0, 7); g.stroke()
  }

  // ── gevecht: een geschilderd landschap in de kleuren van het gebied (één keer getekend, daarna een plaatje) ──
  function boomVan(g, cx, Y, th, gb, v) {
    if (th.lava) basalt(g, cx, Y, v)
    else if (th.sneeuw || ((gb === 1 || gb === 6) && v < 0.55) || (gb === 3 && v < 0.25)) den(g, cx, Y, th, v)
    else loofboom(g, cx, Y, th, v)
  }
  function hsl(h, s, l, a) { return 'hsla(' + h + ',' + s + '%,' + l + '%,' + (a == null ? 1 : a) + ')' }
  function bergen(g, W, hor, r, n, hMin, hMax, kleur, donker, sneeuw) {
    for (var i = 0; i < n; i++) {
      var x = (i + r() * 0.6 - 0.3) / (n - 1) * W, h = hMin + r() * (hMax - hMin), w = h * (1.1 + r() * 0.7)
      var pad = function () { g.beginPath(); g.moveTo(x - w, hor + 2); g.quadraticCurveTo(x - w * 0.35, hor - h * 0.9, x, hor - h); g.quadraticCurveTo(x + w * 0.35, hor - h * 0.9, x + w, hor + 2); g.closePath() }
      pad(); g.fillStyle = kleur; g.fill()
      g.save(); pad(); g.clip()
      g.fillStyle = donker; g.beginPath(); g.moveTo(x, hor - h); g.quadraticCurveTo(x + w * 0.05, hor - h * 0.4, x - w * 0.15, hor + 2); g.lineTo(x + w, hor + 2); g.closePath(); g.fill()
      if (sneeuw) {
        var sy = hor - h * 0.62
        g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.moveTo(x - w, sy)
        for (var s = 0; s <= 8; s++) g.lineTo(x - w + s * w / 4, sy + (s % 2 ? h * 0.07 : -h * 0.02))
        g.lineTo(x + w, hor - h * 1.2); g.lineTo(x - w, hor - h * 1.2); g.closePath(); g.fill()
        g.fillStyle = 'rgba(150,180,230,0.35)'; g.beginPath(); g.moveTo(x, hor - h); g.quadraticCurveTo(x + w * 0.05, hor - h * 0.75, x - w * 0.05, sy + h * 0.05); g.lineTo(x + w, sy); g.lineTo(x + w, hor - h * 1.2); g.closePath(); g.fill()
      }
      g.restore()
    }
  }
  function heuvel(g, W, hor, r, hoogte, kleur, licht) {
    var f1 = 0.004 + r() * 0.004, f2 = 0.011 + r() * 0.006, p1 = r() * 9, p2 = r() * 9, pts = []
    for (var x = -10; x <= W + 10; x += 10) pts.push([x, hor - hoogte * (0.55 + 0.3 * Math.sin(x * f1 + p1) + 0.15 * Math.sin(x * f2 + p2))])
    g.beginPath(); g.moveTo(-10, hor + 4); pts.forEach(function (p) { g.lineTo(p[0], p[1]) }); g.lineTo(W + 10, hor + 4); g.closePath()
    var hg = g.createLinearGradient(0, hor - hoogte, 0, hor); hg.addColorStop(0, licht); hg.addColorStop(1, kleur); g.fillStyle = hg; g.fill()
    return pts
  }
  function wolkPad(g, x, y, s) {
    g.beginPath(); rond(g, x - 30 * s, y, 16 * s); rond(g, x - 8 * s, y - 12 * s, 22 * s); rond(g, x + 18 * s, y - 6 * s, 18 * s); rond(g, x + 36 * s, y + 2 * s, 12 * s)
    g.moveTo(x - 44 * s, y + 6 * s); rr(g, x - 46 * s, y - 2 * s, 94 * s, 16 * s, 8 * s)
  }
  var wolkCache = null
  function wolkSprite() {
    if (wolkCache) return wolkCache
    var c = document.createElement('canvas'); c.width = 240; c.height = 120; var g = c.getContext('2d')
    g.translate(120, 66)
    g.fillStyle = 'rgba(190,210,240,0.9)'; wolkPad(g, 2, 6, 2); g.fill()
    g.fillStyle = '#ffffff'; wolkPad(g, 0, 0, 2); g.fill()
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); rond(g, -22, -30, 18); rond(g, 26, -20, 12); g.fill()
    wolkCache = c; return c
  }
  function arena(g, W, H, gb) {
    var th = THEMA[gb], hor = H * 0.42, nacht = !!th.nacht, r = rng(gb * 977 + 13), L = th.lucht, schaal = Math.max(0.6, Math.min(1.6, H / 700))
    var bergKl = th.sneeuw || gb === 5 || gb === 1
    // lucht
    var lu = g.createLinearGradient(0, 0, 0, hor)
    if (nacht) { lu.addColorStop(0, hsl(L, 55, 6)); lu.addColorStop(0.55, hsl(L, 50, 15)); lu.addColorStop(1, th.lava ? hsl(12, 75, 32) : hsl(L + 15, 55, 30)) }
    else { lu.addColorStop(0, hsl(212, 72, 54)); lu.addColorStop(0.6, hsl(200, 80, 74)); lu.addColorStop(1, hsl(L, 70, 88)) }
    g.fillStyle = lu; g.fillRect(0, 0, W, hor + 4)
    if (nacht) {
      for (var i = 0; i < 140; i++) { var sx = r() * W, sy = r() * hor * 0.95, sa = 0.25 + r() * 0.75; g.fillStyle = 'rgba(255,255,255,' + sa.toFixed(2) + ')'; g.beginPath(); rond(g, sx, sy, r() < 0.1 ? 1.6 : 0.8); g.fill() }
      for (var j = 0; j < 6; j++) { g.fillStyle = 'rgba(255,255,255,0.9)'; ster4(g, r() * W, r() * hor * 0.7, 4 + r() * 3) }
      if (th.sterren || th.paddo) { zachteVlek(g, W * 0.3, hor * 0.35, W * 0.35, th.sterren ? 'rgba(255,90,216,0.22)' : 'rgba(140,90,255,0.2)'); zachteVlek(g, W * 0.7, hor * 0.2, W * 0.25, 'rgba(90,140,255,0.18)') }
      if (!th.lava) {
        var mx = W * 0.8, my = hor * 0.3, mr = Math.min(W, H) * 0.06
        zachteVlek(g, mx, my, mr * 4, 'rgba(255,240,210,0.25)')
        g.fillStyle = '#fff4dc'; g.beginPath(); rond(g, mx, my, mr); g.fill()
        g.fillStyle = 'rgba(200,190,160,0.45)'; g.beginPath(); rond(g, mx - mr * 0.3, my - mr * 0.2, mr * 0.22); rond(g, mx + mr * 0.35, my + mr * 0.25, mr * 0.16); rond(g, mx + mr * 0.1, my - mr * 0.45, mr * 0.1); g.fill()
      }
    } else {
      var zx = W * 0.82, zy = hor * 0.26, zr = Math.min(W, H) * 0.07
      g.save(); g.globalAlpha = 0.07; g.fillStyle = '#ffffff'
      for (var s = 0; s < 9; s++) { var a = Math.PI * (0.45 + s * 0.13); g.beginPath(); g.moveTo(zx, zy); g.lineTo(zx + Math.cos(a) * W * 1.2, zy + Math.sin(a) * W * 1.2); g.lineTo(zx + Math.cos(a + 0.05) * W * 1.2, zy + Math.sin(a + 0.05) * W * 1.2); g.closePath(); g.fill() }
      g.restore()
      zachteVlek(g, zx, zy, zr * 6, 'rgba(255,250,215,0.55)')
      zachteVlek(g, zx, zy, zr * 2.2, 'rgba(255,255,235,0.9)')
      g.fillStyle = '#fffbea'; g.beginPath(); rond(g, zx, zy, zr); g.fill()
    }
    // verre bergen
    if (th.lava) {
      bergen(g, W, hor, r, 4, hor * 0.25, hor * 0.45, '#3a2626', '#241616', false)
      var vx = W * 0.32, vh = hor * 0.62, vw = vh * 1.3
      g.fillStyle = '#2e1c1c'; g.beginPath(); g.moveTo(vx - vw, hor + 2); g.quadraticCurveTo(vx - vw * 0.3, hor - vh * 0.7, vx - vw * 0.16, hor - vh); g.lineTo(vx + vw * 0.16, hor - vh); g.quadraticCurveTo(vx + vw * 0.3, hor - vh * 0.7, vx + vw, hor + 2); g.closePath(); g.fill()
      zachteVlek(g, vx, hor - vh, vw * 0.5, 'rgba(255,110,30,0.55)')
      g.strokeStyle = 'rgba(255,140,40,0.85)'; g.lineWidth = 3 * schaal; g.lineCap = 'round'
      ;[[-0.1, 0.35], [0.08, 0.5], [0.02, 0.2]].forEach(function (s) { g.beginPath(); g.moveTo(vx + s[0] * vw, hor - vh + 2); g.quadraticCurveTo(vx + s[0] * vw * 2.4, hor - vh * (1 - s[1] * 0.5), vx + s[0] * vw * 3, hor - vh * (1 - s[1])); g.stroke() })
    } else if (nacht) bergen(g, W, hor, r, 5, hor * 0.2, hor * 0.42, hsl(L, 30, 20), hsl(L, 35, 14), false)
    else bergen(g, W, hor, r, 5, hor * 0.22, hor * (bergKl ? 0.55 : 0.4), hsl(215, 28, bergKl ? 72 : 70), hsl(220, 30, bergKl ? 60 : 62), bergKl)
    // nevel tussen bergen en heuvels
    var nv = g.createLinearGradient(0, hor - hor * 0.35, 0, hor)
    nv.addColorStop(0, 'rgba(255,255,255,0)'); nv.addColorStop(1, nacht ? (th.lava ? 'rgba(255,90,40,0.3)' : hsl(L, 50, 40, 0.35)) : 'rgba(255,255,255,0.55)')
    g.fillStyle = nv; g.fillRect(0, hor - hor * 0.35, W, hor * 0.35 + 4)
    // heuvels met een rij bomen erop
    var bs = 2.6 * schaal
    var achter = heuvel(g, W, hor, r, hor * 0.16, kl(th.boom, nacht ? -0.25 : 0.15), kl(th.boom2, nacht ? -0.2 : 0.3))
    for (var b = 0; b < achter.length; b += 2) {
      var p = achter[b], v = r()
      g.save(); g.translate(p[0] + r() * 8, p[1] + 6); g.scale(bs * 0.75, bs * 0.75); boomVan(g, 0, -15, th, gb, v); g.restore()
    }
    g.fillStyle = nacht ? hsl(L, 40, 20, 0.35) : 'rgba(225,240,255,0.35)'; g.fillRect(0, hor - hor * 0.3, W, hor * 0.3 + 4)
    var voor = heuvel(g, W, hor + 2, r, hor * 0.08, kl(th.boom, nacht ? -0.15 : 0), kl(th.boom2, nacht ? -0.1 : 0.15))
    for (var b2 = 0; b2 < voor.length; b2 += 3) {
      var q = voor[b2]
      g.save(); g.translate(q[0] + r() * 14, q[1] + 8); g.scale(bs, bs); boomVan(g, 0, -15, th, gb, r()); if (th.paddo && r() < 0.5) paddo(g, 5, 0); g.restore()
    }
    // grond met perspectief
    var gr = g.createLinearGradient(0, hor, 0, H)
    gr.addColorStop(0, kl(th.gras2, nacht ? -0.05 : 0.08)); gr.addColorStop(0.5, th.gras2); gr.addColorStop(1, kl(th.gras, -0.18))
    g.fillStyle = gr; g.fillRect(0, hor, W, H - hor)
    g.save(); g.beginPath(); g.rect(0, hor, W, H - hor); g.clip()
    for (var vl = 0; vl < 26; vl++) {
      var vy = hor + Math.pow(r(), 0.8) * (H - hor), d = (vy - hor) / (H - hor), vr = (30 + r() * 60) * (0.4 + d * 1.6) * schaal
      g.save(); g.translate(r() * W, vy); g.scale(1, 0.32); zachteVlek(g, 0, 0, vr, r() < 0.5 ? kl(th.gras2, 0.3, 0.35) : kl(th.gras, -0.3, 0.3)); g.restore()
    }
    // een kronkelpad naar de horizon
    if (!th.lava) {
      g.fillStyle = kl(th.pad, nacht ? -0.15 : 0, 0.9)
      g.beginPath(); g.moveTo(W * 0.36, H); g.bezierCurveTo(W * 0.5, H * 0.78, W * 0.36, H * 0.6, W * 0.5, hor + 1); g.lineTo(W * 0.53, hor + 1); g.bezierCurveTo(W * 0.46, H * 0.6, W * 0.72, H * 0.78, W * 0.66, H); g.closePath(); g.fill()
      g.strokeStyle = kl(th.pad2, -0.2, 0.6); g.lineWidth = 2; g.stroke()
      for (var kk = 0; kk < 30; kk++) {
        var ky = hor + Math.pow(r(), 0.7) * (H - hor), kd = (ky - hor) / (H - hor)
        g.fillStyle = kl(th.pad2, -0.1 - r() * 0.2, 0.8); g.beginPath(); g.ellipse(W * (0.5 + (r() - 0.5) * 0.18 * (0.3 + kd)), ky, (1.5 + kd * 4) * schaal, (0.8 + kd * 2) * schaal, 0, 0, 7); g.fill()
      }
    } else {
      // gloeiende lavarivier
      g.lineCap = 'round'
      ;[[18, 'rgba(255,90,20,0.35)'], [9, '#ff6a1a'], [4, '#ffd84a']].forEach(function (l) {
        g.strokeStyle = l[1]; g.lineWidth = l[0] * schaal; g.beginPath(); g.moveTo(W * 0.42, H); g.bezierCurveTo(W * 0.55, H * 0.75, W * 0.4, H * 0.6, W * 0.52, hor + 2); g.stroke()
      })
      for (var sc = 0; sc < 14; sc++) { var sxx = r() * W, syy = hor + 10 + r() * (H - hor); g.strokeStyle = 'rgba(255,150,40,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sxx, syy); g.lineTo(sxx + 10 + r() * 20, syy + (r() - 0.5) * 6); g.lineTo(sxx + 20 + r() * 25, syy + (r() - 0.5) * 8); g.stroke() }
    }
    // bloemen, stenen en plukjes gras
    var bloemKl = nacht ? ['#ff6ad8', '#8affea', '#ffd23d', '#c8a0ff'] : th.sneeuw ? ['#8ac8ff', '#ffffff', '#c8b0ff'] : ['#ff5a8a', '#ffd23d', '#ffffff', '#8ac8ff', '#ff8a3d']
    var dingen = []
    for (var di = 0; di < 70; di++) dingen.push({ y: hor + 6 + Math.pow(r(), 0.75) * (H - hor - 6), x: r() * W, s: r(), v: r() })
    dingen.sort(function (a, b) { return a.y - b.y }).forEach(function (o) {
      var d = (o.y - hor) / (H - hor), sch = (0.6 + d * 2.6) * schaal
      if (Math.abs(o.x - W * 0.51) < W * 0.08 * (0.3 + d)) return
      g.save(); g.translate(o.x, o.y); g.scale(sch, sch)
      if (o.s < 0.12) { g.translate(-8, -14); steen(g, 0, 0, th, o.v) }
      else if (o.s < 0.4 && !th.lava) bloem(g, 0, -2, bloemKl[(o.v * bloemKl.length) | 0], th, 1.1)
      else {
        for (var sp = 0; sp < 5; sp++) {
          var bx = (sp - 2) * 1.6, bh = 5 + ((sp * 7 + o.v * 10) % 4)
          g.strokeStyle = sp % 2 ? th.hoog2 : th.hoog; g.lineWidth = 1.1; g.lineCap = 'round'
          g.beginPath(); g.moveTo(bx, 0); g.quadraticCurveTo(bx + (sp - 2) * 0.4, -bh * 0.6, bx + (sp - 2) * 1.1, -bh); g.stroke()
        }
      }
      g.restore()
    })
    g.restore()
    // donkere randen zodat het midden oplicht
    var vg = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.45, Math.max(W, H) * 0.8)
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, nacht ? 'rgba(0,0,10,0.5)' : 'rgba(10,20,40,0.28)')
    g.fillStyle = vg; g.fillRect(0, 0, W, H)
  }
  // wat in het gevecht beweegt: wolken en zwevende deeltjes per gebied
  function arenaLeven(g, W, H, gb, tijd) {
    var th = THEMA[gb], hor = H * 0.42, i
    if (!th.nacht) {
      var ws = wolkSprite()
      for (i = 0; i < 4; i++) {
        var s = (0.35 + (i % 3) * 0.12) * Math.max(0.7, W / 1000), ww = 240 * s
        var x = ((tijd * (6 + i * 2) + i * (W + ww) / 4) % (W + ww)) - ww, y = hor * (0.12 + (i * 0.37 % 1) * 0.45)
        g.globalAlpha = 0.9; g.drawImage(ws, x, y - 66 * s, ww, 120 * s)
      }
      g.globalAlpha = 1
    }
    var n = th.sneeuw ? 50 : 26
    for (i = 0; i < n; i++) {
      var h = Math.sin(i * 91.7) * 43758.5453, f = h - Math.floor(h), f2 = (f * 7.13) % 1
      if (th.sneeuw) {
        var sy = ((tijd * (18 + f * 22) + f2 * H) % (H + 20)) - 10, sx = (f * W + Math.sin(tijd * 0.8 + i) * 18 + W) % W
        g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); rond(g, sx, sy, 1.2 + f2 * 2.2); g.fill()
      } else if (th.lava) {
        var ly = H - ((tijd * (25 + f * 30) + f2 * H) % (H * 0.9)), lx = f * W + Math.sin(tijd + i) * 12, la = Math.max(0, Math.min(1, (ly - H * 0.1) / (H * 0.5)))
        zachteVlek(g, lx, ly, 6, 'rgba(255,120,30,' + (0.5 * la).toFixed(2) + ')')
        g.fillStyle = 'rgba(255,220,120,' + la.toFixed(2) + ')'; g.fillRect(lx - 1, ly - 1, 2, 2)
      } else if (th.nacht) {
        var vx = f * W + Math.sin(tijd * 0.6 + i * 2) * 30, vy = hor + f2 * (H - hor) * 0.8 + Math.cos(tijd * 0.7 + i) * 16, va = 0.5 + Math.sin(tijd * 3 + i * 1.7) * 0.5
        zachteVlek(g, vx, vy, 9, th.sterren ? 'rgba(255,140,240,' + (0.5 * va).toFixed(2) + ')' : 'rgba(200,255,120,' + (0.5 * va).toFixed(2) + ')')
        g.fillStyle = 'rgba(255,255,220,' + va.toFixed(2) + ')'; g.beginPath(); rond(g, vx, vy, 1.6); g.fill()
      } else {
        var px2 = (f * W + tijd * (6 + f2 * 8)) % W, py = H * 0.95 - ((tijd * (8 + f * 10) + f2 * H) % (H * 0.85)), pa = 0.25 + Math.sin(tijd * 2 + i) * 0.2
        g.fillStyle = 'rgba(255,250,210,' + pa.toFixed(2) + ')'; g.beginPath(); rond(g, px2, py, 1.4 + f2 * 1.4); g.fill()
      }
    }
  }
  // het plateau waar een wezen op staat: grasschijf met een rand aarde, plukjes gras en een paar bloemetjes
  function plateau(g, cx, cy, r, gb) {
    var th = THEMA[gb], rx = r * 1.45, ry = r * 0.36, dik = r * 0.13, rn = rng(gb * 31 + Math.round(r))
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(cx + r * 0.08, cy + dik + r * 0.06, rx * 1.06, ry * 1.08, 0, 0, 7); g.fill()
    var zij = th.lava ? ['#4a3030', '#1e1212'] : th.sneeuw ? ['#bfe0f8', '#6a98c8'] : th.sterren ? ['#6a4ab8', '#2a1a5a'] : ['#8a6240', '#4a3020']
    var zg = g.createLinearGradient(0, cy, 0, cy + ry + dik); zg.addColorStop(0, zij[0]); zg.addColorStop(1, zij[1])
    g.fillStyle = zg; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI); g.lineTo(cx - rx, cy + dik); g.ellipse(cx, cy + dik, rx, ry, 0, Math.PI, 0, true); g.closePath(); g.fill()
    g.beginPath(); g.ellipse(cx, cy + dik, rx, ry, 0, 0, Math.PI); g.fill()
    if (th.lava) { g.strokeStyle = 'rgba(255,140,40,0.8)'; g.lineWidth = Math.max(1, r * 0.02); for (var l = 0; l < 4; l++) { var lx = cx - rx * 0.8 + l * rx * 0.5; g.beginPath(); g.moveTo(lx, cy + ry * 0.7); g.lineTo(lx + r * 0.05, cy + ry * 0.7 + dik * 0.8); g.stroke() } }
    var top = th.lava ? ['#5a4040', '#3a2828'] : [kl(th.gras2, 0.15), kl(th.gras, -0.12)]
    var tg = g.createRadialGradient(cx - rx * 0.2, cy - ry * 0.3, 0, cx, cy, rx); tg.addColorStop(0, top[0]); tg.addColorStop(1, top[1])
    g.fillStyle = tg; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fill()
    g.strokeStyle = th.lava ? 'rgba(255,150,60,0.35)' : 'rgba(255,255,255,0.28)'; g.lineWidth = Math.max(1, r * 0.025); g.beginPath(); g.ellipse(cx, cy - r * 0.01, rx * 0.97, ry * 0.94, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke()
    // plukjes gras langs de voorrand
    for (var p = 0; p < 22; p++) {
      var a = Math.PI * (0.04 + p / 21 * 0.92), bx = cx + Math.cos(a) * rx * 0.97, by = cy + Math.sin(a) * ry * 0.97, bh = r * (0.09 + rn() * 0.08)
      g.strokeStyle = th.lava ? (p % 2 ? '#7a5a4a' : '#5a4038') : p % 2 ? th.hoog2 : th.hoog; g.lineWidth = Math.max(1, r * 0.022); g.lineCap = 'round'
      for (var s = -1; s <= 1; s++) { g.beginPath(); g.moveTo(bx + s * r * 0.025, by); g.quadraticCurveTo(bx + s * r * 0.03, by - bh * 0.6, bx + s * r * 0.06 + (rn() - 0.5) * r * 0.03, by - bh * (s ? 0.75 : 1)); g.stroke() }
    }
    // een paar bloemetjes of kristallen achteraan
    var deco = th.nacht ? ['#ff6ad8', '#8affea'] : th.sneeuw ? ['#8ac8ff', '#ffffff'] : ['#ff5a8a', '#ffd23d', '#ffffff']
    for (var f = 0; f < 3; f++) {
      var fa = Math.PI * (1.15 + f * 0.33 + rn() * 0.1), fx = cx + Math.cos(fa) * rx * 0.8, fy = cy + Math.sin(fa) * ry * 0.75
      g.save(); g.translate(fx, fy); g.scale(r / 55, r / 55)
      if (th.lava) { g.fillStyle = '#ffb03a'; g.beginPath(); g.moveTo(0, -6); g.lineTo(2.4, 0); g.lineTo(-2.4, 0); g.fill(); zachteVlek(g, 0, -2, 7, 'rgba(255,140,40,0.5)') }
      else bloem(g, 0, -1.5, deco[f % deco.length], th, 1)
      g.restore()
    }
  }
  function wisCache() { grasCache = {}; wolkCache = null }

  return { T: T, DX: DX, DY: DY, AANTAL: AANTAL, GYMS: GYMS, DORPEN: DORPEN, THEMA: THEMA, kaart: kaart, gebiedVan: gebiedVan, opGebouw: opGebouw, dingOp: dingOp,
    laag: laag, gras: gras, golf: golf, gebouw: gebouw, persoon: persoon, bord: bord, hek: hek, uitroep: uitroep, sokkel: sokkel, embleem: embleem, gymType: gymType, px: px, kl: kl, rng: rng,
    arena: arena, arenaLeven: arenaLeven, plateau: plateau, wisCache: wisCache }
})()
