// 5-04 Schaduwkloon — hij herhaalt jouw bewegingen een seconde later. Wie
// rustig doorloopt heeft er geen last van; wie heen en weer springt loopt in
// zijn eigen spoor.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 144

export default maakLevel({
  id: 'w5-l04',
  naam: 'Schaduwkloon',
  wereld: 5,
  index: 4,
  doeltijd: 110,
  hints: [T.hints.snel],
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
    p(26) + munt(6) + p(32) + munt(6) + p(32) + munt(6) + p(36),
    p(24) + plat(10) + p(28) + plat(10) + p(28) + plat(10) + p(34),
    p(6) + munt(6) + p(26) + munt(6) + p(26) + munt(6) + p(26) + munt(6) + p(36),
    p(2) + 'S' + p(5) + 'H' + p(9) + 'c' + p(27) + 'e' + p(19) + 'C' + p(23) + 'e' + p(19) + 'c' + p(15) + 'C' + p(9) + 'F' + p(7),
    g(34) + p(5) + g(31) + p(5) + g(31) + p(5) + g(33),
    g(34) + p(5) + g(31) + p(5) + g(31) + p(5) + g(33),
    g(34) + p(5) + g(31) + p(5) + g(31) + p(5) + g(33),
  ],
})
