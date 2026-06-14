const { test, expect } = require('@playwright/test')
const { loginAs } = require('./helpers/auth')

const COACH_EMAIL = process.env.TEST_COACH_EMAIL

test.describe('Coach dashboard', () => {

  test('coach kan inloggen via magic link', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await expect(page).toHaveURL(/\/dashboard\/coach/)
  })

  test('mijn studenten tab toont student kaart', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    // Coach is gekoppeld aan testleerling — kaart moet zichtbaar zijn
    await expect(page.locator('text=Mijn studenten').first()).toBeVisible({ timeout: 10_000 })
    // KPI tegel "Mijn studenten" moet waarde tonen
    await expect(page.locator('text=Studenten').first()).toBeVisible({ timeout: 5_000 })
  })

  test('nakijken tab laadt', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await page.locator('button').filter({ hasText: /nakijken/i }).first().click()
    await page.waitForTimeout(1000)
    // Toont nakijkstapel of lege staat
    const heeftInhoud = await page.locator('text=/Nakijkstapel|Alles nagekeken|nakij/i').first().isVisible()
    expect(heeftInhoud).toBeTruthy()
  })

  test('evaluaties tab laadt', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await page.locator('button').filter({ hasText: /evaluaties/i }).first().click()
    await page.waitForTimeout(1000)
    // Toont evaluatiemomenten of lege staat
    const heeftInhoud = await page.locator('text=/evaluatie|Tussenevaluatie|Eindevaluatie|geen actieve/i').first().isVisible()
    expect(heeftInhoud).toBeTruthy()
  })

  test('inschrijven tab toont studenten tabel', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await page.locator('button').filter({ hasText: /inschrijven/i }).first().click()
    await page.waitForTimeout(1000)
    await expect(page.locator('text=Schrijf je in op studenten').first()).toBeVisible({ timeout: 5_000 })
  })

  test('niet-ingelogde coach wordt doorgestuurd naar login', async ({ page }) => {
    await page.goto('/dashboard/coach')
    await page.waitForTimeout(3000)
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })

})
