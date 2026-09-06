// 3-09 Asvliegen — ze komen traag maar onvermijdelijk op je af. Je kunt ze
// stampen, maar meestal is doorlopen sneller.
import { maakLevel, p, g, plat, munt, lava } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 136

export default maakLevel({
  id: 'w3-l09',
  naam: 'Asvliegen',
  wereld: 3,
  index: 9,
  doeltijd: 105,
  hints: [T.hints.snel],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(24) + 'D' + p(23) + 'D' + p(23) + 'D' + p(23) + 'D' + p(39),
    p(B),
    p(B),
    p(B),
    p(26) + munt(6) + p(30) + munt(6) + p(30) + munt(6) + p(32),
    p(24) + plat(10) + p(26) + plat(10) + p(26) + plat(10) + p(30),
    p(6) + munt(5) + p(27) + munt(5) + p(27) + munt(5) + p(27) + munt(5) + p(29),
    p(2) + 'S' + p(5) + 'H' + p(15) + 'R' + p(27) + 'C' + p(23) + 'A' + p(27) + 'R' + p(23) + 'F' + p(7),
    g(30) + lava(5) + g(31) + lava(5) + g(31) + lava(5) + g(29),
    g(30) + lava(5) + g(31) + lava(5) + g(31) + lava(5) + g(29),
    g(30) + lava(5) + g(31) + lava(5) + g(31) + lava(5) + g(29),
  ],
})
