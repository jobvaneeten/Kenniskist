// 5-14 De rand — hier hoef je niks aan te raken: de zwaartekracht draait
// vanzelf om, elke vier seconden. Het hele level is één ritmeprobleem.
//
// De munten liggen daarom niet in twee rechte rijen maar om en om aan het
// plafond en op de vloer, verspringend over de lengte van de gang: ze tekenen
// de cadans waarop de zwaartekracht draait, zodat je hem ziet in plaats van
// alleen voelt.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 152

export default maakLevel({
  id: 'w5-l14',
  naam: 'De rand',
  wereld: 5,
  index: 14,
  doeltijd: 80,
  hints: [T.hints.omkeren],
  omkeerPeriode: 4,
  kaart: [
    g(B),
    g(B),
    g(B),
    p(14) + munt(6) + p(32) + munt(6) + p(32) + munt(6) + p(32) + munt(6) + p(18),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(33) + munt(6) + p(32) + munt(6) + p(32) + munt(6) + p(25) + munt(6) + p(6),
    p(2) + 'S' + p(5) + 'H' + p(23) + 'e' + p(23) + 'C' + p(23) + 'c' + p(23) + 'e' + p(23) + 'C' + p(7) + 'F' + p(15),
    g(B),
    g(B),
    g(B),
  ],
})
