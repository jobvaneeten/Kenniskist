import Phaser from 'phaser'
import { drawBackdrop, makeButton, makeCuruntieChip, naarScene, blokkeerDoorklik, addVehiclePreview, kop, tekst, COL } from '../ui.js'
import { loadLevelProgress, isLevelUnlocked, LEVEL_ORDER } from '../data/LevelData.js'
import { loadSelectedVehicle, loadUnlockedVehicles, VEHICLE_ORDER } from '../data/VehicleData.js'

export default class HomeScene extends Phaser.Scene {
  constructor() { super('HCHome') }

  create() {
    const W = this.scale.width, H = this.scale.height
    blokkeerDoorklik(this)
    drawBackdrop(this, 0.25)
    makeCuruntieChip(this)

    this.add.text(W / 2, H * 0.12, 'RACE  ·  STUNT  ·  UPGRADE', kop(15, COL.cyaanHex, { letterSpacing: 6 }))
      .setOrigin(0.5).setDepth(5)

    // Titel met binnenkomer-animatie en neon-gloed
    const titel = this.add.text(W / 2, H * 0.22, 'BERGRIJDEN', kop(88, '#ffd23f', { letterSpacing: 4 }))
      .setOrigin(0.5).setDepth(5).setShadow(0, 0, '#ff2f8e', 28, false, true).setScale(0.6).setAlpha(0)
    this.tweens.add({ targets: titel, scale: 1, alpha: 1, duration: 480, ease: 'Back.Out' })
    this.tweens.add({ targets: titel, scale: 1.025, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 500 })

    // Kerngetallen in één regel
    const progress = loadLevelProgress()
    const beste = Math.max(0, ...Object.values(progress))
    const werelden = LEVEL_ORDER.filter(id => isLevelUnlocked(id, progress)).length
    const autos = loadUnlockedVehicles().length
    const regel = `${werelden}/${LEVEL_ORDER.length} werelden   ·   ${autos}/${VEHICLE_ORDER.length} auto's${beste > 0 ? `   ·   record ${beste} m` : ''}`
    const sub = this.add.text(W / 2, H * 0.22 + 64, regel, tekst(17, '#e4dcff')).setOrigin(0.5).setDepth(5).setAlpha(0)
    this.tweens.add({ targets: sub, alpha: 1, delay: 220, duration: 320 })

    makeButton(this, W / 2, H * 0.52, 320, 70, '▶  SPELEN', () => {
      naarScene(this, 'HCVehicleSelect')
    }, { color: COL.violet, fontSize: 28, glow: true, filled: true })

    makeButton(this, W / 2, H * 0.52 + 88, 320, 58, 'GARAGE & SHOP', () => {
      naarScene(this, 'HCShop')
    }, { color: COL.roze, fontSize: 21, glow: true })

    // gekozen auto rijdt zacht wiebelend op de neonvloer
    const id = loadSelectedVehicle()
    const preview = addVehiclePreview(this, id, W / 2, H - 84, 230, 92, 6)
    const schaduw = this.add.ellipse(W / 2, H - 36, 220, 18, 0x000000, 0.45).setDepth(5)
    this.tweens.add({ targets: preview, y: '-=4', duration: 380, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    this.tweens.add({ targets: schaduw, scaleX: 0.94, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
  }
}
