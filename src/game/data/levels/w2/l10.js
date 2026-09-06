// 2-10 Stekelgang — ijskegels aan het plafond en stekels op de vloer. De
// kegels trillen eerst, dus je kunt ze zien vallen; de vloerstekels niet, dus
// die liggen altijd in het volle zicht.
import { maakLevel, p, g, munt, stekel } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128

export default maakLevel({
  id: 'w2-l10',
  naam: 'Stekelgang',
  wereld: 2,
  index: 10,
  doeltijd: 105,
  hints: [T.hints.ijskegel],
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
    p(20) + 'Y' + p(11) + 'Y' + p(11) + 'Y' + p(11) + 'Y' + p(11) + 'Y' + p(11) + 'Y' + p(47),
    p(B),
    p(34) + munt(4) + p(34) + munt(4) + p(52),
    p(6) + munt(5) + p(13) + munt(5) + p(13) + munt(5) + p(13) + munt(5) + p(13) + munt(5) + p(5) + munt(5) + p(35),
    p(2) + 'S' + p(5) + 'H' + p(21) + stekel(3) + p(24) + 'C' + p(8) + stekel(3) + p(21) + 'P' + p(9) + stekel(3) + p(17) + 'F' + p(7),
    g(B),
    g(B),
    g(B),
  ],
})
