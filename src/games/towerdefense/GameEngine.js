import Phaser from 'phaser'
import BootScene  from './scenes/BootScene.js'
import MenuScene  from './scenes/MenuScene.js'
import GameScene  from './scenes/GameScene.js'
import UIScene    from './scenes/UIScene.js'
import { MAP_ROWS, MAP_COLS, TILE_SIZE, HUD_HEIGHT } from './data/MapData.js'

const W = MAP_COLS * TILE_SIZE   // 1280
const H = MAP_ROWS * TILE_SIZE + HUD_HEIGHT  // 720

export function createGame(parent, { onBack }) {
  const config = {
    type:   Phaser.WEBGL,
    width:  W,
    height: H,
    parent,
    backgroundColor: '#0d2b0a',
    scale: {
      mode:            Phaser.Scale.FIT,
      autoCenter:      Phaser.Scale.CENTER_BOTH,
      width:  W,
      height: H,
    },
    scene: [BootScene, MenuScene, GameScene, UIScene],
    powerPreference: 'high-performance',
    antialias: true,
    fps: { target: 60, forceSetTimeOut: false },
  }

  const game = new Phaser.Game(config)

  // Propagate back event from Phaser → React
  game.events.on('back', () => {
    if (typeof onBack === 'function') onBack()
  })

  return game
}
