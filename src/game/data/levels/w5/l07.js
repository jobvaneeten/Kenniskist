// 5-07 Zwaartekrachtwezens — ze doen geen pijn, ze trekken. Elke sprong in hun
// buurt komt korter uit dan je bedoelde.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 144

export default maakLevel({
  id: 'w5-l07',
  naam: 'Zwaartekrachtwezens',
  wereld: 5,
  index: 7,
  doeltijd: 115,
  hints: [T.hints.omkeren],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(26) + 'w' + p(31) + 'w' + p(31) + 'w' + p(53),
    p(B),
    p(B),
    p(B),
    p(30) + munt(6) + p(32) + munt(6) + p(32) + munt(6) + p(32),
    p(28) + plat(10) + p(28) + plat(10) + p(28) + plat(10) + p(30),
    p(6) + munt(6) + p(26) + munt(6) + p(26) + munt(6) + p(26) + munt(6) + p(36),
    p(2) + 'S' + p(5) + 'H' + p(19) + 'e' + p(27) + 'C' + p(27) + 'c' + p(27) + 'e' + p(15) + 'C' + p(9) + 'F' + p(5),
    g(34) + p(5) + g(31) + p(5) + g(31) + p(5) + g(33),
    g(34) + p(5) + g(31) + p(5) + g(31) + p(5) + g(33),
    g(34) + p(5) + g(31) + p(5) + g(31) + p(5) + g(33),
  ],
})
