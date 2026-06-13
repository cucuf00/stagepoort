const { defineConfig, devices } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0, // Geen retries — magic links zijn eenmalig
  workers: 1, // Sequentieel om race conditions te voorkomen
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
