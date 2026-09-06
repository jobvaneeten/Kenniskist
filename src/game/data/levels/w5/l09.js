// 5-09 Echoslijm — verslagen slijm komt terug op de plek waar je het raakte.
// Doorlopen loont dus meer dan opruimen.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 144

export default maakLevel({
  id: 'w5-l09',
  naam: 'Echoslijm',
  wereld: 5,
  index: 9,
  doeltijd: 80,
  hints: [T.hints.snel],
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
    p(26) + munt(6) + p(32) + munt(6) + p(32) + munt(6) + p(36),
    p(24) + plat(10) + p(28) + plat(10) + p(28) + plat(10) + p(34),
    p(6) + munt(6) + p(22) + munt(6) + p(22) + munt(6) + p(22) + munt(6) + p(22) + munt(6) + p(20),
    p(2) + 'S' + p(5) + 'H' + p(11) + 'e' + p(15) + 'e' + p(15) + 'C' + p(15) + 'e' + p(15) + 'e' + p(15) + 'c' + p(15) + 'C' + p(7) + 'F' + p(19),
    g(B),
    g(B),
    g(B),
  ],
})
