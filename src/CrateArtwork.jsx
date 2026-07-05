// Treasure-chest artwork per clothing category.
// Shirt/Broek/Sokken/Schoenen use real Nano Banana Pro illustrations (see
// public/crates/); Pet and the animated lootbox-open modal (which needs a
// separate lid layer to pop open) fall back to the procedural SVG version.
import { ICON_PATHS } from './categoryIcons'

const CRATE_IMAGES = {
  shirt:    '/crates/crate_shirt.webp',
  broek:    '/crates/crate_broek.webp',
  sokken:   '/crates/crate_sokken.webp',
  schoenen: '/crates/crate_schoenen.webp',
  hoofd:    '/crates/crate_hoofd.webp',
}

const TWINKLE_OFFSETS = [
  { x: 18,  y: 20, s: 6,  delay: 0 },
  { x: 140, y: 34, s: 5,  delay: 0.6 },
  { x: 24,  y: 118, s: 4, delay: 1.3 },
  { x: 132, y: 108, s: 6, delay: 0.9 },
]

function Star({ x, y, s, color, delay }) {
  return (
    <path
      className="crate-twinkle"
      style={{ animationDelay: `${delay}s` }}
      d={`M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z`}
      fill={color}
    />
  )
}

// Static photo variant — used in the overview cards and detail panel.
function CratePhoto({ itemKey, accent, size, big }) {
  return (
    <div className={`crate-art-photo ${big ? 'crate-art-photo-big' : ''}`} style={{ width: size, height: size }}>
      <div className="crate-art-floorglow" style={{ '--accent': accent }} />
      {TWINKLE_OFFSETS.map((t, i) => (
        <span
          key={i}
          className="crate-art-twinkle"
          style={{
            left: `${(t.x / 160) * 100}%`,
            top: `${(t.y / 160) * 100}%`,
            animationDelay: `${t.delay}s`,
            color: i % 2 ? accent : '#fff',
          }}
        >✦</span>
      ))}
      <img src={CRATE_IMAGES[itemKey]} alt="" loading="lazy" className="crate-art-img" />
    </div>
  )
}

// animState (optional): 'idle' | 'shake' | 'explode' — used by the lootbox-open
// modal to bob/shake the whole crate and pop the lid open. Overview/detail
// usages omit it and get the static illustration (only hover effects via CSS).
export default function CrateArtwork({ itemKey, iconKey, accent, size = 130, big = false, animState = null }) {
  const uid = `${itemKey}`
  const iconPath = ICON_PATHS[iconKey] || ICON_PATHS.shirt
  const animClass = animState ? `crate-anim-${animState}` : ''

  if (!animState && CRATE_IMAGES[itemKey]) {
    return <CratePhoto itemKey={itemKey} accent={accent} size={size} big={big} />
  }

  return (
    <svg
      viewBox="0 0 160 160"
      width={size}
      height={size}
      className={`crate-art ${big ? 'crate-art-big' : ''} ${animClass}`}
    >
      <defs>
        <radialGradient id={`floor-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`body-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4c3f94" />
          <stop offset="100%" stopColor="#221a48" />
        </linearGradient>
        <linearGradient id={`lid-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a76e0" />
          <stop offset="100%" stopColor="#372a6e" />
        </linearGradient>
        <linearGradient id={`band-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe9ae" />
          <stop offset="100%" stopColor="#dd9a0c" />
        </linearGradient>
        <radialGradient id={`inner-${uid}`} cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <filter id={`glow-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Lighter glow for the emblem icon so its silhouette stays crisp */}
        <filter id={`iconglow-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="0.9" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* floor glow */}
      <ellipse cx="80" cy="140" rx="52" ry="10" fill={`url(#floor-${uid})`} />

      {/* twinkles */}
      {TWINKLE_OFFSETS.map((t, i) => (
        <Star key={i} {...t} color={i % 2 ? accent : '#ffffff'} />
      ))}

      {/* light leaking from inside once the lid pops (explode only) */}
      <ellipse className="crate-inner-glow" cx="80" cy="70" rx="46" ry="20" fill={`url(#inner-${uid})`} />

      {/* chest body */}
      <g className="crate-body-group">
        <rect x="34" y="76" width="92" height="52" rx="9" fill={`url(#body-${uid})`} stroke="#161028" strokeWidth="1.5" />
        <rect x="34" y="76" width="92" height="10" rx="5" fill="#ffffff" opacity="0.06" />
        <rect x="52" y="76" width="10" height="52" fill={`url(#band-${uid})`} />
        <rect x="98" y="76" width="10" height="52" fill={`url(#band-${uid})`} />
        {[86, 106, 118].map(y => (
          <g key={`l${y}`}>
            <circle cx="57" cy={y} r="1.7" fill="#7a5a10" />
            <circle cx="103" cy={y} r="1.7" fill="#7a5a10" />
          </g>
        ))}
        {/* glowing seam where the lid meets the body */}
        <rect x="34" y="75" width="92" height="7" fill={accent} opacity="0.35" filter={`url(#glow-${uid})`} />
        <rect x="34" y="78" width="92" height="1.6" fill={accent} filter={`url(#glow-${uid})`} />
        {/* emblem */}
        <circle cx="80" cy="98" r="19" fill={accent} opacity="0.18" stroke={accent} strokeWidth="1.6" />
        <path d={iconPath} transform="translate(80 98) scale(1.15)" fill={accent} filter={`url(#iconglow-${uid})`} />
      </g>

      {/* lid (own group so JS/CSS can pop it open) */}
      <g className="crate-lid-group">
        <rect x="30" y="54" width="100" height="26" rx="10" fill={`url(#lid-${uid})`} stroke="#161028" strokeWidth="1.5" />
        <rect x="30" y="54" width="100" height="8" rx="5" fill="#ffffff" opacity="0.1" />
        <rect x="49" y="54" width="10" height="26" fill={`url(#band-${uid})`} />
        <rect x="101" y="54" width="10" height="26" fill={`url(#band-${uid})`} />
      </g>
    </svg>
  )
}
