// 1-01 Zachte landing — leert lopen, springen en munten pakken. Niets in dit
// level kan je doden zonder dat je het aan ziet komen.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 112

export default maakLevel({
  id: 'w1-l01',
  naam: 'Zachte landing',
  wereld: 1,
  index: 1,
  doeltijd: 80,
  achtergrond: 'kristalwoud',
  hints: [T.hints.springen, T.hints.stampen],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(84) + munt(5) + p(23),
    p(84) + plat(6) + p(22),
    p(28) + munt(6) + p(22) + munt(6) + p(50),
    p(20) + munt(4) + p(4) + plat(6) + p(10) + munt(4) + p(8) + plat(6) + p(10) + munt(4) + p(36),
    p(8) + munt(3) + p(101),
    p(2) + 'S' + p(3) + 'H' + p(25) + 'H' + p(3) + 'E' + p(15) + 'C' + p(11) + 'E' + p(15) + 'v' + p(25) + 'F' + p(5),
    g(20) + p(4) + g(20) + p(4) + g(24) + p(4) + g(36),
    g(20) + p(4) + g(20) + p(4) + g(24) + p(4) + g(36),
    g(20) + p(4) + g(20) + p(4) + g(24) + p(4) + g(36),
  ],
})
