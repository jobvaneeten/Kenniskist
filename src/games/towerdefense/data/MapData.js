export const TILE_SIZE   = 64
export const MAP_COLS    = 16
export const MAP_ROWS    = 10
export const PANEL_WIDTH = 256

// 0 = buildable grass  1 = path  2 = deco (non-buildable grass + bush)
export const MAPS = [
  {
    id: 1, name: 'Savanne', emoji: '🌿',
    description: 'Golvend pad door de savanne',
    difficulty: 1, unlocked: true,
    // Path: row 2 cols 0-5 → col 5 rows 2-5 → row 5 cols 5-10 → col 10 rows 5-7 → row 7 cols 10-15
    grid: [
      [0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0],
      [0,2,0,0,0,0,0,0,0,2,0,0,0,0,2,0],
      [1,1,1,1,1,1,0,0,0,0,0,0,2,0,0,0],
      [0,0,2,0,0,1,0,0,2,0,0,0,0,0,2,0],
      [0,2,0,0,0,1,0,0,0,0,0,0,0,2,0,0],
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,2,0,0,0,0,0,0,0,1,0,2,0,0,0],
      [0,2,0,0,0,0,2,0,0,0,1,1,1,1,1,1],
      [0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0],
      [0,0,2,0,0,2,0,0,0,2,0,0,0,0,2,0],
    ],
    waypoints: [
      { x: -32, y: 160 },
      { x: 352, y: 160 },
      { x: 352, y: 352 },
      { x: 672, y: 352 },
      { x: 672, y: 480 },
      { x: 1056, y: 480 },
    ],
    spawnRow: 2, exitRow: 7,
  },
  {
    id: 2, name: 'Jungle', emoji: '🌴',
    description: 'Kronkelend pad door het oerwoud',
    difficulty: 2, unlocked: false,
    // Path: row 1 cols 0-3 → col 3 rows 1-5 → row 5 cols 3-12 → col 12 rows 5-8 → row 8 cols 12-15
    grid: [
      [2,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0],
      [1,1,1,1,0,0,2,0,0,0,0,0,2,0,0,0],
      [0,2,0,1,0,2,0,0,0,2,0,0,0,0,0,2],
      [0,0,0,1,0,0,2,0,0,0,0,0,0,2,0,0],
      [0,2,0,1,0,0,0,0,2,0,0,0,0,0,0,0],
      [0,0,0,1,1,1,1,1,1,1,1,1,1,0,2,0],
      [0,0,2,0,0,0,0,0,0,0,0,0,1,0,0,0],
      [0,2,0,0,0,0,0,0,0,0,0,0,1,0,2,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
      [0,0,2,0,0,0,0,2,0,0,0,0,0,0,2,0],
    ],
    waypoints: [
      { x: -32, y:  96 },
      { x: 224, y:  96 },
      { x: 224, y: 352 },
      { x: 800, y: 352 },
      { x: 800, y: 544 },
      { x: 1056, y: 544 },
    ],
    spawnRow: 1, exitRow: 8,
  },
  {
    id: 3, name: 'Woestijn', emoji: '🏜️',
    description: 'Lang zigzag door de brandende woestijn',
    difficulty: 3, unlocked: true,
    // Cel-codes: 0=bouwbaar zand, 2=deco, 11=pad-boven, 12=pad-onder,
    //            13=pad-links, 14=pad-rechts, 19=volledigpad (hoek)
    tileset: {
      0:    'sand_ground',   // volledigzand.png – achtergrond
      11:   'sand_h_top',    // padzandboven.png
      12:   'sand_h_bot',    // padzandonder.png
      13:   'sand_v_left',   // padzandlinks.png
      14:   'sand_v_right',  // padzandrechts.png
      19:   'sand_full',     // volledigpad.png  – hoeken
      deco: ['sand_deco1','sand_deco2','sand_deco3','sand_deco4'],
    },
    // Pad: links in → rechts (rij 1-2) → bocht → links (rij 4-5) → bocht → rechts uit (rij 7-8)
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
      { x:  -32, y: 128 },   // ingang links (midden rij 1-2)
      { x:  832, y: 128 },   // bocht rechts (midden col 12-13)
      { x:  832, y: 320 },   // bocht onder  (midden rij 4-5)
      { x:  192, y: 320 },   // bocht links  (midden col 2-3)
      { x:  192, y: 512 },   // bocht onder  (midden rij 7-8)
      { x: 1056, y: 512 },   // uitgang rechts
    ],
    spawnRow: 1, exitRow: 7,
  },
]

export function isPath(grid, col, row) {
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false
  return grid[row][col] === 1
}

export function isBuildable(grid, col, row) {
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false
  return grid[row][col] === 0
}
