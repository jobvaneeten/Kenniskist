// Zelf getekende plaatjes voor de nieuwere auto's en werelden en voor de
// menu-achtergrond. Geen losse bestanden: BootScene maakt hier na het laden
// canvas-textures van, met dezelfde sleutels als de geladen plaatjes
// (hc_body_<id>, hc_wiel_<id>, lagen uit LEVELS[id].bg, hc_card_<id>).
import { VEHICLES, VEHICLE_ORDER } from './data/VehicleData.js'
import { LEVELS, LEVEL_ORDER } from './data/LevelData.js'

const S = 3              // tekenresolutie per wereld-pixel (scherp bij inzoomen)
const INK = '#150d2b'    // cartoon-omlijning, past bij de bestaande auto-art

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
function poly(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath() }
function grad(ctx, y0, y1, ...cols) {
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c))
  return g
}
function ink(ctx, lw = 2.4) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke() }
function glass(ctx, pts) {
  poly(ctx, pts)
  ctx.fillStyle = 'rgba(140,215,255,.30)'; ctx.fill(); ink(ctx, 2)
  // schuine glans
  ctx.save(); poly(ctx, pts); ctx.clip()
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  const x0 = Math.min(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  ctx.fillStyle = 'rgba(255,255,255,.35)'
  poly(ctx, [[x0 + 4, y1], [x0 + 10, y1], [x0 + 22, y0], [x0 + 16, y0]]); ctx.fill()
  ctx.restore()
}
function glow(ctx, x, y, r, col, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore()
}
function lamp(ctx, x, y, r, col) {
  glow(ctx, x, y, r * 3.2, col, 0.7)
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = col; ctx.fill(); ink(ctx, 1.6)
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill()
}
// donkere wielkasten uitsnijden binnen de carrosserie-vorm
function arches(ctx, shape, v, extra = 3) {
  const wy = v.chassisH / 2 + v.suspensionLength
  ctx.save(); poly(ctx, shape); ctx.clip()
  for (const k of [-1, 1]) {
    ctx.beginPath(); ctx.arc(k * v.wheelOffsetX, wy, v.wheelRadius + extra, 0, 7)
    ctx.fillStyle = '#0b0718'; ctx.fill(); ink(ctx, 2.4)
  }
  ctx.restore()
}
// lichte bovenrand: geeft volume aan een vlakke vorm
function sheen(ctx, shape, y0, y1) {
  ctx.save(); poly(ctx, shape); ctx.clip()
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(-300, y0, 600, y1 - y0)
  ctx.restore()
}
function body(ctx, shape, fill) { poly(ctx, shape); ctx.fillStyle = fill; ctx.fill() }

// ── auto's ────────────────────────────────────────────────────────────────
// top = bovenste wereld-y van de tekening (t.o.v. het chassis-midden); de
// onderkant volgt uit art.originY in VehicleData.
const CARS = {
  rally: {
    top: -44, rim: '#ffd23f',
    draw(ctx, v) {
      const shape = [[-76, 20], [-79, -6], [-62, -14], [-40, -16], [-28, -38], [10, -38], [32, -16], [66, -11], [80, -1], [79, 13], [70, 20]]
      // spoiler
      ctx.fillStyle = '#ff2f8e'; poly(ctx, [[-81, -27], [-58, -27], [-60, -21], [-80, -21]]); ctx.fill(); ink(ctx, 2)
      ctx.fillStyle = '#2a2050'; ctx.fillRect(-78, -22, 4, 9); ctx.fillRect(-68, -22, 4, 9)
      body(ctx, shape, grad(ctx, -38, 20, '#ffffff', '#dfe4ff', '#aeb7e8'))
      // racestrepen
      ctx.save(); poly(ctx, shape); ctx.clip()
      ctx.fillStyle = '#38bdf8'; poly(ctx, [[-90, 2], [90, -6], [90, 2], [-90, 10]]); ctx.fill()
      ctx.fillStyle = '#ff2f8e'; poly(ctx, [[-90, 12], [90, 4], [90, 9], [-90, 17]]); ctx.fill()
      ctx.restore()
      sheen(ctx, shape, -40, -12)
      arches(ctx, shape, v)
      poly(ctx, shape); ink(ctx)
      glass(ctx, [[-36, -17], [-26, -34], [-8, -34], [-8, -17]])
      glass(ctx, [[-3, -17], [-3, -34], [8, -34], [27, -17]])
      // nummer
      ctx.beginPath(); ctx.arc(-14, 0, 9, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ink(ctx, 1.8)
      ctx.fillStyle = INK; ctx.font = '900 13px Arial Black, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('7', -14, 1)
      // dakluchthapper
      ctx.fillStyle = '#2a2050'; poly(ctx, [[-14, -38], [4, -38], [2, -43], [-10, -43]]); ctx.fill(); ink(ctx, 1.6)
      lamp(ctx, 75, -3, 3.4, '#fff3b0'); lamp(ctx, -76, -2, 2.6, '#ff3b5c')
    },
  },
  pickup: {
    top: -52, rim: '#e9ecff',
    draw(ctx, v) {
      const shape = [[-92, 23], [-94, -11], [-14, -11], [-12, -15], [-8, -44], [28, -44], [46, -15], [86, -10], [94, 0], [93, 16], [84, 23]]
      body(ctx, shape, grad(ctx, -44, 23, '#ff7a45', '#ff4d3d', '#c62b2b'))
      ctx.save(); poly(ctx, shape); ctx.clip()
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(-100, 2, 200, 4)
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(-100, 14, 200, 12)
      ctx.restore()
      sheen(ctx, shape, -46, -8)
      arches(ctx, shape, v)
      poly(ctx, shape); ink(ctx)
      // laadbak-rand en lading (kratten)
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-90, -6); ctx.lineTo(-16, -6); ctx.stroke()
      ctx.fillStyle = '#b8792e'; poly(ctx, [[-80, -11], [-80, -30], [-56, -30], [-56, -11]]); ctx.fill(); ink(ctx, 2)
      ctx.strokeStyle = 'rgba(21,13,43,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-80, -20); ctx.lineTo(-56, -20); ctx.stroke()
      ctx.fillStyle = '#38bdf8'; poly(ctx, [[-52, -11], [-52, -24], [-34, -24], [-34, -11]]); ctx.fill(); ink(ctx, 2)
      glass(ctx, [[-4, -16], [-4, -40], [26, -40], [41, -16]])
      // rolbeugel met lampen
      ctx.strokeStyle = '#2a2050'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, -44); ctx.lineTo(-4, -48); ctx.lineTo(26, -48); ctx.lineTo(28, -44); ctx.stroke()
      for (const x of [0, 8, 16, 24]) lamp(ctx, x, -49, 2.2, '#ffd23f')
      ctx.fillStyle = '#2a2050'; ctx.fillRect(4, -6, 10, 3)
      lamp(ctx, 89, -3, 3.6, '#fff3b0'); lamp(ctx, -92, -4, 2.8, '#ff3b5c')
    },
  },
  buggy: {
    top: -52, rim: '#ff2f8e',
    draw(ctx, v) {
      // reservewiel achterop
      ctx.beginPath(); ctx.arc(-57, -17, 11, 0, 7); ctx.fillStyle = '#1d1a24'; ctx.fill(); ink(ctx, 2)
      ctx.beginPath(); ctx.arc(-57, -17, 5, 0, 7); ctx.fillStyle = '#ff2f8e'; ctx.fill(); ink(ctx, 1.5)
      // buizenframe (achter de bestuurder: de kooi zelf staat erboven)
      const tube = (pts) => {
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'
        ctx.strokeStyle = INK; ctx.lineWidth = 6.5; ctx.stroke()
        ctx.strokeStyle = '#ff2f8e'; ctx.lineWidth = 3.4; ctx.stroke()
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.stroke()
      }
      const shape = [[-66, -2], [-50, -9], [42, -9], [66, -2], [70, 8], [60, 17], [-60, 17]]
      body(ctx, shape, grad(ctx, -9, 17, '#ffe46b', '#ffd23f', '#d99a00'))
      sheen(ctx, shape, -10, -3)
      arches(ctx, shape, v, 2)
      poly(ctx, shape); ink(ctx)
      // motorblok + uitlaten
      ctx.fillStyle = '#3a3466'; ctx.fillRect(-58, -18, 18, 10); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(-58, -18, 18, 10)
      ctx.strokeStyle = '#c9cbe0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-58, -12); ctx.lineTo(-70, -6); ctx.stroke()
      tube([[-46, -9], [-32, -46], [14, -46], [36, -9]])
      tube([[-32, -46], [-12, -9]])
      tube([[44, -9], [62, -16], [70, -6]])
      // stoel
      ctx.fillStyle = '#2a2050'; poly(ctx, [[-30, -9], [-26, -30], [-20, -30], [-18, -9]]); ctx.fill(); ink(ctx, 1.8)
      lamp(ctx, 64, -18, 3.2, '#fff3b0'); lamp(ctx, -64, 6, 2.4, '#ff3b5c')
    },
  },
  legertruck: {
    top: -58, rim: '#9aa85a',
    draw(ctx, v) {
      // huif over de laadbak
      const huif = [[-100, 0], [-100, -42], [-94, -54], [-24, -54], [-18, -42], [-18, 0]]
      body(ctx, huif, grad(ctx, -54, 0, '#8f9b55', '#6f7d3c'))
      ctx.save(); poly(ctx, huif); ctx.clip()
      ctx.strokeStyle = 'rgba(21,13,43,.35)'; ctx.lineWidth = 2
      for (let x = -86; x < -20; x += 16) { ctx.beginPath(); ctx.moveTo(x, -56); ctx.lineTo(x, 2); ctx.stroke() }
      ctx.restore()
      poly(ctx, huif); ink(ctx)
      const shape = [[-100, 28], [-100, -2], [-16, -2], [-14, -50], [40, -50], [54, -20], [92, -16], [101, -4], [101, 20], [94, 28]]
      body(ctx, shape, grad(ctx, -50, 28, '#6d7d36', '#55632a', '#3b4520'))
      // camouflage-vlekken
      ctx.save(); poly(ctx, shape); ctx.clip()
      const R = rng(42)
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(40,48,20,.55)' : 'rgba(150,160,90,.35)'
        ctx.beginPath(); ctx.ellipse(-100 + R() * 200, -46 + R() * 70, 8 + R() * 10, 4 + R() * 6, R() * 3, 0, 7); ctx.fill()
      }
      ctx.restore()
      sheen(ctx, shape, -52, -44)
      arches(ctx, shape, v)
      poly(ctx, shape); ink(ctx)
      glass(ctx, [[-6, -22], [-6, -44], [36, -44], [47, -22]])
      // ster op de deur
      ctx.save(); ctx.translate(16, 2); ctx.beginPath()
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 9, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) }
      ctx.closePath(); ctx.fillStyle = '#f2f4e6'; ctx.fill(); ctx.restore()
      // grille + bumper
      ctx.fillStyle = '#2b3216'; ctx.fillRect(92, -10, 8, 26); ink(ctx, 0)
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(92, -10, 8, 26)
      ctx.fillStyle = '#2b3216'; ctx.fillRect(86, 20, 20, 6); ctx.strokeRect(86, 20, 20, 6)
      lamp(ctx, 96, -14, 3.4, '#fff3b0'); lamp(ctx, -98, 6, 2.8, '#ff3b5c')
    },
  },
  neonracer: {
    top: -34, rim: '#38bdf8',
    draw(ctx, v) {
      // underglow
      ctx.save(); ctx.globalCompositeOperation = 'lighter'
      const ug = ctx.createLinearGradient(0, 10, 0, 26); ug.addColorStop(0, 'rgba(255,47,142,.75)'); ug.addColorStop(1, 'rgba(255,47,142,0)')
      ctx.fillStyle = ug; ctx.beginPath(); ctx.ellipse(0, 16, 84, 9, 0, 0, 7); ctx.fill(); ctx.restore()
      // achtervleugel
      ctx.fillStyle = '#1a1238'; poly(ctx, [[-89, -26], [-66, -26], [-68, -20], [-88, -20]]); ctx.fill(); ink(ctx, 2)
      ctx.fillStyle = '#1a1238'; ctx.fillRect(-80, -21, 4, 10)
      const shape = [[-86, 15], [-89, -2], [-80, -11], [-50, -13], [-30, -28], [6, -30], [36, -14], [70, -8], [90, 2], [86, 10], [78, 15]]
      body(ctx, shape, grad(ctx, -30, 15, '#2c2163', '#1a1238', '#0d0920'))
      sheen(ctx, shape, -32, -10)
      arches(ctx, shape, v, 2)
      poly(ctx, shape); ink(ctx)
      // neonlijnen langs de flank
      ctx.save(); ctx.globalCompositeOperation = 'lighter'
      for (const [col, y, w] of [['#38bdf8', 2, 2.2], ['#ff2f8e', 8, 1.6]]) {
        ctx.strokeStyle = col; ctx.lineWidth = w + 5; ctx.globalAlpha = 0.25
        ctx.beginPath(); ctx.moveTo(-84, y); ctx.lineTo(84, y - 6); ctx.stroke()
        ctx.lineWidth = w; ctx.globalAlpha = 1; ctx.stroke()
      }
      ctx.restore()
      poly(ctx, [[-28, -14], [-22, -27], [6, -28], [30, -14]]); ctx.fillStyle = 'rgba(167,139,250,.38)'; ctx.fill(); ink(ctx, 2)
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.35)'; poly(ctx, [[-14, -14], [-8, -27], [-2, -27], [-8, -14]]); ctx.fill(); ctx.restore()
      // koplamp-streep en achterlicht-balk
      ctx.save(); ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(72, -6); ctx.lineTo(86, -1); ctx.stroke()
      ctx.restore(); glow(ctx, 82, -3, 14, '#38bdf8', 0.9)
      ctx.fillStyle = '#ff3b5c'; ctx.fillRect(-90, -8, 4, 8); glow(ctx, -88, -4, 12, '#ff3b5c', 0.9)
    },
  },
  raketauto: {
    top: -46, rim: '#ff3b5c',
    draw(ctx, v) {
      // staartvin
      ctx.fillStyle = '#ff3b5c'; poly(ctx, [[-70, -14], [-82, -44], [-66, -44], [-46, -16]]); ctx.fill(); ink(ctx, 2.2)
      // straalpijp
      ctx.fillStyle = '#3a3466'; poly(ctx, [[-72, -10], [-88, -14], [-88, 12], [-72, 10]]); ctx.fill(); ink(ctx, 2.2)
      ctx.fillStyle = '#ff8a3d'; ctx.fillRect(-89, -10, 3, 18)
      ctx.beginPath(); ctx.moveTo(-72, 20); ctx.lineTo(-74, -10)
      ctx.quadraticCurveTo(-60, -20, -30, -19); ctx.lineTo(56, -16)
      ctx.quadraticCurveTo(84, -12, 92, 2); ctx.quadraticCurveTo(84, 16, 56, 20); ctx.closePath()
      ctx.fillStyle = grad(ctx, -20, 20, '#ffffff', '#d8dcef', '#9aa1c4'); ctx.fill()
      const shape = [[-72, 20], [-74, -10], [-50, -18], [-30, -19], [56, -16], [80, -10], [92, 2], [80, 14], [56, 20]]
      ctx.save(); poly(ctx, shape); ctx.clip()
      ctx.fillStyle = '#ff3b5c'; ctx.fillRect(-100, 4, 200, 6)
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(-100, 10, 200, 2)
      ctx.restore()
      sheen(ctx, shape, -22, -14)
      arches(ctx, shape, v)
      ctx.beginPath(); ctx.moveTo(-72, 20); ctx.lineTo(-74, -10)
      ctx.quadraticCurveTo(-60, -20, -30, -19); ctx.lineTo(56, -16)
      ctx.quadraticCurveTo(84, -12, 92, 2); ctx.quadraticCurveTo(84, 16, 56, 20); ctx.closePath(); ink(ctx)
      // neuskegel
      ctx.beginPath(); ctx.moveTo(72, -13); ctx.quadraticCurveTo(88, -8, 92, 2); ctx.quadraticCurveTo(88, 12, 72, 17); ctx.closePath()
      ctx.fillStyle = '#ff3b5c'; ctx.fill(); ink(ctx, 2)
      // cockpitkoepel
      ctx.beginPath(); ctx.ellipse(10, -18, 24, 18, 0, Math.PI, 0); ctx.closePath()
      ctx.fillStyle = 'rgba(140,215,255,.32)'; ctx.fill(); ink(ctx, 2.2)
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(0, -28, 5, 7, -0.6, 0, 7); ctx.fill()
      // klinknagels
      ctx.fillStyle = '#7d84a8'; for (let x = -60; x < 60; x += 14) { ctx.beginPath(); ctx.arc(x, -10, 1.4, 0, 7); ctx.fill() }
      lamp(ctx, 84, -2, 3, '#fff3b0')
    },
  },
}

function makeWheel(scene, id, v, rim) {
  const r = (v.art?.disp ?? v.wheelRadius)
  const size = Math.ceil(r * 2 * S) + 4
  const key = `hc_wiel_${id}`
  if (scene.textures.exists(key)) scene.textures.remove(key)
  const ct = scene.textures.createCanvas(key, size, size)
  const ctx = ct.getContext()
  ctx.translate(size / 2, size / 2); ctx.scale(S, S)
  // band met profiel
  ctx.beginPath(); ctx.arc(0, 0, r - 0.6, 0, 7); ctx.fillStyle = '#1d1a24'; ctx.fill(); ink(ctx, 1.6)
  ctx.strokeStyle = '#34303f'; ctx.lineWidth = 2.2
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r - 1.5), Math.sin(a) * (r - 1.5)); ctx.lineTo(Math.cos(a) * (r - 4.5), Math.sin(a) * (r - 4.5)); ctx.stroke()
  }
  // velg
  const rr = r * 0.56
  const g = ctx.createRadialGradient(-rr * 0.3, -rr * 0.3, 1, 0, 0, rr)
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, rim); g.addColorStop(1, '#2a2050')
  ctx.beginPath(); ctx.arc(0, 0, rr, 0, 7); ctx.fillStyle = g; ctx.fill(); ink(ctx, 1.4)
  ctx.strokeStyle = 'rgba(21,13,43,.75)'; ctx.lineWidth = 1.8
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * rr * 0.3, Math.sin(a) * rr * 0.3); ctx.lineTo(Math.cos(a) * rr * 0.9, Math.sin(a) * rr * 0.9); ctx.stroke() }
  ctx.beginPath(); ctx.arc(0, 0, rr * 0.26, 0, 7); ctx.fillStyle = '#e9ecff'; ctx.fill(); ink(ctx, 1.2)
  ct.refresh()
}

function makeVehicle(scene, id) {
  const v = VEHICLES[id], car = CARS[id]
  const dw = v.chassisW * 1.35
  const top = car.top, h = -top / v.art.originY
  const key = `hc_body_${id}`
  if (scene.textures.exists(key)) scene.textures.remove(key)
  const ct = scene.textures.createCanvas(key, Math.ceil(dw * S), Math.ceil(h * S))
  const ctx = ct.getContext()
  ctx.translate(dw / 2 * S, -top * S); ctx.scale(S, S)
  car.draw(ctx, v)
  ct.refresh()
  makeWheel(scene, id, v, car.rim)
}

// ── werelden ──────────────────────────────────────────────────────────────
const LW = 1152, LH = 648   // laag-formaat (= schermformaat)
// Boven- en onderrand van de ver/dichtbij-lagen blijven leeg: de tileSprite
// schuift een klein beetje verticaal mee en herhaalt dan de rand.
const EDGE = 50

function skyGrad(ctx, ...cols) { ctx.fillStyle = grad(ctx, 0, LH, ...cols); ctx.fillRect(0, 0, LW, LH) }
function stars(ctx, R, n, maxY = LH * 0.6) {
  for (let i = 0; i < n; i++) {
    const s = R(); ctx.fillStyle = `rgba(255,255,255,${0.25 + s * 0.6})`
    const z = s > 0.93 ? 2.2 : 1.3; ctx.fillRect(R() * LW, R() * maxY, z, z)
  }
}
// golvende silhouet-lijn; periodiek over de laagbreedte zodat hij naadloos loopt
function ridgeY(x, base, parts) {
  return base + parts.reduce((s, [k, amp, ph]) => s + Math.sin(x / LW * Math.PI * 2 * k + ph) * amp, 0)
}
function ridge(ctx, base, parts, fill, edge, bottom = LH - EDGE) {
  ctx.beginPath(); ctx.moveTo(0, bottom)
  for (let x = 0; x <= LW; x += 8) ctx.lineTo(x, ridgeY(x, base, parts))
  ctx.lineTo(LW, bottom); ctx.closePath(); ctx.fillStyle = fill; ctx.fill()
  if (edge) {
    ctx.beginPath(); for (let x = 0; x <= LW; x += 8) ctx.lineTo(x, ridgeY(x, base, parts))
    ctx.strokeStyle = edge; ctx.lineWidth = 2; ctx.stroke()
  }
}
function fadeBottom(ctx) {
  // laatste stuk zacht laten uitlopen naar transparant
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'
  const g = ctx.createLinearGradient(0, LH - EDGE - 30, 0, LH - EDGE + 4)
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.fillStyle = g; ctx.fillRect(0, LH - EDGE - 30, LW, EDGE + 30); ctx.restore()
}
function palm(ctx, x, y, h, col, lean = 0.15) {
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round'
  ctx.lineWidth = h * 0.05; ctx.beginPath(); ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + h * lean, y - h * 0.5, x + h * lean * 1.4, y - h); ctx.stroke()
  const tx = x + h * lean * 1.4, ty = y - h
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + i / 6 * Math.PI, l = h * (0.45 + (i % 2) * 0.1)
    ctx.beginPath(); ctx.moveTo(tx, ty)
    ctx.quadraticCurveTo(tx + Math.cos(a) * l * 0.6, ty + Math.sin(a) * l * 0.6 - h * 0.08, tx + Math.cos(a) * l, ty + Math.sin(a) * l * 0.4 + h * 0.12)
    ctx.lineWidth = h * 0.04; ctx.stroke()
  }
}

const WORLDS = {
  jungle: {
    lucht(ctx, R) {
      skyGrad(ctx, '#030d1a', '#08283a', '#0f4a44', '#14604c')
      stars(ctx, R, 160, LH * 0.5)
      glow(ctx, LW * 0.72, LH * 0.22, 220, 'rgba(180,255,220,.35)')
      ctx.beginPath(); ctx.arc(LW * 0.72, LH * 0.22, 54, 0, 7); ctx.fillStyle = '#e9fff1'; ctx.fill()
      ctx.fillStyle = 'rgba(160,220,190,.35)'
      for (const [dx, dy, r] of [[-14, -10, 10], [16, 12, 7], [8, -20, 5]]) { ctx.beginPath(); ctx.arc(LW * 0.72 + dx, LH * 0.22 + dy, r, 0, 7); ctx.fill() }
    },
    ver(ctx, R) {
      ridge(ctx, LH * 0.5, [[2, 30, 0.4], [5, 14, 1.2], [11, 6, 2]], '#0c3a37', 'rgba(110,255,180,.25)')
      // boomkruinen op de heuvelrug
      ctx.fillStyle = '#0a302d'
      for (let x = 0; x < LW; x += 26) { const y = ridgeY(x, LH * 0.5, [[2, 30, 0.4], [5, 14, 1.2], [11, 6, 2]]); ctx.beginPath(); ctx.arc(x, y + 6, 16 + R() * 14, 0, 7); ctx.fill() }
      ridge(ctx, LH * 0.62, [[3, 22, 2.1], [7, 10, 0.3]], '#072622')
      for (let i = 0; i < 40; i++) glow(ctx, R() * LW, LH * 0.55 + R() * LH * 0.3, 4 + R() * 4, R() > 0.5 ? '#b6ff6a' : '#6affd0', 0.7)
      fadeBottom(ctx)
    },
    dichtbij(ctx, R) {
      ridge(ctx, LH * 0.78, [[4, 16, 0.2], [9, 8, 1.4]], '#04170f')
      for (let x = 30; x < LW; x += 150 + R() * 80) palm(ctx, x, LH * 0.8, 170 + R() * 90, '#04170f', (R() - 0.5) * 0.5)
      // varens
      ctx.fillStyle = '#062016'
      for (let x = 0; x < LW; x += 60) { ctx.beginPath(); ctx.ellipse(x, LH * 0.8, 34, 18, 0, 0, 7); ctx.fill() }
      // gloeiende paddenstoelen
      for (let i = 0; i < 9; i++) {
        const x = R() * LW, y = LH * 0.79, c = R() > 0.5 ? '#38bdf8' : '#ff2f8e'
        ctx.fillStyle = '#0c2a20'; ctx.fillRect(x - 2, y - 14, 4, 14)
        glow(ctx, x, y - 16, 26, c, 0.7)
        ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y - 16, 10, 6, 0, Math.PI, 0); ctx.fill()
      }
      fadeBottom(ctx)
    },
  },
  vulkaan: {
    lucht(ctx, R) {
      skyGrad(ctx, '#07020a', '#1d0610', '#4a0d0d', '#8a2508')
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = `rgba(20,6,10,${0.3 + R() * 0.4})`
        ctx.beginPath(); ctx.ellipse(R() * LW, R() * LH * 0.45, 80 + R() * 120, 16 + R() * 20, 0, 0, 7); ctx.fill()
      }
      for (let i = 0; i < 90; i++) { const x = R() * LW, y = R() * LH * 0.8; glow(ctx, x, y, 2 + R() * 3, '#ff8a3d', 0.8) }
    },
    ver(ctx, R) {
      // vulkanen met lavastromen
      for (const [cx, w, h] of [[LW * 0.28, 520, 300], [LW * 0.78, 420, 230]]) {
        const by = LH - EDGE, ty = by - h
        glow(ctx, cx, ty, 200, 'rgba(255,90,30,.6)')
        ctx.fillStyle = '#1a0708'
        ctx.beginPath(); ctx.moveTo(cx - w / 2, by); ctx.lineTo(cx - 40, ty); ctx.lineTo(cx + 40, ty); ctx.lineTo(cx + w / 2, by); ctx.closePath(); ctx.fill()
        ctx.save(); ctx.globalCompositeOperation = 'lighter'
        for (let k = 0; k < 4; k++) {
          ctx.strokeStyle = k % 2 ? '#ff6a2a' : '#ffb020'; ctx.lineWidth = 3 + R() * 3
          ctx.beginPath(); let x = cx - 30 + R() * 60, y = ty
          ctx.moveTo(x, y)
          while (y < by - 20) { y += 20; x += (R() - 0.5) * 30 + (k - 1.5) * 8; ctx.lineTo(x, y) }
          ctx.stroke()
        }
        ctx.restore()
        ctx.fillStyle = '#ffb020'; ctx.fillRect(cx - 40, ty - 2, 80, 4); glow(ctx, cx, ty, 60, '#ffd23f', 0.8)
      }
      fadeBottom(ctx)
    },
    dichtbij(ctx, R) {
      ctx.fillStyle = '#0d0405'; ctx.beginPath(); ctx.moveTo(0, LH - EDGE)
      for (let x = 0; x <= LW; x += 22) ctx.lineTo(x, LH * 0.74 - (R() * 60) * (Math.sin(x / LW * Math.PI * 6) > 0 ? 1 : 0.3))
      ctx.lineTo(LW, LH - EDGE); ctx.closePath(); ctx.fill()
      // gloeiende scheuren
      ctx.save(); ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 14; i++) {
        let x = R() * LW, y = LH * 0.8 + R() * 50
        ctx.strokeStyle = 'rgba(255,106,42,.85)'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(x, y)
        for (let k = 0; k < 4; k++) { x += 10 + R() * 18; y += (R() - 0.5) * 14; ctx.lineTo(x, y) }
        ctx.stroke()
      }
      ctx.restore()
      fadeBottom(ctx)
    },
  },
  mars: {
    lucht(ctx, R) {
      skyGrad(ctx, '#140b26', '#3d1a3f', '#8a3a3a', '#d0663a')
      stars(ctx, R, 120, LH * 0.4)
      for (const [x, y, r, c] of [[LW * 0.2, LH * 0.18, 26, '#e8d8c8'], [LW * 0.32, LH * 0.1, 12, '#c8b8a8']]) {
        glow(ctx, x, y, r * 3, 'rgba(255,220,200,.3)')
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = c; ctx.fill()
        ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.arc(x + r * 0.3, y + r * 0.1, r * 0.3, 0, 7); ctx.fill()
      }
    },
    ver(ctx) {
      // tafelbergen
      ctx.fillStyle = '#6b2a1c'
      for (const [x, w, h] of [[80, 260, 150], [420, 180, 110], [700, 320, 170], [1040, 200, 120]]) {
        ctx.beginPath(); ctx.moveTo(x - w / 2 - 40, LH - EDGE); ctx.lineTo(x - w / 2, LH - EDGE - h); ctx.lineTo(x + w / 2, LH - EDGE - h); ctx.lineTo(x + w / 2 + 40, LH - EDGE); ctx.closePath(); ctx.fill()
        ctx.fillStyle = 'rgba(255,170,120,.25)'; ctx.fillRect(x - w / 2, LH - EDGE - h, w, 3); ctx.fillStyle = '#6b2a1c'
      }
      ridge(ctx, LH * 0.7, [[2, 18, 1], [6, 8, 0.2]], '#7f3420')
      fadeBottom(ctx)
    },
    dichtbij(ctx, R) {
      ridge(ctx, LH * 0.8, [[3, 14, 0.5], [8, 6, 2]], '#4a1a10')
      for (let i = 0; i < 18; i++) {
        const x = R() * LW, y = LH * 0.8 + R() * 20, r = 8 + R() * 22
        ctx.fillStyle = '#3a140b'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.4, r, 0, Math.PI, 0); ctx.fill()
      }
      // onderzoeksbasis
      const bx = LW * 0.62, by = LH * 0.8
      ctx.fillStyle = '#2a1830'; ctx.beginPath(); ctx.arc(bx, by, 46, Math.PI, 0); ctx.fill()
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 46, Math.PI, 0); ctx.stroke()
      for (let i = 0; i < 4; i++) { glow(ctx, bx - 27 + i * 18, by - 18, 9, '#38bdf8', 0.9) }
      ctx.strokeStyle = '#2a1830'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx + 60, by); ctx.lineTo(bx + 60, by - 70); ctx.stroke()
      glow(ctx, bx + 60, by - 72, 12, '#ff3b5c', 1)
      fadeBottom(ctx)
    },
  },
  diepzee: {
    lucht(ctx, R) {
      skyGrad(ctx, '#0b5a7a', '#06304f', '#041a33', '#020818')
      // lichtbundels van boven
      ctx.save(); ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 7; i++) {
        const x = R() * LW, w = 40 + R() * 70
        const g = ctx.createLinearGradient(0, 0, 0, LH * 0.8); g.addColorStop(0, 'rgba(160,240,255,.16)'); g.addColorStop(1, 'rgba(160,240,255,0)')
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w * 2.4 + 120, LH * 0.8); ctx.lineTo(x + 120, LH * 0.8); ctx.closePath(); ctx.fill()
      }
      ctx.restore()
      for (let i = 0; i < 60; i++) { ctx.strokeStyle = 'rgba(190,240,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(R() * LW, R() * LH, 1 + R() * 3, 0, 7); ctx.stroke() }
    },
    ver(ctx, R) {
      ridge(ctx, LH * 0.62, [[2, 26, 0.9], [6, 12, 0.1]], '#06223a')
      // koraal-takken
      for (let i = 0; i < 16; i++) {
        const x = R() * LW, y = LH * 0.66, c = ['#ff2f8e', '#c084fc', '#38bdf8', '#ffb020'][i % 4]
        ctx.strokeStyle = '#0a2c48'; ctx.lineWidth = 6; ctx.lineCap = 'round'
        const tak = (x0, y0, a, l, d) => {
          if (d > 3) return
          const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineWidth = 6 - d * 1.3; ctx.stroke()
          if (d === 3) glow(ctx, x1, y1, 7, c, 0.9)
          tak(x1, y1, a - 0.45, l * 0.72, d + 1); tak(x1, y1, a + 0.45, l * 0.72, d + 1)
        }
        tak(x, y, -Math.PI / 2, 26 + R() * 18, 0)
      }
      fadeBottom(ctx)
    },
    dichtbij(ctx, R) {
      ridge(ctx, LH * 0.8, [[3, 12, 0.7], [7, 6, 1.9]], '#021220')
      // zeewier
      for (let x = 10; x < LW; x += 38 + R() * 40) {
        const h = 120 + R() * 160
        ctx.strokeStyle = '#03301f'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, LH * 0.82)
        for (let y = 0; y < h; y += 10) ctx.lineTo(x + Math.sin(y * 0.05 + x) * 12, LH * 0.82 - y)
        ctx.stroke()
      }
      // kwallen
      for (let i = 0; i < 5; i++) {
        const x = R() * LW, y = LH * 0.25 + R() * LH * 0.35
        glow(ctx, x, y, 40, '#ff2f8e', 0.55)
        ctx.fillStyle = 'rgba(255,140,200,.75)'; ctx.beginPath(); ctx.arc(x, y, 14, Math.PI, 0); ctx.fill()
        ctx.strokeStyle = 'rgba(255,140,200,.6)'; ctx.lineWidth = 1.5
        for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * 5, y); ctx.quadraticCurveTo(x + k * 5 + 6, y + 16, x + k * 4, y + 30); ctx.stroke() }
      }
      fadeBottom(ctx)
    },
  },
  neonstad: {
    lucht(ctx, R) {
      skyGrad(ctx, '#07061a', '#160f3d', '#3a1660', '#6a1d6e')
      stars(ctx, R, 180, LH * 0.5)
      const sx = LW * 0.5, sy = LH * 0.62, sr = 170
      glow(ctx, sx, sy, sr * 2.2, 'rgba(255,47,142,.4)')
      ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, sr, Math.PI, 0); ctx.closePath(); ctx.clip()
      ctx.fillStyle = grad(ctx, sy - sr, sy, '#ffd23f', '#ff7a45', '#ff2f8e'); ctx.fillRect(sx - sr, sy - sr, sr * 2, sr)
      ctx.globalCompositeOperation = 'destination-out'
      for (let i = 0; i < 7; i++) ctx.fillRect(sx - sr, sy - sr * 0.5 + i * 14, sr * 2, 2 + i * 1.5)
      ctx.restore()
    },
    ver(ctx, R) {
      let x = 0
      while (x < LW) {
        const bw = 30 + R() * 50, bh = 80 + R() * 180, by = LH - EDGE - bh
        ctx.fillStyle = '#0f0a2a'; ctx.fillRect(x, by, bw, bh)
        ctx.fillStyle = 'rgba(167,139,250,.35)'; ctx.fillRect(x, by, bw, 2)
        for (let wy = by + 8; wy < LH - EDGE - 6; wy += 10) for (let wx = x + 5; wx < x + bw - 5; wx += 8) {
          const r = R(); if (r > 0.74) { ctx.fillStyle = r > 0.94 ? '#ff2f8e' : r > 0.86 ? '#38bdf8' : '#ffd23f'; ctx.globalAlpha = 0.75; ctx.fillRect(wx, wy, 3, 5); ctx.globalAlpha = 1 }
        }
        if (bh > 200) { ctx.fillStyle = '#ff2f8e'; ctx.fillRect(x + bw / 2 - 1, by - 18, 2, 18); glow(ctx, x + bw / 2, by - 19, 9, '#ff2f8e', 1) }
        x += bw + 3 + R() * 8
      }
      fadeBottom(ctx)
    },
    dichtbij(ctx, R) {
      for (let x = 60; x < LW; x += 220 + R() * 120) palm(ctx, x, LH - EDGE, 200 + R() * 80, '#0a0618', (R() - 0.5) * 0.4)
      // neonborden
      for (const [x, y, w, h, c] of [[LW * 0.3, LH * 0.5, 110, 46, '#ff2f8e'], [LW * 0.82, LH * 0.44, 80, 60, '#38bdf8']]) {
        ctx.fillStyle = '#0a0618'; ctx.fillRect(x + w / 2 - 3, y + h, 6, LH - EDGE - y - h)
        ctx.fillStyle = 'rgba(10,6,24,.85)'; ctx.fillRect(x, y, w, h)
        ctx.save(); ctx.globalCompositeOperation = 'lighter'
        ctx.strokeStyle = c; ctx.globalAlpha = 0.3; ctx.lineWidth = 8; ctx.strokeRect(x, y, w, h)
        ctx.globalAlpha = 1; ctx.lineWidth = 2.5; ctx.strokeRect(x, y, w, h)
        ctx.fillStyle = c; ctx.font = '800 22px "Baloo 2", Arial Black, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(w > 100 ? 'KK' : '★', x + w / 2, y + h / 2 + 2)
        ctx.restore()
      }
      fadeBottom(ctx)
    },
  },
}

function makeLayer(scene, key, fn, seed) {
  if (scene.textures.exists(key)) scene.textures.remove(key)
  const ct = scene.textures.createCanvas(key, LW, LH)
  fn(ct.getContext(), rng(seed))
  ct.refresh()
  return ct.getSourceImage()
}

function makeWorld(scene, id) {
  const lvl = LEVELS[id], art = WORLDS[id]
  const imgs = ['lucht', 'ver', 'dichtbij'].map((laag, i) => makeLayer(scene, lvl.bg[i], art[laag], 99 + i * 31 + lvl.order * 7))
  // levelkaartje: de drie lagen + een strook terrein in de levelkleuren
  const key = `hc_card_${id}`
  if (scene.textures.exists(key)) scene.textures.remove(key)
  const cw = 400, ch = 240
  const ct = scene.textures.createCanvas(key, cw, ch)
  const ctx = ct.getContext()
  imgs.forEach(img => ctx.drawImage(img, 0, 0, LW, LH, -40, -20, cw + 80, (cw + 80) * LH / LW))
  const hex = n => '#' + n.toString(16).padStart(6, '0')
  const pal = lvl.palette
  ctx.beginPath(); ctx.moveTo(0, ch)
  for (let x = 0; x <= cw; x += 8) ctx.lineTo(x, ch * 0.78 + Math.sin(x * 0.03 + lvl.order) * 12 + Math.sin(x * 0.07) * 5)
  ctx.lineTo(cw, ch); ctx.closePath(); ctx.fillStyle = hex(pal.dirt); ctx.fill()
  ctx.strokeStyle = hex(pal.surface); ctx.lineWidth = 8; ctx.stroke()
  ctx.beginPath(); for (let x = 0; x <= cw; x += 8) ctx.lineTo(x, ch * 0.78 + Math.sin(x * 0.03 + lvl.order) * 12 + Math.sin(x * 0.07) * 5 - 3)
  ctx.strokeStyle = hex(pal.surfaceLight); ctx.lineWidth = 2.5; ctx.stroke()
  ct.refresh()
}

// ── menu-achtergrond: synthwave-garage bij nacht ─────────────────────────
function makeMenuBackdrop(scene) {
  const key = 'hc_neon_bg'
  if (scene.textures.exists(key)) return
  const W = 1152, H = 648, hy = H * 0.58
  const ct = scene.textures.createCanvas(key, W, H)
  const ctx = ct.getContext(), R = rng(7)
  ctx.fillStyle = grad(ctx, 0, hy, '#07061a', '#160f3d', '#3a1660', '#6a1d6e'); ctx.fillRect(0, 0, W, hy)
  for (let i = 0; i < 220; i++) { const s = R(); ctx.fillStyle = `rgba(255,255,255,${0.2 + s * 0.6})`; ctx.fillRect(R() * W, R() * hy * 0.9, s > 0.92 ? 2 : 1.2, s > 0.92 ? 2 : 1.2) }
  for (const [x, y, r, c] of [[W * 0.2, H * 0.2, 340, 'rgba(124,58,237,.18)'], [W * 0.85, H * 0.15, 280, 'rgba(56,189,248,.12)']]) glow(ctx, x, y, r, c)
  // zon
  const sx = W * 0.5, sr = 150
  glow(ctx, sx, hy, sr * 2.4, 'rgba(255,47,142,.35)')
  ctx.save(); ctx.beginPath(); ctx.arc(sx, hy, sr, Math.PI, 0); ctx.closePath(); ctx.clip()
  ctx.fillStyle = grad(ctx, hy - sr, hy, '#ffd23f', '#ff7a45', '#ff2f8e'); ctx.fillRect(sx - sr, hy - sr, sr * 2, sr)
  ctx.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 7; i++) ctx.fillRect(sx - sr, hy - sr * 0.5 + i * 12, sr * 2, 2 + i * 1.3)
  ctx.restore()
  // bergen met neonrand
  for (const [base, amp, fill, edge, n] of [[hy, 120, '#1a1040', 'rgba(167,139,250,.6)', 9], [hy, 70, '#120b30', 'rgba(255,47,142,.6)', 13]]) {
    ctx.beginPath(); ctx.moveTo(0, hy)
    const pts = []
    for (let i = 0; i <= n; i++) pts.push([i / n * W, base - (i % 2 ? amp * (0.5 + R() * 0.5) : amp * 0.15 * R())])
    pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(W, hy); ctx.closePath(); ctx.fillStyle = fill; ctx.fill()
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.strokeStyle = edge; ctx.lineWidth = 2; ctx.stroke()
  }
  // vloer met perspectief-raster
  ctx.fillStyle = grad(ctx, hy, H, '#1b0f45', '#0a0820', '#05040f'); ctx.fillRect(0, hy, W, H - hy)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = 'rgba(255,47,142,.45)'; ctx.lineWidth = 1.5
  for (let i = 0; i < 14; i++) { const t = (i / 14) ** 2, y = hy + t * (H - hy); ctx.globalAlpha = 0.25 + t * 0.75; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
  ctx.strokeStyle = 'rgba(56,189,248,.45)'
  for (let i = -20; i <= 20; i++) { ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(W / 2 + i * 14, hy); ctx.lineTo(W / 2 + i * 150, H); ctx.stroke() }
  ctx.restore()
  ctx.fillStyle = 'rgba(255,47,142,.9)'; ctx.fillRect(0, hy - 1, W, 2); glow(ctx, W / 2, hy, 500, 'rgba(255,47,142,.15)')
  ct.refresh()
}

// Klein wit rondje voor deeltjes (vonken, sterretjes, bellen).
function makeSparkTexture(scene) {
  if (scene.textures.exists('hc_spark')) return
  const ct = scene.textures.createCanvas('hc_spark', 32, 32)
  const ctx = ct.getContext()
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32)
  ct.refresh()
  if (!scene.textures.exists('hc_bel')) {
    const b = scene.textures.createCanvas('hc_bel', 24, 24), c = b.getContext()
    c.strokeStyle = 'rgba(200,245,255,.9)'; c.lineWidth = 2; c.beginPath(); c.arc(12, 12, 9, 0, 7); c.stroke()
    c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(8, 8, 2.5, 0, 7); c.fill()
    b.refresh()
  }
  if (!scene.textures.exists('hc_vlam')) {
    const f = scene.textures.createCanvas('hc_vlam', 96, 40), c = f.getContext()
    const g2 = c.createLinearGradient(96, 0, 0, 0)
    g2.addColorStop(0, 'rgba(255,255,230,1)'); g2.addColorStop(0.25, 'rgba(255,210,63,.95)'); g2.addColorStop(0.6, 'rgba(255,90,40,.7)'); g2.addColorStop(1, 'rgba(255,47,142,0)')
    c.fillStyle = g2; c.beginPath(); c.moveTo(96, 6); c.quadraticCurveTo(40, 2, 0, 20); c.quadraticCurveTo(40, 38, 96, 34); c.closePath(); c.fill()
    f.refresh()
  }
}

export function buildProceduralArt(scene) {
  VEHICLE_ORDER.filter(id => VEHICLES[id].procedural).forEach(id => makeVehicle(scene, id))
  LEVEL_ORDER.filter(id => LEVELS[id].procedural).forEach(id => makeWorld(scene, id))
  makeMenuBackdrop(scene)
  makeSparkTexture(scene)
}
