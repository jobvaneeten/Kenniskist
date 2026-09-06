// Hulpmiddelen om levelkaarten precies uit te schrijven.
//
// Elke rij wordt opgebouwd uit stukken met een expliciete breedte, zodat de
// uitlijning van kolommen na te rekenen is in plaats van te tellen in een lange
// string. `maakLevel` controleert daarna dat alle rijen even lang zijn — een
// rij die één teken misloopt schuift anders het halve level op.

export const p = (n) => '.'.repeat(Math.max(0, n))
export const g = (n) => '#'.repeat(Math.max(0, n))
export const plat = (n) => '='.repeat(Math.max(0, n))
export const munt = (n) => 'o'.repeat(Math.max(0, n))
export const stekel = (n) => '^'.repeat(Math.max(0, n))
export const breek = (n) => 'b'.repeat(Math.max(0, n))
export const ijs = (n) => 'I'.repeat(Math.max(0, n))
export const dun = (n) => 'i'.repeat(Math.max(0, n))
export const lava = (n) => '~'.repeat(Math.max(0, n))

// Bouwt een rij uit stukken en controleert de eindbreedte.
export function rij(breedte, ...delen) {
  const s = delen.join('')
  if (s.length !== breedte) {
    throw new Error(`Rij is ${s.length} tekens, verwacht ${breedte}: "${s}"`)
  }
  return s
}

export function maakLevel(def) {
  const breedte = def.kaart[0].length
  def.kaart.forEach((r, i) => {
    if (r.length !== breedte) {
      throw new Error(`${def.id}: rij ${i} is ${r.length} tekens, rij 0 is ${breedte}`)
    }
  })
  return {
    muziek: `w${Number(def.id[1])}`,
    ...def,
  }
}
