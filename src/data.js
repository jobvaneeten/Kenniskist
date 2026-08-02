export const RARITIES = {
  common:          { label: 'Gewoon',              color: '#9aa3b2' },
  rare:            { label: 'Zeldzaam',             color: '#38bdf8' },
  epic:            { label: 'Episch',               color: '#c084fc' },
  legendary:       { label: 'Legendarisch',         color: '#facc15' },
  ultra_legendary: { label: 'Ultra Legendarisch',   color: '#fb7185' },
}

// Accent colour + procedural icon per lootbox category (used by the shop's
// crate artwork and detail panel).
export const CRATE_ACCENTS = {
  shirt:    { accent: '#4ade80', icon: 'shirt' },
  broek:    { accent: '#60a5fa', icon: 'broek' },
  sokken:   { accent: '#fbbf24', icon: 'sokken' },
  schoenen: { accent: '#e879f9', icon: 'schoenen' },
  hoofd:    { accent: '#facc15', icon: 'pet' },
}

export const SHIRT_COLORS = [
  { key: 'rood',   hex: '#e63946', label: 'Rood',   rarity: 'common'    },
  { key: 'blauw',  hex: '#1d6fa4', label: 'Blauw',  rarity: 'common'    },
  { key: 'groen',  hex: '#2d9e4f', label: 'Groen',  rarity: 'common'    },
  { key: 'wit',    hex: '#f0f0f0', label: 'Wit',    rarity: 'common'    },
  { key: 'geel',   hex: '#f4c430', label: 'Geel',   rarity: 'rare'      },
  { key: 'oranje', hex: '#f77f00', label: 'Oranje', rarity: 'rare'      },
  { key: 'paars',  hex: '#7b2d8b', label: 'Paars',  rarity: 'epic'      },
  { key: 'zwart',  hex: '#222222', label: 'Zwart',  rarity: 'legendary' },
]

export const CLOTHING_ITEMS = [
  { key: 'shirt',    label: 'Shirt',    emoji: '👕', hasFeatured: true },
  { key: 'broek',    label: 'Broek',    emoji: '👖' },
  { key: 'sokken',   label: 'Sokken',   emoji: '🧦' },
  { key: 'schoenen', label: 'Schoenen', emoji: '👟' },
  { key: 'hoofd',    label: 'Pet',      emoji: '🧢' },
]

export const LOOTBOX_COST = 100
