import Phaser from 'phaser'
import { TOWERS, TOWER_ORDER } from '../data/TowerData.js'
import { MAP_COLS, MAP_ROWS, TILE_SIZE, PANEL_WIDTH } from '../data/MapData.js'
import { TOTAL_WAVES } from '../data/WaveData.js'

const PX = MAP_COLS * TILE_SIZE   // panel starts here
const PW = PANEL_WIDTH            // 256
const CH = MAP_ROWS * TILE_SIZE   // canvas height

// ── Palette ──────────────────────────────────────────────────────────
const C = {
  panelTop:   0x0a2012,
  panelBot:   0x05140a,
  accent:     0x3ad36a,
  accentDim:  0x2a6a2a,
  chip:       0x0f2a18,
  chipLine:   0x255a35,
  gold:       0xffd23f,
  goldHex:    '#ffd23f',
  red:        '#ff6b6b',
  blue:       '#88ccff',
}

export default class UIScene extends Phaser.Scene {
  constructor() { super('UI') }

  init(data) {
    this.mapId        = data.mapId || 1
    this._gold        = 0
    this._lives       = 20
    this._maxLives    = 20
    this._wave        = 0
    this._selectedKey = null
    this._panelTower  = null
    this._currentSpeed = 1
  }

  create() {
    // ── Panel background ──────────────────────────────────────────
    const bg = this.add.graphics()
    bg.fillGradientStyle(C.panelTop, C.panelTop, C.panelBot, C.panelBot, 1)
    bg.fillRect(PX, 0, PW, CH)
    // left accent glow strip
    bg.fillStyle(C.accent, 0.5); bg.fillRect(PX, 0, 3, CH)
    bg.fillStyle(C.accent, 0.12); bg.fillRect(PX + 3, 0, 10, CH)
    // faint dotted texture
    bg.fillStyle(0xffffff, 0.018)
    for (let y = 6; y < CH; y += 8) for (let x = PX + 8; x < PX + PW; x += 8) bg.fillRect(x, y, 1, 1)

    // ── Header bar (Menu + Pause) ────────────────────────────────
    const headG = this.add.graphics()
    headG.fillGradientStyle(0x123a1e, 0x123a1e, 0x0a2614, 0x0a2614, 1)
    headG.fillRect(PX + 3, 0, PW - 3, 44)
    headG.lineStyle(1, C.accentDim, 0.7); headG.lineBetween(PX + 8, 44, PX + PW - 8, 44)

    this._menuBtn  = this._btn(PX + 60,  22, 100, 32, '← Menu',   0x243a5a, () => this.events.emit('back_menu'))
    this._pauseBtn = this._btn(PX + 196, 22,  96, 32, '⏸ Pauze', 0x2a4a18, () => this.events.emit('pause_toggle'))

    // ── Speed row ────────────────────────────────────────────────
    this.add.text(PX + 12, 56, 'SNELHEID', {
      fontSize: '10px', fontFamily: 'Arial Black', color: '#5fae5f',
    }).setShadow(0, 1, '#000', 1)
    const sW = 52, sH = 26, sY = 76
    this._speed1Btn = this._btn(PX + 40,  sY, sW, sH, '1×', 0x1a3220, () => this._setSpeed(1))
    this._speed2Btn = this._btn(PX + 98,  sY, sW, sH, '2×', 0x1a3220, () => this._setSpeed(2))
    this._speed3Btn = this._btn(PX + 156, sY, sW, sH, '3×', 0x1a3220, () => this._setSpeed(3))
    this._speed5Btn = this._btn(PX + 214, sY, sW, sH, '5×', 0x1a3220, () => this._setSpeed(5))
    this._refreshSpeedBtns()

    // ── Stat chips: Gold + Lives ─────────────────────────────────
    const chipY = 100, chipH = 38, chipW = (PW - 24) / 2
    this._statChip(PX + 12, chipY, chipW, chipH)
    this._statChip(PX + 12 + chipW + 4, chipY, chipW, chipH)
    this.add.text(PX + 22, chipY + chipH / 2, '🪙', { fontSize: '20px' }).setOrigin(0, 0.5)
    this.goldText = this.add.text(PX + 48, chipY + chipH / 2, '0', {
      fontSize: '20px', fontFamily: 'Arial Black', color: C.goldHex,
    }).setOrigin(0, 0.5).setShadow(0, 1, '#000', 2)
    this.add.text(PX + 22 + chipW + 4, chipY + chipH / 2, '❤️', { fontSize: '18px' }).setOrigin(0, 0.5)
    this.livesText = this.add.text(PX + 50 + chipW + 4, chipY + chipH / 2, '20', {
      fontSize: '20px', fontFamily: 'Arial Black', color: C.red,
    }).setOrigin(0, 0.5).setShadow(0, 1, '#000', 2)

    // ── Wave row + progress bar ──────────────────────────────────
    const wY = chipY + chipH + 10
    this.add.text(PX + 14, wY, '🌊', { fontSize: '16px' }).setOrigin(0, 0)
    this.waveText = this.add.text(PX + 40, wY + 1, `Golf 0 / ${TOTAL_WAVES}`, {
      fontSize: '15px', fontFamily: 'Arial Black', color: C.blue,
    }).setOrigin(0, 0).setShadow(0, 1, '#000', 2)
    this._waveBarY = wY + 24
    this._waveBar = this.add.graphics()
    this._drawWaveBar()

    // ── Shop label ───────────────────────────────────────────────
    const shopLabelY = this._waveBarY + 18
    this.add.text(PX + PW / 2, shopLabelY, '⚔ KIES JE TOREN ⚔', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#7fe07f',
      stroke: '#08200c', strokeThickness: 3,
    }).setOrigin(0.5)

    // ── Tower grid: 3 cols × 4 rows ──────────────────────────────
    this.towerBtns = {}
    const COLS   = 3
    const CELL_W = Math.floor((PW - 12) / COLS)
    const CELL_H = 70
    const GRID_Y = shopLabelY + 16

    TOWER_ORDER.forEach((key, i) => {
      const td  = TOWERS[key]
      const gc  = i % COLS
      const gr  = Math.floor(i / COLS)
      const bx  = (i === 9) ? PX + PW / 2 : PX + 6 + gc * CELL_W + CELL_W / 2
      const by  = GRID_Y + gr * CELL_H + CELL_H / 2

      const btn = this.add.graphics()
      const rx = bx - CELL_W/2 + 3, ry = by - CELL_H/2 + 3, rw = CELL_W - 6, rh = CELL_H - 6
      const drawBtn = (active, canAfford) => {
        btn.clear()
        // shadow
        btn.fillStyle(0x000000, 0.3); btn.fillRoundedRect(rx, ry + 2, rw, rh, 10)
        // body gradient
        const t = active ? 0x2f7a36 : canAfford ? 0x15301c : 0x251212
        const b = active ? 0x1c4a22 : canAfford ? 0x0c1c12 : 0x160a0a
        btn.fillGradientStyle(t, t, b, b, 1)
        btn.fillRoundedRect(rx, ry, rw, rh, 10)
        // top highlight
        btn.fillStyle(0xffffff, active ? 0.12 : 0.06)
        btn.fillRoundedRect(rx + 2, ry + 2, rw - 4, rh * 0.45, 8)
        // border
        btn.lineStyle(2, active ? 0x9bff9b : canAfford ? 0x357a35 : 0x7a2222, active ? 1 : 0.85)
        btn.strokeRoundedRect(rx, ry, rw, rh, 10)
        if (active) { btn.lineStyle(1, 0x66ff66, 0.35); btn.strokeRoundedRect(rx - 2, ry - 2, rw + 4, rh + 4, 12) }
      }
      drawBtn(false, true)

      const img       = this.add.image(bx, by - 13, key).setDisplaySize(34, 34)
      const baseScale = img.scaleX

      // cost badge
      const costBg = this.add.graphics()
      costBg.fillStyle(0x000000, 0.4); costBg.fillRoundedRect(bx - 26, by + 12, 52, 17, 8)
      const costTxt = this.add.text(bx, by + 20, `🪙${td.cost}`, {
        fontSize: '12px', fontFamily: 'Arial Black', color: C.goldHex,
      }).setOrigin(0.5)

      const zone = this.add.zone(bx, by, CELL_W - 6, CELL_H - 6).setInteractive({ useHandCursor: true })
      zone.on('pointerover', () => {
        this.tweens.add({ targets: img, scaleX: baseScale * 1.22, scaleY: baseScale * 1.22, duration: 90, ease: 'Back.Out' })
        if (!this._panelTower) this._showHoverInfo(td)
      })
      zone.on('pointerout', () => {
        this.tweens.add({ targets: img, scaleX: baseScale, scaleY: baseScale, duration: 90 })
        if (!this._panelTower) this._showHoverInfo(null)
      })
      zone.on('pointerdown', () => {
        if (this._gold < td.cost) { this._shakeGold(); return }
        const selecting = this._selectedKey !== key
        this._selectedKey = selecting ? key : null
        this.events.emit('tower_selected', this._selectedKey)
        this._refreshShop()
      })

      this.towerBtns[key] = { btn, drawBtn, img, costTxt, costBg, zone, baseScale }
    })

    // ── Next wave button (prominent, pulsing) ────────────────────
    const waveY = GRID_Y + 4 * CELL_H + 24
    this.nextWaveBtnData = this._btn(PX + PW / 2, waveY, PW - 20, 42, '▶▶  Volgende golf', 0x1f7a33, () => {
      this.events.emit('next_wave')
    }, true)
    this.tweens.add({
      targets: this.nextWaveBtnData.txt,
      scale: { from: 1, to: 1.06 },
      duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    })

    // ── Info section ─────────────────────────────────────────────
    this._infoY = waveY + 34
    this._buildInfoSection()

    // ── Map-area notification text ───────────────────────────────
    this.notifText = this.add.text(PX / 2, CH - 50, '', {
      fontSize: '26px', fontFamily: 'Arial Black',
      color: C.goldHex, stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(50).setAlpha(0)

    // ── Event listeners ──────────────────────────────────────────
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

    const gs = this.scene.get('Game')
    if (gs) {
      this._maxLives = gs.lives ?? 20
      this._setGold(gs.gold ?? 0)
      this._setLives(gs.lives ?? 20)
      this._setWave(gs.waveNum ?? 0)
    }
  }

  // ── A rounded "chip" background ───────────────────────────────────
  _statChip(x, y, w, h) {
    const g = this.add.graphics()
    g.fillStyle(0x000000, 0.3); g.fillRoundedRect(x, y + 2, w, h, 10)
    g.fillStyle(C.chip, 1);     g.fillRoundedRect(x, y, w, h, 10)
    g.fillStyle(0xffffff, 0.05); g.fillRoundedRect(x + 2, y + 2, w - 4, h * 0.45, 8)
    g.lineStyle(1.5, C.chipLine, 0.9); g.strokeRoundedRect(x, y, w, h, 10)
    return g
  }

  _drawWaveBar() {
    const x = PX + 14, w = PW - 28, h = 8, y = this._waveBarY
    const p = Math.max(0, Math.min(1, this._wave / TOTAL_WAVES))
    const g = this._waveBar
    g.clear()
    g.fillStyle(0x06160c, 1); g.fillRoundedRect(x, y, w, h, 4)
    if (p > 0) {
      g.fillGradientStyle(0x4fb0ff, 0x88ccff, 0x2a7ad0, 0x2a7ad0, 1)
      g.fillRoundedRect(x, y, Math.max(6, w * p), h, 4)
    }
    g.lineStyle(1, 0x2a5a8a, 0.7); g.strokeRoundedRect(x, y, w, h, 4)
  }

  // ── Speed control ─────────────────────────────────────────────────
  _setSpeed(n) {
    this._currentSpeed = n
    this.events.emit('set_speed', n)
    this._refreshSpeedBtns()
  }

  _refreshSpeedBtns() {
    const list = [
      { btn: this._speed1Btn, speed: 1 },
      { btn: this._speed2Btn, speed: 2 },
      { btn: this._speed3Btn, speed: 3 },
      { btn: this._speed5Btn, speed: 5 },
    ]
    list.forEach(({ btn, speed }) => {
      if (!btn) return
      const active = this._currentSpeed === speed
      const x = btn._x, y = btn._y, w = btn._w, h = btn._h
      btn.gfx.clear()
      btn.gfx.fillStyle(0x000000, 0.3); btn.gfx.fillRoundedRect(x - w/2, y - h/2 + 2, w, h, 9)
      const t = active ? 0x2f8a3a : 0x1c3a24, b = active ? 0x1c5a26 : 0x0e2014
      btn.gfx.fillGradientStyle(t, t, b, b, 1); btn.gfx.fillRoundedRect(x - w/2, y - h/2, w, h, 9)
      btn.gfx.fillStyle(0xffffff, active ? 0.14 : 0.05); btn.gfx.fillRoundedRect(x - w/2 + 2, y - h/2 + 2, w - 4, h * 0.45, 7)
      btn.gfx.lineStyle(2, active ? 0x9bff9b : 0x357a35, active ? 1 : 0.7)
      btn.gfx.strokeRoundedRect(x - w/2, y - h/2, w, h, 9)
      btn.txt.setColor(active ? '#d6ffd6' : '#9fbf9f')
    })
  }

  // ── Info section ──────────────────────────────────────────────────
  _buildInfoSection() {
    const y = this._infoY
    this._hoverName = this.add.text(PX + PW / 2, y + 12, '', {
      fontSize: '14px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5).setDepth(5).setShadow(0, 1, '#000', 2)
    this._hoverDesc = this.add.text(PX + PW / 2, y + 34, '', {
      fontSize: '11px', fontFamily: 'Arial', color: '#9fde9f',
      wordWrap: { width: PW - 24 }, align: 'center',
    }).setOrigin(0.5).setDepth(5)

    this._panelBg     = this.add.graphics().setDepth(4)
    this._panelName   = this.add.text(PX + PW / 2, y + 12, '', {
      fontSize: '14px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5).setDepth(6).setShadow(0, 1, '#000', 2)
    this._panelStats  = this.add.text(PX + PW / 2, y + 34, '', {
      fontSize: '11px', fontFamily: 'Arial', color: '#bfffbf',
      wordWrap: { width: PW - 24 }, align: 'center',
    }).setOrigin(0.5).setDepth(6)
    this._upgradeBtn  = this._btn(PX + PW / 2, y + 74, PW - 24, 36, 'Upgraden', 0x1f6a2a, () => {
      this.events.emit('upgrade_tower')
    })
    this._sellBtn     = this._btn(PX + PW / 2, y + 118, PW - 24, 34, 'Verkopen', 0x6a2222, () => {
      this.events.emit('sell_tower')
    })
    // Keep the upgrade/sell buttons ABOVE the tower-panel background (depth 4)
    ;[this._upgradeBtn, this._sellBtn].forEach(b => {
      b.gfx.setDepth(6); b.txt.setDepth(7); b.zone.setDepth(7)
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
    this._panelBg.fillStyle(0x000000, 0.4); this._panelBg.fillRoundedRect(PX + 4, y + 3, PW - 8, 152, 10)
    this._panelBg.fillGradientStyle(0x0e2a14, 0x0e2a14, 0x081a0c, 0x081a0c, 1)
    this._panelBg.fillRoundedRect(PX + 4, y + 1, PW - 8, 152, 10)
    this._panelBg.lineStyle(1.5, C.chipLine, 1)
    this._panelBg.strokeRoundedRect(PX + 4, y + 1, PW - 8, 152, 10)

    const uc = data.upgradeCost
    this._panelName.setText(`${data.tower.emoji} ${data.tower.name}  Lv.${data.level}`).setVisible(true)
    this._panelStats.setText(data.tower.description).setVisible(true)
    this._upgradeBtn.txt.setText(uc ? `⬆ Upgrade  🪙${uc}` : '✅ Max level').setVisible(true)
    this._upgradeBtn.gfx.setVisible(true); this._upgradeBtn.zone.setVisible(true)
    this._sellBtn.txt.setText(`💰 Verkopen  🪙${data.sellValue}`).setVisible(true)
    this._sellBtn.gfx.setVisible(true); this._sellBtn.zone.setVisible(true)
    this._panelBg.setVisible(true)
    this.tweens.add({ targets: this._panelBg, alpha: { from: 0, to: 1 }, duration: 120 })
  }

  _hideTowerPanel() {
    this._panelTower = null
    this._panelBg.setVisible(false)
    this._panelName.setVisible(false)
    this._panelStats.setVisible(false)
    this._upgradeBtn.txt.setVisible(false); this._upgradeBtn.gfx.setVisible(false); this._upgradeBtn.zone.setVisible(false)
    this._sellBtn.txt.setVisible(false); this._sellBtn.gfx.setVisible(false); this._sellBtn.zone.setVisible(false)
  }

  // ── HUD helpers ───────────────────────────────────────────────────
  _setGold(v) {
    const up = v > this._gold
    this._gold = v
    this.goldText.setText(String(v))
    if (up) {
      this.tweens.killTweensOf(this.goldText)
      this.goldText.setScale(1)
      this.tweens.add({ targets: this.goldText, scale: { from: 1.25, to: 1 }, duration: 220, ease: 'Back.Out' })
    }
    this._refreshShop()
  }

  _setLives(v) {
    this._lives = v
    this.livesText.setText(String(v))
    if (v <= 5)       this.livesText.setColor('#ff2a2a')
    else if (v <= 10) this.livesText.setColor('#ff9933')
    else              this.livesText.setColor(C.red)
  }

  _setWave(v) {
    this._wave = v
    this.waveText.setText(`Golf ${v} / ${TOTAL_WAVES}`)
    this._drawWaveBar()
  }

  _refreshShop() {
    TOWER_ORDER.forEach(key => {
      const b = this.towerBtns[key]
      if (!b) return
      const canAfford = this._gold >= TOWERS[key].cost
      const active    = this._selectedKey === key
      b.drawBtn(active, canAfford)
      b.costTxt.setColor(canAfford ? C.goldHex : '#aa5555')
      b.img.setAlpha(canAfford ? 1 : 0.5)
    })
  }

  _shakeGold() {
    const ox = this.goldText.x
    this.tweens.add({
      targets: this.goldText, x: { from: ox - 6, to: ox + 6 },
      duration: 50, yoyo: true, repeat: 3,
      onComplete: () => this.goldText.setX(ox),
    })
    this.goldText.setColor('#ff4444')
    this.time.delayedCall(400, () => this.goldText.setColor(C.goldHex))
  }

  // Generic gradient button. `glow=true` → bright accent (call-to-action).
  _btn(x, y, w, h, label, color, cb, glow = false) {
    const g = this.add.graphics()
    const base = Phaser.Display.Color.ValueToColor(color)
    const topC = base.clone().brighten(20).color
    const botC = base.clone().darken(16).color
    const draw = (t, b, border, lift) => {
      g.clear()
      g.fillStyle(0x000000, 0.32); g.fillRoundedRect(x - w/2, y - h/2 + (lift ? 1 : 3), w, h, 11)
      g.fillGradientStyle(t, t, b, b, 1); g.fillRoundedRect(x - w/2, y - h/2, w, h, 11)
      g.fillStyle(0xffffff, 0.10); g.fillRoundedRect(x - w/2 + 2, y - h/2 + 2, w - 4, h * 0.42, 9)
      g.lineStyle(glow ? 2 : 1.5, border, 0.9); g.strokeRoundedRect(x - w/2, y - h/2, w, h, 11)
      if (glow) { g.lineStyle(1, 0x88ff88, 0.3); g.strokeRoundedRect(x - w/2 - 2, y - h/2 - 2, w + 4, h + 4, 13) }
    }
    const borderCol = glow ? 0x9bff9b : 0x4a8a4a
    draw(topC, botC, borderCol, false)
    const t = this.add.text(x, y, label, {
      fontSize: glow ? '15px' : '13px', fontFamily: 'Arial Black', color: '#eaffea',
    }).setOrigin(0.5).setShadow(0, 1, '#000', 2)
    const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true })
    z.on('pointerover', () => { draw(base.clone().brighten(38).color, base.clone().brighten(6).color, 0xbfffbf, true); if (!glow) this.tweens.add({ targets: t, scale: 1.05, duration: 80 }) })
    z.on('pointerout',  () => { draw(topC, botC, borderCol, false); if (!glow) this.tweens.add({ targets: t, scale: 1, duration: 80 }) })
    z.on('pointerup', cb)
    return { gfx: g, txt: t, zone: z, _x: x, _y: y, _w: w, _h: h }
  }

  // ── Notifications ─────────────────────────────────────────────────
  _showNotif(msg, color) {
    this.notifText.setText(msg)
    this.notifText.setColor(Phaser.Display.Color.IntegerToColor(color).rgba)
    this.tweens.killTweensOf(this.notifText)
    this.notifText.setAlpha(1).setY(CH - 50).setScale(0.7)
    this.tweens.add({ targets: this.notifText, scale: 1, duration: 260, ease: 'Back.Out' })
    this.tweens.add({
      targets: this.notifText, alpha: { from: 1, to: 0 },
      y: { from: CH - 50, to: CH - 120 }, delay: 400, duration: 2200, ease: 'Cubic.Out',
    })
  }

  // ── Overlays ──────────────────────────────────────────────────────
  _showGameOver(data) {
    this._showOverlay('💀 GAME OVER', `Je haalde golf ${data.wave} van de ${TOTAL_WAVES}`, 0x3a0808, '#ff7a7a')
  }

  _showVictory(data) {
    this._showOverlay('🏆 GEWONNEN!', `Alle ${TOTAL_WAVES} golven overleefd!`, 0x0a3a14, '#7dff8a')
  }

  _showOverlay(title, sub, bgColor, titleColor) {
    const W = this.scale.width, H = this.scale.height
    const ow = 500, oh = 300

    const ol = this.add.graphics().setDepth(60)
    ol.fillStyle(0x000000, 0.8); ol.fillRect(0, 0, W, H)
    // card shadow + gradient
    ol.fillStyle(0x000000, 0.5); ol.fillRoundedRect(W/2 - ow/2, H/2 - oh/2 + 8, ow, oh, 24)
    const top = Phaser.Display.Color.ValueToColor(bgColor).clone().brighten(10).color
    ol.fillGradientStyle(top, top, bgColor, bgColor, 1)
    ol.fillRoundedRect(W/2 - ow/2, H/2 - oh/2, ow, oh, 24)
    ol.lineStyle(3, Phaser.Display.Color.HexStringToColor(titleColor).color, 0.6)
    ol.strokeRoundedRect(W/2 - ow/2, H/2 - oh/2, ow, oh, 24)

    const tt = this.add.text(W/2, H/2 - 82, title, {
      fontSize: '50px', fontFamily: 'Arial Black', color: titleColor, stroke: '#000', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(61).setScale(0.6)
    this.tweens.add({ targets: tt, scale: 1, duration: 320, ease: 'Back.Out' })

    this.add.text(W/2, H/2 - 22, sub, {
      fontSize: '19px', fontFamily: 'Arial', color: '#e8e8e8',
    }).setOrigin(0.5).setDepth(61)

    this._overlayBtn(W/2 - 105, H/2 + 76, '🔄 Opnieuw', 0x247a2a, () => {
      this.scene.stop('UI'); this.scene.start('Game', { mapId: this.mapId })
    })
    this._overlayBtn(W/2 + 105, H/2 + 76, '🗺 Levels', 0x245a8a, () => {
      this.scene.stop('UI'); this.scene.start('Menu')
    })
  }

  _overlayBtn(x, y, label, color, cb) {
    const w = 180, h = 48
    const g = this.add.graphics().setDepth(62)
    const top = Phaser.Display.Color.ValueToColor(color).clone().brighten(22).color
    const bot = Phaser.Display.Color.ValueToColor(color).clone().darken(12).color
    g.fillStyle(0x000000, 0.35); g.fillRoundedRect(x - w/2, y - h/2 + 3, w, h, 12)
    g.fillGradientStyle(top, top, bot, bot, 1); g.fillRoundedRect(x - w/2, y - h/2, w, h, 12)
    g.fillStyle(0xffffff, 0.12); g.fillRoundedRect(x - w/2 + 2, y - h/2 + 2, w - 4, h * 0.42, 10)
    g.lineStyle(2, 0xffffff, 0.4); g.strokeRoundedRect(x - w/2, y - h/2, w, h, 12)
    const t = this.add.text(x, y, label, {
      fontSize: '17px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5).setDepth(63).setShadow(0, 1, '#000', 2)
    const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(64)
    z.on('pointerup', cb)
    z.on('pointerover', () => { g.alpha = 0.85; this.tweens.add({ targets: t, scale: 1.08, duration: 80 }) })
    z.on('pointerout',  () => { g.alpha = 1;    this.tweens.add({ targets: t, scale: 1,    duration: 80 }) })
  }
}
