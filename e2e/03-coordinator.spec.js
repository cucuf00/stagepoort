const { test, expect } = require('@playwright/test')
const { loginAs } = require('./helpers/auth')

const COORDINATOR_EMAIL = process.env.TEST_COORDINATOR_EMAIL

test.describe('Coordinator dashboard', () => {
  test('coordinator kan inloggen via magic link', async ({ page }) => {
    await loginAs(page, COORDINATOR_EMAIL)
    await expect(page).toHaveURL(/\/dashboard\/coordinator/)
  })
  test('dashboard toont KPI tegels', async ({ page }) => {
    await loginAs(page, COORDINATOR_EMAIL)
    await expect(page.locator('text=Studenten').first()).toBeVisible({ timeout: 10_000 })
  })
  test('koppelingen pagina laadt', async ({ page }) => {
    await loginAs(page, COORDINATOR_EMAIL)
    await page.goto('/dashboard/coordinator/koppelingen')
    await expect(page.locator('text=Koppelingen').first()).toBeVisible({ timeout: 10_000 })
  })
  test('beoordelen pagina laadt', async ({ page }) => {
    await loginAs(page, COORDINATOR_EMAIL)
    await page.goto('/dashboard/coordinator/beoordelen')
    await expect(page.locator('text=Uren keuren').first()).toBeVisible({ timeout: 10_000 })
  })
  test('beheer pagina laadt', async ({ page }) => {
    await loginAs(page, COORDINATOR_EMAIL)
    await page.goto('/dashboard/coordinator/beheer')
    await expect(page.locator('text=Stageperiodes').first()).toBeVisible({ timeout: 10_000 })
  })
  test('niet-ingelogde gebruiker gaat naar login', async ({ page }) => {
    await page.goto('/dashboard/coordinator')
    await page.waitForTimeout(3000)
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })
})
