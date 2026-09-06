// 1-06 De heenweg — de kloven zijn te breed om te springen; zonder de
// bewegende platforms kom je er niet over. De sinusbeweging remt af aan de
// uiteinden, dus je wordt er nooit af geslingerd.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 136

export default maakLevel({
  id: 'w1-l06',
  naam: 'De heenweg',
  wereld: 1,
  index: 6,
  doeltijd: 115,
  platformAfstand: [2, 2, 2],
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
    p(38) + munt(4) + p(32) + munt(4) + p(58),
    p(37) + plat(8) + p(28) + plat(8) + p(55),
    p(26) + munt(5) + p(26) + munt(5) + p(26) + munt(5) + p(43),
    p(6) + munt(4) + p(16) + 'M' + p(17) + munt(4) + p(9) + 'M' + p(30) + 'M' + p(7) + munt(4) + p(36),
    p(2) + 'S' + p(5) + 'H' + p(39) + 'C' + p(19) + 'E' + p(31) + 'E' + p(11) + 'E' + p(17) + 'F' + p(5),
    g(24) + p(9) + g(22) + p(9) + g(22) + p(9) + g(41),
    g(24) + p(9) + g(22) + p(9) + g(22) + p(9) + g(41),
    g(24) + p(9) + g(22) + p(9) + g(22) + p(9) + g(41),
  ],
  hints: [T.hints.platform],
})
