// Mini getekende SVG-scenes voor menukaarten.
// .msa = actie-animatie (speelt alleen bij hover op de kaart)
// .msi = idle-animatie (gepauzeerd in rust → geen lag; speelt bij hover)
import { useRef, useEffect } from 'react'
import './menu-scenes.css'

const FONT = 'Nunito, sans-serif'

const SCENES = {
  taal: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ms-ta-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d3050" /><stop offset="1" stopColor="#16486e" />
        </linearGradient>
      </defs>
      <rect width="160" height="90" fill="url(#ms-ta-bg)" />
      <path d="M80 38 C 62 30 44 30 32 35 V 74 C 44 69 62 69 80 77 C 98 69 116 69 128 74 V 35 C 116 30 98 30 80 38 z" fill="#f5f0e1" />
      <path d="M80 38 V 77" stroke="#d8d0ba" strokeWidth="2" />
      <path d="M40 42 h28 M40 49 h28 M40 56 h22 M92 42 h28 M92 49 h28 M92 56 h24" stroke="#b8b099" strokeWidth="2" strokeLinecap="round" />
      <text className="msi ms-bob" x="44" y="24" fontSize="17" fontWeight="900" fill="#4FC3F7" fontFamily={FONT}>A</text>
      <text className="msi ms-bob" style={{ animationDelay: '0.6s' }} x="76" y="18" fontSize="14" fontWeight="900" fill="#FFD23F" fontFamily={FONT}>b</text>
      <text className="msi ms-bob" style={{ animationDelay: '1.2s' }} x="104" y="24" fontSize="15" fontWeight="900" fill="#06D6A0" fontFamily={FONT}>c</text>
    </svg>
  ),

  spelling: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#2a1840" />
      <g transform="rotate(-3 80 48)">
        <rect x="26" y="18" width="108" height="62" rx="5" fill="#f7f4ec" />
        <line x1="34" y1="34" x2="126" y2="34" stroke="#cfd8e8" strokeWidth="1.5" />
        <line x1="34" y1="48" x2="126" y2="48" stroke="#cfd8e8" strokeWidth="1.5" />
        <line x1="34" y1="62" x2="126" y2="62" stroke="#cfd8e8" strokeWidth="1.5" />
        <text x="38" y="31" fontSize="11" fontWeight="800" fill="#3a4a6b" fontFamily={FONT} fontStyle="italic">ik loop</text>
        <text x="38" y="45" fontSize="11" fontWeight="800" fill="#8e3fa8" fontFamily={FONT} fontStyle="italic">hij loop_?</text>
      </g>
      <g className="msa ms-write" style={{ transformOrigin: '108px 52px' }}>
        <g transform="rotate(40 108 52)">
          <rect x="102" y="22" width="12" height="44" rx="2" fill="#FFD23F" />
          <rect x="102" y="16" width="12" height="7" rx="2" fill="#ff8aa8" />
          <path d="M102 66 l6 11 6 -11 z" fill="#e8c89a" />
          <path d="M106 73 l2 4 2 -4 z" fill="#42425c" />
        </g>
      </g>
    </svg>
  ),

  rekenen: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#3d2b1a" />
      <rect x="12" y="10" width="136" height="70" rx="4" fill="#1e4434" stroke="#6b4f2a" strokeWidth="4" />
      <text x="30" y="44" fontSize="17" fontWeight="900" fill="#f0f0e8" fontFamily={FONT}>23 × 4 = ?</text>
      <path d="M30 52 h62" stroke="#f0f0e8" strokeWidth="1.4" opacity="0.35" strokeDasharray="2 3" />
      <text x="30" y="68" fontSize="10" fontWeight="800" fill="#9fd0b8" fontFamily={FONT}>92 ✓</text>
      <g className="msa ms-liftoff">
        <path d="M124 28 q5 -12 10 0 v18 h-10 z" fill="#e8e8f0" />
        <path d="M124 40 l-6 9 6 -2 z" fill="#e8434b" /><path d="M134 40 l6 9 -6 -2 z" fill="#e8434b" />
        <circle cx="129" cy="33" r="2.6" fill="#4dd7e8" />
        <path className="msi ms-flame" d="M126 47 l3 8 3 -8 z" fill="#FFD23F" style={{ transformOrigin: '129px 47px' }} />
      </g>
    </svg>
  ),

  begrijpend: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#0d3d33" />
      <rect x="24" y="16" width="112" height="62" rx="5" fill="#f5f0e1" />
      <path d="M34 28 h70 M34 38 h92 M34 48 h84 M34 58 h92 M34 68 h60" stroke="#b8b099" strokeWidth="2.5" strokeLinecap="round" />
      <g className="msa ms-scan">
        <circle cx="58" cy="44" r="14" fill="rgba(255,210,63,0.18)" stroke="#FFD23F" strokeWidth="3.5" />
        <line x1="68" y1="54" x2="80" y2="66" stroke="#FFD23F" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  ),

  verhaal: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#1a2a4a" />
      <rect x="20" y="14" width="86" height="64" rx="5" fill="#f7f4ec" />
      <path d="M28 26 h64 M28 35 h70 M28 44 h56 M28 53 h70 M28 62 h44" stroke="#aab4c8" strokeWidth="2.5" strokeLinecap="round" />
      <text x="28" y="74" fontSize="9" fontWeight="900" fill="#3a4a6b" fontFamily={FONT}>= ?</text>
      <g className="msa ms-liftoff">
        <path d="M124 30 q6 -14 12 0 v22 h-12 z" fill="#e8e8f0" />
        <path d="M124 44 l-7 11 7 -2 z" fill="#e8434b" /><path d="M136 44 l7 11 -7 -2 z" fill="#e8434b" />
        <circle cx="130" cy="36" r="3" fill="#4dd7e8" />
        <path className="msi ms-flame" d="M126 52 l4 10 4 -10 z" fill="#FFD23F" style={{ transformOrigin: '130px 52px' }} />
      </g>
    </svg>
  ),

  kaal: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#1a2a4a" />
      <rect x="18" y="16" width="124" height="58" rx="6" fill="#0f1a33" stroke="#4dd7e8" strokeWidth="2.5" />
      <text x="30" y="40" fontSize="15" fontWeight="900" fill="#fffbeb" fontFamily={FONT}>763 − 145</text>
      <text x="30" y="62" fontSize="15" fontWeight="900" fill="#FFD23F" fontFamily={FONT}>= ?</text>
      <g className="msa ms-liftoff">
        <rect x="112" y="40" width="20" height="24" rx="3" fill="#e8e8f0" />
        <path d="M116 47 h12 M116 53 h12 M116 59 h7" stroke="#4dd7e8" strokeWidth="2.2" strokeLinecap="round" />
      </g>
    </svg>
  ),

  solo: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#2e8b3d" />
      <rect y="0" width="160" height="10" fill="#37a04a" /><rect y="22" width="160" height="10" fill="#37a04a" />
      <rect y="44" width="160" height="10" fill="#37a04a" /><rect y="66" width="160" height="10" fill="#37a04a" />
      <path d="M120 22 h28 v46" fill="none" stroke="#fff" strokeWidth="3" />
      <circle cx="36" cy="36" r="8" fill="#ffd9b3" />
      <rect x="27" y="44" width="18" height="19" rx="5" fill="#e8434b" />
      <rect x="29" y="62" width="6" height="14" rx="3" fill="#1a1a2e" /><rect x="37" y="62" width="6" height="14" rx="3" fill="#1a1a2e" />
      <g className="msa ms-kick">
        <circle cx="60" cy="70" r="7" fill="#fff" /><circle cx="60" cy="70" r="2.5" fill="#1a1a2e" />
      </g>
    </svg>
  ),

  duo: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#2e8b3d" />
      <rect y="0" width="160" height="10" fill="#37a04a" /><rect y="22" width="160" height="10" fill="#37a04a" />
      <rect y="44" width="160" height="10" fill="#37a04a" /><rect y="66" width="160" height="10" fill="#37a04a" />
      <line x1="80" y1="0" x2="80" y2="90" stroke="#fff" strokeWidth="2" opacity="0.5" />
      <circle cx="80" cy="45" r="14" fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" />
      <circle cx="30" cy="34" r="8" fill="#ffd9b3" />
      <rect x="21" y="42" width="18" height="19" rx="5" fill="#e8434b" />
      <rect x="23" y="60" width="6" height="14" rx="3" fill="#1a1a2e" /><rect x="31" y="60" width="6" height="14" rx="3" fill="#1a1a2e" />
      <circle cx="130" cy="34" r="8" fill="#ffd9b3" />
      <rect x="121" y="42" width="18" height="19" rx="5" fill="#3a6bb0" />
      <rect x="123" y="60" width="6" height="14" rx="3" fill="#1a1a2e" /><rect x="131" y="60" width="6" height="14" rx="3" fill="#1a1a2e" />
      <g className="msa ms-bounce">
        <circle cx="80" cy="72" r="7" fill="#fff" /><circle cx="80" cy="72" r="2.5" fill="#1a1a2e" />
      </g>
    </svg>
  ),

  topo: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#0b3a45" />
      <path d="M22 18 l38 -6 40 8 38 -6 v62 l-38 6 -40 -8 -38 6 z" fill="#f2ead2" />
      <path d="M60 12 v62 M100 20 v62" stroke="#d6caa6" strokeWidth="1.5" />
      <path d="M34 40 q10 -14 22 -6 t20 2 q10 8 4 18 t-20 6 q-14 -2 -20 -8 t-6 -12z" fill="#9ccf8a" stroke="#6fa860" strokeWidth="1.5" />
      <path d="M92 34 q12 -8 22 2 t14 14 q-4 12 -18 10 t-20 -12z" fill="#9ccf8a" stroke="#6fa860" strokeWidth="1.5" />
      <path d="M58 56 q14 6 36 -4" stroke="#5aa9d6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <g className="msi ms-bob">
        <path d="M110 30 a8 8 0 1 1 16 0 c0 7 -8 14 -8 14 s-8 -7 -8 -14z" fill="#ff2f8e" />
        <circle cx="118" cy="30" r="3" fill="#fff" />
      </g>
    </svg>
  ),

  tafels: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#3d2b1a" />
      <rect x="12" y="10" width="136" height="70" rx="4" fill="#1e4434" stroke="#6b4f2a" strokeWidth="4" />
      <text x="28" y="36" fontSize="15" fontWeight="900" fill="#f0f0e8" fontFamily={FONT}>7 × 8 = 56</text>
      <text x="28" y="60" fontSize="15" fontWeight="900" fill="#9fd0b8" fontFamily={FONT}>56 : 8 = ?</text>
      <text className="msi ms-pop" x="118" y="60" fontSize="16" fontWeight="900" fill="#FFD23F" fontFamily={FONT}>7</text>
    </svg>
  ),

  breuken: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#4a1e2a" />
      <circle cx="52" cy="46" r="28" fill="#f4c26b" stroke="#c98a2e" strokeWidth="3" />
      <path d="M52 46 L52 18 A28 28 0 0 1 80 46 z" fill="#e8434b" />
      <path d="M52 18 v56 M24 46 h56" stroke="#c98a2e" strokeWidth="2" />
      <g className="msi ms-bob">
        <rect x="96" y="30" width="48" height="14" rx="3" fill="#7a4a2a" />
        <rect x="96" y="30" width="12" height="14" rx="3" fill="#b07a4a" />
        <path d="M108 30 v14 M120 30 v14 M132 30 v14" stroke="#4a2a14" strokeWidth="1.5" />
      </g>
      <text x="108" y="68" fontSize="15" fontWeight="900" fill="#fff" fontFamily={FONT}>¼</text>
    </svg>
  ),

  maten: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#16335c" />
      <g transform="rotate(-8 70 40)">
        <rect x="14" y="28" width="104" height="22" rx="3" fill="#FFD23F" />
        <path d="M24 28 v10 M34 28 v6 M44 28 v10 M54 28 v6 M64 28 v10 M74 28 v6 M84 28 v10 M94 28 v6 M104 28 v10" stroke="#7a5a00" strokeWidth="1.5" />
      </g>
      <g className="msi ms-bob">
        <path d="M118 44 h26 l-4 34 h-18 z" fill="rgba(124,200,255,0.25)" stroke="#bfe8ff" strokeWidth="2" />
        <path d="M121 60 h20 l-2 18 h-16 z" fill="#38bdf8" />
        <path d="M140 52 h-6 M140 60 h-6 M140 68 h-6" stroke="#bfe8ff" strokeWidth="1.5" />
      </g>
      <text x="22" y="76" fontSize="11" fontWeight="900" fill="#bfe8ff" fontFamily={FONT}>5 m = 500 cm</text>
    </svg>
  ),

  denkvragen: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#2a1f4a" />
      <ellipse cx="74" cy="40" rx="46" ry="26" fill="#f7f4ec" />
      <circle cx="40" cy="72" r="6" fill="#f7f4ec" /><circle cx="28" cy="82" r="3.5" fill="#f7f4ec" />
      <text x="74" y="50" textAnchor="middle" fontSize="28" fontWeight="900" fill="#7c3aed" fontFamily={FONT}>?</text>
      <g className="msi ms-pop" style={{ transformOrigin: '134px 30px' }}>
        <circle cx="134" cy="28" r="10" fill="#FFD23F" />
        <rect x="129" y="38" width="10" height="7" rx="2" fill="#cfcfe0" />
      </g>
    </svg>
  ),

  procenten: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#3a1450" />
      <rect x="14" y="26" width="40" height="38" rx="6" fill="#a855f7" />
      <text x="34" y="51" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff" fontFamily={FONT}>25%</text>
      <rect className="msi ms-bob" x="60" y="26" width="40" height="38" rx="6" fill="#38bdf8" />
      <text x="80" y="51" textAnchor="middle" fontSize="15" fontWeight="900" fill="#0b1a2e" fontFamily={FONT}>¼</text>
      <rect x="106" y="26" width="40" height="38" rx="6" fill="#FFD23F" />
      <text x="126" y="51" textAnchor="middle" fontSize="13" fontWeight="900" fill="#3a2a00" fontFamily={FONT}>0,25</text>
    </svg>
  ),

  klok: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#123a3a" />
      <circle cx="56" cy="45" r="30" fill="#f7f4ec" stroke="#2dd4bf" strokeWidth="4" />
      <path d="M56 19 v5 M56 66 v5 M30 45 h5 M77 45 h5" stroke="#3a4a6b" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M56 45 L56 28" stroke="#1a1a2e" strokeWidth="3" strokeLinecap="round" />
      <g className="msi ms-sway" style={{ transformOrigin: '56px 45px' }}>
        <path d="M56 45 L72 52" stroke="#e8434b" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <circle cx="56" cy="45" r="2.5" fill="#1a1a2e" />
      <rect x="98" y="30" width="50" height="28" rx="5" fill="#0a1a1a" stroke="#2dd4bf" strokeWidth="2" />
      <text x="123" y="50" textAnchor="middle" fontSize="14" fontWeight="900" fill="#5eead4" fontFamily={FONT}>15:20</text>
    </svg>
  ),

  dictee: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#2a1840" />
      <rect x="30" y="12" width="100" height="70" rx="5" fill="#f7f4ec" />
      <path d="M30 12 v70" stroke="#e8434b" strokeWidth="2" transform="translate(14 0)" />
      <text x="52" y="32" fontSize="11" fontWeight="800" fill="#3a4a6b" fontFamily={FONT}>1. de fiets</text>
      <text x="52" y="48" fontSize="11" fontWeight="800" fill="#3a4a6b" fontFamily={FONT}>2. het ijsje</text>
      <text x="52" y="64" fontSize="11" fontWeight="800" fill="#8e3fa8" fontFamily={FONT}>3. de ...</text>
      <text className="msi ms-pop" x="114" y="48" fontSize="12" fontWeight="900" fill="#06a077" fontFamily={FONT}>✓</text>
    </svg>
  ),

  categorie: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#1f2a4a" />
      <g transform="rotate(-6 50 46)">
        <rect x="22" y="22" width="56" height="46" rx="6" fill="#f7f4ec" />
        <text x="50" y="52" textAnchor="middle" fontSize="18" fontWeight="900" fill="#8e3fa8" fontFamily={FONT}>ei</text>
      </g>
      <g className="msi ms-bob" transform="rotate(6 110 46)">
        <rect x="82" y="22" width="56" height="46" rx="6" fill="#f7f4ec" />
        <text x="110" y="52" textAnchor="middle" fontSize="18" fontWeight="900" fill="#0d6ea3" fontFamily={FONT}>ij</text>
      </g>
    </svg>
  ),
}

export default function MenuScene({ name }) {
  const s = SCENES[name]
  const ref = useRef(null)
  // SMIL-animaties (animateMotion) staan stil in rust en lopen pas bij hover.
  useEffect(() => {
    const svg = ref.current?.querySelector('svg')
    try { svg?.pauseAnimations?.() } catch {}
  }, [name])
  if (!s) return null
  const enter = () => { try { ref.current?.querySelector('svg')?.unpauseAnimations?.() } catch {} }
  const leave = () => { try { ref.current?.querySelector('svg')?.pauseAnimations?.() } catch {} }
  return <div className="ms-wrap" ref={ref} onPointerEnter={enter} onPointerLeave={leave}>{s}</div>
}
