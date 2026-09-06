// 3-04 Vuurvleermuizen — ze hangen stil tot je eronder komt en duiken dan in
// een boog. Onderdoor rennen werkt; blijven staan niet.
import { maakLevel, p, g, plat, munt, lava } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 136

export default maakLevel({
  id: 'w3-l04',
  naam: 'Vuurvleermuizen',
  wereld: 3,
  index: 4,
  doeltijd: 95,
  kaart: [
    g(B),
    g(B),
    g(B),
    g(B),
    p(16) + 'U' + p(19) + 'U' + p(19) + 'U' + p(19) + 'U' + p(19) + 'U' + p(39),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(30) + munt(6) + p(38) + munt(6) + p(38) + munt(6) + p(12),
    p(28) + plat(10) + p(34) + plat(10) + p(34) + plat(10) + p(10),
    p(6) + munt(5) + p(29) + munt(5) + p(29) + munt(5) + p(29) + munt(5) + p(23),
    p(2) + 'S' + p(5) + 'H' + p(15) + 'R' + p(23) + 'C' + p(35) + 'R' + p(31) + 'D' + p(11) + 'F' + p(7),
    g(28) + lava(5) + g(28) + lava(5) + g(28) + lava(5) + g(37),
    g(28) + lava(5) + g(28) + lava(5) + g(28) + lava(5) + g(37),
    g(28) + lava(5) + g(28) + lava(5) + g(28) + lava(5) + g(37),
  ],
  hints: [T.hints.snel],
})
