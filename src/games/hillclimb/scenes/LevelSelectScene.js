import Phaser from 'phaser'
import { LEVEL_ORDER, LEVELS, loadLevelProgress, isLevelUnlocked } from '../data/LevelData.js'
import { VEHICLES, loadSelectedVehicle } from '../data/VehicleData.js'
import {
  COL, drawBackdrop, drawPanel, drawLock, makeBackButton, makeCuruntieChip, naarScene, blokkeerDoorklik, kop, tekst,
} from '../ui.js'

const COLS = 5, GAP = 14
const CARD_W = 204, CARD_H = 232
const IMG_W = CARD_W - 16, IMG_H = 108

export default class LevelSelectScene extends Phaser.Scene {
  constructor() { super('HCLevelSelect') }

  create() {
    const W = this.scale.width
    blokkeerDoorklik(this)
    drawBackdrop(this, 0.6)
    makeBackButton(this, () => naarScene(this, 'HCVehicleSelect'))
    makeCuruntieChip(this)

    const v = VEHICLES[loadSelectedVehicle()]

    this.add.text(W / 2, 34, 'KIES EEN WERELD', kop(34, '#ffffff', { letterSpacing: 3 }))
      .setOrigin(0.5).setDepth(5).setShadow(0, 0, '#38bdf8', 18, false, true)
    this.add.text(W / 2, 66, `Je racet met de ${v.name}`, tekst(15)).setOrigin(0.5).setDepth(5)

    const progress = loadLevelProgress()
    const startX = W / 2 - (COLS * CARD_W + (COLS - 1) * GAP) / 2
    LEVEL_ORDER.forEach((id, i) => {
      const col = i % COLS, row = Math.floor(i / COLS)
      this._buildCard(id, startX + col * (CARD_W + GAP), 114 + row * (CARD_H + GAP), loadSelectedVehicle(), progress, i)
    })
  }

  _buildCard(id, x, y, vehicleId, progress, index) {
    const lvl = LEVELS[id]
    const unlocked = isLevelUnlocked(id, progress)
    const best = progress[id] || 0
    const accent = lvl.palette.surfaceLight
    // de eerste wereld die nog geen record heeft krijgt een "nieuw"-gloed
    const isNieuw = unlocked && !best

    const g = this.add.graphics().setDepth(2)
    drawPanel(g, x, y, CARD_W, CARD_H, { border: unlocked ? (isNieuw ? COL.cyaan : COL.rand) : 0x2a2550, glow: isNieuw })

    // Phaser 4 ondersteunt setMask() niet meer onder WebGL — rechte hoeken
    // binnen het ronde paneel zijn een prima alternatief.
    const img = this.add.image(x + CARD_W / 2, y + 8 + IMG_H / 2, `hc_card_${id}`)
      .setDisplaySize(IMG_W, IMG_H).setDepth(3)
    g.lineStyle(2, accent, unlocked ? 0.9 : 0.2); g.lineBetween(x + 8, y + 8 + IMG_H, x + 8 + IMG_W, y + 8 + IMG_H)

    this.add.text(x + 14, y + 8 + IMG_H + 10, String(lvl.order + 1).padStart(2, '0'), kop(13, Phaser.Display.Color.IntegerToColor(accent).rgba, { letterSpacing: 1 }))
      .setDepth(5).setAlpha(unlocked ? 1 : 0.4)
    this.add.text(x + 38, y + 8 + IMG_H + 6, lvl.name.toUpperCase(), kop(18, unlocked ? '#ffffff' : '#7d76a8', { letterSpacing: 1 }))
      .setDepth(5)

    if (unlocked) {
      this.add.text(x + 14, y + 158, best > 0 ? `Record  ${best} m` : 'Nog niet gespeeld', kop(13, best > 0 ? COL.goudHex : COL.subtekst))
        .setDepth(5)
      if (lvl.nextDistance) {
        // voortgang naar de volgende wereld
        const f = Math.min(1, best / lvl.nextDistance)
        const bx = x + 14, by = y + 182, bw = CARD_W - 28
        g.fillStyle(0x2a2550, 1); g.fillRoundedRect(bx, by, bw, 6, 3)
        if (f > 0) { g.fillStyle(f >= 1 ? COL.groenNeon : COL.cyaan, 1); g.fillRoundedRect(bx, by, Math.max(6, bw * f), 6, 3) }
        this.add.text(bx, by + 10, f >= 1 ? 'Volgende wereld vrij!' : `Haal ${lvl.nextDistance} m voor de volgende`, tekst(10.5, f >= 1 ? COL.groenHex : COL.subtekst)).setDepth(5)
      } else {
        this.add.text(x + 14, y + 182, 'Eindwereld — rij zo ver als je kunt!', tekst(10.5, COL.rozeHex)).setDepth(5)
      }
    } else {
      img.setAlpha(0.25)
      drawLock(this.add.graphics().setDepth(4), x + CARD_W / 2, y + 8 + IMG_H / 2, 1.2)
      const prev = LEVELS[LEVEL_ORDER[lvl.order - 1]]
      this.add.text(x + 14, y + 160, `Haal ${prev.nextDistance} m in\n${prev.name}`, tekst(12, '#ff9dbb', { lineSpacing: 2 }))
        .setDepth(5)
    }

    const zone = this.add.zone(x + CARD_W / 2, y + CARD_H / 2, CARD_W, CARD_H)
      .setInteractive({ useHandCursor: true }).setDepth(8)
    zone.on('pointerover', () => { if (unlocked) this.tweens.add({ targets: img, displayWidth: IMG_W * 1.03, displayHeight: IMG_H * 1.03, duration: 120 }) })
    zone.on('pointerout',  () => this.tweens.add({ targets: img, displayWidth: IMG_W, displayHeight: IMG_H, duration: 120 }))
    zone.on('pointerup', () => {
      if (!unlocked) { this.cameras.main.shake(120, 0.004); return }
      naarScene(this, 'HCGame', { vehicleId, levelId: id })
    })

    g.setAlpha(0); img.setAlpha(0)
    this.tweens.add({ targets: g, alpha: 1, delay: index * 40, duration: 220 })
    this.tweens.add({ targets: img, alpha: unlocked ? 1 : 0.25, delay: index * 40, duration: 220 })
  }
}
