// 5-14 De rand — hier hoef je niks aan te raken: de zwaartekracht draait
// vanzelf om, elke vier seconden. Het hele level is één ritmeprobleem.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 152

export default maakLevel({
  id: 'w5-l14',
  naam: 'De rand',
  wereld: 5,
  index: 14,
  doeltijd: 135,
  hints: [T.hints.omkeren],
  omkeerPeriode: 4,
  kaart: [
    g(B),
    g(B),
    g(B),
    p(20) + munt(6) + p(22) + munt(6) + p(22) + munt(6) + p(22) + munt(6) + p(42),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(6) + munt(6) + p(22) + munt(6) + p(22) + munt(6) + p(22) + munt(6) + p(56),
    p(2) + 'S' + p(5) + 'H' + p(23) + 'e' + p(23) + 'C' + p(23) + 'c' + p(23) + 'e' + p(23) + 'C' + p(7) + 'F' + p(15),
    g(B),
    g(B),
    g(B),
  ],
})
