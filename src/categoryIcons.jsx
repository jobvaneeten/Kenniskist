// Shared category pictograms — bold, blocky silhouettes centred on their own
// local origin (0,0), reused by the shop's crate emblem and the wardrobe's
// category tabs so both pages speak the same visual language.
export const ICON_PATHS = {
  shirt:    'M-8,-8 L-4,-10 L0,-7 L4,-10 L8,-8 L8,-4 L5,-4 L5,9 L-5,9 L-5,-4 L-8,-4 Z',
  broek:    'M-7,-9 H7 V-3 H-7 Z M-6,-3 H-1 V9 H-6 Z M1,-3 H6 V9 H1 Z',
  sokken:   'M-5,-9 H3 V0 H8 Q11,0 11,4 V6 Q11,9 8,9 H-5 Q-5,9 -5,6 Z',
  schoenen: 'M-8,-6 H-2 V-2 H4 V0 H8 V2 H9 V5 H-9 V2 H-8 Z',
  pet:      'M-8.5,-4.5 H3.5 V-1.5 H6.5 V1.5 H-11.5 V-1.5 H-8.5 Z M6.5,1.5 H11.5 V3.5 H6.5 Z',
}

// Small flat glyph (no chest/emblem chrome) — used for wardrobe category tabs.
export function CategoryGlyph({ icon, color, size = 22 }) {
  return (
    <svg viewBox="-13 -13 26 26" width={size} height={size}>
      <path d={ICON_PATHS[icon] || ICON_PATHS.shirt} fill={color} />
    </svg>
  )
}
