import Phaser from 'phaser'
import BootScene  from './scenes/BootScene.js'
import MenuScene  from './scenes/MenuScene.js'
import GameScene  from './scenes/GameScene.js'
import UIScene    from './scenes/UIScene.js'
import { MAP_ROWS, MAP_COLS, TILE_SIZE, PANEL_WIDTH } from './data/MapData.js'

const W = MAP_COLS * TILE_SIZE + PANEL_WIDTH  // 1024 + 256 = 1280
const H = MAP_ROWS * TILE_SIZE                // 640

export function createGame(parent, { onBack, onRoundDone }) {
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
    disableContextMenu: true,
    input: {
      mouse:    { preventDefaultWheel: false },
      touch:    { capture: false },
    },
  }

  const game = new Phaser.Game(config)
  if (typeof window !== 'undefined') window.__tdGame = game   // debug/test-hook

  // Propagate back event from Phaser → React
  game.events.on('back', () => {
    if (typeof onBack === 'function') onBack()
  })

  // Reward-mode: na een potje (victory/game over) automatisch terug
  game.registry.set('rewardMode', typeof onRoundDone === 'function')
  game.events.on('round_done', () => {
    if (typeof onRoundDone === 'function') onRoundDone()
  })

  // Pause/resume alle scenes (gebruikt wanneer TD verborgen is achter spelling)
  game.pauseScenes  = () => { ['Game','UI'].forEach(k => { try { game.scene.pause(k) }  catch {} }) }
  game.resumeScenes = () => { ['Game','UI'].forEach(k => { try { game.scene.resume(k) } catch {} }) }

  return game
}
