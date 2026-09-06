# Opslag in Kenniskist — hoe Sterrenveer daarop aansluit

Verkenning van de bestaande opslaglaag, vastgelegd vóór er gameplay-code geschreven werd.
Conclusie vooraf: er is een volledig werkende Supabase-integratie. Er hoeft niets aan auth te
gebeuren en er is geen databasemigratie nodig.

## 1. De drie lagen

```
spel  →  localStorage.setItem('kk_…', …)
              │
              │  Storage.prototype is gepatcht
              ▼
      src/lib/voortgangSync.js   ──debounce 2s──►  Supabase-tabel game_voortgang
              ▲
              │  hydrateer() vóór de eerste render
      src/main.jsx
```

`src/lib/voortgangSync.js` is een **transparante spiegel**. Hij patcht `Storage.prototype.setItem`
en `removeItem`, en plant elke schrijfactie naar een sleutel die aan `moetSyncen()` voldoet. De
module-comment zegt waarom: de 158 bestaande `localStorage`-aanroepen in `src/` en `public/` hoefden
niet aangepast te worden, en geen enkel spel weet dat Supabase bestaat.

**Welke sleutels syncen** (`voortgangSync.js:12-28`): prefix `kk_`, `jj_`, `td_` of `bl_`, plus de losse
sleutels `astro_progress` en `glitch_de_linde_v2`. Uitgezonderd in `NIET_SYNCEN`: `kk_lootbox_muted`,
`kk_playername`, `kk_actieve_leerling`, `kk_sessie`, `kk_profiel_cache`, `kk_actieve_opdracht`.

**Sterrenveer gebruikt daarom de prefix `kk_sv_`** en krijgt de synchronisatie gratis.

## 2. De tabel

`supabase/migrations/0001_init.sql` — `game_voortgang(leerling_id, sleutel, data, school_id, bijgewerkt_op)`
met unieke sleutel `(leerling_id, sleutel)`.

```sql
-- Uitsluitend de leerling zelf. Hier komt geen leerkracht-policy. Nooit.
create policy voortgang_eigen on game_voortgang for all to authenticated
  using      (leerling_id = (select auth.uid()))
  with check (leerling_id = (select auth.uid()) and school_id = (select hulp.mijn_school()));
```

Harde scheiding in het platform: `resultaten` is voor de leerkracht, `game_voortgang` is privé voor de
leerling. Spelvoortgang van Sterrenveer hoort dus in `game_voortgang` en gaat nooit naar `resultaten`.

**`data` is altijd de ruwe localStorage-string, nooit geparsed.** Zo blijven `"0"` en `0`, `"true"` en
`true` onderscheidbaar op de terugweg. De adapter houdt zich daaraan: hij `JSON.stringify`t zelf en geeft
een string door.

## 3. De levenscyclus

| Moment | Wat er gebeurt |
|---|---|
| Opstarten | `hydrateer()` in `src/main.jsx:9-16`, met een `Promise.race` van 8 s zodat de site nooit blijft hangen. Haalt alle rijen op en zet ze in localStorage met `interneSchrijfactie=true`. |
| Ander kind op hetzelfde apparaat | `hydrateer()` vergelijkt `kk_actieve_leerling` met `session.user.id`; verschilt het, dan `wisSleutels()` vóór het ophalen. |
| Sessie verlopen | Geen sessie maar wel `kk_actieve_leerling` gezet → alles wissen. Een apparaat dat nooit ingelogd was houdt zijn gastvoortgang. |
| Schrijven | Debounce 2 s, harde cap 10 s, dan één `upsert` met `onConflict: 'leerling_id,sleutel'`. |
| Tab verbergen / sluiten | `noodFlush()` via `fetch(…, { keepalive: true })` — `sendBeacon` kan geen `Authorization`-header zetten. |
| Uitloggen | `sessie.jsx:98-103` doet `flush()` → `wisAlles()` → `signOut()` → reload. |
| Gastmodus | `Root.jsx:71-74` doet eerst `wisAlles()`, dan `<App gast />`. |

## 4. Randgevallen waar Sterrenveer rekening mee houdt

1. **Gastvoortgang gaat bij inloggen niet vanzelf omhoog.** `hydrateer()` schrijft met
   `interneSchrijfactie=true`, dus lokale sleutels die nog niet in de cloud staan worden nooit als "vuil"
   gepland; ze vertrekken pas zodra een spel die sleutel opnieuw schrijft. **Oplossing:** de adapter doet
   één expliciete `bewaar()` bij het openen van het spel, zodat de drie `kk_sv_`-sleutels altijd minstens
   één keer worden aangeboden.
2. **De merge is "cloud wint", per sleutel, zonder tijdstempel.** Twee apparaten tegelijk betekent: laatste
   flush wint. **Oplossing:** de adapter merget bij het laden op veldniveau (zie §6) in plaats van te
   vertrouwen op de sleutel-merge, en houdt de drie sleutels klein en onafhankelijk zodat een botsing
   hooguit één domein raakt.
3. **`noodFlush()` negeert `verwijderdeSleutels`** (`voortgangSync.js:89`). Sterrenveer verwijdert nooit
   een sleutel — resetten schrijft een lege structuur. Zo kan er niets terugkomen bij de volgende hydrate.
4. **De 8s-timeout laat `hydrateer()` doorlopen.** Komt hij ná de eerste render terug, dan verandert
   localStorage terwijl de game al draait. **Oplossing:** de adapter leest niet één keer bij het opstarten
   maar bij het openen van de titelscène, en luistert op het `storage`-event zolang de speler in een menu
   staat (nooit tijdens een level).

## 5. De drie sleutels van Sterrenveer

| Sleutel | Inhoud |
|---|---|
| `kk_sv_progress` | `{ v: 1, levels: { "w1-l03": { c: 1, s: [1,0,1], t: 84.3, m: "1f3a", b: 1 } } }` |
| `kk_sv_wallet` | `{ v: 1, munten: 1240, bezit: ["pip","bolt"], uitgerust: "bolt" }` |
| `kk_sv_instellingen` | `{ v: 1, muziek: 0.7, sfx: 0.9, shake: true }` |

Velden kort gehouden omdat elke wijziging de hele rij opnieuw uploadt: `c` = completed, `s` = sterren,
`t` = beste tijd, `m` = masker van gepakte munten, `b` = bonus uitbetaald.

**`m` is een hex-bitfield**, niet een lijst met id's. De prompt stelde `coinsCollected: ["w1-l03-c01", …]`
voor; bij 80 levels × 40 munten is dat ~40 KB die bij elke gepakte munt opnieuw de lijn over gaat. Als
bitfield is het ~1 KB voor het hele spel. Bit *n* = de *n*-de munt in leesvolgorde van de tilemap
(regel voor regel, links naar rechts). `tools/validate-levels.js` bewaakt die volgorde met een hash per
level, zodat een gewijzigde map niet stil andermans munten "al gepakt" maakt.

## 6. Merge-regels in de adapter

Bij het laden wordt de cloudwaarde (die op dat moment al in localStorage staat) gecombineerd met wat de
adapter in geheugen had:

| Veld | Regel |
|---|---|
| `m` (munten-masker) | bitwise OR |
| `s` (sterren) | OR per ster |
| `c`, `b` | OR |
| `t` (beste tijd) | minimum van de niet-nul waarden |
| `bezit` | unie |
| `munten` | **herberekend**: som van alle gepakte munten + uitbetaalde bonussen − prijs van alles in `bezit`. Nooit "het hoogste saldo wint". |

Dat laatste is de reden dat `b` per level wordt bijgehouden: zonder die vlag is het saldo niet
reproduceerbaar en zou een merge geld kunnen verzinnen of laten verdampen.

## 7. Munten staan los van `kk_curuntie`

De commits `2fe1e28` en `1365901` hebben munten per spel gescheiden: elk spel krijgt een eigen potje,
eenmalig geseed vanuit `kk_curuntie` met een `=== null`-check. Sterrenveer volgt dat, maar **zonder de
seed** — het spel heeft een eigen, exact berekende economie (zie `DESIGN.md` §6) en zou uit balans raken
als er een willekeurig startsaldo uit de kledingkast binnenkwam. `kk_curuntie` wordt niet gelezen en niet
geschreven.

## 8. Wat niet is aangeraakt

`src/lib/sessie.jsx`, `src/lib/supabase.js`, `src/lib/voortgangSync.js`, `supabase/migrations/`,
`public/kenniskist-login.js`, `src/worker.js`.
