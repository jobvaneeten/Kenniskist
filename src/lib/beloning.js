// Na hoeveel goede antwoorden krijgt een leerling een spelletje? Elke oefening
// heeft een eigen standaard (meestal 5 of 10); de leerkracht kan dat per klas
// anders zetten (klassen.spel_na, zie 0019_spel_na.sql). sessie.jsx zet die
// waarde in kk_profiel_cache, zodat ook de losse HTML-lessen hem kunnen lezen.
//   geen instelling → standaard van de oefening
//   0               → nooit een spelletje (Infinity: de teller haalt hem nooit)
export function spelNa(standaard) {
  try {
    const n = JSON.parse(localStorage.getItem('kk_profiel_cache') || 'null')?.spelNa
    if (n === 0) return Infinity
    if (Number.isInteger(n) && n > 0) return n
  } catch { /* geen of kapotte cache: standaard */ }
  return standaard
}

// Klopt de teller nog voor een spelletje? (false = de klas krijgt er geen)
export function heeftSpel(perBeloning) {
  return Number.isFinite(perBeloning)
}
