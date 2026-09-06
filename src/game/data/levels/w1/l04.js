// 1-04 Breekbaar — barstende blokken en de eerste capsules. De munten liggen
// bóven het blokkenplafond, dus je moet er van onderaf doorheen slaan.
import { maakLevel, p, g, munt, breek } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128

export default maakLevel({
  id: 'w1-l04',
  naam: 'Breekbaar',
  wereld: 1,
  index: 4,
  doeltijd: 80,
  hints: [T.hints.breekbaar],
  capsules: ['schild', 'leven'],
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
    p(15) + munt(6) + p(37) + munt(6) + p(64),
    p(14) + breek(5) + '?' + breek(4) + p(30) + breek(6) + '?' + breek(3) + p(64),
    p(28) + munt(3) + p(21) + munt(3) + p(21) + munt(3) + p(49),
    p(6) + munt(4) + p(28) + munt(4) + p(28) + munt(4) + p(54),
    p(2) + 'S' + p(5) + 'H' + p(35) + 'E' + p(15) + 'C' + p(29) + 'E' + p(13) + 'E' + p(15) + 'F' + p(7),
    g(28) + p(4) + g(20) + p(4) + g(20) + p(4) + g(48),
    g(28) + p(4) + g(20) + p(4) + g(20) + p(4) + g(48),
    g(28) + p(4) + g(20) + p(4) + g(20) + p(4) + g(48),
  ],
})
