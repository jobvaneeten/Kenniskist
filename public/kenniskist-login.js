// Zelfstandig, afhankelijkheidsvrij script voor de losse HTML-leertools
// (en, als eerste test, de React-component WerkwoordSpelling.jsx). Geen
// supabase-js hier: dit script wordt in elk iframe geladen, soms meerdere
// tegelijk, en logt zelf nooit iemand in — dat gebeurt in de React-shell
// (src/lib/sessie.jsx), die na elke onAuthStateChange een stabiele spiegel
// wegschrijft: kk_sessie (token + vervaltijd) en kk_profiel_cache (naam + id).
// Dit script leest alleen die twee, nooit de sb-<ref>-auth-token-sleutel van
// supabase-js zelf (ongedocumenteerd formaat, kan zonder waarschuwing wijzigen).
//
// Alle tools staan op hetzelfde domein (same-origin iframes), dus dezelfde
// localStorage is al gedeeld — geen postMessage nodig.
(function () {
  var SUPABASE_URL = 'https://vbvtkzieyvdctlighgoj.supabase.co'
  // Vite kopieert public/ letterlijk, dus import.meta.env werkt hier niet —
  // de anon key is per ontwerp publiek, RLS is de echte grens.
  var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZidnRremlleXZkY3RsaWdoZ29qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NTQwNjUsImV4cCI6MjEwMDUzMDA2NX0.S_hAftcczB64X6kdjRnJTqBd_i7pbvefSaSB3RvAES4'

  function leesJson(sleutel) {
    try { return JSON.parse(localStorage.getItem(sleutel) || 'null') } catch (e) { return null }
  }

  function getLeerling() {
    var profiel = leesJson('kk_profiel_cache')
    return profiel ? { id: profiel.id, weergavenaam: profiel.weergavenaam } : null
  }

  // Eén verversing tegelijk: als meerdere aanroepen tegelijk een bijna-
  // verlopen token zien, delen ze dezelfde ver-onderweg-zijnde belofte i.p.v.
  // allemaal apart de refresh-token te roteren (die is maar één keer geldig).
  var lopendeVerversing = null

  function verversToken(sessie) {
    if (lopendeVerversing) return lopendeVerversing
    lopendeVerversing = fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ refresh_token: sessie.refresh_token }),
    }).then(function (res) {
      if (!res.ok) return null
      return res.json().then(function (data) {
        var nieuw = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
          user_id: sessie.user_id,
        }
        localStorage.setItem('kk_sessie', JSON.stringify(nieuw))
        return nieuw.access_token
      })
    }).catch(function () { return null })
      .finally(function () { lopendeVerversing = null })
    return lopendeVerversing
  }

  function geldigToken() {
    var sessie = leesJson('kk_sessie')
    if (!sessie) return Promise.resolve(null)
    var bijnaVerlopen = !sessie.expires_at || (sessie.expires_at * 1000 - Date.now() < 60000)
    if (!bijnaVerlopen) return Promise.resolve(sessie.access_token)
    return verversToken(sessie)
  }

  function slaResultaatOp(toolId, score, maxScore, detailsJson) {
    var profiel = leesJson('kk_profiel_cache')
    if (!profiel) return Promise.resolve({ ok: false, reden: 'niet-ingelogd' })

    return geldigToken().then(function (token) {
      if (!token) return { ok: false, reden: 'niet-ingelogd' }
      return fetch(SUPABASE_URL + '/rest/v1/resultaten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: 'Bearer ' + token,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          leerling_id: profiel.id,
          tool_id: toolId,
          score: score,
          max_score: maxScore,
          details_json: detailsJson,
        }),
      }).then(function (res) { return { ok: res.ok } })
    }).catch(function () {
      // Opslaan mag nooit een oefensessie breken — stil falen.
      return { ok: false, reden: 'netwerkfout' }
    })
  }

  function toonInlogstatus(el) {
    if (!el) return
    if (getLeerling()) { el.style.display = 'none'; return }
    el.textContent = 'Niet ingelogd — resultaten worden niet opgeslagen. '
    var link = document.createElement('a')
    link.href = '/leerlingportaal'
    link.target = '_top'
    link.textContent = 'Inloggen'
    el.appendChild(link)
    el.style.display = ''
  }

  window.KennisKist = {
    getLeerling: getLeerling,
    slaResultaatOp: slaResultaatOp,
    toonInlogstatus: toonInlogstatus,
  }
})()
