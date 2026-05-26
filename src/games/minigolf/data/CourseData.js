// Each tile: { model, x, z, rotY (degrees), scaleY (for ramps) }
// Tile unit = 4 Babylon units. Rotations: 0=+Z, 90=+X, 180=-Z, 270=-X
// Hole origin is always (0,0,0); tiles offset from there.

export const TILE_SIZE = 4   // Babylon units per tile slot
// Ball spawn Y is intentionally high (2.5) so it drops onto the surface from above.
// Hole Y is only used for the flag visual; XZ-proximity drives in-hole detection.

// Hole definitions. tee/hole in tile-local coords (multiply by TILE_SIZE for world).
export const HOLES = [
  // ── Hole 1 – Straight shot ─────────────────────────────────────────
  {
    name: 'Rechte baan', par: 2,
    tiles: [
      { model: 'spline-default-cap-front',   x: 0, z: 0,  rotY: 0   },
      { model: 'spline-default-straight',    x: 0, z: 1,  rotY: 0   },
      { model: 'spline-default-straight',    x: 0, z: 2,  rotY: 0   },
      { model: 'spline-default-straight',    x: 0, z: 3,  rotY: 0   },
      { model: 'spline-default-cap-back',    x: 0, z: 4,  rotY: 0   },
    ],
    tee:  { x: 0, y: 2.5, z: 0.5 },
    hole: { x: 0, y: 0.5, z: 15.5 },
  },

  // ── Hole 2 – Left corner ───────────────────────────────────────────
  {
    name: 'Bocht links', par: 3,
    tiles: [
      { model: 'spline-default-cap-front',       x: 0, z: 0,  rotY: 0   },
      { model: 'spline-default-straight',         x: 0, z: 1,  rotY: 0   },
      { model: 'spline-default-straight',         x: 0, z: 2,  rotY: 0   },
      { model: 'spline-default-corner-small',     x: 0, z: 3,  rotY: 270 },
      { model: 'spline-default-straight',         x:-1, z: 3,  rotY: 90  },
      { model: 'spline-default-straight',         x:-2, z: 3,  rotY: 90  },
      { model: 'spline-default-cap-back',         x:-3, z: 3,  rotY: 90  },
    ],
    tee:  { x: 0,   y: 2.5, z: 0.5 },
    hole: { x:-11.5,y: 0.5, z: 12  },
  },

  // ── Hole 3 – S-curve ──────────────────────────────────────────────
  {
    name: 'S-bocht', par: 3,
    tiles: [
      { model: 'spline-default-cap-front',       x: 0, z: 0,  rotY: 0   },
      { model: 'spline-default-straight',         x: 0, z: 1,  rotY: 0   },
      { model: 'spline-default-corner-small',     x: 0, z: 2,  rotY: 90  },
      { model: 'spline-default-straight',         x: 1, z: 2,  rotY: 90  },
      { model: 'spline-default-corner-small',     x: 2, z: 2,  rotY: 0   },
      { model: 'spline-default-straight',         x: 2, z: 3,  rotY: 0   },
      { model: 'spline-default-straight',         x: 2, z: 4,  rotY: 0   },
      { model: 'spline-default-cap-back',         x: 2, z: 5,  rotY: 0   },
    ],
    tee:  { x: 0,  y: 2.5, z: 0.5 },
    hole: { x: 8,  y: 0.5, z: 19.5 },
  },

  // ── Hole 4 – Ramp up then down ────────────────────────────────────
  {
    name: 'Heuvel', par: 3,
    tiles: [
      { model: 'spline-default-cap-front',                  x: 0, z: 0,  rotY: 0 },
      { model: 'spline-default-straight',                    x: 0, z: 1,  rotY: 0 },
      { model: 'spline-default-straight-hill-beginning',     x: 0, z: 2,  rotY: 0 },
      { model: 'spline-default-straight-hill-complete',      x: 0, z: 3,  rotY: 0 },
      { model: 'spline-default-straight-hill-end',           x: 0, z: 4,  rotY: 0 },
      { model: 'spline-default-straight',                    x: 0, z: 5,  rotY: 0 },
      { model: 'spline-default-cap-back',                    x: 0, z: 6,  rotY: 0 },
    ],
    tee:  { x: 0, y: 2.5, z: 0.5 },
    hole: { x: 0, y: 0.5, z: 23.5 },
  },

  // ── Hole 5 – Zigzag ───────────────────────────────────────────────
  {
    name: 'Zigzag', par: 4,
    tiles: [
      { model: 'spline-default-cap-front',   x: 0, z: 0,  rotY: 0   },
      { model: 'spline-default-straight',    x: 0, z: 1,  rotY: 0   },
      { model: 'spline-default-corner-small',x: 0, z: 2,  rotY: 90  },
      { model: 'spline-default-straight',    x: 1, z: 2,  rotY: 90  },
      { model: 'spline-default-straight',    x: 2, z: 2,  rotY: 90  },
      { model: 'spline-default-corner-small',x: 3, z: 2,  rotY: 180 },
      { model: 'spline-default-straight',    x: 3, z: 3,  rotY: 0   },
      { model: 'spline-default-straight',    x: 3, z: 4,  rotY: 0   },
      { model: 'spline-default-cap-back',    x: 3, z: 5,  rotY: 0   },
    ],
    tee:  { x: 0,  y: 2.5, z: 0.5 },
    hole: { x: 12, y: 0.5, z: 19.5 },
  },

  // ── Hole 6 – Large corner ─────────────────────────────────────────
  {
    name: 'Grote bocht', par: 3,
    tiles: [
      { model: 'spline-default-cap-front',      x: 0, z: 0,  rotY: 0   },
      { model: 'spline-default-straight',        x: 0, z: 1,  rotY: 0   },
      { model: 'spline-default-corner-large',    x: 0, z: 2,  rotY: 90  },
      { model: 'spline-default-straight',        x: 2, z: 0,  rotY: 90  },
      { model: 'spline-default-straight',        x: 3, z: 0,  rotY: 90  },
      { model: 'spline-default-cap-back',        x: 4, z: 0,  rotY: 90  },
    ],
    tee:  { x: 0,  y: 2.5, z: 0.5 },
    hole: { x: 16, y: 0.5, z: 1.5  },
  },

  // ── Hole 7 – Bend + ramp ──────────────────────────────────────────
  {
    name: 'Bocht & helling', par: 4,
    tiles: [
      { model: 'spline-default-cap-front',               x: 0, z: 0,  rotY: 0   },
      { model: 'spline-default-straight',                 x: 0, z: 1,  rotY: 0   },
      { model: 'spline-default-straight-bend',            x: 0, z: 2,  rotY: 0   },
      { model: 'spline-default-straight',                 x: 0, z: 3,  rotY: 0   },
      { model: 'spline-default-straight-hill-beginning',  x: 0, z: 4,  rotY: 0   },
      { model: 'spline-default-straight-hill-complete',   x: 0, z: 5,  rotY: 0   },
      { model: 'spline-default-straight-hill-end',        x: 0, z: 6,  rotY: 0   },
      { model: 'spline-default-cap-back',                 x: 0, z: 7,  rotY: 0   },
    ],
    tee:  { x: 0, y: 2.5, z: 0.5 },
    hole: { x: 0, y: 0.5, z: 27.5 },
  },

  // ── Hole 8 – Curve ────────────────────────────────────────────────
  {
    name: 'Curve', par: 3,
    tiles: [
      { model: 'spline-default-cap-front',  x: 0, z: 0,  rotY: 0   },
      { model: 'spline-default-straight',   x: 0, z: 1,  rotY: 0   },
      { model: 'spline-default-curve',      x: 0, z: 2,  rotY: 0   },
      { model: 'spline-default-curve',      x: 1, z: 3,  rotY: 0   },
      { model: 'spline-default-straight',   x: 2, z: 4,  rotY: 90  },
      { model: 'spline-default-cap-back',   x: 3, z: 4,  rotY: 90  },
    ],
    tee:  { x: 0,  y: 2.5, z: 0.5 },
    hole: { x: 12, y: 0.5, z: 17.5 },
  },

  // ── Hole 9 – Long zigzag finale ───────────────────────────────────
  {
    name: 'Finale', par: 5,
    tiles: [
      { model: 'spline-default-cap-front',   x: 0, z: 0,  rotY: 0   },
      { model: 'spline-default-straight',    x: 0, z: 1,  rotY: 0   },
      { model: 'spline-default-straight',    x: 0, z: 2,  rotY: 0   },
      { model: 'spline-default-corner-small',x: 0, z: 3,  rotY: 90  },
      { model: 'spline-default-straight',    x: 1, z: 3,  rotY: 90  },
      { model: 'spline-default-straight',    x: 2, z: 3,  rotY: 90  },
      { model: 'spline-default-corner-small',x: 3, z: 3,  rotY: 180 },
      { model: 'spline-default-straight',    x: 3, z: 4,  rotY: 0   },
      { model: 'spline-default-straight',    x: 3, z: 5,  rotY: 0   },
      { model: 'spline-default-corner-small',x: 3, z: 6,  rotY: 270 },
      { model: 'spline-default-straight',    x: 2, z: 6,  rotY: 270 },
      { model: 'spline-default-straight',    x: 1, z: 6,  rotY: 270 },
      { model: 'spline-default-corner-small',x: 0, z: 6,  rotY: 0   },
      { model: 'spline-default-straight',    x: 0, z: 7,  rotY: 0   },
      { model: 'spline-default-cap-back',    x: 0, z: 8,  rotY: 0   },
    ],
    tee:  { x: 0,  y: 2.5, z: 0.5 },
    hole: { x: 0,  y: 0.5, z: 31.5 },
  },
]
