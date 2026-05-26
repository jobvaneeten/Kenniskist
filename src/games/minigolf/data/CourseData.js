// ── Tile measurements (verified from GLB accessors) ───────────────────
// spline-default-straight : Z[-1 → 4]  (5 units total, 4-unit step)
//   node Y=-1  →  playing surface at world Y = 0 when tile placed at Y=0
//   channel width (X): 2 units  (-1 to 1)
//
// hill tiles: same Z extents as straight, peak ≈ +0.15 above surface
//
// Tile origin → next tile origin = 4 units in the travel direction
// Ball radius  = 0.17 (ball GLB is ~2 units diameter; we scale to 0.34)
// ─────────────────────────────────────────────────────────────────────

export const TILE_SIZE  = 4    // units between tile origins (spline tiles)
export const BALL_SCALE = 0.17 // ball GLB visual scale → diameter ≈ 0.34
export const BALL_RADIUS = 0.16

// Tile type keywords used in tile arrays:
//   'S'  = spline-default-straight
//   'HB' = spline-default-straight-hill-beginning
//   'HC' = spline-default-straight-hill-complete
//   'HE' = spline-default-straight-hill-end
//   'BD' = spline-default-straight-bump-down
//   'BU' = spline-default-straight-bump-up

const S  = 'spline-default-straight'
const HB = 'spline-default-straight-hill-beginning'
const HC = 'spline-default-straight-hill-complete'
const HE = 'spline-default-straight-hill-end'
const BU = 'spline-default-straight-bump-up'
const BD = 'spline-default-straight-bump-down'

// Build a straight Z-direction hole from a tile-type array.
// All tiles placed at x=0, z = index*TILE_SIZE, rotY=0.
// tee  = center of first tile: z = 0 + 1.5
// hole = center of last  tile: z = (n-1)*TILE_SIZE + 1.5
function straightHole(name, par, tileTypes) {
  const n = tileTypes.length
  return {
    name, par,
    tiles: tileTypes.map((model, i) => ({
      model, x: 0, z: i * TILE_SIZE, rotY: 0,
    })),
    tee:  { x:  0.3, y: 0.5, z: 1.5 },
    hole: { x:  0,   y: 0,   z: (n - 1) * TILE_SIZE + 1.5 },
  }
}

export const HOLES = [
  // Hole 1 – Short & straight   (3 tiles = 12 units)
  straightHole('Recht vooruit', 2, [S, S, S]),

  // Hole 2 – Medium straight    (5 tiles = 20 units)
  straightHole('Langere baan',  3, [S, S, S, S, S]),

  // Hole 3 – Hill in the middle (5 tiles)
  straightHole('Over de heuvel', 3, [S, HB, HC, HE, S]),

  // Hole 4 – Double hill        (6 tiles)
  straightHole('Dubbele heuvel', 3, [S, HB, HC, HE, HB, HE]),

  // Hole 5 – Long straight      (7 tiles)
  straightHole('Lange rechte baan', 4, [S, S, S, S, S, S, S]),

  // Hole 6 – Bump then long     (6 tiles)
  straightHole('Hobbel & door', 3, [S, BU, BD, S, S, S]),

  // Hole 7 – Hill + bump        (7 tiles)
  straightHole('Heuvel & hobbel', 4, [S, HB, HC, HE, BU, BD, S]),

  // Hole 8 – Long with hills    (8 tiles)
  straightHole('Lange heuvelroute', 4, [S, S, HB, HC, HC, HE, S, S]),

  // Hole 9 – Finale             (9 tiles)
  straightHole('Grote finale', 5, [S, HB, HC, HE, S, S, HB, HC, HE]),
]
