// 4-08 De lus — banden in twee richtingen door elkaar. De snelste route loopt
// niet altijd rechtdoor.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 144

export default maakLevel({
  id: 'w4-l08',
  naam: 'De lus',
  wereld: 4,
  index: 8,
  doeltijd: 75,
  hints: [T.hints.band],
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
    p(26) + munt(8) + p(38) + munt(8) + p(64),
    p(24) + plat(12) + p(34) + plat(12) + p(62),
    p(6) + munt(5) + p(25) + munt(5) + p(25) + munt(5) + p(25) + munt(5) + p(43),
    p(2) + 'S' + p(5) + 'H' + p(19) + 'r' + p(27) + 'C' + p(23) + 'n' + p(15) + 'C' + p(11) + 'r' + p(19) + 'F' + p(15),
    g(10) + '>'.repeat(16) + g(8) + '<'.repeat(16) + g(8) + '>'.repeat(16) + g(8) + '<'.repeat(16) + g(46),
    g(B),
    g(B),
  ],
})
