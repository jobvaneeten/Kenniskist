// 4-05 Drones — ze zweven een vast baantje tot ze je zien. Het oog verkleurt
// een halve seconde voor de duik; die halve seconde is je hele kans.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 136

export default maakLevel({
  id: 'w4-l05',
  naam: 'Drones',
  wereld: 4,
  index: 5,
  doeltijd: 105,
  hints: [T.hints.snel],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(20) + 'X' + p(23) + 'X' + p(23) + 'X' + p(23) + 'X' + p(43),
    p(B),
    p(B),
    p(B),
    p(B),
    p(28) + munt(6) + p(34) + munt(6) + p(34) + munt(6) + p(22),
    p(26) + plat(10) + p(30) + plat(10) + p(30) + plat(10) + p(20),
    p(6) + munt(5) + p(27) + munt(5) + p(27) + munt(5) + p(27) + munt(5) + p(29),
    p(2) + 'S' + p(5) + 'H' + p(23) + 'r' + p(27) + 'C' + p(27) + 'r' + p(27) + 'r' + p(11) + 'F' + p(7),
    g(30) + p(5) + g(30) + p(5) + g(30) + p(5) + g(31),
    g(30) + p(5) + g(30) + p(5) + g(30) + p(5) + g(31),
    g(30) + p(5) + g(30) + p(5) + g(30) + p(5) + g(31),
  ],
})
