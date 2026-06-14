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
    await page.locator('button').filter({ hasText: '⏱' }).first().click()
    await expect(page.locator('input[type="date"], input[type="number"]').first()).toBeVisible({ timeout: 10_000 })
  })
  test('weekstory tab laadt', async ({ page }) => {
    await loginAs(page, STUDENT_EMAIL)
    if (page.url().includes('/onboarding')) { test.skip(true, 'Onboarding actief'); return }
    await page.locator('text=Weekstory').first().click()
    await page.waitForTimeout(1000)
    expect(await page.locator('text=/week|story|mood|hoe was/i').first().isVisible()).toBeTruthy()
  })
  test('niet-ingelogde student gaat naar login', async ({ page }) => {
    await page.goto('/dashboard/student')
    await page.waitForTimeout(3000)
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })
})
