// 4-12 Noodverlichting — het licht valt om de paar seconden bijna helemaal
// weg. Het ritme is vast, dus je kunt de route onthouden.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 136

export default maakLevel({
  id: 'w4-l12',
  naam: 'Noodverlichting',
  wereld: 4,
  index: 12,
  doeltijd: 70,
  hints: [T.hints.donker],
  donker: 92,
  knipper: true,
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
    p(B),
    p(28) + g(3) + p(19) + g(3) + p(19) + g(3) + p(61),
    p(28) + g(3) + p(19) + g(3) + p(19) + g(3) + p(61),
    p(6) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(25),
    p(2) + 'S' + p(5) + 'H' + p(23) + 'r' + p(23) + 'C' + p(23) + 'n' + p(23) + 'r' + p(15) + 'F' + p(15),
    g(B),
    g(B),
    g(B),
  ],
})
