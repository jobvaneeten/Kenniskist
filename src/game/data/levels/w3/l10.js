// 3-10 Twee kraters — twee routes over hetzelfde meer. Laag ga je over de
// zinkende platforms; hoog schiet de geiser je naar een richel vol munten.
import { maakLevel, p, g, plat, munt, lava } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 144
const brug = 'z' + p(5)

export default maakLevel({
  id: 'w3-l10',
  naam: 'Twee kraters',
  wereld: 3,
  index: 10,
  doeltijd: 110,
  hints: [T.hints.tweeRoutes],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(28) + munt(8) + p(108),
    p(26) + plat(20) + p(98),
    p(B),
    p(B),
    p(84) + munt(5) + p(24) + munt(5) + p(26),
    p(6) + munt(5) + p(14) + munt(4) + p(6) + munt(4) + p(6) + munt(4) + p(11) + munt(5) + p(29) + munt(5) + p(45),
    p(2) + 'S' + p(5) + 'H' + p(11) + 'G' + p(3) + brug.repeat(4) + 'z' + p(11) + 'C' + p(9) + 'R' + p(29) + 'C' + p(35) + 'F' + p(7),
    g(24) + lava(30) + g(30) + lava(5) + g(24) + lava(5) + g(26),
    g(24) + lava(30) + g(30) + lava(5) + g(24) + lava(5) + g(26),
    g(24) + lava(30) + g(30) + lava(5) + g(24) + lava(5) + g(26),
  ],
})
