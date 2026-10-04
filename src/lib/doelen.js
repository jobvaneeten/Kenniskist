// Doelen die een leerkracht met één klik klaarzet bij "Speciaal voor mij".
// Een doel is gewoon een opdracht (tool_id + config) met een leesbare titel:
// klikt de leerling erop, dan start de oefening meteen met precies dat
// onderdeel (de tools slaan hun kiesschermen over zodra er een config is).
//
// Verhaaltjessommen staan hier niet in: die doelen hangen af van groep en
// route en komen rechtstreeks uit redactiesommen.js (zie DoelKiezer.jsx).
//
// Puur data, net als tools.js — het portaal importeert dit zonder games.

import { TOOL_BY_ID } from './tools.js'

const d = (titel, toolId, config = {}) => ({ titel, toolId, config })

// Zinsdelen bouwen op elkaar voort: wie het lijdend voorwerp oefent, zoekt
// eerst persoonsvorm, onderwerp en gezegde — zo ontleden ze het ook in de klas.
const ZD = ['persoonsvorm', 'onderwerp', 'gezegde', 'lijdend voorwerp', 'meewerkend voorwerp', 'bepaling']
const zinsdelenTot = (n) => ({ zinsdelen: ZD.slice(0, n) })

const SPELLING_CATS = TOOL_BY_ID['dictee-categorie'].configVelden[0].opties

export const DOEL_VAKKEN = [
  {
    vak: 'taal', onderwerpen: [
      { titel: 'Interpunctie', doelen: [
        d('Komma’s zetten', 'taal-interpunctie', { onderdelen: ['komma'] }),
        d('Aanhalingstekens', 'taal-interpunctie', { onderdelen: ['aanhalingstekens'] }),
        d('Afbreekstreepje (woord afbreken aan het eind van de regel)', 'taal-interpunctie', { onderdelen: ['afbreekstreepje'] }),
        d('Hoofdletters', 'taal-interpunctie', { onderdelen: ['hoofdletters'] }),
        d('Punten', 'taal-interpunctie', { onderdelen: ['punten'] }),
      ] },
      { titel: 'Zinsdelen', doelen: [
        d('Persoonsvorm en onderwerp', 'taal-zinsdelen', zinsdelenTot(2)),
        d('Het gezegde', 'taal-zinsdelen', zinsdelenTot(3)),
        d('Het lijdend voorwerp', 'taal-zinsdelen', zinsdelenTot(4)),
        d('Het meewerkend voorwerp', 'taal-zinsdelen', zinsdelenTot(5)),
        d('Bepalingen', 'taal-zinsdelen', zinsdelenTot(6)),
      ] },
      { titel: 'Woordsoorten', doelen: [
        d('Zelfstandig naamwoord, werkwoord en lidwoord', 'taal-woordsoorten', { soorten: ['zelfstandig naamwoord', 'werkwoord', 'lidwoord'] }),
        d('Bijvoeglijk naamwoord en bijwoord', 'taal-woordsoorten', { soorten: ['bijvoeglijk naamwoord', 'bijwoord'] }),
        d('Voornaamwoorden', 'taal-woordsoorten', { soorten: ['voornaamwoord', 'zelfstandig naamwoord', 'lidwoord'] }),
        d('Telwoorden', 'taal-woordsoorten', { soorten: ['telwoord', 'lidwoord', 'bijvoeglijk naamwoord'] }),
        d('Voorzetsel en voegwoord', 'taal-woordsoorten', { soorten: ['voorzetsel', 'voegwoord'] }),
        d('Alle woordsoorten', 'taal-woordsoorten', { soorten: TOOL_BY_ID['taal-woordsoorten'].configVelden[0].opties }),
      ] },
      { titel: 'Gebiedende wijs', doelen: [
        d('De gebiedende wijs herkennen', 'taal-gebiedende-wijs'),
      ] },
      { titel: 'Woordenschat', doelen: Array.from({ length: 8 }, (_, i) =>
        d(`Woordenschat blok ${i + 1}`, `woordenschat-blok${i + 1}`)) },
    ],
  },
  {
    vak: 'spelling', onderwerpen: [
      { titel: 'Werkwoordspelling', doelen: [
        d('Tegenwoordige tijd', 'werkwoordspelling', { categorieen: ['tt'] }),
        d('Verleden tijd — zwakke werkwoorden', 'werkwoordspelling', { categorieen: ['vtZwak'] }),
        d('Verleden tijd — sterke werkwoorden', 'werkwoordspelling', { categorieen: ['vtSterk'] }),
        d('Voltooid deelwoord', 'werkwoordspelling', { categorieen: ['vd'] }),
        d('Alle werkwoordsvormen door elkaar', 'werkwoordspelling', { categorieen: ['tt', 'vtZwak', 'vtSterk', 'vd'] }),
      ] },
      { titel: 'Spellingcategorieën', doelen: SPELLING_CATS.map(c => d(c.label, 'dictee-categorie', { cats: [c.value] })) },
      { titel: 'Dictee per blok', doelen: Array.from({ length: 8 }, (_, i) => d(`Dictee blok ${i + 1}`, `dictee-thema${i + 1}`)) },
    ],
  },
  {
    vak: 'rekenen', onderwerpen: [
      { titel: 'Tafels', doelen: [
        ...['2', '3', '4', '5', '6', '7', '8', '9', '10'].map(t => d(`Tafel van ${t}`, 'tafels', { soort: 'keer', tafels: [t] })),
        ...['2', '3', '4', '5', '6', '7', '8', '9', '10'].map(t => d(`Deeltafel van ${t}`, 'tafels', { soort: 'deel', tafels: [t] })),
      ] },
      { titel: 'Klokkijken', doelen: ['analoog', 'digitaal'].flatMap(k =>
        ['1', '2', '3', '4'].map(l => d(`Klokkijken ${k} — level ${l}`, 'klokkijken', { weergave: k, level: l }))) },
      { titel: 'Maten omrekenen', doelen: ['1', '2', '3'].map(l => d(`Maten omrekenen — level ${l}`, 'maten-omrekenen', { level: l })) },
      { titel: 'Breuken, procenten en kommagetallen', doelen: [
        d('Breuken bij plaatjes', 'breuken-plaatjes'),
        d('Procenten, breuken en kommagetallen koppelen', 'procenten-breuken'),
      ] },
    ],
  },
  {
    vak: 'topo', onderwerpen: [
      { titel: 'Europa — kaart A', doelen: [
        d('Landen van Europa', 'topo-europa-a', { soorten: ['landen'] }),
        d('Hoofdsteden van Europa', 'topo-europa-a', { soorten: ['hoofdsteden'] }),
        d('Zeeën van Europa', 'topo-europa-a', { soorten: ['wateren'] }),
        d('Rivieren van Europa', 'topo-europa-a', { soorten: ['rivieren'] }),
        d('Gebergtes van Europa', 'topo-europa-a', { soorten: ['gebergtes'] }),
      ] },
      { titel: 'Noordwest-Europa — kaart B', doelen: [
        d('Steden in Noordwest-Europa', 'topo-europa-b', { soorten: ['steden'] }),
        d('Regio’s in Noordwest-Europa', 'topo-europa-b', { soorten: ['regios'] }),
      ] },
    ],
  },
]

// Alleen doelen waarvan de oefening bij de groepen van de klas past
// (leeg = geen beperking, net als toolsVoorGroepen).
export function doelVakkenVoor(klasGroepen) {
  const past = (toolId) => {
    const g = TOOL_BY_ID[toolId]?.groepen ?? []
    return !klasGroepen?.length || !g.length || g.some(x => klasGroepen.includes(x))
  }
  return DOEL_VAKKEN
    .map(v => ({ ...v, onderwerpen: v.onderwerpen
      .map(o => ({ ...o, doelen: o.doelen.filter(x => past(x.toolId)) }))
      .filter(o => o.doelen.length) }))
    .filter(v => v.onderwerpen.length || v.vak === 'rekenen')
}
