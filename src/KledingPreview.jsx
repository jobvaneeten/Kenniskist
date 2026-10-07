// Een kledingstuk als plaatje: het silhouet van de categorie (shirt, broek,
// sok, schoen, pet) gevuld met de kleur/print/patroon van het item. Het
// silhouet is een CSS-masker, zodat dezelfde achtergrond als swatchStyle()
// (kleuren, patronen, preview-plaatjes) gewoon binnen de vorm valt — werkt ook
// op iPads (geen foreignObject). Naden en omtrek liggen er als SVG overheen.
import { swatchStyle, swatchEmoji, swatchBadge } from './itemsCatalog'

const VORMEN = {
  shirt: {
    d: 'M35 12 L43 8 Q50 15 57 8 L65 12 L86 24 Q88 26 87 28 L79 43 Q78 45 76 44 L69 40 L69 88 Q69 91 66 91 L34 91 Q31 91 31 88 L31 40 L24 44 Q22 45 21 43 L13 28 Q12 26 14 24 Z',
    naden: ['M43 8 Q50 15 57 8', 'M31 40 Q33 28 35 13', 'M69 40 Q67 28 65 13', 'M31 85 L69 85', 'M21 39 L27 36', 'M79 39 L73 36'],
    label: [50, 56],
  },
  broek: {
    d: 'M27 8 L73 8 Q75 8 75 10 L82 90 Q82 92 80 92 L58 92 Q56 92 56 90 L50 38 L44 90 Q44 92 42 92 L20 92 Q18 92 18 90 L25 10 Q25 8 27 8 Z',
    naden: ['M26 17 L74 17', 'M50 17 L50 36', 'M28 19 Q34 28 41 19', 'M72 19 Q66 28 59 19', 'M20 85 L43 85', 'M57 85 L80 85'],
    label: [50, 27],
  },
  sokken: {
    d: 'M34 6 L60 6 Q62 6 62 8 L62 54 Q62 62 70 66 L86 74 Q94 79 90 88 Q87 94 78 93 L44 93 Q30 93 30 80 L30 66 Q32 60 32 54 L32 8 Q32 6 34 6 Z',
    naden: ['M32 17 L62 17', 'M32 11 L62 11', 'M30 76 Q40 78 42 93', 'M78 93 Q74 80 86 74'],
    label: [47, 40],
  },
  schoenen: {
    d: 'M10 70 L12 48 Q13 42 19 42 L34 42 Q38 42 40 38 L44 30 Q46 27 50 28 L58 31 Q62 33 63 37 L66 46 Q80 50 90 58 Q95 62 94 68 L94 72 L10 72 Z M8 72 L95 72 L95 78 Q95 82 91 82 L12 82 Q8 82 8 78 Z',
    naden: ['M8 72 L95 72', 'M46 35 L55 38', 'M44 40 L57 43', 'M42 45 L59 47', 'M76 52 Q71 62 76 72', 'M12 52 L36 52'],
    label: [30, 60],
  },
  hoofd: {
    d: 'M18 64 Q16 30 48 24 Q78 22 82 56 L82 60 Q92 62 97 66 Q98 70 94 71 L22 71 Q17 71 18 64 Z',
    naden: ['M48 24 Q45 44 47 66', 'M31 32 Q36 46 33 66', 'M66 28 Q65 44 67 61', 'M82 60 Q62 62 40 67'],
    label: [48, 47],
    knoop: [48, 24],
  },
}

const maskers = {}
function masker(type) {
  if (!maskers[type]) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='${VORMEN[type].d}'/></svg>`
    maskers[type] = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  }
  return maskers[type]
}

export default function KledingPreview({ type, item, size = 64, glans = false, className = '' }) {
  const t = VORMEN[type] ? type : 'shirt'
  const v = VORMEN[t]
  const m = masker(t)
  const emoji = swatchEmoji(item)
  const badge = swatchBadge(item)
  return (
    <div className={`kp ${className}`} style={{ width: size, height: size }}>
      <div className="kp-stof" style={{ ...swatchStyle(item), WebkitMaskImage: m, maskImage: m }}>
        <div className="kp-schaduw" />
        {glans && <div className="kp-glans" />}
      </div>
      <svg className="kp-lijnen" viewBox="0 0 100 100" aria-hidden="true">
        {v.naden.map((d, i) => <path key={i} d={d} className="kp-naad" />)}
        {v.knoop && <circle cx={v.knoop[0]} cy={v.knoop[1]} r="3" className="kp-knoop" />}
        <path d={v.d} className="kp-rand" />
        {emoji && <text x={v.label[0]} y={v.label[1]} className="kp-emoji">{emoji}</text>}
        {badge && <text x={v.label[0]} y={v.label[1]} className="kp-badge">{badge}</text>}
      </svg>
    </div>
  )
}
