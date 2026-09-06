// 1-10 Het kevernest — kristalkevers. Eén stamp haalt het schild eraf, daarna
// rennen ze weg: de tweede stamp is een ander probleem dan de eerste.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128

export default maakLevel({
  id: 'w1-l10',
  naam: 'Het kevernest',
  wereld: 1,
  index: 10,
  doeltijd: 100,
  hints: [T.hints.kever],
  capsules: ['schild'],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(52) + '?' + p(75),
    p(37) + munt(6) + p(29) + munt(6) + p(50),
    p(36) + plat(8) + p(28) + plat(8) + p(48),
    p(30) + munt(4) + p(30) + munt(4) + p(30) + munt(4) + p(26),
    p(6) + munt(4) + p(96) + munt(4) + p(18),
    p(2) + 'S' + p(5) + 'H' + p(13) + 'B' + p(21) + 'C' + p(11) + 'B' + p(23) + 'B' + p(9) + 'E' + p(21) + 'B' + p(9) + 'F' + p(5),
    g(30) + p(4) + g(30) + p(4) + g(30) + p(4) + g(26),
    g(30) + p(4) + g(30) + p(4) + g(30) + p(4) + g(26),
    g(30) + p(4) + g(30) + p(4) + g(30) + p(4) + g(26),
  ],
})
