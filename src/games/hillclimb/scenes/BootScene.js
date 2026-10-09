import Phaser from 'phaser'
import { LEVEL_ORDER, LEVELS } from '../data/LevelData.js'
import { VEHICLE_ORDER, VEHICLES } from '../data/VehicleData.js'
import { buildProceduralArt } from '../proceduralArt.js'
import { FONT, FONT_BODY } from '../ui.js'

const HC = '/Hillclimb/'

export default class BootScene extends Phaser.Scene {
  constructor() { super('HCBoot') }

  preload() {
    // Meer dan 32 assets: alles direct dispatchen, anders blijft de rest in
    // de wachtrij hangen wanneer de tab op de achtergrond staat.
    this.load.maxParallelDownloads = 64
    const W = this.scale.width, H = this.scale.height

    // Laadscherm in de neon-stijl van de site — alles programmatisch
    // (assets zijn er nu nog niet).
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x07061a, 0x07061a, 0x2a0f4a, 0x2a0f4a, 1)
    bg.fillRect(0, 0, W, H)
    const titel = this.add.text(W / 2, H / 2 - 86, 'BERGRIJDEN', {
      fontSize: '58px', fontFamily: FONT, fontStyle: '800', color: '#ffd23f',
    }).setOrigin(0.5).setShadow(0, 0, '#ff2f8e', 24, false, true)
    const sub = this.add.text(W / 2, H / 2 - 36, 'Motoren warmdraaien…', {
      fontSize: '18px', fontFamily: FONT_BODY, fontStyle: '700', color: '#c4b5fd',
    }).setOrigin(0.5)
    const bw = 420, bh = 18, bx = W / 2 - bw / 2, by = H / 2
    const barBg = this.add.graphics()
    barBg.fillStyle(0x1a1733, 1); barBg.fillRoundedRect(bx, by, bw, bh, 9)
    barBg.lineStyle(2, 0x7c3aed, 0.9); barBg.strokeRoundedRect(bx, by, bw, bh, 9)
    const bar = this.add.graphics()
    const pct = this.add.text(W / 2, by + bh + 24, '0%', {
      fontSize: '16px', fontFamily: FONT, fontStyle: '800', color: '#38bdf8',
    }).setOrigin(0.5)
    this.load.on('progress', v => {
      bar.clear()
      const w = Math.max(bh - 6, (bw - 6) * v)
      bar.fillStyle(0xff2f8e, 0.25); bar.fillRoundedRect(bx + 3 - 4, by + 3 - 4, w + 8, bh - 6 + 8, 8)
      bar.fillStyle(0xff2f8e, 1); bar.fillRoundedRect(bx + 3, by + 3, w, bh - 6, 6)
      bar.fillStyle(0xffffff, 0.35); bar.fillRoundedRect(bx + 5, by + 4, Math.max(2, w - 4), 3, 2)
      pct.setText(`${Math.round(v * 100)}%`)
    })
    this.load.on('complete', () => { bg.destroy(); titel.destroy(); sub.destroy(); barBg.destroy(); bar.destroy(); pct.destroy() })

    // Parallax-achtergronden, levelkaartjes en voertuig-sprites (Nano Banana);
    // het terrein wordt programmatisch getekend.
    // auto's en levels met procedural: true tekent proceduralArt.js zelf
    VEHICLE_ORDER.filter(id => !VEHICLES[id].procedural).forEach(id => {
      this.load.image(`hc_body_${id}`, `${HC}Voertuigen/${id}.png`)
      this.load.image(`hc_wiel_${id}`, `${HC}Voertuigen/wiel_${id}.png`)
    })

    LEVEL_ORDER.filter(id => !LEVELS[id].procedural).forEach(id => {
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
  }

  create() {
    buildProceduralArt(this)
    // Phaser tekent tekst één keer naar een canvas: wacht tot het displayfont
    // er is, anders staan de menu's in een noodlettertype.
    const klaar = () => this.scene.start('HCHome')
    const fonts = document.fonts?.load
      ? Promise.all([document.fonts.load(`800 20px 'Baloo 2'`), document.fonts.load(`700 16px Nunito`)])
      : Promise.resolve()
    Promise.race([fonts, new Promise(r => setTimeout(r, 1500))]).then(klaar, klaar)
  }
}
