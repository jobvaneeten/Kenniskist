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

  // ── Tijdmeting ───────────────────────────────────────────────────────
  // `ms` per resultaatregel: bij tools die per opgave opslaan de tijd sinds de
  // vorige opgave, bij tools die één keer opslaan de tijd sinds het openen.
  // Optellen geeft de totale tijd van een opdracht (zie migratie 0009).
  var MAX_MS = 30 * 60 * 1000        // langer stil = kind liet het tabblad open
  var paginaStart = Date.now()
  var laatsteMeting = {}             // toolId -> tijdstip van de vorige opslag
  var startMeting = {}               // toolId -> expliciet gemeld startmoment
  // Een losse toolpagina (dictee, Engels, Reis rond de wereld) begint bij het
  // laden van de pagina. De React-shell niet: die staat soms al een uur open
  // voordat een kind een oefening kiest, dus daar moet startOefening() het
  // startsein geven. Het verschil is te zien aan #root, dat alleen de shell
  // heeft — lui opgevraagd, want dit script draait al in de <head>.
  function losseToolPagina() { return !document.getElementById('root') }

  // Aangeroepen door React-tools zodra de leerling de oefening opent; losse
  // HTML-tools hebben dat niet nodig, daar is het laden van de pagina de start.
  function startOefening(toolId) {
    startMeting[toolId] = Date.now()
    delete laatsteMeting[toolId]
  }

  function meetMs(toolId) {
    var vorige = laatsteMeting[toolId] || startMeting[toolId] || (losseToolPagina() ? paginaStart : null)
    laatsteMeting[toolId] = Date.now()
    if (!vorige) return null
    return Math.max(0, Math.min(MAX_MS, Date.now() - vorige))
  }

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

  // Weektaak-koppeling: Weektaak.jsx zet kk_actieve_opdracht vlak vóór het
  // renderen van een tool en wist hem weer bij het verlaten. De toolId moet
  // matchen — anders zou een kind dat een weektaak-opdracht start, terug-
  // klikt en vrij een andere tool opent, dát resultaat aan de oude opdracht
  // hangen (RLS vangt dat niet af, want de toewijzing bestáát wel). Ouder
  // dan 4 uur tellen we ook als "niet meer actief" (vergeten tabblad open).
  var OPDRACHT_TTL_MS = 4 * 60 * 60 * 1000

  function actieveOpdrachtVoor(toolId) {
    var actief = leesJson('kk_actieve_opdracht')
    if (!actief || actief.toolId !== toolId) return null
    if (!actief.gezetOp || Date.now() - actief.gezetOp > OPDRACHT_TTL_MS) return null
    return actief.opdrachtId || null
  }

  function insertResultaat(token, profiel, toolId, score, maxScore, detailsJson, opdrachtId, ms) {
    var body = {
      leerling_id: profiel.id,
      tool_id: toolId,
      score: score,
      max_score: maxScore,
      details_json: detailsJson,
    }
    if (opdrachtId) body.opdracht_id = opdrachtId
    if (ms !== null && ms !== undefined) body.ms = ms
    return fetch(SUPABASE_URL + '/rest/v1/resultaten', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: 'Bearer ' + token,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(body),
    })
  }

  function slaResultaatOp(toolId, score, maxScore, detailsJson) {
    var ms = meetMs(toolId)
    var profiel = leesJson('kk_profiel_cache')
    if (!profiel) return Promise.resolve({ ok: false, reden: 'niet-ingelogd' })

    return geldigToken().then(function (token) {
      if (!token) return { ok: false, reden: 'niet-ingelogd' }
      var opdrachtId = actieveOpdrachtVoor(toolId)
      return insertResultaat(token, profiel, toolId, score, maxScore, detailsJson, opdrachtId, ms).then(function (res) {
        if (res.ok || !opdrachtId) return { ok: res.ok }
        // Ongeldige/verlopen koppeling mag het resultaat nooit laten
        // verdwijnen — één keer opnieuw proberen, dan zonder opdracht_id.
        return insertResultaat(token, profiel, toolId, score, maxScore, detailsJson, null, ms)
          .then(function (res2) { return { ok: res2.ok } })
      })
    }).catch(function () {
      // Opslaan mag nooit een oefensessie breken — stil falen.
      return { ok: false, reden: 'netwerkfout' }
    })
  }

  // Oefeningen met spraak (dictee, Engels) draaien in een iframe; de speler
  // hangt in het hoofddocument. Same-origin, dus dat is gewoon te bereiken.
  function muziekDemp(aan) {
    try { window.top.KennisKistMuziek && window.top.KennisKistMuziek.demp(aan) } catch (e) {}
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
    startOefening: startOefening,
    muziekDemp: muziekDemp,
    toonInlogstatus: toonInlogstatus,
  }
})()
