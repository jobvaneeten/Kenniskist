# Sterrenveer — levelplan

80 levels: 5 werelden × (15 regulier + 1 baas). Moeilijkheid 1-10 loopt over het hele spel, niet per
wereld — 1-15 is makkelijker dan 3-01.

De doeltijd (in seconden) staat niet meer met de hand in dit document maar wordt afgeleid door
`tools/doeltijden.js`: een schatting van een rechttoe-rechtaan run maal een factor die per wereld
afloopt (4,4 in wereld 1 tot 3,2 in wereld 5; 2,8 voor baaslevels). `npm test` faalt zodra een
opgeslagen doeltijd meer dan 12% van die formule afwijkt, en `node tools/doeltijden.js --schrijf`
werkt ze bij. De tabellen hieronder tonen de waarden zoals ze nu in de levelbestanden staan.

## Wereld 1 — Kristalwoud

Leert de basis. Geen enkel level hier kan je doden door een hindernis die je niet ziet aankomen.

| # | Naam | Gimmick | Moei. | Doel |
|---|---|---|---|---|
| 1-01 | Zachte landing | Vlakke grond, eerste munten, één slijmwezen om op te stampen | 1 | 80 |
| 1-02 | Over de kloof | Gaten van oplopende breedte, coyote time voelbaar maken | 1 | 80 |
| 1-03 | Kristalkloof | Eerste veren; de munten liggen op de hoge route | 2 | 90 |
| 1-04 | Breekbaar | Barstende blokken, van onderaf doorheen slaan | 2 | 80 |
| 1-05 | Sporenveld | Springsporen die inzakken voor ze springen; ritme | 3 | 100 |
| 1-06 | De heenweg | Eerste bewegende platforms, horizontaal | 3 | 115 |
| 1-07 | Kwallenlucht | Zwevende ruimtekwallen die je níet kunt stampen | 3 | 90 |
| 1-08 | Onder de wortels | Krappe grot, laag plafond, geen rennen mogelijk | 4 | 95 |
| 1-09 | Veer na veer | Ketting van veren, één lange stijgroute | 4 | 100 |
| 1-10 | Het kevernest | Kristalkevers met schild: twee keer stampen | 4 | 100 |
| 1-11 | Twee manen | Verticaal: negen richels om en om, zonder veer | 5 | 90 |
| 1-12 | Glijbaan | Steile afdaling op rensnelheid, alles op reflex | 5 | 100 |
| 1-13 | Verstopt | Munten achter onzichtbare blokken; zonder zoeken geen muntster | 5 | 85 |
| 1-14 | De hoge route | Twee routes: veilig laag, lonend hoog | 6 | 100 |
| 1-15 | Voor de troon | Alles uit wereld 1 door elkaar, oplopend tempo | 6 | 115 |
| 1-16 | **Slijmkoningin** | Baas: stampen, deelt zich, spuugt slijmballen | 6 | 180 |

## Wereld 2 — IJsmaan

Nieuw: glad ijs, breekbare ijsplatforms, windvlagen.

| # | Naam | Gimmick | Moei. | Doel |
|---|---|---|---|---|
| 2-01 | Eerste stap op ijs | Steen en ijs om en om, leert remmen | 4 | 80 |
| 2-02 | Slippartij | IJs tot aan de rand van elk gat | 5 | 85 |
| 2-03 | Dun ijs | Platen die barsten zodra je erop staat | 5 | 80 |
| 2-04 | Tegen de wind | Constante wind naar links | 5 | 95 |
| 2-05 | Windstoten | Wind zwelt aan en valt weg op een cadans van 3,5 s | 6 | 95 |
| 2-06 | Pinguïnpatrouille | Pinguïnrobots die terugschieten | 6 | 100 |
| 2-07 | Noorderlicht | Verticale klim, half steen half dun ijs per richel | 6 | 85 |
| 2-08 | Sneeuwbalkanonnen | Kanonnen op timing, dekking zoeken | 6 | 100 |
| 2-09 | De vrieskloof | IJs + wind + gaten samen | 7 | 95 |
| 2-10 | Stekelgang | Vallende ijskegels boven, stekels onder | 7 | 105 |
| 2-11 | Spiegelmeer | Twee routes tegelijk zichtbaar, halverwege wisselbaar | 7 | 95 |
| 2-12 | Lawine | Rugwind over glad ijs, niet aarzelen | 7 | 90 |
| 2-13 | Onder het ijs | Donkere grot, beperkt zicht rond de speler | 7 | 75 |
| 2-14 | De schans | Vijf ijseilanden; de vlagen bepalen wanneer je gaat | 8 | 100 |
| 2-15 | Kristalvorst | Alles uit wereld 1 en 2 | 8 | 120 |
| 2-16 | **IJsworm** | Baas: duikt door het ijs, drie fases | 8 | 175 |

## Wereld 3 — Vulkaanplaneet

Nieuw: stijgende lava, zinkende platforms, geisers.

| # | Naam | Gimmick | Moei. | Doel |
|---|---|---|---|---|
| 3-01 | Warme grond | Eerste lavaplassen, eerste zinkende platforms | 5 | 85 |
| 3-02 | Geiserveld | Geisers als verticale lift | 6 | 90 |
| 3-03 | Het stijgt | Eerste stijgende lava, korte steile klim | 6 | 65 |
| 3-04 | Vuurvleermuizen | Hangen stil tot je eronder komt, duiken dan | 6 | 95 |
| 3-05 | Magmakrabben | Pantser aan de bovenkant: alleen van opzij | 7 | 85 |
| 3-06 | Zinkend pad | Alleen zinkende platforms, nooit stilstaan | 7 | 95 |
| 3-07 | Spetterregen | Lavaspetters uit de diepte op vaste cadans | 7 | 85 |
| 3-08 | De schoorsteen | Verticale klim, lava stijgt mee | 7 | 80 |
| 3-09 | Asvliegen | Zwerm die de route blokkeert | 7 | 90 |
| 3-10 | Twee kraters | Splitsing: geiserroute of platformroute | 8 | 110 |
| 3-11 | Hitteflikkering | Vertekend beeld, leesbaarheid als uitdaging | 8 | 90 |
| 3-12 | Snelweg van steen | Twee bruggen van zinkende platforms, één rustpunt | 8 | 120 |
| 3-13 | Diep in de berg | Langste grot van het spel, twee checkpoints | 8 | 100 |
| 3-14 | Het gietkanaal | Lavastromen als bewegende muren | 9 | 115 |
| 3-15 | Voor de titaan | Alles uit wereld 1-3 | 9 | 110 |
| 3-16 | **Magmatitaan** | Baas: slaat de vloer weg, lava stijgt per fase | 9 | 175 |

## Wereld 4 — Verlaten ruimtestation

Nieuw: lopende banden, lasers op timing, zero-g zones, sleutelkaartdeuren.

| # | Naam | Gimmick | Moei. | Doel |
|---|---|---|---|---|
| 4-01 | Stroom erop | Eerste lopende banden | 6 | 70 |
| 4-02 | Lasergang | Lasers om de beurt aan en uit | 7 | 95 |
| 4-03 | Zwaartekracht uit | Eerste zero-g zone | 7 | 70 |
| 4-04 | Sleutelkaart | Kaart ligt op de terugweg, deur aan het eind | 7 | 75 |
| 4-05 | Drones | Vast baantje tot ze je zien; het oog verkleurt vóór de duik | 8 | 80 |
| 4-06 | Torretjes | Geschutskoepels, dekking gebruiken | 8 | 85 |
| 4-07 | Kortsluiting | Robots die knipperen en ontploffen | 8 | 75 |
| 4-08 | De lus | Banden in twee richtingen door elkaar | 8 | 75 |
| 4-09 | Zwevend | Hele gang zonder zwaartekracht, drones zweven mee | 8 | 80 |
| 4-10 | Machinekamer | Verticale lasers op een strak ritme van twee tellen | 9 | 110 |
| 4-11 | Twee kaarten | Tweede kaart achter de eerste deur: volgorde ligt vast | 9 | 80 |
| 4-12 | Noodverlichting | Licht valt weg op een vast ritme, route onthouden | 9 | 70 |
| 4-13 | De schacht | Verticale val met zenders onderweg | 9 | 75 |
| 4-14 | Serverhal | Dichtste vijandbezetting van het spel | 9 | 105 |
| 4-15 | Naar de kern | Alles uit wereld 1-4 | 10 | 95 |
| 4-16 | **Kern-AI** | Baas: schakelt zwaartekracht, drie fases | 10 | 175 |

## Wereld 5 — Nevelrijk bij het zwarte gat

Nieuw: zwaartekracht omkeren, portalen, verdwijnende platforms.

| # | Naam | Gimmick | Moei. | Doel |
|---|---|---|---|---|
| 5-01 | Ondersteboven | Eerste zwaartekrachtplaten | 8 | 70 |
| 5-02 | Poortjes | Eerste portalen; gelijke kleur hoort bij elkaar | 8 | 70 |
| 5-03 | Nu je me ziet | Verdwijnende platforms, twee groepen om de 1,5 s | 8 | 90 |
| 5-04 | Schaduwkloon | Kloon die je bewegingen 1 s later herhaalt | 9 | 75 |
| 5-05 | Nanozwerm | Zwerm die de route langzaam dichttrekt | 9 | 80 |
| 5-06 | Heen en weer | Portalen + omkering samen | 9 | 75 |
| 5-07 | Zwaartekrachtwezens | Wezens die trekken in plaats van pijn doen | 9 | 80 |
| 5-08 | De trechter | Twee wezens in het midden trekken alles naar zich toe | 9 | 70 |
| 5-09 | Echoslijm | Slijm dat terugkomt waar het verslagen werd | 9 | 80 |
| 5-10 | Spiegelgang | Heen én terug ondersteboven; platen aan weerskanten | 10 | 85 |
| 5-11 | Sterrenstof | Beperkt zicht, munten wijzen de weg | 10 | 70 |
| 5-12 | Het weefsel | Vier portaalparen door elkaar | 10 | 80 |
| 5-13 | Vrije val | Lange val, alles op reactie | 10 | 65 |
| 5-14 | De rand | Zwaartekracht draait vanzelf om, elke 4 s | 10 | 80 |
| 5-15 | Alles tegelijk | Elke mechanic uit het spel, één keer | 10 | 120 |
| 5-16 | **De Verslinder** | Baas: drie fases, vanaf fase 2 draait hij de zwaartekracht | 10 | 175 |

## Muntverdeling

Per wereld gemiddeld 30 / 34 / 38 / 42 / 46 munten per regulier level, altijd binnen 25-60. Baaslevels
20. `tools/validate-levels.js` bewaakt de grenzen, `tools/economy.js` het totaal.
