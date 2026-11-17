// Maakt de SQL voor een controledictee-sjabloon (tabel dictee_sjablonen,
// migratie 0026) uit een tekstbestand. De woordenlijsten van de methode
// staan NIET in de repo: het bestand blijft buiten git, de SQL gaat via
// Supabase (execute_sql) de database in.
//
//   node tools/dictee-sjabloon.mjs pad/naar/dictee.txt > dictee.sql
//
// Bestand:
//   id: g7-t3
//   groep: 7
//   titel: Groep 7, thema 3
//   klassen: <klas-uuid>, <klas-uuid>      (weglaten = alle klassen)
//   volgorde: 703
//   smerige | krekel:sm(e)rige | gevaarlijk:smer(ig)e
//   eetcafé | stokstaart:eet(|)café | hond_hert:ee(t)café
//   rituelen | baviaan_leguaan:ritu(|wj)elen
//   zin 1: catalogus | cavia:(c)atalogus
//
// (stuk) = de plek van de categorie in het woord; (|) = naad tussen twee
// delen (fout als daar een spatie of koppelteken komt); (|wj) = naad waar
// een w of j fout tussen komt. Categorie-id's: src/data/dicteeCategorieen.json.
import { readFileSync } from 'node:fs'

const ids = new Set(JSON.parse(readFileSync(new URL('../src/data/dicteeCategorieen.json', import.meta.url), 'utf8')).map(c => c.id))
const regels = readFileSync(process.argv[2], 'utf8').split(/\r?\n/).map(r => r.trim()).filter(r => r && !r.startsWith('#'))
const kop = {}
const woorden = []
for (const r of regels) {
  const m = r.match(/^(id|groep|titel|klassen|volgorde):\s*(.*)$/)
  if (m) { kop[m[1]] = m[2]; continue }
  let zin = null, rest = r
  const z = r.match(/^zin\s+(\d+):\s*(.*)$/i)
  if (z) { zin = Number(z[1]); rest = z[2] }
  const [w, ...cs] = rest.split(/\s+\|\s+/).map(x => x.trim())   // " | " scheidt, "(|)" niet
  const c = cs.map(s => {
    const k = s.indexOf(':'); const id = s.slice(0, k).trim(); const p = s.slice(k + 1).trim()
    if (!ids.has(id)) throw new Error(`${w}: onbekende categorie ${id}`)
    const van = p.indexOf('('), tot = p.indexOf(')')
    const binnen = p.slice(van + 1, tot)
    const naad = binnen.startsWith('|')
    const kaal = p.slice(0, van) + (naad ? '' : binnen) + p.slice(tot + 1)
    if (van < 0 || tot < van || kaal !== w) throw new Error(`${w}: plek klopt niet: ${s}`)
    const v = [...p.slice(0, van)].length
    if (naad) return binnen.length > 1 ? { id, van: v, tot: v, x: binnen.slice(1) } : { id, van: v, tot: v }
    return { id, van: v, tot: v + [...binnen].length }
  })
  woorden.push(zin ? { w, zin, c } : { w, c })
}
for (const k of ['id', 'groep', 'titel']) if (!kop[k]) throw new Error(`${k}: ontbreekt`)
const q = (s) => `'${String(s).replace(/'/g, "''")}'`
const klassen = kop.klassen ? `array[${kop.klassen.split(',').map(x => q(x.trim())).join(', ')}]::uuid[]` : 'null'
console.log(`insert into public.dictee_sjablonen (id, groep, titel, woorden, klas_ids, volgorde)
values (${q(kop.id)}, ${Number(kop.groep)}, ${q(kop.titel)}, ${q(JSON.stringify(woorden))}::jsonb, ${klassen}, ${Number(kop.volgorde) || 0})
on conflict (id) do update set groep = excluded.groep, titel = excluded.titel, woorden = excluded.woorden,
  klas_ids = excluded.klas_ids, volgorde = excluded.volgorde;`)
