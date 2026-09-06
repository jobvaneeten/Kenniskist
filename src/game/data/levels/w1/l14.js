// 1-14 De hoge route — beneden loop je zo naar de finish, boven ligt het geld.
// De veren zijn de enige ingang naar de hoge route.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 144

export default maakLevel({
  id: 'w1-l14',
  naam: 'De hoge route',
  wereld: 1,
  index: 14,
  doeltijd: 100,
  hints: [T.hints.tweeRoutes],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(26) + munt(4) + p(10) + munt(4) + p(10) + munt(4) + p(10) + munt(4) + p(10) + munt(4) + p(10) + munt(4) + p(44),
    p(24) + plat(10) + p(4) + plat(10) + p(4) + plat(10) + p(4) + plat(10) + p(4) + plat(10) + p(4) + plat(10) + p(40),
    p(B),
    p(40) + munt(3) + p(43) + munt(3) + p(55),
    p(8) + munt(3) + p(50) + munt(3) + p(80),
    p(2) + 'S' + p(5) + 'H' + p(11) + 'v' + p(31) + 'E' + p(7) + 'C' + p(23) + 'v' + p(15) + 'E' + p(9) + 'C' + p(9) + 'B' + p(17) + 'F' + p(5),
    g(40) + p(6) + g(40) + p(6) + g(52),
    g(40) + p(6) + g(40) + p(6) + g(52),
    g(40) + p(6) + g(40) + p(6) + g(52),
  ],
})
