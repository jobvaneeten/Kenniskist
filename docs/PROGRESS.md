# Sterrenveer — voortgang

Lees dit bestand samen met `README.md`, `DESIGN.md` en `LEVELS.md` aan het begin van elke sessie.

## Status

| Fase | Onderwerp | Status |
|---|---|---|
| 0 | Verkenning en ontwerp | **af** |
| 1 | Vertical slice (engine + level 1-1) | **af** |
| 2 | Wereld 1 compleet | **af** |
| 3 | Wereld 2 — IJsmaan | **af** |
| 4 | Wereld 3 — Vulkaanplaneet | **af** |
| 5 | Wereld 4 — Ruimtestation | **af** |
| 6 | Wereld 5 — Nevelrijk | **af** |
| 7 | Balans en afwerking | **af** |

Het spel is compleet: 80 levels, 5 bazen, 12 characters, 5 werelden met eigen art en muziek, cutscenes
inclusief eindanimatie, winkel, wereldkaart en instellingen.

## Wat er staat

**Engine** (`src/game/`): vaste timestep 60 Hz met interpolatie, AABB-collision per as, coyote time, jump
buffering, variabele spronghoogte, ledge forgiveness, one-way platforms, omgekeerde zwaartekracht als
eigenschap van het lichaam, camera met deadzone en look-ahead, particles uit een pool,
screenshake/hit-stop/flits, chunk-cache voor de tilelagen met een `veranderd`-queue voor kapotte,
onthulde en pulserende tegels.

**Audio**: eigen synth (pulse met duty, triangle, saw, ruis, ADSR, delay), een patroon-sequencer met
lookahead-scheduling, zeven nummers (titel, wereldkaart, wereld 1 t/m 5, baas) en vier jingles, plus ~20
geluidseffecten. Audio start pas na de eerste toets of klik.

**Art**: alles in code. Eigen 5×7 bitmapfont, eigen logo-letterset, per wereld een tileset met autotiling
en twee textuurvarianten per tegel, 5 parallaxlagen met zwevende deeltjes, characters uit
pixeldata-onderdelen via een rig (10 animaties elk), vijf handgetekende bazen.

**Opslag**: `src/game/core/save-adapter.js` is de enige plek die localStorage aanraakt. Drie sleutels met
prefix `kk_sv_`, dus `src/lib/voortgangSync.js` spiegelt ze automatisch naar Supabase. Het saldo wordt
nooit vertrouwd maar altijd herrekend uit munten + bonussen − aankopen. Zie `SAVE-INTEGRATION.md`.

**Tooling**: `npm test` draait vitest (56 tests) plus `validate-levels`, `doeltijden` en `economy`.
`npm run screenshots` maakt met Playwright een plaatje van elk level; `npm run speeltest` speelt het
eerste level van elke wereld door met gescripte toetsinvoer en meet de framerate. Zie `README.md`.

## Gemeten

- 81 screenshots, geen console-errors.
- Speeltest: laagste framerate 56 fps, verder overal 60. Geen enkel level zakt onder de 50.
- De hele route in de app nagelopen met de muis: voorpagina → gast → spellen → Sterrenveer → titel →
  intro-cutscene → wereldkaart → level 1-1 spelend.
- Economie in balans: 5 333 munten verdienbaar, 4 660 aan prijzen (87,4 %), 240 sterren.
- Bereikbaarheid van alle 80 levels nagerekend tegen de echte projectielformules uit `BASIS`.

## Bekende punten

1. **De doeltijden komen uit een formule**, niet uit echte speelsessies (`tools/doeltijden.js`). Ze zijn
   nu drie tot vier keer een rechttoe-rechtaan run, aflopend per wereld. Dat is ijkbaar zodra er echte
   speeltijden van kinderen zijn: pas de factor per wereld aan en draai `--schrijf`.
2. **De speeltest-bot is dom.** Hij rent naar rechts en springt als hij vastloopt; hij haalt de finish in
   drie van de vijf geteste levels. Hij bewijst dat er niets crasht en dat de framerate houdt, niet dat
   een level leuk is.
3. **`sterrenveer-dev.html`** is een ontwikkelpagina en staat bewust niet in
   `build.rollupOptions.input`, dus hij komt niet in de productiebundel.
4. **`npm run lint` geeft 163 meldingen in bestaande bestanden** (`src/portaal/`, `src/games/`), die
   stonden er al. `npx eslint src/game tools` is schoon.

## Als je hier verder gaat

Alles uit de opdracht is af. Wat overblijft is verfijning op basis van echt spelen:

1. Doeltijden ijken zodra er speeltijden zijn (punt 1 hierboven).
2. Moeilijkheidscurve van wereld 4 en 5 nalopen — de bereikbaarheidscontrole zegt dat het kán, niet dat
   het eerlijk voelt.
3. Gamepad- en touchbesturing: `core/input.js` werkt al met acties in plaats van toetsen, dus dat kan
   erbij zonder gameplaycode te raken.
