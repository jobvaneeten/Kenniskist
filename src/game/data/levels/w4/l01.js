// 4-01 Stroom erop — de eerste lopende banden. Met de band mee haal je een
// sprong die je tegen de band in nooit haalt.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128

export default maakLevel({
  id: 'w4-l01',
  naam: 'Stroom erop',
  wereld: 4,
  index: 1,
  doeltijd: 90,
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
    p(38) + munt(6) + p(38) + munt(6) + p(40),
    p(36) + plat(10) + p(36) + plat(10) + p(36),
    p(6) + munt(5) + p(19) + munt(6) + p(24) + munt(6) + p(24) + munt(6) + p(32),
    p(2) + 'S' + p(5) + 'H' + p(19) + 'r' + p(29) + 'C' + p(21) + 'r' + p(27) + 'F' + p(19),
    g(12) + '>'.repeat(14) + g(10) + '>'.repeat(14) + g(10) + '<'.repeat(12) + g(10) + '>'.repeat(14) + g(32),
    g(12) + g(14) + g(10) + g(14) + g(10) + g(12) + g(10) + g(14) + g(32),
    g(12) + g(14) + g(10) + g(14) + g(10) + g(12) + g(10) + g(14) + g(32),
  ],
})
