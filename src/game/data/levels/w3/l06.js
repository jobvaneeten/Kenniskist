// 3-06 Zinkend pad — één lang lavameer, alleen over te steken via zinkende
// platforms. Ze staan dicht genoeg bij elkaar om door te lopen, maar te ver om
// even uit te rusten.
import { maakLevel, p, g, munt, lava } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128
const brug = 'z' + p(5)      // platform van 3 tegels, gat van 3
const muntPaar = munt(2) + p(4)

export default maakLevel({
  id: 'w3-l06',
  naam: 'Zinkend pad',
  wereld: 3,
  index: 6,
  doeltijd: 95,
  hints: [T.hints.zink],
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
    p(B),
    p(B),
    p(6) + munt(4) + p(11) + muntPaar.repeat(13) + munt(2) + p(27),
    p(2) + 'S' + p(5) + 'H' + p(11) + brug.repeat(13) + 'z' + p(11) + 'C' + p(9) + 'F' + p(7),
    g(20) + lava(84) + g(24),
    g(20) + lava(84) + g(24),
    g(20) + lava(84) + g(24),
  ],
})
