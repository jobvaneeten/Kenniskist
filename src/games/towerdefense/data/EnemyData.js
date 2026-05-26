export const ENEMIES = {
  basic: {
    key: 'basic', name: 'Rover', speed: 80, hp: 100,
    reward: 10, size: 16, color: 0xFF6B35, borderColor: 0xCC3300,
    armor: 0, label: '👾',
  },
  fast: {
    key: 'fast', name: 'Raket', speed: 170, hp: 60,
    reward: 15, size: 13, color: 0xFFD700, borderColor: 0xCC9900,
    armor: 0, label: '⚡',
  },
  tank: {
    key: 'tank', name: 'Tank', speed: 45, hp: 500,
    reward: 30, size: 22, color: 0x8B6914, borderColor: 0x5A4000,
    armor: 0, label: '🛡',
  },
  armored: {
    key: 'armored', name: 'Pantser', speed: 65, hp: 280,
    reward: 25, size: 19, color: 0x708090, borderColor: 0x404850,
    armor: 0.40, label: '⚔',  // blocks 40% of damage
  },
  flying: {
    key: 'flying', name: 'Vlieger', speed: 130, hp: 120,
    reward: 20, size: 14, color: 0xDA70D6, borderColor: 0x8B008B,
    armor: 0, label: '🦅',
    flies: true,  // straight-line path from spawn to exit
  },
  boss: {
    key: 'boss', name: 'Eindbaas', speed: 32, hp: 2200,
    reward: 150, size: 34, color: 0xDC143C, borderColor: 0x800000,
    armor: 0.25, label: '💀',
  },
}
