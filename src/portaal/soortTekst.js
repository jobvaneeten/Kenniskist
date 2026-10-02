// Taken en doelen hebben geen einddatum: een taak verdwijnt bij de leerling
// zodra hij af is, een doel blijft staan tot de leerkracht hem verwijdert.
// eind_op is verplicht in de database, dus dit is "nooit".
export const ZONDER_EIND = '9999-12-31'

// Weektaak, taak en doel delen alle portaalschermen (zie soortVan in
// lib/weektaak.js); alleen de woorden verschillen.
export const SOORT_TEKST = {
  weektaak: { meervoud: 'Weektaken', enkel: 'weektaak', nieuw: '+ Nieuwe weektaak', leeg: 'Nog geen weektaken.' },
  taak: { meervoud: 'Taken', enkel: 'taak', nieuw: '+ Nieuwe taak', leeg: 'Nog geen taken klaargezet.' },
  doel: { meervoud: 'Doelen', enkel: 'doel', nieuw: '+ Nieuw doel', leeg: 'Nog geen doelen klaargezet.' },
}
