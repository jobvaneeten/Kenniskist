// Mini getekende SVG-scenes voor menukaarten.
// .msa = actie-animatie (speelt alleen bij hover op de kaart)
// .msi = idle-animatie (gepauzeerd in rust → geen lag; speelt bij hover)
import { useRef, useEffect } from 'react'
import './menu-scenes.css'

const FONT = 'Nunito, sans-serif'

const SCENES = {
  football: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ms-fb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2a52" /><stop offset="1" stopColor="#2d4a7a" />
        </linearGradient>
      </defs>
      <rect width="160" height="90" fill="url(#ms-fb-sky)" />
      <circle cx="138" cy="13" r="7" fill="#ffe9a8" opacity="0.9" />
      <rect y="52" width="160" height="38" fill="#2e8b3d" />
      <rect y="52" width="160" height="6" fill="#37a04a" />
      <rect y="64" width="160" height="6" fill="#37a04a" />
      <rect y="76" width="160" height="6" fill="#37a04a" />
      <path d="M118 28 h32 v34" fill="none" stroke="#fff" strokeWidth="3" />
      <path d="M118 28 v34 M126 30 v30 M134 30 v30 M142 30 v30 M118 38 h32 M118 47 h32" stroke="#fff" strokeWidth="1" opacity="0.45" fill="none" />
      <circle cx="34" cy="46" r="7" fill="#ffd9b3" />
      <rect x="26" y="53" width="16" height="17" rx="5" fill="#e8434b" />
      <rect x="28" y="69" width="5" height="13" rx="2" fill="#1a1a2e" />
      <rect x="35" y="69" width="5" height="13" rx="2" fill="#1a1a2e" />
      <g className="msa ms-kick">
        <circle cx="56" cy="76" r="7" fill="#fff" />
        <circle cx="56" cy="76" r="2.6" fill="#1a1a2e" />
        <circle cx="51.5" cy="73" r="1.6" fill="#1a1a2e" opacity="0.6" />
        <circle cx="60" cy="71.5" r="1.6" fill="#1a1a2e" opacity="0.6" />
      </g>
    </svg>
  ),

  headsoccer: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ms-hs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a1a2e" /><stop offset="1" stopColor="#1a4060" />
        </linearGradient>
      </defs>
      <rect width="160" height="90" fill="url(#ms-hs-sky)" />
      <rect y="64" width="160" height="26" fill="#267a32" />
      <rect y="64" width="160" height="4" fill="#37a04a" />
      {/* goals */}
      <path d="M6 38 v26 M2 38 h8" stroke="#f2f2f2" strokeWidth="2.5" fill="none" />
      <path d="M154 38 v26 M150 38 h8" stroke="#f2f2f2" strokeWidth="2.5" fill="none" />
      {/* left bighead */}
      <g>
        <rect x="34" y="48" width="20" height="16" rx="4" fill="#FF6900" />
        <circle cx="44" cy="40" r="11" fill="#F5C89A" />
        <circle cx="41" cy="39" r="1.8" fill="#1a1a2e" /><circle cx="47" cy="39" r="1.8" fill="#1a1a2e" />
      </g>
      {/* right bighead */}
      <g>
        <rect x="106" y="48" width="20" height="16" rx="4" fill="#009C3B" />
        <circle cx="116" cy="40" r="11" fill="#F5C89A" />
        <circle cx="113" cy="39" r="1.8" fill="#1a1a2e" /><circle cx="119" cy="39" r="1.8" fill="#1a1a2e" />
      </g>
      {/* ball */}
      <g className="msa ms-kick">
        <circle cx="80" cy="58" r="6.5" fill="#fff" />
        <circle cx="80" cy="58" r="2.4" fill="#1a1a2e" />
      </g>
      {/* spark */}
      <text x="80" y="22" textAnchor="middle" fontSize="13" className="msa ms-shoot">⚡</text>
    </svg>
  ),

  towerdefense: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#2f6b35" />
      <circle cx="20" cy="20" r="10" fill="#3a7d41" /><circle cx="140" cy="80" r="14" fill="#3a7d41" />
      <circle cx="60" cy="84" r="8" fill="#3a7d41" />
      <path d="M-6 72 C 40 72 38 34 80 34 S 122 62 166 56" fill="none" stroke="#d9b98a" strokeWidth="14" strokeLinecap="round" />
      <path d="M-6 72 C 40 72 38 34 80 34 S 122 62 166 56" fill="none" stroke="#c4a172" strokeWidth="2" strokeDasharray="5 7" />
      <g>
        <rect x="38" y="14" width="20" height="28" rx="2" fill="#8b8b9e" />
        <rect x="36" y="10" width="5" height="7" fill="#8b8b9e" /><rect x="45" y="10" width="5" height="7" fill="#8b8b9e" /><rect x="54" y="10" width="5" height="7" fill="#8b8b9e" />
        <rect x="45" y="28" width="6" height="9" rx="3" fill="#42425c" />
        <line x1="48" y1="10" x2="48" y2="2" stroke="#6b4f2a" strokeWidth="1.6" />
        <path d="M48 2 l9 2.5 -9 2.5 z" fill="#e8434b" />
      </g>
      <g>
        <rect x="104" y="62" width="18" height="24" rx="2" fill="#9e9eb0" />
        <rect x="102" y="58" width="5" height="6" fill="#9e9eb0" /><rect x="110" y="58" width="5" height="6" fill="#9e9eb0" /><rect x="118" y="58" width="5" height="6" fill="#9e9eb0" />
        <rect x="110" y="74" width="6" height="8" rx="3" fill="#42425c" />
      </g>
      <g>
        <circle r="6" fill="#9b59d0" />
        <circle cx="-2" cy="-1.5" r="1.3" fill="#fff" /><circle cx="2" cy="-1.5" r="1.3" fill="#fff" />
        <animateMotion dur="4s" repeatCount="indefinite" path="M-6 72 C 40 72 38 34 80 34 S 122 62 166 56" />
      </g>
      <circle className="msa ms-shoot" cx="48" cy="30" r="3" fill="#FFD23F" />
    </svg>
  ),

  jetpack: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ms-jp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1f3f" /><stop offset="1" stopColor="#1b4a73" />
        </linearGradient>
      </defs>
      <rect width="160" height="90" fill="url(#ms-jp-sky)" />
      <circle cx="20" cy="14" r="1.4" fill="#fff" opacity="0.8" /><circle cx="70" cy="8" r="1.2" fill="#fff" opacity="0.6" />
      <circle cx="148" cy="22" r="1.4" fill="#fff" opacity="0.7" /><circle cx="105" cy="14" r="1" fill="#fff" opacity="0.5" />
      <ellipse cx="130" cy="70" rx="22" ry="8" fill="#fff" opacity="0.12" />
      <ellipse cx="30" cy="82" rx="26" ry="9" fill="#fff" opacity="0.10" />
      <g className="msi ms-hover">
        <rect x="48" y="38" width="10" height="18" rx="3" fill="#8b8b9e" />
        <circle cx="68" cy="30" r="8" fill="#ffd9b3" />
        <rect x="59" y="38" width="18" height="20" rx="6" fill="#ff8a3d" />
        <rect x="61" y="57" width="6" height="12" rx="3" fill="#1a1a2e" /><rect x="69" y="57" width="6" height="12" rx="3" fill="#1a1a2e" />
        <path className="msi ms-flame" d="M50 57 l3 12 3 -12 z" fill="#FFD23F" />
      </g>
      <g className="msi ms-drift"><circle cx="120" cy="40" r="5.5" fill="#FFD23F" /><text x="120" y="43.5" textAnchor="middle" fontSize="8" fontWeight="900" fill="#a8740a" fontFamily={FONT}>c</text></g>
      <g className="msi ms-drift" style={{ animationDelay: '0.9s' }}><circle cx="145" cy="55" r="5.5" fill="#FFD23F" /><text x="145" y="58.5" textAnchor="middle" fontSize="8" fontWeight="900" fill="#a8740a" fontFamily={FONT}>c</text></g>
    </svg>
  ),

  astrokatapult: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#0a0a23" />
      <circle cx="30" cy="12" r="1.3" fill="#fff" opacity="0.8" /><circle cx="90" cy="8" r="1.1" fill="#fff" opacity="0.6" />
      <circle cx="140" cy="14" r="1.4" fill="#fff" opacity="0.7" /><circle cx="60" cy="22" r="1" fill="#fff" opacity="0.5" />
      <circle cx="18" cy="98" r="34" fill="#6b4fd8" />
      <circle cx="8" cy="78" r="5" fill="#5a3fc4" /><circle cx="30" cy="86" r="4" fill="#5a3fc4" />
      <line x1="26" y1="68" x2="38" y2="48" stroke="#a06b3a" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="20" y1="58" x2="33" y2="56" stroke="#a06b3a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="39" cy="46" r="4.5" fill="none" stroke="#a06b3a" strokeWidth="2.5" />
      <path d="M40 46 Q 86 6 130 30" fill="none" stroke="#fff" strokeWidth="1.4" strokeDasharray="3 5" opacity="0.35" />
      <circle className="msa ms-launch" cx="40" cy="45" r="4.5" fill="#cfcfe0" />
      <g>
        <ellipse cx="136" cy="64" rx="16" ry="5" fill="#3d2b6b" />
        <circle cx="136" cy="48" r="9" fill="#5fd068" />
        <circle cx="133" cy="46" r="2" fill="#1a1a2e" /><circle cx="139" cy="46" r="2" fill="#1a1a2e" />
        <line x1="136" y1="39" x2="136" y2="33" stroke="#5fd068" strokeWidth="1.6" />
        <circle cx="136" cy="32" r="2" fill="#FFD23F" />
        <rect x="130" y="53" width="12" height="9" rx="4" fill="#5fd068" />
      </g>
    </svg>
  ),

  sterrenstroom: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#060614" />
      <line className="msi ms-streak" x1="0" y1="18" x2="26" y2="18" stroke="#fff" strokeWidth="1.4" opacity="0.5" />
      <line className="msi ms-streak" style={{ animationDelay: '0.5s' }} x1="0" y1="44" x2="20" y2="44" stroke="#fff" strokeWidth="1.2" opacity="0.4" />
      <line className="msi ms-streak" style={{ animationDelay: '1.1s' }} x1="0" y1="70" x2="30" y2="70" stroke="#fff" strokeWidth="1.4" opacity="0.5" />
      <line className="msi ms-streak" style={{ animationDelay: '1.6s' }} x1="0" y1="30" x2="18" y2="30" stroke="#7ce8ff" strokeWidth="1.2" opacity="0.5" />
      <g className="msi ms-hover">
        <path className="msi ms-flame" d="M48 45 l-14 -5 v10 z" fill="#ff8a3d" style={{ transformOrigin: '48px 45px' }} />
        <path d="M48 36 L 82 40 L 90 45 L 82 50 L 48 54 Q 42 45 48 36 z" fill="#4dd7e8" />
        <circle cx="72" cy="45" r="4" fill="#0a2a44" />
        <path d="M52 36 l-6 -8 10 2 z" fill="#2ba8ba" /><path d="M52 54 l-6 8 10 -2 z" fill="#2ba8ba" />
      </g>
      <circle cx="124" cy="24" r="9" fill="#8b8b9e" /><circle cx="121" cy="22" r="2.5" fill="#6e6e80" /><circle cx="128" cy="27" r="2" fill="#6e6e80" />
      <circle cx="142" cy="66" r="6" fill="#8b8b9e" /><circle cx="140" cy="64" r="1.8" fill="#6e6e80" />
    </svg>
  ),

  brug: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ms-br-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f5fc6" /><stop offset="1" stopColor="#8fc8ef" />
        </linearGradient>
      </defs>
      <rect width="160" height="90" fill="url(#ms-br-sky)" />
      <rect y="66" width="160" height="24" fill="#2f97c4" />
      <path d="M0 40 h50 v50 h-50 z" fill="#8a6a30" />
      <path d="M0 40 h50 v9 h-50 z" fill="#3a7d41" />
      <path d="M110 40 h50 v50 h-50 z" fill="#8a6a30" />
      <path d="M110 40 h50 v9 h-50 z" fill="#3a7d41" />
      <rect x="50" y="40" width="60" height="7" fill="#c79a52" />
      <path d="M56 40 v7 M66 40 v7 M76 40 v7 M86 40 v7 M96 40 v7 M104 40 v7" stroke="#8a6a30" strokeWidth="1.4" />
      <path d="M50 40 L80 22 L110 40" fill="none" stroke="#7c5a30" strokeWidth="2.5" />
      <g className="msa ms-drive">
        <rect x="16" y="28" width="26" height="10" rx="3" fill="#e8434b" />
        <rect x="22" y="22" width="12" height="8" rx="2" fill="#e8434b" />
        <circle cx="22" cy="38" r="3.2" fill="#1a1a2e" /><circle cx="36" cy="38" r="3.2" fill="#1a1a2e" />
      </g>
    </svg>
  ),

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

  blok9: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill="#16335c" />
      <rect x="26" y="10" width="108" height="74" rx="5" fill="#f7f4ec" />
      <rect x="26" y="10" width="108" height="14" rx="5" fill="#3a6bb0" />
      <text x="33" y="21" fontSize="9" fontWeight="900" fill="#fff" fontFamily={FONT}>BLOK 9 — werkblad</text>
      <text x="34" y="40" fontSize="10" fontWeight="800" fill="#3a4a6b" fontFamily={FONT}>748 + 156 =</text>
      <text x="34" y="56" fontSize="10" fontWeight="800" fill="#3a4a6b" fontFamily={FONT}>6 × 125 =</text>
      <text x="34" y="72" fontSize="10" fontWeight="800" fill="#3a4a6b" fontFamily={FONT}>½ van 86 =</text>
      <text className="msi ms-pop" x="110" y="40" fontSize="11" fontWeight="900" fill="#06a077" fontFamily={FONT}>✓</text>
      <text className="msi ms-pop" style={{ animationDelay: '0.7s' }} x="110" y="56" fontSize="11" fontWeight="900" fill="#06a077" fontFamily={FONT}>✓</text>
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

  game: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ms-gm-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5c1240" /><stop offset="1" stopColor="#7a2a18" />
        </linearGradient>
      </defs>
      <rect width="160" height="90" fill="url(#ms-gm-bg)" />
      <text className="msi ms-bob" x="20" y="26" fontSize="13" fill="#FFD23F" opacity="0.85" fontFamily={FONT}>★</text>
      <text className="msi ms-bob" style={{ animationDelay: '0.8s' }} x="130" y="22" fontSize="11" fill="#fff" opacity="0.7" fontFamily={FONT}>★</text>
      <text className="msi ms-bob" style={{ animationDelay: '1.4s' }} x="138" y="76" fontSize="13" fill="#FFD23F" opacity="0.8" fontFamily={FONT}>★</text>
      <g className="msi ms-hover">
        <rect x="42" y="30" width="76" height="38" rx="17" fill="#2a2a44" />
        <circle cx="55" cy="49" r="13" fill="#2a2a44" /><circle cx="105" cy="49" r="13" fill="#2a2a44" />
        <rect x="50" y="44" width="14" height="5" rx="2" fill="#cfcfe0" /><rect x="54.5" y="39.5" width="5" height="14" rx="2" fill="#cfcfe0" />
        <circle cx="100" cy="44" r="3.4" fill="#5fd068" /><circle cx="109" cy="52" r="3.4" fill="#e8434b" />
        <circle cx="100" cy="52" r="3.4" fill="#4dd7e8" /><circle cx="109" cy="44" r="3.4" fill="#FFD23F" />
      </g>
    </svg>
  ),

  wardrobe: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ms-wd-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a1a6e" /><stop offset="1" stopColor="#5c1a8a" />
        </linearGradient>
      </defs>
      <rect width="160" height="90" fill="url(#ms-wd-bg)" />
      <line x1="10" y1="16" x2="150" y2="16" stroke="#c8a86a" strokeWidth="4" strokeLinecap="round" />
      <g className="msi ms-sway" style={{ transformOrigin: '50px 16px' }}>
        <path d="M50 16 v8" stroke="#aab" strokeWidth="2" />
        <path d="M38 32 l12 -8 12 8 l-4 6 -3 -2 v22 h-10 v-22 l-3 2 z" fill="#4dd7e8" />
      </g>
      <g className="msi ms-sway" style={{ transformOrigin: '95px 16px', animationDelay: '0.8s' }}>
        <path d="M95 16 v8" stroke="#aab" strokeWidth="2" />
        <path d="M87 30 h16 l6 32 h-28 z" fill="#ff8aa8" />
        <rect x="89" y="24" width="12" height="8" rx="2" fill="#ff8aa8" />
      </g>
      <g className="msi ms-sway" style={{ transformOrigin: '135px 16px', animationDelay: '1.5s' }}>
        <path d="M135 16 v8" stroke="#aab" strokeWidth="2" />
        <rect x="126" y="24" width="18" height="34" rx="5" fill="#5fd068" />
        <rect x="126" y="24" width="18" height="8" rx="3" fill="#3fa84c" />
      </g>
      <circle cx="24" cy="66" r="9" fill="#ffd9b3" />
      <rect x="14" y="75" width="20" height="15" rx="5" fill="#FFD23F" />
      <circle cx="21" cy="64" r="1.6" fill="#1a1a2e" /><circle cx="27" cy="64" r="1.6" fill="#1a1a2e" />
      <path d="M20 69 q4 3 8 0" stroke="#1a1a2e" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  ),

  shop: (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ms-sh-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a3d3d" /><stop offset="1" stopColor="#0d5c50" />
        </linearGradient>
      </defs>
      <rect width="160" height="90" fill="url(#ms-sh-bg)" />
      <rect x="30" y="34" width="100" height="56" fill="#e8dcc8" />
      <g>
        <rect x="24" y="22" width="112" height="14" fill="#e8434b" />
        <path d="M24 36 a7 7 0 0 0 14 0 z" fill="#e8434b" /><path d="M38 36 a7 7 0 0 0 14 0 z" fill="#fff" />
        <path d="M52 36 a7 7 0 0 0 14 0 z" fill="#e8434b" /><path d="M66 36 a7 7 0 0 0 14 0 z" fill="#fff" />
        <path d="M80 36 a7 7 0 0 0 14 0 z" fill="#e8434b" /><path d="M94 36 a7 7 0 0 0 14 0 z" fill="#fff" />
        <path d="M108 36 a7 7 0 0 0 14 0 z" fill="#e8434b" /><path d="M122 36 a7 7 0 0 0 14 0 z" fill="#fff" />
      </g>
      <rect x="40" y="52" width="34" height="26" rx="3" fill="#7ce8ff" stroke="#4a6b6b" strokeWidth="2.5" />
      <path d="M48 78 l8 -18 M58 78 l8 -18" stroke="#fff" strokeWidth="2" opacity="0.6" />
      <rect x="92" y="52" width="24" height="38" rx="3" fill="#6b4f2a" />
      <circle cx="111" cy="71" r="2.2" fill="#FFD23F" />
      <g className="msi ms-coinflip" style={{ transformOrigin: '136px 60px' }}>
        <circle cx="136" cy="60" r="9" fill="#FFD23F" stroke="#d4a017" strokeWidth="2" />
        <text x="136" y="64" textAnchor="middle" fontSize="11" fontWeight="900" fill="#a8740a" fontFamily={FONT}>c</text>
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
