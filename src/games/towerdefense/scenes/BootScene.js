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

    // ── Geschilderde map-achtergronden (terrein + pad in één beeld) ──
    this.load.image('bg_map1', `${TD}Map/bg_map1.webp`)
    this.load.image('bg_map2', `${TD}Map/bg_map2.webp`)
    this.load.image('bg_map3', `${TD}Map/bg_map3.webp`)

    // ── Vijand-sprites (ballon getint per laag, blimp voor de MOAB) ──
    this.load.image('balloon', `${TD}balloon.png`)
    this.load.image('blimp',   `${TD}blimp.png`)

    // ── Animal towers ─────────────────────────────────────────────
    const animals = ['elephant','giraffe','hippo','monkey','panda','parrot','penguin','pig','rabbit','snake',
                     'fish','crocodile','lion']
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

    // ── Deco-sprites per biome (geschilderde cartoon-stijl) ───────
    this.load.image('boom1',   `${TD}Map/gras/boom1.png`)
    this.load.image('boom2',   `${TD}Map/gras/boom2.png`)
    this.load.image('boom3',   `${TD}Map/gras/boom3.png`)
    this.load.image('steen1',  `${TD}Map/steen/steen1.png`)
    this.load.image('steen2',  `${TD}Map/steen/steen2.png`)
    this.load.image('steen3',  `${TD}Map/steen/steen3.png`)
    this.load.image('cactus1', `${TD}Map/zand/cactus1.png`)
    this.load.image('cactus2', `${TD}Map/zand/cactus2.png`)
  }

  create() {
    this.scene.start('Menu')
  }
}
