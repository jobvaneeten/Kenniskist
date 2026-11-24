import * as Colyseus from '@colyseus/sdk'

// Verbinding met de spelserver (Colyseus op Render, repo kenniskist-server)
// voor voetbal, paintball en ballonnengevecht.
//
// De gratis server valt na een kwartier zonder bezoek in slaap en heeft dan
// ruim een halve minuut nodig om wakker te worden. Daarom: wekServer() zodra
// iemand de Kledingkast opent, en maakOfJoin() blijft het rustig opnieuw
// proberen in plaats van meteen "lukt niet" te zeggen.

import { SERVER_URL, wekServer } from './server.js'
export { SERVER_URL, wekServer }

const wacht = (ms) => new Promise(r => setTimeout(r, ms))

// Maakt een potje (create) of doet mee met een code. onStatus(tekst) vertelt
// wat er gebeurt, zodat het scherm kan laten zien dat de server wakker wordt.
// Gooit een Error met .soort: 'niet-gevonden' | 'vol' | 'server'.
export async function maakOfJoin(roomType, opties, { maak, onStatus } = {}) {
  onStatus?.('verbinden')
  // Duurt het aantikken langer dan 2,5 seconde, dan slaapt de server.
  const wekken = wekServer()
  const snel = await Promise.race([wekken, wacht(2500).then(() => 'traag')])
  if (snel === 'traag') {
    onStatus?.('wekken')
    if (!(await wekken)) throw Object.assign(new Error('server onbereikbaar'), { soort: 'server' })
    onStatus?.('verbinden')
  } else if (snel === false) {
    throw Object.assign(new Error('server onbereikbaar'), { soort: 'server' })
  }

  const client = new Colyseus.Client(SERVER_URL)
  let laatste
  // Meedoen probeert het vaker (een klas die tegelijk inlogt op trage wifi).
  const pogingen = maak ? 3 : 6
  for (let poging = 0; poging < pogingen; poging++) {
    try {
      return maak ? await client.create(roomType, opties) : await client.join(roomType, opties)
    } catch (e) {
      laatste = e
      // Colyseus: 4212 = geen potje met deze code, 4211 = bestaat niet
      const code = e?.code
      const tekst = String(e?.message ?? '')
      if (!maak && (code === 4212 || code === 4211 || /no rooms found|not found/i.test(tekst))) {
        throw Object.assign(new Error('potje niet gevonden'), { soort: 'niet-gevonden' })
      }
      if (/full|locked/i.test(tekst)) throw Object.assign(new Error('potje is vol'), { soort: 'vol' })
      await wacht(Math.min(5000, 1200 * (poging + 1)))
    }
  }
  throw Object.assign(new Error(String(laatste?.message ?? 'verbinden mislukt')), { soort: 'server' })
}

export const FOUT_TEKST = {
  'niet-gevonden': 'Er is geen potje met deze code. Kijk de code nog eens na.',
  vol: 'Dit potje zit al vol.',
  server: 'De spelserver reageert niet. Kijk of je internet hebt en probeer het nog eens.',
}

// Nieuwe code voor een potje: cijfers, zodat een kind hem makkelijk overtypt.
export const nieuweCode = (lengte = 4) =>
  String(Math.floor(Math.random() * 9 * 10 ** (lengte - 1)) + 10 ** (lengte - 1))
