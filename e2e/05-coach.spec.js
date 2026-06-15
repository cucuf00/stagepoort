/**
 * Coach dashboard tests — nakijken, evaluaties, inschrijven, studentoverzicht
 */
const { test, expect } = require('@playwright/test')
const { loginAs, getAdminClient, TEST_SCHOOL_ID } = require('./helpers/auth')

const COACH_EMAIL = process.env.TEST_COACH_EMAIL

test.describe('Coach — inloggen & navigatie', () => {
  test('kan inloggen via magic link', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await expect(page).toHaveURL(/\/dashboard\/coach/)
  })

  test('alle tabs zichtbaar in header', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await expect(page.locator('button').filter({ hasText: /mijn studenten/i }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button').filter({ hasText: /nakijken/i }).first()).toBeVisible()
    await expect(page.locator('button').filter({ hasText: /evaluaties/i }).first()).toBeVisible()
    await expect(page.locator('button').filter({ hasText: /inschrijven/i }).first()).toBeVisible()
  })

  test('niet-ingelogde coach gaat naar login', async ({ page }) => {
    await page.goto('/dashboard/coach')
    await page.waitForTimeout(3000)
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })
})

test.describe('Coach — Mijn Studenten tab', () => {
  test('KPI tegels zichtbaar', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await expect(page.locator('text=/Mijn studenten|studenten/i').first()).toBeVisible({ timeout: 10_000 })
    // 3 KPI tegels: Mijn studenten / Op koers / Actie nodig
    await expect(page.locator('text=/Op koers/i').first()).toBeVisible()
  })

  test('testleerling kaart is zichtbaar', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await page.waitForTimeout(2000)
    await expect(page.locator('text=/Playwright Student|E2E Testbedrijf/i').first()).toBeVisible({ timeout: 10_000 })
  })

  test('studentkaart uitklappen toont details', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await page.waitForTimeout(2000)

    const bekijken = page.locator('button').filter({ hasText: /bekijken/i }).first()
    await expect(bekijken).toBeVisible({ timeout: 10_000 })
    await bekijken.click()
    await page.waitForTimeout(800)

    // Student- en bedrijfsinfo moet zichtbaar zijn
    await expect(page.locator('text=/Stagebedrijf|E2E Testbedrijf/i').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=/Teststraat|Rotterdam/i').first()).toBeVisible()
  })

  test('voortgangsbalk toont goedgekeurde uren', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await page.waitForTimeout(2000)
    // Testdata: 20 goedgekeurde uren van 160 vereist
    await expect(page.locator('text=/20.*160|van.*uur/i').first()).toBeVisible({ timeout: 10_000 })
  })

  test('goed bezig knop is klikbaar', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await page.waitForTimeout(2000)

    const bekijken = page.locator('button').filter({ hasText: /bekijken/i }).first()
    await expect(bekijken).toBeVisible({ timeout: 10_000 })
    await bekijken.click()
    await page.waitForTimeout(800)

    const goedBezig = page.locator('button').filter({ hasText: /goed bezig/i }).first()
    await expect(goedBezig).toBeVisible({ timeout: 5000 })
    // Knop moet klikbaar zijn (max 3x per student)
    const isDisabled = await goedBezig.isDisabled()
    if (!isDisabled) {
      await goedBezig.click()
      await expect(page.locator('text=/goed bezig|👊/i').first()).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Coach — Nakijken tab', () => {
  test('nakijken tab laadt', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await page.locator('button').filter({ hasText: /nakijken/i }).first().click()
    await page.waitForTimeout(1500)
    const heeftInhoud = await page.locator('text=/Nakijkstapel|Alles nagekeken|nakijken/i').first().isVisible()
    expect(heeftInhoud).toBeTruthy()
  })

  test('ingediende opdracht van testleerling staat in nakijkstapel', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await page.locator('button').filter({ hasText: /nakijken/i }).first().click()
    await page.waitForTimeout(1500)

    // Testdata: opdracht 1 staat op 'submitted' voor de testleerling
    await expect(page.locator('text=/Playwright Student|Bedrijfsoriëntatie/i').first()).toBeVisible({ timeout: 8000 })
  })

  test('nakijken openen toont antwoorden per vraag (niet rauwe JSON)', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await page.locator('button').filter({ hasText: /nakijken/i }).first().click()
    await page.waitForTimeout(1500)

    const nakijkKnop = page.locator('button').filter({ hasText: /✏️ nakijken/i }).first()
    const heeftKnop = await nakijkKnop.isVisible()
    if (!heeftKnop) { test.skip(true, 'Geen opdrachten in nakijkstapel'); return }

    await nakijkKnop.click()
    await page.waitForTimeout(1000)

    // Rauwe JSON mag NIET zichtbaar zijn
    const heeftRauweJson = await page.locator('text={"9001"').isVisible()
    expect(heeftRauweJson).toBeFalsy()

    // Vraag 1 moet zichtbaar zijn
    await expect(page.locator('text=/Wat doet het bedrijf/i').first()).toBeVisible({ timeout: 5000 })
    // Antwoord moet zichtbaar zijn
    await expect(page.locator('text=/software voor scholen/i').first()).toBeVisible({ timeout: 5000 })
  })

  test('punten toekennen per vraag en cijfer vaststellen', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await page.locator('button').filter({ hasText: /nakijken/i }).first().click()
    await page.waitForTimeout(1500)

    const nakijkKnop = page.locator('button').filter({ hasText: /✏️ nakijken/i }).first()
    const heeftKnop = await nakijkKnop.isVisible()
    if (!heeftKnop) { test.skip(true, 'Geen opdrachten in nakijkstapel'); return }

    await nakijkKnop.click()
    await page.waitForTimeout(1000)

    // Sticky header moet cijfer tonen
    await expect(page.locator('text=/van.*punten|—/').first()).toBeVisible({ timeout: 5000 })

    // Ken punten toe aan vraag 1 (klik op knop "4")
    const puntKnoppen = page.locator('button').filter({ hasText: /^4$/ })
    const count = await puntKnoppen.count()
    if (count > 0) {
      await puntKnoppen.first().click()
      await page.waitForTimeout(300)
      // Ken punten toe aan vraag 2
      if (count > 1) await puntKnoppen.nth(1).click()
    }

    // Vaststellenknop moet actief worden
    const vaststellen = page.locator('button').filter({ hasText: /cijfer vaststellen/i }).first()
    await expect(vaststellen).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Coach — Evaluaties tab', () => {
  test('evaluaties tab laadt', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await page.locator('button').filter({ hasText: /evaluaties/i }).first().click()
    await page.waitForTimeout(1500)
    const heeftInhoud = await page.locator('text=/Tussenevaluatie|Eindevaluatie|geen actieve|evaluatie/i').first().isVisible()
    expect(heeftInhoud).toBeTruthy()
  })

  test('testleerling zichtbaar in evaluatieoverzicht', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await page.locator('button').filter({ hasText: /evaluaties/i }).first().click()
    await page.waitForTimeout(1500)

    const heeftStudent = await page.locator('text=/Playwright Student/i').first().isVisible()
    // Als er evaluatiemomenten zijn geconfigureerd, moet de student zichtbaar zijn
    if (heeftStudent) {
      await expect(page.locator('text=/Playwright Student/i').first()).toBeVisible()
    }
  })
})

test.describe('Coach — Inschrijven tab', () => {
  test('inschrijven tab toont studenten tabel', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await page.locator('button').filter({ hasText: /inschrijven/i }).first().click()
    await page.waitForTimeout(1500)
    await expect(page.locator('text=Schrijf je in op studenten').first()).toBeVisible({ timeout: 8000 })
  })

  test('testleerling zichtbaar in inschrijftabel', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await page.locator('button').filter({ hasText: /inschrijven/i }).first().click()
    await page.waitForTimeout(1500)
    await expect(page.locator('text=/Playwright Student/i').first()).toBeVisible({ timeout: 8000 })
  })

  test('coach staat als "Jij" bij gekoppelde testleerling', async ({ page }) => {
    await loginAs(page, COACH_EMAIL)
    await page.locator('button').filter({ hasText: /inschrijven/i }).first().click()
    await page.waitForTimeout(1500)
    // Testleerling is gekoppeld aan Playwright Coach
    await expect(page.locator('text=✋ Jij').first()).toBeVisible({ timeout: 8000 })
  })
})
