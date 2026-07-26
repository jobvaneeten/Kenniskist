// Server-routes voor accountbeheer. Draait als Cloudflare Worker naast de
// statische app (wrangler.jsonc: main + assets.run_worker_first voor /api/*).
// Elk endpoint verifieert eerst wie de beller is (via diens eigen access
// token) en pas dáárna gebruikt het de service-role key. De service-role key
// omzeilt RLS volledig — dit bestand is dus de enige plek die de
// schoolgrenzen en de rolhiërarchie bewaakt voor accountaanmaak.
//
// Rolhiërarchie (zie supabase/migrations/0003_icter_rol.sql):
//   admin      → maakt scholen + de icter van een school aan
//   icter      → maakt leerkrachten en klassen aan (eigen school)
//   leerkracht → maakt leerlingen aan (eigen school/klas)
// Klassen aanmaken/bewerken gaat niet via dit bestand: dat mag icter/admin
// al rechtstreeks via RLS (policy klassen_beheren).

const ROL_RANG = { leerling: 0, leerkracht: 1, icter: 2, admin: 3 }
const GEBRUIKERSNAAM_RE = /^[a-z0-9]{3,30}$/
const SCHOOLCODE_RE = /^[a-z0-9]{2,20}$/

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

async function serviceFetch(env, pad, init = {}) {
  return fetch(`${env.SUPABASE_URL}${pad}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      ...(init.headers || {}),
    },
  })
}

// Haalt het profiel van de beller op aan de hand van diens eigen access
// token. Geeft null bij een ongeldig/ontbrekend token of een profiel dat
// niet bestaat — de aanroepende endpoint-functie beslist wat daarna gebeurt.
async function huidigProfiel(request, env) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null

  const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY },
  })
  if (!userRes.ok) return null
  const user = await userRes.json()

  const profielRes = await serviceFetch(env, `/rest/v1/profielen?id=eq.${user.id}&select=id,school_id,rol`)
  if (!profielRes.ok) return null
  const [profiel] = await profielRes.json()
  return profiel || null
}

// Admin is niet aan één school gebonden (diens eigen school_id is alleen
// een verplichte kolomwaarde, functioneel betekenisloos). Voor admin moet
// de doelschool dus expliciet in de request staan; icter/leerkracht kunnen
// alleen binnen hun eigen school werken, ongeacht wat de request meestuurt.
function bepaalSchoolId(profiel, body) {
  if (profiel.rol === 'admin') return body.schoolId || null
  return profiel.school_id
}

async function authUserVerwijderen(env, userId) {
  await serviceFetch(env, `/auth/v1/admin/users/${userId}`, { method: 'DELETE' }).catch(() => {})
}

// ── POST /api/school-aanmaken (admin) ───────────────────────────────────
async function schoolAanmaken(request, env) {
  const profiel = await huidigProfiel(request, env)
  if (!profiel || profiel.rol !== 'admin') return json({ fout: 'Geen toegang' }, 403)

  const body = await request.json()
  const { schoolNaam, schoolCode, icterEmail, icterWachtwoord, icterVoornaam, icterAchternaamLetter } = body
  if (!schoolNaam || !SCHOOLCODE_RE.test(schoolCode || '')) {
    return json({ fout: 'Schoolnaam of schoolcode ongeldig (code: kleine letters/cijfers, 2-20 tekens)' }, 400)
  }
  if (!icterEmail || !icterWachtwoord || !icterVoornaam) {
    return json({ fout: 'Gegevens van de icter ontbreken' }, 400)
  }

  const schoolRes = await serviceFetch(env, '/rest/v1/scholen', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ naam: schoolNaam, code: schoolCode }),
  })
  if (!schoolRes.ok) {
    const fout = await schoolRes.text()
    return json({ fout: fout.includes('duplicate') ? 'Deze schoolcode bestaat al' : 'Kon school niet aanmaken' }, 400)
  }
  const [school] = await schoolRes.json()

  const userRes = await serviceFetch(env, '/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email: icterEmail, password: icterWachtwoord, email_confirm: true }),
  })
  if (!userRes.ok) return json({ fout: 'School aangemaakt, maar het icter-account niet — probeer het opnieuw voor deze school' }, 400)
  const user = await userRes.json()

  const profielRes = await serviceFetch(env, '/rest/v1/profielen', {
    method: 'POST',
    body: JSON.stringify({
      id: user.id,
      school_id: school.id,
      rol: 'icter',
      voornaam: icterVoornaam,
      achternaam_letter: icterAchternaamLetter || null,
    }),
  })
  if (!profielRes.ok) {
    await authUserVerwijderen(env, user.id)
    return json({ fout: 'School aangemaakt, maar het icter-profiel niet — probeer het opnieuw voor deze school' }, 400)
  }

  return json({ school })
}

// ── POST /api/leerkracht-aanmaken (icter/admin) ─────────────────────────
async function leerkrachtAanmaken(request, env) {
  const profiel = await huidigProfiel(request, env)
  if (!profiel || ROL_RANG[profiel.rol] < ROL_RANG.icter) return json({ fout: 'Geen toegang' }, 403)

  const body = await request.json()
  const schoolId = bepaalSchoolId(profiel, body)
  if (!schoolId) return json({ fout: 'Geen school opgegeven' }, 400)
  const { email, wachtwoord, voornaam, achternaamLetter } = body
  if (!email || !wachtwoord || !voornaam) return json({ fout: 'Gegevens ontbreken' }, 400)

  const userRes = await serviceFetch(env, '/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password: wachtwoord, email_confirm: true }),
  })
  if (!userRes.ok) return json({ fout: 'Kon account niet aanmaken (bestaat dit e-mailadres al?)' }, 400)
  const user = await userRes.json()

  const profielRes = await serviceFetch(env, '/rest/v1/profielen', {
    method: 'POST',
    body: JSON.stringify({
      id: user.id, school_id: schoolId, rol: 'leerkracht',
      voornaam, achternaam_letter: achternaamLetter || null,
    }),
  })
  if (!profielRes.ok) {
    await authUserVerwijderen(env, user.id)
    return json({ fout: 'Kon leerkracht-profiel niet aanmaken' }, 400)
  }

  return json({ ok: true })
}

// ── POST /api/leerling-aanmaken (leerkracht/icter/admin) ────────────────
async function leerlingAanmaken(request, env) {
  const profiel = await huidigProfiel(request, env)
  if (!profiel || ROL_RANG[profiel.rol] < ROL_RANG.leerkracht) return json({ fout: 'Geen toegang' }, 403)

  const body = await request.json()
  const schoolId = bepaalSchoolId(profiel, body)
  if (!schoolId) return json({ fout: 'Geen school opgegeven' }, 400)
  const { gebruikersnaam, wachtwoord, voornaam, achternaamLetter, klasId } = body
  if (!gebruikersnaam || !GEBRUIKERSNAAM_RE.test(gebruikersnaam)) {
    return json({ fout: 'Gebruikersnaam moet 3-30 kleine letters/cijfers zijn' }, 400)
  }
  if (!wachtwoord || !voornaam) return json({ fout: 'Gegevens ontbreken' }, 400)
  if (!klasId) return json({ fout: 'Kies een klas — de inlogcode van een leerling komt van de klas' }, 400)

  // Login draait op de klascode, niet de schoolcode: <klascode>.<gebruikersnaam>
  const klasRes = await serviceFetch(env, `/rest/v1/klassen?id=eq.${klasId}&school_id=eq.${schoolId}&select=code`)
  const [klas] = klasRes.ok ? await klasRes.json() : []
  if (!klas) return json({ fout: 'Deze klas hoort niet bij deze school' }, 400)

  const email = `${klas.code}.${gebruikersnaam}@leerling.kenniskist.nl`
  const userRes = await serviceFetch(env, '/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password: wachtwoord, email_confirm: true }),
  })
  if (!userRes.ok) return json({ fout: 'Kon account niet aanmaken (bestaat deze gebruikersnaam al binnen deze klas?)' }, 400)
  const user = await userRes.json()

  const profielRes = await serviceFetch(env, '/rest/v1/profielen', {
    method: 'POST',
    body: JSON.stringify({
      id: user.id, school_id: schoolId, rol: 'leerling', gebruikersnaam,
      voornaam, achternaam_letter: achternaamLetter || null, klas_id: klasId,
    }),
  })
  if (!profielRes.ok) {
    await authUserVerwijderen(env, user.id)
    return json({ fout: 'Kon leerling-profiel niet aanmaken (bestaat deze gebruikersnaam al binnen deze klas?)' }, 400)
  }

  return json({ ok: true, gebruikersnaam, klasCode: klas.code })
}

// ── POST /api/wachtwoord-reset (leerkracht/icter/admin, binnen hiërarchie) ─
async function wachtwoordReset(request, env) {
  const profiel = await huidigProfiel(request, env)
  if (!profiel || ROL_RANG[profiel.rol] < ROL_RANG.leerkracht) return json({ fout: 'Geen toegang' }, 403)

  const { gebruikerId, nieuwWachtwoord } = await request.json()
  if (!gebruikerId || !nieuwWachtwoord) return json({ fout: 'Gegevens ontbreken' }, 400)

  const doelRes = await serviceFetch(env, `/rest/v1/profielen?id=eq.${gebruikerId}&select=id,school_id,rol`)
  const [doel] = doelRes.ok ? await doelRes.json() : []
  if (!doel) return json({ fout: 'Gebruiker niet gevonden' }, 404)

  const zelfdeSchool = profiel.rol === 'admin' || doel.school_id === profiel.school_id
  const magVanwegeRang = ROL_RANG[profiel.rol] > ROL_RANG[doel.rol]
  if (!zelfdeSchool || !magVanwegeRang) return json({ fout: 'Geen toegang' }, 403)

  const res = await serviceFetch(env, `/auth/v1/admin/users/${gebruikerId}`, {
    method: 'PUT',
    body: JSON.stringify({ password: nieuwWachtwoord }),
  })
  if (!res.ok) return json({ fout: 'Kon wachtwoord niet wijzigen' }, 400)

  return json({ ok: true })
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return json({ fout: 'Methode niet toegestaan' }, 405)

    const url = new URL(request.url)
    try {
      switch (url.pathname) {
        case '/api/school-aanmaken': return await schoolAanmaken(request, env)
        case '/api/leerkracht-aanmaken': return await leerkrachtAanmaken(request, env)
        case '/api/leerling-aanmaken': return await leerlingAanmaken(request, env)
        case '/api/wachtwoord-reset': return await wachtwoordReset(request, env)
        default: return json({ fout: 'Onbekend endpoint' }, 404)
      }
    } catch {
      return json({ fout: 'Er ging iets mis' }, 500)
    }
  },
}
