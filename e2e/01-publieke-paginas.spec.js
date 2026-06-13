const { test, expect } = require('@playwright/test')

test.describe('Publieke pagina\'s', () => {

  test('loginpagina laadt correct', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=Stagepoort').first()).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button').filter({ hasText: /magische link/i })).toBeVisible()
  })

  test('root URL redirected naar login', async ({ page }) => {
    await page.goto('/')
    // Moet doorsturen naar /login
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })

  test('intake pagina met ongeldige UUID toont foutmelding', async ({ page }) => {
    await page.goto('/intake/00000000-0000-0000-0000-000000000000')
    // Wacht op laadscherm (is client-side)
    await page.waitForTimeout(4000)
    // Moet een foutmelding tonen, niet het formulier
    const heeftFout = await page.locator('text=/niet beschikbaar|niet geldig|niet gevonden|niet meer/i').isVisible()
    const isGeredirect = !page.url().includes('/intake/')
    expect(heeftFout || isGeredirect).toBeTruthy()
  })

})
