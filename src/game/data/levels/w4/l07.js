// 4-07 Kortsluiting — deze robots lopen naar je toe, knipperen en ontploffen.
// Stampen kan, maar wegblijven is bijna altijd sneller.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 136

export default maakLevel({
  id: 'w4-l07',
  naam: 'Kortsluiting',
  wereld: 4,
  index: 7,
  doeltijd: 75,
  hints: [T.hints.snel],
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
    p(30) + munt(6) + p(34) + munt(6) + p(34) + munt(6) + p(20),
    p(28) + plat(10) + p(30) + plat(10) + p(30) + plat(10) + p(18),
    p(6) + munt(5) + p(25) + munt(5) + p(25) + munt(5) + p(25) + munt(5) + p(35),
    p(2) + 'S' + p(5) + 'H' + p(15) + 'n' + p(23) + 'n' + p(11) + 'C' + p(19) + 'n' + p(23) + 'n' + p(15) + 'F' + p(15),
    g(34) + p(5) + g(29) + p(5) + g(29) + p(5) + g(29),
    g(34) + p(5) + g(29) + p(5) + g(29) + p(5) + g(29),
    g(34) + p(5) + g(29) + p(5) + g(29) + p(5) + g(29),
  ],
})
