// 2-11 Spiegelmeer — één lange richel boven en één beneden, met aan beide
// uiteinden een veer. Je ziet allebei de routes tegelijk en kunt halverwege
// nog wisselen.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 144

export default maakLevel({
  id: 'w2-l11',
  naam: 'Spiegelmeer',
  wereld: 2,
  index: 11,
  doeltijd: 95,
  hints: [T.hints.tweeRoutes],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(30) + munt(4) + p(22) + munt(4) + p(22) + munt(4) + p(22) + munt(4) + p(32),
    p(24) + plat(96) + p(24),
    p(B),
    p(60) + 'L' + p(22) + 'L' + p(60),
    p(36) + munt(4) + p(62) + munt(4) + p(38),
    p(8) + munt(4) + p(59) + munt(4) + p(59) + munt(4) + p(6),
    p(2) + 'S' + p(5) + 'H' + p(9) + 'v' + p(23) + 'P' + p(27) + 'C' + p(27) + 'P' + p(13) + 'C' + p(9) + 'v' + p(9) + 'F' + p(11),
    g(36) + p(6) + g(60) + p(6) + g(36),
    g(36) + p(6) + g(60) + p(6) + g(36),
    g(36) + p(6) + g(60) + p(6) + g(36),
  ],
})
