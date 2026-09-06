// 3-01 Warme grond — de eerste lavaplassen en de eerste zinkende platforms.
// De plassen zijn smal genoeg om over te springen; alleen het meer aan het eind
// moet je oversteken voor het platform onder je wegzakt.
import { maakLevel, p, g, munt, lava } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128

export default maakLevel({
  id: 'w3-l01',
  naam: 'Warme grond',
  wereld: 3,
  index: 1,
  doeltijd: 85,
  hints: [T.hints.zink],
  zinkBreedte: [48, 48],
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
    p(40) + munt(6) + p(82),
    p(28) + munt(4) + p(26) + munt(4) + p(14) + munt(6) + p(46),
    p(6) + munt(5) + p(25) + munt(5) + p(25) + munt(5) + p(25) + munt(5) + p(27),
    p(2) + 'S' + p(5) + 'H' + p(11) + 'R' + p(23) + 'C' + p(32) + 'z' + p(7) + 'z' + p(34) + 'F' + p(7),
    g(28) + lava(4) + g(26) + lava(4) + g(14) + lava(16) + g(36),
    g(28) + lava(4) + g(26) + lava(4) + g(14) + lava(16) + g(36),
    g(28) + lava(4) + g(26) + lava(4) + g(14) + lava(16) + g(36),
  ],
})
