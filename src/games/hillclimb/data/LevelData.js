// Level-definities voor Hill Climb: terreinvorm, look & feel, unlock-eis.
// amplitude/frequency in wereld-pixels; growth = hoeveel ruwer het terrein
// wordt per 1000px afgelegde afstand. palette = kleuren voor het
// programmatisch getekende terrein (grond, spikkels, oppervlakte-strip).

export const LEVEL_ORDER = ['heuvels', 'woestijn', 'winter', 'grot', 'maan']

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
