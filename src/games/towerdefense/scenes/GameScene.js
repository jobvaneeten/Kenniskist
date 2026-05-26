import Phaser from 'phaser'
import { MAPS, TILE_SIZE, MAP_COLS, MAP_ROWS, isBuildable } from '../data/MapData.js'
import { TOWERS, TOWER_ORDER } from '../data/TowerData.js'
import { ENEMIES } from '../data/EnemyData.js'
import { WAVES } from '../data/WaveData.js'

const SAVE_KEY = 'td_progress'
const TOTAL_WAVES = 15
const STARTING_GOLD = 200
const STARTING_LIVES = 20

// ── Enemy ────────────────────────────────────────────────────────────
class Enemy {
  constructor(scene, type, waypoints, flyStart, flyEnd) {
    this.scene   = scene
    this.data    = ENEMIES[type]
    this.hp      = this.data.hp
    this.maxHp   = this.data.hp
    this.speed   = this.data.speed
    this.dead    = false
    this.reached = false
    this.flies   = !!this.data.flies
    this.wpIndex = 1
    this.waypoints = this.flies ? [flyStart, flyEnd] : waypoints

    // Status effects
    this.slowed = 0; this.slowFactor = 1
    this.frozen = 0
    this.poisoned = 0; this.poisonDps = 0
    this.poisonTick = 0

    // Build visuals
    const x = this.waypoints[0].x, y = this.waypoints[0].y
    this.container = scene.add.container(x, y)
    this.container.setDepth(5)

    const r = this.data.size
    const body = scene.add.circle(0, 0, r, this.data.color)
    const border = scene.add.circle(0, 0, r + 2).setStrokeStyle(2, this.data.borderColor, 1).setFillStyle()
    const label = scene.add.text(0, 0, this.data.label, {
      fontSize: `${Math.max(10, r)}px`,
    }).setOrigin(0.5)

    // HP bar bg
    this.hpBg  = scene.add.rectangle(0, -r - 8, 34, 5, 0x440000).setOrigin(0.5)
    this.hpBar = scene.add.rectangle(-17, -r - 8, 34, 5, 0x22dd22).setOrigin(0, 0.5)

    this.container.add([body, border, label, this.hpBg, this.hpBar])

    if (this.flies) {
      // Wing pulsing tween
      scene.tweens.add({
        targets: this.container,
        scaleY: { from: 0.92, to: 1.08 },
        duration: 300, yoyo: true, repeat: -1,
      })
    }
  }

  update(delta) {
    if (this.dead || this.reached) return

    // Frozen stasis
    if (this.frozen > 0) {
      this.frozen -= delta
      if (!this.frozenVfx) {
        this.frozenVfx = this.scene.add.circle(
          this.container.x, this.container.y, this.data.size + 4, 0xADD8E6, 0.5
        ).setDepth(4)
      }
      this.frozenVfx.setPosition(this.container.x, this.container.y)
      return
    }
    if (this.frozenVfx) { this.frozenVfx.destroy(); this.frozenVfx = null }

    // Poison tick
    if (this.poisoned > 0) {
      this.poisoned  -= delta
      this.poisonTick -= delta
      if (this.poisonTick <= 0) {
        this.poisonTick = 500
        this.takeDamage(this.poisonDps * 0.5, 'dot')
      }
    }

    // Slow decay
    if (this.slowed > 0) { this.slowed -= delta }
    else { this.slowFactor = 1 }

    const curSpeed = this.speed * this.slowFactor

    // Move towards current waypoint
    const target = this.waypoints[this.wpIndex]
    const dx = target.x - this.container.x
    const dy = target.y - this.container.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const step = curSpeed * (delta / 1000)

    if (dist <= step + 2) {
      this.container.x = target.x
      this.container.y = target.y
      this.wpIndex++
      if (this.wpIndex >= this.waypoints.length) {
        this.reached = true
        this.destroy()
      }
    } else {
      this.container.x += (dx / dist) * step
      this.container.y += (dy / dist) * step
    }

    // Wobble when slowed
    if (this.slowed > 0 && !this.scene.tweens.isTweening(this.container)) {
      this.container.setAlpha(0.75)
    } else {
      this.container.setAlpha(1)
    }
  }

  takeDamage(amount, type) {
    if (this.dead) return
    let dmg = amount
    if (type !== 'dot' && this.data.armor > 0) dmg *= (1 - this.data.armor)
    this.hp -= dmg
    this.updateHpBar()

    // Damage flash
    this.scene.tweens.add({
      targets: this.container,
      alpha: { from: 0.3, to: 1 },
      duration: 80,
    })

    if (this.hp <= 0) this.kill()
  }

  updateHpBar() {
    const pct = Math.max(0, this.hp / this.maxHp)
    this.hpBar.width = 34 * pct
    this.hpBar.fillColor = pct > 0.5 ? 0x22dd22 : pct > 0.25 ? 0xffaa00 : 0xff2222
  }

  applyFreeze(duration) {
    this.frozen = duration
    this.slowed = duration + 3000
    this.slowFactor = 0.3
  }

  applySlow(duration, factor) {
    if (this.frozen > 0) return
    this.slowed = duration
    this.slowFactor = 1 - factor
  }

  applyPoison(dps, duration) {
    this.poisoned  = Math.max(this.poisoned, duration)
    this.poisonDps = Math.max(this.poisonDps, dps)
    this.poisonTick = 0
  }

  kill() {
    if (this.dead) return
    this.dead = true
    this.scene.gold += this.data.reward
    this.scene.events.emit('gold_changed', this.scene.gold)
    this.scene.events.emit('enemy_killed', this)

    // Death burst
    this.scene.spawnParticles(this.container.x, this.container.y, 'death', this.data.color)

    // Spread venom on death
    if (this.poisoned > 0) {
      this.scene.enemies.forEach(e => {
        if (e === this || e.dead) return
        const dx = e.container.x - this.container.x
        const dy = e.container.y - this.container.y
        if (Math.sqrt(dx*dx + dy*dy) < 80) e.applyPoison(this.poisonDps, 3000)
      })
    }

    this.destroy()
  }

  destroy() {
    if (this.frozenVfx) { this.frozenVfx.destroy(); this.frozenVfx = null }
    this.container.destroy()
    const i = this.scene.enemies.indexOf(this)
    if (i >= 0) this.scene.enemies.splice(i, 1)
  }
}

// ── Projectile ───────────────────────────────────────────────────────
class Projectile {
  constructor(scene, tower, target, angleOffset = 0) {
    this.scene   = scene
    this.tower   = tower
    this.target  = target
    this.speed   = tower.data.projectileSpeed
    this.damage  = tower.getDamage()
    this.special = tower.data.special
    this.done    = false
    this.pierce  = this.special === 'pierce'
    this.pierced = new Set()

    const td = tower.data
    const r  = this.special === 'chomp' ? 0 : 7

    if (this.special === 'chomp') {
      // Instant AOE — no flying projectile
      this._applyChomp()
      this.done = true
      return
    }

    this.x = tower.x
    this.y = tower.y

    // Visual
    const color = td.projectileColor
    if (this.special === 'stomp' || this.special === 'mud' || this.special === 'ice') {
      this.gfx = scene.add.circle(this.x, this.y, 10, color).setDepth(7)
      scene.tweens.add({ targets: this.gfx, scale: { from: 0.6, to: 1 }, duration: 100 })
    } else if (this.special === 'pierce') {
      this.gfx = scene.add.triangle(this.x, this.y, 0, -10, 8, 8, -8, 8, color).setDepth(7)
    } else {
      this.gfx = scene.add.circle(this.x, this.y, r, color).setDepth(7)
    }

    // Glow effect
    this.glow = scene.add.circle(this.x, this.y, r + 4, color, 0.3).setDepth(6)

    // Angle offset for triple shot
    if (angleOffset !== 0) {
      const angle = Math.atan2(target.container.y - tower.y, target.container.x - tower.x)
      const offAngle = angle + angleOffset
      this._dx = Math.cos(offAngle)
      this._dy = Math.sin(offAngle)
      this._freeDir = true
    }
  }

  _applyChomp() {
    const r = this.tower.data.chompRadius * (1 + (this.tower.level-1)*0.15)
    this.scene.enemies.forEach(e => {
      if (e.dead) return
      const dx = e.container.x - this.tower.x
      const dy = e.container.y - this.tower.y
      if (Math.sqrt(dx*dx + dy*dy) <= r) {
        e.takeDamage(this.damage, this.special)
      }
    })
    // Big hit explosion
    this.scene.spawnParticles(this.tower.x, this.tower.y, 'explosion', 0xFF4444)
    this.scene.cameras.main.shake(250, 0.015)
  }

  update(delta) {
    if (this.done) return

    // Free-direction (triple shot extras)
    if (this._freeDir) {
      const step = this.speed * (delta / 1000)
      this.x += this._dx * step
      this.y += this._dy * step
      if (this.gfx) { this.gfx.setPosition(this.x, this.y); this.glow.setPosition(this.x, this.y) }
      // Check collisions along path
      for (const e of [...this.scene.enemies]) {
        if (e.dead || this.pierced.has(e)) continue
        const dx = e.container.x - this.x, dy = e.container.y - this.y
        if (Math.sqrt(dx*dx + dy*dy) < e.data.size + 8) {
          this._hitEnemy(e)
          if (!this.pierce) { this._destroy(); return }
        }
      }
      if (this.x < -100 || this.x > this.scene.scale.width + 100 ||
          this.y < -100 || this.y > this.scene.scale.height + 100) {
        this._destroy()
      }
      return
    }

    if (!this.target || this.target.dead) { this._destroy(); return }

    const tx = this.target.container.x, ty = this.target.container.y
    const dx = tx - this.x, dy = ty - this.y
    const dist = Math.sqrt(dx*dx + dy*dy)
    const step = this.speed * (delta / 1000)

    if (dist <= step + 4) {
      this._hitEnemy(this.target)
      if (!this.pierce) { this._destroy(); return }
    } else {
      this.x += (dx/dist) * step
      this.y += (dy/dist) * step
      if (this.gfx) { this.gfx.setPosition(this.x, this.y); this.glow.setPosition(this.x, this.y) }
    }

    // Pierce: check all enemies near path
    if (this.pierce) {
      for (const e of [...this.scene.enemies]) {
        if (e.dead || this.pierced.has(e)) continue
        const ex = e.container.x - this.x, ey = e.container.y - this.y
        if (Math.sqrt(ex*ex + ey*ey) < e.data.size + 6) this._hitEnemy(e)
      }
    }
  }

  _hitEnemy(enemy) {
    if (enemy.dead || this.pierced.has(enemy)) return
    this.pierced.add(enemy)

    let dmg = this.damage
    const sp = this.special

    // Panda double vs debuffed
    if (sp === 'bamboo' && (enemy.poisoned > 0 || enemy.slowed > 0)) dmg *= 2

    enemy.takeDamage(dmg, sp)
    this.scene.spawnParticles(enemy.container.x, enemy.container.y, 'hit', this.tower.data.projectileColor)

    switch (sp) {
      case 'mud':
        this.scene.aoeEffect(this.x, this.y, this.tower.data.mudRadius, (e) => {
          e.applySlow(this.tower.data.mudDuration, this.tower.data.mudSlow)
        })
        this.scene.spawnParticles(this.x, this.y, 'mud', 0x8B4513)
        break
      case 'ice':
        this.scene.aoeEffect(this.x, this.y, this.tower.data.iceRadius, (e) => {
          e.applyFreeze(this.tower.data.iceDuration)
        })
        this.scene.spawnParticles(this.x, this.y, 'ice', 0xADD8E6)
        break
      case 'stomp':
        this.scene.aoeEffect(this.x, this.y, this.tower.data.stompRadius, (e) => {
          e.takeDamage(this.damage * 0.6, 'aoe')
          e.applySlow(2500, 0.5)
        })
        this.scene.spawnParticles(this.x, this.y, 'explosion', 0xFF4500)
        this.scene.cameras.main.shake(180, 0.012)
        break
      case 'venom':
        enemy.applyPoison(this.tower.data.venomDps, this.tower.data.venomDuration)
        break
      case 'chain': {
        let last = enemy
        for (let c = 1; c < this.tower.data.chainCount; c++) {
          const next = this.scene.enemies
            .filter(e => !e.dead && e !== last && !this.pierced.has(e))
            .reduce((best, e) => {
              const dx = e.container.x - last.container.x
              const dy = e.container.y - last.container.y
              const d = Math.sqrt(dx*dx+dy*dy)
              if (d < this.tower.data.chainRange && (!best || d < best.d)) return { e, d }
              return best
            }, null)
          if (!next) break
          this.pierced.add(next.e)
          next.e.takeDamage(this.damage * 0.7, 'chain')
          this.scene.spawnParticles(next.e.container.x, next.e.container.y, 'spark', 0x00FFFF)
          // Chain lightning line
          const line = this.scene.add.graphics().setDepth(8)
          line.lineStyle(2, 0x00FFFF, 0.9)
          line.lineBetween(last.container.x, last.container.y, next.e.container.x, next.e.container.y)
          this.scene.time.delayedCall(120, () => line.destroy())
          last = next.e
        }
        break
      }
    }

    if (!this.pierce) this._destroy()
  }

  _destroy() {
    this.done = true
    if (this.gfx) { this.gfx.destroy(); this.gfx = null }
    if (this.glow) { this.glow.destroy(); this.glow = null }
    const i = this.scene.projectiles.indexOf(this)
    if (i >= 0) this.scene.projectiles.splice(i, 1)
  }
}

// ── Tower ────────────────────────────────────────────────────────────
class Tower {
  constructor(scene, key, col, row) {
    this.scene  = scene
    this.data   = TOWERS[key]
    this.col    = col
    this.row    = row
    this.x      = col * TILE_SIZE + TILE_SIZE / 2
    this.y      = row * TILE_SIZE + TILE_SIZE / 2
    this.level  = 1
    this.lastFired = 0
    this.target = null

    // Sprite
    this.sprite = scene.add.image(this.x, this.y, key)
      .setDisplaySize(52, 52).setDepth(6)

    // Platform under tower
    this.platform = scene.add.circle(this.x, this.y, 30, 0x224422, 0.7).setDepth(5)

    // Range circle (hidden)
    this.rangeCircle = scene.add.circle(this.x, this.y, this.getRange())
      .setStrokeStyle(2, 0xffffff, 0.5).setFillStyle(0xffffff, 0.07).setDepth(4)
    this.rangeCircle.setVisible(false)

    // Level badge
    this.levelBadge = scene.add.text(this.x + 18, this.y - 18, '', {
      fontSize: '12px', fontFamily: 'Arial Black', color: '#ffffff',
      backgroundColor: '#225522', padding: { x: 3, y: 1 },
    }).setDepth(9).setOrigin(0.5)

    // Spawn pop animation
    scene.tweens.add({
      targets: [this.sprite, this.platform],
      scale: { from: 0, to: 1 },
      duration: 220, ease: 'Back.Out',
    })

    // Aura ring if rabbit
    if (this.data.special === 'aura') {
      this.auraRing = scene.add.circle(this.x, this.y, this.getRange())
        .setStrokeStyle(3, 0xFFFFFF, 0.4).setFillStyle(0xFFFF44, 0.06).setDepth(3)
      scene.tweens.add({
        targets: this.auraRing,
        alpha: { from: 0.2, to: 0.7 },
        duration: 800, yoyo: true, repeat: -1,
      })
    }
  }

  getRange()  { const u = this.data.upgradeStats; return (u && this.level > 1 ? u[this.level-2]?.range : null) ?? this.data.range }
  getDamage() { const u = this.data.upgradeStats; return (u && this.level > 1 ? u[this.level-2]?.damage : null) ?? this.data.damage }
  getFireRate() {
    const u = this.data.upgradeStats
    const base = (u && this.level > 1 ? u[this.level-2]?.fireRate : null) ?? this.data.fireRate
    // Apply rabbit aura bonus
    const auraBonus = this.scene.getRabbitAuraBonus(this.col, this.row)
    return base / (1 + auraBonus)
  }
  getUpgradeCost() {
    if (this.level >= 3 || !this.data.upgradeCost) return null
    return this.data.upgradeCost[this.level - 1]
  }
  getSellValue() { return Math.floor(this.data.cost * (0.4 + (this.level-1)*0.1)) }

  upgrade() {
    if (this.level >= 3) return
    this.level++
    this.levelBadge.setText(this.level > 1 ? `Lv${this.level}` : '')
    this.rangeCircle.setRadius(this.getRange())
    if (this.auraRing) this.auraRing.setRadius(this.getRange())
    // Level-up sparkle
    this.scene.spawnParticles(this.x, this.y, 'levelup', 0xFFD700)
    this.scene.tweens.add({
      targets: this.sprite, scale: { from: 1.3, to: 1 }, duration: 200, ease: 'Back.Out',
    })
  }

  update(time, _delta) {
    if (this.data.special === 'aura') return // passive

    const fr = this.getFireRate()
    if (fr <= 0) return
    if (time - this.lastFired < fr) return

    const range = this.getRange()

    // Find enemy furthest along path that's in range
    this.target = this.scene.enemies.reduce((best, e) => {
      if (e.dead || e.reached) return best
      const dx = e.container.x - this.x, dy = e.container.y - this.y
      if (Math.sqrt(dx*dx + dy*dy) <= range) {
        if (!best || e.wpIndex > best.wpIndex) return e
      }
      return best
    }, null)

    if (!this.target) return

    this.lastFired = time
    this._fire(this.target)
  }

  _fire(target) {
    const sp = this.data.special
    // Muzzle flash
    const flash = this.scene.add.circle(this.x, this.y, 8, 0xFFFFFF, 0.9).setDepth(9)
    this.scene.tweens.add({ targets: flash, alpha: 0, scale: 2, duration: 100, onComplete: () => flash.destroy() })

    if (sp === 'chomp') {
      new Projectile(this.scene, this, target)
      return
    }

    const proj = new Projectile(this.scene, this, target)
    this.scene.projectiles.push(proj)

    if (sp === 'triple') {
      const angles = [-0.22, 0.22]
      angles.forEach(a => {
        const p2 = new Projectile(this.scene, this, target, a)
        this.scene.projectiles.push(p2)
      })
    }
  }

  showRange(visible) {
    this.rangeCircle.setVisible(visible)
    if (this.auraRing) this.auraRing.setAlpha(visible ? 1 : 0.4)
  }

  destroy() {
    this.sprite.destroy()
    this.platform.destroy()
    this.rangeCircle.destroy()
    this.levelBadge.destroy()
    if (this.auraRing) this.auraRing.destroy()
    const i = this.scene.towers.indexOf(this)
    if (i >= 0) this.scene.towers.splice(i, 1)
  }
}

// ── GameScene ────────────────────────────────────────────────────────
export default class GameScene extends Phaser.Scene {
  constructor() { super('Game') }

  init(data) {
    this.mapId    = data.mapId || 1
    this.mapData  = MAPS.find(m => m.id === this.mapId)
    this.gold     = STARTING_GOLD
    this.lives    = STARTING_LIVES
    this.waveNum  = 0
    this.waveActive   = false
    this.spawnQueue   = []
    this.spawnTimers  = []
    this.enemies      = []
    this.towers       = []
    this.projectiles  = []
    this.selectedTower = null   // key string for placement
    this.selectedBuilt = null   // Tower instance for upgrade/sell
    this.gameOver     = false
    this.victory      = false
    this.paused       = false
  }

  create() {
    const W = this.scale.width
    const mapH = MAP_ROWS * TILE_SIZE
    this.mapH = mapH

    // ── World & map ────────────────────────────────────────────────
    this._buildMap()

    // ── Input ──────────────────────────────────────────────────────
    this.input.on('pointerdown', this._onMapClick, this)
    this.input.keyboard.on('keydown-ESC', () => this._cancelSelection())

    // ── Ghost tower (placement preview) ───────────────────────────
    this.ghost = this.add.container(0, 0).setDepth(20).setAlpha(0.55).setVisible(false)
    this.ghost.add(this.add.circle(0, 0, 30, 0x44ff44, 0.3))
    this.ghost.add(this.add.circle(0, 0, 30).setStrokeStyle(2, 0x88ff88, 0.8).setFillStyle())
    this.ghostRange = this.add.circle(0, 0, 100).setStrokeStyle(2, 0xffffff, 0.4).setFillStyle().setDepth(19).setVisible(false)
    this.ghostImg = null

    this.input.on('pointermove', this._onMouseMove, this)

    // ── UI Scene ──────────────────────────────────────────────────
    this.scene.launch('UI', { mapId: this.mapId })
    const uiScene = this.scene.get('UI')

    // Subscribe to UI events
    uiScene.events.on('tower_selected', key => this._selectTower(key))
    uiScene.events.on('next_wave',      () => this._startNextWave())
    uiScene.events.on('pause_toggle',   () => this._togglePause())
    uiScene.events.on('sell_tower',     () => this._sellTower())
    uiScene.events.on('upgrade_tower',  () => this._upgradeTower())
    uiScene.events.on('close_panel',    () => this._deselectBuilt())
    uiScene.events.on('back_menu',      () => this._backToMenu())

    // Push game events to UI
    this.events.on('gold_changed',  v  => uiScene.events.emit('update_gold', v))
    this.events.on('lives_changed', v  => uiScene.events.emit('update_lives', v))
    this.events.on('wave_changed',  v  => uiScene.events.emit('update_wave', v))
    this.events.on('enemy_killed',  () => {
      const alive = this.enemies.length + this.spawnQueue.length
      if (this.waveActive && alive === 0) this._onWaveComplete()
    })

    // Initial UI state
    this.events.emit('gold_changed',  this.gold)
    this.events.emit('lives_changed', this.lives)
    this.events.emit('wave_changed',  this.waveNum)

    // Start wave 1 auto after short delay
    this.time.delayedCall(1500, () => this._startNextWave())
  }

  // ── Map building ──────────────────────────────────────────────────
  _buildMap() {
    const grid = this.mapData.grid

    const isPath = (c, r) => {
      if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return false
      return grid[r][c] === 1
    }

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const cell = grid[row][col]
        const cx = col * TILE_SIZE + TILE_SIZE / 2
        const cy = row * TILE_SIZE + TILE_SIZE / 2

        if (cell === 1) {
          // PATH: plain sand base
          this.add.image(cx, cy, 'tile050').setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(0)
        } else {
          // GRASS: green base
          this.add.image(cx, cy, 'tile076').setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(0)

          // Auto-tile: overlay edge/corner tile where grass meets path
          const N = isPath(col, row - 1)
          const S = isPath(col, row + 1)
          const E = isPath(col + 1, row)
          const W = isPath(col - 1, row)

          let key = null, fx = false, fy = false

          if      (N && E && !S && !W) { key = 'tile077'                   } // NE corner
          else if (N && W && !S && !E) { key = 'tile078'                   } // NW corner
          else if (S && E && !N && !W) { key = 'tile077'; fy = true        } // SE corner
          else if (S && W && !N && !E) { key = 'tile078'; fy = true        } // SW corner
          else if (N            )      { key = 'tile001'                   } // N edge
          else if (S            )      { key = 'tile001'; fy = true        } // S edge
          else if (E            )      { key = 'tile094'                   } // E edge
          else if (W            )      { key = 'tile099'                   } // W edge

          if (key) {
            this.add.image(cx, cy, key)
              .setDisplaySize(TILE_SIZE, TILE_SIZE)
              .setDepth(1)
              .setFlipX(fx)
              .setFlipY(fy)
          }

          // Bush decoration
          if (cell === 2) {
            this.add.image(cx, cy, 'tile130')
              .setDisplaySize(TILE_SIZE - 10, TILE_SIZE - 10)
              .setDepth(2)
          }
        }
      }
    }

    // Subtle grid overlay on buildable cells only
    const overlay = this.add.graphics().setDepth(1).setAlpha(0.10)
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        if (grid[row][col] === 0) {
          overlay.lineStyle(1, 0x88ff88, 1)
          overlay.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        }
      }
    }

    // Spawn & exit markers — centered in the 2-wide entry/exit rows
    const spawnY = this.mapData.spawnRow * TILE_SIZE + TILE_SIZE / 2 - 13
    const exitY  = this.mapData.exitRow  * TILE_SIZE + TILE_SIZE / 2 - 13
    this.add.text(4, spawnY, '▶', { fontSize: '26px' }).setDepth(2)
    this.add.text(MAP_COLS * TILE_SIZE - 38, exitY, '🏁', { fontSize: '26px' }).setDepth(2)
  }

  // ── Wave system ────────────────────────────────────────────────────
  _startNextWave() {
    if (this.waveActive || this.gameOver || this.victory) return
    if (this.waveNum >= TOTAL_WAVES) return

    this.waveNum++
    this.waveActive = true
    this.events.emit('wave_changed', this.waveNum)

    const waveDef = WAVES[this.mapId][this.waveNum - 1]
    this.spawnQueue = []

    waveDef.forEach(group => {
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push({
          type:  group.type,
          spawnAt: group.delay + i * group.interval,
        })
      }
    })

    this.spawnQueue.sort((a, b) => a.spawnAt - b.spawnAt)

    // Schedule spawns
    this.spawnTimers.forEach(t => t.remove())
    this.spawnTimers = []
    this.spawnQueue.forEach(item => {
      const t = this.time.delayedCall(item.spawnAt, () => {
        this._spawnEnemy(item.type)
        this.spawnQueue = this.spawnQueue.filter(q => q !== item)
        if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
          this._onWaveComplete()
        }
      })
      this.spawnTimers.push(t)
    })
  }

  _spawnEnemy(type) {
    const wp = this.mapData.waypoints
    const flyStart = { x: wp[0].x, y: wp[0].y }
    const flyEnd   = { x: wp[wp.length - 1].x, y: wp[wp.length - 1].y }
    const e = new Enemy(this, type, wp, flyStart, flyEnd)
    this.enemies.push(e)
  }

  _onWaveComplete() {
    if (!this.waveActive) return
    this.waveActive = false
    const uiScene = this.scene.get('UI')
    if (this.waveNum >= TOTAL_WAVES) {
      this._triggerVictory()
    } else {
      uiScene?.events.emit('wave_complete', this.waveNum)
      // Gold bonus for completing wave
      const bonus = 20 + this.waveNum * 5
      this.gold += bonus
      this.events.emit('gold_changed', this.gold)
      uiScene?.events.emit('show_bonus', bonus)
    }
  }

  // ── Game over / victory ───────────────────────────────────────────
  _loseLife() {
    this.lives--
    this.events.emit('lives_changed', this.lives)
    this.cameras.main.shake(300, 0.018)
    if (this.lives <= 0) this._triggerGameOver()
  }

  _triggerGameOver() {
    if (this.gameOver) return
    this.gameOver = true
    this.scene.get('UI')?.events.emit('game_over', { wave: this.waveNum })
    this.spawnTimers.forEach(t => t.remove())
  }

  _triggerVictory() {
    if (this.victory) return
    this.victory = true
    // Save progress
    const progress = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')
    progress[`map${this.mapId}_complete`] = true
    const prev = progress[`map${this.mapId}_best`] || 0
    progress[`map${this.mapId}_best`] = Math.max(prev, this.waveNum)
    // Unlock next map
    if (this.mapId < MAPS.length) progress[`map${this.mapId + 1}_unlocked`] = true
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress))

    this.scene.get('UI')?.events.emit('victory', { gold: this.gold })
    this.spawnTimers.forEach(t => t.remove())
    // Victory fireworks
    this._launchFireworks()
  }

  _launchFireworks() {
    const W = this.scale.width
    const colors = [0xFF0000,0xFF7700,0xFFFF00,0x00FF00,0x00FFFF,0x0055FF,0xFF00FF]
    let count = 0
    const burst = () => {
      if (count++ > 12) return
      const x = Phaser.Math.Between(100, W - 100)
      const y = Phaser.Math.Between(80, 300)
      this.spawnParticles(x, y, 'firework', colors[count % colors.length])
      this.cameras.main.flash(120, 255, 255, 255, false, null, null, 0.05)
      this.time.delayedCall(350, burst)
    }
    burst()
  }

  // ── Tower placement ────────────────────────────────────────────────
  _selectTower(key) {
    if (!key) { this._cancelSelection(); return }
    this._deselectBuilt()
    this.selectedTower = key
    // Update ghost image
    if (this.ghostImg) { this.ghostImg.destroy(); this.ghostImg = null }
    this.ghostImg = this.add.image(0, 0, key).setDisplaySize(48, 48).setDepth(21)
    this.ghost.setVisible(true)
    this.ghostRange.setRadius(TOWERS[key].range).setVisible(true)
  }

  _cancelSelection() {
    this.selectedTower = null
    this.ghost.setVisible(false)
    this.ghostRange.setVisible(false)
    this._deselectBuilt()
  }

  _deselectBuilt() {
    if (this.selectedBuilt) {
      this.selectedBuilt.showRange(false)
      this.selectedBuilt = null
    }
    this.scene.get('UI')?.events.emit('tower_panel_hide')
  }

  _onMouseMove(ptr) {
    if (!this.selectedTower) return
    const col = Math.floor(ptr.x / TILE_SIZE)
    const row = Math.floor(ptr.y / TILE_SIZE)
    if (ptr.x >= MAP_COLS * TILE_SIZE || row >= MAP_ROWS) return
    const cx = col * TILE_SIZE + TILE_SIZE / 2
    const cy = row * TILE_SIZE + TILE_SIZE / 2
    this.ghost.setPosition(cx, cy)
    this.ghostRange.setPosition(cx, cy)
    if (this.ghostImg) this.ghostImg.setPosition(cx, cy)
    const ok = isBuildable(this.mapData.grid, col, row) &&
               !this.towers.find(t => t.col === col && t.row === row)
    this.ghost.setAlpha(ok ? 0.75 : 0.3)
    this.ghost.list[0].setFillStyle(ok ? 0x44ff44 : 0xff4444, 0.3)
    this.ghost.list[1].setStrokeStyle(2, ok ? 0x88ff88 : 0xff8888, 0.8)
  }

  _onMapClick(ptr) {
    // Don't handle clicks in side panel
    if (ptr.x >= MAP_COLS * TILE_SIZE) return

    const col = Math.floor(ptr.x / TILE_SIZE)
    const row = Math.floor(ptr.y / TILE_SIZE)

    // Click existing tower → select for upgrade/sell
    const existing = this.towers.find(t => t.col === col && t.row === row)
    if (existing && !this.selectedTower) {
      this._deselectBuilt()
      this.selectedBuilt = existing
      existing.showRange(true)
      this.scene.get('UI')?.events.emit('tower_panel_show', {
        tower: existing.data,
        level: existing.level,
        upgradeCost: existing.getUpgradeCost(),
        sellValue:   existing.getSellValue(),
      })
      return
    }

    if (this.selectedTower) {
      if (!isBuildable(this.mapData.grid, col, row)) return
      if (existing) return
      const cost = TOWERS[this.selectedTower].cost
      if (this.gold < cost) {
        this.cameras.main.shake(100, 0.006)
        this.scene.get('UI')?.events.emit('not_enough_gold')
        return
      }
      this.gold -= cost
      this.events.emit('gold_changed', this.gold)
      const t = new Tower(this, this.selectedTower, col, row)
      this.towers.push(t)
      this._cancelSelection()
    }

    // Deselect ghost on empty grass click
    if (!this.selectedTower) this._deselectBuilt()
  }

  _upgradeTower() {
    if (!this.selectedBuilt) return
    const cost = this.selectedBuilt.getUpgradeCost()
    if (!cost || this.gold < cost) { this.cameras.main.shake(80, 0.005); return }
    this.gold -= cost
    this.events.emit('gold_changed', this.gold)
    this.selectedBuilt.upgrade()
    this.scene.get('UI')?.events.emit('tower_panel_show', {
      tower: this.selectedBuilt.data,
      level: this.selectedBuilt.level,
      upgradeCost: this.selectedBuilt.getUpgradeCost(),
      sellValue:   this.selectedBuilt.getSellValue(),
    })
  }

  _sellTower() {
    if (!this.selectedBuilt) return
    const val = this.selectedBuilt.getSellValue()
    this.gold += val
    this.events.emit('gold_changed', this.gold)
    this.selectedBuilt.destroy()
    this.selectedBuilt = null
    this.scene.get('UI')?.events.emit('tower_panel_hide')
  }

  _togglePause() {
    this.paused = !this.paused
    this.physics.world?.pause?.()
    if (this.paused) {
      this.time.timeScale = 0
      this.tweens.timeScale = 0
    } else {
      this.time.timeScale = 1
      this.tweens.timeScale = 1
    }
  }

  _backToMenu() {
    this.scene.stop('UI')
    this.scene.start('Menu')
  }

  // ── Helpers ───────────────────────────────────────────────────────
  getRabbitAuraBonus(col, row) {
    return this.towers.reduce((sum, t) => {
      if (t.data.special !== 'aura') return sum
      const dx = (t.col - col) * TILE_SIZE
      const dy = (t.row - row) * TILE_SIZE
      if (Math.sqrt(dx*dx + dy*dy) <= t.getRange()) {
        const bonus = t.data.auraBonus * (1 + (t.level-1)*0.2)
        return sum + bonus
      }
      return sum
    }, 0)
  }

  aoeEffect(x, y, radius, fn) {
    this.enemies.forEach(e => {
      if (e.dead) return
      const dx = e.container.x - x, dy = e.container.y - y
      if (Math.sqrt(dx*dx + dy*dy) <= radius) fn(e)
    })
  }

  spawnParticles(x, y, type, tint) {
    const configs = {
      death:     { tex: 'flame_01',  count: 12, speedMin: 80,  speedMax: 200, scale: 0.08, life: 600  },
      hit:       { tex: 'spark_01',  count: 5,  speedMin: 60,  speedMax: 130, scale: 0.06, life: 350  },
      explosion: { tex: 'flame_02',  count: 18, speedMin: 100, speedMax: 260, scale: 0.12, life: 800  },
      mud:       { tex: 'smoke_01',  count: 8,  speedMin: 40,  speedMax: 100, scale: 0.10, life: 700  },
      ice:       { tex: 'circle_01', count: 10, speedMin: 60,  speedMax: 150, scale: 0.07, life: 600  },
      spark:     { tex: 'spark_02',  count: 6,  speedMin: 80,  speedMax: 180, scale: 0.07, life: 400  },
      levelup:   { tex: 'star_01',   count: 14, speedMin: 60,  speedMax: 160, scale: 0.08, life: 800  },
      firework:  { tex: 'star_03',   count: 30, speedMin: 100, speedMax: 320, scale: 0.12, life: 1200 },
    }
    const cfg = configs[type] || configs.hit

    const emitter = this.add.particles(x, y, cfg.tex, {
      speed:    { min: cfg.speedMin, max: cfg.speedMax },
      angle:    { min: 0, max: 360 },
      scale:    { start: cfg.scale, end: 0 },
      alpha:    { start: 1, end: 0 },
      lifespan: cfg.life,
      quantity: cfg.count,
      tint:     tint || 0xFFFFFF,
      emitting: false,
    }).setDepth(10)

    emitter.explode(cfg.count)
    this.time.delayedCall(cfg.life + 100, () => { try { emitter.destroy() } catch {} })
  }

  // ── Main update loop ──────────────────────────────────────────────
  update(time, delta) {
    if (this.paused || this.gameOver || this.victory) return

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]
      e.update(delta)
      if (e.reached) {
        this._loseLife()
        if (this.enemies[i] === e) this.enemies.splice(i, 1)
      }
    }

    // Update towers
    this.towers.forEach(t => t.update(time, delta))

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.projectiles[i].update(delta)
    }

    // Check wave end condition (all spawned + all dead/reached)
    if (this.waveActive && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this._onWaveComplete()
    }
  }
}
