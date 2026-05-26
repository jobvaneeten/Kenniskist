import Phaser from 'phaser'
import { TOWERS, TOWER_ORDER } from '../data/TowerData.js'
import { MAPS, MAP_ROWS, TILE_SIZE, HUD_HEIGHT } from '../data/MapData.js'
export default class UIScene extends Phaser.Scene {
  constructor() { super('UI') }

  init(data) {
    this.mapId = data.mapId || 1
    this._gold  = 0
    this._lives = 20
    this._wave  = 0
    this._selectedKey = null
    this._panelVisible = false
  }

  create() {
    const W   = this.scale.width
    const mapH = MAP_ROWS * TILE_SIZE
    const hudY = mapH
    const hudH = HUD_HEIGHT

    // ── HUD background ─────────────────────────────────────────────
    const hudBg = this.add.graphics()
    hudBg.fillGradientStyle(0x0a2006, 0x0a2006, 0x0d3008, 0x0d3008, 1)
    hudBg.fillRect(0, hudY, W, hudH)
    hudBg.lineStyle(2, 0x33aa33, 0.8)
    hudBg.lineBetween(0, hudY, W, hudY)

    // ── Stats bar ─────────────────────────────────────────────────
    // Gold
    this.add.text(16, hudY + 8, '🪙', { fontSize: '22px' })
    this.goldText = this.add.text(46, hudY + 10, '0', {
      fontSize: '20px', fontFamily: 'Arial Black', color: '#FFD700',
    })

    // Lives
    this.add.text(140, hudY + 8, '❤️', { fontSize: '22px' })
    this.livesText = this.add.text(168, hudY + 10, '20', {
      fontSize: '20px', fontFamily: 'Arial Black', color: '#FF6666',
    })

    // Wave
    this.add.text(250, hudY + 8, '🌊', { fontSize: '22px' })
    this.waveText = this.add.text(278, hudY + 10, '0 / 15', {
      fontSize: '20px', fontFamily: 'Arial Black', color: '#88CCFF',
    })

    // Pause / menu buttons
    this._makeHudBtn(W - 100, hudY + 22, '⏸ Pauze', 0x334433, () => {
      this.events.emit('pause_toggle')
    })
    this._makeHudBtn(W - 210, hudY + 22, '← Menu', 0x333333, () => {
      this.events.emit('back_menu')
    })

    // ── Tower shop bar ────────────────────────────────────────────
    this.towerBtns = {}
    const btnW = 72, btnH = 56, shopStartX = 380, shopY = hudY + hudH / 2

    TOWER_ORDER.forEach((key, i) => {
      const td  = TOWERS[key]
      const bx  = shopStartX + i * (btnW + 6)

      // Button bg
      const btn = this.add.graphics()
      const drawBtn = (active, affordable) => {
        btn.clear()
        const col = active ? 0x338833 : affordable ? 0x224422 : 0x221122
        btn.fillStyle(col, 1)
        btn.fillRoundedRect(bx - btnW/2, shopY - btnH/2, btnW, btnH, 8)
        btn.lineStyle(2, active ? 0x88ff88 : affordable ? 0x446644 : 0x443333)
        btn.strokeRoundedRect(bx - btnW/2, shopY - btnH/2, btnW, btnH, 8)
      }
      drawBtn(false, true)

      // Animal image
      const img = this.add.image(bx, shopY - 8, key).setDisplaySize(36, 36)
      const baseScale = img.scaleX

      // Cost text
      const costTxt = this.add.text(bx, shopY + 22, `🪙${td.cost}`, {
        fontSize: '12px', fontFamily: 'Arial', color: '#FFD700',
      }).setOrigin(0.5)

      // Tooltip on hover
      const zone = this.add.zone(bx, shopY, btnW, btnH).setInteractive({ useHandCursor: true })

      const tooltip = this.add.container(bx, shopY - 70).setDepth(30).setVisible(false)
      const ttBg = this.add.graphics()
      ttBg.fillStyle(0x001100, 0.95)
      ttBg.fillRoundedRect(-100, -32, 200, 64, 8)
      ttBg.lineStyle(1, 0x44ff44, 0.6)
      ttBg.strokeRoundedRect(-100, -32, 200, 64, 8)
      const ttName = this.add.text(0, -20, `${td.emoji} ${td.name}`, {
        fontSize: '15px', fontFamily: 'Arial Black', color: '#ffffff',
      }).setOrigin(0.5)
      const ttDesc = this.add.text(0, 4, td.description, {
        fontSize: '10px', fontFamily: 'Arial', color: '#aaffaa',
        wordWrap: { width: 186 }, align: 'center',
      }).setOrigin(0.5)
      tooltip.add([ttBg, ttName, ttDesc])

      zone.on('pointerover', () => {
        tooltip.setVisible(true)
        this.tweens.add({ targets: img, scaleX: baseScale * 1.2, scaleY: baseScale * 1.2, duration: 100 })
      })
      zone.on('pointerout', () => {
        tooltip.setVisible(false)
        this.tweens.add({ targets: img, scaleX: baseScale, scaleY: baseScale, duration: 100 })
      })
      zone.on('pointerdown', () => {
        if (this._gold < td.cost) {
          this._shakeGold(); return
        }
        // Toggle
        if (this._selectedKey === key) {
          this._selectedKey = null
          this.events.emit('tower_selected', null)
        } else {
          this._selectedKey = key
          this.events.emit('tower_selected', key)
        }
        this._refreshShop()
      })

      this.towerBtns[key] = { btn, drawBtn, img, costTxt, zone }
    })

    // ── Next wave button ──────────────────────────────────────────
    this.nextWaveBtn = this._makeHudBtn(W / 2, hudY + 22, '▶▶ Volgende golf', 0x226622, () => {
      this.events.emit('next_wave')
    })

    // ── Tower info panel (upgrade/sell) ───────────────────────────
    this._buildTowerPanel()

    // ── Notifications ─────────────────────────────────────────────
    this.notifText = this.add.text(W / 2, mapH - 30, '', {
      fontSize: '20px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(50).setAlpha(0)

    // ── Events from GameScene ─────────────────────────────────────
    this.events.on('update_gold',  v => this._setGold(v))
    this.events.on('update_lives', v => this._setLives(v))
    this.events.on('update_wave',  v => this._setWave(v))
    this.events.on('not_enough_gold', () => this._shakeGold())
    this.events.on('tower_panel_show', d => this._showTowerPanel(d))
    this.events.on('tower_panel_hide', () => this._hideTowerPanel())
    this.events.on('wave_complete', () => this._showNotif('✅ Golf voorbij! +goud bonus!', 0x44FF44))
    this.events.on('show_bonus',    v  => this._showNotif(`+${v} 🪙 golf bonus!`, 0xFFD700))
    this.events.on('game_over',     d  => this._showGameOver(d))
    this.events.on('victory',       d  => this._showVictory(d))
  }

  // ── Tower panel ────────────────────────────────────────────────────
  _buildTowerPanel() {
    const W = this.scale.width
    const pw = 220, ph = 160
    const px = W / 2, py = MAP_ROWS * TILE_SIZE - ph / 2 - 10

    this.towerPanel = this.add.container(px, py).setDepth(40).setVisible(false)

    const bg = this.add.graphics()
    bg.fillStyle(0x001800, 0.95)
    bg.fillRoundedRect(-pw/2, -ph/2, pw, ph, 12)
    bg.lineStyle(2, 0x44ff44, 0.8)
    bg.strokeRoundedRect(-pw/2, -ph/2, pw, ph, 12)

    this.panelName = this.add.text(0, -ph/2 + 18, '', {
      fontSize: '17px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5)
    this.panelLevel = this.add.text(0, -ph/2 + 40, '', {
      fontSize: '13px', fontFamily: 'Arial', color: '#aaffaa',
    }).setOrigin(0.5)

    this.upgradeBtn = this._makePanelBtn(0, -ph/2 + 78, 160, 34, '⬆ Upgraden', 0x225522, () => {
      this.events.emit('upgrade_tower')
    })
    this.sellBtn = this._makePanelBtn(0, -ph/2 + 118, 160, 34, '💰 Verkopen', 0x553322, () => {
      this.events.emit('sell_tower')
    })
    const closeBtn = this._makePanelBtn(pw/2 - 14, -ph/2 + 14, 22, 22, '✕', 0x333333, () => {
      this.events.emit('close_panel')
    })

    this.towerPanel.add([bg, this.panelName, this.panelLevel,
      ...this.upgradeBtn.items, ...this.sellBtn.items, ...closeBtn.items])
  }

  _makePanelBtn(x, y, w, h, label, color, cb) {
    const g = this.add.graphics()
    const drawG = (c) => {
      g.clear(); g.fillStyle(c, 1)
      g.fillRoundedRect(x-w/2, y-h/2, w, h, 6)
      g.lineStyle(1, 0xffffff, 0.3)
      g.strokeRoundedRect(x-w/2, y-h/2, w, h, 6)
    }
    drawG(color)
    const t = this.add.text(x, y, label, {
      fontSize: '13px', fontFamily: 'Arial Black', color: '#fff',
    }).setOrigin(0.5)
    const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true })
    z.on('pointerover',  () => drawG(Phaser.Display.Color.ValueToColor(color).brighten(30).color))
    z.on('pointerout',   () => drawG(color))
    z.on('pointerup',    cb)
    return { items: [g, t, z], gfx: g, txt: t }
  }

  _showTowerPanel(data) {
    this.towerPanel.setVisible(true)
    this.panelName.setText(`${data.tower.emoji} ${data.tower.name}  Lv.${data.level}`)
    this.panelLevel.setText(data.tower.description)
    const uc = data.upgradeCost
    this.upgradeBtn.txt.setText(uc ? `⬆ Upgrade  🪙${uc}` : '✅ Max level')
    this.sellBtn.txt.setText(`💰 Verkopen  🪙${data.sellValue}`)
    this.tweens.add({ targets: this.towerPanel, scale: { from: 0.8, to: 1 }, duration: 150, ease: 'Back.Out' })
  }

  _hideTowerPanel() {
    this.towerPanel.setVisible(false)
  }

  // ── Helpers ───────────────────────────────────────────────────────
  _setGold(v) {
    this._gold = v
    this.goldText.setText(String(v))
    this._refreshShop()
  }

  _setLives(v) {
    this._lives = v
    this.livesText.setText(String(v))
    if (v <= 5) this.livesText.setColor('#FF2222')
    else if (v <= 10) this.livesText.setColor('#FF9900')
  }

  _setWave(v) {
    this._wave = v
    this.waveText.setText(`${v} / 15`)
    if (v >= 15) {
      this.nextWaveBtn?.zone?.disableInteractive()
      this.nextWaveBtn?.txt?.setAlpha(0.4)
    }
  }

  _refreshShop() {
    TOWER_ORDER.forEach(key => {
      const b = this.towerBtns[key]
      if (!b) return
      const affordable = this._gold >= TOWERS[key].cost
      const active     = this._selectedKey === key
      b.drawBtn(active, affordable)
      b.costTxt.setColor(affordable ? '#FFD700' : '#994444')
    })
  }

  _shakeGold() {
    this.tweens.add({
      targets: this.goldText,
      x: { from: this.goldText.x - 6, to: this.goldText.x + 6 },
      duration: 60, yoyo: true, repeat: 3,
      onComplete: () => this.goldText.setX(46),
    })
    this.goldText.setColor('#FF4444')
    this.time.delayedCall(400, () => this.goldText.setColor('#FFD700'))
  }

  _makeHudBtn(x, y, label, color, cb) {
    const W = this.scale.width
    const w = label.length * 9 + 20, h = 32
    const g = this.add.graphics()
    g.fillStyle(color, 1)
    g.fillRoundedRect(x - w/2, y - h/2, w, h, 8)
    g.lineStyle(1, 0x88ff88, 0.5)
    g.strokeRoundedRect(x - w/2, y - h/2, w, h, 8)
    const t = this.add.text(x, y, label, {
      fontSize: '14px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5)
    const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true })
    z.on('pointerup', cb)
    z.on('pointerover',  () => { g.alpha = 0.7 })
    z.on('pointerout',   () => { g.alpha = 1 })
    return { zone: z, txt: t, gfx: g }
  }

  _showNotif(msg, color) {
    this.notifText.setText(msg).setColor(Phaser.Display.Color.IntegerToColor(color).rgba)
    this.tweens.killTweensOf(this.notifText)
    this.tweens.add({
      targets: this.notifText,
      alpha:   { from: 1, to: 0 },
      y:       { from: MAP_ROWS * TILE_SIZE - 30, to: MAP_ROWS * TILE_SIZE - 80 },
      duration: 2200, ease: 'Cubic.Out',
    })
  }

  _showGameOver(data) {
    this._showOverlay('💀 GAME OVER', `Je haalde golf ${data.wave} van de 15`, 0x880000, '#ff4444')
  }

  _showVictory(data) {
    this._showOverlay('🏆 GEWONNEN!', `Je hebt alle 15 golven overleefd!`, 0x006600, '#44ff44')
  }

  _showOverlay(title, sub, bgColor, titleColor) {
    const W = this.scale.width, H = this.scale.height
    const ow = 480, oh = 280

    const overlay = this.add.graphics().setDepth(60)
    overlay.fillStyle(0x000000, 0.7)
    overlay.fillRect(0, 0, W, H)
    overlay.fillStyle(bgColor, 0.95)
    overlay.fillRoundedRect(W/2 - ow/2, H/2 - oh/2, ow, oh, 20)
    overlay.lineStyle(3, 0x88ff88, 0.8)
    overlay.strokeRoundedRect(W/2 - ow/2, H/2 - oh/2, ow, oh, 20)

    this.add.text(W/2, H/2 - 80, title, {
      fontSize: '46px', fontFamily: 'Arial Black',
      color: titleColor, stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(61)

    this.add.text(W/2, H/2 - 20, sub, {
      fontSize: '20px', fontFamily: 'Arial', color: '#ffffff',
    }).setOrigin(0.5).setDepth(61)

    this._makeOverlayBtn(W/2 - 90, H/2 + 60, '🔄 Opnieuw', 0x226622, () => {
      this.scene.stop('UI')
      this.scene.start('Game', { mapId: this.mapId })
    })
    this._makeOverlayBtn(W/2 + 90, H/2 + 60, '🗺 Levels', 0x224488, () => {
      this.scene.stop('UI')
      this.scene.start('Menu')
    })
  }

  _makeOverlayBtn(x, y, label, color, cb) {
    const w = 160, h = 44
    const g = this.add.graphics().setDepth(62)
    g.fillStyle(color, 1)
    g.fillRoundedRect(x - w/2, y - h/2, w, h, 10)
    g.lineStyle(2, 0xffffff, 0.5)
    g.strokeRoundedRect(x - w/2, y - h/2, w, h, 10)
    const t = this.add.text(x, y, label, {
      fontSize: '17px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5).setDepth(63)
    const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(64)
    z.on('pointerup', cb)
    z.on('pointerover',  () => { g.alpha = 0.75; this.tweens.add({ targets: t, scale: 1.08, duration: 80 }) })
    z.on('pointerout',   () => { g.alpha = 1;    this.tweens.add({ targets: t, scale: 1,    duration: 80 }) })
  }
}
