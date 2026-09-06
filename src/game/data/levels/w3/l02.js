// 3-02 Geiserveld — de lavameren zijn te breed om over te springen. De geisers
// schieten je op een vaste cadans omhoog naar de richels erboven; wachten tot
// de straal komt hoort erbij.
import { maakLevel, p, g, plat, munt, lava } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128

export default maakLevel({
  id: 'w3-l02',
  naam: 'Geiserveld',
  wereld: 3,
  index: 2,
  doeltijd: 90,
  hints: [T.hints.geiser],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(26) + munt(8) + p(22) + munt(8) + p(22) + munt(8) + p(34),
    p(24) + plat(12) + p(18) + plat(12) + p(18) + plat(12) + p(32),
    p(B),
    p(B),
    p(6) + munt(5) + p(31) + munt(5) + p(31) + munt(5) + p(45),
    p(2) + 'S' + p(5) + 'H' + p(11) + 'G' + p(23) + 'C' + p(5) + 'G' + p(29) + 'G' + p(13) + 'R' + p(19) + 'F' + p(13),
    g(24) + lava(10) + g(20) + lava(10) + g(20) + lava(10) + g(34),
    g(24) + lava(10) + g(20) + lava(10) + g(20) + lava(10) + g(34),
    g(24) + lava(10) + g(20) + lava(10) + g(20) + lava(10) + g(34),
  ],
})
