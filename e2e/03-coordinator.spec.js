const { test, expect } = require('@playwright/test')
const { loginAs } = require('./helpers/auth')

const COORDINATOR_EMAIL = process.env.TEST_COORDINATOR_EMAIL || 'yusuf.bagcivan@hotmail.com'

test.describe('Coordinator dashboard', () => {

  test('coordinator kan inloggen via magic link', async ({ page }) => {
    await loginAs(page, COORDINATOR_EMAIL)
    await expect(page).toHaveURL(/\/dashboard\/coordinator/)
  })

  test('dashboard toont KPI tegels', async ({ page }) => {
    await loginAs(page, COORDINATOR_EMAIL)
    await expect(page.locator('text=Studenten').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=Actieve stages').first()).toBeVisible({ timeout: 5_000 })
  })

  test('koppelingen pagina laadt', async ({ page }) => {
    await loginAs(page, COORDINATOR_EMAIL)
    await page.goto('/dashboard/coordinator/koppelingen')
    await expect(page.locator('text=Koppelingen').first()).toBeVisible({ timeout: 10_000 })
    // Moet minstens één sectie tonen
    const secties = page.locator('text=/Link nog versturen|Wacht op leerling|Ter beoordeling|Actieve koppelingen/i')
    await expect(secties.first()).toBeVisible({ timeout: 5_000 })
  })

  test('beoordelen pagina laadt met tabs', async ({ page }) => {
    await loginAs(page, COORDINATOR_EMAIL)
    await page.goto('/dashboard/coordinator/beoordelen')
    await expect(page.locator('text=Uren keuren').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=Opdrachten beoordelen').first()).toBeVisible({ timeout: 5_000 })
  })

  test('beheer pagina toont stageperiodes', async ({ page }) => {
    await loginAs(page, COORDINATOR_EMAIL)
    await page.goto('/dashboard/coordinator/beheer')
    await expect(page.locator('text=Stageperiodes').first()).toBeVisible({ timeout: 10_000 })
  })

  test('opdrachten pagina laadt met periode tabs', async ({ page }) => {
    await loginAs(page, COORDINATOR_EMAIL)
    await page.goto('/dashboard/coordinator/opdrachten')
    await page.waitForTimeout(2000)
    // Moet periodes of lege staat tonen
    const heeftInhoud = await page.locator('text=/leerjaar|periode|opdracht/i').first().isVisible()
    expect(heeftInhoud).toBeTruthy()
  })

  test('niet-ingelogde gebruiker wordt doorgestuurd naar login', async ({ page }) => {
    await page.goto('/dashboard/coordinator')
    await page.waitForTimeout(3000)
    // Moet naar login gaan
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })

})
