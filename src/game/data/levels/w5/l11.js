// 5-11 Sterrenstof — je ziet maar een klein stukje om je heen. De munten
// liggen langs de route; wie ze volgt komt vanzelf bij de uitgang.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 144

export default maakLevel({
  id: 'w5-l11',
  naam: 'Sterrenstof',
  wereld: 5,
  index: 11,
  doeltijd: 115,
  hints: [T.hints.donker],
  donker: 70,
  kaart: [
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    p(24) + g(3) + p(21) + g(3) + p(21) + g(3) + p(69),
    p(24) + g(3) + p(21) + g(3) + p(21) + g(3) + p(69),
    p(6) + munt(6) + p(14) + munt(6) + p(14) + munt(6) + p(14) + munt(6) + p(14) + munt(6) + p(14) + munt(6) + p(32),
    p(2) + 'S' + p(5) + 'H' + p(23) + 'e' + p(23) + 'C' + p(23) + 'c' + p(23) + 'e' + p(15) + 'C' + p(7) + 'F' + p(15),
    g(B),
    g(B),
    g(B),
  ],
})
