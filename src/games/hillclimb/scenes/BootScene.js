import Phaser from 'phaser'
import { LEVEL_ORDER, LEVELS } from '../data/LevelData.js'
import { VEHICLE_ORDER } from '../data/VehicleData.js'

const HC = '/Hillclimb/'

export default class BootScene extends Phaser.Scene {
  constructor() { super('HCBoot') }

  preload() {
    // Meer dan 32 assets: alles direct dispatchen, anders blijft de rest in
    // de wachtrij hangen wanneer de tab op de achtergrond staat.
    this.load.maxParallelDownloads = 64
    const W = this.scale.width, H = this.scale.height

    // Laadscherm: donkere gradient, speltitel en een omrande voortgangsbalk
    // met percentage — alles programmatisch (assets zijn er nu nog niet).
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x1c2333, 0x1c2333, 0x0d1018, 0x0d1018, 1)
    bg.fillRect(0, 0, W, H)
    const titel = this.add.text(W / 2, H / 2 - 86, 'BERGRIJDEN', {
      fontSize: '52px', fontFamily: 'Arial Black', color: '#ffd23f',
      stroke: '#3a2a08', strokeThickness: 8,
    }).setOrigin(0.5).setShadow(0, 6, '#000000', 10)
    const sub = this.add.text(W / 2, H / 2 - 40, '🚗 Laden…', {
      fontSize: '18px', color: '#aab4c8', fontFamily: 'Arial',
    }).setOrigin(0.5)
    const bw = 420, bh = 26, bx = W / 2 - bw / 2, by = H / 2
    const barBg = this.add.graphics()
    barBg.fillStyle(0x000000, 0.45); barBg.fillRoundedRect(bx + 2, by + 4, bw, bh, 13)
    barBg.fillStyle(0x10141c, 1); barBg.fillRoundedRect(bx, by, bw, bh, 13)
    barBg.lineStyle(2, 0x55617a, 0.9); barBg.strokeRoundedRect(bx, by, bw, bh, 13)
    const bar = this.add.graphics()
    const pct = this.add.text(W / 2, by + bh + 24, '0%', {
      fontSize: '15px', fontFamily: 'Arial Black', color: '#7ed957',
    }).setOrigin(0.5)
    this.load.on('progress', v => {
      bar.clear()
      const w = Math.max(bh, (bw - 8) * v)
      bar.fillGradientStyle(0xa5e878, 0xa5e878, 0x4f9e3a, 0x4f9e3a, 1)
      bar.fillRoundedRect(bx + 4, by + 4, w, bh - 8, 9)
      bar.fillStyle(0xffffff, 0.25); bar.fillRoundedRect(bx + 6, by + 6, w - 4, (bh - 8) * 0.4, 6)
      pct.setText(`${Math.round(v * 100)}%`)
    })
    this.load.on('complete', () => { bg.destroy(); titel.destroy(); sub.destroy(); barBg.destroy(); bar.destroy(); pct.destroy() })

    // Parallax-achtergronden, levelkaartjes en voertuig-sprites (Nano Banana);
    // het terrein wordt programmatisch getekend.
    VEHICLE_ORDER.forEach(id => {
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
    this.scene.start('HCHome')
  }
}
