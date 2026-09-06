// 5-12 Het weefsel — vier portaalparen door elkaar. De kleuren zeggen welke
// monden bij elkaar horen; de kortste route is niet de meest voor de hand
// liggende.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 160

export default maakLevel({
  id: 'w5-l12',
  naam: 'Het weefsel',
  wereld: 5,
  index: 12,
  doeltijd: 80,
  hints: [T.hints.portaal],
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
    p(24) + munt(6) + p(30) + munt(6) + p(30) + munt(6) + p(58),
    p(6) + munt(6) + p(22) + munt(6) + p(22) + munt(6) + p(22) + munt(6) + p(22) + munt(6) + p(36),
    p(2) + 'S' + p(5) + 'H' + p(7) + '(' + p(11) + ')' + p(11) + '(' + p(11) + 'C' + p(7) + ')' + p(11) + '(' + p(11) + ')' + p(11) + '(' + p(11) + 'C' + p(7) + ')' + p(9) + 'F' + p(33),
    g(30) + p(5) + g(29) + p(5) + g(29) + p(5) + g(57),
    g(30) + p(5) + g(29) + p(5) + g(29) + p(5) + g(57),
    g(30) + p(5) + g(29) + p(5) + g(29) + p(5) + g(57),
  ],
})
