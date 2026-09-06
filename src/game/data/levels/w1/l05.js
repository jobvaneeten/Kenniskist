// 1-05 Sporenveld — springsporen. Ze zakken zichtbaar in vlak voor ze
// springen, dus het is een ritmeprobleem en geen gokspel.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128

export default maakLevel({
  id: 'w1-l05',
  naam: 'Sporenveld',
  wereld: 1,
  index: 5,
  doeltijd: 100,
  hints: [T.hints.hoog],
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
    p(14) + munt(4) + p(30) + munt(4) + p(32) + munt(4) + p(40),
    p(30) + munt(4) + p(26) + munt(4) + p(26) + munt(4) + p(34),
    p(6) + munt(3) + p(29) + munt(3) + p(29) + munt(3) + p(55),
    p(2) + 'S' + p(5) + 'H' + p(9) + 'J' + p(7) + 'E' + p(17) + 'J' + p(7) + 'J' + p(3) + 'C' + p(11) + 'E' + p(3) + 'J' + p(7) + 'J' + p(23) + 'J' + p(17) + 'F' + p(5),
    g(30) + p(4) + g(26) + p(4) + g(26) + p(4) + g(34),
    g(30) + p(4) + g(26) + p(4) + g(26) + p(4) + g(34),
    g(30) + p(4) + g(26) + p(4) + g(26) + p(4) + g(34),
  ],
})
