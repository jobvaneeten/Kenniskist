// 2-01 Eerste stap op ijs — de vloer wisselt af tussen steen en ijs, altijd
// met vaste grond ervoor. Zo leer je remmen zonder dat een misser meteen een
// gat in betekent.
import { maakLevel, p, g, plat, munt, ijs } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 120

export default maakLevel({
  id: 'w2-l01',
  naam: 'Eerste stap op ijs',
  wereld: 2,
  index: 1,
  doeltijd: 80,
  hints: [T.hints.ijs],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(38) + munt(6) + p(76),
    p(36) + plat(10) + p(42) + munt(4) + p(28),
    p(6) + munt(5) + p(23) + munt(6) + p(24) + munt(6) + p(20) + munt(6) + p(24),
    p(2) + 'S' + p(5) + 'H' + p(21) + 'E' + p(23) + 'C' + p(15) + 'P' + p(41) + 'F' + p(7),
    g(24) + ijs(28) + g(8) + ijs(28) + p(4) + ijs(28),
    g(24) + ijs(28) + g(8) + ijs(28) + p(4) + ijs(28),
    g(24) + ijs(28) + g(8) + ijs(28) + p(4) + ijs(28),
  ],
})
