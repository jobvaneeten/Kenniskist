import Phaser from 'phaser'
import BootScene from './scenes/BootScene.js'
import HomeScene from './scenes/HomeScene.js'
import VehicleSelectScene from './scenes/VehicleSelectScene.js'
import LevelSelectScene from './scenes/LevelSelectScene.js'
import ShopScene from './scenes/ShopScene.js'
import GameScene from './scenes/GameScene.js'
import UIScene from './scenes/UIScene.js'

const W = 1152
const H = 648

export function createGame(parent, { onBack }) {
  const config = {
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent,
    backgroundColor: '#7ec8e3',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: W,
      height: H,
    },
    physics: {
      default: 'matter',
      matter: { gravity: { y: 1 }, debug: false },
    },
    scene: [BootScene, HomeScene, VehicleSelectScene, LevelSelectScene, ShopScene, GameScene, UIScene],
    disableContextMenu: true,
    input: {
      mouse: { preventDefaultWheel: false },
      touch: { capture: false },
    },
  }

  const game = new Phaser.Game(config)
  if (typeof window !== 'undefined') window.__hcGame = game

  game.events.on('back', () => {
    if (typeof onBack === 'function') onBack()
  })

  game.pauseScenes  = () => { ['HCGame', 'HCUI'].forEach(k => { try { game.scene.pause(k) }  catch { /* scene niet actief */ } }) }
  game.resumeScenes = () => { ['HCGame', 'HCUI'].forEach(k => { try { game.scene.resume(k) } catch { /* scene niet actief */ } }) }

  return game
}
