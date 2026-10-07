// Schatkist per kledingcategorie (illustraties in public/crates/), met
// twinkels en een gloed op de vloer (winkeloverzicht en detailpaneel; het
// openen zelf is 3D, zie KistOpener3D.jsx).
const CRATE_IMAGES = {
  shirt:    '/crates/crate_shirt.webp',
  broek:    '/crates/crate_broek.webp',
  sokken:   '/crates/crate_sokken.webp',
  schoenen: '/crates/crate_schoenen.webp',
  hoofd:    '/crates/crate_hoofd.webp',
}

const TWINKLE_OFFSETS = [
  { x: 18,  y: 20,  delay: 0 },
  { x: 140, y: 34,  delay: 0.6 },
  { x: 24,  y: 118, delay: 1.3 },
  { x: 132, y: 108, delay: 0.9 },
]

export default function CrateArtwork({ itemKey, accent, size = 130, big = false }) {
  return (
    <div className={`crate-art-photo ${big ? 'crate-art-photo-big' : ''}`} style={{ width: size, height: size }}>
      <div className="crate-art-floorglow" style={{ '--accent': accent }} />
      {TWINKLE_OFFSETS.map((t, i) => (
        <span
          key={i}
          className="crate-art-twinkle"
          style={{ left: `${(t.x / 160) * 100}%`, top: `${(t.y / 160) * 100}%`, animationDelay: `${t.delay}s`, color: i % 2 ? accent : '#fff' }}
        >✦</span>
      ))}
      <img src={CRATE_IMAGES[itemKey] || CRATE_IMAGES.shirt} alt="" loading="lazy" className="crate-art-img" />
    </div>
  )
}
