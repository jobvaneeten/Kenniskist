import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { flush, wisAlles } from './voortgangSync.js'

const SessieContext = createContext(null)

// kk_sessie/kk_profiel_cache: stabiele spiegel voor public/kenniskist-login.js
// (de losse HTML-tools en, als test, WerkwoordSpelling.jsx). Dat script leest
// bewust niet de sb-<ref>-auth-token-sleutel van supabase-js zelf — dat
// formaat is ongedocumenteerd — maar alleen deze twee vaste sleutels. Beide
// staan in NIET_SYNCEN (voortgangSync.js): het zijn auth-artefacten, geen
// speldata, en zeker geen tokens die in game_voortgang mogen belanden.
function schrijfSessieSpiegel(session) {
  if (!session) {
    localStorage.removeItem('kk_sessie')
    localStorage.removeItem('kk_profiel_cache')
    return
  }
  localStorage.setItem('kk_sessie', JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    user_id: session.user.id,
  }))
}

export function SessieProvider({ children }) {
  const [sessie, setSessie] = useState(null)
  const [profiel, setProfiel] = useState(null)
  const [toegestaneGroepen, setToegestaneGroepen] = useState(null)
  const [laden, setLaden] = useState(true)

  const haalProfiel = useCallback(async (uid) => {
    const { data } = await supabase.from('profielen').select('*').eq('id', uid).single()
    setProfiel(data ?? null)
    setLaden(false)
    if (data) localStorage.setItem('kk_profiel_cache', JSON.stringify({ id: data.id, weergavenaam: data.weergavenaam }))
    else localStorage.removeItem('kk_profiel_cache')

    // Leeg (of geen klas) betekent geen beperking — zie 0006_klas_leeftijdsgroepen.sql
    if (data?.rol === 'leerling' && data.klas_id) {
      const { data: klas } = await supabase.from('klassen').select('groepen').eq('id', data.klas_id).single()
      setToegestaneGroepen(klas?.groepen?.length ? klas.groepen : null)
    } else {
      setToegestaneGroepen(null)
    }
  }, [])

  useEffect(() => {
    let actief = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!actief) return
      setSessie(session)
      schrijfSessieSpiegel(session)
      if (session) haalProfiel(session.user.id)
      else setLaden(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessie(session)
      schrijfSessieSpiegel(session)
      if (session) haalProfiel(session.user.id)
      else { setProfiel(null); setLaden(false) }
    })
    return () => { actief = false; sub.subscription.unsubscribe() }
  }, [haalProfiel])

  // Navigeert naar het portaal dat bij de gebruikte tab hoort (i.p.v. simpelweg
  // te herladen) en herlaadt daarna de hele pagina i.p.v. alleen React-state
  // bij te werken: main.jsx hydrateert game_voortgang alleen tijdens het
  // opstarten (vóór de eerste render), dus een nieuwe sessie moet door
  // diezelfde opstartroute. Zonder de navigatie zou je, als je bijvoorbeeld
  // als leerling was uitgelogd en dan als leerkracht inlogt, gewoon op
  // /leerlingportaal blijven staan — verkeerde portaal, want de URL was nooit
  // meegewisseld met de tab.
  const inloggenLeerling = useCallback(async (klascode, gebruikersnaam, wachtwoord) => {
    const email = `${klascode.trim().toLowerCase()}.${gebruikersnaam.trim().toLowerCase()}@leerling.kenniskist.nl`
    const { error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord })
    if (!error) window.location.href = '/leerlingportaal'
    return error
  }, [])

  const inloggenLeerkracht = useCallback(async (email, wachtwoord) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: wachtwoord })
    if (!error) window.location.href = '/leerkrachtenportaal'
    return error
  }, [])

  // Alleen voor leerkracht/icter/admin (echt e-mailadres) — leerlingen hebben
  // geen bereikbaar e-mailadres, dus voor hen loopt wachtwoord-reset via de
  // leerkracht (Worker-endpoint), niet via deze zelfbedieningsflow.
  const wachtwoordVergeten = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/wachtwoord-resetten`,
    })
    return error
  }, [])

  const uitloggen = useCallback(async () => {
    await flush()
    wisAlles()
    await supabase.auth.signOut()
    window.location.reload()
  }, [])

  return (
    <SessieContext.Provider value={{ sessie, profiel, toegestaneGroepen, laden, inloggenLeerling, inloggenLeerkracht, wachtwoordVergeten, uitloggen }}>
      {children}
    </SessieContext.Provider>
  )
}

export function useSessie() {
  const ctx = useContext(SessieContext)
  if (!ctx) throw new Error('useSessie moet binnen SessieProvider gebruikt worden')
  return ctx
}
