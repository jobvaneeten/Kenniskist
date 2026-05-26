import Phaser from 'phaser'

const TD = '/Towerdefence/'

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot') }

  preload() {
    const W = this.scale.width, H = this.scale.height

    // ── Loading bar ────────────────────────────────────────────────
    const barBg = this.add.rectangle(W/2, H/2, 400, 20, 0x333333).setOrigin(0.5)
    const bar   = this.add.rectangle(W/2 - 200, H/2, 0, 16, 0x44cc44).setOrigin(0, 0.5)
    this.add.text(W/2, H/2 - 40, 'Laden…', {
      fontSize: '22px', color: '#ffffff', fontFamily: 'Arial',
    }).setOrigin(0.5)

    this.load.on('progress', v => { bar.width = 400 * v })
    this.load.on('complete', () => { barBg.destroy(); bar.destroy() })

    // ── Map tiles ─────────────────────────────────────────────────
    // Base terrain
    const mapTiles = [
      50,   // pure sand (path center)
      76,   // pure grass (buildable)
      // Grass↔Sand transition tiles (used for auto-tiling path edges)
      1,    // grass cell, path to N  (sand top, grass bottom)
      77,   // grass cell, path N+E corner (sand top-right)
      78,   // grass cell, path N+W corner (sand top-left)
      94,   // grass cell, path to E  (grass left, sand right)
      99,   // grass cell, path to W  (sand left, grass right)
      // Decorations
      130,  // bush
      54,   // stone circle (path detail)
    ]
    mapTiles.forEach(n => {
      const id = String(n).padStart(3, '0')
      this.load.image(`tile${id}`, `${TD}Map/towerDefense_tile${id}.png`)
    })

    // ── Animal towers ─────────────────────────────────────────────
    const animals = ['elephant','giraffe','hippo','monkey','panda','parrot','penguin','pig','rabbit','snake']
    animals.forEach(a => this.load.image(a, `${TD}Dieren/${a}.png`))

    // ── Particle textures ─────────────────────────────────────────
    const particles = [
      'flame_01','flame_02','flame_03','flame_04','flame_05','flame_06',
      'smoke_01','smoke_02','smoke_03','smoke_04','smoke_05',
      'star_01','star_02','star_03','star_04','star_05',
      'spark_01','spark_02','spark_03','spark_04',
      'magic_01','magic_02','magic_03',
      'circle_01','circle_02','circle_03',
      'light_01','light_02',
      'slash_01','slash_02',
      'twirl_01','twirl_02',
    ]
    particles.forEach(p => this.load.image(p, `${TD}Particals/${p}.png`))

    // ── UI assets ─────────────────────────────────────────────────
    this.load.image('btn_green',  `${TD}Ui/Green/Default/button_rectangle_depth_flat.png`)
    this.load.image('btn_red',    `${TD}Ui/Red/Default/button_rectangle_depth_flat.png`)
    this.load.image('btn_yellow', `${TD}Ui/Yellow/Default/button_rectangle_depth_flat.png`)
    this.load.image('btn_grey',   `${TD}Ui/Grey/Default/button_rectangle_depth_flat.png`)
  }

  create() {
    this.scene.start('Menu')
  }
}
