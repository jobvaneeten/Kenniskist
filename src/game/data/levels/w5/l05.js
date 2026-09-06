// 5-05 Nanozwerm — de zwermen komen traag maar onvermijdelijk. Blijf je te
// lang munten pakken, dan is de route dicht.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 144

export default maakLevel({
  id: 'w5-l05',
  naam: 'Nanozwerm',
  wereld: 5,
  index: 5,
  doeltijd: 80,
  hints: [T.hints.snel],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(24) + 'm' + p(31) + 'm' + p(31) + 'm' + p(55),
    p(B),
    p(B),
    p(B),
    p(B),
    p(28) + munt(6) + p(32) + munt(6) + p(32) + munt(6) + p(34),
    p(26) + plat(10) + p(28) + plat(10) + p(28) + plat(10) + p(32),
    p(6) + munt(6) + p(26) + munt(6) + p(26) + munt(6) + p(26) + munt(6) + p(36),
    p(2) + 'S' + p(5) + 'H' + p(19) + 'e' + p(27) + 'C' + p(27) + 'e' + p(27) + 'c' + p(15) + 'C' + p(9) + 'F' + p(5),
    g(B),
    g(B),
    g(B),
  ],
})
