import Phaser from 'phaser'
import {
  VEHICLE_ORDER, VEHICLES, loadUnlockedVehicles, loadSelectedVehicle, saveSelectedVehicle,
} from '../data/VehicleData.js'
import {
  COL, drawBackdrop, drawPanel, makeBackButton, makeCuruntieChip, makeArrow, drawDots, drawCoin, drawLock,
  addVehiclePreview, drawStatBar, vehicleStatFracs, naarScene, blokkeerDoorklik, kop, tekst,
} from '../ui.js'

const COLS = 5, ROWS = 2, PER_PAGE = COLS * ROWS, GAP = 14
const CARD_W = 196, CARD_H = 228

export default class VehicleSelectScene extends Phaser.Scene {
  constructor() { super('HCVehicleSelect') }

  init(data) { this.pagina = data?.pagina }

  create() {
    const W = this.scale.width, H = this.scale.height
    blokkeerDoorklik(this)
    drawBackdrop(this, 0.6)
    makeBackButton(this, () => naarScene(this, 'HCHome'))
    makeCuruntieChip(this)

    this.add.text(W / 2, 40, 'KIES JE AUTO', kop(34, '#ffffff', { letterSpacing: 3 }))
      .setOrigin(0.5).setDepth(5).setShadow(0, 0, '#7c3aed', 18, false, true)

    const unlocked = loadUnlockedVehicles()
    const selected = loadSelectedVehicle()
    const paginas = Math.ceil(VEHICLE_ORDER.length / PER_PAGE)
    // standaard de pagina waar je gekozen auto op staat
    const p = Phaser.Math.Clamp(this.pagina ?? Math.floor(VEHICLE_ORDER.indexOf(selected) / PER_PAGE), 0, paginas - 1)
    const startX = W / 2 - (COLS * CARD_W + (COLS - 1) * GAP) / 2

    VEHICLE_ORDER.slice(p * PER_PAGE, (p + 1) * PER_PAGE).forEach((id, i) => {
      const col = i % COLS, row = Math.floor(i / COLS)
      const x = startX + col * (CARD_W + GAP)
      const y = 114 + row * (CARD_H + GAP)
      this._buildCard(id, x, y, unlocked.includes(id), id === selected, i)
    })

    if (paginas > 1) {
      if (p > 0) makeArrow(this, 30, H / 2 + 30, -1, () => naarScene(this, 'HCVehicleSelect', { pagina: p - 1 }))
      if (p < paginas - 1) makeArrow(this, W - 30, H / 2 + 30, 1, () => naarScene(this, 'HCVehicleSelect', { pagina: p + 1 }))
      drawDots(this, W / 2, H - 20, paginas, p)
    } else {
      this.add.text(W / 2, H - 20, "Klik op een auto om te racen · nieuwe auto's koop je in de Shop", tekst(14)).setOrigin(0.5).setDepth(5)
    }
  }

  _buildCard(id, x, y, isUnlocked, isSelected, index) {
    const v = VEHICLES[id]
    const g = this.add.graphics().setDepth(2)
    drawPanel(g, x, y, CARD_W, CARD_H, {
      border: isSelected ? COL.goud : isUnlocked ? COL.rand : 0x2a2550,
      borderW: isSelected ? 2.5 : 1.5, glow: isSelected,
    })
    // zachte spot achter de auto
    g.fillStyle(isSelected ? COL.goud : COL.violet, isUnlocked ? 0.12 : 0.05); g.fillEllipse(x + CARD_W / 2, y + 96, CARD_W - 30, 26)

    const preview = addVehiclePreview(this, id, x + CARD_W / 2, y + 64, CARD_W - 40, 92)

    this.add.text(x + CARD_W / 2, y + 130, v.name.toUpperCase(), kop(17, '#ffffff', { letterSpacing: 1 }))
      .setOrigin(0.5).setDepth(5)

    const fr = vehicleStatFracs(id)
    const sg = this.add.graphics().setDepth(5)
    drawStatBar(this, sg, x + 18, y + 156, 'SNEL', fr.snelheid, COL.groenNeon, CARD_W - 52)
    drawStatBar(this, sg, x + 18, y + 174, 'GRIP', fr.grip, COL.cyaan, CARD_W - 52)
    drawStatBar(this, sg, x + 18, y + 192, 'TANK', fr.tank, COL.oranje, CARD_W - 52)

    if (isUnlocked) {
      this.add.text(x + CARD_W / 2, y + 211, isSelected ? '● GEKOZEN — KLIK OM TE RACEN' : 'KLIK OM TE RACEN ›', kop(11, isSelected ? COL.goudHex : '#cfc8f5', { letterSpacing: 1 }))
        .setOrigin(0.5).setDepth(5)
    } else {
      const ov = this.add.graphics().setDepth(6)
      ov.fillStyle(0x07061a, 0.55); ov.fillRoundedRect(x, y, CARD_W, CARD_H, 16)
      drawLock(ov, x + CARD_W / 2, y + 60, 1.3)
      drawCoin(ov, x + CARD_W / 2 - 40, y + 211, 7)
      this.add.text(x + CARD_W / 2 - 28, y + 211, `${v.cost} · in de Shop`, kop(13, COL.goudHex)).setOrigin(0, 0.5).setDepth(7)
      preview.forEach(p => p.setAlpha(0.6))
    }

    const zone = this.add.zone(x + CARD_W / 2, y + CARD_H / 2, CARD_W, CARD_H)
      .setInteractive({ useHandCursor: true }).setDepth(8)
    zone.on('pointerover', () => this.tweens.add({ targets: preview, y: '-=5', duration: 110, ease: 'Sine.Out' }))
    zone.on('pointerout',  () => this.tweens.add({ targets: preview, y: '+=5', duration: 110, ease: 'Sine.Out' }))
    zone.on('pointerup', () => {
      if (!isUnlocked) {
        this.cameras.main.shake(120, 0.004)
        return
      }
      saveSelectedVehicle(id)
      naarScene(this, 'HCLevelSelect')
    })

    // rustige binnenkomer
    const alles = [g, ...preview]
    alles.forEach(o => o.setAlpha(0))
    this.tweens.add({ targets: g, alpha: 1, delay: index * 35, duration: 200 })
    this.tweens.add({ targets: preview, alpha: isUnlocked ? 1 : 0.6, delay: index * 35, duration: 200 })
  }
}
