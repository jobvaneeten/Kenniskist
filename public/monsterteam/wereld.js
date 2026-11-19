// ═══════════════════════════════════════════════════════════════════════════
//  MONSTERTEAM: de wereld om doorheen te lopen. Dorpen met een wezenhuis, een
//  winkel en een gym; routes met hoog gras (wilde wezens), trainers die je
//  uitdagen als je in hun zicht loopt, spullen op de grond en wachters die je
//  pas doorlaten als je de leider van het dorp hebt verslagen.
//
//  Gebieden liggen boven elkaar: startdorp, route 1, dorp 1, route 2, ... en
//  helemaal bovenaan de Sterrenpoort. Alles wordt met een vast zaad gemaakt:
//  elke keer dezelfde wereld. Getekend in pixels (16 per vakje).
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
        'In de winkel koop je glimbollen en drankjes.',
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
      k.dingen.push({ soort: 'bord', x: 12, y: H - 3, tekst: 'De Sterrenpoort. Alleen wie alle acht badges heeft, mag hier komen.' })
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

  // ── tekenen in pixels ──
  function px(g, x, y, w, h, k) { g.fillStyle = k; g.fillRect(x, y, w || 1, h || 1) }
  function tegel(g, k, c, x, y, tijd, ruis) {
    var th = k.thema, X = x * T, Y = y * T
    px(g, X, Y, T, T, th.gras)
    for (var q = 0; q < 6; q++) { var r = ruis(x, y, q); px(g, X + (r * 997 % T | 0), Y + (r * 7919 % T | 0), 1, 2, th.gras2) }
    if (th.sterren && ruis(x, y, 9) < 0.15) px(g, X + (ruis(x, y, 10) * T | 0), Y + (ruis(x, y, 11) * T | 0), 1, 1, '#ffffff')
    if (c === '=') {
      px(g, X, Y, T, T, th.pad)
      for (var p = 0; p < 4; p++) { var rp = ruis(x, y, p + 20); px(g, X + (rp * 991 % 14 | 0) + 1, Y + (rp * 3011 % 14 | 0) + 1, 2, 1, th.pad2) }
    } else if (c === 'g') {
      // hoog gras: een dicht veld van spitse sprieten die zachtjes wiegen
      px(g, X, Y, T, T, th.hoog)
      for (var rij = 0; rij < 2; rij++) for (var s = 0; s < 4; s++) {
        var bx = X + s * 4 + (rij ? 2 : 0), by = Y + rij * 8, sway = Math.round(Math.sin(tijd * 2.4 + x * 0.7 + y * 0.9 + s + rij) * 0.8)
        px(g, bx, by + 6, 4, 2, shade(th.hoog, -0.25))
        px(g, bx + 1 + sway, by + 1, 2, 6, th.hoog2)
        px(g, bx + sway, by + 3, 1, 3, th.hoog2); px(g, bx + 3 + sway, by + 3, 1, 3, th.hoog2)
        px(g, bx + 1 + sway, by + 1, 1, 2, shade(th.hoog2, 0.3))
      }
    } else if (c === 'f') {
      var bk = ['#ff5a8a', '#ffd23d', '#ffffff', '#8ac8ff'][(ruis(x, y, 30) * 4) | 0]
      px(g, X + 4, Y + 6, 3, 3, bk); px(g, X + 5, Y + 7, 1, 1, '#ffe14f'); px(g, X + 10, Y + 10, 3, 3, bk); px(g, X + 11, Y + 11, 1, 1, '#ffe14f')
      px(g, X + 5, Y + 9, 1, 3, th.hoog); px(g, X + 11, Y + 13, 1, 2, th.hoog)
    } else if (c === 'T') {
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(X + 9, Y + 15, 7, 2, 0, 0, 7); g.fill()
      px(g, X + 6, Y + 10, 4, 6, '#5a3a22'); px(g, X + 6, Y + 10, 1, 6, '#7a5a3a')
      g.fillStyle = th.boom; g.beginPath(); g.arc(X + 8, Y + 7, 7, 0, 7); g.fill()
      g.fillStyle = th.boom2; g.beginPath(); g.arc(X + 6, Y + 5, 4, 0, 7); g.fill()
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(X + 5, Y + 3, 1.6, 0, 7); g.fill()
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.arc(X + 10, Y + 10, 4, 0, 7); g.fill()
      if (th.paddo && ruis(x, y, 40) < 0.3) { px(g, X + 12, Y + 13, 3, 2, '#ff5fd8'); px(g, X + 13, Y + 15, 1, 1, '#ffffff') }
    } else if (c === '~') {
      px(g, X, Y, T, T, th.water)
      var gl = th.lava ? '#ffd23d' : '#bfe4ff'
      for (var w = 0; w < 3; w++) { var wx = (X + ((tijd * (th.lava ? 4 : 8) + w * 5 + x * 3) % 14)) | 0; px(g, wx, Y + 3 + w * 5, 3, 1, gl) }
    } else if (c === 'r') {
      g.fillStyle = th.rots; g.beginPath(); g.moveTo(X + 2, Y + 14); g.lineTo(X + 4, Y + 5); g.lineTo(X + 9, Y + 2); g.lineTo(X + 14, Y + 7); g.lineTo(X + 14, Y + 14); g.closePath(); g.fill()
      px(g, X + 5, Y + 6, 3, 1, 'rgba(255,255,255,0.35)')
      if (th.sterren) { px(g, X + 8, Y + 5, 2, 2, '#ff9af0') }
    }
  }
  function gebouw(g, b, k) {
    var X = b.x * T, Y = b.y * T, W = b.w * T, H = b.h * T
    var dak = b.soort === 'gym' ? MTDATA().KLEUR[gymType(b.gym)] : { wezenhuis: '#ff5a8a', winkel: '#3f7fff', thuis: '#c2503a', huis: b.dak || '#5a8aff' }[b.soort]
    // schaduw op het gras
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(X + 4, Y + H, W - 2, 4); g.fillRect(X + W, Y + T, 4, H - T + 2)
    // muur met planken
    px(g, X + 1, Y + T * 1.5, W - 2, H - T * 1.5, '#efe4d0'); px(g, X + 1, Y + H - 2, W - 2, 2, '#c9b898')
    for (var pl = Y + T * 1.5 + 5; pl < Y + H - 2; pl += 5) px(g, X + 1, pl, W - 2, 1, '#e2d4bc')
    px(g, X + 1, Y + T * 1.5, 2, H - T * 1.5, '#d8c8aa'); px(g, X + W - 3, Y + T * 1.5, 2, H - T * 1.5, '#d8c8aa')
    // dak
    var dakH = T * 1.7
    for (var r = 0; r < dakH; r++) px(g, X - 1 + Math.round(r * 0.15), Y + r, W + 2 - Math.round(r * 0.3), 1, r % 4 === 0 ? shade(dak, -0.18) : dak)
    px(g, X - 1, Y + dakH - 1, W + 2, 2, shade(dak, -0.35))
    // ramen
    for (var w = X + 6; w < X + W - 12; w += 16) if (Math.abs(w + 5 - (b.deur[0] * T + 8)) > 10) { px(g, w, Y + T * 2.2, 10, 9, '#2a3a5a'); px(g, w + 1, Y + T * 2.2 + 1, 8, 7, '#8ac8ff'); px(g, w + 1, Y + T * 2.2 + 1, 3, 2, '#d8f0ff') }
    // deur
    var dx = b.deur[0] * T + 3, dy = b.deur[1] * T + 2
    px(g, dx, dy, 10, 14, '#5a3a22'); px(g, dx + 1, dy + 1, 8, 13, '#7a4e2a'); px(g, dx + 7, dy + 8, 1, 1, '#ffd23d')
    px(g, dx + 2, dy + 3, 6, 4, '#8a5e3a')
    px(g, dx - 2, dy + 14, 14, 2, '#b8584a')
    // bloembakken onder de ramen
    for (var bb = X + 6; bb < X + W - 12; bb += 16) if (Math.abs(bb + 5 - (b.deur[0] * T + 8)) > 10) { px(g, bb, Y + T * 2.2 + 10, 10, 3, '#7a4e2a'); px(g, bb + 1, Y + T * 2.2 + 8, 2, 2, '#ff5a8a'); px(g, bb + 5, Y + T * 2.2 + 8, 2, 2, '#ffd23d'); px(g, bb + 8, Y + T * 2.2 + 8, 1, 2, '#ff5a8a') }
    // bord met teken
    var bx = X + W / 2 - 8, by = Y + 4
    if (b.soort === 'wezenhuis') { px(g, bx, by, 16, 12, '#ffffff'); g.fillStyle = '#ff5a8a'; g.beginPath(); g.arc(bx + 5.5, by + 5, 3, 0, 7); g.arc(bx + 10.5, by + 5, 3, 0, 7); g.moveTo(bx + 2.6, by + 6); g.lineTo(bx + 8, by + 11); g.lineTo(bx + 13.4, by + 6); g.fill() }
    if (b.soort === 'winkel') { px(g, bx, by, 16, 12, '#ffffff'); px(g, bx + 3, by + 3, 10, 2, '#3f7fff'); px(g, bx + 4, by + 5, 8, 4, '#3f7fff'); px(g, bx + 5, by + 9, 2, 2, '#14142a'); px(g, bx + 10, by + 9, 2, 2, '#14142a') }
    if (b.soort === 'gym') {
      var tk = MTDATA().KLEUR[gymType(b.gym)]
      g.fillStyle = '#14142a'; g.beginPath(); g.arc(bx + 8, by + 7, 8, 0, 7); g.fill()
      g.strokeStyle = tk; g.lineWidth = 2; g.stroke()
      embleem(g, gymType(b.gym), bx + 8, by + 7, 5, tk)
      px(g, X + 2, Y + H - 7, W - 4, 2, tk)
    }
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
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, gg = n >> 8 & 255, b = n & 255, t = f < 0 ? 0 : 255, p = Math.abs(f)
    return 'rgb(' + Math.round((t - r) * p + r) + ',' + Math.round((t - gg) * p + gg) + ',' + Math.round((t - b) * p + b) + ')'
  }
  // een poppetje van 16x16: pet, haar, gezicht, jas, broek; vier kanten en twee loopstapjes
  function persoon(g, x, y, r, stap, kl) {
    kl = kl || {}
    var pet = kl.pet || '#e83a3a', jas = kl.jas || '#2f6fe0', haar = kl.haar || '#3a2a1a', huid = '#f4c9a0', broek = kl.broek || '#2a2a44'
    var X = Math.round(x), Y = Math.round(y), bob = stap ? 1 : 0
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(X + 8, Y + 15, 5, 2, 0, 0, 7); g.fill()
    // benen
    var l1 = stap === 1 ? 1 : 0, l2 = stap === 2 ? 1 : 0
    px(g, X + 5, Y + 11 - l1, 2, 4, broek); px(g, X + 9, Y + 11 - l2, 2, 4, broek)
    px(g, X + 5, Y + 14 - l1, 2, 1, '#1a1a1a'); px(g, X + 9, Y + 14 - l2, 2, 1, '#1a1a1a')
    // lijf
    px(g, X + 4, Y + 7 - bob, 8, 5, jas); px(g, X + 4, Y + 7 - bob, 8, 1, shade(jas, 0.25))
    if (r === 1 || r === 3) px(g, X + (r === 1 ? 7 : 6), Y + 8 - bob, 3, 3, shade(jas, -0.25))
    else { px(g, X + 3, Y + 8 - bob, 1, 3, jas); px(g, X + 12, Y + 8 - bob, 1, 3, jas); px(g, X + 3, Y + 11 - bob, 1, 1, huid); px(g, X + 12, Y + 11 - bob, 1, 1, huid) }
    // hoofd
    px(g, X + 4, Y + 2 - bob, 8, 6, huid)
    px(g, X + 4, Y + 1 - bob, 8, 2, haar)
    if (r === 0) px(g, X + 4, Y + 2 - bob, 8, 5, haar)
    if (r === 2) { px(g, X + 5, Y + 4 - bob, 1, 2, '#14142a'); px(g, X + 10, Y + 4 - bob, 1, 2, '#14142a'); px(g, X + 7, Y + 6 - bob, 2, 1, '#c86a5a') }
    if (r === 1) { px(g, X + 9, Y + 4 - bob, 1, 2, '#14142a'); px(g, X + 4, Y + 3 - bob, 2, 4, haar) }
    if (r === 3) { px(g, X + 6, Y + 4 - bob, 1, 2, '#14142a'); px(g, X + 10, Y + 3 - bob, 2, 4, haar) }
    // pet met klep
    px(g, X + 4, Y - bob, 8, 2, pet); px(g, X + 5, Y - 1 - bob, 6, 1, pet)
    if (r === 2) px(g, X + 4, Y + 2 - bob, 8, 1, shade(pet, -0.3))
    if (r === 1) px(g, X + 11, Y + 1 - bob, 3, 1, shade(pet, -0.3))
    if (r === 3) px(g, X + 2, Y + 1 - bob, 3, 1, shade(pet, -0.3))
    px(g, X + 6, Y - bob, 2, 1, '#ffffff')
  }

  return { T: T, DX: DX, DY: DY, AANTAL: AANTAL, GYMS: GYMS, DORPEN: DORPEN, THEMA: THEMA, kaart: kaart, gebiedVan: gebiedVan, opGebouw: opGebouw, dingOp: dingOp,
    tegel: tegel, gebouw: gebouw, persoon: persoon, embleem: embleem, gymType: gymType, px: px, rng: rng }
})()
