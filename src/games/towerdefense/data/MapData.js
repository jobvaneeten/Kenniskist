export const TILE_SIZE   = 64
export const MAP_COLS    = 16
export const MAP_ROWS    = 10
export const PANEL_WIDTH = 256

// 0 = buildable grass  1 = path  2 = deco (non-buildable grass + bush)
// All paths are 2 tiles wide. Corners are 2×2 blocks.
export const MAPS = [
  {
    id: 1, name: 'Savanne', emoji: '🌿',
    description: 'Golvend pad door de savanne',
    difficulty: 1, unlocked: true,
    //  Path: rows 1-2 → right to cols 4-5 → down → rows 3-4 → right to cols 10-11 → down → rows 5-6 exit
    grid: [
      [0,0,2,0,0,0,0,0,0,0,0,0,0,2,0,0],
      [1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0],
      [1,1,1,1,1,1,0,0,0,0,0,0,0,0,2,0],
      [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
      [0,2,0,0,1,1,1,1,1,1,1,1,0,2,0,0],
      [0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1],
      [0,0,2,0,0,0,0,0,0,0,1,1,1,1,1,1],
      [0,2,0,0,0,0,2,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,2,0,0,0,0,0,0,0,2,0,0],
      [0,0,2,0,0,0,0,2,0,0,0,0,0,0,2,0],
    ],
    waypoints: [
      { x: -32,  y: 128 },
      { x: 320,  y: 128 },
      { x: 320,  y: 256 },
      { x: 704,  y: 256 },
      { x: 704,  y: 384 },
      { x: 1056, y: 384 },
    ],
    spawnRow: 1, exitRow: 5,
  },
  {
    id: 2, name: 'Jungle', emoji: '🌴',
    description: 'Kronkelend pad door het oerwoud',
    difficulty: 2, unlocked: false,
    //  Path: rows 1-2 cols 0-3 → down cols 2-3 → rows 3-4 cols 2-9 → down cols 8-9 → rows 7-8 cols 8-15 exit
    grid: [
      [2,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0],
      [1,1,1,1,0,0,2,0,0,0,0,0,2,0,0,0],
      [1,1,1,1,0,2,0,0,0,2,0,0,0,0,0,2],
      [0,0,1,1,0,0,2,0,0,0,0,0,0,2,0,0],
      [0,2,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,0,0,0,0,2,0],
      [0,0,0,0,0,0,0,0,1,1,0,2,0,0,0,0],
      [0,2,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
      [0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
      [0,0,2,0,0,0,0,2,0,0,0,0,0,0,2,0],
    ],
    waypoints: [
      { x: -32,  y: 128 },
      { x: 192,  y: 128 },
      { x: 192,  y: 320 },
      { x: 576,  y: 320 },
      { x: 576,  y: 512 },
      { x: 1056, y: 512 },
    ],
    spawnRow: 1, exitRow: 7,
  },
  {
    id: 3, name: 'Woestijn', emoji: '🏜️',
    description: 'Lang zigzag door de brandende woestijn',
    difficulty: 3, unlocked: false,
    //  Path: rows 1-2 cols 0-13 → down cols 12-13 → rows 4-5 cols 2-13 → down cols 2-3 → rows 7-8 cols 2-15 exit
    grid: [
      [0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,2],
      [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0],
      [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
      [0,0,1,1,1,1,1,1,1,1,1,1,1,1,2,0],
      [0,2,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [0,0,2,0,0,0,0,0,0,0,0,0,0,2,0,0],
    ],
    waypoints: [
      { x: -32,  y: 128 },
      { x: 832,  y: 128 },
      { x: 832,  y: 320 },
      { x: 192,  y: 320 },
      { x: 192,  y: 512 },
      { x: 1056, y: 512 },
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
