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
// één, twee keer 25% is 50%). Dan is er iets om over te praten.
//
// De vragen zijn bedoeld voor de sterke rekenaars: niet één fout aanwijzen,
// maar een regel zoeken, alle oplossingen vinden, een tegenvoorbeeld
// bedenken of uitleggen waarom iets áltijd (of juist nooit) klopt. En waar een
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

// Welk deel van dat doel. Een doel beslaat twee lessen en die doen bijna nooit
// hetzelfde: les 3 doet "grote getallen plus en min", les 4 doet "keer en
// delen", terwijl het in de methode één doel is. De eerste les van een doel
// pakt deel 1, de tweede les deel 2 (zie D() in redactiesommen.js).
export const DEEL_VAN_LES = { 1: 1, 2: 2, 3: 1, 4: 2, 5: null, 6: 1, 7: 2, 8: 1, 9: 2, 10: null }

export const BLOKKEN = [
  { nr: 0, label: 'Instap' },
  ...Array.from({ length: 10 }, (_, i) => ({ nr: i + 1, label: `Blok ${i + 1}` })),
]

// vragen[groep][blok][les]
const VRAGEN = {
  7: {
    // ═══════════════════════════════════════════════════════════════════════
    // INSTAP · schatten, 4 × 536, kommagetallen vergelijken, diagrammen
    // ═══════════════════════════════════════════════════════════════════════
    0: {
      // ── Doel 1 · schatten met geld en ronde getallen ───────────────────
      1: {
        niveau: 'evalueren en creëren',
        vraag: 'Je hebt € 20. Je koopt 3 × € 2,45, 2 × € 3,55 en 1 × € 4,95.\n'
          + 'Mees rondt elke prijs af op hele euro\'s: 3 × 2 + 2 × 4 + 5 = 19. "Past!", zegt hij.\n\n'
          + 'Mees heeft toevallig gelijk. Leg uit waarom zijn manier toch niet te vertrouwen is.\n'
          + 'Bedenk andere prijzen waarbij zijn schatting nog steeds € 19 zegt, maar je in het echt méér dan € 20 kwijt bent.',
        hint: 'Kijk per prijs: rondde Mees naar boven of naar beneden af? Hoeveel cent "verdween" er per ding, en keer hoeveel?',
      },
      2: {
        niveau: 'analyseren',
        vraag: 'Drie kinderen schatten 7812 : 38.\n'
          + 'Yara doet 8000 : 40. Daan doet 7600 : 38. Mila doet 7800 : 39.\n'
          + 'Alle drie komen ze op 200. Het echte antwoord is iets meer dan 205.\n\n'
          + 'Bij welke schatting kon je van tevoren al weten dat hij te klein zou uitvallen? Leg uit waarom.\n'
          + 'Bij welke schatting kon je dat níet weten?',
        hint: 'Maakt een groter deeltal het antwoord groter of kleiner? En een grotere deler? Kijk per schatting welke kant elke verandering op duwt.',
      },

      // ── Doel 2 · 4 × 536 cijferend of kolomsgewijs ─────────────────────
      3: {
        niveau: 'evalueren',
        vraag: 'Noor rekent 4 × 536 cijferend uit en krijgt 2124. Ze heeft precies één ding vergeten.\n\n'
          + 'Zoek uit wat ze vergat, zonder het goede antwoord eerst uit te rekenen.\n'
          + 'Hoeveel scheelt haar antwoord met het goede? Leg uit waarom het verschil precies zo groot is.',
        hint: 'Doe de som kolom voor kolom zoals Noor. In welke kolom had er iets bij moeten komen, en hoeveel is dat daar waard?',
      },
      4: {
        niveau: 'analyseren en creëren',
        vraag: 'Uit deze keersom zijn cijfers weggevallen:\n\n■ × 5■6 = 2■44\n\n'
          + 'Zoek álle oplossingen. Hoe weet je zeker dat je er geen gemist hebt?\n'
          + 'Bedenk daarna zelf zo\'n puzzel met precies één oplossing.',
        hint: 'Begin bij de eenheden: welk getal keer 6 eindigt op een 4? Kan de uitkomst dan nog met een 2 beginnen?',
      },

      // ── Doel 3 · kommagetallen tot duizendsten vergelijken ─────────────
      6: {
        niveau: 'evalueren',
        vraag: 'Jesse zegt: tussen 6,17 en 6,18 zit geen enkel getal, want er zit niks tussen 17 en 18.\n'
          + 'Fleur zegt: er zitten er 9 tussen. Tim zegt: er zitten er oneindig veel tussen.\n\n'
          + 'Wie heeft gelijk? Leg uit waar elk kind aan denkt.\n'
          + 'Hoeveel getallen met precies vier cijfers achter de komma liggen ertussen?',
        hint: 'Schrijf 6,17 als 6,170 en 6,18 als 6,180. Wat past daartussen? En als je er nog een nul bij zet?',
      },
      7: {
        niveau: 'analyseren en creëren',
        vraag: 'Je hebt vier kaartjes: 0, 2, 6 en een komma. Je moet ze alle vier gebruiken.\n\n'
          + 'Hoeveel verschillende getallen kun je maken? Zet ze van klein naar groot.\n'
          + 'Sommige leggen zien er anders uit, maar zijn even groot. Welke?\n'
          + 'Leg uit hoe je zeker weet dat je niets gemist hebt.',
        hint: 'Werk ordelijk: zet de komma eerst op de tweede plek en probeer alles, daarna op de derde plek. Is 02,6 een ander getal dan 2,6?',
      },

      // ── Doel 4 · lijndiagram en beelddiagram ───────────────────────────
      8: {
        niveau: 'analyseren',
        vraag: 'Een lijndiagram laat de temperatuur in de tuin zien, elk heel uur gemeten.\n'
          + 'Om 12:00 is het 24 graden, om 13:00 is het 19 graden en om 14:00 weer 23 graden.\n\n'
          + 'Wat kan er rond 13:00 gebeurd zijn?\n'
          + 'Hoe warm was het om half één? Leg uit waarom de lijn tussen twee meetpunten eigenlijk een gok is.',
        hint: 'Tussen twee meetpunten is niets gemeten. De lijn doet alsof de temperatuur rustig verandert. Was dat om 12:30 zo?',
      },
      9: {
        niveau: 'creëren en evalueren',
        vraag: 'Groep 7 leende in maart 43 boeken, in april 38 en in mei 51.\n\n'
          + 'Maak een beelddiagram zonder halve of kapotte plaatjes. Welk getal kies je voor één plaatje?\n'
          + 'Waarom lukt dat alleen als je afrondt?\n'
          + 'Welke keuze vind jij het eerlijkst, en hoe laat je zien dat het diagram niet precies is?',
        hint: 'Welk getal past precies in 43, 38 én 51? Als dat niet bestaat, wat lever je dan in: precisie of hele plaatjes?',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 1 · grote getallen, kleine som, helen uit de breuk, tijd
    // ═══════════════════════════════════════════════════════════════════════
    1: {
      // ── Doel 1 · getallen tot 1 miljoen ────────────────────────────────
      1: {
        niveau: 'evalueren en creëren',
        vraag: 'Bo zegt: een getal met meer cijfers is altijd groter.\n'
          + 'Sam zegt: en een getal met een langere naam in woorden is ook altijd groter.\n\n'
          + 'Wie heeft gelijk? Laat het zien met voorbeelden. Moet je bij Bo iets afspreken?\n'
          + 'Bedenk een getal onder de 1000 met een zo lang mogelijke naam, en een getal boven de 100.000 met een zo kort mogelijke naam.',
        hint: 'Schrijf "honderd" en "zevenenzeventig" uit en tel de letters. En denk bij Bo eens aan 0999 of aan 12,5.',
      },
      2: {
        niveau: 'analyseren en creëren',
        vraag: 'Lieke tekent een getallenlijn van 0 tot 1.000.000. Ze zet 10.000 op 1 cm van de 0.\n\n'
          + 'Hoe lang wordt haar hele lijn?\n'
          + 'Hoe ver liggen 999.999 en 1.000.000 op haar lijn uit elkaar?\n'
          + 'Leg uit waarom je op een getallenlijn nooit álle getallen apart kunt laten zien, en bedenk hoe je toch kunt inzoomen.',
        hint: 'Hoeveel keer past 10.000 in 1.000.000? En welk deel van een centimeter is dan 1?',
      },

      // ── Doel 2 · sommen als 35.400 + 3500 en 24.000 : 600 ──────────────
      3: {
        niveau: 'evalueren',
        vraag: 'Daan rekent 24.000 : 600 = 40. Hij streepte aan allebei de kanten twee nullen weg: 240 : 6 = 40.\n'
          + 'Dan doet hij 24.000 × 600 op dezelfde manier: 240 × 6 = 1440.\n\n'
          + 'Wat gaat er mis bij de keersom? Wat is het goede antwoord?\n'
          + 'Leg uit waarom nullen wegstrepen bij delen wél mag en bij keer niet.',
        hint: 'Wat gebeurt er met 24.000 : 600 als je allebei door 100 deelt? En hoeveel keer kleiner wordt 24.000 × 600 als je allebei door 100 deelt?',
      },
      4: {
        niveau: 'creëren en analyseren',
        vraag: 'Bedenk zo veel mogelijk deelsommen met antwoord 35.000, waarbij de deler op een 0 eindigt.\n'
          + '(70.000 : 2 telt dus niet.)\n\n'
          + 'Wat is de kleinste deler die je kunt kiezen? Bestaat er een grootste?\n'
          + 'Leg uit welk patroon je ziet tussen de deler en het deeltal.',
        hint: 'Als de deler 10 keer zo groot wordt, wat moet er dan met het deeltal gebeuren om hetzelfde antwoord te houden?',
      },

      // ── Doel 3 · helen uit de breuk, breuken vergelijken ───────────────
      6: {
        niveau: 'evalueren en creëren',
        vraag: 'Iris zegt: 7/4 is meer dan 5/3, want 7 is meer dan 5 én 4 is meer dan 3.\n\n'
          + 'Haar antwoord klopt, maar haar manier niet. Bedenk twee breuken waarbij haar manier het verkeerde antwoord geeft.\n'
          + 'Welke breuk met noemer 4 ligt het dichtst bij 5/3? Leg uit hoe je dat weet.',
        hint: 'Schrijf ze als helen en een restje: 7/4 = 1 3/4. Welk restje blijft er bij 5/3 over? Vergelijk die restjes.',
      },
      7: {
        niveau: 'analyseren en creëren',
        vraag: 'Kijk naar het rijtje 1/2, 2/3, 3/4, 4/5, 5/6, …\n\n'
          + 'Worden de breuken steeds groter of steeds kleiner? Leg uit hoe je dat zeker weet, zonder ze gelijknamig te maken.\n'
          + 'Komt het rijtje ooit bij 1?\n'
          + 'Bedenk een breuk uit het rijtje die minder dan 1/100 van 1 af ligt.',
        hint: 'Kijk naar het stukje dat steeds ontbreekt tot een hele. Hoe groot is dat bij 3/4, bij 4/5, bij 5/6?',
      },

      // ── Doel 4 · kalender, tijdsduur, begin- en eindtijd ───────────────
      8: {
        niveau: 'evalueren',
        vraag: 'Een nachttrein vertrekt om 22:48 uur en komt aan om 01:17 uur.\n'
          + 'Ruben rekent: 22 − 1 = 21 uur, en 48 − 17 = 31 minuten. Dus 21 uur en 31 minuten.\n\n'
          + 'Welke fouten maakt Ruben? Hoe lang duurt de reis echt?\n'
          + 'Bedenk een manier die altijd werkt, ook over middernacht heen, en leg uit waarom.',
        hint: 'Spring eerst naar een handig tijdstip, zoals 23:00 of 00:00, en tel de stukjes daarna op.',
      },
      9: {
        niveau: 'analyseren',
        vraag: 'Je verjaardag valt dit jaar op een dinsdag.\n\n'
          + 'Hoeveel jaar duurt het minstens voordat hij weer op een dinsdag valt? Kan het ook langer duren?\n'
          + 'Leg uit wat schrikkeljaren daarmee te maken hebben.\n'
          + 'Hoe vaak valt je verjaardag in de komende 28 jaar op een zaterdag?',
        hint: 'Een gewoon jaar schuift je verjaardag één dag op. Hoeveel dagen schuift hij als er een 29 februari tussen zit?',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 2 · 12 × 64 en 22 × 64, kommagetallen hoofdrekenen, schaal
    // ═══════════════════════════════════════════════════════════════════════
    2: {
      // ── Doel 1 · 12 × 64 cijferend of met splitsen ─────────────────────
      1: {
        niveau: 'analyseren en creëren',
        vraag: 'Je weet: 12 × 64 = 768.\n\n'
          + 'Zonder opnieuw te rekenen: wat is 24 × 32? En 6 × 128? En 48 × 16?\n'
          + 'Leg uit waarom die allemaal 768 zijn.\n'
          + 'Bedenk zelf de moeilijkst uitziende keersom die toch 768 geeft, en één met een kommagetal.',
        hint: 'Wat gebeurt er met het antwoord als je het ene getal verdubbelt en het andere halveert?',
      },
      2: {
        niveau: 'evalueren',
        vraag: 'Yara maakt bij cijferend vermenigvuldigen steeds dezelfde fout: ze zet de tweede regel niet een plek op.\n'
          + 'Bij 12 × 64 krijgt ze zo 192.\n\n'
          + 'Voorspel zonder de sommen te maken wat ze met die fout krijgt bij 13 × 64 en bij 21 × 64.\n'
          + 'Leg uit hoe je dat voorspelt, en waarom haar antwoord bijna altijd veel te klein is.',
        hint: 'Met haar fout telt de 1 van 12 als 1 in plaats van als 10. Welke som maakt ze dus eigenlijk?',
      },

      // ── Doel 2 · 22 × 64, en 6 × 346 ───────────────────────────────────
      3: {
        niveau: 'analyseren',
        vraag: 'Je weet: 22 × 64 = 1408.\n\n'
          + 'Reken hiermee uit, zonder opnieuw te beginnen: 22 × 65, 23 × 64, 11 × 128 en 21 × 63.\n'
          + 'Leg bij elke som uit welke verbetering je doet.\n'
          + 'Bij één som gaat het makkelijk mis. Welke, en waarom?',
        hint: 'Teken 22 × 64 als een rechthoek met rijen en kolommen. Wat haal je weg als er een rij én een kolom af gaan — en welk vakje haal je dan dubbel weg?',
      },
      4: {
        niveau: 'creëren en evalueren',
        vraag: '6 × 346 = 2076.\n\n'
          + 'Bedenk een verhaaltje waarin je 6 × 346 uitrekent, maar het antwoord op de vraag toch níet 2076 is.\n'
          + 'Laat een klasgenoot je verhaaltje maken. Trapte hij erin?\n'
          + 'Wat maakt een verhaaltje zo\'n goede valkuil?',
        hint: 'Denk aan vragen als "hoeveel dozen van 100 heb je nodig?" of "hoeveel houd je over van € 2500?".',
      },

      // ── Doel 3 · hoofdrekenen met kommagetallen ────────────────────────
      6: {
        niveau: 'evalueren',
        vraag: 'Mees telt € 3,45 + € 2,80 + € 1,75 op: 3 + 2 + 1 = 6 en 45 + 80 + 75 = 200. Dus € 6,200.\n'
          + 'Anouk zegt: die 200 zijn 2 euro, dus het is € 8.\n\n'
          + 'Wie heeft gelijk? Leg uit waar het bij Mees misgaat.\n'
          + 'Bedenk een slimmere volgorde waarmee je dit in twee stappen uit je hoofd doet.',
        hint: 'Hoeveel cent is 200 cent? Zoek twee bedragen waarvan de centen samen een ronde euro maken.',
      },
      7: {
        niveau: 'creëren en analyseren',
        vraag: 'Je betaalt met € 10 en krijgt € 1,25 terug. Je kocht precies twee dingen, allebei duurder dan € 3.\n\n'
          + 'Bedenk drie verschillende paren prijzen die kloppen.\n'
          + 'Wat is de hoogste prijs die één van de twee kan hebben? En de laagste?\n'
          + 'Leg uit hoe je dat zeker weet.',
        hint: 'Hoeveel heb je samen uitgegeven? Als het ene ding zo duur mogelijk is, hoe goedkoop moet het andere dan zijn?',
      },

      // ── Doel 4 · schaallijntje en schaal ───────────────────────────────
      8: {
        niveau: 'evalueren',
        vraag: 'Op een kaart met schaal 1 : 25.000 meet Kim 6 cm. Ze zegt: 6 × 25.000 = 150.000 meter.\n\n'
          + 'Wat klopt er niet? Hoe ver is het echt?\n'
          + 'Daarna vergroot Kim de kaart op het kopieerapparaat tot twee keer zo groot.\n'
          + 'Klopt "schaal 1 : 25.000" dan nog? En het schaallijntje? Leg uit waarom.',
        hint: 'In welke maat meet je op de kaart? Dan staat de 150.000 ook in die maat. En wat gebeurt er met het lijntje als je de kaart vergroot?',
      },
      9: {
        niveau: 'creëren',
        vraag: 'Je wilt de hele school op één A4\'tje tekenen, en ook je gum.\n\n'
          + 'Kies voor allebei een schaal en leg uit hoe je die bepaalt.\n'
          + 'Waarom zou je voor de gum een schaal als 5 : 1 kiezen? Wat betekent dat?\n'
          + 'Bedenk iets waarvoor schaal 1 : 1 het handigst is.',
        hint: 'Bij 1 : 100 is de tekening kleiner dan in het echt. Wat zou 5 : 1 dan betekenen voor iets heel kleins?',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 3 · miljarden, kommagetallen cijferend, breuken, lengtematen
    // ═══════════════════════════════════════════════════════════════════════
    3: {
      // ── Doel 1 · hele grote getallen ───────────────────────────────────
      1: {
        niveau: 'analyseren',
        vraag: 'Een miljoen seconden is ongeveer 11 en een halve dag.\n\n'
          + 'Hoe lang is een miljard seconden ongeveer?\n'
          + 'Ben jij al een miljard seconden oud? En je ouders?\n'
          + 'Leg uit hoe je dat schat zonder rekenmachine.',
        hint: 'Een miljard is duizend keer een miljoen. Hoeveel is duizend keer 11,5 dagen, en hoeveel jaar is dat ongeveer?',
      },
      2: {
        niveau: 'evalueren en creëren',
        vraag: 'Sil zegt: als je een miljard euromuntjes op elkaar stapelt, komt de toren tot aan de maan.\n'
          + 'Een muntje is ongeveer 2 mm dik. De maan is ongeveer 384.000 km van ons af.\n\n'
          + 'Klopt het wat Sil zegt? Leg uit hoe je het nagaat.\n'
          + 'Bedenk daarna zelf een "miljard-vergelijking" die wél klopt.',
        hint: 'Reken de hoogte uit in millimeters en zet die om naar kilometers. Hoeveel nullen gaan eraf van mm naar km?',
      },

      // ── Doel 2 · cijferend rekenen met kommagetallen ───────────────────
      3: {
        niveau: 'evalueren',
        vraag: 'Bram zet bij cijferend optellen altijd de laatste cijfers onder elkaar.\n'
          + 'Bij 12,50 + 3,75 gaat dat goed. Bij 12,5 + 3,75 krijgt hij 5,00.\n\n'
          + 'Leg uit waarom zijn manier soms wél en soms níet werkt.\n'
          + 'Bedenk een regel waarmee zijn manier altijd werkt. Werkt die ook bij 7 − 2,38?',
        hint: 'Verandert 12,5 als je er een 0 achter zet? En wat kun je achter de 7 zetten zonder dat hij verandert?',
      },
      4: {
        niveau: 'creëren',
        vraag: 'Bedenk een cijferende aftreksom met kommagetallen waarbij je drie keer achter elkaar moet lenen, ook een keer over de komma heen.\n\n'
          + 'Controleer je som door terug te rekenen.\n'
          + 'Hoe klein kan de uitkomst van zo\'n som zijn? Leg uit.',
        hint: 'Je leent als er boven een kleiner cijfer staat dan onder. Hoe zorg je dat dat in drie kolommen achter elkaar gebeurt? Denk aan nullen.',
      },

      // ── Doel 3 · gelijkwaardige breuken, vergelijken ───────────────────
      6: {
        niveau: 'analyseren en creëren',
        vraag: 'Lotte zegt: als je bij teller én noemer hetzelfde getal optelt, blijft een breuk even groot.\n'
          + 'Kijk maar: 2/3 wordt 3/4.\n\n'
          + 'Klopt dat? Wordt 3/4 groter of kleiner dan 2/3? Probeer het ook met 5/3.\n'
          + 'Leg uit wat er echt gebeurt, en bedenk een regel die wél altijd een even grote breuk geeft.',
        hint: 'Zet 2/3, 3/4, 4/5 op een getallenlijn. Doe hetzelfde met 5/3, 6/4, 7/5. Naar welk getal kruipen ze toe?',
      },
      7: {
        niveau: 'evalueren',
        vraag: 'Welke is groter: 3/8 of 2/5? Allebei liggen ze onder een half.\n'
          + 'Jip zegt: 3/8 is 1/8 minder dan een half, en 2/5 is 1/10 minder dan een half. Dus 2/5 is groter.\n\n'
          + 'Klopt zijn redenering? Leg uit waarom.\n'
          + 'Zoek twee breuken waarbij deze truc je niet sneller maakt.',
        hint: 'Hoe groot is het stukje dat er tot een half ontbreekt? Welk van die stukjes is het kleinst?',
      },

      // ── Doel 4 · lengtematen ───────────────────────────────────────────
      8: {
        niveau: 'analyseren',
        vraag: 'Een slak kruipt 1 millimeter per seconde.\n\n'
          + 'Hoe lang doet hij over 1 dm? Over 1 m? Over 1 km?\n'
          + 'Leg uit wat er bij elke stap op het maten-trappetje met de tijd gebeurt.\n'
          + 'Waarom gaat het van meter naar kilometer ineens zo hard?',
        hint: 'Hoeveel millimeter zit er in 1 dm, in 1 m en in 1 km? Elke millimeter kost één seconde.',
      },
      9: {
        niveau: 'creëren en evalueren',
        vraag: 'Een A4\'tje is veel dunner dan een millimeter, dus met een liniaal kun je het niet meten.\n\n'
          + 'Bedenk een manier om toch te weten te komen hoe dik één blaadje is.\n'
          + 'Hoe nauwkeurig is jouw manier? Leg uit hoe je hem nog beter maakt.',
        hint: 'Iets heel dun meet je niet los. Hoe dik is een hele stapel, en hoeveel blaadjes zitten erin?',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 4 · rekenmachine en schatten, breuk↔komma, procenten, snelheid
    // ═══════════════════════════════════════════════════════════════════════
    4: {
      // ── Doel 1 · rekenmachine met schatting ────────────────────────────
      1: {
        niveau: 'analyseren en evalueren',
        vraag: 'Noa tikt 48 × 52 in en krijgt 2496. Ze zegt: dat is nét onder 50 × 50 = 2500. Toeval?\n\n'
          + 'Reken met de rekenmachine ook 47 × 53 en 45 × 55 uit. Wat zie je?\n'
          + 'Voorspel nu 49 × 51 en 40 × 60 uit je hoofd.\n'
          + 'Leg uit waarom dit werkt.',
        hint: 'Hoeveel minder dan 2500 is elke uitkomst? Kijk hoe ver de getallen van 50 af liggen.',
      },
      2: {
        niveau: 'creëren en evalueren',
        vraag: 'Bedenk een som die er op de rekenmachine heel moeilijk uitziet, maar die jij sneller uit je hoofd doet dan iemand hem kan intikken.\n'
          + 'Doe een wedstrijdje met een klasgenoot mét rekenmachine.\n\n'
          + 'Wat maakt jouw som "nep-moeilijk"? Bedenk er ook één met delen en één met een kommagetal.',
        hint: 'Denk aan getallen die elkaar opheffen, zoals × 25 en × 4, of aan 999 dat bijna 1000 is.',
      },

      // ── Doel 2 · breuken en kommagetallen ──────────────────────────────
      3: {
        niveau: 'analyseren',
        vraag: 'Je weet: 1/8 = 0,125.\n\n'
          + 'Wat is dan 1/16? En 1/80? En 7/8? Leg bij elke uit welke stap je zet.\n'
          + 'Welke van deze breuken worden een kommagetal dat ophoudt: 1/5, 1/6, 1/20, 1/12, 1/25?\n'
          + 'Zoek uit wat de regel is.',
        hint: 'Probeer van de noemer 10, 100 of 1000 te maken door hem ergens mee te vermenigvuldigen. Bij welke noemers lukt dat nooit?',
      },
      4: {
        niveau: 'evalueren en creëren',
        vraag: 'Dilan zegt: 0,4 = 4/10 = 2/5. Dus 0,04 = 2/50 en 0,44 = 22/50.\n\n'
          + 'Klopt dat allemaal? Kun je het nog eenvoudiger schrijven?\n'
          + 'Bedenk drie kommagetallen met drie cijfers achter de komma die je als een breuk met een noemer onder de 10 kunt schrijven.',
        hint: 'Schrijf het kommagetal eerst als breuk met 10, 100 of 1000 eronder. Zoek daarna een getal waar teller én noemer door te delen zijn.',
      },

      // ── Doel 3 · procenten in strook en cirkel ─────────────────────────
      6: {
        niveau: 'analyseren en creëren',
        vraag: 'In een cirkeldiagram is blauw 25%, rood 40% en groen de rest.\n\n'
          + 'Hoe groot is de hoek van elk stuk, in graden? Leg uit hoe je van procenten naar graden gaat.\n'
          + 'Bedenk een cirkeldiagram met vier kleuren waarin geen enkel stuk een "mooi" percentage heeft, maar dat je toch precies kunt tekenen.',
        hint: 'Een hele cirkel is 360 graden. Hoeveel graden is dan 1%? En 10%?',
      },
      7: {
        niveau: 'evalueren',
        vraag: 'Lena had 8 van de 10 vragen goed. Jesse had 17 van de 20 goed. Wie deed het beter?\n\n'
          + 'Daarna maakt Lena een tweede toets: 27 van de 30 goed.\n'
          + 'Jesse zegt: jouw totaal is nu (80% + 90%) : 2 = 85%.\n\n'
          + 'Klopt dat? Reken het na met alle vragen samen.\n'
          + 'Leg uit wanneer je percentages wél zo mag middelen, en wanneer niet.',
        hint: 'Tel alle vragen van Lena bij elkaar op, en alle goede antwoorden ook. Telt een toets van 30 vragen even zwaar als een toets van 10?',
      },

      // ── Doel 4 · gemiddelde snelheid ───────────────────────────────────
      8: {
        niveau: 'evalueren',
        vraag: 'Je fietst 10 km naar opa met 20 km per uur. Terug heb je wind tegen en fiets je 10 km per uur.\n'
          + 'Ravi zegt: gemiddeld ging je dus 15 km per uur.\n\n'
          + 'Klopt dat? Reken uit hoe lang je over heen en terug deed.\n'
          + 'Leg uit waarom Ravi\'s manier hier niet werkt.',
        hint: 'Gemiddelde snelheid is de hele afstand gedeeld door de hele tijd. Hoe lang duurde de heenweg, en hoe lang de terugweg?',
      },
      9: {
        niveau: 'analyseren en creëren',
        vraag: 'Je fietst 10 km naar opa, heel rustig: 10 km per uur.\n'
          + 'Op de terugweg wil je zo hard fietsen dat je over de hele tocht gemiddeld 20 km per uur hebt gereden.\n\n'
          + 'Hoe hard moet je terug? Zoek het uit en leg uit wat je ontdekt.\n'
          + 'Bedenk daarna een versie van deze puzzel die wél kan.',
        hint: 'Hoeveel tijd mag de hele tocht van 20 km duren als je gemiddeld 20 km per uur rijdt? Hoeveel daarvan heb je op de heenweg al gebruikt?',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 5 · kolomsgewijs delen, verhoudingen, oppervlakte
    // ═══════════════════════════════════════════════════════════════════════
    5: {
      // ── Doel 1 · 357 : 17 en 360 : 17 ──────────────────────────────────
      1: {
        niveau: 'evalueren',
        vraag: 'Je weet: 360 : 17 = 21 rest 3.\n'
          + 'Sam zegt: dan is 3600 : 17 = 210 rest 3.\n\n'
          + 'Klopt dat? Laat zien hoe je het controleert.\n'
          + 'Wat is 3600 : 170? Leg uit wat er met de rest gebeurt als je het deeltal (en de deler) keer 10 doet.',
        hint: 'Reken terug: 210 × 17, en tel de rest erbij op. Kom je dan op 3600?',
      },
      2: {
        niveau: 'creëren en analyseren',
        vraag: 'Een getal gedeeld door 17 geeft rest 5. Een ander getal gedeeld door 17 geeft rest 13.\n\n'
          + 'Wat is de rest als je die twee getallen optelt en dan door 17 deelt? Probeer het met je eigen voorbeelden.\n'
          + 'Leg uit waarom het altijd zo uitkomt.\n'
          + 'Wat gebeurt er met de rest als je de twee getallen keer elkaar doet?',
        hint: 'Kies zelf getallen: 17 + 5 = 22 en 17 + 13 = 30. Tel ze op en deel door 17. Probeer daarna andere getallen met dezelfde resten.',
      },

      // ── Doel 2 · 3726 : 23 in maximaal 3 stappen ───────────────────────
      3: {
        niveau: 'analyseren',
        vraag: 'Zonder uit te rekenen: is 3726 : 23 meer of minder dan 3726 : 25?\n\n'
          + 'Welke van de twee is makkelijker uit je hoofd, en waarom?\n'
          + 'Hoe kun je de makkelijke gebruiken om de moeilijke te schatten? Hoeveel scheelt het ongeveer?',
        hint: 'Als je door een kleiner getal deelt, krijgt ieder dan meer of minder? En hoeveel keer past 25 in 100?',
      },
      4: {
        niveau: 'evalueren',
        vraag: 'Maud deelt 3732 door 23 in stappen: 100 × 23, 50 × 23 en 10 × 23. Ze schrijft: 160 rest 52.\n'
          + 'Tim kijkt alleen naar die 52 en zegt meteen: het is 162 rest 6.\n\n'
          + 'Hoe kan Tim dat zo snel zien? Klopt zijn antwoord?\n'
          + 'Leg uit hoe je aan een rest ziet dat je nog niet klaar bent, en controleer Tim zonder de deelsom opnieuw te maken.',
        hint: 'Hoe vaak past 23 in 52? Wat blijft er dan over?',
      },

      // ── Doel 3 · verhoudingen ──────────────────────────────────────────
      6: {
        niveau: 'analyseren',
        vraag: 'Voor 4 pannenkoeken heb je 3 eieren en 250 ml melk nodig.\n'
          + 'Je hebt 7 eieren en 1 liter melk.\n\n'
          + 'Hoeveel pannenkoeken kun je maximaal bakken? Wat raakt het eerst op?\n'
          + 'Leg uit hoe je dat met verhoudingstabellen uitzoekt.',
        hint: 'Reken voor elk ingrediënt apart uit hoeveel pannenkoeken je ermee kunt bakken. Welk ingrediënt houdt je tegen?',
      },
      7: {
        niveau: 'evalueren en creëren',
        vraag: 'In groep 7a is de verhouding jongens : meisjes 2 : 3. In groep 7b is het 3 : 2.\n'
          + 'Tessa zegt: als de twee groepen samen op kamp gaan, zijn er dus precies evenveel jongens als meisjes.\n\n'
          + 'Klopt dat altijd? Leg uit.\n'
          + 'Bedenk klassen waarbij het wel klopt en klassen waarbij het niet klopt.',
        hint: 'Een verhouding zegt niets over hoeveel kinderen er zijn. Probeer een klas van 20 met een klas van 30.',
      },

      // ── Doel 4 · oppervlakte in cm, dm, m ──────────────────────────────
      8: {
        niveau: 'evalueren',
        vraag: 'Een vloer van 3 m bij 4 m krijgt tegels van 20 cm bij 20 cm.\n'
          + 'Ilse rekent: 300 : 20 = 15 en 400 : 20 = 20, dus 15 + 20 = 35 tegels.\n\n'
          + 'Wat vind je van haar manier? Hoeveel tegels zijn het echt?\n'
          + 'Controleer je antwoord op een tweede manier, via de oppervlakte van één tegel in m².',
        hint: 'Teken de vloer met rijen tegels. Hoeveel tegels liggen er in één rij, en hoeveel rijen zijn er?',
      },
      9: {
        niveau: 'creëren en analyseren',
        vraag: 'Teken zo veel mogelijk verschillende rechthoeken met een oppervlakte van 36 m², met alleen hele meters.\n\n'
          + 'Welke heeft de kortste omtrek, en welke de langste? Leg uit waarom.\n'
          + 'Kun je een figuur van 36 m² bedenken (geen rechthoek) met een nóg langere omtrek?',
        hint: 'Zoek alle paren getallen die keer elkaar 36 zijn. Wat gebeurt er met de omtrek als de rechthoek meer op een vierkant gaat lijken?',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 6 · miljarden en afronden, heel × breuk, procenten, diagrammen
    // ═══════════════════════════════════════════════════════════════════════
    6: {
      // ── Doel 1 · 5,2 miljoen en afronden ───────────────────────────────
      1: {
        niveau: 'evalueren',
        vraag: 'Krant A: "In de stad wonen 5,2 miljoen mensen."\n'
          + 'Krant B: "In de stad wonen 5.249.000 mensen."\n'
          + 'Krant C: "In de stad wonen 5 miljoen mensen."\n\n'
          + 'Kunnen ze alle drie gelijk hebben? Leg uit.\n'
          + 'Wat is het kleinste en het grootste echte aantal waarbij krant A gelijk heeft?',
        hint: 'Afgerond op een tiende miljoen: welke getallen worden allemaal 5,2 miljoen? Waar ligt de grens met 5,1 en met 5,3?',
      },
      2: {
        niveau: 'analyseren en creëren',
        vraag: 'Rond 3.749.999 af op honderdduizendtallen. Wat krijg je?\n'
          + 'Tom doet het stapje voor stapje: eerst op tienduizendtallen (3.750.000) en dan op honderdduizendtallen (3.800.000).\n\n'
          + 'Wie heeft gelijk, jij of Tom? Leg uit wat er bij Tom misgaat.\n'
          + 'Bedenk zelf een getal waarbij stapje voor stapje afronden een ander antwoord geeft dan in één keer.',
        hint: 'Kijk bij in één keer afronden alleen naar het cijfer direct rechts van de honderdduizendtallen. Wat doen de negens bij Tom?',
      },

      // ── Doel 2 · heel getal × breuk ────────────────────────────────────
      3: {
        niveau: 'analyseren',
        vraag: 'Hier staan vijf sommen:\n\n6 × 3/4     3/4 × 6     3 × 6/4     6/4 × 3     4 × 3/6\n\n'
          + 'Zoek uit welke precies even groot zijn, en welke niet.\n'
          + 'Leg uit waarom, zonder elke som helemaal uit te rekenen.\n'
          + 'Welke van de gelijke sommen reken jij het liefst uit je hoofd?',
        hint: 'Schrijf alles als één breuk: (heel getal × teller) / noemer. Welke getallen staan dan boven en onder de streep?',
      },
      4: {
        niveau: 'creëren en analyseren',
        vraag: 'Bedenk een verhaaltje met 8 × 2/3 waarin je het antwoord naar boven moet afronden, en één waarin je naar beneden moet afronden.\n\n'
          + 'Voor welke hele getallen n is n × 2/3 precies een heel getal?\n'
          + 'Leg uit hoe je dat ziet.',
        hint: 'Wanneer blijft er bij n × 2/3 geen stukje over? Probeer n = 1, 2, 3, 4, 5, 6 en zoek het patroon.',
      },

      // ── Doel 3 · 5%, 10%, 25%, 50%, 75% ────────────────────────────────
      6: {
        niveau: 'analyseren',
        vraag: 'Je weet dat 10% van 80 gelijk is aan 8.\n\n'
          + 'Hoe vind je met zo weinig mogelijk stappen: 35%, 95%, 12,5% en 150% van 80?\n'
          + 'Leg per percentage uit welke route je kiest: via 10%, via een breuk, of via "alles min een stukje".',
        hint: '95% is bijna alles. 12,5% is de helft van 25%. En 150% is meer dan het hele getal.',
      },
      7: {
        niveau: 'evalueren en creëren',
        vraag: 'Winkel A: spel van € 60 met 25% korting.\n'
          + 'Winkel B: hetzelfde spel voor € 50 met 10% korting.\n'
          + 'Winkel C: € 48, zonder korting.\n\n'
          + 'Daan zegt: A is het goedkoopst, want daar is de korting het grootst. Wat vind je?\n'
          + 'Bedenk zelf drie winkels waarbij de winkel met de kleinste korting het goedkoopst is.',
        hint: 'Reken bij elke winkel uit wat je echt betaalt. Is de grootste korting ook de laagste prijs?',
      },

      // ── Doel 4 · staaf- en cirkeldiagrammen ────────────────────────────
      8: {
        niveau: 'evalueren',
        vraag: 'Een staafdiagram: op maandag 40 ijsjes verkocht, op dinsdag 50. De as begint bij 35.\n\n'
          + 'Hoeveel keer zo lang is de staaf van dinsdag als die van maandag? En hoeveel keer zoveel ijsjes zijn er echt verkocht?\n'
          + 'Bij welk getal moet de as beginnen om het te laten lijken alsof er op dinsdag vijf keer zoveel verkocht is?\n'
          + 'Leg uit hoe je dat vindt.',
        hint: 'Meet de staven vanaf waar de as begint, niet vanaf 0. Hoe lang zijn ze als de as bij 35 begint?',
      },
      9: {
        niveau: 'creëren en evalueren',
        vraag: 'Houd een week bij hoeveel tijd je per dag aan een scherm besteedt.\n\n'
          + 'Maak twee diagrammen van dezelfde getallen: één die eerlijk is, en één die je ouders ervan overtuigt dat je veel te wéinig schermtijd krijgt — zonder over de getallen te liegen.\n'
          + 'Welke trucs gebruikte je? Leg uit hoe je die trucs bij een ander herkent.',
        hint: 'Je mag niet liegen, maar wel kiezen: waar begint de as, welke dagen laat je zien, en met wie vergelijk je?',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 7 · gemiddelde, komma × en : 10/100/1000, verhoudingen, inhoud
    // ═══════════════════════════════════════════════════════════════════════
    7: {
      // ── Doel 1 · gemiddelde ────────────────────────────────────────────
      1: {
        niveau: 'evalueren',
        vraag: 'Vijf kinderen halen voor een toets: 6, 7, 7, 8 en 2. Het gemiddelde is 6.\n'
          + 'Milan maakt een herkansing: zijn 2 wordt een 7.\n\n'
          + 'Wat wordt het gemiddelde? Leg uit hoe je dat voorspelt zonder alles opnieuw op te tellen.\n'
          + 'Daarna komt er een zesde kind bij. Welk cijfer moet dat kind halen om het gemiddelde weer op 6 te krijgen? Kan dat?',
        hint: 'Als één cijfer 5 punten hoger wordt, hoeveel stijgt het totaal dan? Hoeveel is dat per kind?',
      },
      2: {
        niveau: 'creëren en analyseren',
        vraag: 'Bedenk vijf hele getallen van 1 tot en met 10 met een gemiddelde van precies 7.\n\n'
          + 'Zet ze op volgorde. Hoe laag kan het middelste getal zijn? En hoe hoog?\n'
          + 'Leg uit waarom het niet lager of hoger kan.',
        hint: 'Alle vijf samen moeten 35 zijn. Als je het middelste getal laag wilt, wat doe je dan met de twee grootste?',
      },

      // ── Doel 2 · kommagetallen × en : 10, 100, 1000 ────────────────────
      3: {
        niveau: 'evalueren',
        vraag: 'Sara zegt: bij × 10 schuift de komma één plek naar rechts.\n'
          + 'Tom zegt: nee, de cijfers schuiven één plek naar links, en de komma blijft staan.\n\n'
          + 'Wie heeft gelijk? Maakt het uit? Laat met 2,5 × 10 en 0,03 × 1000 zien wat er gebeurt.\n'
          + 'Waarom zou een juf zeggen: "de komma verspringt nooit"?',
        hint: 'Zet 2,5 en 25 in een tabel met kolommen voor tientallen, eenheden en tienden. Wat verschuift er: de cijfers of de komma?',
      },
      4: {
        niveau: 'analyseren',
        vraag: 'Een pak melk van 1 liter kost € 1,20.\n\n'
          + 'Wat kosten 1000 pakken? En wat kost 1 ml melk?\n'
          + 'Leg uit wat er met de komma gebeurt, en hoe je zeker weet dat je antwoord niet 10 keer te groot of te klein is.',
        hint: 'Een liter heeft 1000 ml. Hoeveel plekken schuift het bij delen door 1000? Schat eerst: kost één slokje meer of minder dan 1 cent?',
      },

      // ── Doel 3 · verhoudingen en vreemde valuta ────────────────────────
      6: {
        niveau: 'analyseren en evalueren',
        vraag: 'Voor je vakantie wissel je € 10 om. Je krijgt 11 dollar: 1 euro = 1,10 dollar.\n'
          + 'Terug thuis wissel je die 11 dollar weer om. Maar de bank rekent nu: 1 euro kost 1,25 dollar.\n\n'
          + 'Hoeveel euro krijg je terug? Waar is de rest gebleven?\n'
          + 'Leg uit waarom een bank bij heen- en terugwisselen bijna altijd wint.',
        hint: 'Hoeveel keer past 1,25 in 11? Tip: 4 × 1,25 = 5.',
      },
      7: {
        niveau: 'creëren en evalueren',
        vraag: 'Een recept voor 6 personen: 450 gram pasta, 3 eieren en 1 ui. Jij kookt voor 8 personen.\n\n'
          + 'De pasta is makkelijk. Wat doe je met de eieren en de ui?\n'
          + 'Bedenk een recept voor 5 personen dat je ook voor 3 en voor 10 personen precies kunt omrekenen.\n'
          + 'Leg uit waarom sommige ingrediënten niet precies om te rekenen zijn.',
        hint: 'Reken eerst uit wat er voor 2 personen nodig is. Welke ingrediënten kun je niet in stukjes gebruiken?',
      },

      // ── Doel 4 · inhoud van een balk ───────────────────────────────────
      8: {
        niveau: 'analyseren',
        vraag: 'Een doos is 4 dm lang, 3 dm breed en 2 dm hoog.\n\n'
          + 'Je maakt elke maat twee keer zo groot. Hoeveel keer zoveel past er nu in? Voorspel eerst, reken dan.\n'
          + 'Hoeveel keer zoveel karton heb je nodig voor de grote doos?\n'
          + 'Leg uit waarom dat niet hetzelfde getal is.',
        hint: 'Hoeveel blokjes passen er in de lengte, de breedte en de hoogte? Wat gebeurt er met elk van die drie getallen?',
      },
      9: {
        niveau: 'creëren en evalueren',
        vraag: 'Ontwerp een doos van precies 24 liter, met hele decimeters als maten.\n\n'
          + 'Zoek alle mogelijkheden. Welke doos gebruikt het minste karton?\n'
          + 'Waarom kiest een fabrikant toch niet altijd die doos? Bedenk een goede reden.',
        hint: 'Zoek alle drietallen hele getallen die keer elkaar 24 zijn. Het karton is de oppervlakte van alle zes de zijkanten samen.',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 8 · rekenmachine in verhalen, heel × breuk, korting, gewicht
    // ═══════════════════════════════════════════════════════════════════════
    8: {
      // ── Doel 1 · rekenmachine bij verhaaltjessommen ────────────────────
      1: {
        niveau: 'evalueren',
        vraag: 'Jip koopt 3 broden van € 2,45 en betaalt met € 10. Hij tikt in: 10 − 3 × 2,45.\n'
          + 'Op de ene rekenmachine komt er 2,65 uit, op een andere 17,15.\n\n'
          + 'Hoe kan dat? Welke rekenmachine rekent zoals Jip het bedoelt?\n'
          + 'Bedenk een som waarbij allebei de rekenmachines hetzelfde geven, en leg uit waarom.',
        hint: 'Sommige rekenmachines rekenen gewoon van links naar rechts, andere doen eerst keer en delen. Wanneer maakt die volgorde niets uit?',
      },
      2: {
        niveau: 'creëren',
        vraag: 'Bedenk drie verhaaltjes waarbij de rekenmachine steeds 2,6 geeft:\n'
          + 'één waarin het goede antwoord 3 is, één waarin het 2 is, en één waarin het precies 2,6 is.\n\n'
          + 'Leg bij elk verhaaltje uit waarom je zo afrondt (of juist niet).',
        hint: 'Denk aan bussen (je kunt geen stukje bus huren), aan dozen die helemaal vol moeten, en aan liters of kilo\'s.',
      },

      // ── Doel 2 · heel getal × breuk (herhaling) ────────────────────────
      3: {
        niveau: 'analyseren en creëren',
        vraag: '4 × 3/5 is precies evenveel als 3 × 4/5.\n\n'
          + 'Is a × b/c altijd hetzelfde als b × a/c? Leg uit waarom.\n'
          + 'Gebruik dat om 12 × 5/6 en 25 × 3/100 slim uit te rekenen.\n'
          + 'Bedenk zelf een som waarbij omdraaien een lastige som ineens makkelijk maakt.',
        hint: 'Schrijf allebei als (a × b) / c. En welke breuk is 25/100 eigenlijk?',
      },
      4: {
        niveau: 'evalueren',
        vraag: 'Kim rekent 5 × 2/3 uit en schrijft 10/15. Rob schrijft 10/3.\n'
          + 'Kim zegt: maar 10/15 is hetzelfde als 2/3!\n\n'
          + 'Wat betekent het dat Kims antwoord gelijk is aan 2/3? Kan dat kloppen?\n'
          + 'Leg uit hoe je aan elk antwoord kunt zien dat Kims manier nooit kan kloppen.',
        hint: 'Als je 5 keer zoveel pizza hebt, kan het dan net zoveel pizza zijn als eerst? Wat doet "teller én noemer keer 5" met de waarde?',
      },

      // ── Doel 3 · korting en percentages boven 100% ─────────────────────
      6: {
        niveau: 'evalueren',
        vraag: 'Een jas van € 80 wordt eerst 25% duurder. Een week later krijg je 25% korting.\n'
          + 'Femke zegt: dan kost de jas gewoon weer € 80.\n\n'
          + 'Klopt dat? Reken het na.\n'
          + 'Hoeveel procent korting had de winkel moeten geven om weer precies op € 80 uit te komen? Leg uit waarom dat geen 25% is.',
        hint: 'Reken elke stap apart uit. Gaat de korting af van € 80, of van de nieuwe prijs?',
      },
      7: {
        niveau: 'analyseren en creëren',
        vraag: 'Een spel kostte € 20 en kost nu € 30. Dat is 50% duurder.\n'
          + 'Een maand later kost het weer € 20.\n\n'
          + 'Met hoeveel procent is de prijs gedaald? Leg uit waarom dat geen 50% is.\n'
          + 'Bedenk een prijs die met 200% stijgt. Kan een prijs ook met 200% dalen?',
        hint: 'Van welk bedrag reken je het percentage bij de daling: van € 20 of van € 30?',
      },

      // ── Doel 4 · gewichten en prijzen ──────────────────────────────────
      8: {
        niveau: 'evalueren',
        vraag: 'Bij de groenteboer kost 1 kg appels € 2,40. In de supermarkt kost een zak van 750 gram € 1,95.\n'
          + 'Yassin zegt: de zak is goedkoper, want € 1,95 is minder dan € 2,40.\n\n'
          + 'Wat vind je? Leg uit hoe je de prijzen eerlijk vergelijkt.\n'
          + 'Waarom staat in winkels vaak een kiloprijs op een klein bordje?',
        hint: '750 gram is drie keer 250 gram. Wat kost 250 gram bij allebei?',
      },
      9: {
        niveau: 'analyseren en creëren',
        vraag: '1 liter water weegt ongeveer 1 kilo.\n\n'
          + 'Hoeveel weegt het water in een vol bad van 150 liter?\n'
          + 'En in een zwembad van 25 m lang, 10 m breed en 2 m diep?\n'
          + 'Leg uit hoe liters, dm³ en kilo\'s met elkaar samenhangen.\n'
          + 'Bedenk iets waarbij die regel níet klopt.',
        hint: '1 liter is 1 dm³. Hoeveel dm³ past er in 1 m³? Rekenen met m³ is makkelijker als je eerst de inhoud van het zwembad uitrekent.',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 9 · 5819 : 23, komma × en :, procenten via 1%, windrichtingen
    // ═══════════════════════════════════════════════════════════════════════
    9: {
      // ── Doel 1 · 5819 : 23 ─────────────────────────────────────────────
      1: {
        niveau: 'analyseren',
        vraag: 'Je weet: 5819 : 23 = 253.\n\n'
          + 'Zonder opnieuw te delen: wat is 5842 : 23? En 5819 : 253? En 58.190 : 230?\n'
          + 'Leg bij elke som uit hoe je het ziet.',
        hint: 'Wat is het verschil tussen 5842 en 5819? En bij een deelsom horen drie getallen die je ook als keersom kunt schrijven.',
      },
      2: {
        niveau: 'evalueren',
        vraag: 'Drie kinderen delen 5819 door 23.\n'
          + 'Nadia doet het in 3 stappen: 200, 50 en 3. Tim in 6 stappen: 100, 100, 20, 20, 10 en 3.\n'
          + 'Kaya begint met 300 × 23 = 6900.\n\n'
          + 'Wat gaat er mis bij Kaya?\n'
          + 'In hoeveel stappen kan het minimaal? Leg uit waarom zo min mogelijk stappen niet altijd het beste is.',
        hint: 'Is 6900 meer of minder dan 5819? En welke keersom met 23 kun je makkelijk uitrekenen die bijna 5819 is?',
      },

      // ── Doel 2 · vermenigvuldigen en delen met kommagetallen ───────────
      3: {
        niveau: 'analyseren',
        vraag: '8 pakjes van € 0,75 kosten samen € 6.\n\n'
          + 'Wat kosten dan 8 pakjes van € 0,79? En 79 pakjes van € 0,08?\n'
          + 'Leg uit welke trucs je gebruikt. Waarom zijn de laatste twee antwoorden gelijk?',
        hint: '€ 0,79 is 4 cent meer dan € 0,75. En kijk goed naar de cijfers van 79 × 0,08 en 8 × 0,79.',
      },
      4: {
        niveau: 'evalueren',
        vraag: 'Sem zegt: delen maakt altijd kleiner, en keer maakt altijd groter.\n\n'
          + 'Zoek voor alle vier de gevallen een som met kommagetallen: keer maakt groter, keer maakt kleiner, delen maakt kleiner, delen maakt groter.\n'
          + 'Wanneer maakt delen precies groter? Leg uit met een regel die altijd klopt.',
        hint: 'Kijk naar het getal waardoor je deelt of waarmee je vermenigvuldigt. Is het groter of kleiner dan 1?',
      },

      // ── Doel 3 · procenten via 1% ──────────────────────────────────────
      6: {
        niveau: 'analyseren',
        vraag: 'Je kunt 13% van 250 uitrekenen via 1%: 1% is 2,5, dus 13% is 13 × 2,5.\n\n'
          + 'Bedenk nog twee andere routes voor 13% van 250.\n'
          + 'Bedenk ook drie routes voor 17,5% van 80.\n'
          + 'Welke route is steeds het kortst? Leg uit waarom.',
        hint: 'Probeer 10% + 1% + 1% + 1%, of 25% min een stukje. En 17,5% is 10% + 5% + de helft van 5%.',
      },
      7: {
        niveau: 'evalueren en creëren',
        vraag: 'Daan ontdekt: 15% van 80 is hetzelfde als 80% van 15.\n'
          + 'Dan zegt hij: dus 15% korting op € 80 is ook hetzelfde als 80% korting op € 15.\n\n'
          + 'Heeft Daan gelijk? Reken uit wat je in allebei de gevallen betaalt.\n'
          + 'Leg uit waar zijn truc wél en waar hij níet werkt, en bedenk een procentsom die je met de truc ineens uit je hoofd kunt.',
        hint: 'De korting zelf is in allebei de gevallen even groot. Maar wat betaal je? Waar trek je de korting van af?',
      },

      // ── Doel 4 · windrichtingen en routes ──────────────────────────────
      8: {
        niveau: 'analyseren en evalueren',
        vraag: 'Je loopt een spiraal: 1 stap noord, 2 stappen oost, 3 stappen zuid, 4 stappen west, 5 stappen noord, en zo verder.\n\n'
          + 'Waar ben je na 8 stukken, gezien vanaf je startplek? Hoeveel stappen en in welke windrichting?\n'
          + 'Leg uit hoe je dat bijhoudt zonder alles te tekenen.\n'
          + 'Waar ben je na 100 stukken?',
        hint: 'Houd twee getallen bij: hoeveel stappen noord (zuid telt als min) en hoeveel stappen oost (west telt als min).',
      },
      9: {
        niveau: 'creëren en evalueren',
        vraag: 'Beschrijf een route door de school met alleen windrichtingen en aantallen stappen.\n'
          + 'Voorwaarden: je eindigt precies 10 stappen ten noorden van je start, en je verandert minstens vier keer van richting.\n\n'
          + 'Laat een klasgenoot de route lopen. Kwam hij goed uit?\n'
          + 'Leg uit hoe je je route op papier controleert voordat iemand hem loopt.',
        hint: 'Alles wat je naar het oosten loopt, moet je ook weer naar het westen lopen. Hoe zorg je dat noord en zuid samen op 10 uitkomen?',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BLOK 10 · schatten, komma × komma, breuk↔komma, lijndiagrammen
    // ═══════════════════════════════════════════════════════════════════════
    10: {
      // ── Doel 1 · schattend rekenen ─────────────────────────────────────
      1: {
        niveau: 'analyseren en creëren',
        vraag: 'Schat: hoe vaak klopt je hart in een jaar? En hoeveel stappen zet je in een week?\n\n'
          + 'Leg per schatting uit welke getallen je gebruikt, en hoe ver je er ongeveer naast kunt zitten.\n'
          + 'Bedenk een schatvraag waarbij twee klasgenoten met een goede aanpak tóch heel verschillende antwoorden krijgen.',
        hint: 'Begin klein: hoe vaak per minuut? Maak het dan steeds groter: per uur, per dag, per jaar. Rond onderweg af.',
      },
      2: {
        niveau: 'evalueren',
        vraag: 'Een klas van 29 kinderen gaat naar de dierentuin. Een kaartje kost € 19,75.\n'
          + 'De juf schat: 30 × 20 = 600. De meester schat: 30 × 19 = 570.\n'
          + 'Het echte bedrag is € 572,75.\n\n'
          + 'Welke schatting ligt het dichtst bij? Welke is de beste om te weten hoeveel geld je moet meenemen?\n'
          + 'Leg uit waarom dat niet dezelfde is.',
        hint: 'Bij welke schatting heb je genoeg geld als je precies dat bedrag meeneemt?',
      },

      // ── Doel 2 · vermenigvuldigen met kommagetallen ────────────────────
      3: {
        niveau: 'evalueren',
        vraag: 'De rekenmachine zegt: 29 × 81 = 2349.\n\n'
          + 'Waar staat de komma bij 2,9 × 8,1? En bij 0,29 × 81? En bij 2,9 × 0,81? En bij 0,029 × 0,81?\n'
          + 'Iris zegt: tel de cijfers achter de komma. Leg uit waarom die regel werkt.\n'
          + 'Hoe controleer je met schatten dat je de komma goed hebt gezet?',
        hint: 'Hoeveel cijfers staan er samen achter de komma in de twee getallen? En klopt je antwoord als je schat, bijvoorbeeld 0,3 × 80?',
      },
      4: {
        niveau: 'analyseren en creëren',
        vraag: 'Zonder te rekenen: welke van deze antwoorden zijn groter dan 24?\n\n24 × 0,99     24 : 0,99     24 × 1,01     24 : 1,01\n\n'
          + 'Leg uit hoe je dat ziet.\n'
          + 'Bedenk een deelsom met kommagetallen waarvan het antwoord groter is dan allebei de getallen waarmee je begint.',
        hint: 'Keer iets onder de 1 geeft minder dan je had. Wat doet delen door iets onder de 1?',
      },

      // ── Doel 3 · breuken en kommagetallen ordenen ──────────────────────
      6: {
        niveau: 'analyseren',
        vraag: 'Zet op volgorde van klein naar groot:\n\n3/4     0,7     2/3     0,66     7/10     0,67\n\n'
          + 'Welke zijn precies even groot?\n'
          + 'Welke twee verschillende getallen liggen het dichtst bij elkaar, en hoe dichtbij? Leg uit hoe je dat zeker weet.',
        hint: 'Schrijf alles als kommagetal met drie cijfers achter de komma. Wat is 2/3 dan ongeveer?',
      },
      7: {
        niveau: 'evalueren en creëren',
        vraag: 'Pim zegt: 0,999… (met oneindig veel negens) is net iets minder dan 1.\n'
          + 'Kim zegt: nee, het is precies 1. Want 1/3 = 0,333… en 3 × 1/3 = 1.\n\n'
          + 'Wie heeft gelijk? Leg uit waarom.\n'
          + 'Lukt het je een getal te bedenken dat tussen 0,999… en 1 ligt? Wat zegt dat?',
        hint: 'Als twee getallen verschillen, past er altijd een getal tussen, bijvoorbeeld precies in het midden. Lukt dat hier?',
      },

      // ── Doel 4 · lijndiagrammen en tijd-afstand ────────────────────────
      8: {
        niveau: 'analyseren',
        vraag: 'Anna vertrekt om 9:00 uur en fietst 15 km per uur. Bram vertrekt om 9:20 uur langs dezelfde weg en fietst 20 km per uur.\n\n'
          + 'Teken ze allebei in één tijd-afstand-diagram. Waar kruisen de lijnen, en wat betekent dat?\n'
          + 'Leg uit hoe je aan de lijnen ziet wie sneller gaat.',
        hint: 'Hoe ver is Anna al als Bram vertrekt? Hoeveel km per uur loopt Bram op haar in?',
      },
      9: {
        niveau: 'creëren en analyseren',
        vraag: 'Teken een tijd-afstand-diagram (afstand tot je huis) van een wandeling waarbij je halverwege iets vergeet en terugloopt.\n\n'
          + 'Kan de lijn naar beneden gaan? Kan hij recht omhoog gaan?\n'
          + 'Hoe ziet de lijn eruit als je steeds sneller gaat lopen? Leg uit wat elke vorm betekent.',
        hint: 'Op de as staat de afstand tot je huis. Wat gebeurt er met die afstand als je omkeert? En hoe ziet het eruit als je steeds sneller gaat?',
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
