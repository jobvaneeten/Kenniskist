// 4-11 Twee kaarten — twee deuren en twee kaarten. De tweede kaart ligt achter
// de eerste deur, dus de volgorde ligt vast.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 152

export default maakLevel({
  id: 'w4-l11',
  naam: 'Twee kaarten',
  wereld: 4,
  index: 11,
  doeltijd: 80,
  hints: [T.hints.sleutel],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(68) + 'd' + p(63) + 'd' + p(19),
    p(68) + 'd' + p(63) + 'd' + p(19),
    p(30) + munt(6) + p(32) + 'd' + p(1) + munt(6) + p(34) + munt(6) + p(16) + 'd' + p(19),
    p(28) + plat(10) + p(30) + 'd' + p(1) + plat(10) + p(28) + plat(10) + p(14) + 'd' + p(19),
    p(6) + munt(5) + p(27) + munt(5) + p(25) + 'd' + p(1) + munt(5) + p(27) + munt(5) + p(25) + 'd' + p(19),
    p(2) + 'S' + p(5) + 'H' + p(15) + 'q' + p(15) + 'r' + p(15) + 'C' + p(11) + 'd' + p(19) + 'q' + p(19) + 'n' + p(11) + 'C' + p(11) + 'd' + p(11) + 'F' + p(7),
    g(B),
    g(B),
    g(B),
  ],
})
