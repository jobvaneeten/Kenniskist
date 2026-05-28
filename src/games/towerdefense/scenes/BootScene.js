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
      50,   // plain sand (path)
      24,   // clean solid green (buildable grass)
      130,  // bush (deco)
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
      'magic_01','magic_02','magic_03','magic_04','magic_05',
      'circle_01','circle_02','circle_03','circle_04','circle_05',
      'light_01','light_02','light_03',
      'slash_01','slash_02','slash_03','slash_04',
      'twirl_01','twirl_02','twirl_03',
      'dirt_01','dirt_02','dirt_03',
      'fire_01','fire_02','flare_01',
      'trace_01','trace_02','trace_03',
    ]
    particles.forEach(p => this.load.image(p, `${TD}Particals/${p}.png`))

    // ── Savanne / Gras (map 1) tiles ─────────────────────────────
    this.load.image('gras_vol',     `${TD}Map/gras/grasvol.png`)
    this.load.image('gras_h_top',   `${TD}Map/gras/towerDefense_tile047.png`)
    this.load.image('gras_h_bot',   `${TD}Map/gras/towerDefense_tile001.png`)
    this.load.image('gras_v_left',  `${TD}Map/gras/towerDefense_tile025.png`)
    this.load.image('gras_v_right', `${TD}Map/gras/towerDefense_tile023.png`)
    this.load.image('gras_full',    `${TD}Map/gras/towerDefense_tile050.png`)
    this.load.image('boom1',        `${TD}Map/gras/boom1.png`)
    this.load.image('boom2',        `${TD}Map/gras/boom2.png`)
    this.load.image('boom3',        `${TD}Map/gras/boom3.png`)

    // ── Jungle / Steen (map 2) tiles ──────────────────────────────
    this.load.image('steen_vol',     `${TD}Map/steen/steenvol.png`)
    this.load.image('steen_h_top',   `${TD}Map/steen/towerDefense_tile057.png`)
    this.load.image('steen_h_bot',   `${TD}Map/steen/towerDefense_tile011.png`)
    this.load.image('steen_v_left',  `${TD}Map/steen/towerDefense_tile033.png`)
    this.load.image('steen_v_right', `${TD}Map/steen/towerDefense_tile035.png`)
    this.load.image('steen_full',    `${TD}Map/steen/towerDefense_tile010.png`)
    this.load.image('steen1',        `${TD}Map/steen/steen1.png`)
    this.load.image('steen2',        `${TD}Map/steen/steen2.png`)
    this.load.image('steen3',        `${TD}Map/steen/steen3.png`)

    // ── Woestijn / Zand (map 3) tiles ─────────────────────────────
    this.load.image('sand_vol',     `${TD}Map/zand/zandvol.png`)
    this.load.image('sand_h_top',   `${TD}Map/zand/padzandboven.png`)
    this.load.image('sand_h_bot',   `${TD}Map/zand/padzandonder.png`)
    this.load.image('sand_v_left',  `${TD}Map/zand/padzandlinks.png`)
    this.load.image('sand_v_right', `${TD}Map/zand/padzandrechts.png`)
    this.load.image('sand_full',    `${TD}Map/zand/volledigpad.png`)
    this.load.image('cactus1',      `${TD}Map/zand/cactus1.png`)
    this.load.image('cactus2',      `${TD}Map/zand/cactus2.png`)

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
