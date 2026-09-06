// 4-04 Sleutelkaart — de deur aan het eind blijft dicht tot je de kaart hebt.
// De kaart ligt bewust op de terugweg, zodat je het level twee keer ziet.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 136

export default maakLevel({
  id: 'w4-l04',
  naam: 'Sleutelkaart',
  wereld: 4,
  index: 4,
  doeltijd: 75,
  hints: [T.hints.sleutel],
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
    p(30) + munt(6) + p(30) + munt(6) + p(30) + munt(6) + p(28),
    p(28) + plat(10) + p(26) + plat(10) + p(26) + plat(10) + p(26),
    p(6) + munt(5) + p(25) + munt(5) + p(25) + munt(5) + p(25) + munt(5) + p(35),
    p(2) + 'S' + p(5) + 'H' + p(19) + 'r' + p(23) + 'C' + p(19) + 'q' + p(23) + 'r' + p(19) + 'd' + p(11) + 'F' + p(7),
    g(B),
    g(B),
    g(B),
  ],
})
