// Het roster: twintig characters. Elk heeft één voelbare eigenschap en één
// nadeel dat het compenseert. Niets is strikt beter: alle levels en alle
// sterren blijven met elk character haalbaar. tools/validate-levels.js
// controleert de sprongafstanden daarom tegen het zwakste profiel, niet tegen
// Pip.
//
// Tien koop je met munten, negen speel je vrij met sterren, en Pip is gratis.
// De prijzen lopen mee met wat je onderweg verdient: na elke acht à tien levels
// is er weer een nieuwe te betalen (tools/economy.js rekent dat na tegen de
// echte muntentelling per level).
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
    prijs: 430,
    kleuren: { h: '#ffb9a3', m: '#e5674a', s: '#a3341f', o: '#3d1109', oog: '#3d1109', accent: '#ffd23f' },
    vorm: { oren: 'hoorn', staart: true, hoogte: 25 },
    eigenschap: 'Begint elk level met 4 levens in plaats van 3, maar is 8% trager.',
    mod: { loop: 0.92, ren: 0.92, levens: 1 },
  },
  {
    id: 'zippy',
    naam: 'Zippy',
    prijs: 460,
    kleuren: { h: '#c8ff8a', m: '#7ed321', s: '#4a8a0f', o: '#1c3305', oog: '#1c3305', accent: '#ff6bd6' },
    vorm: { oren: 'punt', staart: true, hoogte: 22 },
    eigenschap: 'Springt 10% hoger, maar glijdt verder uit bij het afremmen.',
    mod: { sprong: 1.1, wrijving: 0.62 },
  },
  {
    id: 'magno',
    naam: 'Magno',
    prijs: 490,
    kleuren: { h: '#a8d8ff', m: '#4a90d9', s: '#245a8f', o: '#0c2340', oog: '#0c2340', accent: '#ff4d4d' },
    vorm: { oren: 'plaat', staart: false, hoogte: 24 },
    eigenschap: 'Trekt munten van dichtbij naar zich toe, maar springt iets lager.',
    mod: { sprong: 0.95, magneet: 34 },
  },
  {
    id: 'pluis',
    naam: 'Pluis',
    prijs: 520,
    kleuren: { h: '#ffe3f2', m: '#ff8ec4', s: '#c94d8c', o: '#4a1030', oog: '#4a1030', accent: '#fff3a8' },
    vorm: { oren: 'pluim', staart: true, hoogte: 23 },
    eigenschap: 'Veren en geisers schieten je een kwart hoger, maar stampen stuitert minder.',
    mod: { veerKracht: 1.25, stampBounce: 0.85 },
  },
  {
    id: 'frost',
    naam: 'Frost',
    prijs: 550,
    kleuren: { h: '#ffffff', m: '#bfe6ff', s: '#6b93c4', o: '#22405e', oog: '#22405e', accent: '#3ef0ff' },
    vorm: { oren: 'kristal', staart: false, hoogte: 24 },
    eigenschap: 'Glijdt niet uit op ijs, maar komt langzamer op gang.',
    mod: { acceleratie: 0.82, ijsGrip: 1 },
  },
  {
    id: 'bram',
    naam: 'Bram',
    prijs: 580,
    kleuren: { h: '#d8e4f0', m: '#8a9bb5', s: '#4d5c75', o: '#161e2e', oog: '#161e2e', accent: '#3ef0ff' },
    vorm: { oren: 'helm', staart: false, hoogte: 25 },
    eigenschap: 'Begint elk leven met een schild — één klap gratis. Wel 10% trager.',
    mod: { startSchild: 1, loop: 0.9, ren: 0.9 },
  },
  {
    id: 'ember',
    naam: 'Ember',
    prijs: 620,
    kleuren: { h: '#ffd08a', m: '#ff7a2a', s: '#c23a00', o: '#3d1400', oog: '#3d1400', accent: '#ffe14d' },
    vorm: { oren: 'vlam', staart: true, hoogte: 24 },
    eigenschap: 'Lavaspetters doen niets — lava zelf wel. Valt wat zwaarder.',
    mod: { valZwaartekracht: 1.12, immuunSpetters: 1 },
  },
  {
    id: 'echo',
    naam: 'Echo',
    prijs: 660,
    kleuren: { h: '#d6c8ff', m: '#8f6bff', s: '#5232b3', o: '#1d1040', oog: '#1d1040', accent: '#3ef0ff' },
    vorm: { oren: 'lang', staart: false, hoogte: 24 },
    eigenschap: 'Blijft na een klap veel langer onkwetsbaar, maar is 5% trager.',
    mod: { loop: 0.95, ren: 0.95, onkwetsbaar: 1.8 },
  },
  {
    id: 'astra',
    naam: 'Astra',
    sterren: 25,
    prijs: 0,
    kleuren: { h: '#ffe9a8', m: '#ffc857', s: '#c98a12', o: '#3d2a00', oog: '#3d2a00', accent: '#ffffff' },
    vorm: { oren: 'ster', staart: false, hoogte: 24 },
    eigenschap: 'Stampen op een vijand geeft een extra hoge stuiter.',
    mod: { stampBounce: 1.35 },
  },
  {
    id: 'klim',
    naam: 'Klim',
    sterren: 50,
    prijs: 0,
    kleuren: { h: '#cfe8c4', m: '#7fb069', s: '#4a7340', o: '#152a12', oog: '#152a12', accent: '#ffb02e' },
    vorm: { oren: 'klem', staart: false, hoogte: 24 },
    eigenschap: 'Lopende banden en wind duwen je niet weg, maar je springt 5% lager.',
    mod: { bandGrip: 1, windGrip: 1, sprong: 0.95 },
  },
  {
    id: 'nebula',
    naam: 'Nebula',
    sterren: 75,
    prijs: 0,
    kleuren: { h: '#ffb3f0', m: '#c74dd6', s: '#7a1f96', o: '#2c0838', oog: '#2c0838', accent: '#3ef0ff' },
    vorm: { oren: 'nevel', staart: true, hoogte: 24 },
    eigenschap: 'Kan één keer per sprong kort bijsturen in de lucht.',
    mod: { luchtsprong: 1 },
  },
  {
    id: 'spike',
    naam: 'Spike',
    sterren: 105,
    prijs: 0,
    kleuren: { h: '#ffd9b0', m: '#e09a4a', s: '#a35f1c', o: '#3a1d05', oog: '#3a1d05', accent: '#ff4d4d' },
    vorm: { oren: 'stekels', staart: true, hoogte: 24 },
    eigenschap: 'Stekels doen je niets — lava en vijanden nog wel. Springt 6% lager.',
    mod: { immuunStekels: 1, sprong: 0.94 },
  },
  {
    id: 'vonk',
    naam: 'Vonk',
    sterren: 135,
    prijs: 0,
    kleuren: { h: '#fff5b8', m: '#ffe14d', s: '#c9a800', o: '#3d3000', oog: '#3d3000', accent: '#3ef0ff' },
    vorm: { oren: 'vleugel', staart: false, hoogte: 23 },
    eigenschap: 'Een volle tweede sprong in de lucht, maar je valt een stuk zwaarder.',
    mod: { luchtsprong: 1, luchtsprongKracht: 1, valZwaartekracht: 1.15 },
  },
  {
    id: 'lumen',
    naam: 'Lumen',
    sterren: 165,
    prijs: 0,
    kleuren: { h: '#e0fbff', m: '#7fe3f0', s: '#3a9aad', o: '#0d3742', oog: '#0d3742', accent: '#ffffff' },
    vorm: { oren: 'lamp', staart: false, hoogte: 24 },
    eigenschap: 'Ziet in donkere levels twee keer zo ver, maar is 5% trager.',
    mod: { zicht: 2, loop: 0.95, ren: 0.95 },
  },
  {
    id: 'donder',
    naam: 'Donder',
    sterren: 190,
    prijs: 0,
    kleuren: { h: '#cdd3ff', m: '#6f7ae0', s: '#3b3f9c', o: '#12143d', oog: '#12143d', accent: '#ffe14d' },
    vorm: { oren: 'bliksem', staart: true, hoogte: 25 },
    eigenschap: 'Een stamp maakt een schokgolf die vijanden ernaast ook velt. Stuitert lager.',
    mod: { stampGolf: 44, stampBounce: 0.9 },
  },
  {
    id: 'kwik',
    naam: 'Kwik',
    sterren: 210,
    prijs: 0,
    kleuren: { h: '#f0f4f8', m: '#b8c4d0', s: '#78889c', o: '#25303f', oog: '#25303f', accent: '#ff6bd6' },
    vorm: { oren: 'vin', staart: true, hoogte: 23 },
    eigenschap: 'Hoe langer je rent, hoe sneller je wordt — tot 20%. Remmen duurt wel langer.',
    mod: { momentum: 1.2, wrijving: 0.7 },
  },
  {
    id: 'solaris',
    naam: 'Solaris',
    sterren: 225,
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
    valZwaartekracht: 1, maxVal: 1, stampBounce: 1, onkwetsbaar: 1, veerKracht: 1,
    levens: 0, magneet: 0, ijsGrip: 0, immuunSpetters: 0, luchtsprong: 0, spoor: 0,
    // Eigenschappen van de nieuwe characters. 0 = uit.
    startSchild: 0,        // begint elk leven met een schild
    bandGrip: 0,           // lopende banden duwen niet
    windGrip: 0,           // wind duwt niet
    immuunStekels: 0,      // stekels doen geen schade
    luchtsprongKracht: 0,  // de luchtsprong is even sterk als een gewone
    zicht: 1,              // schaal van de lichtcirkel in donkere levels
    stampGolf: 0,          // bereik in pixels van de schokgolf bij een stamp
    momentum: 1,           // topsnelheid na een paar seconden onafgebroken rennen
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
