# Uitlegfilmpjes Kenniskist

Tien korte filmpjes (1 tot 1,5 minuut), opgenomen in de testomgeving met verzonnen proefgegevens. Ze staan in `public/handleiding/videos/` (online in hoofdstuk 18 van de handleiding), met bij elk filmpje ondertitels (`.srt` en `.vtt`) en een voorplaatje (`.jpg`). De ingesproken zinnen in `stem/` staan niet in git: bewaar de JSON-bestanden uit de inspreekstudio.

| Nr | Filmpje | Voor wie |
|---|---|---|
| 1 | Inloggen en je klas openen | leerkracht |
| 2 | Leerlingen toevoegen (en een wachtwoord resetten) | leerkracht |
| 3 | Een weektaak klaarzetten | leerkracht |
| 4 | De voortgang volgen (en differentiëren) | leerkracht |
| 5 | Taken en doelen per leerling | leerkracht |
| 6 | Voor de ICT'er (klassen, leerkrachten, instellingen) | ICT'er |
| 7 | Zo werkt het voor de leerling | leerkracht en leerling |

De filmpjes hebben nu ondertitels in beeld en nog geen gesproken stem. Een stem kan er op twee manieren in, en het filmpje wordt dan vanzelf opnieuw opgenomen in het tempo van de stem, zodat beeld en geluid gelijk lopen.

Zet eerst de testomgeving aan:

```bash
npm run dev
```

## Manier 1: zelf inspreken (beste resultaat)

1. Open **http://localhost:5173/docs/handleiding/video/studio.html** in Chrome of Edge.
2. Kies een filmpje, druk op **Opnemen** (of de spatiebalk), lees de zin voor en druk nog een keer om te stoppen. De volgende zin komt vanzelf. Met **Afspelen** luister je terug; klik op een zin in de lijst om hem opnieuw te doen.
3. Klik op **Opslaan**. In je Downloads-map komt `stem-<filmpje>.json`.
4. Zet de opnames klaar en neem het filmpje opnieuw op, met stem:

```bash
node docs/handleiding/video/stem.mjs uitpakken "$HOME/Downloads/stem-3-weektaak-klaarzetten.json"
```

```bash
node docs/handleiding/video/maak-videos.mjs 3 --stem
```

## Manier 2: een AI-stem van Windows (gratis, klinkt wat robotachtig)

1. Installeer de Nederlandse stem: **Instellingen → Tijd en taal → Spraak → Stemmen toevoegen → Nederlands (Nederland)**.
2. Laat alle zinnen inspreken en neem de filmpjes opnieuw op:

```bash
node docs/handleiding/video/stem.mjs windows
```

```bash
node docs/handleiding/video/maak-videos.mjs --stem
```

## Een betere AI-stem

Online stemmen klinken veel natuurlijker, bijvoorbeeld de Nederlandse stemmen "Fenna" en "Maarten" van Microsoft Azure of de stemmen van ElevenLabs. Daar is een account met een sleutel (API key) voor nodig, en meestal kost het een paar euro. Met zo'n sleutel kan `stem.mjs` die stem gebruiken in plaats van de Windows-stem; de rest blijft hetzelfde.

## Filmpjes aanpassen

De teksten en de klikken staan in `maak-videos.mjs`. Na een wijziging:

```bash
node docs/handleiding/video/maak-videos.mjs
```

Met een nummer erachter neem je alleen dat filmpje opnieuw op, bijvoorbeeld `maak-videos.mjs 3`. Een veranderde zin moet daarna opnieuw ingesproken worden; zinnen die hetzelfde bleven, onthouden hun opname.
