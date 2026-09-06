// 1-07 Kwallenlucht — een lange kloof met losse platforms en zwevende
// ruimtekwallen. Kwallen zijn niet te stampen; dat is hier de hele les.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128

export default maakLevel({
  id: 'w1-l07',
  naam: 'Kwallenlucht',
  wereld: 1,
  index: 7,
  doeltijd: 90,
  hints: [T.hints.kwal],
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
    p(35) + 'K' + p(9) + 'K' + p(9) + 'K' + p(9) + 'K' + p(9) + 'K' + p(52),
    p(6) + munt(4) + p(19) + munt(4) + p(6) + munt(4) + p(6) + munt(4) + p(6) + munt(4) + p(6) + munt(4) + p(27) + munt(6) + p(22),
    p(28) + plat(6) + p(4) + plat(6) + p(4) + plat(6) + p(4) + plat(6) + p(4) + plat(6) + p(4) + plat(6) + p(44),
    p(2) + 'S' + p(5) + 'H' + p(11) + 'C' + p(75) + 'E' + p(13) + 'E' + p(11) + 'F' + p(5),
    g(28) + p(56) + g(44),
    g(28) + p(56) + g(44),
    g(28) + p(56) + g(44),
  ],
})
