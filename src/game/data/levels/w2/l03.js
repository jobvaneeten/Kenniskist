// 2-03 Dun ijs — één lange brug over een kloof. De ijsplaten barsten zodra je
// erop staat; de vaste stukken ertussen zijn de enige plek om te wachten.
import { maakLevel, p, g, plat, munt, dun } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128
const brug = dun(10) + plat(6)

export default maakLevel({
  id: 'w2-l03',
  naam: 'Dun ijs',
  wereld: 2,
  index: 3,
  doeltijd: 90,
  hints: [T.hints.dunIjs],
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
    p(40) + 'L' + p(29) + 'L' + p(57),
    p(B),
    p(B),
    p(6) + munt(4) + p(12) + munt(6) + p(10) + munt(6) + p(10) + munt(6) + p(10) + munt(6) + p(10) + munt(6) + p(36),
    p(2) + 'S' + p(5) + 'H' + p(55) + 'C' + p(53) + 'F' + p(9),
    g(20) + brug + brug + brug + brug + brug + dun(8) + g(20),
    g(20) + p(88) + g(20),
    g(20) + p(88) + g(20),
  ],
})
