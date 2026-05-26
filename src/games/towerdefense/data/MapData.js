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
    grid: [
      [0,0,2,0,0,0,0,0,0,0,0,0,0,2,0,0],
      [0,2,0,0,0,0,0,0,0,2,0,0,0,0,0,0],
      [1,1,1,1,1,0,0,0,0,0,0,0,0,0,2,0],
      [0,0,0,0,1,0,2,0,0,0,2,0,0,0,0,0],
      [0,2,0,0,1,0,0,0,0,0,0,0,0,2,0,0],
      [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,2,0,0,0,0,0,0,0,1,0,0,0,2,0],
      [0,2,0,0,0,0,0,0,0,0,1,1,1,1,1,1],
      [0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0],
      [0,0,2,0,0,0,0,0,2,0,0,2,0,0,0,0],
    ],
    waypoints: [
      { x: -32,  y: 160 },
      { x: 288,  y: 160 },
      { x: 288,  y: 352 },
      { x: 672,  y: 352 },
      { x: 672,  y: 480 },
      { x: 1056, y: 480 },
    ],
    spawnRow: 2, exitRow: 7,
  },
  {
    id: 2, name: 'Jungle', emoji: '🌴',
    description: 'Kronkelend pad door het oerwoud',
    difficulty: 2, unlocked: false,
    grid: [
      [0,2,0,0,0,0,0,0,0,0,0,0,0,2,0,0],
      [1,1,1,0,0,0,2,0,0,0,0,0,2,0,0,0],
      [0,0,1,0,2,0,0,0,0,2,0,0,0,0,0,2],
      [0,0,1,0,0,2,0,0,0,0,0,0,0,2,0,0],
      [0,2,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,1,0,0,0,2,0],
      [0,0,0,2,0,0,2,0,0,0,1,0,0,0,0,0],
      [0,2,0,0,0,0,0,0,0,0,1,0,2,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1],
      [0,0,2,0,0,0,0,2,0,0,0,0,0,0,2,0],
    ],
    waypoints: [
      { x: -32,  y: 96  },
      { x: 160,  y: 96  },
      { x: 160,  y: 288 },
      { x: 672,  y: 288 },
      { x: 672,  y: 544 },
      { x: 1056, y: 544 },
    ],
    spawnRow: 1, exitRow: 8,
  },
  {
    id: 3, name: 'Woestijn', emoji: '🏜️',
    description: 'Lang zigzag door de brandende woestijn',
    difficulty: 3, unlocked: false,
    grid: [
      [0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,2,0,0,0,0,0,0,0,0,0,0,0,0,2,0],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,2],
      [0,0,2,0,0,0,0,0,0,0,0,0,0,1,0,0],
      [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
      [0,0,1,0,0,0,0,0,0,0,0,0,0,0,2,0],
      [0,2,1,0,0,0,2,0,0,0,0,2,0,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [0,0,2,0,0,0,0,0,0,0,0,0,0,2,0,0],
    ],
    waypoints: [
      { x: -32,  y: 160 },
      { x: 864,  y: 160 },
      { x: 864,  y: 352 },
      { x: 160,  y: 352 },
      { x: 160,  y: 544 },
      { x: 1056, y: 544 },
    ],
    spawnRow: 2, exitRow: 8,
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
