// Gedeelde UI-helpers voor de Hill Climb-menuschermen: panelen, knoppen,
// munt-chip, voertuig-previews en stat-balkjes — in de donkere neon-stijl
// van de rest van Kenniskist.
import Phaser from 'phaser'
import { VEHICLES } from './data/VehicleData.js'

export const FONT = "'Baloo 2', 'Arial Black', sans-serif"     // koppen/knoppen (gewicht 800)
export const FONT_BODY = "Nunito, Arial, sans-serif"            // lopende tekst (gewicht 700)

export const COL = {
  goud: 0xffd23f, goudHex: '#ffd23f',
  violet: 0x7c3aed, violetLicht: 0xa78bfa,
  cyaan: 0x38bdf8, cyaanHex: '#38bdf8',
  roze: 0xff2f8e, rozeHex: '#ff2f8e',
  groen: 0x22c55e, groenNeon: 0x4ade80, groenHex: '#4ade80',
  oranje: 0xff8a3d,
  kaart: 0x15122e, kaartTop: 0x231d48,
  rand: 0x3b3470, randActief: 0xffd23f,
  tekst: '#ffffff', subtekst: '#b9b3e0',
}

export function getCuruntie() {
  try { return parseInt(localStorage.getItem('kk_curuntie') || '0', 10) } catch { return 0 }
}

export function spendCuruntie(amount) {
  const cur = getCuruntie()
  if (cur < amount) return false
  localStorage.setItem('kk_curuntie', String(cur - amount))
  return true
}

// Tekststijl-snelkoppelingen
export const kop = (size, color = '#ffffff', extra = {}) => ({ fontSize: `${size}px`, fontFamily: FONT, fontStyle: '800', color, ...extra })
export const tekst = (size, color = COL.subtekst, extra = {}) => ({ fontSize: `${size}px`, fontFamily: FONT_BODY, fontStyle: '700', color, ...extra })

// ── Doorklikken voorkomen ───────────────────────────────────────────────────
// Alle knoppen reageren op pointerup, en tot nu toe startte die handler meteen
// de volgende scène. De rest van diezelfde klik komt dan terecht op wat er op
// die plek in het níeuwe scherm staat. Bij het kiezen van een auto stond daar
// het levelkaartje, dus begon het level meteen — je zag het kiesscherm niet
// eens. Vandaar: eerst de input dicht, dan pas wisselen, en het nieuwe scherm
// luistert de eerste paar frames nog niet.

// Wissel van scherm zonder de rest van de klik door te geven.
export function naarScene(scene, sleutel, data) {
  if (scene._hcWisselt) return
  scene._hcWisselt = true
  scene.input.enabled = false
  scene.time.delayedCall(60, () => scene.scene.start(sleutel, data))
}

// Aan het begin van een scherm: de eerste klik pas aannemen als de vorige echt
// losgelaten is. Zonder de isDown-check zou ingedrukt houden er alsnog
// doorheen glippen.
export function blokkeerDoorklik(scene, ms = 220) {
  scene.input.enabled = false
  const vrij = () => {
    if (!scene.scene.isActive()) return
    if (scene.input.activePointer?.isDown) { scene.time.delayedCall(50, vrij); return }
    scene.input.enabled = true
  }
  scene.time.delayedCall(ms, vrij)
}

// Synthwave-achtergrond (proceduralArt.js) met dimlaag en donkere randen,
// plus een paar langzaam zwevende sterretjes voor wat leven.
export function drawBackdrop(scene, dimAlpha = 0.45) {
  const W = scene.scale.width, H = scene.scale.height
  scene.add.image(W / 2, H / 2, 'hc_neon_bg').setDisplaySize(W, H).setDepth(0)
  const g = scene.add.graphics().setDepth(1)
  g.fillStyle(0x07061a, dimAlpha); g.fillRect(0, 0, W, H)
  g.fillGradientStyle(0x07061a, 0x07061a, 0x07061a, 0x07061a, 0.8, 0.8, 0, 0)
  g.fillRect(0, 0, W, 120)
  g.fillGradientStyle(0x07061a, 0x07061a, 0x07061a, 0x07061a, 0, 0, 0.8, 0.8)
  g.fillRect(0, H - 100, W, 100)
  if (scene.textures.exists('hc_spark')) {
    scene.add.particles(0, 0, 'hc_spark', {
      x: { min: 0, max: W }, y: { min: H * 0.1, max: H * 0.9 },
      speedY: { min: -14, max: -4 }, speedX: { min: -4, max: 4 },
      scale: { start: 0.22, end: 0 }, alpha: { start: 0.8, end: 0 },
      lifespan: { min: 2500, max: 5000 }, frequency: 260,
      tint: [COL.cyaan, COL.roze, COL.violetLicht, COL.goud], blendMode: 'ADD',
    }).setDepth(1.5)
  }
}

// Mengt twee kleuren; 0 = a, 1 = b.
export function meng(a, b, t) {
  return Phaser.Display.Color.ObjectToColor(
    Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(a), Phaser.Display.Color.ValueToColor(b), 100, t * 100,
    ),
  ).color
}

// Glas-paneel met neonrand en zachte gloed.
//
// Bewust géén fillGradientStyle: een afgeronde rechthoek wordt door Phaser in
// driehoeken opgedeeld en de kleuren worden per hoekpunt geïnterpoleerd, dus
// een verloop wordt een harde diagonale naad dwars door het paneel. Vlakke
// vulling plus een lichte band bovenin geeft hetzelfde effect zonder de naad.
export function drawPanel(g, x, y, w, h, { border = COL.rand, top = COL.kaartTop, bottom = COL.kaart, radius = 16, borderW = 1.5, borderAlpha = 0.9, glow = false, fillAlpha = 0.9 } = {}) {
  g.fillStyle(0x000000, 0.35); g.fillRoundedRect(x + 2, y + 5, w, h, radius)
  if (glow) {
    g.lineStyle(10, border, 0.10); g.strokeRoundedRect(x - 3, y - 3, w + 6, h + 6, radius + 3)
    g.lineStyle(5, border, 0.18); g.strokeRoundedRect(x - 1, y - 1, w + 2, h + 2, radius + 1)
  }
  g.fillStyle(bottom, fillAlpha); g.fillRoundedRect(x, y, w, h, radius)
  g.fillStyle(top, 0.55); g.fillRoundedRect(x + 2, y + 2, w - 4, h * 0.42, radius - 3)
  g.fillStyle(0xffffff, 0.04); g.fillRoundedRect(x + 3, y + 3, w - 6, h * 0.22, radius - 4)
  g.lineStyle(borderW, border, borderAlpha); g.strokeRoundedRect(x, y, w, h, radius)
}

// Neon-knop: donkere vulling in de knopkleur, heldere rand en gloed.
export function makeButton(scene, x, y, w, h, label, cb, { color = COL.violet, fontSize = 20, glow = false, depth = 5, filled = false } = {}) {
  const g = scene.add.graphics().setDepth(depth)
  const base = Phaser.Display.Color.ValueToColor(color)
  const licht = base.clone().brighten(28).color
  const r = Math.min(18, h / 2)
  const draw = (hover) => {
    g.clear()
    g.fillStyle(0x000000, 0.4); g.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 5, w, h, r)
    if (glow || hover) {
      g.lineStyle(12, color, hover ? 0.16 : 0.10); g.strokeRoundedRect(x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8, r + 4)
      g.lineStyle(6, color, hover ? 0.28 : 0.18); g.strokeRoundedRect(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2, r + 1)
    }
    g.fillStyle(filled ? color : meng(0x120e2a, color, hover ? 0.45 : 0.32), 1); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r)
    g.fillStyle(0xffffff, filled ? 0.18 : 0.07); g.fillRoundedRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, h * 0.42, r - 3)
    g.lineStyle(2, licht, hover ? 1 : 0.85); g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r)
  }
  draw(false)
  const txt = scene.add.text(x, y, label, kop(fontSize, '#ffffff'))
    .setOrigin(0.5).setDepth(depth + 1).setShadow(0, 0, Phaser.Display.Color.RGBToString(base.red, base.green, base.blue), 10, false, true)
  const zone = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(depth + 2)
  zone.on('pointerover', () => { draw(true); scene.tweens.add({ targets: txt, scale: 1.06, duration: 90 }) })
  zone.on('pointerout',  () => { draw(false); scene.tweens.add({ targets: txt, scale: 1, duration: 90 }) })
  zone.on('pointerup', cb)
  return { gfx: g, txt, zone }
}

// Terug-knop linksboven, onder de vaste terugknop van de app (die gaat het spel uit).
export function makeBackButton(scene, cb) {
  return makeButton(scene, 78, 92, 120, 40, '‹ Vorige', cb, { color: 0x5b5294, fontSize: 16 })
}

// Ronde pijlknop (bladeren door pagina's).
export function makeArrow(scene, x, y, dir, cb, depth = 9) {
  const g = scene.add.graphics().setDepth(depth)
  const draw = (hover) => {
    g.clear()
    g.fillStyle(0x000000, 0.35); g.fillCircle(x + 1, y + 4, 24)
    g.lineStyle(8, COL.cyaan, hover ? 0.25 : 0.12); g.strokeCircle(x, y, 26)
    g.fillStyle(0x15122e, 0.95); g.fillCircle(x, y, 23)
    g.lineStyle(2, COL.cyaan, 1); g.strokeCircle(x, y, 23)
    g.lineStyle(4, 0xffffff, 1)
    g.beginPath(); g.moveTo(x - 4 * dir, y - 9); g.lineTo(x + 5 * dir, y); g.lineTo(x - 4 * dir, y + 9); g.strokePath()
  }
  draw(false)
  const z = scene.add.zone(x, y, 56, 56).setInteractive({ useHandCursor: true }).setDepth(depth + 1)
  z.on('pointerover', () => draw(true)); z.on('pointerout', () => draw(false))
  z.on('pointerup', cb)
  return [g, z]
}

// Paginapuntjes onder een raster.
export function drawDots(scene, x, y, n, actief, depth = 5) {
  const g = scene.add.graphics().setDepth(depth)
  for (let i = 0; i < n; i++) {
    const cx = x + (i - (n - 1) / 2) * 22
    if (i === actief) { g.fillStyle(COL.cyaan, 0.25); g.fillCircle(cx, y, 9); g.fillStyle(COL.cyaan, 1); g.fillCircle(cx, y, 5) }
    else { g.fillStyle(0xffffff, 0.25); g.fillCircle(cx, y, 4) }
  }
  return g
}

// Getekende munt (in plaats van een emoji) — past bij de goudkleur.
export function drawCoin(g, x, y, r = 9) {
  g.fillStyle(COL.goud, 0.22); g.fillCircle(x, y, r + 4)
  g.fillStyle(0xc98a00, 1); g.fillCircle(x, y + 1, r)
  g.fillStyle(COL.goud, 1); g.fillCircle(x, y, r)
  g.fillStyle(0xfff3b0, 1); g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.32)
  g.lineStyle(1.5, 0xc98a00, 1); g.strokeCircle(x, y, r * 0.62)
}

// Getekend hangslot.
export function drawLock(g, x, y, s = 1, kleur = 0xb9b3e0) {
  g.lineStyle(4 * s, kleur, 1)
  g.beginPath(); g.arc(x, y - 6 * s, 9 * s, Math.PI, 0); g.strokePath()
  g.fillStyle(kleur, 1); g.fillRoundedRect(x - 13 * s, y - 6 * s, 26 * s, 20 * s, 5 * s)
  g.fillStyle(0x15122e, 1); g.fillCircle(x, y + 2 * s, 3 * s); g.fillRect(x - 1.2 * s, y + 2 * s, 2.4 * s, 6 * s)
}

// Munten-chip rechtsboven; refresh() na een aankoop.
export function makeCuruntieChip(scene) {
  const W = scene.scale.width
  const g = scene.add.graphics().setDepth(5)
  const txt = scene.add.text(W - 34, 36, '', kop(20, COL.goudHex))
    .setOrigin(1, 0.5).setDepth(6)
  const refresh = () => {
    txt.setText(String(getCuruntie()))
    const w = txt.width + 52
    g.clear()
    drawPanel(g, W - w - 20, 16, w, 40, { radius: 20, border: COL.goud, borderAlpha: 0.7, glow: true })
    drawCoin(g, W - w + 2, 36, 9)
  }
  refresh()
  return { refresh }
}

// Voertuig-preview (carrosserie + wielen) gecentreerd en geschaald in een box.
export function addVehiclePreview(scene, id, cx, cy, maxW, maxH, depth = 4) {
  const v = VEHICLES[id]
  const imgs = []
  const body = scene.add.image(0, 0, `hc_body_${id}`).setDepth(depth + 1)
  const aspect = body.width / body.height
  // wereld-breedte incl. wielen die iets uitsteken
  const worldW = Math.max(v.chassisW * 1.35, v.wheelOffsetX * 2 + v.wheelRadius * 2)
  const worldH = (v.chassisW * 1.35) / aspect * 0.62 + v.chassisH / 2 + v.suspensionLength + v.wheelRadius
  const s = Math.min(maxW / worldW, maxH / worldH)
  const bodyW = v.chassisW * 1.35 * s
  // chassis-middelpunt zo dat body + wielen samen gecentreerd staan in de box
  const midY = cy - (v.chassisH / 2 + v.suspensionLength) * s * 0.25
  body.setPosition(cx, midY).setDisplaySize(bodyW, bodyW / aspect)
    .setOrigin(v.art?.originX ?? 0.5, v.art?.originY ?? 0.62)
  imgs.push(body)
  const wy = midY + (v.chassisH / 2 + v.suspensionLength) * s
  const art = v.art || {}
  ;[-1, 1].forEach(k => {
    const r = (k < 0 ? art.dispL : art.dispR) ?? art.disp ?? v.wheelRadius
    const wd = r * 2 * s
    imgs.push(scene.add.image(cx + k * v.wheelOffsetX * s, wy, `hc_wiel_${id}`).setDisplaySize(wd, wd).setDepth(depth + 2))
  })
  return imgs
}

// Stat-balk: 5 gloeiende blokjes, `val` (0..1) bepaalt hoeveel er gevuld zijn.
export function drawStatBar(scene, g, x, y, label, val, kleur, breedte = 92) {
  scene.add.text(x, y, label, tekst(10, COL.subtekst, { fontFamily: FONT, fontStyle: '800' }))
    .setOrigin(0, 0.5).setDepth(5)
  const n = 5, off = 38, bw = (breedte - off + 34 - (n - 1) * 3) / n
  const vol = Math.max(1, Math.round(val * n))
  for (let i = 0; i < n; i++) {
    if (i < vol) { g.fillStyle(kleur, 0.25); g.fillRoundedRect(x + off + i * (bw + 3) - 1, y - 5, bw + 2, 10, 4) }
    g.fillStyle(i < vol ? kleur : 0x2a2550, 1)
    g.fillRoundedRect(x + off + i * (bw + 3), y - 3.5, bw, 7, 3)
  }
}

// Normaliseert voertuig-stats naar 0..1 voor de balkjes.
export function vehicleStatFracs(id) {
  const v = VEHICLES[id]
  const f = (val, min, max) => Phaser.Math.Clamp((val - min) / (max - min), 0, 1)
  return {
    snelheid: f(v.power, 0.019, 0.045),
    grip: f(v.grip, 0.8, 1.3),
    tank: f(v.maxFuel, 55, 165),
  }
}
