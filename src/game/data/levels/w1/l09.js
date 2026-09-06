// 1-09 Veer na veer — het eerste verticale level. Eén lange klim langs een
// ketting van veren; elke veer brengt je precies één platform hoger. De
// afstanden zijn krap gehouden, maar altijd binnen één veersprong.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 48

export default maakLevel({
  id: 'w1-l09',
  naam: 'Veer na veer',
  wereld: 1,
  index: 9,
  doeltijd: 85,
  hints: [T.hints.omhoog],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(17) + munt(5) + p(2) + 'F' + p(23),
    p(16) + plat(17) + p(15),
    p(B),
    p(B),
    p(B),
    p(10) + 'v' + p(2) + munt(5) + p(30),
    p(4) + plat(15) + p(29),
    p(B),
    p(B),
    p(B),
    p(14) + munt(5) + p(1) + 'v' + p(27),
    p(14) + plat(15) + p(19),
    p(B),
    p(B),
    p(B),
    p(28) + munt(5) + p(1) + 'v' + p(5) + 'C' + p(7),
    p(28) + plat(15) + p(5),
    p(B),
    p(B),
    p(34) + 'K' + p(13),
    p(24) + 'v' + p(1) + munt(5) + p(17),
    p(16) + plat(15) + p(17),
    p(B),
    p(B),
    p(20) + 'K' + p(27),
    p(4) + munt(6) + p(2) + 'v' + p(1) + 'C' + p(33),
    p(4) + plat(15) + p(29),
    p(B),
    p(B),
    p(B),
    p(B),
    p(4) + 'S' + p(3) + 'H' + p(3) + 'v' + p(35),
    g(B),
    g(B),
    g(B),
  ],
})
