// 2-13 Onder het ijs — je ziet maar een klein stukje om je heen. De munten
// liggen langs de route, dus wie ze volgt komt vanzelf bij de uitgang.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128

export default maakLevel({
  id: 'w2-l13',
  naam: 'Onder het ijs',
  wereld: 2,
  index: 13,
  doeltijd: 75,
  hints: [T.hints.donker],
  donker: 74,
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
    p(24) + g(3) + p(17) + g(3) + p(17) + g(3) + p(17) + g(3) + p(41),
    p(24) + g(3) + p(17) + g(3) + p(17) + g(3) + p(17) + g(3) + p(41),
    p(6) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(17),
    p(2) + 'S' + p(5) + 'H' + p(25) + 'P' + p(21) + 'C' + p(35) + 'P' + p(27) + 'F' + p(7),
    g(B),
    g(B),
    g(B),
  ],
})
