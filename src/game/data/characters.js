// Het roster. Elk character heeft één voelbare eigenschap en één nadeel dat
// het compenseert. Niets is strikt beter: alle levels en alle sterren blijven
// met elk character haalbaar. tools/validate-levels.js controleert de
// sprongafstanden daarom tegen het zwakste profiel, niet tegen Pip.
//
// `mod` vermenigvuldigt de basiswaarden uit engine/physics.js. Waarden die
// ontbreken zijn 1.

export const CHARACTERS = [
  {
    id: 'pip',
    naam: 'Pip',
    prijs: 0,
    kleuren: { h: '#9ef7d0', m: '#3fd39a', s: '#1f8f6c', o: '#0c3b2e', oog: '#0c3b2e', accent: '#ffd23f' },
    vorm: { oren: 'antenne', staart: false, hoogte: 24 },
    eigenschap: 'Gebalanceerd — precies zoals het spel bedoeld is.',
    mod: {},
  },
  {
    id: 'bolt',
    naam: 'Bolt',
    prijs: 320,
    kleuren: { h: '#ffe38a', m: '#ffb02e', s: '#c26a00', o: '#3a2100', oog: '#3a2100', accent: '#3ef0ff' },
    vorm: { oren: 'plaat', staart: false, hoogte: 23 },
    eigenschap: 'Rent 12% sneller, maar springt iets minder hoog.',
    mod: { loop: 1.12, ren: 1.12, sprong: 0.94 },
  },
  {
    id: 'luna',
    naam: 'Luna',
    prijs: 390,
    kleuren: { h: '#e8ddff', m: '#b39cf0', s: '#7a5cc4', o: '#2c1f52', oog: '#2c1f52', accent: '#ffffff' },
    vorm: { oren: 'lang', staart: false, hoogte: 24 },
    eigenschap: 'Valt 15% langzamer — bijna zweven — maar haalt een lagere topsnelheid.',
    mod: { valZwaartekracht: 0.85, maxVal: 0.85, loop: 0.93, ren: 0.93 },
  },
  {
    id: 'rex',
    naam: 'Rex',
    prijs: 460,
    kleuren: { h: '#ffb9a3', m: '#e5674a', s: '#a3341f', o: '#3d1109', oog: '#3d1109', accent: '#ffd23f' },
    vorm: { oren: 'hoorn', staart: true, hoogte: 25 },
    eigenschap: 'Begint elk level met 4 levens in plaats van 3, maar is 8% trager.',
    mod: { loop: 0.92, ren: 0.92, levens: 1 },
  },
  {
    id: 'zippy',
    naam: 'Zippy',
    prijs: 530,
    kleuren: { h: '#c8ff8a', m: '#7ed321', s: '#4a8a0f', o: '#1c3305', oog: '#1c3305', accent: '#ff6bd6' },
    vorm: { oren: 'punt', staart: true, hoogte: 22 },
    eigenschap: 'Springt 10% hoger, maar glijdt verder uit bij het afremmen.',
    mod: { sprong: 1.1, wrijving: 0.62 },
  },
  {
    id: 'magno',
    naam: 'Magno',
    prijs: 610,
    kleuren: { h: '#a8d8ff', m: '#4a90d9', s: '#245a8f', o: '#0c2340', oog: '#0c2340', accent: '#ff4d4d' },
    vorm: { oren: 'plaat', staart: false, hoogte: 24 },
    eigenschap: 'Trekt munten van dichtbij naar zich toe, maar springt iets lager.',
    mod: { sprong: 0.95, magneet: 34 },
  },
  {
    id: 'frost',
    naam: 'Frost',
    prijs: 700,
    kleuren: { h: '#ffffff', m: '#bfe6ff', s: '#6b93c4', o: '#22405e', oog: '#22405e', accent: '#3ef0ff' },
    vorm: { oren: 'kristal', staart: false, hoogte: 24 },
    eigenschap: 'Glijdt niet uit op ijs, maar komt langzamer op gang.',
    mod: { acceleratie: 0.82, ijsGrip: 1 },
  },
  {
    id: 'ember',
    naam: 'Ember',
    prijs: 800,
    kleuren: { h: '#ffd08a', m: '#ff7a2a', s: '#c23a00', o: '#3d1400', oog: '#3d1400', accent: '#ffe14d' },
    vorm: { oren: 'vlam', staart: true, hoogte: 24 },
    eigenschap: 'Lavaspetters doen niets — lava zelf wel. Valt wat zwaarder.',
    mod: { valZwaartekracht: 1.12, immuunSpetters: 1 },
  },
  {
    id: 'echo',
    naam: 'Echo',
    prijs: 850,
    kleuren: { h: '#d6c8ff', m: '#8f6bff', s: '#5232b3', o: '#1d1040', oog: '#1d1040', accent: '#3ef0ff' },
    vorm: { oren: 'lang', staart: false, hoogte: 24 },
    eigenschap: 'Blijft na een klap veel langer onkwetsbaar, maar is 5% trager.',
    mod: { loop: 0.95, ren: 0.95, onkwetsbaar: 1.8 },
  },
  {
    id: 'astra',
    naam: 'Astra',
    sterren: 60,
    prijs: 0,
    kleuren: { h: '#ffe9a8', m: '#ffc857', s: '#c98a12', o: '#3d2a00', oog: '#3d2a00', accent: '#ffffff' },
    vorm: { oren: 'ster', staart: false, hoogte: 24 },
    eigenschap: 'Stampen op een vijand geeft een extra hoge stuiter.',
    mod: { stampBounce: 1.35 },
  },
  {
    id: 'nebula',
    naam: 'Nebula',
    sterren: 140,
    prijs: 0,
    kleuren: { h: '#ffb3f0', m: '#c74dd6', s: '#7a1f96', o: '#2c0838', oog: '#2c0838', accent: '#3ef0ff' },
    vorm: { oren: 'nevel', staart: true, hoogte: 24 },
    eigenschap: 'Kan één keer per sprong kort bijsturen in de lucht.',
    mod: { luchtsprong: 1 },
  },
  {
    id: 'solaris',
    naam: 'Solaris',
    sterren: 220,
    prijs: 0,
    kleuren: { h: '#fffbe0', m: '#ffd23f', s: '#d99a00', o: '#4a3200', oog: '#4a3200', accent: '#ffffff' },
    vorm: { oren: 'kroon', staart: false, hoogte: 24 },
    eigenschap: 'Puur prestige: goud, met een spoor van sterrenstof.',
    mod: { spoor: 1 },
  },
]

export const CHARACTER_OP_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]))
export const START_CHARACTER = 'pip'

export const teKoop = () => CHARACTERS.filter((c) => c.prijs > 0)
export const sterrenCharacters = () => CHARACTERS.filter((c) => c.sterren)

export function characterOf(id) {
  return CHARACTER_OP_ID[id] ?? CHARACTER_OP_ID[START_CHARACTER]
}

// Eén plek waar de modifier-defaults staan, zodat physics en de winkel niet uit
// elkaar kunnen lopen.
export function modVan(id) {
  const c = characterOf(id)
  return {
    loop: 1, ren: 1, sprong: 1, acceleratie: 1, wrijving: 1,
    valZwaartekracht: 1, maxVal: 1, stampBounce: 1, onkwetsbaar: 1,
    levens: 0, magneet: 0, ijsGrip: 0, immuunSpetters: 0, luchtsprong: 0, spoor: 0,
    ...c.mod,
  }
}

// Het zwakste profiel voor de bereikbaarheidscheck: laagste sprong én laagste
// snelheid die enig character heeft. Geen bestaand character is zo slecht, dus
// wie hier doorheen komt komt overal doorheen.
export function zwaksteProfiel() {
  let sprong = 1
  let loop = 1
  for (const c of CHARACTERS) {
    sprong = Math.min(sprong, c.mod.sprong ?? 1)
    loop = Math.min(loop, c.mod.ren ?? c.mod.loop ?? 1)
  }
  return { sprong, loop }
}
