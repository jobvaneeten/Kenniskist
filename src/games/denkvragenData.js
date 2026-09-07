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
