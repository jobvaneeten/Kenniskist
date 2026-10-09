import Phaser from 'phaser'
import { LEVELS, LEVEL_ORDER, loadLevelProgress } from '../data/LevelData.js'
import { COL, drawPanel, drawCoin, blokkeerDoorklik, kop, tekst, makeButton } from '../ui.js'

export default class UIScene extends Phaser.Scene {
  constructor() { super('HCUI') }

  init({ levelId }) { this.levelId = levelId }

  create() {
    const W = this.scale.width, H = this.scale.height
    this.gameScene = this.scene.get('HCGame')
    const lvl = LEVELS[this.levelId]

    // ── Afstand bovenin het midden, met voortgang naar het volgende doel ──
    // Doel = de volgende wereld vrijspelen; heb je die al, dan je eigen record.
    const best = loadLevelProgress()[this.levelId] || 0
    const volgende = lvl.nextDistance && best < lvl.nextDistance ? LEVELS[LEVEL_ORDER[lvl.order + 1]] : null
    this._doel = volgende ? lvl.nextDistance : best > 0 ? best : null
    this._doelLabel = volgende ? `${volgende.name}` : 'record'

    const hudG = this.add.graphics()
    drawPanel(hudG, W / 2 - 150, 12, 300, 66, { radius: 18, border: COL.violetLicht, borderAlpha: 0.5, fillAlpha: 0.8 })
    this.distText = this.add.text(W / 2, 34, '0 m', kop(30, '#ffffff')).setOrigin(0.5)
    this._doelBar = this.add.graphics()
    this._doelText = this.add.text(W / 2, 64, '', tekst(11, COL.subtekst)).setOrigin(0.5)

    // ── Brandstof linksboven, onder de vaste Terug-knop van de app ──
    const fg = this.add.graphics()
    drawPanel(fg, 14, 70, 236, 44, { radius: 14, border: COL.rand, fillAlpha: 0.8 })
    this.add.image(36, 92, 'hc_jerrycan').setDisplaySize(22, 26)
    this._fuelBar = this.add.graphics()

    // ── Munten + wereldnaam rechtsboven ──
    const cg = this.add.graphics()
    drawPanel(cg, W - 150, 12, 136, 44, { radius: 22, border: COL.goud, borderAlpha: 0.7, glow: true, fillAlpha: 0.8 })
    drawCoin(cg, W - 126, 34, 10)
    this.coinText = this.add.text(W - 106, 34, '0', kop(22, COL.goudHex)).setOrigin(0, 0.5)
    this.add.text(W - 16, 66, lvl.name.toUpperCase(), kop(14, '#ffffff', { letterSpacing: 2 }))
      .setOrigin(1, 0).setShadow(0, 0, Phaser.Display.Color.IntegerToColor(lvl.palette.surfaceLight).rgba, 10, false, true)

    // ── Touch-knoppen ─────────────────────────────────────────────
    this._makeTouchBtn(W - 90, H - 90, 70, COL.groenNeon, 'hc_gas', 1)
    this._makeTouchBtn(90, H - 90, 70, COL.roze, 'hc_rem', -1)

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
    // De gas/rem-sprites zíjn al complete knoppen — alleen een neon-ring
    // eromheen die oplicht bij indrukken.
    const ring = this.add.graphics()
    const tekenRing = (aan) => {
      ring.clear()
      ring.fillStyle(0x000000, 0.3); ring.fillCircle(cx, cy + 5, r * 0.96)
      ring.lineStyle(aan ? 14 : 8, color, aan ? 0.35 : 0.15); ring.strokeCircle(cx, cy, r + 4)
    }
    tekenRing(false)
    const img = this.add.image(cx, cy, iconKey).setDisplaySize(r * 2, r * 2).setAlpha(0.92)
    const zone = this.add.zone(cx, cy, r * 2.2, r * 2.2).setInteractive({ useHandCursor: true })
    const press = () => {
      img.setAlpha(1); tekenRing(true)
      this.tweens.add({ targets: img, displayWidth: r * 1.84, displayHeight: r * 1.84, duration: 60 })
      this.gameScene.setTouchThrottle(dir, true)
    }
    const release = () => {
      img.setAlpha(0.92); tekenRing(false)
      this.tweens.add({ targets: img, displayWidth: r * 2, displayHeight: r * 2, duration: 90 })
      this.gameScene.setTouchThrottle(dir, false)
    }
    zone.on('pointerdown', press)
    zone.on('pointerup', release)
    zone.on('pointerout', release)
    zone.on('pointerupoutside', release)
  }

  _updateHud({ fuel, maxFuel, distance, coins }) {
    const W = this.scale.width
    const p = Math.max(0, fuel / maxFuel)
    const bx = 58, by = 84, bw = 178, bh = 16
    const color = p > 0.35 ? COL.groenNeon : p > 0.15 ? COL.oranje : 0xff3b5c
    // knipperen als de tank bijna leeg is
    const knipper = p <= 0.15 ? 0.55 + 0.45 * Math.sin(this.time.now / 90) : 1
    this._fuelBar.clear()
    this._fuelBar.fillStyle(0x07061a, 0.9); this._fuelBar.fillRoundedRect(bx, by, bw, bh, 8)
    this._fuelBar.fillStyle(color, 0.22 * knipper); this._fuelBar.fillRoundedRect(bx - 2, by - 2, Math.max(8, bw * p) + 4, bh + 4, 10)
    this._fuelBar.fillStyle(color, knipper); this._fuelBar.fillRoundedRect(bx, by, Math.max(8, bw * p), bh, 8)
    this._fuelBar.fillStyle(0xffffff, 0.3 * knipper); this._fuelBar.fillRoundedRect(bx + 3, by + 2, Math.max(4, bw * p - 6), 4, 2)

    this.distText.setText(`${Math.round(distance)} m`)
    if (String(coins) !== this.coinText.text) {
      this.coinText.setText(String(coins))
      this.tweens.add({ targets: this.coinText, scale: { from: 1.35, to: 1 }, duration: 180, ease: 'Back.Out' })
    }

    this._doelBar.clear()
    if (this._doel) {
      const f = Math.min(1, distance / this._doel)
      const gx = W / 2 - 120, gy = 52, gw = 240
      this._doelBar.fillStyle(0x2a2550, 1); this._doelBar.fillRoundedRect(gx, gy, gw, 5, 2.5)
      this._doelBar.fillStyle(f >= 1 ? COL.groenNeon : COL.cyaan, 1); this._doelBar.fillRoundedRect(gx, gy, Math.max(5, gw * f), 5, 2.5)
      const rest = Math.max(0, Math.ceil(this._doel - distance))
      this._doelText.setText(f >= 1 ? (this._doelLabel === 'record' ? 'NIEUW RECORD!' : `${this._doelLabel.toUpperCase()} VRIJGESPEELD!`) : `nog ${rest} m tot ${this._doelLabel}`)
      this._doelText.setColor(f >= 1 ? COL.groenHex : COL.subtekst)
    }
  }

  _showGameOver({ reason, distance, best, coins, curuntieEarned, nieuwRecord, vrijgespeeld }) {
    const W = this.scale.width, H = this.scale.height
    const ow = 480, oh = 340, ox = W / 2 - ow / 2, oy = H / 2 - oh / 2
    const accent = reason === 'fuel' ? COL.oranje : COL.roze

    // Je crasht meestal met je vinger op het gaspedaal. Het overzicht komt dan
    // onder die vinger tevoorschijn, en zonder pauze klikt dezelfde aanraking
    // meteen op Opnieuw of Levels.
    blokkeerDoorklik(this, 500)

    const ol = this.add.graphics().setDepth(60)
    ol.fillStyle(0x07061a, 0.72); ol.fillRect(0, 0, W, H)
    drawPanel(ol, ox, oy, ow, oh, { radius: 24, border: accent, borderW: 2, glow: true, fillAlpha: 0.96 })

    const title = this.add.text(W / 2, oy + 48, reason === 'fuel' ? 'BRANDSTOF OP!' : 'GECRASHT!', kop(44, Phaser.Display.Color.IntegerToColor(accent).rgba, { letterSpacing: 3 }))
      .setOrigin(0.5).setDepth(61).setShadow(0, 0, Phaser.Display.Color.IntegerToColor(accent).rgba, 20, false, true).setScale(0.5)
    this.tweens.add({ targets: title, scale: 1, duration: 360, ease: 'Back.Out' })

    // afstand groot, record ernaast
    this.add.text(W / 2, oy + 112, `${distance} m`, kop(52, '#ffffff')).setOrigin(0.5).setDepth(61)
    this.add.text(W / 2, oy + 150, nieuwRecord ? 'NIEUW RECORD!' : `record: ${best} m`, nieuwRecord ? kop(16, COL.groenHex, { letterSpacing: 2 }) : tekst(15))
      .setOrigin(0.5).setDepth(61)
    const cg = this.add.graphics().setDepth(61)
    drawCoin(cg, W / 2 - 86, oy + 186, 9)
    this.add.text(W / 2 - 70, oy + 186, `${coins} munten   →   +${curuntieEarned}`, kop(19, COL.goudHex)).setOrigin(0, 0.5).setDepth(61)
    if (vrijgespeeld) {
      const t = this.add.text(W / 2, oy + 220, `Nieuwe wereld vrij: ${vrijgespeeld}!`, kop(17, COL.cyaanHex, { letterSpacing: 1 }))
        .setOrigin(0.5).setDepth(61).setShadow(0, 0, COL.cyaanHex, 12, false, true)
      this.tweens.add({ targets: t, alpha: 0.55, duration: 500, yoyo: true, repeat: -1 })
    }

    // Beloningsmodus: één potje tot je crasht. Even je score laten lezen en dan
    // terug naar de oefening — geen Opnieuw-knop, anders speel je eindeloos door.
    if (this.registry.get('hcReward')) {
      this.add.text(W / 2, oy + oh - 52, 'Je gaat automatisch verder met oefenen…', tekst(16, '#e4dcff'))
        .setOrigin(0.5).setDepth(61)
      this.time.delayedCall(2600, () => { this.game.events.emit('back') })
      return
    }

    // Belangrijk: HCGame expliciet stoppen bij Levels/Home. Bij "Opnieuw"
    // valt dit niet op (start('HCGame',…) vervangt de actieve HCGame vanzelf),
    // maar zonder dit bleef HCGame op de achtergrond doorrenderen en het
    // nieuwe scherm volledig aan het zicht onttrekken — leek alsof de knop
    // niets deed, terwijl de sceneswissel wél degelijk gebeurde.
    // scene.start() vanuit HCUI stopt HCUI zelf, dus die hoeft er niet apart
    // bij; HCGame wel, anders blijft die achter het nieuwe scherm doorrenderen.
    // De klik wordt een frame uitgesteld zodat hij niet doorkomt op het scherm
    // dat erachter opent.
    const naar = (sleutel, data, stopSpel) => {
      this.input.enabled = false
      this.time.delayedCall(60, () => {
        this.scene.start(sleutel, data)
        if (stopSpel) this.scene.stop('HCGame')
      })
    }
    // Drie knoppen binnen het paneel: 170 + 150 + 64 met 12 ertussen.
    const by = oy + oh - 46
    makeButton(this, W / 2 - 112, by, 170, 50, '↻ OPNIEUW', () => {
      naar('HCGame', { vehicleId: this.gameScene.vehicleId, levelId: this.levelId }, false)
    }, { color: COL.violet, fontSize: 19, glow: true, filled: true, depth: 62 })
    makeButton(this, W / 2 + 66, by, 150, 50, 'WERELDEN', () => {
      naar('HCLevelSelect', undefined, true)
    }, { color: COL.cyaan, fontSize: 17, depth: 62 })
    makeButton(this, W / 2 + 185, by, 64, 50, '⌂', () => {
      naar('HCHome', undefined, true)
    }, { color: 0x5b5294, fontSize: 24, depth: 62 })
  }
}
