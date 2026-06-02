// Blok 9 — extra oefenen (Pluspunt groep 7). Sommen omgezet naar typ-vragen.
// Een "opgave" = een genummerde opgave; alle deelvragen af = €100 briefgeld.

export const BLOK9 = {
  FS: {
    key: 'FS',
    label: 'Oefenen FS',
    doelen: [
      {
        nr: 1,
        titel: 'Rekenmachine: verhaalsommen',
        omschrijving: 'Sommen met hele getallen en kommagetallen uitrekenen op de rekenmachine.',
        opgaven: [
          {
            nr: 1,
            intro: 'Tel de aantallen per vervoermiddel op (mannen + vrouwen + kinderen).',
            vragen: [
              { vraag: 'fiets: 619 + 1036 + 352 =', antwoord: '2007' },
              { vraag: 'bus: 493 + 458 + 227 =', antwoord: '1178' },
              { vraag: 'auto: 3215 + 2467 + 1015 =', antwoord: '6697' },
              { vraag: 'trein: 1983 + 1574 + 104 =', antwoord: '3661' },
              { vraag: 'te voet: 278 + 189 + 121 =', antwoord: '588' },
            ],
          },
          {
            nr: 2,
            intro: 'Reken elk bedrag uit en tel ze daarna op.',
            vragen: [
              { vraag: 'shirt: 5 × € 24,95 =', antwoord: '124,75' },
              { vraag: 'foto: 9 × € 7,45 =', antwoord: '67,05' },
              { vraag: 'beker: 3 × € 5,75 =', antwoord: '17,25' },
              { vraag: 'totaal: 124,75 + 67,05 + 17,25 =', antwoord: '209,05' },
            ],
          },
          {
            nr: 3,
            vragen: [
              { vraag: '1 kaartje kost € 8,85. Wat kosten 14 kaartjes samen? (14 × 8,85)', antwoord: '123,90' },
              { vraag: 'Een bus rijdt 2198 km per week. Hoeveel km is dat gemiddeld per dag? (2198 : 7)', antwoord: '314' },
            ],
          },
          {
            nr: 4,
            intro: 'Reken elk bedrag uit en tel ze daarna op.',
            vragen: [
              { vraag: 'handdoek: 8 × € 7,85 =', antwoord: '62,80' },
              { vraag: 'glas: 3 × € 5,50 =', antwoord: '16,50' },
              { vraag: 'vlaggetje: 6 × € 3,75 =', antwoord: '22,50' },
              { vraag: 'totaal: 62,80 + 16,50 + 22,50 =', antwoord: '101,80' },
            ],
          },
          {
            nr: 5,
            vragen: [
              { vraag: 'Een pen kost € 1,95. Hoeveel pennen kun je kopen voor € 20? (20 : 1,95, afronden naar beneden)', antwoord: '10' },
              { vraag: 'De dierentuin kost € 18,45 per persoon. Hoeveel personen kunnen naar binnen voor € 150? (afronden naar beneden)', antwoord: '8' },
            ],
          },
        ],
      },
    ],
  },

  Splus: {
    key: 'Splus',
    label: 'Oefenen S+',
    doelen: [
      {
        nr: 1,
        titel: 'Rekenmachine: verhaalsommen',
        omschrijving: 'Lastigere verhaalsommen met hele getallen en kommagetallen op de rekenmachine.',
        opgaven: [
          {
            nr: 1,
            vragen: [
              { vraag: '38 bezoekers betalen samen € 948,10. Hoeveel betaalt 1 bezoeker gemiddeld? (948,10 : 38)', antwoord: '24,95' },
              { vraag: '7 boksers wegen samen 504 kg. Hoeveel kg weegt 1 bokser gemiddeld? (504 : 7)', antwoord: '72' },
              { vraag: 'Een pen kost € 1,95. Hoeveel pennen koop je voor € 20? (afronden naar beneden)', antwoord: '10' },
              { vraag: 'De dierentuin kost € 18,45 per persoon. Hoeveel personen voor € 150? (afronden naar beneden)', antwoord: '8' },
            ],
          },
          {
            nr: 3,
            vragen: [
              { vraag: 'In een treintje gaan 46 kinderen. Er wachten 368 kinderen. Hoeveel treintjes zijn er nodig? (368 : 46, afronden naar boven)', antwoord: '8' },
              { vraag: '27 bezoekers betalen samen € 371,25. Hoeveel is dat gemiddeld per bezoeker? (371,25 : 27)', antwoord: '13,75' },
              { vraag: 'In 2019 namen 401.185 voetgangers de pont. In 2018 waren dat er 42.137 méér. Hoeveel in 2018? (401185 + 42137)', antwoord: '443322' },
              { vraag: '1 volwassene betaalt € 23,75 entree. Hoeveel volwassenen kunnen naar binnen voor € 997,50? (997,50 : 23,75)', antwoord: '42' },
            ],
          },
          {
            nr: 4,
            vragen: [
              { vraag: 'De stoelen staan in rijen van 38. Hoeveel rijen zijn er nodig voor 984 toeschouwers? (984 : 38, afronden naar boven)', antwoord: '26' },
              { vraag: '219 bezoekers betalen samen € 5245,05. Hoeveel kost 1 maaltijd gemiddeld? (5245,05 : 219)', antwoord: '23,95' },
              { vraag: 'Een auto tankt 44 l benzine en rijdt 616 km. Hoeveel km rijdt hij gemiddeld op 1 l? (616 : 44)', antwoord: '14' },
              { vraag: 'In een winkel hangt voor bijna € 1200 aan shirts. 1 shirt kost € 39,95. Hoeveel shirts zijn dat? (1200 : 39,95, afronden naar beneden)', antwoord: '30' },
            ],
          },
          {
            nr: 5,
            intro: 'Reken de kassabon uit en tel daarna op.',
            vragen: [
              { vraag: 'toegang volwassene: 6 × € 23,50 =', antwoord: '141' },
              { vraag: 'toegang 5 t/m 15 jaar: 18 × € 15,75 =', antwoord: '283,50' },
              { vraag: 'paraplu: 5 × € 12,95 =', antwoord: '64,75' },
              { vraag: 'totaal: 141 + 283,50 + 64,75 =', antwoord: '489,25' },
            ],
          },
        ],
      },
    ],
  },
}
