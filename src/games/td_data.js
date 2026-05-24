// ── Tower definitions ─────────────────────────────────────────────
export const TOWERS = [
  { key:'lion',     name:'Leeuw',     col:0, row:0, cost:200, damage:35,  range:130, rate:1.0, special:'splash',  animType:'roar',      projColor:'#FF6B35', desc:'Brul raakt alle vijanden in bereik' },
  { key:'elephant', name:'Olifant',   col:1, row:0, cost:300, damage:70,  range:110, rate:0.6, special:'splash',  animType:'stomp',     projColor:'#8B4513', desc:'Stampede verwoest een heel gebied' },
  { key:'panda',    name:'Panda',     col:2, row:0, cost:100, damage:12,  range:110, rate:1.2, special:'slow',    animType:'bamboo',    projColor:'#7fd4ff', desc:'Bamboe vertraagt vijanden' },
  { key:'monkey',   name:'Aap',       col:3, row:0, cost: 75, damage:10,  range:130, rate:2.0, special:'chain',   animType:'none',      projColor:'#8B5E3C', desc:'Kokosnoot ketst naar 2 vijanden' },
  { key:'tiger',    name:'Tijger',    col:4, row:0, cost:350, damage:80,  range:180, rate:0.7, special:'snipe',   animType:'laser',     projColor:'#FFD700', desc:'Laserbundel doorboort vijanden ver weg' },
  { key:'bear',     name:'Beer',      col:0, row:1, cost:200, damage:30,  range:110, rate:0.9, special:'stun',    animType:'shockwave', projColor:'#FFD23F', desc:'Schokgolf stunt alle vijanden in bereik' },
  { key:'giraffe',  name:'Giraf',     col:1, row:1, cost:100, damage:10,  range:180, rate:1.5, special:'none',    animType:'none',      projColor:'#FFC125', desc:'Langste bereik van allemaal' },
  { key:'fox',      name:'Vos',       col:2, row:1, cost: 75, damage: 8,  range:110, rate:2.8, special:'none',    animType:'none',      projColor:'#FF4500', desc:'Schiet razend snel' },
  { key:'zebra',    name:'Zebra',     col:3, row:1, cost:125, damage:15,  range:115, rate:1.0, special:'slow',    animType:'none',      projColor:'#7fd4ff', desc:'Vertraagt vijanden met elke treffer' },
  { key:'owl',      name:'Uil',       col:4, row:1, cost:175, damage:25,  range:165, rate:1.1, special:'snipe',   animType:'beam',      projColor:'#C8A0FF', desc:'Nachtzicht: ver bereik, precieze aanval' },
  { key:'bulldog',  name:'Bulldog',   col:0, row:2, cost:100, damage:18,  range:100, rate:1.5, special:'none',    animType:'none',      projColor:'#FF8C00', desc:'Betrouwbare allrounder' },
  { key:'cat',      name:'Kat',       col:1, row:2, cost: 50, damage: 8,  range:100, rate:2.2, special:'none',    animType:'none',      projColor:'#FF69B4', desc:'Goedkoop en snel' },
  { key:'koala',    name:'Koala',     col:2, row:2, cost: 75, damage:10,  range:105, rate:1.5, special:'slow',    animType:'none',      projColor:'#90EE90', desc:'Eucalyptus vertraagt vijanden' },
  { key:'rabbit',   name:'Konijn',    col:3, row:2, cost: 50, damage: 5,  range: 95, rate:3.5, special:'none',    animType:'none',      projColor:'#FFFFFF', desc:'Snelste schutter, lage schade' },
  { key:'squirrel', name:'Eekhoorn',  col:4, row:2, cost: 50, damage: 9,  range:120, rate:2.0, special:'none',    animType:'none',      projColor:'#DEB887', desc:'Gooit noten met groot bereik' },
  { key:'hippo',    name:'Nijlpaard', col:0, row:3, cost:225, damage:45,  range: 95, rate:0.8, special:'splash',  animType:'wave',      projColor:'#4FC3F7', desc:'Watergolf met splash-schade' },
  { key:'rhino',    name:'Neushoorn', col:1, row:3, cost:275, damage:40,  range:100, rate:0.9, special:'stun',    animType:'horn',      projColor:'#FFD23F', desc:'Hoorns schieten omhoog langs het pad' },
  { key:'wolf',     name:'Wolf',      col:2, row:3, cost:100, damage:18,  range:120, rate:1.8, special:'none',    animType:'none',      projColor:'#C0C0C0', desc:'Snel en krachtig' },
  { key:'deer',     name:'Hert',      col:3, row:3, cost: 75, damage:10,  range:135, rate:1.5, special:'none',    animType:'none',      projColor:'#8FBC8F', desc:'Groot bereik, licht gewicht' },
  { key:'raccoon',  name:'Wasbeer',   col:4, row:3, cost: 75, damage:10,  range:110, rate:1.8, special:'poison',  animType:'none',      projColor:'#88dd44', desc:'Vergiftigt vijanden 3 seconden' },
  { key:'penguin',  name:'Pinguïn',   col:0, row:4, cost:125, damage:15,  range:115, rate:1.0, special:'slow',    animType:'freeze',    projColor:'#C8EFFF', desc:'IJs bevriest vijanden sterk' },
  { key:'pig',      name:'Varken',    col:1, row:4, cost: 50, damage:10,  range: 90, rate:1.5, special:'none',    animType:'none',      projColor:'#FFB6C1', desc:'Budgetvriendelijke basis-toren' },
  { key:'cow',      name:'Koe',       col:2, row:4, cost: 75, damage:14,  range:100, rate:1.2, special:'none',    animType:'none',      projColor:'#F5DEB3', desc:'Betrouwbaar en betaalbaar' },
  { key:'croc',     name:'Krokodil',  col:3, row:4, cost:300, damage:55,  range:105, rate:0.7, special:'poison',  animType:'acid',      projColor:'#66BB6A', desc:'Giftige zuurspray, verwoestend tegen tanks' },
  { key:'hedgehog', name:'Egel',      col:4, row:4, cost:125, damage:22,  range:105, rate:1.0, special:'stun',    animType:'spikes',    projColor:'#FFD23F', desc:'Stekels schieten alle kanten op' },
]

export const TOWER_MAP = Object.fromEntries(TOWERS.map(t => [t.key, t]))

export const LVL_DMG   = [1, 1.6, 2.5]
export const LVL_RATE  = [1, 1.4, 1.8]
export const LVL_RANGE = [1, 1.15, 1.3]

export const upgradeCost = (towerKey, currentLevel) => {
  const base = TOWER_MAP[towerKey].cost
  return currentLevel === 0 ? Math.round(base * 0.9) : Math.round(base * 1.5)
}

// ── Enemy definitions ─────────────────────────────────────────────
export const ENEMY_TYPES = {
  basic:    { name:'Slime',    color:'#4edb4e', outline:'#2a9e2a', radius:14, baseHp: 60,  baseSpd: 80,  reward:10, armor:false, boss:false },
  runner:   { name:'Geest',    color:'#a0c8ff', outline:'#5090d0', radius:10, baseHp: 35,  baseSpd:160,  reward: 8, armor:false, boss:false },
  tank:     { name:'Zombie',   color:'#8B7355', outline:'#5a4830', radius:20, baseHp:250,  baseSpd: 45,  reward:25, armor:false, boss:false },
  armored:  { name:'Robot',    color:'#9BA0A5', outline:'#6c7275', radius:16, baseHp:120,  baseSpd: 65,  reward:20, armor:true,  boss:false },
  splitter: { name:'Splitter', color:'#FF8C42', outline:'#cc5c1a', radius:16, baseHp: 80,  baseSpd: 70,  reward:15, armor:false, boss:false },
  mini:     { name:'Mini',     color:'#FF8C42', outline:'#cc5c1a', radius: 8, baseHp: 30,  baseSpd: 90,  reward: 5, armor:false, boss:false },
}

export function generateWave(waveNum) {
  const hpScale  = 1 + (waveNum - 1) * 0.18
  const spdScale = 1 + (waveNum - 1) * 0.05
  const count    = 5 + Math.floor(waveNum * 2.5)
  const interval = Math.max(0.25, 1.4 - waveNum * 0.04)
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
