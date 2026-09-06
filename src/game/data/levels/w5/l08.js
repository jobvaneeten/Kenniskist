// 5-08 De trechter — twee wezens in het midden trekken alles naar zich toe.
// De route loopt er precies tussendoor.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128

export default maakLevel({
  id: 'w5-l08',
  naam: 'De trechter',
  wereld: 5,
  index: 8,
  doeltijd: 105,
  hints: [T.hints.omkeren],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(56) + 'w' + p(13) + 'w' + p(57),
    p(B),
    p(B),
    p(B),
    p(B),
    p(26) + munt(6) + p(30) + munt(6) + p(30) + munt(6) + p(24),
    p(24) + plat(10) + p(26) + plat(10) + p(26) + plat(10) + p(22),
    p(6) + munt(6) + p(26) + munt(6) + p(26) + munt(6) + p(26) + munt(6) + p(20),
    p(2) + 'S' + p(5) + 'H' + p(19) + 'e' + p(23) + 'C' + p(23) + 'c' + p(23) + 'e' + p(15) + 'F' + p(11),
    g(30) + p(5) + g(27) + p(5) + g(27) + p(5) + g(29),
    g(30) + p(5) + g(27) + p(5) + g(27) + p(5) + g(29),
    g(30) + p(5) + g(27) + p(5) + g(27) + p(5) + g(29),
  ],
})
