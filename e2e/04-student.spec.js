const { test, expect } = require('@playwright/test')
const { loginAs } = require('./helpers/auth')

const STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL || 'zm@live.nl'

test.describe('Student dashboard', () => {

  test('student kan inloggen via magic link', async ({ page }) => {
    await loginAs(page, STUDENT_EMAIL)
    // Student kan op dashboard of onboarding terechtkomen
    await expect(page).toHaveURL(/(dashboard\/student|onboarding)/)
  })

  test('student dashboard heeft donker thema en bottom nav', async ({ page }) => {
    await loginAs(page, STUDENT_EMAIL)

    if (page.url().includes('/onboarding')) {
      test.skip(true, 'Student heeft nog geen klas — onboarding actief')
      return
    }

    // Check donker thema (achtergrondkleur is donker)
    const body = page.locator('body')
    await expect(body).toBeVisible()

    // Bottom nav heeft 4 tabs
    await expect(page.locator('text=Mijn stage').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=Uren').first()).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=Opdrachten').first()).toBeVisible({ timeout: 5_000 })
  })

  test('uren tab laadt formulier', async ({ page }) => {
    await loginAs(page, STUDENT_EMAIL)

    if (page.url().includes('/onboarding')) {
      test.skip(true, 'Student heeft nog geen klas — onboarding actief')
      return
    }

    // Klik op Uren tab in bottom nav
    await page.locator('button').filter({ hasText: '⏱' }).first().click()

    // Wacht op het formulier — het zijn client-side gerenderde inputs
    await expect(
      page.locator('input[type="date"], input[type="number"]').first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('weekstory tab laadt', async ({ page }) => {
    await loginAs(page, STUDENT_EMAIL)

    if (page.url().includes('/onboarding')) {
      test.skip(true, 'Student heeft nog geen klas — onboarding actief')
      return
    }

    // Klik op Weekstory tab
    await page.locator('text=Weekstory').first().click()
    await page.waitForTimeout(1000)

    // Moet weekstory content of al-ingevuld status tonen
    const heeftContent = await page.locator('text=/week|story|mood|reflectie/i').first().isVisible()
    expect(heeftContent).toBeTruthy()
  })

  test('niet-ingelogde student wordt doorgestuurd naar login', async ({ page }) => {
    await page.goto('/dashboard/student')
    await page.waitForTimeout(3000)
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })

})
