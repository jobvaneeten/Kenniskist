// 3-14 Het gietkanaal — lavastromen als bewegende muren. De platforms er
// tussenin bewegen mee; de timing van beide bepaalt wanneer je gaat.
import { maakLevel, p, g, plat, munt, lava } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 152

export default maakLevel({
  id: 'w3-l14',
  naam: 'Het gietkanaal',
  wereld: 3,
  index: 14,
  doeltijd: 115,
  hints: [T.hints.zink],
  platformAfstand: [3, 3, 3],
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
    p(28) + munt(6) + p(32) + munt(6) + p(32) + munt(6) + p(42),
    p(30) + munt(6) + p(38) + munt(6) + p(38) + munt(6) + p(28),
    p(28) + plat(10) + p(34) + plat(10) + p(34) + plat(10) + p(26),
    p(6) + munt(4) + p(24) + 'M' + p(29) + 'M' + p(29) + 'M' + p(21) + munt(4) + p(32),
    p(2) + 'S' + p(5) + 'H' + p(15) + 'A' + p(19) + 'C' + p(23) + 'A' + p(19) + 'R' + p(19) + 'C' + p(15) + 'A' + p(19) + 'F' + p(7),
    g(26) + lava(5) + g(31) + lava(5) + g(31) + lava(5) + g(49),
    g(26) + lava(5) + g(31) + lava(5) + g(31) + lava(5) + g(49),
    g(26) + lava(5) + g(31) + lava(5) + g(31) + lava(5) + g(49),
  ],
})
