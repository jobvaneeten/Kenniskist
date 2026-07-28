import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Root from './Root.jsx'
import { hydrateer } from './lib/voortgangSync.js'

// Nooit de hele site laten hangen op Supabase: als hydrateren faalt of traag is,
// starten we gewoon met de localStorage-voortgang die er al staat.
try {
  await Promise.race([
    hydrateer(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('hydrateer-timeout')), 8000)),
  ])
} catch (e) {
  console.error('Voortgang hydrateren mislukt — app start zonder sync:', e)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
