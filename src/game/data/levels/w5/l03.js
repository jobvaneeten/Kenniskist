// 5-03 Nu je me ziet — verdwijnende platforms. De twee helften wisselen om de
// anderhalve seconde; aan het merkteken zie je bij welke groep een tegel hoort.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 136
// Om en om: eerst de A-helft, dan de B-helft. Zo loop je precies op de cadans.
const brug = ':'.repeat(4) + p(2) + ';'.repeat(4) + p(2)

export default maakLevel({
  id: 'w5-l03',
  naam: 'Nu je me ziet',
  wereld: 5,
  index: 3,
  doeltijd: 100,
  hints: [T.hints.verdwijnt],
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
    p(B),
    p(6) + munt(5) + p(15) + munt(4) + p(8) + munt(4) + p(8) + munt(4) + p(8) + munt(4) + p(8) + munt(4) + p(8) + munt(4) + p(46),
    p(2) + 'S' + p(5) + 'H' + p(101) + 'C' + p(9) + 'F' + p(15),
    g(20) + brug.repeat(6) + g(44),
    g(20) + p(72) + g(44),
    g(20) + p(72) + g(44),
  ],
})
