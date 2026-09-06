// 5-01 Ondersteboven — de eerste zwaartekrachtplaten. Raak er een aan en je
// valt naar het plafond. De munten daar liggen buiten bereik zolang je met je
// voeten op de vloer staat.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128

export default maakLevel({
  id: 'w5-l01',
  naam: 'Ondersteboven',
  wereld: 5,
  index: 1,
  doeltijd: 95,
  hints: [T.hints.omkeren],
  kaart: [
    g(B),
    g(B),
    g(B),
    p(24) + munt(5) + p(19) + munt(5) + p(19) + munt(5) + p(19) + munt(5) + p(27),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(6) + munt(5) + p(19) + munt(5) + p(19) + munt(5) + p(19) + munt(5) + p(45),
    p(2) + 'S' + p(5) + 'H' + p(11) + '@' + p(19) + 'e' + p(19) + '@' + p(19) + 'e' + p(19) + '@' + p(9) + 'C' + p(9) + 'F' + p(7),
    g(B),
    g(B),
    g(B),
  ],
})
