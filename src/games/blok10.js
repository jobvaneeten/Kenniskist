// Blok 10 EXTRA — Pluspunt groep 7
// Overgenomen uit de PDF-werkbladen (antwoordbladen) FS en S+.
// Het rode in het werkblad = het antwoord. hulp = uitleg uit het werkblad.

// ── Werkblad-screenshots met invulvakken (x,y,w,h = fractie van de afbeelding) ──
// De afbeelding is het echte werkblad; de rode antwoorden zijn weggehaald en de
// invulvakjes (a = juiste antwoord) staan op de plek van het rode antwoord.

// Doel 3 — "Wat was de temperatuur?" (lijndiagram). Per opgave een uitgesneden
// stukje van de pagina. Zelfde werkblad voor FS en S+.
const TEMP_TABEL = {
  img: '/blok10/d3_temp.png',
  crop: [0.06, 0.115, 0.95, 0.49],   // grafiek + tabel
  intro: 'Wat was de temperatuur? Lees af in de grafiek en vul de tabel in (hoogste links, laagste rechts).',
  boxes: [
    { x: 0.718, y: 0.286, w: 0.052, h: 0.020, a: '11' }, { x: 0.860, y: 0.286, w: 0.046, h: 0.020, a: '5' },
    { x: 0.718, y: 0.313, w: 0.052, h: 0.020, a: '9' },  { x: 0.860, y: 0.313, w: 0.046, h: 0.020, a: '6' },
    { x: 0.718, y: 0.339, w: 0.052, h: 0.020, a: '12' }, { x: 0.860, y: 0.339, w: 0.046, h: 0.020, a: '8' },
    { x: 0.718, y: 0.366, w: 0.052, h: 0.020, a: '11' }, { x: 0.860, y: 0.366, w: 0.046, h: 0.020, a: '4' },
    { x: 0.718, y: 0.393, w: 0.052, h: 0.020, a: '6' },  { x: 0.860, y: 0.393, w: 0.046, h: 0.020, a: '0' },
    { x: 0.718, y: 0.420, w: 0.052, h: 0.020, a: '3' },  { x: 0.860, y: 0.420, w: 0.046, h: 0.020, a: '-1' },
    { x: 0.718, y: 0.447, w: 0.052, h: 0.020, a: '-2' }, { x: 0.860, y: 0.447, w: 0.046, h: 0.020, a: '-3' },
  ],
}
const TEMP_VRAGEN = {
  img: '/blok10/d3_temp.png',
  crop: [0.06, 0.115, 0.95, 0.865],   // grafiek + tabel ÉN de leesvragen (je hebt de grafiek nodig)
  intro: 'Beantwoord de vragen bij de grafiek. Vul de juiste dag of temperatuur in.',
  boxes: [
    { x: 0.495, y: 0.552, w: 0.090, h: 0.018, a: 'woensdag' },
    { x: 0.205, y: 0.604, w: 0.090, h: 0.018, a: 'zaterdag' }, { x: 0.392, y: 0.605, w: 0.075, h: 0.018, a: 'zondag' },
    { x: 0.214, y: 0.659, w: 0.085, h: 0.018, a: 'zondag' },
    { x: 0.174, y: 0.709, w: 0.085, h: 0.018, a: 'dinsdag' }, { x: 0.314, y: 0.712, w: 0.090, h: 0.018, a: 'woensdag' },
    { x: 0.135, y: 0.762, w: 0.055, h: 0.018, a: '-3' },
    { x: 0.190, y: 0.819, w: 0.090, h: 0.018, a: 'maandag' }, { x: 0.330, y: 0.816, w: 0.095, h: 0.018, a: 'donderdag' },
  ],
}

const VERHAAL = {
  img: '/blok10/d3_verhaal.png',
  crop: [0.04, 0.115, 0.97, 0.745],
  intro: 'Welk verhaaltje hoort bij welk diagram? Kies het juiste diagram (1 of 2).',
  boxes: [
    { x: 0.358, y: 0.667, w: 0.05, h: 0.026, a: '1', opts: ['1', '2'] },
    { x: 0.360, y: 0.693, w: 0.05, h: 0.026, a: '2', opts: ['1', '2'] },
  ],
}
const EIEREN = {
  img: '/blok10/d3_eieren.png',
  crop: [0.04, 0.13, 0.97, 0.655],
  intro: 'Lees het beelddiagram af. Vul de vragen eronder in (1 figuurtje = 10 eieren).',
  boxes: [
    { x: 0.414, y: 0.553, w: 0.046, h: 0.024, a: '35' }, { x: 0.569, y: 0.553, w: 0.046, h: 0.024, a: '30' },
    { x: 0.402, y: 0.580, w: 0.046, h: 0.024, a: '35' }, { x: 0.585, y: 0.580, w: 0.046, h: 0.024, a: '50' },
    { x: 0.598, y: 0.606, w: 0.058, h: 0.024, a: '215' },
  ],
}
// Teken-/kleuropgaven: je tekent zelf op het werkblad (niet nagekeken).
const BIJEN = {
  img: '/blok10/d3_eieren.png', teken: true,
  crop: [0.04, 0.72, 0.97, 0.965],
  intro: 'Maak een beelddiagram. Er leven 45.000 bijen in 1 kast. Teken zelf de figuurtjes (1 figuurtje = 5000 bijen).',
}
const KLEUR_FS = {
  img: '/blok10/d5_kleur_fs.png', teken: true,
  crop: [0.04, 0.40, 0.97, 0.59],
  intro: 'Kleur de aanzichten van het blokkenbouwsel. Kijk bij opgave 1.',
}
const KLEUR_SP = {
  img: '/blok10/d5_kleur_sp.png', teken: true,
  crop: [0.04, 0.155, 0.97, 0.40],
  intro: 'Kleur de aanzichten van het blokkenbouwsel.',
}
const TEKENROUTE_FS = {
  img: '/blok10/d5_tekenroute_fs.png', teken: true,
  crop: [0.04, 0.125, 0.47, 0.47],
  intro: 'Teken de kortste route van het kasteel naar de vuurtoren op de kaart.',
}
const TEKENROUTE_SP = {
  img: '/blok10/d5_tekenroute_sp.png', teken: true,
  crop: [0.04, 0.125, 0.47, 0.47],
  intro: 'Teken de kortste route van het kasteel naar de vuurtoren op de kaart.',
}
const RICHTINGEN = ['noorden', 'oosten', 'zuiden', 'westen']
const RICHTING_FS = {
  img: '/blok10/d5_richting_fs.png',
  crop: [0.03, 0.095, 0.985, 0.40],   // opgave 1, iets ruimer uitgesneden
  intro: 'Vanuit welke richting zie je dit? Kies het goede antwoord.',
  boxes: [
    { x: 0.632, y: 0.270, w: 0.135, h: 0.030, a: 'oosten', opts: RICHTINGEN },
    { x: 0.843, y: 0.270, w: 0.135, h: 0.030, a: 'noorden', opts: RICHTINGEN },
  ],
}
const RICHTING_SP = {
  img: '/blok10/d5_richting_sp.png',
  crop: [0.035, 0.43, 0.975, 0.92],    // opgave 2, iets ruimer uitgesneden
  intro: 'Vanuit welke richting zie je dit? Kies het goede antwoord.',
  boxes: [
    { x: 0.195, y: 0.849, w: 0.150, h: 0.030, a: 'oosten', opts: RICHTINGEN },
    { x: 0.625, y: 0.849, w: 0.150, h: 0.030, a: 'noorden', opts: RICHTINGEN },
  ],
}
// Route-opgaven: volg de route op de kaart → kies de bestemming.
const PLEKKEN = ['grote haven', 'stad', 'vuurtoren', 'kasteel', 'museum']
const MATIZ_PLEKKEN = ['pizzeria', 'park', 'fontein', 'school']
const ROUTE_BOOT_FS = {
  img: '/blok10/d5_route_fs.png',
  crop: [0.04, 0.10, 0.97, 0.47],
  intro: 'Volg de route van de boot op de kaart. Waar vaart de boot naartoe? Kies het goede antwoord.',
  boxes: [{ x: 0.600, y: 0.406, w: 0.190, h: 0.032, a: 'stad', opts: PLEKKEN }],
}
const ROUTE_MATIZ_FS = {
  img: '/blok10/d5_route_fs.png',
  crop: [0.04, 0.475, 0.97, 0.745],
  intro: 'Waar loopt Matiz naartoe? Volg de route. Kies het goede antwoord.',
  boxes: [{ x: 0.710, y: 0.663, w: 0.190, h: 0.032, a: 'school', opts: MATIZ_PLEKKEN }],
}
const ROUTE_BOOT_SP = {
  img: '/blok10/d5_route_sp.png',
  crop: [0.04, 0.10, 0.97, 0.47],
  intro: 'Volg de route van de boot op de kaart. Waar vaart de boot naartoe? Kies het goede antwoord.',
  boxes: [{ x: 0.600, y: 0.414, w: 0.190, h: 0.032, a: 'stad', opts: PLEKKEN }],
}
const ROUTE_MATIZ_SP = {
  img: '/blok10/d5_route_sp.png',
  crop: [0.04, 0.475, 0.97, 0.90],
  intro: 'Waar loopt Matiz naartoe? Volg de route. Kies het goede antwoord.',
  boxes: [{ x: 0.140, y: 0.833, w: 0.190, h: 0.032, a: 'school', opts: MATIZ_PLEKKEN }],
}

export const BLOK10 = {

  // ═══════════════════════════════════════════════════════════════
  // FS
  // ═══════════════════════════════════════════════════════════════
  FS: {
    key: 'FS',
    label: 'Oefenen FS',
    doelen: [

      // ── DOEL 1 · Kolomsgewijs delen ────────────────────────────
      {
        nr: 1,
        titel: 'Kolomsgewijs delen (met rest)',
        rekenmachine: false,
        hulp: 'Deel kolomsgewijs in maximaal 3 stappen.\nMaak eerst een tabel: 1× · 2× · 10× · 5× van de deler.\nKijk hoe vaak de deler eraf kan (honderdtallen → tientallen → eenheden).\nHoudt je iets over? Dat is de rest.\nVoorbeeld: 5825 : 23 = 253 rest 6.',
        opgaven: [
          {
            nr: 1,
            intro: 'Schat eerst, reken daarna uit. Reken kolomsgewijs in je schrift.',
            vragen: [
              { vraag: '1218 : 14 =', antwoord: '87' },
              { vraag: '2068 : 22 =', antwoord: '94' },
              { vraag: '2688 : 16 =', antwoord: '168' },
              { vraag: '4290 : 22 =', antwoord: '195' },
              { vraag: '3850 : 14 =', antwoord: '275' },
              { vraag: '5082 : 22 =', antwoord: '231' },
              { vraag: '5404 : 14 =', antwoord: '386' },
              { vraag: '5792 : 16 =', antwoord: '362' },
            ],
          },
          {
            nr: 2,
            intro: 'Welke som hoort erbij? Reken kolomsgewijs uit.',
            vragen: [
              { vraag: '3108 flesjes in kratten van 21. Hoeveel kratten?', antwoord: '148' },
              { vraag: '5418 flesjes in kratten van 21. Hoeveel kratten?', antwoord: '258' },
            ],
          },
          {
            nr: 3,
            intro: 'Reken kolomsgewijs in maximaal 3 stappen. Gebruik de tabel van 24.',
            vragen: [
              { vraag: '8544 : 24 =', antwoord: '356' },
              { vraag: '3912 : 24 =', antwoord: '163' },
              { vraag: '12.768 : 24 =', antwoord: '532' },
            ],
          },
          {
            nr: 4,
            intro: 'Reken kolomsgewijs. Let op de rest (tabel van 13).',
            vragen: [
              { vraag: '3190 : 13 = (met rest)', antwoord: '245 rest 5' },
              { vraag: '5577 : 13 =', antwoord: '429' },
              { vraag: '7724 : 13 = (met rest)', antwoord: '594 rest 2' },
            ],
          },
          {
            nr: 5,
            intro: 'Reken uit. Schat eerst tussen welke honderdtallen het antwoord ligt.',
            vragen: [
              { vraag: '1125 : 15 =', antwoord: '75' },
              { vraag: '4480 : 32 =', antwoord: '140' },
              { vraag: '2080 : 32 =', antwoord: '65' },
              { vraag: '4255 : 23 =', antwoord: '185' },
              { vraag: '3900 : 15 =', antwoord: '260' },
              { vraag: '4922 : 23 =', antwoord: '214' },
              { vraag: '7475 : 23 =', antwoord: '325' },
              { vraag: '4875 : 15 =', antwoord: '325' },
            ],
          },
          {
            nr: 6,
            intro: 'Welke som hoort erbij? Reken kolomsgewijs uit.',
            vragen: [
              { vraag: 'School heeft €5180, excursie €34 per kind. Hoeveel kinderen kunnen mee?', antwoord: '152' },
              { vraag: 'Hoeveel euro blijft er over?', antwoord: '12' },
              { vraag: 'Femke rijdt 7655 km in 23 dagen. Hoeveel km per dag? Rond af op een heel getal.', antwoord: '333' },
            ],
          },
        ],
      },

      // ── DOEL 2 · Kommagetallen × en : ──────────────────────────
      {
        nr: 2,
        titel: 'Vermenigvuldigen en delen met kommagetallen',
        hulp: 'Reken met splitsen.\n7 × €3,70 = (7 × 3) + (7 × 0,70) = 21 + 4,90 = €25,90\nDelen: 40,25 : 5 = (40 : 5) + (0,25 : 5) = 8 + 0,05 = 8,05\nSchrijf de splitsing onder het splitsdakje.',
        opgaven: [
          {
            nr: 1,
            intro: 'Reken uit met splitsen.',
            vragen: [
              { vraag: '5 × €4,60 =', antwoord: '23' },
              { vraag: '7 × €3,70 =', antwoord: '25,90' },
              { vraag: '6 × €2,90 =', antwoord: '17,40' },
              { vraag: '4 × €5,80 =', antwoord: '23,20' },
            ],
          },
          {
            nr: 2,
            intro: 'Reken uit met splitsen (delen).',
            vragen: [
              { vraag: '27,18 : 9 =', antwoord: '3,02' },
              { vraag: '48,64 : 8 =', antwoord: '6,08' },
              { vraag: '35,15 : 5 =', antwoord: '7,03' },
              { vraag: '63,28 : 7 =', antwoord: '9,04' },
            ],
          },
          {
            nr: 3,
            intro: 'Welke som hoort erbij? Reken uit.',
            vragen: [
              { vraag: '32,48 kg peren over 8 kratten. Hoeveel kg per krat?', antwoord: '4,06' },
              { vraag: 'Slak kruipt 18,36 m in 6 uur. Hoeveel m per uur?', antwoord: '3,06' },
            ],
          },
          {
            nr: 4,
            intro: 'Reken uit.',
            vragen: [
              { vraag: '4 × 3,4 km =', antwoord: '13,6' },
              { vraag: '6 × 4,6 km =', antwoord: '27,6' },
              { vraag: '3 × 6,7 km =', antwoord: '20,1' },
              { vraag: '9 × 3,5 km =', antwoord: '31,5' },
              { vraag: '5 × 7,3 km =', antwoord: '36,5' },
              { vraag: '4 × 7,8 kg =', antwoord: '31,2' },
              { vraag: '3 × 17,6 kg =', antwoord: '52,8' },
              { vraag: '7 × 11,3 kg =', antwoord: '79,1' },
              { vraag: '5 × 16,2 kg =', antwoord: '81' },
              { vraag: '8 × 8,25 kg =', antwoord: '66' },
            ],
          },
          {
            nr: 5,
            intro: 'Reken uit (delen).',
            vragen: [
              { vraag: '54,18 : 9 =', antwoord: '6,02' },
              { vraag: '21,9 : 3 =', antwoord: '7,3' },
              { vraag: '36,42 : 6 =', antwoord: '6,07' },
              { vraag: '32,20 : 4 =', antwoord: '8,05' },
              { vraag: '63,49 : 7 =', antwoord: '9,07' },
              { vraag: '40,20 : 5 =', antwoord: '8,04' },
              { vraag: '24,30 : 6 =', antwoord: '4,05' },
              { vraag: '81,54 : 9 =', antwoord: '9,06' },
              { vraag: '36,48 : 4 =', antwoord: '9,12' },
              { vraag: '80,88 : 8 =', antwoord: '10,11' },
            ],
          },
          {
            nr: 6,
            intro: 'Welke som hoort erbij? Reken uit.',
            vragen: [
              { vraag: 'Willem loopt 6 dagen 4,3 km. Hoeveel km per week?', antwoord: '25,8' },
              { vraag: 'Anne verdient €12,10 per week. Hoeveel in 30 weken?', antwoord: '363' },
              { vraag: '1 tas weegt 8,2 kg. Hoeveel wegen 4 tassen?', antwoord: '32,8' },
              { vraag: 'Dylano verdient €15,80 per week. Hoeveel in 40 weken?', antwoord: '632' },
            ],
          },
          {
            nr: 7,
            intro: 'Reken uit.',
            vragen: [
              { vraag: '3 × 7,1 =', antwoord: '21,3' },
              { vraag: '4 × 4,6 =', antwoord: '18,4' },
              { vraag: '7 × 3,4 =', antwoord: '23,8' },
              { vraag: '5 × 6,3 =', antwoord: '31,5' },
              { vraag: '8 × 5,2 =', antwoord: '41,6' },
              { vraag: '9 × 2,5 =', antwoord: '22,5' },
              { vraag: '18 × 2,5 =', antwoord: '45' },
              { vraag: '80 × 0,25 =', antwoord: '20' },
              { vraag: '6 × 12,25 =', antwoord: '73,50' },
              { vraag: '3 × 1,25 =', antwoord: '3,75' },
              { vraag: '20 × 0,75 =', antwoord: '15' },
              { vraag: '60 × 0,5 =', antwoord: '30' },
            ],
          },
        ],
      },

      // ── DOEL 3 · Diagrammen ────────────────────────────────────
      {
        nr: 3,
        titel: 'Lijndiagram en beelddiagram lezen',
        hulp: 'Lijndiagram: de lijn omhoog = stijgt, omlaag = daalt, horizontaal = blijft gelijk.\nLees de waarde af op de verticale as (let op getallen onder nul!).\nBeelddiagram: 1 figuurtje = een vast aantal (bijv. 10). Een half figuurtje = de helft.',
        opgaven: [
          { nr: 1, ...TEMP_TABEL },
          { nr: 2, ...TEMP_VRAGEN },
          { nr: 3, ...VERHAAL },
          { nr: 4, ...EIEREN },
          { nr: 5, ...BIJEN },
        ],
      },

      // ── DOEL 4 · Percentages via 1% ────────────────────────────
      {
        nr: 4,
        titel: 'Percentages via 1%',
        hulp: '1% = het bedrag : 100.\nDaarna: × het percentage.\nVoorbeeld: 7% van €640 → 1% = €6,40 → 7 × 6,40 = €44,80.\nKun je ook handig met een breuk? 25% = 1/4, 50% = 1/2, 10% = 1/10, 20% = 1/5.',
        opgaven: [
          {
            nr: 1,
            intro: 'Reken uit (van €900).',
            vragen: [
              { vraag: '1% van €900 =', antwoord: '9' },
              { vraag: '4% van €900 =', antwoord: '36' },
              { vraag: '8% van €900 =', antwoord: '72' },
              { vraag: '5% van €900 =', antwoord: '45' },
              { vraag: '2% van €900 =', antwoord: '18' },
              { vraag: '10% van €900 =', antwoord: '90' },
              { vraag: '7% van €900 =', antwoord: '63' },
              { vraag: '30% van €900 =', antwoord: '270' },
              { vraag: '6% van €900 =', antwoord: '54' },
            ],
          },
          {
            nr: 2,
            intro: 'Reken uit met een breuk.',
            vragen: [
              { vraag: '10% van €650 =', antwoord: '65' },
              { vraag: '25% van €800 =', antwoord: '200' },
              { vraag: '20% van €250 =', antwoord: '50' },
              { vraag: '25% van €120 =', antwoord: '30' },
              { vraag: '50% van €68 =', antwoord: '34' },
              { vraag: '10% van €8 =', antwoord: '0,80' },
            ],
          },
          {
            nr: 3,
            intro: 'Reken uit.',
            vragen: [
              { vraag: '10% van €400 =', antwoord: '40' },
              { vraag: '20% van €400 =', antwoord: '80' },
              { vraag: '25% van €360 =', antwoord: '90' },
              { vraag: '1% van €120 =', antwoord: '1,20' },
              { vraag: '4% van €800 =', antwoord: '32' },
              { vraag: '30% van €600 =', antwoord: '180' },
              { vraag: '15% van €900 =', antwoord: '135' },
              { vraag: '13% van €400 =', antwoord: '52' },
            ],
          },
          {
            nr: 4,
            intro: 'Reken uit in je schrift.',
            vragen: [
              { vraag: '25% van €2400 =', antwoord: '600' },
              { vraag: '2% van €1400 =', antwoord: '28' },
              { vraag: '5% van €2000 =', antwoord: '100' },
              { vraag: '50% van €900 =', antwoord: '450' },
              { vraag: '60% van €800 =', antwoord: '480' },
              { vraag: '12% van €800 =', antwoord: '96' },
              { vraag: '1% van €7000 =', antwoord: '70' },
              { vraag: '7% van €300 =', antwoord: '21' },
              { vraag: '4% van €400 =', antwoord: '16' },
              { vraag: '10% van €3540 =', antwoord: '354' },
            ],
          },
          {
            nr: 5,
            intro: 'Reken uit (mag met rekenmachine).',
            vragen: [
              { vraag: 'In 350 g jam zit 12% suiker. Hoeveel gram suiker?', antwoord: '42' },
              { vraag: 'In 450 g pindakaas zit 35% vet. Hoeveel gram vet?', antwoord: '157,5' },
              { vraag: 'Tom verdient €3280, krijgt 2,5% erbij. Hoeveel euro meer per maand?', antwoord: '82' },
              { vraag: 'Eileen krijgt €18 zakgeld, dan 15% meer. Hoeveel euro meer?', antwoord: '2,70' },
            ],
          },
          {
            nr: 6,
            intro: 'Reken uit.',
            vragen: [
              { vraag: 'Anton verdient €2600, krijgt 3,5% erbij. Hoeveel euro extra?', antwoord: '91' },
              { vraag: 'Anton: welk bedrag verdient hij dan?', antwoord: '2691' },
              { vraag: 'Jasmijn krijgt €12, dan 15% meer. Hoeveel euro extra?', antwoord: '1,80' },
              { vraag: 'Jasmijn: welk bedrag krijgt zij dan?', antwoord: '13,80' },
            ],
          },
        ],
      },

      // ── DOEL 5 · Windrichtingen en routes ──────────────────────
      {
        nr: 5,
        titel: 'Windrichtingen, standpunten en routes',
        hulp: 'Windrichtingen op de kaart: N (noord) boven, Z (zuid) onder, O (oost) rechts, W (west) links.\nDaartussen: NO, ZO, ZW, NW.\n"Vanuit het oosten kijken" = je staat ten oosten (rechts) en kijkt naar links.',
        opgaven: [
          { nr: 1, ...RICHTING_FS },
          { nr: 2, ...ROUTE_BOOT_FS },
          { nr: 3, ...ROUTE_MATIZ_FS },
          { nr: 4, ...KLEUR_FS },
          { nr: 5, ...TEKENROUTE_FS },
        ],
      },

      // ── DOEL 6 · Schattend rekenen ─────────────────────────────
      {
        nr: 6,
        titel: 'Schattend vermenigvuldigen en delen',
        hulp: 'Rond beide getallen af op een rond getal en reken dan uit.\nVoorbeeld: 18 × 580 ≈ 20 × 600 = 12.000.\n1540 : 32 ≈ 1500 : 30 = 50.\nGeld: maak een makkelijk bedrag (€1,95 ≈ €2,-).',
        opgaven: [
          {
            nr: 1,
            intro: 'Schat met ronde getallen. Typ de schatting (het ronde antwoord).',
            vragen: [
              { vraag: '38 × 804 ≈', antwoord: '32000' },
              { vraag: '27 × 695 ≈', antwoord: '21000' },
              { vraag: '46 × 39 ≈', antwoord: '2000' },
              { vraag: '99 × 52 ≈', antwoord: '5000' },
              { vraag: '58 × 67 ≈', antwoord: '4200' },
              { vraag: '69 × 496 ≈', antwoord: '35000' },
              { vraag: '31 × 597 ≈', antwoord: '18000' },
              { vraag: '88 × 301 ≈', antwoord: '27000' },
            ],
          },
          {
            nr: 2,
            intro: 'Schat met ronde getallen (delen). Typ de schatting.',
            vragen: [
              { vraag: '618 : 63 ≈', antwoord: '10' },
              { vraag: '797 : 82 ≈', antwoord: '10' },
              { vraag: '4130 : 51 ≈', antwoord: '80' },
              { vraag: '6996 : 73 ≈', antwoord: '100' },
              { vraag: '8993 : 92 ≈', antwoord: '100' },
              { vraag: '816 : 197 ≈', antwoord: '4' },
              { vraag: '5992 : 421 ≈', antwoord: '15' },
              { vraag: '5005 : 98 ≈', antwoord: '50' },
            ],
          },
          {
            nr: 3,
            intro: 'Welke som hoort erbij? Schrijf met ronde getallen en reken uit.',
            vragen: [
              { vraag: '4194 auto\'s, 68 per rij. Hoeveel rijen ongeveer?', antwoord: '60' },
              { vraag: 'Speeltuin 12 dagen open, ±124 bezoekers per dag. Hoeveel ongeveer?', antwoord: '1000' },
            ],
          },
          {
            nr: 4,
            intro: 'Heb je genoeg geld? Schat met makkelijke bedragen (rond af naar boven). Typ ja of nee.',
            vragen: [
              { vraag: 'Je hebt €5. 3 bakjes snoeppaprika\'s à €1,95. Genoeg geld? (ja/nee)', antwoord: 'nee' },
              { vraag: 'Je hebt €10. 4 zakken appels à €2,49. Genoeg geld? (ja/nee)', antwoord: 'ja' },
              { vraag: 'Je hebt €5. 2 netten mandarijnen à €1,89. Genoeg geld? (ja/nee)', antwoord: 'ja' },
              { vraag: 'Je hebt €15. 6 bakjes druiven à €2,99. Genoeg geld? (ja/nee)', antwoord: 'nee' },
              { vraag: 'Je hebt €10. 5 bakken peren à €1,99. Genoeg geld? (ja/nee)', antwoord: 'ja' },
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

      // ── DOEL 1 · Kolomsgewijs delen ────────────────────────────
      {
        nr: 1,
        titel: 'Kolomsgewijs delen (met rest)',
        hulp: 'Deel kolomsgewijs in maximaal 3 stappen.\nMaak een tabel: 1× · 2× · 10× · 5× van de deler.\nKijk hoe vaak de deler eraf kan en houd de rest over.\nSoms kun je het ook handig uit het hoofd (bijv. 3570 : 35 = 102).',
        opgaven: [
          {
            nr: 1,
            intro: 'Reken uit. Schat eerst tussen welke honderdtallen het antwoord ligt.',
            vragen: [
              { vraag: '1125 : 15 =', antwoord: '75' },
              { vraag: '4480 : 32 =', antwoord: '140' },
              { vraag: '2080 : 32 =', antwoord: '65' },
              { vraag: '4255 : 23 =', antwoord: '185' },
              { vraag: '3900 : 15 =', antwoord: '260' },
              { vraag: '4922 : 23 =', antwoord: '214' },
              { vraag: '7475 : 23 =', antwoord: '325' },
              { vraag: '4875 : 15 =', antwoord: '325' },
            ],
          },
          {
            nr: 2,
            intro: 'Welke som hoort erbij? Reken kolomsgewijs uit.',
            vragen: [
              { vraag: 'School heeft €5180, excursie €34 per kind. Hoeveel kinderen kunnen mee?', antwoord: '152' },
              { vraag: 'Hoeveel euro blijft er over?', antwoord: '12' },
              { vraag: 'Femke rijdt 7655 km in 23 dagen. Km per dag, afgerond?', antwoord: '333' },
            ],
          },
          {
            nr: 3,
            intro: 'Reken kolomsgewijs (tabel van 45 en van 24).',
            vragen: [
              { vraag: '6885 : 45 =', antwoord: '153' },
              { vraag: '12.378 : 45 = (met rest)', antwoord: '275 rest 3' },
              { vraag: '14.720 : 45 = (met rest)', antwoord: '327 rest 5' },
              { vraag: '15.648 : 24 =', antwoord: '652' },
              { vraag: '7106 : 24 = (met rest)', antwoord: '296 rest 2' },
              { vraag: '14.184 : 24 =', antwoord: '591' },
            ],
          },
          {
            nr: 4,
            intro: 'Hoofdrekenen of kolomsgewijs? Reken uit.',
            vragen: [
              { vraag: '3570 : 35 =', antwoord: '102' },
              { vraag: '6440 : 35 =', antwoord: '184' },
              { vraag: '16.020 : 45 =', antwoord: '356' },
              { vraag: '9090 : 45 =', antwoord: '202' },
              { vraag: '20.865 : 65 =', antwoord: '321' },
              { vraag: '19.760 : 65 =', antwoord: '304' },
            ],
          },
          {
            nr: 5,
            intro: 'Reken uit (let op de rest).',
            vragen: [
              { vraag: '4360 : 33 = (met rest)', antwoord: '132 rest 4' },
            ],
          },
        ],
      },

      // ── DOEL 2 · Kommagetallen × en : ──────────────────────────
      {
        nr: 2,
        titel: 'Vermenigvuldigen en delen met kommagetallen',
        hulp: 'Reken met splitsen.\n7 × €3,70 = (7 × 3) + (7 × 0,70) = 21 + 4,90 = €25,90\nDelen: 16,20 : 3 = (15 : 3) + (1,20 : 3) = 5 + 0,40 = 5,40\nDenk soms aan een breuk: 0,25 × 20 = 1/4 × 20 = 5.',
        opgaven: [
          {
            nr: 1,
            intro: 'Welke som hoort erbij? Reken uit.',
            vragen: [
              { vraag: 'Willem loopt 6 dagen 4,3 km. Hoeveel km per week?', antwoord: '25,8' },
              { vraag: 'Anne verdient €12,10 per week. Hoeveel in 30 weken?', antwoord: '363' },
              { vraag: '1 tas weegt 8,2 kg. Hoeveel wegen 4 tassen?', antwoord: '32,8' },
              { vraag: 'Dylano verdient €15,80 per week. Hoeveel in 40 weken?', antwoord: '632' },
            ],
          },
          {
            nr: 2,
            intro: 'Reken uit.',
            vragen: [
              { vraag: '3 × 7,1 =', antwoord: '21,3' },
              { vraag: '4 × 4,6 =', antwoord: '18,4' },
              { vraag: '7 × 3,4 =', antwoord: '23,8' },
              { vraag: '5 × 6,3 =', antwoord: '31,5' },
              { vraag: '8 × 5,2 =', antwoord: '41,6' },
              { vraag: '9 × 2,5 =', antwoord: '22,5' },
              { vraag: '18 × 2,5 =', antwoord: '45' },
              { vraag: '80 × 0,25 =', antwoord: '20' },
              { vraag: '6 × 12,25 =', antwoord: '73,50' },
              { vraag: '3 × 1,25 =', antwoord: '3,75' },
              { vraag: '20 × 0,75 =', antwoord: '15' },
              { vraag: '60 × 0,5 =', antwoord: '30' },
            ],
          },
          {
            nr: 3,
            intro: 'Reken uit.',
            vragen: [
              { vraag: '4 × 3,4 =', antwoord: '13,6' },
              { vraag: '6 × 2,8 =', antwoord: '16,8' },
              { vraag: '3 × 4,7 =', antwoord: '14,1' },
              { vraag: '9 × 1,6 =', antwoord: '14,4' },
              { vraag: '5 × 5,3 =', antwoord: '26,5' },
              { vraag: '4 × 7,12 =', antwoord: '28,48' },
              { vraag: '3 × 16,3 =', antwoord: '48,9' },
              { vraag: '7 × 12,5 =', antwoord: '87,5' },
              { vraag: '5 × 14,6 =', antwoord: '73' },
              { vraag: '8 × 25,25 =', antwoord: '202' },
            ],
          },
          {
            nr: 4,
            intro: 'Reken uit (delen).',
            vragen: [
              { vraag: '42,6 : 6 =', antwoord: '7,1' },
              { vraag: '18,9 : 3 =', antwoord: '6,3' },
              { vraag: '35,21 : 7 =', antwoord: '5,03' },
              { vraag: '36,20 : 4 =', antwoord: '9,05' },
              { vraag: '54,72 : 9 =', antwoord: '6,08' },
              { vraag: '24 : 5 =', antwoord: '4,8' },
              { vraag: '46,2 : 6 =', antwoord: '7,7' },
              { vraag: '75,6 : 9 =', antwoord: '8,4' },
              { vraag: '20,36 : 4 =', antwoord: '5,09' },
              { vraag: '21,42 : 7 =', antwoord: '3,06' },
            ],
          },
          {
            nr: 5,
            intro: 'Vul in. Gebruik elk getal 1 keer (uitkomsten controleren).',
            vragen: [
              { vraag: '8 × 3,5 =', antwoord: '28' },
              { vraag: '9 × 3,1 =', antwoord: '27,9' },
              { vraag: '4 × 3,7 =', antwoord: '14,8' },
              { vraag: '6 × 3,3 =', antwoord: '19,8' },
            ],
          },
        ],
      },

      // ── DOEL 3 · Diagrammen ────────────────────────────────────
      {
        nr: 3,
        titel: 'Lijndiagram en beelddiagram lezen',
        hulp: 'Lijndiagram: de lijn omhoog = stijgt, omlaag = daalt, horizontaal = blijft gelijk.\nLees af op de verticale as (let op getallen onder nul!).\nBeelddiagram: 1 figuurtje = een vast aantal; een half figuurtje = de helft.',
        opgaven: [
          { nr: 1, ...TEMP_TABEL },
          { nr: 2, ...TEMP_VRAGEN },
          { nr: 3, ...VERHAAL },
          { nr: 4, ...EIEREN },
          { nr: 5, ...BIJEN },
        ],
      },

      // ── DOEL 4 · Percentages via 1% ────────────────────────────
      {
        nr: 4,
        titel: 'Percentages via 1% (en rente)',
        hulp: '1% = het bedrag : 100, daarna × het percentage.\nRente: bereken de rente en tel die bij het bedrag op.\nVoorbeeld: 2,5% van €800 = €20 → na 1 jaar €820.\nHandig met een breuk: 25% = 1/4, 50% = 1/2, 10% = 1/10.',
        opgaven: [
          {
            nr: 1,
            intro: 'Welke som hoort erbij? Reken uit.',
            vragen: [
              { vraag: '200 kinderen, 8% zit op muziekles. Hoeveel kinderen?', antwoord: '16' },
              { vraag: '400 kinderen, 6% wil een cavia. Hoeveel kinderen?', antwoord: '24' },
              { vraag: 'Min-han zet €800, rente 2,5%. Bedrag na 1 jaar?', antwoord: '820' },
              { vraag: 'Lois zet €500, rente 0,5%. Bedrag na 1 jaar?', antwoord: '502,50' },
            ],
          },
          {
            nr: 2,
            intro: 'Reken uit in je schrift.',
            vragen: [
              { vraag: '25% van €2400 =', antwoord: '600' },
              { vraag: '2% van €1400 =', antwoord: '28' },
              { vraag: '5% van €2000 =', antwoord: '100' },
              { vraag: '50% van €900 =', antwoord: '450' },
              { vraag: '15% van €400 =', antwoord: '60' },
              { vraag: '30% van €900 =', antwoord: '270' },
              { vraag: '60% van €800 =', antwoord: '480' },
              { vraag: '12% van €800 =', antwoord: '96' },
              { vraag: '1% van €7000 =', antwoord: '70' },
              { vraag: '7% van €300 =', antwoord: '21' },
              { vraag: '4% van €400 =', antwoord: '16' },
              { vraag: '10% van €3540 =', antwoord: '354' },
            ],
          },
          {
            nr: 3,
            intro: 'Spaarrekening en salaris. Reken uit.',
            vragen: [
              { vraag: 'Job zet €530, rente 1,5%. Rentebedrag?', antwoord: '7,95' },
              { vraag: 'Job: bedrag na 1 jaar?', antwoord: '537,95' },
              { vraag: 'Isabel zet €280, rente 2,5%. Rentebedrag?', antwoord: '7' },
              { vraag: 'Isabel: bedrag na 1 jaar?', antwoord: '287' },
              { vraag: 'Anton €2600, +3,5%. Welk bedrag dan per maand?', antwoord: '2691' },
              { vraag: 'Jasmijn €12, +15%. Welk bedrag dan?', antwoord: '13,80' },
            ],
          },
          {
            nr: 5,
            intro: 'Sponsorloop. Groep 6 haalde €600 op. Groep 7B haalde 25% meer dan groep 6. Groep 7A haalde 30% meer dan groep 7B.',
            vragen: [
              { vraag: 'Hoeveel haalde groep 7B op?', antwoord: '750' },
              { vraag: 'Hoeveel haalde groep 7A op?', antwoord: '975' },
            ],
          },
        ],
      },

      // ── DOEL 5 · Windrichtingen en routes ──────────────────────
      {
        nr: 5,
        titel: 'Windrichtingen, standpunten en routes',
        hulp: 'Windrichtingen: N boven, Z onder, O rechts, W links, daartussen NO/ZO/ZW/NW.\n"Vanuit het oosten kijken" = je staat rechts en kijkt naar links.',
        opgaven: [
          { nr: 1, ...RICHTING_SP },
          { nr: 2, ...ROUTE_BOOT_SP },
          { nr: 3, ...ROUTE_MATIZ_SP },
          { nr: 4, ...KLEUR_SP },
          { nr: 5, ...TEKENROUTE_SP },
        ],
      },

      // ── DOEL 6 · Schattend rekenen ─────────────────────────────
      {
        nr: 6,
        titel: 'Schattend vermenigvuldigen en delen',
        hulp: 'Rond beide getallen af op een rond getal en reken dan uit.\nVoorbeeld: 18 × 580 ≈ 20 × 600 = 12.000.\n1540 : 32 ≈ 1500 : 30 = 50.',
        opgaven: [
          {
            nr: 1,
            intro: 'Schat met ronde getallen. Typ de schatting (het ronde antwoord).',
            vragen: [
              { vraag: '38 × 804 ≈', antwoord: '32000' },
              { vraag: '27 × 695 ≈', antwoord: '21000' },
              { vraag: '46 × 39 ≈', antwoord: '2000' },
              { vraag: '99 × 52 ≈', antwoord: '5000' },
              { vraag: '58 × 67 ≈', antwoord: '4200' },
              { vraag: '69 × 496 ≈', antwoord: '35000' },
              { vraag: '31 × 597 ≈', antwoord: '18000' },
              { vraag: '88 × 301 ≈', antwoord: '27000' },
            ],
          },
          {
            nr: 2,
            intro: 'Schat met ronde getallen (delen). Typ de schatting.',
            vragen: [
              { vraag: '618 : 63 ≈', antwoord: '10' },
              { vraag: '797 : 82 ≈', antwoord: '10' },
              { vraag: '4130 : 51 ≈', antwoord: '80' },
              { vraag: '6996 : 73 ≈', antwoord: '100' },
              { vraag: '8993 : 92 ≈', antwoord: '100' },
              { vraag: '816 : 197 ≈', antwoord: '4' },
              { vraag: '5992 : 421 ≈', antwoord: '15' },
              { vraag: '5005 : 98 ≈', antwoord: '50' },
            ],
          },
          {
            nr: 3,
            intro: 'Welke som hoort erbij? Schrijf met ronde getallen en reken uit.',
            vragen: [
              { vraag: '4194 auto\'s, 68 per rij. Hoeveel rijen ongeveer?', antwoord: '60' },
              { vraag: 'Speeltuin 12 dagen, ±124 bezoekers per dag. Hoeveel ongeveer?', antwoord: '1000' },
            ],
          },
          {
            nr: 4,
            intro: 'Heb je genoeg geld? Schat met makkelijke bedragen (rond af naar boven). Typ ja of nee.',
            vragen: [
              { vraag: 'Je hebt €5. 3 bakjes snoeppaprika\'s à €1,95. Genoeg geld? (ja/nee)', antwoord: 'nee' },
              { vraag: 'Je hebt €10. 4 zakken appels à €2,49. Genoeg geld? (ja/nee)', antwoord: 'ja' },
              { vraag: 'Je hebt €5. 2 netten mandarijnen à €1,89. Genoeg geld? (ja/nee)', antwoord: 'ja' },
              { vraag: 'Je hebt €15. 6 bakjes druiven à €2,99. Genoeg geld? (ja/nee)', antwoord: 'nee' },
              { vraag: 'Je hebt €10. 5 bakken peren à €1,99. Genoeg geld? (ja/nee)', antwoord: 'ja' },
            ],
          },
        ],
      },

    ],
  },
}
