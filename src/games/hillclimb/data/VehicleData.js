// Voertuig-stats en upgrade-definities voor Hill Climb.
// Alle physics-getallen zijn afgestemd op Matter.js met de wereld-schaal
// gebruikt in terrain.js/GameScene.js (1 wereld-eenheid ≈ 1 pixel).
//
// driver: waar het poppetje zit — x als fractie van chassisW (negatief =
// achter het midden, positief = voorin), lift als fractie van de
// poppetje-hoogte boven de chassis-bovenkant, scale als factor van chassisH.

export const VEHICLE_ORDER = [
  'jeep', 'quad', 'motor', 'tractor', 'raceauto',
  'politie', 'monstertruck', 'brandweer', 'schoolbus', 'maanbuggy',
]

export const VEHICLES = {
  jeep: {
    id: 'jeep', name: 'Jeep', emoji: '🚙', cost: 0,
    desc: 'Allrounder — goed in balans tussen kracht en stabiliteit.',
    chassisW: 118, chassisH: 40, wheelRadius: 27, wheelOffsetX: 44,
    mass: 1, power: 0.029, maxFuel: 100, fuelBurn: 1,
    suspensionStiffness: 0.018, suspensionDamping: 0.03, suspensionLength: 28,
    grip: 1.05, airControl: 0.028,
    driver: { x: -0.06, lift: 0.46, scale: 1.7 },
  },
  quad: {
    id: 'quad', name: 'Quad', emoji: '🛵', cost: 300,
    desc: 'Licht en wendbaar — springt makkelijk, maar kiept snel.',
    chassisW: 84, chassisH: 30, wheelRadius: 17, wheelOffsetX: 35,
    mass: 0.55, power: 0.033, maxFuel: 65, fuelBurn: 0.85,
    suspensionStiffness: 0.014, suspensionDamping: 0.024, suspensionLength: 11,
    grip: 1.0, airControl: 0.042,
    art: { originX: 0.503, originY: 0.39, disp: 20 },
    driver: { x: -0.05, lift: 0.72, scale: 1.9 },
  },
  motor: {
    id: 'motor', name: 'Motor', emoji: '🏍️', cost: 350,
    desc: 'Snel en licht, maar kantelt makkelijker.',
    chassisW: 90, chassisH: 30, wheelRadius: 24, wheelOffsetX: 34,
    mass: 0.6, power: 0.037, maxFuel: 70, fuelBurn: 0.85,
    suspensionStiffness: 0.014, suspensionDamping: 0.025, suspensionLength: 26,
    grip: 0.82, airControl: 0.045,
    driver: { x: -0.05, lift: 0.68, scale: 1.9 },
  },
  tractor: {
    id: 'tractor', name: 'Tractor', emoji: '🚜', cost: 450,
    desc: 'Traag maar mét enorme grip — klimt de steilste hellingen op.',
    chassisW: 120, chassisH: 46, wheelRadius: 27, wheelOffsetX: 44,
    mass: 1.5, power: 0.021, maxFuel: 110, fuelBurn: 1.1,
    suspensionStiffness: 0.022, suspensionDamping: 0.04, suspensionLength: 14,
    grip: 1.25, airControl: 0.02,
    art: { originX: 0.519, originY: 0.46, dispL: 31, dispR: 24 },
    driver: { x: -0.32, lift: 0.08, scale: 1.3 },
  },
  raceauto: {
    id: 'raceauto', name: 'Raceauto', emoji: '🏎️', cost: 500,
    desc: 'Bloedsnel op vlak terrein, maar laag en kwetsbaar.',
    chassisW: 130, chassisH: 26, wheelRadius: 16, wheelOffsetX: 43,
    mass: 0.7, power: 0.041, maxFuel: 60, fuelBurn: 1.15,
    suspensionStiffness: 0.02, suspensionDamping: 0.032, suspensionLength: 10,
    grip: 0.85, airControl: 0.04,
    art: { originX: 0.465, originY: 0.16, disp: 20 },
    driver: { x: 0.01, lift: -0.71, scale: 0.9 },
  },
  politie: {
    id: 'politie', name: 'Politieauto', emoji: '🚓', cost: 550,
    desc: 'Vlot én stabiel — de betrouwbare wegracer.',
    chassisW: 124, chassisH: 34, wheelRadius: 18, wheelOffsetX: 41,
    mass: 0.95, power: 0.034, maxFuel: 90, fuelBurn: 1,
    suspensionStiffness: 0.017, suspensionDamping: 0.03, suspensionLength: 11,
    grip: 0.95, airControl: 0.03,
    art: { originX: 0.583, originY: 0.53, disp: 21 },
    driver: { x: 0.02, lift: -0.59, scale: 0.85 },
  },
  monstertruck: {
    id: 'monstertruck', name: 'Monstertruck', emoji: '🚚', cost: 650,
    desc: 'Grote wielen, klimt overal tegenop, maar traag en dorstig.',
    chassisW: 140, chassisH: 46, wheelRadius: 38, wheelOffsetX: 54,
    mass: 1.6, power: 0.024, maxFuel: 130, fuelBurn: 1.3,
    suspensionStiffness: 0.024, suspensionDamping: 0.04, suspensionLength: 38,
    grip: 1.08, airControl: 0.02,
    driver: { x: 0.18, lift: -0.35, scale: 1.0 },
  },
  brandweer: {
    id: 'brandweer', name: 'Brandweer', emoji: '🚒', cost: 800,
    desc: 'Zwaar en stoer, met een reusachtige brandstoftank.',
    chassisW: 150, chassisH: 48, wheelRadius: 21, wheelOffsetX: 56,
    mass: 1.7, power: 0.026, maxFuel: 140, fuelBurn: 1.25,
    suspensionStiffness: 0.025, suspensionDamping: 0.042, suspensionLength: 12,
    grip: 1.05, airControl: 0.018,
    art: { originX: 0.504, originY: 0.47, disp: 24 },
    driver: { x: 0.42, lift: -0.57, scale: 1.0 },
  },
  schoolbus: {
    id: 'schoolbus', name: 'Schoolbus', emoji: '🚌', cost: 900,
    desc: 'Lang en log, maar de tank lijkt wel bodemloos.',
    chassisW: 165, chassisH: 50, wheelRadius: 27, wheelOffsetX: 65,
    mass: 1.8, power: 0.024, maxFuel: 160, fuelBurn: 1.2,
    suspensionStiffness: 0.026, suspensionDamping: 0.044, suspensionLength: 12,
    grip: 0.9, airControl: 0.016,
    art: { originX: 0.547, originY: 0.32, disp: 31 },
    driver: { x: 0.16, lift: -0.70, scale: 0.9 },
  },
  maanbuggy: {
    id: 'maanbuggy', name: 'Maanbuggy', emoji: '🌕', cost: 1000,
    desc: 'Soepele vering en veel grip — gemaakt voor kraters.',
    chassisW: 115, chassisH: 30, wheelRadius: 30, wheelOffsetX: 46,
    mass: 0.8, power: 0.031, maxFuel: 85, fuelBurn: 0.95,
    suspensionStiffness: 0.013, suspensionDamping: 0.022, suspensionLength: 36,
    grip: 1.15, airControl: 0.045,
    driver: { x: -0.02, lift: 0.6, scale: 1.6 },
  },
}

// 4 upgrade-soorten, elk 5 niveaus. cost(level) = basiskosten van dat niveau
// (dus upgraden van 2→3 kost UPGRADE_COST[2]). effect(level) = vermenigvuldiger.
export const UPGRADE_TYPES = {
  motor:  { label: 'Motor',   emoji: '⚙️', desc: 'Meer kracht en topsnelheid', stat: 'power',    perLevel: 0.12 },
  vering: { label: 'Vering',  emoji: '🔩', desc: 'Stabieler bij landingen',     stat: 'suspension', perLevel: 0.10 },
  banden: { label: 'Banden',  emoji: '🛞', desc: 'Meer grip op ruw terrein',    stat: 'grip',      perLevel: 0.06 },
  tank:   { label: 'Tank',    emoji: '⛽', desc: 'Meer brandstofcapaciteit',    stat: 'maxFuel',   perLevel: 0.15 },
}

export const UPGRADE_COST = [0, 80, 150, 240, 360, 500] // index = niveau (1..5)
export const MAX_UPGRADE_LEVEL = 5

export function upgradeCost(level) {
  return UPGRADE_COST[level] ?? null // null = al max niveau
}

// Past upgrade-niveaus toe op de basisstats van een voertuig.
export function applyUpgrades(vehicleId, levels = {}) {
  const base = VEHICLES[vehicleId]
  const lv = (k) => levels[k] || 0
  const mult = (k) => 1 + UPGRADE_TYPES[k].perLevel * lv(k)
  return {
    ...base,
    power: base.power * mult('motor'),
    suspensionStiffness: base.suspensionStiffness * mult('vering'),
    suspensionDamping: base.suspensionDamping * mult('vering'),
    grip: base.grip * mult('banden'),
    maxFuel: base.maxFuel * mult('tank'),
  }
}

const STORE_VEHICLES = 'kk_hillclimb_vehicles'
const STORE_UPGRADES = 'kk_hillclimb_upgrades'
const STORE_SELECTED = 'kk_hillclimb_selected'

export function loadUnlockedVehicles() {
  try { return JSON.parse(localStorage.getItem(STORE_VEHICLES) || '["jeep"]') } catch { return ['jeep'] }
}

export function unlockVehicle(id) {
  const list = loadUnlockedVehicles()
  if (!list.includes(id)) {
    list.push(id)
    localStorage.setItem(STORE_VEHICLES, JSON.stringify(list))
  }
  return list
}

export function loadSelectedVehicle() {
  try {
    const sel = localStorage.getItem(STORE_SELECTED)
    if (sel && loadUnlockedVehicles().includes(sel)) return sel
  } catch { /* localStorage niet beschikbaar */ }
  return loadUnlockedVehicles()[0] || 'jeep'
}

export function saveSelectedVehicle(id) {
  try { localStorage.setItem(STORE_SELECTED, id) } catch { /* idem */ }
}

export function loadUpgrades() {
  try { return JSON.parse(localStorage.getItem(STORE_UPGRADES) || '{}') } catch { return {} }
}

export function saveUpgradeLevel(vehicleId, upgradeKey, level) {
  const all = loadUpgrades()
  all[vehicleId] = { ...all[vehicleId], [upgradeKey]: level }
  localStorage.setItem(STORE_UPGRADES, JSON.stringify(all))
  return all
}
