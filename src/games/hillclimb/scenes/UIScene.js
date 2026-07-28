import Phaser from 'phaser'
import { LEVELS } from '../data/LevelData.js'
import { drawPanel } from '../ui.js'

export default class UIScene extends Phaser.Scene {
  constructor() { super('HCUI') }

  init({ levelId }) { this.levelId = levelId }

  create() {
    const W = this.scale.width, H = this.scale.height
    this.gameScene = this.scene.get('HCGame')

    // ── HUD-balk linksboven ──────────────────────────────────────
    const hudG = this.add.graphics()
    drawPanel(hudG, 14, 14, 260, 90, { radius: 14, borderAlpha: 0.5 })

    this.add.text(28, 24, '⛽', { fontSize: '20px' })
    this._fuelBarBg = this.add.graphics()
    this._fuelBarBg.fillStyle(0x000000, 0.55); this._fuelBarBg.fillRoundedRect(58, 26, 190, 16, 8)
    this._fuelBarBg.lineStyle(1.5, 0x55617a, 0.8); this._fuelBarBg.strokeRoundedRect(58, 26, 190, 16, 8)
    this._fuelBar = this.add.graphics()

    this.add.text(28, 50, '📏', { fontSize: '18px' })
    this.distText = this.add.text(58, 50, '0 m', {
      fontSize: '18px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setShadow(0, 1, '#000', 2)

    this.add.text(28, 76, '🪙', { fontSize: '18px' })
    this.coinText = this.add.text(58, 76, '0', {
      fontSize: '18px', fontFamily: 'Arial Black', color: '#ffd23f',
    }).setShadow(0, 1, '#000', 2)

    const lvl = LEVELS[this.levelId]
    this.add.text(W - 16, 16, `${lvl.emoji} ${lvl.name}`, {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0)

    // ── Touch-knoppen ─────────────────────────────────────────────
    this._makeTouchBtn(W - 90, H - 90, 70, 0x2f9e44, 'hc_gas', 1)
    this._makeTouchBtn(90, H - 90, 70, 0xc0392b, 'hc_rem', -1)

    // Listeners netjes loskoppelen bij shutdown — de events-emitter van de
    // GameScene overleeft een scene-restart, anders crasht een oude UI-scene
    // op vernietigde tekst-objecten.
    const onHud = d => this._updateHud(d)
    const onOver = d => this._showGameOver(d)
    this.gameScene.events.on('hc_hud', onHud)
    this.gameScene.events.on('hc_gameover', onOver)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.gameScene.events.off('hc_hud', onHud)
      this.gameScene.events.off('hc_gameover', onOver)
    })
  }

  _makeTouchBtn(cx, cy, r, color, iconKey, dir) {
    // De gas/rem-sprites zíjn al complete knoppen — geen geverfde cirkel
    // eronder (oogde dubbel), alleen een zachte schaduw + druk-feedback.
    const shadow = this.add.graphics()
    shadow.fillStyle(0x000000, 0.3); shadow.fillCircle(cx, cy + 5, r * 0.96)
    const img = this.add.image(cx, cy, iconKey).setDisplaySize(r * 2, r * 2).setAlpha(0.92)
    const zone = this.add.zone(cx, cy, r * 2.2, r * 2.2).setInteractive({ useHandCursor: true })
    const press = () => {
      img.setAlpha(1)
      this.tweens.add({ targets: img, displayWidth: r * 1.84, displayHeight: r * 1.84, duration: 60 })
      this.gameScene.setTouchThrottle(dir, true)
    }
    const release = () => {
      img.setAlpha(0.92)
      this.tweens.add({ targets: img, displayWidth: r * 2, displayHeight: r * 2, duration: 90 })
      this.gameScene.setTouchThrottle(dir, false)
    }
    zone.on('pointerdown', press)
    zone.on('pointerup', release)
    zone.on('pointerout', release)
    zone.on('pointerupoutside', release)
  }

  _updateHud({ fuel, maxFuel, distance, coins }) {
    const p = Math.max(0, fuel / maxFuel)
    this._fuelBar.clear()
    const color = p > 0.35 ? 0x7ed957 : p > 0.15 ? 0xffb347 : 0xff4d4d
    this._fuelBar.fillStyle(color, 1); this._fuelBar.fillRoundedRect(58, 26, Math.max(4, 190 * p), 16, 8)
    this.distText.setText(`${Math.round(distance)} m`)
    this.coinText.setText(String(coins))
  }

  _showGameOver({ reason, distance, best, coins, curuntieEarned }) {
    const W = this.scale.width, H = this.scale.height
    const ow = 460, oh = 320

    const ol = this.add.graphics().setDepth(60)
    ol.fillStyle(0x000000, 0.78); ol.fillRect(0, 0, W, H)
    ol.fillStyle(0x000000, 0.5); ol.fillRoundedRect(W / 2 - ow / 2, H / 2 - oh / 2 + 8, ow, oh, 22)
    ol.fillGradientStyle(0x3a2a08, 0x3a2a08, 0x1f1408, 0x1f1408, 1)
    ol.fillRoundedRect(W / 2 - ow / 2, H / 2 - oh / 2, ow, oh, 22)
    ol.lineStyle(3, 0xffd76a, 0.6)
    ol.strokeRoundedRect(W / 2 - ow / 2, H / 2 - oh / 2, ow, oh, 22)

    const title = reason === 'fuel' ? '⛽ Brandstof op!' : '💥 Gecrasht!'
    this.add.text(W / 2, H / 2 - 122, title, {
      fontSize: '34px', fontFamily: 'Arial Black', color: '#ffd76a', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(61)

    this.add.text(W / 2, H / 2 - 66, `Afstand: ${distance} m   (record: ${best} m)`, {
      fontSize: '18px', fontFamily: 'Arial', color: '#ffffff',
    }).setOrigin(0.5).setDepth(61)
    this.add.text(W / 2, H / 2 - 34, `🪙 ${coins} munten  →  +${curuntieEarned} curuntie`, {
      fontSize: '18px', fontFamily: 'Arial Black', color: '#ffd23f',
    }).setOrigin(0.5).setDepth(61)

    // Beloningsmodus: één potje tot je crasht. Even je score laten lezen en dan
    // terug naar de oefening — geen Opnieuw-knop, anders speel je eindeloos door.
    if (this.registry.get('hcReward')) {
      this.add.text(W / 2, H / 2 + 46, 'Je gaat automatisch verder met oefenen…', {
        fontSize: '17px', fontFamily: 'Arial', color: '#cfd6e6',
      }).setOrigin(0.5).setDepth(61)
      this.time.delayedCall(2600, () => { this.game.events.emit('back') })
      return
    }

    // Belangrijk: HCGame expliciet stoppen bij Levels/Home. Bij "Opnieuw"
    // valt dit niet op (start('HCGame',…) vervangt de actieve HCGame vanzelf),
    // maar zonder dit bleef HCGame op de achtergrond doorrenderen en het
    // nieuwe scherm volledig aan het zicht onttrekken — leek alsof de knop
    // niets deed, terwijl de sceneswissel wél degelijk gebeurde.
    this._overlayBtn(W / 2 - 150, H / 2 + 70, '🔄 Opnieuw', 0xb8742a, () => {
      this.scene.stop('HCUI')
      this.scene.start('HCGame', { vehicleId: this.gameScene.vehicleId, levelId: this.levelId })
    }, 170)
    this._overlayBtn(W / 2 + 40, H / 2 + 70, '🗺 Levels', 0x245a8a, () => {
      this.scene.stop('HCUI')
      this.scene.stop('HCGame')
      this.scene.start('HCLevelSelect')
    }, 170)
    this._overlayBtn(W / 2 + 190, H / 2 + 70, '🏠', 0x37415a, () => {
      this.scene.stop('HCUI')
      this.scene.stop('HCGame')
      this.scene.start('HCHome')
    }, 66)
  }

  _overlayBtn(x, y, label, color, cb, w = 190) {
    const h = 50
    const g = this.add.graphics().setDepth(62)
    const top = Phaser.Display.Color.ValueToColor(color).clone().brighten(22).color
    const bot = Phaser.Display.Color.ValueToColor(color).clone().darken(12).color
    g.fillStyle(0x000000, 0.35); g.fillRoundedRect(x - w / 2, y - h / 2 + 3, w, h, 12)
    g.fillGradientStyle(top, top, bot, bot, 1); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12)
    g.lineStyle(2, 0xffffff, 0.4); g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12)
    this.add.text(x, y, label, {
      fontSize: '17px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5).setDepth(63).setShadow(0, 1, '#000', 2)
    const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(64)
    z.on('pointerup', cb)
  }
}
