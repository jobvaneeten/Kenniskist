import Phaser from 'phaser'
import { LEVEL_ORDER, LEVELS, loadLevelProgress, isLevelUnlocked } from '../data/LevelData.js'
import { VEHICLES, loadSelectedVehicle } from '../data/VehicleData.js'
import { COL, drawBackdrop, drawPanel, makeBackButton, makeCuruntieChip } from '../ui.js'

const GAP = 16
const CARD_W = 208, CARD_H = 268

export default class LevelSelectScene extends Phaser.Scene {
  constructor() { super('HCLevelSelect') }

  create() {
    const W = this.scale.width, H = this.scale.height
    drawBackdrop(this, 0.55)
    makeBackButton(this, () => this.scene.start('HCVehicleSelect'))
    makeCuruntieChip(this)

    const vehicleId = loadSelectedVehicle()
    const v = VEHICLES[vehicleId]

    this.add.text(W / 2, 38, '🗺 Kies een level', {
      fontSize: '30px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5).setDepth(5).setShadow(0, 3, '#000', 6)
    this.add.text(W / 2, 68, `Je racet met: ${v.emoji} ${v.name}`, {
      fontSize: '15px', fontFamily: 'Arial', color: COL.subtekst,
    }).setOrigin(0.5).setDepth(5)

    const progress = loadLevelProgress()
    const startX = W / 2 - (LEVEL_ORDER.length * CARD_W + (LEVEL_ORDER.length - 1) * GAP) / 2
    const y = H / 2 - CARD_H / 2 + 30

    LEVEL_ORDER.forEach((id, i) => {
      this._buildCard(id, startX + i * (CARD_W + GAP), y, vehicleId, progress, i)
    })
  }

  _buildCard(id, x, y, vehicleId, progress, index) {
    const lvl = LEVELS[id]
    const unlocked = isLevelUnlocked(id, progress)
    const best = progress[id] || 0

    const g = this.add.graphics().setDepth(2)
    drawPanel(g, x, y, CARD_W, CARD_H, { border: unlocked ? COL.rand : 0x3a4152 })

    const img = this.add.image(x + CARD_W / 2, y + 74, `hc_card_${id}`)
      .setDisplaySize(CARD_W - 20, 118).setDepth(3)
    // afgeronde uitsnede voor de level-afbeelding
    const maskG = this.make.graphics({ add: false })
    maskG.fillStyle(0xffffff)
    maskG.fillRoundedRect(x + 10, y + 15, CARD_W - 20, 118, 10)
    img.setMask(maskG.createGeometryMask())

    this.add.text(x + CARD_W / 2, y + 152, `${lvl.emoji} ${lvl.name}`, {
      fontSize: '17px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5).setDepth(5).setShadow(0, 2, '#000', 3)

    if (unlocked) {
      this.add.text(x + CARD_W / 2, y + 180, best > 0 ? `🏆 Record: ${best} m` : 'Nog niet gespeeld', {
        fontSize: '13px', fontFamily: 'Arial Black', color: best > 0 ? COL.goudHex : COL.subtekst,
      }).setOrigin(0.5).setDepth(5)
      if (lvl.nextDistance) {
        this.add.text(x + CARD_W / 2, y + 202, `Haal ${lvl.nextDistance} m voor het volgende level`, {
          fontSize: '11px', fontFamily: 'Arial', color: COL.subtekst,
          wordWrap: { width: CARD_W - 24 }, align: 'center',
        }).setOrigin(0.5, 0).setDepth(5)
      }
      // speel-badge onderaan
      const bg = this.add.graphics().setDepth(5)
      bg.fillStyle(0x2f9e44, 1); bg.fillRoundedRect(x + 24, y + CARD_H - 40, CARD_W - 48, 28, 12)
      bg.lineStyle(1.5, 0x9fe8a8, 0.6); bg.strokeRoundedRect(x + 24, y + CARD_H - 40, CARD_W - 48, 28, 12)
      this.add.text(x + CARD_W / 2, y + CARD_H - 26, '▶ Speel', {
        fontSize: '14px', fontFamily: 'Arial Black', color: '#ffffff',
      }).setOrigin(0.5).setDepth(6)
    } else {
      img.setAlpha(0.3)
      const prev = LEVELS[LEVEL_ORDER[lvl.order - 1]]
      this.add.text(x + CARD_W / 2, y + 74, '🔒', { fontSize: '38px' }).setOrigin(0.5).setDepth(6)
      this.add.text(x + CARD_W / 2, y + 186, `Haal ${prev.nextDistance} m in\n${prev.emoji} ${prev.name}`, {
        fontSize: '13px', fontFamily: 'Arial Black', color: '#ff9d9d', align: 'center',
      }).setOrigin(0.5).setDepth(5)
    }

    const zone = this.add.zone(x + CARD_W / 2, y + CARD_H / 2, CARD_W, CARD_H)
      .setInteractive({ useHandCursor: true }).setDepth(8)
    zone.on('pointerover', () => this.tweens.add({ targets: img, scale: img.scale * 1.04, duration: 120 }))
    zone.on('pointerout',  () => this.tweens.add({ targets: img, displayWidth: CARD_W - 20, displayHeight: 118, duration: 120 }))
    zone.on('pointerup', () => {
      if (!unlocked) { this.cameras.main.shake(120, 0.004); return }
      this.scene.start('HCGame', { vehicleId, levelId: id })
    })

    const fade = [g, img]
    fade.forEach(o => o.setAlpha(0))
    this.tweens.add({ targets: g, alpha: 1, delay: index * 50, duration: 220 })
    this.tweens.add({ targets: img, alpha: unlocked ? 1 : 0.3, delay: index * 50, duration: 220 })
  }
}
