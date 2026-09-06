// 4-06 Torretjes — ze schieten recht vooruit op een vast ritme en draaien naar
// je toe. De richels zijn dekking, geen uitkijkpost.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 136

export default maakLevel({
  id: 'w4-l06',
  naam: 'Torretjes',
  wereld: 4,
  index: 6,
  doeltijd: 100,
  hints: [T.hints.laser],
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
    p(26) + munt(6) + p(30) + munt(6) + p(30) + munt(6) + p(32),
    p(24) + plat(10) + p(26) + plat(10) + p(26) + plat(10) + p(30),
    p(6) + munt(5) + p(27) + munt(5) + p(27) + munt(5) + p(27) + munt(5) + p(29),
    p(2) + 'S' + p(5) + 'H' + p(19) + 'O' + p(23) + 'C' + p(15) + 'O' + p(23) + 'r' + p(15) + 'O' + p(15) + 'F' + p(11),
    g(B),
    g(B),
    g(B),
  ],
})
