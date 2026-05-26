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
    difficulty: 3, unlocked: false,
    // Path: row 1 cols 0-13 → col 13 rows 1-4 → row 4 cols 2-13 → col 2 rows 4-7 → row 7 cols 2-15
    grid: [
      [0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
      [0,0,2,0,0,0,0,0,0,0,0,0,0,1,0,2],
      [0,2,0,0,0,2,0,0,0,0,0,0,0,1,0,0],
      [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
      [0,0,1,0,0,0,0,0,0,0,0,0,0,0,2,0],
      [0,2,1,0,0,0,0,0,0,2,0,0,0,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,2,0,0,0,0,0,0,0,0,0,0,2,0,0],
    ],
    waypoints: [
      { x: -32, y:  96 },
      { x: 864, y:  96 },
      { x: 864, y: 288 },
      { x: 160, y: 288 },
      { x: 160, y: 480 },
      { x: 1056, y: 480 },
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
