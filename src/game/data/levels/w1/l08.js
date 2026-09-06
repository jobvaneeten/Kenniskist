// 1-08 Onder de wortels — een krappe grot. Het plafond hangt zo laag dat
// rennen en hoog springen niet meer helpen; hier moet je precies zijn.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 120

export default maakLevel({
  id: 'w1-l08',
  naam: 'Onder de wortels',
  wereld: 1,
  index: 8,
  doeltijd: 95,
  hints: [T.hints.grot],
  kaart: [
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    p(28) + g(3) + p(13) + g(3) + p(15) + g(3) + p(17) + g(3) + p(35),
    p(16) + munt(4) + p(8) + g(3) + p(13) + g(3) + p(2) + munt(4) + p(9) + g(3) + p(17) + g(3) + p(35),
    p(8) + munt(5) + p(19) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(23),
    p(2) + 'S' + p(3) + 'H' + p(13) + 'E' + p(15) + '#' + p(3) + 'C' + p(9) + 'E' + p(3) + '#' + p(13) + 'J' + p(5) + '#' + p(15) + 'E' + p(23) + 'F' + p(5),
    g(B),
    g(B),
    g(B),
  ],
})
