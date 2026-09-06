// 5-10 Spiegelgang — de helft van de munten ligt aan het plafond. Je moet
// heen én terug ondersteboven, want de platen staan aan weerskanten.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 152

export default maakLevel({
  id: 'w5-l10',
  naam: 'Spiegelgang',
  wereld: 5,
  index: 10,
  doeltijd: 85,
  hints: [T.hints.omkeren],
  kaart: [
    g(B),
    g(B),
    g(B),
    p(20) + munt(6) + p(22) + munt(6) + p(22) + munt(6) + p(22) + munt(6) + p(42),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(6) + munt(6) + p(22) + munt(6) + p(22) + munt(6) + p(22) + munt(6) + p(56),
    p(2) + 'S' + p(5) + 'H' + p(7) + '@' + p(15) + 'e' + p(15) + '@' + p(15) + 'C' + p(15) + '@' + p(15) + 'e' + p(15) + '@' + p(11) + 'C' + p(7) + 'F' + p(19),
    g(B),
    g(B),
    g(B),
  ],
})
