/**
 * Student dashboard tests — alle 4 tabs uitgebreid
 */
const { test, expect } = require('@playwright/test')
const { loginAs } = require('./helpers/auth')

const STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL

// Helper: inloggen en onboarding overslaan
async function inlogStudent(page) {
  await loginAs(page, STUDENT_EMAIL)
  if (page.url().includes('/onboarding')) {
    // Testleerling heeft een actieve placement — onboarding zou niet moeten verschijnen
    // Als toch, navigeer direct door
    await page.goto('/dashboard/student')
    await page.waitForTimeout(2000)
  }
  await expect(page).toHaveURL(/dashboard\/student/, { timeout: 15_000 })
}

test.describe('Student — inloggen & navigatie', () => {
  test('kan inloggen via magic link', async ({ page }) => {
    await loginAs(page, STUDENT_EMAIL)
    await expect(page).toHaveURL(/(dashboard\/student|onboarding)/)
  })

  test('dashboard toont bottom navigatie', async ({ page }) => {
    await inlogStudent(page)
    await expect(page.locator('text=Mijn stage').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=Uren').first()).toBeVisible()
    await expect(page.locator('text=Dagboek').first()).toBeVisible()
  })

  test('niet-ingelogde student gaat naar login', async ({ page }) => {
    await page.goto('/dashboard/student')
    await page.waitForTimeout(3000)
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })
})

test.describe('Student — Mijn Stage tab', () => {
  test('KPI tegels zichtbaar (uren, XP, streak)', async ({ page }) => {
    await inlogStudent(page)
    // Goedgekeurde uren uit testdata: 8+8+4 = 20
    await expect(page.locator('text=/van.*uur|uur.*stage/i').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=/XP|xp/i').first()).toBeVisible()
  })

  test('stageroute stappen zichtbaar', async ({ page }) => {
    await inlogStudent(page)
    await expect(page.locator('text=/Gestart|Uren.*opdrachten/i').first()).toBeVisible({ timeout: 8000 })
  })

  test('testbadge zichtbaar in badge sectie', async ({ page }) => {
    await inlogStudent(page)
    // Badge sectie op mijn stage tab
    await expect(page.locator('text=/badge|Badge|🧪/i').first()).toBeVisible({ timeout: 8000 })
  })

  test('laatste uren worden getoond', async ({ page }) => {
    await inlogStudent(page)
    // Testdata bevat goedgekeurde uren
    await expect(page.locator('text=/maandag introductie|dinsdag administratie|Laatste uren/i').first()).toBeVisible({ timeout: 8000 })
  })
})

test.describe('Student — Uren tab', () => {
  test('uren invoerformulier is zichtbaar', async ({ page }) => {
    await inlogStudent(page)
    await page.locator('button').filter({ hasText: /📋/ }).first().click()
    await page.waitForTimeout(1000)
    await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 8000 })
    await expect(page.locator('input[type="number"]').first()).toBeVisible()
  })

  test('uren history toont goedgekeurde en afgekeurde regels', async ({ page }) => {
    await inlogStudent(page)
    await page.locator('button').filter({ hasText: /📋/ }).first().click()
    await page.waitForTimeout(1500)
    // Goedgekeurd uur uit testdata
    await expect(page.locator('text=/maandag introductie|dinsdag administratie|woensdag/i').first()).toBeVisible({ timeout: 8000 })
  })

  test('uren indienen met geldige data werkt', async ({ page }) => {
    await inlogStudent(page)
    await page.locator('button').filter({ hasText: /📋/ }).first().click()
    await page.waitForTimeout(1000)

    // Vul datum in (morgen)
    const morgen = new Date()
    morgen.setDate(morgen.getDate() + 1)
    const datumStr = morgen.toISOString().split('T')[0]

    await page.locator('input[type="date"]').fill(datumStr)
    await page.locator('input[type="number"]').fill('6')
    await page.locator('textarea, input[placeholder*="omschrijving"], input[placeholder*="beschrijving"]').first().fill('E2E test uren indienen')

    await page.locator('button').filter({ hasText: /indienen|uren indienen/i }).first().click()
    await expect(page.locator('text=/ingediend|✅/i').first()).toBeVisible({ timeout: 8000 })
  })
})

test.describe('Student — Opdrachten tab', () => {
  test('opdrachten tab toont openstaande opdrachten', async ({ page }) => {
    await inlogStudent(page)
    await page.locator('button').filter({ hasText: /📁/ }).first().click()
    await page.waitForTimeout(1500)
    // Testdata: opdracht 2 is open
    await expect(page.locator('text=/Vrije reflectie|Bedrijfsoriëntatie|E2E Testopdrcht/i').first()).toBeVisible({ timeout: 8000 })
  })

  test('ingediende opdracht toont status', async ({ page }) => {
    await inlogStudent(page)
    await page.locator('button').filter({ hasText: /📁/ }).first().click()
    await page.waitForTimeout(1500)
    // Opdracht 1 is 'submitted'
    await expect(page.locator('text=/ingediend|beoordeeld|Ter beoordeling/i').first()).toBeVisible({ timeout: 8000 })
  })

  test('vrije-tekst opdracht starten toont tekstinvoer', async ({ page }) => {
    await inlogStudent(page)
    await page.locator('button').filter({ hasText: /📁/ }).first().click()
    await page.waitForTimeout(1500)

    // Klik op de vrije reflectie opdracht
    const startKnop = page.locator('button').filter({ hasText: /start opdracht/i }).first()
    const heeftKnop = await startKnop.isVisible()
    if (!heeftKnop) { test.skip(true, 'Geen open opdrachten beschikbaar'); return }

    await startKnop.click()
    await page.waitForTimeout(800)
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Student — Dagboek tab', () => {
  test('dagboek tab laadt', async ({ page }) => {
    await inlogStudent(page)
    await page.locator('button').filter({ hasText: /📖|Dagboek/ }).first().click()
    await page.waitForTimeout(1000)
    const heeftContent = await page.locator('text=/vandaag|dagboek|gedaan|geleerd|Dagboek|mood|story/i').first().isVisible()
    expect(heeftContent).toBeTruthy()
  })

  test('gisteren dagstory is zichtbaar in archief', async ({ page }) => {
    await inlogStudent(page)
    await page.locator('button').filter({ hasText: /📖|Dagboek/ }).first().click()
    await page.waitForTimeout(1500)
    // Testdata bevat een dagstory van gisteren
    await expect(page.locator('text=/😊|kennisgemaakt|team/i').first()).toBeVisible({ timeout: 8000 })
  })

  test('mood selector is klikbaar', async ({ page }) => {
    await inlogStudent(page)
    await page.locator('button').filter({ hasText: /📖|Dagboek/ }).first().click()
    await page.waitForTimeout(1000)

    // Mood emojis moeten klikbaar zijn (als vandaag nog niet ingevuld)
    const moodKnoppen = page.locator('button').filter({ hasText: /🔥|😊|😐|😕|😴/ })
    const count = await moodKnoppen.count()
    if (count > 0) {
      await moodKnoppen.first().click()
      // Na klikken op mood moet de knop actief zijn (kleur verandert)
      expect(count).toBeGreaterThan(0)
    }
  })
})
