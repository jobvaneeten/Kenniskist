// 2-15 Kristalvorst — alles uit wereld 1 en 2 achter elkaar: steen, ijs, dun
// ijs, wind, een veer, een bewegend platform en elke vijandsoort.
import { maakLevel, p, g, plat, munt, ijs, dun } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 160

export default maakLevel({
  id: 'w2-l15',
  naam: 'Kristalvorst',
  wereld: 2,
  index: 15,
  doeltijd: 120,
  hints: [T.hints.dunIjs],
  wind: { sterkte: 50, periode: 4 },
  platformAfstand: [3],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(27) + munt(6) + p(127),
    p(24) + plat(12) + p(124),
    p(60) + 'L' + p(40) + 'L' + p(58),
    p(24) + munt(4) + p(49) + munt(4) + p(27) + munt(4) + p(27) + munt(4) + p(17),
    p(6) + munt(4) + p(28) + munt(4) + p(28) + munt(4) + p(4) + 'M' + p(23) + munt(4) + p(54),
    p(2) + 'S' + p(5) + 'H' + p(11) + 'v' + p(19) + 'P' + p(27) + 'C' + p(21) + 'W' + p(9) + 'B' + p(19) + 'P' + p(24) + 'C' + p(4) + 'E' + p(3) + 'F' + p(5),
    g(24) + p(5) + ijs(24) + dun(8) + ijs(16) + p(6) + g(24) + p(5) + ijs(24) + p(5) + g(19),
    g(24) + p(5) + ijs(24) + dun(8) + ijs(16) + p(6) + g(24) + p(5) + ijs(24) + p(5) + g(19),
    g(24) + p(5) + ijs(24) + dun(8) + ijs(16) + p(6) + g(24) + p(5) + ijs(24) + p(5) + g(19),
  ],
})
