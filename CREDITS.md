# Herkomst van materiaal in Kenniskist

Overzicht van waar het materiaal in `public/` en de dependencies vandaan komen,
en wat de licentie toestaat. Bedoeld als checklist bij commercieel gebruik.

## Vrij te gebruiken, ook commercieel

| Onderdeel | Bron | Licentie | Naamsvermelding |
|---|---|---|---|
| `public/twemoji/` | Twemoji (Twitter/X) | CC-BY 4.0 | **Verplicht** — staat in de footer van de voorpagina |
| `public/Towerdefence/` (tiles, UI, particles) | Kenney | CC0 | Niet verplicht, staat er wel |
| `public/tex/`, `public/env/` | Poly Haven | CC0 | Niet verplicht, staat er wel |
| Lettertypen Nunito, Baloo 2 | Google Fonts | SIL Open Font License | Niet verplicht |
| React, Phaser, Colyseus, Supabase-client, Vite, Wrangler | npm | MIT | Licentietekst meeleveren in de bundel |
| Babylon.js (core + loaders), sharp | npm | Apache-2.0 | Licentietekst en NOTICE meeleveren |

## Door de eigenaar bevestigd

- `public/muziek/` — de sfeergeluiden bij het oefenen: `regen.mp3`,
  `wind.mp3` en `haard.mp3`, door de eigenaar aangeleverd. De bestandsnamen
  wijzen op Pixabay (`dragon-studio`, `freesound_community`); dat is
  royaltyvrij te gebruiken, ook commercieel, en zonder naamsvermelding. Bewaar
  de downloadlinks voor als iemand ernaar vraagt. De overige focusgeluiden
  (golven, bruine en witte ruis) rekent de app zelf uit — daar rust niets op.
- `public/Hillclimb/` — AI-gegenereerd.
- `public/Pet/`, `public/Broekjes/`, `public/Schoenen/`, `Poppetje.glb` en
  `public/jetpack/` — eigenaar bevestigt dat deze gebruikt mogen worden.

## Nog te bevestigen door de eigenaar

- `public/Towerdefence/Map/` achtergronden en `Dieren/` — waarschijnlijk ook
  Kenney, maar niet met zekerheid uit de bestandsnamen af te leiden.
- De animaties bij Poppetje (`emote*.glb`, `rust.glb`, `hip_hop_dancing.glb`,
  `Restpose.fbx`, `rijden.fbx`) — de namen wijzen op Mixamo (Adobe). Dat staat
  royaltyvrij commercieel gebruik in een game toe, maar niet het los
  doorverkopen van de animatiebestanden zelf.
- `map.glb`, `bos.glb`, `stad.glb` — de paintball-kaarten.
- `public/scenes/`, `public/branding/`, `public/fields/`, `public/crates/`,
  `mapshot_*.png` — AI-gegenereerd beeld. Commercieel gebruik is bij de meeste
  aanbieders toegestaan, maar op AI-output rust in Nederland en de VS meestal
  geen eigen auteursrecht: anderen mogen het in principe overnemen.

## Niet gebruiken zonder licentie

- **Clubtenues en clubpetten.** Clubnamen, clublogo's en sponsoruitingen zijn
  merken van hun eigenaars; hetzelfde geldt voor het NY-monogram van de New York
  Yankees (MLB). Ze als te winnen item aanbieden in een betaalde dienst is
  merkinbreuk. Zie hieronder: alles wat hieronder viel is verwijderd.
- **Lesmethode-materiaal.** Oefeningen en werkbladen die één op één uit een
  methode komen. Losse woorden zijn niet beschermd, maar een selectie en
  volgorde uit een methode kan dat wel zijn, en de merknaam mag je sowieso niet
  voeren. De methodenamen zijn daarom overal uit de app gehaald; de
  woordenlijsten zelf zijn ongewijzigd gebleven op verzoek van de eigenaar.
  Dat dekt het merkenrecht af, maar niet de vraag of de selectie zelf
  beschermd is — laat dat nakijken als de site betaald wordt.

## Al verwijderd om deze reden

- `public/rekenen/` — originele uitgevers-PDF's van Pluspunt 4 (Malmberg),
  herkenbaar aan de InDesign-namen `570321_PP4_7_09_PB_EXTRA_FS.indd` en
  `570326_PP4_7_09_PB_EXTRA_S.indd`. Werden nergens in de app gebruikt.
- `public/hulp/` — uitlegplaatjes uit hetzelfde werkboek (blok 10).
- `public/iep_img/` en `src/games/IepOefenen.jsx` — vraagafbeeldingen uit de IEP
  Eindtoets (Bureau ICE). De tool was al onbereikbaar.
- `public/blok10/` en `src/games/blok10.js` — werkbladscreenshots uit Pluspunt.
- De clubtenues (`ajaxshirt.glb`, `psvshirt.glb`, `rbshirt.glb` met hun
  textures, `ajax_check.png`, `psv_check.png`, `logo_ajax.svg`, `logo_psv.svg`,
  `Broekjes/ajaxbroek.png`, `Broekjes/psvbroek.png`, `test/uvmapajaxbroek.png`,
  `test/uvmappsvbroek.png`) en de Yankees-pet (`Pet/petny.png`). De items in de
  kledingkast bestaan nog wél, onder dezelfde sleutels, maar nu als eigen
  ontwerp — wie ze al gewonnen had, houdt ze dus.
- Het basis-shirtmodel `public/shirtmodel.glb` is afgeleid van het oude
  clubshirt: dezelfde geometrie en rig (nodig omdat élk print- en patroonshirt
  dit model gebruikt), maar de ingebakken clubtextuur is eruit gestript. Het
  bestand ging daarmee van 1,27 MB naar 53 kB.
