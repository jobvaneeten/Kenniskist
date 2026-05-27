// ── Tile measurements ────────────────────────────────────────────────
// spline-default-straight: surface at world Y=0, channel width=1, tile Z-span=4
// spline-default-corner-small: 90° turn, L-shape, same channel width
// tunnel-narrow: visually enclosed, same floor physics as straight
// windmill: animated obstacle, same floor physics as straight
//
// Ball radius = 0.16 (diameter 0.32 fits in 1-unit channel)
// ─────────────────────────────────────────────────────────────────────

export const TILE_SIZE   = 4
export const BALL_SCALE  = 0.17
export const BALL_RADIUS = 0.16

// Tile type constants
const S   = 'spline-default-straight'
const HB  = 'spline-default-straight-hill-beginning'
const HC  = 'spline-default-straight-hill-complete'
const HE  = 'spline-default-straight-hill-end'
const BU  = 'spline-default-straight-bump-up'
const BD  = 'spline-default-straight-bump-down'
const CR  = 'spline-default-corner-small'   // 90° right turn (Z→X or X→-Z etc)
const CL  = 'spline-default-corner-large'   // wider corner
const TUN = 'tunnel-narrow'                 // tunnel section (same physics as S)
const WM  = 'windmill'                      // windmill obstacle

// Directions: 0=+Z, 1=+X, 2=-Z, 3=-X
// rotY (degrees) for the tile GLBs:
//   direction 0 (+Z): rotY=0
//   direction 1 (+X): rotY=90
//   direction 2 (-Z): rotY=180
//   direction 3 (-X): rotY=270

// pathHole: builds a hole by following a path of instructions.
// instructions: array of:
//   's'  = go straight (place S tile in current direction)
//   'hb' = hill beginning
//   'hc' = hill complete
//   'he' = hill end
//   'bu' = bump up
//   'bd' = bump down
//   'r'  = turn right (corner tile, then direction rotates +1)
//   'l'  = turn left  (corner tile, then direction rotates -1)
//   'tun'= tunnel tile (straight, enclosed)
//   'wm' = windmill tile (straight with obstacle)
// Start position: x=0, z=0, direction=0 (+Z)
// tee: center of first tile (offset 1.5 into the tile in travel direction)
// hole: center of last tile

function pathHole(name, par, instructions) {
  // Direction offsets: [dx, dz] for each direction
  const DX = [0, 1,  0, -1]
  const DZ = [1, 0, -1,  0]
  // rotY for visual tile when heading in direction d
  const ROT_Y = [0, 90, 180, 270]

  // For corners: rotation of the corner tile depends on which turn
  // right turn from dir d: tile faces "from d to d+1"
  // left  turn from dir d: tile faces "from d to d-1"
  // Corner rotY is the rotation of the incoming direction
  // (corner tile in Blender has opening along +Z and +X, so rotY=0 = turn from +Z to +X = right)
  // right turn: corner faces toward old direction rotY
  // left  turn: corner rotY = old direction + 90 (approx, may need tuning)

  const tiles = []
  let x = 0, z = 0, dir = 0  // current tile origin, direction

  let teeTile = null
  let holeTile = null

  for (const instr of instructions) {
    const rotY = ROT_Y[dir]
    let model = S
    let isCorner = false

    if (instr === 's') { model = S }
    else if (instr === 'hb') { model = HB }
    else if (instr === 'hc') { model = HC }
    else if (instr === 'he') { model = HE }
    else if (instr === 'bu') { model = BU }
    else if (instr === 'bd') { model = BD }
    else if (instr === 'tun') { model = TUN }
    else if (instr === 'wm') { model = S }  // use straight for physics; windmill is decorative
    else if (instr === 'r' || instr === 'l') { model = CR; isCorner = true }

    const tileDef = { model, x, z, rotY: isCorner ? rotY : rotY }
    tiles.push(tileDef)

    if (teeTile === null) teeTile = tileDef

    // Advance position
    if (isCorner) {
      if (instr === 'r') {
        // Corner rotY = same as direction
        tileDef.rotY = ROT_Y[dir]
        dir = (dir + 1) % 4
      } else {
        // left turn: corner rotY = (dir+3)%4 * 90 = rotY - 90
        tileDef.rotY = ROT_Y[(dir + 3) % 4]
        dir = (dir + 3) % 4
      }
      // After corner, position advances in BOTH old and new direction by 1 tile
      // (corner occupies 1 tile-size in both directions from its origin)
      x += DX[dir] * TILE_SIZE
      z += DZ[dir] * TILE_SIZE
    } else {
      x += DX[dir] * TILE_SIZE
      z += DZ[dir] * TILE_SIZE
    }
  }

  holeTile = tiles[tiles.length - 1]

  // Tee: 1.5 units into the first tile in its travel direction
  const teeDir = 0  // first tile always starts in +Z
  const teeX = tiles[0].x + DX[teeDir] * 1.5
  const teeZ = tiles[0].z + DZ[teeDir] * 1.5

  // Hole: 2.5 units into the last tile in its travel direction
  // Reconstruct last direction by re-running
  let lastDir = 0
  for (const instr of instructions) {
    if (instr === 'r') lastDir = (lastDir + 1) % 4
    else if (instr === 'l') lastDir = (lastDir + 3) % 4
  }
  const holeX = holeTile.x + DX[lastDir] * 2.5
  const holeZ = holeTile.z + DZ[lastDir] * 2.5

  return {
    name, par,
    tiles,
    tee:  { x: teeX,  y: 0.5,  z: teeZ },
    hole: { x: holeX, y: 0,    z: holeZ },
  }
}

// straightHole: simple helper for Z-only holes (no corners)
function straightHole(name, par, tileTypes) {
  const n = tileTypes.length
  return {
    name, par,
    tiles: tileTypes.map((model, i) => ({
      model, x: 0, z: i * TILE_SIZE, rotY: 0,
    })),
    tee:  { x: 0, y: 0.5, z: 1.5 },
    hole: { x: 0, y: 0,   z: (n - 1) * TILE_SIZE + 2.5 },
  }
}

export const HOLES = [
  // Hole 1 – Recht door: short intro, 3 tiles straight
  straightHole('Recht vooruit', 2, [S, S, S]),

  // Hole 2 – L-bocht rechts: straight → right corner → straight
  pathHole('De L-Bocht', 3, ['s', 's', 'r', 's', 's']),

  // Hole 3 – Over de heuvel: hill in the middle
  straightHole('Over de heuvel', 3, [S, HB, HC, HE, S]),

  // Hole 4 – S-curve: right then left
  pathHole('S-Bocht', 3, ['s', 'r', 's', 'l', 's', 's']),

  // Hole 5 – Tunnel: enter tunnel, emerge to hole
  straightHole('Door de tunnel', 3, [S, TUN, TUN, S]),

  // Hole 6 – Zigzag: two right turns making a U-shape ... back toward start
  pathHole('De Zigzag', 4, ['s', 'r', 's', 's', 'r', 's', 's']),

  // Hole 7 – Heuvel + bocht: hill, then corner
  pathHole('Heuvel & Bocht', 4, ['hb', 'hc', 'he', 'r', 's', 's']),

  // Hole 8 – Hobbels: bumps then straight
  straightHole('Hobbelbaan', 3, [S, BU, BD, BU, BD, S]),

  // Hole 9 – Grand finale: L, hill, tunnel, bump
  pathHole('Grote Finale', 5, ['s', 'r', 's', 'hb', 'hc', 'he', 's', 'tun', 's']),
]
