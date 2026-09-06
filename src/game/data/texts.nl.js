// Alle tekst die de speler ziet. Eén plek, zodat er nergens anders een losse
// Nederlandse string in de code staat.

export const T = {
  titel: 'Sterrenveer',
  ondertitel: 'Breng Pip naar huis',

  startMelding: 'Klik of druk op een toets om te starten',

  menu: {
    spelen: 'Spelen',
    winkel: 'Winkel',
    instellingen: 'Instellingen',
    verder: 'Verder',
    terug: 'Terug',
    kaart: 'Kaart',
    opnieuw: 'Opnieuw',
    volgende: 'Volgende',
    afsluiten: 'Stoppen',
  },

  hud: {
    munten: 'munten',
    alVerzameld: 'al verzameld',
    tijd: 'tijd',
  },

  kaart: {
    sterren: 'sterren',
    wereld: 'Wereld',
    baas: 'Baas',
    vergrendeld: 'Nog op slot',
    naarWinkel: 'Winkel',
    vorigeWereld: 'Vorige wereld',
    volgendeWereld: 'Volgende wereld',
    kiesLevel: 'Kies een level',
  },

  resultaten: {
    gehaald: 'Level gehaald!',
    muntenDitLevel: 'Munten dit level',
    bonus: 'Voltooiingsbonus',
    tijd: 'Tijd',
    doeltijd: 'Doeltijd',
    nieuwSaldo: 'Nieuw saldo',
    record: 'Nieuw record!',
    sterAlles: 'Alle munten',
    sterGeenSchade: 'Zonder schade',
    sterTijd: 'Binnen de tijd',
  },

  pauze: {
    titel: 'Pauze',
    verder: 'Verder spelen',
    opnieuw: 'Level opnieuw',
    instellingen: 'Instellingen',
    kaart: 'Terug naar de kaart',
  },

  gameOver: {
    titel: 'Game over',
    uitleg: 'Je levens zijn op. Het level begint opnieuw.',
    opnieuw: 'Opnieuw proberen',
    kaart: 'Naar de kaart',
  },

  // Beloningsmodus: het spel is een beloning voor het oefenen, dus na één level
  // (gehaald of niet) ga je vanzelf terug.
  beloning: {
    uitlegAf: 'Je levens zijn op.',
    verder: 'Verder met oefenen',
    automatisch: 'Je gaat terug naar het oefenen…',
  },

  instellingen: {
    titel: 'Instellingen',
    muziek: 'Muziek',
    sfx: 'Geluidseffecten',
    shake: 'Schermschudden',
    aan: 'aan',
    uit: 'uit',
    toetsen: 'Toetsen',
    toetsenUitleg: [
      'Pijltjes of WASD — bewegen',
      'Spatie, pijl omhoog of W — springen',
      'Shift of X — rennen',
      'Esc — pauze',
      'Enter — kiezen',
    ],
  },

  winkel: {
    titel: 'Hangar',
    koop: 'Koop',
    uitrusten: 'Uitrusten',
    uitgerust: 'Uitgerust',
    opSlot: 'Nog niet ontgrendeld',
    sterrenNodig: (n) => `${n} sterren nodig`,
    teDuur: 'Te weinig munten',
    bevestigTitel: 'Kopen?',
    bevestigJa: 'Ja, kopen',
    bevestigNee: 'Nee',
    saldo: 'Saldo',
  },

  cutscene: {
    intro: [
      'Pip vloog rustig langs de sterren...',
      '...tot er iets losschoot.',
      'Vijf onderdelen. Vijf planeten.',
    ],
    naBaas: (wereld) => `Onderdeel ${wereld} van 5 terug!`,
    eind: 'Het schip is compleet. Pip vliegt naar huis.',
  },

  // Hintbordjes: één zin per bord, in het level zelf.
  hints: {
    springen: 'Spring met spatie',
    rennen: 'Houd Shift ingedrukt om te rennen',
    stampen: 'Spring op vijanden om ze te verslaan',
    munten: 'Pak alle munten voor een ster',
    veer: 'Veren schieten je omhoog',
    breekbaar: 'Sla van onderaf tegen barstende blokken',
    checkpoint: 'Vlaggen slaan je voortgang op',
    hoog: 'Houd springen vast voor een hogere sprong',
    kever: 'Kevers met een schild moet je twee keer raken',
    geheim: 'Niet alles is wat het lijkt',
    platform: 'Wacht tot het platform naar je toe komt',
    kwal: 'Kwallen kun je niet stampen — ontwijk ze',
    grot: 'Hier kun je niet rennen. Neem de tijd',
    omhoog: 'Blijf omhoog gaan',
    valplatform: 'Blijf niet stilstaan op wankele platforms',
    tweeRoutes: 'Hoog is lastiger, maar levert meer op',
    snel: 'Blijf rennen — niet remmen',
    baas: 'Spring op haar kop als ze even stilstaat',
    ijs: 'Op ijs glijd je door — rem op tijd',
    dunIjs: 'Dun ijs houdt je maar even',
    wind: 'De wind duwt je opzij. Wacht op de stilte',
    pinguin: 'Pinguïns schieten terug. Blijf niet stilstaan',
    kanon: 'De kanonnen vuren op een vast ritme',
    ijskegel: 'IJskegels vallen zodra je eronder komt',
    donker: 'De munten wijzen de weg',
    baasWorm: 'De barst in het ijs verraadt waar hij omhoog komt',
    lava: 'Lava stijgt. Blijf klimmen',
    geiser: 'Geisers schieten je omhoog',
    zink: 'Zinkende platforms houden je niet lang',
    band: 'Lopende banden duwen je mee',
    laser: 'Lasers gaan om de beurt uit',
    zerog: 'Zonder zwaartekracht zweef je door',
    sleutel: 'Zoek eerst de sleutelkaart',
    omkeren: 'Zwaartekracht omgekeerd — omlaag is omhoog',
    portaal: 'Portalen brengen je naar de andere kant',
    verdwijnt: 'Deze platforms komen en gaan',
  },
}

export const seconden = (s) => {
  const m = Math.floor(s / 60)
  const rest = Math.floor(s % 60)
  return `${m}:${String(rest).padStart(2, '0')}`
}

export const secondenFijn = (s) => {
  const m = Math.floor(s / 60)
  const rest = (s % 60).toFixed(1)
  return `${m}:${rest.padStart(4, '0')}`
}
