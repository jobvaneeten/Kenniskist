// Gedeelde UI-helpers voor de Hill Climb-menuschermen: panelen, knoppen,
// munt-chip, voertuig-previews en stat-balkjes — één consistente stijl.
import Phaser from 'phaser'
import { VEHICLES } from './data/VehicleData.js'

export const COL = {
  goud: 0xffd23f, goudHex: '#ffd23f',
  groen: 0x2f9e44, groenLicht: 0x7ed957,
  oranje: 0xd9832a,
  kaartTop: 0x232a3a, kaartBot: 0x141824,
  rand: 0x55617a, randActief: 0xffd23f,
  tekst: '#ffffff', subtekst: '#aab4c8',
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

// Gedimde garage-achtergrond met vignette, voor elk menuscherm.
export function drawBackdrop(scene, dimAlpha = 0.45) {
  const W = scene.scale.width, H = scene.scale.height
  scene.add.image(W / 2, H / 2, 'hc_garage_bg').setDisplaySize(W, H).setDepth(0)
  const g = scene.add.graphics().setDepth(1)
  g.fillStyle(0x0a0d14, dimAlpha); g.fillRect(0, 0, W, H)
  g.fillGradientStyle(0x0a0d14, 0x0a0d14, 0x0a0d14, 0x0a0d14, 0.7, 0.7, 0, 0)
  g.fillRect(0, 0, W, 110)
  g.fillGradientStyle(0x0a0d14, 0x0a0d14, 0x0a0d14, 0x0a0d14, 0, 0, 0.7, 0.7)
  g.fillRect(0, H - 90, W, 90)
}

// Afgerond paneel met gradient, schaduw en rand.
export function drawPanel(g, x, y, w, h, { border = COL.rand, top = COL.kaartTop, bottom = COL.kaartBot, radius = 16, borderW = 2, borderAlpha = 0.9 } = {}) {
  g.fillStyle(0x000000, 0.4); g.fillRoundedRect(x + 2, y + 4, w, h, radius)
  g.fillGradientStyle(top, top, bottom, bottom, 1); g.fillRoundedRect(x, y, w, h, radius)
  g.fillStyle(0xffffff, 0.05); g.fillRoundedRect(x + 3, y + 3, w - 6, h * 0.4, radius - 4)
  g.lineStyle(borderW, border, borderAlpha); g.strokeRoundedRect(x, y, w, h, radius)
}

// Grote gradient-knop met hover en optionele glow.
export function makeButton(scene, x, y, w, h, label, cb, { color = COL.groen, fontSize = 20, glow = false, depth = 5 } = {}) {
  const g = scene.add.graphics().setDepth(depth)
  const base = Phaser.Display.Color.ValueToColor(color)
  const draw = (hover) => {
    const t = base.clone().brighten(hover ? 34 : 20).color
    const b = base.clone().darken(hover ? 2 : 14).color
    g.clear()
    g.fillStyle(0x000000, 0.4); g.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 5, w, h, 16)
    g.fillGradientStyle(t, t, b, b, 1); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 16)
    g.fillStyle(0xffffff, 0.14); g.fillRoundedRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, h * 0.42, 12)
    g.lineStyle(2.5, hover || glow ? 0xffe9b0 : 0xffffff, hover ? 1 : 0.45)
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 16)
    if (glow) { g.lineStyle(1.5, base.clone().brighten(50).color, 0.5); g.strokeRoundedRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, 19) }
  }
  draw(false)
  const txt = scene.add.text(x, y, label, {
    fontSize: `${fontSize}px`, fontFamily: 'Arial Black', color: '#ffffff',
  }).setOrigin(0.5).setDepth(depth + 1).setShadow(0, 2, '#000', 4)
  const zone = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(depth + 2)
  zone.on('pointerover', () => { draw(true); scene.tweens.add({ targets: txt, scale: 1.06, duration: 90 }) })
  zone.on('pointerout',  () => { draw(false); scene.tweens.add({ targets: txt, scale: 1, duration: 90 }) })
  zone.on('pointerup', cb)
  return { gfx: g, txt, zone }
}

// Terug-knop linksboven.
export function makeBackButton(scene, cb) {
  return makeButton(scene, 78, 36, 120, 40, '← Terug', cb, { color: 0x37415a, fontSize: 15 })
}

// Munten-chip rechtsboven; refresh() na een aankoop.
export function makeCuruntieChip(scene) {
  const W = scene.scale.width
  const g = scene.add.graphics().setDepth(5)
  const txt = scene.add.text(W - 32, 36, '', {
    fontSize: '19px', fontFamily: 'Arial Black', color: COL.goudHex,
  }).setOrigin(1, 0.5).setDepth(6).setShadow(0, 2, '#000', 3)
  const refresh = () => {
    const label = `🪙 ${getCuruntie()}`
    txt.setText(label)
    const w = txt.width + 36
    g.clear()
    drawPanel(g, W - w - 20, 16, w, 40, { radius: 20, border: COL.goud, borderAlpha: 0.6 })
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
  body.setPosition(cx, midY).setDisplaySize(bodyW, bodyW / aspect).setOrigin(0.5, 0.62)
  imgs.push(body)
  const wy = midY + (v.chassisH / 2 + v.suspensionLength) * s
  const wd = v.wheelRadius * 2 * s
  ;[-1, 1].forEach(k => {
    imgs.push(scene.add.image(cx + k * v.wheelOffsetX * s, wy, `hc_wiel_${id}`).setDisplaySize(wd, wd).setDepth(depth + 2))
  })
  return imgs
}

// Stat-balk: 5 blokjes, `val` (0..1) bepaalt hoeveel er gevuld zijn.
export function drawStatBar(scene, g, x, y, label, val, kleur, breedte = 92) {
  scene.add.text(x, y, label, { fontSize: '11px', fontFamily: 'Arial Black', color: COL.subtekst })
    .setOrigin(0, 0.5).setDepth(5)
  const n = 5, bw = (breedte - (n - 1) * 3) / n
  const vol = Math.max(1, Math.round(val * n))
  for (let i = 0; i < n; i++) {
    g.fillStyle(i < vol ? kleur : 0x394153, 1)
    g.fillRoundedRect(x + 34 + i * (bw + 3), y - 4, bw, 8, 3)
  }
}

// Normaliseert voertuig-stats naar 0..1 voor de balkjes.
export function vehicleStatFracs(id) {
  const v = VEHICLES[id]
  const f = (val, min, max) => Phaser.Math.Clamp((val - min) / (max - min), 0, 1)
  return {
    snelheid: f(v.power, 0.019, 0.042),
    grip: f(v.grip, 0.8, 1.3),
    tank: f(v.maxFuel, 55, 165),
  }
}
