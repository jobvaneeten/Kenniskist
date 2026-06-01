# UV-templates voor de kleding

Hiermee kun je zelf een textuur (ontwerp) maken die netjes op de kleding valt.

## Bestanden
- `UV_shirt.png`    — shirt (gebruikt de Ajax/PSV-shirt geometrie als donor)
- `UV_broek.png`    — broek
- `UV_sokken.png`   — sokken
- `UV_schoenen.png` — schoenen

Elk plaatje toont de "uitgevouwen" vorm van het kledingstuk: de lijnen zijn de
randen van de stof. Alles wat binnen een vlak valt, wordt op dat deel van de
kleding geplakt.

## Hoe ontwerp je
1. Open de UV-template in een tekenprogramma (Photoshop, GIMP, Krita, Photopea
   (gratis, in de browser)).
2. Maak een nieuwe laag ONDER de UV-lijnen en teken/plak daar je ontwerp.
3. Exporteer als **1024 × 1024 PNG**.

## Belangrijke regels
- Textuur is **1024 × 1024** pixels.
- De **linksboven-hoek** van je plaatje = UV-coördinaat (0,0). (We gebruiken
  `invertY = false`, dus geen verticale spiegeling — wat je linksboven tekent,
  zit ook linksboven op de UV.)
- Vul ook de ruimte een beetje rond de lijnen op (een paar pixels marge), zodat
  er bij de naden geen randjes ontstaan.

## In de game gebruiken
De game genereert nu automatisch prints (emoji's/patronen). Wil je je eigen
PNG-ontwerp gebruiken, zet het dan klaar — dan kan ik er een "eigen ontwerp"-item
voor maken in de catalogus dat jouw PNG als textuur op het kledingstuk zet.
