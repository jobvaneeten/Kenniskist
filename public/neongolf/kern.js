// ═══════════════════════════════════════════════════════════════════════════
//  NEONGOLF — kern: holes + physics. Geen DOM: wordt gedeeld door spel.js (browser)
//  en tools/neongolfTest.js (headless test: elke hole is binnen par oplosbaar).
//
//  Wereld: 1000×600 px. Tijd in seconden, vaste stap DT (bal beweegt per stap
//  minder dan zijn straal ⇒ kan nooit door een muur heen schieten).
// ═══════════════════════════════════════════════════════════════════════════
var NG = (function () {
  var W = 1000, H = 600
  var R = 8              // bal-straal
  var GAT_R = 13         // gat-straal
  var DT = 1 / 240
  var MAXV = 1150        // snelheid bij volle kracht (px/s)
  var VMAX = 1400        // absolute snelheidsgrens (bumpers/boost)
  var ROL = 260, ZAND = 1400, IJS = 45, LUCHT = 0.5   // afremming (px/s²) + snelheids-demping (1/s)
  var BOOST = 1700, MUUR_E = 0.78, BUMPER_E = 1.22
  var GAT_VANG = 450     // langzamer dan dit over het gat ⇒ erin
  var RUST_V = 12, RUST_N = 48

  // ── vorm-helpers ──
  function Rh(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] }

  // ── holes ──
  // rand: buitenmuur (polygoon) · blokken: massieve obstakels · zand/ijs/water:
  // zones · boost: {p, dir} · helling: {p, dir, kracht} · bumpers: [x,y,r] ·
  // schuif: rechthoek die heen en weer schuift · molen: draaiende armen ·
  // portalen: [ax,ay, bx,by] (eenrichting: in bij A, uit bij B, zelfde vaart)
  var HOLES = [
    // ── Baan 1: Neonpark — muren, bank-shots, bumpers, zand ──
    { naam: 'Eerste putt', par: 2, rand: Rh(150, 210, 700, 180), start: [240, 300], gat: [760, 300] },
    { naam: 'De bocht', par: 3, rand: [[120, 70], [400, 70], [400, 390], [880, 390], [880, 540], [120, 540]], start: [260, 150], gat: [800, 465] },
    { naam: 'Bumperbaan', par: 3, rand: Rh(100, 150, 800, 300), start: [180, 300], gat: [820, 300],
      bumpers: [[500, 300, 30], [420, 220, 22], [420, 380, 22], [600, 240, 22], [600, 360, 22]] },
    { naam: 'Zandbak', par: 3, rand: Rh(100, 170, 800, 260), start: [170, 300], gat: [840, 380],
      zand: [Rh(430, 170, 140, 260)], blokken: [Rh(650, 170, 30, 170), Rh(740, 260, 30, 170)] },
    { naam: 'Zigzag', par: 4, rand: Rh(80, 80, 840, 440), start: [160, 150], gat: [840, 450],
      blokken: [Rh(280, 80, 30, 330), Rh(500, 190, 30, 330), Rh(720, 80, 30, 330)] },
    { naam: 'Het eiland', par: 3, rand: Rh(100, 80, 800, 440), start: [180, 300], gat: [500, 300],
      // het gat ligt in een U die naar rechts openstaat: je moet er omheen
      blokken: [Rh(420, 220, 20, 160), Rh(420, 220, 150, 20), Rh(420, 360, 150, 20)],
      zand: [Rh(600, 120, 120, 70), Rh(600, 410, 120, 70)],
      bumpers: [[250, 150, 20], [250, 450, 20], [800, 300, 26]] },

    // ── Baan 2: Ruimtestation — portalen, boosts, schuifdeuren, ijs ──
    { naam: 'Warpgat', par: 2, rand: Rh(80, 120, 840, 360), start: [160, 300], gat: [840, 300],
      blokken: [Rh(480, 120, 40, 360)], portalen: [[400, 300, 600, 300]] },
    { naam: 'Turbo', par: 3, rand: [[80, 80], [920, 80], [920, 520], [80, 520], [80, 330], [760, 330], [760, 270], [80, 270]],
      start: [150, 175], gat: [150, 425], ijs: [Rh(760, 80, 160, 440)],
      boost: [{ p: Rh(300, 110, 120, 130), dir: [1, 0] }, { p: Rh(520, 360, 120, 130), dir: [-1, 0] }] },
    { naam: 'Schuifdeur', par: 3, rand: Rh(80, 150, 840, 300), start: [160, 300], gat: [840, 300],
      blokken: [Rh(480, 150, 40, 110), Rh(480, 340, 40, 110)],
      schuif: [{ x: 524, y: 255, w: 26, h: 90, dx: 0, dy: 90, periode: 2.4 }] },
    { naam: 'IJsbaan', par: 3, rand: Rh(80, 80, 840, 440), start: [150, 150], gat: [870, 470],
      ijs: [Rh(250, 80, 500, 440)], bumpers: [[400, 200, 26], [600, 400, 26], [500, 300, 20]],
      blokken: [Rh(780, 80, 30, 300)] },
    { naam: 'Portaalpuzzel', par: 3, rand: Rh(60, 80, 880, 440), start: [150, 300], gat: [870, 450],
      blokken: [Rh(340, 80, 30, 440), Rh(630, 80, 30, 440)],
      zand: [Rh(660, 80, 280, 130)],
      portalen: [[280, 170, 720, 140], [280, 430, 420, 300], [570, 170, 720, 450]] },
    { naam: 'Spiraal', par: 4, rand: Rh(80, 60, 840, 480), start: [140, 480], gat: [650, 300],
      blokken: [Rh(200, 170, 30, 370), Rh(200, 170, 600, 30), Rh(770, 200, 30, 230), Rh(350, 400, 420, 30)],
      boost: [{ p: Rh(400, 75, 120, 80), dir: [1, 0] }, { p: Rh(815, 250, 90, 120), dir: [0, 1] }, { p: Rh(500, 445, 120, 80), dir: [-1, 0] }] },

    // ── Baan 3: Laserfabriek — molens, hellingen, water ──
    { naam: 'Molen', par: 3, rand: Rh(80, 150, 840, 300), start: [160, 300], gat: [840, 300],
      blokken: [Rh(560, 150, 40, 110), Rh(560, 340, 40, 110)],
      molen: [{ x: 500, y: 300, len: 70, armen: 4, snelheid: 1.6 }] },
    { naam: 'Helling', par: 3, rand: Rh(80, 80, 840, 440), start: [150, 460], gat: [850, 140],
      helling: [{ p: Rh(300, 80, 400, 440), dir: [0, 1], kracht: 380 }], blokken: [Rh(700, 250, 30, 270)] },
    { naam: 'Watergracht', par: 3, rand: Rh(80, 100, 840, 400), start: [160, 300], gat: [840, 300],
      water: [Rh(420, 100, 160, 120), Rh(420, 260, 160, 80), Rh(420, 380, 160, 120)],
      bumpers: [[700, 200, 22], [700, 400, 22]] },
    { naam: 'Dubbele molen', par: 4, rand: Rh(60, 120, 880, 360), start: [130, 300], gat: [870, 300],
      blokken: [Rh(330, 120, 30, 140), Rh(330, 340, 30, 140), Rh(640, 120, 30, 140), Rh(640, 340, 30, 140)],
      molen: [{ x: 270, y: 300, len: 60, armen: 3, snelheid: 1.4 }, { x: 580, y: 300, len: 60, armen: 3, snelheid: -1.8 }] },
    { naam: 'Flipperkast', par: 3, rand: Rh(150, 40, 700, 520), start: [500, 500], gat: [500, 85],
      helling: [{ p: Rh(150, 40, 700, 520), dir: [0, 1], kracht: 250 }],
      bumpers: [[350, 190, 26], [650, 190, 26], [420, 310, 22], [580, 310, 22]] },
    { naam: 'Finale', par: 4, rand: Rh(60, 60, 880, 480), start: [130, 480], gat: [850, 470],
      // drie kamers: onderdoor (of via het portaal), langs molen en water, bovenlangs naar het gat
      blokken: [Rh(300, 60, 30, 380), Rh(660, 160, 30, 380), Rh(760, 380, 160, 20)],
      water: [Rh(400, 400, 190, 140)],
      zand: [Rh(700, 200, 220, 90)],
      molen: [{ x: 495, y: 250, len: 75, armen: 4, snelheid: 1.3 }],
      portalen: [[200, 120, 400, 110]] },

    // ── Baan 4: Magneetmijn — blauwe magneten trekken, rode duwen ──
    { naam: 'Trekkracht', par: 3, rand: Rh(100, 170, 800, 260), start: [180, 300], gat: [820, 240],
      blokken: [Rh(480, 170, 40, 180)], magneten: [{ x: 500, y: 395, r: 150, kracht: 700 }] },
    { naam: 'Afstoten', par: 3, rand: Rh(100, 120, 800, 360), start: [180, 300], gat: [820, 300],
      blokken: [Rh(480, 120, 40, 90), Rh(480, 390, 40, 90)], magneten: [{ x: 500, y: 300, r: 170, kracht: -1900 }] },
    { naam: 'Magneetbocht', par: 3, rand: [[120, 70], [400, 70], [400, 390], [880, 390], [880, 540], [120, 540]], start: [260, 150], gat: [820, 465],
      magneten: [{ x: 260, y: 465, r: 140, kracht: 700 }, { x: 640, y: 465, r: 90, kracht: -700 }] },
    { naam: 'Slinger', par: 4, rand: Rh(80, 80, 840, 440), start: [150, 450], gat: [850, 150],
      blokken: [Rh(380, 220, 240, 160)],
      magneten: [{ x: 500, y: 130, r: 120, kracht: 600 }, { x: 500, y: 470, r: 120, kracht: -900 }] },
    { naam: 'Mijngang', par: 4, rand: Rh(80, 80, 840, 440), start: [160, 150], gat: [850, 450],
      blokken: [Rh(300, 80, 30, 330), Rh(560, 190, 30, 330)], zand: [Rh(700, 80, 220, 120)],
      magneten: [{ x: 315, y: 465, r: 110, kracht: 500 }, { x: 575, y: 135, r: 110, kracht: 500 }] },
    { naam: 'Magneetveld', par: 3, rand: Rh(100, 80, 800, 440), start: [150, 300], gat: [850, 300],
      bumpers: [[500, 300, 24]],
      magneten: [{ x: 350, y: 190, r: 110, kracht: 800 }, { x: 350, y: 410, r: 110, kracht: -800 }, { x: 650, y: 190, r: 110, kracht: -800 }, { x: 650, y: 410, r: 110, kracht: 800 }] },

    // ── Baan 5: Laserlab — lasers zijn muren die aan en uit gaan ──
    { naam: 'Laserpoort', par: 2, rand: Rh(150, 200, 700, 200), start: [240, 300], gat: [760, 300],
      lasers: [{ a: [500, 200], b: [500, 400], periode: 2.4, aan: 0.5 }] },
    { naam: 'Dubbel licht', par: 3, rand: Rh(100, 170, 800, 260), start: [170, 300], gat: [840, 300],
      lasers: [{ a: [380, 170], b: [380, 430], periode: 2, aan: 0.5 }, { a: [620, 170], b: [620, 430], periode: 2, aan: 0.5, fase: 1 }] },
    { naam: 'Laserdoolhof', par: 4, rand: Rh(80, 80, 840, 440), start: [160, 150], gat: [840, 450],
      blokken: [Rh(280, 80, 30, 330), Rh(500, 190, 30, 330), Rh(720, 80, 30, 330)],
      lasers: [{ a: [295, 410], b: [295, 520], periode: 3, aan: 0.5 }, { a: [515, 80], b: [515, 190], periode: 3, aan: 0.5, fase: 1.5 }, { a: [735, 410], b: [735, 520], periode: 3, aan: 0.5 }] },
    { naam: 'Schakelbaan', par: 3, rand: Rh(80, 150, 840, 300), start: [160, 300], gat: [840, 300],
      lasers: [{ a: [350, 150], b: [350, 300], periode: 2, aan: 0.6 }, { a: [500, 300], b: [500, 450], periode: 2, aan: 0.6, fase: 0.66 }, { a: [650, 150], b: [650, 300], periode: 2, aan: 0.6, fase: 1.33 }] },
    { naam: 'IJslaser', par: 3, rand: Rh(80, 80, 840, 440), start: [150, 150], gat: [850, 450],
      ijs: [Rh(250, 80, 500, 440)], bumpers: [[500, 180, 22], [500, 420, 22]],
      lasers: [{ a: [250, 300], b: [750, 300], periode: 3, aan: 0.5 }] },
    { naam: 'Laserportaal', par: 3, rand: Rh(80, 120, 840, 360), start: [160, 300], gat: [850, 300],
      blokken: [Rh(480, 120, 40, 360), Rh(760, 200, 160, 20), Rh(760, 380, 160, 20)],
      portalen: [[400, 200, 600, 400], [400, 400, 600, 200]],
      lasers: [{ a: [760, 220], b: [760, 380], periode: 2.5, aan: 0.5 }] },

    // ── Baan 6: Sterrenpoort — alles door elkaar ──
    { naam: 'Ruimtewals', par: 3, rand: Rh(80, 150, 840, 300), start: [160, 300], gat: [850, 300],
      molen: [{ x: 500, y: 300, len: 80, armen: 4, snelheid: 1.2 }], magneten: [{ x: 750, y: 300, r: 130, kracht: 600 }] },
    { naam: 'Kosmische flipper', par: 3, rand: Rh(150, 40, 700, 520), start: [500, 500], gat: [500, 85],
      helling: [{ p: Rh(150, 40, 700, 520), dir: [0, 1], kracht: 220 }],
      bumpers: [[330, 200, 24], [670, 200, 24], [400, 420, 20], [600, 420, 20]],
      magneten: [{ x: 500, y: 300, r: 100, kracht: -900 }] },
    { naam: 'Portaalcarrousel', par: 3, rand: Rh(60, 80, 880, 440), start: [150, 300], gat: [870, 300],
      blokken: [Rh(340, 80, 30, 440), Rh(630, 80, 30, 440)],
      portalen: [[280, 300, 420, 150], [570, 450, 720, 300]],
      molen: [{ x: 500, y: 300, len: 70, armen: 3, snelheid: 1.5 }] },
    { naam: 'Gletsjer', par: 4, rand: Rh(80, 80, 840, 440), start: [150, 150], gat: [680, 450],
      ijs: [Rh(80, 80, 840, 440)], zand: [Rh(600, 380, 150, 140)],
      blokken: [Rh(400, 80, 30, 280), Rh(400, 420, 30, 100)], bumpers: [[250, 400, 24], [800, 200, 24]] },
    { naam: 'Sterrenregen', par: 4, rand: Rh(80, 60, 840, 480), start: [130, 300], gat: [870, 300],
      bumpers: [[300, 180, 20], [300, 420, 20], [450, 300, 24], [600, 160, 20], [600, 440, 20], [750, 300, 20]],
      water: [Rh(420, 60, 160, 70), Rh(420, 470, 160, 70)] },
    { naam: 'Eindbaas', par: 5, rand: Rh(40, 40, 920, 520), start: [120, 120], gat: [860, 480],
      blokken: [Rh(280, 40, 30, 400), Rh(640, 160, 30, 400)],
      magneten: [{ x: 160, y: 420, r: 100, kracht: -700 }],
      molen: [{ x: 460, y: 300, len: 80, armen: 4, snelheid: 1.3 }],
      water: [Rh(360, 470, 200, 90)], zand: [Rh(720, 40, 240, 100)],
      lasers: [{ a: [655, 40], b: [655, 160], periode: 2.6, aan: 0.5 }] },
  ]
  var BANEN = [
    { naam: 'Neonpark', kleur: '#3ef0ff', van: 0 },
    { naam: 'Ruimtestation', kleur: '#c06bff', van: 6 },
    { naam: 'Laserfabriek', kleur: '#ff4fa3', van: 12 },
    { naam: 'Magneetmijn', kleur: '#ffb13d', van: 18 },
    { naam: 'Laserlab', kleur: '#8f9bff', van: 24 },
    { naam: 'Sterrenpoort', kleur: '#8cff5a', van: 30 },
  ]

  // vaste muren als lijnstukken (rand + blokken)
  function voorbereid(h) {
    if (h._seg) return h
    var seg = []
    function ring(p) { for (var i = 0; i < p.length; i++) { var a = p[i], b = p[(i + 1) % p.length]; seg.push([a[0], a[1], b[0], b[1]]) } }
    ring(h.rand); (h.blokken || []).forEach(ring)
    h._seg = seg
    return h
  }

  function binnen(p, x, y) {
    var c = false
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
      var xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1]
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c
    }
    return c
  }
  function inZone(lijst, x, y) { if (!lijst) return false; for (var i = 0; i < lijst.length; i++) if (binnen(lijst[i], x, y)) return true; return false }

  // ── bewegende obstakels op tijdstip t ──
  function schuifPos(s, t) {
    var f = 0.5 - 0.5 * Math.cos(2 * Math.PI * t / s.periode)
    var df = Math.PI / s.periode * Math.sin(2 * Math.PI * t / s.periode)
    return { x: s.x + s.dx * f, y: s.y + s.dy * f, vx: s.dx * df, vy: s.dy * df }
  }
  function molenHoek(m, t) { return m.snelheid * t + (m.fase || 0) }
  // laser: een muur die periodiek aan- en uitgaat
  function laserFase(l, t) { var p = ((t + (l.fase || 0)) % l.periode + l.periode) % l.periode; return p / l.periode }
  function laserAan(l, t) { return laserFase(l, t) < (l.aan ?? 0.5) }

  // ── bal ──
  function nieuweBal(h) { return { x: h.start[0], y: h.start[1], vx: 0, vy: 0, t: 0, rust: 0, port: -1, klaar: null } }
  function schiet(b, hoek, kracht) {
    var v = Math.max(0, Math.min(1, kracht)) * MAXV
    b.vx = Math.cos(hoek) * v; b.vy = Math.sin(hoek) * v; b.rust = 0; b.klaar = null
  }

  // cirkel tegen lijnstuk, met snelheid van het lijnstuk op het contactpunt
  function botsSeg(b, x1, y1, x2, y2, sx, sy, e, rr, hit) {
    var dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1
    var u = ((b.x - x1) * dx + (b.y - y1) * dy) / l2
    u = u < 0 ? 0 : u > 1 ? 1 : u
    var qx = x1 + u * dx, qy = y1 + u * dy
    var nx = b.x - qx, ny = b.y - qy, d = Math.sqrt(nx * nx + ny * ny)
    if (d >= rr) return false
    if (d < 1e-6) { nx = -dy; ny = dx; d = Math.sqrt(nx * nx + ny * ny) }
    nx /= d; ny /= d
    b.x = qx + nx * rr; b.y = qy + ny * rr
    var rvx = b.vx - sx, rvy = b.vy - sy, vn = rvx * nx + rvy * ny
    if (vn < 0) {
      rvx -= (1 + e) * vn * nx; rvy -= (1 + e) * vn * ny
      b.vx = rvx + sx; b.vy = rvy + sy
      if (hit) hit.push({ x: qx, y: qy, kracht: -vn })
    }
    return true
  }

  // één tijdstap. Geeft null of een gebeurtenis: 'gat' | 'water' | 'rust'
  // hits (optioneel): verzamelt botsingen voor geluid/effecten
  function stap(b, h, hits) {
    voorbereid(h)
    var t = b.t += DT
    var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
    var duwt = false
    // zones die versnellen
    if (h.helling) for (var i = 0; i < h.helling.length; i++) {
      var hl = h.helling[i]
      if (binnen(hl.p, b.x, b.y)) { b.vx += hl.dir[0] * hl.kracht * DT; b.vy += hl.dir[1] * hl.kracht * DT; duwt = true }
    }
    if (h.boost) for (i = 0; i < h.boost.length; i++) {
      var bo = h.boost[i]
      if (binnen(bo.p, b.x, b.y)) { b.vx += bo.dir[0] * BOOST * DT; b.vy += bo.dir[1] * BOOST * DT; duwt = true }
    }
    // magneten: blauw (+) trekt aan, rood (−) duwt weg; sterker dichterbij
    if (h.magneten) for (i = 0; i < h.magneten.length; i++) {
      var mg = h.magneten[i], mx = mg.x - b.x, my = mg.y - b.y, md = Math.sqrt(mx * mx + my * my)
      if (md < mg.r && md > 6) {
        var mf = mg.kracht * (1 - md / mg.r) / md
        b.vx += mx * mf * DT; b.vy += my * mf * DT; duwt = true
      }
    }
    // afremmen (ondergrond)
    sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
    if (sp > 0) {
      var rem = inZone(h.zand, b.x, b.y) ? ZAND : inZone(h.ijs, b.x, b.y) ? IJS : ROL
      var nsp = sp - (rem + LUCHT * sp) * DT
      if (nsp < 0) nsp = 0
      if (nsp > VMAX) nsp = VMAX
      b.vx *= nsp / sp; b.vy *= nsp / sp
    }
    b.x += b.vx * DT; b.y += b.vy * DT

    // botsingen
    var s = h._seg
    for (i = 0; i < s.length; i++) botsSeg(b, s[i][0], s[i][1], s[i][2], s[i][3], 0, 0, MUUR_E, R, hits)
    if (h.bumpers) for (i = 0; i < h.bumpers.length; i++) {
      var bp = h.bumpers[i], dx = b.x - bp[0], dy = b.y - bp[1], d = Math.sqrt(dx * dx + dy * dy), rr = bp[2] + R
      if (d < rr && d > 0) {
        var nx = dx / d, ny = dy / d
        b.x = bp[0] + nx * rr; b.y = bp[1] + ny * rr
        var vn = b.vx * nx + b.vy * ny
        if (vn < 0) {
          b.vx -= (1 + BUMPER_E) * vn * nx; b.vy -= (1 + BUMPER_E) * vn * ny
          // altijd een stevige trap, ook bij een zacht tikje
          var uit = b.vx * nx + b.vy * ny
          if (uit < 260) { b.vx += (260 - uit) * nx; b.vy += (260 - uit) * ny }
          if (hits) hits.push({ x: bp[0], y: bp[1], kracht: 400, bumper: i })
        }
      }
    }
    if (h.schuif) for (i = 0; i < h.schuif.length; i++) {
      var sc = h.schuif[i], p = schuifPos(sc, t), rs = Rh(p.x, p.y, sc.w, sc.h)
      for (var k = 0; k < 4; k++) { var a = rs[k], c = rs[(k + 1) % 4]; botsSeg(b, a[0], a[1], c[0], c[1], p.vx, p.vy, MUUR_E, R, hits) }
    }
    if (h.lasers) for (i = 0; i < h.lasers.length; i++) {
      var ls = h.lasers[i]
      if (laserAan(ls, t)) botsSeg(b, ls.a[0], ls.a[1], ls.b[0], ls.b[1], 0, 0, MUUR_E, R + 2, hits)
    }
    if (h.molen) for (i = 0; i < h.molen.length; i++) {
      var m = h.molen[i], hk = molenHoek(m, t)
      for (k = 0; k < m.armen; k++) {
        var ah = hk + k * 2 * Math.PI / m.armen
        var tx = m.x + Math.cos(ah) * m.len, ty = m.y + Math.sin(ah) * m.len
        // snelheid van de arm op de plek van de bal (ω × r)
        var rx = b.x - m.x, ry = b.y - m.y
        botsSeg(b, m.x, m.y, tx, ty, -m.snelheid * ry, m.snelheid * rx, 0.6, R + 5, hits)
      }
      var hdx = b.x - m.x, hdy = b.y - m.y, hd = Math.sqrt(hdx * hdx + hdy * hdy)
      if (hd < R + 12 && hd > 0) { b.x = m.x + hdx / hd * (R + 12); b.y = m.y + hdy / hd * (R + 12) }
    }
    sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy)

    // portalen (eenrichting; pas opnieuw actief als de bal uit de uitgang is)
    if (h.portalen) {
      if (b.port >= 0) {
        var po = h.portalen[b.port]
        if (Math.hypot(b.x - po[2], b.y - po[3]) > 26) b.port = -1
      } else for (i = 0; i < h.portalen.length; i++) {
        var pa = h.portalen[i]
        if (Math.hypot(b.x - pa[0], b.y - pa[1]) < 15) { b.x = pa[2]; b.y = pa[3]; b.port = i; if (hits) hits.push({ x: pa[2], y: pa[3], portaal: true, kracht: 0 }); break }
      }
    }

    // gat: langzaam genoeg ⇒ erin; te hard ⇒ de rand buigt de bal wat af
    var gx = h.gat[0] - b.x, gy = h.gat[1] - b.y, gd = Math.sqrt(gx * gx + gy * gy)
    if (gd < GAT_R) {
      if (sp < GAT_VANG || (gd < GAT_R * 0.45 && sp < GAT_VANG * 1.5)) { b.klaar = 'gat'; b.vx = b.vy = 0; return 'gat' }
      b.vx += gx / gd * 2200 * DT; b.vy += gy / gd * 2200 * DT
    }
    if (inZone(h.water, b.x, b.y)) { b.klaar = 'water'; return 'water' }

    // rust: een tijdje (bijna) stil ⇒ volgende slag
    // (op een helling of boost pas als hij er echt vastligt, bv. tegen een muur)
    if (sp < RUST_V) b.rust++; else b.rust = 0
    if (b.rust >= (duwt ? RUST_N * 2 : RUST_N)) { b.vx = b.vy = 0; b.klaar = 'rust'; return 'rust' }
    return null
  }

  // simuleer een slag tot het einde; geeft de eindstand
  function speelSlag(h, x, y, t, hoek, kracht, maxT) {
    var b = { x: x, y: y, vx: 0, vy: 0, t: t, rust: 0, port: -1, klaar: null }
    schiet(b, hoek, kracht)
    var n = Math.round((maxT || 14) / DT), e
    for (var i = 0; i < n; i++) { e = stap(b, h); if (e) break }
    return { x: b.x, y: b.y, t: b.t, uit: e || 'rust' }
  }

  // richtlijn: korte voorspelling tot de eerste botsing
  function voorspel(h, x, y, t, hoek, kracht, maxLen) {
    var b = { x: x, y: y, vx: 0, vy: 0, t: t, rust: 0, port: -1, klaar: null }
    schiet(b, hoek, kracht)
    var pts = [[x, y]], len = 0, hits = []
    for (var i = 0; i < 2400 && len < maxLen; i++) {
      var ox = b.x, oy = b.y
      var e = stap(b, h, hits)
      len += Math.hypot(b.x - ox, b.y - oy)
      if (i % 6 === 0) pts.push([b.x, b.y])
      if (e || hits.length) { pts.push([b.x, b.y]); break }
    }
    return pts
  }

  function sterren(slagen, par) { return slagen <= par - 1 ? 3 : slagen <= par ? 2 : slagen <= par + 2 ? 1 : 0 }
  function maxSlagen(par) { return par + 6 }

  var api = {
    W: W, H: H, R: R, GAT_R: GAT_R, DT: DT, MAXV: MAXV, HOLES: HOLES, BANEN: BANEN, Rh: Rh,
    voorbereid: voorbereid, binnen: binnen, inZone: inZone, schuifPos: schuifPos, molenHoek: molenHoek, laserAan: laserAan, laserFase: laserFase,
    nieuweBal: nieuweBal, schiet: schiet, stap: stap, speelSlag: speelSlag, voorspel: voorspel,
    sterren: sterren, maxSlagen: maxSlagen,
  }
  return api
})()
if (typeof globalThis !== 'undefined') globalThis.NG = NG
