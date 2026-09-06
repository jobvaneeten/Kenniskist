// 4-09 Zwevend — de hele gang staat zonder zwaartekracht. Je zweeft van richel
// naar richel, maar de drones zweven mee. De checkpoints staan op de richels,
// want daaronder is niets.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 144

export default maakLevel({
  id: 'w4-l09',
  naam: 'Zwevend',
  wereld: 4,
  index: 9,
  doeltijd: 115,
  hints: [T.hints.zerog],
  zerog: [[30, 3, 113, 13]],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(40) + 'X' + p(27) + 'X' + p(27) + 'X' + p(47),
    p(B),
    p(B),
    p(B),
    p(40) + munt(4) + 'C' + munt(3) + p(12) + munt(8) + p(12) + munt(4) + 'C' + munt(3) + p(12) + munt(6) + p(38),
    p(38) + plat(12) + p(10) + plat(12) + p(10) + plat(12) + p(10) + plat(10) + p(30),
    p(B),
    p(6) + munt(4) + p(120) + munt(4) + p(10),
    p(2) + 'S' + p(5) + 'H' + p(111) + 'r' + p(11) + 'F' + p(11),
    g(30) + p(84) + g(30),
    g(30) + p(84) + g(30),
    g(30) + p(84) + g(30),
  ],
})
