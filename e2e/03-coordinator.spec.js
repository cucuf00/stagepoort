/**
 * Coordinator tests — beoordelen, opdrachten, badges, koppelingen, beheer
 */
const { test, expect } = require('@playwright/test')
const { loginAs, getAdminClient, TEST_SCHOOL_ID } = require('./helpers/auth')

const COORD_EMAIL = process.env.TEST_COORDINATOR_EMAIL

test.describe('Coordinator — inloggen & navigatie', () => {
  test('kan inloggen via magic link', async ({ page }) => {
    await loginAs(page, COORD_EMAIL)
    await expect(page).toHaveURL(/\/dashboard\/coordinator/)
  })

  test('dashboard toont KPI tegels', async ({ page }) => {
    await loginAs(page, COORD_EMAIL)
    await expect(page.locator('text=Studenten').first()).toBeVisible({ timeout: 10_000 })
  })

  test('niet-ingelogde gebruiker gaat naar login', async ({ page }) => {
    await page.goto('/dashboard/coordinator')
    await page.waitForTimeout(3000)
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })
})

test.describe('Coordinator — beoordelen pagina (uren)', () => {
  test('beoordelen pagina laadt', async ({ page }) => {
    await loginAs(page, COORD_EMAIL)
    await page.goto('/dashboard/coordinator/beoordelen')
    await expect(page.locator('text=Beoordelen').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button').filter({ hasText: /uren keuren/i }).first()).toBeVisible()
  })

  test('uren keuren tab toont pending uren van testleerling', async ({ page }) => {
    await loginAs(page, COORD_EMAIL)
    await page.goto('/dashboard/coordinator/beoordelen')
    await page.waitForTimeout(2000)
    // Testdata bevat 2 pending uren — minstens 1 regel zichtbaar
    const heeftUren = await page.locator('text=/week 2|E2E test|maandag|dinsdag/i').first().isVisible()
    expect(heeftUren).toBeTruthy()
  })

  test('"Keur alles goed" vraagt bevestiging', async ({ page }) => {
    await loginAs(page, COORD_EMAIL)
    await page.goto('/dashboard/coordinator/beoordelen')
    await page.waitForTimeout(2000)

    const keurAlles = page.locator('button').filter({ hasText: /keur alles goed/i }).first()
    const heeftKnop = await keurAlles.isVisible()
    if (!heeftKnop) { test.skip(true, 'Geen pending uren — skip'); return }

    await keurAlles.click()
    // Bevestigingsstap moet verschijnen
    await expect(page.locator('text=/zeker weten/i').first()).toBeVisible({ timeout: 3000 })
    await expect(page.locator('button').filter({ hasText: /annuleren/i }).first()).toBeVisible()
  })

  test('individuele uur goedkeuren werkt', async ({ page }) => {
    await loginAs(page, COORD_EMAIL)
    await page.goto('/dashboard/coordinator/beoordelen')
    await page.waitForTimeout(2000)

    const goedkeurKnop = page.locator('button').filter({ hasText: /goedkeuren/i }).first()
    const heeftKnop = await goedkeurKnop.isVisible()
    if (!heeftKnop) { test.skip(true, 'Geen pending uren'); return }

    await goedkeurKnop.click()
    await expect(page.locator('text=/goedgekeurd/i').first()).toBeVisible({ timeout: 5000 })
  })

  test('uur afwijzen toont reden-invoer', async ({ page }) => {
    await loginAs(page, COORD_EMAIL)
    await page.goto('/dashboard/coordinator/beoordelen')
    await page.waitForTimeout(2000)

    const afwijsKnop = page.locator('button').filter({ hasText: /afwijzen/i }).first()
    const heeftKnop = await afwijsKnop.isVisible()
    if (!heeftKnop) { test.skip(true, 'Geen pending uren'); return }

    await afwijsKnop.click()
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 3000 })
    await expect(page.locator('text=/reden/i').first()).toBeVisible()
  })
})

test.describe('Coordinator — beoordelen pagina (opdrachten)', () => {
  test('opdrachten tab toont ingediende inlevering van testleerling', async ({ page }) => {
    await loginAs(page, COORD_EMAIL)
    await page.goto('/dashboard/coordinator/beoordelen')
    await page.waitForTimeout(2000)

    await page.locator('button').filter({ hasText: /opdrachten beoordelen/i }).first().click()
    await page.waitForTimeout(1000)

    // Testdata: student_assignment met status 'submitted' voor opdracht 1
    const heeftInlevering = await page.locator('text=/Playwright Student|Bedrijfsoriëntatie|Ter beoordeling/i').first().isVisible()
    expect(heeftInlevering).toBeTruthy()
  })

  test('inlevering uitklappen toont antwoorden per vraag (niet rauwe JSON)', async ({ page }) => {
    await loginAs(page, COORD_EMAIL)
    await page.goto('/dashboard/coordinator/beoordelen')
    await page.waitForTimeout(2000)

    await page.locator('button').filter({ hasText: /opdrachten beoordelen/i }).first().click()
    await page.waitForTimeout(1000)

    // Klik op de kaart om uit te klappen
    const kaart = page.locator('text=/Bedrijfsoriëntatie|Playwright Student/i').first()
    const heeftKaart = await kaart.isVisible()
    if (!heeftKaart) { test.skip(true, 'Geen ingediende opdrachten'); return }

    await kaart.click()
    await page.waitForTimeout(800)

    // Antwoorden moeten leesbaar zijn — NIET als {"9001":"..."} 
    const heeftRauweJson = await page.locator('text={"9001"').isVisible()
    expect(heeftRauweJson).toBeFalsy()

    // Vraag 1 tekst moet zichtbaar zijn
    await expect(page.locator('text=/Wat doet het bedrijf/i').first()).toBeVisible({ timeout: 3000 })
    // Antwoord tekst moet zichtbaar zijn
    await expect(page.locator('text=/software voor scholen/i').first()).toBeVisible({ timeout: 3000 })
  })

  test('cijfer invullen en opslaan werkt', async ({ page }) => {
    await loginAs(page, COORD_EMAIL)
    await page.goto('/dashboard/coordinator/beoordelen')
    await page.waitForTimeout(2000)

    await page.locator('button').filter({ hasText: /opdrachten beoordelen/i }).first().click()
    await page.waitForTimeout(1000)

    const kaart = page.locator('text=/Bedrijfsoriëntatie|Playwright Student/i').first()
    const heeftKaart = await kaart.isVisible()
    if (!heeftKaart) { test.skip(true, 'Geen ingediende opdrachten'); return }

    await kaart.click()
    await page.waitForTimeout(800)

    // Cijfer invullen
    await page.locator('input[type="number"][placeholder="7.5"]').fill('8')
    await expect(page.locator('text=Voldoende').first()).toBeVisible({ timeout: 2000 })

    // Feedback invullen
    await page.locator('textarea[placeholder*="toelichting"]').fill('Goed werk, duidelijke antwoorden.')

    // Opslaan
    await page.locator('button').filter({ hasText: /beoordeling opslaan/i }).click()
    await expect(page.locator('text=/beoordeeld|opgeslagen/i').first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Coordinator — opdrachten & badges', () => {
  test('opdrachten pagina laadt met periode-tabs', async ({ page }) => {
    await loginAs(page, COORD_EMAIL)
    await page.goto('/dashboard/coordinator/opdrachten')
    await expect(page.locator('text=/Playwright Testperiode|Opdrachten|Sjablonen/i').first()).toBeVisible({ timeout: 10_000 })
  })

  test('badges sectie toont informatiebalk', async ({ page }) => {
    await loginAs(page, COORD_EMAIL)
    await page.goto('/dashboard/coordinator/opdrachten')
    await page.waitForTimeout(2000)

    // Scroll naar badges sectie
    await page.locator('text=🏆 Badges').scrollIntoViewIfNeeded()
    await expect(page.locator('text=/Hoe werkt de drempel/i').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=/goedgekeurde uren/i').first()).toBeVisible()
    await expect(page.locator('text=/dagen op rij/i').first()).toBeVisible()
    await expect(page.locator('text=/ingeleverde opdrachten/i').first()).toBeVisible()
  })

  test('testbadge zichtbaar in lijst', async ({ page }) => {
    await loginAs(page, COORD_EMAIL)
    await page.goto('/dashboard/coordinator/opdrachten')
    await page.waitForTimeout(2000)
    await expect(page.locator('text=E2E Testbadge').first()).toBeVisible({ timeout: 5000 })
  })

  test('sjablonen bibliotheek zichtbaar', async ({ page }) => {
    await loginAs(page, COORD_EMAIL)
    await page.goto('/dashboard/coordinator/opdrachten')
    await page.waitForTimeout(2000)
    await expect(page.locator('text=/Sjablonen|bedrijf leren kennen/i').first()).toBeVisible({ timeout: 8000 })
  })
})

test.describe('Coordinator — koppelingen & beheer', () => {
  test('koppelingen pagina laadt', async ({ page }) => {
    await loginAs(page, COORD_EMAIL)
    await page.goto('/dashboard/coordinator/koppelingen')
    await expect(page.locator('text=Koppelingen').first()).toBeVisible({ timeout: 10_000 })
  })

  test('testleerling zichtbaar in koppelingenlijst', async ({ page }) => {
    await loginAs(page, COORD_EMAIL)
    await page.goto('/dashboard/coordinator/koppelingen')
    await page.waitForTimeout(2000)
    await expect(page.locator('text=/Playwright Student|Testleerling/i').first()).toBeVisible({ timeout: 8000 })
  })

  test('beheer pagina laadt met stageperiodes', async ({ page }) => {
    await loginAs(page, COORD_EMAIL)
    await page.goto('/dashboard/coordinator/beheer')
    await expect(page.locator('text=Stageperiodes').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=Playwright Testperiode').first()).toBeVisible({ timeout: 5000 })
  })
})
