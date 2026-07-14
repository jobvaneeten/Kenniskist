import Phaser from 'phaser'
import { LEVEL_ORDER, LEVELS } from '../data/LevelData.js'

const HC = '/Hillclimb/'

export default class BootScene extends Phaser.Scene {
  constructor() { super('HCBoot') }

  preload() {
    const W = this.scale.width, H = this.scale.height

    const barBg = this.add.rectangle(W / 2, H / 2, 420, 22, 0x1a2a1a).setOrigin(0.5)
    const bar   = this.add.rectangle(W / 2 - 208, H / 2, 0, 16, 0x7ed957).setOrigin(0, 0.5)
    this.add.text(W / 2, H / 2 - 42, 'Laden…', {
      fontSize: '22px', color: '#ffffff', fontFamily: 'Arial',
    }).setOrigin(0.5)
    this.load.on('progress', v => { bar.width = 416 * v })
    this.load.on('complete', () => { barBg.destroy(); bar.destroy() })

    // Parallax-achtergronden, levelkaartjes en voertuig-sprites (Nano Banana);
    // bestuurder en terrein worden programmatisch getekend.
    ;['jeep', 'motor', 'monstertruck'].forEach(id => {
      this.load.image(`hc_body_${id}`, `${HC}Voertuigen/${id}.png`)
      this.load.image(`hc_wiel_${id}`, `${HC}Voertuigen/wiel_${id}.png`)
    })

    LEVEL_ORDER.forEach(id => {
      const lvl = LEVELS[id]
      this.load.image(lvl.bg[0], `${HC}Levels/${id}/lucht.webp`)
      this.load.image(lvl.bg[1], `${HC}Levels/${id}/ver.webp`)
      this.load.image(lvl.bg[2], `${HC}Levels/${id}/dichtbij.webp`)
      this.load.image(`hc_card_${id}`, `${HC}UI/level_${id}.webp`)
    })

    this.load.image('hc_bestuurder', `${HC}bestuurder.png`)
    this.load.image('hc_jerrycan',  `${HC}Props/jerrycan.png`)
    this.load.image('hc_munt',      `${HC}Props/munt.png`)
    this.load.image('hc_bord',      `${HC}Props/bord.png`)
    this.load.image('hc_gas',       `${HC}UI/gas.png`)
    this.load.image('hc_rem',       `${HC}UI/rem.png`)
    this.load.image('hc_garage_bg', `${HC}UI/garage_bg.webp`)
  }

  create() {
    this.scene.start('HCGarage')
  }
}
