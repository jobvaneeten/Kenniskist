export const TILE_SIZE   = 48
export const MAP_COLS    = 32
export const MAP_ROWS    = 20
export const PANEL_WIDTH = 256

// Cel-codes:
//  0 = bouwbaar terrein (land)
//  2 = decoratie (ook bouwbaar)
//  3 = water — alleen watertorens (vis, krokodil) plaatsbaar
// 19 = pad

// ── Programmatische gridbouw ────────────────────────────────────────
// Routes zijn lijsten van hoekpunten [col,row]; het pad is 2 cellen
// breed (rows r..r+1 horizontaal, cols c..c+1 verticaal). col -1 = start
// buiten beeld links, col 32 = exit buiten beeld rechts.
function carveRoute(grid, anchors) {
  const clampC = c => Math.max(0, Math.min(MAP_COLS - 1, c))
  const clampR = r => Math.max(0, Math.min(MAP_ROWS - 1, r))
  for (let i = 0; i < anchors.length - 1; i++) {
    const [c1, r1] = anchors[i]
    const [c2, r2] = anchors[i + 1]
    if (r1 === r2) {
      // horizontaal segment (incl. 2x2 hoekblokken op beide uiteinden)
      const a = clampC(Math.min(c1, c2)), b = clampC(Math.max(c1, c2) + 1)
      for (let c = a; c <= b; c++) for (let dr = 0; dr <= 1; dr++) grid[clampR(r1 + dr)][c] = 19
    } else {
      const a = clampR(Math.min(r1, r2)), b = clampR(Math.max(r1, r2) + 1)
      for (let r = a; r <= b; r++) for (let dc = 0; dc <= 1; dc++) grid[r][clampC(c1 + dc)] = 19
    }
  }
}

function routeWaypoints(anchors) {
  return anchors.map(([c, r]) => ({
    x: c < 0 ? -32 : c > MAP_COLS - 1 ? MAP_COLS * TILE_SIZE + 32 : (c + 1) * TILE_SIZE,
    y: (r + 1) * TILE_SIZE,
  }))
}

function buildGrid({ routes, waters = [], decoDensity = 8 }) {
  const grid = Array.from({ length: MAP_ROWS }, () => new Array(MAP_COLS).fill(0))
  routes.forEach(r => carveRoute(grid, r))
  waters.forEach(({ c1, r1, c2, r2 }) => {
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
      if (grid[r]?.[c] === 0) grid[r][c] = 3
    }
  })
  // Deterministische deco-strooiing op vrije landcellen
  for (let r = 0; r < MAP_ROWS; r++) for (let c = 0; c < MAP_COLS; c++) {
    if (grid[r][c] === 0 && ((c * 53 + r * 97) % 100) % decoDensity === 0) grid[r][c] = 2
  }
  return grid
}

// ── Map-definities ──────────────────────────────────────────────────
const DEFS = [
  {
    id: 1, name: 'Savanne', emoji: '🌿',
    description: 'S-bocht met twee vijvers voor je watertorens',
    difficulty: 1, unlocked: true,
    deco: ['boom1', 'boom2', 'boom3'],
    pathTheme: { base: 0xd9bb7e, edge: 0xa9884f, fleck: 0xc2a05f },
    routes: [
      [[-1, 1], [22, 1], [22, 7], [6, 7], [6, 13], [32, 13]],
    ],
    waters: [
      { c1: 26, r1: 3,  c2: 30, r2: 6 },    // vijver rechtsboven
      { c1: 1,  r1: 16, c2: 5,  r2: 18 },   // vijver linksonder
    ],
  },
  {
    id: 2, name: 'Steen', emoji: '🪨',
    description: 'Twee paden! Vijanden komen via boven én onder',
    difficulty: 2, unlocked: true,
    deco: ['steen1', 'steen2', 'steen3'],
    pathTheme: { base: 0x9a9a92, edge: 0x6e6e66, fleck: 0x828278 },
    routes: [
      [[-1, 2], [26, 2], [26, 9], [12, 9], [12, 16], [32, 16]],
      [[-1, 12], [6, 12], [6, 16], [32, 16]],
    ],
    waters: [
      { c1: 16, r1: 11, c2: 24, r2: 15 },   // bergmeer in het midden
    ],
  },
  {
    id: 3, name: 'Woestijn', emoji: '🏜️',
    description: 'Spiraal met oase en een verraderlijke zij-ingang',
    difficulty: 3, unlocked: true,
    deco: ['cactus1', 'cactus2'],
    pathTheme: { base: 0xe8cf8f, edge: 0xc2a565, fleck: 0xd4b878 },
    routes: [
      [[-1, 1], [26, 1], [26, 4], [2, 4], [2, 9], [22, 9], [22, 13], [8, 13], [8, 17], [32, 17]],
      [[-1, 9], [22, 9], [22, 13], [8, 13], [8, 17], [32, 17]],
    ],
    waters: [
      { c1: 27, r1: 8, c2: 31, r2: 12 },    // oase rechts
    ],
  },
  {
    id: 4, name: 'Oerwoud', emoji: '🌴',
    description: 'Een lange jungle-rivier volgt bijna de hele baan',
    difficulty: 4, unlocked: false,
    deco: ['boom1', 'boom2', 'boom3'],
    pathTheme: { base: 0x8a6238, edge: 0x5c4023, fleck: 0x71502c },
    routes: [
      [[-1, 3], [10, 3], [10, 10], [24, 10], [24, 15], [4, 15], [4, 18], [32, 18]],
    ],
    waters: [
      { c1: 0,  r1: 5,  c2: 9,  r2: 9  },   // linkermeer bovenaan
      { c1: 11, r1: 12, c2: 23, r2: 14 },   // middenrivier
      { c1: 6,  r1: 16, c2: 23, r2: 17 },   // rivier onderaan
    ],
  },
  {
    id: 5, name: 'Poolijs', emoji: '❄️',
    description: 'Kort en razendsnel pad op een smalle ijsvlakte',
    difficulty: 5, unlocked: false,
    deco: ['steen1', 'steen2'],
    pathTheme: { base: 0xdbe9f5, edge: 0xb7d0e8, fleck: 0xc9def0 },
    routes: [
      [[-1, 7], [16, 7], [16, 13], [32, 13]],
    ],
    waters: [
      { c1: 0,  r1: 0,  c2: 31, r2: 4  },   // bevroren meer bovenaan
      { c1: 0,  r1: 9,  c2: 14, r2: 19 },   // ijsveld linksonder
      { c1: 18, r1: 15, c2: 31, r2: 19 },   // ijsveld rechtsonder
    ],
  },
]

export const MAPS = DEFS.map(def => ({
  ...def,
  grid:   buildGrid(def),
  routes: def.routes.map(routeWaypoints),
  // compat: sommige code verwacht 'waypoints' (eerste route)
  waypoints: routeWaypoints(def.routes[0]),
  tileset: { deco: def.deco },
}))

export function isPath(grid, col, row) {
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false
  return grid[row][col] === 19
}

// Land-torens op gras/deco; watertorens (aquatic) alléén op water.
export function isBuildableFor(grid, col, row, aquatic = false) {
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false
  const c = grid[row][col]
  return aquatic ? c === 3 : (c === 0 || c === 2)
}

export function isBuildable(grid, col, row) {
  return isBuildableFor(grid, col, row, false)
}
