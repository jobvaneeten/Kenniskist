import Phaser from 'phaser'
import { TOWERS, TOWER_ORDER } from '../data/TowerData.js'
import { MAP_COLS, MAP_ROWS, TILE_SIZE, PANEL_WIDTH } from '../data/MapData.js'

const PX = MAP_COLS * TILE_SIZE   // panel starts here (1536)
const PW = PANEL_WIDTH            // 256
const CH = MAP_ROWS * TILE_SIZE   // canvas height (960)

export default class UIScene extends Phaser.Scene {
  constructor() { super('UI') }

  init(data) {
    this.mapId        = data.mapId || 1
    this._gold        = 0
    this._lives       = 20
    this._wave        = 0
    this._selectedKey = null
    this._panelTower  = null
    this._currentSpeed = 1
  }

  create() {
    // ── Panel background ──────────────────────────────────────────
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x071a04, 0x071a04, 0x0d2b08, 0x0d2b08, 1)
    bg.fillRect(PX, 0, PW, CH)
    bg.lineStyle(2, 0x2a6a1a, 1)
    bg.lineBetween(PX, 0, PX, CH)

    const drawSep = (y) => {
      bg.lineStyle(1, 0x1e5010, 0.6)
      bg.lineBetween(PX + 8, y, PX + PW - 8, y)
    }

    // ── Row 1: Menu + Pause (y=0-42) ─────────────────────────────
    this._menuBtn  = this._btn(PX + 60,  21, 100, 34, '← Menu',   0x1a1a2e, () => this.events.emit('back_menu'))
    this._pauseBtn = this._btn(PX + 196, 21,  96, 34, '⏸ Pauze', 0x1a3310, () => this.events.emit('pause_toggle'))
    drawSep(42)

    // ── Row 2: Speed buttons (y=42-76) ───────────────────────────
    this.add.text(PX + 8, 53, 'SNELHEID', {
      fontSize: '10px', fontFamily: 'Arial Black', color: '#447744',
    })
    const speedBtnW = 62, speedBtnH = 26
    const speedY    = 59
    this._speed1Btn = this._btn(PX + 56,  speedY, speedBtnW, speedBtnH, '1×', 0x162816, () => this._setSpeed(1))
    this._speed2Btn = this._btn(PX + 128, speedY, speedBtnW, speedBtnH, '2×', 0x162816, () => this._setSpeed(2))
    this._speed3Btn = this._btn(PX + 200, speedY, speedBtnW, speedBtnH, '3×', 0x162816, () => this._setSpeed(3))
    this._refreshSpeedBtns()
    drawSep(76)

    // ── Row 3: Gold + Lives (y=76-112) ───────────────────────────
    this.add.text(PX + 10, 84, '🪙', { fontSize: '22px' })
    this.goldText = this.add.text(PX + 36, 86, '0', {
      fontSize: '20px', fontFamily: 'Arial Black', color: '#FFD700',
    })

    this.add.text(PX + 142, 84, '❤️', { fontSize: '22px' })
    this.livesText = this.add.text(PX + 168, 86, '20', {
      fontSize: '20px', fontFamily: 'Arial Black', color: '#FF6666',
    })
    drawSep(112)

    // ── Row 4: Wave (y=112-144) ───────────────────────────────────
    this.add.text(PX + 10, 118, '🌊', { fontSize: '20px' })
    this.waveText = this.add.text(PX + 36, 120, 'Golf: 0 / 15', {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#88CCFF',
    })
    drawSep(144)

    // ── Row 5: Tower shop label ───────────────────────────────────
    this.add.text(PX + PW / 2, 156, 'KIES TOREN', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#55bb55',
      stroke: '#0d2b08', strokeThickness: 2,
    }).setOrigin(0.5)

    // ── Tower grid (y=168-168+4*68=440): 3 cols × 4 rows ─────────
    this.towerBtns = {}
    const COLS   = 3
    const CELL_W = Math.floor((PW - 12) / COLS)   // ~81
    const CELL_H = 68
    const GRID_Y = 168

    TOWER_ORDER.forEach((key, i) => {
      const td  = TOWERS[key]
      const gc  = i % COLS
      const gr  = Math.floor(i / COLS)
      const bx  = (i === 9)
        ? PX + PW / 2
        : PX + 6 + gc * CELL_W + CELL_W / 2
      const by  = GRID_Y + gr * CELL_H + CELL_H / 2

      const btn = this.add.graphics()
      const drawBtn = (active, canAfford) => {
        btn.clear()
        const c = active ? 0x2a6a2a : canAfford ? 0x14241a : 0x201010
        btn.fillStyle(c, 1)
        btn.fillRoundedRect(bx - CELL_W/2 + 3, by - CELL_H/2 + 3, CELL_W - 6, CELL_H - 6, 8)
        btn.lineStyle(2, active ? 0x88ff88 : canAfford ? 0x2e6a2e : 0x661111, 1)
        btn.strokeRoundedRect(bx - CELL_W/2 + 3, by - CELL_H/2 + 3, CELL_W - 6, CELL_H - 6, 8)
        if (active) {
          btn.lineStyle(1, 0x44ff44, 0.3)
          btn.strokeRoundedRect(bx - CELL_W/2 + 1, by - CELL_H/2 + 1, CELL_W - 2, CELL_H - 2, 10)
        }
      }
      drawBtn(false, true)

      const img       = this.add.image(bx, by - 12, key).setDisplaySize(34, 34)
      const baseScale = img.scaleX

      const costTxt = this.add.text(bx, by + 20, `🪙${td.cost}`, {
        fontSize: '12px', fontFamily: 'Arial Black', color: '#FFD700',
      }).setOrigin(0.5)

      const zone = this.add.zone(bx, by, CELL_W - 6, CELL_H - 6).setInteractive({ useHandCursor: true })

      zone.on('pointerover', () => {
        this.tweens.add({ targets: img, scaleX: baseScale * 1.2, scaleY: baseScale * 1.2, duration: 80 })
        if (!this._panelTower) this._showHoverInfo(td)
      })
      zone.on('pointerout', () => {
        this.tweens.add({ targets: img, scaleX: baseScale, scaleY: baseScale, duration: 80 })
        if (!this._panelTower) this._showHoverInfo(null)
      })
      zone.on('pointerdown', () => {
        if (this._gold < td.cost) { this._shakeGold(); return }
        const selecting = this._selectedKey !== key
        this._selectedKey = selecting ? key : null
        this.events.emit('tower_selected', this._selectedKey)
        this._refreshShop()
      })

      this.towerBtns[key] = { btn, drawBtn, img, costTxt, zone, baseScale }
    })
    drawSep(GRID_Y + 4 * CELL_H + 2)

    // ── Next wave button ──────────────────────────────────────────
    const waveY = GRID_Y + 4 * CELL_H + 26
    this.nextWaveBtnData = this._btn(PX + PW / 2, waveY, PW - 20, 38, '▶▶ Volgende golf', 0x1a5522, () => {
      this.events.emit('next_wave')
    })
    drawSep(waveY + 28)

    // ── Info section ─────────────────────────────────────────────
    this._infoY = waveY + 36
    this._buildInfoSection()

    // ── Map-area notification text ────────────────────────────────
    this.notifText = this.add.text(PX / 2, CH - 40, '', {
      fontSize: '24px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(50).setAlpha(0)

    // ── Event listeners ───────────────────────────────────────────
    this.events.on('update_gold',     v => this._setGold(v))
    this.events.on('update_lives',    v => this._setLives(v))
    this.events.on('update_wave',     v => this._setWave(v))
    this.events.on('not_enough_gold', () => this._shakeGold())
    this.events.on('tower_panel_show', d => this._showTowerPanel(d))
    this.events.on('tower_panel_hide', () => this._hideTowerPanel())
    this.events.on('wave_complete',   () => this._showNotif('✅ Golf voorbij! Bonus goud!', 0x44FF44))
    this.events.on('show_bonus',      v => this._showNotif(`+${v} 🪙 bonus!`, 0xFFD700))
    this.events.on('game_over',       d => this._showGameOver(d))
    this.events.on('victory',         d => this._showVictory(d))
    this.events.on('speed_changed',   n => { this._currentSpeed = n; this._refreshSpeedBtns() })

    // Sync initial state from GameScene
    const gs = this.scene.get('Game')
    if (gs) {
      this._setGold(gs.gold ?? 0)
      this._setLives(gs.lives ?? 20)
      this._setWave(gs.waveNum ?? 0)
    }
  }

  // ── Speed control ─────────────────────────────────────────────────
  _setSpeed(n) {
    this._currentSpeed = n
    this.events.emit('set_speed', n)
    this._refreshSpeedBtns()
  }

  _refreshSpeedBtns() {
    const btns = [
      { btn: this._speed1Btn, speed: 1 },
      { btn: this._speed2Btn, speed: 2 },
      { btn: this._speed3Btn, speed: 3 },
    ]
    btns.forEach(({ btn, speed }) => {
      if (!btn) return
      const active = this._currentSpeed === speed
      btn.gfx.clear()
      const col = active ? 0x226622 : 0x162816
      btn.gfx.fillStyle(col, 1)
      btn.gfx.fillRoundedRect(
        btn._x - btn._w/2, btn._y - btn._h/2, btn._w, btn._h, 7
      )
      btn.gfx.lineStyle(2, active ? 0x88ff88 : 0x2e6a2e, 1)
      btn.gfx.strokeRoundedRect(
        btn._x - btn._w/2, btn._y - btn._h/2, btn._w, btn._h, 7
      )
      btn.txt.setColor(active ? '#88ff88' : '#aaaaaa')
    })
  }

  // ── Info section ──────────────────────────────────────────────────
  _buildInfoSection() {
    const y = this._infoY

    this._hoverName = this.add.text(PX + PW / 2, y + 10, '', {
      fontSize: '13px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5).setDepth(5)
    this._hoverDesc = this.add.text(PX + PW / 2, y + 32, '', {
      fontSize: '11px', fontFamily: 'Arial', color: '#88cc88',
      wordWrap: { width: PW - 20 }, align: 'center',
    }).setOrigin(0.5).setDepth(5)

    this._panelBg     = this.add.graphics().setDepth(4)
    this._panelName   = this.add.text(PX + PW / 2, y + 10, '', {
      fontSize: '13px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5).setDepth(6)
    this._panelStats  = this.add.text(PX + PW / 2, y + 30, '', {
      fontSize: '11px', fontFamily: 'Arial', color: '#aaffaa',
    }).setOrigin(0.5).setDepth(6)
    this._upgradeBtn  = this._btn(PX + PW / 2, y + 68, PW - 24, 36, 'Upgraden', 0x1a4a1a, () => {
      this.events.emit('upgrade_tower')
    })
    this._sellBtn     = this._btn(PX + PW / 2, y + 112, PW - 24, 36, 'Verkopen', 0x4a1a1a, () => {
      this.events.emit('sell_tower')
    })

    this._hideTowerPanel()
  }

  _showHoverInfo(td) {
    if (td) {
      this._hoverName.setText(`${td.emoji} ${td.name}`)
      this._hoverDesc.setText(td.description)
    } else {
      this._hoverName.setText('')
      this._hoverDesc.setText('')
    }
  }

  _showTowerPanel(data) {
    this._panelTower = data
    this._showHoverInfo(null)

    const y = this._infoY
    this._panelBg.clear()
    this._panelBg.fillStyle(0x091a09, 0.97)
    this._panelBg.fillRoundedRect(PX + 4, y + 1, PW - 8, 152, 8)
    this._panelBg.lineStyle(1, 0x2a6a2a, 1)
    this._panelBg.strokeRoundedRect(PX + 4, y + 1, PW - 8, 152, 8)

    const uc = data.upgradeCost
    this._panelName.setText(`${data.tower.emoji} ${data.tower.name}  Lv.${data.level}`).setVisible(true)
    this._panelStats.setText(data.tower.description).setVisible(true)
    this._upgradeBtn.txt.setText(uc ? `⬆ Upgrade  🪙${uc}` : '✅ Max level').setVisible(true)
    this._upgradeBtn.gfx.setVisible(true)
    this._upgradeBtn.zone.setVisible(true)
    this._sellBtn.txt.setText(`💰 Verkopen  🪙${data.sellValue}`).setVisible(true)
    this._sellBtn.gfx.setVisible(true)
    this._sellBtn.zone.setVisible(true)
    this._panelBg.setVisible(true)

    this.tweens.add({ targets: this._panelBg, alpha: { from: 0, to: 1 }, duration: 120 })
  }

  _hideTowerPanel() {
    this._panelTower = null
    this._panelBg.setVisible(false)
    this._panelName.setVisible(false)
    this._panelStats.setVisible(false)
    this._upgradeBtn.txt.setVisible(false)
    this._upgradeBtn.gfx.setVisible(false)
    this._upgradeBtn.zone.setVisible(false)
    this._sellBtn.txt.setVisible(false)
    this._sellBtn.gfx.setVisible(false)
    this._sellBtn.zone.setVisible(false)
  }

  // ── HUD helpers ───────────────────────────────────────────────────
  _setGold(v) {
    this._gold = v
    this.goldText.setText(String(v))
    this._refreshShop()
  }

  _setLives(v) {
    this._lives = v
    this.livesText.setText(String(v))
    if (v <= 5)       this.livesText.setColor('#FF2222')
    else if (v <= 10) this.livesText.setColor('#FF9900')
    else              this.livesText.setColor('#FF6666')
  }

  _setWave(v) {
    this._wave = v
    this.waveText.setText(`Golf: ${v} / 15`)
  }

  _refreshShop() {
    TOWER_ORDER.forEach(key => {
      const b = this.towerBtns[key]
      if (!b) return
      const canAfford = this._gold >= TOWERS[key].cost
      const active    = this._selectedKey === key
      b.drawBtn(active, canAfford)
      b.costTxt.setColor(canAfford ? '#FFD700' : '#994444')
    })
  }

  _shakeGold() {
    const ox = this.goldText.x
    this.tweens.add({
      targets: this.goldText,
      x: { from: ox - 6, to: ox + 6 },
      duration: 50, yoyo: true, repeat: 3,
      onComplete: () => this.goldText.setX(ox),
    })
    this.goldText.setColor('#FF4444')
    this.time.delayedCall(400, () => this.goldText.setColor('#FFD700'))
  }

  // Generic button helper — stores x/y/w/h on returned object for speed btn redraw
  _btn(x, y, w, h, label, color, cb) {
    const g = this.add.graphics()
    const draw = (c) => {
      g.clear()
      g.fillStyle(c, 1)
      g.fillRoundedRect(x - w/2, y - h/2, w, h, 8)
      g.lineStyle(1, 0x44aa44, 0.6)
      g.strokeRoundedRect(x - w/2, y - h/2, w, h, 8)
    }
    draw(color)
    const t = this.add.text(x, y, label, {
      fontSize: '13px', fontFamily: 'Arial Black', color: '#dddddd',
    }).setOrigin(0.5)
    const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true })
    z.on('pointerover',  () => { draw(Phaser.Display.Color.ValueToColor(color).brighten(20).color); t.setColor('#ffffff') })
    z.on('pointerout',   () => { draw(color); t.setColor('#dddddd') })
    z.on('pointerup',    cb)
    const obj = { gfx: g, txt: t, zone: z, _x: x, _y: y, _w: w, _h: h }
    return obj
  }

  // ── Notifications ─────────────────────────────────────────────────
  _showNotif(msg, color) {
    this.notifText.setText(msg)
    this.notifText.setColor(Phaser.Display.Color.IntegerToColor(color).rgba)
    this.tweens.killTweensOf(this.notifText)
    this.notifText.setAlpha(1).setY(CH - 40)
    this.tweens.add({
      targets: this.notifText,
      alpha: { from: 1, to: 0 },
      y:     { from: CH - 40, to: CH - 100 },
      duration: 2400, ease: 'Cubic.Out',
    })
  }

  // ── Overlays ──────────────────────────────────────────────────────
  _showGameOver(data) {
    this._showOverlay('💀 GAME OVER', `Je haalde golf ${data.wave} van de 15`, 0x660000, '#ff6666')
  }

  _showVictory(data) {
    this._showOverlay('🏆 GEWONNEN!', 'Alle 15 golven overleefd!', 0x004400, '#66ff66')
  }

  _showOverlay(title, sub, bgColor, titleColor) {
    const W = this.scale.width, H = this.scale.height
    const ow = 480, oh = 280

    const ol = this.add.graphics().setDepth(60)
    ol.fillStyle(0x000000, 0.78)
    ol.fillRect(0, 0, W, H)
    ol.fillStyle(bgColor, 0.95)
    ol.fillRoundedRect(W/2 - ow/2, H/2 - oh/2, ow, oh, 20)
    ol.lineStyle(3, 0x66ff66, 0.7)
    ol.strokeRoundedRect(W/2 - ow/2, H/2 - oh/2, ow, oh, 20)

    this.add.text(W/2, H/2 - 76, title, {
      fontSize: '46px', fontFamily: 'Arial Black',
      color: titleColor, stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(61)

    this.add.text(W/2, H/2 - 18, sub, {
      fontSize: '18px', fontFamily: 'Arial', color: '#dddddd',
    }).setOrigin(0.5).setDepth(61)

    this._overlayBtn(W/2 - 100, H/2 + 70, '🔄 Opnieuw', 0x226622, () => {
      this.scene.stop('UI')
      this.scene.start('Game', { mapId: this.mapId })
    })
    this._overlayBtn(W/2 + 100, H/2 + 70, '🗺 Levels', 0x224488, () => {
      this.scene.stop('UI')
      this.scene.start('Menu')
    })
  }

  _overlayBtn(x, y, label, color, cb) {
    const w = 170, h = 44
    const g = this.add.graphics().setDepth(62)
    g.fillStyle(color, 1)
    g.fillRoundedRect(x - w/2, y - h/2, w, h, 10)
    g.lineStyle(2, 0xffffff, 0.35)
    g.strokeRoundedRect(x - w/2, y - h/2, w, h, 10)
    const t = this.add.text(x, y, label, {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5).setDepth(63)
    const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(64)
    z.on('pointerup', cb)
    z.on('pointerover',  () => { g.alpha = 0.7; this.tweens.add({ targets: t, scale: 1.08, duration: 80 }) })
    z.on('pointerout',   () => { g.alpha = 1;   this.tweens.add({ targets: t, scale: 1,    duration: 80 }) })
  }
}
