// 3-15 Voor de titaan — alles uit wereld 3 achter elkaar: een geiser, een brug
// van zinkende platforms over het meer, spetters, een krab en een vleermuis.
import { maakLevel, p, g, plat, munt, lava } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 160
const brug = 'z' + p(5)

export default maakLevel({
  id: 'w3-l15',
  naam: 'Voor de titaan',
  wereld: 3,
  index: 15,
  doeltijd: 110,
  hitte: 1.6,
  hints: [T.hints.lava],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(18) + 'D' + p(41) + 'D' + p(41) + 'D' + p(57),
    p(B),
    p(B),
    p(B),
    p(56) + munt(6) + p(38) + munt(6) + p(54),
    p(54) + plat(10) + p(34) + plat(10) + p(52),
    p(6) + munt(4) + p(20) + munt(4) + p(6) + munt(4) + p(6) + munt(4) + p(24) + munt(4) + p(38) + munt(4) + p(36),
    p(2) + 'S' + p(5) + 'H' + p(11) + 'G' + p(7) + brug.repeat(3) + 'z' + p(13) + 'C' + p(9) + 'R' + p(19) + 'A' + p(9) + 'U' + p(15) + 'C' + p(19) + 'R' + p(15) + 'F' + p(7),
    g(28) + lava(24) + g(28) + lava(5) + g(24) + lava(5) + g(46),
    g(28) + lava(24) + g(28) + lava(5) + g(24) + lava(5) + g(46),
    g(28) + lava(24) + g(28) + lava(5) + g(24) + lava(5) + g(46),
  ],
})
