// Thema's en lessen voor Begrijpend Lezen (groep 7-8)
// file: HTML-bestand in public/begrijpend-lezen/
export const THEMAS = [
  {
    key: 'spullen',
    naam: 'Duurzaam design',
    emoji: '🏭',
    kleur: '#06D6A0',
    lessen: [
      { key: 'les1', naam: 'Les 1 — Coole constructies',     file: 'spullen-les1.html', klaar: true },
      { key: 'les2', naam: 'Les 2 — De beste materialen',    file: 'spullen-les2.html', klaar: true },
      { key: 'les3', naam: 'Les 3 — Leve de fabriek?',       file: 'spullen-les3.html', klaar: true },
      { key: 'les4', naam: 'Les 4 — Kinderen aan het werk',  file: 'spullen-les4.html', klaar: true },
      { key: 'les5', naam: 'Les 5 — Mobiel binnenstebuiten', file: 'spullen-les5.html', klaar: true },
    ],
  },
  {
    // Eén bestand per les met een vragenset voor groep 7 en een (moeilijkere)
    // voor groep 8; de les krijgt ?groep=7|8 mee. Gebouwd met
    // scripts/begrijpend/maak-families.mjs.
    key: 'families',
    naam: 'Fantastische families',
    emoji: '👪',
    kleur: '#F9A826',
    groepKeuze: true,
    lessen: [
      'Een koninklijke ruzie', 'Dappere Drucker', 'Ons verleden',
      'Kom in verzet', 'Rebelse jongeren', 'Nieuwe gezinnen',
    ].map((naam, i) => ({ key: `les${i + 1}`, naam: `Les ${i + 1} — ${naam}`, file: `families-les${i + 1}.html`, klaar: true })),
  },
]
