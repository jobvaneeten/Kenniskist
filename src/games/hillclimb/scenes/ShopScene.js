import Phaser from 'phaser'
import {
  VEHICLE_ORDER, VEHICLES, UPGRADE_TYPES, MAX_UPGRADE_LEVEL, upgradeCost,
  loadUnlockedVehicles, unlockVehicle, loadUpgrades, saveUpgradeLevel,
  loadSelectedVehicle, saveSelectedVehicle,
} from '../data/VehicleData.js'
import {
  COL, drawBackdrop, drawPanel, makeBackButton, makeCuruntieChip,
  addVehiclePreview, getCuruntie, spendCuruntie, naarScene, blokkeerDoorklik,
} from '../ui.js'

const COLS = 5, GAP = 12
const CARD_W = 212, CARD_H = 150

export default class ShopScene extends Phaser.Scene {
  constructor() { super('HCShop') }

  create() {
    const W = this.scale.width
    blokkeerDoorklik(this)
    drawBackdrop(this, 0.55)
    makeBackButton(this, () => naarScene(this, 'HCHome'))
    this.chip = makeCuruntieChip(this)

    this.add.text(W / 2, 36, '🛒 Shop', {
      fontSize: '30px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5).setDepth(5).setShadow(0, 3, '#000', 6)

    this.gekozen = loadSelectedVehicle()
    this._dynamisch = []   // objecten die bij elke refresh opnieuw getekend worden
    this._buildAll()
  }

  _wis() {
    this._dynamisch.forEach(o => o.destroy())
    this._dynamisch = []
  }

  _buildAll() {
    this._wis()
    const W = this.scale.width
    const unlocked = loadUnlockedVehicles()
    const cur = getCuruntie()
    const startX = W / 2 - (COLS * CARD_W + (COLS - 1) * GAP) / 2

    // ── Auto-kaarten (koop / kies voor upgrades) ─────────────────────
    VEHICLE_ORDER.forEach((id, i) => {
      const v = VEHICLES[id]
      const col = i % COLS, row = Math.floor(i / COLS)
      const x = startX + col * (CARD_W + GAP)
      const y = 64 + row * (CARD_H + GAP)
      const heeft = unlocked.includes(id)
      const actief = this.gekozen === id

      const g = this.add.graphics().setDepth(2)
      drawPanel(g, x, y, CARD_W, CARD_H, {
        border: actief ? COL.randActief : heeft ? COL.rand : 0x3a4152,
        borderW: actief ? 3 : 2,
      })
      this._dynamisch.push(g)

      const preview = addVehiclePreview(this, id, x + CARD_W / 2 - 34, y + 62, 108, 78)
      this._dynamisch.push(...preview)

      const naam = this.add.text(x + 12, y + 12, `${v.emoji} ${v.name}`, {
        fontSize: '14px', fontFamily: 'Arial Black', color: '#ffffff',
      }).setDepth(5).setShadow(0, 2, '#000', 3)
      this._dynamisch.push(naam)

      // koop-/status-knop rechts
      const bx = x + CARD_W - 52, by = y + 84
      if (heeft) {
        const lbl = this.add.text(bx, by, actief ? '✅\ngekozen' : '🔧\nkies', {
          fontSize: '13px', fontFamily: 'Arial Black', color: actief ? '#7ed957' : '#cfd6e6', align: 'center',
        }).setOrigin(0.5).setDepth(5)
        this._dynamisch.push(lbl)
      } else {
        preview.forEach(p => p.setAlpha(0.6))
        const kan = cur >= v.cost
        const bg = this.add.graphics().setDepth(5)
        bg.fillStyle(kan ? 0xd9832a : 0x3a3f4d, 1)
        bg.fillRoundedRect(bx - 42, by - 16, 84, 32, 10)
        bg.lineStyle(1.5, kan ? 0xffd9a0 : 0x555c6c, 0.8)
        bg.strokeRoundedRect(bx - 42, by - 16, 84, 32, 10)
        const lbl = this.add.text(bx, by, `🪙 ${v.cost}`, {
          fontSize: '14px', fontFamily: 'Arial Black', color: kan ? '#ffffff' : '#8a92a3',
        }).setOrigin(0.5).setDepth(6)
        this._dynamisch.push(bg, lbl)
      }

      const zone = this.add.zone(x + CARD_W / 2, y + CARD_H / 2, CARD_W, CARD_H)
        .setInteractive({ useHandCursor: true }).setDepth(8)
      zone.on('pointerup', () => this._klikAuto(id))
      this._dynamisch.push(zone)
    })

    // ── Upgrade-paneel voor de gekozen auto ──────────────────────────
    const gv = VEHICLES[this.gekozen]
    const upY = 64 + 2 * (CARD_H + GAP) + 10
    const titel = this.add.text(W / 2, upY, `⬆ Upgrades voor ${gv.emoji} ${gv.name}`, {
      fontSize: '18px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5).setDepth(5).setShadow(0, 2, '#000', 4)
    this._dynamisch.push(titel)

    const keys = Object.keys(UPGRADE_TYPES)
    const uW = 258, uH = 92, uGap = 14
    const uStartX = W / 2 - (keys.length * uW + (keys.length - 1) * uGap) / 2
    const levels = loadUpgrades()[this.gekozen] || {}

    keys.forEach((key, i) => {
      const def = UPGRADE_TYPES[key]
      const x = uStartX + i * (uW + uGap)
      const y = upY + 16
      const lv = levels[key] || 0
      const maxed = lv >= MAX_UPGRADE_LEVEL
      const kosten = maxed ? null : upgradeCost(lv + 1)
      const kan = !maxed && cur >= kosten

      const g = this.add.graphics().setDepth(2)
      drawPanel(g, x, y, uW, uH, { radius: 12 })
      this._dynamisch.push(g)

      const naam = this.add.text(x + 14, y + 12, `${def.emoji} ${def.label}`, {
        fontSize: '15px', fontFamily: 'Arial Black', color: '#ffffff',
      }).setDepth(5)
      const dots = this.add.text(x + 14, y + 36, '●'.repeat(lv) + '○'.repeat(MAX_UPGRADE_LEVEL - lv), {
        fontSize: '15px', color: '#7ed957',
      }).setDepth(5)
      this._dynamisch.push(naam, dots)

      const bg = this.add.graphics().setDepth(5)
      bg.fillStyle(maxed ? 0x2f6a2f : kan ? 0xd9832a : 0x3a3f4d, 1)
      bg.fillRoundedRect(x + 10, y + uH - 34, uW - 20, 26, 9)
      const lbl = this.add.text(x + uW / 2, y + uH - 21, maxed ? '✅ MAX' : `⬆ Upgrade  🪙 ${kosten}`, {
        fontSize: '13px', fontFamily: 'Arial Black', color: maxed ? '#d7ffd7' : kan ? '#ffffff' : '#8a92a3',
      }).setOrigin(0.5).setDepth(6)
      this._dynamisch.push(bg, lbl)

      const zone = this.add.zone(x + uW / 2, y + uH - 21, uW - 20, 26)
        .setInteractive({ useHandCursor: true }).setDepth(8)
      zone.on('pointerup', () => this._klikUpgrade(key))
      this._dynamisch.push(zone)
    })
  }

  // Elke klik bouwt het hele scherm opnieuw op, inclusief de knop waar je net
  // op drukte. Zonder korte pauze kan dezelfde klik op de nieuwe knop landen en
  // koop je twee keer.
  _magKlikken() {
    const nu = this.time.now
    if (this._laatsteKlik && nu - this._laatsteKlik < 260) return false
    this._laatsteKlik = nu
    return true
  }

  _klikAuto(id) {
    if (!this._magKlikken()) return
    const unlocked = loadUnlockedVehicles()
    if (unlocked.includes(id)) {
      this.gekozen = id
      saveSelectedVehicle(id)
    } else if (spendCuruntie(VEHICLES[id].cost)) {
      unlockVehicle(id)
      this.gekozen = id
      saveSelectedVehicle(id)
      this.cameras.main.flash(180, 255, 210, 63)
    } else {
      this.cameras.main.shake(120, 0.004)
      return
    }
    this.chip.refresh()
    this._buildAll()
  }

  _klikUpgrade(key) {
    if (!this._magKlikken()) return
    const levels = loadUpgrades()[this.gekozen] || {}
    const lv = levels[key] || 0
    if (lv >= MAX_UPGRADE_LEVEL) return
    if (spendCuruntie(upgradeCost(lv + 1))) {
      saveUpgradeLevel(this.gekozen, key, lv + 1)
      this.cameras.main.flash(140, 126, 217, 87)
    } else {
      this.cameras.main.shake(120, 0.004)
    }
    this.chip.refresh()
    this._buildAll()
  }
}
