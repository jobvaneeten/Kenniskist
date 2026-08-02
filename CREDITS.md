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

## Nog te bevestigen door de eigenaar

Van deze bestanden is de herkomst niet uit het bestand zelf af te leiden. Check
per pack de licentie voordat er geld met de site verdiend wordt.

- `public/jetpack/` — spriteset met namen in CraftPix/GameArt2D-stijl. Die packs
  staan commercieel gebruik meestal toe, maar verbieden het doorgeven van de
  losse assets en vragen soms naamsvermelding.
- `public/Hillclimb/`, `public/Pet/`, `public/Broekjes/`, `public/Schoenen/`,
  `public/GLB format/` — 3D-modellen, herkomst onbekend.
- `public/Towerdefence/Map/` achtergronden en `Dieren/` — waarschijnlijk ook
  Kenney, maar niet met zekerheid uit de bestandsnamen af te leiden.
- `Poppetje.glb` en de animaties (`emote*.glb`, `rust.glb`,
  `hip_hop_dancing.glb`, `Restpose.fbx`, `rijden.fbx`) — de namen wijzen op
  Mixamo (Adobe). Mixamo staat royaltyvrij commercieel gebruik in een game toe,
  maar niet het los doorverkopen van de animatiebestanden zelf.
- `map.glb`, `bos.glb`, `stad.glb` — de paintball-kaarten.
- `public/scenes/`, `public/branding/`, `public/fields/`, `public/crates/`,
  `mapshot_*.png` — AI-gegenereerd beeld. Commercieel gebruik is bij de meeste
  aanbieders toegestaan, maar op AI-output rust in Nederland en de VS meestal
  geen eigen auteursrecht: anderen mogen het in principe overnemen.

## Niet gebruiken zonder licentie

- **Clubtenues.** `ajaxshirt.glb`, `psvshirt.glb`, `rbshirt.glb` met hun
  textures, `ajax_check.png`, `psv_check.png`, `Broekjes/ajaxbroek.png`,
  `Broekjes/psvbroek.png`, `test/uvmapajaxbroek.png`, `test/uvmappsvbroek.png`.
  Clubnamen, clublogo's en sponsoruitingen zijn merken van AFC Ajax, PSV en Red
  Bull. Ze weggeven in een gratis app is al risicovol; ze als te winnen item
  aanbieden in een betaalde dienst is merkinbreuk.
- **Lesmethode-materiaal.** Woordenlijsten en oefeningen die één op één uit een
  methode komen. In deze repo speelt dat bij `public/taalactief5/` (Taal Actief,
  Malmberg) en `public/engels/` (RONDÉ). Losse woorden zijn niet beschermd, maar
  de selectie en volgorde uit een methode kan dat wel zijn, en de merknaam mag
  je sowieso niet voeren.

## Al verwijderd om deze reden

- `public/rekenen/` — originele uitgevers-PDF's van Pluspunt 4 (Malmberg),
  herkenbaar aan de InDesign-namen `570321_PP4_7_09_PB_EXTRA_FS.indd` en
  `570326_PP4_7_09_PB_EXTRA_S.indd`. Werden nergens in de app gebruikt.
- `public/hulp/` — uitlegplaatjes uit hetzelfde werkboek (blok 10).
- `public/iep_img/` en `src/games/IepOefenen.jsx` — vraagafbeeldingen uit de IEP
  Eindtoets (Bureau ICE). De tool was al onbereikbaar.
- `public/blok10/` en `src/games/blok10.js` — werkbladscreenshots uit Pluspunt.
