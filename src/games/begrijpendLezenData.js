// Thema's en lessen voor Begrijpend lezen (groep 7-8)
// file: HTML-bestand in public/begrijpend-lezen/. Elke les heeft een vragenset
// voor groep 7 en een (moeilijkere) voor groep 8 en krijgt ?groep=7|8 mee.
// De lessen worden gebouwd met scripts/begrijpend/maak-begrijpend.mjs; de
// lesnamen hieronder zijn dezelfde als de titels in de databestanden daar.
// De keys (spullen, families) en bestandsnamen blijven zo, omdat resultaten en
// klaargezette taken eraan hangen.
const lessen = (thema, namen) => namen.map((naam, i) => ({ key: `les${i + 1}`, naam, file: `${thema}-les${i + 1}.html`, klaar: true }))

export const THEMAS = [
  {
    key: 'spullen',
    naam: 'Van grondstof tot product',
    kleur: '#06D6A0',
    groepKeuze: true,
    lessen: lessen('spullen', [
      'Sterke constructies',
      'Materialen',
      'De eerste fabrieken',
      'Kinderarbeid',
      'Grondstoffen in je telefoon',
    ]),
  },
  {
    key: 'families',
    naam: 'Strijd om vrijheid',
    kleur: '#F9A826',
    groepKeuze: true,
    lessen: lessen('families', [
      'De grondwet van 1848',
      'Vrouwenkiesrecht',
      'Slavernij in Suriname',
      'Anton de Kom',
      'Jongeren in de jaren vijftig',
      'Regenbooggezinnen',
    ]),
  },
]
