// 5-15 Alles tegelijk — elke mechanic uit het spel komt hier één keer voorbij:
// een veer, een bewegend platform, verdwijnende tegels, een portaal, een
// zwaartekrachtplaat en drie soorten wezens.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 176
const brug = ':'.repeat(4) + p(2) + ';'.repeat(4) + p(2)

export default maakLevel({
  id: 'w5-l15',
  naam: 'Alles tegelijk',
  wereld: 5,
  index: 15,
  doeltijd: 120,
  hints: [T.hints.verdwijnt],
  platformAfstand: [3],
  kaart: [
    g(B),
    g(B),
    g(B),
    p(28) + munt(6) + p(38) + munt(6) + p(38) + munt(6) + p(54),
    p(B),
    p(B),
    p(70) + 'm' + p(35) + 'w' + p(69),
    p(B),
    p(B),
    p(B),
    p(30) + munt(6) + p(38) + munt(6) + p(96),
    p(28) + plat(10) + p(34) + plat(10) + p(94),
    p(6) + munt(6) + p(22) + munt(6) + p(70) + munt(6) + p(22) + munt(6) + p(32),
    p(2) + 'S' + p(5) + 'H' + p(7) + 'v' + p(7) + '@' + p(11) + 'c' + p(11) + 'C' + p(7) + 'M' + p(11) + '(' + p(15) + ')' + p(11) + 'e' + p(15) + 'C' + p(11) + 'e' + p(9) + 'F' + p(41),
    g(60) + brug.repeat(4) + g(68),
    g(60) + p(48) + g(68),
    g(60) + p(48) + g(68),
  ],
})
