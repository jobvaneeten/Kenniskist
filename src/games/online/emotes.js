// Emotes (dansjes) voor de online spellen. De sleutel is een animatie uit
// ANIMATIES in Poppetje.js. Een kind kiest er drie (kk_emotes); zonder keuze
// zijn het de gratis emotes.

export const EMOTES = {
  hip_hop:    { naam: 'Hip hop' },
  springen:   { naam: 'Springen' },
  breakdance: { naam: 'Breakdance' },
}

export const GRATIS = ['hip_hop', 'springen', 'breakdance']
export const EMOTE_DUUR = 4000   // ms, daarna weer gewoon staan

export function mijnEmotes() {
  try {
    const lijst = JSON.parse(localStorage.getItem('kk_emotes') || '[]')
    const goed = Array.isArray(lijst) ? lijst.filter(k => EMOTES[k]).slice(0, 3) : []
    if (goed.length === 3) return goed
  } catch { /* geen of kapotte keuze */ }
  return GRATIS
}
