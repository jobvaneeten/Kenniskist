# Sterrenveer

Een 2D ruimte-platformer in Kenniskist: 5 werelden × 16 levels, 12 speelbare figuurtjes, alles in code
getekend en gesynthetiseerd. Geen game-engine, geen externe plaatjes of geluidsbestanden, geen downloads.

Deze map bevat vier documenten. Lees ze in deze volgorde als je nieuw bent:

| Bestand | Waarover |
|---|---|
| `DESIGN.md` | naam, verhaal, de vijf werelden, bewegingsgevoel, sterren, economie, schermen, techniek, aannames |
| `LEVELS.md` | alle 80 levels met naam, gimmick, moeilijkheid en doeltijd |
| `SAVE-INTEGRATION.md` | hoe voortgang via `kk_sv_*` bij Supabase terechtkomt, en de randgevallen |
| `PROGRESS.md` | wat af is en waar de volgende sessie begint |

## Starten

```bash
npm install
npm run dev
```

Dan zijn er twee ingangen:

- **In de app**, zoals een leerling het ziet: <http://localhost:5173> → Spellen → Sterrenveer.
  Dit is de enige versie die in productie bestaat.
- **Los, voor ontwikkelen**: <http://localhost:5173/sterrenveer-dev.html>. Deze pagina staat bewust niet
  in `build.rollupOptions.input`, dus hij komt niet in de productiebundel.

De dev-pagina kent twee parameters:

| Parameter | Effect |
|---|---|
| `?level=w3-l07` | start meteen dat level in plaats van het titelscherm |
| `&alles=1` | zet alle 80 levels op vrijgespeeld (alleen hier, nooit in het spel zelf) |

`window.sterrenveer` geeft toegang tot het draaiende spel (`.scene`, `.lus`); de
Playwright-tests gebruiken dat om te wachten tot een level echt geladen is.

Audio start pas na de eerste toets of klik — een eis van de browser, geen bug.

## Besturing

Pijltjes of WASD lopen, spatie/omhoog/W springen, Shift of X rennen, Esc pauze, Enter bevestigen.
Menu's zijn ook met de muis te bedienen.

## Testen

```bash
npm test
```

Dat is vier dingen achter elkaar, en alle vier falen met exit 1:

1. **`vitest run`** — 56 unit tests over physics en collision (`engine/physics.test.js`), de invoer
   (`core/input.test.js`: aanslagen en klikken die tussen twee updates in vallen), de save-adapter
   (`core/save-adapter.test.js`: merge-regels, bitfield-round-trip, geest-munten, hersteld saldo) en de
   economie (`data/economie.test.js`, waaronder de eis dat geen enkel character strikt beter is).
2. **`node tools/validate-levels.js`** — leest alle 80 levels en controleert rijlengtes, één start en één
   finish, checkpoints, muntaantallen binnen 25-60, onbekende legendatekens, baasmarkeringen en
   **bereikbaarheid**: elke sprong wordt nagerekend met de echte projectielformules uit `BASIS`, inclusief
   veren, geisers, bewegende en zinkende platforms, onzichtbare blokken, zero-g-zones, plafondroutes en
   portaalparen.
3. **`node tools/doeltijden.js`** — controleert of elke doeltijd binnen 12 % van de formule ligt.
4. **`node tools/economy.js`** — telt alle munten en bonussen uit de echte leveldata en controleert de
   prijzen tegen de marges uit `DESIGN.md` §6.

Verder, los te draaien:

```bash
npm run rijen           # meldt álle rijlengte-fouten tegelijk, handig tijdens levelbouw
npm run doeltijden -- --schrijf   # herberekent de doeltijd in elk levelbestand
npm run screenshots     # Playwright: één plaatje per level in screenshots/, faalt bij console-errors
npm run speeltest       # Playwright: speelt het eerste level van elke wereld door en meet de framerate
```

`npm run lint` geeft 163 meldingen in bestanden die er al stonden (`src/portaal/`, `src/games/`).
`npx eslint src/game tools` is schoon en is de check die telt voor dit spel.

## Waar wat staat

```
src/game/
  main.js          Spel-klasse, integer letterbox, startSterrenveer()
  dev.js           ingang voor sterrenveer-dev.html
  core/            lus, invoer, camera, sprite-atlas, save-adapter
  engine/          physics, tilemap, tilerenderer, particles, fx
  entities/        speler, 20 vijandsoorten, items, platforms, gevaren, 5 bazen
  scenes/          titel, wereldkaart, level, resultaten, winkel, instellingen, cutscene
  ui/              eigen 5×7 bitmapfont, panelen, hud, overgangen
  art/             paletten, tegels, achtergronden, characters, objecten per wereld, bazen, logo
  audio/           synth, sequencer, 7 nummers + 4 jingles, ~20 geluidseffecten
  data/            werelden, characters, texts.nl.js, levels/w1..w5/l01..l16.js
src/games/SterrenveerGame.jsx   dunne React-wrapper (canvas + opruimen + shell-muziek dempen)
tools/             validate-levels, economy, doeltijden, rijen, screenshot-levels, speeltest
```

## Een level toevoegen of wijzigen

Levels zijn ASCII-kaarten. Bouw elke rij uit stukken met een expliciete breedte
(`p(12) + 'S' + p(4) + munt(6) + …`), nooit als één lange handgetypte string — dan is uitlijnen rekenwerk
in plaats van tellen. De helpers staan in `src/game/data/levels/bouw.js`, de legenda in
`src/game/engine/tilemap.js`. `maakLevel()` gooit meteen als een rij een andere lengte heeft dan rij 0.

Na een wijziging: `npm run rijen`, dan `npm test`, dan `npm run screenshots` en het plaatje ook echt
bekijken. Verandert de route of de hoeveelheid obstakels, draai dan ook
`node tools/doeltijden.js --schrijf`.

## Grenzen

Deze bestanden horen bij de login- en synclaag van Kenniskist en worden door dit spel **niet** aangeraakt:
`src/lib/sessie.jsx`, `src/lib/supabase.js`, `src/lib/voortgangSync.js`, `supabase/migrations/`,
`public/kenniskist-login.js`, `src/worker.js`. Sterrenveer schrijft alleen naar drie sleutels met prefix
`kk_sv_`, en die worden door de bestaande shim vanzelf gesynchroniseerd. Zie `SAVE-INTEGRATION.md`.
