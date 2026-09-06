// 5-06 Heen en weer — portalen en zwaartekrachtplaten door elkaar. Kom je
// ondersteboven een portaal in, dan kom je ook ondersteboven weer uit.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 144

export default maakLevel({
  id: 'w5-l06',
  naam: 'Heen en weer',
  wereld: 5,
  index: 6,
  doeltijd: 75,
  hints: [T.hints.portaal],
  kaart: [
    g(B),
    g(B),
    g(B),
    p(28) + munt(6) + p(30) + munt(6) + p(30) + munt(6) + p(38),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(6) + munt(6) + p(26) + munt(6) + p(26) + munt(6) + p(26) + munt(6) + p(36),
    p(2) + 'S' + p(5) + 'H' + p(11) + '@' + p(11) + '(' + p(19) + ')' + p(15) + 'C' + p(11) + '@' + p(15) + '(' + p(19) + ')' + p(9) + 'C' + p(9) + 'F' + p(7),
    g(B),
    g(B),
    g(B),
  ],
})
