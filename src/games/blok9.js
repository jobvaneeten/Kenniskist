// Blok 9 EXTRA — Pluspunt groep 7
// Volledig overgenomen uit de PDF-werkbladen FS en S+.
// hulp = gele uitleg uit het werkblad (getoond bij 💡 knop).

export const BLOK9 = {

  // ═══════════════════════════════════════════════════════════════
  // FS
  // ═══════════════════════════════════════════════════════════════
  FS: {
    key: 'FS',
    label: 'Oefenen FS',
    doelen: [

      // ── DOEL 1 · Rekenmachine ──────────────────────────────────
      {
        nr: 1,
        titel: 'Rekenmachine: verhaalsommen',
        rekenmachine: true,
        hulp: 'Kijk naar wat je weet.\nBedenk:\n– wat je eerst gaat doen\n– hoe je rekent: optellen, aftrekken, vermenigvuldigen of delen\nToets de som in op je rekenmachine.',
        opgaven: [
          {
            nr: 1,
            intro: 'Vul de tabel in. Tel mannen + vrouwen + kinderen op.',
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
            intro: 'Welke som hoort erbij? Reken elk bedrag uit en tel daarna op.',
            vragen: [
              { vraag: 'shirt: 5 × € 24,95 =', antwoord: '124,75' },
              { vraag: 'foto: 9 × € 7,45 =', antwoord: '67,05' },
              { vraag: 'beker: 3 × € 5,75 =', antwoord: '17,25' },
              { vraag: 'totaal: 124,75 + 67,05 + 17,25 =', antwoord: '209,05' },
            ],
          },
          {
            nr: 3,
            intro: 'Welke som hoort erbij? Reken uit.',
            vragen: [
              { vraag: '1 kaartje kost € 8,85. Wat kosten 14 kaartjes samen? (14 × 8,85)', antwoord: '123,90' },
              { vraag: 'In 1 week rijdt een bus 2198 km. Hoeveel km per dag? (2198 : 7)', antwoord: '314' },
            ],
          },
          {
            nr: 4,
            intro: 'Welke som hoort erbij? Reken elk bedrag uit en tel daarna op.',
            vragen: [
              { vraag: 'handdoek: 8 × € 7,85 =', antwoord: '62,80' },
              { vraag: 'glas: 3 × € 5,50 =', antwoord: '16,50' },
              { vraag: 'vlaggetje: 6 × € 3,75 =', antwoord: '22,50' },
              { vraag: 'totaal: 62,80 + 16,50 + 22,50 =', antwoord: '101,80' },
            ],
          },
          {
            nr: 5,
            intro: 'Welke som hoort erbij? Reken uit. Rond af naar beneden.',
            vragen: [
              { vraag: 'Een pen kost € 1,95. Hoeveel pennen kun je kopen voor € 20? (20 : 1,95, afronden naar beneden)', antwoord: '10' },
              { vraag: 'Toegang dierentuin € 18,45 per persoon. Hoeveel personen voor € 150? (150 : 18,45, afronden naar beneden)', antwoord: '8' },
            ],
          },
        ],
      },

      // ── DOEL 2A · Breuken vermenigvuldigen ─────────────────────
      {
        nr: 2,
        titel: 'Breuken: heel getal × breuk',
        hulp: 'Vermenigvuldig de teller met het hele getal.\nBijvoorbeeld: 3 × 3/4 = 9/4 = 2 1/4.\nSchrijf de breuk zo klein mogelijk.\nAls de teller groter is dan de noemer: schrijf als gemengd getal (bijv. 2 1/4).',
        opgaven: [
          {
            nr: 1,
            intro: 'Welke som hoort erbij? Schrijf de breuk zo klein mogelijk.',
            vragen: [
              { vraag: 'pizza: 5 × 5/6 = (schrijf als gemengd getal)', antwoord: '4 1/6' },
              { vraag: 'taart: 5 × 5/8 = (schrijf als gemengd getal)', antwoord: '3 1/8' },
            ],
          },
          {
            nr: 2,
            intro: 'Hoeveel liter samen? Reken uit.',
            vragen: [
              { vraag: '3 × 1/5 l = (in liter, als breuk)', antwoord: '3/5' },
              { vraag: '4 × 1/2 l = (in liter)', antwoord: '2' },
              { vraag: '5 × 1 1/3 l = (in liter, als gemengd getal)', antwoord: '6 2/3' },
              { vraag: '6 × 1 1/2 l = (in liter)', antwoord: '9' },
            ],
          },
          {
            nr: 3,
            intro: 'Hoeveel broden? Reken uit.',
            vragen: [
              { vraag: '1/5 stokbrood per tafel. Voor 10 tafels? (in broden)', antwoord: '2' },
              { vraag: '1/5 stokbrood per tafel. Voor 20 tafels? (in broden)', antwoord: '4' },
              { vraag: '1/6 stokbrood per tafel. Voor 18 tafels? (in broden)', antwoord: '3' },
              { vraag: '1/6 stokbrood per tafel. Voor 36 tafels? (in broden)', antwoord: '6' },
            ],
          },
          {
            nr: 4,
            intro: 'Recept voor 1 kom tomatensoep: 1 tomaat, 1/4 l bouillon, 1/5 ui, 2 blikjes. Reken uit.',
            vragen: [
              { vraag: 'Voor 2 kommen: hoeveel tomaten?', antwoord: '2' },
              { vraag: 'Voor 3 kommen: hoeveel tomaten?', antwoord: '3' },
              { vraag: 'Voor 2 kommen: hoeveel liter bouillon? (2 × 1/4)', antwoord: '1/2' },
              { vraag: 'Voor 3 kommen: hoeveel liter bouillon? (3 × 1/4)', antwoord: '3/4' },
              { vraag: 'Voor 4 kommen: hoeveel blikjes tomatenpuree? (4 × 2)', antwoord: '8' },
            ],
          },
          {
            nr: 5,
            intro: 'Recept ananaskwarktaart: 1/4 l slagroom, 1/3 l kwark, 3 blaadjes gelatine, 1/2 blik ananas. Reken uit.',
            vragen: [
              { vraag: 'Voor 2 taarten: hoeveel liter slagroom? (2 × 1/4)', antwoord: '1/2' },
              { vraag: 'Voor 2 taarten: hoeveel blaadjes gelatine? (2 × 3)', antwoord: '6' },
              { vraag: 'Voor 5 taarten: hoeveel blaadjes gelatine? (5 × 3)', antwoord: '15' },
              { vraag: 'Voor 9 taarten: hoeveel liter slagroom? (9 × 1/4 = ... schrijf als gemengd getal)', antwoord: '2 1/4' },
              { vraag: 'Voor 9 taarten: hoeveel blaadjes gelatine? (9 × 3)', antwoord: '27' },
            ],
          },
        ],
      },

      // ── DOEL 2B · Omtrek en oppervlakte ────────────────────────
      {
        nr: 3,
        titel: 'Omtrek en oppervlakte',
        hulp: 'Verdeel de figuur in rechthoeken.\nBereken de oppervlakte van elk deel.\nTel de oppervlakten op.\nVoorbeeld: oppervlakte A (2×2=4) + oppervlakte B (2×5=10) = 14 cm².\nOmtrek = alle zijden bij elkaar optellen.',
        opgaven: [
          {
            nr: 1,
            intro: 'Reken de oppervlakte uit. Verdeel de figuren eerst in rechthoeken.',
            vragen: [
              { vraag: 'Figuur A+B: oppervlakte A = 2×2 cm², oppervlakte B = 2×5 cm². Wat is de totale oppervlakte?', antwoord: '14' },
              { vraag: 'Figuur A+B+C: opp. A = 4×3, opp. B = 5×2, opp. C = 2×3. Wat is de totale oppervlakte (in cm²)?', antwoord: '28' },
            ],
          },
          {
            nr: 2,
            intro: 'Reken de oppervlakte uit. Figuur met een gat erin.',
            vragen: [
              { vraag: 'Heel figuur 6×6 cm, gat 4×2 cm. Oppervlakte = geheel − gat (in cm²)?', antwoord: '28' },
            ],
          },
          {
            nr: 4,
            intro: 'Reken de omtrek en oppervlakte uit.',
            vragen: [
              { vraag: 'Figuur 1: omtrek (zijden: 5,2,2,1,3,2,5,3 m) =', antwoord: '23' },
              { vraag: 'Figuur 1: oppervlakte (splits in 2 rechthoeken: 5×3 en 2×2 = 15+4) =', antwoord: '19' },
              { vraag: 'Figuur 2: omtrek (zijden: 3,2,3,3,4,2,8,3 m) =', antwoord: '28' },
              { vraag: 'Figuur 2: oppervlakte (splits in rechthoeken, zie 💡 hulp) =', antwoord: '31' },
            ],
          },
          {
            nr: 5,
            intro: 'Grasveld 4×4 m midden in een tuin van 9×9 m. Om het grasveld komen tegels van 1m².',
            vragen: [
              { vraag: 'Omtrek van het grasveld (4+4+4+4) =', antwoord: '16' },
              { vraag: 'Oppervlakte van het grasveld (4×4) =', antwoord: '16' },
              { vraag: 'Oppervlakte van de hele tuin (9×9) =', antwoord: '81' },
              { vraag: 'Oppervlakte tegels = tuin − grasveld. Hoeveel tegels zijn er nodig?', antwoord: '65' },
            ],
          },
        ],
      },

      // ── DOEL 3 · Kortingspercentages ───────────────────────────
      {
        nr: 4,
        titel: 'Kortingen en percentages',
        hulp: '25% korting op €60:\n25% = 1/4 deel\n1/4 × €60 = €15 korting\nNieuwe prijs: €60 − €15 = €45\n\n50% = helft, 25% = kwart, 10% = tiende, 20% = vijfde.\n\nPercentage méér: 20% meer van 300g = 1/5 × 300 = 60g extra → 360g',
        opgaven: [
          {
            nr: 1,
            intro: '50% korting op broeken, 25% korting op jassen. Bereken de nieuwe prijs.',
            vragen: [
              { vraag: 'Broek €90, 50% korting. Korting in euro\'s =', antwoord: '45' },
              { vraag: 'Broek €90, 50% korting. Nieuwe prijs =', antwoord: '45' },
              { vraag: 'Broek €48, 50% korting. Nieuwe prijs =', antwoord: '24' },
              { vraag: 'Jas €60, 25% korting. Korting in euro\'s =', antwoord: '15' },
              { vraag: 'Jas €60, 25% korting. Nieuwe prijs =', antwoord: '45' },
              { vraag: 'Jas €120, 25% korting. Nieuwe prijs =', antwoord: '90' },
            ],
          },
          {
            nr: 3,
            intro: 'Bereken de nieuwe hoeveelheid (meer dan 100%).',
            vragen: [
              { vraag: '300 g, nu 20% meer. Extra hoeveel gram? (1/5 × 300)', antwoord: '60' },
              { vraag: '300 g + 20% meer. Nieuwe hoeveelheid =', antwoord: '360' },
              { vraag: '180 g, nu 10% meer. Extra hoeveel gram? (1/10 × 180)', antwoord: '18' },
              { vraag: '180 g + 10% meer. Nieuwe hoeveelheid =', antwoord: '198' },
            ],
          },
          {
            nr: 4,
            intro: 'Wat wordt de nieuwe prijs?',
            vragen: [
              { vraag: '€140, 25% korting. Korting = 1/4 × 140 =', antwoord: '35' },
              { vraag: '€140, 25% korting. Nieuwe prijs =', antwoord: '105' },
              { vraag: '€560, 20% korting. Korting = 1/5 × 560 =', antwoord: '112' },
              { vraag: '€560, 20% korting. Nieuwe prijs =', antwoord: '448' },
            ],
          },
          {
            nr: 5,
            intro: 'Wat is het voordeel en de nieuwe prijs?',
            vragen: [
              { vraag: '€450, 50% korting. Voordeel =', antwoord: '225' },
              { vraag: '€450, 50% korting. Nieuwe prijs =', antwoord: '225' },
              { vraag: '€80, 10% korting. Nieuwe prijs =', antwoord: '72' },
              { vraag: '€100, 5% korting. Nieuwe prijs =', antwoord: '95' },
              { vraag: '€160, 25% korting. Nieuwe prijs =', antwoord: '120' },
            ],
          },
        ],
      },

      // ── DOEL 4A · Gewichten ─────────────────────────────────────
      {
        nr: 5,
        titel: 'Gewichten omrekenen en prijzen',
        hulp: '1 kg = 1000 g\n1 g = 1000 mg\n1 hg = 100 g\n1 ton = 1000 kg\n1 pond = 500 g\n1 ons = 100 g\n\nPrijzen: gebruik verhoudingen.\n1 kg voor €2,20 → 600 g kost: 600/1000 × 220 cent = 132 cent = €1,32',
        opgaven: [
          {
            nr: 1,
            intro: 'Reken om naar de andere maat.',
            vragen: [
              { vraag: '4,9 kg = ... g', antwoord: '4900' },
              { vraag: '36 kg = ... g', antwoord: '36000' },
              { vraag: '0,872 kg = ... g', antwoord: '872' },
              { vraag: '70.000 g = ... kg', antwoord: '70' },
              { vraag: '1400 g = ... kg', antwoord: '1,4' },
              { vraag: '650 g = ... kg', antwoord: '0,65' },
              { vraag: '56 g = ... mg', antwoord: '56000' },
              { vraag: '9 g = ... mg', antwoord: '9000' },
              { vraag: '28.000 mg = ... g', antwoord: '28' },
              { vraag: '1200 mg = ... g', antwoord: '1,2' },
            ],
          },
          {
            nr: 2,
            intro: 'Hoeveel weegt het? Schrijf het gewicht in kg én gram.',
            vragen: [
              { vraag: '3,5 kg = 3 kg en ... g', antwoord: '500' },
              { vraag: '4,125 kg = 4 kg en ... g', antwoord: '125' },
              { vraag: '0,750 kg = 0 kg en ... g', antwoord: '750' },
              { vraag: '6,450 kg = 6 kg en ... g', antwoord: '450' },
            ],
          },
          {
            nr: 3,
            intro: 'Hoeveel kost het?',
            vragen: [
              { vraag: '1 kg kiwi\'s kost €4,00. Hoeveel kosten 750 g? (in euro\'s)', antwoord: '3' },
              { vraag: '1 kg peren kost €3,50. Hoeveel kosten 400 g? (in euro\'s)', antwoord: '1,40' },
            ],
          },
          {
            nr: 4,
            intro: 'Hoeveel kost het?',
            vragen: [
              { vraag: '1 kg appels €3,50 → 500 g kost', antwoord: '1,75' },
              { vraag: '1 kg appels €3,50 → 2 kg kost', antwoord: '7' },
              { vraag: '1 kg kaas €18,20 → 500 g kost', antwoord: '9,10' },
              { vraag: '1 kg kaas €18,20 → 2 kg kost', antwoord: '36,40' },
              { vraag: 'Kipsaté: 200 g voor €1,80 → 1 kg kost', antwoord: '9' },
            ],
          },
          {
            nr: 5,
            intro: 'Wat is het zwaarst? Typ het zwaarste getal met eenheid.',
            vragen: [
              { vraag: '0,4 kg of 350 g — welke is zwaarder? (0,4 kg = 400 g)', antwoord: '0,4 kg' },
              { vraag: '2 ton of 2500 kg — welke is zwaarder? (1 ton = 1000 kg)', antwoord: '2 ton' },
              { vraag: '4 hg of 0,3 kg — welke is zwaarder? (4 hg = 400 g, 0,3 kg = 300 g)', antwoord: '4 hg' },
              { vraag: '600 g of 0,7 kg — welke is zwaarder?', antwoord: '0,7 kg' },
              { vraag: '0,25 kg of 200 g — welke is zwaarder? (0,25 kg = 250 g)', antwoord: '0,25 kg' },
            ],
          },
          {
            nr: 6,
            intro: 'Vul het gewicht in.',
            vragen: [
              { vraag: '1 kg appels €2,60 → 1500 g appels kost €', antwoord: '3,90' },
              { vraag: '500 g kipfilet €4,50 → 750 g kipfilet kost €', antwoord: '6,75' },
              { vraag: '½ kg kaas €6,60 → 125 g kaas kost €', antwoord: '1,65' },
              { vraag: '6 avocado\'s kosten €11,70 → 1 avocado kost €', antwoord: '1,95' },
            ],
          },
        ],
      },

      // ── DOEL 4B · Vermenigvuldigen ──────────────────────────────
      {
        nr: 6,
        titel: 'Cijferend vermenigvuldigen',
        hulp: 'Splits: 22 × 53 = (20 × 53) + (2 × 53) = 1060 + 106 = 1166\n\nOf cijferend:\n  53\n×22\n 106  (2 × 53)\n1060  (20 × 53, schrijf een 0 vooraan)\n1166  (optellen)\n\nKeer om als het makkelijker is: 3 × 247 = 247 × 3.',
        opgaven: [
          {
            nr: 1,
            intro: 'Reken uit. Eerst met splitsen, dan ×10.',
            vragen: [
              { vraag: '2 × 54 =', antwoord: '108' },
              { vraag: '20 × 54 =', antwoord: '1080' },
              { vraag: '3 × 72 =', antwoord: '216' },
              { vraag: '30 × 72 =', antwoord: '2160' },
              { vraag: '6 × 37 =', antwoord: '222' },
              { vraag: '60 × 37 =', antwoord: '2220' },
              { vraag: '4 × 28 =', antwoord: '112' },
              { vraag: '5 × 45 =', antwoord: '225' },
              { vraag: '3 × 63 =', antwoord: '189' },
              { vraag: '2 × 66 =', antwoord: '132' },
            ],
          },
          {
            nr: 2,
            intro: 'Welke som hoort erbij? Reken uit.',
            vragen: [
              { vraag: 'Op een rij 56 tegels, 14 rijen. Hoeveel tegels? (14 × 56)', antwoord: '784' },
              { vraag: 'Op een rij 72 tegels, 12 rijen. Hoeveel tegels? (12 × 72)', antwoord: '864' },
            ],
          },
          {
            nr: 3,
            intro: 'Reken uit met splitsen of cijferen.',
            vragen: [
              { vraag: '73 × 14 =', antwoord: '1022' },
              { vraag: '59 × 15 =', antwoord: '885' },
              { vraag: '64 × 11 =', antwoord: '704' },
              { vraag: '37 × 12 =', antwoord: '444' },
              { vraag: '46 × 17 =', antwoord: '782' },
              { vraag: '85 × 18 =', antwoord: '1530' },
            ],
          },
          {
            nr: 4,
            intro: 'Reken uit met cijferen.',
            vragen: [
              { vraag: '407 × 3 =', antwoord: '1221' },
              { vraag: '358 × 6 =', antwoord: '2148' },
              { vraag: '283 × 7 =', antwoord: '1981' },
              { vraag: '539 × 8 =', antwoord: '4312' },
              { vraag: '548 × 5 =', antwoord: '2740' },
              { vraag: '767 × 4 =', antwoord: '3068' },
              { vraag: '815 × 9 =', antwoord: '7335' },
              { vraag: '634 × 7 =', antwoord: '4438' },
            ],
          },
          {
            nr: 5,
            intro: 'Reken uit met cijferen (twee-cijferige × drie-cijferige).',
            vragen: [
              { vraag: '632 × 21 =', antwoord: '13272' },
              { vraag: '893 × 32 =', antwoord: '28576' },
              { vraag: '424 × 41 =', antwoord: '17384' },
              { vraag: '563 × 31 =', antwoord: '17453' },
              { vraag: '746 × 64 =', antwoord: '47744' },
            ],
          },
        ],
      },

    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // S+
  // ═══════════════════════════════════════════════════════════════
  Splus: {
    key: 'Splus',
    label: 'Oefenen S+',
    doelen: [

      // ── DOEL 1 · Rekenmachine ──────────────────────────────────
      {
        nr: 1,
        titel: 'Rekenmachine: verhaalsommen',
        rekenmachine: true,
        hulp: 'Kijk naar wat je weet.\nBedenk: wat je eerst gaat doen en welk rekenteken je nodig hebt.\nToets de som stap voor stap in op je rekenmachine.\nAfronden naar beneden: neem het hele getal vóór de komma.\nAfronden naar boven: voeg 1 toe.',
        opgaven: [
          {
            nr: 1,
            intro: 'Welke som hoort erbij? Reken uit.',
            vragen: [
              { vraag: '38 bezoekers betalen samen €948,10. Hoeveel betaalt 1 bezoeker? (948,10 : 38)', antwoord: '24,95' },
              { vraag: '7 boksers wegen samen 504 kg. Hoeveel weegt 1 bokser gemiddeld? (504 : 7)', antwoord: '72' },
              { vraag: 'Pen €1,95. Hoeveel pennen voor €20? (20 : 1,95, afronden naar beneden)', antwoord: '10' },
              { vraag: 'Dierentuin €18,45 per persoon. Hoeveel personen voor €150? (afronden naar beneden)', antwoord: '8' },
            ],
          },
          {
            nr: 2,
            intro: 'Vul de tabel verder in. Tel de weekverkopen per dag op.',
            vragen: [
              { vraag: 'ma: 536 + 469 + 157 =', antwoord: '1162' },
              { vraag: 'di: 185 + 370 + 496 =', antwoord: '1051' },
              { vraag: 'wo: 260 + 451 + 512 =', antwoord: '1223' },
              { vraag: 'do: 113 + 304 + 348 =', antwoord: '765' },
              { vraag: 'vr: 553 + 276 + 495 =', antwoord: '1324' },
              { vraag: 'za: 287 + 323 + 637 =', antwoord: '1247' },
              { vraag: 'zo: 423 + 378 + 273 =', antwoord: '1074' },
            ],
          },
          {
            nr: 3,
            intro: 'Welke som hoort erbij? Reken uit.',
            vragen: [
              { vraag: 'In een treintje gaan 46 kinderen. 368 kinderen wachten. Hoeveel treintjes nodig? (368 : 46, afronden naar boven)', antwoord: '8' },
              { vraag: '27 bezoekers betalen samen €371,25. Hoeveel per bezoeker? (371,25 : 27)', antwoord: '13,75' },
              { vraag: 'In 2019: 401.185 voetgangers. In 2018 waren dat 42.137 méér. Hoeveel in 2018? (401185 + 42137)', antwoord: '443322' },
              { vraag: 'Museumentree €23,75. Hoeveel volwassenen voor €997,50? (997,50 : 23,75)', antwoord: '42' },
            ],
          },
          {
            nr: 4,
            intro: 'Welke som hoort erbij? Reken uit.',
            vragen: [
              { vraag: 'Stoelen in rijen van 38. Hoeveel rijen voor 984 toeschouwers? (984 : 38, afronden naar boven)', antwoord: '26' },
              { vraag: '219 bezoekers betalen samen €5245,05. Hoeveel kost 1 maaltijd? (5245,05 : 219)', antwoord: '23,95' },
              { vraag: 'Auto tankt 44 l, rijdt 616 km. Hoeveel km per liter? (616 : 44)', antwoord: '14' },
              { vraag: '1 shirt €39,95. Hoeveel shirts voor bijna €1200? (1200 : 39,95, afronden naar beneden)', antwoord: '30' },
            ],
          },
          {
            nr: 5,
            intro: 'Reken de kassabon uit.',
            vragen: [
              { vraag: 'Toegang volwassene: 6 × €23,50 =', antwoord: '141' },
              { vraag: 'Toegang 5-15 jaar: 18 × €15,75 =', antwoord: '283,50' },
              { vraag: 'Paraplu: 5 × €12,95 =', antwoord: '64,75' },
              { vraag: 'Totaal: 141 + 283,50 + 64,75 =', antwoord: '489,25' },
            ],
          },
        ],
      },

      // ── DOEL 2A · Breuken ──────────────────────────────────────
      {
        nr: 2,
        titel: 'Breuken: heel getal × breuk',
        hulp: 'Vermenigvuldig de teller met het hele getal.\n3 × 4/5 = 12/5 = 2 2/5\n\nMet splitsen: 3 × 4 2/3 = (3 × 4) + (3 × 2/3) = 12 + 2 = 14\n\nSchrijf de breuk zo klein mogelijk (vereenvoudigen).\n2/4 = 1/2 · 3/6 = 1/2 · 4/8 = 1/2',
        opgaven: [
          {
            nr: 1,
            intro: 'Recept ananaskwarktaart: 1/4 l slagroom, 3 blaadjes gelatine, 3/4 pak lange vingers, 3/5 blik ananas. Reken voor 2, 5 en 9 taarten uit.',
            vragen: [
              { vraag: 'Voor 2 taarten: blaadjes gelatine (2 × 3)', antwoord: '6' },
              { vraag: 'Voor 2 taarten: liter slagroom (2 × 1/4 = schrijf als breuk)', antwoord: '1/2' },
              { vraag: 'Voor 5 taarten: blaadjes gelatine (5 × 3)', antwoord: '15' },
              { vraag: 'Voor 9 taarten: blaadjes gelatine (9 × 3)', antwoord: '27' },
              { vraag: 'Voor 9 taarten: liter slagroom (9 × 1/4 = ... gemengd getal)', antwoord: '2 1/4' },
            ],
          },
          {
            nr: 2,
            intro: 'Reken uit. Schrijf de breuk zo klein mogelijk.',
            vragen: [
              { vraag: '4 × 3/4 =', antwoord: '3' },
              { vraag: '5 × 2/6 = (vereenvoudig)', antwoord: '1 2/3' },
              { vraag: '8 × 1/3 = (als gemengd getal)', antwoord: '2 2/3' },
              { vraag: '6 × 3/10 = (als gemengd getal)', antwoord: '1 4/5' },
              { vraag: '5 × 3/5 =', antwoord: '3' },
              { vraag: '6 × 2/3 =', antwoord: '4' },
              { vraag: '9 × 4/5 = (als gemengd getal)', antwoord: '7 1/5' },
            ],
          },
          {
            nr: 3,
            intro: 'Reken uit met splitsen. Schrijf de breuk zo klein mogelijk.',
            vragen: [
              { vraag: '3 × 1 1/4 = (als gemengd getal)', antwoord: '3 3/4' },
              { vraag: '5 × 3 2/5 = (als gemengd getal)', antwoord: '17' },
              { vraag: '2 × 2 4/5 = (als gemengd getal)', antwoord: '5 3/5' },
              { vraag: '18 × 2 2/3 =', antwoord: '48' },
            ],
          },
        ],
      },

      // ── DOEL 2B · Oppervlakte ───────────────────────────────────
      {
        nr: 3,
        titel: 'Omtrek en oppervlakte',
        hulp: 'Verdeel de figuur in rechthoeken.\nBereken de oppervlakte van elk deel.\nTel de oppervlakten op.\n\nFiguur met gat:\nOppervlakte = heel figuur − gat\nVoorbeeld: 6×6 − 4×2 = 36 − 8 = 28 cm²\n\nOmtrek = alle zijden bij elkaar optellen.',
        opgaven: [
          {
            nr: 1,
            intro: 'Reken de oppervlakte uit. Verdeel de figuren eerst in rechthoeken.',
            vragen: [
              { vraag: 'Figuur A+B: opp. A = 2×2=4 cm², opp. B = 2×5=10 cm². Totaal?', antwoord: '14' },
              { vraag: 'Figuur A+B+C: opp. A = 4×3=12, opp. B = 5×2=10, opp. C = 2×3=6. Totaal (in cm²)?', antwoord: '28' },
            ],
          },
          {
            nr: 2,
            intro: 'Reken de oppervlakte uit. Figuur met een gat erin.',
            vragen: [
              { vraag: 'Heel figuur 6×6 cm, gat 4×2 cm. Oppervlakte (in cm²) =', antwoord: '28' },
            ],
          },
          {
            nr: 4,
            intro: 'Reken de omtrek en oppervlakte uit.',
            vragen: [
              { vraag: 'Figuur 1: omtrek (zijden 5,2,2,1,3,2,5,3 m) =', antwoord: '23' },
              { vraag: 'Figuur 1: oppervlakte (in m²) =', antwoord: '19' },
              { vraag: 'Figuur 2: omtrek (zijden 3,2,3,3,4,2,8,3 m) =', antwoord: '28' },
              { vraag: 'Figuur 2: oppervlakte (in m²) =', antwoord: '31' },
            ],
          },
          {
            nr: 5,
            intro: 'Grasveld 4×4 m midden in een tuin van 9×9 m. Rondom komen tegels van 1 m².',
            vragen: [
              { vraag: 'Oppervlakte grasveld (4×4) =', antwoord: '16' },
              { vraag: 'Oppervlakte hele tuin (9×9) =', antwoord: '81' },
              { vraag: 'Hoeveel tegels zijn er nodig? (81 − 16)', antwoord: '65' },
            ],
          },
        ],
      },

      // ── DOEL 3 · Kortingen ──────────────────────────────────────
      {
        nr: 4,
        titel: 'Kortingen en percentages',
        hulp: '25% korting op €60 = 1/4 × 60 = €15 korting → nieuwe prijs €45\n50% = helft · 10% = tiende · 5% = twintigste · 20% = vijfde · 12½% = 1/8\n\nPercentage méér:\n20% meer van 500 g = 1/5 × 500 = 100 g extra → 600 g\n\nKortingspercentage uitrekenen:\nKorting = oude prijs − nieuwe prijs\nKorting als % = korting / oude prijs × 100',
        opgaven: [
          {
            nr: 1,
            intro: 'Wat is het voordeel en de nieuwe prijs?',
            vragen: [
              { vraag: 'Prijs €450, 50% korting. Voordeel =', antwoord: '225' },
              { vraag: 'Prijs €450, 50% korting. Nieuwe prijs =', antwoord: '225' },
              { vraag: 'Prijs €80, 10% korting. Voordeel =', antwoord: '8' },
              { vraag: 'Prijs €80, 10% korting. Nieuwe prijs =', antwoord: '72' },
              { vraag: 'Prijs €100, 5% korting. Nieuwe prijs =', antwoord: '95' },
              { vraag: 'Prijs €160, 25% korting. Nieuwe prijs =', antwoord: '120' },
            ],
          },
          {
            nr: 2,
            intro: 'Bereken de nieuwe hoeveelheid.',
            vragen: [
              { vraag: '500 g, nu 20% meer. Extra hoeveel gram? (1/5 × 500)', antwoord: '100' },
              { vraag: '500 g + 20% meer. Nieuwe hoeveelheid =', antwoord: '600' },
              { vraag: '450 g, nu 50% meer. Extra hoeveel gram? (1/2 × 450)', antwoord: '225' },
              { vraag: '450 g + 50% meer. Nieuwe hoeveelheid =', antwoord: '675' },
            ],
          },
          {
            nr: 3,
            intro: 'Wat wordt de nieuwe prijs? Of hoeveel procent korting?',
            vragen: [
              { vraag: '€120, 12,5% korting (1/8 × 120 = 15). Nieuwe prijs =', antwoord: '105' },
              { vraag: 'Oude prijs €520, nieuwe prijs €416. Hoeveel procent korting? (korting = 104, 104/520 × 100)', antwoord: '20' },
            ],
          },
          {
            nr: 4,
            intro: 'Bereken de nieuwe hoeveelheid.',
            vragen: [
              { vraag: '375 g, nu 20% meer. Nieuwe hoeveelheid =', antwoord: '450' },
              { vraag: '280 g, nu 25% meer. Nieuwe hoeveelheid =', antwoord: '350' },
            ],
          },
          {
            nr: 5,
            intro: 'Vul in: bereken de oude prijs op basis van de korting.',
            vragen: [
              { vraag: 'Korting €24, dat is 40% van de oude prijs. Oude prijs =', antwoord: '60' },
              { vraag: 'Korting €6, dat is 25% van de oude prijs. Oude prijs =', antwoord: '24' },
              { vraag: 'Korting €48, dat is 60% van de oude prijs. Oude prijs =', antwoord: '80' },
            ],
          },
        ],
      },

      // ── DOEL 4A · Gewichten ──────────────────────────────────────
      {
        nr: 5,
        titel: 'Gewichten omrekenen en prijzen',
        hulp: '1 kg = 1000 g · 1 g = 1000 mg · 1 hg = 100 g · 1 dag = 10 g\n1 ton = 1000 kg · 1 pond = 500 g · 1 ons = 100 g\n\nVolgorde licht → zwaar:\nmg → cg → dg → g → dag → hg → kg → ton\n\nPrijzen: stel een verhouding op.\n1 kg @€3,40 → 750 g kost 750/1000 × €3,40 = €2,55',
        opgaven: [
          {
            nr: 1,
            intro: 'Wat is het zwaarst? Typ de zwaarste met eenheid.',
            vragen: [
              { vraag: '0,4 kg of 350 g — zwaarste is?', antwoord: '0,4 kg' },
              { vraag: '2 ton of 2500 kg — zwaarste is?', antwoord: '2 ton' },
              { vraag: '4 hg of 0,3 kg — zwaarste is? (4 hg = 400 g)', antwoord: '4 hg' },
              { vraag: '600 g of 0,7 kg — zwaarste is?', antwoord: '0,7 kg' },
              { vraag: '0,25 kg of 200 g — zwaarste is?', antwoord: '0,25 kg' },
            ],
          },
          {
            nr: 2,
            intro: 'Vul het bedrag in.',
            vragen: [
              { vraag: '1 kg appels €2,60. 1500 g appels kost €', antwoord: '3,90' },
              { vraag: '500 g kipfilet €4,50. 750 g kipfilet kost €', antwoord: '6,75' },
              { vraag: '½ kg kaas €6,60. 125 g kaas kost €', antwoord: '1,65' },
              { vraag: '6 avocado\'s kosten €11,70. Prijs per avocado = €', antwoord: '1,95' },
            ],
          },
          {
            nr: 3,
            intro: 'Reken om naar de andere maat.',
            vragen: [
              { vraag: '25,679 kg = ... g', antwoord: '25679' },
              { vraag: '398 g = ... kg', antwoord: '0,398' },
              { vraag: '9 g = ... kg', antwoord: '0,009' },
              { vraag: '7575 g = ... kg', antwoord: '7,575' },
              { vraag: '4 mg = ... g', antwoord: '0,004' },
            ],
          },
          {
            nr: 4,
            intro: 'Hoeveel kost het?',
            vragen: [
              { vraag: '1 kg appels €3,40. 750 g kost €', antwoord: '2,55' },
              { vraag: '1 kg appels €3,40. 2,5 kg kost €', antwoord: '8,50' },
              { vraag: '1 kg kaas €18. 400 g kost €', antwoord: '7,20' },
              { vraag: '1 kg kaas €18. 1,5 kg kost €', antwoord: '27' },
              { vraag: 'Kipsaté: 300 g voor €1,35. 1 kg kost €', antwoord: '4,50' },
            ],
          },
          {
            nr: 6,
            intro: 'Schrijf de gewichten op volgorde van licht naar zwaar. Geef het rangnummer.',
            vragen: [
              { vraag: 'Rangschik van licht naar zwaar. Wat is het lichtste? (45 mg, 2500 mg, 450 cg, 6500 mg, 1,5 dag, 25 g, 250 g, 5,5 hg, 4,5 kg, 450 hg)', antwoord: '45 mg' },
              { vraag: 'Wat staat op positie 2? (na 45 mg)', antwoord: '2500 mg' },
              { vraag: 'Wat staat op positie 3?', antwoord: '450 cg' },
              { vraag: 'Wat is het zwaarste?', antwoord: '450 hg' },
            ],
          },
        ],
      },

      // ── DOEL 4B · Vermenigvuldigen ──────────────────────────────
      {
        nr: 6,
        titel: 'Cijferend vermenigvuldigen',
        hulp: 'Cijferend vermenigvuldigen:\n  47\n×36\n 282  (6 × 47)\n1410  (30 × 47, schrijf eerst een 0)\n1692  (optellen)\n\nKeer om als het makkelijker is.\nControleer of je antwoord klopt met een schatting.',
        opgaven: [
          {
            nr: 1,
            intro: 'Welke som hoort erbij? Reken uit.',
            vragen: [
              { vraag: '68 tegels per rij, 15 rijen. Hoeveel tegels? (15 × 68)', antwoord: '1020' },
              { vraag: '57 tegels per rij, 13 rijen. Hoeveel tegels? (13 × 57)', antwoord: '741' },
            ],
          },
          {
            nr: 2,
            intro: 'Reken uit met cijferen.',
            vragen: [
              { vraag: '39 × 15 =', antwoord: '585' },
              { vraag: '85 × 16 =', antwoord: '1360' },
              { vraag: '18 × 68 =', antwoord: '1224' },
              { vraag: '56 × 13 =', antwoord: '728' },
              { vraag: '14 × 98 =', antwoord: '1372' },
            ],
          },
          {
            nr: 3,
            intro: 'Reken uit met cijferen.',
            vragen: [
              { vraag: '76 × 33 =', antwoord: '2508' },
              { vraag: '28 × 22 =', antwoord: '616' },
              { vraag: '47 × 44 =', antwoord: '2068' },
              { vraag: '65 × 55 =', antwoord: '3575' },
              { vraag: '87 × 66 =', antwoord: '5742' },
            ],
          },
          {
            nr: 4,
            intro: 'Welke som hoort erbij? Reken uit.',
            vragen: [
              { vraag: 'Internet €38 per maand, 2 jaar abonnement. Totale kosten? (24 × 38)', antwoord: '912' },
              { vraag: 'Sportschool €55 per maand, 3 jaar. Totale kosten? (36 × 55)', antwoord: '1980' },
            ],
          },
          {
            nr: 5,
            intro: 'Reken uit met cijferen.',
            vragen: [
              { vraag: '76 × 35 =', antwoord: '2660' },
              { vraag: '82 × 67 =', antwoord: '5494' },
              { vraag: '93 × 29 =', antwoord: '2697' },
              { vraag: '69 × 46 =', antwoord: '3174' },
              { vraag: '53 × 57 =', antwoord: '3021' },
            ],
          },
        ],
      },

    ],
  },
}
