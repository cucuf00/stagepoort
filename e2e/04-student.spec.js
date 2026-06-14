const { test, expect } = require('@playwright/test')
const { loginAs } = require('./helpers/auth')

const STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL

test.describe('Student dashboard', () => {

  test('student kan inloggen via magic link', async ({ page }) => {
    await loginAs(page, STUDENT_EMAIL)
    await expect(page).toHaveURL(/(dashboard\/student|onboarding)/)
  })

  test('student dashboard heeft bottom nav', async ({ page }) => {
    await loginAs(page, STUDENT_EMAIL)
    if (page.url().includes('/onboarding')) { test.skip(true, 'Onboarding actief'); return }
    await expect(page.locator('text=Mijn stage').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=Uren').first()).toBeVisible({ timeout: 5_000 })
  })

  test('uren tab toont invoerformulier', async ({ page }) => {
    await loginAs(page, STUDENT_EMAIL)
    if (page.url().includes('/onboarding')) { test.skip(true, 'Onboarding actief'); return }
    // Bottom nav zit in een fixed div — target via emoji tekst
    await page.locator('button').filter({ hasText: /⏱/ }).first().click()
    await expect(
      page.locator('input[type="date"], input[type="number"]').first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('weekstory tab laadt', async ({ page }) => {
    await loginAs(page, STUDENT_EMAIL)
    if (page.url().includes('/onboarding')) { test.skip(true, 'Onboarding actief'); return }
    // Klik op de ✨ Weekstory tab via de sub-tekst of emoji
    await page.locator('button').filter({ hasText: /Weekstory|✨/ }).first().click()
    await page.waitForTimeout(1000)
    const heeftContent = await page.locator('text=/week|story|mood|hoe was|Weekstory/i').first().isVisible()
    expect(heeftContent).toBeTruthy()
  })

  test('niet-ingelogde student gaat naar login', async ({ page }) => {
    await page.goto('/dashboard/student')
    await page.waitForTimeout(3000)
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })

})
