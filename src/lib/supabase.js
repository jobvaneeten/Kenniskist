import { createClient } from '@supabase/supabase-js'

// Fallback op de publieke project-URL + anon key (dezelfde waarden die al in
// wrangler.jsonc staan en sowieso in elke browser-bundle belanden). Zonder deze
// fallback gooit createClient bij een build zónder .env.local — en omdat dit
// module-niveau is, mount React dan helemaal niet en blijft de site op "Laden…".
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://vbvtkzieyvdctlighgoj.supabase.co'
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZidnRremlleXZkY3RsaWdoZ29qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NTQwNjUsImV4cCI6MjEwMDUzMDA2NX0.S_hAftcczB64X6kdjRnJTqBd_i7pbvefSaSB3RvAES4'

export const supabase = createClient(URL, ANON)
