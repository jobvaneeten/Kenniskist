// 3-03 Het stijgt — de eerste stijgende lava. Kort en steil: er is precies
// genoeg tijd om boven te komen als je niet blijft staan.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 48

export default maakLevel({
  id: 'w3-l03',
  naam: 'Het stijgt',
  wereld: 3,
  index: 3,
  doeltijd: 65,
  hints: [T.hints.lava],
  lava: { start: 31, snelheid: 9, wacht: 3, stop: 2 },
  kaart: [
    p(B),
    p(B),
    p(14) + munt(4) + p(2) + 'F' + p(27),
    p(12) + plat(15) + p(21),
    p(B),
    p(28) + munt(4) + p(16),
    p(26) + plat(15) + p(7),
    p(B),
    p(10) + munt(4) + p(6) + 'C' + p(27),
    p(8) + plat(15) + p(25),
    p(B),
    p(26) + munt(4) + p(18),
    p(24) + plat(15) + p(9),
    p(B),
    p(10) + munt(4) + p(34),
    p(8) + plat(15) + p(25),
    p(B),
    p(26) + munt(4) + p(4) + 'U' + p(13),
    p(24) + plat(15) + p(9),
    p(B),
    p(10) + munt(4) + p(6) + 'C' + p(27),
    p(8) + plat(15) + p(25),
    p(B),
    p(24) + munt(4) + p(20),
    p(22) + plat(15) + p(11),
    p(B),
    p(8) + munt(4) + p(36),
    p(6) + plat(15) + p(27),
    p(B),
    p(4) + 'S' + p(3) + 'H' + p(5) + munt(4) + p(30),
    g(B),
    g(B),
    g(B),
  ],
})
