// ── Tower definitions ─────────────────────────────────────────────
// Spritesheet: 5 cols × 5 rows (each cell = img.width/5 × img.height/5)
export const TOWERS = [
  { key: 'lion',     name: 'Leeuw',     col:0, row:0, cost:150, damage:30, range:120, rate:1.0, special:'splash', desc:'Brul raakt alle vijanden in bereik' },
  { key: 'elephant', name: 'Olifant',   col:1, row:0, cost:175, damage:50, range: 95, rate:0.6, special:'splash', desc:'Stampede verwoest een gebied' },
  { key: 'panda',    name: 'Panda',     col:2, row:0, cost:100, damage:12, range:110, rate:1.2, special:'slow',   desc:'Bamboe vertraagt vijanden' },
  { key: 'monkey',   name: 'Aap',       col:3, row:0, cost: 75, damage:10, range:130, rate:2.0, special:'chain',  desc:'Kokosnoot ketst naar 2 vijanden' },
  { key: 'tiger',    name: 'Tijger',    col:4, row:0, cost:200, damage:60, range:150, rate:0.7, special:'snipe',  desc:'Doordringend, groot bereik' },
  { key: 'bear',     name: 'Beer',      col:0, row:1, cost:125, damage:25, range:105, rate:0.9, special:'stun',   desc:'Stunt vijanden bij treffer' },
  { key: 'giraffe',  name: 'Giraf',     col:1, row:1, cost:100, damage:10, range:160, rate:1.5, special:'none',   desc:'Langste bereik van allemaal' },
  { key: 'fox',      name: 'Vos',       col:2, row:1, cost: 75, damage: 8, range:110, rate:2.8, special:'none',   desc:'Schiet razend snel' },
  { key: 'zebra',    name: 'Zebra',     col:3, row:1, cost:125, damage:15, range:115, rate:1.0, special:'slow',   desc:'Vertraagt vijanden met elke treffer' },
  { key: 'owl',      name: 'Uil',       col:4, row:1, cost:150, damage:22, range:145, rate:1.1, special:'snipe',  desc:'Nachtzicht: ver bereik' },
  { key: 'bulldog',  name: 'Bulldog',   col:0, row:2, cost:100, damage:18, range:100, rate:1.5, special:'none',   desc:'Betrouwbare allrounder' },
  { key: 'cat',      name: 'Kat',       col:1, row:2, cost: 50, damage: 8, range:100, rate:2.2, special:'none',   desc:'Goedkoop en snel' },
  { key: 'koala',    name: 'Koala',     col:2, row:2, cost: 75, damage:10, range:105, rate:1.5, special:'slow',   desc:'Eucalyptus vertraagt vijanden' },
  { key: 'rabbit',   name: 'Konijn',    col:3, row:2, cost: 50, damage: 5, range: 95, rate:3.5, special:'none',   desc:'Snelste schutter, lage schade' },
  { key: 'squirrel', name: 'Eekhoorn',  col:4, row:2, cost: 50, damage: 9, range:120, rate:2.0, special:'none',   desc:'Gooit noten met groot bereik' },
  { key: 'hippo',    name: 'Nijlpaard', col:0, row:3, cost:150, damage:35, range: 90, rate:0.8, special:'splash', desc:'Grote klap met splash-schade' },
  { key: 'rhino',    name: 'Neushoorn', col:1, row:3, cost:125, damage:30, range: 95, rate:0.9, special:'stun',   desc:'Stunt ook gepantserde vijanden' },
  { key: 'wolf',     name: 'Wolf',      col:2, row:3, cost:100, damage:18, range:120, rate:1.8, special:'none',   desc:'Snel en krachtig' },
  { key: 'deer',     name: 'Hert',      col:3, row:3, cost: 75, damage:10, range:135, rate:1.5, special:'none',   desc:'Groot bereik, licht gewicht' },
  { key: 'raccoon',  name: 'Wasbeer',   col:4, row:3, cost: 75, damage:10, range:110, rate:1.8, special:'poison', desc:'Vergiftigt vijanden 3 seconden' },
  { key: 'penguin',  name: 'Pinguïn',   col:0, row:4, cost:100, damage:12, range:110, rate:1.0, special:'slow',   desc:'IJs vertraagt vijanden sterk' },
  { key: 'pig',      name: 'Varken',    col:1, row:4, cost: 50, damage:10, range: 90, rate:1.5, special:'none',   desc:'Budgetvriendelijke basis-toren' },
  { key: 'cow',      name: 'Koe',       col:2, row:4, cost: 75, damage:14, range:100, rate:1.2, special:'none',   desc:'Betrouwbaar en betaalbaar' },
  { key: 'croc',     name: 'Krokodil',  col:3, row:4, cost:175, damage:45, range:100, rate:0.7, special:'poison', desc:'Krachtig gif, geweldig tegen tanks' },
  { key: 'hedgehog', name: 'Egel',      col:4, row:4, cost:100, damage:20, range:100, rate:1.0, special:'stun',   desc:'Stekels stunnen vijanden' },
]

export const TOWER_MAP = Object.fromEntries(TOWERS.map(t => [t.key, t]))

// Per level multipliers (level 0 = base, 1 = first upgrade, 2 = second upgrade)
export const LVL_DMG   = [1, 1.6, 2.5]
export const LVL_RATE  = [1, 1.4, 1.8]
export const LVL_RANGE = [1, 1.15, 1.3]
export const upgradeCost = (towerKey, currentLevel) => {
  const base = TOWER_MAP[towerKey].cost
  return currentLevel === 0 ? Math.round(base * 0.9) : Math.round(base * 1.4)
}

// ── Enemy definitions ─────────────────────────────────────────────
export const ENEMY_TYPES = {
  basic:    { name: 'Slime',    color: '#4edb4e', outline: '#2a9e2a', radius:14, baseHp: 60,  baseSpd: 80,  reward:10, armor:false, boss:false },
  runner:   { name: 'Geest',    color: '#a0c8ff', outline: '#5090d0', radius:10, baseHp: 35,  baseSpd:160,  reward: 8, armor:false, boss:false },
  tank:     { name: 'Zombie',   color: '#8B7355', outline: '#5a4830', radius:20, baseHp:250,  baseSpd: 45,  reward:25, armor:false, boss:false },
  armored:  { name: 'Robot',    color: '#9BA0A5', outline: '#6c7275', radius:16, baseHp:120,  baseSpd: 65,  reward:20, armor:true,  boss:false },
  splitter: { name: 'Splitter', color: '#FF8C42', outline: '#cc5c1a', radius:16, baseHp: 80,  baseSpd: 70,  reward:15, armor:false, boss:false },
  mini:     { name: 'Mini',     color: '#FF8C42', outline: '#cc5c1a', radius: 8, baseHp: 30,  baseSpd: 90,  reward: 5, armor:false, boss:false },
}

// Generate spawn queue for a wave
export function generateWave(waveNum) {
  const hpScale  = 1 + (waveNum - 1) * 0.18
  const spdScale = 1 + (waveNum - 1) * 0.05
  const count    = 5 + Math.floor(waveNum * 2.5)
  const interval = Math.max(0.5, 2.2 - waveNum * 0.05)
  const queue    = []

  for (let i = 0; i < count; i++) {
    let type = 'basic'
    if (waveNum >= 2) {
      const r = Math.random()
      if      (waveNum >= 10 && r < 0.12) type = 'splitter'
      else if (waveNum >= 7  && r < 0.25) type = 'armored'
      else if (waveNum >= 5  && r < 0.40) type = 'tank'
      else if (waveNum >= 2  && r < 0.55) type = 'runner'
    }
    queue.push({ type, delay: i * interval, hpScale, spdScale })
  }
  return queue
}
