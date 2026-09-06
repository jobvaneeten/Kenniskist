// 3-05 Magmakrabben — hun pantser zit aan de bovenkant, dus stampen werkt
// niet. Ze zijn snel; de richels zijn de enige plek waar je ze voorbij komt.
import { maakLevel, p, g, plat, munt, lava } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 136

export default maakLevel({
  id: 'w3-l05',
  naam: 'Magmakrabben',
  wereld: 3,
  index: 5,
  doeltijd: 100,
  hints: [T.hints.krab],
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
    p(24) + munt(6) + p(26) + munt(6) + p(26) + munt(6) + p(42),
    p(22) + plat(10) + p(22) + plat(10) + p(22) + plat(10) + p(40),
    p(6) + munt(5) + p(25) + munt(5) + p(25) + munt(5) + p(25) + munt(5) + p(35),
    p(2) + 'S' + p(5) + 'H' + p(11) + 'R' + p(19) + 'R' + p(11) + 'C' + p(23) + 'R' + p(19) + 'R' + p(11) + 'A' + p(19) + 'F' + p(7),
    g(34) + lava(5) + g(29) + lava(5) + g(29) + lava(5) + g(29),
    g(34) + lava(5) + g(29) + lava(5) + g(29) + lava(5) + g(29),
    g(34) + lava(5) + g(29) + lava(5) + g(29) + lava(5) + g(29),
  ],
})
