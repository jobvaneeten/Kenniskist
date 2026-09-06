import Phaser from 'phaser'
import { LEVELS, saveLevelBest } from '../data/LevelData.js'
import { applyUpgrades, loadUpgrades } from '../data/VehicleData.js'
import { TerrainManager, heightAt, CHUNK_WIDTH } from '../terrain.js'
import { Vehicle } from '../vehicle.js'

const PPM = 12                 // pixels per "meter" (afstand-eenheid van de levels)
const START_X = 140
// 0 = de kop raakt het grondoppervlak → crash. (Positief zou al boven de
// grond aftikken en maakt elke landing dodelijk, sterk negatief is te mild.)
const CRASH_MARGIN = 0
const PROP_CHUNK = CHUNK_WIDTH
const CURUNTIE_PER_COIN = 2

function propHash(n, salt) {
  const s = Math.sin(n * 91.7 + salt * 17.3) * 43758.5453
  return s - Math.floor(s)
}

export default class GameScene extends Phaser.Scene {
  constructor() { super('HCGame') }

  init({ vehicleId, levelId }) {
    this.vehicleId = vehicleId
    this.levelId = levelId
    this.level = LEVELS[levelId]
    const upgrades = loadUpgrades()
    this.stats = applyUpgrades(vehicleId, upgrades[vehicleId])
    this.fuel = this.stats.maxFuel
    this.coins = 0
    this.distance = 0
    this.gameOver = false
    this.touchGas = false
    this.touchBrake = false
    this._airborneSince = null
    this._spinAccum = 0
    this._lastAngle = 0
    this._flippedSince = null
    this._stuckTijd = 0
  }

  create() {
    // 1.6× basiszwaartekracht: sneller/strakker vallen (maan blijft zweverig
    // door zijn lage gravityScale)
    this.matter.world.setGravity(0, this.level.gravityScale * 1.6)

    const startY = heightAt(this.level, START_X) - 90
    this.vehicle = new Vehicle(this, START_X, startY, this.stats)
    this._lastAngle = this.vehicle.angle

    this.terrain = new TerrainManager(this, this.level)
    this.terrain.ensureRange(START_X - 400, START_X + 1600)

    this._buildParallax()

    // Nano Banana-carrosserie (zonder wielen) geschaald op de physics-box;
    // losse wiel-sprites draaien op de echte wielposities er bovenop.
    this.chassisImg = this.add.image(0, 0, `hc_body_${this.vehicleId}`).setDepth(9)
    const aspect = this.chassisImg.width / this.chassisImg.height
    const dw = this.stats.chassisW * 1.35
    // origin per voertuig (uit VehicleData.art): lijnt de wielgaten in de
    // carrosserie-art uit met de physics-wielposities — originX omdat het
    // wielpaar-midden in de tekening niet altijd op het beeldmidden ligt.
    this.chassisImg.setDisplaySize(dw, dw / aspect)
      .setOrigin(this.stats.art?.originX ?? 0.5, this.stats.art?.originY ?? 0.62)
    // Weergavestraal per kant (art.dispL/dispR of art.disp): iets groter dan
    // de physics-straal zodat het weggewiste wielgat in de carrosserie altijd
    // bedekt blijft; tractor heeft bewust een groter achter- dan voorwiel.
    const art = this.stats.art || {}
    const wdL = (art.dispL ?? art.disp ?? this.stats.wheelRadius) * 2
    const wdR = (art.dispR ?? art.disp ?? this.stats.wheelRadius) * 2
    this.wheelLImg  = this.add.image(0, 0, `hc_wiel_${this.vehicleId}`).setDepth(10).setDisplaySize(wdL, wdL)
    this.wheelRImg  = this.add.image(0, 0, `hc_wiel_${this.vehicleId}`).setDepth(10).setDisplaySize(wdR, wdR)
    // Bestuurder-positie per voertuig (bus/brandweer voorin, motor er bovenop,
    // raceauto laag in de cockpit) — zie driver-config in VehicleData.
    const drv = this.stats.driver || { x: -0.06, lift: 0.46, scale: 1.7 }
    this.driverImg  = this.add.image(0, 0, 'hc_bestuurder').setDepth(8.5)
    const dh = this.stats.chassisH * drv.scale
    const dAspect = this.driverImg.width / this.driverImg.height
    this.driverImg.setDisplaySize(dh * dAspect, dh)
    this._driverLift = this.stats.chassisH / 2 + dh * drv.lift
    this._driverX = this.stats.chassisW * drv.x

    this._buildDustTexture()
    this.dustEmitter = this.add.particles(0, 0, 'hc_dust', {
      speed: { min: 40, max: 150 },
      angle: { min: 200, max: 340 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.75, end: 0 },
      lifespan: { min: 250, max: 450 },
      tint: 0x9c7a52,
      emitting: false,
    }).setDepth(9.5)

    this.propChunks = new Map()
    this._ensureProps(START_X - 400, START_X + 1600)

    this.signs = new Map()
    this._ensureSigns(START_X - 400, START_X + 1600)

    this.cameras.main.setBackgroundColor(0x000000)
    this._camY = startY

    this._setupInput()

    this.matter.world.on('collisionstart', ev => this._onCollision(ev, true))
    this.matter.world.on('collisionend',   ev => this._onCollision(ev, false))

    this.scene.launch('HCUI', { levelId: this.levelId })
    this._pushHud()

    this.time.delayedCall(700, () => {
      this._hint('Geef gas met ▶ — maar tik het, want te lang vasthouden laat je achterover kantelen.')
    })

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this._cleanup, this)
  }

  // Maakt van een achtergrond een naadloos herhaalbare texture door hem
  // gespiegeld te verdubbelen: [beeld][spiegelbeeld] loopt altijd perfect
  // door, ongeacht hoe de randen van het origineel eruitzien.
  _seamlessKey(key) {
    const mk = `${key}_seam`
    if (!this.textures.exists(mk)) {
      const src = this.textures.get(key).getSourceImage()
      const w = src.width, h = src.height
      const ct = this.textures.createCanvas(mk, w * 2, h)
      const ctx = ct.getContext()
      ctx.drawImage(src, 0, 0)
      ctx.save(); ctx.translate(w * 2, 0); ctx.scale(-1, 1); ctx.drawImage(src, 0, 0); ctx.restore()
      ct.refresh()
    }
    return mk
  }

  _buildParallax() {
    const W = this.scale.width, H = this.scale.height
    this.parallax = this.level.bg.map((key, i) => {
      const factor = [0.04, 0.18, 0.45][i]
      const img = this.add.tileSprite(0, 0, W, H, this._seamlessKey(key))
        .setOrigin(0, 0).setScrollFactor(0).setDepth(i)
      img._factor = factor
      return img
    })
  }

  _buildDustTexture() {
    if (this.textures.exists('hc_dust')) return
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(8, 8, 8)
    g.generateTexture('hc_dust', 16, 16)
    g.destroy()
  }

  // Stofwolkje bij een wiel — grotere burst bij hardere inslag/meer gas.
  _spawnDust(x, y, intensity = 1) {
    this.dustEmitter.emitParticleAt(x, y, Math.round(3 + intensity * 9))
  }

  _setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys()
    this.keys = this.input.keyboard.addKeys('W,A,S,D')
  }

  setTouchThrottle(dir, active) {
    if (dir > 0) this.touchGas = active
    else this.touchBrake = active
  }

  _onCollision(ev, starting) {
    const d = starting ? 1 : -1
    ev.pairs.forEach(p => {
      const a = p.bodyA, b = p.bodyB
      if (a.label !== 'ground' && b.label !== 'ground') return
      const v = this.vehicle
      if (a === v.wheelL || b === v.wheelL) v.contactsL = Math.max(0, v.contactsL + d)
      if (a === v.wheelR || b === v.wheelR) v.contactsR = Math.max(0, v.contactsR + d)
    })
  }

  _ensureProps(minX, maxX) {
    const i0 = Math.floor(minX / PROP_CHUNK), i1 = Math.floor(maxX / PROP_CHUNK)
    for (let i = i0; i <= i1; i++) {
      if (this.propChunks.has(i)) continue
      const sprites = []
      const base = i * PROP_CHUNK
      const nCoins = 3 + Math.floor(propHash(i, 1) * 3)
      for (let n = 0; n < nCoins; n++) {
        const x = base + (n + 0.5) / nCoins * PROP_CHUNK + (propHash(i * 7 + n, 2) - 0.5) * 60
        const y = heightAt(this.level, x) - 46
        const spr = this.add.image(x, y, 'hc_munt').setDepth(7).setDisplaySize(42, 42)
        spr._type = 'coin'; spr._x = x
        sprites.push(spr)
      }
      if (propHash(i, 3) < 0.4) {
        const x = base + PROP_CHUNK * (0.3 + propHash(i, 4) * 0.4)
        const y = heightAt(this.level, x) - 40
        const spr = this.add.image(x, y, 'hc_jerrycan').setDepth(7).setDisplaySize(34, 40)
        spr._type = 'fuel'; spr._x = x
        sprites.push(spr)
      }
      this.propChunks.set(i, sprites)
    }
    for (const i of [...this.propChunks.keys()]) {
      if (i < i0 - 1 || i > i1 + 1) {
        this.propChunks.get(i).forEach(s => s.destroy())
        this.propChunks.delete(i)
      }
    }
  }

  _ensureSigns(minX, maxX) {
    const interval = 200 * PPM // elke 200m een afstandsbord
    const first = Math.floor(minX / interval) * interval
    for (let x = first; x <= maxX; x += interval) {
      if (x <= START_X || this.signs.has(x)) continue
      const meters = Math.round((x - START_X) / PPM)
      // voet van het bordje exact óp het terrein, tekst op het houten bord
      const groundY = heightAt(this.level, x) + 4
      const bordH = 96, bordW = 70
      const img = this.add.image(x, groundY, 'hc_bord').setOrigin(0.5, 1).setDepth(6).setDisplaySize(bordW, bordH)
      const txt = this.add.text(x, groundY - bordH * 0.72, `${meters}m`, {
        fontSize: '17px', fontFamily: 'Arial Black', color: '#ffffff', stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(6)
      this.signs.set(x, [img, txt])
    }
    for (const [x, objs] of [...this.signs.entries()]) {
      if (x < minX - 400 || x > maxX + 400) {
        objs.forEach(o => o.destroy())
        this.signs.delete(x)
      }
    }
  }

  _checkPickups() {
    // check tegen chassis én beide wielen met ruime radius, zodat je nooit
    // over een munt of jerrycan heen rijdt zonder hem te pakken
    const v = this.vehicle
    const punten = [
      { x: v.x, y: v.y },
      { x: v.wheelL.position.x, y: v.wheelL.position.y },
      { x: v.wheelR.position.x, y: v.wheelR.position.y },
    ]
    for (const sprites of this.propChunks.values()) {
      for (const s of sprites) {
        if (!s.active) continue
        const d = Math.min(...punten.map(p => Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y)))
        if (d < 64) {
          if (s._type === 'coin') { this.coins += 1 }
          else if (s._type === 'fuel') { this.fuel = Math.min(this.stats.maxFuel, this.fuel + this.stats.maxFuel * 0.45) }
          s.setActive(false).setVisible(false)
          this.time.delayedCall(50, () => s.destroy())
        }
      }
    }
  }

  addCoins(n) { this.coins += n }

  toast(msg) {
    const t = this.add.text(this.scale.width / 2, 90, msg, {
      fontSize: '26px', fontFamily: 'Arial Black', color: '#ffe066', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100)
    this.tweens.add({ targets: t, y: 50, alpha: 0, duration: 1200, onComplete: () => t.destroy() })
  }

  // Uitleg die blijft staan: langer dan een toast en lager op het scherm, zodat
  // hij niet met de vliegende scores in de weg zit.
  _hint(msg, duur = 3200) {
    this._hintTekst?.destroy()
    const t = this.add.text(this.scale.width / 2, this.scale.height - 150, msg, {
      fontSize: '20px', fontFamily: 'Arial Black', color: '#ffffff',
      stroke: '#000', strokeThickness: 5, align: 'center',
      wordWrap: { width: this.scale.width - 320 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0)
    this._hintTekst = t
    this.tweens.add({ targets: t, alpha: 1, duration: 200 })
    this.time.delayedCall(duur, () => {
      if (!t.active) return
      this.tweens.add({
        targets: t, alpha: 0, duration: 400,
        onComplete: () => { if (this._hintTekst === t) this._hintTekst = null; t.destroy() },
      })
    })
  }

  // De auto kantelt achterover als je het gas te lang vasthoudt — dat is de
  // bedoeling (zie vehicle.js), maar zonder waarschuwing snapt een kind niet
  // waarom hij steeds op zijn dak eindigt.
  _wheelieWaarschuwing(time) {
    if (this.vehicle.wheelieDruk < 0.3) return
    if (this._laatsteWaarschuwing && time - this._laatsteWaarschuwing < 2500) return
    this._laatsteWaarschuwing = time
    this._hint('⚠️ Laat het gas even los, anders kantel je achterover!', 1800)
  }

  update(time, delta) {
    if (this.gameOver) return
    const dt = delta / 1000

    let dir = 0
    if (this.cursors.right.isDown || this.keys.D.isDown || this.touchGas) dir = 1
    else if (this.cursors.left.isDown || this.keys.A.isDown || this.touchBrake) dir = -1
    this.vehicle.throttle = dir

    const burnRate = this.stats.fuelBurn * (dir !== 0 ? 2.6 : 0.5)
    if (this.fuel > 0) this.fuel = Math.max(0, this.fuel - burnRate * dt)
    if (this.fuel <= 0 && !this.gameOver) this._endRun('fuel')

    const grounded = this.vehicle.grounded
    const angle = this.vehicle.angle
    this._wheelieWaarschuwing(time)

    if (grounded && dir !== 0) {
      this._dustTimer = (this._dustTimer || 0) + dt
      if (this._dustTimer > 0.06) {
        this._dustTimer = 0
        this._spawnDust(this.vehicle.wheelL.position.x, this.vehicle.wheelL.position.y, 0.3)
        this._spawnDust(this.vehicle.wheelR.position.x, this.vehicle.wheelR.position.y, 0.3)
      }
    } else {
      this._dustTimer = 0
    }

    if (!grounded) {
      if (this._airborneSince == null) { this._airborneSince = time; this._spinAccum = 0 }
      let dA = angle - this._lastAngle
      while (dA > Math.PI) dA -= Math.PI * 2
      while (dA < -Math.PI) dA += Math.PI * 2
      this._spinAccum += Math.abs(dA)
    } else if (this._airborneSince != null) {
      const airT = (time - this._airborneSince) / 1000
      const flips = Math.floor(this._spinAccum / (Math.PI * 2))
      if (flips > 0) { this.addCoins(flips * 8); this.toast(`🤸 Flip ×${flips}! +${flips * 8}`) }
      else if (airT > 1.0) { const b = Math.floor(airT * 3); this.addCoins(b); this.toast(`✈️ Airtime! +${b}`) }
      const impact = Math.min(1, this.vehicle.speed / 14)
      if (impact > 0.15) {
        this._spawnDust(this.vehicle.wheelL.position.x, this.vehicle.wheelL.position.y, impact)
        this._spawnDust(this.vehicle.wheelR.position.x, this.vehicle.wheelR.position.y, impact)
      }
      this._airborneSince = null
      this._spinAccum = 0
    }
    this._lastAngle = angle

    this.distance = Math.max(this.distance, (this.vehicle.x - START_X) / PPM)

    // terreinhelling onder de auto, voor de relatieve kantel-drempel
    const vx = this.vehicle.x
    this.vehicle.groundSlope = Math.atan2(
      heightAt(this.level, vx + 30) - heightAt(this.level, vx - 30), 60)

    const head = this.vehicle.headWorldPos()
    const groundYAtHead = heightAt(this.level, head.x)
    if (head.y >= groundYAtHead - CRASH_MARGIN) { this._endRun('crash'); return }

    // "Bij de grond" op basis van hoogte i.p.v. wielcontact: een auto die op
    // zijn neus of dak rust heeft vaak géén wiel aan de grond.
    const bijGrond = heightAt(this.level, this.vehicle.x) - this.vehicle.y < 130

    // Over de kop: meer dan ~100° gekanteld vlak bij de grond en dat blijft
    // zo — je gaat af, ook als de kop de grond nét niet raakt.
    const flipped = Math.abs(Phaser.Math.Angle.Wrap(angle)) > 1.75 && bijGrond
    if (flipped) {
      this._flippedSince ??= time
      if (time - this._flippedSince > 700) { this._endRun('crash'); return }
    } else {
      this._flippedSince = null
    }

    // Vastliggen: voorover (of achterover) gekanteld t.o.v. het wegdek en
    // nauwelijks beweging — bijvoorbeeld op je neus tegen een heuvel — is
    // ook game-over. Accumulator i.p.v. harde reset: een vastligger wiebelt
    // (contact/snelheid flikkert even) en dat mag de teller niet wissen.
    const relLean = Math.abs(Phaser.Math.Angle.Wrap(angle) - (this.vehicle.groundSlope || 0))
    const zitVast = bijGrond && relLean > 0.7 && this.vehicle.speed < 1.6
    this._stuckTijd = zitVast
      ? (this._stuckTijd || 0) + dt
      : Math.max(0, (this._stuckTijd || 0) - dt * 2)
    if (this._stuckTijd > 1.2) { this._endRun('crash'); return }

    this.terrain.ensureRange(this.vehicle.x - 500, this.vehicle.x + 1400)
    this._ensureProps(this.vehicle.x - 500, this.vehicle.x + 1400)
    this._ensureSigns(this.vehicle.x - 500, this.vehicle.x + 1400)
    this._checkPickups()
    this._updateCamera()
    this._updateSprites()
    this._pushHud()
  }

  _updateCamera() {
    const cam = this.cameras.main
    const targetX = this.vehicle.x - this.scale.width * 0.38
    const targetY = this.vehicle.y - this.scale.height * 0.55
    this._camY += (targetY - this._camY) * 0.06
    cam.scrollX = targetX
    cam.scrollY = this._camY

    this.parallax.forEach(p => {
      p.tilePositionX = cam.scrollX * p._factor
      p.tilePositionY = cam.scrollY * p._factor * 0.3
    })
  }

  _updateSprites() {
    const v = this.vehicle
    this.chassisImg.setPosition(v.chassis.position.x, v.chassis.position.y).setRotation(v.chassis.angle)
    this.wheelLImg.setPosition(v.wheelL.position.x, v.wheelL.position.y).setRotation(v.wheelL.angle)
    this.wheelRImg.setPosition(v.wheelR.position.x, v.wheelR.position.y).setRotation(v.wheelR.angle)
    // bestuurder op zijn eigen plek per voertuig, hoog genoeg dat het gezicht
    // boven de carrosserie uitkomt — meegedraaid met het chassis
    const a = v.chassis.angle
    const lx = this._driverX, ly = -this._driverLift
    this.driverImg.setPosition(
      v.chassis.position.x + lx * Math.cos(a) - ly * Math.sin(a),
      v.chassis.position.y + lx * Math.sin(a) + ly * Math.cos(a),
    ).setRotation(a)
  }

  _pushHud() {
    this.events.emit('hc_hud', {
      fuel: this.fuel, maxFuel: this.stats.maxFuel,
      distance: this.distance, coins: this.coins,
    })
  }

  _endRun(reason) {
    if (this.gameOver) return
    this.gameOver = true
    const best = saveLevelBest(this.levelId, this.distance)
    const curuntieEarned = this.coins * CURUNTIE_PER_COIN
    try {
      const cur = parseInt(localStorage.getItem('kk_curuntie') || '0', 10)
      localStorage.setItem('kk_curuntie', String(cur + curuntieEarned))
    } catch { /* localStorage niet beschikbaar */ }
    this.events.emit('hc_gameover', {
      reason, distance: Math.round(this.distance), best: Math.round(best),
      coins: this.coins, curuntieEarned,
    })
  }

  _cleanup() {
    this.terrain?.destroy()
    this.vehicle?.destroy()
    for (const sprites of this.propChunks?.values() || []) sprites.forEach(s => s.destroy())
    for (const objs of this.signs?.values() || []) objs.forEach(o => o.destroy())
    this.scene.stop('HCUI')
  }
}
