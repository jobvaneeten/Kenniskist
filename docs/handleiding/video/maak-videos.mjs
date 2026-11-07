// Neemt de uitlegfilmpjes op in de testomgeving (echte Kenniskist op :5173,
// proefgegevens uit ../maken/demo-data.mjs) en zet ze om naar mp4.
// Gebruik (met de dev-server aan): node docs/handleiding/video/maak-videos.mjs [naam ...]
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { start, pagina, BASIS } from '../maken/demo.mjs'
import { OVERLAY, regie } from './regie.mjs'

// Stem (optioneel): node maak-videos.mjs --stem [namen...]
// Per filmpje staan de ingesproken zinnen in video/stem/<filmpje>/<code>.wav, waarbij
// <code> uit de tekst komt (stemCode). Die maak je met stem-windows (AI-stem van
// Windows) of met de inspreekstudio (eigen stem), zie LEESMIJ.md.
export const stemCode = (tekst) => createHash('md5').update(tekst).digest('hex').slice(0, 10)
const STEM = process.argv.includes('--stem')
const STEMMAP = process.cwd() + '/docs/handleiding/video/stem/'
const duur = (pad) => Math.round(parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', pad]).toString()) * 1000)
const NL = String.fromCharCode(10)
const TRIM = 1.2   // zoveel seconden gaat er aan het begin af (lege pagina die laadt)

// komt online in de handleiding (public/handleiding/videos)
const UIT = process.cwd() + '/public/handleiding/videos/'
const RUW = UIT + 'ruw/'
mkdirSync(RUW, { recursive: true })
const TOTAAL = 10
// munten, briefgeld en wat kleding voor de proefleerling (filmpjes 8 t/m 10)
const PORTEMONNEE = () => {
  localStorage.setItem('kk_briefgeld', '850'); localStorage.setItem('kk_curuntie', '1240')
  if (!localStorage.getItem('kk_unlocked')) localStorage.setItem('kk_unlocked', JSON.stringify({ shirt: ['rood', 'blauw', 'geel'], broek: ['blauw'], schoenen: ['wit'] }))
  if (!localStorage.getItem('kk_shirt')) { localStorage.setItem('kk_shirt', 'rood'); localStorage.setItem('kk_wearing', JSON.stringify({ broek: 'blauw', schoenen: 'wit' })) }
}

const FILMPJES = {
  // ── 1 ─────────────────────────────────────────────────────────────
  '1-inloggen-en-je-klas': { wie: null, inlogAls: 'L1', start: '/leerkrachtenportaal', async speel(p, r) {
    await r.kaart('Inloggen en je klas openen', 'Voor leerkrachten', 'Filmpje 1 van ' + TOTAAL)
    await r.ot('Ga naar <b>kenniskist.nl/leerkrachtenportaal</b>. Je logt in met je e-mailadres en wachtwoord.', 3600)
    await r.typ(p.locator('input[type=email]'), 'juf.sanne@voorbeeld.nl')
    await r.typ(p.locator('input[type=password]'), 'geheim123')
    await r.klik(p.getByRole('button', { name: 'Inloggen' }), 3000)
    await r.ot('Je ziet de klassen waar je bij hoort. Op de kaart staat ook de <b>inlogcode</b> van de klas: die hebben je leerlingen nodig.', 4500)
    await r.wijs(p.getByText('zon7a').first()); await r.wacht(1200)
    await r.ot('Klik op de klas om hem te openen.', 2200)
    await r.klik('Groep 7a', 1600)
    const tab = (t) => p.locator('.portaal-tab-knop', { hasText: t })
    for (const [t, uitleg] of [
      ['Weektaak', '<b>Weektaak:</b> opdrachten voor de hele klas, met een begin- en einddatum.'],
      ['Taken', '<b>Taken:</b> een losse opdracht voor één of een paar leerlingen.'],
      ['Doelen', '<b>Doelen:</b> een leerdoel per leerling. Behaald bij 80% goed van de laatste 20 opgaven.'],
      ['Weekoverzicht', '<b>Weekoverzicht:</b> wat een leerling per week heeft gedaan.'],
      ['Werkblad', '<b>Werkblad:</b> een werkblad op papier om te printen.'],
      ['Eigen oefeningen', '<b>Eigen oefeningen:</b> een oefening met je eigen vragen.'],
      ['Leerlingen', '<b>Leerlingen:</b> je leerlingen, en hoe vaak er een spelletje komt.'],
    ]) { await r.wijs(tab(t)); await r.ot(uitleg, 3300) }
    await r.otWeg()
    await r.eindkaart('Klaar!', 'In de volgende filmpjes zie je hoe je dit allemaal gebruikt.')
  } },

  // ── 2 ─────────────────────────────────────────────────────────────
  '2-leerlingen-toevoegen': { wie: 'L1', start: '/leerkrachtenportaal', async speel(p, r) {
    await r.kaart('Leerlingen toevoegen', 'En een vergeten wachtwoord opnieuw instellen', 'Filmpje 2 van ' + TOTAAL)
    await r.ot('Klik op <b>+ Leerling</b>.', 2000)
    await r.klik('+ Leerling', 1200)
    await r.ot('Vul de voornaam en de eerste letter van de achternaam in.', 2500)
    await r.typ(p.getByLabel('Voornaam'), 'Sara')
    await r.typ(p.getByLabel('Eerste letter achternaam'), 'B')
    await r.ot('Met de <b>gebruikersnaam</b> en het <b>wachtwoord</b> logt de leerling in. Kies iets wat een kind makkelijk onthoudt.', 4000)
    await r.typ(p.getByLabel('Gebruikersnaam'), 'sara')
    await r.typ(p.getByLabel('Wachtwoord'), 'zon123')
    await r.ot('Kies de klas en klik op <b>Aanmaken</b>.', 2400)
    await r.klik(p.getByRole('button', { name: 'Aanmaken' }), 1500)
    await r.ot('Geef de leerling de drie inloggegevens: de <b>klascode</b>, de <b>gebruikersnaam</b> en het <b>wachtwoord</b>.', 4500)
    await r.ot('Wachtwoord vergeten? Open de klas en ga naar <b>Leerlingen</b>.', 3000)
    await r.klik('Groep 7a', 1500)
    await r.klik(p.locator('.portaal-tab-knop', { hasText: 'Leerlingen' }), 1500)
    await r.klik(p.locator('button', { hasText: 'Noor' }).first(), 1800)
    await r.ot('Klik op <b>Wachtwoord resetten</b>, typ een nieuw wachtwoord en klik op <b>Opslaan</b>.', 3200)
    await r.klik('Wachtwoord resetten', 1000)
    await r.typ(p.getByLabel('Nieuw wachtwoord'), 'maan456', 800)
    await r.klik(p.getByRole('button', { name: 'Opslaan' }), 1500)
    await r.otWeg()
    await r.eindkaart('Klaar!', 'Je leerlingen kunnen nu inloggen.')
  } },

  // ── 3 ─────────────────────────────────────────────────────────────
  '3-weektaak-klaarzetten': { wie: 'L1', start: '/leerkrachtenportaal', async speel(p, r) {
    await r.kaart('Een weektaak klaarzetten', 'Opdrachten voor de hele klas', 'Filmpje 3 van ' + TOTAAL)
    await r.klik('Groep 7a', 1400)
    await r.ot('Kies het tabblad <b>Weektaak</b> en klik op <b>+ Nieuwe weektaak</b>.', 2600)
    await r.klik('+ Nieuwe weektaak', 1400)
    await r.ot('<b>Stap 1:</b> geef hem een titel en kies de start- en einddatum. De leerlingen zien de opdrachten alleen tussen die datums.', 4200)
    await r.typ(p.getByPlaceholder('bv. Week 36'), 'Week 46', 800)
    await r.ot('<b>Stap 2:</b> klik op <b>+ Opdracht toevoegen</b>, kies een vak en dan een oefening.', 3200)
    await r.klik('+ Opdracht toevoegen', 1000)
    await r.klik('Taal', 1000)
    await r.klik('Woordsoorten', 1300)
    await r.ot('Elke opdracht heeft eigen instellingen. Hier: hoeveel opgaven, en welke woordsoorten.', 3200)
    const blok = p.locator('.portaal-opdracht').first()
    await r.klik(blok.getByText('zelfstandig naamwoord', { exact: true }), 500)
    await r.klik(blok.getByText('werkwoord', { exact: true }), 500)
    await r.klik(blok.getByText('lidwoord', { exact: true }), 900)
    await r.ot('Je kunt zoveel opdrachten toevoegen als je wilt. Bijvoorbeeld ook verhaaltjessommen.', 2800)
    await r.klik('+ Opdracht toevoegen', 1000)
    await r.klik('Rekenen', 1000)
    await r.klik('Verhaaltjessommen', 1300)
    await r.ot('Met <b>+ Werk aan je doelen</b> werkt elke leerling een aantal minuten aan zijn eigen doelen.', 3600)
    await r.klik('+ Werk aan je doelen', 1300)
    await r.scrollNaar('Voor wie?')
    await r.ot('<b>Stap 3:</b> standaard krijgt de hele klas hem. Vink uit wie hem niet hoeft te maken.', 3400)
    await r.klik(p.locator('.portaal-vakje', { hasText: 'Jesse' }), 1200)
    await r.ot('<b>Stap 4:</b> klik op <b>Weektaak klaarzetten</b>. Klaar!', 2600)
    await r.klik('Weektaak klaarzetten', 1800)
    await r.ot('De nieuwe weektaak staat in de lijst. Vanaf de startdatum zien de leerlingen hem bij <b>Mijn weektaak</b>.', 4000)
    await r.otWeg()
    await r.eindkaart('Klaar!', 'Tip: met Kopiëren maak je volgende week in een paar klikken dezelfde weektaak.')
  } },

  // ── 4 ─────────────────────────────────────────────────────────────
  '4-voortgang-volgen': { wie: 'L1', start: '/leerkrachtenportaal', async speel(p, r) {
    await r.kaart('De voortgang volgen', 'Zien wie klaar is en waar het misgaat', 'Filmpje 4 van ' + TOTAAL)
    await r.klik('Groep 7a', 1400)
    await r.ot('Klik op een weektaak om de voortgang te zien.', 2200)
    await r.klik('Week 45', 1800)
    await r.ot('Per leerling en per opdracht zie je hoeveel er gemaakt is, hoeveel procent goed en hoe lang eraan gewerkt is.', 4200)
    await r.wijs(p.getByText('71%').first()); await r.ot('Groen is goed, oranje gaat redelijk, rood vraagt aandacht.', 3000)
    await r.wijs(p.getByText('2 fout →').first()); await r.ot('Klik op <b>fout →</b> of op de naam om te zien wat er misging.', 3000)
    await r.klik(p.locator('.portaal-leerlingnaam', { hasText: 'Fleur' }).first(), 1800)
    await r.ot('Bij de <b>foutanalyse</b> zie je per onderdeel hoeveel er goed ging. De zwakste plek staat bovenaan.', 4000)
    await r.scroll(420, 1500)
    await r.scroll(0, 900)
    await r.klik(p.locator('.portaal-tab-knop', { hasText: 'Weektaak' }), 1200)
    await r.klik('Week 45', 1500)
    await r.ot('Met <b>Differentiëren</b> geef je per leerling andere opdrachten of een ander aantal opgaven.', 3400)
    await r.klik('Differentiëren', 2200)
    const veld = p.locator('input[type=number]').first()
    await veld.fill(''); await r.typ(veld, '30', 900)
    await r.ot('Klik daarna op <b>Opslaan</b>.', 2200)
    await r.klik(p.getByRole('button', { name: 'Terug' }).first(), 1500)
    await r.ot('Met <b>Alleen niet af</b> zie je wat nog openstaat. Daar kun je een opdracht op "hoeft niet" zetten.', 3600)
    await r.klik('Alleen niet af', 2500)
    await r.otWeg()
    await r.eindkaart('Klaar!', 'Zo zie je in één oogopslag hoe je klas ervoor staat.')
  } },

  // ── 5 ─────────────────────────────────────────────────────────────
  '5-taken-en-doelen': { wie: 'L1', start: '/leerkrachtenportaal', async speel(p, r) {
    await r.kaart('Taken en doelen per leerling', 'Extra oefenen voor wie dat nodig heeft', 'Filmpje 5 van ' + TOTAAL)
    await r.klik('Groep 7a', 1400)
    await r.ot('Een <b>doel</b> is een leerdoel voor één of meer leerlingen. Het is behaald bij 80% goed van de laatste 20 opgaven.', 4200)
    await r.klik(p.locator('.portaal-tab-knop', { hasText: 'Doelen' }), 1500)
    await r.ot('Klik op <b>+ Nieuw doel</b> en daarna op een vak.', 2600)
    await r.klik('+ Nieuw doel', 1200)
    const vak = p.locator('.portaal-naamknop', { hasText: 'Taal' }).first()
    if (!(await vak.isVisible().catch(() => false))) await r.klik('+ Doel kiezen', 1000)
    await r.klik(p.locator('.portaal-naamknop', { hasText: 'Taal' }).first(), 1300)
    await r.ot('Kies het onderdeel en dan het doel. Bijvoorbeeld: komma’s zetten.', 2800)
    await r.klik(p.locator('.portaal-naamknop', { hasText: 'Interpunctie' }).first(), 1300)
    await r.klik(p.locator('.portaal-naamknop', { hasText: 'Komma' }).first(), 1500)
    await r.scrollNaar('Voor wie?')
    await r.ot('Vink aan voor wie het doel is. Zij zien het bij <b>Speciaal voor mij</b>.', 3200)
    await r.klik(p.locator('.portaal-vakje', { hasText: 'Emma' }), 600)
    await r.klik(p.locator('.portaal-vakje', { hasText: 'Sem' }), 900)
    await r.klik('Doel klaarzetten', 1800)
    await r.ot('Klik op een doel om per leerling de stand te zien: hoeveel er gemaakt is, of het percentage goed.', 3800)
    await r.klik('Komma bij opsommingen', 2200)
    await r.wacht(1500)
    await r.ot('Een <b>taak</b> werkt hetzelfde, maar dan met een vast aantal opgaven. Die zet je klaar bij het tabblad <b>Taken</b>.', 4200)
    await r.klik(p.locator('.portaal-tab-knop', { hasText: 'Taken' }), 2200)
    await r.otWeg()
    await r.eindkaart('Klaar!', 'Je leerlingen vinden hun taken en doelen bij Speciaal voor mij.')
  } },

  // ── 6 ─────────────────────────────────────────────────────────────
  '6-voor-de-icter': { wie: 'I1', start: '/leerkrachtenportaal', async speel(p, r) {
    await r.kaart('Voor de ICT’er', 'Klassen en leerkrachten beheren', 'Filmpje 6 van ' + TOTAAL)
    await r.ot('Als ICT’er zie je alle klassen van de school, en de knoppen <b>+ Leerkracht</b> en <b>+ Klas</b>.', 3600)
    await r.klik('+ Klas', 1200)
    await r.typ(p.getByPlaceholder('bv. Groep 7A'), 'Groep 8b')
    await r.typ(p.getByPlaceholder('bv. 2025-2026'), '2026-2027')
    await r.ot('De <b>klascode</b> is de inlogcode voor de leerlingen. Kies iets korts.', 3000)
    await r.typ(p.getByPlaceholder('bv. linde7 of vliertuin7b'), 'ster8b')
    await r.ot('Vink de leeftijdsgroep aan: dan zie je bij een weektaak meteen de oefeningen voor die groep.', 3400)
    await r.klik(p.getByText('Groep 8', { exact: true }).first(), 900)
    await r.klik(p.getByRole('button', { name: 'Aanmaken' }), 1800)
    await r.ot('Een nieuwe leerkracht voeg je toe met <b>+ Leerkracht</b>: naam, e-mailadres en wachtwoord.', 3600)
    await r.klik('+ Leerkracht', 1500)
    await r.klik(p.getByRole('button', { name: 'Sluiten' }).last(), 1000)
    await r.ot('Koppel de leerkracht daarna aan een klas, via het <b>tandwiel</b> op de klaskaart.', 3200)
    await r.klik(p.locator('.portaal-tandwiel[title="Instellingen van Groep 7a"]'), 1800)
    await r.ot('Hier pas je de klas aan, schuif je leerlingen door naar een nieuw schooljaar en koppel je leerkrachten.', 4200)
    await r.scrollNaar('Leerkrachten van deze klas')
    await r.ot('Alleen gekoppelde leerkrachten zien de klas, de leerlingen en hun resultaten.', 3600)
    await r.scrollNaar('Voorlezen (1 van de 10)')
    await r.ot('Bij <b>Voorlezen</b> zet je de luidsprekerknop aan voor leerlingen die moeite hebben met lezen.', 3600)
    await r.otWeg()
    await r.eindkaart('Klaar!', 'Je school is ingericht.')
  } },

  // ── 7 ─────────────────────────────────────────────────────────────
  '7-zo-werkt-het-voor-de-leerling': { wie: null, inlogAls: 'P71', start: '/leerlingportaal', breed: 1180, hoog: 820, async speel(p, r) {
    await r.kaart('Zo werkt het voor de leerling', 'Inloggen, de weektaak en eigen doelen', 'Filmpje 7 van ' + TOTAAL)
    await r.ot('De leerling gaat naar <b>kenniskist.nl/leerlingportaal</b> en vult de klascode, de gebruikersnaam en het wachtwoord in.', 4200)
    await r.typ(p.getByPlaceholder('bv. linde7'), 'zon7a')
    await r.typ(p.locator('input:not([type=password])').nth(1), 'fleur')
    await r.typ(p.locator('input[type=password]'), 'zon123')
    await r.klik(p.getByRole('button', { name: 'Inloggen' }), 4500)
    await r.ot('Dit is het startscherm. Bij <b>Mijn weektaak</b> staan de opdrachten van deze week.', 3600)
    await r.klik(p.locator('.zijkaart-weektaak'), 1600)
    await r.klik('Week 45', 1600)
    await r.ot('Een groen vinkje betekent: af. Bij de andere opdrachten staat hoe ver je bent.', 3400)
    await r.klik(p.locator('.mode-card', { hasText: 'Woordsoorten' }).first(), 2000)
    await r.ot('Lees de zin en kies de goede woordsoort.', 2800)
    await r.klik(p.locator('.tv-answer-btn').first(), 1800)
    await r.ot('Je ziet meteen of het goed was, en waarom. Na een aantal goede antwoorden krijg je een spelletje.', 4000)
    await r.klik(p.getByText('Stoppen').first(), 1200)
    await r.klik(p.getByText('Terug').first(), 1200)
    await r.klik(p.getByText('Terug').first(), 1400)
    await r.ot('Bij <b>Speciaal voor mij</b> staan de taken en doelen die de juf of meester alleen voor jou heeft klaargezet.', 4000)
    await r.klik(p.locator('.zijkaart-speciaal'), 1500)
    await r.klik(p.getByText('Doelen', { exact: true }), 1200)
    await r.klik(p.getByText('Taal', { exact: true }), 1200)
    await r.klik('Komma bij opsommingen', 1800)
    await r.ot('Eerst zie je kort hoe het werkt, met een voorbeeld. Het doel is gehaald bij 80% goed van je laatste 20 opgaven.', 4400)
    await r.klik('Start oefenen', 2200)
    await r.wijs(p.locator('.wt-doelpil')); await r.ot('Linksonder zie je hoe ver je bent met je doel.', 3200)
    await r.otWeg()
    await r.eindkaart('Veel plezier met oefenen!', 'Vergeet niet uit te loggen op een gedeelde iPad.')
  } },

  // ── 8 ─────────────────────────────────────────────────────────────
  '8-vrij-oefenen': { wie: 'P71', start: '/leerlingportaal', breed: 1180, hoog: 820, init: PORTEMONNEE, async speel(p, r) {
    await r.kaart('Vrij oefenen', 'Zelf kiezen wat je oefent', 'Filmpje 8 van ' + TOTAAL)
    await r.ot('Naast de weektaak mag je ook zelf kiezen wat je oefent. Tik op <b>Speel Game</b>.', 3400)
    await r.klik(p.locator('.btn-game'), 1800)
    await r.ot('Tik op je groep. Daar staan alle vakken.', 2600)
    await r.klik(p.locator('.year-card').first(), 1600)
    await r.ot('Kies een vak. Bij rekenen zie je bijvoorbeeld breuken, maten omrekenen en klokkijken.', 3600)
    await r.klik(p.locator('.subject-card', { hasText: 'Rekenen' }), 1800)
    await r.wijs(p.getByText('briefgeld').first())
    await r.ot('Een groen label <b>briefgeld</b> betekent dat je met die oefening briefgeld verdient.', 3400)
    await r.klik(p.getByText('Terug').first(), 1200)
    await r.ot('Bij taal staan ook de <b>eigen oefeningen</b> van je juf of meester.', 3000)
    await r.klik(p.locator('.subject-card', { hasText: 'Taal' }), 1800)
    await r.wijs(p.getByText('Spreekwoorden').first()); await r.wacht(1200)
    await r.ot('We kiezen <b>Taalverkennen</b> en dan <b>Woordsoorten</b>.', 2800)
    await r.klik(p.locator('.tv-mode-card', { hasText: 'Taalverkennen' }), 1300)
    await r.klik(p.locator('.tv-mode-card', { hasText: 'Woordsoorten' }), 1500)
    await r.ot('Tik aan wat je wilt oefenen en tik op <b>Start oefenen</b>.', 3000)
    await r.klik('Start oefenen', 1800)
    await r.klik(p.locator('.tv-answer-btn').first(), 1800)
    await r.ot('Ook bij vrij oefenen krijg je na een aantal goede antwoorden een spelletje en briefgeld.', 3600)
    await r.klik(p.getByText('Stoppen').first(), 900)
    for (let i = 0; i < 5; i++) { if (await p.locator('body').getByText('Code invoeren').first().isVisible().catch(() => false)) break; await r.klik(p.locator('body').getByText('Terug').first(), 1000) }
    await r.ot('Heb je een code van je juf of meester gekregen? Tik op <b>Code invoeren</b>.', 3200)
    await r.klik('Code invoeren', 1200)
    await r.typ(p.getByPlaceholder('Typ hier je code...').or(p.locator('input').last()), 'mijncode', 600)
    await r.ot('Tik op <b>Activeren</b>, dan opent wat bij de code hoort.', 3000)
    await r.klik(p.getByRole('button', { name: 'Sluiten' }).first(), 900)
    await r.otWeg()
    await r.eindkaart('Klaar!', 'Wat je vrij oefent, ziet je juf of meester ook terug.')
  } },

  // ── 9 ─────────────────────────────────────────────────────────────
  '9-munten-briefgeld-en-de-winkel': { wie: 'P71', start: '/leerlingportaal', breed: 1180, hoog: 820, init: PORTEMONNEE, async speel(p, r) {
    await r.kaart('Munten, briefgeld en de winkel', 'Wat verdien je waarmee?', 'Filmpje 9 van ' + TOTAAL)
    await r.ot('Kenniskist heeft twee soorten geld. Tik op <b>Winkel</b>.', 2800)
    await r.klik(p.locator('.btn-shop'), 2200)
    await r.wijs(p.locator('.shop-saldo'))
    await r.ot('💵 <b>Briefgeld</b> verdien je met oefenen. Daarmee koop je hier een kist met kleding.', 3800)
    await r.ot('🪙 <b>Munten</b> verdien je met de spelletjes. Die geef je in de spelletjes zelf uit.', 3800)
    await r.ot('Er is een kist voor shirts, broeken, sokken, schoenen en petten. Tik op een kist.', 3200)
    await r.klik(p.locator('.shopcard', { hasText: 'Shirt' }), 1600)
    await r.wijs(p.locator('.shop-detail-oddsbar'))
    await r.ot('Je ziet de kans op elke zeldzaamheid: hoe zeldzamer, hoe kleiner de kans.', 3600)
    await r.wijs(p.getByText('Collectie').first())
    await r.ot('Hieronder zie je welke kleding je al hebt. Een kist kost <b>100 briefgeld</b>.', 3400)
    await r.klik(p.locator('.shop-detail-panel button').filter({ hasText: 'Openen' }), 3500)
    await r.ot('Tik een paar keer op de kist om hem open te maken.', 2600)
    for (let i = 0; i < 4; i++) await r.klikOp(590, 400, 800)
    await r.wacht(2500)
    await r.ot('Daar is je nieuwe kledingstuk! Je krijgt nooit iets dubbel.', 3400)
    await r.otWeg()
    await r.eindkaart('Klaar!', 'Je nieuwe kleding trek je aan in de kledingkast.')
  } },

  // ── 10 ────────────────────────────────────────────────────────────
  '10-kledingkast-en-samen-spelen': { wie: 'P71', start: '/leerlingportaal', breed: 1180, hoog: 820, init: PORTEMONNEE, async speel(p, r) {
    await r.kaart('De kledingkast en samen spelen', 'Je eigen poppetje', 'Filmpje 10 van ' + TOTAAL)
    await r.ot('In de <b>Kledingkast</b> kleed je je eigen poppetje aan.', 2600)
    await r.klik(p.locator('.btn-wardrobe'), 7000)
    await r.ot('Kies links een soort kleding en tik op een kledingstuk om het aan te trekken.', 3400)
    await r.klik(p.locator('.color-swatches > *').nth(2), 2200)
    await r.ot('Met <b>Verras me!</b> krijg je in één keer een nieuwe outfit.', 2800)
    await r.klik('Verras me!', 2500)
    await r.ot('Bovenaan laat je je poppetje dansen.', 2400)
    await r.klik(p.locator('.emote-btn', { hasText: 'Hip Hop' }), 3500)
    await r.ot('Met <b>Speel een spel</b> speel je met je eigen poppetje samen met klasgenoten.', 3400)
    await r.klik('Speel een spel', 1500)
    await r.wijs(p.getByRole('button', { name: 'Voetbal' })); await r.wijs(p.getByRole('button', { name: 'Ballonnengevecht' }))
    await r.klik(p.getByRole('button', { name: 'Paintball' }), 2200)
    await r.ot('Eén leerling tikt op <b>Lobby aanmaken</b> en krijgt een code van een paar cijfers.', 3600)
    await r.wijs(p.getByText('Lobby aanmaken').first()); await r.wacht(800)
    await r.ot('De anderen typen die <b>lobbycode</b> in en tikken op <b>Joinen</b>. Dan spelen jullie samen.', 3800)
    await r.typ(p.getByPlaceholder('12345'), '48213', 600)
    await r.wijs(p.getByText('Joinen').first()); await r.wacht(800)
    await r.otWeg()
    await r.eindkaart('Veel plezier!', 'Alleen wie dezelfde code invult, speelt met je mee.')
  } },
}

const kies = process.argv.slice(2).filter(a => !a.startsWith('--'))
const TEKSTEN = process.cwd() + '/docs/handleiding/video/teksten.json'
const teksten = existsSync(TEKSTEN) ? JSON.parse(readFileSync(TEKSTEN, 'utf8')) : {}
const tijd = (ms) => { const t = Math.max(0, ms); const h = Math.floor(t / 3600000), m = Math.floor(t / 60000) % 60, s = Math.floor(t / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(Math.floor(t % 1000)).padStart(3, '0')}` }
const browser = await start()
for (const [naam, f] of Object.entries(FILMPJES)) {
  if (kies.length && !kies.some(k => naam === k || naam.startsWith(k + '-'))) continue
  console.log('🎬', naam)
  // ingesproken zinnen van dit filmpje (als die er zijn): duur per tekst
  const duren = {}, wavs = {}
  if (STEM) for (const tekst of teksten[naam] ?? []) {
    const pad = STEMMAP + naam + '/' + stemCode(tekst) + '.wav'
    if (existsSync(pad)) { duren[tekst] = duur(pad); wavs[tekst] = pad }
  }
  const tijdlijn = [], t0 = Date.now()
  const p = await pagina(browser, f.wie, { breed: f.breed ?? 1280, hoog: f.hoog ?? 720, video: RUW, inlogAls: f.inlogAls, init: [OVERLAY, ...(f.init ? [f.init] : [])] })
  const r = regie(p, { duren, tijdlijn, t0 })
  await p.goto(BASIS + f.start); await p.waitForTimeout(300)
  try { await f.speel(p, r) } catch (e) {
    console.log('  ✗', e.message.split(/\r?\n/).slice(0, 4).join(' | '))
    await p.screenshot({ path: process.cwd() + '/docs/handleiding/' + naam + '-fout.jpg', type: 'jpeg' }).catch(() => {})
  }
  r.sluit()
  const pad = await p.video().path()
  await p.context().close()
  const mp4 = UIT + naam + '.mp4'
  if (existsSync(mp4)) rmSync(mp4)
  // het eerste stukje (lege pagina die laadt) eraf, en naar mp4 voor elke speler;
  // met stem: elke zin op het moment dat hij in beeld komt
  const clips = tijdlijn.filter(l => wavs[l.tekst])
  const args = ['-loglevel', 'error', '-ss', String(TRIM), '-i', pad]
  clips.forEach(l => args.push('-i', wavs[l.tekst]))
  if (clips.length) {
    const delen = clips.map((l, i) => `[${i + 1}:a]adelay=${Math.max(0, l.van - TRIM * 1000 + 250)}:all=1[a${i}]`)
    args.push('-filter_complex', delen.join(';') + ';' + clips.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${clips.length}:normalize=0:dropout_transition=0[a]`, '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '128k')
  } else args.push('-an')
  args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-shortest', mp4)
  execFileSync('ffmpeg', args)
  rmSync(pad)
  // ondertitels als .srt (ook handig voor wie zonder geluid kijkt) en de teksten voor het inspreken
  const srt = tijdlijn.filter(l => !l.kaart).map((l, i) => [i + 1, tijd(l.van - TRIM * 1000) + ' --> ' + tijd((l.tot ?? l.van + 3000) - TRIM * 1000), l.tekst, ''].join(NL)).join(NL)
  writeFileSync(UIT + naam + '.srt', srt)
  // .vtt voor de ondertitels in de browser en een voorplaatje (de titelkaart)
  writeFileSync(UIT + naam + '.vtt', 'WEBVTT' + NL + NL + srt.replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2'))
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '1.8', '-i', mp4, '-frames:v', '1', '-vf', 'scale=640:-1', '-q:v', '5', UIT + naam + '.jpg'])
  teksten[naam] = tijdlijn.map(l => l.tekst)
  writeFileSync(TEKSTEN, JSON.stringify(teksten, null, 2))
  console.log('  ✓', mp4.split('/').pop(), clips.length ? `met stem (${clips.length} zinnen)` : 'zonder stem')
}
await browser.close()
rmSync(RUW, { recursive: true, force: true })
