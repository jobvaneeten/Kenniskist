// Gedeelde hulpjes voor de toetsvormen (toetsvormen6.js, toetsvormen8.js):
// namen, toeval en het netjes schrijven van getallen, geld en breuken.

export const NAMEN = ['Sem', 'Noor', 'Liam', 'Saar', 'Daan', 'Mila', 'Finn', 'Lina', 'Bram', 'Tess', 'Luuk', 'Evi', 'Jesse', 'Fleur', 'Yara', 'Mees', 'Roos', 'Ayoub', 'Zara', 'Timo']
export const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
export const pick = (a) => a[Math.floor(Math.random() * a.length)]
export const naam = () => pick(NAMEN)
export const schud = (a) => [...a].sort(() => Math.random() - 0.5)

const NF = new Intl.NumberFormat('nl-NL')
export const getal = (n) => NF.format(n)
// Kommagetal zonder zwevende-kommaruis; d = vast aantal decimalen.
export const komma = (n, d) => (d == null ? String(+n.toFixed(6)) : n.toFixed(d)).replace('.', ',')
export const euro = (n) => '€ ' + n.toFixed(2).replace('.', ',')
export const euroRond = (n) => (Number.isInteger(n) ? `€ ${getal(n)},-` : euro(n))
export const rond2 = (n) => Math.round(n * 100) / 100

export const ggd = (a, b) => (b ? ggd(b, a % b) : a)
// Breuk zo klein mogelijk, als tekst ("3/4"); een hele wordt een getal.
export const breuk = (t, n) => { const g = ggd(t, n); return n / g === 1 ? t / g : `${t / g}/${n / g}` }
// Voor in de uitleg: 9/4 → "2 1/4".
export const gemengd = (t, n) => { const g = ggd(t, n), a = t / g, b = n / g; return b === 1 ? String(a) : a < b ? `${a}/${b}` : `${Math.floor(a / b)}${a % b ? ` ${a % b}/${b}` : ''}` }

// Keuzevraag: het goede antwoord plus afleiders, zonder dubbelen, door elkaar.
export const keuze = (goed, fout) => schud([String(goed), ...[...new Set(fout.map(String))].filter(f => f !== String(goed)).slice(0, 3)])
