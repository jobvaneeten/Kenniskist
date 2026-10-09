// Level-definities voor Hill Climb: terreinvorm, look & feel, unlock-eis.
// amplitude/frequency in wereld-pixels; growth = hoeveel ruwer het terrein
// wordt per 1000px afgelegde afstand. palette = kleuren voor het
// programmatisch getekende terrein (grond, spikkels, oppervlakte-strip).

export const LEVEL_ORDER = [
  'heuvels', 'woestijn', 'winter', 'grot', 'maan',
  'jungle', 'vulkaan', 'mars', 'diepzee', 'neonstad',
]

export const LEVELS = {
  heuvels: {
    id: 'heuvels', name: 'Groene heuvels', emoji: '🌱', order: 0,
    bg: ['hc_bg_heuvels_lucht', 'hc_bg_heuvels_ver', 'hc_bg_heuvels_dichtbij'],
    // frictie ruim boven de wiel-grip: Matter neemt de min van het paar, dus
    // zo bepaalt de grip van je banden (en de banden-upgrade) de tractie.
    palette: { dirt: 0x7a4f28, speckle: 0x5e3c1e, surface: 0x4f9e3d, surfaceLight: 0x7ed957 },
    friction: 1.4, gravityScale: 1,
    amplitude: 100, frequency: 0.0048, growth: 0.10, jaggedness: 0.12,
    nextDistance: 800,
  },
  woestijn: {
    id: 'woestijn', name: 'Woestijn', emoji: '🏜️', order: 1,
    bg: ['hc_bg_woestijn_lucht', 'hc_bg_woestijn_ver', 'hc_bg_woestijn_dichtbij'],
    palette: { dirt: 0xc6924e, speckle: 0xa87a3e, surface: 0xe8c37a, surfaceLight: 0xf5daa0 },
    friction: 1.1, gravityScale: 1,
    amplitude: 120, frequency: 0.005, growth: 0.08, jaggedness: 0.15,
    nextDistance: 900,
  },
  winter: {
    id: 'winter', name: 'Winter', emoji: '❄️', order: 2,
    bg: ['hc_bg_winter_lucht', 'hc_bg_winter_ver', 'hc_bg_winter_dichtbij'],
    // glad ijs: frictie ónder de wiel-grip, dus hier glibber je echt
    palette: { dirt: 0x8fa7bd, speckle: 0x76909f, surface: 0xf2f7fd, surfaceLight: 0xffffff },
    friction: 0.35, gravityScale: 1,
    amplitude: 100, frequency: 0.0045, growth: 0.08, jaggedness: 0.10,
    nextDistance: 900,
  },
  grot: {
    id: 'grot', name: 'Grot', emoji: '🕳️', order: 3,
    bg: ['hc_bg_grot_lucht', 'hc_bg_grot_ver', 'hc_bg_grot_dichtbij'],
    palette: { dirt: 0x4a3f57, speckle: 0x37304a, surface: 0x6b5b85, surfaceLight: 0x8f7fae },
    friction: 1.4, gravityScale: 1,
    amplitude: 160, frequency: 0.007, growth: 0.10, jaggedness: 0.25,
    nextDistance: 1000,
  },
  maan: {
    id: 'maan', name: 'Maan', emoji: '🌕', order: 4,
    bg: ['hc_bg_maan_lucht', 'hc_bg_maan_ver', 'hc_bg_maan_dichtbij'],
    palette: { dirt: 0x6f7480, speckle: 0x585d68, surface: 0x9aa1ae, surfaceLight: 0xc0c6d2 },
    friction: 1.0, gravityScale: 0.35,
    amplitude: 140, frequency: 0.0045, growth: 0.06, jaggedness: 0.10,
    nextDistance: 1000,
  },
  // ── zelf getekend (proceduralArt.js). glow = gloeiende rand op het terrein,
  //    ambient = zwevende deeltjes in beeld (GameScene._buildAmbient) ──
  jungle: {
    id: 'jungle', name: 'Nachtjungle', emoji: '🌴', order: 5, procedural: true,
    bg: ['hc_bg_jungle_lucht', 'hc_bg_jungle_ver', 'hc_bg_jungle_dichtbij'],
    palette: { dirt: 0x24180f, speckle: 0x1a110a, surface: 0x1d6b37, surfaceLight: 0x6dff9e },
    glow: true, ambient: 'vuurvliegjes',
    friction: 1.3, gravityScale: 1,
    amplitude: 130, frequency: 0.0055, growth: 0.10, jaggedness: 0.18,
    nextDistance: 1000,
  },
  vulkaan: {
    id: 'vulkaan', name: 'Vulkaan', emoji: '🌋', order: 6, procedural: true,
    bg: ['hc_bg_vulkaan_lucht', 'hc_bg_vulkaan_ver', 'hc_bg_vulkaan_dichtbij'],
    palette: { dirt: 0x2b1512, speckle: 0x170a08, surface: 0x40201a, surfaceLight: 0xff6a2a },
    glow: true, ambient: 'vonken',
    friction: 1.3, gravityScale: 1,
    amplitude: 170, frequency: 0.0065, growth: 0.10, jaggedness: 0.30,
    nextDistance: 1000,
  },
  mars: {
    id: 'mars', name: 'Mars', emoji: '🪐', order: 7, procedural: true,
    bg: ['hc_bg_mars_lucht', 'hc_bg_mars_ver', 'hc_bg_mars_dichtbij'],
    palette: { dirt: 0x8a3b1f, speckle: 0x6b2c16, surface: 0xc4572b, surfaceLight: 0xf08a4b },
    ambient: 'stof',
    friction: 1.1, gravityScale: 0.6,
    amplitude: 150, frequency: 0.005, growth: 0.08, jaggedness: 0.14,
    nextDistance: 1100,
  },
  diepzee: {
    id: 'diepzee', name: 'Diepzee', emoji: '🐙', order: 8, procedural: true,
    bg: ['hc_bg_diepzee_lucht', 'hc_bg_diepzee_ver', 'hc_bg_diepzee_dichtbij'],
    palette: { dirt: 0x1b2a4a, speckle: 0x13203a, surface: 0x235b7a, surfaceLight: 0x5ef0ff },
    glow: true, ambient: 'bellen',
    friction: 1.0, gravityScale: 0.5,
    amplitude: 130, frequency: 0.005, growth: 0.08, jaggedness: 0.12,
    nextDistance: 1100,
  },
  neonstad: {
    id: 'neonstad', name: 'Neonstad', emoji: '🌆', order: 9, procedural: true,
    bg: ['hc_bg_neonstad_lucht', 'hc_bg_neonstad_ver', 'hc_bg_neonstad_dichtbij'],
    palette: { dirt: 0x1a1238, speckle: 0x120c28, surface: 0x2a1d55, surfaceLight: 0xff2f8e },
    glow: true, ambient: 'neon',
    friction: 1.3, gravityScale: 1,
    amplitude: 140, frequency: 0.006, growth: 0.10, jaggedness: 0.20,
    nextDistance: null,
  },
}

const STORE_LEVELS = 'kk_hillclimb_levels'   // { [levelId]: bestAfstand }

export function loadLevelProgress() {
  try { return JSON.parse(localStorage.getItem(STORE_LEVELS) || '{}') } catch { return {} }
}

export function saveLevelBest(levelId, distance) {
  const all = loadLevelProgress()
  const best = Math.max(all[levelId] || 0, Math.round(distance))
  all[levelId] = best
  localStorage.setItem(STORE_LEVELS, JSON.stringify(all))
  return best
}

// Een level is vrijgespeeld als de vorige zijn nextDistance-eis is gehaald.
export function isLevelUnlocked(levelId, progress) {
  const lvl = LEVELS[levelId]
  if (lvl.order === 0) return true
  const prev = LEVEL_ORDER[lvl.order - 1]
  return (progress[prev] || 0) >= LEVELS[prev].nextDistance
}
