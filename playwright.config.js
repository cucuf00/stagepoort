const { defineConfig, devices } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/globalSetup.js',  // Maakt testschool-gebruikers aan vóór alle tests
  timeout: 30_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL || 'https://stagepoort.vercel.app',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
  ],
})
