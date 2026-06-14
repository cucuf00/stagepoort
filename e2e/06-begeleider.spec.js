const { test, expect } = require('@playwright/test')
const { getAdminClient, TEST_SCHOOL_ID } = require('./helpers/auth')

test.describe('Stagebegeleider dashboard', () => {
  let placementId

  test.beforeAll(async () => {
    // Haal de actieve testplacement direct op uit de database
    // (process.env.TEST_PLACEMENT_ID is niet betrouwbaar vanuit globalSetup)
    const sb = getAdminClient()
    const { data } = await sb
      .from('placements')
      .select('id')
      .eq('school_id', TEST_SCHOOL_ID)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (!data) throw new Error('Geen actieve testplacement gevonden in testschool')
    placementId = data.id
    console.log(`  📋 Begeleider test placement ID: ${placementId}`)
  })

  test('dashboard laadt met geldige placement_id', async ({ page }) => {
    await page.goto(`/begeleider/${placementId}`)
    // Wacht op client-side render
    await page.waitForTimeout(4000)
    // Header met Stagepoort logo moet zichtbaar zijn na succesvolle load
    await expect(page.locator('text=Stagepoort').first()).toBeVisible({ timeout: 10_000 })
    // Mag geen foutscherm tonen
    const heeftFout = await page.locator('text=/niet geldig|niet meer actief|geen toegang/i').first().isVisible()
    expect(heeftFout).toBeFalsy()
  })

  test('uren tab is standaard actief', async ({ page }) => {
    await page.goto(`/begeleider/${placementId}`)
    await page.waitForTimeout(4000)
    // Uren tab label zichtbaar in header nav
    await expect(page.locator('button').filter({ hasText: '⏱' }).first()).toBeVisible({ timeout: 10_000 })
    // Lege staat of uren overzicht
    const heeftContent = await page.locator('text=/nog geen uren|Te beoordelen|Eerder verwerkt|goedgekeurd/i').first().isVisible()
    expect(heeftContent).toBeTruthy()
  })

  test('evaluaties tab toont evaluatiemomenten', async ({ page }) => {
    await page.goto(`/begeleider/${placementId}`)
    await page.waitForTimeout(4000)
    // Klik op evaluaties tab
    await page.locator('button').filter({ hasText: '📋' }).first().click()
    await page.waitForTimeout(1000)
    // Tussenevaluatie of Eindevaluatie moet zichtbaar zijn
    const heeftMomenten = await page.locator('text=/Tussenevaluatie|Eindevaluatie/i').first().isVisible()
    expect(heeftMomenten).toBeTruthy()
  })

  test('info tab toont stagegegevens', async ({ page }) => {
    await page.goto(`/begeleider/${placementId}`)
    await page.waitForTimeout(4000)
    // Klik op stageinfo tab
    await page.locator('button').filter({ hasText: '📄' }).first().click()
    await page.waitForTimeout(1000)
    // Leerling of bedrijf info moet zichtbaar zijn
    const heeftInfo = await page.locator('text=/Leerling|Stagebedrijf|E2E Testbedrijf/i').first().isVisible()
    expect(heeftInfo).toBeTruthy()
  })

  test('ongeldige placement_id toont foutscherm', async ({ page }) => {
    await page.goto('/begeleider/00000000-0000-0000-0000-000000000000')
    await page.waitForTimeout(4000)
    const heeftFout = await page.locator('text=/niet geldig|niet meer actief|geen toegang|Geen toegang|Link niet/i').first().isVisible()
    expect(heeftFout).toBeTruthy()
  })

})
