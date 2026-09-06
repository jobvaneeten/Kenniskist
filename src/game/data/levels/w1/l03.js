// 1-03 Kristalkloof — introduceert veren. De lage route is gewoon te lopen; de
// veren brengen je naar de hoge route waar de meeste munten liggen. Wie de
// muntster wil, moet dus omhoog.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128

export default maakLevel({
  id: 'w1-l03',
  naam: 'Kristalkloof',
  wereld: 1,
  index: 3,
  doeltijd: 90,
  hints: [T.hints.veer],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(25) + munt(5) + p(13) + munt(5) + p(13) + munt(5) + p(62),
    p(24) + plat(10) + p(8) + plat(10) + p(8) + plat(10) + p(58),
    p(B),
    p(B),
    p(24) + munt(3) + p(15) + munt(3) + p(15) + munt(3) + p(65),
    p(6) + munt(4) + p(64) + munt(4) + p(50),
    p(2) + 'S' + p(7) + 'H' + p(9) + 'v' + p(17) + 'v' + p(17) + 'v' + p(19) + 'C' + p(11) + 'E' + p(11) + 'E' + p(11) + 'E' + p(9) + 'F' + p(5),
    g(24) + p(4) + g(14) + p(4) + g(14) + p(4) + g(64),
    g(24) + p(4) + g(14) + p(4) + g(14) + p(4) + g(64),
    g(24) + p(4) + g(14) + p(4) + g(14) + p(4) + g(64),
  ],
})
