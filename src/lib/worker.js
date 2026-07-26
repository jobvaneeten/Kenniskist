import { supabase } from './supabase.js'

// Roept een /api/*-endpoint van de Worker aan met het eigen access token van
// de ingelogde gebruiker. De Worker bepaalt zelf, met de service key, of
// deze gebruiker dit mag — dit is puur het transport.
export async function roepWorkerAan(pad, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`/api/${pad}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.fout || 'Er ging iets mis')
  return data
}
