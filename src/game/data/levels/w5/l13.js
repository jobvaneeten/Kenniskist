// 5-13 Vrije val — één lange val omlaag. De richels breken je val, de wezens
// trekken je ervan af.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 48

export default maakLevel({
  id: 'w5-l13',
  naam: 'Vrije val',
  wereld: 5,
  index: 13,
  doeltijd: 65,
  hints: [T.hints.snel],
  kaart: [
    p(B),
    p(4) + 'S' + p(3) + 'H' + p(5) + munt(4) + p(30),
    p(4) + plat(15) + p(29),
    p(B),
    p(26) + munt(4) + p(18),
    p(24) + plat(15) + p(9),
    p(B),
    p(8) + munt(4) + p(4) + 'w' + p(31),
    p(6) + plat(15) + p(27),
    p(B),
    p(26) + munt(4) + p(4) + 'C' + p(13),
    p(24) + plat(15) + p(9),
    p(B),
    p(8) + munt(4) + p(36),
    p(6) + plat(15) + p(27),
    p(B),
    p(26) + munt(4) + p(4) + 'w' + p(13),
    p(24) + plat(15) + p(9),
    p(B),
    p(8) + munt(4) + p(36),
    p(6) + plat(15) + p(27),
    p(B),
    p(26) + munt(4) + p(4) + 'C' + p(13),
    p(24) + plat(15) + p(9),
    p(B),
    p(8) + munt(5) + p(35),
    p(6) + plat(15) + p(27),
    p(B),
    p(24) + munt(5) + p(2) + 'e' + p(16),
    p(B),
    p(20) + munt(5) + p(2) + 'F' + p(20),
    g(B),
    g(B),
    g(B),
  ],
})
