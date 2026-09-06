// 2-02 Slippartij — ijs tot aan de rand van elk gat. Remmen kan niet meer;
// je moet de sprong al inzetten voordat je bij het gat bent.
import { maakLevel, p, g, munt, ijs } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128

export default maakLevel({
  id: 'w2-l02',
  naam: 'Slippartij',
  wereld: 2,
  index: 2,
  doeltijd: 85,
  hints: [T.hints.ijs],
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
    p(20) + munt(4) + p(24) + munt(4) + p(24) + munt(5) + p(24) + munt(4) + p(19),
    p(6) + munt(5) + p(23) + munt(5) + p(23) + munt(5) + p(23) + munt(5) + p(33),
    p(2) + 'S' + p(5) + 'H' + p(23) + 'E' + p(27) + 'C' + p(29) + 'P' + p(29) + 'F' + p(7),
    ijs(20) + p(4) + ijs(24) + p(4) + ijs(24) + p(5) + ijs(24) + p(4) + g(19),
    ijs(20) + p(4) + ijs(24) + p(4) + ijs(24) + p(5) + ijs(24) + p(4) + g(19),
    ijs(20) + p(4) + ijs(24) + p(4) + ijs(24) + p(5) + ijs(24) + p(4) + g(19),
  ],
})
