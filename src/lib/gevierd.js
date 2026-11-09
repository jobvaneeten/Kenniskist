// Welke behaalde doelen al gevierd zijn (DoelFeest.jsx), per apparaat.

const GEVIERD = 'kk_gevierde_doelen'
export function leesGevierd() {
  try { return new Set(JSON.parse(localStorage.getItem(GEVIERD) ?? '[]')) } catch { return new Set() }
}
// Markeert doelen als gevierd, zodat het feest per doel maar één keer komt
// (in Mijn week én tijdens het oefenen).
export function markeerGevierd(opdrachtIds) {
  const set = leesGevierd()
  opdrachtIds.forEach(id => set.add(id))
  try { localStorage.setItem(GEVIERD, JSON.stringify([...set])) } catch { /* privé-venster */ }
}
// Doel weggezakt bij een herhaling: als hij opnieuw behaald wordt, mag het
// feest er weer bij.
export function vergeetGevierd(opdrachtId) {
  const set = leesGevierd()
  if (!set.delete(opdrachtId)) return
  try { localStorage.setItem(GEVIERD, JSON.stringify([...set])) } catch { /* privé-venster */ }
}
