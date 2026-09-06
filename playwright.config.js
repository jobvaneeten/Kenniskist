import { defineConfig } from '@playwright/test'

// Alleen voor de levelscreenshots van Sterrenveer. De dev-server wordt hier
// gestart en na afloop weer gestopt, zodat `npm run screenshots` op een schone
// machine werkt.
export default defineConfig({
  testDir: './tools',
  testMatch: /(screenshot-levels|speeltest)\.js/,
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 960, height: 540 },
    deviceScaleFactor: 1,
  },
  webServer: {
    command: 'npx vite --port 5173 --strictPort',
    url: 'http://localhost:5173/sterrenveer-dev.html',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
