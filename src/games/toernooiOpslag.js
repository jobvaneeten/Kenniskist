// Los van FootballGame zodat het menu kan zien of er een toernooi loopt
// zonder het hele spel te laden.
export const TOERNOOI_KEY = 'kk_toernooi_voetbal'
export function loadToernooi() {
  try { const v = JSON.parse(localStorage.getItem(TOERNOOI_KEY)); if (v && v.playerKey && v.opponents?.length) return v } catch { /* ignore */ }
  return null
}
