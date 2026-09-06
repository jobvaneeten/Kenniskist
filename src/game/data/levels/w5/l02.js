// 5-02 Poortjes — de eerste portalen. Twee monden met dezelfde kleur horen bij
// elkaar, dus je ziet vóór het instappen waar je uitkomt.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 136

export default maakLevel({
  id: 'w5-l02',
  naam: 'Poortjes',
  wereld: 5,
  index: 2,
  doeltijd: 100,
  hints: [T.hints.portaal],
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
    p(B),
    p(B),
    p(24) + munt(6) + p(30) + munt(6) + p(30) + munt(6) + p(34),
    p(6) + munt(6) + p(24) + munt(6) + p(24) + munt(6) + p(24) + munt(6) + p(34),
    p(2) + 'S' + p(5) + 'H' + p(11) + '(' + p(19) + ')' + p(19) + '(' + p(11) + 'C' + p(7) + ')' + p(19) + 'e' + p(11) + 'F' + p(23),
    g(30) + p(5) + g(31) + p(5) + g(31) + p(5) + g(29),
    g(30) + p(5) + g(31) + p(5) + g(31) + p(5) + g(29),
    g(30) + p(5) + g(31) + p(5) + g(31) + p(5) + g(29),
  ],
})
