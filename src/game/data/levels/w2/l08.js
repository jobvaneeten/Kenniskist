// 2-08 Sneeuwbalkanonnen — de kanonnen vuren op een vast ritme en laden
// zichtbaar op. De richels zijn dekking; wachten is hier sneller dan rennen.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 136

export default maakLevel({
  id: 'w2-l08',
  naam: 'Sneeuwbalkanonnen',
  wereld: 2,
  index: 8,
  doeltijd: 100,
  hints: [T.hints.kanon],
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
    p(30) + munt(6) + p(38) + munt(6) + p(38) + munt(6) + p(12),
    p(28) + plat(10) + p(34) + plat(10) + p(34) + plat(10) + p(10),
    p(6) + munt(5) + p(29) + munt(5) + p(29) + munt(5) + p(29) + munt(5) + p(23),
    p(2) + 'S' + p(5) + 'H' + p(15) + 'W' + p(23) + 'C' + p(11) + 'Z' + p(23) + 'W' + p(19) + 'P' + p(15) + 'Z' + p(9) + 'F' + p(5),
    g(28) + p(5) + g(28) + p(5) + g(28) + p(5) + g(37),
    g(28) + p(5) + g(28) + p(5) + g(28) + p(5) + g(37),
    g(28) + p(5) + g(28) + p(5) + g(28) + p(5) + g(37),
  ],
})
