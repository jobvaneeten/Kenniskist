// Elk land heeft een vlag-patroon (pattern) opgebouwd uit 1-3 kleuren (c1/c2/c3),
// zo dicht mogelijk bij de echte nationale vlag. Patronen: solid, h2, h3, v2, v3,
// cross (kruisvlag), circle (cirkel/zon in het midden), circle2 (tweekleurige cirkel),
// usa (strepen + canton), quarters (4 vlakken).
export const COUNTRIES = [
  { key: 'nl', name: 'Nederland',  flag: '🇳🇱', c1: '#AE1C28', c2: '#FFFFFF', c3: '#21468B', pattern: 'h3', diff: 3, abbr: 'NL' },
  { key: 'de', name: 'Duitsland',  flag: '🇩🇪', c1: '#000000', c2: '#DD0000', c3: '#FFCE00', pattern: 'h3', diff: 3, abbr: 'DE' },
  { key: 'br', name: 'Brazilië',   flag: '🇧🇷', c1: '#009C3B', c2: '#FFCC29', pattern: 'circle', diff: 5, abbr: 'BR' },
  { key: 'ar', name: 'Argentinië', flag: '🇦🇷', c1: '#6CACE4', c2: '#FFFFFF', c3: '#6CACE4', pattern: 'h3', diff: 5, abbr: 'AR' },
  { key: 'fr', name: 'Frankrijk',  flag: '🇫🇷', c1: '#0055A4', c2: '#FFFFFF', c3: '#EF4135', pattern: 'v3', diff: 5, abbr: 'FR' },
  { key: 'en', name: 'Engeland',   flag: '🇬🇧', c1: '#FFFFFF', c2: '#CE1124', pattern: 'cross', diff: 3, abbr: 'EN' },
  { key: 'es', name: 'Spanje',     flag: '🇪🇸', c1: '#AA151B', c2: '#F1BF00', c3: '#AA151B', pattern: 'h3', diff: 4, abbr: 'ES' },
  { key: 'pt', name: 'Portugal',   flag: '🇵🇹', c1: '#006600', c2: '#FF0000', pattern: 'v2', diff: 4, abbr: 'PT' },
  { key: 'it', name: 'Italië',     flag: '🇮🇹', c1: '#009246', c2: '#FFFFFF', c3: '#CE2B37', pattern: 'v3', diff: 3, abbr: 'IT' },
  { key: 'be', name: 'België',     flag: '🇧🇪', c1: '#000000', c2: '#FAE042', c3: '#ED2939', pattern: 'v3', diff: 3, abbr: 'BE' },
  { key: 'us', name: 'USA',        flag: '🇺🇸', c1: '#B22234', c2: '#FFFFFF', c3: '#3C3B6E', pattern: 'usa', diff: 2, abbr: 'US' },
  { key: 'mx', name: 'Mexico',     flag: '🇲🇽', c1: '#006847', c2: '#FFFFFF', c3: '#CE1126', pattern: 'v3', diff: 2, abbr: 'MX' },
  { key: 'jp', name: 'Japan',      flag: '🇯🇵', c1: '#FFFFFF', c2: '#BC002D', pattern: 'circle', diff: 2, abbr: 'JP' },
  { key: 'ma', name: 'Marokko',    flag: '🇲🇦', c1: '#C1272D', c2: '#006233', pattern: 'circle', diff: 2, abbr: 'MA' },
  { key: 'sn', name: 'Senegal',    flag: '🇸🇳', c1: '#00853F', c2: '#FDEF42', c3: '#E31B23', pattern: 'v3', diff: 2, abbr: 'SN' },
  { key: 'hr', name: 'Kroatië',    flag: '🇭🇷', c1: '#FF0000', c2: '#FFFFFF', c3: '#171796', pattern: 'h3', diff: 3, abbr: 'HR' },
  { key: 'ng', name: 'Nigeria',    flag: '🇳🇬', c1: '#008751', c2: '#FFFFFF', c3: '#008751', pattern: 'v3', diff: 4, abbr: 'NG' },
  { key: 'gh', name: 'Ghana',      flag: '🇬🇭', c1: '#CE1126', c2: '#FCD116', c3: '#006B3F', pattern: 'h3', diff: 3, abbr: 'GH' },
  { key: 'eg', name: 'Egypte',     flag: '🇪🇬', c1: '#CE1126', c2: '#FFFFFF', c3: '#000000', pattern: 'h3', diff: 3, abbr: 'EG' },
  { key: 'cm', name: 'Kameroen',   flag: '🇨🇲', c1: '#007A5E', c2: '#CE1126', c3: '#FCD116', pattern: 'v3', diff: 3, abbr: 'CM' },
  { key: 'kr', name: 'Zuid-Korea', flag: '🇰🇷', c1: '#FFFFFF', c2: '#CD2E3A', c3: '#0047A0', pattern: 'circle2', diff: 2, abbr: 'KR' },
  { key: 'sa', name: 'Saoedi-Ar.', flag: '🇸🇦', c1: '#006C35', c2: '#FFFFFF', pattern: 'solid', diff: 2, abbr: 'SA' },
  { key: 'au', name: 'Australië',  flag: '🇦🇺', c1: '#00247D', c2: '#FFFFFF', pattern: 'circle', diff: 2, abbr: 'AU' },
  { key: 'ca', name: 'Canada',     flag: '🇨🇦', c1: '#FF0000', c2: '#FFFFFF', c3: '#FF0000', pattern: 'v3', diff: 2, abbr: 'CA' },
  { key: 'co', name: 'Colombia',   flag: '🇨🇴', c1: '#FCD116', c2: '#003893', c3: '#CE1126', pattern: 'h3', diff: 4, abbr: 'CO' },
  { key: 'uy', name: 'Uruguay',    flag: '🇺🇾', c1: '#FFFFFF', c2: '#0038A8', pattern: 'h2', diff: 4, abbr: 'UY' },
  { key: 'ch', name: 'Zwitserland',flag: '🇨🇭', c1: '#D52B1E', c2: '#FFFFFF', pattern: 'cross', diff: 3, abbr: 'CH' },
  { key: 'pl', name: 'Polen',      flag: '🇵🇱', c1: '#FFFFFF', c2: '#DC143C', pattern: 'h2', diff: 3, abbr: 'PL' },
  { key: 'dk', name: 'Denemarken', flag: '🇩🇰', c1: '#C60C30', c2: '#FFFFFF', pattern: 'cross', diff: 2, abbr: 'DK' },
  { key: 'se', name: 'Zweden',     flag: '🇸🇪', c1: '#006AA7', c2: '#FECC00', pattern: 'cross', diff: 3, abbr: 'SE' },
  { key: 'tr', name: 'Turkije',    flag: '🇹🇷', c1: '#E30A17', c2: '#FFFFFF', pattern: 'circle', diff: 3, abbr: 'TR' },
  { key: 'gr', name: 'Griekenland',flag: '🇬🇷', c1: '#0D5EAF', c2: '#FFFFFF', pattern: 'h2', diff: 3, abbr: 'GR' },
  { key: 'ec', name: 'Ecuador',    flag: '🇪🇨', c1: '#FFDD00', c2: '#034EA2', c3: '#ED1C24', pattern: 'h3', diff: 3, abbr: 'EC' },
  { key: 'py', name: 'Paraguay',   flag: '🇵🇾', c1: '#D52B1E', c2: '#FFFFFF', c3: '#0038A8', pattern: 'h3', diff: 2, abbr: 'PY' },
  { key: 'tn', name: 'Tunesië',    flag: '🇹🇳', c1: '#E70013', c2: '#FFFFFF', pattern: 'circle', diff: 3, abbr: 'TN' },
  { key: 'dz', name: 'Algerije',   flag: '🇩🇿', c1: '#006233', c2: '#FFFFFF', pattern: 'v2', diff: 3, abbr: 'DZ' },
  { key: 'ci', name: 'Ivoorkust',  flag: '🇨🇮', c1: '#FF8200', c2: '#FFFFFF', c3: '#009E60', pattern: 'v3', diff: 3, abbr: 'CI' },
  { key: 'cv', name: 'Kaapverdië', flag: '🇨🇻', c1: '#003893', c2: '#FFFFFF', pattern: 'circle', diff: 2, abbr: 'CV' },
  { key: 'za', name: 'Zuid-Afrika',flag: '🇿🇦', c1: '#000000', c2: '#FFB81C', c3: '#007A4D', pattern: 'h3', diff: 2, abbr: 'ZA' },
  { key: 'ir', name: 'Iran',       flag: '🇮🇷', c1: '#239F40', c2: '#FFFFFF', c3: '#DA0000', pattern: 'h3', diff: 3, abbr: 'IR' },
  { key: 'jo', name: 'Jordanië',   flag: '🇯🇴', c1: '#000000', c2: '#FFFFFF', c3: '#007A3D', pattern: 'h3', diff: 2, abbr: 'JO' },
  { key: 'uz', name: 'Oezbekistan',flag: '🇺🇿', c1: '#0099B5', c2: '#FFFFFF', c3: '#1EB53A', pattern: 'h3', diff: 2, abbr: 'UZ' },
  { key: 'qa', name: 'Qatar',      flag: '🇶🇦', c1: '#FFFFFF', c2: '#8A1538', pattern: 'v2', diff: 2, abbr: 'QA' },
  { key: 'pa', name: 'Panama',     flag: '🇵🇦', c1: '#FFFFFF', c2: '#DA121A', c3: '#072357', pattern: 'quarters', diff: 2, abbr: 'PA' },
  { key: 'cw', name: 'Curaçao',    flag: '🇨🇼', c1: '#002B7F', c2: '#FFD100', c3: '#002B7F', pattern: 'h3', diff: 2, abbr: 'CW' },
  { key: 'ht', name: 'Haïti',      flag: '🇭🇹', c1: '#00209F', c2: '#D21034', pattern: 'h2', diff: 2, abbr: 'HT' },
  { key: 'nz', name: 'Nieuw-Zeeland', flag: '🇳🇿', c1: '#00247D', c2: '#CC142B', pattern: 'circle', diff: 2, abbr: 'NZ' },
  { key: 'iq', name: 'Irak',       flag: '🇮🇶', c1: '#CE1126', c2: '#FFFFFF', c3: '#000000', pattern: 'h3', diff: 2, abbr: 'IQ' },
  { key: 'no', name: 'Noorwegen',  flag: '🇳🇴', c1: '#EF2B2D', c2: '#FFFFFF', c3: '#002868', pattern: 'cross', diff: 3, abbr: 'NO' },
  { key: 'so', name: 'Somalië',    flag: '🇸🇴', c1: '#4189DD', c2: '#FFFFFF', pattern: 'circle', diff: 3, abbr: 'SO' },
]

// ── Groep 7: klasgenoten i.p.v. landen, ontgrendeld via de code "groep7" ──
export const CLASS_COUNTRIES = [
  { key: 'dani',     name: 'Dani',         flag: '🏎️', c1: '#1a1a1a', c2: '#FFFFFF', c3: '#E2001A', pattern: 'h3', diff: 3, abbr: 'DA' },
  { key: 'bas',      name: 'Bas',          flag: '⚡',  c1: '#E2001A', c2: '#FFFFFF', c3: '#1a1a1a', pattern: 'v3', diff: 3, abbr: 'BA' },
  { key: 'liam',     name: 'Liam',         flag: '👑',  c1: '#E2001A', c2: '#1A9E4A', c3: '#1a1a1a', pattern: 'h3', diff: 3, abbr: 'LI' },
  { key: 'thamal',   name: 'Thamal',       flag: '💥',  c1: '#FF8200', c2: '#1D6FA4', c3: '#FFFFFF', pattern: 'v3', diff: 3, abbr: 'TH' },
  { key: 'floor',    name: 'Floor',        flag: '🦩',  c1: '#FF8200', c2: '#1a1a1a', c3: '#FFFFFF', pattern: 'h3', diff: 3, abbr: 'FL' },
  { key: 'abdiali',  name: 'Abdi Ali',     flag: '⭐',  c1: '#1a1a1a', c2: '#1A9E4A', pattern: 'v2', diff: 3, abbr: 'AB' },
  { key: 'ila',      name: 'Ila',          flag: '🧊',  c1: '#5BC0F8', c2: '#FFFFFF', pattern: 'h2', diff: 3, abbr: 'IL' },
  { key: 'zeno',     name: 'Zeno',         flag: '🥈',  c1: '#C0C0C0', c2: '#FF8200', c3: '#E2001A', pattern: 'h3', diff: 3, abbr: 'ZE' },
  { key: 'roel',     name: 'Roel',         flag: '🪨',  c1: '#1a1a1a', c2: '#7B2D8B', c3: '#1A9E4A', pattern: 'v3', diff: 3, abbr: 'RO' },
  // Meester Job en Meester Luuk zijn de baas-tegenstanders van het klas-toernooi
  // (halve finale/finale) — diff 6 is bewust hoger dan alle andere klasgenoten (max 5),
  // zodat hun AI perfect mikt en veel vaker een superschot gebruikt (zie HeadSoccer.jsx).
  { key: 'mjob',     name: 'Meester Job',  flag: '🎂',  c1: '#1a1a1a', c2: '#D4AF37', pattern: 'circle2', diff: 6, abbr: 'MJ' },
  { key: 'mluuk',    name: 'Meester Luuk', flag: '😂',  c1: '#1A9E4A', c2: '#1D6FA4', c3: '#1a1a1a', pattern: 'h3', diff: 6, abbr: 'ML' },
  { key: 'pim',      name: 'Pim',          flag: '🧠',  c1: '#1a1a1a', c2: '#1D6FA4', c3: '#1A9E4A', pattern: 'v3', diff: 3, abbr: 'PI' },
  { key: 'kayleigh', name: 'Kayleigh',     flag: '🎀',  c1: '#8BD17C', c2: '#FFC0DA', pattern: 'h2', diff: 3, abbr: 'KA' },
  { key: 'tara',     name: 'Tara',         flag: '🍰',  c1: '#1A5C33', c2: '#0D2F6B', pattern: 'v2', diff: 3, abbr: 'TA' },
  { key: 'bardo',    name: 'Bardo',        flag: '🤡',  c1: '#C9A3E0', c2: '#FFFFFF', c3: '#FF6FB5', pattern: 'h3', diff: 3, abbr: 'BD' },
  { key: 'vince',    name: 'Vince',        flag: '🛡️', c1: '#E2001A', c2: '#FFFFFF', c3: '#1a1a1a', pattern: 'v3', diff: 3, abbr: 'VI' },
  { key: 'hailey',   name: 'Hailey',       flag: '🌪️', c1: '#5BC0F8', c2: '#0D2F6B', c3: '#FFFFFF', pattern: 'h3', diff: 3, abbr: 'HA' },
  { key: 'lou',      name: 'Lou',          flag: '🐄',  c1: '#5BC0F8', c2: '#E2001A', c3: '#FFFFFF', pattern: 'v3', diff: 3, abbr: 'LO' },
  { key: 'bruno',    name: 'Bruno',        flag: '🌩️', c1: '#1A9E4A', c2: '#1D6FA4', c3: '#1a1a1a', pattern: 'h3', diff: 3, abbr: 'BR' },
  { key: 'nina',     name: 'Nina',         flag: '💨',  c1: '#8A8F98', c2: '#E2001A', pattern: 'h2', diff: 3, abbr: 'NI' },
  { key: 'elia',     name: 'Elia',         flag: '👼',  c1: '#8A8F98', c2: '#1D6FA4', c3: '#1a1a1a', pattern: 'v3', diff: 3, abbr: 'EL' },
  { key: 'vinn',     name: 'Vinn',         flag: '🚀',  c1: '#1D6FA4', c2: '#FF8200', c3: '#1a1a1a', pattern: 'h3', diff: 3, abbr: 'VN' },
  { key: 'suze',     name: 'Suze',         flag: '☀️',  c1: '#E2001A', c2: '#FFFFFF', c3: '#1D6FA4', pattern: 'v3', diff: 3, abbr: 'SU' },
]
export const CLASS_KEYS = CLASS_COUNTRIES.map(c => c.key)

// Bewust NIET in COUNTRIES gemengd: Groep 7 is een apart menu (zie HeadSoccer.jsx),
// geen extra vergrendelde vlaggen tussen de echte landen. getCountry kent ze wel
// allebei, zodat gameplay-code (super/move-lookup) overal blijft werken.
export const getCountry = key => COUNTRIES.find(c => c.key === key) || CLASS_COUNTRIES.find(c => c.key === key)

// Klas-toernooi (Groep 7): 2 willekeurige klasgenoten, dan ALTIJD Meester Luuk in de
// halve finale en ALTIJD Meester Job in de finale — de twee zware baas-tegenstanders.
export function generateClassBracket(playerKey) {
  const rand = arr => arr[Math.floor(Math.random() * arr.length)]
  const others = CLASS_COUNTRIES.filter(c => c.key !== playerKey).map(c => c.key)
  const early = others.filter(k => k !== 'mluuk' && k !== 'mjob')
  const o1 = rand(early)
  const o2 = rand(early.filter(k => k !== o1))
  // Ben je zelf Meester Luuk/Job, dan kan die ronde uiteraard niet tegen jezelf —
  // dan komt er een andere pittige klasgenoot (hoogste diff) voor in de plaats.
  const toughFallback = (exclude) => {
    const pool = others.filter(k => !exclude.includes(k))
    const maxDiff = Math.max(...pool.map(k => getCountry(k).diff))
    return rand(pool.filter(k => getCountry(k).diff === maxDiff))
  }
  // sluit de finale-tegenstander uit van de halve-finale-fallback (en andersom),
  // anders sta je als Meester Luuk twee keer tegen Meester Job
  const semi = playerKey === 'mluuk' ? toughFallback([o1, o2, 'mjob']) : 'mluuk'
  const final = playerKey === 'mjob' ? toughFallback([o1, o2, semi]) : 'mjob'
  return {
    playerKey, currentRound: 0, isClass: true,
    roundNames: ['Ronde 1', 'Ronde 2', 'Halve finale', 'Finale'],
    opponents: [o1, o2, semi, final],
    results: [],
  }
}

// Standaard ontgrendeld: 10 bekende landen. De overige 39 WK-landen ontgrendel je
// door toernooien te winnen (willekeurig land uit dezelfde niveau-groep).
export const DEFAULT_UNLOCKED = ['nl', 'de', 'fr', 'en', 'es', 'it', 'br', 'ar', 'us', 'mx']

// Let op: NIET filteren op DEFAULT_UNLOCKED hier — elk spel (1 tegen 1 voetbal, Head
// Soccer) heeft zijn eigen standaard-ontgrendelde set en filtert bij het
// toekennen van een beloning zelf al op zijn eigen `unlocked`-lijst. Als we
// hier ook al zouden filteren, vallen landen die in dat andere spel nog
// vergrendeld zijn buiten elke tier en zijn ze daar dus nooit te winnen.
export const UNLOCK_TIERS = {
  easy:   COUNTRIES.filter(c => c.diff <= 2).map(c => c.key),
  medium: COUNTRIES.filter(c => c.diff === 3).map(c => c.key),
  hard:   COUNTRIES.filter(c => c.diff >= 4).map(c => c.key),
}
export const LEVELS = [
  { key: 'easy',   label: 'Makkelijk', emoji: '🟢', desc: 'Trage tegenstanders die veel missen' },
  { key: 'medium', label: 'Gemiddeld', emoji: '🟡', desc: 'Een eerlijke uitdaging' },
  { key: 'hard',   label: 'Moeilijk',  emoji: '🔴', desc: 'Snelle, scherpe tegenstanders' },
]

// Generate a 4-round bracket: one random opponent per difficulty tier (2 → 3 → 4 → 5)
export function generateBracket(playerKey) {
  const rand = arr => arr[Math.floor(Math.random() * arr.length)]

  const byDiff = { 2: [], 3: [], 4: [], 5: [] }
  COUNTRIES.filter(c => c.key !== playerKey)
           .forEach(c => byDiff[c.diff]?.push(c.key))

  return {
    playerKey,
    currentRound: 0,
    roundNames: ['Ronde van 16', 'Kwartfinale', 'Halve finale', 'Finale'],
    opponents: [rand(byDiff[2]), rand(byDiff[3]), rand(byDiff[4]), rand(byDiff[5])],
    results: [],
  }
}
