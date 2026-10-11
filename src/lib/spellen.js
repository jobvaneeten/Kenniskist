// Alle spellen die je vrij kunt spelen (spelmenu) — ook de bron voor de
// voorpagina, zodat die nooit een spel mist of een oud spel noemt.
// img: eigen plaatje; anders /scenes/games/<key>.png.
export const VRIJE_SPELLEN = [
  { key: 'football',      name: '1 tegen 1 voetbal', desc: 'Scoor tegen de computer of een vriend' },
  { key: 'headsoccer',    name: 'Supervoetbal',     desc: '1-tegen-1 met landen & special moves' },
  { key: 'towerdefense',  name: 'Tower Defense',   desc: 'Bouw neon-torens en knal alle ballonnen. 5 levels van 15 golven!', img: '/scenes/games/towerdefense.svg' },
  { key: 'jetpack',       name: 'Jetpack',          desc: 'Vlieg zo ver mogelijk!' },
  { key: 'astrokatapult', name: 'Astro Katapult',   desc: 'Lanceer & versla de aliens in 50 levels!' },
  { key: 'sterrenstroom', name: 'Spacerunner',     desc: 'Ontwijk de asteroïden in de ruimte!' },
  { key: 'doodlesprong',  name: 'Doodle Sprong',   desc: 'Spring zo hoog mogelijk en shop nieuwe personages!' },
  { key: 'meteoorvlucht', name: 'Meteoorvlucht',   desc: 'Ren weg voor de meteoor en spaar voor 49 poppetjes!', img: '/scenes/games/meteoorvlucht.svg' },
  { key: 'evolutie',      name: 'Dier Evolutie',   desc: 'Voeg dieren samen en ontdek 24 evoluties per soort!' },
  { key: 'brug',          name: 'Brug Bouwen',     desc: 'Bouw bruggen in 50 levels met weg, hout, metaal en touw!' },
  { key: 'hillclimb',     name: 'Bergrijden',      desc: 'Race over heuvels, verzamel munten en upgrade je auto!' },
  { key: 'fruitsabel',    name: 'Fruitsabel',      desc: 'Snijd 60 seconden fruit doormidden en koop scherpere sabels!', img: '/scenes/games/fruitsabel.svg' },
  { key: 'sterrenveer',   name: 'Sterrenveer',     desc: 'Ruimte-platformer: 16 levels, sterren verdienen en 12 personages kopen!', img: '/scenes/games/sterrenveer.svg' },
  { key: 'graven',        name: 'Diepgravers',     desc: '8 aardlagen diep en 40 upgrades. Maar doodgaan kost al je duiken!', img: '/scenes/games/graven.svg' },
  { key: 'neongolf',      name: 'Neongolf',        desc: 'Minigolf in 48 holes met portalen, magneten en lasers!', img: '/scenes/games/neongolf.svg' },
  { key: 'blokkenblitz',  name: 'Blokkenblitz',    desc: "Leg blokken, speel rijen weg en bouw combo's!", img: '/scenes/games/blokkenblitz.svg' },
  { key: 'neonhockey',    name: 'Neonhockey',      desc: "Airhockey van 1 minuut: versla 8 tegenstanders of speel met z'n tweeën!", img: '/scenes/games/neonhockey.svg' },
  { key: 'pijlenregen',   name: 'Pijlenregen',     desc: 'Schiet pijlen in draaiende schijven. 40 levels met bazen!', img: '/scenes/games/pijlenregen.svg' },
  { key: 'stapeltoren',   name: 'Stapeltoren',     desc: 'Bouw in 1 minuut de hoogste toren. Tik precies op tijd!', img: '/scenes/games/stapeltoren.svg' },
  { key: 'steenknaller',  name: 'Steenknaller',    desc: 'Kaats de bal en knal alle stenen weg in 30 levels!', img: '/scenes/games/steenknaller.svg' },
]

// De drie 3D-spellen start je vanuit de Kledingkast, met je eigen poppetje.
export const KLEDINGKAST_SPELLEN = [
  { key: 'voetbal3d', name: '3D-Voetbal', desc: 'Voetballen met je eigen aangeklede poppetje' },
  { key: 'paintball', name: 'Paintball', desc: 'Verf je tegenstanders af in een 3D-arena' },
  { key: 'ballonnen', name: 'Ballonnengevecht', desc: 'Elke kart heeft 3 ballonnen. Wie houdt ze het langst heel?' },
]

export function spelPlaatje(spel) {
  return spel.img || `/scenes/games/${spel.key}.png`
}

// Klein WebP-plaatje voor de voorpagina (gemaakt door tools/spelMiniaturen.js)
export function spelMiniatuur(spel) {
  return `/scenes/games/klein/${spel.key}.webp`
}
