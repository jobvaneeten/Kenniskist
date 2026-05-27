export const TILE_SIZE   = 64
export const MAP_COLS    = 16
export const MAP_ROWS    = 10
export const PANEL_WIDTH = 256

// Cel-codes (alle maps):
//  0 = bouwbaar terrein        2 = decoratie (niet-bouwbaar)
// 11 = pad horizontaal boven  12 = pad horizontaal onder
// 13 = pad verticaal links    14 = pad verticaal rechts
// 19 = volledig pad (hoeken)

export const MAPS = [
  // ── Map 1 – Savanne (gras, 1 bocht, simpel) ─────────────────────────
  {
    id: 1, name: 'Savanne', emoji: '🌿',
    description: 'Eén bocht door de savanne',
    difficulty: 1, unlocked: true,
    tileset: {
      0:    'gras_ground',   // tile024 – vlakke groen
      11:   'gras_h_top',    // tile047 – groen boven, zand onder (N-rand)
      12:   'gras_h_bot',    // tile001 – zand boven, groen onder (Z-rand)
      13:   'gras_v_left',   // tile025 – zand links, groen rechts (W-rand)
      14:   'gras_v_right',  // tile023 – groen links, zand rechts (O-rand)
      19:   'gras_full',     // tile050 – vlak zand (hoeken)
      deco: ['gras_deco1','gras_deco2'],  // tile069, tile071
    },
    // Pad: links in (rij 1-2) → rechtdoor → hoek col 12-13 → omlaag → hoek rij 7-8 → rechts uit
    grid: [
      [ 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0],
      [11,11,11,11,11,11,11,11,11,11,11,11,19,19, 0, 0],
      [12,12,12,12,12,12,12,12,12,12,12,12,19,19, 0, 0],
      [ 0, 2, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0,13,14, 2, 0],
      [ 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0,13,14, 0, 2],
      [ 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0,13,14, 0, 0],
      [ 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2,13,14, 2, 0],
      [ 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0,19,19,11,11],
      [ 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0,19,19,12,12],
      [ 2, 0, 0, 2, 0, 2, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0],
    ],
    waypoints: [
      { x:  -32, y: 128 },   // ingang links  (midden rij 1-2)
      { x:  832, y: 128 },   // hoek rechts   (midden col 12-13)
      { x:  832, y: 512 },   // hoek onder    (midden rij 7-8)
      { x: 1056, y: 512 },   // uitgang rechts
    ],
    spawnRow: 1, exitRow: 7,
  },

  // ── Map 2 – Jungle (steen, 2 bochten, middel) ───────────────────────
  {
    id: 2, name: 'Jungle', emoji: '🌴',
    description: 'Kronkelend pad door het oerwoud',
    difficulty: 2, unlocked: false,
    tileset: {
      0:    'steen_ground',   // tile034 – vlakke steen
      11:   'steen_h_top',    // tile057 – steen boven, zand onder (N-rand)
      12:   'steen_h_bot',    // tile011 – zand boven, steen onder (Z-rand)
      13:   'steen_v_left',   // tile033 – steen links, zand rechts (W-rand)
      14:   'steen_v_right',  // tile035 – zand links, steen rechts (O-rand)
      19:   'steen_full',     // tile010 – grotendeels zand (hoeken)
      deco: ['steen_deco1'],  // tile059 – steen cirkel
    },
    // Pad: links in (rij 1-2) → rechts → hoek col 10-11 → omlaag → hoek rij 4-5 →
    //       links → hoek col 2-3 → omlaag → hoek rij 7-8 → rechts uit
    grid: [
      [ 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0],
      [11,11,11,11,11,11,11,11,11,11,19,19, 0, 0, 0, 0],
      [12,12,12,12,12,12,12,12,12,12,19,19, 0, 0, 0, 2],
      [ 0, 0, 2, 0, 0, 0, 2, 0, 0, 0,13,14, 0, 2, 0, 0],
      [ 0, 2,19,19,11,11,11,11,11,11,19,19, 0, 0, 2, 0],
      [ 0, 0,19,19,12,12,12,12,12,12,19,19, 0, 2, 0, 2],
      [ 0, 2,13,14, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
      [ 0, 0,19,19,11,11,11,11,11,11,11,11,11,11,11,11],
      [ 0, 2,19,19,12,12,12,12,12,12,12,12,12,12,12,12],
      [ 2, 0, 0, 2, 0, 0, 2, 0, 0, 0, 2, 0, 0, 2, 0, 0],
    ],
    waypoints: [
      { x:  -32, y: 128 },   // ingang links  (midden rij 1-2)
      { x:  704, y: 128 },   // hoek rechts   (midden col 10-11)
      { x:  704, y: 320 },   // hoek onder    (midden rij 4-5)
      { x:  192, y: 320 },   // hoek links    (midden col 2-3)
      { x:  192, y: 512 },   // hoek onder    (midden rij 7-8)
      { x: 1056, y: 512 },   // uitgang rechts
    ],
    spawnRow: 1, exitRow: 7,
  },

  // ── Map 3 – Woestijn (zand, 3 bochten, moeilijk) ────────────────────
  {
    id: 3, name: 'Woestijn', emoji: '🏜️',
    description: 'Lang zigzag door de brandende woestijn',
    difficulty: 3, unlocked: true,
    tileset: {
      0:    'sand_ground',   // volledigzand.png – achtergrond
      11:   'sand_h_top',    // padzandboven.png
      12:   'sand_h_bot',    // padzandonder.png
      13:   'sand_v_left',   // padzandlinks.png
      14:   'sand_v_right',  // padzandrechts.png
      19:   'sand_full',     // volledigpad.png  – hoeken
      deco: ['sand_deco1','sand_deco2','sand_deco3','sand_deco4'],
    },
    grid: [
      [ 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0],
      [11,11,11,11,11,11,11,11,11,11,11,11,19,19, 0, 0],
      [12,12,12,12,12,12,12,12,12,12,12,12,19,19, 0, 0],
      [ 0, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0,13,14, 0, 2],
      [ 0, 0,19,19,11,11,11,11,11,11,11,11,19,19, 0, 0],
      [ 0, 2,19,19,12,12,12,12,12,12,12,12,19,19, 2, 0],
      [ 0, 0,13,14, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
      [ 0, 2,19,19,11,11,11,11,11,11,11,11,11,11,11,11],
      [ 0, 0,19,19,12,12,12,12,12,12,12,12,12,12,12,12],
      [ 2, 0, 0, 2, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0],
    ],
    waypoints: [
      { x:  -32, y: 128 },   // ingang links  (midden rij 1-2)
      { x:  832, y: 128 },   // hoek rechts   (midden col 12-13)
      { x:  832, y: 320 },   // hoek onder    (midden rij 4-5)
      { x:  192, y: 320 },   // hoek links    (midden col 2-3)
      { x:  192, y: 512 },   // hoek onder    (midden rij 7-8)
      { x: 1056, y: 512 },   // uitgang rechts
    ],
    spawnRow: 1, exitRow: 7,
  },
]

export function isPath(grid, col, row) {
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false
  const c = grid[row][col]
  return c === 1 || (c >= 11 && c <= 19)
}

export function isBuildable(grid, col, row) {
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false
  return grid[row][col] === 0
}
