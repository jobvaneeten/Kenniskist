// cost, range (px), damage, fireRate (ms), projectileSpeed (px/s)
// special: what unique ability triggers on hit
export const TOWERS = {
  rabbit: {
    key: 'rabbit', name: 'Konijn', emoji: '🐰',
    cost: 50, range: 140, damage: 0, fireRate: 0, projectileSpeed: 0,
    special: 'aura',          // passive: boost nearby tower speed
    auraBonus: 0.30,           // +30% attack speed to neighbors
    description: 'Passief aura: +30% aanvalssnelheid voor alle torens in bereik',
    projectileColor: 0xFFFFFF,
    upgradeCost: [25, 40],
    upgradeStats: [
      { range: 155, auraBonus: 0.40 },
      { range: 175, auraBonus: 0.55 },
    ],
  },
  monkey: {
    key: 'monkey', name: 'Aap', emoji: '🐒',
    cost: 75, range: 150, damage: 18, fireRate: 600, projectileSpeed: 420,
    special: 'triple',         // fires 3 bananas in a spread
    description: '3 bananen tegelijk: snel en accuraat',
    projectileColor: 0xFFD700,
    upgradeCost: [38, 60],
    upgradeStats: [
      { damage: 25, fireRate: 520 },
      { damage: 36, fireRate: 430 },
    ],
  },
  parrot: {
    key: 'parrot', name: 'Papegaai', emoji: '🦜',
    cost: 100, range: 170, damage: 22, fireRate: 900, projectileSpeed: 380,
    special: 'chain',          // bolt jumps to 3 nearby enemies
    chainRange: 120,
    chainCount: 3,
    description: 'Kettingbliksem: springt naar 3 vijanden',
    projectileColor: 0x00FFFF,
    upgradeCost: [50, 75],
    upgradeStats: [
      { damage: 32, chainCount: 4 },
      { damage: 46, chainCount: 5 },
    ],
  },
  snake: {
    key: 'snake', name: 'Slang', emoji: '🐍',
    cost: 100, range: 145, damage: 12, fireRate: 800, projectileSpeed: 350,
    special: 'venom',          // DoT that spreads on death
    venomDps: 8, venomDuration: 4000,
    description: 'Gif: schade over tijd, verspreidt zich bij dood',
    projectileColor: 0x00FF44,
    upgradeCost: [50, 75],
    upgradeStats: [
      { venomDps: 14, venomDuration: 5000 },
      { venomDps: 22, venomDuration: 6000 },
    ],
  },
  pig: {
    key: 'pig', name: 'Varken', emoji: '🐷',
    cost: 125, range: 130, damage: 15, fireRate: 1100, projectileSpeed: 280,
    special: 'mud',            // aoe slow splash
    mudRadius: 80, mudSlow: 0.50, mudDuration: 2500,
    description: 'Modderbom: vertraagt alle vijanden in het gebied',
    projectileColor: 0x8B4513,
    upgradeCost: [63, 95],
    upgradeStats: [
      { mudRadius: 100, mudSlow: 0.55 },
      { mudRadius: 120, mudSlow: 0.65 },
    ],
  },
  penguin: {
    key: 'penguin', name: 'Pinguïn', emoji: '🐧',
    cost: 150, range: 160, damage: 20, fireRate: 1400, projectileSpeed: 300,
    special: 'ice',            // aoe freeze then slow
    iceRadius: 90, iceDuration: 1500, iceSlowDuration: 3000,
    description: 'IJsbom: bevriest vijanden en vertraagt ze daarna',
    projectileColor: 0xADD8E6,
    upgradeCost: [75, 113],
    upgradeStats: [
      { iceRadius: 110, iceDuration: 1800 },
      { iceRadius: 135, iceDuration: 2200, iceSlowDuration: 4000 },
    ],
  },
  panda: {
    key: 'panda', name: 'Panda', emoji: '🐼',
    cost: 175, range: 165, damage: 38, fireRate: 1200, projectileSpeed: 320,
    special: 'bamboo',         // double damage vs poisoned/slowed enemies
    description: 'Bamboelans: dubbele schade op vergiftigde vijanden',
    projectileColor: 0x98FB98,
    upgradeCost: [88, 130],
    upgradeStats: [
      { damage: 55 },
      { damage: 80 },
    ],
  },
  giraffe: {
    key: 'giraffe', name: 'Giraf', emoji: '🦒',
    cost: 200, range: 260, damage: 50, fireRate: 1500, projectileSpeed: 600,
    special: 'pierce',         // passes through all enemies in a line
    description: 'Sniper: extreme bereik, doorbort alle vijanden',
    projectileColor: 0xFFB347,
    upgradeCost: [100, 150],
    upgradeStats: [
      { damage: 75, range: 290 },
      { damage: 110, range: 320 },
    ],
  },
  hippo: {
    key: 'hippo', name: 'Nijlpaard', emoji: '🦛',
    cost: 225, range: 110, damage: 75, fireRate: 1800, projectileSpeed: 0,
    special: 'chomp',          // instant melee aoe, screenshake
    chompRadius: 100,
    description: 'Bijten: enorme schade in de buurt + screenshake',
    projectileColor: 0xFF6666,
    upgradeCost: [113, 170],
    upgradeStats: [
      { damage: 110, chompRadius: 115 },
      { damage: 160, chompRadius: 130 },
    ],
  },
  elephant: {
    key: 'elephant', name: 'Olifant', emoji: '🐘',
    cost: 250, range: 185, damage: 90, fireRate: 2000, projectileSpeed: 240,
    special: 'stomp',          // aoe explosion + knockback + slow
    stompRadius: 130,
    description: 'Explosief: grote AOE + terugstoot + vertraging',
    projectileColor: 0xFF4500,
    upgradeCost: [125, 188],
    upgradeStats: [
      { damage: 130, stompRadius: 155 },
      { damage: 190, stompRadius: 185 },
    ],
  },
}

export const TOWER_ORDER = [
  'rabbit','monkey','parrot','snake','pig',
  'penguin','panda','giraffe','hippo','elephant',
]
