# Sterrenveer — ontwerpdocument

## 1. Naam en logo

**Sterrenveer.** Nederlands, kort, en het woord doet dubbel werk: een veer is het klassieke
platformer-element dat je omhoog schiet, en "veer" klinkt licht en zwevend — precies het
bewegingsgevoel dat het spel moet hebben. `sterrenstroom` bestaat al in `public/`, dus geen botsing
in het menu.

**Logo** (in code getekend, `src/game/art/logo.js`): het woord in een eigen pixel-letterset, de eerste
letter een omgevallen V die als veer doorveert. Achter de letters een langzaam draaiende ring van
sterrenstof; de punten van de sterren pulseren op de maat van het titelmuziekje. Bij het openen valt het
woord van boven binnen en veert één keer na (squash & stretch, dezelfde curve als de sprong van de speler).

## 2. Verhaal

Pip is een klein ruimtewezen dat met zijn schip crasht op een groene planeet. Vijf onderdelen liggen
verspreid over vijf werelden en worden elk bewaakt door een eindbaas. Na de vijfde baas is het schip
compleet en vliegt Pip naar huis.

Verteld in beeld, niet in tekst: een intro bij de start, een cutscene na elke baas waarin het onderdeel op
zijn plek klikt, en een slotanimatie na baas 5 waarin Pip opstijgt. Alles staat in
`src/game/scenes/cutscene.js`; het schip wordt daar getekend met precies de onderdelen die je al hebt, dus
je ziet je eigen voortgang terug. Eén regel tekst per scène, altijd door te klikken. Alle spelerstekst
staat in `src/game/data/texts.nl.js`.

## 3. De vijf werelden

| # | Wereld | Palet | Nieuwe mechanic | Vijanden | Eindbaas |
|---|---|---|---|---|---|
| 1 | Kristalwoud | fris groen/turquoise, gloeiende kristallen, twee manen | springen, stampen, breekbare blokken, veren, bewegende platforms | slijmwezen, springspoor, ruimtekwal, kristalkever | Slijmkoningin |
| 2 | IJsmaan | blauw/wit/paars, noorderlicht, sneeuwval | glad ijs, breekbare ijsplatforms, windvlagen | pinguïnrobot, ijsstekel, sneeuwbalkanon, vrieskwal | IJsworm |
| 3 | Vulkaanplaneet | oranje/rood/zwart, hitteflikkering, lava | stijgende lava, zinkende platforms, geisers | lavaspetter, vuurvleermuis, magmakrab, asvlieg | Magmatitaan |
| 4 | Ruimtestation | staalgrijs, neon cyaan/magenta | lopende banden, lasers op timing, zero-g zones, sleutelkaartdeuren | bewakingsdrone, torretje, kortsluitrobot, patrouillebot | Kern-AI |
| 5 | Nevelrijk | diep paars/zwart, sterrenstof, vervormde achtergrond | zwaartekracht omkeren, portalen, verdwijnende platforms | schaduwkloon, nanozwerm, zwaartekrachtwezen, echoslijm | De Verslinder (3 fases, alle mechanics) |

Elke wereld heeft een eigen palet van 24-32 kleuren plus een gedeeld UI-palet, een eigen tileset met
randen/hoeken/variaties, 4-5 parallaxlagen en een eigen muziekloop van 60-120 s.

## 4. Bewegingsgevoel

De belangrijkste getallen, in tiles per seconde bij 60 vaste updates:

| | Waarde | In `BASIS` (px/s) |
|---|---|---|
| Loopsnelheid | 7,0 t/s | `loop` 112 |
| Rensnelheid | 11,0 t/s | `ren` 176 |
| Acceleratie grond / lucht | 45 / 28 t/s² | `accelGrond` 720 / `accelLucht` 448 |
| Wrijving grond / lucht | 60 / 12 t/s² | `wrijvingGrond` 960 / `wrijvingLucht` 192 |
| Wrijving op ijs | 5,6 t/s² | `ijsWrijving` 90 |
| Sprongimpuls | 20,6 t/s (≈ 3,5 tiles hoog) | `sprong` 330 |
| Zwaartekracht stijgen / vallen | 60 / 90,6 t/s² | `zwaartekrachtOp` 960 / `zwaartekrachtNeer` 1450 |
| Max valsnelheid | 22 t/s | `maxVal` 352 |
| Coyote time | 6 frames | `coyote` |
| Jump buffer | 6 frames | `buffer` |
| Stampbounce / vastgehouden | 15,6 / 20,6 t/s | `stampBounce` 250 / `stampBounceHoog` 330 |
| Duw van een lopende band | 3,75 t/s | `duwSnelheid` 60 |

Variabele spronghoogte: bij loslaten wordt een opwaartse snelheid boven 9,4 t/s afgekapt
(`sprongAfkap` 150). Ledge forgiveness: 3 px horizontale correctie als je met je hoofd net naast een
blok omhoog springt. Collision is AABB per as (eerst X, dan Y) zodat je nooit in een hoek blijft haken.

`tools/doeltijden.js` en `tools/validate-levels.js` lezen deze getallen rechtstreeks uit `BASIS`, zodat
een aanpassing aan het bewegingsgevoel meteen zichtbaar wordt in de doeltijden en de bereikbaarheids-
controle. Wie hier iets verandert, draait daarna `node tools/doeltijden.js --schrijf`.

**Omgekeerde zwaartekracht** is geen truc bovenop de physics maar zit erin: `Lichaam.omgekeerd` draait
om welk contact als "grond" telt, en `Speler._kant` (+1 of −1) draait sprong, val, animatie en het
tekenen mee. Alleen de speler gebruikt het; vijanden lopen gewoon door.

Vaste timestep van 1/60 s met accumulator; rendering interpoleert tussen twee states en snapt daarna naar
hele pixels, zodat het vloeiend is én scherp blijft.

## 5. Levens, checkpoints en sterren

3 levens per level, maximaal 5. Eén hit = één leven, daarna 90 frames onkwetsbaar en knipperen. Elk level
heeft minstens één checkpoint; levels langer dan 100 tiles hebben er twee. Doodgaan met levens over =
respawn bij het checkpoint binnen ~1 s, de timer loopt door. Alle levens op = game over, level opnieuw
vanaf het begin met 3 levens en een gereset timer.

Drie sterren per level, elk onafhankelijk en blijvend:
1. Alle munten van dit level verzameld (mag over meerdere pogingen).
2. Gehaald zonder een leven te verliezen.
3. Gehaald binnen de doeltijd.

80 levels × 3 = **240 sterren**.

## 6. Economie

**De regel:** elke munt is één keer geld waard, voor altijd. Munten die je in een poging pakt zijn
*pending* tot de finish; haal je die, dan worden ze definitief. Ga je dood met levens over, dan houd je je
pending munten en komen ze niet terug. Bij game over vervallen ze en staan ze er bij een nieuwe poging
gewoon weer. Al definitief gepakte munten verschijnen als grijze, doorzichtige **geest-munten**: zichtbaar
voor de route, maar zonder geluid, zonder punten. De HUD toont `munten 12/40 (28 al verzameld)`.

Gemeten aantallen (alle 80 levels bestaan; `tools/economy.js` telt ze uit de echte leveldata):

| Wereld | Munten per level | 15 levels | Baas | Bonus 15×25 | Baasbonus |
|---|---|---|---|---|---|
| 1 | ~30 | 450 | 20 | 375 | 100 |
| 2 | ~34 | 510 | 20 | 375 | 100 |
| 3 | ~38 | 570 | 20 | 375 | 100 |
| 4 | ~42 | 630 | 20 | 375 | 100 |
| 5 | ~46 | 690 | 20 | 375 | 100 |

Totaal verdienbaar: 2 958 munten + 2 375 bonus = **5 333**. Eindig en exact.

**Prijzen** (som 4 660 = 87,4 % van het totaal):

| Character | Prijs | Eigenschap | Balans |
|---|---|---|---|
| Pip | gratis | gebalanceerd | — |
| Bolt | 320 | +12 % loopsnelheid | iets kortere sprong |
| Luna | 390 | valt 15 % langzamer | lagere topsnelheid |
| Rex | 460 | start met 4 levens | 8 % trager |
| Zippy | 530 | +10 % spronghoogte | glijdt verder uit |
| Magno | 610 | kleine muntmagneet | iets lagere sprong |
| Frost | 700 | glijdt niet uit op ijs | trager accelereren |
| Ember | 800 | immuun voor lavaspetters | valt sneller |
| Echo | 850 | langere onkwetsbaarheid | 5 % trager |
| Astra | 60 ★ | hogere bounce vanaf vijanden | — |
| Nebula | 140 ★ | één luchtcorrectie per sprong | — |
| Solaris | 220 ★ | goud, spoor van sterrenstof | prestige, als Pip |

Niets is strikt beter. Elk level en elke ster blijft met elk character haalbaar; `validate-levels`
controleert de sprongafstanden tegen het **zwakste** profiel, niet tegen Pip.

**Aanname, expliciet vastgelegd.** De prompt geeft drie prijsrichtlijnen die elkaar tegenspreken: het
duurste character zou "75 tot 80 % van alle coins" vereisen, terwijl alle acht samen "85 tot 90 %" kosten.
Dat kan niet allebei — de duurste zou dan bijna net zo veel kosten als alle acht samen, en de andere zeven
zouden samen goedkoper zijn dan de goedkoopste. Aangehouden interpretatie, en dit is wat `economy.js`
afdwingt:

- goedkoopste betaalbaar rond level 1-6/1-7 (ongeveer de helft van wereld 1);
- som van de acht: 85-90 % van het totaal verdienbare;
- duurste: 17-28 % van die som, en pas te betalen als je ver in wereld 5 zit;
- het script faalt met exit 1 buiten die marges, zodat het in `npm test` meeloopt.

Het script rekent per wereld met de echte leveldata zodra die bestaat en anders met de geplande aantallen
uit `werelden.js`; het meldt in de uitvoer welk deel gepland en welk deel gemeten is. Nu alle vijf de
werelden af zijn, is alles gemeten.

## 7. Schermen

Titel → wereldkaart → level → resultaten. Daarnaast winkel, pauze, instellingen, cutscene.

- **Titel:** geanimeerd logo, parallax, het uitgeruste character dat idle staat, sterrentotaal, knoppen
  Spelen / Winkel / Instellingen.
- **Wereldkaart:** planeetoppervlak met knooppunten op een pad. Per knooppunt levelnaam, 0-3 sterren en
  `munten/totaal`. Het baasknooppunt is groter en pulseert rood. Het character loopt zichtbaar van
  knooppunt naar knooppunt. Vanaf de kaart naar de winkel en naar andere ontgrendelde werelden.
- **Resultaten:** munten dit level, de drie sterren die één voor één indraaien, tijd tegen doeltijd, nieuw
  saldo dat oploopt, knoppen Volgende / Opnieuw / Kaart.
- **Winkel:** hangar met het character op een langzaam draaiend platform, live geanimeerd. Eigenschap in
  één Nederlandse zin. Knopstaten Koop (prijs) / Uitrusten / Uitgerust / Nog niet ontgrendeld (x sterren).
  Vergrendeld = silhouet. Bevestiging bij aankoop, saldo telt geanimeerd af.

**HUD:** levens linksboven als kleine harten, munten linksmidden, tijd rechtsboven, actieve power-up
rechtsonder met aflopende ring. Verder niets.

## 8. Techniek

Basisresolutie **480×270**, integer-scaling naar het venster met letterbox. `imageSmoothingEnabled = false`,
camera en sprites op hele pixels. Tiles 16×16, speler 16×24, vijanden 16-32, bazen 64-128.

Sprites staan als pixeldata in `src/game/art/` (strings met een paletlegenda) en worden bij het opstarten
één keer naar offscreen canvases gebakken. Daarna alleen nog `drawImage`. Tilelagen worden per chunk van
16×16 tiles gecached. Particles komen uit een pool. Geen allocaties in de update-loop.

Elk wereldpalet in `art/palet.js` heeft een veld **`dek`** dat bepaalt wat er bovenop de grondtegels
groeit: `begroeiing` (gras en plukjes, wereld 1, 2 en 5), `kaal` (alleen steenscherven, wereld 3) of
`paneel` (metalen naadlijnen en boutjes, wereld 4). Dat veld bestaat omdat wereld 4 er met grasplukjes
uitzag als een snoepwinkel in plaats van een verlaten ruimtestation.

De tile-enum in `engine/tilemap.js` telt 14 soorten (vast, ijs, breekbaar, broos, one-way, stekel, lava,
lopende band links/rechts, onzichtbaar, deur en twee pulserende groepen). Per poging houdt de tilemap
apart bij wat er kapot is, wat onthuld is, welke deuren open staan en in welke fase de pulserende tegels
staan; wijzigingen gaan via een `veranderd`-queue die de renderer leegtrekt en die alleen de geraakte
chunks opnieuw bakt.

Audio: eigen synth op de Web Audio API (pulse met variabele duty, triangle, saw, noise), ADSR, delay,
drie bussen (master/muziek/sfx) en een patroon-sequencer. Start pas na de eerste toetsaanslag of klik.
Bij het openen van het spel wordt de shell-muziek van Kenniskist gedempt via `window.KennisKist.muziekDemp`
en bij het verlaten hersteld.

Besturing: pijltjes of WASD, spatie/omhoog/W springen, Shift of X rennen, Esc pauze, Enter bevestigen.
Invoer loopt via een `Input`-module met acties (`links`, `rechts`, `spring`, `ren`, `pauze`), zodat gamepad
en touch later kunnen worden toegevoegd zonder gameplaycode te raken. Menu's zijn ook met de muis te
bedienen.

## 9. Aannames

1. Nederlandse commentaar en domein-identifiers, conform de rest van `src/`; de prompt vroeg Engels, de
   projectconventie wint.
2. Geen SQL-migratie: `game_voortgang` kan willekeurige sleutels aan, dus `kk_sv_*` past zonder
   schemawijziging.
3. Munten los van `kk_curuntie`, ook zonder de eenmalige seed die andere spellen wel doen — de economie is
   exact berekend en verdraagt geen extern startsaldo.
4. Munten als hex-bitfield in plaats van een lijst met id's (zie `SAVE-INTEGRATION.md` §5).
5. Prijsrichtlijnen geïnterpreteerd zoals in §6 beschreven.
6. Het spel draait in `src/game/` als vanilla ES modules en wordt gemount door een dunne React-wrapper,
   niet als losse pagina in `public/` zoals Fruitsabel — dat levert bundling, HMR en ESLint op voor ~80
   levelbestanden.
