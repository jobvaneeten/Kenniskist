// Haalt de spellingcategorieën (Taal actief, de dieren) uit
// public/dictees/dictee-categorie.html en schrijft ze naar
// src/data/dicteeCategorieen.json (namen en regels voor de analyse van het
// controledictee, src/lib/dicteeAnalyse.js).
// Opnieuw draaien na het aanpassen van de categorieën: node tools/dictee-categorieen.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const html = readFileSync(new URL('../public/dictees/dictee-categorie.html', import.meta.url), 'utf8')
const i = html.indexOf('const ANIMALS = [')
const start = html.indexOf('[', i)
const eind = html.indexOf('];', start)
const lijst = Function(`return ${html.slice(start, eind + 1)}`)()
const categorieen = lijst.map(({ id, nm, rule }) => ({ id, naam: nm, regel: rule }))
mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true })
writeFileSync(new URL('../src/data/dicteeCategorieen.json', import.meta.url), JSON.stringify(categorieen, null, 1))
console.log(categorieen.length, 'categorieën')
