// Welke lesmethodes een school gebruikt. De beheerder vinkt ze per school aan
// (AdminScholen.jsx, kolom scholen.methodes). Alleen voor Pluspunt en Taal
// actief heeft Kenniskist eigen inhoud; de rest staat er alvast, zodat een
// school ze kan hebben aangevinkt als er later inhoud bij komt.
//
// Zonder methode krijg je de neutrale versie: bij rekenen alleen de doelen
// (geen blokken), bij spelling de spellingregels in plaats van de dieren, en
// geen woordlijsten of dictees die uit de methode komen. Gasten (geen account)
// zien ook de neutrale versie.
export const METHODES = [
  { id: 'pluspunt', naam: 'Pluspunt', vak: 'Rekenen', inhoud: true },
  { id: 'wereld-in-getallen', naam: 'Wereld in getallen', vak: 'Rekenen' },
  { id: 'getal-en-ruimte', naam: 'Getal & Ruimte Junior', vak: 'Rekenen' },
  { id: 'rekenrijk', naam: 'Rekenrijk', vak: 'Rekenen' },
  { id: 'taal-actief', naam: 'Taal actief', vak: 'Taal en spelling', inhoud: true },
  { id: 'staal', naam: 'Staal', vak: 'Taal en spelling' },
  { id: 'taal-in-beeld', naam: 'Taal in beeld', vak: 'Taal en spelling' },
  { id: 'taalverhaal', naam: 'Taalverhaal.nu', vak: 'Taal en spelling' },
  { id: 'pijl', naam: 'PIJL', vak: 'Taal en spelling' },
]

let huidige = []
export function zetMethodes(lijst) { huidige = Array.isArray(lijst) ? lijst.slice() : [] }
export function heeftMethode(id) { return huidige.includes(id) }
export const heeftPluspunt = () => heeftMethode('pluspunt')
export const heeftTaalActief = () => heeftMethode('taal-actief')

// Spellingcategorieën heten in Taal actief naar dieren ("slang — ng").
// Zonder Taal actief tonen we alleen de regel ("ng").
export function spellingLabel(label) {
  if (heeftTaalActief()) return label
  const regel = label.split(' — ')[1] ?? label
  return regel.charAt(0).toUpperCase() + regel.slice(1)
}

// Labels van configuratie-opties (checkboxes) die naar een methode verwijzen.
export function optieLabel(veldKey, optie) {
  const label = typeof optie === 'string' ? optie : optie.label
  return veldKey === 'cats' ? spellingLabel(label) : label
}
