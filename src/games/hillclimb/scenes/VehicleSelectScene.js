import Phaser from 'phaser'
import {
  VEHICLE_ORDER, VEHICLES, loadUnlockedVehicles, loadSelectedVehicle, saveSelectedVehicle,
} from '../data/VehicleData.js'
import {
  COL, drawBackdrop, drawPanel, makeBackButton, makeCuruntieChip,
  addVehiclePreview, drawStatBar, vehicleStatFracs,
} from '../ui.js'

const COLS = 5, GAP = 14
const CARD_W = 210, CARD_H = 240

export default class VehicleSelectScene extends Phaser.Scene {
  constructor() { super('HCVehicleSelect') }

  create() {
    const W = this.scale.width
    drawBackdrop(this, 0.55)
    makeBackButton(this, () => this.scene.start('HCHome'))
    makeCuruntieChip(this)

    this.add.text(W / 2, 38, '🚗 Kies je auto', {
      fontSize: '30px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5).setDepth(5).setShadow(0, 3, '#000', 6)

    const unlocked = loadUnlockedVehicles()
    const selected = loadSelectedVehicle()
    const startX = W / 2 - (COLS * CARD_W + (COLS - 1) * GAP) / 2

    VEHICLE_ORDER.forEach((id, i) => {
      const col = i % COLS, row = Math.floor(i / COLS)
      const x = startX + col * (CARD_W + GAP)
      const y = 74 + row * (CARD_H + GAP)
      this._buildCard(id, x, y, unlocked.includes(id), id === selected, i)
    })

    this.add.text(W / 2, 74 + 2 * CARD_H + GAP + 24, 'Klik op een auto om te racen · 🔒 auto’s koop je in de Shop', {
      fontSize: '14px', fontFamily: 'Arial', color: COL.subtekst,
    }).setOrigin(0.5).setDepth(5)
  }

  _buildCard(id, x, y, isUnlocked, isSelected, index) {
    const v = VEHICLES[id]
    const g = this.add.graphics().setDepth(2)
    drawPanel(g, x, y, CARD_W, CARD_H, {
      border: isSelected ? COL.randActief : COL.rand,
      borderW: isSelected ? 3 : 2,
    })

    const preview = addVehiclePreview(this, id, x + CARD_W / 2, y + 66, CARD_W - 44, 96)

    this.add.text(x + CARD_W / 2, y + 128, `${v.emoji} ${v.name}`, {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5).setDepth(5).setShadow(0, 2, '#000', 3)

    const fr = vehicleStatFracs(id)
    const sg = this.add.graphics().setDepth(5)
    drawStatBar(this, sg, x + 22, y + 154, '⚡', fr.snelheid, 0x7ed957, CARD_W - 56)
    drawStatBar(this, sg, x + 22, y + 172, '🛞', fr.grip, 0x4fb0ff, CARD_W - 56)
    drawStatBar(this, sg, x + 22, y + 190, '⛽', fr.tank, 0xffb347, CARD_W - 56)

    if (isUnlocked) {
      this.add.text(x + CARD_W / 2, y + 216, isSelected ? '✅ Gekozen — klik om te racen' : 'Klik om te racen →', {
        fontSize: '12px', fontFamily: 'Arial Black', color: isSelected ? '#7ed957' : '#cfd6e6',
      }).setOrigin(0.5).setDepth(5)
    } else {
      // slot-overlay
      const ov = this.add.graphics().setDepth(6)
      ov.fillStyle(0x0a0d14, 0.55); ov.fillRoundedRect(x, y, CARD_W, CARD_H, 16)
      this.add.text(x + CARD_W / 2, y + 66, '🔒', { fontSize: '34px' }).setOrigin(0.5).setDepth(7)
      this.add.text(x + CARD_W / 2, y + 216, `🪙 ${v.cost} · koop in de Shop`, {
        fontSize: '12px', fontFamily: 'Arial Black', color: COL.goudHex,
      }).setOrigin(0.5).setDepth(7)
      preview.forEach(p => p.setAlpha(0.75))
    }

    const zone = this.add.zone(x + CARD_W / 2, y + CARD_H / 2, CARD_W, CARD_H)
      .setInteractive({ useHandCursor: true }).setDepth(8)
    zone.on('pointerover', () => this.tweens.add({ targets: preview, y: '-=4', duration: 110, ease: 'Sine.Out' }))
    zone.on('pointerout',  () => this.tweens.add({ targets: preview, y: '+=4', duration: 110, ease: 'Sine.Out' }))
    zone.on('pointerup', () => {
      if (!isUnlocked) {
        this.cameras.main.shake(120, 0.004)
        return
      }
      saveSelectedVehicle(id)
      this.scene.start('HCLevelSelect')
    })

    // rustige binnenkomer
    const alles = [g, ...preview]
    alles.forEach(o => o.setAlpha(o.alpha * 0))
    this.tweens.add({ targets: alles, alpha: { from: 0, to: 1 }, delay: index * 35, duration: 200 })
  }
}
