// 4-03 Zwaartekracht uit — in de blauwe zones val je bijna niet. Eén afzet
// draagt je van richel naar richel; buiten de zone is alles weer normaal.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128

export default maakLevel({
  id: 'w4-l03',
  naam: 'Zwaartekracht uit',
  wereld: 4,
  index: 3,
  doeltijd: 70,
  hints: [T.hints.zerog],
  zerog: [[26, 4, 55, 13], [74, 4, 103, 13]],
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
    p(32) + munt(6) + p(8) + munt(6) + p(24) + munt(6) + p(8) + munt(6) + p(32),
    p(30) + plat(10) + p(6) + plat(10) + p(22) + plat(10) + p(6) + plat(10) + p(24),
    p(B),
    p(6) + munt(5) + p(53) + munt(5) + p(53) + munt(5) + p(1),
    p(2) + 'S' + p(5) + 'H' + p(47) + 'C' + p(11) + 'X' + p(35) + 'r' + p(11) + 'F' + p(11),
    g(26) + p(30) + g(18) + p(30) + g(24),
    g(26) + p(30) + g(18) + p(30) + g(24),
    g(26) + p(30) + g(18) + p(30) + g(24),
  ],
})
