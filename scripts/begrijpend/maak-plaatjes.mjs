// Maakt de ontbrekende plaatjes voor begrijpend lezen met AI (Gemini, via
// scripts/gen-image.mjs) en zet ze om naar webp. Bestaande plaatjes blijven
// staan: weg ermee als je er een opnieuw wilt.
//
//   node scripts/begrijpend/maak-plaatjes.mjs [thema]
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { THEMAS, laadLessen } from './maak-begrijpend.mjs'

const hier = path.dirname(fileURLToPath(import.meta.url))
const MAP = path.join(hier, '../../public/begrijpend-lezen')
const STIJL = 'Digital painted illustration for a Dutch children\'s reading lesson (ages 10 to 12). Warm, rich colors, soft light, clear shapes, '
  + 'slightly stylized, not photorealistic. Absolutely no text, letters, numbers, logos or watermarks anywhere in the image. '
  + 'No recognizable real persons. Subject: '

async function maak(themaId, naam, beeld) {
  const doel = path.join(MAP, themaId, `${naam}.webp`)
  if (fs.existsSync(doel)) return
  const tmp = path.join(MAP, themaId, `${naam}.tmp.png`)
  fs.mkdirSync(path.dirname(doel), { recursive: true })
  execFileSync('node', [path.join(hier, '../gen-image.mjs'), STIJL + beeld, tmp, '--ratio', '4:3'], { stdio: 'inherit' })
  await sharp(tmp).resize({ width: 960, withoutEnlargement: true }).webp({ quality: 78 }).toFile(doel)
  fs.unlinkSync(tmp)
  console.log('klaar', themaId, naam)
}

const alleen = process.argv[2]
for (const thema of THEMAS) {
  if (alleen && thema.id !== alleen) continue
  for (const les of await laadLessen(thema, true)) {
    await maak(thema.id, les.cover, les.coverBeeld)
    for (const v of les.vragen) if (v.img) await maak(thema.id, v.img, v.beeld)
  }
}
