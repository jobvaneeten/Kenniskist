// ── Tower definitions (12 dieren) ─────────────────────────────────
export const TOWERS = [
  { key:'lion',     name:'Leeuw',     col:0, row:0, cost:200, damage:35,  range:130, rate:1.0, special:'splash',  animType:'roar',
    desc:'Brul raakt alle vijanden in bereik',
    lvl1:'Splash vertraagt ook vijanden', lvl2:'Mega splash + korte stun op iedereen!' },
  { key:'elephant', name:'Olifant',   col:1, row:0, cost:300, damage:70,  range:110, rate:0.6, special:'splash',  animType:'stomp',
    desc:'Stampede verwoest een heel gebied',
    lvl1:'Aardbeving vertraagt én kapotraakt', lvl2:'Seismische schok — enorm gebied + stun!' },
  { key:'panda',    name:'Panda',     col:2, row:0, cost:100, damage:12,  range:110, rate:1.2, special:'slow',    animType:'bamboo',
    desc:'Bamboe vertraagt vijanden',
    lvl1:'Vertraging duurt langer (4s)', lvl2:'Extreem lang vertragen (6s) + aangrenzend!' },
  { key:'monkey',   name:'Aap',       col:3, row:0, cost: 75, damage:10,  range:130, rate:2.0, special:'chain',   animType:'none',
    desc:'Kokosnoot ketst naar 2 vijanden',
    lvl1:'Kokosnoot ketst naar 3 vijanden', lvl2:'Ketst naar 4 vijanden, extra schade!' },
  { key:'tiger',    name:'Tijger',    col:4, row:0, cost:350, damage:80,  range:180, rate:0.7, special:'snipe',   animType:'laser',
    desc:'Laserbundel doorboort vijanden ver weg',
    lvl1:'Laser vertraagt geraakt doelwit', lvl2:'Laser stunt én vertraagt doelwit!' },
  { key:'bear',     name:'Beer',      col:0, row:1, cost:200, damage:30,  range:110, rate:0.9, special:'stun',    animType:'shockwave',
    desc:'Schokgolf stunt alle vijanden in bereik',
    lvl1:'Schokgolf stunt ook nabije vijanden (r=50)', lvl2:'Enorme schokgolf stunt alles in buurt (r=70)!' },
  { key:'hippo',    name:'Nijlpaard', col:0, row:3, cost:225, damage:45,  range: 95, rate:0.8, special:'splash',  animType:'wave',
    desc:'Watergolf met splash-schade',
    lvl1:'Watergolf vertraagt ook vijanden', lvl2:'Tsunami: grote splash + zware vertraging!' },
  { key:'rhino',    name:'Neushoorn', col:1, row:3, cost:275, damage:40,  range:100, rate:0.9, special:'stun',    animType:'horn',
    desc:'Hoorns schieten omhoog langs het pad',
    lvl1:'Stun + vertraagt het doelwit', lvl2:'Lange stun + zware vertraging op doelwit!' },
  { key:'croc',     name:'Krokodil',  col:3, row:4, cost:300, damage:55,  range:105, rate:0.7, special:'poison',  animType:'acid',
    desc:'Giftige zuurspray, verwoestend tegen tanks',
    lvl1:'Gif doorboort 50% van het pantser', lvl2:'Gif doorboort alle pantsers volledig!' },
  { key:'penguin',  name:'Pinguïn',   col:0, row:4, cost:125, damage:15,  range:115, rate:1.0, special:'slow',    animType:'freeze',
    desc:'IJs bevriest vijanden sterk',
    lvl1:'Bevriezen = volledig stoppen (0.8s)', lvl2:'IJs bevriest ook aangrenzende vijanden!' },
  { key:'hedgehog', name:'Egel',      col:4, row:4, cost:125, damage:22,  range:105, rate:1.0, special:'stun',    animType:'spikes',
    desc:'Stekels schieten alle kanten op',
    lvl1:'Stekels stutten ook nabije vijanden (r=42)', lvl2:'Mega stekelexplosie — groot gebied + gif!' },
  { key:'pig',      name:'Varken',    col:1, row:4, cost: 50, damage:10,  range: 90, rate:1.5, special:'none',    animType:'none',
    desc:'Goedkope basistoren zonder special',
    lvl1:'Schiet 2 projectielen tegelijk!', lvl2:'Schiet 3 projectielen tegelijk — snelvuur!' },
]

export const TOWER_MAP = Object.fromEntries(TOWERS.map(t => [t.key, t]))

export const LVL_DMG   = [1, 1.6, 2.5]
export const LVL_RATE  = [1, 1.4, 1.8]
export const LVL_RANGE = [1, 1.15, 1.3]

export const upgradeCost = (towerKey, currentLevel) => {
  const base = TOWER_MAP[towerKey].cost
  return currentLevel === 0 ? Math.round(base * 0.8) : Math.round(base * 1.4)
}

// ── Enemy definitions ──────────────────────────────────────────────
export const ENEMY_TYPES = {
  basic:    { name:'Slime',    color:'#4edb4e', outline:'#2a9e2a', radius:14, baseHp: 50,  baseSpd: 75,  reward:12, armor:false },
  runner:   { name:'Geest',    color:'#a0c8ff', outline:'#5090d0', radius:10, baseHp: 28,  baseSpd:145,  reward:10, armor:false },
  tank:     { name:'Zombie',   color:'#8B7355', outline:'#5a4830', radius:20, baseHp:200,  baseSpd: 42,  reward:30, armor:false },
  armored:  { name:'Robot',    color:'#9BA0A5', outline:'#6c7275', radius:16, baseHp:100,  baseSpd: 60,  reward:25, armor:true  },
  splitter: { name:'Splitter', color:'#FF8C42', outline:'#cc5c1a', radius:16, baseHp: 70,  baseSpd: 65,  reward:18, armor:false },
  mini:     { name:'Mini',     color:'#FF8C42', outline:'#cc5c1a', radius: 8, baseHp: 25,  baseSpd: 85,  reward: 6, armor:false },
}

export function generateWave(waveNum) {
  const hpScale  = 1 + (waveNum - 1) * 0.13   // was 0.18 — easier scaling
  const spdScale = 1 + (waveNum - 1) * 0.03   // was 0.05 — slower speed ramp
  const count    = 4 + Math.floor(waveNum * 2.2)  // slightly fewer enemies
  const interval = Math.max(0.28, 1.5 - waveNum * 0.04)
  const queue    = []

  for (let i = 0; i < count; i++) {
    let type = 'basic'
    if (waveNum >= 2) {
      const r = Math.random()
      if      (waveNum >= 12 && r < 0.12) type = 'splitter'
      else if (waveNum >= 8  && r < 0.22) type = 'armored'
      else if (waveNum >= 6  && r < 0.38) type = 'tank'
      else if (waveNum >= 2  && r < 0.52) type = 'runner'
    }
    queue.push({ type, delay: i * interval, hpScale, spdScale })
  }
  return queue
}
