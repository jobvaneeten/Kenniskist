// Denkvragen bij de rekenlessen. Geen opgaven om uit te rekenen: vragen waar
// vaak niet één antwoord goed is, op de bovenste drie niveaus van Bloom
// (analyseren, evalueren, creëren). Het kind zoekt de vraag zelf op, schrijft
// zijn antwoord op papier en bespreekt het daarna met de leerkracht.
//
// Daarom staat er in de app geen invoerveld, geen nakijken, geen score en geen
// beloning — en daarom staat deze tool ook niet in src/lib/tools.js: een
// weektaakopdracht die nooit "af" kan raken zou alleen maar in de weg zitten.
//
// Indeling van een blok (10 lessen, 4 doelen):
//   les 1 en 2 → doel 1      les 6 en 7 → doel 3
//   les 3 en 4 → doel 2      les 8 en 9 → doel 4
//   les 5 en les 10 zijn herhalingslessen en hebben geen denkvraag.
// De twee lessen bij één doel krijgen elk een eigen vraag, op een ander niveau,
// zodat de tweede les niet dezelfde vraag nog eens is.
//
// Hoe de vragen gebouwd zijn. Bijna elke vraag draait om een echte valkuil —
// een fout die kinderen in groep 7 aantoonbaar maken (nullen wegstrepen,
// "delen maakt kleiner", "keer maakt groter", een breuk is altijd minder dan
// één, twee keer 25% is 50%). Dan is er iets om over te praten. En waar een
// klasgenoot iets beweert, klopt het soms wél: dan is de vraag waarom, en niet
// alleen wat er mis is. De getallen zijn nagerekend; waar een fout antwoord
// staat is dat het antwoord dat de genoemde fout ook echt oplevert.
//
// `niveau` staat er voor de leerkracht en voor de test die de dekking bewaakt;
// het kind ziet het niet.

import { doelenVanBlok } from './redactiesommen.js'

export const LESSEN_PER_BLOK = 10

// Welk doel hoort bij welke les. null = herhalingsles, geen denkvraag.
export const DOEL_VAN_LES = { 1: 1, 2: 1, 3: 2, 4: 2, 5: null, 6: 3, 7: 3, 8: 4, 9: 4, 10: null }

export const BLOKKEN = [
  { nr: 0, label: 'Instap' },
  ...Array.from({ length: 10 }, (_, i) => ({ nr: i + 1, label: `Blok ${i + 1}` })),
]

// vragen[groep][blok][les]
const VRAGEN = {
  7: {
    // ═══════════════════════════════════════════════════════════════════════
    // INSTAP
    // ═══════════════════════════════════════════════════════════════════════
    0: {
      // ── Doel 1 · kleine som ────────────────────────────────────────────
      1: {
        niveau: 'analyseren',
        vraag: 'Hier staan vier sommen:\n\n1200 + 1300     1250 + 1300\n30 × 40           32 × 40\n\n'
          + 'Bij welke sommen helpt de kleine som je echt, en bij welke niet?\n'
          + 'Leg bij elke som uit waaraan je dat ziet.',
        hint: 'Kijk naar de nullen aan het eind van de getallen. Wat gebeurt er als er ook nog andere cijfers staan?',
      },
      2: {
        niveau: 'evalueren en creëren',
        vraag: 'Tim rekent 1500 : 30 uit. Hij denkt: 15 : 3 = 5, dus het antwoord is 5.\n'
          + 'Sanne zegt: nee, het is 50.\n\n'
          + 'Wie heeft gelijk? Laat zien hoe je dat kunt controleren zonder de deling nog een keer te doen.\n'
          + 'Bedenk daarna zelf een som waarbij deze fout heel makkelijk te maken is.',
        hint: 'Draai het om. Als het antwoord 5 zou zijn, hoeveel is dan 30 × 5? Kan dat kloppen met 1500?',
      },

      // ── Doel 2 · cijferend rekenen ─────────────────────────────────────
      3: {
        niveau: 'evalueren',
        vraag: 'Noor rekent 432 − 263 cijferend uit. Zij komt uit op 231.\n\n'
          + 'Reken eerst uit hoeveel het ongeveer moet zijn.\n'
          + 'Zoek daarna kolom voor kolom uit wat Noor gedaan heeft.\n'
          + 'Hoe had zij zelf kunnen merken dat haar antwoord niet kon kloppen?',
        hint: 'Kijk bij de eenheden. Wat doet Noor als het bovenste cijfer kleiner is dan het onderste?',
      },
      4: {
        niveau: 'creëren en analyseren',
        vraag: 'Bedenk een plussom van twee getallen van drie cijfers waarbij je twee keer moet onthouden.\n'
          + 'Bedenk er ook één waarbij je geen enkele keer hoeft te onthouden.\n\n'
          + 'Hoe kun je aan de getallen al zien welke van de twee het wordt, vóórdat je begint met rekenen?',
        hint: 'Tel de cijfers per kolom bij elkaar op, van rechts naar links. Wanneer kom je boven de 9 uit?',
      },

      // ── Doel 3 · kommagetallen en deel van een geheel ──────────────────
      6: {
        niveau: 'evalueren en creëren',
        vraag: 'Jesse zegt: 0,45 meter is meer dan 0,5 meter, want 45 is meer dan 5.\n\n'
          + 'Leg uit waarom dat niet klopt.\n'
          + 'Bedenk daarna een manier om het aan Jesse te laten zien waarbij je niets hoeft uit te rekenen.',
        hint: 'Maak er centimeters van. Of denk aan geld: wat is meer, € 0,45 of € 0,50?',
      },
      7: {
        niveau: 'analyseren en creëren',
        vraag: 'Een kwart van de koekjes in een pak is op. Er zitten er nog 18 in.\n'
          + 'Marijn zegt: dan zaten er 22 in, want 18 + 4 = 22.\n\n'
          + 'Wat gaat er mis in haar denken?\n'
          + 'Bedenk daarna zelf een vraag waarbij je net zo moet terugrekenen naar het geheel.',
        hint: 'Teken het pak als vier gelijke vakjes. Hoeveel vakjes zijn er nog vol, en hoeveel koekjes zitten er dan in één vakje?',
      },

      // ── Doel 4 · omtrek en oppervlakte ─────────────────────────────────
      8: {
        niveau: 'analyseren en creëren',
        vraag: 'Twee rechthoeken hebben dezelfde omtrek, maar niet dezelfde oppervlakte.\n'
          + 'Teken er twee die dat laten zien.\n\n'
          + 'Lukt het je ook om twee rechthoeken te tekenen met dezelfde oppervlakte maar een verschillende omtrek?\n'
          + 'Leg uit hoe dat kan.',
        hint: 'Begin met een lange, smalle rechthoek en met eentje die bijna vierkant is. Reken bij allebei de omtrek én de oppervlakte uit.',
      },
      9: {
        niveau: 'evalueren',
        vraag: 'De juf wil een rechthoekige moestuin van 24 vierkante meter. Ze heeft 20 meter hek.\n\n'
          + 'Zoek eerst alle rechthoeken van 24 m² met hele meters.\n'
          + 'Past het hek er bij allemaal omheen?\n'
          + 'Welke moestuin zou jij kiezen, en waarom?',
        hint: 'Zoek de keersommen met antwoord 24: 1 × 24, 2 × 12 … Reken bij elke rechthoek de omtrek uit.',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 1 · grote getallen, kleine som, helen uit de breuk, tijd
    // ═══════════════════════════════════════════════════════════════════════
    1: {
      // ── Doel 1 · getallen tot 1 miljoen ────────────────────────────────
      1: {
        niveau: 'evalueren en creëren',
        vraag: 'De juf zegt: "driehonderdvijfduizend twintig".\n'
          + 'Sam schrijft op: 3005020.\nBo schrijft op: 305020.\n\n'
          + 'Wie heeft het goed? Leg uit wat er bij de ander misgaat.\n'
          + 'Bedenk daarna een manier waarmee je zulke fouten altijd kunt voorkomen.',
        hint: 'Verdeel het getal in groepjes van drie cijfers, van achteren naar voren. Hoeveel cijfers mogen er in het groepje van de duizenden staan?',
      },
      2: {
        niveau: 'creëren en evalueren',
        vraag: 'Teken zelf een getallenlijn van 0 tot 1.000.000 en zet er 10.000, 250.000 en 900.000 op.\n\n'
          + 'Lieke zette 250.000 precies in het midden. Waarom klopt dat niet?\n'
          + 'Leg uit hoe je zonder liniaal toch de goede plek vindt — ook voor 10.000, dat veel dichter bij de 0 zit dan je denkt.',
        hint: 'Deel de lijn eerst in tien gelijke stukken. Hoeveel is dan elk stuk? Hoeveel van die stukken is 250.000?',
      },

      // ── Doel 2 · sommen als 35.400 + 3500 en 24.000 : 600 ──────────────
      3: {
        niveau: 'evalueren',
        vraag: 'Daan rekent 24.000 : 600 uit met de kleine som. Hij streept nullen weg, doet 24 : 6 = 4 en zegt: het antwoord is 4.\n'
          + 'Milan zegt: 40. Fatima zegt: 400.\n\n'
          + 'Wie heeft gelijk? Leg uit hoe je bij nullen wegstrepen precíes bijhoudt hoeveel er overblijven.',
        hint: 'Streep aan allebei de kanten evenveel nullen weg. 600 heeft er twee. Hoeveel nullen blijven er dan nog over bij 24.000?',
      },
      4: {
        niveau: 'creëren en analyseren',
        vraag: 'Bedenk drie verschillende sommen waarvan het antwoord 35.000 is: een plussom, een minsom en een keersom.\n'
          + 'Maak ze zo dat je ze uit je hoofd kunt doen.\n\n'
          + 'Bij welke van de drie moest je het slimst zijn, en waarom?',
        hint: 'Begin bij een som die je wél makkelijk vindt, en verander steeds één getal.',
      },

      // ── Doel 3 · helen uit de breuk, breuken vergelijken ───────────────
      6: {
        niveau: 'evalueren en creëren',
        vraag: 'Iris zegt: een breuk is altijd kleiner dan 1. Dus 7/4 pizza is minder dan één hele pizza.\n\n'
          + 'Leg uit waarom dat niet klopt, en hoeveel pizza 7/4 eigenlijk is.\n'
          + 'Bedenk daarna drie verschillende breuken die samen precies 2 hele pizza\'s zijn.',
        hint: 'Hoeveel kwarten is één hele pizza? Hoeveel hele pizza\'s haal je dan uit 7 kwarten, en wat blijft er over?',
      },
      7: {
        niveau: 'analyseren en creëren',
        vraag: 'Noor heeft 2/3 van een reep gegeten. Tom heeft 3/5 van precies zo\'n reep gegeten.\n\n'
          + 'Wie heeft het meest gegeten? Leg uit hoe je dat kunt weten zonder de repen precies af te meten.\n'
          + 'Bedenk daarna twee breuken waarbij je het verschil juist heel moeilijk ziet.',
        hint: 'Kijk eens naar wat er nog óver is: Noor heeft nog 1/3, Tom nog 2/5. Wie heeft het minst over?',
      },

      // ── Doel 4 · kalender, tijdsduur, begin- en eindtijd ───────────────
      8: {
        niveau: 'evalueren',
        vraag: 'Een film begint om 19:45 uur en duurt 1 uur en 50 minuten.\n'
          + 'Ruben rekent: 19 + 1 = 20 en 45 + 50 = 95, dus 20:95 uur. En dat is 21:35 uur.\n\n'
          + 'Zijn antwoord klopt. Toch is er iets mis met zijn manier. Wat?\n'
          + 'Laat zien hoe jij het zou doen, en leg uit waarom dat veiliger is.',
        hint: 'Kan een klok 20:95 uur aanwijzen? Wat gebeurt er op een klok zodra er 60 minuten voorbij zijn?',
      },
      9: {
        niveau: 'analyseren',
        vraag: 'Stel dat je verjaardag dit jaar op een dinsdag valt.\n\n'
          + 'Op welke dag valt hij volgend jaar? Leg uit waarom dat zo is.\n'
          + 'En waarom pakt het sommige jaren toch anders uit?',
        hint: 'Hoeveel dagen heeft een jaar? Hoeveel hele weken zijn dat, en wat blijft er dan over?',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 2 · 12 × 64 en 22 × 64, kommagetallen hoofdrekenen, schaal
    // ═══════════════════════════════════════════════════════════════════════
    2: {
      // ── Doel 1 · 12 × 64 cijferend of met splitsen ─────────────────────
      1: {
        niveau: 'analyseren en creëren',
        vraag: 'Lars rekent 12 × 64 uit door te splitsen: 10 × 64 = 640 en 2 × 64 = 128. Samen 768.\n'
          + 'Sanne splitst anders: 12 × 60 = 720 en 12 × 4 = 48. Samen 768.\n\n'
          + 'Allebei goed! Bedenk nog een derde manier van splitsen die ook klopt.\n'
          + 'Welke van de drie vind jij het handigst, en waarom?',
        hint: 'Je mag ook allebei de getallen splitsen. Of eerst 6 × 64 uitrekenen en dat verdubbelen.',
      },
      2: {
        niveau: 'evalueren',
        vraag: 'Yara rekent 12 × 64 cijferend uit. Onder de streep schrijft ze eerst 128, en daaronder 64.\n'
          + 'Ze telt op en krijgt 192.\n\n'
          + 'Waar is het misgegaan? Leg uit wat die tweede regel eigenlijk betekent, en waarom het uitmaakt op welke plek je hem neerzet.',
        hint: 'Die 1 van 12 is geen 1 maar een 10. Wat is 10 × 64 dan eigenlijk?',
      },

      // ── Doel 2 · 22 × 64, en 6 × 346 ───────────────────────────────────
      3: {
        niveau: 'analyseren',
        vraag: 'Je weet al dat 12 × 64 = 768.\n\n'
          + 'Hoe kun je daarmee 22 × 64 uitrekenen zonder helemaal opnieuw te beginnen?\n'
          + 'En 24 × 64? Leg uit waarom dat mag.',
        hint: 'Wat is het verschil tussen 12 keer iets en 22 keer iets? Hoeveel keer 64 komt erbij?',
      },
      4: {
        niveau: 'creëren en evalueren',
        vraag: 'Bedenk een verhaaltje waarin je 6 × 346 écht precies moet uitrekenen.\n'
          + 'Bedenk daarna een verhaaltje waarin je 6 × 346 leest, maar een schatting eigenlijk genoeg is.\n\n'
          + 'Wat is het verschil tussen die twee situaties?',
        hint: 'Wanneer wil je alleen weten óf het genoeg is, en wanneer moet je het precieze aantal weten?',
      },

      // ── Doel 3 · hoofdrekenen met kommagetallen ────────────────────────
      6: {
        niveau: 'evalueren',
        vraag: 'Mees koopt iets van € 3,45 en iets van € 2,80.\n'
          + 'Hij rekent: 3 + 2 = 5 en 45 + 80 = 125. Dus € 5,125.\n\n'
          + 'Wat gaat hier mis? Leg uit wat er met die 125 moet gebeuren, en waarom een bedrag nooit drie cijfers achter de komma heeft.',
        hint: 'Hoeveel cent is 125 cent eigenlijk? Kun je daar een euro uit halen?',
      },
      7: {
        niveau: 'creëren en analyseren',
        vraag: 'Je hebt € 10 en koopt twee dingen. Bedenk twee prijzen mét centen waarbij je precies € 1,25 terugkrijgt.\n\n'
          + 'Bedenk daarna twee prijzen waarbij je het wisselgeld snel kunt bedenken zónder eerst op te tellen.\n'
          + 'Wat maakt die tweede makkelijker?',
        hint: 'Bij "aanvullen" tel je van de prijs omhoog naar de € 10, in plaats van af te trekken.',
      },

      // ── Doel 4 · schaallijntje en schaal ───────────────────────────────
      8: {
        niveau: 'evalueren',
        vraag: 'Op een kaart staat een schaallijntje: 1 cm op de kaart is 500 meter in het echt.\n'
          + 'Kim meet de weg naar school op de kaart: 6 cm. Ze zegt: dat is 6 × 500 = 3000 cm.\n\n'
          + 'Wat klopt er niet, en wat is het dan wél?\n'
          + 'Leg ook uit waarom zo\'n schaallijntje handiger is dan alleen "schaal 1 : 50.000".',
        hint: 'Welke maat hoort bij die 500? Kijk nog eens goed naar wat er bij het lijntje staat.',
      },
      9: {
        niveau: 'creëren',
        vraag: 'Teken een plattegrond van je klaslokaal op schaal, zodat hij op een A4\'tje past.\n\n'
          + 'Welke schaal kies je, en hoe heb je dat bepaald?\n'
          + 'Wat gebeurt er als je een schaal kiest die te groot of juist te klein is?',
        hint: 'Meet of schat eerst hoe lang en breed het lokaal is. Hoeveel centimeter heb je op het papier?',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 3 · miljarden, kommagetallen cijferend, breuken, lengtematen
    // ═══════════════════════════════════════════════════════════════════════
    3: {
      // ── Doel 1 · hele grote getallen ───────────────────────────────────
      1: {
        niveau: 'analyseren',
        vraag: 'In Nederland wonen ongeveer 18 miljoen mensen. Op de hele wereld ongeveer 8 miljard.\n\n'
          + 'Schrijf allebei de getallen in cijfers.\n'
          + 'Hoeveel keer past Nederland ongeveer in de wereld? Leg uit hoe je dat schattend doet, zonder een lange deelsom.',
        hint: 'Streep aan allebei de kanten dezelfde nullen weg. Wat blijft er dan over om te delen?',
      },
      2: {
        niveau: 'evalueren en creëren',
        vraag: 'Sil zegt: 1 miljard is 1000 miljoen.\n'
          + 'Fay zegt: nee, 1 miljard is 100 miljoen, want "miljard" klinkt maar een beetje groter dan "miljoen".\n\n'
          + 'Wie heeft gelijk? Laat het zien met nullen.\n'
          + 'Bedenk daarna iets uit het echte leven waarvan er ongeveer een miljard zijn.',
        hint: 'Schrijf 1 miljoen uit met nullen. Hoeveel nullen komen erbij om er duizend keer zoveel van te maken?',
      },

      // ── Doel 2 · cijferend rekenen met kommagetallen ───────────────────
      3: {
        niveau: 'evalueren',
        vraag: 'Bram zet 12,5 kg en 3,75 kg cijferend onder elkaar en komt uit op 5,00 kg.\n\n'
          + 'Dat kan niet kloppen — je telt op, en het antwoord is kleiner dan 12,5.\n'
          + 'Wat is er misgegaan bij het onder elkaar zetten? Laat zien hoe het wel moet, en leg uit wat de komma hier te zeggen heeft.',
        hint: 'Zet de komma\'s precies onder elkaar. Wat wordt 12,5 als je er een nul achter zet? Verandert de waarde dan?',
      },
      4: {
        niveau: 'creëren',
        vraag: 'Bedenk een verhaaltje waarin je twee kommagetallen van elkaar moet aftrekken en waarbij je écht moet lenen.\n\n'
          + 'Kies de getallen zo dat een klasgenoot er makkelijk een fout in maakt.\n'
          + 'Leg uit waar de valkuil zit.',
        hint: 'Lenen óver de komma heen is het lastigst. Bijvoorbeeld bij 5,2 − 2,75: waar haal je dan iets vandaan?',
      },

      // ── Doel 3 · gelijkwaardige breuken, vergelijken ───────────────────
      6: {
        niveau: 'analyseren en creëren',
        vraag: 'Lotte zegt: 2/4 en 3/6 en 5/10 zijn precies evenveel.\n\n'
          + 'Klopt dat? Leg uit waarom.\n'
          + 'Bedenk daarna zelf vijf breuken die allemaal evenveel zijn als 2/3. Wat hebben die vijf met elkaar gemeen?',
        hint: 'Wat gebeurt er met de waarde als je de teller én de noemer met hetzelfde getal vermenigvuldigt?',
      },
      7: {
        niveau: 'evalueren',
        vraag: 'Welke is groter: 3/8 of 2/5?\n'
          + 'Jip zegt: 3/8, want 3 is meer dan 2 én 8 is meer dan 5.\n\n'
          + 'Leg uit waarom de manier van Jip niet werkt. Laat zien hoe je het wél zeker weet.\n'
          + 'Lukt het je ook zonder de breuken gelijknamig te maken?',
        hint: 'Vergelijk allebei de breuken eens met een half. Welke zit daar het dichtst bij?',
      },

      // ── Doel 4 · lengtematen ───────────────────────────────────────────
      8: {
        niveau: 'analyseren',
        vraag: 'Zet op volgorde van klein naar groot:\n\n1200 mm     1,5 m     130 cm     0,001 km\n\n'
          + 'Leg uit hoe je dat aanpakt zonder alles tot op de millimeter uit te rekenen.\n'
          + 'Welke twee liggen het dichtst bij elkaar?',
        hint: 'Zet alles eerst in dezelfde maat. Welke maat is hier het handigst?',
      },
      9: {
        niveau: 'creëren en evalueren',
        vraag: 'Meet drie dingen in de klas: iets dat je in millimeters meet, iets in centimeters en iets in meters.\n\n'
          + 'Leg per ding uit waarom je juist die maat koos.\n'
          + 'Hoe lang zijn de drie dingen samen? In welke maat schrijf je dát op?',
        hint: 'Kies de maat waarbij je geen heel lange getallen en geen komma\'s nodig hebt.',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 4 · rekenmachine en schatten, breuk↔komma, procenten, snelheid
    // ═══════════════════════════════════════════════════════════════════════
    4: {
      // ── Doel 1 · rekenmachine met schatting ────────────────────────────
      1: {
        niveau: 'evalueren',
        vraag: 'Noa tikt 48 × 52 in op de rekenmachine en krijgt 2496.\n'
          + 'Milan tikt dezelfde som in en krijgt 24.960.\n\n'
          + 'Wie heeft de goede uitkomst? Hoe weet je dat zónder de rekenmachine opnieuw te gebruiken?\n'
          + 'Wat is er bij de ander waarschijnlijk misgegaan?',
        hint: 'Rond allebei de getallen af op een tiental. Hoeveel is de som dan ongeveer?',
      },
      2: {
        niveau: 'analyseren en creëren',
        vraag: 'Hier staan vier sommen:\n\n25 × 4     1999 + 1     347 × 29     6000 : 30\n\n'
          + 'Bij welke pak je de rekenmachine, en bij welke doe je het uit je hoofd? Leg per som uit waarom.\n'
          + 'Bedenk zelf een som die er moeilijk uitziet, maar makkelijk uit het hoofd kan.',
        hint: 'Kijk of je ronde getallen ziet, of getallen die nét naast een rond getal liggen.',
      },

      // ── Doel 2 · breuken en kommagetallen ──────────────────────────────
      3: {
        niveau: 'analyseren',
        vraag: 'Je weet: 1/4 = 0,25 en 1/2 = 0,5.\n\n'
          + 'Wat is dan 3/4 als kommagetal, zonder rekenmachine? En 1/8?\n'
          + 'Leg uit hoe je van die eerste twee naar de andere komt.\n'
          + 'Bedenk daarna een breuk die je níet zo makkelijk in een kommagetal krijgt, en leg uit waarom niet.',
        hint: 'Halveer 1/4 om 1/8 te krijgen. Wat gebeurt er dan met 0,25?',
      },
      4: {
        niveau: 'evalueren en creëren',
        vraag: 'Dilan zegt: 0,4 is hetzelfde als 1/4, want allebei hebben ze een 4.\n\n'
          + 'Leg uit waarom dat niet klopt, en wat 0,4 wél is als breuk.\n'
          + 'Bedenk daarna een kommagetal en een breuk die er heel anders uitzien, maar toch precies gelijk zijn.',
        hint: '0,4 is vier tienden. Hoe schrijf je tienden als een breuk?',
      },

      // ── Doel 3 · procenten in strook en cirkel ─────────────────────────
      6: {
        niveau: 'analyseren en creëren',
        vraag: 'In een cirkeldiagram is precies een kwart blauw gekleurd.\n\n'
          + 'Hoeveel procent is dat? Leg uit hoe je dat ziet.\n'
          + 'Kleur nu zelf een strook in met 30%. Hoe verdeel je de strook zodat je dat precíes kunt doen?',
        hint: '100% is de hele strook. In hoeveel gelijke stukjes deel je hem om 10% te kunnen aanwijzen?',
      },
      7: {
        niveau: 'evalueren',
        vraag: 'Bij een toets had Lena 8 van de 10 vragen goed. Jesse had 16 van de 20 goed.\n'
          + 'Jesse zegt: ik heb twee keer zoveel goed, dus ik heb het beter gedaan.\n\n'
          + 'Wat vind jij? Reken het om naar procenten.\n'
          + 'Leg uit wat een percentage eigenlijk laat zien, en waarom dat hier eerlijker is dan tellen.',
        hint: 'Stel dat allebei de toetsen 100 vragen hadden. Hoeveel had elk kind er dan goed?',
      },

      // ── Doel 4 · gemiddelde snelheid ───────────────────────────────────
      8: {
        niveau: 'evalueren',
        vraag: 'Een auto rijdt 150 km in 3 uur.\n'
          + 'Ravi zegt: de gemiddelde snelheid is 50 km per uur, dus de auto reed de hele tijd precies 50.\n\n'
          + 'Klopt dat laatste? Leg uit wat "gemiddeld" hier betekent.\n'
          + 'Bedenk twee heel verschillende manieren waarop de rit ook gegaan kan zijn.',
        hint: 'Kan de auto ook even stilgestaan hebben bij een stoplicht? Wat moet er dan daarna gebeuren om toch op tijd aan te komen?',
      },
      9: {
        niveau: 'creëren en analyseren',
        vraag: 'Op de fiets rijd je ongeveer 15 km per uur.\n\n'
          + 'Bedenk een fietstocht van jouw huis naar een plek die je kent, en schat hoe lang je erover doet.\n'
          + 'Welke dingen maken je echte tijd langer of korter dan je berekening?',
        hint: 'Hoeveel kilometer is het ongeveer? Als 15 km een uur duurt, hoe lang duurt 5 km dan?',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 5 · kolomsgewijs delen, verhoudingen, oppervlakte
    // ═══════════════════════════════════════════════════════════════════════
    5: {
      // ── Doel 1 · 357 : 17 en 360 : 17 ──────────────────────────────────
      1: {
        niveau: 'evalueren',
        vraag: 'Bo rekent 360 : 17 uit en zegt: het is 21 rest 3.\n'
          + 'Sam zegt: dat kan niet kloppen, want 21 × 17 is geen 357.\n\n'
          + 'Wie heeft gelijk? Reken het na.\n'
          + 'Laat zien hoe je een deelsom met rest áltijd kunt controleren.',
        hint: 'Doe de deelsom terug: antwoord × deler, en dan de rest erbij. Wat moet daar uitkomen?',
      },
      2: {
        niveau: 'creëren en analyseren',
        vraag: 'Bedenk een deelsom door 17 die precies uitkomt, zonder rest.\n'
          + 'Bedenk er ook één met rest 16.\n\n'
          + 'Hoe heb je die tweede gevonden?\n'
          + 'Kan een deelsom door 17 ook rest 17 hebben? Leg uit.',
        hint: 'Begin met een keersom met 17, en tel er daarna iets bij op.',
      },

      // ── Doel 2 · 3726 : 23 in maximaal 3 stappen ───────────────────────
      3: {
        niveau: 'analyseren',
        vraag: 'Je gaat 3726 : 23 uitrekenen. Maar eerst:\n\n'
          + 'Wordt het antwoord groter of kleiner dan 100? En dan 200?\n'
          + 'Leg uit hoe je dat snel ziet, en waarom dat helpt bij het kolomsgewijs delen.',
        hint: 'Wat is 23 × 100? En 23 × 200? Tussen welke twee zit 3726?',
      },
      4: {
        niveau: 'evalueren',
        vraag: 'Maud deelt 3732 door 23 in stappen: eerst 100 × 23 = 2300, dan 50 × 23 = 1150, dan 10 × 23 = 230.\n'
          + 'Ze telt op: 160. Er is nog 52 over, dus ze schrijft: 160 rest 52.\n\n'
          + 'Wat is er nog niet klaar?\n'
          + 'Leg uit hoe je zeker weet wanneer je écht klaar bent met delen.',
        hint: 'Kijk goed naar de rest. Past 23 er nog een keer in?',
      },

      // ── Doel 3 · verhoudingen ──────────────────────────────────────────
      6: {
        niveau: 'analyseren',
        vraag: 'Voor 4 pannenkoeken heb je 3 eieren nodig.\n\n'
          + 'Hoeveel eieren heb je nodig voor 10 pannenkoeken?\n'
          + 'Leg uit hoe je met een verhoudingstabel bij 10 komt, ook al is 10 geen veelvoud van 4.\n'
          + 'En wat doe je met een half ei?',
        hint: 'Ga in de tabel eerst naar 2 pannenkoeken, of juist naar 20.',
      },
      7: {
        niveau: 'evalueren en creëren',
        vraag: 'In een klas zit 1/4 van de kinderen op een sportclub.\n'
          + 'Tessa zegt: dan is de verhouding sporters : niet-sporters 1 : 4.\n\n'
          + 'Klopt dat? Leg uit.\n'
          + 'Teken daarna een cirkeldiagram dat laat zien hoe het wél zit.',
        hint: 'Als 1 van de 4 kinderen sport, hoeveel van die 4 sporten er dan níet?',
      },

      // ── Doel 4 · oppervlakte in cm, dm, m ──────────────────────────────
      8: {
        niveau: 'evalueren',
        vraag: 'Een vloer is 3 m lang en 40 dm breed.\n'
          + 'Ilse rekent: 3 × 40 = 120, dus 120 m².\n\n'
          + 'Wat gaat er mis? Wat is de oppervlakte wél?\n'
          + 'Leg uit waarom je bij oppervlakte extra goed op de maten moet letten.',
        hint: 'Zet eerst allebei de maten in dezelfde eenheid. Hoeveel meter is 40 dm?',
      },
      9: {
        niveau: 'creëren en analyseren',
        vraag: 'Een kamer in de vorm van een L kun je op twee manieren in rechthoeken verdelen.\n\n'
          + 'Teken een L-vorm met maten erbij. Verdeel hem op allebei de manieren en reken de oppervlakte uit.\n'
          + 'Komt er hetzelfde uit? Leg uit waarom dat wel móet kloppen.\n'
          + 'Is er nog een derde manier, waarbij je iets aftrekt in plaats van optelt?',
        hint: 'Teken de L in een grote rechthoek en knip er in gedachten een hoek af.',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 6 · miljarden en afronden, heel × breuk, procenten, diagrammen
    // ═══════════════════════════════════════════════════════════════════════
    6: {
      // ── Doel 1 · 5,2 miljoen en afronden ───────────────────────────────
      1: {
        niveau: 'evalueren',
        vraag: 'In de krant staat: "Er wonen 5,2 miljoen mensen in de stad."\n'
          + 'Kees zegt: dat zijn dus 5.000.002 mensen.\n\n'
          + 'Wat gaat er mis? Schrijf het goede getal op.\n'
          + 'Leg uit waarom de krant liever "5,2 miljoen" schrijft dan het hele getal.',
        hint: '0,2 miljoen is een deel van een miljoen. Hoeveel is een tiende van een miljoen?',
      },
      2: {
        niveau: 'analyseren en evalueren',
        vraag: 'Rond 3.749.999 af op een honderdduizendtal. Wat krijg je?\n'
          + 'Rond nu 3.750.000 af. Wat krijg je nu?\n\n'
          + 'Die twee getallen verschillen maar 1. Leg uit waarom hun afronding zo ver uit elkaar ligt.\n'
          + 'Vind je dat eerlijk? Wanneer zou je líever niet afronden?',
        hint: 'Kijk naar het cijfer van de tienduizendtallen. Vanaf welk cijfer rond je naar boven af?',
      },

      // ── Doel 2 · heel getal × breuk ────────────────────────────────────
      3: {
        niveau: 'analyseren',
        vraag: 'Anne rekent 6 × 3/4 liter uit: 6 × 3 = 18, dus 18/4 liter, dus 4½ liter.\n'
          + 'Ben zegt: 3/4 van 6 liter is óók 4½ liter.\n\n'
          + 'Is dat toeval? Leg uit waarom 6 × 3/4 en 3/4 van 6 hetzelfde geven.\n'
          + 'Welke van de twee manieren vind jij handiger, en waarom?',
        hint: 'Wat is de helft van 6 liter? En driekwart?',
      },
      4: {
        niveau: 'creëren',
        vraag: 'Bedenk een verhaaltje waarin je 8 × 2/3 nodig hebt.\n\n'
          + 'Bedenk daarna een verhaaltje waarin het antwoord uiteindelijk een héél getal moet zijn — je kunt bijvoorbeeld geen derde pak kopen.\n'
          + 'Wat doe je dan met het stukje dat overblijft? Leg uit.',
        hint: 'Denk aan dingen die je niet in stukjes kunt kopen: pakken, flessen, dozen.',
      },

      // ── Doel 3 · 5%, 10%, 25%, 50%, 75% ────────────────────────────────
      6: {
        niveau: 'analyseren',
        vraag: 'Je weet dat 10% van 80 gelijk is aan 8.\n\n'
          + 'Hoe kom je dan snel aan 5%? En aan 25%? En aan 75%?\n'
          + 'Leg uit welke stapjes je zet, en welk percentage je uit welk ander percentage kunt afleiden.',
        hint: '5% is de helft van 10%. 25% is een kwart van alles. En 75% is drie keer een kwart — of alles min een kwart.',
      },
      7: {
        niveau: 'evalueren en creëren',
        vraag: 'Wat is meer: 25% van 60 of 50% van 20?\n'
          + 'Lieke zegt meteen: 50% is meer dan 25%, dus de tweede.\n\n'
          + 'Reken het na. Leg uit waarom je een percentage nooit los kunt zien van het getal waar het van is.\n'
          + 'Bedenk zelf nog zo\'n paar, waarbij het kleinste percentage tóch het meeste oplevert.',
        hint: 'Een percentage is altijd een deel ván iets. Van welk getal is het hier?',
      },

      // ── Doel 4 · staaf- en cirkeldiagrammen ────────────────────────────
      8: {
        niveau: 'evalueren',
        vraag: 'Twee staafdiagrammen laten dezelfde cijfers zien: op maandag 40 ijsjes verkocht, op dinsdag 50.\n'
          + 'In het ene diagram begint de as bij 0. In het andere begint de as bij 35.\n\n'
          + 'In welk diagram lijkt het verschil het grootst? Leg uit hoe dat komt.\n'
          + 'Hoe kan een diagram je zo voor de gek houden, en wanneer moet je daar op letten?',
        hint: 'Kijk waar de as begint. Hoe lang is de staaf van 40 in elk diagram, en die van 50?',
      },
      9: {
        niveau: 'creëren en evalueren',
        vraag: 'Houd een dag bij hoeveel uur je slaapt, op school zit, buiten bent en naar een scherm kijkt.\n\n'
          + 'Kies of je er een staafdiagram of een cirkeldiagram van maakt, en leg uit waarom dat hier de beste keuze is.\n'
          + 'Wat laat het andere diagram juist mínder goed zien?',
        hint: 'Een cirkel laat zien hoe één geheel verdeeld is. Staven zijn handig om hoogtes met elkaar te vergelijken.',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 7 · gemiddelde, komma × en : 10/100/1000, verhoudingen, inhoud
    // ═══════════════════════════════════════════════════════════════════════
    7: {
      // ── Doel 1 · gemiddelde ────────────────────────────────────────────
      1: {
        niveau: 'evalueren',
        vraag: 'Vijf kinderen halen voor een toets: 6, 7, 7, 8 en 2.\n'
          + 'Milan zegt: het gemiddelde is 7, want de meeste kinderen hebben een 7.\n\n'
          + 'Klopt dat? Reken het uit.\n'
          + 'Leg uit wat die ene 2 met het gemiddelde doet, en of het gemiddelde dan nog een eerlijk beeld geeft van de klas.',
        hint: 'Tel alle cijfers bij elkaar op en deel door het aantal kinderen.',
      },
      2: {
        niveau: 'creëren en analyseren',
        vraag: 'Bedenk vijf getallen waarvan het gemiddelde precies 10 is, maar waar géén enkel getal 10 tussen zit.\n\n'
          + 'Bedenk daarna vijf getallen met gemiddelde 10 die zo ver mogelijk uit elkaar liggen.\n'
          + 'Wat moet er dan kloppen?',
        hint: 'Alle vijf de getallen samen moeten 50 zijn. Als er één heel groot is, wat moet er dan met de andere gebeuren?',
      },

      // ── Doel 2 · kommagetallen × en : 10, 100, 1000 ────────────────────
      3: {
        niveau: 'evalueren',
        vraag: 'Sara zegt: 2,5 × 10 = 2,50, want je zet er gewoon een nul achter.\n\n'
          + 'Leg uit waarom dat niet klopt, en wat er wél gebeurt met de komma.\n'
          + 'En waarom werkt "een nul erachter" bij 25 × 10 dan wél?',
        hint: '2,50 is precies evenveel als 2,5. Is 2,5 × 10 dan ook evenveel als 2,5?',
      },
      4: {
        niveau: 'analyseren',
        vraag: 'Een pak melk kost € 1,20. Wat kosten 10 pakken? En 100 pakken?\n'
          + 'Bij een andere winkel kosten 100 pakken € 95. Wat kost daar één pak?\n\n'
          + 'Leg uit wat er met de komma gebeurt bij vermenigvuldigen en bij delen.\n'
          + 'Waarom zijn die twee precies elkaars omgekeerde?',
        hint: 'Delen door 100 doet precies het tegenovergestelde van keer 100. Welke kant gaat de komma dan op?',
      },

      // ── Doel 3 · verhoudingen en vreemde valuta ────────────────────────
      6: {
        niveau: 'analyseren en evalueren',
        vraag: 'Voor 1 euro krijg je ongeveer 1,10 dollar.\n'
          + 'Op vakantie in Amerika kost een ijsje 3,30 dollar. Thuis kost zo\'n ijsje € 2,50.\n\n'
          + 'Is het ijsje op vakantie duurder of goedkoper? Leg uit hoe je zulke prijzen eerlijk vergelijkt.',
        hint: 'Reken de dollars eerst om naar euro\'s. Hoeveel keer past 1,10 in 3,30?',
      },
      7: {
        niveau: 'creëren en evalueren',
        vraag: 'Een recept voor 6 personen gebruikt 450 gram pasta. Jij kookt voor 8 personen.\n\n'
          + 'Bedenk twee verschillende manieren om uit te rekenen hoeveel pasta je nodig hebt.\n'
          + 'Welke manier zou je een klasgenoot aanraden, en waarom?',
        hint: 'Hoeveel gram is het voor 1 persoon? Of voor 2 personen?',
      },

      // ── Doel 4 · inhoud van een balk ───────────────────────────────────
      8: {
        niveau: 'analyseren',
        vraag: 'Een doos is 4 dm lang, 3 dm breed en 2 dm hoog.\n\n'
          + 'Hoeveel blokjes van 1 dm³ passen erin? Leg uit hoe je dat weet zonder ze allemaal te tellen.\n'
          + 'Wat verandert er aan het aantal als je de doos op zijn kant zet? En aan je berekening?',
        hint: 'Hoeveel blokjes passen er op de bodem? En hoeveel lagen kun je daarvan stapelen?',
      },
      9: {
        niveau: 'creëren en evalueren',
        vraag: 'Ontwerp een doos van precies 24 liter.\n\n'
          + 'Bedenk drie verschillende maten (lengte, breedte, hoogte) die allemaal kloppen.\n'
          + 'Welke doos zou je kiezen om pakken melk in te vervoeren — en waarom niet de andere twee?',
        hint: '1 liter is precies 1 dm³. Zoek drie getallen die met elkaar vermenigvuldigd 24 geven.',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 8 · rekenmachine in verhalen, heel × breuk, korting, gewicht
    // ═══════════════════════════════════════════════════════════════════════
    8: {
      // ── Doel 1 · rekenmachine bij verhaaltjessommen ────────────────────
      1: {
        niveau: 'evalueren',
        vraag: 'Jip koopt 3 broden van € 2,45 en betaalt met € 10.\n'
          + 'Hij tikt in: 10 − 3 × 2,45 en krijgt 2,65.\n'
          + 'Zijn klasgenoot tikt in: 10 − 3 = 7, en dan × 2,45 = 17,15.\n\n'
          + 'Wie heeft gelijk? Leg uit wat een rekenmachine doet als je meerdere bewerkingen achter elkaar intikt.\n'
          + 'Hoe zorg je dat je daar zeker van bent?',
        hint: 'Wat moet je éérst weten: wat de broden samen kosten, of iets anders? Reken dat los uit.',
      },
      2: {
        niveau: 'creëren',
        vraag: 'Bedenk een verhaaltje met kommagetallen waarbij je het antwoord op de rekenmachine uitrekent, maar er dan iets raars uitkomt — bijvoorbeeld 2,6 bussen.\n\n'
          + 'Leg uit wat je met zo\'n antwoord doet. Rond je af naar boven, naar beneden, of hangt dat ergens van af?',
        hint: 'Denk aan dingen die je niet in stukjes kunt hebben: bussen, dozen, mensen.',
      },

      // ── Doel 2 · heel getal × breuk (herhaling) ────────────────────────
      3: {
        niveau: 'analyseren en creëren',
        vraag: 'Welke is meer: 4 × 3/5 liter of 3 × 4/5 liter?\n\n'
          + 'Leg uit hoe je dat weet zonder allebei helemaal uit te rekenen.\n'
          + 'Bedenk nog een paar van zulke paren die altijd gelijk uitkomen. Wat is de regel?',
        hint: 'Welke getallen vermenigvuldig je met elkaar in de teller? En wat blijft de noemer?',
      },
      4: {
        niveau: 'evalueren',
        vraag: 'Kim rekent 5 × 2/3 uit en schrijft 10/15.\n'
          + 'Rob rekent dezelfde som uit en schrijft 10/3.\n\n'
          + 'Wie heeft gelijk? Wat heeft de ander gedaan, en waarom klopt dat niet?\n'
          + 'Leg uit wat "keer" eigenlijk betekent bij een breuk.',
        hint: '5 × 2/3 is 2/3 + 2/3 + 2/3 + 2/3 + 2/3. Wat verandert er dan: de teller of de noemer?',
      },

      // ── Doel 3 · korting en percentages boven 100% ─────────────────────
      6: {
        niveau: 'evalueren',
        vraag: 'Een jas van € 80 is afgeprijsd met 25%. Een week later gaat de nieuwe prijs nóg eens 25% omlaag.\n'
          + 'Femke zegt: dan is het samen 50% korting, dus de jas kost nu € 40.\n\n'
          + 'Klopt dat? Reken het na.\n'
          + 'Leg uit waarom twee keer 25% korting niet hetzelfde is als één keer 50%.',
        hint: 'De tweede korting gaat van de níeuwe prijs af, niet van € 80.',
      },
      7: {
        niveau: 'analyseren en creëren',
        vraag: 'Een spel kostte vorig jaar € 20 en nu € 30. Hoeveel procent is het duurder geworden?\n\n'
          + 'Bedenk daarna een prijs die met precies 200% is gestegen. Wat betekent dat eigenlijk?\n'
          + 'En kan een prijs ook met 200% dálen? Leg uit.',
        hint: '100% erbij betekent: het wordt twee keer zo duur. Wat betekent 100% eráf?',
      },

      // ── Doel 4 · gewichten en prijzen ──────────────────────────────────
      8: {
        niveau: 'evalueren',
        vraag: 'Bij de groenteboer kost 1 kg appels € 2,40.\n'
          + 'Yassin koopt 750 gram en betaalt € 1,80. Hij zegt: ik heb te veel betaald, want 750 is meer dan 2,40.\n\n'
          + 'Leg uit wat er mis is in zijn denken. Klopt de prijs die hij betaalde?',
        hint: 'Hoeveel gram is 1 kg? Welk deel van een kilo is 750 gram dan?',
      },
      9: {
        niveau: 'analyseren en creëren',
        vraag: 'Wat is zwaarder: een emmer met 3500 gram zand, of een emmer met 3,2 kg water?\n\n'
          + 'Leg uit welke maat je kiest om dit eerlijk te vergelijken.\n'
          + 'Bedenk daarna drie dingen die je in grammen weegt en drie die je in kilo\'s weegt. Waarom niet andersom?',
        hint: 'Zet eerst alles in dezelfde maat. Kilo of gram — wat is hier handig?',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 9 · 5819 : 23, komma × en :, procenten via 1%, windrichtingen
    // ═══════════════════════════════════════════════════════════════════════
    9: {
      // ── Doel 1 · 5819 : 23 ─────────────────────────────────────────────
      1: {
        niveau: 'analyseren',
        vraag: 'Je gaat 5819 : 23 uitrekenen. Maar eerst schatten:\n\n'
          + 'Ligt het antwoord dichter bij 200 of bij 300? Leg uit hoe je dat schat.\n'
          + 'Welke eerste stap kies je dan: 100 × 23, 200 × 23 of 250 × 23? Waarom?',
        hint: '23 is bijna 25, en 4 × 25 = 100. Hoeveel keer past 25 ongeveer in 5800?',
      },
      2: {
        niveau: 'evalueren',
        vraag: 'Twee kinderen delen 5819 door 23.\n'
          + 'Nadia doet het in 3 stappen: 200, 50 en 3.\n'
          + 'Tim doet het in 6 stappen: 100, 100, 20, 20, 10 en 3.\n'
          + 'Allebei komen ze uit op 253.\n\n'
          + 'Wie heeft het beter gedaan? Is meer stappen fout?\n'
          + 'Leg uit wat een handige stap is, en welke stap jij niet zou aandurven.',
        hint: 'Grote stappen zijn sneller, maar je moet ze wel zeker weten. Wat is het risico van een te grote stap?',
      },

      // ── Doel 2 · vermenigvuldigen en delen met kommagetallen ───────────
      3: {
        niveau: 'analyseren',
        vraag: 'Een pakje kost € 0,75. Hoeveel kosten 8 pakjes?\n\n'
          + 'Bedenk twee manieren: één via centen en één via breuken.\n'
          + 'Waarom komt er hetzelfde uit?\n'
          + 'Welke van de twee manieren werkt óók nog als een pakje € 0,79 kost?',
        hint: '0,75 is driekwart. En het is ook 75 cent. Allebei kun je gebruiken.',
      },
      4: {
        niveau: 'evalueren',
        vraag: 'Sem verdeelt 4,5 liter limonade over 3 kannen. Hij zegt: 4,5 : 3 = 1,5 liter per kan. Klopt.\n'
          + 'Daarna verdeelt hij 4,5 liter over flesjes van 0,5 liter. Hij zegt: 4,5 : 0,5 is ongeveer 2, want delen maakt kleiner.\n\n'
          + 'Waar gaat het mis? Hoeveel flesjes zijn het echt?\n'
          + 'Leg uit waarom delen soms juist een gróter getal geeft.',
        hint: 'Hoeveel halve liters passen er in 1 liter? En in 4,5 liter?',
      },

      // ── Doel 3 · procenten via 1% ──────────────────────────────────────
      6: {
        niveau: 'analyseren',
        vraag: 'Hier staan vier sommen:\n\n50% van 68     7% van 300     25% van 44     13% van 250\n\n'
          + 'Bij welke reken je via een breuk, en bij welke via 1%? Leg per som uit waarom.\n'
          + 'Is er een som waarbij allebei even handig is?',
        hint: '50% en 25% zijn een half en een kwart. Bij een raar percentage helpt het om eerst 1% te nemen.',
      },
      7: {
        niveau: 'evalueren en creëren',
        vraag: 'Daan zegt: 15% van 80 is precies hetzelfde als 80% van 15.\n\n'
          + 'Klopt dat? Reken het na.\n'
          + 'Als het klopt, leg dan uit waarom. En bedenk een procentsom die je met deze truc ineens heel makkelijk maakt.',
        hint: 'Schrijf allebei op als keersom met een breuk: 15/100 × 80 en 80/100 × 15. Wat zie je?',
      },

      // ── Doel 4 · windrichtingen en routes ──────────────────────────────
      8: {
        niveau: 'analyseren en evalueren',
        vraag: 'Je staat met je rug naar het noorden.\n\n'
          + 'Aan welke kant is het oosten dan: links of rechts? Leg uit hoe je dat bedenkt.\n'
          + 'Waarom is "links" en "rechts" geen goede manier om iemand de weg te wijzen, en "noord" en "zuid" wel?',
        hint: 'Teken de windroos en draai hem in gedachten zo dat het noorden áchter je ligt.',
      },
      9: {
        niveau: 'creëren en evalueren',
        vraag: 'Beschrijf de route van de klas naar het schoolplein, alleen met windrichtingen en aantallen stappen. Dus zonder "links" en "rechts".\n\n'
          + 'Laat een klasgenoot de route lopen. Waar ging het mis?\n'
          + 'Hoe maak je de beschrijving beter?',
        hint: 'Zoek eerst uit waar het noorden is in de school. Zonder dat kan niemand je route volgen.',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 10 · schatten, komma × komma, breuk↔komma, lijndiagrammen
    // ═══════════════════════════════════════════════════════════════════════
    10: {
      // ── Doel 1 · schattend rekenen ─────────────────────────────────────
      1: {
        niveau: 'analyseren en creëren',
        vraag: 'Wanneer is schatten goed genoeg, en wanneer moet het precies?\n\n'
          + 'Hoeveel bussen er nodig zijn voor een schoolreis.\n'
          + 'Hoeveel wisselgeld je terugkrijgt.\n'
          + 'Hoeveel verf je nodig hebt voor een muur.\n'
          + 'De uitslag van een verkiezing.\n\n'
          + 'Leg per situatie uit waarom. Bedenk er zelf twee bij: één waar schatten mag en één waar het niet mag.',
        hint: 'Wat gaat er mis als je bij die situatie een klein beetje ernaast zit? Is dat erg?',
      },
      2: {
        niveau: 'evalueren',
        vraag: 'Een klas van 29 kinderen gaat naar de dierentuin. Een kaartje kost € 19,75.\n'
          + 'De juf schat: 30 × 20 = 600, dus we hebben genoeg aan € 600.\n\n'
          + 'Klopt haar redenering? Zit ze aan de veilige kant?\n'
          + 'Leg uit hoe je bij schatten kiest of je naar boven of naar beneden afrondt.',
        hint: 'Ze rondde allebei de getallen naar bóven af. Wat betekent dat voor haar antwoord: te veel of te weinig?',
      },

      // ── Doel 2 · vermenigvuldigen met kommagetallen ────────────────────
      3: {
        niveau: 'evalueren',
        vraag: 'Bij 2,9 × 8,1 tikt Iris 29 × 81 in op de rekenmachine en krijgt 2349.\n'
          + 'Nu twijfelt ze: is het 2,349 of 23,49 of 234,9?\n\n'
          + 'Hoe helpt schatten haar hier?\n'
          + 'Leg uit hoe je de komma altijd op de goede plek krijgt.',
        hint: '2,9 is bijna 3 en 8,1 is bijna 8. Hoeveel is 3 × 8 ongeveer? Welk antwoord ligt daar het dichtst bij?',
      },
      4: {
        niveau: 'analyseren en creëren',
        vraag: 'Wat is meer: 24 × 0,67 of 24 × 1? Leg uit hoe je dat weet zonder te rekenen.\n\n'
          + 'Bedenk daarna een keersom met een kommagetal waarvan het antwoord kleiner is dan állebei de getallen waarmee je begon.\n'
          + 'Hoe kan dat, als "keer" toch groter maakt?',
        hint: 'Keer 0,5 is hetzelfde als de helft nemen. Wat gebeurt er dan met een getal?',
      },

      // ── Doel 3 · breuken en kommagetallen ordenen ──────────────────────
      6: {
        niveau: 'analyseren',
        vraag: 'Zet op volgorde van klein naar groot:\n\n3/4     0,7     2/3     0,66\n\n'
          + 'Leg uit hoe je ze vergelijkt als de ene een breuk is en de andere een kommagetal.\n'
          + 'Welke twee liggen het dichtst bij elkaar? Pas op, dat is een valstrik.',
        hint: 'Maak van alles een kommagetal, of van alles een breuk met dezelfde noemer. Wat is 2/3 als kommagetal precies?',
      },
      7: {
        niveau: 'evalueren en creëren',
        vraag: 'Pim zegt: 1/3 is 0,33. Dus 3 × 0,33 = 0,99. Dus drie derden zijn niet één hele!\n\n'
          + 'Wat klopt hier niet? Leg uit wat er met 1/3 als kommagetal aan de hand is.\n'
          + 'Bedenk nog een breuk waarbij precies hetzelfde gebeurt.',
        hint: 'Deel 1 door 3 op de rekenmachine. Houdt het ergens op?',
      },

      // ── Doel 4 · lijndiagrammen en tijd-afstand ────────────────────────
      8: {
        niveau: 'analyseren',
        vraag: 'In een tijd-afstand-diagram van een fietstocht loopt de lijn eerst schuin omhoog, dan een stuk helemaal plat, en daarna steiler omhoog dan aan het begin.\n\n'
          + 'Vertel het verhaal van de tocht: wat gebeurde er in elk stuk?\n'
          + 'Waar ging de fietser het hardst, en hoe zie je dat aan de lijn?',
        hint: 'Plat betekent: de afstand verandert niet. Wat doet de fietser dan?',
      },
      9: {
        niveau: 'creëren en analyseren',
        vraag: 'Teken een tijd-afstand-diagram van je eigen weg naar school, met een stuk waar je stilstaat.\n\n'
          + 'Kan de lijn ooit naar beneden gaan? En recht omhoog?\n'
          + 'Leg uit wat dat zou betekenen, en of dat kan.',
        hint: 'Naar beneden zou betekenen dat de afstand tot huis kleiner wordt. Recht omhoog zou betekenen dat er geen tijd voorbijgaat.',
      },
    },
  },
}

export const GROEPEN_MET_DENKVRAGEN = Object.keys(VRAGEN).map(Number)

export function heeftBlok(groep, blok) {
  return !!VRAGEN[groep]?.[blok]
}

// Alles wat één lesscherm nodig heeft, of null als die les geen denkvraag heeft.
export function denkvraag(groep, blok, les) {
  const v = VRAGEN[groep]?.[blok]?.[les]
  if (!v) return null
  const doelNr = DOEL_VAN_LES[les]
  const doelen = doelenVanBlok(groep, blok)
  return { ...v, les, doelNr, doel: doelen[doelNr - 1] ?? null }
}

export const isHerhalingsles = (les) => DOEL_VAN_LES[les] == null
