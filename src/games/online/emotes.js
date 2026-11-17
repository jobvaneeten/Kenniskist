// Emotes (dansjes) voor de online spellen en de Kledingkast. Drie zijn gratis,
// de rest win je in de Emote-kist in de Winkel (kk_unlocked.emote). Een kind
// kiest er drie om te gebruiken (kk_emotes); die staan bovenin de Kledingkast
// en als knoppen in de Vloerquiz.
//
// bestand: animatie in public/ (omgezet naar het skelet van het Poppetje,
// zie tools/blender/emotes_omzetten.py).

export const EMOTES = {
  // gratis
  hip_hop:     { naam: 'Hip hop',      icoon: 'muziek',   kleur: '#ff3d9a', bestand: 'hip_hop_dancing.glb' },
  springen:    { naam: 'Springen',     icoon: 'omhoog',   kleur: '#3df2ff', bestand: 'emotespringen.glb', stripRoot: true },
  zwaaien:     { naam: 'Zwaaien',      icoon: 'hand',     kleur: '#4ade80', bestand: 'emote_zwaaien.glb' },
  // gewoon
  juichen:     { naam: 'Juichen',      icoon: 'vuist',    rarity: 'common',          bestand: 'emote_juichen.glb' },
  klappen:     { naam: 'Klappen',      icoon: 'klap',     rarity: 'common',          bestand: 'emote_klappen.glb' },
  overwinning: { naam: 'Overwinning',  icoon: 'beker',    rarity: 'common',          bestand: 'emote_overwinning.glb' },
  // zeldzaam
  kippendans:  { naam: 'Kippendans',   icoon: 'kip',      rarity: 'rare',            bestand: 'emote_kippendans.glb' },
  salsa:       { naam: 'Salsa',        icoon: 'muziek',   rarity: 'rare',            bestand: 'emote_salsa.glb' },
  cabbage:     { naam: 'Cabbage patch', icoon: 'golf',    rarity: 'rare',            bestand: 'emote_cabbage.glb' },
  // episch
  robot:       { naam: 'Robotdans',    icoon: 'bot',      rarity: 'epic',            bestand: 'emote_robot.glb' },
  gangnam:     { naam: 'Gangnam',      icoon: 'bliksem',  rarity: 'epic',            bestand: 'emote_gangnam.glb' },
  twist:       { naam: 'Twist',        icoon: 'draai',    rarity: 'epic',            bestand: 'emote_twist.glb' },
  // legendarisch
  breakdance:  { naam: 'Breakdance',   icoon: 'ster',     rarity: 'legendary',       bestand: 'emote_breakdance.glb' },
  flair:       { naam: 'Flair',        icoon: 'draai',    rarity: 'legendary',       bestand: 'emote_flair.glb' },
  // ultra legendarisch
  backflip:    { naam: 'Backflip',     icoon: 'salto',    rarity: 'ultra_legendary', bestand: 'emote_backflip.glb' },
  capoeira:    { naam: 'Capoeira',     icoon: 'vuur',     rarity: 'ultra_legendary', bestand: 'emote_capoeira.glb' },
  thriller:    { naam: 'Thriller',     icoon: 'maan',     rarity: 'ultra_legendary', bestand: 'emote_thriller.glb' },
  handstand:   { naam: 'Handstand',    icoon: 'ster',     rarity: 'ultra_legendary', bestand: 'emote_handstand.glb' },
}

// kleur van een kist-emote = kleur van zijn zeldzaamheid (zoals in de Winkel)
const ZELDZAAM_KLEUR = { common: '#9aa3b2', rare: '#38bdf8', epic: '#c084fc', legendary: '#facc15', ultra_legendary: '#fb7185' }
Object.values(EMOTES).forEach(e => { if (!e.kleur) e.kleur = ZELDZAAM_KLEUR[e.rarity] })

export const GRATIS = ['hip_hop', 'springen', 'zwaaien']
export const EMOTE_KOSTEN = 2000
export const EMOTE_DUUR = 4000   // ms, daarna weer gewoon staan

// de emotes in de kist, in de vorm die de Winkel gebruikt
export const KIST_EMOTES = Object.entries(EMOTES)
  .filter(([, e]) => e.rarity)
  .map(([key, e]) => ({ key, label: e.naam, rarity: e.rarity }))

const leesJSON = (k, standaard) => { try { return JSON.parse(localStorage.getItem(k) || '') ?? standaard } catch { return standaard } }

// welke emotes dit kind heeft: de gratis plus wat het won
export function bezitEmotes() {
  const gewonnen = leesJSON('kk_unlocked', {})?.emote
  return [...GRATIS, ...(Array.isArray(gewonnen) ? gewonnen.filter(k => EMOTES[k] && !GRATIS.includes(k)) : [])]
}

// de drie gekozen emotes (alleen wat je ook echt hebt)
export function mijnEmotes() {
  const heb = new Set(bezitEmotes())
  const lijst = leesJSON('kk_emotes', [])
  const gekozen = Array.isArray(lijst) ? [...new Set(lijst)].filter(k => heb.has(k)) : []
  for (const k of GRATIS) if (gekozen.length < 3 && !gekozen.includes(k)) gekozen.push(k)
  return gekozen.slice(0, 3)
}

export function bewaarEmotes(lijst) {
  localStorage.setItem('kk_emotes', JSON.stringify(lijst.slice(0, 3)))
}
