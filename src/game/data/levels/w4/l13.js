// 4-13 De schacht — omlaag in plaats van omhoog. De richels breken je val; de
// zenders ertussen bepalen wanneer je verder mag.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 48

export default maakLevel({
  id: 'w4-l13',
  naam: 'De schacht',
  wereld: 4,
  index: 13,
  doeltijd: 75,
  hints: [T.hints.laser],
  kaart: [
    p(B),
    p(4) + 'S' + p(3) + 'H' + p(5) + munt(4) + p(30),
    p(4) + plat(15) + p(29),
    p(B),
    p(26) + munt(4) + p(18),
    p(24) + plat(15) + p(9),
    p(20) + 'j' + p(27),
    p(8) + munt(4) + p(36),
    p(6) + plat(15) + p(27),
    p(B),
    p(26) + munt(4) + p(4) + 'C' + p(13),
    p(24) + plat(15) + p(9),
    p(20) + 'j' + p(27),
    p(8) + munt(4) + p(36),
    p(6) + plat(15) + p(27),
    p(B),
    p(26) + munt(4) + p(18),
    p(24) + plat(15) + p(9),
    p(20) + 'j' + p(27),
    p(8) + munt(4) + p(36),
    p(6) + plat(15) + p(27),
    p(B),
    p(26) + munt(4) + p(4) + 'C' + p(13),
    p(24) + plat(15) + p(9),
    p(B),
    p(8) + munt(4) + p(36),
    p(6) + plat(15) + p(27),
    p(B),
    p(24) + munt(4) + p(2) + 'r' + p(17),
    p(B),
    p(20) + munt(4) + p(2) + 'F' + p(21),
    g(B),
    g(B),
    g(B),
  ],
})
