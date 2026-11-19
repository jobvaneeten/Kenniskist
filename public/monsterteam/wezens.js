// ═══════════════════════════════════════════════════════════════════════════
//  MONSTERTEAM: de wezens tekenen. Alles met code getekend (geen plaatjes):
//  een lijf, oren, staart, extra's per stadium, ogen en kleur van het element.
//  Gebruikt door spel.js en tools/monsterteamPlaat.mjs (plaat met alle wezens).
//  tekenWezen(g, id, x, y, r, o): o = { t, kijk, alfa, wit, schaal, stil, silhouet }
// ═══════════════════════════════════════════════════════════════════════════
var MTZ = (function () {
  var S = MT.SOORTEN
  function licht(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255
    var t = f < 0 ? 0 : 255, p = Math.abs(f)
    return 'rgb(' + Math.round((t - r) * p + r) + ',' + Math.round((t - g) * p + g) + ',' + Math.round((t - b) * p + b) + ')'
  }
  // eigen kleur per wezen: het element, iets verschoven zodat soortgenoten verschillen
  function wezenKleur(id) {
    var basis = MT.KLEUR[S[id].type], h = 0
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997
    var n = parseInt(basis.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255
    var f = 0.82 + (h % 36) / 100, sch = (h % 3) - 1
    var kan = [r, g, b]
    kan[(h >> 2) % 3] = Math.min(255, kan[(h >> 2) % 3] + sch * 22)
    return '#' + kan.map(function (c) { return ('0' + Math.max(0, Math.min(255, Math.round(c * f))).toString(16)).slice(-2) }).join('')
  }
  var DEELTJE = { vuur: '#ff9a3d', water: '#9fe0ff', plant: '#9aff7a', bliksem: '#ffe14f', schaduw: '#c88aff', ijs: '#e0f6ff', aarde: '#d8b07a', lucht: '#ffffff' }
  var IRIS = { schaduw: '#ff4fd8', vuur: '#c25a14', water: '#1f4fa8', plant: '#2a7a3a', bliksem: '#a87a00', ijs: '#2a8ac8', aarde: '#6a4a1a', lucht: '#3a6ac8' }
  var witDoek = typeof document !== 'undefined' ? document.createElement('canvas') : null

  function rrPad(P, x, y, w, h, r) { P.moveTo(x + r, y); P.arcTo(x + w, y, x + w, y + h, r); P.arcTo(x + w, y + h, x, y + h, r); P.arcTo(x, y + h, x, y, r); P.arcTo(x, y, x + w, y, r); P.closePath() }
  // ═════════════ echte lichaamsbouw per soort (vorm uit kern.js) ═════════════
  // Alles kijkt naar rechts; r = maat. Stadium 1 is klein en schattig (grote kop),
  // stadium 3 groot en stoer (klauwen, tanden, harnas, gloed).
  function deel(R, P, kleur, cx, cy, s) {
    var g = R.g
    if (R.sil) { g.fillStyle = R.k; g.fill(P); g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.stroke(P); return }
    g.save(); g.fillStyle = kleur; g.fill(P); g.clip(P)
    if (s) {
      var hl = g.createRadialGradient(cx - s * 0.35, cy - s * 0.4, 0, cx - s * 0.35, cy - s * 0.4, s * 1.1)
      hl.addColorStop(0, 'rgba(255,255,255,0.42)'); hl.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = hl; g.fillRect(cx - s * 2, cy - s * 2, s * 4, s * 4)
      g.fillStyle = 'rgba(0,0,30,0.22)'; g.beginPath(); g.ellipse(cx + s * 0.55, cy + s * 0.6, s * 0.9, s * 0.7, -0.5, 0, 7); g.fill()
    }
    g.restore()
    g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.stroke(P)
  }
  function ell(cx, cy, rx, ry, rot) { var P = new Path2D(); P.ellipse(cx, cy, rx, ry, rot || 0, 0, 7); return P }
  function oogZij(R, x, y, s, boos) {
    var g = R.g; if (R.sil) return
    if (R.knip) { g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.beginPath(); g.moveTo(x - s, y); g.quadraticCurveTo(x, y + s * 0.6, x + s, y); g.stroke(); return }
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x, y, s * 0.85, s, 0, 0, 7); g.fill(); g.strokeStyle = R.lijn; g.lineWidth = R.lw * 0.8; g.stroke()
    if (R.gloei) { g.save(); g.shadowColor = R.iris; g.shadowBlur = s * 1.5 }
    g.fillStyle = R.iris; g.beginPath(); g.ellipse(x + s * 0.25, y + s * 0.05, s * 0.55, s * 0.72, 0, 0, 7); g.fill()
    if (R.gloei) g.restore()
    g.fillStyle = '#0e0e1e'; g.beginPath(); g.ellipse(x + s * 0.32, y + s * 0.08, s * 0.3, s * 0.45, 0, 0, 7); g.fill()
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + s * 0.42, y - s * 0.32, s * 0.22, 0, 7); g.fill()
    if (boos) { g.fillStyle = R.kop || R.k; g.beginPath(); g.moveTo(x - s * 1.1, y - s * 1.25); g.lineTo(x + s * 1.1, y - s * 0.45); g.lineTo(x + s * 1.1, y - s * 1.3); g.closePath(); g.fill(); g.strokeStyle = R.lijn; g.lineWidth = R.lw * 1.1; g.beginPath(); g.moveTo(x - s * 1.0, y - s * 1.15); g.lineTo(x + s * 1.05, y - s * 0.5); g.stroke() }
  }
  function oogVoor(R, x, y, s, afst, boos) { oogZij(R, x - afst, y, s, boos); oogZij(R, x + afst, y, s, boos) }
  function wang(R, x, y, s) { if (R.sil) return; R.g.fillStyle = 'rgba(255,110,150,0.4)'; R.g.beginPath(); R.g.ellipse(x, y, s, s * 0.6, 0, 0, 7); R.g.fill() }
  function tanden(R, x, y, s, n) { if (R.sil) return; var g = R.g; g.fillStyle = '#ffffff'; g.strokeStyle = R.lijn; g.lineWidth = R.lw * 0.5; for (var i = 0; i < n; i++) { g.beginPath(); g.moveTo(x + i * s * 0.9, y); g.lineTo(x + i * s * 0.9 + s * 0.4, y + s); g.lineTo(x + i * s * 0.9 + s * 0.8, y); g.closePath(); g.fill(); g.stroke() } }
  function klauwen(R, x, y, s) { if (R.sil) return; var g = R.g; g.fillStyle = '#f4ecd8'; g.strokeStyle = R.lijn; g.lineWidth = R.lw * 0.5; for (var i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x + i * s * 0.6 + s * 0.5, y - s * 0.2); g.quadraticCurveTo(x + i * s * 0.6 + s * 1.2, y, x + i * s * 0.6 + s * 0.7, y + s * 0.5); g.lineTo(x + i * s * 0.6 + s * 0.3, y + s * 0.1); g.closePath(); g.fill(); g.stroke() } }
  function gloedVlek(R, x, y, s, kl, a) { if (R.sil) return; R.g.save(); R.g.globalCompositeOperation = 'lighter'; NK.vlek(R.g, x, y, s, kl, a); R.g.restore() }
  function vlam(R, x, y, s, hoek) {
    var g = R.g, t = R.t, fl = Math.sin(t * 10 + x) * s * 0.12
    g.save(); g.translate(x, y); g.rotate(hoek || 0)
    var P = new Path2D(); P.moveTo(-s * 0.45, 0); P.quadraticCurveTo(-s * 0.5, -s * 0.7, fl, -s * 1.3); P.quadraticCurveTo(s * 0.5, -s * 0.7, s * 0.45, 0); P.closePath()
    deel(R, P, '#ff7a2a'); if (!R.sil) { var Q = new Path2D(); Q.moveTo(-s * 0.22, 0); Q.quadraticCurveTo(-s * 0.2, -s * 0.5, fl * 0.6, -s * 0.85); Q.quadraticCurveTo(s * 0.25, -s * 0.45, s * 0.22, 0); Q.closePath(); g.fillStyle = '#ffe14f'; g.fill(Q) }
    g.restore()
  }
  function kopExtra(R, x, y, s) {
    // dingen bovenop de kop, afhankelijk van het stadium-extra
    var g = R.g, ex = R.L.extra, P
    if (ex === 'kroon') { P = new Path2D(); P.moveTo(x - s * 0.45, y); P.lineTo(x - s * 0.5, y - s * 0.5); P.lineTo(x - s * 0.22, y - s * 0.25); P.lineTo(x, y - s * 0.62); P.lineTo(x + s * 0.22, y - s * 0.25); P.lineTo(x + s * 0.5, y - s * 0.5); P.lineTo(x + s * 0.45, y); P.closePath(); deel(R, P, '#ffd23d', x, y - s * 0.3, s * 0.5); if (!R.sil) { g.fillStyle = '#ff4f7a'; g.beginPath(); g.arc(x, y - s * 0.15, s * 0.09, 0, 7); g.fill() } }
    if (ex === 'horens' || (R.stad === 3 && R.ruw)) { [-1, 1].forEach(function (z) { P = new Path2D(); P.moveTo(x + z * s * 0.25, y + s * 0.05); P.quadraticCurveTo(x + z * s * 0.35 - s * 0.2, y - s * 0.7, x + z * s * 0.2 - s * 0.45, y - s * 0.95); P.quadraticCurveTo(x + z * s * 0.45 - s * 0.05, y - s * 0.5, x + z * s * 0.5, y + s * 0.05); P.closePath(); deel(R, P, '#f4ecd8', x, y - s * 0.4, s * 0.4) }) }
    if (ex === 'kristal') { [[-0.3, -0.3, 0.45], [0.05, -0.05, 0.6], [0.35, 0.25, 0.4]].forEach(function (q) { g.save(); g.translate(x + q[0] * s, y); g.rotate(q[1]); P = new Path2D(); P.moveTo(0, -q[2] * s); P.lineTo(q[2] * s * 0.32, 0); P.lineTo(0, q[2] * s * 0.2); P.lineTo(-q[2] * s * 0.32, 0); P.closePath(); deel(R, P, R.type === 'vuur' ? '#ffb02e' : R.type === 'bliksem' ? '#fff3a0' : '#bff0ff', 0, -q[2] * s * 0.4, q[2] * s * 0.5); g.restore() }); gloedVlek(R, x, y - s * 0.3, s, R.type === 'vuur' ? '#ff8a3d' : '#9fe8ff', 0.35) }
    if (ex === 'bloem') { for (var b = 0; b < 5; b++) { var h = b * 1.257; P = new Path2D(); P.arc(x + Math.cos(h) * s * 0.22, y - s * 0.15 + Math.sin(h) * s * 0.22, s * 0.17, 0, 7); deel(R, P, '#ff8ad8') } P = new Path2D(); P.arc(x, y - s * 0.15, s * 0.13, 0, 7); deel(R, P, '#ffe14f') }
    if (ex === 'paddo') { P = new Path2D(); P.moveTo(x - s * 1.0, y + s * 0.15); P.bezierCurveTo(x - s * 0.95, y - s * 1.05, x + s * 0.95, y - s * 1.05, x + s * 1.0, y + s * 0.15); P.quadraticCurveTo(x, y - s * 0.12, x - s * 1.0, y + s * 0.15); deel(R, P, '#e8443a', x, y - s * 0.4, s * 0.8); if (!R.sil) { g.fillStyle = '#ffffff'; [[-0.5, -0.25, 0.14], [0.1, -0.55, 0.17], [0.55, -0.15, 0.11], [-0.1, -0.1, 0.08]].forEach(function (q) { g.beginPath(); g.arc(x + q[0] * s, y + q[1] * s, q[2] * s, 0, 7); g.fill() }) } }
    if (ex === 'maan') { P = new Path2D(); P.arc(x, y + s * 0.15, s * 0.2, 0, 7); deel(R, P, '#fff6cf'); if (!R.sil) { g.fillStyle = R.k; g.beginPath(); g.arc(x + s * 0.09, y + s * 0.1, s * 0.16, 0, 7); g.fill() } }
    if (ex === 'golfkam' || ex === 'schelp') { P = new Path2D(); P.moveTo(x - s * 0.5, y + s * 0.1); P.quadraticCurveTo(x - s * 0.3, y - s * 0.7, x, y - s * 0.45); P.quadraticCurveTo(x + s * 0.3, y - s * 0.85, x + s * 0.55, y + s * 0.1); P.closePath(); deel(R, P, R.hel, x, y - s * 0.3, s * 0.5) }
    if (ex === 'wolk') { [[-0.35, 0, 0.28], [0, -0.15, 0.34], [0.35, 0, 0.28]].forEach(function (q) { P = new Path2D(); P.arc(x + q[0] * s, y + q[1] * s, q[2] * s, 0, 7); deel(R, P, '#ffffff') }) }
  }
  function staartDeel(R, x, y, s, hoek) {
    var g = R.g, st = R.L.staart, t = R.t, P
    g.save(); g.translate(x, y); g.rotate(hoek || 0)
    if (st === 'vlam') { vlam(R, 0, 0, s * 1.1, -1.2 + Math.sin(t * 3) * 0.1) }
    else if (st === 'flits') { P = new Path2D(); P.moveTo(0, -s * 0.1); P.lineTo(-s * 0.5, -s * 0.4); P.lineTo(-s * 0.35, -s * 0.5); P.lineTo(-s * 1.1, -s * 1.1); P.lineTo(-s * 0.55, -s * 0.75); P.lineTo(-s * 0.7, -s * 0.62); P.lineTo(0, s * 0.15); P.closePath(); deel(R, P, '#ffe14f', -s * 0.5, -s * 0.5, s * 0.6) }
    else if (st === 'blad') { P = new Path2D(); P.moveTo(0, 0); P.quadraticCurveTo(-s * 0.5, -s * 0.5, -s * 1.0, -s * 0.2); P.quadraticCurveTo(-s * 0.5, s * 0.2, 0, 0); deel(R, P, '#3fbf5a', -s * 0.5, -s * 0.2, s * 0.4) }
    else if (st === 'ster') { g.strokeStyle = R.lijn; g.lineWidth = s * 0.22; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-s * 0.8, s * 0.1, -s * 0.9, -s * 0.8); g.stroke(); g.strokeStyle = R.k; g.lineWidth = s * 0.13; g.stroke(); g.save(); g.shadowColor = '#ffd23d'; g.shadowBlur = R.sil ? 0 : s * 0.6; NK.ster(g, -s * 0.9, -s * 0.85, s * 0.35, R.sil ? R.k : '#ffd23d'); g.restore() }
    else if (st === 'veer') { for (var v = 0; v < 3; v++) { P = ell(-s * 0.55, (v - 1) * s * 0.18, s * 0.6, s * 0.14, (v - 1) * 0.35); deel(R, P, v % 2 ? R.donker : R.k) } }
    else if (st === 'vis') { P = new Path2D(); P.moveTo(0, 0); P.quadraticCurveTo(-s * 0.4, -s * 0.1, -s * 0.75, -s * 0.55); P.quadraticCurveTo(-s * 0.55, 0, -s * 0.8, s * 0.45); P.quadraticCurveTo(-s * 0.4, s * 0.1, 0, 0.01); deel(R, P, R.donker) }
    else if (st === 'dun' || st === 'geen' && R.vierpoot) {
      var pluim = R.v === 'vos' || R.v === 'wolf'
      if (pluim) { P = new Path2D(); P.moveTo(0, -s * 0.15); P.bezierCurveTo(-s * 0.8, -s * 0.5, -s * 1.3, -s * 0.2, -s * 1.15, -s * 0.9); P.bezierCurveTo(-s * 0.95, -s * 0.45, -s * 0.5, -s * 0.05, 0, s * 0.15); P.closePath(); deel(R, P, R.k, -s * 0.7, -s * 0.4, s * 0.5); if (!R.sil) { var Q = new Path2D(); Q.moveTo(-s * 1.15, -s * 0.9); Q.quadraticCurveTo(-s * 1.0, -s * 0.6, -s * 0.85, -s * 0.55); Q.quadraticCurveTo(-s * 1.05, -s * 0.55, -s * 1.15, -s * 0.9); g.fillStyle = R.type === 'vuur' ? '#ffe14f' : '#ffffff'; g.fill(Q) } }
      else { g.strokeStyle = R.lijn; g.lineWidth = s * 0.16; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-s * 0.6, s * 0.1, -s * 0.9, -s * 0.4, -s * 0.75 + Math.sin(t * 3) * s * 0.1, -s * 0.9); g.stroke(); g.strokeStyle = R.k; g.lineWidth = s * 0.08; g.stroke() }
    }
    g.restore()
  }
  function lichtDeeltjes(R, x, y, s) {
    if (R.sil || R.stil || s < 25) return
    var g = R.g; g.save(); g.globalCompositeOperation = 'lighter'
    for (var d = 0; d < 6; d++) { var f = (R.t * 0.6 + d / 6) % 1; NK.vlek(g, x + Math.sin(d * 2.3 + R.t) * s * 0.9, y + s * 0.6 - f * s * 1.8, s * 0.08, R.deeltje, (1 - f) * 0.8) }
    g.restore()
  }

  // fel oog voor het laatste stadium: amandelvorm, gloed, spleetpupil en een zware wenkbrauw
  function felOog(R, x, y, s, spleet) {
    var g = R.g; if (R.sil) return
    if (R.knip) { g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.beginPath(); g.moveTo(x - s, y + s * 0.1); g.lineTo(x + s, y); g.stroke(); return }
    var vorm = function () { g.beginPath(); g.moveTo(x - s, y + s * 0.2); g.quadraticCurveTo(x - s * 0.1, y - s * 0.8, x + s * 1.05, y - s * 0.12); g.quadraticCurveTo(x, y + s * 0.62, x - s, y + s * 0.2) }
    g.save(); g.shadowColor = MT.KLEUR[R.type] || '#ffffff'; g.shadowBlur = s * 1.4
    g.fillStyle = R.type === 'schaduw' ? '#ffb0f4' : '#fff6c0'; vorm(); g.fill(); g.restore()
    g.save(); vorm(); g.clip()
    g.fillStyle = R.iris; g.beginPath(); g.ellipse(x + s * 0.12, y, s * 0.4, s * 0.46, 0, 0, 7); g.fill()
    g.fillStyle = '#0e0e1e'; g.beginPath(); g.ellipse(x + s * 0.14, y, spleet ? s * 0.1 : s * 0.22, s * 0.42, 0, 0, 7); g.fill()
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + s * 0.3, y - s * 0.16, s * 0.11, 0, 7); g.fill()
    g.restore()
    g.strokeStyle = R.lijn; g.lineWidth = R.lw * 0.9; vorm(); g.stroke()
    g.fillStyle = R.donker; g.beginPath(); g.moveTo(x - s * 1.15, y - s * 0.62); g.lineTo(x + s * 1.15, y - s * 0.28); g.lineTo(x + s * 1.05, y - s * 0.5); g.lineTo(x - s * 1.05, y - s * 0.85); g.closePath(); g.fill(); g.stroke()
  }
  function vachtKleur(R) {
    return R.type === 'vuur' ? ['#ff9a2e', '#ffe14f'] : R.type === 'bliksem' ? ['#ffd23d', '#fff6a0'] : R.type === 'ijs' ? ['#e8fbff', '#ffffff'] : R.type === 'schaduw' ? [R.donker, '#d8a8ff'] : R.type === 'plant' ? ['#3fbf5a', '#bff5a0'] : [R.hel, '#ffffff']
  }
  // pluizige rand (zigzag) langs een rij punten
  function pluis(R, pts, kleur) {
    var P = new Path2D(); pts.forEach(function (q, i) { if (i) P.lineTo(q[0], q[1]); else P.moveTo(q[0], q[1]) }); P.closePath(); deel(R, P, kleur); return P
  }

  // ── viervoeters: vos, wolf, kat (leeuw, panter), rat, zwijn; kikker en konijn apart ──
  var VIERMAAT = { vos: [0.47, 0.23, 0.36, 0.25, 0.95], wolf: [0.52, 0.27, 0.38, 0.27, 1.0], kat: [0.5, 0.23, 0.34, 0.25, 0.42], rat: [0.5, 0.24, 0.2, 0.24, 0.85], zwijn: [0.5, 0.31, 0.22, 0.28, 0.6] }
  function viervoeter(R) {
    if (R.v === 'kikker') return kikker(R)
    if (R.v === 'konijn') return konijn(R)
    var g = R.g, r = R.r, st = R.stad, t = R.t, v = R.v, P, i
    var m = VIERMAAT[v] || VIERMAAT.vos
    var L = r * m[0] * [0.72, 0.88, 1][st - 1], H = r * m[1] * [1.0, 1.12, 1.18][st - 1], been = r * m[2] * [0.62, 0.85, 1][st - 1], ks = r * m[3] * [1.45, 1.12, 1][st - 1], snuit = m[4] * [0.55, 0.85, 1][st - 1]
    var gy = r * 0.95, bx = -r * 0.14, by = gy - been - H * 0.45
    var loop = R.stil ? 0 : Math.sin(t * 3)
    var kat = v === 'kat', rat = v === 'rat', zwijn = v === 'zwijn', vos = v === 'vos'
    var hx = bx + L * 0.95 + ks * 0.25, hy = by - H * 0.95 - ks * (st === 1 ? 0.3 : 0.55)
    var vacht = vachtKleur(R)
    var heup = bx - L * 0.55, schouder = bx + L * 0.58
    // staart
    staartVier(R, bx - L * 0.95, by - H * 0.4, r, st, v, vacht)
    var achterbeen = function (x, kleur, sw, ver) {
      var w = been * (zwijn ? 0.42 : rat ? 0.4 : 0.3) * (st === 1 ? 1.3 : 1)
      var knie = [x - L * 0.02 + sw * been * 0.25, by + H * 0.5], hiel = [x - L * 0.2 + sw * been * 0.3, gy - been * 0.38], voet = [x - L * 0.06 + sw * been * 0.45, gy - w * 0.32]
      poot(R, [[x, by], knie, hiel, voet], w, kleur)
      P = ell(voet[0] + w * 0.35, gy - w * 0.32, w * 0.62, w * 0.34, 0); deel(R, P, kleur)
      if (!ver && st === 3) klauwen(R, voet[0] + w * 0.6, gy - w * 0.38, w * 0.3)
    }
    var voorbeen = function (x, kleur, sw, ver) {
      var w = been * (zwijn ? 0.4 : rat ? 0.38 : 0.28) * (st === 1 ? 1.3 : 1)
      var elleboog = [x + sw * been * 0.15, by + H * 0.6], pols = [x + L * 0.04 + sw * been * 0.35, gy - been * 0.25], voet = [x + L * 0.07 + sw * been * 0.42, gy - w * 0.32]
      poot(R, [[x, by - H * 0.1], elleboog, pols, voet], w, kleur)
      P = ell(voet[0] + w * 0.35, gy - w * 0.32, w * 0.6, w * 0.34, 0); deel(R, P, kleur)
      if (!ver && st === 3) klauwen(R, voet[0] + w * 0.6, gy - w * 0.38, w * 0.3)
      if (!ver && R.type === 'vuur' && st >= 2) vlam(R, pols[0], pols[1] + w * 0.3, w * 1.2, 0.3)
      if (!ver && R.type === 'schaduw' && st >= 2) gloedVlek(R, voet[0], gy - w * 0.4, w * 2.5, '#a56bff', 0.35)
    }
    achterbeen(heup - L * 0.14, R.donker, -loop * 0.25, true); voorbeen(schouder - L * 0.14, R.donker, loop * 0.25, true)
    // lijf
    var schoft = zwijn ? 1.32 : 1.05
    P = new Path2D(); P.moveTo(bx - L * 0.95, by - H * 0.55)
    P.bezierCurveTo(bx - L * 0.4, by - H * 1.1, bx + L * 0.3, by - H * 0.9, bx + L * 0.72, by - H * schoft)
    P.bezierCurveTo(bx + L * 1.15, by - H * 0.9, bx + L * 1.2, by + H * 0.5, bx + L * 0.75, by + H * 0.85)
    P.bezierCurveTo(bx + L * 0.3, by + H * 1.0, bx - L * 0.2, by + H * (kat || vos ? 0.5 : 0.8), bx - L * 0.6, by + H * 0.75)
    P.bezierCurveTo(bx - L * 1.1, by + H * 0.65, bx - L * 1.15, by - H * 0.3, bx - L * 0.95, by - H * 0.55)
    var lijf = P
    deel(R, P, R.k, bx, by - H * 0.3, L * 0.8)
    if (!R.sil) {
      g.save(); g.clip(lijf)
      g.fillStyle = R.buikVast; g.beginPath(); g.ellipse(bx + L * 0.35, by + H * 0.9, L * 0.8, H * 0.45, -0.1, 0, 7); g.fill()
      if (R.L.streep || (st === 3 && kat)) { g.fillStyle = R.type === 'bliksem' ? 'rgba(60,30,0,0.55)' : 'rgba(10,0,30,0.5)'; for (i = 0; i < 5; i++) { var sx = bx - L * 0.85 + i * L * 0.33; g.beginPath(); g.moveTo(sx, by - H * 1.2); g.quadraticCurveTo(sx + L * 0.14, by - H * 0.45, sx - L * 0.02, by + H * 0.15); g.lineTo(sx + L * 0.05, by + H * 0.1); g.quadraticCurveTo(sx + L * 0.24, by - H * 0.45, sx + L * 0.12, by - H * 1.2); g.closePath(); g.fill() } }
      if (R.type === 'bliksem' && st >= 2) { g.fillStyle = '#ffe14f'; g.beginPath(); g.moveTo(bx - L * 0.3, by - H * 0.7); g.lineTo(bx + L * 0.05, by - H * 0.2); g.lineTo(bx - L * 0.1, by - H * 0.15); g.lineTo(bx + L * 0.2, by + H * 0.4); g.lineTo(bx - L * 0.2, by - H * 0.05); g.lineTo(bx - L * 0.05, by - H * 0.1); g.closePath(); g.fill() }
      if (R.L.stip) { g.fillStyle = 'rgba(255,255,255,0.35)'; [[-0.5, -0.5], [-0.1, -0.65], [0.3, -0.5], [-0.3, -0.15]].forEach(function (q) { g.beginPath(); g.arc(bx + q[0] * L, by + q[1] * H, H * 0.16, 0, 7); g.fill() }) }
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.ellipse(bx - L * 0.1, by - H * 0.75, L * 0.6, H * 0.18, -0.05, 0, 7); g.fill()
      g.restore()
    }
    // rug: vlammen, ijspieken, stekels, mos of borstels
    var rugX = function (f) { return bx - L * 0.7 + f * L * 1.25 }, rugY = function (f) { return by - H * (0.82 + 0.2 * Math.sin(f * Math.PI)) - (zwijn ? f * H * 0.25 : 0) }
    if (st === 3 || R.L.extra === 'stekels' || zwijn) {
      for (i = 0; i < 5; i++) {
        var f = (i + 0.5) / 5, rx = rugX(f), ry = rugY(f)
        if (zwijn) { P = new Path2D(); P.moveTo(rx - r * 0.06, ry + r * 0.03); P.lineTo(rx - r * 0.04, ry - r * 0.14); P.lineTo(rx + r * 0.0, ry - r * 0.05); P.lineTo(rx + r * 0.03, ry - r * 0.16); P.lineTo(rx + r * 0.06, ry + r * 0.03); P.closePath(); deel(R, P, R.lijn) }
        else if (R.type === 'vuur') vlam(R, rx, ry + r * 0.02, r * (0.12 + Math.sin(f * Math.PI) * 0.08), -0.35)
        else if (R.type === 'ijs') { P = new Path2D(); var lg = r * (0.12 + Math.sin(f * Math.PI) * 0.12); P.moveTo(rx - r * 0.05, ry + r * 0.04); P.lineTo(rx - r * 0.035, ry - lg * 0.6); P.lineTo(rx + r * 0.0, ry - lg); P.lineTo(rx + r * 0.035, ry - lg * 0.6); P.lineTo(rx + r * 0.05, ry + r * 0.04); P.closePath(); deel(R, P, '#e8fbff', rx, ry - lg * 0.5, lg * 0.4) }
        else if (R.type === 'plant') { P = new Path2D(); P.arc(rx, ry, r * 0.08, 0, 7); deel(R, P, i % 2 ? '#2f9a4a' : '#5ad86a', rx, ry, r * 0.08) }
        else if (R.type === 'schaduw') { if (!R.sil) { g.save(); g.globalAlpha *= 0.55 + Math.sin(t * 2 + i) * 0.2; P = new Path2D(); P.moveTo(rx - r * 0.05, ry + r * 0.04); P.quadraticCurveTo(rx - r * 0.08, ry - r * 0.12, rx + Math.sin(t * 2 + i) * r * 0.04, ry - r * 0.2); P.quadraticCurveTo(rx + r * 0.06, ry - r * 0.08, rx + r * 0.05, ry + r * 0.04); P.closePath(); g.fillStyle = '#7a3ad8'; g.fill(P); g.restore() } }
        else { P = new Path2D(); P.moveTo(rx - r * 0.06, ry + r * 0.04); P.lineTo(rx - r * 0.01, ry - r * 0.17); P.lineTo(rx + r * 0.06, ry + r * 0.04); P.closePath(); deel(R, P, vacht[0]) }
      }
      if (R.L.extra === 'boom') { [[-0.35, -1.0, 0.36], [0.15, -1.1, 0.4], [-0.1, -1.45, 0.42]].forEach(function (q) { P = new Path2D(); P.arc(bx + q[0] * L, by + q[1] * H * 1.6, q[2] * L, 0, 7); deel(R, P, '#2f9a4a', bx + q[0] * L, by + q[1] * H * 1.6, q[2] * L) }); if (!R.sil) { g.fillStyle = '#ff5a5a'; g.beginPath(); g.arc(bx + L * 0.1, by - H * 2.0, L * 0.06, 0, 7); g.arc(bx - L * 0.35, by - H * 1.7, L * 0.05, 0, 7); g.fill() } }
    }
    // dij en schouder aan de voorkant, met de poten
    P = ell(heup, by - H * 0.02, L * 0.34, H * 0.8, 0.2); deel(R, P, R.k, heup, by - H * 0.25, L * 0.3)
    achterbeen(heup, R.k, loop * 0.25, false)
    voorbeen(schouder, R.k, -loop * 0.25, false)
    P = ell(schouder, by - H * 0.15, L * 0.24, H * 0.62, -0.15); deel(R, P, R.k, schouder, by - H * 0.3, L * 0.2)
    // manen achter de kop
    if (R.L.extra === 'manen') {
      [[1.75, 1.15], [1.0, 0.85]].forEach(function (laag, li) {
        P = new Path2D(); var n2 = 15
        for (i = 0; i <= n2 * 2; i++) { var h = 1.7 + i / (n2 * 2) * Math.PI * 1.55, rr = ks * (i % 2 ? laag[1] : laag[0]) * (1 + (R.stil ? 0 : Math.sin(t * 6 + i) * 0.04)); var px = hx - ks * 0.15 + Math.cos(h) * rr, py = hy + ks * 0.15 + Math.sin(h) * rr; if (i) P.lineTo(px, py); else P.moveTo(px, py) }
        P.closePath(); deel(R, P, vacht[li], hx - ks * 0.4, hy - ks * 0.3, ks)
      })
      if (R.type === 'vuur' && st === 3) for (i = 0; i < 4; i++) vlam(R, hx - ks * (1.1 - i * 0.45), hy - ks * (0.9 + Math.sin(i) * 0.3), ks * 0.6, -0.6 + i * 0.3)
    }
    // nek
    P = new Path2D(); P.moveTo(bx + L * 0.3, by - H * 0.85); P.quadraticCurveTo(hx - ks * 0.75, hy - ks * 0.1, hx - ks * 0.35, hy - ks * 0.5); P.lineTo(hx + ks * 0.3, hy + ks * 0.55); P.quadraticCurveTo(bx + L * 1.15, by - H * 0.1, bx + L * 0.9, by + H * 0.35); P.closePath()
    deel(R, P, R.k)
    // borstvacht
    if ((st >= 2 && !rat && !zwijn) || R.type === 'ijs') {
      var bp = [], F0 = [hx + ks * 0.2, hy + ks * 0.6], F1 = [bx + L * 1.05, by + H * 0.3]
      for (i = 0; i <= 6; i++) { var f2 = i / 6; bp.push([F0[0] + (F1[0] - F0[0]) * f2 + (i % 2 ? ks * 0.2 : 0), F0[1] + (F1[1] - F0[1]) * f2 + (i % 2 ? ks * 0.05 : 0)]) }
      bp.push([bx + L * 0.72, by + H * 0.05]); bp.push([hx - ks * 0.3, hy + ks * 0.45])
      pluis(R, bp, st === 3 ? vacht[1] : R.buikVast)
    }
    kopVier(R, hx, hy, ks, snuit, st, vacht)
    if (R.type === 'bliksem' && st >= 2) gloedVlek(R, hx, hy, ks * 1.6, '#ffe14f', 0.15 + Math.sin(t * 8) * 0.08)
    if (R.type === 'schaduw' && st === 3) gloedVlek(R, bx, by, r * 1.1, '#a56bff', 0.15)
    lichtDeeltjes(R, bx, by, r)
  }
  function kopVier(R, hx, hy, ks, sn, st, vacht) {
    var g = R.g, v = R.v, t = R.t, P
    var kat = v === 'kat', rat = v === 'rat', zwijn = v === 'zwijn', vos = v === 'vos'
    // oren: verre oor eerst
    ;[[0.22, -0.72, true], [-0.38, -0.66, false]].forEach(function (o) {
      var ox = hx + o[0] * ks, oy = hy + o[1] * ks, ver = o[2], kl = ver ? R.donker : R.k
      if (rat) { P = new Path2D(); P.arc(ox, oy, ks * 0.42, 0, 7); deel(R, P, kl); if (!R.sil && !ver) { R.g.fillStyle = '#ffb8c8'; g.beginPath(); g.arc(ox + ks * 0.03, oy + ks * 0.03, ks * 0.25, 0, 7); g.fill() } }
      else if (zwijn) { P = new Path2D(); P.moveTo(ox - ks * 0.25, oy + ks * 0.25); P.quadraticCurveTo(ox - ks * 0.05, oy - ks * 0.45, ox + ks * 0.45, oy - ks * 0.35); P.quadraticCurveTo(ox + ks * 0.25, oy + ks * 0.05, ox + ks * 0.25, oy + ks * 0.3); P.closePath(); deel(R, P, kl) }
      else {
        var oh = ks * (vos ? 1.0 : kat ? 0.72 : 0.82) * (st === 1 ? 1.12 : 1)
        P = new Path2D(); P.moveTo(ox - ks * 0.34, oy + ks * 0.32); P.quadraticCurveTo(ox - ks * 0.32, oy - oh * 0.45, ox - ks * 0.08, oy - oh); P.quadraticCurveTo(ox + ks * 0.25, oy - oh * 0.4, ox + ks * 0.36, oy + ks * 0.32); P.closePath()
        deel(R, P, kl, ox, oy - oh * 0.3, ks * 0.4)
        if (!R.sil && !ver) { var Q = new Path2D(); Q.moveTo(ox - ks * 0.18, oy + ks * 0.2); Q.quadraticCurveTo(ox - ks * 0.18, oy - oh * 0.35, ox - ks * 0.07, oy - oh * 0.72); Q.quadraticCurveTo(ox + ks * 0.12, oy - oh * 0.3, ox + ks * 0.2, oy + ks * 0.2); Q.closePath(); g.fillStyle = R.type === 'ijs' || R.type === 'vuur' ? vacht[1] : '#ffb8c8'; g.fill(Q) }
        if (st === 3 && kat && !R.sil) { g.strokeStyle = R.lijn; g.lineWidth = R.lw * 1.2; g.beginPath(); g.moveTo(ox - ks * 0.08, oy - oh); g.lineTo(ox - ks * 0.12, oy - oh - ks * 0.25); g.stroke() }
      }
    })
    // wangpluizen
    if (!rat && !zwijn) pluis(R, [[hx - ks * 0.5, hy + ks * 0.25], [hx - ks * 1.02, hy + ks * 0.45], [hx - ks * 0.6, hy + ks * 0.55], [hx - ks * 0.88, hy + ks * 0.85], [hx - ks * 0.3, hy + ks * 0.75], [hx - ks * 0.2, hy + ks * 0.4]], st === 3 ? vacht[1] : R.buikVast)
    // schedel
    P = ell(hx, hy, ks, ks * 0.92, 0); deel(R, P, R.k, hx, hy, ks)
    if (!R.sil && R.L.streep) { g.save(); g.clip(P); g.fillStyle = 'rgba(10,0,30,0.45)'; [-0.35, 0, 0.3].forEach(function (q) { g.beginPath(); g.moveTo(hx + q * ks - ks * 0.06, hy - ks); g.lineTo(hx + q * ks + ks * 0.06, hy - ks); g.lineTo(hx + q * ks, hy - ks * 0.55); g.closePath(); g.fill() }); g.restore() }
    // snuit
    var tipX = hx + ks * (0.6 + sn), tipY = hy + ks * 0.12, open = st === 3 && !rat && !zwijn
    P = new Path2D()
    if (zwijn) { P.moveTo(hx + ks * 0.3, hy - ks * 0.4); P.lineTo(tipX, hy - ks * 0.12); P.lineTo(tipX, hy + ks * 0.45); P.quadraticCurveTo(hx + ks * 0.6, hy + ks * 0.75, hx + ks * 0.1, hy + ks * 0.6); P.closePath() }
    else { P.moveTo(hx + ks * 0.2, hy - ks * 0.52); P.quadraticCurveTo(hx + ks * (0.55 + sn * 0.4), hy - ks * 0.38, tipX, tipY - ks * 0.12); P.quadraticCurveTo(tipX + ks * 0.13, tipY + ks * 0.06, tipX - ks * 0.04, tipY + ks * 0.18); P.quadraticCurveTo(hx + ks * (0.45 + sn * 0.6), tipY + ks * (open ? 0.5 : 0.3), hx + ks * (0.42 + sn * 0.45), tipY + ks * (open ? 0.55 : 0.38)); P.quadraticCurveTo(hx + ks * 0.3, hy + ks * 0.78, hx - ks * 0.02, hy + ks * 0.6); P.closePath() }
    deel(R, P, R.k, hx + ks * 0.5, hy - ks * 0.2, ks * 0.5)
    if (!R.sil) {
      g.save(); g.clip(P); g.fillStyle = R.buikVast; g.beginPath(); g.ellipse(tipX - ks * sn * 0.45, tipY + ks * 0.38, ks * (0.3 + sn * 0.45), ks * 0.3, 0, 0, 7); g.fill(); g.restore()
      if (zwijn) {
        P = ell(tipX, hy + ks * 0.16, ks * 0.14, ks * 0.32, 0); deel(R, P, '#ffb0b8')
        g.fillStyle = '#5a2a3a'; g.beginPath(); g.ellipse(tipX + ks * 0.02, hy + ks * 0.04, ks * 0.04, ks * 0.07, 0, 0, 7); g.ellipse(tipX + ks * 0.02, hy + ks * 0.28, ks * 0.04, ks * 0.07, 0, 0, 7); g.fill()
        ;[0, 1].forEach(function (z) { var P2 = new Path2D(), x0 = tipX - ks * (0.3 + z * 0.12); P2.moveTo(x0, hy + ks * 0.5); P2.quadraticCurveTo(x0 + ks * 0.25, hy + ks * 0.35, x0 + ks * 0.3, hy - ks * (0.1 + st * 0.08)); P2.quadraticCurveTo(x0 + ks * 0.12, hy + ks * 0.25, x0 - ks * 0.08, hy + ks * 0.45); P2.closePath(); deel(R, P2, '#f4ecd8') })
      } else {
        g.fillStyle = '#1a1424'; g.beginPath(); g.moveTo(tipX - ks * 0.14, tipY - ks * 0.14); g.quadraticCurveTo(tipX + ks * 0.08, tipY - ks * 0.2, tipX + ks * 0.08, tipY - ks * 0.04); g.quadraticCurveTo(tipX - ks * 0.04, tipY + ks * 0.04, tipX - ks * 0.14, tipY - ks * 0.14); g.fill()
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(tipX - ks * 0.04, tipY - ks * 0.13, ks * 0.025, 0, 7); g.fill()
        g.strokeStyle = R.lijn; g.lineWidth = R.lw
        if (open) {
          var mx = hx + ks * 0.35, my = tipY + ks * 0.22
          g.fillStyle = '#4a0f1e'; g.beginPath(); g.moveTo(tipX - ks * 0.08, tipY + ks * 0.12); g.lineTo(mx, my); g.lineTo(hx + ks * (0.42 + sn * 0.45), tipY + ks * 0.5); g.closePath(); g.fill(); g.stroke()
          ;[[tipX - ks * 0.2, 0.26], [tipX - ks * (0.2 + sn * 0.35), 0.16]].forEach(function (q) { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(q[0] - ks * 0.05, tipY + ks * 0.12); g.lineTo(q[0], tipY + ks * (0.12 + q[1])); g.lineTo(q[0] + ks * 0.05, tipY + ks * 0.13); g.closePath(); g.fill(); g.lineWidth = R.lw * 0.5; g.stroke() })
          g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(hx + ks * (0.3 + sn * 0.45), tipY + ks * 0.48); g.lineTo(hx + ks * (0.34 + sn * 0.45), tipY + ks * 0.3); g.lineTo(hx + ks * (0.38 + sn * 0.45), tipY + ks * 0.47); g.fill()
        } else { g.beginPath(); g.moveTo(tipX - ks * 0.05, tipY - ks * 0.02); g.lineTo(tipX - ks * 0.06, tipY + ks * 0.14); g.quadraticCurveTo(tipX - ks * 0.25, tipY + ks * 0.26, hx + ks * 0.45, tipY + ks * 0.16); g.stroke() }
        if (rat) { g.fillStyle = '#ffffff'; g.strokeStyle = R.lijn; g.lineWidth = R.lw * 0.6; for (var tt = 0; tt < (st >= 2 ? 2 : 1); tt++) { g.beginPath(); g.rect(tipX - ks * (0.2 + tt * 0.09), tipY + ks * 0.15, ks * 0.08, ks * (0.12 + st * 0.03)); g.fill(); g.stroke() } }
        if (kat || rat) { g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = R.lw * 0.5; for (var sn2 = -1; sn2 <= 1; sn2++) { g.beginPath(); g.moveTo(tipX - ks * 0.2, tipY + ks * 0.05); g.lineTo(tipX + ks * 0.45, tipY + sn2 * ks * 0.15 - ks * 0.02); g.stroke() } }
      }
    }
    // ogen
    var nx = hx + ks * 0.12, ny = hy - ks * 0.15, fx = hx + ks * (kat ? 0.62 : 0.5 + sn * 0.12), fy = hy - ks * 0.22
    if (zwijn) { nx = hx + ks * 0.15; fx = hx + ks * 0.5 }
    if (st === 3) { felOog(R, fx, fy, ks * 0.15, kat); felOog(R, nx, ny, ks * 0.21, kat) }
    else { var os = ks * (st === 1 ? 0.27 : 0.22) * (zwijn ? 0.75 : 1); oogZij(R, fx, fy, os * 0.72, false); oogZij(R, nx, ny, os, st === 2 && !rat) }
    if (st === 1) wang(R, hx + ks * 0.1, hy + ks * 0.38, ks * 0.16)
    if (R.L.extra === 'maan' && !R.sil) { g.save(); g.shadowColor = '#fff6cf'; g.shadowBlur = ks * 0.5; g.fillStyle = '#fff6cf'; g.beginPath(); g.arc(hx - ks * 0.1, hy - ks * 0.55, ks * 0.2, 0, 7); g.fill(); g.restore(); g.fillStyle = R.k; g.beginPath(); g.arc(hx - ks * 0.02, hy - ks * 0.6, ks * 0.17, 0, 7); g.fill() }
    if (R.L.extra === 'kroon' || R.L.extra === 'horens') kopExtra(R, hx - ks * 0.1, hy - ks * 0.82, ks * 0.9)
  }
  function staartVier(R, x, y, r, st, v, vacht) {
    var g = R.g, t = R.t, soort = R.L.staart, P, sz = r * [0.34, 0.44, 0.54][st - 1], zw = R.stil ? 0 : Math.sin(t * 2.5) * 0.12
    g.save(); g.translate(x, y); g.rotate(zw)
    if (soort === 'vlam') { vlam(R, -sz * 0.45, -sz * 0.05, sz * 1.0, -1.25); vlam(R, -sz * 0.25, 0, sz * 1.35, -0.85); vlam(R, -sz * 0.05, sz * 0.05, sz * 0.8, -0.45); gloedVlek(R, -sz * 0.5, -sz * 0.6, sz * 1.2, '#ff8a3d', 0.35) }
    else if (soort === 'flits') { P = new Path2D(); P.moveTo(sz * 0.05, -sz * 0.12); P.lineTo(-sz * 0.45, -sz * 0.3); P.lineTo(-sz * 0.33, -sz * 0.48); P.lineTo(-sz * 1.15, -sz * 1.0); P.lineTo(-sz * 0.72, -sz * 0.42); P.lineTo(-sz * 0.88, -sz * 0.3); P.lineTo(sz * 0.05, sz * 0.14); P.closePath(); deel(R, P, '#ffe14f', -sz * 0.5, -sz * 0.5, sz * 0.5); gloedVlek(R, -sz * 0.6, -sz * 0.5, sz, '#ffe14f', 0.3) }
    else if (soort === 'ster' || soort === 'blad' || ((soort === 'dun' || soort === 'geen') && (v === 'kat' || v === 'rat' || v === 'zwijn'))) {
      g.beginPath()
      if (v === 'zwijn') { g.moveTo(0, 0); g.bezierCurveTo(-sz * 0.3, -sz * 0.05, -sz * 0.35, -sz * 0.35, -sz * 0.2, -sz * 0.3); g.bezierCurveTo(-sz * 0.05, -sz * 0.25, -sz * 0.2, -sz * 0.05, -sz * 0.4, -sz * 0.15) }
      else if (v === 'rat') { g.moveTo(0, 0); g.bezierCurveTo(-sz * 0.6, sz * 0.5, -sz * 1.2, sz * 0.75, -sz * 1.55, sz * 0.25 + Math.sin(t * 3) * sz * 0.06) }
      else { g.moveTo(0, 0); g.bezierCurveTo(-sz * 0.7, sz * 0.25, -sz * 1.1, -sz * 0.2, -sz * 0.85, -sz * 1.0 + Math.sin(t * 2) * sz * 0.05) }
      var dk = v === 'rat' ? sz * 0.1 : sz * 0.17
      g.strokeStyle = R.lijn; g.lineWidth = dk + R.lw * 1.6; g.stroke(); g.strokeStyle = R.sil ? R.k : v === 'rat' && R.type !== 'bliksem' ? '#e8a0b0' : R.k; g.lineWidth = dk; g.stroke()
      if (soort === 'ster') { g.save(); g.shadowColor = '#ffd23d'; g.shadowBlur = R.sil ? 0 : sz * 0.6; NK.ster(g, -sz * 0.85, -sz * 1.05, sz * 0.32, R.sil ? R.k : '#ffd23d'); g.restore() }
      if (soort === 'blad') { P = new Path2D(); P.moveTo(-sz * 0.85, -sz * 1.0); P.quadraticCurveTo(-sz * 1.3, -sz * 1.2, -sz * 1.2, -sz * 1.6); P.quadraticCurveTo(-sz * 0.8, -sz * 1.4, -sz * 0.85, -sz * 1.0); deel(R, P, '#3fbf5a') }
      if (v === 'kat' && R.type === 'schaduw' && st >= 2 && !R.sil) gloedVlek(R, -sz * 0.85, -sz * 1.0, sz * 0.6, '#c88aff', 0.6)
    } else {
      // pluimstaart
      P = new Path2D(); P.moveTo(sz * 0.05, -sz * 0.22); P.bezierCurveTo(-sz * 0.7, -sz * 0.4, -sz * 1.3, -sz * 0.1, -sz * 1.35, -sz * 1.0); P.bezierCurveTo(-sz * 0.95, -sz * 0.62, -sz * 0.6, sz * 0.38, sz * 0.05, sz * 0.25); P.closePath()
      deel(R, P, R.k, -sz * 0.6, -sz * 0.4, sz * 0.6)
      if (!R.sil) { g.save(); g.clip(P); g.fillStyle = vacht[1]; g.beginPath(); g.arc(-sz * 1.3, -sz * 1.05, sz * 0.45, 0, 7); g.fill(); g.restore(); g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.stroke(P) }
    }
    g.restore()
  }
  function kikker(R) {
    var g = R.g, r = R.r, st = R.stad, t = R.t, P
    var s = r * [0.62, 0.78, 0.92][st - 1], gy = r * 0.95
    var adem = R.stil ? 0 : Math.sin(t * 3) * 0.04
    ;[-1, 1].forEach(function (z) {
      P = ell(z * s * 0.6, gy - s * 0.28, s * 0.36, s * 0.27, -z * 0.45); deel(R, P, R.donker, z * s * 0.6, gy - s * 0.3, s * 0.3)
      P = new Path2D(); var vx = z * s * 0.82; P.moveTo(vx - z * s * 0.25, gy - s * 0.05); for (var tn = 0; tn < 3; tn++) { var a = vx + z * s * (0.0 + tn * 0.12); P.quadraticCurveTo(a, gy - s * 0.02, a + z * s * 0.06, gy); P.arc(a + z * s * 0.08, gy - s * 0.01, s * 0.035, Math.PI, 0) } P.lineTo(vx - z * s * 0.15, gy + s * 0.01); P.closePath(); deel(R, P, R.donker)
    })
    // lijf
    P = new Path2D(); P.moveTo(-s * 0.72, gy - s * 0.12); P.bezierCurveTo(-s * (0.95 + adem), gy - s * 1.0, s * (0.95 + adem), gy - s * 1.0, s * 0.72, gy - s * 0.12); P.quadraticCurveTo(0, gy + s * 0.08, -s * 0.72, gy - s * 0.12)
    deel(R, P, R.k, 0, gy - s * 0.55, s * 0.7)
    if (!R.sil) {
      g.save(); g.clip(P)
      g.fillStyle = R.buikVast; g.beginPath(); g.ellipse(0, gy - s * 0.12, s * 0.5, s * 0.32, 0, 0, 7); g.fill()
      g.fillStyle = 'rgba(0,30,60,0.3)'; [[-0.5, -0.6, 0.09], [0.45, -0.65, 0.07], [-0.25, -0.8, 0.06], [0.6, -0.35, 0.06], [-0.62, -0.32, 0.05]].forEach(function (q) { g.beginPath(); g.arc(q[0] * s, gy + q[1] * s, q[2] * s * (st === 3 ? 1.5 : 1), 0, 7); g.fill() })
      if (st === 3) { g.fillStyle = 'rgba(255,255,255,0.3)'; [[-0.48, -0.62], [0.42, -0.67], [-0.6, -0.34]].forEach(function (q) { g.beginPath(); g.arc(q[0] * s - s * 0.02, gy + q[1] * s - s * 0.03, s * 0.04, 0, 7); g.fill() }) }
      g.restore()
    }
    // keelzak
    if (st >= 2 && !R.sil) { var zak = 0.16 + (R.stil ? 0 : Math.max(0, Math.sin(t * 2.2)) * 0.1); P = ell(0, gy - s * 0.32, s * (0.28 + zak), s * (0.16 + zak * 0.6), 0); deel(R, P, '#f4e8c0') }
    // ogen bovenop
    ;[-1, 1].forEach(function (z) { var ex = z * s * 0.36, ey = gy - s * 0.86, er = s * [0.27, 0.22, 0.2][st - 1]; P = new Path2D(); P.arc(ex, ey, er, 0, 7); deel(R, P, R.k, ex, ey, er); if (st === 3) felOog(R, ex - z * er * 0.05, ey - er * 0.05, er * 0.6, false); else oogZij(R, ex, ey - er * 0.05, er * 0.68, false) })
    // mond
    if (!R.sil) { g.strokeStyle = R.lijn; g.lineWidth = R.lw * 1.2; g.beginPath(); g.moveTo(-s * 0.55, gy - s * 0.58); g.quadraticCurveTo(0, gy - s * (st === 3 ? 0.4 : 0.45), s * 0.55, gy - s * 0.58); g.stroke(); if (st === 3) tanden(R, -s * 0.25, gy - s * 0.47, s * 0.08, 6); wang(R, -s * 0.5, gy - s * 0.5, s * 0.08); wang(R, s * 0.5, gy - s * 0.5, s * 0.08) }
    // voorpootjes
    ;[-1, 1].forEach(function (z) { poot(R, [[z * s * 0.38, gy - s * 0.35], [z * s * 0.42, gy - s * 0.1], [z * s * 0.4, gy - s * 0.03]], s * 0.11, R.k); for (var vn = -1; vn <= 1; vn++) { P = new Path2D(); P.arc(z * s * 0.4 + vn * s * 0.06, gy - s * 0.01, s * 0.035, 0, 7); deel(R, P, R.k) } })
    if (R.L.extra === 'kroon') kopExtra(R, 0, gy - s * 0.86, s * 0.48)
    if (st === 2 && !R.sil) { P = ell(s * 0.05, gy - s * 0.95, s * 0.22, s * 0.07, 0.1); deel(R, P, '#3fbf5a') }
    lichtDeeltjes(R, 0, gy - s * 0.5, r)
  }
  function konijn(R) {
    var g = R.g, r = R.r, st = R.stad, t = R.t, P
    var s = r * 0.85, gy = r * 0.95, hx = s * 0.36, hy = gy - s * 1.0, wieb = R.stil ? 0 : Math.sin(t * 2) * 0.06
    // oren (blad)
    ;[[0.0, true], [-0.18, false]].forEach(function (o) { g.save(); g.translate(hx + o[0] * s, hy - s * 0.2); g.rotate(-0.35 + (o[1] ? 0.25 : 0) + wieb); P = new Path2D(); P.moveTo(0, 0); P.quadraticCurveTo(-s * 0.2, -s * 0.35, -s * 0.02, -s * 0.72); P.quadraticCurveTo(s * 0.18, -s * 0.35, 0, 0); deel(R, P, o[1] ? '#2f9a4a' : '#5ad86a', 0, -s * 0.35, s * 0.2); if (!R.sil) { g.strokeStyle = 'rgba(0,60,20,0.5)'; g.lineWidth = R.lw * 0.6; g.beginPath(); g.moveTo(0, -s * 0.05); g.lineTo(-s * 0.02, -s * 0.62); g.stroke() } g.restore() })
    // staart
    staartVier(R, -s * 0.62, gy - s * 0.4, r * 0.8, 2, 'kat', vachtKleur(R))
    P = new Path2D(); P.arc(-s * 0.62, gy - s * 0.38, s * 0.14, 0, 7); deel(R, P, '#ffffff')
    // lijf en achterpoot
    P = ell(-s * 0.12, gy - s * 0.42, s * 0.52, s * 0.44, 0); deel(R, P, R.k, -s * 0.12, gy - s * 0.42, s * 0.5)
    P = ell(-s * 0.2, gy - s * 0.3, s * 0.3, s * 0.3, 0.2); deel(R, P, R.k, -s * 0.2, gy - s * 0.35, s * 0.3)
    P = ell(s * 0.02, gy - s * 0.06, s * 0.36, s * 0.09, 0); deel(R, P, R.donker)
    P = ell(s * 0.25, gy - s * 0.5, s * 0.25, s * 0.36, 0.1); deel(R, P, R.buikVast)
    ;[0.3, 0.42].forEach(function (q) { P = ell(s * q, gy - s * 0.06, s * 0.1, s * 0.07, 0); deel(R, P, R.k) })
    // kop
    P = new Path2D(); P.arc(hx, hy, s * 0.33, 0, 7); deel(R, P, R.k, hx, hy, s * 0.33)
    if (!R.sil) { g.fillStyle = R.buikVast; g.beginPath(); g.ellipse(hx + s * 0.18, hy + s * 0.12, s * 0.16, s * 0.13, 0, 0, 7); g.fill() }
    oogZij(R, hx + s * 0.06, hy - s * 0.06, s * 0.1, st === 3); oogZij(R, hx + s * 0.25, hy - s * 0.08, s * 0.075, st === 3)
    if (!R.sil) { g.fillStyle = '#ff8aa8'; g.beginPath(); g.moveTo(hx + s * 0.27, hy + s * 0.05); g.lineTo(hx + s * 0.34, hy + s * 0.05); g.lineTo(hx + s * 0.3, hy + s * 0.1); g.fill(); g.strokeStyle = R.lijn; g.lineWidth = R.lw * 0.8; g.beginPath(); g.moveTo(hx + s * 0.3, hy + s * 0.1); g.quadraticCurveTo(hx + s * 0.26, hy + s * 0.17, hx + s * 0.21, hy + s * 0.14); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = R.lw * 0.5; for (var w = -1; w <= 1; w++) { g.beginPath(); g.moveTo(hx + s * 0.28, hy + s * 0.08); g.lineTo(hx + s * 0.55, hy + s * 0.04 + w * s * 0.06); g.stroke() } }
    wang(R, hx + s * 0.05, hy + s * 0.12, s * 0.06)
    // klavertje vier op de kop
    if (!R.sil) for (var b = 0; b < 4; b++) { var h = b * Math.PI / 2 + 0.4; P = new Path2D(); P.arc(hx - s * 0.12 + Math.cos(h) * s * 0.07, hy - s * 0.32 + Math.sin(h) * s * 0.07, s * 0.07, 0, 7); deel(R, P, '#5ad86a') }
    lichtDeeltjes(R, 0, gy - s * 0.5, r)
  }

  // twee felle ogen recht van voren (linker gespiegeld)
  function felOgenVoor(R, x, y, s, afst) {
    var g = R.g
    g.save(); g.translate(x - afst, y); g.scale(-1, 1); felOog(R, 0, 0, s, false); g.restore()
    felOog(R, x + afst, y, s, false)
  }
  // ── tweebeners: beer, waterwezen, fee, paddenstoel, cactus, aap, pinguïn, mol ──
  var TWEEMAAT = {
    beer: [0.6, 0.55, 0.22, 0.19, 0.36], water: [0.5, 0.55, 0.2, 0.15, 0.35], fee: [0.32, 0.42, 0.3, 0.08, 0.32],
    paddo: [0.36, 0.42, 0.17, 0.1, 0.5], cactus: [0.42, 0.7, 0.16, 0.14, 0], aap: [0.4, 0.45, 0.26, 0.13, 0.33],
    pinguin: [0.55, 0.75, 0.06, 0.14, 0.34], mol: [0.56, 0.55, 0.16, 0.15, 0.32],
  }
  function tweebener(R) {
    var g = R.g, r = R.r, st = R.stad, t = R.t, v = R.v, P, i
    var m = TWEEMAAT[v] || TWEEMAAT.beer, sc = [0.82, 0.93, 1.04][st - 1]
    var rb = r * m[0] * sc * (st === 3 ? 1.1 : 1), rh = r * m[1] * sc, been = r * m[2] * sc * (st === 1 ? 0.75 : 1), arm = r * m[3] * sc * (st === 3 ? 1.25 : 1), ks = r * m[4] * [1.25, 1.05, 1][st - 1]
    var gy = r * 0.95, ry = gy - been - rh * 0.5, kx = 0, ky = ry - rh * 0.5 - ks * 0.62
    if (v === 'pinguin') ky = ry - rh * 0.5 - ks * 0.25
    if (v === 'paddo') ky = ry - rh * 0.45 - ks * 0.15
    var zwaai = R.stil ? 0 : Math.sin(t * 2.6) * 0.12
    var huidKl = v === 'paddo' ? (R.sil ? R.k : '#f4ecd8') : R.k
    // dingen achter het lijf
    if (v === 'fee') {
      var fl = R.stil ? 0 : Math.sin(t * 8) * 0.12, wg = rb * (1.0 + st * 0.55)
      ;[-1, 1].forEach(function (z) { [[-0.55, 1], [0.35, 0.7]].forEach(function (q) { g.save(); g.translate(z * rb * 0.25, ry - rh * 0.3); g.rotate(z * (q[0] + fl)); P = new Path2D(); P.moveTo(0, 0); P.bezierCurveTo(z * wg * 0.3, -wg * 0.6 * q[1], z * wg * 1.1, -wg * 0.75 * q[1], z * wg * 1.0 * q[1], -wg * 0.15); P.bezierCurveTo(z * wg * 0.8 * q[1], wg * 0.1, z * wg * 0.3, wg * 0.1, 0, 0); if (R.sil) deel(R, P, R.k); else { g.save(); g.globalAlpha *= 0.75; var gr = g.createLinearGradient(0, 0, z * wg, -wg * 0.5); gr.addColorStop(0, '#bff5a0'); gr.addColorStop(1, st === 3 ? '#ff8ad8' : '#7fe0a0'); g.fillStyle = gr; g.fill(P); g.restore(); g.strokeStyle = R.lijn; g.lineWidth = R.lw * 0.7; g.stroke(P); g.strokeStyle = 'rgba(40,120,60,0.4)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(z * wg * 0.8 * q[1], -wg * 0.35); g.stroke() } g.restore() }) })
    }
    if (R.L.extra === 'boom') { [[-0.75, -0.95, 0.55], [0.6, -1.05, 0.58], [-0.1, -1.55, 0.68], [0.0, -1.0, 0.5]].forEach(function (q) { P = new Path2D(); P.arc(q[0] * rb, ry + q[1] * rh * 1.3, q[2] * rb, 0, 7); deel(R, P, q[1] < -1.2 ? '#3fae58' : '#2f9a4a', q[0] * rb, ry + q[1] * rh * 1.3, q[2] * rb) }); if (!R.sil) { g.fillStyle = '#ff5a5a'; [[0.4, -1.6], [-0.5, -1.3], [0.15, -2.0]].forEach(function (q) { g.beginPath(); g.arc(q[0] * rb, ry + q[1] * rh, rb * 0.08, 0, 7); g.fill() }) } }
    if (v === 'water' && st === 3 && !R.sil) { g.save(); g.globalAlpha *= 0.7; g.strokeStyle = '#9fe0ff'; g.lineWidth = rb * 0.12; g.beginPath(); for (i = 0; i < 40; i++) { var h = i * 0.25 + t * 2, l = rb * (1.2 + Math.sin(i * 0.3) * 0.15); g.lineTo(Math.cos(h) * l, ry + Math.sin(h) * l * 0.5) } g.stroke(); g.restore() }
    if (v === 'aap') staartVier(R, -rb * 0.6, ry + rh * 0.25, r * 0.85, 1, 'kat', vachtKleur(R))
    // benen
    if (v !== 'cactus') [-1, 1].forEach(function (z) {
      var w = been * (v === 'beer' || v === 'mol' ? 0.95 : v === 'fee' ? 0.4 : 0.7), bx = z * rb * (v === 'fee' ? 0.3 : 0.45)
      if (v !== 'pinguin') poot(R, [[bx, ry + rh * 0.25], [bx + z * w * 0.15, gy - been * 0.5], [bx, gy - w * 0.3]], w, v === 'paddo' ? huidKl : R.donker)
      P = ell(bx + z * w * 0.2 + w * 0.15, gy - w * 0.3, w * (v === 'pinguin' ? 1.4 : 0.8), w * (v === 'pinguin' ? 0.55 : 0.38), 0)
      deel(R, P, v === 'pinguin' ? '#ff9a3d' : v === 'fee' ? '#3fbf5a' : R.donker)
      if (st === 3 && (v === 'beer' || v === 'mol' || v === 'water')) klauwen(R, bx + w * 0.5, gy - w * 0.35, w * 0.25)
    })
    // romp
    P = new Path2D()
    if (v === 'cactus') { var cw = rb, ch = rh * 1.1; P.moveTo(-cw * 0.5, gy); P.lineTo(-cw * 0.55, ry - ch * 0.4); P.quadraticCurveTo(-cw * 0.55, ry - ch * 0.95, 0, ry - ch * 0.95); P.quadraticCurveTo(cw * 0.55, ry - ch * 0.95, cw * 0.55, ry - ch * 0.4); P.lineTo(cw * 0.5, gy); P.closePath() }
    else if (v === 'water') { P.moveTo(0, ry - rh * 1.0); P.bezierCurveTo(rb * 0.5, ry - rh * 0.5, rb * 1.1, ry + rh * 0.2, rb * 0.75, ry + rh * 0.55); P.quadraticCurveTo(0, ry + rh * 0.85, -rb * 0.75, ry + rh * 0.55); P.bezierCurveTo(-rb * 1.1, ry + rh * 0.2, -rb * 0.5, ry - rh * 0.5, 0, ry - rh * 1.0) }
    else if (v === 'paddo') { P.moveTo(-rb * 0.6, ry - rh * 0.5); P.bezierCurveTo(-rb * 0.9, ry + rh * 0.2, -rb * 0.9, ry + rh * 0.6, -rb * 0.6, ry + rh * 0.6); P.lineTo(rb * 0.6, ry + rh * 0.6); P.bezierCurveTo(rb * 0.9, ry + rh * 0.6, rb * 0.9, ry + rh * 0.2, rb * 0.6, ry - rh * 0.5); P.closePath() }
    else { var sch = st === 3 ? 1.05 : 0.85; P.moveTo(-rb * sch, ry - rh * 0.35); P.bezierCurveTo(-rb * 1.08, ry + rh * 0.75, rb * 1.08, ry + rh * 0.75, rb * sch, ry - rh * 0.35); P.bezierCurveTo(rb * 0.6, ry - rh * 0.78, -rb * 0.6, ry - rh * 0.78, -rb * sch, ry - rh * 0.35) }
    var romp = P
    deel(R, P, v === 'fee' ? '#5ad86a' : huidKl, 0, ry - rh * 0.2, rb)
    if (!R.sil) {
      g.save(); g.clip(romp)
      if (v === 'pinguin') { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, ry + rh * 0.1, rb * 0.62, rh * 0.62, 0, 0, 7); g.fill() }
      else if (v === 'cactus') { g.strokeStyle = 'rgba(0,60,20,0.35)'; g.lineWidth = R.lw; [-0.25, 0.25].forEach(function (q) { g.beginPath(); g.moveTo(q * rb, gy); g.lineTo(q * rb * 1.1, ry - rh); g.stroke() }); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = R.lw * 0.6; for (i = 0; i < 12; i++) { var cx2 = ((i * 0.37) % 1 - 0.5) * rb * 0.95, cy2 = ry + ((i * 0.53) % 1 - 0.7) * rh * 1.4; g.beginPath(); g.moveTo(cx2, cy2); g.lineTo(cx2 + rb * 0.08, cy2 - rb * 0.06); g.moveTo(cx2, cy2); g.lineTo(cx2 - rb * 0.08, cy2 - rb * 0.06); g.stroke() } }
      else if (v === 'paddo') { g.fillStyle = 'rgba(160,120,80,0.25)'; for (i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-rb * 0.5 + i * rb * 0.25, ry - rh * 0.5); g.lineTo(-rb * 0.5 + i * rb * 0.25 + rb * 0.04, ry + rh * 0.6); g.lineTo(-rb * 0.5 + i * rb * 0.25 - rb * 0.03, ry + rh * 0.6); g.fill() } }
      else if (v === 'fee') { for (i = -2; i <= 2; i++) { g.fillStyle = i % 2 ? '#ff8ad8' : '#ffb0e8'; g.beginPath(); g.ellipse(i * rb * 0.35, ry + rh * 0.45, rb * 0.3, rh * 0.45, i * 0.2, 0, 7); g.fill() } }
      else { g.fillStyle = R.buik; g.beginPath(); g.ellipse(0, ry + rh * 0.15, rb * 0.55, rh * 0.5, 0, 0, 7); g.fill() }
      if (v === 'water') { g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = R.lw; for (var wv = 0; wv < 3; wv++) { g.beginPath(); for (var q = -5; q <= 5; q++) g.lineTo(q * rb * 0.2, ry - rh * 0.3 + wv * rh * 0.3 + Math.sin(q + t * 2) * rh * 0.05); g.stroke() } }
      if (R.type === 'plant' && v === 'beer' && st >= 2) { g.fillStyle = 'rgba(40,130,50,0.5)'; for (var bb = 0; bb < 6; bb++) { g.beginPath(); g.ellipse((bb - 2.5) * rb * 0.35, ry - rh * 0.45 + (bb % 2) * rh * 0.3, rb * 0.16, rb * 0.08, 0.5, 0, 7); g.fill() } }
      if (R.type === 'ijs' && v === 'beer') { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = R.lw * 0.7; for (var ib = 0; ib < 5; ib++) { var ix = (ib - 2) * rb * 0.35, iy = ry - rh * 0.5; g.beginPath(); g.moveTo(ix - rb * 0.08, iy); g.lineTo(ix, iy + rh * 0.12); g.lineTo(ix + rb * 0.08, iy); g.stroke() } }
      if (v === 'mol') { g.fillStyle = 'rgba(60,30,10,0.25)'; for (var md = 0; md < 8; md++) { g.beginPath(); g.arc(((md * 0.41) % 1 - 0.5) * rb * 1.6, ry + ((md * 0.67) % 1 - 0.5) * rh, rb * 0.04, 0, 7); g.fill() } }
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(-rb * 0.35, ry - rh * 0.4, rb * 0.3, rh * 0.15, -0.4, 0, 7); g.fill()
      g.restore()
      if (v === 'paddo') { P = ell(0, ry - rh * 0.4, rb * 0.85, rh * 0.12, 0); deel(R, P, '#e8dcc0') }
    }
    // schouderstukken (laatste stadium)
    if (st === 3 && v !== 'fee' && v !== 'pinguin' && v !== 'cactus' && v !== 'paddo') {
      [-1, 1].forEach(function (z) {
        var sx = z * rb * 0.85, sy = ry - rh * 0.45
        if (v === 'water') { P = new Path2D(); P.arc(sx, sy, rb * 0.32, Math.PI, 0); P.closePath(); deel(R, P, '#f4e0f0', sx, sy - rb * 0.1, rb * 0.3); if (!R.sil) { g.strokeStyle = 'rgba(120,60,100,0.5)'; g.lineWidth = R.lw * 0.7; for (var sr = -2; sr <= 2; sr++) { g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + sr * rb * 0.13, sy - rb * 0.28); g.stroke() } } }
        else if (R.type === 'ijs') { for (var ic = 0; ic < 3; ic++) { P = new Path2D(); var ix2 = sx + z * (ic - 1) * rb * 0.14, lg = rb * (0.3 + (ic === 1 ? 0.2 : 0)); P.moveTo(ix2 - rb * 0.08, sy); P.lineTo(ix2 + z * rb * 0.05, sy - lg); P.lineTo(ix2 + rb * 0.08, sy); P.closePath(); deel(R, P, '#e8fbff', ix2, sy - lg * 0.5, lg * 0.4) } }
        else if (R.type === 'plant') { P = ell(sx, sy, rb * 0.34, rb * 0.24, z * 0.3); deel(R, P, '#8a5a32', sx, sy, rb * 0.3); if (!R.sil) { g.fillStyle = '#3fbf5a'; g.beginPath(); g.ellipse(sx, sy - rb * 0.18, rb * 0.26, rb * 0.1, 0, 0, 7); g.fill() } }
        else { P = ell(sx, sy, rb * 0.34, rb * 0.25, z * 0.35); deel(R, P, '#9a8a7a', sx, sy, rb * 0.3) }
      })
    }
    // armen
    ;[-1, 1].forEach(function (z) {
      var sx = z * rb * (v === 'fee' ? 0.6 : v === 'pinguin' ? 0.88 : 0.82), sy = ry - rh * 0.3
      g.save(); g.translate(sx, sy); g.rotate(z * (0.25 + zwaai * (v === 'aap' ? 1.6 : 1)))
      if (v === 'pinguin') { P = new Path2D(); P.moveTo(-arm * 0.6, 0); P.quadraticCurveTo(z * arm * 2.2, rh * 0.4, z * arm * 0.6, rh * 0.75); P.quadraticCurveTo(0, rh * 0.4, -arm * 0.6 * z, 0); deel(R, P, R.donker) }
      else if (v === 'cactus') { P = new Path2D(); P.moveTo(0, -arm * 0.5); P.lineTo(z * arm * 1.4, -arm * 0.5); P.quadraticCurveTo(z * arm * 2.1, -arm * 0.5, z * arm * 2.1, -arm * 1.2); P.lineTo(z * arm * 2.1, -arm * 2.6); P.quadraticCurveTo(z * arm * 2.1, -arm * 3.2, z * arm * 1.5, -arm * 3.2); P.quadraticCurveTo(z * arm * 0.9, -arm * 3.2, z * arm * 0.9, -arm * 2.6); P.lineTo(z * arm * 0.9, arm * 0.5); P.lineTo(0, arm * 0.5); P.closePath(); deel(R, P, R.k); if (R.L.extra === 'stekels' && st === 2 && !R.sil) { g.fillStyle = '#ff8ad8'; g.beginPath(); g.arc(z * arm * 1.5, -arm * 3.3, arm * 0.35, 0, 7); g.fill() } }
      else {
        var al = rh * (v === 'aap' ? 0.95 : 0.6) + arm
        poot(R, [[0, 0], [z * arm * 0.4, al * 0.5], [z * arm * 0.15, al]], arm, v === 'fee' ? '#5ad86a' : huidKl === '#f4ecd8' ? '#e8dcc0' : R.k)
        if (v === 'mol') { P = ell(z * arm * 0.15, al + arm * 0.5, arm * 1.0, arm * 0.75, z * 0.3); deel(R, P, '#ffb8a8'); klauwen(R, z * arm * 0.15 - arm * 0.4, al + arm * 1.0, arm * 0.35) }
        else if (v === 'water' && st >= 2) { P = new Path2D(); P.moveTo(z * arm * 0.3, al * 0.2); P.quadraticCurveTo(z * arm * 2.6, al * 0.5, z * arm * 1.2, al * 1.2); P.quadraticCurveTo(z * arm * 0.8, al * 0.7, z * arm * 0.1, al * 0.8); P.closePath(); deel(R, P, R.hel); P = new Path2D(); P.arc(z * arm * 0.15, al, arm * 0.7, 0, 7); deel(R, P, R.k) }
        else if (v === 'fee') { P = ell(z * arm * 0.15, al + arm * 0.4, arm * 0.9, arm * 0.5, z * 0.6); deel(R, P, '#3fbf5a') }
        else { P = new Path2D(); P.arc(z * arm * 0.15, al, arm * 0.78, 0, 7); deel(R, P, huidKl === '#f4ecd8' ? '#e8dcc0' : R.donker, z * arm * 0.15, al, arm * 0.7); if (st === 3 && (v === 'beer' || v === 'aap')) klauwen(R, z * arm * 0.15 - arm * 0.35, al + arm * 0.55, arm * 0.3) }
      }
      g.restore()
    })
    // kop
    if (v === 'cactus') {
      var fy = ry - rh * 0.55
      oogVoor(R, 0, fy, rb * 0.13, rb * 0.22, false)
      if (st === 2) felOgenVoor(R, 0, fy, rb * 0.12, rb * 0.24)
      if (!R.sil) { g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.beginPath(); if (st === 2) { g.moveTo(-rb * 0.15, fy + rb * 0.25); g.lineTo(rb * 0.15, fy + rb * 0.25); g.stroke(); tanden(R, -rb * 0.13, fy + rb * 0.25, rb * 0.08, 3) } else { g.arc(0, fy + rb * 0.18, rb * 0.1, 0.3, Math.PI - 0.3); g.stroke() } }
      P = new Path2D(); var fb = ry - rh * 1.05; for (var bl = 0; bl < 5; bl++) { var hb = bl * 1.257 - 1.57; P.moveTo(Math.cos(hb) * rb * 0.22, fb + Math.sin(hb) * rb * 0.22); P.arc(Math.cos(hb) * rb * 0.22, fb + Math.sin(hb) * rb * 0.22, rb * 0.15, 0, 7) } deel(R, P, '#ff8ad8'); P = new Path2D(); P.arc(0, fb, rb * 0.12, 0, 7); deel(R, P, '#ffe14f')
      lichtDeeltjes(R, 0, ry, r); return
    }
    // oren en haar achter de kop
    if (v === 'beer' || v === 'mol' || v === 'aap') [-1, 1].forEach(function (z) {
      var ox = z * ks * (v === 'aap' ? 0.98 : 0.72), oy = ky - ks * (v === 'aap' ? 0 : 0.65), orr = ks * (v === 'aap' ? 0.3 : v === 'mol' ? 0.2 : 0.32)
      P = new Path2D(); P.arc(ox, oy, orr, 0, 7); deel(R, P, R.k); if (!R.sil) { g.fillStyle = v === 'aap' ? '#ffd8b0' : '#ffb8c8'; g.beginPath(); g.arc(ox, oy, orr * 0.55, 0, 7); g.fill() }
    })
    if (v === 'water') { P = new Path2D(); P.moveTo(-ks * 0.45, ky - ks * 0.55); P.quadraticCurveTo(-ks * 0.2, ky - ks * (1.5 + st * 0.2), ks * 0.15 + (R.stil ? 0 : Math.sin(t * 2) * ks * 0.08), ky - ks * (1.65 + st * 0.2)); P.quadraticCurveTo(ks * 0.1, ky - ks, ks * 0.45, ky - ks * 0.55); P.closePath(); deel(R, P, R.hel, 0, ky - ks, ks * 0.5); [-1, 1].forEach(function (z) { P = new Path2D(); P.moveTo(z * ks * 0.7, ky - ks * 0.1); P.quadraticCurveTo(z * ks * 1.35, ky - ks * 0.6, z * ks * 1.45, ky - ks * 1.0); P.quadraticCurveTo(z * ks * 1.1, ky - ks * 0.2, z * ks * 0.8, ky + ks * 0.3); P.closePath(); deel(R, P, R.donker) }) }
    if (v === 'fee') { for (var hr = 0; hr < 7; hr++) { var hx = (hr - 3) * ks * 0.3; P = new Path2D(); P.moveTo(hx - ks * 0.12, ky - ks * 0.55); P.quadraticCurveTo(hx + ks * 0.25, ky - ks * (1.3 + Math.abs(hr - 3) * -0.1), hx + ks * 0.2, ky - ks * 0.45); P.closePath(); deel(R, P, hr % 2 ? '#3fbf5a' : '#5ad86a') } }
    // kop zelf
    P = new Path2D()
    if (v === 'paddo') P.ellipse(kx, ky + ks * 0.2, ks * 0.62, ks * 0.55, 0, 0, 7)
    else if (v === 'mol') P.ellipse(kx, ky, ks, ks * 0.85, 0, 0, 7)
    else P.arc(kx, ky, ks, 0, 7)
    deel(R, P, v === 'pinguin' ? R.donker : huidKl, kx, ky, ks)
    if (!R.sil) {
      if (v === 'pinguin') { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(kx - ks * 0.32, ky + ks * 0.05, ks * 0.38, ks * 0.45, 0, 0, 7); g.ellipse(kx + ks * 0.32, ky + ks * 0.05, ks * 0.38, ks * 0.45, 0, 0, 7); g.fill(); if (st === 3) { g.fillStyle = '#ffd23d'; g.beginPath(); g.ellipse(kx - ks * 0.75, ky + ks * 0.25, ks * 0.18, ks * 0.3, 0.3, 0, 7); g.ellipse(kx + ks * 0.75, ky + ks * 0.25, ks * 0.18, ks * 0.3, -0.3, 0, 7); g.fill() } }
      if (v === 'aap') { g.fillStyle = '#ffd8b0'; g.beginPath(); g.ellipse(kx, ky + ks * 0.15, ks * 0.7, ks * 0.65, 0, 0, 7); g.fill() }
      if (v === 'beer') { g.fillStyle = R.buikVast; g.beginPath(); g.ellipse(kx, ky + ks * 0.38, ks * 0.38, ks * 0.28, 0, 0, 7); g.fill() }
    }
    var os = ks * [0.26, 0.21, 0.19][st - 1] * (v === 'mol' ? 0.6 : 1), oy = ky - ks * (v === 'paddo' ? -0.12 : 0.05)
    if (st === 3 && v !== 'fee') felOgenVoor(R, kx, oy, os * 0.85, ks * 0.38)
    else oogVoor(R, kx, oy, os, ks * 0.36, false)
    // neus en mond
    if (R.L.snavel || v === 'pinguin') { P = new Path2D(); P.moveTo(kx - ks * 0.2, ky + ks * 0.25); P.lineTo(kx + ks * 0.2, ky + ks * 0.25); P.lineTo(kx, ky + ks * 0.62); P.closePath(); deel(R, P, '#ffb02e') }
    else if (!R.sil) {
      if (v === 'mol') { P = new Path2D(); for (var nn = 0; nn < 10; nn++) { var nh = nn / 10 * Math.PI * 2, nl = nn % 2 ? ks * 0.14 : ks * 0.26; if (nn) P.lineTo(kx + Math.cos(nh) * nl, ky + ks * 0.32 + Math.sin(nh) * nl); else P.moveTo(kx + Math.cos(nh) * nl, ky + ks * 0.32 + Math.sin(nh) * nl) } P.closePath(); deel(R, P, '#ff8aa8') }
      else if (v === 'beer') { g.fillStyle = '#1a1424'; g.beginPath(); g.ellipse(kx, ky + ks * 0.28, ks * 0.13, ks * 0.09, 0, 0, 7); g.fill() }
      g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.beginPath()
      if (st === 3) { g.fillStyle = '#4a0f1e'; g.moveTo(kx - ks * 0.28, ky + ks * 0.5); g.quadraticCurveTo(kx, ky + ks * 0.82, kx + ks * 0.28, ky + ks * 0.5); g.closePath(); g.fill(); g.stroke(); tanden(R, kx - ks * 0.24, ky + ks * 0.51, ks * 0.13, 4) }
      else { g.arc(kx, ky + ks * 0.42, ks * 0.15, 0.3, Math.PI - 0.3); g.stroke() }
    }
    if (st < 3 || v === 'fee') { wang(R, kx - ks * 0.55, ky + ks * 0.3, ks * 0.14); wang(R, kx + ks * 0.55, ky + ks * 0.3, ks * 0.14) }
    // hoed van de paddenstoel, mijnwerkershelm van de mol, kroon enzovoort
    if (v === 'paddo') kopExtra(R, kx, ky - ks * 0.2, ks * (1.0 + st * 0.18))
    else if (v === 'mol' && st === 2) { P = new Path2D(); P.arc(kx, ky - ks * 0.35, ks * 0.75, Math.PI, 0); P.closePath(); deel(R, P, '#ffd23d', kx, ky - ks * 0.6, ks * 0.5); P = new Path2D(); P.arc(kx, ky - ks * 0.8, ks * 0.17, 0, 7); deel(R, P, '#fff6cf'); gloedVlek(R, kx, ky - ks * 0.8, ks * 0.9, '#fff6cf', 0.6) }
    else if (R.L.extra !== 'boom' && R.L.extra !== 'manen') kopExtra(R, kx, ky - ks * 0.85, ks)
    if (R.L.extra === 'manen' && !R.sil) { g.fillStyle = 'rgba(255,255,255,0.85)'; for (var mi = 0; mi < 5; mi++) { g.beginPath(); g.arc(kx + (mi - 2) * ks * 0.3, ky - ks * 0.85 + Math.abs(mi - 2) * ks * 0.12, ks * 0.16, 0, 7); g.fill() } }
    lichtDeeltjes(R, 0, ry, r)
  }

  // ── vogel (en vleermuis) ──
  function vogel(R) {
    var g = R.g, r = R.r, st = R.stad, t = R.t, v = R.v, P
    var lijfS = r * [0.42, 0.5, 0.56][st - 1], kopS = r * [0.38, 0.32, 0.3][st - 1]
    var by = r * 0.15, bx = -r * 0.1, kx = bx + lijfS * 0.55, ky = by - lijfS * 0.85
    if (v === 'uil') { kx = bx + lijfS * 0.1; ky = by - lijfS * 0.75; kopS *= 1.15 }
    var slag = R.stil ? -0.3 : Math.sin(t * 6) * 0.45
    var vleermuis = v === 'vleermuis'
    var vleugel = function (achter) {
      var wl = r * [0.55, 0.8, 1.05][st - 1]
      g.save(); g.translate(bx - lijfS * 0.1, by - lijfS * 0.35); g.rotate((achter ? -0.9 : -0.55) + (st === 3 ? 1.05 : st === 2 ? 0.35 : 0) + slag * (achter ? 0.6 : 1))
      P = new Path2D()
      if (vleermuis) { var pols = [-wl * 0.38, -wl * 0.78], tips = [[-wl * 1.02, -wl * 0.72], [-wl * 1.08, -wl * 0.28], [-wl * 0.78, wl * 0.12], [-wl * 0.25, wl * 0.25]]; P.moveTo(0, 0); P.lineTo(pols[0], pols[1]); P.lineTo(tips[0][0], tips[0][1]); for (var vt = 1; vt < 4; vt++) P.quadraticCurveTo((tips[vt - 1][0] + tips[vt][0]) / 2 * 0.72 + pols[0] * 0.28, (tips[vt - 1][1] + tips[vt][1]) / 2 * 0.72 + pols[1] * 0.28, tips[vt][0], tips[vt][1]); P.closePath(); R.botten = function () { if (R.sil) return; g.strokeStyle = R.lijn; g.lineWidth = R.lw * 1.1; g.beginPath(); g.moveTo(0, 0); g.lineTo(pols[0], pols[1]); tips.slice(0, 3).forEach(function (q) { g.moveTo(pols[0], pols[1]); g.lineTo(q[0], q[1]) }); g.stroke(); var P5 = new Path2D(); P5.moveTo(pols[0], pols[1]); P5.lineTo(pols[0] + wl * 0.12, pols[1] - wl * 0.14); P5.lineTo(pols[0] + wl * 0.08, pols[1] + wl * 0.02); P5.closePath(); deel(R, P5, '#f4ecd8') } }
      else { R.botten = null; P.moveTo(0, 0); P.quadraticCurveTo(-wl * 0.35, -wl * 0.75, -wl * 1.0, -wl * 0.6); P.quadraticCurveTo(-wl * 0.75, -wl * 0.35, -wl * 0.95, -wl * 0.2); P.quadraticCurveTo(-wl * 0.65, -wl * 0.05, -wl * 0.75, wl * 0.12); P.quadraticCurveTo(-wl * 0.35, wl * 0.1, 0, wl * 0.25); P.closePath() }
      deel(R, P, achter ? R.donker : R.k, -wl * 0.5, -wl * 0.3, wl * 0.4)
      if (R.botten) R.botten()
      if (!R.sil && !vleermuis) { g.strokeStyle = 'rgba(0,0,30,0.3)'; g.lineWidth = R.lw * 0.7; for (var f = 1; f < 4; f++) { g.beginPath(); g.moveTo(-wl * 0.15 * f, wl * 0.02 * f); g.lineTo(-wl * (0.35 + f * 0.18), -wl * (0.45 - f * 0.1)); g.stroke() } if (R.type === 'vuur' || v === 'feniks') vlam(R, -wl * 0.95, -wl * 0.6, wl * 0.22, -0.8) }
      if (!R.sil && v === 'paradijs') { var kl = ['#ff5a8a', '#ffd23d', '#5be37a', '#3fa8ff']; for (var p = 0; p < 4; p++) { g.fillStyle = kl[p]; g.globalAlpha = 0.55; g.beginPath(); g.ellipse(-wl * (0.4 + p * 0.15), -wl * (0.45 - p * 0.08), wl * 0.12, wl * 0.05, -0.6, 0, 7); g.fill() } g.globalAlpha = 1 }
      g.restore()
    }
    vleugel(true)
    // staartveren
    if (!vleermuis) { var vs = r * [0.3, 0.45, 0.65][st - 1]; for (var q = -1; q <= 1; q++) { P = ell(bx - lijfS * 0.85 - vs * 0.4, by + lijfS * 0.25 + q * vs * 0.12, vs * 0.6, vs * 0.13, 0.4 + q * 0.3); deel(R, P, v === 'paradijs' ? ['#ff5a8a', '#ffd23d', '#3fa8ff'][q + 1] : (q ? R.donker : R.k)) } if (R.L.staart === 'vlam' || v === 'feniks') { vlam(R, bx - lijfS * 0.9, by + lijfS * 0.3, vs * 0.8, -2.0); vlam(R, bx - lijfS * 0.8, by + lijfS * 0.45, vs * 0.6, -2.4) } }
    // poten
    ;[-0.15, 0.2].forEach(function (q) { g.strokeStyle = R.sil ? R.lijn : '#ff9a3d'; g.lineWidth = r * 0.06; g.beginPath(); g.moveTo(bx + q * lijfS, by + lijfS * 0.75); g.lineTo(bx + q * lijfS, r * 0.92); g.stroke(); if (st === 3) klauwen(R, bx + q * lijfS - r * 0.03, r * 0.92, r * 0.05) })
    // lijf
    P = ell(bx, by, lijfS, lijfS * 0.85, -0.2); deel(R, P, R.k, bx, by, lijfS)
    if (!R.sil) { g.save(); g.clip(P); g.fillStyle = R.buik; g.beginPath(); g.ellipse(bx + lijfS * 0.35, by + lijfS * 0.3, lijfS * 0.55, lijfS * 0.6, -0.3, 0, 7); g.fill(); if (v === 'uil') { g.strokeStyle = 'rgba(0,0,30,0.25)'; g.lineWidth = R.lw * 0.7; for (var c = 0; c < 6; c++) { g.beginPath(); g.arc(bx + lijfS * 0.3 + (c % 3 - 1) * lijfS * 0.25, by + lijfS * (0.1 + Math.floor(c / 3) * 0.3), lijfS * 0.08, 0.2, Math.PI - 0.2); g.stroke() } } g.restore() }
    // kop
    if (v === 'uil' || vleermuis) { [-1, 1].forEach(function (z) { P = new Path2D(); P.moveTo(kx + z * kopS * 0.35, ky - kopS * 0.6); P.lineTo(kx + z * kopS * (vleermuis ? 0.75 : 0.65), ky - kopS * (vleermuis ? 1.45 : 1.15)); P.lineTo(kx + z * kopS * 0.75, ky - kopS * 0.35); P.closePath(); deel(R, P, R.donker) }) }
    else if (R.L.oor === 'pluim' || v === 'feniks') { for (var k2 = 0; k2 < 2 + st; k2++) { P = ell(kx - kopS * 0.3 - k2 * kopS * 0.15, ky - kopS * 0.8 - k2 * kopS * 0.05, kopS * 0.35, kopS * 0.1, -0.9 + k2 * 0.2); deel(R, P, v === 'feniks' ? '#ffd23d' : v === 'paradijs' ? '#ff5a8a' : R.donker) } }
    P = new Path2D(); P.arc(kx, ky, kopS, 0, 7); deel(R, P, R.k, kx, ky, kopS)
    if (v === 'uil' && !R.sil) { g.fillStyle = R.buik; g.beginPath(); g.ellipse(kx - kopS * 0.38, ky + kopS * 0.05, kopS * 0.42, kopS * 0.45, 0, 0, 7); g.ellipse(kx + kopS * 0.38, ky + kopS * 0.05, kopS * 0.42, kopS * 0.45, 0, 0, 7); g.fill() }
    var os = kopS * [0.3, 0.26, 0.24][st - 1]
    if (v === 'uil' || vleermuis) oogVoor(R, kx, ky, os, kopS * 0.38, st === 3)
    else oogZij(R, kx + kopS * 0.3, ky - kopS * 0.1, os, st === 3)
    if (vleermuis) { if (!R.sil) { g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.beginPath(); g.arc(kx, ky + kopS * 0.4, kopS * 0.15, 0.2, Math.PI - 0.2); g.stroke(); tanden(R, kx - kopS * 0.14, ky + kopS * 0.42, kopS * 0.14, 2) } }
    else { P = new Path2D(); var sx = v === 'uil' ? kx : kx + kopS * 0.75, sy = v === 'uil' ? ky + kopS * 0.35 : ky + kopS * 0.1; P.moveTo(sx - kopS * 0.15, sy - kopS * 0.18); P.quadraticCurveTo(sx + kopS * (0.5 + st * 0.08), sy - kopS * 0.05, sx + kopS * (0.25 + st * 0.06), sy + kopS * 0.28); P.lineTo(sx - kopS * 0.1, sy + kopS * 0.15); P.closePath(); deel(R, P, '#ffb02e') }
    kopExtra(R, kx, ky - kopS * 0.85, kopS)
    vleugel(false)
    if (R.type === 'bliksem' && st >= 2) gloedVlek(R, bx, by, lijfS * 1.6, '#ffe14f', 0.15 + Math.sin(t * 8) * 0.08)
    lichtDeeltjes(R, bx, by, r)
  }

  // ── hulpjes voor gebogen lijven (slang, draak, libellenstaart) ──
  function crPunt(a, b, c, d, u) {
    var u2 = u * u, u3 = u2 * u
    return [0, 1].map(function (k) { return 0.5 * (2 * b[k] + (-a[k] + c[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u2 + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * u3) })
  }
  function spline(c, n) {
    var uit = []
    for (var i = 0; i < n; i++) {
      var f = i / (n - 1) * (c.length - 1), k = Math.min(c.length - 2, Math.floor(f)), u = f - k
      uit.push(crPunt(c[Math.max(0, k - 1)], c[k], c[k + 1], c[Math.min(c.length - 1, k + 2)], u))
    }
    return uit
  }
  // normaal per punt: wijst naar de rug (links van de looprichting staart → kop)
  function normalen(p) { return p.map(function (q, i) { var a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l] }) }
  function buisPad(p, n, hw, van, tot, i0, i1) {
    var P = new Path2D(), i
    i0 = i0 || 0; i1 = i1 == null ? p.length - 1 : i1
    for (i = i0; i <= i1; i++) { var x = p[i][0] + n[i][0] * hw[i] * tot, y = p[i][1] + n[i][1] * hw[i] * tot; if (i === i0) P.moveTo(x, y); else P.lineTo(x, y) }
    for (i = i1; i >= i0; i--) P.lineTo(p[i][0] + n[i][0] * hw[i] * van, p[i][1] + n[i][1] * hw[i] * van)
    P.closePath(); return P
  }
  function op(p, n, hw, i, zij) { return [p[i][0] + n[i][0] * hw[i] * zij, p[i][1] + n[i][1] * hw[i] * zij] }
  // veren-vleugel (engel/vogel): waaier van lange veren
  function verenVleugel(R, x, y, wl, hoek, achter) {
    var g = R.g, P
    g.save(); g.translate(x, y); g.rotate(hoek); if (achter) g.scale(0.82, 0.82)
    var wit = R.type === 'lucht' ? '#ffffff' : R.hel
    for (var f = 0; f < 8; f++) {
      var h = -2.75 + f * 0.2, l = wl * (1.0 - f * 0.07)
      g.save(); g.rotate(h)
      P = new Path2D(); P.moveTo(0, -wl * 0.05); P.quadraticCurveTo(l * 0.6, -wl * 0.12, l, 0); P.quadraticCurveTo(l * 0.6, wl * 0.11, 0, wl * 0.05); P.closePath()
      deel(R, P, achter ? R.donker : (f % 2 ? wit : R.hel))
      if (!R.sil) { g.strokeStyle = 'rgba(0,0,40,0.25)'; g.lineWidth = R.lw * 0.5; g.beginPath(); g.moveTo(l * 0.15, 0); g.lineTo(l * 0.9, 0); g.stroke() }
      g.restore()
    }
    P = ell(wl * 0.12, -wl * 0.18, wl * 0.32, wl * 0.2, -0.9); deel(R, P, achter ? R.donker : R.k, wl * 0.1, -wl * 0.2, wl * 0.2)
    g.restore()
  }

  // ── draak, zeeslang, aal en slang: een gekruld lijf met een echte drakenkop ──
  function draak(R) {
    var g = R.g, r = R.r, st = R.stad, t = R.t, v = R.v, P, i
    var slang = v === 'slang', aal = v === 'aal', hemel = v === 'hemel', water = v === 'water'
    var dik = r * [0.21, 0.2, 0.22][st - 1] * (aal ? 0.9 : 1)
    var c = st === 1
      ? [[-0.85, 0.78], [-0.4, 0.88], [0.1, 0.82], [0.38, 0.55], [0.18, 0.28], [-0.12, 0.12], [-0.12, -0.15], [0.12, -0.28]]
      : [[-1.02, 0.6], [-0.8, 0.88], [-0.3, 0.95], [0.2, 0.84], [0.42, 0.52], [0.16, 0.24], [-0.2, 0.08], [-0.34, -0.22], [-0.16, -0.46], [0.08, -0.5]]
    var N = 48, p = spline(c.map(function (q) { return [q[0] * r, q[1] * r] }), N), n = normalen(p)
    if (!R.stil) { p = p.map(function (q, k) { var f = k / (N - 1), a = Math.sin(f * 9 - t * 3) * r * 0.025 * (1 - f * 0.7); return [q[0] + n[k][0] * a, q[1] + n[k][1] * a] }); n = normalen(p) }
    var hw = p.map(function (q, k) { var f = k / (N - 1); return dik * (0.1 + 0.9 * Math.sin(Math.min(1, f * 1.45) * Math.PI / 2)) * (f > 0.86 ? 1 - (f - 0.86) * 1.3 : 1) })
    var tan = function (k) { return [-n[k][1], n[k][0]] }
    var vleugels = hemel || R.L.extra === 'vleugel'
    var wa = p[Math.round(N * 0.76)]
    if (vleugels) verenVleugel(R, wa[0], wa[1] - dik * 0.3, r * (0.7 + st * 0.12), -0.35 + (R.stil ? 0 : Math.sin(t * 4) * 0.22), true)
    // staartpunt
    var s0 = p[0], t0 = tan(0), ha = Math.atan2(-t0[1], -t0[0])
    g.save(); g.translate(s0[0], s0[1]); g.rotate(ha)
    if (aal) { P = new Path2D(); P.moveTo(0, -dik * 0.3); P.lineTo(dik * 1.0, -dik * 0.9); P.lineTo(dik * 0.85, -dik * 0.25); P.lineTo(dik * 1.9, -dik * 0.6); P.lineTo(dik * 1.05, dik * 0.35); P.lineTo(dik * 1.2, -dik * 0.1); P.lineTo(0, dik * 0.3); P.closePath(); deel(R, P, '#ffe14f'); gloedVlek(R, dik, 0, dik * 2, '#ffe14f', 0.4) }
    else if (water) { P = new Path2D(); P.moveTo(-dik * 0.1, 0); P.quadraticCurveTo(dik * 0.8, -dik * 0.4, dik * 1.6, -dik * 1.3); P.quadraticCurveTo(dik * 1.2, 0, dik * 1.6, dik * 1.2); P.quadraticCurveTo(dik * 0.8, dik * 0.4, -dik * 0.1, 0.01); deel(R, P, R.hel) }
    else if (hemel) { for (var vf = -1; vf <= 1; vf++) { P = ell(dik * 1.0, vf * dik * 0.4, dik * 1.1, dik * 0.28, vf * 0.4); deel(R, P, vf ? '#ffffff' : R.hel) } }
    else if (slang && st === 3) { for (var ra = 0; ra < 4; ra++) { P = ell(dik * (0.25 + ra * 0.36), 0, dik * 0.24, dik * (0.42 - ra * 0.05), 0); deel(R, P, ra % 2 ? '#e8d8b0' : '#c8a878') } }
    g.restore()
    // rugvin of stekels
    var vin = aal || water || hemel
    if (vin) {
      var i0 = 5, i1 = N - 6
      P = new Path2D()
      for (i = i0; i <= i1; i++) { var golf = (0.55 + 0.45 * Math.abs(Math.sin(i * 0.55))) * (0.9 + st * 0.25), q = op(p, n, hw, i, 1 + golf); if (i === i0) P.moveTo(q[0], q[1]); else P.lineTo(q[0], q[1]) }
      for (i = i1; i >= i0; i--) { q = op(p, n, hw, i, 0.6); P.lineTo(q[0], q[1]) }
      P.closePath(); g.save(); if (!R.sil) g.globalAlpha *= 0.9; deel(R, P, aal ? '#ffe14f' : hemel ? '#ffffff' : R.hel); g.restore()
      if (!R.sil) { g.strokeStyle = 'rgba(0,0,40,0.3)'; g.lineWidth = R.lw * 0.6; for (i = i0 + 1; i < i1; i += 2) { var a1 = op(p, n, hw, i, 0.7), a2 = op(p, n, hw, i, 1 + (0.55 + 0.45 * Math.abs(Math.sin(i * 0.55))) * (0.9 + st * 0.25) * 0.92); g.beginPath(); g.moveTo(a1[0], a1[1]); g.lineTo(a2[0], a2[1]); g.stroke() } }
    } else if (st >= 2) {
      for (i = 6; i < N - 5; i += 3) {
        var tg = tan(i), b1 = op(p, n, hw, i, 0.7), lang = hw[i] * (0.7 + st * 0.3)
        P = new Path2D(); P.moveTo(b1[0] - tg[0] * hw[i] * 0.45, b1[1] - tg[1] * hw[i] * 0.45); P.lineTo(b1[0] + n[i][0] * lang - tg[0] * hw[i] * 0.55, b1[1] + n[i][1] * lang - tg[1] * hw[i] * 0.55); P.lineTo(b1[0] + tg[0] * hw[i] * 0.45, b1[1] + tg[1] * hw[i] * 0.45); P.closePath()
        deel(R, P, slang ? '#e8d8b0' : R.donker)
      }
    }
    // het lijf
    P = buisPad(p, n, hw, -1, 1)
    deel(R, P, R.k)
    if (!R.sil) {
      g.save(); g.clip(P)
      g.fillStyle = R.donker; g.globalAlpha = 0.55; g.fill(buisPad(p, n, hw, 0.35, 1.05)); g.globalAlpha = 1
      g.fillStyle = R.buikVast; g.fill(buisPad(p, n, hw, -1.05, -0.3))
      g.strokeStyle = 'rgba(0,0,40,0.28)'; g.lineWidth = R.lw * 0.7
      for (i = 2; i < N - 1; i += 2) { var b2 = op(p, n, hw, i, -1), b3 = op(p, n, hw, i, -0.3); g.beginPath(); g.moveTo(b2[0], b2[1]); g.lineTo(b3[0], b3[1]); g.stroke() }
      if (slang || R.L.streep) { g.fillStyle = slang ? '#5a3a1a' : R.lijn; for (i = 3; i < N - 3; i += 4) { var m = op(p, n, hw, i, 0.55), tg2 = tan(i), d = hw[i] * 0.42; g.beginPath(); g.moveTo(m[0] + tg2[0] * d, m[1] + tg2[1] * d); g.lineTo(m[0] + n[i][0] * d * 0.6, m[1] + n[i][1] * d * 0.6); g.lineTo(m[0] - tg2[0] * d, m[1] - tg2[1] * d); g.lineTo(m[0] - n[i][0] * d * 0.6, m[1] - n[i][1] * d * 0.6); g.closePath(); g.fill() } }
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = dik * 0.22; g.beginPath(); for (i = 2; i < N; i++) { var h2 = op(p, n, hw, i, 0.55); if (i === 2) g.moveTo(h2[0], h2[1]); else g.lineTo(h2[0], h2[1]) } g.stroke()
      if (aal || R.type === 'bliksem') { g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,235,90,' + (0.55 + Math.sin(t * 9) * 0.3) + ')'; g.lineWidth = dik * 0.16; g.beginPath(); for (i = 0; i < N; i++) { var h3 = op(p, n, hw, i, 0.05); if (i) g.lineTo(h3[0], h3[1]); else g.moveTo(h3[0], h3[1]) } g.stroke(); for (i = 4; i < N; i += 6) { var h4 = op(p, n, hw, i, -0.6); NK.vlek(g, h4[0], h4[1], dik * 0.5, '#ffe14f', 0.7) } }
      if (water) { g.fillStyle = 'rgba(255,255,255,0.35)'; for (i = 4; i < N - 4; i += 5) { var h5 = op(p, n, hw, i, 0.2); g.beginPath(); g.arc(h5[0], h5[1], hw[i] * 0.16, 0, 7); g.fill() } }
      g.restore()
    }
    if (vleugels) verenVleugel(R, wa[0] + dik * 0.2, wa[1] - dik * 0.2, r * (0.7 + st * 0.12), -0.15 + (R.stil ? 0 : Math.sin(t * 4) * 0.3), false)
    // de kop
    var e = p[N - 1], hs = r * [0.36, 0.33, 0.36][st - 1]
    g.save(); g.translate(e[0] + hs * 0.2, e[1] - hs * 0.05)
    drakenKop(R, hs, st, v)
    g.restore()
    if (R.type === 'water' && st === 3) gloedVlek(R, 0, 0, r * 1.2, '#5ac8ff', 0.1)
    lichtDeeltjes(R, 0, 0, r)
  }
  function drakenKop(R, hs, st, v) {
    var g = R.g, t = R.t, P, slang = v === 'slang', aal = v === 'aal', hemel = v === 'hemel', water = v === 'water'
    var sf = [0.62, 0.85, 1][st - 1]
    var X = function (x) { return x > 0.25 ? 0.25 + (x - 0.25) * sf : x }
    var open = st === 3 ? 0.32 + (R.stil ? 0 : Math.max(0, Math.sin(t * 1.4)) * 0.12) : st === 2 && !slang ? 0.1 : 0
    // kobrakap
    if (slang && st === 3) {
      P = new Path2D(); P.moveTo(-0.15 * hs, 0.7 * hs); P.bezierCurveTo(-1.45 * hs, 0.5 * hs, -1.35 * hs, -1.5 * hs, -0.05 * hs, -1.15 * hs); P.bezierCurveTo(0.55 * hs, -0.95 * hs, 0.45 * hs, 0.25 * hs, 0.2 * hs, 0.7 * hs); P.closePath()
      deel(R, P, R.k, -0.4 * hs, -0.3 * hs, hs)
      if (!R.sil) { g.save(); g.clip(P); g.fillStyle = R.buikVast; g.beginPath(); g.ellipse(-0.35 * hs, -0.15 * hs, 0.55 * hs, 0.85 * hs, 0, 0, 7); g.fill(); [[-0.6, -0.45], [-0.1, -0.6]].forEach(function (q) { g.fillStyle = '#2a1a0a'; g.beginPath(); g.arc(q[0] * hs, q[1] * hs, 0.17 * hs, 0, 7); g.fill(); g.fillStyle = '#ffd23d'; g.beginPath(); g.arc(q[0] * hs, q[1] * hs, 0.09 * hs, 0, 7); g.fill() }); g.restore() }
    }
    // manen (hemeldraak)
    if (hemel) for (var mm = 0; mm < 7; mm++) { P = new Path2D(); P.arc((-0.55 - Math.sin(mm * 1.3) * 0.15) * hs, (-0.5 + mm * 0.2) * hs, (0.24 - mm * 0.012) * hs, 0, 7); deel(R, P, '#ffffff') }
    // hoorns
    if ((st >= 2 && !slang && !aal) || (st === 3 && !slang)) {
      [1, 0].forEach(function (z) {
        P = new Path2D(); P.moveTo((0.05 - z * 0.28) * hs, -0.5 * hs); P.quadraticCurveTo((-0.5 - z * 0.2) * hs, (-0.95 - z * 0.05) * hs, (-1.15 - z * 0.1 + z * 0.3) * hs, (-1.25 + z * 0.3) * hs); P.quadraticCurveTo((-0.55 - z * 0.2) * hs, (-0.62 - z * 0.05) * hs, (0.3 - z * 0.28) * hs, -0.42 * hs); P.closePath()
        deel(R, P, z ? R.donker : hemel ? '#ffd23d' : water ? R.hel : '#f4ecd8', -0.4 * hs, -0.8 * hs, 0.4 * hs)
        if (!R.sil && !z) { g.strokeStyle = 'rgba(0,0,40,0.3)'; g.lineWidth = R.lw * 0.6; for (var ri = 1; ri < 4; ri++) { var f = ri / 4; g.beginPath(); g.moveTo((0.1 - f * 1.0) * hs, (-0.5 - f * 0.55) * hs); g.lineTo((0.28 - f * 1.05) * hs, (-0.4 - f * 0.6) * hs); g.stroke() } }
      })
    }
    // oorvinnen
    if (water || aal || R.L.oor === 'vin') {
      for (var fv = 0; fv < 3; fv++) { var hk = -2.3 + fv * 0.45, lg = hs * (0.55 + st * 0.12) * (1 - fv * 0.15); P = new Path2D(); P.moveTo(-0.3 * hs, -0.1 * hs); P.lineTo(-0.3 * hs + Math.cos(hk - 0.18) * lg * 0.6, -0.1 * hs + Math.sin(hk - 0.18) * lg * 0.6); P.lineTo(-0.3 * hs + Math.cos(hk) * lg, -0.1 * hs + Math.sin(hk) * lg); P.lineTo(-0.3 * hs + Math.cos(hk + 0.25) * lg * 0.55, -0.1 * hs + Math.sin(hk + 0.25) * lg * 0.55); P.closePath(); deel(R, P, aal ? '#ffe14f' : R.hel) }
    }
    // binnenkant van de bek en onderkaak
    var draai = function (x, y) { var c = Math.cos(open), s = Math.sin(open); return [x * c - (y - 0.15) * s, (y - 0.15) * c + x * s + 0.15] }
    if (open > 0.02 && !R.sil) {
      var b1 = draai(X(1.12), 0.16)
      g.fillStyle = '#4a0f1e'; g.beginPath(); g.moveTo(0.1 * hs, 0.15 * hs); g.lineTo(X(1.22) * hs, 0.1 * hs); g.lineTo(b1[0] * hs, b1[1] * hs); g.closePath(); g.fill()
      g.fillStyle = '#d8465a'; g.beginPath(); var tb = draai(X(0.8), 0.2); g.ellipse((0.25 + tb[0]) * 0.5 * hs, (0.2 + tb[1]) * 0.5 * hs, 0.3 * hs, 0.07 * hs, open * 0.6, 0, 7); g.fill()
    }
    var jp = [[0.05, 0.12], [X(1.12), 0.15], [X(1.14), 0.36], [X(0.85), 0.42], [0.4, 0.5], [-0.1, 0.52], [-0.38, 0.3]].map(function (q) { return draai(q[0], q[1]) })
    P = new Path2D(); P.moveTo(jp[0][0] * hs, jp[0][1] * hs); P.lineTo(jp[1][0] * hs, jp[1][1] * hs); P.quadraticCurveTo(jp[2][0] * hs, jp[2][1] * hs, jp[3][0] * hs, jp[3][1] * hs); P.bezierCurveTo(jp[4][0] * hs, jp[4][1] * hs, jp[5][0] * hs, jp[5][1] * hs, jp[6][0] * hs, jp[6][1] * hs); P.closePath()
    deel(R, P, R.sil ? R.k : R.buikVast)
    if (open > 0.02 && !R.sil) { for (var lt = 0; lt < 4; lt++) { var lx = 0.4 + lt * (X(1.05) - 0.4) / 3, a = draai(lx, 0.16), b = draai(lx + 0.06, 0.16 - (lt === 3 ? 0.2 : 0.12)), cc = draai(lx + 0.12, 0.16); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(a[0] * hs, a[1] * hs); g.lineTo(b[0] * hs, b[1] * hs); g.lineTo(cc[0] * hs, cc[1] * hs); g.closePath(); g.fill(); g.strokeStyle = R.lijn; g.lineWidth = R.lw * 0.4; g.stroke() } }
    // bovenkop
    P = new Path2D()
    if (slang && st < 3) { P.moveTo(-0.5 * hs, 0.2 * hs); P.bezierCurveTo(-0.6 * hs, -0.65 * hs, X(0.9) * hs, -0.7 * hs, X(1.2) * hs, -0.05 * hs); P.quadraticCurveTo(X(1.22) * hs, 0.15 * hs, X(1.05) * hs, 0.18 * hs); P.lineTo(0.15 * hs, 0.17 * hs); P.quadraticCurveTo(-0.2 * hs, 0.38 * hs, -0.5 * hs, 0.2 * hs) }
    else { P.moveTo(-0.55 * hs, 0.15 * hs); P.bezierCurveTo(-0.68 * hs, -0.52 * hs, -0.2 * hs, -0.74 * hs, 0.25 * hs, -0.62 * hs); P.bezierCurveTo(X(0.55) * hs, -0.56 * hs, X(0.9) * hs, -0.44 * hs, X(1.2) * hs, -0.3 * hs); P.quadraticCurveTo(X(1.4) * hs, -0.2 * hs, X(1.36) * hs, 0 * hs); P.lineTo(X(1.26) * hs, 0.12 * hs); P.lineTo(0.15 * hs, 0.16 * hs); P.quadraticCurveTo(-0.2 * hs, 0.36 * hs, -0.55 * hs, 0.15 * hs) }
    deel(R, P, R.k, 0.1 * hs, -0.3 * hs, 0.8 * hs)
    if (!R.sil) {
      g.save(); g.clip(P); g.fillStyle = R.donker; g.globalAlpha = 0.5; g.beginPath(); g.ellipse(-0.1 * hs, -0.75 * hs, 0.9 * hs, 0.35 * hs, 0.15, 0, 7); g.fill(); g.restore()
      // bovenste tanden
      if (open > 0.02 || st === 3) { for (var ut = 0; ut < 5; ut++) { var ux = 0.3 + ut * (X(1.15) - 0.3) / 4, lang2 = ut === 4 ? 0.24 : ut === 1 ? 0.18 : 0.11; g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(ux * hs, 0.15 * hs); g.lineTo((ux + 0.05) * hs, (0.15 + lang2) * hs); g.lineTo((ux + 0.11) * hs, 0.14 * hs); g.closePath(); g.fill(); g.strokeStyle = R.lijn; g.lineWidth = R.lw * 0.4; g.stroke() } }
      else if (st === 1) { g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.beginPath(); g.moveTo(X(0.95) * hs, 0.14 * hs); g.quadraticCurveTo(X(0.75) * hs, 0.32 * hs, 0.4 * hs, 0.2 * hs); g.stroke() }
      // neusgat
      g.fillStyle = '#1a1424'; g.beginPath(); g.ellipse(X(1.2) * hs, -0.17 * hs, 0.06 * hs, 0.035 * hs, 0.4, 0, 7); g.fill()
      // gespleten tong
      if (slang && open < 0.05 && !R.stil && Math.sin(t * 3) > 0.2) { g.strokeStyle = '#ff3d5a'; g.lineWidth = R.lw; g.beginPath(); g.moveTo(X(1.25) * hs, 0.08 * hs); g.lineTo(X(1.55) * hs, 0.12 * hs); g.lineTo(X(1.68) * hs, 0.02 * hs); g.moveTo(X(1.55) * hs, 0.12 * hs); g.lineTo(X(1.68) * hs, 0.2 * hs); g.stroke() }
      // snorharen
      if (water || hemel || aal) { g.strokeStyle = hemel ? '#ffffff' : aal ? '#ffe14f' : R.hel; g.lineWidth = hs * 0.07; var zw = R.stil ? 0 : Math.sin(t * 2.5) * 0.15; [0, 1].forEach(function (z) { g.beginPath(); g.moveTo(X(1.1) * hs, (-0.05 + z * 0.12) * hs); g.bezierCurveTo(X(1.5) * hs, (0.2 + z * 0.2) * hs, X(1.1) * hs, (0.8 + zw) * hs, (X(1.5) + zw) * hs, (1.05 + z * 0.15) * hs); g.stroke() }) }
    }
    // oog
    if (st === 1) oogZij(R, 0.32 * hs, -0.28 * hs, 0.24 * hs, false)
    else if (!R.sil) {
      var ox = 0.38 * hs, oy = -0.3 * hs
      g.save(); g.shadowColor = MT.KLEUR[R.type] || '#ffffff'; g.shadowBlur = st === 3 ? hs * 0.4 : 0
      g.fillStyle = st === 3 ? '#fff6a0' : '#ffffff'; g.beginPath(); g.moveTo(ox - 0.24 * hs, oy + 0.04 * hs); g.quadraticCurveTo(ox, oy - 0.2 * hs, ox + 0.26 * hs, oy - 0.02 * hs); g.quadraticCurveTo(ox, oy + 0.16 * hs, ox - 0.24 * hs, oy + 0.04 * hs); g.fill(); g.restore()
      g.fillStyle = R.iris; g.beginPath(); g.ellipse(ox + 0.03 * hs, oy, 0.09 * hs, 0.11 * hs, 0, 0, 7); g.fill()
      g.fillStyle = '#0e0e1e'; g.beginPath(); g.ellipse(ox + 0.04 * hs, oy, 0.03 * hs, 0.1 * hs, 0, 0, 7); g.fill()
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ox + 0.07 * hs, oy - 0.05 * hs, 0.025 * hs, 0, 7); g.fill()
      // zware wenkbrauw
      g.fillStyle = R.donker; g.strokeStyle = R.lijn; g.lineWidth = R.lw * 0.8; g.beginPath(); g.moveTo(ox - 0.34 * hs, oy - 0.2 * hs); g.lineTo(ox + 0.32 * hs, oy - 0.02 * hs); g.lineTo(ox + 0.3 * hs, oy - 0.14 * hs); g.lineTo(ox - 0.3 * hs, oy - 0.3 * hs); g.closePath(); g.fill(); g.stroke()
    }
    // wangstekels
    if (st === 3 && !R.sil) { for (var ws = 0; ws < 3; ws++) { P = new Path2D(); P.moveTo(-0.35 * hs, (0.05 + ws * 0.12) * hs); P.lineTo((-0.85 + ws * 0.1) * hs, (0.1 + ws * 0.22) * hs); P.lineTo(-0.3 * hs, (0.15 + ws * 0.12) * hs); P.closePath(); deel(R, P, R.donker) } }
  }

  // ── insecten: vlinder en mot, kever, krab, libel ──
  function insect(R) {
    if (R.v === 'kever') return kever(R)
    if (R.v === 'krab') return krab(R)
    if (R.v === 'libel') return libel(R)
    return vlinder(R)
  }
  function poot(R, pts, dikte, kleur) {
    var g = R.g
    g.lineCap = 'round'; g.lineJoin = 'round'
    g.strokeStyle = R.lijn; g.lineWidth = dikte + R.lw * 1.6; g.beginPath(); pts.forEach(function (q, i) { if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]) }); g.stroke()
    g.strokeStyle = R.sil ? R.k : kleur; g.lineWidth = dikte; g.stroke()
  }
  function vlinder(R) {
    var g = R.g, r = R.r, st = R.stad, t = R.t, P
    var vuurvlieg = R.type === 'vuur' && R.v === '', mot = R.v === 'mot', ijs = R.type === 'ijs'
    var s = r * [0.78, 0.92, 1.02][st - 1]
    var flap = R.stil ? 1 : 0.6 + 0.4 * Math.abs(Math.cos(t * 6))
    var kl = ijs ? ['#bff0ff', '#ffffff', '#4aa8e8'] : R.type === 'vuur' ? ['#ff6a1a', '#ffd23d', '#7a1a0a'] : [R.k, R.hel, R.donker]
    g.save(); g.translate(0, -r * 0.08); g.rotate(0.22)
    var vleugel = function (z, boven) {
      g.save(); g.scale(z * flap * (z < 0 ? 0.72 : 1), z < 0 ? 0.92 : 1)
      if (vuurvlieg) { P = ell(s * 0.42, boven ? -s * 0.2 : s * 0.05, s * 0.45, s * 0.16, boven ? -0.5 : 0.3) }
      else if (boven) { P = new Path2D(); P.moveTo(s * 0.02, -s * 0.12); P.bezierCurveTo(s * 0.25, -s * (0.75 + st * 0.08), s * (0.85 + st * 0.08), -s * (0.95 + st * 0.06), s * (0.95 + st * 0.06), -s * (0.55 + st * 0.05)); if (st === 3) { P.lineTo(s * 0.88, -s * 0.38); P.lineTo(s * 0.95, -s * 0.3) } P.bezierCurveTo(s * 0.9, -s * 0.12, s * 0.5, s * 0.02, s * 0.03, s * 0.0) }
      else { P = new Path2D(); P.moveTo(s * 0.03, s * 0.0); P.bezierCurveTo(s * 0.55, s * 0.0, s * 0.75, s * 0.35, s * 0.55, s * 0.55); if (st >= 2) { P.quadraticCurveTo(s * 0.5, s * 0.75, s * 0.42, s * (0.85 + st * 0.08)); P.quadraticCurveTo(s * 0.32, s * 0.65, s * 0.25, s * 0.6) } P.bezierCurveTo(s * 0.12, s * 0.62, s * 0.02, s * 0.35, s * 0.03, s * 0.12) }
      if (R.sil) { deel(R, P, R.k); g.restore(); return }
      var gr = g.createRadialGradient(0, 0, s * 0.05, 0, 0, s * 1.0)
      gr.addColorStop(0, vuurvlieg ? 'rgba(255,240,200,0.5)' : kl[2]); gr.addColorStop(0.35, vuurvlieg ? 'rgba(255,220,180,0.35)' : kl[0]); gr.addColorStop(1, vuurvlieg ? 'rgba(255,255,255,0.25)' : kl[1])
      g.save(); if (ijs) g.globalAlpha *= 0.9
      g.fillStyle = gr; g.fill(P); g.clip(P)
      g.strokeStyle = 'rgba(0,0,30,0.35)'; g.lineWidth = R.lw * 0.6
      for (var a = 0; a < 5; a++) { var h = (boven ? -1.45 : -0.1) + a * (boven ? 0.28 : 0.3); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(h + 0.15) * s * 0.4, Math.sin(h + 0.15) * s * 0.4, Math.cos(h) * s * 1.2, Math.sin(h) * s * 1.2); g.stroke() }
      if (!vuurvlieg) {
        // donkere rand met witte stippen
        g.strokeStyle = ijs ? 'rgba(40,120,200,0.7)' : 'rgba(30,8,20,0.85)'; g.lineWidth = s * 0.12; g.stroke(P)
        g.fillStyle = '#ffffff'; for (var d = 0; d < 5; d++) { var dh = boven ? -1.25 + d * 0.22 : 0.15 + d * 0.28, dl = boven ? s * (0.92 - Math.abs(d - 2) * 0.05) : s * 0.58; g.beginPath(); g.arc(Math.cos(dh) * dl, Math.sin(dh) * dl, s * 0.028, 0, 7); g.fill() }
        if (mot && boven || st === 3 && boven) {
          // oogvlek
          var ex = s * 0.55, ey = -s * 0.5
          g.fillStyle = '#1a0a12'; g.beginPath(); g.arc(ex, ey, s * 0.17, 0, 7); g.fill()
          g.fillStyle = ijs ? '#7fe0ff' : '#ffd23d'; g.beginPath(); g.arc(ex, ey, s * 0.12, 0, 7); g.fill()
          g.fillStyle = ijs ? '#1a4a8a' : '#c2280a'; g.beginPath(); g.arc(ex, ey, s * 0.07, 0, 7); g.fill()
          g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex - s * 0.03, ey - s * 0.03, s * 0.025, 0, 7); g.fill()
        }
        if (R.type === 'vuur' && st >= 2) { g.globalCompositeOperation = 'lighter'; NK.vlek(g, s * 0.3, boven ? -s * 0.3 : s * 0.25, s * 0.45, '#ffb02e', 0.45 + Math.sin(t * 7) * 0.15) }
        if (ijs) { g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = R.lw * 0.7; var sx = s * (boven ? 0.45 : 0.3), sy = s * (boven ? -0.45 : 0.3), sr = s * 0.13; for (var sn = 0; sn < 3; sn++) { var sh = sn * Math.PI / 3; g.beginPath(); g.moveTo(sx - Math.cos(sh) * sr, sy - Math.sin(sh) * sr); g.lineTo(sx + Math.cos(sh) * sr, sy + Math.sin(sh) * sr); g.stroke() } }
      }
      g.restore()
      g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.stroke(P)
      g.restore()
    }
    vleugel(-1, true); vleugel(-1, false)
    if (!vuurvlieg) { vleugel(1, false); vleugel(1, true) }
    // achterlijf
    var al = s * (vuurvlieg ? 0.42 : 0.38)
    P = ell(0, s * 0.25, s * (vuurvlieg ? 0.2 : 0.12), al, 0); deel(R, P, vuurvlieg ? '#5a2a1a' : R.donker, 0, s * 0.2, al * 0.5)
    if (!R.sil) {
      g.save(); g.clip(P); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = R.lw * 0.8; for (var rg = 0; rg < 4; rg++) { g.beginPath(); g.ellipse(0, s * (0.05 + rg * 0.13), s * 0.2, s * 0.05, 0, 0, Math.PI); g.stroke() }
      if (vuurvlieg) { var gl = 0.7 + Math.sin(t * 5) * 0.3; g.fillStyle = 'rgba(255,230,80,' + gl + ')'; g.beginPath(); g.ellipse(0, s * 0.45, s * 0.22, s * 0.25, 0, 0, 7); g.fill() }
      g.restore()
      if (vuurvlieg) { gloedVlek(R, 0, s * 0.5, s * 0.7, '#ffd23d', 0.5 + Math.sin(t * 5) * 0.2); vlam(R, 0, s * 0.62, s * 0.3, Math.PI) }
    }
    if (vuurvlieg) { vleugel(1, false); vleugel(1, true) }
    // pootjes
    for (var pt = 0; pt < 3; pt++) poot(R, [[s * 0.05, -s * 0.05 + pt * s * 0.07], [s * (0.22 + pt * 0.03), s * (0.08 + pt * 0.1)], [s * (0.2 + pt * 0.06), s * (0.25 + pt * 0.12)]], s * 0.03, R.donker)
    // borststuk met pluizige kraag
    P = ell(0, -s * 0.12, s * 0.17, s * 0.2, 0); deel(R, P, R.k, 0, -s * 0.15, s * 0.18)
    if (mot || ijs) for (var kr = 0; kr < 7; kr++) { var kh = Math.PI + kr / 6 * Math.PI; P = new Path2D(); P.arc(Math.cos(kh) * s * 0.15, -s * 0.25 + Math.sin(kh) * s * 0.06 + s * 0.06, s * 0.07, 0, 7); deel(R, P, '#ffffff') }
    // kop
    var ky = -s * 0.42, ks = s * [0.22, 0.19, 0.18][st - 1]
    ;[-1, 1].forEach(function (z) {
      var tipX = z * s * (0.3 + st * 0.04) + s * 0.08, tipY = ky - s * (0.55 + st * 0.06)
      if (mot) { g.strokeStyle = R.lijn; g.lineWidth = s * 0.02; g.beginPath(); g.moveTo(z * ks * 0.3, ky - ks * 0.8); g.quadraticCurveTo(z * s * 0.1, ky - s * 0.45, tipX, tipY); g.stroke(); for (var vk = 1; vk < 7; vk++) { var f = vk / 7, ax = z * ks * 0.3 + (tipX - z * ks * 0.3) * f, ay = ky - ks * 0.8 + (tipY - ky + ks * 0.8) * f; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + z * s * 0.06 * (1 - f * 0.5), ay + s * 0.03); g.moveTo(ax, ay); g.lineTo(ax - z * s * 0.03, ay - s * 0.05 * (1 - f * 0.5)); g.stroke() } }
      else { g.strokeStyle = R.lijn; g.lineWidth = s * 0.025; g.beginPath(); g.moveTo(z * ks * 0.3, ky - ks * 0.8); g.quadraticCurveTo(z * s * 0.1, ky - s * 0.5, tipX, tipY); g.stroke(); P = new Path2D(); P.arc(tipX, tipY, s * 0.05, 0, 7); deel(R, P, vuurvlieg ? '#ffd23d' : kl[1]) }
    })
    P = new Path2D(); P.arc(0, ky, ks, 0, 7); deel(R, P, R.k, 0, ky, ks)
    oogVoor(R, s * 0.02, ky - ks * 0.05, ks * 0.34, ks * 0.45, st === 3)
    if (!R.sil) { g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.beginPath(); g.arc(s * 0.02, ky + ks * 0.42, ks * 0.18, 0.3, Math.PI - 0.3); g.stroke() }
    if (st === 3) kopExtra({ g: g, L: { extra: R.L.extra === 'kroon' ? 'kroon' : 'horens' }, sil: R.sil, k: R.k, lijn: R.lijn, lw: R.lw, stad: st }, 0, ky - ks * 0.8, ks)
    g.restore()
    if (R.type === 'vuur' && st >= 2 && !vuurvlieg) gloedVlek(R, 0, 0, r * 1.1, '#ff6a1a', 0.12)
    lichtDeeltjes(R, 0, 0, r)
  }
  function kever(R) {
    var g = R.g, r = R.r, st = R.stad, t = R.t, P
    var s = r * [0.72, 0.82, 0.92][st - 1], gy = r * 0.95, cy = gy - s * 0.55, ijs = R.type === 'ijs'
    var stap = R.stil ? 0 : Math.sin(t * 4) * s * 0.03
    var schild = ijs ? '#9fdcff' : R.k
    // poten aan de verre kant
    for (var p1 = 0; p1 < 3; p1++) { var px = -s * 0.45 + p1 * s * 0.42; poot(R, [[px, cy + s * 0.1], [px - s * 0.18 + p1 * s * 0.1, cy - s * 0.05], [px - s * 0.12 + p1 * s * 0.12 - stap, gy - s * 0.08]], s * 0.06, R.lijn) }
    // schild (dekschilden)
    P = new Path2D(); P.moveTo(-s * 0.98, cy + s * 0.22); P.bezierCurveTo(-s * 1.05, cy - s * (0.8 + st * 0.05), s * 0.25, cy - s * (0.88 + st * 0.05), s * 0.38, cy + s * 0.05); P.quadraticCurveTo(s * 0.05, cy + s * 0.42, -s * 0.98, cy + s * 0.22)
    deel(R, P, schild)
    if (!R.sil) {
      g.save(); g.clip(P)
      var gr = g.createLinearGradient(0, cy - s * 0.8, 0, cy + s * 0.4); gr.addColorStop(0, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(0,0,40,0.35)'); g.fillStyle = gr; g.fill(P)
      g.strokeStyle = 'rgba(0,0,40,0.3)'; g.lineWidth = R.lw * 0.8
      for (var gv = 0; gv < 3; gv++) { g.beginPath(); g.moveTo(-s * 0.9, cy + s * (0.12 - gv * 0.04)); g.bezierCurveTo(-s * 0.9, cy - s * (0.55 - gv * 0.15), s * 0.1, cy - s * (0.62 - gv * 0.17), s * 0.3, cy + s * 0.0); g.stroke() }
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-s * 0.45, cy - s * 0.5, s * 0.28, s * 0.08, -0.25, 0, 7); g.fill()
      if (ijs) { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = R.lw * 0.6; for (var ij = 0; ij < 6; ij++) { var ix = -s * 0.8 + ij * s * 0.2, iy = cy + s * (ij % 2 ? -0.1 : 0.1); g.beginPath(); g.moveTo(ix, iy); g.lineTo(ix + s * 0.08, iy - s * 0.12); g.lineTo(ix + s * 0.16, iy); g.stroke() } }
      g.restore()
      g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.beginPath(); g.moveTo(-s * 0.98, cy + s * 0.22); g.quadraticCurveTo(-s * 0.4, cy - s * 0.1, s * 0.3, cy - s * 0.1); g.stroke()
    }
    // ijskristallen op de rug
    if (st >= 2) { var kk = ijs ? '#e8fbff' : R.hel; [[-0.6, -0.55, -0.35, 0.3], [-0.3, -0.7, -0.1, 0.42], [0.0, -0.62, 0.2, 0.32], [-0.85, -0.3, -0.7, 0.24]].slice(0, st === 3 ? 4 : 2).forEach(function (q) { g.save(); g.translate(q[0] * s, cy + q[1] * s); g.rotate(q[2]); P = new Path2D(); P.moveTo(0, -q[3] * s); P.lineTo(q[3] * s * 0.3, -q[3] * s * 0.2); P.lineTo(q[3] * s * 0.22, q[3] * s * 0.25); P.lineTo(-q[3] * s * 0.22, q[3] * s * 0.25); P.lineTo(-q[3] * s * 0.3, -q[3] * s * 0.2); P.closePath(); deel(R, P, kk, 0, -q[3] * s * 0.3, q[3] * s * 0.4); g.restore() }); gloedVlek(R, -s * 0.3, cy - s * 0.7, s * 0.8, '#9fe8ff', 0.25) }
    // halsschild
    P = ell(s * 0.42, cy - s * 0.02, s * 0.26, s * 0.25, 0.2); deel(R, P, R.donker, s * 0.42, cy - s * 0.05, s * 0.25)
    // kop met kaken
    var kx = s * 0.68, ky = cy + s * 0.06, ks = s * [0.24, 0.2, 0.2][st - 1]
    ;[-1, 1].forEach(function (z) { var kl2 = s * (0.18 + st * 0.07); P = new Path2D(); P.moveTo(kx + ks * 0.6, ky + z * ks * 0.15 + ks * 0.2); P.quadraticCurveTo(kx + ks * 0.6 + kl2, ky + z * ks * 0.35 + ks * 0.1, kx + ks * 0.55 + kl2 * 1.1, ky + ks * 0.55 + z * ks * 0.2); P.lineTo(kx + ks * 0.55 + kl2 * 0.75, ky + ks * 0.35 + z * ks * 0.15); P.quadraticCurveTo(kx + ks * 0.7 + kl2 * 0.4, ky + ks * 0.25 + z * ks * 0.2, kx + ks * 0.5, ky + ks * 0.45 + z * ks * 0.05); P.closePath(); deel(R, P, z < 0 ? R.lijn : '#3a3040') })
    P = new Path2D(); P.arc(kx, ky, ks, 0, 7); deel(R, P, R.donker, kx, ky, ks)
    // hoorn
    if (st === 3 || R.L.extra === 'horens') { P = new Path2D(); P.moveTo(kx - ks * 0.2, ky - ks * 0.7); P.bezierCurveTo(kx + ks * 0.3, ky - ks * 2.2, kx + ks * 1.4, ky - ks * 2.6, kx + ks * 1.8, ky - ks * 3.0); P.bezierCurveTo(kx + ks * 1.3, ky - ks * 2.0, kx + ks * 0.9, ky - ks * 1.2, kx + ks * 0.75, ky - ks * 0.45); P.closePath(); deel(R, P, ijs ? '#e8fbff' : '#f4ecd8', kx + ks * 0.6, ky - ks * 1.5, ks * 0.8); gloedVlek(R, kx + ks * 1.2, ky - ks * 2.2, ks * 1.6, '#9fe8ff', 0.3) }
    // voelsprieten
    g.strokeStyle = R.lijn; g.lineWidth = s * 0.025; g.beginPath(); g.moveTo(kx + ks * 0.3, ky - ks * 0.8); g.lineTo(kx + ks * 0.5, ky - ks * 1.6); g.lineTo(kx + ks * 1.1, ky - ks * 1.9); g.stroke()
    P = ell(kx + ks * 1.15, ky - ks * 1.9, ks * 0.22, ks * 0.12, -0.4); deel(R, P, R.hel)
    oogZij(R, kx + ks * 0.25, ky - ks * 0.2, ks * [0.48, 0.38, 0.36][st - 1], st === 3)
    // poten aan de voorkant
    for (var p2 = 0; p2 < 3; p2++) { var qx = -s * 0.5 + p2 * s * 0.45; poot(R, [[qx, cy + s * 0.2], [qx + s * 0.12 - p2 * s * 0.06, cy + s * 0.32], [qx + s * 0.02 + stap, gy]], s * 0.08, R.donker); if (st === 3) klauwen(R, qx + stap, gy - s * 0.02, s * 0.06) }
    lichtDeeltjes(R, 0, cy, r)
  }
  function krab(R) {
    var g = R.g, r = R.r, st = R.stad, t = R.t, P
    var s = r * [0.6, 0.75, 0.86][st - 1], gy = r * 0.95, cy = gy - s * 0.6
    var knip = R.stil ? 0.3 : 0.15 + Math.abs(Math.sin(t * 3)) * 0.35
    // looppoten
    ;[-1, 1].forEach(function (z) { for (var p = 0; p < 3; p++) poot(R, [[z * s * 0.55, cy + s * (0.05 + p * 0.1)], [z * s * (0.95 + p * 0.05), cy - s * (0.05 - p * 0.1)], [z * s * (1.05 + p * 0.08), gy - s * 0.02]], s * 0.08, p % 2 ? R.donker : R.k) })
    // scharen
    ;[-1, 1].forEach(function (z) {
      var groot = (st === 3 ? 1.18 : 1) * (z > 0 ? 1.15 : 0.95)
      var ax = z * s * 0.55, ay = cy - s * 0.05, cx = z * s * 0.95, cyy = cy - s * (0.5 + st * 0.06)
      poot(R, [[ax, ay], [z * s * 0.85, cy + s * 0.05], [cx, cyy + s * 0.15]], s * 0.13, R.k)
      g.save(); g.translate(cx, cyy); g.scale(z * groot, groot); g.rotate(-0.5)
      P = new Path2D(); P.moveTo(-s * 0.15, s * 0.1); P.bezierCurveTo(-s * 0.2, -s * 0.25, s * 0.25, -s * 0.32, s * 0.42, -s * 0.12); P.lineTo(s * 0.12, -s * 0.02); P.quadraticCurveTo(s * 0.05, s * 0.18, -s * 0.15, s * 0.1); deel(R, P, R.k, 0, -s * 0.1, s * 0.25)
      g.save(); g.translate(s * 0.08, s * 0.05); g.rotate(knip)
      P = new Path2D(); P.moveTo(0, 0); P.quadraticCurveTo(s * 0.2, s * 0.02, s * 0.38, -s * 0.05); P.quadraticCurveTo(s * 0.22, s * 0.12, 0, s * 0.08); P.closePath(); deel(R, P, R.donker)
      g.restore()
      if (st >= 2 && !R.sil) { g.fillStyle = '#f4ecd8'; for (var tk = 0; tk < 3 + st; tk++) { var tx = s * (0.12 + tk * 0.06); g.beginPath(); g.moveTo(tx, -s * 0.03 - tk * s * 0.012); g.lineTo(tx + s * 0.025, s * 0.02 - tk * s * 0.012); g.lineTo(tx + s * 0.05, -s * 0.035 - tk * s * 0.012); g.fill() } }
      if (st === 3) { P = new Path2D(); P.moveTo(-s * 0.05, -s * 0.2); P.lineTo(s * 0.02, -s * 0.38); P.lineTo(s * 0.08, -s * 0.22); P.closePath(); deel(R, P, '#f4ecd8') }
      g.restore()
    })
    // oogstelen
    ;[-1, 1].forEach(function (z) { g.strokeStyle = R.lijn; g.lineWidth = s * 0.08; g.beginPath(); g.moveTo(z * s * 0.18, cy - s * 0.25); g.lineTo(z * s * 0.24, cy - s * 0.62); g.stroke(); g.strokeStyle = R.k; g.lineWidth = s * 0.045; g.stroke(); oogZij(R, z * s * 0.24 + s * 0.02, cy - s * 0.66, s * 0.1, st === 3) })
    // schild
    P = new Path2D(); P.moveTo(-s * 0.8, cy + s * 0.08); P.bezierCurveTo(-s * 0.88, cy - s * 0.58, s * 0.88, cy - s * 0.58, s * 0.8, cy + s * 0.08); P.quadraticCurveTo(0, cy + s * 0.55, -s * 0.8, cy + s * 0.08)
    deel(R, P, R.k, 0, cy - s * 0.15, s * 0.6)
    if (!R.sil) {
      g.save(); g.clip(P)
      g.fillStyle = R.buikVast; g.beginPath(); g.ellipse(0, cy + s * 0.32, s * 0.65, s * 0.2, 0, 0, 7); g.fill()
      // fossiel: een ammoniet en botjes
      g.strokeStyle = 'rgba(60,30,10,0.5)'; g.lineWidth = s * 0.03; g.beginPath(); for (var a = 0; a < 30; a++) { var h = a * 0.45, l = s * 0.015 + a * s * 0.007; g.lineTo(-s * 0.25 + Math.cos(h) * l, cy - s * 0.15 + Math.sin(h) * l) } g.stroke()
      g.lineWidth = s * 0.04; g.beginPath(); g.moveTo(s * 0.15, cy - s * 0.25); g.lineTo(s * 0.45, cy - s * 0.1); g.stroke(); [[0.15, -0.25], [0.45, -0.1]].forEach(function (q) { g.beginPath(); g.arc(q[0] * s, cy + q[1] * s, s * 0.04, 0, 7); g.stroke() })
      g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(-s * 0.3, cy - s * 0.32, s * 0.3, s * 0.08, -0.15, 0, 7); g.fill()
      g.restore()
    }
    // randstekels en hoorns
    if (st >= 2) for (var rs = 0; rs < 5; rs++) { var rh = Math.PI * 1.12 + rs / 4 * Math.PI * 0.76, bx = Math.cos(rh) * s * 0.78, by = cy - s * 0.1 + Math.sin(rh) * s * 0.4; P = new Path2D(); P.moveTo(bx - s * 0.06, by + s * 0.03); P.lineTo(bx + Math.cos(rh) * s * (0.12 + st * 0.04), by + Math.sin(rh) * s * (0.14 + st * 0.05)); P.lineTo(bx + s * 0.06, by + s * 0.03); P.closePath(); deel(R, P, R.donker) }
    if (st === 3) [-1, 1].forEach(function (z) { P = new Path2D(); P.moveTo(z * s * 0.15, cy - s * 0.38); P.quadraticCurveTo(z * s * 0.3, cy - s * 0.85, z * s * 0.55, cy - s * 0.95); P.quadraticCurveTo(z * s * 0.38, cy - s * 0.6, z * s * 0.38, cy - s * 0.32); P.closePath(); deel(R, P, '#f4ecd8', z * s * 0.3, cy - s * 0.6, s * 0.2) })
    // mond
    if (!R.sil) { g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.beginPath(); if (st === 3) { g.moveTo(-s * 0.18, cy + s * 0.05); g.quadraticCurveTo(0, cy + s * 0.18, s * 0.18, cy + s * 0.05); g.stroke(); tanden(R, -s * 0.15, cy + s * 0.07, s * 0.08, 4) } else { g.arc(0, cy - s * 0.02, s * 0.1, 0.3, Math.PI - 0.3); g.stroke() } }
    lichtDeeltjes(R, 0, cy, r)
  }
  function libel(R) {
    var g = R.g, r = R.r, st = R.stad, t = R.t, P, i
    var s = r * [0.82, 0.96, 1.08][st - 1], cy = -r * 0.12
    var slag = R.stil ? 0 : Math.sin(t * 24) * 0.12
    var tx = s * 0.05, ty = cy
    var vleugel = function (hoek, lengte, achter) {
      g.save(); g.translate(tx, ty - s * 0.08); g.rotate(hoek + slag * (achter ? -1 : 1))
      P = new Path2D(); P.moveTo(0, -s * 0.03); P.bezierCurveTo(-lengte * 0.3, -s * 0.16, -lengte * 0.85, -s * 0.15, -lengte, -s * 0.04); P.bezierCurveTo(-lengte * 0.9, s * 0.08, -lengte * 0.4, s * 0.08, 0, s * 0.03); P.closePath()
      if (R.sil) { deel(R, P, R.k); g.restore(); return }
      g.fillStyle = achter ? 'rgba(170,200,255,0.3)' : 'rgba(210,235,255,0.45)'; g.fill(P)
      g.save(); g.clip(P); g.strokeStyle = 'rgba(80,120,200,0.45)'; g.lineWidth = R.lw * 0.45
      for (i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(0, i * s * 0.012); g.quadraticCurveTo(-lengte * 0.5, i * s * 0.045 - s * 0.04, -lengte, i * s * 0.03 - s * 0.04); g.stroke() }
      for (i = 1; i < 14; i++) { g.beginPath(); g.moveTo(-lengte * i / 14, -s * 0.16); g.lineTo(-lengte * i / 14 - s * 0.02, s * 0.1); g.stroke() }
      if (st >= 2) { g.globalCompositeOperation = 'lighter'; NK.vlek(g, -lengte * 0.75, -s * 0.05, lengte * 0.35, R.type === 'lucht' ? '#a8c8ff' : '#ffffff', 0.4) }
      g.restore()
      g.fillStyle = st === 3 ? '#ffd23d' : R.donker; g.beginPath(); g.ellipse(-lengte * 0.86, -s * 0.07, s * 0.04, s * 0.02, 0, 0, 7); g.fill()
      g.strokeStyle = 'rgba(40,60,120,0.8)'; g.lineWidth = R.lw * 0.7; g.stroke(P)
      g.restore()
    }
    var wl = s * (0.85 + st * 0.08)
    vleugel(0.55, wl, true); vleugel(0.15, wl * 0.92, true)
    // staart
    var c = [[tx - s * 0.1, ty], [tx - s * 0.5, ty + s * 0.05], [tx - s * 0.9, ty + s * 0.08], [tx - s * (1.15 + st * 0.05), ty + s * 0.02 + (R.stil ? 0 : Math.sin(t * 3) * s * 0.03)]]
    var p = spline(c, 22), n = normalen(p), hw = p.map(function (q, k) { return s * 0.09 * (1 - k / 22 * 0.5) })
    P = buisPad(p, n, hw, -1, 1); deel(R, P, R.k)
    if (!R.sil) { g.save(); g.clip(P); g.strokeStyle = R.lijn; g.lineWidth = R.lw * 0.8; for (i = 2; i < 22; i += 2) { var a = op(p, n, hw, i, -1.2), b = op(p, n, hw, i, 1.2); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke() } g.fillStyle = 'rgba(255,255,255,0.4)'; g.fill(buisPad(p, n, hw, 0.2, 0.7)); g.restore() }
    var e = p[21]
    if (st >= 2) { [-1, 1].forEach(function (z) { P = new Path2D(); P.moveTo(e[0] + s * 0.04, e[1]); P.quadraticCurveTo(e[0] - s * 0.1, e[1] + z * s * 0.05, e[0] - s * (0.15 + st * 0.05), e[1] + z * s * (0.12 + st * 0.03)); P.quadraticCurveTo(e[0] - s * 0.05, e[1] + z * s * 0.02, e[0] + s * 0.04, e[1] + 0.01); deel(R, P, st === 3 ? '#ffffff' : R.hel) }) }
    // pootjes
    for (i = 0; i < 3; i++) poot(R, [[tx + s * (0.02 + i * 0.06), ty + s * 0.08], [tx + s * (0.06 + i * 0.08), ty + s * 0.22], [tx + s * (0.02 + i * 0.1), ty + s * 0.32]], s * 0.022, R.lijn)
    // borststuk
    P = ell(tx, ty, s * 0.2, s * 0.15, -0.2); deel(R, P, R.k, tx, ty, s * 0.18)
    if (!R.sil) { g.strokeStyle = R.donker; g.lineWidth = s * 0.03; g.beginPath(); g.moveTo(tx - s * 0.1, ty - s * 0.1); g.lineTo(tx + s * 0.05, ty + s * 0.1); g.stroke() }
    vleugel(-0.1, wl, false); vleugel(-0.45, wl * 0.92, false)
    // kop met enorme facetogen
    var kx = tx + s * 0.27, ky = ty - s * 0.05, ks = s * [0.17, 0.15, 0.15][st - 1]
    P = new Path2D(); P.arc(kx, ky, ks, 0, 7); deel(R, P, R.k, kx, ky, ks)
    P = new Path2D(); P.arc(kx + ks * 0.25, ky - ks * 0.25, ks * 0.85, 0, 7)
    if (R.sil) deel(R, P, R.k)
    else {
      var gr = g.createRadialGradient(kx + ks * 0.05, ky - ks * 0.5, ks * 0.05, kx + ks * 0.25, ky - ks * 0.25, ks * 0.9); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, st === 3 ? '#7fd8ff' : '#5a8adf'); gr.addColorStop(1, '#1a2a6a')
      g.fillStyle = gr; g.fill(P); g.save(); g.clip(P); g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1
      for (var hx = -3; hx <= 3; hx++) for (var hy = -3; hy <= 3; hy++) { g.beginPath(); g.arc(kx + ks * 0.25 + hx * ks * 0.24 + (hy % 2) * ks * 0.12, ky - ks * 0.25 + hy * ks * 0.2, ks * 0.12, 0, 7); g.stroke() }
      g.restore(); g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.stroke(P)
      if (st < 3) { g.fillStyle = '#0e0e1e'; g.beginPath(); g.arc(kx + ks * 0.45, ky - ks * 0.2, ks * 0.25, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(kx + ks * 0.52, ky - ks * 0.3, ks * 0.1, 0, 7); g.fill() }
      else { g.save(); g.globalCompositeOperation = 'lighter'; NK.vlek(g, kx + ks * 0.3, ky - ks * 0.25, ks * 1.4, '#7fd8ff', 0.4); g.restore(); g.fillStyle = R.donker; g.strokeStyle = R.lijn; g.lineWidth = R.lw * 0.7; g.beginPath(); g.moveTo(kx - ks * 0.3, ky - ks * 0.9); g.lineTo(kx + ks * 0.9, ky - ks * 0.45); g.lineTo(kx + ks * 0.9, ky - ks * 0.7); g.lineTo(kx - ks * 0.2, ky - ks * 1.15); g.closePath(); g.fill(); g.stroke() }
      g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.beginPath(); g.moveTo(kx + ks * 0.5, ky + ks * 0.55); g.quadraticCurveTo(kx + ks * 0.75, ky + ks * 0.7, kx + ks * 0.9, ky + ks * 0.45); g.stroke()
    }
    lichtDeeltjes(R, 0, cy, r)
  }

  // ── vis en haai ──
  function vis(R) {
    var g = R.g, r = R.r, st = R.stad, t = R.t, v = R.v, P
    var L = r * [0.6, 0.78, 0.92][st - 1], H = r * [0.42, 0.42, 0.44][st - 1], cx = 0, cy = r * 0.05, zw = R.stil ? 0 : Math.sin(t * 4) * 0.12
    if (v === 'haai' && st >= 2) H *= 0.85
    // staartvin
    g.save(); g.translate(cx - L * 0.85, cy); g.rotate(zw)
    P = new Path2D(); P.moveTo(L * 0.1, 0); P.quadraticCurveTo(-L * 0.25, -H * 0.4, -L * 0.45, -H * (1.0 + st * 0.15)); P.quadraticCurveTo(-L * 0.25, 0, -L * 0.45, H * (0.9 + st * 0.1)); P.quadraticCurveTo(-L * 0.2, H * 0.35, L * 0.1, 0.01); deel(R, P, R.donker, -L * 0.2, 0, H * 0.6)
    g.restore()
    // rugvin
    P = new Path2D(); P.moveTo(cx - L * 0.3, cy - H * 0.85); P.quadraticCurveTo(cx - L * 0.05, cy - H * (1.7 + st * 0.2), cx + L * (v === 'haai' ? 0.15 : 0.3), cy - H * 0.9); P.closePath(); deel(R, P, R.donker)
    // lijf
    P = new Path2D(); P.moveTo(cx - L * 0.9, cy); P.bezierCurveTo(cx - L * 0.5, cy - H * 1.25, cx + L * 0.6, cy - H * 1.15, cx + L, cy - H * 0.05); P.bezierCurveTo(cx + L * 0.6, cy + H * 1.05, cx - L * 0.5, cy + H * 1.0, cx - L * 0.9, cy)
    deel(R, P, R.k, cx, cy, L * 0.8)
    if (!R.sil) {
      g.save(); g.clip(P); g.fillStyle = R.buik; g.beginPath(); g.ellipse(cx + L * 0.1, cy + H * 0.7, L * 0.8, H * 0.5, 0, 0, 7); g.fill()
      if (v === 'haai') { g.strokeStyle = 'rgba(0,0,30,0.35)'; g.lineWidth = R.lw; for (var k = 0; k < 3; k++) { g.beginPath(); g.moveTo(cx + L * (0.25 + k * 0.1), cy - H * 0.2); g.quadraticCurveTo(cx + L * (0.22 + k * 0.1), cy + H * 0.1, cx + L * (0.25 + k * 0.1), cy + H * 0.3); g.stroke() } }
      else { g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = R.lw * 0.6; for (var sc = 0; sc < 5; sc++) { g.beginPath(); g.arc(cx - L * 0.4 + sc * L * 0.2, cy - H * 0.2, H * 0.25, -1.2, 1.2); g.stroke() } }
      g.restore()
    }
    // zwaard
    if (v === 'zwaard' && st >= 2) { P = new Path2D(); P.moveTo(cx + L * 0.9, cy - H * 0.2); P.lineTo(cx + L * (1.5 + st * 0.15), cy - H * 0.05); P.lineTo(cx + L * 0.92, cy + H * 0.05); P.closePath(); deel(R, P, '#e8eef8') }
    // borstvin
    P = new Path2D(); P.moveTo(cx + L * 0.25, cy + H * 0.25); P.quadraticCurveTo(cx - L * 0.05, cy + H * (0.9 + zw), cx - L * 0.2, cy + H * 0.8); P.quadraticCurveTo(cx, cy + H * 0.4, cx + L * 0.25, cy + H * 0.25); deel(R, P, R.donker)
    oogZij(R, cx + L * 0.55, cy - H * 0.35, H * [0.32, 0.25, 0.22][st - 1], st === 3 || v === 'haai')
    if (!R.sil) {
      g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.beginPath(); g.moveTo(cx + L * 0.98, cy + H * 0.05); g.quadraticCurveTo(cx + L * 0.8, cy + H * 0.35, cx + L * 0.55, cy + H * 0.25); g.stroke()
      if (v === 'haai' || st === 3) tanden(R, cx + L * 0.6, cy + H * 0.22, H * 0.16, 3)
    }
    if (R.L.extra === 'horens') kopExtra({ g: g, L: { extra: 'horens' }, sil: R.sil, k: R.k, lijn: R.lijn, lw: R.lw, stad: st }, cx + L * 0.5, cy - H * 0.9, H * 0.7)
    gloedVlek(R, cx, cy, L, R.type === 'schaduw' ? '#a56bff' : '#9fe0ff', R.type === 'schaduw' ? 0.18 : 0.08)
    lichtDeeltjes(R, cx, cy, r)
  }

  // ── kwal en spook ──
  function kwal(R) {
    var g = R.g, r = R.r, st = R.stad, t = R.t, v = R.v, P
    var s = r * [0.55, 0.68, 0.8][st - 1], cy = -r * 0.15
    var spook = v === 'spook'
    if (spook) {
      P = new Path2D(); P.moveTo(-s * 0.75, cy + s * 0.2); P.bezierCurveTo(-s * 0.85, cy - s * 1.2, s * 0.85, cy - s * 1.2, s * 0.75, cy + s * 0.2)
      for (var w = 0; w < 5; w++) { var wx = s * 0.75 - (w + 0.5) * s * 0.3; P.quadraticCurveTo(wx + s * 0.08, cy + s * (0.85 + Math.sin(t * 4 + w) * 0.12), wx - s * 0.15, cy + s * 0.55) }
      P.closePath(); g.globalAlpha *= 0.92; deel(R, P, R.k, 0, cy - s * 0.3, s)
      ;[-1, 1].forEach(function (z) { P = ell(z * s * 0.85, cy + s * 0.05, s * 0.18, s * 0.32, z * 0.8 + Math.sin(t * 3) * 0.2); deel(R, P, R.k) })
      oogVoor(R, 0, cy - s * 0.35, s * 0.2, s * 0.3, st >= 2)
      if (!R.sil) { g.fillStyle = '#1a0a2a'; g.beginPath(); g.ellipse(0, cy + s * 0.05, s * 0.16, s * (0.08 + Math.abs(Math.sin(t * 2)) * 0.08), 0, 0, 7); g.fill() }
      gloedVlek(R, 0, cy, s * 1.5, '#a56bff', 0.25)
    } else {
      for (var tk = -3; tk <= 3; tk++) { g.strokeStyle = R.lijn; g.lineWidth = s * 0.1; g.beginPath(); g.moveTo(tk * s * 0.2, cy + s * 0.25); g.bezierCurveTo(tk * s * 0.25 + Math.sin(t * 3 + tk) * s * 0.2, cy + s * 0.7, tk * s * 0.15 + Math.sin(t * 3 + tk + 1) * s * 0.25, cy + s * 1.0, tk * s * 0.2, cy + s * (1.25 + st * 0.12)); g.stroke(); g.strokeStyle = R.sil ? R.k : R.hel; g.lineWidth = s * 0.05; g.stroke() }
      P = new Path2D(); P.moveTo(-s, cy + s * 0.3); P.bezierCurveTo(-s * 1.05, cy - s * 1.15, s * 1.05, cy - s * 1.15, s, cy + s * 0.3)
      for (var fr = 0; fr < 6; fr++) { var fx = s - (fr + 1) * s / 3; P.quadraticCurveTo(fx + s / 6, cy + s * 0.55, fx, cy + s * 0.3) }
      P.closePath(); g.globalAlpha *= 0.9; deel(R, P, R.k, 0, cy - s * 0.3, s)
      if (!R.sil) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-s * 0.35, cy - s * 0.5, s * 0.25, s * 0.12, -0.5, 0, 7); g.fill() }
      oogVoor(R, 0, cy - s * 0.15, s * 0.18, s * 0.3, st === 3)
      if (!R.sil) { g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.beginPath(); g.arc(0, cy + s * 0.08, s * 0.12, 0.3, Math.PI - 0.3); g.stroke() }
      gloedVlek(R, 0, cy, s * 1.6, R.type === 'ijs' ? '#8affd8' : R.type === 'schaduw' ? '#a56bff' : '#5ac8ff', 0.2 + Math.sin(t * 2) * 0.08)
    }
    kopExtra(R, 0, cy - s * 0.85, s * 0.6)
    lichtDeeltjes(R, 0, cy, r)
  }

  // ── rots en golem ──
  function rots(R) {
    var g = R.g, r = R.r, st = R.stad, t = R.t, v = R.v, P
    var s = r * [0.55, 0.62, 0.7][st - 1], cy = st === 1 ? r * 0.35 : r * 0.05
    var vorm = function (cx, cy2, sz, n, zaad) { var Q = new Path2D(); for (var i = 0; i < n; i++) { var h = i / n * 6.28, l = sz * (0.82 + ((Math.sin(zaad + i * 9.7) + 1) / 2) * 0.25); if (i) Q.lineTo(cx + Math.cos(h) * l, cy2 + Math.sin(h) * l * 0.9); else Q.moveTo(cx + Math.cos(h) * l, cy2 + Math.sin(h) * l * 0.9) } Q.closePath(); return Q }
    // benen en armen (golem)
    if (st >= 2) {
      ;[-1, 1].forEach(function (z) { P = vorm(z * s * 0.45, r * 0.78, s * 0.3, 6, z * 3); deel(R, P, R.donker, z * s * 0.45, r * 0.78, s * 0.3) })
      var zw = R.stil ? 0 : Math.sin(t * 2.5) * 0.1
      ;[-1, 1].forEach(function (z) {
        g.save(); g.translate(z * s * 1.0, cy + s * 0.05); g.rotate(z * zw)
        P = vorm(0, 0, s * 0.3, 6, z * 5); deel(R, P, R.k, 0, 0, s * 0.3)
        if (v === 'magneet') { P = new Path2D(); P.moveTo(-s * 0.22, s * 0.25); P.lineTo(-s * 0.22, s * 0.6); P.arc(0, s * 0.6, s * 0.22, Math.PI, 0, true); P.lineTo(s * 0.22, s * 0.25); P.lineTo(s * 0.1, s * 0.25); P.lineTo(s * 0.1, s * 0.6); P.arc(0, s * 0.6, s * 0.1, 0, Math.PI); P.lineTo(-s * 0.1, s * 0.25); P.closePath(); deel(R, P, '#e8443a'); if (!R.sil) { g.fillStyle = '#e8eef8'; g.fillRect(-s * 0.22, s * 0.25, s * 0.12, s * 0.1); g.fillRect(s * 0.1, s * 0.25, s * 0.12, s * 0.1) } }
        else { P = vorm(0, s * 0.42, s * 0.26, 6, z * 7); deel(R, P, R.donker, 0, s * 0.42, s * 0.26) }
        g.restore()
      })
    }
    // lijf
    P = vorm(0, cy, s, 9, 1.3); deel(R, P, R.k, 0, cy, s)
    if (!R.sil) {
      g.save(); g.clip(P)
      g.strokeStyle = R.type === 'vuur' ? '#ffb02e' : R.type === 'ijs' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.25)'; g.lineWidth = R.lw * (R.type === 'vuur' ? 1.4 : 0.9)
      if (R.type === 'vuur') { g.shadowColor = '#ff8a3d'; g.shadowBlur = s * 0.3 }
      g.beginPath(); g.moveTo(-s * 0.6, cy - s * 0.2); g.lineTo(-s * 0.2, cy); g.lineTo(-s * 0.3, cy + s * 0.45); g.moveTo(s * 0.35, cy - s * 0.55); g.lineTo(s * 0.5, cy - s * 0.15); g.lineTo(s * 0.75, cy - s * 0.05); g.stroke()
      g.restore()
    }
    // kristallen bovenop
    if (st >= 2 || R.L.extra === 'kristal' || R.type === 'ijs') { var kk = R.type === 'vuur' ? '#ffb02e' : R.type === 'bliksem' ? '#fff3a0' : R.type === 'aarde' ? '#c8a0ff' : '#bff0ff'; [[-0.45, -0.75, -0.4, 0.35], [-0.05, -0.92, 0, 0.5], [0.4, -0.75, 0.35, 0.32]].slice(0, st + (R.L.extra === 'kristal' ? 1 : 0)).forEach(function (q) { g.save(); g.translate(q[0] * s, cy + q[1] * s); g.rotate(q[2]); P = new Path2D(); P.moveTo(0, -q[3] * s); P.lineTo(q[3] * s * 0.35, 0); P.lineTo(0, q[3] * s * 0.25); P.lineTo(-q[3] * s * 0.35, 0); P.closePath(); deel(R, P, kk, 0, -q[3] * s * 0.4, q[3] * s * 0.5); g.restore() }); gloedVlek(R, 0, cy - s * 0.8, s * 0.9, kk, 0.3) }
    if (R.L.extra === 'stekels') for (var sk = 0; sk < 5; sk++) { var hs = Math.PI * 1.1 + sk / 4 * Math.PI * 0.8; P = new Path2D(); P.moveTo(Math.cos(hs - 0.15) * s * 0.85, cy + Math.sin(hs - 0.15) * s * 0.8); P.lineTo(Math.cos(hs) * s * 1.25, cy + Math.sin(hs) * s * 1.15); P.lineTo(Math.cos(hs + 0.15) * s * 0.85, cy + Math.sin(hs + 0.15) * s * 0.8); P.closePath(); deel(R, P, R.donker) }
    oogVoor(R, s * 0.1, cy - s * 0.15, s * [0.22, 0.18, 0.17][st - 1], s * 0.28, st >= 2)
    if (!R.sil) { g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.beginPath(); if (st === 3) { g.moveTo(-s * 0.15, cy + s * 0.25); g.lineTo(s * 0.35, cy + s * 0.25); g.stroke(); tanden(R, -s * 0.1, cy + s * 0.25, s * 0.12, 4) } else { g.arc(s * 0.1, cy + s * 0.15, s * 0.12, 0.3, Math.PI - 0.3); g.stroke() } }
    if (R.L.extra === 'horens' || R.L.extra === 'kroon') kopExtra(R, s * 0.1, cy - s * 0.75, s * 0.7)
    lichtDeeltjes(R, 0, cy, r)
  }

  // ── slak (met schelp) ──
  function slak(R) {
    var g = R.g, r = R.r, st = R.stad, t = R.t, v = R.v, P
    var s = r * [0.6, 0.72, 0.82][st - 1], gy = r * 0.85, schelpOnly = v === 'schelp'
    if (!schelpOnly) {
      // voet en hals
      P = new Path2D(); P.moveTo(-s * 0.9, gy); P.quadraticCurveTo(-s * 0.9, gy - s * 0.3, -s * 0.3, gy - s * 0.3); P.lineTo(s * 0.45, gy - s * 0.4); P.quadraticCurveTo(s * 0.75, gy - s * 1.1, s * 1.0, gy - s * 0.85); P.quadraticCurveTo(s * 1.1, gy - s * 0.3, s * 0.9, gy); P.closePath()
      deel(R, P, R.k, s * 0.3, gy - s * 0.4, s * 0.6)
      ;[0.6, 0.95].forEach(function (q, i) { g.strokeStyle = R.lijn; g.lineWidth = r * 0.05; g.beginPath(); g.moveTo(s * (0.7 + i * 0.15), gy - s * 0.95); g.lineTo(s * (q + 0.1), gy - s * (1.4 + st * 0.08)); g.stroke(); oogZij(R, s * (q + 0.1), gy - s * (1.4 + st * 0.08), s * 0.12, st === 3) })
      if (!R.sil) { g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.beginPath(); g.arc(s * 0.85, gy - s * 0.6, s * 0.12, 0.2, Math.PI - 0.3); g.stroke() }
    }
    // schelp
    var sx = -s * 0.2, sy = gy - s * (schelpOnly ? 0.6 : 0.75), sr = s * (schelpOnly ? 0.75 : 0.62)
    P = new Path2D(); P.arc(sx, sy, sr, 0, 7)
    var schelpKleur = R.type === 'vuur' ? '#6a3a2a' : R.type === 'bliksem' ? '#4a4a6a' : R.type === 'water' ? '#f4e0f0' : R.hel
    deel(R, P, schelpKleur, sx, sy, sr)
    if (!R.sil) {
      g.save(); g.clip(P)
      g.strokeStyle = R.type === 'vuur' ? '#ff8a3d' : R.type === 'bliksem' ? '#ffe14f' : 'rgba(0,0,0,0.25)'; g.lineWidth = sr * 0.1
      if (R.type === 'vuur' || R.type === 'bliksem') { g.shadowColor = g.strokeStyle; g.shadowBlur = sr * 0.3 }
      g.beginPath(); for (var a = 0; a < 26; a++) { var h = a * 0.55 + t * (R.type === 'bliksem' ? 2 : 0), l = sr * 0.05 + a * sr * 0.035; g.lineTo(sx + Math.cos(h) * l, sy + Math.sin(h) * l) } g.stroke()
      g.restore()
      if (schelpOnly) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sx, sy + sr * 0.15, sr * 0.22, 0, 7); g.fill(); g.fillStyle = 'rgba(255,200,255,0.7)'; g.beginPath(); g.arc(sx - sr * 0.07, sy + sr * 0.08, sr * 0.08, 0, 7); g.fill() }
    }
    if (schelpOnly) oogVoor(R, sx, sy - sr * 0.3, sr * 0.16, sr * 0.3, st >= 2)
    // stekels/horens op de schelp bij het laatste stadium
    if (st === 3) for (var sk = 0; sk < 5; sk++) { var hs = Math.PI * 1.05 + sk / 4 * Math.PI * 0.9; P = new Path2D(); P.moveTo(sx + Math.cos(hs - 0.15) * sr * 0.9, sy + Math.sin(hs - 0.15) * sr * 0.9); P.lineTo(sx + Math.cos(hs) * sr * 1.35, sy + Math.sin(hs) * sr * 1.35); P.lineTo(sx + Math.cos(hs + 0.15) * sr * 0.9, sy + Math.sin(hs + 0.15) * sr * 0.9); P.closePath(); deel(R, P, R.type === 'vuur' ? '#ff8a3d' : R.donker) }
    if (R.L.extra === 'kristal') kopExtra(R, sx, sy - sr * 0.8, sr * 0.6)
    if (R.type === 'vuur') gloedVlek(R, sx, sy, sr * 1.5, '#ff6a1a', 0.2)
    lichtDeeltjes(R, sx, sy, r)
  }

  // ── luchtwezens: wolk, pluis, ballon en statisch bolletje ──
  function luchtwezen(R) {
    if (R.v === 'wolk') return wolkWezen(R)
    if (R.v === 'pluis') return pluisWezen(R)
    if (R.v === 'ballon') return ballonWezen(R)
    return statischWezen(R)
  }
  function gezichtVoor(R, x, y, s, st, kleur) {
    var g = R.g
    if (st === 3) { felOog(R, x - s * 0.36, y, s * 0.2, false); felOog(R, x + s * 0.36, y, s * 0.2, false) }
    else oogVoor(R, x, y, s * (st === 1 ? 0.24 : 0.2), s * 0.36, false)
    if (R.sil) return
    g.strokeStyle = R.lijn; g.lineWidth = R.lw
    if (st === 3) { g.fillStyle = '#3a0f2e'; g.beginPath(); g.moveTo(x - s * 0.3, y + s * 0.32); g.quadraticCurveTo(x, y + s * 0.62, x + s * 0.3, y + s * 0.32); g.closePath(); g.fill(); g.stroke(); tanden(R, x - s * 0.26, y + s * 0.33, s * 0.12, 4) }
    else { g.beginPath(); g.arc(x, y + s * 0.3, s * 0.13, 0.3, Math.PI - 0.3); g.stroke(); wang(R, x - s * 0.55, y + s * 0.25, s * 0.13); wang(R, x + s * 0.55, y + s * 0.25, s * 0.13) }
  }
  function puffen(R, lijst, kleur, licht2) {
    var g = R.g
    g.fillStyle = R.lijn; lijst.forEach(function (q) { g.beginPath(); g.arc(q[0], q[1], q[2] + R.lw, 0, 7); g.fill() })
    lijst.forEach(function (q) {
      if (R.sil) { g.fillStyle = R.k } else { var gr = g.createRadialGradient(q[0] - q[2] * 0.35, q[1] - q[2] * 0.45, q[2] * 0.1, q[0], q[1], q[2]); gr.addColorStop(0, licht2); gr.addColorStop(1, kleur); g.fillStyle = gr }
      g.beginPath(); g.arc(q[0], q[1], q[2], 0, 7); g.fill()
    })
  }
  function wolkWezen(R) {
    var g = R.g, r = R.r, st = R.stad, t = R.t, P
    var s = r * [0.6, 0.76, 0.9][st - 1], cy = -r * 0.08, storm = st === 3
    var kl = storm ? '#6a74a8' : st === 2 ? '#dfe8ff' : '#f6f9ff', kl2 = storm ? '#a8b2e0' : '#ffffff'
    if (storm && !R.sil) {
      g.strokeStyle = 'rgba(140,190,255,0.7)'; g.lineWidth = R.lw * 0.8
      for (var d = 0; d < 9; d++) { var f = (t * 1.8 + d * 0.37) % 1, dx = (d / 8 - 0.5) * s * 1.4; g.beginPath(); g.moveTo(dx, cy + s * 0.5 + f * s * 0.6); g.lineTo(dx - s * 0.05, cy + s * 0.62 + f * s * 0.6); g.stroke() }
      if (Math.sin(t * 2.3) > 0.6 || R.stil) { g.save(); g.shadowColor = '#ffe14f'; g.shadowBlur = s * 0.4; g.fillStyle = '#ffe14f'; g.beginPath(); g.moveTo(s * 0.1, cy + s * 0.45); g.lineTo(-s * 0.15, cy + s * 0.85); g.lineTo(s * 0.02, cy + s * 0.85); g.lineTo(-s * 0.12, cy + s * 1.2); g.lineTo(s * 0.25, cy + s * 0.75); g.lineTo(s * 0.08, cy + s * 0.75); g.lineTo(s * 0.22, cy + s * 0.45); g.closePath(); g.fill(); g.restore() }
    }
    // windarmpjes
    if (st >= 2) [-1, 1].forEach(function (z) { var zw = R.stil ? 0 : Math.sin(t * 3 + z) * 0.2; g.save(); g.translate(z * s * 0.95, cy + s * 0.15); g.rotate(z * (0.3 + zw)); g.strokeStyle = R.lijn; g.lineWidth = s * 0.14; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(z * s * 0.35, -s * 0.1, z * s * 0.4, -s * 0.35); g.stroke(); g.strokeStyle = kl; g.lineWidth = s * 0.08; g.stroke(); P = new Path2D(); P.arc(z * s * 0.4, -s * 0.38, s * 0.11, 0, 7); deel(R, P, kl); g.restore() })
    var b = R.stil ? 0 : 1
    var lijst = [[-0.62, 0.18, 0.36], [-0.32, -0.28, 0.46], [0.22, -0.38, 0.5], [0.66, 0.06, 0.38], [0.36, 0.32, 0.38], [-0.22, 0.34, 0.4], [0, 0.02, 0.52]]
    if (storm) lijst = lijst.concat([[-0.85, -0.1, 0.28], [0.9, -0.25, 0.3], [-0.05, -0.62, 0.38]])
    puffen(R, lijst.map(function (q, i) { return [q[0] * s, cy + q[1] * s, q[2] * s * (1 + b * Math.sin(t * 2 + i) * 0.03)] }), kl, kl2)
    if (storm && !R.sil) { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = R.lw; g.beginPath(); for (var a = 0; a < 20; a++) { var h = a * 0.5 + t, l = s * 0.05 + a * s * 0.025; g.lineTo(s * 0.4 + Math.cos(h) * l, cy - s * 0.4 + Math.sin(h) * l * 0.6) } g.stroke(); gloedVlek(R, 0, cy, s * 1.6, '#ffe14f', 0.08 + Math.max(0, Math.sin(t * 2.3)) * 0.15) }
    gezichtVoor(R, 0, cy - s * 0.02, s, st)
    lichtDeeltjes(R, 0, cy, r)
  }
  function pluisWezen(R) {
    var g = R.g, r = R.r, st = R.stad, t = R.t, P, i
    var s = r * [0.48, 0.58, 0.66][st - 1], cy = -r * 0.1
    var kl = R.sil ? R.k : '#f2f6ff', slag = R.stil ? 0 : Math.sin(t * 5) * 0.3
    // halo en staartpluimen (laatste stadium)
    if (st === 3) {
      if (!R.sil) { g.save(); g.shadowColor = '#ffd23d'; g.shadowBlur = s * 0.4; g.strokeStyle = '#ffd23d'; g.lineWidth = s * 0.08; g.beginPath(); g.ellipse(0, cy - s * 1.35, s * 0.55, s * 0.14, 0, 0, 7); g.stroke(); g.restore() }
    }
    if (st === 1 && !R.sil) { g.strokeStyle = '#8aa07a'; g.lineWidth = s * 0.07; g.beginPath(); g.moveTo(0, cy + s * 0.9); g.quadraticCurveTo(s * 0.1, cy + s * 1.3, 0, cy + s * 1.65); g.stroke(); P = ell(0, cy + s * 1.7, s * 0.06, s * 0.12, 0); deel(R, P, '#a8865a') }
    // pluisvleugels
    if (st >= 2) [-1, 1].forEach(function (z) { g.save(); g.scale(z, 1); verenVleugel(R, -s * 0.55, cy - s * 0.1, s * (st === 3 ? 1.5 : 1.15), 0.25 + slag, z > 0); g.restore() })
    // het pluizige lijf
    P = new Path2D(); var n = 26
    for (i = 0; i <= n; i++) { var h = i / n * Math.PI * 2, rr = s * (1 + (i % 2 ? 0.1 : -0.02) + (R.stil ? 0 : Math.sin(t * 3 + i) * 0.015)), px = Math.cos(h) * rr, py = cy + Math.sin(h) * rr; if (i) P.quadraticCurveTo(Math.cos(h - Math.PI / n) * s * 1.14, cy + Math.sin(h - Math.PI / n) * s * 1.14, px, py); else P.moveTo(px, py) }
    P.closePath(); deel(R, P, kl, 0, cy, s)
    if (!R.sil) { g.save(); g.clip(P); g.strokeStyle = 'rgba(140,170,230,0.35)'; g.lineWidth = R.lw * 0.6; for (i = 0; i < 14; i++) { var hh = i * 0.45; g.beginPath(); g.moveTo(Math.cos(hh) * s * 0.55, cy + Math.sin(hh) * s * 0.55); g.lineTo(Math.cos(hh) * s * 1.0, cy + Math.sin(hh) * s * 1.0); g.stroke() } g.restore() }
    gezichtVoor(R, 0, cy + s * 0.05, s, st)
    if (R.L.extra === 'kroon') kopExtra(R, 0, cy - s * 0.92, s * 0.6)
    lichtDeeltjes(R, 0, cy, r)
  }
  function ballonWezen(R) {
    var g = R.g, r = R.r, st = R.stad, t = R.t, P, i
    var s = r * [0.6, 0.62, 0.74][st - 1], cy = -r * 0.15, zw = R.stil ? 0 : Math.sin(t * 1.6) * 0.06
    g.save(); g.rotate(zw)
    // touwtje
    g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.beginPath(); g.moveTo(0, cy + s * 1.0); for (i = 1; i <= 8; i++) g.lineTo(Math.sin(i * 1.3 + t * 3) * s * 0.06, cy + s * (1.0 + i * 0.1)); g.stroke()
    if (st >= 2) { [-1, 1].forEach(function (z) { P = new Path2D(); P.moveTo(z * s * 0.45, cy - s * 0.65); P.quadraticCurveTo(z * s * 0.85, cy - s * 1.35, z * s * 0.25, cy - s * 0.9); P.closePath(); deel(R, P, R.k) }) }
    P = new Path2D(); P.moveTo(0, cy + s * 0.95); P.bezierCurveTo(-s * 1.08, cy + s * 0.45, -s * 0.98, cy - s * 1.0, 0, cy - s * 1.0); P.bezierCurveTo(s * 0.98, cy - s * 1.0, s * 1.08, cy + s * 0.45, 0, cy + s * 0.95)
    deel(R, P, R.k, 0, cy - s * 0.2, s)
    if (!R.sil) {
      g.save(); g.clip(P)
      if (st >= 2) { g.fillStyle = 'rgba(255,255,255,0.35)'; for (i = -2; i <= 2; i += 2) { g.beginPath(); g.ellipse(i * s * 0.3, cy, s * 0.13, s * 1.1, 0, 0, 7); g.fill() } }
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-s * 0.45, cy - s * 0.45, s * 0.14, s * 0.28, 0.4, 0, 7); g.fill()
      g.restore()
    }
    P = new Path2D(); P.moveTo(-s * 0.1, cy + s * 1.05); P.lineTo(0, cy + s * 0.92); P.lineTo(s * 0.1, cy + s * 1.05); P.closePath(); deel(R, P, R.donker)
    // gezicht: bolle wangen die blazen
    if (st === 3) { felOog(R, -s * 0.32, cy - s * 0.15, s * 0.18, false); felOog(R, s * 0.36, cy - s * 0.15, s * 0.18, false) }
    else oogVoor(R, 0, cy - s * 0.15, s * 0.2, s * 0.34, false)
    wang(R, -s * 0.5, cy + s * 0.15, s * 0.17); wang(R, s * 0.5, cy + s * 0.15, s * 0.17)
    if (!R.sil) {
      var mo = st >= 2 ? 0.12 + (R.stil ? 0 : Math.abs(Math.sin(t * 2)) * 0.06) : 0.08
      g.fillStyle = '#3a0f2e'; g.beginPath(); g.ellipse(s * 0.05, cy + s * 0.3, s * mo, s * mo, 0, 0, 7); g.fill(); g.strokeStyle = R.lijn; g.lineWidth = R.lw; g.stroke()
      if (st >= 2) { g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = R.lw * 1.2; for (i = 0; i < 3; i++) { var f = (t * 0.8 + i / 3) % 1; g.globalAlpha = 1 - f; g.beginPath(); g.moveTo(s * (0.25 + f * 0.9), cy + s * (0.2 + i * 0.12)); g.quadraticCurveTo(s * (0.45 + f * 0.9), cy + s * (0.1 + i * 0.12), s * (0.65 + f * 0.9), cy + s * (0.22 + i * 0.12)); g.stroke() } g.globalAlpha = 1 }
    }
    g.restore()
    lichtDeeltjes(R, 0, cy, r)
  }
  function statischWezen(R) {
    var g = R.g, r = R.r, st = R.stad, t = R.t, P, i
    var s = r * 0.48, cy = r * 0.05
    staartVier(R, -s * 0.8, cy + s * 0.3, r * 0.8, 2, 'kat', vachtKleur(R))
    ;[-1, 1].forEach(function (z) { P = ell(z * s * 0.4, r * 0.88, s * 0.28, s * 0.14, 0); deel(R, P, R.donker) })
    // haren die rechtop staan
    P = new Path2D(); var n = 34
    for (i = 0; i <= n; i++) { var h = i / n * Math.PI * 2, lang = i % 2 ? s * 0.92 : s * (1.35 + ((i * 7) % 5) * 0.08 + (R.stil ? 0 : Math.sin(t * 12 + i) * 0.06)); var px = Math.cos(h) * lang, py = cy + Math.sin(h) * lang; if (i) P.lineTo(px, py); else P.moveTo(px, py) }
    P.closePath(); deel(R, P, R.k, 0, cy, s * 1.2)
    P = new Path2D(); P.arc(0, cy, s * 0.92, 0, 7); deel(R, P, R.hel, 0, cy, s)
    if (!R.sil) { g.save(); g.globalCompositeOperation = 'lighter'; for (i = 0; i < 4; i++) { var a = t * 2 + i * 1.57, ax = Math.cos(a) * s * 1.6, ay = cy + Math.sin(a) * s * 1.3; g.strokeStyle = 'rgba(255,240,120,0.85)'; g.lineWidth = R.lw; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + s * 0.12, ay - s * 0.1); g.lineTo(ax + s * 0.05, ay - s * 0.15); g.lineTo(ax + s * 0.18, ay - s * 0.28); g.stroke() } g.restore(); gloedVlek(R, 0, cy, s * 2, '#ffe14f', 0.18 + Math.sin(t * 9) * 0.06) }
    gezichtVoor(R, 0, cy, s, Math.min(st, 2))
    lichtDeeltjes(R, 0, cy, r)
  }

  var VORMEN = { vier: viervoeter, twee: tweebener, vogel: vogel, draak: draak, vis: vis, insect: insect, kwal: kwal, rots: rots, slak: slak, blob: luchtwezen }
  function anatomie(g, id, r, o, kleuren) {
    var sp = S[id], L = sp.look
    var R = {
      g: g, r: r, L: L, v: L.v, stad: L.fase || sp.stadium || 1, type: sp.type, t: o.t || 0, stil: !!o.stil, sil: !!o.silhouet,
      k: kleuren.k, donker: kleuren.donker, hel: kleuren.hel, lijn: kleuren.lijn, lw: Math.max(1.2, r * 0.045),
      buik: kleuren.sil ? kleuren.k : 'rgba(255,250,235,0.55)', buikVast: kleuren.sil ? kleuren.k : licht(kleuren.k.charAt(0) === '#' ? kleuren.k : '#888888', 0.55),
      iris: IRIS[sp.type] || '#2a2a5a', gloei: sp.type === 'schaduw' || (sp.stadium === 3 && sp.type === 'bliksem'),
      knip: !o.stil && ((o.t || 0) % 3.7) > 3.58, deeltje: DEELTJE[sp.type],
    }
    VORMEN[L.vorm](R)
  }

  function teken(g, id, x, y, r, o) {
    o = o || {}
    if (!S[id]) return
    // geraakt of veranderen: alleen het wezen zelf licht wit op
    if (o.wit && !o.binnen && witDoek) {
      var m = Math.ceil(r * 4.6)
      witDoek.width = m; witDoek.height = m
      var wg = witDoek.getContext('2d')
      teken(wg, id, m / 2, m / 2, r, Object.assign({}, o, { wit: 0, binnen: true, alfa: 1 }))
      wg.globalCompositeOperation = 'source-atop'; wg.fillStyle = 'rgba(255,255,255,' + Math.min(1, o.wit) + ')'; wg.fillRect(0, 0, m, m)
      g.save(); g.globalAlpha = o.alfa == null ? 1 : o.alfa; g.drawImage(witDoek, x - m / 2, y - m / 2); g.restore()
      return
    }
    var sp = S[id], L = sp.look, type = sp.type, t = o.t || 0, stad = sp.stadium || 1
    r *= L.maat * (o.schaal == null ? 1 : o.schaal)
    if (r <= 0.5) return
    var sil = !!o.silhouet
    var k = sil ? '#22223e' : wezenKleur(id)
    var donker = sil ? '#16162a' : licht(k, -0.32), hel = sil ? '#2a2a4a' : licht(k, 0.45), lijn = sil ? '#0e0e1e' : licht(k, -0.62)
    var adem = o.stil ? 0 : Math.sin(t * 2.6) * 0.025
    var bob = o.stil ? 0 : Math.sin(t * 2.6) * r * 0.03
    var lw = Math.max(1.2, r * 0.055)
    var lijf = L.lijf
    var zweeft = L.vorm === 'vogel' || L.vorm === 'insect' || L.vorm === 'kwal' || (L.vorm === 'draak' && L.v === 'hemel') || lijf === 'kwal' || lijf === 'insect' || (lijf === 'vogel' && L.extra === 'vleugel') || L.extra === 'wolk'
    if (zweeft && !o.stil) bob += Math.sin(t * 3.2) * r * 0.06 - r * 0.06
    g.save(); g.translate(x, y + bob); if (o.kijk === -1) g.scale(-1, 1)
    g.globalAlpha = o.alfa == null ? 1 : o.alfa
    g.lineJoin = 'round'; g.lineCap = 'round'
    var vul = function (pad, kleur) { g.fillStyle = kleur; g.fill(pad); g.strokeStyle = lijn; g.lineWidth = lw; g.stroke(pad) }
    var P
    // schaduw op de grond (bij zwevers kleiner)
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(0, r * 0.98 - bob, r * (zweeft ? 0.5 : 0.78), r * (zweeft ? 0.1 : 0.15), 0, 0, 7); g.fill()
    if (VORMEN[L.vorm]) { anatomie(g, id, r, o, { k: k, donker: donker, hel: hel, lijn: lijn, sil: sil }); g.restore(); return }

    // ── achter het lijf: staart, vleugels, tentakels ──
    var st = L.staart
    if (st === 'vlam') {
      var fl = Math.sin(t * 9) * r * 0.06
      P = new Path2D(); P.moveTo(r * 0.5, r * 0.45); P.quadraticCurveTo(r * 1.35, r * 0.35, r * 1.15 + fl, -r * 0.55); P.quadraticCurveTo(r * 1.0, -r * 0.05, r * 0.62, r * 0.1); P.closePath()
      vul(P, sil ? k : '#ff8a3d')
      if (!sil) { P = new Path2D(); P.moveTo(r * 0.7, r * 0.32); P.quadraticCurveTo(r * 1.12, r * 0.25, r * 1.08 + fl, -r * 0.3); P.quadraticCurveTo(r * 0.98, r * 0.02, r * 0.75, r * 0.15); P.closePath(); g.fillStyle = '#ffe14f'; g.fill(P) }
    } else if (st === 'vis') {
      var zw = Math.sin(t * 4) * 0.15
      g.save(); g.translate(r * (lijf === 'vis' ? 0.82 : 0.62), r * (lijf === 'vis' ? 0.12 : 0.35)); g.rotate((lijf === 'vis' ? 0 : -0.4) + zw)
      P = new Path2D(); P.moveTo(0, 0); P.quadraticCurveTo(r * 0.4, -r * 0.1, r * 0.62, -r * 0.42); P.quadraticCurveTo(r * 0.5, 0, r * 0.66, r * 0.34); P.quadraticCurveTo(r * 0.35, r * 0.12, 0, 0.001); vul(P, donker)
      g.restore()
    } else if (st === 'blad') {
      g.save(); g.translate(r * 0.7, r * 0.3); g.rotate(-0.8 + Math.sin(t * 2) * 0.12)
      P = new Path2D(); P.moveTo(0, 0); P.quadraticCurveTo(r * 0.3, -r * 0.3, r * 0.7, 0); P.quadraticCurveTo(r * 0.3, r * 0.3, 0, 0); vul(P, sil ? k : '#3fbf5a')
      if (!sil) { g.strokeStyle = '#2a8a42'; g.lineWidth = lw * 0.7; g.beginPath(); g.moveTo(r * 0.05, 0); g.lineTo(r * 0.6, 0); g.stroke() }
      g.restore()
    } else if (st === 'flits') {
      P = new Path2D(); P.moveTo(r * 0.55, r * 0.5); P.lineTo(r * 0.95, r * 0.1); P.lineTo(r * 0.82, r * 0.02); P.lineTo(r * 1.3, -r * 0.6); P.lineTo(r * 1.0, -r * 0.05); P.lineTo(r * 1.12, r * 0.02); P.lineTo(r * 0.7, r * 0.55); P.closePath()
      vul(P, sil ? k : '#ffe14f')
    } else if (st === 'dun') {
      g.strokeStyle = lijn; g.lineWidth = r * 0.11; g.beginPath(); g.moveTo(r * 0.6, r * 0.6); g.quadraticCurveTo(r * 1.4, r * 0.65, r * 1.15, -r * 0.1 + Math.sin(t * 3) * r * 0.05); g.stroke()
      g.strokeStyle = donker; g.lineWidth = r * 0.06; g.stroke()
      if (type === 'ijs' && !sil) { P = new Path2D(); P.arc(r * 1.15, -r * 0.12, r * 0.13, 0, 7); vul(P, '#ffffff') }
    } else if (st === 'veer') {
      for (var v = 0; v < 3; v++) { g.save(); g.translate(r * 0.6, r * (0.3 + v * 0.12)); g.rotate(-0.3 + v * 0.3); P = new Path2D(); P.ellipse(r * 0.3, 0, r * 0.34, r * 0.1, 0, 0, 7); vul(P, v % 2 ? donker : k); g.restore() }
    } else if (st === 'huis') {
      P = new Path2D(); P.arc(r * 0.32, -r * 0.18, r * 0.66, 0, 7); vul(P, sil ? k : licht(k, -0.15))
      if (!sil) { g.strokeStyle = hel; g.lineWidth = r * 0.08; g.beginPath(); for (var a = 0; a < 20; a++) { var hh = a * 0.6, rr = r * 0.05 + a * r * 0.028; g.lineTo(r * 0.32 + Math.cos(hh) * rr, -r * 0.18 + Math.sin(hh) * rr) } g.stroke() }
    } else if (st === 'ster') {
      g.strokeStyle = lijn; g.lineWidth = r * 0.12; g.beginPath(); g.moveTo(r * 0.6, r * 0.45); g.quadraticCurveTo(r * 1.35, r * 0.35, r * 1.15, -r * 0.4); g.stroke()
      g.strokeStyle = donker; g.lineWidth = r * 0.07; g.stroke()
      g.save(); g.shadowColor = '#ffd23d'; g.shadowBlur = sil ? 0 : r * 0.4; NK.ster(g, r * 1.15, -r * 0.45, r * 0.26, sil ? k : '#ffd23d'); g.restore()
    }
    var vleugel = L.extra === 'vleugel' || lijf === 'insect' || (lijf === 'vogel')
    if (vleugel) {
      var fl2 = Math.sin(t * (lijf === 'insect' ? 22 : 9)) * (lijf === 'insect' ? 0.35 : 0.3)
      var insect = lijf === 'insect'
      ;[-1, 1].forEach(function (z) {
        g.save(); g.translate(z * r * 0.35, -r * 0.15); g.rotate(z * (-0.5 + fl2))
        P = new Path2D()
        if (insect) { P.ellipse(z * r * 0.55, -r * 0.25, r * 0.55, r * 0.28, z * -0.5, 0, 7); g.globalAlpha *= 0.85 }
        else { P.moveTo(0, 0); P.quadraticCurveTo(z * r * 0.7, -r * 0.5, z * r * 0.95, -r * 0.05); P.quadraticCurveTo(z * r * 0.6, r * 0.05, z * r * 0.7, r * 0.25); P.quadraticCurveTo(z * r * 0.35, r * 0.15, 0, r * 0.2); P.closePath() }
        vul(P, insect ? (sil ? k : NK.hexA(hel.indexOf('#') === 0 ? hel : k, 0.75)) : donker)
        if (insect && !sil) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(z * r * 0.5, -r * 0.3, r * 0.25, r * 0.1, z * -0.5, 0, 7); g.fill() }
        g.restore()
      })
    }
    if (L.extra === 'tentakels' || lijf === 'kwal') {
      for (var tk = -2; tk <= 2; tk++) {
        g.strokeStyle = lijn; g.lineWidth = r * 0.09; g.beginPath(); g.moveTo(tk * r * 0.22, r * 0.3)
        g.quadraticCurveTo(tk * r * 0.3 + Math.sin(t * 3 + tk) * r * 0.15, r * 0.7, tk * r * 0.2 + Math.sin(t * 3 + tk + 1) * r * 0.12, r * 1.0); g.stroke()
        g.strokeStyle = k; g.lineWidth = r * 0.05; g.stroke()
      }
    }

    // ── het lijf ──
    g.save(); g.scale(1 - adem, 1 + adem)
    var B = new Path2D()
    if (lijf === 'ovaal') B.ellipse(0, r * 0.12, r * 0.88, r * 0.72, 0, 0, 7)
    else if (lijf === 'druppel') { B.moveTo(0, -r * 0.98); B.bezierCurveTo(r * 0.78, -r * 0.3, r * 0.88, r * 0.86, 0, r * 0.86); B.bezierCurveTo(-r * 0.88, r * 0.86, -r * 0.78, -r * 0.3, 0, -r * 0.98) }
    else if (lijf === 'peer') { B.moveTo(0, -r * 0.88); B.bezierCurveTo(r * 0.62, -r * 0.88, r * 0.98, r * 0.92, 0, r * 0.9); B.bezierCurveTo(-r * 0.98, r * 0.92, -r * 0.62, -r * 0.88, 0, -r * 0.88) }
    else if (lijf === 'breed') B.ellipse(0, r * 0.3, r * 0.98, r * 0.6, 0, 0, 7)
    else if (lijf === 'rots') { [[-0.82, 0.22], [-0.6, -0.55], [-0.1, -0.84], [0.48, -0.66], [0.86, -0.1], [0.78, 0.6], [0.2, 0.88], [-0.55, 0.82]].forEach(function (q, i) { if (i) B.lineTo(q[0] * r, q[1] * r); else B.moveTo(q[0] * r, q[1] * r) }); B.closePath() }
    else if (lijf === 'vis') B.ellipse(0, r * 0.1, r * 0.92, r * 0.62, 0, 0, 7)
    else if (lijf === 'kwal') { B.moveTo(-r * 0.8, r * 0.3); B.bezierCurveTo(-r * 0.9, -r * 0.9, r * 0.9, -r * 0.9, r * 0.8, r * 0.3); B.quadraticCurveTo(r * 0.6, r * 0.45, r * 0.4, r * 0.3); B.quadraticCurveTo(r * 0.2, r * 0.45, 0, r * 0.3); B.quadraticCurveTo(-r * 0.2, r * 0.45, -r * 0.4, r * 0.3); B.quadraticCurveTo(-r * 0.6, r * 0.45, -r * 0.8, r * 0.3) }
    else if (lijf === 'insect') { B.ellipse(0, -r * 0.05, r * 0.62, r * 0.6, 0, 0, 7); B.moveTo(r * 0.5, r * 0.55); B.ellipse(0, r * 0.55, r * 0.5, r * 0.36, 0, 0, 7) }
    else if (lijf === 'vogel') B.ellipse(0, r * 0.1, r * 0.8, r * 0.8, 0, 0, 7)
    else if (lijf === 'lang') {
      // slangachtig lijf: kronkel achter de kop
      var kr = Math.sin(t * 2) * r * 0.06
      P = new Path2D(); P.moveTo(-r * 0.3, r * 0.2); P.bezierCurveTo(-r * 1.1, r * 0.3 + kr, -r * 0.9, r * 0.95, 0, r * 0.85); P.bezierCurveTo(r * 0.9, r * 0.75 - kr, r * 1.1, r * 0.35, r * 0.75, r * 0.15)
      g.strokeStyle = lijn; g.lineWidth = r * 0.5; g.stroke(P); g.strokeStyle = sil ? k : k; g.lineWidth = r * 0.4; g.stroke(P)
      if (!sil) { g.strokeStyle = 'rgba(255,255,240,0.35)'; g.lineWidth = r * 0.14; g.stroke(P) }
      B.ellipse(0, -r * 0.15, r * 0.62, r * 0.55, 0, 0, 7)
    }
    else B.arc(0, r * 0.06, r * 0.84, 0, 7)
    var oor = L.oor, oy = lijf === 'breed' ? -r * 0.12 : lijf === 'lang' ? -r * 0.55 : -r * 0.6
    var oren = function (voor) {
      ;[-1, 1].forEach(function (z) {
        g.save(); g.scale(z, 1)
        if (oor === 'punt' && voor) { P = new Path2D(); P.moveTo(r * 0.22, oy + r * 0.08); P.quadraticCurveTo(r * 0.42, oy - r * 0.42, r * 0.62, oy - r * 0.62); P.quadraticCurveTo(r * 0.78, oy - r * 0.2, r * 0.7, oy + r * 0.18); P.closePath(); vul(P, k); if (!sil) { P = new Path2D(); P.moveTo(r * 0.36, oy + r * 0.02); P.quadraticCurveTo(r * 0.5, oy - r * 0.3, r * 0.6, oy - r * 0.42); P.quadraticCurveTo(r * 0.66, oy - r * 0.15, r * 0.6, oy + r * 0.08); P.closePath(); g.fillStyle = type === 'ijs' ? '#ffffff' : '#ffb8c8'; g.fill(P) } }
        if (oor === 'rond' && !voor) { P = new Path2D(); P.arc(r * 0.52, oy, r * 0.24, 0, 7); vul(P, k); if (!sil) { g.fillStyle = hel; g.beginPath(); g.arc(r * 0.52, oy + r * 0.02, r * 0.12, 0, 7); g.fill() } }
        if (oor === 'vin' && !voor) { P = new Path2D(); P.moveTo(r * 0.55, oy + r * 0.25); P.quadraticCurveTo(r * 0.9, oy - r * 0.05, r * 1.02, oy - r * 0.22); P.quadraticCurveTo(r * 0.9, oy + r * 0.25, r * 0.7, oy + r * 0.5); P.closePath(); vul(P, donker) }
        if (oor === 'blad' && voor) { g.save(); g.translate(r * 0.25, oy - r * 0.05); g.rotate(-0.9); P = new Path2D(); P.moveTo(0, 0); P.quadraticCurveTo(r * 0.25, -r * 0.25, r * 0.55, 0); P.quadraticCurveTo(r * 0.25, r * 0.22, 0, 0); vul(P, sil ? k : '#3fbf5a'); g.restore() }
        if (oor === 'antenne' && !voor) { g.strokeStyle = lijn; g.lineWidth = r * 0.06; g.beginPath(); g.moveTo(r * 0.18, oy + r * 0.05); g.quadraticCurveTo(r * 0.3, oy - r * 0.5, r * 0.52, oy - r * 0.62); g.stroke(); P = new Path2D(); P.arc(r * 0.52, oy - r * 0.62, r * 0.11, 0, 7); vul(P, sil ? k : (type === 'bliksem' ? '#ffe14f' : hel)); if (!sil && type === 'bliksem') { g.save(); g.globalCompositeOperation = 'lighter'; NK.vlek(g, r * 0.52, oy - r * 0.62, r * 0.3, '#ffe14f', 0.4 + Math.sin(t * 6) * 0.2); g.restore() } }
        if (oor === 'pluim' && voor) { P = new Path2D(); P.moveTo(r * 0.18, oy + r * 0.12); P.quadraticCurveTo(r * 0.32, oy - r * 0.3, r * 0.5, oy - r * 0.45); P.quadraticCurveTo(r * 0.5, oy - r * 0.05, r * 0.56, oy + r * 0.12); P.closePath(); vul(P, donker) }
        g.restore()
      })
    }
    oren(false)
    var gr = g.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.08, 0, 0, r * 1.15)
    gr.addColorStop(0, hel); gr.addColorStop(0.5, k); gr.addColorStop(1, donker)
    g.fillStyle = sil ? k : gr; g.fill(B)
    if (!sil) {
      g.save(); g.clip(B)
      g.fillStyle = 'rgba(0,0,30,0.18)'; g.beginPath(); g.ellipse(r * 0.45, r * 0.45, r * 0.9, r * 0.75, -0.4, 0, 7); g.fill()
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.ellipse(-r * 0.38, -r * 0.42, r * 0.32, r * 0.16, -0.6, 0, 7); g.fill()
      if (lijf === 'rots' || type === 'ijs' && lijf === 'rots') { g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = lw * 0.8; g.beginPath(); g.moveTo(-r * 0.5, -r * 0.2); g.lineTo(-r * 0.15, 0); g.lineTo(-r * 0.25, r * 0.35); g.moveTo(r * 0.3, -r * 0.45); g.lineTo(r * 0.45, -r * 0.1); g.stroke() }
      if (lijf !== 'kwal') {
        var bg = g.createLinearGradient(0, r * 0.05, 0, r * 0.9); bg.addColorStop(0, 'rgba(255,255,240,0.55)'); bg.addColorStop(1, 'rgba(255,255,240,0.25)')
        g.fillStyle = bg; g.beginPath(); g.ellipse(0, lijf === 'insect' ? r * 0.55 : r * 0.48, r * 0.42, r * 0.32, 0, 0, 7); g.fill()
      }
      if (L.stip) { g.fillStyle = 'rgba(255,255,255,0.4)'; [[-0.55, -0.1, 0.1], [0.5, 0.05, 0.08], [0.35, -0.5, 0.07], [-0.3, -0.55, 0.06]].forEach(function (q) { g.beginPath(); g.arc(q[0] * r, q[1] * r, q[2] * r, 0, 7); g.fill() }) }
      if (L.streep) { g.strokeStyle = 'rgba(0,0,30,0.3)'; g.lineWidth = r * 0.08; [-0.55, 0.55].forEach(function (zx) { g.beginPath(); g.moveTo(zx * r, -r * 0.45); g.quadraticCurveTo(zx * r * 0.75, -r * 0.2, zx * r * 0.95, 0); g.stroke(); g.beginPath(); g.moveTo(zx * r * 0.9, r * 0.1); g.quadraticCurveTo(zx * r * 0.7, r * 0.3, zx * r * 0.85, r * 0.45); g.stroke() }) }
      if (stad >= 2) {
        if (type === 'vuur') { g.fillStyle = 'rgba(255,230,80,0.55)'; g.beginPath(); g.moveTo(0, r * 0.05); g.quadraticCurveTo(r * 0.3, r * 0.4, 0, r * 0.75); g.quadraticCurveTo(-r * 0.3, r * 0.4, 0, r * 0.05); g.fill() }
        if (type === 'water') { g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = r * 0.06; for (var wv = 0; wv < 2; wv++) { g.beginPath(); for (var q = -4; q <= 4; q++) g.lineTo(q * r * 0.15, -r * 0.25 + wv * r * 0.2 + Math.sin(q) * r * 0.05); g.stroke() } }
        if (type === 'plant') { g.fillStyle = 'rgba(30,140,60,0.5)'; [[-0.5, -0.1], [0.55, 0.05], [0.4, -0.45]].forEach(function (q) { g.beginPath(); g.ellipse(q[0] * r, q[1] * r, r * 0.12, r * 0.07, 0.6, 0, 7); g.fill() }) }
        if (type === 'bliksem') { g.strokeStyle = 'rgba(40,30,0,0.45)'; g.lineWidth = r * 0.07; [-0.55, 0.55].forEach(function (zx) { g.beginPath(); g.moveTo(zx * r, -r * 0.4); g.lineTo(zx * r * 0.8, -r * 0.15); g.lineTo(zx * r, 0); g.lineTo(zx * r * 0.8, r * 0.2); g.stroke() }) }
        if (type === 'ijs') { g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = r * 0.04; [[-0.5, -0.2], [0.5, 0]].forEach(function (q) { for (var a2 = 0; a2 < 3; a2++) { var h2 = a2 * Math.PI / 3; g.beginPath(); g.moveTo(q[0] * r - Math.cos(h2) * r * 0.12, q[1] * r - Math.sin(h2) * r * 0.12); g.lineTo(q[0] * r + Math.cos(h2) * r * 0.12, q[1] * r + Math.sin(h2) * r * 0.12); g.stroke() } }) }
        if (type === 'aarde') { g.fillStyle = 'rgba(80,50,20,0.35)'; [[-0.5, -0.2, 0.14], [0.55, 0.1, 0.11], [0.2, -0.55, 0.09]].forEach(function (q) { g.beginPath(); g.ellipse(q[0] * r, q[1] * r, q[2] * r, q[2] * r * 0.7, 0.4, 0, 7); g.fill() }) }
        if (type === 'lucht') { g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = r * 0.06; g.beginPath(); g.arc(-r * 0.45, -r * 0.1, r * 0.2, Math.PI, Math.PI * 1.9); g.stroke(); g.beginPath(); g.arc(r * 0.45, 0, r * 0.18, Math.PI * 1.1, Math.PI * 2); g.stroke() }
        if (type === 'schaduw') { g.fillStyle = 'rgba(255,220,255,0.3)'; [[-0.48, -0.15], [0.5, 0.0]].forEach(function (q) { g.beginPath(); g.arc(q[0] * r, q[1] * r, r * 0.12, 0, 7); g.fill(); g.fillStyle = k; g.beginPath(); g.arc(q[0] * r + r * 0.05, q[1] * r - r * 0.03, r * 0.1, 0, 7); g.fill(); g.fillStyle = 'rgba(255,220,255,0.3)' }) }
      }
      g.restore()
    }
    g.strokeStyle = lijn; g.lineWidth = lw; g.stroke(B)
    oren(true)
    // pootjes en armpjes (niet bij vissen, kwallen, slangen en zwevers)
    var potig = lijf !== 'vis' && lijf !== 'kwal' && lijf !== 'lang' && lijf !== 'insect'
    if (potig) {
      var voetY = lijf === 'breed' ? r * 0.82 : r * 0.84
      ;[-1, 1].forEach(function (z) {
        P = new Path2D(); P.ellipse(z * r * 0.38, voetY, r * 0.22, r * 0.12, 0, 0, 7); vul(P, lijf === 'vogel' ? (sil ? k : '#ffb02e') : donker)
        if (!sil) { g.strokeStyle = lijn; g.lineWidth = lw * 0.6; g.beginPath(); g.moveTo(z * r * 0.32, voetY - r * 0.05); g.lineTo(z * r * 0.32, voetY + r * 0.04); g.moveTo(z * r * 0.44, voetY - r * 0.05); g.lineTo(z * r * 0.44, voetY + r * 0.04); g.stroke() }
        if (lijf !== 'breed' && lijf !== 'rots' && lijf !== 'vogel') { var zw2 = Math.sin(t * 2.6 + z) * 0.15; g.save(); g.translate(z * r * 0.72, r * 0.25); g.rotate(z * (0.5 + zw2)); P = new Path2D(); P.ellipse(0, 0, r * 0.1, r * 0.2, 0, 0, 7); vul(P, k); g.restore() }
      })
    }
    if (lijf === 'insect') { [-1, 1].forEach(function (z) { g.strokeStyle = lijn; g.lineWidth = lw; g.beginPath(); g.moveTo(z * r * 0.3, r * 0.75); g.lineTo(z * r * 0.45, r * 0.95); g.stroke() }) }
    g.restore()   // einde adem

    // ── extra's ──
    var ex = L.extra
    if (ex === 'manen') { for (var mm = 0; mm < 11; mm++) { var hm = Math.PI * 1.08 + mm / 10 * Math.PI * 0.84; P = new Path2D(); P.moveTo(Math.cos(hm - 0.12) * r * 0.62, -r * 0.08 + Math.sin(hm - 0.12) * r * 0.62); P.lineTo(Math.cos(hm) * r * 0.98, -r * 0.08 + Math.sin(hm) * r * 0.98); P.lineTo(Math.cos(hm + 0.12) * r * 0.62, -r * 0.08 + Math.sin(hm + 0.12) * r * 0.62); P.closePath(); vul(P, sil ? k : (type === 'vuur' ? '#ffb02e' : type === 'ijs' ? '#ffffff' : licht(k, 0.25))) } }
    if (ex === 'kroon') { P = new Path2D(); P.moveTo(-r * 0.32, -r * 0.74); P.lineTo(-r * 0.34, -r * 1.06); P.lineTo(-r * 0.16, -r * 0.9); P.lineTo(0, -r * 1.16); P.lineTo(r * 0.16, -r * 0.9); P.lineTo(r * 0.34, -r * 1.06); P.lineTo(r * 0.32, -r * 0.74); P.closePath(); vul(P, sil ? k : '#ffd23d'); if (!sil) { g.fillStyle = '#ff4f7a'; g.beginPath(); g.arc(0, -r * 0.86, r * 0.06, 0, 7); g.fill() } }
    if (ex === 'bloem') { for (var bl = 0; bl < 5; bl++) { var hb = bl * 1.257 + t * 0.5; P = new Path2D(); P.arc(Math.cos(hb) * r * 0.17, -r * 0.84 + Math.sin(hb) * r * 0.17, r * 0.13, 0, 7); vul(P, sil ? k : '#ff8ad8') } P = new Path2D(); P.arc(0, -r * 0.84, r * 0.1, 0, 7); vul(P, sil ? k : '#ffe14f') }
    if (ex === 'boom') { [[-0.32, -0.86, 0.3], [0.28, -0.9, 0.32], [0, -1.12, 0.36]].forEach(function (q) { P = new Path2D(); P.arc(q[0] * r, q[1] * r, q[2] * r, 0, 7); vul(P, sil ? k : '#2f9a4a') }); if (!sil) { g.fillStyle = '#ff5a5a'; g.beginPath(); g.arc(r * 0.15, -r * 1.0, r * 0.06, 0, 7); g.arc(-r * 0.2, -r * 0.82, r * 0.05, 0, 7); g.fill() } }
    if (ex === 'schelp' || ex === 'golfkam') { P = new Path2D(); P.moveTo(-r * 0.42, -r * 0.7); P.quadraticCurveTo(-r * 0.2, -r * 1.25, 0, -r * 1.02); P.quadraticCurveTo(r * 0.2, -r * 1.3, r * 0.42, -r * 0.7); P.quadraticCurveTo(0, -r * 0.86, -r * 0.42, -r * 0.7); vul(P, sil ? k : hel) }
    if (ex === 'maan') { P = new Path2D(); P.arc(0, -r * 0.3, r * 0.17, 0, 7); vul(P, sil ? k : '#fff6cf'); if (!sil) { g.fillStyle = k; g.beginPath(); g.arc(r * 0.08, -r * 0.35, r * 0.14, 0, 7); g.fill() } }
    if (ex === 'horens') { [-1, 1].forEach(function (z) { P = new Path2D(); P.moveTo(z * r * 0.22, -r * 0.62); P.quadraticCurveTo(z * r * 0.35, -r * 1.05, z * r * 0.62, -r * 1.12); P.quadraticCurveTo(z * r * 0.42, -r * 0.92, z * r * 0.42, -r * 0.58); P.closePath(); vul(P, sil ? k : '#f4ecd8') }) }
    if (ex === 'stekels') { for (var sk = 0; sk < 5; sk++) { var hs = Math.PI * 1.15 + sk / 4 * Math.PI * 0.7; P = new Path2D(); P.moveTo(Math.cos(hs - 0.15) * r * 0.75, Math.sin(hs - 0.15) * r * 0.75); P.lineTo(Math.cos(hs) * r * 1.12, Math.sin(hs) * r * 1.12); P.lineTo(Math.cos(hs + 0.15) * r * 0.75, Math.sin(hs + 0.15) * r * 0.75); P.closePath(); vul(P, sil ? k : licht(k, -0.15)) } }
    if (ex === 'kristal') { [[-0.25, -0.75, -0.3, 0.32], [0.05, -0.85, 0, 0.42], [0.3, -0.72, 0.3, 0.3]].forEach(function (q) { g.save(); g.translate(q[0] * r, q[1] * r); g.rotate(q[2]); P = new Path2D(); P.moveTo(0, -q[3] * r); P.lineTo(q[3] * r * 0.35, 0); P.lineTo(0, q[3] * r * 0.3); P.lineTo(-q[3] * r * 0.35, 0); P.closePath(); vul(P, sil ? k : (type === 'vuur' ? '#ffb02e' : type === 'bliksem' ? '#fff3a0' : '#bff0ff')); g.restore() }) }
    if (ex === 'wolk') { [[-0.35, -0.7, 0.22], [0, -0.82, 0.28], [0.35, -0.7, 0.22]].forEach(function (q) { P = new Path2D(); P.arc(q[0] * r, q[1] * r, q[2] * r, 0, 7); vul(P, sil ? k : '#ffffff') }) }
    if (ex === 'paddo') { P = new Path2D(); P.moveTo(-r * 0.85, -r * 0.45); P.bezierCurveTo(-r * 0.8, -r * 1.25, r * 0.8, -r * 1.25, r * 0.85, -r * 0.45); P.quadraticCurveTo(0, -r * 0.65, -r * 0.85, -r * 0.45); vul(P, sil ? k : '#e8443a'); if (!sil) { g.fillStyle = '#ffffff'; [[-0.4, -0.75, 0.1], [0.15, -0.95, 0.12], [0.5, -0.65, 0.08]].forEach(function (q) { g.beginPath(); g.arc(q[0] * r, q[1] * r, q[2] * r, 0, 7); g.fill() }) } }
    if (ex === 'schild') { P = new Path2D(); P.ellipse(0, -r * 0.35, r * 0.7, r * 0.45, 0, Math.PI, 0); P.closePath(); vul(P, sil ? k : licht(k, -0.2)); if (!sil) { g.strokeStyle = lijn; g.lineWidth = lw * 0.7; g.beginPath(); g.moveTo(0, -r * 0.8); g.lineTo(0, -r * 0.35); g.moveTo(-r * 0.4, -r * 0.65); g.lineTo(-r * 0.25, -r * 0.35); g.moveTo(r * 0.4, -r * 0.65); g.lineTo(r * 0.25, -r * 0.35); g.stroke() } }
    if (ex === 'vin') { P = new Path2D(); P.moveTo(-r * 0.25, -r * 0.45); P.quadraticCurveTo(0, -r * 1.15, r * 0.35, -r * 0.5); P.closePath(); vul(P, donker) }
    if (type === 'vuur' && stad >= 2 && !ex && !sil) { var vf = Math.sin(t * 10) * r * 0.04; P = new Path2D(); P.moveTo(-r * 0.12, -r * 0.7); P.quadraticCurveTo(-r * 0.05, -r * 1.0, vf, -r * 1.08); P.quadraticCurveTo(r * 0.15, -r * 0.9, r * 0.12, -r * 0.7); P.closePath(); g.fillStyle = '#ffb02e'; g.fill(P) }

    if (!sil) {
      // ── gezicht ──
      var ogenY = lijf === 'breed' ? r * 0.12 : lijf === 'kwal' ? -r * 0.25 : lijf === 'lang' ? -r * 0.2 : -r * 0.14, ogenX = r * (lijf === 'vis' ? 0.42 : 0.3), oo = r * (0.2 - L.maat * 0.025)
      var knip = !o.stil && (t % 3.7) > 3.58
      var iris = IRIS[type] || '#2a2a5a'
      ;[-1, 1].forEach(function (z) {
        var ex2 = z * ogenX
        if (knip) { g.strokeStyle = lijn; g.lineWidth = lw * 1.2; g.beginPath(); g.moveTo(ex2 - oo, ogenY); g.quadraticCurveTo(ex2, ogenY + oo * 0.5, ex2 + oo, ogenY); g.stroke(); return }
        g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ex2, ogenY, oo, oo * 1.2, 0, 0, 7); g.fill()
        g.strokeStyle = lijn; g.lineWidth = lw * 0.8; g.stroke()
        if (type === 'schaduw') { g.save(); g.shadowColor = '#ff4fd8'; g.shadowBlur = r * 0.2 }
        g.fillStyle = iris; g.beginPath(); g.ellipse(ex2 + r * 0.035, ogenY + r * 0.03, oo * 0.68, oo * 0.85, 0, 0, 7); g.fill()
        if (type === 'schaduw') g.restore()
        g.fillStyle = '#0e0e1e'; g.beginPath(); g.ellipse(ex2 + r * 0.045, ogenY + r * 0.04, oo * 0.38, oo * 0.52, 0, 0, 7); g.fill()
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex2 + r * 0.09, ogenY - r * 0.06, oo * 0.28, 0, 7); g.fill()
        g.beginPath(); g.arc(ex2 - r * 0.01, ogenY + r * 0.08, oo * 0.13, 0, 7); g.fill()
        if (stad >= 3) { g.strokeStyle = lijn; g.lineWidth = lw * 1.1; g.beginPath(); g.moveTo(ex2 - z * oo * 0.9, ogenY - oo * 1.45); g.lineTo(ex2 + z * oo * 0.7, ogenY - oo * 1.2); g.stroke() }
      })
      g.fillStyle = 'rgba(255,110,150,0.4)'; g.beginPath(); g.ellipse(-r * 0.52, ogenY + r * 0.24, r * 0.12, r * 0.07, 0, 0, 7); g.ellipse(r * 0.52, ogenY + r * 0.24, r * 0.12, r * 0.07, 0, 0, 7); g.fill()
      if (L.snavel) {
        P = new Path2D(); P.moveTo(-r * 0.12, ogenY + r * 0.16); P.lineTo(r * 0.12, ogenY + r * 0.16); P.lineTo(0, ogenY + r * 0.36); P.closePath(); vul(P, type === 'ijs' ? '#ff9a3d' : '#ffb02e')
      } else {
        g.strokeStyle = lijn; g.lineWidth = lw
        if (stad >= 3) {
          P = new Path2D(); P.moveTo(-r * 0.14, ogenY + r * 0.2); P.quadraticCurveTo(0, ogenY + r * 0.36, r * 0.14, ogenY + r * 0.2); P.closePath()
          g.fillStyle = '#5a1a2a'; g.fill(P); g.stroke(P)
          g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(r * 0.05, ogenY + r * 0.21); g.lineTo(r * 0.1, ogenY + r * 0.21); g.lineTo(r * 0.075, ogenY + r * 0.27); g.fill()
        } else { g.beginPath(); g.arc(0, ogenY + r * 0.18, r * 0.1, 0.25, Math.PI - 0.25); g.stroke() }
      }
      if (!o.stil && r > 30) {
        g.save(); g.globalCompositeOperation = 'lighter'
        for (var dd = 0; dd < 5; dd++) {
          var fase = (t * 0.6 + dd / 5) % 1, ax = Math.sin(dd * 2.3 + t) * r * 0.9, ay = r * 0.6 - fase * r * 1.8
          NK.vlek(g, ax, ay, r * 0.08, DEELTJE[type] || '#ffffff', (1 - fase) * 0.8)
        }
        g.restore()
      }
    }
    g.restore()
  }
  return { teken: teken, kleur: wezenKleur, licht: licht }
})()
