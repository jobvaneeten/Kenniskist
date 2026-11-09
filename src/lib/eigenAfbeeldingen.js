import { supabase } from './supabase.js'

// Afbeeldingen bij eigen oefeningen (migratie 0023): privé-bucket met per
// school een map. In de vraag staat alleen het pad ('<school_id>/<uuid>.jpg');
// tonen gaat via een tijdelijke link.
const BUCKET = 'eigen-afbeeldingen'
const MAX_PX = 1000

// Verkleinen in de browser: max. 1000 px, als jpg (witte achtergrond, zodat
// een doorzichtige png niet zwart wordt). Een gif blijft zoals hij is.
export async function verklein(file) {
  if (file.type === 'image/gif') return file
  const bitmap = await createImageBitmap(file)
  const s = Math.min(1, MAX_PX / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * s), h = Math.round(bitmap.height * s)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  return new Promise((ok, fout) => canvas.toBlob(b => (b ? ok(b) : fout(new Error('verkleinen mislukt'))), 'image/jpeg', 0.82))
}

let school = null
async function mijnSchool() {
  if (school) return school
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase.from('profielen').select('school_id').eq('id', user?.id).single()
  school = data?.school_id ?? null
  return school
}

// Geeft { pad, url } (url = lokale link om meteen te tonen) of gooit een fout.
export async function uploadAfbeelding(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Dit is geen afbeelding.')
  const blob = await verklein(file)
  const sid = await mijnSchool()
  if (!sid) throw new Error('Je school is niet bekend. Log opnieuw in.')
  const ext = blob.type === 'image/gif' ? 'gif' : 'jpg'
  const pad = `${sid}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(pad, blob, { contentType: blob.type, upsert: false })
  if (error) throw new Error('Uploaden lukte niet. Probeer het nog eens.')
  return { pad, url: URL.createObjectURL(blob) }
}

// Tijdelijke links voor een rij paden: { pad: url }. Lukt het niet, dan leeg.
export async function linksVoor(paden) {
  const uniek = [...new Set((paden ?? []).filter(Boolean))]
  if (!uniek.length) return {}
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(uniek, 6 * 60 * 60)
  return Object.fromEntries((data ?? []).filter(d => d.signedUrl).map(d => [d.path, d.signedUrl]))
}
