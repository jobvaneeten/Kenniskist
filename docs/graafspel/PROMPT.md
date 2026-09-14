# Diepgravers — bouwopdracht

Nieuw spel voor Kenniskist (groep 6-8). Je graaft met een boorvoertuig naar beneden, vindt erts,
en moet op tijd terug naar boven voordat je brandstof op is. Boven verkoop je, tank je en koop je
upgrades. Acht aardlagen diep, onderin een eindbaas.

Dit document is de volledige opdracht: wat het spel is, hoe het voelt, wat erin zit en hoe het aan
de app vastzit. Aannames die nog omgezet kunnen worden staan onderaan bij **Open punten**.

---

## 1. Waarom dit spel

De kinderen spelen het liefst Doodle Sprong en Bergrijden. Wat die twee delen: één vinger,
een run van hooguit een minuut, meteen opnieuw kunnen, en een winkel waar je je score in omzet.
Dat laatste is de haak — ze spelen door voor de volgende upgrade, niet voor het getal.

Wat er nog niet is: een spel waarin je iets ophaalt en terugbrengt, en waarin je zélf kiest hoe
diep je gokt. Dat is de kern hier: *haal ik het nog terug naar boven?*

En het moet ze terugduwen naar oefenen. Daarom is speeltijd schaars en is doodgaan duur.

---

## 2. De kern in één alinea

Je begint aan de oppervlakte bij je basis. Je graaft naar beneden door zand, klei, steen, basalt.
Elk blok erts dat je uitboort gaat in je laadruim — dat is beperkt. Je brandstof loopt de hele tijd
door. Op enig moment moet je besluiten: nóg een laag dieper, of nu terug naar boven. Kom je boven,
dan verkoop je je lading, tank je gratis vol en koop je een upgrade. Raakt je brandstof leeg onder
de grond, of rijd je in lava, dan ben je dood: je lading is weg **en al je resterende duiken zijn
weg**. Dan is het spel klaar tot je weer een oefening hebt gemaakt.

---

## 3. Duiken: hoe speeltijd verdiend wordt

Dit is de belangrijkste regel van het hele spel. Niet weglaten, niet verzachten.

- Je krijgt **3 duiken** wanneer je het spel opent als beloning na een oefening (SpelBeloning).
  Openen zet de teller op 3 — het stapelt niet op, dus duiken sparen kan niet.
- Een duik is verbruikt zodra je de oppervlakte verlaat.
- Kom je heelhuids boven, dan mag je verkopen, gratis tanken, upgraden en opnieuw duiken
  zolang je duiken over hebt.
- **Ga je dood, dan springt de teller meteen naar 0.** Je lading is weg, je resterende duiken zijn
  weg. Er is geen doorgaan, geen extra leven, geen "kijk een filmpje", niets.
- Erts op de bank, upgrades en je diepterecord blijven altijd staan. Doodgaan kost nooit iets wat
  je al veilig had.

Het spel staat óók in de vrije spellijst, maar zonder duiken zie je daar alleen de winkel en een
slotscherm: *"Je duiken zijn op. Maak een oefening, dan mag je weer 3 keer."* Zo kunnen ze hun
upgrades bekijken en iets uitkiezen om naartoe te werken — en is de enige weg naar speeltijd
oefenen.

---

## 4. Hoe het eruitziet

Donkere neonstijl, dezelfde als de rest van de app. Geen pastel, geen cartooneske
emoji-figuurtjes. Dit is voor kinderen van 8 tot 13 die het er stoer uit willen zien vinden.

- **Boven**: nachtlucht met sterren, een mijnbasis met neonverlichting, verkooploods, tankstation,
  werkplaats. Silhouetten, warme lampen tegen een koude lucht.
- **Onder**: elke laag heeft een eigen kleurtemperatuur, van zandbruin bovenin naar gloeiend rood
  in de kern. Erts licht op in het donker; je koplamp maakt een lichtkegel en de rest van het
  scherm loopt naar zwart. Dat "licht in het donker" doet het meeste werk voor de sfeer.
- **Je voertuig**: een gedrongen boorwagen met een roterende kop, zichtbare koplamp, en een romp
  die zichtbaar verandert als je hem upgradet. Kinderen moeten hun upgrades kunnen *zien*.
- Stof bij het boren, vonken op harde steen, damp uit gasbellen, gloed van lava. Deeltjes, geen
  plaatjes.

Alles in code getekend op een canvas — geen externe plaatjes, geen geluidsbestanden, geen
libraries, geen downloads. Precies zoals Sterrenveer en Fruitsabel dat doen.

---

## 5. De acht lagen

Elke laag heeft een eigen erts, een eigen hardheid (welke boor je nodig hebt) en vanaf laag 4 een
eigen gevaar. De diepte staat in meters en is altijd in beeld.

| # | Laag | Diepte | Erts | Nodig | Gevaar |
|---|---|---|---|---|---|
| 1 | Zandlaag | 0-60 m | Koper | boor 1 | — |
| 2 | Kleilaag | 60-140 m | IJzer | boor 1 | — |
| 3 | Kalksteen | 140-240 m | Zilver | boor 2 | — |
| 4 | Basalt | 240-360 m | Goud | boor 3 | gasbellen |
| 5 | Kristalgrot | 360-500 m | Amethist | boor 4 | gas + lava-aders |
| 6 | Obsidiaan | 500-660 m | Platina | boor 5 | lava + instortend gesteente |
| 7 | IJsader | 660-840 m | Diamant | boor 6 | kou vreet brandstof + instorting |
| 8 | Magmakern | 840-1000 m | Sterrenerts | boor 7 | alles, plus de eindbaas |

De drie gevaren:

- **Gasbel** — een trillend blok dat ontploft als je hem raakt. Je ziet hem trillen vóór hij
  afgaat, dus hij is te ontwijken. Raakt hij je romp, dan schade; bij een kapotte romp ben je dood.
- **Lava-ader** — een gloeiende ader die je herkent aan het licht. Erin rijden is meteen dood.
- **Instortend gesteente** — graaf je onder een los blok, dan valt het na een tel naar beneden.
  Onder zo'n blok staan is dodelijk. Dit is ook het wapen tegen de eindbaas.

En het gevaar dat altijd meedoet: **brandstof**. De meter loopt door zolang je motor aanstaat, en
sneller als je stijgt dan als je graaft. In laag 7 vreet de kou extra. Leeg onder de grond is dood.
Er is geen brandstof te vinden onder de grond — tanken kan alleen boven.

**De eindbaas.** Onderin de magmakern ligt de Sterrenkern achter de Magmaworm: een wezen dat door
het gesteente beweegt en je achtervolgt zodra je te dichtbij komt. Je kunt niet schieten — je bent
een graafmachine. Je verslaat hem door hem drie keer onder instortend gesteente te lokken. Haal je
de Sterrenkern, dan is het spel uitgespeeld en krijg je een eindscherm dat blijft staan (een
plaquette in je basis), plus de mooiste romp van het spel.

---

## 6. De winkel: upgrades, lakken en werelden

Drie tabbladen, allemaal te betalen met erts. Alles is met opzet duur: een kind hoort er weken
naartoe te sparen en niet binnen een middag alles te hebben.

**Acht upgradesporen van acht niveaus** (64 stappen). Niveau 1 heeft iedereen bij de start.

| Spoor | Wat het doet | Waarom je het wilt |
|---|---|---|
| **Boor** | graaftempo en welke hardheid je aankunt | zonder dit kom je niet dieper |
| **Tank** | hoeveel brandstof erin gaat | verder kunnen voor je terug moet |
| **Laadruim** | hoeveel erts je meeneemt | meer verdienen per duik |
| **Romp** | hoeveel klappen je incasseert | overleven in laag 5 en dieper |
| **Motor** | rij- en stijgsnelheid | sneller terug, dus minder brandstof |
| **Koplamp** | hoe ver je ziet in het donker | eerder erts en lava zien aankomen |
| **Magneet** | trekt erts binnen bereik vanzelf naar je toe | je hoeft niet elke ader uit te graven |
| **Koeling** | houdt de hitte van de magmakern tegen | zonder dit red je laag 8 niet |

**Tien lakken** voor je graafwagen (§6b) en **vier werelden** (§6c).

### 6b. Lakken

Puur uiterlijk, en juist daarom duur — dit is waar een kind maanden naar toewerkt. Van Staalgrijs
(gratis) via Magma en Middernacht tot Sterrenstof voor drie miljoen. De lak stuurt de kleur van
de romp, de biesrand en de cabine rechtstreeks aan, en je ziet hem meteen in de winkel op een
levend portret van je eigen wagen.

### 6c. Werelden

Elke wereld heeft dezelfde acht lagen en gevaren, maar een eigen palet, een eigen lucht en een
eigen opbrengstfactor. Een wereld kopen is dus geen behangetje maar een echte stap in je economie.

| Wereld | Prijs | Erts | Sfeer |
|---|---|---|---|
| De Oude Mijn | gratis | × 1 | aarde, klei en steen |
| Rode Planeet | 32.000 | × 2,2 | roestrood zand, twee manen |
| Bevroren Maan | 175.000 | × 3,8 | alles blauw en spiegelend |
| Kristalrijk | 900.000 | × 6,5 | glas en licht; hier ligt het echte geld |

Regels voor de prijzen:

- De eerste upgrade moet **binnen twee of drie duiken** te betalen zijn. Dat is de reden dat ze
  blijven hangen; Bergrijden doet dat goed en dat moeten we hier evenaren.
- Daarna loopt de prijs hard op (elke stap × 2,9), en de waarde van het erts loopt mee met de
  diepte en met de wereld waarin je graaft. De laatste stap van een spoor kost ruim honderdduizend.
- Je moet altijd kunnen zien wat de volgende stap doet en wat hij kost, ook als je hem nog niet kunt
  betalen. Dat is het doel om naartoe te sparen.
- Elk spoor krijgt in de werkplaats een eigen balk met acht vakjes, zodat een kind in één oogopslag
  ziet hoe ver hij is en wat er nog komt.

---

## 7. De uitleg (verplicht, met plaatjes)

De eerste **drie keer** dat een kind het spel opent, komt er eerst een uitleg van vijf schermen.
Elk scherm heeft een **getekende illustratie** in de stijl van het spel — geen schermafdruk, geen
lap tekst. Doorklikken met een knop, en de laatste knop is "Beginnen".

1. **Dit is je boor.** Graaf naar beneden door de grond. *(plaatje: voertuig dat een gang graaft)*
2. **Erts is geld.** Wat je uitboort gaat in je laadruim, en dat is niet oneindig groot.
   *(plaatje: laadruim halfvol met oplichtende brokken)*
3. **Let op je brandstof.** De meter loopt door. Raakt hij leeg terwijl je onder de grond bent,
   dan ben je dood. *(plaatje: brandstofmeter in het rood, diep in een schacht)*
4. **Ga op tijd terug.** Boven verkoop je je lading, tank je gratis en koop je betere spullen.
   *(plaatje: basis met verkooploods en werkplaats)*
5. **Doodgaan kost alles van deze keer.** Je lading én je overgebleven duiken. Daarna moet je eerst
   weer een oefening maken. *(plaatje: doorgestreepte lading en drie duiken die uitgaan)*

In de werkplaats staat een knopje "Uitleg opnieuw", zodat een kind het altijd kan teruglezen.

---

## 8. Besturing

Werkt op iPad (het belangrijkst) en op een laptop.

- **Aanraken**: links onderin een links/rechts-duo, rechts onderin omhoog (stijgen) en omlaag
  (graven). Grote knoppen, ver genoeg uit elkaar voor kinderduimen.
- **Toetsenbord**: pijltjes of WASD, spatie om te stijgen.
- Graven gaat in de richting die je aanhoudt: omlaag, of zijwaarts in de wand.
- Stijgen kost meer brandstof dan graven. Dat is de hele spanningsboog, dus het moet voelbaar zijn.

---

## 9. Hoe het aan de app vastzit

Zelfde patroon als Doodle Sprong en Fruitsabel: een losstaande HTML in `public/`, met een dun
React-wrappertje eromheen.

**Bestanden**

- `public/graven/index.html` — het hele spel (canvas, alles in code getekend).
- `src/games/GraafGame.jsx` — wrapper van ±30 regels, model: `src/games/DoodleSprongGame.jsx`.
- `public/scenes/games/graven.svg` — het kaartje in de spellijst.

**postMessage-contract**

| Bericht | Wanneer |
|---|---|
| `graven-terug` | kind klikt de eigen "← Menu"-knop (alleen met `?terug=1` in de url) |
| `graven-gameover` | duiken zijn op, of het kind klikt "Verder" |

**Aanmelden**

- `FREE_GAMES` in `src/GameMenu.jsx` — vrij te openen, maar zonder duiken kom je op het slotscherm.
- `SPELLEN` in `src/games/SpelBeloning.jsx` — via `IframeEmbed`, met `doneType="graven-gameover"`,
  net als Fruitsabel (dat spel heeft ook een eigen winkel na afloop).
- Briefgeld loopt via de bestaande eenmalig-verdienen-poort (`kk_earned_once`), niet via iets nieuws.
- Na afloop `npm run economy` draaien en kijken of de balans nog klopt.

**Opslag** — alles onder de prefix `kk_`, dan spiegelt `src/lib/voortgangSync.js` het vanzelf naar
Supabase en gaat de voortgang mee naar een ander apparaat. Niets aan te passen daar.

| Sleutel | Inhoud |
|---|---|
| `kk_gr_duiken` | duiken over (0-3) |
| `kk_gr_erts` | gespaard erts (het geld van het spel) |
| `kk_gr_upgrades` | JSON: niveau per spoor |
| `kk_gr_diepte` | diepterecord in meters |
| `kk_gr_uitleg` | hoe vaak de uitleg getoond is (tot 3) |
| `kk_gr_baas` | eindbaas verslagen ja/nee |
| `kk_gr_wereld` | in welke wereld je nu graaft |
| `kk_gr_lak` | welke lak op je graafwagen zit |
| `kk_gr_bezit` | welke werelden en lakken je gekocht hebt |

---

## 10. Waar het op stukgaat als we niet opletten

- **Bijtanken onder de grond.** In geen enkele vorm. Geen brandstofblokken, geen reservetank als
  upgrade, geen "nog één keer proberen". Dan verdwijnt de spanning en de terugduw naar oefenen.
- **Doodgaan dat te zacht is.** De teller moet zichtbaar naar 0 klappen, met een duidelijk scherm:
  wat je kwijt bent, en dat een oefening je weer drie duiken geeft.
- **Doodgaan dat te hard is.** Upgrades en gespaard erts blijven áltijd staan. Een kind dat zijn
  boor kwijtraakt komt niet terug.
- **Een te dure eerste upgrade.** Voelt het eerste half uur als niks verdienen, dan haken ze af.
- **Te veel tekst.** Dit is voor kinderen die soms moeizaam lezen. Alles wat met een plaatje,
  een kleur of een meter kan, gaat niet in een zin.
- **Externe plaatjes of libraries.** De app laadt niets van buiten; alles wordt getekend.

---

## 11. Wanneer is het af

- Een kind kan zonder hulp, na de vijf uitlegschermen, zijn eerste duik doen en iets verkopen.
- De eerste upgrade is binnen drie duiken te betalen.
- Brandstof leeg onder de grond zet de duiken zichtbaar op 0 en toont het slotscherm.
- Zonder duiken is de winkel wél te bekijken en het spel niet te spelen.
- Alle acht lagen zijn bereikbaar met de bijbehorende boor, en de eindbaas is te verslaan.
- Alle veertig upgrades zijn te koop en veranderen iets wat je merkt of ziet.
- Werkt op iPad in liggende stand, en met toetsenbord.
- Voortgang staat na herladen nog op dezelfde plek, en op een ander apparaat ook.
- `npm run lint`, `npx vitest run` en `npm run economy` zijn schoon.

---

## 12. Open punten

Deze keuzes heb ik ingevuld omdat er iets moest staan. Zeg het als je ze anders wilt.

1. **Duiken stapelen niet.** Een beloning vult aan tot 3; door te spelen kom je er dus nooit boven.
   De code **0001** in het codescherm van de app is de uitzondering en zet er 100 klaar — voor de
   leerkracht en om zelf te kunnen testen (zie `src/App.jsx`).
2. **Tanken boven is gratis.** Brandstof kopen zou een tweede economie worden naast erts; dat maakt
   het voor groep 6 te ingewikkeld.
3. **De diepte loopt tot 1000 meter.** Ruim genoeg om weken mee te kunnen, kort genoeg om ooit
   uit te spelen.
4. **Geen losse hulpstukken** (dynamiet, springstof) — de acht sporen dekken het.
5. **Je begint met een kleine tank** (40 liter) en boort vlot (0,40 s per tegel op niveau 1): kort,
   spannend en vaak terug, in plaats van traag hakken met een ruime voorraad.
5. **Het spel geeft geen munten of briefgeld voor diepte.** Erts blijft binnen het spel, zoals
   afgesproken, en de beloning loopt via de bestaande poort.
