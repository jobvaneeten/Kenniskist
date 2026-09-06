// 1-15 Voor de troon — alles uit wereld 1 achter elkaar, in oplopend tempo.
// Het laatste level voor de baas, dus hier mag niets nieuws meer bij.
import { maakLevel, p, g, plat, munt, breek } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 160

export default maakLevel({
  id: 'w1-l15',
  naam: 'Voor de troon',
  wereld: 1,
  index: 15,
  doeltijd: 115,
  hints: [T.hints.valplatform],
  capsules: ['schild'],
  platformAfstand: [4],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(102) + munt(8) + p(50),
    p(100) + plat(12) + p(48),
    p(38) + munt(8) + p(114),
    p(36) + breek(6) + '?' + breek(5) + p(12) + 'K' + p(9) + 'K' + p(89),
    p(29) + munt(3) + p(27) + munt(4) + p(31) + munt(3) + p(25) + munt(3) + p(35),
    p(59) + 'M' + p(100),
    p(2) + 'S' + p(5) + 'H' + p(11) + 'E' + p(19) + 'v' + p(9) + 'J' + p(19) + 'C' + p(9) + 'B' + p(17) + 'v' + p(7) + 'E' + p(5) + 'J' + p(15) + 'C' + p(5) + 'v' + p(11) + 'E' + p(7) + 'F' + p(5),
    g(28) + p(5) + g(24) + p(9) + g(26) + p(5) + g(24) + p(5) + g(34),
    g(28) + p(5) + g(24) + p(9) + g(26) + p(5) + g(24) + p(5) + g(34),
    g(28) + p(5) + g(24) + p(9) + g(26) + p(5) + g(24) + p(5) + g(34),
  ],
})
