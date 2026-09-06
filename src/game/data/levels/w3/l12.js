// 3-12 Snelweg van steen — twee lange bruggen van zinkende platforms met één
// vast eiland ertussen. Dat eiland is de enige plek om op adem te komen, en
// daar staat dus ook het checkpoint.
import { maakLevel, p, g, munt, lava } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 160
const brug = 'z' + p(5)          // platform van 3 tegels, gat van 3
const muntPaar = munt(2) + p(4)

export default maakLevel({
  id: 'w3-l12',
  naam: 'Snelweg van steen',
  wereld: 3,
  index: 12,
  doeltijd: 120,
  hints: [T.hints.snel],
  zinkDiepte: Array(18).fill(5),
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
    p(B),
    p(6) + munt(4) + p(9) + muntPaar.repeat(9) + p(8) + muntPaar.repeat(9) + p(25),
    p(2) + 'S' + p(5) + 'H' + p(9) + brug.repeat(9) + p(2) + 'C' + p(5) + brug.repeat(9) + p(9) + 'C' + p(9) + 'F' + p(6),
    g(18) + lava(54) + g(8) + lava(54) + g(26),
    g(18) + lava(54) + g(8) + lava(54) + g(26),
    g(18) + lava(54) + g(8) + lava(54) + g(26),
  ],
})
