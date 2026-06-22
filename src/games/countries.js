export const COUNTRIES = [
  { key: 'nl', name: 'Nederland',  flag: '🇳🇱', c1: '#FF6900', c2: '#FFFFFF', pattern: 'solid',    diff: 3, abbr: 'NL' },
  { key: 'de', name: 'Duitsland',  flag: '🇩🇪', c1: '#FFFFFF', c2: '#1a1a1a', pattern: 'vstripes', diff: 3, abbr: 'DE' },
  { key: 'br', name: 'Brazilië',   flag: '🇧🇷', c1: '#FFDF00', c2: '#009C3B', pattern: 'solid',    diff: 5, abbr: 'BR' },
  { key: 'ar', name: 'Argentinië', flag: '🇦🇷', c1: '#74ACDF', c2: '#FFFFFF', pattern: 'vstripes', diff: 5, abbr: 'AR' },
  { key: 'fr', name: 'Frankrijk',  flag: '🇫🇷', c1: '#002395', c2: '#FFFFFF', pattern: 'solid',    diff: 5, abbr: 'FR' },
  { key: 'en', name: 'Engeland',   flag: '🇬🇧', c1: '#FFFFFF', c2: '#CF091B', pattern: 'cross',    diff: 3, abbr: 'EN' },
  { key: 'es', name: 'Spanje',     flag: '🇪🇸', c1: '#AA151B', c2: '#F1BF00', pattern: 'solid',    diff: 4, abbr: 'ES' },
  { key: 'pt', name: 'Portugal',   flag: '🇵🇹', c1: '#006600', c2: '#FF0000', pattern: 'hstripes', diff: 4, abbr: 'PT' },
  { key: 'it', name: 'Italië',     flag: '🇮🇹', c1: '#0066CC', c2: '#FFFFFF', pattern: 'solid',    diff: 3, abbr: 'IT' },
  { key: 'be', name: 'België',     flag: '🇧🇪', c1: '#EF3340', c2: '#1a1a1a', pattern: 'vstripes', diff: 3, abbr: 'BE' },
  { key: 'us', name: 'USA',        flag: '🇺🇸', c1: '#FFFFFF', c2: '#B22234', pattern: 'hstripes', diff: 2, abbr: 'US' },
  { key: 'mx', name: 'Mexico',     flag: '🇲🇽', c1: '#006847', c2: '#FFFFFF', pattern: 'solid',    diff: 2, abbr: 'MX' },
  { key: 'jp', name: 'Japan',      flag: '🇯🇵', c1: '#003087', c2: '#FFFFFF', pattern: 'solid',    diff: 2, abbr: 'JP' },
  { key: 'ma', name: 'Marokko',    flag: '🇲🇦', c1: '#C1272D', c2: '#006233', pattern: 'solid',    diff: 2, abbr: 'MA' },
  { key: 'sn', name: 'Senegal',    flag: '🇸🇳', c1: '#FFFFFF', c2: '#00853F', pattern: 'vstripes', diff: 2, abbr: 'SN' },
  { key: 'hr', name: 'Kroatië',    flag: '🇭🇷', c1: '#FFFFFF', c2: '#FF0000', pattern: 'checker',  diff: 3, abbr: 'HR' },
  { key: 'ng', name: 'Nigeria',    flag: '🇳🇬', c1: '#008751', c2: '#FFFFFF', pattern: 'vstripes', diff: 4, abbr: 'NG' },
  { key: 'gh', name: 'Ghana',      flag: '🇬🇭', c1: '#006B3F', c2: '#FCD116', pattern: 'hstripes', diff: 3, abbr: 'GH' },
  { key: 'eg', name: 'Egypte',     flag: '🇪🇬', c1: '#CE1126', c2: '#FFFFFF', pattern: 'hstripes', diff: 3, abbr: 'EG' },
  { key: 'cm', name: 'Kameroen',   flag: '🇨🇲', c1: '#007A5E', c2: '#CE1126', pattern: 'vstripes', diff: 3, abbr: 'CM' },
  { key: 'kr', name: 'Zuid-Korea', flag: '🇰🇷', c1: '#FFFFFF', c2: '#003478', pattern: 'solid',    diff: 2, abbr: 'KR' },
  { key: 'sa', name: 'Saoedi-Ar.', flag: '🇸🇦', c1: '#006C35', c2: '#FFFFFF', pattern: 'solid',    diff: 2, abbr: 'SA' },
  { key: 'au', name: 'Australië',  flag: '🇦🇺', c1: '#00843D', c2: '#FFCD00', pattern: 'solid',    diff: 2, abbr: 'AU' },
  { key: 'ca', name: 'Canada',     flag: '🇨🇦', c1: '#FF0000', c2: '#FFFFFF', pattern: 'vstripes', diff: 2, abbr: 'CA' },
  { key: 'co', name: 'Colombia',   flag: '🇨🇴', c1: '#FCD116', c2: '#003893', pattern: 'hstripes', diff: 4, abbr: 'CO' },
  { key: 'uy', name: 'Uruguay',    flag: '🇺🇾', c1: '#0038A8', c2: '#FFFFFF', pattern: 'hstripes', diff: 4, abbr: 'UY' },
  { key: 'ch', name: 'Zwitserland',flag: '🇨🇭', c1: '#D52B1E', c2: '#FFFFFF', pattern: 'cross',    diff: 3, abbr: 'CH' },
  { key: 'pl', name: 'Polen',      flag: '🇵🇱', c1: '#FFFFFF', c2: '#DC143C', pattern: 'hstripes', diff: 3, abbr: 'PL' },
  { key: 'dk', name: 'Denemarken', flag: '🇩🇰', c1: '#C60C30', c2: '#FFFFFF', pattern: 'cross',    diff: 2, abbr: 'DK' },
  { key: 'se', name: 'Zweden',     flag: '🇸🇪', c1: '#006AA7', c2: '#FECC00', pattern: 'cross',    diff: 3, abbr: 'SE' },
  { key: 'tr', name: 'Turkije',    flag: '🇹🇷', c1: '#E30A17', c2: '#FFFFFF', pattern: 'solid',    diff: 3, abbr: 'TR' },
  { key: 'gr', name: 'Griekenland',flag: '🇬🇷', c1: '#0D5EAF', c2: '#FFFFFF', pattern: 'hstripes', diff: 3, abbr: 'GR' },
]

export const getCountry = key => COUNTRIES.find(c => c.key === key)

// Welke (vergrendelde) landen je per toernooi-niveau kunt winnen.
// Standaard al ontgrendeld: nl, de, br, fr. Easy = zwakkere landen, hard = sterkste.
export const UNLOCK_TIERS = {
  easy:   ['us', 'mx', 'jp', 'sn', 'kr', 'sa', 'au', 'ca', 'dk'],
  medium: ['ma', 'hr', 'be', 'it', 'gh', 'eg', 'cm', 'ch', 'pl', 'se', 'tr', 'gr'],
  hard:   ['en', 'es', 'pt', 'ar', 'ng', 'co', 'uy'],
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
