// 4-14 Serverhal — de dichtste vijandbezetting van het spel. Geen nieuwe
// mechanic, alleen alles tegelijk.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 152

export default maakLevel({
  id: 'w4-l14',
  naam: 'Serverhal',
  wereld: 4,
  index: 14,
  doeltijd: 105,
  hints: [T.hints.snel],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(24) + 'X' + p(27) + 'X' + p(27) + 'X' + p(27) + 'X' + p(43),
    p(B),
    p(B),
    p(B),
    p(B),
    p(26) + munt(6) + p(30) + munt(6) + p(30) + munt(6) + p(48),
    p(24) + plat(10) + p(26) + plat(10) + p(26) + plat(10) + p(46),
    p(6) + munt(5) + p(23) + munt(5) + p(23) + munt(5) + p(23) + munt(5) + p(23) + munt(5) + p(29),
    p(2) + 'S' + p(5) + 'H' + p(11) + 'O' + p(15) + 'r' + p(11) + 'n' + p(11) + 'C' + p(15) + 'r' + p(11) + 'O' + p(15) + 'n' + p(11) + 'C' + p(11) + 'r' + p(11) + 'F' + p(11),
    g(B),
    g(B),
    g(B),
  ],
})
