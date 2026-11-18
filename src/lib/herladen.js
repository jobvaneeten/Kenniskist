// Eén keer herladen (niet blijven herladen als het meteen weer misgaat).
// Gebruikt door Vangnet.jsx en main.jsx (vite:preloadError).
const SLEUTEL = 'kk_herladen_na_update'

export function herlaadEenKeer() {
  try {
    const vorige = Number(sessionStorage.getItem(SLEUTEL) || 0)
    if (Date.now() - vorige < 30000) return false   // net al gedaan: niet blijven herladen
    sessionStorage.setItem(SLEUTEL, String(Date.now()))
  } catch { /* geen opslag: dan toch herladen */ }
  window.location.reload()
  return true
}
