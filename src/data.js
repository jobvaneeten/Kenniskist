export const RARITIES = {
  common:          { label: 'Gewoon',              color: '#a0aec0' },
  rare:            { label: 'Zeldzaam',             color: '#4fc3f7' },
  epic:            { label: 'Episch',               color: '#ce93d8' },
  legendary:       { label: 'Legendarisch',         color: '#ffd700' },
  ultra_legendary: { label: 'Ultra Legendarisch',   color: '#ff6600' },
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

// Ultra legendary shirt models — only available in the shirt lootbox
export const SHIRT_SPECIALS = [
  {
    key:        'ajax',
    label:      'Ajax Shirt',
    rarity:     'ultra_legendary',
    logo:       '/logo_ajax.svg',
    teamColors: ['#C8102E', '#ffffff'],
  },
  {
    key:        'psv',
    label:      'PSV Shirt',
    rarity:     'ultra_legendary',
    logo:       '/logo_psv.svg',
    teamColors: ['#CC0000', '#111111', '#ffffff', '#FFD700'],
  },
]

export const CLOTHING_ITEMS = [
  { key: 'shirt',    label: 'Shirt',    emoji: '👕', hasFeatured: true },
  { key: 'broek',    label: 'Broek',    emoji: '👖' },
  { key: 'sokken',   label: 'Sokken',   emoji: '🧦' },
  { key: 'schoenen', label: 'Schoenen', emoji: '👟' },
]

export const LOOTBOX_COST = 100
