# Eigen geluidsbestanden voor het focusgeluid

Zet hier een geluidsbestand neer en de app gebruikt dat in plaats van het
zelfgemaakte geluid. Staat het bestand er niet, dan valt hij automatisch terug
op het namaakgeluid — een kind merkt daar niets van.

Welke bestandsnamen worden gebruikt, staat in `public/kenniskist-muziek.js`
bij `FOCUS` (het veld `bestand`). Nu ingesteld:

- `regen.mp3` — regen op een tent
- `wind.mp3` — wind om het huis
- `haard.mp3` — knappend haardvuur

Golven, bruine ruis en witte ruis hebben geen bestand: die rekent de app zelf
uit. Wil je daar ook een opname voor, zet het bestand hier neer en voeg
`bestand: '/muziek/<naam>.mp3'` toe bij dat geluid in `FOCUS`.

## Waar moet het bestand aan voldoen

- **Formaat**: mp3 (m4a en ogg werken ook).
- **Lengte**: minimaal 30 seconden, liefst 1 à 2 minuten. Korter gaat te horen
  herhalen.
- **Grootte**: houd het onder ~2 MB. Mono en 128 kbit/s is ruim genoeg voor
  sfeergeluid en scheelt de helft.
- **Rechten**: alleen rechtenvrij materiaal (CC0). Pixabay Music en Freesound
  hebben goede opnames. Zet er geen muziek of geluid in waar rechten op zitten;
  de app staat publiek online.

De app maakt het bestand zelf naadloos (de staart vloeit over in het begin) en
zet het op dezelfde luidheid als de andere geluiden, dus daar hoef je niet op
te letten bij het uitzoeken.
