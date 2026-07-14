import Phaser from 'phaser'
import {
  VEHICLE_ORDER, VEHICLES, UPGRADE_TYPES, MAX_UPGRADE_LEVEL,
  upgradeCost, loadUnlockedVehicles, unlockVehicle, loadUpgrades, saveUpgradeLevel,
} from '../data/VehicleData.js'
import { LEVEL_ORDER, LEVELS, loadLevelProgress, isLevelUnlocked } from '../data/LevelData.js'

function getCuruntie() {
  try { return parseInt(localStorage.getItem('kk_curuntie') || '0', 10) } catch { return 0 }
}
function spendCuruntie(amount) {
  const cur = getCuruntie()
  if (cur < amount) return false
  localStorage.setItem('kk_curuntie', String(cur - amount))
  return true
}

export default class GarageScene extends Phaser.Scene {
  constructor() { super('HCGarage') }

  create() {
    const W = this.scale.width, H = this.scale.height
    this.add.image(W / 2, H / 2, 'hc_garage_bg').setDisplaySize(W, H).setDepth(0)
    this.add.rectangle(0, 0, W, H, 0x000000, 0.28).setOrigin(0).setDepth(1)

    this.selected = loadUnlockedVehicles()[0] || 'jeep'

    this.add.text(24, 18, '🚗 Garage', {
      fontSize: '30px', fontFamily: 'Arial Black', color: '#ffffff', stroke: '#000', strokeThickness: 5,
    }).setDepth(2)

    this._curChip = this.add.graphics().setDepth(2)
    this._curText = this.add.text(0, 0, '', {
      fontSize: '18px', fontFamily: 'Arial Black', color: '#ffd23f',
    }).setDepth(3).setShadow(0, 1, '#000', 2)

    this._vehicleCards = {}
    this._buildVehicleRow()
    this._buildUpgradePanel()
    this._buildLevelRow()
    this._refreshAll()
  }

  _refreshAll() {
    const cur = getCuruntie()
    this._curChip.clear()
    this._curChip.fillStyle(0x000000, 0.45); this._curChip.fillRoundedRect(this.scale.width - 170, 18, 150, 38, 12)
    this._curText.setText(`🪙 ${cur}`).setPosition(this.scale.width - 150, 27)
    this._refreshVehicleRow()
    this._refreshUpgradePanel()
    this._refreshLevelRow()
  }

  // ── Voertuigen ───────────────────────────────────────────────────
  _buildVehicleRow() {
    const y = 130, cardW = 220, cardH = 150, gap = 24
    const totalW = VEHICLE_ORDER.length * cardW + (VEHICLE_ORDER.length - 1) * gap
    const startX = this.scale.width / 2 - totalW / 2

    VEHICLE_ORDER.forEach((id, i) => {
      const v = VEHICLES[id]
      const x = startX + i * (cardW + gap)
      const bg = this.add.graphics().setDepth(2)
      // Zelfde opbouw als in het spel: carrosserie-sprite + losse wielen,
      // geschaald van wereld-pixels naar kaart-pixels.
      const s = 120 / (v.chassisW * 1.35)
      const cx = x + cardW / 2, cy = y + 38
      const img = this.add.image(cx, cy, `hc_body_${id}`).setDepth(3)
      const aspect = img.width / img.height
      img.setDisplaySize(120, 120 / aspect).setOrigin(0.5, 0.62)
      const wy = cy + (v.chassisH / 2 + v.suspensionLength) * s
      const wd = v.wheelRadius * 2 * s
      const wheels = [-1, 1].map(k =>
        this.add.image(cx + k * v.wheelOffsetX * s, wy, `hc_wiel_${id}`).setDisplaySize(wd, wd).setDepth(4))
      const name = this.add.text(x + cardW / 2, y + 96, `${v.emoji} ${v.name}`, {
        fontSize: '16px', fontFamily: 'Arial Black', color: '#ffffff',
      }).setOrigin(0.5).setDepth(3).setShadow(0, 1, '#000', 2)
      const status = this.add.text(x + cardW / 2, y + 122, '', {
        fontSize: '14px', fontFamily: 'Arial Black', color: '#ffd23f',
      }).setOrigin(0.5).setDepth(3)
      const zone = this.add.zone(x + cardW / 2, y + cardH / 2, cardW, cardH).setInteractive({ useHandCursor: true }).setDepth(4)
      zone.on('pointerup', () => this._onVehicleClick(id))
      this._vehicleCards[id] = { bg, img, wheels, name, status, x, y, cardW, cardH }
    })
  }

  _onVehicleClick(id) {
    const unlocked = loadUnlockedVehicles()
    if (unlocked.includes(id)) {
      this.selected = id
      this._refreshAll()
      return
    }
    const cost = VEHICLES[id].cost
    if (spendCuruntie(cost)) {
      unlockVehicle(id)
      this.selected = id
    }
    this._refreshAll()
  }

  _refreshVehicleRow() {
    const unlocked = loadUnlockedVehicles()
    VEHICLE_ORDER.forEach(id => {
      const c = this._vehicleCards[id]
      const isUnlocked = unlocked.includes(id)
      const isSel = this.selected === id
      c.bg.clear()
      c.bg.fillStyle(0x000000, 0.3); c.bg.fillRoundedRect(c.x + 2, c.y + 3, c.cardW, c.cardH, 16)
      c.bg.fillStyle(isSel ? 0x2f6a2f : 0x22242c, isUnlocked ? 0.9 : 0.6); c.bg.fillRoundedRect(c.x, c.y, c.cardW, c.cardH, 16)
      c.bg.lineStyle(isSel ? 4 : 2, isSel ? 0x7ed957 : 0x8892a6, 0.9); c.bg.strokeRoundedRect(c.x, c.y, c.cardW, c.cardH, 16)
      c.img.setAlpha(isUnlocked ? 1 : 0.45)
      c.wheels.forEach(w => w.setAlpha(isUnlocked ? 1 : 0.45))
      c.status.setText(isUnlocked ? (isSel ? '✅ Geselecteerd' : 'Kies') : `🔒 ${VEHICLES[id].cost} kopen`)
      c.status.setColor(isUnlocked ? (isSel ? '#7ed957' : '#cfd6e6') : '#ffd23f')
    })
  }

  // ── Upgrades ─────────────────────────────────────────────────────
  _buildUpgradePanel() {
    const y = 310
    this.add.text(this.scale.width / 2, y - 12, '⬆ Upgrades', {
      fontSize: '18px', fontFamily: 'Arial Black', color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2)

    const keys = Object.keys(UPGRADE_TYPES)
    const cardW = 250, cardH = 84, gap = 16
    const totalW = keys.length * cardW + (keys.length - 1) * gap
    const startX = this.scale.width / 2 - totalW / 2

    this._upgradeCards = {}
    keys.forEach((key, i) => {
      const def = UPGRADE_TYPES[key]
      const x = startX + i * (cardW + gap)
      const bg = this.add.graphics().setDepth(2)
      const title = this.add.text(x + 14, y + 10, `${def.emoji} ${def.label}`, {
        fontSize: '15px', fontFamily: 'Arial Black', color: '#ffffff',
      }).setDepth(3)
      const dots = this.add.text(x + 14, y + 32, '', { fontSize: '14px', color: '#7ed957' }).setDepth(3)
      const btnZone = this.add.zone(x + cardW / 2, y + cardH - 20, cardW - 20, 28).setInteractive({ useHandCursor: true }).setDepth(4)
      const btnBg = this.add.graphics().setDepth(3)
      const btnTxt = this.add.text(x + cardW / 2, y + cardH - 20, '', {
        fontSize: '13px', fontFamily: 'Arial Black', color: '#ffffff',
      }).setOrigin(0.5).setDepth(4)
      btnZone.on('pointerup', () => this._onUpgradeClick(key))
      this._upgradeCards[key] = { bg, title, dots, btnBg, btnTxt, x, y, cardW, cardH }
    })
  }

  _onUpgradeClick(key) {
    const levels = loadUpgrades()[this.selected] || {}
    const lv = levels[key] || 0
    if (lv >= MAX_UPGRADE_LEVEL) return
    const cost = upgradeCost(lv + 1)
    if (spendCuruntie(cost)) saveUpgradeLevel(this.selected, key, lv + 1)
    this._refreshAll()
  }

  _refreshUpgradePanel() {
    const levels = loadUpgrades()[this.selected] || {}
    const cur = getCuruntie()
    Object.keys(UPGRADE_TYPES).forEach(key => {
      const c = this._upgradeCards[key]
      const lv = levels[key] || 0
      c.bg.clear()
      c.bg.fillStyle(0x000000, 0.3); c.bg.fillRoundedRect(c.x + 2, c.y + 3, c.cardW, c.cardH, 12)
      c.bg.fillStyle(0x22242c, 0.9); c.bg.fillRoundedRect(c.x, c.y, c.cardW, c.cardH, 12)
      c.bg.lineStyle(2, 0x8892a6, 0.8); c.bg.strokeRoundedRect(c.x, c.y, c.cardW, c.cardH, 12)
      c.dots.setText('●'.repeat(lv) + '○'.repeat(MAX_UPGRADE_LEVEL - lv))

      const maxed = lv >= MAX_UPGRADE_LEVEL
      const cost = maxed ? null : upgradeCost(lv + 1)
      const afford = !maxed && cur >= cost
      c.btnBg.clear()
      c.btnBg.fillStyle(maxed ? 0x2f6a2f : afford ? 0xb8742a : 0x3a3a3a, 1)
      c.btnBg.fillRoundedRect(c.x + 10, c.y + c.cardH - 34, c.cardW - 20, 28, 8)
      c.btnTxt.setText(maxed ? '✅ MAX' : `⬆ ${cost} 🪙`)
      c.btnTxt.setColor(maxed ? '#d7ffd7' : afford ? '#ffffff' : '#999999')
    })
  }

  // ── Levels ───────────────────────────────────────────────────────
  _buildLevelRow() {
    const y = 430, cardW = 190, cardH = 170, gap = 14
    const totalW = LEVEL_ORDER.length * cardW + (LEVEL_ORDER.length - 1) * gap
    const startX = this.scale.width / 2 - totalW / 2

    this.add.text(this.scale.width / 2, y - 14, '🗺 Kies een level', {
      fontSize: '18px', fontFamily: 'Arial Black', color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2)

    this._levelCards = {}
    LEVEL_ORDER.forEach((id, i) => {
      const lvl = LEVELS[id]
      const x = startX + i * (cardW + gap)
      const bg = this.add.graphics().setDepth(2)
      const img = this.add.image(x + cardW / 2, y + 60, `hc_card_${id}`).setDisplaySize(cardW - 16, 90).setDepth(3)
      const name = this.add.text(x + cardW / 2, y + 112, `${lvl.emoji} ${lvl.name}`, {
        fontSize: '14px', fontFamily: 'Arial Black', color: '#ffffff',
      }).setOrigin(0.5).setDepth(3).setShadow(0, 1, '#000', 2)
      const status = this.add.text(x + cardW / 2, y + 136, '', {
        fontSize: '12px', fontFamily: 'Arial', color: '#cfd6e6', wordWrap: { width: cardW - 20 }, align: 'center',
      }).setOrigin(0.5, 0).setDepth(3)
      const zone = this.add.zone(x + cardW / 2, y + cardH / 2, cardW, cardH).setInteractive({ useHandCursor: true }).setDepth(4)
      zone.on('pointerup', () => this._onLevelClick(id))
      this._levelCards[id] = { bg, img, name, status, x, y, cardW, cardH }
    })
  }

  _onLevelClick(id) {
    const progress = loadLevelProgress()
    if (!isLevelUnlocked(id, progress)) return
    this.scene.start('HCGame', { vehicleId: this.selected, levelId: id })
  }

  _refreshLevelRow() {
    const progress = loadLevelProgress()
    LEVEL_ORDER.forEach(id => {
      const c = this._levelCards[id]
      const lvl = LEVELS[id]
      const unlocked = isLevelUnlocked(id, progress)
      c.bg.clear()
      c.bg.fillStyle(0x000000, 0.3); c.bg.fillRoundedRect(c.x + 2, c.y + 3, c.cardW, c.cardH, 14)
      c.bg.fillStyle(0x22242c, unlocked ? 0.9 : 0.55); c.bg.fillRoundedRect(c.x, c.y, c.cardW, c.cardH, 14)
      c.bg.lineStyle(2, unlocked ? 0x8892a6 : 0x555555, 0.85); c.bg.strokeRoundedRect(c.x, c.y, c.cardW, c.cardH, 14)
      c.img.setAlpha(unlocked ? 1 : 0.35)
      const best = progress[id] || 0
      if (unlocked) {
        c.status.setText(best > 0 ? `Record: ${best} m` : 'Nog niet gespeeld')
        c.status.setColor('#7ed957')
      } else {
        const prev = LEVELS[LEVEL_ORDER[lvl.order - 1]]
        c.status.setText(`🔒 Haal ${prev.nextDistance} m in ${prev.name}`)
        c.status.setColor('#ff9999')
      }
    })
  }
}
