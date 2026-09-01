// Topografie — TopoMaster Europa, kaart A en kaart B (groep 7).
//
// Kaart A is heel Europa: landen, hoofdsteden, zeeën, rivieren en gebergtes.
// Kaart B zoomt in op Noordwest-Europa en heeft er twee soorten bij: gewone
// steden (geen hoofdstad) en regio's zoals Scandinavië en Vlaanderen.
//
// De plekken op de kaart zelf staan in src/games/topoKaart.js; hier staat
// alleen wát er per kaart gevraagd wordt.

export const KAARTEN = [
  {
    key: 'europa-a',
    naam: 'Kaart A — heel Europa',
    kort: 'Kaart A',
    toolId: 'topo-europa-a',
    onderdelen: {
      landen: [
        'Nederland', 'België', 'Luxemburg', 'Verenigd Koninkrijk', 'Frankrijk',
        'Spanje', 'Italië', 'Duitsland', 'Polen', 'Zwitserland', 'Oostenrijk',
        'Noorwegen', 'Zweden', 'Rusland',
      ],
      hoofdsteden: [
        'Amsterdam', 'Brussel', 'Luxemburg', 'Londen', 'Parijs', 'Madrid', 'Rome',
        'Berlijn', 'Warschau', 'Bern', 'Wenen', 'Oslo', 'Stockholm', 'Moskou',
      ],
      wateren: ['Noordzee', 'Oostzee', 'Middellandse Zee', 'Het Kanaal', 'Straat van Gibraltar'],
      rivieren: ['Rijn', 'Donau', 'Volga', 'Seine', 'Rhône', 'Theems', 'Schelde'],
      gebergtes: ['Alpen', 'Pyreneeën', 'Kaukasus', 'Oeral'],
    },
  },
  {
    key: 'europa-b',
    naam: 'Kaart B — Noordwest-Europa',
    kort: 'Kaart B',
    toolId: 'topo-europa-b',
    onderdelen: {
      landen: [
        'IJsland', 'Noorwegen', 'Zweden', 'Finland', 'Denemarken', 'Estland',
        'Letland', 'Litouwen', 'Ierland', 'Verenigd Koninkrijk', 'Nederland', 'België',
      ],
      hoofdsteden: ['Helsinki', 'Oslo', 'Stockholm', 'Kopenhagen', 'Dublin', 'Londen', 'Brussel'],
      steden: ['Antwerpen', 'Glasgow', 'Liverpool'],
      regios: ['Scandinavië', 'Schotland', 'Engeland', 'Vlaanderen', 'Wallonië'],
      wateren: ['Noordzee', 'Oostzee', 'Het Kanaal'],
      rivieren: ['Theems', 'Schelde'],
      gebergtes: ['Ardennen'],
    },
  },
]

// Hoe elk onderdeel in de oefening heet en welke vraag erbij hoort.
export const SOORTEN = {
  landen:      { label: 'Landen',      vraag: (n) => `Waar ligt ${n}?`,       kleur: '#4FC3F7' },
  hoofdsteden: { label: 'Hoofdsteden', vraag: (n) => `Waar ligt ${n}?`,       kleur: '#ffb020' },
  steden:      { label: 'Steden',      vraag: (n) => `Waar ligt ${n}?`,       kleur: '#f472b6' },
  regios:      { label: "Regio's",     vraag: (n) => `Waar ligt ${n}?`,       kleur: '#a855f7' },
  wateren:     { label: 'Zeeën',       vraag: (n) => `Waar ligt ${n}?`,       kleur: '#38bdf8' },
  rivieren:    { label: 'Rivieren',    vraag: (n) => `Waar stroomt de ${n}?`, kleur: '#06d6a0' },
  gebergtes:   { label: 'Gebergtes',   vraag: (n) => `Waar liggen de ${n}?`,  kleur: '#c98b4b' },
}

// "Waar stroomt de Rijn?" maar "Waar ligt Het Kanaal?" — een paar namen hebben
// al een lidwoord of krijgen er geen.
export const VRAAGTEKST = {
  'Het Kanaal': 'Waar ligt Het Kanaal?',
  'Straat van Gibraltar': 'Waar ligt de Straat van Gibraltar?',
  'Middellandse Zee': 'Waar ligt de Middellandse Zee?',
  'Noordzee': 'Waar ligt de Noordzee?',
  'Oostzee': 'Waar ligt de Oostzee?',
  'Verenigd Koninkrijk': 'Waar ligt het Verenigd Koninkrijk?',
  'Oeral': 'Waar ligt de Oeral?',
  'Kaukasus': 'Waar ligt de Kaukasus?',
  'Ardennen': 'Waar liggen de Ardennen?',
}
