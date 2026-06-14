const { test, expect } = require('@playwright/test')

// Stagebegeleider heeft geen login — toegang via placement_id token in URL
const BASE_URL = process.env.BASE_URL || 'https://stagepoort.vercel.app'

test.describe('Stagebegeleider dashboard', () => {

  test('dashboard laadt met geldige placement_id', async ({ page }) => {
    const placementId = process.env.TEST_PLACEMENT_ID
    if (!placementId) { test.skip(true, 'TEST_PLACEMENT_ID niet beschikbaar'); return }

    await page.goto(`/begeleider/${placementId}`)
    await page.waitForTimeout(3000)

    // Header met Stagepoort logo moet zichtbaar zijn
    await expect(page.locator('text=Stagepoort').first()).toBeVisible({ timeout: 10_000 })
    // Mag geen foutscherm tonen
    const heeftFout = await page.locator('text=/niet geldig|niet meer actief|geen toegang/i').first().isVisible()
    expect(heeftFout).toBeFalsy()
  })

  test('uren tab is standaard zichtbaar', async ({ page }) => {
    const placementId = process.env.TEST_PLACEMENT_ID
    if (!placementId) { test.skip(true, 'TEST_PLACEMENT_ID niet beschikbaar'); return }

    await page.goto(`/begeleider/${placementId}`)
    await page.waitForTimeout(3000)

    // Uren tab is standaard actief
    await expect(page.locator('text=/⏱|Uren/').first()).toBeVisible({ timeout: 10_000 })
    // Lege staat of uren overzicht
    const heeftUrContent = await page.locator('text=/nog geen uren|Te beoordelen|Eerder verwerkt|goedgekeurd/i').first().isVisible()
    expect(heeftUrContent).toBeTruthy()
  })

  test('evaluaties tab toont evaluatiemomenten', async ({ page }) => {
    const placementId = process.env.TEST_PLACEMENT_ID
    if (!placementId) { test.skip(true, 'TEST_PLACEMENT_ID niet beschikbaar'); return }

    await page.goto(`/begeleider/${placementId}`)
    await page.waitForTimeout(3000)

    // Klik op evaluaties tab
    await page.locator('button').filter({ hasText: /evaluaties/i }).first().click()
    await page.waitForTimeout(1000)

    // Tussenevaluatie of Eindevaluatie moet zichtbaar zijn
    const heeftMomenten = await page.locator('text=/Tussenevaluatie|Eindevaluatie|evaluatie/i').first().isVisible()
    expect(heeftMomenten).toBeTruthy()
  })

  test('info tab toont stagegegevens', async ({ page }) => {
    const placementId = process.env.TEST_PLACEMENT_ID
    if (!placementId) { test.skip(true, 'TEST_PLACEMENT_ID niet beschikbaar'); return }

    await page.goto(`/begeleider/${placementId}`)
    await page.waitForTimeout(3000)

    // Klik op info tab
    await page.locator('button').filter({ hasText: /stageinfo/i }).first().click()
    await page.waitForTimeout(1000)

    // Leerling of bedrijf info moet zichtbaar zijn
    const heeftInfo = await page.locator('text=/Leerling|Stagebedrijf|E2E Testbedrijf/i').first().isVisible()
    expect(heeftInfo).toBeTruthy()
  })

  test('ongeldige placement_id toont foutscherm', async ({ page }) => {
    await page.goto('/begeleider/00000000-0000-0000-0000-000000000000')
    await page.waitForTimeout(4000)
    const heeftFout = await page.locator('text=/niet geldig|niet meer actief|geen toegang|Link niet/i').first().isVisible()
    expect(heeftFout).toBeTruthy()
  })

})
