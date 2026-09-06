import { defineConfig } from 'vitest/config'

// Losse config: vite.config.js laadt de Cloudflare-plugin, en die heeft een
// worker-omgeving nodig die de unit tests niet hebben.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/game/**/*.test.js', 'src/lib/**/*.test.js', 'tools/**/*.test.js'],
  },
})
