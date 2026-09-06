# Sterrenveer — voortgang

Lees dit bestand samen met `DESIGN.md` en `LEVELS.md` aan het begin van elke
sessie.

## Status

| Fase | Onderwerp | Status |
|---|---|---|
| 0 | Verkenning en ontwerp | **af** |
| 1 | Vertical slice (engine + level 1-1) | **af** |
| 2 | Wereld 1 compleet | **af** |
| 3 | Wereld 2 — IJsmaan | in uitvoering |
| 4 | Wereld 3 — Vulkaanplaneet | open |
| 5 | Wereld 4 — Ruimtestation | open |
| 6 | Wereld 5 — Nevelrijk | open |
| 7 | Balans en afwerking | open |

## Wat er staat

**Engine** (`src/game/`): vaste timestep 60 Hz met interpolatie, AABB-collision
per as, coyote time, jump buffering, variabele spronghoogte, ledge forgiveness,
camera met deadzone en look-ahead, particles uit een pool, screenshake/hit-stop/
flits, chunk-cache voor de tilelagen.

**Audio**: eigen synth (pulse met duty, triangle, saw, ruis, ADSR, delay), een
patroon-sequencer met lookahead-scheduling, vier nummers (titel, wereldkaart,
wereld 1, baas) en vier jingles, plus ~20 geluidseffecten. Audio start pas na de
eerste toets of klik.

**Art**: alles in code. Eigen 5×7 bitmapfont, eigen logo-letterset, tilesets met
autotiling en twee textuurvarianten per tegel, 5 parallaxlagen met zwevende
deeltjes, characters uit pixeldata-onderdelen via een rig (10 animaties elk).

**Opslag**: `src/game/core/save-adapter.js` is de enige plek die localStorage
aanraakt. Drie sleutels met prefix `kk_sv_`, dus `src/lib/voortgangSync.js`
spiegelt ze automatisch naar Supabase. Zie `SAVE-INTEGRATION.md`.

**Wereld 1**: 15 levels + baaslevel (Slijmkoningin, drie fases), wereldkaart,
titelscherm, pauze, instellingen, winkel met alle 12 characters.

**Tooling**: `npm test` draait vitest (48 tests) plus `validate-levels` en
`economy`. `npm run screenshots` maakt met Playwright een plaatje van elk level
en faalt bij console-errors.

## Bekende punten

1. **Wereld 2 t/m 5 bestaan nog niet.** `economy.js` rekent voor die werelden met
   de geplande aantallen uit `data/werelden.js` en meldt per wereld of het
   gemeten of gepland is. Zodra een wereld compleet is, schakelt hij vanzelf om.
2. **Muziek voor wereld 2-5 ontbreekt.** `LIEDJES` heeft alleen `titel`, `kaart`,
   `w1` en `baas`. Een level met een onbekend nummer speelt gewoon niets; er
   crasht niets.
3. **De tweede en derde ster van een baaslevel** zijn haalbaar maar streng: de
   doeltijd van 180 s is nog niet op echte speeltijd geijkt. Doen in fase 7.
4. **`sterrenveer-dev.html`** is een ontwikkelpagina en staat bewust niet in
   `build.rollupOptions.input`, dus hij komt niet in de productiebundel.
5. **`npm run lint` geeft 163 meldingen in bestaande bestanden** (`src/portaal/`,
   `src/games/`), die stonden er al. `npx eslint src/game tools` is schoon.

## Waar de volgende sessie begint

Fase 3, wereld 2 (IJsmaan):

1. Tegelsoorten voor ijs staan al in `engine/tilemap.js` (`T.IJS`) en
   `art/tegels.js`; wind en breekbaar ijs moeten er nog bij.
2. Vier vijandtypes in `entities/vijanden.js`: pinguïnrobot, ijsstekel,
   sneeuwbalkanon, vrieskwal.
3. Eindbaas IJsworm in `entities/bazen.js` + sprite in `art/bazen.js`.
4. Muziek `w2` in `audio/liedjes.js`.
5. 16 levels in `data/levels/w2/`, geregistreerd in `data/levels/index.js`.
6. Daarna `npm test` en `npm run screenshots`, en de screenshots zelf bekijken.
