import Phaser from 'phaser'
import {
  VEHICLE_ORDER, VEHICLES, UPGRADE_TYPES, MAX_UPGRADE_LEVEL, upgradeCost,
  loadUnlockedVehicles, unlockVehicle, loadUpgrades, saveUpgradeLevel,
  loadSelectedVehicle, saveSelectedVehicle,
} from '../data/VehicleData.js'
import {
  COL, drawBackdrop, drawPanel, drawCoin, makeBackButton, makeCuruntieChip, makeArrow, drawDots,
  addVehiclePreview, getCuruntie, spendCuruntie, naarScene, blokkeerDoorklik, kop, tekst,
} from '../ui.js'

const COLS = 5, ROWS = 2, PER_PAGE = COLS * ROWS, GAP = 12
const CARD_W = 196, CARD_H = 146

// kleur per upgrade-soort
const UP_KLEUR = { motor: COL.groenNeon, vering: COL.violetLicht, banden: COL.cyaan, tank: COL.oranje }

export default class ShopScene extends Phaser.Scene {
  constructor() { super('HCShop') }

  create() {
    const W = this.scale.width
    blokkeerDoorklik(this)
    drawBackdrop(this, 0.6)
    makeBackButton(this, () => naarScene(this, 'HCHome'))
    this.chip = makeCuruntieChip(this)

    this.add.text(W / 2, 36, 'GARAGE & SHOP', kop(32, '#ffffff', { letterSpacing: 3 }))
      .setOrigin(0.5).setDepth(5).setShadow(0, 0, '#ff2f8e', 18, false, true)

    this.gekozen = loadSelectedVehicle()
    this.pagina = Math.floor(VEHICLE_ORDER.indexOf(this.gekozen) / PER_PAGE)
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
    const paginas = Math.ceil(VEHICLE_ORDER.length / PER_PAGE)
    const startX = W / 2 - (COLS * CARD_W + (COLS - 1) * GAP) / 2

    // ── Auto-kaarten (koop / kies voor upgrades) ─────────────────────
    VEHICLE_ORDER.slice(this.pagina * PER_PAGE, (this.pagina + 1) * PER_PAGE).forEach((id, i) => {
      const v = VEHICLES[id]
      const col = i % COLS, row = Math.floor(i / COLS)
      const x = startX + col * (CARD_W + GAP)
      const y = 112 + row * (CARD_H + GAP)
      const heeft = unlocked.includes(id)
      const actief = this.gekozen === id
      const kan = !heeft && cur >= v.cost

      const g = this.add.graphics().setDepth(2)
      drawPanel(g, x, y, CARD_W, CARD_H, {
        border: actief ? COL.goud : kan ? COL.roze : heeft ? COL.rand : 0x2a2550,
        borderW: actief ? 2.5 : 1.5, glow: actief || kan,
      })
      this._dynamisch.push(g)

      const preview = addVehiclePreview(this, id, x + CARD_W / 2 - 30, y + 74, 104, 76)
      this._dynamisch.push(...preview)

      const naam = this.add.text(x + 12, y + 10, v.name.toUpperCase(), kop(14, '#ffffff', { letterSpacing: 1 })).setDepth(5)
      this._dynamisch.push(naam)

      // koop-/status-knop rechts
      const bx = x + CARD_W - 40, by = y + 86
      const bg = this.add.graphics().setDepth(5)
      this._dynamisch.push(bg)
      if (heeft) {
        const lbl = this.add.text(bx, by, actief ? 'GEKOZEN' : 'KIES', kop(13, actief ? COL.goudHex : '#cfc8f5')).setOrigin(0.5).setDepth(6)
        if (actief) { bg.lineStyle(2, COL.goud, 0.9); bg.strokeRoundedRect(bx - 34, by - 14, 68, 28, 14) }
        else { bg.lineStyle(1.5, COL.violetLicht, 0.6); bg.strokeRoundedRect(bx - 28, by - 14, 56, 28, 14) }
        this._dynamisch.push(lbl)
      } else {
        preview.forEach(p => p.setAlpha(0.55))
        if (kan) { bg.lineStyle(8, COL.roze, 0.15); bg.strokeRoundedRect(bx - 38, by - 17, 76, 34, 17) }
        bg.fillStyle(kan ? COL.roze : 0x2a2550, kan ? 1 : 0.9); bg.fillRoundedRect(bx - 36, by - 15, 72, 30, 15)
        drawCoin(bg, bx - 20, by, 7)
        const lbl = this.add.text(bx - 9, by, String(v.cost), kop(14, kan ? '#ffffff' : '#7d76a8')).setOrigin(0, 0.5).setDepth(6)
        this._dynamisch.push(lbl)
      }

      const zone = this.add.zone(x + CARD_W / 2, y + CARD_H / 2, CARD_W, CARD_H)
        .setInteractive({ useHandCursor: true }).setDepth(8)
      zone.on('pointerup', () => this._klikAuto(id))
      this._dynamisch.push(zone)
    })

    const pijlY = 112 + CARD_H + GAP / 2
    if (this.pagina > 0) this._dynamisch.push(...makeArrow(this, 30, pijlY, -1, () => this._blader(-1)))
    if (this.pagina < paginas - 1) this._dynamisch.push(...makeArrow(this, W - 30, pijlY, 1, () => this._blader(1)))

    // ── Upgrade-paneel voor de gekozen auto ──────────────────────────
    const gv = VEHICLES[this.gekozen]
    const upY = 112 + 2 * (CARD_H + GAP) + 4
    this._dynamisch.push(drawDots(this, W / 2, 96, paginas, this.pagina))
    const titel = this.add.text(W / 2, upY + 14, `UPGRADES VOOR DE ${gv.name.toUpperCase()}`, kop(18, '#ffffff', { letterSpacing: 2 }))
      .setOrigin(0.5).setDepth(5)
    this._dynamisch.push(titel)

    const keys = Object.keys(UPGRADE_TYPES)
    const uW = 258, uH = 92, uGap = 14
    const uStartX = W / 2 - (keys.length * uW + (keys.length - 1) * uGap) / 2
    const levels = loadUpgrades()[this.gekozen] || {}

    keys.forEach((key, i) => {
      const def = UPGRADE_TYPES[key]
      const kleur = UP_KLEUR[key]
      const x = uStartX + i * (uW + uGap)
      const y = upY + 32
      const lv = levels[key] || 0
      const maxed = lv >= MAX_UPGRADE_LEVEL
      const kosten = maxed ? null : upgradeCost(lv + 1)
      const kan = !maxed && cur >= kosten

      const g = this.add.graphics().setDepth(2)
      drawPanel(g, x, y, uW, uH, { radius: 14, border: kleur, borderAlpha: 0.5 })
      this._dynamisch.push(g)

      const naam = this.add.text(x + 14, y + 8, def.label.toUpperCase(), kop(16, '#ffffff', { letterSpacing: 1 })).setDepth(5)
      const uitleg = this.add.text(x + 14, y + 30, def.desc, tekst(11)).setDepth(5)
      this._dynamisch.push(naam, uitleg)
      // niveau-blokjes
      for (let n = 0; n < MAX_UPGRADE_LEVEL; n++) {
        const bx = x + uW - 14 - (MAX_UPGRADE_LEVEL - n) * 16
        if (n < lv) { g.fillStyle(kleur, 0.25); g.fillRoundedRect(bx - 1, y + 11, 14, 14, 4) }
        g.fillStyle(n < lv ? kleur : 0x2a2550, 1); g.fillRoundedRect(bx + 1, y + 13, 10, 10, 3)
      }

      const bg = this.add.graphics().setDepth(5)
      bg.fillStyle(maxed ? 0x1c4a32 : kan ? kleur : 0x2a2550, 1)
      bg.fillRoundedRect(x + 10, y + uH - 36, uW - 20, 28, 14)
      if (kan) { bg.lineStyle(6, kleur, 0.18); bg.strokeRoundedRect(x + 8, y + uH - 38, uW - 16, 32, 16) }
      this._dynamisch.push(bg)
      if (maxed) {
        const lbl = this.add.text(x + uW / 2, y + uH - 22, 'MAXIMAAL', kop(14, COL.groenHex, { letterSpacing: 2 })).setOrigin(0.5).setDepth(6)
        this._dynamisch.push(lbl)
      } else {
        const kl = kan ? '#120a26' : '#7d76a8', cy = y + uH - 22
        const lbl = this.add.text(x + uW / 2 - 14, cy, 'UPGRADE', kop(14, kl, { letterSpacing: 1 })).setOrigin(1, 0.5).setDepth(6)
        drawCoin(bg, x + uW / 2 + 6, cy, 6)
        const prijs = this.add.text(x + uW / 2 + 18, cy, String(kosten), kop(14, kl)).setOrigin(0, 0.5).setDepth(6)
        this._dynamisch.push(lbl, prijs)
      }

      const zone = this.add.zone(x + uW / 2, y + uH - 22, uW - 20, 28)
        .setInteractive({ useHandCursor: true }).setDepth(8)
      zone.on('pointerup', () => this._klikUpgrade(key))
      this._dynamisch.push(zone)
    })
  }

  _blader(d) {
    if (!this._magKlikken()) return
    this.pagina += d
    this._buildAll()
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
      this.cameras.main.flash(180, 255, 47, 142)
      this._feest()
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
      this.cameras.main.flash(140, 74, 222, 128)
    } else {
      this.cameras.main.shake(120, 0.004)
    }
    this.chip.refresh()
    this._buildAll()
  }

  // confetti-burst bij een nieuwe auto
  _feest() {
    const W = this.scale.width, H = this.scale.height
    const e = this.add.particles(W / 2, H * 0.4, 'hc_spark', {
      speed: { min: 200, max: 520 }, angle: { min: 0, max: 360 }, gravityY: 500,
      scale: { start: 0.6, end: 0 }, lifespan: { min: 700, max: 1300 },
      tint: [COL.goud, COL.roze, COL.cyaan, COL.groenNeon, COL.violetLicht], blendMode: 'ADD', emitting: false,
    }).setDepth(50)
    e.explode(90)
    this.time.delayedCall(1500, () => e.destroy())
  }
}
