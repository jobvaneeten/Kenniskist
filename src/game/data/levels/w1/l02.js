// 1-02 Over de kloof — kloven die stap voor stap breder worden. De laatste is
// precies zo breed dat coyote time het verschil maakt; daarom staat hier ook
// het hintbordje over rennen.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 120

export default maakLevel({
  id: 'w1-l02',
  naam: 'Over de kloof',
  wereld: 1,
  index: 2,
  doeltijd: 80,
  hints: [T.hints.rennen],
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
    p(85) + munt(6) + p(29),
    p(18) + munt(3) + p(14) + munt(4) + p(14) + munt(4) + p(14) + munt(5) + p(8) + plat(8) + p(28),
    p(6) + munt(4) + p(20) + munt(4) + p(86),
    p(2) + 'S' + p(5) + 'H' + p(35) + 'E' + p(15) + 'C' + p(29) + 'E' + p(15) + 'F' + p(13),
    g(18) + p(3) + g(14) + p(4) + g(14) + p(4) + g(14) + p(5) + g(44),
    g(18) + p(3) + g(14) + p(4) + g(14) + p(4) + g(14) + p(5) + g(44),
    g(18) + p(3) + g(14) + p(4) + g(14) + p(4) + g(14) + p(5) + g(44),
  ],
})
