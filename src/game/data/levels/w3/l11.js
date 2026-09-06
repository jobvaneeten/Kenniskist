// 3-11 Hitteflikkering — de hete lucht maakt het beeld onrustig. De route is
// niet moeilijker dan in 3-05, maar je moet beter kijken.
import { maakLevel, p, g, plat, munt, lava } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 136

export default maakLevel({
  id: 'w3-l11',
  naam: 'Hitteflikkering',
  wereld: 3,
  index: 11,
  doeltijd: 90,
  hitte: 2.4,
  hints: [T.hints.lava],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(24) + 'D' + p(35) + 'D' + p(75),
    p(B),
    p(B),
    p(26) + munt(6) + p(30) + munt(6) + p(30) + munt(6) + p(32),
    p(24) + plat(10) + p(26) + plat(10) + p(26) + plat(10) + p(30),
    p(6) + munt(5) + p(27) + munt(5) + p(27) + munt(5) + p(27) + munt(5) + p(29),
    p(2) + 'S' + p(5) + 'H' + p(15) + 'A' + p(11) + 'R' + p(15) + 'C' + p(19) + 'A' + p(15) + 'U' + p(15) + 'R' + p(23) + 'F' + p(7),
    g(30) + lava(5) + g(31) + lava(5) + g(31) + lava(5) + g(29),
    g(30) + lava(5) + g(31) + lava(5) + g(31) + lava(5) + g(29),
    g(30) + lava(5) + g(31) + lava(5) + g(31) + lava(5) + g(29),
  ],
})
