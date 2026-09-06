// 2-06 Pinguïnpatrouille — pinguïnrobots schieten terug zodra je op hun
// hoogte komt. De richels zijn er om achter te schuilen, niet om op te wonen.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 136

export default maakLevel({
  id: 'w2-l06',
  naam: 'Pinguïnpatrouille',
  wereld: 2,
  index: 6,
  doeltijd: 100,
  hints: [T.hints.pinguin],
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
    p(26) + munt(6) + p(34) + munt(6) + p(34) + munt(6) + p(24),
    p(24) + plat(10) + p(30) + plat(10) + p(30) + plat(10) + p(22),
    p(6) + munt(5) + p(31) + munt(5) + p(31) + munt(5) + p(31) + munt(5) + p(17),
    p(2) + 'S' + p(5) + 'H' + p(11) + 'P' + p(23) + 'P' + p(11) + 'C' + p(23) + 'P' + p(11) + 'P' + p(19) + 'E' + p(11) + 'P' + p(7) + 'F' + p(3),
    g(30) + p(5) + g(30) + p(5) + g(30) + p(5) + g(31),
    g(30) + p(5) + g(30) + p(5) + g(30) + p(5) + g(31),
    g(30) + p(5) + g(30) + p(5) + g(30) + p(5) + g(31),
  ],
})
