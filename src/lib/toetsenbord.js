// Op de hele site geen hulp van het toetsenbord of de browser bij het typen:
// geen spellingcontrole, autocorrectie, woordsuggesties, automatische
// hoofdletters of eerder ingevulde woorden. Kinderen moeten het zelf weten.
// Geldt voor elk tekstveld, ook velden die later in beeld komen.

const VELD = 'input, textarea, [contenteditable=""], [contenteditable="true"]'
const TEKST = new Set(['', 'text', 'search', 'email', 'url', 'tel', 'number', 'password'])

function zetUit(el) {
  if (el.tagName === 'INPUT' && !TEKST.has((el.getAttribute('type') || '').toLowerCase())) return
  el.setAttribute('spellcheck', 'false')
  el.setAttribute('autocorrect', 'off')
  el.setAttribute('autocapitalize', 'none')
  el.setAttribute('writingsuggestions', 'false')
  // inlogvelden houden hun eigen autocomplete (wachtwoordbeheer)
  if (!el.hasAttribute('autocomplete')) el.setAttribute('autocomplete', 'off')
  el.setAttribute('data-gramm', 'false')
  el.setAttribute('data-gramm_editor', 'false')
  el.setAttribute('data-enable-grammarly', 'false')
  el.setAttribute('data-lt-active', 'false')
  el.setAttribute('data-ms-editor', 'false')
}

function doorloop(knoop) {
  if (knoop.nodeType !== 1) return
  if (knoop.matches(VELD)) zetUit(knoop)
  knoop.querySelectorAll?.(VELD).forEach(zetUit)
}

export function toetsenbordHulpUit() {
  const html = document.documentElement
  html.setAttribute('spellcheck', 'false')
  html.setAttribute('writingsuggestions', 'false')
  doorloop(document.body)
  new MutationObserver(lijst => {
    for (const m of lijst) m.addedNodes.forEach(doorloop)
  }).observe(document.body, { childList: true, subtree: true })
}
