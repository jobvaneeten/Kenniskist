import Phaser from 'phaser'
import { drawBackdrop, makeButton, makeCuruntieChip } from '../ui.js'
import { loadLevelProgress, LEVELS } from '../data/LevelData.js'

export default class HomeScene extends Phaser.Scene {
  constructor() { super('HCHome') }

  create() {
    const W = this.scale.width, H = this.scale.height
    drawBackdrop(this, 0.5)
    makeCuruntieChip(this)

    // Titel met binnenkomer-animatie
    const titel = this.add.text(W / 2, H * 0.24, '🚗 BERGRIJDEN', {
      fontSize: '72px', fontFamily: 'Arial Black', color: '#ffffff',
      stroke: '#1a2030', strokeThickness: 12,
    }).setOrigin(0.5).setDepth(5).setShadow(0, 6, '#000', 10).setScale(0.6).setAlpha(0)
    this.tweens.add({ targets: titel, scale: 1, alpha: 1, duration: 420, ease: 'Back.Out' })

    const sub = this.add.text(W / 2, H * 0.24 + 58, 'Race over de heuvels en versla je record!', {
      fontSize: '19px', fontFamily: 'Arial', color: '#d8e0f0',
    }).setOrigin(0.5).setDepth(5).setShadow(0, 2, '#000', 4).setAlpha(0)
    this.tweens.add({ targets: sub, alpha: 1, delay: 220, duration: 320 })

    // Beste afstand over alle levels
    const progress = loadLevelProgress()
    const beste = Math.max(0, ...Object.values(progress))
    if (beste > 0) {
      this.add.text(W / 2, H * 0.24 + 92, `🏆 Beste afstand: ${beste} m`, {
        fontSize: '16px', fontFamily: 'Arial Black', color: '#ffd23f',
      }).setOrigin(0.5).setDepth(5).setShadow(0, 2, '#000', 3)
    }

    makeButton(this, W / 2, H * 0.56, 340, 74, '🎮  Speel Game', () => {
      this.scene.start('HCVehicleSelect')
    }, { color: 0x2f9e44, fontSize: 26, glow: true })

    makeButton(this, W / 2, H * 0.56 + 96, 340, 64, '🛒  Shop', () => {
      this.scene.start('HCShop')
    }, { color: 0xd9832a, fontSize: 22 })

    // Aantal vrijgespeelde levels als kleine teaser onderin
    const unlockedLevels = Object.keys(LEVELS).filter(id => (progress[id] || 0) > 0).length
    this.add.text(W / 2, H - 34, `🗺 ${Math.max(1, unlockedLevels)} van de ${Object.keys(LEVELS).length} werelden gespeeld`, {
      fontSize: '14px', fontFamily: 'Arial', color: '#93a0b8',
    }).setOrigin(0.5).setDepth(5)
  }
}
