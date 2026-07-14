// Voertuig-stats en upgrade-definities voor Hill Climb.
// Alle physics-getallen zijn afgestemd op Matter.js met de wereld-schaal
// gebruikt in terrain.js/GameScene.js (1 wereld-eenheid ≈ 1 pixel).

export const VEHICLE_ORDER = ['jeep', 'motor', 'monstertruck']

export const VEHICLES = {
  jeep: {
    id: 'jeep', name: 'Jeep', emoji: '🚙', cost: 0,
    desc: 'Allrounder — goed in balans tussen kracht en stabiliteit.',
    chassisW: 118, chassisH: 40, wheelRadius: 27, wheelOffsetX: 44,
    mass: 1, power: 0.029, maxFuel: 100, fuelBurn: 1,
    suspensionStiffness: 0.018, suspensionDamping: 0.03, suspensionLength: 42,
    grip: 0.95, airControl: 0.028,
  },
  motor: {
    id: 'motor', name: 'Motor', emoji: '🏍️', cost: 350,
    desc: 'Licht en snel, maar kantelt makkelijker.',
    chassisW: 90, chassisH: 30, wheelRadius: 24, wheelOffsetX: 34,
    mass: 0.6, power: 0.037, maxFuel: 70, fuelBurn: 0.85,
    suspensionStiffness: 0.014, suspensionDamping: 0.025, suspensionLength: 38,
    grip: 0.82, airControl: 0.038,
  },
  monstertruck: {
    id: 'monstertruck', name: 'Monstertruck', emoji: '🚚', cost: 650,
    desc: 'Grote wielen, klimt overal tegenop, maar traag en dorstig.',
    chassisW: 140, chassisH: 46, wheelRadius: 38, wheelOffsetX: 54,
    mass: 1.6, power: 0.024, maxFuel: 130, fuelBurn: 1.3,
    suspensionStiffness: 0.024, suspensionDamping: 0.04, suspensionLength: 52,
    grip: 1.08, airControl: 0.02,
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

export function loadUpgrades() {
  try { return JSON.parse(localStorage.getItem(STORE_UPGRADES) || '{}') } catch { return {} }
}

export function saveUpgradeLevel(vehicleId, upgradeKey, level) {
  const all = loadUpgrades()
  all[vehicleId] = { ...all[vehicleId], [upgradeKey]: level }
  localStorage.setItem(STORE_UPGRADES, JSON.stringify(all))
  return all
}
