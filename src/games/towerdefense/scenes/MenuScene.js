import Phaser from 'phaser'
import { MAPS } from '../data/MapData.js'

const SAVE_KEY = 'td_progress'

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') } catch { return {} }
}

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu') }

  create() {
    const W = this.scale.width, H = this.scale.height
    this.progress = loadProgress()

    // ── Background gradient ────────────────────────────────────────
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0d2b0a, 0x0d2b0a, 0x1a4d0f, 0x1a4d0f, 1)
    bg.fillRect(0, 0, W, H)

    // Subtle grid pattern
    const grid = this.add.graphics()
    grid.lineStyle(1, 0x1e5c15, 0.3)
    for (let x = 0; x < W; x += 40) { grid.lineBetween(x, 0, x, H) }
    for (let y = 0; y < H; y += 40) { grid.lineBetween(0, y, W, y) }

    // ── Title ──────────────────────────────────────────────────────
    this.add.text(W/2, 60, '🏰 Tower Defence', {
      fontSize: '48px', fontFamily: 'Arial Black, Arial',
      color: '#ffffff', stroke: '#1a5c0a', strokeThickness: 6,
      shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 8, fill: true },
    }).setOrigin(0.5)

    this.add.text(W/2, 115, 'Bescherm je basis! Kies een level:', {
      fontSize: '20px', fontFamily: 'Arial', color: '#a0e890',
    }).setOrigin(0.5)

    // ── Map cards ─────────────────────────────────────────────────
    const cardW = 300, cardH = 340
    const startX = W/2 - (MAPS.length - 1) * (cardW + 30) / 2
    const cardY   = H/2 + 20

    MAPS.forEach((map, i) => {
      const unlocked = map.unlocked || !!this.progress[`map${map.id}_complete`]
      const best     = this.progress[`map${map.id}_best`] || null
      const cx = startX + i * (cardW + 30)

      // Card background
      const card = this.add.graphics()
      if (unlocked) {
        card.fillGradientStyle(0x1a5c0a, 0x1a5c0a, 0x0d3305, 0x0d3305, 1)
      } else {
        card.fillStyle(0x1a1a1a, 0.8)
      }
      card.fillRoundedRect(cx - cardW/2, cardY - cardH/2, cardW, cardH, 18)
      card.lineStyle(3, unlocked ? 0x44ff44 : 0x444444, 1)
      card.strokeRoundedRect(cx - cardW/2, cardY - cardH/2, cardW, cardH, 18)

      // Map emoji
      this.add.text(cx, cardY - 120, map.emoji, {
        fontSize: '72px',
      }).setOrigin(0.5).setAlpha(unlocked ? 1 : 0.3)

      // Map name
      this.add.text(cx, cardY - 50, map.name, {
        fontSize: '28px', fontFamily: 'Arial Black, Arial',
        color: unlocked ? '#ffffff' : '#666666',
      }).setOrigin(0.5)

      // Difficulty stars
      const stars = '⭐'.repeat(map.difficulty) + '☆'.repeat(3 - map.difficulty)
      this.add.text(cx, cardY - 15, stars, {
        fontSize: '22px',
      }).setOrigin(0.5).setAlpha(unlocked ? 1 : 0.4)

      // Description
      this.add.text(cx, cardY + 22, map.description, {
        fontSize: '14px', fontFamily: 'Arial',
        color: unlocked ? '#99cc88' : '#555555',
        wordWrap: { width: cardW - 20 }, align: 'center',
      }).setOrigin(0.5)

      // Best score
      if (best && unlocked) {
        this.add.text(cx, cardY + 78, `Beste: golf ${best}`, {
          fontSize: '14px', fontFamily: 'Arial', color: '#FFD700',
        }).setOrigin(0.5)
      }

      // Play / Lock button
      const btnY = cardY + 130
      if (unlocked) {
        this._makeButton(cx, btnY, 180, 46, '▶  Spelen', 0x22aa44, 0x44ff66, () => {
          this.scene.start('Game', { mapId: map.id })
        })
      } else {
        // Show unlock requirement
        const prevMap = MAPS[i - 1]
        this.add.text(cx, btnY - 12, '🔒 Vergrendeld', {
          fontSize: '18px', fontFamily: 'Arial', color: '#888888',
        }).setOrigin(0.5)
        this.add.text(cx, btnY + 14, `Voltooi ${prevMap?.name || ''}`, {
          fontSize: '13px', fontFamily: 'Arial', color: '#555555',
        }).setOrigin(0.5)
      }
    })

    // ── Back button ────────────────────────────────────────────────
    this._makeButton(80, 40, 130, 40, '← Terug', 0x333333, 0x555555, () => {
      this.game.events.emit('back')
    })

    // ── Floating particles ─────────────────────────────────────────
    this._spawnFloatingParticles()
  }

  _makeButton(x, y, w, h, label, color, hoverColor, callback) {
    const btn = this.add.graphics()
    const draw = (col) => {
      btn.clear()
      btn.fillStyle(col, 1)
      btn.fillRoundedRect(x - w/2, y - h/2, w, h, 10)
      btn.lineStyle(2, 0xffffff, 0.4)
      btn.strokeRoundedRect(x - w/2, y - h/2, w, h, 10)
    }
    draw(color)

    const txt = this.add.text(x, y, label, {
      fontSize: '18px', fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
    }).setOrigin(0.5)

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true })
    zone.on('pointerover',  () => { draw(hoverColor); txt.setScale(1.05) })
    zone.on('pointerout',   () => { draw(color);      txt.setScale(1) })
    zone.on('pointerdown',  () => { this.tweens.add({ targets: [btn, txt], scaleY: 0.93, duration: 80, yoyo: true }) })
    zone.on('pointerup',    callback)
  }

  _spawnFloatingParticles() {
    const W = this.scale.width, H = this.scale.height
    const emitter = this.add.particles(0, 0, 'star_01', {
      x: { min: 0, max: W },
      y: H + 20,
      speedY: { min: -60, max: -20 },
      speedX: { min: -15, max: 15 },
      scale: { start: 0.05, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: { min: 4000, max: 8000 },
      quantity: 1,
      frequency: 300,
      tint: [0x44ff44, 0x88ff88, 0xffdd44, 0xffffff],
    })
    emitter.setDepth(-1)
  }
}
