import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// Elke build krijgt een eigen id. Dat id zit én in de bundel (__BUILD_ID__) én
// in versie.json naast de assets, zodat een tabblad dat al dagen openstaat kan
// zien dat er een nieuwere versie live staat — zie src/lib/versie.jsx.
const BUILD_ID = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)

function versiebestand() {
  return {
    name: 'kk-versiebestand',
    apply: 'build',
    generateBundle(opties) {
      // Alleen bij de browserbundel: de Worker-build heeft er niets aan.
      if (opties.format !== 'es' || this.environment?.name === 'ssr') return
      this.emitFile({
        type: 'asset',
        fileName: 'versie.json',
        source: JSON.stringify({ build: BUILD_ID }),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [react(), cloudflare(), versiebestand()],
})
