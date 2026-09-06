// 1-11 Twee manen — verticaal level, negen richels die om en om naar links en
// rechts staan. Elke sprong is drie rijen omhoog en hooguit vier tegels opzij:
// precies binnen wat een gewone sprong haalt, zonder veer.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 64

export default maakLevel({
  id: 'w1-l11',
  naam: 'Twee manen',
  wereld: 1,
  index: 11,
  doeltijd: 105,
  hints: [T.hints.omhoog],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(6) + munt(4) + p(2) + 'F' + p(51),
    p(6) + plat(15) + p(43),
    p(B),
    p(24) + munt(4) + p(36),
    p(24) + plat(15) + p(25),
    p(B),
    p(8) + munt(4) + p(6) + 'C' + p(45),
    p(8) + plat(15) + p(41),
    p(B),
    p(26) + munt(4) + p(4) + 'E' + p(29),
    p(26) + plat(15) + p(23),
    p(B),
    p(10) + munt(4) + p(50),
    p(10) + plat(15) + p(39),
    p(B),
    p(28) + munt(4) + p(4) + 'C' + p(27),
    p(28) + plat(15) + p(21),
    p(34) + 'K' + p(29),
    p(12) + munt(4) + p(48),
    p(12) + plat(15) + p(37),
    p(B),
    p(30) + munt(4) + p(30),
    p(30) + plat(15) + p(19),
    p(B),
    p(14) + munt(4) + p(46),
    p(14) + plat(15) + p(35),
    p(B),
    p(4) + 'S' + p(5) + 'H' + p(9) + 'v' + p(4) + munt(4) + p(35),
    g(B),
    g(B),
    g(B),
  ],
})
